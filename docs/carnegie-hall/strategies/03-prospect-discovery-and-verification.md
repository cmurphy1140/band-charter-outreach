# 03 — Prospect discovery, careful scraping, and verification

[Strategy index](README.md) · [Audit](../../AUDIT-2026-09-10.md) · [Internal decisions](../INTERNAL-DECISIONS.md)

## Purpose and concrete output

Produce a small opportunity workbook whose value comes from accurate evidence and useful judgment. Proposed starting size: **six to twelve total cases** across schools, partners, and available relationship clues. This is a demonstration default, not a quota, a lead guarantee, or a fixed channel allocation.

Each strong example should answer: who is this, why might Carnegie be relevant, which current adult role matters, what evidence supports the connection, and what would be a sensible next step? Include a weak-fit or insufficient-evidence example so the product demonstrates restraint as well as discovery.

## Reuse the original project selectively

Use the existing [prospect file](../../../data/final/prospects.csv) as candidate material. Do not relabel old Tier A rankings as Carnegie rankings. The audit found incorrect contact attribution and identity/refresh problems. Read the specific code path before reusing it; reviewed manual research is an acceptable first path.

Potential reuse points are [shared fetch/caching](../../../scrapers/common.py), [enrichment](../../../scripts/enrich.py), [export](../../../scripts/export.py), and their tests. These links identify code to inspect, not certification that it already meets this strategy. Stage future Carnegie data separately so experiments cannot replace the original researched list.

## Discovery and verification sequence

1. **Choose varied cases.** Seek relevant concert programs and school-music tour businesses, with a soft regional preference based on the supplied map. Existing relationship clues can be included without waiting for a private list. Do not assume those accounts are available for outreach.
2. **Establish organization identity first.** Confirm official name, city/state, school district where applicable, and official website. Retain NCES ID and source vintage where available; record missing/not-applicable values without guessing. An NCES match supports school identity, not the ownership of a parade nickname or a staff contact. Same-name schools and renamed programs require care. A corrected state should not silently create a new record and lose reviewed information.
3. **Identify the actual ensemble.** Distinguish school, concert band, orchestra, choir, marching band, and other groups. A school's parade participation can support a travel-history observation; it does not establish that its concert ensemble is eligible or interested.
4. **Gather a specific relevance signal.** Prefer current official program pages, dated school/district announcements, public performance results, or a clearly identified travel event. Record what happened, when, and the exact claim source/page. Separate planned appearances from completed performances and distinguish competitions as an event type. Keep historical signals labeled as historical; publication date alone does not establish the event year.
5. **Verify the adult role.** Associate name, current role, contact and relevant institution/ensemble within an explicit staff record or equivalent source evidence. Record the role's school/district/partner scope and review date. Adjacency, an email domain or an NCES match is not role evidence. A choir teacher's email must not become the band director's contact. Preserve a disputed old value in the review history, leaving its active contact field unverified until resolved.
6. **Write a bounded fit explanation.** Explain the plausible connection in one or two sentences. Record date feasibility, budget, eligibility, relationship ownership, and permission as unknown unless supported. Avoid opaque numerical confidence scores that look like buying probabilities.
7. **Assign a research next step.** Examples include checking the current orchestra page, clarifying a conflicting school identity, or reviewing a partner's performance-travel offer. “Ready for research review” is different from “ready to contact.”
8. **Review and export.** Reopen the decisive sources, check attribution and dates, deduplicate institutions/ensembles, and export a readable workbook with filters and source notes.

## Workbook structure and expansion

**Implemented September 11, 2026:** the [initial workbook](<../../../demo/carnegie-hall/outputs/01a08da2-45ab-7181-a80f-a887cb079101/Troen - Carnegie Opportunity Review.xlsx>) uses two tabs: Opportunities for two school cases, one illustrative MTC candidate and editable decisions/notes, and Evidence for twelve public sources, school contacts, source periods, and review dates. MTC is an organization distinct from the schools; its NYIMF/Troen event relationship is unconfirmed. Both tables keep related fields within the same sortable row. No score, lead guarantee, or buying probability is assigned.

The structure below remains an expansion option if the batch develops distinct partner/review workflows. Do not create thin tabs merely to match this earlier outline.

| Sheet | Contents |
|---|---|
| Start here | Scope, March 3 focus, evidence labels, what the sample demonstrates |
| School opportunities | Institution, location, ensemble, relevance, verified adult role/contact if available, sources, unresolved facts, research next action |
| Partner opportunities | Public service relevance, territory, source, possible role, current relationship unknown unless supported, next action |
| Evidence | Source IDs/URLs, dates, short observations, identity checks |
| Review needed | Ambiguous identities, absent contacts, blocked sources, weak-fit cases and reasons |

Use a stable organization ID plus a separate ensemble/opportunity ID. Link a partner to an opportunity rather than duplicating a school booking under two channels. Blank, unknown, unverified, and not applicable should have defined meanings. Never populate permission or interest automatically from a published email.

## The scraping line to walk

Reuse [SerpAPI](../../../scrapers/serpapi.py) for discovery. The completed partner
pilot began with the already cached `student music performance tours Carnegie Hall`
query in `data/raw/serpapi-validation/` on the original Mac. Its MTC example reused
reviewed sources without another discovery pass. A fresh
checkout does not contain that ignored cache. Search snippets are discovery clues;
open the underlying permitted source before accepting an identity, role or event
claim. Record the query, retrieval date and source chosen; do not repeat paid
searches merely to prove the configured client still works.

Automate repetitive reading only where sources permit it. Preserve the project limits of one request per second per host and at most twenty pages per school. Cache source material and record freshness; a cache hit is not a fresh verification. Respect robots rules, redirect destinations, access restrictions, and block signals. Do not bypass a login, CAPTCHA, rate limit, or disallowed directory to complete a sample.

If access fails, record the obstacle and choose another permitted source or a reviewed manual research path. A browser is useful for inspecting public pages; it is not a mechanism to evade restrictions. The [Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html) is relevant to crawler behavior, not a grant of permission to repurpose data.

Do not scrape inboxes, private CRM records, member directories, or paid contact databases. Keep personal student information outside the prospect model. The local research output is not automatically importable into Zoho marketing or email-enabled tools; consult the [Zoho handoff](../ZOHO-RESEARCH-PROMPT.md) at that later step.

### Failure preservation and cache freshness

These are planned repairs for reused automated paths. Current legacy writes and
cache reuse do not yet meet them. Define completeness for each source/year or
selected URL set before a run: `complete`, `incomplete`, `blocked`, and
`confirmed-empty` are distinct outcomes. Zero parsed records or an HTTP 200 alone
cannot establish a valid empty result. Retain last-known-good records and reviewed
corrections for failed/incomplete partitions; publish only validated complete
replacements and explicitly report what was retained. Stage downloads and data
before replacement so interrupted files cannot become a valid cache.
A confirmed-empty partition is eligible only when its expected scope was checked
and zero records is supported by the source; an empty parser result is insufficient.

Use separate policies for (a) historical evidence snapshots, retained unchanged;
(b) discovery indexes/current and next event-year pages, revalidated on an
explicit refresh; and (c) current contacts/offers, reviewed again when their use
requires current information. Record `fetched_at`, last review, source outcome,
and the policy/max age selected before each run. A recent local retrieval can
still contain an old vendor-cached page; retain vendor freshness metadata when
available. No universal time-to-live is implemented or chosen here. A failed
refresh may retain visibly stale evidence, but must not mark it newly verified.

### PDF and rendered-page gaps

For a useful public PDF, try the existing local text extractor first; inspect the
rendered pages when tables, columns, images or scans obscure meaning. Use OCR only
when needed and verify names, dates, roles and table alignment against the page.
Keep the original bytes/hash, page references, extraction method and uncertain
fields. For a permitted JavaScript page, inspect the rendered result and retain
its source context; a rendered page is not proof of source completeness.

The [bounded tool evaluation](07-software-and-automation-fit.md#bounded-extraction-tool-evaluation)
compares Firecrawl with this baseline before adoption. Zyte or Apify enters only
for a recorded remaining gap. Tool errors, restricted pages and missing evidence
stay visible; switching providers is not a way around a source restriction. The
current request plans this work without starting extraction trials or a crawl.

## Verification and failure cases

Test or manually exercise the paths actually used: two same-name schools; a corrected state; a staff page with several roles; an obsolete director page; a failed fetch; a stale cache; one school surfaced through a partner and directly; and a spreadsheet value that could be interpreted as a formula. Preserve prior reviewed evidence when a refresh fails and treat exported text as text.

For a manual POC, record the review results without pretending the entire automated pipeline has been repaired. For a code change, add meaningful regression checks for the relevant defects and run the appropriate existing suite. Do not write tests merely to mirror a Markdown table.

## Handoff and completion

**First implementation checkpoint — September 10, 2026:** one [Wando research note](<../../../demo/carnegie-hall/exports/Troen - Wando Research Note.md>) now supports the connected example. Wando came from the original candidate list; official school/program pages and the Midwest Clinic archive were reviewed afresh. The old parade score and contacts were not reused as Carnegie facts. This is one reviewed case, not the complete small-batch workbook.

The archive exposed a useful date trap: its site banner promotes 2026 while Wando’s performance detail says December 19, 2019. Record the event-level date separately from the page’s current banner and the date checked. The published director role is explicit; it does not establish deliverability or permission to send. Missing-contact behavior is covered in both HTML and portable-note tests.

**Second checkpoint — September 11:** [Salem's reviewed note](<../../../demo/carnegie-hall/exports/Troen - Salem Research Note.md>) separates the City of Salem school from the Virginia Beach SunDevils. The original row had no city/contact and flagged two candidates. School/program identity, concert ensembles, and the explicit adult role support a separate Carnegie research record. The program's Philadelphia reference is undated; the legacy 2022 label was not promoted to a verified performance date. No original prospect row was rewritten.

This began as a possible insufficient-evidence example, but primary sources resolved useful questions. Let evidence change the conclusion. Do not label a school weak merely to create contrast. A deliberately insufficient-evidence case remains optional. The checks reject duplicate identities/opportunities and cross-record source references, protect spreadsheet text from formula interpretation, and preserve manually edited workbook files. These checks validate the reviewed-data path, not the legacy enrichment system.

**Third checkpoint — September 11:** MTC is a small illustrative research candidate
in the workbook and demo, using three previously reviewed sources. Its identity,
NYC service description and planned March 3 listing demonstrate useful research
without establishing the NYIMF/Troen match, a relationship or interest. The user
explicitly excludes an outreach strategy or recommendation to contact MTC.
The internal partner sheet stays separate. No business answers, contact record,
new discovery pass or larger batch were needed for this example.

Send the reviewed cases to [design](04-poc-experience-and-design.md) and [materials](05-director-and-partner-materials.md). Keep any illustrative workflow states in separate scenario records. Completion means a small batch with defensible identities, useful explanations, and clear limits—not maximum contact coverage.

Relationship ownership and suppression checks are necessary before a real approach, not before public research or an internal demonstration. No messages, CRM imports, broad crawl, or scheduled refresh are implied by this strategy.
