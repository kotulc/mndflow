# calls

**Fact tool.** What a function calls, in order, across modules.

| | |
|---|---|
| **use case** | the steps of a flow from a chosen start (mndsite: `cmd_build` → `load_config` → `write_site_config` → `ingest.run` → `spawnSync`) |
| **reads** | calls between project functions, in source order; spawned processes as a call out |
| **returns** | the chain from a function: each step a function and its module, nested to a depth |
| **today** | apps/ts `read.ts` (`Mod.calls`, `Flow`); per module, not from a chosen start |
| **surface** | `mnd fact calls <source> --from <module.function> [--depth <n>]` |
| **feeds** | flow, entries (what an entry reaches) |
| **open** | calls through a framework (next build runs the site half) |
