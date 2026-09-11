# Handoff — task `claude-partner-research`

**Coordinator review addendum:** the worker account below records the original
`e171954` delivery. Current source accounting and the revised internal next step
in [SOURCES.md](../research/partner-pilot/SOURCES.md) and
[PROFILE.md](../research/partner-pilot/PROFILE.md) supersede its seven-page total
and business-confirmation-first recommendation. The NYIMF/Troen match remains
explicitly unconfirmed; no Troen answers are required to accept the internal draft.
See [shared progress](../PROGRESS.md) for the integration receipt.

Worker: Claude Code (Claude Desktop, Local session on the Mac). Coordinator: the main
Codex task "Troen Prospects Pipeline". Assignment:
[2026-09-11-partner-pilot.md](2026-09-11-partner-pilot.md). Status: **ready for coordinator review**;
editing stopped after the single authorized commit.

## Acknowledgement and state

- Checkout `/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research`,
  branch `feature/claude-partner-research`, `CLAUDE.md -> AGENTS.md` verified.
- Base commit: `39171e5fe873bca7fca3f05723a8fca9985f081b`. Git status was clean before work.
- Final commit: reported in the completion message (a file cannot contain its own hash).
- Ownership respected: only the four assigned files were created. No shared plan,
  strategy, ledger, test, demo, data or logistics file was edited. Codex-owned
  `scripts/run_all.py` and `tests/test_run_all.py` were not touched or relied on.
- Preflight note: the first Claude session opened from the Desktop guide ran in a
  remote cloud container and reported MISMATCH; this Local session matched and did the work.

## Result

Provider selected: **Music Travel Consultants** (Indianapolis student music tour operator).

| File | Content |
|---|---|
| [PROFILE.md](../research/partner-pilot/PROFILE.md) | Identity, services/territory, March 3 relevance, fit, conflicts, unknowns, next action |
| [SOURCES.md](../research/partner-pilot/SOURCES.md) | 10 source IDs with URLs, retrieval times, locators and response hashes; 16 claims; 8 uncertainties |
| [PARTNER-SHEET-DRAFT.md](../research/partner-pilot/PARTNER-SHEET-DRAFT.md) | Partner-facing draft labeled "Internal discussion draft — unapproved and not sent"; March 3 facts only; proposed responsibilities |
| `docs/carnegie-hall/coordination/claude-partner-research-handoff.md` | This note |

Key finding: MTC's public blog post of March 17, 2026 lists "New York Invitational
Music Festival Carnegie Hall — March 3, 2027 and March 31, 2027 — High school bands,
choirs and orchestras" among its 2027 Carnegie festivals. Troen's supplied budget file
is titled "NYIMF 2027 Budget", so the listing is **likely Troen's event but unconfirmed**.
No relationship, interest or terms were inferred.

## Sources, limits and spend

- Inputs: the two supplied cache files (hashes verified against the assignment) and
  seven MTC pages fetched with plain HTTP, throttled, on September 11, 2026.
  Two other candidates were looked at once each: Educational Performance Tours
  (reachable, stale 2018 content, screened out) and Fourwinds Tours (HTTP 403 for
  page and robots.txt; not bypassed, no claim accepted).
- Paid API spend: **zero**. No SerpAPI, Firecrawl, Zyte, Apify, trial, signup, CRM
  import, quote request, outbound message, live refresh, server or background task.
  `.env` was not read.
- Limitations: page copies live only in the session scratchpad (hashes recorded);
  the supplied brochure PDF could not be text-extracted locally (no `pdftotext`), so
  the festival-name match rests on the budget filename and matching dates; no dated
  completed MTC Carnegie performance was verified; no MTC staff emails are published
  on the pages reviewed, so none are recorded.

## Checks performed

- `git diff --check` on the staged change: clean.
- Every relative link in the four files resolved to an existing file (checked by script).
- Claims C1–C16 re-read against the saved HTML; quoted passages match.
- Partner draft contains no March 31 terms, no internal cost, price, capacity,
  commission, or booking statement; uses employee-reported attribution and the
  logistics and software developer role.
- `git status --porcelain --untracked-files=all` showed only the four owned paths
  before the commit.
- No application rebuild or test run: Markdown-only change, nothing executable touched.

## Reusable lesson (with limits)

A national tour operator's public festival calendar is a cheap map of the Carnegie
producer landscape: one page named seven competing 2027 producers and, probably,
Troen's own dates. It also shows whether Troen is already being presented to that
operator's directors. Limits: a listing proves neither a relationship nor accuracy;
producer names on such pages still need first-party checks; and heavy navigation menus
on these sites mean prose must be isolated before quoting. Direct fetches can be
refused (Fourwinds 403), and that refusal must be recorded, not worked around.

## Proposed shared-document changes (coordinator applies)

1. `PROGRESS.md` workstream 03: record the partner case as reviewed research
   (not yet in the workbook) and link the profile.
2. `INTERNAL-DECISIONS.md`: add the open question "Is NYIMF / New York Invitational
   Music Festival the event name, and has MTC been in contact for 2027?".
3. Strategy 02: add MTC-05 as a starting source for the provider comparison; the
   listed producers (National Concerts, Manhattan Concert Productions, MidAmerica
   Productions, Festival at Carnegie Hall, Choirs of America, Harmony Honors) are
   candidate comparators.
4. Strategy 03: note that partner research pages needed main-content filtering and
   that one SERP result was blocked at fetch.

## Next useful action

Confirm U1 with the Troens, then add MTC as a partner opportunity in the workbook
with relationship "unknown". The partner sheet draft is ready for their reaction.

Running processes: none. Ports: none. Scratchpad page copies are disposable.
