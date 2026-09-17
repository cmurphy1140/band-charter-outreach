/* Governance checks for one pipeline case. Errors block rendering and CRM staging; warnings are
   reported and kept. Every check is named so the governance report says what was actually enforced. */
const fs = require('node:fs');
const path = require('node:path');
const V = require('./vocabulary.cjs');

const repoRoot = path.resolve(__dirname, '..');
const casesDir = path.join(__dirname, 'cases');
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const ENTITY_KINDS = new Set(['account', 'unit', 'contact', 'opportunity', 'scenario']);

function caseFiles() {
  return fs.readdirSync(casesDir).filter(name => name.endsWith('.case.json')).sort()
    .map(name => path.join(casesDir, name));
}

function resolveCase(nameOrPath) {
  if (nameOrPath && fs.existsSync(nameOrPath) && nameOrPath.endsWith('.case.json')) return path.resolve(nameOrPath);
  const direct = path.join(casesDir, `${nameOrPath}.case.json`);
  if (fs.existsSync(direct)) return direct;
  throw new Error(`No case file for "${nameOrPath}". Available: ${caseFiles().map(f => path.basename(f, '.case.json')).join(', ')}`);
}

/* A case may inherit one event fact spine: the event, its sources, facts and cost model come from
   the base case, and this case adds only the prospect side. That is the per-use-case iteration. */
function loadCase(nameOrPath) {
  const file = resolveCase(nameOrPath);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data._file = path.relative(repoRoot, file);
  if (data.extends_event) {
    const id = (data.case || {}).id || data._file;
    const base = loadCase(data.extends_event);
    if (base.extends_event) throw new Error(`${id}: an inherited event spine cannot itself inherit one.`);
    if (data.event) throw new Error(`${id}: a case that extends ${base.case.id} inherits its event and must not redefine it.`);
    const ids = new Set(base.sources.map(source => source.id));
    for (const source of data.sources || []) {
      if (ids.has(source.id)) throw new Error(`${id}: source id "${source.id}" collides with the inherited spine. Use a distinct prefix.`);
    }
    const factIds = new Set(base.fact_spine.map(fact => fact.id));
    for (const fact of data.fact_spine || []) {
      if (factIds.has(fact.id)) throw new Error(`${id}: fact id "${fact.id}" collides with the inherited spine. Use a distinct prefix.`);
    }
    data.event = base.event;
    data.sources = [...base.sources, ...(data.sources || [])];
    data.fact_spine = [...base.fact_spine, ...(data.fact_spine || [])];
    data.cost_model = data.cost_model || base.cost_model;
    data.case = { ...(data.case || {}), inherits_from: base.case.id };
  }
  return data;
}

/* Records that carry an evidence tier, in a stable order. */
function tieredRecords(data) {
  const out = [];
  const add = (kind, list, key = 'id') => (list || []).forEach(item => out.push({ kind, id: item[key], record: item }));
  add('fact', data.fact_spine);
  ['fixed', 'variable_per_person', 'customer_package'].forEach(group =>
    add(`cost:${group}`, (data.cost_model || {})[group], 'label'));
  add('account', data.accounts);
  add('unit', data.units);
  add('contact', data.contacts);
  add('opportunity', data.opportunities);
  add('scenario', data.scenarios);
  return out;
}

function validateCase(data, options = {}) {
  const findings = [];
  const root = options.repoRoot || repoRoot;
  const fail = (check, id, message) => findings.push({ severity: 'error', check, id, message });
  const warn = (check, id, message) => findings.push({ severity: 'warning', check, id, message });
  const exists = target => fs.existsSync(path.join(root, target));

  /* case.shape */
  for (const key of ['case', 'event', 'sources', 'fact_spine', 'cost_model', 'accounts', 'opportunities', 'deliverables', 'walkthrough']) {
    if (!data[key]) fail('case.shape', key, `Missing required section "${key}".`);
  }
  if (!data.case || !data.case.id) fail('case.shape', 'case.id', 'The case needs an id.');
  if (data.case && !isoDate.test(data.case.prepared_on || '')) fail('case.shape', 'case.prepared_on', 'Record prepared_on as YYYY-MM-DD.');
  if (findings.some(f => f.severity === 'error')) return findings;
  const illustrativeCase = data.case.illustrative === true;

  /* event.scope */
  if (!isoDate.test(data.event.date || '')) fail('event.scope', data.event.id, 'Record the event date as YYYY-MM-DD.');
  if (!data.event.id) fail('event.scope', 'event.id', 'The event needs an id.');

  /* sources.integrity */
  const sources = new Map();
  for (const source of data.sources) {
    if (!source.id || sources.has(source.id)) fail('sources.integrity', source.id, 'Duplicate or missing source id.');
    if (!V.SOURCE_KINDS[source.kind]) fail('sources.integrity', source.id, `Unknown source kind "${source.kind}".`);
    if (!source.locator) fail('sources.integrity', source.id, 'Every source needs a locator: a URL or a repository path.');
    else if (/^https?:\/\//.test(source.locator)) {
      try {
        if (!/^https?:$/.test(new URL(source.locator).protocol)) fail('sources.integrity', source.id, 'Unsafe source URL.');
      } catch { fail('sources.integrity', source.id, `Unparseable source URL: ${source.locator}`); }
    } else if (!exists(source.locator)) fail('sources.integrity', source.id, `Source path not found: ${source.locator}`);
    if (source.checked_on && !isoDate.test(source.checked_on)) fail('sources.integrity', source.id, 'checked_on must be YYYY-MM-DD.');
    sources.set(source.id, source);
  }

  /* evidence.tiers and evidence.references */
  for (const { kind, id, record } of tieredRecords(data)) {
    const tier = V.tierOf(record.tier);
    const label = `${kind}:${id}`;
    if (!tier) { fail('evidence.tiers', label, `Evidence tier must be 1-5; found ${JSON.stringify(record.tier)}.`); continue; }
    if (tier.requires === 'source_ids' && !(record.source_ids || []).length) {
      fail('evidence.tiers', label, `Tier ${record.tier} (${tier.label}) needs at least one source_id.`);
    }
    if (tier.requires === 'basis' && !record.basis) fail('evidence.tiers', label, 'Tier 3 needs a "basis" describing the reasoning.');
    if (tier.requires === 'illustrative' && record.illustrative !== true) fail('evidence.tiers', label, 'Tier 4 must set "illustrative": true.');
    if (tier.requires === 'needed_for' && !record.needed_for) fail('evidence.tiers', label, 'Tier 5 needs "needed_for": the action that makes this fact necessary.');
    for (const ref of record.source_ids || []) {
      if (!sources.has(ref)) fail('evidence.references', label, `Unknown source_id "${ref}".`);
    }
    if (record.reuse && !V.REUSE[record.reuse]) fail('claims.reuse', label, `Unknown reuse value "${record.reuse}".`);
    if (record.reuse === 'customer-safe' && !tier.customer_safe) {
      fail('claims.reuse', label, `Tier ${record.tier} (${tier.label}) cannot be marked customer-safe.`);
    }
    if (illustrativeCase && ENTITY_KINDS.has(kind) && record.tier !== 4) {
      fail('illustrative.separation', label, 'In an illustrative case every account, unit, contact, opportunity and scenario is tier 4.');
    }
  }

  /* pricing.provisional_defaults */
  const cost = data.cost_model || {};
  for (const group of ['fixed', 'variable_per_person']) {
    for (const entry of cost[group] || []) {
      const label = `cost:${group}:${entry.label}`;
      if (typeof entry.amount !== 'number') fail('pricing.provisional_defaults', label, 'Internal cost entries record a numeric amount or move to customer_package.');
      if (entry.tier > 2) fail('pricing.provisional_defaults', label, 'An internal figure needs documented or business-reported evidence.');
      if (entry.reuse !== 'internal-only') fail('pricing.provisional_defaults', label, 'Internal cost figures stay internal-only.');
    }
  }
  for (const entry of cost.customer_package || []) {
    const label = `cost:customer_package:${entry.label}`;
    if (entry.quoted === true) {
      if (entry.tier !== 1) fail('pricing.provisional_defaults', label, 'Only a documented, approved price may be quoted.');
      if (typeof entry.amount !== 'number') fail('pricing.provisional_defaults', label, 'A quoted package price needs its approved amount.');
    } else {
      if (entry.amount !== null && entry.amount !== undefined) fail('pricing.provisional_defaults', label, 'An unquoted package price must leave "amount" null. Do not invent numbers.');
      if (entry.status !== 'to_be_confirmed') fail('pricing.provisional_defaults', label, 'An unquoted package price is marked "to_be_confirmed".');
    }
  }

  /* entities.layers */
  const accounts = new Map();
  for (const account of data.accounts) {
    if (!account.id || accounts.has(account.id)) fail('entities.layers', `account:${account.id}`, 'Duplicate or missing account id.');
    accounts.set(account.id, account);
  }
  const units = new Map();
  for (const unit of data.units || []) {
    if (!unit.id || units.has(unit.id)) fail('entities.layers', `unit:${unit.id}`, 'Duplicate or missing unit id.');
    if (!accounts.has(unit.account_id)) fail('entities.layers', `unit:${unit.id}`, `Unit does not resolve to an account ("${unit.account_id}").`);
    units.set(unit.id, unit);
  }
  const contacts = new Map();
  for (const contact of data.contacts || []) {
    if (!contact.id || contacts.has(contact.id)) fail('entities.layers', `contact:${contact.id}`, 'Duplicate or missing contact id.');
    if (!accounts.has(contact.account_id)) fail('entities.layers', `contact:${contact.id}`, `Contact does not resolve to an account ("${contact.account_id}").`);
    contacts.set(contact.id, contact);
  }
  const opportunities = new Map();
  for (const opportunity of data.opportunities) {
    const label = `opportunity:${opportunity.id}`;
    if (!opportunity.id || opportunities.has(opportunity.id)) fail('entities.layers', label, 'Duplicate or missing opportunity id.');
    if (!accounts.has(opportunity.account_id)) fail('entities.layers', label, `Opportunity does not resolve to an account ("${opportunity.account_id}").`);
    if (opportunity.unit_id) {
      const unit = units.get(opportunity.unit_id);
      if (!unit) fail('entities.layers', label, `Unknown unit "${opportunity.unit_id}".`);
      else if (unit.account_id !== opportunity.account_id) fail('entities.layers', label, 'Opportunity unit belongs to a different account.');
    }
    if (opportunity.event_id !== data.event.id) fail('event.scope', label, `Opportunity is outside this case event (${data.event.id}).`);
    opportunities.set(opportunity.id, opportunity);

    /* workflow.vectors */
    const vectors = opportunity.status_vectors || {};
    for (const [name, spec] of Object.entries(V.STATUS_VECTORS)) {
      const value = vectors[name];
      if (value === undefined) fail('workflow.vectors', label, `Missing status vector "${name}".`);
      else if (!V.vectorClass(name, value)) fail('workflow.vectors', label, `"${value}" is not an allowed ${spec.label} value.`);
    }
    for (const name of Object.keys(vectors)) {
      if (!V.STATUS_VECTORS[name]) fail('workflow.vectors', label, `Unknown status vector "${name}".`);
    }
    if (!opportunity.next_action) warn('workflow.vectors', label, 'No next action recorded.');
  }

  /* contacts.no_guess and crm.gating */
  for (const contact of contacts.values()) {
    const label = `contact:${contact.id}`;
    const hasDetail = Boolean(contact.email || contact.phone);
    if (contact.inferred === true) fail('contacts.no_guess', label, 'Inferred or pattern-guessed contact details are never recorded. Leave the field blank.');
    if (illustrativeCase && hasDetail) fail('contacts.no_guess', label, 'An illustrative case never carries contact details, invented or otherwise.');
    if (hasDetail) {
      if (contact.published !== true) fail('contacts.no_guess', label, 'Contact details are recorded only when published on a primary page.');
      const publishing = (contact.source_ids || []).map(id => sources.get(id)).filter(Boolean)
        .filter(source => V.SOURCE_KINDS[source.kind] && V.SOURCE_KINDS[source.kind].publishes_contacts);
      if (!publishing.length) fail('contacts.no_guess', label, 'A published contact needs a primary page or organization source that prints it.');
      if (!contact.status) warn('contacts.no_guess', label, 'No note on deliverability or permission to send.');
    }
    const account = accounts.get(contact.account_id);
    if (contact.crm_ready === true) {
      if (illustrativeCase || contact.tier === 4) fail('crm.gating', label, 'An illustrative contact is never CRM-ready.');
      if (contact.published !== true) fail('crm.gating', label, 'Only a published, sourced contact can be CRM-ready.');
      if (contact.permission_to_contact !== 'granted') fail('crm.gating', label, 'CRM-ready needs recorded permission to contact.');
      if (account && !account.relationship_owner) fail('crm.gating', label, 'CRM-ready needs a known relationship owner on the account.');
    } else if (hasDetail) {
      warn('crm.gating', label, `Held in local staging only: permission_to_contact is "${contact.permission_to_contact || 'unknown'}".`);
    }
  }

  /* illustrative.separation */
  for (const scenario of data.scenarios || []) {
    const label = `scenario:${scenario.id}`;
    if (scenario.fictional !== true) fail('illustrative.separation', label, 'Workflow scenarios stay explicitly fictional.');
    if (!scenario.notice) fail('illustrative.separation', label, 'A fictional scenario needs a visible notice.');
    if (opportunities.has(scenario.id)) fail('illustrative.separation', label, 'A scenario id must not reuse a real opportunity id.');
  }

  /* deliverables.paths */
  const factsById = new Map((data.fact_spine || []).map(fact => [fact.id, fact]));
  for (const deliverable of data.deliverables) {
    const label = `deliverable:${deliverable.kind}`;
    if (!V.DELIVERABLES[deliverable.kind]) fail('deliverables.paths', label, `Unknown deliverable kind "${deliverable.kind}".`);
    for (const target of deliverable.paths || []) {
      if (!exists(target)) fail('deliverables.paths', label, `Deliverable file not found: ${target}`);
    }
    if (!(deliverable.paths || []).length) warn('deliverables.paths', label, 'Planned deliverable with no file yet.');
    for (const ref of deliverable.fact_ids || []) {
      const fact = factsById.get(ref);
      if (!fact) fail('deliverables.paths', label, `Unknown fact_id "${ref}".`);
      else if (deliverable.issued === true && fact.reuse !== 'customer-safe') {
        fail('claims.reuse', label, `Issued deliverable cites internal-only fact "${ref}".`);
      }
    }
  }

  /* walkthrough.moments */
  const seen = new Set();
  for (const moment of data.walkthrough) {
    const spec = V.MOMENTS.find(m => m.number === moment.number);
    if (!spec) { fail('walkthrough.moments', `moment:${moment.number}`, 'Walkthrough moments are numbered 1-5.'); continue; }
    if (seen.has(moment.number)) fail('walkthrough.moments', `moment:${moment.number}`, 'Duplicate walkthrough moment.');
    seen.add(moment.number);
    if (moment.ready === true && !(moment.artifacts || []).length) fail('walkthrough.moments', `moment:${moment.number}`, 'A ready moment names the artifact that satisfies it.');
    for (const target of moment.artifacts || []) {
      if (!/^https?:\/\//.test(target) && !exists(target)) fail('walkthrough.moments', `moment:${moment.number}`, `Artifact not found: ${target}`);
    }
    if (moment.ready !== true) warn('walkthrough.moments', `moment:${moment.number}`, `${spec.label} is not ready: ${(moment.gap || 'no gap recorded').replace(/\.$/, '')}.`);
  }
  for (const spec of V.MOMENTS) {
    if (!seen.has(spec.number)) fail('walkthrough.moments', `moment:${spec.number}`, `Moment ${spec.number} (${spec.label}) is missing.`);
  }

  return findings;
}

const errorsIn = findings => findings.filter(f => f.severity === 'error');

function assertValid(data, options) {
  const findings = validateCase(data, options);
  const errors = errorsIn(findings);
  if (errors.length) {
    throw new Error(`${errors.length} governance error(s):\n` + errors.map(e => `  [${e.check}] ${e.id}: ${e.message}`).join('\n'));
  }
  return findings;
}

module.exports = { validateCase, assertValid, loadCase, caseFiles, resolveCase, tieredRecords, errorsIn, repoRoot, casesDir };
