from scrapers import news_east

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


def test_headline_rows_only_when_a_school_band_is_named():
    rows, used = news_east.parse_feed(FEED, "Raleigh Christmas Parade", "https://feed")
    schools = {(r.school, r.year) for r in rows}
    assert ("Enloe High School", 2025) in schools
    assert ("Ligon Middle School", 2024) in schools          # January article -> previous parade year
    assert ("Marcus High School", 2027) in schools           # year taken from the headline
    assert not any("Henrico" in r.school for r in rows)     # not about a band
    assert not any("Illini" in r.school for r in rows)      # no school named
    assert all(r.source_url.startswith("https://news.google.com/rss/articles/") for r in rows)
    assert all(r.state == "" for r in rows)                 # never guessed from the parade's state
    assert len(used) == len(rows)
