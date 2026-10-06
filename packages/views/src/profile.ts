/** The `profile` view: a cross-section of the workspace along what is picked. **One band per
 *  section**, top to bottom, never nested: each the block picked there among its siblings — a
 *  section's root shows what it holds instead, so no band repeats the one above. The only lines
 *  join a picked block to its parent or its children in the bands beside it.
 *
 *  Drawn, never stored: a graph handed back for a projection to read, every block keeping its id. */

import { children, is_holder, is_interface, packages, trace, type Block, type Graph, type Id,
         type Relation, type Tiers } from "@mnd/core";
import { FOREST } from "./survey";

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

  /** Each band's blocks, a block drawn once. */
  const drawn = new Set<Id>();
  const bands = held.map((pick, n) => {
    const opens = n > 0 && pick === roots[n];
    const up = graph.blocks[pick]!.parent;
    const kin = opens ? shown(graph, pick) : up ? shown(graph, up) : packages(graph);
    const ids = kin.map((b) => b.id).filter((id) => !drawn.has(id));
    ids.forEach((id) => drawn.add(id));
    return { ids };
  });

  bands.forEach((band, n) => {
    const id = `@band:${n}`;
    blocks[id] = { id, parent: FOREST, type: "group", order: n + 1,
                   name: tiers.sections[n]?.label ?? "" };
    /** A band is flat: a holder in it is a card, its members behind it. */
    band.ids.forEach((b, at) => {
      blocks[b] = { ...graph.blocks[b]!, parent: id, order: at + 1,
                    ...(is_holder(graph, b) ? { type: "folder" } : {}) };
    });
  });

  /** A picked block, joined to the picked block beside it and to what it holds or is held by. */
  const picked = new Set(held);
  bands.slice(1).forEach((band, n) => {
    for (const a of bands[n]!.ids) {
      for (const b of band.ids) {
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

/** What a block shows in a band: what it holds, but its interfaces. */
function shown(graph: Graph, id: Id): Block[] {
  return children(graph, id).filter((b) => !is_interface(b));
}
