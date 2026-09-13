/** What the open layer holds, as rows.
 *
 *  **Blocks, interfaces, relationships, boundaries and notes together** — the
 *  tray is the only place a relationship or an interface is found without
 *  hunting for it on the drawing. Everything here is derived from the graph;
 *  the tray stores nothing and writes nothing. */

import { alias_of, children, edges_in, is_interface, is_template, isa, module_of, path,
         pinned_lines, shown_name, stereotypes, templates,
         type Block, type Definition, type Graph, type Id } from "@mnd/core";

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


/** One relation template, as the templates tab lists it. */
export type TemplateRow = {
  id: Id;
  name: string;
  /** What it refines, by name — blank where it refines a base module. */
  extends: string;
  /** Whether it is offered on the rail. */
  pinned: boolean;
  /** Runs drawing through it, whether they name it or a stereotype under it. */
  used: number;
};

/** The workspace's relation templates: **what a line can be made to look
 *  like**, with what draws through each.
 *
 *  **The count reaches down the chain**, because a template's whole purpose is
 *  to be extended — counting only the runs that name it directly would report
 *  zero for the one template every line in the project resolves through. */
export function template_rows(graph: Graph): TemplateRow[] {
  const listed = pinned_lines(graph).map((d) => d.id);
  return templates(graph).map((d) => ({
    id: d.id,
    name: d.name,
    extends: d.extends ? graph.defs[d.extends]?.name ?? d.extends : "",
    pinned: listed.includes(d.id),
    used: Object.values(graph.edges)
      .filter((e) => isa(graph, e.type).some((x) => x.id === d.id)).length,
  }));
}

/** One stereotype, as the usages roster lists it. */
export type StereotypeRow = {
  id: Id;
  name: string;
  /** The template it draws through, by name. */
  template: string;
  /** Runs naming it. **Directly**, which is the only reading a stereotype has:
   *  nothing extends one, because a definition that grows a look is a template. */
  used: number;
};

/** Every stereotype in the workspace, **used or not**.
 *
 *  A roster rather than a listing of runs: an unused stereotype is exactly what
 *  a roster has to be able to show, and a run cannot be unused. Templates are
 *  left out, so a count here never has to say whether it means direct usages or
 *  everything down the chain. */
export function stereotype_rows(graph: Graph): StereotypeRow[] {
  const counts = new Map<string, number>();
  for (const e of Object.values(graph.edges)) {
    if (e.type) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  }
  return stereotypes(graph).map((d) => ({
    id: d.id,
    name: d.name,
    template: chain_template(graph, d),
    used: counts.get(d.id) ?? 0,
  }));
}

/** One run drawing through a stereotype, wherever it sits. */
export type UsageRow = {
  id: Id;
  name: string;
  /** Which two things it joins. */
  what: string;
  /** Where in the project it is, as a path. **Necessary, not decoration** — a
   *  run listed across layers is unreadable without saying which one. */
  layer: string;
  /** The definition it names, so a row can offer to change it. */
  type: string;
};

/** Every run naming this definition, **across the whole project**.
 *
 *  Not `edges_in`, which is one layer by design — this is the one listing that
 *  crosses them, because a stereotype is a workspace fact and the runs wearing
 *  it are wherever somebody drew them. */
export function usage_rows(graph: Graph, type: Id | null): UsageRow[] {
  const called = (id: Id) => [shown_name(graph, id), alias_of(graph, id)]
    .filter(Boolean).join(" ");
  return Object.values(graph.edges)
    .filter((e) => !!type && e.type === type)
    .map((e) => ({
      id: e.id,
      name: [shown_name(graph, e.id), alias_of(graph, e.id)].filter(Boolean).join(" "),
      what: `${called(e.from)} → ${called(e.to)}`,
      layer: layer_path(graph, e.from),
      type: e.type ?? "",
    }))
    .sort((a, b) => a.layer.localeCompare(b.layer) || a.id.localeCompare(b.id));
}

/** The template a stereotype draws through: **the nearest link up the chain
 *  that says how anything looks.** Blank where nothing above it does. */
function chain_template(graph: Graph, d: Definition): string {
  for (const up of isa(graph, d.extends)) {
    if (is_template(up)) return up.name;
  }
  return "";
}

/** Where a run sits, named by the layer holding the block at its end. The
 *  workspace itself reads as its own name rather than as an empty path. */
function layer_path(graph: Graph, end: Id): string {
  const holder = graph.blocks[end]?.parent;
  if (!holder) return shown_name(graph, graph.root);
  return path(graph, holder).map((b) => shown_name(graph, b.id)).join(" / ");
}
