/** What the rail is handed.
 *
 *  A control is a mark, one word and something to run — never a mutation. The
 *  builder below turns the slots a projection declared into the standard
 *  groups, so the shell knows how to draw each and no module has to. */

import { ARRANGEMENTS, type Act, type Arrangement, type Headers } from "@mnd/core";
import type { IconName } from "@mnd/theme";

/** One control. `on` lights it; **a verb leaves it undefined**, since there is
 *  no arrangement a layer is currently *in*. */
export type Control = {
  key: string;
  icon: IconName;
  word: string;
  tip: string;
  on?: boolean;
  run: () => void;
};

export type Group = {
  key: string;
  label: string;
  /** Verbs are one-shot and ruled off from the settings. */
  verbs?: boolean;
  controls: Control[];
};

/** What the shell knows about the thing on the stage. */
export type Chrome = {
  /** Which groups the projection offers. */
  slots: readonly string[];
  /** The grid that is picked, where one is. **Not a slot** — a slot is what
   *  the projection can offer about the whole layer, and this is about the one
   *  thing you have hold of. */
  grid?: { id: string; headers: Headers };
  arrangement?: Arrangement;
  interfaces?: boolean;
  angles?: boolean;
  /** Relation types in scope, and which one a right drag would make. */
  types?: readonly string[];
  picked?: string | null;
};

const ARRANGE: Record<Arrangement, { icon: IconName; tip: string }> = {
  free: { icon: "arrange_free", tip: "Hand placement is what draws" },
  right: { icon: "arrange_right", tip: "Rank by relationships, reading right" },
  left: { icon: "arrange_left", tip: "Rank by relationships, reading left" },
  down: { icon: "arrange_down", tip: "Rank by relationships, reading down" },
  up: { icon: "arrange_up", tip: "Rank by relationships, reading up" },
};

/** The standard groups, from the slots a projection declared.
 *
 *  **`types` is the one group the page cannot build alone**, so a module
 *  declaring it also answers it — the names arrive on `Chrome`. */
export function groups_of(chrome: Chrome, act: Act): Group[] {
  const has = (slot: string) => chrome.slots.includes(slot);
  const out: Group[] = [];

  if (has("arrange")) {
    out.push({
      key: "arrange", label: "arrange",
      controls: ARRANGEMENTS.map((how) => ({
        key: how, icon: ARRANGE[how].icon, word: how, tip: ARRANGE[how].tip,
        on: chrome.arrangement === how,
        run: () => act("arrange", { arrangement: how }),
      })),
    });
  }

  if (has("interfaces")) {
    out.push({
      key: "interfaces", label: "interfaces",
      controls: [{
        key: "show", word: "show", tip: "Draw interfaces on their walls",
        icon: chrome.interfaces === false ? "ports_off" : "ports_on",
        on: chrome.interfaces !== false,
        run: () => act("interfaces", { show: chrome.interfaces === false }),
      }],
    });
  }

  if (has("lines")) {
    out.push({
      key: "lines", label: "lines",
      controls: [
        { key: "angles", icon: "angles", word: "angles", tip: "Right angles",
          on: chrome.angles !== false, run: () => act("lines", { angles: true }) },
        { key: "curves", icon: "smooth", word: "curves", tip: "Curves",
          on: chrome.angles === false, run: () => act("lines", { angles: false }) },
      ],
    });
  }

  if (has("relations")) {
    out.push({
      key: "relations", label: "relations",
      controls: [
        { key: "line", icon: "relation_plain", word: "plain",
          tip: "A right drag makes a plain line",
          on: !chrome.picked, run: () => act("relate_with", { type: null }) },
        ...(chrome.types ?? []).map((name): Control => ({
          key: `rel:${name}`, icon: "relation_typed", word: name,
          tip: `A right drag makes a “${name}”`,
          on: chrome.picked === name,
          run: () => act("relate_with", { type: name }),
        })),
      ],
    });
  }

  /** **What the picked thing can be told, rather than what the layer can.**
   *  It sits at the foot of the rail because it comes and goes with the
   *  selection, and everything above it is about what you are looking at. */
  if (chrome.grid) {
    const { id, headers } = chrome.grid;
    const heads = (which: "row" | "col") => headers === which || headers === "both";
    const toggled = (which: "row" | "col"): Headers => {
      const other = which === "row" ? "col" : "row";
      if (heads(which)) return heads(other) ? other : "none";
      return heads(other) ? "both" : which;
    };
    out.push({
      key: "grid", label: "grid",
      controls: (["row", "col"] as const).map((which) => ({
        key: which, icon: which === "row" ? "header_row" : "header_col",
        word: `${which} header`,
        tip: `Read ${which === "row" ? "column 0" : "row 0"} as headers`,
        on: heads(which),
        run: () => act("group", { into: id, headers: toggled(which) }),
      })),
    });
  }

  /** A verb never lights — there is no state it puts the layer in, which in use
   *  is the plainer signal of the two. */
  out.push({
    key: "project", label: "project", verbs: true,
    controls: [{ key: "export", icon: "export_project", word: "export",
                 tip: "Export this subtree with what it depends on",
                 run: () => act("export") }],
  });

  return out;
}
