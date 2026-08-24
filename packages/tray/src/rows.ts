/** What the open layer holds, as rows.
 *
 *  **Blocks, interfaces, relationships, boundaries and notes together** — the
 *  tray is the only place a relationship or an interface is found without
 *  hunting for it on the drawing. Everything here is derived from the graph;
 *  the tray stores nothing and writes nothing. */

import { children, edges_in, is_interface, module_of, shown_name,
         type Graph, type Id } from "@mnd/core";

export type Row = {
  id: Id;
  /** Which sort of thing, derived — never stored on the block. */
  kind: string;
  name: string;
  /** What it does or holds, in a few words. */
  what: string;
  /** The definition it names, if any. */
  type: string;
};

/** The head is kind / name / what / type, because **every row answers it**.
 *  Beyond that a column is a field in scope, which is the table's state and
 *  never a definition's. */
export function rows_of(graph: Graph, layer: Id | null): Row[] {
  const out: Row[] = [];

  for (const b of children(graph, layer)) {
    const kind = module_of(graph, b.id);
    const held = children(graph, b.id).filter((k) => !is_interface(k)).length;
    const ports = children(graph, b.id).filter((k) => is_interface(k)).length;
    out.push({
      id: b.id,
      kind: is_interface(b) ? "interface" : kind,
      name: shown_name(graph, b.id),
      what: is_interface(b)
        ? `on the ${b.side} wall${b.flow ? `, ${b.flow}` : ""}`
        : [held ? `holds ${held}` : "", ports ? `${ports} interface${ports > 1 ? "s" : ""}` : ""]
            .filter(Boolean).join(" · "),
      type: b.type ? graph.defs[b.type]?.name ?? b.type : "",
    });

    for (const port of children(graph, b.id)) {
      if (!is_interface(port)) continue;
      out.push({
        id: port.id, kind: "interface", name: shown_name(graph, port.id),
        what: `on ${shown_name(graph, b.id)}, ${port.side} wall`,
        type: port.type ? graph.defs[port.type]?.name ?? port.type : "",
      });
    }
  }

  /** An untyped relationship falls back to its module, the way an unnamed
   *  block falls back to its role — a blank name reads as broken. */
  for (const e of edges_in(graph, layer)) {
    const named = e.type ? graph.defs[e.type]?.name ?? e.type : "";
    out.push({
      id: e.id, kind: e.module,
      name: named || e.module,
      what: `${shown_name(graph, e.from)} → ${shown_name(graph, e.to)}`,
      type: named,
    });
  }

  return out;
}
