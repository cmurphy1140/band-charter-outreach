# Claude Code Desktop — Start here

**Completed pilot; historical setup reference.** Claude delivered `e171954` and
Codex integrated it as `a7ceefc`. Its clean worktree is idle. Do not replay the
`39171e5` startup prompts below; they describe the completed pilot. Tomorrow's
assignment must come from the coordinator using [current progress](PROGRESS.md).
The source-budget accounting and current research-only MTC scope are recorded
there. Local nightly recaps follow [the wrap-up routine](SESSION-WRAP-UP.md);
the final whole-project audio presentation remains deferred.

Prepared September 11, 2026. Use this guide for the Claude Desktop **Code** tab.

## 1. Open the local project

1. Open Claude Desktop and select **Code**.
2. Start a new session and select **Local** as its environment.
3. Select this prepared project folder (Finder’s folder picker supports Cmd+Shift+G):

   `/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research`

4. Send the preflight prompt below first.

Desktop automatically isolates Git sessions in worktrees. Selecting the prepared folder may therefore create another checkout. Verify the actual session location before assigning writes. This behavior is documented in [Claude’s Desktop reference](https://code.claude.com/docs/en/desktop#work-in-parallel-with-sessions); the installed app’s behavior has not been tested here.

## 2. First message: check the session

Copy this block into Claude Code Desktop:

```text
Perform a read-only startup check. Do not begin research or edit files yet.

Report your actual working directory, Git repository root, branch, full HEAD,
and Git status including untracked files. Check whether CLAUDE.md resolves to
AGENTS.md and whether the assignment below and its two discovery cache inputs
exist. Verify input hashes against the assignment without reading .env files.

Expected prepared checkout:
/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research
Expected branch: feature/claude-partner-research
Expected HEAD: 39171e5fe873bca7fca3f05723a8fca9985f081b
Assignment: docs/carnegie-hall/coordination/2026-09-11-partner-pilot.md

Desktop may have created its own worktree. If any location, branch, starting
commit, instruction link or input differs, report it clearly. Do not switch,
reset, copy files, install dependencies or work in another checkout to compensate.
Finish with MATCH or MISMATCH and the evidence. Wait for the assignment prompt.
```

## 3. If Desktop reports a mismatch

Send Claude’s preflight output to the main Codex task with this message:

```text
I am using Claude Code Desktop. Here is its read-only preflight output.
Reconcile the reserved partner-pilot assignment with Desktop's actual worktree.
Verify its base and ownership, prepare only the required independent discovery
inputs, and return an updated startup prompt with the actual root and branch.
Preserve active checkouts and all unrelated changes. Do not launch another
worker, push, or remove worktrees. Claude is waiting before editing.
```

Use the coordinator’s revised prompt after reconciliation. Do not paste the
fixed-path prompt below into a mismatched session. Ignored cache inputs do not
necessarily appear in a newly created worktree; the coordinator must verify them.

## 4. If the preflight matches: send the assignment

Copy the entire block below into the same Desktop session. This is the completed
prompt from the coordinator’s current quickstart, including the parallel-task
addendum. It authorizes one local commit of the four assigned outputs.

```text
You are Claude Code, assigned task claude-partner-research. The main Codex task
"Troen Prospects Pipeline" is coordinator. Other tasks may be active: you are not
alone in the repository. Do not revert their changes or edit their checkouts.

Use only this checkout:
/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research
Branch: feature/claude-partner-research
Expected initial HEAD: 39171e5fe873bca7fca3f05723a8fca9985f081b

Before editing, verify root, branch, initial HEAD and clean Git status. Verify that
CLAUDE.md resolves to AGENTS.md. Read AGENTS.md, docs/carnegie-hall/PROGRESS.md,
docs/carnegie-hall/PARALLEL-WORKFLOW.md, the relevant PLAN/strategies 01, 02, 03, 05,
and docs/carnegie-hall/coordination/2026-09-11-partner-pilot.md. Acknowledge the
assignment and boundaries once, then proceed. If state or ownership differs,
report the mismatch rather than resetting, switching branches or overwriting work.

Research one public student-performance tour provider as a possible partner and
possible competitor. Prepare a source-backed profile and useful internal partner
sheet for Troen's March 3, 2027 Carnegie Hall POC. Use Markdown only; no app,
pipeline repair, new dependencies or demo integration is assigned.

In parallel, Codex is assigned one empty-scrape preservation guard in
scripts/run_all.py with regression tests in tests/test_run_all.py. Those files are
Codex-owned; do not edit or depend on that unfinished fix. Shared coordination
records remain Codex-owned. Defer the audio overview and NotebookLM pack updates
until project completion. Your four owned files below remain unchanged.

Your exact write ownership is limited to:
docs/carnegie-hall/research/partner-pilot/PROFILE.md
docs/carnegie-hall/research/partner-pilot/SOURCES.md
docs/carnegie-hall/research/partner-pilot/PARTNER-SHEET-DRAFT.md
docs/carnegie-hall/coordination/claude-partner-research-handoff.md

All shared plans, instructions, strategies, the assignment ledger, dependency
manifests, demo sources, tests, original data/logistics and existing outputs are
read-only. Propose needed changes in your handoff; pause only an unassigned edit
and continue independent work.

Start with the two independent read-only files in data/raw/serpapi-validation/
whose filenames and SHA-256 hashes are listed in the assignment. They contain the
existing "student music performance tours Carnegie Hall" discovery query and
metadata, not verified provider claims. Review underlying first-party sources:
at most eight distinct provider pages in this pass. Record exact URLs, dates,
source IDs and supporting passages/sections for material claims. Preserve unknowns
and distinguish planned appearances, completed performances and competitions.

Budget: zero new paid API calls and no direct SerpAPI requests. No Firecrawl,
Zyte/Apify trial, subscription, signup, CRM import, outbound message, quote request,
purchase, live refresh, deployment or background task. Never read/copy .env or
share another checkout's writable cache/environment. No server or port is assigned.
If browsing is unavailable or a source is restricted, report the limitation and
continue from valid supplied evidence without claiming fresh verification.

Use explicit organization and adult-role evidence; never invent contacts, pricing,
capacity, commissions, availability, relationships, interest or confirmed bookings.
A provider may compete with Troen. Label the partner sheet "Internal discussion
draft — unapproved and not sent." Keep March 31 terms and internal costs out of
that draft. Use employee-reported attribution and the logistics and software
developer role. Do not assign the business homework to complete this POC draft.

Check factual claims/citations, local links, scope, readability and git diff --check.
Inspect untracked files as well as the diff; only the four owned outputs may change.
Do not rebuild the application for a Markdown-only change. Record any useful
lesson with evidence and limits in your handoff.

After verification, make one conventional local documentation commit containing
only the four owned files. Do not push, merge, rebase, pull, change branches,
remove worktrees, update shared plans or stop another task's processes.
Finish with outcome, full base/final SHA, files, checks, uncertainties, API spend,
handoff path and any running processes. Mark ready for coordinator review and
stop editing until reassigned. Keep updates concise.
```

## 5. Return the result to Codex

Paste Claude’s final handoff into the main Codex task. It should include the
commit SHA, four output paths, verification results, source limitations and API
spend. Codex reviews and integrates the work. Keep the Claude session and checkout
available until that review is complete.

The local checkout is sufficient for this Local session; no GitHub push is needed
for this handoff. This guide does not launch Claude or change Git state. It is
saved in the coordinator checkout, so copy its prompt text into Desktop rather
than assuming the new worker automatically contains this guide.
