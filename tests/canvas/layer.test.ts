/** A mounted layer, so a relationship that does not draw can fail the suite.
 *
 *  Compose-only tests never catch C.2: the lists name the right handles, and
 *  the line is still missing until a reload. This mounts through T.5's harness
 *  the same way the canvas host rebuilds nodes — `restated` keeps `measured`,
 *  which is how a handle minted with its edge is a handle React Flow has
 *  never recorded. Properties only: an edge in the DOM after a link, one
 *  anchor per arriving relationship, a note still holding its handles. */

import { createElement, useEffect, useMemo } from "react";
import {
  ReactFlow, ReactFlowProvider, useEdgesState, useNodesState,
} from "@xyflow/react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { restated } from "../../src/canvas/sync";
import { fold } from "../../src/graph/fold";
import {
  edge, element, step, type Graph, type Mutation,
} from "../../src/graph/types";
import {
  EDGES, NODES, edgesOf, laidOf, nodesOf, stageOf,
} from "../../src/modules/view/diagram";

import "@xyflow/react/dist/style.css";

afterEach(cleanup);

const silent = () => {};
const ROOM = { w: 1180, h: 660 };

function drawn(...mutations: Mutation[]): Graph {
  return fold([step("", "test", mutations)]);
}

/** Two cards and a note; the note is already tied, so it has handles before
 *  the cards are related. A third card sits aside and takes no line. */
function scene() {
  const a = element("Pump", { x: 0, y: 0 });
  const b = element("Valve", { x: 240, y: 0 });
  const spare = element("Spare", { x: 0, y: 160 });
  const note = element("watch the seal", { form: "note", x: 240, y: 160 });
  const tie = edge(note.id, a.id);
  const link = edge(a.id, b.id, { form: "line" });
  const members: Mutation[] = [
    { op: "add_element", element: a },
    { op: "add_element", element: b },
    { op: "add_element", element: spare },
    { op: "add_element", element: note },
    { op: "link_elements", edge: tie },
  ];

  return {
    a, b, spare, note, link,
    graph: drawn(...members),
    linked: drawn(...members, { op: "link_elements", edge: link }),
  };
}

function Layer({ graph }: { graph: Graph }) {
  const view = null;
  const stage = useMemo(() => stageOf(graph, view, ROOM), [graph]);
  const laid = useMemo(
    () => laidOf(graph, stage, view, "none", false, () => true),
    [graph, stage],
  );
  const built = useMemo(() => nodesOf(graph, view, stage, laid, {
    unit: "block", axis: "none", showPorts: false, picked: null, grazed: null,
    dropping: null, joining: [], litSeats: new Set(), litEdges: new Set(),
    onPick: silent, onOpen: silent, onSlidePort: silent, onSlideAnchor: silent,
    onRename: silent, onNameAttr: silent, onSize: silent,
    onNameTaken: () => false, onSay: silent, onPromotePort: silent,
  }), [graph, stage, laid]);
  const builtEdges = useMemo(
    () => edgesOf(graph, view, stage, laid, false, null, () => true),
    [graph, stage, laid],
  );

  const [nodes, setNodes] = useNodesState(built);
  useEffect(() => {
    setNodes((current) => restated(current, built, null));
  }, [built, setNodes]);

  const [edges, setEdges] = useEdgesState(builtEdges);
  useEffect(() => setEdges(builtEdges), [builtEdges, setEdges]);

  return createElement("div", {
    className: "stage",
    style: { width: ROOM.w, height: ROOM.h },
  }, createElement(ReactFlow, {
    nodes,
    edges,
    nodeTypes: NODES,
    edgeTypes: EDGES,
    style: { width: "100%", height: "100%" },
  }));
}

function Host({ graph }: { graph: Graph }) {
  return createElement(ReactFlowProvider, null, createElement(Layer, { graph }));
}

function draw(graph: Graph) {
  const view = render(createElement(Host, { graph }));

  return {
    ...view,
    show: (next: Graph) => view.rerender(createElement(Host, { graph: next })),
  };
}

function node_of(root: HTMLElement, id: string): HTMLElement | null {
  return root.querySelector(`.react-flow__node[data-id="${id}"]`);
}

function arriving(graph: Graph, id: string): string[] {
  return Object.values(graph.edges)
    .filter((e) => e.source === id || e.target === id)
    .map((e) => e.id)
    .sort();
}

function anchors(el: HTMLElement | null): string[] {
  return [...(el?.querySelectorAll("[data-edge]") ?? [])]
    .map((n) => n.getAttribute("data-edge") ?? "")
    .filter(Boolean)
    .sort();
}

describe("a layer after a link mutation", () => {
  it("draws the new relationship without a reload", async () => {
    const { graph, linked, link } = scene();
    const { container, show } = draw(graph);

    await waitFor(() => {
      expect(container.querySelector(".react-flow__node")).toBeTruthy();
    });

    show(linked);

    await waitFor(() => {
      const drawn = container.querySelector(`.react-flow__edge[data-id="${link.id}"]`);
      if (!drawn) throw new Error("the relationship is not in the DOM");
    });
  });

  it("puts an anchor on a card for each relationship that arrives, and none otherwise", async () => {
    const { graph, linked, a, b, spare } = scene();
    const { container, show } = draw(graph);
    show(linked);

    await waitFor(() => {
      expect(node_of(container, a.id)).toBeTruthy();
    });

    expect(anchors(node_of(container, a.id))).toEqual(arriving(linked, a.id));
    expect(anchors(node_of(container, b.id))).toEqual(arriving(linked, b.id));
    expect(anchors(node_of(container, spare.id))).toEqual([]);
  });

  it("keeps a note's handles after cards are related", async () => {
    const { graph, linked, note } = scene();
    const { container, show } = draw(graph);

    await waitFor(() => {
      expect(node_of(container, note.id)?.querySelector(".react-flow__handle")).toBeTruthy();
    });

    show(linked);

    expect(node_of(container, note.id)?.querySelector(".react-flow__handle")).toBeTruthy();
  });
});
