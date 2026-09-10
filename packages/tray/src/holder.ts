/** What the tray has hold of, and how to read it.
 *
 *  **One id, three holders.** A block, a relationship or a definition out of the
 *  vocabulary — each answers the same questions, and `Block.looks` and
 *  `Definition.components` are the same bag one layer apart. Asked once here, so
 *  no panel below has to know which of the three it was given. */

import { config_of, def_of, type Block, type Definition, type Field, type FieldDef,
         type Graph, type Id, type Relation } from "@mnd/core";

export type Held = {
  /** The definition, where the id names one. */
  def: Definition | null;
  block: Block | null;
  edge: Relation | null;
  /** What it carries — a usage's values, or a definition's schema. */
  fields: readonly (Field | FieldDef)[];
  /** **A package resists editing.** Somebody else's vocabulary, so every action
   *  refuses to write it and a panel says so rather than offering controls that
   *  will be turned down. */
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
  if (e) return { def: null, block: null, edge: e, fields: e.fields ?? [],
                  borrowed: false };
  return null;
}

/** The three readings every look control needs, over whichever holder this is.
 *
 *  **What it says, what it inherits, and what it draws as.** The card is painted
 *  from the third, so a preview and the drawing cannot disagree about what a
 *  trait resolves to. */
export function reading(graph: Graph, id: Id, it: Held) {
  const { def: d } = it;
  const said = (key: string, name: string) =>
    d ? d.components?.[key]?.[name] : it.block?.looks?.[key]?.[name];
  /** What it inherits, for the answers it has not overridden. **Shown in the
   *  picker rather than left blank**: an empty one used to read as the trait's
   *  own name, so a card drawing itself green offered a box saying *neutral*. */
  const chain = (key: string, name: string) => {
    const from = config_of(graph, d ? d.extends : def_of(graph, id), key)[name];
    return from === undefined || from === null ? "" : String(from);
  };
  const now = (key: string, name: string, fallback: string) =>
    String(said(key, name) ?? chain(key, name) ?? "") || fallback;
  return { said, chain, now };
}
