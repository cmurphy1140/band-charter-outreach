"""Run every discovery scraper, write per-source interim CSVs, and merge them into
data/final/prospects.csv.

Usage:
  python scripts/run_all.py                # full discovery for 2015-2027
  python scripts/run_all.py --years 2026,2027   # only those parade years
  python scripts/run_all.py --merge-only   # rebuild prospects.csv from interim CSVs
  python scripts/run_all.py --refresh      # current + next year, merge into existing
                                           # prospects.csv, print a diff, log to CHANGELOG
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scrapers import boa, cached_only, heb, hollywood, philly, wikipedia_rose  # noqa: E402
from scrapers.common import (COLUMNS, FINAL_DIR, INTERIM_DIR, INTERIM_COLUMNS, BlockedSource,  # noqa: E402
                             Row, write_interim, write_blocked, clear_blocked)
from scrapers.exclusions import exclusion_reason  # noqa: E402
from scrapers.normalize import normalize_school, clean_school  # noqa: E402

PROSPECTS = FINAL_DIR / "prospects.csv"
EXCLUDED = INTERIM_DIR / "excluded.csv"
BLOCKED = INTERIM_DIR / "_blocked.json"
CHANGELOG = FINAL_DIR / "CHANGELOG.md"

LIVE_SOURCES = {
    "wikipedia_rose": wikipedia_rose,
    "philly": philly,
    "hollywood": hollywood,
    "heb": heb,
    "boa": boa,
}


def write_interim_scoped(name: str, rows: list[Row], years) -> None:
    """Write a source's interim CSV. A year-scoped run replaces only those years and
    keeps every other year already on disk, so history survives `make refresh`."""
    if years:
        existing = INTERIM_DIR / f"{name}.csv"
        kept: list[Row] = []
        if existing.exists():
            with existing.open(encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    y = int(r["year"]) if r.get("year") else None
                    if y not in years:
                        kept.append(Row(school=r["school"], band_name=r["band_name"], city=r["city"],
                                        state=r["state"], event=r["event"], year=y,
                                        source_url=r["source_url"]))
        rows = kept + list(rows)
    seen = set()
    unique = []
    for r in rows:
        key = (r.school.lower(), r.event, r.year)
        if key not in seen:
            seen.add(key)
            unique.append(r)
    write_interim(name, unique)


def run_scrapers(years) -> dict[str, int]:
    counts: dict[str, int] = {}
    for name, mod in LIVE_SOURCES.items():
        try:
            rows = mod.scrape(years=years) if years else mod.scrape()
        except BlockedSource as e:
            write_blocked(name, str(e), [getattr(mod, "URL", getattr(mod, "ARCHIVE", ""))])
            print(f"[{name}] BLOCKED: {e}")
            continue
        clear_blocked(name)
        write_interim_scoped(name, rows, years)
        counts[name] = len(rows)
        print(f"[{name}] {len(rows)} rows")
        if name == "boa" and boa.pdf_only_events:
            print(f"[boa] {len(boa.pdf_only_events)} regional events publish results as PDF only "
                  f"(not parsed); Grand National finalists parsed from HTML")
    for name in cached_only.GENERIC_SOURCES:
        rows, reason = cached_only.scrape_source(name)
        if reason:
            write_blocked(name, reason, cached_only.GENERIC_SOURCES[name]["urls"])
            print(f"[{name}] BLOCKED: {reason}")
            continue
        if years:
            rows = [r for r in rows if r.year in years]
        if not rows:
            reason = ("page fetched but no lineup found: "
                      + cached_only.GENERIC_SOURCES[name]["reason"])
            write_blocked(name, reason, cached_only.GENERIC_SOURCES[name]["urls"])
            print(f"[{name}] NO DATA: {reason}")
            continue
        clear_blocked(name)
        write_interim_scoped(name, rows, years)
        counts[name] = len(rows)
        print(f"[{name}] {len(rows)} rows (from cached pages)")
    return counts


def load_interim() -> list[dict]:
    rows = []
    for p in sorted(INTERIM_DIR.glob("*.csv")):
        if p.name == "excluded.csv":
            continue
        with p.open(encoding="utf-8") as f:
            for r in csv.DictReader(f):
                r["_source"] = p.stem
                rows.append(r)
    return rows


def merge(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """Dedupe by (normalized school, state) and merge parade history."""
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    excluded = []
    for r in rows:
        school = clean_school(r.get("school", ""))
        reason = exclusion_reason(school, r.get("band_name", ""), r.get("city", ""),
                                  r.get("state", ""))
        if reason:
            excluded.append({**r, "exclusion_reason": reason})
            continue
        key = (normalize_school(school), (r.get("state") or "").upper())
        groups[key].append({**r, "school": school})

    # Second pass: a stateless row whose normalized name matches exactly one stated
    # group is folded into it (Hollywood listings carry no state).
    stateless = [k for k in groups if not k[1]]
    by_name: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for k in groups:
        if k[1]:
            by_name[k[0]].append(k)
    for k in stateless:
        cands = by_name.get(k[0], [])
        if len(cands) == 1:
            groups[cands[0]].extend(groups.pop(k))

    out = []
    for (nkey, state), items in groups.items():
        parades: dict[str, int] = {}
        boa_years = set()
        sources = []
        band = ""
        city = ""
        for it in items:
            ev, yr = it.get("event", ""), it.get("year", "")
            tag = f"{ev} {yr}".strip()
            if ev.startswith("BOA") and yr:
                boa_years.add(int(yr))
            parades[tag] = int(yr) if yr else 0
            if it.get("source_url") and it["source_url"] not in sources:
                sources.append(it["source_url"])
            band = band or it.get("band_name", "")
            c = it.get("city", "")
            # A nickname glued to the city ("The Pride of Broken Arrow") is not a city.
            if c and re.search(r"\b(pride|band|marching|regiment|sound|spirit)\b", c, re.I):
                if not band:
                    band = c
                c = ""
            city = city or c
        # Prefer the most common display name among merged rows.
        name = Counter(it["school"] for it in items).most_common(1)[0][0]
        ordered = sorted(parades.items(), key=lambda kv: (-kv[1], kv[0]))
        years = [y for _, y in ordered if y]
        out.append({
            "school": name, "band_name": band, "city": city, "state": state,
            "district": "", "enrollment": "",
            "parades": "; ".join(t for t, _ in ordered),
            "parades_marched": len(parades),
            "last_appearance": max(years) if years else "",
            "boa_finalist_years": "; ".join(str(y) for y in sorted(boa_years, reverse=True)),
            "school_url": "", "band_url": "", "director_name": "", "director_email": "",
            "director_phone": "", "booster_org": "",
            "source_urls": "; ".join(sources),
            "score": "", "tier": "",
            "notes": "" if state else "state unknown: source lists no location",
        })
    out.sort(key=lambda r: (-r["parades_marched"], r["state"], r["school"]))
    return out, excluded


def read_prospects() -> list[dict]:
    if not PROSPECTS.exists():
        return []
    with PROSPECTS.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_prospects(rows: list[dict]) -> None:
    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    with PROSPECTS.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def write_excluded(rows: list[dict]) -> None:
    with EXCLUDED.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=INTERIM_COLUMNS + ["_source", "exclusion_reason"],
                           extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def carry_over(new_rows: list[dict], old_rows: list[dict]) -> list[dict]:
    """Keep enrichment/scoring columns from an existing prospects.csv on rebuild."""
    keep = ["district", "enrollment", "school_url", "band_url", "director_name",
            "director_email", "director_phone", "booster_org", "score", "tier", "notes"]
    old = {(normalize_school(r["school"]), r["state"]): r for r in old_rows}
    for r in new_rows:
        o = old.get((normalize_school(r["school"]), r["state"]))
        if not o:
            continue
        for k in keep:
            if o.get(k):
                r[k] = o[k]
        if o.get("band_name") and not r["band_name"]:
            r["band_name"] = o["band_name"]
        if o.get("city") and not r["city"]:
            r["city"] = o["city"]
        extra = [u for u in (o.get("source_urls") or "").split("; ") if u and u not in r["source_urls"]]
        if extra:
            r["source_urls"] = "; ".join([r["source_urls"], *extra]).strip("; ")
    return new_rows


def summary(rows: list[dict], excluded: list[dict]) -> None:
    print("\n=== Summary ===")
    print(f"total schools: {len(rows)}   (excluded non-prospect groups: {len(excluded)})")
    by_state = Counter(r["state"] or "??" for r in rows)
    print("by state:", ", ".join(f"{s}={n}" for s, n in sorted(by_state.items(), key=lambda x: -x[1])))
    by_parade = Counter()
    for r in rows:
        for tag in r["parades"].split("; "):
            if tag:
                by_parade[tag.rsplit(" ", 1)[0]] += 1
    print("by parade:", ", ".join(f"{p}={n}" for p, n in by_parade.most_common()))
    if BLOCKED.exists():
        data = json.loads(BLOCKED.read_text())
        if data:
            print("\nBLOCKED sources (no rows; save pages manually to unblock):")
            for name, info in data.items():
                print(f"  - {name}: {info['reason']}")
    if boa.pdf_only_events:
        print(f"\nBOA: {len(boa.pdf_only_events)} regional recap pages are PDF-only and were not parsed.")


def diff_and_log(old: list[dict], new: list[dict]) -> None:
    oldk = {(normalize_school(r["school"]), r["state"]): r for r in old}
    newk = {(normalize_school(r["school"]), r["state"]): r for r in new}
    added = [newk[k] for k in newk if k not in oldk]
    updated = []
    for k, r in newk.items():
        o = oldk.get(k)
        if o and (o["parades"] != r["parades"] or str(o["last_appearance"]) != str(r["last_appearance"])):
            updated.append((o, r))
    print(f"\n=== Refresh diff: {len(added)} new schools, {len(updated)} updated ===")
    for r in added:
        print(f"  + {r['school']} ({r['state']}): {r['parades']}")
    for o, r in updated:
        print(f"  ~ {r['school']} ({r['state']}): {o['parades']} -> {r['parades']}")
    today = dt.date.today().isoformat()
    entry = [f"## {today} refresh", "",
             f"- {len(added)} new schools, {len(updated)} updated, {len(new)} total", ""]
    entry += [f"- new: {r['school']} ({r['state']}): {r['parades']}" for r in added]
    entry += [f"- updated: {r['school']} ({r['state']}): {o['parades']} -> {r['parades']}" for o, r in updated]
    entry.append("")
    prev = CHANGELOG.read_text() if CHANGELOG.exists() else "# Changelog\n\n"
    CHANGELOG.write_text(prev + "\n".join(entry) + "\n")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", help="comma-separated parade years to scrape")
    ap.add_argument("--merge-only", action="store_true")
    ap.add_argument("--refresh", action="store_true",
                    help="scrape current+next year and merge into existing prospects.csv")
    a = ap.parse_args(argv)

    years = None
    if a.years:
        years = {int(y) for y in a.years.split(",")}
    if a.refresh:
        y = dt.date.today().year
        years = {y, y + 1}

    old = read_prospects()
    if not a.merge_only:
        run_scrapers(years)

    interim = load_interim()
    rows, excluded = merge(interim)
    rows = carry_over(rows, old)
    write_prospects(rows)
    write_excluded(excluded)
    summary(rows, excluded)
    if a.refresh:
        diff_and_log(old, rows)
    return 0


if __name__ == "__main__":
    sys.exit(main())
