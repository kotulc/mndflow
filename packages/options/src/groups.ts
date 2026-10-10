import { is_layer_view, LAYOUTS, type Act, type Dir, type Layout, type ViewKind } from "@mnd/core";
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
  /** The views the canvas offers — its section's whole views, then the block's own — and the one
   *  it shows. */
  views?: readonly ViewKind[];
  view?: ViewKind;
  layout?: Layout;
  /** Whether the backdrop draws the lattice everything lands on. */
  lattice?: boolean;
  interfaces?: boolean;
  /** Whether the open layer's frame is drawn. */
  frame?: boolean;
  /** Whether this layer shows the key to what it draws, however it came to — its own answer, or
   *  the workspace's where it has none. */
  legend?: boolean;
  /** What a right drag draws: which module, and which way it points. */
  module?: string;
  dir?: Dir;
};

/** How a person lays a layer out from the rail. `page` is a definition's or a host's to set — the
 *  overhead view reads as a page — so it is not offered here. */
const LAYOUT: Partial<Record<Layout, { icon: IconName; tip: string }>> = {
  free: { icon: "layout_free", tip: "Hand placement is what draws" },
  auto: { icon: "layout_grid", tip: "Auto-layout: everything in reading order on a grid; lines never move it" },
};

/** How the canvas may look: at its whole section, or at one block. */
const VIEWS: Record<ViewKind, { icon: IconName; word: string; tip: string }> = {
  overhead: { icon: "view_overhead", word: "overhead",
              tip: "Overhead: the whole system from above, as nested boxes" },
  profile: { icon: "view_profile", word: "profile",
             tip: "Profile: the whole section stepped down the page, along the pick" },
  internal: { icon: "view_internal", word: "internal",
              tip: "Internal: the block from inside, what it holds" },
  grid: { icon: "view_grid", word: "grid",
          tip: "Grid: the opened grid's cells and what sits in them" },
  folder: { icon: "view_folder", word: "folder",
            tip: "Folder: what the package or folder holds, read down the page" },
  definition: { icon: "word_def", word: "definition",
                tip: "Definition: the definition, what it extends, its ports, tags and traits round it" },
};

/** What a right drag may draw: a line, straight or directed, or a tie. */
const LINES: { key: string; module: string; dir?: Dir;
               icon: IconName; word: string; tip: string }[] = [
  { key: "plain", module: "line", icon: "relation_plain", word: "straight",
    tip: "A right drag makes a plain line" },
  { key: "directed", module: "line", dir: "forward", icon: "relation_directed",
    word: "directed", tip: "A right drag makes a line that points" },
  { key: "tie", module: "tie", icon: "relation_tie", word: "tie",
    tip: "A right drag makes a tie: a dashed run with no heads" },
];

/** The standard groups, from the slots a projection declared. */
export function groups_of(chrome: Chrome, act: Act): Group[] {
  const has = (slot: string) => chrome.slots.includes(slot);
  const out: Group[] = [];

  /** How the canvas looks at its section: a choice only where it offers more than one. */
  if ((chrome.views?.length ?? 0) > 1) {
    out.push({
      key: "view", label: "view",
      controls: chrome.views!.map((kind, i): Control => ({
        key: kind, icon: VIEWS[kind].icon, word: VIEWS[kind].word, tip: VIEWS[kind].tip,
        on: chrome.view === kind,
        /** A rule between the section's views and the block's. */
        ...(i > 0 && is_layer_view(kind) && !is_layer_view(chrome.views![i - 1]!)
          ? { ruled: true } : {}),
        run: () => act("view", { kind }),
      })),
    });
  }

  /** How the layer places what it holds. */
  if (has("layer")) {
    out.push({
      key: "layer", label: "layer",
      controls: [
        ...LAYOUTS.filter((how) => LAYOUT[how]).map((how): Control => ({
          key: how, icon: LAYOUT[how]!.icon, word: how, tip: LAYOUT[how]!.tip,
          on: (chrome.layout ?? "free") === how,
          run: () => act("layout", { kind: how }),
        })),
        /** Auto reads in order; this reorders once, so related blocks read side by side. */
        ...(chrome.layout === "auto" ? [{
          key: "arrange", icon: "align" as const, word: "arrange", verb: true, ruled: true,
          tip: "Order what the layer holds so related blocks read side by side",
          run: () => act("arrange", {}),
        }] : []),
      ],
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

  /** What a right drag makes: the shipped runs, and no vocabulary. */
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

  return out;
}
