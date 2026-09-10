PY := .venv/bin/python
PIP := .venv/bin/pip

.PHONY: venv scrape enrich score export all test refresh

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

refresh:
	$(PY) scripts/run_all.py --refresh
