# Agent workflow — the configured half of the project's rules

[Shared instructions](../../AGENTS.md) · [Parallel workflow](../carnegie-hall/PARALLEL-WORKFLOW.md) · [Universal pipeline](../../pipeline/README.md) · [Trip production layer](../../pipeline/trip/README.md) · [Tools and connectors](../carnegie-hall/TOOLS-AND-CONNECTORS.md)

## Why this exists

[`AGENTS.md`](../../AGENTS.md) is 41 KB of prose, and it is the right document: it
carries the history, the corrections, the superseded decisions and the reasons. But
every agent session used to re-derive the same handful of operating rules from it,
and a rule that is re-derived is a rule that is sometimes derived differently.

The repeatable parts are now configuration. Five subagent definitions in
`.claude/agents/` and four slash commands in `.claude/commands/` encode the bounded
jobs and the checks that prove them. Prose stays canonical — where a definition and
`AGENTS.md` disagree, `AGENTS.md` wins and the definition is the bug.

This file explains the set. It does not replace either.

## The operational loop these agents follow

A student-travel operator's real work, in order: research a supplier, ask it for
group terms, record what came back, assemble a trip, price it, send a proposal,
absorb a change request, work out who has to be called again, regenerate the
documents. The agent set maps onto the steps where a *different* thing goes wrong.

| Loop step | Agent | Tools it holds | The failure it prevents |
|---|---|---|---|
| Research a supplier | [`vendor-research`](../../.claude/agents/vendor-research.md) | WebSearch, WebFetch, Read, Grep, Glob | A plausible rate with no page behind it |
| Record what came back | [`trip-intake`](../../.claude/agents/trip-intake.md) | Read, Glob, Grep, Write, Edit, Bash | Terms living in a proposal document that the next redraft wipes |
| Make the trip read well | [`itinerary-copy`](../../.claude/agents/itinerary-copy.md) | Read, Grep, Glob, Edit | Prose that quietly promises a line nobody has held |
| Absorb a change request | [`change-impact`](../../.claude/agents/change-impact.md) | Read, Grep, Glob, Bash | A supplier who finds out from the group |
| Before anything is issued | [`evidence-audit`](../../.claude/agents/evidence-audit.md) | Read, Grep, Glob, Bash | A confident sentence with no source |

**Why five and not more.** Each one sits at a point where the work changes shape:
outside→in (research), unstructured→structured (intake), record→prose (copy),
version→version (change), record→document (audit). A sixth agent for pricing or for
document rendering would overlap `evidence-audit` and duplicate logic that already
lives in [`pipeline/trip/schema.cjs`](../../pipeline/trip/schema.cjs) and the
renderers. Agents are for judgement under a rule; deterministic work belongs in a
`.cjs` file where it can be tested.

**Why the tool grants look stingy.** `vendor-research` reads the public web and
cannot write a file. `itinerary-copy` can Edit but cannot Write, so it can revise a
record and cannot create one. `change-impact` and `evidence-audit` hold Bash for
`git show` and the two `check` commands and hold no write tool at all. Only
`trip-intake` writes, and it writes exactly one file. An agent that cannot reach a
file cannot damage it while being confidently wrong about it, and the narrower grant
is also a clearer instruction than a paragraph asking it to be careful.

**Why no `model:` field.** None of the five carries one. Pinning a model is a claim
about which model is sufficient for a job, and that has not been measured here.
Add one when a definition has actually been observed to fail on a smaller model —
that is a finding, and it belongs in [`PROGRESS.md`](../carnegie-hall/PROGRESS.md)
alongside the change.

## The commands

| Command | What it does |
|---|---|
| [`/trip-check`](../../.claude/commands/trip-check.md) | Validate, check and test both layers; re-render and show the diff if anything is stale |
| [`/trip-new`](../../.claude/commands/trip-new.md) | Scaffold a trip record with every section present, nothing confirmed, no invented fields |
| [`/change-request`](../../.claude/commands/change-request.md) | The change-impact loop end to end, ending in drafts and a call list |
| [`/evidence-check`](../../.claude/commands/evidence-check.md) | Currency check, then the audit, then a mechanical privacy sweep |

They are short prompt files that name real CLI commands. Nothing in them is a new
capability; they are the sequence a person otherwise retypes, with the order and the
"do not" attached.

## Co-pilot posture

**Agents draft and assemble at scale. A human holds judgement, relationships and
accountability.** In this project that is not a slogan, it is a boundary with a
specific edge: **no agent here ever contacts a supplier, a school or a director.**
Not a web form, not an enquiry email, not a call. Research reads published pages;
`change-impact` writes messages stamped `DRAFT — NOT SENT`; the record's `attempts`
log is written only after a person actually makes contact. That log exists because
the same supplier once got a web form *and* a voicemail on the same day, and its
entire value is that every entry is true.

The industry converged on the same line during 2026 — agents investigate
autonomously, a human approves anything that changes the world — but the reason to
hold it here is narrower and better: **an agent has none of the relationship.** A
director who has worked with this operator for six years is owed a person on the
other end. The agent's contribution is that the person arrives at the call already
knowing which four suppliers are affected and which deadline is nearest.

What that means concretely:

- Agents produce **inspectable drafts**, never sent output.
- Agents record **what they could not establish** as prominently as what they could.
  Blank is correct; a plausible filler is the defect.
- Every generated document traces to a record, and every record traces to a source.
  The person's judgement is applied to evidence, not to prose.
- The named accountable human is the logistics and software developer. Surveys
  through 2026 kept finding that most organisations running agents could not name
  one. Here it is a single person by construction, which is an advantage of a solo
  operation worth keeping as it grows.

## How parallel agents avoid colliding

The mechanism is **disjoint file ownership**, and it is the reason the session that
produced this file could run 17 units at once against one repository.

1. **One writer per file set.** Each unit is given an explicit list of paths it owns
   and told to create or modify nothing else. This unit owned `.claude/agents/*.md`,
   `.claude/commands/*.md` and this file. `.claude/settings.json` belonged to another
   unit and was not touched; `AGENTS.md` is the coordinator's and is read-only to
   everyone else.
2. **One worktree per unit, one branch per worktree.** Git isolates the working tree
   and the index. It does **not** isolate the stash stack, external services, API
   quotas, ports or output destinations —
   [the parallel workflow](../carnegie-hall/PARALLEL-WORKFLOW.md) is explicit about
   this and is worth re-reading before assuming a worktree protects anything but
   files.
3. **Design for it.** The trip layer's renderers are *discovered, not registered*:
   drop a `.cjs` file in `pipeline/trip/renderers/` and the CLI finds it. There is no
   shared registry file for eight parallel renderer units to fight over. That single
   design decision is what turned a merge problem into a filename problem — the CLI
   throws if two renderers claim the same output name, which is a fast, local failure
   instead of a silent overwrite.
4. **Shared vocabulary is single-owner.** `schema.cjs`, `vocabulary.cjs`, package
   manifests and lockfiles have exactly one owner per batch. A worker that needs a
   change there stops and asks rather than editing; racing to finish first is not how
   ownership is resolved.
5. **The coordinator integrates one result at a time**, and re-runs the combined
   checks after each, because two branches can both pass alone and disagree about a
   data contract with no textual conflict at all.

## How an agent's output is verified before it is trusted

Nothing an agent produces is trusted because it looks right. Every definition ends
with its own verification section; these are the checks that cut across all of them.

```
node pipeline/cli.cjs check --all          # cases: records and their documents agree
node pipeline/trip/cli.cjs check --all     # trips: same
node --test tests/*.test.cjs               # including the privacy and currency assertions
```

| Agent | The check that actually catches it |
|---|---|
| `vendor-research` | Open every URL it cited and find the claim on the page |
| `trip-intake` | `validate` at zero errors, `git status` showing one file, a human reading it against the original material |
| `itinerary-copy` | A structural compare of the record with `blurb` stripped out, and unchanged validator counts |
| `change-impact` | Every field path resolves in both versions; nothing in `git diff` is missing from its tables |
| `evidence-audit` | Spot-trace two claims it *passed* — its false clears cost more than its findings |

Three properties make this work, and they are worth naming because they are design
choices, not luck:

- **The checks are mechanical and cheap.** `check --all` compares bytes. A renderer
  that embeds a timestamp fails on every run, which is how non-determinism gets
  caught immediately instead of at review.
- **The failing case is loud.** Errors block rendering. Warnings stay visible and are
  never cleared silently — an unconfirmed line *warns*, and that warning is the
  system working, not noise to suppress.
- **The verification is separable from the agent.** `itinerary-copy` holds no Bash,
  so it cannot run — or appear to run — its own verification. The caller does.

A check also has to match the data's actual shape. `itinerary-copy`'s boundary check
was first written as a line-based diff filter — keep the changed lines, drop the ones
containing `"blurb"`, expect nothing left. It passes a record that had its slot times
rewritten, because a trip record stores **each slot on a single line**, so the line
carrying the edited time also carries the word `blurb`. The check now compares the
parsed objects with `blurb` stripped. A verification that has not itself been made to
fail on purpose is an assumption wearing a command's clothes.

## When an agent is confidently wrong

It will be. The useful question is what it costs.

**Recognise it.** The tells are consistent: a specific number with a vague source; a
term recorded in a field that does not exist in `TERM_FIELDS`; a source `kind` chosen
because it was the closest available rather than because it was right; a line state
upgraded from `sourcing` to `quoted` with nothing new behind it; prose that names a
venue for a line that is still being shopped. Fluency is not evidence, and an
unsourced claim reads better than a sourced one precisely because it has no
qualification attached.

**Stop the chain.** In a multi-step run an error that stays in context gets
conditioned on: the model treats its own earlier mistake as established and reasons
from it, so step eight is confidently building on something invented at step four.
This is why agents here hand back a block of text rather than writing through to a
document, and why `/evidence-check` refuses to audit a stale output or to re-render
and audit its own regeneration in the same breath.

**Then, in order:**

1. **Do not accept the fix as the finding.** "I've corrected it" is a second output
   from the same run. Re-verify from the record, not from the correction.
2. **Revert rather than patch** when a record was touched. `git diff` the record,
   restore it, and re-run the agent with the failure named. A half-corrected record
   is worse than an unprocessed one because it looks processed.
3. **Ask whether the definition permitted it.** Most confident errors here are
   permission errors, not intelligence errors — the agent did something because
   nothing said it could not. Fix the definition, not the run. Every "never" in the
   five agent files is there because that class of mistake is expensive.
4. **Record it once, in the right place.** A consequential discovery — the context,
   the evidence, the lesson, when it applies — goes in
   [`PROGRESS.md`](../carnegie-hall/PROGRESS.md) or the relevant strategy. Not a
   transcript, and not a new log file.
5. **Never let a second model's agreement stand in for verification.** Two agents
   agreeing is not evidence; the URL, the validator and the human reading are.

## Honest limits

- **These definitions are written, not proven.** They have been dry-run against the
  real CLI commands. No agent in this set has yet run a full cycle on live supplier
  research, and the per-agent verification sections are the standard to hold them to,
  not a report that they met it.
- **Configuration is not enforcement.** A subagent definition is a prompt. It shapes
  behaviour, it does not constrain it the way a permission does. The real limits are
  the tool grants, the permission layer in `.claude/settings.json` (owned elsewhere)
  and the CLI checks. A rule that matters should live in a validator, not only in a
  paragraph. `TERM_FIELDS`, `LINE_STATES` and the evidence tiers are enforced in
  [`load.cjs`](../../pipeline/trip/load.cjs) and
  [`vocabulary.cjs`](../../pipeline/vocabulary.cjs); the house voice is not enforced
  anywhere, and cannot be.
- **"Read-only" is a convention for two of the five.** `change-impact` and
  `evidence-audit` hold no Write and no Edit, which is real. But their Bash grant is
  not scoped by the frontmatter, so nothing structurally prevents a write. The
  commands that call them check `git status --short` afterwards instead of trusting
  the label. Scoping that properly is a permissions change, and permissions live in
  `.claude/settings.json`.
- **The trip layer's `check` currently passes vacuously.** With no renderers
  installed, `node pipeline/trip/cli.cjs check --all` compares zero files and exits 0.
  The commands say so explicitly. Once renderers land, the check becomes real; until
  then it proves only that the record validates.
- **Coverage is partial.** Pricing, proposal assembly and CRM handoff have no agent.
  That is deliberate — see the loop table — but it means the loop is not automated
  end to end and should not be described as though it were.
- **The checks verify consistency, not truth.** `check --all` proves a document
  matches its record. It cannot prove the record matches the world. Only opening the
  source does that, and only a person can decide the source is good enough.
- **The audited defects in the legacy Python pipeline are unchanged by any of this.**
  Lost identities, contact attribution and destructive refresh paths remain open;
  nothing in `.claude/` touches `scrapers/` or `scripts/`.
- **Implemented is not verified is not committed is not pushed is not deployed.**
  This file is documentation of a design. Treat each state as claimed only where it
  has been separately shown.

## Changing any of this

The agent definitions and slash commands are ordinary tracked files: read them,
propose a change, commit it with the reason. Conventional Commits, lowercase with a
scope — `feat(agents):` for a definition, `docs(ops):` for this file.

Two rules carry over from the shared instructions. `AGENTS.md` is coordinator-owned
and is not edited from a worker unit. And nothing in `.claude/` may weaken a
guardrail: never invent or pattern-guess contact details, every researched row needs
a source URL, public data only, 1 request/sec per host, 20 pages per organisation,
respect `robots.txt`, keep researched contacts out of marketing and email-enabled
imports. A definition that softens one of those is not a new policy — it is a defect
to revert.
