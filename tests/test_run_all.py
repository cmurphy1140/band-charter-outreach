import importlib.util
import csv
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

import scrapers.common as common

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


def test_year_scoped_write_keeps_other_years(tmp_path, monkeypatch):
    import scrapers.common as common
    monkeypatch.setattr(common, "INTERIM_DIR", tmp_path)
    monkeypatch.setattr(run_all, "INTERIM_DIR", tmp_path)
    common.write_interim("src", [common.Row("Old High School", state="TX", event="Rose", year=2019, source_url="u"),
                                 common.Row("Stale High School", state="TX", event="Rose", year=2026, source_url="u")])
    run_all.write_interim_scoped("src", [common.Row("New High School", state="FL", event="Rose", year=2026, source_url="u")], {2026, 2027})
    import csv
    got = {(r["school"], r["year"]) for r in csv.DictReader((tmp_path / "src.csv").open())}
    assert got == {("Old High School", "2019"), ("New High School", "2026")}


def test_carry_over_keeps_enrichment_columns():
    new = [{"school": "Allen High School", "state": "TX", "band_name": "", "city": "",
            "source_urls": "u1", "district": "", "notes": "", "score": "", "tier": ""}]
    old = [{"school": "Allen HS", "state": "TX", "band_name": "Escadrille", "city": "Allen",
            "source_urls": "u1; https://allenisd.org/band", "district": "Allen ISD",
            "director_email": "", "notes": "x", "score": "80", "tier": "A"}]
    out = run_all.carry_over(new, old)[0]
    assert out["district"] == "Allen ISD" and out["tier"] == "A" and out["city"] == "Allen"
    assert out["source_urls"] == "u1; https://allenisd.org/band"


def test_news_rows_are_flagged_as_warm_leads_and_notes_union_on_carry_over():
    rows = [
        _row("Enloe High School", "", "Raleigh Christmas Parade", 2019, "https://abc11.com/enloe"),
        _row("Enloe High School", "NC", "Philadelphia", 2018, "p"),
    ]
    rows[0]["_source"] = "news_east"
    merged, _ = run_all.merge(rows)
    assert len(merged) == 1
    enloe = merged[0]
    assert enloe["state"] == "NC" and enloe["parades_marched"] == 2
    assert enloe["notes"] == "news: named in local coverage of Raleigh Christmas Parade 2019"
    old = [{"school": "Enloe High School", "state": "NC", "notes": "nces: matched 'Enloe High' (0.95)"}]
    out = run_all.carry_over(merged, old)[0]
    assert out["notes"] == ("news: named in local coverage of Raleigh Christmas Parade 2019; "
                            "nces: matched 'Enloe High' (0.95)")


@pytest.fixture
def isolated_scrapers(tmp_path, monkeypatch):
    """Exercise real CSV/blocked-record writes without production files or network."""
    interim = tmp_path / "interim"
    monkeypatch.setattr(common, "ROOT", tmp_path)
    monkeypatch.setattr(common, "RAW_DIR", tmp_path / "raw")
    monkeypatch.setattr(common, "INTERIM_DIR", interim)
    monkeypatch.setattr(run_all, "INTERIM_DIR", interim)
    monkeypatch.setattr(run_all, "LIVE_SOURCES", {})
    monkeypatch.setattr(run_all.cached_only, "GENERIC_SOURCES", {})

    def no_network(*args, **kwargs):
        pytest.fail("scraper preservation tests must not access the network")

    monkeypatch.setattr(common.requests.sessions.Session, "request", no_network)
    return interim


def _existing_source(interim, name="src"):
    common.write_interim(name, [
        common.Row("Historic High School", state="TX", event="Rose", year=2019,
                   source_url="https://example.org/history"),
        common.Row("Reviewed High School", city="Manually reviewed city", state="NC",
                   event="Rose", year=2026, source_url="https://example.org/reviewed"),
    ])
    path = interim / f"{name}.csv"
    return path, path.read_bytes()


@pytest.mark.parametrize("years", [None, {2026, 2027}], ids=["full", "scoped"])
@pytest.mark.parametrize("has_existing", [True, False], ids=["existing", "first-run"])
def test_empty_live_scrape_does_not_replace_source(
        isolated_scrapers, monkeypatch, capsys, years, has_existing):
    interim = isolated_scrapers
    path, before = (_existing_source(interim) if has_existing
                    else (interim / "src.csv", None))
    common.write_blocked("src", "earlier source failure", ["https://example.org/source"])
    source = SimpleNamespace(URL="https://example.org/source", scrape=lambda **kwargs: [])
    monkeypatch.setattr(run_all, "LIVE_SOURCES", {"src": source})

    counts = run_all.run_scrapers(years)

    if has_existing:
        assert path.read_bytes() == before
    else:
        assert not path.exists()
    assert counts == {}
    status = json.loads((interim / "_blocked.json").read_text())["src"]
    assert "incomplete" in status["reason"].lower()
    assert status["urls"] == ["https://example.org/source"]
    assert "incomplete" in capsys.readouterr().out.lower()


@pytest.mark.parametrize("years", [None, {2026, 2027}], ids=["full", "scoped"])
def test_empty_direct_write_preserves_existing_source(isolated_scrapers, years):
    path, before = _existing_source(isolated_scrapers)

    with pytest.raises(common.BlockedSource, match="incomplete"):
        run_all.write_interim_scoped("src", [], years)

    assert path.read_bytes() == before


@pytest.mark.parametrize("missing", ["school", "event", "source_url"])
@pytest.mark.parametrize("mixed", [False, True], ids=["all-unusable", "mixed"])
def test_unusable_live_rows_preserve_source(isolated_scrapers, monkeypatch, missing, mixed):
    path, before = _existing_source(isolated_scrapers)
    row = common.Row("New High School", event="Rose", year=2026,
                     source_url="https://example.org/new")
    setattr(row, missing, " ")
    rows = [row]
    if mixed:
        rows.append(common.Row("Valid High School", event="Rose", year=2026,
                               source_url="https://example.org/valid"))
    source = SimpleNamespace(URL="https://example.org/source", scrape=lambda **kwargs: rows)
    monkeypatch.setattr(run_all, "LIVE_SOURCES", {"src": source})

    counts = run_all.run_scrapers({2026, 2027})

    assert path.read_bytes() == before
    assert counts == {}
    status = json.loads((isolated_scrapers / "_blocked.json").read_text())
    assert "incomplete" in status["src"]["reason"].lower()


@pytest.mark.parametrize("years", [None, {2026, 2027}], ids=["full", "scoped"])
@pytest.mark.parametrize("failure", ["empty", "blocked"])
def test_failed_source_does_not_prevent_successful_source_update(
        isolated_scrapers, monkeypatch, years, failure):
    interim = isolated_scrapers
    failed_path, failed_before = _existing_source(interim, "failed")
    _existing_source(interim, "successful")
    common.write_blocked("successful", "previous failure", ["https://example.org/success"])
    new = common.Row("New High School", state="FL", event="Rose", year=2026,
                     source_url="https://example.org/new")

    def fail(**kwargs):
        if failure == "blocked":
            raise common.BlockedSource("fixture source unavailable")
        return []

    monkeypatch.setattr(run_all, "LIVE_SOURCES", {
        "failed": SimpleNamespace(URL="https://example.org/failure", scrape=fail),
        "successful": SimpleNamespace(URL="https://example.org/success",
                                      scrape=lambda **kwargs: [new]),
    })

    assert run_all.run_scrapers(years) == {"successful": 1}

    assert failed_path.read_bytes() == failed_before
    with (interim / "successful.csv").open() as f:
        actual = {(r["school"], r["year"]) for r in csv.DictReader(f)}
    expected = {("New High School", "2026")}
    if years:
        expected.add(("Historic High School", "2019"))
    assert actual == expected
    assert set(json.loads((interim / "_blocked.json").read_text())) == {"failed"}


@pytest.mark.parametrize("rows, years", [
    ([], None),
    ([common.Row("Historic High School", event="Rose", year=2019,
                 source_url="https://example.org/history")], {2026, 2027}),
    ([common.Row(" ", event="Rose", year=2026,
                 source_url="https://example.org/unusable")], {2026, 2027}),
], ids=["empty", "outside-requested-years", "unusable"])
def test_cached_source_without_usable_results_preserves_source(
        isolated_scrapers, monkeypatch, rows, years):
    path, before = _existing_source(isolated_scrapers)
    monkeypatch.setattr(run_all.cached_only, "GENERIC_SOURCES", {
        "src": {"urls": ["https://example.org/cache"], "reason": "no lineup"},
    })
    monkeypatch.setattr(run_all.cached_only, "scrape_source", lambda name: (rows, ""))

    assert run_all.run_scrapers(years) == {}

    assert path.read_bytes() == before
    assert "src" in json.loads((isolated_scrapers / "_blocked.json").read_text())
