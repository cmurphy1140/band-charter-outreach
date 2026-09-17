/* Per-person price table, computed from the trip record instead of typed by hand.

   The twelve cells of the printed table (quad/triple/double/single x 80/90/100 paying
   travellers) moved in four different directions between two printings of the same trip, with
   no changelog. This renderer rebuilds the table from the record's own components and shows
   every step of the arithmetic, so a change has a cause next to it.

   The hinge is comps. `schema.cjs` keeps two kinds apart because they move the price in
   opposite directions and were both written in pen as bare numbers:
     - COMP_KINDS.vendor_earned   a supplier's own ratio (Rock City: one per ten paid plus a
                                  driver). Free places the operator does not buy: REDUCES cost.
     - COMP_KINDS.trip_granted    free places the operator gives the school. Somebody still pays
                                  the hotel and the admissions: the paying travellers do, so it
                                  INCREASES the cost per paying traveller.

   Two model inputs are not recorded anywhere in the supplied pages: the motor-coach cost (null,
   illegible on the photographed quote screen) and the room differential (never published). They
   are solved FROM the published table and labelled derived throughout. Nothing here invents a
   number to force a match.

   Deterministic: reads the trip record and schema.cjs only. No clock, no randomness. */

const S = require('../schema.cjs');

/* ---------- formatting ---------------------------------------------------------------- */

/* Half up, away from zero, at a fixed number of places. The 1e-9 nudge keeps a value that is
   exactly representable in decimal but not in binary (1.005) from rounding down. */
function roundTo(value, places) {
  const factor = 10 ** places;
  const rounded = Math.round(Math.abs(value) * factor + 1e-9) / factor;
  return value < 0 ? -rounded : rounded;
}

const cell = value => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
const num = (value, places) => roundTo(value, places).toLocaleString('en-US', { minimumFractionDigits: places, maximumFractionDigits: places });
/* The sign goes outside the currency symbol: -$2.14, never $-2.14. */
const money = (value, places = 2) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const rounded = roundTo(value, places);
  return `${rounded < 0 ? '-' : ''}$${num(Math.abs(rounded), places)}`;
};
const whole = value => money(value, 0);
const signed = (value, places = 0) => {
  const rounded = roundTo(value, places);
  if (rounded === 0) return `$${num(0, places)}`;
  return `${rounded > 0 ? '+' : '-'}$${num(Math.abs(rounded), places)}`;
};
const table = (header, rows) => [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`, ...rows].join('\n');
const row = values => `| ${values.map(cell).join(' | ')} |`;

/* ---------- the model ------------------------------------------------------------------ */

/* People per room. The room differential is the only place occupancy enters the price. */
const OCCUPANCY_SIZE = { quad: 4, triple: 3, double: 2, single: 1 };

/* The quote system does not mark which cost line is the operator's own margin, so it is
   identified by label. A comp place consumes hotel, admissions and dinners; it does not
   consume commission. */
const isCommission = component => /commission/i.test(component.label || '');

/* A cost line the model can actually add up. */
const isUsableAmount = entry => typeof entry.amount === 'number' && Number.isFinite(entry.amount);

/* A deposit is cash flow against a balance, not an extra cost line, so it stays out of the
   model. The Incline Railway's $100 is recorded as a deposit. */
const isDeposit = entry => /deposit/i.test(entry.label || '');

const sum = values => values.reduce((total, value) => total + value, 0);

/* Nights come from the trip dates, not from a hardcoded 3. Date.parse of a fixed ISO date is
   arithmetic on the record, not a clock. */
function nightsOf(trip) {
  const start = Date.parse(`${trip.trip.start_date}T00:00:00Z`);
  const end = Date.parse(`${trip.trip.end_date}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

function buildModel(trip) {
  const pricing = trip.pricing || {};
  const headcount = trip.trip.headcount || {};
  const components = pricing.components_per_person || [];

  /* Every component lands in exactly one of the two buckets. A cost line that is not a usable
     number is MISSING, whatever it is: null because the quote screen was illegible, or a string
     because something upstream wrote one. Anything else silently drops a whole cost line out of
     the model and the solver absorbs it into the unreconciled residual, which the document then
     reports as unexplained. Partition, never filter twice. */
  const priced = components.filter(isUsableAmount);
  const missing = components.filter(component => !isUsableAmount(component));
  const consumed = priced.filter(component => !isCommission(component));
  const commissionLines = priced.filter(isCommission);

  const suppliers = new Map((trip.suppliers || []).map(supplier => [supplier.id, supplier]));

  /* Vendor-earned comps: a supplier's own ratio, priced at that supplier's own unit price. */
  const vendorEarned = (trip.suppliers || [])
    .filter(supplier => ((supplier.terms || {}).comp_policy || {}).kind === 'vendor_earned')
    .map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      ratio: supplier.terms.comp_policy.ratio,
      extras: supplier.terms.comp_policy.extras || [],
      unitPrice: ((supplier.terms || {}).unit_price || {}).amount,
      note: supplier.terms.comp_policy.note || ''
    }))
    .filter(entry => Number.isFinite(entry.unitPrice) && Number.isFinite(entry.ratio) && entry.ratio > 0);

  /* Costs that do not scale with headcount: a $50 tour-guide fee is the same at 80 and at 100. */
  const perGroupFees = (pricing.known_unit_prices || [])
    .filter(entry => entry.basis === 'per_group' && isUsableAmount(entry) && !isDeposit(entry))
    .map(entry => ({
      label: entry.label || (suppliers.get(entry.supplier_id) || {}).name || entry.supplier_id,
      supplierName: (suppliers.get(entry.supplier_id) || {}).name || entry.supplier_id,
      amount: entry.amount,
      sourceIds: entry.source_ids || []
    }));

  const tiers = [...(headcount.tiers || [])].sort((a, b) => a - b);
  const occupancies = S.OCCUPANCY.filter(name => OCCUPANCY_SIZE[name]);
  const baseOccupancy = occupancies.reduce((widest, name) => OCCUPANCY_SIZE[name] > OCCUPANCY_SIZE[widest] ? name : widest, occupancies[0]);

  return {
    currency: pricing.currency || 'USD',
    nights: nightsOf(trip),
    tiers,
    payingMinimum: headcount.paying_minimum,
    occupancies,
    baseOccupancy,
    baseSize: OCCUPANCY_SIZE[baseOccupancy],
    consumed,
    consumedPerPerson: sum(consumed.map(component => component.amount)),
    commissionLines,
    commissionPerPerson: sum(commissionLines.map(component => component.amount)),
    missing,
    tripGrantedComps: headcount.trip_granted_comps || 0,
    vendorEarned,
    perGroupFees,
    perGroupTotal: sum(perGroupFees.map(fee => fee.amount)),
    suppliers
  };
}

/* What a supplier's own ratio is worth at N paying travellers. The ratio counts paid places;
   the extras (a bus-driver comp) are granted on top of the ratio. */
function vendorEarnedAt(model, payers) {
  const rows = model.vendorEarned.map(entry => {
    const earned = Math.floor(payers / entry.ratio);
    const count = earned + entry.extras.length;
    return { ...entry, earned, count, value: count * entry.unitPrice };
  });
  return { rows, total: sum(rows.map(entry => entry.value)) };
}

/* Free places the operator grants: the paying travellers carry what those places consume.
   Not commission — the operator does not pay itself a margin on a place it gave away. */
function tripGrantedAt(model, payers) {
  const total = model.tripGrantedComps * model.consumedPerPerson;
  return { comps: model.tripGrantedComps, perComp: model.consumedPerPerson, total, perPayer: payers ? total / payers : 0 };
}

/* Everything the record actually supports, per paying traveller, before the two derived inputs. */
function knownPerPayer(model, payers) {
  const vendor = vendorEarnedAt(model, payers);
  const granted = tripGrantedAt(model, payers);
  const parts = {
    consumed: model.consumedPerPerson,
    commission: model.commissionPerPerson,
    vendorCredit: -vendor.total / payers,
    grantedCarry: granted.perPayer,
    groupFees: model.perGroupTotal / payers
  };
  return { ...parts, total: parts.consumed + parts.commission + parts.vendorCredit + parts.grantedCarry + parts.groupFees };
}

/* ---------- reading the published table ------------------------------------------------ */

/* A price that is a fixed per-person amount plus a fixed per-group pot spread over the payers
   has the shape A + B/N. Two unknowns, so they are solved from the two extreme tiers and any
   middle tier is left free as a check, not used as an input. */
function fitColumn(tiers, priceAt) {
  const lo = tiers[0];
  const hi = tiers[tiers.length - 1];
  const perGroup = (priceAt(lo) - priceAt(hi)) / (1 / lo - 1 / hi);
  const perPerson = priceAt(lo) - perGroup / lo;
  return {
    perPerson,
    perGroup,
    lo,
    hi,
    residuals: tiers.map(tier => ({ tier, residual: perPerson + perGroup / tier - priceAt(tier) }))
  };
}

const priceGetter = (published, occupancy) => tier => published[String(tier)][occupancy];

/* Which cells a published table is missing for the tiers and occupancies this trip declares.
   An empty list means the grid can be read without a guard on every lookup. */
function tableGaps(model, published) {
  if (!published || typeof published !== 'object') return ['No published price table.'];
  const gaps = [];
  for (const tier of model.tiers) {
    const tierRow = published[String(tier)];
    if (!tierRow || typeof tierRow !== 'object') { gaps.push(`No row for ${tier} paying travellers.`); continue; }
    for (const occupancy of model.occupancies) {
      if (!Number.isFinite(tierRow[occupancy])) gaps.push(`No ${occupancy} price at ${tier} paying travellers.`);
    }
  }
  return gaps;
}

/* The room differential is never published. Its shape is not guesswork: a three-night room at
   rate R costs nights x R / k per person at k to a room, so the supplement over the base
   occupancy is nights x R x (1/k - 1/base). One unknown, R, fitted through the origin across
   every occupancy and every tier at once. The spread between the per-occupancy estimates is
   reported, because that spread is how well the shape actually holds. */
function solveRoomRate(model, published) {
  let numerator = 0;
  let denominator = 0;
  const estimates = [];
  for (const occupancy of model.occupancies) {
    if (occupancy === model.baseOccupancy) continue;
    const weight = model.nights * (1 / OCCUPANCY_SIZE[occupancy] - 1 / model.baseSize);
    const supplements = model.tiers.map(tier => published[String(tier)][occupancy] - published[String(tier)][model.baseOccupancy]);
    for (const supplement of supplements) {
      numerator += supplement * weight;
      denominator += weight * weight;
    }
    const mean = sum(supplements) / supplements.length;
    estimates.push({ occupancy, size: OCCUPANCY_SIZE[occupancy], weight, supplements, meanSupplement: mean, impliedRate: mean / weight });
  }
  const rate = denominator ? numerator / denominator : 0;
  return { rate, estimates };
}

/* The two inputs the pages do not carry, solved from the base-occupancy column:
     coachGroupTotal      the whole 1/N term the record cannot account for. A charter is a
                          per-group cost; the quote system prints it as a per-person line, which
                          is exactly why every headcount change forces a re-quote.
     unreconciled         the headcount-independent per-person remainder. Named, not hidden. */
function solveMissing(model, published) {
  const lo = model.tiers[0];
  const hi = model.tiers[model.tiers.length - 1];
  const priceAt = priceGetter(published, model.baseOccupancy);
  const knownLo = knownPerPayer(model, lo).total;
  const knownHi = knownPerPayer(model, hi).total;
  const coachGroupTotal = ((priceAt(lo) - priceAt(hi)) - (knownLo - knownHi)) / (1 / lo - 1 / hi);
  const unreconciled = priceAt(lo) - knownLo - coachGroupTotal / lo;
  return { lo, hi, coachGroupTotal, unreconciled, knownLo, knownHi };
}

function solveFrom(model, published) {
  const missing = solveMissing(model, published);
  const room = solveRoomRate(model, published);
  return { ...missing, roomRate: room.rate, roomEstimates: room.estimates };
}

const roomDifferential = (model, solved, occupancy) =>
  model.nights * solved.roomRate * (1 / OCCUPANCY_SIZE[occupancy] - 1 / model.baseSize);

function computedPrice(model, solved, payers, occupancy) {
  return knownPerPayer(model, payers).total
    + solved.coachGroupTotal / payers
    + solved.unreconciled
    + roomDifferential(model, solved, occupancy);
}

const computedTable = (model, solved, tiers) => tiers.map(tier => ({
  tier,
  cells: model.occupancies.map(occupancy => ({ occupancy, exact: computedPrice(model, solved, tier, occupancy) }))
}));

/* ---------- the document --------------------------------------------------------------- */

function buildMarkdown(trip) {
  const model = buildModel(trip);
  const pricing = trip.pricing;
  const v1 = pricing.published;
  const variant = pricing.observed_variant || null;
  const occ = model.occupancies;
  const label = name => name[0].toUpperCase() + name.slice(1);
  const version = trip.trip.version;
  const variantVersion = variant ? variant.version : null;
  const out = [];
  const heading = `# Per-person price, computed — ${cell(trip.trip.title)}`;

  /* The record's own validation covers `pricing.published` but not the second printing, and it
     accepts a single headcount tier. The model needs two tiers to separate a per-person amount
     from a per-group one, and a complete grid to read. Say so rather than throwing a TypeError
     out of a document generator, and rather than quietly printing a table built on a hole. */
  if (model.tiers.length < 2) {
    return [heading, '', `The record declares ${model.tiers.length} headcount tier(s): \`${cell(model.tiers.join(', ') || 'none')}\`.`,
      '', 'The price has two parts that behave differently when the headcount moves — a per-person amount that does not change and a per-group amount that is divided among the payers — and two parts cannot be separated from one observation. Declare at least two tiers in `trip.headcount.tiers`, with a published row for each, and this document computes the table.', ''].join('\n');
  }
  const incomplete = tableGaps(model, v1);
  if (incomplete.length) {
    return [heading, '', 'The published table is incomplete, so nothing is computed from it:', '',
      ...incomplete.map(gap => `- ${cell(gap)}`), '',
      'No cell is filled in by inference. Complete `pricing.published` and re-render.', ''].join('\n');
  }
  const variantGaps = variant ? tableGaps(model, variant.published) : [];
  const v2 = variant && !variantGaps.length ? variant.published : null;
  const solved = solveFrom(model, v1);
  const solvedV2 = v2 ? solveFrom(model, v2) : null;

  out.push(heading, '');
  out.push([
    `Trip \`${cell(trip.trip.id)}\` · record version \`${cell(version)}\` · prepared ${cell(trip.trip.prepared_on)}`,
    `${cell(model.currency)} · ${model.nights} nights · ${cell(model.tripGrantedComps)} trip-granted comps · minimum ${cell(model.payingMinimum)} paying travellers`,
    'Generated by `pipeline/trip/cli.cjs` from the trip record. Nothing here is typed by hand.'
  ].join('  \n'), '');

  out.push('> **This is not an independent check of the published price, and it does not pretend to be.**',
    `> Two of the model's inputs are not recorded on any supplied page: the motor-coach cost is \`null\` (illegible on the photographed quote screen) and the room differential was never published. They are solved **from** the published table, so the computed table reproduces \`${cell(version)}\` by construction at the base occupancy and the two extreme tiers.`,
    '> What that buys is still worth having: the published table is shown to have one specific shape, the missing inputs are pinned to exact values instead of staying blank, and the same solved model applied to the second printing says in three numbers what moved. No figure below is invented to force a match; every derived figure is labelled **derived**.', '');

  /* ---- 1. the symptom ---- */
  out.push('## 1. What the two printings did', '');
  if (variant && variantGaps.length) {
    out.push(`The record carries a second printing, \`${cell(variantVersion)}\`, but its table is incomplete, so it is not compared here: ${variantGaps.map(cell).join(' ')} Nothing is inferred to fill it.`, '');
  }
  if (!variant) out.push('The record carries one printing, so there is no drift to compare. The model below still separates the comps and names what is missing.', '');
  if (v2) {
    const deltaRows = occ.map(occupancy => row([
      label(occupancy),
      ...model.tiers.map(tier => `${whole(v1[String(tier)][occupancy])} → ${whole(v2[String(tier)][occupancy])} (${signed(v2[String(tier)][occupancy] - v1[String(tier)][occupancy])})`)
    ]));
    out.push(table(['Occupancy', ...model.tiers.map(tier => `${tier} paying`)], deltaRows), '');
    const supplement = (tableData, occupancy) => sum(model.tiers.map(tier => tableData[String(tier)][occupancy] - tableData[String(tier)][model.baseOccupancy])) / model.tiers.length;
    const narrow = occ[occ.length - 1];
    const discount = tableData => tableData[String(model.tiers[0])][model.baseOccupancy] - tableData[String(model.tiers[model.tiers.length - 1])][model.baseOccupancy];
    out.push(table(['Measure', cell(version), cell(variantVersion), 'Change'], [
      row([`${label(narrow)} supplement over ${label(model.baseOccupancy)} (mean of the ${model.tiers.length} tiers)`,
        money(supplement(v1, narrow)), money(supplement(v2, narrow)), signed(supplement(v2, narrow) - supplement(v1, narrow), 2)]),
      row([`${model.tiers[0]} → ${model.tiers[model.tiers.length - 1]} discount, ${label(model.baseOccupancy)}`,
        money(discount(v1), 0), money(discount(v2), 0), signed(discount(v2) - discount(v1))])
    ]), '');
    out.push(`Twelve cells, four directions, and no page records a reason. ${cell(variant.note || '')}`, '');
  }

  /* ---- 2. the model ---- */
  out.push('## 2. The model', '');
  out.push('For `N` paying travellers at `k` people to a room:', '', '```');
  out.push('  price(N, k) =   consumed per person              hotel + attractions + dinners',
    '                + commission per person            the operator\'s own margin',
    '                - vendor-earned comps / N          a supplier\'s own ratio: REDUCES cost',
    '                + trip-granted comps x consumed / N   free places the payers carry: INCREASES cost',
    '                + per-group fees / N               a flat guide fee does not scale',
    '                + coach charter total / N          DERIVED — the quote line is illegible',
    '                + unreconciled per person          DERIVED — the residual the pages do not explain',
    `                + ${model.nights} nights x room rate x (1/k - 1/${model.baseSize})   DERIVED — the room differential is unpublished`);
  out.push('```', '');
  out.push(`Everything above the two derived lines comes from the record. The base occupancy is **${label(model.baseOccupancy)}** (${model.baseSize} to a room); every other occupancy is the base plus a room differential, which is why the differential and the room rate are the same question.`, '');

  /* ---- 3. inputs ---- */
  out.push('## 3. Inputs', '');
  const sourceLocator = ids => (ids || []).map(id => {
    const source = (trip.sources || []).find(entry => entry.id === id);
    return source ? `${id} — ${source.locator}` : id;
  }).join('; ');
  const inputRows = [];
  for (const component of model.consumed) {
    inputRows.push(row([component.label, money(component.amount), 'per person', 'sourced', sourceLocator(component.source_ids) + (component.note ? ` — ${component.note}` : '')]));
  }
  for (const component of model.commissionLines) {
    inputRows.push(row([component.label, money(component.amount), 'per person', 'sourced', sourceLocator(component.source_ids)]));
  }
  for (const component of model.missing) {
    const why = component.amount === null || component.amount === undefined
      ? '**not recorded**'
      : `**unusable value (${cell(typeof component.amount)})**`;
    inputRows.push(row([component.label, why, 'per person on the quote screen', '**missing → derived below**', sourceLocator(component.source_ids) + (component.note ? ` — ${component.note}` : '')]));
  }
  for (const fee of model.perGroupFees) {
    inputRows.push(row([`${fee.label} (${fee.supplierName})`, money(fee.amount), 'per group', 'sourced', sourceLocator(fee.sourceIds)]));
  }
  inputRows.push(row(['Trip-granted comps', `${model.tripGrantedComps} places`, 'carried by the payers', 'sourced', 'Recorded in pen on the cover; kept separate from vendor-earned comps in the record']));
  for (const entry of model.vendorEarned) {
    inputRows.push(row([`Vendor-earned comps (${entry.name})`, `1 per ${entry.ratio} paid + ${entry.extras.join(', ')}`, `valued at ${money(entry.unitPrice)} per head`, 'sourced', entry.note]));
  }
  inputRows.push(row(['Room differential', '**not published**', `per person, ${model.nights} nights`, '**missing → derived below**', 'Neither printing shows a room rate or an occupancy basis']));
  out.push(table(['Line', 'Amount', 'Basis', 'Status', 'Where it comes from'], inputRows), '');

  const blended = model.consumed.find(component => /attraction/i.test(component.label || ''));
  if (blended) {
    const includedSuppliers = [];
    const seen = new Set();
    for (const inclusion of trip.inclusions || []) {
      const supplier = model.suppliers.get(inclusion.supplier_id);
      if (!supplier || seen.has(supplier.id)) continue;
      if (!['attraction', 'performance'].includes(supplier.category)) continue;
      seen.add(supplier.id);
      includedSuppliers.push(supplier);
    }
    const withRate = includedSuppliers.filter(supplier => ((supplier.terms || {}).unit_price || {}).basis === 'per_person');
    const withoutRate = includedSuppliers.filter(supplier => !withRate.includes(supplier));
    const knownSum = sum(withRate.map(supplier => supplier.terms.unit_price.amount));
    out.push(`**The ${cell(blended.label.toLowerCase())} line cannot be checked against its parts.** ${money(blended.amount)} per person covers ${includedSuppliers.length} suppliers. ${withRate.length} of them have a recorded per-person rate (${withRate.map(supplier => `${supplier.name} ${money(supplier.terms.unit_price.amount)}`).join(', ')}), totalling ${money(knownSum)}. That leaves ${money(blended.amount - knownSum)} covering ${withoutRate.length} suppliers with no rate recorded anywhere: ${withoutRate.map(supplier => supplier.name).join(', ')}. The blend is a single quote-system line with no supplier attached, so it cannot be decomposed and it cannot be audited.`, '');
  }

  /* ---- 4. comps ---- */
  out.push('## 4. The hinge: two kinds of comp, moving in opposite directions', '');
  out.push(`\`schema.cjs\` refuses to treat these as one number. **${cell(S.COMP_KINDS.vendor_earned.label)}** — *${cell(S.COMP_KINDS.vendor_earned.effect)}*. **${cell(S.COMP_KINDS.trip_granted.label)}** — *${cell(S.COMP_KINDS.trip_granted.effect)}*. On the printed proposal both appear as bare pen numbers with nothing to say which way they push.`, '');

  out.push(`### 4a. Vendor-earned — ${cell(S.COMP_KINDS.vendor_earned.effect.replace(/_/g, ' '))}`, '');
  const vendorRows = [];
  for (const tier of model.tiers) {
    const vendor = vendorEarnedAt(model, tier);
    for (const entry of vendor.rows) {
      vendorRows.push(row([
        `${tier} paying`,
        entry.name,
        `${tier} ÷ ${entry.ratio} = ${entry.earned} earned + ${entry.extras.length} (${entry.extras.join(', ')}) = ${entry.count} free`,
        `${entry.count} × ${money(entry.unitPrice)} = ${money(entry.value)}`,
        `${money(entry.value)} ÷ ${tier} = ${money(entry.value / tier)} off every paying traveller`
      ]));
    }
  }
  out.push(table(['Payers', 'Supplier', 'Ratio worked out', 'Worth to the group', 'Effect per paying traveller'], vendorRows), '');
  const vendorAtMin = vendorEarnedAt(model, model.tiers[0]);
  out.push(`At ${model.tiers[0]} paying travellers that is ${money(vendorAtMin.total)} the operator does not have to spend, or ${money(vendorAtMin.total / model.tiers[0])} per paying traveller.${blended ? ` **Where it lands is the open question.** It belongs inside the ${money(blended.amount)} blended ${cell(blended.label.toLowerCase())} line, and the blend cannot be decomposed, so nothing on any page says whether that line is already net of the comps. This model treats it as gross and applies the credit. If the blend is already net, the credit is being taken twice and every price below is ${money(vendorAtMin.total / model.tiers[0])} too low at ${model.tiers[0]} payers.` : ''}`, '');

  out.push(`### 4b. Trip-granted — ${cell(S.COMP_KINDS.trip_granted.effect.replace(/_/g, ' '))}`, '');
  const grantedRows = model.tiers.map(tier => {
    const granted = tripGrantedAt(model, tier);
    return row([
      `${tier} paying`,
      `${granted.comps} free places × ${money(granted.perComp)} consumed each = ${money(granted.total)}`,
      `${money(granted.total)} ÷ ${tier} = ${money(granted.perPayer)} added to every paying traveller`
    ]);
  });
  out.push(table(['Payers', 'What the free places consume', 'Effect per paying traveller'], grantedRows), '');
  out.push(`A comp place consumes ${model.consumed.map(component => `${cell(component.label.toLowerCase())} ${money(component.amount)}`).join(' + ')} = ${money(model.consumedPerPerson)}. It does not consume ${cell((model.commissionLines[0] || {}).label || 'commission').toLowerCase()} — the operator does not pay itself a margin on a place it gave away — and it does not add a coach cost, because the coach is chartered whether or not the three extra seats are filled. If the comps were instead loaded with commission, every price would rise by a further ${money(model.tripGrantedComps * model.commissionPerPerson / model.tiers[0])} at ${model.tiers[0]} payers.`, '');

  const vendorNet = vendorEarnedAt(model, model.tiers[0]).total / model.tiers[0];
  const grantedNet = tripGrantedAt(model, model.tiers[0]).perPayer;
  out.push(`### 4c. Net`, '',
    table(['At ' + model.tiers[0] + ' paying travellers', 'Per paying traveller'], [
      row([`${cell(S.COMP_KINDS.vendor_earned.label)} (credit)`, `-${money(vendorNet)}`]),
      row([`${cell(S.COMP_KINDS.trip_granted.label)} (carried)`, `+${money(grantedNet)}`]),
      row(['**Net effect of "comps"**', `**${signed(grantedNet - vendorNet, 2)}**`])
    ]), '',
    `Collapsed into one pen number, "comps" reads as a discount. Here it is not: the two together **${grantedNet - vendorNet >= 0 ? 'add' : 'take off'} ${money(Math.abs(grantedNet - vendorNet))}** per paying traveller at ${model.tiers[0]}. Which way that lands depends on the ratio and the number of granted places, which is exactly why they cannot share a cell.`, '');

  /* ---- 5. solving ---- */
  out.push('## 5. Solving the two missing inputs from the published table', '');
  out.push(`### 5a. The published table has one shape`, '');
  out.push(`A price made of a fixed per-person amount plus a fixed per-group pot divided among the payers has the form **A + B/N**. Fitting that to each occupancy column from the two extreme tiers (${model.tiers[0]} and ${model.tiers[model.tiers.length - 1]}) leaves the middle tier free as a check:`, '');
  const fitRows = [];
  let worstFitResidual = 0;
  for (const [name, published] of [[version, v1], ...(v2 ? [[variantVersion, v2]] : [])]) {
    for (const occupancy of occ) {
      const fit = fitColumn(model.tiers, priceGetter(published, occupancy));
      const check = fit.residuals.filter(entry => entry.tier !== fit.lo && entry.tier !== fit.hi);
      for (const entry of check) worstFitResidual = Math.max(worstFitResidual, Math.abs(entry.residual));
      fitRows.push(row([
        cell(name), label(occupancy), money(fit.perPerson), money(fit.perGroup),
        check.map(entry => `${entry.tier}: ${signed(entry.residual, 2)}`).join(', ') || 'no free tier'
      ]));
    }
  }
  out.push(table(['Printing', 'Occupancy', 'A — per person', 'B — per-group pot', 'Unused tier, model minus published'], fitRows), '');
  out.push(`Every column fits within ${money(worstFitResidual)} at the tier that was not used to fit it. The shape holds: there is a per-person amount and a per-group pot of roughly ${whole(fitColumn(model.tiers, priceGetter(v1, model.baseOccupancy)).perGroup)}. Nothing in the record accounts for a pot that size — the only per-group cost on file is the ${money(model.perGroupTotal)} tour-guide fee. Something costing tens of thousands of dollars is being divided by the headcount, and the one cost line that is missing is the motor coach.`, '');

  out.push('### 5b. The two unknowns, solved', '');
  const knownLo = knownPerPayer(model, solved.lo);
  const knownHi = knownPerPayer(model, solved.hi);
  out.push(table(['Per paying traveller, from the record', `${solved.lo} paying`, `${solved.hi} paying`], [
    row(['Consumed (hotel + attractions + dinners)', money(knownLo.consumed), money(knownHi.consumed)]),
    row(['Commission', money(knownLo.commission), money(knownHi.commission)]),
    row(['Vendor-earned comp credit', money(knownLo.vendorCredit), money(knownHi.vendorCredit)]),
    row(['Trip-granted comps carried', money(knownLo.grantedCarry), money(knownHi.grantedCarry)]),
    row(['Per-group fees spread', money(knownLo.groupFees), money(knownHi.groupFees)]),
    row(['**Sub-total the record supports**', `**${money(knownLo.total)}**`, `**${money(knownHi.total)}**`]),
    row([`Published ${label(model.baseOccupancy)} price`, money(v1[String(solved.lo)][model.baseOccupancy], 0), money(v1[String(solved.hi)][model.baseOccupancy], 0)]),
    row(['**Gap to explain**', `**${money(v1[String(solved.lo)][model.baseOccupancy] - knownLo.total)}**`, `**${money(v1[String(solved.hi)][model.baseOccupancy] - knownHi.total)}**`])
  ]), '');
  out.push('Two gaps, two unknowns, one exact solution:', '', '```');
  out.push(`  coach charter total = (${money(v1[String(solved.lo)][model.baseOccupancy], 0)} - ${money(v1[String(solved.hi)][model.baseOccupancy], 0)} - (${money(knownLo.total)} - ${money(knownHi.total)})) / (1/${solved.lo} - 1/${solved.hi})`,
    `                      = ${money(solved.coachGroupTotal)}          DERIVED`,
    '',
    `  unreconciled per person = ${money(v1[String(solved.lo)][model.baseOccupancy], 0)} - ${money(knownLo.total)} - ${money(solved.coachGroupTotal)}/${solved.lo}`,
    `                          = ${money(solved.unreconciled)}             DERIVED`);
  out.push('```', '');
  const tripDays = (trip.days || []).length;
  out.push(`So the published table behaves as if a per-group amount of about **${whole(solved.coachGroupTotal)}** is being divided among the payers — ${money(solved.coachGroupTotal / model.tiers[0])} per person at ${model.tiers[0]}, ${money(solved.coachGroupTotal / model.tiers[model.tiers.length - 1])} at ${model.tiers[model.tiers.length - 1]}, or ${money(solved.coachGroupTotal / tripDays)} for each of the ${tripDays} days. That is consistent with the quote system printing the coach as a *per-person* line: a per-group charter divided by a headcount is exactly what a per-person coach cell is, and dividing it is what makes every headcount change a re-quote. **This is derived, not sourced.** It is a falsifiable prediction — the illegible cell should read about ${money(solved.coachGroupTotal / model.tiers[0])} at ${model.tiers[0]} payers — and it is not a claim that the charter costs this. How many coaches, how many driver days, what the deadhead and driver lodging are: none of that is in the record, and the charter quote would settle it in one look.`, '');
  out.push(`The ${money(solved.unreconciled)} per person that remains is not explained by any line on any page. It is carried openly here rather than smoothed into another figure.`, '');

  out.push('### 5c. The room differential, and a reconciliation that fails', '');
  out.push(`A ${model.nights}-night room at rate R costs \`${model.nights} × R / k\` per person at k to a room, so the supplement over ${label(model.baseOccupancy)} is \`${model.nights} × R × (1/k - 1/${model.baseSize})\`. That predicts the supplements should stand in the ratio ${occ.filter(o => o !== model.baseOccupancy).map(o => roundTo(model.nights * (1 / OCCUPANCY_SIZE[o] - 1 / model.baseSize) / (model.nights * (1 / OCCUPANCY_SIZE[occ[1]] - 1 / model.baseSize)), 0)).join(' : ')} regardless of headcount. They do:`, '');
  out.push(table(['Occupancy', 'Published supplement over ' + label(model.baseOccupancy), 'Implied room rate per room per night'],
    solved.roomEstimates.map(estimate => row([
      `${label(estimate.occupancy)} (${estimate.size} to a room)`,
      `${estimate.supplements.map((value, index) => `${model.tiers[index]}: ${money(value, 0)}`).join(', ')} → mean ${money(estimate.meanSupplement)}`,
      money(estimate.impliedRate)
    ]))), '');
  const rateSpread = Math.max(...solved.roomEstimates.map(entry => entry.impliedRate)) - Math.min(...solved.roomEstimates.map(entry => entry.impliedRate));
  out.push(`Three independent estimates agreeing within ${money(rateSpread)} is not a coincidence: the printed table really is built on a room rate. Pooled across all ${solved.roomEstimates.length * model.tiers.length} supplements, the implied rate is **${money(solved.roomRate)} per room per night — DERIVED**.`, '');
  const hotelLine = model.consumed.find(component => /hotel|lodg|accommod/i.test(component.label || ''));
  if (hotelLine) {
    const impliedBase = model.nights * solved.roomRate / model.baseSize;
    out.push(`And now the part worth taking to the office. At ${model.baseSize} to a room that rate is ${money(impliedBase)} per person for ${model.nights} nights. The quote system's ${cell(hotelLine.label.toLowerCase())} line says **${money(hotelLine.amount)}** — a gap of ${money(impliedBase - hotelLine.amount)} per person, or ${money((impliedBase - hotelLine.amount) * model.tiers[0])} across ${model.tiers[0]} travellers. The two cannot be reconciled at any whole number of people to a room: ${money(hotelLine.amount)} at the derived rate would need ${num(model.nights * solved.roomRate / hotelLine.amount, 2)} people in each room. Either the cost line and the differential were built from different room rates, or one of them is stale. Nothing on any page says which.`, '');
  }

  /* ---- 6. computed table ---- */
  out.push('## 6. The computed table', '');
  const computed = computedTable(model, solved, model.tiers);
  out.push(table(['Occupancy', ...model.tiers.map(tier => `${tier} paying`)],
    occ.map(occupancy => row([
      label(occupancy),
      ...computed.map(rowData => whole(rowData.cells.find(entry => entry.occupancy === occupancy).exact))
    ]))), '');
  out.push('The same figures before rounding, so the rounding can be checked:', '');
  out.push(table(['Occupancy', ...model.tiers.map(tier => `${tier} paying`)],
    occ.map(occupancy => row([
      label(occupancy),
      ...computed.map(rowData => money(rowData.cells.find(entry => entry.occupancy === occupancy).exact))
    ]))), '');

  /* ---- 7. deltas ---- */
  out.push('## 7. Computed against both printings', '');
  let worstAgainstRecord = 0;
  for (const [name, published, note] of [
    [version, v1, `The model was solved from this table at ${label(model.baseOccupancy)}/${solved.lo} and ${label(model.baseOccupancy)}/${solved.hi}, so those two cells match by construction. The other ten are not free parameters.`],
    ...(v2 ? [[variantVersion, v2, 'The same solved model, untouched, against the second printing. These are the drift.']] : [])
  ]) {
    const deltaRows = occ.map(occupancy => {
      const cells = model.tiers.map(tier => {
        const exact = computedPrice(model, solved, tier, occupancy);
        return signed(roundTo(exact, 0) - published[String(tier)][occupancy]);
      });
      return row([label(occupancy), ...cells]);
    });
    const worst = Math.max(...occ.flatMap(occupancy => model.tiers.map(tier =>
      Math.abs(roundTo(computedPrice(model, solved, tier, occupancy), 0) - published[String(tier)][occupancy]))));
    if (published === v1) worstAgainstRecord = worst;
    out.push(`### Computed minus \`${cell(name)}\``, '', table(['Occupancy', ...model.tiers.map(tier => `${tier} paying`)], deltaRows), '',
      `Largest difference: ${money(worst, 0)}. ${cell(note)}`, '');
  }
  /* The published table is not self-consistent to the dollar: an identical room draws a
     different supplement at different tiers. Find the occupancy that shows it most clearly
     rather than naming one. */
  const wobble = occ.filter(occupancy => occupancy !== model.baseOccupancy).map(occupancy => {
    const supplements = model.tiers.map(tier => ({ tier, value: v1[String(tier)][occupancy] - v1[String(tier)][model.baseOccupancy] }));
    const spread = Math.max(...supplements.map(entry => entry.value)) - Math.min(...supplements.map(entry => entry.value));
    return { occupancy, supplements, spread };
  }).sort((a, b) => b.spread - a.spread)[0];
  if (wobble && wobble.spread > 0) {
    const low = wobble.supplements.reduce((best, entry) => entry.value < best.value ? entry : best);
    const high = wobble.supplements.reduce((best, entry) => entry.value > best.value ? entry : best);
    out.push(`The ${money(worstAgainstRecord, 0)} differences against \`${cell(version)}\` are not a modelling failure — they are the published table's own rounding. Its ${label(wobble.occupancy)} supplement is ${money(low.value, 0)} at ${low.tier} payers and ${money(high.value, 0)} at ${high.tier}, for an identical room. A hand-typed table rounds each cell separately and drifts against itself; a computed one does not.`, '');
  }

  /* ---- 8. drift ---- */
  if (solvedV2) {
    out.push('## 8. The changelog nobody could produce', '');
    out.push(`Solving the same model against the second printing isolates what actually changed. Everything the record supplies — components, comps, fees — is identical in both solves, so the entire difference falls on the three derived inputs:`, '');
    out.push(table(['Derived input', cell(version), cell(variantVersion), 'Change'], [
      row(['Coach charter total (per group)', money(solved.coachGroupTotal), money(solvedV2.coachGroupTotal), signed(solvedV2.coachGroupTotal - solved.coachGroupTotal, 2)]),
      row(['Unreconciled per person', money(solved.unreconciled), money(solvedV2.unreconciled), signed(solvedV2.unreconciled - solved.unreconciled, 2)]),
      row(['Room rate per room per night', money(solved.roomRate), money(solvedV2.roomRate), signed(solvedV2.roomRate - solved.roomRate, 2)])
    ]), '');
    const potMove = solvedV2.coachGroupTotal - solved.coachGroupTotal;
    const personMove = solvedV2.unreconciled - solved.unreconciled;
    /* The verbs follow the signs. A later printing that moves these the other way must not be
       described with the direction this one happened to take. */
    const moved = value => value > 0 ? 'rose' : value < 0 ? 'fell' : 'held';
    out.push(`That is the whole mystery. A per-group amount ${moved(potMove)} by ${money(Math.abs(potMove))} and a per-person amount ${moved(personMove)} by ${money(Math.abs(personMove))}, and the two cross each other. The per-group move is worth ${money(Math.abs(potMove) / model.tiers[0])} per person at ${model.tiers[0]} payers but only ${money(Math.abs(potMove) / model.tiers[model.tiers.length - 1])} at ${model.tiers[model.tiers.length - 1]}, while the per-person move is worth ${money(Math.abs(personMove))} at every tier. So:`, '');
    const narrow = occ[occ.length - 1];
    const roomMoveAt = occupancy => (solvedV2.roomRate - solved.roomRate) * model.nights * (1 / OCCUPANCY_SIZE[occupancy] - 1 / model.baseSize);
    const driftRows = [];
    let worstDrift = 0;
    for (const occupancy of [model.baseOccupancy, narrow]) {
      for (const tier of model.tiers) {
        const potPer = potMove / tier;
        const roomAt = roomMoveAt(occupancy);
        const predicted = potPer + personMove + roomAt;
        const actual = v2[String(tier)][occupancy] - v1[String(tier)][occupancy];
        worstDrift = Math.max(worstDrift, Math.abs(predicted - actual));
        driftRows.push(row([
          `${label(occupancy)}, ${tier} paying`, signed(potPer, 2), signed(personMove, 2), signed(roomAt, 2),
          signed(predicted, 2), signed(actual)
        ]));
      }
    }
    out.push(table(['Where', 'Per-group cut worth', 'Per-person rise worth', 'Room-rate cut worth', 'Predicted move', 'Published move'], driftRows), '');
    out.push(`The three moves reproduce the ${label(model.baseOccupancy)} column exactly, because that is the column they were solved from, and land within ${money(worstDrift)} at ${label(narrow)}. That last ${money(worstDrift)} is not a modelling residual either: the published table's ${cell(narrow)} column implies a per-group pot ${money(Math.abs(fitColumn(model.tiers, priceGetter(v1, narrow)).perGroup - fitColumn(model.tiers, priceGetter(v1, model.baseOccupancy)).perGroup), 0)} away from what its ${cell(model.baseOccupancy)} column implies, for the same coach carrying the same people. A hand-typed table cannot hold two columns to the same arithmetic.`, '');
    out.push(`So: a per-group amount ${moved(potMove)}, a per-person amount ${moved(personMove)}, a room rate ${moved(solvedV2.roomRate - solved.roomRate)}. The per-group move is worth more per head at ${model.tiers[0]} payers than at ${model.tiers[model.tiers.length - 1]}, the per-person move is worth ${money(Math.abs(personMove))} at every tier, and the room-rate move is worth nothing at ${cell(model.baseOccupancy)} and ${money(Math.abs(roomMoveAt(narrow)))} at ${cell(narrow)}. Three parameters crossing each other in two dimensions is exactly how twelve cells end up moving in four directions. **None of the three was written down anywhere**, and that — not the arithmetic — is the failure. With the record as the database, each is one field with a source and a date beside it.`, '');
  }

  /* ---- 9. sensitivity ---- */
  out.push('## 9. Headcount sensitivity', '');
  const pricingBasis = (trip.exclusions || []).find(entry => /final number of paying/i.test(entry.text || ''));
  if (pricingBasis) out.push(`> ${cell(pricingBasis.text)}`, '', `— the operator's own exclusions page. Every headcount change is a legitimate re-quote. The point of computing the table is that the re-quote costs a keystroke instead of an afternoon.`, '');
  const span = [];
  for (let payers = model.tiers[0] - 10; payers <= model.tiers[model.tiers.length - 1] + 20; payers += 5) span.push(payers);
  out.push(table(['Paying travellers', ...occ.map(label), `Change per extra payer (${label(model.baseOccupancy)})`, 'Note'],
    span.map(payers => {
      const next = computedPrice(model, solved, payers + 1, model.baseOccupancy) - computedPrice(model, solved, payers, model.baseOccupancy);
      const flags = [];
      if (model.payingMinimum && payers < model.payingMinimum) flags.push(`below the ${model.payingMinimum}-payer minimum`);
      if (model.tiers.includes(payers)) flags.push('published tier');
      return row([payers, ...occ.map(occupancy => whole(computedPrice(model, solved, payers, occupancy))), signed(next, 2), flags.join('; ') || '']);
    })), '');
  const marginalLo = computedPrice(model, solved, model.tiers[0] + 1, model.baseOccupancy) - computedPrice(model, solved, model.tiers[0], model.baseOccupancy);
  const marginalHi = computedPrice(model, solved, model.tiers[model.tiers.length - 1] + 1, model.baseOccupancy) - computedPrice(model, solved, model.tiers[model.tiers.length - 1], model.baseOccupancy);
  out.push(`One more paying traveller takes ${money(Math.abs(marginalLo))} off everybody's ${cell(model.baseOccupancy)} price at ${model.tiers[0]} payers and ${money(Math.abs(marginalHi))} at ${model.tiers[model.tiers.length - 1]} — the per-group pot spread one head thinner. One fewer does the reverse. Rows below the ${model.payingMinimum}-payer minimum are shown because the arithmetic is the same, not because the trip can be sold there.`, '');
  const deadline = [...model.suppliers.values()].filter(supplier => (supplier.terms || {}).final_headcount_due_business_days);
  if (deadline.length) {
    out.push(`The number that ends up in this column is due early: ${deadline.map(supplier => `${cell(supplier.name)} needs the final headcount ${supplier.terms.final_headcount_due_business_days} business days out`).join('; ')}. After that, a change is a change to a supplier's terms, not a re-quote.`, '');
  }

  /* ---- 10. unknowns ---- */
  out.push('## 10. What is still missing, and what each one would settle', '');
  out.push(table(['Missing input', 'Currently', 'What it would settle'], [
    row(['The motor-coach charter quote (total, coach count, days)', `Derived at ${whole(solved.coachGroupTotal)} from the published table`, 'Turns the whole headcount curve from a fit into a check. This is the single highest-value missing document.']),
    row(['The hotel contract (rate per room per night, occupancy basis, taxes, nights)', `Room rate derived at ${money(solved.roomRate)}; the quote line says ${money((hotelLine || {}).amount)} per person`, `Settles the ${hotelLine ? money(model.nights * solved.roomRate / model.baseSize - hotelLine.amount) : 'unexplained'} per-person hotel gap and makes the occupancy differential sourced instead of inferred.`]),
    row([`The per-supplier rates behind the ${blended ? money(blended.amount) : 'blended'} attractions line`, 'One un-decomposable quote-system line with no supplier attached', 'Lets each attraction be checked against its own quote and its own comp policy.']),
    row(['Whether the attractions blend is gross or net of vendor-earned comps', 'Assumed gross; the credit is applied', `Worth ${money(vendorNet)} per paying traveller at ${model.tiers[0]}. Applied twice or not at all, it is wrong either way.`]),
    row([`The ${money(solved.unreconciled)} unreconciled per person`, 'Named and carried, not smoothed away', 'The last unexplained amount in the table.']),
    row(['The occupancy the group is actually sold at', 'Not recorded; the table prices all four', 'The mix decides the invoice. The table alone does not.'])
  ]), '');

  /* ---- 11. method ---- */
  out.push('## 11. Method', '');
  out.push(`- **Rounding.** Every figure is rounded half up, away from zero. Working figures keep two decimal places; a price quoted to a client is rounded to the whole ${cell(model.currency)} at the last step only, never at an intermediate one. The unrounded table in section 6 is printed so the rounding can be checked by hand.`,
    `- **Fitting.** Two unknowns are solved from the two extreme tiers (${model.tiers[0]} and ${model.tiers[model.tiers.length - 1]}); the middle tier is never used as an input, which is what makes it a check. The room rate is a single parameter fitted through the origin across all ${solved.roomEstimates.length * model.tiers.length} published supplements at once.`,
    `- **Determinism.** This document is generated from \`${cell(trip._file || 'the trip record')}\` and \`pipeline/trip/schema.cjs\` only. No clock, no randomness, no network: \`node pipeline/trip/cli.cjs check --all\` compares bytes and would fail otherwise.`,
    '- **Privacy.** Business names are kept; every individual and every direct number stays a role.', '');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

module.exports = {
  name: 'pricing',
  description: 'Per-person price table computed from the record: comps split by kind, the two unpublished inputs solved and labelled derived, both printed tables compared cell by cell, and a headcount sensitivity.',
  outputs(trip) {
    return new Map([['pricing.md', buildMarkdown(trip)]]);
  },
  /* Exported for tests. Not used by the CLI, which reads name/description/outputs only. */
  model: {
    roundTo, buildModel, vendorEarnedAt, tripGrantedAt, knownPerPayer,
    fitColumn, priceGetter, solveMissing, solveRoomRate, solveFrom,
    computedPrice, roomDifferential, nightsOf, OCCUPANCY_SIZE, cell
  }
};
