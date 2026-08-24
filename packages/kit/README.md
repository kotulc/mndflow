# @mnd/kit

**The one surface mndflow offers anything outside this repo.** Six packages are the shape of the design; one is the shape of the seam.

| | |
|---|---|
| **Entry** | `@mnd/kit` — headless. `@mnd/kit/react` — the React renderer. `@mnd/kit/react.css` — the stylesheet it reads |
| **Depends on** | core, defs, layout, views, render, theme — all bundled **in**, and declared as build dependencies because of it |
| **Proven by** | packing it and building a graph, a file and a drawing from outside the workspace |

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
import { empty_graph, write, block, draw_svg } from "@mnd/kit";

const scene = block.project(graph, layer);
const svg = draw_svg(scene);          // a standalone drawing, links and all
const file = write(graph, "docs");    // what mndflow reads back
```

`@mnd/kit/react` is a separate entry so the common case — a build step turning documents into drawings — never resolves React at all.

## What it is not

**Not an API anyone has to keep.** The boundaries inside the repo exist to enforce direction and to let each package be proven on its own. This flattens them for one consumer at one moment, and a version is a git SHA rather than a promise.

**Packed, never published.** `npm pack` works on a private package; `npm publish` refuses one. That is deliberate.
