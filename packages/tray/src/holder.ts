/** What the tray has hold of, and how to read it. */

import { all_defs, config_of, def_at, def_of, domain_of, edge_base, frozen, honours, is_base,
         may_retype, block_base, base_of, package_of, relation_base,
         type Block, type Definition,
         type Graph, type Id, type Relation } from "@mnd/core";

export type Held = {
  /** The definition, where the id names one. */
  def: Definition | null;
  block: Block | null;
  edge: Relation | null;
};

export function held(graph: Graph, id: Id): Held | null {
  const d = def_at(graph, id);
  if (d) return { def: d, block: null, edge: null };
  const b = graph.blocks[id];
  if (b) return { def: null, block: b, edge: null };
  const e = graph.edges[id];
  if (e) return { def: null, block: null, edge: e };
  return null;
}

/** The base kind this is or its usages are, and whether it draws as a run. */
export function kind_of(graph: Graph, id: Id, it: Held): { kind: string; runs: boolean } {
  const { def: d, block: b } = it;
  const kind = d ? (domain_of(graph, d.id) === "relation" ? relation_base(graph, d.id)
                                                          : block_base(graph, d.id))
    : b ? base_of(graph, id) : edge_base(graph, id);
  return { kind, runs: honours(kind).includes("line") };
}

/** The definition a holder is about, and what may be done to it. */
export function defined(graph: Graph, id: Id, it: Held, runs: boolean) {
  const { def: d, block: b } = it;
  /** The relation definition this is about: itself, or the one a line follows. */
  const follows = runs ? (d ?? def_at(graph, def_of(graph, id))) : undefined;
  const own = runs ? follows : d ?? def_at(graph, b?.type);
  const mine = !!own && !frozen(graph, own.id);
  /** What came frozen is fixed: never renamed or removed. */
  const fixed = !own || frozen(graph, own.id);
  return { follows, own, mine, fixed };
}

/** Where a definition lives, as a path: its package, then its name. **Two definitions may wear
 *  one name** in two packages, so this is what tells them apart, and every picker shows it. */
export function def_path(graph: Graph, d: Definition): string {
  const pkg = graph.blocks[package_of(graph, d.id)];
  return `${pkg?.name ?? pkg?.id ?? ""}/${d.name}`;
}

/** Every definition an element may follow. **The bases head the list**, then the rest by name:
 *  a block descends from a base whether or not anybody named one, so leaving them out left the
 *  first link of every chain unpickable. */
export function types_for(graph: Graph, id: Id): Definition[] {
  const edge = graph.edges[id];
  const rank = (d: Definition) => (is_base(d.id) ? 0 : 1);
  return all_defs(graph)
    .filter((d) => d.id !== id && (edge
      ? domain_of(graph, d.id) === "relation" && relation_base(graph, d.id) === edge_base(graph, id)
      : domain_of(graph, d.id) === "block" && may_retype(graph, id, d.id)))
    .sort((a, z) => rank(a) - rank(z) || a.name.localeCompare(z.name));
}

/** The three readings every look control needs, over whichever holder this is. */
export function reading(graph: Graph, id: Id, it: Held) {
  const { def: d } = it;
  /** Its own word: a definition's settings, or a block's or a line's override. */
  const said = (key: string, name: string) =>
    (d ?? it.block ?? it.edge)?.settings?.[key]?.[name];
  /** What it inherits, for the answers it has not overridden. */
  const chain = (key: string, name: string) => {
    const from = config_of(graph, d ? d.type : def_of(graph, id), key)[name];
    return from === undefined || from === null ? ""
      : typeof from === "object" && !Array.isArray(from) ? JSON.stringify(from) : String(from);
  };
  const now = (key: string, name: string, fallback: string) =>
    String(said(key, name) ?? chain(key, name) ?? "") || fallback;
  return { said, chain, now };
}
