/* pipeline/trip/renderers/run-sheet.cjs

   The tour manager's run sheet. The operational document for the person who actually
   travels with the group: times, load and unload points, which counterparty covers each
   line and through which channel, the confirmation state of every supplied line, the
   headcount that walks through the door, and what falls due.

   It is not the client itinerary. A client document can afford to read well; this one has
   to be right at 07:00 with the group on a sidewalk. The two printings of this trip
   disagreed about the performance venue, a supplier's name and every cell of the price
   table, and the better-written one had quietly dropped an operational line the other
   printed. Prose survives a rewrite. Operational steps do not — so every slot carrying
   `ops: true` or `ops_steps` is printed here, under the day it happens.

   Deterministic: reads only the trip record and schema.cjs, sorts by day then time, and
   derives dates by arithmetic on recorded dates. No clock, no randomness. */

const { lines, supplierIndex } = require('../load.cjs');
const S = require('../schema.cjs');

const DOC = 'run-sheet.md';

/* ---------- formatting (cell() copied from pipeline/render.cjs; this layer has no deps) ---------- */

const cell = value => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
const money = amount => typeof amount === 'number'
  ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : '—';
const table = (headers, rows) => [
  `| ${headers.map(cell).join(' | ')} |`,
  `|${headers.map(() => '---').join('|')}|`,
  ...rows.map(row => `| ${row.map(cell).join(' | ')} |`)
].join('\n');
const bullets = items => items.map(item => `- ${item}`).join('\n');
/* Record fields that are lists by convention rather than by validation. A single string
   where an array was expected must not take the renderer down: the sheet still has to
   print. */
const asList = value => value === undefined || value === null ? [] : [].concat(value);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const prettyChannel = value => String(value || '').replace(/_/g, ' ') || 'channel not recorded';
const sentence = text => {
  const trimmed = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

/* ---------- time and date arithmetic, all derived from values in the record ---------- */

const CLOCK = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const pad = value => String(value).padStart(2, '0');
const minutesOf = time => {
  const match = CLOCK.exec(String(time ?? ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
};
const hhmm = time => {
  const match = CLOCK.exec(String(time ?? ''));
  return match ? `${pad(Number(match[1]))}:${match[2]}` : String(time ?? '—');
};
const fromMinutes = total => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

const DAY_MS = 86400000;
const toUtc = iso => {
  const [year, month, day] = String(iso).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};
const toIso = ms => new Date(ms).toISOString().slice(0, 10);
/* Business days counted back from a recorded date. Weekends only — no public-holiday
   calendar is recorded anywhere on this trip, which is itself worth knowing. */
const businessDaysBefore = (iso, count) => {
  let ms = toUtc(iso);
  let left = count;
  while (left > 0) {
    ms -= DAY_MS;
    const weekday = new Date(ms).getUTCDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return toIso(ms);
};

/* Clock times mentioned in free text, normalised to minutes. "4:45 PM" and "16:45" are the
   same time; "09:00" against an 08:30 line is a conflict the tour manager eats at the door.

   Only a zero-padded 24-hour time or a time carrying am/pm counts. Supplier notes are full
   of "1:10" comp ratios and "2:00" durations, and a callout that cries conflict over a
   ratio is a callout nobody reads by day three. */
const CLOCK_IN_TEXT = /\b(\d{1,2}):([0-5]\d)(\s*[ap]\.?m\.?)?\b/gi;
function clockTimesIn(text) {
  const found = [];
  for (const match of String(text ?? '').matchAll(CLOCK_IN_TEXT)) {
    const meridiem = (match[3] || '').toLowerCase().replace(/[.\s]/g, '');
    if (!meridiem && match[1].length !== 2) continue;
    let hour = Number(match[1]);
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (hour > 23) continue;
    found.push(hour * 60 + Number(match[2]));
  }
  return found;
}

/* ---------- ordering: day, then time, then the order the record lists them in ---------- */

const orderedDays = trip => (trip.days || [])
  .map((day, index) => ({ day, index }))
  .sort((a, b) => String(a.day.date).localeCompare(String(b.day.date)) || a.index - b.index)
  .map(entry => entry.day);

const orderedSlots = day => (day.slots || [])
  .map((slot, index) => ({ slot, index }))
  .sort((a, b) => minutesOf(a.slot.time) - minutesOf(b.slot.time) || a.index - b.index)
  .map(entry => entry.slot);

/* ---------- line state, printed so that silence never reads as "booked" ---------- */

const stateLabel = state => (S.lineState(state) || {}).label || 'State unrecorded';
const stateCell = state => {
  if (!state) return '—';
  return S.isClear(state) ? stateLabel(state) : `${stateLabel(state)} — not confirmed`;
};
const supplierName = (suppliers, id) =>
  (suppliers.get(id) || {}).name || (id ? `Unknown supplier "${id}"` : '');

const reachOf = supplier => {
  if (!supplier) return '—';
  const channel = supplier.channel || {};
  const text = [channel.kind ? prettyChannel(channel.kind) : '', channel.locator || ''].filter(Boolean).join(' · ');
  return text || 'No channel recorded';
};
const contactsOf = supplier => {
  const contacts = asList((supplier || {}).contacts).map(contact =>
    `${contact.role || 'Role not recorded'} (${prettyChannel(contact.channel)})`);
  return contacts.length ? contacts.join('; ') : 'No contact role recorded';
};

/* ---------- headcount ---------- */

function headcountOf(trip) {
  const record = (trip.trip || {}).headcount || {};
  const paying = typeof record.paying_minimum === 'number' ? record.paying_minimum : null;
  const comps = typeof record.trip_granted_comps === 'number' ? record.trip_granted_comps : 0;
  return { paying, comps, travelling: paying === null ? null : paying + comps, tiers: record.tiers || [] };
}
const headcountPhrase = count => count.travelling === null
  ? 'headcount not recorded'
  : `${count.travelling} travelling (${count.paying} paying + ${plural(count.comps, 'trip-granted comp', 'trip-granted comps')})`;

/* ---------- supplier terms, written out in the order they bite ----------

   Kept as { kind, text } rather than prose so that the pre-travel deadline list can select
   entries by kind. Matching English back out of a sentence would break the moment the
   sentence is reworded, and the list would quietly shorten. */

const comparableComps = comp => typeof comp.ratio === 'number' || typeof comp.ratio === 'string';

function termEntries(supplier, anchorDate) {
  const terms = (supplier || {}).terms || {};
  const entries = [];
  const add = (kind, text) => entries.push({ kind, text });

  const price = terms.unit_price;
  if (price) {
    const basis = (S.COST_BASIS[price.basis] || {}).label || price.basis;
    const label = price.unit_label && price.unit_label.toLowerCase() !== String(basis).toLowerCase()
      ? ` (${price.unit_label})` : '';
    add('rate', `Rate ${money(price.amount)} — ${basis}${label}.`);
  }
  if (terms.minimum) {
    add('minimum', sentence(`Minimum ${terms.minimum.count} ${terms.minimum.unit || 'people'}${terms.minimum.note ? ` — ${terms.minimum.note}` : ''}`));
  }
  const comp = terms.comp_policy;
  if (comp) {
    const kind = S.COMP_KINDS[comp.kind] || {};
    const effect = kind.effect === 'reduces_cost' ? 'reduces cost' : 'is carried by the paying travellers';
    const extras = asList(comp.extras).length ? `, plus ${asList(comp.extras).join(', ')}` : '';
    const ratio = comparableComps(comp)
      ? `one free place per ${comp.ratio} paid${extras}`
      : `ratio not recorded${extras}`;
    add('comp', `${kind.label || comp.kind}: ${ratio}. This ${effect} and is a different quantity from the trip-granted comps.`);
  }
  if (terms.deposit) {
    add('deposit', `Deposit ${money(terms.deposit.amount)}${terms.deposit.paid_on ? ` — paid ${terms.deposit.paid_on}` : ' — not recorded as paid'}.`);
  }
  if (typeof terms.balance_due_days === 'number') {
    add('balance', `Balance due ${plural(terms.balance_due_days, 'day', 'days')}. The record does not say which date that counts from — settle it before travel.`);
  }
  if (typeof terms.final_headcount_due_business_days === 'number') {
    const due = businessDaysBefore(anchorDate, terms.final_headcount_due_business_days);
    add('headcount', `Final headcount and payment ${plural(terms.final_headcount_due_business_days, 'business day', 'business days')} ahead — ${due}, counted back from ${anchorDate} (derived; weekends only, no public-holiday calendar is recorded).`);
  }
  if (asList(terms.payment_methods).length) add('payment', `Pays by: ${asList(terms.payment_methods).join('; ')}.`);
  if (terms.release_date) add('release', `Space releases ${terms.release_date}.`);
  if (terms.cancellation) add('cancellation', sentence(`Cancellation: ${terms.cancellation}`));
  if (!entries.length) add('none', 'No terms recorded — nothing to hold this supplier to, and nothing to check at the door.');
  return entries;
}

const DEADLINE_KINDS = new Set(['deposit', 'balance', 'headcount', 'release', 'cancellation', 'payment']);
const termLines = (supplier, anchorDate) => termEntries(supplier, anchorDate).map(entry => entry.text);
const deadlineLines = (supplier, anchorDate) => termEntries(supplier, anchorDate)
  .filter(entry => DEADLINE_KINDS.has(entry.kind)).map(entry => entry.text);

/* ---------- operational steps: never dropped ---------- */

function opsRowsFor(day) {
  const rows = [];
  for (const slot of orderedSlots(day)) {
    const steps = Array.isArray(slot.ops_steps) ? slot.ops_steps.filter(Boolean) : [];
    if (slot.ops) rows.push({ time: slot.time, step: slot.title, where: 'the line itself', slot });
    for (const step of steps) {
      rows.push({ time: slot.time, step, where: `inside the ${hhmm(slot.time)} line "${slot.title}"`, slot });
    }
  }
  return rows;
}
const opsCount = trip => orderedDays(trip).reduce((total, day) => total + opsRowsFor(day).length, 0);

/* ---------- the time conflict, surfaced on the day it bites ---------- */

/* Only the line's own note is read as evidence about the line's time. A supplier's notes
   describe the supplier — opening hours, policies, the times of its other lines — and
   comparing those against every line it covers invents conflicts. Supplier notes still
   print in full, under "Watch on this day". */
function conflictFor(slot, supplier) {
  const printed = minutesOf(slot.time);
  if (printed < 0) return null;
  const mentioned = clockTimesIn(slot.note);
  const others = [...new Set(mentioned.filter(value => value !== printed))].sort((a, b) => a - b);
  if (!others.length) return null;
  /* Times on both sides of the printed time read as a window that contains it — "arrive
     between 08:00 and 09:00" is not a disagreement. */
  if (others[0] < printed && others[others.length - 1] > printed) return null;
  return {
    slot,
    supplier,
    printed: hhmm(slot.time),
    others: others.map(fromMinutes),
    /* A later time on record means the printed time cannot be met. An earlier one means the
       record holds two times; both need settling, but only one of them is a promise that is
       already broken. */
    unmeetable: others.some(value => value > printed),
    text: sentence(slot.note)
  };
}

const conflictsOn = (day, suppliers) => orderedSlots(day)
  .map(slot => conflictFor(slot, suppliers.get(slot.supplier_id)))
  .filter(Boolean);

/* ---------- coverage: a line with no supplier that an inclusion nevertheless sells ---------- */

const inclusionsForSlot = (trip, slotId) =>
  (trip.inclusions || []).filter(inclusion => (inclusion.slot_ids || []).includes(slotId));

/* What the group has already paid for. `included` on the line is the first answer, but an
   inclusion pointing at the line is the same promise written on the page the client keeps,
   so a line the record forgot to flag still reads as sold. */
function soldCell(trip, slot) {
  const covered = inclusionsForSlot(trip, slot.id).length > 0;
  if (slot.included === true) return 'Included';
  if (slot.included === false) return covered ? 'At own cost · part sold' : 'At own cost';
  return covered ? 'Included (sold as an inclusion)' : '—';
}

/* ---------- document ---------- */

function build(trip) {
  const head = trip.trip || {};
  const client = head.client || {};
  const suppliers = supplierIndex(trip);
  const days = orderedDays(trip);
  const count = headcountOf(trip);
  /* Everything below walks the sorted view, so the order the record happens to list days
     and slots in never reaches the page. */
  const ordered = days.flatMap(day => orderedSlots(day).map(slot => ({ day, slot })));
  const supplied = ordered.filter(({ slot }) => slot.supplier_id);
  const unconfirmed = supplied.filter(({ slot }) => !S.isClear(slot.state));

  /* The first day a supplier appears is where its terms and history are written out in
     full; later days keep the call details without repeating the paperwork. */
  const firstDayOf = new Map();
  days.forEach((day, index) => {
    for (const slot of orderedSlots(day)) {
      if (slot.supplier_id && !firstDayOf.has(slot.supplier_id)) firstDayOf.set(slot.supplier_id, index);
    }
  });
  /* A supplier with no line of its own still has money and deadlines on this trip, so its
     terms are anchored to the first day of travel rather than dropped. */
  const anchorFor = supplier => firstDayOf.has(supplier.id)
    ? days[firstDayOf.get(supplier.id)].date
    : head.start_date;

  const out = [];
  out.push(`# Run sheet — ${head.title || head.id || 'Trip'}`);
  out.push('');
  out.push(`Trip \`${head.id}\` · record version \`${head.version}\` · prepared ${head.prepared_on} · generated from \`${trip._file}\` by \`pipeline/trip/cli.cjs\`.`);
  out.push('');
  out.push('**Operational document — for the tour manager travelling with the group.** It carries the times, the load and unload steps, who the counterparty is on every line and how to reach them, the state each line is actually in, and what falls due. It is not the client itinerary and it is not a sales document: a line here says what is held, not what was printed.');
  out.push('');
  out.push('The client-facing iteration of this trip was rewritten, read better afterwards, and lost an operational line on the way. Every step recorded against this trip is printed below, under the day it happens.');
  out.push('');

  /* --- the trip in one block --- */
  out.push('## The trip');
  out.push('');
  out.push(table(['Field', 'Value'], [
    ['Group', `${client.ensemble || '—'} — ${client.organization || '—'}`],
    ['Travelling from', client.origin || '—'],
    ['Destination', head.destination || '—'],
    ['Dates', `${head.start_date} to ${head.end_date} · ${plural(days.length, 'day', 'days')}`],
    ['Operator', head.operator || '—'],
    ['Group contact on the road', `${client.recipient_role || 'the director'} (role only — see the privacy rule)`],
    ['Headcount', headcountPhrase(count)],
    ['Price quoted at tiers', count.tiers.length ? count.tiers.join(', ') : 'not recorded']
  ]));
  out.push('');

  const staffing = asList(head.staffing).map(person =>
    sentence(`**${person.role || 'Role not recorded'}** — assigned${person.note ? `. ${person.note}` : ''}`));
  if (staffing.length) {
    out.push('**Staffing.**');
    out.push('');
    out.push(bullets(staffing));
    out.push('');
  }
  const verification = asList(head.verification).map(item =>
    sentence(`${item.what}: **${item.value}**${item.note ? `. ${item.note}` : ''}`));
  if (verification.length) {
    out.push('**Checked against the record.**');
    out.push('');
    out.push(bullets(verification));
    out.push('');
  }

  /* --- headcount: two quantities that are not the same quantity --- */
  out.push('### Headcount');
  out.push('');
  if (count.travelling === null) {
    out.push('Headcount is not recorded on this trip. Establish it before any supplier deadline.');
  } else {
    out.push(`**${count.travelling} people walk through every door on this trip** — ${count.paying} paying plus ${plural(count.comps, 'trip-granted comp', 'trip-granted comps')}. ${S.COMP_KINDS.trip_granted.description} Any supplier that was asked for ${count.paying} needs to hear ${count.travelling} before its headcount deadline.`);
  }
  out.push('');
  const vendorComps = (trip.suppliers || []).filter(supplier =>
    (((supplier.terms || {}).comp_policy) || {}).kind === 'vendor_earned');
  if (vendorComps.length) {
    out.push(`Vendor-earned comps are a separate quantity and change what is owed, not how many people arrive: ${vendorComps.map(supplier => {
      const comp = supplier.terms.comp_policy;
      const extras = asList(comp.extras).length ? ` plus ${asList(comp.extras).join(', ')}` : '';
      const ratio = comparableComps(comp) ? `one per ${comp.ratio} paid` : 'ratio not recorded';
      return `${supplier.name} — ${ratio}${extras}`;
    }).join('; ')}.`);
    out.push('');
  }

  /* --- state legend with counts --- */
  out.push('### What the state on each line means');
  out.push('');
  const stateCounts = new Map();
  for (const { slot } of supplied) stateCounts.set(slot.state, (stateCounts.get(slot.state) || 0) + 1);
  out.push(table(['State', 'What it means', 'Word a client document may use', 'Lines on this trip'],
    Object.entries(S.LINE_STATES).map(([key, value]) => [
      value.label, value.description, value.client_word, String(stateCounts.get(key) || 0)
    ])));
  out.push('');
  const clear = supplied.length - unconfirmed.length;
  out.push(`**${clear} of ${plural(supplied.length, 'supplied line', 'supplied lines')} on this trip ${clear === 1 ? 'is' : 'are'} confirmed.** The tour manager is the person who finds out at the door, so every line below prints its state and anything short of *Confirmed* is marked *not confirmed*.`);
  out.push('');

  /* --- before you travel --- */
  out.push('## Before you travel');
  out.push('');
  const preTrip = [];
  const allConflicts = days.flatMap((day, index) =>
    conflictsOn(day, suppliers).map(conflict => ({ conflict, day, index })));
  for (const { conflict, day, index } of allConflicts) {
    preTrip.push(`**Time conflict — Day ${index + 1}, ${day.label || day.date}.** The ${conflict.printed} line "${conflict.slot.title}" carries a note recording ${conflict.others.join(' and ')}. ${conflict.unmeetable ? 'The printed time cannot be met as written; fix' : 'Two times are on record for one line; settle'} the running order before the coaches move.`);
  }
  const sourcing = supplied.filter(({ slot }) => slot.state === 'sourcing');
  for (const { day, slot } of sourcing) {
    const supplier = suppliers.get(slot.supplier_id) || {};
    const candidates = asList(supplier.candidates).map(candidate => `${candidate.name} (${candidate.status})`);
    preTrip.push(`**No venue settled for the ${hhmm(slot.time)} line "${slot.title}" on ${day.label || day.date}.** ${S.LINE_STATES.sourcing.description}${candidates.length ? ` Candidates on the record: ${candidates.join('; ')}.` : ''}`);
  }
  /* Every supplier on the record, not only the ones with a line. A counterparty attached
     through an inclusion still takes a deposit and still has to be called. */
  const offItinerary = supplier => firstDayOf.has(supplier.id) ? '' : ' (no line on the itinerary)';
  const noAttempt = asList(trip.suppliers).filter(supplier => !asList(supplier.attempts).length);
  if (noAttempt.length) {
    preTrip.push(`**${plural(noAttempt.length, 'supplier has', 'suppliers have')} no contact attempt recorded at all:** ${noAttempt.map(supplier => `${supplier.name} (${reachOf(supplier)})${offItinerary(supplier)}`).join('; ')}. Nobody there is expecting this group.`);
  }
  for (const supplier of asList(trip.suppliers)) {
    const variants = asList(supplier.venue_variants);
    if (!variants.length) continue;
    preTrip.push(`**Two venues on record for ${supplier.name}:** ${variants.map(variant => `${variant.name} (${variant.observed_in})`).join(' and ')}. Confirm which address the coaches are driving to.`);
  }
  for (const inclusion of asList(trip.inclusions).filter(entry => !asList(entry.slot_ids).length)) {
    preTrip.push(`**Sold with nowhere to happen: "${inclusion.text}"**${inclusion.supplier_id ? ` (${supplierName(suppliers, inclusion.supplier_id)})` : ''}. The group has paid for it and there is no time slot for it in ${plural(days.length, 'day', 'days')}.`);
  }
  const deadlineNotes = [];
  for (const supplier of asList(trip.suppliers)) {
    const deadlines = deadlineLines(supplier, anchorFor(supplier));
    if (deadlines.length) deadlineNotes.push(`**${supplier.name}**${offItinerary(supplier)} — ${deadlines.join(' ')}`);
  }
  if (deadlineNotes.length) {
    preTrip.push(`**Deadlines and money recorded against this trip:**\n  - ${deadlineNotes.join('\n  - ')}`);
  }
  out.push(preTrip.length ? bullets(preTrip) : '- Nothing outstanding is recorded against this trip.');
  out.push('');

  /* --- the days --- */
  days.forEach((day, index) => {
    const slots = orderedSlots(day);
    const dayConflicts = conflictsOn(day, suppliers);
    const ops = opsRowsFor(day);
    const daySupplied = slots.filter(slot => slot.supplier_id);
    const dayConfirmed = daySupplied.filter(slot => S.isClear(slot.state)).length;

    out.push(`## Day ${index + 1} — ${day.label || day.date}`);
    out.push('');
    out.push(`\`${day.date}\` · ${plural(slots.length, 'line', 'lines')} · ${plural(ops.length, 'operational step', 'operational steps')} · ${dayConfirmed} of ${plural(daySupplied.length, 'supplied line', 'supplied lines')} confirmed · ${headcountPhrase(count)}.`);
    out.push('');

    for (const conflict of dayConflicts) {
      out.push(`> **Conflict on this day — ${conflict.printed} ${conflict.slot.title}.** The itinerary prints ${conflict.printed}; the note on the line records ${conflict.others.join(' and ')}. ${conflict.unmeetable ? 'The printed time cannot be met as written.' : 'One line, two times on record.'}`);
      out.push('>');
      out.push(`> ${conflict.text}`);
      out.push('>');
      out.push(`> Line state: **${stateCell(conflict.slot.state)}**${conflict.supplier ? ` · reach ${conflict.supplier.name} on ${reachOf(conflict.supplier)}` : ''}.`);
      out.push('>');
      out.push('> To fix: agree one time with the supplier, put it in the record, and reprint this sheet. Do not let the two times travel.');
      out.push('');
    }

    /* A line the group is standing in front of with no settled venue, or an address the
       record holds two ways, is a day-of problem and is printed as one. */
    const sourcingToday = slots.filter(slot => slot.state === 'sourcing');
    for (const slot of sourcingToday) {
      const supplier = suppliers.get(slot.supplier_id);
      const candidates = asList((supplier || {}).candidates).map(candidate => `${candidate.name} (${candidate.status})`);
      out.push(`> **No venue settled — ${hhmm(slot.time)} ${slot.title}.** ${S.LINE_STATES.sourcing.description} The itinerary prints this line as if it were settled.`);
      if (candidates.length) {
        out.push('>');
        out.push(`> Candidates on the record: ${candidates.join('; ')}.`);
      }
      out.push('>');
      out.push(`> Line state: **${stateCell(slot.state)}**${supplier ? ` · reach ${supplier.name} on ${reachOf(supplier)}` : ''}.`);
      out.push('');
    }
    const variantIdsToday = [];
    for (const slot of slots) {
      if (!slot.supplier_id || variantIdsToday.includes(slot.supplier_id)) continue;
      if (asList((suppliers.get(slot.supplier_id) || {}).venue_variants).length) variantIdsToday.push(slot.supplier_id);
    }
    for (const id of variantIdsToday) {
      const supplier = suppliers.get(id);
      const covered = slots.filter(slot => slot.supplier_id === id).map(slot => `${hhmm(slot.time)} ${slot.title}`);
      out.push(`> **Two addresses on record — ${covered.join('; ')}.** ${supplier.name} is printed at ${supplier.venue_variants.map(variant => `${variant.name} (${variant.observed_in})`).join(' and ')}. The coaches can only go to one of them.`);
      out.push('>');
      out.push(`> Confirm the address on ${reachOf(supplier)} before the group leaves for it.`);
      out.push('');
    }

    out.push('### Running order');
    out.push('');
    out.push(table(['Time', 'Line', 'Supplier', 'Reach via', 'State', 'Sold?'], slots.map(slot => {
      const supplier = suppliers.get(slot.supplier_id);
      const duration = typeof slot.duration_minutes === 'number' ? ` · ${slot.duration_minutes} min` : '';
      const marker = (slot.ops || asList(slot.ops_steps).length) ? ' **[ops]**' : '';
      return [
        hhmm(slot.time),
        `${slot.title}${duration}${marker}`,
        slot.supplier_id ? supplierName(suppliers, slot.supplier_id) : 'No supplier on this line',
        reachOf(supplier),
        stateCell(slot.state),
        soldCell(trip, slot)
      ];
    })));
    out.push('');

    out.push('### Operational steps');
    out.push('');
    if (ops.length) {
      out.push(table(['Time', 'Step', 'Where it sits'], ops.map(row => [hhmm(row.time), row.step, row.where])));
      out.push('');
      out.push(`${plural(ops.length, 'step', 'steps')} on this day. These are the lines a rewrite drops first; none of them is optional.`);
    } else {
      out.push('No operational step is recorded against this day. If the group loads, unloads or changes, the step belongs in the record rather than in somebody\'s memory.');
    }
    out.push('');

    out.push('### Who to call today');
    out.push('');
    const daySupplierIds = [];
    for (const slot of slots) {
      if (slot.supplier_id && !daySupplierIds.includes(slot.supplier_id)) daySupplierIds.push(slot.supplier_id);
    }
    if (daySupplierIds.length) {
      out.push(table(['Supplier', 'Category', 'Reach via', 'Contact roles', 'Lines today', 'State'], daySupplierIds.map(id => {
        const supplier = suppliers.get(id);
        const covered = slots.filter(slot => slot.supplier_id === id);
        return [
          supplierName(suppliers, id),
          (supplier || {}).category || '—',
          reachOf(supplier),
          contactsOf(supplier),
          covered.map(slot => `${hhmm(slot.time)} ${slot.title}`).join('; '),
          [...new Set(covered.map(slot => stateCell(slot.state)))].join('; ')
        ];
      })));
      out.push('');
      for (const id of daySupplierIds) {
        const supplier = suppliers.get(id);
        if (!supplier || !asList(supplier.related_supplier_ids).length) continue;
        out.push(`One counterparty, several lines: ${supplier.name} is handled with ${supplier.related_supplier_ids.map(other => supplierName(suppliers, other)).join(', ')} — one call can cover both.`);
        out.push('');
      }
    } else {
      out.push('No supplier is recorded against any line on this day.');
      out.push('');
    }

    out.push('### Money and deadlines on this day\'s lines');
    out.push('');
    const due = [];
    for (const id of daySupplierIds) {
      /* Terms are written out on the first day a counterparty appears; later days keep the
         call details above without reprinting the paperwork. */
      if (firstDayOf.get(id) !== index) continue;
      const supplier = suppliers.get(id);
      if (!supplier) continue;
      const parts = termLines(supplier, day.date);
      const minimum = (supplier.terms || {}).minimum;
      if (minimum && count.travelling !== null) {
        parts.push(`That minimum sits against ${count.travelling} travelling.`);
      }
      due.push(`**${supplier.name}.** ${parts.join(' ')}`);
    }
    out.push(due.length ? bullets(due) : '- Every counterparty on this day is covered above, on the day it first appears.');
    out.push('');

    out.push('### Watch on this day');
    out.push('');
    const watch = [];
    const notedInclusions = new Set();
    for (const slot of slots) {
      /* Every line note is printed, including one that also fed a callout above. A note
         dropped because it was covered "somewhere else" is how this trip lost a line. */
      if (slot.note) watch.push(`**${hhmm(slot.time)} ${slot.title}.** ${sentence(slot.note)}`);
      if (!slot.supplier_id) {
        for (const inclusion of inclusionsForSlot(trip, slot.id).filter(entry => entry.supplier_id)) {
          watch.push(`**${hhmm(slot.time)} ${slot.title}** records no supplier, yet it is sold under "${inclusion.text}" (${supplierName(suppliers, inclusion.supplier_id)}). The line and the thing being sold are not joined up.`);
        }
      }
      for (const inclusion of inclusionsForSlot(trip, slot.id)) {
        if (!inclusion.note || notedInclusions.has(inclusion.id)) continue;
        notedInclusions.add(inclusion.id);
        watch.push(`**Sold as "${inclusion.text}".** ${sentence(inclusion.note)}`);
      }
    }
    for (const id of daySupplierIds) {
      if (firstDayOf.get(id) !== index) continue;
      const supplier = suppliers.get(id);
      if (!supplier) continue;
      const notices = [];
      if ((supplier.terms || {}).notes) notices.push(sentence(supplier.terms.notes));
      if (supplier.note) notices.push(sentence(supplier.note));
      /* Candidates and venue variants already have a callout at the head of the day. */
      const attempts = asList(supplier.attempts).map(attempt =>
        `${attempt.date} ${prettyChannel(attempt.channel)} ${attempt.direction} — ${attempt.outcome}`);
      notices.push(attempts.length
        ? `Contact history: ${attempts.join('; ')}.`
        : 'No contact attempt is recorded against this supplier.');
      watch.push(`**${supplier.name}.** ${notices.join(' ')}`);
    }
    out.push(watch.length ? bullets(watch) : '- Nothing further is recorded against this day.');
    out.push('');
  });

  /* --- footer --- */
  out.push('## What this sheet does not carry');
  out.push('');
  out.push(bullets([
    'The traveller price table. What a family paid per person belongs to the client documents; a run sheet that quotes it invites a doorstep negotiation. Supplier rates are here because somebody may have to settle one.',
    'Personal names, mailboxes and direct numbers. Every individual is held as a role and every supplier is reached through its published group-sales channel, per the privacy rule in `pipeline/trip/README.md`.',
    `Anything that is not in the record. ${unconfirmed.length ? `${plural(unconfirmed.length, 'supplied line is', 'supplied lines are')} still short of confirmed; ` : ''}where a term, a time or a headcount is missing here, it is missing from the trip.`
  ]));
  out.push('');
  out.push(`Regenerate with \`node pipeline/trip/cli.cjs render ${head.id}\`. \`node pipeline/trip/cli.cjs check --all\` fails if this sheet has drifted from the record — which is the point: the record is the database, not this page.`);
  out.push('');

  return out.join('\n');
}

module.exports = {
  name: 'run-sheet',
  description: 'The tour manager\'s day-by-day run sheet: running order, every operational step, supplier and channel per line, confirmation state, headcount and what falls due.',
  outputs(trip) {
    return new Map([[DOC, build(trip)]]);
  },
  /* Exported for the tests in tests/trip_run_sheet.test.cjs, not for other renderers. */
  _internals: {
    build, opsRowsFor, opsCount, conflictFor, conflictsOn, termEntries, deadlineLines, soldCell, asList,
    orderedDays, orderedSlots, businessDaysBefore, clockTimesIn, hhmm, headcountOf
  }
};
