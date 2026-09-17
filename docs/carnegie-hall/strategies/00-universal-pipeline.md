# 00 — Universal pipeline, iterated per use case

[Strategy index](README.md) · [Engine and cases](../../../pipeline/README.md) · [Business context](../BUSINESS-CONTEXT.md) · [Internal decisions](../INTERNAL-DECISIONS.md)

## Purpose and concrete result

The eight strategies describe one event well. This one makes the shape reusable: a single
five-stage pipeline, run once per **use case** — a school or organization in play, against an
event Troen is coordinating — with the rules enforced by a program rather than by memory.

The result is [`pipeline/`](../../../pipeline/README.md): a case file per use case, a shared
vocabulary, a governance validator, and generated Stage 1–5 outputs. March 3, 2027 is the
first case. A charter school ensemble against the same event is the second, marked
illustrative, which is what proves the loop is a loop rather than a one-off.

This strategy is the reasoning. The engine's README is the operating manual.

## What was already here

Nothing in the vocabulary is new. [Strategy 01](01-evidence-and-event-model.md) already
assigns "documented, employee-reported, recommendation/inference, illustrative, or unknown";
[strategy 03](03-prospect-discovery-and-verification.md) already separates the school, the
ensemble, the published adult role and the opportunity; [strategy 06](06-opportunity-workflow-and-briefings.md)
already refuses a single linear funnel; the [decision register](../INTERNAL-DECISIONS.md)
already records each unknown with the action that makes it necessary. The pipeline turns
those five agreements into five stages, and turns the guardrails in [AGENTS.md](../../../AGENTS.md)
into checks that fail loudly.

The first case file therefore contains no new research and no new business claim. Every
record is carried from material already reviewed in this repository, with its original
source id.

## The five stages

1. **Event model and commercial fact spine.** Every event detail is classified into one of
   five evidence tiers and carries its source. Fixed venue overhead, variable per-person
   travel cost and the customer package price are three separate groups, so a working-sheet
   figure can never drift into a quote. An unconfirmed price stays `null` and
   `to_be_confirmed`; the validator rejects an invented number.
2. **Prospect discovery and research staging.** Four layers — account, unit or ensemble,
   adult role, opportunity — each resolving to its parent. Contact details are recorded only
   when published on a primary page, never inferred. The staging file is local and separate
   from any marketing list.
3. **Multi-indicator opportunity workflow.** Five parallel status vectors instead of one
   funnel stage. Each value is classified blocking, in progress or clear, and the weekly
   action brief shows only the blocking ones, grouped by owner role, alongside the tier 5
   facts that gate a live action. Labelled synthetic scenarios rehearse the workflow without
   faking business activity.
4. **Audience deliverables and CRM fit.** The four audience documents are named with the
   files that actually exist, and an issued deliverable may only cite customer-safe facts.
   The CRM mapping is generated, but gated: a record reaches `04-crm-staging.csv` only with
   published detail, recorded permission to contact and a known relationship owner.
   Everything else lands in `04-crm-blocked.csv` with its reason.
5. **Demonstration-first validation and governance.** The five walkthrough moments each name
   the artifact a reviewer opens, and a moment is only "ready" when that file is in the
   repository. The governance report lists every check enforced and every finding.

## Iterating per use case

A second use case against the same event sets `"extends_event"` and inherits the event, its
sources, the fact spine and the cost model. It restates only the prospect side: the school,
the ensembles, the adult roles, the opportunities and their status vectors. One event spine,
many cases. For a different Troen event, the case models its own event and becomes a spine
that later cases can inherit.

The working loop for a new case is: `init` → fill the prospect side → `validate` until the
errors are gone → `render` → read `03-action-brief.md` for what is actually blocking. The
errors are the instructions; there is no separate checklist to keep in sync.

## Which tool does which stage

The original proposal split the stages between assistants. What matters here is narrower:
Stage 1 and Stage 4 are judgment work on real documents and belong with the logistics and
software developer, with an assistant drafting against the sources. Stage 2 acquisition is
the existing Python scrapers under `scrapers/` and `scripts/`, whose audited defects are
unchanged by this layer. Stages 3 and 5 are now deterministic: the brief, the CRM gate and
the walkthrough readiness are generated from the case file, so no assistant is asked to
remember a rule that a check can enforce. Whichever assistant is in the seat, the case file
and the validator are the shared surface.

## Specific decisions for this POC

- The value lists gained "Not started", "Not sent", "Not checked" and "Declined" so a case
  that has not begun a vector is representable without inventing progress.
- The illustrative case carries no contact details at all. A fabricated email is exactly the
  habit the no-guess rule exists to prevent, so the validator refuses one even in a rehearsal.
- `04-crm-staging.csv` is a file, not an import. Nothing in this layer contacts anyone,
  prices anything, or writes to a CRM.
- Generated outputs are tracked so a reviewer can read them without running anything.
  `make pipeline-check` fails if a case changed without re-rendering.

## Handoff and stopping point

Stop when a case validates clean, its outputs are current, and its brief names the real
blockers. The next useful increments, in order: a reviewed importer from
`data/final/prospects.csv` into Stage 2 staging that quarantines the audited identity and
attribution defects instead of inheriting them; a real second school case to replace the
rehearsal one; and a demo view that reads `03-action-brief.md` so the walkthrough shows the
brief rather than describing it. None of those is required for this layer to be useful.
