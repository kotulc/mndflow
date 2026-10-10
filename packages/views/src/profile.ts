/** The `profile` view: the workspace seen from the side, along what is picked. **One row per
 *  level**, top to bottom: every package, then what each block on the way to the pick holds, and
 *  last what the pick holds. Each row is a box hugging its blocks, named for what holds it; the
 *  only lines run from the block on the way to the row of what it holds, pointing down.
 *
 *  Drawn, never stored: a graph handed back for a projection to read, every block keeping its id. */

import { children, is_group, is_interface, packages, path, shown_name, type Block, type Graph,
         type Id, type Relation } from "@mnd/core";
import { flattened, FOREST } from "./survey";

/** What a row's box is called: it stands for a level, not a block. */
export const ROW = "@row:";

/** Where what no row draws is put out of sight. */
const HIDDEN = `${FOREST}:hidden`;


/** The rows along the way to `target`, each a box of its blocks `across` cards wide, a line from
 *  each block on the way to the row it holds. */
export function profile_graph(graph: Graph, target: Id | null, across?: number): Graph {
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [FOREST]: { id: FOREST, parent: null, name: "profile",
                settings: { layout: { kind: "page", even: true, ...(across ? { across } : {}) } } } };
  for (const p of packages(graph)) blocks[p.id] = { ...p, parent: HIDDEN };
  const edges: Record<Id, Relation> = {};

  /** What holds each row: the forest, then each block on the way, groups apart. */
  const way = target && graph.blocks[target]
    ? path(graph, target).filter((b) => !is_group(graph, b.id)).map((b) => b.id) : [];
  const holders: (Id | null)[] = [null, ...way];
  holders.forEach((holder, n) => {
    const row = holder === null ? packages(graph) : level(graph, holder);
    if (!row.length) return;
    const id = `${ROW}${n}`;
    blocks[id] = flattened({ id, parent: FOREST, order: n + 1,
                             name: holder === null ? "packages" : shown_name(graph, holder) });
    row.forEach((b, at) => { blocks[b.id] = { ...b, parent: id, order: at + 1 }; });
    if (holder) edges[`@step:${n}`] = { id: `@step:${n}`, from: holder, to: id,
                                                   settings: { line: { dir: "forward" } } };
  });
  return { ...graph, blocks, edges };
}

/** What a block holds at one level: its interfaces apart, a group by its members. */
function level(graph: Graph, id: Id): Block[] {
  return children(graph, id).filter((b) => !is_interface(graph, b.id))
    .flatMap((b) => (is_group(graph, b.id) ? level(graph, b.id) : [b]));
}
