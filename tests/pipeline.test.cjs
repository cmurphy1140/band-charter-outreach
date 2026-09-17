const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { validateCase, loadCase, caseFiles, errorsIn } = require('../pipeline/validate.cjs');
const { renderCase, checkCase, blockersFor } = require('../pipeline/render.cjs');
const { main } = require('../pipeline/cli.cjs');
const V = require('../pipeline/vocabulary.cjs');

const REAL = 'troen-carnegie-2027-03-03';
const REHEARSAL = 'rehearsal-charter-school';
const copy = id => structuredClone(loadCase(id));
const checks = findings => errorsIn(findings).map(f => f.check);
const messages = findings => errorsIn(findings).map(f => f.message).join(' | ');

test('every shipped case validates and its tracked outputs are current', () => {
  const ids = caseFiles().map(file => path.basename(file, '.case.json'));
  assert.deepEqual(ids, [REHEARSAL, REAL]);
  for (const id of ids) {
    const data = loadCase(id);
    const result = checkCase(data);
    assert.deepEqual(result.errors, [], `${id}: ${messages(result.findings)}`);
    assert.deepEqual(result.stale, [], `${id} has stale outputs: run node pipeline/cli.cjs render ${id}`);
    assert.equal(result.files.size, 7);
  }
  assert.equal(main(['check', '--all']), 0);
});

test('rendering is deterministic', () => {
  const first = renderCase(loadCase(REAL));
  const second = renderCase(loadCase(REAL));
  assert.deepEqual([...first.files.entries()], [...second.files.entries()]);
});

test('each evidence tier enforces what that tier requires', () => {
  const drop = (id, mutate) => {
    const data = copy(REAL);
    mutate(data.fact_spine.find(fact => fact.id === id));
    return checks(validateCase(data));
  };
  assert.ok(drop('F01', fact => { fact.source_ids = []; }).includes('evidence.tiers'));
  assert.ok(drop('F09', fact => { fact.source_ids = []; }).includes('evidence.tiers'));
  assert.ok(drop('F13', fact => { delete fact.basis; }).includes('evidence.tiers'));
  assert.ok(drop('F15', fact => { delete fact.illustrative; }).includes('evidence.tiers'));
  assert.ok(drop('F16', fact => { delete fact.needed_for; }).includes('evidence.tiers'));
  assert.ok(drop('F01', fact => { fact.tier = 9; }).includes('evidence.tiers'));
  assert.ok(drop('F01', fact => { fact.source_ids = ['NOPE']; }).includes('evidence.references'));
});

test('only documented evidence may be marked customer-safe, and only customer-safe facts may be issued', () => {
  const employeeReport = copy(REAL);
  employeeReport.fact_spine.find(fact => fact.id === 'F10').reuse = 'customer-safe';
  assert.ok(checks(validateCase(employeeReport)).includes('claims.reuse'));

  const issued = copy(REAL);
  const faq = issued.deliverables.find(item => item.kind === 'approver_faq');
  faq.issued = true;
  faq.fact_ids.push('F04');
  assert.match(messages(validateCase(issued)), /internal-only fact "F04"/);

  const clean = copy(REAL);
  clean.deliverables.find(item => item.kind === 'approver_faq').issued = true;
  assert.deepEqual(errorsIn(validateCase(clean)), []);
});

test('contact details are recorded only when published on a primary page', () => {
  const unpublished = copy(REAL);
  unpublished.contacts[0].published = false;
  assert.ok(checks(validateCase(unpublished)).includes('contacts.no_guess'));

  const guessed = copy(REAL);
  guessed.contacts[0].inferred = true;
  assert.match(messages(validateCase(guessed)), /pattern-guessed/);

  const wrongSource = copy(REAL);
  wrongSource.contacts[0].source_ids = ['S04'];
  assert.match(messages(validateCase(wrongSource)), /primary page or organization source/);
  assert.equal(V.SOURCE_KINDS.organizer_archive.publishes_contacts, false);

  const blank = copy(REAL);
  delete blank.contacts[0].email;
  blank.contacts[0].published = false;
  assert.deepEqual(errorsIn(validateCase(blank)), [], 'a contact with no published detail is allowed to stay blank');
});

test('unconfirmed prices stay unquoted and no number is invented', () => {
  const invented = copy(REAL);
  invented.cost_model.customer_package[0].amount = 1495;
  assert.match(messages(validateCase(invented)), /Do not invent numbers/);

  const quoted = copy(REAL);
  quoted.cost_model.customer_package[0].quoted = true;
  quoted.cost_model.customer_package[0].amount = 1495;
  assert.match(messages(validateCase(quoted)), /documented, approved price/);

  const leaked = copy(REAL);
  leaked.cost_model.fixed[0].reuse = 'customer-safe';
  assert.ok(checks(validateCase(leaked)).includes('pricing.provisional_defaults'));

  const spine = renderCase(loadCase(REAL)).files.get('01-fact-spine.md');
  assert.match(spine, /\| March 3 festival package price \| _unquoted_ \| 5 \| to_be_confirmed \|/);
});

test('the four entity layers each resolve to their parent', () => {
  const orphanUnit = copy(REAL);
  orphanUnit.units[0].account_id = 'missing-school';
  assert.ok(checks(validateCase(orphanUnit)).includes('entities.layers'));

  const crossed = copy(REAL);
  crossed.opportunities[0].unit_id = 'salem-symphonic-band';
  assert.match(messages(validateCase(crossed)), /different account/);

  const duplicate = copy(REAL);
  duplicate.opportunities[1].id = duplicate.opportunities[0].id;
  assert.match(messages(validateCase(duplicate)), /Duplicate or missing opportunity id/);

  const otherEvent = copy(REAL);
  otherEvent.opportunities[0].event_id = 'troen-carnegie-2027-03-31';
  assert.ok(checks(validateCase(otherEvent)).includes('event.scope'));
});

test('all five status vectors are present with allowed values', () => {
  assert.deepEqual(Object.keys(V.STATUS_VECTORS).length, 5);
  const missing = copy(REAL);
  delete missing.opportunities[0].status_vectors.payment_state;
  assert.match(messages(validateCase(missing)), /Missing status vector "payment_state"/);

  const invented = copy(REAL);
  invented.opportunities[0].status_vectors.payment_state = 'Paid in full';
  assert.match(messages(validateCase(invented)), /not an allowed Payment/);

  const unknownVector = copy(REAL);
  unknownVector.opportunities[0].status_vectors.vibe = 'Good';
  assert.match(messages(validateCase(unknownVector)), /Unknown status vector "vibe"/);
});

test('the action brief lists blocking dependencies only', () => {
  const rehearsal = loadCase(REHEARSAL);
  const [wind, strings] = rehearsal.opportunities;
  assert.deepEqual(blockersFor(wind).map(entry => entry.name), ['contract_execution', 'payment_state', 'supplier_feasibility']);
  assert.deepEqual(blockersFor(strings), []);

  const brief = renderCase(rehearsal).files.get('03-action-brief.md');
  assert.match(brief, /### Logistics and software developer/);
  assert.match(brief, /### Event coordination \(rehearsal role\)/);
  assert.match(brief, /\| Supplier \/ logistics feasibility \| Supplier objection \|/);
  assert.doesNotMatch(brief, /\| Proposal readiness \| Drafted \|/);
  assert.match(brief, /Waiting: Proposal readiness, Institutional approval\./);
  assert.match(brief, /No blocking dependency\./);
});

test('nothing reaches CRM staging without published detail, permission and a relationship owner', () => {
  const real = loadCase(REAL);
  const staged = renderCase(real).files.get('04-crm-staging.csv').trim().split('\n');
  assert.equal(staged.length, 1, 'header only: no researched record is CRM-ready');
  const blocked = renderCase(real).files.get('04-crm-blocked.csv');
  assert.match(blocked, /Contact,wando-director-of-bands,Bobby Lambert,"Held in local staging: permission_to_contact ""unknown""\."/);
  assert.match(blocked, /No CRM-ready contact on this account/);

  const halfWay = copy(REAL);
  halfWay.contacts[0].crm_ready = true;
  const findings = validateCase(halfWay);
  assert.match(messages(findings), /recorded permission to contact/);
  assert.match(messages(findings), /known relationship owner/);

  const permitted = copy(REAL);
  permitted.contacts[0].crm_ready = true;
  permitted.contacts[0].permission_to_contact = 'granted';
  permitted.accounts[0].relationship_owner = 'Troen';
  assert.deepEqual(errorsIn(validateCase(permitted)), []);
  const exported = renderCase(permitted).files.get('04-crm-staging.csv');
  assert.match(exported, /Contact,wando-director-of-bands,wando-high-sc-mount-pleasant,Bobby Lambert,Director of Bands,director@wandobands\.org,https:\/\/wandobands\.org\/contact\/,Documented,2026-09-10/);
  assert.match(exported, /^crm_object,record_id,account_id,name,role,email,source_url,evidence_class,verification_date$/m);
});

test('an illustrative case is labelled, kept separate and can never be exported', () => {
  const rehearsal = loadCase(REHEARSAL);
  const files = renderCase(rehearsal).files;
  assert.equal(files.get('04-crm-staging.csv').trim().split('\n').length, 1);
  assert.match(files.get('04-crm-blocked.csv'), /Illustrative case: synthetic records never reach a CRM or a marketing list\./);
  for (const name of ['01-fact-spine.md', '03-action-brief.md', '05-walkthrough.md']) {
    assert.match(files.get(name), /\*\*Illustrative case\.\*\*/);
  }

  const promoted = copy(REHEARSAL);
  promoted.accounts[0].tier = 1;
  promoted.accounts[0].source_ids = ['P01'];
  assert.match(messages(validateCase(promoted)), /every account, unit, contact, opportunity and scenario is tier 4/);

  const invented = copy(REHEARSAL);
  invented.contacts[0].email = 'director@example-charter.org';
  invented.contacts[0].published = true;
  assert.match(messages(validateCase(invented)), /never carries contact details/);

  const exported = copy(REHEARSAL);
  exported.contacts[0].crm_ready = true;
  assert.match(messages(validateCase(exported)), /illustrative contact is never CRM-ready/);

  const collision = copy(REAL);
  collision.scenarios[0].id = collision.opportunities[0].id;
  assert.match(messages(validateCase(collision)), /must not reuse a real opportunity id/);

  const unlabelled = copy(REAL);
  unlabelled.scenarios[0].fictional = false;
  assert.match(messages(validateCase(unlabelled)), /explicitly fictional/);

  const unnoticed = copy(REAL);
  delete unnoticed.scenarios[0].notice;
  assert.match(messages(validateCase(unnoticed)), /needs a visible notice/);
});

test('a second use case inherits the event spine instead of restating it', () => {
  const rehearsal = loadCase(REHEARSAL);
  assert.equal(rehearsal.case.inherits_from, REAL);
  assert.equal(rehearsal.event.id, REAL);
  assert.ok(rehearsal.fact_spine.some(fact => fact.id === 'F01'));
  assert.ok(rehearsal.fact_spine.some(fact => fact.id === 'X01'));
  assert.equal(rehearsal.cost_model.customer_package[0].amount, null);
  assert.match(renderCase(rehearsal).files.get('01-fact-spine.md'), /inherited from case `troen-carnegie-2027-03-03`/);
});

test('named deliverables and walkthrough artifacts must exist in the repository', () => {
  const missing = copy(REAL);
  missing.deliverables[0].paths = ['docs/carnegie-hall/materials/Does Not Exist.docx'];
  assert.match(messages(validateCase(missing)), /Deliverable file not found/);

  const ghost = copy(REAL);
  ghost.walkthrough[1].artifacts = ['demo/carnegie-hall/not-here.json'];
  assert.match(messages(validateCase(ghost)), /Artifact not found/);

  const incomplete = copy(REAL);
  incomplete.walkthrough = incomplete.walkthrough.filter(moment => moment.number !== 3);
  assert.match(messages(validateCase(incomplete)), /Moment 3 \(See the conversation material\) is missing/);

  const walkthrough = renderCase(loadCase(REAL)).files.get('05-walkthrough.md');
  assert.equal((walkthrough.match(/\| Ready \|/g) || []).length, 5);
});

test('sources need a reachable locator and a known kind', () => {
  const broken = copy(REAL);
  broken.sources.find(source => source.id === 'P01').locator = 'logistics/missing.pdf';
  assert.match(messages(validateCase(broken)), /Source path not found/);

  const unknownKind = copy(REAL);
  unknownKind.sources[0].kind = 'vibes';
  assert.match(messages(validateCase(unknownKind)), /Unknown source kind/);

  const duplicate = copy(REAL);
  duplicate.sources[1].id = duplicate.sources[0].id;
  assert.match(messages(validateCase(duplicate)), /Duplicate or missing source id/);
});

test('staging CSVs are safe to open in a spreadsheet', () => {
  const data = copy(REAL);
  data.accounts[0].name = '=HYPERLINK("http://evil","click")';
  const staging = renderCase(data).files.get('02-research-staging.csv');
  assert.match(staging, /"'=HYPERLINK\(""http:\/\/evil"",""click""\)"/);
});
