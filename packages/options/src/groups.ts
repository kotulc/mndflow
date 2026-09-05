import { ARRANGEMENTS, type Act, type Arrangement, type RelationModule } from "@mnd/core";
import type { IconName } from "@mnd/theme";

/** One control. `on` lights it; **a verb leaves it undefined**, since there is
 *  no state a verb puts anything in. */
export type Control = {
  key: string;
  icon: IconName;
  word: string;
  tip: string;
  on?: boolean;
  /** One-shot: it does something and is done. Ruled off from the settings
   *  above it, and it draws no `on` at all. */
  verb?: boolean;
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
  /** **A group and a grid write their name on the frame** when told to; cards
   *  are their name. */
  element?: {
    id: string;
    labelled: boolean;
    locked: boolean;
    framed?: boolean;
    grid?: boolean;
  };
  arrangement?: Arrangement;
  /** Whether the backdrop draws the lattice everything lands on. */
  lattice?: boolean;
  interfaces?: boolean;
  /** Which way a right drag draws a line. */
  module?: RelationModule;
};

/** How a layer places what it holds. */
const LAYOUT: Record<Arrangement, { icon: IconName; tip: string }> = {
  free: { icon: "layout_free", tip: "Hand placement is what draws" },
  grid: { icon: "layout_grid", tip: "Slot every block into the layer's lattice" },
};

/** The ways a line is drawn, as the ones a right drag may pick. **Three of the
 *  four** — a reference line is assigned from what sits at its ends and is
 *  nobody's to choose. */
const LINES: { module: RelationModule; icon: IconName; word: string; tip: string }[] = [
  { module: "line", icon: "relation_plain", word: "straight",
    tip: "A right drag makes a plain line" },
  { module: "directed", icon: "relation_directed", word: "directed",
    tip: "A right drag makes a line that points" },
  { module: "tie", icon: "relation_tie", word: "tie",
    tip: "A right drag makes an association" },
];

/** The standard groups, from the slots a projection declared.
 *
 *  **`types` is the one group the page cannot build alone**, so a module
 *  declaring it also answers it — the names arrive on `Chrome`. */
export function groups_of(chrome: Chrome, act: Act): Group[] {
  const has = (slot: string) => chrome.slots.includes(slot);
  const out: Group[] = [];

  /** **How the layer places what it holds.** `free` and `grid` are a setting
   *  the layer is always in one of. */
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

  /** **What the drawing shows, rather than what it holds.** Nothing here writes
   *  to the log — guides, ports shown or hidden change the picture in front of
   *  you and nothing about the model — which is exactly what separates it from
   *  `relations` below. */
  if (has("display")) {
    out.push({
      key: "display", label: "display",
      controls: [
        { key: "guides", word: "guides",
          tip: chrome.lattice ? "Stop ruling the canvas into cells"
                              : "Rule the canvas into cells, faintly, behind everything",
          icon: chrome.lattice ? "guides_on" : "guides_off",
          on: !!chrome.lattice,
          run: () => act("lattice", { show: !chrome.lattice }) },
        /** **`ports`, not `interfaces`.** One word, and the column is 68px
         *  wide — the long one wrapped to three lines and set the height of
         *  every row beside it. */
        { key: "ports", word: "ports", tip: "Draw interfaces on their walls",
          icon: chrome.interfaces === false ? "ports_off" : "ports_on",
          on: chrome.interfaces !== false,
          run: () => act("interfaces", { show: chrome.interfaces === false }) },
      ],
    });
  }

  /** **What a right drag makes.** One question, and the answer is the model's:
   *  what a relationship *is* travels in the file, unlike everything in
   *  `display` above. */
  if (has("relations")) {
    out.push({
      key: "relations", label: "relations",
      controls: LINES.map((l): Control => ({
        key: `line:${l.module}`, icon: l.icon, word: l.word, tip: l.tip,
        on: (chrome.module ?? "line") === l.module,
        run: () => act("relate_with", { module: l.module }),
      })),
    });
  }

  /** **What the picked thing can be told, rather than what the layer can.**
   *  These sit at the foot of the rail because they come and go with the
   *  selection, and everything above them is about what you are looking at.
   *
   *  The element group is where the rest of what one thing can be told belongs
   *  as it arrives — locking where it sits, which way round it reads, and
   *  pinning its definition are all answers about one element and not about the
   *  layer around it. */
  if (chrome.element) {
    const { id, labelled, locked, framed, grid } = chrome.element;
    const named = framed || grid;
    out.push({
      key: "element", label: "element",
      controls: [
        { key: "define", icon: "define", word: "define",
          tip: "What this is: its name, type, tags, look and values",
          run: () => act("define", { id }) },
        ...(named ? [{
          key: "label", word: "label",
          tip: labelled ? "Stop writing the name on the frame"
                        : "Write the name on the frame",
          icon: (labelled ? "label_on" : "label_off") as IconName,
          on: labelled,
          run: () => act("label", { ids: [id], shown: labelled ? "no" : "yes" }),
        }] : []),
        { key: "lock", word: "lock",
          tip: locked ? "Let the app work its place out again" : "Fix it where it is",
          icon: locked ? "locked" : "unlocked", on: locked,
          run: () => act("lock", { ids: [id], fixed: locked ? "no" : "yes" }) },
      ],
    });
  }

  /** **What is done to the project itself.** The verbs below are one-shots. */
  out.push({
    key: "project", label: "project",
    controls: [
      /** **The way in to everything the project can be told**, the way `define`
       *  is for one element. Nothing behind it yet. */
      { key: "settings", icon: "settings", word: "settings", verb: true,
        tip: "How this project is set up",
        run: () => act("settings") },
      { key: "export", icon: "export_project", word: "export", verb: true,
        tip: "Export this subtree with what it depends on",
        run: () => act("export") },
    ],
  });

  return out;
}
