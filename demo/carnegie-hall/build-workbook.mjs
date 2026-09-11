import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import review from './review.cjs';
import generator from './build.cjs';

const { loadReview, subject, safeCell, workbookPath, dispositions } = review;
const root = path.dirname(fileURLToPath(import.meta.url));
const runtime = process.env.TROEN_WORKBOOK_RUNTIME;
if (!runtime) throw new Error('Set TROEN_WORKBOOK_RUNTIME to a scratch folder with the bundled node_modules link. See README.');
const requireRuntime = createRequire(path.join(runtime, 'artifact-loader.cjs'));
const { Workbook, SpreadsheetFile } = await import(pathToFileURL(requireRuntime.resolve('@oai/artifact-tool')).href);
const records = loadReview();
const opportunityEnd = 6 + records.length;
const evidenceEnd = 6 + records.reduce((total, record) => total + record.sources.length, 0);
const workbook = Workbook.create();
const opportunities = workbook.worksheets.add('Opportunities');
const evidence = workbook.worksheets.add('Evidence');
const colors = { ink: '#173F42', accent: '#1D5D55', line: '#C8D5CF', input: '#FFF2CC' };

function setup(sheet, range, widths) {
  sheet.showGridLines = false;
  sheet.getRange(range).format.font = { name: 'Arial', size: 11, color: colors.ink };
  sheet.getRange(range).format.verticalAlignment = 'center';
  widths.forEach((width, i) => { sheet.getCell(0, i).format.columnWidth = width; });
}

function title(sheet, text, lastColumn) {
  sheet.getRange('A2').values = [[text]];
  sheet.getRange('A2').format.font = { name: 'Arial', size: 16, bold: true, color: colors.ink };
  sheet.getRange('A2').format.rowHeight = 30;
  sheet.getRange(`A2:${lastColumn}2`).format.borders = { bottom: { style: 'thin', color: colors.line } };
}

function table(sheet, headers, rows, name) {
  const values = [headers, ...rows].map(row => row.map(safeCell));
  const range = sheet.getRangeByIndexes(5, 0, values.length, headers.length);
  range.values = values;
  const nativeTable = sheet.tables.add(`A6:${String.fromCharCode(64 + headers.length)}${6 + rows.length}`, true, name);
  nativeTable.style = 'TableStyleLight1';
  nativeTable.showFilterButton = true;
  range.format.fill = '#FFFFFF';
  range.format.wrapText = true;
  range.format.verticalAlignment = 'top';
  const header = sheet.getRangeByIndexes(5, 0, 1, headers.length);
  header.format = { fill: colors.accent, font: { name: 'Arial', size: 11, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, rowHeight: 32 };
  header.format.borders = { insideVertical: { style: 'thin', color: '#FFFFFF' } };
}

setup(opportunities, `A1:F${opportunityEnd + 1}`, [27, 43, 42, 21, 34, 29]);
opportunities.tabColor = colors.ink;
title(opportunities, 'Troen / Carnegie opportunity review', 'F');
opportunities.getRange('A3').values = [[`March 3, 2027 • ${records.length} research examples; interest, availability and eligibility are unverified.`]];
opportunities.getRange('A4').values = [['Amber cells are editable working decisions and notes. Source observations and published contacts are on Evidence.']];
opportunities.getRange('A3:A4').format.rowHeight = 23;
const rows = records.map(r => {
  const s = subject(r);
  return [
    `${s.name}\n${s.city}, ${s.state}${r.organization ? `\n${s.status}: ${s.type}` : ''}`,
    s.fit,
    s.next_action,
    'To review',
    null,
    s.opportunity_id
  ];
});
table(opportunities, ['Organization / location', 'Research interpretation', 'Next internal step', 'Disposition', 'Working notes', 'Opportunity ID'], rows, 'OpportunityReview');
opportunities.getRange(`A7:F${opportunityEnd}`).format.rowHeight = 92;
opportunities.getRange(`D7:E${opportunityEnd}`).format.fill = colors.input;
opportunities.getRange(`D7:D${opportunityEnd}`).dataValidation = { rule: { type: 'list', values: dispositions } };
opportunities.getRange(`D7:D${opportunityEnd}`).conditionalFormats.add('containsText', { text: 'Park', format: { font: { color: '#765021', italic: true } } });
opportunities.freezePanes.freezeRows(6);
opportunities.freezePanes.freezeColumns(1);

setup(evidence, `A1:G${evidenceEnd}`, [10, 24, 60, 24, 15, 22, 70]);
title(evidence, 'Evidence / public source observations', 'G');
evidence.getRange('A3').values = [['Checked dates record the review, not when a performance happened. Unknown dates remain undated.']];
evidence.getRange('A4').values = [['Published adult contacts do not establish deliverability, an existing relationship, or permission to send.']];
evidence.getRange('A3:A4').format.rowHeight = 23;
const sourceRows = records.flatMap(r => r.sources.map(s => {
  const organization = subject(r);
  const observations = organization.evidence.filter(e => e.source_id === s.id).map(e => e.text);
  if (organization.contact?.source_id === s.id) observations.unshift(`${organization.contact.name}, ${organization.contact.role}: ${organization.contact.email}.`);
  const period = s.evidence_date ? new Date(`${s.evidence_date}T00:00:00Z`) : s.evidence_period || 'Undated page';
  return [s.id, `${organization.name}\n${organization.city}, ${organization.state}`, [...observations, s.note].join(' '), period, new Date(`${r.reviewed_on}T00:00:00Z`), s.type, s.url];
}));
// Keep each source URL in the same sortable row as its observation.
table(evidence, ['Source ID', 'Organization record', 'Observed fact / source context', 'Evidence date or period', 'Checked', 'Source type', 'Source URL'], sourceRows, 'PublicEvidence');
evidence.getRange(`A7:G${evidenceEnd}`).format.rowHeight = 78;
evidence.getRange(`D7:E${evidenceEnd}`).setNumberFormat('mm/dd/yy');
evidence.getRange(`G7:G${evidenceEnd}`).format.font = { name: 'Arial', size: 11, color: colors.accent };
evidence.freezePanes.freezeRows(6);
evidence.freezePanes.freezeColumns(2);

workbook.recalculate();
for (const sheet of [opportunities, evidence]) {
  const range = sheet === opportunities ? `A1:F${opportunityEnd + 1}` : `A1:G${evidenceEnd}`;
  console.log((await workbook.inspect({ kind: 'table', range: `${sheet.name}!${range}`, include: 'values,formulas', tableMaxRows: 16, tableMaxCols: 7, maxChars: 2000 })).ndjson);
  const preview = await workbook.render({ sheetName: sheet.name, range, scale: 1, format: 'png' });
  await fs.writeFile(path.join(runtime, `${sheet.name}.png`), new Uint8Array(await preview.arrayBuffer()));
}
console.log((await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 20 }, summary: 'Final error scan' })).ndjson);
const output = await SpreadsheetFile.exportXlsx(workbook);
const stage = path.join(runtime, 'review.xlsx');
await output.save(stage);
const index = process.argv.indexOf('--out');
if (index !== -1 && !process.argv[index + 1]) throw new Error('--out requires a directory.');
const destination = index === -1 ? root : path.resolve(process.argv[index + 1]);
generator.publishGenerated(destination, { [workbookPath]: await fs.readFile(stage) });
console.log(`Saved ${path.join(destination, workbookPath)}. Manual workbook edits are protected.`);
