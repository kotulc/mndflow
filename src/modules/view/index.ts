/** The view component: which view module a diagram's definition names.
 *
 *  A diagram is a block whose definition points at one of the six modules.
 *  `diagram` itself names no module — it is what a layer looks like drawn.
 *  Kind is visible from the module, never stored: three for a structure, three
 *  for a behavior. `block`, `table` and `matrix` carry projection surfaces;
 *  the behavior modules' bodies are later rows. This one owns the key under
 *  `components`.
 *
 *  Each module also names its word (the chip fallback) and what right-click
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

/** What the project holds, visible from the module rather than declared. */
export type ViewKind = "structure" | "behavior";

/** One registered view module. A name, its kind, its word, and what a create
 *  gesture makes; the projection surface lands with the module itself —
 *  `block` carries today's, the rest fill in as their rows land. */
export type ViewModule = {
  name: ViewName;
  kind: ViewKind;
  /** What it calls its elementary block — the chip fallback. Derived, never
   *  stored on an element. */
  word: string;
  /** Definition name right-click creates. Empty is a plain untyped block;
   *  `null` means this module creates nothing. */
  creates: string | null;
  /** What it takes to show a layer at all. Absent on a stub. */
  surface?: Surface;
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

// The set. Structure modules carry surfaces; behavior ones are stubs until
// their rows land (A.7–A.9). Word and creates are the module's answers for
// a chip and a create gesture — table is a row, matrix makes nothing.
register(
  { name: "block", kind: "structure", word: "block", creates: "", surface: DIAGRAM },
  { name: "table", kind: "structure", word: "row", creates: "", surface: TABLE },
  { name: "matrix", kind: "structure", word: "block", creates: null, surface: MATRIX },
  { name: "activity", kind: "behavior", word: "activity", creates: "action" },
  { name: "sequence", kind: "behavior", word: "action", creates: "action" },
  { name: "state", kind: "behavior", word: "state", creates: "state" },
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
