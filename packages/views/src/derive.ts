/** What every module derives the same way. */

import { attributes_of, def_of, frozen, head_of, lens_of, is_container, is_flat, is_interface, is_named,
         base_of, path, previewed, role_of, shape_of, shown_name, stamps_of, stands_for, stood_def,
         subtypes, tree_of, used_by, type Graph, type Id } from "@mnd/core";
import { face_table, face_text, handle_of } from "./face";
import { look_of } from "./look";
import { face_of, type Face } from "./size";
import type { BoxData, CardClass, Scene } from "./scene";

/** How a block reads, derived from what it holds or where it sits. */
export function marks_of(graph: Graph, id: Id): CardClass[] {
  const b = graph.blocks[id];
  const out: CardClass[] = [];
  if (!b) return out;
  const module = base_of(graph, id);
  /** A stand-in for a definition draws as its usages; only its stamp says it stands in. */
  if (module === "reference" && !b.def && !stood_def(graph, id)) {
    out.push("reference");
    /** Missing is naming nothing at all. */
    if (!stands_for(graph, id) || stands_for(graph, id)!.id === id) out.push("missing");
  }
  if (module === "note") out.push("note");
  /** A block that holds wears its shape, whatever kind it descends from. */
  const shape = shape_of(graph, id);
  if (shape) out.push(shape);
  if (is_flat(graph, id)) out.push("flat");
  if (is_interface(b)) {
    out.push("interface");
    if (b.flow === "in" || b.flow === "both") out.push("in");
    if (b.flow === "out" || b.flow === "both") out.push("out");
  }
  /** A reference to a block holds what it previews, and whatever it holds itself. */
  if (is_container(graph, id) || is_container(graph, previewed(graph, id))) out.push("container");
  /** Wearing its type rather than a name somebody chose. */
  if (!is_named(graph, id)) out.push("unnamed");
  /** A header, and one heading a row reads upright in its one-unit column. */
  const role = head_of(graph, id);
  if (role) out.push("header");
  if (role === "row") out.push("upright");
  return out;
}

/** Everything a drawn block carries beyond where it sits: what its card is, and — where it
 *  draws with the large face, which the view may ask for — the table and markdown it shows. */
export function carried(graph: Graph, id: Id, face: Face = face_of(graph, id)): BoxData {
  /** A reference to a block carries what its target carries. */
  const b = graph.blocks[previewed(graph, id)]!;
  const look = look_of(graph, id);
  /** The handle, over the name. */
  const alias = handle_of(graph, id, look);
  /** Room at the end of its table for the marks this card wears, previewing or not. */
  const ruled = face === "large" ? face_table(graph, b.id, look, stamps_of(graph, id).length) : null;
  return {
    label: shown_name(graph, id),
    ...(alias ? { alias } : {}),
    role: role_of(graph, id),
    ...(lens_of(graph, id) ? { opens: true } : {}),
    ...(stamps_of(graph, id).length ? { stamps: stamps_of(graph, id) } : {}),
    ...("type" in b && b.type ? { def: b.type } : {}),
    ...(link_of(graph, id) ? { link: link_of(graph, id) } : {}),
    marks: marks_of(graph, id),
    look,
    face,
    ...(face === "large" ? { text: face_text(graph, b.id, look) } : {}),
    ...(face === "large" && ruled ? { table: ruled } : {}),
  };
}

/** Where a box points, if it says: its source. */
export function link_of(graph: Graph, id: Id): string | undefined {
  return graph.blocks[id]?.source || undefined;
}

/** What an empty layer says: that it holds nothing — and, where it is editable, how to add —
 *  then what else there is to see of it. */
export function empty_of(graph: Graph, id: Id): string {
  const count = (n: number, word: string) => (n ? `${n} ${word}${n === 1 ? "" : "s"}` : "");
  const def = graph.blocks[id]?.def;
  const facts = [count(attributes_of(graph, def_of(graph, id)).length, "attribute"),
                 def ? count(subtypes(graph, id).length, "subtype") : "",
                 def && used_by(graph, id).length ? `used by ${used_by(graph, id).length}` : ""];
  const holds = `${shown_name(graph, id)} holds nothing yet`;
  const add = frozen(graph, id) ? "" : " — right-click to add a block";
  return [holds + add, ...facts.filter(Boolean)].join(" · ");
}

/** The trail down to the layer, for a breadcrumb: layers only, from the tree it is in — never
 *  the package and folders above the tree. A layer in no tree is its own trail. */
export function trail_of(graph: Graph, layer: Id | null): Scene["trail"] {
  const way = path(graph, layer ?? graph.root);
  const tree = tree_of(graph, layer ?? graph.root);
  const from = Math.max(0, tree ? way.findIndex((b) => b.id === tree) : way.length - 1);
  return way.slice(from).map((b) => ({ id: b.id, label: shown_name(graph, b.id) }));
}
