/** Drops: what landing blocks somewhere comes to, as the action to run. **One rule for the canvas
 *  and the explorer, in every host.** Only where things land is decided here; whether they may is
 *  each action's own check.
 *
 *  Where it lands says what a definition makes. On a grid's card, either lands in the grid's next
 *  free cell. On a block, it retypes it, or is made and tied to it where it carries a tie; in a
 *  structure, a usage of it; in a domain, another package's makes one extending it, and the
 *  workspace's own moves there. A block lands as itself in a list, and as a reference on a
 *  drawing. */

import type { Args } from "./actions/registry";
import { frozen, setting_of, tree_of } from "./defs";
import { headed_group, is_grid } from "./holders";
import type { Graph, Id, Point } from "./types";

/** Where blocks land: in `parent`, before `before` among what it holds. On a drawing, also the
 *  block or line under the pointer, where, and in which cell of `parent`. */
export type Landing = {
  ids: readonly Id[];
  onto: "list" | "drawing";
  parent: Id;
  before?: Id;
  on?: Id | null;
  spot?: Point;
  cell?: string;
};

/** The action a landing comes to. `ask` names an argument the user still has to give, in place:
 *  a new definition's name. */
export type Drop = { act: string; args: Args; ask?: "name" };


/** What dropping blocks comes to, or null where nothing would happen. */
export function drop_of(graph: Graph, landing: Landing): Drop | null {
  const { ids, onto, on, spot, cell } = landing;
  if (!ids.length || !graph.blocks[landing.parent]) return null;
  const { parent, before } = onto === "list" ? settled(graph, landing) : landing;
  const at = before ? { before } : {};
  const one = ids.length === 1 ? graph.blocks[ids[0]!] : undefined;

  /** On a grid's card, it goes in the grid. */
  if (onto === "drawing" && one && !cell && on && on !== one.id && is_grid(graph, on)) {
    return one.def ? { act: "create", args: { name: "", type: one.id, parent: on } }
      : { act: "refer", args: { target: one.id, parent: on } };
  }
  /** A definition makes one of its kind. */
  if (one?.def) {
    const type = one.id;
    if (on && graph.blocks[on]) {
      return typeof setting_of(graph, type, "tie")["type"] === "string"
        ? { act: "create", args: { name: "", type, parent, ...(spot ? { spot } : {}), from: on } }
        : { act: "retype", args: { ids: [on], type } };
    }
    if (tree_of(graph, parent) === null) {
      if (!frozen(graph, type)) return { act: "move", args: { ids: [type], parent, ...at } };
      return { act: "define", args: { extends: type, parent }, ask: "name" };
    }
    return { act: "create", args: { name: "", type, parent, ...at, ...(spot ? { spot } : {}),
                                      ...(cell ? { at: cell } : {}) } };
  }
  /** A block on a drawing stands there for itself; in a list, it moves. */
  if (onto === "drawing") {
    return one ? { act: "refer", args: { target: one.id, ...(spot ? { spot } : {}),
                                          ...(cell ? { parent, at: cell } : {}) } } : null;
  }
  return { act: "move", args: { ids: [...ids], parent, ...at } };
}

/** Where a run lands in a list. Nothing lands before a head: before the block heading its holder
 *  is before the holder. */
function settled(graph: Graph, landing: Landing): { parent: Id; before?: Id } {
  const { parent, before } = landing;
  const up = graph.blocks[parent]?.parent;
  if (before && up && headed_group(graph, before) === parent) return { parent: up, before: parent };
  return { parent, ...(before ? { before } : {}) };
}
