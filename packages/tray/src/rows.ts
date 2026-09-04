/** What the open layer holds, as rows.
 *
 *  **Blocks, interfaces, relationships, boundaries and notes together** — the
 *  tray is the only place a relationship or an interface is found without
 *  hunting for it on the drawing. Everything here is derived from the graph;
 *  the tray stores nothing and writes nothing. */

import { alias_of, children, edges_in, is_interface, module_of, shown_name,
         type Graph, type Id } from "@mnd/core";

/** What a row is, which is also how it is filtered. Coarser than `kind`: a
 *  folder and a container are both blocks to somebody narrowing a list. */
export type Sort = "block" | "interface" | "relationship" | "group" | "note";

export type Row = {
  id: Id;
  sort: Sort;
  /** Which sort of thing, derived — never stored on the block. */
  kind: string;
  name: string;
  /** What it does or holds, in a few words. */
  what: string;
  /** The definition it names, if any. */
  type: string;
  /** Every value it carries, by field name. **The table reads a column out of
   *  this**, so adding one costs no second pass over the graph. */
  fields: Record<string, string>;
};

/** The head is kind / name / what / type, because **every row answers it**.
 *  Beyond that a column is a field in scope, which is the table's state and
 *  never a definition's. */
export function rows_of(graph: Graph, layer: Id | null): Row[] {
  const out: Row[] = [];
  /** A listing has one column for a name, so the mark an unnamed thing wears
   *  joins it there rather than sitting beside it — otherwise every untouched
   *  block in a layer reads the same word. */
  const called = (id: Id) => [shown_name(graph, id), alias_of(graph, id)]
    .filter(Boolean).join(" ");

  for (const b of children(graph, layer)) {
    const kind = module_of(graph, b.id);
    const held = children(graph, b.id).filter((k) => !is_interface(k)).length;
    const ports = children(graph, b.id).filter((k) => is_interface(k)).length;
    out.push({
      id: b.id,
      sort: is_interface(b) ? "interface"
          : kind === "group" || kind === "note" ? kind : "block",
      kind: is_interface(b) ? "interface" : kind,
      fields: Object.fromEntries((b.fields ?? []).map((f) => [f.name, f.value ?? ""])),
      name: called(b.id),
      what: is_interface(b)
        ? `on the ${b.side} wall${b.flow ? `, ${b.flow}` : ""}`
        : [held ? `holds ${held}` : "", ports ? `${ports} interface${ports > 1 ? "s" : ""}` : ""]
            .filter(Boolean).join(" · "),
      type: b.type ? graph.defs[b.type]?.name ?? b.type : "",
    });

    for (const port of children(graph, b.id)) {
      if (!is_interface(port)) continue;
      out.push({
        id: port.id, sort: "interface", kind: "interface", name: called(port.id),
        fields: Object.fromEntries((port.fields ?? []).map((f) => [f.name, f.value ?? ""])),
        what: `on ${called(b.id)}, ${port.side} wall`,
        type: port.type ? graph.defs[port.type]?.name ?? port.type : "",
      });
    }
  }

  /** An untyped relationship falls back to its module, the way an unnamed
   *  block falls back to its role — a blank name reads as broken. */
  for (const e of edges_in(graph, layer)) {
    const named = e.type ? graph.defs[e.type]?.name ?? e.type : "";
    out.push({
      id: e.id, sort: "relationship", kind: e.module,
      fields: Object.fromEntries((e.fields ?? []).map((f) => [f.name, f.value ?? ""])),
      name: named || e.module,
      what: `${called(e.from)} → ${called(e.to)}`,
      type: named,
    });
  }

  return out;
}
