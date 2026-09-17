/* consistency-audit — cross-check one trip record against itself and print what disagrees.

   Two printed iterations of this trip were compared by hand once. Six things disagreed, and
   finding them took an afternoon. Every check below is one of those classes of disagreement,
   written against the record instead of against the paper, so the seventh trip does not need
   the afternoon.

   The audit never guesses which of two printings is right. It says they disagree, names the
   record ids involved, and says what would settle it.

   Deterministic: reads the trip record and schema.cjs only. No clock, no randomness, no I/O. */

const S = require('../schema.cjs');
const { lines, supplierIndex } = require('../load.cjs');

/* ---------------------------------------------------------------- text helpers */

/* Markdown table cell. `|` must be escaped or the row silently loses a column. */
const cell = value => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
const oneline = value => String(value ?? '').replace(/\r?\n/g, ' ').trim();
/* A recorded note quoted mid-sentence: drop its own closing stop so the sentence keeps one. */
const phrase = value => oneline(value).replace(/\s*\.$/, '');
const quote = value => `"${oneline(value)}"`;
const code = value => `\`${oneline(value)}\``;
const money = amount => typeof amount === 'number'
  ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : '—';
const signedMoney = amount => `${amount > 0 ? '+' : amount < 0 ? '-' : ''}${money(Math.abs(amount))}`;
const slug = value => oneline(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const unique = values => [...new Set(values)];
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const sentences = text => oneline(text).split(/(?<=[.;!?])\s+/).filter(Boolean);

const rawWords = text => oneline(text).match(/[A-Za-z0-9]+/g) || [];
const words = text => rawWords(text).map(word => word.toLowerCase());

/* The longest common subsequence of two token runs, as matched [i, j] pairs. Ties always
   advance in `a` first, so the alignment of a given pair of strings never changes. */
function align(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

/* Does a printed string name a business by a *different* name than the record holds?

   The distinction that matters is substitution versus truncation. "Tickets to the Cirque De La
   Symphonie" drops the trailing half of the supplier's recorded name — a shortened reference,
   not a defect. "High Street Climbing and Fitness Center" keeps the shape of the name and swaps
   a word out of the middle of it. So: align the two token runs, and report only the gaps that
   sit *between* two matched words and carry a foreign word in the printed text. Leading and
   trailing differences are truncation and are left alone. */
function nameDrift(name, printed) {
  const supplierRaw = rawWords(name);
  const printedRaw = rawWords(printed);
  const supplier = supplierRaw.map(word => word.toLowerCase());
  const text = printedRaw.map(word => word.toLowerCase());
  if (supplier.length < 2 || text.length < 2) return null;
  const pairs = align(supplier, text);
  if (pairs.length < 2) return null;

  const swaps = [];
  for (let k = 0; k < pairs.length - 1; k++) {
    const [si, ti] = pairs[k];
    const [sj, tj] = pairs[k + 1];
    const recorded = supplierRaw.slice(si + 1, sj);
    const onThePage = printedRaw.slice(ti + 1, tj);
    if (recorded.length && onThePage.length) swaps.push({ recorded, onThePage });
  }
  return swaps.length ? { matched: pairs.length, swaps } : null;
}

/* Which words one wording has that the other does not. Used for contractual text, where a
   single inserted word changes what the clause excludes. */
function wordDiff(base, variant) {
  const baseRaw = rawWords(base);
  const variantRaw = rawWords(variant);
  const pairs = align(baseRaw.map(word => word.toLowerCase()), variantRaw.map(word => word.toLowerCase()));
  const keptBase = new Set(pairs.map(([i]) => i));
  const keptVariant = new Set(pairs.map(([, j]) => j));
  return {
    removed: baseRaw.filter((_, i) => !keptBase.has(i)),
    added: variantRaw.filter((_, j) => !keptVariant.has(j))
  };
}

/* Does one string name another outright? Used to ask whether a sold inclusion names a specific
   candidate venue. Deliberately strict — the candidate's words must appear together, in order,
   with nothing between them. A scattered subsequence is not a venue being asserted: "a public
   restaurant with the house band" does not name "Public House". */
function namesInFull(text, candidate) {
  const wanted = words(candidate);
  const found = words(text);
  if (!wanted.length || wanted.length > found.length) return false;
  for (let start = 0; start <= found.length - wanted.length; start++) {
    if (wanted.every((word, offset) => found[start + offset] === word)) return true;
  }
  return false;
}

/* ---------------------------------------------------------------- clock helpers */

const toMinutes = time => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(oneline(time));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
const fromMinutes = minutes =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const CLOCK = /\b(\d{1,2}):([0-5]\d)\s*(a\.?m\.?|p\.?m\.?)?/gi;

function readClock(match) {
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = (match[3] || '').toLowerCase().replace(/\./g, '');
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour > 23) return null;
  return { printed: match[0].trim(), minutes: hour * 60 + minute };
}

const CUES = {
  earliest: /\b(first|earliest|opens?|opening|doors open|no earlier than|not before)\b/,
  latest: /\b(last|latest|closes?|closing|no later than|must be out)\b/,
  requested: /\b(submitted for|requested|request for|asked for|booked for|reserved for)\b/
};

/* What kind of time this is, decided by the cue nearest to its left. One sentence can hold two
   different kinds — "the gardens open at 09:00 and close at 17:00" is an opening time and a
   closing time, not two of each — and a run of words with no cue in it constrains nothing. */
function classifyLeadIn(leadIn) {
  let best = null;
  for (const [kind, cue] of Object.entries(CUES)) {
    const pattern = new RegExp(cue.source, 'gi');
    let match;
    while ((match = pattern.exec(leadIn)) !== null) {
      if (!best || match.index > best.index) best = { kind, index: match.index };
    }
  }
  return best && best.kind;
}

/* Every time in a piece of prose, with the kind its own lead-in gives it. */
function classifiedTimes(text) {
  const found = [];
  for (const sentence of sentences(text)) {
    const pattern = new RegExp(CLOCK.source, 'gi');
    let cursor = 0;
    let match;
    while ((match = pattern.exec(sentence)) !== null) {
      const clock = readClock(match);
      const leadIn = sentence.slice(cursor, match.index);
      cursor = match.index + match[0].length;
      if (!clock) continue;
      const kind = classifyLeadIn(leadIn);
      if (kind) found.push({ ...clock, kind, sentence: sentence.trim() });
    }
  }
  return found;
}

/* Every sentence recorded against a supplier, with where it was recorded. A margin note, a
   term and an attempt outcome are all evidence; the record says which each one is. */
function supplierStatements(supplier) {
  const out = [];
  const push = (where, text) => {
    if (typeof text === 'string' && text.trim()) out.push({ where, text: text.trim() });
  };
  for (const [key, value] of Object.entries(supplier.terms || {})) push(`terms.${key}`, value);
  push('note', supplier.note);
  for (const attempt of supplier.attempts || []) push(`attempt ${attempt.date} (${attempt.channel})`, attempt.outcome);
  return out;
}

/* The times a supplier's own record constrains, of one kind. A time with no cue in front of it
   contributes nothing — "the printed itinerary puts the group there at 08:30" describes the
   page, it does not constrain the supplier, and reading it as one would turn the record's own
   description of the defect into a second defect. */
function timeConstraints(supplier, kind) {
  const out = [];
  for (const statement of supplierStatements(supplier)) {
    for (const time of classifiedTimes(statement.text)) {
      if (time.kind === kind) out.push({ ...time, where: statement.where });
    }
  }
  /* One constraint per clock time: the same fact is usually written twice, as a margin note and
     as the call that produced it. A stable sort picks the wording, not the order of the record. */
  const byTime = new Map();
  for (const entry of out.sort((a, b) => a.minutes - b.minutes || a.where.localeCompare(b.where))) {
    if (!byTime.has(entry.minutes)) byTime.set(entry.minutes, entry);
  }
  return [...byTime.values()];
}

/* ---------------------------------------------------------------- record context */

function context(trip) {
  const suppliers = supplierIndex(trip);
  const all = lines(trip);
  const slotById = new Map(all.map(entry => [entry.slot.id, entry]));
  const sources = new Map((trip.sources || []).map(source => [source.id, source]));
  const inclusions = trip.inclusions || [];

  /* A supplier is "sold" when the client is paying for something it provides. That is the set
     where a missing rate or a missing deadline is a commercial exposure rather than a note. */
  const sold = new Set();
  for (const inclusion of inclusions) {
    if (inclusion.supplier_id) sold.add(inclusion.supplier_id);
    for (const slotId of inclusion.slot_ids || []) {
      const entry = slotById.get(slotId);
      if (entry && entry.slot.supplier_id) sold.add(entry.slot.supplier_id);
    }
  }

  const inclusionsForSlot = slotId => inclusions.filter(inclusion => (inclusion.slot_ids || []).includes(slotId));
  /* Never print a raw or missing id as if it were a business. An id that resolves to nothing is
     said out loud, and `record.unknown-supplier` reports it as its own finding. */
  const supplierName = id => {
    if (!id) return 'no supplier recorded';
    const supplier = suppliers.get(id);
    return supplier && supplier.name ? supplier.name : `an unknown supplier "${id}"`;
  };
  const slotWhen = slotId => {
    const entry = slotById.get(slotId);
    return entry ? `${entry.day.label}, ${entry.slot.time}` : 'not on the itinerary';
  };
  const slotsOf = id => all.filter(entry => entry.slot.supplier_id === id);
  const handwrittenOnly = ids => Boolean((ids || []).length)
    && (ids || []).every(id => (sources.get(id) || {}).kind === 'handwritten');

  return {
    trip, suppliers, all, slotById, sources, inclusions, sold,
    inclusionsForSlot, supplierName, slotWhen, slotsOf, handwrittenOnly
  };
}

/* Findings keep the project's shape — { severity, check, id, message } — and add the ids the
   finding ties together, the action it asks for, and a key that is stable across runs. */
/* One id for a rate in the price build, built the same way by every check that mentions it —
   including when the rate names no supplier at all, which is itself a finding. */
const rateId = rate => `pricing:rate:${rate.supplier_id || 'no-supplier'}:${slug(rate.label || rate.basis) || 'rate'}`;
const componentId = component => `pricing:component:${slug(component.label) || 'unlabelled'}`;

const make = (definition, id, message, action, refs = [], detail = []) => ({
  severity: definition.severity,
  check: definition.check,
  id,
  key: `${definition.check}#${id}`,
  refs: unique(refs.filter(Boolean)),
  message: oneline(message),
  action: oneline(action),
  detail
});

/* ---------------------------------------------------------------- the checks

   Declared order is report order within a severity. Each one says, in its own words, what it
   looks for — a check that cannot explain itself to the person holding the proposal is not
   worth running. */

const CHECKS = [

  {
    check: 'inclusion.no-slot',
    severity: 'error',
    title: 'Sold, with nowhere in the itinerary to happen',
    looks_for: 'An inclusion the client pays for whose list of itinerary slots is empty. It is on the inclusions page and inside the price, and no day of the trip delivers it.',
    run(ctx) {
      return ctx.inclusions
        .filter(inclusion => !(inclusion.slot_ids || []).length)
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
        .map(inclusion => {
          const elsewhere = inclusion.supplier_id ? ctx.slotsOf(inclusion.supplier_id) : [];
          const neighbour = elsewhere.length
            ? ` The same supplier is already on the itinerary at ${code(elsewhere[0].slot.id)} (${ctx.slotWhen(elsewhere[0].slot.id)}), so there is an obvious place for it — but choosing is an operator decision, not one this page can make.`
            : '';
          return make(this,
            `inclusion:${inclusion.id}`,
            `${quote(inclusion.text)} is sold as an inclusion${inclusion.supplier_id ? ` against ${ctx.supplierName(inclusion.supplier_id)}` : ''} and no slot in the ${(ctx.trip.days || []).length}-day itinerary delivers it. The client is paying for something the schedule never does.`,
            `Give it a time on the itinerary, or take it off the inclusions page and out of the price.${neighbour}`,
            [`inclusion:${inclusion.id}`, inclusion.supplier_id && `supplier:${inclusion.supplier_id}`]);
        });
    }
  },

  {
    check: 'name.drift',
    severity: 'error',
    title: 'A business named one way on one page and another way on another',
    looks_for: 'A printed line — an inclusion or an itinerary title — that names its supplier with a word swapped out of the middle of the recorded name. Shortening a long name is not a defect; substituting a word inside it is.',
    run(ctx) {
      const references = [
        ...ctx.inclusions.filter(inclusion => inclusion.supplier_id).map(inclusion => ({
          kind: 'inclusions page', id: `inclusion:${inclusion.id}`, text: inclusion.text, supplier_id: inclusion.supplier_id
        })),
        ...ctx.all.filter(entry => entry.slot.supplier_id).map(entry => ({
          kind: 'itinerary', id: `slot:${entry.slot.id}`, text: entry.slot.title, supplier_id: entry.slot.supplier_id
        }))
      ].sort((a, b) => a.id.localeCompare(b.id));

      const findings = [];
      for (const reference of references) {
        const supplier = ctx.suppliers.get(reference.supplier_id);
        if (!supplier || !supplier.name) continue;
        const drift = nameDrift(supplier.name, reference.text);
        if (!drift) continue;
        const swaps = drift.swaps
          .map(swap => `prints ${quote(swap.onThePage.join(' '))} where the record has ${quote(swap.recorded.join(' '))}`)
          .join('; ');
        findings.push(make(this,
          reference.id,
          `The ${reference.kind} ${swaps}. Printed: ${quote(reference.text)}. Recorded supplier name: ${quote(supplier.name)}. One business, two names, and one of them is wrong on a page the client reads.`,
          'Settle which name is the business\'s own, correct the printed line, and let every document take the name from the supplier record instead of from the last printing.',
          [reference.id, `supplier:${supplier.id}`]));
      }
      return findings;
    }
  },

  {
    check: 'supplier.name-variants',
    severity: 'error',
    title: 'One supplier carrying two names across two printings',
    looks_for: 'A supplier whose record holds more than one observed name or venue for the same thing, with nothing recording which one is current.',
    run(ctx) {
      const findings = [];
      for (const supplier of [...(ctx.trip.suppliers || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
        for (const [key, value] of Object.entries(supplier).sort(([a], [b]) => a.localeCompare(b))) {
          if (!/_variants$/.test(key) || !Array.isArray(value)) continue;
          const variants = value.filter(variant => variant && (variant.name || variant.text));
          const names = unique(variants.map(variant => variant.name || variant.text));
          if (names.length < 2) continue;
          const label = key.replace(/_variants$/, '').replace(/_/g, ' ');
          const seen = variants
            .map(variant => `${quote(variant.name || variant.text)}${variant.observed_in ? ` (${variant.observed_in})` : ''}`)
            .join(' and ');
          findings.push(make(this,
            `supplier:${supplier.id}`,
            `${supplier.name} carries ${names.length} different ${label} names for the same line: ${seen}. Both were printed. Nothing in the record says which one the group is actually going to.`,
            `Ask the counterparty which ${label} the booking is against, make the answer the supplier's recorded ${label}, and keep the other as a superseded variant with the date it was printed. Until then no document should print either one as settled.`,
            [`supplier:${supplier.id}`, ...ctx.slotsOf(supplier.id).map(entry => `slot:${entry.slot.id}`)]));
        }
      }
      return findings;
    }
  },

  {
    check: 'clause.wording-drift',
    severity: 'error',
    title: 'Contractual wording that changed between printings',
    looks_for: 'A clause whose record holds a second observed wording. In contractual text one inserted word changes what is excluded, and the two printings cannot both be the agreement.',
    run(ctx) {
      const clauses = [
        ...(ctx.trip.exclusions || []).map(clause => ({ kind: 'exclusion', clause })),
        ...(ctx.trip.inclusions || []).map(clause => ({ kind: 'inclusion', clause }))
      ];
      const findings = [];
      for (const { kind, clause } of clauses) {
        for (const variant of clause.observed_variants || []) {
          if (!variant.text || oneline(variant.text) === oneline(clause.text)) continue;
          const { added, removed } = wordDiff(clause.text, variant.text);
          const changes = [
            added.length ? `adds ${added.map(quote).join(', ')}` : null,
            removed.length ? `drops ${removed.map(quote).join(', ')}` : null
          ].filter(Boolean).join(' and ');
          findings.push(make(this,
            `${kind}:${clause.id}`,
            `Two printings carry two wordings of the same clause: the second ${changes || 'is worded differently'}${variant.observed_in ? ` (${variant.observed_in})` : ''}. This is the text that says what the client is not paying for, so the two wordings exclude different things.`,
            'Decide which wording is current, make it the clause text, and keep the other as an observed variant with the date it was printed. A clause that changes quietly between redrafts is the one a dispute lands on.',
            [`${kind}:${clause.id}`, ...(clause.source_ids || []).map(id => `source:${id}`)],
            [
              `- ${code(`${kind}:${clause.id}`)} as this record holds it: ${quote(clause.text)}`,
              `- ${code(`${kind}:${clause.id}`)} as observed ${variant.observed_in ? `in ${variant.observed_in}` : 'elsewhere'}: ${quote(variant.text)}`
            ]));
        }
      }
      return findings;
    }
  },

  {
    check: 'slot.time-vs-supplier-term',
    severity: 'error',
    title: 'A printed time the supplier cannot meet',
    looks_for: 'A slot time that contradicts a time recorded against its own supplier — an opening or first-departure time the printed itinerary is earlier than, or a closing time it is later than.',
    run(ctx) {
      const findings = [];
      for (const supplier of [...(ctx.trip.suppliers || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
        const earliest = timeConstraints(supplier, 'earliest');
        const latest = timeConstraints(supplier, 'latest');
        for (const entry of ctx.slotsOf(supplier.id)) {
          const printed = toMinutes(entry.slot.time);
          if (printed === null) continue;
          const tooEarly = earliest.filter(constraint => printed < constraint.minutes)
            .sort((a, b) => b.minutes - a.minutes)[0];
          const tooLate = latest.filter(constraint => printed > constraint.minutes)
            .sort((a, b) => a.minutes - b.minutes)[0];
          const breach = tooEarly || tooLate;
          if (!breach) continue;
          findings.push(make(this,
            `slot:${entry.slot.id}`,
            `The itinerary prints ${entry.slot.time} on ${entry.day.label} for ${quote(entry.slot.title)}. ${supplier.name}'s own recorded ${tooEarly ? 'earliest' : 'latest'} time is ${fromMinutes(breach.minutes)}, from ${code(breach.where)}: ${quote(breach.sentence)}. The printed time cannot be met as written.`,
            `Move the line to ${tooEarly ? `${fromMinutes(breach.minutes)} or later` : `${fromMinutes(breach.minutes)} or earlier`}, or get the supplier to agree the printed time in writing. Reprinting the page without changing one of the two only reprints the contradiction — and everything after it on the day moves with it.`,
            [`slot:${entry.slot.id}`, `supplier:${supplier.id}`,
              ...ctx.inclusionsForSlot(entry.slot.id).map(inclusion => `inclusion:${inclusion.id}`)]));
        }
      }
      return findings;
    }
  },

  {
    check: 'inclusion.sells-unsettled-line',
    severity: 'error',
    title: 'A named venue sold while alternatives are still being shopped',
    looks_for: 'Narrowly: an itinerary line still in the sourcing state, whose supplier record holds other candidates being contacted, where a sold inclusion names one of those candidates. A sourcing line is not a defect by itself — asserting a specific venue for it on the page the client pays from is.',
    run(ctx) {
      const findings = [];
      for (const entry of ctx.all) {
        if (entry.slot.state !== 'sourcing') continue;
        const supplier = ctx.suppliers.get(entry.slot.supplier_id);
        if (!supplier) continue;
        const candidates = supplier.candidates || [];
        const alternatives = candidates.filter(candidate => !/printed/i.test(candidate.status || ''));
        if (!alternatives.length) continue;
        for (const inclusion of ctx.inclusionsForSlot(entry.slot.id).sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
          const named = candidates.find(candidate => namesInFull(inclusion.text, candidate.name));
          if (!named) continue;
          findings.push(make(this,
            `inclusion:${inclusion.id}`,
            `The inclusions page sells ${quote(inclusion.text)}, naming ${named.name}. The itinerary line it pays for, ${code(entry.slot.id)} on ${entry.day.label}, is in state ${code(entry.slot.state)} — the honest client word for it is ${quote(S.clientWord(entry.slot.state))} — while ${alternatives.length} other venues are recorded as contacted for the same meal (${alternatives.map(candidate => candidate.name).join(', ')}).`,
            'Either settle the venue before the next printing, or print the client word beside the line and drop the venue name from the inclusion until it is settled. This is the defect a client can catch without seeing a single one of the operator\'s records.',
            [`inclusion:${inclusion.id}`, `slot:${entry.slot.id}`, `supplier:${supplier.id}`]));
        }
      }
      return findings;
    }
  },

  {
    check: 'pricing.component-without-supplier',
    severity: 'error',
    title: 'Money in the price with no counterparty behind it',
    looks_for: 'A per-person cost component carrying real money and no supplier. A blended line cannot be checked against anyone\'s terms, cannot be re-quoted when one supplier moves, and cannot be reconciled when an invoice arrives. Operator margin lines are not counted: they have no counterparty by nature.',
    run(ctx) {
      const pricing = ctx.trip.pricing || {};
      const margin = /^(commission|margin|mark ?-? ?up|agency fee)$/i;
      /* A deposit is money paid, not a rate, so it is not offered here as one. */
      const rateBases = ['per_person', 'per_group', 'per_room_per_night'];
      const knownRates = (pricing.known_unit_prices || [])
        .filter(rate => typeof rate.amount === 'number' && rateBases.includes(rate.basis));
      const blended = (pricing.components_per_person || [])
        .filter(component => !component.supplier_id && typeof component.amount === 'number'
          && component.amount > 0 && !margin.test(oneline(component.label)));
      const total = blended.reduce((sum, component) => sum + component.amount, 0);
      return blended.map((component, index) => make(this,
        componentId(component),
        `${quote(component.label)} carries ${money(component.amount)} per person and no supplier${component.note ? ` — ${phrase(component.note)}` : ''}. With no counterparty on the line, no supplier's terms can be checked against it and no invoice can be reconciled to it.`,
        'Break the blended line into one line per supplier at that supplier\'s own rate and basis. Until that is done a headcount change re-quotes a number nobody can take apart, which is exactly what makes a re-quote cost an afternoon.',
        [componentId(component), ...(component.source_ids || []).map(id => `source:${id}`)],
        index === 0
          ? [
            `${money(total)} per person of the published price sits on ${plural(blended.length, 'line')} with no counterparty.`,
            knownRates.length
              ? `Elsewhere the record does hold ${plural(knownRates.length, 'real per-supplier rate')}, each at its own basis — ${knownRates.map(rate => `${ctx.supplierName(rate.supplier_id)}${rate.label ? ` (${rate.label})` : ''} ${money(rate.amount)} ${((S.COST_BASIS[rate.basis] || {}).label || rate.basis).toLowerCase()}`).join('; ')} — and nothing connects any of them to the blend above.`
              : 'The record holds no per-supplier rate that the blend could be rebuilt from.'
          ]
          : []));
    }
  },

  {
    check: 'pricing.table-direction-conflict',
    severity: 'error',
    title: 'Two published price tables that disagree in both directions',
    looks_for: 'A second observed price table whose differences from the published one do not run one way. A uniform change is a decision; changes running in opposite directions inside one table are a redraft nobody reconciled.',
    run(ctx) {
      const pricing = ctx.trip.pricing || {};
      const variant = pricing.observed_variant;
      if (!variant || !variant.published || !pricing.published) return [];
      const tiers = Object.keys(pricing.published)
        .filter(tier => variant.published[tier])
        .sort((a, b) => Number(a) - Number(b));
      const deltas = [];
      for (const tier of tiers) {
        for (const occupancy of S.OCCUPANCY) {
          const here = pricing.published[tier][occupancy];
          const there = variant.published[tier][occupancy];
          if (typeof here !== 'number' || typeof there !== 'number') continue;
          deltas.push({ tier, occupancy, here, there, delta: Number((there - here).toFixed(2)) });
        }
      }
      const up = deltas.filter(entry => entry.delta > 0);
      const down = deltas.filter(entry => entry.delta < 0);
      if (!up.length || !down.length) return [];

      const table = [
        '',
        `| Tier | ${S.OCCUPANCY.map(occupancy => cell(occupancy[0].toUpperCase() + occupancy.slice(1))).join(' | ')} |`,
        `|---|${S.OCCUPANCY.map(() => '---').join('|')}|`
      ];
      for (const tier of tiers) {
        const row = S.OCCUPANCY.map(occupancy => {
          const entry = deltas.find(delta => delta.tier === tier && delta.occupancy === occupancy);
          return entry ? `${money(entry.here)} → ${money(entry.there)} (${signedMoney(entry.delta)})` : '—';
        });
        table.push(`| ${cell(tier)} paying | ${row.map(cell).join(' | ')} |`);
      }
      /* A partially recorded second table must not turn into "$NaN" on a page someone reads. */
      const gap = (table, tier) => {
        const row = table[tier] || {};
        return typeof row.single === 'number' && typeof row.quad === 'number' ? row.single - row.quad : null;
      };
      const supplement = tiers
        .map(tier => `at ${tier} paying, ${money(gap(pricing.published, tier))} here against ${money(gap(variant.published, tier))} there`)
        .join('; ');

      return [make(this,
        'pricing:published',
        `Across ${deltas.length} cells the other printing moves ${up.length} up and ${down.length} down, by as much as ${money(Math.max(...deltas.map(entry => Math.abs(entry.delta))))}. The single supplement moves with them: ${supplement}. Nothing records which table is the one to quote.`,
        'Decide which table is current, mark the other superseded with the date it was printed, and generate the price from the components instead of retyping cells. Twelve cells retyped by hand is twelve chances to disagree with yourself.',
        ['pricing:published', 'pricing:observed_variant'],
        [
          `Cell by cell, this record (\`${ctx.trip.trip.version}\`) against \`${variant.version || 'the other printing'}\`:`,
          ...table,
          '',
          variant.note ? `Recorded note: ${oneline(variant.note)}` : ''
        ])];
    }
  },

  {
    check: 'record.unknown-supplier',
    severity: 'error',
    title: 'A line pointing at a supplier that is not in the record',
    looks_for: 'An inclusion or a price line naming a supplier id the record does not hold, or a rate belonging to nobody. A dangling reference is worse than a missing one: the checks that would have caught a wrong number go quiet instead.',
    run(ctx) {
      const pricing = ctx.trip.pricing || {};
      const entries = [
        ...ctx.inclusions.map(inclusion => ({
          id: `inclusion:${inclusion.id}`, what: `The inclusion ${quote(inclusion.text)}`,
          supplier_id: inclusion.supplier_id, required: false
        })),
        ...(pricing.components_per_person || []).map((component, index) => ({
          id: componentId(component),
          what: `The cost component ${quote(component.label)}`,
          supplier_id: component.supplier_id, required: false
        })),
        ...(pricing.known_unit_prices || []).map((rate, index) => ({
          id: rateId(rate),
          what: `The ${money(rate.amount)} rate${rate.label ? ` (${rate.label})` : ''} in the price build`,
          supplier_id: rate.supplier_id, required: true
        }))
      ];
      return entries
        .filter(entry => entry.required ? !ctx.suppliers.has(entry.supplier_id)
          : Boolean(entry.supplier_id) && !ctx.suppliers.has(entry.supplier_id))
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(entry => make(this, entry.id,
          entry.supplier_id
            ? `${entry.what} names supplier ${code(entry.supplier_id)}, and no supplier in the record has that id.`
            : `${entry.what} names no supplier at all, and a rate has to belong to a counterparty.`,
          'Point the line at the supplier it belongs to, or add that supplier to the record. While the reference dangles, every check that reads the supplier\'s terms skips this line in silence.',
          [entry.id, entry.supplier_id && `supplier:${entry.supplier_id}`]));
    }
  },

  {
    check: 'pricing.rate-contradiction',
    severity: 'error',
    title: 'The same rate recorded twice, at two amounts',
    looks_for: 'A per-supplier rate in the price build that disagrees with the same supplier\'s own recorded terms. Two numbers for one rate means one document is already wrong.',
    run(ctx) {
      const findings = [];
      for (const rate of (ctx.trip.pricing || {}).known_unit_prices || []) {
        const supplier = ctx.suppliers.get(rate.supplier_id);
        if (!supplier || typeof rate.amount !== 'number') continue;
        const label = oneline(rate.label).toLowerCase();
        const price = (supplier.terms || {}).unit_price;
        const deposit = (supplier.terms || {}).deposit;
        let recorded = null;
        if (!label && price && price.basis === rate.basis && typeof price.amount === 'number') {
          recorded = { amount: price.amount, where: 'terms.unit_price' };
        }
        if (label === 'deposit' && deposit && typeof deposit.amount === 'number') {
          recorded = { amount: deposit.amount, where: 'terms.deposit' };
        }
        if (!recorded || recorded.amount === rate.amount) continue;
        findings.push(make(this,
          rateId(rate),
          `The price build carries ${money(rate.amount)} for ${supplier.name}${rate.label ? ` (${rate.label})` : ''} while ${code(recorded.where)} on the same supplier says ${money(recorded.amount)}.`,
          'Reconcile the two against the supplier\'s written quote and keep one number. A price built on a rate the supplier record contradicts will not survive the invoice.',
          [`supplier:${rate.supplier_id}`, 'pricing:known_unit_prices']));
      }
      return findings.sort((a, b) => a.id.localeCompare(b.id));
    }
  },

  {
    check: 'pricing.rate-without-source',
    severity: 'error',
    title: 'A number in the price with no evidence behind it',
    looks_for: 'A price component or per-supplier rate with no source recorded. Every figure that reaches a client should be traceable to the page, screen or email it came from.',
    run(ctx) {
      const pricing = ctx.trip.pricing || {};
      const entries = [
        ...(pricing.components_per_person || []).map((component, index) => ({
          id: componentId(component),
          what: `Cost component ${quote(component.label)}`,
          source_ids: component.source_ids,
          amount: component.amount
        })),
        ...(pricing.known_unit_prices || []).map((rate, index) => ({
          id: rateId(rate),
          what: `The rate for ${ctx.supplierName(rate.supplier_id)}${rate.label ? ` (${rate.label})` : ''}`,
          source_ids: rate.source_ids,
          amount: rate.amount
        }))
      ];
      return entries
        .filter(entry => typeof entry.amount === 'number' && !(entry.source_ids || []).length)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(entry => make(this, entry.id,
          `${entry.what} carries ${money(entry.amount)} and no source.`,
          'Record where the figure came from — the quote screen, the supplier\'s email, or the margin note it was written on — before it is quoted again.',
          [entry.id]));
    }
  },

  {
    check: 'slot.overruns-next',
    severity: 'error',
    title: 'A line that runs past the start of the next one',
    looks_for: 'A slot with a recorded duration that ends after the following slot begins. Recorded durations only: where a duration is not recorded the audit stays quiet rather than guessing how long something takes.',
    run(ctx) {
      const findings = [];
      for (const day of ctx.trip.days || []) {
        const slots = day.slots || [];
        for (let index = 0; index < slots.length - 1; index++) {
          const slot = slots[index];
          const next = slots[index + 1];
          const start = toMinutes(slot.time);
          const following = toMinutes(next.time);
          if (start === null || following === null || typeof slot.duration_minutes !== 'number') continue;
          const ends = start + slot.duration_minutes;
          if (ends <= following) continue;
          findings.push(make(this,
            `slot:${slot.id}`,
            `${quote(slot.title)} starts at ${slot.time} on ${day.label} and runs ${slot.duration_minutes} minutes, ending ${fromMinutes(ends)} — after ${quote(next.title)} is printed to start at ${next.time}. The day cannot happen as printed, before anyone has travelled between the two.`,
            'Shorten the first, move the second, or record the travel time between them. The printed day is what the group plans against.',
            [`slot:${slot.id}`, `slot:${next.id}`]));
        }
      }
      return findings;
    }
  },

  {
    check: 'slot.time-vs-requested-time',
    severity: 'warning',
    title: 'A printed time that is not the time actually requested',
    looks_for: 'A time a supplier was asked for, on a form or in a call, with no itinerary slot at that time. What is printed and what was requested should be the same time.',
    run(ctx) {
      const findings = [];
      for (const supplier of [...(ctx.trip.suppliers || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
        const requested = timeConstraints(supplier, 'requested');
        if (!requested.length) continue;
        const printed = ctx.slotsOf(supplier.id).map(entry => toMinutes(entry.slot.time)).filter(value => value !== null);
        if (!printed.length) continue;
        for (const ask of requested) {
          if (printed.includes(ask.minutes)) continue;
          findings.push(make(this,
            `supplier:${supplier.id}`,
            `${supplier.name} was asked for ${fromMinutes(ask.minutes)} (${code(ask.where)}: ${quote(ask.sentence)}) and the itinerary prints ${printed.map(fromMinutes).join(', ')}.`,
            'Re-send the request at the printed time, or print the requested time. The supplier will hold whichever one it received.',
            [`supplier:${supplier.id}`, ...ctx.slotsOf(supplier.id).map(entry => `slot:${entry.slot.id}`)]));
        }
      }
      return findings;
    }
  },

  {
    check: 'supplier.terms-incomplete',
    severity: 'warning',
    title: 'Sold to the client, with no rate or no deadline recorded',
    looks_for: 'A supplier the client is already paying for whose record holds no rate, or no date of any kind — no final-headcount deadline, no balance date, no release date. A line with no deadline never becomes urgent, so nobody chases it until someone else does.',
    run(ctx) {
      const pricing = ctx.trip.pricing || {};
      const rateBases = ['per_person', 'per_group', 'per_room_per_night'];
      const findings = [];
      for (const supplier of [...(ctx.trip.suppliers || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
        if (!ctx.sold.has(supplier.id)) continue;
        const terms = supplier.terms || {};
        const hasUnitPrice = terms.unit_price && typeof terms.unit_price.amount === 'number';
        const hasBuildRate = (pricing.known_unit_prices || []).some(rate =>
          rate.supplier_id === supplier.id && typeof rate.amount === 'number' && rateBases.includes(rate.basis));
        const hasComponent = (pricing.components_per_person || []).some(component =>
          component.supplier_id === supplier.id && typeof component.amount === 'number');
        const hasRate = hasUnitPrice || hasBuildRate || hasComponent;
        const deadlines = [
          typeof terms.final_headcount_due_business_days === 'number' ? 'a final-headcount deadline' : null,
          typeof terms.balance_due_days === 'number' ? 'a balance date' : null,
          terms.release_date ? 'a release date' : null
        ].filter(Boolean);
        const missing = [!hasRate ? 'no rate' : null, !deadlines.length ? 'no deadline' : null].filter(Boolean);
        if (!missing.length) continue;
        const deposit = (terms.deposit || {}).amount;
        findings.push(make(this,
          `supplier:${supplier.id}`,
          `${supplier.name} is sold to the client and has ${missing.join(' and ')} recorded${typeof deposit === 'number' ? ` (a ${money(deposit)} deposit is recorded, which is money paid, not a rate)` : ''}${deadlines.length ? `; it does hold ${deadlines.join(' and ')}` : ''}.`,
          `${!hasRate ? 'Get the group rate and its basis in writing. ' : ''}${!deadlines.length ? 'Ask when the final headcount and the balance are due, and record the dates. ' : ''}Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself.`,
          [`supplier:${supplier.id}`, ...ctx.slotsOf(supplier.id).map(entry => `slot:${entry.slot.id}`)]));
      }
      return findings;
    }
  },

  {
    check: 'pricing.component-without-amount',
    severity: 'warning',
    title: 'A cost line with no amount',
    looks_for: 'A per-person component that names a cost and carries no number. The published price cannot be rebuilt while one of its parts is unknown.',
    run(ctx) {
      return ((ctx.trip.pricing || {}).components_per_person || [])
        .filter(component => component.amount === null || component.amount === undefined)
        .sort((a, b) => oneline(a.label).localeCompare(oneline(b.label)))
        .map(component => make(this,
          componentId(component),
          `${quote(component.label)} is a cost component with no amount${component.supplier_id ? `, against ${ctx.supplierName(component.supplier_id)}` : ''}${component.note ? ` — ${phrase(component.note)}` : ''}. The published per-person price cannot be rebuilt from its parts while one of them is unknown.`,
          'Recover the figure from the quote system or the supplier and record it, so the price table can be generated rather than transcribed.',
          [componentId(component), component.supplier_id && `supplier:${component.supplier_id}`]));
    }
  },

  {
    check: 'evidence.handwritten-only',
    severity: 'warning',
    title: 'A fact that survives only as a margin note',
    looks_for: 'Any part of the record whose every source is handwritten. These are real facts — rates, a comp ratio, a tour manager assignment — that live in ballpoint on a page that gets reprinted, and a reprint loses them.',
    run(ctx) {
      const entries = [];
      for (const member of (ctx.trip.trip || {}).staffing || []) {
        entries.push({
          id: `staffing:${slug(member.role)}`,
          what: `The ${member.role} assignment`,
          source_ids: member.source_ids,
          note: member.note
        });
      }
      for (const item of (ctx.trip.trip || {}).verification || []) {
        entries.push({
          id: `verification:${slug(item.what)}`,
          what: oneline(item.what),
          source_ids: item.source_ids,
          note: item.note
        });
      }
      for (const supplier of ctx.trip.suppliers || []) {
        entries.push({
          id: `supplier:${supplier.id}`,
          what: `Everything recorded about ${supplier.name}`,
          source_ids: supplier.source_ids,
          note: supplier.note
        });
      }
      for (const rate of (ctx.trip.pricing || {}).known_unit_prices || []) {
        entries.push({
          id: rateId(rate),
          what: `The ${money(rate.amount)} ${((S.COST_BASIS[rate.basis] || {}).label || rate.basis).toLowerCase()} rate for ${ctx.supplierName(rate.supplier_id)}${rate.label ? ` (${rate.label})` : ''}`,
          source_ids: rate.source_ids
        });
      }
      return entries
        .filter(entry => ctx.handwrittenOnly(entry.source_ids))
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(entry => make(this, entry.id,
          `${entry.what} rests entirely on ${entry.source_ids.map(id => `${id} (${(ctx.sources.get(id) || {}).locator || 'a handwritten note'})`).join('; ')}${entry.note ? ` — ${phrase(entry.note)}` : ''}. Nothing else in the record carries it.`,
          'Confirm it against something durable — the supplier\'s own email, or the quote system — and record that source alongside. This record holds the note, which is the point; the next reprint of the page will not.',
          [entry.id, ...(entry.source_ids || []).map(id => `source:${id}`)]));
    }
  }
];

/* ---------------------------------------------------------------- audit */

function audit(trip) {
  const ctx = context(trip);
  const results = CHECKS.map(definition => ({ definition, findings: definition.run.call(definition, ctx) }));
  const rank = severity => (severity === 'error' ? 0 : 1);
  const order = new Map(CHECKS.map((definition, index) => [definition.check, index]));
  const findings = results
    .flatMap(result => result.findings)
    .sort((a, b) => rank(a.severity) - rank(b.severity)
      || order.get(a.check) - order.get(b.check)
      || a.id.localeCompare(b.id)
      || a.message.localeCompare(b.message));

  /* One check can legitimately raise two findings against the same record id — two observed
     wordings of one clause, two variant fields on one supplier. The key still has to identify
     exactly one finding, so a repeat is numbered, in the order the report prints them. */
  const seen = new Map();
  for (const finding of findings) {
    const base = `${finding.check}#${finding.id}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    finding.key = count === 1 ? base : `${base}~${count}`;
  }
  return { results, findings, checks: CHECKS.length };
}

/* ---------------------------------------------------------------- the page */

function buildMarkdown(trip) {
  const { results, findings } = audit(trip);
  const head = trip.trip;
  const errors = findings.filter(finding => finding.severity === 'error');
  const warnings = findings.filter(finding => finding.severity === 'warning');
  /* Keyed on the finding itself, so two findings can never share a number. */
  const tags = new Map();
  errors.forEach((finding, index) => tags.set(finding, `E${index + 1}`));
  warnings.forEach((finding, index) => tags.set(finding, `W${index + 1}`));
  const titles = new Map(results.map(result => [result.definition.check, result.definition.title]));

  const fired = results.filter(result => result.findings.length);
  const silent = results.filter(result => !result.findings.length);
  const ordered = [
    ...fired.filter(result => result.definition.severity === 'error'),
    ...fired.filter(result => result.definition.severity !== 'error')
  ];

  const out = [];
  out.push(`# Consistency audit — ${cell(head.title || head.id)}`, '');
  out.push(`Trip \`${head.id}\` · version \`${head.version}\` · ${head.start_date} to ${head.end_date} · prepared ${head.prepared_on}.`);
  out.push(`Generated from \`${trip._file || 'the trip record'}\` by \`pipeline/trip/renderers/consistency-audit.cjs\`. Regenerate with \`node pipeline/trip/cli.cjs render ${head.id}\`.`, '');

  out.push('## What this page is', '');
  out.push('Two printings of this trip were once compared by hand. Six things disagreed, and finding them took an afternoon.');
  out.push('This is that afternoon, done against the record instead of against the paper, so the next printing costs nothing to check.', '');
  out.push('Nothing below is an opinion about the trip. Each line is one part of the record contradicting another part, with the ids of both and what would settle it.');
  out.push('Where two printings simply differ, the audit says they differ and stops: it cannot know which one is current, and it does not guess.', '');

  out.push('## Result', '');
  out.push(`**${plural(findings.length, 'finding')} — ${plural(errors.length, 'error')}, ${plural(warnings.length, 'warning')} — from ${fired.length} of ${results.length} checks.**`, '');
  out.push('An error is a contradiction inside the record: two parts of it cannot both be true. A warning is a gap — something sold, printed or priced with the evidence for it missing.', '');
  if (findings.length) {
    out.push('| # | Severity | What is wrong | Where |', '|---|---|---|---|');
    for (const finding of [...errors, ...warnings]) {
      out.push(`| ${cell(tags.get(finding))} | ${cell(finding.severity)} | ${cell(titles.get(finding.check))} | \`${cell(finding.id)}\` |`);
    }
    out.push('');
  } else {
    out.push('No check found anything in this record.', '');
  }

  if (ordered.length) {
    out.push('## Findings', '');
    for (const result of ordered) {
      const definition = result.definition;
      out.push(`### ${cell(definition.title)}`, '');
      out.push(`\`${definition.check}\` · ${definition.severity} · ${plural(result.findings.length, 'finding')}`, '');
      out.push(`**Looks for.** ${oneline(definition.looks_for)}`, '');
      out.push('| # | Where | What is wrong | What to do |', '|---|---|---|---|');
      for (const finding of result.findings) {
        out.push(`| ${cell(tags.get(finding))} | \`${cell(finding.id)}\` | ${cell(finding.message)} | ${cell(finding.action)} |`);
      }
      out.push('');
      const detail = result.findings.flatMap(finding => finding.detail || []).map(line => oneline(line));
      if (detail.some(Boolean)) out.push(...detail, '');
    }
  }

  out.push('## Checks that found nothing', '');
  if (silent.length) {
    out.push('These ran against this record and stayed quiet. A page that says what it looked for is worth more than one that only says what it found.', '');
    out.push('| Check | Looks for |', '|---|---|');
    for (const result of silent) {
      out.push(`| \`${cell(result.definition.check)}\` | ${cell(result.definition.looks_for)} |`);
    }
    out.push('');
  } else {
    out.push('Every check found something.', '');
  }

  out.push('## How to read this page', '');
  out.push('- Every id in the **Where** column is a real id in the trip record. `inclusion:inc-imax` is the inclusion with that id; `slot:d2-ruby-falls` is that line of the itinerary.');
  out.push('- The audit compares the record with itself. It does not contact a supplier, confirm a booking, quote a price or decide anything.');
  out.push('- It reports only what the record supports. A missing rate is reported as missing, never estimated.');
  out.push('- It is regenerated from the record on every render, so this page cannot drift from the trip the way two printings drifted from each other.');
  out.push(`- The states behind the wording: ${Object.entries(S.LINE_STATES).map(([state, meta]) => `\`${state}\` prints as "${meta.client_word}"`).join(', ')}.`, '');

  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

module.exports = {
  name: 'consistency-audit',
  description: 'Cross-checks the trip record against itself and reports every place two parts of it disagree.',
  outputs(trip) {
    return new Map([['consistency-audit.md', buildMarkdown(trip)]]);
  },
  /* Exported for the tests: the findings without the page built around them. */
  audit,
  CHECKS,
  _internals: { nameDrift, wordDiff, namesInFull, timeConstraints, classifiedTimes, align }
};
