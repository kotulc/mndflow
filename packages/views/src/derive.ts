/** What every module derives the same way.
 *
 *  A mark is how a block reads and a trail is where the layer sits — neither is
 *  a notation's to decide, so all three modules ask the same question here
 *  rather than each answering it slightly differently. */

import { derived_name, is_container, is_interface, is_reference, module_of,
         path, shown_name, stands_for, type Graph, type Id } from "@mnd/core";
import type { Mark, Scene } from "./scene";

/** How a block reads. Every one of these is derived from what it holds or from
 *  where it sits — none of them is a sort of thing. */
export function marks_of(graph: Graph, id: Id): Mark[] {
  const b = graph.blocks[id]!;
  const out: Mark[] = [];
  const module = module_of(graph, id);
  if (module === "reference") {
    out.push("reference");
    if (!stands_for(graph, id) || stands_for(graph, id)!.id === id) out.push("missing");
  }
  if (module === "note") out.push("note");
  if (module === "group") out.push("group");
  if (is_interface(b)) {
    out.push("interface");
    if (b.flow === "in" || b.flow === "both") out.push("in");
    if (b.flow === "out" || b.flow === "both") out.push("out");
  }
  if (is_container(graph, id) && !is_reference(b)) out.push("container");
  /** A guess must never read as a statement, so a name nobody typed says so. */
  if (derived_name(graph, id)) out.push("derived");
  return out;
}

/** The field a box's link is read from. One name, so a translator and every
 *  renderer agree without either naming the other. */
export const SOURCE = "source";

/** Where a block points, if it says. A `link` field is an ordinary value the
 *  model already has a form for, so nothing new had to exist for a box to be
 *  clickable — and a block that names none simply is not. */
export function link_of(graph: Graph, id: Id): string | undefined {
  const said = graph.blocks[id]?.fields
    ?.find((f) => f.name === SOURCE && f.form === "link");
  return said?.value || undefined;
}

/** The trail from the root down to the layer, for a breadcrumb. The root is
 *  its own trail: a null layer is the root layer. */
export function trail_of(graph: Graph, layer: Id | null): Scene["trail"] {
  return layer === null
    ? [{ id: graph.root, label: shown_name(graph, graph.root) }]
    : path(graph, layer).map((b) => ({ id: b.id, label: shown_name(graph, b.id) }));
}
