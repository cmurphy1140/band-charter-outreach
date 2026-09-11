# Useful tools, plugins, and connectors for the Carnegie POC

[Start here](README.md) · [Workstream strategies](strategies/README.md) · [Iteration strategy](strategies/08-iteration-and-delivery.md)

Availability snapshot: **September 10, 2026**, based on this task's exposed tools and available local skills. “Available” means the capability is exposed here; it does **not** prove access to a Troen account or confirm that a service has been configured. This document recommends usage and records limits. No plugin installation, account connection, permission change, or scheduled job was performed.

## Recommendation: a small working set

Use the existing local repository, public web research, product-management/operations guidance, document and spreadsheet tools, and browser verification to build the POC. Add design skills for the presentation and selected Superpowers practices for implementation. This set can create a substantial demonstration without any new Troen account connection.

Think of a **skill** as a working method, a **connector** as access to an external application, and a **plugin** as a package that may provide either or both. Having a sales skill does not mean an Apollo account is connected. Having Gmail tools does not mean Troen uses Gmail or that this task may inspect a business inbox.

## Superpowers: useful discipline, not automatic enforcement

“Superpack” is interpreted here as **Superpowers**, whose 6.3.0 skills are available locally. No separate product called Superpack was established by the available catalog. Superpowers describes a development method covering design, plans, tests, review, and iteration. Its role is procedural guidance, not proof that the output is correct. [Superpowers project documentation](https://github.com/obra/superpowers).

Use it to keep a meaningful software increment small and verifiable. For this documentation revision, the relevant standard is fresh verification of links, wording, scope, and preserved files. For later software work, the useful practices are:

| Practice | Concrete use here | Boundary |
|---|---|---|
| Brainstorming/design | Sketch the connected example, expose meaningful choices, separate real from illustrative behavior | Existing approved scope does not need repeated approval; business interviews are not a kickoff dependency |
| Writing plans | Turn a selected strategy into a bounded implementation task with files and expected behavior | These business strategies are not eight instructions to build entire subsystems at once |
| Systematic debugging | Reproduce a wrong contact, lost identity, failed export, or stale refresh before fixing it | Avoid unrelated cleanup when a reviewed manual path meets the current demo need |
| Test-driven development | Protect real parsing, state, export, and preservation behavior with meaningful regression cases | Do not invent tests for a reversible copy edit or tests that only repeat the implementation |
| Verification before completion | Run the relevant check and inspect the result before claiming something works | Old test counts and a plan are not fresh evidence |
| Code review | Inspect substantive changes for correctness and maintainability | A second model's agreement does not verify the underlying business source |
| Worktrees/delegation | One branch per coherent change; separate checkouts for other authorized concurrent work or needed isolation | Codex and Claude Code are always sequential. Follow the [project Git workflow](../../AGENTS.md#git-workflow), assign ownership, and preserve uncommitted inputs; a skill alone is not a reason to create parallel tasks |

The installed [brainstorming instructions](/Users/connormurphy/.codex/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/brainstorming/SKILL.md) include approval and commit steps. The user's current standing authorization permits routine work and carefully scoped, verified local commits; use the shared project instructions for its limits rather than the earlier per-commit request rule. The [verification instructions](/Users/connormurphy/.codex/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/verification-before-completion/SKILL.md) are useful for evidence-backed completion. No repository hook, CI gate, or cross-application enforcement was configured. A workflow available in Codex should not be assumed installed or active in a separate Claude Code session.

## Available working methods and where to use them

These entries are available skills or tool families in this task. They do not require installing every named package or reading every skill for every change.

| Capability | Specific use | Workstream | Use level |
|---|---|---|---|
| Product management: user-research synthesis | Separate source observations, employee reports, interpretations, and unknowns | 01 | Core now |
| Product management: competitive analysis | Compare like-for-like provider offers and evidence-backed differences | 02 | Core when research executes |
| Product management: feature spec and roadmap | Define the smallest demonstration behavior; keep future integrations separate | 04, 08 | Selective |
| Product management: metrics tracking | Define useful quality/use measures without invented conversion forecasts | 06, 08 | Selective |
| Operations: process optimization | Map proposal, approval, payment, supplier, and coordination dependencies | 06 | Core |
| Operations: vendor management and risk assessment | Structure supplier fit and exceptions when a live workflow is considered | 06, 07 | Targeted later |
| Deep Research | Produce a bounded, cited provider or software assessment; the Zoho report is already received | 02, 07 | Use for requested deep research, not every lookup |
| Built-in web search/browsing | Verify current public program, provider, policy, and capability claims | 01–03, 07 | Core |
| Sales: account research, draft outreach, create an asset | Turn a reviewed profile into a useful conversation brief and audience-specific example | 03, 05 | Drafting only until sending is explicitly requested |
| Marketing: competitive analysis, content creation, campaign planning | Clear benefits and consistent materials; later structure a measured pilot | 02, 05 | Selective; no campaign launch now |
| Documents / DOCX | Editable event sheets, FAQ, proposal example, and report reading | 01, 05, 06 | Core |
| PDF | Extract source text and inspect rendered pages; verify final delivery copies | 01, 05 | Core |
| Spreadsheets / local Python libraries | Opportunity workbook, source register, example states, useful exports | 03, 06, 07 | Core |
| Presentations / PPTX | An optional compact meeting deck derived from the same facts | 04, 05 | Only if it improves the actual meeting; not an extra mandatory deliverable |
| Frontend design | A distinctive, readable local presentation of the connected example | 04 | Core when interface work starts |
| Design: UX writing, critique, accessibility review | Useful labels, clear actions, keyboard/mobile legibility, targeted visual review | 04, 05 | Core for presentation checks |
| Design: system management and handoff | A small shared set of type, spacing, and component rules | 04 | Keep lightweight for the POC |
| Visualization | An inspectable workflow or interactive concept where it aids understanding | 04, 06 | Selective; label simulated behavior |
| Image generation | Optional illustration or needed image editing using approved context | 04, 05 | Only when a visual serves the material; no fabricated documentary photos |
| Image validator / anti-slop audit | Verify real asset paths and detect generic or inconsistent visual choices | 04 | Apply to actual visual work |
| Engineering: documentation, testing strategy, code review, tech debt | Maintain clear handoffs and repair defects in paths used by the increment | 03, 07, 08 | Core as relevant |
| OpenAI docs | Verify actual model/tool behavior before committing to an implementation | 07 | Selective, current primary sources |
| Plugin Management | Distinguish methods, exposed connectors, and optional integrations | 07, 08 | Used for this capability map |
| Ouroboros | Potential structured exploration/implementation loops for a later complex system | 08 | Defer; avoid layering another full process on this POC |

Ouroboros tools and skills are exposed, but no loop is running. The current work does not need a second orchestration framework. Security/legal/finance specialist skills can help with a concrete later dependency; they are not blanket prerequisites for a local research demonstration.

## Exposed tools and connectors

The following was verified against the current tool inventory, not by opening private accounts.

| Tool or connector | Exposed capability | Good use here | Status and limit |
|---|---|---|---|
| Local shell, Python, Git, file tools | Read/write local files, inspect code, execute checks | Preserve the repo; build local outputs; verify data and rendering | Available; local commits may use the project’s standing authorization after scope review and verification |
| Computer use / native browser control | Inspect and interact with available apps and browser surfaces | Visual inspection and workflows without a suitable direct tool | Available; prefer files/APIs when simpler; no Troen account session verified |
| Playwright | Browser navigation, interaction, snapshots, screenshots | Exercise the actual local demo and inspect errors | Available; no browser-based bypass of access restrictions |
| Google Drive / Docs / Sheets / Slides | Search/read and document/spreadsheet/presentation operations | Optional collaborative copies after local artifacts are ready | Tools exposed; Troen folder/account access not verified; no upload requested |
| Gmail | Mail search/read, draft, and mail operations | Possible later approved correspondence context or draft workflow | Tools exposed; no Troen Gmail use established; source logistics show Outlook correspondence |
| GitHub | Repository, issue, pull-request, and related operations | Future review/version collaboration when requested | Tools exposed; local work is sufficient now; no push/PR requested |
| Document control / spreadsheet tools | Structured document sessions and spreadsheet actions | Read or edit artifacts when the relevant session is available | Tools exposed; runtime/session must match the operation |
| Sites | Site creation, versioning, deployment, and access controls | Optional later sharing of a cleaned demonstration | Tools exposed; no site created or deployed |
| Socket | Dependency/package security tools | Check a concrete dependency concern during later implementation | Tools exposed; not a reason to add dependencies or run a broad audit now |
| Codex scheduled tasks | Recurring local/task work with explicit scheduling instructions | Later repeatable brief generation or source checks | Available; no schedule created and no always-on reliability implied |

Native local document work remains an alternative to cloud connectors. Shared tools in this task do not establish the permissions of a future Claude Code environment. Check the actual environment before relying on a connector.

## iPhone and cloud availability

The logistics and software developer will sometimes direct work from an iPhone. A cloud task uses its own repository checkout; mobile Remote uses a connected host's environment. The local tool inventory above does not prove cloud tool availability. Verify the current host, inputs, installed skills, dependencies, and account access before using them. [OpenAI cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment), [Remote connections](https://learn.chatgpt.com/docs/remote-connections).

Use the [handoff procedure](strategies/08-iteration-and-delivery.md#iphone-and-cloud-handoffs) for transfer and return. Public research, repository edits, and document preparation can proceed when their tools and inputs are available. Mac-native Word or computer-use steps require the appropriate host; record unavailable checks for the return session. No cloud environment, phone pairing, repository transfer, or automatic sync was established by this update.

## Optional integrations to evaluate later

These are potential directions, **not verified connected capabilities for this project**. The recommended-plugin list supplied with this task marks the named marketplace options below as not installed. Their specific tool scope, plans, and fit must be checked if selected; no purchasing recommendation is being made.

| Option | Why it might become useful | Trigger for evaluating it | Current disposition |
|---|---|---|---|
| Figma or Canva | A shared design source or business-editable layout workflow | A collaborator actually needs those editing environments | Listed as not installed; local design/document tools suffice now |
| Airtable | A shared structured opportunity view | Workbook collaboration proves inadequate for the real pilot | Listed as not installed; avoid another database during the POC |
| One of Trello, Asana, or ClickUp | Shared task ownership and handoff visibility | An actual team prefers one existing task system | Listed as not installed; do not adopt multiple trackers |
| Apollo | Possible organization research/enrichment assistance | A specific B2B research gap remains after public-source work | Connector not exposed; listed as not installed; available Apollo skills do not establish account/data access |
| Codex Security | Possible dedicated review for substantive operating software | A real deployed/integrated system warrants it | Listed as not installed; not needed to save strategies |
| Cloudflare | Possible hosting/infrastructure route | A later deployment has requirements not met by the chosen environment | Listed as not installed; no infrastructure work now |
| Zoho | A permitted handoff into the business's actual relationship workflow | A narrow operating use is selected and the product/policy are understood | No Zoho tool exposed in the current inventory; subscription and connector route unresolved |
| Outlook/Microsoft 365, Synology, DocuSign, GroupCollect | Possible access to existing documents, communications, agreements, or registration context | The specific live workflow needs it and use is authorized | Source evidence varies; no purpose-built connector for these systems was exposed here, and current accounts are unverified |
| Calendar | Possible deadline visibility | A real schedule and responsible roles exist | No calendar tool exposed here; a local example deadline list is enough for the demo |

The callable Plugin Management tools in this task cover permissions/dependencies, not marketplace search or installation. The tool inventory was searched; dedicated plugin search/suggestion tools were not exposed. Therefore absence here means **not available in this task**, not “no integration exists anywhere.” Recheck available discovery tools when a specific connection is requested.

## Model and workflow fit

Use Codex for work with this repository and its artifacts; periodically hand off to Claude Code for bounded implementation or review. They never work on this project concurrently, including in separate worktrees. Record the current state in PROGRESS.md and follow the [sequential handoff instructions](../../AGENTS.md#working-authority-and-sequential-handoffs) before switching tools. Official Claude Code documentation describes repository work and tool use. OpenAI documents GPT-6 Astra for complex reasoning, coding, computer use, research, and document creation. These capabilities support the proposed work but do not establish Troen-specific results. [Claude Code overview](https://code.claude.com/docs/en/overview), [GPT-6 Astra documentation](https://developers.openai.com/api/docs/models/gpt-6-astra).

For a later scheduled process, verify the chosen environment's availability requirements and failure reporting. Local work depends on the relevant machine/session/files; cloud work needs its own accessible inputs. [OpenAI scheduled tasks](https://learn.chatgpt.com/docs/automations?surface=app), [Claude Code scheduling](https://code.claude.com/docs/en/scheduled-tasks).

Choose a tool for a concrete output, inspect the result, and keep the useful parts. Neither more plugins nor more model calls automatically improves the demonstration. The value comes from the developer's judgment, the source evidence, and the quality of the connected deliverables.
