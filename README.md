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

## Stack

Python 3.11, requests, beautifulsoup4, lxml, pandas, openpyxl, pytest.

Questions: cmurphy1140@gmail.com.
