/** The chrome: controls a diagram offers around the working area.
 *
 *  Breadcrumb, arrangement verbs, axis and the display toggles that only make
 *  sense here. Per module — a matrix has no interfaces toggle. Visual style is
 *  deliberately untouched; these are the same marks the canvas already drew. */

import { nameOf, titleOf } from "../../../graph/fold";
import type { Axis, EdgeForm, Graph, Layout } from "../../../graph/types";

/** How many layers of the trail the breadcrumb spells out. Past this the
 *  middle is elided: the project and the last few are what tell you where you
 *  are, and a deep branch spelled out in full is a wall of names. */
const TRAIL = 3;

/** The arrangements. Each is a one-time action — press it and the layer is laid
 *  out that way — so none of them lights up: there is no arrangement a layer is
 *  currently *in*. */
const LAYOUTS: { shape: Layout; mark: string; tip: string }[] = [
  { shape: "grid", mark: "▦", tip: "Arrange as a grid" },
  { shape: "radial", mark: "⊙", tip: "Arrange around a hub" },
  { shape: "across", mark: "▤", tip: "Arrange in ranks, across" },
  { shape: "down", mark: "▥", tip: "Arrange in ranks, down" },
];

/** Which way the layer reads. A setting, so it does light up. */
const AXES: { axis: Axis; mark: string; tip: string }[] = [
  { axis: "none", mark: "·", tip: "No flow direction" },
  { axis: "across", mark: "→", tip: "Flows read across" },
  { axis: "down", mark: "↓", tip: "Flows read down" },
];

/** What a right drag makes, in the order the one control steps through.
 *
 *  `tie` is not among them: it has a gesture of its own, so it is not something
 *  this control can land on. A reference is not here either — it is derived
 *  from an end being a proxy, and keeps whichever of these it was given. */
const FORM_NEXT: Record<EdgeForm, EdgeForm> = { line: "directed", directed: "line" };
const FORM_MARK: Record<EdgeForm, string> = { line: "— plain", directed: "⇥ directed" };

/** Shorten a type name for the toolbar — the control is small and a long
 *  name would shove the axis toggles off the bar. */
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
        {titleOf(graph) || "project"}
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

/** Display toggles and the axis — the strip above the working area. */
export function Toggles({
  showPorts, onShowPorts, form, onForm, angular, onAngular,
  shown, kinds, onShown, axis, onAxis,
}: TogglesProps) {
  return (
    <div className="arrange">
      <button
        className={showPorts ? "on" : ""}
        onClick={() => onShowPorts(!showPorts)}
        title="Interfaces on the canvas"
      >
        {showPorts ? "□ interfaces" : "· interfaces"}
      </button>
      <button
        className={form === "line" ? "" : "on"}
        onClick={() => onForm(FORM_NEXT[form])}
        title="What a right drag makes"
      >
        {FORM_MARK[form]}
      </button>
      <button
        className={angular ? "on" : ""}
        onClick={() => onAngular(!angular)}
        title={angular ? "Angles" : "Curves"}
      >
        {angular ? "⌐" : "~"}
      </button>
      {/* Which relationship types to draw. Cycles all → each known type →
          all; a display preference, not a change to the graph. */}
      <button
        className={shown ? "on" : ""}
        disabled={!kinds.length}
        onClick={() => {
          const order: (string | null)[] = [null, ...kinds];
          const at = order.indexOf(shown);
          onShown(order[(at + 1) % order.length] ?? null);
        }}
        title={shown ? `Showing only “${shown}”` : "All relationship types"}
      >
        {shown ? `⊂ ${clipped(shown)}` : "· types"}
      </button>
      {/* Which way the layer reads: a setting, and one about relationships —
          it decides which sides a flow attaches to and how its line runs. */}
      {AXES.map(({ axis: which, mark, tip }) => (
        <button
          key={which}
          className={`${which === "none" ? "apart " : ""}${axis === which ? "on" : ""}`}
          onClick={() => onAxis(which)}
          title={tip}
        >
          {mark}
        </button>
      ))}
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
 *  automatic placement, so it sits with them. */
export function Arrangements({ onArrange, onRelax }: ArrangementsProps) {
  return (
    <div className="shape">
      {LAYOUTS.map(({ shape, mark, tip }) => (
        <button key={shape} onClick={() => onArrange(shape)} title={tip}>
          {mark}
        </button>
      ))}
      <button
        className="apart"
        onClick={() => onRelax()}
        title="Relax — hand the layer back to the engine"
      >
        ◌
      </button>
    </div>
  );
}
