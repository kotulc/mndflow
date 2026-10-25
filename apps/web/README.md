# apps/web

**The product, assembled.** It binds the ports, holds the one log, and passes derived data down.

| | |
|---|---|
| **Entry** | `src/main.tsx` → `src/App.tsx` |
| **Binds** | `storage` to IndexedDB, each body stored once by hash and read before the app mounts; `files` to a download and a picker; `net` to `fetch` — in `src/ports.ts`, the only file in the app that knows a browser is what it is running in. |

## Where it sits

```
web   ◀
└─ explorer · stage · options · tray
   └─ views
      └─ core · defs · theme
```

## Opening

**A fresh browser opens a sample.** Before mounting, `main.tsx` reads `mndflow.yaml` at the repo root (served by `vite.config.ts`'s `repo_files`, with anything under `samples/`) through core's `boot_of`.

| Key | Says |
|---|---|
| `workspace` | the file opened while storage is empty. An existing log always wins; reset still starts empty |
| `catalogue` | where the packages catalogue is listed |
| `theme` · `tray` · `display` | the chrome's defaults; a theme chosen in the browser wins |
| `view` | a system view to land on; a layer view is the home's |

The app reads the file and never writes it; it is not a graph. A key or value it does not read is said once on the stage, and the app still opens.

## Running it

```sh
npm run dev -w @mnd/web              # http://localhost:5173
npm run build -w @mnd/web
npx vitest run                       # every suite in the workspace, from the repo root
```

## The loop

```
bind ports  ->  hold the log  ->  fold  ->  project  ->  render
                     ^                                      |
                     +-------------- action ----------------+
```

**Every gesture returns an action name, which the app runs, which returns mutations, which it appends.** That loop is the whole app.

**If this app turns out to be interesting, a seam is in the wrong place.** It adds no behaviour, holds no rule, and keeps no second copy of anything.

## What it owns, and it is a short list

- **The session** — opened lazily and once. `useRef(session(...))` evaluates its argument on every render, so the ref keeps the first while each of the others still reads storage and could write to it.
- **Display state** — which tray tab is open, what the tray holds, what the rail draws, whether the frame, guides and interfaces show. It never enters the log.
- **One gesture, one step.** A canvas adjustment arrives from the stage as a list of writes, and the app runs it inside `session.batch`.
- **The theme**, and the header's undo, redo, import and export, which reach a **port** rather than the graph.
