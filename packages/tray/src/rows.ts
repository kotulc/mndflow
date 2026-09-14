/** What the open layer holds, as rows.
 *
 *  **Blocks, interfaces, relationships, boundaries and notes together** — the
 *  tray is the only place a relationship or an interface is found without
 *  hunting for it on the drawing. Everything here is derived from the graph;
 *  the tray stores nothing and writes nothing. */

import { alias_of, base_line, children, def_of, edges_in, is_interface, isa, label_of,
         module_of, path, shipped, shown_name, subtree,
         type Block, type Graph, type Id } from "@mnd/core";

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
 *  never a definition's.
 *
 *  **`deep` is the workspace's reading, and nobody else's.** A layer holds what
 *  sits in it, one level, which is what makes *contents* mean one thing — but
 *  the workspace *is* the whole project, so listing everything under it is not
 *  a widened scope, it is the same scope asked of the root. It is the one
 *  listing that crosses layers, which is why a row then says where it sits. */
export function rows_of(graph: Graph, layer: Id | null, deep = false): Row[] {
  const out: Row[] = [];
  /** A listing has one column for a name, so the mark an unnamed thing wears
   *  joins it there rather than sitting beside it — otherwise every untouched
   *  block in a layer reads the same word. */
  const called = (id: Id) => [shown_name(graph, id), alias_of(graph, id)]
    .filter(Boolean).join(" ");

  /** **Every layer below, or just this one.** Interfaces are reached through
   *  their block either way, so the walk skips them and the loop below picks
   *  them up where they hang. */
  const walk = (at: Id | null): Block[] => children(graph, at)
    .flatMap((b) => (deep && !is_interface(b) ? [b, ...walk(b.id)] : [b]));

  for (const b of walk(layer)) {
    const kind = module_of(graph, b.id);
    const held = children(graph, b.id).filter((k) => !is_interface(k)).length;
    const ports = children(graph, b.id).filter((k) => is_interface(k)).length;
    /** **Where it sits, once the listing crosses layers.** Redundant in a
     *  single layer, where everything shares one — so it joins what the row
     *  already says rather than costing a column that would be blank at home. */
    const within = deep && b.parent && b.parent !== layer
      ? `in ${called(b.parent)}` : "";
    out.push({
      id: b.id,
      sort: is_interface(b) ? "interface"
          : kind === "group" || kind === "note" ? kind : "block",
      kind: is_interface(b) ? "interface" : kind,
      fields: Object.fromEntries((b.fields ?? []).map((f) => [f.name, f.value ?? ""])),
      name: called(b.id),
      what: is_interface(b)
        ? `on the ${b.side} wall${b.flow ? `, ${b.flow}` : ""}`
        : [within, held ? `holds ${held}` : "",
           ports ? `${ports} interface${ports > 1 ? "s" : ""}` : ""]
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
   *  block falls back to its role — a blank name reads as broken.
   *
   *  **Deep takes every run there is**, because the blocks above are now every
   *  block there is: `edges_in` answers *drawn in this layer*, which is a
   *  narrower question than *anywhere under it*. */
  const runs = deep && layer === null
    ? Object.values(graph.edges).sort((a, b) => a.id.localeCompare(b.id))
    : edges_in(graph, layer);
  for (const e of runs) {
    const named = e.type ? graph.defs[e.type]?.name ?? e.type : "";
    out.push({
      id: e.id, sort: "relationship", kind: e.module,
      /** **None, and never any.** An edge holds no values — what a connection
       *  has to say belongs to the blocks at its ends. */
      fields: {},
      name: named || e.module,
      what: `${called(e.from)} → ${called(e.to)}`,
      type: named,
    });
  }

  return out;
}


/** One definition, as the definitions tab lists it. */
export type DefRow = {
  id: Id;
  name: string;
  /** What a line naming it draws; blank for none, and always for a block's. */
  label: string;
  /** What it extends — blank for the base line. */
  extends: Id;
  /** Whether plain lines follow it. */
  base: boolean;
  /** The package it came from, where somebody else wrote it. */
  from: string;
  /** Usages of **this definition only**, never of what extends it. */
  used: number;
};

/** **Every definition of one group the workspace can name**, the base first
 *  and then by name. A roster: an unused one is exactly what it has to show, and
 *  a name refused as taken has to be findable here. */
export function def_rows(graph: Graph, group: "block" | "relation"): DefRow[] {
  const floor = group === "relation" ? base_line(graph)?.id : undefined;
  const used = new Map<string, number>();
  const usages = group === "relation" ? Object.keys(graph.edges)
    : Object.keys(graph.blocks).filter((id) => id !== graph.root);
  for (const id of usages) {
    const d = def_of(graph, id);
    if (d) used.set(d, (used.get(d) ?? 0) + 1);
  }
  return Object.values(graph.defs)
    /** **The shipped floor is not listed**: nobody chose it, and nothing edits it. */
    .filter((d) => d.group === group && !shipped(d))
    .map((d): DefRow => ({
      id: d.id, name: d.name, label: d.label ?? "", extends: d.extends ?? "",
      base: d.id === floor, from: d.from ?? "", used: used.get(d.id) ?? 0,
    }))
    .sort((a, z) => Number(z.base) - Number(a.base) || a.name.localeCompare(z.name));
}

/** One line, as the usages tab lists it. */
export type UsageRow = {
  id: Id;
  name: string;
  /** Which two things it joins. */
  what: string;
  /** Where in the project it is, as a path. */
  layer: string;
  /** The module it is drawn by. */
  module: string;
  /** Every definition it resolves through, nearest first. */
  chain: Id[];
  /** The definition it names — blank where it follows the base. */
  def: Id;
  /** What it draws beside itself. */
  label: string;
};

/** The lines in a layer, or **every line there is** for the workspace — the one
 *  holder whose reading is the whole project. */
export function usage_rows(graph: Graph, layer: Id | null, deep: boolean): UsageRow[] {
  const called = (id: Id) => [shown_name(graph, id), alias_of(graph, id)]
    .filter(Boolean).join(" ");
  const lines = deep ? Object.values(graph.edges) : edges_in(graph, layer);
  return lines.map((e) => ({
    id: e.id,
    name: called(e.id),
    what: `${called(e.from)} → ${called(e.to)}`,
    layer: layer_path(graph, e.from),
    module: e.module,
    chain: isa(graph, def_of(graph, e.id)).map((d) => d.id),
    def: e.type && e.type !== base_line(graph)?.id ? e.type : "",
    label: label_of(graph, e.id),
  })).sort((a, z) => a.layer.localeCompare(z.layer) || a.id.localeCompare(z.id));
}

/** The blocks in a layer, or **every block there is** for the workspace, as
 *  the usages tab lists them. `what` is the kind, since a block joins nothing. */
export function block_usage_rows(graph: Graph, layer: Id | null, deep: boolean): UsageRow[] {
  const called = (id: Id) => [shown_name(graph, id), alias_of(graph, id)]
    .filter(Boolean).join(" ");
  const blocks = deep
    ? subtree(graph, graph.root).filter((id) => id !== graph.root).map((id) => graph.blocks[id]!)
    : children(graph, layer);
  return blocks.map((b) => ({
    id: b.id,
    name: called(b.id),
    what: module_of(graph, b.id),
    layer: layer_path(graph, b.id),
    module: module_of(graph, b.id),
    chain: isa(graph, def_of(graph, b.id)).map((d) => d.id),
    def: b.type && !shipped(graph.defs[b.type] ?? { id: b.type, group: "block", name: "" })
      ? b.type : "",
    label: "",
  })).sort((a, z) => a.layer.localeCompare(z.layer) || a.id.localeCompare(z.id));
}

/** Where a run sits, named by the layer holding the block at its end. The
 *  workspace itself reads as its own name rather than as an empty path. */
function layer_path(graph: Graph, end: Id): string {
  const holder = graph.blocks[end]?.parent;
  if (!holder) return shown_name(graph, graph.root);
  return path(graph, holder).map((b) => shown_name(graph, b.id)).join(" / ");
}
