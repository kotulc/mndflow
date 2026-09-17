/** What the tray has hold of, and how to read it. */

import { config_of, def_of, edge_module, honours, module_named, module_of, relation_named, shipped,
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
  /** A package's definition resists editing. */
  borrowed: boolean;
};

export function held(graph: Graph, id: Id): Held | null {
  const d = graph.defs[id];
  if (d) return { def: d, block: null, edge: null, fields: d.fields ?? [],
                  borrowed: !!d.from };
  const b = graph.blocks[id];
  if (b) return { def: null, block: b, edge: null, fields: b.fields ?? [],
                  borrowed: false };
  const e = graph.edges[id];
  if (e) return { def: null, block: null, edge: e, fields: [], borrowed: false };
  return null;
}

/** The base kind this is or its usages are, and whether it draws as a run. */
export function kind_of(graph: Graph, id: Id, it: Held): { kind: string; runs: boolean } {
  const { def: d, block: b } = it;
  const kind = d ? (d.group === "relation" ? relation_named(graph, d.id)
                                           : module_named(graph, d.id))
    : b ? module_of(graph, id) : edge_module(graph, id);
  return { kind, runs: honours(kind).includes("line") };
}

/** The definition a holder is about, and what may be done to it. */
export function defined(graph: Graph, id: Id, it: Held, runs: boolean) {
  const { def: d, block: b, edge } = it;
  /** The relation definition this is about: itself, or the one a line follows. */
  const follows = runs ? (d ?? graph.defs[def_of(graph, id) ?? ""]) : undefined;
  const own = runs ? follows : d ?? (b?.type ? graph.defs[b.type] : undefined);
  const mine = !!own && !shipped(own) && !own.from && own.id !== DRAFT;
  /** A base or a default is fixed: never renamed, removed or pinned. */
  const fixed = !own || shipped(own) || own.default !== undefined;
  /** A block or line with looks of its own has a working definition to save. */
  const wip = (edge ? ["line", "style"] : b ? ["card", "style"] : [])
    .some((k) => Object.keys((edge ?? b)?.looks?.[k] ?? {}).length > 0);
  return { follows, own, mine, fixed, wip };
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
