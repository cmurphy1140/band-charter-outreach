"""QA pass over data/final/prospects.csv. Each check reports what it found and, with
--fix, repairs the rows it can repair without guessing.

Usage:
  python scripts/qa.py                 # report only
  python scripts/qa.py --fix           # apply repairs, then run `make score` and `make export`
  python scripts/qa.py --check nces-prefix

Checks:
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
    return re.sub(r"\s+(high|middle|junior high)$", "", normalize_school(name)).strip()


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


CHECKS = {"nces-prefix": check_nces_prefix}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", choices=sorted(CHECKS), action="append")
    ap.add_argument("--fix", action="store_true")
    a = ap.parse_args(argv)
    with PROSPECTS.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    from scripts.enrich import load_nces
    print("[nces] loading Common Core of Data ...")
    nces = load_nces()
    total = 0
    for name in a.check or sorted(CHECKS):
        findings = CHECKS[name](rows, nces, fix=a.fix)
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
