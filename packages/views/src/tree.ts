/** **The models' tree, one for the map and the explorer** (2026-11-05): what holds diagrams is a
 *  box, anything else a chip, what a chip holds its tiles at any depth; a group a panel over its
 *  members; every box its own, never two drawn as one. The map lays it out (`map.ts`); the explorer
 *  lists it, a row a box, chip or tile, so the arrows walk what the map nests. Worked out when
 *  asked, never stored. */

import { children, inline, is_aside, is_group, is_header, is_interface, is_notation,
         is_reference, layer_of, lens_of, on_side, packages, stands_for, type Graph,
         type Id } from "@mnd/core";
import { compounded, tree_groups } from "./flow";

/** One branch: the block it is, the block it draws as — a reference what it stands for — and
 *  what it previews there; and what it holds in the tree. A chip standing for another place
 *  holds nothing here: that place lists where it lives. */
export type Branch = { id: Id; as: "box" | "chip" | "group"; shows: Id; held: readonly Id[];
                       kids: Branch[] };


/** **The models' tree**: every package holding a model, a box of what it holds. */
export function model_tree(graph: Graph): Branch[] {
  const { box } = branches(graph);
  return packages(graph).filter((p) => on_side(graph, p.id, "structure"))
    .map((p) => box(p.id, p.id));
}

/** **A treemap diagram's tree**: what it holds, as the models' tree reads it there. */
export function layer_tree(graph: Graph, layer: Id): Branch[] {
  const { kids } = branches(graph);
  return kids(layer);
}

/** What a block holds on the map: its blocks, holders and a flow's marks, never a note, a label,
 *  an interface or a group — a group is a panel over its members. */
export function members(graph: Graph, id: Id): Id[] {
  return children(graph, id).filter((b) => on_side(graph, b.id, "structure")
    && !is_interface(graph, b.id) && !is_group(graph, b.id)
    && (!is_notation(graph, b.id) || !is_aside(graph, b.id)))
    .map((b) => b.id);
}

/** How the tree makes a branch of a block: a box where diagrams lie below, else a chip. */
function branches(graph: Graph) {
  const diagram = (id: Id) => !!lens_of(graph, id, "structure");
  /** **A reference never boxes**: it stands for a block drawn elsewhere. A block holding a
   *  behaviour is drawn with it inside, as with any diagram it holds (2026-11-06). */
  const deep = new Map<Id, boolean>();
  const holds_diagrams = (id: Id): boolean => {
    if (!deep.has(id)) {
      deep.set(id, false);
      deep.set(id, members(graph, id).some((c) => !is_reference(graph, c)
        && (diagram(c) || holds_diagrams(c))));
    }
    return deep.get(id)!;
  };
  /** A chip, its tiles each holding its own; a reference draws as what it stands for and holds
   *  nothing here: that place lists where it lives. */
  const chip = (id: Id): Branch => {
    const shows = is_reference(graph, id) ? stands_for(graph, id)?.id ?? id : id;
    return { id, as: "chip", shows, held: members(graph, shows),
             kids: shows === id ? listed(id).map(chip) : [] };
  };
  /** What a chip lists as tiles: its members but a grid's header cells — a sequence's step
   *  numbers — which the map draws as strips, never as blocks of their own. */
  const listed = (id: Id) => members(graph, id).filter((m) => !is_header(graph, m));
  /** What a box holds, its groups as panels over their members. */
  const kids = (id: Id): Branch[] => compounded(
    tree_groups(graph, inline(graph, id) ? layer_of(graph, id) : id),
    members(graph, id).map(entry),
    (g, held): Branch => ({ id: g, as: "group", shows: g, held: [], kids: held }));
  const box = (id: Id, shows: Id): Branch => ({ id, as: "box", shows, held: members(graph, id),
                                                kids: kids(id) });
  const entry = (id: Id): Branch => (holds_diagrams(id) ? box(id, id) : chip(id));
  return { entry, box, kids };
}
