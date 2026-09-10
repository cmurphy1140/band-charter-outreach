# Scraping hurdles and what would unblock them

Status as of 2026-09-10, from runs in the Claude Code cloud environment. Every item
below is something the pipeline detected and reported rather than worked around, per
the guardrail that nothing is guessed.

## Source-by-source

| # | Source | Hurdle | Effect on the list | What would unblock it |
|---|---|---|---|---|
| 1 | macys.com/parade | Akamai bot block returns HTTP 403 to datacenter traffic | **No Macy's rows at all.** The single most important parade for the "has flown a full band" travel signal is missing. | Save the lineup page(s) from a normal browser to `data/raw/www.macys.com/91158586139ba794b6d7abe76b4bd0631bf19874.html`, or run `make scrape` once from a laptop. |
| 2 | macysthanksgiving.fandom.com/wiki/Marching_Bands | Fandom returns 403 to this environment | Historical Macy's lineups (2015–2027) missing | Same as above; path `data/raw/macysthanksgiving.fandom.com/85f3a3049731cf2f0f120864ae48e9dc5781c4bb.html`. |
| 3 | tournamentofroses.com | SiteGround captcha challenge (HTTP 202) | Official press releases unavailable; Wikipedia's "Rose Parade marching bands" article is used instead (99 schools, 2015–2027) | Save the participants/press pages to the paths printed by `make scrape`, or accept Wikipedia as the source of record for Rose. |
| 4 | chicagothanksgivingparade.com | TLS handshake fails (server-side cipher config) | **No Chicago rows** | Save the lineup page to `data/raw/www.chicagothanksgivingparade.com/aa59352e3c6b9a9a50e46a3782298a80c540d94e.html`. |
| 5 | 6abc.com (Philadelphia) | The parade lineup page URL could not be found (every guess 404s) | Philadelphia comes only from Wikipedia's table, which covers 2013–2019 and 2022 | The real 6abc lineup URL(s), or saved pages, for 2020–2026. |
| 6 | hebthanksgivingdayparade.com | TLS handshake fails; the City of Houston page only exists for 2025 onward | H-E-B history before 2025 missing (6 schools total) | Saved parade-site pages for earlier years. |
| 7 | july4thparade.com | Site is reachable but publishes no lineup, only a recruitment brochure PDF | **No National Independence Day rows** | Ask the parade office for past lineups, or drop this source. |
| 8 | marching.musicforall.org (BOA) | Regional finals results are PDF-only (345 event pages); no PDF library is in the approved dependency list | Only Grand National finalists (84 rows, 2018–2025) are captured; regional finalists are not | Approve `pypdf` (pure Python) so the recap PDFs can be parsed. |
| 9 | Hollywood Christmas Parade | Listings give unit names only, no city or state | 41 schools have no state, so NCES cannot match them and geography scoring defaults to the lowest tier | A pass with a search API, or a manual state fill for the Hollywood rows in `prospects.csv`. |
| 10 | NCES Common Core of Data | The `WEBSITE` field is blank for many districts (Indiana and Ohio especially) | About a third of enriched schools have no website, so no crawl, so no band page or contact | Approve a web-search fallback (a SerpAPI/Bing key, or DuckDuckGo HTML) for the "school + city + state" lookup the playbook describes. |
| 11 | School and district sites | Heavy JavaScript front ends, bot walls on some hosts, and band pages that are not linked with the word "band" | Some crawls find no band page in 20 pages; a few are blocked outright | A headless-browser fallback (Playwright is preinstalled here) for the blocked ones; raise the page budget for large districts. |
| 12 | Director contacts | Most band pages list a staff directory without the words "band director" next to the address | Few director emails pass the "explicitly labelled" rule (by design) | A decision on whether a staff-directory row titled "Director of Bands" on a district site counts (it does today only if the label sits in the same block as the address). |
| 13 | Wayback Machine | web.archive.org resets the connection from this environment | Cannot recover blocked pages from archives | Run the archive fetch from another network. |
| 14 | GitHub App permissions | The Claude GitHub App cannot push files under `.github/workflows/` | The seasonal refresh workflow sits in `workflows/refresh.yml` and is not active | Copy it to `.github/workflows/refresh.yml` from a normal git client. |
| 15 | Nimble CLI | Not installed, no API key | The optional Google Maps ratings/website-confidence enrichment is skipped | Install `nimble` and set its key if that step matters. |

## East Coast holiday-festival expansion (added 2026-09-10)

Goal: high school and middle school bands in ME–FL plus DC, VT, WV that have
marched in a holiday parade or festival. What was found:

| Attempt | Result |
|---|---|
| Guessed official parade domains (Richmond, Raleigh, Charlotte, Baltimore, Virginia Beach, Atlanta, Stamford, Boston, Savannah, Jacksonville, St. Pete, Pensacola, Tallahassee …) | Almost all do not resolve; the organizers use news-station or city subpages we could not locate without search |
| America's Hometown Thanksgiving Celebration (Plymouth, MA) | Reachable, but invitation-only and publishes no participant list |
| Raleigh Christmas Parade (grma.org) | Connection reset / 403 |
| Stamford Downtown Parade Spectacular, Norfolk Festevents, Charlotte Center City | Reachable pages, no lineup content (JS or marketing copy only) |
| Google News RSS headlines ("Enloe High School band prepares to perform at Raleigh Christmas Parade") | Rich (Macy's 34 named schools, Philadelphia 15), **but news.google.com/robots.txt disallows /rss/search**. Not used, per the robots.txt guardrail. Parser is ready in `scrapers/news_east.py` |
| Bing / DuckDuckGo / Startpage HTML | Bing reachable but its no-JavaScript results ignore the query; DuckDuckGo returns a challenge; all disallow scraping in robots.txt |
| Wikipedia | Only the Philadelphia parade article has a band table; no articles for the other East Coast parades |

Net effect: the East Coast sheet is built from sources already in the pipeline
(Philadelphia 40 schools, Rose 13, BOA 5, Hollywood 1) plus middle schools now
allowed. What unblocks it: a licensed search or news API key (SerpAPI, Bing Web
Search, NewsAPI), which is the sanctioned route to the same headlines, or someone
saving each parade's lineup page from a browser into `data/raw/`.

## Data-quality hurdles inside the pipeline

- **Band nicknames stand in for school names.** Sources such as Hollywood and
  Philadelphia list "Oak Park Marching Northmen" or "Klein Forest Golden Eagle
  Marching Band" without the school name. The row keeps the unit name in `school`
  so NCES can try a fuzzy match; low-confidence matches are noted, not filled.
- **City fields sometimes carry the nickname** ("The Pride of Broken Arrow" ended
  up in `city` for one Rose row). NCES matching falls back to state-only in those
  cases and still found the right school, but the city column needs a cleanup pass.
- **Combined and honor bands** ("605 All Star Band, featuring Artesia, Bellflower,
  ...") name several real schools inside one excluded row. Those schools are not
  extracted today.
- **Year coverage is uneven.** Rose and BOA cover 2015–2027; Philadelphia stops at
  2022; Hollywood skips 2020; H-E-B starts at 2025. `parades_marched` therefore
  under-counts schools whose appearances fall in the gaps.

## Issues to open (each is one unit of work)

1. Save the four blocked pages manually and re-run `make scrape` (unblocks Macy's,
   Rose press, Chicago).
2. Approve `pypdf` and parse BOA regional finals recaps.
3. Approve a search fallback for schools with no NCES website.
4. Add a headless-browser fetch for school sites that block plain requests.
5. Fill state for the 41 stateless Hollywood rows (manual or search-assisted).
6. Extract member schools from combined/honor-band rows in `excluded.csv`.
7. Clean nickname fragments out of the `city` column at merge time.
8. Copy `workflows/refresh.yml` into `.github/workflows/` from a normal git client.
