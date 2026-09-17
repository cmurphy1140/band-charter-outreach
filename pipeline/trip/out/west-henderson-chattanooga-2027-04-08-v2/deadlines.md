# Critical-path deadlines — West Henderson High School Band · Chattanooga, TN

`west-henderson-chattanooga-2027-04-08-v2` · v2-narrative · 2027-04-08 to 2027-04-11 · Chattanooga, TN
Operator Troen Student Performance Events · record `pipeline/trip/trips/west-henderson-chattanooga-2027-04-08-v2.trip.json` · prepared 2026-09-11

> Generated from the supplier terms in the trip record. It is a set of dates and a call list.
> It does not contact anyone, hold inventory, or take a payment.

## How these dates are computed

- Each deadline is anchored to the date of the itinerary slot **that supplier serves**, not to the trip start. A supplier serving day four has a later deadline than one serving day one. Where a supplier serves several days, the earliest is used.
- `final_headcount_due_business_days` is counted in **business days, Monday to Friday**, backwards from the anchor and not counting the anchor itself. The working is printed under each deadline so it can be checked against a wall calendar.
- **Public holidays are not modelled.** A holiday inside the count pushes the real date earlier than the one printed here. Check any deadline that falls near one.
- `balance_due_days` and supplier-stated dates are taken as **calendar** days, as written.
- Every date here is derived from the record. Nothing is derived from today, so this document is the same bytes on every run.

## Where this trip stands

- 13 suppliers across 20 supplied itinerary lines (27 lines in total).
- **2 computed deadlines**, carried by 2 suppliers. **11 suppliers produce no date at all.**
- 2 date-bearing terms are recorded and still produce no date — see *Terms recorded that still produce no date*. Those are not missing calls; they are gaps of a different kind.
- Line states: 9 Quoted · 9 Requested · 1 Deposit paid · 1 Sourcing.
- Nothing is confirmed. 1 line is held or paid against — enough to lose money on a date change, not enough to rely on.

## The calendar

| Due | Supplier | What is due | Computed from | Owner | What breaks if it is missed |
|---|---|---|---|---|---|
| **2027-03-29 (Mon)** | Lookout Mountain Incline Railway | Balance due | 10 calendar days before the visit, anchored to 2027-04-08 (Thu) | Troen coordinator → Group sales (email) | The balance is the rest of the money for a date a deposit has already been paid against. $100.00 is already spent on this date (paid 2026-09-11). No cancellation term is recorded, so what a late balance actually costs is unknown. Not confirmed either way: the line is reserved. |
| **2027-04-01 (Thu)** | Rock City Gardens | Final headcount | 5 business days before the visit, anchored to 2027-04-08 (Thu) | Troen coordinator → Group sales (phone, email) | The paid count is fixed here and the group rate is quoted against it. Below 15 admissions the group rate is gone. One group payment is expected, so collection has to be finished by then, not started. Not confirmed either way: the line is quoted. |

The first thing that bites is **balance due for Lookout Mountain Incline Railway on 2027-03-29 (Mon)** — 10 calendar days before the group is in front of them.

### 2027-03-29 (Mon) — Lookout Mountain Incline Railway: balance due

- **Rule** — 10 calendar days before the visit (`balance_due_days`: 10).
- **Anchor** — Thursday 2027-04-08, slot `d1-incline` at 16:45: Lookout Mountain Incline Railway.
- **Notice** — 10 calendar days before the anchor.
- **Recorded terms** — The group event form was submitted for a 4:45 PM visit for 80 people, and asked whether the supplier offers complimentary tickets for tour managers or chaperones. The answer is not recorded on any page.
- **Line state** — Deposit paid; a client-facing document prints this as "reserved".
- **Who** — Troen coordinator → Group sales (email). Contact attempts recorded: 2.
- **Source** — `EM-INCLINE` — Web form submission notification: email: Incline Railway group event form notification, 2026-09-10, forwarded within the operator's group-sales office
- **Source** — `HW-INC` — Handwritten margin note on a printed page: handwritten margin note on the INCLUSIONS page
- **Source** — `HW-THU` — Handwritten margin note on a printed page: handwritten margin notes on the Thursday page

### 2027-04-01 (Thu) — Rock City Gardens: final headcount

- **Rule** — 5 business days before the visit (`final_headcount_due_business_days`: 5).
- **Anchor** — Thursday 2027-04-08, slot `d1-rock-city` at 14:00: Rock City Gardens.
- **Working** — counting back from 2027-04-08: 2027-04-07 (Wed) → 2027-04-06 (Tue) → 2027-04-05 (Mon) → 2027-04-02 (Fri) → 2027-04-01 (Thu). 2 weekend days skipped, so 7 calendar days of real notice.
- **Minimum** — 15 admissions. Group rates require a minimum of 15 admissions and are subject to availability.
- **Payment** — single group payment · card · check with advance notice.
- **Recorded terms** — Cashless since September 2025 and smokeless from July 2026. The supplier states the information is for planning only and does not confirm a reservation.
- **Line state** — Quoted; a client-facing document prints this as "quoted".
- **Who** — Troen coordinator → Group sales (phone, email). Contact attempts recorded: 3.
- **Source** — `HW-THU` — Handwritten margin note on a printed page: handwritten margin notes on the Thursday page
- **Source** — `EM-ROCKCITY` — Email from or to the supplier: email: attraction group sales reply, 2026-09-10

## Suppliers with no deadline date

These are the ones that surprise you. A blank row would read as "nothing to do"; the row is here because the deadline exists **at the supplier** and the record cannot produce it. The last column says which kind of problem it is, because a missing term is a phone call and a missing itinerary line is not.

| Supplier | First serves | Lines | State | Why there is no date | What the record says |
|---|---|---|---|---|---|
| Young Transportation | 2027-04-08 (Thu) | 4 | Quoted | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | The quote system names the company on the bus line but leaves the supplier field empty, so nothing links the price to a counterparty. Motor-coach driver-hours limits and any overnight-drive policy are unrecorded for this trip. |
| Chattanooga hotel (property not named on the proposal) | 2027-04-08 (Thu) | 4 | Quoted | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | Three nights with daily breakfast are sold as inclusions. Rooming-list deadline, cut-off date and attrition terms are not recorded anywhere in the supplied pages. |
| Southern Belle Riverboat | 2027-04-11 (Sun) | 1 | Requested | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | A ninety-minute narrated cruise from Pier 2 at Ross's Landing. Departure times, group rate and deadline are not recorded. |
| Ruby Falls | 2027-04-09 (Fri) | 1 | Requested | Not recorded: final_headcount_due_business_days · balance_due_days · deposit. Recorded and left empty: release_date | The supplier states the first ride is at 09:00. The printed itinerary puts the group there at 08:30, so the printed time cannot be met as written. |
| Bessie Smith Cultural Center | 2027-04-09 (Fri) | 1 | Requested | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | A $50 tour guide fee applies in addition to the per-person admission. The guide was requested and the request is recorded as submitted; no confirmation is recorded. |
| Tennessee Aquarium | 2027-04-10 (Sat) | 1 | Requested | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | Admission and the IMAX theatre are both sold as inclusions. No rate, minimum or deadline is recorded on any supplied page. |
| High Point Climbing and Fitness | 2027-04-09 (Fri) | 1 | Requested | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | Instruction and climbing are sold as an inclusion. No rate, group minimum or waiver requirement is recorded. |
| Cirque de la Symphonie with the Chattanooga Symphony | 2027-04-10 (Sat) | 2 | Requested | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | Group tickets are sold as an inclusion. The performance venue is printed differently on the two iterations of this proposal. |
| Day one group dinner | 2027-04-08 (Thu) | 1 | Sourcing | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | The proposal prints a named dining complex for this dinner and the inclusions page sells it. At the same time five other venues were being contacted for the same meal. |
| North Shore group dinner | 2027-04-09 (Fri) | 1 | Requested | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | Sold as an inclusion. No venue, rate or minimum is recorded. |
| Sit-down dinner following the performance | 2027-04-10 (Sat) | 1 | Requested | Not recorded: final_headcount_due_business_days · balance_due_days · release_date · deposit | Sold as an inclusion. No venue, rate or minimum is recorded. |

### Terms recorded that still produce no date

Written down, and still not a date on anybody's calendar. A supplier can appear in the list above, or carry a perfectly good deadline of its own, and still hold one of these.

| Supplier | Term | Why it produces nothing |
|---|---|---|
| Lookout Mountain Incline Railway | deposit (paid 2026-09-11 — a payment already made, not a date ahead) | Recorded, and not a date ahead of the trip. |
| Ruby Falls | `release_date` | Present in the record and left empty. Somebody knew to ask; the answer never came back. |

No cancellation term is recorded for 13 of 13 suppliers, so the cost of any of these dates slipping is unknown across the whole trip.

1 sold inclusion has no itinerary slot at all (Admission to the IMAX Theater at the Aquarium), so it has no anchor and could not carry a computed deadline even if the supplier gave one.

## Deposit and balance ledger

| Supplier | Item | Amount | Basis | Status | When | Supplier sources |
|---|---|---|---|---|---|---|
| Lookout Mountain Incline Railway | Deposit | $100.00 | Flat fee | Paid | paid 2026-09-11 (Fri) | EM-INCLINE, HW-INC, HW-THU |
| Lookout Mountain Incline Railway | Balance | not recorded | not recorded | Outstanding | due 2027-03-29 (Mon) | EM-INCLINE, HW-INC, HW-THU |

Paid to date: $100.00 across 1 item. Outstanding: 1 item, 1 with no amount recorded.

**A due date with no amount against it is still a deadline, and it is the worse kind** — the date is known and what has to be sent on it is not.

The outstanding amount cannot be recovered from the price table either: of 5 per-person cost lines, 3 name no supplier and 1 carries no amount.

## Thresholds that are not dates

These do not move when the date moves. They move when the headcount or the money does, and they break a booking just as completely.

| Supplier | Kind | Value | What the supplier said |
|---|---|---|---|
| Rock City Gardens | Minimum | 15 admissions | Group rates require a minimum of 15 admissions and are subject to availability. |
| Rock City Gardens | Payment method | single group payment · card · check with advance notice | Cashless since September 2025 and smokeless from July 2026. The supplier states the information is for planning only and does not confirm a reservation. |

A payment method is a deadline in disguise: "check with advance notice" names no number of days, so the notice it needs is itself unrecorded.

## If the date moves

Two different things happen to a deadline when a trip date changes, and they are not interchangeable.

**Recomputes automatically (2).** These are derived from an anchor date, so moving the trip moves them. Nobody has to remember them.

| Deadline | As recorded | Trip −3 days | Trip +3 days | Trip +7 days |
|---|---|---|---|---|
| Lookout Mountain Incline Railway: balance due | 2027-03-29 (Mon) | 2027-03-26 (Fri) (−3d) | 2027-04-01 (Thu) (+3d) | 2027-04-05 (Mon) (+7d) |
| Rock City Gardens: final headcount | 2027-04-01 (Thu) | 2027-03-29 (Mon) (−3d) | 2027-04-05 (Mon) (+4d) | 2027-04-08 (Thu) (+7d) |

A business-day deadline does not slide by the number of days the trip slid, because weekends fall differently on either side of the move. Move this trip 3 days later and the final headcount for Rock City Gardens moves 4 days, not 3. Every calendar-day term in the same table slides exactly with the trip. Two deadlines, two different answers, in the week when there is least time to work them out by hand.

**Has to be renegotiated, not recomputed.** A paid deposit is not a movable date.

- **Lookout Mountain Incline Railway** — $100.00 paid 2026-09-11 against 2027-04-08 (Thu) at 16:45. The money is spent; the date and time it bought are the supplier's to move. Ask before assuming it transfers.
- **Rock City Gardens** — the 15-admission minimum does not move with the date. It moves with the headcount, and the headcount is usually what changed.
- **The 11 suppliers producing no date** — nothing recomputes for them, because the record holds nothing to recompute. Every one is a call to find out what the new date just broke. That is the work this calendar exists to remove, and it is not removed until those terms are in the record.
- **The operator's own re-quote clause** — the exclusions page makes the price subject to the final number of paying participants, and no trip-level final-headcount date is recorded anywhere. The only headcount deadline in this record belongs to one attraction.

**Unaffected by a date change, and still wrong.** Moving the trip does not fix a conflict inside a day.

- **Ruby Falls** — The supplier states the first ride is at 09:00. The printed itinerary puts the group there at 08:30, so the printed time cannot be met as written.

---

Deadlines computed: 2. Suppliers producing none: 11. Terms recorded that produce no date: 2. Business days are Monday to Friday; public holidays are not modelled. Individuals and direct numbers are held as roles under the privacy rule in `pipeline/trip/README.md`.
