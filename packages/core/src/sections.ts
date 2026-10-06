/** Sections: the layers a host cuts the workspace into, and the views each may draw. **One rule
 *  for every section and every host.**
 *
 *  A section lists its root's subtree down to its cut: a block at the cut lists as a leaf, and
 *  what it holds is the next section's. A null root is the forest above every package. */

import { def_at, packages, tree_of } from "./defs";
import { children, is_interface } from "./tree";
import type { Block, Graph, Id } from "./types";

/** Where a section stops: at package roots, at trees, or nowhere. */
export type Cut = "package" | "tree" | null;

/** How the canvas draws a section: from inside one block (`internal`), the whole layer from above
 *  as nested boxes (`overview`), or the whole layer as a depth-wise slice (`profile`). */
export type ViewKind = "internal" | "overview" | "profile";

/** One section, as a host declares it: where it stops, and the views it offers, its default
 *  first. */
export type Section = { id: string; label: string; cut: Cut; views: readonly ViewKind[] };


/** Whether a block sits at a cut: a package root, or a tree. */
export function at_cut(graph: Graph, cut: Cut, id: Id): boolean {
  const b = graph.blocks[id];
  if (!cut || !b) return false;
  return cut === "package" ? b.parent === null : tree_of(graph, id) === id;
}

/** A section's top rows: its root, or every package where it is the forest. */
export function tops_of(graph: Graph, root: Id | null): Id[] {
  if (root === null) return packages(graph).map((p) => p.id);
  return graph.blocks[root] ? [root] : [];
}

/** What a section lists under a block: nothing at its cut, its root apart; else, for a usage,
 *  its definition's blocks read through one step, then its own. Interfaces are part of what they
 *  sit on. `seen` holds the definitions read through on the way down, so one reached through
 *  itself lists once. */
export function branch_of(graph: Graph, id: Id, cut: Cut, root: Id | null,
                          seen: ReadonlySet<Id> = new Set()): { parts: Block[]; own: Block[];
                                                                used?: Id } {
  const b = graph.blocks[id];
  if (!b || (id !== root && at_cut(graph, cut, id))) return { parts: [], own: [] };
  const used = !b.def ? def_at(graph, b.type) : undefined;
  const parts = used && !seen.has(used.id) ? shown(graph, used.id) : [];
  return { parts, own: shown(graph, id), ...(used ? { used: used.id } : {}) };
}

/** Whether a section lists a block: a top row, or under one without passing its cut. */
export function in_section(graph: Graph, id: Id, root: Id | null, cut: Cut): boolean {
  const tops = tops_of(graph, root);
  const seen = new Set<Id>();
  for (let at: Id | null = id; at && !seen.has(at); at = graph.blocks[at]?.parent ?? null) {
    seen.add(at);
    if (at !== id && at !== root && at_cut(graph, cut, at)) return false;
    if (tops.includes(at)) return true;
  }
  return false;
}

/** What a section holds before anything is chosen: its first block at its cut, in reading
 *  order; with no cut, its top row. */
export function first_in(graph: Graph, root: Id | null, cut: Cut): Id | null {
  const tops = tops_of(graph, root);
  if (!cut) return tops[0] ?? null;
  const walk = (ids: readonly Id[]): Id | null => {
    for (const id of ids) {
      if (id !== root && at_cut(graph, cut, id)) return id;
      const deeper = walk(shown(graph, id).map((b) => b.id));
      if (deeper) return deeper;
    }
    return null;
  };
  return walk(tops);
}

/** The root the next section lists: what this one holds, where it sits at this one's cut. */
export function root_below(graph: Graph, cut: Cut, held: Id | null): Id | undefined {
  return held && at_cut(graph, cut, held) ? held : undefined;
}

/** What a block shows under it: every block it holds, in order, but its interfaces. */
function shown(graph: Graph, id: Id): Block[] {
  return children(graph, id).filter((b) => !is_interface(b));
}
