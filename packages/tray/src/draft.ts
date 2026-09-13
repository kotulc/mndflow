/** A definition being written before it has a name.
 *
 *  **Edited through the registry, never beside it.** The draft stands in the
 *  graph under a reserved id, so `look`, `field`, `unfield` and `plain` run
 *  exactly as they do on a real definition — and only the record they would
 *  have written for that id is kept. Nothing reaches the log until it is saved,
 *  which is one `define` carrying the whole record. */

import { run, type Args, type Definition, type Graph } from "@mnd/core";

/** The id a draft stands in under. Not one `def_id` can mint from a name. */
export const DRAFT = "@draft";

export type DraftGroup = "block" | "relation";

export function blank(group: DraftGroup): Definition {
  return { id: DRAFT, group, name: "" };
}

/** The graph with the draft standing in it, for the panels to read. */
export function with_draft(graph: Graph, draft: Definition): Graph {
  return { ...graph, defs: { ...graph.defs, [DRAFT]: draft } };
}

/** Whether an action's arguments are about the draft. */
export function aims_at_draft(args: Args | undefined): boolean {
  if (!args) return false;
  const ids = args["ids"];
  return args["holder"] === DRAFT || args["id"] === DRAFT
    || (Array.isArray(ids) && ids.includes(DRAFT));
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
    return { ...draft, name: String(args["name"] ?? draft.name),
             extends: up || undefined };
  }
  const out = run(name, { graph: with_draft(graph, draft), layer: null, picked: [], cells: [] },
                  args);
  if ("refused" in out) return out.refused;
  const kept = out.mutations.find((m) => m.op === "set_def" && m.def.id === DRAFT);
  return kept && kept.op === "set_def" ? kept.def : draft;
}
