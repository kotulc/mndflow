# imports

**Fact tool.** Which units import which, gathered to a level, and what outside each reaches.

| | |
|---|---|
| **use case** | the dependencies between a system's components (context, tree); the outside packages a component leans on (context's externals) |
| **reads** | every import of the targeted modules, through the import graph |
| **returns** | `imports`: `{from, to, n, source}` each end gathered to `--depth` levels under `--unit`, `n` the module imports it gathers, heaviest first; `outside`: each package the project depends on and the units importing it; `stdlib`: the standard library modules imported, by name only (2026-11-20) |
| **today** | apps/py `imports.py`, on `grimp`; TypeScript lists imports per module inside `units` |
| **surface** | `mnd fact imports <project> [--unit <dotted>] [--depth <n>]` (depth 1 by default) |
| **feeds** | `define`'s `relations`, context, tree |
| **open** | whether TypeScript gets the same tool, out of `units` |
