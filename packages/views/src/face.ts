/** The large face: the table of attributes and the markdown it shows, and the room they need.
 *
 *  Measured from the text, never the page, so a layout sizes its cards headless. The estimate
 *  follows the face's stylesheet — monospace, a line of 16px, a table row of 17px — near enough
 *  that what is shown fits. A table's columns are measured exactly once, here, and drawn at those
 *  widths, and **a table card is exactly its table**: its title row, its rows and its border. */

import { alias_of, attributes_of, behaviours_of, holds_records, links_to, schema_def,
         setting_of, shown_name, signature_of, stamps_of, type_name, unit_of, type Attribute,
         type Graph, type Id } from "@mnd/core";
import { look_of, type Look } from "./look";
import type { Listed, Ruled } from "./scene";
import { resolved } from "./through";

/** One glyph's width, in pixels, at each size the face writes in. */
const GLYPH = { name: 7.8, body: 7.2, table: 6.6 };

/** A line of prose, and a table's row with its rule, in pixels. */
const LINE = 16;

/** A line of a note's text, which reads taller than a face's prose. */
const NOTE_LINE = 20;
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
  return [...parts, records_text(graph, id)].filter(Boolean).join("\n\n");
}

/** A collection's records as a markdown table: a column per attribute of what they are
 *  (`records.of`), else per answer said, a row per record. Drawn in the one table look. */
export function records_text(graph: Graph, id: Id): string {
  const rows = graph.blocks[id]?.records ?? [];
  if (!rows.length || !holds_records(graph, id)) return "";
  const of = setting_of(graph, id, "records")["of"];
  const declared = typeof of === "string" ? attributes_of(graph, of).map((a) => a.name) : [];
  const names = declared.length ? declared : [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: string | undefined) => (v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [`| ${names.join(" | ")} |`, `|${names.map(() => "---").join("|")}|`,
          ...rows.map((r) => `| ${names.map((n) => cell(r[n])).join(" | ")} |`)].join("\n");
}

/** The large face's attributes, where its look shows them and it has any, with room at the end
 *  of the last row for the card's marks. A class face lists its fields, then its behaviours. */
export function face_table(graph: Graph, id: Id, look: Look = look_of(graph, id),
                           marks = stamps_of(graph, id).length): Ruled | null {
  if (look.shows.includes("behaviours")) return class_table(graph, id, marks);
  return look.shows.includes("attributes") ? table(listed(graph, id), marks) : null;
}

/** A class card's compartments as one ruled column: each field `name: type`, then — split from
 *  them by a rule — each behaviour's signature. */
export function class_table(graph: Graph, id: Id, marks = 0): Ruled | null {
  const fields = listed(graph, id).map((r) => (r.type === "text" ? r.name : `${r.name}: ${r.type}`));
  const of = resolved(graph, id).stands_in?.id ?? id;
  const methods = behaviours_of(graph, of).map((b) => signature_of(graph, b.id));
  const rows = [...fields, ...methods];
  if (!rows.length) return null;
  const room = marks ? PAD.corner + marks * PAD.mark : 0;
  const w = Math.ceil(PAD.cell + room + Math.min(CELL * 2, Math.max(...rows.map((r) => r.length)))
    * GLYPH.table);
  return { cells: rows.map((r) => [r]), widths: [w],
           ...(fields.length && methods.length ? { split: fields.length } : {}) };
}

/** How wide a card's border is, in pixels. */
export function edge_of(look: Look): number {
  return EDGE[look.border_width] ?? 1;
}

/** What a card wears in its top corner, over its name: what it is, where `card.label` says
 *  `inside` and it is more than a plain block, then its handle — while it is unnamed, or always or never where its look says. */
export function handle_of(graph: Graph, id: Id, look: Look = look_of(graph, id)): string {
  const alias = look.alias === undefined ? alias_of(graph, id)
    : look.alias ? alias_of(graph, id, true) : "";
  /** A plain block's type says nothing its card does not. */
  const kind = look.label === "inside" && look.kind !== "block" ? look.kind : "";
  return [kind, alias].filter(Boolean).join(" · ");
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

/** How wide one line of a name writes, in pixels, with the card's padding either side. */
export function name_w(name: string): number {
  return PAD.x + name.length * GLYPH.name;
}

/** How tall a note writing `text` is, `w` pixels wide: its words wrapped whole, a line
 *  `NOTE_LINE` tall, and the card's padding. */
export function note_h(text: string, w: number): number {
  const per = Math.max(1, Math.floor((w - PAD.x - PAD.gutter) / GLYPH.body));
  let lines = 0;
  for (const para of text.split("\n")) {
    let at = 0;
    lines += 1;
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const need = at ? at + 1 + word.length : word.length;
      if (at && need > per) { lines += Math.ceil(word.length / per); at = word.length % per; }
      else at = need;
    }
  }
  return PAD.y * 2 + lines * NOTE_LINE;
}

/** Attributes as a ruled table, a row each: type, name, then key, value and note where any row
 *  says one. Each column as wide as its widest cell, no wider than `CELL` characters; the last
 *  wider by the room `marks` take at the end of the last row. */
export function table(rows: readonly Listed[], marks = 0): Ruled | null {
  if (!rows.length) return null;
  const keyed = rows.some((r) => r.key || r.link);
  const key = (r: Listed) => (r.key === "primary" ? "PK" : r.key === "unique" ? "UK"
    : r.link ? "FK" : "");
  const valued = rows.some((r) => r.value);
  const noted = rows.some((r) => r.note);
  const cells = rows.map((r) => [r.type, r.name,
                                 ...(keyed ? [key(r)] : []),
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
  /** A type reads with the unit its values count in, its own or its type's. */
  const typed = (a: Attribute) => {
    const unit = unit_of(graph, a);
    return `${type_name(graph, a.type)}${unit ? ` (${unit})` : ""}`;
  };
  const declared = (def: Id) => attributes_of(graph, def).map((a): Listed => ({
    name: a.name, type: typed(a), ...(a.key ? { key: a.key } : {}),
    ...(links_to(graph, a) ? { link: true } : {}), ...(a.default ? { value: a.default } : {}),
    ...(a.note ? { note: a.note } : {}),
  }));
  if (b.def) return declared(b.id);
  const stands_in = resolved(graph, id).stands_in;
  if (stands_in) return declared(stands_in.id);
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
