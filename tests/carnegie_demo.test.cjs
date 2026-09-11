const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { escapeHtml, validateExample, publishGenerated, researchHtml, researchMarkdown } = require('../demo/carnegie-hall/build.cjs');

test('research text is escaped before it becomes HTML', () => {
  assert.equal(escapeHtml('<script>"A&B"</script>'), '&lt;script&gt;&quot;A&amp;B&quot;&lt;/script&gt;');
});

test('missing contact evidence stays unverified and research text cannot inject HTML', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../demo/carnegie-hall/example.json'), 'utf8'));
  delete data.school.contact;
  data.school.name = '<img src=x onerror=alert(1)>';
  const html = researchHtml(data);
  assert.match(html, /Email not verified/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|undefined|director@wandobands.org/);
});

test('a portable research note can be produced without a verified contact', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../demo/carnegie-hall/example.json'), 'utf8'));
  delete data.school.contact;
  assert.match(researchMarkdown(data), /Contact not verified/);
  assert.doesNotMatch(researchMarkdown(data), /undefined|director@wandobands.org/);
});

test('reject unsafe public source URLs and a scenario attributed to a real school', () => {
  const data = { event: { date: '2027-03-03' }, sources: [{ url: 'javascript:alert(1)' }], scenario: { fictional: true } };
  assert.throws(() => validateExample(data), /source URL/);
  data.sources[0].url = 'https://example.org/';
  data.scenario.fictional = false;
  assert.throws(() => validateExample(data), /fictional/);
  data.scenario.fictional = true;
  data.event.date = '2027-03-31';
  assert.throws(() => validateExample(data), /March 3/);
});

test('a manually edited deliverable prevents any partial regeneration', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'troen-preservation-'));
  try {
    publishGenerated(dir, { 'index.html': 'first', 'exports/sheet.docx': Buffer.from('original') });
    fs.writeFileSync(path.join(dir, 'exports/sheet.docx'), 'manual correction');
    assert.throws(() => publishGenerated(dir, { 'index.html': 'second', 'exports/sheet.docx': Buffer.from('new') }), /modified/);
    assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), 'first');
    assert.equal(fs.readFileSync(path.join(dir, 'exports/sheet.docx'), 'utf8'), 'manual correction');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('an unregistered file is preserved; an unchanged generated file can be rebuilt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'troen-regeneration-'));
  try {
    fs.writeFileSync(path.join(dir, 'unregistered.docx'), 'existing work');
    assert.throws(() => publishGenerated(dir, { 'unregistered.docx': 'replacement' }), /modified/);
    publishGenerated(dir, { 'index.html': 'first' });
    publishGenerated(dir, { 'index.html': 'second' });
    assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), 'second');
    assert.equal(fs.readFileSync(path.join(dir, 'unregistered.docx'), 'utf8'), 'existing work');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
