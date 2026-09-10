"""QA pass over data/final/prospects.csv. Each check reports what it found and, with
--fix, repairs the rows it can repair without guessing.

Usage:
  python scripts/qa.py                 # report only
  python scripts/qa.py --fix           # apply repairs, then run `make score` and `make export`
  python scripts/qa.py --check nces-prefix

Checks (report only unless noted):
  non-band      rows the exclusion rules now reject; --fix rebuilds from the interim
                CSVs (run_all --merge-only) so they move to excluded.csv
  twins         the same school name more than once (stateless twin or shared name)
  states        invalid state codes; NCES-unmatched rows whose exact name exists
                nationwide only in another state
  parades       rows with no parade appearance or no source_url
  email-domain  director_email not on the school_url domain
  dead-urls     every URL requested once (needs --network; slow, throttled)
  nces-prefix   NCES matches that came from the prefix boost in enrich.match_nces
                (noted as `nces: matched '<name>' (0.92)`). A prefix match is wrong
                when the row name carries a word that names a *different* school in
                the same district ("Olentangy Orange" matched "Olentangy High School"
                while "Orange High School" exists in Olentangy Local), and ambiguous
                when several NCES schools in the state extend the same prefix
                ("Downingtown HS East Campus" / "West Campus"). A wrong match is
                re-pointed to the school that carries the word when exactly one does;
                an ambiguous match has its enrollment blanked and the candidates noted.
                District is kept only when every candidate shares it.
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scrapers.common import COLUMNS, FINAL_DIR  # noqa: E402
from scrapers.normalize import normalize_school  # noqa: E402

PROSPECTS = FINAL_DIR / "prospects.csv"
MATCH_NOTE = re.compile(r"nces: matched '([^']+)' \((0\.\d+)\)")
GENERIC = {"high", "school", "senior", "sr", "jr", "junior", "community", "township", "twp",
           "regional", "area", "hs", "shs", "campus", "the", "of", "public", "city", "county"}


def bare(name: str) -> str:
    """Name without its level word: NCES writes 'Avon High', 'East Hills MS'."""
    return re.sub(r"\s+(middle school|junior high school|junior high|high|middle|ms|jhs|shs)$", "",
                  normalize_school(name)).strip()


def words(name: str) -> set[str]:
    return {w for w in bare(name).split() if w not in GENERIC}


def _note(row: dict, text: str) -> None:
    if text and text not in (row.get("notes") or ""):
        row["notes"] = "; ".join(x for x in [(row.get("notes") or "").strip("; "), text] if x)


def _pool(nces, state: str, want_middle: bool):
    pool = nces[nces["state"] == state.upper()]
    is_middle = pool["level"].fillna("").str.startswith("Middle")
    return pool[is_middle] if want_middle else pool[~is_middle]


def check_nces_prefix(rows: list[dict], nces, fix: bool = False) -> list[str]:
    """Returns one report line per finding; repairs rows in place when fix=True."""
    findings: list[str] = []
    for r in rows:
        m = MATCH_NOTE.search(r.get("notes") or "")
        if not m or m.group(2) != "0.92" or not r.get("state"):
            continue
        matched_name = m.group(1)
        want_middle = bool(re.search(r"\bmiddle\b|junior high", r["school"], re.I))
        pool = _pool(nces, r["state"], want_middle)
        matched = pool[pool["sch_name"] == matched_name]
        if matched.empty:
            continue
        rec = matched.iloc[0]
        row_key, rec_key = bare(r["school"]), bare(rec["sch_name"])

        # 1. A word on the row side that names another school in the same district.
        extra = words(r["school"]) - words(rec["sch_name"])
        same_lea = pool[(pool["lea_name"] == rec["lea_name"]) & (pool["ncessch"] != rec["ncessch"])]
        others = same_lea[same_lea["key"].map(lambda k: bool(extra & set(k.split())))]
        if extra and len(others) >= 1:
            names = ", ".join(f"{o.sch_name} ({o.city})" for o in others.itertuples())
            if len(others) == 1:
                o = others.iloc[0]
                findings.append(f"WRONG  {r['school']} ({r['state']}): matched '{matched_name}' but "
                                f"'{o['sch_name']}' in the same district carries '{', '.join(sorted(extra & set(o['key'].split())))}'")
                if fix:
                    r["district"] = o["lea_name"] or r["district"]
                    r["enrollment"] = str(o["enrollment"]).split(".")[0] if str(o.get("enrollment", "")) not in ("", "nan") else ""
                    if not r.get("city"):   # never replace a city already on the row
                        r["city"] = str(o["city"]).title()
                    if r.get("school_url") and str(rec.get("website")) == r["school_url"]:
                        r["school_url"] = ""
                    if not r.get("school_url") and str(o.get("website")) not in ("", "nan"):
                        r["school_url"] = str(o["website"]).strip()
                    r["notes"] = MATCH_NOTE.sub(f"nces: prefix match '{matched_name}' corrected to "
                                                f"'{o['sch_name']}' (same district; name carries the row's word)",
                                                r["notes"])
            else:
                findings.append(f"AMBIG  {r['school']} ({r['state']}): matched '{matched_name}'; "
                                f"same-district schools carrying the row's words: {names}")
                if fix:
                    _blank_ambiguous(r, matched_name, others)
            continue

        # 2. Several NCES schools extend the row's name (campuses): nothing picks one.
        ext = pool[pool["key"].map(lambda k: k == row_key or k.startswith(row_key + " "))]
        if len(ext) >= 2 and rec_key != row_key:
            city = (r.get("city") or "").strip().lower()
            in_city = ext[ext["city_key"] == city] if city else ext
            if len(in_city) != 1:
                names = ", ".join(f"{o.sch_name} ({o.city})" for o in ext.itertuples())
                findings.append(f"AMBIG  {r['school']} ({r['state']}): matched '{matched_name}' but "
                                f"{len(ext)} NCES schools extend the name: {names}")
                if fix:
                    _blank_ambiguous(r, matched_name, ext)
    return findings


def _blank_ambiguous(r: dict, matched_name: str, cands) -> None:
    leas = set(cands["lea_name"].fillna(""))
    if len(leas) != 1:
        r["district"] = ""
    r["enrollment"] = ""
    sites = {str(w) for w in cands["website"].fillna("")}
    if r.get("school_url") in sites:
        r["school_url"] = ""
    names = ", ".join(f"{o.sch_name} ({o.city})" for o in cands.itertuples())
    r["notes"] = MATCH_NOTE.sub(f"nces: prefix match '{matched_name}' withdrawn as ambiguous; "
                                f"candidates: {names}", r["notes"])


def check_non_band(rows: list[dict], nces, fix: bool = False) -> list[str]:
    """Rows the exclusion rules now reject (rules tightened after the row was merged).
    Fix: rebuild prospects.csv from the interim CSVs (run_all --merge-only), which
    routes them to excluded.csv and carries every enrichment column over."""
    from scrapers.exclusions import exclusion_reason
    findings = []
    for r in rows:
        why = exclusion_reason(r["school"], r.get("band_name", ""), r.get("city", ""), r.get("state", ""))
        if why:
            findings.append(f"EXCLUDE {r['school']} ({r['state'] or '??'}): {why}")
    if findings and fix:
        import subprocess
        subprocess.run([sys.executable, str(Path(__file__).with_name("run_all.py")), "--merge-only"],
                       check=True, stdout=subprocess.DEVNULL)
        with PROSPECTS.open(encoding="utf-8") as f:
            rebuilt = list(csv.DictReader(f))
        rows[:] = rebuilt
    return findings


def check_twins(rows: list[dict], nces, fix: bool = False) -> list[str]:
    """The same normalized name more than once: a stateless row that may be one of
    the stated ones, or two schools that share a name. Report only; folding is a
    decision, not a fact."""
    by_name: dict[str, list[dict]] = {}
    for r in rows:
        by_name.setdefault(normalize_school(r["school"]), []).append(r)
    out = []
    for name, group in by_name.items():
        if len(group) > 1:
            desc = "; ".join(f"{g['state'] or '??'}: {g['parades']}" for g in group)
            out.append(f"TWINS  {group[0]['school']}: {desc}")
    return out


def check_states(rows: list[dict], nces, fix: bool = False) -> list[str]:
    """Invalid state codes, and rows NCES could not match whose exact name exists
    nationwide only in a different state (a source that listed the wrong state).
    Report only."""
    from scrapers.normalize import STATES
    out = []
    for r in rows:
        st = r.get("state") or ""
        if st and st not in STATES:
            out.append(f"STATE  {r['school']}: invalid state code '{st}'")
            continue
        if st and "nces: no match" in (r.get("notes") or "") and nces is not None:
            want_middle = bool(re.search(r"\bmiddle\b|junior high", r["school"], re.I))
            key = bare(r["school"])
            pool = nces[nces["key"].map(bare) == key]
            is_middle = pool["level"].fillna("").str.startswith("Middle")
            pool = pool[is_middle] if want_middle else pool[~is_middle]
            # Only a name that exists exactly once nationwide is evidence; names with
            # several namesakes (Martin Luther King Jr.) are just unmatched.
            if len(pool) == 1 and pool.iloc[0]["state"] != st:
                rec = pool.iloc[0]
                out.append(f"STATE  {r['school']}: listed as {st}, but the only NCES school of this "
                           f"name is '{rec['sch_name']}' in {rec['city']}, {rec['state']}")
    return out


def check_parades(rows: list[dict], nces, fix: bool = False) -> list[str]:
    out = []
    for r in rows:
        if not r.get("parades") or str(r.get("parades_marched") or "0") == "0":
            out.append(f"PARADE {r['school']} ({r['state'] or '??'}): no parade appearance recorded")
        if not r.get("source_urls"):
            out.append(f"SOURCE {r['school']} ({r['state'] or '??'}): no source_url")
    return out


def check_email_domain(rows: list[dict], nces, fix: bool = False) -> list[str]:
    from scripts.enrich import _domain
    out = []
    for r in rows:
        email, site = r.get("director_email") or "", r.get("school_url") or ""
        if email and site and _domain("https://" + email.split("@")[-1]) != _domain(site):
            out.append(f"EMAIL  {r['school']} ({r['state']}): {email} is not on the school domain {_domain(site)}")
    return out


def check_dead_urls(rows: list[dict], nces, fix: bool = False) -> list[str]:
    """Every distinct URL in source_urls, school_url and band_url is requested once
    (HEAD, then GET when HEAD is refused), throttled per host. Needs --network."""
    import requests
    from scrapers.common import USER_AGENT, TIMEOUT, _throttle
    from urllib.parse import urlsplit
    urls: dict[str, list[str]] = {}
    for r in rows:
        for u in (r.get("source_urls") or "").split("; ") + [r.get("school_url") or "", r.get("band_url") or ""]:
            if u:
                urls.setdefault(u, []).append(r["school"])
    out = []
    s = requests.Session()
    s.headers["User-Agent"] = USER_AGENT
    for u, schools in sorted(urls.items()):
        host = urlsplit(u).netloc.lower()
        status = ""
        try:
            _throttle(host)
            resp = s.head(u, timeout=TIMEOUT, allow_redirects=True)
            if resp.status_code in (403, 405, 501) or resp.status_code >= 500:
                _throttle(host)
                resp = s.get(u, timeout=TIMEOUT, allow_redirects=True, stream=True)
                resp.close()
            if resp.status_code >= 400:
                status = f"HTTP {resp.status_code}"
        except requests.RequestException as e:
            status = type(e).__name__
        if status:
            out.append(f"URL    {status}: {u}  (rows: {', '.join(sorted(set(schools))[:3])})")
    return out


CHECKS = {
    "non-band": check_non_band,
    "nces-prefix": check_nces_prefix,
    "twins": check_twins,
    "states": check_states,
    "parades": check_parades,
    "email-domain": check_email_domain,
}
NETWORK_CHECKS = {"dead-urls": check_dead_urls}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", choices=sorted(CHECKS | NETWORK_CHECKS), action="append")
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--network", action="store_true", help="also run the dead-urls check")
    a = ap.parse_args(argv)
    with PROSPECTS.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    names = a.check or (list(CHECKS) + (list(NETWORK_CHECKS) if a.network else []))
    nces = None
    if any(n in ("nces-prefix", "states") for n in names):
        from scripts.enrich import load_nces
        print("[nces] loading Common Core of Data ...")
        nces = load_nces()
    total = 0
    for name in names:
        findings = (CHECKS | NETWORK_CHECKS)[name](rows, nces, fix=a.fix)
        print(f"\n== {name}: {len(findings)} finding(s)")
        for line in findings:
            print("  " + line)
        total += len(findings)
    if a.fix:
        with PROSPECTS.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)
        print(f"\nwrote {PROSPECTS}; run `make score` and `make export`")
    return 0 if (a.fix or total == 0) else 1


if __name__ == "__main__":
    sys.exit(main())
