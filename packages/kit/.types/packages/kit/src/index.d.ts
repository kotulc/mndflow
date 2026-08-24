/** The one surface mndflow offers anything outside this repo.
 *
 *  Six packages are the shape of the design; **one is the shape of the seam**.
 *  A translator does not want to know that placing and projecting are two
 *  packages — it wants a graph to build, a file to write and a Scene to draw —
 *  and a boundary the repo keeps for direction is not a boundary anyone else
 *  should have to track version by version.
 *
 *  Headless. Nothing here reaches React or the DOM, so a Node consumer that
 *  only wants a drawing never pulls a renderer in. `@mnd/kit/react` is where
 *  the React renderer lives, and importing this never loads it. */
export * from "@mnd/core";
export * from "@mnd/defs";
export * from "@mnd/layout";
export * from "@mnd/views";
