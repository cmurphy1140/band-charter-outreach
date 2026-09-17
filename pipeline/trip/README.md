# Trip production layer — the contract

[Universal pipeline](../README.md) · [Shared instructions](../../AGENTS.md)

The five-stage pipeline in `pipeline/` governs **opportunities**: which schools, on what
evidence, with what blocking. This layer governs **trips**: the itinerary, its suppliers,
their terms, and every document generated from them.

It exists because of one finding. Two printed iterations of the same real trip, compared
side by side, disagreed about the performance venue, the climbing vendor's name, whether
the group checks out before the riverboat, what the exclusions clause excludes, and every
cell of the price table — while the quote system carried `No supplier` on all five cost
lines and two days of vendor work lived only in ballpoint on a page that gets reprinted.

**The proposal document was the database, and every redraft wiped it.** Here, the record is
the database and every document is generated from it.

```
node pipeline/trip/cli.cjs list        # trips and their shape
node pipeline/trip/cli.cjs renderers   # which renderers are installed
node pipeline/trip/cli.cjs validate --all
node pipeline/trip/cli.cjs render --all
node pipeline/trip/cli.cjs check --all # fails if a tracked output is stale
node --test tests/trip_*.test.cjs
```

Node 20+, CommonJS `.cjs`, zero dependencies — same as `pipeline/`.

## How to add a renderer

Renderers are **discovered, not registered**. Drop one file in `pipeline/trip/renderers/`
and the CLI picks it up. No shared file changes, which is what lets several renderers be
built in parallel without colliding.

```js
/* pipeline/trip/renderers/vendor-sheet.cjs */
const { lines, supplierIndex, slotsForSupplier } = require('../load.cjs');
const S = require('../schema.cjs');

module.exports = {
  name: 'vendor-sheet',
  description: 'One page per trip consolidating every supplier, its terms and its deadline.',
  outputs(trip) {
    return new Map([['vendor-sheet.md', buildMarkdown(trip)]]);
  }
};
```

Rules:

- `outputs(trip)` returns a `Map` of **filename → string**. Filenames must be unique across
  all renderers; the CLI throws if two renderers claim the same name.
- **Deterministic.** Read only the trip record and `schema.cjs`. No clock, no randomness, no
  network, no filesystem reads outside the repo. `check --all` compares bytes, so a
  timestamp in the output makes the check fail on every run.
- Escape what you emit: `|` in a Markdown table cell, and a leading `=+@-` in a CSV cell
  (`pipeline/render.cjs` has `cell()` and `csvCell()` to copy).
- Say what is true. A line that is not `confirmed` must not read as booked — use
  `S.clientWord(state)`.

## Helpers on `load.cjs`

| Function | What it gives you |
|---|---|
| `loadTrip(id)` | The trip record, with `_file` set |
| `validateTrip(trip)` | `[{ severity, check, id, message }]` — same finding shape as `pipeline/validate.cjs` |
| `lines(trip)` | Every slot in day order as `{ day, slot }` |
| `supplierIndex(trip)` | `Map<supplier_id, supplier>` |
| `slotsForSupplier(trip, id)` | The slots one counterparty covers — one call, several lines |
| `errorsIn(findings)` | Errors only |

## The record

`pipeline/trip/trips/<id>.trip.json`. Sections: `trip`, `sources`, `suppliers`, `days`,
`inclusions`, `exclusions`, `pricing`.

**Vocabulary lives in `schema.cjs`.** The parts that matter most:

- **`LINE_STATES`** — `sourcing · requested · quoted · held · deposit_paid · confirmed`.
  Each carries a `client_word` so a client-facing document can print the truth next to a
  line instead of letting silence imply "booked". In the real trip, day one's dinner is
  printed and priced as a named venue while five alternatives were being called: that line
  is `sourcing`, and any renderer that prints it as settled is wrong.
- **`COMP_KINDS`** — `vendor_earned` (the supplier's own ratio, reduces cost) versus
  `trip_granted` (free places the operator gives the group, carried by the paying
  travellers). These move the price in opposite directions and were both written in pen as
  bare numbers. They are never one number.
- **`COST_BASIS`** — `per_person · per_group · per_room_per_night · flat`. A $50 guide fee
  and a $5 admission behave completely differently when headcount moves.
- **`SOURCE_KINDS`** — including `handwritten`, because a margin note is real evidence with
  a different weight from a supplier's own email, and the record says which it was.

Every supplier carries `terms` (unit price, minimum, comp policy, deposit, balance and
headcount deadlines, payment methods, cancellation) and an `attempts` log (date, channel,
direction, outcome). The attempts log exists because the same supplier got a web form
*and* a voicemail on the same day — duplicated effort with nowhere to record the first try.

## Privacy rule — applies to every file in this layer

- **Keep** business names and their published group-sales channels.
- **Redact to roles** every individual and every direct number: `the director`,
  `Group sales`, `Tour manager`, `Troen coordinator`. No personal mobile numbers, no
  personal mailboxes, no school director's name — in trip records, generated output,
  test fixtures, commit messages or documentation.

## Boundaries

Do not touch `pipeline/cases/`, `pipeline/render.cjs`, `pipeline/validate.cjs` or
`pipeline/out/`. `tests/pipeline.test.cjs` deliberately asserts that the universal pipeline
has exactly two cases and seven output files; this layer is a separate tree so that both can
grow independently.

This layer generates documents and call lists. It does not contact anyone, take a payment,
hold inventory, or write to a CRM.
