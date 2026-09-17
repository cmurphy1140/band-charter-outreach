/* The deadline renderer turns supplier terms into dates. A wrong date here is worse than no
   date, so the business-day arithmetic is tested against a real calendar: weekends, month
   boundaries, a year boundary, a leap day, and the cases where a weekend-anchored count
   behaves differently from a calendar count.

   April 2027, for reference while reading the assertions:
     Thu 1  Fri 2  Sat 3  Sun 4  Mon 5  Tue 6  Wed 7  Thu 8  Fri 9  Sat 10  Sun 11 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadTrip } = require('../pipeline/trip/load.cjs');
const renderer = require('../pipeline/trip/renderers/deadlines.cjs');

const {
  toIso, toMs, weekday, isWeekend, stamp, shiftDays, calendarDaysBetween, businessDaysBefore,
  anchorFor, deadlinesFor, recomputedDue, suppliersWithoutDeadline, undatableTerms,
  ledgerFor, deadlineTermReport
} = renderer._internals;

const TRIP = 'west-henderson-chattanooga-2027-04-08';
const RENDERER_FILE = path.join(__dirname, '..', 'pipeline/trip/renderers/deadlines.cjs');
const copy = () => structuredClone(loadTrip(TRIP));
const render = trip => renderer.outputs(trip).get('deadlines.md');
const due = (trip, supplierId, kind) => deadlinesFor(trip).find(e => e.supplier_id === supplierId && e.kind === kind);
const supplierIn = (trip, id) => trip.suppliers.find(s => s.id === id);

/* A raw `|` inside a cell silently splits that row into an extra column, so every table row
   has to carry exactly as many real separators as the header above it. Escaped pipes are
   masked out before counting. */
function assertColumnCounts(markdown) {
  const realCells = line => line.replace(/\\\|/g, '').split('|').length;
  let tables = 0;
  let expected = null;
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) { expected = null; continue; }
    if (/^\|(-+\|)+$/.test(line)) continue;
    if (expected === null) { expected = realCells(line); tables += 1; }
    else assert.equal(realCells(line), expected, `column count drifts: ${line}`);
  }
  return tables;
}

/* ---------------------------------------------------------------- date arithmetic */

test('business days are counted Monday to Friday, backwards, excluding the anchor', () => {
  // The real case: Rock City wants the final headcount five business days before a Thursday
  // visit. Thu 8 → Wed 7, Tue 6, Mon 5, (Sun 4 and Sat 3 skipped), Fri 2, Thu 1.
  const five = businessDaysBefore('2027-04-08', 5);
  assert.equal(five.date, '2027-04-01');
  assert.deepEqual(five.trail, ['2027-04-07', '2027-04-06', '2027-04-05', '2027-04-02', '2027-04-01']);
  assert.equal(five.weekend_days_skipped, 2);
  assert.equal(calendarDaysBetween(five.date, '2027-04-08'), 7, 'five business days is seven calendar days here');

  // One business day before a Monday is the Friday before it, not the Sunday.
  assert.equal(businessDaysBefore('2027-04-05', 1).date, '2027-04-02');
  assert.equal(businessDaysBefore('2027-04-05', 1).weekend_days_skipped, 2);

  // Zero is the anchor itself, untouched, even when the anchor is a weekend day.
  assert.equal(businessDaysBefore('2027-04-08', 0).date, '2027-04-08');
  assert.equal(businessDaysBefore('2027-04-10', 0).date, '2027-04-10');
  assert.deepEqual(businessDaysBefore('2027-04-08', 0).trail, []);
});

test('a weekend anchor counts back from the anchor without counting the anchor', () => {
  // Saturday 2027-04-10: the first business day before it is Friday the 9th.
  assert.equal(businessDaysBefore('2027-04-10', 1).date, '2027-04-09');
  // Sunday 2027-04-11: also Friday the 9th, because Saturday is skipped too.
  assert.equal(businessDaysBefore('2027-04-11', 1).date, '2027-04-09');
  // Five business days before Sunday the 11th: Fri 9, Thu 8, Wed 7, Tue 6, Mon 5.
  assert.equal(businessDaysBefore('2027-04-11', 5).date, '2027-04-05');
  assert.equal(businessDaysBefore('2027-04-11', 5).weekend_days_skipped, 1);
});

test('business days cross month, year and leap-day boundaries correctly', () => {
  // Monday 2027-03-01 back one business day is Friday 2027-02-26.
  assert.equal(businessDaysBefore('2027-03-01', 1).date, '2027-02-26');

  // Monday 2027-01-04 back two: Fri 2027-01-01 (a holiday, deliberately not modelled),
  // then Thu 2026-12-31. The year boundary must not reset anything.
  const newYear = businessDaysBefore('2027-01-04', 2);
  assert.equal(newYear.date, '2026-12-31');
  assert.deepEqual(newYear.trail, ['2027-01-01', '2026-12-31']);

  // Wednesday 2028-03-01 back one is Tuesday 2028-02-29 — the leap day exists and is a weekday.
  assert.equal(businessDaysBefore('2028-03-01', 1).date, '2028-02-29');
  assert.equal(weekday('2028-02-29'), 'Tuesday');

  // Non-leap year: 2027-03-01 back one calendar day is 2027-02-28, not a 29th.
  assert.equal(shiftDays('2027-03-01', -1), '2027-02-28');
});

test('ten business days is exactly two calendar weeks, twenty is four', () => {
  assert.equal(businessDaysBefore('2027-04-08', 10).date, '2027-03-25');
  assert.equal(calendarDaysBetween('2027-03-25', '2027-04-08'), 14);
  assert.equal(businessDaysBefore('2027-04-08', 10).weekend_days_skipped, 4);

  assert.equal(businessDaysBefore('2027-04-08', 20).date, '2027-03-11');
  assert.equal(calendarDaysBetween('2027-03-11', '2027-04-08'), 28);
  assert.equal(businessDaysBefore('2027-04-08', 20).weekend_days_skipped, 8);
});

test('every weekday anchor at one business day lands on the previous business day', () => {
  const expected = {
    '2027-04-05': '2027-04-02', // Monday  → previous Friday
    '2027-04-06': '2027-04-05', // Tuesday → Monday
    '2027-04-07': '2027-04-06',
    '2027-04-08': '2027-04-07',
    '2027-04-09': '2027-04-08'  // Friday  → Thursday
  };
  for (const [anchor, want] of Object.entries(expected)) {
    assert.equal(businessDaysBefore(anchor, 1).date, want, `one business day before ${anchor}`);
    assert.equal(isWeekend(businessDaysBefore(anchor, 1).date), false);
  }
});

test('the arithmetic refuses nonsense instead of inventing a date', () => {
  assert.throws(() => businessDaysBefore('2027-04-08', -1), /non-negative integer/);
  assert.throws(() => businessDaysBefore('2027-04-08', 2.5), /non-negative integer/);
  assert.throws(() => businessDaysBefore('2027-04-08', '5'), /non-negative integer/);
  assert.throws(() => businessDaysBefore('2027-04-08', null), /non-negative integer/);
  assert.throws(() => businessDaysBefore('08/04/2027', 5), /must be YYYY-MM-DD/);
  // Date.UTC would roll these forward silently; a deadline calendar must not.
  assert.throws(() => toMs('2027-02-30'), /No such calendar date/);
  assert.throws(() => toMs('2027-13-01'), /No such calendar date/);
  assert.throws(() => toMs('2027-04-31'), /No such calendar date/);
  assert.equal(toMs('2028-02-29'), Date.UTC(2028, 1, 29), 'a real leap day is accepted');
});

test('calendar arithmetic is UTC and round-trips', () => {
  assert.equal(toIso(toMs('2027-04-08')), '2027-04-08');
  assert.equal(shiftDays('2027-04-08', -10), '2027-03-29', 'ten calendar days back crosses into March');
  assert.equal(shiftDays('2027-01-01', -1), '2026-12-31');
  assert.equal(calendarDaysBetween('2027-03-29', '2027-04-08'), 10);
  assert.equal(calendarDaysBetween('2027-04-08', '2027-03-29'), -10);
  assert.equal(stamp('2027-04-08'), '2027-04-08 (Thu)');
  assert.deepEqual([isWeekend('2027-04-10'), isWeekend('2027-04-11'), isWeekend('2027-04-09')], [true, true, false]);
});

/* ---------------------------------------------------------------- the real trip */

test('the two recorded deadlines compute to the right dates', () => {
  const trip = loadTrip(TRIP);
  const deadlines = deadlinesFor(trip);
  assert.equal(deadlines.length, 2);
  assert.deepEqual(deadlines.map(entry => entry.due), ['2027-03-29', '2027-04-01'], 'sorted by due date');

  const headcount = due(trip, 'rock-city', 'final_headcount');
  assert.equal(headcount.due, '2027-04-01');
  assert.equal(headcount.anchor.date, '2027-04-08', 'anchored to the day Rock City is visited');
  assert.equal(headcount.count, 5);
  assert.equal(headcount.lead_calendar_days, 7);

  const balance = due(trip, 'incline-railway', 'balance');
  assert.equal(balance.due, '2027-03-29', 'ten calendar days before the 2027-04-08 visit');
  assert.equal(balance.anchor.date, '2027-04-08');
  assert.equal(balance.unit, 'calendar days');
});

test('deadlines anchor to the slot the supplier serves, not to the trip start', () => {
  const trip = copy();
  // Same five-business-day term, moved onto the supplier that serves day four.
  supplierIn(trip, 'southern-belle').terms.final_headcount_due_business_days = 5;
  const dayOne = due(trip, 'rock-city', 'final_headcount');
  const dayFour = due(trip, 'southern-belle', 'final_headcount');

  assert.equal(dayOne.anchor.date, '2027-04-08');
  assert.equal(dayFour.anchor.date, '2027-04-11', 'the riverboat is a Sunday, day four');
  assert.equal(dayOne.due, '2027-04-01');
  assert.equal(dayFour.due, '2027-04-05');
  assert.ok(dayFour.due > dayOne.due, 'a supplier serving day four has a later deadline');
  // And the gap is not the same as the gap between the two anchors: three calendar days
  // apart at the anchor, four at the deadline, because of the weekend.
  assert.equal(calendarDaysBetween(dayOne.anchor.date, dayFour.anchor.date), 3);
  assert.equal(calendarDaysBetween(dayOne.due, dayFour.due), 4);
});

test('a supplier serving several days is anchored to its earliest line', () => {
  const trip = copy();
  // The hotel serves check-in on day one and breakfast on days two, three and four.
  const hotel = supplierIn(trip, 'hotel-chattanooga');
  const anchor = anchorFor(trip, hotel);
  assert.equal(anchor.date, '2027-04-08');
  assert.equal(anchor.slot.id, 'd1-hotel-checkin');
  assert.equal(anchor.served_lines, 4);
  assert.deepEqual(anchor.dates, ['2027-04-08', '2027-04-09', '2027-04-10', '2027-04-11']);

  hotel.terms.final_headcount_due_business_days = 14; // a rooming list, if one were recorded
  assert.equal(due(trip, 'hotel-chattanooga', 'final_headcount').due, '2027-03-19');
});

test('the suppliers with no deadline at all are the finding, not a blank row', () => {
  const trip = loadTrip(TRIP);
  const without = suppliersWithoutDeadline(trip);
  assert.equal(without.length, 11);
  assert.equal(without.length + new Set(deadlinesFor(trip).map(e => e.supplier_id)).size, trip.suppliers.length);

  const ids = without.map(entry => entry.supplier.id);
  for (const id of ['hotel-chattanooga', 'tn-aquarium', 'dinner-day-one', 'dinner-day-two', 'dinner-day-three']) {
    assert.ok(ids.includes(id), `${id} has no recorded deadline and must be listed`);
  }
  assert.equal(ids.filter(id => id.startsWith('dinner-')).length, 3, 'three dinners, nothing recorded');

  // The hotel's own note says what is missing; the renderer must not invent a date for it.
  const hotel = without.find(entry => entry.supplier.id === 'hotel-chattanooga');
  assert.match(hotel.supplier.terms.notes, /Rooming-list deadline/);
  assert.deepEqual(hotel.present, []);

  // Ruby Falls carries release_date: null — present and empty is not the same as absent.
  const ruby = deadlineTermReport(supplierIn(loadTrip(TRIP), 'ruby-falls'));
  assert.deepEqual(ruby.empty, ['release_date']);
  assert.ok(!ruby.missing.includes('release_date'));
  assert.deepEqual(ruby.present, []);
});

test('a term that is recorded and still produces no date is reported on its own', () => {
  const trip = loadTrip(TRIP);
  const undatable = undatableTerms(trip);

  // Both live on suppliers the no-deadline table would not catch: the Incline Railway
  // carries a real balance deadline, and Ruby Falls' empty field is not a missing field.
  const incline = undatable.find(row => row.supplier.id === 'incline-railway');
  assert.ok(incline, 'a paid deposit is recorded and is not a date ahead');
  assert.match(incline.term, /deposit \(paid 2026-09-11/);
  assert.ok(deadlinesFor(trip).some(entry => entry.supplier_id === 'incline-railway'),
    'and that supplier does carry a deadline, so the no-deadline table never lists it');

  const ruby = undatable.find(row => row.supplier.id === 'ruby-falls');
  assert.equal(ruby.term, 'release_date');
  assert.match(ruby.why, /left empty/);

  const markdown = render(trip);
  assert.match(markdown, /### Terms recorded that still produce no date/);
  assert.match(markdown, /2 date-bearing terms are recorded and still produce no date/);
  // A paid deposit must not be presented as a missing itinerary line.
  assert.doesNotMatch(markdown, /deposit.*no itinerary line to anchor it to/);
});

test('the ledger separates what is paid from what is outstanding', () => {
  const trip = loadTrip(TRIP);
  const ledger = ledgerFor(trip);
  assert.equal(ledger.length, 2);

  const deposit = ledger.find(row => row.item === 'Deposit');
  assert.equal(deposit.supplier.id, 'incline-railway');
  assert.equal(deposit.amount, 100);
  assert.equal(deposit.status, 'Paid');
  assert.equal(deposit.when, 'paid 2026-09-11 (Fri)');

  const balance = ledger.find(row => row.item === 'Balance');
  assert.equal(balance.status, 'Outstanding');
  assert.equal(balance.amount, null, 'the balance amount is recorded nowhere — that is the point');
  assert.equal(balance.when, 'due 2027-03-29 (Mon)');
});

test('a supplier-stated release date and an unpaid deposit both become deadlines', () => {
  const trip = copy();
  supplierIn(trip, 'cirque-symphonie').terms.release_date = '2027-02-15';
  supplierIn(trip, 'tn-aquarium').terms.deposit = { amount: 250, basis: 'flat', due_on: '2027-01-20' };

  const release = due(trip, 'cirque-symphonie', 'release');
  assert.equal(release.due, '2027-02-15');
  assert.equal(release.rule, 'stated by the supplier');
  assert.equal(release.lead_calendar_days, calendarDaysBetween('2027-02-15', '2027-04-10'));

  const deposit = due(trip, 'tn-aquarium', 'deposit');
  assert.equal(deposit.due, '2027-01-20');

  // A paid deposit is a ledger entry, not an outstanding deadline.
  assert.equal(due(trip, 'incline-railway', 'deposit'), undefined);
  assert.equal(ledgerFor(trip).find(row => row.supplier.id === 'tn-aquarium').status, 'Outstanding');

  // And neither recomputes when the trip moves: the supplier named the date.
  assert.equal(recomputedDue(release, '2027-05-10'), null);
  assert.equal(recomputedDue(deposit, '2027-05-10'), null);
  assert.equal(deadlinesFor(trip).length, 4);
});

test('a date change recomputes the derived deadlines and diverges from a flat slide', () => {
  const trip = loadTrip(TRIP);
  const headcount = due(trip, 'rock-city', 'final_headcount');
  const balance = due(trip, 'incline-railway', 'balance');

  // Move the trip three days later: the anchor becomes Sunday 2027-04-11.
  assert.equal(recomputedDue(balance, '2027-04-11'), '2027-04-01', 'calendar days slide exactly with the trip');
  assert.equal(recomputedDue(headcount, '2027-04-11'), '2027-04-05', 'business days do not');
  assert.equal(calendarDaysBetween(balance.due, '2027-04-01'), 3);
  assert.equal(calendarDaysBetween(headcount.due, '2027-04-05'), 4, 'the same three-day move slides this one four days');

  // A whole-week move preserves the weekday, so both slide by seven.
  assert.equal(recomputedDue(headcount, '2027-04-15'), '2027-04-08');
  assert.equal(recomputedDue(balance, '2027-04-15'), '2027-04-05');

  // A whole trip rebuilt a week earlier moves both deadlines and nothing else has to be remembered.
  const earlier = copy();
  for (const day of earlier.days) day.date = shiftDays(day.date, -7);
  earlier.trip.start_date = shiftDays(earlier.trip.start_date, -7);
  earlier.trip.end_date = shiftDays(earlier.trip.end_date, -7);
  assert.equal(due(earlier, 'rock-city', 'final_headcount').due, '2027-03-25');
  assert.equal(due(earlier, 'incline-railway', 'balance').due, '2027-03-22');
});

/* ---------------------------------------------------------------- the document */

test('the rendered document is one file with the computed dates and the working', () => {
  const trip = loadTrip(TRIP);
  const produced = renderer.outputs(trip);
  assert.deepEqual([...produced.keys()], ['deadlines.md']);
  const markdown = produced.get('deadlines.md');

  assert.match(markdown, /2027-03-29 \(Mon\)/);
  assert.match(markdown, /2027-04-01 \(Thu\)/);
  assert.match(markdown, /Rock City Gardens/);
  assert.match(markdown, /Lookout Mountain Incline Railway/);
  // The working is printed so a reader can check it against a wall calendar.
  assert.match(markdown, /2027-04-07 \(Wed\) → 2027-04-06 \(Tue\) → 2027-04-05 \(Mon\) → 2027-04-02 \(Fri\) → 2027-04-01 \(Thu\)/);
  assert.match(markdown, /2 weekend days skipped/);
  // The stated limit of the model.
  assert.match(markdown, /\*\*Public holidays are not modelled\.\*\*/);
  // The absence, stated as a finding.
  assert.match(markdown, /11 suppliers produce no date at all/);
  assert.match(markdown, /## Suppliers with no deadline date/);
  assert.match(markdown, /Recorded and left empty: release_date/);
  // Ledger and the date-change split.
  assert.match(markdown, /## Deposit and balance ledger/);
  assert.match(markdown, /Paid to date: \$100\.00/);
  assert.match(markdown, /## If the date moves/);
  assert.match(markdown, /renegotiated, not recomputed/);
  // The minimum that is a threshold, not a date.
  assert.match(markdown, /15 admissions/);
  assert.ok(markdown.endsWith('\n'));
});

test('the document never reads as booked when the line is not', () => {
  const markdown = render(loadTrip(TRIP));
  assert.doesNotMatch(markdown, /\bbooked\b/i);
  assert.match(markdown, /the line is quoted/);
  assert.match(markdown, /the line is reserved/);
  // A paid deposit is money against a date, so the summary must not claim nothing is held.
  assert.match(markdown, /Nothing is confirmed\. 1 line is held or paid against/);
  assert.doesNotMatch(markdown, /no space is held anywhere/);
});

test('the summary only claims nothing is held when nothing is', () => {
  const trip = copy();
  // Strip the one deposit-paid line back to quoted: now nothing is secured anywhere.
  trip.days[0].slots.find(slot => slot.id === 'd1-incline').state = 'quoted';
  assert.match(render(trip), /no space is held or paid against anywhere on this trip/);

  const confirmedTrip = copy();
  confirmedTrip.days[0].slots.find(slot => slot.id === 'd1-rock-city').state = 'confirmed';
  const markdown = render(confirmedTrip);
  assert.doesNotMatch(markdown, /Nothing is confirmed/);
  assert.doesNotMatch(markdown, /no space is held or paid against/);
});

test('markdown table cells escape pipes', () => {
  const trip = copy();
  supplierIn(trip, 'rock-city').name = 'Rock City | Gardens';
  supplierIn(trip, 'rock-city').terms.minimum.note = 'Fifteen | or the rate goes';
  const markdown = render(trip);
  assert.match(markdown, /Rock City \\\| Gardens/);
  assert.match(markdown, /Fifteen \\\| or the rate goes/);
  // The pipes are escaped, so no row gained a column from them.
  assertColumnCounts(markdown);
  const header = markdown.split('\n').find(line => line.startsWith('| Due |'));
  assert.equal(header.replace(/\\\|/g, '').split('|').length, 8, 'six columns in the calendar');
});

test('table rows keep the column count their header declares', () => {
  assert.equal(assertColumnCounts(render(loadTrip(TRIP))), 6,
    'calendar, no-deadline list, undatable terms, ledger, thresholds, shifts');
});

test('rendering is deterministic and reads no clock', () => {
  const trip = loadTrip(TRIP);
  assert.equal(render(trip), render(trip));
  assert.equal(render(loadTrip(TRIP)), render(loadTrip(TRIP)));

  const source = fs.readFileSync(RENDERER_FILE, 'utf8');
  assert.doesNotMatch(source, /new Date\s*\(\s*\)/, 'no clock');
  assert.doesNotMatch(source, /Date\.now/, 'no clock');
  assert.doesNotMatch(source, /Math\.random/, 'no randomness');
  assert.doesNotMatch(source, /toLocale/, 'no host locale or timezone in the output');
  assert.doesNotMatch(source, /getFullYear|getMonth\(\)|getDate\(\)|getDay\(\)/, 'UTC accessors only');

  // The prepared date belongs to the record, never to the run.
  assert.match(render(trip), /prepared 2026-09-11/);
});

test('the renderer satisfies the renderer contract', () => {
  assert.equal(renderer.name, 'deadlines');
  assert.equal(typeof renderer.description, 'string');
  assert.ok(renderer.description.length > 10);
  assert.equal(typeof renderer.outputs, 'function');
  const produced = renderer.outputs(loadTrip(TRIP));
  assert.ok(produced instanceof Map);
  for (const [name, content] of produced) {
    assert.match(name, /^[a-z0-9-]+\.md$/);
    assert.equal(typeof content, 'string');
  }
});

test('no individual and no direct number reaches the output', () => {
  const markdown = render(loadTrip(TRIP));
  assert.doesNotMatch(markdown, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/, 'no direct phone numbers');
  assert.doesNotMatch(markdown, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no mailboxes');
  // Owners and contacts are roles.
  assert.match(markdown, /Troen coordinator → Group sales/);
  assert.doesNotMatch(markdown, /Director of Bands [A-Z][a-z]+/);
});

test('the tracked output file matches what the renderer produces now', () => {
  const tracked = path.join(__dirname, '..', 'pipeline/trip/out', TRIP, 'deadlines.md');
  assert.ok(fs.existsSync(tracked), `missing: run node pipeline/trip/cli.cjs render ${TRIP}`);
  assert.equal(fs.readFileSync(tracked, 'utf8'), render(loadTrip(TRIP)),
    `stale: run node pipeline/trip/cli.cjs render ${TRIP}`);
});

test('a trip with no deadline-bearing term says so instead of printing an empty table', () => {
  const trip = copy();
  for (const supplier of trip.suppliers) {
    delete supplier.terms.final_headcount_due_business_days;
    delete supplier.terms.balance_due_days;
    delete supplier.terms.release_date;
    delete supplier.terms.deposit;
  }
  assert.deepEqual(deadlinesFor(trip), []);
  const markdown = render(trip);
  assert.match(markdown, /No supplier term in this record produces a date\. That is the finding\./);
  assert.match(markdown, /No deposit or balance is recorded against any supplier\./);
  assert.match(markdown, /13 suppliers produce no date at all/);
});

test('a supplier with a term but no itinerary line produces no invented date', () => {
  const trip = copy();
  trip.suppliers.push({
    id: 'unplaced-supplier',
    name: 'Supplier with no line',
    category: 'service',
    relationship: { owner: 'Troen coordinator', status: 'quoted' },
    contacts: [],
    terms: { final_headcount_due_business_days: 5, balance_due_days: 10 },
    attempts: [],
    source_ids: []
  });
  assert.equal(anchorFor(trip, trip.suppliers[trip.suppliers.length - 1]), null);
  assert.equal(deadlinesFor(trip).filter(entry => entry.supplier_id === 'unplaced-supplier').length, 0);
  const listed = suppliersWithoutDeadline(trip).find(entry => entry.supplier.id === 'unplaced-supplier');
  assert.ok(listed, 'it is listed as carrying no computable deadline');
  assert.equal(listed.anchor, null);
  assert.match(render(trip), /not on the itinerary/);
});

test('a supplier-stated date on a supplier with no itinerary line still renders', () => {
  // A relative term (n days before the visit) needs an anchor; a date the supplier named
  // outright does not. The document must print it rather than crash on the missing anchor.
  const trip = copy();
  trip.suppliers.push({
    id: 'unplaced-venue',
    name: 'Unplaced venue',
    category: 'venue',
    relationship: { owner: 'Troen coordinator', status: 'held' },
    contacts: [{ role: 'Group sales', channel: 'email' }],
    terms: { release_date: '2027-02-01' },
    attempts: [],
    source_ids: []
  });

  const release = due(trip, 'unplaced-venue', 'release');
  assert.ok(release, 'a supplier-stated date is a deadline even with no slot');
  assert.equal(release.due, '2027-02-01');
  assert.equal(release.anchor, null);
  assert.equal(release.lead_calendar_days, null);

  const markdown = render(trip);
  assert.match(markdown, /2027-02-01 \(Mon\)/);
  assert.match(markdown, /no itinerary line to anchor to/);
  assert.match(markdown, /This supplier holds a date but appears on no itinerary line/);
  assertColumnCounts(markdown);

  // It is a deadline, so it does not appear in the no-deadline list.
  assert.ok(!suppliersWithoutDeadline(trip).some(entry => entry.supplier.id === 'unplaced-venue'));
});

test('a supplier-stated date is counted as renegotiable, never as "recomputes automatically"', () => {
  const trip = copy();
  supplierIn(trip, 'cirque-symphonie').terms.release_date = '2027-02-15';
  supplierIn(trip, 'tn-aquarium').terms.deposit = { amount: 250, basis: 'flat', due_on: '2027-01-20' };
  assert.equal(deadlinesFor(trip).length, 4);

  const markdown = render(trip);
  // Four deadlines, but only the two anchored ones recompute.
  assert.match(markdown, /\*\*Recomputes automatically \(2\)\.\*\*/);
  assert.doesNotMatch(markdown, /\*\*Recomputes automatically \(4\)\.\*\*/);
  // The other two are named under renegotiation, so nobody is told to forget them.
  assert.match(markdown, /held space released on 2027-02-15 \(Mon\) is a date the supplier named/);
  assert.match(markdown, /deposit due on 2027-01-20 \(Wed\) is a date the supplier named/);

  // The shift table carries only the rows that actually shift.
  const shiftRows = markdown.split('\n').filter(line => line.startsWith('| ') && /\(\+7d\)|\(−\d+d\)/.test(line));
  assert.equal(shiftRows.length, 2);
});

test('trip-wide absences are reported even when every supplier has a deadline', () => {
  const trip = copy();
  for (const supplier of trip.suppliers) supplier.terms.balance_due_days = 10;
  assert.deepEqual(suppliersWithoutDeadline(trip), []);

  const markdown = render(trip);
  assert.match(markdown, /Every supplier on this trip produces at least one date\./);
  // These findings do not depend on the no-deadline list and must survive it being empty.
  assert.match(markdown, /No cancellation term is recorded for 13 of 13 suppliers/);
  assert.match(markdown, /Admission to the IMAX Theater at the Aquarium/);
  // And no bullet about "the 0 suppliers with nothing recorded".
  assert.doesNotMatch(markdown, /The 0 suppliers/);
  assert.doesNotMatch(markdown, /These are the ones that surprise you/);
});

test('a term recorded but unanchorable is not reported as a missing term', () => {
  const trip = copy();
  trip.suppliers.push({
    id: 'unanchorable',
    name: 'Supplier with a term and no line',
    category: 'service',
    relationship: { owner: 'Troen coordinator', status: 'quoted' },
    contacts: [],
    terms: { final_headcount_due_business_days: 5 },
    attempts: [],
    source_ids: []
  });
  const markdown = render(trip);
  assert.match(markdown, /final_headcount_due_business_days recorded, but this supplier is on no itinerary line to anchor it to/);
  // It also gets its own row explaining that the remedy is a slot, not a phone call.
  assert.match(markdown, /Give it a slot and the date computes itself\./);
  const row = undatableTerms(trip).find(entry => entry.supplier.id === 'unanchorable');
  assert.equal(row.term, 'final_headcount_due_business_days');

  // It must not be listed among the terms that were never recorded.
  assert.doesNotMatch(markdown, /Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit \| Nothing recorded/);
});

test('a paid deposit is never reported as a missing itinerary line', () => {
  const trip = copy();
  trip.suppliers.push({
    id: 'prepaid-no-line',
    name: 'Prepaid supplier with no line',
    category: 'service',
    relationship: { owner: 'Troen coordinator', status: 'deposit paid' },
    contacts: [],
    terms: { deposit: { amount: 500, basis: 'flat', paid_on: '2026-08-01' } },
    attempts: [],
    source_ids: []
  });

  // A deposit is never anchor-derived, so adding a slot would not produce a date either.
  const report = suppliersWithoutDeadline(trip).find(entry => entry.supplier.id === 'prepaid-no-line');
  assert.deepEqual(report.unanchorable, []);
  assert.equal(report.inert.length, 1);

  const markdown = render(trip);
  assert.match(markdown, /deposit \(paid 2026-08-01 — a payment already made, not a date ahead\); nothing here produces a date ahead/);
  assert.doesNotMatch(markdown, /deposit recorded, but this supplier is on no itinerary line/);
  // And the paid total says it is a floor, because this deposit's amount is known but the
  // ledger must not silently sum an amountless one.
  assert.match(markdown, /Paid to date: \$600\.00/);
});

test('an amountless paid item is not silently summed as zero', () => {
  const trip = copy();
  supplierIn(trip, 'tn-aquarium').terms.deposit = { basis: 'flat', paid_on: '2026-08-01' };
  const markdown = render(trip);
  assert.match(markdown, /Paid to date: \$100\.00 across 2 items — 1 of those carries no amount, so this is a floor, not a total/);
});

test('a nonsense day count is refused rather than turned into a plausible date', () => {
  const negative = copy();
  supplierIn(negative, 'southern-belle').terms.balance_due_days = -10;
  assert.throws(() => deadlinesFor(negative), /non-negative integer number of days/,
    'a negative term would put the "deadline" after the visit');

  const fractional = copy();
  supplierIn(fractional, 'southern-belle').terms.balance_due_days = 7.5;
  assert.throws(() => deadlinesFor(fractional), /non-negative integer number of days/,
    'truncating 7.5 would print a rule that disagrees with the date');

  const text = copy();
  supplierIn(text, 'southern-belle').terms.balance_due_days = '10';
  assert.throws(() => deadlinesFor(text), /non-negative integer number of days/);

  const badBusinessDays = copy();
  supplierIn(badBusinessDays, 'rock-city').terms.final_headcount_due_business_days = -5;
  assert.throws(() => deadlinesFor(badBusinessDays), /non-negative integer/);

  // The same nonsense on a supplier with no itinerary line must be refused too. Accepting it
  // would print garbage as a recorded term, and then start throwing the day someone adds the
  // slot the document told them to add.
  const unanchored = copy();
  unanchored.suppliers.push({
    id: 'bad-and-unanchored',
    name: 'Supplier with a bad term and no line',
    category: 'service',
    relationship: { owner: 'Troen coordinator', status: 'quoted' },
    contacts: [],
    terms: { final_headcount_due_business_days: -5, balance_due_days: 'ten' },
    attempts: [],
    source_ids: []
  });
  assert.throws(() => deadlinesFor(unanchored), /non-negative integer number of days/);
  assert.throws(() => render(unanchored), /non-negative integer number of days/);

  // A malformed supplier-stated date is refused on the same grounds.
  const badRelease = copy();
  supplierIn(badRelease, 'ruby-falls').terms.release_date = '15/02/2027';
  assert.throws(() => deadlinesFor(badRelease), /must be YYYY-MM-DD/);
});

test('a supplier-stated date after the visit is flagged, not printed as normal notice', () => {
  const trip = copy();
  // A term carried over from another trip, or a slipped transcription: the deposit is due
  // two months after the visit it belongs to.
  supplierIn(trip, 'tn-aquarium').terms.deposit = { amount: 250, basis: 'flat', due_on: '2027-06-01' };
  const deposit = due(trip, 'tn-aquarium', 'deposit');
  assert.equal(deposit.lead_calendar_days, -52, 'the aquarium visit is 2027-04-10');

  const markdown = render(trip);
  assert.match(markdown, /the recorded date falls 52 calendar days \*\*after\*\* the 2027-04-10 \(Sat\) visit it governs/);
  assert.match(markdown, /after the visit; check the record/);
  // It must never read as ordinary lead time.
  assert.doesNotMatch(markdown, /-52 calendar days before the anchor/);
});

test('a deposit that is not an object is refused rather than mis-reported', () => {
  const trip = copy();
  // `"deposit": 100` passes validateTrip and would render a payment already made as an
  // unpriced outstanding item — the ledger saying the opposite of the truth.
  supplierIn(trip, 'tn-aquarium').terms.deposit = 100;
  assert.throws(() => deadlinesFor(trip), /deposit for tn-aquarium must be an object/);
  assert.throws(() => render(trip), /deposit for tn-aquarium must be an object/);
});

test('"never recorded" and "recorded and left empty" are not collapsed into one phrase', () => {
  const markdown = render(loadTrip(TRIP));
  // Ruby Falls carries release_date: null plus three genuinely absent fields.
  assert.match(markdown, /Not recorded: final_headcount_due_business_days · balance_due_days · deposit\. Recorded and left empty: release_date/);
  assert.doesNotMatch(markdown, /Not recorded:[^|]*release_date \(recorded, left empty\)/);
});

test('the standing summary says something when lines are confirmed', () => {
  const trip = copy();
  for (const day of trip.days) {
    for (const slot of day.slots) if (slot.supplier_id) slot.state = 'confirmed';
  }
  const markdown = render(trip);
  assert.match(markdown, /21 of 21 supplied lines confirmed, 0 held or paid against, 0 neither\./);
  assert.doesNotMatch(markdown, /Nothing is confirmed/);

  const mixed = copy();
  mixed.days[0].slots.find(slot => slot.id === 'd1-rock-city').state = 'confirmed';
  assert.match(render(mixed), /1 of 21 supplied lines confirmed, 1 held or paid against, 19 neither\./);
});

test('ordering is code-unit order so the bytes do not depend on the host locale', () => {
  const source = fs.readFileSync(RENDERER_FILE, 'utf8');
  // `localeCompare` varies with the host ICU build; `check --all` compares bytes.
  const uses = source.split('\n').filter(line => line.includes('localeCompare') && !line.trimStart().startsWith('/*') && !line.trimStart().startsWith('*'));
  assert.deepEqual(uses, [], 'no sort may depend on collation');

  // Two deadlines on the same date sort by supplier name, deterministically.
  const trip = copy();
  supplierIn(trip, 'rock-city').name = 'rock city gardens';
  supplierIn(trip, 'tn-aquarium').terms.release_date = '2027-04-01';
  const sameDay = deadlinesFor(trip).filter(entry => entry.due === '2027-04-01');
  assert.equal(sameDay.length, 2);
  assert.deepEqual(sameDay.map(entry => entry.supplier.name), ['Tennessee Aquarium', 'rock city gardens'],
    'uppercase sorts before lowercase in code-unit order, on every host');
});

test('an unpadded slot hour does not mis-pick the anchor slot', () => {
  const trip = copy();
  // load.cjs's clockTime regex accepts "9:30", which sorts after "14:00" as a plain string.
  trip.days[0].slots.push({
    id: 'd1-rock-city-early', time: '9:30', title: 'Early entry at Rock City',
    supplier_id: 'rock-city', state: 'quoted', source_ids: ['HW-THU']
  });
  const anchor = anchorFor(trip, supplierIn(trip, 'rock-city'));
  assert.equal(anchor.slot.id, 'd1-rock-city-early', '09:30 comes before 14:00');
  assert.equal(anchor.slot.time, '9:30');
  assert.equal(anchor.served_lines, 2);
  // The date is the same either way, so only the named slot would have been wrong.
  assert.equal(due(trip, 'rock-city', 'final_headcount').due, '2027-04-01');
  assert.match(render(trip), /slot `d1-rock-city-early` at 9:30/);
});

test('a deadline landing on a weekend is printed as computed and flagged', () => {
  const trip = copy();
  // Saturday 2027-04-03 is nine calendar days before the 2027-04-12 anchor... use the
  // riverboat on Sunday 2027-04-11 with a 7-day balance term: 2027-04-04, a Sunday.
  supplierIn(trip, 'southern-belle').terms.balance_due_days = 7;
  const balance = due(trip, 'southern-belle', 'balance');
  assert.equal(balance.due, '2027-04-04');
  assert.equal(isWeekend(balance.due), true);
  assert.match(render(trip), /this date falls on a Sunday/);

  // A business-day term can never land on a weekend.
  for (let count = 1; count <= 30; count += 1) {
    assert.equal(isWeekend(businessDaysBefore('2027-04-11', count).date), false, `count ${count}`);
  }
});
