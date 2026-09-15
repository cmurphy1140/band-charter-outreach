# Unfamiliar-reader review of the Troen deliverables

Reviewer: Claude Code, Claude Desktop Local session on this Mac. September 11, 2026.
Checkout `/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-reader-review`,
branch `codex/claude-reader-review`, base `0c0cbaf68f3e1092b3ffbcbe8c0a76222a5a5fd7`.
Preflight matched: clean tracked and untracked status, empty stash, `CLAUDE.md` resolves
to `AGENTS.md`, and no other process was writing this checkout.

I read the deliverables first and consulted the accepted review and progress records
afterwards, only to check whether a finding was already known. **Four issues follow.**
Things I noticed that did not actually interrupt reading or use are listed at the end
as non-issues, so they are not re-investigated later.

## 1. The proposal promises "three patterns" and never says what they are

**Location.** `docs/carnegie-hall/materials/Troen - Carnegie Hall Proposal Example.md`,
section "What still has to be arranged, and by whom" (same text in the `.docx`).

**Supporting text.** The lead-in reads "Three patterns are workable, and this example
assumes none of them:". The table that follows is not three patterns. It is a
per-element matrix whose columns are "Could be Troen", "Could be the school" and
"Could be a travel company", and whose four travel rows each read "Possible / Possible
/ Possible". Two later sentences then treat a pattern as a single settled choice:
"Which pattern applies changes the proposal's price basis, the agreement the school
signs, and who the director calls" and "The tailored proposal names one pattern".
The document's closing step repeats it: "decide which travel pattern the proposal
should assume".

**Reader impact.** The table invites an independent choice per row, which is sixty-four
combinations, while the prose says one choice is made for the whole trip. A reader
using this as a template to structure a real proposal cannot tell which they are
being asked to decide, and the three patterns are never named anywhere in the
document. The accepted evidence map carries the same ambiguity forward: its rows
refer to "the pattern" and "the travel pattern" without enumerating them either.

**Classification.** Verified behavior, read directly from the document text.

**Smallest correction.** One sentence after the table naming the three, for example
that the choice is normally made once for all travel elements: Troen arranges them,
the school arranges them, or a travel company arranges them. No table change needed.

## 2. The Word proposal's companion link opens a Markdown file

**Reproduction.** Open
`docs/carnegie-hall/materials/Troen - Carnegie Hall Proposal Example.docx` in Word and
click the link reading "March 3 director FAQ" in the closing source line.

**Supporting observation.** The link target is `Troen - Carnegie Hall Director FAQ.md`.
The Word copy of that same FAQ, `Troen - Carnegie Hall Director FAQ.docx`, sits in the
same folder and is not linked. The document's other link, "Carnegie Hall Event
Overview", targets `../../../logistics/carnegie hall EVENT OVERVIEW.pdf`, which resolves
only while the file stays three levels deep inside this repository.

**Reader impact.** Someone who was handed the editable Word copy, which is how these
documents are meant to be used, follows the one cross-reference the document offers and
lands on a file their machine most likely opens as plain text or not at all. If the
Word copy has been moved or emailed, the brochure link fails silently too, so the
document's only routes to its cited evidence both depend on an unstated repository layout.

**Classification.** Verified behavior for the link targets and for the unlinked Word
sibling. The consequence for a reader outside the repository is an inference, since
these drafts are labelled internal and are not issued.

**Smallest correction.** Point the Word copy's companion link at the `.docx` FAQ beside
it. Leave the Markdown copy pointing at the Markdown FAQ.

## 3. The demo names a next document three times and offers no way to reach it

**Reproduction.** Load the demo, open Materials, read the director-sheet preview to its
end, then switch to the FAQ and open Example workflow.

**Supporting text.** The director sheet closes with "the next useful document is a
tailored proposal that makes the educational experience and travel scope clear". The
FAQ answers "Does this describe the complete trip package?" with "A tailored proposal
would identify any transport and accommodation, who arranges each part, the inclusions
and exclusions, and the total price." The Example workflow's first step is "Proposal:
Draft the event experience, group needs, and travel scope". The Materials section
offers exactly two documents, Director sheet and FAQ, and the accepted proposal example
is not linked or downloadable anywhere in `demo/carnegie-hall/index.html`.

**Reader impact.** The demo's own narrative arrives at a named next document and stops.
A reader following it has no way to see that the document exists, and the strongest
piece of the current set is invisible on the route designed to lead to it.

**Classification.** Verified behavior for the absence, confirmed by checking every local
link in the page. The impact on a reader is an inference. The progress record already
treats connecting the proposal to the demo as coordinator work, so this may be known
and deliberate.

**Smallest correction.** One more choice in the Materials selector, or a single link
from the director-sheet preview to the proposal downloads.

## 4. The same invented group has two different names

**Location.** `demo/carnegie-hall/index.html`, Example workflow, labelled "Example
concert group / Simulation", against the proposal's "Example Concert Ensemble".

**Supporting text.** The demo's simulation notice reads "Fictional group and activity.
This is not Wando's correspondence, approval status, payment history, or booking", under
the heading "Example concert group". The proposal opens "Example Concert Ensemble is an
invented group." The accepted evidence map ties them together, describing the proposal's
group as "Consistent with the fictional scenario in example.json (`scenario.fictional:
true`, 'Example concert group')".

**Reader impact.** A reader who sees both cannot tell whether these are one running
example or two unrelated inventions, and the workflow steps in the demo read as though
they describe the proposal's story. The uncertainty is small but it lands exactly where
the material is trying to show that the pieces connect.

**Classification.** Verified behavior. The intent that they be the same example comes
from the evidence map, so treating them as one is supported rather than assumed.

**Smallest correction.** Use one name in both places. Changing the demo's label is the
smaller edit, since the proposal pair and its evidence map would otherwise all need
revision.

## What I inspected

- `demo/carnegie-hall/index.html` served from this checkout, all three sections,
  both Opportunities selectors, both Materials previews, both workflow situations,
  the reset control, and every disclosure.
- `app.js`, and the static HTML's `hidden` attributes, to see what a reader gets
  without JavaScript.
- The director sheet, director FAQ and proposal example, each in both Markdown and Word.
- The workbook, research notes, follow-up example and brochure reachable from the demo.
- Afterwards, for substantiation only: `PROPOSAL-EXAMPLE-REVIEW.md`, the committed
  `PROGRESS.md` proposal review section, and `AGENTS.md` boundaries.

## Checks run

| Check | Result |
|---|---|
| Every local link and download in the demo, over HTTP | All 12 returned 200 with correct content types |
| Workbook file | Valid archive, sheets "Opportunities" and "Evidence" |
| Markdown against Word, all three document pairs | No text differences; the director sheet's citation line differs only in formatting, noted below |
| Duplicated FAQ and brochure copies | Byte-identical to their originals by SHA-256 |
| Word hyperlinks | Present in all three files; targets resolved against the filesystem |
| Mobile layout at 375 pixels | No page-level horizontal overflow; the research table scrolls inside its own container as intended |
| Browser back and forward across sections | Correct section and navigation state at every step |
| Focus targets for section and preview switching | Present with `tabindex="-1"` |
| Without JavaScript | All three sections and both previews remain visible; only the second workflow situation is unreachable |

## Checks I could not run

- No visual rendering of the three Word files. LibreOffice, Poppler and `pandoc` are
  not installed in this environment, so Word pagination, page breaks and print layout
  were not seen. Word text was read through the document XML, which is extraction and
  not visual inspection.
- Native Microsoft Word and physical iPhone display were not exercised.
- Demo screenshots were taken in the in-app browser at desktop and phone widths. That
  is one engine, not a cross-browser check.

## Non-issues, recorded so they are not re-opened

- The three documents cite different brochure page ranges, pages 1 to 2, 1 to 5 and
  1 to 6. Each matches what that document actually uses.
- The director sheet's citation line is worded three ways across Markdown, Word and the
  demo preview, including a bare "(P01)" in the Markdown that has no key in the document.
  It reads as a reference tag and did not block understanding.
- The proposal states that the brochure specifies arrival buffers and attire without
  giving the figures. That is a deliberate, documented choice, not an omission.
- The research table is partly cut at phone width, but its container scrolls, which is
  the correct handling.

## Process status

Only `docs/carnegie-hall/coordination/claude-reader-review.md` was created. No input,
deliverable or other file was modified, and nothing was committed, pushed, fetched or
synced. I started one server, `python3 -m http.server 8766`, from this checkout and it
is still running; stop it with the task control or leave it, as you prefer. The
rehearsal server on port 8765, process 21060, was not used, restarted or stopped.
Scratch output stayed outside the repositories. The older
`claude-partner-research` checkout was not touched. Editing has stopped.
