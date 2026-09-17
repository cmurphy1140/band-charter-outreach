---
name: Task
about: A bounded unit of work, ready to dispatch to a worktree
title: ''
labels: task
---

## Outcome

<!-- What is true when this is done. One sentence, stated as a result. -->

## Owned files

<!--
Exhaustive. This list is the merge contract — a branch that touches anything
outside it is rejected without reading the diff. See docs/ops/GIT-WORKFLOW.md §4.
Name the files another unit owns nearby, so the boundary is explicit.
-->

- 

Files this unit must **not** touch:

- 

## Base

- Branch from: <!-- origin/main, or a full base commit. Never a bare `main`. -->
- Branch name: <!-- claude/<area>-<slug> or codex/<slug> -->

## Acceptance checks

<!-- Commands that decide whether this is done. If there are none, say so. -->

```
```

## Known and unknown

- Verified facts this work should build on:
- Still unknown, and must not be asserted:

## Not in scope

<!-- What would be a reasonable next step but is someone else's unit. -->
