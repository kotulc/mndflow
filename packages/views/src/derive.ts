/** What every module derives the same way.
 *
 *  A mark is how a block reads and a trail is where the layer sits — neither is
 *  a notation's to decide, so all three modules ask the same question here
 *  rather than each answering it slightly differently. */

import { alias_of, is_container, is_interface, is_named, is_reference, kind_word,
         module_of, path, role_of, shown_name, stands_for,
         type Graph, type Id } from "@mnd/core";
import { cells_of, look_of } from "./look";
import { pictured } from "./size";
import type { BoxData, Mark, Scene } from "./scene";

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
  /** Wearing its type rather than a name somebody chose. Drawn quietly, so a
   *  placeholder does not read as loudly as a name. */
  if (!is_named(graph, id)) out.push("unnamed");
  /** Told to carry no label at all, which the drawing has to know as well as
   *  the text does: a grid keeps a name to be taken hold of by, and it must not
   *  offer to be named where it was told not to say anything. */
  if (b.labelled === false) out.push("unlabelled");
  return out;
}

/** Everything a drawn block carries beyond where it sits.
 *
 *  **Written once**, so the three projections cannot drift on what a card is
 *  told. A box that stands for nothing in the graph does not come through
 *  here — it has no definition to have a look. */
export function carried(graph: Graph, id: Id): BoxData {
  const b = graph.blocks[id]!;
  const look = look_of(graph, id);
  const cells = pictured(graph, id)
    ? cells_of(graph, id, (kid) => shown_name(graph, kid)) : [];
  const fields = (b.fields ?? [])
    .filter((f) => (look.shows ? look.shows.includes(f.name) : false))
    .map((f) => ({ name: f.name, value: String(f.value ?? "") }));
  /** **A block can be told to say less.** Told not to carry a label it still
   *  says what it is — a card with nothing written on it is a shape nobody can
   *  read — but the mark that tells it from its neighbour goes, which is the
   *  whole of what is in the way while you are arranging things. */
  const quiet = b.labelled === false;
  const alias = quiet ? "" : alias_of(graph, id);
  return {
    label: quiet ? kind_word(graph, b) : shown_name(graph, id),
    ...(alias ? { alias } : {}),
    role: role_of(graph, id),
    ...(b.type ? { def: b.type } : {}),
    ...(link_of(graph, id) ? { link: link_of(graph, id) } : {}),
    marks: marks_of(graph, id),
    look,
    ...(cells.length ? { cells } : {}),
    ...(fields.length ? { fields } : {}),
  };
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
