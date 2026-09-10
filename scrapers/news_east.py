"""East Coast holiday parades via Google News RSS headlines.

STATUS: NOT RUN. news.google.com/robots.txt disallows /rss/search for all agents,
and CLAUDE.md requires robots.txt to be respected, so run_all.py does not register
this module. It is kept because the parser and parade list are ready for a
sanctioned route (a licensed news/search API, or feeds saved by a person).

Most East Coast Thanksgiving and Christmas parades publish no machine-readable
lineup (or block this environment), but local news headlines routinely name the
bands: "2022 Parade: Millbrook High School Marching Band - ABC11". Google News
RSS is public and reachable; its article links are JavaScript redirects that open
in a browser but cannot be resolved here, so the row's source_url is that link.

Rules: a row is emitted only when the HEADLINE names a High School or Middle
School (nothing is inferred from the article body, which is not fetched); the
year is the parade year implied by the publish date; city/state are left blank
unless the headline states them. A sidecar CSV keeps every headline used.
"""
from __future__ import annotations

import csv
import re
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from urllib.parse import urlencode

from scrapers.common import Row, INTERIM_DIR, fetch, BlockedSource
from scrapers.normalize import clean_school, split_city_state

SOURCE = "news_east"
RSS = "https://news.google.com/rss/search?"

# (event tag, parade state, search phrases). The state is the parade's, recorded in
# the sidecar only; it is never written into a school's state column.
PARADES = [
    ("Macy's", "NY", ['"Macy\'s Thanksgiving Day Parade"']),
    ("Philadelphia", "PA", ['"Thanksgiving Day Parade" Philadelphia', '"6abc" "Thanksgiving Day Parade"']),
    ("America's Hometown Thanksgiving", "MA", ['"America\'s Hometown Thanksgiving"', '"Plymouth" "Thanksgiving parade"']),
    ("Stamford Parade Spectacular", "CT", ['"Stamford" "Parade Spectacular"']),
    ("Raleigh Christmas Parade", "NC", ['"Raleigh Christmas Parade"']),
    ("Charlotte Thanksgiving Parade", "NC", ['"Novant Health Thanksgiving"', '"Charlotte" "Thanksgiving Parade"']),
    ("Richmond Christmas Parade", "VA", ['"Dominion Energy Christmas Parade"', '"Richmond Christmas Parade"']),
    ("Norfolk Grand Illumination", "VA", ['"Grand Illumination Parade"']),
    ("Virginia Beach Holiday Parade", "VA", ['"Holiday Parade at the Beach"']),
    ("Baltimore Mayor's Christmas Parade", "MD", ['"Mayor\'s Christmas Parade" Baltimore']),
    ("Alexandria Scottish Christmas Walk", "VA", ['"Scottish Christmas Walk"']),
    ("Atlanta Children's Christmas Parade", "GA", ['"Children\'s Christmas Parade" Atlanta']),
    ("Savannah Holiday Parade", "GA", ['"Savannah" "holiday parade" band']),
    ("Florida Citrus Parade", "FL", ['"Florida Citrus Parade"']),
    ("Junior Orange Bowl Parade", "FL", ['"Junior Orange Bowl Parade"']),
    ("Tallahassee Winter Festival Parade", "FL", ['"Winter Festival" Tallahassee parade band']),
    ("Pittsburgh Celebrate the Season", "PA", ['"Celebrate the Season" Pittsburgh parade']),
    ("Harrisburg Holiday Parade", "PA", ['"Harrisburg" "Holiday Parade"']),
    ("Wilmington Jaycees Christmas Parade", "DE", ['"Wilmington" "Jaycees Christmas Parade"']),
    ("Carolina Carillon Holiday Parade", "SC", ['"Carolina Carillon"']),
    ("Greenville Poinsettia Christmas Parade", "SC", ['"Poinsettia Christmas Parade"']),
    ("Charleston Holiday Parade", "SC", ['"Charleston" "Holiday Parade" band']),
    ("Providence Christmas Parade", "RI", ['"Providence" "Christmas parade" band']),
    ("Ocean City Christmas Parade", "MD", ['"Ocean City" "Christmas Parade" band']),
]
BAND_TERMS = '("high school" OR "middle school") band'
YEARS = range(2015, 2028)

_SCHOOL = re.compile(
    r"(?P<name>(?:[A-Z][A-Za-z.'&-]+\s+){1,5}(?:High School|Middle School|Junior High School|High|Middle)\b)"
    r"(?:\s*\((?P<loc>[^)]{3,40})\))?",
)
_ABOUT_BAND = re.compile(r"\b(marching|band|drumline|color guard|musicians)\b", re.I)
_LOC = re.compile(r"\b(?:in|of|from)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b")


def parse_feed(xml_text: str, event: str, feed_url: str, years=YEARS) -> tuple[list[Row], list[dict]]:
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
            dt = parsedate_to_datetime(pub)
            year = dt.year - 1 if dt.month <= 3 else dt.year
        except (TypeError, ValueError):
            continue
        if year not in years:
            continue
        head = title.rsplit(" - ", 1)[0] if publisher and title.endswith(publisher) else title
        # The headline itself must be about the band marching, not merely mention a school.
        if not _ABOUT_BAND.search(head):
            continue
        m = _SCHOOL.search(head)
        if not m:
            continue
        # "selected to perform in 2027 Macy's ..." names the parade year explicitly.
        ym = re.search(r"\b(20(?:1[5-9]|2[0-8]))\b", head)
        if ym:
            year = int(ym.group(1))
            if year not in years:
                continue
        name = m.group("name").strip()
        if re.search(r"\b(university|college|state)\b", name, re.I):
            continue
        name = re.sub(r"\b(High|Middle)$", r"\1 School", name)
        city, state = "", ""
        loc = m.group("loc") or ""
        if loc:
            city, state = split_city_state(loc)
        if not state:
            lm = _LOC.search(head)
            if lm:
                city, state = split_city_state(f"{lm.group(1)}, {lm.group(2)}")
        rows.append(Row(school=clean_school(name), city=city, state=state, event=event, year=year,
                        source_url=link))
        used.append({"event": event, "year": year, "school": clean_school(name), "headline": title,
                     "publisher": publisher, "published": pub, "link": link})
    return rows, used


def scrape(years=YEARS) -> list[Row]:
    rows: list[Row] = []
    used: list[dict] = []
    force = years is not None and len(list(years)) <= 3  # refresh: re-pull the feeds
    for event, _state, phrases in PARADES:
        for phrase in phrases:
            q = f"{phrase} {BAND_TERMS}"
            url = RSS + urlencode({"q": q, "hl": "en-US", "gl": "US", "ceid": "US:en"})
            try:
                xml_text = fetch(url, force=force)
            except BlockedSource:
                continue
            try:
                r, u = parse_feed(xml_text, event, url, years)
            except ET.ParseError:
                continue
            rows += r
            used += u
    # Dedupe on (school, event, year); keep the first headline.
    seen = set()
    unique = []
    for r in rows:
        k = (r.school.lower(), r.event, r.year)
        if k not in seen:
            seen.add(k)
            unique.append(r)
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    with (INTERIM_DIR / "news_east_headlines.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["event", "year", "school", "headline", "publisher", "published", "link"])
        w.writeheader()
        w.writerows(used)
    return unique
