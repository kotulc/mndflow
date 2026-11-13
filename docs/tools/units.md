# units

**Fact tool.** The system's units and what each contains.

| | |
|---|---|
| **use case** | the containment tree of an overview: directories, modules, their exported functions and values |
| **reads** | directories, modules, declarations, imports between units |
| **returns** | a tree of units, each with its parts, size, description (its header) and what it imports |
| **today** | apps/ts `read.ts` (`Pkg`, `Mod`, `Part`), `structure.ts` (grouping by the graph) |
| **surface** | `mnd fact units <source> [--depth <n>]` |
| **feeds** | tree |
| **open** | whether `structure.ts`'s grouping stays a tool option or becomes the agent's job |
