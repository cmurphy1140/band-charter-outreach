# End-of-session wrap-up and NotebookLM pack

Accepted September 11, 2026. Trigger: Connor says “wrap up,” “done for today,”
“finish for tonight,” or otherwise explicitly ends the working session. Carry out
this routine within the current task authority without asking again whether a pack
is wanted. This is an instruction-driven routine, not an app-close hook, scheduled
job, background monitor, or automatic message to another session.

The nightly audio recap is now wanted. It is distinct from the final whole-project
presentation previously deferred until completion. Keep that final presentation
deferred; do not use nightly packaging to expand the implementation scope.

## Order of operations

1. Provide the Claude shutdown prompt below. If the worker is already confirmed
   idle, use its current handoff; do not restart it just to stop it again.
2. The coordinator finishes or safely pauses its increment, performs proportionate
   verification, and updates the authoritative progress record. Preserve all
   unfinished work. Commit only under applicable authorization; narrower “do not
   commit” instructions prevail. A wrap-up request alone does not authorize a push.
3. After the checkpoint, generate the source PDFs from current files. If another
   writer is still active or its state is unknown, label the pack provisional and
   record the cutoff and missing status rather than claiming a completed shutdown.
4. Give each ZIP its own timestamped folder under repository-root `notebooklm/`:
   `notebooklm/YYYY-MM-DD_HHMMSS±HHMM-troen-audio-overview/` containing
   `YYYY-MM-DD_HHMMSS±HHMM-troen-audio-overview.zip`. Keep Sources and Instructions
   separate inside the archive. Use the actual capture time and timezone offset.
   Keep the ready-to-upload `Sources/` and separate `Instructions/` beside the
   ZIP in the same iteration folder. All package materials belong here, never
   scattered under docs/carnegie-hall. The ZIP contains those same source and
   instruction files; no extraction is required to upload the prepared sources. Do not overwrite earlier snapshots. Existing migrated
   packs use their file modification time; that is not a new evidence review date.
5. Verify source hashes before and after export, readable/extractable PDF text,
   representative rendered pages, file inventory, and ZIP integrity. Retry changed
   source exports or identify the pack as inconsistent; do not silently mix states.
6. Return the ZIP link, what to upload, both copy-ready shutdown prompts, and one
   morning restart prompt. Report what was actually stopped/saved and any exceptions.

Do not send prompts to other sessions unless explicitly authorized. Displaying
prompts does not stop agents. Do not remove worktrees or stop unrelated processes.
Only the coordinator packages shared project state; an assigned worker returns
its handoff and leaves shared plans and pack generation to the coordinator.

## Pack contents

Sources: current PDF conversions of the following repository-relative documents:

- docs/carnegie-hall/PROGRESS.md
- docs/carnegie-hall/PLAN.md
- docs/carnegie-hall/BUSINESS-CONTEXT.md
- docs/carnegie-hall/POSITIONING-AND-OPPORTUNITY.md
- docs/carnegie-hall/PARALLEL-WORKFLOW.md
- docs/carnegie-hall/START-HERE-LEARNING.md
- demo/carnegie-hall/README.md
- demo/carnegie-hall/exports/Troen - Wando Research Note.md
- demo/carnegie-hall/exports/Troen - Wando Director Sheet.md
- docs/carnegie-hall/research/partner-pilot/PROFILE.md
- docs/carnegie-hall/research/partner-pilot/SOURCES.md
- docs/carnegie-hall/research/partner-pilot/PARTNER-SHEET-DRAFT.md
- The current opportunity workbook linked by the demo README: PDF export or a
  clearly labeled searchable cell transcription. Verify the actual current path.

Adjust the inventory when deliverables change; preserve the key engineering and
business context. Never substitute an old pack for current sources. Record missing
files explicitly. Do not bulk-copy credentials, caches, or original attachments.

Instructions: PDFs containing the audio customization prompt, upload directions,
source manifest (capture time, paths, hashes, Git base and dirty-state disclosure),
and the two shutdown prompts plus morning restart prompt. All ZIP members are PDFs.
Keep instructions out of NotebookLM's factual source set.

Tell Connor: upload only the ready-to-use Sources PDFs and paste the customization
prompt into the audio instructions. If using the ZIP on another device, extract
it first. Generate no audio or external upload unless
requested. Describe Connor as a pragmatic software engineer, not a junior developer.

## Claude shutdown prompt

```text
Wrap up for tonight. Stop editing and preserve your checkout.
Report your actual execution host, checkout path, branch, full HEAD, Git status,
uncommitted/untracked work, handoff location, and running processes. Stop only
processes you started for this task. Preserve work within existing authorization;
do not push, sync, remove worktrees, or edit coordinator-owned files.
If idle already, confirm that without starting another task. Wait for Codex's
next bounded assignment tomorrow. Keep the response concise.
```

## Codex coordinator shutdown prompt

```text
Wrap up for tonight using docs/carnegie-hall/SESSION-WRAP-UP.md.
Finish or safely pause the current increment and preserve unrelated work.
Verify the intended result. Commit completed work only where current permission
allows it; honor any narrower no-commit instruction. Do not push or remove worktrees.
Update PROGRESS.md with verified outcomes, remaining work, checkout/branch/commit
state, Claude's confirmed or unknown status, processes, and one next action.
Prepare and verify the fresh PDF-only NotebookLM ZIP after that checkpoint,
including the pragmatic-engineer audio prompt and both shutdown/restart prompts.
If a worker is not confirmed stopped, label the pack provisional.
Return the ZIP link, upload instructions, and short morning restart prompt.
Do not begin another implementation task or message another session automatically.
```

## Morning restart prompt

```text
Resume from the latest PROGRESS.md and SESSION-WRAP-UP.md checkpoint.
Verify the current execution host, checkout, branch, HEAD, Git status, and
worker ownership before editing. Summarize the checkpoint and continue its one
next authorized action. Keep Claude idle until you confirm a bounded assignment
and its starting state. Preserve unrelated work and existing permission limits.
```

## NotebookLM audio customization prompt

The source PDFs are evidence; this block is a generation instruction.

```text
Create an end-of-session audio overview for Connor, a pragmatic software engineer building a proof of concept for Troen Student Performance Events.

Use two conversational hosts. Aim for 12–15 minutes. Discuss the project as thoughtful engineering colleagues: concrete decisions, tradeoffs, evidence, and business usefulness. Avoid beginner framing, hype, excessive jargon, and reading file paths or commit hashes aloud.

Explain WHY the system works this way, not merely WHAT files exist. Respect Connor’s technical judgment while making the reasoning easy to follow through concrete examples.

Use the supplied documents as evidence. Prefer the latest dated, verified status over older plans. Clearly distinguish implemented behavior from proposed work; passing checks from unresolved risks; real research from fictional demonstrations; local changes, commits, integration, and remote publication; and business evidence from assumptions.

If information is missing or contradictory, say so briefly. Do not invent progress, measured savings, customer interest, or bookings.

Cover these 10 points in order. Spend roughly the first half on engineering logic, then pivot to the deliverables and their value for Troen.

1. THE PROJECT’S PURPOSE AND BOUNDARY
Explain the March 3, 2027 Carnegie Hall proof of concept: turning scattered research and event information into useful, inspectable materials. Describe the outcome, constraints, and current scope. Explain why a bounded working example is useful before broader automation.

2. TRACE ONE RECORD THROUGH THE SYSTEM
Follow Wando from public sources through reviewed evidence, the structured record, and generated research note and director sheet. Explain human judgment, source connections, and retained uncertainty. Editing a generated document does not automatically update its underlying record.

3. THE ARCHITECTURE AND ITS TRADEOFFS
Explain structured data, shared validation, document generators, the workbook, and static demonstration. Discuss why they fit this problem and the maintenance costs of separate builders. Explain what could justify a more complex application without assuming expansion is inevitable.

4. RELIABILITY, PRESERVATION, AND VERIFICATION
Explain the empty-scrape failure scenario: no usable results should not erase useful existing data. Describe what actual verification establishes and what remains unresolved, including partial results, identity, freshness, and output consistency where supported. Connect tests to failures rather than reciting counts.

5. HOW PARALLEL ENGINEERING STAYS COORDINATED
Explain the coordinator, bounded assignments, separate worktrees, file ownership, review, and integration. Worktrees share history but not automatically uncommitted changes or ignored inputs. Local and cloud environments may differ. The side conversation inspects results, discusses decisions, and prepares assignments while ownership stays explicit.

Then pivot naturally: “That explains the engineering foundation. What does Troen actually receive, and what could it help them do?”

6. THE EVENT BRIEF AND POSITIONING
Explain how supplied logistics become a clear March 3 brief. Separate documented facts, employee reports, shared-brochure descriptions, and unconfirmed terms. Do not treat March 31 details as confirmed March 3 arrangements. Focus on making the offer understandable.

7. THE OPPORTUNITY WORKBOOK
Explain reviewed candidates, evidence, unknowns, and next actions. Traceability, correct identities, and editable records matter more than prospect count. Research does not imply interest, suitability, permission to contact, or booking. Explain decisions the artifact could support without claiming adoption.

8. THE DIRECTOR AND PARTNER MATERIALS
Explain translating the same evidence for different audiences. Music Travel Consultants (MTC) illustrates partner-research capability. Keep its Troen relationship and NYIMF event match unconfirmed unless newer evidence establishes them. Do not expand this glimpse into outreach strategy, a contact recommendation, or another obligation.

9. THE CONNECTED DEMONSTRATION AND PRACTICAL HANDOFF
Connect the demo, editable documents, workbook, and fictional follow-up situations. Identify what can be inspected now and what remains unfinished. Explain ownership, review, maintenance, and operating decisions needed for actual use. A proof of concept is distinct from a deployed operating system.

10. THE CHECKPOINT, NEXT INCREMENT, AND BROADER OPPORTUNITY
Summarize the latest verified work, integration status, unfinished changes, and open questions. Name one concrete next engineering action and one engineering question aligned with the plan. Separate finishing and validating Troen deliverables now from later exploring consulting that identifies, implements, and maintains improvements. Treat the broader opportunity as unvalidated, not proven demand or measured savings.

Connect technical decisions to practical consequences. Discuss alternatives when useful. Avoid turning every issue into another task. End with what exists, what remains uncertain, and where Connor can resume tomorrow.
```
