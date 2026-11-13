# edges

**Fact tool.** Where the system meets the outside.

| | |
|---|---|
| **use case** | finding the external blocks of a context diagram, and which part each flow crosses at |
| **reads** | built-in imports (`fs`, `child_process`, `http`), the calls that read, write or spawn, environment variables read and set (`process.env`), framework config files, runtime dependencies |
| **returns** | each edge: the part, the outside it reaches (file system, a process, the network, a framework), what it reads or writes, its source |
| **today** | apps/ts `read.ts` (`Mod.touches`, `files`, `RUNS`) |
| **surface** | `mnd fact edges <source> [--unit <name>]` |
| **feeds** | context (externals and flows) |
| **open** | grouping many paths into one external (`pages/`, `public/` → the generated files) |
