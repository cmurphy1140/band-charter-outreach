/* Tests for pipeline/import-prospects.cjs: the bridge that stages the audited legacy prospect
   rows without letting any of them import clean. Fixtures are temporary CSVs; the one test that
   uses the real data/final/prospects.csv writes its output to a temp directory. */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const importer = require('../pipeline/import-prospects.cjs');
const {
  parseCsv, formatCsv, guardCell, quoteCell, needsFormulaGuard, maskEmail,
  readSourceCsv, assertWritableTarget, hostOf, urlCorroborates, namesOverlap,
  stateFromHost, stateFromDistrict, isPrimaryContactHost, parseAppearance, isHeldBy,
  buildNameIndex, classifyRow, entityLayersPresent, importProspects, writeStaging,
  parseArgs, main, COLUMNS, STAGING_COLUMNS, REASONS, REASON_ORDER, repoRoot
} = importer;

const CLI = path.join(repoRoot, 'pipeline', 'import-prospects.cjs');
const REAL_CSV = path.join(repoRoot, 'data', 'final', 'prospects.csv');
const AS_OF = '2026-09-17';

/* ------------------------------------------------------------------ fixture helpers */

function withTempDir(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-prospects-'));
  try {
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const BLANK = Object.fromEntries(COLUMNS.map(name => [name, '']));

function csvOf(rows) {
  const records = rows.map(row => ({ ...BLANK, ...row }));
  return formatCsv(COLUMNS, records);
}

/* Like csvOf but without the formula guard, so a fixture can carry a genuinely dangerous value
   into the importer the way a scraper would. */
function rawCsvOf(rows) {
  const lines = [COLUMNS.join(',')];
  for (const row of rows) {
    const record = { ...BLANK, ...row };
    lines.push(COLUMNS.map(column => quoteCell(record[column])).join(','));
  }
  return lines.join('\n') + '\n';
}

/* Classify fixture rows in memory, the way importProspects does. */
function classifyAll(rows, asOf = AS_OF) {
  const records = rows.map(row => ({ ...BLANK, ...row }));
  const nameIndex = buildNameIndex(records);
  const when = new Date(`${asOf}T00:00:00Z`);
  return records.map(record => classifyRow(record, { nameIndex, asOf: when }));
}

const classifyOne = (row, asOf) => classifyAll([row], asOf)[0];

/* A row that no rule should fire on, used as the baseline every fixture varies from. */
const CLEAN_ROW = {
  school: 'Rivertown High School',
  band_name: 'Rivertown Marching Band',
  city: 'Rivertown',
  state: 'OH',
  district: 'Rivertown City',
  school_url: 'https://rhs.rivertown.k12.oh.us/',
  parades: 'Rose 2019; Philadelphia 2016',
  parades_marched: '2',
  last_appearance: '2019',
  source_urls: 'https://en.wikipedia.org/wiki/Rose_Parade_marching_bands'
};

/* ------------------------------------------------------------------ CSV parser */

test('the CSV parser handles quoted fields, embedded commas, quotes and newlines', () => {
  const rows = parseCsv('a,b,c\n1,"two, and a half","he said ""hi"""\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', 'two, and a half', 'he said "hi"']]);
});

test('the CSV parser keeps a newline inside a quoted field', () => {
  const rows = parseCsv('school,notes\n"Lincoln High","line one\nline two"\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[1][1], 'line one\nline two');
});

test('the CSV parser accepts CRLF, a bare CR, a BOM and a missing trailing newline', () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n1,2'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(parseCsv('a,b\r1,2\r'), [['a', 'b'], ['1', '2']]);
});

test('the CSV parser keeps empty fields and does not invent a trailing row', () => {
  assert.deepEqual(parseCsv('a,b,c\n,,\n'), [['a', 'b', 'c'], ['', '', '']]);
  assert.deepEqual(parseCsv(''), []);
});

test('a quoted field may contain the delimiter, a line break and doubled quotes at once', () => {
  const written = formatCsv(['x'], [{ x: 'a,b\n"c"' }]);
  assert.deepEqual(parseCsv(written), [['x'], ['a,b\n"c"']]);
});

/* ------------------------------------------------------------------ A12 formula guard */

test('a cell starting with =, +, -, @, tab or CR is prefixed so a spreadsheet reads it as text', () => {
  for (const value of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) {
    assert.equal(needsFormulaGuard(value), true, value);
    assert.equal(guardCell(value), `'${value}`);
  }
});

test('an ordinary value is not touched by the formula guard', () => {
  for (const value of ['Rivertown High School', '95.0', '2027', '', 'a=b']) {
    assert.equal(needsFormulaGuard(value), false, value);
    assert.equal(guardCell(value), value);
  }
});

test('the formula guard survives quoting and reaches the written file', () => {
  const written = formatCsv(['school', 'notes'], [{ school: '=cmd|calc', notes: '-2+3' }]);
  const rows = parseCsv(written);
  assert.equal(rows[1][0], "'=cmd|calc");
  assert.equal(rows[1][1], "'-2+3");
  assert.doesNotMatch(written, /(^|,)=cmd/m);
});

test('a dangerous value survives the import unchanged and is guarded only on the way out', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, rawCsvOf([{ ...CLEAN_ROW, school: '=HYPERLINK("http://x","click")', notes: '@evil' }]));
  const result = importProspects({ input, asOf: AS_OF });
  assert.equal(result.staged[0].school, '=HYPERLINK("http://x","click")', 'the canonical value is unchanged in memory');
  assert.deepEqual(result.staged[0].staging_formula_guarded.split(';').sort(), ['notes', 'school']);

  const files = writeStaging(result, path.join(dir, 'out'));
  const written = parseCsv(fs.readFileSync(files[0].file, 'utf8'));
  const school = written[1][written[0].indexOf('school')];
  assert.equal(school, '\'=HYPERLINK("http://x","click")');
  assert.doesNotMatch(fs.readFileSync(files[0].file, 'utf8'), /(^|,)"?=HYPERLINK/m);
}));

test('quoteCell only quotes what needs it', () => {
  assert.equal(quoteCell('plain'), 'plain');
  assert.equal(quoteCell('a,b'), '"a,b"');
  assert.equal(quoteCell('say "hi"'), '"say ""hi"""');
});

/* ------------------------------------------------------------------ privacy */

test('an email address is never printed in full', () => {
  assert.equal(maskEmail('rhorton@conroeisd.net'), 'r***@***.net');
  assert.equal(maskEmail('christopher.yee@leanderisd.org'), 'c***@***.org');
  assert.equal(maskEmail(''), '');
  assert.equal(maskEmail('not-an-address'), '***');
});

test('the console summary of the real file prints no address and no local part', () => {
  const output = execFileSync(process.execPath, [CLI, '--dry-run', '--as-of', AS_OF], { encoding: 'utf8' });
  assert.doesNotMatch(output, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(output, /rhorton|christopher\.yee/);
});

/* ------------------------------------------------------------------ evidence-missing */

test('a row with no source_url is quarantined as evidence-missing and drops to tier 5', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, source_urls: '' });
  assert.ok(verdict.reasons.includes(REASONS.EVIDENCE_MISSING));
  assert.match(verdict.detail, /every row carries at least one source URL/);
  assert.equal(verdict.tier, 5);
  assert.match(verdict.neededFor, /at least one source URL/);
});

test('a row that has a source_url is not quarantined for evidence-missing', () => {
  assert.ok(!classifyOne(CLEAN_ROW).reasons.includes(REASONS.EVIDENCE_MISSING));
});

/* ------------------------------------------------------------------ A06 identity */

test('a blank state quarantines the row as A06 identity-ambiguous', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, state: '' });
  assert.ok(verdict.reasons.includes(REASONS.A06));
  assert.match(verdict.detail, /No state/);
  assert.equal(verdict.tier, 5);
});

test('one school name in two states quarantines both rows and names the other state', () => {
  const [left, right] = classifyAll([
    { ...CLEAN_ROW, school: 'Lincoln High School', state: 'CA', city: 'Stockton' },
    { ...CLEAN_ROW, school: 'Lincoln High School', state: 'TX', city: 'Dallas' }
  ]);
  assert.ok(left.reasons.includes(REASONS.A06));
  assert.ok(right.reasons.includes(REASONS.A06));
  assert.match(left.detail, /also appears with state TX/);
  assert.match(right.detail, /also appears with state CA/);
});

test('a stateless row and a known same-named row are both flagged, blank shown as blank', () => {
  const [stateless, known] = classifyAll([
    { ...CLEAN_ROW, school: 'Westlake High School', state: '', city: '' },
    { ...CLEAN_ROW, school: 'Westlake High School', state: 'TX', city: 'Austin' }
  ]);
  assert.ok(stateless.reasons.includes(REASONS.A06));
  assert.match(known.detail, /also appears with state \(blank\)/);
});

test('two rows with the same name in the same state are not A06 on that basis alone', () => {
  const verdicts = classifyAll([
    { ...CLEAN_ROW, school: 'Central High School', state: 'GA' },
    { ...CLEAN_ROW, school: 'Central High School', state: 'GA' }
  ]);
  for (const verdict of verdicts) assert.ok(!verdict.reasons.includes(REASONS.A06));
});

test('name matching ignores case, punctuation and spacing', () => {
  const index = buildNameIndex([{ school: "O'Fallon  Township High School" }]);
  assert.ok(index.has('ofallon township high school'));
});

/* ------------------------------------------------------------------ A07 cross-school */

test('a district that names another state than the row is A07 cross-school-enrichment', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, district: 'Springfield Schools, Wisconsin' });
  assert.ok(verdict.reasons.includes(REASONS.A07));
  assert.match(verdict.detail, /states WI but the row places Rivertown in OH/);
});

test('a school_url host that states another state than the row is A07', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, school_url: 'https://rhs.rivertown.k12.wi.us/' });
  assert.ok(verdict.reasons.includes(REASONS.A07));
  assert.match(verdict.detail, /school_url host states WI/);
});

test('a district name ending in SD is not read as South Dakota', () => {
  assert.equal(stateFromDistrict('Parkland SD'), '');
  assert.equal(stateFromDistrict('Downingtown Area SD'), '');
  assert.equal(stateFromDistrict('Milwaukee, Wisconsin'), 'WI');
  assert.ok(!classifyOne({ ...CLEAN_ROW, district: 'Parkland SD', school_url: '' }).reasons.includes(REASONS.A07));
});

test('a school_url whose domain matches neither district nor school nor city is A07', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, district: 'Louisburg', school_url: 'http://www.usd416.org' });
  assert.ok(verdict.reasons.includes(REASONS.A07));
  assert.match(verdict.detail, /shares no name with the district "Louisburg"/);
});

test('a school_url that is the district site standing in for the school is A07', () => {
  const verdict = classifyOne({
    ...CLEAN_ROW, school: 'Pulaski High School', city: 'Pulaski', state: 'WI',
    district: 'Milwaukee School District', school_url: 'http://www.milwaukee.k12.wi.us'
  });
  assert.ok(verdict.reasons.includes(REASONS.A07));
  assert.match(verdict.detail, /standing in for the school's/);
});

test('two different districts under one public suffix are not treated as the same domain', () => {
  /* Audit A07: the legacy _domain() reduced a.k12.tx.us and b.k12.tx.us to tx.us. */
  assert.equal(urlCorroborates('http://alpha.k12.tx.us', 'Beta ISD'), false);
  assert.equal(urlCorroborates('http://alpha.k12.tx.us', 'Alpha ISD'), true);
  const verdict = classifyOne({
    ...CLEAN_ROW, school: 'Beta High School', city: 'Beta', state: 'TX',
    district: 'Beta ISD', school_url: 'http://alpha.k12.tx.us'
  });
  assert.ok(verdict.reasons.includes(REASONS.A07));
});

test('a district page path that names the school corroborates the row', () => {
  assert.ok(urlCorroborates('https://www.okaloosaschools.com/o/niceville', 'Niceville High School'));
  assert.ok(!classifyOne({
    ...CLEAN_ROW, school: 'Niceville High School', city: 'Niceville', state: 'FL',
    district: 'OKALOOSA', school_url: 'https://www.okaloosaschools.com/o/niceville'
  }).reasons.includes(REASONS.A07));
});

test('an acronym subdomain and a truncated k12 domain both count as corroboration', () => {
  assert.ok(urlCorroborates('https://cphs.leanderisd.org/', 'Cedar Park High School'));
  assert.ok(urlCorroborates('http://www.albertk12.org', 'Albertville City'));
  assert.ok(urlCorroborates('http://www.oths.us', "O'Fallon Township High School"));
  assert.ok(urlCorroborates('http://www.lee.k12.al.us', 'Lee County'));
});

test('words that identify a school are not discarded as generic', () => {
  assert.ok(urlCorroborates('http://www.unionps.org/', 'Union High School'));
  assert.ok(urlCorroborates('https://airacademy.asd20.org/', 'Air Academy'));
  assert.ok(namesOverlap('Carmel Clay Schools', 'Carmel'));
  assert.ok(!namesOverlap('Milwaukee School District', 'Pulaski'));
});

test('a row with no district or no school_url is not A07 on the domain test', () => {
  assert.ok(!classifyOne({ ...CLEAN_ROW, district: '', school_url: 'http://anything.example' }).reasons.includes(REASONS.A07));
  assert.ok(!classifyOne({ ...CLEAN_ROW, district: 'Somewhere ISD', school_url: '' }).reasons.includes(REASONS.A07));
});

test('stateFromHost only reads a real two-letter state from a .us host', () => {
  assert.equal(stateFromHost('www.milwaukee.k12.wi.us'), 'WI');
  assert.equal(stateFromHost('www.example.org'), '');
  assert.equal(stateFromHost('www.example.zz.us'), '');
  assert.equal(hostOf('http://www.lisd.net/fmhs'), 'www.lisd.net');
  assert.equal(hostOf('not a url'), '');
});

/* ------------------------------------------------------------------ A02 contact role */

test('any director_email is quarantined A02 while the schema records no role', () => {
  const verdict = classifyOne({
    ...CLEAN_ROW, director_name: 'A Person', director_email: 'person@rivertown.k12.oh.us',
    source_urls: 'https://rhs.rivertown.k12.oh.us/staff'
  });
  assert.ok(verdict.reasons.includes(REASONS.A02));
  assert.match(verdict.detail, /records no role for the detail/);
  assert.match(verdict.detail, /p\*\*\*@\*\*\*\.us/);
  assert.doesNotMatch(verdict.detail, /person@rivertown/);
});

test('an email cited only to an organizer archive fails the primary-page half too', () => {
  const verdict = classifyOne({
    ...CLEAN_ROW, director_email: 'person@example.com',
    source_urls: 'https://en.wikipedia.org/wiki/Rose_Parade_marching_bands'
  });
  assert.match(verdict.detail, /no cited source_url is a school, district or booster page/);
});

test('a primary page plus an explicitly recorded role clears A02', () => {
  const verdict = classifyOne({
    ...CLEAN_ROW, director_email: 'person@rivertown.k12.oh.us',
    source_urls: 'https://rhs.rivertown.k12.oh.us/staff',
    notes: 'role: Head Band Director, Rivertown High School'
  });
  assert.ok(!verdict.reasons.includes(REASONS.A02));
});

test('a row with no email is never quarantined for A02', () => {
  assert.ok(!classifyOne(CLEAN_ROW).reasons.includes(REASONS.A02));
});

test('school, district and booster hosts are recognized; archives and news are not', () => {
  for (const host of ['cphs.leanderisd.org', 'www.milwaukee.k12.wi.us', 'band.example.edu', 'wandobands.org']) {
    assert.ok(isPrimaryContactHost(host), host);
  }
  for (const host of ['en.wikipedia.org', 'marching.musicforall.org', 'www.cbsnews.com', '']) {
    assert.ok(!isPrimaryContactHost(host), host);
  }
});

/* ------------------------------------------------------------------ A08 inferred years */

test('an appearance that rests on a news headline is quarantined A08', () => {
  const verdict = classifyOne({
    ...CLEAN_ROW, school: 'Biloxi High School', city: 'Biloxi', state: 'MS', district: '',
    school_url: '', parades: 'Philadelphia 2018; Philadelphia 2017', parades_marched: '2',
    last_appearance: '2018', notes: 'news: named in local coverage of Philadelphia 2017; no band page found'
  });
  assert.ok(verdict.reasons.includes(REASONS.A08));
  assert.match(verdict.detail, /"Philadelphia 2017" rests on a news headline/);
  assert.match(verdict.detail, /assigns the previous year to a January-March article/);
  assert.match(verdict.detail, /news_east\.py/);
});

test('an appearance with no stated year at all is quarantined A08', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, parades: 'Rose 2019; Hollywood', parades_marched: '2' });
  assert.ok(verdict.reasons.includes(REASONS.A08));
  assert.match(verdict.detail, /carry no stated year/);
});

test('a last_appearance that no listed event supports is quarantined A08', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, last_appearance: '2021' });
  assert.ok(verdict.reasons.includes(REASONS.A08));
  assert.match(verdict.detail, /last_appearance 2021 is not among the years/);
});

test('years stated by the source are not quarantined A08', () => {
  assert.ok(!classifyOne(CLEAN_ROW).reasons.includes(REASONS.A08));
});

/* ------------------------------------------------------------------ A09 overstated evidence */

test('a competition placement counted as a parade is quarantined A09', () => {
  const verdict = classifyOne({
    ...CLEAN_ROW, parades: 'BOA Grand National Finalist 2024; Rose 2019',
    parades_marched: '2', last_appearance: '2024'
  });
  assert.ok(verdict.reasons.includes(REASONS.A09));
  assert.match(verdict.detail, /counts 1 competition placement/);
  assert.match(verdict.detail, /last_appearance 2024 names only a competition placement/);
});

test('a future invitation counted as an appearance is quarantined A09', () => {
  const verdict = classifyOne({
    ...CLEAN_ROW, parades: 'Rose 2027', parades_marched: '1', last_appearance: '2027'
  });
  assert.ok(verdict.reasons.includes(REASONS.A09));
  assert.match(verdict.detail, /not yet held as of 2026-09-17 \("Rose 2027"\)/);
  assert.match(verdict.detail, /an invitation is not an appearance/);
});

test('"future" is judged against --as-of, not against a frozen year', () => {
  const row = { ...CLEAN_ROW, parades: "Macy's 2026", parades_marched: '1', last_appearance: '2026' };
  assert.ok(classifyOne(row, '2026-09-17').reasons.includes(REASONS.A09), 'November 2026 is future in September 2026');
  assert.ok(!classifyOne(row, '2026-12-01').reasons.includes(REASONS.A09), 'and past in December 2026');
});

test('a Rose parade is judged against January, not the end of its year', () => {
  assert.equal(isHeldBy(parseAppearance('Rose 2026'), new Date('2026-09-17T00:00:00Z')), true);
  assert.equal(isHeldBy(parseAppearance("Macy's 2026"), new Date('2026-09-17T00:00:00Z')), false);
  assert.equal(parseAppearance('BOA Grand National Finalist 2024').spec.kind, 'competition');
  assert.equal(parseAppearance('Rose 2019').spec.kind, 'parade');
});

test('an unrecognized event cannot be counted as a completed parade', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, parades: 'Some Other Parade 2015', parades_marched: '1', last_appearance: '2015' });
  assert.ok(verdict.reasons.includes(REASONS.A09));
  assert.match(verdict.detail, /name no event this importer can classify/);
});

test('a parades_marched that does not match its own list is quarantined A09', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, parades_marched: '7' });
  assert.ok(verdict.reasons.includes(REASONS.A09));
  assert.match(verdict.detail, /parades_marched is 7 but the row lists 2 appearance entries/);
});

test('a non-numeric parades_marched is reported rather than coerced', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, parades_marched: 'many' });
  assert.ok(verdict.reasons.includes(REASONS.A09));
  assert.match(verdict.detail, /"many" is not a number/);
});

test('completed parades counted correctly are not quarantined A09', () => {
  assert.ok(!classifyOne(CLEAN_ROW).reasons.includes(REASONS.A09));
});

/* ------------------------------------------------------------------ staging shape and invariants */

test('every original field is preserved verbatim beside the staging fields', () => withTempDir(dir => {
  const row = { ...CLEAN_ROW, notes: 'a note, with a comma and "quotes"\nand a newline', booster_org: 'Rivertown Band Boosters' };
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, csvOf([row]));
  const result = importProspects({ input, asOf: AS_OF });
  for (const column of COLUMNS) assert.equal(result.staged[0][column], row[column] ?? '', column);
  for (const column of STAGING_COLUMNS) assert.ok(column in result.staged[0], column);
  assert.deepEqual(result.columns, [...COLUMNS, ...STAGING_COLUMNS]);

  const files = writeStaging(result, path.join(dir, 'out'));
  const round = parseCsv(fs.readFileSync(files[0].file, 'utf8'));
  const back = Object.fromEntries(round[0].map((name, i) => [name, round[1][i]]));
  assert.equal(back.notes, row.notes, 'quotes, commas and newlines survive the round trip');
}));

test('nothing imports clean: no row is ever CRM-ready or customer-safe, on any input', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, csvOf([
    CLEAN_ROW,
    { ...CLEAN_ROW, school: 'Lincoln High School', state: 'CA' },
    { ...CLEAN_ROW, school: 'Lincoln High School', state: 'TX' },
    { ...CLEAN_ROW, director_email: 'person@rivertown.k12.oh.us', notes: 'role: Head Band Director' }
  ]));
  const result = importProspects({ input, asOf: AS_OF });
  assert.equal(result.rowsRead, 4);
  for (const row of result.staged) {
    assert.equal(row.crm_ready, 'no');
    assert.equal(row.customer_safe, 'no');
    assert.match(row.crm_blocked_reason, /crm\.gating/);
    assert.ok(['quarantined', 'staged-for-review'].includes(row.import_status));
    assert.notEqual(row.import_status, 'ready');
    assert.ok([3, 5].includes(Number(row.evidence_tier)), 'tier 1 is customer-safe and is never reachable here');
  }
  /* Even the row that clears every defect class, and the one whose contact role is recorded,
     stays held back — the legacy CSV records no permission to contact and no relationship owner. */
  const clean = result.staged.find(row => row.import_status === 'staged-for-review');
  assert.ok(clean, 'the fixture includes a row no rule fires on');
  assert.equal(clean.crm_ready, 'no');
}));

test('each row carries a tier with what that tier requires actually filled in', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, csvOf([CLEAN_ROW, { ...CLEAN_ROW, state: '' }]));
  const result = importProspects({ input, asOf: AS_OF });
  const [tier3, tier5] = result.staged;
  assert.equal(tier3.evidence_tier, '3');
  assert.equal(tier3.evidence_requires, 'basis');
  assert.ok(tier3.evidence_basis.length > 0);
  assert.equal(tier5.evidence_tier, '5');
  assert.equal(tier5.evidence_requires, 'needed_for');
  assert.ok(tier5.evidence_needed_for.length > 0);
}));

test('the four blurred entity layers are named on the row', () => {
  assert.equal(entityLayersPresent(CLEAN_ROW), 'account;unit;opportunity');
  assert.equal(entityLayersPresent({ ...CLEAN_ROW, director_email: 'x@y.us' }), 'account;unit;contact;opportunity');
  assert.equal(entityLayersPresent({ school: 'X', band_name: '', parades: '' }), 'account');
});

test('a reason is reported once per row, in a stable order', () => {
  const verdict = classifyOne({
    ...CLEAN_ROW, state: '', source_urls: '', director_email: 'x@example.com',
    parades: 'Rose 2027', parades_marched: '3', last_appearance: '2031',
    district: 'Elsewhere, Wisconsin'
  });
  assert.deepEqual(verdict.reasons, REASON_ORDER.filter(code => verdict.reasons.includes(code)));
  assert.equal(new Set(verdict.reasons).size, verdict.reasons.length);
  assert.equal(verdict.importStatus, 'quarantined');
});

test('a short row is padded rather than shifted, and loses its evidence honestly', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, `${COLUMNS.join(',')}\nShort High School,Band,Shorttown,OH\n`);
  const result = importProspects({ input, asOf: AS_OF });
  assert.equal(result.staged[0].school, 'Short High School');
  assert.equal(result.staged[0].state, 'OH');
  assert.equal(result.staged[0].source_urls, '');
  assert.match(result.staged[0].quarantine_reasons, /evidence-missing/);
}));

/* ------------------------------------------------------------------ read-only guarantee */

test('the source CSV is opened read-only and is byte-identical afterwards', () => {
  const before = fs.readFileSync(REAL_CSV);
  const beforeStat = fs.statSync(REAL_CSV);
  execFileSync(process.execPath, [CLI, '--dry-run', '--as-of', AS_OF], { encoding: 'utf8' });
  withTempDir(dir => {
    execFileSync(process.execPath, [CLI, '--out-dir', path.join(dir, 'out'), '--as-of', AS_OF], { encoding: 'utf8' });
  });
  assert.deepEqual(fs.readFileSync(REAL_CSV), before);
  assert.equal(fs.statSync(REAL_CSV).mtimeMs, beforeStat.mtimeMs);
});

test('a read-only source file can still be imported', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, csvOf([CLEAN_ROW]));
  fs.chmodSync(input, 0o444);
  const result = importProspects({ input, asOf: AS_OF });
  assert.equal(result.rowsRead, 1);
  assert.equal(readSourceCsv(input).startsWith('school,'), true);
  fs.chmodSync(input, 0o644);
}));

test('the write guard refuses the source data, the tracked outputs and the rest of the repository', () => {
  assert.throws(() => assertWritableTarget(REAL_CSV), /Refusing to write into data\//);
  assert.throws(() => assertWritableTarget(path.join(repoRoot, 'data')), /Refusing to write into data\//);
  assert.throws(() => assertWritableTarget(path.join(repoRoot, 'pipeline', 'out')), /Refusing to write into pipeline\/out\//);
  assert.throws(() => assertWritableTarget(path.join(repoRoot, 'pipeline', 'out', 'troen-carnegie-2027-03-03', 'x.csv')), /pipeline\/out\//);
  assert.throws(() => assertWritableTarget(path.join(repoRoot, 'pipeline', '..', 'data', 'x.csv')), /Refusing to write into data\//);
  assert.throws(() => assertWritableTarget(path.join(repoRoot, 'pipeline', 'cases', 'x.csv')), /pipeline\/cases\//);
  assert.throws(() => assertWritableTarget(path.join(repoRoot, 'scripts', 'x.csv')), /scripts\//);
  assert.throws(() => assertWritableTarget(path.join(repoRoot, 'demo', 'x.csv')), /except pipeline\//);
  assert.throws(() => assertWritableTarget(path.join(repoRoot, 'AGENTS.md')), /except pipeline\//);
  assert.equal(assertWritableTarget(path.join(repoRoot, 'pipeline', 'out-staging', 'x.csv')),
    path.join(repoRoot, 'pipeline', 'out-staging', 'x.csv'));
});

test('an out-dir pointing into a protected directory writes nothing at all', () => {
  const stagingBefore = fs.readdirSync(path.join(repoRoot, 'pipeline', 'out'));
  assert.throws(() => writeStaging({ columns: [], staged: [], quarantine: [] }, path.join(repoRoot, 'pipeline', 'out')), /Refusing to write/);
  assert.deepEqual(fs.readdirSync(path.join(repoRoot, 'pipeline', 'out')), stagingBefore);
});

/* ------------------------------------------------------------------ CLI */

test('--dry-run writes no file', () => withTempDir(dir => {
  const out = path.join(dir, 'out');
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, csvOf([CLEAN_ROW]));
  const code = main(['--dry-run', '--input', input, '--out-dir', out, '--as-of', AS_OF]);
  assert.equal(code, 0);
  assert.equal(fs.existsSync(out), false);
}));

test('--limit stages only the first N rows but still sees the whole file for identity', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, csvOf([
    { ...CLEAN_ROW, school: 'Lincoln High School', state: 'CA' },
    { ...CLEAN_ROW, school: 'Filler High School', state: 'OH' },
    { ...CLEAN_ROW, school: 'Lincoln High School', state: 'TX' }
  ]));
  const result = importProspects({ input, limit: 1, asOf: AS_OF });
  assert.equal(result.rowsRead, 1);
  assert.equal(result.rowsInFile, 3);
  assert.match(result.staged[0].quarantine_reasons, /A06/);
  assert.match(result.staged[0].quarantine_detail, /also appears with state TX/);
}));

test('--limit 0 stages nothing and a bad --limit is rejected', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, csvOf([CLEAN_ROW]));
  assert.equal(importProspects({ input, limit: 0, asOf: AS_OF }).rowsRead, 0);
  assert.throws(() => importProspects({ input, limit: -1, asOf: AS_OF }), /non-negative/);
  assert.throws(() => importProspects({ input, limit: 'x', asOf: AS_OF }), /non-negative/);
}));

test('a bad --as-of is rejected rather than silently becoming today', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, csvOf([CLEAN_ROW]));
  assert.throws(() => importProspects({ input, asOf: 'not-a-date' }), /not a date/);
}));

test('argument parsing accepts the documented flags and refuses anything else', () => {
  assert.deepEqual(parseArgs(['--dry-run', '--limit', '25']), { dryRun: true, limit: 25 });
  assert.deepEqual(parseArgs(['--as-of', '2026-09-17']), { dryRun: false, asOf: '2026-09-17' });
  assert.throws(() => parseArgs(['--nope']), /Unknown option/);
  assert.throws(() => parseArgs(['--limit']), /needs a value/);
});

test('the CLI exits non-zero on a usage error and zero on a normal run', () => withTempDir(dir => {
  assert.equal(main(['--nope']), 2);
  assert.equal(main(['--input', path.join(dir, 'missing.csv')]), 1);
  assert.equal(main(['--help']), 0);
}));

/* ------------------------------------------------------------------ the real file */

test('the real prospects.csv stages non-trivially, and every row is held back', () => withTempDir(dir => {
  const result = importProspects({ input: REAL_CSV, asOf: AS_OF });
  assert.equal(result.rowsInFile, 206, 'the audited baseline is 206 rows');
  assert.equal(result.rowsRead, 206);
  assert.ok(result.rowsQuarantined > 50, `expected a substantial quarantine, got ${result.rowsQuarantined}`);
  assert.ok(result.rowsQuarantined < result.rowsInFile, 'and not a blanket quarantine of everything');

  /* Each defect class the audit found in this file actually fires. evidence-missing is expected
     to be zero: the audit records a source URL on all 206 rows. */
  for (const code of [REASONS.A02, REASONS.A06, REASONS.A07, REASONS.A08, REASONS.A09]) {
    assert.ok(result.byReason.get(code) > 0, `${code} never fired`);
  }
  assert.equal(result.byReason.get(REASONS.EVIDENCE_MISSING), 0);

  /* The audit's own baseline: 37 rows without a state, 2 director emails. */
  assert.equal(result.byTier.get(5), 37);
  /* 5 director names, 2 emails and 1 phone, spread over 6 rows: every recorded contact detail is
     held back, because the schema records no role for any of them. */
  assert.equal(result.byReason.get(REASONS.A02), 6);
  assert.equal(result.staged.filter(row => row.director_name).length, 5);
  assert.equal(result.staged.filter(row => row.director_email).length, 2);
  assert.equal(result.staged.filter(row => row.director_phone).length, 1);

  for (const row of result.staged) {
    assert.equal(row.crm_ready, 'no');
    assert.equal(row.customer_safe, 'no');
  }

  /* Rows the audit names by hand land in the right bucket. */
  const find = name => result.staged.find(row => row.school === name);
  assert.match(find('Pulaski High School').quarantine_reasons, /A07/);
  assert.match(find('The Woodlands High School').quarantine_reasons, /A02/);
  assert.match(find('Biloxi High School').quarantine_reasons, /A08/);
  assert.match(find('Timber Creek High School').quarantine_reasons, /A09/);
  assert.match(find('Clovis High School').quarantine_reasons, /A09/);
  assert.match(find('Homestead High School').quarantine_reasons, /A06/);

  const files = writeStaging(result, path.join(dir, 'out'));
  assert.equal(files.length, 2);
  const quarantine = parseCsv(fs.readFileSync(files[1].file, 'utf8'));
  assert.equal(quarantine.length - 1, result.rowsQuarantined);
  const reasonColumn = quarantine[0].indexOf('quarantine_reasons');
  for (const row of quarantine.slice(1)) assert.ok(row[reasonColumn].length > 0);
}));

test('the CLI run against the real file reports rows read, staged and quarantined by reason', () => withTempDir(dir => {
  const output = execFileSync(process.execPath,
    [CLI, '--limit', '25', '--out-dir', path.join(dir, 'out'), '--as-of', AS_OF], { encoding: 'utf8' });
  assert.match(output, /rows read\s+25 \(of 206 in the file\)/);
  assert.match(output, /rows staged for review\s+\d+/);
  assert.match(output, /rows quarantined\s+\d+/);
  for (const code of REASON_ORDER) assert.ok(output.includes(code), `${code} missing from the summary`);
  assert.match(output, /crm-ready rows\s+0/);
  assert.equal(fs.readdirSync(path.join(dir, 'out')).sort().join(','), 'prospects-quarantine.csv,prospects-staging.csv');
}));

/* ------------------------------------------------------------------ regressions from review */

test('a director name with no address is held back for the same unverified role', () => {
  const verdict = classifyOne({
    ...CLEAN_ROW, director_name: 'Robert Horton',
    source_urls: 'https://www.conroeisd.net/o/cisd/page/fine-arts'
  });
  assert.ok(verdict.reasons.includes(REASONS.A02));
  assert.match(verdict.detail, /director_name "Robert Horton"/);
  assert.equal(verdict.importStatus, 'quarantined');
});

test('a phone alone is held back too', () => {
  assert.ok(classifyOne({ ...CLEAN_ROW, director_phone: '936-709-7832' }).reasons.includes(REASONS.A02));
});

test('a state name used as a place name in a district is not read as that state', () => {
  /* Indiana Area School District is in Pennsylvania; Oregon City School District is in Ohio. */
  for (const district of ['Kansas City Public Schools', 'Washington County Schools',
    'Indiana Area School District', 'Oregon City School District', 'Virginia Beach City Public Schools']) {
    assert.equal(stateFromDistrict(district), '', district);
  }
  assert.equal(stateFromDistrict('Milwaukee, Wisconsin'), 'WI');
  assert.ok(!classifyOne({ ...CLEAN_ROW, district: 'Indiana Area School District', school_url: '' }).reasons.includes(REASONS.A07));
});

test('a two-letter initialism is not enough to make a domain corroborate a district', () => {
  /* ccisd.net is Clear Creek ISD in Texas; it must not stand as evidence for Carmel Clay. */
  assert.equal(urlCorroborates('https://www.ccisd.net', 'Carmel Clay Schools'), false);
  assert.equal(urlCorroborates('https://www.nisd.net', 'North East ISD'), false);
  assert.equal(urlCorroborates('https://www.ccs.k12.in.us', 'Carmel Clay Schools'), true, 'an exact three-letter label still counts');
  const verdict = classifyOne({
    ...CLEAN_ROW, school: 'Carmel High School', city: 'Carmel', state: 'IN',
    district: 'Carmel Clay Schools', school_url: 'https://www.ccisd.net'
  });
  assert.ok(verdict.reasons.includes(REASONS.A07));
});

test('a row with no school name is quarantined, not quietly staged for review', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, school: '' });
  assert.ok(verdict.reasons.includes(REASONS.A06));
  assert.match(verdict.detail, /No school name/);
  assert.equal(verdict.importStatus, 'quarantined');
  assert.equal(verdict.tier, 5);
});

test('a last_appearance with no appearance list at all is still checked', () => {
  const verdict = classifyOne({ ...CLEAN_ROW, parades: '', parades_marched: '', last_appearance: '2024' });
  assert.ok(verdict.reasons.includes(REASONS.A08));
  assert.match(verdict.detail, /the row lists no appearance at all/);
});

test('a line with more fields than the header is quarantined instead of silently truncated', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, `${COLUMNS.join(',')}\n${COLUMNS.map(() => 'x').join(',')},LOSTVALUE\n`);
  const result = importProspects({ input, asOf: AS_OF });
  assert.match(result.staged[0].quarantine_reasons, /A06/);
  assert.match(result.staged[0].quarantine_detail, /"LOSTVALUE" could not be placed/);
  assert.match(result.staged[0].quarantine_detail, /22 fields where the header has 21/);
}));

test('a blank line is not counted or staged as a phantom row', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  const line = csvOf([CLEAN_ROW]).split('\n')[1];
  fs.writeFileSync(input, `${COLUMNS.join(',')}\n${line}\n\n${line}\n`);
  const result = importProspects({ input, asOf: AS_OF });
  assert.equal(result.rowsInFile, 2);
  assert.equal(result.staged.length, 2);
  for (const row of result.staged) assert.equal(row.school, CLEAN_ROW.school);
  assert.deepEqual(result.staged.map(row => row.staging_source_row), ['2', '4']);
}));

test('a staging file cannot be re-imported into itself', () => withTempDir(dir => {
  const input = path.join(dir, 'in.csv');
  fs.writeFileSync(input, csvOf([CLEAN_ROW]));
  const files = writeStaging(importProspects({ input, asOf: AS_OF }), path.join(dir, 'out'));
  assert.throws(() => importProspects({ input: files[0].file, asOf: AS_OF }), /already carries staging columns/);
}));
