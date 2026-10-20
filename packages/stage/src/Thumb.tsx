/** A drawing at a glance: a scene drawn by the canvas's own nodes and lines, fitted to its box,
 *  taking no input. The tray's overview shows a block's layer this way. */

import { useEffect, useMemo } from "react";
import { ReactFlow, ReactFlowProvider, useReactFlow, useStore } from "@xyflow/react";
import { routes_of, type Scene } from "@mnd/views";
import { edges_of, nodes_of } from "./arrays";
import { NODE_TYPES } from "./nodes";
import { EDGE_TYPES, Heads, RunsContext } from "./Wire";

/** `focus`, where given, is what the drawing is fitted to and picks: a block and the cards its
 *  lines join, on the layer it sits on. Unsaid, the whole scene. */
export type ThumbProps = { scene: Scene; focus?: readonly string[] };

/** How much air the fitted drawing keeps round it, as a share of the box; never drawn larger
 *  than the canvas draws it. */
const FIT = { padding: 0.08, maxZoom: 1 };

export function Thumb({ scene, focus }: ThumbProps) {
  const frame = scene.frame ?? null;
  const nodes = useMemo(() => nodes_of(scene, focus?.slice(0, 1) ?? [], frame),
                        [scene, frame, focus]);
  const fit = useMemo(() => (focus?.length ? { ...FIT, nodes: focus.map((id) => ({ id })) } : FIT),
                      [focus]);
  const edges = useMemo(() => edges_of(scene, []), [scene]);
  const runs = useMemo(() => routes_of({ ...scene, nodes }), [scene, nodes]);
  return (
    <ReactFlowProvider>
      <RunsContext.Provider value={runs}>
        <ReactFlow className="mnd-flow mnd-thumb" nodes={nodes} edges={edges}
                   nodeTypes={NODE_TYPES} edgeTypes={EDGE_TYPES}
                   fitView fitViewOptions={fit} minZoom={0.05}
                   nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
                   panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false}
                   zoomOnDoubleClick={false} preventScrolling={false}
                   proOptions={{ hideAttribution: true }}>
          <Heads />
          <Refit fit={fit} />
        </ReactFlow>
      </RunsContext.Provider>
    </ReactFlowProvider>
  );
}

/** Fits the drawing again whenever its box changes size, so it is never cropped or left small. */
function Refit({ fit }: { fit: Parameters<ReturnType<typeof useReactFlow>["fitView"]>[0] }) {
  const { fitView } = useReactFlow();
  const w = useStore((s) => s.width);
  const h = useStore((s) => s.height);
  useEffect(() => { void fitView(fit); }, [w, h, fit, fitView]);
  return null;
}
