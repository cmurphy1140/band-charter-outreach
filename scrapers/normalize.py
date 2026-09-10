"""School-name normalization and US state helpers."""
from __future__ import annotations

import re

STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon",
    "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
    "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia",
    "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
    "PR": "Puerto Rico",
}
NAME_TO_CODE = {v.lower(): k for k, v in STATES.items()}
NAME_TO_CODE.update({"washington, d.c.": "DC", "washington d.c.": "DC", "d.c.": "DC"})


def state_code(text: str) -> str:
    """Return a 2-letter code for a state name or code, else ''."""
    if not text:
        return ""
    t = text.strip().strip(".").strip()
    if len(t) == 2 and t.upper() in STATES:
        return t.upper()
    return NAME_TO_CODE.get(t.lower(), "")


def split_city_state(text: str) -> tuple[str, str]:
    """'Allen, Texas' -> ('Allen', 'TX'); returns ('', '') when no US state found."""
    if not text:
        return "", ""
    parts = [p.strip() for p in re.split(r",", text) if p.strip()]
    if len(parts) >= 2:
        st = state_code(parts[-1])
        if st:
            return parts[-2], st
    if len(parts) == 1:
        st = state_code(parts[0])
        if st:
            return "", st
    return "", ""


_HS_VARIANTS = re.compile(
    r"\b(senior\s+high\s+school|sr\.?\s+high\s+school|high\s+school|h\.?\s?s\.?|hs)\b",
    re.I,
)
_LEADING_THE = re.compile(r"^\s*the\s+", re.I)
_PARENS = re.compile(r"\s*\([^)]*\)")
_PUNCT = re.compile(r"[^\w\s&-]")
_WS = re.compile(r"\s+")

# Words that mark the start of a band nickname after the school name.
_BAND_WORDS = re.compile(
    r"\b(marching|band|regiment|pride of|sound of|spirit of|golden|mighty|royal|"
    r"color guard|drumline|escadrille)\b",
    re.I,
)


def school_from_band_name(text: str) -> str:
    """Best-effort: pull the school portion out of 'X High School Marching Y' style names.

    Returns '' when no 'High School' style token is present, so callers never guess.
    """
    if not text:
        return ""
    t = _PARENS.sub("", text).strip().strip(",").strip()
    m = re.search(r"^(.*?\b(?:high school|h\.?s\.?|hs|academy|preparatory|prep|school)\b)", t, re.I)
    if not m:
        return ""
    core = m.group(1).strip()
    core = _LEADING_THE.sub("", core)
    core = re.sub(r"^(pride of|sound of|spirit of|marching)\s+", "", core, flags=re.I).strip()
    return core


def normalize_school(name: str) -> str:
    """Canonical key for dedupe: lowercase, no 'The', HS variants collapsed, no punctuation."""
    if not name:
        return ""
    t = _PARENS.sub("", name)
    t = _LEADING_THE.sub("", t)
    t = _HS_VARIANTS.sub(" ", t)
    t = _PUNCT.sub(" ", t)
    t = _WS.sub(" ", t).strip().lower()
    return t


def clean_school(name: str) -> str:
    """Display form: keep the name, standardise 'H.S.'/'HS' to 'High School', strip refs."""
    if not name:
        return ""
    t = _PARENS.sub("", name).strip()
    t = re.sub(r"\[\d+\]", "", t)
    t = re.sub(r"\b(h\.?\s?s\.?|hs)\b\.?", "High School", t, flags=re.I)
    t = re.sub(r"\bsr\.?\s+high\b", "Senior High", t, flags=re.I)
    t = _WS.sub(" ", t).strip(" ,;-–—")
    return t
