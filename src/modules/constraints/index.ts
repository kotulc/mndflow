/** The constraints component: checks that bound a usage in itself.
 *
 *  One kind — `required` — saying which of a usage's fields must carry a
 *  value. A rule governing how things interact is `rules`, and is not here.
 *  It reads its own key under a definition's `components` and no other's.
 *
 *  Declared on a definition, holding over every usage. Advising and refusing
 *  at translation are the surface's; this module owns the shape and what it
 *  means to ask. */

import type { Component, Config } from "../index";
import type { Element, Graph } from "../../graph/types";

export type ConstraintsConfig = {
  /** Which of a usage's fields must carry a value. Empty means none. */
  required: string[];
};

/** What every definition that says nothing gets: no field is required. */
export const NONE: ConstraintsConfig = { required: [] };

/** Why this configuration would not work, in words, or null.
 *
 *  An unknown key is refused rather than ignored. A component owning its key
 *  owns the whole of it — a misspelt `reqired` is a mistake this build can
 *  see, unlike an unknown *component*, which may be a newer build's. */
function check(config: Config): string | null {
  if (config.required !== undefined &&
      (!Array.isArray(config.required) ||
       config.required.some((f) => typeof f !== "string"))) {
    return "`constraints.required` has to be a list of field names";
  }

  const stray = Object.keys(config).filter((key) => !(key in NONE));

  return stray.length ? `\`constraints\` knows nothing about \`${stray[0]}\`` : null;
}

export const constraints: Component = { name: "constraints", check };

/** What this element's definition requires of it: its own answer over none.
 *
 *  Per definition and never per element. A definition that extends another
 *  does not yet inherit its constraints — SC.3 is what merges the chain, and
 *  until then a subtype stands on its own. */
export function constraintsOf(graph: Graph, element: Element): ConstraintsConfig {
  const config = graph.defs[element.type]?.components?.constraints;

  return config ? { ...NONE, ...config } as ConstraintsConfig : NONE;
}
