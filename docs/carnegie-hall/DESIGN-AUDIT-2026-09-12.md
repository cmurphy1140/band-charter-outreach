# Live demo design audit — September 12, 2026

Audited: https://troen-spe.vercel.app/ at the deployed conversation-layout state (`74cf362` UI checkpoint; `dd73eee` documentation follow-up). Scope: visual character, presentation pacing and selected usability behaviors. Audit only: no UI repairs, new research, deployments or source/document changes. Design judgment is separated below from reproduced behavior. This is not a full accessibility or production-readiness certification.

## Overall assessment

The site is calmer, easier to steer and more trustworthy than the earlier long central page. The left/center/right structure works as an organizing idea. It does not yet achieve the project's aesthetic north star of a performance program paired with a practical planning folder. My assessment is that it reads as a careful reference document, with the presenter supplying much of its meaning and personality.

“Lacking character” is a reasonable reaction. The issue is not a shortage of fonts, animations or pictures. The strongest emphasis goes to an abstract repeated headline; the content is mostly formatted prose; and the workflow describes good practice without visibly demonstrating much work performed. This critique includes limitations of the layout I implemented, not just missing future features.

## What to keep

- Existing Troen logo, restrained palette and consistent typeface. The user explicitly disliked frequent font transitions; preserve that learning.
- Left navigation that permits changing topics without finishing a sequence.
- Clear research/fiction/draft distinctions, source links and editable documents.
- One selected document at a time and optional Salem/workflow details.
- The real separation between public demonstration and private employee material.

## Findings and smallest useful corrections

### 1. The repeated introductory heading competes with the current subject

**Type:** observed structure plus design judgment. **Priority:** high for character and presentation.

All three views display “From research to a useful next step” with the same prominence. Research then introduces Opportunities, selectors, location/status and finally Wando. The event date/venue also repeat between the masthead, context panel and documents. The repetition is not factually wrong, but it gives supporting structure more presence than the example the presenter wants to discuss.

**Reader impact:** the screen does not immediately explain what changed when moving between views; the presenter must redirect attention.

**Recommendation:** keep a quiet persistent identity/header and give each view one subject-specific lead tied to the work on screen. Make the actual school, selected material or change scenario the dominant subject. Preserve dates within the standalone documents. Do not add another slogan or more stacked labels.

**Acceptance:** after switching views, the active subject is visually dominant without requiring another introductory explanation. This requires a visual/rehearsal check, not a claim that visitors will necessarily understand it.

### 2. The workflow explains a process more than it demonstrates assistance

**Type:** observed interaction plus product/design interpretation. **Priority:** highest for perceived usefulness.

The selected situation displays a general instruction and five planning states. Switching options changes the explanatory text; it does not show an original request, a specific detected difference, its consequences, or a reviewed resulting artifact. The simulation labeling is correct and must remain.

**Reader impact:** someone experienced in trip coordination may reasonably think, “We already know to do those things.” The interface leaves the presenter to explain why this demonstration helps.

**Recommendation:** prototype one concrete change review in the existing workflow view: a request, the affected arrangements and an editable/reviewable result, with unknowns explicitly retained. The accepted fictional proposal may provide an illustrative starting point. The new employee case can inform what would be useful internally, but no real case details should enter the public website without a separate review and publication decision. If based on fiction, label both inputs and outputs as illustrative. Do not imply live document analysis, supplier confirmation or automation that is not implemented.

**Acceptance:** the audience can inspect a particular piece of work the assistance performs and distinguish it from employee decisions and remaining checks. Actual usefulness/time savings remain untested until employee use.

### 3. The right column is suitable for short context, but not the whole research table

**Type:** reproduced usability issue. **Priority:** high, bounded repair.

At a 1440 × 900 viewport, the context column is 296px wide. Its research table container offers 271px of width for 397px of content. Opening “View all research” therefore requires horizontal scrolling to see all columns, including Status. Opening the source register alongside it creates a long narrow column and substantial empty center space.

**Reader impact:** evidence becomes harder to consult during conversation; the whole-table status context is easy to miss. No data was lost, but “no page overflow” in earlier checks did not certify usability of nested tables.

**Recommendation:** keep short contextual facts/actions on the right. Open full tables and long evidence in a wider reading area or a focused expandable region that can use the available width. Do not solve this by shrinking the type. Preserve focus, closing/return behavior and the selected example.

**Acceptance:** all research columns can be read together at the target desktop viewport; opening evidence does not strand the presenter in a tall narrow text column.

### 4. Materials offers a complete document but little presentation emphasis

**Type:** observed layout plus design judgment. **Priority:** medium.

The full director preview measured about 1,242px tall at the audited desktop size. The FAQ is also a long, continuously styled document. Most paragraphs and subsection headings receive similar visual treatment. This is useful for reading but weak as a five-minute visual aid.

**Reader impact:** the presenter must verbally identify the relevant passage while the audience scans a page of comparable text. It can encourage reading aloud rather than discussion.

**Recommendation:** retain the complete preview and unchanged editable downloads. Consider a restrained way to focus an existing relevant passage, or navigate to a question, without rewriting the reviewed material or hiding qualifications. Judge it in the context of the proposed concrete workflow example before adding another standalone feature.

**Acceptance:** a presenter can point to one relevant portion quickly, then recover the complete document; source wording and draft boundaries survive.

### 5. On phone widths, downloads are technically present but far from the selector

**Type:** reproduced usability tradeoff. **Priority:** lower for Mac presentation; relevant to current phone review.

At 393 × 852, the FAQ preview is approximately 2,190px high. Its matching download group starts roughly 2,975px below the document top of the browser page in the tested state, because supporting context stacks after the full main view. There is no horizontal page overflow.

**Reader impact:** a phone user selecting FAQ cannot readily find its download without substantial scrolling. This is the cost of moving desktop controls into a right column and stacking it below on narrow screens.

**Recommendation:** at narrow widths place the selected download action near the document selector, or provide a clearly labeled jump to it. Preserve one source of truth and avoid confusing duplicate controls.

**Acceptance:** the selected download is discoverable near the document choice at phone width, while desktop retains its intended side placement. Verify actual iOS separately; desktop Chrome emulation is not that test.

## One recommended next increment

Before another broad aesthetic pass, sketch a **single concrete change-review example** for the existing workflow page. It should have one clear subject, a specific request and visible consequences, while using the current navigation, branding and source boundaries. The aim is to give the page a reason to look and behave distinctly. Treat it as a proposal until accepted; no new framework or broad redesign is required.

The narrow research-table issue is an independently bounded usability fix worth addressing when implementation resumes. Materials focus and phone download placement can follow if they interrupt actual use. Do not make every finding a prerequisite for tonight's employee assistance.

Authentic performance imagery may be useful later if an appropriate approved asset supports the story; a stock Carnegie photograph or music-note decoration would not solve the demonstrated problems. Stronger character can come from hierarchy, meaningful interactions and recognizable trip-planning work while retaining one typeface.

## Verification and limitations

New live observations in this audit: three page routes, director and FAQ previews, expanded research table/source register, desktop and phone-sized screenshots, DOM width/height measurements, no horizontal page overflow in inspected states, no observed JS errors, and keyboard skip link reaching main. The first screenshot preceded the lazy logo decode; it was recaptured after decoding. That transient screenshot omission is not classified as a broken asset.

Local screenshot evidence is retained under `Archive/design-audit-2026-09-12/`: research, research-expanded, material, FAQ, workflow and phone FAQ. These screenshots are local, uncommitted and not website assets. Earlier verification covered document preservation, downloads and scenario reset; this audit does not claim to have repeated every prior test.

Not performed: actual iOS Safari testing, screen-reader testing, complete keyboard traversal, contrast certification, audience comprehension testing, new external source verification, operational workflow automation, or time-savings measurement. No employee transcript content was added to this report.

All five findings remain unresolved; no repair is implied by writing this audit. The live demo remains unchanged.
