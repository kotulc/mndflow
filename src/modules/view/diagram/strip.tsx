/** The strip at the foot of the stage: what is selected, and what it could
 *  be — the last defect the closing review found (`R.9`, docs/plan.md).
 *
 *  One surface for every selectable thing. A block, a group, a note, a port
 *  or a relationship all answer the same question — a name, and the types
 *  the list-of-types rule offers for it — so this is not a relationship
 *  special case. `retype` is the only action it runs; the strip offers it
 *  N times over, exactly as an edge menu's `expand` does (`R.5`), rather than
 *  registering anything new.
 *
 *  Ranking, the cap and the expand-in-place behaviour are `typelist.ts`'s;
 *  this is only the chrome around them. */

import { useEffect, useRef, useState } from "react";

import { nameOf, typeName } from "../../../graph/fold";
import { candidatesFor, noteTypePick, rankedTypes, shapeOf, TYPE_CAP } from "./typelist";
import type { Args, Picked } from "../../../actions";
import type { Graph } from "../../../graph/types";

/** What is selected, named — a node's label, or an edge's current type. */
function nameFor(picked: Exclude<Picked, null>, graph: Graph): string {
  if (picked.kind === "edge") {
    const edge = graph.edges[picked.id];
    return edge ? (typeName(graph, edge.type) || "relation") : "";
  }

  return nameOf(graph, graph.elements[picked.id]);
}

/** The type currently on the selection, so the chip for it can read as on. */
function currentOf(picked: Exclude<Picked, null>, graph: Graph): string {
  if (picked.kind === "edge") return graph.edges[picked.id]?.type ?? "";

  return graph.elements[picked.id]?.type ?? "";
}

export type SelectionStripProps = {
  graph: Graph;
  picked: Picked;
  /** Relation kinds in scope — the same list the toolbar's `kind` picker
   *  draws from, package vocabulary included. */
  kinds?: { name: string; path: string }[];
  onAct: (name: string, args?: Args) => boolean;
};

export function SelectionStrip({ graph, picked, kinds, onAct }: SelectionStripProps) {
  const [expanded, setExpanded] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // A new selection starts collapsed — an expansion left open would say
  // something about the thing that was picked before it.
  useEffect(() => setExpanded(false), [picked?.kind, picked?.id]);

  useEffect(() => {
    if (!expanded) return undefined;
    const away = (event: MouseEvent) => {
      if (box.current?.contains(event.target as Node)) return;
      setExpanded(false);
    };
    window.addEventListener("mousedown", away);

    return () => window.removeEventListener("mousedown", away);
  }, [expanded]);

  if (!picked || picked.kind === "attr") return null;

  const shape = shapeOf(picked, graph);
  const list = rankedTypes(candidatesFor(picked, graph, kinds), shape);
  const shown = expanded ? list : list.slice(0, TYPE_CAP);
  const current = currentOf(picked, graph);

  function take(type: string) {
    noteTypePick(shape, type, list);
    onAct("retype", { id: picked!.id, type });
    setExpanded(false);
  }

  return (
    <div
      ref={box}
      className={`selection-strip ${expanded ? "expanded" : ""}`}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (list.length > TYPE_CAP) setExpanded(true);
      }}
    >
      <span className="name">{nameFor(picked, graph)}</span>

      {list.length > 0 && (
        <ul className="types" role="list">
          {shown.map((candidate) => (
            <li key={candidate.path}>
              <button
                type="button"
                className={candidate.path === current ? "here" : ""}
                onClick={() => take(candidate.path)}
              >
                {candidate.name}
              </button>
            </li>
          ))}

          {/* No submenu — the same surface re-renders with the full list. */}
          {!expanded && list.length > TYPE_CAP && (
            <li>
              <button type="button" className="more" onClick={() => setExpanded(true)}>
                More…
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
