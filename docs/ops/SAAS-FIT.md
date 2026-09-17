# SaaS fit — what to buy, what to build

[Software and automation strategy](../carnegie-hall/strategies/07-software-and-automation-fit.md) ·
[Zoho research and policy finding](../carnegie-hall/ZOHO-RESEARCH-PROMPT.md) ·
[Trip production contract](../../pipeline/trip/README.md) ·
[Business context and source inventory](../carnegie-hall/BUSINESS-CONTEXT.md)

## Purpose and the question this answers

One question decides whether the operations build continues: **what software should this
business actually buy, and what, if anything, should it build?**

This document extends the "separate the jobs" table in
[strategy 07](../carnegie-hall/strategies/07-software-and-automation-fit.md#separate-the-jobs)
from *POC treatment* to *purchasing decision*, and follows its bounded-evaluation protocol:
name the exact sample, record what was and was not retrievable, and do not let a vendor's
success flag stand in for a verified capability.

**Standard applied throughout.** Every price and capability claim carries a URL and an access
date. All access dates are **2026-09-17** unless stated. Vendor marketing is attributed, never
restated as measured fact. Anything derived rather than read is marked **Inference**. No
individual's name or contact details appear here, per the
[privacy rule](../../pipeline/trip/README.md#privacy-rule--applies-to-every-file-in-this-layer).

---

## 1. The finding, tested

The hypothesis handed to this unit was: *Troen owns the collection layer and is missing the
production layer.* It survives testing, and the repository can now put numbers on it.

### 1.1 What the incumbent advertises

GroupCollect's own pages name: trip creation, traveller registration, payment collection,
payment reminders, customer text/email, communication tracking, and supplier
communication — "Ask about availability, receive proposals, book and pay — all in one
place." They do **not** name itinerary building, a supplier database holding terms, margin or
markup calculation, occupancy-tiered group pricing, or proposal generation.
([groupcollect.com](https://www.groupcollect.com/), accessed 2026-09-17;
[pricing](https://www.groupcollect.com/pricing), accessed 2026-09-17.)

Note the verb. GroupCollect *receives* proposals from suppliers. It does not *produce* the
proposal the school reads. That is the whole gap in one word.

### 1.2 What the operator's own artefacts show

From the transcribed trip record
([west-henderson-chattanooga-2027-04-08.trip.json](../../pipeline/trip/trips/west-henderson-chattanooga-2027-04-08.trip.json),
one real trip, two printed iterations, transcribed 2026-09-17):

| Measure | Count | What it means |
|---|---|---|
| Itinerary slots in the record | 27 over 4 days | The trip a client bought |
| Slots with **no supplier attached** | 7 of 27 | A quarter of the trip has no counterparty on the line |
| Slots in state `confirmed` | **0 of 27** | Nothing in this trip was recorded as settled |
| Slots in state `sourcing` yet printed as a named venue | 1 | A line the client reads as booked while alternatives were being called |
| Slots with no state recorded at all | 7 of 27 | Status was never written down anywhere |
| Suppliers in the record | 13 | |
| Suppliers with **no term field** beyond a free-text note | 8 of 13 | No price, minimum, deposit, deadline or cancellation held |
| Suppliers with a recorded **comp policy** | **1 of 13** | The ratio that moves the price is held in pen, once |
| Suppliers with a recorded **final-headcount deadline** | **1 of 13** | The date that triggers a call list exists for one supplier |
| Price-table cells | 12 (4 occupancies × 3 headcount tiers) | |
| Cells that changed between the two printings | **11 of 12** (only the 80-pax triple held at $887) | No page records why |
| Direction of those changes | Both up and down — the record's own note calls it "four different directions" | The single supplement fell $487 → $470 and the 80-to-100 discount flattened $70 → $58 |

And on the quote screen itself, source `QS-48398`: *"Per-person cost lines. Every line reads
'No supplier'. Itinerary: None added. Template used: None added."* One of the five cost lines
is a blended `Attractions, $183.00` with `supplier_id: null` and the note that its components
"are known in pen but cannot be recovered from the blend."

**The proposal document was the database, and every redraft wiped it.** The collection system
was working exactly as sold. It was never asked to hold any of this.

### 1.3 What the production category sells against

Tourwriter's marketing addresses this directly. Its homepage carries customer-attributed
speed claims — Tourwriter states, quoting a named customer, *"The speed to do a quote has
reduced by about 80%"*, presented as "80% faster quoting"
([tourwriter.com](https://www.tourwriter.com/), accessed 2026-09-17).

**Correction to the brief.** The brief cited Tourwriter as claiming "~70% faster quote
creation" while "eliminating the pricing errors and version confusion that damage client
trust". That sentence is surfaced by web search as Tourwriter copy, but it was **not
reproducible verbatim** on the homepage, the pricing page, or the two article pages fetched on
2026-09-17. Treat the 70% wording as **unverified at access time**. The claim that *is*
retrievable verbatim is the customer-attributed 80% figure above, and Tourwriter's own
article stating *"Manual data entry carries an average error rate of 1% to 4%"* alongside a
worked example: *"A tour operator sent a quote for a 14-day Ireland journey. The pricing was
based on a rate sheet from March. The difference was €45 per night across eight nights. The
quote went out €360 under cost before anyone caught it."*
([The hidden cost of double entry](https://www.tourwriter.com/the-hidden-cost-of-double-entry-in-travel-operations/),
accessed 2026-09-17.)

That example is the same defect class as the eleven changed price cells, arrived at
independently by a vendor describing its own market. It is corroboration of the problem. It is
not evidence that the product fixes it for Troen.

Ezus states its plans include an "itinerary builder with maps, dynamic budgeting, CRM,
document automation, supplier management", an "Integrated catalog (products, suppliers &
destinations)", and "50+ templates" covering proposals, quotations and contracts
([ezus.io/pricing](https://ezus.io/pricing/), accessed 2026-09-17). **Correction to the
brief:** the "~80% faster" figure attributed to Ezus was not found on its pricing page; what
that page states about speed is an onboarding figure — "onboarding averages 23 days" — which
is a different claim. Mark the Ezus 80% as **unverified at access time**.

---

## 2. Category map

Conflating these categories is the mistake that produced the current stack. A tool bought for
one job is not evidence of coverage in another.

### 2.1 The jobs, extended from strategy 07

This extends the [separate-the-jobs table](../carnegie-hall/strategies/07-software-and-automation-fit.md#separate-the-jobs)
with the purchasing column that table deliberately left open.

| Job | Category | Held today by | Verdict |
|---|---|---|---|
| Take registrations, traveller data and money | Collection | GroupCollect | **Keep.** Working as sold. No reason to move. |
| Hold suppliers, their terms and their deadlines | Production | Pen, on a page that gets reprinted | **Buy.** The gap. |
| Cost a trip and compute the occupancy × headcount table | Production | A quote screen with `No supplier` on every line | **Buy.** |
| Produce the document the school reads | Production | Word, retyped each round | **Buy.** |
| Make an itinerary look good to a client | Presentation | The same Word file | **Bundled with production; do not buy separately.** |
| Track a school relationship through approval | CRM | Zoho (employee-reported, account unverified) | **Defer.** See §2.6. |
| Move data between the above | Automation | Manual retyping | **Defer.** See §2.7. |
| Get an agreement signed | E-signature | DocuSign | **Keep.** See §2.8. |
| Discover public prospects on evidence | Research | This repository's Python pipeline | **Already built. Not in scope here.** |
| Hold the trip as a record so documents are generated, not retyped | Production substrate | `pipeline/trip/` prototype | **Build — thin. See §4.** |

### 2.2 Collection — registration, traveller data, payments

| Product | What it does | Published price (accessed 2026-09-17) | Supplier DB with **terms**? | Change recalculates quote? | Generates client documents? | Occupancy-tiered group pricing? |
|---|---|---|---|---|---|---|
| **GroupCollect** (incumbent) | Trip creation, traveller registration, payments, trip protection, payment reminders, customer text/email, supplier *communication* | **Register:** $0/mo membership + **4% platform fee per transaction**. **Works:** $0/mo + **1% platform fee**, first 50 transactions fee-free (limited offer). Payment processing charged separately. [pricing](https://www.groupcollect.com/pricing) | **No** — not advertised | Not advertised | Not advertised | Not advertised |
| **WeTravel** | Booking, payments, traveller management | **Not retrievable.** [wetravel.com/pricing](https://www.wetravel.com/pricing/) returned HTTP 403 (Cloudflare interstitial) to both fetch tools on 2026-09-17 | Unverified | Unverified | Unverified | Unverified |
| **SquadTrip** | Booking pages, payment plans, trip builder, reminders, promo codes, affiliate tracking | **Starter:** $0/mo, **6% transaction fee** (inclusive of Stripe 2.9% + 30¢). **Launch:** $29/mo or $299/yr, same 6%. [squadtrip.com/pricing](https://squadtrip.com/pricing) | **No** evidence on the page | No | No — booking pages, not proposals | Partial: package/add-on pricing, no occupancy tiers named |
| **Regpack** | Registration forms, payments (card/ACH/wallet), recurring billing, workflow automation, email, reporting | Three tiers named (SMB, Mid-Market, Mid-Market Plus); **no dollar figures published** — "Get Pricing" CTA only. Sole concrete figure: "Payment processing as low as 1.5%". [regpacks.com/pricing](https://www.regpacks.com/pricing/) | **No** | No | No | Not named |

**Reading.** Every product in this category whose price could be established charges a
**percentage of money moved** — GroupCollect 4% or 1%, SquadTrip 6%, Regpack "as low as
1.5%" processing — with SquadTrip's $29/mo the only seat-like component found, and WeTravel's
model unestablished because the page was blocked. The category is therefore priced against
volume, not headcount, which matters for the incumbent-cost line in §3.

**On the "~$60/month" figure.** GroupCollect's published pricing has **no $60 tier**.
Membership is $0/month on both plans; the charge is a platform fee of 4% (Register) or 1%
(Works) per transaction, plus separate payment processing. The ~$60/month figure is
operator-reported and does not map to a published plan.
**Inference:** if the ~$60/month is a real average of platform fees, it implies roughly
$1,500/month of transaction volume on Register (4%) or roughly $6,000/month on Works (1%) —
a four-fold difference in **volume**, not in the fee. The cost line is ~$720/year either way;
what moves four-fold is how much money is flowing through the platform, and therefore how
fast that fee grows as the business books more trips. Read the tier and the volume off an
actual statement. **Do not treat $720/year as a settled number**: it rests on a reported
figure that matches no published plan.

### 2.3 Production — itinerary, costing, supplier database, proposals

This is the category the operator does not own.

| Product | What it does | Published price (accessed 2026-09-17) | Supplier DB with **terms**? | Change recalculates? | Client documents? | Occupancy-tiered group pricing? | Lock-in |
|---|---|---|---|---|---|---|---|
| **Tourwriter** | Itinerary builder, supplier/rates management, automatic pricing, booking management, Stripe payments, CRM, accounting export | **Starter** $99/user/mo, billed annually, **1 user, up to 25 itineraries/year**, stated as "For businesses in first 3 years". **Pro** $149/user/mo, 2–5 users, 50 itineraries/user/year. **Premium** POA, 5–20+ users, unlimited. **One-time set-up from $1,199** (migration, setup, training). [pricing plans](https://www.tourwriter.com/software-pricing-plans/) | **Claimed** — "supplier/rates management" named per plan; depth of *terms* (comp ratio, headcount deadline, release date) **unverified** | Vendor states "Automatic pricing"; live behaviour **unverified** | **Claimed** — "export and share with travellers at the click of a button" ([homepage](https://www.tourwriter.com/)). Format and layout control **unverified** | **Unverified.** Not named on any page read | $1,199+ sunk setup; migration sold as a paid service on entry; export terms not published |
| **Ezus** | Itinerary builder with maps, dynamic budgeting, CRM, document automation, supplier management, payment gateway, financial tracking | **Professional** €75/user/mo (annual, ≤10 users). **Premium** €100/user/mo (annual, unlimited users). **Enterprise** on request, min. 30 users. **Mandatory onboarding pack €1,990 one-time, ex-tax.** Ezus Pay "from 1.19%" + €0.30/transaction on European cards. [ezus.io/pricing](https://ezus.io/pricing/) | **Claimed** — "Integrated catalog (products, suppliers & destinations)"; terms depth **unverified** | "Dynamic budgeting" claimed; **unverified** | **Claimed** — PowerPoint/Excel/PDF, "50+ templates" incl. proposals, quotations, contracts. Not inspected | **Unverified** | €1,990 non-recoverable entry fee; **public API is Premium-tier only**, so programmatic export costs €100/user/mo |
| **moonstride** | Contract loading, sales/purchase ledger, itinerary builder, quotes, bookings, customer documentation | **Pro** $645/mo (5 users incl.), setup **from $1,950**. **DMC** $775/mo, setup from $1,950. **Group** $975/mo, setup **from $5,460**. **Enterprise** custom. Additional user ~$60/mo. Contract limit 150 (Pro), expandable to 250. [moonstride.com/pricing](https://www.moonstride.com/pricing/) | **Claimed, and most specific** — "Contract Loading Modules" for accommodation, transfers, tours, vehicles, insurance | "Pricing manager for rates, commissions, margins, discounts" claimed | **Claimed** — invoices, vouchers, itinerary documents. Not inspected | **Named — the only one.** The Group plan lists a **"Pax-Range Pricing calculator"**, which is the occupancy/headcount-tier problem by name. Still a page claim, not a demonstration | Setup $1,950–$5,460 sunk; contract-count ceiling is a capacity cliff |
| **Softrip** | Reservations, product management, operations, CRM, reporting, integrated payments, accounting, API | **Not published.** Demo request only. Positions at 5–500 users; directs sub-10-employee operators to a separate product. [softrip.com](https://www.softrip.com/) | Presumed yes; unverified | Unverified | Unverified | Unverified | Enterprise contract, unpublished terms |
| **Tourplan** | Sales, operations, financials, itinerary, supplier connectivity, accounting | **Not published.** Demo request only. States 450 operators in 75 countries. [tourplan.com](https://www.tourplan.com/) | Presumed yes; unverified | Unverified | Unverified | Unverified | Enterprise contract, unpublished terms |
| **TourLeaderPro** | **Miscategorised in the brief.** Not group-travel software. An Italian tour-leader consultancy and training business: itinerary auditing, supplier vetting, staff training, accompaniment | Service rates, not licences: audits "Da €600", training "Da €1.500/giornata", retainer "€2.000/mese". [tourleaderpro.com](https://www.tourleaderpro.com/) | n/a | n/a | n/a | n/a | **Remove from the shortlist.** |

### 2.4 Itinerary presentation

These make a trip *look* right. None of them holds a supplier's comp policy or recomputes a
price table. Buying one **does not close the gap** and risks a third place for the trip to
disagree with itself.

| Product | Published price (accessed 2026-09-17) | Costing / supplier terms? |
|---|---|---|
| **Travefy** | **Core** $39/mo (billed annually), **Premium** $59/mo; additional seats $20 (Core) / $39 (Premium) per month; new-agent program $25/mo. **Agency tier price not published.** [travefy.com/pricing](https://travefy.com/pricing) | Itinerary & proposal builder, CRM, invoicing and commission tracking. "Centralized Supplier Management" appears **only on the Agency tier, whose price is not published** — so the $39 Core figure in config G buys a product without it. **Supplier *terms*, margin calculation and occupancy-tiered group pricing are not specified on the page.** |
| **Axus Travel App** | **$35/seat/month**, or **$329/seat/year**. DMC/operator team pricing custom. [axustravelapp.com](https://axustravelapp.com/) | Itinerary building, supplier collaboration, GDS PNR import. **Costing and margin not named.** |
| **Wetu** | **Not published.** A `/pricing-plans` link exists in navigation; the page was not retrievable on 2026-09-17. [wetu.com](https://www.wetu.com/) | Itinerary builder, 250,000+ image content library, product management with commission rates, branded traveller app. **Presentation and content, not costing.** |
| **mTrip** | **Not published.** Demo request only. [mtrip.com](https://www.mtrip.com/) | Itinerary delivery, branded traveller mobile app, document delivery, optional paid risk-management add-on. **No supplier pricing or contract-terms management evident.** |
| **TripMapper** | **Not retrievable.** [tripmapper.com/pricing](https://tripmapper.com/pricing) returned HTTP 503 on 2026-09-17 | Unverified |

**Recommendation for this category: buy nothing here.** Tourwriter's Premium tier already
lists a traveller "mobile app (Vamoos/Axus)"
([pricing plans](https://www.tourwriter.com/software-pricing-plans/), accessed 2026-09-17),
and both Tourwriter and Ezus state they produce the client document directly (§2.3). A
standalone presentation tool adds a fourth artefact that can disagree with the other three —
which is the defect, not the fix. Note the limit of this reasoning: it rests on vendor page
claims, so if question 14 in §5 fails at every demo, this category reopens.

### 2.5 School- and youth-group-specific

| Product | What it does | Price | Notes |
|---|---|---|---|
| **Voyita** | Seven modules: Create Trips, Registration, Payments, **Quotations**, On-Trip Operations, Traveler Portal, Visibility & Control. States an "AI Itinerary Builder" that ingests an existing document into "a structured, editable day-by-day plan"; "AI Cost Sheet Generation" line by line; **"Configure pricing per accommodation type, traveler type, and optional add-ons"**; **versioned quote documents** with inclusions/exclusions and digital sign-off; vendor tracking "per trip, including hotels, transport, guides, and activities". Names school trips explicitly (donation collection; "one parent, multiple children" family accounts). [voyita.com/features](https://voyita.com/features/) | **Not published.** Demo request only. | **The single closest functional match found to the actual defect list**, and it spans both collection *and* production. Two reservations: (a) **no published price at all**, which makes it un-costable in §3 and is itself a negotiating disadvantage; (b) supplier records are described as per-trip, so a **supplier's terms may not persist across trips** — which is precisely the thing the operator needs. Both are demo questions, not conclusions. |

No other school-trip-specific vendor surfaced in this bounded search. **Inference:** the
segment is thin, which is *why* the operator ended up with a collection tool and a Word file.
Absence of a competitor here is not evidence that building is therefore correct — see §4.

### 2.6 CRM

**A full Zoho assessment already exists in this repository and is not redone here.** See
[ZOHO-RESEARCH-PROMPT.md](../carnegie-hall/ZOHO-RESEARCH-PROMPT.md) and the supplied
[Troen_Zoho_Assessment.docx](../carnegie-hall/research/Troen_Zoho_Assessment.docx).

Its load-bearing finding, independently rechecked on 2026-09-10 and recorded there: the
public [Zoho anti-spam policy](https://www.zoho.com/policy.html) requires **express, provable
permission** for covered commercial messaging and restricts imports and sends involving
third-party or website-collected addresses; the
[CRM-specific terms](https://www.zoho.com/crm/terms.html) apply that policy to commercial
email sent from CRM. Project consequence, unchanged: keep public research separate from
marketing or email-enabled imports until a specific permissible handoff is established. A
published professional address does not establish permission.

**Inference, and it matters for this document:** that constraint is a *category* property,
not a Zoho defect. Any CRM that sends commercial email carries an equivalent acceptable-use
term. **Switching CRM does not relax it**, so "the Zoho policy is inconvenient" is not a
reason to buy a different CRM. This removes the only stated grievance from the CRM decision.

Open ground — no CRM other than Zoho has been named in this repository:

| Product | Published price (accessed 2026-09-17) |
|---|---|
| **Attio** | Free ($0, ≤3 seats, 50,000 records, 200 emails/mo). **Plus** $34–35/seat/mo annual, $44 monthly, ≤10 seats. **Pro** $79/seat/mo annual, $99 monthly. Enterprise custom. [attio.com/pricing](https://attio.com/pricing) |
| **Copper** | **Basic** $23/seat/mo annual ($29 monthly). **Professional** $59 annual ($69 monthly). **Business** $99 annual ($134 monthly). [copper.com/pricing](https://www.copper.com/pricing) |
| **folk** | **Standard** $24/member/mo annual ($30 monthly). **Premium** $48 annual ($60 monthly). **Enterprise** from $80 annual (from $100 monthly). [folk.app/pricing](https://www.folk.app/pricing) |
| **HubSpot** | Free tools $0 (up to 2 users); Sales Hub **Starter $7/seat/mo**. Higher tiers exist but were **not listed on the page fetched**; treat Professional/Enterprise pricing as unverified. [hubspot.com/pricing/crm](https://www.hubspot.com/pricing/crm) |
| **Pipedrive** | **Not retrievable.** [pipedrive.com/en/pricing](https://www.pipedrive.com/en/pricing) returned HTTP 403 (Cloudflare block) to both fetch tools on 2026-09-17. No price recorded. |

**Recommendation: do not buy a CRM in this round.** Tourwriter, Ezus, moonstride and Voyita
all bundle contact/opportunity handling. Adding a standalone CRM before the production tool
is chosen guarantees a second place where a school's status is recorded, and status
disagreement is the documented defect. Revisit only if the chosen production tool's CRM
demonstrably cannot hold approval-stage and deposit evidence.

### 2.7 Automation and integration

Never evaluated in this repository before now.

| Product | Published price (accessed 2026-09-17) |
|---|---|
| **Zapier** | Free $0 (100 tasks/mo, two-step Zaps only, no premium apps). **Professional** from $19.99/mo annual ($29.99 monthly) at 750 tasks, scaling by task tier. **Team** from $69/mo annual ($103.50 monthly), up to 25 users. Enterprise custom. States annual billing is 33% off monthly. [zapier.com/pricing](https://zapier.com/pricing) |
| **Make** | Free $0 (up to 1,000 credits/mo). **Core** $12/mo, **Pro** $21/mo, **Teams** $38/mo — all quoted at the 10,000-credit tier; price scales with volume. Annual "save 15% or more". Enterprise custom. [make.com/pricing](https://www.make.com/en/pricing) |
| **n8n** | **Starter** €20/mo annual (2,500 executions/mo). **Pro** €50/mo annual (10,000). **Business** €667/mo annual (40,000). Enterprise custom. **Community Edition free, self-hosted, FairCode licence.** Startup plan 50% off Business for under-20-employee companies. [n8n.io/pricing](https://n8n.io/pricing/) |

**Recommendation: buy none of these yet, and that is a firm no.** Strategy 07's rule already
governs it — *"Scheduling comes after a successful manual run and a clear need for
repetition."* There is currently no second system to integrate *with*: the production layer
does not exist. Automation bought now would wire a collection tool to a Word file, i.e.
automate the defect. Revisit after a production tool has been live for one full trip cycle.
When that day comes, n8n's free self-hosted Community Edition is the cheapest way to find out
whether the integration is worth paying for — **Inference**, based on its published $0 cost,
not on any tested fit.

### 2.8 E-signature and documents

DocuSign is the incumbent and is evidenced in the source inventory: source `I04` is a
completed DocuSign certificate for the March 3 Stern Auditorium / Perelman Stage agreement
([BUSINESS-CONTEXT.md](../carnegie-hall/BUSINESS-CONTEXT.md)). The plan and spend are
unverified.

Published DocuSign eSignature pricing, accessed 2026-09-17
([ecom.docusign.com](https://ecom.docusign.com/plans-and-pricing/esignature)):
**Personal** $11/mo (annual, billed monthly; 5 envelopes/month, single user);
**Standard** $30/user/mo (100 envelopes/user/year, ≤50 users);
**Business Pro** $45/user/mo (100 envelopes/user/year, ≤50 users); Enhanced custom.

**Recommendation: keep DocuSign, and do not spend evaluation effort here.** The March 3
agreement was executed through it, and
[BUSINESS-CONTEXT.md](../carnegie-hall/BUSINESS-CONTEXT.md) records the photographed licence
page stating a **$26,460 venue fee due on signing, with other charges separate** (source
`I06`) — with the caveat, recorded there, that the complete executed agreement is not in
evidence and no payment is established. **Inference:** the whole annual spend here is bounded
by roughly $360/user/year at Standard, so the largest possible saving from switching is small
against a tool that holds the certificate for the operator's single largest recorded
commitment. If a review is ever wanted, the deciding question is envelope volume against the
100/user/year allowance, not seat price.

---

## 3. Costed shortlist

All figures USD unless marked. Prices as published and accessed 2026-09-17. Setup fees are
one-time and shown separately because they are **not recoverable on exit**.

### 3.1 The incumbent stack, priced honestly

| Line | Annual | Confidence |
|---|---|---|
| GroupCollect | **Unknown.** $0/mo membership + 4% or 1% of transaction volume. Operator-reported ~$60/mo ⇒ ~$720/yr | **Low** — does not match a published tier; see §2.2 |
| DocuSign | **Unknown plan.** $132/yr (Personal) to $540/user/yr (Business Pro) | **Low** — plan unverified |
| Zoho | **Unknown edition and spend.** Employee-reported "pays Zoho to find clients"; account never inspected | **Low** — see the [assessment handoff](../carnegie-hall/ZOHO-RESEARCH-PROMPT.md) |
| Production layer | **$0 software.** 100% labour | **High** — `Itinerary: None added`, `Template used: None added` |

**The most important number in this document is one nobody has.** Three of four incumbent
lines are unverified, and the fourth is zero. Before any purchase, read the actual card
statement for these three vendors. That is an afternoon, it is free, and every comparison
below is built on sand until it is done.

### 3.2 Candidate configurations

Each row is *added to* the incumbent stack, which is retained in all of them — **except H**.
Voyita spans collection *and* production (§2.5), so it would **replace** GroupCollect rather
than sit beside it. Its Δ*C* is therefore not like-for-like with B–G, and if it wins the demo
round, §4.1's "keep GroupCollect" is superseded for that path. That is a second reason its
missing price matters.

| # | Configuration | Year 1 added cost | Steady-state added cost (Δ*C*) | Closes the gap? |
|---|---|---|---|---|
| **A** | **Do nothing** | $0 | $0 | No. Baseline. |
| **B** | + **Tourwriter Starter** (1 user) | $1,188 + $1,199 setup = **$2,387** | **$1,188** | **Probably** — supplier/rates management and automatic pricing are named, but occupancy-tiered pricing is **unverified** (§2.3). Also conditional on the 25-itinerary/year cap and "first 3 years" qualification — **both are open questions** |
| **C** | + **Tourwriter Pro** (2 users) | $3,576 + $1,199 setup = **$4,775** | **$3,576** | **Probably**, same unverified occupancy tiering as B; 50 itineraries/user/year removes the capacity risk |
| **D** | + **Ezus Professional** (1 user) | €900 + €1,990 onboarding = **€2,890** | **€900** | **Probably**, on the published feature list; occupancy tiering **unverified**. **EUR-billed; FX and any cross-border card cost are unrecorded** |
| **E** | + **moonstride Pro** (5 users incl.) | $7,740 + $1,950 setup = **$9,690** | **$7,740** | **Probably** — contract loading is the most specific supplier-terms claim found, but pax-range pricing is a Group-tier feature, not Pro. Priced for a larger operator |
| **F** | + **moonstride Group** (pax-range pricing) | $11,700 + $5,460 setup = **$17,160** | **$11,700** | **Most likely of any config** — the only one naming headcount-tiered pricing outright. Fails the §3.3 anchor at every assumption pair |
| **G** | + **Travefy Core** | **$468** | **$468** | **No.** At Core tier: itinerary/proposal builder and commission tracking, but supplier management is **Agency-tier only and unpriced**, and no supplier terms or margin engine are specified. Listed as the cheap-looking option that does not solve the problem |
| **H** | + **Voyita** | **Unquotable** | **Unquotable** | Closest functional match; **no published price** |
| **I** | **Build** (extend `pipeline/trip/`) | $0 licence + developer time | $0 licence + maintenance time | See §4 |

### 3.3 The break-even, stated as arithmetic

The labour number is the hinge and **it is currently unmeasured**. So here is the arithmetic
rather than a fabricated answer. Let:

- **N** = hours one redraft round costs
- **M** = redraft rounds per season
- **R** = loaded hourly cost of the person doing them ($/hr)
- **f** = fraction of that redraft labour the tool actually displaces (0 < *f* ≤ 1)
- **Δ*C*** = annual software cost added over the incumbent stack (§3.2)

> **This pays for itself if a redraft round costs more than *N* hours at *M* rounds per
> season, such that:**
>
> **Δ*C*  <  *f* × *N* × *M* × *R*** — equivalently — **N × M  >  Δ*C* ⁄ ( *f* × *R* )**

The right-hand side is *break-even redraft hours per season*. Fill in your own N and M.

**Both *f* and *R* are invented here, and neither is grounded.** Say so plainly:

- **f = 0.2 and f = 0.4** bracket the table below. The range is *borrowed* from the
  **20–40% preparation-time estimate** that [AGENTS.md](../../AGENTS.md) records as an
  *untested planning hypothesis* — but that hypothesis is about **a different quantity**: the
  hands-on time this repository's own document generation might save on selected recurring
  tasks. It is not a measurement of what a purchased third-party tool displaces from a
  redraft round. It is used here only as an order-of-magnitude bracket and **inherits no
  provenance from the original estimate.**
- **R = $40 and $75/hr** are illustrative loaded hourly rates. **No Troen labour rate appears
  anywhere in this repository.** R multiplies every cell, so a true R of $25 or $120 moves the
  whole table by a factor of roughly 1.6 to 3.

Three of the five inputs (*N*, *M*, *R*) are therefore unknown and the fourth (*f*) is
borrowed. Only Δ*C* is sourced. **Treat the table as a shape, not an answer.**

**Break-even redraft hours per season** — Δ*C* ⁄ (*f* × *R*), rounded:

| Configuration | Δ*C* | f=0.2, R=$40 | f=0.4, R=$40 | f=0.2, R=$75 | f=0.4, R=$75 |
|---|---|---|---|---|---|
| **G** Travefy Core | $468 | 59 h | 29 h | 31 h | 16 h |
| **B** Tourwriter Starter (steady) | $1,188 | 149 h | 74 h | 79 h | 40 h |
| **B** Tourwriter Starter (year 1) | $2,387 | 298 h | 149 h | 159 h | 80 h |
| **D** Ezus Professional (steady) | €900 | 113 h | 56 h | 60 h | 30 h |
| **C** Tourwriter Pro 2u (steady) | $3,576 | 447 h | 224 h | 238 h | 119 h |
| **E** moonstride Pro (steady) | $7,740 | 968 h | 484 h | 516 h | 258 h |
| **F** moonstride Group (steady) | $11,700 | 1,463 h | 731 h | 780 h | 390 h |

**How to read it.** If total redraft labour across the season exceeds the cell, the
configuration pays for itself at those assumptions. Note that D is quoted in EUR against a
USD hourly rate; it is not directly comparable to the USD rows until an FX figure is recorded.

**An illustrative sanity anchor — N and M are invented here and must be replaced.** Suppose a
redraft round on one trip costs 4 hours (re-checking 27 itinerary lines, 13 suppliers and 12
price cells by hand) and each trip goes through 3 rounds: 12 hours per trip. The repository's
source inventory shows multiple 2027 trips across several schools and destinations (source
`I08`), and the March 3 event carries a provisional target of one participating group plus
ten more. At 15 trips a season that is **180 hours**. Against the table above, 180 hours:

| Configuration | Clears at |
|---|---|
| **G** Travefy Core | all four assumption pairs |
| **D** Ezus Professional | all four |
| **B** Tourwriter Starter, steady state | all four |
| **B** Tourwriter Starter, year 1 | three of four (fails only f=0.2, R=$40) |
| **C** Tourwriter Pro, 2 users | **one of four** (only f=0.4, R=$75) |
| **E** moonstride Pro | **none** |
| **F** moonstride Group | **none** |

That is the useful shape: on plausible-but-invented numbers the cheap production tools are
justified comfortably, the two-seat tier is marginal, and **moonstride is not justified at any
point in the assumption range** — its price would have to be defended by a capability the
others lack, not by labour displacement. **This is arithmetic on invented inputs. It is not a
finding.** Its only job is to show that the decision turns on numbers the owner can produce in
a week by timing two redrafts.

**Measure before you buy.** The cheapest next action in this entire document is to time the
next two redraft rounds with a stopwatch and count the rounds on the last three trips. That
produces N and M, costs nothing, and converts this table from a framework into an answer.

---

## 4. Build versus buy

### 4.1 Recommendation

**Buy the production layer. Do not build it. Build only the trip record.**

Specifically:

1. **Keep GroupCollect** for collection. It does its job. Verify the actual platform-fee tier
   and monthly volume (§2.2) so the incumbent cost line stops being a guess.
2. **Buy one production tool, chosen by demo, not by this document.** Four candidates go into
   one demo round, scored on §5:

   | Candidate | Why it is in the round | The specific risk to settle |
   |---|---|---|
   | **Tourwriter Starter** (config B, $1,188/yr + $1,199 setup) | Cheapest configuration that plausibly closes the gap; clears the §3.3 anchor at every assumption pair | **Eligibility and capacity.** Starter is stated as "For businesses in first 3 years" and capped at **25 itineraries/year**. Troen is an established operator, and the anchor's own 15 trips/season leaves only 10 itineraries of headroom. **If Starter is unavailable or too small, the real cost is config C at $3,576/yr**, which clears only one of four assumption pairs — a materially different decision |
   | **Ezus Professional** (config D, €900/yr + €1,990 onboarding) | Named supplier catalogue and document automation; clears the anchor at every pair | €1,990 is unrecoverable, and export by API needs the €100 tier (§6) |
   | **Voyita** (config H) | The only product found naming school trips *and* versioned quotes *and* per-accommodation-type pricing | **Has no published price**, and would *replace* GroupCollect rather than join it (§3.2) |
   | **moonstride Group** (config F, $11,700/yr + $5,460 setup) | **Included deliberately despite failing the break-even at every assumption pair.** It is the only product that names the weighted capability — "Pax-Range Pricing calculator" — so it is the round's **reference answer to question 9**: use it to see what a passing answer looks like | Price. It has to be justified by a capability the others genuinely lack, not by labour |

   **The decision rule, stated in advance so the demo cannot be argued afterwards:** if
   Tourwriter, Ezus or Voyita passes questions 2, 4, 9 and 10, buy the cheapest one that does.
   If **only moonstride** passes them, the choice becomes a real tradeoff between roughly
   $1,188 and $11,700 a year — and it is then, and only then, that the measured N and M decide
   it. Note honestly that Tourwriter is *not* the fit leader on the evidence in §2.3: its
   occupancy-tiered pricing is **unverified and not named on any page read**. It leads on
   price and on the smallest reversible commitment. Those are different reasons.
3. **Do not buy** presentation, CRM, or automation in this round (§2.4, §2.6, §2.7).
4. **Keep DocuSign** (§2.8).
5. **Keep the trip record** in this repository as the source of truth (§4.3).

### 4.2 The honest case against building

This matters more than the recommendation, because the person reading it can build, and that
is exactly the condition under which building gets chosen for bad reasons.

- **The prototype is thin on purpose, and the remaining 90% is the boring 90%.**
  `pipeline/trip/` is a schema, a loader, a CLI and one trip record, zero dependencies. A
  system the business runs on additionally needs multi-user concurrent editing, authentication,
  an audit trail, client-acceptable PDF and Word output, payment reconciliation, backups,
  restore-tested backups, and someone reachable when it breaks in March. None of that is
  interesting and all of it is required.
- **Bus factor one.** A solo-built system means the business's trip production depends on one
  person remaining available and willing. A vendor at $1,188/year is also an insurance policy
  against that, and the business would be buying it from someone who has an incentive to
  point this out and does not. Say it plainly.
- **The failure mode of building is the failure mode already observed.** The proposal document
  became the database and drifted until two printings disagreed on eleven of twelve price cells
  and on the venue itself. A
  bespoke internal tool is a candidate to become the next such artefact — with the added
  property that nobody else can read its format.
- **Opportunity cost.** Hours spent reimplementing an occupancy-pricing grid are hours not
  spent on the March 3 event, where one group is reported participating and **ten additional
  ensembles is a provisional target requiring capacity confirmation — not a verified inventory
  of ten slots** ([BUSINESS-CONTEXT.md](../carnegie-hall/BUSINESS-CONTEXT.md)). The marginal
  return on a sales hour there is a booked trip; on a build hour it is a feature six vendors
  already sell.
- **A commodity is being rebuilt.** Six vendors sell this. When six vendors sell something,
  the build case needs a requirement none of them meets — and §5 is precisely the test for
  whether such a requirement exists. **If all four demo candidates fail questions 2, 4 and 10
  in §5 — the three that no vendor page examined even advertises — the build case reopens on
  evidence.** Not before, and even then it reopens for those three concepts only, not for a
  whole itinerary-and-costing system.

### 4.3 What to build anyway, and why it is not a contradiction

Build the **record**, not the **product**.

The trip record in [`pipeline/trip/`](../../pipeline/trip/README.md) already holds things no
vendor page read on 2026-09-17 mentions, and they are the two that caused the actual damage:

- **`COMP_KINDS`** in [`schema.cjs`](../../pipeline/trip/schema.cjs) separates
  `vendor_earned` (a supplier's own ratio, *reduces* cost) from `trip_granted` (free places
  the operator gives the group, *carried by* the paying travellers). These move the price in
  **opposite directions** and were both written in pen as bare numbers. No vendor examined
  advertises holding them separately.
- **`LINE_STATES`** gives each line a `client_word`, so a `sourcing` line prints "venue being
  finalised" instead of a named venue the client reads as booked. One slot in the real trip is
  exactly that case. No vendor examined advertises a per-line client-facing truth word.

That record has three jobs, and none of them is "be the product":

1. **It is the evaluation rubric.** §5 is derived from it. Without it, a demo is a slideshow.
2. **It is the migration asset.** Whatever is bought, the record is what gets loaded in — and
   what can be loaded into the *next* tool. It bounds the exit cost of every configuration in
   §3.2.
3. **It is the diff that no incumbent tool provides today.** Two versions of one trip can be
   compared now, which is the defect that started this.

Keeping it costs a schema file and a loader. It is cheap, portable, and it is the reason the
business can leave a vendor. **Treat the purchased tool as a renderer over a record you own.**

---

## 5. Evaluation rubric — 15 questions for any vendor demo

Derived from the real defects in §1.2, not from a feature checklist. Put these to all four
candidates in §4.1 — **Tourwriter, Ezus, Voyita and moonstride** — in the same round, with the
same trip, and **make them do it on screen**.
Following strategy 07's protocol: record the raw result before any human correction, and
count failed attempts and manual fixes. A "yes, with configuration" is a **no** until shown.

| # | Question | Why — the defect behind it | Pass looks like |
|---|---|---|---|
| 1 | Can a supplier record hold a **comp policy as a ratio** — "one free per ten paid, plus the driver" — and does the quote recompute it when headcount moves 80 → 100? | 1 of 13 suppliers has a comp policy recorded; it lives in pen | Change headcount live; the comp count and the price both move |
| 2 | Can vendor-earned comps and trip-granted comps be held as **two separate quantities moving the price in opposite directions**? | Both were bare pen numbers; conflating them mis-prices every tier | Two fields. **If the demo enters one "comps" number, that is a fail** |
| 3 | Can a supplier hold a **final-headcount deadline in business days before travel**, and does it surface as a dated task without anyone re-reading the contract? | 1 of 13 suppliers has this; the rest are invisible until missed | A dated list appears without being asked for |
| 4 | Can a line be marked **"sourcing"** so the client document prints "being finalised" rather than a named venue that implies a booking? | One slot is printed and priced as a named venue while five alternatives were being called | A per-line status that changes the client-facing wording, not an internal-only flag |
| 5 | Can the system **refuse to issue a quote** while a cost line has no supplier attached? | The incumbent quote screen reads `No supplier` on **all five** cost lines | A blocking validation, not a warning |
| 6 | Can **two versions of one trip be diffed** — itinerary lines, inclusions, exclusions and all twelve price cells — and does the diff print? | Two printings disagreed on venue, vendor name, checkout order, exclusions and 11 of 12 price cells | A readable change list between versions |
| 7 | Does **changing one date produce a call list** of every supplier whose terms are affected, with channel and last-attempt date? | A date change currently means remembering who to ring | A generated list, ordered, with channels |
| 8 | Is there an **attempt log per supplier** — date, channel, direction, outcome? | The same supplier received a web form *and* a voicemail the same day, with nowhere to record the first | Per-supplier history, visible before the next attempt |
| 9 | Is the **occupancy × headcount price table computed output** (quad/triple/double/single × 80/90/100), or twelve hand-typed numbers? | 11 of 12 cells changed between printings, up and down, with no recorded reason | Change one input; watch twelve cells move coherently |
| 10 | Does a **per-group fee behave differently from a per-person fee** when headcount changes? Ask them to change headcount live. | A $50 guide fee and a $5 admission behave completely differently; the record carries `COST_BASIS` for this reason | The $50 stays flat; the $5 scales. Watch it happen |
| 11 | Can a **blended cost line be decomposed** — "Attractions, $183.00" into its components, each with a supplier attached? | That exact line exists with `supplier_id: null`; its parts "cannot be recovered from the blend" | Line-item components, each attributable |
| 12 | Does it warn when an **inclusion is sold to the client but no supplier line covers it**? | 15 inclusions are promised; 8 of 13 suppliers carry no terms at all | A coverage check between what was promised and what was sourced |
| 13 | Where does a **handwritten margin note** go? Is the *kind* of evidence recorded — supplier email vs. pen on a page? | Two days of vendor work lived only in ballpoint on a page that gets reprinted | A source field with an evidence kind, not a free-text box |
| 14 | Can the client document be produced in the **format the school's business office accepts** — PDF plus an editable form — in the operator's own layout? | Schools and districts have their own paperwork requirements | Both formats, from the record, without retyping |
| 15 | **Export:** can every trip, supplier, term and price table be extracted as CSV or JSON **by us, without a support ticket**, and what happens 30 days after cancellation? | The whole point of §6 | A self-service export, demonstrated live, before signing |

**Scoring.** Questions **2, 4, 9 and 10** are the ones the current stack fails outright. Weight
them. A product that passes 11 of 15 but fails those four has not solved this business's
problem.

Of those four, **only question 9 is advertised by any vendor examined** — moonstride's
"Pax-Range Pricing calculator" on the Group tier. **No page read on 2026-09-17 advertises
questions 2, 4 or 10 at all**, which is why they must be demonstrated rather than asked about,
and why the §4.3 build case is confined to exactly those concepts. If every candidate fails
2, 4 and 10, that is the evidence that reopens the build question (§4.2) — and it is also the
argument for keeping the trip record regardless of which tool is bought.

---

## 6. Migration risk and exit — can data leave cleanly?

| Product | Entry cost that is lost on exit | Data-out position (as published, 2026-09-17) | Real lock-in |
|---|---|---|---|
| **GroupCollect** (incumbent) | $0 membership | **Not published.** Export capability unverified | **Not the data — the calendar.** Registrations and payment plans are mid-flight for live trips. The switching window is between seasons, not whenever. Percentage-of-volume pricing also means cost scales with success, so the exit case strengthens as the business grows |
| **Tourwriter** | **$1,199+ setup**, sold as migration/setup/training | **Not published on the pricing page.** Accounting export to QuickBooks/MYOB (Pro) and real-time Xero (Premium) means financial data also lands outside the tool | Migration is a paid service on *entry*, which is a signal about entry friction. **Ask question 15 before signing.** Itinerary caps (25/yr Starter, 50/user/yr Pro) are a second, quieter lock: exceeding them forces a tier move, not a renegotiation |
| **Ezus** | **€1,990 mandatory onboarding**, ex-tax, non-recoverable | **Public API is Premium-tier only** (€100/user/mo). Professional (€75) does not list API access | **The sharpest lock-in found.** Programmatic export requires paying a third more per seat. A business on Professional that wants its data out may have to upgrade to leave. Price the exit at Premium rates, not Professional |
| **moonstride** | **$1,950 (Pro) to $5,460 (Group)** setup | Not published | Contract limit 150, expandable to 250 — a **capacity cliff**, not just a price. Growth triggers a commercial conversation from a weak position |
| **Travefy / Axus** | None published | Not published | Low commitment, low cost — and low relevance, since neither closes the gap |
| **Voyita** | Unknown | Unknown | **Unquotable, therefore unassessable.** Treat "price on request" as a risk line, not a blank |
| **Zoho** | Already incurred | Covered in the [existing assessment](../carnegie-hall/ZOHO-RESEARCH-PROMPT.md); that document notes its export and retention claims were **not all independently revalidated** | Recheck applicable terms and a representative export before any account action |
| **DocuSign** | Already incurred | Completed envelopes and certificates are the evidentiary artefact (source `I04`) | Executed agreements. Do not move without cause |

### 6.1 The mitigation, and it is the whole reason §4.3 exists

**Keep the trip record as the source of truth and treat the purchased tool as a renderer over
it.** Then the exit cost of any configuration in §3.2 is bounded by the setup fee, which is
known in advance, rather than by the cost of reconstructing every supplier's terms from
printed pages and pen — which is what an exit costs today.

Concretely, before signing anything:

1. **Run question 15 live in the demo.** Export a real trip. Open the file. If it will not
   come out in the demo, it will not come out at renewal.
2. **Load one real trip into the trial** — the Chattanooga record is already transcribed and
   has 27 slots, 13 suppliers, 15 inclusions and 12 price cells, including the awkward parts.
   Do not evaluate on a clean sample trip the vendor supplies.
3. **Re-export it and diff against what went in.** Whatever the round trip loses is what the
   tool does not actually model. That diff is the most honest capability test available, it
   costs one afternoon, and no vendor page can substitute for it.

---

## 7. What this document does not settle

- **The incumbent cost line.** GroupCollect's tier, DocuSign's plan, and Zoho's edition and
  spend are all unverified. §3.1 is a shape, not a number. Read the statements.
- **N, M, R and f.** The redraft hours, the rounds per season, the loaded hourly rate and the
  displacement fraction are all unmeasured or borrowed (§3.3). Only Δ*C* is sourced, so §3.3 is
  a framework and not a verdict. Time two redrafts and write down an hourly rate.
- **Whether Tourwriter Starter is even available to Troen.** It is stated as "For businesses
  in first 3 years" and capped at 25 itineraries/year. If Troen does not qualify or exceeds the
  cap, the real configuration is C at $3,576/yr — which clears only one of four assumption
  pairs in §3.3. **This single unanswered question moves the recommendation.** Ask it in the
  first five minutes of the Tourwriter demo.
- **Retrievability, keeping "blocked" and "unpublished" separate** as the project guardrail
  requires. **Blocked or unreachable on 2026-09-17, so no price is recorded:** WeTravel (403,
  Cloudflare), Pipedrive (403, Cloudflare), TripMapper (503), Wetu (a `/pricing-plans` link
  exists in navigation but the page did not return). **Price not published at all — demo or
  sales contact required:** mTrip, Softrip, Tourplan, Voyita, and Travefy's Agency tier.
  Neither group is estimated. Separately, Tourwriter's `/pricing/` path 404s, but this is a
  stale path and not a blocked vendor: its live pricing page is `/software-pricing-plans/`
  and **Tourwriter is fully priced** in §2.3 and §3.2.
- **Two marketing figures in the brief did not survive checking**: Tourwriter's "~70% faster"
  sentence and Ezus's "~80% faster" claim were not reproducible on the pages fetched. The
  verified equivalents are in §1.3. Neither is measured evidence about Troen in any case.
- **Whether any product passes questions 2, 4, 9 and 10** (§5). That is the actual purchase
  decision and it requires demos, not desk research. Everything above exists to make those
  demos short and adversarial.
