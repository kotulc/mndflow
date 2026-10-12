/** What the open layer holds, as rows. */

import { all_defs, alias_of, children, def_at, def_of, domain_of, edge_base, edges_in, frozen,
         is_base, is_holder, is_interface, isa, base_of, package_of, path, shown_name, subtree,
         type Block, type Domain, type Graph, type Id } from "@mnd/core";

/** What a row is, which is also how it is filtered. */
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
  /** Every value it carries, by field name. */
  fields: Record<string, string>;
};

/** The head is kind / name / what / type, because every row answers it. */
export function rows_of(graph: Graph, layer: Id | null, deep = false): Row[] {
  const out: Row[] = [];
  /** The name column carries an unnamed element's handle. */
  const called = (id: Id) => [shown_name(graph, id), alias_of(graph, id)]
    .filter(Boolean).join(" ");

  /** Every layer below, or just this one. */
  const walk = (at: Id | null): Block[] => children(graph, at)
    .flatMap((b) => (deep && !is_interface(graph, b.id) ? [b, ...walk(b.id)] : [b]));

  for (const b of walk(layer)) {
    const kind = base_of(graph, b.id);
    const held = children(graph, b.id).filter((k) => !is_interface(graph, k.id)).length;
    const ports = children(graph, b.id).filter((k) => is_interface(graph, k.id)).length;
    /** Where it sits, once the listing crosses layers. */
    const within = deep && b.parent && b.parent !== layer
      ? `in ${called(b.parent)}` : "";
    out.push({
      id: b.id,
      sort: is_interface(graph, b.id) ? "interface"
          : is_holder(graph, b.id) ? "group" : kind === "note" ? kind : "block",
      kind: is_interface(graph, b.id) ? "interface" : kind,
      fields: Object.fromEntries((b.values ?? []).map((f) => [f.name, f.value ?? ""])),
      name: called(b.id),
      what: is_interface(graph, b.id)
        ? `${wall(b.side)}${b.flow ? `, ${b.flow}` : ""}`
        : [within, held ? `holds ${held}` : "",
           ports ? `${ports} interface${ports > 1 ? "s" : ""}` : ""]
            .filter(Boolean).join(" · "),
      type: plain(graph, b.type) ? "" : graph.blocks[b.type!]?.name ?? b.type!,
    });

    for (const port of children(graph, b.id)) {
      if (!is_interface(graph, port.id)) continue;
      out.push({
        id: port.id, sort: "interface", kind: "interface", name: called(port.id),
        fields: Object.fromEntries((port.values ?? []).map((f) => [f.name, f.value ?? ""])),
        what: `on ${called(b.id)}, ${wall(port.side)}`,
        type: plain(graph, port.type) ? "" : graph.blocks[port.type!]?.name ?? port.type!,
      });
    }
  }

  /** An untyped relationship reads its module. */
  const runs = deep && layer === null
    ? Object.values(graph.edges).sort((a, b) => a.id.localeCompare(b.id))
    : edges_in(graph, layer);
  for (const e of runs) {
    const named = plain(graph, e.type) ? "" : graph.blocks[e.type!]?.name ?? e.type!;
    out.push({
      id: e.id, sort: "relationship", kind: edge_base(graph, e.id),
      /** An edge holds no values. */
      fields: {},
      /** Its own name, else its type's, else its module — as every surface writes it. */
      name: called(e.id),
      what: `${called(e.from)} → ${called(e.to)}`,
      type: named,
    });
  }

  return out;
}


/** One definition, as the definitions and types tabs list it. */
export type DefRow = {
  id: Id;
  group: Domain;
  name: string;
  /** What it extends. */
  extends: Id;
  /** Whether it is a base, which extends nothing. */
  base: boolean;
  /** The package it sits in, where that is not the workspace's own. */
  from: string;
  /** Usages of this definition only, never of what extends it. */
  used: number;
};

/** **Every definition the workspace can name**, a package's and the floor's among them — the
 *  workspace's own first, then by name. Hiding the floor only made `all` a smaller word for
 *  `workspace`, and left the kinds every block descends from unreadable. */
export function def_rows(graph: Graph): DefRow[] {
  const used = new Map<string, number>();
  const usages = [...Object.keys(graph.edges),
                  ...Object.values(graph.blocks).filter((b) => !b.def && b.parent).map((b) => b.id)];
  for (const id of usages) {
    const d = def_of(graph, id);
    if (d) used.set(d, (used.get(d) ?? 0) + 1);
  }
  const from = (id: Id) => (frozen(graph, id) ? graph.blocks[package_of(graph, id)]?.name ?? "" : "");
  return all_defs(graph)
    .map((d): DefRow => ({
      id: d.id, group: domain_of(graph, d.id), name: d.name,
      extends: d.type ?? "", base: is_base(d.id),
      from: from(d.id), used: used.get(d.id) ?? 0,
    }))
    .sort((a, z) => Number(!!a.from) - Number(!!z.from) || a.name.localeCompare(z.name));
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
  /** The definition it names — blank where it follows its default. */
  def: Id;
};

/** The lines in a layer, or every line for the workspace. */
export function usage_rows(graph: Graph, layer: Id | null, deep: boolean): UsageRow[] {
  const called = (id: Id) => [shown_name(graph, id), alias_of(graph, id)]
    .filter(Boolean).join(" ");
  const lines = deep ? Object.values(graph.edges) : edges_in(graph, layer);
  return lines.map((e) => ({
    id: e.id,
    name: called(e.id),
    what: `${called(e.from)} → ${called(e.to)}`,
    layer: layer_path(graph, e.from),
    module: edge_base(graph, e.id),
    chain: isa(graph, def_of(graph, e.id)).map((d) => d.id),
    def: plain(graph, e.type) ? "" : e.type!,
  })).sort((a, z) => a.layer.localeCompare(z.layer) || a.id.localeCompare(z.id));
}

/** The blocks in a layer, or every block there is for the workspace, as the usages tab lists them. */
export function block_usage_rows(graph: Graph, layer: Id | null, deep: boolean): UsageRow[] {
  const called = (id: Id) => [shown_name(graph, id), alias_of(graph, id)]
    .filter(Boolean).join(" ");
  const blocks = deep
    ? subtree(graph, graph.root).filter((id) => id !== graph.root).map((id) => graph.blocks[id]!)
    : children(graph, layer);
  return blocks.map((b) => ({
    id: b.id,
    name: called(b.id),
    what: base_of(graph, b.id),
    layer: layer_path(graph, b.id),
    module: base_of(graph, b.id),
    chain: isa(graph, def_of(graph, b.id)).map((d) => d.id),
    def: plain(graph, b.type) ? "" : b.type!,
  })).sort((a, z) => a.layer.localeCompare(z.layer) || a.id.localeCompare(z.id));
}

/** Whether a stored type is plain: nothing, or a base. */
function plain(graph: Graph, type: Id | undefined): boolean {
  return !type || (!!def_at(graph, type) && is_base(type));
}

/** Where a run sits, named by the layer holding the block at its end. */
function layer_path(graph: Graph, end: Id): string {
  const holder = graph.blocks[end]?.parent;
  if (!holder) return shown_name(graph, graph.root);
  return path(graph, holder).map((b) => shown_name(graph, b.id)).join(" / ");
}

/** Where an interface sits: the wall it was placed on, or wherever it places itself. */
function wall(side: string | undefined): string {
  return side ? `on the ${side} wall` : "placed by its lines";
}
