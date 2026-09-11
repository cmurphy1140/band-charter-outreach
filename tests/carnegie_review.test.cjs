const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadReview, validateReview, safeCell, workbookPath } = require('../demo/carnegie-hall/review.cjs');
const { publishGenerated, comparisonHtml, candidateHtml } = require('../demo/carnegie-hall/build.cjs');

test('MTC is a separate candidate with owned evidence and an unconfirmed event match', () => {
  const records = loadReview();
  assert.equal(records.length, 3);
  const mtc = records[2];
  assert.equal(mtc.school, undefined);
  assert.equal(mtc.organization.status, 'Candidate');
  assert.equal(mtc.organization.event_relationship, 'Unconfirmed');
  assert.equal(mtc.event.date, '2027-03-03');
  assert.equal(mtc.organization.contact, undefined);
  assert.equal(records.reduce((n, r) => n + r.sources.length, 0), 12);
  assert.doesNotThrow(() => validateReview(records));
});

test('candidate records cannot borrow school identities or evidence, or silently become confirmed', () => {
  const records = loadReview();
  records[2].organization.id = records[0].school.id;
  assert.throws(() => validateReview(records), /identity/);
  const fresh = loadReview();
  fresh[2].organization.evidence[0].source_id = fresh[0].sources[0].id;
  assert.throws(() => validateReview(fresh), /evidence reference/);
  const confirmed = loadReview();
  confirmed[2].organization.event_relationship = 'Confirmed';
  assert.throws(() => validateReview(confirmed), /unconfirmed/i);
});

test('MTC renders evidence safely without a contact action, pitch or school materials', () => {
  const record = loadReview()[2];
  record.organization.name = '<img src=x onerror=alert(1)>';
  const html = candidateHtml(record);
  assert.match(html, /&lt;img/);
  assert.match(html, /Candidate/);
  assert.match(html, /unconfirmed/i);
  assert.match(html, /planned/i);
  assert.doesNotMatch(html, /<img|mailto:|tel:|href="#material"|PARTNER-SHEET|undefined/);
  assert.equal((html.match(/target="_blank"/g) || []).length, 3);
});

test('duplicate opportunities and cross-school contact sources cannot enter the workbook', () => {
  const records = loadReview();
  records[1].school.opportunity_id = records[0].school.opportunity_id;
  assert.throws(() => validateReview(records), /identity/);
  const fresh = loadReview();
  fresh[1].school.contact.source_id = fresh[0].school.contact.source_id;
  assert.throws(() => validateReview(fresh), /cross-record/);
});

test('untrusted spreadsheet strings stay text, including leading whitespace', () => {
  for (const value of ['=HYPERLINK("https://example.org")', ' +SUM(A1)', '@SUM(A1)', '-1+2', '\t=1+2']) assert.equal(safeCell(value), `'${value}`);
  assert.equal(safeCell('Wando'), 'Wando');
  assert.equal(safeCell(null), null);
  assert.equal(safeCell(0), 0);
});

test('the contrasting case does not borrow Wando material or unsafe HTML', () => {
  const record = loadReview()[1];
  record.school.name = '<script>alert(1)</script>';
  const html = comparisonHtml(record);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|href="#material"/);
  assert.match(html, /Wando only/);
});

test('a missing Salem contact stays visibly unverified', () => {
  const record = loadReview()[1];
  delete record.school.contact;
  const html = comparisonHtml(record);
  assert.match(html, /Email not verified/);
  assert.doesNotMatch(html, /undefined|jwright@salem.k12.va.us/);
});

test('a reviewer-edited workbook is preserved on regeneration', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'troen-workbook-'));
  try {
    publishGenerated(dir, { [workbookPath]: 'first workbook' });
    fs.writeFileSync(path.join(dir, workbookPath), 'reviewer notes');
    assert.throws(() => publishGenerated(dir, { [workbookPath]: 'new workbook' }), /modified/);
    assert.equal(fs.readFileSync(path.join(dir, workbookPath), 'utf8'), 'reviewer notes');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('an HTML-only refresh includes MTC while preserving edited exports and workbook notes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'troen-html-only-'));
  const builder = path.join(__dirname, '../demo/carnegie-hall/build.cjs');
  try {
    const word = 'exports/Troen - Wando Director Sheet.docx';
    publishGenerated(dir, { [word]: 'original', [workbookPath]: 'original' });
    fs.writeFileSync(path.join(dir, word), 'manual Word edits');
    fs.writeFileSync(path.join(dir, workbookPath), 'manual workbook notes');
    execFileSync(process.execPath, [builder, '--html-only', '--out', dir]);
    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    assert.match(html, /Music Travel Consultants \(MTC\)/);
    assert.match(html, /NYIMF\/Troen match is unconfirmed/);
    const materialAndScenario = html.slice(html.indexOf('<section data-page="material"'));
    assert.doesNotMatch(materialAndScenario, /Music Travel Consultants|MTC|NYIMF/);
    assert.equal(fs.readFileSync(path.join(dir, word), 'utf8'), 'manual Word edits');
    assert.equal(fs.readFileSync(path.join(dir, workbookPath), 'utf8'), 'manual workbook notes');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
