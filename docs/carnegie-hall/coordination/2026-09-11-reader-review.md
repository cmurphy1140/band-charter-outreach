# Claude: independent unfamiliar-reader review

Prepared, not launched. Start from accepted commit
`0c0cbaf68f3e1092b3ffbcbe8c0a76222a5a5fd7` in:
`/Users/connormurphy/Desktop/Projects/band-charter-outreach-worktrees/claude-reader-review`
Branch: `codex/claude-reader-review`.

The older `claude-partner-research` checkout is not this task. It remains at
`0859701` with four uncommitted proposal originals and must not be edited or synced.
The new checkout contains the accepted corrected proposal. Verified clean; 13
required inputs match the main accepted snapshot and 10 generated hashes agree.

## Local changes excluded from this starting commit

The main checkout's unrelated chatbot note in TOOLS-AND-CONNECTORS.md, duplicate
Zoho working files and NotebookLM packs are excluded and unnecessary. This new
assignment record, the live progress update, and the presentation script are also
main-only uncommitted documents. The script is intentionally withheld. The prompt
supplies task-specific instructions; historical next-task language in committed
AGENTS/PROGRESS does not authorize work beyond this reader review. No required
accepted deliverable is missing. Do not fetch/copy excluded files or read the
presentation script from another checkout.

## Preflight and review

Confirm local execution host, absolute path, branch, exact HEAD, clean Git status,
no unexpected stash and no other active writer. Read AGENTS.md and the committed
PROGRESS.md for boundaries. If state differs, report it without reset or overwrite.
Do not read prior proposal acceptance notes or presentation guidance before the
first reader pass. Form observations from deliverables first; consult existing
local source/evidence records afterward only to substantiate an issue.

Inspect all of these read-only, in your own order:
- `demo/carnegie-hall/index.html` (Opportunities, Materials, Example workflow;
  selectors, evidence disclosures and downloads)
- `demo/carnegie-hall/exports/Troen - Wando Director Sheet.docx` and `.md`
- `docs/carnegie-hall/materials/Troen - Carnegie Hall Director FAQ.docx` and `.md`
- `docs/carnegie-hall/materials/Troen - Carnegie Hall Proposal Example.docx` and `.md`

The proposal is standalone, not yet connected to the demo. Assess actual reader
impact without assuming this requires a feature. Discover available rendering and
browser tools in your own environment. Do not assume tools available to either
prior session are available or missing here. Distinguish rendered visual inspection
from text extraction; record unavailable checks precisely. No installations.

If needed, first check port 8766 and run only:
`python3 -m http.server 8766 --bind 127.0.0.1 --directory demo/carnegie-hall`
Use `http://127.0.0.1:8766/`. If occupied, report it; do not stop another process.
Port 8765 and its existing server belong to the user's rehearsal: never use,
restart or stop that server. Keep temporary renders outside all repository checkouts.
Do not rebuild outputs. Stop only the preview process you start, and report its status.

## Exclusive output ownership

Create only `docs/carnegie-hall/coordination/claude-reader-review.md` in this new
worktree. You are not alone in the repository; do not change others' work. No other
tracked/untracked output, implementation edit, shared progress edit, research,
provider comparison, outreach, account access, scope expansion, audio or UI polish.

Report at most five issues that genuinely interrupt understanding or use. Zero
is acceptable. Each must include:
1. Exact document/page/heading or demo control and reproduction steps.
2. Reader impact: what cannot be understood or accomplished.
3. Evidence: observed behavior/text; tools, viewport or renderer where relevant.
4. Classification: verified behavior, inference/assumption, or preference. A
   preference without a demonstrated interruption is not an actionable finding.
5. Smallest suggested correction; do not implement it.

Include scope reviewed, base/path/branch, checks not performed, and status of any
preview process. Verify only this note was added and all inspected inputs remain
unchanged. Keep note uncommitted. No push, commit, merge, fetch, sync, worktree
removal or automatic follow-up. Finish, report its path, and remain idle. Findings
will later be reconciled with the user's independent rehearsal; do not wait for or
request the walkthrough script.
