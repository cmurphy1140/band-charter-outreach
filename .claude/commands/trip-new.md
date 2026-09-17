---
description: Scaffold a new trip record under pipeline/trip/trips/ with every section present, nothing confirmed and no invented facts.
argument-hint: "<trip-id> \"Trip title\""
allowed-tools: Bash(node:*), Bash(git status:*), Read, Write, Grep, Glob
---

Scaffold a new trip record. `$ARGUMENTS` is the trip id followed by the quoted title,
e.g. `bayside-charter-nyc-2027-03-03 "Bayside Charter · New York"`. Read the id and
title out of it yourself and echo both back before you write anything — if either is
missing, ask rather than inventing one.

Note there is **no `init` subcommand on the trip CLI** — unlike
`node pipeline/cli.cjs init`, which scaffolds a *case* from `cases/TEMPLATE.json`.
The trip layer has no template file, so the shape comes from the existing record.

Steps:

```
node pipeline/trip/cli.cjs list
```

1. Confirm the id is not already listed and that
   `pipeline/trip/trips/<trip-id>.trip.json` does not exist. If it does, stop and say
   so — do not overwrite a record.
2. Read an existing record in `pipeline/trip/trips/` for its shape, and
   `pipeline/trip/schema.cjs` for the legal values. Read `pipeline/trip/README.md`
   for the privacy rule before writing a line of it.
3. Write `pipeline/trip/trips/<trip-id>.trip.json` with all seven sections present —
   `trip`, `sources`, `suppliers`, `days`, `inclusions`, `exclusions`, `pricing` —
   and these starting conditions:
   - `trip.version` is `"v1-draft"`, `trip.supersedes` is `null`,
     `trip.prepared_on` is today.
   - `trip.client.recipient_role` is a **role**. No individual's name, mailbox or
     direct number anywhere in the file.
   - Every supplied slot starts at `"state": "sourcing"`. Nothing starts confirmed.
   - No `unit_price` key on a supplier whose price you do not have. An absent key is
     how unknown is represented; `{"amount": null}` fails validation.
   - `attempts` is `[]` on every supplier.
   - `sources` holds a real entry for anything you did fill in, and is otherwise `[]`.
4. Validate, and expect errors:

```
node pipeline/trip/cli.cjs validate <trip-id>
```

Every error names a field still to fill — `headcount.tiers`, `trip.start_date`, and
so on. **Read them out; do not fill them with plausible values to make them go away.**
An empty scaffold that errors honestly is the deliverable here.

5. `git status --short` — exactly one new file, under `pipeline/trip/trips/`.

Finish by reporting the path, the validator's error list as the to-fill list, and
whether there is source material to hand to the `trip-intake` agent next. Do not
commit.
