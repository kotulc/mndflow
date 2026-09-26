/** The module contract: what a module publishes, and what validates it. */

import { BASE_RELATIONS, BLOCK_MODULES, type Definition } from "./types";

/** What a definition holds under one component's key. */
export type Settings = Record<string, unknown>;

/** One published component. `check` answers the same question an action's does — why this would not
 *  work, in words, or null. */
export type Component = {
  name: string;
  check: (config: Settings) => string | null;
};

const held = new Map<string, Component>();

/** Publish components, at load and before any log is read. */
export function publish(...list: Component[]): void {
  for (const c of list) held.set(c.name, c);
}

/** Everything this build knows how to validate. */
export function components(): Component[] {
  return [...held.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function component(name: string): Component | null {
  return held.get(name) ?? null;
}

/** What a definition says that this build cannot read, key by key. */
export function unreadable(def: Definition): { key: string; why: string }[] {
  const out: { key: string; why: string }[] = [];
  for (const [key, config] of Object.entries(def.components ?? {})) {
    const c = held.get(key);
    if (!c) continue;
    const why = !config || typeof config !== "object" || Array.isArray(config)
      ? `\`${key}\` has to be a set of settings`
      : c.check(config);
    if (why) out.push({ key, why });
  }
  return out;
}

// ---------------------------------------------------------------- the checks

const one_of = (key: string, value: unknown, set: readonly string[]): string | null =>
  value === undefined || (typeof value === "string" && set.includes(value))
    ? null : `\`${key}\` has to be one of ${set.join(", ")}`;

/** A number inside a range. Finite, because `NaN` and infinity both survive `typeof` and neither is
 *  a hue. */
const within = (key: string, value: unknown,
                range: { min: number; max: number }): string | null =>
  value === undefined
  || (typeof value === "number" && Number.isFinite(value)
      && value >= range.min && value <= range.max)
    ? null : `\`${key}\` has to be a number from ${range.min} to ${range.max}`;

const words = (key: string, value: unknown): string | null =>
  value === undefined || (Array.isArray(value) && value.every((v) => typeof v === "string"))
    ? null : `\`${key}\` has to be a list of names`;

/** An unknown key is refused rather than ignored. */
const stray = (name: string, config: Settings, known: readonly string[]): string | null => {
  const odd = Object.keys(config).find((k) => !known.includes(k));
  return odd ? `\`${name}\` knows nothing about \`${odd}\`` : null;
};




/** Where the label sits — the subtype where one is named, the base kind otherwise. */
export const DISPLAYS = ["above", "inside", "below", "none"] as const;

/** Whether a writing is drawn at all. */
export const SHOWN = ["show", "hide"] as const;

/** Which end of the card its writing reads from. */
export const ALIGNS = ["left", "center", "right"] as const;

/** Whether a card is the one card height, keeps whatever size it was given, or grows to fit what
 *  it shows. */
export const HEIGHTS = ["uniform", "free", "fit"] as const;

/** The named families a definition may pick from. */
export const FAMILIES = ["primary", "secondary", "neutral", "muted",
                         "away", "note"] as const;

/** The hue angle a usage paints itself with, in degrees, when a named family is not what was
 *  wanted. */
export const HUE = { min: 0, max: 360 } as const;

/** How much chroma that hue is taken at, as a fraction of the theme's own ceiling. */
export const INTENSITY = { min: 0, max: 1 } as const;

/** The answers that are ranges rather than sets. */
export const NUMBERS: readonly string[] = ["hue", "intensity", "opacity"];

/** How heavy a border is. Three steps, and the first is the ordinary one. */
export const WIDTHS = ["thin", "medium", "thick"] as const;

/** How a border is drawn: styles that read at one pixel. */
export const BORDERS = ["solid", "dashed", "dotted", "double", "none"] as const;

/** How heavily a writing is set, asked of name and label separately. */
export const WEIGHTS = ["light", "normal", "bold"] as const;

/** How a writing is faced. One value, not three flags. */
export const FONTS = ["none", "italic", "underline", "strike"] as const;

/** What draws at one end of a run. */
export const ARROWS = ["none", "arrow", "open", "hollow", "diamond"] as const;

/** What fills a card behind its writing. */
export const FILLS = ["solid", "hatch", "wash", "none"] as const;

/** How opaque the fill is, from nothing to solid. */
export const OPACITY = { min: 0, max: 1 } as const;

/** How far a border or a writing stands out from the card behind it. */
export const CONTRASTS = ["faint", "soft", "strong", "full"] as const;

/** What a card draws where nobody has said — the app's own answer, as against a definition's or an
 *  element's. */
export const DEFAULTS = {
  "card.label": "none",
  "card.align": "left",
  "card.label_align": "left",
  "card.alias": "hide",
  "card.height": "uniform",
  "line.name": "show",
  "line.alias": "hide",
  "style.family": "neutral",
  "style.fill": "solid",
  "style.border_width": "thin",
  "style.border_style": "solid",
  "style.name_font": "none",
  "style.name_weight": "normal",
  "style.label_font": "none",
  "style.label_weight": "normal",
} as const;

/** The drawing keys, as against what a thing is held to. */
export const DRAWN: readonly string[] = ["card", "style", "line"];

/** What each module honours, and the keys it owns of its own. */
const CARD: readonly string[] = ["card", "style", "allows", "expects"];
const WALL: readonly string[] = ["style", "allows", "expects"];
const WIRE: readonly string[] = ["line", "style", "allows", "expects"];

const MODULES: Record<string, { honours: readonly string[]; keys: readonly string[] }> = {
  ...Object.fromEntries(BLOCK_MODULES.map((m) => [m, { honours: CARD, keys: [] }])),
  ...Object.fromEntries(BASE_RELATIONS.map((m) => [m, { honours: WIRE, keys: [] }])),
  /** An interface is eight pixels of wall. */
  interface: { honours: WALL, keys: [] },
};

/** One namespace for both groups, so a name may mean one thing. */
const shared = BLOCK_MODULES.filter((m) => BASE_RELATIONS.includes(m));
if (shared.length) throw new Error(`names shared by both groups: ${shared.join(", ")}`);

/** Which components this module honours. */
export function honours(module: string): readonly string[] {
  return MODULES[module]?.honours ?? CARD;
}

const block: Component = {
  name: "block",
  check: (config) => {
    if (config["module"] === undefined) return stray("block", config, ["module"]);
    const named = BLOCK_MODULES.includes(String(config["module"]) as never)
      ? MODULES[String(config["module"])] : undefined;
    if (!named) return `\`block.module\` has to be one of ${BLOCK_MODULES.join(", ")}`;
    const { module: _named, ...rest } = config;
    return stray(String(config["module"]), rest, named.keys);
  },
};

/** What a card is made of, as against how it is painted (`style`). */
const card: Component = {
  name: "card",
  check: (config) =>
    one_of("card.label", config["label"], DISPLAYS)
    ?? one_of("card.align", config["align"], ALIGNS)
    ?? one_of("card.label_align", config["label_align"], ALIGNS)
    /** `alias` shows the handle beside a name that was set. */
    ?? one_of("card.alias", config["alias"], SHOWN)
    ?? one_of("card.height", config["height"], HEIGHTS)
    /** `fields` lists what the card carries in a compartment under its name. */
    ?? one_of("card.fields", config["fields"], SHOWN)
    /** `body` shows what the block says under the divider; `name` hides the head, so the body is
     *  the whole card. */
    ?? one_of("card.body", config["body"], SHOWN)
    ?? one_of("card.name", config["name"], SHOWN)
    ?? stray("card", config, ["label", "align", "label_align", "icon", "alias", "height", "fields",
                              "body", "name"]),
};

/** How a card is painted: its border, its fill, and each of its two writings. */
const style: Component = {
  name: "style",
  check: (config) =>
    one_of("style.family", config["family"], FAMILIES)
    ?? one_of("style.fill", config["fill"], FILLS)
    ?? one_of("style.border_width", config["border_width"], WIDTHS)
    ?? one_of("style.border_style", config["border_style"], BORDERS)
    ?? one_of("style.border_contrast", config["border_contrast"], CONTRASTS)
    ?? one_of("style.name_font", config["name_font"], FONTS)
    ?? one_of("style.name_weight", config["name_weight"], WEIGHTS)
    ?? one_of("style.name_contrast", config["name_contrast"], CONTRASTS)
    ?? one_of("style.label_font", config["label_font"], FONTS)
    ?? one_of("style.label_weight", config["label_weight"], WEIGHTS)
    ?? one_of("style.label_contrast", config["label_contrast"], CONTRASTS)
    /** `hue` wins over `family` where both are said, so a preset can be nudged without first being
     *  cleared. */
    ?? within("style.hue", config["hue"], HUE)
    ?? within("style.intensity", config["intensity"], INTENSITY)
    ?? within("style.opacity", config["opacity"], OPACITY)
    ?? stray("style", config, ["family", "fill", "hue", "intensity", "opacity",
                               "border_width", "border_style", "border_contrast",
                               "name_font", "name_weight", "name_contrast",
                               "label_font", "label_weight", "label_contrast"]),
};

/** What a run draws: a head at each end, and whether it says its own name. */
const line: Component = {
  name: "line",
  check: (config) =>
    one_of("line.from_arrow", config["from_arrow"], ARROWS)
    ?? one_of("line.to_arrow", config["to_arrow"], ARROWS)
    /** The identity line, exactly as a card asks it. */
    ?? one_of("line.name", config["name"], SHOWN)
    ?? one_of("line.alias", config["alias"], SHOWN)
    ?? stray("line", config, ["from_arrow", "to_arrow", "name", "alias"]),
};


/** What may attach to or be held by a usage. Refused at the gesture, never repaired. */
const allows: Component = {
  name: "allows",
  check: (config) => {
    for (const key of ["ports", "holds", "members"]) {
      const said = config[key];
      if (said === undefined || typeof said === "boolean") continue;
      const wrong = words(`allows.${key}`, said);
      if (wrong) return wrong;
    }
    const ends = config["ends"];
    if (ends !== undefined) {
      if (!ends || typeof ends !== "object") return "`allows.ends` has to be two lists of names";
      const e = ends as Settings;
      const wrong = words("allows.ends.from", e["from"]) ?? words("allows.ends.to", e["to"])
        ?? stray("allows.ends", e, ["from", "to", "fromFlow", "toFlow"]);
      if (wrong) return wrong;
    }
    const degree = config["degree"];
    if (degree !== undefined) {
      if (!degree || typeof degree !== "object") return "`allows.degree` counts in and out";
      const wrong = stray("allows.degree", degree as Settings, ["in", "out"]);
      if (wrong) return wrong;
    }
    return stray("allows", config, ["ports", "holds", "members", "degree", "ends"]);
  },
};

/** What a usage's values are asked for. Noted while modelling, refused only at translation. */
const expects: Component = {
  name: "expects",
  check: (config) =>
    words("expects.required", config["required"])
    ?? words("expects.match", config["match"])
    ?? stray("expects", config, ["required", "match"]),
};


/** What this build publishes. */
publish(allows, block, card, expects, line, style);
