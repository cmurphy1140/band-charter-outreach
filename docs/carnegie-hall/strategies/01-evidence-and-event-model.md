# 01 — Evidence and the March 3 event model

[Strategy index](README.md) · [Business context](../BUSINESS-CONTEXT.md) · [Internal decisions](../INTERNAL-DECISIONS.md)

## Purpose and concrete result

Turn the supplied logistics into a small, dependable foundation that every demonstration output can reuse. The result should explain Troen's performance experience clearly, retain the evidence behind it, and prevent details from another trip leaking into March 3.

The [reviewed demo input](../../../demo/carnegie-hall/example.json) already has a
March 3 event record and scoped source references used by the narrative and
materials. A complete field-level claim register remains planned. Extend that
existing input only as the next material needs it; the business-context document
remains the source inventory. No new form or duplicate inventory is needed.

## Inputs already available

Use all 15 images and four PDFs through their source IDs in the [business-context review](../BUSINESS-CONTEXT.md). The March 3 license photograph is the event-specific date/session anchor. The brochure covers both March 3 and March 31. The later schedule, hotel contract, other-trip proposals, and supplier correspondence reveal how the business works, without establishing March 3 inventory or terms.

Treat the received Zoho report as a separate research source. Treat the participation and deposit descriptions as employee-reported. The logistics and software developer synthesizes these inputs; a model interpretation does not upgrade a claim's evidence status.

## Method

1. **Define the scope of each source before extracting claims.** Record event/date, document type, whether it is a proposal or agreement, and whether it is a photograph of a folder or an actual document. A folder named for March 3 can contain material from a different event.
2. **Extract claims at a useful level.** A claim should be independently checkable: the photographed session begins at 8 p.m.; the shared brochure describes a clinic; a supplier objects to an itinerary. Avoid combining three differently supported facts into one supposedly verified statement.
3. **Attach provenance.** Use source ID, filename, page or image, and the relevant short observation. Keep full contracts and private identifiers in the original internal sources. Record extraction/review date separately from the event date.
4. **Assign evidence status.** Use documented, employee-reported, recommendation/inference, illustrative, or unknown. Add a scope note such as “shared brochure; March 3 applicability to be confirmed before a firm offer.”
5. **Resolve presentation conflicts without inventing answers.** Retain both versions internally; use the claim that the evidence supports, or omit a commercial detail. The $26,460 photographed license fee is not a receipt, customer price, or reconciled budget. A conditional resale clause prevents treating every deposit description as an established absolute.
6. **Write the event story.** Explain the performance, educational preparation, director support, and possible travel coordination in plain language. Link statements back to evidence. Keep the experience engaging without implying venue endorsement or exclusive benefits.
7. **Reuse a single current value.** Once an event fact is accepted for demonstration, carry it consistently into the workbook, material templates, and local presentation. If its meaning changes, update dependent outputs together.

## Proposed record structure

| Record | Useful fields | Why it exists |
|---|---|---|
| Event | Stable ID, date, venue/session, display title, scope status | Keeps every output attached to March 3 |
| Claim | Claim ID, statement, evidence class, applicable event, source/page, review date, use limit | Lets a reviewer trace a sentence without reopening every source |
| Conflict | Related claim IDs, difference, POC treatment, live-use trigger | Preserves an unresolved issue without blocking unrelated work |
| Demonstration scenario | Scenario ID, synthetic organization/status labels, teaching purpose | Prevents example workflow activity from becoming an apparent business fact |

The implemented event identifier is `troen-carnegie-2027-03-03`. Retain it across
consumers rather than replacing it with the earlier suggested shorter ID. A small
structured file or worksheet remains sufficient; no new database is required.

### Evidence for individual research claims

For each new or corrected claim, retain the organization/opportunity ID, field or
statement, extracted value, source ID/URL or filename, page/section/staff record,
short supporting observation, and review outcome. Keep the original observation
when a reviewer corrects its interpretation. Add NCES ID and directory vintage
where supported; absence is explicit, not an invented identifier.

Keep **event type** (performance, competition, parade, or unknown) separate from
**participation status** (planned, completed, cancelled, or unknown). A completed
competition remains a competition; an invitation remains planned until supported
completion evidence is found. A passed date, a current site banner, or an article's
publication date cannot establish that a performance happened.

Record event date/period, publication date, retrieval date, and human review date
separately where available. Undated history stays undated. PDF extractions retain
page numbers and the original file/hash; browser extractions retain final URL,
retrieval context and a permitted source snapshot or precise source locator.
Machine-extracted fields remain unreviewed until checked against that evidence.
These are acceptance requirements for future additions, not a claim that every
existing legacy row already has this structure.

## Specific decisions for this POC

Do not calculate ten additional slots from the eleven March 31 performances. Do not identify the employee-reported participating group using Ardrey Kell or Interlake filenames. Do not turn the 250-performer budget assumption into capacity, or school enrollment into ensemble size. Preserve the difference between an event fee, group price, paying performers, and profit.

Use the map as a broad research preference with exceptions. The absence of a drawn boundary is not an invitation to invent an exact territory. A public profile can explain regional relevance without a strict state whitelist.

The protection documents contain different cancellation timing. The demo can show where approved protection information would belong; it should not reproduce a disputed benefit as a customer promise.

## Tools and quality checks

Use document/PDF tools for extraction, image viewing for photographs and layout, and product-management synthesis for separating observations from interpretations. Use local files as the source of truth. Web research is for current external claims, not for overwriting what a supplied document actually says.

Verify every active event claim against its source; confirm all 19 source links still resolve. Review the event narrative for March 31 date leakage, financial overstatement, unsupported booking identities, and an implied Carnegie endorsement. A reader should be able to tell what is documented, what was reported by an employee, and what is illustrative without reading the entire internal archive.

## Handoff and stopping point

Hand the event story and reusable claims to [materials](05-director-and-partner-materials.md), the [provider comparison](02-market-and-provider-research.md), and [design](04-poc-experience-and-design.md). Send unresolved operational details to the internal register with the action that would require them.

This chunk is complete when those consumers can use the same accurate event story. It does not require a full executed-contract review, confirmed capacity model, pricing exercise, or business interview before the demonstration can proceed.
