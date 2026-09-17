#!/usr/bin/env node
/* Bridge the legacy scraping output into the governed pipeline layer — as quarantine, not as truth.
 *
 * `data/final/prospects.csv` is the audited legacy artifact (docs/AUDIT-2026-09-10.md). Its defects
 * are confirmed, not hypothetical: discarded identities (A01), a wrong-role director email (A02),
 * same-name collapse across states (A06), enrichment that crosses school boundaries (A07),
 * publication dates recorded as event years (A08), counts that overstate their evidence (A09) and
 * evidence attached to rows rather than to individual claims (A13).
 *
 * So this importer deliberately produces a staging file in which NOTHING imports clean:
 *
 *   - every row is written with an evidence tier from pipeline/vocabulary.cjs;
 *   - every row that matches a known defect class carries the audit finding as its quarantine reason;
 *   - no row is ever customer-safe and no row is ever CRM-ready, because the governed layer's
 *     crm.gating rule needs published detail, recorded permission to contact and a known
 *     relationship owner, and this CSV records none of the three;
 *   - a row that matches no defect class is still only `staged-for-review`, never `ready`.
 *
 * The source CSV is opened read-only and never written. Output goes to pipeline/out-staging/,
 * which this module owns. Inside the repository nothing outside pipeline/ can be written, and
 * data/ and pipeline/out/ are refused outright: the first is the source of record, the second is
 * tracked and byte-compared by `pipeline/cli.cjs check` and belongs to the case renderer.
 *
 * Generated output under pipeline/out-staging/ is not meant to be committed: it is a derived
 * near-copy of an artifact whose contents are known to be wrong, and committing it invites it
 * being read as reviewed material.
 *
 *   node pipeline/import-prospects.cjs [--dry-run] [--limit N] [--as-of YYYY-MM-DD]
 *                                      [--input PATH] [--out-dir PATH]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const V = require('./vocabulary.cjs');

const repoRoot = path.resolve(__dirname, '..');
const DEFAULT_INPUT = path.join(repoRoot, 'data', 'final', 'prospects.csv');
const DEFAULT_OUT_DIR = path.join(repoRoot, 'pipeline', 'out-staging');

/* Directories this module refuses to write into, whatever it is asked to do. `data/` is the
   source of record and `pipeline/out/` belongs to the case renderer's tracked, byte-compared
   outputs. Both are checked before any file is opened for writing. */
const PROTECTED_DIRS = [
  path.join(repoRoot, 'data'),
  path.join(repoRoot, 'pipeline', 'out'),
  path.join(repoRoot, 'pipeline', 'cases'),
  path.join(repoRoot, 'pipeline', 'trip'),
  path.join(repoRoot, 'scripts'),
  path.join(repoRoot, 'scrapers')
];

const COLUMNS = [
  'school', 'band_name', 'city', 'state', 'level', 'district', 'enrollment', 'parades',
  'parades_marched', 'last_appearance', 'boa_finalist_years', 'school_url', 'band_url',
  'director_name', 'director_email', 'director_phone', 'booster_org', 'source_urls',
  'score', 'tier', 'notes'
];

const STAGING_COLUMNS = [
  'staging_id', 'staging_source_row', 'import_status', 'evidence_tier', 'evidence_tier_label',
  'evidence_requires', 'evidence_basis', 'evidence_needed_for', 'customer_safe', 'crm_ready',
  'crm_blocked_reason', 'entity_layers_present', 'quarantine_reasons', 'quarantine_detail',
  'staging_formula_guarded'
];

/* Audit finding codes, in the order they are reported. */
const REASONS = {
  EVIDENCE_MISSING: 'evidence-missing',
  A02: 'A02 role-unverified',
  A06: 'A06 identity-ambiguous',
  A07: 'A07 cross-school-enrichment',
  A08: 'A08 year-inferred',
  A09: 'A09 evidence-overstated'
};
const REASON_ORDER = [REASONS.EVIDENCE_MISSING, REASONS.A02, REASONS.A06, REASONS.A07, REASONS.A08, REASONS.A09];

/* Every row lands here, because the legacy CSV cannot satisfy crm.gating: it records no permission
   to contact and no relationship owner, and the audit found its contact roles unverified (A02). */
const CRM_BLOCKED_REASON =
  'crm.gating: no published-and-role-verified detail, no recorded permission to contact, no known relationship owner.';

/* ------------------------------------------------------------------ CSV parsing */

/* RFC 4180 reader: quoted fields, embedded commas and newlines, doubled quotes, CR/CRLF/LF,
   a UTF-8 BOM and an optional trailing newline. Returns an array of string arrays. */
function parseCsv(text) {
  if (typeof text !== 'string') throw new TypeError('parseCsv expects a string.');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let started = false; // a row exists once any character or delimiter has been seen

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; started = true; continue; }
    if (c === ',') { row.push(field); field = ''; started = true; continue; }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = []; field = ''; started = false;
      continue;
    }
    field += c;
    started = true;
  }
  if (started || field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ------------------------------------------------------------------ CSV writing */

/* Audit A12: `scripts/export.py` writes source text verbatim, so a scraped value beginning with
   =, +, - or @ becomes a live formula in Excel or Sheets. Prefix an apostrophe so the cell is
   read as text. Leading tab and CR are guarded too: both can re-open formula interpretation
   after a spreadsheet trims the cell. The canonical value is unchanged; this is output encoding,
   and `staging_formula_guarded` names every column the guard touched so it stays visible. */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function needsFormulaGuard(value) {
  return FORMULA_LEAD.test(String(value ?? ''));
}

function guardCell(value) {
  const text = String(value ?? '');
  return needsFormulaGuard(text) ? `'${text}` : text;
}

function quoteCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatCsv(header, records) {
  const lines = [header.map(h => quoteCell(guardCell(h))).join(',')];
  for (const record of records) {
    lines.push(header.map(column => quoteCell(guardCell(record[column]))).join(','));
  }
  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ read-only source access */

function isInside(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/* The only write path in this module. Inside the repository it allows pipeline/ and nothing else,
   and never a protected directory, so "write the staging file over data/final/prospects.csv or
   into pipeline/out/" cannot be reached by a typo, a relative path or a stray --out-dir. A target
   entirely outside the repository is allowed, because it cannot touch project files; that is how
   the tests stage the real file into a temporary directory. */
function assertWritableTarget(target) {
  const resolved = path.resolve(target);
  for (const dir of PROTECTED_DIRS) {
    if (isInside(dir, resolved)) {
      throw new Error(`Refusing to write into ${path.relative(repoRoot, dir)}/: ${resolved}`);
    }
  }
  const pipelineDir = path.join(repoRoot, 'pipeline');
  if (isInside(repoRoot, resolved) && !isInside(pipelineDir, resolved)) {
    throw new Error(`Refusing to write anywhere in the repository except pipeline/: ${resolved}`);
  }
  return resolved;
}

/* Opened with the 'r' flag and read through the descriptor, so the source CSV cannot be
   truncated, appended to or created by this process even if the path is wrong. */
function readSourceCsv(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const chunks = [];
    const buffer = Buffer.alloc(64 * 1024);
    for (;;) {
      const read = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (read <= 0) break;
      chunks.push(Buffer.from(buffer.subarray(0, read)));
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

/* ------------------------------------------------------------------ small helpers */

const trim = value => String(value ?? '').trim();
const splitList = value => trim(value).split(';').map(part => part.trim()).filter(Boolean);
/* Apostrophes are dropped rather than split on, so "O'Fallon" stays one word and its initial
   still lines up with the OTHS in oths.us. */
const normalizeName = value => trim(value).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/* Never print a full address: the local part keeps one character and the domain keeps its
   last label only. Enough to tell two rows apart, not enough to be a contact list. */
function maskEmail(value) {
  const text = trim(value);
  if (!text) return '';
  const at = text.lastIndexOf('@');
  if (at <= 0) return '***';
  const local = text.slice(0, at);
  const domain = text.slice(at + 1);
  const labels = domain.split('.');
  const tail = labels.length > 1 ? `***.${labels[labels.length - 1]}` : '***';
  return `${local[0]}***@${tail}`;
}

function hostOf(url) {
  const text = trim(url);
  if (!text) return '';
  try {
    return new URL(/^[a-z]+:\/\//i.test(text) ? text : `http://${text}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

const US_STATES = new Set(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND',
  'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC']);

/* A `.k12.<state>.us` or `.<state>.us` host states its state outright; that is the one state
   signal in this schema that does not require guessing. */
function stateFromHost(host) {
  const match = /\.([a-z]{2})\.us$/.exec(host);
  if (!match) return '';
  const code = match[1].toUpperCase();
  return US_STATES.has(code) ? code : '';
}

/* A district string occasionally names its state outright, and only the comma-delimited form
   ("Milwaukee, Wisconsin") is read as one. Two other forms are deliberately NOT read as states,
   because both would manufacture exactly the cross-state error this check exists to find:
   a bare two-letter tail, since district names end in "SD" for School District and "CO" for
   County; and a bare state word inside the name, since "Indiana Area School District" is in
   Pennsylvania, "Oregon City School District" is in Ohio and "Kansas City Public Schools" is in
   Missouri. The unambiguous state signal on these rows is the .k12.<state>.us host instead. */
const STATE_NAMES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC'
};

function stateFromDistrict(district) {
  const text = trim(district);
  if (!text) return '';
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(STATE_NAMES)) {
    if (new RegExp(`,\\s*${name}([^a-z]|$)`).test(lower)) return code;
  }
  return '';
}

/* Words that carry no identity: they appear in most district and school names. Words that DO
   identify a school stay out of this list even when they look structural — "Union High School",
   "Air Academy" and "Franklin Regional" are named by exactly those words. */
const GENERIC_WORDS = new Set(['school', 'schools', 'sch', 'district', 'districts', 'isd', 'usd',
  'csd', 'sd', 'cusd', 'corp', 'corporation', 'county', 'city', 'unified', 'consolidated',
  'community', 'public', 'independent', 'area', 'local', 'division', 'department', 'board',
  'of', 'the', 'and', 'high', 'middle', 'junior', 'senior', 'elementary', 'co', 'inc']);

function identityWords(value) {
  return normalizeName(value).split(' ')
    .filter(word => word && !GENERIC_WORDS.has(word) && !/^r\d*$/.test(word) && !/^[ivx]+$/.test(word));
}

/* Initials of the significant words, e.g. "Tarpon Springs High School" -> "ts", and of the whole
   name including its generic tail, e.g. -> "tshs", which is how school subdomains are usually built.
   The two-letter variant keeps the first word's first two letters, which is the other common
   convention: LaPorte High School is lphs, not lhs. */
function acronyms(value) {
  const all = normalizeName(value).split(' ').filter(Boolean);
  const significant = identityWords(value);
  const out = new Set();
  const initials = words => words.map(word => word[0]).join('');
  if (all.length >= 2) {
    out.add(initials(all));
    if (all[0].length >= 2) out.add(all[0].slice(0, 2) + initials(all.slice(1)));
  }
  if (significant.length >= 2) out.add(initials(significant));
  return [...out].filter(a => a.length >= 2);
}

/* The part of a URL that can name a school: the full host plus the path, because a district site
   commonly gives each school a path ("lisd.net/fmhs", "okaloosaschools.com/o/niceville") and that
   path is the only thing tying the URL to this row. */
function urlIdentityText(url) {
  const text = trim(url);
  if (!text) return '';
  try {
    const parsed = new URL(/^[a-z]+:\/\//i.test(text) ? text : `http://${text}`);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  } catch {
    return text.toLowerCase();
  }
}

/* Labels split on separators, again at letter/digit boundaries, and once more with a trailing
   "k12" removed, because "albertk12.org" is Albertville's own site and not a foreign domain. */
const urlLabels = text => {
  const out = new Set();
  for (const label of text.split(/[^a-z0-9]+/).filter(Boolean)) {
    out.add(label);
    for (const part of label.split(/(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])/)) if (part) out.add(part);
    const stripped = /^(.+?)k12$/.exec(label);
    if (stripped) out.add(stripped[1]);
  }
  return [...out];
};

/* Does this URL carry a recognizable trace of `name`?
   - a significant word of four or more characters appearing in it ("parkland" in parklandsd.org);
   - a label equal to a significant word, which catches short ones ("lee" in lee.k12.al.us);
   - a label of four or more characters that is a prefix of a significant word ("albert" for
     Albertville);
   - a label beginning with an acronym of three or more letters ("oths" for O'Fallon Township
     High School), or a label that IS a two-letter acronym.
   A two-letter acronym is not accepted as a prefix, because two-letter initials collide: "cc"
   would let Clear Creek ISD's ccisd.net stand as evidence for Carmel Clay Schools, which is the
   cross-school match this check exists to catch. Being wrong towards quarantine is the safe
   direction here; being wrong towards a clean import is not.
   The comparison uses the FULL host. Audit A07 records that reducing a host to its public suffix
   makes `a.k12.tx.us` and `b.k12.tx.us` indistinguishable, so no suffix trimming happens here. */
function urlCorroborates(url, name) {
  const text = urlIdentityText(url);
  if (!text || !trim(name)) return false;
  const compact = text.replace(/[^a-z0-9]/g, '');
  const labels = urlLabels(text);
  const words = identityWords(name);
  for (const word of words) {
    if (word.length >= 4 && compact.includes(word)) return true;
    for (const label of labels) {
      if (word.length >= 3 && label === word) return true;
      if (label.length >= 4 && word.startsWith(label)) return true;
    }
  }
  for (const acronym of acronyms(name)) {
    for (const label of labels) {
      if (acronym.length >= 3 ? label.startsWith(acronym) : label === acronym) return true;
    }
  }
  return false;
}

/* Two names describe the same place when either significant word set contains the other. */
function namesOverlap(a, b) {
  const left = identityWords(a);
  const right = identityWords(b);
  if (!left.length || !right.length) return false;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return left.every(word => rightSet.has(word)) || right.every(word => leftSet.has(word));
}

/* A page that could legitimately publish a staff contact: a school, district or booster site.
   Organizer archives, encyclopedias and news pages do not qualify — that is SOURCE_KINDS
   `publishes_contacts` in pipeline/vocabulary.cjs, applied to a bare URL. */
function isPrimaryContactHost(host) {
  if (!host) return false;
  if (/\.edu$/.test(host)) return true;
  if (/\.k12\.[a-z]{2}\.us$/.test(host)) return true;
  return /(^|[.\-])(isd|usd|schools?|district|boosters?|bands?)([.\-]|$)/.test(host)
    || /(isd|schools|district|booster|bands)/.test(host.replace(/[^a-z]/g, ''));
}

/* ------------------------------------------------------------------ event calendar */

/* What the legacy `parades` strings actually describe. A competition placement is not a parade
   appearance, and an event whose date has not arrived is not an appearance at all (audit A09).
   `month` is the earliest month in which that event is held; an unrecognized event is treated as
   unclassifiable, which quarantines rather than counts it. */
const EVENT_CALENDAR = {
  'Rose': { month: 1, kind: 'parade' },
  "Macy's": { month: 11, kind: 'parade' },
  'Philadelphia': { month: 11, kind: 'parade' },
  'Hollywood': { month: 11, kind: 'parade' },
  'H-E-B Houston': { month: 11, kind: 'parade' },
  'Raleigh Christmas Parade': { month: 11, kind: 'parade' },
  'BOA Grand National Finalist': { month: 11, kind: 'competition' }
};

function parseAppearance(entry) {
  const text = trim(entry);
  const match = /^(.*?)[\s,]*(\d{4})$/.exec(text);
  if (!match) return { entry: text, event: text, year: null, spec: EVENT_CALENDAR[text] || null };
  const event = match[1].trim();
  return { entry: text, event, year: Number(match[2]), spec: EVENT_CALENDAR[event] || null };
}

function isHeldBy(appearance, asOf) {
  if (appearance.year === null) return false;
  const month = appearance.spec ? appearance.spec.month : 12;
  return Date.UTC(appearance.year, month - 1, 1) <= asOf.getTime();
}

/* ------------------------------------------------------------------ classification */

/* The name index answers "does another row use this school name in a different state?". It is
   always built from the whole file, even under --limit, so a limited run cannot miss the twin
   that makes a name ambiguous. */
function buildNameIndex(records) {
  const index = new Map();
  for (const record of records) {
    const key = normalizeName(record.school);
    if (!key) continue;
    if (!index.has(key)) index.set(key, new Set());
    index.get(key).add(trim(record.state));
  }
  return index;
}

function checkEvidenceMissing(row) {
  if (splitList(row.source_urls).length) return null;
  return 'No source_url. The project guardrail is that every row carries at least one source URL; a row without one cannot be verified at all.';
}

function checkIdentity(row, nameIndex) {
  const notes = [];
  const state = trim(row.state);
  if (!trim(row.school)) {
    notes.push('No school name. Nothing on this row can be attributed to an institution.');
  }
  /* More fields on the line than the header has columns is the signature of a quoting or shift
     bug, and a shifted line's values may belong to the wrong columns entirely. */
  if (row._extra && row._extra.length) {
    notes.push(`This line carries ${row._columns} fields where the header has ${row._columns - row._extra.length}; the surplus value${row._extra.length > 1 ? 's' : ''} ${row._extra.map(value => `"${value}"`).join(', ')} could not be placed, so the values on this line may not line up with their columns.`);
  }
  if (!state) {
    notes.push('No state. Audit A06: a stateless row is folded onto whichever known name looks unique inside this incomplete dataset, which is not proof of identity.');
  }
  const states = nameIndex.get(normalizeName(row.school));
  if (states && states.size > 1) {
    const others = [...states].filter(value => value !== state);
    if (others.length) {
      const shown = others.map(value => value || '(blank)').join(', ');
      notes.push(`School name also appears with state ${shown}. Audit A06: the interim dedupe key is (school.lower(), event, year) and drops state, so same-named schools in different states collapse before the state-aware merge runs.`);
    }
  }
  return notes.length ? notes.join(' ') : null;
}

function checkCrossSchool(row) {
  const notes = [];
  const state = trim(row.state);
  const district = trim(row.district);
  const schoolHost = hostOf(row.school_url);
  const bandHost = hostOf(row.band_url);

  /* city/district states disagree: the row's state against a state the district states outright,
     either in its own text or in the host of the site the enrichment read. */
  const claimed = [
    ['district text', stateFromDistrict(district)],
    ['school_url host', stateFromHost(schoolHost)],
    ['band_url host', stateFromHost(bandHost)]
  ].filter(([, code]) => code);
  if (state) {
    for (const [where, code] of claimed) {
      if (code !== state) {
        notes.push(`The ${where} states ${code} but the row places ${trim(row.city) || 'the school'} in ${state}. Audit A07: enrichment can attach a district from a different state to a school.`);
      }
    }
  }

  if (district && schoolHost) {
    const url = trim(row.school_url);
    const districtOk = urlCorroborates(url, district);
    const schoolOk = urlCorroborates(url, row.school);
    const cityOk = urlCorroborates(url, row.city);
    if (!districtOk && !schoolOk && !cityOk) {
      notes.push(`school_url "${url}" shares no name with the district "${district}", the school or the city, so the district and the website are not evidence for each other. Audit A07: matched on names and initialisms against the full host, because reducing a host to its public suffix makes two different district domains identical.`);
    } else if (districtOk && !schoolOk && !cityOk && !namesOverlap(district, row.city) && !namesOverlap(district, row.school)) {
      notes.push(`school_url "${url}" matches the district "${district}" but nothing in this school's own name or city, so it is the district's site standing in for the school's. Audit A07/A13: a field read from it belongs to the district, not to this school.`);
    }
  }
  return notes.length ? notes.join(' ') : null;
}

/* The schema has a director_email column but no column that records whose address it is. That is
   exactly audit A02: a district Director of Fine Arts is stored as a band director's address. */
function recordedRole(row) {
  const explicit = trim(row.director_role) || trim(row.director_title);
  if (explicit) return explicit;
  const match = /(?:^|;)\s*role:\s*([^;]+)/i.exec(trim(row.notes));
  return match ? match[1].trim() : '';
}

function primaryContactSource(row) {
  const schoolHost = hostOf(row.school_url);
  const bandHost = hostOf(row.band_url);
  for (const url of splitList(row.source_urls)) {
    const host = hostOf(url);
    if (!host) continue;
    if (isPrimaryContactHost(host)) return { url, host };
    if (host === schoolHost || host === bandHost) return { url, host };
  }
  return null;
}

/* Every recorded contact detail is checked, not only the address: audit A02 is a wrong-ROLE
   defect, and a director_name extracted by the same text-window fallback is wrong in the same way
   whether or not an address came with it. */
function checkContactRole(row) {
  const email = trim(row.director_email);
  const name = trim(row.director_name);
  const phone = trim(row.director_phone);
  if (!email && !name && !phone) return null;
  const held = [];
  if (name) held.push(`director_name "${name}"`);
  if (email) held.push(`director_email ${maskEmail(email)}`);
  if (phone) held.push('director_phone');
  const primary = primaryContactSource(row);
  const role = recordedRole(row);
  if (primary && role) return null;
  const missing = [];
  if (!primary) missing.push('no cited source_url is a school, district or booster page that could publish it');
  if (!role) missing.push('the row records no role for the detail, and this schema has no role field');
  return `${held.join(' and ')} held back: ${missing.join('; ')}. Audit A02: a district Director of Fine Arts is stored on one row as if it were the band director, and a plain-text fallback paired a theatre address with a band director's name. contacts.no_guess and crm.gating both refuse it.`;
}

function checkYearInference(row, appearances) {
  const notes = [];
  const newsClaims = [...trim(row.notes).matchAll(/(?:^|;)\s*news:\s*named in local coverage of\s*([^;]+)/gi)]
    .map(match => match[1].trim());
  if (newsClaims.length) {
    notes.push(`Appearance${newsClaims.length > 1 ? 's' : ''} ${newsClaims.map(claim => `"${claim}"`).join(', ')} rest${newsClaims.length > 1 ? '' : 's'} on a news headline. Audit A08: scrapers/news_east.py assigns the previous year to a January-March article that states no year, so an article announcing a future trip was recorded as a past appearance.`);
  }
  const undated = appearances.filter(appearance => appearance.year === null);
  if (undated.length) {
    notes.push(`Appearance${undated.length > 1 ? 's' : ''} ${undated.map(a => `"${a.entry}"`).join(', ')} carry no stated year. Audit A08: an unknown event year stays unknown.`);
  }
  const last = trim(row.last_appearance);
  if (last && !appearances.some(appearance => String(appearance.year) === last)) {
    const stated = appearances.map(a => a.year).filter(Boolean).join(', ');
    notes.push(`last_appearance ${last} is not among the years this row's own evidence states (${stated || 'the row lists no appearance at all'}). Audit A08: a derived year is not a stated one.`);
  }
  return notes.length ? notes.join(' ') : null;
}

function checkOverstatedEvidence(row, appearances, asOf) {
  const notes = [];
  const rawCount = trim(row.parades_marched);
  const count = rawCount === '' ? null : Number(rawCount);
  const asOfLabel = asOf.toISOString().slice(0, 10);

  if (count !== null && Number.isFinite(count) && count > 0) {
    const competitions = appearances.filter(a => a.spec && a.spec.kind === 'competition');
    const future = appearances.filter(a => !isHeldBy(a, asOf) && a.year !== null);
    const unknown = appearances.filter(a => !a.spec && a.year !== null);
    if (competitions.length) {
      notes.push(`parades_marched counts ${competitions.length} competition placement${competitions.length > 1 ? 's' : ''} (${competitions.map(a => `"${a.entry}"`).join(', ')}) as parade appearances.`);
    }
    if (future.length) {
      notes.push(`parades_marched counts ${future.length} event${future.length > 1 ? 's' : ''} not yet held as of ${asOfLabel} (${future.map(a => `"${a.entry}"`).join(', ')}); an invitation is not an appearance.`);
    }
    if (unknown.length) {
      notes.push(`Entr${unknown.length > 1 ? 'ies' : 'y'} ${unknown.map(a => `"${a.entry}"`).join(', ')} name no event this importer can classify as a completed parade.`);
    }
  }
  if (count !== null && Number.isFinite(count) && count !== appearances.length) {
    notes.push(`parades_marched is ${count} but the row lists ${appearances.length} appearance entr${appearances.length === 1 ? 'y' : 'ies'}.`);
  }
  if (rawCount !== '' && !Number.isFinite(count)) {
    notes.push(`parades_marched "${rawCount}" is not a number.`);
  }

  const last = trim(row.last_appearance);
  if (last) {
    const matching = appearances.filter(a => String(a.year) === last);
    if (matching.length && matching.every(a => !isHeldBy(a, asOf))) {
      notes.push(`last_appearance ${last} names an event not yet held as of ${asOfLabel}.`);
    } else if (matching.length && matching.every(a => a.spec && a.spec.kind === 'competition')) {
      notes.push(`last_appearance ${last} names only a competition placement, not a parade.`);
    }
  }
  if (!notes.length) return null;
  return `${notes.join(' ')} Audit A09: competition results and future invitations enter parades_marched and last_appearance as if they were completed parades.`;
}

/* Which of the four governed entity layers this one flat row is carrying at once. The legacy
   schema blurs account, ensemble, adult role and opportunity into a single record (audit A13);
   naming them is the first step of disaggregating it later. */
function entityLayersPresent(row) {
  const layers = [];
  if (trim(row.school)) layers.push('account');
  if (trim(row.band_name)) layers.push('unit');
  if (trim(row.director_name) || trim(row.director_email) || trim(row.director_phone)) layers.push('contact');
  if (splitList(row.parades).length) layers.push('opportunity');
  return layers.join(';');
}

/* Why this row's values exist at all, in the legacy pipeline's own words. Tier 3 requires a basis;
   this is it. */
function evidenceBasis(row) {
  const notes = trim(row.notes);
  const parts = [];
  if (/nces:\s*matched/i.test(notes)) parts.push('district and enrollment from a fuzzy NCES name match');
  if (/search:\s*website via Google knowledge panel/i.test(notes)) parts.push('school website taken from a search knowledge panel');
  if (/news:/i.test(notes)) parts.push('at least one appearance from a news headline');
  if (/site crawl blocked/i.test(notes)) parts.push('the school-site crawl was blocked');
  if (/no band page found/i.test(notes)) parts.push('no band page was found');
  const hosts = new Set(splitList(row.source_urls).map(hostOf).filter(Boolean));
  if (hosts.size) parts.push(`${hosts.size} source host${hosts.size > 1 ? 's' : ''} cited at row level, not per claim (audit A13)`);
  if (!parts.length) parts.push('legacy scrape output with no recorded derivation');
  return `Re-staged from the audited legacy pipeline: ${parts.join('; ')}. Not re-verified against a primary page by this importer.`;
}

function classifyRow(row, context) {
  const asOf = context.asOf;
  const appearances = splitList(row.parades).map(parseAppearance);

  const checks = [
    [REASONS.EVIDENCE_MISSING, checkEvidenceMissing(row)],
    [REASONS.A02, checkContactRole(row)],
    [REASONS.A06, checkIdentity(row, context.nameIndex)],
    [REASONS.A07, checkCrossSchool(row)],
    [REASONS.A08, checkYearInference(row, appearances)],
    [REASONS.A09, checkOverstatedEvidence(row, appearances, asOf)]
  ];

  const reasons = [];
  const details = [];
  for (const code of REASON_ORDER) {
    const found = checks.find(([candidate]) => candidate === code);
    if (found && found[1]) { reasons.push(code); details.push(`${code}: ${found[1]}`); }
  }

  /* Tier 5 when a fact the row cannot do without is absent; otherwise tier 3, because every value
     here is a derivation from the audited pipeline. Tier 1 is unreachable: it means a primary
     document held by the business and it is the only customer-safe tier. Tier 2 and tier 4 do not
     describe scraped public research at all. */
  const missingIdentity = [];
  if (!splitList(row.source_urls).length) missingIdentity.push('at least one source URL');
  if (!trim(row.state)) missingIdentity.push('the state that identifies this school');
  if (!trim(row.school)) missingIdentity.push('a school name');
  const tier = missingIdentity.length ? 5 : 3;
  const spec = V.tierOf(tier);

  return {
    tier,
    tierLabel: spec.label,
    tierRequires: spec.requires,
    basis: tier === 3 ? evidenceBasis(row) : '',
    neededFor: tier === 5
      ? `Resolve ${missingIdentity.join(' and ')} before this row can be reviewed, scored or used for any approach.`
      : '',
    reasons,
    detail: details.join(' | '),
    entityLayers: entityLayersPresent(row),
    importStatus: reasons.length ? 'quarantined' : 'staged-for-review'
  };
}

/* ------------------------------------------------------------------ the import itself */

function importProspects(options = {}) {
  const input = path.resolve(options.input || DEFAULT_INPUT);
  const asOf = options.asOf instanceof Date ? options.asOf : new Date(`${options.asOf || new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(asOf.getTime())) throw new Error(`--as-of is not a date: ${options.asOf}`);

  const rows = parseCsv(readSourceCsv(input));
  if (!rows.length) throw new Error(`${path.relative(repoRoot, input)} is empty.`);
  const header = rows[0].map(name => name.trim());
  /* Staging a staging file would emit the staging columns twice and silently overwrite the
     earlier classification, so it is refused rather than half-done. */
  const alreadyStaged = STAGING_COLUMNS.filter(name => header.includes(name));
  if (alreadyStaged.length) {
    throw new Error(`${path.relative(repoRoot, input)} already carries staging columns (${alreadyStaged.join(', ')}). Import the original legacy CSV, not a staging output.`);
  }
  const records = rows.slice(1)
    /* A blank line is not a record; counting one would inflate every total on a hand-edited file. */
    .map((values, index) => ({ values, line: index + 2 }))
    .filter(({ values }) => !(values.length <= 1 && trim(values[0]) === ''))
    .map(({ values, line }) => {
      const record = { _line: line, _columns: values.length, _extra: values.slice(header.length) };
      header.forEach((name, column) => { record[name] = values[column] === undefined ? '' : values[column]; });
      for (const name of COLUMNS) if (record[name] === undefined) record[name] = '';
      return record;
    });

  const nameIndex = buildNameIndex(records);
  const limit = options.limit === undefined || options.limit === null ? records.length : Number(options.limit);
  if (!Number.isInteger(limit) || limit < 0) throw new Error(`--limit needs a non-negative whole number, got "${options.limit}".`);
  const selected = records.slice(0, limit);

  const staged = [];
  const byReason = new Map(REASON_ORDER.map(code => [code, 0]));
  const byTier = new Map();
  let quarantined = 0;

  for (const record of selected) {
    const verdict = classifyRow(record, { nameIndex, asOf });
    const out = {};
    for (const name of header) out[name] = record[name];
    out.staging_id = `legacy-${String(record._line - 1).padStart(4, '0')}`;
    out.staging_source_row = String(record._line);
    out.import_status = verdict.importStatus;
    out.evidence_tier = String(verdict.tier);
    out.evidence_tier_label = verdict.tierLabel;
    out.evidence_requires = verdict.tierRequires;
    out.evidence_basis = verdict.basis;
    out.evidence_needed_for = verdict.neededFor;
    out.customer_safe = 'no';
    out.crm_ready = 'no';
    out.crm_blocked_reason = CRM_BLOCKED_REASON;
    out.entity_layers_present = verdict.entityLayers;
    out.quarantine_reasons = verdict.reasons.join('; ');
    out.quarantine_detail = verdict.detail;
    /* Named after the row is assembled, so it covers the staging columns too, and computed
       against the same values formatCsv will guard. */
    out.staging_formula_guarded = [...header, ...STAGING_COLUMNS]
      .filter(column => needsFormulaGuard(out[column])).join(';');

    staged.push(out);
    byTier.set(verdict.tier, (byTier.get(verdict.tier) || 0) + 1);
    if (verdict.reasons.length) quarantined++;
    for (const code of verdict.reasons) byReason.set(code, byReason.get(code) + 1);
  }

  return {
    input,
    header,
    columns: [...header, ...STAGING_COLUMNS],
    asOf,
    rowsInFile: records.length,
    rowsRead: selected.length,
    rowsQuarantined: quarantined,
    rowsStagedForReview: selected.length - quarantined,
    byReason,
    byTier,
    staged,
    quarantine: staged.filter(row => row.import_status === 'quarantined')
  };
}

function writeStaging(result, outDir) {
  /* Every target is checked before anything is created, so a refused path leaves no directory
     and no half-written pair behind. */
  const dir = assertWritableTarget(outDir || DEFAULT_OUT_DIR);
  const targets = [
    { file: assertWritableTarget(path.join(dir, 'prospects-staging.csv')), rows: result.staged },
    { file: assertWritableTarget(path.join(dir, 'prospects-quarantine.csv')), rows: result.quarantine }
  ];
  fs.mkdirSync(dir, { recursive: true });
  return targets.map(({ file, rows }) => {
    fs.writeFileSync(file, formatCsv(result.columns, rows));
    return { file, rows: rows.length };
  });
}

/* ------------------------------------------------------------------ CLI */

const USAGE = `Usage: node pipeline/import-prospects.cjs [options]

Stages data/final/prospects.csv into pipeline/out-staging/ so the audited legacy rows can be
reviewed without any of them importing clean. Nothing is ever CRM-ready or customer-safe.

  --dry-run            classify and report; write no files
  --limit N            stage only the first N data rows (the whole file is still read, so a
                       same-name twin beyond the limit still makes a row ambiguous)
  --as-of YYYY-MM-DD   the date "not yet held" is judged against (default: today)
  --input PATH         source CSV (default: data/final/prospects.csv, opened read-only)
  --out-dir PATH       output directory (default: pipeline/out-staging). Inside the repository
                       it must be under pipeline/, and never data/ or pipeline/out/.
  --help`;

function parseArgs(argv) {
  const options = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined) throw new Error(`${arg} needs a value.`);
      return next;
    };
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--limit') options.limit = Number(value());
    else if (arg === '--as-of') options.asOf = value();
    else if (arg === '--input') options.input = value();
    else if (arg === '--out-dir') options.outDir = value();
    else throw new Error(`Unknown option "${arg}".\n${USAGE}`);
  }
  return options;
}

function summarize(result, files, options) {
  const lines = [];
  const relative = target => path.relative(repoRoot, target) || target;
  lines.push(`prospects-importer · ${relative(result.input)} (opened read-only) · as-of ${result.asOf.toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(`  rows read              ${result.rowsRead}${result.rowsRead === result.rowsInFile ? '' : ` (of ${result.rowsInFile} in the file)`}`);
  lines.push(`  rows staged for review ${result.rowsStagedForReview}  (no defect class matched; still not CRM-ready)`);
  lines.push(`  rows quarantined       ${result.rowsQuarantined}`);
  for (const code of REASON_ORDER) {
    const count = result.byReason.get(code) || 0;
    lines.push(`    ${code.padEnd(28)} ${String(count).padStart(4)}`);
  }
  lines.push('');
  const tiers = [...result.byTier.entries()].sort((a, b) => a[0] - b[0]);
  lines.push(`  evidence tiers         ${tiers.map(([tier, count]) => `tier ${tier} ${V.tierOf(tier).label} × ${count}`).join(' · ') || 'none'}`);
  lines.push(`  crm-ready rows         0  (${CRM_BLOCKED_REASON})`);
  lines.push('');
  if (options.dryRun) {
    lines.push('  --dry-run: nothing was written.');
  } else {
    for (const entry of files) lines.push(`  wrote ${relative(entry.file)}  (${entry.rows} row${entry.rows === 1 ? '' : 's'})`);
    lines.push('  Generated output; review it, do not commit it.');
  }
  return lines.join('\n');
}

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  if (options.help) { console.log(USAGE); return 0; }

  try {
    const result = importProspects(options);
    const files = options.dryRun ? [] : writeStaging(result, options.outDir);
    console.log(summarize(result, files, options));
    return 0;
  } catch (error) {
    console.error(`prospects-importer: ${error.message}`);
    return 1;
  }
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = {
  parseCsv, formatCsv, guardCell, quoteCell, needsFormulaGuard, maskEmail,
  readSourceCsv, assertWritableTarget, isInside,
  hostOf, urlIdentityText, urlCorroborates, namesOverlap, identityWords, acronyms,
  stateFromHost, stateFromDistrict, isPrimaryContactHost,
  parseAppearance, isHeldBy, buildNameIndex, classifyRow, entityLayersPresent,
  importProspects, writeStaging, summarize, parseArgs, main,
  COLUMNS, STAGING_COLUMNS, REASONS, REASON_ORDER, EVENT_CALENDAR,
  CRM_BLOCKED_REASON, DEFAULT_INPUT, DEFAULT_OUT_DIR, repoRoot, USAGE
};
