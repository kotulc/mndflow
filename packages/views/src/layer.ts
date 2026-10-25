/** One layer drawn on its own, as it is entered from the map: placed by ELK (`flow.ts`), then
 *  projected by its kind — internal, allocation, class, entity — what it holds that
 *  draws a layer of its own a card that is entered in turn. Only what the side drawn lists is in
 *  it. Worked out on every graph change, never stored. */

import { diagram_subject, layout_of, on_side, type Graph, type Id, type Lists,
         type ViewKind } from "@mnd/core";
import { placed_as, type Placed } from "./arrange";
import { project } from "./block";
import { class_graph } from "./classes";
import { place } from "./flow";
import type { Scene } from "./scene";
import { read_through } from "./through";

/** The kinds laid out ahead by ELK: what this file draws; anything else `project` places alone. */
const AHEAD: readonly ViewKind[] = ["internal", "allocation", "class", "er"];

/** Where blocks off the drawn side are put out of sight. */
const HIDDEN = "@layer:hidden";


/** Whether a layer of `kind` is drawn here, laid out ahead. */
export function laid_ahead(kind: ViewKind): boolean {
  return AHEAD.includes(kind);
}

/** The layer `id` draws as `kind`, placed ahead where its kind is laid out by ELK. */
export async function layer_scene(given: Graph, id: Id, kind: ViewKind,
                                  config: { interfaces?: boolean; lists?: Lists } = {})
    : Promise<Scene> {
  const graph = sided(given, config.lists);
  const opts = { room: true, look: { kind, cut: null },
                 ...(config.interfaces === false ? { interfaces: false } : {}) };
  const ahead = await placed_ahead(graph, id, kind);
  return ahead ? placed_as(ahead, () => project(graph, id, opts)) : project(graph, id, opts);
}

/** The graph with what its side does not list put out of sight: each topmost such block, so a
 *  definition's parts still read through. */
function sided(graph: Graph, lists?: Lists): Graph {
  if (!lists) return graph;
  const blocks = { ...graph.blocks };
  for (const b of Object.values(graph.blocks)) {
    const up = b.parent;
    if (on_side(graph, b.id, lists) || (up && !on_side(graph, up, lists))) continue;
    if (up === null) continue;
    blocks[b.id] = { ...b, parent: HIDDEN };
  }
  return { ...graph, blocks };
}

/** What ELK places ahead for a layer, by its kind: its blocks seen from inside, or the classes a
 *  class or entity diagram draws. A treemap and a grid place themselves. */
async function placed_ahead(graph: Graph, id: Id, kind: ViewKind)
    : Promise<Map<Id, readonly Placed[]> | null> {
  if (kind === "internal") {
    const through = read_through(graph, id);
    if (layout_of(through, id) === "treemap") return null;
    return new Map([[id, (await place(through, id)).spots]]);
  }
  if (kind === "class" || kind === "er") {
    const subject = diagram_subject(graph, id);
    const drawn = class_graph(graph, subject, kind);
    return drawn ? new Map([[subject, (await place(drawn, subject)).spots]]) : null;
  }
  return null;
}
