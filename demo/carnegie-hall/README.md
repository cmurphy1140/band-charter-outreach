# The first connected Carnegie example

[Open the demonstration](index.html) · [Project reference pack](../../docs/carnegie-hall/README.md)

This is a working local prototype for March 3, 2027: reviewed Wando and Salem school examples, a small MTC research candidate, an editable opportunity workbook, a Wando director sheet, a director FAQ, and two fictional follow-up situations. MTC's NYIMF/Troen event relationship is unconfirmed. It illustrates research capability and carries no recommendation to contact MTC. No real outreach, response, approval, contract, payment, or booking is represented. The broader POC remains in progress.

## Inspect the result

Open `index.html` directly in a browser, or run this from the repository root after checking port 8765 is free:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory demo/carnegie-hall
```

Then open [the local demonstration](http://127.0.0.1:8765/). Only this demo directory is served. It now includes a checked copy of the shared event brochure cited by the FAQ; license photographs, budgets, business decision registers and other source data remain outside its web root. The localhost address works on the machine running the server, not automatically on an iPhone or a separate cloud host.

- [Wando research note](<exports/Troen - Wando Research Note.md>) — evidence, adult role, source links, unknowns, and next action.
- [Salem research note](<exports/Troen - Salem Research Note.md>) — City of Salem identity, separate Virginia Beach school, undated travel history, and current public program evidence.
- [Editable opportunity workbook](<outputs/01a08da2-45ab-7181-a80f-a887cb079101/Troen - Carnegie Opportunity Review.xlsx>) — two school cases and one tour-operator candidate, twelve public sources, working dispositions, and review notes.
- [Editable Word director sheet](<exports/Troen - Wando Director Sheet.docx>) — the one-page discussion draft.
- [Director sheet in Markdown](<exports/Troen - Wando Director Sheet.md>) — portable text version.
- [Example follow-up brief](<exports/Troen - Example Follow-up.md>) — two fictional situations spanning proposals, approvals, contracts/payments, suppliers, and final coordination.

The [Materials view](index.html#material) includes a full March 3 FAQ preview with
[Word](<exports/carnegie-hall/faq/Troen - Carnegie Hall Director FAQ.docx>) and
[Markdown](<exports/carnegie-hall/faq/Troen - Carnegie Hall Director FAQ.md>) downloads,
plus the [cited shared brochure](<logistics/carnegie hall EVENT OVERVIEW.pdf>).
The canonical [Word source](<../../docs/carnegie-hall/materials/Troen - Carnegie Hall Director FAQ.docx>)
and [Markdown source](<../../docs/carnegie-hall/materials/Troen - Carnegie Hall Director FAQ.md>)
remain manually maintained internal drafts. Packaged copies are byte-for-byte;
they are not regenerated from demo JSON. Preserve edits to either source or download.

The Word file and HTML preview are independent editable/readable outputs, not a live Word synchronization feature. A hand edit to the Word file does not change the JSON or browser preview.

The workbook has **Opportunities** and **Evidence** tabs. Amber cells hold your working disposition and notes; they begin with no business decision recorded. Use table filters/sorts so notes and opportunity IDs travel with their entire rows. Source dates distinguish review dates from historical performance dates and planned listings. Published school contacts appear with their evidence. MTC has no contact field in this example. This small workbook is still smaller than the proposed varied batch.

The MTC card uses three sources from the [reviewed pilot register](../../docs/carnegie-hall/research/partner-pilot/SOURCES.md): company identity (MTC-02/C1), NYC services (MTC-01/C6), and a planned March 3 calendar listing (MTC-05/C7/U1). A matching date does not establish Troen as the producer or an MTC relationship. The original internal partner sheet remains outside the demo; this example adds no partner pitch or outreach strategy.

## Design and implementation choices

The approved first increment follows [experience strategy 04](../../docs/carnegie-hall/strategies/04-poc-experience-and-design.md) and [materials strategy 05](../../docs/carnegie-hall/strategies/05-director-and-partner-materials.md). A static folder was chosen over a new application framework because this example needs navigation, source review, downloads, and a resettable fictional scenario, with no backend. The original Python pipeline was inspected and preserved; Wando was selected from its candidate list and researched afresh.

The layout follows the work: research first, matching material second, possible next actions third. The research view places a school profile beside the event explanation; the material view pairs download controls with a document preview; the scenario view separates the fictional group from the real school.

```text
Troen              Carnegie Hall, March 3             Demonstration
1 Research the fit | 2 Shape the conversation | 3 What follows
School and evidence                      Event and learning experience
Director sheet                           Sources and internal unknowns
```

The visual direction is a readable performance program: Georgia display type, system sans-serif body text, left-aligned copy, generous spacing, and a restrained cool palette. Tokens are ink `#173f42`, accent `#1d5d55`, paper `#fbfcfa`, surface `#f0f5f2`, line `#c8d5cf`, and muted text `#51635b`. Depth stays subtle. The Word sheet pairs Georgia with Arial for reliable rendering. This avoids a dashboard full of invented metrics while keeping the real evidence prominent.

All existing image and font paths were inventoried before visual work. The repository had logistics photographs and research-report renders but no existing POC interface, logo, or bundled typeface to reuse. There was no previous interface screenshot to capture. This text-forward design uses no photographs, invented venue assets, external fonts, or icon package. The referenced Desktop design-arsenal file was unavailable; the project’s documented aesthetic direction was used.

## Source and build responsibilities

| File | Responsibility |
|---|---|
| [example.json](example.json) | Reviewed facts, source IDs, draft director copy, and separately labeled fictional scenarios |
| [salem.json](salem.json) | Separate Salem research, identity distinction, adult role, and source register |
| [mtc.json](mtc.json) | Illustrative tour-operator candidate, unconfirmed event relationship, and three previously reviewed sources |
| [review.cjs](review.cjs) | Shared record loading, unique identities, source ownership checks, and safe spreadsheet text |
| [build-workbook.mjs](build-workbook.mjs) | Editable XLSX using the Codex bundled artifact library; no legacy data writes |
| [index.template.html](index.template.html) | Shared page structure and navigation |
| [styles.css](styles.css) | Responsive presentation and focus/reduced-motion treatment |
| [app.js](app.js) | In-page navigation and resettable scenario selection; no network requests or persistent state |
| [build.cjs](build.cjs) | Escaped HTML, editable DOCX/Markdown exports, manual-edit protection, and HTML-only refresh |
| [faq-sources.json](faq-sources.json) | Reviewed hashes of the canonical FAQ pair and brochure; changed/missing sources stop packaging before output writes |
| [tests](../../tests/carnegie_demo.test.cjs) | Escaping, missing contact, source/date/scenario boundaries, and preservation checks |
| [Review tests](../../tests/carnegie_review.test.cjs) | Duplicate identities, cross-record sources, candidate boundaries, spreadsheet text safety, and preservation |

### FAQ source and download preservation

`node demo/carnegie-hall/build.cjs --faq-only` refreshes `index.html` and the three
FAQ-related files. It leaves the Wando/Salem exports and workbook untouched, including
manual edits to those files. Source hashes must match `faq-sources.json`; the existing
`.generated-manifest.json` guard also protects edited or unregistered destinations.
The source receipt identifies a reviewed version, not an automatic Word/Markdown
content comparison. Never update it merely to silence a failure. Preserve the edit,
reconcile both FAQ copies and the source citation, inspect the document, then record
the reviewed hashes/date. Neither build mode edits the canonical FAQ pair.

The FAQ downloads use `exports/carnegie-hall/faq/` so their existing three-parent
relative brochure citation resolves to the bundled `logistics/` file. Only that
brochure is copied. The citation works within the complete package; moving a Word
or Markdown file alone does not carry its linked PDF. The Materials card offers the
brochure separately as well.

A full `--out <new-directory>` build includes these copies, the brochure, existing
downloads, styles and script. Use that for a standalone package. `--faq-only --out`
is a partial refresh, like `--html-only --out`; it does not package unrelated
downloads or assets. HTML-only mode still preserves exports and validates FAQ inputs.
These modes are alternatives: do not combine `--html-only` and `--faq-only`.

Node 20+ and `docx` 9.6.1 are needed to rebuild. Viewing the checked-in/generated files needs neither Node nor a package installation. The first build used the Codex bundled Node package location returned by `load_workspace_dependencies`; it is machine-specific and should be rediscovered in a new environment.

For document verification on this Mac, the bundled `soffice` command rendered DOCX to PDF and `pdftoppm` produced page images for visual inspection. Check actual tool/module availability after discovering the runtime: PyMuPDF was not importable in the inspected Python environments, while these rendering commands worked. This is a tested rendering route, not proof of Microsoft Word or phone-side behavior.

For a standalone checkout, install only this folder’s declared dependency, then build:

```sh
npm --prefix demo/carnegie-hall install --ignore-scripts
npm --prefix demo/carnegie-hall run build
node --test tests/carnegie_demo.test.cjs
node --test tests/carnegie_review.test.cjs
```

The existing workbook is included when `build.cjs --out <new-directory>` packages a separate demo. To regenerate the workbook itself, use the installed spreadsheet skill and call `load_workspace_dependencies`. Create a scratch folder with a `node_modules` symlink to the returned bundled Node modules, then run the returned Node executable with `TROEN_WORKBOOK_RUNTIME=<scratch-folder>` and `demo/carnegie-hall/build-workbook.mjs`. The builder resolves `@oai/artifact-tool` through that scratch folder; it does not install it into the repository. The first tested runtime was `/tmp/troen-workbook-runtime` on this Mac. Rediscover the runtime on another host. Viewing/editing the XLSX needs no build runtime.

Build the workbook after changing reviewed research, then build the HTML/Word outputs. They are separate commands; a normal demo rebuild does not refresh workbook research automatically. Before handoff, check both artifacts against the input files. Workbook notes and dispositions are not imported back into JSON. Its existing hash is checked before replacement, so a manually edited workbook blocks regeneration. Preserve the edited original and use the workbook builder’s `--out <new-directory>` for a separate revision; reconcile decisions by opportunity ID. Never delete the manifest to force a refresh.

For a change limited to the research cards, run `node demo/carnegie-hall/build.cjs --html-only` after the workbook build. This refreshes only `index.html`, retaining the edited-HTML guard and leaving all workbook, Word and Markdown exports untouched. It does not reconcile altered director copy or create a standalone package. Use the full build for changes to those deliverables. The MTC connection used this narrower path, preserving all existing exports byte-for-byte.

`.generated-manifest.json` records generated-file hashes. Before writing anything, a rebuild refuses to replace an edited or unregistered output. Resolve the change deliberately, or build a separate revision using `node demo/carnegie-hall/build.cjs --out <new-directory>` from the repo root with `docx` available. Do not delete the manifest or discard a manual correction to bypass that protection. A new output directory receives HTML, styles, script, and exports; carry the source folder separately if the receiving environment must rebuild it.

## Verified and still open

The workbook covers two schools and one illustrative MTC candidate, with the original Wando-only director sheet clearly labeled. The MTC event relationship is unconfirmed. Provider comparison, fuller partner materials, a broader varied batch, and operating integrations remain unfinished. Published contact information is not permission to send. No capacity counter, price, booking likelihood, or employee-reported financial information is shown in the demo.

Current verification results and the running-server state are maintained in [PROGRESS.md](../../docs/carnegie-hall/PROGRESS.md). The source register distinguishes the Midwest Clinic’s actual December 2019 performance detail from its current 2026 site banner. The event brochure covers both March dates; its inclusions are qualified, and March 31 inventory or supplier terms were not transferred to March 3.

The user narrowed the tour-partner addition to a small research example; connecting the internal partner sheet is deferred. The March 3 FAQ is now connected through its inline Materials preview and protected downloads. It remains a discussion draft, with business unknowns internal. Salem began with an identity problem but yielded useful primary evidence; do not manufacture a weak classification to fit the sample design. Cloud work follows the [existing handoff procedure](../../docs/carnegie-hall/strategies/08-iteration-and-delivery.md#iphone-and-cloud-handoffs); this local demo does not establish cloud or phone access.


## Purpose-led navigation — September 11, 2026

The page introduces its purpose and authorship, then presents compact event context
with an expandable About the event. Opportunities separates Schools and Tour
operators; View all research shows a compact record overview and the workbook link.
Materials switches between the director sheet and a full FAQ preview, with downloads
below each. The FAQ preview is generated from the same hash-verified Markdown used
for its download. Example workflow retains its fictional-activity warning and reset.

One page H1 precedes panel headings. Route changes focus the panel heading; document
selection focuses its preview heading. Controls are native links/buttons/disclosures.
Without JavaScript, all evidence and previews remain readable. No dependencies,
research records, editable documents, or workbook contents changed in this increment.

## GitHub-connected Vercel hosting

Import `cmurphy1140/band-charter-outreach`, production branch `main`, root directory
`.` (repository root), framework **Other**. Root `vercel.json` skips installation,
runs `node scripts/package-demo.cjs`, and publishes only `dist/`.
The packaging command needs Node but no packages, credentials or API calls.
It copies 13 explicitly listed browser assets and downloads verbatim, preserving
reviewed/manual document edits. It does not run the legacy pipeline or regenerate
the demo. Add future downloadable files/assets deliberately to the packaging list.
The accepted proposal remains standalone, outside demo navigation and this web root.

Local edits must first be reviewed, committed and pushed to the configured branch;
then confirm the matching Vercel deployment is Ready before claiming the live site
updated. Vercel account linking and the public URL require separate verification.
See [Vercel configuration documentation](https://vercel.com/docs/project-configuration/vercel-json).
