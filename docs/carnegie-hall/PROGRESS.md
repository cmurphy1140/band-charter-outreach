# Current progress and learning checkpoints

[Start here](README.md) · [Shared project instructions](../../AGENTS.md) · [Strategies](strategies/README.md) · [Internal decisions](INTERNAL-DECISIONS.md)

Last updated: September 11, 2026. This is the compact record to read when resuming. The plan and strategies describe the current approach; this file records what actually exists, what changed, and the next suggested increment. Update it during active work, not through an assumed background process.

## Overnight checkpoint — September 11, 2026

The current increment is complete and verified. The user authorized local commits
for finished work and intended side-conversation documents. Earlier checkpoints
record their state at the time; this section supersedes their uncommitted and
startup-pending wording. No new implementation task began. Nothing was pushed.

**Local commits:**

- `e6e493e2665dc6b1cd64b656844bdee4da9a8dbb` — empty/unusable scrape preservation
  guard and regressions. Fresh runner/scraper/SerpAPI verification: **54 passed,
  four known missing-fixture skips**. Nonempty partial results and downstream
  rebuild risks remain open; this is a bounded source-CSV repair.
- `f36bdf1fda895a3651a46b3b9b4f62ea21f971dc` — MTC candidate connection, source-review
  corrections and related documentation. **15 Node tests pass**. The workbook has
  three records and twelve sources. Existing cells/styles/panes, output hashes,
  downloads and source mappings were reconciled. The completed increment includes
  desktop and 390-pixel browser inspection, not native Excel/Word or actual iPhone
  certification. MTC stays a candidate with its event relationship unconfirmed.
- The documentation checkpoint containing this section saves shared instructions,
  progress, ledger, internal decisions, side-chat workflow, both Claude setup guides,
  learning guide, consulting idea board and nightly wrap-up routine. Resolve its
  full ID with `git log -1 --format=%H -- docs/carnegie-hall/PROGRESS.md`.
  `git rev-parse HEAD` reports the current checkout commit; the implementation IDs
  above remain stable. A document cannot contain its own eventual Git hash.

| Session / checkout | Branch | Verified implementation or worker commit |
|---|---|---|
| Codex, local Mac: `/Users/connormurphy/Desktop/Projects/band-charter-outreach` | `codex/mtc-research-example` | `f36bdf1fda895a3651a46b3b9b4f62ea21f971dc`, followed by this documentation checkpoint |
| Claude, local Mac: `/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research` | `feature/claude-partner-research` | `e171954439e97219491ff6fc2ff332700a1580ef` |
| Retained integration checkout: `/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/main-integration` | Detached | `5155cfad8432a5f9f60f3271ad657691cf9c1f8b` |

**Claude is idle.** Its final read-only handoff reports clean Git status, no
uncommitted/untracked work, no stash and no task-started processes. Codex checked
its branch/HEAD, clean status and empty shared stash. Its original commit remains
integrated as `a7ceefc139c1f075060fc9f02a0ec70a86a975d3`. No worker edit, sync or
removal occurred. Keep Claude idle until a new bounded assignment is coordinated.

**Processes:** Codex verified and stopped only its demo server, PID 47009, serving
`demo/carnegie-hall/` on `127.0.0.1:8765`. The port has no listener. No task server,
refresh watcher or scheduled writer remains running. Local HTML still opens
directly; the demo README explains restarting the server tomorrow.

**Remaining local-only files:** `notebooklm/` holds preserved migrated snapshots
and nightly packs. `docs/carnegie-hall/research/Zoho Research - Source and Working
Files/` holds duplicate research/working copies. These remain untracked and outside
all checkpoint commits. Private `.env`, ignored caches and local runtimes remain
in place. No unfinished code or intended documentation is left uncommitted.
Deferred legacy repairs, provider comparison and fuller POC materials are future
work, not changes discarded tonight. No blocker prevents the next internal draft;
unconfirmed business facts stay unknown.

**Nightly recap:** [the accepted routine](SESSION-WRAP-UP.md) now permits a fresh
local PDF-only source ZIP after the Git checkpoint. Its manifest records the actual
capture commit, time, input hashes and exclusions. It remains untracked under
`notebooklm/`; no audio generation or external upload is included. This supersedes
the blanket pack deferral. The final whole-project audio presentation remains
deferred until completion.

**One next action for tomorrow:** draft a concise March 3, 2027 FAQ from existing
reviewed event evidence, with source references and unresolved business items kept
internal. Do not broaden MTC into outreach or make business answers a prerequisite.
Read [START-HERE-LEARNING.md](START-HERE-LEARNING.md) to trace a claim through the
record, generator and deliverable before editing. No FAQ work started tonight.

## Current state

The [connected example](../../demo/carnegie-hall/README.md) now includes Wando and Salem research, a small illustrative MTC candidate, an editable opportunity workbook with twelve public sources, the Wando director sheet, and two fictional follow-up situations. MTC's event relationship is explicitly unconfirmed; its example carries no outreach strategy or recommendation to contact MTC. Salem's City of Salem identity is kept separate from the Virginia Beach school. The original candidate row is preserved. The Carnegie reference pack, logistics findings, positioning, received Zoho report, eight strategies, and tools map remain the working references. The focus is **March 3, 2027**, using **employee-reported** attribution and the **logistics and software developer** role.

An employee reports one participating group. **Ten additional ensembles is a provisional target requiring capacity confirmation.** There is no proven best-performing channel or required sequence of existing relationships, tour partners, and new schools.

| Workstream | What exists | What remains |
|---|---|---|
| 01 — Evidence | Original source review plus a scoped event record feeding the first example | Expand the event brief and claim model as further materials need them |
| 02 — Market comparison | Business context, detailed strategy and an MTC partner/competitor profile | A fuller source-backed provider comparison |
| 03 — Opportunities | Two schools and one illustrative [MTC candidate](../../demo/carnegie-hall/mtc.json) in the workbook, with twelve sources | A broader varied batch if useful; repair or bypass reused defective paths |
| 04 — Experience | Three-view interface, Salem comparison, compact MTC evidence card and workbook download | MTC stays a research example; a partner pitch is outside its current scope |
| 05 — Materials | Wando director sheet in DOCX/Markdown and a reviewed [internal MTC partner sheet](research/partner-pilot/PARTNER-SHEET-DRAFT.md) in Markdown | Editable partner export, FAQ and fuller proposal example; Word-specific rendering remains unchecked |
| 06 — Workflow | Two fictional situations and a downloadable example action brief | More varied cases if they improve the demonstration; no operating booking system |
| 07 — Automation | Separate local document and workbook builders with edited-output protection; received Zoho assessment | Measure usefulness and preparation effort; integrations and scheduling remain later work |
| 08 — Iteration | Fifteen targeted demo/review tests, desktop/mobile viewport checks, rendered workbook inspection and preservation comparison | Continue checking each changed behavior and updating the relevant references |

The first local prototype is working; the full five-deliverable POC is unfinished. Original data, logistics, and the supplied report were preserved. The September 11 repository-publication milestone now checkpoints the work below. No outbound messages, account integration, hosted website deployment, or scheduled automation has been performed.

The [shared instructions](../../AGENTS.md#working-authority-and-coordinated-handoffs) now record broad project discretion: continue routine authorized work, offer suggestions at meaningful choices, and use judgment for coherent, reviewed, verified local commits. This replaces the earlier need to request each local commit separately. As of September 11, Codex and Claude Code may work concurrently on independently assigned tasks in separate worktrees under the [parallel workflow](PARALLEL-WORKFLOW.md). Transfers of the same task remain sequential. Other Git actions remain governed by the actual task authorization.

Occasional iPhone/cloud work is now an accepted working preference. The [continuity rules](../../AGENTS.md#iphone-and-cloud-continuity) and [handoff procedure](strategies/08-iteration-and-delivery.md#iphone-and-cloud-handoffs) cover the execution host, portable inputs, one writer per task, phone-friendly updates, and verified return to the Mac. This update documents the process; it does not establish cloud access or synchronize the repository.

The first demonstration increment created `codex/carnegie-connected-example` in the existing checkout. Credential support was committed on `codex/serpapi-local-env` as `e4e6a9b`, followed by reference/demo milestone `f0dac98`. A separate integration worktree fast-forwarded `main`; the push succeeded and GitHub's SHA matched `f0dac98`. No conflicts or open pull requests were present. The original working checkout returns to `main` after the documentation checkpoint; the integration checkout is retained detached. No Claude Code or cloud handoff occurred.

## Coordination and handoff state

- Latest operator: Codex on the local Mac, connecting the reviewed MTC candidate as a small research example. Claude's completed checkout remains clean at `e171954`, with no relaunch. No wider Desktop/cloud configuration guarantee is implied.
- Working checkout: `/Users/connormurphy/Desktop/Projects/band-charter-outreach`, on `codex/mtc-research-example`. Code/demo work is committed as `e6e493e` and `f36bdf1`, followed by the documentation checkpoint above. Claude remains on `feature/claude-partner-research` at `e171954439e97219491ff6fc2ff332700a1580ef`. Main, the local origin/main ref and the retained integration worktree remain at `5155cfa`; no remote fetch or push was needed. Local packs/duplicate working copies remain untracked.
- Milestone scope: canonical reference pack and eight strategies; original logistics and supplied Zoho DOCX; historical audit and reproduction evidence; shared instructions and READMEs; demo sources, Word/Markdown/workbook outputs, and both Node test files. CLAUDE.md remains a relative link to AGENTS.md. Duplicate NotebookLM packs and report working/render copies remain untracked in the original checkout and are excluded from publication.
- Additional credential-support changes: `scrapers/serpapi.py`, both dependency manifests, `.gitignore`, `Makefile`, `.env.example`, `tests/test_serpapi.py`, isolation updates in `tests/test_news_east.py`, and the setup/status documentation. The user has now configured the private `.env`; preserve it and exclude it from transfers. `python-dotenv==1.2.3` is installed in this checkout's `.venv`. A successful live validation is recorded below; its cache is in Git-ignored `data/raw/serpapi-validation/`.
- Published checkpoints: `e4e6a9b` contains SerpAPI support; `f0dac98` contains the reference/demo milestone; `5155cfa` records that publication and handoff. The latest planning changes described below are not part of that published ref.
- Cloud inputs: a fresh clone of the verified public `main` contains canonical project records and shared instructions. It still needs its own dependencies and secret configuration. Cloud checkout execution and mobile Remote pairing have not been tested; verify receipt and execution at an actual handoff.
- App routing: the saved project/task entry still points to `/Users/connormurphy/Documents/ChatGPT/Troen Outreach Pipeline`, while the verified working repository is the Desktop/Projects checkout above. Verify/select the real checkout before a future launch; do not recreate the stale path or move the repo to match it. No app routing change was made here.
- Services: the coordinator's read-only Python server, PID 47009 on `127.0.0.1:8765`, was stopped for the night after verifying its command and checkout. The port is free. No scheduled writer was started.
- Verification and next task: see the latest checkpoint and suggested next increment below. Before transfer, update this section with the exact changed files, new commits, checks, limitations, services/ports, and next task, then stop the outgoing operator before the receiving tool resumes.

## Next useful step

Inspect the [working example](../../demo/carnegie-hall/index.html) and its workbook: **review the two schools and compact MTC candidate → reshape the Wando director sheet → explore fictional follow-up**. The examples demonstrate evidence handling, not conversion performance.

MTC is now connected within the user's narrower research-only scope. Its internal partner sheet remains separate; connecting it or developing outreach is not the next assignment. A useful later increment would be a short March 3 FAQ using reviewed event facts, with unresolved business items retained internally. This is a suggestion, not work started or a requirement for business homework.

Completed parallel assignments: Claude delivered the four reserved partner-pilot
files and stopped editing; coordinator review/integration is complete, with local
corrections. Codex owns the empty-scrape preservation fix in
`scripts/run_all.py` and regression tests in `tests/test_run_all.py`; shared
coordination records remain Codex-owned. See the
[exact assignment and acceptance checks](coordination/2026-09-11-partner-pilot.md#codex-parallel-assignment).
The fix and its regression tests are **implemented, locally verified and committed as `e6e493e`**;
see the latest checkpoint below for exact coverage and remaining limits.
Claude's base remains `39171e5` and its completed checkout is at `e171954`; review
did not edit that checkout. Further revisions to integrated files are coordinator-owned.
The old startup guides are setup records, not a new launch instruction.
The final whole-project audio presentation remains deferred. Local nightly recap
packs now follow [SESSION-WRAP-UP.md](SESSION-WRAP-UP.md); preserve older snapshots.

## Verified repairs and unresolved findings

Baseline code reviewed at `5155cfa` on September 11; the latest bounded guard was
implemented uncommitted from `ed8a0db` and verified as recorded below.
The original September 10 audit is a
historical snapshot; its original priority sequence does not gate the current
isolated POC. Git comparison confirms that the audited legacy modules below are
unchanged except the SerpAPI client and this runner write guard. These statuses distinguish current source
inspection and previously executed checks from new tests or live source review.

| Finding/path | Current status and evidence | Limit / next treatment |
|---|---|---|
| A05 — SerpAPI credential failures | **Repaired client path, bounded verification.** `e4e6a9b`; [client](../../scrapers/serpapi.py), [tests](../../tests/test_serpapi.py). Tests cover environment/private-file precedence, cached reuse, connection-error tracebacks and API-error bodies. A live search/cached repeat and publication credential scan succeeded in prior checkpoints. | Reuse for discovery. Explicit timeout/non-JSON and runner-persisted-metadata coverage, plus any full-history scan, remain distinct follow-through; Task 4's crawl-policy work is not complete. |
| A01/A06 — identity loss and dedupe | **Unresolved legacy paths.** [Runner](../../scripts/run_all.py) still keys carry-over by name/state, drops location from early dedupe and folds some stateless records by name. | Keep reviewed POC records separate; require stable resolutions and preservation checks before reusing these joins/writes. Demo IDs are not an automated identity repair. |
| A02/A07/A13 — identity/contact attribution and provenance | **Unresolved legacy paths.** [Enrichment](../../scripts/enrich.py) retains broad staff-context matching, city/tie ambiguity and incomplete field evidence. | Wando/Salem were manually reviewed; [demo validation](../../demo/carnegie-hall/review.cjs) rejects cross-school source IDs but cannot prove the source's identity/role. No NCES enrichment of those demo records is claimed. |
| A03 — empty/unusable batch replacement | **Bounded repair verified, committed as `e6e493e`.** [Runner](../../scripts/run_all.py) rejects empty batches and any row missing school/event/source URL before touching the interim CSV. [Regression tests](../../tests/test_run_all.py) verify preservation, incomplete status, first-run behavior, blocked failures and independent successful updates. | This protects source CSVs, not every downstream rebuild. Nonempty partial results with populated fields still need completeness validation; A03 is not closed. |
| A03/A04/A11 — other partial replacement, stale caches, crawl policy | **Unresolved.** The runner still accepts nonempty partial lists that pass basic field checks; [fetch](../../scrapers/common.py) has no automatic cache expiry and retains the audited robots/redirect behavior. SerpAPI also reuses its local cache unless forced; news discovery has a force-refresh path. | Do not use these paths for a production refresh until their specific checks pass. Reviewed manual retrieval can bypass them for the partner example; a new vendor does not repair them. |
| A08/A09/A13 — appearance meaning, scoring and individual evidence | **Unresolved legacy model.** [News parser](../../scrapers/news_east.py) still derives unstated years from publication date; legacy counts mix competitions/future plans with performances. | The demo keeps Wando's 2019 date and Salem's undated history distinct, but a complete claim/status model remains planned. It has no Carnegie score. |
| A10/A12 — output reconciliation and spreadsheet text | **Legacy unresolved; demo safeguards verified.** [Demo tests](../../tests/carnegie_demo.test.cjs) and [review tests](../../tests/carnegie_review.test.cjs) protect edited outputs and source-text handling. [Legacy exporter](../../scripts/export.py) remains unchanged. | Two builders must be reconciled manually; notes do not import back into JSON. Edited-file preflight is not proof of rollback across builders or all write failures. |
| A14 — documented versus operating promises | **Current documentation corrected; operating suppression unresolved.** Current references mark the old packet as historical and the POC as incomplete. | Keep historical packet claims out of current materials. No tested suppression/import/scheduling system is implied. |

## Research and reliability acceptance checks

These six priorities are accepted planning direction. The checks below are
broader acceptance criteria; only explicitly recorded subsets have passed. Apply
only the checks relevant to the path used; record a reviewed bypass and its limits
when that safely serves the POC. Do not require a full legacy overhaul first.

| Priority | Acceptance before using the changed path |
|---|---|
| 1. Preserve identities, data and edits | Correct a researched state/identity and rebuild twice: retain the same stable record, evidence, notes and manual decisions; keep two same-name schools distinct. Edited Word/workbook files must survive regeneration; any reconciliation uses a separate revision and explicit mapping, not silent overwrites. |
| 2. Verify school and adult attribution | For each selected school, record official name/location and NCES ID/vintage where available, or an explicit missing/conflict state. Exercise same-name schools, unmatched city/ties, district versus school staff and adjacent roles. Accept a contact only when name, role, contact and institution are explicitly connected; ambiguity stays in review. |
| 3. Preserve valid data on failure; enforce freshness | In temporary fixtures, simulate blocked, partial, interrupted and confirmed-empty sources; only validated complete partitions may replace records. Preserve prior records/cache on failure, report incomplete status and retained rows, and prove an explicit refresh revalidates the selected current source while historical snapshots remain usable. A cache hit must not advance the source-review date. |
| 4. Preserve appearance meaning and evidence | Trace every accepted changed claim to its source passage/page. Exercise a future invitation, completed concert, completed competition and undated item. Keep type separate from participation status; a publication date/current banner cannot invent an event date or completed trip. |
| 5. Reconcile research and deliverables | From the same reviewed input revision, compare record IDs, added/changed/removed/retained counts, notes, dates, roles, source links and any score components/as-of date across consumers. Rebuild both demo outputs when needed, preserve manual edits, inspect Word/workbook readability and source text as text. Current Carnegie scores remain not applicable. |
| 6. Close source gaps selectively | On the proposed representative PDF/rendered-page sample, compare raw and reviewed extraction against the expected fields. Retain source files/URLs, page or staff-record locators, method, dates and outcomes; report accuracy, missing evidence, costs and correction/maintenance effort. No service is adopted without a demonstrated benefit and the applicable later authorization. |

Detailed methods: [claim evidence](strategies/01-evidence-and-event-model.md#evidence-for-individual-research-claims),
[identity, failure and source handling](strategies/03-prospect-discovery-and-verification.md),
[tool evaluation](strategies/07-software-and-automation-fit.md#bounded-extraction-tool-evaluation),
and [output reconciliation / reusable lessons](strategies/08-iteration-and-delivery.md#reconcile-after-an-accepted-research-change).

The public tour-partner research example is now connected in the narrowed MTC
scope. The matching-sheet connection is deferred; the FAQ is the next increment.
Reuse SerpAPI for future authorized discovery. Firecrawl evaluation is planned before adoption. Zyte or
Apify is conditional on a demonstrated gap. This request starts no trials,
subscriptions, paid searches, broader scraping or implementation.

## Suggestions to carry into the next increment

1. **Choose one concrete demonstration question.** Can a viewer see why this school is worth considering and what useful material follows? Use that question to limit the first build and make feedback specific.
2. **Keep the information usable outside the interface.** Reuse the same checked facts in a profile, editable document, and workbook. A visual change should not require rewriting the research. Start with simple local files and the existing repository conventions.
3. **Let evidence change the conclusion.** Salem began with an unresolved identity, but primary sources supplied useful clarification and concert-program evidence. Keep that result rather than manufacture a weak label. A genuinely insufficient-evidence case can still be added later. Keep detailed business unknowns internal until a selected live action needs them.
4. **Capture small learning moments with the result.** When a layout, explanation, or data rule changes, record what prompted the change and what was verified. Preserve the current decision in the strategy and a short reason here; avoid producing another large planning document.
5. **Finish one useful increment before adding a service or framework.** Use the currently available tools. Add a plugin, dependency, connector, or scheduled process only when it solves a concrete gap in the selected work and falls within the authorized scope.

## Current blockers and later checks

There is no known business-information blocker to refining the internal demonstration. Wando's review is dated September 10; Salem's is September 11. Known legacy pipeline defects remain; these increments use reviewed input instead of running the audited refresh/enrichment paths.

Capacity, firm offer details, relationship ownership, account configuration, and booking/payment definitions remain unresolved for relevant live uses. Their timing is documented in the [internal register](INTERNAL-DECISIONS.md); do not convert it into a prerequisite questionnaire for Troen.

## Material decisions and learning

| Date | Status | Decision or learning | Reason and affected references |
|---|---|---|---|
| 2026-09-10 | Accepted direction | Demonstrate useful work before assigning business preparation tasks; use employee-reported attribution and the project role | Shapes the [plan](PLAN.md), evidence language, and internal decision timing |
| 2026-09-10 | Accepted working practice | Maintain strategies and instructions as the project develops; adapt through concrete examples and feedback | The [shared instructions](../../AGENTS.md) define learning checkpoints and distinguish suggestions from decisions |
| 2026-09-10 | Implemented documentation | Make AGENTS.md canonical and CLAUDE.md a relative link to the same file | Prevents two project instruction copies from drifting; existing project guidance is preserved |
| 2026-09-10 | Implemented first increment | One researched school, matching material, and synthetic follow-up example | Provides a concrete basis for learning and design before scaling research or software |
| 2026-09-10 | Superseded in part | Branch/worktree and preservation conventions remain; per-commit request requirement is replaced by the later standing grant | Current [Git workflow](../../AGENTS.md#git-workflow) records the applicable authority |
| 2026-09-10 | Superseded in part on September 11 | Routine discretion and verified local commit guidance retained; blanket sequential-only operation replaced by coordinated parallel work | [Shared authority and handoff rules](../../AGENTS.md#working-authority-and-coordinated-handoffs) govern ongoing work |
| 2026-09-10 | Accepted working preference | Occasional iPhone/cloud use with an explicit, verified handoff and return | [Continuity rules](../../AGENTS.md#iphone-and-cloud-continuity) distinguish the phone from its execution host and preserve local-only work; no cloud setup is claimed |
| 2026-09-10 | Verified research lesson | Use event-level dates, not the current banner of an archive page | The Wando Midwest Clinic record is from 2019; recorded in strategy 03 and the source register |
| 2026-09-10 | Verified workflow lesson | Render documents and protect manual edits before regeneration | Font fallback was corrected; edited DOCX and unknown contact cases are covered by targeted checks |
| 2026-09-11 | Implemented second increment | Add Salem identity research and a two-case editable workbook | One evidence-backed record per school; original ambiguous row preserved; no best-channel or buying-probability claim |
| 2026-09-11 | Verified workflow lesson | Keep notes, decisions, IDs, and source URLs within their complete sortable rows | Both workbook tables support filters; generation refuses to overwrite manual workbook edits; build/runtime instructions live in the demo README |

## Prior checkpoint — first example, September 10

- Files created: the static example folder, reviewed JSON, generator, template, styles, interaction script, dependency manifest/lock, four portable exports, generated HTML/hash manifest, README, and `tests/carnegie_demo.test.cjs`. Updated AGENTS.md/CLAUDE.md, root and reference READMEs, this record, and strategies 03, 04, 05, 07, and 08. Global instructions were not changed by this implementation.
- Behavior checks: six targeted Node tests pass. Browser checks cover all three views at 320, 390, 768, and 1440 pixels, evidence expansion, four downloadable files, scenario change/reset/reload, an invalid hash, visible keyboard focus, and direct-file navigation. No page errors or current console errors were observed. The DOCX was visually checked as a one-page LibreOffice render; no Word-specific or physical-iPhone check is claimed. These tests do not certify the unchanged legacy pipeline.
- Final checks: 222 local links across 24 canonical reference/demo Markdown files resolve; the generated HTML and DOCX agree with the reviewed source text; all five generated-output hashes match; the shared instruction link is valid. All 457 inventoried original files outside the intended documentation edits are unchanged. JavaScript syntax and `git diff --check` pass. These checks exclude unrelated copied source packs, which were not edited. The original pipeline and logistics were not rebuilt or overwritten.
- Next action at that checkpoint: inspect the first example. The subsequent increment is recorded below. For a future cloud session, prepare the needed handoff inputs and verify receipt; the current uncommitted files are not assumed remotely available.

## Checkpoint — opportunity review, September 11

- New outputs: [opportunity workbook](<../../demo/carnegie-hall/outputs/01a08da2-45ab-7181-a80f-a887cb079101/Troen - Carnegie Opportunity Review.xlsx>) and [Salem research note](<../../demo/carnegie-hall/exports/Troen - Salem Research Note.md>). Two workbook tabs hold two opportunities and nine public sources; working notes begin blank. The Wando-only material is explicitly distinguished from the Salem comparison.
- New source/build files: `salem.json`, `review.cjs`, `build-workbook.mjs`, and `tests/carnegie_review.test.cjs`. Updated demo builder/template/styles/README and generated outputs; project AGENTS.md, root/reference READMEs, this record, and strategies 03, 04, and 07. Global instructions and original logistics/data were not edited.
- Checks: eleven targeted Node tests pass, including missing-contact handling in the Salem comparison. All three browser views fit at 320, 390, 768, and 1440 pixels; Salem evidence expands; six downloads return HTTP 200; an actual workbook download uses the intended filename. Both workbook sheets were rendered and visually inspected. The saved XLSX reimports; temporary in-memory disposition/note edits retain the opportunity ID and were restored without rewriting the deliverable. Exported tables, filters, frozen panes, dropdown options, source/contact associations, and numeric dates were inspected. The artifact error scan found no errors; this tracker intentionally contains no calculated metrics. Native Excel behavior remains untested.
- Build boundary: the workbook and HTML/Word builders are separate manual commands. Rebuild both after research changes; workbook dispositions/notes do not flow back into JSON. The tested workbook route uses the installed spreadsheet skill and Codex bundled `@oai/artifact-tool` through a scratch dependency link. Manual edits block replacement; use a separate output directory and reconcile by opportunity ID. No Excel-native or physical-iPhone interaction has been verified.
- Final preservation/link checks: 223 local links across 24 canonical reference/demo Markdown files resolve; seven generated hashes match; CLAUDE.md resolves to AGENTS.md. The 582-file starting inventory showed only the intended source/document/output edits and five Finder `.DS_Store` metadata changes, which were left alone. Original prospect data, logistics, supplied research, copied NotebookLM source packs, and the legacy pipeline were preserved. JavaScript syntax and whitespace checks pass. The demo package test command includes both test files.
- Remaining work: partner example/sheet, provider comparison, fuller event/proposal materials, and any later operating integrations. A two-school workbook is an initial usable artifact, not completion of the proposed varied batch. No outbound communication, CRM import, public deployment, cloud transfer, or commit occurred.

## Checkpoint — local SerpAPI setup, September 11

- The client reads the project-root `.env` only when `SERPAPI_KEY` is absent from the environment. It does not search parent folders or export unrelated values. Saving a key allows subsequent client checks to read it without changing the launch files. A blank environment value intentionally disables fallback.
- Added a private `.env`, a shareable blank `.env.example`, ignore rules for environment-file variants, and `make check-serpapi`. The user saved the local key; the presence check now succeeds. The check itself remains presence-only and consumes no search quota.
- The existing request-error path could include a credential-bearing URL. Transport/HTTP/JSON failure messages now omit raw exception/response content and suppress secret-bearing chained tracebacks. Mock tests check this alongside key precedence, missing/blank values, another working directory, literal parsing, search/quota use, and cache preservation.
- Verification: 30 tests passed across `test_serpapi.py`, `test_news_east.py`, and `test_search_fallback.py`. They use temporary files and mocked requests, not real credentials. This verifies the changed shared client and its consumers; it does not certify the legacy merge/refresh pipeline. No commit, outreach, account change, or cloud transfer was made.
- Live verification, September 11: one uncached Google-engine query, `student music performance tours Carnegie Hall`, returned nine organic results. A repeat returned the same cached payload. SerpAPI reported 80 searches remaining before and 79 afterward; this is a dated quota snapshot, not a plan entitlement or forecast. The credential was absent from the saved response/metadata cache. No prospect rows, logistics, or demo outputs were changed. Result relevance has not yet been reviewed.
- Next action: use the verified client selectively for the proposed tour-partner example and tailored sheet. The validation response is cached separately in ignored `data/raw/serpapi-validation/`; retain its evidence if selected for further research instead of paying to repeat the same query. No broader crawl or pipeline refresh was started.

## Prior milestone — repository publication, September 11

- Authorization: push to `main` and resolve conflicts; the user subsequently explicitly allowed internal business files in the existing public repository. No visibility change is needed. This does not authorize publishing credentials or private-account access.
- Included: the SerpAPI change, complete canonical reference pack, original 15 images and four PDFs, supplied Zoho assessment, technical audit and remediation references, connected example, editable outputs, and tests. No original prospect data or source attachment is rewritten. Duplicate NotebookLM and report working copies remain local.
- Verification before integration: 68 Python tests passed, four skipped for unavailable real-page fixtures; 11 Node tests passed. The publication candidates were checked for the configured secret and credential patterns with zero matches. No live API searches were needed for this push. The missing `Path` type import was restored during review.
- Integration result: normal fast-forward from `be3f9ff` to `f0dac98`; push succeeded and `git ls-remote` verified the exact matching SHA. No merge conflict or force push occurred. The clean integration checkout contained 469 tracked paths matching the original checkout, seven valid generated hashes, and no `.env` or duplicate working packs. All 227 checked local document links resolved. The audit reproduction script's extra final blank line was removed without changing its behavior or evidence snapshots.
- Preserved: original prospect data, all source attachments, supplied report, ignored local credentials/cache, and 96 untracked duplicate/working files. These remain on the original Mac; untracked duplicates and secrets are not cloud inputs. No worktree is deleted as part of this integration.
- Next product task remains the proposed tour-partner research example and matching sheet; publishing this milestone does not complete the broader POC or enable outreach or recurring refreshes.

## Prior checkpoint — research and reliability planning, September 11

- Reviewed the latest shared instructions, progress, audit and relevant source/tests
  at `5155cfa`. Added the six user priorities with path-specific acceptance checks,
  verified/unresolved status, a bounded Firecrawl comparison and conditional
  Zyte/Apify evaluation. The tour-partner example and matching sheet remain next.
- Corrected planning drift: strategy 01 now points to the implemented March 3
  event record and its actual ID; the old remediation plan no longer requires a
  parade rebuild or both-date business questionnaire before the POC. Task 4 marks
  the completed SerpAPI work separately from remaining policy/coverage work.
- Updated files: AGENTS.md, PLAN.md, this record, TOOLS-AND-CONNECTORS.md, strategies
  01/03/07/08 and the existing remediation plan. Reusable lessons live in strategy
  08; this task did not edit global instructions or product memory. Separate
  workflow-policy edits appeared in the checkout during this work; they were
  preserved, not authored or reverted as part of the reliability revision.
- Verification for this revision passed: 159 local links and 30 anchors across
  the nine intended documents and three workflow-related documents resolve;
  the six priorities and repair boundaries agree, whitespace checks pass, and
  AGENTS.md/CLAUDE.md still share the valid link. The preservation check found
  559 baseline files unchanged and only the reviewed Markdown changes; code,
  data, original attachments, generated deliverables and credentials were preserved. The
  prior 68 Python passes/four fixture skips and 11 Node passes remain dated
  implementation evidence; this planning-only edit does not imply new repair tests.
- Scope: local uncommitted documentation on `codex/research-reliability-plan`;
  no code/data/artifact edits, commit, push, trial, subscription or broader scrape.

The general collaboration refinement is saved in the local Codex global instructions, with a concise project mirror. The two instruction scopes do not automatically synchronize. The project AGENTS.md/CLAUDE.md filenames share one local file through the verified link; other machines and already-running sessions are not assumed to reload it. This is not a ChatGPT Memory update.

## Workflow update — coordinated parallel work, September 11

Accepted: independent Codex and Claude Code tasks may run concurrently in separate
worktrees. One coordinator owns shared records and serial integration; one writer
owns each assigned task, checkout, and file set. See [PARALLEL-WORKFLOW.md](PARALLEL-WORKFLOW.md)
for assignments, resource isolation, startup prompts, integration, and recovery.
This replaces the earlier blanket sequential-only rule, including for independent
Mac/cloud tasks. Transferring the same task still requires its outgoing writer to stop.

This side-conversation update changes documentation only. No workers were launched,
worktrees created, services stopped, or commits/merges/pushes performed. At inspection,
main was at `5155cfa` and the retained integration worktree was detached at the same
commit. Those are observations, not reservations. The main driver must designate the
coordinator and publish the assignment ledger before starting concurrent writers.
Existing NotebookLM packs are snapshots and retain their earlier instruction wording.

## Checkpoint — Claude starting state preparation, September 11

The main Codex task is coordinator. The user authorized reviewing and committing
the intended plan/strategy/shared-instruction/parallel-workflow/quickstart changes,
then creating a dedicated Claude worktree from that checkpoint. NotebookLM packs,
duplicate report copies, credentials and unrelated files stay excluded. No push or
Claude launch is authorized in setup.

The [reserved assignment](coordination/2026-09-11-partner-pilot.md) gives Claude only
the partner PROFILE.md, SOURCES.md, PARTNER-SHEET-DRAFT.md and its own handoff note.
All shared records and integration remain coordinator-owned. Worker acknowledgement
is pending. The created branch/path are `feature/claude-partner-research` and
`/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research`.
No other writer is assigned those outputs. The first pilot needs no server or new
dependency and has zero new paid calls. Two independent read-only discovery-cache
files were copied, hash-verified and confirmed ignored; no credential was transferred.

**Verified starting commit:** `39171e5fe873bca7fca3f05723a8fca9985f081b`.
The new checkout has the full setup instructions and ledger, a clean tracked tree,
and a valid CLAUDE.md → AGENTS.md link. Its separate `.venv` was installed from the
existing requirements to test the fresh baseline: **68 Python tests passed, four
fixture-dependent skips; 11 Node tests passed**. No shared writable environment,
new dependency or server was introduced. The launcher exists, but its authentication
and future browser capabilities remain unchecked because Claude was not invoked.

Use the [completed startup prompt](<Claude Code - Worktree Quickstart.md#completed-startup-prompt>).
Its full SHA, path, four owned files and resource limits are filled in. The worker's
committed quickstart/ledger are the initial reservation version; this coordinator
receipt records the completed setup without silently moving the worker branch.
NotebookLM packs and duplicate research copies remain only in the original checkout.
No push, merge, worktree cleanup, Claude launch, paid query or acknowledgement occurred.

## Latest checkpoint — empty-scrape preservation fix, September 11

**Implemented:** `write_interim_scoped()` validates the incoming batch before
reading/replacing scoped years or opening a CSV for writing. Empty results and any
row lacking a nonblank school, event or source URL reject the whole batch. Keeping
a mixed invalid batch intact avoids silently turning validation into a partial
replacement. The runner records these results as incomplete through its existing
blocked-source mechanism, omits them from successful counts and continues with
other sources. Success status is cleared only after the CSV write succeeds.

**Verified:** the pre-fix run produced 15 failing regressions and 10 passes,
including actual loss of all rows on a full empty scrape and the requested years
on a scoped empty scrape. After the change, all **25 runner tests passed**.
Focused verification with `.venv/bin/python -m pytest tests/test_run_all.py
tests/test_scrapers.py tests/test_news_east.py tests/test_serpapi.py -q --tb=short`
passed **54 tests with four missing-fixture skips**. Tests use real temporary CSV
and blocked-metadata writes with mocked sources; new tests fail any attempted
network request. Coverage includes byte-for-byte preservation, no empty CSV on a
first run, invalid/mixed batches, direct writer rejection, `BlockedSource`, cached
no-data results and successful full/scoped updates alongside a failed source.

**Limits:** this is a source-CSV guard, not a complete refresh repair. Nonempty
partial results with valid-looking fields, explicit source/year completeness,
confirmed-empty deletion, identity/carry-over joins, freshness, mid-write rollback
and output reconciliation remain unresolved. `main()`/`--merge-only` can still
rebuild final data through the old joins; no production refresh or rebuild was run.
Basic required-field checks do not verify school identity, role or source truth.

**Preservation and handoff:** code ownership stayed in `scripts/run_all.py` and
`tests/test_run_all.py`; coordinator updates are in AGENTS.md, PLAN.md, this record
and the assignment ledger. Existing guide/setup changes, data, logistics, credentials
and copied packs are preserved. Claude's four pilot files and checkout are untouched.
Claude Desktop setup is still being verified; its research is not assumed started.
No new service, paid call, dependency, server, commit or push was made. All current
changes remain uncommitted on `codex/empty-scrape-preservation` at base `ed8a0db`.

**Next recommendation:** complete Claude Desktop startup verification and the
reserved partner pilot, then review its evidence and draft for the Carnegie POC.
For a later pipeline increment, add source/year completeness reporting before
allowing nonempty partial batches to replace records. That is not a prerequisite
for the partner draft. The audio overview stays deferred until project completion.

**Reusable lesson:** validate before the destructive write, keep the previous file
unchanged when completeness is unknown, and test the actual stored bytes. A small
passing guard is evidence for that boundary only, not for the whole pipeline.

## Latest review — Claude partner pilot, September 11

**Decision:** accepted for internal POC use with coordinator corrections and an
explicit budget-accounting finding. This is not an approval to issue an offer,
contact anyone, claim a Troen/MTC relationship or treat all process checks as clean.
No Troen answers were requested or made a condition of draft acceptance.

**Commit scope:** `e171954439e97219491ff6fc2ff332700a1580ef` has exact parent
`39171e5fe873bca7fca3f05723a8fca9985f081b` and adds only PROFILE.md, SOURCES.md,
PARTNER-SHEET-DRAFT.md and the worker handoff in the assigned paths. No code,
data, shared records, dependencies or credentials are in that commit. It was
integrated by cherry-pick as `a7ceefc139c1f075060fc9f02a0ec70a86a975d3` in the current
working branch; main is unchanged. The worker commit is preserved unchanged.

**Source support:** the seven MTC pages and screened EPT page were rechecked.
Company identity, published staff roles, office contact, advertised services,
planned calendar and self-reported affiliations/award are supported. The two
organizational mailboxes were verified in raw contact/blog markup; no personal
contact or permission to send was inferred. C16 was narrowed because the undated
testimonial does not clearly attribute a particular Carnegie trip to MTC. Review
uses the existing P01/I06 event record for Troen's brochure/venue facts; no new
full logistics audit is claimed. See [the source review](research/partner-pilot/SOURCES.md#coordinator-source-review--september-11-2026).

**Budget across every screened provider:** MTC 7 readable pages + EPT 1 readable
page + Fourwinds 1 blocked content-page attempt = **8 readable pages, 9 attempted
content URLs across 3 providers**. The original 7/8 summary counted only MTC.
An eight-readable-page ceiling is met; an eight-attempt ceiling is exceeded by
one blocked attempt. The original selected-provider wording left that accounting
ambiguous, so no clean eight-attempt compliance claim is made. Retain the useful
draft with this disclosed process finding; do not discard research or reopen
scraping to fix a historical count. Future separately authorized budgets count
all provider attempts, including blocked and screened-out pages. Robots requests
are recorded separately. The worker reports zero paid calls and no bypass; a
complete request log was not supplied. Coordinator rechecks used no paid APIs or
new provider discovery and did not retry Fourwinds.

**Corrections and boundaries:** NYIMF/Troen is explicitly unconfirmed. Matching
dates and a filename are clues, not producer identity or relationship evidence.
The source's general advance-application guidance does not establish a current
March 3 window; the inaccurate timing inference was removed. Partner support is
proposed, eligibility/inclusions remain subject to a specific offer, and March 31
commercial terms/internal costs stay out of the sheet. Event identity, MTC history
and commercial responsibilities are in [INTERNAL-DECISIONS.md](INTERNAL-DECISIONS.md).
The profile can join the POC now, without those business answers.

**Preservation:** the prior uncommitted runner/test diff was snapshotted before
integration and compared afterward. No source data, logistics, existing outputs,
private configuration, NotebookLM packs, setup guides or worker checkout was
modified. Review corrections and shared-doc updates remain uncommitted alongside
the preservation fix. No application rebuild, new runtime test, push, outreach,
Claude relaunch or worktree cleanup is part of this Markdown review.

A separate `PARALLEL-WORKFLOW.md` edit and untracked `CONSULTING-IDEA-BOARD.md`
appeared during verification. They were preserved, not authored or folded into
the partner integration. Their appearance is not automatic coordination or proof
that every session shares the same state.

**Next useful increment at that review:** connect MTC to the workbook/demo.
The user subsequently narrowed this to an illustrative research candidate only;
the implementation below supersedes the proposed partner-sheet connection.
Audio remains deferred until project completion.

## Latest implementation — MTC research example, September 11

**Delivered:** a compact candidate card in the research view and a third workbook
record, using three previously reviewed MTC sources. Organization identity and
marketing are separate from the planned March 3 listing. NYIMF/Troen remains
explicitly unconfirmed; relationship, interest and bookings remain unknown.
The card contains source links and uncertainties, with no contact action, pitch,
commercial terms or partner-sheet link. The internal sheet and questions remain
available in their existing records, without business answers as a prerequisite.

**Verified:** all **15 demo/review tests pass**, including new candidate identity,
source ownership, unconfirmed-status, escaping and HTML-only preservation checks.
Three initial candidate regressions failed before implementation. Artifact Tool
recalculation and error scan found no formula errors; both workbook tabs were
rendered and inspected. Saved XLSX comparison preserved the original school and
evidence cells, styles, column widths and frozen panes; tables and editable fields
extend to the added record. The three MTC source IDs/URLs reconcile with the JSON
and prior pilot register. All seven manifest outputs match and six served downloads
match their files. Browser inspection passed at desktop and 390-pixel width,
including expandable evidence and no horizontal overflow. This is a phone-sized
browser check, not a test on an actual iPhone or in native Excel/Word.

**Preserved:** the empty-scrape fix/tests, two school JSON files, all five existing
Word/Markdown exports, and all four pilot files are byte-identical to the start of
this increment. The workbook had no manual changes relative to its manifest; its
existing note cells and dispositions are preserved. `--html-only` refreshes the
page without touching those exports and still rejects manually edited HTML.
This narrower build is not a workbook refresh, Word synchronization or complete
multi-artifact transaction. Source refresh, identity joins, cache freshness and
other previously unresolved legacy issues remain open; no pipeline run was made.

**Files and state:** added `demo/carnegie-hall/mtc.json`; updated the shared review
loader, HTML/workbook builders, template/generated HTML, workbook and manifest,
demo README and `tests/carnegie_review.test.cjs`. Coordinator updates are in
AGENTS.md, PLAN.md, this record, strategy 03 and the assignment ledger. Work is
uncommitted on `codex/mtc-research-example` at `a7ceefc`; no push or worker-checkout
change occurred. The existing read-only localhost server at port 8765 was reused.
This task made no new research request, paid API call, subscription, outreach or
audio artifact. Side-task guides, learning notes, consulting ideas and copied packs
were not edited by this task. During final verification the two prior NotebookLM
ZIP paths were absent and new wrap-up/audio-source files and `notebooklm/` appeared
outside this assignment. Their contents and purpose were not reviewed here; no
restoration, deletion or integration of that separate work was attempted.

**Reusable lesson:** connect only the evidence needed for the demonstration. A
provider calendar is a planned listing, not proof of producer identity, a business
relationship or an opportunity to contact. A research example can stop at that
uncertainty and still be useful. Keep its record distinct from school material and
fictional workflow states. A short event FAQ is the next suggested increment;
audio and NotebookLM updates stay deferred until project completion.
