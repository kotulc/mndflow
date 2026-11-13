# workflows

**Fact tool.** What CI does, on which trigger.

| | |
|---|---|
| **use case** | the release flow in an overview (mndsite: push main → build, deploy, publish; tag → publish) |
| **reads** | `.github/workflows/*.yml`: `on`, `jobs`, `needs`, `uses`, `run:` |
| **returns** | each workflow: its triggers, its jobs in order, what each runs or uses, and where it publishes |
| **today** | not built |
| **surface** | `mnd fact workflows <source>` |
| **feeds** | flow, context (CI as an actor, registries and hosts as externals) |
| **open** | other CI systems |
