/** The app's icon vocabulary — one set, one grid, one weight.
 *
 *  Vendored inline SVG rather than a font or a package. A Unicode mark renders
 *  from whatever system font happens to carry it: unhinted at small sizes,
 *  with metrics that differ per platform and a baseline it sits off, which is
 *  why chrome built from glyphs reads blurry and indistinct. These draw at an
 *  exact size with one stroke weight.
 *
 *  **No mark means two things.** A name here is a purpose, never a shape —
 *  `fold_all`, not `minus_box` — so two purposes cannot quietly share one
 *  drawing. One purpose may have many callers, which is why `remove` serves
 *  every *take this away* in the app rather than each surface drawing its own.
 *
 *  The design language, in one place so a new icon inherits it rather than
 *  inventing its own: a 24-unit grid, 1.5 stroke, round caps and joins,
 *  `currentColor`, no fill unless the mark is solid by nature, and a stroke
 *  across a mark reads as *not that* — never as a second mark. */

const GRID = 24;
const WEIGHT = 1.5;

/** Every icon, keyed by what it means. Paths only — the frame is shared. */
const PATHS = {
  // Making and taking away.
  add: "M12 5v14M5 12h14",
  /** **On the same footprint as `add`**, not the row mark's: a folder drawn to
   *  its own width sat short beside the marks it shares a bar with, and read as
   *  a smaller control than the ones either side of it. */
  add_folder: "M5 5.5h5l2 2h7v11H5zM12 10.5v5M9.5 13h5",
  remove: "M6 6l12 12M18 6L6 18",

  // Undoing and redoing. An arrow that turns back on itself, both ways.
  undo: "M4 9h11a5 5 0 0 1 0 10H9M4 9l4-4M4 9l4 4",
  redo: "M20 9H9a5 5 0 0 0 0 10h6M20 9l-4-4M20 9l-4 4",

  // The tree: folding a branch, and what it chooses to list.
  fold_all: "M5 5h14v14H5zM8.5 12h7",
  unfold_all: "M5 5h14v14H5zM12 8.5v7M8.5 12h7",
  show_empty: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5",
  hide_empty: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 19.5l15-15",

  // A tray or a panel opening and shutting. Chevrons, so nothing confuses
  // them with sort.
  more: "M6.5 9.5l5.5 5 5.5-5",
  less: "M6.5 14.5l5.5-5 5.5 5",
  up: "M12 19.5V6M6 12l6-6 6 6",

  // What a row is, in the tree. One meaning each.
  role_leaf: "M7 7h10v10H7z",
  role_interface: "M7.5 7.5h9v9h-9z",
  // A container holds things, so it is solid. An outline would read as the
  // empty leaf beside it.
  role_container: "M6 6h12v12H6z",
  role_folder: "M3.5 7.5h6l2 2h9v9h-17z",
  // Somewhere else, a description, and a set — none of them structure here.
  // A reference is a solid corner pointing up and out of its own card: it
  // stands for something that lives elsewhere, and the mark says which way.
  role_reference: "M7 5h12v12z",
  role_note: "M5 8h14M5 12h14M5 16h9",
  role_group: "M9 4v16M15 4v16M4 9h16M4 15h16",

  // Interfaces drawn on the canvas, or not.
  ports_on: "M6 6h12v12H6zM2.5 12H6M18 12h3.5",
  ports_off: "M15 6H6v12h9",

  // Sending a file out, and taking one in. A workspace lands on a shelf; a
  // project is one page, so the two can never read as each other.
  export_workspace: "M12 3.5v9M8.5 9.5L12 13l3.5-3.5M4 16.5v4h16v-4",
  export_project: "M6.5 3.5h7l4 4v13h-11zM12 10v6M9 13.5L12 16.5l3-3",
  import_file: "M12 13.5v-9M8.5 8L12 4.5 15.5 8M4 16.5v4h16v-4",

  // Arrangements — one-time verbs over the layer. Shapes of a layout: how the
  // ranks sit, and which way they read.
  arrange_free: "M5 5h4.5v4.5H5zM14.5 8h4.5v4.5h-4.5zM8 14.5h5.5V19H8z",
  // Ranked, and which way they read. **The chevron carries the direction and
  // takes half the grid** — a small arrowhead beside the bars is 2px at the
  // size a rail draws, which is four marks nobody can tell apart.
  arrange_right: "M4 7h3v10H4zM9.5 7h3v10h-3M15 6.5l6 5.5-6 5.5",
  arrange_left: "M20 7h-3v10h3zM14.5 7h-3v10h3M9 6.5l-6 5.5 6 5.5",
  arrange_down: "M7 4h10v3H7zM7 9.5h10v3H7M6.5 15l5.5 6 5.5-6",
  arrange_up: "M17 20H7v-3h10zM17 14.5H7v-3h10M17.5 9L12 3 6.5 9",

  // What a right drag makes. End bars say *this joins two things*, which is
  // what keeps a plain relationship from reading as a bare rule and a directed
  // one from reading as an arrange arrow.
  relation_plain: "M4.5 8.5v7M19.5 8.5v7M4.5 12h15",
  relation_typed: "M4.5 8.5v7M19.5 8.5v7M4.5 12h15M12 6.5v3",

  // How a relationship is drawn.
  angles: "M4 19V8h8V4",
  smooth: "M4 19c5 0 3-14 8-14s3 14 8 14",

  // The three looks. Light, dark, and the slot a "system" toggle would take —
  // ours are three named looks rather than two modes and a follow, so `retro`
  // sits there without pretending to read the operating system.
  theme_light: "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9M12 2v2.5M12 19.5V22M4.5 12H2M22 12h-2.5M6 6L4.5 4.5M19.5 19.5L18 18M18 6l1.5-1.5M4.5 19.5L6 18",
  theme_modern: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5",
  theme_retro: "M5 5h14v10H5zM9 19h6M12 15v4",

  // The strip that types. A prompt inside a frame, so it cannot read as the
  // retro screen above it.
  terminal: "M3.5 5.5h17v13h-17zM7 10l3 2.5-3 2.5M13 15.5h4",
  // Clearing what is typed. Backspace — it is the text that goes.
  clear: "M9 5.5h10.5v13H9L3.5 12zM12 9.5l5 5M17 9.5l-5 5",

  // The app speaking about what you did, or holding its tongue.
  mirror_on: "M4.5 5.5h15v10h-9l-4 3.5V15.5h-2z",
  mirror_off: "M4.5 5.5h15v10h-9l-4 3.5V15.5h-2zM6.5 17.5L18 4.5",

  // Which line of a grid carries meaning rather than contents: the shaded
  // strip is the header, down the left for a row header and across the top for
  // a column one.
  header_row: "M3.5 5.5h17v13h-17zM3.5 10h17M3.5 14h17M8.5 5.5v13M3.5 5.5h5v13h-5z",
  header_col: "M3.5 5.5h17v13h-17zM3.5 10h17M3.5 14h17M8.5 5.5v13M3.5 5.5h17v4.5h-17z",
} as const;

export type IconName = keyof typeof PATHS;

/** Whether a name is one this set draws — the guard a stored name goes
 *  through, so a mark that was never drawn fails where it is read. */
export function known(name: string): name is IconName {
  return name in PATHS;
}

/** What one name draws. Exposed so the set can be held to its own rule — two
 *  purposes sharing a path is the mistake it exists to prevent. */
export function paths(name: IconName): string {
  return PATHS[name];
}

/** Every name in the set, for a caller that wants to check its own table. */
export function names(): IconName[] {
  return Object.keys(PATHS) as IconName[];
}

/** One icon. `solid` fills it instead of stroking — for the marks that are
 *  solid by nature, like a container row, where the fill is what says it holds
 *  something and an outline would read as the empty leaf beside it. */
export function Icon({ name, size = 16, solid = false, className }: {
  name: IconName;
  size?: number;
  solid?: boolean;
  className?: string;
}) {
  return (
    <svg className={className ? `icon-svg ${className}` : "icon-svg"}
         width={size} height={size} viewBox={`0 0 ${GRID} ${GRID}`}
         fill={solid ? "currentColor" : "none"} stroke="currentColor"
         strokeWidth={solid ? 0 : WEIGHT} strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
