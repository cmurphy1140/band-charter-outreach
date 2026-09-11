# Partner pilot sources — Music Travel Consultants

Task `claude-partner-research` · [Profile](PROFILE.md) · [Partner sheet draft](PARTNER-SHEET-DRAFT.md) · [Handoff](../../coordination/claude-partner-research-handoff.md)

Retrieval and review date: **September 11, 2026** (fetched 05:34–05:35 UTC with plain
HTTP requests, one request per host at a time, no paid API). Pages were saved only
in the session scratchpad; the SHA-256 of each saved response is recorded so a later
re-fetch can be compared. Search snippets are discovery clues, not claims.

## Source register

| ID | Exact URL | Retrieved | Status / locator | Used for |
|---|---|---|---|---|
| SERP-01 | `data/raw/serpapi-validation/a2281fc6877577d586a2cfe66de5f5c4d21f9fa7.json` (+ `.meta.json`) | Cache `fetched_at` 2026-09-11T04:39:20Z; reviewed 2026-09-11 | Supplied Google query `student music performance tours Carnegie Hall`, 9 organic results; SHA-256 verified against the assignment | Candidate discovery only |
| MTC-01 | https://www.musictravel.com/new-york-city/new-york-city-performance-trips.html | 2026-09-11 05:34 UTC, HTTP 200 | Page body: "New York City offers unparalleled student performance opportunities…" paragraph; "Since 1987…" company paragraph; testimonials block; footer "Copyright 2026". SHA-256 `1016984c…a065b251` | NYC/Carnegie service relevance, company self-description |
| MTC-02 | https://www.musictravel.com/about.html | 2026-09-11 05:35 UTC, HTTP 200 | "Music Travel Consultants is a Tour Operator…" paragraph; company timeline entries (founding, Star Travel sale, Heart of America, Musicians Abroad, pandemic, Trip Account app). SHA-256 `9e17b2b0…22eba65f` | Identity, history, divisions |
| MTC-03 | https://www.musictravel.com/staff.html | 2026-09-11 05:35 UTC, HTTP 200 | "Meet the Team" listing, name followed by role. SHA-256 `faa75d98…74a37316` | Adult roles |
| MTC-04 | https://www.musictravel.com/contact-us.html | 2026-09-11 05:35 UTC, HTTP 200 | Address and phone block; contact form ("Simply fill out the form below."). SHA-256 `e4c1f53b…1efc37f97e` | Organizational contact |
| MTC-05 | https://www.musictravel.com/blog/2026/03/17/the-carnegie-hall-experience-2027-student-music-festivals/ | 2026-09-11 05:35 UTC, HTTP 200 | Blog post, `article:published_time` 2026-03-17T18:17:09+00:00, `article:modified_time` 2026-04-20T20:12:17+00:00; section "2027 Student Music Festivals at Carnegie Hall"; author schema "Audrey Scrogham". SHA-256 `6461fcd9…4e260d98c` | 2027 Carnegie festival calendar, March 3 / March 31 listing, competitor producers |
| MTC-06 | https://www.musictravel.com/tour-operators-responsibility-statement.html | 2026-09-11 05:35 UTC, HTTP 200 | First paragraph "MTC® acts only as Agent…". SHA-256 `9e520525…19105fbf` | Responsibility model |
| MTC-07 | https://www.musictravel.com/affiliations-sponsorships-accreditations-awards.html | 2026-09-11 05:35 UTC, HTTP 200 | Sections: Music for All / Bands of America, WGI, Heart of America, SYTA, NTA, ABA, Musicians Abroad, Educational Destinations, 2025 award. SHA-256 `fc265c4b…605dccbd9` | Partnerships, accreditation, awards |
| EPT-01 | https://www.educationalperformancetours.org/carnegie-hall-performance-tours/ | 2026-09-11 05:34 UTC, HTTP 200 | Series descriptions ("EPT and Manhattan Concert Productions…"), venue lists "in 2018". SHA-256 `7fc86634…9d08a7c` | Candidate screened out (not the selected provider) |
| FW-01 | https://fourwindstours.com/behind-the-scenes-producing-a-music-extravaganza-at-carnegie-hall/ | 2026-09-11 05:34 UTC, **HTTP 403** | Site returned a 403 page to the plain request and its `robots.txt` request; not bypassed. SHA-256 of the 403 page `ac4f7803…82cd722f` | Blocked; snippet only, no claim accepted |

Provider page count for Music Travel Consultants: **7 of the 8 allowed.** No `.env`
was read; no SerpAPI, Firecrawl, Zyte or Apify request was made.

## Supported claims

| # | Claim | Source and passage | Type |
|---|---|---|---|
| C1 | Music Travel Consultants (MTC) describes itself as a tour operator that builds customized trips for student music groups, founded in 1987 and based in Indianapolis. | MTC-02: "Music Travel Consultants is a Tour Operator, a travel company that puts together customized trips for its clients. Since 1987… Indianapolis-based…" | Public fact (self-description) |
| C2 | MTC's published office address is 5348 W. Vermont Street, Suite 200, Indianapolis, IN 46224; phones 800.616.1112 and 317.637.0837; the site offers a contact/quote form. | MTC-04 address block; same block repeats in the footer of MTC-01, MTC-02, MTC-06, MTC-07 | Public fact |
| C3 | Organizational mailboxes appear in site markup: `quote@musictravel.com` on MTC-01, 02, 03, 04, 06 and 07 (quote block); `support@musictravel.com` on MTC-05. | Page markup only, not visible contact copy; not personal addresses; publication is not permission to send. | Public fact |
| C4 | Published leadership roles include Mark Harting, President; Ryan Morris, VP & Chief Financial Officer; Michael Gray, VP of Business Development; Bryan Muñoz, Director of Music Travel Consultants; Scott McCormick, Senior Director of Musicians Abroad. | MTC-03 "Meet the Team" list (name/role pairs) | Public fact (roles as published; no individual emails published there) |
| C5 | Audrey Scrogham is listed as Marketing Specialist and is the author shown on the 2027 Carnegie festivals post. | MTC-03; MTC-05 author schema and bio ("Audrey loves combining her passions for music and marketing at MTC…") | Public fact |
| C6 | MTC's NYC performance page names Carnegie Hall, Manhattan Concert Productions, Lincoln Center, the Macy's and St. Patrick's Day parades, Essentially Ellington and the USS Intrepid as performance opportunities it arranges around. | MTC-01: "Whether it's marching in the Macy's Parade… performing at the Essentially Ellington Competition & Festival, Carnegie Hall, Manhattan Concert Productions, Lincoln Center…" | Public fact (marketing copy) |
| C7 | MTC published (March 17, 2026; modified April 20, 2026) a calendar of "2027 Student Music Festivals at Carnegie Hall" listing, among others, "New York Invitational Music Festival Carnegie Hall — Dates: March 3, 2027, and March 31, 2027 — Participants: High school bands, choirs and orchestras". | MTC-05, section "2027 Student Music Festivals at Carnegie Hall", March block | Public fact (planned event listing) |
| C8 | The same calendar lists other 2027 Carnegie producers/series: National Concerts (several choruses and a Band & Orchestra Fest), Manhattan Concert Productions (Masterwork and Symphonic Series), MidAmerica Productions Concert Series, Festival at Carnegie Hall: Instrumental Music Festival, Choirs of America Nationals, Harmony Honors Invitational. | MTC-05, February–April blocks | Public fact (planned event listing) |
| C9 | MTC states festival applications "typically open 12-18 months in advance". | MTC-05 closing paragraph | Public fact (general statement) |
| C10 | MTC's responsibility statement says it "acts only as Agent in providing means of transportation or other services". | MTC-06 first paragraph | Public fact (legal statement) |
| C11 | MTC states it is the Official Student Travel Partner of Music for All / Bands of America, WGI's Preferred Travel Partner, Heart of America's Official Travel Partner, a SYTA charter member, and an NTA and ABA member. | MTC-07 respective sections | Public fact (self-reported affiliations) |
| C12 | MTC entered a partnership with Heart of America, a competitive choir event organizer founded in 2015 that hosts events "from NYC to KC, Orlando and Nashville". | MTC-02 timeline entry; MTC-07 Heart of America section | Public fact |
| C13 | MTC runs Musicians Abroad (international state-group tours) and Educational Destinations (non-music learning tours) as divisions. | MTC-07 "A Division of…" and "Educational Division…" sections; MTC-02 timeline | Public fact |
| C14 | MTC reports a 2025 School Band & Orchestra Teachers' Choice Award for Best Travel Company. | MTC-07 awards section | Public fact (self-reported award) |
| C15 | Trip services described include a Trip Account app with daily itineraries and group chat, MTC Tour Directors travelling with groups, fundraising "Gift Link", and online sign-up/payment. | MTC-01 app/tour-director blocks; MTC-02 timeline | Public fact (service description) |
| C16 | A testimonial from a Texas director mentions taking groups to Carnegie Hall with MTC. | MTC-01 testimonials: "As director of bands at Stephen F. Austin HS, Texas, I took groups to Carnegie Hall, Midwest Clinic…" | Undated testimonial; not a verified completed performance record |

## Interpretations and uncertainties

| # | Item | Status |
|---|---|---|
| U1 | Whether "New York Invitational Music Festival Carnegie Hall" (C7) is Troen's event. The supplied budget file is named "NYIMF 2027 Budget" ([P02](../../BUSINESS-CONTEXT.md)) and the dates match Troen's March 3 and March 31 dates, but the brochure text was not machine-readable here and no page names Troen. | **Likely but unconfirmed**; confirm with the Troens before relying on it |
| U2 | Whether MTC has an existing relationship, agreement, or past groups with Troen. A calendar listing is not a relationship. | **Unknown** |
| U3 | Whether MTC has actually delivered groups to Carnegie Hall. C6 and C16 are marketing copy and an undated testimonial; no dated performance record was reviewed. | **Unverified** |
| U4 | Commercial terms with tour operators (net rates, commission, holds, exclusivity, who contracts the school). No public source. | **Unknown; never inferred** |
| U5 | MTC's service territory. Its site is national/international with Indiana and Michigan association memberships (C11, MTC-07); no territory limits are published. | Interpretation: national operator, Midwest base |
| U6 | Whether MTC produces its own Carnegie concerts. No evidence; its Carnegie offers reference third-party producers (C7, C8). Heart of America (C12) is a competitive choir event organizer in NYC and elsewhere, which can compete for the same school trip budget. | Interpretation |
| U7 | Fourwinds Tours & Travel (FW-01) organizes at least some Carnegie student concerts per the search snippet only. | Not verified; blocked source |
| U8 | Educational Performance Tours (EPT-01) sells Carnegie programs with Manhattan Concert Productions; its page cites 2018 venues, so currency is doubtful. | Screened out this pass |

## Method notes

- The organic results in SERP-01 were the only discovery input. Three candidate
  landing pages were fetched (MTC-01, EPT-01, FW-01); MTC was selected because it
  is a tour operator rather than a festival producer, has a current (2026) Carnegie
  page, and was reachable.
- MTC pages carry a very large navigation menu; prose was isolated by filtering
  out link lists before reading. Quoted passages were checked against the saved HTML.
- Carnegie Hall's own pages, The New York Pass, and Facebook results in SERP-01
  are not providers and were not fetched.
