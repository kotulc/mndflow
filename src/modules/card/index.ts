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
