/** The `base` package: one definition per kind the engine treats differently, in a folder per
 *  category — blocks, relations, components, organization and annotations — shipped and frozen. **Each
 *  definition is a file of its own** under `base/`, collected into one package file, `base.json`
 *  (`npm run base`), as any source folder is; this reads it. */

import { BASE_BLOCKS, BASE_PACKAGE, empty_graph, type Block, type Definition, type File, type Graph } from "@mnd/core";
import file from "./base.json";

/** What the package calls its root, and so what every definition here sits under. */
export const PACKAGE = BASE_PACKAGE;

/** Every block of the package, ordered as it reads. */
export const FLOOR: Block[] = Object.values((file as unknown as File).graph.blocks)
  .sort((a, z) => (a.order ?? 0) - (z.order ?? 0));

/** The definitions alone. */
export const ALL: Definition[] = FLOOR.filter((b): b is Definition => !!b.def);

/** The block kinds: `block`, and each kind configuring it. */
export const BASE: Definition[] = ALL.filter((d) => BASE_BLOCKS.includes(d.id));

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
