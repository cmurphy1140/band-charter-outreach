"""Bands of America (Music for All) finalists.

Live source: marching.musicforall.org/result/ is a paginated archive of event
recap pages. Each recap page carries an "<year> <event name>" heading; Grand
National recap pages include a "Finals Results" block of lines like
"97.825 — Avon H.S., IN". Regional recap pages usually publish results only as
PDFs, which this scraper does not parse (no PDF dependency approved); those events
are counted and reported as "PDF-only" so nothing is guessed.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from scrapers.common import Row, fetch, BlockedSource
from scrapers.normalize import clean_school, split_city_state

SOURCE = "boa"
ARCHIVE = "https://marching.musicforall.org/result/"
YEARS = range(2018, 2026)
_LINE = re.compile(r"^\s*(\d{2,3}\.\d{1,3})\s*[—–-]\s*(.+?)\s*$")

pdf_only_events: list[str] = []


def parse_archive(html: str) -> list[tuple[str, str]]:
    """Return (title, url) for each recap page linked from an archive listing page."""
    soup = BeautifulSoup(html, "lxml")
    out = []
    seen = set()
    for a in soup.select("a[href]"):
        href = a["href"]
        if not re.search(r"/result/[a-z0-9-]+/?$", href):
            continue
        # The event title is the nearest heading above the "Quick Recap" link.
        title = a.get_text(" ", strip=True)
        if title.lower() in ("quick recap", "results", "") or len(title) < 6:
            h = a.find_previous(["h1", "h2", "h3", "h4"])
            title = h.get_text(" ", strip=True) if h else ""
        if href in seen:
            continue
        seen.add(href)
        out.append((title, href))
    return out


def parse_recap(html: str, url: str) -> tuple[int | None, str, list[Row]]:
    """Return (year, event_title, finalist rows) for a recap page."""
    soup = BeautifulSoup(html, "lxml")
    h = soup.find(["h1", "h2"], string=re.compile(r"^\s*20\d\d\s"))
    title = h.get_text(" ", strip=True) if h else ""
    m = re.match(r"(20\d\d)\s+(.*)", title)
    year = int(m.group(1)) if m else None
    event_name = m.group(2).strip() if m else title
    rows: list[Row] = []
    head = None
    for x in soup.find_all(["h2", "h3", "h4"]):
        if x.get_text(" ", strip=True).lower() == "finals results":
            head = x
            break
    if head is None:
        return year, event_name, rows
    for sib in head.next_elements:
        if getattr(sib, "name", None) in ("h2", "h3", "h4") and sib is not head:
            break
        if not isinstance(sib, str):
            continue
        for line in sib.split("\n"):
            lm = _LINE.match(line.strip())
            if not lm:
                continue
            name_loc = lm.group(2)
            parts = [p.strip() for p in name_loc.split(",")]
            # Lines read "School H.S., ST" (no city). Only take a city when three parts exist.
            city, state = "", ""
            if len(parts) >= 3:
                city, state = split_city_state(", ".join(parts[-2:]))
                name = ", ".join(parts[:-2])
            elif len(parts) == 2:
                _, state = split_city_state(parts[-1])
                name = parts[0]
            else:
                name = parts[0]
            label = "Grand National" if "grand national" in event_name.lower() else re.sub(r"\s*20\d\d\s*", " ", event_name).strip()
            rows.append(Row(school=clean_school(name), city=city, state=state,
                            event=f"BOA {label} Finalist", year=year, source_url=url))
    return year, event_name, rows


def scrape(years=YEARS, max_pages: int = 30) -> list[Row]:
    rows: list[Row] = []
    pdf_only_events.clear()
    seen_urls = set()
    for page in range(1, max_pages + 1):
        url = ARCHIVE if page == 1 else f"{ARCHIVE}page/{page}/"
        try:
            html = fetch(url)
        except BlockedSource:
            break
        entries = parse_archive(html)
        if not entries:
            break
        for title, href in entries:
            if href in seen_urls:
                continue
            seen_urls.add(href)
            ym = re.search(r"(20\d\d)", title)
            if ym and int(ym.group(1)) not in years:
                continue
            if "grand national" not in title.lower():
                # Regional recap pages are PDF-only; skip the fetch, record the event.
                pdf_only_events.append(f"{title} ({href})")
                continue
            try:
                page_html = fetch(href)
            except BlockedSource:
                continue
            year, event_name, found = parse_recap(page_html, href)
            if year is not None and year not in years:
                continue
            if not found:
                pdf_only_events.append(f"{title} ({href})")
            rows += found
    return rows
