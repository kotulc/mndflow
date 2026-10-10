/** The module contract: what a module publishes, and what validates it. */

import { BASE_RELATIONS, BLOCK_MODULES, DIRS, type Components } from "./types";

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

/** What a set of settings says that this build cannot read, key by key. */
export function unreadable(settings: Components | undefined): { key: string; why: string }[] {
  const out: { key: string; why: string }[] = [];
  for (const [key, config] of Object.entries(settings ?? {})) {
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

/** A list drawn from one set. */
const some_of = (key: string, value: unknown, set: readonly string[]): string | null =>
  value === undefined || (Array.isArray(value) && value.every((v) => set.includes(v)))
    ? null : `\`${key}\` has to be a list of ${set.join(", ")}`;

/** A size in units: two whole numbers. */
const sized = (key: string, value: unknown): string | null => {
  if (value === undefined) return null;
  const s = value as { w?: unknown; h?: unknown };
  return value && typeof value === "object" && Number.isInteger(s.w) && Number.isInteger(s.h)
    && (s.w as number) > 0 && (s.h as number) > 0
    ? null : `\`${key}\` has to be a width and a height in units`;
};

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

/** Whether a card is the size its face says, or keeps whatever size it was given. */
export const HEIGHTS = ["uniform", "free"] as const;

/** What a card's large face shows under its name, in the order said. */
export const PARTS = ["attributes", "body", "preview"] as const;

/** Which face a layer draws its cards with: the name and marks alone, or what they say. */
export const FACES = ["small", "large"] as const;

/** How a value is edited: what a value type says, as a module is what a kind says. */
export const FORMS = ["text", "number", "flag", "choice", "link"] as const;

/** The named families a definition may pick from. */
export const FAMILIES = ["primary", "secondary", "neutral", "muted",
                         "away", "note"] as const;

/** The hue angle a usage paints itself with, in degrees, when a named family is not what was
 *  wanted. */
export const HUE = { min: 0, max: 360 } as const;

/** How much chroma that hue is taken at, as a fraction of the theme's own ceiling. */
export const INTENSITY = { min: 0, max: 1 } as const;

/** How far, in degrees, each definition under one that varies strays from the hue it inherits:
 *  half either way, keyed by its id, so kin read alike and each still reads as itself. */
export const VARY = { min: 0, max: 180 } as const;

/** The answers that are ranges rather than sets. */
export const NUMBERS: readonly string[] = ["hue", "intensity", "vary", "opacity"];

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
const CARD: readonly string[] = ["card", "style", "allows", "expects", "holder", "layout", "tie",
                                 "value"];
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
    /** `name` hides the large face's head, so what it shows is the whole card. */
    ?? one_of("card.name", config["name"], SHOWN)
    /** `shows` is what the large face draws under the name, in order; `size` its size. */
    ?? some_of("card.shows", config["shows"], PARTS)
    ?? sized("card.size", config["size"])
    ?? stray("card", config, ["label", "align", "label_align", "icon", "alias", "height", "name",
                              "shows", "size"]),
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
    ?? within("style.vary", config["vary"], VARY)
    ?? within("style.opacity", config["opacity"], OPACITY)
    ?? stray("style", config, ["family", "fill", "hue", "intensity", "vary", "opacity",
                               "border_width", "border_style", "border_contrast",
                               "name_font", "name_weight", "name_contrast",
                               "label_font", "label_weight", "label_contrast"]),
};

/** What a run is and draws: which way it points, a head at each end, and whether it says its own
 *  name. */
const line: Component = {
  name: "line",
  check: (config) =>
    one_of("line.dir", config["dir"], DIRS)
    ?? one_of("line.from_arrow", config["from_arrow"], ARROWS)
    ?? one_of("line.to_arrow", config["to_arrow"], ARROWS)
    /** The identity line, exactly as a card asks it. */
    ?? one_of("line.name", config["name"], SHOWN)
    ?? one_of("line.alias", config["alias"], SHOWN)
    ?? stray("line", config, ["dir", "from_arrow", "to_arrow", "name", "alias"]),
};


/** What may attach to or be held by a usage. Refused at the gesture, never repaired. */
const allows: Component = {
  name: "allows",
  check: (config) => {
    for (const key of ["ports", "holds", "heads"]) {
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
    return stray("allows", config, ["ports", "holds", "heads", "degree", "ends"]);
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


/** How a layer places what it draws. An unknown kind is drawn as `auto`, never refused: a newer
 *  package names layouts an older build has not got. */
const layout: Component = {
  name: "layout",
  check: (config) =>
    (config["kind"] === undefined || typeof config["kind"] === "string"
      ? null : "`layout.kind` has to be a name")
    ?? (config["across"] === undefined || typeof config["across"] === "number"
      ? null : "`layout.across` has to be a number")
    ?? (config["line"] === undefined || typeof config["line"] === "string"
      ? null : "`layout.line` has to be a relation definition")
    ?? one_of("layout.face", config["face"], FACES)
    ?? stray("layout", config, ["kind", "across", "line", "face"]),
};

/** What a block made from, or dropped on, another is linked to it by: a relation definition. */
const tie: Component = {
  name: "tie",
  check: (config) =>
    (config["type"] === undefined || typeof config["type"] === "string"
      ? null : "`tie.type` has to be a relation definition")
    ?? stray("tie", config, ["type"]),
};

/** How a block draws what it holds: `inline` on the layer it sits on, rather than behind its card,
 *  and `matrix` seated in cells. Granted by the traits of the same names. */
const holder: Component = {
  name: "holder",
  check: (config) =>
    ["inline", "matrix"].map((k) => config[k] === undefined || typeof config[k] === "boolean"
      ? null : `\`holder.${k}\` has to be true or false`).find(Boolean)
    ?? stray("holder", config, ["inline", "matrix"]),
};

/** How a value of a value type is edited, what a choice may be, and the unit a number is in. */
const value: Component = {
  name: "value",
  check: (config) =>
    one_of("value.form", config["form"], FORMS)
    ?? words("value.choices", config["choices"])
    ?? (config["unit"] === undefined || typeof config["unit"] === "string"
      ? null : "`value.unit` has to be a word")
    ?? stray("value", config, ["form", "choices", "unit"]),
};

/** What this build publishes. */
publish(allows, block, card, expects, holder, layout, line, style, tie, value);
