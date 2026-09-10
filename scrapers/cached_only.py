"""Scrapers for sources that block datacenter traffic: Macy's, Tournament of Roses,
Chicago Thanksgiving Parade, National Independence Day Parade.

Each is driven by pages saved manually into data/raw (see CLAUDE.md). The parser is
a conservative heuristic: a row is emitted only for a text block that explicitly
names a High School, with the year taken from the nearest preceding heading or the
page URL/title. Anything less certain is skipped rather than guessed. When no cached
page exists the source is recorded as blocked and the cache path is printed.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from scrapers.common import Row, cached, cache_path, fetch, BlockedSource, ROOT
from scrapers.normalize import school_from_band_name, clean_school, split_city_state

GENERIC_SOURCES = {
    "macys": {
        "event": "Macy's",
        "urls": [
            "https://www.macys.com/social/parade/",
            "https://macysthanksgiving.fandom.com/wiki/Marching_Bands",
        ],
        "reason": "macys.com returns 403 (Akamai bot block); fandom.com returns 403",
    },
    "rose": {
        "event": "Rose",
        "urls": ["https://tournamentofroses.com/press-releases/",
                 "https://tournamentofroses.com/rose-parade/participants/"],
        "reason": "tournamentofroses.com serves a SiteGround captcha challenge (HTTP 202)",
    },
    "chicago": {
        "event": "Chicago",
        "urls": ["https://www.chicagothanksgivingparade.com/"],
        "reason": "TLS handshake failure from this environment",
    },
    "july4": {
        "event": "National Independence Day",
        "urls": ["https://july4thparade.com/"],
        "reason": "site reachable but publishes no lineup page (only a recruitment brochure PDF)",
    },
}


def _year_for(el, default: int | None) -> int | None:
    h = el.find_previous(["h1", "h2", "h3", "h4"])
    while h is not None:
        m = re.search(r"\b(20\d\d)\b", h.get_text(" ", strip=True))
        if m:
            return int(m.group(1))
        h = h.find_previous(["h1", "h2", "h3", "h4"])
    return default


def parse_generic(html: str, url: str, event: str, default_year: int | None = None) -> list[Row]:
    soup = BeautifulSoup(html, "lxml")
    if default_year is None:
        t = soup.title.get_text() if soup.title else ""
        m = re.search(r"\b(20\d\d)\b", t + " " + url)
        default_year = int(m.group(1)) if m else None
    rows: list[Row] = []
    seen = set()
    for el in soup.find_all(["li", "p", "td", "h2", "h3", "h4", "div"]):
        if el.find(["li", "p", "td", "div"]):
            continue  # only leaf blocks
        text = re.sub(r"\s+", " ", el.get_text(" ", strip=True))
        if not text or len(text) > 250:
            continue
        if not re.search(r"high school|\bhs\b|h\.s\.", text, re.I):
            continue
        school = clean_school(school_from_band_name(text))
        if not school:
            continue
        year = _year_for(el, default_year)
        key = (school.lower(), year)
        if key in seen:
            continue
        seen.add(key)
        rest = re.sub(re.escape(school), "", text, flags=re.I)
        loc = re.search(r"\(([^)]*)\)", rest) or re.search(r"[-–,]\s*([A-Za-z .]+,\s*[A-Za-z .]+)\s*$", rest)
        city, state = split_city_state(loc.group(1)) if loc else ("", "")
        rows.append(Row(school=school, city=city, state=state, event=event, year=year,
                        source_url=url))
    return rows


def scrape_source(name: str) -> tuple[list[Row], str | None]:
    """Return (rows, blocked_reason). blocked_reason is None when at least one page parsed."""
    spec = GENERIC_SOURCES[name]
    rows: list[Row] = []
    got_any = False
    for url in spec["urls"]:
        html = cached(url)
        if html is None:
            try:
                html = fetch(url)
            except BlockedSource:
                continue
        got_any = True
        rows += parse_generic(html, url, spec["event"])
    if not got_any:
        paths = ", ".join(str(cache_path(u).relative_to(ROOT)) for u in spec["urls"])
        return [], f"{spec['reason']}. Save the page(s) to: {paths}"
    return rows, None
