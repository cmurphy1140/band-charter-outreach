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


def test_junk_capitalized_words_are_not_names():
    html = """<p>Registration Deadline Approaching Director of Bands</p>
              <p>COLOR GUARD Brendan Lock Director of Bands</p>
              <p>Fine Arts Kyler Boss, Director of Bands</p>"""
    f = _run(html)
    assert f["director_name"] in ("", "Kyler Boss", "Brendan Lock")
    assert f["director_name"] != "Deadline Approaching"


def test_headlines_after_label_are_not_names():
    html = """<ul><li>BHS Band Director Lands Magazine Cover</li>
              <li>Franklin High Band Director Honored National Merit Finalists</li>
              <li>MIRA MESA BAND AND COLOR GUARD Brendan Lockie, Director of Bands</li></ul>"""
    f = _run(html)
    assert f["director_name"] == "Brendan Lockie"


def test_name_before_label_needs_separator():
    html = "<ul><li>Steve Olsen, Director of Bands</li><li>Fine Arts Kyler Boss - Band Director</li></ul>"
    f = _run(html)
    assert f["director_name"] == "Steve Olsen"


def test_booster_org_name_is_captured():
    html = "<p>The Eagle Band Boosters support every trip. Contact the boosters at boosters@example-isd.org</p>"
    f = _run(html)
    assert "Band Boosters" in f["booster_org"]
    assert f["director_email"] == ""  # a boosters address is not a director address


def test_menu_text_around_band_boosters_is_not_an_organisation():
    html = ("<nav>Our Band Program Directors and Staff Student Leadership Band Boosters Our Bands "
            "MIHS IMS Beginning</nav><p>Color Guard Director Click here to view the Band Booster website</p>")
    assert _run(html)["booster_org"] == ""
    html = "<p>Proudly supported by the Lassiter Band Booster Association since 1981.</p>"
    assert _run(html)["booster_org"] == "Lassiter Band Booster Association"
