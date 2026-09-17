/* Library coverage — which of this trip's lines are assembled from the destination component
   library, which are bespoke, where the library and the trip record disagree, and what the
   library already holds that this trip does not use.

   The library lives in pipeline/trip/library/<destination>.json. A component holds what is
   stable across trips; dates, clock times for a group, headcount, negotiated figures, deposit
   and confirmation state and attempt history belong to the trip record. validateLibrary()
   enforces that boundary, and a library that breaks it gets a report of its errors instead of
   a coverage report that looks fine. */
const fs = require('node:fs');
const path = require('node:path');
const { lines, supplierIndex } = require('../load.cjs');
const S = require('../schema.cjs');

const libraryDir = path.join(__dirname, '..', 'library');

/* ---------- shared helpers ---------- */

const norm = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const cell = value => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
const dash = value => (value === null || value === undefined || value === '' ? '—' : value);

/* schema.cjs accepts a single-digit hour ("8:30"), so clock values are compared as minutes.
   A string compare would put "8:30" after "09:00" and lose the finding. */
function minutesOfDay(value) {
  const parsed = /^(\d{1,2}):([0-5]\d)$/.exec(String(value ?? '').trim());
  if (!parsed) return null;
  const hours = Number(parsed[1]);
  return hours > 23 ? null : hours * 60 + Number(parsed[2]);
}

/* A name has to be long enough that containment means something. "Rock City" earns a match;
   a four-letter token would match half the itinerary. */
const MIN_MATCH_LENGTH = 8;

const ALIAS_KINDS = new Set(['canonical', 'variant', 'shorthand', 'misprint', 'stale']);
const BOOKING_MODES = new Set(['group_sales', 'gate_admission', 'no_booking']);
const SOURCE_KINDS = new Set(['project_record', 'public_web']);

/* Keys that would drag one trip's state into a reusable component. "state" alone is not on the
   list: a component may hold a venue address, and a US state is not a booking state. */
const PER_TRIP_KEYS = new Set([
  'date', 'dates', 'start_date', 'end_date', 'paid_on', 'booked_on', 'accessed',
  'time', 'times', 'start_time', 'end_time', 'arrival_time',
  'headcount', 'pax', 'paying', 'travellers', 'travelers',
  'attempt', 'attempts', 'confirmation', 'confirmed', 'deposit_paid',
  'booking_state', 'line_state', 'slot_state',
  'price', 'unit_price', 'rate', 'rates', 'amount', 'cost', 'total', 'deposit_amount', 'negotiated_rate'
]);
/* …and anything spelled as a date or a time of day: release_date, due_date, arrival_time. */
const PER_TRIP_KEY_SHAPE = /(^|_)(date|time)$/;
const isPerTripKey = key => {
  const name = String(key).toLowerCase();
  return PER_TRIP_KEYS.has(name) || PER_TRIP_KEY_SHAPE.test(name);
};

const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/;
const CLOCK = /\b\d{1,2}:[0-5]\d\b/;
const MONEY = /\$\s?\d|\b\d+(?:\.\d{2})?\s?(?:dollars|usd)\b/i;
/* A whole value that *is* a booking state — `{ "booking": "confirmed" }`. Matched on the whole
   value rather than word-by-word, because prose about a business legitimately says "tickets are
   held at will call" or "a guide is requested on the same form", and that is stable copy. */
const LINE_STATE_VALUE = new RegExp(`^(?:${Object.keys(S.LINE_STATES).map(key => key.replace('_', '[ _]')).join('|')})$`, 'i');
const MAILBOX = /[\w.+-]+@[\w-]+\.[\w.]+/;
const DIRECT_NUMBER = /\(\d{3}\)\s?\d{3}[-. ]?\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b|\b1?[-. ]?8\d{2}[-.]\d{3}[-.]\d{4}\b/;

/* operating_hours is the one place a clock value is a fact about the business rather than
   about a group: "the first ride of the day is 09:00" is true next April as well. */
const CLOCK_ALLOWED_AT = 'operating_hours';

function walk(node, trail, visit) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => walk(item, trail.concat(String(index)), visit));
    return;
  }
  if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      visit('key', key, trail.concat(key));
      walk(node[key], trail.concat(key), visit);
    }
    return;
  }
  visit('value', node, trail);
}

/* ---------- loading ---------- */

function libraryFiles() {
  if (!fs.existsSync(libraryDir)) return [];
  return fs.readdirSync(libraryDir).filter(name => name.endsWith('.json')).sort()
    .map(name => path.join(libraryDir, name));
}

function loadLibraries() {
  return libraryFiles().map(file => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data._file = path.relative(path.resolve(__dirname, '../../..'), file);
    return data;
  });
}

const libraryForDestination = destination =>
  loadLibraries().find(entry => norm((entry.library || {}).destination) === norm(destination)) || null;

/* ---------- the boundary, enforced ---------- */

function validateLibrary(library) {
  const findings = [];
  const fail = (check, id, message) => findings.push({ severity: 'error', check, id, message });
  const warn = (check, id, message) => findings.push({ severity: 'warning', check, id, message });

  const head = library.library || {};
  for (const field of ['id', 'destination', 'version']) {
    if (!head[field]) fail('library.shape', `library.${field}`, `The library needs a ${field}.`);
  }
  for (const section of ['sources', 'channels', 'components']) {
    if (!Array.isArray(library[section])) fail('library.shape', section, `Missing required section "${section}".`);
  }
  if (findings.length) return findings;

  /* sources: anything not already in the trip record has to say where it came from and when. */
  const sources = new Map();
  for (const source of library.sources) {
    const label = `source:${source.id}`;
    if (!source.id || sources.has(source.id)) fail('library.sources', label, 'Duplicate or missing source id.');
    if (!SOURCE_KINDS.has(source.kind)) fail('library.sources', label, `Unknown source kind "${source.kind}".`);
    if (!source.locator) fail('library.sources', label, 'Every source needs a locator.');
    if (source.kind === 'public_web') {
      if (!/^https:\/\/\S+$/.test(source.url || '')) fail('library.sources', label, 'A public web source needs its URL.');
      if (!ISO_DATE.test(source.accessed || '')) fail('library.sources', label, 'A public web source needs the date it was read.');
    }
    sources.set(source.id, source);
  }

  const components = new Map();
  for (const component of library.components) {
    const label = `component:${component.id}`;
    if (!component.id || components.has(component.id)) fail('library.identity', label, 'Duplicate or missing component id.');
    components.set(component.id, component);
    if (!component.name) fail('library.identity', label, 'A component needs the business name.');
    else if (norm(component.name).length < MIN_MATCH_LENGTH) {
      fail('library.identity', label, `"${component.name}" is too short to match on; a component name needs at least ${MIN_MATCH_LENGTH} characters.`);
    }
    if (!S.SUPPLIER_CATEGORIES.includes(component.category)) {
      fail('library.identity', label, `Unknown category "${component.category}" (${S.SUPPLIER_CATEGORIES.join(', ')}).`);
    }
    if (!BOOKING_MODES.has(component.booking_mode)) {
      fail('library.identity', label, `Unknown booking mode "${component.booking_mode}" (${[...BOOKING_MODES].join(', ')}).`);
    }
    for (const alias of component.aliases || []) {
      if (!alias.text) fail('library.identity', label, 'An alias needs its text.');
      else if (norm(alias.text).length < MIN_MATCH_LENGTH) {
        fail('library.identity', label, `Alias "${alias.text}" is too short to match on.`);
      }
      if (!ALIAS_KINDS.has(alias.kind)) fail('library.identity', label, `Alias "${alias.text}" needs a kind (${[...ALIAS_KINDS].join(', ')}).`);
    }
    for (const question of component.standing_questions || []) {
      if (!question.id || !question.question) fail('library.identity', label, 'A standing question needs an id and the question.');
      if (!('answer' in question)) fail('library.identity', label, `Standing question "${question.id}" needs an answer field, even when it is null.`);
    }
    if (!(component.source_ids || []).length) fail('library.sources', label, 'Every component says where its facts came from.');
    for (const ref of component.source_ids || []) {
      if (!sources.has(ref)) fail('library.sources', label, `Unknown source_id "${ref}".`);
    }

    /* The boundary itself. */
    walk(component, [], (kind, value, trail) => {
      const where = trail.join('.');
      if (kind === 'key') {
        if (isPerTripKey(value)) {
          fail('library.boundary', label, `"${where}" is per-trip data; dates, clock times, headcount, figures and booking state belong in the trip record.`);
        }
        return;
      }
      if (typeof value !== 'string') return;
      if (ISO_DATE.test(value)) fail('library.boundary', label, `"${where}" holds a calendar date. A component is reused on every trip, so it carries no dates.`);
      if (CLOCK.test(value) && trail[0] !== CLOCK_ALLOWED_AT) {
        fail('library.boundary', label, `"${where}" holds a clock time. Times of day belong to a trip line; opening hours belong under ${CLOCK_ALLOWED_AT}.`);
      }
      if (MONEY.test(value)) fail('library.boundary', label, `"${where}" holds a money amount. A figure is negotiated per trip and lives in the trip record.`);
      if (LINE_STATE_VALUE.test(value.trim())) fail('library.boundary', label, `"${where}" is a booking state. Whether a line is requested or confirmed is a fact about one trip.`);
    });
  }

  for (const component of library.components) {
    for (const relationship of component.relationships || []) {
      if (!components.has(relationship.component_id)) {
        fail('library.identity', `component:${component.id}`, `Relationship points at unknown component "${relationship.component_id}".`);
      }
      if (!relationship.nature) warn('library.identity', `component:${component.id}`, 'A relationship says what kind of relationship it is.');
    }
  }

  const channels = new Map();
  for (const channel of library.channels) {
    const label = `channel:${channel.id}`;
    if (!channel.id || channels.has(channel.id)) fail('library.channels', label, 'Duplicate or missing channel id.');
    channels.set(channel.id, channel);
    if (!S.CHANNELS.includes(channel.kind)) fail('library.channels', label, `Unknown channel kind "${channel.kind}".`);
    for (const also of channel.also || []) {
      if (!S.CHANNELS.includes(also)) fail('library.channels', label, `Unknown channel kind "${also}".`);
    }
    if (!(channel.covers || []).length) warn('library.channels', label, 'A shared channel that covers nothing is not worth recording.');
    for (const ref of channel.covers || []) {
      if (!components.has(ref)) fail('library.channels', label, `Covers unknown component "${ref}".`);
    }
  }
  for (const component of library.components) {
    const sales = component.group_sales || {};
    if (sales.channel_kind && !S.CHANNELS.includes(sales.channel_kind)) {
      fail('library.channels', `component:${component.id}`, `Unknown group-sales channel kind "${sales.channel_kind}".`);
    }
    if (!sales.channel_id) continue;
    const channel = channels.get(sales.channel_id);
    if (!channel) fail('library.channels', `component:${component.id}`, `Unknown channel "${sales.channel_id}".`);
    else if (!(channel.covers || []).includes(component.id)) {
      fail('library.channels', `component:${component.id}`, `Channel "${channel.id}" does not list this component in covers.`);
    }
  }

  /* The privacy rule applies to every file in this layer. */
  const raw = JSON.stringify({ ...library, _file: undefined });
  if (MAILBOX.test(raw)) fail('library.privacy', 'library', 'A mailbox is recorded. Keep published channel kinds, not addresses.');
  if (DIRECT_NUMBER.test(raw)) fail('library.privacy', 'library', 'A direct number is recorded. Keep the channel kind, not the number.');

  return findings;
}

const errorsIn = findings => findings.filter(finding => finding.severity === 'error');

/* ---------- matching a trip line to a component ---------- */

const nameForms = component => [{ text: component.name, kind: 'canonical', note: null }, ...(component.aliases || [])]
  .map(entry => ({ ...entry, norm: norm(entry.text) }))
  .filter(entry => entry.norm.length >= MIN_MATCH_LENGTH);

/* One direction only: the component's name has to appear in what the trip prints. The other
   direction would let "IMAX 3D Theater at the Tennessee Aquarium" match a line that says
   "Tennessee Aquarium". Both sides are padded so the match lands on whole words — otherwise
   "Point Park" matches "checkpoint parking". */
function matchIn(component, text) {
  const haystack = norm(text);
  if (!haystack) return null;
  const padded = ` ${haystack} `;
  return nameForms(component).find(form => padded.includes(` ${form.norm} `)) || null;
}

const VIA_LABEL = {
  supplier: 'supplier name',
  title: 'line title',
  inclusion: 'inclusion text',
  blurb: 'line description',
  'supplier note': 'supplier note',
  'supplier terms': 'supplier terms',
  'candidate venue': 'candidate venue',
  'venue variant': 'venue variant',
  'line note': 'line note',
  'inclusion note': 'inclusion note'
};
/* A line is backed by what it sells, not by what its description mentions in passing. */
const STRONG_VIA = new Set(['supplier', 'title', 'inclusion']);

function inclusionsBySlot(trip) {
  const index = new Map();
  for (const inclusion of trip.inclusions || []) {
    for (const slotId of inclusion.slot_ids || []) {
      if (!index.has(slotId)) index.set(slotId, []);
      index.get(slotId).push(inclusion);
    }
  }
  return index;
}

function textsFor(entry, supplier, incs) {
  const { slot } = entry;
  const match = [];
  if (supplier) match.push({ via: 'supplier', text: supplier.name });
  match.push({ via: 'title', text: slot.title });
  for (const inclusion of incs) match.push({ via: 'inclusion', text: inclusion.text });
  if (slot.blurb) match.push({ via: 'blurb', text: slot.blurb });

  /* Scanned but never used to claim coverage: a candidate is a line's shopping list, and a
     venue variant is the other printing's mistake. Both are worth reading for name drift. */
  const scan = match.slice();
  if (supplier) {
    if (supplier.note) scan.push({ via: 'supplier note', text: supplier.note });
    if (supplier.terms && supplier.terms.notes) scan.push({ via: 'supplier terms', text: supplier.terms.notes });
    for (const candidate of supplier.candidates || []) scan.push({ via: 'candidate venue', text: candidate.name });
    for (const variant of supplier.venue_variants || []) scan.push({ via: 'venue variant', text: variant.name });
  }
  if (slot.note) scan.push({ via: 'line note', text: slot.note });
  for (const inclusion of incs) if (inclusion.note) scan.push({ via: 'inclusion note', text: inclusion.note });
  return { match, scan };
}

/* ---------- coverage ---------- */

function coverageFor(trip, library) {
  const suppliers = supplierIndex(trip);
  const incIndex = inclusionsBySlot(trip);
  const components = library.components;
  const byId = new Map(components.map(component => [component.id, component]));

  const rows = [];
  const disagreements = [];
  const agreed = [];
  const byKey = new Map();
  const seenTerm = new Set();
  const used = new Map();

  /* One finding per (kind, component, counterparty, detail), carrying every line it touches:
     the same misprinted name on two lines is one correction, not two — but two suppliers
     disagreeing with the same component on the same field are two different findings. */
  const addDisagreement = (finding, lineLabel) => {
    const key = [finding.kind, finding.component_id, finding.scope || '', finding.detail].join('|');
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.lines.includes(lineLabel)) existing.lines.push(lineLabel);
      return;
    }
    const record = { ...finding, lines: [lineLabel] };
    byKey.set(key, record);
    disagreements.push(record);
  };

  for (const entry of lines(trip)) {
    const { day, slot } = entry;
    const supplier = slot.supplier_id ? suppliers.get(slot.supplier_id) : null;
    const incs = incIndex.get(slot.id) || [];
    const { match, scan } = textsFor(entry, supplier, incs);

    const matched = new Map();
    for (const { via, text } of match) {
      for (const component of components) {
        const form = matchIn(component, text);
        if (!form) continue;
        if (!matched.has(component.id)) matched.set(component.id, { component, vias: [], forms: [] });
        const hit = matched.get(component.id);
        if (!hit.vias.includes(via)) hit.vias.push(via);
        if (!hit.forms.some(existing => existing.text === form.text)) hit.forms.push(form);
      }
    }

    const strong = [...matched.values()].filter(hit => hit.vias.some(via => STRONG_VIA.has(via)))
      .map(hit => hit.component);
    const coverage = strong.length ? 'library-backed' : (matched.size ? 'referenced only' : 'bespoke');
    for (const hit of matched.values()) {
      if (!used.has(hit.component.id)) used.set(hit.component.id, []);
      used.get(hit.component.id).push(slot.id);
    }

    const lineLabel = `${slot.title} (${day.date})`;
    rows.push({
      day, slot, supplier, coverage, strong, lineLabel,
      kind: slot.ops === true ? 'operational' : 'itinerary',
      matched: [...matched.values()].sort((a, b) => a.component.id.localeCompare(b.component.id))
    });

    /* Name drift: a misprinted or out-of-season name printed anywhere on this line. */
    for (const { via, text } of scan) {
      const haystack = norm(text);
      if (!haystack) continue;
      const padded = ` ${haystack} `;
      for (const component of components) {
        for (const alias of component.aliases || []) {
          if (alias.kind !== 'misprint' && alias.kind !== 'stale') continue;
          const needle = norm(alias.text);
          if (needle.length < MIN_MATCH_LENGTH || !padded.includes(` ${needle} `)) continue;
          const canonical = alias.applies_to === 'venue' && component.venue ? component.venue.name : component.name;
          addDisagreement({
            kind: alias.kind === 'misprint' ? 'name' : 'out of season',
            component_id: component.id,
            detail: alias.text,
            message: alias.kind === 'misprint'
              ? `The record prints "${alias.text}" (${VIA_LABEL[via] || via}); the library's name for this business is "${canonical}".`
              : `The record carries "${alias.text}" (${VIA_LABEL[via] || via}); the library records "${canonical}".`,
            note: alias.note || (component.venue ? component.venue.note : '') || ''
          }, lineLabel);
        }
      }
    }

    /* Term drift, against the components this line is actually backed by. */
    if (supplier) {
      for (const component of strong) {
        const terms = supplier.terms || {};
        const checks = [
          ['group minimum', (component.group_minimum || {}).count, (terms.minimum || {}).count],
          ['comp kind', (component.comp_policy || {}).kind, (terms.comp_policy || {}).kind],
          ['comp ratio', (component.comp_policy || {}).ratio, (terms.comp_policy || {}).ratio],
          ['final headcount lead', (component.deadline_shape || {}).final_headcount_due_business_days, terms.final_headcount_due_business_days],
          ['balance due days', (component.deadline_shape || {}).balance_due_days, terms.balance_due_days]
        ];
        for (const [field, libraryValue, recordValue] of checks) {
          if (libraryValue === undefined || libraryValue === null) continue;
          if (recordValue === undefined || recordValue === null) continue;
          const key = `${supplier.id}|${component.id}|${field}`;
          if (seenTerm.has(key)) continue;
          seenTerm.add(key);
          if (String(libraryValue) === String(recordValue)) {
            agreed.push({ supplier, component, field, value: libraryValue });
            continue;
          }
          addDisagreement({
            kind: 'terms', component_id: component.id, scope: supplier.id, detail: field,
            message: `${field}: the library holds ${libraryValue}, the record holds ${recordValue}.`,
            note: 'One of the two is stale. Check with the supplier, then correct whichever is wrong.'
          }, lineLabel);
        }

        const sales = component.group_sales || {};
        const known = [sales.channel_kind, ...(sales.also || [])].filter(Boolean);
        const recordChannel = (supplier.channel || {}).kind;
        if (known.length && recordChannel && !known.includes(recordChannel)) {
          addDisagreement({
            kind: 'channel', component_id: component.id, scope: supplier.id, detail: recordChannel,
            message: `group-sales channel: the record works this supplier by ${recordChannel}, the library records ${known.join(' or ')}.`,
            note: 'Either the supplier changed how it takes group business or the trip used a channel nobody recorded.'
          }, lineLabel);
        }
      }
    }

    /* Clock and duration, against the same backed components. */
    for (const component of strong) {
      const earliest = (component.operating_hours || {}).earliest_group_entry;
      const earliestMinutes = minutesOfDay(earliest);
      const slotMinutes = minutesOfDay(slot.time);
      if (earliestMinutes !== null && slotMinutes !== null && slotMinutes < earliestMinutes) {
        addDisagreement({
          kind: 'hours', component_id: component.id, detail: `${slot.time} before ${earliest}`,
          message: `The line runs at ${slot.time}; the library records the earliest group entry as ${earliest}.`,
          note: (component.operating_hours || {}).note || ''
        }, lineLabel);
      }
      if (component.typical_duration_minutes && slot.duration_minutes
        && component.typical_duration_minutes !== slot.duration_minutes) {
        addDisagreement({
          kind: 'duration', component_id: component.id, detail: String(slot.duration_minutes),
          message: `The line allows ${slot.duration_minutes} minutes; the library's typical duration is ${component.typical_duration_minutes}.`,
          note: component.duration_note || ''
        }, lineLabel);
      }
    }
  }

  /* Inclusions that are sold with no line to happen on. */
  const orphanInclusions = (trip.inclusions || []).filter(inclusion => !(inclusion.slot_ids || []).length)
    .map(inclusion => {
      const hits = components.filter(component => matchIn(component, inclusion.text));
      for (const hit of hits) if (!used.has(hit.id)) used.set(hit.id, []);
      return { inclusion, components: hits };
    });

  const unused = components.filter(component => !used.has(component.id) || !used.get(component.id).length);

  const channels = (library.channels || []).map(channel => ({
    channel,
    covered: (channel.covers || []).map(id => ({
      component: byId.get(id),
      slotIds: (used.get(id) || [])
    }))
  }));

  /* Open questions worth closing once. Only for businesses this trip actually touches — the
     point is the call that is about to be made anyway, not a survey of the whole library. */
  const questions = [];
  for (const component of components) {
    if (!used.has(component.id) || !used.get(component.id).length) continue;
    const asked = new Set();
    for (const question of component.standing_questions || []) {
      if (question.answer !== null && question.answer !== undefined) continue;
      if (question.topic) asked.add(question.topic);
      questions.push({ component, question });
    }
    if (component.comp_policy && component.comp_policy.known === false && !asked.has('comp_policy')) {
      questions.push({
        component,
        question: {
          id: `${component.id}-comp`,
          question: 'Does this supplier give free places to adults travelling with the group, and on what ratio?',
          note: component.comp_policy.note || ''
        }
      });
    }
  }
  questions.sort((a, b) => a.component.id.localeCompare(b.component.id) || a.question.id.localeCompare(b.question.id));

  /* What each used component actually contributes, and the constraints it carries in with it. */
  const usedComponents = components.filter(component => used.has(component.id) && used.get(component.id).length)
    .map(component => ({ component, slotIds: used.get(component.id) }));

  return { rows, disagreements, agreed, unused, usedComponents, used, orphanInclusions, channels, questions, byId };
}

/* ---------- the document ---------- */

const countBy = (rows, coverage) => rows.filter(row => row.coverage === coverage).length;

const NOTHING_RECORDED = /^(not recorded|not published|nothing to book|nothing to book and nothing to pay|no admission)\.?$/i;
const recorded = text => Boolean(text) && !NOTHING_RECORDED.test(String(text).trim());

/* What a component brings to a line it backs — the work that is not done again. */
function supplies(component) {
  const deadlines = Object.keys(component.deadline_shape || {}).filter(key => key !== 'note');
  return [
    component.blurb ? 'blurb' : null,
    component.typical_duration_minutes ? `${component.typical_duration_minutes} min` : null,
    (component.group_minimum || {}).count ? `minimum ${component.group_minimum.count}` : null,
    (component.comp_policy || {}).known ? 'comp policy' : null,
    deadlines.length ? `deadlines (${deadlines.length})` : null,
    recorded((component.accessibility || {}).note) ? 'accessibility' : null,
    ((component.payment || {}).methods || []).length ? 'payment' : null,
    (component.relationships || []).length ? 'relationship' : null
  ].filter(Boolean).join(', ') || 'name and channel only';
}

/* Facts that change what a day can contain, and that nobody remembers a year later. */
function constraints(component) {
  const out = [];
  const push = (label, text) => {
    if (!recorded(text)) return;
    out.push(`${label}: ${text}`);
  };
  push('Hours', (component.operating_hours || {}).note);
  push('Season', (component.seasonality || {}).note);
  push('Paperwork', (component.requirements || {}).waiver);
  push('Fee', (component.fee || {}).note);
  push('Deadlines', (component.deadline_shape || {}).note);
  push('Access', (component.accessibility || {}).note);
  push('Payment', (component.payment || {}).note);
  push('On the ground', (component.operations || {}).note);
  return out;
}

function buildMarkdown(trip, library = libraryForDestination(trip.trip.destination)) {
  const head = trip.trip;
  const title = `# Library coverage — ${cell(head.title)}`;

  if (!library) {
    return [
      title, '',
      `${cell(head.destination)} has no component library, so every line on this trip is bespoke:`,
      'each supplier, each blurb and each set of terms was researched for this trip alone and',
      'will be researched again for the next one.', '',
      `Start one at \`pipeline/trip/library/<destination>.json\` — see \`pipeline/trip/library/README.md\`.`, ''
    ].join('\n');
  }

  /* A library that breaks its own boundary does not get to produce a coverage report that
     looks fine. It produces this instead — loudly, and without taking any other trip's
     documents down with it. */
  const errors = errorsIn(validateLibrary(library));
  if (errors.length) {
    return [
      title, '',
      `\`${cell(library._file)}\` does not pass its own boundary, so no coverage was computed.`, '',
      '| Check | Where | What is wrong |', '|---|---|---|',
      ...errors.map(error => `| ${cell(error.check)} | ${cell(error.id)} | ${cell(error.message)} |`),
      '', 'Fix the library and render again. See `pipeline/trip/library/README.md`.', ''
    ].join('\n');
  }

  const { rows, disagreements, agreed, unused, usedComponents, orphanInclusions, channels, questions } = coverageFor(trip, library);
  const sold = rows.filter(row => row.kind === 'itinerary');
  const ops = rows.filter(row => row.kind === 'operational');
  const backed = countBy(sold, 'library-backed');
  const referenced = countBy(sold, 'referenced only');
  const bespoke = countBy(sold, 'bespoke');

  const out = [
    title, '',
    `**${cell(library.library.destination)}** · library \`${cell(library.library.id)}\` ${cell(library.library.version)} · trip record ${cell(head.version)}`, '',
    'A line is **library-backed** when the business it sells is already a component: its blurb,',
    'its group-sales channel, its comp policy, its minimum and its deadline shape are assembled',
    'rather than researched. A **bespoke** line is one this trip paid for in full and the next',
    'trip will pay for again.', '',
    '| | Itinerary lines | Components |',
    '|---|---:|---:|',
    `| Library-backed | ${backed} | ${usedComponents.length} used |`,
    `| Referenced in the text only | ${referenced} | |`,
    `| Bespoke | ${bespoke} | ${unused.length} unused |`,
    `| Total | ${sold.length} | ${library.components.length} |`, '',
    `${ops.length} operational line(s) — coach movements and hotel check-in — are listed below but`,
    'not counted: the library covers what a trip sells, not how it moves.', '',
    `${disagreements.length} disagreement(s) between the library and the trip record; ${agreed.length} term(s) checked and agreeing.`, ''
  ];

  /* Per line, day by day. */
  out.push('## Every line', '');
  let currentDay = null;
  for (const row of rows) {
    if (row.day.date !== currentDay) {
      if (currentDay !== null) out.push('');
      currentDay = row.day.date;
      out.push(`### ${cell(row.day.label || row.day.date)}`, '',
        '| Time | Line | Supplier | Coverage | Component | Matched on |',
        '|---|---|---|---|---|---|');
    }
    const componentNames = row.matched.map(hit => cell(hit.component.name)).join('; ') || '—';
    const vias = [...new Set(row.matched.flatMap(hit => hit.vias.map(via => VIA_LABEL[via] || via)))].join('; ') || '—';
    const coverage = row.kind === 'operational' ? `${row.coverage} (operational)` : row.coverage;
    out.push(`| ${cell(row.slot.time)} | ${cell(row.slot.title)} | ${cell(row.supplier ? row.supplier.name : '—')} | ${cell(coverage)} | ${componentNames} | ${vias} |`);
  }
  out.push('');

  /* Disagreements. */
  out.push('## Where the library and the record disagree', '');
  if (!disagreements.length) out.push('Nothing. Every backed line matches the library on name, terms, hours and duration.', '');
  else {
    out.push('| Kind | Line(s) | Finding | What it means |', '|---|---|---|---|');
    for (const finding of disagreements) {
      out.push(`| ${cell(finding.kind)} | ${cell(finding.lines.join('; '))} | ${cell(finding.message)} | ${cell(finding.note)} |`);
    }
    out.push('');
  }

  /* What the backed lines assemble instead of research. */
  if (usedComponents.length) {
    out.push('## What the backed lines assemble', '');
    out.push('| Component | Lines | Supplies |', '|---|---:|---|');
    for (const { component, slotIds } of usedComponents) {
      out.push(`| ${cell(component.name)} | ${slotIds.length} | ${cell(supplies(component))} |`);
    }
    out.push('');

    const withConstraints = usedComponents.map(entry => ({ ...entry, list: constraints(entry.component) }))
      .filter(entry => entry.list.length);
    if (withConstraints.length) {
      out.push('### Constraints these components carry in', '');
      for (const { component, list } of withConstraints) {
        out.push(`**${cell(component.name)}**`, '');
        for (const item of list) out.push(`- ${cell(item)}`);
        out.push('');
      }
    }
  }

  /* Sold with nowhere to happen. */
  if (orphanInclusions.length) {
    out.push('## Sold inclusions with no line', '');
    out.push('| Inclusion | Library component | What the library already holds |', '|---|---|---|');
    for (const { inclusion, components } of orphanInclusions) {
      const names = components.map(component => cell(component.name)).join('; ') || '—';
      const holds = components.map(component => cell(component.duration_note || (component.deadline_shape || {}).note || '')).filter(Boolean).join(' ') || 'Nothing yet.';
      out.push(`| ${cell(inclusion.text)} | ${names} | ${holds} |`);
    }
    out.push('', 'A sold inclusion with no time slot is a line waiting to be written. Where a component', 'exists, writing it costs a slot and a duration, not a round of research.', '');
  }

  /* One enquiry, several lines. */
  const sharedChannels = channels.filter(entry => (entry.channel.covers || []).length > 1);
  if (sharedChannels.length) {
    out.push('## One enquiry, several lines', '');
    out.push('| Channel | Kind | Covers | On this trip |', '|---|---|---|---|');
    for (const { channel, covered } of sharedChannels) {
      const names = covered.map(entry => cell(entry.component ? entry.component.name : '—')).join('; ');
      const onTrip = covered.filter(entry => entry.slotIds.length).map(entry => cell(entry.component.name)).join('; ') || 'none';
      out.push(`| ${cell(channel.label)} | ${cell(channel.kind)} | ${names} | ${onTrip} |`);
    }
    out.push('');
    for (const { channel } of sharedChannels) {
      if (channel.note) out.push(`- **${cell(channel.label)}** — ${cell(channel.note)}`);
    }
    out.push('');
  }

  /* The questions worth asking once. */
  if (questions.length) {
    out.push('## Questions to close once, not every season', '');
    out.push('| Business | Question | Why it is still open |', '|---|---|---|');
    for (const { component, question } of questions) {
      out.push(`| ${cell(component.name)} | ${cell(question.question)} | ${cell(question.note || '')} |`);
    }
    out.push('', 'Each answer belongs in the component, not in one trip\'s margin. Answered once, it is', 'assembled into every later trip that uses the business.', '');
  }

  /* What the next trip gets for free. */
  out.push('## Unused components — ready for the next trip', '');
  if (!unused.length) out.push('This trip uses every component in the library.', '');
  else {
    out.push('| Component | Category | Reached by | What the library already holds |', '|---|---|---|---|');
    for (const component of [...unused].sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id))) {
      const sales = component.group_sales || {};
      out.push(`| ${cell(component.name)} | ${cell(component.category)} | ${cell(sales.locator || dash(sales.channel_kind))} | ${cell(supplies(component))} |`);
    }
    out.push('', 'These are the businesses the next Chattanooga trip does not have to find, name or', 'channel again. A thin component is still a starting point; fill it in on first use.', '');
  }

  /* What the library is still missing. */
  const bespokeRows = rows.filter(row => row.coverage === 'bespoke');
  out.push('## Bespoke lines — what the library does not cover yet', '');
  if (!bespokeRows.length) out.push('None.', '');
  else {
    out.push('| Line | Supplier | Why it is bespoke | Nearest thing the library has |', '|---|---|---|---|');
    for (const row of bespokeRows) {
      const why = row.supplier
        ? 'No component for this supplier; its terms were researched for this trip alone.'
        : 'No supplier and no component; the line carries only this trip\'s wording.';
      const category = row.supplier ? row.supplier.category : null;
      const candidates = category ? unused.filter(component => component.category === category) : [];
      const nearest = candidates.length
        ? `${candidates.length} unused ${category} component(s): ${candidates.slice(0, 3).map(component => component.name).join(', ')}${candidates.length > 3 ? ', …' : ''}`
        : 'Nothing yet — this is the next component to write.';
      out.push(`| ${cell(row.slot.title)} (${cell(row.day.date)}) | ${cell(row.supplier ? row.supplier.name : '—')} | ${why} | ${cell(nearest)} |`);
    }
    out.push('');
  }

  /* Provenance. */
  out.push('## Where the library\'s facts come from', '');
  out.push('| Source | Read on | Locator |', '|---|---|---|');
  for (const source of library.sources) {
    out.push(`| ${cell(source.id)} | ${cell(source.accessed || '—')} | ${cell(source.url || source.locator)} |`);
  }
  out.push('',
    'Facts marked `TRIP-RECORD` were already in the trip record and describe the business rather',
    'than one group\'s visit. Everything else was read from a public page on the date shown.', '');

  return out.join('\n');
}

module.exports = {
  name: 'library-coverage',
  description: 'Which trip lines are assembled from the destination component library, which are bespoke, and where the two disagree.',
  outputs(trip) {
    return new Map([['library-coverage.md', buildMarkdown(trip)]]);
  },
  /* exported for the tests */
  loadLibraries, libraryForDestination, validateLibrary, coverageFor, buildMarkdown,
  norm, matchIn, nameForms, errorsIn, minutesOfDay, libraryDir, MIN_MATCH_LENGTH, PER_TRIP_KEYS, isPerTripKey
};
