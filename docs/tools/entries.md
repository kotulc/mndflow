# entries

**Fact tool.** How the system is started, and by whom.

| | |
|---|---|
| **use case** | listing a model's ways in; folding entries that run slices of one chain into one flow (mndsite: 9 entries, one build flow) |
| **reads** | `package.json` `bin` and `scripts`, a Dockerfile's `ENTRYPOINT`/`CMD`, a framework's own files (`_app`, `theme.config`), workflow `run:` lines, event triggers (`fs.watch`, listeners, routes) |
| **returns** | each entry: its name as run (`npm run ingest`), what starts it (a person, CI, Docker, a framework, an event), the module and function it reaches |
| **today** | apps/ts `read.ts` (`Mod.entered`, `CONVENTIONS`); workflows not read |
| **surface** | `mnd fact entries <source>` |
| **feeds** | context (actors), flow (where a flow starts) |
| **open** | how an entry's caller is named (author, CI) when nothing declares it |
