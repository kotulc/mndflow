/** Labels for lines a view draws that nobody stored — a link, an *extends* line. **A line's name is
 *  a label it carries**, so a view names its own lines the same way: a label made for the drawing,
 *  under no package, never listed. */

import type { Block, Id } from "@mnd/core";

/** What the view's labels sit under: no block, so nothing lists or draws them. */
const DRAWN = "@drawn";


/** The label a view's line is called by: one per name. */
export function drawn_label(name: string): Block {
  return { id: `${DRAWN}:${name}`, parent: DRAWN, name, type: "label", def: {} };
}

/** Blocks with these labels laid in, by id. */
export function with_labels(blocks: Record<Id, Block>, labels: readonly Block[]): Record<Id, Block> {
  return labels.length ? { ...blocks, ...Object.fromEntries(labels.map((l) => [l.id, l])) } : blocks;
}
