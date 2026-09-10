"""Shared fetch/cache/throttle layer and the row schema.

Rules enforced here (see CLAUDE.md):
- robots.txt is checked per host before any fetch.
- At most one request per second per host.
- Every fetched page is cached under data/raw/<host>/<sha1(url)>.html with a
  sidecar .meta.json, so reruns never re-hit a source.
- A blocked source (403, captcha page, TLS failure) raises BlockedSource so the
  caller records "blocked" instead of guessing.
"""
from __future__ import annotations

import csv
import hashlib
import json
import time
from dataclasses import dataclass, field, fields, asdict
from pathlib import Path
from urllib.parse import urlsplit
from urllib import robotparser

import requests

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
INTERIM_DIR = ROOT / "data" / "interim"
FINAL_DIR = ROOT / "data" / "final"

USER_AGENT = "parade-prospects/0.1 (+https://github.com/cmurphy1140/band-charter-outreach)"
RATE_LIMIT_SECONDS = 1.0
TIMEOUT = 30

# Exact column order of data/final/prospects.csv. Do not reorder.
COLUMNS = [
    "school", "band_name", "city", "state", "district", "enrollment",
    "parades", "parades_marched", "last_appearance", "boa_finalist_years",
    "school_url", "band_url", "director_name", "director_email", "director_phone",
    "booster_org", "source_urls", "score", "tier", "notes",
]

# Columns written by each discovery scraper into data/interim/<source>.csv.
INTERIM_COLUMNS = ["school", "band_name", "city", "state", "event", "year", "source_url"]


class BlockedSource(Exception):
    """Raised when a source cannot be fetched from this environment."""


@dataclass
class Row:
    school: str
    band_name: str = ""
    city: str = ""
    state: str = ""
    event: str = ""      # e.g. "Macy's", "Rose", "BOA Grand National Finalist"
    year: int | None = None
    source_url: str = ""

    def as_dict(self) -> dict:
        d = asdict(self)
        d["year"] = "" if self.year is None else int(self.year)
        return d


_last_hit: dict[str, float] = {}
_robots: dict[str, robotparser.RobotFileParser | None] = {}
_session = requests.Session()
_session.headers["User-Agent"] = USER_AGENT


def cache_path(url: str) -> Path:
    host = urlsplit(url).netloc.lower()
    return RAW_DIR / host / (hashlib.sha1(url.encode()).hexdigest() + ".html")


def cached(url: str) -> str | None:
    p = cache_path(url)
    if p.exists():
        return p.read_text(encoding="utf-8", errors="replace")
    return None


def _robots_allowed(url: str) -> bool:
    parts = urlsplit(url)
    host = parts.netloc.lower()
    if host not in _robots:
        rp = robotparser.RobotFileParser()
        try:
            _throttle(host)
            resp = _session.get(f"{parts.scheme}://{parts.netloc}/robots.txt", timeout=TIMEOUT)
            if resp.status_code == 200:
                rp.parse(resp.text.splitlines())
                _robots[host] = rp
            else:
                _robots[host] = None  # no robots.txt: allowed
        except requests.RequestException:
            _robots[host] = None
    rp = _robots[host]
    return True if rp is None else rp.can_fetch(USER_AGENT, url)


def _throttle(host: str) -> None:
    last = _last_hit.get(host, 0.0)
    wait = RATE_LIMIT_SECONDS - (time.monotonic() - last)
    if wait > 0:
        time.sleep(wait)
    _last_hit[host] = time.monotonic()


_CHALLENGE_MARKERS = (
    "sgcaptcha",                 # SiteGround challenge (tournamentofroses.com)
    "<title>access denied",      # Akamai block page (macys.com)
    "cf-chl", "cf_chl_opt",      # Cloudflare challenge
    "<title>just a moment",      # Cloudflare interstitial
    "<title>attention required",  # Cloudflare block
)


def _looks_like_challenge(text: str) -> bool:
    """True only for known bot-challenge/block pages; checks the head, not the body text."""
    head = text[:3000].lower()
    return len(text) < 20000 and any(m in head for m in _CHALLENGE_MARKERS)


def fetch(url: str, *, force: bool = False) -> str:
    """Return page text, from cache when available. Raises BlockedSource."""
    if not force:
        text = cached(url)
        if text is not None:
            return text
    if not _robots_allowed(url):
        raise BlockedSource(f"robots.txt disallows {url}")
    host = urlsplit(url).netloc.lower()
    _throttle(host)
    try:
        resp = _session.get(url, timeout=TIMEOUT, allow_redirects=True)
    except requests.exceptions.SSLError as e:
        raise BlockedSource(f"TLS failure for {url}: {e}") from e
    except requests.RequestException as e:
        raise BlockedSource(f"request failed for {url}: {e}") from e
    if resp.status_code in (401, 403, 429) or _looks_like_challenge(resp.text):
        raise BlockedSource(f"HTTP {resp.status_code} / challenge page for {url}")
    if resp.status_code != 200:
        raise BlockedSource(f"HTTP {resp.status_code} for {url}")
    p = cache_path(url)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(resp.text, encoding="utf-8")
    p.with_suffix(".meta.json").write_text(json.dumps({
        "url": url, "final_url": resp.url, "status": resp.status_code,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2))
    return resp.text


def write_interim(source: str, rows: list[Row]) -> Path:
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    out = INTERIM_DIR / f"{source}.csv"
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=INTERIM_COLUMNS)
        w.writeheader()
        for r in rows:
            w.writerow(r.as_dict())
    return out


def write_blocked(source: str, reason: str, urls: list[str]) -> None:
    """Record that a source could not be fetched so run_all can report it."""
    INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    p = INTERIM_DIR / "_blocked.json"
    data = json.loads(p.read_text()) if p.exists() else {}
    data[source] = {"reason": reason, "urls": urls,
                    "cache_dirs": sorted({str(cache_path(u).parent.relative_to(ROOT)) for u in urls})}
    p.write_text(json.dumps(data, indent=2))


def clear_blocked(source: str) -> None:
    p = INTERIM_DIR / "_blocked.json"
    if p.exists():
        data = json.loads(p.read_text())
        data.pop(source, None)
        p.write_text(json.dumps(data, indent=2))
