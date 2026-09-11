# 07 — Software fit and selective automation

[Strategy index](README.md) · [Zoho research](../ZOHO-RESEARCH-PROMPT.md) · [Tools and connectors](../TOOLS-AND-CONNECTORS.md)

## Purpose and proposed result

Show how the useful work could repeat with less manual assembly while preserving Troen's existing tools. The proposed result is a software fit map, one bounded local automation example, and an explicit path from demonstration data to a possible future system handoff.

Do not make a CRM migration or a complete Zoho account audit the starting assignment. The received report is enough to distinguish broad roles and avoid unsupported assumptions. Exact subscription, seller, costs, entitlements, and permitted data use matter when a specific account change or integration is proposed.

## Separate the jobs

| Job | POC treatment | Possible later destination |
|---|---|---|
| Discover public organizations | Source-backed local research staging | Remains a research layer unless a permitted handoff is established |
| Track an actual business relationship | Demonstrate with synthetic opportunity records | Existing CRM or a simple working sheet, depending on real workflow |
| Prepare documents | Generate editable examples from checked fields and templates | Existing document folders and approved templates |
| Summarize next actions | Produce an example brief from explicit scenario records | A local or permitted connected reporting process |
| Record contracts/payments | Show separate illustrative states and evidence references | Actual systems of record; never inferred from model prose |
| Schedule follow-up work | Describe the future mechanism and failure handling | Available local/cloud execution only after a working manual run |

The report's distinction between discovery, enrichment, CRM, marketing, and reseller services is central. “Zoho finds clients” remains employee-reported shorthand, not proof of a particular product or lead supplier.

## Recommended first automation to evaluate

**First implementation checkpoint — September 10, 2026:** the [connected-example generator](../../../demo/carnegie-hall/README.md) now turns one reviewed JSON record into a static preview, editable Word/Markdown director sheet, research note, and explicitly fictional action brief. It is a manually invoked local build, not a scheduled or connected workflow. Tests cover manual-edit preservation, missing contact evidence, unsafe public source URLs, and event/scenario boundaries. No productivity percentage has been measured.

Start with **local preparation of an action brief or profile document from a small reviewed file**. This is a useful, reversible example: given the same records and template, generate consistent output; when a record changes, show the corresponding change; when data is missing, preserve the missing state.

**September 11 extension:** the same Wando record and a separate Salem record now feed a two-case opportunity workbook and the local comparison. The [workbook builder](../../../demo/carnegie-hall/build-workbook.mjs) uses `@oai/artifact-tool` from the Codex bundled runtime. Its scratch dependency link, build order, separate-output option, and edit-preservation behavior are documented in the [demo README](../../../demo/carnegie-hall/README.md). This is a tested local authoring route, not a hosted service or an Excel synchronization feature. Source changes require both workbook and demo builds; manually edited outputs require deliberate reconciliation by opportunity ID. No preparation-time saving has been measured.

A profile-to-document example may be simpler than automating prospect collection immediately. A scenario-to-brief example may better demonstrate the broader pipeline. Choose whichever supports the connected example already being built; do not implement both just to increase the feature count.

## Implementation strategy for that small increment

1. **Select one repeatable transformation.** Define the input file, fields, template, output, and what must remain untouched. Use the current repository conventions and approved libraries.
2. **Create a reviewed baseline output.** The automation should reproduce a useful document, not invent its format and business rules during every run.
3. **Keep calculations and states explicit.** Use ordinary code for dates, counts, identifiers, and required-field checks. If a model helps summarize, limit it to supported interpretation and retain links to the underlying facts.
4. **Generate locally into a separate output area.** Do not overwrite original prospect data, source logistics, or edited customer documents. Record input/template versions and the generation result.
5. **Handle changes and failures.** A missing file, malformed record, or unavailable source should produce an understandable result and preserve the last useful output. Repeated runs must not create duplicate opportunities or contradictory totals.
6. **Compare with the baseline.** Inspect the document and check actual data changes. Measure developer preparation/review time rather than claiming whole-business savings.
7. **Expose the result in the local demo.** Show what was generated and the data that drove it. Keep an obvious distinction between this working local transformation and a merely proposed external connection.

## Zoho handoff demonstration

Use a hypothetical field mapping from the POC record to generic CRM concepts such as organization, contact, opportunity, next action, and evidence reference. Clearly label it “proposed mapping; account not connected.” Do not assert edition-specific fields or enabled automations without current product documentation and the applicable account facts.

Show a field such as contact-permission status as unknown rather than deriving it from a public email. The [Zoho policy finding](../ZOHO-RESEARCH-PROMPT.md) constrains future marketing and email-enabled imports. A local research profile is still useful without being placed in that system. No actual connector is verified for Troen's Zoho account in this task.

The smallest future integration experiment would use a reviewed, permitted sample in a controlled destination, preserve relationship links and notes, and verify an export/rollback path. It should not begin with a bulk import of the old prospect file.

## Bounded extraction-tool evaluation

**Decision — September 11:** reuse the verified SerpAPI client for discovery.
Evaluate Firecrawl on a small representative extraction sample before adoption;
consider Zyte or Apify only for a demonstrated remaining gap. This request updates
the protocol only. No subscription, paid or free trial run, new account, package
installation, source upload, or broader scrape is authorized by this revision.

Keep discovery and extraction comparisons separate. SerpAPI finds candidate
sources; the existing requests/BeautifulSoup, local PDF and permitted browser
route is the extraction baseline. A provider must improve that route for an actual
POC need; it cannot fix the legacy identity joins, replacement logic or scoring.

### Proposed sample and controls

When evaluation is authorized, select at most **six public source cases** already
relevant to the work: a simple program page, a multi-person staff page, a same-name
school case, a permitted rendered tour-provider page, a text/table PDF, and a scan
needing OCR if one is useful. Cap PDF input at ten selected pages in total. These
are proposed limits, not a requirement to find six new prospects or force a weak
example into the POC. Choose exact URLs and allowed access before execution.

1. Prepare a human-reviewed expected-field sheet first: correct institution,
   location, available NCES reference, explicit adult role/contact, appearance
   type/status/date, and supporting passage/page. Include deliberately unknown
   fields and ambiguous records so fabricated completeness fails visibly.
2. Run the existing extraction route and Firecrawl on the same permitted source
   versions, fields and limits. Record content/version differences rather than
   calling a source change an extraction error. Preserve outputs separately from
   approved records. Allow one initial pass and at most one explained corrective
   rerun per case; count failed attempts, retries and manual fixes.
3. Add offline fixtures for blocked, partial, confirmed-empty and stale responses.
   Verify that each route reports the outcome and cannot overwrite accepted POC
   records. No live blocked-site probing is needed to test preservation behavior.
4. Inspect raw output before human correction and final accepted output after it.
   Record both. A readable Markdown result or a provider's success flag alone is
   not a successful, complete extraction of the underlying page.
5. Use a compact comparison table in the existing progress/evidence records and
   keep the relevant sample artifacts together. Do not replace the primary client
   or connect a new provider to production during evaluation.

| Measure | What to compare and retain |
|---|---|
| Extraction accuracy | Correct extracted fields / all populated fields; recovered supported fields / expected supported fields. Report denominators and per-case errors, especially wrong schools, roles, dates and invented contacts; exclude genuinely unavailable fields from recall. |
| Preserved evidence | Original/final URL or file, permitted snapshot/hash, page/section/staff-record locator, extraction method/version/options, retrieval and review dates, source status and cache age. Every accepted critical claim must be traceable. |
| Cost | Actual billed units and observed plan/rates at evaluation time, including PDF pages, extraction/render options, failures and retries. Report total sample cost and cost per validated record; separate included allowance, recurring charges, review time and setup effort. No current price or budget is assumed. |
| Maintenance | Setup and correction minutes, custom rules, dependency/configuration burden, repeatability on retained fixtures, failure visibility, manual fallback, and portability to another host. Record what would need upkeep after the first run. |

**Acceptance:** zero unsupported accepted school identities, contacts or event
dates/statuses; complete evidence for accepted critical claims; prior records and
manual edits preserved on failures; and a demonstrated useful coverage or total
effort improvement within a later authorized budget. Report raw errors even if
human review catches them. A six-case result supports only a bounded adoption
decision, not a general accuracy or productivity guarantee. If benefits are unclear,
retain the existing route. If evidence is lost or source access is not permitted,
stop that case and preserve the limitation.

Only then consider **one of Zyte or Apify** for the exact unresolved case. Record
why the baseline/Firecrawl failed, expected improvement, provider/Actor and version
where applicable, evidence output, cost model and maintenance owner before a
separately authorized trial. Do not adopt both by default or treat a block as a
reason to escalate through providers.

Official Firecrawl documentation reviewed September 11 describes multiple output
formats, separate API/page status, cache controls, and document parsing options.
Those are capabilities to test, not demonstrated Troen results. Record the exact
options and their cost implications when evaluating. [Scrape documentation](https://docs.firecrawl.dev/features/scrape),
[document parsing](https://docs.firecrawl.dev/features/document-parsing).

## Scheduling and model choices

The existing SerpAPI client now supports a private repository-root `.env` as a
fallback to the execution environment's `SERPAPI_KEY`. The [local setup](../../../README.md#local-serpapi-setup)
includes a blank template and `make check-serpapi`, a presence-only check with no
API call. Tests isolate credentials, exercise both API consumers with mocks,
preserve cache reuse, and check that failure output does not echo request secrets.
A separate live check on September 11 succeeded: one Google search returned
results, and a repeat used the local cache. This validates the configured client,
not the relevance of the results or the audited discovery/merge workflow. Each
separate host/worktree needs its own secret; no automatic cloud transfer is implied.

Codex and Claude Code can implement, inspect, test, and maintain independent increments concurrently in separate worktrees under the [parallel workflow](../PARALLEL-WORKFLOW.md). Transfers of the same task remain sequential. Choose the tool that has the relevant files and capabilities, record the working state in PROGRESS.md, and confirm the outgoing tool has stopped before switching. A second model is useful only when the handoff adds a meaningful check. Agreement between models is not source verification. See the [capability sources](../POSITIONING-AND-OPPORTUNITY.md) and local tool availability map.

Scheduling comes after a successful manual run and a clear need for repetition. Local scheduled work needs the relevant machine, app/session, files, and permissions available. A schedule is not an always-on service guarantee. Define what changes are actionable, how failures are surfaced, and how to stop the job. This strategy does not create a schedule or start a monitoring loop.

## Verification, activation, and stopping point

Check repeated-run behavior, changed inputs, missing fields, failed generation, preservation of edited files, correct event IDs, and clean text exports. Use meaningful tests for implemented behavior and render/inspect generated documents. Record what was actually executed.

Completion means one useful local transformation and a credible map of later options, if that increment is subsequently authorized and built. Live account work waits only for the facts relevant to that specific action: product/edition, destination, permissions, field behavior, and rollback. CRM replacement, payment automation, bulk emailing, and a multi-client service remain future possibilities.
