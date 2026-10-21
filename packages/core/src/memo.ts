/** Lookups worked out once per set of blocks: what each block holds, the package roots, each
 *  kind of named component. A drawing asks them over and over, and each would otherwise read
 *  every block. **Whatever writes a set of blocks in place forgets it.** */

import type { Graph } from "./types";

/** What was worked out, by the set of blocks it was read from, then by what was asked. */
const KEPT = new WeakMap<object, Map<string, unknown>>();

/** What `make` works out from this graph's blocks, worked out once until they are written. */
export function kept<T>(graph: Graph, key: string, make: () => T): T {
  let by = KEPT.get(graph.blocks);
  if (!by) { by = new Map(); KEPT.set(graph.blocks, by); }
  if (!by.has(key)) by.set(key, make());
  return by.get(key) as T;
}

/** Everything worked out from this graph's blocks, dropped: they are being written in place. */
export function forget(graph: Graph): void {
  KEPT.delete(graph.blocks);
}
