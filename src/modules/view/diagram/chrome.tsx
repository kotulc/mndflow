/** The chrome: controls a diagram offers around the working area.
 *
 *  Breadcrumb, arrangement verbs, axis and the display toggles that only make
 *  sense here. Per module — a matrix has no interfaces toggle. Marks share one
 *  vocabulary with the shell: no character means two things (U.2). Options sit
 *  in vertical subject groups — interface, relation, flow — every control a
 *  word with the glyph as a scanning aid (U.15). Arrangements stay opposite
 *  the zoom until U.16 moves them to the frame. */

import { nameOf, titleOf } from "../../../graph/fold";
import type { Axis, EdgeForm, Graph, Layout } from "../../../graph/types";
import { Icon, type IconName } from "../../icons";

/** How many layers of the trail the breadcrumb spells out. Past this the
 *  middle is elided: the project and the last few are what tell you where you
 *  are, and a deep branch spelled out in full is a wall of names. */
const TRAIL = 3;

/** The arrangements. Each is a one-time action — press it and the layer is laid
 *  out that way — so none of them lights up: there is no arrangement a layer is
 *  currently *in*. Each mark is the shape of the layout it makes. */
const LAYOUTS: { shape: Layout; mark: IconName; word: string; tip: string }[] = [
  { shape: "grid", mark: "arrange_grid", word: "grid", tip: "Arrange as a grid" },
  { shape: "radial", mark: "arrange_radial", word: "radial", tip: "Arrange around a hub" },
  { shape: "across", mark: "arrange_across", word: "across", tip: "Arrange in ranks, across" },
  { shape: "down", mark: "arrange_down", word: "down", tip: "Arrange in ranks, down" },
];

/** Which way the layer reads. A setting, so it does light up. An axis is an
 *  arrow; an arrangement is a shape — the two can never be read for each
 *  other, which is the set's rule applied to the pair that most invites it. */
const AXES: { axis: Axis; mark: IconName; word: string; tip: string }[] = [
  { axis: "none", mark: "axis_none", word: "none", tip: "No flow direction" },
  { axis: "across", mark: "axis_across", word: "across", tip: "Flows read across" },
  { axis: "down", mark: "axis_down", word: "down", tip: "Flows read down" },
];

/** What a right drag makes — shown as a radio pair, never cycled. `tie` has a
 *  gesture of its own; a reference keeps whichever form it was given. */
const FORMS: { form: EdgeForm; mark: IconName; word: string; tip: string }[] = [
  { form: "line", mark: "relation_plain", word: "plain",
    tip: "Right drag makes a plain line" },
  { form: "directed", mark: "relation_directed", word: "directed",
    tip: "Right drag makes a directed flow" },
];

/** How lines draw — both options visible so the current one is never hidden. */
const DRAWS: { angular: boolean; mark: IconName; word: string; tip: string }[] = [
  { angular: false, mark: "smooth", word: "curves", tip: "Curves" },
  { angular: true, mark: "angles", word: "angles", tip: "Angles" },
];

export type CrumbsProps = {
  graph: Graph;
  view: string | null;
  path: string[];
  onOpen: (id: string | null) => void;
  onUp: () => void;
};

/** Where you are in the tree, and one click to go back. */
export function Crumbs({ graph, view, path, onOpen, onUp }: CrumbsProps) {
  return (
    <div className="crumbs">
      <button onClick={() => onOpen(null)} className={view ? "" : "here"}>
        {titleOf(graph)}
      </button>

      {/* The project, then the last few layers. Whatever is skipped is left
          as an ellipsis that opens the deepest layer it stands for, so the
          way back is still one click even when the trail is long. */}
      {path.length > TRAIL && (
        <span>
          <span className="sep">/</span>
          <button
            className="elided"
            title={path.slice(0, -TRAIL).map((id) => nameOf(graph, graph.elements[id])).join(" / ")}
            onClick={() => onOpen(path[path.length - TRAIL - 1])}
          >
            …
          </button>
        </span>
      )}

      {path.slice(-TRAIL).map((id, index, shown) => (
        <span key={id}>
          <span className="sep">/</span>
          <button onClick={() => onOpen(id)} className={index === shown.length - 1 ? "here" : ""}>
            {nameOf(graph, graph.elements[id])}
          </button>
        </span>
      ))}

      {view && (
        <button className="up" onClick={onUp} title="Up one layer">
          ↑
        </button>
      )}
    </div>
  );
}

export type TogglesProps = {
  showPorts: boolean;
  onShowPorts: (on: boolean) => void;
  form: EdgeForm;
  onForm: (form: EdgeForm) => void;
  angular: boolean;
  onAngular: (on: boolean) => void;
  /** The relationship type the next drag draws, or null for an untyped line. */
  kind: { path: string; form: string } | null;
  onKind: (next: { path: string; form: string } | null) => void;
  /** Types in scope, each with the path it is addressed by. Capped when drawn. */
  kinds: { name: string; path: string; form: string }[];
};

/** How many types the inline group shows. It sits beside the crumbs, so it
 *  cannot grow with the vocabulary; the menu and the strip are where the rest
 *  live, with a *More…* of their own. */
const TYPE_CAP = 3;

/** The canvas settings, top right, as two labelled groups side by side.
 *
 *  **View** is how the canvas draws — interfaces on or off, lines angled or
 *  curved. **Relation** is what the next right drag makes: a plain line, a
 *  directed one, then the types the project imports, capped, because the list
 *  grows with the vocabulary and this one sits inline beside the crumbs.
 *
 *  Flow leaves for the bottom right (V.7), beside the arrangements, so the top
 *  holds settings only. Each group carries its label — with two groups on one
 *  row, nothing else says where one ends. */
export function Toggles({
  showPorts, onShowPorts, form, onForm, angular, onAngular, kind, onKind, kinds,
}: TogglesProps) {
  return (
    <div className="arrange options inline">
      <div className="option-group" role="group" aria-label="View">
        <span className="group-label">view</span>
        <button
          type="button"
          className={showPorts ? "on" : ""}
          onClick={() => onShowPorts(!showPorts)}
          title="Interfaces on the canvas"
        >
          <Icon name={showPorts ? "ports_on" : "ports_off"} /> interfaces
        </button>
        {DRAWS.map(({ angular: which, mark, word, tip }) => (
          <button
            key={word}
            type="button"
            className={angular === which ? "on" : ""}
            aria-pressed={angular === which}
            onClick={() => onAngular(which)}
            title={tip}
          >
            <Icon name={mark} /> {word}
          </button>
        ))}
      </div>

      <div className="option-group" role="group" aria-label="Relation type">
        <span className="group-label">relation</span>
        {FORMS.map(({ form: which, mark, word, tip }) => (
          <button
            key={which}
            type="button"
            className={!kind && form === which ? "on" : ""}
            aria-pressed={!kind && form === which}
            onClick={() => (onKind(null), onForm(which))}
            title={tip}
          >
            <Icon name={mark} /> {word}
          </button>
        ))}
        {kinds.slice(0, TYPE_CAP).map(({ name, path, form: declared }) => (
          <button
            key={path}
            type="button"
            className={kind?.path === path ? "on" : ""}
            aria-pressed={kind?.path === path}
            onClick={() => onKind(kind?.path === path ? null
                                                      : { path, form: declared })}
            title={`Right drag makes a “${name}”`}
          >
            <Icon name="relation_typed" /> {name}
          </button>
        ))}
      </div>
    </div>
  );
}

export type ArrangementsProps = {
  onArrange: (shape: Layout) => void;
  onRelax: () => void;
  axis: Axis;
  onAxis: (axis: Axis) => void;
};

/** Arrangement verbs, opposite the zoom controls. Each is a one-time action,
 *  so none of them lights up — there is no arrangement a layer is currently
 *  *in*, only one it was last put through. Relax hands the layer back to
 *  automatic placement, so it sits with them. Words match the options strip;
 *  U.16 moves the whole set to the frame. */
export function Arrangements({ onArrange, onRelax, axis, onAxis }: ArrangementsProps) {
  return (
    <div className="shape">
      {/* Flow — which way the layer reads. A setting, so it lights up, and it
          sits above the arrangements rather than among them: design.md keeps
          states and verbs apart, and with the two groups now adjacent the
          boundary has to carry what distance used to (V.7). */}
      <div className="option-group flow" role="group" aria-label="Flow">
        <span className="group-label">flow</span>
        {AXES.map(({ axis: which, mark, word, tip }) => (
          <button
            key={which}
            type="button"
            className={axis === which ? "on" : ""}
            aria-pressed={axis === which}
            onClick={() => onAxis(which)}
            title={tip}
          >
            <Icon name={mark} /> {word}
          </button>
        ))}
      </div>

      {LAYOUTS.map(({ shape, mark, word, tip }) => (
        <button key={shape} type="button" onClick={() => onArrange(shape)} title={tip}>
          <Icon name={mark} /> {word}
        </button>
      ))}
      <button
        type="button"
        className="apart"
        onClick={() => onRelax()}
        title="Relax — hand the layer back to the engine"
      >
        <Icon name="relax" /> relax
      </button>
    </div>
  );
}
