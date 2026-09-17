<!--
Short is fine. The state table is not optional — see docs/ops/GIT-WORKFLOW.md §6.
-->

## What changed

<!-- One or two sentences. What is different afterwards, not what you did. -->

## State

Tick only what is true right now. An untickable box is information, not a failure.

- [ ] **Implemented** — the change exists in this branch
- [ ] **Verified** — checks below were run and passed, on this diff
- [ ] **Committed** — the work is in commits, not just the working tree
- [ ] **Pushed** — the branch is on the remote
- [ ] **Deployed** — observed working in production, not merely merged

## Verified

<!--
Paste the commands you actually ran and what they printed. Nothing here means
nothing was checked.
-->

```
```

## Asserted, not verified

<!--
Claims this PR makes that no check covers: reasoning, judgement calls, anything
resting on a source rather than a run. Write "none" if there are none.
-->

## Unresolved

<!--
What this leaves open, and anything a reader should not conclude from it.
A passing bounded check does not certify the surrounding pipeline.
-->

## Ownership

- Declared base commit:
- Files this unit was allowed to touch:
- [ ] `git diff --name-only <declared-base>...HEAD` is a subset of that list

<!-- Diff against the DECLARED base, not origin/main — see GIT-WORKFLOW.md §4. -->

## Before merging

- [ ] `git ls-files -s CLAUDE.md` prints mode `120000` (index intact)
- [ ] `[ -L CLAUDE.md ]` succeeds (working tree intact — a clean `git status`
      does **not** prove this; see GIT-WORKFLOW.md §9)
- [ ] No credential, key, or individual's contact detail in the diff
- [ ] Generated outputs are not stale (`make pipeline-check`)
- [ ] Commits follow `type(scope): lowercase summary`, no trailing period
