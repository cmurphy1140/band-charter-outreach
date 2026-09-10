"""Enrich data/final/prospects.csv with NCES district/enrollment/website data and
band-program pages, directors, and boosters found on the school's own site.

Usage:
  python scripts/enrich.py            # top 100 by parades_marched (playbook default)
  python scripts/enrich.py --limit 25
  python scripts/enrich.py --all
  python scripts/enrich.py --no-crawl # NCES only

Rules (CLAUDE.md): contacts are recorded only when printed on the school, district,
or booster site, with the page URL added to source_urls. An email whose domain does
not match the school/district website domain is discarded. Nothing is guessed:
low-confidence NCES matches are noted instead of filled. Existing non-empty fields
are never overwritten.
"""
from __future__ import annotations

import argparse
import csv
import difflib
import io
import re
import sys
import zipfile
from collections import deque
from pathlib import Path
from urllib.parse import urljoin, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd  # noqa: E402
from bs4 import BeautifulSoup  # noqa: E402

from scrapers.common import (COLUMNS, FINAL_DIR, RAW_DIR, BlockedSource, fetch)  # noqa: E402
from scrapers.normalize import normalize_school  # noqa: E402

PROSPECTS = FINAL_DIR / "prospects.csv"
NCES_DIR = RAW_DIR / "nces"
NCES_BASE = "https://nces.ed.gov/ccd/Data/zip/"
# 2023-24 Common Core of Data: school directory (029) and membership (052).
NCES_FILES = {
    "directory": "ccd_sch_029_2324_w_1a_073124.zip",
    "membership": "ccd_sch_052_2324_l_1a_073124.zip",
}
MAX_PAGES_PER_SCHOOL = 20
MATCH_THRESHOLD = 0.90       # below this the match is noted, not filled
CANDIDATE_THRESHOLD = 0.75   # candidates below this are not even mentioned

BAND_LINK = re.compile(r"\b(band|music|boosters?|fine arts|performing arts|orchestra)\b", re.I)
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE = re.compile(r"\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b")
_NAME = r"(?:(?:Dr|Mr|Mrs|Ms)\.?\s+)?[A-Z][a-z'-]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z'-]+(?:-[A-Z][a-z]+)?"
DIRECTOR = re.compile(
    r"(?i:(?:band|instrumental music)\s+director(?:s)?|director\s+of\s+(?:bands?|instrumental music))"
    r"\s*[:\-–—|]\s*(?P<name>" + _NAME + r")\b|"
    r"(?:^|(?<=[.,;:|()\-–—]\s)|(?<=[a-z0-9]\s)|(?<=[A-Z][A-Z]\s))(?P<name2>" + _NAME + r")\s*[,\-–—|(]\s*"
    r"(?i:director\s+of\s+(?:bands?|instrumental music)|(?:head\s+)?band\s+director|instrumental music director)",
)
# Capitalized words that are never part of a person's name in this context.
NAME_STOPWORDS = {"arts", "fine", "band", "bands", "music", "guard", "color", "staff", "deadline",
                  "director", "the", "contact", "email", "phone", "office", "school", "high",
                  "department", "welcome", "meet", "our", "about", "magazine", "news", "article",
                  "orchestra", "choir", "camp", "photos", "registration", "lands", "marching",
                  "program", "boosters", "booster", "club", "association", "parent", "parents"}


def _clean_name(name: str) -> str:
    toks = name.split()
    if any(t.strip(".").lower() in NAME_STOPWORDS for t in toks):
        return ""
    return name.strip()
BAND_DIRECTOR_LABEL = re.compile(
    r"\b(?:band|instrumental music)\s+director\b|\bdirector\s+of\s+(?:bands?|instrumental music)\b|"
    r"\b(?:head|assistant)\s+band\s+director\b",
    re.I,
)
SOCIAL = re.compile(r"https?://(?:www\.)?(facebook|instagram)\.com/[A-Za-z0-9_.\-/]+", re.I)
BOOSTER_ORG = re.compile(
    r"\b((?:[A-Z][\w.'&-]*\s+){1,4}Band Boosters?(?:\s+(?:Association|Club|Organization|Inc\.?))?)\b")
BOOSTER_NOISE = re.compile(
    r"\b(click|here|view|website|link|visit|page|directors?|staff|season|search|submenu|menu|"
    r"our|news|program|lesson|marching band band|concert|percussion|guard|athletic|vocal|"
    r"communications?|leadership|beginning|embedded|president)\b", re.I)


# --------------------------------------------------------------------------- NCES

def _nces_file(kind: str) -> Path:
    NCES_DIR.mkdir(parents=True, exist_ok=True)
    name = NCES_FILES[kind]
    zpath = NCES_DIR / name
    if not zpath.exists():
        import requests
        print(f"[nces] downloading {name} ...")
        with requests.get(NCES_BASE + name, stream=True, timeout=120) as r:
            r.raise_for_status()
            with zpath.open("wb") as f:
                for chunk in r.iter_content(1 << 20):
                    f.write(chunk)
    return zpath


def _read_zip_csv(zpath: Path, usecols=None) -> pd.DataFrame:
    with zipfile.ZipFile(zpath) as z:
        inner = [n for n in z.namelist() if n.lower().endswith(".csv")][0]
        with z.open(inner) as f:
            return pd.read_csv(io.TextIOWrapper(f, encoding="latin-1"), dtype=str,
                               usecols=usecols, low_memory=False)


def load_nces() -> pd.DataFrame:
    """High schools (and secondary/other schools serving grade 12) with district,
    city, state, website, and total enrollment."""
    d = _read_zip_csv(_nces_file("directory"))
    cols = {c.upper(): c for c in d.columns}
    def col(*names):
        for n in names:
            if n in cols:
                return cols[n]
        raise KeyError(names)
    d = d.rename(columns={
        col("NCESSCH"): "ncessch", col("SCH_NAME"): "sch_name", col("LEA_NAME"): "lea_name",
        col("LCITY", "MCITY"): "city", col("LSTATE", "MSTATE"): "state",
        col("WEBSITE"): "website", col("LEVEL", "SCHOOL_LEVEL"): "level",
        col("SY_STATUS_TEXT", "UPDATED_STATUS_TEXT", "SY_STATUS"): "status",
    })
    d = d[["ncessch", "sch_name", "lea_name", "city", "state", "website", "level", "status"]].copy()
    d = d[d["status"].fillna("").str.contains("Open|New|Reopened|Changed", case=False, regex=True)]
    d = d[d["level"].fillna("").str.contains("High|Middle|Secondary|Other|Not applicable|Ungraded", case=False, regex=True)]
    d["key"] = d["sch_name"].map(normalize_school)
    d["city_key"] = d["city"].fillna("").str.lower().str.strip()
    tot = load_enrollment_totals()
    if tot is not None:
        d = d.merge(tot, on="ncessch", how="left")
    else:
        d["enrollment"] = ""
    return d.reset_index(drop=True)


def load_enrollment_totals() -> pd.DataFrame | None:
    """Per-school total enrollment from the membership file (2.3 GB uncompressed), read
    in chunks with three columns and cached as data/raw/nces/enrollment_totals.csv."""
    cache = NCES_DIR / "enrollment_totals.csv"
    if cache.exists():
        return pd.read_csv(cache, dtype=str)
    try:
        zpath = _nces_file("membership")
        with zipfile.ZipFile(zpath) as z:
            inner = [n for n in z.namelist() if n.lower().endswith(".csv")][0]
            parts = []
            with z.open(inner) as f:
                reader = pd.read_csv(io.TextIOWrapper(f, encoding="latin-1"), dtype=str,
                                     usecols=["NCESSCH", "TOTAL_INDICATOR", "STUDENT_COUNT"],
                                     chunksize=1_000_000)
                for i, chunk in enumerate(reader):
                    sel = chunk[chunk["TOTAL_INDICATOR"].fillna("").str.contains(
                        "Education Unit Total", case=False)]
                    parts.append(sel[["NCESSCH", "STUDENT_COUNT"]])
                    print(f"[nces] membership chunk {i + 1} ...", end="\r")
    except (zipfile.BadZipFile, KeyError, ValueError) as e:
        print(f"[nces] membership file unusable ({e}); enrollment left blank. "
              f"Delete {NCES_FILES['membership']} under data/raw/nces to re-download.")
        return None
    tot = pd.concat(parts).drop_duplicates("NCESSCH").rename(
        columns={"NCESSCH": "ncessch", "STUDENT_COUNT": "enrollment"})
    tot["enrollment"] = tot["enrollment"].fillna("").str.split(".").str[0]
    tot.to_csv(cache, index=False)
    print(f"\n[nces] cached {len(tot)} enrollment totals")
    return tot


def match_nces(row: dict, nces: pd.DataFrame) -> tuple[dict | None, float, list[str]]:
    """Return (best_match_record, ratio, other_candidates). Never guesses: the caller
    fills fields only when ratio >= MATCH_THRESHOLD and the match is unique."""
    state = (row.get("state") or "").upper()
    if not state:
        return None, 0.0, []
    pool = nces[nces["state"] == state]
    if pool.empty:
        return None, 0.0, []
    key = normalize_school(row["school"])
    # A row named as a middle school only matches NCES middle schools, and vice versa,
    # so "Lincoln Middle School" never resolves to "Lincoln High School".
    want_middle = (row.get("level") == "Middle") or bool(re.search(r"middle|junior high|jr\.? high", row["school"], re.I))
    is_middle = pool["level"].fillna("").str.startswith("Middle")
    pool = pool[is_middle] if want_middle else pool[~is_middle]
    if pool.empty:
        return None, 0.0, []
    city = (row.get("city") or "").lower().strip()
    if city:
        in_city = pool[pool["city_key"] == city]
        if not in_city.empty:
            pool = in_city
    scored = []
    for rec in pool.itertuples(index=False):
        ratio = difflib.SequenceMatcher(None, key, rec.key).ratio()
        if rec.key == key:
            ratio = 1.0
        elif key and (rec.key.startswith(key + " ") or key.startswith(rec.key + " ")):
            ratio = max(ratio, 0.92)
        if ratio >= CANDIDATE_THRESHOLD:
            scored.append((ratio, rec))
    if not scored:
        return None, 0.0, []
    scored.sort(key=lambda x: -x[0])
    best_ratio, best = scored[0]
    ties = [r for r in scored if abs(r[0] - best_ratio) < 0.01 and r[1].ncessch != best.ncessch]
    others = [f"{r.sch_name} ({r.city})" for _, r in scored[1:4]]
    if ties and not city:
        return best._asdict(), best_ratio * 0.8, others  # ambiguous without a city
    return best._asdict(), best_ratio, others


# --------------------------------------------------------------------------- crawl

def _domain(url: str) -> str:
    host = urlsplit(url).netloc.lower().split(":")[0]
    host = re.sub(r"^www\.", "", host)
    parts = host.split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def crawl_school_site(start_url: str) -> dict:
    """Breadth-first crawl of at most MAX_PAGES_PER_SCHOOL pages on the school's own
    domain, following only links whose text/href mention band, music, or boosters."""
    found = {"band_url": "", "booster_org": "", "booster_url": "", "director_name": "",
             "director_email": "", "director_phone": "", "social": [], "contact_source": "",
             "pages": 0, "blocked": ""}
    if not start_url.startswith("http"):
        start_url = "https://" + start_url
    domain = _domain(start_url)
    seen = set()
    queue = deque([(start_url, 0)])
    band_candidates = []
    while queue and found["pages"] < MAX_PAGES_PER_SCHOOL:
        url, depth = queue.popleft()
        if url in seen:
            continue
        seen.add(url)
        try:
            html = fetch(url)
        except BlockedSource as e:
            if found["pages"] == 0:
                found["blocked"] = str(e)[:120]
                return found
            continue
        found["pages"] += 1
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ", strip=True)
        is_band_page = bool(re.search(r"\b(marching band|band program|band boosters?|director of bands|band director)\b", text, re.I))
        if is_band_page:
            band_candidates.append(url)
            if not found["band_url"]:
                found["band_url"] = url
            _extract_contacts(soup, text, url, domain, found)
        for a in soup.find_all("a", href=True):
            href = urljoin(url, a["href"].split("#")[0])
            label = (a.get_text(" ", strip=True) + " " + a["href"]).lower()
            if not href.startswith("http") or not BAND_LINK.search(label):
                continue
            if _domain(href) != domain and not re.search(r"booster", label):
                continue  # only follow off-domain links that are explicitly boosters
            if href not in seen and depth < 3:
                queue.append((href, depth + 1))
    return found


def _extract_contacts(soup, text: str, url: str, domain: str, found: dict) -> None:
    for m in SOCIAL.finditer(str(soup)):
        link = m.group(0).rstrip("/")
        if link not in found["social"] and len(found["social"]) < 4:
            found["social"].append(link)
    # An organisation name: up to four capitalised words, "Band Boosters", an optional
    # suffix. Menu text ("Marching Band Band Boosters Our Bands") is not a name.
    for bm in BOOSTER_ORG.finditer(text):
        org = bm.group(1).strip(" .,-")
        if not BOOSTER_NOISE.search(org) and not found["booster_org"]:
            found["booster_org"] = org
            break
    if found["director_email"]:
        return
    # A band director's name is only taken from an explicit "band director" /
    # "director of bands" label; an email is only taken when it is tied to that
    # label (same mailto link, or within a short text window of it) or to that name.
    name = ""
    for dm in DIRECTOR.finditer(text):
        name = _clean_name(dm.group("name") or dm.group("name2") or "")
        if name:
            break
    last = name.split()[-1].lower() if name else ""

    candidates: list[tuple[str, str]] = []  # (email, context)
    for a in soup.select('a[href^="mailto:"]'):
        email = a["href"][7:].split("?")[0].strip()
        label = a.get_text(" ", strip=True)
        parent = a.find_parent(["li", "p", "td", "div", "tr"])
        ctx = (parent.get_text(" ", strip=True) if parent else label)[:400]
        candidates.append((email, label + " " + ctx))
    for m in EMAIL.finditer(text):
        candidates.append((m.group(0), text[max(0, m.start() - 200): m.end() + 200]))

    chosen = ""
    chosen_ctx = ""
    for email, ctx in candidates:
        if _domain("https://" + email.split("@")[1]) != domain:
            continue  # must be a school/district address
        tied_by_label = BAND_DIRECTOR_LABEL.search(ctx) is not None
        tied_by_name = bool(last) and (last[:5] in email.lower() or last in ctx.lower())
        if tied_by_label or (tied_by_name and re.search(r"director", ctx, re.I)):
            chosen, chosen_ctx = email, ctx
            break
    if not chosen:
        if name and not found["director_name"]:
            found["director_name"] = name
            found["contact_source"] = url
        return
    found["director_email"] = chosen
    if not found["director_name"]:
        nm = DIRECTOR.search(chosen_ctx)
        found["director_name"] = (_clean_name(nm.group("name") or nm.group("name2")) if nm else "") or name
    found["contact_source"] = url
    pm = PHONE.search(chosen_ctx)
    if pm:
        found["director_phone"] = pm.group(0)


# --------------------------------------------------------------------------- main

def _note(row: dict, text: str) -> None:
    if text and text not in (row.get("notes") or ""):
        row["notes"] = "; ".join(x for x in [(row.get("notes") or "").strip("; "), text] if x)


def _add_source(row: dict, url: str) -> None:
    urls = [u for u in (row.get("source_urls") or "").split("; ") if u]
    if url and url not in urls:
        urls.append(url)
    row["source_urls"] = "; ".join(urls)


def enrich_row(row: dict, nces: pd.DataFrame, crawl: bool) -> None:
    rec, ratio, others = match_nces(row, nces)
    if rec is None:
        _note(row, "nces: no match" if row.get("state") else "nces: skipped (state unknown)")
    elif ratio >= MATCH_THRESHOLD:
        if not row.get("district"):
            row["district"] = rec["lea_name"] or ""
        if not row.get("level") and rec.get("level"):
            lv = str(rec["level"])
            row["level"] = "High" if lv.startswith(("High", "Secondary")) else "Middle" if lv.startswith("Middle") else "Other"
        if not row.get("enrollment") and rec.get("enrollment"):
            row["enrollment"] = str(rec["enrollment"]).split(".")[0]
        if not row.get("city") and rec.get("city"):
            row["city"] = str(rec["city"]).title()
        if not row.get("school_url") and rec.get("website") and str(rec["website"]) != "nan":
            row["school_url"] = str(rec["website"]).strip().replace("\\", "/")
        if ratio < 1.0:
            _note(row, f"nces: matched '{rec['sch_name']}' ({ratio:.2f})")
        if not row.get("school_url"):
            _note(row, "no website in NCES")
    else:
        _note(row, f"nces: low-confidence match '{rec['sch_name']}, {rec['city']}' ({ratio:.2f})"
              + (f"; other candidates: {', '.join(others)}" if others else ""))
        if not row.get("school_url"):
            _note(row, "no website in NCES")

    if not crawl or not row.get("school_url"):
        return
    if row.get("director_email") and row.get("band_url"):
        return  # already enriched
    found = crawl_school_site(row["school_url"])
    if found["blocked"]:
        _note(row, f"site crawl blocked: {found['blocked']}")
        return
    if found["band_url"] and not row.get("band_url"):
        row["band_url"] = found["band_url"]
        _add_source(row, found["band_url"])
    if found["booster_org"] and not row.get("booster_org"):
        row["booster_org"] = found["booster_org"]
    for k in ("director_name", "director_email", "director_phone"):
        if found[k] and not row.get(k):
            row[k] = found[k]
    if found["contact_source"]:
        _add_source(row, found["contact_source"])
    for s in found["social"]:
        _note(row, f"social: {s}")
    if not found["band_url"]:
        _note(row, f"no band page found in {found['pages']} pages crawled")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=100, help="top N by parades_marched")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--no-crawl", action="store_true", help="NCES only, skip school sites")
    ap.add_argument("--new-only", action="store_true",
                    help="only rows with a school_url that has never been crawled")
    a = ap.parse_args(argv)

    with PROSPECTS.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    order = sorted(range(len(rows)), key=lambda i: (-int(rows[i]["parades_marched"] or 0),
                                                    -int(rows[i]["last_appearance"] or 0)))
    targets = order if (a.all or a.new_only) else order[: a.limit]
    if a.new_only:
        crawled = re.compile(r"no band page found|site crawl blocked")
        targets = [i for i in targets if rows[i].get("school_url") and not rows[i].get("band_url")
                   and not crawled.search(rows[i].get("notes") or "")]
    print(f"[nces] loading Common Core of Data ...")
    nces = load_nces()
    print(f"[nces] {len(nces)} open high/secondary schools loaded")

    stats = {"matched": 0, "low": 0, "none": 0, "band_url": 0, "email": 0}
    for n, i in enumerate(targets, 1):
        r = rows[i]
        before = dict(r)
        enrich_row(r, nces, crawl=not a.no_crawl)
        if r.get("district") and not before.get("district"):
            stats["matched"] += 1
        elif "low-confidence" in r.get("notes", ""):
            stats["low"] += 1
        elif "nces: no match" in r.get("notes", "") or "state unknown" in r.get("notes", ""):
            stats["none"] += 1
        stats["band_url"] += bool(r.get("band_url"))
        stats["email"] += bool(r.get("director_email"))
        print(f"[{n}/{len(targets)}] {r['school']} ({r['state'] or '??'}): "
              f"district={r['district'] or '-'} enroll={r['enrollment'] or '-'} "
              f"band_url={'yes' if r['band_url'] else '-'} email={'yes' if r['director_email'] else '-'}")
        with PROSPECTS.open("w", newline="", encoding="utf-8") as f:  # checkpoint each row
            w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)
    print(f"\ndone: {len(targets)} rows. NCES matched={stats['matched']} low-confidence={stats['low']} "
          f"no-match={stats['none']}; band pages={stats['band_url']}; director emails={stats['email']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
