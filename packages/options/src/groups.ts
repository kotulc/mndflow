import { ARRANGEMENTS, type Act, type Arrangement, type Dir } from "@mnd/core";
import type { IconName } from "@mnd/theme";

/** One control. `on` lights it; a verb leaves it undefined, since there is no state a verb puts
 *  anything in. */
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
  /** Which context the tray holds that is not the canvas's, if any. */
  held?: "workspace" | "block" | "relation" | null;
  /** What a right drag draws: which module, which way it points, and which definition it names. */
  module?: string;
  dir?: Dir;
  type?: string;
  /** The shortlist, not the vocabulary. */
  relations?: readonly { id: string; name: string; module: string }[];
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
        { key: "frame", word: "frame",
          tip: chrome.frame === false ? "Draw the open layer's border and name"
                                      : "Stop drawing the open layer's border and name",
          icon: chrome.frame === false ? "frame_off" : "frame_on",
          on: chrome.frame !== false,
          run: () => act("frame", { show: chrome.frame === false }) },
        { key: "guides", word: "guides",
          tip: chrome.lattice ? "Stop ruling the canvas into cells"
                              : "Rule the canvas into cells, faintly, behind everything",
          icon: chrome.lattice ? "guides_on" : "guides_off",
          on: !!chrome.lattice,
          run: () => act("lattice", { show: !chrome.lattice }) },
        /** `ports`, short enough for the column. */
        { key: "ports", word: "ports", tip: "Draw interfaces on their walls",
          icon: chrome.interfaces === false ? "ports_off" : "ports_on",
          on: chrome.interfaces !== false,
          run: () => act("interfaces", { show: chrome.interfaces === false }) },
      ],
    });
  }

  /** What a right drag makes. */
  if (has("relations")) {
    const named = chrome.type ?? "";
    out.push({
      key: "relations", label: "relations",
      controls: [
        ...LINES.map((l): Control => ({
          key: `line:${l.key}`, icon: l.icon, word: l.word, tip: l.tip,
          /** A definition named wins the light. */
          on: !named && (chrome.module ?? "line") === l.module
              && (chrome.dir ?? "none") === (l.dir ?? "none"),
          run: () => act("relate_with", { module: l.module, dir: l.dir ?? "none" }),
        })),
        /** Pinned relation definitions, ruled off from the lines above. */
        ...(chrome.relations ?? []).map((d, n): Control => ({
          key: `type:${d.id}`, word: d.name,
          icon: "relation_plain",
          tip: `A right drag draws a ${d.name}`,
          on: named === d.id,
          ruled: n === 0,
          run: () => act("relate_with", { module: d.module, type: d.id }),
        })),
      ],
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
