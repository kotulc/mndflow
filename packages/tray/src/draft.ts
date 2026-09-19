/** A definition the tray shows before the log holds it. */

import { run, type Args, type Definition, type Graph } from "@mnd/core";

/** The id a draft stands in under. */
export const DRAFT = "@draft";

export type DraftGroup = "block" | "relation";

/** A blank definition; a relation draft draws as a line. */
export function blank(group: DraftGroup): Definition {
  return group === "relation"
    ? { id: DRAFT, group, name: "", components: { line: {} } }
    : { id: DRAFT, group, name: "" };
}

/** The graph with the draft standing in it, for the panels to read. */
export function with_draft(graph: Graph, draft: Definition): Graph {
  return { ...graph, defs: { ...graph.defs, [DRAFT]: draft } };
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
    return { ...draft, name: String(args["name"] ?? draft.name), extends: up || undefined };
  }
  const out = run(name, { graph: with_draft(graph, draft), layer: null, picked: [], cells: [] },
                  args);
  if ("refused" in out) return out.refused;
  const kept = out.mutations.find((m) => m.op === "set_def" && m.def.id === DRAFT);
  return kept && kept.op === "set_def" ? kept.def : draft;
}
