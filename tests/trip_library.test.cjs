const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTrip } = require('../pipeline/trip/load.cjs');
const { renderTrip } = require('../pipeline/trip/cli.cjs');
const S = require('../pipeline/trip/schema.cjs');
const lib = require('../pipeline/trip/renderers/library-coverage.cjs');

const TRIP = 'west-henderson-chattanooga-2027-04-08';
const DESTINATION = 'Chattanooga, TN';

const library = () => lib.libraryForDestination(DESTINATION);
const copy = () => structuredClone(library());
const component = (data, id) => data.components.find(entry => entry.id === id);
const errors = findings => lib.errorsIn(findings).map(finding => finding.message).join(' | ');
const checks = findings => lib.errorsIn(findings).map(finding => finding.check);

const coverage = () => lib.coverageFor(loadTrip(TRIP), library());
const rowFor = (result, slotId) => result.rows.find(row => row.slot.id === slotId);
const componentIds = row => row.matched.map(hit => hit.component.id);

test('the Chattanooga library loads and passes its own boundary', () => {
  const data = library();
  assert.ok(data, 'a library exists for the trip destination');
  assert.equal(data.library.id, 'chattanooga-tn');
  assert.deepEqual(lib.validateLibrary(data), [], errors(lib.validateLibrary(data)));
  assert.ok(data.components.length >= 12);

  for (const entry of data.components) {
    assert.ok(S.SUPPLIER_CATEGORIES.includes(entry.category), `${entry.id} has a known category`);
    assert.ok((entry.source_ids || []).length, `${entry.id} says where its facts came from`);
    assert.ok(lib.norm(entry.name).length >= lib.MIN_MATCH_LENGTH, `${entry.id} has a matchable name`);
  }
  const ids = data.components.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length, 'component ids are unique');
});

test('the library holds the businesses this destination keeps re-researching', () => {
  const ids = library().components.map(entry => entry.id);
  for (const expected of [
    'rock-city', 'incline-railway', 'southern-belle', 'ruby-falls', 'bessie-smith',
    'tennessee-aquarium', 'high-point-climbing', 'cirque-de-la-symphonie', 'point-park',
    'rosss-landing-passage', 'walnut-street-bridge', 'chattanooga-choo-choo'
  ]) assert.ok(ids.includes(expected), `${expected} is a component`);
});

test('a component carrying per-trip data is refused', () => {
  const withDate = copy();
  component(withDate, 'rock-city').deadline_shape.release_date = '2027-03-01';
  assert.match(errors(lib.validateLibrary(withDate)), /per-trip data/);

  const withDateValue = copy();
  component(withDateValue, 'rock-city').seasonality.note = 'Checked on 2026-09-17.';
  assert.match(errors(lib.validateLibrary(withDateValue)), /calendar date/);

  const withHeadcount = copy();
  component(withHeadcount, 'rock-city').headcount = 80;
  assert.match(errors(lib.validateLibrary(withHeadcount)), /per-trip data/);

  const withState = copy();
  component(withState, 'rock-city').booking = 'confirmed';
  assert.match(errors(lib.validateLibrary(withState)), /booking state/);

  const withStateKey = copy();
  component(withStateKey, 'rock-city').line_state = 'held';
  assert.match(errors(lib.validateLibrary(withStateKey)), /per-trip data/);

  const withAttempts = copy();
  component(withAttempts, 'ruby-falls').attempts = [];
  assert.match(errors(lib.validateLibrary(withAttempts)), /per-trip data/);

  const withMoney = copy();
  component(withMoney, 'rock-city').group_minimum.note = 'Student rate is $19 per head.';
  assert.match(errors(lib.validateLibrary(withMoney)), /money amount/);

  const withRate = copy();
  component(withRate, 'rock-city').unit_price = { amount: 19 };
  assert.match(errors(lib.validateLibrary(withRate)), /per-trip data/);

  const withClock = copy();
  component(withClock, 'rock-city').duration_note = 'The group walks in at 14:00.';
  assert.match(errors(lib.validateLibrary(withClock)), /clock time/);
});

test('the boundary does not fire on ordinary prose about a business', () => {
  const prose = copy();
  const rockCity = component(prose, 'rock-city');
  rockCity.payment.note = 'Tickets are held at will call for the group leader.';
  rockCity.accessibility.note = 'Bus parking is limited and must be requested at booking.';
  component(prose, 'bessie-smith').guide.note = 'A guide is requested on the same form as admission.';
  assert.deepEqual(lib.validateLibrary(prose), [], errors(lib.validateLibrary(prose)));

  // A venue address carries a US state, which is not a booking state.
  const address = copy();
  component(address, 'cirque-de-la-symphonie').venue.state = 'TN';
  assert.deepEqual(lib.validateLibrary(address), [], errors(lib.validateLibrary(address)));
});

test('opening hours and source access dates are the two deliberate exceptions', () => {
  const data = library();
  assert.equal(component(data, 'ruby-falls').operating_hours.earliest_group_entry, '09:00');
  const web = data.sources.filter(source => source.kind === 'public_web');
  assert.ok(web.length, 'the library cites public pages');
  for (const source of web) {
    assert.match(source.url, /^https:\/\//, `${source.id} carries its URL`);
    assert.match(source.accessed, /^\d{4}-\d{2}-\d{2}$/, `${source.id} carries the date it was read`);
  }
  assert.deepEqual(lib.validateLibrary(data), [], 'neither exception trips the boundary');

  const undated = copy();
  undated.sources.find(source => source.kind === 'public_web').accessed = '';
  assert.match(errors(lib.validateLibrary(undated)), /the date it was read/);

  const unsourced = copy();
  component(unsourced, 'rock-city').source_ids = [];
  assert.match(errors(lib.validateLibrary(unsourced)), /where its facts came from/);
});

test('the library is refused if it names a person or a direct number', () => {
  const withMailbox = copy();
  component(withMailbox, 'rock-city').group_sales.locator = 'groups@example.com';
  assert.ok(checks(lib.validateLibrary(withMailbox)).includes('library.privacy'));

  const withNumber = copy();
  component(withNumber, 'rock-city').group_sales.locator = 'call 555-012-3456';
  assert.ok(checks(lib.validateLibrary(withNumber)).includes('library.privacy'));

  assert.deepEqual(lib.validateLibrary(library()), [], 'the real library carries neither');
});

test('identity rules keep matching honest', () => {
  const shortName = copy();
  component(shortName, 'rock-city').name = 'Rock';
  assert.match(errors(lib.validateLibrary(shortName)), /too short to match on/);

  const shortAlias = copy();
  component(shortAlias, 'rock-city').aliases.push({ text: 'RCG', kind: 'shorthand' });
  assert.match(errors(lib.validateLibrary(shortAlias)), /too short to match on/);

  const badAliasKind = copy();
  component(badAliasKind, 'rock-city').aliases[0].kind = 'nickname';
  assert.match(errors(lib.validateLibrary(badAliasKind)), /needs a kind/);

  const badCategory = copy();
  component(badCategory, 'rock-city').category = 'fun';
  assert.match(errors(lib.validateLibrary(badCategory)), /Unknown category/);

  const orphanRelationship = copy();
  component(orphanRelationship, 'incline-railway').relationships[0].component_id = 'nobody';
  assert.match(errors(lib.validateLibrary(orphanRelationship)), /unknown component/);

  const orphanChannel = copy();
  orphanChannel.channels[0].covers = ['nobody'];
  assert.match(errors(lib.validateLibrary(orphanChannel)), /unknown component/);
});

test('a name matches only when the component name appears in what the trip prints', () => {
  const data = library();
  const aquarium = component(data, 'tennessee-aquarium');
  const imax = component(data, 'tennessee-aquarium-imax');
  assert.ok(lib.matchIn(aquarium, 'Tennessee Aquarium'));
  assert.equal(lib.matchIn(imax, 'Tennessee Aquarium'), null, 'the longer name does not match the shorter line');
  assert.ok(lib.matchIn(imax, 'Admission to the IMAX Theater at the Aquarium'));
  assert.equal(lib.matchIn(component(data, 'point-park'), 'Lunch at the aquarium plaza'), null);
  assert.ok(lib.matchIn(component(data, 'point-park'), 'Point Park and the overlook'));

  // Whole words only: a name must not match inside a longer word.
  assert.equal(lib.matchIn(component(data, 'point-park'), 'Coach checkpoint parking at the gate'), null);
  assert.equal(lib.matchIn(component(data, 'walnut-street-bridge'), 'Dinner at Walnut Streetside'), null);
  // …but a shorthand still matches when it stands as whole words.
  assert.equal(lib.matchIn(component(data, 'rock-city'), 'Afternoon at Rock City').kind, 'shorthand');
});

test('clock comparisons survive an unpadded hour', () => {
  assert.equal(lib.minutesOfDay('8:30'), 510);
  assert.equal(lib.minutesOfDay('08:30'), 510);
  assert.equal(lib.minutesOfDay('09:00'), 540);
  assert.equal(lib.minutesOfDay('not a time'), null);
  assert.equal(lib.minutesOfDay('25:00'), null);

  // "8:30" is valid per schema.cjs and sorts after "09:00" as a string; the finding must survive.
  const trip = structuredClone(loadTrip(TRIP));
  const rubyFalls = trip.days[1].slots.find(slot => slot.id === 'd2-ruby-falls');
  rubyFalls.time = '8:30';
  const hours = lib.coverageFor(trip, library()).disagreements.filter(finding => finding.kind === 'hours');
  assert.equal(hours.length, 1, 'the early Ruby Falls line is still caught');
  assert.match(hours[0].message, /8:30/);
});

test('two suppliers disagreeing with one component are two findings', () => {
  const trip = structuredClone(loadTrip(TRIP));
  const second = structuredClone(trip.suppliers.find(supplier => supplier.id === 'rock-city'));
  second.id = 'rock-city-second-day';
  second.terms.minimum.count = 40;
  trip.suppliers.push(second);
  trip.days[1].slots.push({
    id: 'd2-rock-city-again', time: '20:00', title: 'Rock City Gardens after dark',
    supplier_id: second.id, state: 'quoted', included: true, source_ids: ['PH-FRI']
  });

  const stale = copy();
  component(stale, 'rock-city').group_minimum.count = 99;
  const terms = lib.coverageFor(trip, stale).disagreements.filter(finding => finding.kind === 'terms');
  const values = terms.map(finding => finding.message).sort();
  assert.equal(terms.length, 2, 'each counterparty gets its own finding');
  assert.match(values[0], /the record holds 15/);
  assert.match(values[1], /the record holds 40/);
});

test('coverage separates what a line sells from what its description mentions', () => {
  const result = coverage();
  assert.equal(result.rows.length, 27);

  assert.equal(rowFor(result, 'd1-rock-city').coverage, 'library-backed');
  assert.equal(rowFor(result, 'd4-riverboat').coverage, 'library-backed');
  assert.equal(rowFor(result, 'd2-point-park').coverage, 'library-backed', 'a line with no supplier can still be backed');
  assert.deepEqual(componentIds(rowFor(result, 'd4-ross-landing')), ['rosss-landing-passage']);

  // The day-one dinner is backed by what the inclusion sells, not by its shopping list.
  const dinnerOne = rowFor(result, 'd1-dinner');
  assert.equal(dinnerOne.coverage, 'library-backed');
  assert.deepEqual(componentIds(dinnerOne), ['chattanooga-choo-choo']);

  // The bridge is library content; the dinner at the far end of it is not.
  const dinnerTwo = rowFor(result, 'd2-dinner');
  assert.equal(dinnerTwo.coverage, 'referenced only');
  assert.deepEqual(componentIds(dinnerTwo), ['walnut-street-bridge']);

  // Lodging and coaches have no components at all.
  for (const slotId of ['d1-hotel-checkin', 'd2-breakfast', 'd1-coaches-arrive', 'd3-dinner']) {
    assert.equal(rowFor(result, slotId).coverage, 'bespoke', `${slotId} is bespoke`);
  }

  assert.ok(result.rows.filter(row => row.coverage === 'library-backed').length >= 12);
  assert.ok(result.unused.length >= 5, 'the library carries options this trip does not use');
  assert.ok(result.unused.some(entry => entry.id === 'tennessee-aquarium-imax'),
    'a ticket sold with no itinerary line shows as unused');
});

test('the report names the disagreements between library and record', () => {
  const result = coverage();
  const kinds = result.disagreements.map(finding => finding.kind);

  const misprint = result.disagreements.find(finding => finding.component_id === 'high-point-climbing');
  assert.ok(misprint, 'the inclusion page prints a business that does not exist');
  assert.equal(misprint.kind, 'name');
  assert.match(misprint.message, /High Street Climbing and Fitness Center/);
  assert.match(misprint.message, /High Point Climbing and Fitness/);
  assert.deepEqual(misprint.lines, ['High Point Climbing and Fitness (2027-04-09)']);

  const transcription = result.disagreements.find(finding => finding.component_id === 'nic-and-normans');
  assert.ok(transcription, 'a candidate venue name is corrected even though it backs no line');

  const venue = result.disagreements.find(finding => finding.kind === 'out of season');
  assert.ok(venue, 'the other printing names a venue the orchestra is not playing in');
  assert.match(venue.message, /Tivoli Theatre/);
  assert.match(venue.message, /Soldiers and Sailors/);
  assert.equal(venue.lines.length, 2, 'one correction, both lines that carry it');

  const hours = result.disagreements.find(finding => finding.kind === 'hours');
  assert.ok(hours, 'the printed Ruby Falls time is earlier than the first tour of the day');
  assert.match(hours.message, /08:30/);
  assert.match(hours.message, /09:00/);

  assert.ok(!kinds.includes('terms'), 'the library and the record agree on every checked term');
  assert.ok(result.agreed.length >= 4, 'and the agreement was actually checked');
  assert.ok(result.agreed.some(entry => entry.field === 'comp ratio' && String(entry.value) === '10'));
  assert.ok(result.agreed.some(entry => entry.field === 'group minimum' && String(entry.value) === '15'));
});

test('term, channel and duration drift are caught when they happen', () => {
  const trip = loadTrip(TRIP);

  const staleMinimum = copy();
  component(staleMinimum, 'rock-city').group_minimum.count = 25;
  const minimumFinding = lib.coverageFor(trip, staleMinimum).disagreements
    .find(finding => finding.kind === 'terms' && finding.detail === 'group minimum');
  assert.ok(minimumFinding);
  assert.match(minimumFinding.message, /library holds 25, the record holds 15/);

  const staleDeadline = copy();
  component(staleDeadline, 'incline-railway').deadline_shape.balance_due_days = 30;
  assert.ok(lib.coverageFor(trip, staleDeadline).disagreements
    .some(finding => finding.kind === 'terms' && finding.detail === 'balance due days'));

  const staleChannel = copy();
  const rockCity = component(staleChannel, 'rock-city');
  rockCity.group_sales.channel_kind = 'portal';
  rockCity.group_sales.also = [];
  const channelFinding = lib.coverageFor(trip, staleChannel).disagreements.find(finding => finding.kind === 'channel');
  assert.ok(channelFinding);
  assert.match(channelFinding.message, /web_form/);

  // A channel the record uses that the library lists under "also" is not drift.
  const rubyByPhone = lib.coverageFor(trip, library()).disagreements
    .filter(finding => finding.kind === 'channel' && finding.component_id === 'ruby-falls');
  assert.deepEqual(rubyByPhone, []);

  const staleDuration = copy();
  component(staleDuration, 'southern-belle').typical_duration_minutes = 45;
  const durationFinding = lib.coverageFor(trip, staleDuration).disagreements.find(finding => finding.kind === 'duration');
  assert.ok(durationFinding);
  assert.match(durationFinding.message, /allows 90 minutes/);
});

test('the shared group-sales office is reported as one enquiry over two lines', () => {
  const result = coverage();
  const office = result.channels.find(entry => entry.channel.id === 'lookout-mountain-group-office');
  assert.ok(office);
  const onTrip = office.covered.filter(entry => entry.slotIds.length).map(entry => entry.component.id).sort();
  assert.deepEqual(onTrip, ['incline-railway', 'southern-belle']);

  const incline = component(library(), 'incline-railway');
  assert.ok((incline.relationships || []).some(relationship => relationship.component_id === 'southern-belle'
    && relationship.nature === 'shared_group_sales_office'));
});

test('the question that gets re-asked every season is carried by the business', () => {
  const result = coverage();
  const comp = result.questions.find(entry => entry.component.id === 'incline-railway');
  assert.ok(comp, 'the unanswered comp question is on the component, not in a margin');
  assert.match(comp.question.question, /complimentary places to tour managers or chaperones/i);
  assert.equal(comp.question.answer, null);

  // One question per business, not one from the component and one generated.
  const inclineQuestions = result.questions.filter(entry => entry.component.id === 'incline-railway');
  assert.equal(inclineQuestions.length, 1);

  // Only businesses this trip touches.
  assert.ok(!result.questions.some(entry => entry.component.id === 'southside-social'));

  // Answering it removes it.
  const answered = copy();
  component(answered, 'incline-railway').standing_questions[0].answer = 'One place per ten paid, plus the driver.';
  component(answered, 'incline-railway').comp_policy = { known: true, kind: 'vendor_earned', ratio: 10, note: 'One per ten paid.' };
  const after = lib.coverageFor(loadTrip(TRIP), answered);
  assert.ok(!after.questions.some(entry => entry.component.id === 'incline-railway'));
});

test('the rendered report is deterministic, escaped, and refuses a broken library', () => {
  const trip = loadTrip(TRIP);
  const first = lib.buildMarkdown(trip);
  const second = lib.buildMarkdown(trip);
  assert.equal(first, second, 'two renders produce identical bytes');
  assert.doesNotMatch(first, /\d{4}-\d{2}-\d{2}T/, 'no timestamp in the output');

  for (const line of first.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.slice(1, -1).split(/(?<!\\)\|/);
    assert.ok(cells.every(cell => !/(?<!\\)\|/.test(cell)), `unescaped pipe in: ${line}`);
  }

  assert.match(first, /## Every line/);
  assert.match(first, /## Where the library and the record disagree/);
  assert.match(first, /## Unused components — ready for the next trip/);
  assert.match(first, /## Bespoke lines/);

  const outputs = lib.outputs(trip);
  assert.deepEqual([...outputs.keys()], ['library-coverage.md']);
  assert.equal(outputs.get('library-coverage.md'), first);
});

test('a library that breaks its own boundary reports that instead of a coverage report', () => {
  const broken = copy();
  component(broken, 'rock-city').headcount = 80;
  const markdown = lib.buildMarkdown(loadTrip(TRIP), broken);
  assert.match(markdown, /does not pass its own boundary/);
  assert.match(markdown, /per-trip data/);
  assert.doesNotMatch(markdown, /## Every line/, 'no coverage is claimed from a broken library');
});

test('the renderer is discovered and its output is current', () => {
  const result = renderTrip(loadTrip(TRIP));
  assert.deepEqual(result.errors, []);
  assert.ok(result.files.has('library-coverage.md'));
  assert.ok((result.byRenderer.get('library-coverage') || []).includes('library-coverage.md'));
});

test('a destination with no library is reported rather than silently skipped', () => {
  const elsewhere = structuredClone(loadTrip(TRIP));
  elsewhere.trip.destination = 'Nowhere, ZZ';
  const markdown = lib.buildMarkdown(elsewhere);
  assert.match(markdown, /no component library/);
  assert.match(markdown, /every line on this trip is bespoke/);
});
