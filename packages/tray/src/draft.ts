/** A definition the tray shows before the log holds it. */

import { replay, run, type Args, type Definition, type Domain, type Graph } from "@mnd/core";

/** The id a draft stands in under. */
export const DRAFT = "@draft";

export type DraftGroup = Domain;

/** A blank definition of the workspace's; a relation draft extends a line. */
export function blank(domain: DraftGroup, root: string): Definition {
  return { id: DRAFT, parent: root, name: "", def: {},
           ...(domain === "relation" ? { type: "line" } : {}) };
}

/** The graph with the draft standing in it, for the panels to read. */
export function with_draft(graph: Graph, draft: Definition): Graph {
  return { ...graph, blocks: { ...graph.blocks, [DRAFT]: { ...draft, parent: graph.root } } };
}

/** The ids an action writes to, not what it points at. */
export function aimed(args: Args | undefined): string[] {
  if (!args) return [];
  const ids = Array.isArray(args["ids"]) ? (args["ids"] as unknown[]).map(String) : [];
  return [...ids, args["holder"], args["id"]]
    .filter((x): x is string => typeof x === "string" && !!x);
}

/** What the draft becomes after one action, or the words it was refused with. */
export function redraft(graph: Graph, draft: Definition, name: string,
                        args: Args): Definition | string {
  if (name === "define") {
    const up = String(args["extends"] ?? "");
    return { ...draft, name: String(args["name"] ?? draft.name), type: up || undefined };
  }
  const drafted = with_draft(graph, draft);
  const out = run(name, { graph: drafted, layer: null, picked: [], cells: [] }, args);
  if ("refused" in out) return out.refused;
  return (replay(drafted, out.mutations).blocks[DRAFT] as Definition | undefined) ?? draft;
}
