/** How a usage of a definition draws.
 *
 *  **The contract already existed and was already validated; nothing read it.**
 *  `core` publishes the `card` and `style` components and drops at the door any
 *  key it cannot make sense of, so what arrives here is well-formed or absent.
 *  This turns what survived into the handful of names a renderer keys off.
 *
 *  **A definition picks within the theme's palette; it never names a colour, a
 *  pixel or a font.** `slot` is one of six hue families and `emphasis` says how
 *  loudly to take it — both closed sets, so *ink reads on fill* holds in every
 *  theme without anybody checking. Everything below is a name from a closed
 *  set, which is what lets the whole of it live in a stylesheet.
 *
 *  Here rather than in the drawing because a look is derived from the graph,
 *  and everything else derived from the graph is derived here — which is also
 *  what lets the CLI's text and SVG renderers say what a card would look like
 *  without resolving React. */

import { config_of, EMPHASES, is_container, is_interface, LABELS, LAYOUTS,
         SHAPES, SLOTS, VOICES, WEIGHTS, WEIGHTS as WEIGHT_NAMES,
         type Graph, type Id } from "@mnd/core";

export type Slot = (typeof SLOTS)[number];
export type Emphasis = (typeof EMPHASES)[number];
export type Weight = (typeof WEIGHT_NAMES)[number];
export type Voice = (typeof VOICES)[number];
export type Shape = (typeof SHAPES)[number];
export type Label = (typeof LABELS)[number];
export type Layout = (typeof LAYOUTS)[number];

/** What one usage looks like. Every field is a name from a closed set, so a
 *  renderer is a lookup table and a definition cannot invent a value. */
export type Look = {
  slot: Slot;
  emphasis: Emphasis;
  weight: Weight;
  voice: Voice;
  shape: Shape;
  label: Label;
  layout: Layout;
  /** The subtype this usage names, as a word. **Absent is not "block"** — a
   *  card that nobody has told apart says so by having nothing to say. */
  kind?: string;
  /** Which of a usage's fields the card shows, in the order it shows them. */
  shows?: readonly string[];
};

/** What a card is when its definition says nothing. Neutral, ordinary weight,
 *  ordinary voice: the look every unclassified block already had. */
export const PLAIN: Look = {
  slot: "neutral", emphasis: "normal", weight: "thin", voice: "normal",
  shape: "rect", label: "inside", layout: "name",
};

/** One value if it is in the set, or the fallback. **The door already refused
 *  anything else**, so this is the second line and not the first: it is what
 *  keeps an older build reading a newer package rather than throwing on it. */
function one<T extends string>(value: unknown, set: readonly T[], fallback: T): T {
  return typeof value === "string" && (set as readonly string[]).includes(value)
    ? value as T : fallback;
}

/** How this usage draws.
 *
 *  Two component keys, read separately and merged nowhere: `card` says what it
 *  is made of and `style` says how loudly it is taken. Neither reads the
 *  other's, which is the whole point of the key being the boundary. */
export function look_of(graph: Graph, id: Id): Look {
  const b = graph.blocks[id];
  if (!b) return PLAIN;

  const card = config_of(graph, b.type, "card");
  const style = config_of(graph, b.type, "style");
  const named = b.type ? graph.defs[b.type]?.name : undefined;

  return {
    slot: one(style["slot"], SLOTS, PLAIN.slot),
    emphasis: one(style["emphasis"], EMPHASES, PLAIN.emphasis),
    weight: one(style["weight"], WEIGHTS, weight_of(graph, id)),
    voice: one(style["voice"], VOICES, PLAIN.voice),
    shape: one(card["shape"], SHAPES, PLAIN.shape),
    label: one(card["label"], LABELS, PLAIN.label),
    layout: one(card["layout"], LAYOUTS, PLAIN.layout),
    ...(named ? { kind: named } : {}),
    ...(Array.isArray(card["shows"])
      ? { shows: (card["shows"] as unknown[]).filter((f) => typeof f === "string") }
      : {}),
  };
}

/** How heavy a border is when the definition has not said.
 *
 *  **A container holds a layer of its own, so it says so before you descend.**
 *  That is the one weight the engine sets on its own, and a definition naming
 *  `style.weight` overrides it like anything else. */
function weight_of(graph: Graph, id: Id): Weight {
  const b = graph.blocks[id]!;
  if (is_interface(b)) return "hairline";
  return is_container(graph, id) ? "thick" : "thin";
}

/** What a container is holding, for the picture drawn inside its card.
 *
 *  **Only the immediate children, and only so many.** Nesting past one level is
 *  what descending is for, and a card the size of a grid row has room for a
 *  handful of cells before each says nothing. Interfaces are never in here —
 *  they sit on the wall, and a block with interfaces is still a block. */
export const CELLS = 9;

export type Cell = {
  id: Id;
  label: string;
  /** What this child is, which is what decides its shade. */
  kind: "block" | "container" | "reference" | "note";
  /** More than fit, folded into the last cell. */
  rest?: number;
  /** One of a few shades, so neighbouring cells read apart.
   *
   *  **From the name, not from a model.** A cell's job is to say *this
   *  container holds several distinct things*; that reads as long as adjacent
   *  cells differ, and a name is the one thing about a child that is stable,
   *  free and already here. Nothing is claimed by a particular shade. */
  tint: 0 | 1 | 2 | 3;
};

/** A small stable number from a name. Not a hash worth the word — it only has
 *  to be steady across renders and spread names over four values. */
function tint_of(name: string): 0 | 1 | 2 | 3 {
  let n = 0;
  for (let i = 0; i < name.length; i++) n = (n * 31 + name.charCodeAt(i)) % 1024;
  return (n % 4) as 0 | 1 | 2 | 3;
}

export function cells_of(graph: Graph, id: Id, shown: (id: Id) => string): Cell[] {
  const kids = Object.values(graph.blocks)
    .filter((b) => b.parent === id && !is_interface(b));
  if (!kids.length) return [];

  const out = kids.slice(0, CELLS).map((b): Cell => {
    const label = shown(b.id);
    return {
      id: b.id,
      label,
      kind: b.of ? "reference"
        : config_of(graph, b.type, "block")["module"] === "note" ? "note"
        : is_container(graph, b.id) ? "container" : "block",
      tint: tint_of(label),
    };
  });
  const rest = kids.length - out.length;
  if (rest > 0) out[out.length - 1] = { ...out[out.length - 1]!, rest };
  return out;
}
