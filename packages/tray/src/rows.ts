/** What the open layer holds, as rows. */

import { alias_name, all_defs, alias_of, children, def_at, definition_uses, domain_of, edge_base,
         edges_in, frozen, is_base, is_box, is_holder, base_of, package_of, part_id, ports_on,
         shown_name, type_name, type Block, type Domain, type Graph, type Id } from "@mnd/core";

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

  /** Every layer below, or just this one in reading order — a region or a group heading what
   *  it holds, since a room's blocks list here rather than in the explorer. */
  const walk = (at: Id | null): Block[] => children(graph, at)
    .flatMap((b) => (deep || is_box(graph, b.id) ? [b, ...walk(b.id)] : [b]));

  for (const b of walk(layer)) {
    const kind = base_of(graph, b.id);
    const held = children(graph, b.id).length;
    const worn = ports_on(graph, b.id);
    const ports = worn.length;
    /** Where it sits, once it sits in a region or below the room listed. */
    const within = b.parent && b.parent !== layer ? `in ${called(b.parent)}` : "";
    out.push({
      id: b.id,
      sort: is_holder(graph, b.id) ? "group" : kind === "note" ? kind : "block",
      kind,
      fields: Object.fromEntries((b.values ?? []).map((f) => [f.name, f.value ?? ""])),
      name: called(b.id),
      what: [within, held ? `holds ${held}` : "",
             ports ? `${ports} interface${ports > 1 ? "s" : ""}` : ""]
              .filter(Boolean).join(" · "),
      type: plain(graph, b.type) ? "" : graph.blocks[b.type!]?.name ?? b.type!,
    });

    /** The interfaces it wears, each under its drawn id. */
    for (const port of worn) {
      out.push({
        id: part_id(b.id, port.id), sort: "interface", kind: "interface",
        name: port.name ?? (port.alias ? alias_name("interface", port.alias) : "interface"),
        fields: {},
        what: `on ${called(b.id)}, ${wall(port.side)}${port.flow ? `, ${port.flow}` : ""}`,
        type: port.type ? type_name(graph, port.type) : "",
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
  const from = (id: Id) => (frozen(graph, id) ? graph.blocks[package_of(graph, id)]?.name ?? "" : "");
  return all_defs(graph)
    .map((d): DefRow => ({
      id: d.id, group: domain_of(graph, d.id), name: d.name,
      extends: d.type ?? "", base: is_base(d.id),
      from: from(d.id), used: definition_uses(graph, d.id).length,
    }))
    .sort((a, z) => Number(!!a.from) - Number(!!z.from) || a.name.localeCompare(z.name));
}

/** Whether a stored type is plain: nothing, or a base. */
function plain(graph: Graph, type: Id | undefined): boolean {
  return !type || (!!def_at(graph, type) && is_base(type));
}

/** Where an interface sits: the wall it was placed on, or wherever it places itself. */
function wall(side: string | undefined): string {
  return side ? `on the ${side} wall` : "placed by its lines";
}
