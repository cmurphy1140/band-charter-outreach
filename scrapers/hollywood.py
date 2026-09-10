"""Hollywood Christmas Parade marching bands.

Live source. The site publishes one WordPress category per year for bands, each
listing one <article> per unit with the unit name as the title. City/state are not
given on the listing (many are Southern California), so they are left blank for
enrichment; the article body is kept in the band_name only when it names a band.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from scrapers.common import Row, fetch, BlockedSource
from scrapers.normalize import school_from_band_name, clean_school

SOURCE = "hollywood"
EVENT = "Hollywood"
BASE = "https://thehollywoodchristmasparade.org/category/"
CATEGORIES = {
    2018: "2018-marching-band-and-pageantry",
    2019: "2019-marching-band-and-pageantry",
    2021: "2021-marching-band-and-pageantry",
    2022: "2022-marching-band-and-pageantry",
    2023: "2023-marching-bands-pageantry-and-dance-groups",
    2024: "2024-marching-bands-dance-cheer-groups",
    2025: "2025-marching-bands-dance-cheer-groups",
    2026: "2026-marching-bands-dance-cheer-groups",
}


def parse(html: str, url: str, year: int) -> list[Row]:
    soup = BeautifulSoup(html, "lxml")
    rows: list[Row] = []
    for art in soup.select("article"):
        h = art.find(["h1", "h2", "h3", "h4"])
        if not h:
            continue
        title = re.sub(r"\s+", " ", h.get_text(" ", strip=True))
        if not title:
            continue
        # Category pages mix bands with dance, cheer, and novelty units. Keep only
        # entries that name a school or call themselves a band; skip the rest.
        if not _BANDISH.search(title):
            continue
        school = clean_school(school_from_band_name(title))
        band = title if school and title.lower() != school.lower() else ""
        if not school:
            # A band-named unit like "Oak Park Marching Northmen": keep the unit name
            # as the school field for NCES matching; enrichment flags low confidence.
            band = title
        rows.append(Row(school=school or title, band_name=band, event=EVENT, year=year,
                        source_url=url))
    return rows


_BANDISH = re.compile(r"\b(high school|h\.?s\.?|hs|band|marching|regiment|academy|school)\b", re.I)


def scrape(years=None) -> list[Row]:
    rows: list[Row] = []
    for year, slug in CATEGORIES.items():
        if years is not None and year not in years:
            continue
        url = BASE + slug + "/"
        try:
            html = fetch(url)
        except BlockedSource:
            if year in (2018, 2019):
                continue  # older categories may not exist; not a block of the source
            raise
        rows += parse(html, url, year)
    return rows
