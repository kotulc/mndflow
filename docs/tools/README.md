# Tools

**What a person or an agent composes models with** (2026-11-09). **A translator lists, the agent picks, `define` writes** (2026-11-19): fact tools list a system's components, parts and relations, each pointed at part of it (`--unit`) at a level of detail (`--depth`); the agent keeps what matters and `define` writes it as the library. Plain CLI tools, as simple as possible: a person uses them as readily as an agent, and nothing in a model or diagram records who made it (2026-11-11). Each tool answers one question. **Fact tools** read source and return JSON. **Diagram tools** draw one diagram from a selection and write it as a diagram file. Whoever uses them decides what is primary, names it, and composes the models. Added to as the mndsite review finds cases.

**Start with `set`** (2026-11-23, sets-plan.md): `mnd set apply` runs the whole pipeline from a brief — facts, the library opened by density, every diagram of a set, the tours — and reports each diagram filled or skipped. The tools below are what it composes; use them directly only for what a set does not draw.

| Tool | Kind | Answers |
|---|---|---|
| set | model | a set's models from a project's facts and a brief, in one command (set.md) |
| entries | fact | how is the system started, and by whom |
| edges | fact | where does the system meet the outside |
| runtimes | fact | where does each part of the code run |
| units | fact | what are the system's units, and what does each contain |
| imports | fact | which units import which, gathered to a level, and what outside each reaches (Python) |
| classes | fact | what classes there are: what each extends, its fields and keys, its methods (Python) |
| define | library | the library written from units, relations and classes picked out of the facts |
| calls | fact | what does a function call, in order, across modules |
| data | fact | what passes along a call, or is read and written |
| workflows | fact | what does CI do, on which trigger |
| schema | fact | what shape is this data |
| trace | fact | what files does a run actually read and write |
| context | diagram | the system, its outside, and the flows between them |
| sequence | diagram | who talks to whom, in what order |
| flow | diagram | a chain of steps with data on its edges |
| dataflow | diagram | where one datum comes from, what changes it, who reads it |
| overview | diagram | the system's parts by containment: the model's tree (was `tree`, 2026-11-15) |
| mapping | diagram | what goes in, where it lands, and by which rule |
| presentation | model | an ordered, narrated way through a model |
| class | diagram | what data definitions there are, their fields and references |
| state | diagram | how one thing changes (2026-11-15) |
| swimlane | diagram | who does what, in which phase (2026-11-15) |
| entity | diagram | how data is stored (2026-11-15) |

**Diagram tools are flavours over a few base views** (2026-11-11). A tool makes one diagram kind: the same base view with its own semantics and annotations. Sequence and swimlane are both the grid read differently; context, flow and dataflow are all layer diagrams.

| Base view | Flavours (tools) |
|---|---|
| layer (parts and lines) | context (merges internal), flow, dataflow; state |
| grid | sequence; swimlane |
| records table | mapping |
| types | class, entity |
| treemap | overview: one tree view for the map, a model and a registry |

**Surface**: CLI first, MCP a thin wrapper over the same commands. **Built 2026-11-15**: every tool, `trace` included.

| Command | Does | Home |
|---|---|---|
| `mnd fact <name> <project> [--unit u] [--from m.fn] [--at m.fn] [--of name] [--depth n] [--run "<command>"]` | one question of a project's source, as JSON, every fact with its source | apps/ts `facts.ts` |
| `mnd fact <name> <python project> [--unit u] [--depth n] [--from m.fn] [--of name] [--run "<script> args"]` | the same for a Python project (found by `pyproject.toml`, `setup.py`, `manage.py` or `requirements.txt` with no `package.json`): units, imports, classes, entries, calls, trace | apps/py `mndpy`, run by cli `python.ts` |
| `--depth` | everywhere: how many levels **below** the target (`--unit`, else each top package) are listed or gathered | apps/py (apps/ts follows in iteration-plan.md 2b) |
| `mnd look <folder>` | every block of the workspace by the hue its look resolves to (its own, its definition chain's or the `overrides`') | cli `main.ts` `looks` |
| `mnd define <picked.json> <folder> [--keep a,b,…] [--force]` | the library from what was picked: `units` (an answer of `units`, pruned or edited) as block files, `relations` or `imports` (`{from, to, name?}` by unit, each end lifted to the nearest unit picked) as dependencies, `classes` as definitions under `types/`; adds new files, keeps those there unless `--force` | cli `define.ts` |
| `mnd draw` reads | **a fact answer or the diagram itself** (2026-11-20): the agent asks the facts, prunes the answer to what the diagram is for, and `draw` writes the diagram from it — sequence and flow from `calls` or `trace`, context from `imports`, class and entity from `classes`, overview from `units`; each part a reference to its unit (`of`), named by its last step. **The library sets the scale** (2026-11-20): drawn into a source folder, each end is lifted to the nearest definition or part the library holds (never a folder), matched by the source unit each block stands for (its `source`, a type's id), so a library rooted lower, moved or renamed still matches, a call's ends to their class or module in a sequence, a context kept to one level; what the library holds nothing of is left out and named. So `trace` and `calls` are asked at full detail and the library decides the grain. Kinds no fact holds (state, swimlane, mapping, dataflow) take the diagram as JSON. Either way it refuses a key its kind does not read, a dotted block name, **a diagram without a description** and **one below the floor** (2026-11-21), warns **past the ceiling** (2026-11-21: more than 8 lines and 1.5 a part, in a context, flow, dataflow or state: too many to follow; draw coarser or keep fewer), makes the output folder | cli `from_facts.ts`, `tools.ts` |
| `mnd draw <kind> <selection.json\|facts.json> [out.yaml] [--name n] [--description d] [--keep a,b,…] [--force]` | a diagram file of any kind, or `overview`, from a fact answer or a selection: a diagram file's map as JSON, read back through the file syntax before it is written; warns below the floor; `--keep` draws only the parts it names (a name or a path, both ends of a line); says what it wrote; never overwrites without `--force` | cli `tools.ts` `diagram_file` |
| `mnd presentation list\|draft\|check <model.yaml>` | a model's presentations; one drafted from a flow or sequence (`--from`, `--as` its name as the model reaches it); what does not resolve | cli `tools.ts`, `main.ts` |
| a package holding models says **what system it models** (2026-11-22) | its `package.json` root block's `description`: what the system is, what it does and for whom; `collect` and `check` note its absence; `presentation draft` opens the top tour with it | core `sources.ts` `collect`; cli `tools.ts` `system_of` |
| `npm run mcp -w @mnd/cli` | the same over MCP, on stdio: `fact`, `draw`, `presentation_list`, `presentation_draft` | cli `mcp.ts` |

**Testing the MCP surface** (kept 2026-11-15 to see how it changes the interface for agents): register it from the repo root with `claude mcp add mnd -- npm run mcp -s -w @mnd/cli`, then compare an agent composing a model through it against the same agent using the CLI.

**Spot check, 2026-11-15** (mndsite composed through the CLI; one flow and one presentation draft through both): the same answers both ways. What differs:

| | MCP | CLI |
|---|---|---|
| writing | returns text; the caller writes | writes the file; refuses to overwrite without `--force` |
| `presentation check` | no tool | works only on a model inside its package |
| paths | `project` from where the server runs, `model` and `from` from apps/cli | the same split |
| `draw`'s selection | an untyped object: its keys learnt from a sample | the same, from a JSON file |
| `presentation draft` | the whole model file back | the same with `--dry`; else written |

Open from it: a `presentation_check` tool, and a check of a draft before it is written; one stated base for every path (or absolute paths, said in the schema); a per-kind selection schema or example in `draw`'s description; a draft returning only its new presentation; `calls` gives no data labels, which a `data` call adds.

Worked examples for the hand-drawn kinds are in docs/tools/examples/, each a selection `draw` writes: state `navigation.json`, swimlane `collect-handoff.json`, entity `workspace-file.json`, mapping `ping-mapping.json`, dataflow `flip-dataflow.json` (the last two from healthchecks, 2026-11-20).

**Highlighting a subset** (2026-11-20): give a definition a look (`settings.style.hue` in its file) and every block typed by it or extending it shows it; to highlight units the library typed as `code.module`, write a definition of your own extending it with the hue, and type them by it; an imported definition is restyled in the workspace's `overrides`. `mnd look <folder>` lists every block by the hue it resolves to, so the highlight is checked without the app.

| Rule | |
|---|---|
| one question per tool | a tool never decides what matters; its user does |
| simple enough to read | the test is that the user understands how to use each tool from its file |
| facts are anchored | every fact carries its source (file, symbol), so `check` can flag drift |
| diagrams are files | a diagram tool writes an editable diagram file; it never overwrites one already edited |
