# trace

**Fact tool.** What files a run actually reads and writes.

| | |
|---|---|
| **use case** | paths the code computes, which reading cannot tell (mndsite part 4: `home.md` → `index.mdx`, `images/` per folder, `_history/<version>/`) |
| **reads** | a command run on a sample: the files it reads and writes, in order, and the step (function) doing each |
| **returns** | each file touched: read or write, its path, the step, and the input it came from where that can be told |
| **today** | not built |
| **surface** | `mnd fact trace <source> -- <command>` |
| **feeds** | mapping, edges, data |
| **open** | how a write is tied to the input it came from (same run order, same name) |
