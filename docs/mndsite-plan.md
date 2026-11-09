# mndsite plan

**The mndsite review: before changing the translator or the faces again, understand one real project part by part and agree, with the user, what each part should look like as a model.** Proposed by the user 2026-11-08 to stop the build-look-revert loop: translated models show flow diagrams of one block, messy or trivial diagrams, and chips whose diagram kinds say nothing about the code they stand for. **The most important next step.** Delete when every part of mndsite has an agreed picture and a translator rule (or an explicit *not translated*), and model-plan.md takes them up.


## Why

| Seen (2026-11-08) | Means |
|---|---|
| flows with a single block; flows from any function calling 3+ others (173 on this repo) | the translator emits a diagram kind because a rule fired, not because the code has that shape |
| messy or trivial diagrams | nothing checks a diagram is worth drawing |
| chips that do not read as the right kind | the map shows what was emitted, so it inherits the problem |
| rounds of build → user's look → revert this session | the target was never agreed per part before building |


## How the review runs

| Step | Who | Produces |
|---|---|---|
| 1 | **Claude walks the user through mndsite's code**, personally reading it (no subagents), part by part in the order below | per part: a digest — what it is, what it does, its inputs and outputs, what it touches, how it is entered, how it relates to the other parts |
| 2 | Claude draws the visuals it thinks would help, per part, freely (not bound to today's diagram kinds or faces) | mockups in one artifact, a section per part: the diagram(s) that would explain it, and how its chip would read on the map |
| 3 | the user and Claude discuss each part | agreed: which diagram kind(s) communicate it, what its chip shows, what is left out as noise |
| 4 | only then: how the translator could capture it, deterministically | a rule per agreed picture, or *not translated* where code cannot tell |
| 5 | collect the rules | a build list handed to model-plan.md (and translation-plan.md's open items) |

**Rules for the review**

- no translator or face code changes until a part's picture is agreed
- one part at a time; the user may stop, merge or skip parts
- the digest describes the code as it is, read from source, never from the current translation
- a part that is not worth a diagram is said so, plainly


## Parts of mndsite, in review order

From its sources (110 tracked files; content, assets and tests aside).

| # | Part | Files |
|---|---|---|
| 1 | **the system**: what mndsite is, who runs it, its outside (author, CI, Docker, Next.js + Nextra, file system, git) | README.md, package.json, Dockerfile, .github/workflows |
| 2 | **configuration** | mndsite.yaml, site.config.js, next.config.js, scripts/config.js, site/assets/starter.yaml |
| 3 | **CLI and setup** | scripts/cli.js, scripts/setup.js, scripts/watch.js |
| 4 | **ingest pipeline** | scripts/ingest.js, scripts/fix-exif.js |
| 5 | **metadata** | scripts/meta.js, scripts/text.js, scripts/semver.js, scripts/git-history.js |
| 6 | **theme presets** | scripts/theme.js, styles/global.css |
| 7 | **site runtime shell** | _app.jsx, theme.config.jsx |
| 8 | **page chrome** | components/PageChrome, PageHeader, PageRail, Breadcrumbs |
| 9 | **navigation and facets** | components/SidebarViews, ViewScope, filters.js, groups.js, IndexListing, SectionContext, ContentsMenu, PageContents |
| 10 | **mobile** | components/MobileDrawer, mobileMenu.js |
| 11 | **listings and links** | components/DirFeed, TagList, Chip, FeedLink, GitHubLink, ThemeToggle, SiteFooter, AutoRedirect, site/components/Since |
| 12 | **the whole again**: the models a reader needs (build a site, ingest content, render a page, browse by facet) and the map that holds them | — |

translation-plan.md's *Target* is an earlier outline of the same; the review replaces it where they differ.


## Open questions to settle on the way

| Question | Notes |
|---|---|
| when is a flow worth drawing | a single block never; maybe only a pipeline function with named stages (ingest) |
| what a chip on the map should show per kind | answers and listed parts landed 2026-11-08; the per-kind stamp (model-plan.md *Questions* 1) waits on this review |
| what a model holds | one path per model (model-plan.md decision 6) — check against what mndsite needs |
| what is noise | size counts, helper modules, one-line wrappers |
