# Audit — trip production layer and operations batch, September 17, 2026

[Issue board](ISSUE-BOARD.md) · [SaaS fit](SAAS-FIT.md) · [Competitor operations](COMPETITOR-OPERATIONS.md) · [Dev loop](DEV-LOOP.md) · [Git workflow](GIT-WORKFLOW.md) · [Agent workflow](AGENT-WORKFLOW.md) · [PII guard](PII-GUARD.md)

Read this one before the others. It is the map of what actually holds up.

A word on how to read it. There is a long list of defects below, and most of them are mine.
That is not a sign the day went badly — it is the shape you should expect when seventeen
reviewers with real attention are pointed at a foundation built in forty minutes. The useful
question is never "how many did we find" but "would we have found them any other way", and
for most of these the honest answer is no. So read the defect list as evidence the method
worked, and save your scepticism for the parts where nobody checked.

## What the work was

One coordinator built a shared trip record and a written contract, then dispatched seventeen
units to independent git worktrees with disjoint file ownership. Each ran its own code review,
its own tests and an end-to-end recipe before pushing. The coordinator merged all seventeen,
reconciled the tree, and wrote this.

One method limit to hold onto: every unit reported on its own work, and a unit's account of
its own correctness is evidence, not proof. So the verification below was re-run on the
integrated tree rather than summed from the reports, and the specific claims recorded here
were checked individually. What was not done: nobody read all thirty thousand lines of
delivered diff. If you want a second opinion on any single unit, that is the gap to fill.

## What exists

| Area | Delivered | Files |
|---|---|---|
| Trip record and contract | `schema.cjs`, `load.cjs`, `cli.cjs`, two trip records, README | `pipeline/trip/` (36) |
| Renderers | vendor sheet, run sheet, client itinerary, pricing, deadlines, change diff, consistency audit, library coverage | 8 modules |
| Destination library | 18 Chattanooga components, 3 shared channels, 13 sources | `pipeline/trip/library/` |
| Operations documents | competitor study, SaaS fit, 88-issue board, git workflow, dev loop, agent workflow, PII guard | `docs/ops/` (7) |
| Agent configuration | 5 agent definitions, 4 slash commands | `.claude/` (9) |
| Quarantining importer | `import-prospects.cjs` over the 206 legacy rows | `pipeline/` |
| Privacy guard | `check-pii.cjs` | `scripts/` |
| Demo | local trip walkthrough, unpublished | `demo/trip/` (3) |
| Generated documents | 33 tracked outputs across both layers | `pipeline/*/out/` |

44 commits, 102 files, +30,678 lines against `main`.

## Verification actually run

| Check | Result |
|---|---|
| `node --test tests/*.test.cjs` | **352 pass, 0 fail** across 14 suites |
| `.venv/bin/python -m pytest -q` | **87 pass, 4 skip** (skips await manually saved pages from blocked sources) |
| `node pipeline/cli.cjs check --all` | Outputs current, both cases |
| `node pipeline/trip/cli.cjs check --all` | Outputs current, both records |
| `node pipeline/trip/cli.cjs validate --all` | 0 errors; 22 and 21 warnings, every one intended |
| `node scripts/check-pii.cjs` | Clean |
| `make check-fast` | Passes |
| Real supplier telephone numbers in tracked files | None — checked by direct grep after a unit warned the dispatch prompts had quoted them |

**Not run, and therefore not claimed:** Word or Excel rendering, browser or accessibility
testing, any live re-fetch of a cited page, and GitHub Actions. That last one is not a choice;
see *three states* below.

## Eight claims that were wrong

These were said to you during the day and they did not survive checking. They are here rather
than left in the transcript, because a conversation is not a record and you should not have to
remember which sentence to distrust.

| Claim | What is actually true | Found by |
|---|---|---|
| "Tourwriter: eliminating pricing errors and version confusion, ~70% faster" | Not reproducible on any page fetched. A customer-attributed "80% faster quoting" is verbatim | SaaS fit |
| "GroupCollect ~$60/month" | No such tier. Membership is $0; the charge is 1% or 4% per transaction. The $60 is operator-reported and maps to no published plan | SaaS fit |
| "Ezus ~80% faster" | Not on its pricing page; the figure there is "onboarding averages 23 days" | SaaS fit |
| TourLeaderPro listed as a candidate | Not group-travel software. An Italian tour-leader consultancy | SaaS fit |
| "GroupCollect does not offer supplier management" | Too strong. GroupCollect Works publishes supplier document exchange and a centralised supplier view. The narrower accurate claim: it does not advertise itinerary building tied to costing, occupancy-tiered pricing, margin calculation or client proposal generation | Competitor operations |
| "Every cell of the price table moved" | Eleven of twelve. The 80-pax triple held at $887 | Three units independently |
| "The coach operator's last line moved back to Saturday, so the coaches take the group home on a day they are no longer printed on" | **Withdrawn.** An artifact of the record modelling the Sunday departure as an unsupplied line. Record it as the coach line it is and both printings carry a Sunday coach movement. The dropped checkout step is still a real change | Coordinator, while fixing the record |
| "The trip layer's source-date check used the wrong field name" | There was no source-date check at all | Coordinator, while writing a test |

**The lesson in that table is about provenance, not carelessness.** The first four all came
from search-result summaries rather than the pages themselves, and every one of them collapsed
the moment a unit with time to spare went and read the page. That is a cheap, repeatable
failure mode and it is worth naming: a summary of a page is a claim about a page. If a number
is going to carry weight in a decision, someone has to open the thing.

The seventh is a different and more interesting kind of wrong. The finding was real *given the
data model*, and the data model was subtly wrong. Fix the model and the finding evaporates.
When you are building the record that everything else reasons from, an error there does not
stay put — it propagates into findings that look perfectly sound. That is the argument for the
validator being strict, and for writing the record before the conclusions.

One thing worth defending rather than conceding. The competitor unit reported that the
redraft-and-recall premise has no support in the repository. True of the documents — but it
came from you directly, which this project's own vocabulary treats as employee-reported, the
same class as the participation and deposit reports already relied on. Record it at that tier
with that provenance. It still wants confirming with the business before it anchors a purchase,
but it is not unsourced.

## Fourteen defects in the foundation

Every one reported by at least one unit, most by several, all fixed with a regression test
that was made to fail before it was trusted.

| # | Defect | Reported by |
|---|---|---|
| 1 | Impossible dates passed a shape-only regex (`2027-13-05`) | Client itinerary |
| 2 | Slot times compared as strings while the regex accepted a single-digit hour, so a correct pair warned and a real inversion passed silently | Five units |
| 3 | A malformed price row threw a TypeError instead of producing a finding | Three units |
| 4 | The second printing's price table was never validated | Pricing |
| 5 | Ghost supplier ids validated clean, surfacing as "undefined" inside rendered documents | Two units |
| 6 | `source_ids` validated in three of the eleven places the record carries them | Deadlines |
| 7 | A dangling `trip.supersedes` validated clean, then threw from inside a renderer mid-run | Change diff |
| 8 | No date check on sources at all | Coordinator |
| 9 | `check` compared only files the current renderers produce, so a deleted renderer left a stale document while the gate reported a pass | Four units |
| 10 | `check` called an empty comparison a pass | Two units |
| 11 | A blocked render still created its output directory | Change diff |
| 12 | One unreadable record aborted the whole `--all` run | Destination library |
| 13 | `loadCase` recursed before its depth guard, so a self-inheriting case overflowed the stack | Agent definitions |
| 14 | A string evidence tier passed validation, then failed the renderer's numeric filter and dropped a sourced fact from the document with no error anywhere | Demo |

**Number 14 is the one to remember.** Everything else on that list fails loudly or fails
harmlessly. That one fails *quietly*, and it removes a sourced fact from a document while every
check still reports green. The whole point of the evidence tiers is that a claim cannot go out
without its source; a bug that silently drops the claim defeats the mechanism while leaving it
looking healthy. When you are reviewing this kind of system, the defects worth hunting are the
ones where the failure mode is silence.

Number 2 is worth a second look for a different reason: five separate units reported it. When
independent reviewers converge on the same finding, that convergence is usually more
informative than any single report — it is the closest thing to a second opinion you get for
free.

## What the units caught in their own work

Recorded because it tells you whether the reviews were real rather than ceremonial.

- The itinerary-copy agent's safety check was a line-based filter that dropped lines containing
  `"blurb"`. Trip records store each slot on one line, so the line carrying an edited **time**
  also carries that word. The check passed a record whose times had been rewritten. The unit
  caught it by deliberately trying to break its own check — and then wrote down the principle:
  a verification nobody has forced to fail is an assumption wearing a command's clothes. That
  is the single most transferable thing anyone produced today.
- The privacy guard's first draft reproduced real supplier telephone numbers in its own
  comments — inside the tool built to prevent exactly that. It caught this itself and moved
  every example to the reserved `555-01xx` range.
- The same guard returned "clean" for a file holding a director email when passed explicitly,
  because default excludes were overriding an explicit `--include`. A guard that reports clean
  on the thing you asked it to check is worse than no guard.
- The library's opening-hours comparison compared clock strings, so an unpadded `8:30` silently
  passed and lost a real finding.
- The issue board contained a dependency cycle and a do-first order that scheduled four issues
  before their prerequisites.

## Integration

Sixteen branches merged with **zero conflicts**; the seventeenth merged after a record change.
Disjoint file ownership was the entire mechanism, and it is the part of today's method that
most deserves reuse. Seventeen parallel agents is closer to a small team's merge problem than
to solo work, and giving each one a file set nobody else could touch made the merge a
non-event.

Then one small change caused real work, which is instructive. Splitting a single slot —
separating a lunch at own cost from a coach ride home sold as an inclusion — broke eleven tests
across six files. Ten were count or identifier assertions, mechanical to update. The eleventh
was substantive: two slots now share a printed time, which exposed the run sheet's determinism
test assuming within-day order is always incidental. It is not. For two lines at the same
printed time, the record's sequence is the only ordering information that exists, and it comes
from the page. So the renderer was right and the test's premise was slightly too strong.

And one test turned out to depend on a defect rather than a rule. The client itinerary's
"an explicit exclusion beats the inclusion coverage" case worked only because the record
contained a slot that was simultaneously sold and excluded — which was the bug. Fixing the
record deleted the test's subject. **If a test stops compiling when you fix a bug, ask whether
it was testing the rule or the symptom.**

## Implemented, verified, active — three different things

Keeping these apart is the habit that makes a status report trustworthy.

- **CI is implemented, not active.** The push to `.github/workflows/ci.yml` was rejected:
  *"refusing to allow a GitHub App to create or update workflow… without `workflows`
  permission."* That confirms by experiment what `docs/SCRAPING_HURDLES.md` row 14 had recorded
  by citation. The parked copy has since been removed in favour of a single file, so the content
  now lives in history at `32d8e22:workflows/ci.yml` and must be recreated at
  `.github/workflows/ci.yml` from a normal git client. **Until you do that, nothing gates a
  push.** It is a two-minute job and it is the highest-leverage two minutes in this branch.
- **The privacy guard is implemented, not wired.** Its Make target and hook configuration are
  written down in `PII-GUARD.md` for you to apply deliberately. The `Stop` hook variant carries
  a real caveat: an unfixed finding would wedge the turn. Start with the Make target.
- **The demo is built, not published.** `scripts/package-demo.cjs` is untouched. Publishing
  needs a second source pair rather than three array entries, because the build pins its source
  directory. The exact change is in the unit's report and was deliberately left for you.
- **The importer runs, nothing imports.** 101 of 206 rows quarantined, 105 staged for review,
  **zero CRM-ready, zero customer-safe**, tier 1 unreachable by construction. Its output is
  gitignored: a derived near-copy of an artifact the audit found defective, carrying researched
  contact details verbatim.

## What the work found about the business

Computed from the record rather than asserted, and this is the part worth showing someone.

- Of 13 counterparties on one real trip: 10 have no recorded rate, 11 no deadline, 13 no
  cancellation terms, 7 no contact attempt at all. **Zero of 21 supplied lines are confirmed.**
- Of the blended `Attractions $183.00` per-person line, $24.00 traces to a written-down rate.
  **$159.00 covers six counterparties whose rate is recorded nowhere.**
- The published price table fits `A + B/N` — a per-person amount plus a per-group pot divided by
  headcount. Fitting from the 80 and 100 tiers and holding 90 out as a check, every occupancy
  column lands within **$0.33** at the unused tier. That yields a derived coach charter total of
  **$26,774.52** and a room rate of **$216.75 per room per night**, the latter from three
  independent estimates agreeing within $0.89. Both are solved *from* the published table, so
  they are labelled derived rather than sourced — a distinction worth preserving when you show
  them to anyone.
- **A reconciliation that fails, and should go to the office.** That derived room rate puts quad
  hotel cost at $162.56 per person for three nights, against the quote system's **$125.16** — a
  $37.40 gap, $2,992 across 80 travellers, irreconcilable at any whole occupancy. Either the
  cost line and the room differential were built from different rates, or one is stale. This is
  a question, not an accusation.
- **"Comps" are a net cost, not a discount.** At 80 payers the vendor-earned comps are worth
  $171.00 (−$2.14 per payer); the 3 trip-granted places consume $1,194.48 (+$14.93 per payer).
  Net **+$12.79 per payer**. Written as `80 + 3 comps` in pen on a cover page they read as a
  giveaway. They are the opposite, and nobody would spot it from the note.
- Public sources read 2026-09-17 indicate the orchestra plays at Soldiers and Sailors Memorial
  Auditorium while the Tivoli is renovated, not returning until the 27-28 season. That suggests
  the **first** printing's venue was right and the second introduced the error rather than
  correcting one. Worth putting to the business before anyone acts on it.

## The recommendation, including the case against this work

The SaaS study's verdict is **buy the production layer, do not build it; build only the trip
record.** That argues partly against the engine in this branch, and it would be easy to soften
it here. It is not softened.

Here is the honest shape of it. The record and its checks are the durable asset — they encode
what Troen actually knows about a trip, and they survive whatever tool you buy. The eight
renderers are a working prototype whose second job is to be the evaluation rubric for a vendor
demo: every one of them is a question you can now put to Tourwriter or Ezus with a concrete
example in hand. That is a better position than either building the whole thing or walking into
a demo with a wishlist.

The break-even arithmetic is left as arithmetic, with three of its five inputs unknown, because
inventing them would have produced a number that looked like an answer.

**The highest-value next action costs nothing.** Three of four incumbent cost lines —
GroupCollect tier, DocuSign plan, Zoho edition — are unverified. One card statement resolves
them, and every comparison in `SAAS-FIT.md` depends on it.

## Remaining gaps, honestly

1. CI inactive until the workflow file is copied by hand. Two minutes; do this one first.
2. No linter, formatter, type checker or coverage anywhere.
3. `demo/carnegie-hall/index.html` is tracked and generated, but nothing compares the committed
   copy against a fresh render. Forget to rebuild and `make check` stays green while the live
   site publishes a stale page.
4. The legacy pipeline's audited defects A01–A14 remain open apart from the two already
   repaired. The importer quarantines them rather than fixing them, which is the right order,
   but it is not the same as fixing them.
5. Every business unknown in the decision register is still unknown: approved price basis,
   event capacity, relationship ownership, contact permission.
6. The competitor study checked robots.txt for 2 of 17 origins and cached no fetched page under
   `data/raw/` as `AGENTS.md` requires. Recorded rather than concealed — but it is a real gap
   against the project's own rules, and the fix belongs outside `docs/ops/`.
7. Nobody read the full delivered diff. If one unit's work matters more to you than the others,
   that is where a careful second pass would pay.
