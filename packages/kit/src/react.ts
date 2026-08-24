/** The React half of the seam, behind its own entry.
 *
 *  Split from `index` so the common case — a build step turning documents into
 *  drawings — never resolves React at all. What this publishes draws a Scene it
 *  did not compute, which is the same thing it does inside the app.
 *
 *  The stylesheet ships beside it as `@mnd/kit/react.css`. It reads the ramp
 *  and names no colour of its own, so a page that loads neither gets an
 *  unstyled drawing — `draw_svg` is the one that stands alone. */

export * from "@mnd/render";
