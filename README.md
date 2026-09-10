# parade-prospects

A prospect list of US high school marching bands that travel to major holiday
parades (Macy's, Rose Parade, Chicago, Philadelphia, H-E-B Houston, Hollywood
Christmas Parade, National Independence Day Parade, Bands of America finalists),
built for a student performance travel client. Discovery scrapers feed a merged,
deduplicated `data/final/prospects.csv`; enrichment adds NCES district and
enrollment data plus published band-program contacts; scoring ranks schools into
tiers; exports produce an xlsx workbook and a Markdown summary for the team.

Contacts are never invented: a director email appears only if it is printed on the
school, district, or booster site, with the source page recorded. See `CLAUDE.md`
for the full rules, schema, and source status.

## Quickstart

```
make venv        # python3 -m venv .venv && pip install -r requirements.txt
make scrape      # discovery scrapers -> data/interim/*.csv -> data/final/prospects.csv
make enrich      # NCES + school-site crawl (top 100 by default; --all for everything)
make score       # 0-100 score, tiers A/B/C, data/final/tier_a.csv
make export      # data/final/prospects.xlsx and data/final/SUMMARY.md
make all         # all of the above
make test        # pytest against cached fixture pages
make refresh     # seasonal re-scrape of current + next year, with diff and changelog
```

Some sources block datacenter traffic (Macy's, the Macy's fan wiki, Tournament of
Roses, Chicago). Their scrapers run against pages saved manually into `data/raw/`;
`make scrape` prints exactly which paths to fill.

## Pipeline

1. **Discovery** (`scripts/run_all.py`): one scraper per source writes
   `data/interim/<source>.csv`; the merge normalizes school names, drops colleges,
   drum corps, all-star/honor, military, community, elementary, and non-US groups
   into `data/interim/excluded.csv` (middle schools stay, flagged by `level`),
   dedupes by (school, state), and builds `data/final/prospects.csv` with parade
   history, `parades_marched`, and `last_appearance`. News headlines that name a
   school band in Macy's or an East Coast holiday parade come through SerpAPI
   when `SERPAPI_KEY` is set.
2. **Enrichment** (`scripts/enrich.py`): NCES Common Core of Data (cached zips under
   `data/raw/nces/`) supplies district, enrollment, and school website; the school
   site is crawled (max 20 pages) for the band page, booster club, and a director
   contact that is explicitly labelled as band director on a school-domain address.
   Low-confidence NCES matches are noted, not filled. Default is the top 100 by
   `parades_marched`; pass `--all` for everything.
3. **Scoring** (`scripts/score.py`): 0–100 from parades marched (30), recency (20),
   BOA finalist years (15), travel signal (15), geography (20, configurable per
   target parade), plus 5 for a published director email. Tier A = top 50, B = next
   100, C = rest; `data/final/tier_a.csv` is written alongside.
4. **Exports** (`scripts/export.py`): `data/final/prospects.xlsx` (Tier A, Tier B,
   East Coast, All; frozen header, filters, one parade per line),
   `data/final/east_coast.csv`, and `data/final/SUMMARY.md`
   (counts by state and parade, top 25, schools with no contact found).
   `--gsheet service_account.json` pushes Tier A to a new Google Sheet via gspread
   (not installed by default).
5. **Refresh** (`make refresh`, `workflows/refresh.yml`): re-scrapes only
   the current and next parade year, merges, prints a diff, appends to
   `data/final/CHANGELOG.md`, and opens a draft PR on the 15th of March, October,
   and November. The workflow file lives in `workflows/` because the Claude GitHub
   App cannot push to `.github/workflows/`; copy it to
   `.github/workflows/refresh.yml` to enable it.

## Documents

- `docs/HANDOFF.md`: full project handoff (what exists, what is blocked, what next).
- `docs/SCRAPING_HURDLES.md`: every blocked or partial source and what unblocks it.
- `docs/TROEN_QUESTIONS.md`: open questions for the client.
- `docs/packet/`: the client packet (brief + Top 10, deck as PDF and pptx, overview,
  Veterans Day sales sheet), rendered from the 2026-09-10 data.

## Stack

Python 3.11, requests, beautifulsoup4, lxml, pandas, openpyxl, pytest.

Questions: cmurphy1140@gmail.com.
