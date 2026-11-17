/** **The models' tree, one for the map and the explorer** (2026-11-05): what holds diagrams is a
 *  box, anything else a chip, what a chip holds its tiles at any depth; a group a panel over its
 *  members; every box its own, never two drawn as one. The map lays it out (`map.ts`); the explorer
 *  lists it, a row a box, chip or tile, so the arrows walk what the map nests. Worked out when
 *  asked, never stored. */

import { children, def_at, inline, is_aside, is_folder, is_group, is_header, is_interface,
         is_model, is_notation, is_reference, layer_of, lens_of, on_side, packages, stands_for,
         subtree, type Graph, type Id } from "@mnd/core";
import { compounded, tree_groups } from "./flow";

/** One branch: the block it is, the block it draws as — a reference what it stands for — and
 *  what it previews there; and what it holds in the tree. A chip standing for another place
 *  holds nothing here: that place lists where it lives. */
export type Branch = { id: Id; as: "box" | "chip" | "group"; shows: Id; held: readonly Id[];
                       kids: Branch[] };


/** **The models' tree, the world root**: every package holding a model, a box of its folders,
 *  **each model open one level** (docs/design/chip.md): its parts closed chips. */
export function model_tree(graph: Graph): Branch[] {
  const tops = packages(graph).filter((p) => on_side(graph, p.id, "structure"));
  const open = new Set(tops.flatMap((p) => subtree(graph, p.id))
    .filter((id) => is_folder(graph, id) || is_model(graph, id)));
  const { box } = branches(graph, open);
  return tops.map((p) => box(p.id, p.id));
}

/** **A model's tree** (docs/diagrams/tree.md): what it holds — a use of a model what its model
 *  holds, read through — each box in `open` open on what it holds, anything else a closed chip.
 *  Without `open`, as the models' tree reads it. */
export function layer_tree(graph: Graph, layer: Id, open?: ReadonlySet<Id>): Branch[] {
  const { kids } = branches(graph, open);
  return kids(layer);
}

/** **A block as a closed chip** of the tree, wherever it sits: a use's read through. */
export function chip_of(graph: Graph, id: Id): Branch {
  return branches(graph).chip(id);
}

/** What a block holds on the map: its blocks, holders and a flow's marks, never a note, a label,
 *  an interface or a group — a group is a panel over its members. */
export function members(graph: Graph, id: Id): Id[] {
  return children(graph, id).filter((b) => on_side(graph, b.id, "structure") && drawn(graph, b.id))
    .map((b) => b.id);
}

/** Whether a child is one the map draws: never an interface, a group, or a note or a label. */
function drawn(graph: Graph, id: Id): boolean {
  return !is_interface(graph, id) && !is_group(graph, id)
    && (!is_notation(graph, id) || !is_aside(graph, id));
}

/** A definition's parts as a usage reads them through: what the map draws, on either side. */
function parts_of(graph: Graph, def: Id): Id[] {
  return children(graph, def).filter((b) => !b.def && drawn(graph, b.id)).map((b) => b.id);
}

/** How the tree makes a branch of a block: a box where diagrams lie below, else a chip; or, given
 *  the boxes `open`, a box where it is open and holds something. */
function branches(graph: Graph, open?: ReadonlySet<Id>) {
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
   *  nothing here: that place lists where it lives. **A usage reads through** (2026-11-08): it
   *  holds its definition's parts, then its own, as its opened layer draws them. */
  const chip = (id: Id): Branch => {
    const shows = is_reference(graph, id) ? stands_for(graph, id)?.id ?? id : id;
    const b = graph.blocks[shows];
    const def = b && !b.def ? def_at(graph, b.type) : undefined;
    return { id, as: "chip", shows,
             held: [...(def ? parts_of(graph, def.id) : []), ...members(graph, shows)],
             kids: shows === id ? listed(id).map(chip) : [] };
  };
  /** What a chip lists as tiles: its members but a grid's header cells — a sequence's step
   *  numbers — which the map draws as strips, never as blocks of their own. */
  const listed = (id: Id) => members(graph, id).filter((m) => !is_header(graph, m));
  /** What a box holds: a use its definition's parts, then its own; its groups as panels over
   *  their members. **A definition is read through by one box only**, the first: its parts keep
   *  their ids, so a second open use of it would draw them twice. */
  const read = new Map<Id, Id>();
  const held = (id: Id): Id[] => {
    const b = graph.blocks[id];
    const def = b && !b.def ? def_at(graph, b.type) : undefined;
    if (def && !read.has(def.id)) read.set(def.id, id);
    const through = def && read.get(def.id) === id ? parts_of(graph, def.id) : [];
    return [...through, ...members(graph, id)];
  };
  const kids = (id: Id): Branch[] => compounded(
    tree_groups(graph, inline(graph, id) ? layer_of(graph, id) : id),
    held(id).map(entry),
    (g, inside): Branch => ({ id: g, as: "group", shows: g, held: [], kids: inside }));
  const box = (id: Id, shows: Id): Branch => ({ id, as: "box", shows, held: held(id),
                                                kids: kids(id) });
  const entry = (id: Id): Branch => (open
    ? (open.has(id) && held(id).length ? box(id, id) : chip(id))
    : holds_diagrams(id) ? box(id, id) : chip(id));
  return { entry, box, kids, chip };
}
