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


def test_stateless_rows_take_only_a_panel_and_articles_and_band_sites_are_not_school_sites():
    organic = {"organic_results": [
        {"title": "Colony High School", "link": "https://cohs.cjuhsd.net/"}]}
    assert sf.pick_site(organic, "Colony High School") is None          # no state: could be AK or CA
    article = {"organic_results": [
        {"title": "Gadsden Band Cross reunites after three-decade hiatus",
         "link": "https://www.gadsdentimes.com/story/entertainment/local/2018/01/30/gadsden-band/153"}]}
    assert sf.pick_site(article, "Gadsden Band", state="AL") is None
    band = {"organic_results": [
        {"title": "Dublin Coffman Band", "link": "https://www.dublincoffmanband.org/"}]}
    pick = sf.pick_site(band, "Dublin Coffman Band", state="OH")
    assert pick and pick["via"] == "band_site" and pick["band_url"] == "https://www.dublincoffmanband.org/"
    assert pick["website"] == ""
    football = {"organic_results": [
        {"title": "Southlake Carroll High School - Dragons Football", "link": "https://www.carrolldragonfb.com/"}]}
    assert sf.pick_site(football, "Southlake Carroll High School", state="TX") is None


def test_same_named_schools_in_a_state_block_a_pick_without_a_city():
    import pandas as pd
    nces = pd.DataFrame([
        {"state": "VA", "key": "salem high", "level": "High", "city": "SALEM"},      # NCES: "Salem High"
        {"state": "VA", "key": "salem", "level": "High", "city": "VIRGINIA BEACH"},
        {"state": "TX", "key": "vandegrift", "level": "High", "city": "AUSTIN"},
    ])
    pick = {"website": "http://salemhs.vbschools.com/", "city": "", "state": "", "via": "organic"}
    assert sf.ambiguity({"school": "Salem High School", "state": "VA", "city": ""}, pick, nces).startswith("ambiguous")
    assert sf.ambiguity({"school": "Salem High School", "state": "VA", "city": "Salem"}, pick, nces) == ""
    panel = {"website": "x", "city": "Virginia Beach", "state": "VA", "via": "knowledge_graph"}
    assert "not Salem" in sf.ambiguity({"school": "Salem High School", "state": "VA", "city": "Salem"}, panel, nces)
    # One school of that name in the state: the panel's district town does not matter.
    leander = {"website": "x", "city": "Leander", "state": "TX", "via": "knowledge_graph"}
    assert sf.ambiguity({"school": "Vandegrift High School", "state": "TX", "city": "Austin"}, leander, nces) == ""
    # Unknown to NCES and the panel names a county: nothing confirms it.
    county = {"website": "x", "city": "Harris County", "state": "TX", "via": "knowledge_graph"}
    assert "county" in sf.ambiguity({"school": "Bridgeland High School", "state": "TX", "city": "Cypress"}, county, nces)
    assert sf._same_city("Laporte", "La Porte") and sf._same_city("Niceville High School", "Niceville")


def test_stateless_row_is_placed_only_by_a_nationally_unique_nces_name():
    import pandas as pd
    nces = pd.DataFrame([
        {"state": "WI", "key": "milton high", "level": "High"},
        {"state": "GA", "key": "milton high", "level": "High"},
        {"state": "NC", "key": "southeast raleigh magnet high", "level": "High"},
    ])
    panel = {"website": "x", "city": "Milton", "state": "WI", "via": "knowledge_graph"}
    assert "WI" in sf.placement({"school": "Milton High School"}, panel, nces)     # two states: refused
    raleigh = {"website": "x", "city": "Raleigh", "state": "NC", "via": "knowledge_graph"}
    assert sf.placement({"school": "Southeast Raleigh High School"}, raleigh, nces) == ""
    assert "unknown to NCES" in sf.placement({"school": "Sonata Music School"}, raleigh, nces)


def test_name_matching_tolerates_magnet_and_hs_variants():
    assert sf.name_matches("Southeast Raleigh Magnet High School", "Southeast Raleigh High School")
    assert sf.name_matches("Dobyns-Bennett HS", "Dobyns-Bennett High School")
    assert not sf.name_matches("Raleigh Charter High School", "Southeast Raleigh High School")


def test_query_uses_the_state_name_when_known():
    assert sf.query_for({"school": "Byrnes High School", "state": ""}) == '"Byrnes High School"'
    assert sf.query_for({"school": "Byrnes High School", "state": "SC"}) == '"Byrnes High School" South Carolina'
