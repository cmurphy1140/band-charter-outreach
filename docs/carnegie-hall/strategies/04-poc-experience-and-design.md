# 04 — The POC experience and visual design

[Strategy index](README.md) · [Positioning](../POSITIONING-AND-OPPORTUNITY.md) · [Audience materials](05-director-and-partner-materials.md)

## Purpose and the experience to demonstrate

Make the research and materials feel like one considered product. The Troens should quickly see that the logistics and software developer understands the event, the people who buy it, and the work that follows an interested reply.

The proposed result is a compact **local demonstration** presenting the five deliverables, with the workbook and editable documents available independently. The [connected example](../../../demo/carnegie-hall/README.md) now includes Wando research, a separate Salem identity comparison, an editable two-case workbook, Wando director material, and a fictional follow-up. The Salem comparison explicitly keeps the Wando-only director sheet separate. This is an initial subset of the five-output design. There is no live inquiry form, CRM connection, payment feed, or booking dashboard.

## Suggested walkthrough

| Moment | What the viewer sees | What it proves |
|---|---|---|
| 1. Understand the event | A concise March 3 event explanation and a preview of the available work | The project is tailored to a specific business situation |
| 2. Inspect an opportunity | One researched school/partner, a clear reason for consideration, and source evidence | The research is more useful than a scraped name and email |
| 3. See the conversation material | The matching director or partner sheet and relevant FAQ | Research can become a practical, tailored business asset |
| 4. Follow the next action | An explicitly illustrative proposal/approval/supplier scenario | The product understands conversion and delivery beyond discovery |
| 5. Take something useful away | Editable workbook, documents, and example action brief | Value survives outside the demonstration interface |

Aim for a short coherent walkthrough, approximately five to eight minutes as a design target, with deeper material available on demand. This is not a requirement to rehearse a timed sales performance. A person who wants to investigate a source should be able to do so without leaving the overall context behind.

## Proposed information layout

```text
Carnegie Hall · March 3, 2027                 Demonstration

Event and offer  |  Opportunities  |  Materials  |  Example workflow

Selected opportunity
  Who they are             Why this may matter
  Ensemble and location    Specific dated evidence
  Relevant adult role      Open questions for later use

  [Review sources]  [Open tailored material]  [See example next step]

Portable outputs: opportunity workbook · editable sheets · action brief
```

This is an information sketch, not a completed screen or an instruction to add every feature at once. Begin with one connected opportunity. Add a minimal navigation structure only after that example works.

## Aesthetic direction

Use the feel of a well-prepared performance program and a practical trip-planning folder: editorial typography, clear grouping, restrained color, and precise tables. The intended effect is confident and legible rather than a crowded sales dashboard. Proposed typography can pair a distinctive display face with a highly readable body face; confirm available/licensed assets during implementation.

Before visual work, inventory the exact existing images, logos, fonts, and layout assets and verify their paths. Take a screenshot of any existing interface that will change. Use provided assets directly when suitable and cleared for the intended presentation. Do not substitute invented venue photography, endorsement marks, or testimonials. Internal contract screenshots are evidence, not decorative content.

A text-forward design can be complete without a hero photograph. If new illustration is useful, label it as illustration and use the available image-generation tool; do not manufacture a photograph suggesting a real Troen group attended. Respect the project's image validation rules when actual assets change.

## Real, illustrative, and unknown behavior

Use real source-backed organization facts in research profiles. Store example interactions in separate synthetic scenarios. A scenario can explain “what happens after a director requests a proposal” without assigning that action to a real school. If a real profile links to a scenario, visibly explain that the scenario is hypothetical and is not that organization's activity.

Use a persistent “Demonstration” label and specific labels such as “Illustrative status” where a reader might otherwise infer an actual record. Do not show a live remaining-slots counter, received-payment total, reply rate, or booking conversion chart from invented data. Unknown prices can be omitted or shown as “pricing to be confirmed”; avoid cluttering every page with a long disclaimer.

An illustrative workflow may change local state when clicked if the state change is clearly a simulation and can be reset. Buttons should do exactly what they say. A “View proposal example” action opens the example; it must not pretend to send it. Disable or omit live-send/payment controls rather than create theatrical success messages.

## Build approach and tool choices

Start with a rough local sketch using one real profile and a small synthetic scenario. The repository is a Python research project; do not automatically migrate it to Next.js or introduce a backend. A small static local interface reading prepared data is the default to evaluate. Use a richer stack only if a concrete interaction requires it, following existing dependency rules.

Use frontend-design and design/UX-writing skills for layout and wording; use the visualization skill for an inspectable concept when helpful. Use browser or Playwright tools to exercise the actual UI and collect screenshots. Use document and spreadsheet tools for the portable outputs. Sites is a possible later sharing route, not a reason to deploy the POC before publication is requested.

## Quality checks

Verify keyboard access, visible focus, readable contrast, mobile layout, long organization names, missing contact fields, and table overflow. Check that source/detail controls work, exports open, local navigation remains coherent, and illustrative state resets predictably. Show meaningful empty/error states if a data file is absent; never make an empty screen look like no opportunities exist.

Compare before/after screenshots for actual visual changes. Check the presentation at a narrow viewport and a normal laptop size. Keep internal financial evidence and private identifiers out of shareable screens and exports. The work should feel coherent without needing the developer to explain which buttons are mockups.

## Handoff and stopping point

This chunk finishes when someone can inspect the five outputs through one connected example, understand the source basis, and distinguish simulated behavior. The presentation can then expand to the small reviewed sample. It does not need authentication, hosting, a real lead form, CRM synchronization, payment processing, or a full client portal to meet the POC purpose.
