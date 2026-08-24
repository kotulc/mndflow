# @mnd/kit

**The one surface mndflow offers anything outside this repo.** Six packages are the shape of the design; one is the shape of the seam.

| | |
|---|---|
| **Entry** | `@mnd/kit` — headless. `@mnd/kit/react` — one component, `Viewer`. `@mnd/kit/react.css` — the stylesheet it reads |
| **Depends on** | core, defs, layout, views, render, theme — all bundled **in**, and declared as build dependencies because of it |
| **Proven by** | packing it, then building a graph, a file and a drawing from outside the workspace — with no log, step or mutation in the round trip |

## Where it sits

```
anything outside this repo
└─ kit   ◀ bundles them in
   └─ core · defs · layout · views · render · theme
```

## Building it

```sh
npm run build -w @mnd/kit     # tsup for the code, tsc + rollup for the types
npm pack -w @mnd/kit          # the tarball a consumer installs
```

Three steps, because they answer two different questions. `tsup` bundles the modules; `tsc` emits one declaration per source file, each still naming `@mnd/core` and its siblings; `rollup-plugin-dts` flattens those the same way `tsup` flattened the code. What ships is **one file with no workspace left in it**.

## Using it

```ts
import { base_graph, validate, write, open, block, draw_svg } from "@mnd/kit";

const graph = base_graph();           // a workspace with the floor in it
const faults = validate(graph);       // what it violates, if anything
const file = write(graph, "docs");    // what mndflow reads back
const back = open(file).graph;        // and the same state, in again

const svg = draw_svg(block.project(back, layer, {}));
```

`@mnd/kit/react` is a separate entry so the common case — a build step turning documents into drawings — never resolves React at all.

## Data in, data and artifacts out

**A graph is what travels.** It is a statement of what the model *is* — self-describing, and validatable without executing anything. A log is a history of intent replayed against one engine: reading one means matching this build's mutation semantics, its defaults and its action set, version for version.

> **A signature naming `Log`, `Step` or `Mutation` is internal. Graph to graph, and graph to Scene, is the seam.**

**Sealed, with no exceptions to look up:** the log, the steps, the mutations, the session, the action registry, the inference, and `layout`. A consumer places nothing — projecting is what places, and the Scene it hands back already carries the geometry.

- **A consumer says what a model *is*, never what changed.** Round-tripping is read a graph and write a graph, and diffing belongs to whoever cares. **That is the price of a mutation union that stays free to grow**, and it is the right one.
- **The export list is written out**, one name at a time. `export *` from the engine is how the log leaks.

## The embedded view

```tsx
import { Viewer } from "@mnd/kit/react";
import "@mnd/kit/react.css";

<Viewer graph={graph} layer={layer} />   // click highlights, double-click walks
```

**Interactive, self-contained, and not editable.** `draw_svg` makes a picture; this makes one you can walk. It holds the graph, projects the layer being looked at, and goes in and out of layers on a double-click. **Nothing in it writes.**

The renderer underneath also offers drag callbacks meaning move, seat, wall and relate. They are not passed and not re-exported, so **an edit is unreachable rather than merely unadvised** — a host that needs them lives in this repo and imports `@mnd/render` directly.

## What it is not

**Not an API anyone has to keep.** The boundaries inside the repo exist to enforce direction and to let each package be proven on its own. This flattens them for one consumer at one moment, and a version is a git SHA rather than a promise.

**Not a renderer you drive.** `Viewer` is the one component here and it is the one place this package adds code rather than re-exporting. The rule that mattered was dependency direction, and a viewer built from packages `kit` already bundles cannot break it.

**Packed, never published.** `npm pack` works on a private package; `npm publish` refuses one. That is deliberate.
