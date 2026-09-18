/** What the tray has hold of, and how to read it. */

import { config_of, def_of, default_for, edge_base, honours, may_retype, block_base, base_of,
         outside, relation_base, shipped,
         type Block, type Definition, type Field, type FieldDef,
         type Graph, type Id, type Relation } from "@mnd/core";
import { DRAFT } from "./draft";

export type Held = {
  /** The definition, where the id names one. */
  def: Definition | null;
  block: Block | null;
  edge: Relation | null;
  /** What it carries — a block's values, or a definition's schema. */
  fields: readonly (Field | FieldDef)[];
};

export function held(graph: Graph, id: Id): Held | null {
  const d = graph.defs[id];
  if (d) {
    /** What a definition declares is whatever the workspace's word about it says, where one was
     *  said: an edit to a package's definition lands there, so it is what reads back. */
    const said = graph.defs[default_for(graph, d.id, d.group) ?? ""] ?? d;
    return { def: d, block: null, edge: null, fields: said.fields ?? [] };
  }
  const b = graph.blocks[id];
  if (b) return { def: null, block: b, edge: null, fields: b.fields ?? [] };
  const e = graph.edges[id];
  if (e) return { def: null, block: null, edge: e, fields: [] };
  return null;
}

/** The base kind this is or its usages are, and whether it draws as a run. */
export function kind_of(graph: Graph, id: Id, it: Held): { kind: string; runs: boolean } {
  const { def: d, block: b } = it;
  const kind = d ? (d.group === "relation" ? relation_base(graph, d.id)
                                           : block_base(graph, d.id))
    : b ? base_of(graph, id) : edge_base(graph, id);
  return { kind, runs: honours(kind).includes("line") };
}

/** The definition a holder is about, and what may be done to it. */
export function defined(graph: Graph, id: Id, it: Held, runs: boolean) {
  const { def: d, block: b, edge } = it;
  /** The relation definition this is about: itself, or the one a line follows. */
  const follows = runs ? (d ?? graph.defs[def_of(graph, id) ?? ""]) : undefined;
  const own = runs ? follows : d ?? (b?.type ? graph.defs[b.type] : undefined);
  const mine = !!own && !outside(own) && own.id !== DRAFT;
  /** What came from outside, and a word about it, is fixed: never renamed, removed or pinned. */
  const fixed = !own || outside(own) || own.default !== undefined;
  /** A block or line with looks of its own has a working definition to save. */
  const wip = (edge ? ["line", "style"] : b ? ["card", "style"] : [])
    .some((k) => Object.keys((edge ?? b)?.looks?.[k] ?? {}).length > 0);
  return { follows, own, mine, fixed, wip };
}

/** Every definition an element may follow: its own kind's, defaults first, then by name. */
export function types_for(graph: Graph, id: Id): Definition[] {
  const edge = graph.edges[id];
  return Object.values(graph.defs)
    .filter((d) => !shipped(d) && (edge
      ? d.group === "relation" && relation_base(graph, d.id) === edge_base(graph, id)
      : d.group === "block" && may_retype(graph, id, d.id)))
    .sort((a, z) => Number(z.default !== undefined) - Number(a.default !== undefined)
                    || a.name.localeCompare(z.name));
}

/** The three readings every look control needs, over whichever holder this is. */
export function reading(graph: Graph, id: Id, it: Held) {
  const { def: d } = it;
  /** A block's or a line's own look. */
  const said = (key: string, name: string) =>
    d ? d.components?.[key]?.[name] : (it.block ?? it.edge)?.looks?.[key]?.[name];
  /** What it inherits, for the answers it has not overridden. */
  const chain = (key: string, name: string) => {
    const from = config_of(graph, d ? d.extends : def_of(graph, id), key)[name];
    return from === undefined || from === null ? "" : String(from);
  };
  const now = (key: string, name: string, fallback: string) =>
    String(said(key, name) ?? chain(key, name) ?? "") || fallback;
  return { said, chain, now };
}
