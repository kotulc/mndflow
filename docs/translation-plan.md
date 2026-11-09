# Translation plan

**Translate code into concepts that answer questions, not clusters that list files.** Proposed 2026-11-08 after mndsite read as one sparse model; the user took every recommendation the same day (*Decided*), and *Build* ran once to see how it lands (*Landed*). It feeds model-plan.md's acceptance (the shop, this repo and mndsite read as models).

**On hold (2026-11-08) behind mndsite-plan.md**: no translator rule changes until the mndsite review has agreed, part by part, what mndsite should read as. Its outcome replaces *Target* below where they differ.


## What is wrong today

| Symptom (mndsite, this repo) | Cause |
|---|---|
| **units have no meaning**: `meta` is the whole build pipeline; `page`, `link`, `contents` are tf-idf guesses | names come from module names, not from what the code says about itself |
| **a part says only `lines` and `reads`** | the reader keeps size, not purpose. File headers are read but given to the first function (`normalize_semver` carries semver.js's header; ingest.js's *Content ingestion pipeline* is lost). README, docs, tests and manifests are never read |
| **the wrong entries**: theme.config.jsx and six MDX pages; the real one, `scripts/cli.js` (Dockerfile `ENTRYPOINT`, package `scripts`), is missed | entries are inferred from *imports most of a package*; declared entries are ignored |
| **build and runtime in one model**: theme.config's model mixes Node scripts with React components | no notion of where code runs |
| **every model is the same shape**: a list of modules in first-call order, `dependency` lines named by imported symbols | one question answered (*who imports whom*) with one diagram kind; the other seven kinds are never produced from code |
| **steps have no words**: *What theme-config calls, in the order it first calls it* | a step's text is not taken from what it reaches |


## Principles

| # | Principle | Means |
|---|---|---|
| 1 | **a primary block is what a person names when explaining the system** | a process, a pipeline, a UI area, a data store, a helper library; found from the graph, named from the code's own words |
| 2 | **a block answers fixed questions, each a diagram kind** | the table below; a question with no answer is left out, never filled with a list |
| 3 | **declared beats inferred** | entries, purposes and boundaries the project states (manifests, headers, README, docs) win over graph guesses; the graph fills in what is not stated |
| 4 | **where code runs is the first split** | a CLI process, a build step, a browser runtime and configuration are different containers; components are found inside one, never across |
| 5 | **the outside is drawn** | the file system, git, a framework, the network, the user are actors at the system's edge; a block touching one has a line to it |
| 6 | **still deterministic** | every rule reads code or files; agents narrate on top (design.md *Translation*) |


## The questions a primary block answers

| Question | Answered by | Read from |
|---|---|---|
| **what is it for** | its `description`, first on its card and chip | the file's or folder's header doc, else the README section or docs page naming it |
| **what does it offer** | its API: a class card of the exports used outside it, each by signature | exports read by other blocks (today every export is listed) |
| **what does it take and give** | inputs and outputs on its API rows; config keys it reads | parameters and returns; property paths read off a config object (`config.display.crumbs`) |
| **what does it read and write** | files and folders as attributes; lines to the *File system* actor | string paths passed to `fs` calls (`public/site-meta.json`, `pages/`) |
| **what does it touch outside** | lines to actors | imports of `node:fs`, `child_process`, `fetch`, `process.env`, framework packages |
| **what is it made of** | its layer (`internal`); a UI block's composition (which component renders which) | its modules; JSX elements rendered |
| **what moves through it** | a `flow` behaviour: one function calling its steps in order | calls within one function, in source order (ingest: rename → copy assets → write meta → redirects) |
| **who calls whom, in what order** | a `sequence` behaviour or a model | calls walked from a declared entry, participants the primary blocks |
| **what its data looks like** | `class` / `entity` definitions in the vocabulary | types read across blocks; for untyped JS, see *Questions* 3 |
| **is it tested, documented** | `tests`, `docs` attributes | tests importing it; docs pages naming it |


## Layers of a translated system

| Layer | Is | Found from |
|---|---|---|
| **system** | the project and its actors | package manifest, framework dependencies, Node built-ins used |
| **containers** | where code runs: process (CLI, server), build, browser, configuration | declared entries (`bin`, `scripts`, Dockerfile, framework conventions like `pages/`, `_app`, `app/`), and environment signals (Node built-ins vs JSX and DOM) |
| **components** | today's Louvain stages, run inside one container | imports (stages 1–4 of apps/ts's README, unchanged) |
| **modules, functions, types** | as today, with the questions above as attributes | — |

**Models are use cases from declared entries**: one per entry a user or CI runs, each step worded from what it reaches (its callee's purpose). A pipeline function's own steps are a sub model (decision 12 of the model plan).


## Target: mndsite as it should read

A hand-written outline, the acceptance check for the translator (*Build* 8).

| Layer | Expected |
|---|---|
| **actors** | author (content folder, `mndsite.yaml`), CI / Docker, Next.js + Nextra, file system, git |
| **containers** | **build pipeline** (`scripts/`), **site runtime** (`theme.config.jsx`, `_app.jsx`, `components/`), **configuration** (`mndsite.yaml`, `site.config.js`, `next.config.js`) |
| **pipeline components** | cli, config (load and check the YAML), setup, ingest, metadata helpers (git-history, semver, text, fix-exif), theme, watch |
| **runtime components** | page chrome (PageChrome, PageHeader, PageRail, Breadcrumbs), navigation (SidebarViews, ViewScope, filters, groups, ContentsMenu, PageContents, SectionContext, mobile), listings (IndexListing, DirFeed, TagList, Chip), links (FeedLink, GitHubLink, ThemeToggle, SiteFooter, AutoRedirect) |
| **models** | 1 *Build a site* (Docker → cli build → config → setup → ingest → next build → dist); 2 *Ingest content* (ingest's flow, a sub model of 1); 3 *Render a page* (_app → theme.config → page chrome → rail, header, contents); 4 *Browse by facet* (SidebarViews → filters → groups → IndexListing) |
| **data** | site config (from the YAML), page meta (`site-meta.json`), frontmatter fields, facets |
| **ingest's card** | *Mirrors a Markdown/MDX tree into pages/ and writes site-meta.json* · runs in build · reads content dir, writes `pages/`, `public/` · touches file system · tested by `ingest.test.js` |


## Build

**Built 2026-11-08, uncommitted.** Status per step; *Landed* says how each read on mndsite and this repo.

| # | Step | Where | Status |
|---|---|---|---|
| 1 | **purpose read right**: a file header is its module's `description`, never its first function's (a blank line, an import or a `require` after it marks it a header) | apps/ts `read.ts` `module_doc` | built; a folder's README not read yet |
| 2 | **declared entries**: package `bin` and `scripts`, Dockerfile `ENTRYPOINT`/`CMD`, an HTML page's module script, a framework's files (`_app`, `app/layout`, `theme.config`); MDX pages and other configs stop being read | `read.ts` `declared_entries`, `wiring` | built |
| 3 | **containers**: a package's modules by where they run (JSX or React → browser, a Node built-in → node, the rest by their imports' lean), components found inside each; units filed in a folder per container | `structure.ts` `containers_of`; `write.ts` | built |
| 4 | **names from the code's words** | `structure.ts` `worded` | tried and backed out (*Landed*) |
| 5 | **the questions as attributes**: `runs`, `entered`, `types` (was `reads`), `reads`/`writes` (files), `config`, `touches`, `tests`; a module's parts are its API, the exports another unit reads | `read.ts`; `write.ts` `answers`, `api_of`; ts `module.json`, `component.json` | built |
| 6 | **actors**: the file system, processes, network, terminal, environment, each command run (`npm run build` read through to `next`), each framework hosting an entry; `outside/`, a ts kind `actor`; a model draws the actors its units touch, a line from each | `read.ts` `touches_of`; `write.ts`; ts `actor.json` | built |
| 7 | **behaviours**: an API function (any function of an entry) calling 3+ project functions is a `flow` under its module, Begin → steps → Done; a model's description says how it is entered and what its entry is for | `read.ts` `flows_of`; `write.ts` `flow_of` | built |
| 8 | **acceptance by target**: `<folder>.target.yaml` beside a translation, checked when it is written | apps/ts `report.ts` `against`; `samples/mndsite.target.yaml` | built for mndsite; this repo's waits in backlog.md |
| — | **a face shows answered attributes**: a usage, or a definition answering any, lists only its answers; a kind's own schema lists its types | views `face.ts` `answered` | built |


## Landed

| Seen | Notes |
|---|---|
| **containers exact on mndsite** | build pipeline = `scripts` 11/11, site runtime = `components` 26/26 (the translator's report) |
| **three models from declared entries** | *cli* (Dockerfile), *ingest* (`npm run ingest`), *theme-config* (Nextra); *_app* is one step, so folds (model plan decision 19) |
| **purposes** | 14 of 18 mndsite units carry their header; ingest reads *Content ingestion pipeline*, semver *Semver helpers…* |
| **cards say what a unit touches** | ingest: runs node · entered script ingest · writes `index.mdx`, `_app.jsx` · config `frontmatter`, `versioning`… · touches file system, environment · 4 tests |
| **names from headers mislabel groups** | a component's anchor's header is not the group's purpose: *client-side redirect* named the five link/footer components, *facet indexes* the page chrome. tf-idf (`link`, `page`) read better, so step 4 was backed out. Since 2026-11-08 a group is described by its members' headers, its name still tf-idf |
| **too many flows here** | 15 on mndsite, **173 on this repo**: most API functions call three of the project's. Options: only functions calling across modules, only entries' functions, or a higher floor |
| **actors leak through a unit** | the theme-config model reaches *git* through *semver*, since the unit holding semver also holds git-history; a model should count only the modules its path calls |
| **purposes and names** (2026-11-08, the user's look: mndsite's chips bland) | models named by entry (`Docker → cli`, `npm run ingest`, `nextra → theme-config`); a component's description its members' headers; the package its README's lead; `lines` last in a unit's answers. **A purpose line on chips was tried and reverted**: a cut-short description says less than the counts it replaced. Then a chip of parts shows its answers in place of counts, and parts too small to name are listed (design.md). Its small leftovers moved to backlog.md *After the mndsite review* |
| **this repo is one container per package** | its packages each run in one place, so containers change nothing here |


## Decided

The user took every recommendation (2026-11-08), to see how it lands.

| # | Decision |
|---|---|
| 1 | **containers are the top layer**: a package's first split is where its code runs |
| 2 | **headers and READMEs only** give purposes; docs pages later |
| 3 | **untyped JS data**: config keys and file paths only, no inferred shapes |
| 4 | **actors are a ts kind `actor`**, at the system's edge |
| 5 | **a unit's API is the exports used outside it**; the rest drop |
| 6 | **a flow is a function calling 3+ project functions in order** |
| 7 | **hand-written targets** beside each sample are the acceptance check |
