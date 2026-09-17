/* Critical-path deadline calendar.

   The constraint that actually governs a change — "final headcount five business days
   before", "balance ten days before" — arrives in an email and attaches to nothing. When a
   date or a headcount moves, the list of people who have to be called gets rebuilt from
   memory. This renderer computes that list from the supplier terms already in the record.

   Two rules make the dates right rather than merely plausible:

   1. A deadline is anchored to the date of the itinerary slot that supplier serves, not to
      the trip start. A supplier serving day four has a later deadline than one serving day one.
   2. Business days are Monday to Friday, counted backwards one day at a time. Public
      holidays are not modelled, and the document says so where a reader will see it.

   Deterministic: every date is derived from the record. No clock, no randomness. */

const { lines, slotsForSupplier } = require('../load.cjs');
const S = require('../schema.cjs');

const DAY_MS = 86400000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* Term fields that can put a date in the calendar. Anything else in `terms` is a price, a
   threshold or a note — real, but not a date. */
const DATE_BEARING_TERMS = ['final_headcount_due_business_days', 'balance_due_days', 'release_date', 'deposit'];

/* Of those, the two that are counted backwards from an itinerary date. The other two are
   dates the supplier named outright, and a `deposit` may be a past payment rather than any
   kind of future date at all. The distinction decides what a reader is told to do about it. */
const ANCHOR_DERIVED_TERMS = ['final_headcount_due_business_days', 'balance_due_days'];

/* ---------- markdown + formatting ---------- */

const cell = value => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
const pad = n => String(n).padStart(2, '0');
const money = amount => (typeof amount === 'number' ? `$${amount.toFixed(2)}` : 'not recorded');
const table = (header, rows) => [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`, ...rows].join('\n');

/* Code-unit order, not collation. `check --all` compares bytes, and `localeCompare` varies
   with the host's ICU build and default locale — a tie broken one way here and another way
   on a colleague's machine would fail the check for no reason anyone could see. */
const byText = (a, b) => {
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
};

/* ---------- date arithmetic, all UTC so no host timezone can move a deadline ---------- */

function assertIsoShape(value, what) {
  if (!ISO_DATE.test(String(value))) throw new Error(`${what} must be YYYY-MM-DD; found ${JSON.stringify(value)}.`);
  return String(value);
}

/* A day count that is negative, fractional or a string produces a date that looks real and
   is not: -10 puts the "deadline" after the visit, 7.5 gets truncated while the printed rule
   still says 7.5. `validateTrip` does not type-check these, so the renderer does. */
function assertDayCount(value, what) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${what} must be a non-negative integer number of days; found ${JSON.stringify(value)}.`);
  }
  return value;
}

function toIso(ms) {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function toMs(iso) {
  const text = assertIsoShape(iso, 'date');
  const [year, month, day] = text.split('-').map(Number);
  const ms = Date.UTC(year, month - 1, day);
  /* Date.UTC rolls 2027-02-30 forward into March without complaint. A deadline calendar
     must not silently invent a date, so the round trip has to match. */
  if (toIso(ms) !== text) throw new Error(`No such calendar date: ${text}.`);
  return ms;
}

const dayOfWeek = iso => new Date(toMs(iso)).getUTCDay();
const weekday = iso => WEEKDAYS[dayOfWeek(iso)];
const isWeekend = iso => dayOfWeek(iso) === 0 || dayOfWeek(iso) === 6;
const stamp = iso => `${iso} (${SHORT_DAYS[dayOfWeek(iso)]})`;
const shiftDays = (iso, days) => toIso(toMs(iso) + Math.trunc(days) * DAY_MS);
const calendarDaysBetween = (from, to) => Math.round((toMs(to) - toMs(from)) / DAY_MS);

/* Count `count` business days backwards from `iso`, exclusive of `iso` itself: the fifth
   business day before Thursday 2027-04-08 is Thursday 2027-04-01, two weekend days skipped.
   `trail` is the working, newest first, so a reader can check it against a wall calendar. */
function businessDaysBefore(iso, count) {
  assertDayCount(count, 'A business-day count');
  const anchor = toMs(iso);
  const trail = [];
  let ms = anchor;
  let remaining = count;
  while (remaining > 0) {
    ms -= DAY_MS;
    const day = new Date(ms).getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
      trail.push(toIso(ms));
    }
  }
  const date = toIso(ms);
  return { date, trail, weekend_days_skipped: Math.round((anchor - ms) / DAY_MS) - count };
}

/* ---------- reading the record ---------- */

/* The earliest slot a supplier serves. A deadline has to clear the first time the group is
   in front of that counterparty, not the last. */
/* `load.cjs` accepts an unpadded hour ("9:30"), which sorts after "14:00" as a plain string
   and would name the wrong slot as the anchor. Pad before comparing. */
const sortKey = ({ day, slot }) => `${day.date}T${String(slot.time || '').padStart(5, '0')}`;

function anchorFor(trip, supplier) {
  const served = slotsForSupplier(trip, supplier.id)
    .slice()
    .sort((a, b) => byText(sortKey(a), sortKey(b)));
  if (!served.length) return null;
  const first = served[0];
  return {
    date: first.day.date,
    slot: first.slot,
    day: first.day,
    served_lines: served.length,
    dates: [...new Set(served.map(entry => entry.day.date))]
  };
}

const ownerOf = supplier => (supplier.relationship || {}).owner || 'Unassigned';

/* Roles and channels only. No individual and no direct number leaves this layer. */
function callCell(supplier) {
  const byRole = new Map();
  for (const contact of supplier.contacts || []) {
    const role = contact.role || 'Contact';
    if (!byRole.has(role)) byRole.set(role, []);
    const channels = byRole.get(role);
    if (contact.channel && !channels.includes(contact.channel)) channels.push(contact.channel);
  }
  const who = [...byRole].map(([role, channels]) => (channels.length ? `${role} (${channels.join(', ')})` : role)).join('; ');
  return who ? `${ownerOf(supplier)} → ${who}` : ownerOf(supplier);
}

const sourceIds = supplier => (supplier.source_ids || []).join(', ') || 'none recorded';

function sourceDetail(trip, ids) {
  const index = new Map((trip.sources || []).map(source => [source.id, source]));
  return (ids || []).map(id => {
    const source = index.get(id);
    if (!source) return id;
    const kind = (S.SOURCE_KINDS[source.kind] || {}).label || source.kind;
    return `\`${id}\` — ${kind}: ${source.locator}`;
  });
}

const hasValue = value => value !== undefined && value !== null;

function depositState(terms) {
  const deposit = terms.deposit;
  if (!deposit) return null;
  if (deposit.paid_on) return 'paid';
  if (deposit.due_on) return 'due';
  return 'recorded without a date';
}

/* Which date-bearing term fields a supplier actually carries, and which are absent. A field
   present but null (Ruby Falls carries `release_date: null`) is called out as such: somebody
   knew to ask and the answer never came back. */
function deadlineTermReport(supplier) {
  const terms = supplier.terms || {};
  const present = [];
  const empty = [];
  const missing = [];
  for (const field of DATE_BEARING_TERMS) {
    if (!(field in terms)) missing.push(field);
    else if (!hasValue(terms[field])) empty.push(field);
    else present.push(field);
  }
  return { present, empty, missing, cancellation_recorded: hasValue(terms.cancellation) };
}

/* Every anchor-derived day count in the record, checked whether or not it can be anchored.
   Validating only the ones that happen to have a slot would let a supplier carry `-5` today
   and start throwing the day somebody gives it an itinerary line. */
function assertTermShapes(supplier) {
  const terms = supplier.terms || {};
  for (const field of ANCHOR_DERIVED_TERMS) {
    if (hasValue(terms[field])) assertDayCount(terms[field], `${field} for ${supplier.id}`);
  }
  if (hasValue(terms.release_date)) assertIsoShape(terms.release_date, `release_date for ${supplier.id}`);
  /* `"deposit": 100` is the shorthand somebody transcribing a printed page writes, and it
     passes validation. Left alone it renders a payment already made as an unpriced
     outstanding item — the ledger reading the opposite of the truth. */
  if (hasValue(terms.deposit) && (typeof terms.deposit !== 'object' || Array.isArray(terms.deposit))) {
    throw new Error(`deposit for ${supplier.id} must be an object with an amount and a paid_on or due_on date; found ${JSON.stringify(terms.deposit)}.`);
  }
  const deposit = terms.deposit || {};
  if (deposit.due_on) assertIsoShape(deposit.due_on, `deposit.due_on for ${supplier.id}`);
  if (deposit.paid_on) assertIsoShape(deposit.paid_on, `deposit.paid_on for ${supplier.id}`);
}

/* ---------- deadlines ---------- */

function breakage(supplier, kind, anchor) {
  const terms = supplier.terms || {};
  const bits = [];
  if (kind === 'final_headcount') {
    bits.push('The paid count is fixed here and the group rate is quoted against it.');
    if (terms.minimum) bits.push(`Below ${terms.minimum.count} ${terms.minimum.unit} the group rate is gone.`);
    if ((terms.payment_methods || []).includes('single group payment')) {
      bits.push('One group payment is expected, so collection has to be finished by then, not started.');
    }
  }
  if (kind === 'balance') {
    bits.push('The balance is the rest of the money for a date a deposit has already been paid against.');
    const deposit = terms.deposit || {};
    if (deposit.paid_on) bits.push(`${money(deposit.amount)} is already spent on this date (paid ${deposit.paid_on}).`);
    if (!hasValue(terms.cancellation)) bits.push('No cancellation term is recorded, so what a late balance actually costs is unknown.');
  }
  if (kind === 'deposit') bits.push('The deposit that opens the booking is due; nothing is held until it clears.');
  if (kind === 'release') bits.push('Held space is released on this date and goes back on sale at whatever the rate is then.');
  if (anchor && anchor.slot && !S.isClear(anchor.slot.state)) {
    bits.push(`Not confirmed either way: the line is ${S.clientWord(anchor.slot.state)}.`);
  }
  return bits.join(' ');
}

const KIND_LABELS = {
  final_headcount: 'Final headcount',
  balance: 'Balance due',
  deposit: 'Deposit due',
  release: 'Held space released'
};

/* Every deadline the record can actually compute, in date order. */
function deadlinesFor(trip) {
  const found = [];
  for (const supplier of trip.suppliers || []) {
    const terms = supplier.terms || {};
    assertTermShapes(supplier);
    const anchor = anchorFor(trip, supplier);

    const push = (kind, due, detail) => found.push({
      supplier,
      supplier_id: supplier.id,
      kind,
      label: KIND_LABELS[kind],
      due,
      anchor,
      breaks: breakage(supplier, kind, anchor),
      ...detail
    });

    const headcountDays = terms.final_headcount_due_business_days;
    if (hasValue(headcountDays) && anchor) {
      const computed = businessDaysBefore(anchor.date, headcountDays);
      push('final_headcount', computed.date, {
        rule: `${headcountDays} business day${headcountDays === 1 ? '' : 's'} before the visit`,
        term_field: 'final_headcount_due_business_days',
        unit: 'business days',
        count: headcountDays,
        trail: computed.trail,
        weekend_days_skipped: computed.weekend_days_skipped,
        lead_calendar_days: calendarDaysBetween(computed.date, anchor.date)
      });
    }

    const balanceDays = terms.balance_due_days;
    if (hasValue(balanceDays) && anchor) {
      const due = shiftDays(anchor.date, -balanceDays);
      push('balance', due, {
        rule: `${balanceDays} calendar day${balanceDays === 1 ? '' : 's'} before the visit`,
        term_field: 'balance_due_days',
        unit: 'calendar days',
        count: balanceDays,
        trail: [],
        weekend_days_skipped: 0,
        lead_calendar_days: balanceDays
      });
    }

    const deposit = terms.deposit || {};
    if (deposit.due_on && !deposit.paid_on) {
      push('deposit', assertIsoShape(deposit.due_on, 'deposit.due_on'), {
        rule: 'stated by the supplier',
        term_field: 'deposit.due_on',
        unit: 'stated date',
        count: null,
        trail: [],
        weekend_days_skipped: 0,
        lead_calendar_days: anchor ? calendarDaysBetween(deposit.due_on, anchor.date) : null
      });
    }

    if (hasValue(terms.release_date)) {
      push('release', assertIsoShape(terms.release_date, 'release_date'), {
        rule: 'stated by the supplier',
        term_field: 'release_date',
        unit: 'stated date',
        count: null,
        trail: [],
        weekend_days_skipped: 0,
        lead_calendar_days: anchor ? calendarDaysBetween(terms.release_date, anchor.date) : null
      });
    }
  }
  return found.sort((a, b) =>
    byText(a.due, b.due) || byText(a.supplier.name, b.supplier.name) || byText(a.kind, b.kind));
}

/* A supplier-stated date recorded later than the visit it governs. Nothing in the record
   prevents it, and it is worth saying out loud rather than printing as an ordinary row. */
const fallsAfterAnchor = entry => Boolean(entry.anchor) && entry.lead_calendar_days !== null && entry.lead_calendar_days < 0;

/* The same deadline against a different anchor date — what a date change would produce.
   `null` means the term is a date the supplier stated outright: it does not recompute,
   it gets renegotiated. */
function recomputedDue(entry, anchorDate) {
  if (entry.term_field === 'final_headcount_due_business_days') return businessDaysBefore(anchorDate, entry.count).date;
  if (entry.term_field === 'balance_due_days') return shiftDays(anchorDate, -entry.count);
  return null;
}

/* One report per supplier, accounting for every date-bearing term rather than only the ones
   that happened to produce a date. A term that is recorded and still yields nothing is its
   own finding, and it sends the reader somewhere different from a term that was never
   recorded at all: one is a missing itinerary line, the other is a phone call. */
function supplierReports(trip) {
  const deadlinesBySupplier = new Map();
  for (const entry of deadlinesFor(trip)) {
    if (!deadlinesBySupplier.has(entry.supplier_id)) deadlinesBySupplier.set(entry.supplier_id, []);
    deadlinesBySupplier.get(entry.supplier_id).push(entry);
  }

  return (trip.suppliers || []).map(supplier => {
    const terms = supplier.terms || {};
    const anchor = anchorFor(trip, supplier);
    const computed = deadlinesBySupplier.get(supplier.id) || [];
    const report = deadlineTermReport(supplier);

    /* Recorded, and still no date. Two distinct reasons, kept apart. */
    const unanchorable = anchor ? [] : ANCHOR_DERIVED_TERMS.filter(field => hasValue(terms[field]));
    const inert = [];
    if (terms.deposit && !computed.some(entry => entry.kind === 'deposit')) {
      inert.push(terms.deposit.paid_on
        ? `deposit (paid ${terms.deposit.paid_on} — a payment already made, not a date ahead)`
        : 'deposit (recorded with no due date)');
    }

    return { supplier, anchor, computed, unanchorable, inert, ...report };
  });
}

/* Two different reasons a supplier produces no date, and they send you to different places. */
function whyNoDate(report) {
  if (report.unanchorable.length) {
    return `${report.unanchorable.join(' · ')} recorded, but this supplier is on no itinerary line to anchor it to`;
  }
  if (report.inert.length) return `${report.inert.join(' · ')}; nothing here produces a date ahead`;
  /* "Never asked" and "asked, no answer came back" are different problems and are not
     collapsed into one "not recorded" list. */
  const parts = [];
  if (report.missing.length) parts.push(`Not recorded: ${report.missing.join(' · ')}`);
  if (report.empty.length) parts.push(`Recorded and left empty: ${report.empty.join(' · ')}`);
  return parts.join('. ') || 'No date-bearing term produces a date';
}

/* The absence is the finding, not a blank row. */
function suppliersWithoutDeadline(trip) {
  return supplierReports(trip).filter(report => !report.computed.length);
}

/* Terms that are written down and still yield no date, wherever they sit — including on a
   supplier that carries some other deadline and would otherwise look fully handled. */
function undatableTerms(trip) {
  const rows = [];
  for (const report of supplierReports(trip)) {
    for (const field of report.unanchorable) {
      rows.push({ supplier: report.supplier, term: field, field: true, why: 'Recorded, but this supplier is on no itinerary line to anchor it to. Give it a slot and the date computes itself.' });
    }
    for (const field of report.empty) {
      rows.push({ supplier: report.supplier, term: field, field: true, why: 'Present in the record and left empty. Somebody knew to ask; the answer never came back.' });
    }
    for (const note of report.inert) {
      rows.push({ supplier: report.supplier, term: note, field: false, why: 'Recorded, and not a date ahead of the trip.' });
    }
  }
  return rows;
}

/* What has been paid, what is outstanding, and when it is due. */
function ledgerFor(trip) {
  const rows = [];
  const deadlines = deadlinesFor(trip);
  for (const supplier of trip.suppliers || []) {
    const terms = supplier.terms || {};
    const deposit = terms.deposit;
    if (deposit) {
      rows.push({
        supplier,
        item: 'Deposit',
        amount: deposit.amount,
        basis: (S.COST_BASIS[deposit.basis] || {}).label || deposit.basis || 'not recorded',
        status: depositState(terms) === 'paid' ? 'Paid' : 'Outstanding',
        when: deposit.paid_on ? `paid ${stamp(deposit.paid_on)}` : (deposit.due_on ? `due ${stamp(deposit.due_on)}` : 'no date recorded')
      });
    }
    if (hasValue(terms.balance_due_days)) {
      const due = deadlines.find(entry => entry.supplier_id === supplier.id && entry.kind === 'balance');
      rows.push({
        supplier,
        item: 'Balance',
        /* `TERM_FIELDS` carries a balance *timing* and no balance amount. That is not an
           oversight to paper over here: the date is knowable and the sum is not. */
        amount: null,
        basis: 'not recorded',
        status: 'Outstanding',
        when: due ? `due ${stamp(due.due)}` : `${terms.balance_due_days} days before the visit; no itinerary line to anchor to`
      });
    }
  }
  return rows;
}

/* ---------- document ---------- */

function buildMarkdown(trip) {
  const head = trip.trip;
  const allLines = lines(trip);
  const supplied = allLines.filter(({ slot }) => slot.supplier_id);
  const deadlines = deadlinesFor(trip);
  const without = suppliersWithoutDeadline(trip);
  const ledger = ledgerFor(trip);
  const carrying = new Set(deadlines.map(entry => entry.supplier_id)).size;

  const stateCounts = new Map();
  for (const { slot } of supplied) stateCounts.set(slot.state, (stateCounts.get(slot.state) || 0) + 1);
  const stateSummary = [...stateCounts]
    .sort((a, b) => b[1] - a[1] || byText(a[0], b[0]))
    .map(([state, count]) => `${count} ${(S.lineState(state) || {}).label || state}`)
    .join(' · ');

  const out = [];
  out.push(`# Critical-path deadlines — ${cell(head.title || head.id)}`, '');
  out.push(`\`${cell(head.id)}\` · ${cell(head.version)} · ${cell(head.start_date)} to ${cell(head.end_date)} · ${cell(head.destination)}`);
  out.push(`Operator ${cell(head.operator)} · record \`${cell(trip._file || 'pipeline/trip/trips')}\` · prepared ${cell(head.prepared_on)}`, '');
  out.push('> Generated from the supplier terms in the trip record. It is a set of dates and a call list.',
    '> It does not contact anyone, hold inventory, or take a payment.', '');

  out.push('## How these dates are computed', '');
  out.push('- Each deadline is anchored to the date of the itinerary slot **that supplier serves**, not to the trip start. A supplier serving day four has a later deadline than one serving day one. Where a supplier serves several days, the earliest is used.');
  out.push('- `final_headcount_due_business_days` is counted in **business days, Monday to Friday**, backwards from the anchor and not counting the anchor itself. The working is printed under each deadline so it can be checked against a wall calendar.');
  out.push('- **Public holidays are not modelled.** A holiday inside the count pushes the real date earlier than the one printed here. Check any deadline that falls near one.');
  out.push('- `balance_due_days` and supplier-stated dates are taken as **calendar** days, as written.');
  out.push('- Every date here is derived from the record. Nothing is derived from today, so this document is the same bytes on every run.', '');

  out.push('## Where this trip stands', '');
  out.push(`- ${(trip.suppliers || []).length} suppliers across ${supplied.length} supplied itinerary lines (${allLines.length} lines in total).`);
  out.push(`- **${deadlines.length} computed deadline${deadlines.length === 1 ? '' : 's'}**, carried by ${carrying} supplier${carrying === 1 ? '' : 's'}. **${without.length} supplier${without.length === 1 ? '' : 's'} produce${without.length === 1 ? 's' : ''} no date at all.**`);
  const undatableCount = undatableTerms(trip).length;
  if (undatableCount) {
    out.push(`- ${undatableCount} date-bearing term${undatableCount === 1 ? ' is' : 's are'} recorded and still produce no date — see *Terms recorded that still produce no date*. Those are not missing calls; they are gaps of a different kind.`);
  }
  out.push(`- Line states: ${cell(stateSummary || 'none recorded')}.`);
  /* `deposit_paid` is money against a specific date, so it counts as secured even though the
     line is not confirmed. Saying "nothing is held" while the ledger shows a paid deposit
     would be the same kind of wrong this layer exists to stop. */
  const confirmed = supplied.filter(({ slot }) => S.isClear(slot.state)).length;
  const secured = supplied.filter(({ slot }) => slot.state === 'held' || slot.state === 'deposit_paid').length;
  if (!confirmed && !secured) {
    out.push('- Nothing is confirmed, and no space is held or paid against anywhere on this trip, so there is no release date to lose.');
  } else if (!confirmed) {
    out.push(`- Nothing is confirmed. ${secured} line${secured === 1 ? ' is' : 's are'} held or paid against — enough to lose money on a date change, not enough to rely on.`);
  } else {
    out.push(`- ${confirmed} of ${supplied.length} supplied lines confirmed, ${secured} held or paid against, ${supplied.length - confirmed - secured} neither.`);
  }
  out.push('');

  out.push('## The calendar', '');
  if (!deadlines.length) {
    out.push('No supplier term in this record produces a date. That is the finding.', '');
  } else {
    out.push(table(
      ['Due', 'Supplier', 'What is due', 'Computed from', 'Owner', 'What breaks if it is missed'],
      deadlines.map(entry => {
        const anchoring = entry.anchor ? `anchored to ${stamp(entry.anchor.date)}` : 'no itinerary line to anchor to';
        const late = fallsAfterAnchor(entry) ? ' — **after the visit; check the record**' : '';
        return `| **${cell(stamp(entry.due))}** | ${cell(entry.supplier.name)} | ${cell(entry.label)} | ${cell(entry.rule)}, ${cell(anchoring)}${late} | ${cell(callCell(entry.supplier))} | ${cell(entry.breaks)} |`;
      })
    ), '');
    const first = deadlines[0];
    const lead = first.lead_calendar_days === null
      ? 'It has no itinerary line to measure notice against.'
      : `${first.lead_calendar_days} calendar days before the group is in front of them.`;
    out.push(`The first thing that bites is **${cell(first.label.toLowerCase())} for ${cell(first.supplier.name)} on ${cell(stamp(first.due))}** — ${lead}`, '');
  }

  for (const entry of deadlines) {
    out.push(`### ${cell(stamp(entry.due))} — ${cell(entry.supplier.name)}: ${cell(entry.label.toLowerCase())}`, '');
    out.push(`- **Rule** — ${cell(entry.rule)} (\`${cell(entry.term_field)}\`${entry.count === null ? '' : `: ${entry.count}`}).`);
    if (entry.anchor) {
      out.push(`- **Anchor** — ${cell(weekday(entry.anchor.date))} ${cell(entry.anchor.date)}, slot \`${cell(entry.anchor.slot.id)}\` at ${cell(entry.anchor.slot.time)}: ${cell(entry.anchor.slot.title)}.`);
      if (entry.anchor.served_lines > 1) {
        out.push(`  This counterparty covers ${entry.anchor.served_lines} itinerary lines across ${entry.anchor.dates.length} day(s); the earliest anchors the deadline.`);
      }
    } else {
      out.push('- **Anchor** — none. This supplier holds a date but appears on no itinerary line, so nothing recomputes if the trip moves.');
    }
    if (entry.trail.length) {
      out.push(`- **Working** — counting back from ${cell(entry.anchor.date)}: ${entry.trail.map(date => cell(stamp(date))).join(' → ')}. ${entry.weekend_days_skipped} weekend day${entry.weekend_days_skipped === 1 ? '' : 's'} skipped, so ${entry.lead_calendar_days} calendar days of real notice.`);
    } else if (entry.lead_calendar_days !== null) {
      if (entry.lead_calendar_days > 0) {
        out.push(`- **Notice** — ${entry.lead_calendar_days} calendar days before the anchor.`);
      } else if (entry.lead_calendar_days === 0) {
        out.push('- **Notice** — none. This date is the day of the visit itself.');
      } else {
        out.push(`- **Check this** — the recorded date falls ${Math.abs(entry.lead_calendar_days)} calendar days **after** the ${cell(stamp(entry.anchor.date))} visit it governs. A deadline later than the event it governs is a transcription slip or a term carried over from another trip. It is printed as recorded rather than quietly corrected.`);
      }
    }
    if (isWeekend(entry.due)) {
      out.push(`- **Note** — this date falls on a ${cell(weekday(entry.due))}. It is printed exactly as the term produces it; treat the preceding business day as the real one.`);
    }
    const terms = entry.supplier.terms || {};
    if (terms.minimum) out.push(`- **Minimum** — ${terms.minimum.count} ${cell(terms.minimum.unit)}. ${cell(terms.minimum.note || '')}`.trimEnd());
    if ((terms.payment_methods || []).length) out.push(`- **Payment** — ${terms.payment_methods.map(cell).join(' · ')}.`);
    if (terms.notes) out.push(`- **Recorded terms** — ${cell(terms.notes)}`);
    if (entry.anchor) {
      out.push(`- **Line state** — ${cell((S.lineState(entry.anchor.slot.state) || {}).label || entry.anchor.slot.state)}; a client-facing document prints this as "${cell(S.clientWord(entry.anchor.slot.state))}".`);
    }
    out.push(`- **Who** — ${cell(callCell(entry.supplier))}. Contact attempts recorded: ${(entry.supplier.attempts || []).length}.`);
    for (const line of sourceDetail(trip, entry.supplier.source_ids)) out.push(`- **Source** — ${line}`);
    out.push('');
  }

  out.push('## Suppliers with no deadline date', '');
  if (!without.length) {
    out.push('Every supplier on this trip produces at least one date.', '');
  } else {
    out.push('These are the ones that surprise you. A blank row would read as "nothing to do"; the row is here because the deadline exists **at the supplier** and the record cannot produce it. The last column says which kind of problem it is, because a missing term is a phone call and a missing itinerary line is not.', '');
    out.push(table(
      ['Supplier', 'First serves', 'Lines', 'State', 'Why there is no date', 'What the record says'],
      without.map(report => {
        const { supplier, anchor } = report;
        const state = anchor ? (S.lineState(anchor.slot.state) || {}).label || anchor.slot.state : 'no itinerary line';
        return `| ${cell(supplier.name)} | ${anchor ? cell(stamp(anchor.date)) : 'not on the itinerary'} | ${anchor ? anchor.served_lines : 0} | ${cell(state)} | ${cell(whyNoDate(report))} | ${cell((supplier.terms || {}).notes || supplier.note || 'Nothing recorded.')} |`;
      })
    ), '');
  }

  /* A term can be written down and still yield no date, on a supplier that carries some
     other deadline and therefore looks handled. Those are the quietest gaps of the lot. */
  const undatable = undatableTerms(trip);
  if (undatable.length) {
    out.push('### Terms recorded that still produce no date', '');
    out.push('Written down, and still not a date on anybody\'s calendar. A supplier can appear in the list above, or carry a perfectly good deadline of its own, and still hold one of these.', '');
    out.push(table(
      ['Supplier', 'Term', 'Why it produces nothing'],
      undatable.map(row => `| ${cell(row.supplier.name)} | ${row.field ? `\`${cell(row.term)}\`` : cell(row.term)} | ${cell(row.why)} |`)
    ), '');
  }

  /* Neither of these depends on the no-deadline list, and both are the same kind of finding:
     something that only shows up as an absence. They print whatever the list holds. */
  const noCancellation = (trip.suppliers || []).filter(supplier => !hasValue((supplier.terms || {}).cancellation));
  if (noCancellation.length) {
    out.push(`No cancellation term is recorded for ${noCancellation.length} of ${(trip.suppliers || []).length} suppliers, so the cost of any of these dates slipping is unknown across the whole trip.`, '');
  }
  const unslotted = (trip.inclusions || []).filter(inclusion => !(inclusion.slot_ids || []).length);
  if (unslotted.length) {
    out.push(`${unslotted.length} sold inclusion${unslotted.length === 1 ? ' has' : 's have'} no itinerary slot at all (${unslotted.map(inclusion => cell(inclusion.text)).join('; ')}), so ${unslotted.length === 1 ? 'it has' : 'they have'} no anchor and could not carry a computed deadline even if the supplier gave one.`, '');
  }

  out.push('## Deposit and balance ledger', '');
  if (!ledger.length) {
    out.push('No deposit or balance is recorded against any supplier.', '');
  } else {
    out.push(table(
      ['Supplier', 'Item', 'Amount', 'Basis', 'Status', 'When', 'Supplier sources'],
      ledger.map(row => `| ${cell(row.supplier.name)} | ${cell(row.item)} | ${cell(money(row.amount))} | ${cell(row.basis)} | ${cell(row.status)} | ${cell(row.when)} | ${cell(sourceIds(row.supplier))} |`)
    ), '');
    const paid = ledger.filter(row => row.status === 'Paid');
    const paidTotal = paid.reduce((sum, row) => sum + (typeof row.amount === 'number' ? row.amount : 0), 0);
    /* A paid item with no recorded amount would otherwise be summed as zero, producing a
       total that quietly excludes one of the items it claims to count. */
    const paidUnpriced = paid.filter(row => typeof row.amount !== 'number').length;
    const outstanding = ledger.filter(row => row.status !== 'Paid');
    const unpriced = outstanding.filter(row => typeof row.amount !== 'number').length;
    const paidQualifier = paidUnpriced
      ? ` — ${paidUnpriced} of those carr${paidUnpriced === 1 ? 'ies' : 'y'} no amount, so this is a floor, not a total`
      : '';
    out.push(`Paid to date: ${cell(money(paidTotal))} across ${paid.length} item${paid.length === 1 ? '' : 's'}${paidQualifier}. Outstanding: ${outstanding.length} item${outstanding.length === 1 ? '' : 's'}, ${unpriced} with no amount recorded.`, '');
    if (unpriced || paidUnpriced) {
      out.push('**A due date with no amount against it is still a deadline, and it is the worse kind** — the date is known and what has to be sent on it is not.', '');
    }
    const components = (trip.pricing || {}).components_per_person || [];
    const unattributed = components.filter(component => !component.supplier_id).length;
    const unpricedComponents = components.filter(component => component.amount === null).length;
    if (components.length && (unattributed || unpricedComponents)) {
      out.push(`The outstanding amount cannot be recovered from the price table either: of ${components.length} per-person cost lines, ${unattributed} name no supplier and ${unpricedComponents} carr${unpricedComponents === 1 ? 'ies' : 'y'} no amount.`, '');
    }
  }

  out.push('## Thresholds that are not dates', '');
  const thresholdRows = [];
  for (const supplier of trip.suppliers || []) {
    const terms = supplier.terms || {};
    if (terms.minimum) {
      thresholdRows.push(`| ${cell(supplier.name)} | Minimum | ${terms.minimum.count} ${cell(terms.minimum.unit)} | ${cell(terms.minimum.note || 'Fall below it and the group rate is gone.')} |`);
    }
    if ((terms.payment_methods || []).length) {
      thresholdRows.push(`| ${cell(supplier.name)} | Payment method | ${cell(terms.payment_methods.join(' · '))} | ${cell(terms.notes || '')} |`);
    }
  }
  if (!thresholdRows.length) {
    out.push('None recorded.', '');
  } else {
    out.push('These do not move when the date moves. They move when the headcount or the money does, and they break a booking just as completely.', '');
    out.push(table(['Supplier', 'Kind', 'Value', 'What the supplier said'], thresholdRows), '');
    out.push('A payment method is a deadline in disguise: "check with advance notice" names no number of days, so the notice it needs is itself unrecorded.', '');
  }

  out.push('## If the date moves', '');
  out.push('Two different things happen to a deadline when a trip date changes, and they are not interchangeable.', '');

  /* A deadline only recomputes if it is relative to an anchor. A date the supplier named
     outright belongs in the renegotiate list, not under "nobody has to remember them". */
  const recomputing = deadlines.filter(entry => entry.anchor && recomputedDue(entry, entry.anchor.date) !== null);
  const supplierStated = deadlines.filter(entry => !recomputing.includes(entry));

  out.push(`**Recomputes automatically (${recomputing.length}).** ${recomputing.length ? 'These are derived from an anchor date, so moving the trip moves them. Nobody has to remember them.' : 'Nothing in this record is relative to an anchor date, so nothing recomputes.'}`, '');
  if (recomputing.length) {
    const shifts = [-3, 3, 7];
    const divergences = [];
    const rows = recomputing.map(entry => {
      const cells = shifts.map(days => {
        const moved = recomputedDue(entry, shiftDays(entry.anchor.date, days));
        const slide = calendarDaysBetween(entry.due, moved);
        if (slide !== days) divergences.push({ entry, days, slide, moved });
        return `${stamp(moved)} (${slide > 0 ? '+' : '−'}${Math.abs(slide)}d)`;
      });
      return `| ${cell(entry.supplier.name)}: ${cell(entry.label.toLowerCase())} | ${cell(stamp(entry.due))} | ${cells.map(cell).join(' | ')} |`;
    });
    out.push(table(['Deadline', 'As recorded', ...shifts.map(days => `Trip ${days > 0 ? '+' : '−'}${Math.abs(days)} days`)], rows), '');
    if (divergences.length) {
      const example = divergences[0];
      out.push(`A business-day deadline does not slide by the number of days the trip slid, because weekends fall differently on either side of the move. Move this trip ${Math.abs(example.days)} day${Math.abs(example.days) === 1 ? '' : 's'} ${example.days > 0 ? 'later' : 'earlier'} and the ${cell(example.entry.label.toLowerCase())} for ${cell(example.entry.supplier.name)} moves ${Math.abs(example.slide)} days, not ${Math.abs(example.days)}. Every calendar-day term in the same table slides exactly with the trip. Two deadlines, two different answers, in the week when there is least time to work them out by hand.`, '');
    } else {
      out.push('Across the shifts shown, every deadline slides with the trip by the same number of days. That is not guaranteed for a business-day term: it holds only while the move is a whole number of weeks or lands clear of a weekend.', '');
    }
  }

  const statedBullets = supplierStated.map(entry =>
    `- **${cell(entry.supplier.name)}** — ${cell(entry.label.toLowerCase())} on ${cell(stamp(entry.due))} is a date the supplier named, not one derived from the itinerary. Moving the trip does not move it; somebody has to ask.`);
  const paidAgainstADate = [];
  const thresholds = [];
  for (const supplier of trip.suppliers || []) {
    const terms = supplier.terms || {};
    const anchor = anchorFor(trip, supplier);
    if ((terms.deposit || {}).paid_on) {
      paidAgainstADate.push(`- **${cell(supplier.name)}** — ${cell(money(terms.deposit.amount))} paid ${cell(terms.deposit.paid_on)} against ${anchor ? `${cell(stamp(anchor.date))} at ${cell(anchor.slot.time)}` : 'a stated date'}. The money is spent; the date and time it bought are the supplier's to move. Ask before assuming it transfers.`);
    }
    if (terms.minimum) {
      thresholds.push(`- **${cell(supplier.name)}** — the ${terms.minimum.count}-${cell(String(terms.minimum.unit).replace(/s$/, ''))} minimum does not move with the date. It moves with the headcount, and the headcount is usually what changed.`);
    }
  }
  const renegotiate = [...paidAgainstADate, ...statedBullets, ...thresholds];
  if (without.length) {
    renegotiate.push(`- **The ${without.length} supplier${without.length === 1 ? '' : 's'} producing no date** — nothing recomputes for ${without.length === 1 ? 'it' : 'them'}, because the record holds nothing to recompute. Every one is a call to find out what the new date just broke. That is the work this calendar exists to remove, and it is not removed until those terms are in the record.`);
  }
  if ((trip.exclusions || []).some(exclusion => /final number of paying participants/i.test(exclusion.text || ''))) {
    renegotiate.push('- **The operator\'s own re-quote clause** — the exclusions page makes the price subject to the final number of paying participants, and no trip-level final-headcount date is recorded anywhere. The only headcount deadline in this record belongs to one attraction.');
  }
  if (renegotiate.length) {
    const lead = paidAgainstADate.length
      ? '**Has to be renegotiated, not recomputed.** A paid deposit is not a movable date.'
      : '**Has to be renegotiated, not recomputed.** These do not follow the itinerary, so moving it does not move them.';
    out.push(lead, '', ...renegotiate, '');
  }

  const timeConflicts = (trip.suppliers || [])
    .filter(supplier => /cannot be met as written/i.test((supplier.terms || {}).notes || ''))
    .map(supplier => `- **${cell(supplier.name)}** — ${cell(supplier.terms.notes)}`);
  if (timeConflicts.length) {
    out.push('**Unaffected by a date change, and still wrong.** Moving the trip does not fix a conflict inside a day.', '');
    out.push(...timeConflicts, '');
  }

  out.push('---', '');
  out.push(`Deadlines computed: ${deadlines.length}. Suppliers producing none: ${without.length}. Terms recorded that produce no date: ${undatableCount}. Business days are Monday to Friday; public holidays are not modelled. Individuals and direct numbers are held as roles under the privacy rule in \`pipeline/trip/README.md\`.`);
  return out.join('\n') + '\n';
}

module.exports = {
  name: 'deadlines',
  description: 'Critical-path deadline calendar computed from supplier terms: what is due, when, who owns it, and what breaks if it is missed — plus the suppliers that carry no deadline at all.',
  outputs(trip) {
    return new Map([['deadlines.md', buildMarkdown(trip)]]);
  },
  /* Exported for the tests. The CLI only reads name/description/outputs. */
  _internals: {
    toIso, toMs, weekday, isWeekend, stamp, shiftDays, calendarDaysBetween, businessDaysBefore,
    anchorFor, deadlinesFor, recomputedDue, supplierReports, suppliersWithoutDeadline,
    undatableTerms, ledgerFor, deadlineTermReport, assertTermShapes, buildMarkdown,
    DATE_BEARING_TERMS, ANCHOR_DERIVED_TERMS
  }
};
