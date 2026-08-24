# @mnd/layout

**Where everything sits, and where every line goes.** Pure functions over the graph, so placement and routing are property-tested with no browser in the process.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core` |
| **Proven by** | no overlap · on the grid · stable under reorder · every elbow square · no two ends share a seat — over all six arrangements |

```
npm test -w @mnd/layout
```

## What is in here

| | Is |
|---|---|
| `size.ts` | how big a thing is before anything is placed. The grid, the seat pitch, and the least size of a card |
| `arrange.ts` | `laid` — where every block in a layer sits, under one of six arrangements. Also `boundary`, `bounds` and `centred` |
| `route.ts` | `route` — every line worked out in one pass, so each sees the seats the ones before it took |
| `seat.ts` | where an interface sits on its owner's edge, and where a drag would put it |

**Nothing here is stored.** A position somebody placed is model data that `arrange` reads; everything else — routes, boundaries, the seats a line lands on — is worked out every draw.

## The detail

`docs/arrange.md` and `docs/route.md`.
