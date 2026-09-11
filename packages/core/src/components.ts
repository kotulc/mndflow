/** The module contract: what a module publishes, and what validates it.
 *
 *  **A package is data and a module is code.** A package ships definitions and
 *  costs nobody anything; a module is engine code, and what it publishes is
 *  components — the keys a definition's `components` bag configures.
 *
 *  **A component owns its key and reads no other's.** They share one graph and
 *  one log, so separate checks are not separate state: the key is the boundary,
 *  and this is where it is enforced.
 *
 *  **Each validates its own key at the door.** A component absent from the
 *  build validates nothing, so its configuration is *unvalidated* rather than
 *  wrong — which is how an older build opens a newer package. What a component
 *  refuses is dropped, and only that key. */

import { BLOCK_MODULES, type Definition } from "./types";

/** What a definition holds under one component's key. Free-form: the component
 *  says what its own shape is, and nothing else may read it. */
export type Settings = Record<string, unknown>;

/** One published component. `check` answers the same question an action's
 *  does — why this would not work, in words, or null. Words rather than a
 *  boolean, because the door says what it dropped and "invalid" is not
 *  something anybody can act on. */
export type Component = {
  name: string;
  check: (config: Settings) => string | null;
};

const held = new Map<string, Component>();

/** Publish components, at load and before any log is read. Publishing one name
 *  twice is the later one winning, so a build can replace a component without a
 *  second registry to keep in step. */
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

/** What a definition says that this build cannot read, key by key.
 *
 *  **An unknown component is left alone** — it may be a newer build's, and
 *  refusing it is how an older build would fail to open a newer package. An
 *  unknown *key* within a claimed one is the component's own to refuse. */
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

/** A number inside a range. **Finite, because `NaN` and infinity both survive
 *  `typeof` and neither is a hue.** */
const within = (key: string, value: unknown,
                range: { min: number; max: number }): string | null =>
  value === undefined
  || (typeof value === "number" && Number.isFinite(value)
      && value >= range.min && value <= range.max)
    ? null : `\`${key}\` has to be a number from ${range.min} to ${range.max}`;

const words = (key: string, value: unknown): string | null =>
  value === undefined || (Array.isArray(value) && value.every((v) => typeof v === "string"))
    ? null : `\`${key}\` has to be a list of names`;

/** An unknown key is refused rather than ignored. A component owning its key
 *  owns the whole of it, so a misspelt `shp` is a mistake this build can
 *  actually see — unlike an unknown *component*, which is left alone. */
const stray = (name: string, config: Settings, known: readonly string[]): string | null => {
  const odd = Object.keys(config).find((k) => !known.includes(k));
  return odd ? `\`${name}\` knows nothing about \`${odd}\`` : null;
};


/** How a card is composed and how it is painted. **Closed sets that grow by a
 *  code change** — additively, and never from data. That is the line between an
 *  engine and a plugin host.
 *
 *  **Five questions, and every key belongs to one of them**: the name, the
 *  label, the border, the fill, and the mark. A key named for the row that asks
 *  it is a key nobody has to translate — `voice`, `decor`, `ink` and `line`
 *  each said *which* answer without saying *what it was about*, so the name and
 *  the label shared one answer between them and neither could be set alone. */

/** **No `shape`.** A definition picking a diamond or a hex drew as one on the
 *  canvas and as a rectangle everywhere else, which is a promise only one
 *  renderer kept. It comes back when every renderer can keep it.
 *
 *  **No `layout` either.** It offered five ways a card could be composed and no
 *  renderer read any of them. What actually puts values on a card is `shows`,
 *  which names them. */

/** Where the label sits — the subtype where one is named, the base kind
 *  otherwise. **The name is not asked this**: a card without its name is a box
 *  nobody can read, and the toggle that hid it was a third way of saying the
 *  same nothing. */
export const DISPLAYS = ["above", "inside", "below", "none"] as const;

/** Whether a writing is drawn at all. **Two answers, and `show` is what
 *  everything did before there was a choice.** */
export const SHOWN = ["show", "hide"] as const;

/** Which end of the card its writing reads from. **Three, and the first is what
 *  every card did before there was a choice** — so a definition saying nothing
 *  draws exactly as it always has. */
export const ALIGNS = ["left", "center", "right"] as const;

/** The named families a definition may pick from. **Each is a preset over `hue`
 *  and `intensity`** — the two numbers below are the mechanism, and a family is
 *  a name for a pair of them that the *theme* chooses.
 *
 *  **A family is theme-relative and a hue is not.** `primary` is green in retro
 *  and teal in modern, which is what keeps a shipped package looking like the
 *  theme it is opened in. A hue names an angle and means it everywhere, which
 *  is what a workspace wants for a vocabulary of its own. */
export const FAMILIES = ["primary", "secondary", "neutral", "muted",
                         "away", "note"] as const;

/** The hue angle a usage paints itself with, in degrees, when a named family is
 *  not what was wanted. **The theme still owns lightness**, which is where *ink
 *  reads on fill* actually comes from — so an angle is safe to say and a
 *  lightness is not. */
export const HUE = { min: 0, max: 360 } as const;

/** How much chroma that hue is taken at, as a fraction of the theme's own
 *  ceiling. **Not a lightness and not an opacity**: those are the ladder's. */
export const INTENSITY = { min: 0, max: 1 } as const;

/** The answers that are **ranges rather than sets**. Named here beside the
 *  ranges themselves, so the one action that writes a look can tell a number
 *  from a word without keeping a second list of its own. */
export const NUMBERS: readonly string[] = ["hue", "intensity", "opacity"];

/** How heavy a border is. **Three steps, and the first is the ordinary one.** A
 *  border cannot be half a device pixel, so a set finer than this offers a
 *  choice it cannot keep. */
export const WIDTHS = ["thin", "medium", "thick"] as const;

/** How a border is drawn. **The line styles that still read at one pixel** — a
 *  groove or a ridge needs two and draws as solid below that. */
export const BORDERS = ["solid", "dashed", "dotted", "double", "none"] as const;

/** How heavily a writing is set. Asked of the name and of the label separately,
 *  because they are two writings and not one. */
export const WEIGHTS = ["light", "normal", "bold"] as const;

/** How a writing is faced. **One value, not three flags** — italic *and* struck
 *  through is a combination nobody has asked for, and a closed set stays one
 *  lookup where three booleans become eight states to draw. */
export const FONTS = ["none", "italic", "underline", "strike"] as const;

/** What fills a card behind its writing. **Pattern, never colour** — every one
 *  of these is drawn from the card's own steps, so a hatch follows whatever
 *  family or hue it was given. */
export const FILLS = ["solid", "hatch", "wash", "none"] as const;

/** How opaque the fill is, from nothing to solid. **A number, because it is
 *  one.** The fill alone: never the ink and never the border, so a card that
 *  has gone transparent is still a card with writing on it. */
export const OPACITY = { min: 0, max: 1 } as const;

/** How far a border or a writing stands out from the card behind it.
 *
 *  **Four rungs of the theme's ladder, in order.** Not a number, because the
 *  ladder is tuned per theme and the four are not evenly spaced on it — a
 *  fraction would land somewhere nobody chose, and land differently in each of
 *  the three. The names say what they look like rather than what the ramp calls
 *  them. */
export const CONTRASTS = ["faint", "soft", "strong", "full"] as const;

/** Which block module interprets a block, and that module's own keys. Every
 *  module owns its slice, so the `block` component names which and delegates
 *  the rest — no module has configuration of its own yet, and each says so. */
const MODULES = new Map<string, (config: Settings) => string | null>(
  BLOCK_MODULES.map((m) => [m as string, (config: Settings) => stray(m, config, [])]),
);

const block: Component = {
  name: "block",
  check: (config) => {
    if (config["module"] === undefined) return stray("block", config, ["module"]);
    const named = MODULES.get(String(config["module"]));
    if (!named) return `\`block.module\` has to be one of ${BLOCK_MODULES.join(", ")}`;
    const { module: _named, ...rest } = config;
    return named(rest);
  },
};

/** What a card is *made of* — where its label sits, which way its writing
 *  reads, the two marks in its corners and a few of its fields — rather than
 *  what it is painted, which is `style`.
 *
 *  **`icon` is a name from the theme's set, not a drawing.** A name this build
 *  does not know falls back to the one the role would draw, so a card from a
 *  package this build has never seen still says what sort of thing it is.
 *
 *  **`mark` is the other corner, and it says nothing the engine knows.** `icon`
 *  says what sort of thing this is; `mark` is whatever a vocabulary wants to
 *  flag about one — drawn quietly, out of the way of the writing. It took the
 *  corner a lock used to sit in, which was engine state nobody could subtype. */
const card: Component = {
  name: "card",
  check: (config) =>
    one_of("card.label", config["label"], DISPLAYS)
    ?? one_of("card.align", config["align"], ALIGNS)
    /** **The identity line, and the handle beside it.** `name` draws what the
     *  thing is called — the name where one is set, its kind and handle where
     *  none is. `alias` adds the handle to a name somebody *did* set, which the
     *  fallback already carries and a named card does not.
     *
     *  **`name` reverses an earlier decision** that a card without its name is
     *  a box nobody can read. That premise went when a block gained a body: a
     *  nameless card is not a blank one, and a note wanting only its text is
     *  the case it was missing. */
    ?? one_of("card.name", config["name"], SHOWN)
    ?? one_of("card.alias", config["alias"], SHOWN)
    ?? words("card.shows", config["shows"])
    ?? stray("card", config, ["label", "align", "shows", "icon", "mark",
                              "name", "alias"]),
};

/** How a card is painted: its border, its fill, and each of its two writings.
 *
 *  **Every key says what it is about** where the same word is asked twice.
 *  `name_weight` and `label_weight` are one question of two writings;
 *  `border_width` is a third weight and shares nothing with either. */
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
    /** **`hue` wins over `family` where both are said**, so a preset can be
     *  nudged without first being cleared. Neither is required. */
    ?? within("style.hue", config["hue"], HUE)
    ?? within("style.intensity", config["intensity"], INTENSITY)
    ?? within("style.opacity", config["opacity"], OPACITY)
    ?? stray("style", config, ["family", "fill", "hue", "intensity", "opacity",
                               "border_width", "border_style", "border_contrast",
                               "name_font", "name_weight", "name_contrast",
                               "label_font", "label_weight", "label_contrast"]),
};


/** One constraint and four rules. Each is a lookup, a count or one fixed
 *  comparison — the shapes are checked here, and what survives is what `review`
 *  reads.
 *
 *  **`required` used to live under its own `constraints` key.** It was the only
 *  thing there, and two component keys for one concept is drift: what a
 *  vocabulary asks of a usage is one question, whether it is answered by a
 *  field the usage must carry or by what may sit at its ends. The door moves
 *  an old one across. */
const rules: Component = {
  name: "rules",
  check: (config) => {
    const ends = config["ends"];
    if (ends !== undefined) {
      if (!ends || typeof ends !== "object") return "`rules.ends` has to be two lists of names";
      const e = ends as Settings;
      const wrong = words("rules.ends.from", e["from"]) ?? words("rules.ends.to", e["to"])
        ?? stray("rules.ends", e, ["from", "to", "fromFlow", "toFlow"]);
      if (wrong) return wrong;
    }
    const degree = config["degree"];
    if (degree !== undefined) {
      if (!degree || typeof degree !== "object") return "`rules.degree` counts in and out";
      const wrong = stray("rules.degree", degree as Settings, ["in", "out"]);
      if (wrong) return wrong;
    }
    return words("rules.required", config["required"])
      ?? words("rules.holds", config["holds"])
      ?? words("rules.match", config["match"])
      ?? stray("rules", config, ["required", "ends", "holds", "degree", "match"]);
  },
};

/** What this build publishes. The engine ships its components the same way
 *  anybody else would, so there is no privileged path a later module would
 *  have to be measured against. */
publish(block, card, style, rules);
