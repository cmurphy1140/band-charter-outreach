PY := .venv/bin/python
PIP := .venv/bin/pip

# Every Node suite under tests/, resolved when the recipe runs so that a suite
# another task adds is picked up without editing this file.
NODE_TESTS = $(wildcard tests/*.test.cjs)
TRIP_TESTS = $(wildcard tests/trip[-_]*.test.cjs)

DEMO_DIR := demo/carnegie-hall
DEMO_LOCK := $(DEMO_DIR)/package-lock.json
DEMO_STAMP := $(DEMO_DIR)/node_modules/.package-lock.json

# Extra flags for the single-script targets, e.g. `make qa ARGS="--check twins"`.
# `:=`, not `?=`: an ambient ARGS in the environment must not reach these
# recipes, while `make qa ARGS=--fix` on the command line still wins.
ARGS :=

.PHONY: venv scrape enrich score export all test refresh check-serpapi \
        search-fallback qa pipeline pipeline-check trip trip-check \
        node-deps test-node check-fast check

venv:
	python3 -m venv .venv
	$(PIP) install -q -r requirements.txt

scrape:
	$(PY) scripts/run_all.py

enrich:
	$(PY) scripts/enrich.py

score:
	$(PY) scripts/score.py

export:
	$(PY) scripts/export.py

all: scrape enrich score export

test:
	$(PY) -m pytest -q

check-serpapi:
	@$(PY) -c "from scrapers.serpapi import key_present; print('SerpAPI key configured.' if key_present() else 'SerpAPI key missing: add it to the project .env file.')"

refresh:
	$(PY) scripts/run_all.py --refresh

# --- research scripts, run deliberately, never from a gate -------------------
# Both spend SerpAPI quota or rewrite data/final/prospects.csv, so neither one
# belongs in `make check`.

search-fallback:
	$(PY) scripts/search_fallback.py $(ARGS)

# Report mode. `--fix` rewrites data/final/prospects.csv and is never the
# default: ask for it with `make qa ARGS=--fix`. Report mode exits 1 whenever a
# check has findings, and this repository has known open findings, so read this
# target as a report rather than treating it as a gate.
qa:
	$(PY) scripts/qa.py $(ARGS)

# --- generated-output pipelines ----------------------------------------------
# `render` rewrites the tracked output; `check` re-renders in memory and fails
# when what is committed no longer matches its source record.

pipeline:
	node pipeline/cli.cjs render --all

pipeline-check:
	node pipeline/cli.cjs check --all
	node --test tests/pipeline.test.cjs

trip:
	node pipeline/trip/cli.cjs render --all

trip-check:
	node pipeline/trip/cli.cjs check --all
	@test -n "$(TRIP_TESTS)" || { echo "make trip-check: no suites matched tests/trip[-_]*.test.cjs"; exit 1; }
	node --test $(TRIP_TESTS)

# --- the developer loop -------------------------------------------------------

# tests/carnegie_demo.test.cjs runs demo/carnegie-hall/build.cjs, which requires
# the docx package; without it one test fails with a module-not-found error that
# reads like a code bug. Reinstall when docx does not resolve (an interrupted
# `npm ci` leaves the directory in place but incomplete) or when the lockfile is
# newer than the tree npm last wrote.
node-deps:
	@if node -e "require.resolve('docx', { paths: ['$(DEMO_DIR)'] })" >/dev/null 2>&1 \
	   && [ ! "$(DEMO_LOCK)" -nt "$(DEMO_STAMP)" ]; then \
	  echo "$(DEMO_DIR) dependencies are current."; \
	else \
	  echo "installing $(DEMO_DIR) dependencies (tests/carnegie_demo.test.cjs needs docx) ..."; \
	  npm --prefix $(DEMO_DIR) ci; \
	fi

test-node: node-deps
	@test -n "$(NODE_TESTS)" || { echo "make test-node: no suites matched tests/*.test.cjs"; exit 1; }
	node --test $(NODE_TESTS)

# Seconds. The inner loop: every Node suite plus both staleness checks.
# The two CLIs are listed by hand, unlike NODE_TESTS: their `check --all`
# interface is a convention, not a guarantee. A third pipeline must be added
# here, or it ships with no staleness gate.
check-fast: test-node
	node pipeline/cli.cjs check --all
	node pipeline/trip/cli.cjs check --all
	@echo "check-fast passed: Node suites, pipeline check, trip check."

# Everything that gates a commit. This is the target CI runs as its gate step.
check:
	@command -v node >/dev/null 2>&1 || { echo "make check: node is missing. Node 20 or newer is required."; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "make check: npm is missing. Node 20 or newer is required."; exit 1; }
	@test -x $(PY) || { echo "make check: $(PY) is missing. Run 'make venv' first."; exit 1; }
	@$(PY) -c "import pytest" >/dev/null 2>&1 || { echo "make check: pytest is not installed in $(PY). Run 'make venv' first."; exit 1; }
	$(MAKE) test
	$(MAKE) check-fast
	@echo "check passed: pytest, Node suites, pipeline check, trip check."
