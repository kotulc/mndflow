/** React Flow's own copy of the arrays, kept in step with the Scene and the selection. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useEdgesState, useNodesState, type OnSelectionChangeFunc } from "@xyflow/react";
import type { Id } from "@mnd/core";
import { FRAME, type BoxNode, type Frame, type LineEdge, type Scene } from "@mnd/views";
import { chosen, edges_of, marked, nodes_of, signature } from "./arrays";


export function useSync(scene: Scene, picked: readonly Id[], frame: Frame | null,
                        onPick?: (ids: string[]) => void) {
  /** What the stable callbacks read instead of closing over a render. */
  const latest = useRef({ picked, onPick, key: "" });
  /** Bumped to redraw from the projection when a drop changed nothing. */
  const [resync, again] = useState(0);

  const [nodes, set_nodes, moved] = useNodesState<BoxNode>(nodes_of(scene, picked, frame));
  /** Edge changes must be applied too, or a line cannot be picked. */
  const [edges, set_edges, rewired] = useEdgesState<LineEdge>(edges_of(scene, picked));
  const key = `${signature(scene, frame)}~${resync}`;
  latest.current = { picked, onPick, key };

  /** Which drawing the installed arrays are of. */
  const installed = useRef(key);
  /** What the canvas last reported as selected, so it is never written back. */
  const reported = useRef(chosen(picked));

  useEffect(() => {
    set_nodes(nodes_of(scene, picked, frame));
    set_edges(edges_of(scene, picked));
    installed.current = key;
    reported.current = chosen(picked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** A pick made elsewhere, written onto the canvas. */
  const held = chosen(picked);
  useEffect(() => {
    if (held === reported.current) return;
    reported.current = held;
    const want = new Set<string>(picked);
    set_nodes((ns) => marked(ns, want));
    set_edges((es) => marked(es, want));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [held]);

  /** The one place selection is reported. */
  const chose: OnSelectionChangeFunc = useCallback(({ nodes: ns, edges: es }) => {
    /** Ignored while the arrays are a layer behind. */
    const { picked, onPick, key } = latest.current;
    if (installed.current !== key) return;
    const ids = [...ns.map((n) => n.id).filter((id) => id !== FRAME),
                 ...es.map((e) => e.id)];
    /** Said by the canvas, so it is already true of the canvas. */
    reported.current = chosen(ids);
    const same = ids.length === picked.length && ids.every((id) => picked.includes(id));
    if (!same) onPick?.(ids);
    /** Never rebuilt, since React Flow calls it again on every re-subscribe. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bump = useCallback(() => again((n) => n + 1), []);

  return { nodes, edges, moved, rewired, chose, key, again: bump };
}
