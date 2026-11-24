# entries

**Fact tool.** How the system is started, and by whom.

| | |
|---|---|
| **use case** | listing a model's ways in; folding entries that run slices of one chain into one flow (mndsite: 9 entries, one build flow) |
| **reads** | `package.json` `bin` and `scripts`, a Dockerfile's `ENTRYPOINT`/`CMD`, a framework's own files (`_app`, `theme.config`), workflow `run:` lines, event triggers (`fs.watch`, listeners, routes) |
| **returns** | each entry: its name as run (`npm run ingest`), what starts it (a person, CI, Docker, a framework, an event), the module and function it reaches |
| **today** | apps/ts `read.ts` (`Mod.entered`, `CONVENTIONS`); workflows not read. **Python, generic** (2026-11-23: no framework readers): *script* (pyproject), *main* (`__main__`), *process* (a command line, exec form too, in a shell script, Dockerfile, Procfile or compose file naming an own module as `module:attr` or after `-m`, or an own script's subcommand an own module is named for: `manage.py sendalerts`), *registered* (an own callable passed to an outside call at module level, read through an outside wrapper such as `csrf_exempt(views.ping)`, named by the call's literal; an own module mounted by string, or a list of the module's, takes the mount's literal as prefix), *decorated* (an own module-level function wrapped by an outside decorator). *main* runs the first own function its block calls. Each says `runs`, `ways` (how many routes, processes or scripts run it; a decorator is none), `reach` and `touches` (apps/py `entries.py`) |
| **surface** | `mnd fact entries <source>` |
| **feeds** | context (actors), flow (where a flow starts) |
| **open** | how an entry's caller is named (author, CI) when nothing declares it |
