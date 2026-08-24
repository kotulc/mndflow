/** What every module derives the same way.
 *
 *  A mark is how a block reads and a trail is where the layer sits — neither is
 *  a notation's to decide, so all three modules ask the same question here
 *  rather than each answering it slightly differently. */
import { type Graph, type Id } from "@mnd/core";
import type { Mark, Scene } from "./scene";
/** How a block reads. Every one of these is derived from what it holds or from
 *  where it sits — none of them is a sort of thing. */
export declare function marks_of(graph: Graph, id: Id): Mark[];
/** The field a box's link is read from. One name, so a translator and every
 *  renderer agree without either naming the other. */
export declare const SOURCE = "source";
/** Where a block points, if it says. A `link` field is an ordinary value the
 *  model already has a form for, so nothing new had to exist for a box to be
 *  clickable — and a block that names none simply is not. */
export declare function link_of(graph: Graph, id: Id): string | undefined;
/** The trail from the root down to the layer, for a breadcrumb. The root is
 *  its own trail: a null layer is the root layer. */
export declare function trail_of(graph: Graph, layer: Id | null): Scene["trail"];
