# Consistency audit — West Henderson High School Band · Chattanooga, TN

Trip `west-henderson-chattanooga-2027-04-08` · version `v1-factual` · 2027-04-08 to 2027-04-11 · prepared 2026-09-11.
Generated from `pipeline/trip/trips/west-henderson-chattanooga-2027-04-08.trip.json` by `pipeline/trip/renderers/consistency-audit.cjs`. Regenerate with `node pipeline/trip/cli.cjs render west-henderson-chattanooga-2027-04-08`.

## What this page is

Two printings of this trip were once compared by hand. Six things disagreed, and finding them took an afternoon.
This is that afternoon, done against the record instead of against the paper, so the next printing costs nothing to check.

Nothing below is an opinion about the trip. Each line is one part of the record contradicting another part, with the ids of both and what would settle it.
Where two printings simply differ, the audit says they differ and stops: it cannot know which one is current, and it does not guess.

## Result

**30 findings — 9 errors, 21 warnings — from 11 of 16 checks.**

An error is a contradiction inside the record: two parts of it cannot both be true. A warning is a gap — something sold, printed or priced with the evidence for it missing.

| # | Severity | What is wrong | Where |
|---|---|---|---|
| E1 | error | Sold, with nowhere in the itinerary to happen | `inclusion:inc-imax` |
| E2 | error | A business named one way on one page and another way on another | `inclusion:inc-climbing` |
| E3 | error | One supplier carrying two names across two printings | `supplier:cirque-symphonie` |
| E4 | error | Contractual wording that changed between printings | `exclusion:exc-scope` |
| E5 | error | A printed time the supplier cannot meet | `slot:d2-ruby-falls` |
| E6 | error | A named venue sold while alternatives are still being shopped | `inclusion:inc-dinner-one` |
| E7 | error | Money in the price with no counterparty behind it | `pricing:component:attractions` |
| E8 | error | Money in the price with no counterparty behind it | `pricing:component:dinners` |
| E9 | error | Two published price tables that disagree in both directions | `pricing:published` |
| W1 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:bessie-smith` |
| W2 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:cirque-symphonie` |
| W3 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:dinner-day-one` |
| W4 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:dinner-day-three` |
| W5 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:dinner-day-two` |
| W6 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:high-point-climbing` |
| W7 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:hotel-chattanooga` |
| W8 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:incline-railway` |
| W9 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:ruby-falls` |
| W10 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:southern-belle` |
| W11 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:tn-aquarium` |
| W12 | warning | Sold to the client, with no rate or no deadline recorded | `supplier:young-transportation` |
| W13 | warning | A cost line with no amount | `pricing:component:motor-coach` |
| W14 | warning | A fact that survives only as a margin note | `pricing:rate:bessie-smith:per-person` |
| W15 | warning | A fact that survives only as a margin note | `pricing:rate:bessie-smith:tour-guide` |
| W16 | warning | A fact that survives only as a margin note | `pricing:rate:incline-railway:deposit` |
| W17 | warning | A fact that survives only as a margin note | `pricing:rate:rock-city:per-person` |
| W18 | warning | A fact that survives only as a margin note | `staffing:tour-manager` |
| W19 | warning | A fact that survives only as a margin note | `supplier:bessie-smith` |
| W20 | warning | A fact that survives only as a margin note | `supplier:tn-aquarium` |
| W21 | warning | A fact that survives only as a margin note | `verification:dates-checked-with-the-venue-coordination-contact` |

## Findings

### Sold, with nowhere in the itinerary to happen

`inclusion.no-slot` · error · 1 finding

**Looks for.** An inclusion the client pays for whose list of itinerary slots is empty. It is on the inclusions page and inside the price, and no day of the trip delivers it.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| E1 | `inclusion:inc-imax` | "Admission to the IMAX Theater at the Aquarium" is sold as an inclusion against Tennessee Aquarium and no slot in the 4-day itinerary delivers it. The client is paying for something the schedule never does. | Give it a time on the itinerary, or take it off the inclusions page and out of the price. The same supplier is already on the itinerary at `d3-aquarium` (Saturday, April 10, 2027, 09:15), so there is an obvious place for it — but choosing is an operator decision, not one this page can make. |

### A business named one way on one page and another way on another

`name.drift` · error · 1 finding

**Looks for.** A printed line — an inclusion or an itinerary title — that names its supplier with a word swapped out of the middle of the recorded name. Shortening a long name is not a defect; substituting a word inside it is.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| E2 | `inclusion:inc-climbing` | The inclusions page prints "Street" where the record has "Point". Printed: "Instruction and Climbing at the High Street Climbing and Fitness Center". Recorded supplier name: "High Point Climbing and Fitness". One business, two names, and one of them is wrong on a page the client reads. | Settle which name is the business's own, correct the printed line, and let every document take the name from the supplier record instead of from the last printing. |

### One supplier carrying two names across two printings

`supplier.name-variants` · error · 1 finding

**Looks for.** A supplier whose record holds more than one observed name or venue for the same thing, with nothing recording which one is current.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| E3 | `supplier:cirque-symphonie` | Cirque de la Symphonie with the Chattanooga Symphony carries 2 different venue names for the same line: "Soldiers and Sailors Memorial Auditorium" (v1-factual) and "Tivoli Theatre" (v2-narrative). Both were printed. Nothing in the record says which one the group is actually going to. | Ask the counterparty which venue the booking is against, make the answer the supplier's recorded venue, and keep the other as a superseded variant with the date it was printed. Until then no document should print either one as settled. |

### Contractual wording that changed between printings

`clause.wording-drift` · error · 1 finding

**Looks for.** A clause whose record holds a second observed wording. In contractual text one inserted word changes what is excluded, and the two printings cannot both be the agreement.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| E4 | `exclusion:exc-scope` | Two printings carry two wordings of the same clause: the second adds "Activities" (a second printing). This is the text that says what the client is not paying for, so the two wordings exclude different things. | Decide which wording is current, make it the clause text, and keep the other as an observed variant with the date it was printed. A clause that changes quietly between redrafts is the one a dispute lands on. |

- `exclusion:exc-scope` as this record holds it: "Sight Seeing, Transportation and any Meals not on the itinerary"
- `exclusion:exc-scope` as observed in a second printing: "Sight Seeing, Activities, Transportation and any Meals not on the itinerary"

### A printed time the supplier cannot meet

`slot.time-vs-supplier-term` · error · 1 finding

**Looks for.** A slot time that contradicts a time recorded against its own supplier — an opening or first-departure time the printed itinerary is earlier than, or a closing time it is later than.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| E5 | `slot:d2-ruby-falls` | The itinerary prints 08:30 on Friday, April 9, 2027 for "Ruby Falls". Ruby Falls's own recorded earliest time is 09:00, from `attempt 2026-09-11 (phone)`: "first ride time confirmed as 09:00". The printed time cannot be met as written. | Move the line to 09:00 or later, or get the supplier to agree the printed time in writing. Reprinting the page without changing one of the two only reprints the contradiction — and everything after it on the day moves with it. |

### A named venue sold while alternatives are still being shopped

`inclusion.sells-unsettled-line` · error · 1 finding

**Looks for.** Narrowly: an itinerary line still in the sourcing state, whose supplier record holds other candidates being contacted, where a sold inclusion names one of those candidates. A sourcing line is not a defect by itself — asserting a specific venue for it on the page the client pays from is.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| E6 | `inclusion:inc-dinner-one` | The inclusions page sells "Dinner at the Chattanooga Choo Choo Complex", naming Chattanooga Choo Choo complex. The itinerary line it pays for, `d1-dinner` on Thursday, April 8, 2027, is in state `sourcing` — the honest client word for it is "venue being finalised" — while 5 other venues are recorded as contacted for the same meal (Frothy Monkey, Southside Social, Wanderlinger Brewing Company, Feed Co Table and Tavern, NC and Norman's). | Either settle the venue before the next printing, or print the client word beside the line and drop the venue name from the inclusion until it is settled. This is the defect a client can catch without seeing a single one of the operator's records. |

### Money in the price with no counterparty behind it

`pricing.component-without-supplier` · error · 2 findings

**Looks for.** A per-person cost component carrying real money and no supplier. A blended line cannot be checked against anyone's terms, cannot be re-quoted when one supplier moves, and cannot be reconciled when an invoice arrives. Operator margin lines are not counted: they have no counterparty by nature.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| E7 | `pricing:component:attractions` | "Attractions" carries $183.00 per person and no supplier — A single blended line in the quote system covering every attraction, with no supplier attached. The components are known in pen but cannot be recovered from the blend. With no counterparty on the line, no supplier's terms can be checked against it and no invoice can be reconciled to it. | Break the blended line into one line per supplier at that supplier's own rate and basis. Until that is done a headcount change re-quotes a number nobody can take apart, which is exactly what makes a re-quote cost an afternoon. |
| E8 | `pricing:component:dinners` | "Dinners" carries $90.00 per person and no supplier. With no counterparty on the line, no supplier's terms can be checked against it and no invoice can be reconciled to it. | Break the blended line into one line per supplier at that supplier's own rate and basis. Until that is done a headcount change re-quotes a number nobody can take apart, which is exactly what makes a re-quote cost an afternoon. |

$273.00 per person of the published price sits on 2 lines with no counterparty.
Elsewhere the record does hold 3 real per-supplier rates, each at its own basis — Rock City Gardens $19.00 per person; Bessie Smith Cultural Center $5.00 per person; Bessie Smith Cultural Center (Tour guide) $50.00 per group — and nothing connects any of them to the blend above.

### Two published price tables that disagree in both directions

`pricing.table-direction-conflict` · error · 1 finding

**Looks for.** A second observed price table whose differences from the published one do not run one way. A uniform change is a decision; changes running in opposite directions inside one table are a redraft nobody reconciled.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| E9 | `pricing:published` | Across 12 cells the other printing moves 7 up and 4 down, by as much as $15.00. The single supplement moves with them: at 80 paying, $487.00 here against $470.00 there; at 90 paying, $488.00 here against $469.00 there; at 100 paying, $488.00 here against $469.00 there. Nothing records which table is the one to quote. | Decide which table is current, mark the other superseded with the date it was printed, and generate the price from the components instead of retyping cells. Twelve cells retyped by hand is twelve chances to disagree with yourself. |

Cell by cell, this record (`v1-factual`) against `v2-narrative`:

| Tier | Quad | Triple | Double | Single |
|---|---|---|---|---|
| 80 paying | $833.00 → $835.00 (+$2.00) | $887.00 → $887.00 ($0.00) | $995.00 → $992.00 (-$3.00) | $1,320.00 → $1,305.00 (-$15.00) |
| 90 paying | $794.00 → $803.00 (+$9.00) | $848.00 → $855.00 (+$7.00) | $957.00 → $959.00 (+$2.00) | $1,282.00 → $1,272.00 (-$10.00) |
| 100 paying | $763.00 → $777.00 (+$14.00) | $817.00 → $829.00 (+$12.00) | $926.00 → $933.00 (+$7.00) | $1,251.00 → $1,246.00 (-$5.00) |

Recorded note: The second printing's table. Across the twelve cells the change runs in four different directions, the single supplement falls from about $488 to about $469, and the 80-to-100 discount flattens from $70 to $58. No page records why.

### Sold to the client, with no rate or no deadline recorded

`supplier.terms-incomplete` · warning · 12 findings

**Looks for.** A supplier the client is already paying for whose record holds no rate, or no date of any kind — no final-headcount deadline, no balance date, no release date. A line with no deadline never becomes urgent, so nobody chases it until someone else does.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| W1 | `supplier:bessie-smith` | Bessie Smith Cultural Center is sold to the client and has no deadline recorded. | Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W2 | `supplier:cirque-symphonie` | Cirque de la Symphonie with the Chattanooga Symphony is sold to the client and has no rate and no deadline recorded. | Get the group rate and its basis in writing. Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W3 | `supplier:dinner-day-one` | Day one group dinner is sold to the client and has no rate and no deadline recorded. | Get the group rate and its basis in writing. Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W4 | `supplier:dinner-day-three` | Sit-down dinner following the performance is sold to the client and has no rate and no deadline recorded. | Get the group rate and its basis in writing. Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W5 | `supplier:dinner-day-two` | North Shore group dinner is sold to the client and has no rate and no deadline recorded. | Get the group rate and its basis in writing. Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W6 | `supplier:high-point-climbing` | High Point Climbing and Fitness is sold to the client and has no rate and no deadline recorded. | Get the group rate and its basis in writing. Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W7 | `supplier:hotel-chattanooga` | Chattanooga hotel (property not named on the proposal) is sold to the client and has no deadline recorded. | Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W8 | `supplier:incline-railway` | Lookout Mountain Incline Railway is sold to the client and has no rate recorded (a $100.00 deposit is recorded, which is money paid, not a rate); it does hold a balance date. | Get the group rate and its basis in writing. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W9 | `supplier:ruby-falls` | Ruby Falls is sold to the client and has no rate and no deadline recorded. | Get the group rate and its basis in writing. Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W10 | `supplier:southern-belle` | Southern Belle Riverboat is sold to the client and has no rate and no deadline recorded. | Get the group rate and its basis in writing. Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W11 | `supplier:tn-aquarium` | Tennessee Aquarium is sold to the client and has no rate and no deadline recorded. | Get the group rate and its basis in writing. Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |
| W12 | `supplier:young-transportation` | Young Transportation is sold to the client and has no rate and no deadline recorded. | Get the group rate and its basis in writing. Ask when the final headcount and the balance are due, and record the dates. Until then a headcount change has nothing to trip against, and this line will never come up on a list by itself. |

### A cost line with no amount

`pricing.component-without-amount` · warning · 1 finding

**Looks for.** A per-person component that names a cost and carries no number. The published price cannot be rebuilt while one of its parts is unknown.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| W13 | `pricing:component:motor-coach` | "Motor coach" is a cost component with no amount, against Young Transportation — Not legible on the photographed quote screen. The published per-person price cannot be rebuilt from its parts while one of them is unknown. | Recover the figure from the quote system or the supplier and record it, so the price table can be generated rather than transcribed. |

### A fact that survives only as a margin note

`evidence.handwritten-only` · warning · 8 findings

**Looks for.** Any part of the record whose every source is handwritten. These are real facts — rates, a comp ratio, a tour manager assignment — that live in ballpoint on a page that gets reprinted, and a reprint loses them.

| # | Where | What is wrong | What to do |
|---|---|---|---|
| W14 | `pricing:rate:bessie-smith:per-person` | The $5.00 per person rate for Bessie Smith Cultural Center rests entirely on HW-FRI (handwritten margin notes on the Friday page). Nothing else in the record carries it. | Confirm it against something durable — the supplier's own email, or the quote system — and record that source alongside. This record holds the note, which is the point; the next reprint of the page will not. |
| W15 | `pricing:rate:bessie-smith:tour-guide` | The $50.00 per group rate for Bessie Smith Cultural Center (Tour guide) rests entirely on HW-FRI (handwritten margin notes on the Friday page). Nothing else in the record carries it. | Confirm it against something durable — the supplier's own email, or the quote system — and record that source alongside. This record holds the note, which is the point; the next reprint of the page will not. |
| W16 | `pricing:rate:incline-railway:deposit` | The $100.00 flat fee rate for Lookout Mountain Incline Railway (Deposit) rests entirely on HW-INC (handwritten margin note on the INCLUSIONS page). Nothing else in the record carries it. | Confirm it against something durable — the supplier's own email, or the quote system — and record that source alongside. This record holds the note, which is the point; the next reprint of the page will not. |
| W17 | `pricing:rate:rock-city:per-person` | The $19.00 per person rate for Rock City Gardens rests entirely on HW-THU (handwritten margin notes on the Thursday page). Nothing else in the record carries it. | Confirm it against something durable — the supplier's own email, or the quote system — and record that source alongside. This record holds the note, which is the point; the next reprint of the page will not. |
| W18 | `staffing:tour-manager` | The Tour manager assignment rests entirely on HW-COVER (handwritten margin note on the cover page) — Recorded in pen on one printing of the cover only. It did not carry to the other printing. Nothing else in the record carries it. | Confirm it against something durable — the supplier's own email, or the quote system — and record that source alongside. This record holds the note, which is the point; the next reprint of the page will not. |
| W19 | `supplier:bessie-smith` | Everything recorded about Bessie Smith Cultural Center rests entirely on HW-FRI (handwritten margin notes on the Friday page). Nothing else in the record carries it. | Confirm it against something durable — the supplier's own email, or the quote system — and record that source alongside. This record holds the note, which is the point; the next reprint of the page will not. |
| W20 | `supplier:tn-aquarium` | Everything recorded about Tennessee Aquarium rests entirely on HW-SAT (handwritten margin notes on the Saturday page). Nothing else in the record carries it. | Confirm it against something durable — the supplier's own email, or the quote system — and record that source alongside. This record holds the note, which is the point; the next reprint of the page will not. |
| W21 | `verification:dates-checked-with-the-venue-coordination-contact` | Dates checked with the venue coordination contact rests entirely on HW-COVER (handwritten margin note on the cover page) — Handwritten tick on one printing only. Nothing else in the record carries it. | Confirm it against something durable — the supplier's own email, or the quote system — and record that source alongside. This record holds the note, which is the point; the next reprint of the page will not. |

## Checks that found nothing

These ran against this record and stayed quiet. A page that says what it looked for is worth more than one that only says what it found.

| Check | Looks for |
|---|---|
| `record.unknown-supplier` | An inclusion or a price line naming a supplier id the record does not hold, or a rate belonging to nobody. A dangling reference is worse than a missing one: the checks that would have caught a wrong number go quiet instead. |
| `pricing.rate-contradiction` | A per-supplier rate in the price build that disagrees with the same supplier's own recorded terms. Two numbers for one rate means one document is already wrong. |
| `pricing.rate-without-source` | A price component or per-supplier rate with no source recorded. Every figure that reaches a client should be traceable to the page, screen or email it came from. |
| `slot.overruns-next` | A slot with a recorded duration that ends after the following slot begins. Recorded durations only: where a duration is not recorded the audit stays quiet rather than guessing how long something takes. |
| `slot.time-vs-requested-time` | A time a supplier was asked for, on a form or in a call, with no itinerary slot at that time. What is printed and what was requested should be the same time. |

## How to read this page

- Every id in the **Where** column is a real id in the trip record. `inclusion:inc-imax` is the inclusion with that id; `slot:d2-ruby-falls` is that line of the itinerary.
- The audit compares the record with itself. It does not contact a supplier, confirm a booking, quote a price or decide anything.
- It reports only what the record supports. A missing rate is reported as missing, never estimated.
- It is regenerated from the record on every render, so this page cannot drift from the trip the way two printings drifted from each other.
- The states behind the wording: `sourcing` prints as "venue being finalised", `requested` prints as "requested", `quoted` prints as "quoted", `held` prints as "held", `deposit_paid` prints as "reserved", `confirmed` prints as "confirmed".

