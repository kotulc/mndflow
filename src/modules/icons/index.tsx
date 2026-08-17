/** The app's icon vocabulary — one set, one grid, one weight.
 *
 *  Vendored inline SVG rather than a font or a package. A Unicode mark renders
 *  from whatever system font happens to carry it: unhinted at small sizes,
 *  with metrics that differ per platform and a baseline it sits off, which is
 *  why the chrome read blurry and indistinct. These draw at an exact size with
 *  one stroke weight.
 *
 *  U.2's rule carries over, not its glyphs: **no mark means two things**. A
 *  name here is a purpose, never a shape — `fold_all`, not `minus_box` — so
 *  two purposes cannot quietly share one drawing.
 *
 *  The design language, in one place so a new icon inherits it rather than
 *  inventing its own: a 24-unit grid, 1.5 stroke, round caps and joins,
 *  `currentColor`, and no fill unless the mark is solid by nature. */

const GRID = 24;
const WEIGHT = 1.5;

/** Every icon, keyed by what it means. Paths only — the frame is shared. */
const PATHS = {
  // Making, naming, removing.
  add: "M12 5v14M5 12h14",
  rename: "M4 20h4L18 10a2.1 2.1 0 0 0-3-3L5 17v3z",
  remove: "M6 6l12 12M18 6L6 18",

  // The tree: folding a branch, and the pane itself.
  fold_all: "M5 5h14v14H5zM8.5 12h7",
  unfold_all: "M5 5h14v14H5zM12 8.5v7M8.5 12h7",
  pane_hide: "M14.5 7L9.5 12l5 5",
  pane_show: "M9.5 7l5 5-5 5",

  // A tray opening and shutting. Chevrons, so nothing confuses them with sort.
  more: "M6.5 9.5l5.5 5 5.5-5",
  less: "M6.5 14.5l5.5-5 5.5 5",

  // Sorting a column. An arrow against a baseline — never a bare chevron.
  sort_up: "M5 19h14M12 16V6M8.5 9.5L12 6l3.5 3.5",
  sort_down: "M5 5h14M12 8v10M8.5 14.5L12 18l3.5-3.5",

  // What a row is, in the tree. One meaning each.
  role_leaf: "M7 7h10v10H7z",
  role_interface: "M7.5 7.5h9v9h-9z",
  role_container: "M4 5.5h16v13H4zM4 10.5h16",
  project: "M3.5 5h17v14h-17zM7.5 9h9v6h-9z",
  // A behavior project holds actions and states rather than parts, so its
  // mark is the same frame around a run of steps instead of a block.
  project_behavior: "M3.5 5h17v14h-17zM7 12h3M14 12h3M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3",

  // Interfaces drawn on the canvas, or not.
  ports_on: "M6 6h12v12H6zM2.5 12H6M18 12h3.5",
  ports_off: "M15 6H6v12h9",

  // Sending a file out, and taking one in. A workspace lands on a shelf; a
  // project is one page, so the two can never read as each other.
  export_workspace: "M12 3.5v9M8.5 9.5L12 13l3.5-3.5M4 16.5v4h16v-4",
  export_project: "M6.5 3.5h7l4 4v13h-11zM12 10v6M9 13.5L12 16.5l3-3",
  import_file: "M12 13.5v-9M8.5 8L12 4.5 15.5 8M4 16.5v4h16v-4",

  // Turning a relationship around.
  flip: "M6.5 9h11l-3-3M17.5 15h-11l3 3",

  // Arrangements — one-time verbs over the layer. Shapes of a layout.
  arrange_grid: "M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z",
  arrange_radial: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M12 3v2M12 19v2M3 12h2M19 12h2",
  arrange_across: "M4 5.5h4v13H4zM10 5.5h4v13h-4zM16 5.5h4v13h-4z",
  arrange_down: "M5.5 4h13v4h-13zM5.5 10h13v4h-13zM5.5 16h13v4h-13z",
  relax: "M3 13.5c3-6 6 6 9 0s6-6 9 0",

  // Which way a layer reads. A setting, so an arrow rather than a block.
  axis_none: "M8 12h8",
  axis_across: "M4 12h14M14 8l4 4-4 4",
  axis_down: "M12 4v14M8 14l4 4 4-4",

  // What a right drag makes. End bars say *this joins two things*, which is
  // what keeps a plain relationship from reading as the axis-none dash and a
  // directed one from reading as the across arrow — they sit in adjacent
  // groups, so a shared mark would be the one mistake this set exists to stop.
  relation_plain: "M4.5 8.5v7M19.5 8.5v7M4.5 12h15",
  relation_directed: "M4.5 8.5v7M4.5 12h13.5M14 8.5l3.5 3.5-3.5 3.5",

  // The three looks. Nextra's shape — light, dark, and the slot a "system"
  // toggle would use — but ours are three named looks rather than two modes
  // and a follow, so `retro` sits in that slot without pretending to read the
  // operating system.
  theme_light: "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9M12 2v2.5M12 19.5V22M4.5 12H2M22 12h-2.5M6 6L4.5 4.5M19.5 19.5L18 18M18 6l1.5-1.5M4.5 19.5L6 18",
  theme_modern: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5",
  theme_retro: "M5 5h14v10H5zM9 19h6M12 15v4",

  // Discarding a whole workspace. Not a refresh mark — refresh reads as
  // *reload what is here*, and this drops every open project.
  discard: "M5 7h14M10 7V5h4v2M6.5 7l1 13h9l1-13M10 11v5M14 11v5",

  // How a relationship is drawn.
  angles: "M4 19V8h8V4",
  smooth: "M4 19c5 0 3-14 8-14s3 14 8 14",

  // The six view modules (U.9). Distinct at a glance and from everything above.
  view_block: "M4 7.5h16v9H4z",
  view_table: "M4 6h16M4 12h16M4 18h16",
  view_matrix: "M4 4.5h16v15H4zM4 9.5h16M4 14.5h16M9.5 4.5v15M14.5 4.5v15",
  view_activity: "M6 12h4M14 12h4M10 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7",
  view_sequence: "M7 4v3M7 10v3M7 16v4M17 4v3M17 10v3M17 16v4M9 8h6",
  view_state: "M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
} as const;

export type IconName = keyof typeof PATHS;

/** Whether a name is one this set draws — the guard a stored name goes through. */
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
 *  solid by nature, like a leaf row, where an outline would read as an empty
 *  container and mean the wrong thing. */
export function Icon({
  name, size = 16, solid = false, className,
}: {
  name: IconName;
  size?: number;
  solid?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={className ? `icon-svg ${className}` : "icon-svg"}
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      fill={solid ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={solid ? 0 : WEIGHT}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
