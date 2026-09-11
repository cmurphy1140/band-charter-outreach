# Audit evidence and reproduction

Baseline: `be3f9ffd13585bda497edd1707ad9a4e3ffe1a4e`. See `../../AUDIT-2026-09-10.md` for the findings and `../../superpowers/plans/2026-09-10-pipeline-remediation.md` for the plan.

## Files

- `reproduce.py`: offline diagnostics using current code, CSVs and mock network failures. Writes `evidence.json` beside itself; temporary CSV/XLSX probes never touch production data. It reports observed behavior rather than silently treating a failing safety property as a passing test.
- `evidence.json`: measured baseline, sample, contact/domain/caching/failure/export reproductions and credential-scan counts.
- `history.json`: the nine historical identity placements and their current counterparts, including the intentionally excluded Van Nuys cheer entry.
- `nces_checks.json`: all six existing non-network QA results, nine historical candidate sets, six district recheck exceptions and NCES results for the 15-row sample.
- `nces_source.json`: official archive URL, school year, byte length and SHA-256; enrollment membership totals are explicitly not verified.
- This file: human source observations and interpretation limits.

Run from the repository root:

```sh
.venv/bin/python docs/audits/2026-09-10/reproduce.py
make test
```

The diagnostics overwrite their evidence snapshot on rerun. Preserve the baseline first if comparing later repairs. Future tests should assert the safe behavior specified in the plan, not assert that the vulnerabilities remain.

## Sample method and coverage

Sample: `random.Random(20260910).sample(rows, 15)` using current CSV row order. It is a deterministic spot-check, not a statistical accuracy estimate. Scores and event-tag counts were checked computationally; numerical consistency is not validation of the events themselves. All populated districts in this sample agreed with the directory; three rows lacked a district and were not matched by the current function. Enrollment values in all rows remain unverified against membership data.

The discovery checks below compare the recorded source's statements, not an independent proof that every listed appearance actually occurred. A lineup, future invitation or local-news plan has different evidentiary meaning from a completed trip. The exact source URL set for every sampled row is preserved in `evidence.json`.

| Sample school | Discovery/source observation | NCES check | Additional evidence or unresolved fields |
|---|---|---|---|
| Franklin, TN | Listed in Rose source; BOA's 2024 official results separately record a 2026 invitation | District agrees | Recorded band link is an orchestra-camp article; reader could not retrieve it. “RHS Band Booster” ownership unverified. |
| Kingsway Regional, NJ | Philadelphia source names the program; separate 2023/2025 news links are stored | District agrees | All individual news-year claims not independently read; city field contains a county. |
| Albertville, AL | Rose listing names the school/band | District agrees | Official fine-arts page confirms Taylor Cash's director role and the Aggie band. Enrollment not checked. |
| Rancho Verde, CA | Rose listing names the program and city | District agrees | Website is district-level; band link absent. No claim of independent verification of all historical years. |
| Jacket Pride Marching Band, LA | Philadelphia listing uses the band name and Denham Springs | No match | School identity unresolved; do not infer one from the nickname. |
| Westbury, TX | City of Houston 2025 performer page names Westbury | District agrees | Recorded band URL is a district music page; school ownership of a band page not established. Venue alone does not prove school location. |
| Brien McMahon, CT | Philadelphia source lists the school | District agrees | Official music department page resolves; no contact value was populated. |
| Stephen F. Austin Sonic Boom, TX | Houston performer page names the unit | No match | Band nickname still occupies the school field; canonical identity and city need corroboration. |
| Biloxi, MS | Philadelphia listing plus WLOX announcement | District agrees | **Contradiction:** 2017 news event derives from a January 2018 article announcing that November's trip. |
| Mira Mesa, CA | Rose source names the program | District agrees | Recorded band path redirects to an actual band site; its footer confirms Brendan Lockie. Current email there uses another domain and was not automatically added. |
| Carmel, IN | Official BOA 2024 results confirm a finalist entry; Rose invitation also stored | District agrees | Other BOA years/2027 appearance not all independently verified; competition and future evidence must not be called completed parades. |
| Arcadia, CA | Rose source names the program | District agrees | Homepage resolves but alone does not certify it is the best band-program URL. |
| Brookwood, GA | Rose source names school/city | District agrees | Stored legacy website failed in the web reader; no definitive HTTP dead-link classification. |
| Castle, IN | BOA 2024 results confirm finalist identity | District agrees | School performing-arts page resolves. Its other historical event and enrollment remain unverified here. |
| Cherry Creek | Hollywood's 2026 category names the program | Current row cannot match without state | Historical exact NCES match and current school homepage identify Greenwood Village, CO. That researched identity was lost in the QA rebuild. |

## Primary-source checks

- [Conroe district fine arts](https://www.conroeisd.net/o/cisd/page/fine-arts): the Woodlands-stored email belongs to the district Director of Fine Arts. It is not school-specific band-director evidence.
- [Cedar Park fine arts](https://cphs.leanderisd.org/campus_information/fine-arts): printed email and head-band-director role agree. Its spelling of the first name is also the CSV spelling.
- [Albertville fine arts](https://www.albertk12.org/ahs/fine-arts): named director and school band are present.
- [Mira Mesa band site](https://www.miramesabands.org/): identified band and named director; reached via the stored school band route. No new contact was written to the list.
- [WLOX Biloxi announcement](https://www.wlox.com/story/37378335/biloxi-high-band-to-march-in-americas-oldest-thanksgiving-day-parade/): January 2018 publication and upcoming Thanksgiving trip contradict the stored 2017 claim.
- [Houston 2025 lineup](https://www.houstontx.gov/thanksgivingparade/2025performers.html): supports the named units, but not the parser's blanket assumption that every participant is based in Houston.
- [BOA 2024 finals](https://marching.musicforall.org/result/grand-national-championships-2024/): supports finalist records including Carmel and Castle; these are competition results.
- [Hollywood 2026 category](https://thehollywoodchristmasparade.org/category/2026-marching-bands-dance-cheer-groups/): lists Cherry Creek; a 2026 Christmas event is still future as of this audit.
- [Cherry Creek school](https://cherrycreek.cherrycreekschools.org/): footer places the school in Greenwood Village, CO.
- [Alhambra district](https://www.ausd.us/): district homepage, listing multiple high schools. It does not establish a school called “Alhambra Unified School.”
- [Martin Luther King Jr. school](https://www.mlkinghs.dekalb.k12.ga.us/) and [Ayala school](https://ayala.chino.k12.ca.us/): the two other organic picks resolve to school sites; identifying a site is not verification of every enriched field.

Secondary discovery pages inspected: [Rose bands](https://en.wikipedia.org/wiki/Rose_Parade_marching_bands) and [Philadelphia bands](https://en.wikipedia.org/wiki/6abc_Dunkin%27_Thanksgiving_Day_Parade). Some statements in those lists are themselves questionable; do not promote a listed claim to verified fact without resolving conflicts. The current Rose page now includes Austin, TX in the Westlake 2024 entry; recheck that against a primary band/organizer source before merging the previously stateless record.

## Historical placement verification

| School | Historical state | Directory / source assessment | Current disposition |
|---|---|---|---|
| Cherry Creek | CO | Exact national school-name match; official homepage agrees. Broader substring search additionally finds Cherry Creek Elevation. | Retained school lost its enriched state/fields |
| South Paulding | GA | Unique exact NCES school; stored website is district-level | Retained school lost its enriched state/fields |
| Van Nuys | CA | NCES school exists; historic city Los Angeles is broader than directory city Van Nuys | Intentionally excluded cheer entry; do not restore as band |
| Concord Community | IN | Unique exact NCES school in Elkhart | Retained school lost its enriched state/fields |
| East Coweta | GA | Unique exact NCES school in Sharpsburg; district website resolves | Retained school lost its enriched state/fields |
| Habersham Central | GA | Unique exact NCES school in Mt Airy; district website resolves | Retained school lost its enriched state/fields |
| Mira Costa | CA | One broad-name NCES candidate in Manhattan Beach; stored homepage currently returns unavailable | Retained school lost its enriched state/fields |
| Southeast Raleigh | NC | One broad-name NCES candidate in Raleigh; old school URL failed in reader | Retained school lost its enriched state/fields |
| Decatur Central | IN | Unique exact NCES school in Indianapolis; old school URL failed in reader | Retained school lost its enriched state/fields |

Directory agreement supports the reviewed placement, but the original parade observation's association still needs retained provenance. NCES's public-school scope does not justify treating every unqualified same-name band as nationally unique.

## Remaining checks are explicit

All-school field-level provenance, enrollment totals, six booster organizations, complete historic event verification, all 188 exclusions, all live source URLs and real blocked-source fixtures are not certified by this sample. The audit plan assigns these checks to remediation tasks rather than presenting them as passed.
