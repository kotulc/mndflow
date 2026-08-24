/** A Scene as one standalone SVG.
 *
 *  The third renderer, and the one a published page can hold: no React, no DOM
 *  and no runtime — a string a build step writes to a file. It draws the same
 *  class vocabulary the React renderer does, so a page that already carries the
 *  theme styles it, and it ships its own stylesheet so a file opened alone
 *  still reads.
 *
 *  **A box that names a link becomes an anchor.** That is the whole of what
 *  this knows about the outside: where a block came from is a field on the
 *  block, and following one is a renderer's business. */
import type { Scene } from "./scene";
/** How the drawing is dressed. Every one of these has a default that works. */
export type Paper = {
    /** The accessible name. Defaults to what the layer is called. */
    title?: string;
    /** Replaces the default stylesheet outright. */
    style?: string;
    /** Room around the drawing. */
    pad?: number;
    /** What every generated id is prefixed with, so several drawings can sit on
     *  one page without their markers and clips colliding. */
    id?: string;
};
/** The whole scene, as one SVG document. */
export declare function draw_svg(scene: Scene, paper?: Paper): string;
