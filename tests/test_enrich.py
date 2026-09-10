"""Contact-extraction rules: an email is recorded only when the page ties it to a
band director, and only when its domain matches the school/district site."""
import importlib.util
from pathlib import Path

from bs4 import BeautifulSoup

spec = importlib.util.spec_from_file_location(
    "enrich", Path(__file__).resolve().parent.parent / "scripts" / "enrich.py")
enrich = importlib.util.module_from_spec(spec)
spec.loader.exec_module(enrich)

URL = "https://hs.example-isd.org/band"
DOMAIN = "example-isd.org"


def _run(html: str) -> dict:
    found = {"band_url": "", "booster_org": "", "booster_url": "", "director_name": "",
             "director_email": "", "director_phone": "", "social": [], "contact_source": "",
             "pages": 1, "blocked": ""}
    soup = BeautifulSoup(html, "lxml")
    enrich._extract_contacts(soup, soup.get_text(" ", strip=True), URL, DOMAIN, found)
    return found


def test_theatre_director_email_is_not_taken():
    html = """<p>Director: Dr. Pat Example <a href="mailto:pexample@example-isd.org">Dr. Pat Example</a></p>
              <p>The marching band program performs at every home game.</p>"""
    f = _run(html)
    assert f["director_email"] == "" and f["director_name"] == ""


def test_band_director_mailto_is_taken_with_name_and_phone():
    html = """<ul><li>Director of Bands: Jamie Rivera
              <a href="mailto:jrivera@example-isd.org">jrivera@example-isd.org</a> (555) 123-4567</li>
              <li>Choir Director: Sam Lee <a href="mailto:slee@example-isd.org">email</a></li></ul>"""
    f = _run(html)
    assert f["director_email"] == "jrivera@example-isd.org"
    assert f["director_name"] == "Jamie Rivera"
    assert f["director_phone"] == "(555) 123-4567"
    assert f["contact_source"] == URL


def test_off_domain_email_is_rejected():
    html = """<p>Band Director: Jamie Rivera <a href="mailto:jrivera@gmail.com">jrivera@gmail.com</a></p>"""
    f = _run(html)
    assert f["director_email"] == ""
    assert f["director_name"] == "Jamie Rivera"  # the name is published; the email is not usable


def test_plain_text_email_near_band_director_label():
    html = """<div>Questions about the Marching Eagles? Contact our band director, Chris Ng,
              at cng@example-isd.org or 555-987-6543.</div>"""
    f = _run(html)
    assert f["director_email"] == "cng@example-isd.org"
    assert f["director_phone"] == "555-987-6543"


def test_booster_org_name_is_captured():
    html = "<p>The Eagle Band Boosters support every trip. Contact the boosters at boosters@example-isd.org</p>"
    f = _run(html)
    assert "Band Boosters" in f["booster_org"]
    assert f["director_email"] == ""  # a boosters address is not a director address
