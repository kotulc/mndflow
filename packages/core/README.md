# @mnd/core

**The engine.** The graph, the log, the door, the file, the closed action set and the ports. No React, no DOM, no `window`, and no dependency on any other package.

| | |
|---|---|
| **Entry** | `src/index.ts` — everything public is exported here, and nothing imports a deep path |
| **Depends on** | nothing. It may not even reach `defs`, which supplies its floor — an app hands the base definitions in, the same way it hands in a port |
| **Proven by** | fold determinism, undo-by-refold, the door's repairs, file round-trip, byte-identical re-export, compaction |

```
npm test -w @mnd/core
```

## What is in here

| | Is |
|---|---|
| `types.ts` | every shared shape, and **the only place a closed set may be named** |
| `fold.ts` | mutation replay, and the derived readings of a graph — `children`, `path`, `module_of`, `shown_name` |
| `door.ts` | the one way a log comes in. Repairs what it can, drops what it cannot, and writes the repair as a step |
| `actions.ts` | the registry: name, sentence, scope, arguments, `check`, `run` — plus the four adjustments |
| `infer.ts` | a selection becomes one behavior block. The four order tiers, and the gate on what writes home |
| `session.ts` | hold the log, fold it, run an action, append what it wrote |
| `file.ts` | the export envelope, its canonical layout, and compaction |
| `ports.ts` | the host contract, declared and never implemented |
| `ids.ts` | id minting |

## The detail

`docs/` holds the goal state for the parts too large to state here — `schema.md`, `actions.md` and `behaviors.md` — plus `model.md`, `engine.md`, `ports.md` and `workspace.md`.
