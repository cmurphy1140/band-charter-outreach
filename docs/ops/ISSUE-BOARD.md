# Operations issue board

Compiled September 17, 2026 against `bb6ac1e`. This is the single prioritised backlog for
the Troen operations layer. Everything else — a week's plan, a sprint, a handoff — schedules
from here.

**It absorbs, it does not replace.** The repository already carries a large backlog spread
across dated documents. Each issue below points at the finding it came from rather than
restating it, so the original evidence stays canonical:

| Existing backlog | What stays there | Where it lands here |
|---|---|---|
| [Pipeline audit, September 10](../AUDIT-2026-09-10.md) | Findings A01–A14 with locations, reproductions and confidence | OPS-020 … OPS-040 |
| [Remediation plan](../superpowers/plans/2026-09-10-pipeline-remediation.md) | Ten tasks, 53 unchecked items, interfaces and regression shapes | OPS-020 … OPS-040 |
| [Repository audit, September 12](../AUDIT-2026-09-12-REPOSITORY.md) | Findings F1–F10 with the check that produced each | OPS-041 … OPS-057 |
| [Design audit, September 12](../carnegie-hall/DESIGN-AUDIT-2026-09-12.md) | Five unresolved presentation findings | OPS-080 … OPS-084 |
| [Codex handoff](../CODEX_HANDOFF.md) · [scraping hurdles](../SCRAPING_HURDLES.md) | Per-source hurdles, refused picks, owner decisions | OPS-058 … OPS-070 |
| [Internal decision register](../carnegie-hall/INTERNAL-DECISIONS.md) | What we know, the POC default, the trigger | OPS-071 … OPS-079 |
| [Progress record](../carnegie-hall/PROGRESS.md) | Verified repairs, acceptance checks, limits | Status text throughout |
| [Universal pipeline](../../pipeline/README.md) · [trip layer](../../pipeline/trip/README.md) | The two layers that exist now and their contracts | OPS-001 … OPS-019 |

The ranges above say where each source backlog mostly lands; a handful of issues sit outside
their range because a finding belongs to a different theme. **The cross-reference tables at the
end are the authoritative mapping** — read those when checking coverage, not these ranges.

**New in this board.** The trip-production gaps, nine of the workflow and infrastructure
issues, the framing of the business unknowns as schedulable decisions, and four
presentation and delivery items were surfaced in this session and appear in no earlier
backlog. The closing "New in this board" table lists them exactly; the remaining issues in
those sections come from the audits and hurdle lists above.

## How to read an issue

- **IDs are stable.** An `OPS-nnn` is never reused or renumbered. A dropped issue is struck
  through, not deleted, so a reference in a commit or a handoff keeps resolving.
- **Size** — `S` ≈ 1–3 hours · `M` ≈ 4–8 hours · `L` ≈ 1–3 days. Hours are for one developer
  who already knows the repository, and exclude waiting on a supplier or on the business.
- **Priority** — `P1` do now, `P2` next, `P3` when it gets in the way. Every priority states
  its reason; a bare priority is not schedulable.
- **Done when** is an acceptance check someone else could run without asking the author what
  was meant.
- A blocked-on-a-person issue (OPS-071 … OPS-079) is sized for *preparing and asking*, not
  for waiting.

This is a backlog, not a commitment. Nothing here authorises a subscription, an outbound
message, a paid crawl, a deployment or a business claim. The architecture constraint from the
remediation plan governs every item: *do not introduce a service, database, UI or generalised
workflow engine for this work.*

---

# 1. Trip production

The [trip layer](../../pipeline/trip/README.md) exists because a printed proposal was the
database and every redraft wiped it. One record is loaded:
[`west-henderson-chattanooga-2027-04-08`](../../pipeline/trip/trips/west-henderson-chattanooga-2027-04-08.trip.json).
`node pipeline/trip/cli.cjs validate --all` reports **0 errors, 21 warnings**;
`node pipeline/trip/cli.cjs renderers` reports **none installed**. The record is honest about
what it does not know — these issues are about turning that honesty into work someone can do.

#### OPS-001 · Motor-coach cost and operating terms are blank

- **Problem.** The `Motor coach` component carries `amount: null` ("not legible on the
  photographed quote screen") and `young-transportation` has no `unit_price`, no basis, no
  deposit and no cancellation terms — only a note. The record names the counterparty; the
  quote system it was transcribed from names the company on the bus line while leaving its own
  supplier field empty, so upstream nothing links that price to anyone. Driver-hours limits
  and any overnight policy are unrecorded for a four-day trip.
- **Change.** Recover the per-person coach figure from the quote system rather than the
  photograph, record it with `basis` and the source it came from, and add the charter terms
  that actually move a trip: deposit, balance, cancellation, driver-hours and overnight rules.
- **Size.** M (4–8 h) · **Priority.** P1 — it is the largest single unknown in the price, and
  a coach is the one supplier whose failure cancels the trip.
- **Depends on.** —
- **Done when.** The `Motor coach` component carries a numeric amount with the source it came
  from, `young-transportation.terms` holds a unit price with a known basis plus deposit,
  balance and cancellation terms, and `node pipeline/trip/cli.cjs validate --all` still
  reports 0 errors.
- **Source.** This session's analysis of the trip record; `pricing.components_per_person`.

#### OPS-002 · The hotel has no rooming-list deadline, cut-off or attrition terms

- **Problem.** Three nights and daily breakfast are sold as inclusions at $125.16 per person,
  and the property is not named on either printing. The supplier note says plainly that the
  rooming-list deadline, cut-off date and attrition terms are not recorded anywhere in the
  supplied pages. Those three dates are what a group trip is actually managed by.
- **Change.** Name the property, record `release_date`, the rooming-list due date, the
  attrition percentage and the deposit/balance schedule under `terms`, each with its source.
- **Size.** M (4–8 h, plus supplier response time) · **Priority.** P1 — a missed cut-off
  releases the block and re-prices the whole trip; this is the deadline most likely to be
  hit first.
- **Depends on.** OPS-011 (so the gap shows up as a finding, not prose)
- **Done when.** The hotel supplier carries a named property, a dated rooming-list deadline
  and a release date, each with its source, and the coverage check from OPS-011 no longer
  reports a missing deadline for it.
- **Source.** This session's analysis; `suppliers[hotel-chattanooga].terms.notes`.

#### OPS-003 · Three group dinners are sold with no venue, rate or minimum

- **Problem.** Day one's dinner prints a named dining complex on the proposal and is sold on
  the inclusions page while five other venues were being emailed for the same meal — the
  record calls it "the clearest case of the document asserting something the operation has not
  secured". Day two's and day three's dinners have no venue at all, only "sold as an
  inclusion". Three of fifteen inclusions are therefore unsourced.
- **Change.** Drive each dinner to one supplier with a per-person rate, a group minimum and a
  headcount deadline; record the losing candidates with their outcome so the shopping is not
  repeated. Until then the line state stays `sourcing` and any client document prints
  "venue being finalised".
- **Size.** M (4–8 h across three suppliers) · **Priority.** P1 — a printed inclusion that is
  not secured is the exact failure this layer was built to stop.
- **Depends on.** OPS-011
- **Done when.** Each of the three meal suppliers has a `unit_price` with a basis, a
  `minimum`, and a state of `quoted` or better, or the client-facing line reads the
  unsettled `client_word` from `schema.cjs`.
- **Source.** This session's analysis; `suppliers[dinner-day-one|two|three]`.

#### OPS-004 · The aquarium has no rate, minimum or deadline, and its IMAX inclusion has no slot

- **Problem.** Admission and the IMAX theatre are both sold as inclusions. The supplier has
  two logged attempts (a web form on 2026-09-10 and a follow-up call on 2026-09-11) and no
  terms at all. Separately, `inc-imax` is the one inclusion the validator already flags:
  priced and sold, with no time slot anywhere in the four-day itinerary.
- **Change.** Get the group rate, the minimum and the final-headcount deadline; then either
  place IMAX in the day-three schedule or move it out of the inclusions.
- **Size.** S (1–3 h, plus supplier response time) · **Priority.** P1 — it is the only
  inclusion the record already knows is unsellable as printed.
- **Depends on.** —
- **Done when.** `validate --all` no longer reports `inclusions.coverage inclusion:inc-imax`,
  and the aquarium supplier carries a rate and a deadline.
- **Source.** This session's analysis; validator warning on `inc-imax`.

#### OPS-005 · `Attractions $183.00` is one blended line with no supplier behind it

- **Problem.** The quote system carries every attraction as a single per-person figure with
  `supplier_id: null`, noted as unrecoverable from the blend. Meanwhile the handwritten pages
  give real per-supplier rates: Rock City $19 per student, Bessie Smith $5 per person plus a
  $50 per-group guide, a $100 flat incline deposit. The blend cannot be re-costed when the
  headcount moves, and it hides which attraction the margin is in.
- **Change.** Decompose the line into per-supplier components with their own `basis`, keep the
  blended figure as the observed quote-system value, and record the residual that the known
  rates do not explain rather than forcing them to add up.
- **Size.** M (4–8 h) · **Priority.** P1 — every attraction rate in the record is per person
  or per group, so the blend breaks the moment 80 travellers become 90.
- **Depends on.** OPS-004
- **Done when.** `pricing.known_unit_prices` covers every attraction sold as an inclusion, and
  a reconciliation lists the blended $183.00 against the sum of the known rates with the
  difference stated explicitly.
- **Source.** This session's analysis; `pricing.components_per_person[Attractions]`.

#### OPS-006 · `Dinners $90.00` has the same blend problem

- **Problem.** A single $90.00 per-person line covers three meals, with no supplier and no
  per-venue basis. Nothing says whether it is $30 a meal, or one expensive sit-down and two
  cheap ones, so no dinner can be re-quoted without re-deriving the whole line.
- **Change.** Split into three components keyed to the three meal suppliers, each carrying the
  rate actually quoted, once OPS-003 produces them.
- **Size.** S (1–3 h once the rates exist) · **Priority.** P2 — smaller money than the
  attractions blend and strictly downstream of OPS-003.
- **Depends on.** OPS-003
- **Done when.** Three dinner components exist with `supplier_id` set, and their total is
  compared against the $90.00 observed line.
- **Source.** This session's analysis; `pricing.components_per_person[Dinners]`.

#### OPS-007 · The published price table does not reconcile with the component lines

- **Problem.** The four legible component lines total $433.16 (hotel $125.16, attractions
  $183.00, dinners $90.00, commission $35.00) against a published quad price of $833 at 80
  paying travellers — leaving $399.84 per person that no line explains. The illegible coach
  figure, the three trip-granted comps and any margin all sit inside that gap, undistinguished.
- **Change.** Add a reconciliation that prints published price, known components, and the
  residual as a named figure, per headcount tier and occupancy. It explains, it does not
  recompute or endorse the operator's price.
- **Size.** M (4–8 h) · **Priority.** P1 — without it nobody can tell a pricing error from a
  margin, which is how two printings came to disagree in twelve cells.
- **Depends on.** OPS-001, OPS-005, OPS-006, OPS-009
- **Done when.** A reconciliation output exists for all three tiers and four occupancies, its
  residual is labelled as unexplained rather than as margin, and a deliberate change to one
  component moves the residual by exactly that amount.
- **Source.** This session's analysis; arithmetic over `pricing.published` and
  `pricing.components_per_person`.

#### OPS-008 · Two printings disagree and supersession is not modelled

- **Problem.** `version: "v1-factual"` carries `supersedes: null`, and the second printing
  survives only as `pricing.observed_variant` plus scattered `observed_variants` notes. Across
  the twelve price cells the change runs in four directions and the 80-to-100 discount
  flattens from $70 to $58, with no page recording why. Nothing in the record says which
  printing is current.
- **Change.** Model iterations as records with an explicit `supersedes` chain and a dated
  reason, so "which one is current" is a field rather than a memory.
- **Size.** M (4–8 h) · **Priority.** P2 — it is the root cause of the layer existing, but the
  immediate money questions (OPS-001 … OPS-007) have to be answerable first.
- **Depends on.** OPS-007
- **Done when.** Two trip records exist for this trip with a `supersedes` link, only one
  validates as current, and the differences between them can be listed from the records alone.
- **Source.** This session's analysis; `pricing.observed_variant`, `trip.supersedes`.

#### OPS-009 · Comps are recorded for one supplier and as a bare count for the group

- **Problem.** `schema.cjs` is explicit that vendor-earned and trip-granted comps move the
  price in opposite directions and are never one number. Rock City is the only supplier with a
  `comp_policy` (one per ten paid plus a driver). The group carries `trip_granted_comps: 3`
  with no cost effect recorded anywhere, and the record notes both were written in pen as bare
  numbers.
- **Change.** Record each supplier's own ratio where it exists, and carry the three
  trip-granted places through to the per-paying-traveller cost so the loading is visible.
- **Size.** M (4–8 h) · **Priority.** P2 — it is part of the residual in OPS-007 and cannot be
  separated from margin until it is recorded.
- **Depends on.** OPS-011
- **Done when.** Every supplier that grants comps has a `comp_policy` with a `kind`, and the
  reconciliation shows the trip-granted loading as its own figure.
- **Source.** This session's analysis; `schema.cjs COMP_KINDS`, `headcount.comp_note`.

#### OPS-010 · Five `requested` lines have an empty attempts log

- **Problem.** Seven suppliers have `attempts: []`. Five of them
  (`southern-belle`, `high-point-climbing`, `cirque-symphonie`, `dinner-day-two`,
  `dinner-day-three`) are in state `requested`, which asserts that a request went out while
  recording nothing about when, through which channel, or what came back. The attempts log
  exists precisely because one supplier got a web form *and* a voicemail on the same day.
- **Change.** Backfill the attempts that produced each `requested` state, and add a validator
  warning when a line is `requested` or later with no attempt recorded.
- **Size.** S (1–3 h) · **Priority.** P1 — cheap, and it is the difference between a follow-up
  list and a guess about who has already been called.
- **Depends on.** —
- **Done when.** No supplier is in `requested` or later with an empty `attempts` array, and a
  test asserts the new warning fires on a fixture that is.
- **Source.** This session's analysis; `suppliers[*].attempts`.

#### OPS-011 · Nothing checks that a sold inclusion has terms

- **Problem.** [`load.cjs`](../../pipeline/trip/load.cjs) validates shape — ids, dates, known
  categories, a basis on a price that exists — but never asks whether a supplier the trip
  sells has a price, a minimum or a deadline at all. `schema.cjs` lists ten term fields. No
  supplier carries all ten: Rock City comes closest with a price, a minimum, a comp policy, a
  headcount deadline and payment methods, and even it has no deposit, balance or cancellation
  terms. The other twelve are thinner still, and all of it is silent — so OPS-001 … OPS-004
  are visible only to someone who reads every note.
- **Change.** Add a `suppliers.coverage` check that warns, per supplier carrying a sold
  inclusion, for each absent term the supplier's category actually needs: a price and basis
  for all of them, a minimum where group rates apply, a headcount or release deadline, and a
  deposit and balance rule wherever money moves (see OPS-019).
- **Size.** M (4–8 h) · **Priority.** P1 — it converts the eight issues in this section that
  declare it as a dependency from prose into findings a run prints, which is what makes them
  schedulable.
- **Depends on.** —
- **Done when.** `validate --all` reports the missing terms on the current record, a
  purpose-built fixture carrying every term reports none, and the new findings use the
  existing `{severity, check, id, message}` shape.
- **Source.** This session's analysis; `pipeline/trip/load.cjs` checks inventory.

#### OPS-012 · A supplier-versus-itinerary conflict lives only in a prose note

- **Problem.** The day-two slot prints 08:30 at Ruby Falls; the supplier confirmed by phone
  that the first ride is 09:00. The record says "this printed time cannot be met as written" —
  in a `note` string that no check reads and no document has to print.
- **Change.** Give a slot a structured `conflicts` entry (what the itinerary says, what the
  supplier says, the source of each, and whether it is resolved) and make an unresolved
  conflict a validator finding.
- **Size.** M (4–8 h) · **Priority.** P1 — an unmeetable printed time reaches the client and
  the coach driver, and today nothing stops it.
- **Depends on.** OPS-011
- **Done when.** The Ruby Falls conflict is a finding rather than a note, and resolving it in
  the record clears the finding.
- **Source.** This session's analysis; the `d2-ruby-falls` slot note on 2027-04-09.

#### OPS-013 · Name and wording variants across printings have no resolution decision

- **Problem.** The climbing business is printed under two different names on the itinerary and
  inclusions pages. The performance venue is `Soldiers and Sailors Memorial Auditorium` on one
  printing and `Tivoli Theatre` on the other. The exclusions clause gains the word
  "Activities" on one printing. The two printings disagree about whether the group checks out
  before the riverboat. Each is recorded as a variant; none has a decision.
- **Change.** One `variants` structure with `chosen` and `reason` per disagreement, and a
  validator warning while `chosen` is null. A generated document may print only the chosen
  value.
- **Size.** M (4–8 h) · **Priority.** P2 — four known contradictions, each small, but they are
  the ones a client notices when two documents land in the same inbox.
- **Depends on.** OPS-011
- **Done when.** Every `observed_variants` / `venue_variants` entry carries a decision or an
  open warning, and no unresolved variant can reach a rendered document.
- **Source.** This session's analysis; `suppliers[cirque-symphonie].venue_variants`,
  `exclusions[exc-scope].observed_variants`, trip layer README.

#### OPS-014 · Own-cost and free-time slots are classified only in prose

- **Problem.** Seven of 27 slots have no supplier and no state — lunch stops, Point Park, the
  aquarium plaza lunch, optional baseball, Ross's Landing, the departure. They carry
  `included: false` and a human note like "at own cost, or can be added". A renderer that
  treats "no state" as "nothing to flag" prints them beside included lines with no distinction.
- **Change.** Add an explicit classification (`own_cost`, `free_time`, `optional_add_on`) to
  the vocabulary, require it when `included` is false, and make client-facing output print it.
- **Size.** S (1–3 h) · **Priority.** P2 — it is a client-money misunderstanding waiting to
  happen, but only once a client document is actually generated.
- **Depends on.** OPS-015
- **Done when.** Every slot is either supplied-with-a-state or classified, and a test asserts
  an unclassified non-included slot fails validation.
- **Source.** This session's analysis; slots `d1-lunch-stop`, `d2-point-park`, `d2-lunch`,
  `d3-lunch`, `d3-baseball`, `d4-ross-landing`, `d4-depart`.

#### OPS-015 · The trip layer generates no document yet

- **Problem.** `node pipeline/trip/cli.cjs renderers` prints "No renderers yet", so
  `render --all` writes nothing and `check --all` passes vacuously — the
  "tracked trip outputs are current" test asserts over an empty set. All the discipline in the
  record currently reaches nobody.
- **Change.** Install the first renderers under `pipeline/trip/renderers/` following the
  documented contract (deterministic, `Map` of filename → string, escape `|` and a leading
  `=+@-`, print `S.clientWord(state)` rather than implying booked). The obvious first four are
  a vendor sheet, a deadline calendar, an operational run sheet and a client itinerary.
- **Size.** L (1–3 days for the set; M for one) · **Priority.** P1 — it is the whole point of
  the layer and everything above only pays off through it.
- **Depends on.** OPS-011
- **Done when.** `renderers` lists installed renderers, `render --all` writes tracked outputs,
  `check --all` fails when the record changes without re-rendering, and no output prints an
  unconfirmed line as settled.
- **Source.** This session's analysis; trip layer README, "How to add a renderer".

#### OPS-016 · `relationship.status` is free text

- **Problem.** Supplier relationship statuses are prose. Six distinct values appear, and four
  of them — `requested`, `sourcing`, `quoted`, `deposit paid` — simply echo a `LINE_STATES`
  key, while the other two are notes about a document ("named in the quote system", "priced,
  property unnamed in these pages"). None of it can be counted or filtered, and the echoes can
  drift out of step with the line state they duplicate.
- **Change.** Delete the field and move the two genuine notes into `terms.notes`, so the line
  state remains the single truth about commitment. Keeping it as a vocabulary is the weaker
  option precisely because two thirds of its values are already line states.
- **Size.** S (1–3 h) · **Priority.** P3 — no output depends on it yet; fix before a second
  trip multiplies the drift.
- **Depends on.** —
- **Done when.** No supplier carries a `relationship.status`, the two document notes survive
  in `terms.notes`, and `validate --all` reports the same findings as before the change.
- **Source.** This session's analysis; `suppliers[*].relationship.status`.

#### OPS-017 · Supplier terms are trapped inside one trip record

- **Problem.** Rock City's minimum, comp ratio, headcount deadline and payment methods are
  properties of the *supplier*, not of this trip. They live inside
  `west-henderson-chattanooga-2027-04-08.trip.json`. A second Chattanooga trip re-types them,
  and the two copies drift the first time a rate changes.
- **Change.** Extract a destination library — suppliers and their standing terms, keyed by
  destination — that a trip references and may override per trip, with the override recorded
  as such.
- **Size.** L (1–3 days) · **Priority.** P2 — high leverage, but premature until one trip's
  terms are actually complete (OPS-001 … OPS-004).
- **Depends on.** OPS-001, OPS-002, OPS-003, OPS-004, OPS-011
- **Done when.** The Chattanooga suppliers load from the library, the existing trip validates
  unchanged, and a per-trip override is distinguishable from a standing term.
- **Source.** This session's analysis; trip record structure.

#### OPS-018 · There is no second trip to prove the library pays off

- **Problem.** One record cannot demonstrate reuse. Until a second trip shares the Chattanooga
  suppliers, the library in OPS-017 is an assertion, and so is the claim that this layer saves
  work rather than adding a JSON file to maintain.
- **Change.** Transcribe a second real trip — ideally the same destination with a different
  group, otherwise a different destination — and measure what was reused against what had to
  be re-entered.
- **Size.** L (1–3 days) · **Priority.** P2 — it is the evidence for continuing to invest
  here, and no renderer design should be finalised without it.
- **Depends on.** OPS-017
- **Done when.** Two trip records validate, the second names the reused suppliers, and the
  count of fields reused versus re-entered is recorded.
- **Source.** This session's analysis; this is the gap the coordinator named.

#### OPS-019 · No money calendar can be derived from the record

- **Problem.** Only the incline railway carries a `deposit` (a $100 flat deposit paid
  2026-09-11) and a `balance_due_days`. Nothing else records when money is due, so there is no
  way to answer "what is payable in March 2027" from the record.
- **Change.** Record deposit amount and date, balance-due rule and cancellation terms for
  every supplier that takes money, so a dated schedule is derivable.
- **Size.** M (4–8 h) · **Priority.** P2 — it is the second half of the deadline problem
  (OPS-002, OPS-011) and the one that reaches the client's payment schedule.
- **Depends on.** OPS-011
- **Done when.** Every supplier with a price has a deposit and balance rule or an explicit
  "none", and a dated payment schedule can be produced from the record alone.
- **Source.** This session's analysis; `suppliers[*].terms`.

---

# 2. Legacy pipeline repair

The Python pipeline in `scrapers/` and `scripts/` produced the 206-row list. The
[September 10 audit](../AUDIT-2026-09-10.md) found fourteen defects; two are repaired
(A03 in part, A05's client path), twelve remain, six of them P1 in the audit's own terms.
The [remediation plan](../superpowers/plans/2026-09-10-pipeline-remediation.md) holds the
interfaces and regression shapes — this section schedules them and does not restate them.

Nothing below is a prerequisite for the Carnegie demonstration. Each becomes a prerequisite
the moment its path is used for real data.

#### OPS-020 · Rebuilds discard researched school identities

- **Problem.** `carry_over()` keys the previous record by normalised name **and** state, while
  research fills state only on the final row. On the next merge the keys stop matching and the
  whole enriched row is skipped — location, school URL, district, enrollment, notes. Eight
  retained schools demonstrably lost their enrichment between two historical commits.
- **Change.** Remediation Task 1: an explicit source-observation → verified-identity
  resolution file applied before `merge()`, with the eight records recovered through it rather
  than by editing the CSV.
- **Size.** L (1–3 days) · **Priority.** P1 — it silently destroys the most expensive data in
  the repository, and every other repair rebuilds on top of it.
- **Depends on.** —
- **Done when.** Two successive rebuilds keep state, district, enrollment, school URL and
  provenance for the eight reviewed schools, and an ambiguous same-name observation stays
  unresolved even when only one candidate is present.
- **Source.** A01; remediation Task 1.

#### OPS-021 · Interim dedupe collapses two schools that share a name

- **Problem.** Interim dedupe keys on `(school.lower(), event, year)` and drops state and
  source, so two Lincoln High Schools in different states at the same event become one row
  before the state-aware merge ever runs. Reproduced in a temporary directory: TX retained,
  CA discarded.
- **Change.** Remediation Task 2: dedupe exact observations on normalised school, state, city,
  event, year and source URL; union the evidence; deduplicate event counts later by resolved
  identity.
- **Size.** M (4–8 h) · **Priority.** P1 — data lost here cannot be recovered by any later
  stage, and the fix is small and well specified.
- **Depends on.** OPS-020
- **Done when.** The two-state Lincoln fixture retains both rows, a same-name/two-city case
  retains both, and two corroborating URLs for one school still produce one event.
- **Source.** A06 (interim collision); remediation Task 2.

#### OPS-022 · Stateless rows are folded onto a single known name

- **Problem.** Separately from OPS-021, the merge folds a stateless observation onto the one
  same-named school that happens to be in the current list, treating uniqueness inside an
  incomplete dataset as proof of identity. The audited baseline has 37 rows with no state,
  mostly nicknames and common names.
- **Change.** Require an explicit reviewed resolution for any stateless identity join; leave
  the rest unresolved and queued.
- **Size.** M (4–8 h) · **Priority.** P1 — it manufactures identity, which is worse than a
  blank, and it is the same code path as OPS-021.
- **Depends on.** OPS-020, OPS-021
- **Done when.** A stateless Westlake observation stays separate with one stated Westlake in
  the list, and every automatic stateless join has a resolution row behind it.
- **Source.** A06 (stateless assignment); remediation Tasks 1 and 2.

#### OPS-023 · Non-empty partial scrape results can still replace good records

- **Problem.** `e6e493e` closed the empty-and-unusable case: the runner now rejects an empty
  batch and rows missing school, event or source URL before touching an interim CSV. A source
  that returns *some* well-formed rows after a partial failure still passes, and replaces that
  source's scoped years. A03 is not closed.
- **Change.** Remediation Task 3's `SourceResult`: complete years, failures and rows reported
  separately, with replacement allowed only for a validated complete partition.
- **Size.** L (1–3 days) · **Priority.** P1 — it is the remaining half of the defect that
  loses historical appearances, and it blocks any production refresh.
- **Depends on.** —
- **Done when.** A BOA archive failure, one failed recap, an all-pages H-E-B failure, a
  genuinely empty published lineup and a markup-change empty parse each produce the right
  status, and the blocked case leaves prior files byte-identical.
- **Source.** A03 (remainder); remediation Task 3; verified-repairs table in
  [PROGRESS](../carnegie-hall/PROGRESS.md).

#### OPS-024 · Caches never expire, so a refresh can read a stale page forever

- **Problem.** `fetch()` returns cached HTML with no expiry and the year-scoped runner passes
  no freshness requirement, so Wikipedia, BOA archives and other stable URLs can miss new
  announcements indefinitely with no network request at all. News searches force a refresh;
  nothing else does.
- **Change.** Remediation Task 3: a `refresh` flag through the source fetches, a freshness
  policy for discovery indexes and requested years, immutable historical cache where
  appropriate, and reported cache timestamps.
- **Size.** M (4–8 h) · **Priority.** P1 — a refresh that reads last year's page and reports
  success is worse than no refresh.
- **Depends on.** OPS-023
- **Done when.** A cached index is refetched in refresh mode, an offline parse still uses the
  cache, and a cache hit does not advance the source-review date.
- **Source.** A04; remediation Task 3.

#### OPS-025 · Discovery years and categories are frozen in code

- **Problem.** BOA's default range ends in 2025 and Hollywood's categories are hard-coded, so
  a future full scrape silently covers less than it appears to.
- **Change.** Derive supported years from the requested run and report unsupported categories
  explicitly instead of skipping them.
- **Size.** S (1–3 h) · **Priority.** P2 — small, but it makes a "complete" run quietly
  incomplete, which undermines OPS-023's completeness reporting.
- **Depends on.** OPS-023
- **Done when.** A run requesting 2027 either covers it or reports it unsupported by name.
- **Source.** A04 (year ranges); remediation Task 3.

#### OPS-026 · Credential sanitisation is repaired in the client, not in the runner

- **Problem.** `e4e6a9b` sanitised the SerpAPI client's error paths and covered connection
  errors, tracebacks and API error bodies with a dummy key. Timeouts, non-JSON bodies and the
  runner's own persisted blocked metadata are not covered, and the publication scan checked
  candidate files rather than full history.
- **Change.** Remediation Task 4's remaining items: extend coverage to timeout and non-JSON
  failures and to what the runner writes into `data/interim/_blocked.json`.
- **Size.** S (1–3 h) · **Priority.** P2 — the demonstrated exposure path is closed; this is
  the tail, and no actual leak was ever found.
- **Depends on.** —
- **Done when.** A dummy key cannot appear in a printed message, a persisted blocked record or
  a cache file, under timeout, non-JSON and API-error conditions.
- **Source.** A05 (remainder); remediation Task 4, two checked items.

#### OPS-027 · Crawl policy has unguarded error and redirect paths

- **Problem.** A robots retrieval error and every non-200 response are treated as permission
  to crawl, including a reproduced 503. Redirects are followed without re-validating the
  destination against robots, throttle or school scope. NCES archive downloads and the
  dead-URL probe bypass the shared policy without that exception being documented.
- **Change.** Remediation Task 4: distinguish absent robots from unavailable robots, defer on
  unavailable, validate redirect destinations, download archives to a temporary path and
  rename only on success, and document the two narrow exceptions.
- **Size.** M (4–8 h) · **Priority.** P1 — it is the guardrail the whole project's public-data
  promise rests on.
- **Depends on.** —
- **Done when.** 404 robots absence, 503 unavailability, a connection failure, a disallowed
  redirect target and per-host throttling each have a test, and an interrupted ZIP download
  leaves no final cache artifact.
- **Source.** A11; remediation Task 4.

#### OPS-028 · A stored director email belongs to a district role, not the school's band

- **Problem.** One of the two stored director emails is a district Director of Fine Arts
  address on a district fine-arts page, accepted because the domain matched. A plain-text
  reproduction confirms the bug: an adjacent role's address is paired with the band director's
  name. "Existing non-empty fields are never overwritten" preserves it indefinitely.
- **Change.** Remediation Task 5: verify role, name, email and school within one staff record;
  quarantine district-level records; store per-contact source and scope; re-run extraction
  after the rule changes. The one correctly attributed contact stays, including its unusual
  source spelling.
- **Size.** M (4–8 h) · **Priority.** P1 — a wrong-role contact is the defect most likely to
  cause a real-world embarrassment the moment anyone uses the list.
- **Depends on.** OPS-030
- **Done when.** The adjacent-role fixture yields either the correctly bound address or a
  blank, never the neighbour's, and the district-role contact is quarantined with a reason.
- **Source.** A02; remediation Task 5.

#### OPS-029 · Enrichment crosses school boundaries

- **Problem.** One row carries a Wisconsin city and parade evidence with a Milwaukee district
  and website; the official directory has two distinct schools of that name and rechecking
  selects the other. An unrecognised non-empty city disables the tie downgrade, so two
  identical-name schools get a 1.0 "unique" match on a city string that matched neither.
  `_domain()` reduces two different `k12.tx.us` districts to the same value.
- **Change.** Remediation Task 5: store the NCES ID with its source vintage, distinguish
  "city provided" from "city matched", refuse to auto-fill tied identities, use an explicit
  verified host allowlist, and revalidate populated fields rather than only empty ones.
- **Size.** L (1–3 days) · **Priority.** P1 — it is a known wrong row in the current data, not
  a hypothetical.
- **Depends on.** OPS-030
- **Done when.** The unmatched-city fixture scores below threshold, the conflicting row is
  corrected through the evidence layer with both IDs recorded, and two `k12.tx.us` districts
  no longer look identical.
- **Source.** A07; remediation Task 5.

#### OPS-030 · Evidence is attached to rows, not to claims

- **Problem.** A row carries `source_urls` as a bag. Nothing says which URL supports which
  field, NCES IDs and file vintage are not retained, and booster strings have no provenance of
  their own. That is why OPS-028 and OPS-029 cannot be verified or re-run field by field.
- **Change.** Remediation Task 5: a field-evidence file keyed by school, field, value, source
  URL, source kind, record id, vintage, verification date and status, with a small helper
  module.
- **Size.** L (1–3 days) · **Priority.** P1 — it is the foundation both contact repairs need,
  and the same model the trip and pipeline layers already use.
- **Depends on.** OPS-020
- **Done when.** Every populated contact and identity field in the current data has an
  evidence row with a status, and `verified` cannot be set without a source URL.
- **Source.** A13; remediation Task 5.

#### OPS-031 · Publication dates are invented into event years

- **Problem.** The news parser subtracts a year from any January–March article without an
  explicit headline year. One stored 2017 appearance is sourced to a January 2018 article
  announcing a trip *that coming* Thanksgiving, which inflates that school's count from one
  supported event-year to two.
- **Change.** Remediation Task 6: remove the blanket first-quarter subtraction; an unsupported
  event year stays unknown; keep announced and completed participation distinct.
- **Size.** M (4–8 h) · **Priority.** P1 — it fabricates a fact from a date, which is the one
  thing the project's guardrails forbid outright.
- **Depends on.** —
- **Done when.** The January-2018 fixture cannot yield a 2017 event, and the affected row is
  corrected through the parser and evidence layer rather than by hand.
- **Source.** A08; remediation Task 6.

#### OPS-032 · Totals overstate what the evidence supports

- **Problem.** Competitions and future invitations enter `parades_marched` and
  `last_appearance` as if they were completed parades — 20 rows are competition-only and two
  have only a future invitation. The summary counts 100 Rose event-year appearances across 81
  schools and labels the 100 "Schools". Recency defaults to a fixed year that never ages.
- **Change.** Remediation Task 6: separate evidence type from participation status, count
  unique identities separately from event-years, make score components inspectable and add an
  explicit as-of date. Do not change the weights until the product meaning is decided.
- **Size.** M (4–8 h) · **Priority.** P2 — it misleads a reader rather than corrupting the
  data, and the weighting half is a business decision (OPS-076).
- **Depends on.** OPS-031
- **Done when.** "Selected" never reads as "has marched", the Schools column counts schools,
  and a before/after comparison exists for three named rows.
- **Source.** A09; remediation Task 6.

#### OPS-033 · Field values are attributed to the wrong entity

- **Problem.** H-E-B assigns Houston/TX to every participant with no location statement from
  the lineup. `band_url` holds school homepages, district music pages and, in one case, an
  orchestra-camp article. An organic pick resolved a district homepage into a school row.
  Six booster strings have never been reviewed.
- **Change.** Remediation Task 6 and Task 5: resolve participant location from school
  evidence, require school scope for a `band_url`, and queue district-level groups and
  unresolved nicknames for review.
- **Size.** M (4–8 h) · **Priority.** P2 — wrong but visible, and mostly repaired by the
  evidence model rather than by new logic.
- **Depends on.** OPS-030
- **Done when.** No row's location comes from the event venue, and every `band_url` has an
  evidence row asserting school scope or a review flag.
- **Source.** A13 (attribution); remediation Tasks 5 and 6.

#### OPS-034 · Refresh reporting disagrees with the artifacts

- **Problem.** Deleted schools are omitted from refresh diffs — a one-row-to-zero reproduction
  reports zero new and zero updated. Partial and blocked runs can exit successfully.
  `make refresh` preserves old score and tier fields without rescoring or regenerating derived
  files, so the published set can be a mix of old and new.
- **Change.** Remediation Task 7: one validated snapshot produces every artifact, a manifest
  records input hashes and run status, the diff reports added, changed, removed and
  retained-on-failure, and a previous snapshot is kept for rollback.
- **Size.** L (1–3 days) · **Priority.** P2 — it matters at the moment of publishing, which is
  after OPS-020 … OPS-024 make a rebuild safe at all.
- **Depends on.** OPS-023, OPS-024
- **Done when.** A removal appears in the diff, an interrupted export cannot publish a mixed
  set, and an incomplete run exits non-success.
- **Source.** A10; remediation Task 7.

#### OPS-035 · Exported source text can become a spreadsheet formula

- **Problem.** `_write_sheet()` writes strings verbatim; a school value of `=1+1` produces a
  formula cell. Re-reproduced on September 12, three months after it was first reported. The
  input path is public web scraping and the output is a document handed to a school.
- **Change.** Remediation Task 7: serialise source text as text in XLSX and apply a documented
  safe CSV policy at the export boundary, without changing internal canonical values.
- **Size.** S (1–3 h) · **Priority.** P2 — genuinely small and twice-confirmed; it is only not
  P1 because no such value exists in the current data.
- **Depends on.** —
- **Done when.** A leading `=`, `+`, `-`, `@`, tab or CR round-trips as inert text in both
  CSV and XLSX, numeric fields stay numeric, and a test asserts the cell type.
- **Source.** A12, re-reproduced as F4; remediation Task 7.

#### OPS-036 · Suppression is promised and not implemented

- **Problem.** The historical client overview says a suppression list is applied. No
  suppression implementation exists, and no suppression input has been supplied. An empty list
  currently cannot be distinguished from "no restrictions".
- **Change.** Remediation Task 8: suppression keyed by verified identity with reason and
  effective date, filtering outreach-ready exports while preserving raw research, and
  reporting an empty list explicitly as "none supplied".
- **Size.** M (4–8 h) · **Priority.** P2 — it must exist before any outreach-ready export, and
  it is cheap; it stays P2 only because no outreach is scheduled.
- **Depends on.** OPS-078 (the input), OPS-030
- **Done when.** A synthetic suppressed school survives in research data, never appears in an
  outreach-ready output after a rebuild, and an empty list is reported as unsupplied.
- **Source.** A14; remediation Task 8.

#### OPS-037 · The 188 exclusions have never been reviewed against evidence

- **Problem.** Regex exclusion checks report zero findings on the retained list, which is not
  an eligibility review. One entry is a district rather than a school. Combined and honour
  bands name several real schools inside one excluded row and those schools are never
  extracted. Ambiguous junior-high names risk both false positives and false negatives.
- **Change.** Remediation Task 8: review the exclusions by category against evidence, add
  fixtures for the ambiguous cases, and preserve the existing deliberate exceptions.
- **Size.** L (1–3 days) · **Priority.** P3 — it affects reach rather than correctness of what
  is published, and it is mostly manual.
- **Depends on.** OPS-030
- **Done when.** Every exclusion category has a fixture, the district-level entry has a
  decision, and cheer-only and combined groups remain out under the stated policy.
- **Source.** A13 (eligibility); remediation Task 8; Codex handoff section 4.

#### OPS-038 · No controlled refresh has ever been run or rolled back

- **Problem.** No staged refresh of a single reachable source has been performed, no rollback
  drill has been exercised, and a fresh-environment install has never been proven — the
  existing `.venv` results do not certify a clean machine.
- **Change.** Remediation Task 9: a fresh-environment install, a staged refresh of one allowed
  source with an evidence and count comparison, then a deliberate failure and rollback.
- **Size.** M (4–8 h) · **Priority.** P2 — it is the gate before any scheduling, and it is
  meaningless before OPS-023, OPS-024 and OPS-034 land.
- **Depends on.** OPS-023, OPS-024, OPS-034
- **Done when.** One successful controlled run and one failure-and-rollback drill are
  recorded, with the pinned dependency set installed from scratch.
- **Source.** Remediation Task 9.

#### OPS-039 · Nothing imports the researched list into the pipeline case layer

- **Problem.** The universal pipeline's Stage 2 is fed by hand. The CRM staging file for the
  real case is empty by design, and `data/final/prospects.csv` is not imported automatically —
  correctly, because importing it today would inherit A01, A02, A06, A07 and A13 wholesale.
- **Change.** A reviewed importer that quarantines the audited defects rather than inheriting
  them: rows without field evidence arrive as unresolved, wrong-role contacts do not arrive at
  all, and same-name identities stay separate.
- **Size.** L (1–3 days) · **Priority.** P2 — it is the recorded next increment for the
  pipeline layer, and it is the point where the legacy repairs start paying for themselves.
- **Depends on.** OPS-020, OPS-028, OPS-030
- **Done when.** An import produces cases whose governance report names every quarantined row
  and its reason, and no imported contact passes the CRM gate without published detail,
  recorded permission and a known owner.
- **Source.** Remediation Task 10 (superseded scope); "proposed next increment" in
  [PROGRESS](../carnegie-hall/PROGRESS.md).

#### OPS-040 · The September 10 audit can no longer reproduce itself

- **Problem.** `docs/audits/2026-09-10/reproduce.py` crashes because it asserts the old
  behaviour that `e6e493e` correctly made raise. The audit's baseline is therefore
  unverifiable by its own means, and the repository cannot currently demonstrate which prior
  findings still reproduce.
- **Change.** Update the harness to assert the current contract, or mark the A03 section
  superseded and record where the fix is proven instead.
- **Size.** S (1–3 h) · **Priority.** P2 — every legacy issue above is scheduled on the
  assumption that the audit's findings still hold; this is how that is checked.
- **Depends on.** —
- **Done when.** The reproduction script runs to completion and its output states, per
  finding, whether it still reproduces.
- **Source.** F5 in the [repository audit](../AUDIT-2026-09-12-REPOSITORY.md).

---

# 3. Developer workflow and CI

None of this existed before this session's review. The repository is a solo project with
five test suites (one pytest, four Node), two dependency managers, a tracked symlink, 34
tracked binary files, a deployment and no automation at all. These issues are cheap, they compound, and several of
them are why a false status claim survived in the project's own instructions.

#### OPS-041 · There is no CI

- **Problem.** `.github/` does not exist. Nothing runs on push: not the Python suite, not the
  four Node suites, not the pipeline staleness checks, not the demo packaging. Every check is
  something a person remembers to type, and OPS-045 is the proof that this fails.
- **Change.** Add `.github/workflows/checks.yml` running, on push and pull request:
  `make test` (Python), `node --test tests/*.test.cjs`, `node pipeline/cli.cjs check --all`,
  `node pipeline/trip/cli.cjs check --all`, and `node scripts/package-demo.cjs`. No secrets,
  no network beyond dependency installation, no scheduled trigger.
- **Size.** M (4–8 h) · **Priority.** P1 — it is the mechanism that keeps every other issue on
  this board from silently regressing.
- **Depends on.** OPS-042, OPS-044
- **Done when.** A pull request shows all five checks, a deliberately broken test fails the
  run, and no workflow file carries a `schedule:` trigger.
- **Source.** This session's analysis; F2 and F3 in the repository audit.

#### OPS-042 · There is no single command that checks the project

- **Problem.** Full coverage needs `make test` (Python only) **plus** `make pipeline-check`
  **plus** `npm test` in `demo/carnegie-hall` **plus** `node --test tests/trip_*.test.cjs`.
  The obvious command, `make test`, reports green while a Node test fails. That is the
  mechanism that let a false status claim persist.
- **Change.** Add `make check` that runs every suite, and make `make test` either do the same
  or state in the Makefile that it covers Python only and name the others.
- **Size.** S (1–3 h) · **Priority.** P1 — the smallest change with the largest effect on
  whether any status claim in this repository can be trusted.
- **Depends on.** OPS-044
- **Done when.** `make check` from a fresh checkout runs Python, all four `.cjs` suites, both
  staleness checks and the demo packaging, and fails if any one of them fails.
- **Source.** F2 in the [repository audit](../AUDIT-2026-09-12-REPOSITORY.md).

#### OPS-043 · The trip test suite is reachable from no documented command

- **Problem.** [`tests/trip_foundation.test.cjs`](../../tests/trip_foundation.test.cjs) is run
  by neither `make pipeline-check` (which names only `tests/pipeline.test.cjs`) nor the demo's
  `npm test` (which names the two Carnegie suites). Its only mention anywhere is a code block
  in the trip layer README. Seven tests, including the privacy check on the trip record, run
  only if someone reads that file.
- **Change.** Fold it into `make check`, and stop naming individual files where a glob will do.
- **Size.** S (1–3 h) · **Priority.** P1 — the privacy check is the one test that protects a
  named guardrail, and today nothing routine runs it.
- **Depends on.** OPS-042
- **Done when.** Removing an assertion from `trip_foundation.test.cjs` makes `make check` fail.
- **Source.** This session's analysis; `Makefile`, `demo/carnegie-hall/package.json`.

#### OPS-044 · A fresh checkout cannot run the Node suite

- **Problem.** No `node_modules` exists and no documented step installs one, so
  `node --test tests/*.test.cjs` fails test 10 with `Cannot find module 'docx'` on every fresh
  checkout, worktree and cloud environment — reproduced again today at `bb6ac1e`: **41 pass,
  1 fail**. The root README documents `make venv` for Python and nothing for Node.
  `package-lock.json` is committed, so this is purely a documentation and automation gap.
- **Change.** Add `make node-deps` running `npm ci` in `demo/carnegie-hall`, wire it into
  `make check`, and document it in the root README beside `make venv`.
- **Size.** S (1–3 h) · **Priority.** P1 — it is the first thing every new checkout hits, and
  it is what makes the suite honest.
- **Depends on.** —
- **Done when.** A fresh clone followed by `make check` passes with no manual npm step, and
  the failing test 10 passes.
- **Source.** F1 and F3 in the [repository audit](../AUDIT-2026-09-12-REPOSITORY.md);
  reproduced at `bb6ac1e`.

#### OPS-045 · A project status claim about tests is false

- **Problem.** [`AGENTS.md`](../../AGENTS.md) states "Twenty Node checks and four-width
  browser checks pass". The run produces 19 pass, 1 fail in the demo suites. Anyone resuming
  from the project instructions believes a check passed that did not complete, and the
  instruction file is the first thing every session reads.
- **Change.** Correct the claim to what the run actually produces after OPS-044, and adopt one
  rule: a status line that claims a check passed names the command that produced it.
- **Size.** S (1–3 h) · **Priority.** P1 — a false claim in the instruction file poisons every
  decision made from it, and the repair is one paragraph.
- **Depends on.** OPS-044
- **Done when.** Every "checks pass" sentence in `AGENTS.md` and
  [PROGRESS](../carnegie-hall/PROGRESS.md) names its command, and running those commands
  reproduces the stated result.
- **Source.** F1 in the [repository audit](../AUDIT-2026-09-12-REPOSITORY.md).

#### OPS-046 · No `.gitattributes`, with a tracked symlink and 34 tracked binaries

- **Problem.** `CLAUDE.md` is a committed symlink (mode `120000`) that the project requires to
  resolve to `AGENTS.md`. A clone with `core.symlinks=false` — the Windows default — replaces
  it with a text file containing the word `AGENTS.md`, and the "verify CLAUDE.md still
  resolves" instruction passes while the content is gone. There is no `.gitattributes` to mark
  the 34 tracked binaries as binary, and nine `.HEIC` files sit beside five `.heic` in one
  directory, which is the hazard class that breaks on a case-sensitive filesystem — and the
  deployment target is Linux.
- **Change.** Two separate things, because no attribute can fix the symlink — Git materialises
  a mode-`120000` entry according to `core.symlinks`, not `.gitattributes`. First, add
  `.gitattributes`: `* text=auto eol=lf`, explicit `binary` for the tracked media and document
  types, and normalise the extension case in one commit. Second, add a check to `make check`
  that asserts `CLAUDE.md` and `AGENTS.md` have identical content, so a clone that flattened
  the link fails loudly instead of silently reading a one-line stub.
- **Size.** S (1–3 h) · **Priority.** P1 — cheap, and the symlink failure is silent and
  affects the file that carries every project rule.
- **Depends on.** OPS-042
- **Done when.** `.gitattributes` exists, `git ls-files --eol` shows no mixed endings on text
  files, extension case is consistent, and replacing `CLAUDE.md` with a one-line stub makes
  `make check` fail.
- **Source.** This session's analysis; F7 in the repository audit.

#### OPS-047 · Local `main` is 49 commits stale and points at a placeholder

- **Problem.** Local `main` is at `a45985a`, "Placeholder README while the code moves in" —
  49 commits behind `origin/main`. Every `git diff main`, every branch cut from `main` and
  every "is this merged?" question answers against a repository that contains almost nothing.
- **Change.** Fast-forward local `main` to `origin/main`, and check it before cutting a branch.
- **Size.** S (under 1 h) · **Priority.** P1 — trivially cheap, and it silently corrupts every
  comparison anyone makes.
- **Depends on.** —
- **Done when.** `git rev-list --count main..origin/main` prints 0.
- **Source.** This session's analysis; `git log --oneline main -1`.

#### OPS-048 · No tags and no releases

- **Problem.** `git tag` is empty. There is no way to name the state that was audited, the
  state that was deployed, or the state a document's claims were verified against — so every
  reference is a bare SHA in prose, and the documentation is full of them.
- **Change.** Tag the states the documents already cite (the audit baseline, the published
  demo checkpoint, the current layer milestone) and tag a reviewed state from here on.
- **Size.** S (1–3 h) · **Priority.** P3 — a convenience for a solo developer, valuable mostly
  because this project's documents cite commits constantly.
- **Depends on.** OPS-047
- **Done when.** `git tag` lists at least the audit baseline and the deployed demo state, and
  the documents citing those SHAs also name the tag.
- **Source.** This session's analysis.

#### OPS-049 · Two Python dependency manifests can drift

- **Problem.** [`requirements.txt`](../../requirements.txt) and
  [`pyproject.toml`](../../pyproject.toml) both pin the dependency set. They agree today.
  Nothing checks that, `make venv` installs from `requirements.txt` only, and `pyproject.toml`
  carries the pytest configuration that the venv path never reads.
- **Change.** Pick one source of truth — most cheaply, generate one from the other or add a
  check that compares them — and say in the README which one a person edits.
- **Size.** S (1–3 h) · **Priority.** P2 — harmless until the day they disagree, and then the
  failure is a mystery.
- **Depends on.** OPS-042
- **Done when.** A deliberate version bump in one file fails a check until the other matches.
- **Source.** This session's analysis.

#### OPS-050 · No linter, formatter or type checker

- **Problem.** No `ruff`, `flake8`, `black`, `eslint` or `prettier` configuration exists
  anywhere. Roughly 3,800 lines of Python and a growing set of `.cjs` modules are held to
  style by hand. The handoff already records three copies of the same `_note()` /
  `_add_source()` helper across three scripts, which is exactly what a linter surfaces.
- **Change.** Add `ruff` (lint and format) for Python with a minimal rule set; rely on
  `node --test` plus review for the `.cjs` files rather than adding a second toolchain. Fix or
  explicitly ignore the existing findings in one pass.
- **Size.** M (4–8 h) · **Priority.** P2 — genuinely useful, but it must not become a diff
  touching every file before the correctness work lands.
- **Depends on.** OPS-041, OPS-049
- **Done when.** `ruff check` and `ruff format --check` pass in CI, and the duplicated helper
  is either folded into one module or explicitly exempted.
- **Source.** This session's analysis; code-quality section of the
  [Codex handoff](../CODEX_HANDOFF.md).

#### OPS-051 · Branch sprawl

- **Problem.** Nine branches are unmerged into `main` and four already-merged branches remain
  undeleted; one branch name recorded intent the remote could not see. With several agents
  cutting branches in parallel this grows monotonically.
- **Change.** Delete merged branches, and record for each unmerged branch whether it is in
  flight, superseded or abandoned.
- **Size.** S (1–3 h) · **Priority.** P3 — noise rather than risk, but it makes "what is
  outstanding" unanswerable.
- **Depends on.** OPS-047
- **Done when.** Every remaining branch has a one-line status and no merged branch survives.
- **Source.** F10 in the [repository audit](../AUDIT-2026-09-12-REPOSITORY.md).

#### OPS-052 · About 22MB untracked and un-ignored

- **Problem.** Three directories — an archive (8.2MB), a notebook pack (5.5MB) and a research
  working folder (8.1MB) — are neither tracked nor ignored, so they appear in every
  `git status`. That makes the real working set hard to read and an accidental `git add -A`
  expensive. (F8's own heading says 13.7MB, which is the first two of the three; the three
  sizes it lists total 21.8MB.)
- **Change.** Decide per directory: ignore it, or track it deliberately. Ignoring is the
  expected answer for all three; the point is that the decision is recorded.
- **Size.** S (under 1 h) · **Priority.** P2 — one-time, and it protects against a costly
  accidental commit in a repository where several agents run `git add`.
- **Depends on.** —
- **Done when.** `git status --short` on an otherwise clean checkout prints nothing.
- **Source.** F8 in the [repository audit](../AUDIT-2026-09-12-REPOSITORY.md).

#### OPS-053 · 31MB of phone photographs are tracked forever

- **Problem.** The logistics directory holds 14 HEIC files totalling 31.2MB, the largest
  single file being 3.9MB. HEIC is not universally renderable, nothing in the web root
  references them, and every clone carries them permanently. They are also primary evidence
  for the event facts, which is why they were committed.
- **Change.** Decide explicitly: keep as tracked evidence, or convert to a renderable format
  and hold the originals outside the repository. Do not rewrite history to remove them — a
  rewrite costs more than the 31MB.
- **Size.** S (1–3 h) · **Priority.** P3 — an annoyance, and the evidence value is real.
- **Depends on.** OPS-046
- **Done when.** The decision and its reason are recorded, and if the files stay they are
  marked binary with a consistent extension case.
- **Source.** F7 in the [repository audit](../AUDIT-2026-09-12-REPOSITORY.md).

#### OPS-054 · Twelve absolute machine-local paths in tracked documentation

- **Problem.** Six links in the learning guide point **into this repository** by an absolute
  `/Users/<user>/...` path rather than relatively, so the onboarding document yields dead
  links in every worktree, cloud checkout and second machine. Two more point into a
  version-pinned plugin cache. Four in the instruction files are deliberate references to
  machine-local global instructions.
- **Change.** Convert the six in-repository links to their relative equivalents, which already
  exist and work; annotate the genuinely machine-local ones as such.
- **Size.** S (1–3 h) · **Priority.** P2 — that file exists to orient someone starting work,
  and it currently fails exactly that reader.
- **Depends on.** —
- **Done when.** No tracked document links into this repository by absolute path, and every
  remaining absolute link is labelled machine-local.
- **Source.** F6 in the [repository audit](../AUDIT-2026-09-12-REPOSITORY.md).

#### OPS-055 · The root README does not mention the two current layers

- **Problem.** [`README.md`](../../README.md) documents the original parade pipeline and its
  `make` targets. It says nothing about [`pipeline/`](../../pipeline/README.md) or
  [`pipeline/trip/`](../../pipeline/trip/README.md) — the two layers actually being built.
  Someone arriving at the repository finds the audited legacy code and no sign of the current
  work.
- **Change.** Add a short "what is here now" section naming the three layers, what each one
  owns, and the one command that checks them.
- **Size.** S (1–3 h) · **Priority.** P2 — orientation, which matters more than usual in a
  repository whose history actively misleads.
- **Depends on.** OPS-042
- **Done when.** The README names all three layers with working relative links, and its
  command list includes `make check`.
- **Source.** This session's analysis.

#### OPS-056 · `workflows/refresh.yml` implies a schedule that does not exist

- **Problem.** [`workflows/refresh.yml`](../../workflows/refresh.yml) sits outside
  `.github/workflows/`, so GitHub never runs it. It was left there because the tool in use
  could not push workflow files. It still reads as a configured seasonal refresh with dates,
  and several documents have had to keep explaining that it is inert.
- **Change.** Once real CI exists, either move it under `.github/workflows/` with manual
  dispatch only and no schedule, or delete it and keep the intent in the maintenance notes.
- **Size.** S (1–3 h) · **Priority.** P2 — a file that looks like automation is worse than no
  file, and it points at a pipeline that is not yet safe to refresh.
- **Depends on.** OPS-041, OPS-038
- **Done when.** No YAML in the repository describes a schedule that is not running, and the
  refresh owner and destination are named in one place.
- **Source.** Hurdle 14 in [scraping hurdles](../SCRAPING_HURDLES.md); A10.

#### OPS-057 · The privacy rule is enforced on one file only

- **Problem.** The trip layer's privacy rule — business names and published group-sales
  channels yes, individual names, personal mailboxes and direct numbers never — is enforced by
  a single test over the trip record. Generated outputs, new documentation, commit messages
  and test fixtures are covered by nothing, although the rule explicitly applies to all of
  them.
- **Change.** A repository-wide check for personal-contact patterns over tracked text files
  and generated outputs, with an allowlist for the published business channels that are
  legitimately recorded.
- **Size.** M (4–8 h) · **Priority.** P1 — this is the guardrail whose breach cannot be undone
  once anything is published, and renderers (OPS-015) are about to multiply the surfaces it
  has to cover.
- **Depends on.** OPS-041
- **Done when.** The check runs inside `make check`, fails on a fixture containing a personal
  mailbox or a direct number, and passes on the current tree.
- **Source.** This session's analysis; privacy rule in the
  [trip layer README](../../pipeline/trip/README.md).

---

# 4. Research and evidence

The research backlog is already written down in detail; these issues schedule it. Each is
public-data work under the existing guardrails: robots.txt honoured, one request per second
per host, every row carrying a source URL, and blank preferred over a guess.

#### OPS-058 · Four blocked parade sources have parsers and no pages

- **Problem.** The official Macy's pages, the Macy's fan wiki, the Tournament of Roses press
  pages and the Chicago parade site all block the environment the scrapers ran in — 403, a
  captcha challenge and a TLS handshake failure. Parsers exist and are tested against
  fixtures. The handoff calls this the single biggest data gain available, plausibly 100+
  schools.
- **Change.** Save each lineup page from a normal browser into the cache path the runner
  prints, then re-run discovery. No new code and no new dependency.
- **Size.** M (4–8 h) · **Priority.** P2 — the largest data gain per hour available, but it
  feeds a merge path that OPS-020 … OPS-023 have not yet made safe.
- **Depends on.** OPS-020, OPS-021, OPS-023
- **Done when.** Each of the four parses from a saved page, the new rows carry their source
  URLs, and each blocked record is cleared with a reason.
- **Source.** Hurdles 1–4 in [scraping hurdles](../SCRAPING_HURDLES.md);
  [Codex handoff](../CODEX_HANDOFF.md) §3.5.

#### OPS-059 · BOA regional results are PDF-only and unparsed

- **Problem.** Grand National finalists parse from HTML; 345 regional event pages publish
  results as PDF only. No PDF library is in the approved dependency list, so regional
  finalists are counted and not captured.
- **Change.** Decide on `pypdf` (pure Python, no system dependency), then write one parser and
  fixture. If it is declined, record that regional results are permanently out of scope.
- **Size.** M (4–8 h after approval) · **Priority.** P3 — a real gain, but it adds a
  dependency to a pipeline under repair and competes with OPS-058 for the same hours.
- **Depends on.** OPS-058
- **Done when.** Either a regional recap parses under test from a trimmed fixture, or the
  decision to decline is recorded with its reason.
- **Source.** Hurdle 8 in [scraping hurdles](../SCRAPING_HURDLES.md).

#### OPS-060 · Stateless rows cannot be placed without guessing

- **Problem.** Thirty-seven rows have no state in the audited baseline, because their sources
  publish unit names only. Search cannot place a common name or a nickname without guessing,
  and guessing is forbidden. These rows also score lowest on geography purely because the
  field is blank.
- **Change.** Manual placement into the resolution file from OPS-020, one row at a time, with
  the evidence page recorded; rows that stay ambiguous stay blank.
- **Size.** L (1–3 days, manual) · **Priority.** P3 — steady manual value, and far cheaper
  once the resolution layer exists to hold the answers durably.
- **Depends on.** OPS-020
- **Done when.** Every placed row has an evidence URL in the resolution file and no row was
  placed on a name match alone.
- **Source.** Hurdle 9 and issue 5 in [scraping hurdles](../SCRAPING_HURDLES.md).

#### OPS-061 · Combined and honour-band rows hide real schools

- **Problem.** Excluded rows such as an all-star band "featuring" several named schools
  contain real prospects inside one excluded record. Those schools are never extracted, and
  the exclusion rule is correct to keep the combined unit out.
- **Change.** Extract member schools from combined rows as their own observations with the
  same source URL, keeping the combined unit excluded.
- **Size.** M (4–8 h) · **Priority.** P3 — a modest number of rows, and it depends on the
  exclusion review.
- **Depends on.** OPS-037
- **Done when.** A combined-row fixture yields its member schools as separate observations and
  the combined unit stays excluded.
- **Source.** Issue 6 in [scraping hurdles](../SCRAPING_HURDLES.md).

#### OPS-062 · Nickname fragments contaminate the `city` column

- **Problem.** Some listings put a band nickname where a city belongs, so `city` sometimes
  holds a unit name rather than a place. Matching falls back to state-only and still found the
  right school in the observed cases, which is luck rather than a rule — and it is exactly the
  input that disables the tie downgrade in OPS-029.
- **Change.** Clean nickname fragments out of `city` at merge time, keeping the original
  observation immutable.
- **Size.** S (1–3 h) · **Priority.** P2 — small, and it directly reduces the risk of the
  identity defect the audit reproduced.
- **Depends on.** OPS-021, OPS-029
- **Done when.** No `city` value contains a band-unit phrase, and the original observation
  still shows what the source printed.
- **Source.** Issue 7 in [scraping hurdles](../SCRAPING_HURDLES.md); A07.

#### OPS-063 · Twenty school sites block the crawler

- **Problem.** Twenty school sites returned a bot wall to the crawling environment and are
  flagged in notes. Their band pages and any published contacts are missing, and the cause is
  probably the network rather than the site's policy.
- **Change.** Retry from an ordinary network first. Only if that fails, evaluate a headless
  fetch for those specific hosts under the same robots and throttle rules, as a bounded
  experiment rather than a default dependency.
- **Size.** M (4–8 h) · **Priority.** P3 — a plain retry may resolve it for nothing, and the
  headless path is a dependency decision that should wait for evidence.
- **Depends on.** OPS-027
- **Done when.** Each of the twenty is classified as reachable, robots-disallowed or genuinely
  blocked, with the check that produced the classification.
- **Source.** Hurdle 11 and issue 4 in [scraping hurdles](../SCRAPING_HURDLES.md).

#### OPS-064 · The dead-URL scan has never been re-run from a normal network

- **Problem.** 29 of 193 distinct URLs did not return 200 from a datacenter IP. Nine are real
  404s from stale directory websites and one stored value is malformed; the rest are
  403/429/503, SSL and connection errors that are probably the IP. Nothing has been changed on
  the strength of a scan that cannot tell the two apart.
- **Change.** Re-run the reachability probe from an ordinary network, separate genuine dead
  links from environment artefacts, and repair only the genuine ones through the evidence
  layer.
- **Size.** S (1–3 h) · **Priority.** P2 — cheap, and it unblocks a set of small repairs
  currently frozen on an unreliable signal.
- **Depends on.** OPS-030
- **Done when.** Each of the 29 has a current classification, and the malformed value is
  corrected at its source rather than in the CSV.
- **Source.** [Codex handoff](../CODEX_HANDOFF.md) §3.3; `qa.py --check dead-urls`.

#### OPS-065 · Two Ohio schools are recorded in the wrong state because a source said so

- **Problem.** A 2018 parade lineup wrote "(Delaware)" beside two schools that the official
  directory places in Ohio, and the same encyclopedia's own earlier entry says Ohio. The rows
  keep the cited source's state, because correcting them means overriding a citation — and
  there is currently no mechanism for a documented override.
- **Change.** Apply a documented correction at merge time with both sources recorded, using
  the resolution layer rather than a CSV edit. This is the smallest real test that the
  override mechanism works.
- **Size.** S (1–3 h) · **Priority.** P2 — small, well evidenced, and it exercises exactly the
  mechanism OPS-020 introduces.
- **Depends on.** OPS-020
- **Done when.** Both rows show Ohio, the resolution file records both sources and the reason,
  and a rebuild preserves the correction.
- **Source.** [Codex handoff](../CODEX_HANDOFF.md) §3.1; `qa.py --check states`.

#### OPS-066 · The ambiguous stateless school must stay ambiguous

- **Problem.** One stateless row could be either of two stated schools of the same name, or a
  third. It is kept separate today by a note. Nothing in the code prevents a future merge from
  folding it, and the audit specifically warns against merging it.
- **Change.** Record it as an explicit unresolved resolution naming both candidates, so the
  separation survives a rebuild by rule rather than by accident.
- **Size.** S (under 1 h) · **Priority.** P2 — it is the canonical regression case for OPS-022
  and costs almost nothing.
- **Depends on.** OPS-022
- **Done when.** A rebuild keeps the row separate and the resolution file states why.
- **Source.** [Codex handoff](../CODEX_HANDOFF.md) §3.2; A06.

#### OPS-067 · The Carnegie adjudication prospect list does not exist

- **Problem.** The list the client actually needs is concert bands and orchestras that would
  travel to be adjudicated — a different audience from the marching list. The handoff
  specifies it fully: two schema additions (`ensemble_type`, `signal`), five discovery source
  families in yield order, a separate final file rather than a mix into the existing one, and
  a scoring profile. None of it is built.
- **Change.** Build it as specified, one discovery source at a time, each with a parser, a
  fixture, a source-table row and a hurdle entry. Start with prior Carnegie performers and
  state assessment results; never scrape a member directory.
- **Size.** L (well beyond 3 days; split one issue per source) · **Priority.** P2 — it is the
  actual commercial deliverable, and the thing most likely to be started before the pipeline
  under it is safe.
- **Depends on.** OPS-020, OPS-021, OPS-027, OPS-030, OPS-073
- **Done when.** A separate final file exists where every row carries a `signal` and a source
  URL, each source has a fixture and a hurdle entry, and contacts appear only under the
  existing rule.
- **Source.** [Codex handoff](../CODEX_HANDOFF.md) §5, goal 2.

#### OPS-068 · There is no source-backed provider comparison

- **Problem.** The project asserts that the logistics support Troen's competitive position,
  and the instructions forbid inferring a unique advantage without a sourced comparison. The
  comparison is listed as outstanding in the progress record's workstream table, and one
  partner profile is not a comparison.
- **Change.** Follow [strategy 02](../carnegie-hall/strategies/02-market-and-provider-research.md):
  public offers, inclusions and published terms for the named providers, with what public
  research can and cannot establish stated per row.
- **Size.** L (1–3 days) · **Priority.** P2 — a deliverable in its own right, and the only
  honest basis for any competitive claim.
- **Depends on.** —
- **Done when.** Each provider row cites public sources, and every cell public research cannot
  establish says so rather than being left suggestively blank.
- **Source.** Workstream 02 in [PROGRESS](../carnegie-hall/PROGRESS.md);
  [strategy 02](../carnegie-hall/strategies/02-market-and-provider-research.md).

#### OPS-069 · Extraction-tool evaluation is planned and unbounded

- **Problem.** A bounded comparison of one extraction service against the existing keyed
  search route is planned before any adoption; other vendors are conditional on a demonstrated
  gap. Without a defined sample and a scoring sheet, an evaluation becomes a trial becomes a
  subscription.
- **Change.** Define the sample, the expected fields and the accuracy, cost and maintenance
  measures **before** any trial is authorised, following the tool-evaluation method in
  [strategy 07](../carnegie-hall/strategies/07-software-and-automation-fit.md).
- **Size.** S (1–3 h to design; the trial itself needs separate authorisation) ·
  **Priority.** P3 — the existing route works, and this is deliberately gated.
- **Depends on.** OPS-058
- **Done when.** A one-page evaluation design exists naming the sample, the fields, the
  measures and the decision rule, with no trial started.
- **Source.** Remediation Task 10; research priority 6 in [PLAN](../carnegie-hall/PLAN.md).

#### OPS-070 · Field-level verification of the sampled rows is unfinished

- **Problem.** The audit's 15-row sample verified selected claims and left named fields
  unresolved. Enrollment totals were checked for completeness but never verified against the
  membership file. All six booster strings and all 41 band URLs still need school-scope
  verification. None of it is certified, and the current documentation correctly says so.
- **Change.** Finish the sample field by field through the evidence layer, recording each
  outcome as verified, unresolved or rejected.
- **Size.** L (1–3 days, manual) · **Priority.** P3 — it certifies data that is not in
  outbound use; it becomes P1 the day it is.
- **Depends on.** OPS-030
- **Done when.** Every field in the sample has an evidence row with a status, and the
  unresolved ones are listed rather than silently dropped.
- **Source.** "Limits and remaining verification" in the
  [pipeline audit](../AUDIT-2026-09-10.md); remediation Task 8.

---

# 5. Business decisions

These are the unknowns in the
[internal decision register](../carnegie-hall/INTERNAL-DECISIONS.md) that gate real use.
They are on the board because they are schedulable work — *prepare the concrete artifact, then
ask the one question that artifact needs* — and not because the business owes anyone a
questionnaire. The register's own rule holds: if an unknown does not change what is being
demonstrated, it stays internal.

The size on each of these covers preparing the artifact and asking, not waiting for the
answer. None of them blocks the demonstration.

#### OPS-071 · March 3 capacity is unconfirmed

- **Problem.** A photographed agreement describes one three-hour evening session; an employee
  reports needing ten additional ensembles. Ten is a provisional target, not a known capacity.
  Every piece of prospecting work is sized against a number nobody has confirmed.
- **Change.** Prepare the one-page question — current usable performance capacity and existing
  commitments for this event — and ask it at the moment availability is published, space is
  held, or a group is accepted. Until then, label the target provisional and show no inventory
  counter.
- **Size.** S (1–3 h) · **Priority.** P1 — it sets the size of the prospect list, so it is the
  cheapest question with the largest downstream effect.
- **Depends on.** —
- **Done when.** Capacity is recorded with its source and date, or the register records that
  the question was asked and is outstanding.
- **Source.** "March 3 capacity" in the
  [decision register](../carnegie-hall/INTERNAL-DECISIONS.md).

#### OPS-072 · No approved March 3 price basis exists

- **Problem.** There is a shared brochure and a mixed working budget, and no reconciled March 3
  quote. The pipeline's governance already enforces the consequence: a price in the customer
  package must stay `null` with status `to_be_confirmed`, and fixed overhead and per-person
  figures stay internal-only.
- **Change.** Prepare the proposal artifact with every price left to be confirmed, then ask for
  the approved package facts, price basis, validity and exclusions at the point a firm offer or
  an external comparison is actually needed.
- **Size.** S (1–3 h) · **Priority.** P2 — genuinely blocking for an offer, and deliberately
  not blocking for the demonstration.
- **Depends on.** —
- **Done when.** Either an approved price basis is recorded with its validity window, or every
  customer-facing artifact demonstrably prints "to be confirmed" with no number.
- **Source.** "Prices and inclusions" in the
  [decision register](../carnegie-hall/INTERNAL-DECISIONS.md).

#### OPS-073 · March 3 ensemble eligibility and size are unknown

- **Problem.** The shared brochure and another date's schedule include several ensemble types.
  Nothing states the March 3 requirements, and the venue's slot sizes are unknown — which is
  also the missing input for the prospect list's enrollment floor.
- **Change.** Ask for the applicable March 3 ensemble requirements and the minimum and maximum
  ensemble size per slot, at the point a specific ensemble would be represented as eligible.
- **Size.** S (1–3 h) · **Priority.** P1 — it is an input to OPS-067, which is otherwise built
  on a guessed audience definition.
- **Depends on.** —
- **Done when.** Eligible ensemble types and the size band are recorded with their source, or
  the prospect-list scope explicitly states the assumption it is using.
- **Source.** "Eligibility and ensemble size" in the
  [decision register](../carnegie-hall/INTERNAL-DECISIONS.md).

#### OPS-074 · Relationship ownership and contact permission are unknown

- **Problem.** The pipeline's CRM gate requires published contact detail, recorded permission
  to contact, and a known relationship owner. Both researched contacts are held in local
  staging with `permission_to_contact: unknown`, so the real case exports nothing — correctly.
  No approach can be made and no list can be handed over until this is answered per account.
- **Change.** For the accounts actually under consideration only, establish status and the
  responsible contact. Not an account audit, not a territory exercise — the specific accounts a
  selected action touches.
- **Size.** S (1–3 h per batch of accounts) · **Priority.** P1 — it is the single gate between
  all the research and any outbound action.
- **Depends on.** —
- **Done when.** At least one account carries a recorded owner and permission state, and the
  governance report shows it moving out of `04-crm-blocked.csv`.
- **Source.** "Existing relationships" in the
  [decision register](../carnegie-hall/INTERNAL-DECISIONS.md); CRM gating warnings from
  `node pipeline/cli.cjs validate --all`.

#### OPS-075 · The festival-listing identity match is unconfirmed

- **Problem.** A partner's public calendar names a festival on March 3 and March 31, 2027, and
  a local licence photograph names Troen and the same festival. No reviewed source connects the
  two. The project rule is that the match stays explicitly unconfirmed, and the local
  correspondence is supporting context rather than evidence of a relationship.
- **Change.** Keep it unconfirmed in every artifact. Obtain evidence explicitly connecting the
  listing to this agreement before any external claim, and record the absence of that evidence
  where a reader might otherwise infer it.
- **Size.** S (1–3 h) · **Priority.** P2 — nothing depends on resolving it, and everything
  depends on not overstating it.
- **Depends on.** —
- **Done when.** No artifact states or implies the connection, and the unresolved state is
  recorded in one place rather than re-explained per document.
- **Source.** "NYIMF / Troen event identity" in the
  [decision register](../carnegie-hall/INTERNAL-DECISIONS.md).

#### OPS-076 · There is no business rule for what counts as booked

- **Problem.** The supplied examples show agreement and payment steps but not a complete
  current rule. The pipeline models five parallel status vectors precisely so it does not have
  to guess; the trip layer models six line states for the same reason. Neither can report
  confirmed business without the operator's actual acceptance rule.
- **Change.** Ask for the acceptance rule, its evidence source and its exceptions, at the point
  a status change would be automated or business would be reported as confirmed.
- **Size.** S (1–3 h) · **Priority.** P2 — it becomes urgent the first time a status is
  reported to anyone outside the project, and it also decides the scoring question in OPS-032.
- **Depends on.** —
- **Done when.** The acceptance rule is recorded with its exceptions, or every status output
  states that it reflects local records only.
- **Source.** "Contracts and booking rule" in the
  [decision register](../carnegie-hall/INTERNAL-DECISIONS.md).

#### OPS-077 · Permitted use for CRM import and messaging is undetermined

- **Problem.** A vendor-policy concern is documented in the research handoff. Researched
  records are deliberately kept local and separate from any campaign list. Nothing establishes
  what may be imported into a marketing-enabled system, or from it.
- **Change.** Establish the permitted use and the suppression and permission evidence for the
  specific path, before anything is imported or messaged. Until then the staging file stays a
  file.
- **Size.** S (1–3 h) · **Priority.** P2 — it gates OPS-039 and OPS-036, and getting it wrong
  is a compliance problem rather than a bug.
- **Depends on.** —
- **Done when.** The permitted path is recorded, or every export is labelled local-only with
  the reason.
- **Source.** "Marketing/import permissions" in the
  [decision register](../carnegie-hall/INTERNAL-DECISIONS.md);
  [Zoho research prompt](../carnegie-hall/ZOHO-RESEARCH-PROMPT.md).

#### OPS-078 · No suppression input has been supplied

- **Problem.** Suppression is promised in historical material and implemented nowhere
  (OPS-036). No input list has been supplied, and an empty list currently cannot be
  distinguished from "no restrictions apply".
- **Change.** Ask whether any accounts must not be approached, and record the answer — including
  an explicit "none supplied at this date", which is a different fact from an empty file.
- **Size.** S (under 1 h) · **Priority.** P2 — one question, and OPS-036 cannot be finished
  honestly without it.
- **Depends on.** —
- **Done when.** The register records either the suppression entries or a dated "none supplied"
  with who was asked.
- **Source.** Remediation Task 8; A14.

#### OPS-079 · Nobody is named as able to commit to a supplier deadline

- **Problem.** The trip layer is about to produce deadline and payment schedules (OPS-002,
  OPS-011, OPS-019). A deadline sheet only drives action if someone can act on it — confirm a
  rooming list, release a hold, pay a deposit. The record names roles as counterparties and
  never names who on the operator's side decides.
- **Change.** Record the operator-side decision role for each deadline class (rooming list,
  headcount, deposit, cancellation) as a role, never an individual.
- **Size.** S (1–3 h) · **Priority.** P2 — without it the deadline renderer produces a list
  nobody owns, which is how the deadlines were missed on paper in the first place.
- **Depends on.** OPS-015, OPS-019
- **Done when.** Every deadline class in the trip record has an owning role, and no personal
  name appears.
- **Source.** This session's analysis; "Suppliers and deadlines" in the
  [decision register](../carnegie-hall/INTERNAL-DECISIONS.md).

---

# 6. Presentation and delivery

The demonstration is live and safe to present; five design findings are unresolved and none of
them is a defect a viewer sees as broken. They are about whether the work reads as *work*.

#### OPS-080 · The repeated introduction competes with the subject

- **Problem.** All three views lead with the same headline at the same prominence, and the
  event date and venue repeat across the masthead, the context panel and the documents. The
  supporting structure has more presence than the example the presenter wants to discuss, so
  switching views does not itself say what changed.
- **Change.** Keep a quiet persistent identity and give each view one subject-specific lead
  tied to the work on screen; make the school, the selected material or the change scenario
  dominant. No second slogan and no extra stacked labels.
- **Size.** M (4–8 h) · **Priority.** P2 — highest of the design findings for character, and
  the cheapest of them to try.
- **Depends on.** —
- **Done when.** After switching views the active subject is visually dominant without another
  introductory explanation, confirmed by a screenshot pass at the target widths.
- **Source.** Finding 1 in the [design audit](../carnegie-hall/DESIGN-AUDIT-2026-09-12.md).

#### OPS-081 · The workflow view explains a process instead of demonstrating one

- **Problem.** Switching planning states changes explanatory text. It never shows an original
  request, a specific detected difference, its consequences, or a reviewed resulting artifact.
  An experienced coordinator reasonably thinks "we already know to do those things".
- **Change.** Prototype one concrete change review: a request, the affected arrangements, and
  an editable reviewable result with unknowns retained. Label fictional inputs and outputs as
  illustrative, and imply no live document analysis, supplier confirmation or automation.
- **Size.** L (1–3 days) · **Priority.** P2 — the audit calls it the highest finding for
  perceived usefulness, and the trip layer now supplies exactly the material it needs.
- **Depends on.** OPS-015, OPS-085
- **Done when.** A viewer can inspect one specific piece of work the assistance performs and
  tell it apart from employee decisions and remaining checks.
- **Source.** Finding 2 in the [design audit](../carnegie-hall/DESIGN-AUDIT-2026-09-12.md).

#### OPS-082 · The research table does not fit the context column

- **Problem.** At 1440 × 900 the context column is 296px wide and offers 271px for a table
  whose content needs 397px, so "View all research" requires horizontal scrolling to reach the
  Status column. Opening the source register beside it leaves a tall narrow column and a large
  empty centre.
- **Change.** Keep short contextual facts and actions on the right; open full tables and long
  evidence in a wider reading area or a focused expandable region. Do not solve it by shrinking
  the type. Preserve focus and return behaviour.
- **Size.** M (4–8 h) · **Priority.** P2 — a reproduced usability defect with an exact
  measurement, and evidence is the thing the presenter most needs to consult mid-conversation.
- **Depends on.** —
- **Done when.** All research columns read together at the target desktop viewport, and opening
  evidence does not strand the presenter in a narrow column.
- **Source.** Finding 3 in the [design audit](../carnegie-hall/DESIGN-AUDIT-2026-09-12.md).

#### OPS-083 · Materials reads as a document, not as a visual aid

- **Problem.** The director preview runs about 1,242px tall at desktop and the FAQ is a long
  continuously styled document where most paragraphs and subheadings get similar treatment.
  Useful for reading, weak for a five-minute conversation — it invites reading aloud.
- **Change.** Keep the complete preview and the unchanged editable downloads; add a restrained
  way to focus one relevant passage or navigate to a question, without rewriting the reviewed
  material or hiding its qualifications.
- **Size.** M (4–8 h) · **Priority.** P3 — judge it after OPS-081, which may change what
  Materials needs to do.
- **Depends on.** OPS-081
- **Done when.** A presenter can point to one passage quickly and recover the complete
  document, with source wording and draft boundaries intact.
- **Source.** Finding 4 in the [design audit](../carnegie-hall/DESIGN-AUDIT-2026-09-12.md).

#### OPS-084 · At phone width the download is far from the selector

- **Problem.** At 393 × 852 the FAQ preview is about 2,190px tall and its matching download
  group begins roughly 2,975px below the top of the page, because supporting context stacks
  after the full main view. A phone user who selects the FAQ cannot readily find its download.
- **Change.** At narrow widths, place the selected download near the document selector or
  provide a clearly labelled jump to it, keeping one source of truth and no duplicate controls.
- **Size.** S (1–3 h) · **Priority.** P3 — desktop is the presentation target; this matters for
  the developer's own phone review.
- **Depends on.** —
- **Done when.** The selected download is discoverable near the document choice at phone width
  while desktop keeps its side placement. Real iOS verification remains separate from emulation.
- **Source.** Finding 5 in the [design audit](../carnegie-hall/DESIGN-AUDIT-2026-09-12.md).

#### OPS-085 · The trip work is invisible to anyone outside the repository

- **Problem.** The trip layer's finding — that a proposal document was the database and every
  redraft wiped it — is the most concrete, most recognisable piece of operational work in the
  project. It exists as JSON and a README. The demonstration shows none of it.
- **Change.** Once renderers exist, decide deliberately what reaches the demonstration: most
  likely one generated document beside the record it came from, clearly labelled, with the
  privacy rule applied and no client's real trip published without a separate decision.
- **Size.** M (4–8 h) · **Priority.** P2 — it is the strongest available answer to the design
  audit's "shows good practice without demonstrating work".
- **Depends on.** OPS-015, OPS-057
- **Done when.** The publication decision is recorded, and anything published carries no
  personal contact detail and no unconfirmed line printed as settled.
- **Source.** This session's analysis; finding 2 in the design audit.

#### OPS-086 · The publication boundary is a hand-maintained list with no test

- **Problem.** `scripts/package-demo.cjs` copies an explicit list of 13 files into `dist/`.
  That explicitness is the right design — it is a deliberate publication boundary — but nothing
  checks that every asset the page references is on the list. A September audit verified the 12
  references by hand; adding a download later would silently 404 in production.
- **Change.** A test that extracts every local `href` and `src` from the built page and asserts
  each is packaged, and that nothing outside the demo web root is referenced.
- **Size.** S (1–3 h) · **Priority.** P2 — the only automated protection standing between an
  added asset and a broken live page.
- **Depends on.** OPS-041
- **Done when.** Adding a reference without adding it to the copy list fails the test, and the
  check runs in CI.
- **Source.** This session's analysis; deployment-link check in the
  [repository audit](../AUDIT-2026-09-12-REPOSITORY.md).

#### OPS-087 · The presentation has never been rehearsed against the live layout

- **Problem.** The [presentation path](../carnegie-hall/PRESENTATION-PATH.md) is a five-minute
  script written against the layout before the final pass. The recorded next step is to
  rehearse the live view and note only the interruptions to understanding. Until that happens,
  every design finding above is a judgment about a conversation nobody has had.
- **Change.** Run the script against the live site once, recording only where understanding
  breaks, then re-prioritise OPS-080 … OPS-084 against what actually interrupted.
- **Size.** S (1–3 h) · **Priority.** P2 — it is the cheapest way to avoid spending days on the
  wrong design finding.
- **Depends on.** —
- **Done when.** A dated rehearsal note lists the interruptions and the design issues are
  re-ordered against it.
- **Source.** "Next: rehearse the live view" in [PROGRESS](../carnegie-hall/PROGRESS.md).

#### OPS-088 · The whole-project presentation is deferred with no trigger

- **Problem.** A final whole-project presentation has been deferred repeatedly. Deferred is the
  right call, but with no stated trigger it defers forever, and the material it would draw on
  keeps growing.
- **Change.** Write the trigger rather than the presentation: the specific state at which it
  becomes worth assembling, in one sentence, on the board.
- **Size.** S (under 1 h) · **Priority.** P3 — it is a decision, not a build, and it prevents
  the item from being silently dropped.
- **Depends on.** OPS-087
- **Done when.** The trigger condition is recorded, or the item is explicitly dropped.
- **Source.** "The final whole-project audio presentation remains deferred" in
  [PROGRESS](../carnegie-hall/PROGRESS.md).

---

# Do first

Twelve issues, in execution order. The order is not by importance — it is by what makes the
next item cheaper or safer. Every issue's declared dependencies are satisfied by an earlier
step or by nothing, so the list can be worked top to bottom without stalling.

| # | Issue | Why here, in this position |
|---|---|---|
| 1 | OPS-047 | Under an hour. Until local `main` is current, every comparison made while doing the rest is answered against a placeholder commit. |
| 2 | OPS-044 | The one failing test is a missing dependency with a committed lockfile. Fix it before adding any check, or CI encodes the failure. |
| 3 | OPS-042 | One command that runs everything. Everything below is verified by it, and its absence is what let a false status claim survive. |
| 4 | OPS-043 | Falls out of OPS-042 and switches on the privacy test, which is the guardrail with the worst failure mode. |
| 5 | OPS-041 | Now there is something worth automating. Wiring CI before the command exists would just move the problem into YAML. |
| 6 | OPS-045 | With the suite honest, correct the instruction file in the same pass. Left later, the next session reads the false claim and trusts it. |
| 7 | OPS-046 | Before anyone clones on another machine. The symlink failure is silent and takes out the file carrying every project rule. |
| 8 | OPS-011 | The first substantive step. It turns eight trip gaps from prose in `notes` into findings a run prints, so they can be assigned rather than rediscovered. |
| 9 | OPS-002 | The first real supplier gap to close, because a rooming-list cut-off is the earliest hard deadline and releasing the block re-prices everything downstream. |
| 10 | OPS-001 | The largest single unknown in the price, and it depends on nothing — but it is worth doing after step 8 so the coverage check confirms the terms are complete. |
| 11 | OPS-004 | Cheap, already half-chased with two logged attempts, and it clears the one inclusion the validator already refuses. |
| 12 | OPS-005 | Unblend the attractions line while the supplier conversations from steps 9–11 are still open — the rates come out of the same calls. |

**What follows immediately, and why it is not in the list.** OPS-007 (the price
reconciliation) is the payoff of steps 10–12 and the thing that turns "two printings disagree"
into a number, but it also needs OPS-006 and OPS-009, so it is the next item rather than the
twelfth. OPS-003 produces the dinner rates that OPS-006 splits, so it sits between them.

**Three deliberate omissions.** **OPS-074** (relationship ownership and permission) is P1 and
not here, because it is a question for another person and cannot be sequenced with work; ask it
in parallel on day one. **OPS-015** (the first renderers) is P1 and not here because it is
being built separately; OPS-011 exists partly to give it a validator to build against.
**OPS-020** (the first legacy repair) starts the legacy track, which runs in parallel and is
gated only on the check command from step 3 — it is not sequenced against the trip work at all.

---

# Deliberately not doing

Work that looks appealing from this board and should be declined, with the reason. The
governing constraint is the remediation plan's own: *do not introduce a service, database, UI
or generalised workflow engine for this work.*

| Declined | Why |
|---|---|
| **A database behind the trip or pipeline records** | JSON files plus a validator already give the properties that were missing: one record, generated documents, a check that fails on drift. A database adds schema migration and deployment before a single document has been generated. Revisit when there are multiple users or enough trips that a file listing stops being readable. |
| **A workflow engine, queue or scheduler** | The failures in this repository are missing facts and missing checks, not missing orchestration. A scheduler would run an unrepaired refresh on a timer, which is strictly worse than not running it. |
| **A web UI for the trip or pipeline layers** | The audience is one operator and a reviewer. A CLI plus generated Markdown and CSV is inspectable, diffable and reviewable in Git; a UI is a second product to maintain and would need auth, hosting and its own tests. |
| **Rewriting the Python pipeline** | The audit's recommendation is repair in place. The parsers and fixtures are the valuable part and they work; a rewrite discards them and restarts the evidence problem from zero. |
| **A CRM integration, or sending any email** | Blocked on permitted use (OPS-077) and permission (OPS-074), and forbidden outright by the project guardrails. The staging file stays a file until both are answered. |
| **Adopting an extraction service now** | The existing keyed search route works and is cached. Adoption before the bounded evaluation in OPS-069 buys a subscription and a dependency in exchange for an untested hope. |
| **Making the blocked parade pages work by force** | Rotating IPs, ignoring a captcha or a bot wall, or crawling harder all breach the project's public-data and robots rules. Saving the page from a browser (OPS-058) gets the same data and stays within them. |
| **Enabling the seasonal refresh workflow** | It would run destructive and stale-cache paths unattended. OPS-023, OPS-024, OPS-034 and OPS-038 exist precisely so that this is not tempting. |
| **Regenerating the historical client packet** | Its counts, contact claims and suppression promise are all wrong (A14). Regenerating it produces a new document with the same errors; it stays historical until the data is repaired and the owner asks. |
| **Hand-correcting `data/final/prospects.csv`** | A hand edit makes the CSV the only copy of a researched fact, which is the mechanism behind A01. Every correction goes through a resolution or evidence row so a rebuild preserves it. |
| **Auto-correcting the two "(Delaware)" rows or merging the same-named schools** | Both look like obvious cleanups and both override a cited source on a name match. They get a documented override (OPS-065) or stay ambiguous (OPS-066). |
| **A design system, framework or component library for the demo** | The design audit is explicit that the gap is hierarchy and demonstrated work, not a shortage of fonts, animations or pictures. A framework migration would consume the time that OPS-081 needs. |
| **Stock performance photography or decorative imagery** | Named in the design audit as not solving the demonstrated problem. Authentic approved assets only. |
| **Recording personal names, mailboxes or direct numbers to make a sheet "complete"** | The privacy rule forbids it in records, outputs, fixtures, commits and documentation. A role plus a published group-sales channel is the complete form. |
| **A generalised multi-tenant operations platform** | Nothing here has a second tenant. Every abstraction built before OPS-018 proves reuse with a second trip would be a guess about a use case that does not exist yet. |
| **Rewriting history to drop the 31MB of photographs** | A history rewrite breaks every commit SHA cited across the documentation, and those citations are currently the project's only version anchors. Cheaper to carry the megabytes (OPS-053). |

---

# Cross-reference

Every item already tracked elsewhere, and where it lives on this board. Nothing in these tables
is restated above — the issue points back at the original finding, which stays canonical.

## Pipeline audit findings A01–A14

| Finding | Summary | Issue(s) | State |
|---|---|---|---|
| A01 | Rebuild discards enriched identities | OPS-020 | Open |
| A02 | Director email attributed to the wrong role | OPS-028 | Open |
| A03 | Source failure erases collected appearances | OPS-023 | Empty/unusable batch repaired in `e6e493e`; partial results open |
| A04 | Caches never expire | OPS-024, OPS-025 | Open |
| A05 | Credential exposure on error paths | OPS-026 | Client path repaired in `e4e6a9b`; timeout, non-JSON and runner metadata open |
| A06 | Early dedupe collapses same-named schools | OPS-021, OPS-022, OPS-066 | Open |
| A07 | Enrichment crosses school boundaries | OPS-029, OPS-062 | Open |
| A08 | Publication dates invented into event years | OPS-031 | Open |
| A09 | Totals overstate the evidence | OPS-032 | Open |
| A10 | Refresh reporting disagrees with artifacts | OPS-034, OPS-056 | Open |
| A11 | Unguarded crawl policy | OPS-027 | Open |
| A12 | CSV and XLSX formula injection on export | OPS-035 | Open; re-reproduced as F4 |
| A13 | Evidence attached to rows rather than claims | OPS-030, OPS-033, OPS-037 | Open |
| A14 | Docs promise more than the code does | OPS-036, OPS-045 | Reference docs corrected; the instruction file's test claim (OPS-045, P1) and suppression both open |

## Remediation plan tasks 1–10

| Task | Subject | Issue(s) | Unchecked items covered |
|---|---|---|---|
| 1 | Preserve verified identity through every rebuild | OPS-020, OPS-022 | 6 |
| 2 | Keep separate schools and observations during dedupe | OPS-021, OPS-022 | 4 |
| 3 | Make refreshes fresh and non-destructive | OPS-023, OPS-024, OPS-025 | 6 |
| 4 | Protect credentials and apply crawl policy | OPS-026, OPS-027 | 4 open, 2 done |
| 5 | Verify contact ownership and school matches | OPS-028, OPS-029, OPS-030, OPS-033 | 7 |
| 6 | Separate event facts from scoring assumptions | OPS-031, OPS-032, OPS-033 | 6 |
| 7 | Publish consistent, spreadsheet-safe outputs | OPS-034, OPS-035 | 5 |
| 8 | Make eligibility, suppression and docs match | OPS-036, OPS-037, OPS-070, OPS-078 | 6 |
| 9 | Validate a controlled refresh before scheduling | OPS-038, OPS-056 | 6 |
| 10 | Define and pilot the Carnegie list | OPS-039, OPS-067, OPS-069 | 3 |

All 53 unchecked items are covered. No issue above re-specifies a task's interface or
regression shape — those stay in
[the plan](../superpowers/plans/2026-09-10-pipeline-remediation.md).

## Repository audit findings F1–F10

| Finding | Subject | Issue(s) |
|---|---|---|
| F1 | False test status claim | OPS-044, OPS-045 |
| F2 | Documented test command misses the Node suite | OPS-042 |
| F3 | Clean checkout cannot run the Node suite | OPS-044 |
| F4 | A12 still open and reproduced | OPS-035 |
| F5 | Prior audit's evidence no longer regenerates | OPS-040 |
| F6 | Absolute machine-local paths in tracked docs | OPS-054 |
| F7 | Tracked photographs and split extension case | OPS-046, OPS-053 |
| F8 | Untracked and un-ignored working directories | OPS-052 |
| F9 | Twelve prior findings still open | Section 2 in full |
| F10 | Branch sprawl | OPS-051 |

## Design audit findings

| Finding | Subject | Issue |
|---|---|---|
| 1 | Repeated introduction competes with the subject | OPS-080 |
| 2 | Workflow explains rather than demonstrates | OPS-081 |
| 3 | Research table does not fit the context column | OPS-082 |
| 4 | Materials has little presentation emphasis | OPS-083 |
| 5 | Phone download far from the selector | OPS-084 |

## Scraping hurdles, "issues to open"

| # | Subject | Issue |
|---|---|---|
| 1 | Save the four blocked pages and re-scrape | OPS-058 |
| 2 | Approve a PDF reader and parse regional recaps | OPS-059 |
| 3 | Search fallback | Done (`scripts/search_fallback.py`) |
| 4 | Headless fetch for blocked school sites | OPS-063 |
| 5 | Fill state for the stateless rows | OPS-060 |
| 6 | Extract schools from combined and honour rows | OPS-061 |
| 7 | Clean nickname fragments from `city` | OPS-062 |
| 8 | Move the refresh workflow into `.github/` | OPS-056 |

## Decision register rows

| Register row | Issue |
|---|---|
| March 3 capacity | OPS-071 |
| Eligibility and ensemble size | OPS-073 |
| Prices and inclusions | OPS-072 |
| Existing participation and deposit | OPS-076 |
| Existing relationships | OPS-074 |
| NYIMF / Troen event identity | OPS-075 |
| MTC relationship and partner responsibilities | OPS-074, OPS-075 |
| Channel priority | Deliberately unresolved; no fixed order is claimed |
| Territory | Deliberately unresolved; soft regional preference stands |
| Zoho product and seller | OPS-077 |
| Marketing/import permissions | OPS-077 |
| Contracts and booking rule | OPS-076 |
| Suppliers and deadlines | OPS-079, OPS-002, OPS-019 |
| Protection wording | OPS-072 |
| Accounts and sharing | OPS-077, OPS-085 |

## New in this board

No earlier backlog covers these. They came from this session's inspection of the trip record,
the repository's Git and build state, and the gap between the decision register and schedulable
work.

| Issues | Subject |
|---|---|
| OPS-001 … OPS-019 | Trip production: supplier terms, blended costs, price reconciliation, variants, renderers, destination library, second trip |
| OPS-041, OPS-043, OPS-046, OPS-047, OPS-048, OPS-049, OPS-050, OPS-055, OPS-057 | CI, test reachability, `.gitattributes` and the tracked symlink, stale `main`, tags, manifest drift, linting, README orientation, repository-wide privacy check |
| OPS-071 … OPS-079 | Business unknowns expressed as prepare-then-ask work, including the operator-side deadline owner |
| OPS-085, OPS-086, OPS-087, OPS-088 | Trip work in the demonstration, a test for the publication boundary, the rehearsal, and a trigger for the deferred presentation |
