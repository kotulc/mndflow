/** The chrome a diagram draws around the working area: the breadcrumb.
 *
 *  **The settings and the verbs left for the page's rail** (Y.1). They were
 *  here because the diagram was the only view with any; `flow` and `arrange`
 *  are offered by three modules now, so their tables belong to the rail and
 *  not to one of the views that asks for them. What a module still declares is
 *  *which* groups it offers — `ViewModule.chrome` — never how they draw.
 *
 *  The trail stays: it is of the drawing rather than about it. */

import { nameOf, titleOf } from "../../../graph/fold";
import type { Graph } from "../../../graph/types";

/** How many layers of the trail the breadcrumb spells out. Past this the
 *  middle is elided: the project and the last few are what tell you where you
 *  are, and a deep branch spelled out in full is a wall of names. */
const TRAIL = 3;

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
