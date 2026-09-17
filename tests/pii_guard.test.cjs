/* Tests for scripts/check-pii.cjs.

   Every value here is invented. Numbers use the 555-01xx range reserved for fiction, mailboxes
   use the reserved example.com/.test domains, and names are obviously constructed. Nothing in
   this file is a real person, mailbox or number — which is the rule the guard itself enforces. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const guard = require('../scripts/check-pii.cjs');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'check-pii.cjs');
const REAL_TRIP = 'pipeline/trip/trips/west-henderson-chattanooga-2027-04-08.trip.json';

/* Build a throwaway directory, run the body against it, and always remove it. */
function withTempDir(prefix, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return body(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeFixture(dir, name, contents) {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  return file;
}

/* Scan one written fixture with the library, bypassing the default scope. */
function scanFixture(dir, name, contents, extra = {}) {
  writeFixture(dir, name, contents);
  const options = guard.parseArgs(['--include', path.join(dir, name), ...(extra.argv || [])]);
  return guard.scan(options);
}

const rulesOf = result => result.findings.map(finding => finding.rule).sort();

/* Run the cli itself, so exit codes and the printed report are covered too. */
const run = args => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });

/* ------------------------------------------------------------------ each pattern is caught */

test('every required US phone format is caught', () => {
  const formats = {
    'parenthesised.md': '(706) 555-0142',
    'dashed.md': '706-555-0142',
    'dotted.md': '706.555.0142',
    'compact.md': '7065550142',
    'spaced.md': '423 555 0188',
    'country-code.md': '+1 706-555-0142',
    'extension-x.md': '706-555-0142 x1234',
    'extension-word.md': '(423) 555-0188 ext. 77'
  };
  withTempDir('pii-phones-', dir => {
    for (const [name, value] of Object.entries(formats)) {
      const result = scanFixture(dir, name, `Direct line: ${value}\n`);
      assert.deepEqual(rulesOf(result), [guard.RULES.PHONE], `${name} (${value}) was not caught`);
    }
  });
});

test('an email address is caught, including a subdomain and a plus tag', () => {
  withTempDir('pii-email-', dir => {
    for (const address of ['someone@example.com', 'first.last+tag@mail.example.co.uk']) {
      const result = scanFixture(dir, 'note.md', `Write to ${address}\n`);
      assert.deepEqual(rulesOf(result), [guard.RULES.EMAIL], `${address} was not caught`);
    }
  });
});

test('a finding reports file, line, column, rule and a masked match', () => {
  withTempDir('pii-report-', dir => {
    const result = scanFixture(dir, 'deep/note.md', 'line one\nline two\nreach me at someone@example.com\n');
    assert.equal(result.findings.length, 1);
    const [finding] = result.findings;
    assert.equal(finding.line, 3);
    assert.equal(finding.column, 13);
    assert.equal(finding.rule, guard.RULES.EMAIL);
    assert.equal(guard.maskMatch(finding.match), 'so***************om');
    /* The tool must not print the thing it protects. */
    assert.doesNotMatch(guard.maskMatch(finding.match), /example\.com/);
  });
});

/* ------------------------------------------------- legitimate content is NOT flagged */

test('business names and published group-sales channels are kept, not flagged', () => {
  const kept = [
    'Rock City, Ruby Falls, the Incline Railway, Young Transportation, Tennessee Aquarium.',
    'Roles: the director, Group sales, Tour manager, Troen coordinator, Group reservations.',
    'Channels: group charter line, group sales form, group dining enquiries, group bookings.',
    'Handled from the same group-sales office as the riverboat.'
  ].join('\n');
  withTempDir('pii-kept-', dir => {
    const result = scanFixture(dir, 'kept.md', `${kept}\n`);
    assert.deepEqual(result.findings, [], 'a business name or channel was flagged');
  });
});

test('dates, times, prices and identifiers are not mistaken for phone numbers', () => {
  const benign = [
    'Travel 2027-04-08 to 2027-04-11, prepared 2026-09-17.',
    'Departs 07:15, returns 21:45, checked 2026-09-11 10:30.',
    'Quad 1099, double 1249, deposit 500, total $1,234.56 per person.',
    'Quote reference QS-48398, source HW-COVER, token QS7065550142.',
    'Tiers 80 / 90 / 100 with a minimum of 20 paying travellers.',
    'Table row: | 250 | 300 | 1200 | 4000 |',
    'Version 1.2.3, build 10.11.2024, run 70655501429999.',
    'A CSV cell must not begin with =+@- per the render rules.'
  ].join('\n');
  withTempDir('pii-benign-', dir => {
    const result = scanFixture(dir, 'benign.md', `${benign}\n`);
    assert.deepEqual(result.findings, [], `benign text was flagged: ${JSON.stringify(result.findings)}`);
  });
});

test('a price run on a money line is not a phone number, but a bare run still is', () => {
  withTempDir('pii-money-', dir => {
    const priced = scanFixture(dir, 'priced.md', 'Room rates 495 550 1099 per person.\n');
    assert.deepEqual(priced.findings, [], 'a priced number run was reported as a phone number');
    const bare = scanFixture(dir, 'bare.md', 'Call 423 555 0188 before noon.\n');
    assert.deepEqual(rulesOf(bare), [guard.RULES.PHONE]);
  });
});

test('a real number on an itinerary line is still caught, money cue or not', () => {
  /* The harmful direction: a supplier line naming rooms, tickets or rates is exactly where a
     direct number appears, so those words must never suppress a match. */
  const lines = [
    'Rooms: group reservations 423 555 0188, ask for the group rate.',
    'Tickets: call 706 555 0142 for the group sales desk.',
    'Hotel single/double: reach the front desk 706 555 0143.',
    'Deposit 500 paid; the direct line is 706 555 0144.'
  ];
  withTempDir('pii-cue-', dir => {
    lines.forEach((line, index) => {
      const result = scanFixture(dir, `line-${index}.md`, `${line}\n`);
      assert.deepEqual(rulesOf(result), [guard.RULES.PHONE], `suppressed a real number: ${line}`);
    });
  });
});

/* ------------------------------------------------------------- structural contact checks */

const supplierRecord = contacts => JSON.stringify({
  suppliers: [{
    id: 'example-attraction',
    name: 'Example Attraction Company',
    address: '100 Example Ridge Road, Exampleville',
    channel: { kind: 'phone', locator: 'group sales line' },
    candidates: [{ name: 'Example Alternate Venue', status: 'considered' }],
    venue_variants: [{ name: 'Example Attraction Main Gate' }],
    contacts
  }]
}, null, 2);

test('a business name on a supplier, venue or candidate is kept; a name on a contact is not', () => {
  withTempDir('pii-structural-', dir => {
    const clean = scanFixture(dir, 'clean.trip.json',
      supplierRecord([{ role: 'Group sales', channel: 'email' }]));
    assert.deepEqual(clean.findings, [],
      'a supplier, candidate or venue-variant business name was flagged');

    const named = scanFixture(dir, 'named.trip.json',
      supplierRecord([{ name: 'Fictional Examplename', role: 'Group sales' }]));
    assert.deepEqual(rulesOf(named), [guard.RULES.CONTACT_NAME]);
    assert.equal(named.findings[0].jsonPath, 'suppliers[0].contacts[0].name');
  });
});

test('the structural check points at the offending key, not the first key of that name', () => {
  withTempDir('pii-locate-', dir => {
    const record = supplierRecord([
      { role: 'Group sales', channel: 'email' },
      { name: 'Fictional Examplename', role: 'Group sales' }
    ]);
    const result = scanFixture(dir, 'locate.trip.json', record);
    assert.equal(result.findings.length, 1);
    const reported = record.split('\n')[result.findings[0].line - 1];
    /* The line it names must be the contact's name, not the supplier's business name. */
    assert.match(reported, /Fictional Examplename/);
    assert.doesNotMatch(reported, /Example Attraction Company/);
  });
});

test('a personal name field is caught wherever it sits, and a blank one is not', () => {
  withTempDir('pii-namefields-', dir => {
    for (const key of ['full_name', 'first_name', 'last_name', 'contact_name', 'director_name']) {
      const result = scanFixture(dir, `${key}.trip.json`,
        JSON.stringify({ trip: { staffing: [{ role: 'Tour manager', [key]: 'Fictional Leadname' }] } }, null, 2));
      assert.deepEqual(rulesOf(result), [guard.RULES.CONTACT_NAME], `${key} was not caught`);
    }
    /* Blank is correct, and a blank field is not a leak. */
    const blank = scanFixture(dir, 'blank.trip.json',
      JSON.stringify({ suppliers: [{ contacts: [{ role: 'Group sales', name: '' }] }] }, null, 2));
    assert.deepEqual(blank.findings, []);
  });
});

test('a direct line or personal mailbox field is caught structurally', () => {
  withTempDir('pii-direct-', dir => {
    for (const key of ['mobile', 'cell', 'direct_line', 'personal_email']) {
      const result = scanFixture(dir, `${key}.trip.json`,
        JSON.stringify({ suppliers: [{ contacts: [{ role: 'Group sales', [key]: 'withheld-value' }] }] }, null, 2));
      assert.deepEqual(rulesOf(result), [guard.RULES.CONTACT_NAME], `${key} was not caught`);
    }
  });
});

test('a street address on a venue is kept; the same address on a person is not', () => {
  withTempDir('pii-address-', dir => {
    const venue = scanFixture(dir, 'venue.trip.json',
      supplierRecord([{ role: 'Group sales', channel: 'email' }]));
    assert.deepEqual(venue.findings, [], 'a venue address was flagged');

    const person = scanFixture(dir, 'person.trip.json',
      supplierRecord([{ role: 'Group sales', address: '42 Fictional Lane, Apt 7' }]));
    assert.deepEqual(rulesOf(person), [guard.RULES.PERSON_ADDRESS]);
    assert.equal(person.findings[0].jsonPath, 'suppliers[0].contacts[0].address');

    const buried = scanFixture(dir, 'buried.trip.json',
      supplierRecord([{ role: 'Group sales', note: 'Reach at 88 Invented Avenue Suite 3 after hours.' }]));
    assert.deepEqual(rulesOf(buried), [guard.RULES.PERSON_ADDRESS]);

    const homeKey = scanFixture(dir, 'home.trip.json',
      JSON.stringify({ trip: { home_address: '9 Imaginary Court' } }, null, 2));
    assert.deepEqual(rulesOf(homeKey), [guard.RULES.PERSON_ADDRESS]);
  });
});

test('unparseable JSON warns rather than failing, and the text scan still runs', () => {
  withTempDir('pii-badjson-', dir => {
    const result = scanFixture(dir, 'broken.json', 'contact: someone@example.com\n');
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /not valid JSON/);
    assert.deepEqual(rulesOf(result), [guard.RULES.EMAIL]);
    /* The parse error quotes the offending text; the warning must not pass that through. */
    assert.doesNotMatch(result.warnings[0], /someone@example\.com/);
  });
});

test('a personal-name field holding a list is caught, element by element', () => {
  withTempDir('pii-arrays-', dir => {
    const result = scanFixture(dir, 'list.trip.json', JSON.stringify({
      staffing: [{ role: 'Tour manager', full_name: ['Fictional Leadname'] }],
      suppliers: [{ contacts: [{ role: 'Group sales', names: ['Fictional Onename', 'Fictional Twoname'] }] }]
    }, null, 2));
    assert.equal(result.findings.length, 3, 'a name inside an array was missed');
    assert.ok(result.findings.every(finding => finding.rule === guard.RULES.CONTACT_NAME));
  });
});

/* ------------------------------------------------------------------------- allowlist */

test('an allowlist entry suppresses only what it names', () => {
  withTempDir('pii-allow-', dir => {
    const body = 'Group sales: groupsales@example-attraction.test\nDirect: 706-555-0142\n';
    const allowlist = writeFixture(dir, 'allow.txt',
      '# a published group-sales mailbox\ngroupsales@example-attraction.test\n');
    const result = scanFixture(dir, 'case.md', body, { argv: ['--allowlist', allowlist] });
    assert.deepEqual(rulesOf(result), [guard.RULES.PHONE],
      'the allowlist suppressed the direct number, or failed to suppress the mailbox');
  });
});

test('an allowlist entry can be scoped to a path, and can be a digest', () => {
  withTempDir('pii-allow2-', dir => {
    const body = 'Group sales: groupsales@example-attraction.test\n';
    writeFixture(dir, 'kept.md', body);
    writeFixture(dir, 'other.md', body);

    const scoped = writeFixture(dir, 'scoped.txt', '**/kept.md::groupsales@example-attraction.test\n');
    const scopedResult = guard.scan(guard.parseArgs(['--include', dir, '--allowlist', scoped]));
    assert.equal(scopedResult.findings.length, 1, 'the path-scoped entry did not stay scoped');
    assert.match(scopedResult.findings[0].file, /other\.md$/);

    /* The digest form allows a value without writing that value down. */
    const digest = writeFixture(dir, 'digest.txt',
      `sha256:${guard.digestOf('groupsales@example-attraction.test')}\n`);
    const digestResult = guard.scan(guard.parseArgs(['--include', dir, '--allowlist', digest]));
    assert.deepEqual(digestResult.findings.filter(f => f.rule === guard.RULES.EMAIL), []);
  });
});

test('an allowlist can skip a whole file, and comments and blank lines are ignored', () => {
  withTempDir('pii-allow3-', dir => {
    writeFixture(dir, 'generated.md', 'someone@example.com and 706-555-0142\n');
    const allowlist = writeFixture(dir, 'all.txt', '\n# skip a generated file entirely\n**/generated.md::*\n');
    const result = guard.scan(guard.parseArgs(['--include', path.join(dir, 'generated.md'), '--allowlist', allowlist]));
    assert.deepEqual(result.findings, []);
    assert.equal(guard.parseAllowlist('\n\n# only a comment\n').length, 0);
  });
});

/* ------------------------------------------------------------------------- scope */

test('the default scope is the trip layer, and contact data governed elsewhere is excluded', () => {
  const options = guard.parseArgs([]);
  assert.deepEqual(options.includes, guard.DEFAULT_INCLUDES);
  const scope = guard.resolveScope(options);
  const files = scope.files.map(guard.displayPath);
  assert.ok(files.includes(REAL_TRIP), 'the shipped trip record is not in the default scope');
  assert.ok(files.every(file => file.startsWith('pipeline/trip/')), `out of scope: ${files}`);
  /* These hold contact data by design under other rules and must not be scanned by default. */
  for (const elsewhere of ['data/final/prospects.csv', 'docs/', 'demo/', 'pipeline/cases/']) {
    assert.ok(!files.some(file => file.startsWith(elsewhere)), `${elsewhere} must not be in scope`);
  }
});

test('scope can be widened and narrowed explicitly', () => {
  withTempDir('pii-scope-', dir => {
    writeFixture(dir, 'a/keep.md', 'clean\n');
    writeFixture(dir, 'b/drop.md', 'clean\n');
    const all = guard.resolveScope(guard.parseArgs(['--include', dir]));
    assert.equal(all.files.length, 2);
    const narrowed = guard.resolveScope(guard.parseArgs(['--include', dir, '--exclude', '**/b/**']));
    assert.equal(narrowed.files.length, 1);
    assert.match(narrowed.files[0], /keep\.md$/);
  });
});

test('binary files are skipped, but reported rather than silently counted as clean', () => {
  withTempDir('pii-binary-', dir => {
    fs.writeFileSync(path.join(dir, 'blob.dat'), Buffer.from([0x00, 0x01, 0x02, 0x00]));
    writeFixture(dir, 'text.md', 'clean\n');
    const scope = guard.resolveScope(guard.parseArgs(['--include', dir]));
    assert.deepEqual(scope.files.map(file => path.basename(file)), ['text.md']);
    /* The trip data came from photographs, so an image or PDF landing in scope must be visible. */
    const result = guard.scan(guard.parseArgs(['--include', dir]));
    assert.ok(result.warnings.some(warning => /blob\.dat.*not a text file/.test(warning)),
      'a file that was never read was reported as clean');
  });
});

test('symlinked files are followed, because the repository uses symlinks', () => {
  withTempDir('pii-symlink-', dir => {
    writeFixture(dir, 'real.md', 'someone@example.com\n');
    fs.symlinkSync(path.join(dir, 'real.md'), path.join(dir, 'linked.md'));
    const scope = guard.resolveScope(guard.parseArgs(['--include', dir]));
    assert.ok(scope.files.some(file => file.endsWith('linked.md')), 'a symlinked file was dropped');
  });
});

test('an explicitly named path is scanned even where the default scope would exclude it', () => {
  /* data/** is excluded from the default scope by design, but naming it must not report clean. */
  const defaults = guard.resolveScope(guard.parseArgs([]));
  assert.ok(!defaults.files.some(file => guard.displayPath(file).startsWith('data/')));
  const named = guard.parseArgs(['--include', 'data/final/prospects.csv']);
  assert.equal(named.explicitScope, true);
  const scope = guard.resolveScope(named);
  assert.equal(scope.files.length, 1, 'an explicitly named path was swallowed by a default exclude');
});

test('an include whose matches are all excluded is reported, not reported as clean', () => {
  withTempDir('pii-swallowed-', dir => {
    writeFixture(dir, 'a.md', 'clean\n');
    const scope = guard.resolveScope(guard.parseArgs(['--include', dir, '--exclude', '**']));
    assert.deepEqual(scope.files, []);
    assert.equal(scope.missing.length, 1, 'a fully excluded include was silently dropped');
  });
});

test('a missing allowlist is an error when named, and fine when it is the default', () => {
  withTempDir('pii-missing-allow-', dir => {
    const probe = writeFixture(dir, 'probe.md', 'someone@example.com\n');
    assert.throws(
      () => guard.scan(guard.parseArgs(['--include', probe, '--allowlist', path.join(dir, 'nope.txt')])),
      /Allowlist file not found/);
    assert.equal(run(['--include', probe, '--allowlist', path.join(dir, 'nope.txt')]).status, 2);
  });
  assert.deepEqual(guard.loadAllowlist(guard.DEFAULT_ALLOWLIST), []);
});

test('a digest allowlist entry matches regardless of case', () => {
  withTempDir('pii-digest-case-', dir => {
    const mixed = writeFixture(dir, 'mixed.md', 'GroupSales@Example.test\n');
    const allowlist = writeFixture(dir, 'allow.txt', `sha256:${guard.digestOf('groupsales@example.test')}\n`);
    const result = guard.scan(guard.parseArgs(['--include', mixed, '--allowlist', allowlist]));
    assert.deepEqual(result.findings, [], 'the digest form disagreed with the plaintext form on case');
  });
});

test('a long report is not truncated when stdout is a pipe', () => {
  withTempDir('pii-truncation-', dir => {
    let body = '';
    for (let i = 0; i < 2000; i += 1) body += `user${i}@example.com\n`;
    const probe = writeFixture(dir, 'many.md', body);
    const result = run(['--json', '--include', probe]);
    assert.equal(result.status, 1);
    /* process.exit() would cut this off at the pipe buffer, yielding unparseable JSON. */
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.findings.length, 2000);
  });
});

/* --------------------------------------------------------------- the shipped record */

test('the real shipped trip record passes clean', () => {
  const result = guard.scan(guard.parseArgs(['--include', REAL_TRIP]));
  assert.deepEqual(result.findings, [],
    `the shipped trip record reported findings: ${JSON.stringify(result.findings, null, 2)}`);
  assert.deepEqual(result.warnings, []);
});

test('the whole default scope passes clean on the current tree', () => {
  const result = guard.scan(guard.parseArgs([]));
  assert.deepEqual(result.findings, [],
    `the trip layer reported findings: ${JSON.stringify(result.findings, null, 2)}`);
});

/* ------------------------------------------------------------------------- the cli */

test('the cli exits 0 on the current tree and 1 when it finds something', () => {
  const clean = run([]);
  assert.equal(clean.status, 0, clean.stderr);

  withTempDir('pii-cli-', dir => {
    const probe = writeFixture(dir, 'probe.json', 'contact: someone@example.com, 706-555-0142\n');
    const dirty = run(['--include', probe]);
    assert.equal(dirty.status, 1);
    assert.match(dirty.stderr, /probe\.json/, 'the failure does not name the file');
    assert.match(dirty.stderr, /\[email\]/);
    assert.match(dirty.stderr, /\[phone\]/);
    /* The report must not reproduce what it protects. */
    assert.doesNotMatch(dirty.stderr, /someone@example\.com/);
    assert.doesNotMatch(dirty.stderr, /706-555-0142/);
  });
});

test('--list-scope prints the files and exits 0 without scanning', () => {
  const listed = run(['--list-scope']);
  assert.equal(listed.status, 0, listed.stderr);
  assert.match(listed.stdout, new RegExp(REAL_TRIP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('--json reports structured findings and a usage error exits 2', () => {
  const clean = run(['--json']);
  assert.equal(clean.status, 0, clean.stderr);
  const report = JSON.parse(clean.stdout);
  assert.equal(report.ok, true);
  assert.deepEqual(report.findings, []);
  assert.ok(report.scanned > 0);

  withTempDir('pii-cli-json-', dir => {
    const probe = writeFixture(dir, 'probe.md', 'someone@example.com\n');
    const dirty = run(['--json', '--include', probe]);
    assert.equal(dirty.status, 1);
    const parsed = JSON.parse(dirty.stdout);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.findings[0].rule, guard.RULES.EMAIL);
    assert.equal(parsed.findings[0].match_masked, 'so***************om');
    assert.doesNotMatch(dirty.stdout, /someone@example\.com/);
  });

  assert.equal(run(['--nonsense']).status, 2);
  assert.equal(run(['--include']).status, 2);
});
