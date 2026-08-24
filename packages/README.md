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
| layout | sizing, placement, arrange, route | core |
| views | the three view modules, each projecting a layer to a **Scene** | core, layout |
| defs | the shipped definition packages. **Data, no code** | core |
| `theme` | the ramp, as CSS custom properties. **No code** | — |
| `fixtures` | sample **logs**, and sample **files** for the seam. Shared by the CLI, every suite and every dev harness | core, defs |

Headless — no React, no DOM, no `window`.

---

| Presentation | Package Purpose | Depends on |
|---|---|---|
| render | Scene → React: cards, the ramp, the gesture binding | core, views, theme |
| stage | the drawing, framed: a Scene mounted and driven | core, views, render, theme |
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
| `kit` | the whole headless stack as **one built package**, plus `kit/react` and `kit/react.css`. Bundled, so nothing outside sees a workspace | core, defs, layout, views, render, theme |

Twelve packages are the shape of the design; one is the shape of the seam. **Packed, never published** — `npm pack -w @mnd/kit` is how a translator installs mndflow. It adds nothing and only re-exports, so it cannot put a dependency anywhere the map does not already allow, and it declares its siblings as **build** dependencies because it carries them.

**Data in, data and artifacts out, and the export list is written out.** The log, the steps, the mutations, the session, the action registry, the inference and `layout` are all internal: a log is intent replayed against one engine, and a graph is a statement of fact. **A signature naming `Log`, `Step` or `Mutation` is internal; graph to graph, and graph to Scene, is the seam.** `export *` from the engine is how that leaks, so what ships is named one by one.

`kit/react` carries one component — `Viewer`, which is interactive and **not editable**. It is the one place a package adds code rather than re-exporting, and it can break nothing the map forbids: it is built from packages `kit` already bundles.


## The Scene is the seam

```
project(graph, layer, config) → Scene { boxes, routes, slots, hits, bounds }
```

Plain data, importing nothing drawable. `render` turns a Scene into DOM; the `cli` turns one into
text. **A notation becomes a pure function**, and most of the product is provably correct before
anything is drawn.

## What is proven where

| | Package Proven By | Needs a browser |
|---|---|---|
| core | fold determinism, door repairs, containment, undo-by-refold, file round-trip | no |
| layout | no overlap, containment, route termination, stability under reorder | no |
| views | Scene invariants per module, over text and SVG projections of **shape, not coordinates** | no |
| defs | every definition passes the door; every module it names exists | no |
| fixtures | every sample folds clean | no |
| kit | packed, then a graph, a file and a drawing built from outside the workspace | no |
| render | one conformance test: every Scene element draws, every hit binds | yes |
| stage · explorer · tray · options · terminal | driven, not asserted | yes |

**Everything that decides anything is proven headless.** What needs a browser is what only draws,
and that is the return on the Scene boundary. **Properties, never values** — nothing asserts a
coordinate, an id or a message that tuning would change.