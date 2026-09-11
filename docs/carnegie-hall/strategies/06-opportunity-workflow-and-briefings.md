# 06 — Opportunity workflow, handoffs, and action briefings

[Strategy index](README.md) · [Business workflow evidence](../BUSINESS-CONTEXT.md) · [Automation fit](07-software-and-automation-fit.md)

## Purpose and concrete output

Demonstrate that an interested ensemble becomes a workable booking through several connected decisions. The proposed output is a small illustrative opportunity model, a set of realistic scenarios, and an example weekly action brief. It should help a viewer see what needs attention without pretending to have read the company's live inbox, contracts, or payment system.

The supplied logistics justify the breadth: proposals, school approvals, contracts, payment information, hotel arrangements, transport objections, rooming lists, and performance schedules all matter. They do not reveal every current business rule. Use sensible example behavior and label it as such.

## Model the information without overbuilding

Keep separate concepts for an organization, an ensemble opportunity for March 3, a partner relationship, a document/version, and a next action. A school may bring more than one ensemble; a partner may represent more than one school. Count an opportunity once even if both channels surface it.

Use a broad progress stage for navigation, but keep parallel indicators for school approval, proposal readiness, contract state, payment state, and supplier readiness. A linear sales funnel cannot fully describe these dependencies: school approval may be pending while a proposal is revised and transport is being checked.

| Field group | Proposed fields | Demonstration use |
|---|---|---|
| Opportunity | ID, event ID, institution/ensemble, channel, partner link | Prevents duplicate counting and event confusion |
| Evidence | Source reference, actual versus illustrative status, observed date | Shows why a status exists |
| Commercial progress | Proposal version, approval state, contract state, payment due/received state | Avoids equating a signed contract with a deposit |
| Coordination | Transport/hotel requirement, supplier state, next dependency | Connects sales progress to a feasible trip |
| Action | Clear action, responsible role, due date or unknown, reason | Turns a record into something useful |

Use role labels in example records rather than real staff assignments. For instance, “business relationship lead” and “logistics coordinator” are illustrative responsibilities, not confirmed Troen job titles. “Logistics and software developer” identifies the POC role.

## Scenario set

1. **A research candidate with no contact history.** The record has a sourced reason for relevance. The next step is review of fit, not a fabricated follow-up email.
2. **A synthetic director requests more information.** Show how a concise needs summary selects the appropriate materials and proposal template. Record approval timing and group size as unknown until the example explicitly supplies them.
3. **A synthetic group has a proposal but school approval is pending.** Show the approval dependency and the current proposal version. Do not advance it to “booked” because a document exists.
4. **A synthetic agreement is signed but the deposit is unconfirmed.** Keep contract and payment states separate and create a reconciliation action. Never display this as money received.
5. **A supplier cannot support the proposed travel timing.** Model an itinerary revision inspired by the other-trip supplier example. Do not copy that trip's dates or claim the same restriction applies universally.
6. **A partner-managed opportunity appears through two sources.** Link the shared ensemble once; flag relationship coordination before any actual approach. Show which responsibilities are proposed versus confirmed.
7. **Final coordination needs a rooming list or schedule decision.** Use a synthetic deadline and identify its example status. Do not borrow the March 31 hotel cutoff for March 3.

These are proposed demonstration scenarios, not seven actual Troen opportunities. Use synthetic institution names for activity records and keep them out of the real research workbook's opportunity totals.

## Build the example action brief

Generate the brief from the scenario records so it can be reconciled. Lead with the few actions that change progress: revise a proposal, resolve an approval dependency, confirm a payment record, or obtain a supplier decision. Include what changed, why it matters, the next action, and the responsible role. Keep background detail available but secondary.

Separate an example “this week” summary from dated real evidence. Display the scenario's reference date, not an implied current operational week. If nothing changed, do not invent activity to fill the brief. For future real use, retain source references to the underlying record or document.

## Method and tools

Start in a worksheet or a small local structured file. Use operations process-optimization to identify meaningful handoffs, product-management metrics for useful status definitions, spreadsheets for the working view, and document tools for the brief. If assembly is repetitive, pass the stable example structure to the automation strategy.

Write explicit rules for dates, counts, and payment states. Models can summarize notes and explain implications, but should not decide from prose that funds settled or an agreement is legally effective. A future operating booking rule must come from the business at activation time.

## Verification and stopping point

Check that every brief item traces to a scenario; every scenario is visibly illustrative; one ensemble is not double-counted through two channels; and no incomplete approval/payment/supplier state quietly becomes a confirmed booking. Exercise missing dates, conflicting notes, an obsolete proposal, and an unchanged record.

The chunk is complete when the examples tell a coherent story and reveal useful next actions. It does not require Troen to map its entire operation, provide private records, or adopt a new process. Actual operational use later needs the relevant records, role assignments, and business definitions for the narrow pilot being used.
