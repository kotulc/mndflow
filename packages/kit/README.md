# @mnd/kit

**The one surface mndflow offers anything outside this repo.** Seven packages are the shape of the design; one is the shape of the seam.

| | |
|---|---|
| **Entry** | `@mnd/kit` — headless. `@mnd/kit/react` — `Viewer`, `Explorer`, `Tray`, and the `useTray` / `useDisplay` state a shell keeps. `@mnd/kit/react.css` — the one stylesheet they read. `@mnd/kit/shell` and `@mnd/kit/shell.css` — the workspace chrome, opt-in |
| **Depends on** | core, defs, explorer, views, stage, theme, tray — all bundled **in**, and declared as build dependencies because of it |
| **Proven by** | packing it, then building a graph, a file and a drawing from outside the workspace — with no log, step or mutation in the round trip |

## Where it sits

```
anything outside this repo
└─ kit   ◀ bundles them in
   └─ core · defs · explorer · views · stage · theme · tray
```

## Building it

```sh
npm run build -w @mnd/kit     # tsup for the code, tsc + rollup for the types
npm pack -w @mnd/kit          # the tarball a consumer installs
```

Three steps, because they answer two different questions. `tsup` bundles the modules; `tsc` emits one declaration per source file, each still naming `@mnd/core` and its siblings; `rollup-plugin-dts` flattens those the same way `tsup` flattened the code. What ships is **one file with no workspace left in it**.

## Releasing it

```sh
npm run release:kit                    # build, pack into release/, stamp it
node scripts/release-kit.mjs --check   # the tarball still matches the stamp
```

**The tarball is committed, and so is what it is.** `release/kit.json` records the version, the commit, the branch and the integrity hash — a registry would carry that, and without one it has to be written down. Bump `version` in this manifest before releasing; the filename carries it.

A consumer installs the file and needs nothing from this repo — no checkout beside it, no build, no `dist/` that git does not track:

```sh
npm i ./vendor/mnd-kit-0.1.0.tgz    # vendored, or fetched from a release
```

**Until it is published, a version is a promise this repo keeps by hand.** Two consumers holding `0.1.0` hold the same bytes only because `--check` says so.

## Using it

```ts
import { base_graph, validate, review, write, open, project, draw_svg } from "@mnd/kit";

const graph = base_graph();           // a workspace with the floor in it
const faults = validate(graph);       // what it violates, if anything
const notes = review(graph);          // what its definitions asked for and did not get
const file = write(graph, "docs");    // what mndflow reads back
const back = open(file).graph;        // and the same state, in again

const svg = draw_svg(project(back, layer, {}));
```

**Two questions, and only one of them mends.** `validate` asks whether a graph can be *read*; `review` asks whether it says what its definitions asked for. A model is legitimately unfinished, so a note is advice — **a translator is where it becomes a refusal.**

`@mnd/kit/react` is a separate entry so the common case — a build step turning documents into drawings — never resolves React at all.

## Data in, data and artifacts out

**A graph is what travels.** It is a statement of what the model *is* — self-describing, and validatable without executing anything. A log is a history of intent replayed against one engine: reading one means matching this build's mutation semantics, its defaults and its action set, version for version.

> **A signature naming `Log`, `Step` or `Mutation` is internal. Graph to graph, and graph to Scene, is the seam.**

**Sealed, with no exceptions to look up:** the log, the steps, the mutations, the session, the action registry, and placement. A consumer places nothing — projecting is what places, and the Scene it hands back already carries the geometry.

- **A consumer says what a model *is*, never what changed.** Round-tripping is read a graph and write a graph, and diffing belongs to whoever cares. **That is the price of a mutation union that stays free to grow**, and it is the right one.
- **The export list is written out**, one name at a time. `export *` from the engine is how the log leaks.

## The embedded view

```tsx
import { Viewer } from "@mnd/kit/react";
import "@mnd/kit/react.css";

<Viewer graph={graph} layer={layer} />   // click highlights, double-click walks
```

**Interactive, self-contained, and not editable.** `draw_svg` makes a picture; this makes one you can walk. It holds the graph, projects the layer being looked at, and goes in and out of layers on a double-click. **Nothing in it writes.**

The renderer underneath also offers drag callbacks meaning move, seat, wall and relate. They are not passed and not re-exported, so **an edit is unreachable rather than merely unadvised** — a host that needs them lives in this repo and imports `@mnd/stage` directly.

**A double-click opens what is under it, and a box that holds nothing opens where it points.** Where it points is a `source` field of form `link`, which is also what `draw_svg` turns into an anchor — one field name, and the drawing is navigation in both renderers. Unset, `onFollow` sends the browser there; passed, a host routes it itself and the page never reloads.

```tsx
<Viewer graph={graph} onFollow={(link) => router.push(link)} />
```

Holding beats pointing, deliberately: a linked block with children is a page with sections in it, and walking in is what the viewer is for.

```tsx
import "@mnd/kit/shell.css";

<Viewer graph={graph} chrome={{ crumbs: true }} />   // the trail down to the open layer, over the drawing
```

**Chrome is asked for, and dressed by the shell** — bar the lattice, which draws unless `chrome.lattice` is `false`. Bare, the viewer is the canvas and the lattice behind it. `chrome.crumbs` draws the trail over its top-left corner — a crumb opens that layer, the arrow goes up one — and the crumbs are shell, not stage, so they read `shell.css` rather than anything `react.css` carries.

The rest of what a drawing looks like is the host's to hand down, and `useDisplay` below keeps it:

| Prop | Is |
|---|---|
| `card` | the default card, in lattice units — applied before anything is measured |
| `chrome.legend` · `chrome.corner` | the key to what the layer draws, in the top or bottom right-hand corner |
| `fields` · `onFields` | a block or definition whose fields are drawn **instead of the layer**, as a class diagram: one card standing for its schema, one per usage listing its values. A pick on the class card is told as its definition; `close diagram` and the crumbs tell `onFields(null)` |

## The tray

```tsx
import { Tray, useDisplay, useTray } from "@mnd/kit/react";

const tray = useTray();                                        // open, its tab, what it holds
const { display, onDisplay } = useDisplay({ card: { w: 10, h: 3 }, range: CARD });

<Explorer ... section={tray.section(graph.root)} onSection={tray.onSection} />
<Viewer ... card={display.card} chrome={{ lattice: display.lattice, legend: display.legend }} />
<Tray graph={graph} layer={layer} picked={picked}
      open={tray.open} onOpen={tray.onOpen} onTab={tray.onTab}
      hold={tray.hold} onHold={tray.onHold}
      display={display} onDisplay={onDisplay} onFields={set_fields}
      extras={[{ name: "preview", draw: (id) => <Preview id={id} /> }]} />
```

**mndflow's own tray, and the state every shell keeps for it** — the same `useTray` and `useDisplay` the mndflow app runs on, so a host inherits the defaults rather than restating them:

- **Open from the start**, and pointed at the workspace: nothing picked on the root layer is the root picked, which opens on its `workspace` tab and lights the root row in the explorer.
- **Read only without `onAct`.** Only the tabs that read are offered — workspace, element, fields, contents, and the library's — and nothing in them takes input. **The workspace tab's display still answers `onDisplay`**, because how a drawing looks is the session's and changes nothing.
- **A host's own tabs come after the tray's**, for blocks, through `extras`.
- **The fields tab offers `view diagram`** wherever the block answers a workspace schema, and hands the id to `onFields`.

## The tree

```tsx
import { Explorer } from "@mnd/kit/react";

<Explorer graph={graph} open={at} picked={picked} folded={folded}
          menu={false}                       // your vocabulary, not this engine's
          onAct={(name, args) => { /* mean whatever you like by it */ }}
          onFold={...} onPick={...} />
```

**It emits intent, never change.** `onAct` is a name and arguments — `Act = (name, args?) => void` — so nothing here writes and nothing here assumes a log exists. A host over a **derived** graph handles `move` by rewriting its own store and rebuilding; a host over a real workspace runs the action. The explorer cannot tell the difference, which is the point.

**`menu={false}` drops this engine's offered list** and keeps the rows, the drag, the fold and the marks. A consumer with actions of its own — *rename file*, *move section* — should pass it, because the default list is mndflow's actions and means nothing elsewhere.

**`tools` says which of the bar's tools are drawn**, and it is separate from `menu` because the bar and the menu answer different questions. Every tool is drawn unless told otherwise:

```tsx
<Explorer ... tools={{ filter: false, block: false, folder: false, remove: false }} />   // the fold stays
<Explorer ... extra={<button onClick={open}><Icon name="add_document" /></button>} />  // a host's own tools, after the filter
```

## The chrome

```tsx
import { WorkspaceHeader, TrayFrame, Icon } from "@mnd/kit/shell";
import "@mnd/kit/shell.css";

<div className="app">
  <WorkspaceHeader brand="handbook" where={<span className="where">12 pages</span>}>
    <button onClick={save}><Icon name="save" /></button>
  </WorkspaceHeader>
  <main>
    <Viewer graph={graph} chrome={{ crumbs: true }} />
    <TrayFrame open={open} onOpen={set_open} word="page" name={name}
               tabs={["about", "links"]} tab={tab} onTab={set_tab}>
      {/* whatever the host has to say about the open page */}
    </TrayFrame>
  </main>
</div>
```

**The dressing mndflow wears, with nothing of mndflow's in it.** `WorkspaceHeader` is identity on the left and tools on the right; `TrayFrame` is the collapsible bar, the tab strip and a body slot; neither names a graph. `shell.css` is the reset, the `.app` grid, the header, the bar height the panels share, the crumbs and the tray's frame — a host takes all of it or none, and `react.css` never carries it, because a drawing embedded in someone else's page must not restyle that page's `body`.

`@mnd/kit/shell` is its own entry so a host that wants only a drawing resolves none of this. The same names are also reachable from `@mnd/kit/react`, so a host that already has that entry need not add another.

## Inlining a drawing in a page

`draw_svg` ships its own stylesheet so a file opened alone still reads. A page holding **several** drawings wants it once instead, and a page written in **MDX** cannot take it at all — CSS is braces, and MDX reads a brace as the start of an expression.

```ts
import { SHEET, draw_svg } from "@mnd/kit";

const svg = draw_svg(scene, { style: "", id: "fig1" });   // no <style>, own id space
```

`style: ""` drops the `<style>` block and `SHEET` is the sheet to carry once. Labels are escaped with braces included, so a heading containing one cannot break the page holding the drawing. `id` prefixes every generated marker and clip, so two drawings can share a page without colliding.

## What it is not

**Not an API anyone has to keep.** The boundaries inside the repo exist to enforce direction and to let each package be proven on its own. This flattens them for one consumer at one moment, and a version is a stamped tarball rather than a promise.

**Not a renderer you drive, and not an editor.** `Viewer`, `Explorer`, `Tray` and the chrome are what is here, and none of them writes: the explorer emits intent, and the tray only reads unless handed `onAct`. `Viewer` is the one place this package adds code rather than re-exporting. The rule that mattered was dependency direction, and components built from packages `kit` already bundles cannot break it.

**Packed, never published.** `npm pack` works on a private package; `npm publish` refuses one. That is deliberate, and `release/` is what stands in for a registry meanwhile.
