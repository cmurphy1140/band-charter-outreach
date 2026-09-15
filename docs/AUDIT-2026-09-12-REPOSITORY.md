# Full repository audit — September 12, 2026

Scope: the whole repository at `dd73eee` (local branch `codex/conversation-layout`,
identical to `origin/main`), including the Python research pipeline, the Carnegie
demo, the build and deployment path, documentation accuracy, tests, data, secrets
and Git state.

**Audit only.** No source, document, data, configuration or deployment change was
made. Six pre-existing uncommitted items were left untouched. Findings separate
reproduced facts from judgment, and every claim below names the check that produced it.

This audit does not supersede [AUDIT-2026-09-10](AUDIT-2026-09-10.md) (research
pipeline) or [DESIGN-AUDIT-2026-09-12](carnegie-hall/DESIGN-AUDIT-2026-09-12.md)
(live demo presentation). It covers what those two did not.

---

## Decision

The deployment path is sound and the demo is safe to present. The defects found
are in **verification and reproducibility**, not in what a viewer sees: a project
claim that all Node checks pass is false, the one documented test command does not
run the Node suite at all, and the prior audit's own evidence script no longer
executes. Nothing here blocks the Troen presentation.

---

## Verified working

Each item was exercised, not read.

| Check | Method | Result |
|---|---|---|
| Deployment link integrity | Extracted all 12 local `href`/`src` values from `demo/carnegie-hall/index.html` and compared with the explicit copy list in `scripts/package-demo.cjs` | Every reference is packaged. Nothing references outside the demo web root. No 404 risk on Vercel |
| Generated-file preservation | Recomputed SHA-256 for all 10 entries in `.generated-manifest.json` | 10 of 10 match disk. No drift between recorded and actual generated artifacts |
| Vercel build safety | `vercel.json` sets `installCommand: ""`; confirmed `package-demo.cjs` requires only Node builtins | The build cannot fail for want of `npm install`. The `docx` dependency is reached only by `build.cjs`, which the deploy never runs |
| Secrets | `git ls-files` for env files, full-history search for `.env`, regex scan of tracked files for key-shaped assignments | Only `.env.example` is tracked. No key has ever been committed. `.gitignore` correctly allows the template and blocks the rest |
| Python test suite | `pytest tests -q` | 87 passed, 4 skipped |
| Python syntax | `compileall` over `scrapers/` and `scripts/` | All modules compile. Zero bare `except:`, zero `TODO`/`FIXME`/`HACK` in tracked source |
| Documentation links | Resolved all 443 internal Markdown links across 54 tracked files, handling angle-bracket paths | Zero broken |
| Event dates | Compared the March 3 project scope against the March 31 brochure reference and the March 29–April 1 BMG group contract | Consistent and deliberate. `docs/carnegie-hall/README.md` explicitly scopes to March 3 and states that other trips' terms do not transfer. Not a contradiction |
| A03 from the prior audit | Exercised the empty-batch path | Confirmed **fixed**. `write_interim_scoped` now raises `BlockedSource` instead of silently replacing records |

---

## Findings

### F1 — High: a project status claim about tests is false

**Type:** reproduced. `AGENTS.md` line 28 states "Twenty Node checks and four-width
browser checks pass."

Running `node --test tests/carnegie_demo.test.cjs tests/carnegie_review.test.cjs`
gives **19 pass, 1 fail**. The failure is test 10, "standalone full builds include
FAQ files and their relative brochure citation", which shells out to `build.cjs`
and gets `Cannot find module 'docx'`.

**Cause:** `demo/carnegie-hall/node_modules` does not exist. `build.cjs` requires
`docx` lazily at line 160, so only the Word-generating path fails.

**Impact:** the project's own status file overstates verification. Anyone resuming
from `AGENTS.md` believes a check passed that did not run to completion. The demo
itself is unaffected, because the deployed artifacts are packaged, not regenerated.

**Smallest correction:** install the dependency (`package-lock.json` is committed,
so `npm ci` in `demo/carnegie-hall` is deterministic), re-run, and correct the
claim to whatever the run actually produces.

### F2 — Medium: the documented test command never runs the Node suite

**Type:** reproduced. `make test` executes `pytest -q` only. The Node tests are
reachable solely through `npm test` inside `demo/carnegie-hall`, which is not
referenced from the `Makefile` or the root `README.md` command list.

**Impact:** the single obvious way to check the project reports green while a Node
test is failing. This is the mechanism that let F1 persist.

**Smallest correction:** either add the Node suite to the `test` target, or state
in the `Makefile` that `test` covers Python only and name the second command.

### F3 — Medium: a clean checkout cannot run the Node suite

**Type:** reproduced. Neither `node_modules` directory exists, and no documented
step installs one. The root `README.md` documents `make venv` for Python and says
nothing about Node dependencies.

**Impact:** every fresh checkout, worktree and cloud environment starts with F1
already true. The project's parallel-work documentation describes exactly those
checkouts.

**Note:** `package-lock.json` is committed, so this is a documentation gap rather
than a dependency-resolution problem.

### F4 — Medium: prior finding A12 is still open, and reproduced today

**Type:** reproduced. `scripts/export.py` `_write_sheet` writes strings verbatim
into openpyxl. Passing a school value of `=1+1` produces cell C2 with
`data_type == 'f'`, an active formula.

The September 10 audit classified this as a future-input risk because no such value
existed in the data. That remains true; no current file contains one. The guard
was never added.

**Impact:** an exported workbook is a document handed to a school or partner. A
source string beginning with `=`, `+`, `-` or `@` becomes executable content in
Excel. The input path is public web scraping, which is not a trusted source.

### F5 — Medium: the prior audit's evidence can no longer be regenerated

**Type:** reproduced. `docs/audits/2026-09-10/reproduce.py` crashes at line 59 with
`BlockedSource: incomplete source result: no rows returned`.

The cause is the A03 fix in `e6e493e`. The script asserts the old behaviour, in
which an empty scrape silently replaced good records. The fix made that path raise,
which is correct, and the harness was not updated alongside it.

**Impact:** the September 10 audit's baseline is now unverifiable by its own means.
This is a good problem caused by a real fix, but it means the repo cannot currently
demonstrate which prior findings still reproduce.

**Smallest correction:** update the script to assert the new contract, or mark the
A03 section as superseded and record where the fix is proven instead.

### F6 — Medium: twelve absolute local paths in tracked documentation

**Type:** reproduced. Links to `/Users/connormurphy/...` appear in:

- `docs/carnegie-hall/START-HERE-LEARNING.md`, six links pointing **into this
  repository** at an absolute path rather than a relative one.
- `docs/carnegie-hall/TOOLS-AND-CONNECTORS.md`, two links into a plugin cache
  pinned to a specific version directory.
- `AGENTS.md` and `CLAUDE.md`, four links to global instruction files. These are
  deliberate and documented as machine-local; they are listed for completeness, not
  as defects.

**Impact:** the six in `START-HERE-LEARNING.md` are a portability defect. That file
exists to orient someone starting work, and its links resolve only on this Mac. Any
worktree, cloud checkout or collaborator gets dead links from the onboarding document.
The relative equivalents already exist and work.

### F7 — Low: 32MB of iPhone photographs tracked, with split extension case

**Type:** observed. `logistics/` holds 14 HEIC files totalling roughly 28MB, the
largest single tracked file being 3.8MB. Extensions split nine `.HEIC` against five
`.heic`.

**Impact:** two separate issues. Repository weight is carried by every clone forever,
and HEIC is not universally renderable, so these are archive material rather than
usable assets. The case split is the more subtle risk: it is the same class of hazard
that breaks on a case-sensitive filesystem, and the deployment target is Linux.
Nothing currently references these files from the web root, so there is no live
breakage today.

### F8 — Low: 13.7MB untracked and un-ignored

**Type:** observed. `Archive/` (8.2MB), `notebooklm/` (5.5MB) and
`docs/carnegie-hall/research/Zoho Research - Source and Working Files/` (8.1MB) are
untracked and absent from `.gitignore`.

**Impact:** they appear in every `git status`, which makes the real working set
harder to read and makes an accidental `git add -A` costly. Deciding for each whether
it is ignored or committed is a small, one-time cleanup.

### F9 — Information: prior audit follow-through

Of the 14 findings in the September 10 audit, **two are addressed**: A03
(`e6e493e`, confirmed working today) and A05 (`e4e6a9b`). Twelve remain open,
six of them P1.

`docs/carnegie-hall/PLAN.md` maps all 14 onto six workstreams. No commit since
September 10 touches `scrapers/`, `data/` or the enrichment, scoring and export
scripts, other than the two fixes named above. All work since has been the Carnegie
demo. This is consistent with the stated plan to prioritise the demonstration, and
`README.md` correctly warns that the current list is not a verified outreach list.
It is recorded here so the open count is visible in one place.

### F10 — Low: branch sprawl

Nine branches are unmerged into `main`; four already-merged branches remain
undeleted. The current branch `codex/conversation-layout` is identical to
`origin/main` and does not exist on the remote, so the branch name records
intent that the remote cannot see.

---

## Limits of this audit

Not performed: live Vercel deployment verification, browser or accessibility
testing, any network request, SerpAPI quota consumption, re-verification of the
research data's factual claims, NCES re-checking, any Word or Excel document
rendering, and any judgment about the business content. The Python suite was run;
the one failing Node test was diagnosed but not repaired.

The link, manifest, packaging and secrets checks are complete for tracked files at
`dd73eee`. They say nothing about the six uncommitted items, which were read but
not analysed as deliverables.
