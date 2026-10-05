/** Tags: definitions on the `tag` base that blocks, lines and definitions carry by id. A tag
 *  carrying settings is a trait (`traits_of`, in defs). */

import { all_defs, block_base, def_at, def_of, is_base, isa } from "./defs";
import type { Definition, Graph, Id } from "./types";


/** Whether a definition is a tag. */
export function is_tag(graph: Graph, def: Id | undefined): boolean {
  return !!def_at(graph, def) && block_base(graph, def) === "tag";
}

/** Whether a definition is a trait: a tag carrying settings. The `tag` base itself is a kind. */
export function is_trait(graph: Graph, def: Id | undefined): boolean {
  return is_tag(graph, def) && !is_base(def) && !!def_at(graph, def)?.settings;
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
