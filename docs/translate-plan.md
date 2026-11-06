# Code translation plan

**Translate a TypeScript codebase into a mndflow workspace a person can be led through: this repo first.** The primary use case in design.md's vision: models are translated, then shown, and the end product is a walkthrough. Taken up 2026-11-01; a first, mechanical translator built that day; its shape revised 2026-11-02. Delete this plan when the second translator ships.


## Next session

**Handoff 2026-11-04.** This session's work is committed as `93442f7` and `76fa450`, but the last fixes (letting go of a pick, box titles, the tray's first row, the hops memo) are uncommitted. Regenerate both samples before looking (`npm run code`; mndsite by hand, below); both `check` clean. Take *Remaining* row 1 first: the user's refinements to *walk its path*.

**2026-11-04: telling the story from the entry points.** One tree, one order: the explorer, the map and an entered diagram read the same children in the same order (*Decided* rows 16–18); a system path from each package nothing uses (row 19); every block lights one hop each way, and a path is walked a hop at a time from a block marked ▶ (*Directions* rows 13–14).

| # | Remaining | Notes |
|---|---|---|
| 1 | **walk its path: refinements** | next session (the user, 2026-11-04): the user likes *walk its path* on sequence diagrams and has refinements in mind; take them first |
| 2 | **views over budget** | with types out of the edges views comes to 10 components, one over `most` |
| 3 | **a component face listing its modules as rows** | *Decided* row 13 |
| 4 | **vocabulary gaps** | enums and aliases as library types; a name said in two packages linked; methods |
| 5 | **open directions** | rows 1–3, 5, 6, 8: edge weights, clustering package, component kinds, vocabulary ranking by *used by*, writing the workspace, what the agent layer needs |
| 6 | **acceptance** | every diagram readable at fit, judged by the user and `mnd measure` |
| 7 | **a pick's fit in an entered view** | on the map a pick fits the block and its hops; in an entered view the camera stays fitted whole (*Directions* row 13) |
| 8 | **the explorer after letting go** | letting go on the canvas leaves the explorer's row lit (mndsite: `link`); whether the explorer lets go too |
| 9 | **a CSS warning** | `npm` `lint-css`: an undefined `--n` in theme `face.css`, not this plan's code |

| # | Step | State |
|---|---|---|
| a | **salience** (stage 6) | built: PageRank over imports by symbols, scaled by length; a component's diagram draws its most salient half (`shown` 0.5, at least 1, at most the budget, never folding one alone), the rest one `other` block saying which. Left: unjoined modules folded per band (*Directions* row 4); a component face listing modules as rows |
| b | **names** (stage 8) | built: tf-idf over the module names of a component against its siblings', a word recurring at least twice; first doc lines too only where the anchor is a stop word (`helpers`, `index`, `utils`). Tried with doc words for all: worse (`session` became `log`, `nodes` `level`), so anchors that name something stay |
| c | **vocabulary** (stage 7) | built: interfaces, classes and object types another module reads, owned by the block holding their module, at most `most` (9) an owner by fan-in; a definition each in `types/<group>/<pkg>/<owner>/`, fields as attributes, a field typed by a written type an `association`, `extends` the `type`; a `class` diagram per component owning types, and one for the package's own. Left: enums and aliases as library types (they read as `text` with a note); a name said in two packages is never linked bare (text with a note); methods |
| d | **ports** (stage 5) | **decided 2026-11-02: no ports from imports or exports.** A port describes an interface, a data contract; an import is a usage, not a contract. At most one port per interface a component offers, and only once there is a contract to name; none generated until then |
| e | **writing directly** (*Decided* row 3) | **decided 2026-11-02**: keep the source folder then `collect` for now (row 3 changed); it caught three real faults this pass |
| f | **a reference breakdown** (*Directions* row 7) | **set aside 2026-11-02**: the user's reading of the models leads instead |

- **the user's direction** (2026-11-02): a deterministic structure found from the graph (imports, interfaces, cycles, centrality), not agentic band-aids; **no hard rules** about what a block is; **thresholds are defaults with floors**; **balance depth against the big picture**; diagrams are visual information, never lists of parts; agents refine and narrate on top
- **committed** through `76fa450`: everything in *Built* but the fixes the handoff above names. `samples/code*` and `samples/mndsite*` are generated and gitignored
- **regenerate**: `npm run code` (this repo → `samples/code.json`); mndsite by hand: `cd apps/ts && npx vite-node src/main.ts ../../../mndsite ../../samples/mndsite`, then `npm run start -s -w @mnd/cli -- collect ../../samples/mndsite ../../samples/mndsite.json --workspace`; `check` each. `npm run packages` after any `ts` kind change
- **measure**: `npm run start -s -w @mnd/cli -- measure ../../samples/<name>.json [layer]`; entered diagrams only, not the map
- **see it**: a Playwright script (Edge, `channel: "msedge"`) starting Vite from `apps/web/vite.config.ts`, routing `**/mndflow.yaml` to `workspace: /samples/<name>.json` (`tray: open`); enter, hover or pick a node by id (`.react-flow__node[data-id="…"]`), never by text, which matches chips inside. Run from the repo root; in Git Bash set `MSYS_NO_PATHCONV=1`
- **found in review, not this plan's code** (2026-11-01 reference work, uncommitted): an ambiguous bare attribute type is made as text with no note (core `sources.ts` `type_of`); a folder path inside the reader's own package (`Records.Order`) is not found by `def_hits` for `type:` though it is for `of:` (core `refs.ts`); the door allows one name in two folders (`door.ts` `named_defs`) while rename and create refuse it (`name_taken`), pending the user's word; `wanted` loads a catalogue package for any dotted word whose first step names one, ports and relation ends included (core `sources.ts`); the CLI re-reads the catalogue index once a head (cli `main.ts` `listed_names`)
- **packages**: graphology, `graphology-communities-louvain`, `-components`, `-dag`, `-metrics` (modularity, PageRank) in apps/ts

## Goal

| | |
|---|---|
| **in** | a TypeScript project folder, and an abstraction setting (how many components a layer may show), with a default |
| **out** | a workspace: layers of components down from the system, a standard set of diagrams at each layer, the project's shared vocabulary as definitions, each block keeping `source` |
| **acceptance** | this repo translated with no hand edits, `check` clean; every diagram readable at fit (names visible, no tangle); the vocabulary is the types a reader of the code would name; an agent can add a walkthrough on top by naming what was translated |
| **later** | writing back out; other languages; a call graph for flows |


## Decided

| # | Question | Decision |
|---|---|---|
| 1 | **where the translator lives** | an app in this repo (`apps/ts`), moved out once the schema settles |
| 2 | **the parser** | ts-morph |
| 3 | **how it writes** | **a source folder, then `collect`** (2026-11-02, for now), so the door's check runs on what is written; ids minted from source paths and names, so translating again keeps them. Superseded: the workspace JSON directly |
| 4 | **scope** | revised 2026-11-02: each package's `src` where it has one, else its whole folder; TypeScript by its tsconfig, else JavaScript (`allowJs`); `require` counts as an import. Tests, configs, setup files, `.d.ts` and installed, built or test folders left out. **Wiring**, configs and MDX pages (by their import lines), is read only where it imports the project's code, as an entry |
| 5 | **the `ts` package** | kinds only (package, module, function, value, interface, class, type alias); to revisit with the component kinds (*Directions* row 3) |
| 6 | **vocabulary** | **definitions only for types shared across modules** (2026-11-02); module-local types stay out of the library. Fields are attributes, a field typed by another definition an `association`, `extends` the `type` chain, enums and aliases library types |
| 7 | **no file, and no diagram, per module** | 2026-11-02: a module is never a diagram that only enumerates what it declares; where it shows is row 13 |
| 8 | **imports** | dependency lines, at the level the diagrams draw (between components, between packages), never every module pair on one layer |
| 9 | **heuristics, then agents** | the translator finds what it can by general heuristics; an agent refines and adds an abstraction and narrative layer (walkthroughs) on top, naming the translated elements by the reference rules (design.md *Diagram files*) |
| 10 | **a structure found from the graph** | 2026-11-02: deterministic stages over the dependency graph (*Strategy*): what crosses between parts, cycles, centrality, coupling. **No fixed grain**: a block is whatever unit the graph says matters, a group of modules, one module, or later a function; no rule says a block is never a file |
| 11 | **thresholds are defaults with floors** | 2026-11-02: every cutoff is a relative default (a share, a budget) bounded by a minimum and maximum count, so a project where the default finds nothing, or everything, still gets a sensible result; each is a setting, never a hard rule |
| 12 | **balanced depth** | 2026-11-02: wide before deep; the fewest layers that keep each within the budget, and a ceiling on depth; salience folds the rest (*Strategy* stage 6) rather than another layer hiding the big picture |
| 13 | **a module shows in its component, unless it matters** | 2026-11-02: by default a module is a row in its component's card; it is a block of its own where it is salient (a hub, an entry point, much imported) or is its component's only module |
| 14 | **what tests a translator** | 2026-11-02: the user reading the translated models, across projects, is the final test. Projects: **this repo**, then **mndsite** (Next.js, JS/JSX, one package, folders by role). Scores (*Strategy* stage 9) guide; they never decide. Component ids are minted from an anchor (a folder, or the most central module), never from the member list, so re-translating keeps them |
| 15 | **one model, named by what was read** | 2026-11-02: under the package root, one model named for what the translator read: the folder every module sits in (`src`), else `code`; never the project's name again. Its packages sit in their groups' folders inside it, with the lines between them; a project of one package is that model (`mndsite › code`) |
| 16 | **no bands; order and tags** | 2026-11-04: entry points, components and shared modules are no longer regions (the map drew them as boxes, the explorer never listed them). A package lists them in reading order — entry, components by level, shared — the first tagged `ts.entry`, the last `ts.shared` (the `ts` package's tags) |
| 17 | **order is written by the parent's list** | 2026-11-04: a part written as its own file is placed where its parent file's list names it (design.md *Diagram files*); the translator lists every component and entry so |
| 18 | **packages by level, not by disk folder** | 2026-11-04: the model holds its packages directly, entries first, `layered`, with the lines between them; a package's disk folder stays only as `source`. Supersedes row 15's group folders |
| 19 | **the system starts at what nothing uses** | 2026-11-04: a package no other package uses is where the system starts; its top modules (importing others of it, imported by none) are its entries, and their paths go on across packages, a lifeline per block reached anywhere (`code.views.map`). Paths walk **wide before deep** — what the entry calls, then what those call — and never step into a shared module, whose calls are implied as its lines are |
| 20 | **a type read is no dependency** | 2026-11-04: an import of interfaces and type aliases only uses the vocabulary (a definition of its own), so it weighs nothing in the module graph and draws no line; dependency lines name only the values read. It broke no cycle in this repo: core's and tray's are value cycles |
| 21 | **a cycle is one unit** | 2026-11-04: components importing each other round become one component holding them, a level down; entered, it shows the cycle among its parts. The fallback: row 22 leaves none in this repo |
| 22 | **splits that rank first** | 2026-11-04: of the splits within the budget, those whose components rank (the fewest modules in groups importing each other round) win before the cleanest, and the foundation and entry set aside are chosen the same way, so a cycle is cut where it is weakest rather than wrapped. core: `blocks` set aside again, five components L0–L4, modularity 0.39; tray five, L0–L3 |

**Superseded** from 2026-11-01: every top-level declaration as a block and every declared type as a definition (rows 6, 8); each module a diagram on its package's layer (row 7).


## Strategy

**Deterministic stages over the dependency graph** (2026-11-02), drawn from published architecture-recovery work (Bunch's omnipresent modules, ACDC, Leiden), each a package where one exists. Every threshold is a default with floors (*Decided* row 11).

| # | Stage | What it does | Default, to test |
|---|---|---|---|
| 1 | **graph** | module edges weighted by the symbols imported; a type-reference graph beside it | |
| 2 | **foundation and entry** | set aside on both sides: the modules most of a package imports are a foundation band at the bottom, those importing most of it (with barrels and wiring) an entry band at the top; their lines implied, never drawn | at least 35% of the package's modules; at least the likeliest 1, at most a budget's worth; the run kept is the one splitting the rest most cleanly, which may be none |
| 3 | **components** | community detection on what remains; of the resolutions within the ceiling, one needing no further split first (wide before deep), then the cleanest; a component still over the ceiling splits again; modules joined to nothing grouped by folder, the one signal left; npm packages kept as drawn by a person | at most 9 per layer (7 + 2, `--components 7`); depth at most 2; folder bonus 0.5 on an import's weight |
| 4 | **levels** | where two components import each other the heavier direction ranks them; cycles left condensed and said; ranked entry first | |
| 5 | **interfaces** | a component's ports are its exports used outside it; a line between components carries what crosses, weighted by coupling | |
| 6 | **salience** | PageRank and size pick what is drawn; the rest folds into a count; entry points and hubs marked; a salient module is a block of its own (*Decided* row 13) | |
| 7 | **vocabulary** | each shared type owned by the component declaring it, ranked by fan-in on the type graph, capped per class diagram | |
| 8 | **names** | a folder's name where the cluster matches one; else the words most particular to its modules' names and docs; else its most central module's; an agent may rename | |
| 9 | **score** | each run prints modularity, budget fit and cycles; MoJoFM against a hand-made breakdown, where there is one | |

**Standard diagrams**: the system, its packages `layered` over their foundation; a package, its components `layered` with ports over its foundation, and a class diagram of the vocabulary it owns; a component, its modules as rows in its card, and later a flow from a call graph. A layer gets only the diagrams its contents warrant.


## Directions

**Still open**, each with a leaning to test.

| # | Question | Options, leaning first |
|---|---|---|
| 1 | **edge weights** | symbols imported (built) plus type references · symbols only. Test whether type references move the clusters |
| 2 | **the clustering package** | graphology's Louvain without its random walk (built), so a run repeats · Leiden where a package exists |
| 3 | **component kinds** | a `ts.component` kind beside `ts.package` and `ts.module` · reuse `services.component` |
| 4 | **modules joined to nothing** | they push a layer over budget (mndsite: two `Since`, two `_app`): fold them by salience (stage 6) · one group of the unjoined |
| 5 | **vocabulary ranking** | fan-in on the type graph · PageRank on it; what a definition is *used by* is the fields and signatures typed by it (today it reads *nothing uses it*) |
| 6 | **writing the workspace** | the translator builds the graph with core's types and `write`, then the door checks it (needs `@mnd/core`, against row 1's no-kit rule) · emits JSON by hand to the file schema |
| 7 | **a reference breakdown** | hand-made for this repo, for MoJoFM; code-homes.md maps concerns to homes, not modules to components, so it is a start, not the breakdown |
| 8 | **what the agent layer needs** | a walkthrough's steps naming translated views and elements (design.md *Open* `walkthroughs`); a stable name for every translated element across re-translation |
| 9 | **a one-package project repeats its name** | settled by *Decided* row 15 |
| 10 | **the system view** | settled by *Decided* row 15: the model holds the packages and their lines |
| 11 | **what is primary reads first** | primary blocks stand out (a heavier border), their contents quieter; more space between major parts than within one · salience (stage 6) says which are primary; the look is design-plan's |
| 12 | **flows central** | each entry point shows a flow of data and how it meets the primary parts; the major paths are the first thing read · paths from a call graph, entry to foundation, weighted by what crosses; drawn as a walkthrough's first steps |
| 13 | **a path held in frame** | settled 2026-11-04: a pick on the map fits the block and its hops; a walk fits each step's two ends. Open: the same fit in an entered view, which today stays fitted whole |
| 14 | **every block's path** | settled 2026-11-04: full paths read as a tangle and their numbers meant nothing to a reader; every block shows one hop each way instead, and a path is walked a hop at a time from a block marked ▶ (design.md *Behaviours*) |


## Built 2026-11-01

**The first, mechanical translator.** `npm run code` translates this repo into `samples/code` and collects `samples/code.json`: 13 packages, 159 modules, 237 definitions, 80 library types, 565 dependencies, 156 associations; `check` clean. The samples collect unchanged.

| Change | Where | Keep? |
|---|---|---|
| references: `.` only, ordered bare lookup, qualified names load their package, ambiguity and dotted names said | core `refs.ts`, `sources.ts`; cli `main.ts` `gathered` | yes: general |
| ids by name (`file:step`), repeats counted | core `sources.ts` `block_ids`, `minted` | yes |
| definition names unique beside each other, not per package | core `door.ts` `named_defs` | yes, pending the user's word |
| `subtree` read off the children index (13 s of work on entering a package, now under 2) | core `tree.ts` | yes |
| libavoid routes at most 64 lines a layer, else `route`'s runs (100 lines took 13 s, 230 never finished) | views `avoid.ts` `MOST` | yes, pending the user's word |
| a box too narrow or short has what it holds weighed up; what still has no room, or lies outside its parent, is not drawn (2026-11-02: the library map's *apps* box drew its last folders below itself) | views `map.ts` `mapped` (`SHORT`, `gone`) | yes |
| the `ts` package | packages/defs `packages/ts`; public/packages `ts.json`, index | revisit (*Directions* row 3) |
| the translator | apps/ts `read.ts` (ts-morph to data), `write.ts` (a source folder), `main.ts`; root `npm run code` | `read.ts` mostly stays; `write.ts` is rewritten for *Decided* rows 3, 6, 7 |


## Built 2026-11-02

**Stages 1–4 and 9: a project's structure, reported.** `npm run start -w @mnd/ts -- <project> [folder] [--components n]`: without a folder, prints the structure and writes nothing. About 5 s for either project.

| Change | Where |
|---|---|
| imports weighted by symbols, resolved through barrels to the declaring module; `require`; entries (barrels, wiring); scope per *Decided* row 4 | apps/ts `read.ts` (`imports_of`, `wiring`, `src_of`) |
| foundation and entry set aside, components, levels, score | apps/ts `structure.ts` |
| the report | apps/ts `report.ts`; `main.ts` |
| the workspace: one model named by what was read, its packages in their groups' folders (*Decided* row 15); a package diagram of three bands, **entry points**, **components**, **shared**; a component a file of its modules and the lines between them; each line named by the two names most read across it, then a count | apps/ts `write.ts`; `npm run code` (this repo, 34 files, was 411); mndsite by hand to `samples/mndsite` |
| a `component` kind | packages/defs `packages/ts/blocks/component.json`; `npm run packages` |
| imports keep the names they read | apps/ts `read.ts` `Import.names` |

**Written through a source folder and `collect`** for now, against *Decided* row 3, so the door's check runs on it; both workspaces `check` clean. **Left out of this pass**: definitions and library types (stage 7), ports (stage 5 is line names only), salience (stage 6).

**This repo**: every package within budget at depth 1; modularity core 0.39, tray 0.50, views 0.51, stage 0.31; no cycles between components once `actions/blocks` is an entry. **mndsite**: 44 modules at 0.56, one over budget (*Directions* row 4).


## Findings

Seen in the browser on the translated repo, and (2026-11-02) by Louvain over each package's module imports, seeded, imports only.

| Finding | Notes |
|---|---|
| **the folders carry little structure** | views, tray and stage are flat (20–34 modules each), core has one folder: the structure is in the graph, so folders cannot be the prior |
| **views clusters as its subsystems** | modularity 0.29, 5 components: looks (look, face, facts), layout (size, arrange, bands, pack, layered), routing (seat, route, avoid, ends), diagram views (classes, lifelines, sheet, layer), library maps (library, treemap, registry) |
| **core is one blob until its hubs are set aside** | 0.19 with all modules; setting aside types, defs, tree, library and holders (the graph model) gives 0.34 and 221 edges become 77: edits (`actions/*`), loading (sources, refs, card, ports), derived state (fold, uses, door, session), kinds and ends (names, capabilities, ends) |
| **tray and stage are looser** | 0.29 and 0.30; groups plausible (stage: gestures, nodes and picks, chrome) but less crisp; a test of weights (*Directions* row 1) |
| **entries glue as foundations do** | mndsite's `theme.config` imports 20 components and pulled everything into one group (0.11); set aside as an entry, 0.56. In core, `actions/blocks` set aside ends a 6-way cycle |
| **aiming at the budget over-splits** | choosing the count nearest 7 cut stage into small groups (0.20); the budget is a ceiling, the cleanest split under it wins |
| **forced room merges** | taking the folder groups out of the clustering's room merged scripts and components (27 modules); the unjoined are a salience problem, not a clustering one |
| **names are the weakest part** | anchors name most components (`helpers`, `pairs`, `Json`); folder names only where a component is its whole folder (stage 8) |
| **reading a model** | the user, 2026-11-02: informative and the right direction. Read wrong: the name repeated (`models › mndflow › mndflow`; mndsite three times), fixed by *Decided* row 15. Hard to tell the primary parts from what is a diagram; the major paths should be obvious and central (*Directions* rows 11–12) |
| **seen in the app 2026-11-02** | the map shows each package holding its components; a package diagram reads as bands, its components laid by direction, lines named by what crosses; entering a component shows its modules. Line names still crowd lines and cards inside a busy component (core's `session`), a view matter for design-plan |
| **wiring outside the code** | mndsite's components are used from MDX pages and `theme.config.jsx`; without reading them half its components joined nothing |
| a module's diagram is a flat enumeration | its functions as cards, each saying *2 attributes*: no structure, no lines (*Decided* row 7) |
| core's layer unreadable | 39 cards, 230 lines run straight under cards at fit; components and a foundation (*Strategy* stages 2, 3) are the answer, not a better router |
| chips nameless at fit | on both maps most chips show only their icon; fewer, larger components help; the rest is design-plan's busy-map work |
| the library map's columns are slivers | every translated definition weighs the same (no uses), so small folders get thin columns; *used by* (*Directions* row 5) gives definitions weight |
| a project named as a catalogue package | translating apps/ts alone names it `ts`, and the door renames one of the two |
| every entry takes about 2 s | at 2,100 blocks; profile again at the new, smaller output |


## Built 2026-11-04

**One tree, one order, and paths across packages**; then **one hop each way and walks** (design.md *Behaviours*, code-homes.md *a block's hops lit*). This repo translated, `check` clean, seen in the app.

| Change | Where |
|---|---|
| Louvain's runs scored at resolution 1: its own score is scaled by resolution and always chose the coarsest, so views came out one component of 35 (now 6, modularity 0.53) | apps/ts `structure.ts` `clustered` |
| bands gone; reading order and `ts.entry` / `ts.shared` tags; packages under the model by level | apps/ts `write.ts` `package_files`, `files_of`; packages/defs `ts/package.json` |
| a part placed by its parent's list | core `sources.ts` `places_of` |
| calls read across packages; system paths, wide before deep, no steps into shared modules | apps/ts `read.ts` `calls_of`, `structure.ts` `system_paths`, `paths_of`; `write.ts` `Refs` |
| the overview's mini map draws no path: one subtle outline everywhere | tray `Where.tsx`, `tray.css`; views `map.ts` `mini_map` |
| a chip weighs its joins too (the root of the names across its hops); a block owning a path, or a hop from one, never folds: web's `App` now shows | views `map.ts` `joins_weight`, `kept_open` |
| hops light on hover only after the pointer rests 250 ms | stage `path.ts` `useOver` |
| types out of the module graph; cycles condensed; splits that rank first | apps/ts `read.ts` `type_only`, `structure.ts` `values_of`, `condensed`, `clustered` (`cyclic`), `set_aside` |
| legs kept simple — straight where two blocks face each other, else one bend — over the chips on a halo (out-right-in-left tried and dropped: its loops doubled back); the hover card waits 1 s, 400 ms warm | views `trace.ts` `routed`, `plan`, `drawn`; stage `Traced.tsx`, `flow.css`, `Hover.tsx` |
| any pick on a map dims the rest; chip names at every zoom; turned text smoothed in grey | views `trace.ts` `picked_trace`; stage `path.ts`, `flow.css` |
| a chip's body and nested tiles at every zoom (`chip_steps` gone); a smaller arrow; letting go by Escape, Backspace on a map or a click on empty ground, back to the section's map, the camera staying put; two clicks on empty ground go up; a map's box taken by its title | theme `chip.tsx`; stage `nodes.tsx`, `Traced.tsx`, `Stage.tsx`, `pointer.ts`; core `session.ts` `clear`, `navigate.ts` `map_of`; web `App.tsx` `stop` |
| showing a list picks nothing (library and models on mndsite picked their first row and dimmed the rest); the hops worked out once until the graph is written (`kept`) | tray `Definitions.tsx`; core `tree.ts` `joins` |
| a tall, narrow chip turned -90° whole | views `map.ts` (`TURN`, `face`); theme `chip.tsx` `turned`; stage `nodes.tsx`, `flow.css` |

## Watch for

- **scale**: `where_map` lays the map again at each 8 px of resize; the explorer and the maps have now been seen at 2,100 blocks (*Findings*)
- the kit's `.types` are stale until the kit is released, which matters once the translator moves out

## Built 2026-11-02, second pass

**Entry paths, salience, names and vocabulary**, run on this repo and mndsite, both `check` clean, seen in the app.

| Change | Where |
|---|---|
| calls into other modules of a package, each entry's path, its `sequence` (the entry paths work) | apps/ts `read.ts` `calls_of`, `structure.ts` `paths_of`, `write.ts` `entry_files` |
| salience; the least salient modules folded into `other` | `structure.ts` `salience`, `folded_of`; `write.ts` `component_files` |
| names by words | `structure.ts` `worded`, `words_of`, `STOP` |
| the vocabulary and its class diagrams | `structure.ts` `vocab_of`; `write.ts` `vocab_files`, `attribute` |

**This repo**: 13 packages, 163 modules, 194 files; core's components now `action`, `session`, `sources`, `holders`, its own types (`Block`, `Graph`, `Relation` …) in `core types`. **mndsite**: a path for every entry — an MDX page's components used as elements count as calls (`read.ts` `mdx_of`), so each page reaches what it renders; `theme-config` the longest, components `link`, `page`, `contents`, `meta`, …; no shared types, being JavaScript.
