/* The vendor sheet is the page nobody should have to reprint from scratch. These tests hold it to
   that: every counterparty present, the missing fields as loud as the known ones, the pen rates
   reconciled onto the suppliers, and the same bytes every time. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadTrip } = require('../pipeline/trip/load.cjs');
const renderer = require('../pipeline/trip/renderers/vendor-sheet.cjs');
const S = require('../pipeline/trip/schema.cjs');

const TRIP = 'west-henderson-chattanooga-2027-04-08';
const OUTPUT = path.join(__dirname, '..', 'pipeline/trip/out', TRIP, 'vendor-sheet.md');
const copy = () => structuredClone(loadTrip(TRIP));
const render = (trip = loadTrip(TRIP)) => renderer.outputs(trip).get('vendor-sheet.md');
const sheet = render();

/* The slice of the page describing one counterparty, so a claim can be pinned to its own block. */
function block(text, heading) {
  const start = text.indexOf(`#### ${heading}\n`);
  assert.notEqual(start, -1, `no detail block for ${heading}`);
  const next = text.indexOf('\n#### ', start + 1);
  const section = text.indexOf('\n## ', start + 1);
  const ends = [next, section].filter(at => at !== -1);
  return text.slice(start, ends.length ? Math.min(...ends) : text.length);
}

test('the renderer matches the contract the CLI discovers it by', () => {
  assert.equal(renderer.name, 'vendor-sheet');
  assert.ok(renderer.description);
  const produced = renderer.outputs(loadTrip(TRIP));
  assert.ok(produced instanceof Map);
  assert.deepEqual([...produced.keys()], ['vendor-sheet.md']);
  assert.equal(typeof produced.get('vendor-sheet.md'), 'string');
});

test('output is deterministic and independent of the order suppliers happen to sit in', () => {
  assert.equal(render(), render(), 'two renders of the same record must be identical bytes');

  const shuffled = copy();
  shuffled.suppliers.reverse();
  assert.equal(render(shuffled), sheet, 'supplier order in the file must not move the page');

  const source = fs.readFileSync(path.join(__dirname, '..', 'pipeline/trip/renderers/vendor-sheet.cjs'), 'utf8');
  assert.doesNotMatch(source, /Date\.now|Math\.random|new Date\(\)/, 'no clock, no randomness');
});

test('the committed output is the rendered output', () => {
  assert.equal(fs.readFileSync(OUTPUT, 'utf8'), sheet,
    `stale: run node pipeline/trip/cli.cjs render ${TRIP}`);
});

test('every counterparty on the trip is on the sheet, with the lines it covers', () => {
  const trip = loadTrip(TRIP);
  for (const supplier of trip.suppliers) {
    assert.ok(sheet.includes(`#### ${supplier.name}`), `${supplier.id} has no detail block`);
    assert.ok(sheet.includes(`\`${supplier.id}\``), `${supplier.id} is never named by id`);
  }
  // Grouped by counterparty, not by itinerary order: one block carries all four coach lines.
  const coach = block(sheet, 'Young Transportation');
  for (const title of ['Coaches arrive at the school', 'Depart for the Tennessee Aquarium', 'Check out and load the coaches']) {
    assert.ok(coach.includes(title), `the coach block is missing "${title}"`);
  }
  // And the client-facing wording for the line sits next to it.
  assert.ok(coach.includes('All transportation on the itinerary'));
});

test('one group-sales office covering two lines is surfaced as one call', () => {
  assert.ok(sheet.includes('## One counterparty, several lines'));
  const start = sheet.indexOf('## One counterparty, several lines');
  const section = sheet.slice(start, sheet.indexOf('\n## ', start + 1));
  assert.ok(section.includes('Lookout Mountain Incline Railway'));
  assert.ok(section.includes('Southern Belle Riverboat'));
  assert.ok(section.includes('2 itinerary lines'));
  // The point of the pairing: one is paid, the other has never been contacted.
  assert.ok(section.includes('Deposit paid'));
  assert.ok(section.includes('Requested'));

  const unrelated = copy();
  for (const supplier of unrelated.suppliers) delete supplier.related_supplier_ids;
  assert.ok(!render(unrelated).includes('## One counterparty, several lines'),
    'the grouping must come from the record, not from a hardcoded pair');

  // The link is undirected: one office is one office whichever side of the record names the other.
  for (const id of ['incline-railway', 'southern-belle']) {
    const oneWay = copy();
    delete oneWay.suppliers.find(supplier => supplier.id === id).related_supplier_ids;
    assert.ok(render(oneWay).includes('## One counterparty, several lines'),
      `the pairing disappears when only ${id === 'incline-railway' ? 'the riverboat' : 'the railway'} records it`);
  }
});

test('a line still being shopped shows its candidates and never reads as settled', () => {
  const dinner = block(sheet, 'Day one group dinner');
  assert.ok(dinner.includes(S.clientWord('sourcing')), 'the client word for a sourcing line must be printed');
  assert.ok(dinner.includes('Sourcing'));
  for (const candidate of loadTrip(TRIP).suppliers.find(s => s.id === 'dinner-day-one').candidates) {
    assert.ok(dinner.includes(candidate.name), `candidate ${candidate.name} is missing`);
  }
  assert.ok(dinner.includes('Chattanooga Choo Choo Complex'), 'what the proposal sells must still be visible');
  // Nothing on the page may present an unconfirmed line as confirmed.
  assert.doesNotMatch(sheet, /Confirmed — "confirmed"/);
  assert.doesNotMatch(sheet, /\| Group dinner \| Confirmed \|/);
});

test('what is missing is as loud as what is known', () => {
  const start = sheet.indexOf('## What is missing');
  const section = sheet.slice(start, sheet.indexOf('\n## ', start + 1));

  // A counterparty sold to the client that no one has ever contacted.
  assert.match(section, /Southern Belle Riverboat \| [^|]*no contact attempt logged/);
  assert.match(section, /Cirque de la Symphonie[^|]*\| [^|]*no rate/);
  assert.ok(section.includes('13 have no cancellation terms'), 'the counts must be derived from the record');

  // In the detail block, an empty attempts log says so rather than printing an empty table.
  assert.ok(block(sheet, 'Southern Belle Riverboat').includes('Nothing recorded.'));

  // Every term field in the vocabulary is accounted for on every supplier, present or not, so a
  // field added to schema.cjs cannot go unreported on a supplier that has not answered on it.
  for (const name of ['Chattanooga hotel (property not named on the proposal)', 'Rock City Gardens', 'Ruby Falls']) {
    const terms = block(sheet, name).split('_Terms_')[1].trim().split('\n\n')[0];
    const rows = terms.split('\n').slice(2);
    assert.equal(rows.length, S.TERM_FIELDS.length, `${name} does not account for every term field`);
  }
  const hotel = block(sheet, 'Chattanooga hotel (property not named on the proposal)');
  assert.ok(hotel.includes('Cancellation | _not recorded_'));
  assert.ok(hotel.includes('Final headcount due | _not recorded_'));

  // A field that exists and is empty is a different finding from a field that is absent.
  assert.ok(block(sheet, 'Ruby Falls').includes('field present, left empty'));
});

test('structural findings a reprint would lose are derived, not asserted', () => {
  assert.ok(sheet.includes('Admission to the IMAX Theater at the Aquarium'), 'the slotless inclusion');
  assert.ok(sheet.includes('Soldiers and Sailors Memorial Auditorium') && sheet.includes('Tivoli Theatre'),
    'both printed venues');
  assert.match(sheet, /The same day, twice.*Rock City Gardens/, 'the duplicated same-day attempt');

  const deduped = copy();
  const rockCity = deduped.suppliers.find(supplier => supplier.id === 'rock-city');
  rockCity.attempts = rockCity.attempts.filter(attempt => attempt.channel !== 'voicemail');
  assert.ok(!render(deduped).includes('The same day, twice'),
    'the duplicate-effort finding must fall away when the duplicate does');
});

test('deadlines are derived from the recorded rule and labelled as derived', () => {
  const start = sheet.indexOf('## Deadlines and dated obligations');
  const section = sheet.slice(start, sheet.indexOf('\n## ', start + 1));

  // 5 business days before Thursday 2027-04-08 crosses a weekend: 04-01, not a naive 04-03.
  assert.ok(section.includes('2027-04-01'), 'the derived final-headcount date');
  assert.ok(!section.includes('2027-04-03'), 'business days must skip the weekend');
  assert.ok(section.includes('**derived**'), 'a derived date must say so');

  // A deadline with no recorded anchor is shown as ambiguous rather than resolved.
  assert.ok(section.includes('anchor not recorded'));
  assert.ok(section.includes('2026-09-21') && section.includes('2027-03-29'), 'both readings of "10 days"');

  assert.ok(section.includes('11 of 13 counterparties carry no deadline at all'));
  assert.ok(section.includes('2026-09-11') && section.includes('Deposit paid'), 'the dated deposit');
});

test('rates recorded in pen are reconciled onto the suppliers and against the blended quote line', () => {
  const start = sheet.indexOf('## Rates against the quote system');
  const section = sheet.slice(start);

  assert.ok(section.includes('| Attractions | $183.00 | **none attached**'), 'the blended line with no supplier');
  assert.ok(section.includes('| Motor coach | **not legible**'));

  // Every recorded unit price reaches the page, with its basis, and says whether a term carries it.
  assert.match(section, /Rock City Gardens \| \$19\.00 \| Per person/);
  assert.match(section, /Bessie Smith Cultural Center \| \$5\.00 \| Per person/);
  assert.match(section, /Bessie Smith Cultural Center \| \$50\.00 \| Per group \| Tour guide \| \*\*no term field carries it\*\*/);
  assert.match(section, /Lookout Mountain Incline Railway \| \$100\.00 \| Flat fee \| Deposit/);

  // The blend is reconciled, not recomputed: $19 + $5 of $183, six suppliers unpriced.
  assert.ok(section.includes('$24.00') && section.includes('$159.00'));
  assert.ok(section.includes('not a re-quote'), 'the arithmetic must be labelled for what it is');

  // The per-group guide fee is kept out of a per-person subtraction.
  assert.ok(section.includes('per-group guide fee'));

  // A paid deposit is not a rate: the summary must not present $100 as the price of the line.
  assert.ok(sheet.includes('($100.00 deposit only)'));
  assert.match(sheet, /Lookout Mountain Incline Railway \| [^|]*no rate — a deposit is paid against a price nobody recorded/);
});

test('the contact log keeps same-day attempts in the order they happened', () => {
  const start = sheet.indexOf('## Contact log, in date order');
  const section = sheet.slice(start);
  const form = section.indexOf('| 2026-09-10 | Rock City Gardens | outbound | web form');
  const voicemail = section.indexOf('| 2026-09-10 | Rock City Gardens | outbound | voicemail');
  const reply = section.indexOf('| 2026-09-10 | Rock City Gardens | inbound | email');
  assert.ok(form !== -1 && voicemail !== -1 && reply !== -1, 'all three Rock City attempts are logged');
  assert.ok(form < voicemail && voicemail < reply, 'the recorded sequence must survive');
  assert.ok(section.includes('No attempt of any kind is recorded for 7 counterparties'));
});

test('a counterparty with no itinerary line at all is flagged, not silently dropped', () => {
  const orphaned = copy();
  for (const day of orphaned.days) {
    for (const slot of day.slots) if (slot.supplier_id === 'ruby-falls') delete slot.supplier_id;
  }
  const rendered = render(orphaned);
  assert.ok(block(rendered, 'Ruby Falls').includes('**This counterparty covers no itinerary line.**'));
  assert.match(rendered, /Ruby Falls \| Attractions \| \*\*none\*\*/);
});

test('table cells are escaped so one supplier name cannot break the page', () => {
  const piped = copy();
  piped.suppliers.find(supplier => supplier.id === 'ruby-falls').name = 'Ruby | Falls';
  const rendered = render(piped);
  assert.ok(rendered.includes('Ruby \\| Falls'));
  assert.ok(!rendered.includes('| Ruby | Falls |'), 'an unescaped pipe would add a column');
});

test('no personal contact detail reaches the generated page', () => {
  assert.doesNotMatch(sheet, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/, 'no direct phone numbers');
  assert.doesNotMatch(sheet, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no mailboxes');
  // Counterparty contacts are carried as roles, which is what the page prints.
  assert.ok(sheet.includes('Contacts, by role: Group sales'));
  assert.ok(sheet.includes('Troen coordinator'));
  for (const supplier of loadTrip(TRIP).suppliers) {
    for (const contact of supplier.contacts || []) assert.ok(sheet.includes(contact.role));
  }
});

/* The loader validates slot dates, supplier categories and price bases, but not a deposit's paid_on,
   a release date, a known_unit_prices entry or the shape of a term. The sheet is generated from what
   is there, so it must degrade into a visible finding rather than a crash or a confident wrong number. */
test('a field the validator does not police cannot crash the page or fake a number', () => {
  const badDate = copy();
  badDate.suppliers.find(supplier => supplier.id === 'incline-railway').terms.deposit.paid_on = '09/11/2026';
  const dated = render(badDate);
  assert.ok(dated.includes('not a YYYY-MM-DD date'), 'an unparseable date is shown as recorded and flagged');
  assert.ok(!dated.includes('Invalid Date') && !dated.includes('NaN'));

  const noAmount = copy();
  noAmount.pricing.known_unit_prices.push({ supplier_id: 'rock-city', basis: 'per_person', source_ids: ['HW-THU'] });
  assert.ok(!render(noAmount).includes('NaN'), 'an amountless rate must not turn the reconciliation into NaN');

  const ghost = copy();
  ghost.pricing.known_unit_prices.push({ supplier_id: 'nobody', amount: 5, basis: 'per_person', source_ids: ['HW-THU'] });
  assert.ok(render(ghost).includes('no such counterparty in this record'));

  const scalar = copy();
  scalar.suppliers.find(supplier => supplier.id === 'rock-city').terms.minimum = 20;
  const printed = render(scalar);
  assert.ok(!printed.includes('undefined'), 'a term in an unexpected shape is printed as found');
  assert.ok(printed.includes('not recorded as a count and a unit'));
});

test('a rate is a rate whatever its basis, and a paid deposit is not one', () => {
  const perGroup = copy();
  perGroup.pricing.known_unit_prices.push({ supplier_id: 'tn-aquarium', amount: 250, basis: 'per_group', source_ids: ['HW-SAT'] });
  const rendered = render(perGroup);
  assert.match(rendered, /Tennessee Aquarium \| Attractions \|[^\n]*\$250\.00 per group/, 'the rate reaches the summary');
  assert.doesNotMatch(rendered, /\| Tennessee Aquarium \| no rate/, 'and it is no longer counted as missing');

  // The incline has only a deposit recorded, which says money moved, not what the line costs.
  assert.match(sheet, /Lookout Mountain Incline Railway \|[^\n]*no rate/);
});

test('the line-state table accounts for every counterparty, including one with no state', () => {
  const orphaned = copy();
  for (const day of orphaned.days) {
    for (const slot of day.slots) if (slot.supplier_id === 'ruby-falls') delete slot.supplier_id;
  }
  const rendered = render(orphaned);
  const start = rendered.indexOf('| Line state |');
  const rows = rendered.slice(start, rendered.indexOf('\n\n', start)).split('\n').slice(2);
  assert.ok(rows.some(row => row.includes('No state recorded')), 'a counterparty with no stated line needs its own row');
  const counted = rows.reduce((total, row) => total + Number(row.split('|')[3]), 0);
  assert.equal(counted, orphaned.suppliers.length, 'the column must sum to the number the prose claims');
});

test('the page says what it is: a working record, not a booking', () => {
  assert.ok(sheet.includes('not a client document, not a booking and not a payment'));
  assert.ok(sheet.includes(loadTrip(TRIP)._file), 'it names the record it was generated from');
  assert.ok(sheet.includes('node pipeline/trip/cli.cjs render'), 'and how to regenerate it');
});
