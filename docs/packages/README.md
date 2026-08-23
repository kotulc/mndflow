# The monorepo

**mndflow built to its own design** — one repo, npm workspaces, one version, never published.
Boundaries exist to enforce direction and to let each package be proven on its own; they are not an
API surface anyone has to keep.

- **Why this shape** → [design.md](../design.md), *The shape of the code*. **The blueprint** →
  [blueprint.md](../blueprint.md).
- **What each part does** → [spec.md](../spec.md). **The goals** → [stories.md](../stories.md).

## The one law

**Dependencies run one way, and only `core` may name a closed set.** Any other package enumerating
sorts of things is doing the engine's job in the wrong place. Both halves are a test: the workspace
graph must match the table below, and no package outside `core` may declare a closed set.

## The packages

**Headless — no React, no DOM, no `window`.**

| | Is | Depends on |
|---|---|---|
| [core](core/) | the graph, the log, the door, the action set, the ports | — |
| [layout](layout/) | sizing, placement, [arrange](layout/arrange.md), [route](layout/route.md) | core |
| [views](views/) | the three view modules, each projecting a layer to a **Scene** | core, layout |
| [defs](defs/) | the shipped definition packages. **Data, no code** | — |
| `theme` | the ramp, as CSS custom properties. **No code.** Ported | — |
| `fixtures` | sample **logs**, shared by the CLI, every suite and every dev harness. Ported | — |

**Presentation.**

| | Is | Depends on |
|---|---|---|
| [render](render/) | Scene → React: cards, the ramp, icons, [animate](render/animate.md) | core, views |
| [ui](ui/) | [explorer](ui/explorer.md), [stage](ui/stage.md), [options](ui/options.md), [tray](ui/tray.md), [terminal](ui/terminal.md) | render, core |

**Apps — they bind [ports](core/ports.md) and nothing else.**

| | Is |
|---|---|
| [web](apps/web.md) | Vite. The primary product |
| [cli](apps/cli.md) | headless. Folds, checks, projects to text. **The harness that makes the rest provable** |

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

| | By | Needs a browser |
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

**How it gets built** → [build.md](build.md). In short: **contracts first, then five tracks that do
not wait on each other**, each provable on its own, with `apps/cli` growing beside them so nothing is
built in the dark.
