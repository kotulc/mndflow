/** A graph as a **translator** hands one over: built from somewhere else, in a
 *  vocabulary this repo does not own.
 *
 *  Every other fixture here is written the way the app writes — a log, folded
 *  through the door. That proves the engine agrees with itself, which is the
 *  wrong question for the seam: what arrives at `kit` was assembled by a tool
 *  that holds `@mnd/kit` and a `.json` and nothing else, and it names
 *  definitions nobody here has seen.
 *
 *  **The contract, and it cuts both ways.** A translator proves its output
 *  satisfies the file's invariants; this proves the engine handles anything
 *  that does. Neither imports the other, so this is a translator's *shape* and
 *  not any particular one — a documentation collection, because that is the
 *  first of the class, and the shape is what is being held to.
 *
 *  **An edge carries no values**, which is the one thing a translator has to
 *  know about relationships here: the run is the join and the definition is
 *  what it is. Metadata found on a foreign edge becomes a definition, or a note
 *  tied to the run.
 *
 *  The two things a translator needs that ordinary modelling does not:
 *
 *  - **a vocabulary filed on the tier root**, so the file carries the meaning
 *    of its own types rather than depending on a package being installed; and
 *  - **a `source` field of form `link` on every navigable block**, which is
 *    the whole of how a drawing becomes navigation. */

import { ROOT, type Block, type Definition, type Graph, type Id } from "@mnd/core";
import { base_graph } from "@mnd/defs";

/** The tier root the vocabulary is filed on, so it travels with the graph. */
const HOME = "docs";

function def(name: string, extend: string, card: Record<string, unknown>,
             fields: Definition["fields"] = []): Definition {
  return { id: `doc.${name}`, group: "block", name: `doc.${name}`,
           extends: extend, fields, components: { card } };
}

/** Folders, pages, sections and the things inside a section. Every one extends
 *  a base definition, and none of them adds a module — which is the line
 *  between a package and a code change. */
const VOCAB: Definition[] = [
  def("set", "folder", {  },
      [{ name: "source", form: "link" }]),
  def("page", "block", { shows: ["title"] },
      [{ name: "source", form: "link" }, { name: "title", form: "text" }]),
  def("section", "block", { shows: ["heading"] },
      [{ name: "source", form: "link" }, { name: "heading", form: "text" },
       { name: "depth", form: "number" }]),
  def("table", "block", {  },
      [{ name: "source", form: "link" }, { name: "headers", form: "text", many: true }]),
  def("row", "block", {  },
      [{ name: "source", form: "link" }, { name: "term", form: "text" },
       { name: "means", form: "text" }]),
  def("item", "block", {  },
      [{ name: "source", form: "link" }, { name: "text", form: "text" },
       { name: "checked", form: "flag" }]),
  def("term", "note", {  },
      [{ name: "source", form: "link" }]),
  /** **A relation definition declares no fields**, because an edge holds no
   *  values: a connection is a join, and what one has to say belongs to the
   *  blocks at its ends. A translator that finds metadata on a foreign edge
   *  maps it to the *definition* — a link of kind `internal` is a definition
   *  named `internal` — or ties a note to the run for free text. */
  { id: "doc.link", group: "relation", name: "doc.link", extends: "line" },
];

/** Where a block came from, as the one field name every view module reads. */
function block(id: Id, parent: Id | null, type: string, name: string,
               source: string, order: number, more: Partial<Block> = {}): Block {
  return { id, parent, type, name, order,
           fields: [{ name: "source", form: "link", value: source }],
           ...more };
}

/** A small documentation collection: one folder, two pages, sections under
 *  each, a table with rows, a list with items, a glossary note, and one link
 *  between pages. Three levels deep, which is what a diagram draws. */
export function translated(): Graph {
  const graph = base_graph();

  graph.blocks[HOME] = { id: HOME, parent: ROOT, type: "folder", name: "Handbook", order: 1 };
  for (const d of VOCAB) graph.defs[d.id] = d;

  const blocks: Block[] = [
    block("set_guides", HOME, "doc.set", "Guides", "/guides/", 1),
    block("page_start", "set_guides", "doc.page", "Getting Started",
          "/guides/getting-started", 1),
    block("sec_install", "page_start", "doc.section", "Install",
          "/guides/getting-started#install", 1),
    block("sec_config", "page_start", "doc.section", "Configure",
          "/guides/getting-started#configure", 2),
    block("list_steps", "sec_install", "doc.item", "npm install",
          "/guides/getting-started#install", 1),
    block("page_vocab", "set_guides", "doc.page", "Vocabulary",
          "/guides/vocabulary", 2),
    block("tbl_terms", "page_vocab", "doc.table", "Terms",
          "/guides/vocabulary#terms", 1),
    block("row_block", "tbl_terms", "doc.row", "block",
          "/guides/vocabulary#terms", 1),
    block("row_field", "tbl_terms", "doc.row", "field",
          "/guides/vocabulary#terms", 2),
    block("note_aside", "page_vocab", "doc.term", "",
          "/guides/vocabulary#terms", 2, { body: "a field has no identity" }),
  ];
  for (const b of blocks) graph.blocks[b.id] = b;

  graph.edges["link_start_vocab"] = {
    id: "link_start_vocab", from: "sec_config", to: "page_vocab",
    module: "line", dir: "forward", type: "doc.link",
  };

  return graph;
}

/** The tier root the vocabulary and the collection hang from, for a caller
 *  that wants to project the layer rather than guess its id. */
export const TIER = HOME;
