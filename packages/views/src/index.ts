/** The view modules. Three, and closed: `block` is any planar projection,
 *  `table` and `matrix` are the two that are not a plane. */

export * from "./adjust";
export * from "./derive";
export * from "./read";
export * from "./scene";
export * from "./text";

import { project, type Config } from "./block";
import { project as tabled } from "./table";
import { project as matrixed } from "./matrix";

export type View = {
  name: import("@mnd/core").ViewModule;
  /** What it calls its elementary block — the chip fallback, derived. */
  word: string;
  /** One glyph that means this module and no other. */
  icon: string;
  project: (graph: import("@mnd/core").Graph, layer: import("@mnd/core").Id | null,
            config?: Config) => import("./scene").Scene;
};

export const block: View = { name: "block", word: "block", icon: "▭", project };
export const table: View = { name: "table", word: "row", icon: "▤", project: tabled };
export const matrix: View = { name: "matrix", word: "cell", icon: "▦", project: matrixed };

/** A registry of what this build supplies, keyed by the names **core** owns.
 *  Which modules exist is the model's business; which are built is this one's. */
const built = new Map<string, View>(
  [block, table, matrix].map((v) => [v.name, v]));

export function view(name: string): View | null {
  return built.get(name) ?? null;
}

export function views(): View[] {
  return [...built.values()];
}

export type { Config };
