"""Philadelphia (6abc Dunkin') Thanksgiving Day Parade marching bands.

The 6abc parade page URL could not be located from this environment (404s), so the
live source is the Wikipedia article's "Marching bands" table (Year | bands), where
each entry reads "Band Name (City, ST)". If a 6abc page is cached under data/raw it
is parsed with a generic "High School" heuristic as a second source.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from scrapers.common import Row, fetch, cached
from scrapers.normalize import school_from_band_name, split_city_state, clean_school

URL = "https://en.wikipedia.org/wiki/6abc_Dunkin%27_Thanksgiving_Day_Parade"
SIXABC_URLS = ["https://6abc.com/thanksgiving-day-parade/"]
SOURCE = "philly"
EVENT = "Philadelphia"
YEARS = range(2015, 2028)

_ENTRY = re.compile(r"(?P<name>[^()]+?)\s*\((?P<loc>[^)]*)\)")


def parse(html: str, url: str = URL, years=YEARS) -> list[Row]:
    soup = BeautifulSoup(html, "lxml")
    rows: list[Row] = []
    h = soup.find(["h2", "h3"], id="Marching_bands")
    if h is None:
        return rows
    container = h.parent if h.parent.name == "div" else h
    table = container.find_next("table")
    if table is None:
        return rows
    for tr in table.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) < 2:
            continue
        ytxt = cells[0].get_text(" ", strip=True)
        if not re.fullmatch(r"20\d\d", ytxt):
            continue
        year = int(ytxt)
        if year not in years:
            continue
        for sup in cells[1].select("sup"):
            sup.decompose()
        text = re.sub(r"\s+", " ", cells[1].get_text(" ", strip=True))
        for m in _ENTRY.finditer(text):
            name = m.group("name").strip(" ,;")
            name = re.sub(r"^(and|,)\s+", "", name).strip(" ,")
            city, state = split_city_state(m.group("loc"))
            school = clean_school(school_from_band_name(name))
            band = name if school and name.lower() != school.lower() else ""
            rows.append(Row(school=school or clean_school(name), band_name=band, city=city,
                            state=state, event=EVENT, year=year, source_url=url,))
    return rows


def parse_6abc(html: str, url: str, year: int | None) -> list[Row]:
    """Generic parser for a cached 6abc lineup page: any text block naming a High School."""
    soup = BeautifulSoup(html, "lxml")
    rows = []
    seen = set()
    for el in soup.find_all(["li", "p", "h2", "h3", "h4", "td"]):
        text = re.sub(r"\s+", " ", el.get_text(" ", strip=True))
        if len(text) > 200 or not re.search(r"high school|\bhs\b|h\.s\.", text, re.I):
            continue
        school = clean_school(school_from_band_name(text))
        if not school or school.lower() in seen:
            continue
        seen.add(school.lower())
        rows.append(Row(school=school, event=EVENT, year=year, source_url=url))
    return rows


def scrape(years=YEARS) -> list[Row]:
    rows = parse(fetch(URL), URL, years)
    for u in SIXABC_URLS:
        html = cached(u)
        if html:
            m = re.search(r"(20\d\d)", html[:5000])
            rows += parse_6abc(html, u, int(m.group(1)) if m else None)
    return rows
