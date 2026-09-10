# Parade Prospects — project handoff

Written 2026-09-10 for whoever picks this up next (human or agent). Read this,
then `CLAUDE.md`, then `docs/SCRAPING_HURDLES.md`. Everything below is verifiable
from the repo; nothing here is aspirational.

## 1. What the project is

A Python pipeline that builds and maintains a prospect list of **US high school
marching bands that travel to major holiday parades**, for Troen Student
Performance Events. First commercial target: a Veterans Day parade opportunity
with Universal Orlando; later, a general "parades" offering on Troen's site.

The spec is the client's playbook (PDF, five phases, each phase one prompt). It
was executed in order with one commit per phase. All of it is merged to `main`:
PR #1 (phases 0–5 and the East Coast list), PR #2 (SerpAPI news pull), PR #3
(repo cleanup). https://github.com/cmurphy1140/band-charter-outreach/pulls?q=is%3Apr

Non-negotiable rules from the playbook (also in `CLAUDE.md`):

- **Never invent, infer, or pattern-guess contact details.** Blank is correct.
- **Every row carries at least one `source_url`.**
- Respect robots.txt, 1 request/sec per host, cache everything, max 20 pages per
  school site.
- Public data only. No email, inbox, CRM, or paid-directory scraping.
- Exclude colleges, drum corps, honor/all-star/all-district bands, military,
  community bands, and non-US groups (kept in `data/interim/excluded.csv`).
- Ask before adding dependencies or credentials.
- If a source is blocked or unclear, **stop and report rather than guess**.

## 2. Repository layout

```
CLAUDE.md                  conventions, schema, guardrails, source status, phase status
README.md                  overview + quickstart + pipeline description
Makefile                   venv | scrape | enrich | score | export | all | test | refresh
requirements.txt           requests, beautifulsoup4, pandas, lxml, openpyxl, pytest (pinned)
pyproject.toml             project metadata; pytest config (pythonpath=".")
scrapers/
  common.py                fetch() with robots.txt + throttle + on-disk cache; Row dataclass;
                           BlockedSource; write_interim(); blocked-source registry (_blocked.json)
  normalize.py             state codes, split_city_state(), normalize_school() (dedupe key),
                           clean_school() (display), school_from_band_name()
  exclusions.py            exclusion_reason() — regex rule sets, ordered
  wikipedia_rose.py        Rose Parade lineups 2015–2027 from Wikipedia (live)
  philly.py                Philadelphia from Wikipedia 6abc table (live) + cached 6abc page parser
  hollywood.py             Hollywood Christmas Parade per-year category pages 2018–2026 (live)
  heb.py                   H-E-B Houston from houstontx.gov performer pages, 2025+ (live)
  boa.py                   BOA results archive; Grand National finalists from HTML (live)
  cached_only.py           Macy's, Tournament of Roses, Chicago, July 4th — parse saved pages only
scripts/
  run_all.py               run scrapers → interim CSVs → merge → data/final/prospects.csv
                           flags: --years 2026,2027 | --merge-only | --refresh
  enrich.py                NCES CCD + school-site crawl; --limit N (default 100) | --all | --no-crawl
  score.py                 0–100 score, tiers A/B/C, tier_a.csv; WEIGHTS/GEOGRAPHY dicts at top
  export.py                prospects.xlsx (Tier A / Tier B / All) + SUMMARY.md; --gsheet SA.json
data/
  raw/                     gitignored cache: data/raw/<host>/<sha1(url)>.html + .meta.json;
                           data/raw/nces/*.zip and enrollment_totals.csv
  interim/                 one CSV per source (tracked), excluded.csv, _blocked.json
  final/                   prospects.csv, tier_a.csv, prospects.xlsx, SUMMARY.md, CHANGELOG.md
tests/                     pytest; fixtures are trimmed cached pages (offline)
workflows/refresh.yml      GitHub Actions cron (15 Mar/Oct/Nov) — see §7 for why it is not in .github/
docs/
  SCRAPING_HURDLES.md      every blocked/partial source, effect, and what unblocks it
  TROEN_QUESTIONS.md       client questions grouped by what each answer changes
  HANDOFF.md               this file
```

Code size: about 2,300 lines across scrapers, scripts, and tests. 30 tests pass,
4 skip (they wait for manually saved pages from blocked sources).

## 3. Data model

`data/final/prospects.csv` has exactly these 20 columns, in this order
(`scrapers/common.py: COLUMNS`):

```
school, band_name, city, state, district, enrollment, parades, parades_marched,
last_appearance, boa_finalist_years, school_url, band_url, director_name,
director_email, director_phone, booster_org, source_urls, score, tier, notes
```

- `parades` is `"; "`-joined tags like `Rose 2027; BOA Grand National Finalist 2025`,
  sorted by year desc. `parades_marched` = count of distinct (event, year).
- `source_urls` is `"; "`-joined; every discovery source URL plus any page a
  contact or band URL came from.
- `notes` is `"; "`-joined free text used as a machine-readable trail:
  `state unknown: source lists no location`, `nces: matched 'X' (0.92)`,
  `nces: low-confidence match 'X, City' (0.75); other candidates: …`,
  `nces: no match`, `no website in NCES`, `site crawl blocked: …`,
  `no band page found in N pages crawled`, `social: <url>`.

Interim CSVs (`data/interim/<source>.csv`) use
`school, band_name, city, state, event, year, source_url`.

Dedupe key is `(normalize_school(school), state)`. A stateless row (Hollywood
gives no location) folds into a stated row only when exactly one stated row has
the same normalized name; otherwise it stays separate with the "state unknown"
note. Enrichment/score columns are carried over on every rebuild
(`run_all.carry_over`), so re-running `make scrape` never wipes Phase 2–3 work.

## 4. What each phase produced (current numbers)

| Phase | Output | Numbers |
|---|---|---|
| 1 Discovery | 214 schools in `prospects.csv` (208 before the news pull); 180 excluded groups | Rose 99, BOA GN finalists 84, Philadelphia 75+, Hollywood 41, H-E-B 6, news headlines 15 appearances. By state: TX 30, IN 21, CA 14, OH 12, GA 12, AL 8, FL 7 …; 41 with no state |
| 2 Enrichment (all rows) | district, enrollment, school_url, band_url, contacts | 133 with district + enrollment (3 low-confidence noted, 31 no NCES match, 41 skipped for missing state); 76 with a school website, 60 noted "no website in NCES"; 22 band pages, 20 school-site crawls blocked; 5 booster orgs; 3 director names; 1 director email |
| 3 Scoring | score + tier on every row; `tier_a.csv` | A = 50, B = 100, C = 64. Top: Dobyns-Bennett TN 95; Blue Springs MO, Broken Arrow OK, Carmel IN, William Mason OH at 85; Marcus TX (Macy's 2027) enters the top 10 at 9 |
| 4 Exports | `prospects.xlsx` (Tier A / Tier B / East Coast / All), `SUMMARY.md`, `east_coast.csv` | frozen header, autofilter, parades one per line |
| 5 Refresh | `make refresh`, `CHANGELOG.md`, `workflows/refresh.yml` | first refresh: 0 new, 0 updated (expected) |

Spot-check after Phase 1: 10 random rows, all 10 found on their source pages.

## 5. Source-by-source status (the part a reviewer should read closely)

Probed from the Claude Code cloud environment on 2026-09-10. Full table with
unblock steps: `docs/SCRAPING_HURDLES.md`. Short form:

| Source | Status | Notes |
|---|---|---|
| macys.com/parade | **blocked** (403 Akamai) | parser exists; needs a saved page at the path `make scrape` prints |
| macysthanksgiving.fandom.com | **blocked** (403) | same |
| tournamentofroses.com | **blocked** (SiteGround captcha, HTTP 202) | Wikipedia "Rose Parade marching bands" used instead; years 2015–2027 |
| chicagothanksgivingparade.com | **blocked** (TLS handshake) | parser exists; needs saved page |
| 6abc.com Philadelphia | **partial** | lineup URL not found; Wikipedia table covers 2013–2019, 2022 |
| hebthanksgivingdayparade.com | **partial** | TLS fails; houstontx.gov performers page exists 2025+ only. Note: the 2026 page currently shows the 2025 lineup; the parser takes the year from the page heading, not the URL |
| july4thparade.com | **no data** | site publishes no lineup, only a brochure PDF |
| thehollywoodchristmasparade.org | live | unit names only, no city/state; 2020 missing; dance/cheer units filtered by a "bandish" word rule |
| marching.musicforall.org/result | live | Grand National finalists 2018–2025 from the HTML "Finals Results" block; 345 regional recap pages are PDF-only and are counted, not parsed |
| NCES CCD 2023-24 | live | directory zip (029) + membership zip (052, 2.3 GB CSV, streamed once into `enrollment_totals.csv`). WEBSITE blank for many districts |
| Wayback Machine | blocked (connection reset) | cannot recover blocked pages from here |

The generic parser in `cached_only.py` only emits a row for a text block that
explicitly names a High School, with the year from the nearest heading or the
page title. It has unit tests but no real-page fixture yet.

## 6. Design decisions and why

- **Wikipedia as a named source** for Rose and Philadelphia. Approved by the
  repo owner after Tournament of Roses and 6abc proved unreachable. Rows carry the
  Wikipedia URL. Wikipedia has no per-year Macy's band list, so Macy's stays
  blocked.
- **No web-search fallback** for school websites (playbook step 2.2). No search
  API is available; the owner chose NCES-only. Rows without an NCES website get
  `no website in NCES` and no crawl. This is the single biggest limiter on
  contact discovery.
- **Contact rule is deliberately strict.** An email is recorded only if (a) its
  domain matches the school/district site domain and (b) the same mailto block
  or a ±200-char text window contains "band director" / "director of bands", or
  the address matches a band-director name found under such a label on that
  page. The "single email on a director page" fallback was removed after it
  captured a theatre director's address. Name extraction requires a separator
  before/after the label and rejects headline captures ("Band Director Lands
  Magazine Cover"); see `tests/test_enrich.py`.
- **NCES matching**: state → city (if known) → `difflib` ratio on normalized
  names; ≥ 0.90 fills, 0.75–0.90 is noted as low-confidence with candidates,
  ties without a city are downgraded. Prefix matches ("Avon" vs "Avon High")
  are boosted to 0.92.
- **Scoring** (`scripts/score.py`): parades_marched 30 (full at 5), recency 20
  (2024+ full, −5/yr), BOA finalist years 15 (full at 3), travel signal 15 (any
  Rose/Macy's/Hollywood), geography 20 (FL 1.0; GA/AL/SC/NC/TN 0.75; MS/LA/AR/
  KY/VA/WV/TX 0.5; else 0.25), +5 if director_email. Tiers: A top 50, B next
  100, C rest.
- **Refresh is year-scoped and non-destructive**: `run_all.py --refresh` scrapes
  current+next year, replaces only those years inside each interim CSV
  (`write_interim_scoped`, deduped on school/event/year), rebuilds, diffs against
  the previous `prospects.csv`, appends to `CHANGELOG.md`.
- **Dependencies beyond the playbook's four**: openpyxl (xlsx) and pytest, both
  approved. gspread is imported lazily and not installed. pypdf was not
  approved, hence BOA regionals unparsed.
- **`.gitignore`** was changed from ignoring all of `data/` and `*.csv` to
  ignoring only `data/raw/`, so interim and final data are tracked and the
  refresh PR diff is meaningful.

## 7. Known problems and gaps (honest list)

1. **Macy's, Chicago, Rose press releases have zero rows** until someone saves
   the pages from a normal browser into the exact `data/raw/<host>/<sha1>.html`
   paths that `make scrape` prints. This is the highest-value manual step.
2. **36 stateless rows** (Hollywood, news) cannot be NCES-matched and score
   geography at the floor. The search fallback (2026-09-10) placed 9 of 45: 2 by
   exact national NCES name, 7 by a Google knowledge panel confirmed by the one
   NCES school of that name nationwide. The rest are nicknames ("Pride of
   Portage") or names that exist in several states ("Liberty", "Milton",
   "Westlake"), which no search result can place without guessing.
3. **Websites: 57 of 138 missing ones filled** by `scripts/search_fallback.py`
   (52 Google knowledge panels, 3 organic school-domain results, 2 NCES); 70
   found nothing (mostly nickname rows), 9 were refused as ambiguous. A further
   20 school sites blocked the crawler.
4. **Contacts are sparse** (2 emails and 5 names across all 214). Partly the strict rule,
   partly staff directories that do not label "band director" next to the
   address. Loosening is a client decision (see `docs/TROEN_QUESTIONS.md` Q15–16).
5. **BOA regional finalists** are not captured (PDF-only; needs pypdf).
6. **Band nicknames stand in for school names** in some rows ("Oak Park Marching
   Northmen", "Klein Forest Golden Eagle Marching Band"); the `city` field
   occasionally carries nickname text ("The Pride of Broken Arrow"). Cosmetic in
   the sheet, harmful only to NCES matching (which fell back to state-only and
   still matched in the cases checked).
7. **Combined/honor bands** name real schools inside one excluded row
   ("605 All Star Band, featuring Artesia, Bellflower, …"); member schools are
   not extracted.
8. **Year coverage is uneven** across sources, so `parades_marched`
   under-counts in the gaps (Philadelphia after 2022, Hollywood 2020, H-E-B
   before 2025).
9. **Band-page detection is loose**: a page counts as the band page if it
   mentions "marching band"/"band director" etc. Rosemount's `band_url` is a
   hall-of-fame page; Franklin TN's is a newsletter article. Tightening to
   URL/title keywords would help.
10. **Workflow not active**: the Claude GitHub App cannot push under
    `.github/workflows/`, so the cron job lives at `workflows/refresh.yml`. Copy it
    to `.github/workflows/refresh.yml` from a normal git client. It uses
    `peter-evans/create-pull-request@v7` and passes the refresh log as the PR body.
11. **Nimble market-finder step skipped** (CLI not installed, no key).
12. **Two checkpoint commits** of `prospects.csv` exist mid-enrichment (a stop
    hook required a clean tree). They are harmless but noisy in history; squash on
    merge if preferred.

## 8. How to run it

```
make venv                       # python3 -m venv .venv && pip install -r requirements.txt
make test                       # 30 passed, 4 skipped
make scrape                     # full discovery, prints summary + blocked-source cache paths
.venv/bin/python scripts/enrich.py --limit 100     # or --all, --no-crawl, --new-only
.venv/bin/python scripts/search_fallback.py        # websites via SerpAPI for rows NCES missed
.venv/bin/python scripts/enrich.py --new-only      # crawl only sites never crawled before
.venv/bin/python scripts/qa.py [--fix] [--network] # QA checks; exit 1 on findings (report mode)
make score
make export                     # + optional: scripts/export.py --gsheet service_account.json
make refresh                    # current + next year only; diff + CHANGELOG entry
```

Everything fetched is cached under `data/raw/`, so re-runs are fast and offline
once the cache is warm. To force a refetch, delete the cache file. NCES zips
(~220 MB) download on first `enrich` and stay cached; `enrollment_totals.csv`
is the streamed extract.

Environment caveat: the cloud container's egress is a datacenter IP. Several
sites block it (see §5). Running `make scrape` once from a laptop would likely
fill the Macy's, Fandom, and Chicago caches without any code change.

## 9. Recommended next steps, in order of rows affected

1. Save the four blocked pages manually; re-run `make scrape`, `make score`,
   `make export`. (Adds Macy's + Chicago; likely 100+ new schools and a much
   stronger travel signal.)
2. Approve `pypdf`; parse BOA regional finals recaps (`scrapers/boa.py`
   already records the PDF URLs in `pdf_only_events`).
3. Done (2026-09-10): `scripts/search_fallback.py` filled 57 websites through
   SerpAPI; see §7 items 2–3 for what it could not place. Re-run it after any
   scrape that adds rows (`python scripts/search_fallback.py`; cached searches
   are free, new ones cost quota).
4. Tighten band-page detection to URL/title keywords; add a headless-browser
   fetch (Playwright is preinstalled in the cloud env) for the ~10 blocked
   school-site crawls.
5. Extract member schools from combined/honor-band rows; strip nickname
   fragments from `city` at merge time.
6. Playbook "future prompts" not started: extra parades (Gasparilla, Cherry
   Blossom, Plymouth, Fiesta Bowl, Disney/Universal), news source tagged
   `news:`, state band director association assessment results, Tier A "why
   them" notes → `tier_a_outreach_notes.csv`, QA pass (`scripts/qa.py`).

## 9a. East Coast holiday-festival list (added 2026-09-10)

Owner asked for East Coast high school AND middle school bands that have marched
in holiday parades/festivals. Decisions: East Coast = ME NH VT MA RI CT NY NJ PA
DE MD DC VA WV NC SC GA FL; middle schools join the same list flagged by a new
`level` column (High/Middle/Other, from the name at merge, else NCES); the
signal is "has marched in a holiday event". Output: `data/final/east_coast.csv`
and an "East Coast" sheet in `prospects.xlsx` (52 rows after the news pull: GA 12,
FL 7, PA 7, NJ 6, SC 4, DE 4; the rest single-state or stateless rows whose only
appearance is an East Coast parade).

What blocked a bigger list: no East Coast parade site publishes a lineup that is
reachable and allowed (see `docs/SCRAPING_HURDLES.md`, "East Coast expansion").
Google News RSS is disallowed by robots.txt and is never fetched.

**News pull via SerpAPI (2026-09-10).** The owner set `SERPAPI_KEY` in the cloud
environment and asked for the pull. `scrapers/news_east.py` is now registered in
`run_all.py`; it searches SerpAPI's `google_news` engine once per phrase (28
searches of the free plan's 250/month), caches JSON under `data/raw/serpapi.com/`,
and emits a row only when a headline names both a High/Middle School band and one
of the listed parades. Result: 15 rows, 13 schools; 9 folded into existing rows
(new Macy's 2023–2027 appearances for Fishers, Dobyns-Bennett, Marcus, Foothill,
Pearland, Concord; Philadelphia years for Penn, Kingsway, Biloxi, duPont), 4 new
stateless schools (Byrnes, Concord, Enloe, Southeast Raleigh). Every news-sourced
appearance is flagged in `notes` as `news: named in local coverage of ...`.
Run it alone with `scripts/run_all.py --sources news_east`. The 20 smaller East
Coast parades yielded nothing: see `SCRAPING_HURDLES.md` for the counts and the
rules that dropped rows on purpose.

## 10. Deliverables that exist today

Data outputs (tracked, regenerated by `make export`):

- `data/final/prospects.xlsx` (Tier A, Tier B, East Coast, All), `east_coast.csv`,
  `tier_a.csv`, `SUMMARY.md`, `CHANGELOG.md`.

Client packet for the Troen meeting on 2026-09-11, checked in under
`docs/packet/` so it survives the cloud container:

| File | What it is |
|---|---|
| `Parade-Prospects-Brief-and-Top10.pdf` | One-page brief plus the Top 10 spread with parade history |
| `Parade-Prospects-Deck.pdf` / `.pptx` | Four-slide meeting deck (the pptx was built with pptxgenjs and QA'd in LibreOffice) |
| `Parade-Prospects-Overview.pdf` / `.txt` | Plain-language overview written for the Troen team (the txt is the NotebookLM source) |
| `Veterans-Day-Sales-Sheet.pdf` | Director-facing sheet; every trip fact is a highlighted placeholder, never an invented detail |

The packet is static: it was rendered from the 2026-09-10 data (214 schools, Top 10
as in `SUMMARY.md`). After a refresh changes the Top 10, the brief, Top 10 spread,
and deck need re-rendering. Their editable sources are Claude Design canvases:

- Brief + Top 10: https://claude.ai/code/artifact/f5dca72f-8e09-44a2-b9fd-122f085ec555
- Deck: https://claude.ai/code/artifact/ec95ef11-1f5c-4077-a4f0-0487eebc4cd9
- Field notes (hurdles + client questions): https://claude.ai/code/artifact/06dcc5bf-0322-4d67-9e0f-021118222bf8

The owner also holds a corrected Claude Design handoff zip (HTML sources, inlined
fonts, IDENTITY.md) and a set of internal-only documents (pitch, interview notes,
follow-up email) that are deliberately **not** in this repo. Visual identity in
short: navy #1B2A4A, brass #B8862B, off-white #F7F4EE, slate #5B6478; Archivo for
headlines, Source Serif 4 for body, IBM Plex Mono for paths and placeholders.

Rendering was done ad hoc with the cloud environment's preinstalled Playwright and
Chromium; Google Fonts is unreachable from Chromium there, so the font files were
fetched with curl and inlined as base64 `@font-face`. A repeatable `make pages`
target would need Playwright approved as a dev dependency (not yet approved).

## 10a. Scheduled follow-up

A one-shot Claude Code routine, "Post-Macy's refresh of parade prospects", fires on
2026-10-08 13:00 UTC in the owner's cloud environment. It runs `make test`,
`make refresh`, `make score`, `make export` on a branch `claude/refresh-oct-2026`,
commits, and opens a draft PR titled "Seasonal refresh: October 2026", reporting
which schools gained a Macy's 2027 appearance and whether the Top 10 changed. It
sends no email. The cron workflow in `workflows/refresh.yml` covers the same
cadence once copied into `.github/workflows/`.

## 11. Conventions for whoever continues

- Keep one commit per logical step; never include model identifiers in commits.
- Do not relax the contact rule without the client's answer to Q15–16.
- Do not add dependencies without asking; `pypdf` and a search API are the two
  most likely asks.
- Never hand-edit `prospects.csv`; change a scraper or the merge and re-run,
  so `source_urls` and notes stay truthful.
- When a new source is added: one module in `scrapers/` exposing
  `parse(html, url, ...)` (pure) and `scrape()`, an interim CSV name, a fixture
  under `tests/fixtures/`, and a row in the source table in `CLAUDE.md`.
