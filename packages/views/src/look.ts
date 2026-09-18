/** How a usage of a definition draws. */

import { ALIGNS, ARROWS, BORDERS, config_of, CONTRASTS, DEFAULTS, def_of, DISPLAYS,
         default_for, FAMILIES, FILLS, FONTS, HEIGHTS, is_container, is_interface, kind_word, SHOWN,
         WEIGHTS, WIDTHS, type Graph, type Id, type Settings } from "@mnd/core";

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
  /** Whether this card is the one card height, or keeps whatever size it was given. */
  height: Height;
  /** Whether the handle is drawn, where somebody said. */
  alias?: boolean;
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
  kind: "block",
};

/** What this element says under one component key, chain first and its own last word over it. */
function settings(graph: Graph, id: Id, key: string): Settings {
  /** A definition is its own last word. */
  if (graph.defs[id]) return config_of(graph, id, key);
  /** A holder carries no definition: it draws as the shape the base ships for it. */
  const held = graph.holders[id];
  if (held) {
    const base = held.arrangement === "grid" ? "grid" : "group";
    return { ...config_of(graph, default_for(graph, base) ?? base, key),
             ...(held.looks?.[key] ?? {}) };
  }
  const it = graph.blocks[id] ?? graph.edges[id];
  return { ...config_of(graph, def_of(graph, id), key), ...(it?.looks?.[key] ?? {}) };
}

/** One value if it is in the set, or the fallback. */
function one<T extends string>(value: unknown, set: readonly T[], fallback: T): T {
  return typeof value === "string" && (set as readonly string[]).includes(value)
    ? value as T : fallback;
}

/** How this usage draws. */
export function look_of(graph: Graph, id: Id): Look {
  const b = graph.blocks[id] ?? graph.holders[id];
  if (!b) return PLAIN;

  /** The chain, then the element's own last word. */
  const card = settings(graph, id, "card");
  const style = settings(graph, id, "style");
  const named = "type" in b && b.type ? graph.defs[b.type]?.name : undefined;

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
    ...contrast("border_contrast", style["border_contrast"]),
    ...contrast("name_contrast", style["name_contrast"]),
    ...contrast("label_contrast", style["label_contrast"]),
    ...number("opacity", style["opacity"]),
    /** The subtype where there is one, the base kind otherwise. */
    kind: named ?? ("type" in b ? kind_word(graph, b).toLowerCase()
                                : (b as { arrangement: string }).arrangement === "grid"
                                  ? "grid" : "group"),
    /** A mark of its own, where somebody picked one. */
    ...(typeof card["icon"] === "string" && card["icon"] ? { icon: card["icon"] } : {}),
    /** A number the door already bounded. */
    ...number("hue", style["hue"]),
    ...number("intensity", style["intensity"]),
  };
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
  const held = graph.defs[id];
  if (!graph.edges[id] && held?.group !== "relation") return BARE;
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
      return `${k}=${Array.isArray(v) ? v.join("+") : String(v)}`;
    })
    .join(";");
}

/** How heavy a border is when the definition has not said. */
function width_of(graph: Graph, id: Id): Width {
  const b = graph.blocks[id];
  if (!b || is_interface(b)) return "thin";
  return is_container(graph, id) ? "medium" : "thin";
}
