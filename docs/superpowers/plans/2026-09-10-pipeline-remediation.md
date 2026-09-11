# Parade Prospect Reliability Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Delegated execution with `superpowers:subagent-driven-development` is an alternative only if Connor requests it. Steps use checkbox syntax. Do not commit unless Connor explicitly asks.

**Goal:** Make the existing parade list reproducible, preserve researched school identities, and deliver evidence-backed exports before expanding into Carnegie Hall prospects.

**Architecture:** Keep the existing Python modules, CSV inputs and workbook outputs. Add small explicit resolution/evidence files at the existing merge boundary; make refresh publication transactional and source completeness visible. Do not introduce a service, database, UI or generalized workflow engine for this work.

**Tech Stack:** Existing Python 3.11+, requests, beautifulsoup4, pandas, lxml, openpyxl and pytest. No additional dependencies are needed for the initial repair tasks.

**Spec:** `docs/AUDIT-2026-09-10.md`, findings A01–A14; existing `CLAUDE.md` guardrails and `docs/CODEX_HANDOFF.md` for the future Carnegie scope.

## Current Status

Planning and audit completed against `be3f9ff`. All implementation tasks below remain open. Existing data has not been repaired. This plan does not authorize sending outreach or silently changing the client offer.

## Global constraints

- Never invent, infer, or pattern-guess contact details. Blank is correct.
- Every row must have at least one `source_url`.
- Public data only. Respect robots.txt and 1 request/sec per host; maximum 20 school pages per crawl.
- Keep middle-school prospects; exclude college, military, community, honor/all-star and non-US groups under the existing rules.
- Never hand-edit `data/final/prospects.csv`; regenerate through reviewed transformations.
- Ask before adding dependencies or credentials. Existing approved libraries suffice for the first increments.
- Do not commit, push, send emails, enable recurring jobs or regenerate the client packet as part of this plan-only turn.
- Preserve current weighting until a documented product decision changes what the scores mean.
- Preserve ambiguity. A same-name school is not a safe identity match without supporting evidence.

## Approach choices

**Recommended: repair in place.** Add tests around the failing boundaries, repair them individually, then recover and validate current records. This preserves the usable parser work and minimizes migration risk.

**Alternative: redesign all storage around a database now.** This could improve long-term evidence modeling, but adds schema migration and deployment work before correcting known errors. Defer until multiple lists, users, or volume justify it.

The delivery sequence below follows repair in place. Carnegie discovery is gated behind a small validated parade baseline and an offer-specific specification, not a wholesale rebuild.

## Task 1 — Preserve verified school identity through every rebuild

Addresses A01 and the stateless-merge part of A06. First useful increment: eight researched school records survive rebuilding.

**Files:** modify `scripts/run_all.py`, `scripts/search_fallback.py`, `scripts/enrich.py`, `tests/test_run_all.py`; create `data/interim/school_resolutions.csv`; update `docs/SCRAPING_HURDLES.md`.

**Interface:** `apply_resolutions(rows: list[dict], resolutions: list[dict]) -> list[dict]` runs before `merge()`. Resolution columns: `source_url, source_school, source_state, resolved_school, resolved_state, nces_id, evidence_url, verified_at, reason`. The source observation key is explicit; conflicting resolutions must raise a descriptive error. New values may be populated only from verified evidence. Existing final schema remains unchanged in this increment.

- [ ] Add a regression based on the pre-QA state (`01f9278`) and current interim observations. Assert that the eight retained resolved schools keep state, district, enrollment, school URL and provenance after two successive rebuilds.
- [ ] Add ambiguous-name tests. A Westlake observation without evidence must remain unresolved even when only one stated Westlake happens to be in the current list.
- [ ] Implement resolution loading/validation and apply it before grouping. Join enrichment using the resolved identity; preserve the reviewed NCES ID in the resolution/evidence file.
- [ ] Recover only the eight retained records from history after checking their source decisions. Do not reintroduce the Van Nuys cheer row.
- [ ] Write newly verified resolutions as durable inputs when search/enrichment changes identity, so the final CSV is never the sole copy of a researched identity.
- [ ] Validate rebuilt files in a staging directory and compare all changed fields before replacing outputs. Expected changes are specifically listed per recovered school.

Regression shape:

```python
def test_resolution_applies_before_merge():
    from scripts.run_all import apply_resolutions
    rows = [{"school": "Cherry Creek High School", "state": "",
             "city": "", "event": "Hollywood", "year": "2026",
             "source_url": "https://example.org/lineup", "band_name": ""}]
    resolutions = [{"source_url": "https://example.org/lineup",
                    "source_school": "Cherry Creek High School", "source_state": "",
                    "resolved_school": "Cherry Creek High School", "resolved_state": "CO",
                    "nces_id": "080291000186", "evidence_url": "https://cherrycreek.cherrycreekschools.org/",
                    "verified_at": "2026-09-10", "reason": "Reviewed school identity"}]
    got = apply_resolutions(rows, resolutions)
    assert got[0]["state"] == "CO"
    assert rows[0]["state"] == ""  # Keep original observations immutable.
```

**Verification:** `.venv/bin/python -m pytest tests/test_run_all.py tests/test_search_fallback.py -q`. Acceptance: lossless repeated rebuild for reviewed identities and no automatic ambiguous merges.

## Task 2 — Keep separate schools and source observations during dedupe

Addresses the interim collision in A06.

**Files:** modify `scripts/run_all.py:write_interim_scoped`, `scrapers/heb.py`, `scrapers/news_east.py:prefer_stated_years`; test `tests/test_run_all.py`, `tests/test_news_east.py`, `tests/test_scrapers.py`.

**Interface:** retain `write_interim_scoped(name, rows, years)`. Dedupe exact observations with normalized school, state, city, event, year, source URL. Event counts are deduplicated later by resolved school identity and event-year; multiple corroborating URLs survive.

- [ ] Convert the audit's two-state Lincoln reproduction into a failing test expecting both records.
- [ ] Add same-name/two-city and two-URL corroboration cases. Verify the final event count remains one when two sources support one school's appearance.
- [ ] Replace weaker dedupe keys in the runner and source helpers; do not fold unresolved identities merely to reduce row count.
- [ ] Run the current dataset through the new logic in staging and inspect newly retained rows and source URLs.

```python
def test_interim_retains_different_states(tmp_path, monkeypatch):
    from scrapers import common
    from scripts import run_all
    import csv
    monkeypatch.setattr(common, "INTERIM_DIR", tmp_path)
    monkeypatch.setattr(run_all, "INTERIM_DIR", tmp_path)
    rows = [common.Row("Lincoln High School", state=st, event="Rose", year=2026,
                       source_url=f"https://example.org/{st}") for st in ("TX", "CA")]
    run_all.write_interim_scoped("probe", rows, {2026})
    with (tmp_path / "probe.csv").open() as f:
        assert {r["state"] for r in csv.DictReader(f)} == {"TX", "CA"}
```

**Acceptance:** different school identities never disappear because they share a name; all supporting URLs remain traceable.

## Task 3 — Make refreshes fresh and non-destructive

Addresses A03, A04 and archive cache failure in A11.

**Files:** modify `scrapers/common.py`, `scrapers/boa.py`, `scrapers/heb.py`, `scrapers/hollywood.py`, `scrapers/wikipedia_rose.py`, `scrapers/philly.py`, `scrapers/cached_only.py`, `scripts/run_all.py`; create `tests/test_refresh.py`; update `tests/test_run_all.py`.

**Interface:** define `SourceResult` in `scrapers/common.py` with `rows: list[Row]`, `complete_years: set[int]`, `failures: dict[str, str]`. Source fetches accept `refresh: bool = False`; stable discovery indexes and requested-year pages receive a freshness requirement. Cached historical pages remain reusable. Keep a source's previous rows for every unverified year.

- [ ] Test BOA archive failure, one failed recap, H-E-B all-pages failure, a genuinely empty published lineup, and a parser returning empty after a markup change.
- [ ] Test that a cached index is fetched again in refresh mode and that a normal offline parse can still use cached content.
- [ ] Implement explicit completeness reporting. Missing evidence is not a confirmed empty lineup. Return incomplete status with source/year explanations rather than treating `[]` as success.
- [ ] Replace rows only for complete partitions; stage cache and data writes, using temporary files plus atomic replacement for individual files.
- [ ] Remove fixed end-year assumptions from BOA/other discovery defaults and explicitly report unsupported Hollywood categories.
- [ ] Prove the blocked-refresh case preserves byte-identical prior files and produces an actionable incomplete result.

Behavioral contract:

```python
from dataclasses import dataclass, field
from scrapers.common import Row

@dataclass
class SourceResult:
    rows: list[Row] = field(default_factory=list)
    complete_years: set[int] = field(default_factory=set)
    failures: dict[str, str] = field(default_factory=dict)
```

**Verification:** run `tests/test_refresh.py`, parser tests and merge tests offline with patched network responses. Only after these pass should a small allowed live source refresh be considered; a live all-source refresh is not the test harness.

## Task 4 — Protect credentials and apply crawl policy consistently

Addresses A05 and A11.

**Files:** modify `scrapers/serpapi.py`, `scrapers/common.py`, `scripts/enrich.py:_nces_file`, `scripts/qa.py:check_dead_urls`; create `tests/test_serpapi.py`, `tests/test_common.py`.

**Interfaces:** `safe_error(exc: Exception) -> str` emits an allowlisted error category/status, never request query strings or arbitrary response bodies. `fetch()` retains its caller contract but validates each redirect destination and treats temporarily unavailable robots policy as blocked. Archive downloads validate/rename only on success.

- [ ] Add the dummy-key exception test before changing handling; inspect exception chaining and persisted blocked metadata as well as the top-level message.
- [ ] Replace raw exception/body interpolation with sanitized messages. Do not log keys, account endpoints with query strings or untrusted payload excerpts.
- [ ] Cover 404 robots absence, 503 robots unavailability, connection failure, a disallowed redirect target and per-host throttling.
- [ ] Document the narrow API, archive-download and reachability-probe exceptions instead of accidentally bypassing the policy.
- [ ] Test an interrupted ZIP download leaves no final cache artifact and a subsequent attempt succeeds.

```python
def test_api_error_does_not_expose_key(monkeypatch, tmp_path):
    import requests
    from scrapers import serpapi
    from scrapers.common import BlockedSource
    import pytest
    key = "AUDIT_SYNTHETIC_KEY_NOT_REAL"
    monkeypatch.setenv("SERPAPI_KEY", key)
    monkeypatch.setattr(serpapi, "CACHE_DIR", tmp_path)
    monkeypatch.setattr(serpapi, "_throttle", lambda host: None)
    def fail(*args, **kwargs):
        raise requests.ConnectionError("https://serpapi.com/search.json?api_key=" + key)
    monkeypatch.setattr(serpapi.requests, "get", fail)
    with pytest.raises(BlockedSource) as caught:
        serpapi.search("google", "unique test")
    assert key not in str(caught.value)
```

**Acceptance:** dummy keys cannot reach public messages, tracebacks intended for publication, caches, or blocked metadata. No real credential is needed to test this.

## Task 5 — Verify contact ownership and existing school matches

Addresses A02, A07 and school-specific provenance in A13.

**Files:** modify `scripts/enrich.py`, `scripts/search_fallback.py`, `scripts/qa.py`; extend `tests/test_enrich.py`, `tests/test_search_fallback.py`, `tests/test_qa.py`; create `data/interim/field_evidence.csv` and a small evidence helper in `scripts/evidence.py`.

**Interface:** evidence columns: `school_key, field, value, source_url, source_kind, source_record_id, source_vintage, verified_at, status, reason`. Accepted statuses: `verified`, `unresolved`, `rejected`. A contact must belong to the same staff record and verified school. NCES IDs are preserved with the 2023–24 source vintage. No extra parser library is assumed.

- [ ] Add the adjacent plain-text theatre/band contact case and require either the correctly bound band email or a blank unresolved result; never the theatre email.
- [ ] Test two different districts under `k12.tx.us`, two schools on shared hosting, and a district-wide arts page containing several schools.
- [ ] Track whether the input city actually narrowed the NCES pool. Downgrade every unresolved tie, including ties with a non-matching city string.
- [ ] Validate populated NCES fields against identity evidence, not only empty fields. Document a correction for Pulaski with both conflicting and accepted NCES IDs.
- [ ] Review the other five district recheck exceptions without automatic replacement. Recheck district IDs across all enriched rows; audit membership totals against the official membership file before certifying enrollment.
- [ ] Reject/quarantine the Woodlands district-role email through the extraction/evidence rule. Retain Cedar Park's explicitly attributed email. Source spelling changes require independent evidence.
- [ ] Review all six booster strings and all 41 band URLs for school scope. Replace unrelated district/news links only when a verified school-specific source exists.

```python
def test_unmatched_city_does_not_resolve_a_tie():
    import pandas as pd
    from scripts.enrich import match_nces, MATCH_THRESHOLD
    nces = pd.DataFrame([
        dict(ncessch=str(i), sch_name="Lincoln High School", key="lincoln",
             state="TX", city=city, city_key=city.lower(), level="High")
        for i, city in enumerate(("Austin", "Dallas"))
    ])
    _, ratio, _ = match_nces(
        {"school": "Lincoln High School", "state": "TX", "city": "Unmatched city"}, nces)
    assert ratio < MATCH_THRESHOLD
```

**Acceptance:** contact role/email/school binding and all reviewed identities are evidenced; uncertain fields remain blank and explicitly queued.

## Task 6 — Separate event facts from scoring assumptions

Addresses A08, A09 and guessed H-E-B geography in A13.

**Files:** modify `scrapers/news_east.py`, `scrapers/heb.py`, `scripts/run_all.py`, `scripts/score.py`, `scripts/export.py`; extend source/score tests and create `tests/test_export.py`; add `data/interim/event_evidence.csv`.

**Interface:** event evidence includes `school_key, event, event_year, event_date, evidence_type, participation_status, source_url, verified_at`. Types: `parade`, `competition`; statuses: `announced`, `completed`, `unknown`. Do not change the public CSV schema until the display names and score meaning have been agreed; use the evidence sidecar to prepare the migration.

- [ ] Add a Biloxi fixture asserting that a January 2018 announcement cannot produce 2017 participation merely from its publication date.
- [ ] Remove the blanket first-quarter year subtraction. Headline-only records with no supported event year remain unresolved; retain article evidence for the reviewed Biloxi correction.
- [ ] Do not infer Houston/TX from the event venue. Resolve participant locations using school evidence.
- [ ] Make reporting distinguish competition participation, announced invitations and completed parades. “Selected” must not become “has marched.”
- [ ] Show Connor a small comparison of current and corrected score components for Carmel, Biloxi and a future-only school. Decide the recency window and how announcements contribute before changing rank semantics.
- [ ] Count unique school identities in the summary's Schools column; separately report event-year appearances.

```python
def test_publication_date_does_not_establish_parade_year():
    import datetime as dt
    from scrapers.news_east import headline_row
    got = headline_row("Biloxi High band to march in America's oldest Thanksgiving Day parade",
                       "https://example.org/announcement", dt.datetime(2018, 1, 30))
    assert got is None or got[0].year != 2017
```

**Acceptance:** no unsupported past participation is created; reporting labels match the evidence; any score changes have a clear before/after explanation and documented configuration.

## Task 7 — Publish consistent, spreadsheet-safe outputs with complete diffs

Addresses A10 and A12.

**Files:** modify `scripts/run_all.py`, `scripts/export.py`, `scripts/score.py`, `scripts/search_fallback.py`, `Makefile`; extend `tests/test_refresh.py`, `tests/test_export.py`.

**Interfaces:** staged publication produces prospects, Tier A, East Coast, workbook and summary from one validated snapshot. A manifest records input/config hashes, run status and output counts. Keep a previous successful snapshot for rollback. Partial runs must not masquerade as completed publication.

- [ ] Test added, updated, removed and retained-due-to-source-failure rows in the diff, including identity/location corrections.
- [ ] Ensure interrupted scoring/export cannot leave a published mix of old/new artifacts; validate staging before the final publication boundary.
- [ ] Make search/refresh return a non-success or explicit incomplete status when required work fails.
- [ ] Serialize XLSX text as text and apply a documented safe CSV policy at the spreadsheet-export boundary.
- [ ] Compare full worksheet values to the source CSV and filters, not just row counts. Assert freeze panes, column order, numeric types, source links and absence of executable source text.

```python
def test_source_text_is_not_a_formula():
    from openpyxl import Workbook
    from scripts.export import _write_sheet
    wb = Workbook()
    _write_sheet(wb.active, [{"school": "=1+1"}])
    assert wb.active["C2"].data_type == "s"
    assert wb.active["C2"].value == "=1+1"
```

**Acceptance:** every published artifact has one snapshot identity; deletions and incomplete runs are visible; malicious-looking source strings remain inert.

## Task 8 — Make eligibility, suppression and documentation match the deliverable

Addresses A13/A14 and the remaining manual audit items.

**Files:** modify `scrapers/exclusions.py`, `scripts/qa.py`, `scripts/export.py`, `README.md`, `CLAUDE.md`, `docs/HANDOFF.md`, `docs/CODEX_HANDOFF.md`, `docs/TROEN_QUESTIONS.md`; extend `tests/test_normalize.py`, `tests/test_qa.py`, `tests/test_export.py`; create `data/interim/suppression.csv` only when the first documented suppression is supplied.

**Interface:** suppression is keyed by verified school identity with reason/effective date. It filters outreach-ready exports while preserving raw discovery/evidence. An empty list is explicitly reported as none supplied, not as proof of no restrictions.

- [ ] Review the district-level Alhambra entry and all 188 excluded observations against evidence; keep cheer-only and combined groups out under the existing policy. Do not strip a school name and accidentally erase its group classification.
- [ ] Add fixtures for false-positive/false-negative exclusions, ambiguous junior-high names and combined groups. Preserve the existing Martin Luther King Jr. exception without excluding legitimate junior high schools.
- [ ] Obtain the suppression inputs from Connor when there are any; test a synthetic suppressed school remains in research data and never appears in outreach-ready outputs after rebuild.
- [ ] Finish field-level verification of the 15-row sample and broader fuzzy matches, including membership totals and live band/booster ownership. Report unresolved fields explicitly.
- [ ] Update stale counts, schema, PR status and workflow descriptions. Keep contact readiness distinct from Tier A ranking.
- [ ] Prepare corrected packet copy for review after the data is validated; regenerate the actual client packet only when requested.

**Acceptance:** the working docs and exports say only what is implemented and verified. No promise of automatic scheduling, verified contacts or suppression exists without corresponding evidence.

## Task 9 — Validate a controlled refresh before enabling scheduling

Depends on Tasks 1–8. Addresses operational gaps without prematurely activating automation.

**Files:** modify `workflows/refresh.yml`, `README.md`; create `.github/workflows/refresh.yml` only at activation; use `tests/test_refresh.py`.

- [ ] Run tests from a fresh environment with the currently pinned approved dependencies; report installation failures without silently adding libraries.
- [ ] Perform a staged refresh of one reachable allowed source, compare evidence and counts, then exercise rollback.
- [ ] Revisit blocked sources with bounded, policy-compliant requests; distinguish unavailable, robots-disallowed, no lineup and parser mismatch. Save reviewed fixtures for each source actually supported.
- [ ] Decide with Connor whether maintenance will run in GitHub Actions or the existing cloud routine. Verify that routine's status before assuming it exists.
- [ ] Configure secrets privately only if supplied/authorized; set a per-run search budget. No live key values belong in YAML or logs.
- [ ] On activation, run tests → staged refresh → QA → scoring/export → diff → draft PR. Fail visibly on incomplete runs and avoid duplicate scheduling across systems.

**Acceptance:** one successful controlled run and one failure/rollback drill precede unattended operation; scheduling has one verified owner and destination.

## Task 10 — Define and pilot the Carnegie Hall list

This is a separate next increment, not part of the repair implementation. Reuse only the components validated above.

**Files:** proposed new `docs/CARNEGIE_SPEC.md`, `scrapers/carnegie.py`, `tests/test_carnegie.py`, `data/final/carnegie_prospects.csv`; extend scoring/export through a named profile after the schema is agreed. Preserve `data/final/prospects.csv` as the parade list.

- [ ] Confirm producer/program, March 3 and March 31 2027 dates, whether both dates accept middle schools, band/orchestra scope, ensemble sizes, audition/ratings requirements, geography and outreach deadline.
- [ ] Separate demonstrated fit from interest and availability. A previous Carnegie performance or Superior rating does not prove a school wants this offer or is available.
- [ ] Agree `ensemble_type` and `signal` fields plus source/status evidence; keep choirs out unless explicitly included.
- [ ] Review a ten-school example with sourced band/orchestra signals and known gaps before broad collection.
- [ ] Probe one prior-performer or state-assessment source with the existing fetch rules, create one real-page fixture and parser, and score/export the pilot with the agreed profile.
- [ ] Expand source by source only after the pilot demonstrates useful prospect selection. Do not spend search quota or add PDF dependencies without the already-required authorization.

**Acceptance:** a separate pilot file and Carnegie worksheet; every record has a source and qualifying signal, contact attribution meets the repaired standard, and unknown dates/interest remain unknown. The ten-school target is a proposed review size, not a promised yield.

## Completion gates and working sequence

| Gate | Required evidence |
|---|---|
| Safe rebuild | Tasks 1–2: resolved identities and corroborating sources survive twice |
| Safe refresh | Tasks 3–4: fresh pages, preserved failed partitions, sanitized errors |
| Trustworthy data | Tasks 5–6: correct school/role/year and honest participation labels |
| Reviewable delivery | Tasks 7–8: reconciled outputs, suppression behavior, accurate docs |
| Maintenance | Task 9: controlled success and failure runs; verified scheduling |
| Expansion | Task 10: approved offer specification and sourced pilot |

Default execution recommendation: work inline, task by task, with a concise checkpoint after each independent increment. Delegated execution is available if Connor wants parallel agent work. No commits are planned without an explicit request.

## Plan coverage and handoff

All A01–A14 findings map to tasks above. The first repair does not depend on answers about Carnegie Hall, so it can proceed when implementation is requested. Current blockers are source verification and product definitions for later tasks, not an inability to begin the existing pipeline repairs. Tests must verify the stated behavior; passing the original 59 tests alone is insufficient.
