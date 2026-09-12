# Proposal example: internal review and evidence map

Internal working file for the logistics and software developer. September 11, 2026.
Reviews [the proposal draft](<Troen - Carnegie Hall Proposal Example.md>) and its
[Word copy](<Troen - Carnegie Hall Proposal Example.docx>). Companion:
[the March 3 director FAQ](<Troen - Carnegie Hall Director FAQ.md>).

This file is not an appendix to the draft and is not sent anywhere. The questions
in the last section are internal; **none of them has to be answered before this
draft can be reviewed and accepted for internal use.**

## Assistant acceptance review — September 11, 2026

Accepted for internal demonstration after three bounded wording corrections in the
integration copy. Worker originals remain unchanged and uncommitted in Claude's
checkout at base `0859701b6f78b423ac2eeca0bc599c0a859c79de`.

- Narrowed the attire/arrival statement to clinic, soundcheck and performance;
  P01 pp. 3–5 supports these, not an equivalent rule for the awards ceremony.
- Recast the school-approval opening as a proposed summary, not an unsupported
  general claim about how schools decide.
- Explicitly classified the earlier departure, extra night and unchanged festival
  sequence as invented scenario assumptions, not inevitable or confirmed outcomes.
  I11 was visually reviewed: it concerns a different real school/destination and a
  supplier's overnight-driving objection. No supplier identity, route, dates,
  commercial terms, regulatory hour limits or real-trip numbers were copied into
  the proposal. Its invented driver policy is not presented as a legal rule.

**Proportion:** the worker's approximately 1,080-word description is a rough count;
normalizing Markdown syntax/table separators gives 1,024 original words and 1,001
revised words. Both render to two US Letter pages. The scope is proportionate for
an internal worked proposal: it covers the full path without demanding business
homework. It is a demonstration of proposal structure, not a ready-to-issue quote.
No broader rewrite or UI change was necessary.

**Independent verification:** complete ordered text agrees between Markdown and
Word after whitespace and typographic-apostrophe normalization. Five apostrophe
style differences in the original were cosmetic; a word-set comparison alone would
not have checked order or repeated words. ZIP/XML validity and both Word hyperlink
destinations pass. All proposal/review/handoff local Markdown links resolve.
The brochure's six rendered pages and the relevant I11 photo were inspected.

**Rendering discovery:** this environment has a bundled LibreOfficeDev 26.8 headless
renderer, `pdfinfo` and `pdftoppm` under the Codex runtime. The wrapper provides an
isolated temporary profile; nothing was installed. PyMuPDF was absent, so Poppler
was used. Original and revised DOCX files were exported to scratch PDFs and every
page inspected. Both are two pages; no clipping, overlaps, stranded headings or
split table rows. The intact table ends page one and its explanation continues on
page two. Footer labels are visible on both pages; body text is readable. No change
to the layout was required.

Native Microsoft Word is installed but was not launched: Word-specific pagination
and physical-iPhone display remain unperformed checks, not evidence that the local
rendering task is blocked. No required acceptance check remains blocked. The worker's
missing-tool statements below are retained as historical reports, superseded for
this review by actual runtime discovery and rendering. The original handoff file
is preserved byte-for-byte. Scratch PDFs/images are verification artifacts, not
new deliverables or published material.

**Frozen original SHA-256 values:**

- `docs/carnegie-hall/materials/Troen - Carnegie Hall Proposal Example.md`: `0e9bcc8b2a0a969e0bb8208ff704b2a806106898c9e1bb3cff940533d1d63182`
- `docs/carnegie-hall/materials/Troen - Carnegie Hall Proposal Example.docx`: `3877bdc973b68c5eed6c96d3f74967365c0d6387ecf13fe6a08862bcbcfd06cc`
- `docs/carnegie-hall/materials/PROPOSAL-EXAMPLE-REVIEW.md`: `744d8bab82ee590707837e372923821c93583292e282bf841b3ebe65915092b1`
- `docs/carnegie-hall/coordination/claude-proposal-example-handoff.md`: `fd2c3fa038236ffa35d4b88b4d542f3a86176eca23cc3fc1aac72344f896657e`

## Scope and treatment

The draft demonstrates the shape of a tailored proposal for **March 3, 2027** using
an invented group. It quotes no price, promises no arrangement, and records no
agreement, payment, reservation, approval or supplier hold. Festival content comes
from the shared brochure, which covers March 3 **and** March 31, and the draft
carries that qualification in its opening block.

Evidence classes used below: **documented** (a supplied source states it),
**shared-brochure** (documented but written for both 2027 dates, so it needs
confirmation for a newly sold March 3 package), **recommendation** (the developer's
proposed structure), **fictional assumption** (invented for the example), and
**unresolved** (deliberately left open).

## Claim-to-source map

| Draft paragraph or element | Claim | Class | Source and locator |
|---|---|---|---|
| Header line | Wednesday, March 3, 2027; Stern Auditorium / Perelman Stage | Documented | [P01](<../../../logistics/carnegie hall EVENT OVERVIEW.pdf>) p. 1 (dates) and p. 5 ("the concerts are held on the main stage, the Stern Auditorium / Perelman Stage"); [I06](../../../logistics/IMG_4374.heic) names Troen and the event for this date. Planned event; not a booking. |
| Opening block | Shared March 3 / March 31 brochure scope | Documented | P01 p. 1 header covering both dates; same qualification as the FAQ. |
| "The ensemble in this example" | Example Concert Ensemble; about 55 students and 6 adults; first out-of-state trip; director's goals | Fictional assumption | Invented. Consistent with the fictional scenario in [example.json](../../../demo/carnegie-hall/example.json) (`scenario.fictional: true`, "Example concert group"). No real group's numbers. |
| "Why the March 3 event suits that purpose" | One-hour clinic with an adjudicator at Boulevard Carroll Music Studios, with preparedness advice and support | Shared-brochure | P01 p. 2 clinic and preparedness bullets; p. 3 clinic narrative. Named clinician deliberately omitted, matching the FAQ treatment. |
| Same | Soundcheck on stage, concert performance, closing awards ceremony | Shared-brochure | P01 p. 3 numbered four-part sequence; pp. 4–6 detail. |
| Same | Written adjudicator comments and ratings, or comments only; archival recording | Shared-brochure | P01 p. 2 rating/comments and recording bullets. Rating-or-comments distinction preserved; no result, delivery date or reuse right implied. |
| Same, second paragraph | The sequence reads as educational work | Recommendation | Developer framing, consistent with the FAQ's approval answer and [strategy 05](../strategies/05-director-and-partner-materials.md). Not a measured learning outcome. |
| "What the festival provides" list | Base room; director dressing-room arrangements; event shirts; backstage credentials; playbill copies; assigned event director | Shared-brochure | P01 p. 2 inclusion bullets. Introduced by "subject to confirmation for this date". |
| Same, closing sentence | Arrival buffers and attire specified for clinic, soundcheck and concert performance; no such claim for awards | Shared-brochure | P01 p. 3 (event shirt for clinic; arrive before the slot), p. 4 (shirt and backstage pass for soundcheck; arrival buffer), p. 5 (concert attire; arrival buffer before the performance slot). Exact buffer lengths are in the source but are **not** quoted in the draft, because they are written for both dates and the group's real itinerary is not set. |
| Responsibilities table | Festival participation and event-day coordination sit with Troen; transport, accommodation, meals, activities and registration could sit with Troen, the school or a travel company | Recommendation | Troen's two roles are described in [business context](../BUSINESS-CONTEXT.md) §1, which also records that some March 31 groups are associated with outside tour companies and that exact responsibilities and terms need confirmation. The table presents options, assigns none, and names no company. |
| Same, closing sentence | The pattern changes price basis, the agreement and the point of contact | Recommendation | Developer reasoning. No commercial term is stated. |
| "Inclusions and exclusions to agree" | A group-specific offer lists cover, exclusions, options and school-arranged items; optional travel protection carries its own approved wording | Recommendation / unresolved | Protection sheets [I01](../../../logistics/IMG_4368.HEIC) and [I02](../../../logistics/IMG_4369.HEIC) exist but their benefits and rates are not reproduced; the register's "Protection wording" row requires approved current wording before customer use. |
| "A short approval summary" | Proposed contents of a one-page approver summary; no general assertion about school policy or approval | Recommendation | FAQ's school-approval answer; strategy 05 administrator row. No school policy, deadline or approval status is represented. |
| "Agreement, payments and price basis", first paragraph | No agreement, deposit, payment schedule or cancellation terms are recorded | Unresolved | Register rows "Prices and inclusions" and "Contracts and booking rule" in [internal decisions](../INTERNAL-DECISIONS.md). Deliberate omission. |
| Same, second paragraph | Price basis depends on confirmed inclusions, travel pattern, paying performers and adults, and length of stay | Recommendation | Structure only. [P02](<../../../logistics/NYIMF 2027 Budget.pdf>) contains working sheets but is not established as a final March 3 budget, so no figure or margin is used. |
| "One change, worked through" | A motorcoach operator declines a proposed overnight drive under its driver-hours policy | Fictional assumption | Invented. Pattern precedent only: [I11](../../../logistics/IMG_4379.HEIC) records a real bus company questioning an evening departure and overnight drive on a **different** trip. No supplier is named, no date is copied, and nothing is requested, held or confirmed. |
| Same | An earlier departure, extra night and unchanged festival sequence are explicit invented assumptions; cost basis and approval summary would need revision | Fictional assumption / recommendation | Invented choices, not a consequence established by I11 or P01. The proposed version review follows the price-basis structure above. Mirrors the version-control behaviour in the [fictional follow-up](<../../../demo/carnegie-hall/exports/Troen - Example Follow-up.md>). |
| "The next useful step" | Confirm inclusions and time slot; choose the travel pattern | Recommendation | The two inputs that would convert the structure into a real draft. Explicitly not required to review the structure. |
| Source line and footer | Brochure pages 1–6; companion FAQ; prepared by the logistics and software developer | Documented | P01 is six pages. Role wording per shared instructions. |

## Deliberately excluded from the draft

| Item | Where it exists | Why it is not in the draft |
|---|---|---|
| Named artistic director and clinicians | P01 pp. 3 and 6 | The FAQ's reviewed treatment carries no named clinician and no venue-employment implication. Kept consistent. |
| Matinee and evening house and start times | P01 p. 5 | Written for both 2027 dates. A newly sold March 3 group's slot is not set. |
| Evening session, stated start time, stated duration, licence fee | I06 | Internal licence evidence. The register keeps the fee and licence terms internal; the draft says the time slot is confirmed in the tailored offer. |
| "Producing the Carnegie Hall concert for over 15 years" | P01 p. 5 | Business context records this as a brochure claim needing corroboration before competitive use. |
| Introduction of groups by the president or owner | P01 p. 5 | Individual-role detail with no bearing on a proposal's structure. |
| Hotel dates and terms | [P03](<../../../logistics/BMG - Troen Tours & Events - Carnegie Group - March 29 - April 1, 2027 - Group Contract.pdf>) | March 29 – April 1, 2027 belongs to the later event window and must not become a March 3 term. |
| Registration, rooming and final-number deadlines | I12 | Belong to a different trip in 2026. The draft describes the dependency without dates. |
| Travel-protection benefits and rates | I01, I02 | Require current approved wording. |
| Music Travel Consultants | [Partner pilot profile](../research/partner-pilot/PROFILE.md) | Assignment excludes it; the event relationship stays unconfirmed and no contact is recommended. |
| Participation, deposit exposure, capacity | Business context §2 | Employee-reported and internal. No live counts appear. |

## Worker-reported verification (before assistant review)

| Check | Result |
|---|---|
| Markdown and Word text equivalence | Word-set comparison in both directions returned no differences; every Markdown block appears verbatim in the Word text, including the footer line. |
| Word package integrity | Zip integrity test passed; all XML parts parse; 15 parts. |
| Word reader check | macOS `textutil` converted the file to text successfully, including the responsibilities table. |
| Styling family | Built from the reviewed FAQ document as a template, so page size, margins, base font, heading styles and footer behaviour match its conventions. |
| Hyperlink relationships | Two external links, both referenced; an unused link inherited from the template was removed. |
| Document properties | Title, author role and an internal-demonstration comment set; no personal name. |
| Fictional and status labels | Present in the title block, the opening bold sentence, the illustrative-change block and the page footer. |
| Brochure re-read | P01 text extracted locally from the supplied PDF and read in full before citing; pages 1–6 confirmed. |

**Not performed:** rendering to PDF or images, visual page-count and page-break
inspection, and native Microsoft Word or iPhone display. LibreOffice is not
installed on this machine, so the layout check used for the September 10 director
sheet could not be repeated. The draft is about 1,080 words with one small table,
which should fall inside the two-to-three page target, but that is an estimate and
not a verified page count.

## Internal questions this draft does not need answered

1. What festival inclusions are confirmed for a newly sold March 3 group?
2. What performance time slot would a new ensemble receive on that date?
3. What is the approved price basis, and what does the price include and exclude?
4. Which travel patterns will Troen offer for March 3, and which does it prefer?
5. What payment milestones and change or cancellation terms apply?
6. What is the current approved travel-protection wording, if it is offered?
7. Are there ensemble type or size requirements for this date?
8. How many additional ensembles can the session actually take?

These map to existing rows in [internal decisions](../INTERNAL-DECISIONS.md) and are
recorded here rather than added to that shared register or to customer-facing copy.
Question 1 and question 4 are the two that would convert this example into a real draft.
