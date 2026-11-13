# runtimes

**Fact tool.** Where each part of the code runs.

| | |
|---|---|
| **use case** | the first split of a system: mndsite's build (Node) and site (browser) halves |
| **reads** | imports of Node built-ins, browser and framework APIs, JSX, framework files |
| **returns** | each unit: `node`, `browser`, or both |
| **today** | apps/ts `read.ts` (`Mod.runs`) |
| **surface** | `mnd fact runtimes <source>` |
| **feeds** | context, tree (the top split) |
| **open** | code that runs in both (shared helpers) |
