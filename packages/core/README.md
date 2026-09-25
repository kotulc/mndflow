# @mnd/core

**The engine.** The graph, the log, the door, the file, the closed action set and the ports. No React, no DOM, no `window`, and no dependency on any other package.

| | |
|---|---|
| **Entry** | `src/index.ts` — everything public is exported here, and nothing imports a deep path |
| **Depends on** | nothing. It may not even reach `defs`, which supplies its floor — an app hands the base definitions in, the same way it hands in a port |
| **Proven by** | fold determinism, undo-by-refold, the door's repairs, file round-trip, byte-identical re-export, compaction, and the definition model — defaults, derived relation kinds, pins, saved and removed definitions, tags, batches, grafts, the group rule |

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
| `fold.ts` | mutation replay over the shipped floor, laying an unfiled default for every kind |
| `tree.ts` | layers, children, order, owners, and the relations drawn in a layer |
| `holders.ts` | groups and grids: membership, cells, merges, headers, allocation |
| `defs.ts` | definitions: chains, kinds, defaults, `def_of`, and `edge_module` — a relation's kind read from its ends |
| `names.ts` | names, handles, labels and roles; the system marks a card is stamped with — **what it stands in for** (`definition`, `reference`, `package`), alone, **or what describes it** (`data`), which stack; and `schema_def`, the workspace definition a block's data answers |
| `components.ts` | what a definition configures, each component validating its own key |
| `door.ts` | the one way a log comes in. Checks and repairs what it can, drops what it cannot, and writes the repair as a step. **Never migrates** |
| `rules.ts` | what the definitions asked for, and the door does not check. `review` advises; it never repairs |
| `actions/` | the registry — name, sentence, scope, arguments, `check`, `run` — one file per subject, plus the three adjustments |
| `session.ts` | hold the log, fold it, run an action, append what it wrote; `batch` makes one step of several, `graft` brings a file in |
| `file.ts` | the export envelope, its canonical layout, and compaction. **Two readers**: `read` gives the log a session works in, `open` gives the graph and is the one offered outward |
| `ports.ts` | the host contract, declared and never implemented |
| `ids.ts` | id minting |

## What stays inside

**The log, the steps, the mutations, the session and the action registry are internal.** A log is a history of intent replayed against one engine; a graph is a statement of fact. Everything here is public *to the repo* — what leaves it is named one by one in `kit`.

> **A signature naming `Log`, `Step` or `Mutation` is internal. Graph to graph is the seam.**

## The detail

`docs/` holds the goal state for the parts too large to state here — `schema.md` and `actions.md` — plus `model.md`, `engine.md`, `ports.md` and `workspace.md`.
