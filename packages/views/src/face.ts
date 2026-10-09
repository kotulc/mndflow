/** The large face: the table of attributes and the markdown it shows, and the room they need.
 *
 *  Measured from the text, never the page, so a layout sizes its cards headless. The estimate
 *  follows the face's stylesheet — monospace, a line of 16px, a table row of 17px — near enough
 *  that what is shown fits. A table's columns are measured exactly once, here, and drawn at those
 *  widths, and **a table card is exactly its table**: its title row, its rows and its border. */

import { alias_of, attributes_of, def_at, links_to, schema_def, shown_name, stamps_of,
         type Graph, type Id } from "@mnd/core";
import { look_of, type Look } from "./look";
import type { Listed, Ruled } from "./scene";

/** One glyph's width, in pixels, at each size the face writes in. */
const GLYPH = { name: 7.8, body: 7.2, table: 6.6 };

/** A line of prose, and a table's row with its rule, in pixels. */
const LINE = 16;
const ROW = 17;

/** The widest a table's cell reads, in characters, before it is cut off. */
const CELL = 16;

/** The room an image takes in a large face, in pixels. */
const IMAGE = { w: 192, h: 96 };

/** What a large face spends round its body, in pixels: the card's padding, the corner's gutter,
 *  the head line and its divider, the room a handle over the name takes, and the same over a
 *  table card, which has no padding of its own — then a table's title row and the room beside its
 *  name for the icon, what a cell spends beside its text, and the room each mark takes at the end
 *  of the last row, inset from the corner. All as `face.css` draws them. */
const PAD = { x: 16, gutter: 13, y: 6, head: 24, handle: 8, over: 11, gap: 4, title: 21, side: 32,
              cell: 10, mark: 15, corner: 4 };

/** A card's border, in pixels, at each width `ramp.css` weighs it. */
const EDGE: Record<string, number> = { thin: 1, medium: 2, thick: 4 };


/** The large face's markdown: the parts the look shows that are prose, in its order — the body
 *  as written, the preview as an image. Its attributes are a table of their own (`face_table`). */
export function face_text(graph: Graph, id: Id, look: Look = look_of(graph, id)): string {
  const b = graph.blocks[id];
  if (!b) return "";
  const parts = look.shows.map((part) => {
    if (part === "body") return b.body?.trim() ?? "";
    if (part === "preview") return b.source ? `![${shown_name(graph, id)}](<${b.source}>)` : "";
    return "";
  });
  return parts.filter(Boolean).join("\n\n");
}

/** The large face's attributes, where its look shows them and it has any, with room at the end
 *  of the last row for the card's marks. */
export function face_table(graph: Graph, id: Id, look: Look = look_of(graph, id),
                           marks = stamps_of(graph, id).length): Ruled | null {
  return look.shows.includes("attributes") ? table(listed(graph, id), marks) : null;
}

/** How wide a card's border is, in pixels. */
export function edge_of(look: Look): number {
  return EDGE[look.border_width] ?? 1;
}

/** The handle a card wears over its name: while it is unnamed, or always or never where its
 *  look says. */
export function handle_of(graph: Graph, id: Id, look: Look = look_of(graph, id)): string {
  return look.alias === undefined ? alias_of(graph, id) : look.alias ? alias_of(graph, id, true) : "";
}

/** The room a large face needs, in pixels: its name and handle — over its table of attributes,
 *  as that table's title row, inside a border `edge` wide — then its markdown, every table whole
 *  and its prose wrapped at the width that leaves. Unbounded; the caller holds it. */
export function fit_of(name: string, text: string, handle: boolean, most_w: number,
                       ruled: Ruled | null = null, edge = 1): Size {
  const blocks = blocks_of(text);
  const head = (ruled ? PAD.side : PAD.x + PAD.gutter) + name.length * GLYPH.name;
  const across = ruled ? ruled.widths.reduce((sum, w) => sum + w, 0) : 0;
  const wide = Math.max(head, across, ...blocks.map((b) => PAD.x + (b.kind === "table"
    ? table_width(b.rows) : b.kind === "image" ? IMAGE.w : PAD.gutter + longest(b.lines) * GLYPH.body)));
  const w = Math.min(wide, most_w);
  const per = Math.max(1, Math.floor((w - PAD.x - PAD.gutter) / GLYPH.body));
  const body = blocks.reduce((h, b) => h + PAD.gap + (b.kind === "table" ? b.rows.length * ROW + 1
    : b.kind === "image" ? IMAGE.h
    : b.kind === "fence" ? b.lines.length * LINE
    : b.lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / per)), 0) * LINE), 0);
  if (!ruled) return { w: wide, h: PAD.y + PAD.head + (handle ? PAD.handle : 0) + body };
  /** A table is ruled edge to edge, its title its top row and its last rule the border's — unless
   *  a padded body follows it. */
  const rows = PAD.title + ruled.cells.length * ROW + (blocks.length ? PAD.y + body : -1);
  return { w: wide + edge * 2, h: rows + edge * 2 + (handle ? PAD.over : 0) };
}

/** Attributes as a ruled table, a row each: type, name, then key, value and note where any row
 *  says one. Each column as wide as its widest cell, no wider than `CELL` characters; the last
 *  wider by the room `marks` take at the end of the last row. */
export function table(rows: readonly Listed[], marks = 0): Ruled | null {
  if (!rows.length) return null;
  const keyed = rows.some((r) => r.key || r.link);
  const valued = rows.some((r) => r.value);
  const noted = rows.some((r) => r.note);
  const cells = rows.map((r) => [r.type, r.name,
                                 ...(keyed ? [r.key ? "PK" : r.link ? "FK" : ""] : []),
                                 ...(valued ? [r.value ?? ""] : []), ...(noted ? [r.note ?? ""] : [])]
    .map((c) => c.replace(/\n/g, " ")));
  const last = cells[0]!.length - 1;
  const room = marks ? PAD.corner + marks * PAD.mark : 0;
  const widths = cells[0]!.map((_, c) => Math.ceil(PAD.cell + (c === last ? room : 0)
    + Math.min(CELL, Math.max(...cells.map((row) => row[c]!.length))) * GLYPH.table));
  return { cells, widths };
}

/** What a card's attributes list. A stand-in for a definition lists what it declares, with its
 *  defaults, and so does a block holding usages of one. Anything else lists what it answers,
 *  then whatever it answers beyond them. */
export function listed(graph: Graph, id: Id): Listed[] {
  const b = graph.blocks[id];
  if (!b) return [];
  const typed = (type: Id | undefined) => def_at(graph, type)?.name ?? "text";
  const declared = (def: Id) => attributes_of(graph, def).map((a): Listed => ({
    name: a.name, type: typed(a.type), ...(a.key ? { key: true } : {}),
    ...(links_to(graph, a) ? { link: true } : {}), ...(a.default ? { value: a.default } : {}),
    ...(a.note ? { note: a.note } : {}),
  }));
  if (b.def) return declared(b.id);
  if (b.of && def_at(graph, b.of)) return declared(b.of);
  const held = schema_def(graph, id);
  if (held && held !== b.type) return declared(held);
  const own = b.values ?? [];
  const asked = declared(b.type ?? "");
  const extra = own.filter((v) => !asked.some((a) => a.name === v.name))
    .map((v): Listed => ({ name: v.name, type: "text" }));
  return [...asked, ...extra].map((row) => {
    const mine = own.find((v) => v.name === row.name)?.value;
    const { value: _default, ...rest } = row;
    return mine ? { ...rest, value: mine } : rest;
  });
}


type Size = { w: number; h: number };

/** One block of markdown as the face lays it out: a table's rows of cells, or lines. */
type Block =
  | { kind: "table"; rows: string[][] }
  | { kind: "fence" | "image" | "prose"; lines: string[] };

/** Markdown split into what draws: tables (their empty header and rule left out), fences, images
 *  and prose, with blank lines between them and the marks that draw nothing taken away. */
function blocks_of(text: string): Block[] {
  const out: Block[] = [];
  let fenced: string[] | null = null;
  let last: Block | null = null;
  for (const raw of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(raw)) {
      if (fenced) { out.push({ kind: "fence", lines: fenced }); fenced = null; }
      else fenced = [];
      last = null;
      continue;
    }
    if (fenced) { fenced.push(raw); continue; }
    const line = raw.trim();
    if (!line) { last = null; continue; }
    if (line.startsWith("|")) {
      const cells = line.replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => plain(c.trim()));
      if (cells.every((c) => !c || /^:?-+:?$/.test(c))) continue;
      if (last?.kind !== "table") { last = { kind: "table", rows: [] }; out.push(last); }
      last.rows.push(cells);
      continue;
    }
    if (/^!\[/.test(line)) { out.push({ kind: "image", lines: [line] }); last = null; continue; }
    if (last?.kind !== "prose") { last = { kind: "prose", lines: [] }; out.push(last); }
    last.lines.push(plain(line));
  }
  if (fenced) out.push({ kind: "fence", lines: fenced });
  return out;
}

/** A line as it reads: links as their text, and emphasis, code ticks and heading marks gone. */
function plain(s: string): string {
  return s.replace(/\]\([^)]*\)/g, "]").replace(/[*_`[\]]/g, "").replace(/^#+\s*/, "");
}

/** The longest of some lines, in characters. */
function longest(lines: readonly string[]): number {
  return Math.max(0, ...lines.map((l) => l.length));
}

/** A markdown table's width: each column as wide as its widest cell, no wider than the face
 *  cuts one. */
function table_width(rows: readonly string[][]): number {
  const cols = Math.max(0, ...rows.map((r) => r.length));
  let w = 1;
  for (let c = 0; c < cols; c++) {
    const chars = Math.min(CELL, Math.max(0, ...rows.map((r) => r[c]?.length ?? 0)));
    w += chars * GLYPH.table + PAD.cell;
  }
  return w;
}
