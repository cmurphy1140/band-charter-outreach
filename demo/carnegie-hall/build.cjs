/* Build the reviewed example; preserve edits to previously generated deliverables. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadReview, workbookPath } = require('./review.cjs');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function validateExample(data) {
  if (data.event.date !== '2027-03-03') throw new Error('This example is scoped to March 3, 2027.');
  for (const source of data.sources) {
    if (!/^https?:$/.test(new URL(source.url).protocol)) throw new Error('Unsafe source URL.');
  }
  if (data.scenario.fictional !== true) throw new Error('The workflow must remain fictional.');
}

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const faqDirectory = 'exports/carnegie-hall/faq';
const faqSources = {
  [`${faqDirectory}/Troen - Carnegie Hall Director FAQ.docx`]: 'docs/carnegie-hall/materials/Troen - Carnegie Hall Director FAQ.docx',
  [`${faqDirectory}/Troen - Carnegie Hall Director FAQ.md`]: 'docs/carnegie-hall/materials/Troen - Carnegie Hall Director FAQ.md',
  'logistics/carnegie hall EVENT OVERVIEW.pdf': 'logistics/carnegie hall EVENT OVERVIEW.pdf'
};

function loadFaqFiles(sourceRoot = path.resolve(__dirname, '../..')) {
  const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sources.json'), 'utf8'));
  const files = {};
  for (const [output, source] of Object.entries(faqSources)) {
    const file = path.join(sourceRoot, source);
    if (!fs.existsSync(file)) throw new Error(`Missing FAQ source: ${source}. Restore the reviewed input before building.`);
    const bytes = fs.readFileSync(file);
    if (digest(bytes) !== receipt.sha256[source]) {
      throw new Error(`FAQ source changed: ${source}. Preserved it. Review the Word/Markdown pair and cited brochure before updating faq-sources.json.`);
    }
    files[output] = bytes;
  }
  return files;
}

function publishGenerated(dir, files) {
  const manifestPath = path.join(dir, '.generated-manifest.json');
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  for (const name of Object.keys(files)) {
    const file = path.join(dir, name);
    if (fs.existsSync(file) && digest(fs.readFileSync(file)) !== previous[name]) {
      throw new Error(`Preserved modified or unregistered file: ${name}. Build to a new --out directory.`);
    }
  }
  const next = { ...previous };
  for (const [name, bytes] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, bytes);
    fs.renameSync(`${file}.tmp`, file);
    next[name] = digest(bytes);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2) + '\n');
}

function sourceLink(data, id, label = 'Read source') {
  const source = data.sources.find(item => item.id === id);
  if (!source) throw new Error(`Unknown source: ${id}`);
  return `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function eventHtml(data) {
  return `<details class="event-overview"><summary>About the event</summary><aside class="event-card"><p class="context">The event in focus</p><h2>${escapeHtml(data.event.name)}</h2><p class="date">${escapeHtml(data.event.display_date)}</p><p>${escapeHtml(data.event.venue)}</p><div class="event-rule"></div><p>${escapeHtml(data.event.summary)}</p>
    <ol class="experience-list">${data.event.experiences.map((x, i) => `<li><details><summary><span class="step-number" aria-hidden="true">${i + 1}</span>${escapeHtml(['Prepare', 'Perform', 'Reflect'][i] || x.title)}</summary><p>${escapeHtml(x.text)}</p></details></li>`).join('')}</ol><p class="small">${escapeHtml(data.event.qualification)}</p></aside></details>`;
}

function researchHtml(data) {
  const s = data.school;
  const evidence = s.evidence.map(item => `<article class="evidence-row"><div><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.text)}</p></div>${sourceLink(data, item.source_id)}</article>`).join('');
  return `<div class="research-grid"><div class="profile"><p class="context">${escapeHtml(s.city)}, ${escapeHtml(s.state)} <span class="tag">Research example</span></p>
    <h3>${escapeHtml(s.name)}</h3><p class="intro">A concert program worth a closer look.</p><p class="ensemble">${escapeHtml(s.ensemble)}</p>
    <div class="evidence">${evidence}</div><div class="fit"><h4>The Carnegie connection</h4><p>${escapeHtml(s.fit)}</p><span class="small">Research interpretation</span></div>
    <a class="button" href="#material" data-preview="director">Open the director sheet</a>
    <details class="contact"><summary>Published director contact</summary><p><strong>${escapeHtml(s.contact?.name || 'Not verified')}</strong><br>${escapeHtml(s.contact?.role || 'Role not verified')}<br>${escapeHtml(s.contact?.email || 'Email not verified')}</p><p class="small">${escapeHtml(s.contact?.status || 'Contact not verified.')}</p>${s.contact?.source_id ? sourceLink(data, s.contact.source_id) : ''}</details>
    </div></div>
    <details id="sources" class="sources"><summary>Review the evidence and open questions</summary><a class="secondary-link" href="exports/Troen - Wando Research Note.md" download>Download research note</a><div class="source-grid"><div><h2>Sources checked September 10, 2026</h2>${data.sources.map(x => `<article><h3>${sourceLink(data, x.id, x.title)}</h3><p>${escapeHtml(x.note)}</p></article>`).join('')}</div><div><h2>Still unknown</h2><ul>${s.unknowns.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul><h3>Useful next action</h3><p>${escapeHtml(s.next_action)}</p><h3>Event evidence</h3><p>Troen’s supplied event overview, pages 1–2 (P01), and March 3 license photograph (I06). The Materials view includes the shared brochure; the license and internal logistics remain outside this demonstration.</p></div></div></details>`;
}

function faqPreviewHtml(files) {
  const markdown = files[`${faqDirectory}/Troen - Carnegie Hall Director FAQ.md`].toString('utf8');
  const paragraphs = markdown.split(/\n\s*\n/).filter(Boolean).map(block => {
    const safe = escapeHtml(block.trim());
    if (block.startsWith('# ')) return `<h3 id="faq-preview-title" tabindex="-1">${escapeHtml(block.slice(2))}</h3>`;
    if (block.startsWith('## ')) return `<h4>${escapeHtml(block.slice(3))}</h4>`;
    if (block.startsWith('Source:')) return '<p>Source: <a href="logistics/carnegie hall EVENT OVERVIEW.pdf" target="_blank" rel="noopener noreferrer">Carnegie Hall Event Overview</a>, pages 1–5.</p>';
    return `<p>${safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
  }).join('');
  return `<article id="faq-preview" class="document-preview" data-material="faq" aria-labelledby="faq-preview-title">${paragraphs}</article>`;
}

function materialHtml(data, files) {
  const d = data.director;
  return `<h2 id="material-title" tabindex="-1">Materials</h2><p>Choose a document to read here. Download an editable copy when useful.</p>
    <div class="view-switch" role="group" aria-label="Document preview"><button type="button" data-select="material" data-value="director" aria-pressed="true">Director sheet</button><button type="button" data-select="material" data-value="faq" aria-pressed="false">FAQ</button></div>
    <article id="director-preview" class="document-preview" data-material="director" aria-labelledby="director-preview-title"><p class="doc-brand">${escapeHtml(data.event.producer)}</p><p class="small">${escapeHtml(d.audience)}</p><h3 id="director-preview-title" tabindex="-1">${escapeHtml(d.title)}</h3><p class="doc-date">${escapeHtml(data.event.display_date)}<br>${escapeHtml(data.event.venue)}</p><p>${escapeHtml(d.intro)}</p><h4>${escapeHtml(d.fit_heading)}</h4><p>${escapeHtml(d.fit_text)}</p><div class="doc-experiences">${data.event.experiences.map(x => `<h4>${escapeHtml(x.title)}</h4><p>${escapeHtml(x.text)}</p>`).join('')}</div><h4>${escapeHtml(d.support_heading)}</h4><p>${escapeHtml(d.support_text)}</p><h4>${escapeHtml(d.next_heading)}</h4><p>${escapeHtml(d.next_text)}</p><p class="qualification">${escapeHtml(data.event.qualification)}</p><p class="small">Research basis: ${sourceLink(data, 'S02', 'Wando program')}; ${sourceLink(data, 'S04', 'Midwest Clinic, 2019')}. Event basis: Troen’s supplied overview, pages 1–2.</p><footer>${escapeHtml(d.footer)}</footer><div class="download-links"><a href="exports/Troen - Wando Director Sheet.docx" download>Download Word sheet</a><a href="exports/Troen - Wando Director Sheet.md" download>Download Markdown source</a></div></article>
    ${faqPreviewHtml(files)}<div data-material="faq" class="download-links"><a href="${faqDirectory}/Troen - Carnegie Hall Director FAQ.docx" download>Download FAQ (Word)</a><a href="${faqDirectory}/Troen - Carnegie Hall Director FAQ.md" download>Download FAQ (Markdown)</a></div>`;
}

function comparisonHtml(record, includeWorkbook = true) {
  const s = record.school;
  return `<section class="comparison" aria-labelledby="comparison-title"><div>
    <p class="context">A contrasting research case</p><h3 id="comparison-title">Which Salem High School?</h3>
    <p>The old list left two Virginia schools unresolved. The reviewed case is <strong>${escapeHtml(s.name)}, ${escapeHtml(s.city)}, ${escapeHtml(s.state)}</strong>, in ${escapeHtml(s.district)}.</p>
    <p>${escapeHtml(s.fit)}</p><p class="small">The Virginia Beach SunDevil program is a separate school. Its contacts have not been carried into this record. Past parade participation is undated historical context.</p>
    <details><summary>Inspect the Salem evidence</summary>${s.evidence.map(e => `<p><strong>${escapeHtml(e.label)}:</strong> ${escapeHtml(e.text)} ${sourceLink(record, e.source_id)}</p>`).join('')}
    <p><strong>Published adult role:</strong> ${escapeHtml(s.contact?.name || 'Name not verified')}, ${escapeHtml(s.contact?.role || 'Role not verified')}.<br>${escapeHtml(s.contact?.email || 'Email not verified')}</p><p class="small">${escapeHtml(s.contact?.status || 'Contact not verified.')} ${s.contact?.source_id ? sourceLink(record, s.contact.source_id) : ''}</p>
    <a class="secondary-link" href="exports/Troen - Salem Research Note.md" download>Download Salem research note</a></details>
    </div>${includeWorkbook ? `<aside class="review-download"><h3>Inspect the research workbook</h3><p>The workbook keeps source observations separate from editable decisions and notes.</p>
    <a class="button" href="${escapeHtml(workbookPath)}" download>Download opportunity workbook</a>
    <p class="small">Two school cases and one illustrative tour-operator candidate. Neither school’s interest, eligibility, calendar fit, or relationship with Troen is established. The director sheet above is tailored to Wando only.</p></aside>` : ''}</section>`;
}

function candidateHtml(record) {
  const s = record.organization;
  return `<section id="mtc-example" class="sources" aria-labelledby="candidate-title">
    <p class="context">${escapeHtml(s.status)}</p>
    <h3 id="candidate-title">${escapeHtml(s.name)}</h3>
    <p>${escapeHtml(s.type)} · ${escapeHtml(s.city)}, ${escapeHtml(s.state)}</p>
    <p>MTC publishes a March 3, 2027 Carnegie Hall festival listing. Its connection to Troen remains unconfirmed.</p>
    <details><summary>Why this candidate was included</summary><p class="small">${escapeHtml(s.next_action)}</p><p>${escapeHtml(s.fit)}</p>
    ${s.evidence.map(e => `<p><strong>${escapeHtml(e.label)}:</strong> ${escapeHtml(e.text)} ${sourceLink(record, e.source_id)}</p>`).join('')}
    <p class="small">Reviewed ${escapeHtml(record.reviewed_on)}. The calendar was published March 17, 2026 and updated April 20. Its separate March 31 listing is outside this POC.</p>
    <h3>Still unknown</h3><ul>${s.unknowns.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
    </details></section>`;
}

function opportunitiesHtml(data, salem, mtc) {
  const schoolComparison = comparisonHtml(salem, false);
  const rows = [data, salem, mtc].map(record => {
    const item = record.school || record.organization;
    return `<tr><th scope="row">${escapeHtml(item.name)}</th><td>${record.school ? 'School' : 'Tour operator'}</td><td>${escapeHtml(item.city)}, ${escapeHtml(item.state)}</td><td>${record.school ? 'Research example; interest unverified' : 'Candidate; Troen connection unconfirmed'}</td></tr>`;
  }).join('');
  return `<h2 id="research-title" tabindex="-1">Opportunities</h2>
    <div class="opportunity-tools"><div class="view-switch" role="group" aria-label="Opportunity type"><button type="button" data-select="opportunity" data-value="schools" aria-pressed="true">Schools</button><button type="button" data-select="opportunity" data-value="operators" aria-pressed="false">Tour operators</button></div></div>
    <details class="research-overview"><summary>View all research</summary><div class="table-scroll"><table><caption>Two school examples and one tour-operator candidate</caption><thead><tr><th>Name</th><th>Type</th><th>Location</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><a class="secondary-link" href="${escapeHtml(workbookPath)}" download>Download editable workbook</a></details>
    <div data-opportunity="schools" aria-label="School examples">${researchHtml(data)}${schoolComparison}</div>
    <div data-opportunity="operators" aria-label="Tour-operator examples">${candidateHtml(mtc)}</div>`;
}

function scenarioHtml(data) {
  return `<div class="scenario-heading"><div><p class="context">After an interested reply</p><h2 id="follow-up-title" tabindex="-1">Example workflow</h2><p>See how the work connects beyond finding a name.</p></div><a class="secondary-link" href="exports/Troen - Example Follow-up.md" download>Download example brief</a></div>
    <div class="simulation-notice"><strong>${escapeHtml(data.scenario.name)} / Simulation</strong><p>${escapeHtml(data.scenario.notice)}</p></div>
    <fieldset class="situations"><legend>Explore a situation</legend>${data.scenario.situations.map((s, i) => `<label><input type="radio" name="situation" value="${escapeHtml(s.id)}" ${i === 0 ? 'checked' : ''}> ${escapeHtml(s.label)}</label>`).join('')}<button id="reset-scenario" class="text-button" type="button">Reset example</button></fieldset>
    <div id="scenario-result" aria-live="polite" aria-atomic="true">${data.scenario.situations.map((s, i) => `<section data-situation="${escapeHtml(s.id)}" ${i === 0 ? '' : 'hidden'}><h3>${escapeHtml(s.heading)}</h3><p class="next-action">${escapeHtml(s.next)}</p><dl class="workflow">${s.steps.map(([title, text]) => `<div><dt>${escapeHtml(title)}</dt><dd>${escapeHtml(text)}</dd></div>`).join('')}</dl></section>`).join('')}</div><p class="small">These are example planning states. Changing the situation sends nothing and records no real activity. Reset or reload returns to the first example.</p>`;
}

function makeDirectorMarkdown(data) {
  const d = data.director;
  const sections = [[d.fit_heading, d.fit_text], ...data.event.experiences.map(x => [x.title, x.text]), [d.support_heading, d.support_text], [d.next_heading, d.next_text]];
  return `# ${d.title}\n\n${d.audience}\n\n**${data.event.display_date}**\n\n${data.event.venue}\n\n${d.intro}\n\n${sections.map(([h, p]) => `## ${h}\n\n${p}`).join('\n\n')}\n\n${data.event.qualification}\n\nResearch: [Wando program](${data.sources[1].url}); [Midwest Clinic, 2019](${data.sources[3].url}). Event: supplied Troen overview, pages 1–2 (P01).\n\n${d.footer}\n`;
}

async function makeDocx(data) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, Footer } = require('docx');
  const para = (text, options = {}) => new Paragraph({ children: [new TextRun(text)], spacing: { after: 120 }, ...options });
  const heading = text => para(text, { heading: HeadingLevel.HEADING_2, spacing: { before: 140, after: 60 } });
  const d = data.director;
  const children = [para(data.event.producer, { style: 'Brand' }), para(d.audience, { style: 'Small' }), para(d.title, { heading: HeadingLevel.TITLE }), para(`${data.event.display_date} | ${data.event.venue}`, { style: 'Date' }), para(d.intro), heading(d.fit_heading), para(d.fit_text)];
  for (const x of data.event.experiences) children.push(heading(x.title), para(x.text));
  children.push(heading(d.support_heading), para(d.support_text), heading(d.next_heading), para(d.next_text), para(data.event.qualification, { style: 'Small' }));
  children.push(new Paragraph({ style: 'Small', children: [new TextRun('Research: '), ...[1, 3].flatMap((n, i) => [new ExternalHyperlink({ link: data.sources[n].url, children: [new TextRun({ text: i ? 'Midwest Clinic, 2019' : 'Wando program', style: 'Hyperlink' })] }), new TextRun(i ? '. Event: supplied Troen overview, pp. 1–2.' : '; ')])] }));
  const doc = new Document({ creator: 'Logistics and software developer', title: 'Troen - Wando Director Sheet', description: 'Discussion draft; not issued to Wando.', styles: { default: { document: { run: { font: 'Arial', size: 21, color: '233F3A' }, paragraph: { spacing: { line: 260 } } } }, paragraphStyles: [
    { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: 'Georgia', size: 44, color: '173F42' }, paragraph: { spacing: { before: 100, after: 160 } } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', run: { bold: true, size: 22, color: '1D5D55' }, paragraph: { keepNext: true, outlineLevel: 1 } },
    { id: 'Brand', name: 'Brand', basedOn: 'Normal', run: { bold: true, size: 22, color: '1D5D55' } },
    { id: 'Date', name: 'Date', basedOn: 'Normal', run: { bold: true, size: 20 } },
    { id: 'Small', name: 'Small', basedOn: 'Normal', run: { size: 17, color: '51635B' } }
  ] }, sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 800, bottom: 800, left: 950, right: 950 } } }, footers: { default: new Footer({ children: [para(d.footer, { style: 'Small' })] }) }, children }] });
  return Packer.toBuffer(doc);
}

function followupMarkdown(data) {
  return `# Example follow-up\n\n${data.scenario.notice}\n\n${data.event.display_date}\n\n${data.scenario.situations.map(s => `## ${s.label}\n\n${s.next}\n\n${s.steps.map(([h, p]) => `- **${h}:** ${p}`).join('\n')}`).join('\n\n')}\n`;
}

function researchMarkdown(data) {
  const s = data.school;
  const source = id => data.sources.find(item => item.id === id);
  const contactSource = source(s.contact?.source_id);
  const contact = s.contact
    ? `${s.contact.name || 'Name not verified'}, ${s.contact.role || 'Role not verified'}: ${s.contact.email || 'Email not verified'}. ${contactSource ? `[Source](${contactSource.url}).` : 'Source not verified.'} ${s.contact.status || 'Contact not verified.'}`
    : 'Contact not verified.';
  const evidence = s.evidence.map(x => `- **${x.label}:** ${x.text} [Source](${source(x.source_id).url}).`).join('\n');
  return `# ${s.name}: Carnegie research example\n\nReviewed ${data.reviewed_on}. ${s.city}, ${s.state}. ${s.district}.\n\n**${data.event.display_date}** — ${s.ensemble}.\n\n## Evidence\n\n${evidence}\n\n## Interpretation\n\n${s.fit}\n\n## Published adult role\n\n${contact}\n\n## Unknowns\n\n${s.unknowns.map(x => `- ${x}`).join('\n')}\n\n## Next useful action\n\n${s.next_action}\n\n## Source register\n\n${data.sources.map(x => `- **${x.id}: [${x.title}](${x.url})** — ${x.note}`).join('\n')}\n\n## Provenance and scope\n\n${s.origin}\n\nOpportunity ID: ${s.opportunity_id}. No outreach sent; no buying probability or confirmed booking is assigned. Event details derive from Troen’s supplied overview, pages 1–2 (P01), and March 3 license photograph (I06). ${data.event.qualification}\n`;
}

async function build(outputDir = __dirname, htmlOnly = false, faqOnly = false) {
  const [data, salem, mtc] = loadReview();
  validateExample(data);
  const faqFiles = loadFaqFiles();
  let html = fs.readFileSync(path.join(__dirname, 'index.template.html'), 'utf8');
  for (const [key, content] of Object.entries({ event: eventHtml(data), research: opportunitiesHtml(data, salem, mtc), material: materialHtml(data, faqFiles), followup: scenarioHtml(data) })) html = html.replace(`{{${key}}}`, content);
  if (htmlOnly) {
    publishGenerated(outputDir, { 'index.html': html });
    console.log(`Refreshed HTML in ${outputDir}. Existing exports are untouched.`);
    return;
  }
  if (faqOnly) {
    publishGenerated(outputDir, { 'index.html': html, ...faqFiles });
    console.log(`Refreshed HTML and FAQ files in ${outputDir}. Existing director exports and workbook are untouched.`);
    return;
  }
  const files = { 'index.html': html, 'exports/Troen - Wando Director Sheet.docx': await makeDocx(data), 'exports/Troen - Wando Director Sheet.md': makeDirectorMarkdown(data), 'exports/Troen - Example Follow-up.md': followupMarkdown(data), 'exports/Troen - Wando Research Note.md': researchMarkdown(data) };
  files['exports/Troen - Salem Research Note.md'] = researchMarkdown(salem);
  Object.assign(files, faqFiles);
  const workbook = path.join(__dirname, workbookPath);
  if (!fs.existsSync(workbook)) throw new Error('Build the opportunity workbook first; see README.');
  if (path.resolve(outputDir) !== __dirname) for (const name of ['styles.css', 'app.js', 'assets/troen-logo.webp']) files[name] = fs.readFileSync(path.join(__dirname, name));
  if (path.resolve(outputDir) !== __dirname) files[workbookPath] = fs.readFileSync(workbook);
  publishGenerated(outputDir, files);
  console.log(`Built ${Object.keys(files).length} files in ${outputDir}. Existing manual edits are protected.`);
}

module.exports = { faqPreviewHtml, escapeHtml, validateExample, publishGenerated, loadFaqFiles, researchHtml, researchMarkdown, makeDirectorMarkdown, comparisonHtml, candidateHtml };
if (require.main === module) {
  const index = process.argv.indexOf('--out');
  if (index !== -1 && !process.argv[index + 1]) throw new Error('--out requires a directory.');
  if (process.argv.includes('--html-only') && process.argv.includes('--faq-only')) throw new Error('Choose either --html-only or --faq-only.');
  build(index === -1 ? __dirname : path.resolve(process.argv[index + 1]), process.argv.includes('--html-only'), process.argv.includes('--faq-only')).catch(error => { console.error(error.message); process.exitCode = 1; });
}
