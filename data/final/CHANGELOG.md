# Changelog

## 2026-09-10 refresh

- 0 new schools, 0 updated, 208 total

## 2026-09-10 news pull (SerpAPI, first run)

- 4 new schools, 10 updated, 214 total (excluded: 180)
- new: Byrnes High School (state unknown): Macy's 2025
- new: Concord High School (state unknown): Macy's 2026
- new: Enloe High School (state unknown): Raleigh Christmas Parade 2019
- new: Southeast Raleigh High School (state unknown): Raleigh Christmas Parade 2022
- updated: Dobyns-Bennett (TN) +Macy's 2026; Marcus (TX) +Macy's 2027; Fishers (IN)
  +Macy's 2023; Pearland (TX) +Macy's 2026; Foothill (NV) +Macy's 2027; Penn (IN)
  +Philadelphia 2025; Kingsway Regional (NJ) +Philadelphia 2023, 2025; Biloxi (MS)
  +Philadelphia 2017; A.I. DuPont (DE) and Parkland (PA) news note only
- East Coast sheet: 48 -> 52 rows

## 2026-09-10 search fallback (SerpAPI, first run) + crawl of new sites

- school_url 76 -> 133 (52 Google knowledge panels, 3 organic school domains, 2 NCES);
  9 picks refused as ambiguous, 70 rows found nothing (mostly nickname rows)
- stateless rows 45 -> 36 (each placement confirmed by the one NCES school of that name)
- band_url 22 -> 41; director names 3 -> 5; director emails 1 -> 2 (Cedar Park, TX);
  booster names re-extracted with a tighter rule (menu text dropped)
- 214 schools, no rows added or removed; 11 tier changes from re-scoring

## 2026-09-10 QA: NCES prefix matches

- 42 prefix-boosted matches re-checked with `scripts/qa.py --check nces-prefix`
- Olentangy Orange High School (OH): re-pointed from "Olentangy High School" to
  "Orange High School" (Olentangy Local); enrollment 1721 -> 1967
- Downingtown High School (PA): match withdrawn as ambiguous (East Campus / West
  Campus / STEM Academy); district kept, enrollment blanked
- enrich.match_nces no longer boosts an ambiguous prefix

## 2026-09-10 QA: remaining checks

- non-band: 8 rows moved to excluded.csv (LA Catholic School x2 = the LA Catholic
  Schools Band; Perez Dance and Tumbling Academy; Sonata Music School; California
  Springs School of Rhythmic Gymnastics; GevorkianDance Academy; Origin Hip Hop
  Academy; Van Nuys High School, whose Hollywood 2025 unit was the cheer squad).
  214 -> 206 schools; excluded 180 -> 188
- twins (report only): Homestead CA / IN are two schools; stateless Westlake
  (Rose 2024) could be the TX or UT Westlake and stays separate
- states (report only): Bellefontaine and Defiance are listed as DE by Wikipedia's
  2018 Philadelphia lineup; NCES and Wikipedia's 2014 entry put both in OH
- parades, email-domain: no findings


