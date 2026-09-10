"""One offline test per scraper, driven by trimmed cached pages in tests/fixtures/.

Blocked sources (Macy's, Tournament of Roses, Chicago) have no fixture until a page
is saved manually; their tests skip with that reason rather than fabricate HTML.
"""
import pytest

from scrapers import boa, cached_only, heb, hollywood, philly, wikipedia_rose


def test_wikipedia_rose_parses_year_sections(fixture_html):
    rows = wikipedia_rose.parse(fixture_html("wikipedia_rose.html"), wikipedia_rose.URL)
    years = {r.year for r in rows}
    assert years == {2016, 2025}
    allen = next(r for r in rows if r.school == "Allen High School")
    assert (allen.city, allen.state, allen.year) == ("Allen", "TX", 2016)
    assert allen.band_name == "The Allen Eagle Escadrille"
    etiwanda = next(r for r in rows if r.school == "Etiwanda High School")
    assert (etiwanda.city, etiwanda.state) == ("Rancho Cucamonga", "CA")
    seminole = next(r for r in rows if r.school == "Seminole High School")
    assert (seminole.city, seminole.state, seminole.year) == ("Seminole", "FL", 2025)
    assert all(r.source_url == wikipedia_rose.URL for r in rows)
    # Non-US groups are still returned here; exclusion happens in run_all.
    assert any("Japan" in (r.school + r.band_name) for r in rows)


def test_philly_wikipedia_table(fixture_html):
    rows = philly.parse(fixture_html("philly_wikipedia.html"), philly.URL)
    assert rows
    pennsbury = [r for r in rows if r.school == "Pennsbury High School"]
    assert pennsbury and pennsbury[0].state == "PA" and pennsbury[0].city == "Fairless Hills"
    assert {r.year for r in rows} >= {2015, 2016}
    assert all(r.source_url == philly.URL for r in rows)
    assert all(r.year is not None for r in rows)


def test_hollywood_category_page(fixture_html):
    url = hollywood.BASE + hollywood.CATEGORIES[2024] + "/"
    rows = hollywood.parse(fixture_html("hollywood_2024.html"), url, 2024)
    names = {r.school for r in rows}
    assert "Northview High School" in names
    # Dance/cheer units are not bands and must not become prospects.
    assert "The Rollettes" not in names and "Pink Polish Elite" not in names
    assert all(r.year == 2024 and r.source_url == url for r in rows)


def test_heb_cards_and_year_from_heading(fixture_html):
    url = heb.CITY_BASE + "2026performers.html"  # deliberately the wrong year in the URL
    rows = heb.parse(fixture_html("heb_2025.html"), url, 2026)
    assert len(rows) == 6
    assert all(r.year == 2025 for r in rows), "year must come from the heading, not the URL"
    assert all((r.city, r.state) == ("Houston", "TX") for r in rows)
    milby = next(r for r in rows if r.school == "Milby High School")
    assert milby.band_name == "Marching Thunder"
    westbury = next(r for r in rows if r.school == "Westbury High School")
    assert westbury.band_name == ""


def test_boa_grand_national_finalists(fixture_html):
    url = "https://marching.musicforall.org/result/grand-national-championships-2025/"
    year, name, rows = boa.parse_recap(fixture_html("boa_gn_2025.html"), url)
    assert year == 2025 and "Grand National" in name
    assert len(rows) == 12
    assert rows[0].school == "Avon High School" and rows[0].state == "IN" and rows[0].city == ""
    assert all(r.event == "BOA Grand National Finalist" and r.year == 2025 for r in rows)


def test_boa_archive_lists_recap_pages(fixture_html):
    entries = boa.parse_archive(fixture_html("boa_archive_p1.html"))
    titles = [t for t, _ in entries]
    assert any("Grand National" in t for t in titles)
    assert all(href.startswith("https://marching.musicforall.org/result/") for _, href in entries)


@pytest.mark.parametrize("source", ["macys", "rose", "chicago", "july4"])
def test_blocked_sources_generic_parser(fixture_html, source):
    html = fixture_html(f"{source}.html")  # skips until a page is saved manually
    rows = cached_only.parse_generic(html, cached_only.GENERIC_SOURCES[source]["urls"][0],
                                     cached_only.GENERIC_SOURCES[source]["event"])
    assert rows and all(r.source_url for r in rows)


def test_generic_parser_only_emits_named_high_schools():
    html = """<html><head><title>2026 Lineup</title></head><body>
    <h2>2026 Marching Bands</h2>
    <ul><li>Lincoln High School Marching Band (Tallahassee, FL)</li>
    <li>Some Community Band</li><li>Ridge View HS, Columbia, SC</li></ul></body></html>"""
    rows = cached_only.parse_generic(html, "https://example.com/lineup", "Macy's")
    assert [(r.school, r.city, r.state, r.year) for r in rows] == [
        ("Lincoln High School", "Tallahassee", "FL", 2026),
        ("Ridge View High School", "Columbia", "SC", 2026),
    ]
