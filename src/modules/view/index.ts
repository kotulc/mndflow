/** The view component: which view module a diagram's definition names.
 *
 *  A diagram is a block whose definition points at one of the six modules.
 *  `diagram` itself names no module — it is what a layer looks like drawn.
 *  Kind is visible from the module, never stored: three for a structure, three
 *  for a behavior. `block`, `table` and `matrix` carry projection surfaces;
 *  the behavior modules' bodies are later rows. This one owns the key under
 *  `components`.
 *
 *  Each module also names its word (the chip fallback), a distinct icon glyph
 *  (the explorer and view toggle's scanning mark), and what right-click
 *  creates — a definition name, empty for a plain block, or null when the
 *  module makes nothing. The abstraction cap `N` lives on the component
 *  configuration so a diagram can choose when inference cuts higher.
 *
 *  Arrangement is an action on a layer, never a setting and never a field of
 *  this key — the module's chrome offers the verbs, and picking one writes
 *  positions down. Putting one here would bring back the mode that was retired
 *  when axis and arrangement split. */

import type { Component, Config } from "../index";
import type { Element, Graph } from "../../graph/types";
import { resolved } from "../../graph/fold";
import { DIAGRAM, type Surface } from "./diagram/surface";
import { TABLE } from "./table/surface";
import { MATRIX } from "./matrix/surface";

/** The six. Open: grow by a code change, additively, never from data. */
export const MODULES = [
  "block", "table", "matrix", "activity", "sequence", "state",
] as const;

export type ViewName = (typeof MODULES)[number];

/** Which family a module belongs to. A layer's own kind is a different,
 *  derived question (`page/kind.ts`, settled stream P) — this only says which
 *  family a registered module draws, never what a project or a layer is. */
export type ViewKind = "structure" | "behavior";

/** A control group the options rail can draw (Y.1).
 *
 *  **A module says which it offers; the page knows how to build each.** That is
 *  the split that keeps one rail rather than six — a matrix declaring no
 *  `interfaces` is why it has no interfaces toggle, instead of being handed one
 *  greyed out. **Open set**: add a key here and teach the rail to build it. */
export type ChromeGroup =
  | "flow" | "arrange" | "interfaces" | "lines" | "relations" | "types" | "columns";

/** The order every rail draws its groups in, whatever order a module lists
 *  them. **`relations` is last on purpose**: it is the only group that grows
 *  with the vocabulary, so it is the one to push off the bottom of a column
 *  that scrolls rather than the one to squeeze. `project` and `views` are the
 *  page's own and lead, since what you are looking at comes before how. */
export const CHROME_ORDER = [
  "project", "views", "arrange", "flow", "interfaces", "lines", "columns", "types", "relations",
] as const;

/** One registered view module. A name, its kind, its word, its icon, and what
 *  a create gesture makes; the projection surface lands with the module itself
 *  — `block` carries today's, the rest fill in as their rows land. */
export type ViewModule = {
  name: ViewName;
  kind: ViewKind;
  /** What it calls its elementary block — the chip fallback. Derived, never
   *  stored on an element. */
  word: string;
  /** One glyph that means this module and no other — U.8's mark, and what a
   *  shrunken explorer reads by. Not a definition icon. */
  icon: string;
  /** Definition name right-click creates. Empty is a plain untyped block;
   *  `null` means this module creates nothing. */
  creates: string | null;
  /** What it takes to show a layer at all. Absent on a stub. */
  surface?: Surface;
  /** Which control groups it offers the rail. Absent is none — a stub view
   *  still gets the page's own `views` and `project` groups. */
  chrome?: readonly ChromeGroup[];
  /** What the `types` group lists, for a module that offers one. The rail can
   *  build every other group from the page's own state, but not this: a table
   *  filters by the definition names on its rows and a matrix by the
   *  relationship marks in its cells, which are two vocabularies and only the
   *  module knows either. The icon is the group's, since those two read
   *  differently. */
  types?: {
    icon: string;
    of: (graph: Graph, layer: string | null) => string[];
  };
};

export type ViewConfig = {
  /** Which of the six draws usages of this definition. */
  module: ViewName;
  /** Beyond this many actions, inference cuts higher in the tree. */
  N: number;
};

/** Today's canvas, and the answer for every definition that says nothing. */
export const BLOCK: ViewConfig = { module: "block", N: 5 };

const held = new Map<ViewName, ViewModule>();

/** Register view modules. Later ones of the same name win, so a build can
 *  replace a stub without a second list to keep in step. */
export function register(...modules: ViewModule[]): void {
  for (const module of modules) held.set(module.name, module);
}

/** Everything this build knows how to project a layer through. */
export function views(): ViewModule[] {
  return [...held.values()];
}

/** The registered module of this name, or null. */
export function named(name: string): ViewModule | null {
  return held.get(name as ViewName) ?? null;
}

/** Which kind a module belongs to — read from the registry, never a second list. */
export function kindOf(name: ViewName): ViewKind {
  return held.get(name)!.kind;
}

/** The word a fresh block of this kind gets when nothing more specific is
 *  asked — the first registered module's own `creates`, since a kind may
 *  register more than one (P's two create buttons read this rather than
 *  naming a type of their own). Empty is what `creates` already means for a
 *  module that makes a plain untyped block. */
export function createsFor(kind: ViewKind): string {
  return views().find((m) => m.kind === kind)?.creates ?? "";
}

// The set. Structure modules carry surfaces; behavior ones are stubs until
// their rows land (A.7–A.9). Word, icon and creates are the module's answers
// for a chip, a scanning mark and a create gesture — table is a row, matrix
// makes nothing. Icons are pairwise distinct on purpose.
register(
  {
    name: "block", kind: "structure", word: "block", icon: "view_block", creates: "",
    surface: DIAGRAM,
    // The diagram is the only view with a frame and seats, so it is the only
    // one that offers interfaces.
    chrome: ["interfaces", "lines", "relations", "flow", "arrange"],
  },
  { name: "table", kind: "structure", word: "row", icon: "view_table", creates: "", surface: TABLE },
  { name: "matrix", kind: "structure", word: "block", icon: "view_matrix", creates: null, surface: MATRIX },
  { name: "activity", kind: "behavior", word: "activity", icon: "view_activity", creates: "action" },
  { name: "sequence", kind: "behavior", word: "action", icon: "view_sequence", creates: "action" },
  { name: "state", kind: "behavior", word: "state", icon: "view_state", creates: "state" },
);

/** Why this configuration would not work, in words, or null.
 *
 *  An unknown key is refused rather than ignored. A component owning its key
 *  owns the whole of it — a misspelt `modle`, or a leftover `arrangement`, is
 *  a mistake this build can see. */
function check(config: Config): string | null {
  if (config.module !== undefined) {
    if (typeof config.module !== "string" || !held.has(config.module as ViewName)) {
      return `\`view.module\` has to be one of ${MODULES.join(", ")}`;
    }
  }

  if (config.N !== undefined) {
    if (typeof config.N !== "number" || !Number.isInteger(config.N) || config.N < 1) {
      return "`view.N` has to be a positive integer";
    }
  }

  const stray = Object.keys(config).filter((key) => !(key in BLOCK));

  return stray.length ? `\`view\` knows nothing about \`${stray[0]}\`` : null;
}

export const view: Component = { name: "view", check };

/** Which view module draws this element: its definition's answer over block.
 *
 *  Per definition and never per element. Reads the resolved view, so a subtype
 *  inherits a view key it does not mention and replaces one it does — never a
 *  deep merge inside the key. */
export function viewOf(graph: Graph, element: Element): ViewConfig {
  const config = resolved(graph, element.type)?.components?.view;

  return config ? { ...BLOCK, ...config } as ViewConfig : BLOCK;
}
