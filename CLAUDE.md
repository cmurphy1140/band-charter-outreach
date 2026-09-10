# parade-prospects — project conventions

## Goal

Build and maintain a prospect list of US high school marching bands that travel to
major holiday parades, for Troen Student Performance Events. First target: bands for
a Veterans Day parade opportunity with Universal (Orlando), then a general "parades"
offering on the website.

## Guardrails (non-negotiable)

- **Never invent, infer, or pattern-guess contact details.** Blank is correct.
  A director email is recorded only if it is printed on the school, district, or
  booster site, and the page it came from is recorded in `source_urls`.
- **Every row must have at least one `source_url`.**
- **Respect robots.txt and rate limits** (1 request/sec per host); cache everything
  under `data/raw/`; never hammer a school site (max 20 pages per school).
- **Public data only.** No email, inbox, CRM, or paid-directory scraping.
- **Exclude** colleges/universities, drum corps, honor/all-star/all-district bands,
  military bands, community bands, elementary schools, and any non-US group from
  the prospect list. Keep them in `data/interim/excluded.csv` in case they are
  useful later. Middle schools ARE prospects (owner decision, 2026-09-10), flagged
  by `level`; the East Coast sheet (`data/final/east_coast.csv`, xlsx sheet
  "East Coast") is ME–FL plus DC, VT, WV (`scrapers/common.py: EAST_COAST`).
- **Respect robots.txt even when the data is tempting.** Google News RSS search
  is disallowed and is never fetched. The same headlines come through SerpAPI's
  `google_news` engine under the owner's key (`SERPAPI_KEY`, set in the cloud
  environment on 2026-09-10; owner decision that a keyed API call is not
  crawling). The key is read from the environment only and never written to
  cache, sidecars, or CSVs. Rotate it before sharing the environment.
- **Ask before adding dependencies or credentials.** Approved so far: requests,
  beautifulsoup4, pandas, lxml, openpyxl, pytest. gspread is only added if the
  `--gsheet` export is actually used with a supplied service account.
- If a source is blocked or its structure is unclear, **stop and say so** rather than
  guessing. Blocked sources are recorded in `data/interim/_blocked.json` and printed
  by `run_all.py`.

## Layout

```
scrapers/        one module per source; each exposes parse(html, url, ...) and scrape()
scrapers/common.py  fetch() with robots/throttle/cache, Row dataclass, BlockedSource
data/raw/        cached HTML/JSON (gitignored, except data/raw/serpapi.com/: tracked,
                 because every search costs quota and the JSON holds no key)
data/interim/    per-source CSVs (tracked)
data/final/      prospects.csv and derived outputs (tracked)
scripts/         run_all.py, enrich.py, search_fallback.py, score.py, export.py, qa.py
scrapers/serpapi.py  cached SerpAPI client (key from SERPAPI_KEY only; never on disk)
tests/           pytest; fixtures are cached pages under tests/fixtures/
```

Run with `make venv`, then `make scrape | enrich | score | export | all | test | refresh`.

## CSV schema: data/final/prospects.csv

| column | notes |
|---|---|
| school | official school name |
| band_name | e.g. "Marching Minutemen" |
| city | |
| state | 2-letter code |
| level | High / Middle / Other (from the name at merge, else NCES) |
| district | Phase 2 (NCES) |
| enrollment | Phase 2 (NCES) |
| parades | semicolon-separated, e.g. `Macy's 2026; Rose 2023` |
| parades_marched | integer count |
| last_appearance | most recent year |
| boa_finalist_years | semicolon-separated |
| school_url | |
| band_url | band program / booster site |
| director_name | only if published on school/booster site |
| director_email | only if published; otherwise blank |
| director_phone | only if published |
| booster_org | name of booster club if found |
| source_urls | semicolon-separated |
| score | Phase 3 |
| tier | A/B/C, Phase 3 |
| notes | free text (low-confidence NCES matches, social links, warm-lead flags) |

Interim files use: `school, band_name, city, state, event, year, source_url`.

## Sources and their reachability (probed 2026-09-10 from the Claude Code cloud env)

| Source | Module | Status |
|---|---|---|
| macys.com/parade | `scrapers/macys.py` | **blocked** (403 bot block); parses cached page only |
| macysthanksgiving.fandom.com/wiki/Marching_Bands | `scrapers/macys.py` | **blocked** (403); cached page only |
| tournamentofroses.com | `scrapers/rose.py` | **blocked** (captcha challenge); cached page only |
| Wikipedia "Rose Parade marching bands" | `scrapers/wikipedia_rose.py` | live |
| chicagothanksgivingparade.com | `scrapers/chicago.py` | **blocked** (TLS failure); cached page only |
| Philadelphia (6abc) | `scrapers/philly.py` | 6abc page URL unknown; Wikipedia article "6abc Dunkin' Thanksgiving Day Parade" used live |
| H-E-B Houston | `scrapers/heb.py` | parade site TLS failure; houstontx.gov/thanksgivingparade live |
| Hollywood Christmas Parade | `scrapers/hollywood.py` | live, per-year pages 2018–2026 |
| National Independence Day Parade | `scrapers/july4.py` | live homepage; lineup pages to be discovered |
| Bands of America finalists (marching.musicforall.org/result/) | `scrapers/boa.py` | live; Grand National finalists parsed from the HTML "Finals Results" block; regional recaps are PDF-only and are counted, not parsed |
| Google News headlines via SerpAPI (24 East Coast parades + Macy's) | `scrapers/news_east.py` | live with `SERPAPI_KEY` (free plan: 250 searches/month; one pull is ~28); a row needs the headline to name both a High/Middle School band and the parade; blocked without the key |
| NCES Common Core of Data | `scripts/enrich.py` | live; zips cached in `data/raw/nces/` |

To unblock a blocked source: save the page as HTML into the cache path printed by
`run_all.py` (`data/raw/<host>/<sha1(url)>.html`), then rerun `make scrape`.

## Seasonal cadence (lineup announcements)

- Macy's: bands for the following year announced early October
- Rose Parade: early March (plus two Rose Bowl college bands in December)
- Chicago / Philly / H-E-B / Hollywood: October–November
- BOA Grand Nationals finalists: mid-November

`make refresh` re-scrapes only the current and next parade year, appends new schools,
updates `parades_marched` / `last_appearance`, prints a diff, and adds a dated entry to
`data/final/CHANGELOG.md`. A GitHub Actions workflow (`workflows/refresh.yml`; copy to
`.github/workflows/` to enable, since the Claude GitHub App cannot push workflow
files) runs it on the 15th of March, October, and November and opens a draft PR.
It is read-only: no exports, no emails.

## Phase status

- [x] Phase 0 repo setup
- [x] Phase 1 discovery scrape (214 schools from Rose/Wikipedia, Philadelphia/Wikipedia,
      Hollywood, H-E-B Houston, BOA Grand National finalists 2018–2025, and SerpAPI
      news headlines; Macy's official pages, Rose press releases, Chicago blocked;
      July 4th publishes no lineup; BOA regional results are PDF-only and not parsed)
- [x] Phase 2 enrichment, all rows (NCES 2023-24 directory + membership totals;
      school-site crawl; contacts only when labelled band director on a
      school-domain address): 133 with district and enrollment, 22 band pages,
      3 director names, 1 director email.
- [x] Phase 3 scoring and tiers (`scripts/score.py`, config dicts at the top)
- [x] Phase 4 outputs (`data/final/prospects.xlsx`, `SUMMARY.md`; `--gsheet` lazy)
- [x] Phase 5 seasonal maintenance (`make refresh`, `workflows/refresh.yml`)

See `docs/SCRAPING_HURDLES.md` for every blocked or partial source and what
unblocks it, and `docs/TROEN_QUESTIONS.md` for open client questions.

## Deliverables and schedule

- Client packet lives in `docs/packet/` (brief + Top 10, deck PDF and pptx, overview,
  sales sheet). It is a static render of the 2026-09-10 data; re-render after any
  refresh that changes the Top 10. Editable sources and identity notes are listed in
  `docs/HANDOFF.md` section 10.
- A one-shot cloud routine runs `make refresh` on 2026-10-08 after the Macy's
  announcement and opens a draft PR "Seasonal refresh: October 2026" (section 10a).
- The pitch, interview notes, and follow-up email are the owner's and stay out of
  the repo. Never send email from any script or routine.

## Skipped or deferred

- Nimble market-finder enrichment: Nimble CLI not installed; skip until it is.
- Phase 2 web-search fallback for school websites: done 2026-09-10 with SerpAPI
  (`scripts/search_fallback.py`); rules and counts in `docs/SCRAPING_HURDLES.md`.
  Stateless rows only ever take a Google knowledge panel, never an organic hit.

## Future prompts (from the playbook, not yet implemented)

- More parades: Gasparilla (Tampa), National Cherry Blossom Festival Parade (DC),
  America's Hometown Thanksgiving Celebration (Plymouth, MA), Disney/Universal
  performance program participants if public, Fiesta Bowl Parade.
- News source: done for headlines (`news_east`, notes flag `news: named in local
  coverage of ...`). Not done: article bodies ("fundraising for" wording) and
  parades outside the East Coast list.
- State band director associations (FL, GA, AL, SC, NC, TN, TX): public assessment
  results, tagged `state-assessment`. Never scrape member directories.
- Tier A "why them" one-liners → `data/final/tier_a_outreach_notes.csv`. No emails.
- QA pass: done (`scripts/qa.py`; `--fix` repairs what can be repaired without
  guessing, `--network` adds the dead-URL scan). Checks: non-band, nces-prefix,
  twins, states, parades, email-domain, dead-urls. Open findings it reports but
  does not change: two Ohio schools that Wikipedia lists as "(Delaware)", and a
  stateless Westlake row that could be one of two stated Westlakes.
