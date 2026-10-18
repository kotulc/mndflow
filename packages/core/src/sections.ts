/** Sections: the layers a host cuts the workspace into, and the views each may draw. **One rule
 *  for every section and every host.**
 *
 *  A section lists its root's subtree down to its cut: a block at the cut lists as a leaf, and
 *  what it holds is the next section's. A null root is the forest above every package. */

import { def_at, is_domain, owner_def, packages, tree_of } from "./defs";
import { children, is_interface } from "./tree";
import type { Block, Graph, Id } from "./types";

/** Where a section stops: at package roots, at trees, or nowhere. */
export type Cut = "package" | "tree" | null;

/** How the canvas draws. **Layer views** draw one block, and its card's kind says which: from
 *  inside (`internal`), an opened grid's cells and the relations between them (`allocation`), a
 *  package's or folder's contents read down the page (`folder`), or a diagram the block names
 *  (`class`, `er`, `sequence`). A definition opens on the view its chain names, as its usages
 *  do. The **system view** draws a whole section from above as nested boxes (`package`), and is
 *  the only one chosen. */
export type ViewKind = "internal" | "allocation" | "folder" | "class" | "er" | "sequence"
  | "registry" | "package";

/** The views that draw one block. A section offers them as one choice, `internal`, and the block
 *  opened says which it shows. */
export const LAYER_VIEWS: readonly ViewKind[] = [
  "internal", "allocation", "folder", "class", "er", "sequence", "registry"];

/** The layer views drawn from inside, where what the layer holds is built. A diagram is read from
 *  inside too: it draws what the block holds, and nothing is laid out there. */
const INSIDE: readonly ViewKind[] = LAYER_VIEWS;

/** Which side a section lists. Unset, it lists every role, as a host that has not split does. */
export type Lists = "domain" | "structure";

/** One section, as a host declares it: where it stops, which side it lists, and the views it
 *  offers, its default first. `internal` stands for every layer view. */
export type Section = {
  id: string; label: string; cut: Cut; views: readonly ViewKind[];
  lists?: Lists;
};


/** Whether a view draws one block rather than a whole section. */
export function is_layer_view(kind: ViewKind): boolean {
  return LAYER_VIEWS.includes(kind);
}

/** Whether a view draws a layer from inside, where what it holds is built. */
export function is_inside(kind: ViewKind): boolean {
  return INSIDE.includes(kind);
}

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

/** Whether a block is a template's: a definition, or a part of one at any depth. */
function in_template(graph: Graph, id: Id): boolean {
  return !!graph.blocks[id]?.def || owner_def(graph, id) !== null;
}

/** Whether a block is one this side lists. Unset lists every block. **The library** lists the
 *  definition side — packages, their definition folders, definitions — and each definition's parts
 *  under it. **The model** lists usages only: structure outside every definition, and the
 *  package roots and folders on the way to it. A package with none does not list. */
export function on_side(graph: Graph, id: Id, lists?: Lists): boolean {
  if (!lists) return !!graph.blocks[id];
  if (!graph.blocks[id]) return false;
  if (lists === "domain") return is_domain(graph, id) || in_template(graph, id);
  if (in_template(graph, id)) return false;
  if (!is_domain(graph, id)) return true;
  return below_structure(graph, id);
}

/** Whether structure sits anywhere under a definition-side block, definitions apart. */
function below_structure(graph: Graph, id: Id): boolean {
  const seen = new Set<Id>();
  const walk = (at: Id): boolean => {
    if (seen.has(at)) return false;
    seen.add(at);
    for (const c of shown(graph, at)) {
      if (c.def) continue;
      if (!is_domain(graph, c.id)) return true;
      if (walk(c.id)) return true;
    }
    return false;
  };
  return walk(id);
}

/** What a section lists under a block: nothing at its cut, its root apart; else, for a usage,
 *  its definition's blocks read through one step, then its own. Interfaces are part of what they
 *  sit on. `seen` holds the definitions read through on the way down, so one reached through
 *  itself lists once. A side drops what it does not list of the block's own; parts read through
 *  are the usage's, so they list wherever it does. */
export function branch_of(graph: Graph, id: Id, cut: Cut, root: Id | null,
                          seen: ReadonlySet<Id> = new Set(), lists?: Lists):
    { parts: Block[]; own: Block[]; used?: Id } {
  const b = graph.blocks[id];
  if (!b || (id !== root && at_cut(graph, cut, id))) return { parts: [], own: [] };
  const used = !b.def ? def_at(graph, b.type) : undefined;
  const keep = (c: Block) => on_side(graph, c.id, lists);
  const parts = used && !seen.has(used.id) ? shown(graph, used.id) : [];
  return { parts, own: shown(graph, id).filter(keep), ...(used ? { used: used.id } : {}) };
}

/** Whether a section lists a block: a top row, or under one without passing its cut, and on
 *  the side the section lists. */
export function in_section(graph: Graph, id: Id, root: Id | null, cut: Cut,
                           lists?: Lists): boolean {
  if (!on_side(graph, id, lists)) return false;
  const tops = lists === "structure" ? tops_of(graph, null) : tops_of(graph, root);
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
export function first_in(graph: Graph, root: Id | null, cut: Cut, lists?: Lists): Id | null {
  const tops = lists === "structure" ? tops_of(graph, null) : tops_of(graph, root);
  if (!cut) return tops.find((id) => on_side(graph, id, lists)) ?? null;
  const walk = (ids: readonly Id[]): Id | null => {
    for (const id of ids) {
      if (id !== root && at_cut(graph, cut, id) && on_side(graph, id, lists)) return id;
      const deeper = walk(shown(graph, id).filter((b) => on_side(graph, b.id, lists))
        .map((b) => b.id));
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
  return children(graph, id).filter((b) => !is_interface(graph, b.id));
}
