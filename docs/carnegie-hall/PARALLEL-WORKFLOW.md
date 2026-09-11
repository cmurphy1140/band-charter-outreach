# Coordinated Codex and Claude Code workflow

Accepted September 11, 2026. [Shared rules](../../AGENTS.md#working-authority-and-coordinated-handoffs) · [Current state](PROGRESS.md) · [Delivery strategy](strategies/08-iteration-and-delivery.md)

## Purpose and boundaries

Allow independent work to progress at the same time without losing data, duplicating
research, or merging incompatible changes. Start with two workers and one coordinator;
the coordinator can be one of the workers if its implementation files are separately
owned. Tools are interchangeable: choose by available capabilities, not vendor claims.

One writer per task, checkout, branch, and owned file set. Worktrees isolate working
files and Git indexes, not Git refs, accounts, API quotas, external output paths, or
production databases. A shared instruction file is a convention, not a lock.

This document defines the process. It does not launch tools, reserve ports, authorize
new purchases, or create an automation. Same-task handoffs remain sequential. The
September 10 prohibition on all Codex/Claude concurrency is superseded.

## Roles

| Role | Responsibility | Must not do |
|---|---|---|
| Coordinator | Select compatible tasks, allocate files/resources, maintain assignment ledger and shared plans, integrate one result at a time | Assume a task list proves another tool stopped; overwrite worker changes |
| Worker | Implement its bounded outcome, test, inspect its diff, preserve inputs, deliver task notes and authorized commits | Edit another checkout, self-assign shared files, merge to main, change another branch |
| Reviewer | Inspect a fixed commit/diff and report defects; run checks in an isolated review checkout if needed | Edit an active worker's files or call two models agreeing proof of correctness |

Coordinator-owned files during a parallel batch: `AGENTS.md` and its `CLAUDE.md`
link, root README, `docs/carnegie-hall/PROGRESS.md`, `PLAN.md`, reference README,
this workflow, and the assignment ledger. Assign each strategy to one owner if it
needs edits. Package manifests, lockfiles, shared schemas, normalizers, and shared
fetch utilities require explicit single ownership; there is no implied permission.

## Between-response cycle and side-chat role

Confirmed September 11, 2026: use the waiting time to review and prepare the next
small step. Codex assigns → Claude delivers → Codex reviews and integrates →
Claude receives the next assignment. Connor chooses the priorities. A completed
worker waits for review and a confirmed next assignment rather than self-assigning.

This side chat is a place to **look at what we have, talk through what needs work,
and prepare what to ask for next**. It does not automatically run alongside the
main task as a separate implementation worker or receive its latest state.

| While… | Connor and this side chat can… |
|---|---|
| Claude works | Look at the current deliverable as an outsider and identify what is clear, missing, or confusing. |
| Codex reviews | Draft a possible next task with its outcome, proposed files, inputs, and definition of done. |
| Integration runs | Identify one evidence-backed lesson and its existing documentation home. |
| Both finish | Choose the next priority from verified gaps and prepare the coordinator handoff. |

These are optional useful activities, not a checklist that must delay delivery.
Read-only inspection and draft prompts can proceed here. Proposed assignments
become active only when the coordinator confirms ownership and starting state.
Shared-file edits require an explicit scoped request and must preserve concurrent
work; this does not grant standing ownership of coordinator files to the side chat.
Pass relevant decisions and feedback to the main task explicitly. Do not assume
cross-thread synchronization, background monitoring, or automatic message delivery.

## 1. Select compatible work

Prefer outcomes that do not require each other's unfinished code. A useful candidate
pair is pipeline preservation fixes and a partner-facing demo increment. Before
starting, enumerate exact files and test files for each. Broad labels such as
"backend" and "frontend" are insufficient when both touch the same data contract.

Example allocation, proposed rather than active:

| Task | Candidate ownership | Boundary |
|---|---|---|
| Pipeline preservation | Explicitly selected `scripts/run_all.py`, scraper files, and corresponding Python tests | Temporary test inputs only; no production `data/final` rebuild |
| Partner demonstration | Selected `demo/carnegie-hall` files and corresponding Node tests | Use a reviewed snapshot; do not depend on unfinished pipeline changes |
| Coordinator | Shared plans, task ledger, dependency/schema decisions, integration | Regenerate shared final outputs only after both changes are reconciled |

If both tasks need one schema, first complete and verify that small shared change,
then start both branches from the updated base. Otherwise keep the tasks sequential.

## 2. Establish the batch and assignment ledger

The coordinator creates `docs/carnegie-hall/coordination/<batch-id>.md` when a real
batch starts. Only the coordinator edits that ledger in its checkout. Workers receive
its assignment text and acknowledge it; other worktrees do not automatically receive
later edits. Deliver changes through the active sessions and require acknowledgement.
Do not treat the ledger as an automated lock, shared live dashboard, or heartbeat.

Record these fields for each assignment:

- Task ID, exact outcome, and acceptance checks.
- Named coordinator and worker/tool/session; execution host.
- Absolute checkout path, branch, full base commit, and policy revision.
- Explicit allowed files and coordinator-reserved files.
- Input snapshots and hashes where identity matters; missing inputs.
- Local output/cache directories, environment setup, port and process ownership.
- API provider, allocated query budget, authorized external actions, expiry if any.
- Status: proposed, acknowledged, active, blocked, ready, integrating, integrated, closed.
- Last substantive update, blockers, final commit IDs, checks and handoff-note path.

Before launch inspect `git status --short --branch`, `git worktree list`, and the
relevant refs. Confirm directly which sessions are writing; app task discovery does
not cover every Claude/terminal/cloud session. Never infer ownership from inactivity
or elapsed time. Assign one task ID to each worker and retain it through transfers.

## 3. Create isolated working copies

The coordinator selects a verified integration base. Both workers start from that
same full commit unless an explicit dependency requires otherwise. Publish the new
instruction revision to their starting state before launch: an uncommitted edit to
AGENTS.md in the original checkout is invisible to a new worktree.

Coordinator command pattern, after resolving the actual values:

```sh
git worktree add -b <unique-task-branch> <new-absolute-worktree-path> <verified-base-sha>
```

Use `codex/<task>` for Codex and `feature/<task>` or `fix/<task>` for Claude unless
an explicit name is requested. Mac worktrees live beneath
`~/Desktop/Projects/band-charter-outreach-worktrees/`. Do not reuse a path or branch
already assigned to another task; do not use `--force`. Retained integration
worktrees are reusable only after their owner, cleanliness, and branch state are checked.

Each worker verifies its actual root/branch/base, reads AGENTS.md, and verifies that
CLAUDE.md resolves to it. If a platform cannot preserve symlinks, explicitly provide
the canonical content and record the limitation rather than let the instructions drift.
Untracked sources, ignored credentials, manual outputs, and .venv do not travel with
the commit. Transfer only necessary authorized inputs, without overwriting existing files.

## 4. Isolate runtime and external effects

- Create an environment per worktree. Do not share writable `.venv`, `node_modules`,
  build folders, caches, or generated outputs through symlinks. Tool-managed immutable
  package caches may be shared; install from the project's existing manifests.
- Inspect scripts for absolute output paths and environment variables before running
  them. Ensure writes resolve inside the assigned worktree or its task scratch directory.
- Treat original data/logistics as read-only inputs. Use snapshots and temporary files
  for scraper failure tests. Production refreshes are a coordinator-only, separately
  scoped operation after preservation checks pass.
- Choose an available localhost port per running service; record its PID and command.
  Example candidates are 8766 and 8767, not guaranteed reservations. Never kill a
  process merely because its port is desired. Stop only a process owned by this task.
- Mock API calls during tests. Budget live research centrally: one worker owns each
  query batch, logs the query purpose and observed spend, and retains source evidence.
  Separate caches do not prevent duplicate paid searches; share reviewed results via
  snapshots rather than a concurrently writable cache. Unknown remaining quota means
  defer additional paid calls until the coordinator resolves it.
- Keep keys in the authorized secret mechanism; do not put them in task prompts,
  commits, manifests, logs, or handoff notes. Do not bulk-copy .env into other hosts.
- No concurrent writes to the same CRM, spreadsheet, database, storage destination,
  or deployment. Use separate sandbox destinations where authorized; otherwise serialize.

## 5. Execute and coordinate

Workers stay inside their allocation and keep related source/tests together. They
may prepare proposed shared-doc changes in their own task note, but the coordinator
applies them. At a useful milestone send outcome, changed paths, checks, and blockers;
keep detailed evidence in `docs/carnegie-hall/coordination/<task-id>-handoff.md`, a
file assigned exclusively to that worker. Do not edit the coordinator's PROGRESS.md.

If an unassigned file is needed, pause that dependent edit and notify the coordinator.
Continue independent work. The coordinator either transfers ownership with both
workers' acknowledgement, creates a prerequisite task, or serializes the affected work.
Do not resolve ownership by racing to finish first.

Workers do not rebase, merge, pull, cherry-pick, switch another checkout's branch,
change remotes, or update main while active. If a base update becomes necessary,
checkpoint and pause; the coordinator agrees the update procedure, then the worker
performs it in its own checkout and reruns affected checks. No force-push shortcuts.

## 6. Submit a reviewable result

A ready handoff includes:

- Task/outcome, base and final commit IDs, owned files actually changed.
- Tests and commands run, results, platform-specific checks still missing.
- Added dependencies, schema changes, generated artifacts, and manual-edit handling.
- Sources, uncertainties, API spending, and evidence paths without secrets.
- Tracked/untracked/ignored files worth preserving and still-running processes.
- Proposed plan/status changes and any discovered reusable lesson.

Commit only under the applicable authorization; do not bundle unrelated changes.
This workflow update itself does not commit anything. An uncommitted result can be
reviewed as a patch plus explicit untracked artifacts, but it must be preserved
before integration. A branch name is not evidence that the result was committed.

## 7. Integrate one result at a time

1. Coordinator marks one task integrating and verifies the worker's final ref is
   stable. Freeze that task's edits while reviewing; other independent tasks may continue.
2. Inspect its full diff, ownership compliance, source attribution, dependencies,
   generated files, and targeted check results. Resolve substantive defects first.
3. In an exclusively owned clean integration checkout, create an integration branch
   from the current target ref. Merge the completed task branch, or apply an explicitly
   selected reviewed commit sequence; record which route was used. Do not mix routes
   for the same changes or lose a fix by taking an older worker ref.
4. Resolve conflicts deliberately with the relevant task owners. Never accept all
   "ours" or "theirs" to make a conflict disappear. If uncertain, preserve the result
   and abort the merge; do not reset another task's work.
5. Run targeted tests plus checks for combined behavior. If both branches touch
   data-to-document behavior, verify that flow even when Git reports no text conflict.
   Reconcile shared outputs and manual edits by stable IDs; never overwrite them blindly.
6. Integrate the second task and repeat combined checks against the new base. Update
   shared records, decisions, sources, and accepted lessons once the combined result is verified.
7. Advance/push the target only within actual authorization. Use a normal fast-forward
   where possible and verify the resulting SHA. If main advanced, incorporate that
   change and rerun relevant checks. An earlier publication request is not blanket
   permission for unrelated future deployments or outbound actions.

If main is checked out elsewhere, do not force-update its ref with `branch -f`.
Coordinate with that checkout's owner and fast-forward only when clean and idle.
Do not update the current checkout underneath a running writer or watcher.

## 8. Close or recover

Before removal, preserve committed work, untracked research, ignored outputs, and
manual edits. Confirm integration by commit ancestry or an explicitly reviewed
cherry-pick mapping; commit titles alone are insufficient. Stop task-owned services.
Remove the worktree only within authorized cleanup scope and never with a dirty-work
force option. Remove branches only after their contents are accounted for.

If a worker stalls, mark it blocked and preserve its checkout. Reassign only after
confirming its writer and file-writing jobs have stopped. A timeout is not a lock
release. A tool transfer keeps the task's ownership exclusive; independent tasks
may keep running. Cloud return requires an accessible ref/patch and verified input
receipt; it does not automatically update the Mac.

## Copy-ready startup and completion instructions

Coordinator fills the assignment fields above before sending this to either tool:

> Read AGENTS.md and docs/carnegie-hall/PARALLEL-WORKFLOW.md. Work only in the assigned
> checkout and branch. Verify the base and acknowledge your allowed files, protected
> paths, output directory, port, and API budget before editing. Other workers may be
> active: do not revert their work or edit their checkout. Implement the assigned
> outcome, test it, and report any required ownership change before making it. Submit
> your exclusive task handoff note and proposed shared-document updates. Do not merge
> to main, push, deploy, or remove worktrees without task authorization.

Completion message format: task ID; result; base/final SHA; changed paths; verification;
remaining limitations; handoff note; live processes/resources; ready or blocked.

## First-run success criteria

Two acknowledged assignments; no overlapping writers; no unintended shared writes;
no duplicate paid query batch; targeted checks and combined checks pass; manual inputs
preserved; one traceable integration; ownership released explicitly. Record any
friction and simplify the next batch. These are acceptance criteria, not completed results.
