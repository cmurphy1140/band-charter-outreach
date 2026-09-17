/* The trip vendor sheet.

   One page per trip, grouped by counterparty rather than by itinerary order, because vendor
   work is done one counterparty at a time: one group-sales office answers for two lines, one
   deadline moves three. It carries what a printed proposal never could — who covers which
   line, what was requested and when, what came back, and what is still missing — so that a
   redraft costs nothing and a headcount change has something to check against.

   Deterministic: reads the trip record and the vocabulary only. No clock, no randomness. */
const { lines, supplierIndex, slotsForSupplier } = require('../load.cjs');
const S = require('../schema.cjs');

const STATE_ORDER = Object.keys(S.LINE_STATES);
const NONE = '—';
const MISSING = '_not recorded_';

const cell = value => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
const row = values => `| ${values.map(cell).join(' | ')} |`;
const table = (header, rows) => rows.length
  ? [row(header), `|${header.map(() => '---').join('|')}|`, ...rows].join('\n')
  : '_Nothing recorded._';
const money = amount => typeof amount === 'number'
  ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : NONE;
const list = values => (values || []).join('; ');
const sentence = text => {
  const trimmed = String(text || '').trim();
  return trimmed && !/[.?!]$/.test(trimmed) ? `${trimmed}.` : trimmed;
};

/* Dates. UTC arithmetic only, so the output does not depend on where this runs. Dates that reach a
   renderer unvalidated (a deposit's paid_on, a release date) are printed as found rather than
   computed on: a page that says "10/09/2026, as recorded" is useful, a crash is not. */
const DAY_MS = 86400000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isISO = value => ISO_DATE.test(String(value ?? ''));
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const parseISO = iso => { const [y, m, d] = String(iso).split('-').map(Number); return Date.UTC(y, m - 1, d); };
const toISO = ms => new Date(ms).toISOString().slice(0, 10);
const weekdayOf = iso => WEEKDAYS[new Date(parseISO(iso)).getUTCDay()];
const minusDays = (iso, n) => toISO(parseISO(iso) - n * DAY_MS);
function minusBusinessDays(iso, n) {
  let ms = parseISO(iso);
  let left = n;
  while (left > 0) {
    ms -= DAY_MS;
    const weekday = new Date(ms).getUTCDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return toISO(ms);
}
const withWeekday = date => (isISO(date) ? `${date} (${weekdayOf(date)})` : `${date} — **not a YYYY-MM-DD date**`);

const CATEGORY_HEADINGS = {
  transport: 'Transport', lodging: 'Lodging', attraction: 'Attractions', meal: 'Meals',
  venue: 'Venues', performance: 'Performance', service: 'Services'
};
/* Term fields are printed under the name an operator would say out loud, not the field name. */
const TERM_LABELS = {
  unit_price: 'Unit price', minimum: 'Group minimum', comp_policy: 'Comp policy',
  deposit: 'Deposit', balance_due_days: 'Balance due', final_headcount_due_business_days: 'Final headcount due',
  payment_methods: 'Payment methods', cancellation: 'Cancellation', release_date: 'Release date', notes: 'Notes'
};
const categoryHeading = key => CATEGORY_HEADINGS[key] || (key ? key[0].toUpperCase() + key.slice(1) : 'Uncategorised');
const categoryLabel = key => CATEGORY_HEADINGS[key] || key || 'uncategorised';
const basisLabel = key => (S.COST_BASIS[key] || {}).label || key || 'basis not recorded';
const COMP_EFFECTS = {
  reduces_cost: 'reduces cost',
  increases_cost_per_paying_traveller: 'carried by the paying travellers'
};

/* ---------- reading the record ---------- */

/* Category, then the first line the counterparty covers, then id. Stable, and it reads the way the
   trip runs: the day-one dinner before the day-two dinner, the attractions in the order visited. */
function orderedSuppliers(trip) {
  const rank = new Map(S.SUPPLIER_CATEGORIES.map((category, index) => [category, index]));
  const at = supplier => (rank.has(supplier.category) ? rank.get(supplier.category) : S.SUPPLIER_CATEGORIES.length);
  const firstLine = supplier => {
    const slots = slotsForSupplier(trip, supplier.id);
    return slots.length ? `${slots[0].day.date} ${slots[0].slot.time}` : '9999-99-99 99:99';
  };
  return [...(trip.suppliers || [])]
    .map(supplier => ({ supplier, key: `${String(at(supplier)).padStart(2, '0')} ${firstLine(supplier)} ${supplier.id}` }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map(entry => entry.supplier);
}

/* A counterparty is only as settled as its least-settled line. */
function weakestState(slots) {
  let weakest = null;
  for (const { slot } of slots) {
    if (!S.lineState(slot.state)) continue;
    if (weakest === null || STATE_ORDER.indexOf(slot.state) < STATE_ORDER.indexOf(weakest)) weakest = slot.state;
  }
  return weakest;
}
const stateLabel = state => (S.lineState(state) ? S.lineState(state).label : 'No state recorded');
const stateWithWord = state => (S.lineState(state) ? `${stateLabel(state)} — "${S.clientWord(state)}"` : 'No state recorded');

function sourceText(trip, ids) {
  const byId = new Map((trip.sources || []).map(source => [source.id, source]));
  const found = (ids || []).map(id => {
    const source = byId.get(id);
    return source ? `${id} (${source.locator})` : id;
  });
  return found.length ? found.join('; ') : MISSING;
}

const knownPricesFor = (trip, id) => (((trip.pricing || {}).known_unit_prices) || []).filter(entry => entry.supplier_id === id);
const inclusionsFor = (trip, id) => (trip.inclusions || []).filter(inclusion => inclusion.supplier_id === id);

function inclusionTextBySlot(trip) {
  const bySlot = new Map();
  for (const inclusion of trip.inclusions || []) {
    for (const slotId of inclusion.slot_ids || []) {
      bySlot.set(slotId, (bySlot.get(slotId) || []).concat(inclusion.text));
    }
  }
  return bySlot;
}

/* Any rate for this counterparty, whether it reached the quote system or only the margin. A paid
   deposit is not a rate: it says money has moved, not what the line costs. */
function rateOf(trip, supplier) {
  const price = (supplier.terms || {}).unit_price;
  if (price) return `${money(price.amount)} ${basisLabel(price.basis).toLowerCase()}`;
  const priced = knownPricesFor(trip, supplier.id)
    .filter(entry => typeof entry.amount === 'number' && recordedInTerms(supplier, entry) !== 'Deposit');
  const pen = priced.find(entry => entry.basis === 'per_person') || priced[0];
  if (pen) return `${money(pen.amount)} ${basisLabel(pen.basis).toLowerCase()} (pen only)`;
  return null;
}
const hasRate = (trip, supplier) => rateOf(trip, supplier) !== null;
function rateCell(trip, supplier) {
  const rate = rateOf(trip, supplier);
  if (rate) return rate;
  const deposit = (supplier.terms || {}).deposit;
  return deposit ? `${NONE} (${money(deposit.amount)} deposit only)` : NONE;
}
const missingRateWord = supplier => ((supplier.terms || {}).deposit
  ? 'no rate — a deposit is paid against a price nobody recorded'
  : 'no rate');

function deadlineOf(supplier) {
  const terms = supplier.terms || {};
  const parts = [];
  if (typeof terms.final_headcount_due_business_days === 'number') parts.push(`headcount ${terms.final_headcount_due_business_days} business days`);
  if (typeof terms.balance_due_days === 'number') parts.push(`balance ${terms.balance_due_days} days`);
  if (terms.release_date) parts.push(`release ${terms.release_date}`);
  return parts.length ? parts.join('; ') : NONE;
}
const hasDeadline = supplier => deadlineOf(supplier) !== NONE;

function recordedInTerms(supplier, priced) {
  const terms = supplier.terms || {};
  if (terms.unit_price && terms.unit_price.amount === priced.amount && terms.unit_price.basis === priced.basis) return 'Unit price';
  if (terms.deposit && terms.deposit.amount === priced.amount && terms.deposit.basis === priced.basis) return 'Deposit';
  return null;
}

/* What is absent, named plainly. These are the fields a date or headcount change asks for. */
function gapsFor(trip, supplier, slots) {
  const terms = supplier.terms || {};
  const gaps = [];
  if (!slots.length) gaps.push('no itinerary line');
  if (!hasRate(trip, supplier)) gaps.push(missingRateWord(supplier));
  if (!terms.minimum) gaps.push('no group minimum');
  if (!terms.comp_policy) gaps.push('no comp policy');
  if (!hasDeadline(supplier)) gaps.push('no deadline');
  if (!terms.cancellation) gaps.push('no cancellation terms');
  if (!(supplier.attempts || []).length) gaps.push('no contact attempt logged');
  return gaps;
}

/* Counterparties that answer together. One call, several lines.

   The link is treated as undirected: in the real record each side names the other, but a record
   where only one side does describes the same single office, and the page must say so either way. */
function callGroups(trip) {
  const ordered = orderedSuppliers(trip);
  const position = new Map(ordered.map((supplier, at) => [supplier.id, at]));
  const neighbours = new Map(ordered.map(supplier => [supplier.id, new Set()]));
  for (const supplier of ordered) {
    for (const related of supplier.related_supplier_ids || []) {
      if (!neighbours.has(related) || related === supplier.id) continue;
      neighbours.get(supplier.id).add(related);
      neighbours.get(related).add(supplier.id);
    }
  }
  const seen = new Set();
  const groups = [];
  for (const supplier of ordered) {
    if (seen.has(supplier.id)) continue;
    const members = [];
    const queue = [supplier.id];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      members.push(id);
      for (const related of [...neighbours.get(id)].sort((a, b) => position.get(a) - position.get(b))) queue.push(related);
    }
    if (members.length > 1) groups.push(members.sort((a, b) => position.get(a) - position.get(b)));
  }
  return groups.sort((a, b) => position.get(a[0]) - position.get(b[0]));
}

/* The same counterparty got a web form and a voicemail on the same day, with nothing recording
   the first attempt. That is the duplicated effort the attempts log exists to stop. */
function duplicatedEffort(trip) {
  const found = [];
  for (const supplier of orderedSuppliers(trip)) {
    const byDate = new Map();
    for (const attempt of supplier.attempts || []) {
      if (attempt.direction !== 'outbound') continue;
      byDate.set(attempt.date, (byDate.get(attempt.date) || []).concat(attempt.channel));
    }
    for (const [date, channels] of [...byDate.entries()].sort()) {
      if (channels.length > 1) found.push({ supplier, date, channels });
    }
  }
  return found;
}

/* ---------- sections ---------- */

function header(trip) {
  const head = trip.trip;
  const client = head.client || {};
  const headcount = head.headcount || {};
  const comps = headcount.trip_granted_comps;
  const out = [
    `# Trip vendor sheet — ${cell(head.title || head.id)}`,
    '',
    `Trip \`${cell(head.id)}\` · version \`${cell(head.version)}\` · prepared ${cell(head.prepared_on)} · ${cell(head.start_date)} to ${cell(head.end_date)} · ${cell(head.destination)}`,
    '',
    `Operator ${cell(head.operator)} · client ${cell(client.organization)}${client.ensemble ? ` (${cell(client.ensemble)})` : ''}${client.origin ? `, ${cell(client.origin)}` : ''} · addressed to the ${cell(client.recipient_role || 'client')}.`,
    '',
    `Generated from \`${cell(trip._file)}\` by \`pipeline/trip/cli.cjs\`. Individuals and direct numbers are held by role.`,
    '',
    '> **Internal working sheet — not a client document, not a booking and not a payment.** It',
    '> records what was requested of each counterparty, what came back, and what is still open.',
    '> A line that is not confirmed is not booked, whatever a proposal prints beside it.',
    '',
    `**Headcount** ${headcount.paying_minimum ? `${headcount.paying_minimum} paying minimum` : 'not recorded'}` +
      `${(headcount.tiers || []).length ? ` · priced at ${headcount.tiers.join(' / ')}` : ''}` +
      `${typeof comps === 'number' ? ` · ${comps} trip-granted comps` : ''}.`,
    ''
  ];
  if (typeof comps === 'number') {
    out.push(
      'Trip-granted comps are free places the operator gives the group. They are a different quantity from the',
      'vendor-earned comps below, which a supplier grants on its own ratio. The two move the price in opposite',
      `directions — a vendor-earned comp ${COMP_EFFECTS.reduces_cost}, a trip-granted comp is`,
      `${COMP_EFFECTS.increases_cost_per_paying_traveller} — and they are never one number.`,
      ''
    );
  }
  const staffing = head.staffing || [];
  if (staffing.length) {
    out.push(`**Staffing** ${cell(staffing.map(entry => entry.role).join('; '))}.`, '');
    for (const entry of staffing.filter(entry => entry.note)) {
      out.push(`> ${cell(entry.role)}: ${cell(sentence(entry.note))}`, '');
    }
  }
  if (head.note) out.push(`**Provenance** ${cell(sentence(head.note))}`, '');
  return out.join('\n');
}

function standing(trip) {
  const suppliers = orderedSuppliers(trip);
  const bySlot = inclusionTextBySlot(trip);
  const supplied = lines(trip).filter(({ slot }) => slot.supplier_id);

  const stateRows = STATE_ORDER.map(state => row([
    S.LINE_STATES[state].label,
    `"${S.LINE_STATES[state].client_word}"`,
    String(suppliers.filter(supplier => weakestState(slotsForSupplier(trip, supplier.id)) === state).length),
    String(supplied.filter(({ slot }) => slot.state === state).length)
  ]));
  /* Counterparties carrying no stated line are their own row, so the column still sums to the total. */
  const stateless = suppliers.filter(supplier => weakestState(slotsForSupplier(trip, supplier.id)) === null);
  const unstated = supplied.filter(({ slot }) => !S.lineState(slot.state)).length;
  if (stateless.length || unstated) {
    stateRows.push(row(['**No state recorded**', '**none — a silent line reads as booked**', String(stateless.length), String(unstated)]));
  }

  const supplierRows = suppliers.map(supplier => {
    const slots = slotsForSupplier(trip, supplier.id);
    const state = weakestState(slots);
    const sold = slots.filter(({ slot }) => (bySlot.get(slot.id) || []).length).length;
    const attempts = (supplier.attempts || []).length;
    return row([
      supplier.name,
      categoryLabel(supplier.category),
      slots.length ? `${slots.length}${sold ? ` (${sold} sold)` : ''}` : '**none**',
      state ? stateLabel(state) : '**no state**',
      rateCell(trip, supplier),
      deadlineOf(supplier),
      attempts ? String(attempts) : '**0**'
    ]);
  });

  return [
    '## Where the trip stands',
    '',
    `${suppliers.length} counterparties cover ${supplied.length} of the ${lines(trip).length} itinerary lines; the other ` +
      `${lines(trip).length - supplied.length} are free time or at own cost and have no counterparty. The state shown for a`,
    'counterparty is the weakest line it carries: an office with one paid line and one unrequested line is not a',
    'settled supplier.',
    '',
    table(['Line state', 'Client word', 'Counterparties', 'Itinerary lines'], stateRows),
    '',
    table(['Counterparty', 'Category', 'Lines', 'State', 'Rate', 'Deadline', 'Attempts'], supplierRows),
    ''
  ].join('\n');
}

function missing(trip) {
  const suppliers = orderedSuppliers(trip);
  const index = supplierIndex(trip);
  const total = suppliers.length;
  const count = predicate => suppliers.filter(predicate).length;
  const withGaps = suppliers
    .map(supplier => ({ supplier, gaps: gapsFor(trip, supplier, slotsForSupplier(trip, supplier.id)) }))
    .filter(entry => entry.gaps.length);

  const counts = [
    `${count(supplier => !hasRate(trip, supplier))} of ${total} have no rate of any kind recorded`,
    `${count(supplier => !hasDeadline(supplier))} have no deadline`,
    `${count(supplier => !(supplier.terms || {}).minimum)} have no group minimum`,
    `${count(supplier => !(supplier.terms || {}).comp_policy)} have no comp policy`,
    `${count(supplier => !(supplier.terms || {}).cancellation)} have no cancellation terms`,
    `${count(supplier => !(supplier.attempts || []).length)} have no contact attempt logged at all`
  ];

  const bySlotId = new Map(lines(trip).map(({ day, slot }) => [slot.id, { day, slot }]));
  const structural = [];
  for (const inclusion of trip.inclusions || []) {
    const supplierName = inclusion.supplier_id ? (index.get(inclusion.supplier_id) || {}).name || inclusion.supplier_id : null;
    if (!(inclusion.slot_ids || []).length) {
      structural.push(`**Sold with nowhere to happen.** "${cell(inclusion.text)}" is priced as an inclusion${supplierName ? ` against ${cell(supplierName)}` : ''} and has no slot anywhere in the itinerary.`);
    }
    for (const slotId of inclusion.slot_ids || []) {
      const found = bySlotId.get(slotId);
      if (found && inclusion.supplier_id && found.slot.supplier_id !== inclusion.supplier_id) {
        structural.push(`**Inclusion and itinerary line disagree on the counterparty.** "${cell(inclusion.text)}" claims \`${cell(slotId)}\`${found.slot.supplier_id ? `, which the itinerary gives to \`${cell(found.slot.supplier_id)}\`` : ', which the itinerary carries with no supplier at all'}.`);
      }
    }
    if (inclusion.note) structural.push(`**Inclusion \`${cell(inclusion.id)}\`.** ${cell(sentence(inclusion.note))}`);
  }
  for (const supplier of suppliers) {
    const variants = supplier.venue_variants || [];
    if (variants.length > 1) {
      structural.push(`**Two printings, two venues.** ${cell(supplier.name)} is printed at ${variants.map(variant => `${cell(variant.name)} in \`${cell(variant.observed_in)}\``).join(' and ')}. Nothing records which is current.`);
    }
    if ((supplier.candidates || []).length) {
      const shopped = supplier.candidates.filter(candidate => candidate.status !== 'printed on the proposal').length;
      structural.push(`**Printed as settled while it is still being shopped.** ${cell(supplier.name)} is \`${cell(weakestState(slotsForSupplier(trip, supplier.id)) || 'no state')}\` with ${shopped} alternatives being called.`);
    }
  }
  for (const found of duplicatedEffort(trip)) {
    structural.push(`**The same day, twice.** ${cell(found.supplier.name)} was contacted on ${found.date} by ${found.channels.map(channel => channel.replace(/_/g, ' ')).join(' and ')} — ${found.channels.length} outbound attempts at one counterparty on one day, which is visible here only because the attempts log survives a redraft.`);
  }

  return [
    '## What is missing',
    '',
    'A gap here is not a formatting problem. It is the field a date change, a headcount change or a cancellation',
    'asks for, and there is nothing to answer with.',
    '',
    ...counts.map(text => `- ${text}.`),
    '',
    table(['Counterparty', 'Missing'], withGaps.map(entry => row([entry.supplier.name, entry.gaps.join('; ')]))),
    '',
    '### Findings a reprint would lose',
    '',
    ...(structural.length ? structural.map(text => `- ${text}`) : ['- None recorded.']),
    ''
  ].join('\n');
}

function deadlines(trip) {
  const suppliers = orderedSuppliers(trip);
  const rows = [];
  const notes = [];
  for (const supplier of suppliers) {
    const terms = supplier.terms || {};
    const slots = slotsForSupplier(trip, supplier.id);
    const firstDate = slots.length ? slots[0].day.date : null;

    if (typeof terms.final_headcount_due_business_days === 'number') {
      const derived = isISO(firstDate) ? minusBusinessDays(firstDate, terms.final_headcount_due_business_days) : null;
      rows.push({
        key: derived || '9999-99-99',
        cells: [
          derived ? withWeekday(derived) : '**not derivable**',
          supplier.name,
          'Final headcount and payment',
          `${terms.final_headcount_due_business_days} business days before service`,
          firstDate ? `derived from the first line, ${firstDate}` : 'no itinerary line to count back from'
        ]
      });
    }
    if (typeof terms.balance_due_days === 'number') {
      const fromDeposit = terms.deposit && isISO(terms.deposit.paid_on)
        ? minusDays(terms.deposit.paid_on, -terms.balance_due_days) : null;
      const beforeService = isISO(firstDate) ? minusDays(firstDate, terms.balance_due_days) : null;
      const readings = [
        fromDeposit ? `${fromDeposit} counted from the deposit` : null,
        beforeService ? `${beforeService} counted before the visit` : null
      ].filter(Boolean).join('; ');
      rows.push({
        key: fromDeposit || beforeService || '9999-99-99',
        cells: [
          '**anchor not recorded**',
          supplier.name,
          'Balance after the deposit',
          `${terms.balance_due_days} days`,
          readings || 'nothing to count from'
        ]
      });
      notes.push(`${supplier.name}: the pages record "${terms.balance_due_days} days" without saying from what. Both readings are shown; neither is the supplier's word.`);
    }
    if (terms.deposit && terms.deposit.paid_on) {
      rows.push({
        key: isISO(terms.deposit.paid_on) ? terms.deposit.paid_on : '9999-99-99',
        cells: [
          withWeekday(terms.deposit.paid_on),
          supplier.name,
          'Deposit paid',
          `${money(terms.deposit.amount)}${terms.deposit.basis ? ` · ${basisLabel(terms.deposit.basis).toLowerCase()}` : ''}`,
          'paid — the balance amount is not recorded anywhere'
        ]
      });
    }
    if (terms.release_date) {
      rows.push({
        key: isISO(terms.release_date) ? terms.release_date : '9999-99-99',
        cells: [withWeekday(terms.release_date), supplier.name, 'Space released', 'release date', 'recorded']
      });
    } else if ('release_date' in terms) {
      notes.push(`${supplier.name}: a release-date field exists on the record and is empty. Nothing holds this line.`);
    }
  }
  rows.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const without = suppliers.filter(supplier => !hasDeadline(supplier));
  return [
    '## Deadlines and dated obligations',
    '',
    table(['Date', 'Counterparty', 'Obligation', 'Recorded as', 'Anchor'], rows.map(entry => row(entry.cells))),
    '',
    'Dates in the first column are **derived** from the rule a supplier gave and the first itinerary line it covers,',
    'counting back over weekends only. No public-holiday calendar is in the record and no supplier has stated a',
    'calendar date. Treat each one as the date to confirm, not the date agreed.',
    '',
    ...notes.map(text => `- ${text}`),
    ...(notes.length ? [''] : []),
    `**${without.length} of ${suppliers.length} counterparties carry no deadline at all** — ${cell(without.map(supplier => supplier.name).join(', '))}.`,
    'For those lines a change of date or headcount has nothing to check against, and the first anyone hears of a',
    'cut-off is after it has passed.',
    ''
  ].join('\n');
}

function relatedSection(trip) {
  const groups = callGroups(trip);
  if (!groups.length) return '';
  const index = supplierIndex(trip);
  const blocks = groups.map(members => {
    const rows = members.map(id => {
      const supplier = index.get(id);
      const slots = slotsForSupplier(trip, id);
      const attempts = (supplier.attempts || []).length;
      return row([
        supplier.name,
        slots.map(({ day, slot }) => `${day.date} ${slot.time} ${slot.title}`).join('; ') || '**no itinerary line**',
        stateLabel(weakestState(slots)),
        rateCell(trip, supplier),
        deadlineOf(supplier),
        attempts ? String(attempts) : '**0**'
      ]);
    });
    const notes = members
      .map(id => index.get(id))
      .map(supplier => {
        const note = supplier.note || ((supplier.contacts || []).find(contact => contact.note) || {}).note;
        return note ? `- **${cell(supplier.name)}.** ${cell(sentence(note))}` : null;
      })
      .filter(Boolean);
    return [
      `**${cell(members.map(id => index.get(id).name).join(' + '))}** — one office, ${members.length} counterparties, ` +
        `${members.reduce((total, id) => total + slotsForSupplier(trip, id).length, 0)} itinerary lines.`,
      '',
      table(['Counterparty', 'Lines covered', 'State', 'Rate', 'Deadline', 'Attempts'], rows),
      '',
      ...notes
    ].join('\n');
  });
  return [
    '## One counterparty, several lines',
    '',
    'These are linked in the record because the same group-sales office answers for all of them. That is one phone',
    'call and not two — and one call that can settle the open line while the other is already paid for.',
    '',
    blocks.join('\n\n'),
    ''
  ].join('\n');
}

function termsTable(trip, supplier) {
  const terms = supplier.terms || {};
  const slots = slotsForSupplier(trip, supplier.id);
  const firstDate = slots.length ? slots[0].day.date : null;

  const format = field => {
    const value = terms[field];
    if (field === 'release_date') {
      if (!(field in terms)) return MISSING;
      return value ? String(value) : '**field present, left empty — nothing is held**';
    }
    if (value === undefined || value === null) return MISSING;
    /* A term recorded in a shape the vocabulary does not describe is printed as found, not guessed at. */
    const shaped = value && typeof value === 'object' && !Array.isArray(value);
    if (field === 'unit_price') {
      if (!shaped) return `${value} — **not recorded as an amount and a basis**`;
      return `${money(value.amount)} · ${basisLabel(value.basis)}${value.unit_label ? ` (${value.unit_label})` : ''}`;
    }
    if (field === 'minimum') {
      if (!shaped) return `${value} — **not recorded as a count and a unit**`;
      return `${value.count} ${value.unit}${value.note ? ` — ${value.note}` : ''}`;
    }
    if (field === 'comp_policy') {
      if (!shaped) return `${value} — **not recorded as a comp kind**`;
      const kind = S.COMP_KINDS[value.kind] || {};
      const parts = [kind.label || value.kind];
      if (value.ratio) parts.push(`1 free per ${value.ratio} paid`);
      if ((value.extras || []).length) parts.push(list(value.extras));
      parts.push(COMP_EFFECTS[kind.effect] || kind.effect || 'effect not recorded');
      return `${parts.join(' · ')}${value.note ? ` — ${value.note}` : ''}`;
    }
    if (field === 'deposit') {
      if (!shaped) return `${value} — **not recorded as an amount**`;
      return `${money(value.amount)}${value.basis ? ` · ${basisLabel(value.basis)}` : ''}` +
        `${value.paid_on ? ` · paid ${value.paid_on}` : ' · **not paid, and no due date recorded**'}`;
    }
    if (field === 'balance_due_days') return `${value} days — **the record does not say from what**`;
    if (field === 'final_headcount_due_business_days') {
      return firstDate
        ? `${value} business days before service → **${minusBusinessDays(firstDate, value)}** (derived from the ${firstDate} line)`
        : `${value} business days before service — no itinerary line to count back from`;
    }
    if (Array.isArray(value)) return list(value);
    return String(value);
  };

  const rows = S.TERM_FIELDS.map(field => row([
    TERM_LABELS[field] || field.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase()),
    format(field)
  ]));
  for (const key of Object.keys(terms).filter(key => !S.TERM_FIELDS.includes(key)).sort()) {
    rows.push(row([`${key} _(not a recognised term field)_`, String(terms[key])]));
  }
  return table(['Term', 'Recorded'], rows);
}

function supplierBlock(trip, supplier) {
  const slots = slotsForSupplier(trip, supplier.id);
  const bySlot = inclusionTextBySlot(trip);
  const state = weakestState(slots);
  const relationship = supplier.relationship || {};
  const channel = supplier.channel || {};
  const out = [`#### ${cell(supplier.name)}`, ''];

  out.push(
    `\`${cell(supplier.id)}\` · ${categoryLabel(supplier.category)} · **${cell(stateWithWord(state))}**`,
    '',
    `Owned by the ${cell(relationship.owner || 'owner not recorded')} · recorded status "${cell(relationship.status || 'not recorded')}" · ` +
      `approach: ${cell(channel.kind ? channel.kind.replace(/_/g, ' ') : 'not recorded')}${channel.locator ? `, ${cell(channel.locator)}` : ''}.`,
    ''
  );

  const contacts = (supplier.contacts || []).map(contact =>
    `${contact.role}${contact.channel ? ` (${contact.channel.replace(/_/g, ' ')})` : ''}${contact.note ? ` — ${contact.note.replace(/\.$/, '')}` : ''}`);
  out.push(`Contacts, by role: ${contacts.length ? cell(contacts.join('; ')) : MISSING}.`, '');

  out.push('_Itinerary lines covered_', '', table(
    ['Date', 'Time', 'Line', 'State', 'Sold to the client as'],
    slots.map(({ day, slot }) => row([
      day.date,
      slot.time,
      slot.title,
      stateLabel(slot.state),
      (bySlot.get(slot.id) || []).join('; ') || (slot.ops ? 'operational step, not itemised' : 'not sold as an inclusion')
    ]))
  ), '');
  if (!slots.length) out.push('**This counterparty covers no itinerary line.**', '');

  for (const inclusion of inclusionsFor(trip, supplier.id)) {
    const covered = (inclusion.slot_ids || []).some(slotId => slots.some(({ slot }) => slot.id === slotId));
    if (!covered) out.push(`**Sold against this counterparty with no line of its own:** "${cell(inclusion.text)}" (\`${cell(inclusion.id)}\`).`, '');
  }

  out.push('_Terms_', '', termsTable(trip, supplier), '');

  const pen = knownPricesFor(trip, supplier.id);
  if (pen.length) {
    out.push('_Rates recorded against this counterparty_', '', table(
      ['Amount', 'Basis', 'For', 'In a term field?', 'Source'],
      pen.map(entry => row([
        money(entry.amount),
        basisLabel(entry.basis),
        entry.label || 'admission',
        recordedInTerms(supplier, entry) || '**no — recorded in pen only**',
        list(entry.source_ids) || MISSING
      ]))
    ), '');
  }

  if ((supplier.candidates || []).length) {
    const shopped = supplier.candidates.filter(candidate => candidate.status !== 'printed on the proposal');
    out.push(
      `**This line is still being shopped.** The proposal prints one of these and the inclusions page sells it, while ` +
        `${shopped.length} alternatives are being called for the same meal. The client word for this line is ` +
        `"${cell(S.clientWord(state))}" — it is not a venue, it is a shortlist.`,
      '',
      table(['Candidate', 'Status'], supplier.candidates.map(candidate => row([candidate.name, candidate.status]))),
      ''
    );
  }

  if ((supplier.venue_variants || []).length) {
    out.push('_Venue printed differently between iterations_', '', table(
      ['Venue as printed', 'Iteration', 'Source'],
      supplier.venue_variants.map(variant => row([variant.name, variant.observed_in, list(variant.source_ids) || MISSING]))
    ), '');
  }

  out.push('_Attempts — what was asked, and when_', '');
  out.push((supplier.attempts || []).length
    ? table(['Date', 'Channel', 'Direction', 'Outcome'], supplier.attempts.map(attempt => row([
        attempt.date, attempt.channel.replace(/_/g, ' '), attempt.direction, attempt.outcome
      ])))
    : '**Nothing recorded. No one can say whether this counterparty has ever been contacted.**', '');

  const gaps = gapsFor(trip, supplier, slots);
  out.push(`Missing: ${gaps.length ? `**${cell(gaps.join('; '))}**` : 'nothing on the checklist'}.`, '');
  out.push(`Sources: ${cell(sourceText(trip, supplier.source_ids))}.`, '');
  if (supplier.note) out.push(`> ${cell(sentence(supplier.note))}`, '');
  return out.join('\n');
}

function detail(trip) {
  const out = [
    '## Every counterparty in detail',
    '',
    'Grouped by category, then by the first line each one covers, so the same counterparty is always in the same',
    'place on the page and the order follows the trip.',
    ''
  ];
  let current = null;
  for (const supplier of orderedSuppliers(trip)) {
    if (supplier.category !== current) {
      current = supplier.category;
      out.push(`### ${categoryHeading(current)}`, '');
    }
    out.push(supplierBlock(trip, supplier));
  }
  return out.join('\n');
}

function reconciliation(trip) {
  const pricing = trip.pricing || {};
  const index = supplierIndex(trip);
  const components = pricing.components_per_person || [];

  const componentRows = components.map(component => row([
    component.label,
    component.amount === null ? '**not legible**' : money(component.amount),
    component.supplier_id
      ? (index.get(component.supplier_id) || {}).name || component.supplier_id
      : '**none attached**',
    component.note || (component.supplier_id ? 'attached here; the quote screen itself shows no supplier' : '')
  ]));

  const penRows = (pricing.known_unit_prices || []).map(entry => {
    const supplier = index.get(entry.supplier_id) || {};
    return row([
      supplier.name || `\`${entry.supplier_id}\` — **no such counterparty in this record**`,
      money(entry.amount),
      basisLabel(entry.basis),
      entry.label || 'admission',
      recordedInTerms(supplier, entry) || '**no term field carries it**',
      list(entry.source_ids) || MISSING
    ]);
  });

  const blended = components.find(component => /attraction/i.test(component.label || ''));
  const priceable = orderedSuppliers(trip).filter(supplier =>
    supplier.category === 'attraction' || supplier.category === 'performance');
  const priceableIds = new Set(priceable.map(supplier => supplier.id));
  const knownAttraction = (pricing.known_unit_prices || []).filter(entry =>
    entry.basis === 'per_person' && priceableIds.has(entry.supplier_id) && typeof entry.amount === 'number');
  const knownTotal = knownAttraction.reduce((total, entry) => total + entry.amount, 0);
  const unpriced = priceable.filter(supplier => !knownAttraction.some(entry => entry.supplier_id === supplier.id));

  const arithmetic = blended && typeof blended.amount === 'number' ? [
    `The blended line is ${money(blended.amount)} per person. The per-person rates anyone actually wrote down come to ` +
      `${money(knownTotal)} of it, across ${knownAttraction.length} of the ${priceable.length} attraction and performance counterparties. ` +
      `The remaining ${money(blended.amount - knownTotal)} covers ${unpriced.length} counterparties whose rate is recorded nowhere: ` +
      `${cell(unpriced.map(supplier => supplier.name).join(', '))}.`,
    '',
    'That is subtraction on figures already in the record — not a re-quote, and not an endorsement of the published',
    'price. It is here because a blend cannot be taken apart again once it is printed: when one attraction moves,',
    'nothing on the quote screen says how much of the line moves with it.',
    '',
    'Fees on another basis do not belong in that subtraction at all. A per-group guide fee and a per-person',
    'admission behave completely differently when the headcount moves, so they are listed separately above.'
  ] : [];

  return [
    '## Rates against the quote system',
    '',
    'The quote system carried five per-person cost lines and `No supplier` on every one of them. Two days of vendor',
    'work — rates, ratios, minimums, deadlines, who was called when — existed only in ballpoint on pages that get',
    'reprinted on every redraft. This is what the record can and cannot put back.',
    '',
    table(['Quote line', 'Per person', 'Counterparty in this record', 'Note'], componentRows),
    '',
    '_Rates recorded in pen, reconciled onto the counterparties_',
    '',
    table(['Counterparty', 'Amount', 'Basis', 'For', 'In a term field?', 'Source'], penRows),
    '',
    ...arithmetic,
    ''
  ].join('\n');
}

/* Date first, then the counterparty, then the order the record logs them in — so two attempts at
   one counterparty on one day stay in the sequence they happened, form before voicemail. */
function contactLog(trip) {
  const rows = [];
  const ordered = orderedSuppliers(trip);
  ordered.forEach((supplier, position) => {
    (supplier.attempts || []).forEach((attempt, index) => {
      rows.push({
        key: `${attempt.date}|${String(position).padStart(4, '0')}|${String(index).padStart(4, '0')}`,
        cells: [attempt.date, supplier.name, attempt.direction, attempt.channel.replace(/_/g, ' '), attempt.outcome]
      });
    });
  });
  rows.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const silent = orderedSuppliers(trip).filter(supplier => !(supplier.attempts || []).length);
  return [
    '## Contact log, in date order',
    '',
    'Read this before picking up the phone. It is the only place a second attempt at the same counterparty on the',
    'same day is visible.',
    '',
    table(['Date', 'Counterparty', 'Direction', 'Channel', 'Outcome'], rows.map(entry => row(entry.cells))),
    '',
    silent.length
      ? `**No attempt of any kind is recorded for ${silent.length} counterparties:** ${cell(silent.map(supplier => supplier.name).join(', '))}. ` +
        `${silent.filter(supplier => inclusionsFor(trip, supplier.id).length).length} of them are already sold to the client as inclusions.`
      : 'Every counterparty has at least one recorded attempt.',
    ''
  ].join('\n');
}

function footer(trip) {
  return [
    '---',
    '',
    `This page is generated. To change anything on it, edit \`${cell(trip._file)}\` and run ` +
      `\`node pipeline/trip/cli.cjs render ${cell(trip.trip.id)}\`. Edits made here are overwritten on the next`,
    'render, which is the point: the record is the database and the document is a printing of it.',
    ''
  ].join('\n');
}

function buildMarkdown(trip) {
  return [
    header(trip),
    standing(trip),
    missing(trip),
    deadlines(trip),
    relatedSection(trip),
    detail(trip),
    reconciliation(trip),
    contactLog(trip),
    footer(trip)
  ].filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n');
}

module.exports = {
  name: 'vendor-sheet',
  description: 'One page per trip consolidating every counterparty: lines covered, contacts by role, terms, rates, attempts, deadlines and what is still missing.',
  outputs(trip) {
    return new Map([['vendor-sheet.md', buildMarkdown(trip)]]);
  },
  buildMarkdown
};
