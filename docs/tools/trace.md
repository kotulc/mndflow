# trace

**Fact tool.** What files a run actually reads and writes.

| | |
|---|---|
| **use case** | paths the code computes, which reading cannot tell (mndsite part 4: `home.md` → `index.mdx`, `images/` per folder, `_history/<version>/`) |
| **reads** | a command run on a sample: the files it reads and writes, in order, and the step (function) doing each |
| **returns** | each file touched: read or write, its path, the step, and the input it came from where that can be told |
| **today** | built 2026-11-15 (apps/ts `trace.ts`, `trace-hook.cjs`): the command runs in the project with a hook preloaded into every Node process it starts (`NODE_OPTIONS=--require`), wrapping `fs` (sync, callback, promises); Node commands only. Touches inside the project only, `node_modules` and hidden folders left out, Node's own module loading left out; each touch once per step |
| **surface** | `mnd fact trace <project> --run "<command>"`; the command's own output goes to stderr. MCP `fact` with `run` |
| **feeds** | mapping, edges, data |
| **ties** | a write's `from` is the last read by the same step before it, marked `guess` (same run order). Tried on mndsite's ingest: `docs/about.md` → `pages/about.mdx` by `ingest_page` |
