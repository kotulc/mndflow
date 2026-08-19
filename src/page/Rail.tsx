/** The options rail: one column, fixed to the page's right, holding every
 *  control the thing on the stage has (Y.1, Y.2, Y.3).
 *
 *  **One surface whose contents vary, not one per view.** A view module says
 *  which groups it offers (`ViewModule.chrome`); this draws them in
 *  `CHROME_ORDER`, whatever order it was handed. A matrix has no interfaces
 *  toggle because it declares none — never because one was greyed out. The
 *  control tables live here rather than in the diagram, because `flow` and
 *  `arrange` are offered by three modules now and belonged to none of them.
 *
 *  **An icon over one word.** U.15's *every control carries a word* holds: the
 *  word only cost width when it sat beside the glyph. A group label sits above
 *  each group, and groups are spaced apart, because two adjacent icon columns
 *  otherwise read as one long one.
 *
 *  **It scrolls.** Twenty-odd controls against the height of a window makes
 *  overflow ordinary rather than an edge case, and collapsing a group would be
 *  the hidden state U.8 turned down. */

import { Icon, type IconName } from "../modules/icons";
import { CHROME_ORDER, type ChromeGroup } from "../modules/view";
import { TYPE_CAP } from "../actions/typelist";
import type { Axis, EdgeForm, Layout } from "../graph/types";

/** One control. `on` lights it; a verb leaves it undefined, since there is no
 *  arrangement a layer is currently *in*. */
export type RailControl = {
  key: string;
  icon: IconName;
  word: string;
  tip: string;
  on?: boolean;
  run: () => void;
};

export type RailGroup = {
  key: (typeof CHROME_ORDER)[number];
  label: string;
  /** Verbs are one-shot and ruled off from the settings — design.md keeps
   *  toolbars dividing by states against verbs, and a column of identical
   *  groups is exactly what would erase that. */
  verbs?: boolean;
  controls: RailControl[];
};

/** Every word is one word. Nothing here needed renaming — the app's own
 *  vocabulary was already single — and the one label that cannot be chosen is a
 *  relation type's, which is a definition's name and its author's to write. */
const LAYOUTS: { shape: Layout; icon: IconName; word: string; tip: string }[] = [
  { shape: "grid", icon: "arrange_grid", word: "grid", tip: "Arrange as a grid" },
  { shape: "radial", icon: "arrange_radial", word: "radial", tip: "Arrange around a hub" },
  { shape: "across", icon: "arrange_across", word: "across", tip: "Arrange in ranks, across" },
  { shape: "down", icon: "arrange_down", word: "down", tip: "Arrange in ranks, down" },
];

const AXES: { axis: Axis; icon: IconName; word: string; tip: string }[] = [
  { axis: "none", icon: "axis_none", word: "none", tip: "No flow direction" },
  { axis: "across", icon: "axis_across", word: "across", tip: "Flows read across" },
  { axis: "down", icon: "axis_down", word: "down", tip: "Flows read down" },
];

const FORMS: { form: EdgeForm; icon: IconName; word: string; tip: string }[] = [
  { form: "line", icon: "relation_plain", word: "plain", tip: "Right drag makes a plain line" },
  { form: "directed", icon: "relation_directed", word: "directed",
    tip: "Right drag makes a directed flow" },
];

const DRAWS: { angular: boolean; icon: IconName; word: string; tip: string }[] = [
  { angular: false, icon: "smooth", word: "curves", tip: "Curves" },
  { angular: true, icon: "angles", word: "angles", tip: "Angles" },
];

/** What an export downloads in. `shown` follows the screen's own theme —
 *  the default the wave settled on (Y.6) — the rest force one of the three
 *  named looks regardless of what the screen shows (Y.6a). Not a fourth
 *  theme: the screen still only ever shows one of three, this only widens
 *  what a file leaving it may be drawn in. */

/** `shown`'s icon borrows whichever of the three the screen is actually
 *  showing, so the control draws the look it will produce rather than a
 *  fourth glyph meaning "whatever" — reusing a mark rather than minting
 *  one U.2 would call a second thing. */
/** How many relation types the rail lists — the list-of-types rule's three,
 *  read off the one place the cap is written rather than a second number
 *  beside it (`X.2`). **The group is the rule's exception**: no *More…*, no
 *  expansion. It is a setting for what the next drag draws, not a list of
 *  things to act on, and the rest are on the strip and the edge menu, which
 *  is where a list that grows with the vocabulary belongs. */

export type RailOpts = {
  /** What the open view module offers. */
  offers: readonly ChromeGroup[];
  /** The project's views — the page's own group, and always first. */
  views: { name: string; icon: IconName; on: boolean; run: () => void }[];
  showPorts: boolean;
  onShowPorts: (on: boolean) => void;
  angular: boolean;
  onAngular: (on: boolean) => void;
  form: EdgeForm;
  onForm: (form: EdgeForm) => void;
  /** What the open view's `types` group lists, and its mark — the module's
   *  answer, since a table and a matrix filter by different vocabularies. */
  types: string[];
  typeIcon: IconName;
  shownType: string | null;
  onShownType: (next: string | null) => void;
  /** Fields the table could give a column of its own, and which of them have
   *  one (P.8). Toggled one at a time — the head's four are always there, so
   *  an empty pick is the default set rather than a table with no columns. */
  columns: string[];
  shownColumns: string[];
  onColumn: (name: string) => void;
  kind: { path: string; form: string } | null;
  onKind: (next: { path: string; form: string } | null) => void;
  kinds: { name: string; path: string; form: string }[];
  axis: Axis;
  onAxis: (axis: Axis) => void;
  onArrange: (shape: Layout) => void;
  onRelax: () => void;
  onExport: () => void;
  /** Which look the next export renders in, and what the screen shows now —
   *  `shown`'s icon reads off the latter rather than a glyph of its own. */
};

/** The groups for one view, built from what it offers. Pure — the rail draws
 *  whatever this returns, and empty groups are dropped. */
export function groupsFor(o: RailOpts): RailGroup[] {
  const has = (key: ChromeGroup) => o.offers.includes(key);
  const out: RailGroup[] = [];

  if (o.views.length > 1) {
    out.push({
      key: "views",
      label: "views",
      controls: o.views.map((v) => ({
        key: v.name, icon: v.icon, word: v.name, on: v.on,
        tip: `Show as ${v.name}`, run: v.run,
      })),
    });
  }

  if (has("flow")) {
    out.push({
      key: "flow",
      label: "flow",
      controls: AXES.map(({ axis, icon, word, tip }) => ({
        key: axis, icon, word, tip, on: o.axis === axis, run: () => o.onAxis(axis),
      })),
    });
  }

  if (has("arrange")) {
    out.push({
      key: "arrange",
      label: "arrange",
      verbs: true,
      controls: [
        ...LAYOUTS.map(({ shape, icon, word, tip }) => ({
          key: shape, icon, word, tip, run: () => o.onArrange(shape),
        })),
        { key: "relax", icon: "relax" as IconName, word: "relax",
          tip: "Relax — hand the layer back to the engine", run: o.onRelax },
      ],
    });
  }

  if (has("interfaces")) {
    out.push({
      key: "interfaces",
      label: "interfaces",
      controls: [{
        key: "ports",
        icon: o.showPorts ? "ports_on" : "ports_off",
        // Not "interfaces" — the group label says that already, and the word
        // only fitted by breaking its last letter onto a line of its own.
        word: o.showPorts ? "shown" : "hidden",
        tip: o.showPorts ? "Hide interfaces" : "Show interfaces",
        on: o.showPorts,
        run: () => o.onShowPorts(!o.showPorts),
      }],
    });
  }

  if (has("lines")) {
    out.push({
      key: "lines",
      label: "lines",
      controls: DRAWS.map(({ angular, icon, word, tip }) => ({
        key: word, icon, word, tip, on: o.angular === angular,
        run: () => o.onAngular(angular),
      })),
    });
  }

  // Which fields the table gives a column of their own. Not a filter: the
  // rows are the same either way, and this only widens what each one says.
  if (has("columns")) {
    out.push({
      key: "columns",
      label: "columns",
      controls: o.columns.map((name) => ({
        key: name,
        icon: "column" as IconName,
        word: name,
        tip: `Show “${name}” as a column`,
        on: o.shownColumns.includes(name),
        run: () => o.onColumn(name),
      })),
    });
  }

  // What the list on the stage is narrowed to. Nothing picked is everything,
  // so picking the lit one again is how you get back — no separate *all*
  // entry, the way the relation types below work.
  if (has("types")) {
    out.push({
      key: "types",
      label: "types",
      controls: o.types.map((name) => ({
        key: name,
        icon: o.typeIcon,
        word: name,
        tip: `Show only “${name}”`,
        on: o.shownType === name,
        run: () => o.onShownType(o.shownType === name ? null : name),
      })),
    });
  }

  // Last, because it is the only group that grows with the vocabulary — so it
  // is the one to push off the bottom of a column that scrolls.
  if (has("relations")) {
    out.push({
      key: "relations",
      label: "relations",
      controls: [
        ...FORMS.map(({ form, icon, word, tip }) => ({
          key: word, icon, word, tip,
          on: !o.kind && o.form === form,
          run: () => (o.onKind(null), o.onForm(form)),
        })),
        ...o.kinds.slice(0, TYPE_CAP).map(({ name, path, form }) => ({
          key: path,
          icon: "relation_typed" as IconName,
          word: name,
          tip: `Right drag makes a “${name}”`,
          on: o.kind?.path === path,
          run: () => o.onKind(o.kind?.path === path ? null : { path, form }),
        })),
      ],
    });
  }

  out.push({
    key: "project",
    label: "project",
    verbs: true,
    controls: [
      {
        key: "export", icon: "export_project" as IconName, word: "export",
        tip: "Export this project (bundles what it depends on)", run: o.onExport,
      },
    ],
  });

  return out;
}

const AT = new Map(CHROME_ORDER.map((key, at) => [key, at]));

export function Rail({ groups }: { groups: RailGroup[] }) {
  const shown = groups
    .filter((group) => group.controls.length)
    .sort((a, b) => (AT.get(a.key) ?? 0) - (AT.get(b.key) ?? 0));

  if (!shown.length) return null;

  return (
    <aside className="opts" aria-label="Options">
      {shown.map((group) => (
        <div
          key={group.key}
          className={`opts-group ${group.verbs ? "verbs" : ""}`}
          role="group"
          aria-label={group.label}
        >
          <span className="opts-label">{group.label}</span>
          {group.controls.map((control) => (
            <button
              key={control.key}
              type="button"
              className={control.on ? "on" : ""}
              {...(control.on === undefined ? {} : { "aria-pressed": control.on })}
              title={control.tip}
              onClick={control.run}
            >
              <Icon name={control.icon} />
              <span className="word">{control.word}</span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}
