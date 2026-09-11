# 08 — Iterative development, verification, and delivery

[Strategy index](README.md) · [Tools and Superpowers](../TOOLS-AND-CONNECTORS.md) · [Historical audit](../../AUDIT-2026-09-10.md)

## Purpose

Make the POC impressive through repeated improvements to a small useful result. The practical sequence is **sketch → inspect → build a useful increment → verify → revise**. The logistics and software developer can inspect and shape the work before it reaches Troen. Business feedback is valuable after there is something concrete to react to; it is not a prerequisite for every internal draft.

The [first connected example](../../../demo/carnegie-hall/README.md) now exercises this discipline: reviewed research, an editable director sheet, and an interactive fictional follow-up. This is an initial local prototype, not completion of every deliverable or repair of the legacy application. Current checks and limits are recorded in [PROGRESS.md](../PROGRESS.md).

## Where Superpowers helps

Superpowers supplies structured guidance for design, planning, debugging, testing, and verification. The installed skills can help keep a coding task bounded and make completion claims depend on evidence. It is **not necessary to install another process plugin**, and no plugin guarantees correct software or accurate business claims. The [tools map](../TOOLS-AND-CONNECTORS.md) records availability and the recommended scope.

Use relevant practices when they serve the increment. For a new interface, sketch the experience and resolve meaningful choices. For a parser defect, reproduce the failure before changing code. For a completed feature, run checks that exercise the behavior. For these documentation edits, verify content, links, and preservation rather than inventing application tests.

The installed brainstorming workflow contains approval and commit instructions. The user's current standing authorization governs this project: routine work and carefully scoped, verified local commits can proceed without repeated permission. Use suggestions to surface meaningful choices while keeping routine work moving. The earlier per-commit request requirement has been superseded for this project; narrower instructions still apply to the task that gives them. No mandatory enforcement system has been configured.

## Suggested increments

| Increment | Inspectable result | Verify before expanding |
|---|---|---|
| A. Event foundation | A clear March 3 narrative with traceable claims | Date/session scope, source links, report versus evidence labels |
| B. One opportunity | A profile with a specific relevance signal and current adult-role evidence | Institution identity, contact attribution, unknowns, useful next action |
| C. Connected material | That profile links to an appropriate editable example | Facts agree, no unsupported promises, document opens and renders |
| D. Workflow example | Synthetic approval/payment/supplier states produce sensible actions | No false booking, no duplicate ensemble, illustrative labels survive exports |
| E. Local experience | A short walkthrough connects the five outputs | Navigation, keyboard/mobile use, exports, source access, visible example status |
| F. Small batch and repeatability | Varied cases and one useful local transformation | Same-name schools, missing data, repeated runs, failures, preserved originals |

The sequence is a recommendation. Market comparison can progress independently of several increments. Do not require a whole new specification for every copy correction; do record a material scope change before it spreads through the project.

## A practical engineering loop

Use the [project Git workflow](../../../AGENTS.md#git-workflow): one branch per coherent implementation effort, with worktrees for separately authorized concurrent tasks or needed isolation. Codex and Claude Code always work sequentially, even across worktrees; their handoffs can normally use the same checkout. Related code, tests, and documentation belong together. A branch/worktree is not a saved checkpoint. Standing permission allows carefully scoped local commits, and other Git actions must fit the task's authorization. Preserve uncommitted inputs and account for shared external services.

1. **Read the current state.** Inspect project instructions, relevant code/documents, the current branch, working-tree changes, registered worktrees, other active tasks using the checkout, and the strategy for the chunk. Preserve unrelated work and source assets; establish clear file ownership before overlapping edits.
2. **State the smallest outcome.** For example: a selected school profile opens its source list and matching material. Avoid an open-ended task such as “build the complete platform.”
3. **Predict the result and failure modes.** Identify the specific behavior to change, the data it touches, and what a failure should look like. For visual work, record the starting screenshot and verified asset paths.
4. **Implement in existing patterns.** Reuse approved dependencies, work in small files/functions, and avoid unrelated refactors. Fix or bypass the audited paths that affect this result.
5. **Verify the changed behavior.** A real logic change needs a meaningful test or direct exercise of the case. Inspect generated documents and screenshots as appropriate. Test names and comments are not evidence that behavior works.
6. **Review the result against the user purpose and integration scope.** Does it explain something useful to Troen? Is it accurate, readable, and coherent? Inspect tracked and untracked changes for unintended data, credentials, and generated files. Fix high-impact issues before polishing small details. Make a local commit when a coherent verified result is worth preserving under the user's standing authorization; do not combine unrelated or unfinished changes. Keep integration within the task's authorized scope.
7. **Update the living references and handoff.** Revise the affected strategy or plan as the result changes our understanding. Record the artifact, what works, verification, illustrative behavior, remaining limitations, next useful increment, and a short dated reason for material choices in [PROGRESS.md](../PROGRESS.md). Never describe a planned connector or script as running.

Treat each increment as a learning opportunity with the logistics and software developer. Use the visible result to explain the relevant technical tradeoff, invite a useful reaction, and adapt the next step. Preserve confirmed collaboration refinements in the [shared instructions](../../../AGENTS.md); keep a tentative preference tentative and technical discoveries in their relevant strategy/evidence record. Do not turn every conversation into another rule or require repeated approval for already authorized work.

For a Codex/Claude Code transfer, use the [sequential handoff rules](../../../AGENTS.md#working-authority-and-sequential-handoffs). Record the exact working state and next task in PROGRESS.md, account for file-writing processes, and confirm the outgoing tool has stopped before the receiving tool resumes. A shared file or worktree is not a concurrency lock.

## iPhone and cloud handoffs

The logistics and software developer will sometimes continue from an iPhone. The agent handles the bookkeeping so a change of device does not become another planning exercise. First establish where the work is actually running:

| Session | What the agent should verify |
|---|---|
| Cloud task | Its own repository checkout, selected branch/base commit, provided inputs, dependencies, and access settings. Desktop files require an explicit transfer route. |
| Phone using Remote | The connected host and actual checkout. If it is the Mac, its local files remain on that Mac; Remote depends on the host remaining available. |
| Conversation without repository tools | Which supplied documents can be read. Analysis can continue, but file edits and Git actions cannot be claimed. |

OpenAI documents a separate container and selected repository checkout for cloud tasks. Remote instead uses the connected host's files and tools; availability depends on setup and the host being awake and online. These product descriptions do not verify this project's account configuration or phone access. Sources checked September 10, 2026: [cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment), [Remote connections](https://learn.chatgpt.com/docs/remote-connections).

**Prepare the outgoing work.** Finish the current edit and account for file-writing processes. Update [PROGRESS.md](../PROGRESS.md) with the tool/host, exact branch and base commit, modified/untracked files, available evidence, checks, services, and one next task. Keep the same effort sequential across Mac and cloud; Codex and Claude Code never operate concurrently on this project.

**Carry a small, sufficient set of inputs.** Include `AGENTS.md`, its `CLAUDE.md` link when supported, PROGRESS.md, the relevant strategy, and necessary code or reviewed examples. A cloud checkout sees the selected repository state, not every change sitting on the Mac. A local commit alone does not make it remotely available. Use a repository ref accessible to the destination or a supported patch/file handoff within the task's authorization, recording the base commit and checking the files that arrive. Preserve work that does not belong to this increment. Prefer sanitized evidence extracts and stable source IDs when private contracts, correspondence, payment details, or student information are unnecessary. Keep originals unchanged locally; label unavailable sources rather than claiming to have inspected them.

**Resume using the environment that exists.** Inspect the actual root and Git state before following a saved path. Use repository-relative paths and the cloud's assigned workspace; the Mac worktree location is a Mac convention. Read the shared instructions and verify the instruction link. Local global guidance, plugins, `.venv`, native apps, browser sessions, and credentials are not assumed present. Use available equivalents where appropriate, record material differences, and continue independent work if one input is missing. For example, a cloud task may prepare an editable document while a required Mac Word rendering check remains pending. Do not describe that unchecked export as verified.

**Return an inspectable result.** Preserve the changed-file diff or commits and any generated artifacts through a supported destination before leaving the cloud task. Include the base commit, output locations, checks actually run, limitations, and next step. On the Mac, inspect current local changes, compare the base, review the incoming files, and integrate only within the authorized scope. Resolve conflicts without discarding local edits. Run relevant checks, including any deferred platform-specific checks, and then update PROGRESS.md. Neither a finished cloud response nor a branch name proves the Desktop checkout has changed.

**Make phone interaction easy.** Lead with the useful outcome, one next step, and any decision actually needed. Provide an artifact attachment, preview, or authorized repository link accessible in that session; do not present a Mac-only path as a working phone download. Keep fuller evidence in the project documents. Apply existing discretion without repeat approvals; surface useful suggestions without launching unrelated work.

Before the first actual cloud session, prepare this small handoff set as part of the selected increment and verify it opens at the destination. This is the recommended preparation step, not a claim that cloud access, uploads, pairing, or synchronization are already configured.

## Verification layers

**Evidence:** all current claims have sources and correct scope; employee-reported facts remain attributed; March 31 examples do not become March 3 facts; no provider advantage is invented.

**Data:** institutions and ensembles remain distinct, contact roles are correct, unknown values stay unknown, partner/direct duplicates do not inflate counts, and original data survives failed refreshes.

**Documents and interface:** dates and descriptions agree across outputs; editable sources and delivery copies match; links open; long/missing values remain readable; source/private material is separated from shareable examples.

**Implemented automation:** verify the actual run, changed inputs, failure behavior, and repeated runs. Scheduling requires a separate verified activation; a workflow file or proposed reminder is not proof of a running job.

Run the checks relevant to the change. Once they pass, broaden testing only for a new concern. Do not consume time repeatedly rechecking untouched code while the essential demonstration remains unfinished.

## Measure value without assigning a study to Troen

Record preparation time, review time, corrections, source completeness, and usability observations during development. Compare similar outputs when a credible baseline exists. The 20–40% preparation-time estimate remains an **untested planning hypothesis**, including no guarantee that setup yields net savings immediately.

After real use begins, distinguish preparation efficiency from business results. Replies, approvals, and bookings depend on many factors beyond software. Channel-specific results may guide effort later; the initial sample is too small and selected to prove conversion superiority.

## Delivery and next decision

Package the local demo, workbook, editable documents, checked delivery copies, and a concise readme when those artifacts have been built. Provide one clear start point and keep the deeper strategy/evidence references available. Rehearse the connected example with a clean local start so missing files or inaccessible accounts do not surprise the viewer.

Use business feedback to choose the next useful increment. Resolve only the [activation facts](../INTERNAL-DECISIONS.md) for the desired use. Exercise the granted discretion for local checkpoints; treat publication, deployment, outbound messaging, plugin installation, and account changes according to their actual authorization and effect. Completing an iteration is not a reason to launch unrelated activity.
