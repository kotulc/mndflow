/** The large face: the table of attributes and the markdown it shows, and the room they need.
 *
 *  Measured from the text, never the page, so a layout sizes its cards headless. The estimate
 *  follows the face's stylesheet — monospace, a line of 16px, a table row of 17px — near enough
 *  that what is shown fits. A table's columns are measured exactly once, here, and drawn at those
 *  widths, and **a table card is its table**: its title row, its rows — room for two at least, as
 *  every large face keeps — and its border. */

import { alias_of, attributes_of, behaviours_of, holds_records, is_definition, links_to,
         notation_of, resolved,
         schema_def,
         setting_of, shown_name, signature_of, stamps_of, type_name, unit_of, type Attribute,
         type Graph, type Id } from "@mnd/core";
import { look_of, type Look } from "./look";
import type { Listed, Ruled } from "./scene";
import { LARGE, UNIT } from "./size";

/** One glyph's width, in pixels, at each size the face writes in. */
const GLYPH = { name: 7.8, body: 7.2, table: 6.6, kind: 6.4 };

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
 *  **the header** (two lines, always: name over meta) and its divider, the square icon beside the
 *  name and the gap before it — then a table card's header row with its padding and rule, what a
 *  cell spends beside its text, and the room each mark takes at the end of the last row, inset
 *  from the corner. All as `face.css` draws them. */
const PAD = { x: 16, gutter: 13, y: 6, head: 36, icon: 34 + 10, gap: 4, title: 45,
              cell: 10, mark: 15, corner: 8 };

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
  const ruled = look.shows.includes("behaviours") ? class_table(graph, id, marks)
    : look.shows.includes("attributes") ? table(answered(graph, id), marks) : null;
  return ruled && held(ruled);
}

/** **A table never runs out of its card** (no overlap): past the rows the tallest large face
 *  holds, the last row kept says how many more there are, read in full in the tray. */
function held(ruled: Ruled): Ruled {
  const most = Math.floor((LARGE.max.h * UNIT - PAD.title - 2) / ROW);
  if (ruled.cells.length <= most) return ruled;
  const more = ruled.cells.length - most + 1;
  const blank = ruled.cells[0]!.map(() => "");
  return { ...ruled, cells: [...ruled.cells.slice(0, most - 1), [`+${more} more`, ...blank.slice(1)]],
           ...(ruled.split !== undefined && ruled.split >= most - 1 ? { split: undefined } : {}) };
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

/** The head's words after the name, as a large face is sized for them: its kind, then a
 *  definition's badge, which reads about as wide as its word in the kind's type. */
export function head_words(graph: Graph, id: Id, look: Look = look_of(graph, id)): string {
  return [handle_of(graph, id, look), is_definition(graph, id) ? "definition" : ""]
    .filter(Boolean).join(" ");
}

/** **The kind a card says after its name**: what it is, where it is more than a plain block and
 *  not notation, then its handle — while it is unnamed, or always or never where its look says. */
export function handle_of(graph: Graph, id: Id, look: Look = look_of(graph, id)): string {
  const alias = look.alias === undefined ? alias_of(graph, id)
    : look.alias ? alias_of(graph, id, true) : "";
  const kind = notation_of(graph, id) ? "" : type_word(look.kind, shown_name(graph, id));
  return [kind, alias].filter(Boolean).join(" · ");
}

/** The type word a card or a heading wears: none for a plain block, or for one its name repeats,
 *  which says nothing the card does not. */
export function type_word(kind: string, name: string): string {
  return kind === "block" || kind === name ? "" : kind;
}

/** The room a large face needs, in pixels: its name and kind on one line — over its table of
 *  attributes, as that table's title row, inside a border `edge` wide — then its facts strip where
 *  it has one, then its markdown, every table whole and its prose wrapped at the width that leaves.
 *  Unbounded; the caller holds it. */
export function fit_of(name: string, text: string, kind: string, most_w: number,
                       ruled: Ruled | null = null, edge = 1): Size {
  const blocks = blocks_of(text);
  const head = head_w(name, kind);
  const across = ruled ? ruled.widths.reduce((sum, w) => sum + w, 0) : 0;
  const wide = Math.max(head, across, ...blocks.map((b) => PAD.x + (b.kind === "table"
    ? table_width(b.rows) : b.kind === "image" ? IMAGE.w : PAD.gutter + longest(b.lines) * GLYPH.body)));
  const w = Math.min(wide, most_w);
  const per = Math.max(1, Math.floor((w - PAD.x - PAD.gutter) / GLYPH.body));
  const body = blocks.reduce((h, b) => h + PAD.gap + (b.kind === "table" ? b.rows.length * ROW + 1
    : b.kind === "image" ? IMAGE.h
    : b.kind === "fence" ? b.lines.length * LINE
    : b.lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / per)), 0) * LINE), 0);
  /** **Never shorter than a head and two rows**, so a blank face lines up with a full one. */
  if (!ruled) return { w: wide, h: PAD.y + PAD.head + Math.max(body, PAD.gap + 2 * LINE) };
  /** A table is ruled edge to edge, its title its top row and its last rule the border's — unless
   *  a padded body follows it. */
  const rows = PAD.title + Math.max(2, ruled.cells.length) * ROW + (blocks.length ? PAD.y + body : -1);
  return { w: wide + edge * 2, h: rows + edge * 2 };
}

/** How many whole lines of prose a large face `h` pixels tall holds under its head. */
export function body_lines(h: number): number {
  return Math.max(1, Math.floor((h - PAD.y - PAD.head - PAD.gap) / LINE));
}

/** How wide a header writes its name beside its icon, or its kind where that reads wider. */
export function head_w(name: string, kind = ""): number {
  return PAD.x + PAD.icon + Math.max(name.length * GLYPH.name, kind.length * GLYPH.kind);
}

/** How wide one line of a name writes, in pixels, with the card's padding either side. */
export function name_w(name: string): number {
  return PAD.x + name.length * GLYPH.name;
}

/** How tall a note writing `text` is, `w` pixels wide: its words wrapped whole, a line
 *  `NOTE_LINE` tall, and the card's padding and border. */
export function note_h(text: string, w: number): number {
  const per = Math.max(1, Math.floor((w - PAD.x - PAD.gutter) / GLYPH.body));
  return (PAD.y + EDGE.thin!) * 2 + wrapped(text, per) * NOTE_LINE;
}

/** How many lines `text` takes at `per` characters a line, its words wrapped whole. */
function wrapped(text: string, per: number): number {
  const most = Math.max(1, per);
  let lines = 0;
  for (const para of text.split("\n")) {
    let at = 0;
    lines += 1;
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const need = at ? at + 1 + word.length : word.length;
      /** A word longer than a line breaks over as many as it needs. */
      if (need > most) {
        lines += Math.ceil(word.length / most) - (at ? 0 : 1);
        at = word.length % most;
      } else at = need;
    }
  }
  return lines;
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

/** **What a face shows of its attributes** (2026-11-15): a schema — a definition, a stand-in for
 *  one, a block holding usages of one — shows them all, each by its type; a usage only those it
 *  or its definition answers, never an empty row. */
export function answered(graph: Graph, id: Id): Listed[] {
  const all = listed(graph, id);
  return schema_of(graph, id) ? all : all.filter((r) => r.value);
}

/** The definition whose schema a block shows whole: its own, what it stands in for, or the one
 *  its usages are of; none for a plain usage. */
function schema_of(graph: Graph, id: Id): Id | undefined {
  const b = graph.blocks[id];
  if (!b) return undefined;
  if (b.def) return b.id;
  const stands_in = resolved(graph, id).stands_in;
  if (stands_in) return stands_in.id;
  const held = schema_def(graph, id);
  return held && held !== b.type ? held : undefined;
}

/** What a card's attributes list. A schema (`schema_of`) lists what it declares, with its
 *  defaults. Anything else lists what it answers, then whatever it answers beyond them. */
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
  const schema = schema_of(graph, id);
  if (schema) return declared(schema);
  const own = b.values ?? [];
  const asked = declared(b.type ?? "");
  const extra = own.filter((v) => !asked.some((a) => a.name === v.name))
    .map((v): Listed => ({ name: v.name, type: "text" }));
  return [...asked, ...extra].map((row) => {
    /** **A usage reads its definition's answer through** (2026-11-08): what it states, else the
     *  default its definition gives. */
    const mine = own.find((v) => v.name === row.name)?.value;
    return mine ? { ...row, value: mine } : row;
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

/** **Where a table card's row sits**: the middle of row `i` (from 0), down from the card's top,
 *  in pixels — under its header row, inside a border `edge` wide. Lines leave a class or entity
 *  card from a field's row (docs/diagrams/class.md, entity.md). */
export function row_mid(i: number, edge = 1): number {
  return edge + PAD.title + i * ROW + ROW / 2;
}
