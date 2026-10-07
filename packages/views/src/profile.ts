/** The `profile` view: a cross-section of the workspace along what is picked. **One band per
 *  section**, top to bottom: what the section's root holds, and each block on the way to the
 *  pick that holds drawn as a box round the next step down, so a band reads the branch picked
 *  and never the rest. A section's root is the pick of the band above, so no band repeats it. The
 *  only lines join a picked block to its parent or its children in the bands beside it.
 *
 *  Drawn, never stored: a graph handed back for a projection to read, every block keeping its id. */

import { children, is_group, is_interface, packages, shown_name, trace, type Block, type Graph,
         type Id, type Relation, type Tiers } from "@mnd/core";
import { flattened, FOREST } from "./survey";

/** Where what no band draws is put out of sight. */
const HIDDEN = `${FOREST}:hidden`;


/** The bands along the way to `target`, each a box of its blocks in a row `across` cards wide,
 *  joined where a picked block holds, or is held by, a block in the band beside it. */
export function profile_graph(graph: Graph, tiers: Tiers, target: Id | null,
                              across?: number): Graph {
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [FOREST]: { id: FOREST, parent: null, name: "profile",
                settings: { layout: { kind: "page", ...(across ? { across } : {}) } } } };
  for (const p of packages(graph)) blocks[p.id] = { ...p, parent: HIDDEN };
  const edges: Record<Id, Relation> = {};
  const { roots, held } = target && graph.blocks[target]
    ? trace(graph, tiers, target) : { roots: [], held: [] };

  /** A block drawn in a band: a box round what it holds where the way to the pick runs through
   *  it, else a card — a group one too, its members behind it. */
  const draw = (b: Block, parent: Id, order: number, way: ReadonlySet<Id>, ids: Id[]) => {
    ids.push(b.id);
    if (!way.has(b.id)) {
      blocks[b.id] = { ...b, parent, order, ...(is_group(graph, b.id) ? { type: "folder" } : {}) };
      return;
    }
    /** A group stays a group; anything else is flattened, still reading as itself — a grid as
     *  its cells. A box seats no interfaces. */
    const { def: _def, ...plain } = b;
    blocks[b.id] = { ...(is_group(graph, b.id) ? { ...plain, type: "group" } : flattened(b)),
                     parent, order, name: shown_name(graph, b.id) };
    for (const port of children(graph, b.id).filter(is_interface)) {
      blocks[port.id] = { ...port, parent: HIDDEN };
    }
    shown(graph, b.id).forEach((c, at) => draw(c, b.id, at + 1, way, ids));
  };

  /** Each band's blocks: what its root holds, opened along the way to its pick. */
  const bands = held.map((pick, n) => {
    const root = roots[n] ?? null;
    const way = new Set(ancestry(graph, pick, root));
    const top = root === null ? packages(graph) : shown(graph, root);
    const id = `@band:${n}`;
    blocks[id] = { id, parent: FOREST, type: "group", order: n + 1,
                   name: tiers.sections[n]?.label ?? "" };
    const ids: Id[] = [];
    top.forEach((b, at) => draw(b, id, at + 1, way, ids));
    return ids;
  });

  /** A picked block, joined to the picked block beside it and to what it holds or is held by. */
  const picked = new Set(held);
  bands.slice(1).forEach((band, n) => {
    for (const a of bands[n]!) {
      for (const b of band) {
        const kin = graph.blocks[b]!.parent === a;
        const both = picked.has(a) && picked.has(b);
        if (!both && !(kin && (picked.has(a) || picked.has(b)))) continue;
        const tie = `@tie:${a}:${b}`;
        edges[tie] = { id: tie, from: a, to: b };
      }
    }
  });
  return { ...graph, blocks, edges };
}

/** The blocks between a section's root and its pick, the pick and the root apart. */
function ancestry(graph: Graph, pick: Id, root: Id | null): Id[] {
  const out: Id[] = [];
  for (let at = graph.blocks[pick]?.parent ?? null; at && at !== root;
       at = graph.blocks[at]?.parent ?? null) out.push(at);
  return out;
}

/** What a block shows in a band: what it holds, but its interfaces. */
function shown(graph: Graph, id: Id): Block[] {
  return children(graph, id).filter((b) => !is_interface(b));
}
