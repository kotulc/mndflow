/** Tags: definitions on the `tag` base that blocks, lines and definitions carry by id, to be
 *  found by. Traits are tags too, by their chain (`is_trait`, in defs), carried apart. */

import { all_defs, base_of, block_base, def_at, tags_stated } from "./defs";
import { next_order } from "./tree";
import { TAGS, type Definition, type Graph, type Id, type Mutation } from "./types";


/** Whether a definition is a tag: a plain tag or a trait. */
export function is_tag(graph: Graph, def: Id | undefined): boolean {
  return !!def_at(graph, def) && block_base(graph, def) === "tag";
}

/** The tags an element carries, in order: the nearest list its chain states. */
export function tags_of(graph: Graph, id: Id): Id[] {
  return tags_stated(graph, id).ids;
}

/** The tag a word names: by id, or by name. */
export function tag_named(graph: Graph, word: string): Definition | undefined {
  const want = word.trim();
  if (is_tag(graph, want)) return def_at(graph, want);
  return all_defs(graph).find((d) => d.name === want && is_tag(graph, d.id));
}

/** Where the workspace files a tag it makes: the folder called `tags` at its root, else its root. */
export function tag_home(graph: Graph): Id {
  const home = Object.values(graph.blocks).find((b) => b.parent === graph.root && !b.def
    && b.name === TAGS && base_of(graph, b.id) === "folder");
  return home?.id ?? graph.root;
}

/** The tags folder, made with the first tag: last under the root. Nothing when it is already
 *  there. */
export function tag_folder(graph: Graph): Mutation[] {
  if (graph.blocks[TAGS] || tag_home(graph) !== graph.root) return [];
  return [{ op: "add_block", block: {
    id: TAGS, parent: graph.root, name: TAGS, type: "folder", order: next_order(graph, graph.root),
  } }];
}
