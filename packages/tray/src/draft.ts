/** Definitions the tray shows before the log holds them.
 *
 *  **A draft** is one being written before it has a name. **The base line** is
 *  the definition every plain line follows, shown before anybody has
 *  customised it. Both stand in the graph under their ids, so every panel
 *  reads them like real definitions — and the actions that edit them run
 *  exactly as they do on a real one. Nothing reaches the log until it is saved
 *  or, for the base line, until the first edit files it. */

import { BASE_LINE, def_id, default_for, run,
         type Args, type Definition, type Graph } from "@mnd/core";

/** The id a draft stands in under. Not one `def_id` can mint from a name. */
export const DRAFT = "@draft";

export type DraftGroup = "block" | "relation";

/** A blank definition. **A relation draft draws as a line**, and extends the
 *  base line until somebody picks another — said when it is saved. */
export function blank(group: DraftGroup): Definition {
  return group === "relation"
    ? { id: DRAFT, group, name: "", components: { line: {} } }
    : { id: DRAFT, group, name: "" };
}

/** The graph with the draft standing in it, for the panels to read. */
export function with_draft(graph: Graph, draft: Definition): Graph {
  return { ...graph, defs: { ...graph.defs, [DRAFT]: draft } };
}

/** Whether the base line is only standing in, not yet filed. */
export function base_unfiled(graph: Graph): boolean {
  return !default_for(graph, "line", "relation");
}

/** The graph with the base line standing in, where the workspace has not filed
 *  its own yet. */
export function with_base(graph: Graph): Graph {
  if (!base_unfiled(graph)) return graph;
  return { ...graph, defs: {
    ...graph.defs,
    [BASE_LINE]: { id: BASE_LINE, group: "relation", name: "default", components: { line: {} },
                   ...graph.defs[BASE_LINE], default: "line" },
  } };
}

/** The ids an action writes to. **Not what it points at**: a definition
 *  extending another writes itself, never the one above. */
export function aimed(args: Args | undefined): string[] {
  if (!args) return [];
  const ids = Array.isArray(args["ids"]) ? (args["ids"] as unknown[]).map(String) : [];
  return [...ids, args["holder"], args["id"]]
    .filter((x): x is string => typeof x === "string" && !!x);
}

/** Every definition an action touches, written or pointed at — which is what
 *  decides whether the base line has to be filed first. */
export function touched(args: Args | undefined): string[] {
  if (!args) return [];
  return [...aimed(args), args["extends"], args["name"] ? def_id(String(args["name"]), "relation") : undefined]
    .filter((x): x is string => typeof x === "string" && !!x);
}

/** What the draft becomes after one action, or the words it was refused with.
 *
 *  **`define` is answered here**, because on a draft it means *name it* or
 *  *point it somewhere* — and the real action keys on the name, which would
 *  file it for good. */
export function redraft(graph: Graph, draft: Definition, name: string,
                        args: Args): Definition | string {
  if (name === "define") {
    const up = String(args["extends"] ?? "");
    const label = args["label"] === undefined ? draft.label : String(args["label"]) || undefined;
    return { ...draft, name: String(args["name"] ?? draft.name), label,
             extends: up || undefined };
  }
  const out = run(name, { graph: with_draft(graph, draft), layer: null, picked: [], cells: [] },
                  args);
  if ("refused" in out) return out.refused;
  const kept = out.mutations.find((m) => m.op === "set_def" && m.def.id === DRAFT);
  return kept && kept.op === "set_def" ? kept.def : draft;
}
