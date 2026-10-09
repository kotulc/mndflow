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
| `block.ts` | the projection: a frame, cards, holders, seated interfaces, routed lines. `project(graph, null)` is the overview |
| `packages.ts` | the overview's graph: every package a box of its domain, folders flattened. Internal: nothing outside views names it |
| `through.ts` | read-through: an opened usage's definition structure laid on its layer, its interfaces on its walls |
| `outline.ts` · `page.ts` | the computed layouts: headed groups as a staircase, and full-width boxes down a page |
| `size.ts` | the one measure: `UNIT`, a `CELL` as a block plus its air, and **faces** — `face_of` (small, or large where an ancestor's `layout.face` asks) and the size each draws at: the workspace card small; large, the definition's `card.size` or what its content fits (`fitted`), under `LARGE` |
| `arrange.ts` · `bands.ts` · `pack.ts` | where everything sits: hand placement or auto-layout, bands and cells, clusters and satellites |
| `seat.ts` · `ends.ts` · `route.ts` | where a line meets a border, which way it sets off, and where it runs |
| `look.ts` · `derive.ts` | what a card wears (`face_attrs`, the attributes the card table reads), its marks and trail, and `carried` — **the one place a card's data is worked out**, for the canvas and the tray alike |
| `face.ts` | the large face: `face_text`, its markdown — the parts `card.shows` lists, attributes as a ruled table — `handle_of`, and `fit_of`, the room that markdown needs, estimated from the text so layout stays headless |
| `fields.ts` | `fields_graph` — a block's attributes as a class diagram: one large card standing for the definition, one per usage. A graph, drawn instead of the layer; never written |
| `links.ts` | `linked_graph` — an attribute typed by a block definition drawn as a dashed line between two cards on the layer. The internal view only; never picked |
| `svg.ts` · `text.ts` | a Scene drawn without a browser |

**A producer proves its Scene well-formed; a consumer proves it draws anything that is.** Neither imports the other.

## The detail

`docs/views.md`, and the projection itself in `docs/block.md`.
