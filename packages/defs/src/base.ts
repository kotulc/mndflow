/** The `base` package: one definition per block kind and relation module, shipped and frozen. */

import { BASE_PACKAGE, empty_graph, type Block, type Definition, type Graph } from "@mnd/core";

/** What the package calls its root, and so what every definition here sits under. */
export const PACKAGE = BASE_PACKAGE;

/** The groups that organize the package's domain, by what its definitions are. */
const BLOCKS = `${PACKAGE}.blocks`;
const RELATIONS_GROUP = `${PACKAGE}.relations`;

function def(name: string, module: string, body: string,
             card: Record<string, unknown> = {},
             style: Record<string, unknown> = {},
             allows?: Record<string, unknown>): Definition {
  return {
    id: name, parent: PACKAGE, name, body, def: {}, group: BLOCKS,
    settings: { block: { module }, card, style, ...(allows ? { allows } : {}) },
  };
}

/** Eight base kinds; every subtype extends one. `folder`, `note`, `group` and `grid` are the plain
 *  block module with different settings — what separates them is what they allow. **No
 *  `resource`**: a block points at external content through `source`, so a kind for it said
 *  nothing more. */
export const BASE: Definition[] = [
  def("block", "block", "The unit of structure: a thing, a part or a step. It may hold blocks of "
      + "its own, which it opens onto as a layer.",
      {}, { family: "primary" }),
  def("folder", "block", "Files blocks away: a quiet container for what belongs together.",
      {}, { family: "neutral", border_contrast: "faint", name_contrast: "faint" }),
  /** A reference is painted as elsewhere. */
  def("reference", "reference", "Stands for a block, a definition or a package elsewhere, "
      + "drawn where it is needed without moving it.",
      {}, { family: "away", border_contrast: "strong", name_contrast: "strong",
            fill: "hatch", opacity: 0.55 }),
  /** An interface draws as its seat, so only its family matters. */
  def("interface", "interface", "A port seated on a block's wall: where relations enter and "
      + "leave it.",
      {}, { family: "secondary", border_width: "thin" }),
  /** The two holders: a plain block whose capability gathers blocks on its own layer. */
  def("group", "block", "A boundary round blocks on its own layer: membership, never "
      + "parenthood.",
      {}, { family: "muted", border_contrast: "faint", name_contrast: "faint" },
      { holder: "group", ports: false }),
  def("grid", "block", "A lattice of cells on its own layer: a header allocates what its row or "
      + "column holds.",
      {}, { family: "muted", border_contrast: "faint", name_contrast: "faint" },
      { holder: "grid", ports: false }),
  /** A remark: its own height, the amber every theme keeps for one, and it holds nothing. */
  def("note", "block", "A remark about what it is tied to. It holds nothing.",
      { height: "free" }, { family: "note", border_contrast: "strong", name_contrast: "faint",
                            fill: "wash", opacity: 0.06 },
      { ports: false, holds: false }),
  /** Dashed, as something carried rather than placed; it holds nothing, as a note. */
  def("tag", "block", "A word carried by blocks, lines and definitions to say what they are "
      + "like. Its body says what it means.",
      { height: "free", body: "show" }, { family: "secondary", border_style: "dashed" },
      { ports: false, holds: false }),
];

/** One relation definition per relation module, shipped and frozen, exactly as a block kind is. */
function rel(module: string, body: string): Definition {
  return { id: module, parent: PACKAGE, name: module, body, def: {}, group: RELATIONS_GROUP };
}

/** A line and a tie. */
export const RELATIONS: Definition[] = [
  rel("line", "A relation between two blocks: what flows, connects or depends."),
  rel("tie", "A dashed run with no heads: what a relation touching a note is."),
];

/** The package's root and the groups that organize its domain. */
const FRAME: Block[] = [
  { id: PACKAGE, parent: null, name: PACKAGE },
  { id: BLOCKS, parent: PACKAGE, name: "blocks", type: "group", def: {}, order: 1 },
  { id: RELATIONS_GROUP, parent: PACKAGE, name: "relations", type: "group", def: {}, order: 2 },
];

/** Every block of the package, ordered as it reads. */
export const FLOOR: Block[] = [...FRAME, ...[...BASE, ...RELATIONS]
  .map((d, n) => ({ ...d, order: n + 3 }))];

/** The definitions alone. */
export const ALL: Definition[] = [...BASE, ...RELATIONS];

export function by_id(id: string): Definition | null {
  return ALL.find((d) => d.id === id) ?? null;
}

/** A fresh workspace with the base package under it. */
export function base_graph(): Graph {
  const empty = empty_graph();
  return { ...empty, blocks: { ...empty.blocks, ...Object.fromEntries(FLOOR.map((b) => [b.id, b])) } };
}
