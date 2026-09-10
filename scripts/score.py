"""Score each prospect 0-100 and assign tiers.

Usage: python scripts/score.py [--year 2026]

Weights and geography are config dicts so the list can be retargeted for other
parades (e.g. a Rose Parade offer would move the geography weight west).
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scrapers.common import COLUMNS, FINAL_DIR  # noqa: E402

PROSPECTS = FINAL_DIR / "prospects.csv"
TIER_A = FINAL_DIR / "tier_a.csv"

WEIGHTS = {
    "parades_marched": 30,   # more nationally televised parades = higher
    "recency": 20,           # last_appearance 2024+ full points, -5 pts/yr before
    "boa_finalist": 15,      # BOA finalist years
    "travel_signal": 15,     # any Rose / Macy's / Hollywood = has flown a full band cross-country
    "geography": 20,         # proximity to Orlando for the Universal Veterans Day target
    "contact_bonus": 5,      # a published director email exists
}

# Fraction of the geography weight by state. Everything else gets GEOGRAPHY_DEFAULT.
GEOGRAPHY = {
    "FL": 1.0,
    "GA": 0.75, "AL": 0.75, "SC": 0.75, "NC": 0.75, "TN": 0.75,
    "MS": 0.5, "LA": 0.5, "AR": 0.5, "KY": 0.5, "VA": 0.5, "WV": 0.5, "TX": 0.5,
}
GEOGRAPHY_DEFAULT = 0.25

PARADES_FULL_AT = 5          # parades_marched at/above this scores the full weight
RECENCY_FULL_YEAR = 2024     # last_appearance at/after this scores the full weight
RECENCY_DECAY_PER_YEAR = 5
BOA_FULL_AT = 3
TRAVEL_PARADES = ("Rose", "Macy's", "Hollywood")
TIER_A_SIZE = 50
TIER_B_SIZE = 100


def score_row(r: dict, full_year: int = RECENCY_FULL_YEAR) -> tuple[float, dict]:
    parts = {}
    n = int(r.get("parades_marched") or 0)
    parts["parades_marched"] = WEIGHTS["parades_marched"] * min(n, PARADES_FULL_AT) / PARADES_FULL_AT

    last = int(r.get("last_appearance") or 0)
    if last >= full_year:
        parts["recency"] = float(WEIGHTS["recency"])
    elif last:
        parts["recency"] = max(0.0, WEIGHTS["recency"] - RECENCY_DECAY_PER_YEAR * (full_year - last))
    else:
        parts["recency"] = 0.0

    boa = [y for y in (r.get("boa_finalist_years") or "").split(";") if y.strip()]
    parts["boa_finalist"] = WEIGHTS["boa_finalist"] * min(len(boa), BOA_FULL_AT) / BOA_FULL_AT

    parades = r.get("parades") or ""
    travel = any(p.startswith(t) for p in parades.split("; ") for t in TRAVEL_PARADES)
    parts["travel_signal"] = float(WEIGHTS["travel_signal"]) if travel else 0.0

    parts["geography"] = WEIGHTS["geography"] * GEOGRAPHY.get((r.get("state") or "").upper(), GEOGRAPHY_DEFAULT)
    parts["contact_bonus"] = float(WEIGHTS["contact_bonus"]) if (r.get("director_email") or "").strip() else 0.0

    total = max(0.0, min(100.0, sum(parts.values())))
    return round(total, 1), parts


def assign_tiers(rows: list[dict]) -> None:
    ranked = sorted(rows, key=lambda r: (-float(r["score"]), -int(r.get("parades_marched") or 0), r["school"]))
    for i, r in enumerate(ranked):
        r["tier"] = "A" if i < TIER_A_SIZE else "B" if i < TIER_A_SIZE + TIER_B_SIZE else "C"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, default=RECENCY_FULL_YEAR,
                    help="last_appearance year that earns full recency points")
    a = ap.parse_args(argv)
    with PROSPECTS.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["score"], _ = score_row(r, a.year)
    assign_tiers(rows)
    rows.sort(key=lambda r: (-float(r["score"]), r["school"]))
    with PROSPECTS.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    tier_a = [r for r in rows if r["tier"] == "A"]
    with TIER_A.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        w.writeheader()
        w.writerows(tier_a)
    from collections import Counter
    tiers = Counter(r["tier"] for r in rows)
    print(f"scored {len(rows)} schools: A={tiers['A']} B={tiers['B']} C={tiers['C']}")
    print("top 10:")
    for r in rows[:10]:
        print(f"  {r['score']:>5}  {r['school']} ({r['state'] or '??'})  {r['parades'][:70]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
