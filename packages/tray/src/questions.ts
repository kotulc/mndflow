/** The questions the settings panel asks of how something draws, as data. */

import { ALIGNS, ARROWS, BORDERS, CONTRASTS, FAMILIES, FONTS, HUE,
         LARGE_FACES, SHOWN, VARY, WEIGHTS, WIDTHS } from "@mnd/core";

/** The parts of a drawing, and the questions each part is asked. */
const GROUPS = ["name", "face", "head", "colour", "border", "icon"] as const;
export type Group = (typeof GROUPS)[number];

/** The parts, in the order the rail lists them. */
export const parts_in_order = (): readonly Group[] => GROUPS;

/** What a part is called on a run, where the card's word is wrong for it. */
export const AS_RUN: Partial<Record<Group, string>> = { border: "stroke" };

/** Which component each part belongs to; the rail filters on it. */
export const ASKS: Record<Group, string> = {
  name: "style", face: "card", head: "line", colour: "style", border: "style",
  icon: "card",
};

export type Key = "card" | "style" | "line";

/** One question. `form` says how it is answered: one of a set, a quantity, a mark, or a size in
 *  units. */
export type Question = {
  word: string; key: Key; name: string; tip: string;
  form: "chips" | "range" | "marks" | "size";
  of?: readonly { value: string; word: string }[];
  omit?: readonly string[];
  range?: { min: number; max: number; step: number; fallback: string };
};

const plain = (of: readonly string[]) => of.map((v) => ({ value: v, word: v }));

/** Whether the handle joins a name, asked under whichever component owns it. */
const HANDLE = (key: Key): Question =>
  ({ word: "handle", key, name: "alias", form: "chips",
     tip: "Whether the handle joins a name somebody did set. What stands in for a "
        + "name always carries one, which is the whole reason it has one.",
     of: plain(SHOWN) });

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
      tip: "Which end of the card the name reads from.", of: plain(ALIGNS) },
    /** A card always writes its name; a run may leave its own off. */
    { word: "shown", key: "line", name: "name", form: "chips",
      tip: "Whether the run writes its name — the label of the definition it follows.",
      of: plain(SHOWN) },
    HANDLE("card"),
    HANDLE("line"),
  ],
  /** What the large face shows, and how big it is. The small face is the workspace's card. */
  face: [
    { word: "face", key: "card", name: "face", form: "chips",
      tip: "Which large face it draws with: a table of its attributes with its body under it, a "
         + "document of its body, or a picture of what its source points at. Unsaid, its name "
         + "is the whole card.", of: plain(LARGE_FACES) },
    { word: "size", key: "card", name: "size", form: "size",
      tip: "How big the large face is, in units of the lattice. The small face is the "
         + "workspace's card size." },
    { word: "name", key: "card", name: "name", form: "chips",
      tip: "Whether the large face writes its name, or is what it shows alone. The small face "
         + "always names.", of: plain(SHOWN) },
  ],
  /** What draws where a run ends, which is what a run has in place of a face. */
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
    /** `none` is a card's answer and not a run's. */
    { word: "style", key: "style", name: "border_style", form: "chips",
      tip: "How the border is drawn. `none` keeps the card's box and drops "
         + "only the line.", of: plain(BORDERS), omit: ["none"] },
  ],
  /** How loudly it is taken, which every module honours. */
  colour: [
    { word: "family", key: "style", name: "family", form: "chips",
      tip: "Which family the theme paints this with. A family is a preset "
         + "hue, and the theme is what picks it. Every hue is taken at one lightness "
         + "and chroma, as an edge, never a fill.",
      of: plain(FAMILIES) },
    { word: "hue", key: "style", name: "hue", form: "range",
      tip: "The angle this paints itself at. Set, it takes precedence over the family.",
      range: { ...HUE, step: 1, fallback: "200" } },
    { word: "vary", key: "style", name: "vary", form: "range",
      tip: "How far, in degrees, each definition under this one strays from its hue — kin "
         + "read alike, and each still reads as itself.",
      range: { ...VARY, step: 1, fallback: "0" } },
  ],
  icon: [
    { word: "icon", key: "card", name: "icon", form: "marks",
      tip: "The mark drawn in its top corner instead of the one its role would. "
         + "Nothing lit is the role's own mark." },
  ],
};
