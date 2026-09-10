"""Fill school_url (and, for rows with no state, city/state) for prospects that NCES
could not supply, using one SerpAPI Google search per school.

Usage:
  python scripts/search_fallback.py            # every row with no school_url
  python scripts/search_fallback.py --limit 20
  python scripts/search_fallback.py --dry-run  # decide from cache only, write nothing

Rules (CLAUDE.md: never guess):
- Before spending a search, a stateless row is matched against the whole NCES
  directory by exact normalized name; a single national match fills state, city,
  district, enrollment and website with a note.
- Google's knowledge panel is accepted only when its title is the school (name
  ratio >= 0.85 or one name contains the other) and its type says it is a school;
  it supplies the website and, for stateless rows, city and state from
  "High school in <City>, <State>". A panel whose state contradicts the row is
  rejected.
- Failing a panel, an organic result is accepted only when its domain looks like
  a school or district site (k12/isd/schools/district/... or the school's own
  distinctive name in the host), the domain is not a directory/social/news site,
  and the result title names the school. Organic results never set state.
- Every fill is noted (`search: ...`) and the website is added to source_urls.
  Nothing found: `search: no school site found`, and the row is left as is.
Searches are cached, so re-runs are free; the quota is checked before starting.
"""
from __future__ import annotations

import argparse
import csv
import difflib
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scrapers import serpapi  # noqa: E402
from scrapers.common import COLUMNS, FINAL_DIR, BlockedSource  # noqa: E402
from scrapers.normalize import STATES, normalize_school, state_code  # noqa: E402

PROSPECTS = FINAL_DIR / "prospects.csv"
NAME_RATIO = 0.85

# Directory, review, social, retail and news hosts that name schools but are not them.
REJECT_HOSTS = re.compile(
    r"(usnews|niche\.com|greatschools|schooldigger|publicschoolreview|privateschoolreview|"
    r"nfhsnetwork|maxpreps|hudl\.com|facebook|instagram|twitter|x\.com|youtube|tiktok|linkedin|"
    r"wikipedia|wikimedia|donorschoose|propublica|amazon|ebay|etsy|gettyimages|classmates|"
    r"alumniclass|ballotpedia|nces\.ed\.gov|zillow|realtor|redfin|trulia|homes\.com|yelp|"
    r"mapquest|blastathletics|musicforall|bandsofamerica|dci\.org|athletic\.net|scorebooklive|"
    r"k12academics|homefacts|high-schools\.com|elementaryschools\.org|schoolsnearme|"
    r"schoolandcollegelistings|publicschoolsk12|indeed|glassdoor|yellowpages|mapcarta|"
    r"google\.|bing\.|apple\.com|pinterest|reddit|patch\.com|wikia|fandom|spotify|"
    r"teamsnap|leaguelineup|gofundme|snapraise|bandapp|charmsoffice|cutoff|"
    r"athletic|sports|football|basketball|baseball|soccer|lacrosse|hoops|fb\.|booster|alumni|"
    r"foundation|(times|news|tribune|herald|gazette|journal|daily|press)(\.|$))",
    re.I)
BAND_HOST = re.compile(r"band|drumline|colorguard|guard", re.I)
MAX_PATH_DEPTH = 3   # a school homepage is shallow; /news/some-story/... is an article
SCHOOL_HOST = re.compile(r"(k12|isd|schools?|sd\.|usd|csd|cusd|ccsd|psd|district|boe|academy|"
                         r"\.edu$|\.us$|hs\.|-hs|highschool)", re.I)
GENERIC_WORDS = {"high", "school", "middle", "senior", "junior", "academy", "the", "of",
                 "county", "central", "north", "south", "east", "west", "regional", "magnet",
                 "marching", "band", "area", "community", "public", "city"}


def _host(url: str) -> str:
    return re.sub(r"^www\.", "", urlsplit(url).netloc.lower().split(":")[0])


def name_matches(candidate: str, school: str) -> bool:
    a, b = normalize_school(candidate), normalize_school(school)
    if not a or not b:
        return False
    if a == b:
        return True
    # One name may contain the other ("Southeast Raleigh Magnet" / "Southeast Raleigh"),
    # but a single generic word ("Vista") never stands for a whole name.
    short, long_ = sorted((a, b), key=len)
    if len(short.split()) >= 2 and f" {short} " in f" {long_} ":
        return True
    return difflib.SequenceMatcher(None, a, b).ratio() >= NAME_RATIO


def distinctive_words(school: str) -> list[str]:
    return [w for w in re.findall(r"[a-z]+", school.lower()) if len(w) >= 5 and w not in GENERIC_WORDS]


def wants_middle(school: str) -> bool:
    return bool(re.search(r"\b(middle|junior high|jr\.? high)\b", school, re.I))


def _kg_location(kg: dict) -> tuple[str, str]:
    """('Raleigh', 'NC') from "High school in Raleigh, North Carolina", else from address."""
    for text in (kg.get("type") or "", kg.get("description") or ""):
        m = re.search(r"\bin\s+([A-Z][A-Za-z.'\- ]+?),\s+([A-Z][A-Za-z ]+?)(?:,|\.|$| United States)", text)
        if m and state_code(m.group(2).strip()):
            return m.group(1).strip(), state_code(m.group(2).strip())
    addr = kg.get("address") or ""
    m = re.search(r",\s*([A-Z][A-Za-z.'\- ]+?),\s*([A-Z]{2})\b", addr)
    if m:
        return m.group(1).strip(), m.group(2)
    return "", ""


def pick_site(payload: dict, school: str, state: str = "") -> dict | None:
    """Decide from one Google result payload. Returns {website, city, state, via, note}
    or None. Pure: no network."""
    middle = wants_middle(school)
    kg = payload.get("knowledge_graph") or {}
    title = kg.get("title") or ""
    kind = (kg.get("type") or "") + " " + (kg.get("description") or "")
    if title and kg.get("website") and name_matches(title, school) and re.search(r"\bschool\b", kind, re.I):
        kg_middle = bool(re.search(r"\bmiddle school\b|\bjunior high\b", kind, re.I))
        if kg_middle == middle:
            city, st = _kg_location(kg)
            if state and st and st != state.upper():
                return None  # the panel is a different school in another state
            host = _host(kg["website"])
            if host and not REJECT_HOSTS.search(host):
                return {"website": kg["website"].strip(), "city": city, "state": st,
                        "via": "knowledge_graph",
                        "note": f"search: website via Google knowledge panel '{title}'"}
    if not state:
        return None  # same-named schools exist in many states; only a panel can place one
    words = distinctive_words(school)
    for r in payload.get("organic_results") or []:
        link = r.get("link") or ""
        host = _host(link)
        if not host or REJECT_HOSTS.search(host):
            continue
        if len([p for p in urlsplit(link).path.split("/") if p]) > MAX_PATH_DEPTH:
            continue
        # The school's own word must start a host label ("southeastraleighhs.wcpss.net"),
        # not hide inside another word ("ridge" in "cambridge").
        own_name = any(re.search(rf"(^|[.-]){w}", host) for w in words)
        if not (SCHOOL_HOST.search(host) or own_name):
            continue
        rtitle = (r.get("title") or "").split(" | ")[0].split(" - ")[0].split(" – ")[0]
        if not name_matches(rtitle, school) and not (own_name and name_matches(r.get("title") or "", school)):
            continue
        if wants_middle(rtitle) != middle:
            continue
        if BAND_HOST.search(host):
            return {"website": "", "band_url": link, "city": "", "state": "", "via": "band_site",
                    "note": f"search: band program site via Google result '{rtitle.strip()}'"}
        return {"website": link, "city": "", "state": "", "via": "organic",
                "note": f"search: website via Google result '{rtitle.strip()}'"}
    return None


def query_for(row: dict) -> str:
    q = f'"{row["school"]}"'
    st = (row.get("state") or "").upper()
    if st in STATES:
        q += f" {STATES[st]}"
    return q


def _note(row: dict, text: str) -> None:
    if text and text not in (row.get("notes") or ""):
        row["notes"] = "; ".join(x for x in [(row.get("notes") or "").strip("; "), text] if x)


def _add_source(row: dict, url: str) -> None:
    urls = [u for u in (row.get("source_urls") or "").split("; ") if u]
    if url and url not in urls:
        urls.append(url)
    row["source_urls"] = "; ".join(urls)


def nces_unique_national(row: dict, nces) -> dict | None:
    """A stateless row whose exact normalized name exists once in NCES nationwide."""
    key = normalize_school(row["school"])
    if not key:
        return None
    pool = nces[nces["key"] == key]
    is_middle = pool["level"].fillna("").str.startswith("Middle")
    pool = pool[is_middle] if wants_middle(row["school"]) else pool[~is_middle]
    if len(pool) != 1:
        return None
    return pool.iloc[0].to_dict()


def apply_nces(row: dict, rec: dict, note: str) -> None:
    row["state"] = row.get("state") or (rec.get("state") or "")
    row["city"] = row.get("city") or str(rec.get("city") or "").title()
    row["district"] = row.get("district") or (rec.get("lea_name") or "")
    if not row.get("enrollment") and rec.get("enrollment") and str(rec["enrollment"]) != "nan":
        row["enrollment"] = str(rec["enrollment"]).split(".")[0]
    site = str(rec.get("website") or "").strip()
    if not row.get("school_url") and site and site != "nan":
        row["school_url"] = site.replace("\\", "/")
        _add_source(row, row["school_url"])
    if not row.get("level") and rec.get("level"):
        lv = str(rec["level"])
        row["level"] = "High" if lv.startswith(("High", "Secondary")) else "Middle" if lv.startswith("Middle") else "Other"
    _note(row, note)
    row["notes"] = "; ".join(n for n in row["notes"].split("; ")
                             if n not in ("nces: skipped (state unknown)", "state unknown: source lists no location"))


def same_name_in_state(school: str, state: str, nces) -> int:
    """How many NCES schools carry this exact normalized name in the state."""
    if nces is None or not state:
        return 0
    key = _bare_key(normalize_school(school))
    pool = nces[nces["state"] == state.upper()]
    pool = pool[pool["key"].map(_bare_key) == key]
    is_middle = pool["level"].fillna("").str.startswith("Middle")
    pool = pool[is_middle] if wants_middle(school) else pool[~is_middle]
    return len(pool)


def national_candidates(school: str, nces) -> list[dict]:
    """NCES schools anywhere whose name contains this school's name as whole words
    ("Southeast Raleigh Magnet High" contains "Southeast Raleigh")."""
    if nces is None:
        return []
    key = _bare_key(normalize_school(school))
    if not key:
        return []
    pool = nces[nces["key"].map(lambda k: f" {key} " in f" {_bare_key(k)} ")]
    is_middle = pool["level"].fillna("").str.startswith("Middle")
    pool = pool[is_middle] if wants_middle(school) else pool[~is_middle]
    return [r._asdict() for r in pool.itertuples(index=False)]


def placement(row: dict, pick: dict, nces) -> str:
    """For a row with no state: '' when the panel's state is confirmed by the one
    NCES school of that name nationwide, else the reason it cannot be placed."""
    cands = national_candidates(row["school"], nces)
    states = sorted({c["state"] for c in cands})
    if len(cands) == 1 and cands[0]["state"] == pick.get("state"):
        return ""
    if not cands:
        return "not placed: name unknown to NCES, so the panel's state cannot be confirmed"
    return f"not placed: '{row['school']}' exists in {', '.join(states)} ({len(cands)} NCES schools)"


def _bare_key(key: str) -> str:
    """'salem high' and 'salem' are the same school name (NCES often drops 'School')."""
    return re.sub(r"\s+(high|middle|junior high)$", "", key).strip()


def _same_city(a: str, b: str) -> bool:
    """'Laporte' ~ 'La Porte'; 'Niceville' ~ 'Niceville High School' (a city column that
    carries the school name)."""
    x, y = (re.sub(r"[^a-z]", "", s.lower()) for s in (a, b))
    return bool(x and y) and (x in y or y in x)


def ambiguity(row: dict, pick: dict, nces) -> str:
    """Reason to refuse a pick, or ''. The pick is only trusted when NCES knows
    exactly one school of that name in the state, or the cities agree. A county or
    township in the panel is not a city and settles nothing."""
    state = row.get("state") or pick.get("state") or ""
    n = same_name_in_state(row["school"], state, nces)
    city = (row.get("city") or "").strip()
    pcity = (pick.get("city") or "").strip()
    if n == 1:
        return ""
    if city and pcity and not _same_city(city, pcity):
        where = "a county/township" if re.search(r"\b(county|township|parish)$", pcity, re.I) else pcity
        return (f"Google knowledge panel is in {where}, not {city}, and {n or 'no'} NCES schools "
                f"carry this name in {state}; not used")
    if not city and n > 1:
        return f"ambiguous: {n} NCES schools named '{row['school']}' in {state}; site not used"
    return ""


def resolve_row(row: dict, nces, dry_run: bool = False) -> str:
    """Fill what can be filled; return a one-word outcome for the log."""
    if not row.get("state") and nces is not None:
        rec = nces_unique_national(row, nces)
        if rec is not None:
            apply_nces(row, rec, f"nces: unique national match '{rec['sch_name']}, {rec['city']} {rec['state']}'")
            if row.get("school_url"):
                return "nces-unique"
    q = query_for(row)
    if dry_run and not serpapi.cache_path("google", q).exists():
        return "uncached"
    payload = serpapi.search("google", q, num=10)
    pick = pick_site(payload, row["school"], row.get("state", ""))
    if pick and pick["via"] != "band_site":
        why = ambiguity(row, pick, nces) if row.get("state") else placement(row, pick, nces)
        if why:
            _note(row, f"search: {why}")
            return "ambiguous"
    if not pick:
        _note(row, "search: no school site found")
        return "none"
    if pick["via"] == "band_site":
        if not row.get("band_url"):
            row["band_url"] = pick["band_url"]
            _add_source(row, pick["band_url"])
        _note(row, pick["note"])
        return "band_site"
    row["school_url"] = pick["website"]
    _add_source(row, pick["website"])
    _note(row, pick["note"])
    if not row.get("state") and pick["state"]:
        row["state"] = pick["state"]
        row["city"] = row.get("city") or pick["city"]
        _note(row, "search: state from Google knowledge panel, confirmed by the one NCES school of this name")
        row["notes"] = "; ".join(n for n in row["notes"].split("; ")
                                 if n not in ("nces: skipped (state unknown)", "state unknown: source lists no location"))
        if nces is not None:
            from scripts.enrich import match_nces, MATCH_THRESHOLD
            rec, ratio, others = match_nces(row, nces)
            if rec is not None and ratio >= MATCH_THRESHOLD:
                apply_nces(row, rec, "" if ratio >= 1.0 else f"nces: matched '{rec['sch_name']}' ({ratio:.2f})")
            elif rec is not None:
                _note(row, f"nces: low-confidence match '{rec['sch_name']}, {rec['city']}' ({ratio:.2f})")
            else:
                _note(row, "nces: no match")
    return pick["via"]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true", help="use cached searches only; write nothing")
    ap.add_argument("--no-nces", action="store_true", help="skip the NCES directory (faster; no state fills)")
    a = ap.parse_args(argv)

    with PROSPECTS.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    targets = [i for i, r in enumerate(rows) if not r.get("school_url")]
    targets.sort(key=lambda i: (-int(rows[i]["parades_marched"] or 0), rows[i]["school"]))
    if a.limit:
        targets = targets[: a.limit]
    nces = None
    if not a.no_nces:
        from scripts.enrich import load_nces
        print("[nces] loading Common Core of Data ...")
        nces = load_nces()
    uncached = sum(1 for i in targets if not serpapi.cache_path("google", query_for(rows[i])).exists())
    if not a.dry_run:
        try:
            serpapi.ensure_quota(uncached)
        except BlockedSource as e:
            print(f"BLOCKED: {e}")
            return 1
    print(f"{len(targets)} rows without school_url; {uncached} searches needed")

    outcomes: dict[str, int] = {}
    for n, i in enumerate(targets, 1):
        r = rows[i]
        try:
            out = resolve_row(r, nces, a.dry_run)
        except BlockedSource as e:
            print(f"BLOCKED at {r['school']}: {e}")
            break
        outcomes[out] = outcomes.get(out, 0) + 1
        print(f"[{n}/{len(targets)}] {r['school']} ({r['state'] or '??'}): {out} "
              f"{r['school_url'] or '-'}")
        if not a.dry_run:
            with PROSPECTS.open("w", newline="", encoding="utf-8") as f:  # checkpoint each row
                w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
                w.writeheader()
                w.writerows(rows)
    print("\ndone:", ", ".join(f"{k}={v}" for k, v in sorted(outcomes.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
