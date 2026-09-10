import importlib.util
from pathlib import Path

import pandas as pd

spec = importlib.util.spec_from_file_location(
    "qa", Path(__file__).resolve().parent.parent / "scripts" / "qa.py")
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def _nces():
    rows = [
        ("1", "Olentangy High School", "Olentangy Local", "Lewis Center", "OH", "High", "", "1721"),
        ("2", "Orange High School", "Olentangy Local", "Lewis", "OH", "High", "", "1967"),
        ("3", "Olentangy Liberty High School", "Olentangy Local", "Powell", "OH", "High", "", "2000"),
        ("4", "Downingtown HS East Campus", "Downingtown Area SD", "Exton", "PA", "High", "", "1768"),
        ("5", "Downingtown HS West Campus", "Downingtown Area SD", "Downingtown", "PA", "High", "", "1808"),
        ("6", "Avon High", "Avon Community", "Avon", "IN", "High", "https://ahs.avon-schools.org/", "3480"),
        ("7", "Brunswick High School", "Glynn County", "Brunswick", "GA", "High", "", "1939"),
    ]
    d = pd.DataFrame(rows, columns=["ncessch", "sch_name", "lea_name", "city", "state", "level", "website", "enrollment"])
    d["key"] = d["sch_name"].map(qa.normalize_school)
    d["city_key"] = d["city"].str.lower()
    return d


def _row(school, state, matched, **kw):
    r = {"school": school, "state": state, "city": "", "district": "x", "enrollment": "1",
         "school_url": "", "notes": f"nces: matched '{matched}' (0.92)"}
    r.update(kw)
    return r


def test_wrong_prefix_match_is_repointed_to_the_school_carrying_the_word():
    r = _row("Olentangy Orange High School", "OH", "Olentangy High School", city="Lewis Center")
    findings = qa.check_nces_prefix([r], _nces(), fix=True)
    assert len(findings) == 1 and findings[0].startswith("WRONG")
    assert r["enrollment"] == "1967" and r["district"] == "Olentangy Local"
    assert "corrected to 'Orange High School'" in r["notes"]


def test_campus_ambiguity_blanks_enrollment_but_keeps_shared_district():
    r = _row("Downingtown High School", "PA", "Downingtown HS West Campus", district="Downingtown Area SD")
    findings = qa.check_nces_prefix([r], _nces(), fix=True)
    assert len(findings) == 1 and findings[0].startswith("AMBIG")
    assert r["enrollment"] == "" and r["district"] == "Downingtown Area SD"
    assert "withdrawn as ambiguous" in r["notes"] and "East Campus" in r["notes"]


def test_non_band_units_are_reported_for_exclusion():
    rows = [{"school": "Sonata Music School", "band_name": "Sonata Music School Dhol Class", "city": "", "state": ""},
            {"school": "Van Nuys High School", "band_name": "Van Nuys High School Cheer", "city": "", "state": "CA"},
            {"school": "Avon High School", "band_name": "Marching Black and Gold", "city": "", "state": "IN"}]
    out = qa.check_non_band(rows, None)
    assert len(out) == 2 and all(o.startswith("EXCLUDE") for o in out)
    assert not any("Avon" in o for o in out)


def test_twins_states_parades_and_email_checks():
    rows = [
        {"school": "Westlake High School", "state": "", "parades": "Rose 2024", "parades_marched": "1",
         "source_urls": "u", "notes": "", "director_email": "", "school_url": ""},
        {"school": "Westlake High School", "state": "TX", "parades": "Rose 2017", "parades_marched": "1",
         "source_urls": "u", "notes": "", "director_email": "", "school_url": ""},
        {"school": "Bellefontaine High School", "state": "DE", "parades": "Philadelphia 2018", "parades_marched": "1",
         "source_urls": "u", "notes": "nces: no match", "director_email": "", "school_url": ""},
        {"school": "Lonely High School", "state": "ZZ", "parades": "", "parades_marched": "0",
         "source_urls": "", "notes": "", "director_email": "x@gmail.com", "school_url": "https://lhs.k12.tx.us"},
    ]
    nces = pd.DataFrame([{"state": "OH", "key": "bellefontaine high", "level": "High",
                          "sch_name": "Bellefontaine High School", "city": "BELLEFONTAINE"}])
    assert len(qa.check_twins(rows, None)) == 1
    states = qa.check_states(rows, nces)
    assert any("Bellefontaine" in s and "OH" in s for s in states) and any("'ZZ'" in s for s in states)
    assert qa.bare("East Hills MS") == qa.bare("East Hills Middle School") == "east hills"
    parades = qa.check_parades(rows, None)
    assert len(parades) == 2                                   # no parade + no source_url
    assert len(qa.check_email_domain(rows, None)) == 1


def test_benign_prefix_matches_are_left_alone():
    rows = [_row("Avon High School", "IN", "Avon High"),
            _row("Brunswick Marching Pirates", "GA", "Brunswick High School")]   # nickname words
    assert qa.check_nces_prefix(rows, _nces(), fix=True) == []
    assert all("(0.92)" in r["notes"] for r in rows)
