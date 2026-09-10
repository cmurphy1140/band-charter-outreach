"""East Coast holiday parades from Google News headlines, pulled through SerpAPI.

STATUS: live when SERPAPI_KEY is set (owner supplied a key on 2026-09-10 and asked
for the pull). Without the key, scrape() raises BlockedSource and run_all records
the source as blocked instead of guessing.

Why SerpAPI and not the RSS feed: news.google.com/robots.txt disallows /rss/search
for all agents, so the feed is never fetched (the RSS parser below is kept, and
tested, for feeds a person saves by hand). SerpAPI's google_news engine returns the
same headlines under a licence keyed to the owner's account. serpapi.com's own
robots.txt lists /search.json as disallowed for crawlers; the owner's decision is
that a keyed API call under SerpAPI's terms is not crawling, and this module goes
through its own client (below) rather than scrapers.common.fetch() so that the
robots check for anonymous crawling is not misapplied to it. Key handling: the key
is read from the environment only, never written to the cache, the .meta.json
sidecar, or any CSV.

Most East Coast Thanksgiving and Christmas parades publish no machine-readable
lineup (or block this environment), but local news headlines routinely name the
bands: "Enloe High School band prepares to perform at 75th annual Raleigh
Christmas Parade". The row's source_url is the article URL SerpAPI returns.

Rules (nothing is inferred from the article body, which is not fetched):
- a row is emitted only when the HEADLINE names a High School or Middle School
  AND names the parade (the event is taken from the headline's own words via
  MARKERS, never from which search returned it: a Rose Parade headline that
  Google returns for the Macy's query is not a Macy's row);
- headlines about individual students, grads, or alumni are skipped (they are
  usually about a few students in an honor band, not the school's band);
- the year is the one the headline states, else the parade year implied by the
  publish date; when a school has both for the same event within a year of each
  other, the stated year wins and the date-derived row is dropped;
- city/state are left blank unless the headline states them (never the parade's).
A sidecar CSV keeps every headline used.

Quota: the free SerpAPI plan is 250 searches per month; one full pull is one
search per phrase in PARADES (about 30). Responses are cached under
data/raw/serpapi.com/, so re-runs cost nothing until `make refresh` forces a
re-pull of the current and next parade year.
"""
from __future__ import annotations

import csv
import datetime as dt
import re
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

from scrapers import serpapi
from scrapers.common import Row, INTERIM_DIR, BlockedSource
from scrapers.normalize import clean_school, split_city_state

SOURCE = "news_east"
URL = serpapi.URL                                # reported by run_all when blocked
RSS = "https://news.google.com/rss/search?"      # parser only; never fetched (robots.txt)
ENV_KEY = serpapi.ENV_KEY
ENGINE = "google_news"

# (event tag, parade state, search phrases, headline marker). The state is the
# parade's, used for the East Coast sheet only; it is never written into a school's
# state column. The marker is matched against "<headline> [<publisher>]": a
# headline is attributed to an event only when its own words name that parade.
PARADES = [
    ("Macy's", "NY", ['"Macy\'s Thanksgiving Day Parade"'],
     r"macy['’]?s"),
    ("Philadelphia", "PA", ['"Thanksgiving Day Parade" Philadelphia', '"6abc" "Thanksgiving Day Parade"'],
     r"philadelphia|6abc yard|dunkin['’]? thanksgiving|america['’]s oldest thanksgiving"),
    ("America's Hometown Thanksgiving", "MA", ['"America\'s Hometown Thanksgiving"', '"Plymouth" "Thanksgiving parade"'],
     r"america['’]s hometown|plymouth"),
    ("Stamford Parade Spectacular", "CT", ['"Stamford" "Parade Spectacular"'],
     r"parade spectacular|stamford.{0,40}parade"),
    ("Raleigh Christmas Parade", "NC", ['"Raleigh Christmas Parade"'],
     r"raleigh christmas parade"),
    ("Charlotte Thanksgiving Parade", "NC", ['"Novant Health Thanksgiving"', '"Charlotte" "Thanksgiving Parade"'],
     r"novant health thanksgiving|charlotte.{0,30}thanksgiving (?:day )?parade"),
    ("Richmond Christmas Parade", "VA", ['"Dominion Energy Christmas Parade"', '"Richmond Christmas Parade"'],
     r"dominion energy christmas parade|richmond christmas parade"),
    ("Norfolk Grand Illumination", "VA", ['"Grand Illumination Parade"'],
     r"grand illumination"),
    ("Virginia Beach Holiday Parade", "VA", ['"Holiday Parade at the Beach"'],
     r"holiday parade at the beach"),
    ("Baltimore Mayor's Christmas Parade", "MD", ['"Mayor\'s Christmas Parade" Baltimore'],
     r"mayor['’]?s christmas parade"),
    ("Alexandria Scottish Christmas Walk", "VA", ['"Scottish Christmas Walk"'],
     r"scottish christmas walk"),
    ("Atlanta Children's Christmas Parade", "GA", ['"Children\'s Christmas Parade" Atlanta'],
     r"children['’]?s christmas parade"),
    ("Savannah Holiday Parade", "GA", ['"Savannah" "holiday parade" band'],
     r"savannah.{0,30}(?:holiday|christmas) parade"),
    ("Florida Citrus Parade", "FL", ['"Florida Citrus Parade"'],
     r"citrus parade"),
    ("Junior Orange Bowl Parade", "FL", ['"Junior Orange Bowl Parade"'],
     r"junior orange bowl"),
    ("Tallahassee Winter Festival Parade", "FL", ['"Winter Festival" Tallahassee parade band'],
     r"winter festival"),
    ("Pittsburgh Celebrate the Season", "PA", ['"Celebrate the Season" Pittsburgh parade'],
     r"celebrate the season"),
    ("Harrisburg Holiday Parade", "PA", ['"Harrisburg" "Holiday Parade"'],
     r"harrisburg.{0,30}holiday parade"),
    ("Wilmington Jaycees Christmas Parade", "DE", ['"Wilmington" "Jaycees Christmas Parade"'],
     r"jaycees christmas parade"),
    ("Carolina Carillon Holiday Parade", "SC", ['"Carolina Carillon"'],
     r"carolina carillon"),
    ("Greenville Poinsettia Christmas Parade", "SC", ['"Poinsettia Christmas Parade"'],
     r"poinsettia"),
    ("Charleston Holiday Parade", "SC", ['"Charleston" "Holiday Parade" band'],
     r"charleston.{0,30}(?:holiday|christmas) parade"),
    ("Providence Christmas Parade", "RI", ['"Providence" "Christmas parade" band'],
     r"providence.{0,30}christmas parade"),
    ("Ocean City Christmas Parade", "MD", ['"Ocean City" "Christmas Parade" band'],
     r"ocean city.{0,30}christmas parade"),
]
MARKERS = {event: re.compile(marker, re.I) for event, _st, _ph, marker in PARADES}
# A parade named generically in the headline is settled by the outlet that runs it:
# (event, headline regex, publisher regex). The publisher alone never attributes.
PUBLISHER_MARKERS = [
    ("Philadelphia", re.compile(r"thanksgiving day parade", re.I), re.compile(r"\b6abc\b", re.I)),
]
BAND_TERMS = '("high school" OR "middle school") band'
YEARS = range(2015, 2028)
HEADLINES_CSV = INTERIM_DIR / "news_east_headlines.csv"
HEADLINE_COLUMNS = ["event", "year", "year_explicit", "school", "headline", "publisher",
                    "published", "link"]

_SCHOOL = re.compile(
    r"(?P<name>(?:[A-Z][A-Za-z.'&-]+\s+){1,5}(?:High School|Middle School|Junior High School|High|Middle)\b)"
    r"(?:\s*\((?P<loc>[^)]{3,40})\))?",
)
_ABOUT_BAND = re.compile(r"\b(marching|band|drumline|color guard|musicians)\b", re.I)
_LOC = re.compile(r"\b(?:in|of|from)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b")
# Headlines about people rather than the school's band ("3 Vero Beach band students
# will perform in Macy's" is three students in an honor band, not the school's band).
_PEOPLE = re.compile(r"\b(grads?|graduates?|alumni|alumnus|alumna|students?|members?|seniors?)\b", re.I)
# Leading verbs/labels a headline glues onto the name ("Watch Concord High School ...").
_LEAD_WORDS = re.compile(r"^(?:Watch|Video|Photos?|See|Meet|Live|How|Why|Inside|Local|Update)\s+")


def parade_year(published: dt.datetime) -> int:
    """Coverage in January to March is about the parade of the previous year."""
    return published.year - 1 if published.month <= 3 else published.year


def event_from_headline(head: str, publisher: str = "") -> str:
    """The one event whose marker the headline names, else '' (none or ambiguous)."""
    hits = [ev for ev, rx in MARKERS.items() if rx.search(head)]
    hits += [ev for ev, head_rx, pub_rx in PUBLISHER_MARKERS
             if ev not in hits and head_rx.search(head) and pub_rx.search(publisher or "")]
    return hits[0] if len(hits) == 1 else ""


def headline_row(head: str, link: str, published: dt.datetime | None, publisher: str = "",
                 years=YEARS) -> tuple[Row, bool] | None:
    """The one place that turns a headline into a Row, shared by both transports.
    Returns (row, year_explicit), or None unless the headline itself is about a
    named school's band at a named parade."""
    if published is None:
        return None
    event = event_from_headline(head, publisher)
    if not event or not _ABOUT_BAND.search(head) or _PEOPLE.search(head):
        return None
    m = _SCHOOL.search(head)
    if not m:
        return None
    year = parade_year(published)
    # "selected to perform in 2027 Macy's ..." names the parade year explicitly.
    ym = re.search(r"\b(20(?:1[5-9]|2[0-8]))\b", head)
    explicit = bool(ym)
    if ym:
        year = int(ym.group(1))
    if year not in years:
        return None
    name = _LEAD_WORDS.sub("", m.group("name").strip())
    if re.search(r"\b(university|college|state)\b", name, re.I):
        return None
    name = re.sub(r"\b(High|Middle)$", r"\1 School", name)
    city, state = "", ""
    loc = m.group("loc") or ""
    if loc:
        city, state = split_city_state(loc)
    if not state:
        lm = _LOC.search(head)
        if lm:
            city, state = split_city_state(f"{lm.group(1)}, {lm.group(2)}")
    return Row(school=clean_school(name), city=city, state=state, event=event, year=year,
               source_url=link), explicit


def _used(row: Row, explicit: bool, title: str, publisher: str, published: str) -> dict:
    return {"event": row.event, "year": row.year, "year_explicit": int(explicit),
            "school": row.school, "headline": title, "publisher": publisher,
            "published": published, "link": row.source_url}


# --- Transport 1: a Google News RSS feed saved by a person (never fetched here) ---

def parse_feed(xml_text: str, feed_url: str = "", years=YEARS) -> tuple[list[Row], list[dict]]:
    root = ET.fromstring(xml_text)
    rows: list[Row] = []
    used: list[dict] = []
    for it in root.findall(".//item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        pub = it.findtext("pubDate") or ""
        src = it.find("source")
        publisher = src.text if src is not None else ""
        try:
            published = parsedate_to_datetime(pub)
        except (TypeError, ValueError):
            continue
        head = title.rsplit(" - ", 1)[0] if publisher and title.endswith(publisher) else title
        got = headline_row(head, link, published, publisher, years)
        if got:
            rows.append(got[0])
            used.append(_used(got[0], got[1], title, publisher, pub))
    return rows, used


# --- Transport 2: SerpAPI google_news engine ---

def _iter_results(payload: dict):
    """Flatten news_results; a result may carry nested `stories` (a story cluster)."""
    for it in payload.get("news_results") or []:
        if it.get("stories"):
            yield from it["stories"]
        else:
            yield it


def _parse_iso(text: str) -> dt.datetime | None:
    if not text:
        return None
    try:
        return dt.datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_results(payload: dict, years=YEARS) -> tuple[list[Row], list[dict]]:
    """Rows from one SerpAPI google_news response (pure; no network)."""
    rows: list[Row] = []
    used: list[dict] = []
    for it in _iter_results(payload):
        title = (it.get("title") or "").strip()
        link = (it.get("link") or "").strip()
        publisher = (it.get("source") or {}).get("name", "") if isinstance(it.get("source"), dict) else ""
        published = _parse_iso(it.get("iso_date") or "")
        if not title or not link:
            continue
        got = headline_row(title, link, published, publisher, years)
        if got:
            rows.append(got[0])
            used.append(_used(got[0], got[1], title, publisher, it.get("iso_date") or it.get("date") or ""))
    return rows, used


def cache_path(query: str):
    return serpapi.cache_path(ENGINE, query)


def queries() -> list[str]:
    return [f"{phrase} {BAND_TERMS}" for _event, _state, phrases, _marker in PARADES for phrase in phrases]


def prefer_stated_years(rows: list[Row], used: list[dict]) -> tuple[list[Row], list[dict]]:
    """Dedupe on (school, event, year), keeping the first headline. A date-derived
    year is dropped when the same school has a headline-stated year for the same
    event within one year of it (announcements run a year ahead of the parade).
    One article (same link) is one appearance: Google sometimes re-dates an old
    story, so the earliest date it carries is kept."""
    stated: dict[tuple[str, str], set[int]] = {}
    earliest: dict[str, int] = {}
    for r, u in zip(rows, used):
        if u["year_explicit"]:
            stated.setdefault((r.school.lower(), r.event), set()).add(r.year)
        earliest[r.source_url] = min(earliest.get(r.source_url, r.year), r.year)
    seen = set()
    out_rows, out_used = [], []
    for r, u in zip(rows, used):
        k = (r.school.lower(), r.event, r.year)
        if k in seen or r.year != earliest[r.source_url]:
            continue
        if not u["year_explicit"] and any(abs(r.year - y) <= 1
                                          for y in stated.get((r.school.lower(), r.event), ())):
            continue
        seen.add(k)
        out_rows.append(r)
        out_used.append(u)
    return out_rows, out_used


def scrape(years=YEARS) -> list[Row]:
    force = years is not None and len(list(years)) <= 3  # refresh: re-pull the searches
    todo = queries()
    uncached = [q for q in todo if force or not cache_path(q).exists()]
    if uncached and not serpapi.key_present():
        raise BlockedSource(f"{ENV_KEY} not set; Google News RSS is disallowed by robots.txt "
                            f"({len(uncached)} searches needed)")
    serpapi.ensure_quota(len(uncached))
    rows: list[Row] = []
    used: list[dict] = []
    for q in todo:
        payload = serpapi.search(ENGINE, q, force=force)
        r, u = parse_results(payload, years)
        rows += r
        used += u
    rows, used = prefer_stated_years(rows, used)
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    with HEADLINES_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HEADLINE_COLUMNS)
        w.writeheader()
        w.writerows(used)
    return rows
