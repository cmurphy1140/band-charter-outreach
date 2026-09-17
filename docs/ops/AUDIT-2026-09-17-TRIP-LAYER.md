# Audit — trip production layer and operations batch, September 17, 2026

[Issue board](ISSUE-BOARD.md) · [SaaS fit](SAAS-FIT.md) · [Competitor operations](COMPETITOR-OPERATIONS.md) · [Dev loop](DEV-LOOP.md) · [Git workflow](GIT-WORKFLOW.md) · [Agent workflow](AGENT-WORKFLOW.md) · [PII guard](PII-GUARD.md)

This audits the work itself, including the parts that were wrong. It separates what was
implemented from what was verified, and what was verified from what is active. Where a claim
made during the session turned out to be unsupported, it is corrected here rather than left
in the transcript.

## Scope and method

One coordinator built a shared trip record and contract, then dispatched seventeen units to
independent git worktrees with disjoint file ownership. Each unit ran its own code review,
its own tests and an end-to-end recipe before pushing. The coordinator merged all seventeen,
reconciled the tree, and wrote this.

Method limits worth stating first: every unit reported on its own work, and a unit's account
of its own correctness is evidence, not proof. The coordinator re-ran the full verification
on the integrated tree rather than trusting the sum of the reports, and checked the specific
claims recorded below. The coordinator did not read all ~30,000 lines of delivered diff.

## What exists

| Area | Delivered | Files |
|---|---|---|
| Trip record and contract | `schema.cjs`, `load.cjs`, `cli.cjs`, two trip records, README | `pipeline/trip/` (36) |
| Renderers | vendor sheet, run sheet, client itinerary, pricing, deadlines, change diff, consistency audit, library coverage | 8 modules |
| Destination library | 18 Chattanooga components, 3 shared channels, 13 sources | `pipeline/trip/library/` |
| Operations documents | competitor study, SaaS fit, issue board (88 issues), git workflow, dev loop, agent workflow, PII guard | `docs/ops/` (7) |
| Agent configuration | 5 agent definitions, 4 slash commands | `.claude/` (9) |
| Quarantining importer | `import-prospects.cjs` over the 206 legacy rows | `pipeline/` |
| Privacy guard | `check-pii.cjs` | `scripts/` |
| Demo | local trip walkthrough, unpublished | `demo/trip/` (3) |
| Generated documents | 33 tracked outputs across both layers | `pipeline/*/out/` |

44 commits, 102 files, +30,678 lines against `main`.

## Verification actually run on the integrated tree

| Check | Result |
|---|---|
| `node --test tests/*.test.cjs` | **352 pass, 0 fail** across 14 suites |
| `.venv/bin/python -m pytest -q` | **87 pass, 4 skip** (skips await manually saved pages from blocked sources) |
| `node pipeline/cli.cjs check --all` | Outputs current, both cases |
| `node pipeline/trip/cli.cjs check --all` | Outputs current, both records |
| `node pipeline/trip/cli.cjs validate --all` | 0 errors; 22 and 21 warnings, every one intended |
| `node scripts/check-pii.cjs` | Clean |
| `make check-fast` | Passes |
| Real supplier telephone numbers in tracked files | None. Checked by direct grep after a unit warned that the dispatch prompts had quoted them |

**Not run, and therefore not claimed:** Word or Excel rendering, browser or accessibility
testing, any live re-fetch of a cited page, and GitHub Actions. The last is not a choice —
see *CI is implemented, not active* below.

## Corrections to claims made during this session

These were stated to the project owner and were wrong. They are corrected here because a
transcript is not a record.

| Claim | Correction | Found by |
|---|---|---|
| "Tourwriter: eliminating pricing errors and version confusion, ~70% faster" | Not reproducible on any page fetched. A customer-attributed "80% faster quoting" is verbatim. This quote was the centrepiece of the approved plan's market argument and came from a search summary, not a page | SaaS fit |
| "GroupCollect ~$60/month" | No such tier. Membership is $0; the charge is 1% or 4% per transaction. The $60 is operator-reported and maps to no published plan | SaaS fit |
| "Ezus ~80% faster" | Not on its pricing page; the figure there is "onboarding averages 23 days" | SaaS fit |
| TourLeaderPro listed as a candidate | Not group-travel software. An Italian tour-leader consultancy | SaaS fit |
| "GroupCollect does not offer supplier management" | Too strong. GroupCollect Works publishes supplier document exchange and a centralised supplier view. The accurate narrower claim is that it does not advertise itinerary building tied to costing, occupancy-tiered pricing, margin calculation or client proposal generation | Competitor operations |
| "Every cell of the price table moved" | Eleven of twelve. The 80-pax triple held at $887. Corroborated independently three times | SaaS fit, consistency audit, change diff |
| "The coach operator's last printed line moved back to Saturday, so the coaches must take the group home on a day they are no longer printed on" | **Withdrawn.** An artifact of the record modelling the Sunday departure as an unsupplied line. Once the departure is recorded as the coach line it is, both printings carry a Sunday coach movement. The dropped checkout step remains a real material change | Coordinator, while fixing the record |
| "The trip layer's source-date check used the wrong field name" | There was no source-date check at all. `git show` on the committed file confirms it | Coordinator |

One further qualification. The competitor unit reported that the redraft-and-recall premise
has no support in the repository. That is true of the documents. It is not unsourced: it came
from the project owner directly, which this project's own evidence vocabulary treats as
employee-reported — the same class as the participation and deposit reports already relied
on. It still warrants confirming with the business before it anchors a purchase.

## Defects found in the coordinator's foundation

Fourteen, every one reported by at least one unit and most by several. All fixed, each with a
regression test that was made to fail before it was trusted.

| # | Defect | Reported by |
|---|---|---|
| 1 | Impossible dates passed a shape-only regex (`2027-13-05`) | Client itinerary |
| 2 | Slot times compared as strings while the regex accepted a single-digit hour, so a correct pair warned and a real inversion passed silently | Five units |
| 3 | A malformed price row threw a TypeError out of the validator instead of producing a finding | Three units |
| 4 | The second printing's price table was never validated | Pricing |
| 5 | Ghost supplier ids in inclusions, cost components, known unit prices and related suppliers validated clean, surfacing as "undefined" inside rendered documents | Vendor sheet, consistency audit |
| 6 | `source_ids` validated in three of the eleven places the record carries them | Deadlines |
| 7 | A dangling `trip.supersedes` validated clean, then threw from inside a renderer mid-run | Change diff |
| 8 | No date check on sources at all | Coordinator, writing a test |
| 9 | `check` compared only files the current renderers produce, so a renamed or deleted renderer left a stale document on disk while the staleness gate reported a pass | Four units |
| 10 | `check` called an empty comparison a pass | Agent definitions, issue board |
| 11 | A blocked render still created its output directory | Change diff |
| 12 | One unreadable record aborted the whole `--all` run | Destination library |
| 13 | `loadCase` recursed before its depth guard, so a self-inheriting case overflowed the stack | Agent definitions |
| 14 | A string evidence tier passed validation, then failed the renderer's numeric filter and dropped a sourced fact from the document with no error anywhere | Demo |

Defect 14 is the most serious. A sourced fact disappearing silently is precisely what the
evidence tiers exist to prevent.

## Defects the units found in their own work

Recorded because they say something about whether the reviews were real. Each unit ran the
`code-review` skill; the findings below are ones a unit reproduced and fixed rather than
argued with.

- The itinerary-copy agent's safety check was a line-based diff filter that dropped lines
  containing `"blurb"`. Trip records store each slot on one line, so the line carrying an
  edited **time** also carries the word `blurb`. The check passed a record whose times had
  been rewritten. Replaced with a structural compare and made to fail on purpose.
- The PII guard's first draft reproduced real supplier telephone numbers from the dispatch
  prompt in its own comments and documentation — inside the tool meant to prevent exactly
  that. All examples now use the reserved `555-01xx` range.
- The PII guard returned "clean" for a file holding a director email when passed explicitly,
  because the default excludes were overriding an explicit `--include`.
- The library's opening-hours comparison compared clock strings, so an unpadded `8:30`
  silently passed and lost a real finding.
- The competitor study's own review caught a miscount, an invented vendor pricing model, and
  an off-by-one on a published cancellation boundary.
- The issue board contained a dependency cycle and a do-first order that scheduled four
  issues before their prerequisites.

## Integration

Sixteen branches merged with zero conflicts; the seventeenth merged after the record change
below. Disjoint file ownership was the whole mechanism and it held.

Splitting one slot in the trip record — separating a lunch at own cost from a coach ride home
sold as an inclusion — broke eleven tests across six files. Ten were count or identifier
assertions. The eleventh was substantive: two slots now share a printed time, which exposed
the run sheet's determinism test assuming within-day order is always incidental. For two
lines at the same printed time the record's sequence is the only ordering information there
is, and it comes from the page, so the renderer is right to preserve it. The test now
shuffles only distinct times and separately asserts that swapping two same-time lines does
change the sheet.

One test was found to depend on a defect rather than a rule: the client itinerary's
"an explicit exclusion beats the inclusion coverage" case worked only because the record
contained a slot that was simultaneously sold and excluded. Fixing the record deleted the
test's subject; the case is now constructed explicitly.

## Implemented, verified, active — three different things

- **CI is implemented, not active.** The push to `.github/workflows/ci.yml` was rejected:
  *"refusing to allow a GitHub App to create or update workflow `.github/workflows/ci.yml`
  without `workflows` permission"*. This confirms empirically what `docs/SCRAPING_HURDLES.md`
  row 14 recorded by citation. The workflow sits at `workflows/ci.yml` and activates by
  copying it from a normal git client — the same gate as `refresh.yml`. **Until someone does
  that, nothing gates a push.**
- **The PII guard is implemented, not wired.** `make check-pii` and the hook configuration are
  written down in `PII-GUARD.md` for a human to apply deliberately. The `Stop` hook variant
  carries a caveat: an unfixed finding would wedge the turn.
- **The demo is built, not published.** `scripts/package-demo.cjs` is untouched. Publishing
  needs a second source pair, not three array entries, because the build pins its source
  directory. The exact change is in the unit's report and was deliberately not applied.
- **The importer runs, nothing imports.** 101 of 206 rows quarantined, 105 staged for review,
  **zero CRM-ready, zero customer-safe, tier 1 unreachable by construction.** Its output is
  gitignored: a derived near-copy of an artifact the audit found defective, carrying
  researched contact details verbatim.

## What the work found about the business

Computed from the record rather than asserted.

- Of 13 counterparties on one real trip: 10 have no recorded rate, 11 no deadline, 13 no
  cancellation terms, 7 no contact attempt at all. **Zero of 21 supplied lines are confirmed.**
- Of the blended `Attractions $183.00` per-person line, $24.00 traces to a written-down rate.
  **$159.00 covers six counterparties whose rate is recorded nowhere.**
- The published price table fits `A + B/N` — a per-person amount plus a per-group pot divided
  by headcount. Fitting from the 80 and 100 tiers and holding 90 out, every occupancy column
  lands within **$0.33** at the unused tier. Derived: a coach charter total of **$26,774.52**
  and a room rate of **$216.75 per room per night**, the latter from three independent
  estimates agreeing within $0.89. Both are solved *from* the published table and labelled
  derived, not sourced.
- **A reconciliation that fails.** That derived room rate puts quad hotel cost at $162.56 per
  person for three nights against the quote system's **$125.16** — a $37.40 gap, $2,992 across
  80 travellers, irreconcilable at any whole occupancy. Either the cost line and the room
  differential were built from different rates, or one is stale. This is a question for the
  office, not a defect in the model.
- **"Comps" are a net cost, not a discount.** At 80 payers the vendor-earned comps are worth
  $171.00 (−$2.14 per payer); the 3 trip-granted places consume $1,194.48 (+$14.93 per payer).
  Net **+$12.79 per payer**. Written as `80 + 3 comps` in pen they read as a giveaway.
- Public sources read 2026-09-17 indicate the orchestra plays at Soldiers and Sailors Memorial
  Auditorium while the Tivoli is renovated, not returning until the 27-28 season. That
  suggests the first printing's venue was right and the second introduced the error rather
  than correcting one. **Worth putting to the business.**

## Recommendation, and the case against this work

The SaaS study's verdict is **buy the production layer, do not build it; build only the trip
record.** That argues partly against the engine in this branch, and the audit does not soften
it. The honest position: the record and its checks are the durable asset, the renderers are a
working prototype that doubles as the evaluation rubric for a vendor demo, and the break-even
arithmetic is left as arithmetic because three of its five inputs are unknown.

The highest-value next action costs nothing: three of four incumbent cost lines (GroupCollect
tier, DocuSign plan, Zoho edition) are unverified, and one card statement resolves them.

## Remaining gaps

1. CI inactive until the workflow file is copied by hand.
2. No linter, formatter, type checker or coverage anywhere.
3. `demo/carnegie-hall/index.html` is tracked and generated, but nothing compares the
   committed copy against a fresh render — forget to rebuild and `make check` stays green
   while the live site publishes a stale render.
4. The legacy Python pipeline's audited defects A01–A14 remain open except the two already
   repaired; the importer quarantines them rather than fixing them.
5. Every business unknown in the decision register is still unknown: approved price basis,
   event capacity, relationship ownership, contact permission.
6. The competitor study checked robots.txt for 2 of 17 origins and cached no fetched page
   under `data/raw/` as `AGENTS.md` requires. Recorded rather than concealed.
7. `docs/carnegie-hall/PROGRESS.md` has no entry for any of this. The project's own
   checkpoint rule requires one; it is the coordinator's to write and is not yet written.
