/* Load and check one trip record. Findings use the same shape as pipeline/validate.cjs:
   { severity, check, id, message }. Errors block rendering; warnings are reported and kept. */
const fs = require('node:fs');
const path = require('node:path');
const S = require('./schema.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const tripsDir = path.join(__dirname, 'trips');
const isoShape = /^\d{4}-\d{2}-\d{2}$/;
/* A shape check accepts 2027-13-05. Round-tripping through Date rejects it. */
function isoDate(value) {
  if (!isoShape.test(value || '')) return false;
  const [y, m, d] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}
/* Zero-padded only, so ordering can compare minutes rather than strings: "9:30" sorts
   after "10:00" lexically, which silently inverted the slot-order check. */
const clockTime = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutesOf = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

function tripFiles() {
  return fs.readdirSync(tripsDir).filter(name => name.endsWith('.trip.json')).sort()
    .map(name => path.join(tripsDir, name));
}

function tripIds() {
  return tripFiles().map(file => path.basename(file, '.trip.json'));
}

function resolveTrip(nameOrPath) {
  if (nameOrPath && nameOrPath.endsWith('.trip.json') && fs.existsSync(nameOrPath)) return path.resolve(nameOrPath);
  const direct = path.join(tripsDir, `${nameOrPath}.trip.json`);
  if (fs.existsSync(direct)) return direct;
  throw new Error(`No trip file for "${nameOrPath}". Available: ${tripIds().join(', ')}`);
}

function loadTrip(nameOrPath) {
  const file = resolveTrip(nameOrPath);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data._file = path.relative(repoRoot, file);
  return data;
}

/* Every priced or timed line in day order. Renderers use this instead of walking days themselves. */
function lines(trip) {
  const out = [];
  for (const day of trip.days || []) {
    for (const slot of day.slots || []) out.push({ day, slot });
  }
  return out;
}

const supplierIndex = trip => new Map((trip.suppliers || []).map(supplier => [supplier.id, supplier]));

/* Which itinerary slots a supplier actually covers. One counterparty can cover several lines —
   that is the difference between one phone call and three. */
function slotsForSupplier(trip, supplierId) {
  return lines(trip).filter(({ slot }) => slot.supplier_id === supplierId);
}

function validateTrip(trip, options = {}) {
  const findings = [];
  const fail = (check, id, message) => findings.push({ severity: 'error', check, id, message });
  const warn = (check, id, message) => findings.push({ severity: 'warning', check, id, message });

  /* trip.shape */
  for (const key of ['trip', 'suppliers', 'days', 'inclusions', 'exclusions', 'pricing', 'sources']) {
    if (!trip[key]) fail('trip.shape', key, `Missing required section "${key}".`);
  }
  if (findings.length) return findings;
  const head = trip.trip;
  if (!head.id) fail('trip.shape', 'trip.id', 'The trip needs an id.');
  for (const field of ['start_date', 'end_date', 'prepared_on']) {
    if (!isoDate(head[field])) fail('trip.shape', `trip.${field}`, `${field} must be a real date as YYYY-MM-DD.`);
  }
  if (isoDate(head.start_date) && isoDate(head.end_date) && head.end_date < head.start_date) {
    fail('trip.shape', 'trip.end_date', 'The trip ends before it starts.');
  }
  if (!head.version) fail('trip.shape', 'trip.version', 'Every trip record carries a version so two printings can be told apart.');
  if (head.supersedes) {
    if (head.supersedes === head.id) fail('trip.shape', 'trip.supersedes', 'A trip cannot supersede itself.');
    else if (!tripIds().includes(head.supersedes)) {
      fail('trip.shape', 'trip.supersedes', `Superseded record "${head.supersedes}" does not exist. A renderer would throw on it.`);
    }
  }

  /* sources.integrity */
  const sources = new Map();
  for (const source of trip.sources) {
    if (!source.id || sources.has(source.id)) fail('sources.integrity', source.id, 'Duplicate or missing source id.');
    if (!S.SOURCE_KINDS[source.kind]) fail('sources.integrity', source.id, `Unknown source kind "${source.kind}".`);
    if (!source.locator) fail('sources.integrity', source.id, 'Every source needs a locator.');
    /* Trip sources record captured_on; the universal pipeline uses checked_on. Accept either
       and require one: an undated source cannot be re-checked later. */
    const dated = source.captured_on || source.checked_on;
    if (!dated) fail('sources.integrity', source.id, 'Every source records when it was captured or checked.');
    else if (!isoDate(dated)) fail('sources.integrity', source.id, 'captured_on/checked_on must be a real date as YYYY-MM-DD.');
    sources.set(source.id, source);
  }
  const checkRefs = (check, id, ids) => {
    for (const ref of ids || []) if (!sources.has(ref)) fail(check, id, `Unknown source_id "${ref}".`);
  };

  /* The record carries source_ids in eleven places and enumerating them goes stale the moment
     a section is added, so walk the whole record instead and check every one, naming its path. */
  const walkSourceRefs = (node, trail) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walkSourceRefs(item, `${trail}[${index}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === '_file') continue;
      const path = trail ? `${trail}.${key}` : key;
      if (key === 'source_ids') {
        if (!Array.isArray(value)) fail('evidence.references', path, 'source_ids must be an array.');
        else for (const ref of value) {
          if (!sources.has(ref)) fail('evidence.references', path, `Unknown source_id "${ref}".`);
        }
        continue;
      }
      walkSourceRefs(value, path);
    }
  };

  /* suppliers.terms */
  const suppliers = supplierIndex(trip);
  if (suppliers.size !== (trip.suppliers || []).length) fail('suppliers.terms', 'suppliers', 'Duplicate supplier id.');
  for (const supplier of trip.suppliers) {
    const label = `supplier:${supplier.id}`;
    if (!supplier.name) fail('suppliers.terms', label, 'Supplier needs a name.');
    if (!S.SUPPLIER_CATEGORIES.includes(supplier.category)) {
      fail('suppliers.terms', label, `Unknown supplier category "${supplier.category}".`);
    }
    checkRefs('suppliers.terms', label, supplier.source_ids);
    const terms = supplier.terms || {};
    for (const key of Object.keys(terms)) {
      if (!S.TERM_FIELDS.includes(key)) warn('suppliers.terms', label, `"${key}" is a note, not a recognised term field.`);
    }
    const price = terms.unit_price;
    if (price) {
      if (typeof price.amount !== 'number') fail('suppliers.terms', label, 'A unit price needs a numeric amount.');
      if (!S.COST_BASIS[price.basis]) fail('suppliers.terms', label, `Unit price needs a known basis (${Object.keys(S.COST_BASIS).join(', ')}).`);
      if (!(supplier.source_ids || []).length) fail('suppliers.terms', label, 'A priced supplier needs the source the price came from.');
    }
    const comp = terms.comp_policy;
    if (comp && !S.COMP_KINDS[comp.kind]) fail('suppliers.terms', label, `Comp policy needs a kind (${Object.keys(S.COMP_KINDS).join(', ')}).`);
    for (const attempt of supplier.attempts || []) {
      if (!isoDate(attempt.date)) fail('suppliers.terms', label, 'Each contact attempt needs a real YYYY-MM-DD date.');
      if (!S.CHANNELS.includes(attempt.channel)) fail('suppliers.terms', label, `Unknown contact channel "${attempt.channel}".`);
    }
  }

  /* days.slots */
  const slotIds = new Set();
  const dayDates = [];
  for (const day of trip.days) {
    if (!isoDate(day.date)) fail('days.slots', `day:${day.date}`, 'Each day needs a real YYYY-MM-DD date.');
    else {
      if (day.date < head.start_date || day.date > head.end_date) {
        fail('days.slots', `day:${day.date}`, 'Day falls outside the trip dates.');
      }
      if (dayDates.includes(day.date)) fail('days.slots', `day:${day.date}`, 'Duplicate day.');
      dayDates.push(day.date);
    }
    let previous = '';
    for (const slot of day.slots || []) {
      const label = `slot:${slot.id}`;
      if (!slot.id || slotIds.has(slot.id)) fail('days.slots', label, 'Duplicate or missing slot id.');
      slotIds.add(slot.id);
      if (!clockTime.test(slot.time || '')) fail('days.slots', label, `Slot time must be zero-padded 24-hour HH:MM; found ${JSON.stringify(slot.time)}.`);
      else {
        if (previous && minutesOf(slot.time) < minutesOf(previous)) {
          warn('days.slots', label, `Slot runs earlier than the one before it (${slot.time} after ${previous}).`);
        }
        previous = slot.time;
      }
      if (!slot.title) fail('days.slots', label, 'Slot needs a title.');
      if (slot.supplier_id && !suppliers.has(slot.supplier_id)) fail('days.slots', label, `Unknown supplier "${slot.supplier_id}".`);
      if (slot.supplier_id && !S.lineState(slot.state)) {
        fail('days.slots', label, `A supplied line needs a state (${Object.keys(S.LINE_STATES).join(', ')}).`);
      }
      if (slot.state && !S.lineState(slot.state)) fail('days.slots', label, `Unknown line state "${slot.state}".`);
      checkRefs('days.slots', label, slot.source_ids);
      if (slot.supplier_id && !S.isClear(slot.state)) {
        warn('days.slots', label, `Not confirmed: ${S.clientWord(slot.state)}.`);
      }
    }
  }

  /* inclusions.coverage — an inclusion is sold; it needs somewhere to happen. */
  for (const inclusion of trip.inclusions) {
    const label = `inclusion:${inclusion.id}`;
    if (!inclusion.text) fail('inclusions.coverage', label, 'Inclusion needs its printed text.');
    for (const ref of inclusion.slot_ids || []) {
      if (!slotIds.has(ref)) fail('inclusions.coverage', label, `Unknown slot "${ref}".`);
    }
    if (!(inclusion.slot_ids || []).length) {
      warn('inclusions.coverage', label, 'Priced inclusion with no itinerary slot.');
    }
  }

  /* pricing.tiers */
  const pricing = trip.pricing || {};
  const tiers = (head.headcount || {}).tiers || [];
  if (!tiers.length) fail('pricing.tiers', 'headcount.tiers', 'Record the headcount tiers the price table is quoted at.');
  const checkTable = (table, where) => {
    for (const [tier, row] of Object.entries(table || {})) {
      const label = `${where}:${tier}`;
      if (!tiers.includes(Number(tier))) fail('pricing.tiers', label, `Published price tier ${tier} is not a declared headcount tier.`);
      if (!row || typeof row !== 'object') { fail('pricing.tiers', label, 'Price row is not a set of occupancy prices.'); continue; }
      for (const occupancy of S.OCCUPANCY) {
        if (typeof row[occupancy] !== 'number') fail('pricing.tiers', label, `Missing ${occupancy} price.`);
      }
    }
  };
  checkTable(pricing.published, 'pricing');
  if (pricing.observed_variant) checkTable(pricing.observed_variant.published, 'pricing.observed_variant');
  const comps = (head.headcount || {}).trip_granted_comps;
  if (comps !== undefined && typeof comps !== 'number') {
    fail('pricing.tiers', 'headcount.trip_granted_comps', 'Trip-granted comps must be a number, kept separate from vendor-earned comps.');
  }

  /* references.suppliers — a ghost supplier id used to validate clean and surface only as
     "undefined" inside a rendered document. */
  const supplierRef = (label, id) => {
    if (id !== undefined && id !== null && !suppliers.has(id)) {
      fail('references.suppliers', label, `Unknown supplier "${id}".`);
    }
  };
  for (const supplier of trip.suppliers) {
    for (const related of supplier.related_supplier_ids || []) {
      if (related === supplier.id) fail('references.suppliers', `supplier:${supplier.id}`, 'A supplier cannot be related to itself.');
      else supplierRef(`supplier:${supplier.id}`, related);
    }
  }
  for (const inclusion of trip.inclusions) supplierRef(`inclusion:${inclusion.id}`, inclusion.supplier_id);
  for (const group of ['components_per_person', 'known_unit_prices']) {
    for (const entry of (pricing[group] || [])) {
      supplierRef(`pricing.${group}:${entry.label || entry.supplier_id}`, entry.supplier_id);
    }
  }

  walkSourceRefs(trip, '');
  return findings;
}

const errorsIn = findings => findings.filter(f => f.severity === 'error');

function assertValidTrip(trip, options) {
  const findings = validateTrip(trip, options);
  const errors = errorsIn(findings);
  if (errors.length) {
    throw new Error(`${errors.length} trip error(s):\n` + errors.map(e => `  [${e.check}] ${e.id}: ${e.message}`).join('\n'));
  }
  return findings;
}

module.exports = {
  loadTrip, validateTrip, assertValidTrip, tripFiles, tripIds, resolveTrip,
  lines, supplierIndex, slotsForSupplier, errorsIn, repoRoot, tripsDir
};
