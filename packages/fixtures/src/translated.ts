/** A graph as a translator hands one over, in a vocabulary this repo does not own. */

import { MAIN, ROOT, type Attribute, type Block, type Definition, type Graph,
         type Id } from "@mnd/core";
import { base_graph } from "@mnd/defs";

/** The tier root the vocabulary is filed on, so it travels with the graph. */
const HOME = "docs";

function def(name: string, extend: string, card: Record<string, unknown>,
             attributes: Attribute[] = []): Definition {
  return { id: `doc.${name}`, parent: ROOT, name: `doc.${name}`, type: extend,
           def: { attributes }, settings: { card } };
}

/** Folders, pages, sections and the things inside a section. */
const VOCAB: Definition[] = [
  def("set", "folder", {  },
      [{ name: "source", type: "link" }]),
  def("page", "block", { label: "inside" },
      [{ name: "source", type: "link" }, { name: "title" }]),
  def("section", "block", { label: "inside" },
      [{ name: "source", type: "link" }, { name: "heading" },
       { name: "depth", type: "number" }]),
  def("table", "block", {  },
      [{ name: "source", type: "link" }, { name: "headers", many: true }]),
  def("row", "block", {  },
      [{ name: "source", type: "link" }, { name: "term" },
       { name: "means" }]),
  def("item", "block", {  },
      [{ name: "source", type: "link" }, { name: "text" },
       { name: "checked", type: "flag" }]),
  def("term", "note", {  },
      [{ name: "source", type: "link" }]),
  /** A relation definition declares no attributes. */
  { id: "doc.link", parent: ROOT, name: "doc.link", type: "line", def: {} },
];

/** Where a block came from, as an answer, and its source. */
function block(id: Id, parent: Id | null, type: string, name: string,
               source: string, order: number, more: Partial<Block> = {}): Block {
  return { id, parent, type, name, order,
           source, values: [{ name: "source", value: source }],
           ...more };
}

/** A small documentation collection: a folder, pages, sections, a table, a list, a note, a link. */
export function translated(): Graph {
  const graph = base_graph();

  graph.blocks[HOME] = { id: HOME, parent: MAIN, type: "folder", name: "Handbook", order: 1 };
  for (const d of VOCAB) graph.blocks[d.id] = d;

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
