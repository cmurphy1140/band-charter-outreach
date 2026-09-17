---
description: Run the change-impact loop end to end — diff two versions of a trip, separate material from cosmetic, produce the supplier call list and draft messages, and re-check the documents.
argument-hint: "<trip-id> [old-ref] [new-ref]"
allowed-tools: Bash(node:*), Bash(git show:*), Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Grep, Glob, Task
---

A change came in for a trip. Work out what it actually costs before anyone picks up a
phone.

`$ARGUMENTS` is a trip id, optionally followed by an old git ref and a new one. Read
them out yourself and echo back what you understood; with no refs, compare the
working-tree record against `HEAD`.

**1. Get both versions.**

```
node pipeline/trip/cli.cjs list
git log --oneline -5 -- pipeline/trip/trips/<trip-id>.trip.json
git diff HEAD -- pipeline/trip/trips/<trip-id>.trip.json
```

For two refs, write the older one to a scratch file with
`git show <ref>:pipeline/trip/trips/<trip-id>.trip.json` before comparing. If there
is no diff at all, stop and say so.

**2. Run the impact analysis.** Hand both versions to the `change-impact` subagent.
It returns the material-change table, the call list ordered by nearest deadline, and
one `DRAFT — NOT SENT` message per supplier.

**3. Sanity-check its output yourself** before showing it:

- every field path it names resolves in both versions;
- every supplier id exists in `suppliers[]`;
- nothing in `git diff` is absent from both its tables — a miss here is how a
  supplier learns about a change from the group instead of from the operator;
- if `trip.headcount` moved, every supplier with a headcount-scaling basis or a
  recorded `minimum` is on the list or has a stated reason not to be;
- `git status --short` shows the record unchanged. `change-impact` holds no Write or
  Edit, but its Bash grant is not scoped by frontmatter, so confirm rather than
  assume — especially that no `attempts` entry appeared.

**4. Re-check the documents the change flows into:**

```
node pipeline/trip/cli.cjs validate <trip-id>
node pipeline/trip/cli.cjs check <trip-id>
```

If outputs are stale, say so and name the render command. Do not render silently — a
regenerated client document is a thing someone should choose to produce. If `check`
reports `0 file(s)`, no renderer is installed yet and that line means nothing was
compared; say so rather than reporting it as a pass.

**5. Report and stop.** The three sections, then a single next action.

What this command does **not** do, ever: send a message, open a supplier channel, or
add an `attempts` entry to the record. The attempts log is written after a human
actually makes contact, with the real date, channel and outcome. Logging a draft as
an attempt turns the one record that prevents duplicated effort — the same supplier
getting a web form and a voicemail on the same day — into a source of false
confidence.
