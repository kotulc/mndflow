# @mnd/views

**A layer, projected.** One way to draw: a graph and a layer in, a **Scene** out — plain data, importing nothing drawable.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, React Flow's types for the node and edge shape, `elkjs` for placement, `libavoid-js` for routing, `@dagrejs/dagre` for the synchronous fallback's `layered` layout and `d3-hierarchy` for the `treemap` layout, the library and registries |
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
| `block.ts` | the projection: a frame, cards, holders, seated interfaces, routed lines, in the view `config.look` says. `project(graph, null)`, or the `map` look, is a section's map |
| `profile.ts` | one page-wide row per level along the pick, a line into each (profile) |
| `sheet.ts` | an opened grid's lattice, the allocation view |
| `through.ts` | read-through: an opened usage's definition structure laid on its layer, its interfaces on its walls |
| `page.ts` | the computed page layout: full-width boxes down a page |
| `size.ts` | the one measure: `UNIT`, a `CELL` as a block plus its air, and **faces** — `face_of` (small, or large where an ancestor's `layout.cards` asks) and the size each draws at: the workspace card small; large, the definition's `card.size` or what its content fits (`fitted`), under `LARGE` |
| `flow.ts` | **placement**: a layer's blocks by ELK, each container on its own, inside out — `layered` where lines join its children, packed where none do (`place`); ELK in the host's worker (`set_elk`) |
| `map.ts` · `layer.ts` | the map, the models' and the library's: boxes and chips by what they hold or show (`model_map`, `library_map`, `section_map`); a layer entered from it, placed by ELK (`layer_scene`) |
| `about.ts` | what a block says off its layer: its facts (`facts_of`), a chip's preview (`preview_of`), its hover card (`hover_of`), its colour on a map (`colour_of`), its card's face for the tray and the hover card (`face_props`) |
| `library.ts` | a definition's uses by place, laid out once (`usage_groups`, `usage_layout`); the tray's small maps (`registry_map`, `filed_map`) |
| `arrange.ts` · `bands.ts` · `pack.ts` | where everything sits: placed ahead where ELK gave places (`placed_as`), else the synchronous fallback — bands and cells, clusters and satellites |
| `float.ts` | the fallback's `auto`: runs in explorer order (`runs`), aside cards floating beside what they are tied to (`floated`); one rule for a layer and a group (`noted`) |
| `layered.ts` | the fallback's `layered`: a layer ranked by its relations, on dagre; asides float as in `auto`. For the kit's viewer and the CLI until they draw the world |
| `treemap.ts` | `treemap`: each block as large as what it holds (`weight_of`), nested in its boxes, on d3-hierarchy (`tiled`); notes stand beside it |
| `registry.ts` | a registry read out: `entries_of` (the list), `matrix_of` (the tray's matrix), `registry_scene` (the canvas's treemap of entries by home folder, and of an entry's uses) |
| `seat.ts` · `ends.ts` · `route.ts` | where a line meets a border, which way it sets off, and where it runs |
| `look.ts` · `derive.ts` | what a card wears (`face_attrs`, the attributes the card table reads), its marks and trail, and `carried` — **the one place a card's data is worked out**, for the canvas and the tray alike |
| `face.ts` | the large face: `face_text`, its markdown — the parts its `card.face` maps onto, attributes as a ruled table — `handle_of`, and `fit_of`, the room that markdown needs, estimated from the text so layout stays headless |
| `classes.ts` | `class_graph` — a layer's definition references as a class or entity diagram: stored lines with their ends, and on a class diagram the extends lines. Never written |
| `sequence.ts` | `sequence_scene` — a grid read as time. A scene, because the lifelines and messages are geometry |
| `svg.ts` · `text.ts` | a Scene drawn without a browser |

**A producer proves its Scene well-formed; a consumer proves it draws anything that is.** Neither imports the other.

## The detail

`docs/views.md`, and the projection itself in `docs/block.md`.
