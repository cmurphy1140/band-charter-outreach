# Current progress and learning checkpoints

[Start here](README.md) · [Shared project instructions](../../AGENTS.md) · [Strategies](strategies/README.md) · [Internal decisions](INTERNAL-DECISIONS.md)

Last updated: September 11, 2026. This is the compact record to read when resuming. The plan and strategies describe the current approach; this file records what actually exists, what changed, and the next suggested increment. Update it during active work, not through an assumed background process.

## Current state

The [connected example](../../demo/carnegie-hall/README.md) now includes Wando and Salem research, an initial editable opportunity workbook with nine public sources, the Wando director sheet, and two fictional follow-up situations. Salem's City of Salem identity is kept separate from the Virginia Beach school. The original candidate row is preserved. The Carnegie reference pack, logistics findings, positioning, received Zoho report, eight strategies, and tools map remain the working references. The focus is **March 3, 2027**, using **employee-reported** attribution and the **logistics and software developer** role.

An employee reports one participating group. **Ten additional ensembles is a provisional target requiring capacity confirmation.** There is no proven best-performing channel or required sequence of existing relationships, tour partners, and new schools.

| Workstream | What exists | What remains |
|---|---|---|
| 01 — Evidence | Original source review plus a scoped event record feeding the first example | Expand the event brief and claim model as further materials need them |
| 02 — Market comparison | Business context and detailed research strategy | A current, source-backed provider comparison |
| 03 — Opportunities | Two reviewed schools, nine public sources, two notes, and an initial workbook with editable dispositions/notes | A more varied batch including a tour partner; repair or bypass any reused defective paths |
| 04 — Experience | Three-view static interface plus Salem comparison and workbook download | Add a distinct partner conversation when useful |
| 05 — Materials | Wando director sheet in DOCX/Markdown; one-page render checked | Partner sheet, FAQ, and fuller proposal example; Word-specific rendering remains unchecked |
| 06 — Workflow | Two fictional situations and a downloadable example action brief | More varied cases if they improve the demonstration; no operating booking system |
| 07 — Automation | Separate local document and workbook builders with edited-output protection; received Zoho assessment | Measure usefulness and preparation effort; integrations and scheduling remain later work |
| 08 — Iteration | Eleven targeted tests, browser checks, and rendered document/workbook inspection | Continue checking each changed behavior and updating the relevant references |

The first local prototype is working; the full five-deliverable POC is unfinished. Original data, logistics, and the supplied report were preserved. The September 11 repository-publication milestone now checkpoints the work below. No outbound messages, account integration, hosted website deployment, or scheduled automation has been performed.

The [shared instructions](../../AGENTS.md#working-authority-and-coordinated-handoffs) now record broad project discretion: continue routine authorized work, offer suggestions at meaningful choices, and use judgment for coherent, reviewed, verified local commits. This replaces the earlier need to request each local commit separately. As of September 11, Codex and Claude Code may work concurrently on independently assigned tasks in separate worktrees under the [parallel workflow](PARALLEL-WORKFLOW.md). Transfers of the same task remain sequential. Other Git actions remain governed by the actual task authorization.

Occasional iPhone/cloud work is now an accepted working preference. The [continuity rules](../../AGENTS.md#iphone-and-cloud-continuity) and [handoff procedure](strategies/08-iteration-and-delivery.md#iphone-and-cloud-handoffs) cover the execution host, portable inputs, one writer per task, phone-friendly updates, and verified return to the Mac. This update documents the process; it does not establish cloud access or synchronize the repository.

The first demonstration increment created `codex/carnegie-connected-example` in the existing checkout. Credential support was committed on `codex/serpapi-local-env` as `e4e6a9b`, followed by reference/demo milestone `f0dac98`. A separate integration worktree fast-forwarded `main`; the push succeeded and GitHub's SHA matched `f0dac98`. No conflicts or open pull requests were present. The original working checkout returns to `main` after the documentation checkpoint; the integration checkout is retained detached. No Claude Code or cloud handoff occurred.

## Coordination and handoff state

- Latest operator: Codex on the local Mac. No transfer to cloud or Claude Code has been initiated.
- Working checkout: `/Users/connormurphy/Desktop/Projects/band-charter-outreach`, on `codex/research-reliability-plan`, based on published `5155cfa`. The user now authorizes a scoped setup commit and Claude worktree preparation, with no push or Claude launch. The clean integration checkout remains at `/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/main-integration/` with detached HEAD; it is not a second active operator. Prior implementation branches are retained. Verify actual refs before editing.
- Milestone scope: canonical reference pack and eight strategies; original logistics and supplied Zoho DOCX; historical audit and reproduction evidence; shared instructions and READMEs; demo sources, Word/Markdown/workbook outputs, and both Node test files. CLAUDE.md remains a relative link to AGENTS.md. Duplicate NotebookLM packs and report working/render copies remain untracked in the original checkout and are excluded from publication.
- Additional credential-support changes: `scrapers/serpapi.py`, both dependency manifests, `.gitignore`, `Makefile`, `.env.example`, `tests/test_serpapi.py`, isolation updates in `tests/test_news_east.py`, and the setup/status documentation. The user has now configured the private `.env`; preserve it and exclude it from transfers. `python-dotenv==1.2.3` is installed in this checkout's `.venv`. A successful live validation is recorded below; its cache is in Git-ignored `data/raw/serpapi-validation/`.
- Published checkpoints: `e4e6a9b` contains SerpAPI support; `f0dac98` contains the reference/demo milestone; `5155cfa` records that publication and handoff. The latest planning changes described below are not part of that published ref.
- Cloud inputs: a fresh clone of the verified public `main` contains canonical project records and shared instructions. It still needs its own dependencies and secret configuration. Cloud checkout execution and mobile Remote pairing have not been tested; verify receipt and execution at an actual handoff.
- App routing: the saved project/task entry still points to `/Users/connormurphy/Documents/ChatGPT/Troen Outreach Pipeline`, while the verified working repository is the Desktop/Projects checkout above. Verify/select the real checkout before a future launch; do not recreate the stale path or move the repo to match it. No app routing change was made here.
- Services: a read-only Python static server is running on `127.0.0.1:8765`, PID 47009, serving only `demo/carnegie-hall/` for local inspection. It is not a public deployment or a background refresh. Confirm the PID/port before stopping or reusing it. No scheduled writer was started.
- Verification and next task: see the latest checkpoint and suggested next increment below. Before transfer, update this section with the exact changed files, new commits, checks, limitations, services/ports, and next task, then stop the outgoing operator before the receiving tool resumes.

## Next useful step

Inspect the [working example](../../demo/carnegie-hall/index.html) and its workbook: **review the two schools → reshape the Wando director sheet → explore fictional follow-up**. The first two cases demonstrate evidence handling, not conversion performance.

Recommended next: research one public tour-partner offer and draft a matching partner sheet. This would introduce a different business conversation before expanding school volume. No partner research or outreach has started in this increment. Keep business unknowns internal until they affect an actual approach or offer.

## Verified repairs and unresolved findings

Code reviewed at `5155cfa` on September 11. The original September 10 audit is a
historical snapshot; its original priority sequence does not gate the current
isolated POC. Git comparison confirms that the audited legacy modules below are
unchanged except the SerpAPI client. These statuses distinguish current source
inspection and previously executed checks from new tests or live source review.

| Finding/path | Current status and evidence | Limit / next treatment |
|---|---|---|
| A05 — SerpAPI credential failures | **Repaired client path, bounded verification.** `e4e6a9b`; [client](../../scrapers/serpapi.py), [tests](../../tests/test_serpapi.py). Tests cover environment/private-file precedence, cached reuse, connection-error tracebacks and API-error bodies. A live search/cached repeat and publication credential scan succeeded in prior checkpoints. | Reuse for discovery. Explicit timeout/non-JSON and runner-persisted-metadata coverage, plus any full-history scan, remain distinct follow-through; Task 4's crawl-policy work is not complete. |
| A01/A06 — identity loss and dedupe | **Unresolved legacy paths.** [Runner](../../scripts/run_all.py) still keys carry-over by name/state, drops location from early dedupe and folds some stateless records by name. | Keep reviewed POC records separate; require stable resolutions and preservation checks before reusing these joins/writes. Demo IDs are not an automated identity repair. |
| A02/A07/A13 — identity/contact attribution and provenance | **Unresolved legacy paths.** [Enrichment](../../scripts/enrich.py) retains broad staff-context matching, city/tie ambiguity and incomplete field evidence. | Wando/Salem were manually reviewed; [demo validation](../../demo/carnegie-hall/review.cjs) rejects cross-school source IDs but cannot prove the source's identity/role. No NCES enrichment of those demo records is claimed. |
| A03/A04/A11 — failed/incomplete replacement, stale caches, crawl policy | **Unresolved.** [Runner](../../scripts/run_all.py) accepts returned partial lists; [fetch](../../scrapers/common.py) has no automatic cache expiry and retains the audited robots/redirect behavior. SerpAPI also reuses its local cache unless forced; news discovery has a force-refresh path. | Do not use these paths for a production refresh until their specific checks pass. Reviewed manual retrieval can bypass them for the partner example; a new vendor does not repair them. |
| A08/A09/A13 — appearance meaning, scoring and individual evidence | **Unresolved legacy model.** [News parser](../../scrapers/news_east.py) still derives unstated years from publication date; legacy counts mix competitions/future plans with performances. | The demo keeps Wando's 2019 date and Salem's undated history distinct, but a complete claim/status model remains planned. It has no Carnegie score. |
| A10/A12 — output reconciliation and spreadsheet text | **Legacy unresolved; demo safeguards verified.** [Demo tests](../../tests/carnegie_demo.test.cjs) and [review tests](../../tests/carnegie_review.test.cjs) protect edited outputs and source-text handling. [Legacy exporter](../../scripts/export.py) remains unchanged. | Two builders must be reconciled manually; notes do not import back into JSON. Edited-file preflight is not proof of rollback across builders or all write failures. |
| A14 — documented versus operating promises | **Current documentation corrected; operating suppression unresolved.** Current references mark the old packet as historical and the POC as incomplete. | Keep historical packet claims out of current materials. No tested suppression/import/scheduling system is implied. |

## Research and reliability acceptance checks

These six priorities are accepted planning direction. The checks below are
**future acceptance criteria**, not claims that new repairs have passed. Apply
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

Next useful increment remains the public tour-partner example and matching sheet.
Reuse SerpAPI discovery and its existing cached query when available; review the
underlying evidence. Firecrawl evaluation is planned before adoption. Zyte or
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

## Latest checkpoint — Claude starting state preparation, September 11

The main Codex task is coordinator. The user authorized reviewing and committing
the intended plan/strategy/shared-instruction/parallel-workflow/quickstart changes,
then creating a dedicated Claude worktree from that checkpoint. NotebookLM packs,
duplicate report copies, credentials and unrelated files stay excluded. No push or
Claude launch is authorized in setup.

The [reserved assignment](coordination/2026-09-11-partner-pilot.md) gives Claude only
the partner PROFILE.md, SOURCES.md, PARTNER-SHEET-DRAFT.md and its own handoff note.
All shared records and integration remain coordinator-owned. Worker acknowledgement
is pending. The planned branch/path are `feature/claude-partner-research` and
`/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research`.
No other writer is assigned those outputs. The first pilot needs no server or new
dependency and has zero new paid calls; a credential-free discovery snapshot will
be provided as read-only input. Record actual base SHA, worktree checks and completed
startup prompt after creating the checkpoint; do not describe reservation as launch.
