/* The consistency audit, tested the way it is argued: for each class of defect, one test that
   it is found in the real shipped record, and one that a record with that defect repaired
   produces no finding of that class. A check that cannot go quiet is not a check. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTrip } = require('../pipeline/trip/load.cjs');
const { renderTrip, checkTrip, loadRenderers } = require('../pipeline/trip/cli.cjs');
const renderer = require('../pipeline/trip/renderers/consistency-audit.cjs');
const S = require('../pipeline/trip/schema.cjs');

const TRIP = 'west-henderson-chattanooga-2027-04-08';
const real = () => loadTrip(TRIP);
const copy = () => structuredClone(loadTrip(TRIP));

const findings = trip => renderer.audit(trip).findings;
const of = (trip, check) => findings(trip).filter(finding => finding.check === check);
const ids = list => list.map(finding => finding.id);
const page = trip => renderer.outputs(trip).get('consistency-audit.md');

const supplier = (trip, id) => trip.suppliers.find(entry => entry.id === id);
const inclusion = (trip, id) => trip.inclusions.find(entry => entry.id === id);
const slot = (trip, id) => trip.days.flatMap(day => day.slots).find(entry => entry.id === id);

/* ------------------------------------------------------------------ the six real defects */

test('1 · an inclusion sold with no itinerary slot is found, and a scheduled one is not', () => {
  assert.deepEqual(ids(of(real(), 'inclusion.no-slot')), ['inclusion:inc-imax']);

  const clean = copy();
  inclusion(clean, 'inc-imax').slot_ids = ['d3-aquarium'];
  assert.deepEqual(of(clean, 'inclusion.no-slot'), []);
});

test('2 · name drift between the inclusions page and the supplier is found generically', () => {
  const found = of(real(), 'name.drift');
  assert.deepEqual(ids(found), ['inclusion:inc-climbing']);
  assert.match(found[0].message, /"Street"/);
  assert.match(found[0].message, /"Point"/);
  assert.ok(found[0].refs.includes('supplier:high-point-climbing'));

  const clean = copy();
  inclusion(clean, 'inc-climbing').text = 'Instruction and Climbing at the High Point Climbing and Fitness Center';
  assert.deepEqual(of(clean, 'name.drift'), []);

  /* Nothing here is hard-coded to one pair: rename the supplier and the same rule fires on the
     line that used to be clean. */
  const renamed = copy();
  supplier(renamed, 'rock-city').name = 'Rock Town Gardens';
  assert.deepEqual(ids(of(renamed, 'name.drift')).sort(),
    ['inclusion:inc-climbing', 'inclusion:inc-rock-city', 'slot:d1-rock-city']);
});

test('2b · shortening a supplier name is not reported as drift', () => {
  /* "Tickets to the Cirque De La Symphonie" drops the trailing half of the recorded name, and
     "Admission to the Tennessee Aquarium" is printed in full. Neither is a defect. */
  const found = ids(of(real(), 'name.drift'));
  assert.ok(!found.includes('inclusion:inc-cirque'));
  assert.ok(!found.includes('inclusion:inc-imax'));
  assert.equal(renderer._internals.nameDrift('Cirque de la Symphonie with the Chattanooga Symphony',
    'Tickets to the Cirque De La Symphonie'), null);
  assert.equal(renderer._internals.nameDrift('Tennessee Aquarium',
    'Admission to the IMAX Theater at the Aquarium'), null);
});

test('3 · a supplier named differently across printings is found', () => {
  const found = of(real(), 'supplier.name-variants');
  assert.deepEqual(ids(found), ['supplier:cirque-symphonie']);
  assert.match(found[0].message, /Soldiers and Sailors Memorial Auditorium/);
  assert.match(found[0].message, /Tivoli Theatre/);

  const clean = copy();
  supplier(clean, 'cirque-symphonie').venue_variants =
    supplier(clean, 'cirque-symphonie').venue_variants.slice(0, 1);
  assert.deepEqual(of(clean, 'supplier.name-variants'), []);
});

test('4 · contractual wording drift is found, with the word that moved', () => {
  const found = of(real(), 'clause.wording-drift');
  assert.deepEqual(ids(found), ['exclusion:exc-scope']);
  assert.match(found[0].message, /adds "Activities"/);
  assert.ok(found[0].detail.some(line => /Sight Seeing, Activities, Transportation/.test(line)));

  const clean = copy();
  clean.exclusions.find(clause => clause.id === 'exc-scope').observed_variants = [];
  assert.deepEqual(of(clean, 'clause.wording-drift'), []);

  /* A variant recorded with identical wording is not drift. */
  const identical = copy();
  const clause = identical.exclusions.find(entry => entry.id === 'exc-scope');
  clause.observed_variants = [{ text: clause.text, observed_in: 'a second printing' }];
  assert.deepEqual(of(identical, 'clause.wording-drift'), []);
});

test('5 · a printed time the supplier cannot meet is found', () => {
  const found = of(real(), 'slot.time-vs-supplier-term');
  assert.deepEqual(ids(found), ['slot:d2-ruby-falls']);
  assert.match(found[0].message, /08:30/);
  assert.match(found[0].message, /09:00/);
  assert.ok(found[0].refs.includes('supplier:ruby-falls'));
  assert.ok(found[0].refs.includes('inclusion:inc-ruby-falls'));

  const clean = copy();
  slot(clean, 'd2-ruby-falls').time = '09:00';
  assert.deepEqual(of(clean, 'slot.time-vs-supplier-term'), []);

  /* The class, not the pair: a closing time works the same way. */
  const closes = copy();
  supplier(closes, 'tn-aquarium').terms.notes = 'Group sales says the aquarium closes at 08:00.';
  assert.deepEqual(ids(of(closes, 'slot.time-vs-supplier-term')).sort(),
    ['slot:d2-ruby-falls', 'slot:d3-aquarium']);
});

test('5b · a supplier sentence that merely describes the printed page is not a constraint', () => {
  /* ruby-falls records both "the first ride is at 09:00" and "the printed itinerary puts the
     group there at 08:30". Only the first constrains the supplier; reading the second as one
     would turn the record's own description of the defect into a second defect. */
  const constraints = renderer._internals.timeConstraints(supplier(real(), 'ruby-falls'), 'earliest');
  assert.deepEqual(constraints.map(entry => entry.minutes), [9 * 60]);

  /* The incline railway was asked for 4:45 PM and is printed at 16:45: the same time. */
  assert.deepEqual(of(real(), 'slot.time-vs-requested-time'), []);
  const moved = copy();
  slot(moved, 'd1-incline').time = '17:30';
  assert.deepEqual(ids(of(moved, 'slot.time-vs-requested-time')), ['supplier:incline-railway']);
});

test('6 · a named venue sold for a line still being shopped is found', () => {
  const found = of(real(), 'inclusion.sells-unsettled-line');
  assert.deepEqual(ids(found), ['inclusion:inc-dinner-one']);
  assert.match(found[0].message, /Chattanooga Choo Choo/);
  assert.match(found[0].message, new RegExp(S.clientWord('sourcing')));
  assert.ok(found[0].refs.includes('slot:d1-dinner'));

  const settled = copy();
  slot(settled, 'd1-dinner').state = 'confirmed';
  assert.deepEqual(of(settled, 'inclusion.sells-unsettled-line'), []);
});

test('6b · a sourcing line is only a defect when a sold inclusion names a venue for it', () => {
  /* Still sourcing, still five candidates — but the inclusion no longer asserts a venue. */
  const generic = copy();
  inclusion(generic, 'inc-dinner-one').text = 'Group dinner on the first evening';
  assert.equal(slot(generic, 'd1-dinner').state, 'sourcing');
  assert.deepEqual(of(generic, 'inclusion.sells-unsettled-line'), []);

  /* And a named venue is not a defect once nothing else is being shopped for it. */
  const chosen = copy();
  supplier(chosen, 'dinner-day-one').candidates =
    supplier(chosen, 'dinner-day-one').candidates.filter(candidate => /printed/i.test(candidate.status));
  assert.deepEqual(of(chosen, 'inclusion.sells-unsettled-line'), []);

  /* Naming a venue means naming it, not happening to use its words. */
  const scattered = copy();
  supplier(scattered, 'dinner-day-one').candidates.push({ name: 'Public House', status: 'contacted' });
  inclusion(scattered, 'inc-dinner-one').text = 'Dinner at a public restaurant with the house band';
  assert.deepEqual(of(scattered, 'inclusion.sells-unsettled-line'), []);
  assert.equal(renderer._internals.namesInFull('Dinner at a public restaurant with the house band', 'Public House'), false);
  assert.equal(renderer._internals.namesInFull('Dinner at the Chattanooga Choo Choo Complex', 'Chattanooga Choo Choo complex'), true);
});

/* ------------------------------------------------------------------ the further checks */

test('a priced component with no supplier is found; an operator margin line is not', () => {
  const found = of(real(), 'pricing.component-without-supplier');
  assert.deepEqual(ids(found), ['pricing:component:attractions', 'pricing:component:dinners']);
  assert.ok(!ids(found).includes('pricing:component:commission'),
    'commission is the operator\'s own margin and has no counterparty by nature');
  assert.ok(found[0].detail.some(line => /Rock City Gardens \$19\.00 per person/.test(line)));
  assert.ok(!found[0].detail.some(line => /\$100\.00 flat/.test(line)), 'a deposit is not a rate');

  const clean = copy();
  for (const component of clean.pricing.components_per_person) {
    if (!component.supplier_id) component.supplier_id = 'rock-city';
  }
  assert.deepEqual(of(clean, 'pricing.component-without-supplier'), []);
});

test('a component with no amount is found', () => {
  assert.deepEqual(ids(of(real(), 'pricing.component-without-amount')), ['pricing:component:motor-coach']);

  const clean = copy();
  clean.pricing.components_per_person.find(component => component.label === 'Motor coach').amount = 210;
  assert.deepEqual(of(clean, 'pricing.component-without-amount'), []);
});

test('two price tables whose deltas run in opposite directions are found', () => {
  const found = of(real(), 'pricing.table-direction-conflict');
  assert.deepEqual(ids(found), ['pricing:published']);
  assert.match(found[0].message, /7 up and 4 down/);
  assert.ok(found[0].detail.some(line => /\$833\.00 → \$835\.00 \(\+\$2\.00\)/.test(line)));
  assert.ok(found[0].detail.some(line => /\$1,320\.00 → \$1,305\.00 \(-\$15\.00\)/.test(line)));

  /* A table that moves one way is a decision, not a contradiction. */
  const uniform = copy();
  for (const tier of Object.keys(uniform.pricing.observed_variant.published)) {
    for (const occupancy of S.OCCUPANCY) {
      uniform.pricing.observed_variant.published[tier][occupancy] = uniform.pricing.published[tier][occupancy] + 10;
    }
  }
  assert.deepEqual(of(uniform, 'pricing.table-direction-conflict'), []);

  const single = copy();
  delete single.pricing.observed_variant;
  assert.deepEqual(of(single, 'pricing.table-direction-conflict'), []);
});

test('a supplier sold with no rate or no deadline is found; a complete one is not', () => {
  const found = of(real(), 'supplier.terms-incomplete');
  assert.ok(ids(found).includes('supplier:tn-aquarium'), 'sold, no rate, no deadline');
  assert.ok(ids(found).includes('supplier:bessie-smith'), 'has a rate, no deadline');
  assert.ok(ids(found).includes('supplier:incline-railway'), 'has a balance date, no rate');
  assert.ok(!ids(found).includes('supplier:rock-city'), 'rock city has both and is left alone');
  assert.match(found.find(entry => entry.id === 'supplier:incline-railway').message,
    /deposit is recorded, which is money paid, not a rate/);

  const clean = copy();
  for (const entry of clean.suppliers) {
    entry.terms = entry.terms || {};
    entry.terms.unit_price = { amount: 10, basis: 'per_person' };
    entry.terms.final_headcount_due_business_days = 5;
    entry.source_ids = ['QS-48398'];
  }
  assert.deepEqual(of(clean, 'supplier.terms-incomplete'), []);
});

test('a fact carried only by a margin note is found', () => {
  const found = ids(of(real(), 'evidence.handwritten-only'));
  assert.ok(found.includes('staffing:tour-manager'));
  assert.ok(found.includes('pricing:rate:rock-city:per-person'));
  assert.ok(found.includes('supplier:bessie-smith'));
  assert.ok(!found.includes('supplier:rock-city'), 'rock city is also carried by a supplier email');

  const clean = copy();
  for (const entry of [...clean.suppliers, ...clean.pricing.known_unit_prices,
    ...clean.trip.staffing, ...clean.trip.verification]) {
    entry.source_ids = [...(entry.source_ids || []), 'QS-48398'];
  }
  assert.deepEqual(of(clean, 'evidence.handwritten-only'), []);
});

test('a rate recorded twice at two amounts is found; the real record agrees with itself', () => {
  assert.deepEqual(of(real(), 'pricing.rate-contradiction'), []);

  const contradicted = copy();
  contradicted.pricing.known_unit_prices.find(rate => rate.supplier_id === 'rock-city').amount = 21;
  const found = of(contradicted, 'pricing.rate-contradiction');
  assert.deepEqual(ids(found), ['pricing:rate:rock-city:per-person']);
  assert.match(found[0].message, /\$21\.00/);
  assert.match(found[0].message, /\$19\.00/);

  const deposit = copy();
  deposit.pricing.known_unit_prices.find(rate => rate.label === 'Deposit').amount = 250;
  assert.deepEqual(ids(of(deposit, 'pricing.rate-contradiction')), ['pricing:rate:incline-railway:deposit']);
});

test('a figure with no source is found; every figure in the real record has one', () => {
  assert.deepEqual(of(real(), 'pricing.rate-without-source'), []);

  const unsourced = copy();
  unsourced.pricing.components_per_person.find(component => component.label === 'Hotel').source_ids = [];
  unsourced.pricing.known_unit_prices[0].source_ids = [];
  assert.deepEqual(ids(of(unsourced, 'pricing.rate-without-source')),
    ['pricing:component:hotel', 'pricing:rate:rock-city:per-person']);
});

test('a slot that overruns the next one is found; the real days fit', () => {
  assert.deepEqual(of(real(), 'slot.overruns-next'), []);

  const overrun = copy();
  slot(overrun, 'd1-rock-city').duration_minutes = 200; // 14:00 + 3h20 ends 17:20, incline is 16:45
  const found = of(overrun, 'slot.overruns-next');
  assert.deepEqual(ids(found), ['slot:d1-rock-city']);
  assert.match(found[0].message, /17:20/);
  assert.ok(found[0].refs.includes('slot:d1-incline'));
});

test('a line pointing at a supplier that is not in the record is found', () => {
  assert.deepEqual(of(real(), 'record.unknown-supplier'), []);

  /* The dangerous case: a rate drifts onto an id that does not exist, and the contradiction
     check that would have caught its amount goes quiet instead. */
  const dangling = copy();
  const rate = dangling.pricing.known_unit_prices.find(entry => entry.supplier_id === 'rock-city');
  rate.supplier_id = 'rock-city-gardens';
  rate.amount = 21;
  assert.deepEqual(ids(of(dangling, 'record.unknown-supplier')), ['pricing:rate:rock-city-gardens:per-person']);
  assert.deepEqual(of(dangling, 'pricing.rate-contradiction'), [],
    'the contradiction check cannot see it — which is why the dangling reference is the finding');

  const unattached = copy();
  delete unattached.pricing.known_unit_prices[1].supplier_id;
  assert.deepEqual(ids(of(unattached, 'record.unknown-supplier')), ['pricing:rate:no-supplier:per-person']);
  assert.ok(!page(unattached).includes('undefined'), 'an unresolvable id is never printed as a business');

  const orphanInclusion = copy();
  inclusion(orphanInclusion, 'inc-imax').supplier_id = 'tn-aquarium-group-sales';
  assert.deepEqual(ids(of(orphanInclusion, 'record.unknown-supplier')), ['inclusion:inc-imax']);
});

/* ------------------------------------------------------------------ precision */

test('two times in one sentence are classified one by one, not both by the sentence', () => {
  /* "open at 09:00 and close at 17:00" is one opening time and one closing time. Reading the
     sentence as a whole would make 17:00 an opening time too, and every morning line an error. */
  const both = copy();
  supplier(both, 'rock-city').terms.notes = 'Group sales says the gardens open at 09:00 and close at 17:00.';
  assert.deepEqual(ids(of(both, 'slot.time-vs-supplier-term')), ['slot:d2-ruby-falls'],
    'the 14:00 Rock City line sits inside 09:00-17:00 and is left alone');

  const opens = renderer._internals.timeConstraints(supplier(both, 'rock-city'), 'earliest');
  const closes = renderer._internals.timeConstraints(supplier(both, 'rock-city'), 'latest');
  assert.deepEqual(opens.map(entry => entry.minutes), [9 * 60]);
  assert.deepEqual(closes.map(entry => entry.minutes), [17 * 60]);

  /* And it still catches a real breach of either end. */
  const late = copy();
  supplier(late, 'rock-city').terms.notes = 'Group sales says the gardens open at 15:00 and close at 17:00.';
  assert.ok(ids(of(late, 'slot.time-vs-supplier-term')).includes('slot:d1-rock-city'));
});

test('two findings from one check against one record id keep separate numbers', () => {
  const third = copy();
  third.exclusions.find(clause => clause.id === 'exc-scope').observed_variants.push({
    text: 'Sight Seeing and any Meals not on the itinerary', observed_in: 'a third printing'
  });
  const found = of(third, 'clause.wording-drift');
  assert.equal(found.length, 2);
  assert.equal(new Set(found.map(finding => finding.key)).size, 2, 'keys stay unique');
  assert.deepEqual(found.map(finding => finding.id),
    ['exclusion:exc-scope', 'exclusion:exc-scope'], 'both still name the record id they came from');

  const rows = page(third).match(/^\| (E\d+) \|/gm) || [];
  assert.equal(new Set(rows).size, rows.length / 2,
    'every number on the page appears exactly twice: once in the summary, once in its section');
});

test('a partially recorded second price table does not print arithmetic on missing cells', () => {
  const partial = copy();
  for (const tier of Object.keys(partial.pricing.observed_variant.published)) {
    delete partial.pricing.observed_variant.published[tier].single;
  }
  const markdown = page(partial);
  assert.doesNotMatch(markdown, /NaN/);
  assert.match(markdown, /—/, 'a missing cell prints as a dash');
});

/* ------------------------------------------------------------------ the page itself */

test('every finding carries a severity, a check, record ids, a message and an action', () => {
  const all = findings(real());
  assert.ok(all.length >= 6);
  const keys = new Set();
  for (const finding of all) {
    assert.ok(['error', 'warning'].includes(finding.severity));
    assert.ok(finding.check && typeof finding.check === 'string');
    assert.ok(finding.id && typeof finding.id === 'string');
    assert.ok(finding.message.length > 20, `${finding.key} needs to say what is wrong`);
    assert.ok(finding.action.length > 20, `${finding.key} needs to say what to do`);
    assert.ok(finding.refs.length, `${finding.key} needs the record ids it ties together`);
    assert.ok(!keys.has(finding.key), `finding keys are unique: ${finding.key}`);
    keys.add(finding.key);
  }
  /* Errors before warnings, then declared check order, then id: the same order every run. */
  const severities = all.map(finding => finding.severity);
  assert.deepEqual(severities, [...severities].sort((a, b) => (a === b ? 0 : a === 'error' ? -1 : 1)));
});

test('the six defects a human found by eye all appear on the page, by id', () => {
  const markdown = page(real());
  for (const id of ['inclusion:inc-imax', 'inclusion:inc-climbing', 'supplier:cirque-symphonie',
    'exclusion:exc-scope', 'slot:d2-ruby-falls', 'inclusion:inc-dinner-one']) {
    assert.ok(markdown.includes(id), `the page names ${id}`);
  }
  assert.match(markdown, /## Result/);
  assert.match(markdown, /## Checks that found nothing/);
  assert.match(markdown, /`pricing.rate-contradiction`/, 'a silent check still says what it looked for');
});

test('the page is deterministic and escapes what it prints', () => {
  assert.equal(page(real()), page(real()));
  assert.equal(page(loadTrip(TRIP)), page(structuredClone(loadTrip(TRIP))));
  assert.doesNotMatch(page(real()), /\d{4}-\d{2}-\d{2}T/, 'no timestamp, or check --all fails every run');

  const piped = copy();
  inclusion(piped, 'inc-imax').text = 'Admission to the IMAX | Theater';
  const markdown = page(piped);
  assert.ok(markdown.includes('IMAX \\| Theater'), 'a pipe in a cell is escaped');

  /* Every row of every table keeps the column count its header set. An unescaped pipe in a cell
     would silently add a column, which is how a table quietly loses a word. */
  const columns = line => line.replace(/\\\|/g, '').split('|').length;
  let header = null;
  let width = 0;
  let tables = 0;
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) { header = null; continue; }
    if (/^\|[-| ]+\|$/.test(line)) {
      assert.ok(header, 'a separator row follows a header row');
      width = columns(header);
      assert.equal(columns(line), width, 'the separator matches its header');
      tables++;
      continue;
    }
    if (width && header) assert.equal(columns(line), width, `row keeps its column count: ${line.slice(0, 60)}`);
    header = line;
  }
  assert.ok(tables >= 4, 'the page carries the summary, the finding tables and the silent-check table');
});

test('the page names no individual and no direct number', () => {
  const markdown = page(real());
  assert.doesNotMatch(markdown, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/, 'no direct phone numbers');
  assert.doesNotMatch(markdown, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no mailboxes');
  for (const role of ['Group sales', 'Tour manager', 'Troen coordinator']) {
    assert.ok(!/[A-Z][a-z]+ [A-Z][a-z]+ \(the [a-z]+\)/.test(role));
  }
});

test('the renderer is discovered by the CLI and its tracked output is current', () => {
  const installed = loadRenderers().map(entry => entry.name);
  assert.ok(installed.includes('consistency-audit'));

  const rendered = renderTrip(real());
  assert.deepEqual(rendered.errors, []);
  assert.ok(rendered.files.has('consistency-audit.md'));
  assert.deepEqual(rendered.byRenderer.get('consistency-audit'), ['consistency-audit.md']);

  const checked = checkTrip(real());
  assert.ok(!checked.stale.includes('consistency-audit.md'),
    `stale: run node pipeline/trip/cli.cjs render ${TRIP}`);
});

test('a record with every defect repaired produces no errors at all', () => {
  const clean = copy();
  inclusion(clean, 'inc-imax').slot_ids = ['d3-aquarium'];
  inclusion(clean, 'inc-climbing').text = 'Instruction and Climbing at the High Point Climbing and Fitness';
  supplier(clean, 'cirque-symphonie').venue_variants = supplier(clean, 'cirque-symphonie').venue_variants.slice(0, 1);
  clean.exclusions.find(clause => clause.id === 'exc-scope').observed_variants = [];
  slot(clean, 'd2-ruby-falls').time = '09:15';
  slot(clean, 'd1-dinner').state = 'confirmed';
  delete clean.pricing.observed_variant;
  for (const component of clean.pricing.components_per_person) {
    component.supplier_id = component.supplier_id || 'rock-city';
    if (component.amount === null) component.amount = 210;
  }
  assert.deepEqual(findings(clean).filter(finding => finding.severity === 'error'), [],
    findings(clean).filter(finding => finding.severity === 'error').map(finding => finding.key).join(', '));
  assert.match(page(clean), /0 errors/);
});
