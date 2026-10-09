/** The `overhead` view: a whole section, drawn — every root it lists, from the scope above it,
 *  down to its cut, as boxes down the page. What the explorer's section lists, the canvas draws.
 *
 *  Drawn, never stored: a graph handed back for a projection to read. Every block keeps its real
 *  id but a part, which is drawn as its usage's copy (`part_id`, keyed by the usage as drawn, so
 *  two usages' copies never meet). */

import { branch_of, children, is_folder, is_group, is_holder, is_interface, packages, part_id,
         setting_of, type Block, type Cut, type Graph, type Id } from "@mnd/core";

/** The layer a section is drawn on: above every root it draws. */
export const FOREST = "@forest";

/** Where what a section does not draw is put out of sight. */
const HIDDEN = `${FOREST}:hidden`;


/** A block drawn as a box of what it holds: still what it is, but no definition, and marked flat
 *  so it lays out as a group and reads as itself. */
export function flattened(b: Block): Block {
  const { def: _def, ...plain } = b;
  return { ...plain, settings: { ...plain.settings, holder: { inline: true, flat: true } } };
}

/** The section under `scope` — every package where it is null, as `only` orders them — down to
 *  `cut`, on one layer. What holds rows reads as a box round them: a group as it is, a grid as its
 *  cells, a folder or any other block as a group. A block at the cut, or holding nothing listed,
 *  is a card. A usage holds its definition's parts, read through one step. */
export function survey_graph(graph: Graph, scope: Id | null, cut: Cut,
                             config: { only?: readonly Id[]; across?: number } = {}): Graph {
  const all = scope === null ? packages(graph).map((p) => p.id) : [scope];
  const tops = scope === null && config.only
    ? config.only.filter((id) => all.includes(id)) : all;
  const said = scope ? setting_of(graph, scope, "layout") : {};
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [FOREST]: { id: FOREST, parent: null, name: "sections",
                settings: { layout: { ...said, kind: "page",
                                      ...(config.across ? { across: config.across } : {}) } } } };
  for (const p of packages(graph)) if (!tops.includes(p.id)) blocks[p.id] = { ...p, parent: HIDDEN };

  /** A row drawn: as a box of what it lists, or a card; its parts as its own copies. */
  const draw = (id: Id, parent: Id, via: Id | undefined, order: number | undefined,
                seen: ReadonlySet<Id>) => {
    const b = graph.blocks[id]!;
    const { parts, own, used } = branch_of(graph, id, cut, scope, seen);
    const drawn = via ? part_id(via, id) : id;
    const listed = (via ? 0 : parts.length) + own.length > 0;
    const boxed = is_holder(graph, id) || is_folder(graph, id) || listed;
    const { def: _def, ...plain } = b;
    blocks[drawn] = { ...(!boxed ? b : is_group(graph, id) ? plain : flattened(b)), id: drawn,
                      parent, ...(order !== undefined ? { order } : {}) };
    /** A box seats no interfaces: they are part of what it stands for. A copy carries none. */
    if (boxed && !via) {
      for (const port of children(graph, id).filter(is_interface)) {
        blocks[port.id] = { ...port, parent: HIDDEN };
      }
    }
    /** One step: a part's own usages are not read through again. */
    const deeper = used ? new Set([...seen, used]) : seen;
    for (const p of via ? [] : parts) draw(p.id, drawn, drawn, undefined, deeper);
    for (const c of own) draw(c.id, drawn, via, undefined, deeper);
  };
  tops.forEach((id, n) => draw(id, FOREST, undefined, n + 1, new Set()));
  return { ...graph, blocks };
}
