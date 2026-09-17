const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadTrip, validateTrip, assertValidTrip, tripIds, lines, supplierIndex, slotsForSupplier, errorsIn } = require('../pipeline/trip/load.cjs');
const { loadRenderers, renderTrip, checkTrip, main } = require('../pipeline/trip/cli.cjs');
const S = require('../pipeline/trip/schema.cjs');

const TRIP = 'west-henderson-chattanooga-2027-04-08';
const copy = () => structuredClone(loadTrip(TRIP));
const checks = findings => errorsIn(findings).map(f => f.check);
const messages = findings => errorsIn(findings).map(f => f.message).join(' | ');

test('the real trip loads and validates', () => {
  assert.ok(tripIds().includes(TRIP));
  const trip = loadTrip(TRIP);
  assert.deepEqual(errorsIn(validateTrip(trip)), [], messages(validateTrip(trip)));
  assert.equal(trip.days.length, 4);
  assert.equal(lines(trip).length, 27);
  assert.equal(trip.suppliers.length, 13);
  assert.equal(trip.inclusions.length, 15);
  assert.doesNotThrow(() => assertValidTrip(trip));
});

test('the record keeps the facts the printed pages lost', () => {
  const trip = loadTrip(TRIP);
  const suppliers = supplierIndex(trip);

  // Vendor-earned comps and trip-granted comps are separate quantities.
  assert.equal(trip.trip.headcount.trip_granted_comps, 3);
  const rockCity = suppliers.get('rock-city');
  assert.equal(rockCity.terms.comp_policy.kind, 'vendor_earned');
  assert.equal(rockCity.terms.comp_policy.ratio, 10);
  assert.ok(rockCity.terms.comp_policy.extras.includes('bus driver comp'));
  assert.equal(S.COMP_KINDS.vendor_earned.effect, 'reduces_cost');
  assert.equal(S.COMP_KINDS.trip_granted.effect, 'increases_cost_per_paying_traveller');

  // The dinner the proposal prints as settled is still being shopped.
  const dinner = suppliers.get('dinner-day-one');
  assert.equal(slotsForSupplier(trip, 'dinner-day-one')[0].slot.state, 'sourcing');
  assert.equal(S.clientWord('sourcing'), 'venue being finalised');
  assert.ok(dinner.candidates.length >= 5);

  // One counterparty covers two itinerary lines.
  assert.ok(suppliers.get('incline-railway').related_supplier_ids.includes('southern-belle'));

  // Attempt history survives a reprint.
  assert.equal(rockCity.attempts.length, 3);
  assert.ok(rockCity.attempts.some(a => a.channel === 'voicemail'));
  assert.ok(rockCity.attempts.some(a => a.channel === 'web_form'));

  // Deadlines that a date change would trip.
  assert.equal(rockCity.terms.final_headcount_due_business_days, 5);
  assert.equal(suppliers.get('incline-railway').terms.balance_due_days, 10);
  assert.equal(suppliers.get('incline-railway').terms.deposit.paid_on, '2026-09-11');
});

test('the known defects are recorded rather than silently fixed', () => {
  const trip = loadTrip(TRIP);
  const warnings = validateTrip(trip).filter(f => f.severity === 'warning');

  // A priced inclusion with no itinerary slot.
  const imax = trip.inclusions.find(i => i.id === 'inc-imax');
  assert.deepEqual(imax.slot_ids, []);
  assert.ok(warnings.some(w => w.check === 'inclusions.coverage' && w.id === 'inclusion:inc-imax'));

  // The inclusions page and the itinerary page print different business names.
  assert.match(trip.inclusions.find(i => i.id === 'inc-climbing').text, /High Street/);
  assert.equal(supplierIndex(trip).get('high-point-climbing').name, 'High Point Climbing and Fitness');

  // The performance venue differs between printings.
  assert.equal(supplierIndex(trip).get('cirque-symphonie').venue_variants.length, 2);

  // The exclusions clause differs between printings.
  assert.ok(trip.exclusions.find(e => e.id === 'exc-scope').observed_variants.length);

  // Both price tables are kept so the drift is inspectable.
  assert.equal(trip.pricing.published['80'].quad, 833);
  assert.equal(trip.pricing.observed_variant.published['80'].quad, 835);
});

test('validation refuses a record that would mislead', () => {
  const badState = copy();
  badState.days[0].slots[3].state = 'booked';
  assert.match(messages(validateTrip(badState)), /Unknown line state "booked"/);

  const noState = copy();
  delete noState.days[0].slots[3].state;
  assert.match(messages(validateTrip(noState)), /supplied line needs a state/);

  const orphanSlot = copy();
  orphanSlot.days[0].slots[3].supplier_id = 'nobody';
  assert.ok(checks(validateTrip(orphanSlot)).includes('days.slots'));

  const orphanInclusion = copy();
  orphanInclusion.inclusions[0].slot_ids = ['not-a-slot'];
  assert.ok(checks(validateTrip(orphanInclusion)).includes('inclusions.coverage'));

  const badComp = copy();
  badComp.suppliers.find(s => s.id === 'rock-city').terms.comp_policy.kind = 'freebies';
  assert.match(messages(validateTrip(badComp)), /Comp policy needs a kind/);

  const unsourcedPrice = copy();
  unsourcedPrice.suppliers.find(s => s.id === 'rock-city').source_ids = [];
  assert.match(messages(validateTrip(unsourcedPrice)), /priced supplier needs the source/);

  const badBasis = copy();
  badBasis.suppliers.find(s => s.id === 'rock-city').terms.unit_price.basis = 'per_vibe';
  assert.match(messages(validateTrip(badBasis)), /known basis/);

  const outOfRange = copy();
  outOfRange.days[0].date = '2027-05-01';
  assert.match(messages(validateTrip(outOfRange)), /outside the trip dates/);

  const badTime = copy();
  badTime.days[0].slots[0].time = '7:00 AM';
  assert.match(messages(validateTrip(badTime)), /24-hour HH:MM/);

  const badTier = copy();
  badTier.pricing.published['110'] = { quad: 1, triple: 1, double: 1, single: 1 };
  assert.match(messages(validateTrip(badTier)), /not a declared headcount tier/);

  const mergedComps = copy();
  mergedComps.trip.headcount.trip_granted_comps = '3 plus vendor comps';
  assert.match(messages(validateTrip(mergedComps)), /kept separate from vendor-earned comps/);

  const noVersion = copy();
  delete noVersion.trip.version;
  assert.match(messages(validateTrip(noVersion)), /carries a version/);
});

test('renderers are discovered dynamically and render deterministically', () => {
  const trip = loadTrip(TRIP);
  const installed = loadRenderers();
  for (const renderer of installed) {
    assert.ok(renderer.name, 'every renderer exports a name');
    assert.equal(typeof renderer.outputs, 'function');
  }
  const first = renderTrip(trip);
  const second = renderTrip(trip);
  assert.deepEqual([...first.files.entries()], [...second.files.entries()], 'rendering twice must produce identical bytes');
  assert.equal(first.byRenderer.size, installed.length);
  assert.equal(main(['validate', '--all']), 0);
});

test('tracked trip outputs are current', () => {
  const result = checkTrip(loadTrip(TRIP));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.stale, [], `stale: run node pipeline/trip/cli.cjs render ${TRIP}`);
});

test('no personal contact detail is carried in the trip record', () => {
  const raw = require('node:fs').readFileSync(
    path.join(__dirname, '..', 'pipeline/trip/trips', `${TRIP}.trip.json`), 'utf8');
  assert.doesNotMatch(raw, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/, 'no direct phone numbers');
  assert.doesNotMatch(raw, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no mailboxes');
  for (const supplier of loadTrip(TRIP).suppliers) {
    for (const contact of supplier.contacts || []) {
      assert.ok(contact.role, 'contacts are recorded by role');
      assert.equal(contact.name, undefined, 'contacts carry no personal name');
    }
  }
});
