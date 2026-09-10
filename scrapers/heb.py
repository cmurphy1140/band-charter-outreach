"""H-E-B Thanksgiving Day Parade (Houston).

hebthanksgivingdayparade.com fails TLS from this environment. The City of Houston
publishes the same lineup at houstontx.gov/thanksgivingparade/<year>performers.html
(2025 onward). The page has an <h2>"<year> Marching Bands"</h2> followed by one
<div class="col-md-3"> card per band whose <p> reads "<School><br><Band name>".
The year is taken from that heading, or from the card image path
("2025performers/..."), never from the URL: the next year's page keeps showing the
previous lineup until the new one is announced.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from scrapers.common import Row, fetch, BlockedSource, cached
from scrapers.normalize import school_from_band_name, clean_school

SOURCE = "heb"
EVENT = "H-E-B Houston"
CITY_BASE = "https://www.houstontx.gov/thanksgivingparade/"
PARADE_SITE = "https://www.hebthanksgivingdayparade.com/"
YEARS = range(2025, 2028)


def parse(html: str, url: str, year_hint: int | None = None) -> list[Row]:
    soup = BeautifulSoup(html, "lxml")
    head = None
    for h in soup.find_all(["h2", "h3"]):
        if re.search(r"marching bands", h.get_text(" ", strip=True), re.I):
            head = h
            break
    if head is None:
        return []
    m = re.search(r"\b(20\d\d)\b", head.get_text(" ", strip=True))
    year = int(m.group(1)) if m else None
    rows: list[Row] = []
    for card in head.find_all_next("div", class_="col-md-3"):
        p = [x for x in card.find_all("p") if not x.find("img")]
        if not p:
            continue
        lines = [re.sub(r"\s+", " ", t).strip() for t in p[-1].stripped_strings]
        if not lines:
            continue
        if year is None:
            img = card.find("img", src=True)
            ym = re.search(r"(20\d\d)performers", img["src"]) if img else None
            year = int(ym.group(1)) if ym else year_hint
        joined = " ".join(lines)
        school = clean_school(school_from_band_name(lines[0]))
        if school:
            band = " ".join(lines[1:]).strip()
            if band.lower() in ("marching band", "band"):
                band = ""
        else:
            # "Klein Forest Golden Eagle / Marching Band": no HS token, so keep the
            # full unit name as the school field for enrichment to verify.
            school = joined
            band = joined
        rows.append(Row(school=school, band_name=band, city="Houston", state="TX",
                        event=EVENT, year=year, source_url=url))
    return rows


def scrape(years=YEARS) -> list[Row]:
    rows: list[Row] = []
    seen = set()
    for year in years:
        url = f"{CITY_BASE}{year}performers.html"
        try:
            html = fetch(url)
        except BlockedSource:
            continue  # page for that year not published yet
        for r in parse(html, url, year):
            key = (r.school.lower(), r.year)
            if key not in seen:
                seen.add(key)
                rows.append(r)
    html = cached(PARADE_SITE)
    if html:
        rows += parse(html, PARADE_SITE, max(years))
    return rows
