# The Monorepo

**mndflow built to its own design** — one repo, npm workspaces, one version, never published.
Boundaries exist to enforce direction and to let each package be proven on its own; they are not an
API surface anyone has to keep.


## The one law

**Dependencies run one way, and only `core` may name a closed set.** Any other package enumerating
sorts of things is doing the engine's job in the wrong place. Both halves are a test: the workspace
graph must match the table below, and no package outside `core` may declare a closed set.


## The packages

| Core | Package Purpose | Depends on |
|---|---|---|
| core | the graph, the log, the door, the action set, the ports | — |
| views | sizing, placement, and the three view modules, each projecting a layer to a **Scene**. Ranking is `dagre`'s | core |
| defs | the shipped definition packages. **Data, no code** | core |
| `theme` | the ramp as CSS custom properties, and the icon set | — |
| `fixtures` | sample **logs**, and sample **files** for the seam. Shared by the CLI, every suite and every dev harness | core, defs |

Headless — no React, no DOM, no `window`.

---

| Presentation | Package Purpose | Depends on |
|---|---|---|
| stage | the drawing, framed: a Scene mounted on **React Flow** and driven | core, views, theme |
| explorer | the tree, and the menu that hangs off it | core, theme |
| tray | what the open layer holds, as rows | core, theme |
| options | the control groups a projection's slots ask for | core, theme |
| terminal | the strip: four commands, and help behind `?` | core, theme |

**One surface each, and never a `ui` package.** Five panels split five ways is what keeps one of them
from quietly doing another's work — and only two of them know what a Scene is.

---

| App | Package Purpose |
|---|---|
| web | Vite. The primary product |
| cli | headless. Folds, checks, projects to text. **The harness that makes the rest provable** |

Apps bind ports and nothing else.

---


## The one that ships

| | Package Purpose | Depends on |
|---|---|---|
| `kit` | the whole headless stack as **one built package**, plus `kit/react` and `kit/react.css`. Bundled, so nothing outside sees a workspace | core, defs, explorer, views, stage, theme |

Ten packages are the shape of the design; one is the shape of the seam. **Packed, never published** — `npm pack -w @mnd/kit` is how a translator installs mndflow. It adds nothing and only re-exports, so it cannot put a dependency anywhere the map does not already allow, and it declares its siblings as **build** dependencies because it carries them.

**Data in, data and artifacts out, and the export list is written out.** The log, the steps, the mutations, the session, the action registry, the inference and the placement are all internal: a log is intent replayed against one engine, and a graph is a statement of fact. **A signature naming `Log`, `Step` or `Mutation` is internal; graph to graph, and graph to Scene, is the seam.** `export *` from the engine is how that leaks, so what ships is named one by one.

`kit/react` carries two components, and neither edits. `Viewer` draws a layer and walks it. `Explorer` lists the tree and **emits intent rather than change** — `onAct` is a name and arguments, so a host may mean something else by it entirely, which is what lets a tree sit over a graph no log ever wrote. Both are built from packages `kit` already bundles, so they can break nothing the map forbids.


## The Scene is the seam

```
project(graph, layer, config) → Scene { nodes, edges, slots, frame, trail }
```

Plain data in **React Flow's own node and edge shape** — the types are imported for their shape and
erased at build, so nothing headless resolves React. `stage` hands those arrays straight to the
canvas; the `cli` turns them into text and SVG, drawing edges with React Flow's own path functions
so the two cannot drift. **A notation becomes a pure function**, and most of the product is provably
correct before anything is drawn.

**Where a line runs and what answers a click are not in there.** Routing, hit testing, the viewport
and the drag are the library's, which is the point: a boundary that exists to re-implement one is
not a boundary worth keeping.

## What is proven where

| | Package Proven By | Needs a browser |
|---|---|---|
| core | fold determinism, door repairs, containment, undo-by-refold, file round-trip | no |
| views | no overlap, containment, stability under reorder, and Scene invariants per module over text and SVG projections of **shape, not coordinates** | no |
| defs | every definition passes the door; every module it names exists | no |
| fixtures | every sample folds clean | no |
| kit | packed, then a graph, a file and a drawing built from outside the workspace | no |
| stage · explorer · tray · options · terminal | driven, not asserted | yes |

**Everything that decides anything is proven headless.** What needs a browser is what only draws,
and that is the return on the Scene boundary. **Properties, never values** — nothing asserts a
coordinate, an id or a message that tuning would change.