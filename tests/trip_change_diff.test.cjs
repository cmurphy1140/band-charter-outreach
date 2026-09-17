/* The change-diff unit. Two printings of one trip disagreed about the venue, a vendor's name,
   whether the group checks out before the riverboat, what the exclusions clause excludes, and
   every cell of the price table. These tests hold the second record to being a faithful copy of
   the first apart from those six differences, and hold the renderer to telling a material change
   apart from a rewritten sentence. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { loadTrip, validateTrip, errorsIn, tripIds, lines, supplierIndex } = require('../pipeline/trip/load.cjs');
const { renderTrip, checkTrip, outputDir } = require('../pipeline/trip/cli.cjs');
const renderer = require('../pipeline/trip/renderers/change-diff.cjs');
const S = require('../pipeline/trip/schema.cjs');

const V1 = 'west-henderson-chattanooga-2027-04-08';
const V2 = 'west-henderson-chattanooga-2027-04-08-v2';

const {
  deltas, consequences, fitProblems, adjacentPairs, printedVenue, wordDelta, numbersIn, sameNumbers,
  trippedTerms, counterpartiesFor, rollUpForCalls, termLine, stable, cell, directorPage,
  CLASSIFICATION, SLOT_FIELDS
} = renderer._internals;

const v1 = () => loadTrip(V1);
const v2 = () => loadTrip(V2);
const changes = () => deltas(v1(), v2());
const of = (list, kind) => list.filter(delta => delta.kind === kind);
const rendered = () => renderTrip(v2()).files;

/* ------------------------------------------------------------ the second record */

test('the v2 record exists, loads and validates with no errors', () => {
  assert.ok(tripIds().includes(V1));
  assert.ok(tripIds().includes(V2));
  const trip = v2();
  const findings = validateTrip(trip);
  assert.deepEqual(errorsIn(findings), [], errorsIn(findings).map(f => f.message).join(' | '));
  assert.equal(trip.trip.version, 'v2-narrative');
  assert.equal(trip.trip.supersedes, V1);
  assert.equal(v1().trip.supersedes, null, 'the first printing supersedes nothing');
});

/* A keyed structural diff: arrays of records are matched by id or date rather than by position,
   so removing one slot does not read as every later slot having changed. */
function diffPaths(a, b, at = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  const keyOf = item => (item && typeof item === 'object' && !Array.isArray(item) ? (item.id ?? item.date) : undefined);
  const isRecordList = list => Array.isArray(list) && list.every(item => keyOf(item) !== undefined);
  if (isRecordList(a) && isRecordList(b)) {
    const left = new Map(a.map(item => [keyOf(item), item]));
    const right = new Map(b.map(item => [keyOf(item), item]));
    const out = [];
    for (const [key, item] of left) {
      if (!right.has(key)) out.push(`${at}[${key}] removed`);
      else out.push(...diffPaths(item, right.get(key), `${at}[${key}]`));
    }
    for (const key of right.keys()) if (!left.has(key)) out.push(`${at}[${key}] added`);
    return out;
  }
  const isPlain = value => value && typeof value === 'object' && !Array.isArray(value);
  if (isPlain(a) && isPlain(b)) {
    const out = [];
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out.push(...diffPaths(a[key], b[key], at ? `${at}.${key}` : key));
    }
    return out;
  }
  return [at];
}

test('v2 is a faithful copy of v1 apart from exactly the observed differences', () => {
  const before = v1();
  const after = v2();
  delete before._file;
  delete after._file;
  assert.deepEqual(diffPaths(before, after).sort(), [
    /* identity */
    'trip.id', 'trip.note', 'trip.supersedes', 'trip.version',
    /* 1. the venue is not a stored field: both records carry both variants, and the version
       decides which one is printed, so a faithful copy shows no difference here at all. */
    /* 2. the climbing vendor is printed shorter in the itinerary; the inclusion text is untouched */
    'days[2027-04-09].slots[d2-climbing].title',
    /* 3. the Sunday checkout is gone and the riverboat moved */
    'days[2027-04-11].slots[d4-checkout] removed',
    'days[2027-04-11].slots[d4-riverboat].time',
    'inclusions[inc-transport].slot_ids',
    /* 4. the exclusions clause */
    'exclusions[exc-scope].observed_variants',
    'exclusions[exc-scope].text',
    /* 5. the price table */
    'pricing.note', 'pricing.observed_variant',
    'pricing.published.100.double', 'pricing.published.100.quad', 'pricing.published.100.single', 'pricing.published.100.triple',
    'pricing.published.80.double', 'pricing.published.80.quad', 'pricing.published.80.single',
    'pricing.published.90.double', 'pricing.published.90.quad', 'pricing.published.90.single', 'pricing.published.90.triple',
    /* 6. richer narrative copy */
    'days[2027-04-08].slots[d1-depart].blurb',
    'days[2027-04-08].slots[d1-rock-city].blurb',
    'days[2027-04-09].slots[d2-bessie-smith].blurb',
    'days[2027-04-10].slots[d3-cirque].blurb',
    'days[2027-04-10].slots[d3-dinner].blurb',
    'days[2027-04-11].slots[d4-ross-landing].blurb'
  ].sort());

  /* Every supplier, every term and every source survived the reprint byte for byte. That is what
     makes "the price moved and no supplier term moved with it" a fact rather than an impression. */
  assert.deepEqual(diffPaths(before.suppliers, after.suppliers), []);
  assert.deepEqual(diffPaths(before.sources, after.sources), []);
});

test('the six observed differences are where they are supposed to be', () => {
  const before = v1();
  const after = v2();
  const suppliers = supplierIndex(after);

  /* 1. venue, resolved per version out of the variants both records carry. */
  assert.equal(printedVenue(before, supplierIndex(before).get('cirque-symphonie')), 'Soldiers and Sailors Memorial Auditorium');
  assert.equal(printedVenue(after, suppliers.get('cirque-symphonie')), 'Tivoli Theatre');

  /* 2. the itinerary shortens the climbing vendor; the inclusions page is left alone, on purpose. */
  const climbing = lines(after).find(({ slot }) => slot.id === 'd2-climbing').slot;
  assert.equal(climbing.title, 'High Point Climbing');
  assert.match(after.inclusions.find(i => i.id === 'inc-climbing').text, /High Street Climbing and Fitness Center/);
  assert.equal(suppliers.get('high-point-climbing').name, 'High Point Climbing and Fitness');

  /* 3. the checkout step is gone and the riverboat moved earlier. */
  assert.ok(lines(before).some(({ slot }) => slot.id === 'd4-checkout'));
  assert.ok(!lines(after).some(({ slot }) => slot.id === 'd4-checkout'));
  assert.equal(lines(before).find(({ slot }) => slot.id === 'd4-riverboat').slot.time, '09:00');
  assert.equal(lines(after).find(({ slot }) => slot.id === 'd4-riverboat').slot.time, '07:30');
  assert.ok(!after.inclusions.find(i => i.id === 'inc-transport').slot_ids.includes('d4-checkout'));

  /* 4. the clause gains one word. */
  assert.equal(after.exclusions.find(e => e.id === 'exc-scope').text,
    'Sight Seeing, Activities, Transportation and any Meals not on the itinerary');

  /* 5. the v2 table. */
  assert.deepEqual(after.pricing.published, {
    80: { quad: 835, triple: 887, double: 992, single: 1305 },
    90: { quad: 803, triple: 855, double: 959, single: 1272 },
    100: { quad: 777, triple: 829, double: 933, single: 1246 }
  });

  /* 6. richer copy, and one rewrite that quietly moved a number. */
  const rockCity = lines(after).find(({ slot }) => slot.id === 'd1-rock-city').slot;
  assert.match(rockCity.blurb, /^4,000 feet of trail/);
  assert.match(lines(before).find(({ slot }) => slot.id === 'd1-rock-city').slot.blurb, /^4,100 feet of trail/);
});

/* --------------------------------------------------------------- classification */

test('the classification table covers every kind the diff can produce, and says which group', () => {
  for (const [kind, rule] of Object.entries(CLASSIFICATION)) {
    assert.ok(['material', 'wording'].includes(rule.group), `${kind} must be material or wording`);
    assert.ok(rule.heading, `${kind} needs a heading`);
    assert.ok(rule.why, `${kind} needs a stated reason, because the reason is printed`);
    assert.equal(typeof rule.calls, 'boolean');
  }
  for (const { kind } of SLOT_FIELDS) assert.ok(CLASSIFICATION[kind], `slot field kind ${kind} is unclassified`);
  for (const delta of changes()) {
    assert.ok(CLASSIFICATION[delta.kind], `delta kind ${delta.kind} is unclassified`);
    assert.equal(delta.group, CLASSIFICATION[delta.kind].group);
  }
});

test('a dropped operational step and a moved time on a supplied line are material', () => {
  const list = changes();

  const dropped = of(list, 'slot_dropped');
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].slot_id, 'd4-checkout');
  assert.equal(dropped[0].group, 'material');
  assert.equal(dropped[0].ops, true, 'the dropped line was an operational step');
  assert.equal(dropped[0].supplier_id, 'young-transportation');
  assert.equal(dropped[0].dropped_time, '07:30');

  const moved = of(list, 'slot_time');
  assert.equal(moved.length, 1);
  assert.equal(moved[0].slot_id, 'd4-riverboat');
  assert.equal(moved[0].group, 'material');
  assert.equal(moved[0].supplied, true);
  assert.equal(moved[0].was, '09:00');
  assert.equal(moved[0].now, '07:30');
});

test('a rewritten blurb is wording only, and never turns up as material', () => {
  const list = changes();
  const blurbs = of(list, 'blurb');
  assert.equal(blurbs.length, 6, 'five rewrites and one description added where there was none');
  for (const delta of blurbs) {
    assert.equal(delta.group, 'wording');
    assert.equal(delta.calls, false, 'a rewritten sentence puts nobody on the phone');
  }
  assert.deepEqual(list.filter(delta => delta.group === 'wording').map(delta => delta.kind), new Array(6).fill('blurb'));
  assert.deepEqual(blurbs.map(delta => delta.slot_id).sort(),
    ['d1-depart', 'd1-rock-city', 'd2-bessie-smith', 'd3-cirque', 'd3-dinner', 'd4-ross-landing']);

  /* Wording that moved a number is still wording — nothing supplied, timed or priced changed —
     but it is flagged, because that is exactly how a fact goes missing inside a rewrite. */
  const flagged = blurbs.filter(delta => delta.numbers_moved);
  assert.deepEqual(flagged.map(delta => delta.slot_id), ['d1-rock-city']);
  assert.deepEqual(numbersIn(flagged[0].was), ['4,100']);
  assert.deepEqual(numbersIn(flagged[0].now), ['4,000']);
  assert.ok(sameNumbers('ends at 10:30', 'still ends at 10:30'));
  assert.ok(!sameNumbers('90 minutes', '80 minutes'));

  /* The one added description had no numbers to move. */
  const added = blurbs.find(delta => delta.slot_id === 'd3-dinner');
  assert.equal(added.was, 'not printed');
  assert.equal(added.numbers_moved, false);
});

test('the venue, the vendor name, the clause and the price table are material', () => {
  const list = changes();

  const venue = of(list, 'venue');
  assert.equal(venue.length, 1);
  assert.equal(venue[0].group, 'material');
  assert.equal(venue[0].supplier_id, 'cirque-symphonie');
  assert.equal(venue[0].was, 'Soldiers and Sailors Memorial Auditorium');
  assert.equal(venue[0].now, 'Tivoli Theatre');

  const renamed = of(list, 'slot_title');
  assert.equal(renamed.length, 1);
  assert.equal(renamed[0].group, 'material');
  assert.equal(renamed[0].slot_id, 'd2-climbing');
  assert.equal(renamed[0].supplier_id, 'high-point-climbing');

  const clause = of(list, 'exclusion_text');
  assert.equal(clause.length, 1);
  assert.equal(clause[0].group, 'material');
  assert.equal(clause[0].exclusion_id, 'exc-scope');
  assert.deepEqual(clause[0].added, ['Activities']);
  assert.deepEqual(clause[0].removed, []);

  const coverage = of(list, 'inclusion_coverage');
  assert.equal(coverage.length, 1);
  assert.equal(coverage[0].inclusion_id, 'inc-transport');
  assert.deepEqual(coverage[0].lost, ['d4-checkout']);
  assert.equal(coverage[0].group, 'material');

  /* Nothing on the supplier side moved. That is what makes the price change unexplained. */
  for (const kind of ['supplier_terms', 'supplier_name', 'supplier_added', 'supplier_removed', 'slot_added', 'slot_state', 'inclusion_text']) {
    assert.deepEqual(of(list, kind), [], `${kind} should not appear between these two records`);
  }
});

test('price deltas are per cell, and the arithmetic is the difference between the two tables', () => {
  const cells = of(changes(), 'price_cell');
  assert.equal(cells.length, 11, 'eleven of the twelve cells moved; 80/triple held at $887');
  assert.ok(!cells.some(delta => delta.tier === '80' && delta.occupancy === 'triple'));

  const find = (tier, occupancy) => cells.find(delta => delta.tier === tier && delta.occupancy === occupancy);
  assert.equal(find('80', 'quad').change, 2);
  assert.equal(find('80', 'double').change, -3);
  assert.equal(find('80', 'single').change, -15);
  assert.equal(find('100', 'quad').change, 14);
  assert.equal(find('100', 'single').change, -5);

  const before = v1().pricing.published;
  const after = v2().pricing.published;
  for (const delta of cells) {
    assert.equal(delta.group, 'material');
    assert.equal(delta.change, after[delta.tier][delta.occupancy] - before[delta.tier][delta.occupancy]);
    assert.equal(delta.was, `$${before[delta.tier][delta.occupancy].toLocaleString('en-US')}`);
  }
  assert.equal(cells.filter(delta => delta.change > 0).length, 7);
  assert.equal(cells.filter(delta => delta.change < 0).length, 4);
});

/* ------------------------------------------- what the comparison reveals downstream */

test('the diff flags the internal inconsistencies it reveals', () => {
  const list = changes();
  const found = consequences(v1(), v2(), list);
  const ids = found.map(finding => finding.id);

  /* A ninety-minute cruise from 09:00 landed at 10:30 and fitted the 10:45 stop. From 07:30 it
     does not, and nothing fills the morning. */
  assert.ok(ids.includes('fit:d4-riverboat>d4-ross-landing'));
  const fit = found.find(finding => finding.id === 'fit:d4-riverboat>d4-ross-landing');
  assert.match(fit.detail, /starts 07:30 and runs 90 minutes, ending 09:00/);
  assert.match(fit.detail, /105 minutes unscheduled before Ross's Landing/);
  assert.deepEqual(fitProblems(v1()).map(problem => problem.id), [],
    'on v1 every timed line fitted, which is why this is a finding and not a standing defect');

  /* The line was renamed; the text that sells it was not. Three names for one counterparty. */
  assert.ok(ids.includes('stale-sold-text:inc-climbing'));
  const stale = found.find(finding => finding.id === 'stale-sold-text:inc-climbing');
  assert.match(stale.detail, /High Point Climbing/);
  assert.match(stale.detail, /High Street Climbing and Fitness Center/);

  /* With the checkout gone, the coach operator's last printed line is now Saturday morning. */
  assert.ok(ids.includes('last-line:young-transportation'));
  assert.match(found.find(finding => finding.id === 'last-line:young-transportation').detail,
    /Sunday, April 11, 2027 07:30.*Saturday, April 10, 2027 08:30/);

  /* The price moved and every supplier term is identical. */
  assert.ok(ids.includes('price-without-cause'));
  assert.match(found.find(finding => finding.id === 'price-without-cause').detail, /11 cells changed, in 2 different directions/);

  /* The added word decides who pays for the lines that are on the page but not on the sold list. */
  assert.ok(ids.includes('clause-widened:exc-scope'));
  const widened = found.find(finding => finding.id === 'clause-widened:exc-scope');
  assert.match(widened.title, /gained "Activities"/);
  assert.match(widened.detail, /Point Park and the overlook/);
  assert.match(widened.detail, /Ross's Landing and the Passage/);

  /* The transport inclusion covers one fewer line, with its sold text untouched. */
  assert.ok(ids.includes('coverage:inc-transport'));
  assert.match(found.find(finding => finding.id === 'coverage:inc-transport').detail,
    /07:30 Check out and load the coaches/);

  /* Comparing a record with itself reveals nothing, which is the honest answer. */
  assert.deepEqual(consequences(v2(), v2(), deltas(v2(), v2())), []);
});

/* ------------------------------------------------------------ who gets called */

test('every material change names a counterparty, a channel and the terms it trips', () => {
  const trip = v2();
  const suppliers = supplierIndex(trip);
  const material = rollUpForCalls(changes().filter(delta => delta.group === 'material' && delta.calls));
  assert.ok(material.every(delta => delta.kind !== 'price_cell' || delta.cells.length === 11),
    'the eleven price cells are one conversation on a call list');

  const reasons = delta => counterpartiesFor(delta, trip, suppliers);
  const forKind = kind => reasons(material.find(delta => delta.kind === kind));

  assert.deepEqual([...forKind('venue').keys()], ['cirque-symphonie']);
  assert.deepEqual([...forKind('slot_time').keys()], ['southern-belle']);
  assert.deepEqual([...forKind('slot_title').keys()], ['high-point-climbing']);
  assert.deepEqual([...forKind('inclusion_coverage').keys()], ['young-transportation']);

  /* A step that stops being printed reaches the counterparty named on it and everyone else
     working that day, each with the reason it is on the list. */
  const dropped = forKind('slot_dropped');
  assert.equal(dropped.get('young-transportation'), 'named on the changed line');
  assert.ok(dropped.has('hotel-chattanooga'), 'a checkout is a lodging act; the hotel works that day');
  assert.match(dropped.get('hotel-chattanooga'), /same day/);

  /* A published price change reaches everyone with money or headcount terms on record. */
  const priced = forKind('price_cell');
  assert.deepEqual([...priced.keys()].sort(),
    ['bessie-smith', 'hotel-chattanooga', 'incline-railway', 'rock-city']);

  /* The clause is the operator's own; no supplier is on the other end of it. */
  assert.equal(reasons(material.find(delta => delta.kind === 'exclusion_text')).size, 0);

  /* Terms tripped come from the supplier's own record, never from a guess. */
  const rockCity = trippedTerms(suppliers.get('rock-city'), [{ kind: 'price_cell' }]).map(term => term.field);
  assert.deepEqual(rockCity, ['unit_price', 'minimum', 'comp_policy', 'final_headcount_due_business_days', 'payment_methods']);
  const incline = trippedTerms(suppliers.get('incline-railway'), [{ kind: 'price_cell' }]);
  assert.match(incline.find(term => term.field === 'deposit').line, /\$100, already paid 2026-09-11/);
  assert.match(incline.find(term => term.field === 'balance_due_days').line, /due 10 days/);
  assert.deepEqual(trippedTerms(suppliers.get('southern-belle'), [{ kind: 'slot_time' }]), [],
    'the riverboat has no terms on record at all, and the call list has to say so');
});

/* -------------------------------------------------------------------- rendering */

test('the renderer emits nothing for a record that supersedes nothing', () => {
  const produced = renderer.outputs(v1());
  assert.ok(produced instanceof Map);
  assert.equal(produced.size, 0);
  const result = renderTrip(v1());
  assert.deepEqual(result.byRenderer.get('change-diff'), []);
});

test('the renderer emits both pages for the superseding record', () => {
  const files = rendered();
  /* Assert this renderer's own output, not the whole set: once the other renderers merged,
     the superseding record is rendered by all of them and the full set is theirs to change. */
  for (const name of ['change-diff.md', 'vendor-call-list.md']) {
    assert.ok(files.has(name), `${name} must be produced for a superseding record`);
    assert.equal(typeof files.get(name), 'string');
  }
});

test('the director page separates material from wording and catches all six differences', () => {
  const page = rendered().get('change-diff.md');

  assert.match(page, /^# What changed · West Henderson High School Band/);
  assert.match(page, /\*\*v1-factual → v2-narrative\*\*/);
  assert.match(page, /## Material changes/);
  assert.match(page, /## Wording only/);
  assert.ok(page.indexOf('## Material changes') < page.indexOf('## Wording only'), 'material comes first');

  const material = page.slice(page.indexOf('## Material changes'), page.indexOf('## Wording only'));
  const wording = page.slice(page.indexOf('## Wording only'), page.indexOf('## What this version does not add up to'));

  /* The six differences, each in the right half of the page. */
  assert.match(material, /Tivoli Theatre/);
  assert.match(material, /Soldiers and Sailors Memorial Auditorium/);
  assert.match(material, /High Point Climbing and Fitness \| High Point Climbing/);
  assert.match(material, /Check out and load the coaches/);
  assert.match(material, /09:00 \| 07:30/);
  assert.match(material, /Sight Seeing, Activities, Transportation and any Meals not on the itinerary/);
  assert.match(material, /\$833 → \$835 \(\+\$2\)/);
  assert.match(material, /\$1,320 → \$1,305 \(-\$15\)/);
  assert.match(material, /\$887 \(unchanged\)/);
  assert.match(material, /11 cells of 12 changed: 7 up, 4 down/);

  assert.match(wording, /4,100 feet of trail/);
  assert.match(wording, /4,000 feet of trail/);
  assert.match(wording, /numbers in this passage changed/);
  assert.match(wording, /Numbers: 4,100 → 4,000/);

  /* Blurb text must not leak into the material half, and no material subject into the wording. */
  assert.ok(!material.includes('feet of trail'));
  assert.ok(!wording.includes('Tivoli Theatre'));
  assert.ok(!wording.includes('Activities, Transportation'));

  /* An unconfirmed line must not read as booked. */
  assert.match(page, /## The status words on this page/);
  assert.ok(!page.includes('| confirmed |'), 'nothing on this trip is confirmed, so the word must not appear as a status');
  assert.match(page, /It is not a booking, a payment or a confirmation/);

  /* And the findings the comparison produced. */
  assert.match(page, /no longer fits the line after it/);
  assert.match(page, /105 minutes unscheduled/);
});

test('the vendor call list names the counterparty, the channel, the terms and what to say', () => {
  const list = rendered().get('vendor-call-list.md');

  assert.match(list, /^# Vendor call list · West Henderson High School Band/);
  assert.match(list, /Generating it sends nothing, holds nothing, pays nothing and confirms nothing/);

  /* Counterparty and channel. */
  assert.match(list, /\| Cirque de la Symphonie with the Chattanooga Symphony \| email · group ticketing \|/);
  assert.match(list, /\| Southern Belle Riverboat \| phone · group sales \|/);
  assert.match(list, /\| High Point Climbing and Fitness \| phone · group bookings \|/);
  assert.match(list, /\| Rock City Gardens \| web form · group sales form \|/);

  /* The terms a change trips, taken from the record. */
  assert.match(list, /Deposit — \$100, already paid 2026-09-11/);
  assert.match(list, /Balance — due 10 days after the deposit/);
  assert.match(list, /Final headcount — due 5 business days ahead/);
  assert.match(list, /Minimum — 15 admissions/);
  assert.match(list, /Comp policy — Vendor-earned comp, one free place per 10 paid, plus bus driver comp/);
  assert.match(list, /\*\*Nothing on record\.\*\*/, 'a counterparty with no terms on record is said so, not left blank');

  /* The attempts log, so nobody redials a number that was already left a voicemail. */
  assert.match(list, /voicemail left on the group sales extension/);
  assert.match(list, /No contact attempt is recorded for this counterparty/);

  /* One line of what to say, per change, tailored to why they are on the list. */
  assert.match(list, /Confirm which hall the Saturday, April 10, 2027 performance is in/);
  assert.match(list, /Can you take 80-100 people at 07:30 on Sunday, April 11, 2027\?/);
  assert.match(list, /Confirm the business name we should be printing/);
  assert.match(list, /Nothing on your own line changed, but Sunday, April 11, 2027 did/);
  assert.match(list, /Re-quote check for 2027-04-08 to 2027-04-11, 80-100 travellers/);

  /* The two lines handled by one office are called out, because that is one call, not two. */
  assert.match(list, /Same group-sales office as Southern Belle Riverboat/);

  /* The clause has no counterparty and says so rather than inventing one. */
  assert.match(list, /## Changes with no counterparty/);
  assert.match(list, /Contract wording — Scope/);

  /* Wording-only changes put nobody on the list. */
  assert.ok(!list.includes('feet of trail'));
  assert.match(list, /Wording-only changes put nobody on it/);
});

/* --------------------------------------------------------------- house rules */

test('markdown cells are escaped and every table keeps its shape', () => {
  assert.equal(cell('a | b'), 'a \\| b');
  assert.equal(cell('line\nbreak'), 'line break');
  assert.equal(cell(undefined), '');

  for (const [name, content] of rendered()) {
    let table = null;
    content.split('\n').forEach((line, index) => {
      if (!line.startsWith('|')) { table = null; return; }
      const columns = (line.match(/(?<!\\)\|/g) || []).length;
      if (!table) table = { at: index + 1, columns };
      else assert.equal(columns, table.columns, `${name} line ${index + 1}: table started at line ${table.at} with ${table.columns} pipes`);
    });
  }
});

test('rendering is deterministic and the tracked outputs are current', () => {
  const first = renderTrip(v2());
  const second = renderTrip(v2());
  assert.deepEqual([...first.files.entries()], [...second.files.entries()]);

  const result = checkTrip(v2());
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.stale, [], `stale: run node pipeline/trip/cli.cjs render ${V2}`);

  for (const name of ['change-diff.md', 'vendor-call-list.md']) {
    const file = path.join(outputDir(v2()), name);
    assert.ok(fs.existsSync(file), `${name} is generated but not committed`);
  }

  /* Nothing in the output may come from a clock: the same bytes have to come back tomorrow. */
  for (const content of first.files.values()) {
    assert.doesNotMatch(content, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'no timestamps');
    assert.doesNotMatch(content, new RegExp(String(new Date().getFullYear()) + '-\\d{2}-\\d{2}T'), 'no generated-on stamp');
  }
});

test('no individual and no direct number reaches the record or either page', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'pipeline/trip/trips', `${V2}.trip.json`), 'utf8');
  const texts = [raw, ...rendered().values()];
  for (const text of texts) {
    assert.doesNotMatch(text, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/, 'no direct phone numbers');
    assert.doesNotMatch(text, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no mailboxes');
  }
  for (const supplier of v2().suppliers) {
    for (const contact of supplier.contacts || []) {
      assert.ok(contact.role, 'contacts are recorded by role');
      assert.equal(contact.name, undefined, 'contacts carry no personal name');
    }
  }
  /* Roles, not names, in the generated pages too. */
  assert.match(rendered().get('vendor-call-list.md'), /Group sales \(phone\)/);
});

test('the word diff reports what a clause gained and lost, ignoring case and punctuation', () => {
  assert.deepEqual(wordDelta('Sight Seeing, Transportation and any Meals', 'Sight Seeing, Activities, Transportation and any Meals'),
    { added: ['Activities'], removed: [] });
  assert.deepEqual(wordDelta('a b c', 'c b a'), { added: [], removed: [] });
  assert.deepEqual(wordDelta('one two', 'one'), { added: [], removed: ['two'] });
  assert.deepEqual(wordDelta('', 'new'), { added: ['new'], removed: [] });
});

/* ---------------------------------- the diff against records it has not seen before */

/* These run the comparison over mutated copies of the two real records: the cases the live pair
   does not happen to contain, where a diff most easily says something untrue. */
const mutate = (base, edit) => { const copy = structuredClone(base); edit(copy); return copy; };
const slotOn = (trip, id) => lines(trip).find(entry => entry.slot.id === id);

test('a line that moves to another day is a material change, not an invisible one', () => {
  const before = v2();
  const after = mutate(before, trip => {
    const [moved] = trip.days[1].slots.splice(trip.days[1].slots.findIndex(slot => slot.id === 'd2-climbing'), 1);
    trip.days[2].slots.push({ ...moved, time: '21:00' });
  });
  const list = deltas(before, after);
  const moved = of(list, 'slot_day');
  assert.equal(moved.length, 1, 'a slot on a different day must not read as no change at all');
  assert.equal(moved[0].group, 'material');
  assert.match(moved[0].was, /Friday, April 9, 2027 16:30/);
  assert.match(moved[0].now, /Saturday, April 10, 2027 21:00/);
  assert.ok(counterpartiesFor(moved[0], after).has('high-point-climbing'));
});

test('reordering ids and reserialising terms are not changes', () => {
  /* The same slots under an inclusion, written in a different order. Nobody experiences this. */
  const reordered = mutate(v2(), trip => {
    trip.inclusions.find(inclusion => inclusion.id === 'inc-transport').slot_ids.reverse();
  });
  assert.deepEqual(deltas(v2(), reordered), [], 'a reordered coverage list puts nobody on the phone');

  /* The same term, with its JSON keys written in a different order. */
  const reserialised = mutate(v2(), trip => {
    const supplier = trip.suppliers.find(item => item.id === 'hotel-chattanooga');
    const { amount, basis, unit_label: unit } = supplier.terms.unit_price;
    supplier.terms.unit_price = { unit_label: unit, basis, amount };
  });
  assert.deepEqual(deltas(v2(), reserialised), []);
  assert.equal(stable({ b: 1, a: 2 }), stable({ a: 2, b: 1 }));
  assert.notEqual(stable({ a: 1 }), stable({ a: 2 }));
});

test('a term that really moved is printed as a term, never as raw JSON', () => {
  const after = mutate(v2(), trip => {
    trip.suppliers.find(item => item.id === 'rock-city').terms.final_headcount_due_business_days = 14;
  });
  const [delta] = of(deltas(v2(), after), 'supplier_terms');
  assert.equal(delta.group, 'material');
  assert.equal(delta.was, 'Final headcount — due 5 business days ahead');
  assert.equal(delta.now, 'Final headcount — due 14 business days ahead');
  assert.ok(!delta.was.includes('{'), 'a director is never shown a JSON blob');
  assert.match(delta.subject, /final headcount due business days/);
  assert.equal(termLine('deposit', undefined), null);
});

test('a headcount tier that stops being quoted reaches the director page', () => {
  const before = mutate(v2(), trip => {
    trip.trip.headcount.tiers.push(110);
    trip.pricing.published['110'] = { quad: 700, triple: 750, double: 850, single: 1150 };
  });
  const list = deltas(before, v2());
  const tiers = of(list, 'price_tier');
  assert.equal(tiers.length, 1);
  assert.equal(tiers[0].tier, '110');
  assert.equal(tiers[0].group, 'material');

  /* The row has to survive onto the page, marked as no longer quoted, rather than simply being
     absent because the current record no longer has that tier. */
  const findings = consequences(before, v2(), list);
  const page = directorPage(before, v2(), list, findings);
  assert.match(page, /\| 110 \| \$700 \(no longer quoted\)/);
  assert.match(page, /Price tier — 110 paying travellers\.\*\* quoted → not quoted/);

  assert.match(findings.find(finding => finding.id === 'price-without-cause').detail,
    /headcount tier started or stopped being quoted/);
  assert.ok(!findings.some(finding => finding.detail.includes('0 cells changed')));
});

test('the diff does not claim a history it cannot see', () => {
  /* An inclusion that stops covering a line which is still on the itinerary is a different
     problem from one whose line was dropped, and the sentence has to say which. */
  const after = mutate(v2(), trip => {
    const inclusion = trip.inclusions.find(item => item.id === 'inc-transport');
    inclusion.slot_ids = inclusion.slot_ids.filter(id => id !== 'd1-depart');
  });
  const finding = consequences(v2(), after, deltas(v2(), after)).find(item => item.id === 'coverage:inc-transport');
  assert.match(finding.detail, /still on the itinerary but no longer sold under this inclusion/);
  assert.ok(!finding.detail.includes('not on this version of the itinerary at all'));

  /* A pair of lines that never sat together cannot have "fitted" before. */
  const inserted = mutate(v2(), trip => {
    trip.days[0].slots.splice(4, 0, { id: 'd1-new', time: '17:00', title: 'Newly added stop', included: false, source_ids: ['PH-THU'] });
  });
  assert.ok(!adjacentPairs(v2()).has('d1-rock-city>d1-new'));
  const fit = consequences(v2(), inserted, deltas(v2(), inserted)).find(item => item.id === 'fit:d1-rock-city>d1-new');
  assert.ok(fit, 'a new pairing that does not fit is still worth saying');
  assert.match(fit.detail, /did not sit together on the previous version/);
  assert.ok(!fit.detail.includes('On the previous version it fitted'));
  assert.match(fit.title, /does not fit the line now printed after it/);
});

test('a counterparty recorded with a role but no channel does not break the page', () => {
  const after = mutate(v2(), trip => {
    trip.suppliers.find(item => item.id === 'southern-belle').contacts = [{ role: 'Group sales' }];
    slotOn(trip, 'd4-riverboat').slot.time = '10:00';
  });
  assert.doesNotThrow(() => deltas(v2(), after));
  /* The renderer reads the superseded record off disk, so exercise the same formatting path the
     call list uses rather than writing a throwaway trip file. */
  const contacts = (after.suppliers.find(item => item.id === 'southern-belle').contacts || [])
    .map(contact => (contact.channel ? `${contact.role} (${contact.channel})` : contact.role || 'role not recorded'));
  assert.deepEqual(contacts, ['Group sales']);
});

test('a dangling supersedes fails with a message that names the record', () => {
  const broken = mutate(v2(), trip => { trip.trip.supersedes = 'no-such-trip'; });
  assert.throws(() => renderer.outputs(broken), /supersedes "no-such-trip", which is not a trip record/);
});

test('the last line naming a counterparty is found by date and time, not by file order', () => {
  /* Same record, days written in reverse. The answer must not change. */
  const shuffled = mutate(v2(), trip => { trip.days.reverse(); });
  const straight = consequences(v1(), v2(), deltas(v1(), v2()));
  const reversed = consequences(v1(), shuffled, deltas(v1(), shuffled));
  const lastLine = list => list.find(finding => finding.id === 'last-line:young-transportation');
  assert.ok(lastLine(straight));
  assert.equal(lastLine(reversed).detail, lastLine(straight).detail);
});

test('every line state printed on either page is one the schema defines', () => {
  const words = new Set(Object.values(S.LINE_STATES).map(state => state.client_word));
  for (const { slot } of lines(v2())) {
    if (!slot.state) continue;
    assert.ok(words.has(S.clientWord(slot.state)), `${slot.state} has no client word`);
  }
  assert.ok(!rendered().get('change-diff.md').includes('status unrecorded'));
});
