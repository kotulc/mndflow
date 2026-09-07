# apps/web

**The product, assembled.** It binds the ports, holds the one log, and passes derived data down.

| | |
|---|---|
| **Entry** | `src/main.tsx` → `src/App.tsx` |
| **Binds** | `storage` to `localStorage`, and `files` to a download and a picker — in `src/ports.ts`, the only file in the app that knows a browser is what it is running in |

## Where it sits

```
web   ◀
└─ explorer · stage · options · tray · terminal
   └─ render
      └─ views
         └─ layout
            └─ core · defs · theme
```

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
- **Which view is showing**, read from the view definitions the graph already holds. Display state: it never enters the log.
- **The theme**, and the header's undo, redo, import and export, which reach a **port** rather than the graph.
