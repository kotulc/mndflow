/** Links: an attribute typed by a block definition, drawn as a line between two cards on one
 *  layer.
 *
 *  Derived, never stored, and drawn only where the internal view asks: a stand-in for a definition
 *  links to a stand-in for the definition its attribute names; a usage links to the usage its
 *  value names. A link line is looked at, never picked. */

import { attributes_of, def_at, drawn_in, is_interface, isa, links_to, shown_name, type Block,
         type Graph, type Id, type Relation } from "@mnd/core";

/** What a link's id starts with, so nothing takes it for a relationship. */
export const LINK = "link:";

/** How a link draws: dashed, an open head at what it names, and the attribute's name. */
const DRAWN = { line: { to_arrow: "open" }, style: { border_style: "dashed" } };


/** The graph with a line for every link between two cards the layer draws. */
export function linked_graph(graph: Graph, layer: Id | null): Graph {
  const cards = drawn_in(graph, layer).filter((b) => !is_interface(graph, b.id));
  const edges: Record<Id, Relation> = {};
  for (const from of cards) {
    const def = stood(graph, from) ?? from.type;
    for (const a of attributes_of(graph, def)) {
      const target = links_to(graph, a);
      if (!target) continue;
      const answer = from.values?.find((v) => v.name === a.name)?.value;
      for (const to of cards) {
        if (to.id === from.id || !names(graph, from, to, target, answer)) continue;
        const id = `${LINK}${from.id}:${a.name}:${to.id}`;
        edges[id] = { id, from: from.id, to: to.id, name: a.name, dir: "forward", settings: DRAWN };
      }
    }
  }
  return Object.keys(edges).length ? { ...graph, edges: { ...graph.edges, ...edges } } : graph;
}

/** Whether `to` is what `from`'s link names: a stand-in for the definition, where `from` stands
 *  for one; else a usage of it, called what `from` answered. */
function names(graph: Graph, from: Block, to: Block, target: Id, answer?: string): boolean {
  if (stood(graph, from)) return stood(graph, to) === target;
  return !!answer && isa(graph, to.type).some((d) => d.id === target)
    && shown_name(graph, to.id) === answer;
}

/** The definition a block stands in for, where it stands for one. */
function stood(graph: Graph, b: Block): Id | undefined {
  return b.of && def_at(graph, b.of) ? b.of : undefined;
}
