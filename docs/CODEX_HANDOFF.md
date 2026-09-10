# Handoff to Codex — parade-prospects

Written 2026-09-10 at the end of the Claude Code sessions. Everything below is
verifiable from the repo at `main`. Read this, then `CLAUDE.md` (rules, schema,
source table), then `docs/HANDOFF.md` (the long-form project handoff) and
`docs/SCRAPING_HURDLES.md` (every blocked source, every refused pick, why).

Two goals for the next agent:

1. **A full repo audit** (section 4).
2. **A second prospect list: high school and middle school bands *and orchestras*
   that want to be adjudicated at Carnegie Hall on 3 March 2027 or 31 March 2027**
   (section 5).

## 1. Ground rules that do not change

From the client playbook, enforced in `CLAUDE.md` and the tests:

- Never invent, infer or pattern-guess contact details. Blank is correct. A
  director email is recorded only when it is printed on the school, district or
  booster site *and* labelled band director there, and the page is added to
  `source_urls`.
- Every row carries at least one `source_url`.
- Respect robots.txt and 1 request/second per host; cache everything under
  `data/raw/`; at most 20 pages per school site. Public data only: no inboxes,
  CRMs or paid directories.
- If a source is blocked or unclear, stop and say so; never guess. Blocked
  sources go in `data/interim/_blocked.json` and `docs/SCRAPING_HURDLES.md`.
- Ask before adding a dependency or credential. Approved: requests,
  beautifulsoup4, pandas, lxml, openpyxl, pytest. `pypdf` was asked for and not
  yet approved (it would unlock BOA regional results).
- Never hand-edit `data/final/prospects.csv`. Change a scraper, the merge, or a
  QA rule and re-run, so `source_urls` and `notes` stay truthful.
- The only credential is `SERPAPI_KEY`, an environment variable. It is never
  written to disk. **Quota: free plan, 250 searches/month, 80 left as of
  2026-09-10 23:00 UTC, resets 2026-10-10.** Every search made so far is cached
  and committed under `data/raw/serpapi.com/`, so re-runs cost nothing;
  `scrapers/serpapi.py: ensure_quota()` refuses to start a pull it cannot finish.
- Model identifiers never go into commits, PR text or code.

## 2. State of the repo at handoff

All work is merged to `main` except PR #7 (draft, mergeable, clean), which
carries the last QA pass and this file. PRs, in order: #1 phases 0–5 and the
East Coast list; #2 SerpAPI news pull; #3 repo cleanup; #4 search fallback for
school websites; #5 client packet (`docs/packet/`) and docs; #6 QA of NCES
prefix matches; #7 remaining QA checks. Branch `claude/test-kubold` is the
working branch and equals `main` plus PR #7.

Numbers on `main` + PR #7:

| | |
|---|---|
| Prospects (`data/final/prospects.csv`) | 206 schools; Tier A 50 / B 100 / C 56 |
| Excluded groups (`data/interim/excluded.csv`) | 188 |
| East Coast sheet (`data/final/east_coast.csv`) | 52 rows (ME–FL plus DC, VT, WV; stateless rows whose only parade is an East Coast one) |
| Rows with a state | 169 (37 stateless: Hollywood and news headlines give no location) |
| NCES district + enrollment | 133 |
| school_url / band_url | 125 / 41 |
| Director names / emails | 5 / 2 (the strict rule; see `TROEN_QUESTIONS.md` Q15–16) |
| Tests | 59 pass, 4 skip (skips wait for hand-saved pages from blocked sources) |
| Code | ~3,800 lines across `scrapers/`, `scripts/`, `tests/` |

Pipeline (see `docs/HANDOFF.md` §8 for the full run book):

```
make venv && make test
make scrape                                    # discovery → data/interim/*.csv → merge
python scripts/enrich.py --all|--limit N|--no-crawl|--new-only   # NCES + school-site crawl
python scripts/search_fallback.py              # SerpAPI: websites (and state) NCES lacked
python scripts/qa.py [--fix] [--network]       # QA checks; exit 1 on findings
make score && make export                      # tiers, xlsx, SUMMARY.md, east_coast.csv
make refresh                                   # current + next parade year only; CHANGELOG entry
```

`data/final/CHANGELOG.md` has a dated entry for every data change.

## 3. Open findings the last session left on purpose (owner decisions)

Reported by `scripts/qa.py`, not changed:

1. **Bellefontaine High School and Defiance High School are listed as DE.**
   Wikipedia's 2018 Philadelphia lineup wrote "(Delaware)"; NCES has exactly one
   school of each name, both in Ohio, and Wikipedia's own 2014 entry says
   "Bellefontaine, OH". Correcting them means overriding the cited source, so
   the rows keep DE with the evidence in `docs/SCRAPING_HURDLES.md`. If the owner
   agrees, the right fix is a documented correction applied at merge time (not a
   CSV edit) with both sources in `notes`.
2. **Stateless "Westlake High School" (Rose 2024)** could be the Texas or Utah
   Westlake, or a third. It stays separate.
3. **Dead URLs (report only, from the cloud container's datacenter IP):** 29 of
   193 distinct URLs did not return 200. Nine are real 404s from stale NCES
   websites (Lindbergh, Woodland GA, Jackson Memorial, Londonderry, Lenape,
   Pearland, Pocono Mountain East, Wando, Twin Lakes) and one NCES value is
   malformed (`http://#www.bentonvillek12.org#`). The rest (403/429/409/503,
   SSL and connection errors) are probably the IP and should be re-checked from
   a laptop before anything is changed.
4. **20 school sites block the crawler** from the cloud IP (`site crawl blocked`
   in `notes`). A headless-browser fetch (Playwright is preinstalled in the
   cloud env) or a run from a laptop would recover them.
5. **Four parade sources are blocked from the cloud IP** (Macy's, the Macy's
   fan wiki, Chicago, Tournament of Roses). Parsers exist. `make scrape` from a
   laptop, or saving the pages into the paths it prints, likely adds 100+
   schools. This is still the single biggest data gain available.

## 4. Goal 1: full repo audit

What a reviewer should verify, in the order that finds the most:

**Correctness of the data (most important)**
- Take 15 random rows of `prospects.csv` and check every populated field against
  its `source_urls`. The last spot-check (10 rows, after Phase 1) passed; no one
  has spot-checked enrichment or the search-fallback fills end to end.
- Re-verify the 9 knowledge-panel state placements and the 3 organic website
  picks made by `scripts/search_fallback.py` (rows whose `notes` contain
  `search:`). The rules are strict, but they were written and run in one day.
- Re-check all `nces: matched '...' (0.9x)` fuzzy matches below 1.0 the way
  `qa.py --check nces-prefix` checks the 0.92 ones: is the NCES school the same
  school? Watch for renamed schools (Robert E. Lee, Midland TX is now Legacy HS
  and NCES has no old record).
- `booster_org` values: the extraction pattern was tightened once; look at all
  seven and decide whether the field earns its column.
- `city` sometimes carries a nickname or the school name (from Rose and Hollywood
  listings). `docs/SCRAPING_HURDLES.md` lists the known cases.

**Rules and guardrails**
- Read `scrapers/exclusions.py` against `data/interim/excluded.csv`: are all 188
  exclusions right, and is anything in `prospects.csv` that should be out? The
  last pass removed eight Hollywood dance/cheer units; there may be more
  categories (color-guard-only units, "Attachment" units).
- Confirm no email in `prospects.csv` lacks a "band director" label on its
  source page (`scripts/enrich.py: _extract_contacts`, tests in
  `tests/test_enrich.py`).
- Confirm nothing under `data/` or `tests/fixtures/` contains the SerpAPI key
  (`grep -r "$SERPAPI_KEY" .` should print nothing).
- robots.txt: `scrapers/common.py: fetch()` checks it for every crawl. The two
  SerpAPI-backed modules go around `fetch()` on purpose (owner decision recorded
  in `CLAUDE.md` and in the module docstrings); confirm that is still the
  owner's position.

**Code quality**
- `scripts/enrich.py` and `scripts/search_fallback.py` both carry a copy of
  `_note()` / `_add_source()`; `scripts/qa.py` has a third. Fold into one helper.
- `scripts/search_fallback.py: REJECT_HOSTS` is a long regex grown by example;
  turn it into a list with a comment per entry, and add tests for the entries
  that were added after a real false positive (dictionary.cambridge.org,
  gadsdentimes.com, carrolldragonfb.com).
- `scripts/run_all.py: merge()` and `carry_over()` are the heart of the
  pipeline and have the fewest tests per line. Property-style tests over
  `tests/test_run_all.py` fixtures would pay off before any refresh runs.
- `scrapers/cached_only.py` (Macy's, Rose, Chicago, July 4th) has unit tests but
  no real-page fixture; it has never parsed a real page. When the blocked pages
  are saved, add trimmed fixtures.
- `workflows/refresh.yml` is not under `.github/workflows/` (the Claude GitHub
  App cannot push workflow files). Copy it there from a normal git client and
  run it once by hand before 15 October, the first scheduled refresh.
- `Makefile` has no target for `search_fallback.py` or `qa.py`; add them and a
  `make check` that runs tests + `qa.py` in report mode.

**Docs**
- `docs/HANDOFF.md` §4 numbers predate the search fallback and the QA passes
  (it still says 76 websites, 208/214 schools in places). Reconcile with
  `data/final/SUMMARY.md` and `CHANGELOG.md`.
- `README.md` describes the pipeline but not `search_fallback.py` or `qa.py`.

## 5. Goal 2: Carnegie Hall adjudication prospects (3 Mar 2027 and 31 Mar 2027)

**What the client needs.** High school and middle school **bands and orchestras**
(concert ensembles, not marching units) that would travel to New York to perform
and be adjudicated (judged, with ratings and clinician feedback) at Carnegie Hall
on one of two dates: **Tuesday 3 March 2027** or **Wednesday 31 March 2027**.
This is a different audience from the parade list: concert programs that already
seek ratings, not programs that march.

**Reuse, don't rebuild.** The pipeline pieces carry over unchanged: `fetch()`
with robots/throttle/cache, `Row`, the merge and dedupe in `run_all.py`, NCES
enrichment, the school-site crawl, the search fallback, `qa.py`, scoring and
export. What changes is the discovery sources, two schema additions, and the
scoring weights. Keep the parade pipeline intact; build the new list as a
separate final file (`data/final/carnegie_prospects.csv`, sheet "Carnegie") or
as a second `list` value, not by mixing it into `prospects.csv`.

**Schema additions (agree with the owner first):**
- `ensemble_type`: `band` / `orchestra` / `both` / `choir`? (choirs are out of
  scope unless the owner says otherwise).
- `signal`: what puts the school on the list, e.g. `state-assessment:
  Superior 2026`, `festival: Carnegie Hall 2024`, `festival: Music for All
  National Concert 2025`, `news: ...`. Same `"; "`-joined style as `parades`.
- Everything else (school, city, state, level, district, enrollment, urls,
  director fields, source_urls, score, tier, notes) is the same 20-column
  schema.

**Discovery sources, in order of expected yield.** Each is one module in
`scrapers/` exposing `parse(html, url, ...)` (pure, tested on a trimmed
fixture) and `scrape()`, plus a row in the `CLAUDE.md` source table and a
`docs/SCRAPING_HURDLES.md` entry if it is blocked. Probe reachability from the
cloud IP first (many state sites block it) and record the result.

1. **Prior Carnegie Hall school performers (the warmest signal).** Schools that
   have already played Carnegie Hall through a festival producer travel for
   adjudication by definition. Public sources: the producers' own "past
   performers" or program pages (WorldStrides / Heritage Performance "National
   Festival of Bands and Orchestras" style events, Manhattan Concert
   Productions, Music Celebrations International, National Band and Orchestra
   Festival), Carnegie Hall's public event calendar and archive
   (carnegiehall.org has a searchable performance history), and local news
   headlines ("Lincoln High School wind ensemble to perform at Carnegie Hall")
   via the existing SerpAPI `google_news` route (`scrapers/news_east.py` is the
   template: headline must name a High/Middle School *and* Carnegie Hall).
   Check robots.txt and terms for each producer site; if a producer publishes
   nothing public, say so, do not scrape a login area.
2. **State music education association assessment results** (the playbook's
   "state band director associations" item, never built). Many state MEAs
   publish concert band and orchestra assessment (MPA / LGPE / festival) results
   with ratings by school. Start with the client's drive/fly markets and the
   Northeast for a New York date: FL (FBA and FOA), GA (GMEA LGPE), NC (NCBA /
   NCMEA), SC (SCBDA), VA (VBODA), PA (PMEA), NJ (NJMEA), NY (NYSSMA Majors), TX
   (UIL Concert & Sight-reading, public results), OH (OMEA), TN (TBA / TMEA),
   AL (ABA MPA). Signal: a Superior / Excellent / Division I rating in 2024–2026.
   **Never scrape member directories or director contact lists on these sites;
   results pages only.**
3. **National concert festival participants** with public lists: Music for All
   National Concert Band Festival and Orchestra America National Festival
   (marching.musicforall.org's sibling site, check robots), Midwest Clinic
   performing ensembles (past programs are public), the Festival Disney /
   WorldStrides OnStage honor ensembles if published.
4. **Schools already in `prospects.csv` that also run concert programs.** Every
   BOA Grand National finalist and most Rose/Macy's bands have a strong wind
   ensemble; the crawl already knows their band pages. A cheap first pass:
   re-crawl the 41 known `band_url` pages for "wind ensemble", "symphony
   orchestra", "Carnegie", "state festival", "superior rating" and record what is
   printed. These also inherit contacts already found.
5. **Orchestras specifically.** Bands dominate every source above. For
   orchestras: state orchestra assessment results (FOA, VBODA, NYSSMA, TMEA/UIL
   full orchestra), ASTA National Orchestra Festival participants (public
   program), and news headlines with "orchestra" + "Carnegie Hall".

**Scoring for this list** (new `WEIGHTS`/`GEOGRAPHY` in a `score.py` profile,
keep the parade profile as is):
- Prior Carnegie Hall or national festival appearance: highest.
- Superior rating in the last two assessment cycles: high; two consecutive years
  higher.
- Travel evidence (any parade or national festival trip): medium.
- Geography for a New York date: Northeast and Mid-Atlantic drive markets
  first, then the Southeast fly markets the client already sells, then the rest.
- Enrollment as a soft floor (a 40-piece middle school orchestra may still fit;
  ask the owner for the minimum ensemble size the venue slots require).
- Two dates: 3 March falls in many districts' testing or spring-break blackout
  windows; 31 March collides with others' spring break. Record each state's
  typical spring-break window (public district calendars) so the sheet can say
  which date is plausible per school. Do not infer a school's availability.

**Questions for the owner before building** (add to `docs/TROEN_QUESTIONS.md`):
which producer or program Troen is partnering with (that decides whether the
producer's past-performer list is fair game and whether choirs count); minimum
and maximum ensemble size per slot; whether middle school ensembles are wanted
on both dates; whether a Superior rating is a requirement or a signal; the
outreach deadline (school boards approve spring trips 9–12 months ahead, so a
March 2027 date means outreach by spring 2026 was ideal and by autumn 2026 is
the last window).

**Definition of done for goal 2:** a `carnegie_prospects.csv` and xlsx sheet
with every row carrying a `signal` and a `source_url`; a source table row and
hurdle entry per source tried; tests with fixtures per parser; a CHANGELOG
entry; contacts only under the existing rule; a Tier A list the owner can act
on for the autumn 2026 outreach window.

## 6. Practical notes

- **Environment.** Cloud sessions run behind a datacenter IP that several
  school and parade sites block; a laptop run is the workaround. The NCES zips
  (~220 MB) download on the first `enrich`; `data/raw/serpapi.com/` is the only
  tracked cache.
- **Two dates in `CLAUDE.md` matter for the refresh:** Macy's announces the next
  year's bands in early October; the workflow (once enabled) refreshes on 15
  October and 15 November and opens a draft PR.
- **Client-facing packet** lives in `docs/packet/` (brief, deck, overview,
  Veterans Day sales sheet). Do not regenerate it without the owner.
- **Conventions.** One commit per logical step; never include a model name in a
  commit; docs updated in the same PR as the code; every new source gets a
  fixture, a source-table row and a hurdle entry.
