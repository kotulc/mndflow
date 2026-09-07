/** The React half of the seam, behind its own entry.
 *
 *  Split from `index` so the common case — a build step turning documents into
 *  drawings — never resolves React at all.
 *
 *  **Two components: one draws a layer, one lists the tree. Neither edits.**
 *
 *  `Viewer` takes a graph and gives an interactive view of it: click to
 *  highlight, double-click to walk in and out. `Explorer` reads the same way,
 *  and that is deliberate — **the two are one pair of gestures**. A click
 *  reveals and never navigates; opening a layer is the double click; and a
 *  block holding nothing has no inside, so neither one enters it. Both take
 *  `layer` and `picked` as values a host may drive, so a tree beside a drawing
 *  can light what it selected without moving the layer.
 *
 *  The renderer underneath also
 *  offers drag callbacks that mean move, seat, wall and relate; they are not
 *  re-exported, so an edit is unreachable rather than merely unadvised. A host
 *  that needs them lives in this repo and imports `@mnd/stage` directly.
 *
 *  `Explorer` is the tree, and it is here because **it emits intent rather
 *  than change**: `onAct` is a name and arguments, so a host is free to mean
 *  something else by "move" entirely — write it to its own store, or ignore
 *  it. That is what makes a tree over a derived graph possible without a log.
 *  A host with a vocabulary of its own passes `menu={false}` and keeps the
 *  rows; the offered list is this engine's actions and nobody else's.
 *
 *  The stylesheet ships beside them as `@mnd/kit/react.css`, one file for both.
 *  It reads the ramp and names no colour of its own, so a page that loads
 *  neither gets an unstyled drawing — `draw_svg` is the one that stands alone. */

export { type ViewerProps, Viewer } from "./viewer";
export { type ExplorerProps, Explorer } from "@mnd/explorer";

/** What `Explorer` hands back. A name and arguments — never a mutation. */
export type { Act, Args } from "@mnd/core";
