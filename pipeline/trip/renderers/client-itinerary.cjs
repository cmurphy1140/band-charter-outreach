/* The client-facing narrative itinerary: Markdown and one standalone HTML page.

   This is the document the whole layer exists to fix. Two printed iterations of this trip
   disagreed about the performance venue, a vendor's name and the exclusions clause, because
   the proposal was the database and each redraft retyped it. Here the prose is the record's
   own `blurb` text, and nothing on the page is typed twice.

   The feature that makes it honest is one word. The printed proposal said nothing about the
   state of its own lines, so silence read as "booked" — including a day-one dinner printed
   with a named venue while five alternatives were still being called. Every supplied line
   here prints schema.cjs's `client_word` for its state, so a line that is being shopped says
   so. Counter-intuitively that reduces redrafts: the director stops asking "is this locked
   in?", because the page already answers. */

const { lines } = require('../load.cjs');
const S = require('../schema.cjs');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/* Least to most settled. The primary key is the vocabulary's own `state` grouping, which is
   documented, rather than the order the keys happen to be written in: a state added below
   `confirmed` one day must not thereby rank as the most settled. Used to pick the weakest
   state covering a sold inclusion, so an inclusion never reads firmer than its itinerary. */
const STATE_ORDER = Object.keys(S.LINE_STATES);
const GROUP_RANK = { blocking: 0, in_progress: 1, clear: 2 };
function rank(state) {
  const entry = S.LINE_STATES[state];
  if (!entry) return -1;
  return (GROUP_RANK[entry.state] ?? 0) * 100 + STATE_ORDER.indexOf(state);
}

const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const esc = value => text(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/* The HTML page escapes every interpolation; the Markdown one needs the same care in the one
   place it can be restructured — the start of a line. A blurb opening with "## " would become
   a heading and a step opening with "- " a nested list, so the structure character is escaped
   and the text still reads exactly as recorded. */
const mdText = value => text(value).replace(/^([#>\-+*=|_`~]|\d+[.)])/, '\\$1');

/* YYYY-MM-DD without a clock or a locale: check --all compares bytes. */
function parseIso(iso) {
  const match = ISO.exec(text(iso));
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year: match[1], month, day: Number(match[3]) } : null;
}

function longDate(iso) {
  const parts = parseIso(iso);
  if (!parts) return text(iso);
  return `${MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

function dateRange(startIso, endIso) {
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  if (!start || !end) return [longDate(startIso), longDate(endIso)].filter(Boolean).join(' to ');
  if (start.year === end.year && start.month === end.month) {
    if (start.day === end.day) return longDate(startIso);
    return `${MONTHS[start.month - 1]} ${start.day}–${end.day}, ${start.year}`;
  }
  if (start.year === end.year) {
    return `${MONTHS[start.month - 1]} ${start.day} – ${MONTHS[end.month - 1]} ${end.day}, ${start.year}`;
  }
  return `${longDate(startIso)} – ${longDate(endIso)}`;
}

function durationPhrase(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  const parts = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (rest) parts.push(`${rest} minute${rest === 1 ? '' : 's'}`);
  return `Allow about ${parts.join(' ')}.`;
}

/* What prints beside a line. `included: false` must read as not included, and anything a
   supplier is behind carries its state word — including "confirmed", so the reader learns
   that the absence of a word is never what "booked" looks like here. */
function marks(slot, covered = new Set()) {
  const out = [];
  if (slot.included === false) out.push({ label: 'not included', kind: 'excluded' });
  else if (slot.included === true || covered.has(slot.id)) out.push({ label: 'included', kind: 'included' });
  if (slot.state || slot.supplier_id) {
    out.push({ label: S.clientWord(slot.state), kind: S.isClear(slot.state) ? 'settled' : 'open' });
  }
  return out;
}

/* Notes in the record are mixed-audience: "At own cost, or can be added." is for the
   director, while "absent from the narrative iteration" is reconciliation history between
   two printings and belongs in the internal documents. A note about the printings of the
   proposal is not a note about the trip, so it does not print here. Deliberately narrow:
   anything it does not catch still prints, which is the safer failure. */
const PROVENANCE = /\biterations?\b|\bprintings?\b|\breprint(?:ed|ing)?\b|\bthis record\b/i;
const clientNote = slot => (PROVENANCE.test(text(slot.note)) ? '' : text(slot.note));

const slotIndex = trip => new Map(lines(trip).map(({ slot }) => [slot.id, slot]));

/* Slots the inclusions list sells. A line can be silent about `included` and still be sold —
   the hotel check-in is covered by the accommodation inclusion — so the chip comes from
   whichever of the two the record actually states. An explicit `included: false` still wins. */
const coveredSlots = trip => new Set((trip.inclusions || []).flatMap(inclusion => inclusion.slot_ids || []));

/* An inclusion is sold, so it inherits the weakest state of the itinerary lines that deliver
   it. One with no line at all says so rather than implying a time exists. */
function inclusionMark(inclusion, slots) {
  const ids = inclusion.slot_ids || [];
  if (!ids.length) return { label: 'no time on this itinerary yet', kind: 'open' };
  const states = ids.map(id => (slots.get(id) || {}).state).filter(state => S.lineState(state));
  /* Slots that name no state leave the vocabulary's own fallback, never a blank that would
     read as settled. */
  const weakest = states.slice().sort((a, b) => rank(a) - rank(b))[0];
  return { label: S.clientWord(weakest), kind: S.isClear(weakest) ? 'settled' : 'open' };
}

/* Only the states this itinerary actually uses, in the vocabulary's own order, with the
   vocabulary's own description. A new state in schema.cjs reaches the client legend without
   anyone rewriting this page. */
function legend(trip) {
  const used = new Set();
  for (const { slot } of lines(trip)) if (S.lineState(slot.state)) used.add(slot.state);
  return STATE_ORDER.filter(state => used.has(state))
    .map(state => ({ word: S.LINE_STATES[state].client_word, meaning: S.LINE_STATES[state].description }));
}

function dayGroups(trip) {
  const groups = new Map((trip.days || []).map(day => [day, []]));
  for (const { day, slot } of lines(trip)) {
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(slot);
  }
  return [...groups].map(([day, slots]) => ({ day, slots }));
}

function headerFacts(trip) {
  const head = trip.trip || {};
  const client = head.client || {};
  const facts = [];
  if (client.ensemble || client.organization) facts.push(['Group', client.ensemble || client.organization]);
  if (client.origin) facts.push(['Travelling from', client.origin]);
  if (head.destination) facts.push(['Destination', head.destination]);
  const minimum = (head.headcount || {}).paying_minimum;
  if (typeof minimum === 'number') facts.push(['Priced on a minimum of', `${minimum} paying travellers`]);
  if (head.version) facts.push(['Itinerary version', head.version]);
  if (head.prepared_on) facts.push(['Prepared', longDate(head.prepared_on)]);
  return facts;
}

const READING = 'Every line below that we arrange with a supplier prints one word for where '
  + 'that arrangement actually stands. The word comes from the booking record, not from a '
  + 'redraft, so a line still being shopped says so instead of reading as settled. Lines '
  + 'marked not included sit in the plan but outside the package price.';

const CLOSING = 'Times, and any line not yet confirmed, can still move. Every change is made '
  + 'in the trip record and this page is generated again from it, so the wording, the '
  + 'inclusions and the exclusions stay in step with what has actually been arranged.';

/* ---------------------------------------------------------------- Markdown */

function buildMarkdown(trip) {
  const head = trip.trip || {};
  const slots = slotIndex(trip);
  const covered = coveredSlots(trip);
  const out = [];
  const push = (...paragraphs) => { for (const p of paragraphs) if (p) out.push(p, ''); };

  push(`# ${text(head.title)}`);
  push(`**${dateRange(head.start_date, head.end_date)}**`);
  const recipient = (head.client || {}).recipient_role;
  push(`Prepared for the ${text(recipient || 'group leader')}${head.operator ? ` by ${text(head.operator)}` : ''}.`);
  for (const [label, value] of headerFacts(trip)) out.push(`- **${label}:** ${text(value)}`);
  out.push('');

  push('## Reading this itinerary', READING);
  for (const { word, meaning } of legend(trip)) out.push(`- **${text(word)}** — ${text(meaning)}`);
  out.push('');

  for (const { day, slots: daySlots } of dayGroups(trip)) {
    push(`## ${text(day.label || longDate(day.date))}`);
    for (const slot of daySlots) {
      const chips = marks(slot, covered).map(mark => text(mark.label)).join(' · ');
      push(`**${text(slot.time)} · ${text(slot.title)}**${chips ? ` — *${chips}*` : ''}`);
      push(mdText(slot.blurb));
      const qualifiers = [durationPhrase(slot.duration_minutes), clientNote(slot)].filter(Boolean);
      if (qualifiers.length) push(`*${qualifiers.join(' ')}*`);
      if ((slot.ops_steps || []).length) {
        push('Timing and movements:');
        for (const step of slot.ops_steps) out.push(`- ${mdText(step)}`);
        out.push('');
      }
    }
  }

  push('## What the price includes');
  for (const inclusion of trip.inclusions || []) {
    const mark = inclusionMark(inclusion, slots);
    out.push(`- ${mdText(inclusion.text)}${mark ? ` — *${text(mark.label)}*` : ''}`);
  }
  out.push('');

  push('## What the price does not include');
  for (const exclusion of trip.exclusions || []) push(mdText(exclusion.text));

  push('---', CLOSING);
  const stamp = [head.version ? `Itinerary version ${text(head.version)}` : '',
    head.prepared_on ? `prepared ${longDate(head.prepared_on)}` : ''].filter(Boolean).join(', ');
  if (stamp) push(`${stamp}.`);

  return out.join('\n').replace(/\n+$/, '\n');
}

/* -------------------------------------------------------------------- HTML */

const STYLE = `
:root {
  --ink: #173f42;
  --accent-primary: #1d5d55;
  --accent-secondary: #8a652b;
  --paper: #fbfcfa;
  --surface-elevated: #f0f5f2;
  --surface-white: #ffffff;
  --line: #c8d5cf;
  --muted: #51635b;
  --display: Georgia, 'Times New Roman', serif;
  --body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}
* { box-sizing: border-box; }
html { background: var(--paper); color: var(--ink); }
body { margin: 0; font: 16px/1.6 var(--body); }
.page { max-width: 46rem; margin-inline: auto; padding: 56px 32px 72px; }
h1, h2, h3 { font-family: var(--display); font-weight: 400; letter-spacing: -.01em; }
h1 { font-size: 30px; line-height: 1.25; margin: 0 0 10px; }
h2 { font-size: 21px; margin: 0 0 18px; }
h3 { font-size: 17px; margin: 0; }
p { margin: 0 0 14px; max-width: 68ch; }
.eyebrow { font: 600 12px/1.4 var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--accent-secondary); margin-bottom: 14px; }
.masthead { border-bottom: 1px solid var(--line); padding-bottom: 28px; margin-bottom: 36px; }
.dates { font-size: 17px; color: var(--muted); margin-bottom: 18px; }
.prepared { margin-bottom: 20px; }
.facts { display: grid; grid-template-columns: max-content 1fr; gap: 6px 20px; margin: 0; font-size: 14px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; }
section { margin-bottom: 40px; }
.reading { background: var(--surface-elevated); border: 1px solid var(--line); border-radius: 10px; padding: 24px 28px 20px; }
.reading h2 { font-size: 18px; margin-bottom: 12px; }
.reading p { font-size: 15px; }
.legend { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 8px 18px; font-size: 14px; }
.legend dt { font-weight: 600; }
.legend dd { margin: 0; color: var(--muted); }
.day > h2 { padding-bottom: 8px; border-bottom: 1px solid var(--line); }
.line { display: grid; grid-template-columns: 5.5rem 1fr; gap: 4px 20px; padding: 18px 0; border-bottom: 1px solid var(--line); }
.line:last-child { border-bottom: 0; }
.time { font: 600 14px/1.9 var(--body); color: var(--muted); font-variant-numeric: tabular-nums; margin: 0; }
.line-body > * + * { margin-top: 8px; }
.marks { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.mark { font: 600 11px/1.5 var(--body); letter-spacing: .09em; text-transform: uppercase; border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; white-space: nowrap; display: inline-block; }
.mark--open { color: var(--accent-secondary); border-color: var(--accent-secondary); }
.mark--settled { color: var(--surface-white); background: var(--accent-primary); border-color: var(--accent-primary); }
.mark--excluded { color: var(--muted); border-style: dashed; }
.mark--included { color: var(--accent-primary); border-color: var(--accent-primary); }
.blurb { margin: 0; }
.quiet { font-size: 14px; color: var(--muted); margin: 0; }
.steps { margin: 0; padding-left: 18px; font-size: 14px; color: var(--muted); }
.steps li + li { margin-top: 4px; }
.terms ul { margin: 0; padding-left: 18px; }
.terms li { margin-bottom: 10px; }
.terms li .mark { margin-left: 2px; vertical-align: 1px; }
.clause { border-left: 2px solid var(--line); padding-left: 16px; margin-bottom: 16px; }
.clause p { margin: 0; font-size: 15px; }
.closing { border-top: 1px solid var(--line); padding-top: 20px; font-size: 14px; color: var(--muted); }
.closing p:last-child { margin-bottom: 0; }
@page { margin: 18mm; }
@media print {
  html, body { background: var(--surface-white); }
  .page { max-width: none; padding: 0; }
  .reading { background: none; }
  .day, .line, .clause, .terms li { break-inside: avoid; }
  h2 { break-after: avoid; }
  .mark--settled { color: var(--ink); background: none; }
}
@media (max-width: 34rem) {
  .page { padding: 32px 20px 48px; }
  .line { grid-template-columns: 1fr; gap: 6px; }
  .time { line-height: 1.4; }
  .facts, .legend { grid-template-columns: 1fr; gap: 2px 0; }
  .legend dd { margin-bottom: 8px; }
}
`.trim();

const markHtml = mark => `<li class="mark mark--${esc(mark.kind)}">${esc(mark.label)}</li>`;

function lineHtml(slot, covered) {
  const chips = marks(slot, covered);
  const parts = [`<h3>${esc(slot.title)}</h3>`];
  if (chips.length) parts.push(`<ul class="marks">${chips.map(markHtml).join('')}</ul>`);
  if (text(slot.blurb)) parts.push(`<p class="blurb">${esc(slot.blurb)}</p>`);
  const qualifiers = [durationPhrase(slot.duration_minutes), clientNote(slot)].filter(Boolean);
  if (qualifiers.length) parts.push(`<p class="quiet">${qualifiers.map(esc).join(' ')}</p>`);
  if ((slot.ops_steps || []).length) {
    parts.push(`<ul class="steps">${slot.ops_steps.map(step => `<li>${esc(step)}</li>`).join('')}</ul>`);
  }
  return `    <div class="line">\n      <p class="time">${esc(slot.time)}</p>\n`
    + `      <div class="line-body">\n        ${parts.join('\n        ')}\n      </div>\n    </div>`;
}

function buildHtml(trip) {
  const head = trip.trip || {};
  const slots = slotIndex(trip);
  const covered = coveredSlots(trip);
  const title = [text(head.title), dateRange(head.start_date, head.end_date)].filter(Boolean).join(' · ');
  const recipient = (head.client || {}).recipient_role;
  const out = [];

  out.push('<!doctype html>', '<html lang="en">', '<head>', '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(title)}</title>`, '<style>', STYLE, '</style>', '</head>', '<body>',
    '<article class="page">');

  out.push('  <header class="masthead">');
  if (head.operator) out.push(`    <p class="eyebrow">${esc(head.operator)}</p>`);
  out.push(`    <h1>${esc(head.title)}</h1>`);
  out.push(`    <p class="dates">${esc(dateRange(head.start_date, head.end_date))}</p>`);
  out.push(`    <p class="prepared">Prepared for the ${esc(recipient || 'group leader')}${head.operator ? ` by ${esc(head.operator)}` : ''}.</p>`);
  out.push('    <dl class="facts">');
  for (const [label, value] of headerFacts(trip)) out.push(`      <dt>${esc(label)}</dt><dd>${esc(value)}</dd>`);
  out.push('    </dl>', '  </header>');

  out.push('  <section class="reading">', '    <h2>Reading this itinerary</h2>',
    `    <p>${esc(READING)}</p>`, '    <dl class="legend">');
  for (const { word, meaning } of legend(trip)) out.push(`      <dt>${esc(word)}</dt><dd>${esc(meaning)}</dd>`);
  out.push('    </dl>', '  </section>');

  for (const { day, slots: daySlots } of dayGroups(trip)) {
    out.push('  <section class="day">', `    <h2>${esc(day.label || longDate(day.date))}</h2>`);
    for (const slot of daySlots) out.push(lineHtml(slot, covered));
    out.push('  </section>');
  }

  out.push('  <section class="terms">', '    <h2>What the price includes</h2>', '    <ul>');
  for (const inclusion of trip.inclusions || []) {
    const mark = inclusionMark(inclusion, slots);
    out.push(`      <li>${esc(inclusion.text)}${mark ? ` <span class="mark mark--${esc(mark.kind)}">${esc(mark.label)}</span>` : ''}</li>`);
  }
  out.push('    </ul>', '  </section>');

  out.push('  <section class="terms">', '    <h2>What the price does not include</h2>');
  for (const exclusion of trip.exclusions || []) {
    out.push(`    <div class="clause"><p>${esc(exclusion.text)}</p></div>`);
  }
  out.push('  </section>');

  out.push('  <footer class="closing">', `    <p>${esc(CLOSING)}</p>`);
  const stamp = [head.version ? `Itinerary version ${text(head.version)}` : '',
    head.prepared_on ? `prepared ${longDate(head.prepared_on)}` : ''].filter(Boolean).join(', ');
  if (stamp) out.push(`    <p>${esc(stamp)}.</p>`);
  out.push('  </footer>', '</article>', '</body>', '</html>', '');

  return out.join('\n');
}

module.exports = {
  name: 'client-itinerary',
  description: 'The client-facing narrative itinerary, in Markdown and one standalone HTML page, with the state of every supplied line printed beside it.',
  outputs(trip) {
    return new Map([
      ['client-itinerary.md', buildMarkdown(trip)],
      ['client-itinerary.html', buildHtml(trip)]
    ]);
  },
  buildMarkdown, buildHtml, marks, inclusionMark, legend, coveredSlots, dayGroups,
  esc, mdText, dateRange, longDate, durationPhrase
};
