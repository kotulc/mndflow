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

/** How a card is composed, what is drawn inside the box, and where the name
 *  sits. **Closed sets that grow by a code change** — additively, and never
 *  from data. That is the line between an engine and a plugin host. */
/** **No `shape`.** A definition picking a diamond or a hex drew as one on the
 *  canvas and as a rectangle everywhere else, which is a promise only one
 *  renderer kept. It comes back when every renderer can keep it.
 *
 *  **No `layout` either.** It offered five ways a card could be composed and
 *  no renderer read any of them — five validated values carried through three
 *  packages and drawn by nothing. What actually puts values on a card is
 *  `shows`, which names them. */

/** Where one of a card's two writings sits. **The same three for both**, since
 *  the question is the same one asked of the name and of the type. */
export const PLACES = ["inside", "below", "none"] as const;

/** Which end of the card its writing reads from. **Three, and the first is
 *  what every card did before there was a choice** — so a definition saying
 *  nothing draws exactly as it always has. Composition rather than colour,
 *  which is why it is `card` and not `style`. */
export const ALIGNS = ["left", "center", "right"] as const;

/** The named families a definition may pick from. **Four, and each is a preset
 *  over `hue` and `intensity`** — the two numbers below are the mechanism, and
 *  a slot is a name for a pair of them that the *theme* chooses.
 *
 *  **Six were four too many and two too alike.** `tertiary` and `quaternary`
 *  carried the same chroma as `secondary` and differed only by hue, at a
 *  chroma the fill step scales to 0.02 — so three of the six were the same
 *  near-black on a card. Naming more families was never what was missing;
 *  saying which hue was.
 *
 *  **A slot is theme-relative and a hue is not.** `primary` is green in retro
 *  and teal in modern, which is what keeps a shipped package looking like the
 *  theme it is opened in. A hue names an angle and means it everywhere, which
 *  is what a workspace wants for a vocabulary of its own. Both are offered
 *  because they answer different questions. */
export const SLOTS = ["primary", "secondary", "neutral", "muted",
                      "away", "note"] as const;

/** The hue angle a usage paints itself with, in degrees, when a named family is
 *  not what was wanted. **The theme still owns lightness**, which is where
 *  *ink reads on fill* actually comes from — so an angle is safe to say and a
 *  lightness is not. */
export const HUE = { min: 0, max: 360 } as const;

/** How much chroma that hue is taken at, as a fraction of the theme's own
 *  ceiling. **Not a lightness and not an opacity**: those are the ladder's, and
 *  a definition reaching for either is how a card stops reading in one of the
 *  three themes. */
export const INTENSITY = { min: 0, max: 1 } as const;

/** The style answers that are **ranges rather than sets**. Named here beside
 *  the ranges themselves, so the one action that writes a look can tell a
 *  number from a word without keeping a second list of its own. */
export const NUMBERS: readonly string[] = ["hue", "intensity", "opacity"];
/** How heavy a border is. **Three steps, and the first is the ordinary one.**
 *  It used to run hairline / thin / thick at half a pixel, one and two — but a
 *  border cannot be half a device pixel, so the first two rendered identically
 *  and the set offered a choice it could not keep. Renamed as well as respaced:
 *  a step called *hairline* cannot be what a card is normally drawn with. */
export const WEIGHTS = ["thin", "medium", "thick"] as const;
/** How heavily the name is set. **The words everybody already uses for it** —
 *  it was `quiet · normal · loud`, which is a third scale of loudness beside
 *  contrast and opacity and means none of the same things. */
export const VOICES = ["light", "normal", "bold"] as const;

/** How the name is marked, as against how heavily it is set. **One value, not
 *  three flags** — italic *and* struck through is a combination nobody has
 *  asked for, and a closed set stays one lookup while three booleans become
 *  eight states to draw and to reason about. Revisit if a real case wants
 *  two at once. */
export const DECORS = ["none", "italic", "underline", "strike"] as const;

/** What fills a card behind its writing. **Pattern, never colour** — every one
 *  of these is drawn from the card's own steps, so a hatch follows whatever
 *  family or hue it was given. This is what a reference was getting from a
 *  hardcoded rule that no definition could reach. */
export const FILLS = ["solid", "hatch", "wash", "none"] as const;

/** How opaque the fill is, from nothing to solid. **A number, because it is
 *  one** — three named steps were three invented words for a quantity everybody
 *  already has a word for, and the one that mattered most was a 6% wash no name
 *  would have suggested. **The fill alone**: never the ink and never the line,
 *  so a card that has gone transparent is still a card with writing on it. */
export const OPACITY = { min: 0, max: 1 } as const;

/** How far the border and the writing stand out from the card behind them.
 *
 *  **Four rungs of the theme's ladder, in order.** Not a number, because the
 *  ladder is tuned per theme and the four are not evenly spaced on it — a
 *  fraction would land somewhere nobody chose, and land differently in each of
 *  the three. The names say what they look like rather than what the ramp
 *  calls them.
 *
 *  **This replaced `emphasis`.** That was three fixed pairings of these two —
 *  quiet levelled both to `faint`, strong took the border to `strong` — which
 *  is why a reference could not be said at all: it wanted both at `strong`, a
 *  fourth pairing the shorthand had no word for. Two plain answers say every
 *  pairing there is, so the shorthand was one vocabulary too many. */
export const CONTRASTS = ["faint", "soft", "strong", "full"] as const;

/** Style sets this build ships. Open: a set is an asset, and a build names the
 *  ones it carries. A definition may not name one nobody ships. */
const SETS: readonly string[] = [];

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

/** What a card is *made of* — a name, a mark, a few of its fields, and the
 *  verb its usages are named by — rather than what it is coloured, which is
 *  `style`, or where it sits, which is the engine's.
 *
 *  **`icon` is a name from the theme's set, not a drawing.** A definition says
 *  which mark its usages wear; a name this build does not know falls back to
 *  the one the role would draw, so a card from a package this build has never
 *  seen still says what sort of thing it is. */
const card: Component = {
  name: "card",
  check: (config) =>
    /** **Two writings, two questions.** `name` is what somebody called it;
     *  `label` is what sort of thing it is. They used to be one key, so putting
     *  the type on a card took the name off it. */
    one_of("card.name", config["name"], PLACES)
    ?? one_of("card.label", config["label"], PLACES)
    ?? one_of("card.align", config["align"], ALIGNS)
    ?? words("card.shows", config["shows"])
    ?? stray("card", config, ["name", "label", "align", "shows", "icon"]),
};

const style: Component = {
  name: "style",
  check: (config) =>
    one_of("style.slot", config["slot"], SLOTS)
    ?? one_of("style.weight", config["weight"], WEIGHTS)
    ?? one_of("style.voice", config["voice"], VOICES)
    ?? one_of("style.decor", config["decor"], DECORS)
    ?? one_of("style.line", config["line"], CONTRASTS)
    ?? one_of("style.ink", config["ink"], CONTRASTS)
    ?? one_of("style.fill", config["fill"], FILLS)
    /** **`hue` wins over `slot` where both are said**, so a preset can be
     *  nudged without first being cleared. Neither is required. */
    ?? within("style.hue", config["hue"], HUE)
    ?? within("style.opacity", config["opacity"], OPACITY)
    ?? within("style.intensity", config["intensity"], INTENSITY)
    ?? (config["set"] !== undefined && !SETS.includes(String(config["set"]))
        ? SETS.length
          ? `\`style.set\` has to be one of ${SETS.join(", ")}`
          : "`style.set` names a style set, and this build ships none"
        : null)
    ?? stray("style", config, ["set", "slot", "weight", "voice", "decor",
                               "fill", "opacity", "line", "ink",
                               "hue", "intensity"]),
};

/** The one constraint: which of a usage's fields must carry a value. */
const constraints: Component = {
  name: "constraints",
  check: (config) =>
    words("constraints.required", config["required"])
    ?? stray("constraints", config, ["required"]),
};

/** The four rules. Each is a lookup, a count or one fixed comparison — the
 *  shapes are checked here, and what survives is what `review` reads. */
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
    return words("rules.holds", config["holds"])
      ?? words("rules.match", config["match"])
      ?? stray("rules", config, ["ends", "holds", "degree", "match"]);
  },
};

/** What this build publishes. The engine ships its components the same way
 *  anybody else would, so there is no privileged path a later module would
 *  have to be measured against. */
publish(block, card, style, constraints, rules);
