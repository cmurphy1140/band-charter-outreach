# Follow-up questions for Troen Student Performance Events

Grouped by what the answer changes in the pipeline.

## The Veterans Day / Universal opportunity

1. Is the Universal Orlando Veterans Day parade confirmed, and for which year? The
   recency and geography weights are tuned for a 2026 target.
2. How many bands can the parade take, and is there a minimum or maximum band size?
   That sets how deep the Tier A list needs to be and whether NCES enrollment should
   be a hard filter.
3. What does a band pay, roughly, and what is included (travel, lodging, park
   tickets)? Bands that have already flown to Rose or Macy's are budgeted for this;
   others may not be.
4. Is there a performance requirement (audition video, BOA rating, state assessment
   superior rating)? If so the BOA and state-assessment sources become filters, not
   just signals.
5. When do invitations need to go out? School boards approve trips a year ahead, so
   the outreach window drives which `last_appearance` years still matter.

## Who counts as a prospect

6. Colleges, honor bands, and drum corps are excluded today. Do any of them belong
   on a separate list for other Troen offerings?
7. Should middle schools or K-12 programs be kept for a future pipeline?
8. Puerto Rico appears as a US state code (one school). Include or exclude?
9. Are there schools or districts already under contract, or that should never be
   contacted, that we should suppress before anyone sees the xlsx?
10. Is a school that marched only once, years ago (Rose 2015, nothing since) still
    worth a slot in Tier B, or should recency be a hard cutoff?

## Scoring and geography

11. The geography weights assume Florida first, then GA/AL/SC/NC/TN, then the rest of
    the Southeast and Texas. Does that match how you sell (drive-market vs fly-in)?
12. Should a Macy's appearance outrank a Rose appearance, or are they equal travel
    signals? Today they are equal.
13. How much should a BOA Grand National finalist year count versus a parade
    appearance? Competitive programs and parade programs are not the same audience.
14. Tier A is the top 50 and Tier B the next 100. Is that the size of list your team
    can actually work in one season?

## Contacts and outreach

15. Who does Troen normally reach first: the director, the booster president, or the
    district fine-arts coordinator? The crawl currently looks for the director only.
16. Is a director name without an email useful, or should the sheet only surface
    rows with a usable address?
17. Do you have an existing contact list or CRM export you would like merged in
    (supplied by you, never scraped) so we do not duplicate outreach?
18. Should the "why them" note be written in Troen's voice for direct pasting, or as
    internal research notes?

## Sources and maintenance

19. Can someone on your side save the Macy's, Tournament of Roses, and Chicago
    lineup pages from a normal browser? That unblocks three sources at once.
20. Which additional parades matter to you (Gasparilla, Cherry Blossom, Plymouth,
    Fiesta Bowl, Disney/Universal programs)? Each is a new scraper.
21. Do you want the seasonal refresh PRs reviewed by someone at Troen, or merged
    automatically with a summary email? (The workflow is read-only by default.)
22. Is a Google Sheet the working surface for the team, or is the xlsx enough? The
    Sheet export needs a service account from you.
