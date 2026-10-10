/** The `definition` view: a definition large in the middle, and everything it is round it on a
 *  three by three grid, its chain's included — above, what it extends, a card of its own joined by
 *  a line named *extends*, between its tags and a note saying what the definition is for; left
 *  and right, its in and out ports; below, its both-way ports, its settings — the styles it wears,
 *  then what its chain states itself — and its traits. Each box
 *  draws only with something in it, joined to the middle card by a plain line.
 *
 *  Drawn, never stored: a graph handed back for a projection to read. Every block keeps its id, so
 *  a pick is the block's and an edit goes home (core `aspect_acts`); what the definition reads
 *  from its chain is listed by `inherited_in`. */

import { aspects_of, chain_of, def_at, gives, is_interface, is_style, is_trait, said_of,
         shown_name, ABOUT, type Block,
         type Carried, type Definition, type Graph, type Id, type Relation } from "@mnd/core";
import { band_size } from "./bands";
import { note_h } from "./face";
import { in_rows, on_grid, whole } from "./grid";
import { size_of, BLOCK, PAD } from "./size";

/** The layer a definition view is drawn on. */
export const ASPECT = "@aspect";

/** How an extends line draws: an open triangle at what is extended. */
const EXTENDS = { line: { dir: "forward", to_arrow: "hollow" } };

/** What a note says where the definition says nothing yet. */
const UNSAID = "what is this for? — double-click to say";

/** How wide the note is: a box holding one card. */
const NOTE_W = BLOCK.w + PAD * 2;

/** How many cards a box beside the middle lays to a row before it wraps, and the one under it. */
const SIDE = 2;
const UNDER = 3;

/** A box: its name, what it holds, how many to a row, and its cell round the middle card. */
type Box = { key: string; name: string; blocks: readonly Block[]; across: number; c: number;
             r: number };


/** What the view draws that the definition reads from its chain: ports, tags and traits declared
 *  further up. They wear the part mark, and are edited where they are declared. */
export function inherited_in(graph: Graph, def: Id): Id[] {
  const a = aspects_of(graph, def);
  return [...[...a.ins, ...a.outs, ...a.both].filter((p) => p.parent !== def).map((p) => p.id),
          ...[...a.tags, ...a.traits, ...a.styles, ...a.dropped].filter((c) => c.from !== def)
            .map((c) => c.id),
          ...settings_of(graph, def).filter((s) => s.from !== def).map((s) => s.id)];
}

/** What the view draws that the definition's chain drops: drawn struck, where it would sit. */
export function dropped_in(graph: Graph, def: Id): Id[] {
  return aspects_of(graph, def).dropped.map((c) => c.id);
}

/** The definition `def` on the `ASPECT` layer, everything it is placed round it. */
export function definition_graph(graph: Graph, def: Id): Graph {
  const d = graph.blocks[def]!;
  const aspects = aspects_of(graph, def);
  const defs = (ids: readonly Id[]) => ids.map((t) => def_at(graph, t)).filter((t): t is Definition => !!t);
  const parent = defs(aspects.extends ? [aspects.extends] : [])[0];
  /** What its chain drops, of each sort: drawn after what it carries. */
  const dropped = (is: (graph: Graph, id: Id) => boolean) =>
    aspects.dropped.map((c) => c.id).filter((t) => is(graph, t));
  const boxes: Box[] = [
    { key: "tags", name: "tags", across: SIDE, c: 0, r: 0,
      blocks: defs([...aspects.tags.map((c) => c.id), ...dropped((g, t) => !gives(g, t))]) },
    { key: "in", name: "in", blocks: aspects.ins, across: 1, c: 0, r: 1 },
    { key: "out", name: "out", blocks: aspects.outs, across: 1, c: 2, r: 1 },
    { key: "both", name: "ports", blocks: aspects.both, across: SIDE, c: 0, r: 2 },
    { key: "settings", name: "settings", across: UNDER, c: 1, r: 2,
      blocks: [...defs([...worn(graph, def, aspects.styles), ...dropped(is_style)]),
               ...settings_of(graph, def)] },
    { key: "traits", name: "traits", across: SIDE, c: 2, r: 2,
      blocks: defs([...aspects.traits.map((c) => c.id), ...dropped(is_trait)]) },
  ].filter((b) => b.blocks.length);

  /** Everything drawn, the middle large and the rest small, before any is placed. */
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [ASPECT]: { id: ASPECT, parent: null, name: "definition",
                settings: { layout: { kind: "free", face: "large" } } } };
  const seen = new Set<Id>([def]);
  blocks[def] = { ...d, parent: ASPECT };
  if (parent) {
    seen.add(parent.id);
    blocks[parent.id] = { ...parent, parent: ASPECT };
  }
  for (const box of boxes) {
    const id = `${ASPECT}:${box.key}`;
    blocks[id] = { id, parent: ASPECT, type: "group", name: box.name,
                   settings: { layout: { kind: "free", face: "small" } } };
    const held = box.blocks.filter((x) => !seen.has(x.id));
    for (const b of held) {
      seen.add(b.id);
      /** A port draws as a plain card here, not on a wall, still called what it was. */
      const { side: _side, at: _at, from: _from, ...card } = b as Block & { from?: Id };
      if (is_interface(graph, b.id)) delete card.type;
      blocks[b.id] = { ...card, name: b.name ?? shown_name(graph, b.id), parent: id };
    }
    const sized = held.map((b) => ({ id: b.id, ...size_of({ ...graph, blocks }, b.id) }));
    for (const p of on_grid(in_rows(sized, box.across))) {
      blocks[p.id] = { ...blocks[p.id]!, x: p.x, y: p.y };
    }
  }
  /** The note, a box wide, as tall as what it says. */
  const said = d.body?.trim() || UNSAID;
  blocks[ABOUT] = { id: ABOUT, parent: ASPECT, type: "note", name: said, w: NOTE_W,
                    h: whole(note_h(said, NOTE_W)) };

  /** Round the middle card on the grid: what it extends above, between its tags and the note;
   *  every box in its cell. */
  const drawn: Graph = { ...graph, blocks };
  const size = (id: Id) => (blocks[id]?.type === "group"
    ? band_size(drawn, ASPECT, blocks[id]!, "free") : size_of(drawn, id));
  const cells = [{ id: def, c: 1, r: 1 }, { id: parent?.id ?? "", c: 1, r: 0 }, { id: ABOUT, c: 2, r: 0 },
                 ...boxes.map((b) => ({ id: `${ASPECT}:${b.key}`, c: b.c, r: b.r }))]
    .filter(({ id }) => id && blocks[id])
    .map((cell) => ({ ...cell, ...size(cell.id) }));
  for (const p of on_grid(cells)) blocks[p.id] = { ...blocks[p.id]!, x: p.x, y: p.y };

  /** An extends line up, a tie to the note, and a plain line from each box. */
  const edges: Relation[] = [
    { id: `${ASPECT}:about`, from: ABOUT, to: def, type: "tie" },
    ...(parent ? [{ id: `${ASPECT}:extends`, from: def, to: parent.id, name: "extends",
                    settings: EXTENDS } as Relation] : []),
    ...boxes.map((b): Relation =>
      ({ id: `${ASPECT}:${b.key}:line`, from: `${ASPECT}:${b.key}`, to: def })),
  ];
  return { ...graph, blocks, edges: Object.fromEntries(edges.map((e) => [e.id, e])) };
}

/** The styles a definition wears that still say something: one a nearer word overrides whole —
 *  `block`'s family under a folder's — is not drawn. */
function worn(graph: Graph, def: Id, styles: readonly Carried[]): Id[] {
  const said = said_of(graph, def);
  return styles.map((c) => c.id).filter((t) => said.some((p) => p.from === t));
}

/** Each setting the definition's chain states itself, a small card each, named for what it says;
 *  what its traits and styles give is theirs, drawn by them. `block` names the engine module a kind runs
 *  on, not how it reads. */
function settings_of(graph: Graph, def: Id): (Block & { from: Id })[] {
  const chain = new Set(chain_of(graph, def).map((d) => d.id));
  const shown = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v));
  return said_of(graph, def).filter((p) => p.key !== "block" && chain.has(p.from))
    .map((p) => ({ id: `${ASPECT}:set:${p.key}.${p.name}`, parent: ASPECT, from: p.from,
                   name: `${p.name}: ${shown(p.value)}` }));
}
