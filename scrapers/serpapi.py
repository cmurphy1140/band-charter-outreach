"""SerpAPI client shared by the news pull and the school-website search fallback.

Owner-supplied key in SERPAPI_KEY (set in the cloud environment 2026-09-10). Every
search is cached as JSON under data/raw/serpapi.com/<sha1(engine|query)>.json with a
.meta.json sidecar; the key is read from the environment only and never written to
disk. serpapi.com's robots.txt lists /search.json as disallowed for crawlers; the
owner's decision is that a keyed API call under SerpAPI's terms is not crawling, so
this client does its own throttling (1 request/sec) instead of going through
scrapers.common.fetch(). Any failure raises BlockedSource; nothing is guessed.

Quota: the free plan is 250 searches per month. searches_left() reads the account
endpoint so callers can refuse to start a pull they cannot finish.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

import requests

from scrapers.common import RAW_DIR, TIMEOUT, USER_AGENT, BlockedSource, _throttle

URL = "https://serpapi.com/search.json"
ACCOUNT_URL = "https://serpapi.com/account.json"
ENV_KEY = "SERPAPI_KEY"
CACHE_DIR = RAW_DIR / "serpapi.com"
HOST = "serpapi.com"


def cache_path(engine: str, query: str) -> Path:
    return CACHE_DIR / (hashlib.sha1(f"{engine}|{query}".encode()).hexdigest() + ".json")


def key_present() -> bool:
    return bool(os.environ.get(ENV_KEY))


def search(engine: str, query: str, *, force: bool = False, **params) -> dict:
    """One SerpAPI search, cached as JSON. Raises BlockedSource on any failure."""
    p = cache_path(engine, query)
    if p.exists() and not force:
        return json.loads(p.read_text(encoding="utf-8"))
    key = os.environ.get(ENV_KEY, "")
    if not key:
        raise BlockedSource(f"{ENV_KEY} not set")
    resp = None
    for attempt in range(2):  # one retry on a timeout/connection error, then give up
        _throttle(HOST)
        try:
            resp = requests.get(URL, params={"engine": engine, "q": query, "gl": "us", "hl": "en",
                                             **params, "api_key": key},
                                headers={"User-Agent": USER_AGENT}, timeout=60)
            break
        except requests.RequestException as e:
            if attempt:
                raise BlockedSource(f"SerpAPI request failed: {e}") from e
    try:
        payload = resp.json()
    except ValueError as e:
        raise BlockedSource(f"SerpAPI returned non-JSON (HTTP {resp.status_code})") from e
    err = payload.get("error", "")
    no_results = "hasn't returned any results" in err
    if resp.status_code != 200 and not no_results:
        raise BlockedSource(f"SerpAPI HTTP {resp.status_code}: {err or resp.text[:200]}")
    if no_results:
        payload = {"organic_results": [], "news_results": [], "note": err}
    payload.pop("search_metadata", None)   # per-search endpoints tied to the account
    payload.pop("search_parameters", None)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(payload, indent=1), encoding="utf-8")
    p.with_suffix(".meta.json").write_text(json.dumps({
        "engine": engine, "q": query, "status": resp.status_code,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2))
    return payload


def searches_left() -> int | None:
    """Remaining monthly quota, or None if the account endpoint is unreachable."""
    key = os.environ.get(ENV_KEY, "")
    if not key:
        return None
    try:
        _throttle(HOST)
        r = requests.get(ACCOUNT_URL, params={"api_key": key}, timeout=TIMEOUT)
        return int(r.json().get("total_searches_left"))
    except (requests.RequestException, ValueError, TypeError):
        return None


def ensure_quota(needed: int) -> None:
    """Refuse to start a pull that the monthly quota cannot finish."""
    if needed <= 0:
        return
    if not key_present():
        raise BlockedSource(f"{ENV_KEY} not set ({needed} searches needed)")
    left = searches_left()
    if left is not None and left < needed:
        raise BlockedSource(f"SerpAPI quota: {left} searches left this month, {needed} needed; "
                            f"nothing pulled")
