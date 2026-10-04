/** The `base` package: one definition per functionally distinct kind, its traits, and the relation
 *  kinds — shipped and frozen. **Defined as JSON** (`base.json`), as every package is; this reads it. */

import { BASE_PACKAGE, empty_graph, type Block, type Definition, type File, type Graph } from "@mnd/core";
import file from "./base.json";

/** What the package calls its root, and so what every definition here sits under. */
export const PACKAGE = BASE_PACKAGE;

/** Every block of the package, ordered as it reads. */
export const FLOOR: Block[] = Object.values((file as unknown as File).graph.blocks)
  .sort((a, z) => (a.order ?? 0) - (z.order ?? 0));

/** The definitions alone. */
export const ALL: Definition[] = FLOOR.filter((b): b is Definition => !!b.def);

/** The block kinds. */
export const BASE: Definition[] = ALL.filter((d) => !["line", "tie"].includes(d.id) && d.type !== "tag");

/** The relation kinds. */
export const RELATIONS: Definition[] = ALL.filter((d) => ["line", "tie"].includes(d.id));

export function by_id(id: string): Definition | null {
  return ALL.find((d) => d.id === id) ?? null;
}

/** A fresh workspace with the base package under it. */
export function base_graph(): Graph {
  const empty = empty_graph();
  return { ...empty, blocks: { ...empty.blocks, ...Object.fromEntries(FLOOR.map((b) => [b.id, b])) } };
}
