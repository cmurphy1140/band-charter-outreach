/* Tests for the tour manager's run sheet.

   The unit exists because a rewrite of this trip silently dropped an operational line, so
   the first thing asserted is that every `ops: true` slot and every `ops_steps` entry in
   the record reaches the page. After that: states printed honestly, the Ruby Falls time
   conflict raised on the day it bites, per-day suppliers with a reachable channel,
   headcount, deterministic ordering, and the privacy rule. */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadTrip, lines, supplierIndex } = require('../pipeline/trip/load.cjs');
const { loadRenderers, renderTrip, outputDir } = require('../pipeline/trip/cli.cjs');
const S = require('../pipeline/trip/schema.cjs');
const runSheet = require('../pipeline/trip/renderers/run-sheet.cjs');

const TRIP = 'west-henderson-chattanooga-2027-04-08';
const DOC = 'run-sheet.md';
const trip = () => loadTrip(TRIP);
const render = (record = trip()) => runSheet.outputs(record).get(DOC);
const copy = () => structuredClone(loadTrip(TRIP));

/* Which "## Day N" heading a day of the record is rendered under. The renderer sorts days by
   date, so the position in the JSON is not the answer. */
function dayNumber(record, day) {
  const order = [...record.days].sort((a, b) => a.date.localeCompare(b.date));
  return order.findIndex(entry => entry.date === day.date) + 1;
}

/* The text of one "## Day N" section, which is where a day-of problem has to appear. */
function daySection(markdown, dayNumber) {
  const start = markdown.indexOf(`\n## Day ${dayNumber} —`);
  assert.notEqual(start, -1, `Day ${dayNumber} section is missing`);
  const rest = markdown.slice(start + 1);
  const end = rest.indexOf('\n## ');
  return end === -1 ? rest : rest.slice(0, end);
}

/* The clock times in one day's running-order table, in printed order. */
function runningOrderTimes(section) {
  const start = section.indexOf('### Running order');
  assert.notEqual(start, -1, 'the day prints a running order');
  const rest = section.slice(start);
  const end = rest.indexOf('\n### ', 1);
  const block = end === -1 ? rest : rest.slice(0, end);
  return [...block.matchAll(/^\| (\d{2}:\d{2}) \| /gm)].map(match => match[1]);
}

/* Every Markdown table in the document, as rows of cells. */
function tablesIn(markdown) {
  const tables = [];
  let current = null;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('|')) {
      const cells = line.slice(1, line.endsWith('|') ? -1 : undefined).split(/(?<!\\)\|/);
      if (!current) { current = []; tables.push(current); }
      current.push(cells);
    } else {
      current = null;
    }
  }
  return tables;
}

test('the renderer is discovered and claims one file', () => {
  const found = loadRenderers().filter(renderer => renderer.name === 'run-sheet');
  assert.equal(found.length, 1, 'the CLI discovers exactly one run-sheet renderer');
  assert.ok(found[0].description);
  const produced = runSheet.outputs(trip());
  assert.ok(produced instanceof Map);
  assert.deepEqual([...produced.keys()], [DOC]);
  assert.equal(typeof produced.get(DOC), 'string');
  assert.ok(produced.get(DOC).startsWith('# Run sheet — '));
});

test('every operational step in the record reaches the page', () => {
  const record = trip();
  const markdown = render(record);
  let steps = 0;
  for (const day of record.days) {
    const section = daySection(markdown, dayNumber(record, day));
    for (const slot of day.slots) {
      const ops = Array.isArray(slot.ops_steps) ? slot.ops_steps : [];
      if (!slot.ops && !ops.length) continue;
      assert.ok(section.includes('**[ops]**'), `Day ${dayNumber(record, day)} marks its operational lines`);
      if (slot.ops) {
        steps += 1;
        assert.ok(section.includes(`| ${slot.title} | the line itself |`),
          `"${slot.title}" is missing from its day's operational steps`);
      }
      for (const step of ops) {
        steps += 1;
        assert.ok(section.includes(`| ${step} |`), `"${step}" is missing from its day's operational steps`);
      }
    }
  }
  assert.equal(steps, 12, 'the record carries twelve operational steps');
  assert.equal(runSheet._internals.opsCount(record), steps);
});

test('the line a rewrite dropped is printed, on its own day, as an operational step', () => {
  const record = trip();
  const dropped = lines(record).find(({ slot }) => slot.id === 'd4-checkout');
  assert.ok(dropped, 'the record still carries the check-out-and-load line');
  const section = daySection(render(record), 4);
  assert.ok(section.includes(dropped.slot.title), 'the check-out line is on day four');
  assert.ok(section.includes(`| 07:30 | ${dropped.slot.title} | the line itself |`),
    'the check-out line is printed as an operational step, not only as prose');
  assert.ok(section.includes(dropped.slot.note), 'the note about the lost line travels with it');
});

test('no supplied line reads as booked when it is not', () => {
  const record = trip();
  const markdown = render(record);
  const suppliers = supplierIndex(record);
  for (const { day, slot } of lines(record)) {
    if (!slot.supplier_id) continue;
    const section = daySection(markdown, dayNumber(record, day));
    const expected = S.isClear(slot.state)
      ? S.LINE_STATES[slot.state].label
      : `${S.LINE_STATES[slot.state].label} — not confirmed`;
    assert.ok(section.includes(`| ${expected} |`), `${slot.id} prints its state`);
    assert.ok(section.includes(suppliers.get(slot.supplier_id).name), `${slot.id} names its supplier`);
  }
  assert.ok(markdown.includes('0 of 21 supplied lines on this trip are confirmed'),
    'the count of confirmed lines is stated plainly');
  /* Every state in the vocabulary is explained, including the ones this trip does not use. */
  for (const state of Object.values(S.LINE_STATES)) {
    assert.ok(markdown.includes(state.description), `the legend explains ${state.label}`);
    assert.ok(markdown.includes(state.client_word), `the legend carries the client word for ${state.label}`);
  }
});

test('the Ruby Falls time conflict is raised on the day it bites', () => {
  const record = trip();
  const markdown = render(record);
  const dayTwo = daySection(markdown, 2);
  assert.ok(dayTwo.includes('**Conflict on this day — 08:30 Ruby Falls.**'), 'the conflict leads the day');
  assert.ok(dayTwo.includes('08:30') && dayTwo.includes('09:00'), 'both times are printed');
  assert.ok(dayTwo.indexOf('Conflict on this day') < dayTwo.indexOf('### Running order'),
    'the conflict sits above the running order, not in a footnote');
  assert.ok(dayTwo.includes('phone · group sales'), 'the supplier can be called from the conflict block');
  assert.ok(markdown.includes('**Time conflict — Day 2, Friday, April 9, 2027.**'),
    'the conflict is also flagged before departure');

  /* 4:45 PM and 16:45 are the same time: the incline line is not a conflict. */
  assert.ok(!daySection(markdown, 1).includes('Conflict on this day'), 'day one raises no false conflict');
  const incline = record.days[0].slots.find(slot => slot.id === 'd1-incline');
  assert.equal(runSheet._internals.conflictFor(incline, supplierIndex(record).get('incline-railway')), null);
  assert.deepEqual(runSheet._internals.clockTimesIn('a 4:45 PM visit'), [16 * 60 + 45]);
  assert.deepEqual(runSheet._internals.clockTimesIn('first ride is 09:00'), [9 * 60]);
});

test('supplier notes are printed in full but never raise a conflict against a line', () => {
  /* Supplier notes describe the supplier — opening hours, policies, the times of its other
     lines — so only the line's own note is evidence about the line's time. */
  const altered = copy();
  altered.suppliers.find(supplier => supplier.id === 'hotel-chattanooga').terms.notes +=
    ' Breakfast is served from 06:30 and check-in is from 15:00.';
  altered.suppliers.find(supplier => supplier.id === 'rock-city').terms.notes =
    'Group sales line is open 09:00 to 17:00.';
  const markdown = render(altered);
  for (const day of [1, 3, 4]) {
    assert.ok(!daySection(markdown, day).includes('Conflict on this day'),
      `supplier opening hours are not a conflict on day ${day}`);
  }
  assert.equal(daySection(markdown, 2).split('Conflict on this day').length - 1, 1,
    'day two keeps its one real conflict and gains none from a supplier note');
  assert.ok(daySection(markdown, 1).includes('Group sales line is open 09:00 to 17:00'),
    'the supplier note is still on the page, under Watch');
});

test('a window around the printed time is not read as a disagreement', () => {
  const altered = copy();
  altered.days[1].slots.find(slot => slot.id === 'd2-ruby-falls').note =
    'The group is asked to arrive between 08:00 and 09:00.';
  const dayTwo = daySection(render(altered), 2);
  assert.ok(!dayTwo.includes('Conflict on this day'), 'an 08:30 line inside an 08:00-09:00 window is fine');
  assert.ok(dayTwo.includes('asked to arrive between 08:00 and 09:00'), 'the note is still printed');
});

test('ratios and durations in supplier notes are not read as clock times', () => {
  assert.deepEqual(runSheet._internals.clockTimesIn('Comp ratio is 1:10 and the tour lasts 2:00 on site.'), []);
  assert.deepEqual(runSheet._internals.clockTimesIn('Doors 19:30, curtain 8:00 pm.'),
    [19 * 60 + 30, 20 * 60]);
  const altered = copy();
  altered.suppliers.find(supplier => supplier.id === 'rock-city').terms.notes =
    'Comp ratio is 1:10 and the tour lasts 2:00 on site.';
  assert.ok(!daySection(render(altered), 1).includes('Conflict on this day'));
});

test('an earlier time on record is a disagreement, not a broken promise', () => {
  const altered = copy();
  altered.days[1].slots.find(slot => slot.id === 'd2-ruby-falls').note =
    'The supplier says the last ride is 08:00.';
  altered.suppliers.find(supplier => supplier.id === 'ruby-falls').terms.notes =
    'Ride times are posted on the morning.';
  const dayTwo = daySection(render(altered), 2);
  assert.ok(dayTwo.includes('One line, two times on record.'));
  assert.ok(!dayTwo.includes('cannot be met as written'),
    'only a later time justifies saying the printed time cannot be met');
});

test('a conflict introduced anywhere in the record surfaces on its own day', () => {
  const altered = copy();
  const slot = altered.days[2].slots.find(entry => entry.id === 'd3-venue-arrive');
  slot.note = 'The venue asks the group to arrive at 13:45.';
  const dayThree = daySection(render(altered), 3);
  assert.ok(dayThree.includes('**Conflict on this day — 14:15 Arrive at the performance venue.**'));
  assert.ok(dayThree.includes('13:45'));
});

test('nothing recorded against a line is dropped from the page', () => {
  /* The failure this whole unit exists to prevent: a note that is covered "somewhere else"
     and therefore printed nowhere. */
  const altered = copy();
  altered.days[0].slots.find(slot => slot.id === 'd1-hotel-checkin').note =
    'Rooming list must be handed to the front desk on arrival.';
  const conflicting = copy();
  const rubyFalls = conflicting.days[1].slots.find(slot => slot.id === 'd2-ruby-falls');
  rubyFalls.note = `${rubyFalls.note} Collect the group waiver at the desk.`;
  assert.ok(render(altered).includes('Rooming list must be handed to the front desk on arrival'));
  assert.ok(daySection(render(conflicting), 2).includes('Collect the group waiver at the desk'),
    'a note that also fed a conflict callout is still printed in full');

  /* One inclusion covering several of a day's lines is noted once, not once per line. */
  const noted = copy();
  noted.inclusions.find(inclusion => inclusion.id === 'inc-transport').note = 'One charter for the week.';
  const dayOne = daySection(render(noted), 1);
  assert.equal(dayOne.split('One charter for the week').length - 1, 1);
});

test('the running order tells the truth about what the group has paid for', () => {
  const markdown = render();
  const dayOne = daySection(markdown, 1);
  /* Covered by "All transportation on the itinerary" and by "Three (3) nights' accommodation". */
  assert.ok(dayOne.includes('| Coaches arrive at the school **[ops]** | Young Transportation | phone · group charter line | Quoted — not confirmed | Included (sold as an inclusion) |'));
  assert.ok(dayOne.includes('| At own cost |'), 'a line at own cost still says so');
  /* The last day's single printed line is two commercial realities, and the sheet says so
     on separate rows: the lunch is the group's own cost, the coach home is sold. */
  const daySunday = daySection(markdown, 4);
  assert.ok(daySunday.includes('| 11:30 | Lunch locally | No supplier on this line | — | — | At own cost |'));
  assert.ok(daySunday.includes('| 11:30 | Depart for home **[ops]** | Young Transportation | phone · group charter line | Quoted — not confirmed | Included (sold as an inclusion) |'));
});

test('a comp policy with no ratio is reported, not printed as undefined', () => {
  const altered = copy();
  delete altered.suppliers.find(supplier => supplier.id === 'rock-city').terms.comp_policy.ratio;
  const markdown = render(altered);
  assert.ok(!markdown.includes('undefined'), 'no value reaches the page as the word undefined');
  assert.ok(markdown.includes('ratio not recorded'));
});

test('a record that validates always renders', () => {
  /* `validateTrip` does not type-check these fields, so a string where the record convention
     says list must not take the sheet down. A tour manager with no sheet has nothing. */
  const altered = copy();
  altered.suppliers.find(supplier => supplier.id === 'rock-city').terms.comp_policy.extras = 'bus driver comp';
  altered.suppliers.find(supplier => supplier.id === 'rock-city').terms.payment_methods = 'card';
  altered.trip.staffing = [{ note: 'Recorded without a role.' }];
  let markdown;
  assert.doesNotThrow(() => { markdown = render(altered); });
  assert.ok(markdown.includes('plus bus driver comp'));
  assert.ok(markdown.includes('Pays by: card.'));
  assert.ok(!markdown.includes('undefined'), 'a staffing entry with no role does not print undefined');
  assert.ok(markdown.includes('Role not recorded'));
});

test('a supplier reached only through an inclusion still carries its money and its silence', () => {
  const altered = copy();
  altered.suppliers.push({
    id: 'imax-theater',
    name: 'IMAX theatre operator',
    category: 'attraction',
    channel: { kind: 'phone', locator: 'group bookings' },
    contacts: [{ role: 'Group bookings', channel: 'phone' }],
    terms: { deposit: { amount: 250, basis: 'flat' }, final_headcount_due_business_days: 10 },
    attempts: [],
    source_ids: ['PH-INC']
  });
  altered.inclusions.find(inclusion => inclusion.id === 'inc-imax').supplier_id = 'imax-theater';
  const markdown = render(altered);
  assert.ok(markdown.includes('**IMAX theatre operator** (no line on the itinerary) — Deposit $250.00'),
    'the supplier is named with its deadlines even though no slot points at it');
  assert.ok(markdown.includes('Deposit $250.00'));
  assert.ok(markdown.includes('2027-03-25'), 'its deadline is derived from the first day of travel');
  assert.ok(markdown.includes('no contact attempt recorded at all'));
});

test('the pre-travel deadline list follows the terms, not their wording', () => {
  const record = trip();
  const incline = supplierIndex(record).get('incline-railway');
  const deadlines = runSheet._internals.deadlineLines(incline, '2027-04-08');
  assert.ok(deadlines.length >= 2);
  assert.ok(deadlines.every(line => line.trim().length));
  /* A supplier with terms but no deadline contributes nothing rather than an empty bullet. */
  const hotel = supplierIndex(record).get('hotel-chattanooga');
  assert.deepEqual(runSheet._internals.deadlineLines(hotel, '2027-04-08'), []);
  assert.ok(!render(record).includes('** — \n'), 'no empty deadline bullet is emitted');
});

test('each day carries its suppliers with a channel, its headcount and what falls due', () => {
  const record = trip();
  const markdown = render(record);
  const suppliers = supplierIndex(record);
  record.days.forEach((day, index) => {
    const section = daySection(markdown, index + 1);
    assert.ok(section.includes('### Who to call today'));
    assert.ok(section.includes('83 travelling (80 paying + 3 trip-granted comps)'),
      `day ${index + 1} states the headcount that arrives`);
    assert.ok(section.includes("### Money and deadlines on this day's lines"));
    for (const slot of day.slots) {
      if (!slot.supplier_id) continue;
      const supplier = suppliers.get(slot.supplier_id);
      const channel = supplier.channel || {};
      assert.ok(section.includes(`${String(channel.kind).replace(/_/g, ' ')} · ${channel.locator}`),
        `${supplier.name} is reachable from day ${index + 1}`);
      for (const contact of supplier.contacts || []) {
        assert.ok(section.includes(contact.role), `${supplier.name} lists a contact role`);
      }
    }
  });
  /* The deadline that a headcount change trips, derived from the recorded term. */
  assert.ok(daySection(markdown, 1).includes('2027-04-01'), 'the derived headcount deadline is on day one');
  assert.equal(runSheet._internals.businessDaysBefore('2027-04-08', 5), '2027-04-01');
  assert.equal(runSheet._internals.businessDaysBefore('2027-04-12', 1), '2027-04-09');
  assert.ok(markdown.includes('Deposit $100.00 — paid 2026-09-11'));
  assert.ok(markdown.includes('The record does not say which date that counts from'),
    'an unanchored deadline is named as unanchored rather than invented');
});

test('the two comp quantities are kept apart, and the unsold gaps are named', () => {
  const markdown = render();
  assert.ok(markdown.includes('83 people walk through every door'));
  assert.ok(markdown.includes(S.COMP_KINDS.trip_granted.description));
  assert.ok(markdown.includes('Vendor-earned comps are a separate quantity'));
  assert.ok(markdown.includes('one per 10 paid plus bus driver comp'));
  assert.ok(markdown.includes('Sold with nowhere to happen: "Admission to the IMAX Theater at the Aquarium"'));
  assert.ok(markdown.includes('no contact attempt recorded at all'));
  assert.ok(daySection(markdown, 3).includes('Two addresses on record'), 'the venue disagreement lands on day three');
  assert.ok(daySection(markdown, 1).includes('No venue settled — 19:30 Group dinner'),
    'the dinner still being shopped is called out on its day');
});

test('output is deterministic and ordered by day then time', () => {
  const record = trip();
  assert.equal(render(record), render(trip()), 'two renders of the same record are byte-identical');

  /* Day order is incidental — each day carries its date — so reversing it must change
     nothing. Within a day, slots at the SAME printed time are a deliberate exception: the
     record's sequence is the only ordering information there is, and it comes from the
     printed page ("11:30 Lunch locally, then depart for home"). So shuffle only slots
     whose times are distinct. */
  const shuffled = copy();
  shuffled.days.reverse();
  for (const day of shuffled.days) {
    const byTime = new Map();
    for (const slot of day.slots) {
      if (!byTime.has(slot.time)) byTime.set(slot.time, []);
      byTime.get(slot.time).push(slot);
    }
    day.slots = [...byTime.keys()].reverse().flatMap(time => byTime.get(time));
  }
  assert.equal(render(shuffled), render(record), 'record order does not change the sheet');

  /* And the exception is real: swapping two same-time slots does reorder them, because
     that order is data rather than noise. */
  const swapped = copy();
  const sunday = swapped.days.find(day => day.date === '2027-04-11');
  const at = sunday.slots.findIndex(slot => slot.id === 'd4-lunch');
  [sunday.slots[at], sunday.slots[at + 1]] = [sunday.slots[at + 1], sunday.slots[at]];
  assert.notEqual(render(swapped), render(record),
    'the sequence of two lines sharing a printed time is information, not noise');

  const markdown = render(record);
  let cursor = -1;
  for (let index = 1; index <= record.days.length; index += 1) {
    const at = markdown.indexOf(`## Day ${index} —`);
    assert.ok(at > cursor, `day ${index} follows day ${index - 1}`);
    cursor = at;
    const times = runningOrderTimes(daySection(markdown, index));
    assert.deepEqual(times, [...times].sort(), `day ${index} runs in time order`);
    assert.equal(times.length, record.days[index - 1].slots.length, `day ${index} prints every line`);
  }

  /* A single-digit hour in the record still sorts and prints as a clock time. */
  const oddTime = copy();
  oddTime.days[0].slots.find(slot => slot.id === 'd1-lunch-stop').time = '9:05';
  const section = daySection(render(oddTime), 1);
  const times = runningOrderTimes(section);
  assert.deepEqual(times, [...times].sort(), 'a 9:05 line sorts by the clock, not by the string');
  assert.ok(section.includes('| 09:05 |'), 'a single-digit hour is padded');
});

test('every Markdown table is well formed and escapes its cells', () => {
  const piped = copy();
  piped.days[0].slots[0].title = 'Coaches arrive | side lot';
  for (const markdown of [render(), render(piped)]) {
    const tables = tablesIn(markdown);
    assert.ok(tables.length >= 10, 'the sheet is mostly tables');
    for (const rows of tables) {
      const width = rows[0].length;
      assert.ok(width >= 2);
      for (const row of rows) assert.equal(row.length, width, `ragged table row: ${row.join(' / ')}`);
    }
  }
  assert.ok(render(piped).includes('Coaches arrive \\| side lot'), 'a pipe in a value is escaped');
});

test('the sheet holds individuals as roles and carries no direct contact detail', () => {
  const markdown = render();
  assert.doesNotMatch(markdown, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/, 'no direct phone numbers');
  assert.doesNotMatch(markdown, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no mailboxes');
  assert.ok(markdown.includes('Director of Bands (role only'), 'the group contact stays a role');
  assert.ok(markdown.includes('Tour manager'), 'the travelling role is named');
  for (const supplier of trip().suppliers) {
    for (const contact of supplier.contacts || []) assert.ok(markdown.includes(contact.role));
  }
});

test('the committed run sheet is current', () => {
  const record = trip();
  const target = path.join(outputDir(record), DOC);
  assert.ok(fs.existsSync(target), `${DOC} is committed under pipeline/trip/out/`);
  assert.equal(fs.readFileSync(target, 'utf8'), render(record),
    `stale: run node pipeline/trip/cli.cjs render ${TRIP}`);
  const result = renderTrip(record);
  assert.deepEqual(result.errors, []);
  assert.ok(result.files.has(DOC));
});
