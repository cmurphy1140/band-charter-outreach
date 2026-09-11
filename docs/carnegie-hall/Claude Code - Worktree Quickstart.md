# Claude Code worktree quickstart

Prepared September 11, 2026. A practical companion to [the parallel workflow](PARALLEL-WORKFLOW.md).

## Selected assignment

The main Codex task is preparing the reserved
[partner research pilot](coordination/2026-09-11-partner-pilot.md). Its exact four
output paths, source inputs, acceptance checks and zero paid-call budget supersede
the proposed alternatives below. The worktree will start from the commit containing
these reviewed setup documents. The coordinator supplies the full SHA and completed
startup prompt after creating and verifying it. Claude remains unlaunched.

## What this sets up

Codex remains the coordinator and continues its existing work. Claude Code gets its
own branch and folder for one bounded task. This guide does not create that folder,
launch Claude, assign live ownership, or commit anything.

At preparation, the original checkout was on `codex/research-reliability-plan` with
uncommitted plan/instruction changes. `PARALLEL-WORKFLOW.md` was untracked. The retained
`main-integration` worktree was detached. Recheck all of this at launch; do not assume
creating a worktree from HEAD will include those working changes.

## 1. Ask the main Codex task to prepare an assignment

Paste this into the main task:

> Prepare Claude Code's first independent worktree task using
> docs/carnegie-hall/PARALLEL-WORKFLOW.md and this quickstart. Act as coordinator.
> Recommend the partner-research pilot below unless it overlaps current work.
> Reserve exact files, confirm no other writer owns them, and record the task,
> base SHA, branch, checkout, inputs, verification, and external-service budget in
> the assignment ledger. Ensure the accepted concurrency rules and needed current
> plans are included in Claude's starting state. Create the dedicated worktree
> when the assignment is ready. Preserve all unrelated and uncommitted files.
> Return the actual launch command and completed assignment. Do not launch Claude
> or push anything as part of setup.

The coordinator should create a small, deliberately staged setup commit if authorized,
not commit every working change. A valid alternative is an explicitly inventoried
patch/input transfer to the new worktree, including untracked documents and any
symlink change. Record and verify the transferred files. The recipient must not
silently operate under an older rule that prohibits concurrency.

## 2. Inspect Git before creating anything

These commands inspect the original checkout; they do not switch its branch:

```sh
cd "$HOME/Desktop/Projects/band-charter-outreach"
git status --short --branch
git worktree list
git log -1 --format='%H %s'
git branch --list
```

Confirm the main Codex task is the coordinator. A clean Git tree does not prove no
agent is running. Do not reuse the coordinator's checkout, detached integration
folder, branch, or open server. Never stash/reset its changes to simplify setup.

## 3. Create Claude's worktree from the agreed base

Coordinator only, once the setup inputs and ownership are ready. The branch and path
below are proposed for the partner pilot; use the actual agreed values. If they
already exist, inspect them and choose a new unique name rather than force reuse.

```sh
cd "$HOME/Desktop/Projects/band-charter-outreach"
# Paste the full verified starting commit supplied by the coordinator:
printf 'Verified base SHA: '
read -r TROEN_BASE_SHA
git show --no-patch --format=fuller "$TROEN_BASE_SHA"
```

After verifying it is the intended commit:

```sh
mkdir -p "$HOME/Desktop/Projects/band-charter-outreach-worktrees"
git worktree add -b feature/claude-partner-research \
  "$HOME/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research" \
  "$TROEN_BASE_SHA"
```

Do not replace the base with `main` or `HEAD` just because that is convenient. Both
workers need an agreed baseline and compatible data contracts. Git worktrees share
refs and history, but each has separate working files and an index.

## 4. Verify and open Claude in the correct folder

In a separate terminal:

```sh
cd "$HOME/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research"
pwd
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
ls -l AGENTS.md CLAUDE.md
cat docs/carnegie-hall/PARALLEL-WORKFLOW.md
command -v claude
```

The branch must be the assigned branch, and the root must be Claude's folder.
CLAUDE.md should resolve to AGENTS.md. The instructions must allow coordinated
parallel work. Expected transferred input changes should match the assignment;
unexplained changes are a reason to pause, not discard them.

If `claude` is available, launch it from this directory:

```sh
claude
```

This is a plain terminal launch, not a nested automatic worktree request. If the
launcher is unavailable, report that to the coordinator rather than improvising
an installation or starting inside the original checkout.

## 5. Paste the startup prompt

Paste the coordinator's completed assignment first, followed by:

```text
You are the Claude Code worker for this project. The main Codex task is coordinator.
Other tasks may be active. You are not alone in the repository; do not revert others'
changes or edit their worktrees.

Read AGENTS.md, docs/carnegie-hall/PARALLEL-WORKFLOW.md, current PROGRESS.md, and the
strategy relevant to this assignment. Verify your actual root, branch, base SHA,
allowed files, inputs, and resource budget against the supplied assignment. Report
any mismatch before editing. Acknowledge the boundaries once, then proceed with
work already authorized; do not repeatedly ask for permission.

For the partner pilot, research one public student-performance tour provider and
prepare a source-backed potential partner profile and an internal partner-sheet
draft for Troen's March 3, 2027 Carnegie Hall proof of concept. A provider may be a
competitor as well as a possible partner. Establish only what public evidence
supports; do not infer interest, an existing relationship, or exclusivity.

Own only the coordinator-approved partner-pilot files and your task handoff note.
Do not edit the shared instructions, PROGRESS.md, plans, strategies, dependency
manifests, demo sources, legacy pipeline, prospect CSVs, or existing client outputs.
If another file is needed, explain why to the coordinator and pause that edit.
Continue independent work.

Use supplied evidence and public first-party sources with dates and exact URLs.
Keep documented facts, employee reports, suggestions, and unknowns distinct. Do
not invent contact details, prices, capacity, confirmed bookings, or availability.
No paid API calls unless a specific query budget is assigned. Do not read/copy .env
or make outbound contact, CRM imports, account changes, or live refreshes.

For this first assignment, default to Markdown deliverables requiring no new runtime
or dependency. Do not build a separate app. Provide a source trail, useful fit and
conflict considerations, a concise partner-facing draft labeled internal/unapproved,
and a concrete next action. Check all factual statements against their cited sources.
Record any useful workflow lesson with evidence and limits in the handoff note.

Run only relevant verification. Honor the assignment's commit instructions; if
commits are authorized, inspect and stage only owned files. Do not push, merge,
rebase, switch branches, remove worktrees, or stop another task's processes.

Finish with: outcome, base/final SHA if committed, changed files, verification,
remaining uncertainties, API spend, handoff-note path, and running processes.
Mark the task ready for coordinator review, then stop editing until reassigned.
Keep conversation updates concise.
```

## 6. Good first tasks to offload

These are proposed tasks, not active assignments. Choose one; the coordinator must
reserve the paths and confirm they remain available before launch.

| Task | Suggested exclusive outputs | Acceptance check | Dependency/overlap |
|---|---|---|---|
| **Partner research pilot — recommended** | `docs/carnegie-hall/research/partner-pilot/PROFILE.md`, `SOURCES.md`, `PARTNER-SHEET-DRAFT.md`; `docs/carnegie-hall/coordination/claude-partner-research-handoff.md` | One researched provider; each factual claim traced; fit/conflicts and unknowns explicit; useful draft without invented offer details | Low overlap; Codex integrates it into the demo later |
| Provider comparison research | `docs/carnegie-hall/research/provider-comparison/COMPARISON.md`, `SOURCES.md`; its own assigned handoff note | Compare three providers on equivalent event/service dimensions; mark unavailable pricing and incomparable inclusions | Reserve distinct providers/query batches so it does not duplicate the partner pilot |
| PDF extraction feasibility | `docs/carnegie-hall/research/pdf-feasibility/REPORT.md` and explicitly assigned sample extracts | Assess two permitted public festival/assessment PDFs; verify school names, rating, year, and extraction errors against originals | Inventory tools first; no pipeline integration, new paid service, or dependency change without assignment |
| Refresh-preservation regression work | Coordinator-selected new test file and its handoff note; production files only if separately assigned | Reproduce failed-source and same-name-school cases with mocks/temp data; show expected vs actual outcomes | Higher overlap with reliability plan; findings/tests may intentionally fail and must not be merged blindly |

For reliability work, read the current audit and repaired code first. Do not re-report
SerpAPI credential-error handling as unfixed solely because it appears in the old audit.
A research-only assignment should not grow into a scraping-platform migration.

## 7. Runtime and cost logistics

The recommended Markdown research task needs no development server or dependency
installation. For later code tasks, create a separate environment in Claude's worktree
and install from its existing lockfiles/manifests. Do not share a writable .venv or
node_modules with Codex. Inspect build scripts for absolute paths before running them.

Assign a free port only when needed; do not assume 8765/8766 is available. Record the
PID and serve only the intended folder. Never use `killall` to resolve a port clash.

Separate worktrees do not separate API budgets. Default the first task to zero paid
queries. If a budget is granted, the coordinator reserves queries and the worker
records spend without secrets. Existing reviewed cache can be copied deliberately
as a read-only snapshot; do not share a writable cache or copy the whole .env.

## 8. Review, commit, and integration

Worker inspection commands:

```sh
git status --short
git diff --stat
git diff --check
git diff
```

Untracked files are not shown by `git diff`; inspect them explicitly. When commits
are authorized, stage named owned files, inspect `git diff --cached`, then make a
small conventional commit. Avoid `git add .`. If the assignment leaves work
uncommitted, return the changed paths and preserve a patch plus untracked artifacts.

The coordinator reviews one stable worker result at a time in an exclusively owned
integration checkout. It checks ownership, evidence, unintended changes, and relevant
tests, then integrates and checks combined behavior. Claude does not merge into main.
Git reporting no conflicts does not prove that data contracts or generated documents agree.

If both tasks need one file, stop the conflicting edit and let the coordinator
transfer ownership or serialize that portion. Do not solve it by copying entire
folders between worktrees. Never force-push, discard another task's changes, or
resolve every conflict by selecting one side wholesale.

## 9. Finish and clean up deliberately

After integration, the coordinator verifies commit ancestry (or reviewed cherry-pick
mapping), preserves untracked/ignored outputs and manual edits, and confirms the
worker and its writing processes stopped. Only then, with cleanup authorization:

```sh
cd "$HOME/Desktop/Projects/band-charter-outreach"
git worktree remove "$HOME/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research"
git branch -d feature/claude-partner-research
```

If either command refuses, inspect why. Do not add force flags. A worktree is not a
backup, and a local commit is not a remote backup. Push and remote verification are
separate authorized actions. Keep useful research and handoff notes before cleanup.

## Ready-to-start checklist

- Coordinator identified and assignment acknowledged.
- Unique branch/worktree; correct base and current instructions verified.
- Exact owned paths, inputs, acceptance checks, and query budget recorded.
- No writer overlap; no shared mutable outputs or services.
- Claude opened from its own worktree with the completed assignment.

## Preparation record

The side conversation originally created only this guide. The main task now has
explicit authorization to commit the intended setup documents and create the
reserved worktree. The selected assignment above is the current source for exact
ownership; completed setup and launch details will be recorded after verification.
