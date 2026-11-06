# Backlog

**Deferred and future work.** An item taken up gets its own plan, deleted when it is built. **Next**: simplification, its plan in simplify-plan.md (decided 2026-11-05). **In progress**: code translation, its plan in translate-plan.md (taken up 2026-11-01, ahead of the CLI); entry paths through a translated model finished 2026-11-02, its leftovers under *Later*; the design language, paused, its plan in design-plan.md.

## CLI (next, alongside code translation)

**The CLI is taken up with code translation** (translate-plan.md decides how much of it the translator needs first). Its scope includes a full pass over the file-based package and diagram definition surface: the schema, and how blocks, cards and diagrams are defined and linked together when defining a package.

### Placement

| Work | Done when |
|---|---|
| **the kit and the CLI**: the kit's viewer and the CLI still place by the synchronous fallback | they draw a layer with `layer_scene`, or a section's map, as the app does |

### Fixes

| Task | Where |
|---|---|
| exit codes: `check` / `review` exit 1 on faults and on a file that is not JSON | cli `main.ts` |
| `fixture:` prefix on sources, so a fixture name never shadows a file | cli |
| `@mnd/defs` indent | cli `package.json` |
| an unknown id reads as itself in refusals | core `actions/` |
| SysML ends written and resolved by qualified path; read-back stores `label`, not the escaped `name` | cli `sysml.ts` |
| drop `Said.kind`: nothing reads it | core `session.ts` |
| `define` takes no `id`. Drop `id?` from actions.md. The explorer does not pass one | core docs `actions.md` |

### Surface

**The CLI is the one terminal: an agent writes meaning as data, sees what the person will see, and hands over that view.** The file is the state, written in place; one JSON result per verb; references are an id or a path `a.b.c` (plus `$key` in a script); the CLI adds no rules.

| Verb | Writes | Does |
|---|---|---|
| `new <file>` | yes | an empty workspace |
| `do <file> <action> [k=v…]` · `do <file> <script.jsonl \| ->` | yes | one action, or a script: all or nothing |
| `show <file> [ref] [--depth n] [--text]` | no | the tree, or one element whole |
| `find <file> <text>` | no | matches by name, then type, then body |
| `check <file \| dir>` | no | faults and notes, each naming its element, of a file or a source folder collected first; exit 1 on faults |
| `collect <dir> [-o out.json]` | no | a source folder (definitions, card sources, diagram files) as one package or workspace file |
| `help [action]` | no | the registry's actions and arguments |
| `draw <file> [ref] [flags] -o x.png` · `--open` | no | the kit `Viewer` screenshotted headless; `--open` hands the same view to a browser |
| `bring <file> <name \| path \| url>` | yes | a package, frozen, through the door |
| `export <file> [--package <name> \| --sysml [--round]]` | no | the file folded clean, a package, or SysML |

Values: `k=v` text, `k:=json`, `k=@path` a file's text. Exit 0 done, 1 refused or faults, 2 usage. Writing verbs take `--dry`.

| Step | Tasks | Done when |
|---|---|---|
| **write** | action args: `ref` and `many` on `Arg`; one name per role (`ids`, `grid`, `type`); `at` split into `cell` / `line`; lists as JSON lists; positional args declared. Path resolution with candidates in core. cli `state.ts`, `args.ts`, `refs.ts`; `new`; `do` inside `session.batch` | `new`, then a script making three blocks, relating two by `$key` and describing one from a `.md`, `check`s clean; a refused last line leaves the file byte-identical |
| **read** | `show`, `find` (cli `read.ts`); `help` from the registry | an agent with no docs lists the actions, finds `Pump`, reads it and relates it |
| **see** | `frame/` page mounting the `Viewer`; `draw` on Playwright with an installed Edge or Chrome; `--open` via the web app loading a handed-off file at mount; `project` and `outline` leave the CLI | the repo map's package and `core` layers come back as PNGs matching the app; `--open` shows the same view with no picker |
| **packages and faults** | `bring`; `export --package`; `Fault.id` set by every door fault; every unknown definition and independent fault reported; `review` folded into `check` | a hand-written package is checked, brought, used as a `type` and exported byte-stable; `check` names an orphan, a dangling edge and two unknown types |
| **speed and docs** | bundle `mnd` with tsup; rewrite the CLI README; design.md's agent-surface question closes on this section; refresh the `vitest` skill | a call returns in well under a second |

**Acceptance:** this repo mapped through the CLI alone: `new`, one generated script, `check` clean, `draw` and revise, `draw --open` hands the view over. No ids in hand, no browser editing, no hand-placed geometry.


## Edges

Known rough spots, taken when a step passes near one.

| Area | Edge |
|---|---|
| **cards** | marks on a dark table card are faint; a reference previewing a table ignores its own look's border; notes still draw through `NoteNode`, not only `CardFace` |
| **tray** | its where-it-lives map lays out its own map once per graph (`Where.tsx` `laid_map`), beside the stage's, so every edit lays the map twice; its tables light picks by id, not through core `lit`, so a part picked through one usage lights its row wherever it is listed; a line's preview never shows `line.dir`; a definition's resolved chain chip is gone; in a read-only tray *view definition* is disabled with everything else; the definitions table's *extends* shows a sibling definition (`example/Ledger`) for one that extends nothing |
| **overview** | the glance mounts a second React Flow, so node description ids repeat in the page; on the open layer with nothing picked it draws what the canvas already draws; a tag with no hue paints its share of the bar plain |
| **samples** | moving the shop's documents to `type: document` dropped two looks with no definition to carry them (*Release notes* `name: hide`, *Incident summary*'s 8×3 size); no definition with room parts is used twice, so *one highlight*'s case — a part picked under one usage lights nothing under another — has not been driven in the explorer |
| **tests** | the browser sweep reloads before every click (about 4 minutes); clicking in turn would be far quicker but less isolated. Playwright is a dev dependency now, which the CLI's `draw` can reuse |
| **core** | `resolved` (what a card draws as) sits in `tree.ts`, whose scope is placement; it belongs beside `stands_for` |
| **camera** | a short port drag lands short |
| **React** | `flushSync was called from inside a lifecycle method`, once seen opening the profile from a layer; recheck |
| **packages** | a definition file holds no parts, so a pattern's parts live in its package's `package.json`; base's `decision` and `services`'s share a name, so `type: decision` resolves to whichever the lookup finds first |
| **paths** | a path names every region on the way (`Overview.Shop.Back office.Payments`), though layers look through them |
| **diagram files** | a card drawn in by `source` keeps only its type, body, tags, settings, name and values; the web app's collect loads no `packages` a file lists |
| **annotations** | a label floats aside, so on a layer cut into regions it can land across a band's heading; a picked region draws a full outline rather than its band; an empty layer's words centre on the canvas rather than the room |
| **ports** | design.md gives a port its definition's settings, values and tags; ports hold name, type, flow, seat and description only |
| **map** | a count on a tight chip fragments (*service 6.*); the room sits under a one-line head |
| **double-click a grid** | lands on its name and renames it; Enter opens it |
| **follow-ups** | lineage and links as a package structure rather than a view; boxes for a definition's usages and the groups they belong to |


## Later

| Item | |
|---|---|
| **the rail** | future work, tasked separately |
| **entry paths** | from the entry paths plan (closed 2026-11-02): on the map, an entry-points band of few, light chips is a narrow column (tray, views; weighing up a few rounds starved other regions, tried and reverted); registries still lay out with their own treemap (views `treemap.ts` `tiled`), not the map's; paths stay inside one package (apps/ts `calls_of` records calls within a package only; crossing packages is what makes a path the system's story); several paths at once; `mnd measure` on the map's traced paths; a package's class diagram of its own types sits loose below its bands, and a note's tie runs straight across the shop |
| **type structure** | `many` and `optional` only, until a translator needs maps, unions, or generics |
| **a message's record** | a message typed by the record it carries |
| **unknown keys** | a key the schema does not use is dropped |
| **source fetch** | `bring` takes a package from a URL. An arbitrary file waits on the next translator |
| **mndmap on the map** | release the kit (it no longer exports `survey_graph`), update mndmap's vendored kit from 0.11, draw its source folder as the map. Its content rows are not yet regions; `packages/kit/.types` is stale until the kit is released |
| **mndmap `edits.ts`** | a second action system with its own placement rules; its home is core's actions or one shared placement check |
| **speed** | library lookups rescan every package; `uses_of`, `project`, `users_of`, `collect`'s `on_layer` ask per element. A per-graph index, once something is measured slow |
