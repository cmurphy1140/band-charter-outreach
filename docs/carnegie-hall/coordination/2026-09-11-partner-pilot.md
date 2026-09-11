# Partner research pilot assignment

Task ID: `claude-partner-research`. Reserved September 11, 2026.
Status: **reserved and ready for user launch; Claude is not launched and acknowledgement is pending**.

## Coordinator and starting state

- Coordinator: the main Codex task, **Troen Prospects Pipeline**
  (`01a08da2-45ab-7181-a80f-a887cb079101`) on the local Mac.
- Coordinator checkout: `/Users/connormurphy/Desktop/Projects/band-charter-outreach`;
  branch `codex/research-reliability-plan`.
- Worker: a future Claude Code session launched by the user on this Mac. No session
  has been launched or acknowledged; elapsed time does not release this reservation.
- Worker checkout: `/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research`.
- Worker branch: `feature/claude-partner-research`.
- Verified full starting commit: `39171e5fe873bca7fca3f05723a8fca9985f081b`.
  It adds the assignment and includes all fourteen reviewed setup documents.
  The worker checkout remains at this commit. Its ledger copy predates this
  completion receipt but contains the same ownership, inputs and resource limits;
  the completed startup prompt supplies the exact SHA. Coordinator receipt edits
  do not silently advance the worker branch.
- Policy: the September 11 [parallel workflow](../PARALLEL-WORKFLOW.md), one writer
  per assigned checkout/file set. This ledger is coordinator-owned.

## Outcome and exact write ownership

Research **one public student-performance tour provider** as a possible partner
and possible competitor, then draft a useful internal partner sheet for Troen's
**March 3, 2027** Carnegie proof of concept. This is research and Markdown drafting,
not a new app, automatic scraper, contact campaign or integrated demo change.

Claude exclusively owns these four repository-relative output files:

| Allowed path | Required content |
|---|---|
| `docs/carnegie-hall/research/partner-pilot/PROFILE.md` | Verified organization identity, public services/territory and music-travel relevance, source-backed fit, potential conflicts, unknown relationship/interest and next useful action. |
| `docs/carnegie-hall/research/partner-pilot/SOURCES.md` | Source IDs, exact URLs, retrieval/review dates, page/section locator, individual supported claims and uncertainties; distinguish public facts from interpretation. |
| `docs/carnegie-hall/research/partner-pilot/PARTNER-SHEET-DRAFT.md` | Concise partner-facing language labeled **internal discussion draft, unapproved and not sent**, using only supported March 3 facts and clearly qualified responsibilities. |
| `docs/carnegie-hall/coordination/claude-partner-research-handoff.md` | Acknowledgement, base/final ref, files, checks, sources, spend, limitations, reusable lesson, proposed shared-doc changes and ready-for-review status. |

These are exact files, not ownership of their parent folders. They were absent at
reservation. No other worker is assigned to them. Codex reserves their integration
and all other tracked files, including AGENTS.md/CLAUDE.md, PROGRESS.md, this ledger,
plans/strategies, READMEs, dependency manifests, demo/build files, tests, legacy
pipeline, prospect data, logistics and existing outputs. Other tasks may be active;
Claude is not alone in the repository. Never revert their work or edit their
checkouts. Propose any necessary scope change in the handoff note before making it.

## Read-only inputs and resources

Read the current shared instructions, PROGRESS.md, PLAN.md, and strategies 01, 02,
03 and 05. Use the business-context source inventory and original logistics only
to understand the already documented offer. The existing Wando and Salem materials
are examples of evidence treatment, not text to attribute to this provider.

The coordinator copied and hash-verified exactly two credential-free cache files
at these ignored relative paths in the worker checkout, as independent read-only
files (not shared writable caches or symlinks):

| Input | SHA-256 |
|---|---|
| `data/raw/serpapi-validation/a2281fc6877577d586a2cfe66de5f5c4d21f9fa7.json` | `12c364f8dd185000db501fb44b5ba27b90c9d2662189a47ed160fa25b20941fb` |
| `data/raw/serpapi-validation/a2281fc6877577d586a2cfe66de5f5c4d21f9fa7.meta.json` | `3798d373a8fe43ae40fc4cc4644b7c56bc94d63811260fe44198f9ed517e9bc7` |

This is the September 11 SerpAPI discovery query `student music performance tours
Carnegie Hall`, not verified provider research or an up-to-date offer. Review the
underlying primary sources before accepting claims. No credential is transferred.
If the cache is unavailable, use permitted public browsing and report the missing
input; do not enter the coordinator's checkout to fetch secrets or shared caches.

- Paid/API budget: **zero new paid calls**, including SerpAPI, Firecrawl, Zyte and
  Apify. No trials, subscriptions or account changes. No direct SerpAPI calls are
  allocated; use the snapshot and ordinary permitted public browsing.
- Public-source limit: at most **eight distinct first-party pages** for this
  provider in this first pass. This is a bounded manual research pilot, not a crawl.
  Respect source restrictions and project limits; do not bypass blocked access.
- No outward messages, CRM imports, quote requests, signups, live refreshes,
  deployment or purchases. Published contacts do not establish permission to send.
- No server or port is assigned. Do not use or stop the coordinator's server at
  `127.0.0.1:8765`. No background process or scheduled task is needed.
- Markdown requires no new runtime/dependency. Any coordinator-installed worker
  environment is local to this worktree; never share writable `.venv` or
  `node_modules` with another checkout. Do not read or copy `.env`.

## Acceptance and completion

1. One correctly identified provider, supported public relevance and a balanced
   partner/competitor assessment. Do not infer interest, an existing Troen
   relationship, exclusive territory or superior performance.
2. Every material factual claim traces to a source ID and specific source passage
   or section. Names, roles, locations, dates and contacts retain explicit evidence;
   unavailable values remain unknown. Distinguish event type and planned/completed
   activity where relevant; search snippets alone do not establish claims.
3. A readable, useful partner draft consistent with March 3 only. Do not invent
   pricing, capacity, availability, commissions, bookings or approved responsibilities.
   Keep March 31 terms and internal costs out of the partner-facing draft. Use
   employee-reported attribution and the logistics and software developer role.
4. Preserve all existing files. Check the four outputs, local links and citations,
   `git diff --check`, and the complete changed/untracked path list. No application
   rebuild or production data refresh is required for Markdown research.
5. Record verification, source limits, zero API spend, a useful next action and
   a reusable lesson with its limits. If evidence is insufficient, report that
   clearly rather than fill gaps. The business does not need a homework exercise
   before this draft can be useful.

One coherent local conventional documentation commit of **only the four owned
files** is authorized after review and verification. Include a stable handoff note;
report the full base and final commit IDs in the completion message (a file cannot
contain its own final commit hash). Do not push, merge, rebase, pull, switch branches,
remove worktrees or update shared plans. Mark the result ready for coordinator
review and stop editing until reassigned. No Claude work is activated by this setup.

## Setup verification receipt

The dedicated worktree is clean and its starting HEAD matches the full commit
above. AGENTS.md/CLAUDE.md resolve to the same instruction file. The cache copies
match the recorded hashes and are ignored; `.env` was not copied. No NotebookLM
pack or duplicate research working folder is present in the worktree.

A separate worker `.venv` was installed from the existing requirements for baseline
verification; no shared writable environment or package-manifest change was used.
The fresh checkout passed **68 Python tests with four fixture-dependent skips**
and **11 Node tests**. Markdown pilot work itself requires no new package or server.
The `claude` launcher is present, but it was not invoked; its authentication and
the future session's browser tools remain to be checked at launch. No paid search,
push, merge, Claude launch or worker acknowledgement occurred during preparation.
