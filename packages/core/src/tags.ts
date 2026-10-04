/** Tags: definitions on the `tag` base that blocks, lines and definitions carry by id; and badges,
 *  the words for what a definition can do, read off its settings. A tag carrying settings is a
 *  trait (`traits_of`, in defs). */

import { allows_of } from "./capabilities";
import { all_defs, block_base, config_of, def_at, def_of, isa } from "./defs";
import type { Definition, Graph, Id } from "./types";


/** Whether a definition is a tag. */
export function is_tag(graph: Graph, def: Id | undefined): boolean {
  return !!def_at(graph, def) && block_base(graph, def) === "tag";
}

/** What a definition can do, in words: a readout of its settings, never stored or carried. */
export function badges_of(graph: Graph, def: Id): string[] {
  const d = def_at(graph, def);
  if (!d) return [];
  const base = block_base(graph, def);
  if (base === "tag") return [];
  const allows = allows_of(graph, def);
  const card = config_of(graph, def, "card");
  const said: string[] = [];
  if (allows.holds !== false) said.push("layer");
  if (allows.heads) said.push("headed");
  if (allows.ports !== false) said.push("ports");
  if (card["height"] === "fit") said.push("fits");
  if (card["height"] === "free") said.push("free");
  if (card["preview"] === "show") said.push("media");
  if ((graph.blocks[graph.root]?.pinned ?? []).includes(def)) said.push("pinned");
  return said;
}

/** The tags a definition carries: its chain's, nearest first. */
export function def_tags(graph: Graph, def: Id): Id[] {
  return [...new Set(isa(graph, def).flatMap((d) => d.tags ?? []))];
}

/** The tags an element carries: its own, then its definition's. */
export function block_tags(graph: Graph, id: Id): Id[] {
  const own = graph.blocks[id]?.tags ?? graph.edges[id]?.tags ?? [];
  const def = def_of(graph, id);
  return [...new Set([...own, ...(def ? def_tags(graph, def) : [])])];
}

/** The tag a word names: by id, or by name. */
export function tag_named(graph: Graph, word: string): Definition | undefined {
  const want = word.trim();
  if (is_tag(graph, want)) return def_at(graph, want);
  return all_defs(graph).find((d) => d.name === want && is_tag(graph, d.id));
}
