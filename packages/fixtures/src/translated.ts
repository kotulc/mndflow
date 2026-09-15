/** A graph as a translator hands one over, in a vocabulary this repo does not own. */

import { ROOT, type Block, type Definition, type Graph, type Id } from "@mnd/core";
import { base_graph } from "@mnd/defs";

/** The tier root the vocabulary is filed on, so it travels with the graph. */
const HOME = "docs";

function def(name: string, extend: string, card: Record<string, unknown>,
             fields: Definition["fields"] = []): Definition {
  return { id: `doc.${name}`, group: "block", name: `doc.${name}`,
           extends: extend, fields, components: { card } };
}

/** Folders, pages, sections and the things inside a section. */
const VOCAB: Definition[] = [
  def("set", "folder", {  },
      [{ name: "source", form: "link" }]),
  def("page", "block", { label: "inside" },
      [{ name: "source", form: "link" }, { name: "title", form: "text" }]),
  def("section", "block", { label: "inside" },
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
  /** A relation definition declares no fields. */
  { id: "doc.link", group: "relation", name: "doc.link", extends: "line" },
];

/** Where a block came from, as the one field name every view module reads. */
function block(id: Id, parent: Id | null, type: string, name: string,
               source: string, order: number, more: Partial<Block> = {}): Block {
  return { id, parent, type, name, order,
           fields: [{ name: "source", form: "link", value: source }],
           ...more };
}

/** A small documentation collection: a folder, pages, sections, a table, a list, a note, a link. */
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
    dir: "forward", type: "doc.link",
  };

  return graph;
}

/** The tier root the vocabulary and collection hang from. */
export const TIER = HOME;
