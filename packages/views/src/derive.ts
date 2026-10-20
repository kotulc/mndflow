/** What every module derives the same way. */

import { attributes_of, def_of, dir_of, domain_of, frozen, head_of, lens_of, is_box, opens,
         flow_of, is_notation, is_flat, notation_of, is_interface, is_named,
         base_of, path, role_of, shape_of, shown_name, stamps_of, subtypes, used_by,
         type Graph, type Id } from "@mnd/core";
import { face_table, face_text, handle_of } from "./face";
import { look_of } from "./look";
import { face_of, type Face } from "./size";
import type { BoxData, CardClass, Scene } from "./scene";
import { resolved } from "./through";

/** How a block reads, derived from what it holds or where it sits. */
export function marks_of(graph: Graph, id: Id): CardClass[] {
  const b = graph.blocks[id];
  const out: CardClass[] = [];
  if (!b) return out;
  const module = base_of(graph, id);
  const ref = resolved(graph, id);
  /** A stand-in for a definition draws as its usages; only its stamp says it stands in. */
  if (module === "reference" && !b.def && !ref.stands_in) {
    out.push("reference");
    /** Missing is naming nothing at all. */
    if (ref.missing) out.push("missing");
  }
  /** A definition, or a stand-in for one: the canvas draws it outlined. A relation definition
   *  reads as a wire swatch, its head where its lines point. */
  const def = b.def ? b.id : ref.stands_in?.id;
  if (def) out.push("definition");
  if (def && domain_of(graph, def) === "relation") {
    out.push("relation");
    if (dir_of(graph, def) !== "none") out.push("directed");
  }
  /** A notation definition is outlined as faintly as a relation's. */
  if (def && notation_of(graph, def)) out.push("notation");
  if (module === "note" && !b.def) out.push("note");
  if (module === "label" && !b.def) out.push("label");
  /** A block that holds wears its shape, whatever kind it descends from; a folder is a box. */
  const shape = shape_of(graph, id);
  if (shape) out.push(shape);
  else if (is_box(graph, id)) out.push("group");
  if (is_flat(graph, id)) out.push("flat");
  if (is_interface(graph, b.id)) {
    out.push("interface");
    const flow = flow_of(graph, b.id);
    if (flow === "in" || flow === "both") out.push("in");
    if (flow === "out" || flow === "both") out.push("out");
  }
  /** Whether it opens onto a drawing of its own: what it holds, what its definition holds, or
   *  what a reference previews. The card wears a stacked edge, and its icon lights. */
  if (opens(graph, id)) out.push("container");
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
  const b = graph.blocks[resolved(graph, id).card]!;
  const look = look_of(graph, id);
  /** The handle, over the name. */
  const alias = handle_of(graph, id, look);
  /** Room at the end of its table for the marks this card wears, previewing or not. */
  const ruled = face === "large" ? face_table(graph, b.id, look, stamps_of(graph, id).length) : null;
  const description = b.description ?? graph.blocks[def_of(graph, b.id) ?? ""]?.description;
  return {
    label: shown_name(graph, id),
    ...(description ? { description } : {}),
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

/** The trail down to the layer, for a breadcrumb: the way the explorer lists it — its package,
 *  then every folder and block on the way, never an annotation. */
export function trail_of(graph: Graph, layer: Id | null): Scene["trail"] {
  return path(graph, layer ?? graph.root)
    .filter((b) => b.id === layer || !is_notation(graph, b.id))
    .map((b) => ({ id: b.id, label: shown_name(graph, b.id) }));
}
