/** The style component: how a usage of a definition is coloured.
 *
 *  **A definition picks within the theme's palette; it never names a colour.**
 *  `slot` is one of six hue families and `emphasis` says how loudly to take it —
 *  both closed sets, so contrast is a property of the *step* and *ink reads on
 *  fill* holds in every theme without anybody checking. `Definition.color` was
 *  the one free-form value in the surface, and the only way a definition could
 *  look wrong; it is gone (Y.7).
 *
 *  A **style set** by name sits over the portable typed fields — line and
 *  arrowhead — that render without one. Absent a set, a usage still draws on
 *  those fields; a set missing from the build degrades the same way.
 *
 *  It reads its own key under a definition's `components` and no other's.
 *
 *  **Style sets are open** — extended by a code change, additively. A set is an
 *  asset under `styles/`; this module names the ones the build ships. That is
 *  the line between an engine and a plugin host: a definition picks from what
 *  the build knows and cannot describe a new one. */

import type { Component, Config } from "../index";
import { resolved } from "../../graph/fold";
import type { Definition, Element, Graph } from "../../graph/types";
import { sysml } from "../../../styles/sysml";

/** A style set shipped as an asset. */
export type Sheet = { name: string };

/** Style sets this build ships. Open: add a file under `styles/` and name it
 *  here. */
const SHEETS: Record<string, Sheet> = {
  [sysml.name]: sysml,
};

/** Names of every style set in the build — the open set a definition picks from. */
export const SETS = Object.keys(SHEETS) as readonly string[];

/** The hue families a definition may pick from. **Closed** — the theme decides
 *  what each is in each theme, so `primary` is green in retro and blue in
 *  modern. `away`, `note`, the error roles, selection, hover and focus are the
 *  theme's alone and deliberately absent. */
export const SLOTS = [
  "primary", "secondary", "tertiary", "quaternary", "neutral", "muted",
] as const;

export type Slot = (typeof SLOTS)[number];

/** How loudly a usage takes its slot — which **steps** its fill and its border
 *  take, never which colour. Closed for the same reason. */
export const EMPHASES = ["quiet", "normal", "strong"] as const;

export type Emphasis = (typeof EMPHASES)[number];

/** How heavy a usage's border is drawn. **Closed for the same reason a colour
 *  is**: a 6px border breaks a visual system as surely as magenta does. Units
 *  are the theme's — a definition says *thick*, never a pixel count. */
export const WEIGHTS = ["hairline", "thin", "thick"] as const;

export type Weight = (typeof WEIGHTS)[number];

/** How loudly a usage's name is set. A definition never names a font or a
 *  size; it says how much the label should carry.
 *
 *  **`voice`, not `label`** — `components.card.label` already means *where the
 *  label sits*, and one word meaning two things is the mistake U.2 exists to
 *  stop. */
export const VOICES = ["quiet", "normal", "loud"] as const;

export type Voice = (typeof VOICES)[number];

/** The whole of what emphasis decides: two step names on the chosen slot. */
const STEPS: Record<Emphasis, { fill: string; line: string }> = {
  quiet: { fill: "fill", line: "line" },
  normal: { fill: "fill", line: "stroke" },
  strong: { fill: "raised", line: "edge" },
};

export type StyleConfig = {
  /** Which style set colours usages of this. `null` means the portable fields
   *  alone. */
  set: string | null;
  /** Which hue family usages take. */
  slot: Slot;
  /** Which steps of it they take. */
  emphasis: Emphasis;
  /** How heavy the border is. */
  weight: Weight;
  /** How loudly the name is set. */
  voice: Voice;
};

/** What every definition that says nothing gets: no set, and the calm end of
 *  the ramp — an unstyled model reads as one quiet thing rather than every
 *  definition claiming the theme's own hue. */
export const NONE: StyleConfig = {
  set: null, slot: "neutral", emphasis: "normal", weight: "thin", voice: "normal",
};

/** The portable typed fields a usage draws from without a style set. */
export type Look = {
  slot: Slot;
  emphasis: Emphasis;
  weight: Weight;
  voice: Voice;
  icon?: string;
  line?: Definition["line"];
  head?: Definition["head"];
  /** Set name when one is named and in the build; absent means portable alone. */
  set?: string;
  /** False when nothing was named at all — an untyped usage has no definition
   *  to read presentation from, so the engine's own default stands. */
  typed: boolean;
};

/** One ramp step of a look, as the page's own variable — which is what lets a
 *  card or a route follow the theme rather than carry a baked colour. */
export function ramp(look: Look, part: "fill" | "line"): string {
  return `var(--s-${look.slot}-${STEPS[look.emphasis][part]})`;
}

/** The sheet for a name, or undefined when this build does not ship it. */
export function sheet(name: string): Sheet | undefined {
  return SHEETS[name];
}

/** Why this configuration would not work, in words, or null.
 *
 *  An unknown key is refused rather than ignored. A component owning its key
 *  owns the whole of it — a misspelt `sett` is a mistake this build can see,
 *  unlike an unknown *component*, which may be a newer build's. */
function check(config: Config): string | null {
  if (config.slot !== undefined && !SLOTS.includes(config.slot as Slot)) {
    return `\`style.slot\` has to be one of ${SLOTS.join(", ")}`;
  }

  if (config.emphasis !== undefined && !EMPHASES.includes(config.emphasis as Emphasis)) {
    return `\`style.emphasis\` has to be one of ${EMPHASES.join(", ")}`;
  }

  if (config.weight !== undefined && !WEIGHTS.includes(config.weight as Weight)) {
    return `\`style.weight\` has to be one of ${WEIGHTS.join(", ")}`;
  }

  if (config.voice !== undefined && !VOICES.includes(config.voice as Voice)) {
    return `\`style.voice\` has to be one of ${VOICES.join(", ")}`;
  }

  if (config.set !== undefined) {
    if (typeof config.set !== "string" || !SHEETS[config.set]) {
      return SETS.length
        ? `\`style.set\` has to be one of ${SETS.join(", ")}`
        : "`style.set` names a style set, and this build ships none";
    }
  }

  const stray = Object.keys(config).filter((key) => !(key in NONE));

  return stray.length ? `\`style\` knows nothing about \`${stray[0]}\`` : null;
}

export const style: Component = { name: "style", check };

/** How this element's usages are coloured: its definition's answer over none.
 *
 *  Per definition and never per element. Reads the resolved view, so a subtype
 *  inherits a style key it does not mention and replaces one it does — never
 *  a deep merge inside the key. */
export function styleOf(graph: Graph, element: Element): StyleConfig {
  const config = resolved(graph, element.type)?.components?.style;

  return config ? { ...NONE, ...config } as StyleConfig : NONE;
}

/** How this usage draws: the definition's portable fields, and the set it
 *  names when that set is in the build.
 *
 *  A package must be useful with portable presentation alone — the set is the
 *  custom look, gained only where it is present. */
export function lookOf(graph: Graph, element: Element): Look {
  const def = graph.defs[element.type];
  const config = styleOf(graph, element);
  const held = config.set && SHEETS[config.set] ? config.set : undefined;

  return {
    slot: config.slot,
    emphasis: config.emphasis,
    weight: config.weight,
    voice: config.voice,
    icon: def?.icon,
    line: def?.line,
    head: def?.head,
    ...(held ? { set: held } : {}),
    typed: Boolean(resolved(graph, element.type)),
  };
}
