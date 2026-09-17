# PII guard — `scripts/check-pii.cjs`

[Trip contract](../../pipeline/trip/README.md) · [Shared instructions](../../AGENTS.md)

The trip record was built from photographs of printed pages. Those photographs also carried a
school director's name, a coordinator's mailbox, and several suppliers' individual staff names
and direct mobile numbers. All of it was redacted to roles on the way in. This guard is what
stops it creeping back.

The rule it enforces is written in `pipeline/trip/README.md`:

- **Keep** business names and their published group-sales channels — Rock City, Ruby Falls, the
  Incline Railway, Young Transportation, Tennessee Aquarium.
- **Redact to roles** every individual and every direct number — `the director`, `Group sales`,
  `Tour manager`, `Troen coordinator`.

## Running it

```
node scripts/check-pii.cjs                    # scan the default scope; 0 clean, 1 findings
node scripts/check-pii.cjs --list-scope       # print exactly which files that is
node scripts/check-pii.cjs --json             # machine-readable, same exit codes
node --test tests/pii_guard.test.cjs
```

| Option | Effect |
|---|---|
| `--include <path\|glob>` | Scan this **instead of** the default scope. Repeatable. Takes a file, a directory (walked, following symlinks), or a glob. Absolute paths outside the repository are allowed. Naming a path explicitly overrides the built-in excludes, so `--include data/final/prospects.csv` really does scan it. |
| `--exclude <glob>` | Skip matching paths. Repeatable, applied after includes. |
| `--allowlist <file>` | Allowlist file. Default `pipeline/trip/.pii-allowlist`, which need not exist; a file named explicitly must exist, or the run is a usage error. |
| `--no-default-excludes` | Drop the built-in "governed elsewhere" excludes from the default scope. |
| `--list-scope` | Print the resolved file list and exit 0 without scanning. |
| `--json` | Structured output. |

An include that matches nothing — or whose every match was excluded — is reported on stderr, so
a typo or an over-broad `--exclude` cannot masquerade as a clean result. Files in scope that are
binary or unreadable are reported the same way rather than counted as scanned.

Exit codes: `0` clean, `1` findings, `2` usage error.

A finding names the file, line, column, the rule that fired, and a **partially masked** match,
so the tool never reprints the thing it protects:

```
pipeline/trip/trips/example.trip.json:13:11  [contact-name]  Fi*****************me
    A personal name at suppliers[0].contacts[0].name. Redact to a role, e.g. "Group sales".
```

## What it checks

| Rule | What fires |
|---|---|
| `email` | An email address, anywhere in a scanned text file. |
| `phone` | A US number: `(706) 555-0142`, `706-555-0142`, `706.555.0142`, `7065550142`, `423 555 0188`, an optional `+1`, and extensions (`x1234`, `ext. 99`). |
| `contact-name` | **Structural**, on the parsed JSON: a `name` on a `contacts[]` entry or any other person container (`staffing`, `people`, `attendees`, `roster`, `passengers`, `chaperones`, …); a personal-name field (`full_name`, `first_name`, `last_name`, `contact_name`, `director_name`, …) anywhere; and a direct-line or personal-mailbox field (`mobile`, `cell`, `direct_line`, `personal_email`, …) anywhere. |
| `person-address` | **Structural**: an `address` or `street` field on a person container, a `home_address`/`residence`-style field anywhere, and a street address appearing in free text on a contact. |

The name and address rules read the **parsed JSON structure**, not the text. That is what tells
`suppliers[].name` (a business, kept) apart from `suppliers[].contacts[].name` (a person,
redacted), and a venue's `address` on the supplier (kept) from the same string on a contact.

Phone matching constrains the area and exchange codes to the North American plan (`[2-9]`
first), which is why ISO dates, times, quantities, quote references and version strings do not
register. Boundary checks reject a run inside a longer number or identifier.

## What it deliberately does **not** check

Being narrow is the point. A guard that cries wolf gets switched off.

- **Scope is `pipeline/trip/**` by default.** The repository holds contact data elsewhere on
  purpose: `data/final/prospects.csv` carries one researched, published director email by
  design, and `docs/`, `demo/carnegie-hall/*.json` and `pipeline/cases/*.json` carry published
  school-program contacts that `pipeline/validate.cjs` already gates with its own
  `contacts.no_guess` check. Those paths are in the built-in excludes so that widening the scope
  later does not bury a real trip finding under known-good hits. They shape the *default* scope
  only: an explicit `--include` always wins, and `--no-default-excludes` drops them entirely.
- **The privacy rule is wider than the default scope.** The contract says it covers test
  fixtures and documentation too. Those are not scanned by default — a test fixture is full of
  deliberately fake contact data, which is the point — so check them deliberately:

  ```
  node scripts/check-pii.cjs --include 'tests/trip_*.test.cjs' --include 'docs/ops/**'
  ```
- **It does not judge whether a name is a person.** A field called `director` or `coordinator`
  holding `"Troen coordinator"` is a role and is left alone; the structural rules key off field
  *names* and *position*, never off the shape of a value. A person's name stored in a field this
  document does not list — `contacts[].role: "Jane Doe"` — will pass. The record's convention of
  roles-only in those fields is what this guard protects, not a general name detector.
  For the same reason `"contact": "Somebody Real"` — a person container collapsed to a single
  string — is **not** flagged: `"contact": "Group sales"` is the correct redacted form and
  nothing structural separates the two. Write contacts as `contacts: [{ role, channel }]`, the
  shape the record already uses, and the guard can see them.
- **It does not check non-JSON files structurally.** In `.md` and `.cjs` files only the `email`
  and `phone` rules apply, because there is no structure to read.
- **Unparseable JSON warns, it does not fail.** The structural checks are skipped and a warning
  is printed; the text rules still run. A broken file in scope is a real gap, so read the warning.
- **One known false positive.** Three bare space-separated numbers shaped 3-3-4 —
  `250 300 1200` — are indistinguishable from a phone number. Where a money word (`$`, price,
  cost, deposit, balance, total, per person) sits within 40 characters, the space-separated form
  alone is suppressed, which covers the realistic case in a pricing record. A phone word on the
  same line (call, direct, line, mobile, ask for, …) overrides that suppression, because
  `Deposit 500 paid; the direct line is 706 555 0144` carries both and the number is real.
  Itinerary nouns — room, ticket, rate, seat — are deliberately **not** money cues: those lines
  are the ones most likely to carry a real number. Every punctuated or compact form is always
  reported, money words or not. A bare run with no phone context is still reported; use the
  allowlist.
- **It is not a secret scanner.** API keys, tokens and credentials are out of its remit; the
  `SERPAPI_KEY` rules in `AGENTS.md` cover those.
- **It never rewrites anything.** It only reports.
- **The line number on a structural finding is best effort.** It is located by counting
  occurrences of the key in the raw text, which can drift if a file stores JSON inside a string
  value. The `json_path` in the finding is always exact; trust that over the line number.

## The allowlist

Default `pipeline/trip/.pii-allowlist`; it need not exist. One entry per line, `#` starts a
comment. The allowlist file is always excluded from its own scan.

```
# a published group-sales mailbox, which the rule keeps
groupsales@example-attraction.test

# the same, but only in one file
pipeline/trip/out/**::groupsales@example-attraction.test

# skip a file entirely
pipeline/trip/out/generated.md::*

# allow a value by digest, so the allowlist itself records no value
sha256:6b3a55… 
```

Use it for a genuinely published business channel. **Never allowlist a personal mailbox, a
direct number or a person's name** — redaction is the remedy for those, not an exception.

Every example in this document, and in `tests/pii_guard.test.cjs`, is invented: numbers use the
`555-01xx` range reserved for fiction and mailboxes use the reserved `example.com`/`.test`
domains. Scanning this file with `--include docs/ops/**` therefore reports its own examples,
which is the guard working, not a leak.

## Wiring it up — for a human to apply

Both snippets below are proposals. `scripts/check-pii.cjs` is self-contained and needs no
configuration to run; these only make it automatic.

### 1. Make target

`Makefile` is owned by another unit, so this is not applied here. Add to `.PHONY` and append:

```make
check-pii:
	node scripts/check-pii.cjs
```

Then add `check-pii` to `.PHONY: … check-pii` on the existing line. To run it with the trip
layer's other checks, extend the existing `pipeline-check` target, or add:

```make
trip-check:
	node pipeline/trip/cli.cjs check --all
	node scripts/check-pii.cjs
	node --test tests/trip_*.test.cjs tests/pii_guard.test.cjs
```

### 2. Claude Code hook

`.claude/settings.json` belongs to the repository owner, so this is not applied here.

Schema verified against the Claude Code hooks documentation
(<https://code.claude.com/docs/en/hooks>) on 2026-09-17. Two details matter and are easy to get
wrong:

- **Exit code 2 is the blocking code.** Any other non-zero exit is treated as a *non-blocking*
  error and the action proceeds. This guard exits `1` on findings, so the command must translate
  that into `2` — hence the `|| exit 2` below. A hook that just calls the script would report
  nothing and block nothing.
- **`PostToolUse` cannot block**, because the tool has already run — the documented exit-2
  table lists it as "Does not block". Exit 2 there is still worth using: it marks the hook as a
  blocking error and surfaces stderr, whereas `|| true` throws the result away. It just cannot
  undo the write. The events that genuinely block are `PreToolUse`, `UserPromptSubmit` and
  `Stop`. `Stop` is the useful one here: it runs when Claude finishes and, on exit 2, prevents
  the stop and feeds stderr back so the leak gets fixed before the turn ends.

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/scripts/check-pii.cjs\" >&2 || exit 2",
            "timeout": 60,
            "statusMessage": "Checking trip records for personal data..."
          }
        ]
      }
    ]
  }
}
```

`matcher` is omitted, which means "match all" — correct for `Stop`, which is not a tool event.

Caveat worth knowing before enabling: a `Stop` hook fires on every stop, so if the finding is
not fixed the turn will not end. The documented `stop_hook_active` flag in the hook's stdin
payload is how a script avoids looping; the one-line command above does not read it. If that
risk is unwelcome, use the `PostToolUse` variant below, which reports after each edit without
ever wedging a turn, or the Make target alone.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/scripts/check-pii.cjs\" >&2 || exit 2",
            "timeout": 60,
            "statusMessage": "Checking trip records for personal data..."
          }
        ]
      }
    ]
  }
}
```

Here `matcher` is a tool-name filter: `Edit|Write|MultiEdit` is read as an exact list, because
it contains only letters and `|`. Exit 2 cannot undo the write, but it surfaces the finding
rather than discarding it.

### 3. Git pre-commit hook

Not installed by this unit; `.git/hooks/` is not tracked. For a human who wants it:

```sh
# .git/hooks/pre-commit  (chmod +x)
#!/bin/sh
node scripts/check-pii.cjs || {
  echo "Commit blocked: personal data in the trip layer. See docs/ops/PII-GUARD.md." >&2
  exit 1
}
```
