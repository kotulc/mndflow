/** The questions the settings panel asks of how something draws, as data.
 *
 *  **Every row is a table entry**, including the sliders and the mark grids:
 *  `form` says how a row is answered, so the panel draws one component per form
 *  rather than a hand-written block per part. */

import { ALIGNS, ARROWS, BORDERS, CONTRASTS, DISPLAYS, FAMILIES, FILLS, FONTS, HUE,
         INTENSITY, OPACITY, SHOWN, WEIGHTS, WIDTHS } from "@mnd/core";

/** The parts of a drawing, and the questions each part is asked. **The last two
 *  are one question twice**: which mark sits in which corner — what sort of
 *  thing it is, and whatever else its vocabulary wants to flag. */
const GROUPS = ["name", "label", "head", "colour", "fill", "border", "icon", "mark"] as const;
export type Group = (typeof GROUPS)[number];

/** The parts, in the order the rail lists them. */
export const parts_in_order = (): readonly Group[] => GROUPS;

/** What a part is called on a **run**, where the card's word is wrong for it.
 *  A run has no border; what those three keys set is its stroke. */
export const AS_RUN: Partial<Record<Group, string>> = { border: "stroke" };

/** **Which component makes each part meaningful**, which is what the rail
 *  filters on. Not where the keys are validated — `style.fill` is a `style` key
 *  and a run has nothing to fill — but what the part is a part *of*. */
export const ASKS: Record<Group, string> = {
  name: "style", label: "card", head: "line", colour: "style",
  fill: "card", border: "style", icon: "card", mark: "card",
};

export type Key = "card" | "style" | "line";

/** One question. **`form` says how it is answered**:
 *
 *  - `chips` — a word from a closed set
 *  - `words` — a list of field names, typed, because they belong to one usage
 *  - `range` — a number between two ends, with what it draws when unsaid
 *  - `marks` — every mark this build ships, as a grid
 *
 *  `omit` is what a **run** is not offered, where an answer that makes sense of
 *  a card makes none of a line. */
export type Question = {
  word: string; key: Key; name: string; tip: string;
  form: "chips" | "words" | "range" | "marks";
  of?: readonly { value: string; word: string }[];
  omit?: readonly string[];
  range?: { min: number; max: number; step: number; fallback: string };
};

const plain = (of: readonly string[]) => of.map((v) => ({ value: v, word: v }));

/** The two questions every identity line is asked, under whichever component
 *  owns it. **One table, two holders** — a card asks them of `card` and a run
 *  of `line`, and the filter by what a module honours picks. */
const IDENTITY = (key: Key): Question[] => [
  { word: "shown", key, name: "name", form: "chips",
    tip: "Whether the identity line is drawn at all — the name, or the kind and "
       + "handle that stand in where nobody has named it. Hiding it never makes "
       + "this harder to find: the tree and the tray read the name regardless.",
    of: plain(SHOWN) },
  { word: "handle", key, name: "alias", form: "chips",
    tip: "Whether the handle joins a name somebody did set. What stands in for a "
       + "name always carries one, which is the whole reason it has one.",
    of: plain(SHOWN) },
];

export const ROWS: Record<Group, Question[]> = {
  name: [
    { word: "font", key: "style", name: "name_font", form: "chips",
      tip: "How the name is faced. One at a time — italic and struck through at "
         + "once is not sayable, and nothing has wanted it.", of: plain(FONTS) },
    { word: "weight", key: "style", name: "name_weight", form: "chips",
      tip: "How heavily the name is set.", of: plain(WEIGHTS) },
    { word: "contrast", key: "style", name: "name_contrast", form: "chips",
      tip: "How far the name stands out from the card behind it.",
      of: plain(CONTRASTS) },
    { word: "align", key: "card", name: "align", form: "chips",
      tip: "Which end of the card its writing reads from.", of: plain(ALIGNS) },
    ...IDENTITY("card"),
    ...IDENTITY("line"),
    /** **Which values the card writes under its name.** A card's question only:
     *  a run holds no values, so the filter drops it there. */
    { word: "shows", key: "card", name: "shows", form: "words",
      tip: "Which of this usage's fields the card writes under its name, in the "
         + "order it writes them. Names, separated by commas." },
  ],
  label: [
    { word: "font", key: "style", name: "label_font", form: "chips",
      tip: "How the label is faced.", of: plain(FONTS) },
    { word: "weight", key: "style", name: "label_weight", form: "chips",
      tip: "How heavily the label is set.", of: plain(WEIGHTS) },
    { word: "contrast", key: "style", name: "label_contrast", form: "chips",
      tip: "How far the label stands out from the card behind it.",
      of: plain(CONTRASTS) },
    { word: "display", key: "card", name: "label", form: "chips",
      tip: "Where the label sits: over the card, in it, under it, or nowhere. "
         + "The label is the subtype where one is named, the base kind otherwise.",
      of: plain(DISPLAYS) },
  ],
  /** **What draws where a run ends**, which is what a run has in place of a face. */
  head: [
    { word: "from head", key: "line", name: "from_arrow", form: "chips",
      tip: "What draws where the run leaves. A shape, never a direction — which "
         + "ends point is the menu's, and an end that points draws a filled head "
         + "unless told another.", of: plain(ARROWS) },
    { word: "to head", key: "line", name: "to_arrow", form: "chips",
      tip: "What draws where the run arrives.", of: plain(ARROWS) },
  ],
  border: [
    { word: "width", key: "style", name: "border_width", form: "chips",
      tip: "How heavy the border is. Three steps, named on the ramp.",
      of: plain(WIDTHS) },
    { word: "contrast", key: "style", name: "border_contrast", form: "chips",
      tip: "How far the border stands out from the card behind it.",
      of: plain(CONTRASTS) },
    /** **`none` is a card's answer and not a run's.** On a run it would delete
     *  the run, which is what deleting the run is for. */
    { word: "style", key: "style", name: "border_style", form: "chips",
      tip: "How the border is drawn. `none` keeps the card's box and drops "
         + "only the line.", of: plain(BORDERS), omit: ["none"] },
  ],
  /** **How loudly it is taken**, which every module honours. A hue is the family
   *  question asked finer; the theme still owns every lightness. */
  colour: [
    { word: "family", key: "style", name: "family", form: "chips",
      tip: "Which family the theme paints this with. A family is a preset over "
         + "hue and intensity, and the theme is what picks it — so retro paints "
         + "primary green where modern paints it teal.",
      of: plain(FAMILIES) },
    { word: "hue", key: "style", name: "hue", form: "range",
      tip: "The angle this paints itself at. Set, it takes precedence over the family.",
      range: { ...HUE, step: 1, fallback: "200" } },
    { word: "intensity", key: "style", name: "intensity", form: "range",
      tip: "How far the hue is taken, as a fraction of the theme's own ceiling.",
      range: { ...INTENSITY, step: 0.05, fallback: "0.65" } },
    /** **Transparency is a quantity**, so it is a slider rather than named steps. */
    { word: "opacity", key: "style", name: "opacity", form: "range",
      tip: "How opaque the fill is. The fill alone, so the writing stays readable "
         + "however far the ground shows through.",
      range: { ...OPACITY, step: 0.02, fallback: "1" } },
  ],
  fill: [
    { word: "pattern", key: "style", name: "fill", form: "chips",
      tip: "What fills the card behind its writing. Pattern, never colour — a "
         + "hatch follows whatever family or hue the card was given.",
      of: plain(FILLS) },
  ],
  icon: [
    { word: "icon", key: "card", name: "icon", form: "marks",
      tip: "The mark drawn in its top corner instead of the one its role would. "
         + "Nothing lit is the role's own mark." },
  ],
  mark: [
    { word: "mark", key: "card", name: "mark", form: "marks",
      tip: "A quiet mark in its bottom corner — whatever this vocabulary wants to "
         + "flag about a usage. It says nothing to the engine." },
  ],
};
