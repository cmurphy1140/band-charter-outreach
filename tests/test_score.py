import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "score", Path(__file__).resolve().parent.parent / "scripts" / "score.py")
score = importlib.util.module_from_spec(spec)
spec.loader.exec_module(score)


def _row(**kw):
    base = {"school": "X High School", "state": "", "parades": "", "parades_marched": "0",
            "last_appearance": "", "boa_finalist_years": "", "director_email": ""}
    base.update(kw)
    return base


def test_max_score_is_100():
    r = _row(state="FL", parades="Rose 2025; Macy's 2024; Hollywood 2023; Rose 2022; Philadelphia 2021",
             parades_marched="5", last_appearance="2025", boa_finalist_years="2025; 2024; 2023",
             director_email="d@school.org")
    total, parts = score.score_row(r)
    assert total == 100.0
    assert parts["geography"] == 20 and parts["contact_bonus"] == 5


def test_recency_decays_five_points_per_year():
    assert score.score_row(_row(last_appearance="2024"))[1]["recency"] == 20
    assert score.score_row(_row(last_appearance="2022"))[1]["recency"] == 10
    assert score.score_row(_row(last_appearance="2019"))[1]["recency"] == 0
    assert score.score_row(_row(last_appearance="2015"))[1]["recency"] == 0


def test_geography_tiers():
    assert score.score_row(_row(state="FL"))[1]["geography"] == 20
    assert score.score_row(_row(state="GA"))[1]["geography"] == 15
    assert score.score_row(_row(state="TX"))[1]["geography"] == 10
    assert score.score_row(_row(state="OH"))[1]["geography"] == 5
    assert score.score_row(_row(state=""))[1]["geography"] == 5


def test_travel_signal_only_for_flown_parades():
    assert score.score_row(_row(parades="Philadelphia 2019"))[1]["travel_signal"] == 0
    assert score.score_row(_row(parades="Rose 2019"))[1]["travel_signal"] == 15
    assert score.score_row(_row(parades="BOA Grand National Finalist 2019; Macy's 2018"))[1]["travel_signal"] == 15


def test_tiers_top50_next100():
    rows = [_row(school=f"S{i}", parades_marched=str(i % 6)) for i in range(200)]
    for r in rows:
        r["score"], _ = score.score_row(r)
    score.assign_tiers(rows)
    from collections import Counter
    c = Counter(r["tier"] for r in rows)
    assert c == {"A": 50, "B": 100, "C": 50}
    best = max(rows, key=lambda r: float(r["score"]))
    assert best["tier"] == "A"
