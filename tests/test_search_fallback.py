import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "search_fallback", Path(__file__).resolve().parent.parent / "scripts" / "search_fallback.py")
sf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sf)


def test_knowledge_panel_gives_website_city_and_state(fixture_html):
    payload = json.loads(fixture_html("serpapi_google_southeast_raleigh.json"))
    pick = sf.pick_site(payload, "Southeast Raleigh High School")
    assert pick and pick["via"] == "knowledge_graph"
    assert pick["website"] == "https://southeastraleighhs.wcpss.net/"
    assert (pick["city"], pick["state"]) == ("Raleigh", "NC")


def test_panel_in_another_state_is_rejected_and_directories_never_win(fixture_html):
    payload = json.loads(fixture_html("serpapi_google_southeast_raleigh.json"))
    assert sf.pick_site(payload, "Southeast Raleigh High School", state="TX") is None
    # Without the panel, the organic results are usnews/niche/hudl/... and a booster-ish
    # athletics site: none is the school's own site.
    assert sf.pick_site({"organic_results": payload["organic_results"]}, "Southeast Raleigh High School") is None


def test_organic_result_needs_a_school_domain_and_a_matching_title():
    organic = {"organic_results": [
        {"title": "Carmel High School | Carmel Clay Schools", "link": "https://chs.ccs.k12.in.us/",
         "snippet": "Carmel High School official site"},
    ]}
    pick = sf.pick_site(organic, "Carmel High School", state="IN")
    assert pick and pick["via"] == "organic" and pick["website"].startswith("https://chs.ccs.k12.in.us")
    assert pick["state"] == ""                              # organic results never set state
    wrong = {"organic_results": [
        {"title": "Carmel Middle School", "link": "https://cms.ccs.k12.in.us/"},   # wrong level
        {"title": "Carmel High School Rankings", "link": "https://www.niche.com/k12/carmel-high-school/"},
    ]}
    assert sf.pick_site(wrong, "Carmel High School") is None
    # "ridge" inside "cambridge" is not the school's name, and "Vista" alone is not the school.
    junk = {"organic_results": [
        {"title": "VISTA | English meaning", "link": "https://dictionary.cambridge.org/us/dictionary/english/vista"},
        {"title": "Vista Ridge High School", "link": "https://vrhs.leanderisd.org/"},
    ]}
    pick = sf.pick_site(junk, "Vista Ridge High School", state="TX")
    assert pick and pick["website"] == "https://vrhs.leanderisd.org/"


def test_name_matching_tolerates_magnet_and_hs_variants():
    assert sf.name_matches("Southeast Raleigh Magnet High School", "Southeast Raleigh High School")
    assert sf.name_matches("Dobyns-Bennett HS", "Dobyns-Bennett High School")
    assert not sf.name_matches("Raleigh Charter High School", "Southeast Raleigh High School")


def test_query_uses_the_state_name_when_known():
    assert sf.query_for({"school": "Byrnes High School", "state": ""}) == '"Byrnes High School"'
    assert sf.query_for({"school": "Byrnes High School", "state": "SC"}) == '"Byrnes High School" South Carolina'
