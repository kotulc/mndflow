/** The `package` view: a whole section, drawn — every root it lists, from the scope above it,
 *  down to its cut, as boxes down the page, only what its side lists. What the explorer's section lists, the canvas draws;
 *  asked, a block at the cut boxes its top level as cards, standing for what lies below.
 *
 *  Drawn, never stored: a graph handed back for a projection to read. Every block keeps its real
 *  id but a part, which is drawn as its usage's copy (`part_id`, keyed by the usage as drawn, so
 *  two usages' copies never meet). */

import { at_cut, branch_of, children, is_folder, is_grid, is_group, is_holder, is_interface,
         is_note, on_side, packages, part_id, setting_of, type Block, type Cut, type Graph,
         type Id, type Lists } from "@mnd/core";

/** The layer a section is drawn on: above every root it draws. */
export const FOREST = "@forest";

/** Where what a section does not draw is put out of sight. */
const HIDDEN = `${FOREST}:hidden`;


/** A block drawn as a box of what it holds: still what it is, but no definition, and marked flat
 *  so it lays out as a group and reads as itself. A system view draws minimal cards, so what it
 *  holds draws small whatever the block says. */
export function flattened(b: Block): Block {
  const { def: _def, ...plain } = small(b);
  return { ...plain, settings: { ...plain.settings, holder: { inline: true, flat: true } } };
}

/** A box whose cards draw their small face. */
function small(b: Block): Block {
  const layout = { ...b.settings?.["layout"], cards: "small" };
  return { ...b, settings: { ...b.settings, layout } };
}

/** The section under `scope` — every package where it is null, as `only` orders them — down to
 *  `cut`, on one layer, keeping only what its side `lists`. What holds rows reads as a box round them: a group as it is, a grid as its
 *  cells, a folder or any other block as a group. A block at the cut, or holding nothing listed,
 *  is a card — but with `tops`, one at the cut holding blocks is a box of them, each a card. A
 *  usage holds its definition's parts, read through one step. */
export function survey_graph(graph: Graph, scope: Id | null, cut: Cut,
                             config: { only?: readonly Id[]; across?: number;
                                       tops?: boolean; lists?: Lists } = {}): Graph {
  const { lists } = config;
  const all = scope === null ? packages(graph).map((p) => p.id) : [scope];
  const tops = (scope === null && config.only ? config.only.filter((id) => all.includes(id)) : all)
    .filter((id) => on_side(graph, id, lists));
  const said = scope ? setting_of(graph, scope, "layout") : {};
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [FOREST]: { id: FOREST, parent: null, name: "sections",
                settings: { layout: { ...said, kind: "page", cards: "small",
                                      ...(config.across ? { across: config.across } : {}) } } } };
  for (const p of packages(graph)) if (!tops.includes(p.id)) blocks[p.id] = { ...p, parent: HIDDEN };
  /** Notes explain a layer; a system view draws the system, so they and their ties stay out. */
  for (const b of Object.values(graph.blocks)) {
    if (is_note(graph, b.id)) blocks[b.id] = { ...b, parent: HIDDEN };
  }

  /** A row drawn: as a box of what it lists, or a card; its parts as its own copies. */
  const draw = (id: Id, parent: Id, via: Id | undefined, order: number | undefined,
                seen: ReadonlySet<Id>) => {
    const b = graph.blocks[id]!;
    /** A note is never drawn here, nor is a part's copy of one. */
    if (is_note(graph, id)) {
      blocks[via ? part_id(via, id) : id] = { ...b, parent: HIDDEN };
      return;
    }
    const { parts, own, used } = branch_of(graph, id, cut, scope, seen, lists);
    const drawn = via ? part_id(via, id) : id;
    const heads = config.tops && !via && id !== scope && at_cut(graph, cut, id)
      ? top_level(graph, id).filter((h) => on_side(graph, h.id, lists)) : [];
    const listed = (via ? 0 : parts.length) + own.length + heads.length > 0;
    /** A grid is one card here: its cells are what opening it shows. */
    const grid = is_grid(graph, id);
    const boxed = !grid && (is_holder(graph, id) || is_folder(graph, id) || listed);
    const { def: _def, ...plain } = small(b);
    blocks[drawn] = { ...(!boxed ? b : is_group(graph, id) ? plain : flattened(b)), id: drawn,
                      parent, ...(order !== undefined ? { order } : {}) };
    /** A box holds only what it lists: no interfaces, which are part of what it stands for, nor
     *  what its side does not list, nor a group whose members sit in its place. A copy carries
     *  none. */
    if (boxed && !via) {
      const kept = new Set([...own, ...heads].map((c) => c.id));
      for (const c of children(graph, id).filter((c) => !kept.has(c.id))) {
        blocks[c.id] = { ...c, parent: HIDDEN };
      }
    }
    /** The top level, each a card; a group's members sit in its place. */
    heads.forEach((h, n) => { blocks[h.id] = { ...h, parent: drawn, order: n + 1 }; });
    /** One step: a part's own usages are not read through again. */
    const deeper = used ? new Set([...seen, used]) : seen;
    if (grid) return;
    for (const p of via ? [] : parts) draw(p.id, drawn, drawn, undefined, deeper);
    for (const c of own) draw(c.id, drawn, via, undefined, deeper);
  };
  tops.forEach((id, n) => draw(id, FOREST, undefined, n + 1, new Set()));
  return { ...graph, blocks };
}

/** What a block holds at its top level, its interfaces and notes apart, a group by its members. */
function top_level(graph: Graph, id: Id): Block[] {
  return children(graph, id).filter((b) => !is_interface(graph, b.id) && !is_note(graph, b.id))
    .flatMap((b) => (is_group(graph, b.id) ? top_level(graph, b.id) : [b]));
}
