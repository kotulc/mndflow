# trace

**Fact tool.** What files a run actually reads and writes.

| | |
|---|---|
| **use case** | paths the code computes, which reading cannot tell (mndsite part 4: `home.md` → `index.mdx`, `images/` per folder, `_history/<version>/`) |
| **reads** | a command run on a sample: the files it reads and writes, in order, and the step (function) doing each |
| **returns** | each file touched: read or write, its path, the step, and the input it came from where that can be told |
| **today** | built 2026-11-15 (apps/ts `trace.ts`, `trace-hook.cjs`): the command runs in the project with a hook preloaded into every Node process it starts (`NODE_OPTIONS=--require`), wrapping `fs` (sync, callback, promises); Node commands only. Touches inside the project only, `node_modules` and hidden folders left out, Node's own module loading left out; each touch once per step |
| **surface** | `mnd fact trace <project> --run "<command>"`; the command's own output goes to stderr. MCP `fact` with `run` |
| **Python** | not files but **calls** (2026-11-19, apps/py `trace.py`, `runner.py`): `--run "<script> args"` in the project's `.venv` — the script only, its Python is the `.venv`'s (`--run "manage.py test hc.api.tests.test_ping --noinput"`), never a path to a Python — each call between the project's own functions in first order, caller to callee with counts; tests, class bodies and module loading left out; `--unit` keeps calls with an end under it, `--depth` gathers ends to that many levels below it, `what` naming the functions each gathered edge calls (2026-11-20). Feeds sequence and flow: `mnd draw sequence <trace.json>`. One meaning per fact name is settled in iteration-plan.md order 2b |
| **feeds** | mapping, edges, data |
| **ties** | a write's `from` is the last read by the same step before it, marked `guess` (same run order). Tried on mndsite's ingest: `docs/about.md` → `pages/about.mdx` by `ingest_page` |
