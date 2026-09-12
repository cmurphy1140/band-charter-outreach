# Troen presentation path and conversation layout

Retained at the user's request. The walkthrough below guides rehearsal; the
September 12 layout decision makes the existing website support that conversation. This script is deliberately withheld from Claude's
initial unfamiliar-reader review. Absent from its original review starting commit.
Open the proposal before beginning so switching applications does not interrupt.
Localhost links work only on the Mac hosting this server.

| Time | Stop | Talking point |
|---|---|---|
| 0:00–0:40 | [Demo introduction](http://127.0.0.1:8765/#research): purpose and March 3 context | This shows how researched opportunities can become useful materials and clearer next steps for Carnegie Hall. It uses real research and explicitly fictional workflow examples. |
| 0:40–1:45 | Opportunities: Schools, then briefly Tour operators | The value is checking who the organization is and why it might fit, not simply producing names. MTC illustrates partner research; its connection to Troen is unconfirmed. |
| 1:45–2:45 | [Materials](http://127.0.0.1:8765/#material): Director sheet, then FAQ | The same reviewed evidence becomes editable, audience-specific material. These are drafts, with commercial details left for a real offer. |
| 2:45–4:00 | [Word proposal](<materials/Troen - Carnegie Hall Proposal Example.docx>) or [Markdown](<materials/Troen - Carnegie Hall Proposal Example.md>): responsibilities table and One change, worked through | This fictional group shows how a transport change affects the proposal, cost basis and school approval. No supplier arrangement or price is represented as confirmed. |
| 4:00–5:00 | [Example workflow](http://127.0.0.1:8765/#follow-up): change situation once | The support extends beyond finding prospects: keeping proposals, approvals, payments and supplier decisions connected. This screen simulates that process; it sends and records nothing. |

## Accepted layout direction — September 12, 2026

The presenter follows the conversation rather than reads the site in order.
Desktop is the presentation target; iPhone is the developer's prompt/review device.
Keep Troen's logo, palette, restrained single typeface, reviewed evidence and editable
materials. No provider research or new business claims are part of this increment.

- Left: persistent navigation among the three existing views.
- Center: the selected example or document, with the large introduction reduced
  to its title and the full explanation available on demand.
- Right: shared event context and the selected view's sources/contact disclosures
  or downloads. School-only supporting content must disappear for MTC. Director
  downloads must change when FAQ is selected. No duplicated or orphaned content.
- Narrow screens: horizontal navigation and supporting details below the main
  content. All content remains accessible; no promise of slide-sized phone pages.

Local prototype implemented in the template, stylesheet and navigation script.
The protected HTML-only build updates generated HTML; documents/workbooks are
preserved byte-for-byte. The script moves existing nodes rather than recreates
content, leaving a readable no-JavaScript fallback. No numbered section rails,
new images, framework, animations or changes to business evidence are introduced.
Review desktop screenshots first, then adjust one useful detail at a time.
The user authorized completing and pushing this layout. The pacing pass makes
Salem optional after Wando and the five planning states optional after the selected
fictional situation. Materials retains one full document with matching downloads.
Local checks pass; resolve publication and live verification from PROGRESS.md.

## Iterative refinement plan — September 12, 2026

User accepted the conversation approach and requested an iterative method or a
complete plan before further implementation. Use a bounded plan followed by a
repeatable review loop. The three-column prototype exists; the presentation rhythm
below is accepted direction, not yet a verified outcome of that prototype.

**Reading order:** choose a topic on the left, explain top-to-bottom in the center,
and open right-hand details in response to questions. Do not turn the columns into
three simultaneous speeches. Each central example supports show → explain → pause.
These are presentation cues, not necessarily literal labels or extra UI sections.

1. **Start with Opportunities / Wando.** Inspect the current view and rehearse one
   short explanation: show the school, explain the published evidence and its
   limited relevance, pause for Troen's response. Identify only what competes with
   that sequence. Keep unverified interest/feasibility apparent. Move or disclose
   secondary content only if it interrupts the primary example; retain every claim
   and source. Do not recast research as superior to the team's existing work.
2. **Review and revise that example.** Capture desktop and phone-sized views; compare
   with the current prototype. Check that the presenter can stop after one thought,
   consult evidence without losing the example, and choose another topic without
   finishing a forced sequence. Make one targeted correction when it fails, then
   check again. Screenshots establish layout, not audience comprehension.
3. **Apply the useful pattern to Materials.** Let one selected document carry the
   discussion; keep its matching downloads accessible alongside it. Preserve the
   full FAQ and director sheet, their draft status, wording, provenance and manual
   edits. Use progressive disclosure only where it supports reading rather than
   hides information needed to understand the document.
4. **Check Example workflow.** Keep one fictional situation understandable before
   explaining its consequences. Preserve the five existing planning states, reset,
   selection controls and explicit simulation notice. Avoid implying operating
   automation or asking Troen for homework. Keep the accepted proposal standalone.
5. **Verify the combined increment.** Compare desktop before/after screenshots;
   test navigation, keyboard focus, matching support panels, disclosures, downloads,
   scenario reset, narrow-screen overflow and no-JavaScript readability. Run the
   relevant demo/review tests and verify document/source hashes. Check MTC remains
   a candidate with an unconfirmed relationship. Preserve unrelated local work.
6. **Checkpoint and publish deliberately.** Show the concrete result and remaining
   limitations. Follow current commit/push permissions; no background publishing is
   implied by accepting the approach. After an authorized push, verify the deployed
   files and public URL before saying the phone sees the new version.

**Stop rule:** finish when each view has a clear focal point, optional supporting
information, a natural pause and intact functionality. Do not keep polishing because
another design is possible. If the same change fails repeatedly, revisit the layout
assumption instead of accumulating overrides. No new research, content products,
framework migration, extra providers or Claude assignment in this increment.

**Status communication:** say when implementation/checks are running, when a result
is ready, and when work is paused. At a pause, name the concrete decision or next
action. A final chat reply does not mean work continues in the background.

## Feedback after the walkthrough

1. Which part would be useful in your work today?
2. Where did you lose the thread or need an explanation?
3. Was anything unclear about what was researched, fictional, or still unconfirmed?

## Rehearsal and reconciliation rule

Rehearsal begins at the introduction. No user-observed issue is recorded yet.
Record only issues that interrupt understanding or use, with the stop, what the
reader expected, what happened and its impact. Do not infer an issue from silence.
After the rehearsal and independent review both finish, deduplicate findings,
verify reported behavior, distinguish assumptions/preferences from observed
interruptions, and recommend only necessary corrections. No automatic fixes,
provider research or scope expansion. A clean review need not produce five issues.
