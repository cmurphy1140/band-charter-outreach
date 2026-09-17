---
description: Audit a generated document against the record behind it — every claim traced to a source, tiers and line states respected, no individual named — and report findings without repairing anything.
argument-hint: "[case-id|trip-id|--all]"
allowed-tools: Bash(node:*), Bash(grep:*), Bash(git status:*), Read, Grep, Glob, Task
---

Audit the generated documents for `$ARGUMENTS` (empty means everything) before they
are shown to anyone outside this repository.

**1. Confirm the documents match their records.** An audit of a stale document tells
you nothing:

```
node pipeline/cli.cjs check --all
node pipeline/trip/cli.cjs check --all
```

If either reports a stale output, stop. Report it and name the render command; do not
re-render and then audit your own regeneration in the same breath.

Read the trip layer's line carefully: `outputs current (0 file(s))` means no renderer
is installed, so **nothing was compared**. That is not a pass, and anything sitting in
`pipeline/trip/out/` is unverified. Say so rather than reporting a clean check.

**2. Run the audit.** Hand the relevant `pipeline/out/<case-id>/` or
`pipeline/trip/out/<trip-id>/` files, and the record each was generated from, to the
`evidence-audit` subagent. It returns findings in the project's
`{ severity, check, id, message }` shape. It holds no Write or Edit, but its Bash
grant is not scoped by frontmatter, so confirm with `git status --short` that it
changed nothing rather than trusting the label.

**3. Run the mechanical privacy sweep yourself** over the same files:

```
grep -rEn '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' pipeline/out pipeline/trip/out
grep -rEn '\(?[0-9]{3}\)?[ .-][0-9]{3}[ .-][0-9]{4}' pipeline/out pipeline/trip/out
node --test tests/pipeline.test.cjs tests/trip_foundation.test.cjs
```

Read every hit, and judge it by the layer it is in — the two rules are different and
applying the wrong one produces a false finding:

- Under `pipeline/trip/out/`, **any** individual's name, mailbox or direct number is
  an error. That layer redacts every person to a role; only business names and their
  published group-sales channels belong there.
- Under `pipeline/out/`, a director's published contact is **legitimate evidence**
  when it is tier 1 documented and carries the page URL it was printed on. Do not
  report it and do not remove it. Report a contact with no source URL, one marked
  inferred, one that matches a domain pattern rather than a published page, or any
  contact on an illustrative record.
- `permission_to_contact: unknown` is the record being honest, not a finding.

**4. Report** the findings table, then the verdict on one line —
`clear to issue`, `blocked: N error(s)`, or `stale — re-render first` — then the
coverage line naming any claim you could not decide about.

Repair nothing. If a claim has no source, the fix is to find the source or to remove
the claim, and both of those are decisions a human makes. Softening the wording so it
survives the audit is the one outcome this command exists to prevent.
