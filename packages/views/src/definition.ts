/** The `definition` view: a definition large in the middle, and what describes it round it — what
 *  it extends above, joined by an extends line; its in and out ports left and right; its both-way
 *  ports, then its tags and traits, below; a note tied to it at the top right, its body. Each is a
 *  box drawn only with something in it, joined to the middle card by a plain line — what it
 *  extends by an extends line.
 *
 *  Drawn, never stored: a graph handed back for a projection to read. Every block keeps its id, so
 *  a pick is the block's and an edit goes home (core `aspect_acts`). */

import { aspects_of, def_at, is_interface, shown_name, ABOUT, type Block, type Definition, type Graph, type Id,
         type Relation } from "@mnd/core";
import { band_size } from "./bands";
import { in_rows, on_grid } from "./grid";
import { size_of } from "./size";

/** The layer a definition view is drawn on. */
export const ASPECT = "@aspect";

/** How an extends line draws: an open triangle at what is extended. */
const EXTENDS = { line: { to_arrow: "hollow" } };

/** What a note says where the definition says nothing yet. */
const UNSAID = "what is this for? — double-click to say";

/** A box: its name, what it holds, and which way they run. */
type Box = { key: string; name: string; blocks: readonly Block[]; down: boolean };


/** The definition `def` on the `ASPECT` layer, what describes it placed round it. */
export function definition_graph(graph: Graph, def: Id): Graph {
  const d = graph.blocks[def]!;
  const aspects = aspects_of(graph, def);
  const defs = (ids: readonly Id[]) => ids.map((t) => def_at(graph, t)).filter((t): t is Definition => !!t);
  const boxes: Box[] = [
    { key: "extends", name: "extends", blocks: defs(aspects.extends ? [aspects.extends] : []),
      down: false },
    { key: "in", name: "in", blocks: aspects.ins, down: true },
    { key: "out", name: "out", blocks: aspects.outs, down: true },
    { key: "both", name: "ports", blocks: aspects.both, down: false },
    { key: "tags", name: "tags", blocks: defs(aspects.tags), down: false },
    { key: "traits", name: "traits", blocks: defs(aspects.traits), down: false },
  ].filter((b) => b.blocks.length);

  /** Everything drawn, the middle large and the rest small, before any is placed. */
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [ASPECT]: { id: ASPECT, parent: null, name: "definition",
                settings: { layout: { kind: "free", face: "large" } } } };
  const seen = new Set<Id>([def]);
  blocks[def] = { ...d, parent: ASPECT };
  for (const box of boxes) {
    const id = `${ASPECT}:${box.key}`;
    blocks[id] = { id, parent: ASPECT, type: "group", name: box.name,
                   settings: { layout: { kind: "free", face: "small" } } };
    const held = box.blocks.filter((x) => !seen.has(x.id));
    for (const b of held) {
      seen.add(b.id);
      /** A port draws as a plain card here, not on a wall, still called what it was. */
      const { side: _side, at: _at, ...card } = b;
      if (is_interface(graph, b.id)) delete card.type;
      blocks[b.id] = { ...card, name: b.name ?? shown_name(graph, b.id), parent: id };
    }
    /** What a box holds, on the grid: a column where it runs down, else a row. */
    const sized = held.map((b) => ({ id: b.id, ...size_of({ ...graph, blocks }, b.id) }));
    for (const p of on_grid(in_rows(sized, box.down ? 1 : sized.length))) {
      blocks[p.id] = { ...blocks[p.id]!, x: p.x, y: p.y };
    }
  }
  blocks[ABOUT] = { id: ABOUT, parent: ASPECT, type: "note",
                    name: d.body?.trim() || UNSAID };

  /** Round the middle card on the grid: what it extends above, the note out at the top right, its
   *  ins and outs either side, its both-way ports below, and below those its tags and traits. */
  const drawn: Graph = { ...graph, blocks };
  const size = (id: Id) => (blocks[id]?.type === "group"
    ? band_size(drawn, ASPECT, blocks[id]!, "free") : size_of(drawn, id));
  const cells = ([[def, 1, 1], [ABOUT, 3, 0], [`${ASPECT}:extends`, 1, 0], [`${ASPECT}:in`, 0, 1],
                  [`${ASPECT}:out`, 2, 1], [`${ASPECT}:both`, 1, 2], [`${ASPECT}:tags`, 0, 3],
                  [`${ASPECT}:traits`, 2, 3]] as const)
    .filter(([id]) => blocks[id])
    .map(([id, c, r]) => ({ id, c, r, ...size(id) }));
  for (const p of on_grid(cells)) blocks[p.id] = { ...blocks[p.id]!, x: p.x, y: p.y };

  /** An extends line up, a tie to the note, and a plain line from each box. */
  const edges: Relation[] = [
    { id: `${ASPECT}:about`, from: ABOUT, to: def, type: "tie" },
    ...boxes.map((b): Relation => (b.key === "extends"
      ? { id: `${ASPECT}:extends:line`, from: def, to: `${ASPECT}:extends`, dir: "forward",
          settings: EXTENDS }
      : { id: `${ASPECT}:${b.key}:line`, from: `${ASPECT}:${b.key}`, to: def })),
  ];
  return { ...graph, blocks, edges: Object.fromEntries(edges.map((e) => [e.id, e])) };
}
