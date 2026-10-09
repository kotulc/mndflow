/** How a usage of a definition draws. */

import { ALIGNS, ARROWS, BORDERS, config_of, CONTRASTS, DEFAULTS, def_at, def_of, DISPLAYS,
         domain_of, FAMILIES, FILLS, FONTS, HEIGHTS, is_container, is_interface, is_trait,
         kind_word, PARTS, previewed, relation_base, attributes_of, SHOWN, stood_def, WEIGHTS,
         WIDTHS,
         type Definition, type Graph, type Id, type Settings } from "@mnd/core";

export type Family = (typeof FAMILIES)[number];
export type Width = (typeof WIDTHS)[number];
export type Border = (typeof BORDERS)[number];
export type Weight = (typeof WEIGHTS)[number];
export type Font = (typeof FONTS)[number];
export type Display = (typeof DISPLAYS)[number];
export type Height = (typeof HEIGHTS)[number];
export type Align = (typeof ALIGNS)[number];
export type Fill = (typeof FILLS)[number];
export type Contrast = (typeof CONTRASTS)[number];
export type Arrow = (typeof ARROWS)[number];
export type Part = (typeof PARTS)[number];

/** What one usage looks like, as names from closed sets. */
export type Look = {
  /** Which family the theme paints this with. */
  family: Family;
  fill: Fill;
  /** How opaque the fill is, 0 to 1. */
  opacity?: number;
  border_width: Width;
  border_style: Border;
  /** How far the border stands out from the card. */
  border_contrast?: Contrast;
  name_font: Font;
  name_weight: Weight;
  /** How far the name stands out. Absent is the ordinary one. */
  name_contrast?: Contrast;
  label_font: Font;
  label_weight: Weight;
  label_contrast?: Contrast;
  /** Where the label sits — the subtype where there is one, the base kind otherwise. */
  label: Display;
  /** Which end of the card its name reads from. */
  align: Align;
  /** Which end of the card its label reads from. */
  label_align: Align;
  /** Whether this card is the size its face says, or keeps whatever size it was given. */
  height: Height;
  /** Whether the handle is drawn, where somebody said. */
  alias?: boolean;
  /** What the large face shows under the name, in order. */
  shows: readonly Part[];
  /** The large face's size in units, where its definition said one. */
  size?: { w: number; h: number };
  /** False where the large face does not draw the name, so what it shows is the whole card. */
  head?: boolean;
  /** What sort of thing this is, as a word: the subtype where somebody named one, the base kind
   *  otherwise. */
  kind: string;
  /** The mark this draws in its corner instead of the one its role would. */
  icon?: string;
  /** The hue angle this paints itself with, where somebody gave one instead of naming a family. */
  hue?: number;
  /** How much of the theme's chroma ceiling that hue is taken at. */
  intensity?: number;
};

/** What a card is when its definition says nothing. */
export const PLAIN: Look = {
  family: DEFAULTS["style.family"],
  fill: DEFAULTS["style.fill"],
  border_width: DEFAULTS["style.border_width"],
  border_style: DEFAULTS["style.border_style"],
  name_font: DEFAULTS["style.name_font"],
  name_weight: DEFAULTS["style.name_weight"],
  label_font: DEFAULTS["style.label_font"],
  label_weight: DEFAULTS["style.label_weight"],
  label: DEFAULTS["card.label"],
  align: DEFAULTS["card.align"],
  label_align: DEFAULTS["card.label_align"],
  height: DEFAULTS["card.height"],
  shows: [],
  kind: "block",
};

/** What this element says under one component key, chain first and its own last word over it. */
function settings(graph: Graph, id: Id, key: string): Settings {
  /** A definition is its own last word. */
  if (def_at(graph, id)) return config_of(graph, id, key);
  const it = graph.blocks[id] ?? graph.edges[id];
  return { ...config_of(graph, def_of(graph, id), key), ...(it?.settings?.[key] ?? {}) };
}

/** One value if it is in the set, or the fallback. */
function one<T extends string>(value: unknown, set: readonly T[], fallback: T): T {
  return typeof value === "string" && (set as readonly string[]).includes(value)
    ? value as T : fallback;
}

/** How this usage draws. */
export function look_of(graph: Graph, id: Id): Look {
  const block = graph.blocks[id];
  if (!block) return PLAIN;

  /** The chain, then the element's own last word. A reference to a block previews it, and a
   *  stand-in for a definition looks as its usages do: as what it stands for, but for what it
   *  says of itself, and its mark says it stands in. */
  const stood = stood_def(graph, id);
  if (stood) return stand_in(graph, id, stood);
  /** A definition drawn on its package's layer reads as its usages do. */
  if (block.def) return stand_in(graph, id, block as Definition);
  const source = graph.blocks[previewed(graph, id)]!;
  const card = settings(graph, source.id, "card");
  const style = source === block ? settings(graph, id, "style")
    : { ...settings(graph, source.id, "style"), ...(block.settings?.["style"] ?? {}) };
  const named = def_at(graph, source.type)?.name;
  return dressed(graph, id, card, style, named ?? kind_word(graph, source).toLowerCase(),
                 source.type ?? source.id);
}

/** How a stand-in for a definition draws: as its usages, named, showing only what it has — a
 *  body handed to it, as a chart hands a tag what it means, and attributes where it has some —
 *  and a relation wearing its line. */
function stand_in(graph: Graph, id: Id, def: Definition): Look {
  const own = (graph.blocks[id]!.def ? {} : graph.blocks[id]!.settings) ?? {};
  const card = { ...config_of(graph, def.id, "card"), ...(own["card"] ?? {}) };
  /** A trait's settings grant capabilities to carriers; they are not how it draws in vocabulary. */
  const has = (part: unknown) => part === "body"
    ? !is_trait(graph, def.id) && !!graph.blocks[id]!.body
    : part === "attributes" && attributes_of(graph, def.id).length > 0;
  const shows = Array.isArray(card["shows"]) ? card["shows"].filter(has) : [];
  const style = { ...config_of(graph, def.id, "style"), ...(own["style"] ?? {}) };
  const relation = domain_of(graph, def.id) === "relation";
  const tie = relation && relation_base(graph, def.id) === "tie";
  const look = dressed(graph, id, { ...card, name: "show", shows }, style, def.name, def.id);
  return relation && !look.icon ? { ...look, icon: tie ? "relation_tie" : "relation_plain" } : look;
}

/** A look from what the chain and the element say, under the kind it reads as. `of` is the
 *  definition it reads as, which keys its shade. */
function dressed(graph: Graph, id: Id, card: Settings, style: Settings, kind: string,
                 of: Id): Look {
  return {
    family: one(style["family"], FAMILIES, PLAIN.family),
    fill: one(style["fill"], FILLS, PLAIN.fill),
    border_width: one(style["border_width"], WIDTHS, width_of(graph, id)),
    border_style: one(style["border_style"], BORDERS, PLAIN.border_style),
    name_font: one(style["name_font"], FONTS, PLAIN.name_font),
    name_weight: one(style["name_weight"], WEIGHTS, PLAIN.name_weight),
    label_font: one(style["label_font"], FONTS, PLAIN.label_font),
    label_weight: one(style["label_weight"], WEIGHTS, PLAIN.label_weight),
    label: one(card["label"], DISPLAYS, PLAIN.label),
    align: one(card["align"], ALIGNS, PLAIN.align),
    label_align: one(card["label_align"], ALIGNS, PLAIN.label_align),
    height: one(card["height"], HEIGHTS, PLAIN.height),
    ...(SHOWN.includes(card["alias"] as never) ? { alias: card["alias"] === "show" } : {}),
    shows: Array.isArray(card["shows"])
      ? card["shows"].filter((p): p is Part => (PARTS as readonly unknown[]).includes(p)) : [],
    ...(sized(card["size"]) ? { size: card["size"] as { w: number; h: number } } : {}),
    ...(card["name"] === "hide" ? { head: false } : {}),
    ...contrast("border_contrast", style["border_contrast"]),
    ...contrast("name_contrast", style["name_contrast"]),
    ...contrast("label_contrast", style["label_contrast"]),
    ...number("opacity", style["opacity"]),
    kind,
    /** A mark of its own, where somebody picked one. */
    ...(typeof card["icon"] === "string" && card["icon"] ? { icon: card["icon"] } : {}),
    ...hue_of(style, of),
    /** A number the door already bounded. */
    ...number("intensity", style["intensity"]),
  };
}

/** The hue a card paints at, absent where nobody gave one: strayed by up to half of `vary` either
 *  way, keyed by its definition, so each definition under one that varies takes its own shade. */
function hue_of(style: Settings, of: Id): Record<string, number> {
  const hue = style["hue"];
  const vary = style["vary"];
  if (typeof hue !== "number" || !Number.isFinite(hue)) return {};
  if (typeof vary !== "number" || !vary) return { hue };
  // A small stable hash of the id, taken to a fraction from -1/2 to 1/2.
  let h = 0;
  for (const c of of) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const stray = ((h % 1000) / 999 - 0.5) * vary;
  return { hue: Math.round((hue + stray + 360) % 360) };
}

/** Whether a setting is a size in units the door let through. */
function sized(said: unknown): boolean {
  const s = said as { w?: unknown; h?: unknown } | undefined;
  return !!s && typeof s.w === "number" && typeof s.h === "number";
}

/** One contrast, under its own name, and absent where nobody said. */
function contrast(key: string, value: unknown): Record<string, Contrast> {
  return typeof value === "string" && (CONTRASTS as readonly string[]).includes(value)
    ? { [key]: value as Contrast } : {};
}

/** How one run draws. */
export type Wire = {
  family?: Family;
  opacity?: number;
  hue?: number;
  intensity?: number;
  /** How heavy the run is drawn, and how. */
  border_width?: Width;
  border_style?: Border;
  border_contrast?: Contrast;
  name_font?: Font;
  name_weight?: Weight;
  name_contrast?: Contrast;
  /** What draws at each end: a shape, never a direction. */
  from_arrow?: Arrow;
  to_arrow?: Arrow;
  /** Whether the identity line draws, and whether the handle joins a name somebody did set. */
  name: boolean;
  alias: boolean;
};

/** A run nobody styled: draws its name and keeps its module's look. */
export const BARE: Wire = { name: true, alias: false };

export function wire_of(graph: Graph, id: Id): Wire {
  /** A run or the definition of one. */
  if (!graph.edges[id] && !(def_at(graph, id) && domain_of(graph, id) === "relation")) return BARE;
  const style = settings(graph, id, "style");
  const line = settings(graph, id, "line");

  return {
    name: one(line["name"], SHOWN, DEFAULTS["line.name"]) === "show",
    alias: one(line["alias"], SHOWN, DEFAULTS["line.alias"]) === "show",
    ...word("family", style["family"], FAMILIES),
    ...word("border_width", style["border_width"], WIDTHS),
    ...word("border_style", style["border_style"], BORDERS),
    ...word("border_contrast", style["border_contrast"], CONTRASTS),
    ...word("name_font", style["name_font"], FONTS),
    ...word("name_weight", style["name_weight"], WEIGHTS),
    ...word("name_contrast", style["name_contrast"], CONTRASTS),
    ...number("opacity", style["opacity"]),
    ...number("hue", style["hue"]),
    ...number("intensity", style["intensity"]),
    ...word("from_arrow", line["from_arrow"], ARROWS),
    ...word("to_arrow", line["to_arrow"], ARROWS),
  };
}

/** One word from a closed set, absent where nobody said. */
function word(key: string, value: unknown, set: readonly string[]): Record<string, string> {
  return typeof value === "string" && set.includes(value) ? { [key]: value } : {};
}

/** A number the door already bounded, under its own name. */
function number(key: string, value: unknown): Record<string, number> {
  return typeof value === "number" && Number.isFinite(value) ? { [key]: value } : {};
}

/** A look as one string, for anything asking *has this changed*. */
export function look_key(look?: Look | Wire): string {
  if (!look) return "";
  return Object.keys(look).sort()
    .map((k) => {
      const v = (look as Record<string, unknown>)[k];
      return `${k}=${Array.isArray(v) ? v.join("+") : typeof v === "object" ? JSON.stringify(v)
        : String(v)}`;
    })
    .join(";");
}

/** How heavy a border is when the definition has not said. */
function width_of(graph: Graph, id: Id): Width {
  const b = graph.blocks[id];
  if (!b || is_interface(b)) return "thin";
  return is_container(graph, id) ? "medium" : "thin";
}

/** What a look says, as the attributes the card table reads: the face's paint. */
export function face_attrs(look: Look): Record<string, unknown> {
  const tinted = look.hue !== undefined;
  /** Opacity rides as a number, not a percentage. */
  const sheer = look.opacity !== undefined && look.opacity < 1;
  return {
    "data-family": tinted ? "tint" : look.family,
    "data-fill": look.fill,
    "data-border-width": look.border_width,
    "data-border-style": look.border_style,
    "data-name-font": look.name_font,
    "data-name-weight": look.name_weight,
    "data-label-font": look.label_font,
    "data-label-weight": look.label_weight,
    "data-label": look.label,
    "data-align": look.align,
    "data-label-align": look.label_align,
    ...(look.border_contrast ? { "data-border-contrast": look.border_contrast } : {}),
    ...(look.name_contrast ? { "data-name-contrast": look.name_contrast } : {}),
    ...(look.label_contrast ? { "data-label-contrast": look.label_contrast } : {}),
    ...(sheer ? { "data-sheer": "" } : {}),
    ...(tinted
      /** The ceiling stays in the ramp. */
      ? { style: { "--card-h": String(look.hue),
                   "--card-c": `calc(var(--tint-ceiling) * ${look.intensity ?? 0.65})`,
                   ...(sheer ? { "--card-opacity": String(look.opacity) } : {}) } }
      : sheer ? { style: { "--card-opacity": String(look.opacity) } } : {}),
  };
}
