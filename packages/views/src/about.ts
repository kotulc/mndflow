/** What a block says off its own layer: its card's face as the tray and the hover card draw it,
 *  its facts, the preview a map chip shows of it, and its hover card. One reading for the library
 *  and the models alike. Worked out when asked, never stored. */

import { base_of, children, def_at, diagram_kind, is_base, is_folder, is_header, is_holder, is_interface,
         is_notation, line_layer, path, shown_name, type Graph, type Id } from "@mnd/core";
import { carried } from "./derive";
import { card_facts, facts_of, type Facts } from "./facts";
import { edge_of, face_table, face_text, head_words, listed, name_fit } from "./face";
import { box_label, box_place, usage_groups } from "./library";
import { entry_look, face_attrs, look_of, PLAIN, tint_attrs, type Look, type Tint } from "./look";
import type { Ruled } from "./scene";
import { fitted, size_of, type Face } from "./size";

/** A card's face as a surface off the layer draws it, and the size it is drawn at. */
export type FaceProps = {
  label: string; kind?: string; defines?: boolean; role?: string;
  icon?: string; holds: boolean; stamps?: readonly string[]; classes: readonly string[];
  dress: Record<string, unknown>; text?: string; table?: Ruled; head: boolean;
  fit?: { size: number; lines: number }; w: number; h: number;
  /** A large face that shows nothing yet, previewing what it could. */
  sample: boolean;
};

/** What a chip previews where it draws no structure and no uses: a table's rows, or lines; a
 *  definition's profile also its places, each with how many uses it holds. */
export type Preview = { rows?: string[][]; lines?: string[];
                        places?: { id: Id; label: string; n: number; tint: Tint }[] };

/** **A hover card**: where it sits, what it is, every fact, its face, and where it is used or
 *  what it holds. */
export type Hovered = { path: string; label: string; kind?: string; extends?: string;
                        description?: string; facts: Facts; face?: FaceProps;
                        used?: { id: Id; label: string; tint: Tint; names: string[] }[];
                        holds?: string[] };


/** What a large face previews where it shows nothing yet: its attributes, then its body. */
const PARTS: Look["shows"] = ["attributes", "body"];

/** What a large face says where its card says nothing yet. */
const SAMPLE = "Sample content: what a card **says**, rendered as markdown.\n\n"
  + "- a point\n- another point";

/** The most a hover card lists of what a block holds, and of each place's uses. */
const LISTED = 12;
const PER_PLACE = 6;


/** **A card's face, as every surface off the layer draws it**: the large where asked, else the
 *  small; a large face showing nothing previews its attributes and body, else sample content, at
 *  the size that fits. It says its kind as the canvas does. */
export function face_props(graph: Graph, id: Id, face: Face): FaceProps {
  const data = carried(graph, id, face);
  const look = data.look ?? PLAIN;
  const sample = face === "large" && !look.size && !look.shows.length;
  const previewed = { ...look, shows: PARTS };
  const table = sample ? face_table(graph, id, previewed) : data.table ?? null;
  const text = sample ? face_text(graph, id, previewed) || (table ? "" : SAMPLE) : data.text;
  const kind = data.kind ?? "";
  /** A large face is fitted to what it says; one its definition sizes, and the small face, take
   *  the canvas's size. */
  const { w, h } = face === "large" && !look.size
    ? fitted(data.label, text ?? "", head_words(graph, id, look), table, edge_of(look),
             !!card_facts(graph, id)) : size_of(graph, id, face);
  const fit = face === "small" && look.face !== "text"
    ? name_fit(data.label, { w, h }, !!kind, look.shape === "diamond") : null;
  return { label: data.label, ...(kind ? { kind } : {}),
           ...(data.defines ? { defines: true } : {}), ...(data.role ? { role: data.role } : {}),
           ...(look.icon ? { icon: look.icon } : {}), holds: data.marks.includes("container"),
           ...(data.stamps ? { stamps: data.stamps } : {}), classes: data.marks,
           dress: face_attrs(look), ...(text !== undefined ? { text } : {}),
           ...(table ? { table } : {}), head: look.head !== false, ...(fit ? { fit } : {}),
           w, h, sample };
}

/** The face a block is known by: the large where its look draws one, else the small. */
export function known_face(graph: Graph, id: Id): Face {
  const look = carried(graph, id, "large").look ?? PLAIN;
  return look.size || look.shows.length ? "large" : "small";
}


/** **What a chip previews of a block**, the first it has: its attributes as rows — what it
 *  answers, or what it declares — its records, its body as lines, its description. */
export function preview_of(graph: Graph, id: Id): Preview | null {
  const b = graph.blocks[id];
  if (!b) return null;
  const rows = listed(graph, id).map((r) => [r.name, r.value ?? r.type]);
  if (rows.length) return { rows };
  const records = b.records ?? [];
  if (records.length) {
    const names = [...new Set(records.flatMap((r) => Object.keys(r)))];
    return { rows: records.map((r) => names.map((n) => r[n] ?? "")) };
  }
  const body = plain(b.body ?? "");
  if (body.length) return { lines: body };
  const description = told(graph, id);
  return description ? { lines: [description] } : null;
}

/** **What a block is for**: its own description, else — where it is typed — its definition's. A
 *  plain block is no kind of thing, so the base block's words say nothing of it. */
function told(graph: Graph, id: Id): string | undefined {
  const b = graph.blocks[id];
  return b?.description ?? (b?.type ? def_at(graph, b.type)?.description : undefined);
}

/** Markdown as the plain lines a chip has room for: headings, lists and quotes bare, emphasis
 *  and code their words, a link its words, a table row's cells side by side; its rules, fences
 *  and blank lines left out. A word joined by underscores keeps them. */
function plain(text: string): string[] {
  const cells = (l: string) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
    .join(" · ");
  return text.split("\n").map((l) => l.trim())
    .filter((l) => l && !/^\|?[\s:|-]+\|?$/.test(l) && !/^(```|~~~)/.test(l))
    .map((l) => l.replace(/^(#+|>|[-*+]|\d+\.)\s+/, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/(\*\*|__|\*|`)(?=\S)(.+?)(?<=\S)\1/g, "$2"))
    .map((l) => (l.startsWith("|") ? cells(l) : l));
}

/** **A hover card's reading of a block**: its path, its name and kind — a diagram's its diagram
 *  kind, a usage its definition, else its base kind — what a definition extends, its
 *  description, its facts and face; a definition in the library where it is used, place by
 *  place, anything else what it holds. Nothing where the id is no block. */
export function hover_of(graph: Graph, id: Id, library: boolean): Hovered | null {
  if (graph.edges[id]) return line_hover(graph, id);
  const place = boxed_place(graph, id);
  if (place) return hover_of(graph, place, false);
  const b = graph.blocks[id];
  if (!b) return null;
  const up = path(graph, id).slice(0, -1).map((p) => p.name ?? shown_name(graph, p.id));
  const kind = kind_of(graph, id);
  const parent = b.def && b.type ? def_at(graph, b.type)?.name ?? b.type : undefined;
  const description = told(graph, id);
  /** A package or a folder draws no card; anything else its known face. */
  const card = b.parent !== null && !is_folder(graph, id);
  const used = library && b.def ? usage_groups(graph, id).map((g) => ({
    id: g.place, label: box_label(graph, g.place), tint: tint_attrs(colour_of(graph, g.place)),
    names: g.uses.slice(0, PER_PLACE).map((u) => shown_name(graph, u.id))
      .concat(g.uses.length > PER_PLACE ? [`+${g.uses.length - PER_PLACE}`] : []) })) : [];
  const held = children(graph, id).filter((c) => !is_interface(graph, c.id)
    && !is_header(graph, c.id) && (!is_notation(graph, c.id) || is_holder(graph, c.id)));
  const holds = held.slice(0, LISTED).map((c) => shown_name(graph, c.id))
    .concat(held.length > LISTED ? [`+${held.length - LISTED}`] : []);
  return { path: up.join(" › "), label: shown_name(graph, id), kind,
           ...(parent && parent !== kind ? { extends: parent } : {}),
           ...(description ? { description } : {}), facts: facts_of(graph, id, library),
           ...(card ? { face: face_props(graph, id, known_face(graph, id)) } : {}),
           ...(used.length ? { used } : {}), ...(!used.length && holds.length ? { holds } : {}) };
}

/** **What an element is, in a word**, as its card, its hover card and the tray's head all name
 *  it: a usage its definition, else a diagram its diagram kind, a line its relation type, else its
 *  base kind. */
export function kind_of(graph: Graph, id: Id): string {
  const e = graph.edges[id];
  if (e) return (e.type ? def_at(graph, e.type)?.name : undefined) ?? "line";
  const b = graph.blocks[id];
  if (!b) return "";
  const at = (!b.def && b.type && !is_base(b.type) ? b.type : null) ?? diagram_kind(graph, id)
    ?? (!b.def && b.type ? b.type : base_of(graph, id));
  return def_at(graph, at)?.name ?? at;
}

/** **A line's hover card**: its ends, its kind, where it crosses and what its kind is for. */
function line_hover(graph: Graph, id: Id): Hovered {
  const e = graph.edges[id]!;
  const kind = e.type ? def_at(graph, e.type) : undefined;
  const at = line_layer(graph, id);
  const up = at ? path(graph, at).map((p) => p.name ?? shown_name(graph, p.id)) : [];
  const description = kind?.description;
  return { path: up.join(" › "),
           label: `${shown_name(graph, e.from)} → ${shown_name(graph, e.to)}`,
           kind: kind?.name ?? "line", ...(description ? { description } : {}),
           facts: { counts: [], ports: [], tags: [] } };
}

/** The place a usage box in a definition's chip stands for, where an id is one. */
function boxed_place(graph: Graph, id: Id): Id | null {
  const at = id.indexOf("@");
  return at > 0 && graph.blocks[id.slice(0, at)] ? box_place(id.slice(0, at), id) : null;
}

/** **A block's colour on a map**: a diagram's its kind's, whatever it is typed by; else its own. */
export function colour_of(graph: Graph, id: Id): Look {
  const kind = diagram_kind(graph, id);
  return kind ? entry_look(graph, kind) : look_of(graph, id);
}


