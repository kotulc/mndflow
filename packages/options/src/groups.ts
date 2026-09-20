import { ARRANGEMENTS, type Act, type Arrangement, type Dir } from "@mnd/core";
import type { IconName } from "@mnd/theme";

/** One control. **One icon, lit or not** — a setting draws the same mark whichever way it is
 *  set, and `on` is what says which. A verb leaves `on` undefined, since there is no state a
 *  verb puts anything in. */
export type Control = {
  key: string;
  icon: IconName;
  word: string;
  tip: string;
  on?: boolean;
  /** One-shot: it does something and is done. */
  verb?: boolean;
  /** A rule above this control, where a group's seam is not setting against verb. */
  ruled?: boolean;
  run: () => void;
};

export type Group = {
  key: string;
  label: string;
  controls: Control[];
};

/** What the shell knows about the thing on the stage. */
export type Chrome = {
  /** Which groups the projection offers. */
  slots: readonly string[];
  arrangement?: Arrangement;
  /** Whether the backdrop draws the lattice everything lands on. */
  lattice?: boolean;
  interfaces?: boolean;
  /** Whether the open layer's frame is drawn. */
  frame?: boolean;
  /** Whether this layer shows the key to what it draws, however it came to — its own answer, or
   *  the workspace's where it has none. */
  legend?: boolean;
  /** Which context the tray holds that is not the canvas's, if any. */
  held?: "workspace" | "block" | "relation" | null;
  /** What a right drag draws: which module, and which way it points. */
  module?: string;
  dir?: Dir;
};

/** How a layer places what it holds. */
const LAYOUT: Record<Arrangement, { icon: IconName; tip: string }> = {
  free: { icon: "layout_free", tip: "Hand placement is what draws" },
  grid: { icon: "layout_grid", tip: "Auto-layout: related blocks share a row, a unit of air between everything" },
};

/** What a right drag may draw: a line, straight or directed. */
const LINES: { key: string; module: string; dir?: Dir;
               icon: IconName; word: string; tip: string }[] = [
  { key: "plain", module: "line", icon: "relation_plain", word: "straight",
    tip: "A right drag makes a plain line" },
  { key: "directed", module: "line", dir: "forward", icon: "relation_directed",
    word: "directed", tip: "A right drag makes a line that points" },
];

/** The standard groups, from the slots a projection declared. */
export function groups_of(chrome: Chrome, act: Act): Group[] {
  const has = (slot: string) => chrome.slots.includes(slot);
  const out: Group[] = [];

  /** How the layer places what it holds. */
  if (has("layer")) {
    out.push({
      key: "layer", label: "layer",
      controls: ARRANGEMENTS.map((how): Control => ({
        key: how, icon: LAYOUT[how].icon, word: how, tip: LAYOUT[how].tip,
        on: (chrome.arrangement ?? "free") === how,
        run: () => act("arrange", { arrangement: how }),
      })),
    });
  }

  /** What the drawing shows, rather than what it holds. */
  if (has("display")) {
    out.push({
      key: "display", label: "display",
      controls: [
        { key: "frame", word: "frame", icon: "frame",
          tip: chrome.frame === false ? "Draw the open layer's border and name"
                                      : "Stop drawing the open layer's border and name",
          on: chrome.frame !== false,
          run: () => act("frame", { show: chrome.frame === false }) },
        { key: "guides", word: "guides", icon: "guides",
          tip: chrome.lattice ? "Stop ruling the canvas into cells"
                              : "Rule the canvas into cells, faintly, behind everything",
          on: !!chrome.lattice,
          run: () => act("lattice", { show: !chrome.lattice }) },
        /** `ports`, short enough for the column. */
        { key: "ports", word: "ports", icon: "ports",
          tip: "Draw interfaces on their walls",
          on: chrome.interfaces !== false,
          run: () => act("interfaces", { show: chrome.interfaces === false }) },
        /** This layer's own answer. **It overrides the workspace's rather than yielding to it**,
         *  which is what makes the workspace tab a default and not a lock. */
        { key: "legend", word: "legend", icon: "legend",
          tip: chrome.legend ? "Stop showing this layer's key"
                             : "Show what this layer draws and what it means",
          on: !!chrome.legend,
          run: () => act("legend", { show: !chrome.legend }) },
      ],
    });
  }

  /** What a right drag makes. **The shipped runs, and no vocabulary**: a pinned definition reads
   *  in the explorer's `pinned` folder, which is one place for both groups rather than two. */
  if (has("relations")) {
    out.push({
      key: "relations", label: "relations",
      controls: LINES.map((l): Control => ({
        key: `line:${l.key}`, icon: l.icon, word: l.word, tip: l.tip,
        on: (chrome.module ?? "line") === l.module && (chrome.dir ?? "none") === (l.dir ?? "none"),
        run: () => act("relate_with", { module: l.module, dir: l.dir ?? "none" }),
      })),
    });
  }

  /** What the tray holds that the canvas does not. */
  const toggle = (key: "workspace" | "block" | "relation") => () =>
    act("about", { scope: chrome.held === key ? "canvas" : key });
  out.push({
    key: "elements", label: "elements",
    controls: [
      { key: "workspace", icon: "settings", word: "workspace", on: chrome.held === "workspace",
        tip: "This project: what it is called, what it draws on, and everything it holds",
        run: toggle("workspace") },
      { key: "block", icon: "role_leaf", word: "block", on: chrome.held === "block",
        tip: "A new block definition, written before anything names it",
        run: toggle("block") },
      { key: "relation", icon: "relation_typed", word: "relation", on: chrome.held === "relation",
        tip: "A new relation definition, and the templates and stereotypes in use",
        run: toggle("relation") },
    ],
  });

  return out;
}
