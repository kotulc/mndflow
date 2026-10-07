# CLI plan

**The CLI is the one terminal.** The in-app terminal is gone; agents and scripts reach mndflow through `mnd`. This plan records what driving it as an agent found (2026-10-05), the decisions taken, the target surface, and the steps to get there. What the model decides stays design.md; this is about the CLI and the data contract it exposes.


## Goal

**Everything configurable through text data files, end to end.** A workspace is JSON, a package is JSON, a block's content is markdown, and soon a card's look and layout are markdown too. The CLI reads and writes all of it, answers in JSON, and never needs a human to read its output. **Diagrams are a bonus**, not the contract.

| An agent must be able to | Today |
|---|---|
| start a workspace and build it up over many commands | no: `run` never writes back |
| refer to anything by what it is called or where it sits | no: ids only, and new ids are never reported |
| read one element whole — text, source, values, relations | no: `fold` prints names only |
| learn the actions, definitions and settings without reading docs | no: docs only |
| author a package or a markdown body as a file and bring it in | partly: `search` reads the catalogue only |
| see a layer without a browser | partly: SVG, which needs a browser to look at |
| trust exit codes | no: `check` exits 0 on faults and on a file that is not JSON |


## Decisions

| | Decided |
|---|---|
| **state** | **the file is the state, written in place.** Every writing verb loads the file, applies, and writes it back. `--dry` previews without writing |
| **output** | **JSON on stdout for every verb.** `tree --text` is the one human-shaped exception, kept because an indented tree is the cheapest read for an agent too |
| **the text drawing** | **dropped from the CLI.** `project`'s ASCII picture serves only a human. views keeps `draw` and `outline`, which its own tests use as shape projections |
| **edge labels** | **unchanged: the existing rule already holds.** `label_of` (core `names.ts`) draws an edge's own name, else its definition's name, and nothing for an unnamed base `line` or `tie`. Simple edges use base `line` and say nothing; an edge names itself only when the name says something. A custom relation definition (e.g. `depends`) labels every edge it types, so a map should reach for one only when that label is wanted |
| **ids** | **minted, never chosen by the caller** (schema.md: ids are never derived from a name). An agent never needs one: **a path is always unique**, since a name is unique among siblings. New ids are reported back |
| **markdown** | content and card look are text the CLI passes through untouched: any value may come from a file. No markdown-specific verbs; a card template is a setting, written with `look` like any other |


## Findings

**What driving it found.** A map of this repo (11 packages, 117 modules, 352 import relations) written straight as a workspace file passed `check` clean, imported in the browser, and drew well at the package layer. **Built through the CLI it was impossible**, for the reasons below.

### Gaps

| # | Gap | Effect |
|---|---|---|
| G1 | `run` folds the source, applies, prints and discards | no action ever chains |
| G2 | `run` prints mutation op names, never what it made | a created block cannot be referred to next |
| G3 | block arguments take ids only | `relate from=Pump to=Valve` is refused: "both ends have to be there" |
| G4 | no read of one element | body, source, values and relations are unreachable |
| G5 | `fold` omits ids and relations; `outline` mixes names and ids | no read is complete enough to act on |
| G6 | no listing of actions, definitions or settings | the registry knows every action's arguments, form and scope, and nobody can ask it |
| G7 | `k=v` only: no lists, no JSON, no text from a file | `ids`, `traits`, `choices` and markdown bodies cannot be passed |
| G8 | `search` neither writes back nor takes a local package file | an agent cannot author a package and bring it in |
| G9 | SVG only | looking at a drawing needs a browser |
| G10 | about 2.3s per call through vite-node | a few hundred actions take minutes |
| G11 | the browser opens a file only through the import picker | a CLI-built file cannot be shown without a hand |

### Bugs and loose ends

| # | Where | Issue |
|---|---|---|
| B1 | cli `main.ts` `check` / `review` | exit 0 on faults, and on a file that is not JSON |
| B2 | cli `main.ts` `pairs` | numeric-looking text becomes a number (`name=2024`); lists arrive as one string |
| B3 | cli `main.ts` `find_layer` | a duplicate name silently takes the first; `--how` without a layer is silently ignored; `--layer` is missing from the usage |
| B4 | core `actions/blocks.ts` refusals | an unknown parent reads `"missing" holds nothing of that sort` — `shown_name` answering for an id that is not there |
| B5 | core door faults | no fault names the element it is about ("a relation with an end that is not there") |
| B6 | core door | one unknown definition refuses the file and hides every other fault. Refusing is right; reporting one is not |
| B7 | cli `sysml.ts` `end_of` / `find` | ends are written as bare names and resolved to the first block with that name: on the repo map `--round` loses 66 of 490 relations (`index.ts`, `ports.ts`) |
| B8 | cli `sysml.ts` `from_sysml` | stores the escaped `name` instead of `label` |
| B9 | core `session.ts` `Said.kind` | `"mirror"` / `"note"` existed for the terminal's mute; nothing reads it now |
| B10 | cli `package.json` | `@mnd/defs` mis-indented |
| B11 | the `vitest` skill | still describes localStorage and the terminal |
| B12 | cli source names | a fixture name shadows a file of the same name (`blank`, `clean`) |


## Principles

- **The file is the state.** No session outside it, no hidden working copy.
- **Data in, data out.** Arguments may be JSON or a file; output is JSON; exit codes mean something.
- **One resolver for every reference.** Any argument whose registry form is `block` takes an id, a name or a path.
- **The registry and the graph are the help.** Listings are generated, never written by hand, so they cannot drift.
- **The CLI adds no rules.** It parses, resolves, calls core and prints. Anything a rule needs lands in core, where the app gets it too.
- **Minimal modules, one purpose each** — see the layout below.


## The surface

```
mnd <verb> <file> [args]
```

| Verb | Replaces | Writes | Does |
|---|---|---|---|
| `init <file>` | copying `blank` | yes | a new empty workspace; refuses an existing file |
| `do <file> <action> [args]` | `run` | yes | one action, one step. Prints the step and what it made, changed and removed |
| `apply <file> [script]` | — | yes | many actions from JSONL (a file or stdin), **one process, one step, all or nothing** |
| `tree <file> [ref]` | `fold`, `outline` | no | the containment tree with ids, kinds and relations. `--depth n`, `--text` |
| `show <file> <ref>` | — | no | one element whole |
| `find <file> <text>` | — | no | elements whose name, type or body match, each with its path |
| `actions [name]` | reading actions.md | no | every action: name, about, scope, arguments with form, required and choices |
| `defs <file>` | — | no | every definition in reach: id, name, package, domain, extends, traits, schema, settings |
| `components` | reading schema.md | no | every settings key and what it accepts, from core's component validators |
| `check <file>` | `check`, `review` | no | the door's faults and the definitions' notes, each naming its element. Exit 1 on any |
| `search <file> <name>` | `search` | yes | fetches a catalogue package and brings it in, frozen |
| `bring <file> <package.json>` | — | yes | brings a local package file in, frozen, through the door |
| `pack <file> <name> [out]` | — | no | writes the workspace out as a package of its own |
| `draw <file> [ref]` | `project --svg` | no | `--svg` (default) or `--png`, to a file or stdout |
| `translate <file>` | `translate` | no | SysML out; `--round` checks it comes back; `--with <pkg>` brings a vocabulary first |
| `export <file> [out]` | `export` | no | the file, folded clean, re-written byte-stable |
| `view <file>` | the import picker | no | opens the web app on the file (last step, optional) |

**Dropped:** `fold`, `outline`, `project` (text), `review` (folded into `check`), `run` (renamed `do`).

### References

| Form | Example | Resolves |
|---|---|---|
| id | `block_pump` | exactly |
| name | `Pump` | when exactly one element has it; otherwise refused, listing every candidate's path |
| path | `mndflow::Headless::core` | names from the workspace's tree down, `::` between steps (names may hold `/` and `.`; `::` is SysML's own qualifier). The tree's own name may be left off |

Resolution order: id, then path, then name. **Within `apply`, each line resolves against the graph as the lines before it left it**, so a block made on line 3 is named on line 4 by its path — no symbolic ids needed.

### Values

| Syntax | Means | Example |
|---|---|---|
| `k=v` | text, always | `name=2024` stays text |
| `k:=json` | JSON: number, flag, list, object | `ids:='["Pump","Valve"]'`, `at:=0.5` |
| `k=@path` | the text of a file | `body=@cards/pump.md` |

The same conventions as httpie, so they need no teaching. In `apply`, each line is already JSON: `{"action": "relate", "from": "Pump", "to": "Valve"}`; a string starting `@` reads a file, relative to the script.

### Output

| Verb | stdout |
|---|---|
| `do`, `apply` | `{ steps, made: [{id, kind, name, path}], changed: [id], removed: [id], said? }` — `made` is what the step added, read off the graph before and after |
| `show` | `{ id, kind, name, path, type, def?, body?, source?, values?, settings?, traits?, tags?, children: [{id, name}], out: [{id, to, type?, name?}], in: [{id, from, type?, name?}] }` |
| `tree` | nested `{ id, name, kind, type?, children, edges? }`; `--text`: `▾ name  #id  (type)`, relations listed under their layer |
| `find` | `[{ id, kind, name, path, matched: ["name" \| "type" \| "body"] }]` |
| `check` | `{ faults: [{kind, what, id?}], notes: [{kind, what, id?}] }` |
| a refusal | stderr `{ "refused": "…", "candidates"?: [path] }` |

| Exit | Means |
|---|---|
| 0 | done, or clean |
| 1 | refused, or faults found |
| 2 | usage: no such verb, a missing argument, an unreadable file |


## The data contract

**Every text file mndflow reads is something an agent can write, check and bring in.**

| File | Written by | Checked by | Brought in by |
|---|---|---|---|
| workspace `.json` | `init`, `do`, `apply`, `export`, or by hand | `check` | it is the file every verb takes |
| package `.json` | `pack`, or by hand | `check` (a package file is a file) | `bring`, `search` |
| markdown body `.md` | by hand | — (text) | `describe body=@x.md`, `create … body=@x.md` via `apply` |
| card look (coming) | by hand | `components` says what is valid; the door drops what is not | `look … value=@x.md` |
| JSONL script | an agent | `apply --dry` | `apply` |

- **A JSON Schema for the file is published** (`mnd schema`, generated from core's types with a proven generator such as `ts-json-schema-generator`), so a file can be validated before it is written. `json-schema-to-typescript` already in the devDependencies is the reverse direction and is unused: confirm, then drop it.
- **Hand-writing the file stays a first-class path.** For a translator (code in, map out) one generated file beats a thousand actions, and the door is the same either way.

### Markdown readiness

**What full markdown cards need from the CLI, so nothing here has to change when they land.**

| Need | Met by |
|---|---|
| an agent writes a card's content | `body=@file.md`, on any block |
| an agent writes a card's layout or template | a setting on a definition, written with `look` and `value=@file.md` — **a setting, not a new field** (schema.md: settings is the one place the schema grows) |
| an agent learns what a card may set | `components`, generated from the validators, so a new card key appears there the day it is added |
| an agent restyles to taste across a workspace | definitions carry the look; usages follow. `defs` shows what each says, `look` changes it once |
| a style is shared | `pack` it as a package; another workspace `bring`s it |
| content round-trips byte-stable | `show` returns `body` raw; `export` never rewrites it |


## Module layout

| File | One purpose |
|---|---|
| `main.ts` | the verb table: parse, dispatch, print, exit |
| `args.ts` | `k=v`, `k:=json`, `k=@file`, flags |
| `refs.ts` | id, path or name to an id, or a refusal with candidates |
| `state.ts` | load a file, hand back a session, write it back in place |
| `read.ts` | `tree`, `show`, `find` — JSON shapes over the graph |
| `listing.ts` | `actions`, `defs`, `components` |
| `draw.ts` | SVG and PNG |
| `sysml.ts` | as now, fixed |
| `ports.ts` | as now, plus `files` bound to `fs` |


## Steps

**Each step leaves the CLI working and is driven by hand before the next.** Per the design-first rule no new tests are written while the surface moves; each step's "done when" is a command that shows it. The views tests that use `draw` and `outline` are untouched.

### 1 — Fix what is broken

| Task | Where |
|---|---|
| exit 1 on faults and refusals, 2 on usage and unreadable files (B1) | cli `main.ts` |
| an unknown id reads as itself, never `"missing"`, in refusals (B4) | core `names.ts` `shown_name` callers in `actions/` |
| ends written as qualified addresses and resolved by path; `label` stored; the tree's name kept (B7, B8) | cli `sysml.ts` |
| drop `Said.kind` (B9) | core `session.ts`, the web app and stage where `said` is read |
| fixture sources take a `fixture:` prefix (B12); fix the indent (B10) | cli `main.ts`, `package.json` |

**Done when** `translate <repo map> --round` reports the same 490 back, and `check` on a broken file exits 1.

### 2 — The file is the state

| Task | Where |
|---|---|
| `state.ts`: load (file or `fixture:`), a session over it, write back in place; `--dry` skips the write | cli |
| `args.ts`: `k=v` text only, `k:=json`, `k=@file` (B2, G7) | cli |
| `refs.ts`: id, `::` path, unique name; ambiguity refused with candidate paths. Applied to every argument whose registry form is `block` (G3) | cli, reading core `actions/registry.ts` `Arg.form` |
| `init` | cli |
| `do`: one action, written back; prints `made` / `changed` / `removed` by diffing the graph before and after (G1, G2) | cli |

**Done when** `init`, then three `do create`, a `do relate` by name and a `do describe body=@x.md` leave a file that `check`s clean and imports in the browser.

### 3 — Reading

| Task | Where |
|---|---|
| `tree` with ids, kinds and relations, `--depth`, `--text` (G5) | cli `read.ts` |
| `show` (G4) | cli `read.ts` |
| `find`: name, then type, then body, one order — the same ordering ST.21 wants, so it can move to core when the explorer gets it | cli `read.ts`; core later |
| `actions` from `all()` and each `Arg` (G6) | cli `listing.ts` |
| `defs` from `all_defs`, with domain, traits, schema and settings | cli `listing.ts` |
| `components` from core's component validators; where a validator cannot describe itself, give it a one-line description beside it in core | core `components.ts`, cli `listing.ts` |

**Done when** an agent with no docs can list actions, find `Pump`, read it whole, and relate it.

### 4 — Batches

| Task | Where |
|---|---|
| `apply`: JSONL from a file or stdin; each line one action; lines resolve against the graph so far; all inside `session.batch`; a refusal names the line and writes nothing (G10) | cli |
| `--dry` prints what would be made | cli |

**Done when** the repo map is built from a generated JSONL script in one call, in seconds.

### 5 — Faults that name their element

| Task | Where |
|---|---|
| `Fault` carries `id?`; every door fault sets it (B5) | core `door.ts`, `types.ts` |
| an unknown definition still refuses the file, but every unknown name and every other fault is reported (B6) | core `door.ts` |
| `review` folded into `check` as `notes` | cli |

**Done when** `check` on a file with an orphan, a dangling edge and two unknown types names all four, with ids.

### 6 — Packages

| Task | Where |
|---|---|
| `search` writes back (G8) | cli |
| `bring <file> <package.json>` through `session.bring` | cli |
| `pack` through `session.save_package`, with `files` bound to `fs` | cli, `ports.ts` |
| `mnd schema` prints the generated JSON Schema | cli; the generator as a dev dependency |

**Done when** a package written by hand is `check`ed, `bring`ed, used as a `type`, and `pack`ed back out byte-stable.

### 7 — Drawing

| Task | Where |
|---|---|
| `draw` writes SVG (as `project --svg` did) or PNG through `@resvg/resvg-js` (G9) | cli `draw.ts` |
| remove `project` and `outline` from the CLI | cli |

**Done when** an agent reads a PNG of a layer with no browser running.

### 8 — Speed

| Task | Where |
|---|---|
| bundle `mnd` with tsup, as the kit is; `bin` points at the bundle; `npm run build -w @mnd/cli` | cli `package.json`, a `tsup.config.ts` |

**Done when** a call returns in well under a second.

### 9 — Seeing it in the app (optional)

| Task | Where |
|---|---|
| `view <file>` starts the web app and opens the file, through the `net` port and `session.load` — no new port | cli, web `App.tsx` / `ports.ts` |

**Done when** a CLI-built file opens in the browser with no picker.

### 10 — Documents

| Task | Where |
|---|---|
| rewrite the CLI README around the new surface and the data contract | `apps/cli/README.md` |
| update the agent surface question in design.md and ST.25 in stories.md once answered | `docs/` |
| refresh the `vitest` skill: IndexedDB, no terminal, import through the picker or `view` (B11) | the skill |

### Acceptance

**This repo, mapped through the CLI alone**: `init`, one `apply` of a generated script — tiers as groups, packages holding modules, imports as base `line` relations, module doc comments as bodies, paths as `source` — then `check` clean, `draw --png` read and judged, and the file opened in the browser.


## Open

| Question | |
|---|---|
| **`find` in core** | ST.21's explorer search wants the same order; whether it moves to core now or when the explorer needs it |
| **MCP** | the same verbs as tools, over the same modules, once the surface settles |
| **`apply` as one step** | one undo for a whole script, or a step per line; one is proposed, since a script is one intent |
| **card templates** | which settings key carries a markdown card layout, and what it may reference (fields, body, children) |
