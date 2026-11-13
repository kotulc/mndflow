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
| tree | diagram | the system's parts by containment |
| mapping | diagram | what goes in, where it lands, and by which rule |
| presentation | model | an ordered, narrated way through a model |
| class | diagram | what data definitions there are, their fields and references |

**Diagram tools are flavours over a few base views** (2026-11-11). A tool makes one diagram kind: the same base view with its own semantics and annotations. Sequence and swimlane are both the grid read differently; context, flow and dataflow are all layer diagrams.

| Base view | Flavours (tools) |
|---|---|
| layer (parts and lines) | context, flow, dataflow; state, internal |
| grid | sequence; swimlane; mapping |
| types | class, entity |
| treemap | tree |

**Surface**: CLI first, MCP a thin wrapper over the same commands. The command shapes in each file are proposed until built.

| Rule | |
|---|---|
| one question per tool | a tool never decides what matters; its user does |
| simple enough to read | the test is that the user understands how to use each tool from its file |
| facts are anchored | every fact carries its source (file, symbol), so `check` can flag drift |
| diagrams are files | a diagram tool writes an editable diagram file; it never overwrites one already edited |
