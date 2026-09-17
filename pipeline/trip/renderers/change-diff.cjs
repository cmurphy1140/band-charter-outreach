/* change-diff — compare a trip record against the record it supersedes.

   The problem this exists for: two printings of the same trip disagreed about the performance
   venue, a vendor's name, whether the group checks out before the riverboat, what the exclusions
   clause excludes, and every cell of the price table — and nothing anywhere said which of those
   mattered. So this renderer does not merely list differences. It classifies each one:

     material  — a venue, a time on a line a supplier holds, an operational step that stopped
                 being printed, an inclusion, a clause, a published price. Somebody has to be
                 called, or somebody is going to turn up in the wrong place.
     wording   — descriptive copy. Nothing supplied, timed, priced or promised moves with it.

   CLASSIFICATION below is the only thing that decides which. A new field in the record has to be
   added there deliberately, which is the point: the classification is a decision somebody
   reviewed, not a side effect of how a diff happens to walk an object.

   Emits two files, and only for a record that supersedes another one:
     change-diff.md       director-facing: what changed, material first, wording second
     vendor-call-list.md  internal: who has to be called, on what channel, which of their terms
                          it trips, and one line of what to say

   Deterministic: reads the two trip records and schema.cjs. No clock, no randomness, no network.
   Nothing here contacts anyone. It writes a call list; a person makes the calls. */

const { loadTrip, lines, supplierIndex, slotsForSupplier } = require('../load.cjs');
const S = require('../schema.cjs');

/* ---------------------------------------------------------------- text helpers */

/* Markdown table cell: newlines flattened, pipes escaped. Same rule as pipeline/render.cjs. */
const cell = value => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
const money = amount => (typeof amount === 'number' ? `$${amount.toLocaleString('en-US')}` : '—');
const signedMoney = amount => `${amount > 0 ? '+' : amount < 0 ? '-' : '±'}$${Math.abs(amount).toLocaleString('en-US')}`;
const quote = text => `"${cell(text)}"`;
const listOf = values => (values || []).join('; ');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const titleCase = word => word[0].toUpperCase() + word.slice(1);
/* Record ids are for the record. A page somebody reads gets words: exc-pricing-basis -> Pricing basis. */
const humanId = id => titleCase(String(id).replace(/^(exc|inc)-/, '').replace(/[-_]/g, ' '));
const humanField = field => String(field).replace(/_/g, ' ');

const toMinutes = clock => {
  const [h, m] = String(clock).split(':').map(Number);
  return h * 60 + m;
};
const toClock = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/* Numbers inside a sentence. A rewritten blurb is wording; a rewritten blurb whose numbers moved
   is wording that quietly changed a fact, and that difference is worth printing. */
const numbersIn = text => String(text ?? '').match(/\d[\d,.]*\d|\d/g) || [];
const sameNumbers = (a, b) => numbersIn(a).join('|') === numbersIn(b).join('|');

/* Which words a clause gained or lost. Case and punctuation are ignored, and order is not
   compared, because a reordered clause is the same clause. */
function wordDelta(was, now) {
  const normalise = token => token.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const tokens = text => String(text ?? '').split(/\s+/).filter(Boolean);
  const pick = (from, against) => {
    const pool = tokens(against).map(normalise);
    const out = [];
    for (const token of tokens(from)) {
      const key = normalise(token);
      if (!key) continue;
      const at = pool.indexOf(key);
      if (at === -1) out.push(token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''));
      else pool.splice(at, 1);
    }
    return out;
  };
  return { added: pick(now, was), removed: pick(was, now) };
}

/* ------------------------------------------------------- the classification table */

/* group: 'material' or 'wording'. `why` is printed, so the rule is visible to whoever reads the
   page and not only to whoever reviewed the code. `calls` says whether a delta of this kind can
   put a counterparty on the call list. */
const CLASSIFICATION = {
  venue: { group: 'material', calls: true, heading: 'Performance venue', why: 'A different building is a different address, a different load-in and a different set of tickets.' },
  slot_time: { group: 'material', calls: true, heading: 'Time on the itinerary', why: 'A time on a line a supplier holds is a time that supplier has to be able to take.' },
  slot_day: { group: 'material', calls: true, heading: 'Day a line sits on', why: 'A line that moved to a different day moved past every other booking on both days.' },
  slot_dropped: { group: 'material', calls: true, heading: 'Step no longer printed', why: 'An operational step that stops being printed stops being done, because the people who do it read the printed page.' },
  slot_added: { group: 'material', calls: true, heading: 'Step newly printed', why: 'A new line needs a counterparty, a price and room in the day.' },
  slot_title: { group: 'material', calls: true, heading: 'What a line is called', why: 'The title names the business the group will look up, drive to and turn up at.' },
  slot_state: { group: 'material', calls: true, heading: 'How settled a line is', why: 'What the document claims is settled changed.' },
  slot_supplier: { group: 'material', calls: true, heading: 'Who supplies a line', why: 'The counterparty on the line changed.' },
  slot_duration: { group: 'material', calls: true, heading: 'How long a line runs', why: 'Duration decides what the rest of the day can hold.' },
  slot_included: { group: 'material', calls: true, heading: 'Whether a line is included', why: 'Included or at own cost is the difference between a price and a bill on the day.' },
  slot_ops_steps: { group: 'material', calls: true, heading: 'Steps inside a line', why: 'A step inside a line is work somebody has to do.' },
  inclusion_text: { group: 'material', calls: true, heading: 'What is sold', why: 'Inclusions are the sold list. Their wording is what was agreed to.' },
  inclusion_coverage: { group: 'material', calls: true, heading: 'What an inclusion covers', why: 'An inclusion that stops pointing at an itinerary line is sold with nowhere to happen.' },
  inclusion_added: { group: 'material', calls: true, heading: 'Inclusion added', why: 'Something new is being sold.' },
  inclusion_removed: { group: 'material', calls: true, heading: 'Inclusion removed', why: 'Something that was sold is no longer on the list.' },
  exclusion_text: { group: 'material', calls: true, heading: 'Contract wording', why: 'Contractual wording. It decides who pays when something is not on the itinerary.' },
  exclusion_added: { group: 'material', calls: true, heading: 'Clause added', why: 'A new clause in the terms.' },
  exclusion_removed: { group: 'material', calls: true, heading: 'Clause removed', why: 'A clause that governed the sale is gone.' },
  supplier_name: { group: 'material', calls: true, heading: 'Supplier name', why: 'The counterparty is recorded under a different name.' },
  supplier_terms: { group: 'material', calls: true, heading: 'Supplier terms', why: 'A term is what a change trips. If the term itself moved, everything priced against it moves.' },
  supplier_added: { group: 'material', calls: true, heading: 'Supplier added', why: 'A counterparty that was not on the previous record.' },
  supplier_removed: { group: 'material', calls: true, heading: 'Supplier removed', why: 'A counterparty dropped off the record.' },
  price_cell: { group: 'material', calls: true, heading: 'Published price', why: 'A published per-person price. It is what a family pays.' },
  price_tier: { group: 'material', calls: true, heading: 'Price tier', why: 'The headcount the table is quoted at changed.' },
  blurb: { group: 'wording', calls: false, heading: 'Description', why: 'Description only. Nothing supplied, timed, priced or promised moves with it.' }
};

/* Printed fields only. `note` and `source_ids` are record-keeping — they were never on a page the
   director read, so a change to them is not a change to the proposal and is not diffed here. */
const SLOT_FIELDS = [
  { field: 'time', kind: 'slot_time' },
  { field: 'title', kind: 'slot_title' },
  { field: 'state', kind: 'slot_state' },
  { field: 'supplier_id', kind: 'slot_supplier' },
  { field: 'included', kind: 'slot_included' },
  { field: 'duration_minutes', kind: 'slot_duration' },
  { field: 'ops_steps', kind: 'slot_ops_steps' },
  { field: 'blurb', kind: 'blurb' }
];

/* Which of a supplier's terms a given kind of change actually trips. Only fields the supplier has
   on record get printed; a supplier with nothing on record is said so explicitly, because "no
   terms recorded" is the exposure, not the absence of one. */
const TERMS_TRIPPED = {
  venue: ['deposit', 'balance_due_days', 'release_date', 'cancellation', 'payment_methods'],
  slot_time: ['deposit', 'balance_due_days', 'release_date', 'minimum', 'cancellation'],
  slot_day: ['deposit', 'balance_due_days', 'release_date', 'minimum', 'cancellation'],
  slot_dropped: ['deposit', 'balance_due_days', 'release_date', 'cancellation'],
  slot_added: ['unit_price', 'minimum', 'release_date'],
  slot_title: ['unit_price', 'minimum', 'cancellation'],
  slot_state: ['deposit', 'release_date', 'cancellation'],
  slot_supplier: ['unit_price', 'deposit', 'cancellation'],
  slot_duration: ['unit_price', 'minimum', 'release_date'],
  slot_included: ['unit_price', 'minimum'],
  slot_ops_steps: ['release_date', 'cancellation'],
  inclusion_text: ['unit_price', 'minimum', 'cancellation'],
  inclusion_coverage: ['unit_price', 'minimum'],
  inclusion_added: ['unit_price', 'minimum'],
  inclusion_removed: ['unit_price', 'cancellation'],
  exclusion_text: ['unit_price', 'cancellation'],
  exclusion_added: ['cancellation'],
  exclusion_removed: ['cancellation'],
  supplier_name: ['unit_price'],
  supplier_terms: S.TERM_FIELDS.filter(field => field !== 'notes'),
  supplier_added: S.TERM_FIELDS.filter(field => field !== 'notes'),
  supplier_removed: ['deposit', 'cancellation'],
  price_cell: ['unit_price', 'minimum', 'comp_policy', 'deposit', 'balance_due_days', 'final_headcount_due_business_days', 'payment_methods'],
  price_tier: ['minimum', 'comp_policy', 'final_headcount_due_business_days']
};

function termLine(field, value) {
  if (value === null || value === undefined) return null;
  switch (field) {
    case 'unit_price': {
      const basis = ((S.COST_BASIS[value.basis] || {}).label || value.basis).toLowerCase();
      return `Unit price — ${money(value.amount)} ${basis}${value.unit_label ? ` (${value.unit_label})` : ''}`;
    }
    case 'minimum':
      return `Minimum — ${value.count} ${value.unit}${value.note ? `. ${value.note}` : ''}`;
    case 'comp_policy': {
      const kind = (S.COMP_KINDS[value.kind] || {}).label || value.kind;
      const ratio = value.ratio ? `, one free place per ${value.ratio} paid` : '';
      const extras = (value.extras || []).length ? `, plus ${listOf(value.extras)}` : '';
      return `Comp policy — ${kind}${ratio}${extras}`;
    }
    case 'deposit':
      return `Deposit — ${money(value.amount)}${value.paid_on ? `, already paid ${value.paid_on}` : ''}`;
    case 'balance_due_days':
      return `Balance — due ${plural(value, 'day', 'days')} after the deposit`;
    case 'final_headcount_due_business_days':
      return `Final headcount — due ${plural(value, 'business day', 'business days')} ahead`;
    case 'payment_methods':
      return `Payment — ${listOf(value)}`;
    case 'release_date':
      return `Release date — ${value}`;
    case 'cancellation':
      return `Cancellation — ${value}`;
    default:
      return `${field} — ${typeof value === 'object' ? JSON.stringify(value) : value}`;
  }
}

/* Which of a supplier's recorded terms the given changes trip, de-duplicated, in schema order. */
function trippedTerms(supplier, changes) {
  const fields = new Set();
  for (const delta of changes) for (const field of TERMS_TRIPPED[delta.kind] || []) fields.add(field);
  const out = [];
  for (const field of S.TERM_FIELDS) {
    if (!fields.has(field)) continue;
    const line = termLine(field, (supplier.terms || {})[field]);
    if (line) out.push({ field, line });
  }
  return out;
}

/* --------------------------------------------------------------- reading a record */

/* The venue this printing actually shows. The record keeps every variant it has seen against the
   version it was seen in, so the printed venue is a property of the version, not a guess. */
function printedVenue(trip, supplier) {
  if (supplier.venue) return supplier.venue;
  const match = (supplier.venue_variants || []).find(variant => variant.observed_in === trip.trip.version);
  return match ? match.name : null;
}

function slotIndex(trip) {
  const map = new Map();
  for (const { day, slot } of lines(trip)) map.set(slot.id, { day, slot });
  return map;
}
const byId = list => new Map((list || []).map(item => [item.id, item]));
const at = entry => `${entry.day.label} · ${entry.slot.time}`;

/* How this version prints a slot. Each version gets its own map: a line whose time moved must read
   with its own time in the "was" column and its new one in the "now" column. */
function slotLabels(trip) {
  const map = new Map();
  for (const { slot } of lines(trip)) map.set(slot.id, `${slot.time} ${slot.title}`);
  return map;
}
const nameSlotsWith = (...maps) => ids => listOf((ids || []).map(id => {
  for (const map of maps) if (map.has(id)) return map.get(id);
  return id;
}));

/* Every consecutive pair of slots in a version, so a new pairing can be told from one that used to
   sit together and no longer works. */
function adjacentPairs(trip) {
  const pairs = new Set();
  for (const day of trip.days || []) {
    const slots = day.slots || [];
    for (let i = 0; i < slots.length - 1; i += 1) pairs.add(`${slots[i].id}>${slots[i + 1].id}`);
  }
  return pairs;
}

/* Key order in a JSON file is not a change. Re-serialising a term with its keys in a different
   order must not put a counterparty on the phone. */
const stable = value => JSON.stringify(value ?? null, (key, item) => (
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]]))
    : item));

/* -------------------------------------------------------------------- the deltas */

function deltas(previous, current) {
  const out = [];
  const add = delta => out.push({ ...CLASSIFICATION[delta.kind], ...delta });

  /* Slot ids are the record's handles, not words anybody reads. Each version names its own lines,
     and a line that only exists on one of them is still named rather than shown as an id. */
  const wasLabels = slotLabels(previous);
  const nowLabels = slotLabels(current);
  const nameWas = nameSlotsWith(wasLabels, nowLabels);
  const nameNow = nameSlotsWith(nowLabels, wasLabels);

  /* Suppliers: name, terms, and the venue this version prints for them. */
  const wasSuppliers = supplierIndex(previous);
  const nowSuppliers = supplierIndex(current);
  const nowSlots = slotIndex(current);
  const supplierWhere = id => {
    const held = slotsForSupplier(current, id);
    return held.length ? `${held[0].day.label} · ${held.map(({ slot }) => slot.time).join(', ')}` : 'no line on this version';
  };

  for (const [id, supplier] of nowSuppliers) {
    const before = wasSuppliers.get(id);
    if (!before) { add({ kind: 'supplier_added', subject: supplier.name, supplier_id: id, was: '—', now: supplier.name }); continue; }
    if (before.name !== supplier.name) {
      add({ kind: 'supplier_name', subject: supplier.name, supplier_id: id, was: before.name, now: supplier.name });
    }
    const wasVenue = printedVenue(previous, before);
    const nowVenue = printedVenue(current, supplier);
    if (wasVenue !== nowVenue) {
      const held = slotsForSupplier(current, id);
      add({
        kind: 'venue', subject: supplier.name, supplier_id: id,
        was: wasVenue || 'not printed', now: nowVenue || 'not printed',
        where: supplierWhere(id), day: held.length ? held[0].day.label : null
      });
    }
    for (const field of S.TERM_FIELDS) {
      if (field === 'notes') continue; /* prose about a term is not the term */
      const a = (before.terms || {})[field];
      const b = (supplier.terms || {})[field];
      if (stable(a) === stable(b)) continue;
      add({
        kind: 'supplier_terms', subject: `${supplier.name} · ${humanField(field)}`, supplier_id: id, field,
        /* Rendered through the same term formatter the call list uses. A director must never be
           shown a JSON blob, and neither must whoever is reading the draft down the phone. */
        was: termLine(field, a) || 'nothing on record',
        now: termLine(field, b) || 'nothing on record',
        where: supplierWhere(id)
      });
    }
  }
  for (const [id, supplier] of wasSuppliers) {
    if (!nowSuppliers.has(id)) add({ kind: 'supplier_removed', subject: supplier.name, supplier_id: id, was: supplier.name, now: '—' });
  }

  /* Slots. */
  const wasSlots = slotIndex(previous);
  for (const [id, entry] of wasSlots) {
    if (nowSlots.has(id)) continue;
    add({
      kind: 'slot_dropped', subject: entry.slot.title, slot_id: id, supplier_id: entry.slot.supplier_id || null,
      day: entry.day.label, where: at(entry), was: entry.slot.title, now: 'not printed',
      dropped_time: entry.slot.time, ops: entry.slot.ops === true
    });
  }
  for (const [id, entry] of nowSlots) {
    const before = wasSlots.get(id);
    if (!before) {
      add({
        kind: 'slot_added', subject: entry.slot.title, slot_id: id, supplier_id: entry.slot.supplier_id || null,
        day: entry.day.label, where: at(entry), was: 'not printed', now: entry.slot.title
      });
      continue;
    }
    /* The day a line sits on lives on the enclosing day, not on the slot, so it has to be compared
       explicitly. A step that moves to another day is the loudest change there is. */
    if (before.day.date !== entry.day.date) {
      add({
        kind: 'slot_day', subject: entry.slot.title, slot_id: id,
        supplier_id: entry.slot.supplier_id || before.slot.supplier_id || null,
        day: entry.day.label, where: at(entry),
        was: `${before.day.label} ${before.slot.time}`, now: `${entry.day.label} ${entry.slot.time}`,
        supplied: Boolean(entry.slot.supplier_id || before.slot.supplier_id)
      });
    }
    for (const { field, kind } of SLOT_FIELDS) {
      const a = before.slot[field];
      const b = entry.slot[field];
      if (stable(a) === stable(b)) continue;
      const show = value => (Array.isArray(value) ? listOf(value) : value === undefined ? 'not printed' : String(value));
      add({
        kind, field, subject: entry.slot.title, slot_id: id,
        supplier_id: entry.slot.supplier_id || before.slot.supplier_id || null,
        day: entry.day.label, where: at(entry), was: show(a), now: show(b),
        supplied: Boolean(entry.slot.supplier_id || before.slot.supplier_id),
        numbers_moved: kind === 'blurb' && !sameNumbers(a, b)
      });
    }
  }

  /* Inclusions — the sold list. */
  const wasInc = byId(previous.inclusions);
  const nowInc = byId(current.inclusions);
  for (const [id, inclusion] of nowInc) {
    const before = wasInc.get(id);
    if (!before) { add({ kind: 'inclusion_added', subject: inclusion.text, inclusion_id: id, supplier_id: inclusion.supplier_id || null, was: '—', now: inclusion.text }); continue; }
    if (before.text !== inclusion.text) {
      add({ kind: 'inclusion_text', subject: inclusion.text, inclusion_id: id, supplier_id: inclusion.supplier_id || null, was: before.text, now: inclusion.text });
    }
    /* Compared as sets. Reordering the ids under an inclusion changes nothing anybody experiences,
       and must not put a counterparty on a call list. */
    const lost = (before.slot_ids || []).filter(slot => !(inclusion.slot_ids || []).includes(slot));
    const gained = (inclusion.slot_ids || []).filter(slot => !(before.slot_ids || []).includes(slot));
    if (lost.length || gained.length) {
      /* A line an inclusion stopped pointing at is not necessarily a line that left the itinerary.
         The two cases read very differently to whoever has to fix it. */
      const gone = lost.filter(slot => !nowSlots.has(slot));
      const kept = lost.filter(slot => nowSlots.has(slot));
      add({
        kind: 'inclusion_coverage', subject: inclusion.text, inclusion_id: id, supplier_id: inclusion.supplier_id || null,
        was: nameWas(before.slot_ids) || 'no itinerary line', now: nameNow(inclusion.slot_ids) || 'no itinerary line',
        lost, gained,
        lost_labels: nameWas(lost), lost_gone: gone, lost_gone_labels: nameWas(gone),
        lost_kept: kept, lost_kept_labels: nameNow(kept), gained_labels: nameNow(gained)
      });
    }
  }
  for (const [id, inclusion] of wasInc) {
    if (!nowInc.has(id)) add({ kind: 'inclusion_removed', subject: inclusion.text, inclusion_id: id, supplier_id: inclusion.supplier_id || null, was: inclusion.text, now: '—' });
  }

  /* Exclusions — the operator's own contractual wording. */
  const wasExc = byId(previous.exclusions);
  const nowExc = byId(current.exclusions);
  for (const [id, exclusion] of nowExc) {
    const before = wasExc.get(id);
    if (!before) { add({ kind: 'exclusion_added', subject: humanId(id), exclusion_id: id, was: '—', now: exclusion.text }); continue; }
    if (before.text !== exclusion.text) {
      add({ kind: 'exclusion_text', subject: humanId(id), exclusion_id: id, was: before.text, now: exclusion.text, ...wordDelta(before.text, exclusion.text) });
    }
  }
  for (const [id, exclusion] of wasExc) {
    if (!nowExc.has(id)) add({ kind: 'exclusion_removed', subject: humanId(id), exclusion_id: id, was: exclusion.text, now: '—' });
  }

  /* Published price, one delta per cell. */
  const wasPrice = (previous.pricing || {}).published || {};
  const nowPrice = (current.pricing || {}).published || {};
  const tiers = [...new Set([...Object.keys(wasPrice), ...Object.keys(nowPrice)])].sort((a, b) => Number(a) - Number(b));
  for (const tier of tiers) {
    if (!wasPrice[tier]) { add({ kind: 'price_tier', subject: `${tier} paying travellers`, tier, was: 'not quoted', now: 'quoted' }); continue; }
    if (!nowPrice[tier]) { add({ kind: 'price_tier', subject: `${tier} paying travellers`, tier, was: 'quoted', now: 'not quoted' }); continue; }
    for (const occupancy of S.OCCUPANCY) {
      const a = wasPrice[tier][occupancy];
      const b = nowPrice[tier][occupancy];
      if (a === b) continue;
      add({ kind: 'price_cell', subject: `${tier} travellers · ${occupancy}`, tier, occupancy, was: money(a), now: money(b), change: b - a });
    }
  }

  return out;
}

/* ------------------------------------------------- what the diff reveals downstream */

const slotEnd = slot => (typeof slot.duration_minutes === 'number' ? toMinutes(slot.time) + slot.duration_minutes : null);

/* Every timed line on one version of the record that does not sit comfortably against the line
   after it: it either runs past it, or leaves an hour or more with nothing scheduled. */
function fitProblems(trip) {
  const found = [];
  for (const day of trip.days) {
    const slots = day.slots || [];
    for (let i = 0; i < slots.length - 1; i += 1) {
      const end = slotEnd(slots[i]);
      if (end === null) continue;
      const next = slots[i + 1];
      const nextStart = toMinutes(next.time);
      if (end > nextStart) found.push({ id: `${slots[i].id}>${next.id}`, kind: 'overlap', day: day.label, slot: slots[i], next, minutes: end - nextStart, end });
      else if (nextStart - end >= 60) found.push({ id: `${slots[i].id}>${next.id}`, kind: 'gap', day: day.label, slot: slots[i], next, minutes: nextStart - end, end });
    }
  }
  return found;
}

/* Findings the comparison itself produces: things that held on the previous version and do not
   hold on this one. Reading either record alone would not surface any of these. */
function consequences(previous, current, changes) {
  const found = [];
  const suppliers = supplierIndex(current);

  /* A timed line that does not sit against the line after it. Only claim it "no longer" fits when
     the two lines actually sat together on the previous version; a brand new pairing never fitted
     or failed to fit, and saying otherwise would be inventing a history. */
  const before = new Set(fitProblems(previous).map(problem => problem.id));
  const wasAdjacent = adjacentPairs(previous);
  for (const problem of fitProblems(current)) {
    if (before.has(problem.id)) continue;
    const verb = problem.kind === 'overlap'
      ? `runs ${plural(problem.minutes, 'minute', 'minutes')} past`
      : `leaves ${plural(problem.minutes, 'minute', 'minutes')} unscheduled before`;
    const known = wasAdjacent.has(problem.id);
    found.push({
      id: `fit:${problem.id}`,
      title: known
        ? `${problem.slot.title} no longer fits the line after it`
        : `${problem.slot.title} does not fit the line now printed after it`,
      detail: `${problem.day}: ${problem.slot.title} starts ${problem.slot.time} and runs ${plural(problem.slot.duration_minutes, 'minute', 'minutes')}, ending ${toClock(problem.end)}. That ${verb} ${problem.next.title} at ${problem.next.time}. ${known ? 'On the previous version it fitted.' : 'These two lines did not sit together on the previous version, so there is nothing to compare this against.'}`,
      supplier_ids: [problem.slot.supplier_id, problem.next.supplier_id].filter(Boolean)
    });
  }

  /* A line was renamed and the text that sells it was not. */
  for (const change of changes.filter(delta => delta.kind === 'slot_title')) {
    const stale = (current.inclusions || []).filter(inclusion => (inclusion.slot_ids || []).includes(change.slot_id)
      && !changes.some(other => other.kind === 'inclusion_text' && other.inclusion_id === inclusion.id));
    for (const inclusion of stale) {
      found.push({
        id: `stale-sold-text:${inclusion.id}`,
        title: 'A line was renamed; the text that sells it was not',
        detail: `The itinerary line now reads ${quote(change.now)}, where it read ${quote(change.was)}. The inclusion that sells it still reads ${quote(inclusion.text)}, and the supplier is on record as ${quote((suppliers.get(inclusion.supplier_id) || {}).name || 'unrecorded')}. Three names for one counterparty.`,
        supplier_ids: [inclusion.supplier_id, change.supplier_id].filter(Boolean)
      });
    }
  }

  /* The last printed line naming a counterparty moved earlier in the trip. Work that counterparty
     is still expected to do after that point has stopped being printed anywhere. */
  /* Sorted by date then time rather than trusting the order the days happen to be written in. */
  const lastSlot = (trip, id) => {
    const held = slotsForSupplier(trip, id).slice().sort((a, b) => (
      a.day.date === b.day.date ? a.slot.time.localeCompare(b.slot.time) : a.day.date.localeCompare(b.day.date)
    ));
    return held.length ? held[held.length - 1] : null;
  };
  for (const supplier of current.suppliers) {
    const wasLast = lastSlot(previous, supplier.id);
    const nowLast = lastSlot(current, supplier.id);
    if (!wasLast || !nowLast || wasLast.slot.id === nowLast.slot.id) continue;
    const movedEarlier = nowLast.day.date < wasLast.day.date
      || (nowLast.day.date === wasLast.day.date && nowLast.slot.time < wasLast.slot.time);
    if (!movedEarlier) continue;
    found.push({
      id: `last-line:${supplier.id}`,
      title: `The last printed line naming ${supplier.name} moved earlier`,
      detail: `It was ${wasLast.day.label} ${wasLast.slot.time}, ${quote(wasLast.slot.title)}. It is now ${nowLast.day.label} ${nowLast.slot.time}, ${quote(nowLast.slot.title)}. Anything this counterparty is still expected to do after that point is no longer printed anywhere.`,
      supplier_ids: [supplier.id]
    });
  }

  /* A published price moved with nothing on the supplier side to explain it. */
  const priceCells = changes.filter(delta => delta.kind === 'price_cell');
  const priceTiers = changes.filter(delta => delta.kind === 'price_tier');
  const termsMoved = changes.some(delta => delta.kind === 'supplier_terms' || delta.kind === 'supplier_added' || delta.kind === 'supplier_removed');
  if ((priceCells.length || priceTiers.length) && !termsMoved) {
    const directions = new Set(priceCells.map(delta => Math.sign(delta.change)));
    const what = [];
    if (priceCells.length) what.push(`${plural(priceCells.length, 'cell', 'cells')} changed, in ${plural(directions.size, 'direction', 'different directions')}`);
    if (priceTiers.length) what.push(`${plural(priceTiers.length, 'headcount tier', 'headcount tiers')} started or stopped being quoted`);
    found.push({
      id: 'price-without-cause',
      title: 'The price table moved and no supplier term moved with it',
      detail: `${listOf(what)}, while every recorded supplier term is identical between the two versions. Neither record says what was re-quoted or why.`,
      supplier_ids: []
    });
  }

  /* An exclusions clause that gained words now decides who pays for things nothing else covers. */
  for (const change of changes.filter(delta => delta.kind === 'exclusion_text' && (delta.added || []).length)) {
    const sold = new Set();
    for (const inclusion of current.inclusions) for (const id of inclusion.slot_ids || []) sold.add(id);
    const uncovered = lines(current)
      .filter(({ slot }) => slot.included !== true && slot.ops !== true && !sold.has(slot.id))
      .map(({ day, slot }) => `${day.label} ${slot.time} ${slot.title}`);
    found.push({
      id: `clause-widened:${change.exclusion_id}`,
      title: `The exclusions clause gained ${listOf(change.added.map(word => quote(word)))}`,
      detail: `It now reads ${quote(change.now)}. On this version ${plural(uncovered.length, 'itinerary line sits', 'itinerary lines sit')} on the page without sitting on the inclusions list, so the added word decides who pays for them: ${listOf(uncovered)}.`,
      supplier_ids: []
    });
  }

  /* An inclusion that lost a line it used to cover. A line the inclusion dropped is not the same
     thing as a line the itinerary dropped, and the sentence says which of the two happened. */
  for (const change of changes.filter(delta => delta.kind === 'inclusion_coverage' && (delta.lost || []).length)) {
    const textAlsoChanged = changes.some(other => other.kind === 'inclusion_text' && other.inclusion_id === change.inclusion_id);
    const sentences = [];
    if ((change.lost_gone || []).length) {
      sentences.push(`${change.lost_gone_labels} ${change.lost_gone.length === 1 ? 'is' : 'are'} no longer on the itinerary at all.`);
    }
    if ((change.lost_kept || []).length) {
      sentences.push(`${change.lost_kept_labels} ${change.lost_kept.length === 1 ? 'is' : 'are'} still on the itinerary but no longer sold under this inclusion.`);
    }
    if (!sentences.length) sentences.push(`It no longer points at ${change.lost_labels || listOf(change.lost)}.`);
    found.push({
      id: `coverage:${change.inclusion_id}`,
      title: `${cell(change.subject)} covers fewer lines than it did`,
      detail: `${sentences.join(' ')}${textAlsoChanged ? '' : ' The sold text is unchanged, so the same thing is still being sold.'}`,
      supplier_ids: [change.supplier_id].filter(Boolean)
    });
  }

  return found;
}

/* ------------------------------------------------------------- who has to be called */

/* Suppliers with a line on the same day as a given delta. When a step disappears from a day,
   everyone working that day is reading a different page from the one they were reading. */
function suppliersOnDay(dayLabel, trip) {
  const ids = new Set();
  for (const day of trip.days) {
    if (day.label !== dayLabel) continue;
    for (const slot of day.slots || []) if (slot.supplier_id) ids.add(slot.supplier_id);
  }
  return ids;
}

/* Every counterparty a delta puts on the phone, each with the reason it is there. The reason gets
   printed: a call list nobody can audit is a call list that gets worked twice. */
const ON_THE_LINE = 'named on the changed line';
const SELLS_IT = 'supplies what the inclusion sells';
const SAME_DAY = 'has a line on the same day; the shape of that day changed around it';
const PRICED_AGAINST = 'has money or headcount terms on record, so a published price change is quoted against them';

function counterpartiesFor(delta, current, suppliers = supplierIndex(current)) {
  const out = new Map();
  const put = (id, reason) => {
    if (!id || !suppliers.has(id) || out.has(id)) return;
    out.set(id, reason);
  };

  if (delta.kind === 'inclusion_coverage' || delta.kind === 'inclusion_text') put(delta.supplier_id, SELLS_IT);
  else put(delta.supplier_id, ON_THE_LINE);

  if (delta.kind === 'slot_dropped' && delta.day) {
    for (const id of suppliersOnDay(delta.day, current)) put(id, SAME_DAY);
  }
  if (delta.kind === 'price_cell' || delta.kind === 'price_tier') {
    for (const supplier of current.suppliers) {
      const terms = supplier.terms || {};
      const priced = terms.unit_price || terms.minimum || terms.comp_policy || terms.deposit
        || terms.final_headcount_due_business_days !== undefined;
      if (priced) put(supplier.id, PRICED_AGAINST);
    }
  }
  return out;
}

/* What to say, and to whom. The reason a counterparty is on the list changes the call: the vendor
   named on a changed line is being asked to agree to something; a vendor working the same day is
   being told the day moved around them. Same delta, two different conversations. */
function draftLine(delta, current, suppliers, reason = ON_THE_LINE) {
  const supplier = suppliers.get(delta.supplier_id);
  const headcount = current.trip.headcount || {};
  const tierRange = (headcount.tiers || []).length
    ? `${Math.min(...headcount.tiers)}-${Math.max(...headcount.tiers)}`
    : 'the group';
  const dates = `${current.trip.start_date} to ${current.trip.end_date}`;
  if (reason === SAME_DAY) {
    return `Nothing on your own line changed, but ${cell(delta.day)} did: ${quote(delta.was)}${delta.dropped_time ? ` at ${delta.dropped_time}` : ''} is no longer printed. Confirm the timings you are holding for that day.`;
  }
  switch (delta.kind) {
    case 'venue':
      return `Confirm which hall the ${cell(delta.day || 'performance')} performance is in: our current page prints ${cell(delta.now)}, the page before it printed ${cell(delta.was)}. And confirm which hall our group tickets are held against.`;
    case 'slot_time':
      return `Can you take ${tierRange} people at ${cell(delta.now)} on ${cell(delta.day)}? The previous page said ${cell(delta.was)}, and we need to know which one you can actually run.`;
    case 'slot_dropped':
      return `The step ${quote(delta.was)}${delta.dropped_time ? `, ${delta.dropped_time} on ${cell(delta.day)}` : ` on ${cell(delta.day)}`}, is not on the current page. Confirm whether it still happens, at what time, and who is expected where.`;
    case 'slot_added':
      return `We have added ${quote(delta.now)} on ${cell(delta.day)}. Confirm availability, rate and any minimum for ${tierRange} people.`;
    case 'slot_title':
      return `Confirm the business name we should be printing: the itinerary now reads ${quote(delta.now)}, it read ${quote(delta.was)}, and our record has you as ${quote(supplier ? supplier.name : 'unrecorded')}.`;
    case 'slot_state':
      return `Our page now describes this line as ${cell(S.clientWord(delta.now))}. Confirm what is actually held for ${dates}.`;
    case 'inclusion_coverage':
      return `The inclusion ${quote(delta.subject)} points at different itinerary lines than it did. Confirm what is covered for ${tierRange} people on ${dates}.`;
    case 'inclusion_text':
      return `The sold wording changed from ${quote(delta.was)} to ${quote(delta.now)}. Confirm that is what you are supplying.`;
    case 'price_cell':
      return `Re-quote check for ${dates}, ${tierRange} travellers: our published price moved and nothing on your side is recorded as having changed. Confirm your rate, any minimum and your deadline still stand.`;
    default:
      return `Confirm ${cell(delta.subject)} for ${dates}: our page changed from ${quote(delta.was)} to ${quote(delta.now)}.`;
  }
}

/* A call list wants one line per price table, not one line per cell. The director page keeps the
   per-cell detail; here the twelve cells are one conversation. */
function rollUpForCalls(material) {
  const cells = material.filter(delta => delta.kind === 'price_cell');
  const rest = material.filter(delta => delta.kind !== 'price_cell');
  if (!cells.length) return rest;
  const up = cells.filter(delta => delta.change > 0).length;
  const down = cells.filter(delta => delta.change < 0).length;
  return rest.concat([{
    ...CLASSIFICATION.price_cell,
    kind: 'price_cell',
    heading: 'Published price table',
    subject: 'per-person price at every headcount tier',
    was: 'the previous published table',
    now: `${plural(cells.length, 'cell', 'cells')} moved (${up} up, ${down} down)`,
    cells
  }]);
}

/* --------------------------------------------------------------- change-diff.md */

function statusFor(delta, current, suppliers, slots) {
  if (delta.kind === 'slot_dropped') return 'this line is not printed on this version';
  const entry = delta.slot_id ? slots.get(delta.slot_id) : null;
  if (entry && entry.slot.state) return S.clientWord(entry.slot.state);
  if (delta.supplier_id && suppliers.has(delta.supplier_id)) {
    const states = [...new Set(slotsForSupplier(current, delta.supplier_id).map(({ slot }) => slot.state).filter(Boolean))];
    return states.length ? listOf(states.map(S.clientWord)) : 'no line on this version';
  }
  return 'no supplier on this line';
}

function directorPage(previous, current, changes, findings) {
  const head = current.trip;
  const material = changes.filter(delta => delta.group === 'material');
  const wording = changes.filter(delta => delta.group === 'wording');
  const itinerary = material.filter(delta => delta.kind === 'venue' || delta.kind.startsWith('slot_'));
  const sold = material.filter(delta => delta.kind.startsWith('inclusion_') || delta.kind.startsWith('exclusion_'));
  const supplierChanges = material.filter(delta => delta.kind.startsWith('supplier_'));
  const priceCells = material.filter(delta => delta.kind === 'price_cell');
  const priceTiers = material.filter(delta => delta.kind === 'price_tier');
  const suppliers = supplierIndex(current);
  const slots = slotIndex(current);
  const out = [];

  out.push(`# What changed · ${head.title}`);
  out.push('');
  out.push(`**${previous.trip.version} → ${head.version}** · ${head.start_date} to ${head.end_date} · ${head.destination}`);
  out.push('');
  out.push(`Generated from the two trip records by \`pipeline/trip/renderers/change-diff.cjs\`: \`${previous.trip.id}\` compared against \`${head.id}\`. Nothing on this page was retyped from a proposal.`);
  out.push('');
  const priceAside = priceCells.length ? ` ${priceCells.length} of them are cells in the price table.` : '';
  out.push(`**${plural(material.length, 'change affects the trip', 'changes affect the trip')}.${priceAside} ${plural(wording.length, 'change is', 'changes are')} to the wording only.**`);
  out.push('');
  out.push('A change is **material** when it moves something the group turns up to, something a supplier has to agree to, something that is sold, or something that is paid: a venue, a time on a supplied line, an operational step, an inclusion, a clause, a price. It is **wording only** when the description changed and nothing behind it did.');
  out.push('');
  out.push('> This compares two drafts of a proposal. It is not a booking, a payment or a confirmation. Where a line shows a status, that status is what the record says is actually held today.');
  out.push('');

  out.push('## Material changes');
  out.push('');
  if (!material.length) { out.push('_None._'); out.push(''); }

  if (itinerary.length) {
    out.push('### The itinerary');
    out.push('');
    out.push('| What changed | Where | Was | Now | Status of that line today |');
    out.push('| --- | --- | --- | --- | --- |');
    for (const delta of itinerary) {
      out.push(`| ${cell(delta.heading)} — ${cell(delta.subject)} | ${cell(delta.where || delta.day || '')} | ${cell(delta.was)} | ${cell(delta.now)} | ${cell(statusFor(delta, current, suppliers, slots))} |`);
    }
    out.push('');
    for (const kind of [...new Set(itinerary.map(delta => delta.kind))]) {
      out.push(`- **${cell(CLASSIFICATION[kind].heading)}.** ${cell(CLASSIFICATION[kind].why)}`);
    }
    out.push('');
  }

  if (sold.length) {
    out.push('### What is sold, and the terms');
    out.push('');
    out.push('| What changed | Was | Now | Why it counts |');
    out.push('| --- | --- | --- | --- |');
    for (const delta of sold) {
      out.push(`| ${cell(delta.heading)} — ${cell(delta.subject)} | ${cell(delta.was)} | ${cell(delta.now)} | ${cell(delta.why)} |`);
    }
    out.push('');
  }

  if (supplierChanges.length) {
    out.push('### Suppliers and their terms');
    out.push('');
    out.push('| What changed | Was | Now |');
    out.push('| --- | --- | --- |');
    for (const delta of supplierChanges) out.push(`| ${cell(delta.subject)} | ${cell(delta.was)} | ${cell(delta.now)} |`);
    out.push('');
  }

  out.push('### Price per person');
  out.push('');
  if (!priceCells.length && !priceTiers.length) {
    out.push('_The published table is unchanged._');
    out.push('');
  } else {
    const wasPrice = (previous.pricing || {}).published || {};
    const nowPrice = (current.pricing || {}).published || {};
    /* Every tier from either version, so a headcount that stopped being quoted is visible as a row
       rather than simply missing from the page. */
    const tiers = [...new Set([...Object.keys(wasPrice), ...Object.keys(nowPrice)])].sort((a, b) => Number(a) - Number(b));
    out.push(`| Paying travellers | ${S.OCCUPANCY.map(titleCase).join(' | ')} |`);
    out.push(`| --- | ${S.OCCUPANCY.map(() => '---').join(' | ')} |`);
    for (const tier of tiers) {
      const row = S.OCCUPANCY.map(occupancy => {
        const a = (wasPrice[tier] || {})[occupancy];
        const b = (nowPrice[tier] || {})[occupancy];
        if (b === undefined) return `${money(a)} (no longer quoted)`;
        if (a === undefined) return `${money(b)} (new tier)`;
        if (a === b) return `${money(b)} (unchanged)`;
        return `${money(a)} → ${money(b)} (${signedMoney(b - a)})`;
      });
      out.push(`| ${cell(tier)} | ${row.map(cell).join(' | ')} |`);
    }
    out.push('');
    const up = priceCells.filter(delta => delta.change > 0).length;
    const down = priceCells.filter(delta => delta.change < 0).length;
    const quoted = Object.keys(nowPrice).length * S.OCCUPANCY.length;
    out.push(`${plural(priceCells.length, 'cell', 'cells')} of ${quoted} changed: ${up} up, ${down} down. ${cell(CLASSIFICATION.price_cell.why)}`);
    out.push('');
    for (const delta of priceTiers) {
      out.push(`- **${cell(delta.heading)} — ${cell(delta.subject)}.** ${cell(delta.was)} → ${cell(delta.now)}. ${cell(delta.why)}`);
    }
    if (priceTiers.length) out.push('');
    out.push(`> ${cell((current.pricing || {}).note || 'Published prices are the operator\'s own figures.')}`);
    out.push('');
  }

  out.push('## Wording only');
  out.push('');
  if (!wording.length) {
    out.push('_None._');
    out.push('');
  } else {
    out.push(`${plural(wording.length, 'passage was', 'passages were')} rewritten. Nothing supplied, timed, priced or promised moves with them, so nothing in this section needs a decision.`);
    out.push('');
    for (const delta of wording) {
      const flag = delta.numbers_moved ? ' — **numbers in this passage changed; worth a read**' : '';
      out.push(`- **${cell(delta.subject)}** · ${cell(delta.where || delta.day || '')}${flag}`);
      out.push(`  - Was: ${delta.was === 'not printed' ? '_nothing printed_' : quote(delta.was)}`);
      out.push(`  - Now: ${delta.now === 'not printed' ? '_nothing printed_' : quote(delta.now)}`);
      if (delta.numbers_moved) out.push(`  - Numbers: ${listOf(numbersIn(delta.was)) || 'none'} → ${listOf(numbersIn(delta.now)) || 'none'}`);
    }
    out.push('');
  }

  out.push('## What this version does not add up to');
  out.push('');
  if (!findings.length) {
    out.push('_The comparison found no new internal inconsistency._');
  } else {
    out.push('These held on the previous version and do not hold on this one. They come out of comparing the two records; reading either one on its own would not show them.');
    out.push('');
    for (const finding of findings) out.push(`- **${cell(finding.title)}.** ${cell(finding.detail)}`);
  }
  out.push('');

  out.push('## The status words on this page');
  out.push('');
  out.push('| Word | What it means |');
  out.push('| --- | --- |');
  const used = new Set(lines(current).map(({ slot }) => slot.state).filter(Boolean));
  for (const state of Object.keys(S.LINE_STATES)) {
    if (!used.has(state)) continue;
    out.push(`| ${cell(S.clientWord(state))} | ${cell(S.LINE_STATES[state].description)} |`);
  }
  out.push('');
  return out.join('\n');
}

/* ----------------------------------------------------------- vendor-call-list.md */

function vendorCallList(previous, current, changes, findings) {
  const head = current.trip;
  const suppliers = supplierIndex(current);
  const material = rollUpForCalls(changes.filter(delta => delta.group === 'material' && delta.calls));
  const out = [];

  const book = new Map();
  const unattached = [];
  for (const delta of material) {
    const parties = counterpartiesFor(delta, current, suppliers);
    if (!parties.size) { unattached.push(delta); continue; }
    for (const [id, reason] of parties) {
      if (!book.has(id)) book.set(id, []);
      book.get(id).push({ delta, reason });
    }
  }
  const ordered = current.suppliers.filter(supplier => book.has(supplier.id));
  const reach = supplier => {
    const channel = supplier.channel || {};
    if (!channel.kind) return 'no channel on record';
    return `${channel.kind.replace(/_/g, ' ')}${channel.locator ? ` · ${channel.locator}` : ''}`;
  };

  out.push(`# Vendor call list · ${head.title}`);
  out.push('');
  out.push(`**${previous.trip.version} → ${head.version}** · ${head.start_date} to ${head.end_date} · internal`);
  out.push('');
  out.push('> Internal working document, generated from the two trip records. **Generating it sends nothing, holds nothing, pays nothing and confirms nothing.** It is the list of calls a person still has to make, and the reason each one is on the list.');
  out.push('');
  const rolled = changes.filter(delta => delta.kind === 'price_cell').length;
  const rollNote = rolled > 1 ? ` The ${rolled} changed price cells are one conversation, so they are one row here.` : '';
  const orphanNote = unattached.length ? ` ${plural(unattached.length, 'change has', 'changes have')} no counterparty at all; ${unattached.length === 1 ? 'it is' : 'they are'} at the bottom.` : '';
  out.push(`${plural(material.length, 'material change puts', 'material changes put')} ${plural(ordered.length, 'counterparty', 'counterparties')} on this list.${rollNote}${orphanNote} Wording-only changes put nobody on it.`);
  out.push('');
  out.push('This is a diff, not a status report. A line that was already unconfirmed and did not change is not here.');
  out.push('');

  out.push('## In one table');
  out.push('');
  out.push('| Counterparty | Reach them | Changes | Terms tripped |');
  out.push('| --- | --- | --- | --- |');
  for (const supplier of ordered) {
    const entries = book.get(supplier.id);
    const tripped = trippedTerms(supplier, entries.map(entry => entry.delta));
    const headings = [...new Set(entries.map(entry => entry.delta.heading))];
    out.push(`| ${cell(supplier.name)} | ${cell(reach(supplier))} | ${cell(listOf(headings))} | ${cell(tripped.length ? listOf(tripped.map(term => humanField(term.field))) : 'none on record')} |`);
  }
  out.push('');

  for (const supplier of ordered) {
    const entries = book.get(supplier.id);
    const held = slotsForSupplier(current, supplier.id);
    out.push(`## ${supplier.name}`);
    out.push('');
    out.push(`- **Category** — ${cell(supplier.category)}`);
    out.push(`- **Reach them** — ${cell(reach(supplier))}`);
    /* Roles only, never individuals — and a contact recorded with only a role must not break the
       page, because the schema does not require the channel. */
    const contacts = (supplier.contacts || []).map(contact => {
      const role = contact.role || 'role not recorded';
      return contact.channel ? `${role} (${humanField(contact.channel)})` : role;
    });
    out.push(`- **Who** — ${cell(contacts.length ? listOf(contacts) : 'no contact role on record')}`);
    out.push(`- **Lines they hold on this version** — ${cell(held.length ? held.map(({ day, slot }) => `${day.label} ${slot.time} ${slot.title} (${S.clientWord(slot.state)})`).join('; ') : 'none')}`);
    out.push('');

    out.push('**What changed, and why they are on this list**');
    out.push('');
    out.push('| Change | Was | Now | On this list because |');
    out.push('| --- | --- | --- | --- |');
    for (const { delta, reason } of entries) {
      out.push(`| ${cell(delta.heading)} — ${cell(delta.subject)} | ${cell(delta.was)} | ${cell(delta.now)} | ${cell(reason)} |`);
    }
    out.push('');

    const tripped = trippedTerms(supplier, entries.map(entry => entry.delta));
    out.push('**Terms this trips**');
    out.push('');
    if (tripped.length) for (const term of tripped) out.push(`- ${cell(term.line)}`);
    else out.push(`- **Nothing on record.** ${cell((supplier.terms || {}).notes || 'No terms have been recorded for this counterparty.')} An unrecorded term is not an absent term; it is one nobody can check before the call.`);
    out.push('');

    out.push('**Already tried**');
    out.push('');
    const attempts = supplier.attempts || [];
    if (attempts.length) {
      out.push('| Date | Channel | Direction | Outcome |');
      out.push('| --- | --- | --- | --- |');
      for (const attempt of attempts) {
        out.push(`| ${cell(attempt.date)} | ${cell(attempt.channel ? humanField(attempt.channel) : 'channel not recorded')} | ${cell(attempt.direction)} | ${cell(attempt.outcome)} |`);
      }
    } else {
      out.push('- No contact attempt is recorded for this counterparty.');
    }
    out.push('');

    out.push('**Say**');
    out.push('');
    for (const line of [...new Set(entries.map(({ delta, reason }) => draftLine(delta, current, suppliers, reason)))]) out.push(`- ${cell(line)}`);
    out.push('');

    const related = (supplier.related_supplier_ids || []).map(id => (suppliers.get(id) || {}).name).filter(Boolean);
    if (related.length) {
      out.push(`> Same group-sales office as ${cell(listOf(related))}. One call may cover both; two separate calls definitely repeat one.`);
      out.push('');
    }
  }

  out.push('## Changes with no counterparty');
  out.push('');
  if (!unattached.length) {
    out.push('_None. Every material change on this diff names somebody._');
  } else {
    out.push('These are the operator\'s own to settle. There is no supplier on the other end of them.');
    out.push('');
    out.push('| Change | Was | Now | Why it counts |');
    out.push('| --- | --- | --- | --- |');
    for (const delta of unattached) {
      out.push(`| ${cell(delta.heading)} — ${cell(delta.subject)} | ${cell(delta.was)} | ${cell(delta.now)} | ${cell(delta.why)} |`);
    }
  }
  out.push('');

  out.push('## Flags the comparison raised');
  out.push('');
  if (!findings.length) {
    out.push('_None._');
  } else {
    out.push('| Flag | Detail | Who it touches |');
    out.push('| --- | --- | --- |');
    for (const finding of findings) {
      const names = [...new Set(finding.supplier_ids.map(id => (suppliers.get(id) || {}).name).filter(Boolean))];
      out.push(`| ${cell(finding.title)} | ${cell(finding.detail)} | ${cell(names.length ? listOf(names) : 'the operator')} |`);
    }
  }
  out.push('');
  return out.join('\n');
}

/* ------------------------------------------------------------------------ export */

module.exports = {
  name: 'change-diff',
  description: 'Compares a trip against the record it supersedes: a director-facing what-changed page separating material from wording, and an internal vendor call list naming who to ring, on what channel, and which of their terms it trips.',
  outputs(trip) {
    /* A record that supersedes nothing has nothing to compare against. */
    if (!trip.trip || !trip.trip.supersedes) return new Map();
    let previous;
    try {
      previous = loadTrip(trip.trip.supersedes);
    } catch (error) {
      /* validateTrip does not resolve `supersedes`, so a typo or a renamed record reaches this
         point. Say which record is dangling rather than leaving a bare "no trip file" to read. */
      throw new Error(`change-diff: "${trip.trip.id}" supersedes "${trip.trip.supersedes}", which is not a trip record. Fix trip.supersedes or restore the superseded record. ${error.message}`);
    }
    const changes = deltas(previous, trip);
    const findings = consequences(previous, trip, changes);
    return new Map([
      ['change-diff.md', directorPage(previous, trip, changes, findings)],
      ['vendor-call-list.md', vendorCallList(previous, trip, changes, findings)]
    ]);
  },
  /* Exported for the tests. The classification is the contract, so it is testable directly. */
  _internals: {
    deltas, consequences, fitProblems, adjacentPairs, printedVenue, wordDelta, numbersIn, sameNumbers,
    trippedTerms, counterpartiesFor, rollUpForCalls, draftLine, termLine, stable, cell,
    directorPage, vendorCallList, CLASSIFICATION, TERMS_TRIPPED, SLOT_FIELDS
  }
};
