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
export const LAYOUTS = ["name", "type", "fields", "compartments", "icon", "shape"] as const;
export const SHAPES = ["rect", "round", "diamond", "ellipse", "hex"] as const;
export const LABELS = ["inside", "below", "none"] as const;

/** The hue families a definition may pick from, how loudly it takes one, how
 *  heavy its border is, and how loudly its name is set. **A definition picks
 *  within the theme's palette; it never names a colour, a pixel or a font.** */
export const SLOTS = ["primary", "secondary", "tertiary", "quaternary",
                     "neutral", "muted"] as const;
export const EMPHASES = ["quiet", "normal", "strong"] as const;
export const WEIGHTS = ["hairline", "thin", "thick"] as const;
export const VOICES = ["quiet", "normal", "loud"] as const;

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

/** What a card is *made of* — a name, a shape, a few of its fields, and the
 *  verb its usages are named by — rather than what it is coloured, which is
 *  `style`, or where it sits, which is the engine's. */
const card: Component = {
  name: "card",
  check: (config) =>
    one_of("card.layout", config["layout"], LAYOUTS)
    ?? one_of("card.shape", config["shape"], SHAPES)
    ?? one_of("card.label", config["label"], LABELS)
    ?? words("card.shows", config["shows"])
    ?? stray("card", config, ["layout", "shape", "label", "shows"]),
};

const style: Component = {
  name: "style",
  check: (config) =>
    one_of("style.slot", config["slot"], SLOTS)
    ?? one_of("style.emphasis", config["emphasis"], EMPHASES)
    ?? one_of("style.weight", config["weight"], WEIGHTS)
    ?? one_of("style.voice", config["voice"], VOICES)
    ?? (config["set"] !== undefined && !SETS.includes(String(config["set"]))
        ? SETS.length
          ? `\`style.set\` has to be one of ${SETS.join(", ")}`
          : "`style.set` names a style set, and this build ships none"
        : null)
    ?? stray("style", config, ["set", "slot", "emphasis", "weight", "voice"]),
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
