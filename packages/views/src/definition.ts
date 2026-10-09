/** The `definition` view: a definition large in the middle, and what describes it round it — what
 *  it extends above, joined by an extends line; its in and out ports left and right; its both-way
 *  ports, then its tags and traits, below; a note tied to it at the top right, its body. Each is a
 *  box drawn only with something in it, joined to the middle card by a plain line — what it
 *  extends by an extends line.
 *
 *  Drawn, never stored: a graph handed back for a projection to read. Every block keeps its id, so
 *  a pick is the block's and an edit goes home (core `aspect_acts`). */

import { aspects_of, def_at, shown_name, ABOUT, type Block, type Definition, type Graph, type Id,
         type Relation } from "@mnd/core";
import { band_size } from "./bands";
import { GAP, size_of, UNIT } from "./size";

/** The layer a definition view is drawn on. */
export const ASPECT = "@aspect";

/** How far a box stands from the middle card. */
const APART = UNIT * 3;

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
    let at = 0;
    for (const b of box.blocks.filter((x) => !seen.has(x.id))) {
      seen.add(b.id);
      /** A port draws as a card here, not on a wall, still called what it was. */
      const { side: _side, at: _at, ...card } = b;
      blocks[b.id] = { ...card, name: b.name ?? shown_name(graph, b.id), parent: id,
                       x: box.down ? 0 : at, y: box.down ? at : 0 };
      const s = size_of({ ...graph, blocks }, b.id);
      at += (box.down ? s.h : s.w) + GAP;
    }
  }
  blocks[ABOUT] = { id: ABOUT, parent: ASPECT, type: "note",
                    name: d.body?.trim() || UNSAID };

  /** Placed round the middle card, sized as drawn. */
  const drawn: Graph = { ...graph, blocks };
  const size = (id: Id) => (blocks[id]?.type === "group"
    ? band_size(drawn, ASPECT, blocks[id]!, "free") : size_of(drawn, id));
  const mid = size(def);
  const put = (id: Id, x: number, y: number) => { blocks[id] = { ...blocks[id]!, x, y }; };
  put(def, 0, 0);
  const row = (ids: readonly Id[], y: number) => {
    const wide = ids.reduce((n, id) => n + size(id).w, 0) + APART * (ids.length - 1);
    let x = mid.w / 2 - wide / 2;
    for (const id of ids) { put(id, x, y); x += size(id).w + APART; }
  };
  const at = (key: string) => (blocks[`${ASPECT}:${key}`] ? `${ASPECT}:${key}` : null);
  const above = at("extends");
  const top = above ? -(size(above).h + APART) : 0;
  if (above) row([above], top);
  const note = size(ABOUT);
  put(ABOUT, mid.w + APART, Math.min(top, -(note.h + APART)));
  const left = at("in");
  if (left) put(left, -(size(left).w + APART), mid.h / 2 - size(left).h / 2);
  const right = at("out");
  if (right) put(right, mid.w + APART, mid.h / 2 - size(right).h / 2);
  const both = at("both");
  let y = mid.h + APART;
  if (both) { row([both], y); y += size(both).h + APART; }
  row([at("tags"), at("traits")].filter((x): x is Id => !!x), y);

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
