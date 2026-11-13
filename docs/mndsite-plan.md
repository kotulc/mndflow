# mndsite plan

**The mndsite review: understand one real project part by part and agree, with the user, what each part should look like and which tool would draw it.** Proposed by the user 2026-11-08 to stop the build-look-revert loop. Since 2026-11-09 the translator is a set of plain CLI tools a person or an agent composes models with (model-plan.md *Decided*), so the review yields pictures **and the tools that build them**. **Parts 1–12 agreed 2026-11-12**; what remains is step 6, the diagram kinds pass. Delete when docs/diagrams/ is written and model-plan.md has taken up the build list.

Review page, a section per part with digests, mockups and what was agreed: https://claude.ai/artifact/UN5BuHw2XGH3T5bmcUMMHu. mndsite's bugs found on the way: mndsite's own `bugs.md` (11 rows).


## How the review ran

| Step | Produces | Status |
|---|---|---|
| 1 | per part: a digest read from source | done |
| 2 | per part: mockups on the review page | done |
| 3 | per part: agreed pictures, what is noise | done |
| 4 | per agreed diagram: the tool that draws it | done |
| 5 | one file per tool in docs/tools/ (18) | done; the build list goes to model-plan.md |
| 6 | **the diagram kinds pass**: every kind's purpose, utility and surface (files or otherwise), one file each in docs/diagrams/ | **next** |

**Rules that held**: no tool or face code until a picture is agreed; one part at a time; digests from source, never from the current translation; a part not worth a diagram is said so; every proposal tagged **general** or **mndsite**; fit each part to the agreed classes first and propose a new kind only when none fits.


## Outcome: mndsite's model

| Part | Files | Pictures |
|---|---|---|
| **overview** | — | context (actors above, inputs left, outputs right); presentations *Build a site*, *Release*, *Edit and preview*, *Browse by facet* |
| **build · configuration** | config.js, theme.js | dataflow *Config*; class *Config* (+7 sections) |
| **build · ingest** | ingest.js, fix-exif.js, git-history.js, AutoRedirect | flows *ingest content*, *translate page* (inside its frame); mapping *content → generated* |
| **build · metadata** | meta.js, text.js | mapping *fields*; class *PageMeta* (+3) |
| **site · runtime shell** | _app.jsx, theme.config.jsx, global.css (tokens, overrides), navbar icons, SiteFooter | chip only |
| **site · page chrome** | PageHeading, PageRail, Breadcrumbs, PageHeader, TagList, Chip | chip only |
| **site · browse by facet** | groups, filters, ViewScope, SidebarViews, IndexListing, MobileDrawer, mobileMenu | sequence *browse by facet* |
| **site · page contents** | SectionContext, PageContents, ContentsMenu | mapping *right sidebar* |
| **shared** | semver.js | — |
| **entries** (About) | cli.js, setup.js, watch.js, npm scripts, two workflows | sequence *edit and preview*; flow *release* |
| **left out** | Since (example content), DirFeed (unused), tests | — |

**Settled in general along the way** (model-plan.md *Decided* 1–22): a model is one overview by containment; a part's diagrams are its frame, its flows, its data and a mapping; data is never a block in a model, only a port's schema; the mapping is a grid of reads, writes and rule; presentations replace walks (presentations.md); tools are plain CLI, one question each (docs/tools/).


## Open

| Question | Notes |
|---|---|
| when a flow is worth drawing | answered by practice: a flow is drawn when its steps make a logical path (ingest, translate page); a projection gets a mapping instead (metadata) |
| what a chip shows per kind | waits on the diagram kinds pass (model-plan.md *Questions* 1) |
| the review page's own fate | it is the record of the review; this plan holds its outcome |
