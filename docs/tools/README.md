# Tools

**What a person or an agent composes models with** (2026-11-09). Plain CLI tools, as simple as possible: a person uses them as readily as an agent, and nothing in a model or diagram records who made it (2026-11-11). Each tool answers one question. **Fact tools** read source and return JSON. **Diagram tools** draw one diagram from a selection and write it as a diagram file. Whoever uses them decides what is primary, names it, and composes the models. Added to as the mndsite review finds cases.

| Tool | Kind | Answers |
|---|---|---|
| entries | fact | how is the system started, and by whom |
| edges | fact | where does the system meet the outside |
| runtimes | fact | where does each part of the code run |
| units | fact | what are the system's units, and what does each contain |
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
| `mnd draw <kind> <selection.json> [out.yaml] [--force]` | a diagram file of any kind, or `overview`, from a selection: a diagram file's map as JSON, read back through the file syntax before it is written; warns below the floor; never overwrites without `--force` | cli `tools.ts` `diagram_file` |
| `mnd presentation list\|draft\|check <model.yaml>` | a model's presentations; one drafted from a flow or sequence (`--from`, `--as` its name as the model reaches it); what does not resolve | cli `tools.ts`, `main.ts` |
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

Worked examples for the hand-drawn kinds are in docs/tools/examples/, each a selection `draw` writes.

| Rule | |
|---|---|
| one question per tool | a tool never decides what matters; its user does |
| simple enough to read | the test is that the user understands how to use each tool from its file |
| facts are anchored | every fact carries its source (file, symbol), so `check` can flag drift |
| diagrams are files | a diagram tool writes an editable diagram file; it never overwrites one already edited |
