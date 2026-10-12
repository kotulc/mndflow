/** The `definition` view: a definition large in the middle, and everything it is round it on a
 *  grid, its chain's included — above, what it extends, a card of its own joined by a line named
 *  *extends*, between its tags and a note saying what the definition is for; left and right, a
 *  block definition's in and out ports, or the definitions a relation definition's ends may join;
 *  below, its both-way ports, its settings — a table card per component its chain states itself —
 *  and its traits; under all, what uses it. The middle card shows its attributes, a block's or a
 *  relation's alike. Each box draws only with something in it, joined to the middle card by a
 *  plain line.
 *
 *  Drawn, never stored: a graph handed back for a projection to read. Every block keeps its id, so
 *  a pick is the block's and an edit goes home (core `aspect_acts`); what the definition reads
 *  from its chain is listed by `inherited_in`. */

import { aspects_of, attributes_of, chain_of, def_at, domain_of, is_interface, said_of,
         shown_name, used_by, ABOUT, type Block, type Definition, type Graph, type Id,
         type Relation } from "@mnd/core";
import { band_size } from "./bands";
import { note_h } from "./face";
import { in_rows, on_grid, whole } from "./grid";
import { size_of, BLOCK, PAD } from "./size";

/** The layer a definition view is drawn on. */
export const ASPECT = "@aspect";

/** How an extends line draws: an open triangle at what is extended, labelled *extends*. */
const EXTENDS = { line: { dir: "forward", to_arrow: "hollow" } };

/** What a note says where the definition says nothing yet. */
const UNSAID = "what is this for? — double-click to say";

/** How wide the note is: a box holding one card. */
const NOTE_W = BLOCK.w + PAD * 2;

/** How many cards a box beside the middle lays to a row before it wraps, and the one under it. */
const SIDE = 2;
const UNDER = 3;

/** How many usages the view draws before it says how many more there are. */
const USAGES = 9;

/** A box: its name, what it holds, how many to a row, and its cell round the middle card. */
type Box = { key: string; name: string; blocks: readonly Block[]; across: number; c: number;
             r: number; cards?: "large" };


/** What the view draws that the definition reads from its chain: ports declared further up, a
 *  relation's ends where it says none itself, and tags and traits where it states no list of its
 *  own. They wear the part mark, and are edited where they are declared. */
export function inherited_in(graph: Graph, def: Id): Id[] {
  const a = aspects_of(graph, def);
  const own_ends = graph.blocks[def]?.settings?.["allows"]?.["ends"] !== undefined;
  return [...[...a.ins, ...a.outs, ...a.both].filter((p) => p.parent !== def).map((p) => p.id),
          ...(own_ends ? [] : [...a.from, ...a.to, ...a.to.map((t) => `${ASPECT}:to:${t}`)]),
          ...[a.tags, a.traits].flatMap((held) => (held.from === def ? [] : held.ids)),
          ...settings_of(graph, def).filter((s) => s.from !== def).map((s) => s.id)];
}

/** The definition `def` on the `ASPECT` layer, everything it is placed round it. */
export function definition_graph(graph: Graph, def: Id): Graph {
  const d = graph.blocks[def]!;
  const aspects = aspects_of(graph, def);
  const defs = (ids: readonly Id[]) => ids.map((t) => def_at(graph, t)).filter((t): t is Definition => !!t);
  const parent = defs(aspects.extends ? [aspects.extends] : [])[0];
  const relation = domain_of(graph, def) === "relation";
  const usages = used_by(graph, def);
  const more = usages.length - USAGES;
  const boxes: Box[] = [
    { key: "tags", name: "tags", across: SIDE, c: 0, r: 0, blocks: defs(aspects.tags.ids) },
    ...(relation
      ? [{ key: "from", name: "from", blocks: defs(aspects.from), across: 1, c: 0, r: 1 },
         { key: "to", name: "to", blocks: defs(aspects.to), across: 1, c: 2, r: 1 }]
      : [{ key: "in", name: "in", blocks: aspects.ins, across: 1, c: 0, r: 1 },
         { key: "out", name: "out", blocks: aspects.outs, across: 1, c: 2, r: 1 }]),
    { key: "both", name: "ports", blocks: aspects.both, across: SIDE, c: 0, r: 2 },
    { key: "settings", name: "settings", across: UNDER, c: 1, r: 2, cards: "large" as const,
      blocks: settings_of(graph, def) },
    { key: "traits", name: "traits", across: SIDE, c: 2, r: 2, blocks: defs(aspects.traits.ids) },
    { key: "usages", name: more > 0 ? `usages · ${more} more` : "usages", across: UNDER, c: 1,
      r: 3, blocks: usages.slice(0, USAGES) },
  ].filter((b) => b.blocks.length);

  /** Everything drawn, the middle large and the rest small, before any is placed. */
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [ASPECT]: { id: ASPECT, parent: null, name: "definition",
                settings: { layout: { kind: "free", cards: "large" } } } };
  const seen = new Set<Id>([def]);
  /** The middle card shows its attributes as a table, whatever face its chain gives it elsewhere. */
  const card = attributes_of(graph, def).length
    ? { settings: { ...d.settings, card: { ...d.settings?.["card"], face: "table" } } } : {};
  /** Its body is what it is for, which the note says: the card draws its attributes alone. */
  const { body: _about, ...plain } = d;
  blocks[def] = { ...plain, ...card, parent: ASPECT };
  if (parent) {
    seen.add(parent.id);
    blocks[parent.id] = { ...parent, parent: ASPECT };
  }
  for (const box of boxes) {
    const id = `${ASPECT}:${box.key}`;
    blocks[id] = { id, parent: ASPECT, type: "group", name: box.name,
                   settings: { layout: { kind: "free", cards: box.cards ?? "small" } } };
    /** One drawn already — a definition at both ends — is drawn again under the box's id. */
    const held = box.blocks.map((x) => (seen.has(x.id) ? { ...x, id: `${id}:${x.id}` } : x));
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
                    settings: EXTENDS }] : []),
    ...boxes.map((b): Relation => b.key === "to" || b.key === "out"
      ? { id: `${ASPECT}:${b.key}:line`, from: def, to: `${ASPECT}:${b.key}` }
      : { id: `${ASPECT}:${b.key}:line`, from: `${ASPECT}:${b.key}`, to: def }),
  ];
  return { ...graph, blocks, edges: Object.fromEntries(edges.map((e) => [e.id, e])) };
}

/** What the definition's chain states itself, **one table card per component** — `style`, `card`,
 *  `layout` — a row per setting, and who says it where that is further up its chain. What its
 *  traits give is theirs, drawn by them. `block` names the engine module a kind runs
 *  on, not how it reads. A card is inherited where its chain says all of it. */
function settings_of(graph: Graph, def: Id): (Block & { from: Id })[] {
  const chain = chain_of(graph, def);
  const name = (id: Id) => chain.find((d) => d.id === id)?.name ?? id;
  /** A value as one table cell: a bar escaped, on one line. */
  const shown = (v: unknown) => (Array.isArray(v) ? v.join(", ")
    : typeof v === "object" ? JSON.stringify(v) : String(v))
    .replace(/\|/g, "\\|").replace(/\n/g, " ");
  const said = said_of(graph, def).filter((p) => p.key !== "block"
    && chain.some((d) => d.id === p.from)).flatMap((p) => (is_ends(p) ? flows_of(p) : [p]));
  const keys = [...new Set(said.map((p) => p.key))];
  return keys.map((key) => {
    const rows = said.filter((p) => p.key === key);
    const far = rows.some((p) => p.from !== def);
    const table = [far ? "| setting | value | from |" : "| setting | value |",
                   far ? "|---|---|---|" : "|---|---|",
                   ...rows.map((p) => `| ${p.name} | ${shown(p.value)} |`
                     + (far ? ` ${p.from === def ? "" : name(p.from)} |` : ""))].join("\n");
    return { id: `${ASPECT}:set:${key}`, parent: ASPECT, name: key, body: table,
             from: rows.some((p) => p.from === def) ? def : rows[0]!.from,
             settings: { card: { face: "document" } } };
  });
}

/** Whether a setting is `allows.ends`, whose definitions the view draws in its from and to boxes. */
function is_ends(p: { key: string; name: string }): boolean {
  return p.key === "allows" && p.name === "ends";
}

/** What `allows.ends` says beside the definitions drawn: the flow each end meets, a row each. */
function flows_of<T extends { name: string; value: unknown }>(p: T): T[] {
  const ends = (p.value ?? {}) as Record<string, unknown>;
  return (["fromFlow", "toFlow"] as const).filter((k) => typeof ends[k] === "string")
    .map((k) => ({ ...p, name: k === "fromFlow" ? "from flow" : "to flow", value: ends[k] }));
}
