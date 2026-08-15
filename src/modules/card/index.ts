/** The card component: how a usage of a definition is composed on the canvas.
 *
 *  What a card is *made of* — a name, a subtype chip, a shape, a few of its
 *  fields — rather than what it is coloured, which is `style`, or where it sits,
 *  which is the engine's. It reads its own key under a definition's
 *  `components` and no other's.
 *
 *  **The engine always places a rectangle.** Every seat, route and interface
 *  reads the box, so `shape` changes what is *drawn* and never where anything
 *  attaches. A line meeting the box near a diamond's corner appears to touch
 *  empty space; softening that is the renderer's to do with port marks, and is
 *  not a licence to give the engine a second idea of a card's outline.
 *
 *  **A shape drawn inside the box is the activity's engine capability.** A
 *  derived decision or fork is a count, not an element: the module asks for a
 *  shape-card and nothing in the graph holds one. `shaped` is that ask;
 *  `outline` is how the shape fills the box a renderer strokes. Wiring those
 *  into the canvas is the diagram module's, not this one's.
 *
 *  **The layouts and the shapes are closed sets that grow by a code change** —
 *  additively, and never from data. That is the line between an engine and a
 *  plugin host: a definition picks from what the build knows and cannot
 *  describe a new one. */

import type { Component, Config } from "../index";
import type { Element, Graph } from "../../graph/types";

/** How a card is composed. `type` is what every card is today: a name with the
 *  subtype chip beside it. */
export const LAYOUTS = ["name", "type", "fields", "compartments", "icon", "shape"] as const;

/** What is drawn inside the box. The box itself is the engine's, always. */
export const SHAPES = ["rect", "round", "diamond", "ellipse", "hex"] as const;

/** Where the name goes. A diamond's middle is narrow, so its text usually sits
 *  under it. */
export const LABELS = ["inside", "below", "none"] as const;

export type Layout = (typeof LAYOUTS)[number];
export type Shape = (typeof SHAPES)[number];
export type Label = (typeof LABELS)[number];

export type CardConfig = {
  layout: Layout;
  shape: Shape;
  label: Label;
  /** Which of a usage's fields draw on it, in this order. Empty draws none: a
   *  card carrying eight fields is unreadable, so showing one is a choice
   *  somebody makes rather than the default. */
  shows: string[];
};

/** Today's card, and the answer for every definition that says nothing.
 *
 *  Stated here as data rather than left implicit in a renderer, because *the
 *  base diagram being one configuration among others* is the claim the whole
 *  component surface is measured against. If this default ever cannot describe
 *  what the canvas draws, the boundary is in the wrong place. */
export const PLAIN: CardConfig = { layout: "type", shape: "rect", label: "inside", shows: [] };

/** Corner radius for `round`, as a fraction of the shorter side. Kept here so
 *  every renderer that strokes a round card agrees without inventing one. */
const ROUND = 0.2;

/** One of a closed set, or the reason it is not. */
function oneOf(name: string, value: unknown, set: readonly string[]): string | null {
  if (value === undefined) return null;
  if (typeof value === "string" && set.includes(value)) return null;

  return `\`card.${name}\` has to be one of ${set.join(", ")}`;
}

/** Why this configuration would not work, in words, or null.
 *
 *  An unknown key is refused rather than ignored. A component owning its key
 *  owns the whole of it, so a misspelt `shp` is a mistake this build can
 *  actually see — unlike an unknown *component*, which may be a newer build's
 *  and is left alone at the door. */
function check(config: Config): string | null {
  const wrong = oneOf("layout", config.layout, LAYOUTS)
    ?? oneOf("shape", config.shape, SHAPES)
    ?? oneOf("label", config.label, LABELS);
  if (wrong) return wrong;

  if (config.shows !== undefined &&
      (!Array.isArray(config.shows) || config.shows.some((f) => typeof f !== "string"))) {
    return "`card.shows` has to be a list of field names";
  }

  const stray = Object.keys(config).filter((key) => !(key in PLAIN));

  return stray.length ? `\`card\` knows nothing about \`${stray[0]}\`` : null;
}

export const card: Component = { name: "card", check };

/** How this element's card is composed: its definition's answer over the
 *  engine's default.
 *
 *  Per definition and never per element, so every usage of a subtype is
 *  composed alike. Where two must differ they differ in what they hold and in
 *  their fields, both of which are content.
 *
 *  A definition that extends another does not yet inherit its card — SC.3 is
 *  what merges the chain, and until then a subtype stands on its own. */
export function cardOf(graph: Graph, element: Element): CardConfig {
  const config = graph.defs[element.type]?.components?.card;

  return config ? { ...PLAIN, ...config } as CardConfig : PLAIN;
}

/** A card that is only a shape in a box — what a derived control node is drawn
 *  as. Nothing in the graph holds one; the caller counted relationships and
 *  guards, and this is how that count reads.
 *
 *  A definition that *is* a decision still goes through `cardOf`. This is for
 *  the count that never became an element. Label defaults under the shape: a
 *  diamond's middle is too narrow for text. */
export function shaped(shape: Shape, label: Label = "below"): CardConfig {
  return { layout: "shape", shape, label, shows: [] };
}

/** A point in the engine's box, origin at the top-left. */
export type Spot = { x: number; y: number };

/** How a shape fills the box the engine placed. A renderer strokes or fills
 *  this; seats and routes still meet the rectangle. */
export type Outline =
  | { kind: "rect"; x: number; y: number; w: number; h: number; round: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "poly"; points: Spot[] };

/** The outline of a shape inside the engine's box.
 *
 *  Coordinates are local to the box. A diamond's vertices sit at the midpoints
 *  of the four sides — the UML decision mark — so a line meeting a side's
 *  middle appears to touch a tip. A fork that needs a long thin bar still uses
 *  `rect` (or `round`); the definition's `size` is what makes the box a bar. */
export function outline(shape: Shape, box: { w: number; h: number }): Outline {
  const { w, h } = box;
  const cx = w / 2;
  const cy = h / 2;

  if (shape === "rect") return { kind: "rect", x: 0, y: 0, w, h, round: 0 };
  if (shape === "round") {
    return { kind: "rect", x: 0, y: 0, w, h, round: Math.min(w, h) * ROUND };
  }
  if (shape === "ellipse") return { kind: "ellipse", cx, cy, rx: w / 2, ry: h / 2 };
  if (shape === "diamond") {
    return { kind: "poly", points: [
      { x: cx, y: 0 }, { x: w, y: cy }, { x: cx, y: h }, { x: 0, y: cy },
    ] };
  }

  // Flat-top hexagon, vertices on the box's border.
  const dx = w / 4;
  return { kind: "poly", points: [
    { x: dx, y: 0 }, { x: w - dx, y: 0 }, { x: w, y: cy },
    { x: w - dx, y: h }, { x: dx, y: h }, { x: 0, y: cy },
  ] };
}
