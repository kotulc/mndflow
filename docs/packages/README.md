# The monorepo

**mndflow built to its own design** — one repo, npm workspaces, one version, never published.
Boundaries exist to enforce direction and to let each package be proven on its own; they are not an
API surface anyone has to keep.


## The one law

**Dependencies run one way, and only `core` may name a closed set.** Any other package enumerating
sorts of things is doing the engine's job in the wrong place. Both halves are a test: the workspace
graph must match the table below, and no package outside `core` may declare a closed set.

## The packages

**Headless — no React, no DOM, no `window`.**

| | Package Purpose | Depends on |
|---|---|---|
| core | the graph, the log, the door, the action set, the ports | — |
| layout | sizing, placement, arrange, route | core |
| views | the three view modules, each projecting a layer to a **Scene** | core, layout |
| defs | the shipped definition packages. **Data, no code** | — |
| `theme` | the ramp, as CSS custom properties. **No code.** Ported | — |
| `fixtures` | sample **logs**, shared by the CLI, every suite and every dev harness. Ported | — |

**Presentation.**

| | Package Purpose | Depends on |
|---|---|---|
| render | Scene → React: cards, the ramp, icons, animate | core, views |
| ui | explorer, stage, options, tray, terminal | render, core |

**Apps — they bind ports and nothing else.**

| | Package Purpose |
|---|---|
| web | Vite. The primary product |
| cli | headless. Folds, checks, projects to text. **The harness that makes the rest provable** |

**No package is named after a dependency.** React Flow is a rendering choice that lives inside
`render`; placement and routing are pure functions over the graph and belong to `layout`, where they
can be property-tested with no browser in the process.

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
| views | Scene invariants per module, over text projections of **shape, not coordinates** | no |
| defs | every definition passes the door; every module it names exists | no |
| render | one conformance test: every Scene element draws, every hit binds | yes |
| ui | driven, not asserted | yes |

**Only two of six need a browser.** That is the return on the Scene boundary. **Properties, never
values** — nothing asserts a coordinate, an id or a message that tuning would change.

## v1 — the block loop, end to end

**One pass through every seam, and nothing more.**

> Make a block · nest it · relate two · descend and come back · undo · reload and it is still there ·
> export and re-import.

| In v1 | Out of v1 |
|---|---|
| core, layout, `views/block`, render, `apps/cli` | table, matrix, behaviors, translate |
| explorer, stage (canvas only) | tray, options rail, terminal |
| `defs/base` alone | every other definition package |
| `storage` and `files` ports | `net`, and `score` unless the scorer ships |

**How it gets built** → build.md. In short: **contracts first, then five tracks that do
not wait on each other**, each provable on its own, with `apps/cli` growing beside them so nothing is
built in the dark.
