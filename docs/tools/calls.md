# calls

**Fact tool.** What a function calls, in order, across modules.

| | |
|---|---|
| **use case** | the steps of a flow from a chosen start (mndsite: `cmd_build` → `load_config` → `write_site_config` → `ingest.run` → `spawnSync`) |
| **reads** | calls between project functions, in source order; spawned processes as a call out |
| **returns** | the chain from a function: each step a function and its module, nested to a depth |
| **today** | apps/ts `read.ts` (`Mod.calls`, `Flow`); per module, not from a chosen start. Python: apps/py `calls.py`, through each module's imports; an own function handed to a call by name (`submit(notify, flip)`) counted as called; a method called on a value (`check.ping()`) by its name where exactly one own class defines it (never a name the language's own values have, as `d.get`), or the value is named after one that does or for one alone (`channel.notify()`, `ch.notify()`) (2026-11-23) |
| **surface** | `mnd fact calls <source> --from <module.function> [--depth <n>]` |
| **feeds** | flow, entries (what an entry reaches) |
| **open** | calls through a framework (next build runs the site half) |
