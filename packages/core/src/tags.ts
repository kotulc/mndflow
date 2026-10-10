/** Tags: definitions on the `tag` base that blocks, lines and definitions carry by id. Traits and
 *  labels are tags too, by their chain (`is_trait`, `is_label`, in defs). */

import { all_defs, block_base, carried_tags, def_at, is_trait } from "./defs";
import type { Definition, Graph, Id } from "./types";


/** Whether a definition is a tag: a plain tag, a trait or a label. */
export function is_tag(graph: Graph, def: Id | undefined): boolean {
  return !!def_at(graph, def) && block_base(graph, def) === "tag";
}

/** The tags an element carries that are not traits — plain tags and labels — nearest first. */
export function tags_of(graph: Graph, id: Id): Id[] {
  return carried_tags(graph, id).map((c) => c.id).filter((t) => !is_trait(graph, t));
}

/** The tag a word names: by id, or by name. */
export function tag_named(graph: Graph, word: string): Definition | undefined {
  const want = word.trim();
  if (is_tag(graph, want)) return def_at(graph, want);
  return all_defs(graph).find((d) => d.name === want && is_tag(graph, d.id));
}
