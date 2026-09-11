const fs = require('node:fs');
const path = require('node:path');

const workbookPath = 'outputs/01a08da2-45ab-7181-a80f-a887cb079101/Troen - Carnegie Opportunity Review.xlsx';
const dispositions = ['To review', 'Keep researching', 'Park'];

function loadReview() {
  const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
  const first = read('example.json');
  const second = { ...read('salem.json'), event: first.event };
  const third = { ...read('mtc.json'), event: first.event };
  const records = [first, second, third];
  validateReview(records);
  return records;
}

function subject(record) {
  if (Boolean(record.school) === Boolean(record.organization)) throw new Error('Each record needs exactly one school or organization identity.');
  return record.school || record.organization;
}

function validateReview(records) {
  const organizations = new Set();
  const opportunities = new Set();
  const sourceIds = new Set();
  for (const record of records) {
    const s = subject(record);
    if (record.event.date !== '2027-03-03') throw new Error('Review is limited to March 3, 2027.');
    if (record.organization && (s.status !== 'Candidate' || s.event_relationship !== 'Unconfirmed')) throw new Error('The organization example must remain a candidate with an unconfirmed event relationship.');
    if (!s.id || !s.opportunity_id || organizations.has(s.id) || opportunities.has(s.opportunity_id)) throw new Error('Duplicate or missing identity in review.');
    organizations.add(s.id);
    opportunities.add(s.opportunity_id);
    for (const source of record.sources) {
      if (sourceIds.has(source.id)) throw new Error('Duplicate source ID in review.');
      if (!/^https?:$/.test(new URL(source.url).protocol)) throw new Error('Unsafe source URL.');
      sourceIds.add(source.id);
    }
    const ownSources = new Set(record.sources.map(source => source.id));
    const references = s.evidence.map(e => e.source_id);
    if (s.contact) references.push(s.contact.source_id);
    if (!references.length || references.some(id => !ownSources.has(id))) throw new Error('Missing or cross-record evidence reference.');
  }
}

function safeCell(value) {
  if (typeof value !== 'string') return value;
  return /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
}

module.exports = { loadReview, validateReview, subject, safeCell, workbookPath, dispositions };
