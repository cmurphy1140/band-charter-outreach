/* The pricing renderer: the price table computed from the record instead of typed by hand.

   What these tests are actually defending:
     - the two comp kinds stay separate and keep their opposite signs;
     - the two inputs the pages do not carry stay labelled derived, and are never filled in with
       an invented number;
     - the arithmetic printed in the document is the arithmetic the model ran. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadTrip } = require('../pipeline/trip/load.cjs');
const { loadRenderers, renderTrip } = require('../pipeline/trip/cli.cjs');
const S = require('../pipeline/trip/schema.cjs');
const pricing = require('../pipeline/trip/renderers/pricing.cjs');

const TRIP = 'west-henderson-chattanooga-2027-04-08';
const M = pricing.model;
const trip = loadTrip(TRIP);
const model = M.buildModel(trip);
const v1 = trip.pricing.published;
const v2 = trip.pricing.observed_variant.published;
const solved = M.solveFrom(model, v1);
const solvedV2 = M.solveFrom(model, v2);
const document = () => pricing.outputs(loadTrip(TRIP)).get('pricing.md');
const near = (actual, expected, tolerance, message) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} is not within ${tolerance} of ${expected}`);

/* ---------- the renderer contract ------------------------------------------------------ */

test('the renderer is discovered by the CLI and produces one named file', () => {
  const installed = loadRenderers().map(renderer => renderer.name);
  assert.ok(installed.includes('pricing'), `pricing not discovered; found ${installed.join(', ')}`);
  const produced = pricing.outputs(trip);
  assert.ok(produced instanceof Map);
  assert.deepEqual([...produced.keys()], ['pricing.md']);
  assert.equal(typeof produced.get('pricing.md'), 'string');
  assert.ok(renderTrip(trip).files.has('pricing.md'));
});

test('rendering is deterministic and reads no clock', () => {
  assert.equal(document(), document());
  assert.equal(renderTrip(loadTrip(TRIP)).files.get('pricing.md'), document());
  const source = fs.readFileSync(path.join(__dirname, '..', 'pipeline/trip/renderers/pricing.cjs'), 'utf8');
  assert.doesNotMatch(source, /Math\.random|Date\.now|new Date\(\s*\)|toLocaleDateString/, 'no clock, no randomness');
  assert.doesNotMatch(source, /require\(['"]node:fs|require\(['"]node:https?/, 'no filesystem or network reads');
});

/* ---------- money ----------------------------------------------------------------------- */

test('rounding is half up, away from zero, and stated', () => {
  assert.equal(M.roundTo(1.005, 2), 1.01, 'a value unrepresentable in binary still rounds up');
  assert.equal(M.roundTo(2.675, 2), 2.68);
  assert.equal(M.roundTo(0.5, 0), 1);
  assert.equal(M.roundTo(-0.5, 0), -1, 'away from zero, not toward positive infinity');
  assert.equal(M.roundTo(-2.675, 2), -2.68);
  assert.equal(M.roundTo(833, 0), 833);
  assert.match(document(), /rounded half up, away from zero/);
});

test('a negative amount prints its sign outside the currency symbol', () => {
  assert.doesNotMatch(document(), /\$-/, 'never $-2.14');
  assert.match(document(), /-\$2\.14/);
});

/* ---------- the hinge: two comp kinds, opposite directions ----------------------------- */

test('vendor-earned comps are the supplier ratio, and they reduce cost', () => {
  assert.equal(S.COMP_KINDS.vendor_earned.effect, 'reduces_cost');
  const at80 = M.vendorEarnedAt(model, 80);
  assert.equal(at80.rows.length, 1);
  const rockCity = at80.rows[0];
  assert.equal(rockCity.name, 'Rock City Gardens');
  assert.equal(rockCity.earned, 8, '80 paid at one per ten');
  assert.equal(rockCity.count, 9, 'eight earned plus the bus driver');
  assert.equal(rockCity.unitPrice, 19);
  assert.equal(at80.total, 171, '9 x $19');
  near(at80.total / 80, 2.1375, 1e-9, 'per paying traveller at 80');

  assert.equal(M.vendorEarnedAt(model, 90).total, 190, '9 earned + driver at 90');
  assert.equal(M.vendorEarnedAt(model, 100).total, 209, '10 earned + driver at 100');

  // It enters the price as a credit: negative, and it shrinks per head as the group grows.
  assert.ok(M.knownPerPayer(model, 80).vendorCredit < 0);
  assert.ok(M.knownPerPayer(model, 100).vendorCredit > M.knownPerPayer(model, 80).vendorCredit);
});

test('trip-granted comps are carried by the payers, and they increase cost', () => {
  assert.equal(S.COMP_KINDS.trip_granted.effect, 'increases_cost_per_paying_traveller');
  assert.equal(model.tripGrantedComps, 3);
  near(model.consumedPerPerson, 398.16, 1e-9, 'hotel + attractions + dinners');
  const at80 = M.tripGrantedAt(model, 80);
  near(at80.total, 1194.48, 1e-9, '3 free places at $398.16');
  near(at80.perPayer, 14.931, 0.001, 'added to every paying traveller at 80');
  assert.ok(M.tripGrantedAt(model, 100).perPayer < at80.perPayer, 'the carry thins out as the group grows');

  // A comp place consumes no commission and no coach seat.
  assert.equal(model.commissionPerPerson, 35);
  assert.ok(!model.consumed.some(component => /commission/i.test(component.label)));
});

test('the two comp kinds move the price in opposite directions and do not net to a discount', () => {
  const parts = M.knownPerPayer(model, 80);
  assert.ok(parts.vendorCredit < 0, 'vendor-earned reduces');
  assert.ok(parts.grantedCarry > 0, 'trip-granted increases');
  near(parts.grantedCarry + parts.vendorCredit, 12.79, 0.01, 'together they ADD to the price at 80');
  const doc = document();
  assert.match(doc, /\*\*\+\$12\.79\*\*/, 'the net is printed');
  assert.match(doc, /reads as a discount\. Here it is not/);
  assert.match(doc, /\*\*add \$12\.79\*\*/, 'the direction word follows the sign');
});

/* ---------- reading the published table ------------------------------------------------- */

test('each published column fits a per-person amount plus a per-group pot', () => {
  const quad = M.fitColumn(model.tiers, M.priceGetter(v1, 'quad'));
  near(quad.perPerson, 483, 1e-9, 'v1 quad A');
  near(quad.perGroup, 28000, 1e-9, 'v1 quad B');
  const free = quad.residuals.find(entry => entry.tier === 90);
  near(free.residual, 0.111, 0.01, 'the middle tier was not used to fit, and lands within a cent-ish');

  const quadV2 = M.fitColumn(model.tiers, M.priceGetter(v2, 'quad'));
  near(quadV2.perPerson, 545, 1e-9, 'v2 quad A');
  near(quadV2.perGroup, 23200, 1e-9, 'v2 quad B');

  // Every column of both printings fits within half a dollar at the unused tier.
  for (const [name, published] of [['v1', v1], ['v2', v2]]) {
    for (const occupancy of S.OCCUPANCY) {
      for (const entry of M.fitColumn(model.tiers, M.priceGetter(published, occupancy)).residuals) {
        near(entry.residual, 0, 0.5, `${name} ${occupancy} at ${entry.tier}`);
      }
    }
  }
});

test('the room differential is derived from the occupancy spread, not invented', () => {
  near(solved.roomRate, 216.7473, 0.001, 'v1 implied room rate per room per night');
  near(solvedV2.roomRate, 208.5714, 0.001, 'v2 implied room rate per room per night');
  assert.equal(solved.roomEstimates.length, 3, 'one estimate per non-base occupancy');
  const rates = solved.roomEstimates.map(entry => entry.impliedRate);
  assert.ok(Math.max(...rates) - Math.min(...rates) < 1, 'three independent estimates agree within a dollar');
  // The supplements stand in the 1:3:9 ratio a three-night room rate predicts.
  const byName = Object.fromEntries(solved.roomEstimates.map(entry => [entry.occupancy, entry.meanSupplement]));
  near(byName.double / byName.triple, 3, 0.05);
  near(byName.single / byName.triple, 9, 0.05);
});

test('the two unknowns are solved from the table, and named as derived', () => {
  near(solved.coachGroupTotal, 26774.52, 0.01, 'derived coach charter total');
  near(solved.unreconciled, 51.74, 0.01, 'derived unreconciled per person');

  // The record still says the coach is unknown. The model must not have written a number into it.
  const coach = trip.pricing.components_per_person.find(component => /coach/i.test(component.label));
  assert.equal(coach.amount, null, 'the record keeps the coach line null');
  assert.ok(model.missing.some(component => component.label === coach.label), 'the model reports it as missing');

  const doc = document();
  assert.match(doc, /\*\*not recorded\*\*/);
  assert.ok(doc.includes('Not legible on the photographed quote screen'), "the record's own reason is carried through");
  assert.match(doc, /DERIVED/);
  assert.match(doc, /This is not an independent check of the published price/);
  assert.match(doc, /derived, not sourced/);
  assert.doesNotMatch(doc, /Motor coach \| \$/, 'the coach line is never printed as a sourced amount');
});

/* ---------- the computed table ---------------------------------------------------------- */

test('the computed table reproduces the first printing within a dollar in every cell', () => {
  const offBy = [];
  for (const tier of model.tiers) {
    for (const occupancy of S.OCCUPANCY) {
      const computed = M.roundTo(M.computedPrice(model, solved, tier, occupancy), 0);
      const delta = computed - v1[String(tier)][occupancy];
      assert.ok(Math.abs(delta) <= 1, `${occupancy}/${tier}: computed ${computed} vs published ${v1[String(tier)][occupancy]}`);
      if (delta !== 0) offBy.push(`${occupancy}/${tier}`);
    }
  }
  // Solved from quad at the two extreme tiers: those two are exact by construction.
  assert.equal(M.roundTo(M.computedPrice(model, solved, 80, 'quad'), 0), 833);
  assert.equal(M.roundTo(M.computedPrice(model, solved, 100, 'quad'), 0), 763);
  // The rest are not free parameters. Two cells sit a dollar out, and it is the published
  // table's own per-cell rounding: it prints a $162 double supplement at 80 and $163 at 90.
  assert.deepEqual(offBy, ['double/80', 'single/80']);
  assert.equal(v1['80'].double - v1['80'].quad, 162);
  assert.equal(v1['90'].double - v1['90'].quad, 163);
});

test('the same model against the second printing shows the four-direction drift', () => {
  const delta = (tier, occupancy) => M.roundTo(M.computedPrice(model, solved, tier, occupancy), 0) - v2[String(tier)][occupancy];
  // Quad is under-priced by the v1 model at every tier; single is over-priced at every tier.
  for (const tier of model.tiers) {
    assert.ok(delta(tier, 'quad') < 0, `quad/${tier}`);
    assert.ok(delta(tier, 'single') > 0, `single/${tier}`);
  }
  // And the drift decomposes into three parameter moves, exact at the base occupancy.
  near(solvedV2.coachGroupTotal - solved.coachGroupTotal, -4800, 0.01, 'the per-group pot fell');
  near(solvedV2.unreconciled - solved.unreconciled, 62, 0.01, 'the per-person amount rose');
  near(solvedV2.roomRate - solved.roomRate, -8.18, 0.01, 'the room rate fell');
  for (const tier of model.tiers) {
    const predicted = (solvedV2.coachGroupTotal - solved.coachGroupTotal) / tier + (solvedV2.unreconciled - solved.unreconciled);
    near(predicted, v2[String(tier)].quad - v1[String(tier)].quad, 0.5, `quad move at ${tier}`);
  }
});

test('a headcount change is one evaluation, and it moves the price the right way', () => {
  for (const occupancy of S.OCCUPANCY) {
    let previous = Infinity;
    for (let payers = 70; payers <= 120; payers += 5) {
      const price = M.computedPrice(model, solved, payers, occupancy);
      assert.ok(price < previous, `${occupancy}: ${payers} payers must cost less per head than ${payers - 5}`);
      previous = price;
    }
  }
  const marginal = M.computedPrice(model, solved, 81, 'quad') - M.computedPrice(model, solved, 80, 'quad');
  near(marginal, -4.30, 0.02, 'one more paying traveller at 80');
  const marginalHigh = M.computedPrice(model, solved, 101, 'quad') - M.computedPrice(model, solved, 100, 'quad');
  assert.ok(Math.abs(marginalHigh) < Math.abs(marginal), 'the pot thins more slowly in a larger group');
  assert.match(document(), /final number of paying participants/, 'the operator\'s own term is quoted');
});

test('occupancy only ever enters through the room differential', () => {
  assert.equal(M.roomDifferential(model, solved, 'quad'), 0, 'the base occupancy carries no differential');
  for (const tier of model.tiers) {
    for (const occupancy of S.OCCUPANCY) {
      const gap = M.computedPrice(model, solved, tier, occupancy) - M.computedPrice(model, solved, tier, 'quad');
      near(gap, M.roomDifferential(model, solved, occupancy), 1e-9, `${occupancy}/${tier}`);
    }
  }
  // Narrower rooms cost more, in the order the schema lists them.
  const prices = S.OCCUPANCY.map(occupancy => M.computedPrice(model, solved, 80, occupancy));
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b), 'quad < triple < double < single');
});

test('nights and tiers come from the record, not from a constant', () => {
  assert.equal(M.nightsOf(trip), 3, 'April 8 to April 11');
  assert.deepEqual(model.tiers, [80, 90, 100]);
  assert.equal(model.payingMinimum, 80);
  assert.equal(model.baseOccupancy, 'quad');
  const shorter = structuredClone(trip);
  shorter.trip.end_date = '2027-04-10';
  assert.equal(M.nightsOf(shorter), 2);
  const shorterModel = M.buildModel(shorter);
  assert.equal(shorterModel.nights, 2);
  assert.notEqual(
    M.roomDifferential(shorterModel, solved, 'single'),
    M.roomDifferential(model, solved, 'single'),
    'a shorter stay really does change the room differential');
});

test('a deposit is cash flow, not a cost line', () => {
  const deposit = trip.pricing.known_unit_prices.find(entry => /deposit/i.test(entry.label || ''));
  assert.ok(deposit, 'the record carries the Incline deposit');
  assert.ok(!model.perGroupFees.some(fee => /deposit/i.test(fee.label)), 'it is kept out of the per-group pot');
  assert.equal(model.perGroupTotal, 50, 'only the tour-guide fee is a per-group cost');
});

/* ---------- a record the model cannot read ---------------------------------------------- */

test('a cost line that is not a usable number is reported missing, never dropped', () => {
  // The dangerous case is silent: a dropped component leaves the solver to absorb it into the
  // unreconciled residual, which the document then presents as unexplained by any line.
  for (const bad of ['183.0', undefined, NaN, null]) {
    const broken = structuredClone(trip);
    broken.pricing.components_per_person.find(component => /attraction/i.test(component.label)).amount = bad;
    const brokenModel = M.buildModel(broken);
    assert.ok(brokenModel.missing.some(component => /attraction/i.test(component.label)),
      `${JSON.stringify(bad)} must land in "missing"`);
    assert.ok(!brokenModel.consumed.some(component => /attraction/i.test(component.label)),
      `${JSON.stringify(bad)} must not be counted as a cost`);
    assert.equal(
      brokenModel.consumed.length + brokenModel.commissionLines.length + brokenModel.missing.length,
      broken.pricing.components_per_person.length,
      'every component lands in exactly one bucket');
    const doc = pricing.outputs(broken).get('pricing.md');
    assert.ok(/\*\*not recorded\*\*|\*\*unusable value/.test(doc), 'and the document says so');
  }
});

test('an incomplete second printing is reported, not crashed on or silently compared', () => {
  const broken = structuredClone(trip);
  delete broken.pricing.observed_variant.published['90'];
  let doc;
  assert.doesNotThrow(() => { doc = pricing.outputs(broken).get('pricing.md'); });
  assert.match(doc, /its table is incomplete/);
  assert.match(doc, /No row for 90 paying travellers/);
  assert.ok(!doc.includes('## 8.'), 'no drift section is built on a hole');
  assert.ok(doc.includes('## 6. The computed table'), 'the first printing is still computed');

  const holed = structuredClone(trip);
  delete holed.pricing.published['90'].triple;
  let refusal;
  assert.doesNotThrow(() => { refusal = pricing.outputs(holed).get('pricing.md'); });
  assert.match(refusal, /No triple price at 90 paying travellers/);
  assert.match(refusal, /No cell is filled in by inference/);
});

test('one headcount tier cannot separate a per-person amount from a per-group one', () => {
  const single = structuredClone(trip);
  single.trip.headcount.tiers = [80];
  single.pricing.published = { 80: trip.pricing.published['80'] };
  delete single.pricing.observed_variant;
  let doc;
  assert.doesNotThrow(() => { doc = pricing.outputs(single).get('pricing.md'); });
  assert.match(doc, /two parts cannot be separated from one observation/);
  assert.ok(!doc.includes('DERIVED'), 'nothing is derived from a single observation');
});

/* ---------- the document ---------------------------------------------------------------- */

test('every Markdown table is well formed and every cell is escaped', () => {
  const doc = document();
  assert.equal(M.cell('a | b'), 'a \\| b', 'a pipe inside a cell is escaped');
  assert.equal(M.cell('two\nlines'), 'two lines');

  const rows = [];
  let inFence = false;
  for (const line of doc.split('\n')) {
    if (line.startsWith('```')) { inFence = !inFence; rows.push(null); continue; }
    if (inFence) continue;
    rows.push(line.startsWith('|') ? line : null);
  }
  const blocks = [];
  let current = [];
  for (const line of rows) {
    if (line === null) { if (current.length) blocks.push(current); current = []; continue; }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  assert.ok(blocks.length >= 10, `expected the working to be shown as tables, found ${blocks.length}`);
  for (const block of blocks) {
    const widths = block.map(line => line.replace(/\\\|/g, ' ').split('|').length);
    assert.ok(block.length >= 3, `a table needs a header, a separator and a row:\n${block.join('\n')}`);
    assert.match(block[1], /^\|(-{3}\|)+$/, `missing separator row:\n${block.slice(0, 2).join('\n')}`);
    assert.equal(new Set(widths).size, 1, `ragged table:\n${block.join('\n')}`);
  }
});

test('the document states its unknowns instead of papering over them', () => {
  const doc = document();
  for (const phrase of [
    'not recorded on any supplied page',
    'illegible on the photographed quote screen',
    'the room differential was never published',
    'What is still missing',
    'cannot be decomposed',
    'Vendor-earned comp',
    'Trip-granted comp'
  ]) {
    assert.ok(doc.includes(phrase), `the document must say: ${phrase}`);
  }
  assert.doesNotMatch(doc, /\bbooked\b/i, 'a priced line is not a booked line');
});

test('privacy: business names stay, individuals and direct numbers do not', () => {
  const doc = document();
  assert.doesNotMatch(doc, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/, 'no direct phone numbers');
  assert.doesNotMatch(doc, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no mailboxes');
  assert.ok(doc.includes('Rock City Gardens'), 'business names are kept');
  assert.ok(doc.includes('Troen') || doc.includes('West Henderson'), 'the organisations are named');
});

test('the tracked output on disk matches what the renderer produces', () => {
  const target = path.join(__dirname, '..', 'pipeline/trip/out', TRIP, 'pricing.md');
  assert.ok(fs.existsSync(target), `missing: run node pipeline/trip/cli.cjs render ${TRIP}`);
  assert.equal(fs.readFileSync(target, 'utf8'), document(), `stale: run node pipeline/trip/cli.cjs render ${TRIP}`);
});
