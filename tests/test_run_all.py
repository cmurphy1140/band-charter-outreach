import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "run_all", Path(__file__).resolve().parent.parent / "scripts" / "run_all.py")
run_all = importlib.util.module_from_spec(spec)
spec.loader.exec_module(run_all)


def _row(school, state, event, year, src, band="", city=""):
    return {"school": school, "band_name": band, "city": city, "state": state,
            "event": event, "year": str(year), "source_url": src, "_source": src}


def test_merge_dedupes_and_counts_parades():
    rows = [
        _row("Allen High School", "TX", "Rose", 2016, "u1", band="Eagle Escadrille", city="Allen"),
        _row("Allen HS", "TX", "Macy's", 2019, "u2"),
        _row("The Allen High School", "TX", "BOA Grand National Finalist", 2023, "u3"),
        _row("Allen High School", "TX", "Rose", 2016, "u1"),           # exact duplicate
        _row("University of Iowa Hawkeye Marching Band", "IA", "Rose", 2016, "u1"),
        _row("Toho High School", "", "Rose", 2016, "u1", band="Dragon Band, Nagoya, Japan"),
    ]
    merged, excluded = run_all.merge(rows)
    assert len(merged) == 1
    allen = merged[0]
    assert allen["parades_marched"] == 3
    assert allen["last_appearance"] == 2023
    assert allen["parades"] == "BOA Grand National Finalist 2023; Macy's 2019; Rose 2016"
    assert allen["boa_finalist_years"] == "2023"
    assert allen["source_urls"] == "u1; u2; u3"
    assert allen["band_name"] == "Eagle Escadrille" and allen["city"] == "Allen"
    assert {e["exclusion_reason"] for e in excluded} == {"college/university", "non-US group"}
    assert set(allen) >= set(run_all.COLUMNS)


def test_stateless_row_folds_into_unique_stated_match():
    rows = [
        _row("Northview High School", "", "Hollywood", 2024, "h"),
        _row("Northview High School", "CA", "Rose", 2020, "r"),
    ]
    merged, _ = run_all.merge(rows)
    assert len(merged) == 1 and merged[0]["state"] == "CA" and merged[0]["parades_marched"] == 2


def test_stateless_row_stays_separate_when_ambiguous():
    rows = [
        _row("Liberty High School", "", "Hollywood", 2019, "h"),
        _row("Liberty High School", "CA", "Rose", 2020, "r"),
        _row("Liberty High School", "TX", "Philadelphia", 2018, "p"),
    ]
    merged, _ = run_all.merge(rows)
    assert len(merged) == 3
    assert any(r["notes"].startswith("state unknown") for r in merged if not r["state"])


def test_carry_over_keeps_enrichment_columns():
    new = [{"school": "Allen High School", "state": "TX", "band_name": "", "city": "",
            "source_urls": "u1", "district": "", "notes": "", "score": "", "tier": ""}]
    old = [{"school": "Allen HS", "state": "TX", "band_name": "Escadrille", "city": "Allen",
            "source_urls": "u1; https://allenisd.org/band", "district": "Allen ISD",
            "director_email": "", "notes": "x", "score": "80", "tier": "A"}]
    out = run_all.carry_over(new, old)[0]
    assert out["district"] == "Allen ISD" and out["tier"] == "A" and out["city"] == "Allen"
    assert out["source_urls"] == "u1; https://allenisd.org/band"
