/** The React half of the seam, behind its own entry.
 *
 *  Split from `index` so the common case — a build step turning documents into
 *  drawings — never resolves React at all.
 *
 *  **One component, and it does not edit.** `Viewer` takes a graph and gives an
 *  interactive view of it: click to highlight, double-click to walk in and out.
 *  The renderer underneath also offers drag callbacks that mean move, seat,
 *  wall and relate; they are not re-exported, so an edit is unreachable rather
 *  than merely unadvised. A host that needs them lives in this repo and imports
 *  `@mnd/render` directly.
 *
 *  The stylesheet ships beside it as `@mnd/kit/react.css`. It reads the ramp
 *  and names no colour of its own, so a page that loads neither gets an
 *  unstyled drawing — `draw_svg` is the one that stands alone. */

export { type ViewerProps, Viewer } from "./viewer";
