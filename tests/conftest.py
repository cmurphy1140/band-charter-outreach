from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixture_html():
    """Return a loader for cached pages saved under tests/fixtures/."""
    def load(name: str) -> str:
        p = FIXTURES / name
        if not p.exists():
            pytest.skip(f"fixture {name} missing (source blocked; add the page manually)")
        return p.read_text(encoding="utf-8", errors="replace")
    return load
