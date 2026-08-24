/** A Scene as text.
 *
 *  The second renderer, and the one that makes a notation testable with no
 *  browser in the process: a regression is a diff rather than a screenshot.
 *  It draws **shape, not coordinates** — a grid coarse enough that nudging a
 *  card by a cell does not rewrite the expectation. */
import type { Scene } from "./scene";
/** The whole scene, as a block of characters. */
export declare function draw(scene: Scene): string;
/** What the scene holds, as a list. Easier to read than a drawing when what is
 *  being checked is composition rather than placement. */
export declare function outline(scene: Scene): string;
