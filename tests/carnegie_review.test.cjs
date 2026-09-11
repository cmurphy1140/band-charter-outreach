const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadReview, validateReview, safeCell, workbookPath } = require('../demo/carnegie-hall/review.cjs');
const { publishGenerated, comparisonHtml } = require('../demo/carnegie-hall/build.cjs');

test('duplicate opportunities and cross-school contact sources cannot enter the workbook', () => {
  const records = loadReview();
  records[1].school.opportunity_id = records[0].school.opportunity_id;
  assert.throws(() => validateReview(records), /identity/);
  const fresh = loadReview();
  fresh[1].school.contact.source_id = fresh[0].school.contact.source_id;
  assert.throws(() => validateReview(fresh), /cross-school/);
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
