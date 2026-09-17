# Universal pipeline

[Strategy](../docs/carnegie-hall/strategies/00-universal-pipeline.md) · [Shared instructions](../AGENTS.md) · [Progress](../docs/carnegie-hall/PROGRESS.md)

One five-stage client-acquisition pipeline, run once per **use case**: a school or
organization in play, against an event Troen is coordinating. The engine is the same every
time. The case file is what changes.

A case is a single JSON file under [`cases/`](cases). Everything else — the governance
checks and the stage outputs — is generated from it.

```
node pipeline/cli.cjs list                 # cases and their shape
node pipeline/cli.cjs validate --all       # governance checks only
node pipeline/cli.cjs render  --all        # write the stage outputs under out/<case-id>/
node pipeline/cli.cjs check   --all        # fail if a tracked output is stale
node pipeline/cli.cjs init <case-id> "Title"
node --test tests/pipeline.test.cjs
```

`make pipeline` renders and `make pipeline-check` verifies. Node 20+, no dependencies.

## The five stages, and where each one lives

| Stage | In a case file | Generated output |
|---|---|---|
| 1 — Event model and commercial fact spine | `event`, `sources`, `fact_spine`, `cost_model` | `01-fact-spine.md` |
| 2 — Prospect discovery and research staging | `accounts`, `units`, `contacts`, `opportunities` | `02-research-staging.csv` |
| 3 — Multi-indicator opportunity workflow | `status_vectors`, `unblock`, `next_action`, `scenarios` | `03-action-brief.md` |
| 4 — Audience deliverables and CRM fit | `deliverables` | `04-crm-staging.csv`, `04-crm-blocked.csv` |
| 5 — Demonstration-first validation and governance | `walkthrough` | `05-walkthrough.md`, `00-governance-report.md` |

## The vocabulary every case shares

[`vocabulary.cjs`](vocabulary.cjs) is the single definition of the evidence tiers, the four
entity layers, the five status vectors, the four deliverables and the five walkthrough
moments. Change it there and every case, output and check follows.

**Evidence tiers.** 1 documented · 2 employee-reported · 3 inference or recommendation ·
4 illustrative · 5 unknown. Each tier requires something different: tiers 1 and 2 need a
source, tier 3 needs its `basis`, tier 4 must set `illustrative: true`, and tier 5 needs
`needed_for` — the action that makes resolving the unknown necessary.

**Four entity layers.** Account → unit or ensemble → adult role → opportunity. Two
ensembles in one school are two opportunities, not one blurred record.

**Five parallel status vectors,** not one funnel stage: proposal readiness, institutional
approval, contract execution, payment or deposit, supplier feasibility. Each value is
classified `blocking`, `in_progress` or `clear`, which is how the action brief decides what
to show. "Not started", "Not sent", "Not checked" and "Declined" were added to the original
value lists so a case that has not begun a vector is representable without inventing progress.

## What the governance checks refuse

Run `node pipeline/cli.cjs validate --all`; `00-governance-report.md` lists every check and
every finding. Errors block the stage outputs. Warnings stay visible and are never cleared
silently.

- A customer-safe claim that is not tier 1 documented evidence, and an issued deliverable
  that cites an internal-only fact.
- A contact detail that is not published on a primary page, or is marked `inferred`. Blank
  is correct. An illustrative case may not carry contact details at all, invented or otherwise.
- A price in the customer package that is not approved: `amount` stays `null` and the status
  stays `to_be_confirmed`. Fixed overhead and per-person figures stay internal-only, so a
  working-sheet number cannot drift into a quote.
- A CRM export without published detail, recorded permission to contact, and a known
  relationship owner. Everything else lands in `04-crm-blocked.csv` with its reason. An
  illustrative case can never export a row.
- A fictional scenario that is not labelled, or that reuses a real opportunity id.
- A source, deliverable or walkthrough artifact whose file is not actually in the repository.

## Iterating per use case

A second use case against the same event does not restate the event. It sets
`"extends_event": "<base case id>"` and inherits the event, its sources, the fact spine and
the cost model; it adds only the prospect side. Source and fact ids may not collide with the
inherited spine, and an inheriting case may not redefine the event.

```
node pipeline/cli.cjs init bayside-charter-carnegie-2027-03-03 "Bayside Charter · March 3"
node pipeline/cli.cjs validate bayside-charter-carnegie-2027-03-03   # errors name what to fill
```

[`cases/rehearsal-charter-school.case.json`](cases/rehearsal-charter-school.case.json) is
that second use case: a charter school ensemble against the same March 3 event, marked
`"illustrative": true`, used to rehearse the Stage 3 workflow with the vectors actually
moving. Every output it produces is stamped as illustrative and it exports nothing.

For a different event, drop `extends_event` and model the event in the case itself.

## Limits

This is a local governance and assembly layer over material that is already reviewed. It
does not scrape, call an API, contact anyone, price anything, or write to a CRM —
`04-crm-staging.csv` is a file, not an import. Generated outputs under `out/` are tracked so
a reviewer can read them without running anything; `make pipeline-check` fails if a case
changed without re-rendering. Stage 2 acquisition still belongs to the Python scrapers in
`scrapers/` and `scripts/`, whose audited defects are unchanged by this layer; nothing is
imported from `data/final/prospects.csv` automatically.
