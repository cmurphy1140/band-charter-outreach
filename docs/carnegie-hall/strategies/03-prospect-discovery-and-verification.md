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
2. **Establish organization identity first.** Confirm official name, city/state, school district where applicable, and official website. Same-name schools and renamed programs require care. A corrected state should not silently create a new record and lose reviewed information.
3. **Identify the actual ensemble.** Distinguish school, concert band, orchestra, choir, marching band, and other groups. A school's parade participation can support a travel-history observation; it does not establish that its concert ensemble is eligible or interested.
4. **Gather a specific relevance signal.** Prefer current official program pages, dated school/district announcements, public performance results, or a clearly identified travel event. Record what happened, when, and the exact source. Keep historical signals labeled as historical.
5. **Verify the adult role.** Associate the person with the relevant institution and ensemble using a current official source. Adjacency on a staff page is not role evidence. A choir teacher's email must not become the band director's contact. Leave uncertain names and contact fields blank.
6. **Write a bounded fit explanation.** Explain the plausible connection in one or two sentences. Record date feasibility, budget, eligibility, relationship ownership, and permission as unknown unless supported. Avoid opaque numerical confidence scores that look like buying probabilities.
7. **Assign a research next step.** Examples include checking the current orchestra page, clarifying a conflicting school identity, or reviewing a partner's performance-travel offer. “Ready for research review” is different from “ready to contact.”
8. **Review and export.** Reopen the decisive sources, check attribution and dates, deduplicate institutions/ensembles, and export a readable workbook with filters and source notes.

## Workbook structure and expansion

**Implemented September 11, 2026:** the [initial workbook](<../../../demo/carnegie-hall/outputs/01a08da2-45ab-7181-a80f-a887cb079101/Troen - Carnegie Opportunity Review.xlsx>) uses two tabs: Opportunities for the two reviewed school cases and editable decisions/notes, and Evidence for nine public sources, adult contacts, source periods, and review dates. Both tables keep related fields within the same sortable row. No score, lead guarantee, or buying probability is assigned.

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

Automate repetitive reading only where sources permit it. Preserve the project limits of one request per second per host and at most twenty pages per school. Cache source material and record freshness; a cache hit is not a fresh verification. Respect robots rules, redirect destinations, access restrictions, and block signals. Do not bypass a login, CAPTCHA, rate limit, or disallowed directory to complete a sample.

If access fails, record the obstacle and choose another permitted source or a reviewed manual research path. A browser is useful for inspecting public pages; it is not a mechanism to evade restrictions. The [Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html) is relevant to crawler behavior, not a grant of permission to repurpose data.

Do not scrape inboxes, private CRM records, member directories, or paid contact databases. Keep personal student information outside the prospect model. The local research output is not automatically importable into Zoho marketing or email-enabled tools; consult the [Zoho handoff](../ZOHO-RESEARCH-PROMPT.md) at that later step.

## Verification and failure cases

Test or manually exercise the paths actually used: two same-name schools; a corrected state; a staff page with several roles; an obsolete director page; a failed fetch; a stale cache; one school surfaced through a partner and directly; and a spreadsheet value that could be interpreted as a formula. Preserve prior reviewed evidence when a refresh fails and treat exported text as text.

For a manual POC, record the review results without pretending the entire automated pipeline has been repaired. For a code change, add meaningful regression checks for the relevant defects and run the appropriate existing suite. Do not write tests merely to mirror a Markdown table.

## Handoff and completion

**First implementation checkpoint — September 10, 2026:** one [Wando research note](<../../../demo/carnegie-hall/exports/Troen - Wando Research Note.md>) now supports the connected example. Wando came from the original candidate list; official school/program pages and the Midwest Clinic archive were reviewed afresh. The old parade score and contacts were not reused as Carnegie facts. This is one reviewed case, not the complete small-batch workbook.

The archive exposed a useful date trap: its site banner promotes 2026 while Wando’s performance detail says December 19, 2019. Record the event-level date separately from the page’s current banner and the date checked. The published director role is explicit; it does not establish deliverability or permission to send. Missing-contact behavior is covered in both HTML and portable-note tests.

**Second checkpoint — September 11:** [Salem's reviewed note](<../../../demo/carnegie-hall/exports/Troen - Salem Research Note.md>) separates the City of Salem school from the Virginia Beach SunDevils. The original row had no city/contact and flagged two candidates. School/program identity, concert ensembles, and the explicit adult role support a separate Carnegie research record. The program's Philadelphia reference is undated; the legacy 2022 label was not promoted to a verified performance date. No original prospect row was rewritten.

This began as a possible insufficient-evidence example, but primary sources resolved useful questions. Let evidence change the conclusion. Do not label a school weak merely to create contrast. The two-school sample still lacks a partner and a genuinely insufficient-evidence case; neither absence blocks inspecting the current workbook. The checks reject duplicate identities/opportunities and cross-school source references, protect spreadsheet text from formula interpretation, and preserve manually edited workbook files. These checks validate the reviewed-data path, not the legacy enrichment system.

Send the reviewed cases to [design](04-poc-experience-and-design.md) and [materials](05-director-and-partner-materials.md). Keep any illustrative workflow states in separate scenario records. Completion means a small batch with defensible identities, useful explanations, and clear limits—not maximum contact coverage.

Relationship ownership and suppression checks are necessary before a real approach, not before public research or an internal demonstration. No messages, CRM imports, broad crawl, or scheduled refresh are implied by this strategy.
