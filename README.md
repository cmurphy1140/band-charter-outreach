# Troen: Carnegie Hall proof of concept

**[Open the connected demonstration](demo/carnegie-hall/index.html)** —
Wando and Salem research, an editable opportunity workbook, a Wando director sheet, and a fictional follow-up.
[Run and edit the example](demo/carnegie-hall/README.md).

**[Start here: Carnegie Hall reference pack](docs/carnegie-hall/README.md)** — the
demonstration-first plan, eight detailed strategies, logistics evidence,
positioning, useful tools/connectors, and Zoho research handoff.

[Current progress and learning checkpoints](docs/carnegie-hall/PROGRESS.md) tracks
the living plan. [AGENTS.md](AGENTS.md) holds the shared project instructions;
[CLAUDE.md](CLAUDE.md) links to that same file.

The current focus is Troen's **March 3, 2027** Carnegie Hall event: identify suitable
ensembles and tour partners, prepare useful conversations, and organize progress
toward bookings. An employee reports one participating group. **Ten additional
ensembles is a provisional target requiring capacity confirmation.**

## Current Status

The reference pack now includes [eight detailed workstream strategies](docs/carnegie-hall/strategies/README.md), a [tools and connectors map](docs/carnegie-hall/TOOLS-AND-CONNECTORS.md), and an internal decision register. The POC will demonstrate researched opportunities, tailored materials, and an example booking/coordination workflow before asking Troen for business preparation work. There is no required channel ordering.

The supplied Zoho assessment is preserved unchanged. Account-specific facts belong to later integration decisions and do not block the demonstration. As of September 11, the local example includes two reviewed schools, an initial editable workbook, a Wando Word director sheet, and two fictional follow-up situations. A broader varied batch, provider comparison, partner materials, and operating automations remain planned.

The existing research library and tools below remain useful foundations. The
[audit](docs/AUDIT-2026-09-10.md) identifies data-preservation and attribution
defects; the current list is not a verified Carnegie outreach list. The new plan
prioritizes the Carnegie increment and the repairs it needs, with unrelated parade
expansion deferred.

## Local SerpAPI setup

The shared client in [scrapers/serpapi.py](scrapers/serpapi.py) reads `SERPAPI_KEY`
from the running environment first, then from `.env` in this repository's root.
That supports both news discovery and the school-website search fallback. The
key is read when needed; the launch commands in `Makefile` need no key embedded
in them.

This Mac checkout has a configured private `.env` file. One live search and a
cached repeat succeeded on September 11, 2026. In a fresh checkout, copy
[.env.example](.env.example) to `.env` without replacing an existing file, enter
your key after `SERPAPI_KEY=`, and save. Install the declared dependencies
with `make venv` if the environment is new or missing them.

Run `make check-serpapi` from the repository root. It reports only whether a key
is present; it makes no API request and does not validate the account or spend
search quota. A live request is a separate check.

`.env` and `.env.*` are ignored by Git, except the blank `.env.example` template.
The file stays local; each cloud checkout or separate worktree needs its own
secret configuration. An explicitly set environment value takes precedence,
including a blank value that disables the local fallback. Only `SERPAPI_KEY` is
used from the file; other entries are not exported into the process. File values
are parsed literally, without shell execution or variable expansion. The parser
is [python-dotenv](https://bbc2.github.io/python-dotenv/#load-configuration-without-altering-the-environment),
pinned in both dependency manifests.

This setup enables credentials for the existing tools. It does not repair the
audited refresh/merge paths; keep initial live checks small and separate from
the production prospect list.

## Existing parade research tools

The original project builds a prospect list of US school marching bands that
travel to major holiday parades (Macy's, Rose Parade, Chicago, Philadelphia, H-E-B Houston, Hollywood
Christmas Parade, National Independence Day Parade, Bands of America finalists),
built for a student performance travel client. Discovery scrapers feed a merged,
deduplicated `data/final/prospects.csv`; enrichment adds NCES district and
enrollment data plus published band-program contacts; scoring ranks schools into
tiers; exports produce an xlsx workbook and a Markdown summary for the team.

The project's contact rule prohibits guessing: details should be recorded only
when a school, district, or booster source explicitly associates them with the
relevant director and institution. The audit identifies failures in the current
implementation. See `CLAUDE.md` for the rules and original schema.

## Existing commands

These commands operate the original parade pipeline. Read the audit before a
production rebuild or refresh; saving the reference pack does not repair those
paths or automatically adapt them to Carnegie Hall.

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

## Original pipeline reference

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
5. **Refresh** (`make refresh`, `workflows/refresh.yml`): the command attempts
   a current/next-year scrape, merge, diff, and changelog update. The audit found
   failure-preservation and cache-freshness defects. The scheduling template lives
   in `workflows/`, outside GitHub's active workflow directory; no unattended
   refresh was enabled by this documentation work. Earlier references to a
   separate cloud routine have not been independently verified.

## Documents

- [Carnegie reference pack](docs/carnegie-hall/README.md): current direction and
  the linked plan, evidence, positioning, and received Zoho assessment.
- [Repository audit](docs/AUDIT-2026-09-10.md) and
  [remediation plan](docs/superpowers/plans/2026-09-10-pipeline-remediation.md):
  technical findings retained for reference; use the Carnegie pack for priorities.
- [Original handoff](docs/HANDOFF.md), [scraping notes](docs/SCRAPING_HURDLES.md),
  and [old client questions](docs/TROEN_QUESTIONS.md): historical parade context.
- [Original packet](docs/packet/): earlier brief, Top 10, deck, overview, and
  Veterans Day sheet. Counts, rankings, readiness claims, and the Orlando offer
  must not be presented as current Carnegie facts.

## Stack

Python 3.11, requests, beautifulsoup4, lxml, pandas, openpyxl, pytest.

Project role: logistics and software developer.
