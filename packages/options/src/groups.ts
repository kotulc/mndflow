/** What the rail is handed.
 *
 *  A control is a mark, one word and something to run — never a mutation. The
 *  builder below turns the slots a projection declared into the standard
 *  groups, so the shell knows how to draw each and no module has to. */

import { ARRANGEMENTS, type Act, type Arrangement } from "@mnd/core";
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

/** One view the shell can put on the stage. */
export type View = { id: string; name: string };

/** What the shell knows about the thing on the stage. */
export type Chrome = {
  /** Which groups the projection offers. */
  slots: readonly string[];
  /** The views in scope, and the one showing. **Not a slot** — which view is
   *  on is a question about the shell rather than about the projection, so it
   *  is offered wherever there is more than one to pick from. */
  views?: readonly View[];
  showing?: string;
  arrangement?: Arrangement;
  interfaces?: boolean;
  angles?: boolean;
  /** Relation types in scope, and which one a right drag would make. */
  types?: readonly string[];
  picked?: string | null;
  /** Column names a table offers, and which one it is sorted by. */
  columns?: readonly string[];
  sorted?: string | null;
};

/** The mark each view wears. A view a build does not know draws as a plain
 *  block, which is the module every unnamed reading falls back to anyway. */
const VIEW: Record<string, IconName> = {
  block: "view_block", table: "view_table", matrix: "view_matrix",
  activity: "view_activity", sequence: "view_sequence", state: "view_state",
};

const ARRANGE: Record<Arrangement, { icon: IconName; tip: string }> = {
  free: { icon: "arrange_free", tip: "Hand placement is what draws" },
  grid: { icon: "arrange_grid", tip: "Tile outward from the middle" },
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

  /** **Which view is showing sits with everything else you can change about
   *  what you are looking at**, not in the header beside undo and export. One
   *  view on its own is not a choice, so it is not offered. */
  if ((chrome.views ?? []).length > 1) {
    out.push({
      key: "views", label: "views",
      controls: (chrome.views ?? []).map((v) => ({
        key: v.id, icon: VIEW[v.name] ?? "view_block", word: v.name,
        tip: `Read this layer as ${v.name}`,
        on: chrome.showing === v.id,
        run: () => act("view", { id: v.id }),
      })),
    });
  }

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

  if (has("columns")) {
    out.push({
      key: "columns", label: "columns",
      controls: (chrome.columns ?? []).map((name) => ({
        key: name, icon: "column", word: name, tip: `Sort by ${name}`,
        on: chrome.sorted === name,
        run: () => act("sort", { column: name }),
      })),
    });
  }

  if (has("types")) {
    out.push({
      key: "types", label: "types",
      controls: (chrome.types ?? []).map((name) => ({
        key: name, icon: "type_tag", word: name, tip: `Show only “${name}”`,
        on: chrome.picked === name,
        run: () => act("filter", { type: chrome.picked === name ? null : name }),
      })),
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
