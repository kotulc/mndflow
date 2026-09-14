/** A definition the tray shows before the log holds it.
 *
 *  **A draft** is one being written before it has a name. It stands in the
 *  graph under its own id, so every panel reads it like a real definition — and
 *  the actions that edit it run exactly as they do on a real one. Nothing
 *  reaches the log until it is saved. */

import { run, type Args, type Definition, type Graph } from "@mnd/core";

/** The id a draft stands in under. Not one `def_id` can mint from a name. */
export const DRAFT = "@draft";

export type DraftGroup = "block" | "relation";

/** A blank definition. **A relation draft draws as a line**, and extends its
 *  group's default until somebody picks another — said when it is saved. */
export function blank(group: DraftGroup): Definition {
  return group === "relation"
    ? { id: DRAFT, group, name: "", components: { line: {} } }
    : { id: DRAFT, group, name: "" };
}

/** The graph with the draft standing in it, for the panels to read. */
export function with_draft(graph: Graph, draft: Definition): Graph {
  return { ...graph, defs: { ...graph.defs, [DRAFT]: draft } };
}

/** The ids an action writes to. **Not what it points at**: a definition
 *  extending another writes itself, never the one above. */
export function aimed(args: Args | undefined): string[] {
  if (!args) return [];
  const ids = Array.isArray(args["ids"]) ? (args["ids"] as unknown[]).map(String) : [];
  return [...ids, args["holder"], args["id"]]
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
