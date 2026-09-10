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
  is disallowed and is therefore not used (`scrapers/news_east.py` is parked).
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
data/raw/        cached HTML/JSON (gitignored)
data/interim/    per-source CSVs (tracked)
data/final/      prospects.csv and derived outputs (tracked)
scripts/         run_all.py, enrich.py, score.py, export.py
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
- [x] Phase 1 discovery scrape (208 schools from Rose/Wikipedia, Philadelphia/Wikipedia,
      Hollywood, H-E-B Houston, BOA Grand National finalists 2018–2025; Macy's, Rose
      press releases, Chicago blocked; July 4th publishes no lineup; BOA regional
      results are PDF-only and not parsed)
- [x] Phase 2 enrichment, top 100 by parades_marched (NCES 2023-24 directory +
      membership totals; school-site crawl; contacts only when labelled band
      director on a school-domain address). `--all` not yet run: review first.
- [x] Phase 3 scoring and tiers (`scripts/score.py`, config dicts at the top)
- [x] Phase 4 outputs (`data/final/prospects.xlsx`, `SUMMARY.md`; `--gsheet` lazy)
- [x] Phase 5 seasonal maintenance (`make refresh`, `workflows/refresh.yml`)

See `docs/SCRAPING_HURDLES.md` for every blocked or partial source and what
unblocks it, and `docs/TROEN_QUESTIONS.md` for open client questions.

## Skipped or deferred

- Nimble market-finder enrichment: Nimble CLI not installed; skip until it is.
- Phase 2 web-search fallback for school websites: no search API; NCES website only.

## Future prompts (from the playbook, not yet implemented)

- More parades: Gasparilla (Tampa), National Cherry Blossom Festival Parade (DC),
  America's Hometown Thanksgiving Celebration (Plymouth, MA), Disney/Universal
  performance program participants if public, Fiesta Bowl Parade.
- News source: local news (past 18 months) about bands "selected for" or
  "fundraising for" a parade trip, tagged `news:`; flag in notes as warmest leads.
- State band director associations (FL, GA, AL, SC, NC, TN, TX): public assessment
  results, tagged `state-assessment`. Never scrape member directories.
- Tier A "why them" one-liners → `data/final/tier_a_outreach_notes.csv`. No emails.
- QA pass: duplicates, invalid states, `parades_marched = 0`, email domain mismatch,
  dead source_urls.
