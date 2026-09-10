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
| Google News RSS headlines ("Enloe High School band prepares to perform at Raleigh Christmas Parade") | Rich, **but news.google.com/robots.txt disallows /rss/search**. The feed is never fetched. Since 2026-09-10 the same headlines come through SerpAPI's `google_news` engine with the owner's key (see below) |
| Bing / DuckDuckGo / Startpage HTML | Bing reachable but its no-JavaScript results ignore the query; DuckDuckGo returns a challenge; all disallow scraping in robots.txt |
| Wikipedia | Only the Philadelphia parade article has a band table; no articles for the other East Coast parades |

Net effect before the key: the East Coast sheet was built from sources already in
the pipeline (Philadelphia 40 schools, Rose 13, BOA 5, Hollywood 1) plus middle
schools. What still unblocks more: someone saving each parade's lineup page from
a browser into `data/raw/`.

### SerpAPI news pull (run 2026-09-10)

The owner supplied a SerpAPI key (`SERPAPI_KEY`, free plan, 250 searches/month).
`scrapers/news_east.py` sends one `google_news` search per phrase in its parade
list (28 searches) and caches the JSON under `data/raw/serpapi.com/`. Note that
serpapi.com's robots.txt lists `/search.json` as disallowed for crawlers; the
owner's decision is that a keyed API call under SerpAPI's terms is not crawling.

What the first pull found, and why the list is short:

| | |
|---|---|
| Headlines returned | 100 for Macy's, 74 + 32 for Philadelphia, 1–14 for each of the 22 other parades |
| Headlines that named a High/Middle School band | 48 |
| Kept after the parade had to be named in the headline too | 15 rows, 13 schools (Macy's 7, Philadelphia 6, Raleigh 2) |
| Of those, folded into schools already in the list | 9 (Dobyns-Bennett, Fishers, Penn, Kingsway, Marcus, Biloxi, Foothill, Pearland, A.I. duPont) |
| New schools, all with state unknown | Byrnes, Concord, Enloe, Southeast Raleigh |

Rules that dropped rows, deliberately: the event is taken from the headline's
own words, never from which search returned it (Google returns a Rose Parade
headline for the Macy's query); headlines about students, grads, or alumni are
skipped (three students in Macy's Great American Marching Band is not the school
band); a headline that names the band but not the parade is skipped ("2022
Parade: Millbrook High School Marching Band", "Wallington ... heads to Boston for
prestigious event"), even when the link makes the parade obvious. The 20 smaller
East Coast parades produced no qualifying headline at all: local coverage names
the parade but rarely a school in the headline.

Levers, in order of expected yield: read article bodies (the SerpAPI link is the
real article URL; a body fetch would need each outlet's robots.txt honoured and
would add "selected for" and "fundraising for" wording); add phrases per parade
that name the local outlet; run the pull each November when coverage peaks.

### SerpAPI website fallback (run 2026-09-10)

`scripts/search_fallback.py` sent one Google search per school without a
website (138 rows, 138 searches; total SerpAPI use this month 164 of 250).

| Outcome | Rows | Rule |
|---|---|---|
| Google knowledge panel | 52 | panel title is the school, type says school, and either NCES knows exactly one school of that name in the state or the panel's city matches the row's. For a row with no state, the panel's state must be confirmed by the one NCES school of that name nationwide (7 rows placed this way) |
| Organic school-domain result | 3 | k12/isd/schools-style domain or the school's own word starting a host label, shallow path, title names the school; never for a stateless row |
| NCES exact national match | 2 | stateless row whose exact name exists once nationwide (fills state too) |
| Band program site | 2 | domain says "band": goes to `band_url`, not `school_url` |
| Refused as ambiguous | 9 | Robert E. Lee (Midland): panel was the Baytown school; Salem (VA): two in the state, no city; Olentangy Orange: NCES has no such high school and the panel gives a county; Milton, Westlake, Carrollton, Compton (no state): the name exists in several states; Sonata Music School, Gevorkian Dance Academy: unknown to NCES (and not marching bands: exclusion gap) |
| Nothing acceptable | 70 | mostly nickname rows ("Pride of Portage Marching Band") and stateless common names |

Net: `school_url` 76 -> 133, `band_url` 22 -> 41, stateless rows 45 -> 36, director
emails 1 -> 2, names 3 -> 5. The crawl of the 57 new sites (`enrich.py --new-only`)
found 17 band pages and one labelled director address (Cedar Park, TX).

Things the rules deliberately refused, with the evidence that they were right to:
a dictionary page for "Vista Ridge" (the word "ridge" inside cambridge.org), a
Gadsden Times article for "Gadsden Band", a football site for Southlake Carroll,
and nine same-named schools (Liberty, Summit, Colony, Concord...) that Google
returned for rows with no state.

## Data-quality hurdles inside the pipeline

- **NCES prefix boost can pick a parent-named school.** "Olentangy Orange High
  School" was matched to "Olentangy High School" (0.92) because NCES has no
  record under the Orange name; the district/enrollment on that row may belong
  to the other school. A QA pass should re-check every prefix-boosted match.

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
3. Done: search fallback (`scripts/search_fallback.py`, SerpAPI).
4. Add a headless-browser fetch for school sites that block plain requests.
5. Fill state for the 43 stateless rows: manual, since search cannot place a
   common name or a nickname without guessing.
6. Extract member schools from combined/honor-band rows in `excluded.csv`.
7. Clean nickname fragments out of the `city` column at merge time.
8. Copy `workflows/refresh.yml` into `.github/workflows/` from a normal git client.
