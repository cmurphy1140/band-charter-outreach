const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadTrip, lines } = require('../pipeline/trip/load.cjs');
const { checkTrip } = require('../pipeline/trip/cli.cjs');
const S = require('../pipeline/trip/schema.cjs');
const renderer = require('../pipeline/trip/renderers/client-itinerary.cjs');

const TRIP = 'west-henderson-chattanooga-2027-04-08';
const trip = () => loadTrip(TRIP);
const copy = () => structuredClone(loadTrip(TRIP));
const render = record => renderer.outputs(record);
const markdown = record => render(record).get('client-itinerary.md');
const html = record => render(record).get('client-itinerary.html');

const headingFor = (md, slot) => md.split('\n').filter(line => line.startsWith(`**${slot.time} · ${slot.title}**`));
const blockFor = (page, slot) => page.split('<div class="line">')
  .filter(block => block.includes(`<h3>${renderer.esc(slot.title)}</h3>`) && block.includes(`>${slot.time}</p>`));

test('the renderer produces exactly the two client documents', () => {
  const files = render(trip());
  assert.deepEqual([...files.keys()], ['client-itinerary.md', 'client-itinerary.html']);
  for (const content of files.values()) assert.ok(typeof content === 'string' && content.length > 2000);
  assert.equal(renderer.name, 'client-itinerary');
  assert.ok(renderer.description.length > 20);
});

test('every supplied line prints its own state word in both documents', () => {
  const record = trip();
  const md = markdown(record);
  const page = html(record);
  const seen = new Set();
  let supplied = 0;
  for (const { slot } of lines(record)) {
    const key = `${slot.time} · ${slot.title}`;
    assert.ok(!seen.has(key), `${key} appears once, so these assertions address one line`);
    seen.add(key);
    if (!slot.supplier_id) continue;
    supplied += 1;
    const word = S.clientWord(slot.state);
    assert.notEqual(word, 'status unrecorded', `${slot.id} has a known state`);

    const headings = headingFor(md, slot);
    assert.equal(headings.length, 1, `${slot.id} has one Markdown heading`);
    assert.ok(headings[0].includes(word), `${slot.id} prints "${word}" in Markdown: ${headings[0]}`);

    const blocks = blockFor(page, slot);
    assert.equal(blocks.length, 1, `${slot.id} has one HTML line`);
    assert.match(blocks[0], new RegExp(`class="mark mark--(open|settled)">${word}</li>`), `${slot.id} prints "${word}" in HTML`);
  }
  assert.equal(supplied, 20, 'every line a supplier is behind is covered');
});

test('the dinner being shopped never reads as a settled booking', () => {
  const record = trip();
  const dinner = lines(record).find(({ slot }) => slot.id === 'd1-dinner').slot;
  assert.equal(dinner.state, 'sourcing');

  const heading = headingFor(markdown(record), dinner)[0];
  assert.ok(heading.includes('venue being finalised'), heading);
  assert.doesNotMatch(heading, /confirmed|booked|reserved/i);

  const block = blockFor(html(record), dinner)[0];
  assert.match(block, /mark--open">venue being finalised</);
  assert.doesNotMatch(block, /mark--settled|confirmed|booked/i);

  // The inclusion that sells the same dinner cannot read firmer than its itinerary line.
  const inclusion = record.inclusions.find(entry => entry.id === 'inc-dinner-one');
  assert.ok(markdown(record).includes(`${inclusion.text} — *venue being finalised*`));
  assert.deepEqual(renderer.inclusionMark(inclusion, new Map([['d1-dinner', dinner]])),
    { label: 'venue being finalised', kind: 'open' });
});

test('a confirmed line says confirmed, and an unrecorded state never passes as booked', () => {
  const settled = copy();
  const slot = settled.days[0].slots.find(entry => entry.id === 'd1-rock-city');
  slot.state = 'confirmed';
  const heading = headingFor(markdown(settled), slot)[0];
  assert.ok(heading.includes('confirmed'), heading);
  assert.match(blockFor(html(settled), slot)[0], /mark--settled">confirmed</);
  assert.deepEqual(renderer.marks(slot), [
    { label: 'included', kind: 'included' },
    { label: 'confirmed', kind: 'settled' }
  ]);

  const unknown = copy();
  const broken = unknown.days[0].slots.find(entry => entry.id === 'd1-rock-city');
  broken.state = 'pencilled-in';
  assert.ok(headingFor(markdown(unknown), broken)[0].includes('status unrecorded'));
  assert.doesNotMatch(blockFor(html(unknown), broken)[0], /mark--settled/);
});

test('lines outside the package price read as not included', () => {
  const record = trip();
  const md = markdown(record);
  const page = html(record);
  const excluded = lines(record).filter(({ slot }) => slot.included === false).map(({ slot }) => slot);
  assert.ok(excluded.some(slot => slot.id === 'd3-baseball'), 'the optional ball game is one of them');
  assert.ok(excluded.some(slot => slot.id === 'd1-lunch-stop'), 'the lunch stops are among them');
  for (const slot of excluded) {
    assert.ok(headingFor(md, slot)[0].includes('not included'), `${slot.id} in Markdown`);
    assert.match(blockFor(page, slot)[0], /mark--excluded">not included</, `${slot.id} in HTML`);
    assert.doesNotMatch(blockFor(page, slot)[0], /mark--included|mark--settled/);
  }
  assert.equal((page.match(/class="mark mark--excluded"/g) || []).length, excluded.length);
});

test('blurbs carry the body copy and notes stay a quiet qualifier', () => {
  const record = trip();
  const md = markdown(record);
  const page = html(record);
  for (const { slot } of lines(record)) {
    if (!slot.blurb) continue;
    assert.ok(md.includes(slot.blurb), `${slot.id} blurb in Markdown`);
    assert.ok(page.includes(`<p class="blurb">${renderer.esc(slot.blurb)}</p>`), `${slot.id} blurb in HTML`);
  }
  assert.match(page, /<p class="quiet">At own cost, or can be added\.<\/p>/);
  assert.match(page, /<p class="quiet">Allow about 2 hours\.<\/p>/);
  assert.match(page, /<ul class="steps"><li>Leave the coaches downtown; the group crosses on foot<\/li>/);

  // How two printings of the proposal differed is reconciliation history, not client copy.
  assert.doesNotMatch(md, /narrative iteration|factual iteration/);
  assert.doesNotMatch(page, /narrative iteration|factual iteration/);
  assert.ok(md.includes('Check out and load the coaches'), 'the operations step itself still prints');
  // A note about the trip is kept, even an unflattering one: the printed 08:30 cannot be met.
  assert.ok(md.includes('The supplier says the first ride is 09:00.'), 'the timing conflict reaches the director');
  assert.match(page, /<p class="quiet">The supplier says the first ride is 09:00\./);
});

test('the status legend comes from the vocabulary and covers every word used', () => {
  const record = trip();
  const md = markdown(record);
  const page = html(record);
  const used = new Set(lines(record).map(({ slot }) => slot.state).filter(state => S.lineState(state)));
  const printed = renderer.legend(record);
  assert.deepEqual(printed.map(entry => entry.word), [...Object.keys(S.LINE_STATES)]
    .filter(state => used.has(state)).map(state => S.LINE_STATES[state].client_word));
  for (const { word, meaning } of printed) {
    assert.ok(md.includes(`**${word}** — ${meaning}`), `${word} explained in Markdown`);
    assert.ok(page.includes(`<dt>${renderer.esc(word)}</dt><dd>${renderer.esc(meaning)}</dd>`), `${word} explained in HTML`);
  }
  assert.ok(printed.every(entry => entry.word !== 'confirmed'), 'nothing on this trip is confirmed yet');
});

test('inclusions and exclusions are reproduced verbatim, and an unplaced inclusion says so', () => {
  const record = trip();
  const md = markdown(record);
  const page = html(record);
  for (const inclusion of record.inclusions) {
    assert.ok(md.includes(`- ${inclusion.text}`), `inclusion ${inclusion.id} verbatim in Markdown`);
    assert.ok(page.includes(`<li>${renderer.esc(inclusion.text)}`), `inclusion ${inclusion.id} verbatim in HTML`);
  }
  for (const exclusion of record.exclusions) {
    assert.ok(md.includes(exclusion.text), `exclusion ${exclusion.id} verbatim in Markdown`);
    assert.ok(page.includes(`<div class="clause"><p>${renderer.esc(exclusion.text)}</p></div>`), `exclusion ${exclusion.id} verbatim in HTML`);
  }
  // The clause wording is contractual: the variant seen on the other printing is not blended in.
  assert.doesNotMatch(md, /Sight Seeing, Activities, Transportation/);
  // Sold with no time anywhere in four days: the page says that rather than implying one.
  assert.match(md, /- Admission to the IMAX Theater at the Aquarium — \*no time on this itinerary yet\*/);
  assert.equal(renderer.inclusionMark({ slot_ids: [] }, new Map()).label, 'no time on this itinerary yet');
});

test('interpolated text is escaped, including an injected tag in a title', () => {
  const hostile = copy();
  const slot = hostile.days[0].slots.find(entry => entry.id === 'd1-rock-city');
  slot.title = '<img src=x onerror=alert(1)>';
  slot.blurb = 'Quotes "double" and \'single\' & an ampersand';
  hostile.inclusions[0].text = '<script>alert(2)</script>';
  hostile.exclusions[0].text = 'Meals not on the <b>itinerary</b>';
  hostile.trip.title = '<svg onload=alert(3)>';

  const page = html(hostile);
  assert.match(page, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(page, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.match(page, /&lt;b&gt;itinerary&lt;\/b&gt;/);
  assert.match(page, /&lt;svg onload=alert\(3\)&gt;/);
  assert.match(page, /Quotes &quot;double&quot; and &#39;single&#39; &amp; an ampersand/);
  assert.doesNotMatch(page, /<img|<svg|<script>/, 'the injected tags never reopen');
  assert.doesNotMatch(page, /<[a-z][^>]*\son[a-z]+\s*=/i, 'no tag carries an event handler');
  assert.equal(renderer.esc('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');

  // The status word survives the hostile title, so the line still tells the truth.
  assert.match(blockFor(page, slot)[0], /mark--open">quoted</);
});

test('the HTML page is self-contained and prints on its own', () => {
  const page = html(trip());
  assert.match(page, /^<!doctype html>\n<html lang="en">/);
  assert.match(page, /<meta charset="utf-8">/);
  assert.match(page, /<meta name="viewport"/);
  assert.equal((page.match(/<style>/g) || []).length, 1);
  assert.doesNotMatch(page, /<script|<link|<iframe|@import|https?:\/\/|\ssrc=|url\(/);
  assert.doesNotMatch(page, /href="\/|url\("\/|"\/[a-z]/, 'no absolute paths');
  assert.match(page, /@media print/);
  assert.match(page, /break-inside: avoid/);
  assert.match(page, /--ink: #173f42/);
  assert.match(page, /--accent-primary: #1d5d55/);
  assert.match(page, /--paper: #fbfcfa/);
  assert.match(page, /--line: #c8d5cf/);
  assert.match(page, /--display: Georgia/);
  assert.equal((page.match(/<h1>/g) || []).length, 1);
  assert.equal((page.match(/<section class="day">/g) || []).length, trip().days.length);
});

test('rendering is deterministic and reads no clock', () => {
  const first = [...render(trip()).entries()];
  const second = [...render(trip()).entries()];
  assert.deepEqual(first, second);
  const source = fs.readFileSync(path.join(__dirname, '..', 'pipeline/trip/renderers/client-itinerary.cjs'), 'utf8');
  assert.doesNotMatch(source, /new Date|Date\.now|Math\.random|toLocaleDateString|process\.env/);
  // Dates are formatted from the record's own strings.
  assert.ok(markdown(trip()).includes('**April 8–11, 2027**'));
  assert.equal(renderer.longDate('2026-09-11'), 'September 11, 2026');
  assert.equal(renderer.dateRange('2027-04-08', '2027-04-11'), 'April 8–11, 2027');
  assert.equal(renderer.dateRange('2027-04-30', '2027-05-02'), 'April 30 – May 2, 2027');
  assert.equal(renderer.dateRange('2027-12-30', '2028-01-02'), 'December 30, 2027 – January 2, 2028');
  assert.equal(renderer.durationPhrase(90), 'Allow about 1 hour 30 minutes.');
  assert.equal(renderer.durationPhrase(120), 'Allow about 2 hours.');
  assert.equal(renderer.durationPhrase(undefined), null);
});

test('no individual is named and no direct number is printed', () => {
  for (const content of render(trip()).values()) {
    assert.doesNotMatch(content, /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/, 'no direct phone numbers');
    assert.doesNotMatch(content, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no mailboxes');
    assert.doesNotMatch(content, /mailto:|tel:/);
  }
  assert.match(markdown(trip()), /Prepared for the Director of Bands by Troen Student Performance Events\./);
});

test('a day with nothing scheduled keeps its place in the trip', () => {
  const record = copy();
  record.days[2].slots = [];
  const md = markdown(record);
  const page = html(record);
  assert.ok(md.includes(`## ${record.days[2].label}`), 'the free day still has a heading');
  assert.equal((page.match(/<section class="day">/g) || []).length, record.days.length);
  assert.deepEqual(renderer.dayGroups(record).map(group => group.slots.length), [7, 7, 0, 5]);
});

test('an inclusion is never printed without a word beside it', () => {
  const record = copy();
  // Sold, with a slot, but nothing in the record says where that slot stands.
  const inclusion = record.inclusions.find(entry => entry.id === 'inc-rock-city');
  delete record.days[0].slots.find(entry => entry.id === 'd1-rock-city').state;
  delete record.days[0].slots.find(entry => entry.id === 'd1-rock-city').supplier_id;
  assert.ok(markdown(record).includes(`- ${inclusion.text} — *status unrecorded*`));
  assert.equal(renderer.inclusionMark({ slot_ids: ['gone'] }, new Map()).label, 'status unrecorded');

  for (const line of markdown(trip()).split('\n')) {
    if (!line.startsWith('- ') || !line.includes(' — *')) continue;
    assert.match(line, / — \*[a-z][^*]*\*$/, `no inclusion prints bare: ${line}`);
  }
});

test('a line the inclusions list sells reads as included even when the line is silent', () => {
  const record = trip();
  const covered = renderer.coveredSlots(record);
  assert.ok(covered.has('d1-hotel-checkin'), 'the accommodation inclusion covers the check-in');
  const checkin = lines(record).find(({ slot }) => slot.id === 'd1-hotel-checkin').slot;
  assert.equal(checkin.included, undefined);
  assert.deepEqual(renderer.marks(checkin, covered), [
    { label: 'included', kind: 'included' },
    { label: 'quoted', kind: 'open' }
  ]);
  assert.ok(headingFor(markdown(record), checkin)[0].includes('included · quoted'));
  // An explicit exclusion on the line still wins over the coverage.
  const lunch = lines(record).find(({ slot }) => slot.id === 'd4-depart').slot;
  assert.ok(covered.has('d4-depart'));
  assert.deepEqual(renderer.marks(lunch, covered), [{ label: 'not included', kind: 'excluded' }]);
});

test('record text cannot restructure the Markdown document either', () => {
  const hostile = copy();
  const slot = hostile.days[0].slots.find(entry => entry.id === 'd1-rock-city');
  slot.blurb = '## Not a heading';
  slot.ops_steps = ['- not a nested list'];
  hostile.exclusions[0].text = '> not a quote';
  const md = markdown(hostile);
  assert.ok(md.includes('\\## Not a heading'));
  assert.ok(md.includes('- \\- not a nested list'));
  assert.ok(md.includes('\\> not a quote'));
  assert.doesNotMatch(md, /^## Not a heading$/m);
  assert.equal(renderer.mdText('#1 attraction'), '\\#1 attraction');
  assert.equal(renderer.mdText('4,100 feet of trail'), '4,100 feet of trail');
});

test('a malformed or single-day date never prints as a month called undefined', () => {
  assert.equal(renderer.longDate('2027-13-05'), '2027-13-05');
  assert.equal(renderer.dateRange('2027-13-05', '2027-13-09'), '2027-13-05 to 2027-13-09');
  assert.equal(renderer.dateRange('2027-04-08', '2027-04-08'), 'April 8, 2027');
  assert.equal(renderer.longDate('next spring'), 'next spring');
});

test('the weakest state wins by the vocabulary grouping, not by key order', () => {
  const slots = new Map([
    ['a', { state: 'confirmed' }],
    ['b', { state: 'requested' }],
    ['c', { state: 'deposit_paid' }]
  ]);
  assert.deepEqual(renderer.inclusionMark({ slot_ids: ['a', 'b', 'c'] }, slots),
    { label: 'requested', kind: 'open' });
  assert.deepEqual(renderer.inclusionMark({ slot_ids: ['a'] }, slots),
    { label: 'confirmed', kind: 'settled' });
  for (const [state, entry] of Object.entries(S.LINE_STATES)) {
    assert.ok(['blocking', 'in_progress', 'clear'].includes(entry.state), `${state} is grouped`);
  }
});

test('the committed client documents are current', () => {
  const result = checkTrip(trip());
  assert.deepEqual(result.errors, []);
  for (const name of ['client-itinerary.md', 'client-itinerary.html']) {
    assert.ok(result.files.has(name));
    assert.ok(!result.stale.includes(name), `stale: run node pipeline/trip/cli.cjs render ${TRIP}`);
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'pipeline/trip/out', TRIP, name)), `${name} is committed`);
  }
});
