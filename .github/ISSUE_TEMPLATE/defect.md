---
name: Defect
about: Something behaves differently from what the project claims
title: ''
labels: defect
---

## What happens

<!-- Observed behaviour. What you saw, not what you think causes it. -->

## What was expected, and where that expectation comes from

<!-- Quote the document, test, or commit that claims the other behaviour. -->

## Reproduction

- Commit / branch:
- Host and tool versions (`git --version`, `node --version`, Python):

```
```

## Evidence

<!-- Command output, file paths, a failing assertion. Not a description of it. -->

```
```

## Scope

- [ ] Confirmed by a run in this environment
- [ ] Reproduced on a second checkout or host
- [ ] Inferred from reading only — not yet reproduced

Affected paths:

## Known state

- Is this a **new** defect, a **legacy audit finding**, or a **reviewed
  bypass**? <!-- These are different; see AGENTS.md. -->
- Does anything currently depend on the broken behaviour?

## Not established

<!--
What this report does not show. A failing check on one path does not implicate
the rest of the pipeline; say so explicitly rather than leaving it open.
-->
