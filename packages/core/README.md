# @mnd/core

**The engine.** The graph, the log, the door, the file, the closed action set and the ports. No React, no DOM, no `window`, and no dependency on any other package.

| | |
|---|---|
| **Entry** | `src/index.ts` — everything public is exported here, and nothing imports a deep path |
| **Depends on** | nothing. It may not even reach `defs`, which supplies its floor — an app hands the base definitions in, the same way it hands in a port |
| **Proven by** | fold determinism, undo-by-refold, the door's repairs, file round-trip, byte-identical re-export, compaction |

## Where it sits

```
web · cli · kit
└─ every other package
   └─ core   ◀ nothing below it
```

## Running it

```sh
npx vitest run packages/core       # its suite, from the repo root
npm run typecheck -w @mnd/core
```

## What is in here

| | Is |
|---|---|
| `types.ts` | every shared shape, and **the only place a closed set may be named** |
| `fold.ts` | mutation replay, and the derived readings of a graph — `children`, `path`, `module_of`, `shown_name` |
| `door.ts` | the one way a log comes in. Repairs what it can, drops what it cannot, and writes the repair as a step |
| `rules.ts` | what the definitions asked for, and the door does not check. `review` advises; it never repairs |
| `actions.ts` | the registry: name, sentence, scope, arguments, `check`, `run` — plus the four adjustments |
| `infer.ts` | a selection becomes one behavior block. The four order tiers, and the gate on what writes home |
| `session.ts` | hold the log, fold it, run an action, append what it wrote |
| `file.ts` | the export envelope, its canonical layout, and compaction. **Two readers**: `read` gives the log a session works in, `open` gives the graph and is the one offered outward |
| `ports.ts` | the host contract, declared and never implemented |
| `ids.ts` | id minting |

## What stays inside

**The log, the steps, the mutations, the session and the action registry are internal.** A log is a history of intent replayed against one engine; a graph is a statement of fact. Everything here is public *to the repo* — what leaves it is named one by one in `kit`.

> **A signature naming `Log`, `Step` or `Mutation` is internal. Graph to graph is the seam.**

## The detail

`docs/` holds the goal state for the parts too large to state here — `schema.md`, `actions.md` and `behaviors.md` — plus `model.md`, `engine.md`, `ports.md` and `workspace.md`.
