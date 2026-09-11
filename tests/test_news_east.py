import json

import pytest

from scrapers import news_east
from scrapers.common import BlockedSource

FEED = """<?xml version="1.0"?><rss><channel>
<item><title>Enloe High School band prepares to perform at 75th annual Raleigh Christmas Parade - ABC11 News</title>
<link>https://news.google.com/rss/articles/AAA</link><pubDate>Sat, 15 Nov 2025 12:00:00 GMT</pubDate><source url="https://abc11.com">ABC11 News</source></item>
<item><title>Student in the hospital after stabbing at Henrico High School - Richmond Times-Dispatch</title>
<link>https://news.google.com/rss/articles/BBB</link><pubDate>Mon, 01 Dec 2025 12:00:00 GMT</pubDate><source url="https://richmond.com">Richmond Times-Dispatch</source></item>
<item><title>Marcus High School band set to perform at Macy's Thanksgiving Day Parade in 2027 - CBS News</title>
<link>https://news.google.com/rss/articles/CCC</link><pubDate>Tue, 07 Oct 2025 12:00:00 GMT</pubDate><source url="https://cbsnews.com">CBS News</source></item>
<item><title>Marching Illini to perform at 100th Macy's Thanksgiving Day Parade - Illinois News</title>
<link>https://news.google.com/rss/articles/DDD</link><pubDate>Tue, 07 Oct 2025 12:00:00 GMT</pubDate><source url="https://illinois.edu">Illinois News</source></item>
<item><title>Ligon Middle School marching band steps off in the Raleigh Christmas Parade - WRAL</title>
<link>https://news.google.com/rss/articles/EEE</link><pubDate>Fri, 10 Jan 2025 12:00:00 GMT</pubDate><source url="https://wral.com">WRAL</source></item>
</channel></rss>"""


def test_headline_rows_only_when_a_school_band_and_parade_are_named():
    rows, used = news_east.parse_feed(FEED, "https://feed")
    schools = {(r.school, r.event, r.year) for r in rows}
    assert ("Enloe High School", "Raleigh Christmas Parade", 2025) in schools
    assert ("Ligon Middle School", "Raleigh Christmas Parade", 2024) in schools  # January -> previous parade year
    assert ("Marcus High School", "Macy's", 2027) in schools    # event and year from the headline
    assert not any("Henrico" in r.school for r in rows)     # not about a band
    assert not any("Illini" in r.school for r in rows)      # no school named
    assert all(r.source_url.startswith("https://news.google.com/rss/articles/") for r in rows)
    assert all(r.state == "" for r in rows)                 # never guessed from the parade's state
    assert len(used) == len(rows)


def test_serpapi_results_use_article_links_and_nested_stories(fixture_html):
    payload = json.loads(fixture_html("serpapi_raleigh.json"))
    rows, used = news_east.parse_results(payload)
    by_school = {r.school: r for r in rows}
    assert set(by_school) == {"Enloe High School", "Ligon Middle School"}
    assert by_school["Enloe High School"].year == 2019
    assert by_school["Enloe High School"].source_url.startswith("https://abc11.com/")
    assert by_school["Ligon Middle School"].year == 2024      # nested story, January date
    assert all(r.event == "Raleigh Christmas Parade" and r.state == "" for r in rows)
    assert {u["publisher"] for u in used} == {"ABC11 News", "WRAL"}


@pytest.mark.parametrize("head, publisher, event", [
    ("Fishers High School Marching Tigers to march in '28 Rose Parade", "Current", ""),   # not a listed parade
    ("Harrisburg High School band steps off in the Harrisburg Holiday Parade", "PennLive", "Harrisburg Holiday Parade"),
    ("A. I. Dupont High School marching band celebrating 4 decades of Thanksgiving Day Parade participation",
     "6abc", "Philadelphia"),                                        # publisher settles which parade
    ("School Spirit Day with the Odessa High School Marching Band", "6abc Philadelphia", ""),  # no parade named
    ("Vero Beach High School band students will perform in Macy's Thanksgiving Day Parade", "WFLX", "Macy's"),
    ("Wallington High School Marching Band heads to Boston for prestigious event", "NorthJersey", ""),
])
def test_event_comes_from_the_headline_not_the_query(head, publisher, event):
    assert news_east.event_from_headline(head, publisher) == event


def test_people_stories_and_leading_verbs():
    import datetime as dt
    pub = dt.datetime(2025, 10, 7, tzinfo=dt.timezone.utc)
    assert news_east.headline_row("3 Vero Beach High School band students to perform in Macy's Thanksgiving Day Parade",
                                  "u", pub) is None
    assert news_east.headline_row("Harrisburg High grads make history marching in Macy's Thanksgiving Day parade",
                                  "u", pub) is None
    assert news_east.headline_row("Vero Beach High School band students will perform in Macy's Thanksgiving Day Parade",
                                  "u", pub) is None
    got = news_east.headline_row("Watch Concord High School marching band find out it will perform in the "
                                 "Macy's Thanksgiving Day Parade", "u", pub)
    assert got and got[0].school == "Concord High School" and got[1] is False


def test_one_article_is_one_appearance():
    from scrapers.common import Row
    rows = [Row("Dupont High School", event="Philadelphia", year=2025, source_url="same"),   # re-dated copy
            Row("Dupont High School", event="Philadelphia", year=2019, source_url="same")]
    used = [{"year_explicit": 0}, {"year_explicit": 0}]
    out, _ = news_east.prefer_stated_years(rows, used)
    assert [(r.year) for r in out] == [2019]


def test_stated_year_beats_date_derived_year():
    from scrapers.common import Row
    rows = [Row("Concord High School", event="Macy's", year=2025, source_url="a"),   # Oct 2025 article, no year
            Row("Concord High School", event="Macy's", year=2026, source_url="b"),   # "... in 2026"
            Row("Byrnes High School", event="Macy's", year=2025, source_url="c")]
    used = [{"year_explicit": 0}, {"year_explicit": 1}, {"year_explicit": 0}]
    out, _ = news_east.prefer_stated_years(rows, used)
    assert [(r.school, r.year) for r in out] == [("Concord High School", 2026), ("Byrnes High School", 2025)]


def test_scrape_reports_blocked_without_a_key(tmp_path, monkeypatch):
    from scrapers import serpapi
    monkeypatch.delenv(news_east.ENV_KEY, raising=False)
    monkeypatch.setattr(serpapi, "DOTENV_PATH", tmp_path / ".env")
    monkeypatch.setattr(serpapi, "CACHE_DIR", tmp_path)   # nothing cached
    with pytest.raises(BlockedSource, match="SERPAPI_KEY not set"):
        news_east.scrape()


def test_cached_searches_need_no_key(tmp_path, monkeypatch, fixture_html):
    from scrapers import serpapi
    monkeypatch.delenv(news_east.ENV_KEY, raising=False)
    monkeypatch.setattr(serpapi, "DOTENV_PATH", tmp_path / ".env")
    monkeypatch.setattr(serpapi, "CACHE_DIR", tmp_path)
    monkeypatch.setattr(news_east, "INTERIM_DIR", tmp_path)
    monkeypatch.setattr(news_east, "HEADLINES_CSV", tmp_path / "news_east_headlines.csv")
    payload = fixture_html("serpapi_raleigh.json")
    for q in news_east.queries():
        news_east.cache_path(q).write_text(payload)
    rows = news_east.scrape()
    # Every cached query returns the same two Raleigh headlines; dedupe collapses them.
    assert {(r.school, r.event) for r in rows} == {("Enloe High School", "Raleigh Christmas Parade"),
                                                   ("Ligon Middle School", "Raleigh Christmas Parade")}
    assert (tmp_path / "news_east_headlines.csv").exists()
