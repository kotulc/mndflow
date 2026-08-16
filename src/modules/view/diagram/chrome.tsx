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

/** How many layers of the trail the breadcrumb spells out. Past this the
 *  middle is elided: the project and the last few are what tell you where you
 *  are, and a deep branch spelled out in full is a wall of names. */
const TRAIL = 3;

/** The arrangements. Each is a one-time action — press it and the layer is laid
 *  out that way — so none of them lights up: there is no arrangement a layer is
 *  currently *in*. Marks are shape-of-layout, not hatched-square cousins. */
const LAYOUTS: { shape: Layout; mark: string; word: string; tip: string }[] = [
  { shape: "grid", mark: "▦", word: "grid", tip: "Arrange as a grid" },
  { shape: "radial", mark: "⊙", word: "radial", tip: "Arrange around a hub" },
  { shape: "across", mark: "⇄", word: "across", tip: "Arrange in ranks, across" },
  { shape: "down", mark: "⇅", word: "down", tip: "Arrange in ranks, down" },
];

/** Which way the layer reads. A setting, so it does light up. `·` means only
 *  *no axis* — never interfaces-off or all-types. */
const AXES: { axis: Axis; mark: string; word: string; tip: string }[] = [
  { axis: "none", mark: "·", word: "none", tip: "No flow direction" },
  { axis: "across", mark: "→", word: "across", tip: "Flows read across" },
  { axis: "down", mark: "↓", word: "down", tip: "Flows read down" },
];

/** What a right drag makes — shown as a radio pair, never cycled. `tie` has a
 *  gesture of its own; a reference keeps whichever form it was given. */
const FORMS: { form: EdgeForm; mark: string; word: string; tip: string }[] = [
  { form: "line", mark: "—", word: "plain", tip: "Right drag makes a plain line" },
  { form: "directed", mark: "⇥", word: "directed", tip: "Right drag makes a directed flow" },
];

/** How lines draw — both options visible so the current one is never hidden. */
const DRAWS: { angular: boolean; mark: string; word: string; tip: string }[] = [
  { angular: false, mark: "~", word: "curves", tip: "Curves" },
  { angular: true, mark: "⌐", word: "angles", tip: "Angles" },
];

/** Shorten a type name for the toolbar — long names would dominate the column. */
function clipped(name: string, at = 14): string {
  return name.length > at ? `${name.slice(0, at - 1)}…` : name;
}

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
  shown: string | null;
  kinds: string[];
  onShown: (next: string | null) => void;
  axis: Axis;
  onAxis: (axis: Axis) => void;
};

/** Display settings in vertical subject groups — interface, relation, flow. */
export function Toggles({
  showPorts, onShowPorts, form, onForm, angular, onAngular,
  shown, kinds, onShown, axis, onAxis,
}: TogglesProps) {
  return (
    <div className="arrange options">
      <div className="option-group" role="group" aria-label="Interface">
        <button
          type="button"
          className={showPorts ? "on" : ""}
          onClick={() => onShowPorts(!showPorts)}
          title="Interfaces on the canvas"
        >
          {showPorts ? "□ interfaces" : "⊏ interfaces"}
        </button>
      </div>

      <div className="option-group" role="group" aria-label="Relation">
        {FORMS.map(({ form: which, mark, word, tip }) => (
          <button
            key={which}
            type="button"
            className={form === which ? "on" : ""}
            aria-pressed={form === which}
            onClick={() => onForm(which)}
            title={tip}
          >
            {mark} {word}
          </button>
        ))}
        {DRAWS.map(({ angular: which, mark, word, tip }) => (
          <button
            key={word}
            type="button"
            className={angular === which ? "on" : ""}
            aria-pressed={angular === which}
            onClick={() => onAngular(which)}
            title={tip}
          >
            {mark} {word}
          </button>
        ))}
        {/* Which relationship types to draw. All → each known type, both
            visible; a display preference, not a change to the graph. `∗` is
            all types — never the axis-none `·`. */}
        <button
          type="button"
          className={shown === null ? "on" : ""}
          aria-pressed={shown === null}
          disabled={!kinds.length}
          onClick={() => onShown(null)}
          title="All relationship types"
        >
          ∗ types
        </button>
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            className={shown === kind ? "on" : ""}
            aria-pressed={shown === kind}
            onClick={() => onShown(kind)}
            title={`Showing only “${kind}”`}
          >
            ⊂ {clipped(kind)}
          </button>
        ))}
      </div>

      {/* Which way the layer reads: a setting about relationships — it decides
          which sides a flow attaches to and how its line runs. */}
      <div className="option-group" role="group" aria-label="Flow">
        {AXES.map(({ axis: which, mark, word, tip }) => (
          <button
            key={which}
            type="button"
            className={axis === which ? "on" : ""}
            aria-pressed={axis === which}
            onClick={() => onAxis(which)}
            title={tip}
          >
            {mark} {word}
          </button>
        ))}
      </div>
    </div>
  );
}

export type ArrangementsProps = {
  onArrange: (shape: Layout) => void;
  onRelax: () => void;
};

/** Arrangement verbs, opposite the zoom controls. Each is a one-time action,
 *  so none of them lights up — there is no arrangement a layer is currently
 *  *in*, only one it was last put through. Relax hands the layer back to
 *  automatic placement, so it sits with them. Words match the options strip;
 *  U.16 moves the whole set to the frame. */
export function Arrangements({ onArrange, onRelax }: ArrangementsProps) {
  return (
    <div className="shape">
      {LAYOUTS.map(({ shape, mark, word, tip }) => (
        <button key={shape} type="button" onClick={() => onArrange(shape)} title={tip}>
          {mark} {word}
        </button>
      ))}
      <button
        type="button"
        className="apart"
        onClick={() => onRelax()}
        title="Relax — hand the layer back to the engine"
      >
        ∿ relax
      </button>
    </div>
  );
}
