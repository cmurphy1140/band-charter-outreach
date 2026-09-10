from scrapers.exclusions import exclusion_reason
from scrapers.normalize import (clean_school, normalize_school, school_from_band_name,
                                split_city_state, state_code)


def test_normalize_school_collapses_variants():
    forms = ["The Allen High School", "Allen HS", "Allen H.S.", "Allen Senior High School",
             "allen high school (Allen, TX)"]
    assert len({normalize_school(f) for f in forms}) == 1


def test_clean_school_expands_abbreviations():
    assert clean_school("Avon H.S.") == "Avon High School"
    assert clean_school("Wando HS") == "Wando High School"
    assert clean_school("Jenks High School (Jenks, OK)") == "Jenks High School"


def test_school_from_band_name():
    assert school_from_band_name("The Sound of Brownsburg High School Marching Band") == "Brownsburg High School"
    assert school_from_band_name("Pennsbury High School Marching Band") == "Pennsbury High School"
    assert school_from_band_name("Oak Park Marching Northmen") == ""


def test_states():
    assert state_code("Texas") == "TX" and state_code("tx") == "TX" and state_code("Ontario") == ""
    assert split_city_state("Fairless Hills, PA") == ("Fairless Hills", "PA")
    assert split_city_state("Rancho Cucamonga, California") == ("Rancho Cucamonga", "CA")
    assert split_city_state("Puebla, Mexico") == ("", "")


def test_exclusions():
    assert exclusion_reason("University of Iowa Hawkeye Marching Band") == "college/university"
    assert exclusion_reason("Wyoming All-State Marching Band") == "all-star/honor/all-district band"
    assert exclusion_reason("United States Marine Corps West Coast Composite Band") == "military band"
    assert exclusion_reason("Toho High School", "Dragon Band, Nagoya, Japan") == "non-US group"
    assert exclusion_reason("Blue Devils") == "drum corps"
    assert exclusion_reason("Allen High School", "The Allen Eagle Escadrille", "Allen", "TX") == ""
    assert exclusion_reason("Jenks High School") == ""
    assert exclusion_reason("Lincoln Middle School") == ""          # middle schools are prospects
    assert exclusion_reason("Gadsden Elementary School") == "elementary/primary school"
    from scrapers.exclusions import level_from_name
    assert level_from_name("Lincoln Middle School") == "Middle"
    assert level_from_name("Allen High School") == ""
