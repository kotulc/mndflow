/** Graph canvas: one layer of the object graph, editable throughout.
 *
 *  Positions are held by React Flow while a drag is in progress and committed
 *  to the log on release — otherwise a node would not move until it landed.
 *
 *  The buttons divide the work. Left selects and moves: click to select, then
 *  drag what is selected, which is what makes a card, an interface and a group
 *  all movable by the same gesture. Right draws relationships, and a right
 *  click that never moves falls through to the default action for whatever is
 *  under it. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  MarkerType,
  SelectionMode,
  type Edge,
  type Node as FlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { blocksOf, groupsIn, nameOf } from "./core/fold";
import { LEAF, place, sizeOf } from "./core/layout";
import type { Graph, Side } from "./core/types";
import { Frame } from "./Frame";
import { Ghost } from "./Ghost";
import { GroupFrame } from "./GroupFrame";
import { LIFTED, NodeCard } from "./NodeCard";

const nodeTypes = { card: NodeCard, group: GroupFrame, frame: Frame, ghost: Ghost };

/** Room the layer's frame leaves around its contents, which is where the
 *  interfaces on its edge sit. */
const MARGIN = 96;
/** The least a layer's working area is ever worth, whatever the panel's shape
 *  will not go below. A frame is drawn from its contents, so a layer holding
 *  two cards would otherwise be a small box magnified to fill the panel — the
 *  same picture, with everything twice the size and no more room to work in. */
const LEAST = { w: 520, h: 320 };
/** The band left around a layer's frame, in screen pixels. It is where you
 *  double-click to leave, and where the parent's border shows when the layer
 *  is an interface, so it is the same on every side of every layer. */
const BAND = 34;
/** Room a group's boundary leaves around its members. */
const HUG = 22;
/** How far a right drag must travel before it is a relationship rather than a
 *  right click that wandered. */
const THRESHOLD = 12;
/** How near a card's border counts as being on it rather than inside it. */
const EDGE = 14;
/** How near the layer's own border counts as being on it. Its margin is wide,
 *  because that is where its interfaces sit, but the border is still a border:
 *  treating the whole margin as the edge lit the frame up from halfway across
 *  the canvas. */
const RIM = 30;

type Box = { x: number; y: number; w: number; h: number };

/** The box enclosing a set of boxes, grown by a margin. Null when there is
 *  nothing to enclose. */
function around(boxes: Box[], pad: number): Box | null {
  if (!boxes.length) return null;

  const x = Math.min(...boxes.map((b) => b.x)) - pad;
  const y = Math.min(...boxes.map((b) => b.y)) - pad;

  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) + pad - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) + pad - y,
  };
}

/** Which edge of a box faces a point — the side a relationship with no
 *  interface of its own leaves from. */
function facing(from: Box, to: Box): Side {
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.h / 2 - (from.y + from.h / 2);

  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";

  return dy > 0 ? "bottom" : "top";
}

/** Nearest edge of an element to a screen point, and how far along it. */
function nearestEdge(box: DOMRect, x: number, y: number): { side: Side; at: number } {
  const gaps = {
    left: x - box.left, right: box.right - x, top: y - box.top, bottom: box.bottom - y,
  };
  const side = (Object.keys(gaps) as Side[])
    .reduce((best, name) => (gaps[name] < gaps[best] ? name : best), "left" as Side);
  const along = side === "top" || side === "bottom"
    ? (x - box.left) / box.width
    : (y - box.top) / box.height;

  return { side, at: Math.min(Math.max(along, 0.04), 0.96) };
}

/** What the floating input is asking for. One prompt, several errands. */
type Prompt =
  | { kind: "node"; x: number; y: number; parent: string | null }
  | { kind: "sprout"; x: number; y: number; from: string; port?: string;
      seat?: { side: Side; at: number } }
  | { kind: "relation"; id: string }
  | { kind: "rename"; id: string };

/** A relationship being drawn, from the moment the right button goes down. */
type Wire = {
  from: string;
  /** An interface that already exists, rather than one this drag will make. */
  port?: string;
  seat: { side: Side; at: number };
  origin: { x: number; y: number };
  to: { x: number; y: number };
  live: boolean;
};

type Props = {
  graph: Graph;
  view: string | null;
  picked: { kind: "node" | "edge" | "attr"; id: string } | null;
  path: string[];
  touched: string[];
  showPorts: boolean;
  onShowPorts: (on: boolean) => void;
  angular: boolean;
  onAngular: (on: boolean) => void;
  onPick: (next: { kind: "node" | "edge" | "attr"; id: string } | null) => void;
  onOpen: (id: string | null) => void;
  onUp: () => void;
  onNest: (id: string, parent: string) => void;
  onPromote: (id: string, parent: string | null) => void;
  onCreate: (label: string, parent: string | null) => void;
  onCreateAt: (label: string, x: number, y: number) => void;
  onSprout: (from: string, label: string, x: number, y: number,
             port?: { parent: string; side: Side; at: number }) => void;
  onRename: (id: string, label: string) => void;
  onLift: (id: string, x: number, y: number) => void;
  onLink: (source: string, target: string, from?: string, to?: string) => void;
  onWire: (parent: string, side: Side, at: number, target: string, to?: string) => void;
  onAddPort: (parent: string | null, side: Side, at: number) => void;
  onSlidePort: (id: string, side: Side, at: number) => void;
  onDemotePort: (id: string, x: number, y: number) => void;
  onPromotePort: (id: string, parent: string, side: Side, at: number) => void;
  onRelation: (id: string, relation: string) => void;
  onPlaceMany: (moved: { id: string; x: number; y: number }[], what?: string) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
  onGroup: (members: string[]) => void;
  onNameGroup: (id: string, label: string) => void;
  onDropAttr: (id: string) => void;
  onPlaceGhost: (id: string, x: number, y: number) => void;
};

function Flow(props: Props) {
  const { graph, view, picked, path, touched, showPorts, onShowPorts, angular, onAngular } = props;
  const { onPick, onOpen, onUp, onNest, onPromote, onCreate, onCreateAt, onSprout } = props;
  const { onRename, onLift, onLink, onWire, onAddPort, onSlidePort, onRelation } = props;
  const { onDemotePort, onPromotePort } = props;
  const { onPlaceMany, onUnlink, onDelete, onGroup, onNameGroup, onDropAttr } = props;
  const { onPlaceGhost } = props;
  const flow = useReactFlow();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [wire, setWire] = useState<Wire | null>(null);
  /** What a dragged card is currently over, and what dropping would do. */
  const [dropping, setDropping] = useState<{ id: string; kind: "nest" | "port" } | null>(null);
  const dropRef = useRef<{ id: string; kind: "nest" | "port"; side: Side; at: number } | null>(null);
  /** True while the pointer is near the layer frame's border. */
  const [grazing, setGrazing] = useState(false);
  const heldRef = useRef<string | null>(null);
  /** Where a group's boundary sat when its drag began, so the distance its
   *  members travel is the distance it travelled. */
  const groupRef = useRef<{ id: string; x: number; y: number } | null>(null);
  /** Where the right button went down, whatever it went down on. */
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  /** The panel's own size, so a layer's floor takes its shape from the screen
   *  it is drawn on — a tall window wants a tall frame, not a wide one
   *  floating in the middle of it. */
  const [panel, setPanel] = useState({ w: 1180, h: 660 });

  useEffect(() => {
    const stage = surface.current;
    if (!stage) return;

    const watch = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setPanel({ w: width, h: height });
    });
    watch.observe(stage);

    return () => watch.disconnect();
  }, []);

  const members = useMemo(() => blocksOf(graph, view), [graph, view]);
  const marked = useMemo(() => new Set(touched), [touched]);
  const pickedNode = picked?.kind === "node" ? picked.id : null;

  /** Where everything in this layer sits, and how big it is — the one source
   *  the frame, the groups and the relation anchors all measure against. */
  const boxes = useMemo(() => {
    const spots = place(graph, members);
    const found: Record<string, Box> = {};

    for (const node of members) {
      const at = spots[node.id] ?? { x: 0, y: 0 };
      const size = sizeOf(graph, node);
      found[node.id] = { x: at.x, y: at.y, w: size.w, h: size.h };
    }

    return found;
  }, [graph, members, placementKey(members)]);

  /** The layer's own frame, with room on every side for its interfaces. */
  const frameBox = useMemo(() => {
    if (!view || !graph.nodes[view]) return null;

    const hug = around(Object.values(boxes), MARGIN) ?? { x: 0, y: 0, w: 0, h: 0 };

    // Shaped like the space it will be shown in, so that scaling it to fit
    // leaves the same band on every side. A frame of any other shape fits by
    // one axis and letterboxes on the other, which is why one layer sat in
    // generous bands top and bottom while the next had almost none.
    const shape = (panel.w - BAND * 2) / (panel.h - BAND * 2);
    let w = Math.max(hug.w, LEAST.w);
    let h = Math.max(hug.h, LEAST.h);
    w / h > shape ? (h = w / shape) : (w = h * shape);

    // ...and never smaller than the panel itself, so a sparse layer is roomy
    // rather than magnified. The floor shares the shape, so this keeps it.
    const floor = Math.max(1, (panel.w - BAND * 2) / w, (panel.h - BAND * 2) / h);
    w *= floor;
    h *= floor;

    return { x: hug.x + hug.w / 2 - w / 2, y: hug.y + hug.h / 2 - h / 2, w, h };
  }, [view, graph, boxes, panel]);

  /** A port dragged clear of its border lands where it was let go, so the
   *  point the pointer reports has to become a place on the canvas. */
  const demote = useCallback((id: string, x: number, y: number) => {
    const at = flow.screenToFlowPosition({ x, y });
    onDemotePort(id, at.x - LEAF.w / 2, at.y - LEAF.h / 2);
  }, [flow, onDemotePort]);

  /** Each group's boundary: the box round its members, plus a small margin.
   *  Its own, never the user's — the boundary follows what is in it. */
  const bands = useMemo(
    () => groupsIn(graph, view)
      .map(({ attr, here }) => ({
        attr,
        box: around(here.map((id) => boxes[id]).filter(Boolean), HUG)!,
      }))
      .filter((band) => band.box),
    [graph, view, boxes],
  );

  const built = useMemo<FlowNode[]>(() => {
    const cards = members.map((node) => ({
      id: node.id,
      type: "card",
      position: { x: boxes[node.id].x, y: boxes[node.id].y },
      data: {
        node,
        graph,
        changed: marked.has(node.id),
        dropping: dropping?.id === node.id && dropping.kind === "nest",
        porting: dropping?.id === node.id && dropping.kind === "port",
        picked: node.id === pickedNode,
        showPorts,
        pickedPort: pickedNode,
        onPick: (id: string) => onPick({ kind: "node", id }),
        onOpen,
        onSlidePort,
        onDemotePort: demote,
      },
    })) as FlowNode[];

    /** Placeholders for relations that leave the layer, stacked beside
     *  whichever end is visible so two of them never land on each other.
     *
     *  Only at the top level. Inside a frame they can only be drawn outside
     *  it — there is nowhere else for something that is not in the layer to
     *  go — and everything outside the frame is margin, so they pushed the
     *  frame down to a fraction of the panel. The layer's own room matters
     *  more than the reminder. */
    const here = new Set([...members.map((n) => n.id), ...(view ? [view] : [])]);
    const tally: Record<string, number> = {};
    const ghosts: FlowNode[] = [];

    for (const edge of view ? [] : Object.values(graph.edges)) {
      const outward = here.has(edge.source) && !here.has(edge.target);
      const inward = here.has(edge.target) && !here.has(edge.source);
      if (!outward && !inward) continue;

      const anchor = outward ? edge.source : edge.target;
      const far = outward ? edge.target : edge.source;
      if (!graph.nodes[far]) continue;

      const seat = boxes[anchor] ?? frameBox ?? { x: 0, y: 0, w: LEAF.w, h: LEAF.h };
      const nth = (tally[anchor] = (tally[anchor] ?? 0) + 1) - 1;
      const put = edge.gx !== undefined && edge.gy !== undefined
        ? { x: edge.gx, y: edge.gy }
        : { x: seat.x + seat.w + 150, y: seat.y + nth * (LEAF.h + 16) };

      ghosts.push({
        id: `ghost:${edge.id}`,
        type: "ghost",
        position: put,
        width: LEAF.w,
        height: LEAF.h,
        // Movable like anything else on the canvas, though what it moves is
        // only where the placeholder sits — the node it stands for lives in
        // another layer and is not touched.
        // Selectable so a click reaches it at all — the library routes clicks
        // only to nodes it considers selectable. What the click selects is the
        // node it stands for, not the stand-in.
        draggable: true,
        selectable: true,
        data: { label: nameOf(graph, graph.nodes[far]), target: far, onOpen },
      } as FlowNode);
    }

    const groups = bands.map(({ attr, box }) => {
      const chosen = picked?.kind === "attr" && picked.id === attr.id;

      return {
        id: attr.id,
        type: "group",
        position: { x: box.x, y: box.y },
        // Stated rather than measured: a node stays invisible *and unclickable*
        // until React Flow has measured it, and a drag reads its baseline from
        // `measured` specifically, so both are given here.
        width: box.w,
        height: box.h,
        // Transparent to the pointer until picked, so a box drawn inside the
        // boundary reaches the pane and selects elements rather than sweeping
        // the group in. Stated inline because React Flow's own stylesheet
        // claims `pointer-events: all` on every node at the same specificity a
        // rule of ours would have. Its label opts back in on its own.
        style: { width: box.w, height: box.h, pointerEvents: chosen ? "all" : "none" },
        // Only once picked, so a stray drag across the canvas cannot shift a
        // group nobody was pointing at.
        draggable: chosen,
        selectable: false,
        data: {
          label: attr.name,
          color: attr.color,
          picked: chosen,
          onPick: () => onPick({ kind: "attr", id: attr.id }),
          onLabel: (label: string) => onNameGroup(attr.id, label),
        },
      } as FlowNode;
    });

    const frame: FlowNode[] = frameBox && view
      ? [{
          id: view,
          type: "frame",
          position: { x: frameBox.x, y: frameBox.y },
          // Stated width and height are enough to make it visible; `measured`
          // is deliberately left for React Flow to fill in, because supplying
          // it makes the library skip measuring the node — and measuring is
          // also when it records where the handles are. Given one, every
          // relation attached to this frame's interfaces silently vanished.
          width: frameBox.w,
          height: frameBox.h,
          // Transparent to the pointer, or it would cover the whole layer and
          // no drag on empty canvas could ever reach the pane to draw a
          // selection box. Its ports opt back in; its edge is found by
          // position instead, in `under` below.
          style: { width: frameBox.w, height: frameBox.h, pointerEvents: "none" },
          draggable: false,
          selectable: false,
          data: {
            id: view,
            graph,
            straddles: graph.nodes[view]?.side ?? null,
            showPorts,
            pickedPort: pickedNode,
            onPick: (id: string) => onPick({ kind: "node", id }),
            onOpen,
            onSlidePort,
            onDemotePort: demote,
            grazed: grazing,
          },
        } as FlowNode]
      : [];

    // Order is depth: the frame behind everything, then group boundaries, then
    // the cards and the placeholders that stand beside them.
    return [...frame, ...groups, ...cards, ...ghosts];
  }, [graph, members, boxes, bands, frameBox, view, marked, dropping, pickedNode, picked,
      showPorts, grazing, onPick, onOpen, onSlidePort, demote, onNameGroup]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(built);

  // React Flow owns positions during a drag; the graph owns them otherwise.
  // The card being dragged keeps the position React Flow is giving it, or
  // hovering over a drop target would snap it back to where it started.
  useEffect(() => {
    setNodes((current) => {
      const held = heldRef.current ?? groupRef.current?.id;
      const chosen = new Map(current.map((n) => [n.id, n.selected]));

      return built.map((n) => {
        const same = { ...n, selected: chosen.get(n.id) ?? false };
        const at = n.id === held ? current.find((c) => c.id === held)?.position : null;

        return at ? { ...same, position: at } : same;
      });
    });
  }, [built, setNodes]);

  /** Edges as the graph describes them, before React Flow adds selection. */
  const builtEdges: Edge[] = useMemo(() => {
    const here = new Set([...members.map((n) => n.id), ...(view ? [view] : [])]);

    /** The handle one end attaches to: its own interface where it has one,
     *  otherwise the side of the card that faces the other end. */
    const anchor = (owner: string, port: string | undefined, other: Box | null) => {
      // With interfaces hidden there is no port to attach to, so the relation
      // falls back to the side of the card facing the other end — drawn as
      // before, meeting the frame edge where its port would have been.
      if (showPorts && port && graph.nodes[port] && graph.nodes[port].parent === owner) {
        return `port-${port}`;
      }

      const mine = boxes[owner] ?? frameBox;
      if (!mine || !other) return "auto-right";

      return `auto-${facing(mine, other)}`;
    };

    return Object.values(graph.edges)
      .map((edge) => {
        const sourceHere = here.has(edge.source);
        const targetHere = here.has(edge.target);
        if (!sourceHere && !targetHere) return null;

        // One end elsewhere: the visible end keeps its anchor, the other
        // attaches to the placeholder standing in for what it reaches.
        const away = !sourceHere || !targetHere;
        // No placeholder to hang it from inside a frame, so nothing to draw.
        if (away && view) return null;
        const source = sourceHere ? edge.source : `ghost:${edge.id}`;
        const target = targetHere ? edge.target : `ghost:${edge.id}`;
        if (away && !graph.nodes[sourceHere ? edge.target : edge.source]) return null;

        const sourceBox = boxes[edge.source] ?? (edge.source === view ? frameBox : null);
        const targetBox = boxes[edge.target] ?? (edge.target === view ? frameBox : null);
        const forward = edge.dir === "forward" || edge.dir === "both";
        const back = edge.dir === "back" || edge.dir === "both";
        const tint = marked.has(edge.target) ? "#4ade80" : "#3f6552";
        const head = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: tint };

        return {
          id: edge.id,
          source,
          target,
          label: edge.relation,
          type: angular ? "smoothstep" : "default",
          markerEnd: forward ? head : undefined,
          markerStart: back ? head : undefined,
          sourceHandle: sourceHere
            ? `${anchor(edge.source, edge.from, targetBox)}-s`
            : "ghost-s",
          targetHandle: targetHere
            ? `${anchor(edge.target, edge.to, sourceBox)}-t`
            : "ghost-t",
          // Stated on the edge rather than left to the container's defaults,
          // so a relation is always clickable and always deletable.
          selectable: true,
          focusable: true,
          interactionWidth: 18,
          className: away ? "crossing" : "",
          selected: picked?.kind === "edge" && picked.id === edge.id,
          style: marked.has(edge.source) && marked.has(edge.target)
            ? { stroke: "#4ade80", strokeWidth: 2 }
            : { stroke: "#2f4a3e", strokeDasharray: away ? "4 3" : undefined },
        } as Edge;
      })
      .filter((e): e is Edge => e !== null);
  }, [graph, members, boxes, frameBox, view, marked, angular, picked, showPorts]);

  // Edges need their own change handler for the same reason nodes do: without
  // one React Flow has nowhere to record a selection.
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(builtEdges);
  useEffect(() => setEdges(builtEdges), [builtEdges, setEdges]);

  // Refit on a layer change, and when the layer gains or loses something.
  // Deliberately *not* keyed on the selection: selecting is a glance, and a
  // canvas that chases every click is impossible to work on.
  const population = members.map((n) => n.id).sort().join(",");
  useEffect(() => {
    const timer = setTimeout(() => {
      // At the top level there is no frame, so the contents are what is fitted.
      if (!view || !frameBox) {
        flow.fitView({ duration: 320, padding: 0.16, maxZoom: 1.3 });

        return;
      }

      // Inside a layer it is the frame that is placed, not the contents: the
      // frame is the working area, and the band around it is what you
      // double-click to leave by. Set directly rather than fitted, because a
      // fit spends its padding on one axis and lets the other take whatever is
      // left — the band has to be the same all the way round.
      const scale = Math.min((panel.w - BAND * 2) / frameBox.w,
                             (panel.h - BAND * 2) / frameBox.h);
      const zoom = Math.max(0.15, Math.min(scale, 1.6));

      flow.setViewport({
        zoom,
        x: panel.w / 2 - (frameBox.x + frameBox.w / 2) * zoom,
        y: panel.h / 2 - (frameBox.y + frameBox.h / 2) * zoom,
      }, { duration: 320 });
    }, 40);

    return () => clearTimeout(timer);
  }, [flow, view, population, panel.w, panel.h, frameBox]);

  /** How far the canvas may be panned: the layer, plus room on every side to
   *  put something new. It grows as the layer does. */
  const extent = useMemo<[[number, number], [number, number]]>(() => {
    const outer = frameBox ?? around(Object.values(boxes), MARGIN)
                           ?? { x: -260, y: -140, w: 520, h: 280 };
    // Inside a frame, only enough to reach past its edge — that is the gesture
    // for pushing a card up a layer, and beyond it there is nothing to see.
    const room = frameBox ? MARGIN * 2 : 520;

    return [[outer.x - room, outer.y - room],
            [outer.x + outer.w + room, outer.y + outer.h + room]];
  }, [boxes, frameBox]);

  /** Where a dragged card would land: inside another card, or on its edge.
   *
   *  Its own middle decides, not the pointer — you aim with the card you can
   *  see. Over the middle of another card it goes inside; over the border it
   *  becomes an interface there, which is the same gesture the spec gives for
   *  promoting a node onto a frame edge. */
  const landing = useCallback(
    (dragged: FlowNode) => {
      const size = sizeOf(graph, graph.nodes[dragged.id]);
      const mid = { x: dragged.position.x + size.w / 2, y: dragged.position.y + size.h / 2 };

      for (const [id, box] of Object.entries(boxes)) {
        if (id === dragged.id) continue;

        const near = Math.max(box.x - mid.x, mid.x - (box.x + box.w),
                              box.y - mid.y, mid.y - (box.y + box.h));
        if (near > EDGE) continue;

        const seat = nearestEdge(
          new DOMRect(box.x, box.y, box.w, box.h), mid.x, mid.y,
        );

        // The border is a band, not a line, so aiming at it is a gesture
        // rather than a feat of precision — measured per axis, since a card is
        // far wider than it is tall and one band for both would make its long
        // sides as hard to hit as its short ones. Capped by a third of the
        // card, so there is always a middle left to drop into.
        const across = Math.min(mid.x - box.x, box.x + box.w - mid.x);
        const down = Math.min(mid.y - box.y, box.y + box.h - mid.y);
        const rim = across < Math.min(30, box.w / 3) || down < Math.min(30, box.h / 3);

        return rim ? { kind: "port" as const, id, ...seat }
                   : { kind: "nest" as const, id, side: seat.side, at: seat.at };
      }

      return null;
    },
    [graph, boxes],
  );

  /** The card, port or frame under a screen point, as ids. The frame is
   *  transparent to the pointer, so its edge is found by measuring instead:
   *  inside the layer's box but outside the contents it encloses. */
  const under = useCallback((x: number, y: number) => {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;

    // With several nodes selected the library lays its own rectangle over
    // them, which answers the hit test before any card does. Pointing at it is
    // pointing at the selection.
    if (element?.closest(".react-flow__nodesselection")) {
      return { id: null, kind: "selection" as const, port: null, box: null };
    }

    const port = element?.closest(".port") as HTMLElement | null;
    const host = element?.closest(".react-flow__node") as HTMLElement | null;
    const kind = host?.classList.contains("react-flow__node-card") ? "card"
               : host?.classList.contains("react-flow__node-frame") ? "frame"
               : host?.classList.contains("react-flow__node-group") ? "group"
               : null;

    if (host && kind) {
      return { id: host.dataset.id ?? null, kind, port: port?.dataset.port ?? null,
               box: host.getBoundingClientRect() };
    }

    // Nothing of ours under the pointer: it may still be the layer's own edge.
    if (view && frameBox) {
      const at = flow.screenToFlowPosition({ x, y });
      const inside = at.x >= frameBox.x && at.x <= frameBox.x + frameBox.w &&
                     at.y >= frameBox.y && at.y <= frameBox.y + frameBox.h;
      const near = Math.min(at.x - frameBox.x, frameBox.x + frameBox.w - at.x,
                            at.y - frameBox.y, frameBox.y + frameBox.h - at.y) < RIM;

      if (inside && near) {
        const corner = flow.flowToScreenPosition({ x: frameBox.x, y: frameBox.y });
        const far = flow.flowToScreenPosition({ x: frameBox.x + frameBox.w,
                                                y: frameBox.y + frameBox.h });

        return {
          id: view,
          kind: "frame" as const,
          port: null,
          box: new DOMRect(corner.x, corner.y, far.x - corner.x, far.y - corner.y),
        };
      }
    }

    return { id: null, kind: null, port: null, box: null };
  }, [view, frameBox, flow]);

  /** What a right click does where a menu is not built yet: the default entry
   *  of the menu that will replace it. */
  const fallback = useCallback((x: number, y: number) => {
    const hit = under(x, y);
    const chosen = nodes.filter((n) => n.selected).map((n) => n.id);

    // On a selection of several: group them, which is the one thing a right
    // click on more than one node could reasonably mean. Only *on* it, though —
    // a right click elsewhere is about whatever is under the cursor, and a
    // selection left over from a moment ago should not swallow it.
    const onSelection = hit.kind === "selection" || (hit.id !== null && chosen.includes(hit.id));
    if (chosen.length > 1 && onSelection) return onGroup(chosen);

    const at = flow.screenToFlowPosition({ x, y });

    if (hit.kind === "card" && hit.id && hit.box) {
      // Near the border it is the frame edge, and a frame edge makes ports.
      const { side, at: along } = nearestEdge(hit.box, x, y);
      const close = Math.min(x - hit.box.left, hit.box.right - x,
                             y - hit.box.top, hit.box.bottom - y) < EDGE;

      return close ? onAddPort(hit.id, side, along)
                   : setPrompt({ kind: "node", x: at.x, y: at.y, parent: hit.id });
    }

    // The frame is only ever met at its edge — `under` says so or says nothing.
    if (hit.kind === "frame" && hit.id && hit.box) {
      const { side, at: along } = nearestEdge(hit.box, x, y);

      return onAddPort(hit.id, side, along);
    }

    setPrompt({ kind: "node", x: at.x - LEAF.w / 2, y: at.y - LEAF.h / 2, parent: null });
  }, [under, nodes, flow, onGroup, onAddPort]);

  // Shortcuts the canvas owns. Inside a field the field's own editing wins,
  // and Esc abandons whatever is half-drawn — prompt or relationship alike.
  useEffect(() => {
    function press(event: KeyboardEvent) {
      if (event.key === "Escape") return (setWire(null), setPrompt(null), onPick(null));
      if ((event.target as HTMLElement).closest("input, textarea")) return;

      const chosen = nodes.filter((n) => n.selected).map((n) => n.id);

      if (event.key === "Enter" && pickedNode) {
        event.preventDefault();

        return setPrompt({ kind: "rename", id: pickedNode });
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();

        return chosen.length > 1 ? onGroup(chosen) : undefined;
      }

      // The library deletes what it has selected, which is cards and relations.
      // An interface, or a group boundary, is selected by us and not by it, so
      // it has to be removed here or Delete would appear to do nothing.
      if (event.key === "Delete" || event.key === "Backspace") {
        if (picked?.kind === "attr") return (event.preventDefault(), onDropAttr(picked.id));
        if (picked?.kind === "edge") return (event.preventDefault(), onUnlink(picked.id));
        if (pickedNode && !nodes.some((n) => n.id === pickedNode && n.type === "card")) {
          event.preventDefault();

          return onDelete(pickedNode);
        }
      }
    }

    window.addEventListener("keydown", press);

    return () => window.removeEventListener("keydown", press);
  }, [nodes, pickedNode, onGroup, onPick]);

  /** The right button, from press to release. Below the threshold it is a
   *  click and falls through to the default action; past it, a relationship
   *  is being drawn and an interface appears at the edge it started from. */
  function rightDown(event: React.PointerEvent) {
    if (event.button !== 2) return;

    // Recorded whatever is underneath, so that a right click over empty canvas
    // still reaches its default action even though there is nothing there to
    // draw a relationship from.
    pressRef.current = { x: event.clientX, y: event.clientY };

    const hit = under(event.clientX, event.clientY);
    if (!hit.id || (hit.kind !== "card" && hit.kind !== "frame")) return;

    const seat = nearestEdge(hit.box!, event.clientX, event.clientY);
    const origin = { x: event.clientX, y: event.clientY };

    setWire({
      from: hit.id,
      port: hit.port ?? undefined,
      seat,
      origin,
      to: origin,
      live: false,
    });
  }

  function rightMove(event: React.PointerEvent) {
    // The frame is transparent to the pointer, so :hover cannot reach it — its
    // border lights up from here instead, the same way a card's does.
    if (view && frameBox) {
      const hit = under(event.clientX, event.clientY);
      setGrazing(hit.kind === "frame");
    } else if (grazing) {
      setGrazing(false);
    }

    if (!wire) return;

    const to = { x: event.clientX, y: event.clientY };
    const far = Math.hypot(to.x - wire.origin.x, to.y - wire.origin.y) > THRESHOLD;

    setWire({ ...wire, to, live: wire.live || far });
  }

  function rightUp(event: React.PointerEvent) {
    if (event.button !== 2) return;

    const down = pressRef.current;
    const held = wire;
    pressRef.current = null;
    setWire(null);

    // Never past the threshold, or never on anything to draw from: a right
    // click, and a right click runs the default action for what is under it.
    if (!held?.live) {
      const moved = down && Math.hypot(event.clientX - down.x, event.clientY - down.y);

      if (down && moved! <= THRESHOLD) fallback(event.clientX, event.clientY);

      return;
    }

    const hit = under(event.clientX, event.clientY);
    const landed = hit.kind === "card" || hit.kind === "frame" ? hit.id : null;

    // Released on an interface: that interface is the far anchor, so a
    // relation between two ports meets both of them rather than guessing a
    // side for the end it landed on.
    if (landed && landed !== held.from) {
      const to = hit.port ?? undefined;

      return held.port
        ? onLink(held.from, landed, held.port, to)
        : onWire(held.from, held.seat.side, held.seat.at, landed, to);
    }

    // Nothing under it: make the far end where it was let go, and attach.
    const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setPrompt({
      kind: "sprout",
      x: at.x - LEAF.w / 2,
      y: at.y - LEAF.h / 2,
      from: held.from,
      port: held.port,
      seat: held.port ? undefined : held.seat,
    });
  }

  return (
    <div
      className="stage"
      ref={surface}
      onPointerDown={rightDown}
      onPointerMove={rightMove}
      onPointerUp={rightUp}
      onPointerLeave={() => setGrazing(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="crumbs">
        <button onClick={() => onOpen(null)} className={view ? "" : "here"}>
          {graph.title || "project"}
        </button>
        {path.map((id, index) => (
          <span key={id}>
            <span className="sep">/</span>
            <button onClick={() => onOpen(id)} className={index === path.length - 1 ? "here" : ""}>
              {graph.nodes[id]?.label}
            </button>
          </span>
        ))}
        {view && (
          <button className="up" onClick={onUp} title="Up one layer">
            ↑
          </button>
        )}
      </div>

      <div className="arrange">
        <button
          className={showPorts ? "on" : ""}
          onClick={() => onShowPorts(!showPorts)}
          title="Interfaces on the canvas"
        >
          {showPorts ? "□ interfaces" : "· interfaces"}
        </button>
        <button
          className={angular ? "on" : ""}
          onClick={() => onAngular(!angular)}
          title="Right angles instead of curves"
        >
          {angular ? "⌐ angles" : "~ curves"}
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        minZoom={0.15}
        // Double-click has its own meaning here — step in, or step back out —
        // so the library's own double-click-to-zoom would fight it.
        zoomOnDoubleClick={false}
        nodesDraggable
        // Relationships are the right button's business, drawn by hand below;
        // the handles here are anchors for geometry, not grab points.
        nodesConnectable={false}
        // Middle button only. The right button draws relationships, and while
        // the library also had it the pan handler captured the pointer first —
        // the canvas slid away and no line was ever drawn.
        panOnDrag={[1]}
        selectionOnDrag
        // A box takes what it encloses. Anything it merely brushes past — the
        // group boundary it was drawn inside, most of all — is left alone.
        selectionMode={SelectionMode.Full}
        panOnScroll
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        elementsSelectable
        edgesFocusable
        // Backspace alone is the library's default, which is why Delete
        // appeared to do nothing to a selected node or relation.
        deleteKeyCode={["Delete", "Backspace"]}
        translateExtent={extent}
        onNodeClick={(_, node) => {
          if (node.type === "card") return onPick({ kind: "node", id: node.id });
          // A placeholder is not a thing in itself: picking it picks whatever
          // it reaches, so the panel shows the node and not the stand-in.
          if (node.type === "ghost") {
            return onPick({ kind: "node", id: (node.data as { target: string }).target });
          }
          // The frame is the layer itself, and the layer is what an empty
          // selection already shows.
          if (node.type === "frame") return onPick(null);
        }}
        onNodeDoubleClick={(_, node) => node.type === "card" && onOpen(node.id)}
        onEdgeClick={(_, edge) => onPick({ kind: "edge", id: edge.id })}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(LIFTED)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          const lifted = event.dataTransfer.getData(LIFTED);
          if (!lifted) return;

          event.preventDefault();
          const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          onLift(lifted, at.x - LEAF.w / 2, at.y - LEAF.h / 2);
        }}
        onPaneClick={(event) => {
          setPrompt(null);

          // A group's boundary is transparent to the pointer until it has been
          // selected, so that a box drawn inside it reaches the pane instead
          // of sweeping the group in. The click that selects it therefore
          // arrives here, and is placed rather than caught: the tightest
          // boundary the click lands in wins, so an inner group is always the
          // one you can reach.
          const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          const inside = bands
            .filter(({ box }) => at.x >= box.x && at.x <= box.x + box.w &&
                                 at.y >= box.y && at.y <= box.y + box.h)
            .sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h);

          onPick(inside.length ? { kind: "attr", id: inside[0].attr.id } : null);
        }}
        onDoubleClick={(event) => {
          const on = (what: string) => (event.target as HTMLElement).closest(what);
          if (on(".react-flow__node") || on(".react-flow__edge") || on(".floating")) return;
          if (!view || !frameBox) return;

          // Only *outside* the frame is "leave". The frame is transparent to
          // the pointer, so every double-click on empty canvas arrives here,
          // including the ones inside the layer — which were stepping out of
          // a layer the user was working in.
          const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          const out = at.x < frameBox.x || at.x > frameBox.x + frameBox.w ||
                      at.y < frameBox.y || at.y > frameBox.y + frameBox.h;

          if (out) onUp();
        }}
        onNodeDragStart={(_, node) => {
          if (node.type === "group") {
            groupRef.current = { id: node.id, x: node.position.x, y: node.position.y };

            return;
          }

          heldRef.current = node.id;
        }}
        onNodeDrag={(_, node) => {
          if (node.type !== "card") return;

          // Only re-render when the target actually changes, not every pixel.
          const hit = landing(node);
          if (hit?.id === dropRef.current?.id && hit?.kind === dropRef.current?.kind) return;

          dropRef.current = hit;
          setDropping(hit && { id: hit.id, kind: hit.kind });
        }}
        onNodeDragStop={(_, node, dragged) => {
          // A group's boundary carries its members: whatever it travelled,
          // they travelled, in one action.
          const start = groupRef.current;
          if (node.type === "group" && start && start.id === node.id) {
            groupRef.current = null;
            const dx = node.position.x - start.x;
            const dy = node.position.y - start.y;
            const mine = graph.attrs[node.id]?.holders ?? [];
            const moved = mine
              .filter((id) => boxes[id])
              .map((id) => ({ id, x: boxes[id].x + dx, y: boxes[id].y + dy }));

            return onPlaceMany(moved, `moved group of ${moved.length}`);
          }

          if (node.type === "ghost") {
            return onPlaceGhost(node.id.slice("ghost:".length),
                                node.position.x, node.position.y);
          }

          // Worked out again from where the card actually came to rest. The
          // ref behind the hover indicator is a frame or two stale by now, and
          // the last inch of a drag is exactly where the answer changes.
          const into = node.type === "card" ? landing(node) : null;
          dropRef.current = null;
          heldRef.current = null;
          setDropping(null);

          // On another card's border: it becomes an interface there. Inside
          // it: that card becomes its container.
          if (into?.kind === "port") {
            return onPromotePort(node.id, into.id, into.side, into.at);
          }

          if (into) return onNest(node.id, into.id);

          // Pushed past the edge of the frame, while inside a layer: it
          // belongs to whatever contains this layer. The card's own middle is
          // what counts, not the pointer — you aim with the card you can see.
          if (view && frameBox) {
            const size = sizeOf(graph, graph.nodes[node.id]);
            const x = node.position.x + size.w / 2;
            const y = node.position.y + size.h / 2;
            const out = x < frameBox.x || x > frameBox.x + frameBox.w ||
                        y < frameBox.y || y > frameBox.y + frameBox.h;
            if (out) return onPromote(node.id, graph.nodes[view]?.parent ?? null);
          }

          // A selection dragged together lands together.
          const moved = (dragged?.length ? dragged : [node])
            .filter((n) => n.type === "card")
            .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
          onPlaceMany(moved);
        }}
        onEdgeDoubleClick={(_, edge) => setPrompt({ kind: "relation", id: edge.id })}
        // A placeholder is a drawing of something elsewhere; deleting it here
        // would mean deleting a node in another layer, which is not what the
        // key was pressed for.
        onNodesDelete={(gone) =>
          gone.filter((node) => node.type === "card").forEach((node) => onDelete(node.id))}
        onEdgesDelete={(gone) => gone.forEach((edge) => onUnlink(edge.id))}
      >
        <Background gap={22} size={1} />
        <Controls />
      </ReactFlow>

      {/* The relationship as it is being drawn, in screen coordinates so it
          needs nothing from the viewport transform to stay under the cursor. */}
      {wire?.live && (
        <svg className="wiring">
          <line
            x1={wire.origin.x - (surface.current?.getBoundingClientRect().left ?? 0)}
            y1={wire.origin.y - (surface.current?.getBoundingClientRect().top ?? 0)}
            x2={wire.to.x - (surface.current?.getBoundingClientRect().left ?? 0)}
            y2={wire.to.y - (surface.current?.getBoundingClientRect().top ?? 0)}
          />
        </svg>
      )}

      {prompt?.kind === "relation" && (
        <div className="floating">
          <span className="caret">&gt;</span>
          <input
            autoFocus
            defaultValue={graph.edges[prompt.id]?.relation ?? ""}
            placeholder="what is this relation?"
            list="relation-kinds"
            onKeyDown={(event) => {
              if (event.key === "Enter") onRelation(prompt.id, event.currentTarget.value);
              if (event.key === "Enter" || event.key === "Escape") setPrompt(null);
            }}
          />
          <datalist id="relation-kinds">
            {graph.relations.map((name) => <option key={name} value={name} />)}
          </datalist>
          <button onClick={() => (onUnlink(prompt.id), setPrompt(null))} title="Remove it">
            ✕
          </button>
        </div>
      )}

      {prompt?.kind === "rename" && (
        <div className="floating">
          <span className="caret">✎</span>
          <input
            autoFocus
            defaultValue={graph.nodes[prompt.id]?.label ?? ""}
            placeholder="rename it"
            onBlur={() => setPrompt(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onRename(prompt.id, event.currentTarget.value);
              if (event.key === "Enter" || event.key === "Escape") setPrompt(null);
            }}
          />
        </div>
      )}

      {(prompt?.kind === "node" || prompt?.kind === "sprout") && (
        <div className="floating">
          <span className="caret">+</span>
          <input
            autoFocus
            placeholder={prompt.kind === "sprout" ? "name the thing it connects to" : "name it"}
            onBlur={() => setPrompt(null)}
            onKeyDown={(event) => {
              const text = event.currentTarget.value.trim();
              if (event.key === "Enter" && text) {
                if (prompt.kind === "sprout") {
                  onSprout(prompt.from, text, prompt.x, prompt.y,
                           prompt.seat ? { parent: prompt.from, ...prompt.seat } : undefined);
                } else if (prompt.parent) {
                  onCreate(text, prompt.parent);
                } else {
                  onCreateAt(text, prompt.x, prompt.y);
                }
              }
              if (event.key === "Enter" || event.key === "Escape") setPrompt(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Identity for the placement inputs, so a re-render only reflows when a
 *  position actually changed. */
function placementKey(members: { id: string; x: number | null; y: number | null }[]) {
  return members.map((n) => `${n.id}:${n.x},${n.y}`).join("|");
}

export function Canvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
