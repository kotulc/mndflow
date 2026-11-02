# Code translation plan

**Translate a TypeScript codebase into a mndflow workspace and explore it: this repo first.** The primary use case in design.md's vision: models are translated, then shown. Taken up 2026-11-01; nothing is built yet. Delete this plan when the first translator ships.


## Next session

**Start here.** Settle the decisions below with the user before any code; several change what the CLI must do first. Then mock up the TypeScript package (what a module, a class, a function *is*) on a slice of this repo, as the shop was for the design language.

- the design language is paused, its plan in design-plan.md; its where-it-lives map and scope work (2026-11-01) is built, committed through 6ec08d6 bar its last turn
- this repo is the busy test case: hundreds of files across `apps/` and `packages/`, which the map and the where-it-lives map have not yet been seen at
- **search before building**: a parser is a package choice, never custom code


## Goal

| | |
|---|---|
| **in** | a TypeScript project folder |
| **out** | a workspace: the project's structure as a model, its declarations as definitions, its imports as lines, each block keeping `source` (its file and span) |
| **acceptance** | this repo translated with no hand edits, `check` clean, explored on the map: packages, folders, modules, and a module's internals reachable in a few clicks, the overview's where-it-lives map reading at that scale |
| **later** | writing back out (round-tripping is design.md's goal, but reading comes first); other languages; hardware |


## What exists

| Piece | Where | Use to the translator |
|---|---|---|
| translation rules | design.md *Translation* | a translator is its own project reading and writing graphs through the kit, shipping a package of definitions, never a module; ids minted once and kept in its map, never derived from source text; `source` says where content lives |
| the first translator | the mndmap repo | the pattern to follow: a scanner (names and `source` only), a parser read on demand, and a markdown package that carries the meaning |
| the CLI | apps/cli: `fold`, `check`, `project`, `outline`, `review`, `run`, `search`, `translate` (SysML out and back), `export`, `collect` | `collect` turns a folder of definition and diagram files into one workspace; `translate --round` is the round-trip check to copy |
| the CLI surface plan | backlog.md *CLI* | `new`, `do` (actions and scripts), `show`, `find`, `check`, `draw`, `bring`, `export`: what an agent or a translator writes and reads with |
| packages | packages/defs (`base`), public/packages (`services`, `sysml`, `doc`, `requirements`) | `base` holds block, folder, model, interface, relations; a TypeScript package would sit beside `services` |
| type structure | backlog.md *Edges*, design.md | types know `many` and `optional` only, added to as a translator needs |


## Decide first

| # | Question | Options, recommendation first |
|---|---|---|
| 1 | **where the translator lives** | its own repo beside mndmap, on the kit (design.md's rule) · a verb in apps/cli · a package in mndflow |
| 2 | **the parser** | the TypeScript compiler API or ts-morph (types resolved, one language) · tree-sitter (many languages, syntax only) |
| 3 | **how it writes** | the CLI's `new` and `do` scripts (one surface for agents and translators; needs backlog *write* first) · the kit's session in process · a workspace file written directly and `check`ed |
| 4 | **what each construct is** | a draft: a package or folder as a folder; a module (file) as a block in the model; a class, interface or type as a block definition in the TypeScript package's library and its uses; a function as a block with interfaces; an enum or alias as a type; an import as a `dependency` line between modules. To mock up and agree |
| 5 | **depth** | modules and their exports first, function bodies never · down to every declaration |
| 6 | **which views a module opens to** | an internal diagram of its declarations · a class diagram of its types · both, by what it holds |
| 7 | **the id map** | a file kept beside the workspace, keyed by source path and declaration name · inside the workspace as values |
| 8 | **re-translating** | a fresh workspace each time, ids kept by the map · updating in place (later) |


## Steps

Provisional; reorder once the decisions are made.

| # | Step | Done when |
|---|---|---|
| 1 | **decisions** above, with the user | each row answered here |
| 2 | **the TypeScript package**: its definitions and tags, as a mockup on a slice of this repo (core's `actions/` folder) | the slice reads well on the map and in a module's view |
| 3 | **the write surface** the translator needs (backlog *CLI* step *write*, or the in-process path) | a script of blocks, lines and descriptions lands and `check`s clean |
| 4 | **scan**: folders and files to blocks with `source`, ids minted into the map | this repo's tree on the map |
| 5 | **declarations**: exports and types to definitions and uses | a module opens to its declarations |
| 6 | **imports** to lines | a package's dependencies read on its diagram |
| 7 | **the busy case**: map, where-it-lives map, explorer and tray at this repo's scale; fix what breaks | the acceptance row above |


## Watch for

- **scale**: `where_map` lays the map again at each 8 px of resize, and the explorer and map have only been seen on samples of tens of blocks
- **design.md's open question** *the next translator*: this plan answers it for code; record the answer there once decided
- the kit's `.types` are stale until the kit is released (backlog *mndmap on the map*), which matters if the translator is its own repo
