# Claude work record: universal pipeline

Status: implemented and locally verified by Claude Code on branch
`claude/universal-pipeline-strategy-54qrt3`, in the cloud checkout at
`/home/user/band-charter-outreach`. Awaiting the coordinator's review and integration.
Nothing in this increment was deployed, published, sent, or connected to an account.

## Assignment

The user supplied a five-stage client-acquisition pipeline prompt and asked to make it
real, iterative per use case — the school in play and the event Troen is coordinating.
Exploration was not the ask; a working layer was.

## What was built

New, coordinator-reviewable, repository-relative:

- `pipeline/vocabulary.cjs` — evidence tiers, entity layers, status vectors, deliverable
  kinds, walkthrough moments, CRM custom fields, source kinds. One definition for all cases.
- `pipeline/validate.cjs` — fourteen named governance checks plus the case loader, including
  event-spine inheritance for a second use case.
- `pipeline/render.cjs` — deterministic Stage 1–5 outputs.
- `pipeline/cli.cjs` — `list`, `validate`, `render`, `check`, `init`.
- `pipeline/cases/troen-carnegie-2027-03-03.case.json` — the March 3 case.
- `pipeline/cases/rehearsal-charter-school.case.json` — a labelled illustrative second case.
- `pipeline/cases/TEMPLATE.json`, `pipeline/README.md`, `pipeline/out/**` (tracked outputs).
- `docs/carnegie-hall/strategies/00-universal-pipeline.md` — the reasoning.
- `tests/pipeline.test.cjs` — 15 tests.

Edited: `Makefile` (added `pipeline`, `pipeline-check`), `docs/carnegie-hall/strategies/README.md`
(one index row), `docs/carnegie-hall/PROGRESS.md` (one dated section). Those three are
coordinator-owned; the changes are additive and are flagged here for review rather than
assumed. No other tracked file was touched. No demo, material, workbook, source document,
research record or business claim was changed.

## Evidence discipline

The March 3 case contains no new research and no new business claim. Every fact, figure,
account, ensemble, adult role and unknown is carried from `BUSINESS-CONTEXT.md`,
`INTERNAL-DECISIONS.md`, `demo/carnegie-hall/example.json`, `salem.json` and `mtc.json`,
keeping the original source ids (P01, P02, I01–I06, S01–S09, MTC-01/02/05, plus ER01 for the
employee reports and DR01 for the decision register). The $26,460 licence fee stays internal
and unreconciled against the working sheet's $28,400 afternoon line. The ten-ensemble target
stays a provisional target. The NYIMF/Troen match stays unconfirmed. Every customer package
price is unquoted.

The rehearsal case is fictional throughout, carries no contact detail, and is refused a CRM
row by the validator, not by convention.

## Verification

- `node pipeline/cli.cjs validate --all` — 0 errors. Three warnings, all intended: two
  contacts held in local staging for unknown permission, one walkthrough gap on the
  rehearsal case.
- `node --test tests/pipeline.test.cjs` — 15 pass.
- `node --test tests/pipeline.test.cjs tests/carnegie_demo.test.cjs tests/carnegie_review.test.cjs`
  — 35 pass, after `npm install --prefix demo/carnegie-hall` (the container had no
  `node_modules`; `docx` is required by the pre-existing demo build test).
- `make pipeline-check` — outputs current, tests pass.
- Generated outputs re-read by hand for tier placement, unquoted prices, blocking
  dependencies and the empty CRM staging file.

Not run: Python tests (no `.venv` in this container; no Python file was changed), Word/Excel
rendering, browser checks, and any live source re-check. No network request was made to a
school, program or company site; the URLs in the case file are carried from records already
reviewed on September 10–11, 2026, and their `checked_on` dates say so.

## Limits

A passing governance check is not a verified pipeline. This layer governs and assembles
material that was already reviewed; it does not acquire it. The audited defects in
`scrapers/` and `scripts/` — lost identities, contact attribution, destructive and stale
refresh paths — are untouched, and nothing is imported from `data/final/prospects.csv`.
`04-crm-staging.csv` is a file, not an import.

## Proposed next increment

A reviewed importer from `data/final/prospects.csv` into Stage 2 staging that quarantines
the audited identity and attribution defects rather than inheriting them; then a real second
school case in place of the rehearsal one. Neither is started.
