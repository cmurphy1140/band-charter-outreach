# Troen Carnegie Hall proof of concept — shared project instructions

`AGENTS.md` is the canonical project instruction file. `CLAUDE.md` is a relative
symlink to it, so both filenames read the same local content. Preserve that link.

Global-local guidance lives in [Codex global instructions](/Users/connormurphy/.codex/AGENTS.md);
[Desktop instructions](/Users/connormurphy/Desktop/AGENTS.md) govern filing. Read those
when available, apply the relevant rules, and keep this project in its existing
Desktop/Projects location. The concise collaboration guidance below is a project
mirror, not a replacement for global instructions or a claim of cross-device sync.

## Goal

Create a polished, source-backed proof of concept for Troen Student Performance
Events' March 3, 2027 Carnegie Hall event. Demonstrate useful opportunities,
audience-specific materials, and the path from interest through booking and trip
coordination before asking the business to do preparation work. An employee reports
one participating group; ten additional ensembles is a provisional target requiring
capacity confirmation. Preserve the original project's useful research and formats.
Read [the reference pack](docs/carnegie-hall/README.md) and
[eight detailed strategies](docs/carnegie-hall/strategies/README.md) for current direction.

## Current Status

2026-09-11, combined FAQ/demo checkpoint: Opportunities, Materials and Example
workflow now share a purpose statement, authentic logo and restrained typography.
Materials previews the reviewed FAQ inline and offers unchanged Word/Markdown
copies plus its cited brochure. Numbered navigation/section rails are removed;
Prepare/Perform/Reflect numbering remains inside the optional event explanation.
Twenty focused Node tests and desktop/mobile browser checks pass. The protected
build preserves manual edits and reviewed source versions. UI refinement is paused.
Work is on `codex/carnegie-director-faq`; resolve the checkpoint and current worker
state from [PROGRESS.md](docs/carnegie-hall/PROGRESS.md). No push occurred.
Claude's next reserved assignment is a fictional group proposal and internal
claim review, not UI work; see [the assignment](docs/carnegie-hall/coordination/2026-09-11-proposal-example.md).
Claude remains unlaunched. Earlier status paragraphs below are historical.

2026-09-11: The [connected local example](demo/carnegie-hall/README.md) includes
reviewed Wando and Salem cases, an initial editable workbook with twelve public
sources, a Wando director sheet, and two fictional follow-up situations.
The reviewed MTC candidate is connected as a small research example in the workbook
and demo. Its NYIMF/Troen event match stays unconfirmed. The internal Markdown
partner sheet is retained separately; this connection adds no pitch or contact action.
A broader varied batch, provider comparison, fuller partner materials,
pipeline repairs, and operating integrations remain unfinished. The supplied
Zoho report and original logistics are preserved. Work is on
`codex/mtc-research-example` at the prior checkpoint. The nightly checkpoint committed the preservation fix
as `e6e493e` and the MTC example/review corrections as `f36bdf1`, followed by the
coordinator documentation checkpoint containing this status. See
[the overnight record](docs/carnegie-hall/PROGRESS.md#overnight-checkpoint--september-11-2026)
for full implementation/worker IDs and how to resolve the documentation commit.
Generated NotebookLM snapshots and duplicate Zoho working files stay untracked;
no unfinished code is left awaiting a commit. Nothing was pushed.
Setup documents were committed locally as
`39171e5` on top of published `5155cfa`. Claude's dedicated
`feature/claude-partner-research` worktree started there and delivered `e171954`.
Its handoff reports a successful Local session and stopped editing; the clean
worker checkout was not changed during review. The broader Desktop/cloud setup is
not certified by this result. No push occurred. SerpAPI support is committed as
`e4e6a9b`, and the reference pack/demo/original sources as `f0dac98`. GitHub `main`
was verified at that milestone; the completion notes follow in a documentation
checkpoint. See the progress record for checkouts and local-only working copies.
The [six research and reliability priorities](docs/carnegie-hall/PLAN.md#research-and-reliability-priorities)
now govern reused paths, with [acceptance checks and repair status](docs/carnegie-hall/PROGRESS.md#verified-repairs-and-unresolved-findings).
The user narrowed the MTC connection to illustrative research, with no outreach
strategy or recommendation to contact MTC. Keep the NYIMF/Troen match explicitly
unconfirmed and business questions internal; no Troen answers are needed for this
example. The short March 3 FAQ has since been drafted as the separate increment
recorded above. The review
records eight readable pages and nine attempts across screened providers, including
one blocked attempt; do not repeat a selected-provider-only seven-page total.
Reuse verified SerpAPI discovery; plan a bounded Firecrawl comparison
before adoption, and consider Zyte/Apify only for a demonstrated gap. This revision
was initially documentation only; the bounded preservation fix below is now
implemented and locally tested. No subscription, trial or broader crawl was added.
The setup documents were authorized for commit and Claude's worktree was prepared.
The latest wrap-up request authorized committing completed work and intended
side-conversation documentation, with no push, worktree removal or Claude relaunch. The main Codex
task is coordinator; the [partner-pilot assignment](docs/carnegie-hall/coordination/2026-09-11-partner-pilot.md)
records the four delivered research/draft/handoff files. Shared instructions, plans,
strategies and integration stay coordinator-owned. The pilot has zero paid API calls.
Codex's parallel implementation assignment is one empty-scrape preservation guard
in `scripts/run_all.py`, with regression tests in `tests/test_run_all.py`; see the
[exact assignment and acceptance checks](docs/carnegie-hall/coordination/2026-09-11-partner-pilot.md#codex-parallel-assignment).
The guard now rejects empty batches and rows missing school, event or source URL
before any interim CSV write; 25 runner tests pass, with 54 passes/four fixture
skips across the focused runner/scraper/SerpAPI checks. Nonempty partial results,
identity joins and cache freshness remain unresolved; this does not certify a
production refresh. The integrated partner files are now coordinator-owned;
Claude's completed checkout is retained clean and idle at `e171954`; its final
read-only shutdown handoff reports no processes or stash entries. Codex stopped
its verified localhost demo server (PID 47009); port 8765 is free. The final
whole-project audio presentation remains deferred. Local nightly recap packs are
now part of the accepted wrap-up routine below; preserve earlier snapshots.
The overnight recommendation was the concise March 3 FAQ, now drafted while
keeping unresolved business points internal. Start with
[the learning guide](docs/carnegie-hall/START-HERE-LEARNING.md) when tracing a claim.
The demo README documents source/build ownership, manual-edit protection, and
how to run `node --test tests/carnegie_demo.test.cjs`. Do not run a destructive
legacy refresh to rebuild this example; it has its own reviewed input file.
Run `tests/carnegie_review.test.cjs` with Node's test runner as well. The workbook
uses the two school JSON files and separate MTC organization record with a
bundled-runtime builder; refresh
the workbook and demo together after evidence changes. Preserve manual workbook
notes and Word edits. The demo README records tested build and handoff limits.
Local SerpAPI support now reads the private repository-root `.env` as a fallback
to `SERPAPI_KEY` in the execution environment. See the [setup instructions](README.md#local-serpapi-setup).
`make check-serpapi` checks presence without displaying the key or calling the API.
The local key is configured. A live search and cached repeat succeeded on
September 11, 2026; keep the credential private and configure other hosts separately.
On September 11 the user explicitly authorized pushing to the existing public
repository, including the internal business reference pack, supplied Zoho report,
and original logistics. This publication permission covers these project records;
it does not include credentials or grant private-account access. Preserve duplicate
NotebookLM/report working copies locally unless a later task needs them published.
Read [current progress and proposed next step](docs/carnegie-hall/PROGRESS.md)
before resuming; update this status when implementation or priorities change.

The repository audit against `be3f9ff` remains available in
[the audit](docs/AUDIT-2026-09-10.md) and
[remediation plan](docs/superpowers/plans/2026-09-10-pipeline-remediation.md).
Confirmed defects include lost researched identities, incorrect contact
attribution, and destructive/stale refresh paths. Repair or bypass affected paths
for the Carnegie pilot; complete the relevant preservation checks before a
production rebuild or unattended refresh. The Carnegie plan supersedes the old
parade-first priority order, not the audit's findings. Historical counts below are
not the current baseline; the audited current list has 206 rows.
Distinguish an unresolved legacy finding from a reviewed POC bypass and from a
repair with executed verification. SerpAPI credential handling and demo edit/source
checks and the empty/unusable-batch guard have bounded verification; they do not
close legacy matching, freshness, nonempty-partial-result or export defects.
Preserve claim evidence, stable IDs and
manual corrections, and reconcile affected outputs after accepted changes.

## Collaboration and learning

- Work with the logistics and software developer as product lead, designer, and
  engineering collaborator. Invite meaningful technical tradeoffs; curiosity is
  part of the work, not automatically scope growth.
- Start with something concrete to inspect and reshape: a real example, rough
  layout, diagram, editable document, or small prototype suited to the question.
  Prefer sketch → explore → revise → build a useful increment → verify. Label
  illustrative behavior and distinguish a prototype from an operating product.
- Default to short, direct responses in every conversation for this project.
  Add detail only when it materially improves understanding, a decision, or the
  usefulness of the result. Explain one connection at a time in plain language;
  use familiar examples and technical detail when they add value.
  Confirmed 2026-09-10: Connor requested shorter project-wide responses.
- Ask one useful question at a meaningful choice when needed. Allow repeated
  questions and alternate explanations; do not quiz or assume familiarity from
  vocabulary or silence. Continue work whose direction is already clear.
- Keep documents editable: Markdown for these references, DOCX/Word sources for
  prose deliverables, and editable workbooks for opportunities. Inspect delivery
  PDFs and preserve manual edits when regenerating. Do not copy another project's
  document scripts or assume its app/export setup exists here.
- Keep ideas open to revision. Flag a meaningful scope change briefly; exploration
  is not implementation approval. Do not request repeated permission for work
  already authorized. Offer concrete suggestions at meaningful choices while
  continuing routine work; optional ideas should not become approval bottlenecks.
- Learn from explicit corrections and reactions to concrete work. Update matching
  guidance rather than append a transcript. A possible preference stays tentative
  until confirmed; project findings are not universal personal traits.

## End-of-session wrap-up

Confirmed September 11, 2026: when Connor explicitly ends a session, follow
[the session wrap-up routine](docs/carnegie-hall/SESSION-WRAP-UP.md): coordinator
checkpoint, fresh PDF-only NotebookLM ZIP, pragmatic-engineer audio prompt,
Claude/Codex shutdown prompts, and a morning restart prompt. Label unsettled
snapshots provisional. This nightly recap is distinct from the final project
presentation, which remains deferred. No app-close trigger, external upload,
automatic cross-session messaging, or additional Git permission is implied.

## Working authority and coordinated handoffs

- Confirmed 2026-09-11: use this project as a pragmatic workflow foundation.
  Deliver the smallest useful increment through proportionate verification.
  Distinguish implemented, verified, committed, pushed, and deployed states;
  passing a bounded check does not certify the entire pipeline. Existing learning
  checkpoints, Git rules, and the parallel workflow below remain authoritative.
- The user has granted broad discretion for this project's authorized work,
  including routine local edits, checks, tools, and carefully scoped local commits.
  Continue routine work without repeated approvals. Use judgment and explain
  meaningful choices; do not silently expand the product because an idea is possible.
- Standing authorization supersedes the earlier per-commit request requirement
  for this project. Make a commit when a coherent, reviewed, verified change is
  worth preserving, not after every edit. Do not sweep unrelated existing work,
  private source attachments, or ambiguous changes into a checkpoint.
- Offer a concise recommendation when a useful alternative, tradeoff, or risk
  emerges. Ask only when the answer or additional authority is actually needed;
  prepare the concrete result first when practical. Keep independent work moving.
- Confirmed 2026-09-11: Codex and Claude Code may work concurrently on independent,
  assigned tasks in separate worktrees. This supersedes the September 10 blanket
  sequential-only rule. One writer per checkout and owned file set; transfer of
  the same task remains sequential. Do not launch tasks merely because this is allowed.
- Before parallel work, designate one coordinator and record exact task ownership,
  branches, base commits, outputs, ports, and shared-service budgets. The coordinator
  alone updates shared plans/status/instructions and integrates completed branches.
  Workers record results in their assigned task notes and propose shared-doc changes.
  Follow [the parallel workflow](docs/carnegie-hall/PARALLEL-WORKFLOW.md).
- Before handing off, finish the current edit, stop or account for any process
  that can write the transferred task's files, and give the coordinator a handoff with the tool handing off,
  checkout path, branch/HEAD, changed and untracked files, commits made, verification,
  active services/ports, unresolved issues, and the next concrete task. Preserve
  uncommitted work; a handoff does not require committing unfinished material.
- The receiving tool reads this file and the progress record, verifies the actual
  Git/filesystem state and that the prior writer of this task has stopped, then resumes.
  Prefer the same checkout for these sequential handoffs. The shared instruction
  link shares file contents locally; it does not coordinate or stop either tool.

## iPhone and cloud continuity

The logistics and software developer will sometimes use an iPhone to direct cloud
work. Treat this as a normal way of continuing the project. Use the
[cloud handoff procedure](docs/carnegie-hall/strategies/08-iteration-and-delivery.md#iphone-and-cloud-handoffs)
and keep these rules with the repository:

- Identify the actual execution host, repository root, branch/HEAD, available
  inputs, and tools before editing. Desktop is a control surface too: verify whether
  the session runs locally or in a cloud container, and whether it created another
  worktree. Resolve assignment mismatches before dependent edits; do not switch
  branches or copy inputs merely to force a match. A phone is the control surface: a cloud
  checkout and Remote access to the Mac are different environments. If no
  repository tools are available, continue useful analysis without claiming edits.
- Read this file, `docs/carnegie-hall/PROGRESS.md`, and the relevant strategy in the
  receiving environment. Verify that `CLAUDE.md` still resolves to `AGENTS.md`.
  Mac global instructions, installed skills, credentials, and native apps are not
  assumed to travel with the project. Keep this concise mirror usable on its own
  when the linked Mac-only guidance is unavailable; report missing dependencies.
- Resolve paths from the actual checkout. The Desktop/Projects location and
  worktree convention apply on the Mac; use the assigned workspace in the cloud.
  Do not recreate `/Users/...` paths there. Prefer repository-relative paths in
  portable instructions, source records, and scripts.
- Before a transfer, preserve the exact working state and identify what the
  destination will receive. Local commits, uncommitted edits, untracked logistics,
  and ignored files are not automatically available in a cloud checkout. Use a
  task-authorized repository ref or supported file/patch transfer, verify receipt,
  and record missing inputs. Do not upload the whole logistics folder or secrets
  merely to make the environments match; carry only the authorized, necessary
  inputs, using sanitized examples when sufficient.
- Keep one active operator per assigned task/checkout across Mac and cloud.
  Independent Codex and Claude Code tasks may run concurrently under the parallel workflow.
  Record outgoing/incoming tool and host, branch/base commit, changed files,
  available sources, checks, services, and next action in `PROGRESS.md`. Verify the
  outgoing work has stopped before the receiving operator edits.
- Apply the same scoped working authority and commit judgment wherever the task
  runs. A local checkpoint is not a remote transfer. Pushes, integration, and
  account changes still need to fit the task's authorization; do not ask again
  when that authorization already exists.
- Run checks supported by the current environment. Keep Mac-native app checks
  explicitly pending when unavailable; do not report a Word export, local browser
  inspection, or source review that did not happen. Continue independent work.
- Before leaving cloud work, preserve its diff or commits and output artifacts in
  an accessible destination with the base commit and verification results. On
  the Mac, compare that base with current local work, review the incoming changes,
  integrate within authorization, and verify the result without overwriting local
  edits. Never imply automatic synchronization or merging.
- Keep phone updates short and actionable, with one useful next step and artifacts
  accessible in that session. A Mac absolute file link is not evidence of phone
  access. Keep detailed findings in the portable project documents.

This records a working preference; cloud checkout access, mobile Remote, and file
transfer have not been configured or tested for this project by this update.
Official references checked September 10, 2026: [cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment)
and [Remote connections](https://learn.chatgpt.com/docs/remote-connections).

## Living documents and learning checkpoints

The reference pack and all eight strategies are working documents, not fixed
requirements. Maintain them during active work as new evidence, accepted choices,
verified behavior, and useful corrections emerge. Connor explicitly requests ongoing
capture of useful information, skills, preferences, and workflows discovered in this
project (2026-09-10), so it becomes a reusable foundation for future work. Record
these discoveries without asking for repeated permission. No background task is implied.

- Capture consequential discoveries, including failed approaches and why they
  failed. Record the context, evidence or verification, practical lesson, and when
  it applies. Keep untested ideas and inferred preferences explicitly tentative.
- Update the existing relevant document: confirmed preferences and stable working
  rules here; research in its evidence document; repeatable procedures in the
  relevant strategy; current outcomes and links in `PROGRESS.md`. Avoid duplicate
  logs and recording every tool call.
- For a useful tool or skill, record its purpose, actual location, prerequisites,
  tested usage, and limitations. Document a repeatable workflow before packaging
  it as a reusable skill; generalize only after it has been demonstrated to work.
- At meaningful milestones, identify which lessons can transfer to future projects
  and which depend on Troen, this machine, or this dataset. Keep reusable lessons
  in the relevant project documents; do not automatically install global skills,
  change other projects, or promote tentative findings into universal rules.

1. On resuming, read this file, [PROGRESS.md](docs/carnegie-hall/PROGRESS.md), and
   the strategy/artifacts relevant to the next increment. Verify current files
   before trusting an old status or tool-availability snapshot.
2. At a meaningful checkpoint, update the affected plan/strategy/evidence text in
   the same work session. Keep suggestions, accepted decisions, unknowns,
   illustrative examples, and implemented/verified behavior distinct.
3. Record the current state, verification, remaining gaps, next suggested action,
   and a short dated reason for material changes in `PROGRESS.md`. Keep detailed
   evidence in its source document and link to it. Do not rewrite every file for
   an unrelated small change or grow a transcript-style daily log.
4. Put durable project rules and confirmed collaboration refinements here. Keep
   Troen-specific decisions in this repo. Mirror a newly confirmed general
   learning/collaboration preference in the global-local instructions only when
   within the user's authorized scope; never silently change unrelated projects.
5. When a choice changes, revise its current wording and linked summaries;
   preserve a concise superseded-decision note when the reason will matter later.
   Original logistics, supplied research, and historical audits stay unchanged.
6. Verify affected links, dates, statuses, instruction-file consistency, and any
   implemented behavior. Report what was learned and where the guidance was
   saved. Local file edits are not a ChatGPT Memory update; other devices and
   already-running sessions are not assumed to reload or synchronize them.

## Git workflow

- Before editing, check the current branch, working-tree changes, registered
  worktrees, and whether another task is using the checkout. Preserve existing
  tracked, untracked, and generated work; do not reset, discard, or automatically
  stash it to make a task easier. Resolve unclear ownership before overlapping edits.
- Use one descriptive branch per coherent implementation effort. Keep related
  code, tests, and documentation together. Follow an explicitly requested branch
  name; otherwise use `codex/<short-change>` for work performed in Codex.
- Use a separate Git worktree when tasks will edit concurrently or need isolation.
  Keep sequential work in the same checkout when practical; a new worktree is not
  required for every task, strategy, or documentation update. Independent Codex/Claude
  tasks may run concurrently; transferring the same task requires the outgoing writer to stop.
- On the Mac, place worktrees outside the main repository at
  `~/Desktop/Projects/band-charter-outreach-worktrees/<short-task-name>/`
  (the project instance of `~/Desktop/Projects/<project-name>-worktrees/<short-task-name>/`).
- Give parallel tasks clear file ownership and record their branch, checkout path,
  scope, and handoff status in the progress record when used. Do not edit another
  task's checkout or combine unfinished changes. A worktree starts from its chosen
  Git ref; do not assume it includes the main checkout's uncommitted or untracked
  documents/data. Establish access to needed inputs while preserving existing work.
- Worktrees share Git history and do not isolate external services. Separate
  generated data, local configuration, caches, and development ports where needed.
  Never assume a worktree protects a shared database, account, or external output.
- Verify each change before integration. Review tracked and untracked changes for
  unintended data edits, credentials, and generated files; include only the
  intended code, tests, and documentation. Preserve manual corrections and sources.
- The user's standing authorization permits discretionary local commits for this
  project. Make small conventional commits at coherent, reviewed, verified
  milestones, including relevant tests and documentation. Inspect the intended
  diff and stage deliberately; preserve unrelated or unfinished work. Report
  checkpoints made without interrupting to request the same permission again.
- Pushes, merges, and worktree removal must fall within the authorized task scope;
  do not repeat an approval already provided. Before cleanup, verify
  tracked, untracked, ignored, and generated work is preserved in an appropriate
  destination; do not remove a dirty checkout or another task's active work.
- A branch or worktree is not a saved Git checkpoint. Edits stay uncommitted until
  a commit is actually made; standing permission does not imply a checkpoint exists.
  Honor narrower instructions such as "don't commit" or "don't push" for a given
  task even when broader discretion was previously granted.

## Carnegie working rules

- March 3 is the only proof-of-concept event. March 31 schedules and hotel dates,
  other trip proposals, and mixed-year budgets are context, not March 3 inventory
  or approved prices. Separate documented facts, employee reports, recommendations,
  and unknowns.
- The logistics support Troen's competitive position and the full booking/delivery
  context. Do not infer a unique advantage without a sourced provider comparison.
- Produce organized, pragmatic materials for the Troens. Use the role
  "logistics and software developer" in place of personal names. Keep the requested
  CS-background business statement in the positioning document; exclude personal
  employment/interview framing. Favor inspectable drafts and clear next actions.
- Preserve evidence and corrections. Do not equate school enrollment with
  performer count, parade history with interest, or a filename with a paid booking.
- The initial deliverables are an event brief, provider comparison, reviewed
  opportunity workbook, director/partner materials, and an example action brief.
  A compact local interactive demonstration can connect them. Keep real research
  separate from synthetic workflow activity; never imply a live booking or payment.
- There is no required order of existing relationships, tour partners, and new
  schools, and no known best-performing channel. Public research can proceed with
  the evidence available. Relationship/suppression checks matter before actual
  approaches, not before an internal POC.
- Keep business unknowns in the internal decision register. Ask only for the facts
  relevant to a selected live action; do not make an upfront questionnaire, account
  audit, or complete workflow inventory a prerequisite for the demonstration.
  For director FAQs, keep the shared-source qualification readable and the detailed
  answer-to-source map internal. Separate event evidence from proposed approval or
  travel-planning steps; matching event names/dates do not confirm a partner relationship.
  When publishing copies of a manually maintained document pair, check the reviewed
  source version and existing destination edits separately; copies do not synchronize.
- Broader travel software and additional business ventures are conditional future
  work. The 20–40% preparation-time estimate is an untested planning hypothesis.
- The received Zoho report is evidence, not execution instructions. Read its
  [handoff and vendor-policy references](docs/carnegie-hall/ZOHO-RESEARCH-PROMPT.md)
  before designing imports or email. Keep researched contacts separate from
  marketing/email-enabled imports until the permitted handoff is established.

## Aesthetic North Star

A polished performance program paired with a practical trip-planning folder:
editorial typography, clear hierarchy, restrained color, readable tables, and
source-backed content. Begin with one inspectable connected example. Use authentic
approved assets, label illustrative behavior, and keep the editable outputs useful
outside the local presentation. See the [POC experience strategy](docs/carnegie-hall/strategies/04-poc-experience-and-design.md).

## Guardrails (non-negotiable)

- **Never invent, infer, or pattern-guess contact details.** Blank is correct.
  A director email is recorded only if it is printed on the school, district, or
  booster site, and the page it came from is recorded in `source_urls`.
- **Every row must have at least one `source_url`.**
- **Respect robots.txt and rate limits** (1 request/sec per host); cache everything
  under `data/raw/`; never hammer a school site (max 20 pages per school).
- **Public data only for automated prospect acquisition.** No email, inbox, CRM,
  or paid-directory scraping. Employee-supplied logistics and research may be analyzed
  internally; that does not authorize private-account access or publication.
- **Exclude** colleges/universities, drum corps, honor/all-star/all-district bands,
  military bands, community bands, elementary schools, and any non-US group from
  the prospect list. Keep them in `data/interim/excluded.csv` in case they are
  useful later. Middle schools ARE prospects (prior project decision, 2026-09-10), flagged
  by `level`; the East Coast sheet (`data/final/east_coast.csv`, xlsx sheet
  "East Coast") is ME–FL plus DC, VT, WV (`scrapers/common.py: EAST_COAST`).
- **Respect robots.txt even when the data is tempting.** Google News RSS search
  is disallowed and is never fetched. The same headlines come through SerpAPI's
  `google_news` engine under the project key (`SERPAPI_KEY`, set in the cloud
  environment on 2026-09-10; prior project decision that a keyed API call is not
  crawling). The key is read from the execution environment or the private,
  Git-ignored repository-root `.env`. Never print it or include it in cache,
  sidecars, CSVs, commits, demo files, or a cloud/worktree handoff pack.
  Configure secrets separately on the receiving host. Cloud configuration noted
  above is historical; it is not a current authentication check.
- **Reuse the existing dependencies first:** requests, beautifulsoup4, pandas,
  lxml, openpyxl, pytest. Necessary routine dependency changes fall within the
  project's delegated discretion; surface material cost or complexity choices.
  Use credentials only through an authorized account/configuration and keep them
  out of source and outputs. Add gspread only when the `--gsheet` export is actually
  used with an available, authorized service account.
- If a source is blocked or its structure is unclear, **stop and say so** rather than
  guessing. Blocked sources are recorded in `data/interim/_blocked.json` and printed
  by `run_all.py`.

## Layout

```
scrapers/        one module per source; each exposes parse(html, url, ...) and scrape()
scrapers/common.py  fetch() with robots/throttle/cache, Row dataclass, BlockedSource
data/raw/        cached HTML/JSON (gitignored, except data/raw/serpapi.com/: tracked,
                 because every search costs quota and the JSON holds no key)
data/interim/    per-source CSVs (tracked)
data/final/      prospects.csv and derived outputs (tracked)
scripts/         run_all.py, enrich.py, search_fallback.py, score.py, export.py, qa.py
scrapers/serpapi.py  cached SerpAPI client (environment key or private root .env)
tests/           pytest; fixtures are cached pages under tests/fixtures/
```

Run with `make venv`, then `make scrape | enrich | score | export | all | test | refresh`.

## CSV schema: data/final/prospects.csv

| column | notes |
|---|---|
| school | official school name |
| band_name | e.g. "Marching Minutemen" |
| city | |
| state | 2-letter code |
| level | High / Middle / Other (from the name at merge, else NCES) |
| district | Phase 2 (NCES) |
| enrollment | Phase 2 (NCES) |
| parades | semicolon-separated, e.g. `Macy's 2026; Rose 2023` |
| parades_marched | integer count |
| last_appearance | most recent year |
| boa_finalist_years | semicolon-separated |
| school_url | |
| band_url | band program / booster site |
| director_name | only if published on school/booster site |
| director_email | only if published; otherwise blank |
| director_phone | only if published |
| booster_org | name of booster club if found |
| source_urls | semicolon-separated |
| score | Phase 3 |
| tier | A/B/C, Phase 3 |
| notes | free text (low-confidence NCES matches, social links, warm-lead flags) |

Interim files use: `school, band_name, city, state, event, year, source_url`.

## Historical parade source reachability (2026-09-10 cloud snapshot)

The following table is retained from the original project. It is not a fresh
availability check, a Carnegie source plan, or confirmation of current credentials
or pricing. Some legacy module names and completion claims are superseded by the
audit; inspect the actual code before reusing them.

| Source | Module | Status |
|---|---|---|
| macys.com/parade | `scrapers/macys.py` | **blocked** (403 bot block); parses cached page only |
| macysthanksgiving.fandom.com/wiki/Marching_Bands | `scrapers/macys.py` | **blocked** (403); cached page only |
| tournamentofroses.com | `scrapers/rose.py` | **blocked** (captcha challenge); cached page only |
| Wikipedia "Rose Parade marching bands" | `scrapers/wikipedia_rose.py` | live |
| chicagothanksgivingparade.com | `scrapers/chicago.py` | **blocked** (TLS failure); cached page only |
| Philadelphia (6abc) | `scrapers/philly.py` | 6abc page URL unknown; Wikipedia article "6abc Dunkin' Thanksgiving Day Parade" used live |
| H-E-B Houston | `scrapers/heb.py` | parade site TLS failure; houstontx.gov/thanksgivingparade live |
| Hollywood Christmas Parade | `scrapers/hollywood.py` | live, per-year pages 2018–2026 |
| National Independence Day Parade | `scrapers/july4.py` | live homepage; lineup pages to be discovered |
| Bands of America finalists (marching.musicforall.org/result/) | `scrapers/boa.py` | live; Grand National finalists parsed from the HTML "Finals Results" block; regional recaps are PDF-only and are counted, not parsed |
| Google News headlines via SerpAPI (24 East Coast parades + Macy's) | `scrapers/news_east.py` | live with `SERPAPI_KEY` (free plan: 250 searches/month; one pull is ~28); a row needs the headline to name both a High/Middle School band and the parade; blocked without the key |
| NCES Common Core of Data | `scripts/enrich.py` | live; zips cached in `data/raw/nces/` |

To unblock a blocked source: save the page as HTML into the cache path printed by
`run_all.py` (`data/raw/<host>/<sha1(url)>.html`), then rerun `make scrape`.

## Historical parade maintenance plan

- Macy's: bands for the following year announced early October
- Rose Parade: early March (plus two Rose Bowl college bands in December)
- Chicago / Philly / H-E-B / Hollywood: October–November
- BOA Grand Nationals finalists: mid-November

`make refresh` is the original year-scoped scrape/merge command and can write
data and a changelog. The audit identifies destructive failure and stale-cache
paths; it is not safe to describe this as a proven non-destructive refresh.
`workflows/refresh.yml` is a scheduling template outside GitHub's active workflow
directory. It does not establish a running schedule. No exports or emails are
sent by the reference-pack work, and no scheduled task was enabled.

## Historical parade phase status

These completion notes and counts describe the earlier implementation. Use the
audit for its defects and baseline, and the Carnegie pack for current priorities.

- [x] Phase 0 repo setup
- [x] Phase 1 discovery scrape (214 schools from Rose/Wikipedia, Philadelphia/Wikipedia,
      Hollywood, H-E-B Houston, BOA Grand National finalists 2018–2025, and SerpAPI
      news headlines; Macy's official pages, Rose press releases, Chicago blocked;
      July 4th publishes no lineup; BOA regional results are PDF-only and not parsed)
- [x] Phase 2 enrichment, all rows (NCES 2023-24 directory + membership totals;
      school-site crawl; contacts only when labelled band director on a
      school-domain address): 133 with district and enrollment, 22 band pages,
      3 director names, 1 director email.
- [x] Phase 3 scoring and tiers (`scripts/score.py`, config dicts at the top)
- [x] Phase 4 outputs (`data/final/prospects.xlsx`, `SUMMARY.md`; `--gsheet` lazy)
- [x] Phase 5 seasonal maintenance (`make refresh`, `workflows/refresh.yml`)

See `docs/SCRAPING_HURDLES.md` for every blocked or partial source and what
unblocks it, and `docs/TROEN_QUESTIONS.md` for historical client questions; use the Carnegie
internal decision register for current timing and priorities.

## Historical parade deliverables and scheduling notes

- The old packet lives in `docs/packet/` (brief + Top 10, deck PDF and pptx,
  overview, sales sheet). It is historical material; its readiness, count, and
  scheduling claims must not be reused as current Carnegie facts. Editable-source
  and identity notes are recorded in `docs/HANDOFF.md` section 10.
- The earlier handoff describes a one-shot cloud routine for 2026-10-08. That
  external routine has not been independently verified here; do not claim it is
  active or create a duplicate based on this note.
- Personal interview notes and private follow-up correspondence remain outside
  this pack. The logistics and software developer explicitly authorized saving the CS-background business
  positioning in `docs/carnegie-hall/POSITIONING-AND-OPPORTUNITY.md`. Never send
  email from any script or routine.

## Skipped or deferred

- Nimble market-finder enrichment: Nimble CLI not installed; skip until it is.
- Phase 2 web-search fallback for school websites: done 2026-09-10 with SerpAPI
  (`scripts/search_fallback.py`); rules and counts in `docs/SCRAPING_HURDLES.md`.
  Stateless rows only ever take a Google knowledge panel, never an organic hit.

## Deferred parade ideas (earlier playbook; not current Carnegie priorities)

- More parades: Gasparilla (Tampa), National Cherry Blossom Festival Parade (DC),
  America's Hometown Thanksgiving Celebration (Plymouth, MA), Disney/Universal
  performance program participants if public, Fiesta Bowl Parade.
- News source: done for headlines (`news_east`, notes flag `news: named in local
  coverage of ...`). Not done: article bodies ("fundraising for" wording) and
  parades outside the East Coast list.
- State band director associations (FL, GA, AL, SC, NC, TN, TX): public assessment
  results, tagged `state-assessment`. Never scrape member directories.
- Tier A "why them" one-liners → `data/final/tier_a_outreach_notes.csv`. No emails.
- QA pass: done (`scripts/qa.py`; `--fix` repairs what can be repaired without
  guessing, `--network` adds the dead-URL scan). Checks: non-band, nces-prefix,
  twins, states, parades, email-domain, dead-urls. Open findings it reports but
  does not change: two Ohio schools that Wikipedia lists as "(Delaware)", and a
  stateless Westlake row that could be one of two stated Westlakes.
