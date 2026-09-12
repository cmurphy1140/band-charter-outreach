# Handoff — proposal example (Claude)

Worker: Claude Code, Claude Desktop Local session on the Mac. Coordinator: the main
Codex task "Troen Prospects Pipeline". Assignment:
[2026-09-11-proposal-example.md](2026-09-11-proposal-example.md).
Status: **ready for coordinator review. Outputs are uncommitted, as instructed.**

## State verified before editing

| Item | Value |
|---|---|
| Checkout | `/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-partner-research` |
| Branch | `codex/claude-proposal-example` |
| Starting HEAD | `0859701b6f78b423ac2eeca0bc599c0a859c79de` (unchanged; nothing committed) |
| Git status at start | Clean, no untracked files |
| Stash | Empty |
| Instruction link | `CLAUDE.md` resolves to `AGENTS.md` |
| Other writers here | None. No process was writing this checkout. The main checkout is on `codex/carnegie-director-faq`; `main-integration` is detached at `5155cfa`. Neither was touched. |

The previous pilot branch `feature/claude-partner-research` remains at
`e171954439e97219491ff6fc2ff332700a1580ef`. It was not reset, merged or deleted.

## Files created

Four new files, nothing else:

1. [Troen - Carnegie Hall Proposal Example.md](<../materials/Troen - Carnegie Hall Proposal Example.md>) — the draft, about 1,080 words.
2. [Troen - Carnegie Hall Proposal Example.docx](<../materials/Troen - Carnegie Hall Proposal Example.docx>) — matching Word copy.
3. [PROPOSAL-EXAMPLE-REVIEW.md](../materials/PROPOSAL-EXAMPLE-REVIEW.md) — evidence map, exclusions, verification, internal questions.
4. `docs/carnegie-hall/coordination/claude-proposal-example-handoff.md` — this note.

## What the draft does

It proposes for **Example Concert Ensemble**, an invented high school concert band,
for March 3, 2027. It covers the ensemble's planning needs, why the festival suits
that purpose, what the festival provides, which travel responsibilities remain open
and who could hold them, inclusions and exclusions to agree, a compact school-approval
summary, the agreement and payment structure, an unquoted price basis, one worked
change, and a next step.

The worked change is a fictional motorcoach operator declining a proposed overnight
drive under its own driver-hours policy. The draft follows the consequence through
length of stay, price basis, the approval summary the school is reading, and the need
to reissue a marked version, while noting that the festival day itself does not move.
It takes only the *pattern* from I11, a real supplier objection on a different trip;
no supplier is named, no date is copied, and nothing is requested, held or confirmed.

No price, fee, deposit, deadline, commission, capacity figure, availability claim,
booking or approval appears anywhere. Music Travel Consultants is not mentioned in
the draft, and no contact with it is recommended.

## Checks run

| Check | Result |
|---|---|
| Markdown/Word text equivalence | Identical both directions by word set; every Markdown block appears verbatim in the Word text, footer included. |
| Word package validity | Zip integrity test passed; all 15 XML parts parse. |
| Independent Word reader | macOS `textutil` converted the DOCX to text, table included. |
| Relative links | All 19 links across the two Markdown files resolve on disk. |
| `git diff --check` | Clean. |
| Diff scope | `git status --porcelain -uall` lists only the four owned additions; `git diff --name-only HEAD` is empty, so no tracked file changed. |
| Input preservation | FAQ Markdown and Word, the brochure PDF, `example.json`, the follow-up example, INTERNAL-DECISIONS and BUSINESS-CONTEXT all hash byte-identical to HEAD. |
| Source re-read | The brochure PDF text was extracted locally and read in full, pages 1–6, before any claim was written. |
| Claim review | Every factual paragraph is classified and located in the review file. |

## Limitations, recorded honestly

- **No rendered layout check.** LibreOffice is not installed on this machine, so the
  PDF render and visual page inspection used for the September 10 director sheet could
  not be repeated. `pdftoppm` and `pandoc` are also absent.
- **Page count is an estimate, not verified.** About 1,080 words with one small table
  should land inside the two-to-three page target. Page breaks, table wrapping and
  legibility were not visually inspected.
- **Native Microsoft Word and iPhone display remain unverified.** Word is installed on
  this Mac, but I did not launch it, consistent with the project's standing record.
- The DOCX was built from the reviewed FAQ document used as a style template, so both
  documents share page setup, fonts, heading styles and footer behaviour. The FAQ file
  itself was only read; its hash is unchanged.
- The brochure PDF has no Unicode mapping for its embedded fonts, so its text required
  decoding through the file's own character maps. The decoding drops some punctuation,
  including the colons in clock times. No time value from that source is quoted in the
  draft, so nothing depends on it, but a later reader should not treat that extraction
  as a clean transcript.

## Proposed shared-document changes (coordinator applies)

1. `PROGRESS.md`, materials workstream: record the proposal example as drafted and
   internally reviewed, with rendering unverified, and link the three material files.
2. Strategy 05: the proposal example in its output set now exists; its checkpoint note
   could record the template-reuse approach and the missing LibreOffice check.
3. `INTERNAL-DECISIONS.md`: no change needed. The eight internal questions map to
   existing rows and are deliberately kept in the owned review file.

## Reusable lesson

Building the Word file from an already-reviewed Word document used as a template gave
a matching visual family with no new dependency and no styling decisions to re-litigate.
Two cautions from doing it: the template carried a hyperlink relationship that became
orphaned once its body was cleared, which had to be removed, and duplicate style IDs in
that template broke style lookup by name, so styles had to be applied by ID. Limits:
this works because the two documents belong to one family and the template is stable.
It is not a general document pipeline, and it still does not verify rendering.

## Next action and current state

Suggested next step: a coordinator review of the draft's wording and evidence map,
then a rendering check on a machine that has LibreOffice or Word available, before the
material is considered presentable. Connecting it to the demo is coordinator work and
was not attempted.

Nothing was committed, pushed, merged, rebased, fetched or synced. No worktree was
added or removed. No server, port, background task or audio work. The coordinator's
read-only preview server on localhost:8765 was not started, used or stopped by this
task. Temporary build and extraction scripts live in the session scratchpad outside
the repository. Editing has stopped; I am idle until reassigned.
