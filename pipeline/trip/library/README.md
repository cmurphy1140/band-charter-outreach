# Destination component library

[Trip layer contract](../README.md) · [Universal pipeline](../../README.md) · [Shared instructions](../../../AGENTS.md)

Every trip to the same city rebuilds the same work: the same vendor research, the same
descriptive copy, and the same question asked of the same supplier. *Does the group-sales
office give complimentary tickets to tour managers or chaperones?* was sent to one supplier
by web form, went unanswered, and will be sent again next season — because the answer had
nowhere to live except a margin on a page that gets reprinted.

A **component** is where it lives. One file per destination, one entry per business, holding
what is true of that business next April as well as this one. A trip then *assembles* the
lines it can and researches only the rest.

```
node pipeline/trip/cli.cjs render --all   # writes library-coverage.md per trip
node --test tests/trip_library.test.cjs
```

## The boundary

This is the whole design, and it is enforced rather than described.

**Stable — belongs in a component**

| | |
|---|---|
| Identity | the business name, its aliases, its category, how it is booked |
| Copy | the blurb a client document prints |
| Channel | the *kind* of group-sales channel and what it is called, plus any channel shared with another business |
| Shape | typical duration, group minimum, comp policy, deadline shape in days, opening hours that bound a group |
| Practicalities | accessibility, payment methods, waivers and other paperwork, seasonality, on-the-ground operations |
| Relationships | one office covering two businesses, one campus holding several venues, an add-on sold with a parent ticket |

**Per trip — never in a component**

Calendar dates · clock times for a group · headcount · the figure negotiated for this group ·
deposit state · attempt history · confirmation state.

`validateLibrary()` in [`../renderers/library-coverage.cjs`](../renderers/library-coverage.cjs)
rejects a component that carries any of them. A library that fails gets a report of its errors
in place of a coverage report — loudly, and without taking any other trip's documents down with
it. It looks for:

- a key named `date`, `time`, `headcount`, `paying`, `attempts`, `booking_state`, `price`,
  `rate`, `amount`, `paid_on` and their obvious relatives, plus anything ending `_date` or
  `_time`;
- an ISO date anywhere in a component;
- a clock value anywhere except under `operating_hours`;
- a money amount;
- a value that *is* a booking state — `"confirmed"`, `"deposit_paid"`, `"held"`.

That last check reads whole values, not words in a sentence. "Tickets are held at will call"
and "a guide is requested on the same form" are stable facts about a business and exactly the
copy this layer exists to hold; `{ "booking": "confirmed" }` is one trip's state wearing a
component's clothes. For the same reason a bare `state` key is allowed — a venue address has
one, and a US state is not a booking state.

Two deliberate carve-outs:

- **`sources[].accessed`** carries the date a public page was read. That is provenance, not
  trip data, so sources sit outside the component scan.
- **`operating_hours`** is the one place a clock value is a fact about the business. "The first
  ride of the day is 09:00" is true next April; "the group rides at 09:15" is not.

The boundary also decides what the library does *not* hold. Rock City's group minimum is 15
whoever asks, so it is a component; the rate that group was given is not, because it is
negotiated per trip, per season and per headcount. The component says *that there is a student
group rate and a minimum*; the trip record holds the number.

## Adding a destination

1. Create `pipeline/trip/library/<city>.json`.
2. Set `library.destination` to exactly the string the trip record uses in `trip.destination`.
   That string is how a trip finds its library; nothing else links them.
3. Fill in `sources`, then `channels`, then `components`.
4. `node pipeline/trip/cli.cjs render --all` and read the coverage report. It will tell you
   what the library still does not cover.

A new destination is worth starting from the trip that prompted it: every supplier on that
trip is a component waiting to be written, and its `terms` already say which parts are stable.

## What a component looks like

```json
{
  "id": "ruby-falls",
  "name": "Ruby Falls",
  "category": "attraction",
  "booking_mode": "group_sales",
  "aliases": [],
  "blurb": "A 145-foot waterfall a thousand feet inside Lookout Mountain …",
  "group_sales": { "channel_id": null, "channel_kind": "web_form", "also": ["phone"], "locator": "group reservation form" },
  "typical_duration_minutes": 90,
  "duration_note": "Seventy to ninety minutes for the cave walk.",
  "comp_policy": { "known": false, "kind": null, "note": "Not published." },
  "group_minimum": { "count": 15, "unit": "paying guests", "note": "…" },
  "deadline_shape": { "prepay_lead_days": 5, "booking_lead_days": 7, "arrival_lead_minutes": 30, "note": "…" },
  "operating_hours": { "earliest_group_entry": "09:00", "note": "…" },
  "seasonality": { "group_rates_unavailable": ["Saturdays", "Sundays", "holidays", "July"], "note": "…" },
  "accessibility": { "note": "…" },
  "payment": { "methods": ["single group payment"], "note": "…" },
  "standing_questions": [],
  "relationships": [],
  "source_ids": ["TRIP-RECORD", "WEB-RUBY-GROUPS"]
}
```

Field by field:

- **`category`** comes from `SUPPLIER_CATEGORIES` in [`../schema.cjs`](../schema.cjs), so a
  component and a trip supplier are describable in the same words.
- **`booking_mode`** is `group_sales`, `gate_admission` or `no_booking`. A free riverfront stop
  is still a component — it needs a briefing rather than a booking, and that is worth keeping.
- **`comp_policy`** carries `known: false` when the answer has never been given. That is the
  difference between "no comps" and "nobody ever wrote it down", and only the second one is a
  reason to pick up the phone.
- **`standing_questions`** are the questions to close once. Each has an `answer` field, `null`
  until it is answered, and an optional `topic` — a question with `topic: "comp_policy"` stops
  the coverage report from also generating the generic comp question.
- **`deadline_shape`** holds counts of days, never dates. `balance_due_days: 10` survives a
  change of travel dates; `2027-03-29` does not.
- **`relationships`** point at other component ids with a `nature` such as
  `shared_group_sales_office`, `same_campus`, `same_site` or `add_on`.
- **`source_ids`** are required. A component with no source is a rumour.

### Aliases

An alias is a name the trip record might print for this business. Its `kind` decides what the
coverage report does with it:

| kind | meaning | reported? |
|---|---|---|
| `shorthand` | an acceptable short form — "Rock City" | no |
| `variant` | a published alternate name | no |
| `misprint` | a wrong name that has reached print — "High Street Climbing and Fitness Center" | yes, as a correction |
| `stale` | a name that was right once, or will be again — "Tivoli Theatre" while the orchestra plays elsewhere | yes, as out of season |

An alias needs at least eight characters once normalised, the same rule the component name
follows, because matching is by containment and a short token would match half an itinerary.

### Channels

A channel is a group-sales office that covers more than one business. The Incline Railway and
the Southern Belle riverboat are handled by the same office: one call, two lines. Record it
once in `channels`, list the component ids in `covers`, and point each component's
`group_sales.channel_id` back at it. The coverage report then prints what one enquiry buys.

## How a trip line is matched to a component

Deterministically, and in one direction only: the component's name or alias has to appear in
what the trip prints.

- **Matched on** the supplier name, the line title, the text of an inclusion covering that
  line, or the line's description.
- **Library-backed** when the match came from the supplier, the title or an inclusion — the
  things the line actually sells. A match found only in the description is reported as
  *referenced only*: the Walnut Street Bridge is real library content and the dinner at the
  far end of it is still bespoke.
- **Scanned but never counted as coverage**: candidate venues, venue variants, supplier notes
  and line notes. A candidate is a line's shopping list, not what it is backed by. These are
  read for name drift, which is how `NC and Norman's` in a planning note gets corrected to
  `Nic & Norman's` without claiming the line was assembled from a component.

One direction matters: "IMAX 3D Theater at the Tennessee Aquarium" contains "Tennessee
Aquarium", so the reverse rule would attach the IMAX component to the aquarium line and hide
the fact that the IMAX ticket is sold with no slot to happen in.

Matching is on whole words. Both sides are normalised — lower-cased, punctuation collapsed to
single spaces — and padded, so "Point Park" matches `Point Park and the overlook` and not
`checkpoint parking`. Clock comparisons go through minutes rather than string order, because
the trip schema accepts `8:30` as readily as `08:30` and one of those sorts after `09:00`.

## Privacy

The trip layer's rule applies here in full. Keep business names and their **published**
group-sales channels: a channel *kind* (`web_form`, `phone`, `email`) and what the channel is
called (`group event form`, `box office group ticketing`). Never an individual, a personal
mailbox or a direct number — `validateLibrary()` fails the library if it finds one.

## Sourcing

`sources` mirrors the trip record's shape. Two kinds:

- **`project_record`** — the fact is already in a trip record. Use it when lifting something
  that describes the business rather than one group's visit.
- **`public_web`** — needs `url` and `accessed`, the date the page was read. Group-sales terms
  change; a fact with a read date can be re-checked, a fact without one can only be believed.

## What this does not do

It does not contact anyone, hold inventory, or price anything. It does not keep a trip's state.
A component is an assertion about a business on the date it was last checked, and the coverage
report says when that was.
