# The developer loop

How work in this repository gets checked, by a person or by an agent. Everything
here is a `make` target, so the local loop and CI run the same commands.

## The short version

```sh
make venv          # once per checkout: creates .venv and installs requirements.txt
make check-fast    # seconds — the inner loop, while editing
make check         # before every commit — the full gate, and the target CI runs
```

`make check` fails on the first failing step and prints the failing command.
A clean run ends with:

```
check passed: pytest, Node suites, pipeline check, trip check.
```

## What each target runs

| Target | Runs | Typical time |
|---|---|---|
| `make check` | `make test` then `make check-fast` | pytest under a second, plus the fast checks |
| `make check-fast` | every `tests/*.test.cjs` suite, `pipeline check --all`, `trip check --all` | seconds |
| `make test` | pytest only (unchanged) | |
| `make test-node` | every `tests/*.test.cjs` suite | |
| `make pipeline-check` | `pipeline check --all` plus `tests/pipeline.test.cjs` (unchanged) | |
| `make trip-check` | `trip check --all` plus every `tests/trip[-_]*.test.cjs` suite | |
| `make pipeline` / `make trip` | re-render the tracked output of each pipeline | |
| `make node-deps` | installs `demo/carnegie-hall/node_modules` when it is missing or stale | |

The Node suites are found with `$(wildcard tests/*.test.cjs)`, not a hard-coded
list, so a suite added by another task is picked up without editing the Makefile.

## What each check protects against

- **pytest** (`tests/test_*.py`) — the Python scrapers, the merge/enrich/score
  path and the preservation guards in `scripts/run_all.py`. It runs against
  cached fixtures under `tests/fixtures/`; it never goes to the network.
- **`node pipeline/cli.cjs check --all`** and
  **`node pipeline/trip/cli.cjs check --all`** — these are the regression gate
  that matters most here. Both re-render every case/trip in memory from its
  source record (`*.case.json`, `*.trip.json`) and compare the result with the
  tracked files under `pipeline/out/` and `pipeline/trip/out/`. They exit 1 when
  a committed output no longer matches the record it came from — that is, when
  someone hand-edited a generated file, or changed a record and forgot to
  re-render. The error names the file and the command that fixes it:
  `node pipeline/cli.cjs render <case-id>`. They also exit 1 on a validation
  error in the record itself.

  One caveat to read honestly: each check compares only the files its record
  *renders*. The case pipeline has renderers and therefore a real staleness
  gate. The trip pipeline discovers its renderers from
  `pipeline/trip/renderers/*.cjs`; while that directory is empty, `trip check`
  renders zero files, reports `outputs current (0 file(s))` and can only catch a
  validation error in the trip record. It becomes a staleness gate the moment
  the first renderer lands.
- **`tests/pipeline.test.cjs`, `tests/trip[-_]*.test.cjs`** — the loader, schema,
  validation rules and renderer contract behind those two CLIs.
- **`tests/carnegie_demo.test.cjs`, `tests/carnegie_review.test.cjs`** — the
  demo build's manual-edit protection: that regenerating the demo does not
  overwrite a reviewed document or a hand-corrected export.

## The `node_modules` prerequisite

`tests/carnegie_demo.test.cjs` executes `demo/carnegie-hall/build.cjs`, which
requires the `docx` package. Without `demo/carnegie-hall/node_modules` one test
fails with a module-not-found error that looks like a code bug and is not one.

`make check`, `make check-fast` and `make test-node` all depend on `node-deps`,
which runs `npm --prefix demo/carnegie-hall ci` when `docx` does not resolve or
when `package-lock.json` is newer than the tree npm last wrote, and does nothing
otherwise. You can also run `make node-deps` on its own. The directory is
ignored by `demo/carnegie-hall/.gitignore`.

## What CI adds

`workflows/ci.yml`: checkout, Node 20, Python 3.11 with a pip cache,
`make venv`, `make node-deps`, then `make check`. It runs on every pull request
and on pushes to `main` — `pull_request` already covers a branch with an open
PR, so triggering on every push as well would run the same job twice.

**To activate it, copy `workflows/ci.yml` to `.github/workflows/ci.yml` from a
normal git client.** The Claude GitHub App cannot push files under
`.github/workflows/` (`docs/SCRAPING_HURDLES.md` row 14). That is not a
guess here: on 2026-09-17 a push carrying `.github/workflows/ci.yml` was
rejected with `refusing to allow a GitHub App to create or update workflow
.github/workflows/ci.yml without 'workflows' permission`, so the file was parked
alongside `refresh.yml` instead. The two are parked for opposite reasons —
`refresh.yml` must stay parked, `ci.yml` should be copied in.

It is read-only on purpose: `permissions: contents: read`, no scheduled trigger,
no deploy step, and nothing that writes to `data/` or to a generated output. It
adds no check that you cannot run locally — its only job is to prove `make check`
was actually run against what is being merged, rather than trusting that it was.

The other automation on this repository is Vercel, which runs
`scripts/package-demo.cjs` on a push to `main`. That script copies an explicit
allowlist into `dist/`; it regenerates nothing, so it cannot catch a regression
in anything it copies.

**Status, 2026-09-17: implemented, not active.** The workflow is written and
every command in it has been run by hand on this branch, but it sits at
`workflows/ci.yml` and has never run on GitHub. Until it is copied to
`.github/workflows/ci.yml` on the default branch and a run appears under
Actions, nothing gates a commit but discipline — do not read a green local
`make check` as a merge gate.

`workflows/refresh.yml` is a complete workflow parked **outside**
`.github/workflows/` on purpose and must stay there. It runs `make refresh`,
whose destructive and stale-cache failure paths are recorded in
`docs/AUDIT-2026-09-10.md`; activation is gated on Task 9 of
`docs/superpowers/plans/2026-09-10-pipeline-remediation.md`.

## Reproducing a CI failure locally

CI runs the same three `make` targets you do, in this order:

```sh
make venv        # rebuild from scratch to match CI: rm -rf .venv && make venv
make node-deps   # npm ci against demo/carnegie-hall/package-lock.json
make check
```

If the two differ, the usual causes are:

- **`.venv` is stale.** CI installs `requirements.txt` from scratch every run.
  `rm -rf .venv && make venv` reproduces that.
- **`node_modules` is stale.** `npm ci` installs `package-lock.json` exactly;
  a local `npm install` may not. `rm -rf demo/carnegie-hall/node_modules && make node-deps`.
- **A missing generated output.** The two `check` commands compare against
  tracked files, so an output you rendered but never committed passes locally
  and fails in CI. `git status` before committing.
- **Node version.** CI pins Node 20; `demo/carnegie-hall/package.json` requires
  `>=20`. A much newer local Node is usually fine but is not what CI ran.

To run a single failing suite: `node --test tests/<name>.test.cjs`. To run a
single pytest module: `.venv/bin/python -m pytest tests/test_<name>.py -q`.

## Deliberately outside the gate

Three targets exist for convenience and are never run by `make check`:

- **`make qa`** — `scripts/qa.py` in report mode. It is a report, not a gate:
  in report mode it exits 1 whenever any check has findings, and this repository
  has known open findings that are recorded rather than fixed (the two Ohio
  schools Wikipedia lists as "(Delaware)", the stateless Westlake row). It also
  loads the NCES Common Core of Data for two of its checks, which downloads
  into `data/raw/nces/` when that cache is cold. Narrow it with
  `make qa ARGS="--check twins --check parades"`. `--fix` rewrites
  `data/final/prospects.csv` and is never the default — ask for it explicitly
  with `make qa ARGS=--fix`.
- **`make search-fallback`** — `scripts/search_fallback.py`. One SerpAPI search
  per school against a metered quota, and it writes `prospects.csv`.
  `make search-fallback ARGS=--dry-run` decides from the cache and writes
  nothing.
- **`make refresh`** — the seasonal re-scrape. See the audit note above.

## What is still NOT checked

An honest list, so nobody reads a green `make check` as more than it is:

- **No linter, formatter or type checker.** Nothing enforces style, import
  hygiene or types in either language. Unused variables, shadowed names and
  wrong-typed arguments reach `main` freely.
- **No coverage measurement.** There is no signal on which lines the suites
  actually reach. A module can have a passing test file and almost no coverage.
- **No browser, visual or accessibility testing.** The demo under
  `demo/carnegie-hall/` and the published site are checked only by Node assertions
  over the generated HTML. Layout, contrast, keyboard navigation and mobile
  widths are still verified by hand.
- **No document render check.** Word/DOCX and PDF outputs are checked for
  existence and preservation, not for how they look when opened.
- **The Python refresh path is unguarded.** `make refresh` and `make all` write
  to `data/`. Nothing in `make check` exercises them against a real source, and
  the audit's destructive and stale-cache findings are open.
- **Neither `check` command detects an orphan output.** Both compare the files a
  record renders against what is on disk. A file left in `pipeline/out/` or
  `pipeline/trip/out/` after a renderer was renamed or removed is not reported.
- **The demo's own generated files are not staleness-checked.** `make check`
  gates `pipeline/out/` and `pipeline/trip/out/`, but nothing compares the
  tracked `demo/carnegie-hall/index.html` and `exports/` against a fresh
  `node demo/carnegie-hall/build.cjs`. The demo suites exercise the build and
  its manual-edit protection inside temporary directories, not the committed
  copies. Edit `index.template.html` or `example.json`, forget to rebuild, and
  `make check` stays green while Vercel publishes the previous render. Running
  the build would write into the working tree, which is why it is not in the
  gate; a `--check` mode on `build.cjs` would close this.
- **A third pipeline would ship ungated.** `check-fast` names
  `pipeline/cli.cjs` and `pipeline/trip/cli.cjs` explicitly, because
  `check --all` is a convention those two happen to share, not an enforced
  interface. Adding `pipeline/<something>/cli.cjs` without adding a line to
  `check-fast` produces no warning.
- **`make trip-check` matches `tests/trip[-_]*.test.cjs` only.** A trip suite
  named outside that pattern still runs under `make check` (which globs every
  `tests/*.test.cjs`) but is silently absent from `make trip-check`.
- **Two dependency manifests can drift.** `requirements.txt` and the
  `dependencies` list in `pyproject.toml` are maintained separately and nothing
  compares them. CI installs from `requirements.txt`.
- **No secret scanning.** The `SERPAPI_KEY` rule (never in source, cache,
  sidecars, CSVs, commits or a handoff pack) is enforced by review only.
- **CI does not gate merges by itself.** Branch protection requiring this check
  is a repository setting, not something this file can turn on.
