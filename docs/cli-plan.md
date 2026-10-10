# CLI plan

**The CLI is the one terminal.** The in-app terminal is gone; agents and scripts reach mndflow through `mnd`. This plan records what driving it as an agent found (2026-10-05), the decisions taken, the target surface, and the steps to get there. What the model decides stays design.md; this is about the CLI and the data contract it exposes.


## Goal

**An agent communicates a visual idea to a person.** It writes meaning as data, sees exactly what the person will see, revises, and hands over the same view. **Everything is a text file**: a workspace is JSON, a package is JSON, a block's content is markdown, and soon a card's look is markdown too. The CLI calls no model and judges no aesthetics: the agent supplies intent, mndflow supplies the rules, the layout and the picture.

| An agent needs to | Today |
|---|---|
| **write meaning fast** — many actions a call, by where things sit, never handling ids | no: `run` never writes back, ids only, new ids never reported |
| **read it back cheaply** — a compact tree, one element whole | no: `fold` prints names only |
| **see what the person will see** — the same pixels | partly: an SVG that disagrees with the stage and needs a browser to look at |
| **hand over that view** — the file, opened where the agent looked | no: import picker and navigation by hand |
| **learn the vocabulary** — actions and definitions | no: docs only |
| **trust failure** — refusals that say why, exit codes that mean something | no: `check` exits 0 on faults |

**Everything else is optional**, and deferred until a need shows it.


## Decisions

| | Decided |
|---|---|
| **two hosts** | the web app keeps a session log and imports a file as a checkpoint; the CLI works on the workspace file and writes folded graph state, never a log. Both run the same core actions and door |
| **state** | **the file is the state, written in place.** A writing verb loads the file into an in-memory session, applies, and replaces the file once on success. A refusal writes nothing, so rollback is free and core needs no transaction |
| **output** | **one JSON result on stdout for every verb.** `show --text` is the one human-shaped exception, kept because an indented tree is also the cheapest read for an agent |
| **references** | **one string form**: an id, or a path `a::b::c`, plus `$key` inside a batch. Ids are minted and returned, never chosen. An ambiguous path is refused with its candidates |
| **batches** | one verb, `do`, takes one action or a JSONL script. A script is one intent: all or nothing, one step |
| **repairs** | **one rule with the app**: the door repairs what it can and the result lists every repair. No `--repair` mode |
| **rendering** | **one renderer: the stage.** `draw` mounts the kit's `Viewer` in a headless browser and screenshots it, so the picture matches the app by construction. views' `svg.ts` stays as it is and is not grown to parity |
| **perspective** | **the Viewer's own props**, given as flags: layer, view, fields, focus, chrome. No sidecar file until multi-view handoff needs one |
| **the text drawing** | dropped from the CLI. views keeps `draw` and `outline`, which its shape tests use |
| **edge labels** | unchanged: `label_of` (core `names.ts`) draws an edge's own name, else its definition's name, and nothing for an unnamed base `line` or `tie`. Simple edges use base `line`; a custom relation definition labels every edge it types, so a map reaches for one only when that label is wanted |
| **markdown** | content is text passed through untouched: any value may come from a file. A card's markdown source is read by the `markdown` and `attach` actions; how a card draws is `card.shows`, `card.size` and `layout.face`, written with `look` (cards-plan.md) |


## The action surface

**The registry was shaped for gestures, menus and the terminal; it is now an agent's API.** The model holds: every action is sayable, returns mutations, refuses in words, and navigation writes nothing. **No new actions are needed** — mapping this repo used only `create`, `relate`, `describe`, `source` and `layout` — and geometry stays unsayable by design: an agent states meaning and lets layout place it.

**What the terminal leaves behind**

| | Now |
|---|---|
| `about` | help text, read by `help` and the menus. No longer scored against anything |
| `asks` | the menus' hint for what to prompt. Not part of the agent contract |
| `on` (scope), `offer()`, `when` | what a menu offers for a pick. `do` never consults them: it runs what it is told and `check` refuses. `when` must never hold a rule `check` lacks (today only `interface` has one, and its `check` repeats it) |
| ranking, fuzzy verbs, the command words | gone with the terminal |

**One rule made explicit: context is only a default.** The pick, the picked cells and the open layer may fill an argument a gesture left unsaid, but **every action takes everything it needs as arguments**. This holds today — each read of `ctx.picked`, `ctx.cells` and `ctx.layer` in core `actions/` falls back from a named argument — and becomes a rule so it keeps holding.

**What changes: the arguments say what they are, the same way everywhere.** The code has drifted from actions.md, which is the goal; the code converges on it.

| # | Today | Becomes | Why |
|---|---|---|---|
| A1 | `form: "block"` covers blocks, relationships and lists; definition arguments (`type`, `extends`) are plain text taking an id | `ref` names what is referred to — `block`, `edge`, `def`, or `element` for either — and `many` marks a list | the CLI resolves names and paths from the declaration, never from an argument's name (G3) |
| A2 | `group` takes `members`; the grid actions take `group`; `define` takes `extends` and `domain` | `ids`, `grid`, `type`, as actions.md says | one name per role: `id` for one target, `ids` for several, `type` for a definition, `grid` for a lattice |
| A3 | `at` is a cell `"r,c"` (`create`, `move`, `refer`, `label`, `merge`), a line index (`insert`, `remove`), a fraction along a wall (`interface`) and a map of positions (`layout`) | `cell` for an address, `line` for an index; `at` stays only the wall fraction, as on a block | one word, one meaning |
| A4 | `tags`, `traits`, `choices` are text the action splits | JSON lists, declared `many` | no hidden comma syntax |
| A5 | `spot` and `layout`'s positions are arguments like any other | declared positional: a gesture's, listed apart by `help` | an agent never needs a coordinate to say what it means |

**Where:** core `actions/registry.ts` (`Arg`), every declaration in core `actions/`, their readers in the explorer's menu and the stage, and actions.md where it already says the goal. Lands in step 2, before `do`, so the CLI is built on the final names.


## The surface

```
mnd <verb> <file> [args]
```

| Verb | Writes | Does | Replaces |
|---|---|---|---|
| `new <file>` | yes | an empty workspace; refuses an existing file | copying `blank` |
| `do <file> <action> [k=v…]` | yes | one registry action | `run` |
| `do <file> <script.jsonl \| ->` | yes | many, from a file or stdin: one step, all or nothing | — |
| `show <file> [ref] [--depth n] [--text]` | no | the tree from `ref` (the workspace if unsaid), or one element whole. Definitions and packages are blocks, so they are in it | `fold`, `outline` |
| `find <file> <text>` | no | matches in one order — name, then type, then body — each with its path and what matched | — |
| `check <file>` | no | the door's faults and the definitions' notes, each naming its element. Exit 1 on faults | `check`, `review` |
| `help [action]` | no | every action, or one: what it does, its scope, its arguments with form, required and choices — read off the registry | reading actions.md |
| `draw <file> [ref] [flags] -o <x.png>` | no | the stage's picture of a perspective; `--open` hands the same view to the person's browser | `project` |
| `bring <file> <name \| path \| url>` | yes | a package from the catalogue, a local file or a URL, frozen, through the door | `search` |
| `export <file> [-o out] [--package <name> \| --sysml [--round]]` | no | the file folded clean, a package of its own, or SysML | `export`, `translate` |

**Nine verbs.** Writing verbs take `--dry` to run the same path without writing.

### References

| Form | Example | Resolves |
|---|---|---|
| id | `block_pump` | exactly; blocks and relationships share one id space |
| path | `mndflow::Loop::Pump` | names from the workspace root down, `::` between steps (names may hold `/` and `.`; `::` is SysML's own qualifier). The leading tree may be left off when unambiguous |
| path through a usage | `mndflow::Loop::Pump::inlet` | continues into the usage's definition parts — a read-through part, with no second form |
| key | `$pump` | inside a script, what an earlier line bound with `as` |

Resolution is id, then path. A path matching more than one element is refused with every candidate's `{ id, path, kind }`. A relationship has no path: it is reached by id, or by its name where that is unique.

### Values

| Syntax | Means | Example |
|---|---|---|
| `k=v` | text, always | `name=2024` stays text |
| `k:=json` | JSON: number, flag, list, object | `ids:='["$pump","$valve"]'`, `at:=0.5` |
| `k=@path` | the text of a file | `body=@cards/pump.md` |

The httpie conventions, so they need no teaching. A script line is already JSON, and `{ "file": "…" }` reads a file relative to the script:

```json
{"action":"create","as":"pump","name":"Pump","parent":"mndflow"}
{"action":"create","as":"valve","name":"Valve","parent":"mndflow"}
{"action":"relate","from":"$pump","to":"$valve","dir":"forward"}
{"action":"describe","id":"$pump","body":{"file":"cards/pump.md"}}
```

- Each line resolves against the graph the lines before it left.
- An action that needs a layer or a pick takes it as `layer` / `picked` on its line, never from state a previous line left.
- Navigation (`open`, `reveal`) writes nothing and is refused by `do`; where to look is `draw`'s.
- Removal is always an explicit action; omission never deletes.
- **Writing the whole file stays first-class.** A translator producing a whole graph at once writes the workspace JSON and runs `check`; the door is the same either way.

### Result

```json
{
  "ok": true,
  "hash": "bb201ec4",
  "data": {
    "made": [{ "id": "block_x", "kind": "block", "name": "Pump", "path": "mndflow::Pump", "key": "pump" }],
    "changed": ["block_loop"],
    "removed": []
  },
  "faults": []
}
```

- `hash` is core's `hash(graph)` after the verb.
- `data` is the verb's shape: `made` / `changed` / `removed` for `do` and `bring`, read off the graph before and after; the element or tree for `show`; matches for `find`; actions for `help`; the files written for `draw` and `export`.
- `faults` lists the door's repairs and faults and the definitions' notes, each `{ kind, what, id? }`.
- A refusal is `ok: false` with `error: { what, line?, candidates? }`. stderr carries only unexpected crashes.
- Logs, steps and mutations never appear: they are internal and the file does not keep them.

| Exit | Means |
|---|---|
| 0 | done, or clean |
| 1 | refused, or faults found |
| 2 | usage: no such verb, a missing argument, an unreadable file |


## Drawing

**The picture an agent inspects is the picture the person sees.** One renderer, so nothing drifts.

| Flag | Viewer prop | |
|---|---|---|
| `[ref]` | `layer` | the layer to draw; the workspace's domain unless said |
| `--view internal \| overhead \| profile` | `config.look` | the canvas views that already exist; `internal` unless said |
| `--fields` | `fields` | the layer drawn as its fields' class diagram |
| `--focus <ref>` | `focus` | brought to the middle of a scrolled layer |
| `--no-frame`, `--no-lattice`, `--legend` | `chrome` | the canvas's chrome |
| `--size 1600x900` | — | the viewport, so a picture is reproducible |

- **How:** a small page mounts the kit `Viewer` with the graph and props injected before load. It is built once into the CLI's `dist/`; Playwright serves it through request routing, so no server runs, and screenshots it once the layout settles. PNG only: it is what an agent reads and a person can be sent.
- **`--open`** launches a headed browser on the web app with the file handed in and the same view open. The app gains one binding: a handed-off file loaded through `session.load` at mount, then the view applied — the same calls an import and a click make.
- **The browser** is Playwright on an installed Edge or Chrome (`channel`), so no browser download in the common case; `draw` says so plainly when neither is found.


## The data contract

| File | Written by | Checked by | Brought in by |
|---|---|---|---|
| workspace `.json` | `new`, `do`, `bring`, `export`, or by hand | `check` | every verb takes it |
| package `.json` | `export --package`, or by hand | `check` (a package file is a file) | `bring` |
| markdown `.md` | by hand | — (text) | `body=@x.md`, `{ "file": "x.md" }` |
| card look (coming) | by hand | the door drops what its component rejects | `look … value=@x.md` |
| JSONL script | an agent | `do --dry` | `do` |
| PNG | `draw` | the agent's eye | handed to the person |

### Markdown readiness

**What full markdown cards need from the CLI, so nothing here changes when they land.**

| Need | Met by |
|---|---|
| an agent writes a card's content | `body=@file.md`, on any block |
| an agent writes a card whole | `attach body=@file.md source=…`: frontmatter for identity and values, then the body |
| an agent says what a card shows | `card.shows` and `card.size` on its definition, written with `look` — **settings, not a new field** (schema.md: settings is the one place the schema grows) |
| an agent restyles to taste across a workspace | definitions carry the look and usages follow: `show` a definition, `look` it once, `draw` to see |
| a style is shared | `export --package`, then `bring` it elsewhere |
| content round-trips byte-stable | `show` returns `body` raw; `export` never rewrites it |


## Ownership

**The CLI adds no rules.** It parses, resolves, calls core, prints and draws. Anything a rule needs lands where the app gets it too.

| Concern | Home |
|---|---|
| which action arguments are references, and which take lists | core `actions/registry.ts`: a `ref` and `many` on `Arg` |
| path resolution and candidates | core, beside `path` in `tree.ts`, so the explorer and mndmap can use it |
| element ids on faults | core `door.ts` |
| search order, once the explorer needs it (ST.21) | core; the CLI's `find` moves there then |
| the drawing | the kit `Viewer`, unchanged |
| parsing, file values, writing in place, the result, the browser | cli |

| CLI file | One purpose |
|---|---|
| `main.ts` | the verb table: parse, dispatch, print, exit |
| `args.ts` | `k=v`, `k:=json`, `k=@file`, flags |
| `refs.ts` | turn reference strings into ids through core's resolver, `$key`s through the script's bindings |
| `state.ts` | load the file, hand back a session, replace the file once |
| `read.ts` | `show`, `find` |
| `draw.ts` | the browser, the page, the screenshot, `--open` |
| `frame/` | the page mounting the `Viewer` |
| `sysml.ts`, `ports.ts` | as now, fixed |


## Findings

**What driving it found.** A map of this repo (11 packages, 117 modules, 352 import relations) written straight as a workspace file passed `check` clean, imported in the browser, and drew well at the package layer. Built through the CLI it was impossible.

| # | Gap | Answered by |
|---|---|---|
| G1 | `run` folds, applies, prints and discards | `do` writes in place |
| G2 | `run` never says what it made | `made` in the result |
| G3 | block arguments take ids only; `type` takes a definition id, never a name | references, and `ref` on `Arg` |
| G4 | no read of one element; `fold` omits ids and relations | `show` |
| G5 | no listing of actions | `help` |
| G6 | no lists, JSON or file text in arguments | values |
| G7 | `search` neither writes back nor takes a local file | `bring` |
| G8 | the SVG disagrees with the stage and needs a browser to see | `draw` |
| G9 | about 2.3s a call through vite-node | scripts, then a bundle |
| G10 | a file reaches the browser only through the import picker | `draw --open` |

| # | Bug | Where |
|---|---|---|
| B1 | `check` / `review` exit 0 on faults, and on a file that is not JSON | cli `main.ts` |
| B2 | number-like text becomes a number (`name=2024`); a list arrives as one string | cli `main.ts` `pairs` |
| B3 | a duplicate layer name silently takes the first; `--how` without a layer is ignored | cli `main.ts` `find_layer` |
| B4 | an unknown parent is refused as `"missing" holds nothing of that sort` | core `actions/` refusals through `shown_name` |
| B5 | no door fault names its element | core `door.ts` |
| B6 | one unknown definition refuses the file and hides every other fault. Refusing is right; reporting one is not | core `door.ts` |
| B7 | SysML ends are written as bare names and resolved to the first match: `--round` on the repo map loses 66 of 490 relations | cli `sysml.ts` `end_of`, `find` |
| B8 | SysML read-back stores the escaped `name`, not `label` | cli `sysml.ts` `from_sysml` |
| B9 | `Said.kind` existed for the terminal's mute; nothing reads it | core `session.ts` |
| B10 | `@mnd/defs` mis-indented | cli `package.json` |
| B11 | the `vitest` skill still describes localStorage and the terminal | the skill |
| B12 | a fixture name shadows a file of the same name | cli sources: a `fixture:` prefix |


## Steps

**Each step leaves the CLI usable and is driven by hand before the next.** No new tests while the surface moves; once it settles, focused tests pin its properties — refs, all-or-nothing scripts, write-in-place — never wording, coordinates or minted ids. views' shape tests stay.

### 1 — Fix what is broken

| Task | Where |
|---|---|
| exit codes (B1); `fixture:` sources (B12); the indent (B10) | cli |
| an unknown id reads as itself in refusals (B4) | core `actions/` |
| SysML ends as qualified paths, resolved by path; `label` stored (B7, B8) | cli `sysml.ts` |
| drop `Said.kind` (B9) | core `session.ts` and its readers |

**Done when** `export --sysml --round` on the repo map brings back all 490, and `check` on a broken file exits 1.

### 2 — Write

| Task | Where |
|---|---|
| the action surface: `ref` and `many` on `Arg`, one name per role, `at` split, lists as lists, positional arguments declared (A1–A5) | core `actions/`, the menu and stage callers |
| path resolution with candidates | core |
| `state.ts`, `args.ts`, `refs.ts`; the result and exit codes | cli |
| `new`; `do` for one action and for a script, inside `session.batch`, written once on success | cli |

**Done when** `new`, then one script making three blocks, relating two by `$key` and describing one from a `.md` file, leaves a file that `check`s clean; and a script whose last line is refused leaves the file byte-for-byte unchanged.

### 3 — Read

| Task | Where |
|---|---|
| `show`: tree or element, `--depth`, `--text` | cli `read.ts` |
| `find` | cli `read.ts` |
| `help` from `all()` and each `Arg` | cli |

**Done when** an agent with no docs lists the actions, finds `Pump`, reads it whole and relates it.

### 4 — See and hand over

| Task | Where |
|---|---|
| `frame/`: a page mounting the `Viewer` from injected props, built into `dist/` | cli |
| `draw`: Playwright on an installed browser, routed page, settle, screenshot | cli `draw.ts` |
| `--open`: the web app loads a handed-off file and view at mount | cli, web `App.tsx` |
| remove `project` and `outline` from the CLI | cli |

**Done when** the repo map's package layer and `core` layer come back as PNGs matching the app, and `--open` shows the same view in a browser with no picker.

### 5 — Packages and faults

| Task | Where |
|---|---|
| `bring` from the catalogue, a path or a URL (through `net`) | cli |
| `export --package` through `session.save_package`, `files` bound to `fs` | cli, `ports.ts` |
| `Fault` carries `id?`; every door fault sets it (B5); every unknown definition and independent fault reported (B6) | core `door.ts`, `types.ts` |
| `review` folded into `check` as notes | cli |

**Done when** a package written by hand is `check`ed, `bring`ed, used as a `type`, and exported back out byte-stable; and `check` on a file with an orphan, a dangling edge and two unknown types names all four.

### 6 — Speed and documents

| Task | Where |
|---|---|
| bundle `mnd` with tsup, as the kit is; `bin` points at the bundle | cli `package.json`, `tsup.config.ts` |
| rewrite the CLI README around the surface and the data contract | `apps/cli/README.md` |
| close the agent-surface question in design.md; ST.25 in stories.md | `docs/` |
| refresh the `vitest` skill (B11) | the skill |

**Done when** a call returns in well under a second.

### Acceptance

**This repo, communicated through the CLI alone:**

1. `new`, then one generated script: tiers as groups, packages holding modules grouped by subsystem, imports as base `line` relations, doc comments as bodies, paths as `source`.
2. `check` with no faults.
3. `draw` the package layer and one package's internals; look at the PNGs, find what reads badly, revise the structure, draw again.
4. `draw --open` hands the person the view the agent settled on.

**Not that the CLI made a picture**: that an agent made a substantial system understandable without ids in hand, browser-only editing, hidden state or hand-placed geometry.


## Deferred

**Named so nothing is built against them by accident.** Each waits for a need the steps above show.

| | Waits for |
|---|---|
| **a presentation file** | handing over several views as one story. Until then a view is `draw`'s flags |
| **Scene artifacts and visual diagnostics** | a measure (crossings, density, label collisions) stable enough to promise; the PNG answers for now |
| **JSON Schemas** | an agent that needs to validate before `check`; `check` is the authority |
| **a component manifest** | `help` listing settings keys and values, from one declarative contract beside each validator. Wanted when markdown card settings land |
| **concurrency guards** | two writers on one file |
| **MCP** | the same verbs as tools, over the same modules, once the surface settles |


## Open

| Question | |
|---|---|
| **`define` and ids** | actions.md gives `define` an `id?` "passed in by a caller that must know it"; the code takes none, and this plan says ids are never chosen. Which caller needs one — if none, it leaves actions.md |
| **sibling names** | the docs say unique among siblings; actions allow duplicates. Paths stay safe either way — ambiguity is refused — but the model should settle it |
| **source fetch** | `bring` takes a package from a URL; ST.5 still needs a translator for an arbitrary fetched file to become blocks |
