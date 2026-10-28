# Backlog

**Deferred and future work, out of the plan.** An item moves into plan.md when it is taken up.

## CLI (next, as time allows)

**The CLI is the first backlog item taken up.** Its scope includes a full pass over the file-based package and diagram definition surface: the schema, and how blocks, cards and diagrams are defined and linked together when defining a package.

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

**The CLI is the one terminal: an agent writes meaning as data, sees what the person will see, and hands over that view.** The file is the state, written in place; one JSON result per verb; references are an id or a path `a::b::c` (plus `$key` in a script); the CLI adds no rules.

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


## Later

| Item | |
|---|---|
| **the rail** | future work, tasked separately |
| **type structure** | `many` and `optional` only, until a translator needs maps, unions, or generics |
| **a message's record** | a message typed by the record it carries |
| **unknown keys** | a key the schema does not use is dropped |
| **source fetch** | `bring` takes a package from a URL. An arbitrary file waits on the next translator |
| **mndmap on the map** | release the kit (it no longer exports `survey_graph`), update mndmap's vendored kit from 0.11, draw its source folder as the map. Its content rows are not yet regions; `packages/kit/.types` is stale until the kit is released |
| **mndmap `edits.ts`** | a second action system with its own placement rules; its home is core's actions or one shared placement check |
| **speed** | library lookups rescan every package; `uses_of`, `project`, `users_of`, `collect`'s `on_layer` ask per element. A per-graph index, once something is measured slow |
