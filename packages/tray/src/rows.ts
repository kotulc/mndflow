/** What the open layer holds, as rows.
 *
 *  **Blocks, interfaces, relationships, boundaries and notes together** — the
 *  tray is the only place a relationship or an interface is found without
 *  hunting for it on the drawing. Everything here is derived from the graph;
 *  the tray stores nothing and writes nothing. */

import { alias_of, children, def_of, default_for, edges_in, is_interface, is_template, isa,
         module_of, path, pinned_lines, shown_name, stereotypes, template_of, templates,
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


/** One relation template, as the template tab's table lists it. */
export type TemplateRow = {
  id: Id;
  name: string;
  /** What it refines, by name — blank where it refines a base module. */
  extends: string;
  /** Whether it is offered on the rail. */
  pinned: boolean;
  /** Whether plain lines draw through it. */
  base: boolean;
  /** Lines drawing through it: naming it, a type under it, or nothing at all
   *  and following the base. */
  used: number;
};

/** The workspace's relation templates, **the base one first**, with how many
 *  lines draw through each — counted down the chain, since a template exists
 *  to be extended. */
export function template_rows(graph: Graph): TemplateRow[] {
  const listed = pinned_lines(graph).map((d) => d.id);
  const base = template_of(graph, default_for(graph, "line", "relation"))?.id;
  return templates(graph).map((d) => ({
    id: d.id,
    name: d.name,
    extends: d.extends ? graph.defs[d.extends]?.name ?? d.extends : "",
    pinned: listed.includes(d.id),
    base: d.id === base,
    used: Object.values(graph.edges)
      .filter((e) => isa(graph, def_of(graph, e.id)).some((x) => x.id === d.id)).length,
  })).sort((a, z) => Number(z.base) - Number(a.base));
}

/** One type, as the types tab lists it. */
export type StereotypeRow = {
  id: Id;
  name: string;
  /** The template it extends, so a row can offer to change it. */
  template: Id;
  /** Whether plain lines follow it. */
  base: boolean;
  /** Lines naming it — or, for the base type, naming nothing. */
  used: number;
};

/** Every type in the workspace, **used or not**, the base one first. A roster:
 *  an unused type is exactly what it has to be able to show. */
export function stereotype_rows(graph: Graph): StereotypeRow[] {
  const counts = new Map<string, number>();
  for (const e of Object.values(graph.edges)) {
    const d = def_of(graph, e.id);
    if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return stereotypes(graph).map((d) => ({
    id: d.id,
    name: d.name,
    template: template_of(graph, d.id)?.id ?? "",
    base: !!d.default,
    used: counts.get(d.id) ?? 0,
  })).sort((a, z) => Number(z.base) - Number(a.base));
}

/** One line, as the usages tab lists it. */
export type UsageRow = {
  id: Id;
  name: string;
  /** Which two things it joins. */
  what: string;
  /** Where in the project it is, as a path. */
  layer: string;
  /** The template it draws through, by name. */
  template: string;
  /** The type it names — blank where it follows the base or names a template. */
  type: Id;
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
    template: template_of(graph, def_of(graph, e.id))?.name ?? "",
    type: e.type && graph.defs[e.type] && !is_template(graph.defs[e.type]!) ? e.type : "",
  })).sort((a, z) => a.layer.localeCompare(z.layer) || a.id.localeCompare(z.id));
}

/** Where a run sits, named by the layer holding the block at its end. The
 *  workspace itself reads as its own name rather than as an empty path. */
function layer_path(graph: Graph, end: Id): string {
  const holder = graph.blocks[end]?.parent;
  if (!holder) return shown_name(graph, graph.root);
  return path(graph, holder).map((b) => shown_name(graph, b.id)).join(" / ");
}
