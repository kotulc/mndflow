import { ARRANGEMENTS, type Act, type Arrangement, type Dir,
         type RelationModule } from "@mnd/core";
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
  /** The one element that is picked. */
  element?: { id: string };
  arrangement?: Arrangement;
  /** Whether the backdrop draws the lattice everything lands on. */
  lattice?: boolean;
  interfaces?: boolean;
  /** What a right drag draws: which module, which way it points, and which
   *  definition it names. */
  module?: RelationModule;
  dir?: Dir;
  type?: string;
  /** **The pinned lines, which is where a relation vocabulary lives.** A
   *  relationship is drawn between two ends and never dropped, so there is
   *  nothing to drag a relation row onto — the tree keeps blocks and the rail
   *  keeps these. Each says which module it refines, so it draws the mark that
   *  module draws. */
  relations?: readonly { id: string; name: string; module: RelationModule }[];
};

/** How a layer places what it holds. */
const LAYOUT: Record<Arrangement, { icon: IconName; tip: string }> = {
  free: { icon: "layout_free", tip: "Hand placement is what draws" },
  grid: { icon: "layout_grid", tip: "Auto-layout: related blocks share a row, a unit of air between everything" },
};

/** What a right drag may draw. **A module and a direction**, because *straight*
 *  and *directed* were never two sorts of run — they are one run with and
 *  without a `dir`, and a `directed` module saying so again is the same fact
 *  filed twice. A reference line is assigned from what sits at its ends and is
 *  nobody's to choose. */
const LINES: { key: string; module: RelationModule; dir?: Dir;
               icon: IconName; word: string; tip: string }[] = [
  { key: "plain", module: "line", icon: "relation_plain", word: "straight",
    tip: "A right drag makes a plain line" },
  { key: "directed", module: "line", dir: "forward", icon: "relation_directed",
    word: "directed", tip: "A right drag makes a line that points" },
  { key: "tie", module: "tie", icon: "relation_tie", word: "tie",
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
    const named = chrome.type ?? "";
    out.push({
      key: "relations", label: "relations",
      controls: [
        ...LINES.map((l): Control => ({
          key: `line:${l.key}`, icon: l.icon, word: l.word, tip: l.tip,
          /** **A definition named wins the light.** Picking a pinned line is
           *  picking its module too, so lighting both would say the rail is in
           *  two states at once. */
          on: !named && (chrome.module ?? "line") === l.module
              && (chrome.dir ?? "none") === (l.dir ?? "none"),
          run: () => act("relate_with", { module: l.module, dir: l.dir ?? "none" }),
        })),
        /** **What somebody pinned**, drawn with its own module's mark. */
        ...(chrome.relations ?? []).map((d): Control => ({
          key: `type:${d.id}`, word: d.name,
          icon: LINES.find((l) => l.module === d.module)?.icon ?? "relation_plain",
          tip: `A right drag draws a ${d.name}`,
          on: named === d.id,
          run: () => act("relate_with", { module: d.module, type: d.id }),
        })),
      ],
    });
  }

  /** **What the picked thing can be told, rather than what the layer can.**
   *  These sit at the foot of the rail because they come and go with the
   *  selection, and everything above them is about what you are looking at.
   *
   *  The element group is where the rest of what one thing can be told belongs
   *  as it arrives — every answer about one element rather than about the layer
   *  around it. */
  if (chrome.element) {
    const { id } = chrome.element;
    out.push({
      key: "element", label: "element",
      controls: [
        { key: "define", icon: "define", word: "define",
          tip: "What this is: its name, type, tags, look and values",
          run: () => act("define", { id }) },
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
