import os
import traceback
from types import SimpleNamespace

import pytest
import requests

from scrapers import serpapi
from scrapers.common import BlockedSource


@pytest.fixture(autouse=True)
def isolate_credentials(tmp_path, monkeypatch):
    monkeypatch.delenv(serpapi.ENV_KEY, raising=False)
    monkeypatch.setattr(serpapi, "DOTENV_PATH", tmp_path / ".env")
    monkeypatch.setattr(serpapi, "CACHE_DIR", tmp_path / "cache")
    monkeypatch.setattr(serpapi, "_throttle", lambda host: None)
    def no_network(*args, **kwargs):
        pytest.fail("Unexpected live API request")
    monkeypatch.setattr(serpapi.requests, "get", no_network)


def test_project_env_is_read_from_other_directory_without_exporting_variables(tmp_path, monkeypatch):
    serpapi.DOTENV_PATH.write_text('SERPAPI_KEY="local-test-key"\nUNRELATED=unused\n')
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    (elsewhere / ".env").write_text("SERPAPI_KEY=wrong-project\n")
    monkeypatch.chdir(elsewhere)
    assert serpapi._api_key() == "local-test-key"
    assert serpapi.ENV_KEY not in os.environ
    assert "UNRELATED" not in os.environ


@pytest.mark.parametrize("value", ["cloud-test-key", ""])
def test_explicit_environment_wins_even_when_blank(value, monkeypatch):
    serpapi.DOTENV_PATH.write_text("SERPAPI_KEY=local-test-key\n")
    monkeypatch.setenv(serpapi.ENV_KEY, value)
    assert serpapi._api_key() == value


def test_missing_blank_and_later_saved_keys():
    assert not serpapi.key_present()
    serpapi.DOTENV_PATH.write_text("SERPAPI_KEY=\n")
    assert not serpapi.key_present()
    serpapi.DOTENV_PATH.write_text("SERPAPI_KEY=saved-test-key\n")
    assert serpapi.key_present()


def test_env_values_are_literal_and_invalid_encoding_is_reported_without_contents():
    serpapi.DOTENV_PATH.write_text('SERPAPI_KEY="${OTHER_KEY}"\n')
    assert serpapi._api_key() == "${OTHER_KEY}"
    serpapi.DOTENV_PATH.write_bytes(b"SERPAPI_KEY=private-test-\xff")
    with pytest.raises(BlockedSource, match="UTF-8") as error:
        serpapi.key_present()
    assert "private-test" not in "".join(traceback.format_exception(error.value))


def test_local_key_reaches_search_and_quota_but_not_cache(monkeypatch):
    serpapi.DOTENV_PATH.write_text("SERPAPI_KEY=local-test-key\n")
    calls = []
    def get(url, **kwargs):
        calls.append((url, kwargs["params"]))
        payload = {"total_searches_left": 7} if url == serpapi.ACCOUNT_URL else {
            "organic_results": [], "search_parameters": {"api_key": "local-test-key"},
            "search_metadata": {"json_endpoint": "https://example.org/private"},
        }
        return SimpleNamespace(status_code=200, json=lambda: payload)
    monkeypatch.setattr(serpapi.requests, "get", get)
    assert serpapi.searches_left() == 7
    assert serpapi.search("google", "test school") == {"organic_results": []}
    assert all(params["api_key"] == "local-test-key" for _, params in calls)
    assert all("local-test-key" not in p.read_text() for p in serpapi.CACHE_DIR.glob("*.json"))
    serpapi.DOTENV_PATH.unlink()
    assert serpapi.search("google", "test school") == {"organic_results": []}
    assert len(calls) == 2


def test_request_error_cannot_echo_key_or_chained_url(monkeypatch):
    monkeypatch.setenv(serpapi.ENV_KEY, "private-test-key")
    def fail(*args, **kwargs):
        raise requests.ConnectionError("https://serpapi.com/search.json?api_key=private-test-key")
    monkeypatch.setattr(serpapi.requests, "get", fail)
    with pytest.raises(BlockedSource, match="ConnectionError") as error:
        serpapi.search("google", "test school")
    assert "private-test-key" not in "".join(traceback.format_exception(error.value))


@pytest.mark.parametrize("status", [200, 401])
def test_http_error_body_is_not_printed(monkeypatch, status):
    monkeypatch.setenv(serpapi.ENV_KEY, "private-test-key")
    monkeypatch.setattr(serpapi.requests, "get", lambda *a, **kw: SimpleNamespace(
        status_code=status, text="private-test-key", json=lambda: {"error": "private-test-key"}))
    with pytest.raises(BlockedSource, match=f"HTTP {status}") as error:
        serpapi.search("google", "test school")
    assert "private-test-key" not in str(error.value)
