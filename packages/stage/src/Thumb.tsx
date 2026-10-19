/** A drawing at a glance: a scene drawn by the canvas's own nodes and lines, fitted to its box,
 *  taking no input. The tray's overview shows a block's layer this way. */

import { useMemo } from "react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { routes_of, type Scene } from "@mnd/views";
import { edges_of, nodes_of } from "./arrays";
import { NODE_TYPES } from "./nodes";
import { EDGE_TYPES, Heads, RunsContext } from "./Wire";

export type ThumbProps = { scene: Scene };

/** How much air the fitted drawing keeps round it, as a share of the box; never drawn larger
 *  than the canvas draws it. */
const FIT = { padding: 0.08, maxZoom: 1 };

export function Thumb({ scene }: ThumbProps) {
  const frame = scene.frame ?? null;
  const nodes = useMemo(() => nodes_of(scene, [], frame), [scene, frame]);
  const edges = useMemo(() => edges_of(scene, []), [scene]);
  const runs = useMemo(() => routes_of({ ...scene, nodes }), [scene, nodes]);
  return (
    <ReactFlowProvider>
      <RunsContext.Provider value={runs}>
        <ReactFlow className="mnd-flow mnd-thumb" nodes={nodes} edges={edges}
                   nodeTypes={NODE_TYPES} edgeTypes={EDGE_TYPES}
                   fitView fitViewOptions={FIT} minZoom={0.05}
                   nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
                   panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false}
                   zoomOnDoubleClick={false} preventScrolling={false}
                   proOptions={{ hideAttribution: true }}>
          <Heads />
        </ReactFlow>
      </RunsContext.Provider>
    </ReactFlowProvider>
  );
}
