"""Rose Parade band lineups from Wikipedia's "Rose Parade marching bands" article.

Live source. Each parade year is an <h3 id="YYYY_(nth)"> followed by a <ul>; each
<li> reads "Band/School name, City, State" (US) or "..., City, Country".
Rows carry the Wikipedia URL as source_url. Years are filtered to 2015–2027.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from scrapers.common import Row, fetch
from scrapers.normalize import school_from_band_name, split_city_state, clean_school

URL = "https://en.wikipedia.org/wiki/Rose_Parade_marching_bands"
SOURCE = "wikipedia_rose"
EVENT = "Rose"
YEARS = range(2015, 2028)


def _li_text(li) -> str:
    for sup in li.select("sup"):
        sup.decompose()
    return re.sub(r"\s+", " ", li.get_text(" ", strip=True)).replace(" ,", ",").strip()


def parse(html: str, url: str = URL, years=YEARS) -> list[Row]:
    soup = BeautifulSoup(html, "lxml")
    rows: list[Row] = []
    for h in soup.find_all(["h2", "h3"], id=re.compile(r"^(20\d\d)")):
        year = int(h["id"][:4])
        if year not in years:
            continue
        container = h.parent if h.parent.name == "div" else h
        ul = container.find_next_sibling("ul")
        if ul is None:
            continue
        for li in ul.find_all("li", recursive=False):
            text = _li_text(li)
            # Drop trailing notes like "(Rose Bowl participant)" or "(unable to participate)"
            text_no_paren = re.sub(r"\s*\([^)]*\)", "", text)
            parts = [p.strip() for p in text_no_paren.split(",") if p.strip()]
            if not parts:
                continue
            # Prefer the wiki link to the city article ("Rancho Cucamonga, California").
            city, state = "", ""
            loc_text = ""
            for a in li.find_all("a"):
                t = a.get("title") or a.get_text(" ", strip=True)
                c, s = split_city_state(t)
                if s and "," in t:
                    city, state, loc_text = c, s, a.get_text(" ", strip=True)
            if not state:
                city, state = split_city_state(", ".join(parts[-2:]))
            # "Marching Eagle Regiment Rancho Cucamonga": drop a nickname glued to the city.
            cm = re.match(r"^.*\b(regiment|band|guard|corps|marching \w+)\b\s+(.+)$", city, re.I)
            if cm:
                city = cm.group(2).strip()
            if state and loc_text:
                name = text_no_paren.split(loc_text)[0].strip(" ,–-")
                # Text between the school and the city link is a nickname/city remnant.
                if state and city and name.lower().endswith(city.lower()):
                    name = name[: -len(city)].strip(" ,–-")
            elif state:
                name_parts = parts[:-2] if len(parts) >= 3 else parts[:-1]
                name = ", ".join(name_parts).strip(" –-")
            else:
                name = ", ".join(parts).strip(" –-")
            # "School Name, Band Nickname" or "School Name – Band Nickname"
            school = ""
            band = ""
            first_link = li.find("a")
            candidates = [name] + ([first_link.get_text(" ", strip=True)] if first_link else [])
            for cand in candidates:
                s = school_from_band_name(cand)
                if s:
                    school = clean_school(s)
                    break
            if "–" in name:
                left, right = [x.strip() for x in name.split("–", 1)]
                band = right
                if not school:
                    school = clean_school(school_from_band_name(left) or left)
            elif school and name.lower() != school.lower():
                rest = re.sub(re.escape(school), "", name, flags=re.I).strip(" ,–-")
                band = rest
            rows.append(Row(school=school or clean_school(name), band_name=band, city=city,
                            state=state, event=EVENT, year=year, source_url=url))
    return rows


def scrape(years=YEARS) -> list[Row]:
    return parse(fetch(URL), URL, years)
