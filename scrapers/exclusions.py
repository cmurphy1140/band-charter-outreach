"""Exclusion rules: which discovered groups are NOT high school prospects.

Excluded rows are kept in data/interim/excluded.csv; they never reach prospects.csv.
"""
from __future__ import annotations

import re

from scrapers.normalize import state_code

COLLEGE = re.compile(
    r"\b(universit|college|state u\b|\bu\.?\s?of\b|polytechnic|institute of technology|"
    r"community college|\ba&m\b|\bstate\s+(?:bulldog|marching|band)|"
    # well-known college band names that appear without the word "university"
    r"redcoat|pride of oklahoma|oregon marching band|sonic boom of the south|"
    r"marching hundred|spirit of troy|pride of the southland)",
    re.I,
)
# Middle schools are prospects (flagged by `level`); only elementary/primary are excluded.
NOT_SECONDARY = re.compile(r"\b(elementary|primary school|pre-?k|kindergarten)\b", re.I)
# "Jr. High School" is not matched: "Martin Luther King, Jr. High School" is a high school.
MIDDLE = re.compile(r"\b(middle school|junior high(?! school)|jr\.? high(?! school)|intermediate school|k-8)\b", re.I)


def level_from_name(school: str, band_name: str = "") -> str:
    """'Middle' when the name says so, else '' (NCES fills High/Middle/Other later)."""
    return "Middle" if MIDDLE.search(f"{school} {band_name}") else ""
DRUM_CORPS = re.compile(r"\b(drum (?:and|&) bugle|drum corps|\bcorps\b|cadets|blue devils|bluecoats|"
                        r"cavaliers|crossmen|phantom regiment|santa clara vanguard)\b", re.I)
ALL_STAR = re.compile(r"\b(all[- ]?star|honou?r band|honou?rs? marching|all[- ]district|"
                      r"all[- ]state|all[- ]county|all[- ]select|all[- ]city|combined|"
                      r"tournament of bands|mass band|select band|band directors|"
                      r"bands alliance|catholic schools band|schools band|traditional band|"
                      r"municipal|banda municipal|alliance)\b", re.I)
MILITARY = re.compile(r"\b(u\.?s\.? (?:army|navy|marine|air force|coast guard)|army band|navy band|"
                      r"marine (?:corps|band)|air force band|coast guard band|military|"
                      r"national guard|west point|naval academy|rotc|jrotc)\b", re.I)
COMMUNITY = re.compile(r"\b(community band|alumni band|senior band|citizens band|town band|"
                       r"pipe(?:s)? (?:and|&) drums|pipe band|fire department|police|"
                       r"salvation army|youth club|church|boys? (?:and|&) girls? club|"
                       r"cultural|dance academy|dance company)\b", re.I)
NON_US_WORDS = re.compile(r"\b(mexico|japan|canada|panama|denmark|guatemala|colombia|puebla|"
                          r"germany|netherlands|norway|sweden|italy|brazil|costa rica|el salvador|"
                          r"korea|taiwan|china|philippines|australia|switzerland|austria|"
                          r"united kingdom|england|scotland|ireland|wales|honduras|bermuda|"
                          r"trinidad|jamaica|bahamas|virgin islands|colegio|instituto|banda de|"
                          r"escuela|liceo|pigegarde|kyoto|tachibana)\b", re.I)


def exclusion_reason(school: str, band_name: str = "", city: str = "", state: str = "",
                     raw: str = "") -> str:
    """Return '' if the row is a valid US high school prospect, else the reason."""
    text = " ".join(x for x in (school, band_name, raw) if x)
    if ALL_STAR.search(text):
        return "all-star/honor/all-district band"
    if NOT_SECONDARY.search(text):
        return "elementary/primary school"
    if COLLEGE.search(text) and not re.search(r"high school|\bhs\b|h\.s\.", text, re.I):
        return "college/university"
    if COLLEGE.search(school or ""):
        return "college/university"
    if MILITARY.search(text):
        return "military band"
    if DRUM_CORPS.search(text):
        return "drum corps"
    if COMMUNITY.search(text):
        return "community band"
    loc = " ".join(x for x in (city, state, raw) if x)
    if NON_US_WORDS.search(text) or NON_US_WORDS.search(loc):
        return "non-US group"
    if state and not state_code(state):
        return "non-US or unknown state"
    if not school:
        return "no school name identified"
    return ""
