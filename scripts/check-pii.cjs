#!/usr/bin/env node
/* node scripts/check-pii.cjs [--include <path|glob>]... [--exclude <glob>]... [options]

   Guards the trip production layer against personal data creeping back in. The record was
   built from photographs that carried a school director's name, a coordinator's mailbox and
   several suppliers' staff names and direct mobile numbers; those were redacted to roles on
   the way in. This re-checks that, on every file in scope, on demand.

   The rule it enforces is written in pipeline/trip/README.md:
     Keep    business names and their published group-sales channels.
     Redact  every individual and every direct number, to a role.

   Scope is deliberately narrow (default pipeline/trip/**) because the repository legitimately
   holds contact data elsewhere that other rules govern. See docs/ops/PII-GUARD.md.

   Exit: 0 clean, 1 findings, 2 usage error. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repoRoot = path.resolve(__dirname, '..');

/* ---------------------------------------------------------------- scope defaults */

const DEFAULT_INCLUDES = ['pipeline/trip/**'];

/* Never worth reading. */
const NOISE_EXCLUDES = [
  '**/.git/**', '**/node_modules/**', '**/.venv/**', '**/__pycache__/**', '**/.DS_Store'
];

/* In the repository and full of contact data on purpose, governed by other rules:
   data/final/prospects.csv holds one researched, published director email by design, and
   docs/, demo/carnegie-hall/*.json and pipeline/cases/*.json hold published school-program
   contacts that pipeline/validate.cjs gates with its own contacts.no_guess check. Excluded so
   that widening the scope later does not bury a real trip finding under known-good hits.
   Drop these with --no-default-excludes. */
const GOVERNED_ELSEWHERE_EXCLUDES = [
  'data/**', 'docs/**', 'demo/**', 'pipeline/cases/**', 'pipeline/out/**',
  'scrapers/**', 'scripts/**', 'tests/**', 'logistics/**', '.env*'
];

const DEFAULT_ALLOWLIST = 'pipeline/trip/.pii-allowlist';

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tif', '.tiff',
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.zip', '.gz', '.tgz',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp3', '.mp4', '.mov', '.wav', '.bin'
]);

/* ---------------------------------------------------------------- the four rules */

/* An email address. The local part must start and end alphanumeric and every domain label
   must be well formed, so prose like a leading `=+@-` in a CSV cell is not an address. */
const EMAIL_RE = /[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}/g;

/* A US phone number: (706) 555-0142, 706-555-0142, 706.555.0142, 7065550142, 423 555 0188,
   an optional +1, and an optional extension. The examples use the 555-01xx range reserved for
   fiction, because this file must not carry a real number either. Area and exchange codes are
   constrained to the
   North American plan ([2-9] first), which is what keeps ISO dates, quantities and money out
   of the results: 2027-04-08 cannot produce three consecutive digits starting 2-9 followed by
   a separator and three more. Boundaries are checked separately, below.
   Groups: 1 area in parentheses, 2 separator, 3 bare area, 4 separator, 5 exchange,
   6 separator, 7 line. */
const PHONE_SOURCE = '(?:\\+1[\\s.-]?)?(?:\\(([2-9]\\d{2})\\)([\\s.-]?)|([2-9]\\d{2})([\\s.-]?))([2-9]\\d{2})([\\s.-]?)(\\d{4})(?:\\s*(?:x|ext\\.?|extension)\\s*\\d{1,6})?';

/* Money words. A run of three space-separated numbers is shaped exactly like a phone number
   (495 550 1099), and a trip record is full of prices. Where a money word sits next to such a
   run, the space-separated form alone is not treated as a number. Every punctuated or compact
   form still is, as is a bare "423 555 0188" that says nothing about money. This is the
   guard's one deliberate recall/precision trade; docs/ops/PII-GUARD.md states it.

   Only unambiguous money words qualify, and only near the number. Itinerary nouns such as
   room, ticket, rate and seat are deliberately absent: a supplier line naming rooms or tickets
   is exactly the line most likely to carry a real number, and suppressing there would hide the
   leak this guard exists to catch. */
const MONEY_CUE_RE = /\$|\b(?:price|prices|priced|pricing|cost|costs|costing|amount|amounts|subtotal|total|totals|deposit|balance|per\s+person|per\s+group)\b/i;

/* How far from the number a money cue still counts. */
const MONEY_CUE_WINDOW = 40;

/* Words that say "this is a number to call". They override a money cue, because a line like
   "Deposit 500 paid; the direct line is 706 555 0144" carries both, and the number is real. */
const PHONE_CUE_RE = /\b(?:call|calls|called|calling|phone|telephone|tel|direct|line|mobile|cell|fax|dial|text|reach|reached|contact|voicemail|ext|extension|ask\s+for)\b/i;

/* A street address, only ever applied to strings that already sit on a person. A venue's
   address is legitimate and is not matched by this rule because this rule never looks there. */
const STREET_RE = /\b\d{1,6}[A-Za-z]?\s+(?:[A-Za-z0-9.'#-]+\s+){0,4}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Terrace|Ter|Place|Pl|Circle|Cir|Parkway|Pkwy|Highway|Hwy|Route|Rte)\b\.?(?:\s*(?:Apt|Apartment|Unit|Suite|Ste|#)\s*[A-Za-z0-9-]+)?/gi;

/* Array/object keys whose members describe a person. Inside one of these, a bare `name` is a
   personal name; outside, `name` is a business or venue name and is explicitly kept. */
const PERSON_CONTAINERS = new Set([
  'contacts', 'contact', 'staffing', 'staff', 'people', 'persons', 'person',
  'attendees', 'roster', 'passengers', 'travelers', 'travellers',
  'chaperones', 'emergency_contacts', 'emergency_contact'
]);

/* Keys that name a person or reach one directly, wherever they appear. Deliberately excludes
   bare `director`, `coordinator` and `manager`: in this record those hold role strings such as
   "Troen coordinator", and flagging them would make the guard cry wolf. */
const PERSONAL_NAME_KEYS = new Set([
  'first_name', 'firstname', 'last_name', 'lastname', 'middle_name', 'full_name', 'fullname',
  'contact_name', 'director_name', 'person_name', 'attendee_name', 'chaperone_name',
  'staff_name', 'rep_name', 'salesperson', 'given_name', 'family_name', 'surname'
]);

/* Keys that are a direct line or a personal mailbox wherever they appear. */
const DIRECT_CONTACT_KEYS = new Set([
  'mobile', 'mobile_phone', 'cell', 'cell_phone', 'direct_line', 'direct_number',
  'direct_dial', 'direct_phone', 'home_phone', 'personal_phone', 'personal_email',
  'personal_mailbox', 'private_email'
]);

/* Keys that are a person's address wherever they appear. */
const PERSONAL_ADDRESS_KEYS = new Set([
  'home_address', 'home_street', 'residence', 'residential_address', 'mailing_address'
]);

/* Address-ish keys that are fine on a venue but not on a person. */
const ADDRESS_KEYS = new Set(['address', 'street', 'street_address', 'address_line_1', 'address1']);

const RULES = {
  EMAIL: 'email',
  PHONE: 'phone',
  CONTACT_NAME: 'contact-name',
  PERSON_ADDRESS: 'person-address'
};

/* ---------------------------------------------------------------- glob + scope */

function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        /* `a/**` matches a/b and a/b/c; `**\/b` matches b at any depth. */
        if (glob[i + 2] === '/') { out += '(?:.*/)?'; i += 2; } else { out += '.*'; i += 1; }
      } else {
        out += '[^/]*';
      }
    } else if (ch === '?') {
      out += '[^/]';
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
}

const hasMagic = value => /[*?]/.test(value);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

/* The path a finding is reported under: repo-relative when inside the repository, absolute
   when a caller pointed the guard somewhere else. */
function displayPath(absolute) {
  const relative = path.relative(repoRoot, absolute);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
    ? toPosix(relative)
    : toPosix(absolute);
}

/* Follows symlinks, because this repository uses them (CLAUDE.md -> AGENTS.md) and a symlinked
   document in scope must still be scanned. Real paths already seen are skipped, so a link that
   points back up its own tree cannot loop. */
function walkDir(dir, out, seen = new Set()) {
  let real;
  try {
    real = fs.realpathSync(dir);
  } catch {
    return out;
  }
  if (seen.has(real)) return out;
  seen.add(real);

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    let isDir = entry.isDirectory();
    let isFile = entry.isFile();
    if (entry.isSymbolicLink()) {
      let stat = null;
      try { stat = fs.statSync(full); } catch { continue; }
      isDir = stat.isDirectory();
      isFile = stat.isFile();
    }
    if (isDir) walkDir(full, out, seen);
    else if (isFile) out.push(full);
  }
  return out;
}

/* The fixed directory prefix of a glob, so a `pipeline/trip/**` scan does not walk the repo. */
function globBase(glob) {
  const segments = glob.split('/');
  const fixed = [];
  for (const segment of segments) {
    if (hasMagic(segment)) break;
    fixed.push(segment);
  }
  return fixed.join('/');
}

/* 'text' | 'binary' | 'unreadable'. Unreadable is kept distinct from binary so a permissions
   error is reported rather than quietly counted as "nothing to scan here". */
function classifyFile(file) {
  if (BINARY_EXTENSIONS.has(path.extname(file).toLowerCase())) return 'binary';
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buffer = Buffer.alloc(8000);
    const read = fs.readSync(fd, buffer, 0, 8000, 0);
    return buffer.subarray(0, read).includes(0) ? 'binary' : 'text';
  } catch {
    return 'unreadable';
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch { /* already gone */ }
  }
}

/* Everything one include expands to, before exclusion. null means its base does not exist. */
function expandInclude(include) {
  const absoluteInclude = path.isAbsolute(include) ? toPosix(include) : null;
  const pattern = absoluteInclude || toPosix(include);

  if (!hasMagic(pattern)) {
    const abs = absoluteInclude ? include : path.resolve(repoRoot, include);
    let stat = null;
    try { stat = fs.statSync(abs); } catch { return null; }
    return stat.isDirectory() ? walkDir(abs, []) : [abs];
  }

  const base = globBase(pattern);
  const baseAbs = absoluteInclude ? base || '/' : path.resolve(repoRoot, base || '.');
  const regex = globToRegExp(pattern);
  let stat = null;
  try { stat = fs.statSync(baseAbs); } catch { return null; }
  const candidates = stat.isDirectory() ? walkDir(baseAbs, []) : [baseAbs];
  return candidates.filter(file => regex.test(
    absoluteInclude ? toPosix(file) : toPosix(path.relative(repoRoot, file))
  ));
}

function resolveScope(options) {
  const excluders = options.excludes.map(globToRegExp);
  /* The allowlist names the values it permits, so scanning it would report every one of them
     back. It is always out of scope, wherever a caller puts it. */
  const allowlistAbs = options.allowlist ? path.resolve(repoRoot, options.allowlist) : null;

  const keep = file => {
    if (allowlistAbs && path.resolve(file) === allowlistAbs) return false;
    const relative = toPosix(path.relative(repoRoot, file));
    const absolute = toPosix(file);
    const subjects = relative.startsWith('..') ? [absolute] : [relative, absolute];
    return !excluders.some(regex => subjects.some(subject => regex.test(subject)));
  };

  const found = new Set();
  const missing = [];
  for (const include of options.includes) {
    const expanded = expandInclude(include);
    /* An include that matched nothing, or whose every match was excluded, is reported rather
       than silently producing a clean result. */
    const kept = (expanded || []).filter(keep);
    if (!kept.length) { missing.push(include); continue; }
    kept.forEach(file => found.add(file));
  }

  /* One classification pass: each file is opened once, not once per filter. */
  const files = [];
  const skippedBinary = [];
  const unreadable = [];
  for (const file of [...found].sort()) {
    const kind = classifyFile(file);
    if (kind === 'text') files.push(file);
    else if (kind === 'binary') skippedBinary.push(file);
    else unreadable.push(file);
  }

  return { files, skippedBinary, unreadable, missing };
}

/* ---------------------------------------------------------------- allowlist */

/* One entry per line; `#` starts a comment. Forms:
     <text>                      allow that exact matched text anywhere in scope
     <path-glob>::<text>         allow it only in files matching the glob
     <path-glob>::*              skip the file entirely
     sha256:<hex>                allow by digest, so the allowlist never records the value
     <path-glob>::sha256:<hex>   the same, scoped to a path
   A published group-sales mailbox is the case this exists for. A personal address is never an
   allowlist entry; redaction is the remedy for that. */
function parseAllowlist(text) {
  const entries = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^﻿/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('::');
    const pathGlob = separator === -1 ? null : line.slice(0, separator).trim();
    const value = separator === -1 ? line : line.slice(separator + 2).trim();
    if (!value) continue;
    entries.push({
      pathRe: pathGlob ? globToRegExp(pathGlob) : null,
      whole: value === '*',
      digest: value.toLowerCase().startsWith('sha256:') ? value.slice(7).trim().toLowerCase() : null,
      text: value.toLowerCase()
    });
  }
  return entries;
}

/* The default allowlist is optional; one named explicitly must exist, because silently running
   with no entries would report every allowed channel and look like a real regression. */
function loadAllowlist(file, { required = false } = {}) {
  if (!file) return [];
  const abs = path.isAbsolute(file) ? file : path.resolve(repoRoot, file);
  if (!fs.existsSync(abs)) {
    if (required) throw new Error(`Allowlist file not found: ${file}`);
    return [];
  }
  return parseAllowlist(fs.readFileSync(abs, 'utf8'));
}

/* Hashes the lowercased value so a digest entry and a plaintext entry agree on case. */
const digestOf = value => crypto.createHash('sha256')
  .update(String(value).toLowerCase(), 'utf8').digest('hex');

function isAllowed(entries, file, matchText) {
  if (!entries.length) return false;
  const relative = toPosix(path.relative(repoRoot, file));
  const subjects = relative.startsWith('..') ? [toPosix(file)] : [relative, toPosix(file)];
  const lower = String(matchText).toLowerCase();
  let hash = null;
  return entries.some(entry => {
    if (entry.pathRe && !subjects.some(subject => entry.pathRe.test(subject))) return false;
    if (entry.whole) return true;
    if (entry.digest) {
      if (hash === null) hash = digestOf(matchText);
      return hash === entry.digest;
    }
    return entry.text === lower;
  });
}

/* ---------------------------------------------------------------- reporting helpers */

/* Never print the thing the guard protects. Keep two characters at each end so a human can
   find the line, mask the rest. Short matches are masked completely. */
function maskMatch(value) {
  const characters = Array.from(String(value).replace(/\s+/g, ' ').trim());
  if (characters.length <= 6) return '*'.repeat(characters.length);
  return `${characters.slice(0, 2).join('')}${'*'.repeat(characters.length - 4)}${characters.slice(-2).join('')}`;
}

function lineColumnAt(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const column = index - (before.lastIndexOf('\n') + 1) + 1;
  return { line, column };
}

/* Best effort: point at the nth textual occurrence of "key" in the raw JSON. The walk visits
   keys in document order for a normally formatted file, so the ordinals line up. If it cannot
   be located the finding is still reported, at line 1. */
function locateKey(raw, key, ordinal) {
  const needle = new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`, 'g');
  let seen = 0;
  let match;
  while ((match = needle.exec(raw)) !== null) {
    if (seen === ordinal) return lineColumnAt(raw, match.index);
    seen += 1;
  }
  return { line: 1, column: 1 };
}

const formatJsonPath = segments => segments
  .map(segment => (typeof segment === 'number' ? `[${segment}]` : `.${segment}`))
  .join('')
  .replace(/^\./, '') || '(root)';

/* ---------------------------------------------------------------- the text scan */

function scanText(text, file, allowlist) {
  const findings = [];
  const lines = text.split('\n');
  const phoneRe = new RegExp(PHONE_SOURCE, 'gi');

  lines.forEach((line, index) => {
    EMAIL_RE.lastIndex = 0;
    phoneRe.lastIndex = 0;
    let match;
    while ((match = EMAIL_RE.exec(line)) !== null) {
      if (isAllowed(allowlist, file, match[0])) continue;
      findings.push({
        file, line: index + 1, column: match.index + 1, rule: RULES.EMAIL,
        match: match[0], message: 'An email address. Redact to a role, or record the business channel by name.'
      });
    }

    while ((match = phoneRe.exec(line)) !== null) {
      const before = line[match.index - 1];
      const after = line[match.index + match[0].length];
      /* Reject a run that is really part of a longer number or identifier. */
      if (before !== undefined && /[0-9A-Za-z_]/.test(before)) continue;
      if (after !== undefined && /[0-9]/.test(after)) continue;
      if (/^\d{10}$/.test(match[0]) && after !== undefined && /[A-Za-z_]/.test(after)) continue;
      /* A space-separated run sitting next to a money word is a price list, not a number. */
      const parenthesised = match[1] !== undefined;
      const spaced = [match[2], match[4], match[6]].some(sep => sep && /\s/.test(sep));
      if (spaced && !parenthesised && !match[0].startsWith('+')) {
        const window = line.slice(
          Math.max(0, match.index - MONEY_CUE_WINDOW),
          match.index + match[0].length + MONEY_CUE_WINDOW
        );
        if (MONEY_CUE_RE.test(window) && !PHONE_CUE_RE.test(line)) continue;
      }
      if (isAllowed(allowlist, file, match[0])) continue;
      findings.push({
        file, line: index + 1, column: match.index + 1, rule: RULES.PHONE,
        match: match[0], message: 'A direct number. Record the published group-sales channel instead.'
      });
    }
  });

  return findings;
}

/* ---------------------------------------------------------------- the structural scan */

/* Walks the parsed JSON rather than the text, so `suppliers[].name` (a business, kept) and
   `suppliers[].contacts[].name` (a person, redacted) are told apart by where they sit. */
function scanJson(value, file, raw, allowlist) {
  const findings = [];
  /* Every visit of a key is counted, not only the ones that produce a finding, so the nth
     visit lines up with the nth textual occurrence. Counting only findings would point at the
     first `"name"` in the file, which is the supplier's business name. */
  const visits = new Map();

  const record = (key, ordinal, segments, rule, matchText, message) => {
    if (isAllowed(allowlist, file, matchText)) return;
    const { line, column } = locateKey(raw, key, ordinal);
    findings.push({
      file, line, column, rule, match: matchText, jsonPath: formatJsonPath(segments), message
    });
  };

  const isEmptyValue = candidate => candidate === null || candidate === undefined || candidate === '';

  const walk = (node, segments, inPerson) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, segments.concat(index), inPerson));
      return;
    }
    if (!node || typeof node !== 'object') return;

    for (const [key, child] of Object.entries(node)) {
      const lower = key.toLowerCase();
      const here = segments.concat(key);
      const personHere = inPerson || PERSON_CONTAINERS.has(lower);
      const ordinal = visits.get(key) || 0;
      visits.set(key, ordinal + 1);

      /* A field named for a person can hold one value or a list of them; "names": [...] is as
         much a leak as "name": "...". Each scalar element is checked under the parent's key. */
      const scalars = Array.isArray(child)
        ? child.map((item, index) => [item, here.concat(index)]).filter(([item]) => typeof item !== 'object')
        : [[child, here]];

      for (const [value, valuePath] of scalars) {
        if (isEmptyValue(value) || typeof value === 'object') continue;
        if (PERSONAL_NAME_KEYS.has(lower) || (inPerson && (lower === 'name' || lower === 'names'))) {
          record(key, ordinal, valuePath, RULES.CONTACT_NAME, String(value),
            `A personal name at ${formatJsonPath(valuePath)}. Redact to a role, e.g. "Group sales".`);
        } else if (DIRECT_CONTACT_KEYS.has(lower)) {
          record(key, ordinal, valuePath, RULES.CONTACT_NAME, String(value),
            `A direct line or personal mailbox at ${formatJsonPath(valuePath)}. Record the published channel instead.`);
        } else if (PERSONAL_ADDRESS_KEYS.has(lower) || (inPerson && ADDRESS_KEYS.has(lower))) {
          record(key, ordinal, valuePath, RULES.PERSON_ADDRESS, String(value),
            `A street address on a person at ${formatJsonPath(valuePath)}. A venue address belongs on the supplier.`);
        } else if (inPerson && typeof value === 'string') {
          /* A person's address hiding in a free-text field on a contact. */
          STREET_RE.lastIndex = 0;
          const street = STREET_RE.exec(value);
          if (street) {
            record(key, ordinal, valuePath, RULES.PERSON_ADDRESS, street[0],
              `A street address in person-context text at ${formatJsonPath(valuePath)}.`);
          }
        }
      }

      walk(child, here, personHere);
    }
  };

  walk(value, [], false);
  return findings;
}

/* ---------------------------------------------------------------- driver */

function scanFile(file, allowlist) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    return { findings: [], warnings: [`${displayPath(file)}: could not be read (${error.code || error.message}).`] };
  }

  const findings = scanText(raw, file, allowlist);
  const warnings = [];

  if (path.extname(file).toLowerCase() === '.json' && raw.trim()) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      /* error.message quotes the offending text, which would print the very value this tool
         masks everywhere else. Report the position only, never the snippet. */
      const at = /position (\d+)/.exec(error.message);
      const where = at ? lineColumnAt(raw, Number(at[1])) : null;
      warnings.push(`${displayPath(file)}${where ? `:${where.line}:${where.column}` : ''}: not valid JSON, `
        + 'so the structural name and address checks were skipped.');
    }
    if (parsed !== undefined) findings.push(...scanJson(parsed, file, raw, allowlist));
  }

  return { findings, warnings };
}

function scan(options) {
  const allowlist = loadAllowlist(options.allowlist,
    { required: options.allowlist !== DEFAULT_ALLOWLIST });
  const scope = resolveScope(options);
  const findings = [];
  const warnings = [];
  for (const file of scope.files) {
    const result = scanFile(file, allowlist);
    findings.push(...result.findings);
    warnings.push(...result.warnings);
  }
  findings.sort((a, b) => (a.file === b.file
    ? (a.line - b.line) || (a.column - b.column)
    : (a.file < b.file ? -1 : 1)));

  /* A file that was never read is not a clean file. The trip data came from photographs, so a
     PDF or image of a contact sheet landing in scope must be visible, not silently skipped. */
  for (const file of scope.skippedBinary) {
    warnings.push(`${displayPath(file)}: not a text file, so it was not scanned. Check it by hand.`);
  }
  for (const file of scope.unreadable) {
    warnings.push(`${displayPath(file)}: could not be read, so it was not scanned.`);
  }

  return { findings, warnings, scope, allowlistEntries: allowlist.length };
}

/* ---------------------------------------------------------------- cli */

const USAGE = `Usage: node scripts/check-pii.cjs [options]

Scans repository text files for personal data that must stay redacted to a role.

  --include <path|glob>   Scan this instead of the default scope. Repeatable.
  --exclude <glob>        Skip paths matching this glob. Repeatable.
  --allowlist <file>      Allowlist file (default: ${DEFAULT_ALLOWLIST}, optional).
  --no-default-excludes   Do not apply the built-in "governed elsewhere" excludes.
  --list-scope            Print the files that would be scanned, then exit 0.
  --json                  Machine-readable output.
  -h, --help              This text.

Default scope: ${DEFAULT_INCLUDES.join(', ')}
Exit: 0 clean, 1 findings, 2 usage error.`;

function parseArgs(argv) {
  const options = {
    includes: [], excludes: [], allowlist: DEFAULT_ALLOWLIST,
    json: false, listScope: false, help: false, defaultExcludes: true
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const needsValue = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value.`);
      i += 1;
      return value;
    };
    if (arg === '--include') options.includes.push(needsValue());
    else if (arg === '--exclude') options.excludes.push(needsValue());
    else if (arg === '--allowlist') options.allowlist = needsValue();
    else if (arg === '--no-default-excludes') options.defaultExcludes = false;
    else if (arg === '--list-scope') options.listScope = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '-h' || arg === '--help') options.help = true;
    else throw new Error(`Unknown argument "${arg}".`);
  }
  /* An explicit --include is an explicit instruction: scan exactly that. The "governed
     elsewhere" excludes shape the *default* scope, and applying them to a named path would
     report a clean result for a file the caller deliberately asked about. Noise excludes
     (.git, node_modules) always apply, as does anything the caller passed with --exclude. */
  const explicitScope = options.includes.length > 0;
  if (!explicitScope) options.includes = DEFAULT_INCLUDES.slice();
  options.explicitScope = explicitScope;
  options.excludes = NOISE_EXCLUDES
    .concat(options.defaultExcludes && !explicitScope ? GOVERNED_ELSEWHERE_EXCLUDES : [])
    .concat(options.excludes);
  return options;
}

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    return 2;
  }

  if (options.help) { console.log(USAGE); return 0; }

  if (options.listScope) {
    let scope;
    try {
      scope = resolveScope(options);
    } catch (error) {
      console.error(error.message);
      return 2;
    }
    if (options.json) {
      console.log(JSON.stringify({
        includes: options.includes,
        excludes: options.excludes,
        allowlist: options.allowlist,
        files: scope.files.map(displayPath),
        skipped_binary: scope.skippedBinary.map(displayPath),
        unreadable: scope.unreadable.map(displayPath),
        unmatched_includes: scope.missing
      }, null, 2));
    } else {
      console.log(`Scope: ${options.includes.join(', ')}`);
      scope.files.forEach(file => console.log(`  ${displayPath(file)}`));
      console.log(`${scope.files.length} file(s) in scope.`);
      scope.skippedBinary.forEach(file => console.error(`  ! ${displayPath(file)} is not a text file; it will not be scanned.`));
      scope.unreadable.forEach(file => console.error(`  ! ${displayPath(file)} could not be read.`));
      scope.missing.forEach(entry => console.error(`  ! "${entry}" matched nothing, or everything it matched was excluded.`));
    }
    return 0;
  }

  let result;
  try {
    result = scan(options);
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  if (options.json) {
    console.log(JSON.stringify({
      ok: result.findings.length === 0,
      scanned: result.scope.files.length,
      findings: result.findings.map(finding => ({
        file: displayPath(finding.file),
        line: finding.line,
        column: finding.column,
        rule: finding.rule,
        match_masked: maskMatch(finding.match),
        json_path: finding.jsonPath,
        message: finding.message
      })),
      warnings: result.warnings,
      unmatched_includes: result.scope.missing
    }, null, 2));
    return result.findings.length ? 1 : 0;
  }

  result.warnings.forEach(warning => console.error(`warning: ${warning}`));
  result.scope.missing.forEach(entry => console.error(
    `warning: "${entry}" matched nothing, or everything it matched was excluded.`));

  if (!result.findings.length) {
    console.log(`check-pii: clean (${result.scope.files.length} file(s) in scope).`);
    return 0;
  }

  console.error(`check-pii: ${result.findings.length} finding(s) in ${result.scope.files.length} file(s) scanned.\n`);
  for (const finding of result.findings) {
    const where = `${displayPath(finding.file)}:${finding.line}:${finding.column}`;
    console.error(`  ${where}  [${finding.rule}]  ${maskMatch(finding.match)}`);
    console.error(`      ${finding.message}`);
  }
  console.error('\nThe rule is in pipeline/trip/README.md: keep business names and their published');
  console.error('group-sales channels; redact every individual and every direct number to a role.');
  console.error('A genuinely published business channel can be added to the allowlist; see docs/ops/PII-GUARD.md.');
  return 1;
}

/* process.exit() would terminate before Node drains an async stdout write, truncating a long
   report at the pipe buffer. Setting exitCode lets the process end once output has flushed. */
if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = {
  main, scan, scanText, scanJson, scanFile, resolveScope, parseArgs,
  parseAllowlist, loadAllowlist, isAllowed, maskMatch, globToRegExp, displayPath, digestOf,
  RULES, DEFAULT_INCLUDES, DEFAULT_ALLOWLIST, GOVERNED_ELSEWHERE_EXCLUDES, repoRoot
};
