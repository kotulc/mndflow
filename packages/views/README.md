# @mnd/views

**A layer, projected.** One way to draw: a graph and a layer in, a **Scene** out — plain data, importing nothing drawable.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, and React Flow's types for the node and edge shape |
| **Proven by** | every Scene it emits is well-formed, over every layer of every fixture, and the invariants catch what they are for |

## Where it sits

```
web · cli
└─ stage                             (the cli reaches views directly)
   └─ views   ◀
      └─ core
```

## Running it

```sh
npx vitest run packages/views                 # its suite, from the repo root
npm run start -w @mnd/cli -- project related  # a Scene as text, which is the second renderer
```

## What is in here

| | Is |
|---|---|
| `scene.ts` | the seam: `BoxNode`, `LineEdge`, `Perch`, `Frame`, `Scene` |
| `block.ts` | the projection: a frame, cards, holders, seated interfaces, routed lines |
| `size.ts` | the one measure: `UNIT`, and a `CELL` as a block plus its air |
| `arrange.ts` · `bands.ts` · `pack.ts` | where everything sits: hand placement or auto-layout, bands and cells, clusters and satellites |
| `seat.ts` · `ends.ts` · `route.ts` | where a line meets a border, which way it sets off, and where it runs |
| `look.ts` · `derive.ts` | what a card wears, its marks and trail, and — where its look asks, `card.fields` — the fields its compartment lists |
| `fields.ts` | `fields_graph` — a block's fields as a class diagram: one card standing for the schema, one per usage. A graph, drawn instead of the layer; never written |
| `svg.ts` · `text.ts` | a Scene drawn without a browser |

**A producer proves its Scene well-formed; a consumer proves it draws anything that is.** Neither imports the other.

## The detail

`docs/views.md`, and the projection itself in `docs/block.md`.
