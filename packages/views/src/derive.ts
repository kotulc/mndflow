/** What every module derives the same way. */

import { alias_of, schema_def, schema_of, is_container, is_header, is_interface, is_named, is_reference,
         base_of, path, role_of, shown_name, stamps_of, stands_for,
         type Graph, type Id } from "@mnd/core";
import { look_of } from "./look";
import type { BoxData, Listed, Trait, Scene } from "./scene";

/** How a block reads, derived from what it holds or where it sits. */
export function marks_of(graph: Graph, id: Id): Trait[] {
  const b = graph.blocks[id];
  const out: Trait[] = [];
  /** A holder wears the mark of its shape and nothing else. */
  if (!b) {
    const h = graph.holders[id];
    return h ? [h.arrangement === "grid" ? "grid" : "group"] : out;
  }
  const module = base_of(graph, id);
  if (module === "reference") {
    out.push("reference");
    /** Missing is naming nothing at all: a stand-in for a definition or a package names no block. */
    const other = b.of && (graph.defs[b.of] || graph.packages[b.of]);
    if (!other && (!stands_for(graph, id) || stands_for(graph, id)!.id === id)) out.push("missing");
  }
  if (module === "note") out.push("note");
  if (module === "group") out.push("group");
  if (module === "grid") out.push("grid");
  if (is_interface(b)) {
    out.push("interface");
    if (b.flow === "in" || b.flow === "both") out.push("in");
    if (b.flow === "out" || b.flow === "both") out.push("out");
  }
  if (is_container(graph, id) && !is_reference(b)) out.push("container");
  /** Wearing its type rather than a name somebody chose. */
  if (!is_named(graph, id)) out.push("unnamed");
  if (is_header(b)) out.push("header");
  return out;
}

/** Everything a drawn block carries beyond where it sits. */
export function carried(graph: Graph, id: Id): BoxData {
  const b = graph.blocks[id] ?? graph.holders[id]!;
  const look = look_of(graph, id);
  /** The handle, beside the name rather than inside it. */
  const alias = look.alias === undefined ? alias_of(graph, id)
    : look.alias ? alias_of(graph, id, true) : "";
  return {
    label: shown_name(graph, id),
    ...(alias ? { alias } : {}),
    role: role_of(graph, id),
    ...(stamps_of(graph, id).length ? { stamps: stamps_of(graph, id) } : {}),
    ...("type" in b && b.type ? { def: b.type } : {}),
    ...(link_of(graph, id) ? { link: link_of(graph, id) } : {}),
    marks: marks_of(graph, id),
    look,
    ...(look.fields ? { fields: listed(graph, id) } : {}),
    ...(look.body && "body" in b && b.body ? { body: b.body } : {}),
  };
}

/** What a card's compartment lists. A stand-in for a definition lists its schema, and so does a
 *  block holding usages of one — a table lists its columns. Anything else lists the schema it
 *  answers, with its values, then whatever it carries beyond it. */
export function listed(graph: Graph, id: Id): Listed[] {
  const b = graph.blocks[id];
  if (!b) return [];
  const form_only = (def: Id) => schema_of(graph, def).map(({ name, form }) => ({ name, form }));
  if (b.of && graph.defs[b.of]) return form_only(b.of);
  const held = schema_def(graph, id);
  if (held && held !== b.type) return form_only(held);
  const own = b.fields ?? [];
  const schema = schema_of(graph, b.type);
  const extra = own.filter((f) => !schema.some((s) => s.name === f.name));
  return [...schema, ...extra].map(({ name, form }) => {
    const value = own.find((f) => f.name === name)?.value;
    return { name, form, ...(value ? { value } : {}) };
  });
}

/** The field a box's link is read from. */
export const SOURCE = "source";

/** Where a block points, if it says: the source slot first, then the field that predates it. */
export function link_of(graph: Graph, id: Id): string | undefined {
  const b = graph.blocks[id];
  if (b?.source) return b.source;
  const said = b?.fields?.find((f) => f.name === SOURCE && f.form === "link");
  return said?.value || undefined;
}

/** The trail from the root down to the layer, for a breadcrumb. */
export function trail_of(graph: Graph, layer: Id | null): Scene["trail"] {
  return layer === null
    ? [{ id: graph.root, label: shown_name(graph, graph.root) }]
    : path(graph, layer).map((b) => ({ id: b.id, label: shown_name(graph, b.id) }));
}
