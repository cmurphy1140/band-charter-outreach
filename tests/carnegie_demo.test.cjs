const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
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

const faqInputs = {
  'docs/carnegie-hall/materials/Troen - Carnegie Hall Director FAQ.docx': 'exports/carnegie-hall/faq/Troen - Carnegie Hall Director FAQ.docx',
  'docs/carnegie-hall/materials/Troen - Carnegie Hall Director FAQ.md': 'exports/carnegie-hall/faq/Troen - Carnegie Hall Director FAQ.md',
  'logistics/carnegie hall EVENT OVERVIEW.pdf': 'logistics/carnegie hall EVENT OVERVIEW.pdf'
};
const root = path.resolve(__dirname, '..');
const builder = path.join(root, 'demo/carnegie-hall/build.cjs');

test('FAQ refresh packages the reviewed files without replacing edited director or workbook files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'troen-faq-only-'));
  try {
    const word = 'exports/Troen - Wando Director Sheet.docx';
    const workbook = 'outputs/01a08da2-45ab-7181-a80f-a887cb079101/Troen - Carnegie Opportunity Review.xlsx';
    publishGenerated(dir, { [word]: 'original', [workbook]: 'original' });
    fs.writeFileSync(path.join(dir, word), 'manual director edits');
    fs.writeFileSync(path.join(dir, workbook), 'manual workbook notes');
    execFileSync(process.execPath, [builder, '--faq-only', '--out', dir]);
    for (const [source, output] of Object.entries(faqInputs)) {
      assert.deepEqual(fs.readFileSync(path.join(dir, output)), fs.readFileSync(path.join(root, source)));
    }
    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const material = html.split('<section data-page="material"')[1].split('<section data-page="follow-up"')[0];
    assert.match(material, /href="exports\/carnegie-hall\/faq\/Troen - Carnegie Hall Director FAQ.docx" download/);
    assert.match(material, /href="exports\/carnegie-hall\/faq\/Troen - Carnegie Hall Director FAQ.md" download/);
    assert.doesNotMatch(material, /MTC|NYIMF|INTERNAL-DECISIONS|IMG_4374/);
    assert.equal(fs.readFileSync(path.join(dir, word), 'utf8'), 'manual director edits');
    assert.equal(fs.readFileSync(path.join(dir, workbook), 'utf8'), 'manual workbook notes');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a changed or missing FAQ input stops packaging and leaves the source untouched', () => {
  const { loadFaqFiles } = require('../demo/carnegie-hall/build.cjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'troen-faq-source-'));
  try {
    for (const source of Object.keys(faqInputs)) {
      const file = path.join(dir, source);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.copyFileSync(path.join(root, source), file);
    }
    for (const source of Object.keys(faqInputs)) {
      const file = path.join(dir, source);
      fs.writeFileSync(file, 'manual source revision');
      assert.throws(() => loadFaqFiles(dir), /FAQ source changed/);
      assert.equal(fs.readFileSync(file, 'utf8'), 'manual source revision');
      fs.unlinkSync(file);
      assert.throws(() => loadFaqFiles(dir), /Missing FAQ source/);
      fs.copyFileSync(path.join(root, source), file);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('edited FAQ downloads block the actual refresh before HTML or manifest changes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'troen-faq-edits-'));
  try {
    execFileSync(process.execPath, [builder, '--faq-only', '--out', dir]);
    const before = fs.readFileSync(path.join(dir, 'index.html'));
    const manifest = fs.readFileSync(path.join(dir, '.generated-manifest.json'));
    for (const output of Object.values(faqInputs)) {
      const file = path.join(dir, output);
      const original = fs.readFileSync(file);
      fs.writeFileSync(file, 'manual download edits');
      assert.throws(() => execFileSync(process.execPath, [builder, '--faq-only', '--out', dir], { stdio: 'pipe' }), /Preserved modified or unregistered file/);
      assert.equal(fs.readFileSync(file, 'utf8'), 'manual download edits');
      assert.deepEqual(fs.readFileSync(path.join(dir, 'index.html')), before);
      assert.deepEqual(fs.readFileSync(path.join(dir, '.generated-manifest.json')), manifest);
      fs.writeFileSync(file, original);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('standalone full builds include FAQ files and their relative brochure citation', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'troen-faq-package-'));
  try {
    execFileSync(process.execPath, [builder, '--out', dir]);
    for (const [source, output] of Object.entries(faqInputs)) {
      assert.deepEqual(fs.readFileSync(path.join(dir, output)), fs.readFileSync(path.join(root, source)));
    }
    const markdown = path.join(dir, 'exports/carnegie-hall/faq/Troen - Carnegie Hall Director FAQ.md');
    const citation = fs.readFileSync(markdown, 'utf8').match(/\[Carnegie Hall Event Overview\]\(<([^>]+)>\)/)[1];
    assert.equal(path.resolve(path.dirname(markdown), citation), path.join(dir, 'logistics/carnegie hall EVENT OVERVIEW.pdf'));
    assert.ok(fs.existsSync(path.resolve(path.dirname(markdown), citation)));
    assert.ok(fs.existsSync(path.join(dir, 'styles.css')));
    assert.ok(fs.existsSync(path.join(dir, 'app.js')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test('inline FAQ preserves each reviewed answer and escapes injected markup', () => {
  const { faqPreviewHtml, loadFaqFiles, escapeHtml } = require('../demo/carnegie-hall/build.cjs');
  const files = loadFaqFiles();
  const key = 'exports/carnegie-hall/faq/Troen - Carnegie Hall Director FAQ.md';
  const markdown = files[key].toString('utf8');
  const html = faqPreviewHtml(files);
  const sections = markdown.split(/\n## /).slice(1);
  assert.equal(sections.length, 7);
  for (const section of sections) {
    const [question, answer] = section.split(/\n\s*\n/);
    assert.ok(html.includes(escapeHtml(question)));
    assert.ok(html.includes(escapeHtml(answer.trim())));
  }
  files[key] = Buffer.from('# FAQ\n\n<script>alert(1)</script>');
  assert.match(faqPreviewHtml(files), /&lt;script&gt;/);
  assert.doesNotMatch(faqPreviewHtml(files), /<script>/);
});
