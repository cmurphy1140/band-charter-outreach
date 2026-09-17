# Git workflow: one developer, many agents

**Status:** design document and working rules. Verified against the repository on
2026-09-17; every count and command in it was run, not recalled.

This document **extends** the Git rules in [AGENTS.md](../../AGENTS.md) for the
shape this repository actually has: a single developer who owns the whole
codebase, working in an isolated environment, dispatching bounded units of work
to AI agents that each run in their own git worktree.

It does not replace or contradict AGENTS.md. Where AGENTS.md sets a rule — the
worktree location convention, one writer per checkout, the coordinator/worker
split, "a branch or worktree is not a saved Git checkpoint" — that rule stands
and this document assumes it. The coordination protocol for a parallel batch
lives in [PARALLEL-WORKFLOW.md](../carnegie-hall/PARALLEL-WORKFLOW.md); this
document is about the git mechanics underneath it.

| AGENTS.md already says | This document adds |
|---|---|
| One descriptive branch per coherent effort; `codex/<short-change>` for Codex | A naming grammar covering agent branches, and a **lifetime** budget |
| Give parallel tasks clear file ownership | Why disjoint file ownership is the *merge* mechanism, not just an etiquette rule |
| Make commits at coherent, reviewed, verified milestones | Commit granularity, the scopes actually in use, and how to squash an agent's working commits |
| Distinguish implemented / verified / committed / pushed / deployed | Where each of those five gets recorded: the PR template, and a tag for "deployed" |
| Preserve evidence and manual corrections | [`.gitattributes`](../../.gitattributes) rules that make corruption structurally harder |
| Verify that `CLAUDE.md` still resolves to `AGENTS.md` | A check that actually detects the failure, because `git status` does not |

---

## 1. The trunk

**`origin/main` is the trunk.** It is authoritative for three reasons, in order
of how much they cost you when ignored:

1. **It is what deploys.** The Vercel production branch is `main`, built from
   the repository root through `vercel.json`. A commit on `origin/main` becomes
   the live demo; a commit anywhere else does not.
2. **It is the only ref every worktree already has.** Worktrees share one object
   store and one ref namespace. An agent in a fresh worktree can read
   `origin/main` with no fetch, no network, and no coordination. Anything you
   want N agents to agree on has to live on a shared ref.
3. **It is the only branch with a history that outlived a session.** Every
   `claude/*` and `worktree-agent-*` branch in this repository is a scratch ref
   from one dispatch.

### Local `main` is not the trunk. It is a trap.

Verified 2026-09-17:

```
$ git rev-list --left-right --count main...origin/main
0	49

$ git log --oneline -1 main
a45985a Placeholder README while the code moves in
```

Local `main` is **49 commits behind** `origin/main`, and its tip is a
placeholder README from before the code was moved in. It is not a stale copy of
the project — it is a stub. Anyone (or any agent) who runs
`git worktree add -b <task> <path> main`, or `git checkout -b <task> main`,
starts from a repository with almost nothing in it. The agent will then
cheerfully rebuild things that already exist, and its branch will conflict with
the real trunk on every file it touches.

Nothing in git warns you about this. `main` resolves, the checkout succeeds, and
the failure shows up an hour later as an inexplicable pile of conflicts.

**Rule: never branch from a bare branch name.** Branch from `origin/main`, or
from an explicit full base commit that the dispatch prompt names.

```sh
# Correct — a remote-tracking ref, which is what the deploy follows
git worktree add -b claude/ops-git-workflow ../wt/ops-git-workflow origin/main

# Correct — an explicitly named, verified base commit (this unit's own base)
git worktree add -b claude/ops-git-workflow ../wt/ops-git-workflow bb6ac1e

# Wrong — silently starts from a 49-commit-old placeholder
git worktree add -b claude/ops-git-workflow ../wt/ops-git-workflow main
```

### Recovering from the stale-`main` trap

Check first — this is the cheapest possible habit and it costs one line:

```sh
git fetch origin
git rev-list --left-right --count main...origin/main   # want "0	0"
```

Left number = commits local `main` has that the remote does not. Right number =
commits you are missing.

If the left number is **0** (nothing local to lose, which is the case here),
fast-forward it so the name stops lying:

```sh
git switch main && git merge --ff-only origin/main
```

If the left number is **not 0**, local `main` has commits that were never
pushed. Do not fast-forward and do not reset — that discards them. Move them
onto a branch first, then reset:

```sh
git branch rescue/local-main-$(date +%Y%m%d) main   # preserve, then
git switch main && git merge --ff-only origin/main  # only now, if it succeeds
```

If you cannot afford to do any of this right now, the alternative is to stop
using the name: branch from `origin/main` always, and treat local `main` as
dead weight. That is the position this document takes, because it is the rule
that survives an agent that did not read this section.

If an agent has already branched from the stub, do not try to rebase its work
onto the real trunk — its diff is against a repository that does not exist.
Re-dispatch it from the correct base. Agent work is cheap to redo and expensive
to untangle; that asymmetry shows up repeatedly below.

---

## 2. Branch naming and lifetime

### Naming

The grammar already in evidence in this repository is `<origin>/<slug>`:

| Prefix | Meaning | Example in this repo |
|---|---|---|
| `claude/` | Work performed by Claude Code | `claude/universal-pipeline-strategy-54qrt3` |
| `codex/` | Work performed by Codex (AGENTS.md sets this one) | `codex/conversation-layout` |
| `feature/` | Longer-lived human-owned effort | `feature/claude-partner-research` |
| `worktree-agent-<id>` | Harness-generated scratch ref, not a deliverable | (many) |

Keep it. Two refinements for the parallel-agent case:

- **Prefix the slug with the unit's area** when a batch is dispatched at once:
  `claude/ops-git-workflow`, `claude/trip-pricing`, `claude/trip-run-sheet`.
  With a dozen simultaneous branches, `git branch --list 'claude/trip-*'` is how
  you find one batch, and that only works if the area is a prefix, not a suffix.
- **The branch name is not the ownership record.** It is a label. The owned file
  list in the dispatch prompt is the ownership record, and it is what integration
  checks against (§4).

Harness-generated `worktree-agent-*` refs are disposable. Do not merge them and
do not treat one as a deliverable — rename or re-branch the work onto a
`claude/<area>-<slug>` ref before it is reviewable.

### Lifetime

Trunk-based development with short-lived branches, not Git Flow. This is not a
close call for a solo repository: Git Flow's `develop`/`release`/`hotfix`
ceremony exists to serialise many people's releases. With one person and no
release train it buys nothing and costs you a second long-lived branch that
will go stale exactly the way local `main` did.

[DORA's guidance](https://dora.dev/capabilities/trunk-based-development/) is to
merge to trunk at least daily and to treat a branch living beyond ~24 hours as a
smell. **Keep that.** It gets *more* important with agents, not less: a branch
with a human on it has a human holding its context. An agent branch has nobody.
If it is not integrated in the session that produced it, the reasoning behind it
is gone, and you are reviewing a diff with no author to ask.

**Budget: an agent branch should be merged or abandoned within the session that
created it.** If a unit is still open at the end of a session, that is a signal
the unit was scoped too large, not a signal to keep the branch.

### The one DORA rule that does not survive contact with agents

DORA also says: *have three or fewer active branches*. A single dispatched batch
in this repository routinely leaves well over a dozen live at once: while this
document was being written the count passed through 18 `claude/*` branches plus
17 `worktree-agent-*` refs, still climbing as siblings started. That is not a
violation to feel bad about. It is a different workload.

The branch-count limit is a **proxy for conflict probability**. It is a good
proxy when branch count tracks headcount, because two humans on two branches
touch overlapping files by accident all the time. It is the wrong proxy when
branch count tracks *dispatch volume* and the file sets are disjoint by
construction. A dozen branches that provably cannot touch the same file are not
a dozen integration risks; they are a dozen independent patches whose merge
order does not matter.

So: **keep the lifetime rule, replace the count rule with file ownership.**
That substitution is the whole design, and §4 is the mechanism that makes it
true rather than hopeful.

Be honest about what it does not buy you. Disjoint file ownership drives
*textual* conflict probability to zero. It does nothing about:

- **Semantic coupling.** Unit A links to a file unit B renames. Git merges both
  cleanly and the link is dead. Only a check that reads content catches this —
  which is why the e2e recipe for this unit greps every relative link target.
- **Shared files.** `AGENTS.md`, `PROGRESS.md`, `.gitattributes`, dependency
  manifests, shared schemas. PARALLEL-WORKFLOW.md already reserves these to the
  coordinator; that reservation is load-bearing, not bureaucratic.
- **Shared external state.** Ports, API quota, the Vercel deploy, any writable
  database. Worktrees isolate files and indexes. They isolate nothing else.

---

## 3. What a worktree is and is not

A worktree is a second working directory sharing one `.git`. It gives each agent
an isolated file tree and an isolated index, so two agents editing at the same
moment cannot corrupt each other's staging area.

It does **not** give them separate refs, separate stashes, separate hooks,
separate config, or separate anything outside the filesystem. Two consequences
matter daily:

- **The stash stack is shared.** A bare `git stash pop` in one worktree can pop
  another agent's work. Use a WIP commit instead, or
  `git stash push -u -m "<unique-tag>"` and `git stash apply <sha>` by SHA.
- **A worktree starts from a ref, not from your desk.** Untracked files, ignored
  files, `.env`, `.venv/`, `node_modules/`, and anything you have edited but not
  committed **do not travel**. An agent that needs an input needs it committed,
  or transferred deliberately. AGENTS.md says this; it is worth repeating
  because it is the most common surprise.

Place worktrees per AGENTS.md: outside the repository, at
`~/Desktop/Projects/band-charter-outreach-worktrees/<short-task-name>/` on the
Mac, or in the harness-assigned workspace elsewhere.

Because `gc.auto = 0` is set in this repository (verified 2026-09-17), git never
repacks on its own, and a few dozen agent branches leave a lot of loose objects.
Keep the setting — automatic gc racing a running agent is worse than a big
`.git`. Instead, clean up deliberately **when no worktree is active**:

```sh
git worktree list          # confirm nothing is running
git worktree prune         # drop records for directories that are gone
git branch --merged origin/main | grep -v ' main$'   # review, then delete
git gc                     # only with nothing else writing
```

---

## 4. Integrating many parallel branches

### File ownership is the mechanism

Every unit is dispatched with an explicit, exhaustive list of the files it may
create or modify. The lists across a batch are disjoint. That list is the merge
contract.

This session is the worked example. The `git-workflow` unit was given exactly
four paths:

```
docs/ops/GIT-WORKFLOW.md
.gitattributes
.github/pull_request_template.md
.github/ISSUE_TEMPLATE/task.md, .github/ISSUE_TEMPLATE/defect.md
```

and told, in the same breath, that another unit owned `.github/workflows/` and
that other units owned other files in `docs/ops/` — so it must not create an
index or README there. Two units writing into the same two directories,
guaranteed not to collide, because the boundary was drawn at the file and stated
up front.

Write the ownership list down. It is what makes N-way integration affordable,
because it buys you a review step that costs nothing:

```sh
# <base> is the unit's DECLARED base — the ref or commit the dispatch named,
# which is what its diff is actually against.
git diff --name-only <base>...HEAD
```

If that list is not a subset of the unit's declared files, the branch is
rejected **without reading the diff**. That is a one-second check, it catches
the failure mode agents actually have (helpfully fixing something adjacent), and
it is the only reason a dozen simultaneous branches is a sane thing to do.

**Use the declared base, not `origin/main`.** A batch is often dispatched from a
commit that is ahead of the trunk — this unit's own base, `bb6ac1e`, is not an
ancestor of `origin/main` — and diffing against `origin/main` then reports every
sibling unit's files as if this unit had touched them. On this branch that check
returns 36 paths belonging to the pipeline and trip units and none of this
unit's four. A gate that rejects every correct branch gets switched off within a
day, which is worse than not having it. Record the base commit in the dispatch
and in the PR, and diff against that.

### Practical rules for drawing the boundary

- **Draw it at files, never at "areas".** "Backend" and "frontend" are not
  boundaries when both touch one data contract.
- **A shared file needs a prerequisite unit.** If two units both need a schema
  change, do the schema change first, merge it to trunk, then dispatch both from
  the new trunk. Do not let two units negotiate.
- **Tests live with their unit.** A unit that owns `pipeline/render.cjs` owns
  `tests/pipeline.test.cjs`. Splitting code and its test across units puts a
  guaranteed conflict in the batch.
- **Generated outputs belong to whoever owns the generator.** Two units
  re-rendering `pipeline/out/` is a conflict even when their source changes are
  independent.

### Merge order and shape

With disjoint ownership, merge order does not matter. Merge each unit to trunk
as it finishes and verifies — first come, first merged. Do not batch them up
into an integration branch; that recreates the long-lived-branch problem you
just avoided.

**Squash-merge agent branches.** One unit becomes one trunk commit, with a
Conventional Commit message you write, describing the outcome. Reasons:

- An agent's intermediate commits are working notes ("wip", "fix test"), not a
  history anyone will read.
- One commit per unit makes the unit the revert granularity, which matches how
  the work was dispatched. `git revert <sha>` undoes exactly one unit.
- Trunk stays linear and `git log --oneline` stays a list of outcomes.

Use a real merge (`--no-ff`) only when the branch's internal history is itself
worth keeping — a long human-authored effort with meaningful steps. That is
rare here.

After each merge, re-run the batch's shared checks, not just the merged unit's.
Two independently green units can be red together, and git will not tell you:

```sh
node --test tests/*.test.cjs
make pipeline-check
```

### Stacked branches: shallow, and usually not at all

Standard guidance keeps stacks 3–4 deep, because a change at the bottom forces
a rebase of everything above and the coordination cost compounds. For agents the
argument is stronger than "it gets expensive": **an agent cannot re-derive its
intent after a rebase.** Rebasing unit C onto a changed unit A does not re-run
C's reasoning against the new A — it replays a diff that was computed against
something else, and the result compiles while being subtly wrong.

So when unit B genuinely depends on unit A's output:

- **Serialise instead of stacking.** Merge A to trunk, then dispatch B from the
  new trunk. B's agent then reasons about the real state.
- Stack only when *you* are the one carrying the context through the rebase,
  and keep it to 3–4.

Agent work is cheap to re-run and expensive to untangle. Re-dispatch beats
rebase almost every time.

---

## 5. Commits

### Convention

Conventional Commits with a scope, lowercase after the colon, no trailing
period, imperative mood. This has been the convention since `e4e6a9b`
(2026-09-11); everything before it is free-form prose plus GitHub merge commits,
and the boundary is visible in `git log`.

Scopes in evidence (verified 2026-09-17, `git log --format='%s'`):

| Scope | Count | Covers |
|---|---|---|
| `carnegie` | 16 | The proof-of-concept pack, demo, materials, build |
| `pipeline` | 1 | The five-stage pipeline |
| `trip` | 1 | Trip production records and renderers |
| `serpapi` | 1 | The cached SerpAPI client and credential handling |
| `scraping` | 1 | Scrapers and the runner |

Types in evidence: `docs` (11), `feat` (6), `fix` (2), `build` (1).

Add a scope when a new area of the repository acquires its own files — `ops`
for `docs/ops/`, `git` for git configuration such as
[`.gitattributes`](../../.gitattributes), `ci` for automation. Do not invent a
scope for a one-off; reuse the nearest real one.

```
docs(ops): document the solo-plus-agents git workflow
chore(git): add .gitattributes for binaries, line endings and the symlink
fix(scraping): preserve records when scrapes return unusable batches
```

### Granularity

**One commit per claim you would be willing to verify separately.** If the
message needs "and", it is probably two commits — unless the two parts are only
correct together, in which case it is genuinely one.

Keep code, its tests, and the documentation that describes it in the same
commit. A commit that changes behaviour without its test is a commit whose
verification status cannot be read from the history.

For agent work: let the agent commit as it likes inside its branch, and squash
at integration (§4). The granularity that matters is the one on trunk.

---

## 6. Pull requests: when they earn their keep

A solo developer has no one to ask for approval, so it is tempting to conclude
that PRs are pure ceremony. That conclusion is wrong for a specific reason: a PR
is not an approval gate here, it is **the only durable place where the
implemented / verified / committed / pushed / deployed distinction gets written
down next to the diff.** AGENTS.md insists on that distinction. A commit message
records what changed. Only the PR records what was actually checked, by whom or
by what, and what is still open.

**Open a PR when:**

- **An agent wrote the diff.** You are reviewing code you did not author, and
  you need a surface to read it on. This is the main case here.
- **CI must run before trunk.** The PR is the trigger.
- **It touches the deploy.** `main` is the Vercel production branch; a bad merge
  is live immediately.
- **More than one unit is integrating in the same window.** The PR list is the
  batch's status board.
- **The reasoning will matter later.** Provider choices, schema changes,
  anything where the "why" is not reconstructible from the diff.

**Skip the PR and commit straight to trunk when:**

- It is a typo, a link fix, or a status line you just wrote and read.
- It is a revert of something already on trunk. Reverts should be fast.
- You are the author, the change is one file, and you have already run the check
  that would have run in CI.

A skipped PR is a judgement call, not a rule violation. A PR opened for a
one-line fix and merged by its own author thirty seconds later is theatre — but
so is a twelve-file agent branch merged with no record of what was verified.

The template is at
[`.github/pull_request_template.md`](../../.github/pull_request_template.md).
Issue templates for dispatching a unit or reporting a defect are
[`task.md`](../../.github/ISSUE_TEMPLATE/task.md) and
[`defect.md`](../../.github/ISSUE_TEMPLATE/defect.md).

---

## 7. Tagging and versioning

Current state, verified 2026-09-17: **zero tags, zero releases**, and
`pyproject.toml` carries `version = "0.1.0"` anchored to nothing — it has never
matched a commit, a deploy, or a release.

That is a gap worth closing cheaply, because this repository has a state
AGENTS.md names explicitly and git currently cannot record: **deployed**. A
commit on `origin/main` is pushed. It becomes deployed when the Vercel build
succeeds and the live site is checked. Nothing in the repository distinguishes
the two.

**Rule: an annotated tag marks a commit observed working in production.**

```sh
git tag -a v0.3.0 -m "Carnegie demo verified live: navigation, FAQ download, assets"
git push origin v0.3.0
```

- **Annotated, not lightweight** (`-a`, not a bare `git tag v0.3.0`). Annotated
  tags carry a date, a message and their own object, so the tag records *what
  was verified*, not just where it pointed.
- **Created after the check, never before.** A tag on an unverified commit
  reintroduces exactly the confusion it exists to remove.
- **`0.MINOR.PATCH` is fine.** Nothing consumes this as a library, so SemVer's
  compatibility promise is not being made to anyone. MINOR for a new capability,
  PATCH for a fix. Stay below `1.0.0` until the proof of concept is a product.
- **CalVer was considered and rejected.** `2026.09.17` answers "when" — which
  `git log` already answers — and not "is this the one that worked".
- **The manifests follow the tag.** `pyproject.toml` and
  `demo/carnegie-hall/package.json` both carry `version = "0.1.0"` today, and
  neither is published anywhere. Bump them in the commit you tag, scope `build`,
  or leave them alone — but do not let them imply a version the tags contradict.
  The tag is the version of record; a manifest version is a copy.

The tag then pays for itself in provenance. `git describe --tags --always
--dirty` produces a string like `v0.3.0-4-gbb6ac1e-dirty`, which names the exact
tree a run happened on and says whether it was clean. That matters here more
than in most repositories, because the rendered outputs under `pipeline/out/`
are tracked and reviewed as deliverables — and "which run produced this" is
otherwise unanswerable once the file is in someone's hands. See
[the pipeline README](../../pipeline/README.md) for what those outputs are.

---

## 8. `.gitattributes`

The repository had **no `.gitattributes` anywhere** before this change — while
tracking `.xlsx`, `.docx`, `.pptx`, `.pdf`, `.webp`, `.jpg` and `.HEIC`
binaries, eleven CRLF data files, a set of generated outputs that a staleness
check compares byte-for-byte, and a committed symlink.

The file is [`.gitattributes`](../../.gitattributes) at the repository root, and
every rule in it carries its own comment. Summary of what it does and why:

| Rule | Why |
|---|---|
| `* text=auto` | One line-ending convention in history, so every agent worktree and every host sees identical bytes. |
| `*.csv -text` | Evidence CSVs are RFC 4180 CRLF (Python `csv.writer` through `open(..., newline="")`). Freezes their bytes. |
| `*.xlsx *.docx *.pptx *.pdf *.webp *.jpg *.heic *.HEIC binary` | `binary` is git's macro for `-diff -merge -text`. An end-of-line filter or a three-way merge turns a `.docx` into an unopenable zip, silently. |
| `*.md diff=markdown`, `*.py diff=python`, … | git's built-in funcname drivers label each hunk with its nearest heading or function instead of a line number. In a 41 KB document that is the difference between a reviewable and an unreviewable diff. |
| `pipeline/out/**` and `pipeline/trip/out/**` — `text eol=lf -merge linguist-generated=true` | Deterministic renders, no conflict markers inside a deliverable, collapsed in PR diffs. Two separate rules: `pipeline/out/**` does not match the trip renderer's outputs. |
| `data/raw/serpapi.com/** -merge linguist-generated=true` | A merged cache entry is a response no API ever returned. |
| `package-lock.json -merge linguist-generated=true` | A textually merged lockfile describes a tree npm would never resolve — and looks clean. Take one side, re-run `npm install`. |
| `CLAUDE.md -text -merge` | Never filter or text-merge the stored link target. See §9 for what this does *not* cover. |

### Two rules worth the extra explanation

**The `text eol=lf` on both output directories is load-bearing.**
`pipeline/render.cjs` decides whether an output is stale with an exact string
comparison:

```js
if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) stale.push(name);
```

On a host with `core.autocrlf=true`, a plain `text=auto` checkout hands every
`.md` output back with CRLF, the comparison fails for every file, and
`make pipeline-check` reports the whole pipeline permanently stale. Pinning
`eol=lf` makes the staleness check mean what it says.

**`-merge` on generated outputs is a choice about the shape of failure.** It
selects git's binary merge driver: on conflict, git keeps the current side and
flags the file instead of writing conflict markers into it. Conflict markers in
a rendered deliverable are *worse* than a conflict, because the artifact still
looks like a document and can be read, shipped, or attached to an email. The
only correct resolution for a generated file is to re-render it.

### The renormalisation trap, measured

Adding `.gitattributes` to a repository with existing history can make git want
to rewrite every text file it tracks. That would be a disaster here: it would
bury real row corrections in the evidence CSVs under whole-file diffs, which
AGENTS.md forbids. The rules above were chosen so that it does not happen, and
this was measured rather than assumed:

```
$ git status --porcelain
?? .gitattributes                 # nothing else — no tracked file is touched
```

The obvious explanation is wrong and worth recording. Plain `text=auto` does
*not* renormalise the CRLF files on its own: git skips the CRLF→LF clean filter
when the blob already in the index contains CRLF. What `*.csv -text` actually
defends against is `git add --renormalize`, which bypasses that safety. With the
rule commented out, `git add --renormalize -- data/` stages all eleven CSVs;
with the rule in place it stages none. Both halves were run on 2026-09-17.

If you ever add a rule that *does* cause renormalisation, do it as its own
commit (`chore(git): renormalise line endings`) touching nothing else, so the
next person can skip it with `git log --invert-grep` or `.git-blame-ignore-revs`.

---

## 9. The `core.symlinks` hazard

This is the most dangerous thing in the repository, and it is dangerous
precisely because nothing reports it.

`CLAUDE.md` is stored as a git symlink — mode `120000`, a blob containing the
nine bytes `AGENTS.md`:

```
$ git ls-files -s CLAUDE.md
120000 47dc3e3d863cfb5727b87d785d09abf9743c0a72 0	CLAUDE.md
```

AGENTS.md depends on this: it says "Preserve that link", and it makes verifying
the link part of the handoff procedure, so that a tool reading `CLAUDE.md` and a
tool reading `AGENTS.md` receive identical instructions.

**On a checkout with `core.symlinks=false`, git writes the link as a plain file
containing the text `AGENTS.md`.** Git for Windows sets this automatically when
the user lacks symlink-creation privilege, and bundled gits in some tools ship
with it set. When it happens:

- `CLAUDE.md` becomes a 9-byte text file. Any tool that reads it for
  instructions now reads the string `AGENTS.md` and nothing else. The project's
  own rule breaks with no error message.
- The index still records mode `120000`.
- **`git status` reports a clean tree.** Nothing has changed from git's point of
  view; the link has merely been written in a compatibility form.
- `.gitattributes` cannot help. `core.symlinks` is resolved at checkout time,
  before attributes are consulted. There is no attribute that detects or
  prevents it. The `CLAUDE.md -text -merge` rule protects the bytes from filters
  and merges; it cannot protect the *file type*.

The only defence is an explicit check. Run it after any clone, any
`git worktree add`, and on any host you have not used before:

```sh
# 1. The index must still record a symlink.
git ls-files -s CLAUDE.md | grep -q '^120000 ' \
  || echo 'BROKEN: CLAUDE.md is no longer a symlink in the index'

# 2. The working tree must actually be a symlink.
[ -L CLAUDE.md ] \
  || echo 'BROKEN: CLAUDE.md is a plain file in the working tree (core.symlinks?)'

# 3. It must point at AGENTS.md.
[ "$(readlink CLAUDE.md 2>/dev/null)" = AGENTS.md ] \
  || echo 'BROKEN: CLAUDE.md does not point at AGENTS.md'

# 4. The setting that causes it.
git config --get core.symlinks   # empty or "true" is fine; "false" is the bug
```

Check 1 and check 2 are both needed, and they fail independently. Check 2 alone
misses the worse case: someone edits the materialised plain file and commits it,
which rewrites the index entry to mode `100644` and destroys the link in
history. Check 1 catches that; check 2 does not.

**Repair.** If the index is still `120000` and only the working tree degraded:

```sh
git config core.symlinks true
rm -f CLAUDE.md
git checkout -- CLAUDE.md
[ -L CLAUDE.md ] && echo restored
```

If the index entry itself has become a regular file, restore the link and commit
it back:

```sh
rm -f CLAUDE.md
ln -s AGENTS.md CLAUDE.md
git add CLAUDE.md
git ls-files -s CLAUDE.md          # must print 120000 before you commit
```

If you are on a host that genuinely cannot create symlinks, **do not "fix" it by
committing a copy of AGENTS.md as CLAUDE.md.** Two files that must stay
identical and have no mechanism keeping them identical will diverge, and the
divergence will be invisible. Leave the link alone, work from `AGENTS.md`
directly, and record the limitation in
[PROGRESS.md](../carnegie-hall/PROGRESS.md) — which is what PARALLEL-WORKFLOW.md
already instructs.

---

## 10. Generated files and lockfiles

### Generated files are tracked here on purpose

Most projects gitignore generated output. This one tracks several kinds, for
reasons that are good but need stating so nobody "cleans them up":

| Path | Why tracked | Rule |
|---|---|---|
| `pipeline/out/**` | The rendered deliverables *are* the reviewable product; a diff of them is how a content change gets reviewed | Never hand-edit. Never hand-merge. Re-render. |
| `data/interim/**`, `data/final/**` | Research evidence with manual corrections in it | Preserve manual corrections; reconcile by stable ID, never overwrite blindly |
| `data/raw/serpapi.com/**` | Every cached response cost monthly search quota and holds no key | Additive only; deleting one costs real money to recreate |
| `data/raw/**` (everything else) | Recreatable page cache | Gitignored |

The operational rule for all of them: **if a tool wrote it, a tool resolves its
conflicts.** `.gitattributes` enforces the shape of that (§8) but the discipline
is yours. After any merge that touches a generator:

```sh
make pipeline-check      # renders and compares; reports any stale output
```

A generated file committed in a state the generator would not produce is a
silent lie about the source, and it survives until someone re-runs the
generator — which may be weeks.

### Lockfiles, and the bootstrap step every fresh worktree needs

There is **one** npm manifest, and it is not at the repository root:
`demo/carnegie-hall/package.json`, with a single exactly-pinned runtime
dependency (`docx`), and a committed `package-lock.json` (lockfileVersion 3).
Everything else Node — `pipeline/*.cjs`, the four `.test.cjs` suites, Node's
built-in test runner — needs no install at all.

That one dependency has a consequence every agent worktree hits, and it is the
cleanest possible illustration of §3. Verified 2026-09-17 in a fresh worktree:

```
$ node --test tests/*.test.cjs
# pass 41
# fail 1     <- Cannot find module 'docx'

$ ls ../../demo/carnegie-hall/node_modules   # present in the main checkout
$ ls    demo/carnegie-hall/node_modules      # absent here
```

`node_modules/` is gitignored, so it does not travel with a ref. The main
checkout has it; every new worktree does not, and one test shells out to
`demo/carnegie-hall/build.cjs`, which requires `docx`. Nothing is broken — the
worktree is simply not bootstrapped.

**Bootstrap a new worktree before trusting a test result:**

```sh
npm ci --prefix demo/carnegie-hall     # then 42/42 pass
make venv                              # for the pytest suite
```

A red suite in a fresh worktree is a bootstrap question before it is a defect
report. Ask it first.

Python pins live in **two** places, and this is a live hazard:

- `requirements.txt` — seven exact pins, what `make venv` installs.
- `pyproject.toml` — the same six runtime pins plus `pytest` under
  `[project.optional-dependencies] dev`.

They agree today. Nothing enforces that. **Rule: any dependency change edits
both files in the same commit, scope `build`.** If they ever drift, the
authority is `requirements.txt`, because that is what the Makefile actually
installs — but the right fix is to make them agree, not to pick a winner.

**Every manifest and lockfile is a single-owner file** under
PARALLEL-WORKFLOW.md, which already reserves them explicitly. Two agents adding
dependencies in parallel produce a conflict git merges textually into a tree npm
would never have resolved — and it looks clean. A conflicted `package-lock.json`
is never hand-edited: take one side, then regenerate with `npm install` and
commit the result. Never dispatch two units that both touch a manifest.

---

## 11. What never gets committed

Some of these are in `.gitignore`. All of them are the developer's
responsibility, because `.gitignore` does not cover intent.

- **Credentials.** `.env`, `SERPAPI_KEY` in any form, in any file — source,
  cache, sidecar, CSV, commit message, demo file, handoff note, issue, or PR
  body. AGENTS.md is explicit. Configure secrets per host.
- **Any individual's name, email address or phone number** that is not already
  published on a school, district or booster site with its `source_url`
  recorded. The project uses the role "logistics and software developer" in
  place of personal names, and never invents, infers, or pattern-guesses a
  contact detail. Blank is correct.
- **Private-account data.** Inbox, CRM, or paid-directory exports. Analysing
  supplied material internally does not authorize publishing it.
- **Environment and build output.** `.venv/`, `__pycache__/`, `node_modules/`,
  `/dist/`, `/.vercel/`, `.pytest_cache/`.
- **Recreatable cache.** `data/raw/*` except the tracked SerpAPI directory.
- **Duplicate working copies.** NotebookLM snapshots, duplicate Zoho working
  files, scratch exports. Keep them local unless a task needs them published.
- **Anything an agent generated that you have not read.** This is the failure
  mode that is genuinely new. A solo developer with a dozen agents can commit
  hundreds of lines nobody has ever looked at, and git will make it look
  exactly like reviewed work forever. Reading the diff is the job that did not
  get automated.

---

## 12. The check to run before you commit

No hooks are installed in this repository — only git's stock samples, verified
2026-09-17. That is a defensible choice: hooks do not travel with a clone, they
do not run in every agent harness, and a hook that half the worktrees lack is
worse than no hook. Until something enforces this, run it:

```sh
# The symlink — git status will NOT tell you (see §9)
git ls-files -s CLAUDE.md | grep -q '^120000 ' && [ -L CLAUDE.md ] \
  && echo 'ok: CLAUDE.md symlink intact' || echo 'BROKEN: see GIT-WORKFLOW.md §9'

# Staged changes stay inside this unit's declared files
git diff --cached --name-only

# Nothing generated is stale, and the suites still pass
make pipeline-check
node --test tests/*.test.cjs

# No secret is about to be committed
git diff --cached | grep -nEi 'serpapi_key|api[_-]?key|secret|BEGIN [A-Z ]*PRIVATE KEY'
```

An empty result from the last command is what you want. A hit is not
automatically a leak — a variable *name* is fine, a value is not — but it is
always worth a second look.

---

## Sources

Current practice consulted 2026-09-17:

- [DORA — Trunk-based development](https://dora.dev/capabilities/trunk-based-development/)
  (branch lifetime, merge cadence, active-branch count)
- [Trunk Based Development](https://trunkbaseddevelopment.com/)
- [GitHub Docs — About stacked pull requests](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs)
  (stack depth and rebase cost)
- [Git worktrees for parallel AI coding agents](https://developer.upsun.com/posts/ai/git-worktrees-for-parallel-ai-coding-agents)
  (worktree-per-agent as the isolation primitive, and what it does not isolate)
- [Git symbolic links on Windows](https://codemia.io/knowledge-hub/path/git_symbolic_links_in_windows)
  and [core.symlinks=false silently breaking tracked symlinks](https://github.com/desktop/desktop/issues/20269)
