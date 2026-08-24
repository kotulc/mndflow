/** What the rail is handed.
 *
 *  A control is a glyph, one word and something to run — never a mutation. The
 *  builder below turns the slots a projection declared into the standard
 *  groups, so the shell knows how to draw each and no module has to. */

import { ARRANGEMENTS, type Act, type Arrangement } from "@mnd/core";

/** One control. `on` lights it; **a verb leaves it undefined**, since there is
 *  no arrangement a layer is currently *in*. */
export type Control = {
  key: string;
  glyph: string;
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

const ARRANGE: Record<Arrangement, { glyph: string; tip: string }> = {
  free: { glyph: "⬚", tip: "Hand placement is what draws" },
  grid: { glyph: "▦", tip: "Tile outward from the middle" },
  right: { glyph: "→", tip: "Rank by relationships, reading right" },
  left: { glyph: "←", tip: "Rank by relationships, reading left" },
  down: { glyph: "↓", tip: "Rank by relationships, reading down" },
  up: { glyph: "↑", tip: "Rank by relationships, reading up" },
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
        key: how, glyph: ARRANGE[how].glyph, word: how, tip: ARRANGE[how].tip,
        on: chrome.arrangement === how,
        run: () => act("arrange", { arrangement: how }),
      })),
    });
  }

  if (has("interfaces")) {
    out.push({
      key: "interfaces", label: "interfaces",
      controls: [{
        key: "show", glyph: "▫", word: "show", tip: "Draw interfaces on their walls",
        on: chrome.interfaces !== false,
        run: () => act("interfaces", { show: chrome.interfaces === false }),
      }],
    });
  }

  if (has("lines")) {
    out.push({
      key: "lines", label: "lines",
      controls: [
        { key: "angles", glyph: "⌐", word: "angles", tip: "Right angles",
          on: chrome.angles !== false, run: () => act("lines", { angles: true }) },
        { key: "curves", glyph: "⌒", word: "curves", tip: "Curves",
          on: chrome.angles === false, run: () => act("lines", { angles: false }) },
      ],
    });
  }

  if (has("columns")) {
    out.push({
      key: "columns", label: "columns",
      controls: (chrome.columns ?? []).map((name) => ({
        key: name, glyph: "▤", word: name, tip: `Sort by ${name}`,
        on: chrome.sorted === name,
        run: () => act("sort", { column: name }),
      })),
    });
  }

  if (has("types")) {
    out.push({
      key: "types", label: "types",
      controls: (chrome.types ?? []).map((name) => ({
        key: name, glyph: "◇", word: name, tip: `Show only “${name}”`,
        on: chrome.picked === name,
        run: () => act("filter", { type: chrome.picked === name ? null : name }),
      })),
    });
  }

  if (has("relations")) {
    out.push({
      key: "relations", label: "relations",
      controls: [
        { key: "line", glyph: "─", word: "plain", tip: "A right drag makes a plain line",
          on: !chrome.picked, run: () => act("relate_with", { type: null }) },
        ...(chrome.types ?? []).map((name) => ({
          key: `rel:${name}`, glyph: "→", word: name,
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
    controls: [{ key: "export", glyph: "⤒", word: "export",
                 tip: "Export this subtree with what it depends on",
                 run: () => act("export") }],
  });

  return out;
}
