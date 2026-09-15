# Ways to use Claude Design on the Carnegie demo

Written September 12, 2026, against the live state (`dd73eee`, deployed at
https://troen-spe.vercel.app/) and the five unresolved findings in
[DESIGN-AUDIT-2026-09-12.md](DESIGN-AUDIT-2026-09-12.md). This is a menu of
options, not an accepted plan. Nothing here authorizes a redesign, a
deployment, or changes to reviewed evidence.

## What Claude Design is, precisely

It creates a **design canvas**: several artboards laid out on one pan/zoom
surface, published as an Artifact on claude.ai. Where saving is enabled you
edit it by hand afterward, click-to-select elements, a properties panel,
inline text editing, undo/redo, and Save publishes a new version. Otherwise
you get a view-and-export preview with PNG and PDF output.

**What it does not do, and this matters for this project:**

- It does not touch `demo/carnegie-hall/`. The artboards live at a separate
  Artifact URL, not on Vercel. Anything accepted has to be hand-built into
  `index.template.html` and `styles.css`, then packaged through
  `scripts/package-demo.cjs` into `dist/` the way every other change is.
- It is not a deployment path and not a second source of truth. Treat every
  canvas as a proposal that expires once implemented or rejected.
- It does not verify anything. A beautiful artboard is not a passing browser
  check at 1440 x 900.

**Three project rules that constrain every use below:** one typeface, no font
transitions; no invented data, metrics, school names, or supplier confirmations
on any artboard that could be mistaken for the real demo; and the audit's own
warning that a stock Carnegie photograph or music-note decoration does not fix
the character problem.

---

## A. Resolve the five open audit findings before writing code

This is the highest-value category. Each finding currently sits unresolved
because implementing a fix in the real HTML is expensive and reversible only
with effort. A canvas lets you decide first and build once.

### A1. The concrete change-review example (audit finding 2)

The audit's single recommended next increment. It is also the hardest thing to
get right in code, because the workflow view currently explains a process
instead of demonstrating one.

**Artboards to lay out, left to right on one canvas:**

1. The original request as it arrived, in whatever form a director would send it.
2. The specific detected difference, with the prior arrangement beside it.
3. What that difference touches: the affected arrangements, costs, approvals.
4. The reviewed result as an editable artifact.
5. What stays unknown, retained and visible rather than resolved.

**Why the canvas form helps here:** these five states are a sequence, and a
sequence is exactly what you cannot judge inside a browser one route at a
time. Side by side you can see whether state 3 earns its place, whether 4
actually shows work performed, and whether the whole run reads in the forty
seconds it gets in the presentation path.

**Constraint:** if this is built on the accepted fictional proposal, label
inputs and outputs illustrative on the artboards themselves, so the labeling
survives into implementation. The internal Chattanooga case note stays out of
anything published.

### A2. The three view leads (audit finding 1)

All three views currently lead with the same line, so the screen does not say
what changed when you switch.

**Artboards:** Research, Materials, Workflow at identical dimensions, each
with a subject-specific lead tied to the work on screen, plus one quiet
persistent identity strip.

**Why the canvas form helps:** this is a comparison problem. You are asking
whether the active subject dominates, and that question is unanswerable while
clicking between routes because you never see two leads at once. On a canvas
you see all three in one glance, which is the actual test.

### A3. The research table that needs 397px inside 271px (audit finding 3)

A bounded, reproducible usability failure with several valid fixes.

**Artboards, at true 1440 x 900 proportions so the measurements mean something:**

- Option A: full table opens in the center reading area, context column keeps short facts.
- Option B: focused expandable region that takes the available width.
- Option C: a dedicated evidence view reachable from the left navigation.

**Why the canvas form helps:** you can hold three structural answers next to
each other and pick, rather than building one, disliking it, and rebuilding.
The audit is explicit that shrinking the type is not an acceptable answer, and
drawing it at real proportions makes that obvious rather than theoretical.

### A4. Focusing one passage in Materials (audit finding 4)

The FAQ preview runs about 1,242px tall with near-uniform treatment, so the
presenter reads aloud instead of pointing.

**Artboards:** two or three restrained ways to bring one passage forward while
the complete document stays present and its qualifications stay legible.

**Constraint:** the Word and Markdown sources are manually maintained and
preserved byte-for-byte. Anything drawn here is a presentation treatment of
the preview, never an edit to the reviewed wording.

### A5. Phone download placement (audit finding 5)

At 393 x 852 the FAQ download sits roughly 2,975px below the document top.

**Artboards:** phone-width boards showing the download near the document
selector, plus the alternative of a labeled jump, so you can judge whether
either creates a confusing duplicate control.

---

## B. Presentation assets for the demo itself

### B1. Storyboard the five-minute path

One artboard per stop from [PRESENTATION-PATH.md](PRESENTATION-PATH.md), in
order, each captioned with its talking point and time window.

**Two things this produces.** A rehearsal aid you can look at without running
the local server. And a diagnostic: if two consecutive stops look nearly
identical on the canvas, your audience will feel that as nothing having
happened, which is finding 1 restated as a presentation problem.

### B2. A one-page leave-behind for Troen

A single artboard designed as a print piece, exported to PDF. What Troen keeps
after the meeting ends and the browser closes.

Content is already written and reviewed: the March 3 context, what was
researched and how it was checked, what the materials are, what remains
unconfirmed. This is the use with the clearest standalone value, because
nothing in the repo currently fills that role.

### B3. An opening board

Something on screen while you introduce the work, before the live site loads.
Optional, and only worth it if your opening currently competes with a
half-loaded page.

---

## C. Make the design system visible

### C1. Token and type sheet

The palette exists only as prose in the demo README: ink `#173f42`, accent
`#1d5d55`, paper `#fbfcfa`, surface `#f0f5f2`, line `#c8d5cf`, muted `#51635b`.

An artboard with real swatches, the type scale at actual sizes, and the
spacing rhythm turns a paragraph into something checkable. It also protects
the one-typeface rule, because a visible scale makes it obvious when someone
reaches for a second family.

### C2. Component inventory

Draw the recurring pieces once: source chips, evidence table rows, disclosure
blocks, download groups, the selected-document header. Future views then
assemble from a known set instead of inventing a new treatment each time.

This is the quiet answer to "lacks character." The audit says character comes
from hierarchy and meaningful interaction, not decoration, and a component
inventory is where hierarchy gets decided.

---

## D. Materials redesign proposals

### D1. Director sheet

Currently a Georgia and Arial Word document chosen for reliable rendering.
A designed alternative is worth seeing, but it is a proposal only. The Word
files are preserved byte-for-byte and edits to either source must survive.

### D2. Proposal example layout

Same treatment, same caution. The responsibilities table and the worked change
section are the parts where layout would earn the most.

---

## E. Decision artifacts

### E1. Before and after

The audit screenshots in `Archive/design-audit-2026-09-12/` give you a real
"before." Pair each with a proposed "after" on one canvas. This is how you
show Troen, or yourself, that something improved rather than merely changed.

### E2. Option boards

For any single decision, put the alternatives on one canvas and choose. The
canvas is the cheapest place to be wrong.

---

## Recommended order

1. **A1**, the change-review example. It is the audit's own top recommendation
   and the thing most likely to change how the demo is received.
2. **A2**, the three view leads. Small, and it fixes the complaint that the
   screen does not say what changed.
3. **B2**, the leave-behind. Standalone value, no dependency on the other work.
4. **A3**, the research table. Bounded repair, do it when implementation resumes.
5. Everything else as it interrupts actual use.

## What to check before implementing anything from a canvas

- The artboard uses real reviewed content or clearly labeled fiction.
- No second typeface arrived.
- No invented metric, supplier confirmation, or business claim appeared.
- The proposed treatment survives at 1440 x 900 and at 393 x 852.
- Source links, draft status, and unknowns are still present and legible.
- Implementation goes through the template and stylesheet, then the packaging
  script, never by hand-editing generated HTML in `dist/`.
