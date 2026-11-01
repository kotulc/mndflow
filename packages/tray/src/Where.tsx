/** **Where it lives**, the overview's picture: the whole model or package it sits in, laid as its
 *  map lays it (views `where_map`), as quiet boxes — the top levels named, the path down to it
 *  firmer, the element lit. It repeats no chip; it only says *where*. And its path, in words. */

import { useMemo } from "react";
import { line_layer, owner_of, path, shown_name, type Graph, type Id } from "@mnd/core";
import { chip_map, library_map, model_map, where_map, type Scene } from "@mnd/views";

/** Each map laid once per graph, however many picks read it. */
const LAID = new WeakMap<Graph, Partial<Record<"library" | "models", Scene>>>();
function laid_map(graph: Graph, which: "library" | "models"): Scene {
  const maps = LAID.get(graph) ?? {};
  LAID.set(graph, maps);
  return (maps[which] ??= (which === "library" ? library_map : model_map)(graph));
}

export function Where({ graph, id }: { graph: Graph; id: Id }) {
  /** Its own map first, the other where its own draws nothing of it. */
  const { boxes, aspect } = useMemo(() => {
    const first = chip_map(graph, id);
    const laid = (which: "library" | "models") => where_map(graph, id, laid_map(graph, which));
    const own = laid(first);
    return own.boxes.some((b) => b.lit) || id === graph.root ? own
      : laid(first === "library" ? "models" : "library");
  }, [graph, id]);
  if (!boxes.length) return null;
  return (
    <div className="where" style={{ aspectRatio: aspect }} aria-label="where it lives">
      {boxes.map((b) => (
        <div key={b.id} title={b.label}
             className={b.lit ? "where-box lit" : b.path ? "where-box path" : "where-box"}
             style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`,
                      height: `${b.h * 100}%`, zIndex: b.depth }}>
          {b.label ? <span className="where-name">{b.label}</span> : null}
        </div>
      ))}
    </div>
  );
}

/** **Its path**, heading the answers: where it is filed, its own name last; a line's, the layer
 *  it is drawn in, then its ends. */
export function Trail({ graph, id }: { graph: Graph; id: Id }) {
  const e = graph.edges[id];
  const at = e ? line_layer(graph, id) : id;
  const steps = at ? path(graph, at).map((b) => shown_name(graph, b.id)) : [];
  const end = (x: Id) => shown_name(graph, owner_of(graph, x));
  const last = e ? `${end(e.from)} → ${end(e.to)}` : steps.pop();
  return (
    <div className="trail">
      {steps.map((s, i) => <span key={i}>{s}</span>)}
      {last ? <b>{last}</b> : null}
    </div>
  );
}
