/** Scene → React Flow, and nothing else. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background, BackgroundVariant, Controls, NodeToolbar, Panel, Position,
  ReactFlow, ReactFlowProvider, SelectionMode, ViewportPortal, useEdgesState,
  useNodesState, useReactFlow, useStore,
  type Node, type NodeChange, type OnSelectionChangeFunc,
} from "@xyflow/react";
import type { Id, Point, Side, Spot } from "@mnd/core";
import { box_of, extent, holds, nearest_seat, perch_id, FRAME, PORT, UNIT, type BoxNode, type Frame,
         type LineEdge } from "@mnd/views";
import { NamingContext } from "@mnd/theme";
import { CellsContext, DRAGGED, NODE_TYPES } from "./nodes";

import { EDGE_TYPES, Heads } from "./Wire";

import type { Adjust, FlowViewProps, Gesture, Landing } from "./gestures";
import { BAND, chosen, edges_of, FIT, FLIGHT, marked, met_on, MIN_ZOOM, nodes_of, NUDGE, panelled,
         signature, still } from "./arrays";
import { kind_of, middle, spread, type Grip } from "./pointer";
import { Sweeping } from "./Sweeping";

export type { Adjust, FlowViewProps, Gesture, Landing };
export { DRAGGED };

/** The four walls, in the order they are drawn. */
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

function Canvas(props: FlowViewProps) {
  const { scene, picked = [], onGesture, onRelate, onSweep, onAdjust, onPick, onDrop,
          said, chrome = true, lattice = false, frame: framed = true } = props;
  const flow = useReactFlow();
  /** What the stable callbacks read instead of closing over a render. */
  const latest = useRef({ picked, onPick, key: "" });

  /** How much room there is to draw in. */
  const seen = useStore(useCallback((st) => ({ w: st.width, h: st.height }), []),
                        (a, b) => a.w === b.w && a.h === b.h);
  /** The room, kept until the layer or panel changes or the work outgrows it. */
  const kept = useRef<{ of: Id | null; seen: string; room: Frame } | null>(null);
  const frame = useMemo(() => {
    const f = scene.frame;
    if (!f) { kept.current = null; return null; }
    const held = kept.current;
    const seen_key = `${seen.w}x${seen.h}`;
    const holds = held !== null && held.of === scene.layer && held.seen === seen_key
      && f.x >= held.room.x && f.y >= held.room.y
      && f.x + f.w <= held.room.x + held.room.w
      && f.y + f.h <= held.room.y + held.room.h;
    const room = holds
      ? { ...held!.room, label: f.label, ports: f.ports,
          ...(f.side ? { side: f.side } : {}), ...(f.seats ? { seats: f.seats } : {}) }
      : panelled(f, seen);
    kept.current = { of: scene.layer, seen: seen_key, room };
    return met_on(room, scene);
  }, [scene, seen]);

  /** The same band on every side. */
  const fit = useMemo(() => (frame && seen.w > BAND * 2
    ? { padding: (BAND * 2) / (seen.w - BAND * 2), maxZoom: 1 }
    : FIT), [frame, seen.w]);

  /** Bumped to redraw from the projection when a drop changed nothing. */
  const [resync, again] = useState(0);

  /** React Flow keeps its own copy of the arrays, kept in step here. */
  const [nodes, set_nodes, moved] = useNodesState<BoxNode>(nodes_of(scene, picked, frame));
  /** Edge changes must be applied too, or a line cannot be picked. */
  const [edges, set_edges, rewired] = useEdgesState<LineEdge>(edges_of(scene, picked));
  const key = `${signature(scene, frame)}~${resync}`;
  latest.current = { picked, onPick, key };

  /** Which drawing the installed arrays are of. */
  const installed = useRef(key);

  /** What the canvas last reported as selected, so it is never written back. */
  const reported = useRef(chosen(picked));

  /** The camera flight on descending or leaving: the only animation. */
  const was = useRef<Id | null | undefined>(undefined);
  /** How big the room was; a room that grew is fitted again. */
  const room = useRef<string>("");
  /** What was drawn a moment ago, where a descent's flight starts. */
  const drawn = useRef<readonly BoxNode[]>([]);

  /** Fit the room, leaving the band. */
  const settle = useCallback((duration: number) => {
    if (!frame) { void flow.fitView({ ...FIT, duration }); return; }
    void flow.fitBounds({ x: frame.x, y: frame.y, width: frame.w, height: frame.h },
                        { padding: fit.padding, duration });
  }, [flow, frame, fit]);

  useEffect(() => {
    const quiet = still();
    const last = was.current;
    const moved_layer = last !== undefined && last !== scene.layer;
    const rect = frame ? `${frame.x},${frame.y},${frame.w},${frame.h}` : "";
    const grew = !moved_layer && room.current !== rect;
    was.current = scene.layer;
    room.current = rect;

    const before = drawn.current;
    drawn.current = scene.nodes;
    set_nodes(nodes_of(scene, picked, frame));
    set_edges(edges_of(scene, picked));
    installed.current = key;
    reported.current = chosen(picked);

    if (grew) { settle(quiet ? 0 : FLIGHT); return; }
    if (!moved_layer) return;
    if (quiet) { settle(0); return; }
    /** Both ways start on the card and end on the room. */
    const back = last ? scene.nodes.find((n) => n.id === last) : undefined;
    const into = before.find((n) => n.id === scene.layer);
    if (back) {
      const b = box_of(back);
      void flow.fitBounds({ x: b.x, y: b.y, width: b.w, height: b.h }, { duration: 0 });
    } else if (into && frame) {
      const b = box_of(into);
      const vp = flow.getViewport();
      const on = { x: b.x * vp.zoom + vp.x, y: b.y * vp.zoom + vp.y,
                   w: b.w * vp.zoom, h: b.h * vp.zoom };
      const zoom = Math.max(MIN_ZOOM, on.w / frame.w);
      void flow.setViewport({
        zoom,
        x: on.x - frame.x * zoom,
        y: (on.y + on.h / 2) - (frame.y + frame.h / 2) * zoom,
      }, { duration: 0 });
    }
    settle(FLIGHT);
    /** The signature says when the drawing changed. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** At the root, the camera opens out when the drawing outgrows it. */
  const took = useRef<{ of: Id | null; box: string } | null>(null);
  useEffect(() => {
    if (frame || !nodes.length || nodes.some((n) => n.dragging)) return;
    const box = extent(scene);
    const size = `${box.x},${box.y},${box.w},${box.h}`;
    const before = took.current;
    took.current = { of: scene.layer, box: size };
    if (!before || before.of !== scene.layer || before.box === size) return;
    const vp = flow.getViewport();
    const shown = { x: -vp.x / vp.zoom, y: -vp.y / vp.zoom,
                    w: seen.w / vp.zoom, h: seen.h / vp.zoom };
    const fits = box.x >= shown.x && box.y >= shown.y
      && box.x + box.w <= shown.x + shown.w && box.y + box.h <= shown.y + shown.h;
    if (fits) return;
    void flow.fitView({ ...FIT, duration: still() ? 0 : FLIGHT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, frame]);

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

  /** Where the pointer is on the drawing, unsnapped. */
  const at = useCallback((e: { clientX: number; clientY: number }): Point =>
    flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }, { snapToGrid: false }),
    [flow]);

  const say = useCallback((on: string | null, e: React.MouseEvent,
                          button: "left" | "right", count: 1 | 2) => {
    /** The press that drew something is not also a click on what it began on. */
    if (swallow.current) return;
    const kind = kind_of(scene, on, e.target);
    /** Which wall and how far along, for a border pointed at. */
    const box = kind === "frame" ? frame
      : kind === "box" || kind === "brim" ? scene.nodes.find((n) => n.id === on) : null;
    const seat = box ? nearest_seat("w" in box ? box : box_of(box as BoxNode), at(e)) : null;
    /** A cell gesture carries its grid and address. */
    const el_at = e.target instanceof Element
      ? e.target.closest(".mnd-grid-cell")?.getAttribute("data-at") : null;
    const spot = kind === "cell" && el_at && on
      ? { group: on, r: Number(el_at.split(",")[0]), c: Number(el_at.split(",")[1]) }
      : null;
    const given = spot ?? (seat
      ? { side: seat.side, at: seat.at, ...(kind === "brim" ? { owner: on } : {}) }
      : null);
    /** A chip's name belongs to the block it stands for. */
    const el = e.target instanceof Element ? e.target : null;
    const chip = kind === "name" ? el?.closest("[data-cell]")?.getAttribute("data-cell") : null;
    onGesture?.({
      on: kind === "title" || kind === "frame" ? scene.layer : chip ?? on,
      kind, button, count, at: at(e), screen: { x: e.clientX, y: e.clientY },
      ...(given ? { given } : {}),
    });
  }, [onGesture, scene, at, frame]);

  /** A gesture said without a pointer, for controls like the open button. */
  const tell = useCallback((on: string, count: 1 | 2) => {
    const n = scene.nodes.find((x) => x.id === on);
    const b = n ? box_of(n) : { x: 0, y: 0, w: 0, h: 0 };
    const p = flow.flowToScreenPosition({ x: b.x, y: b.y });
    onGesture?.({ on, kind: kind_of(scene, on), button: "left", count,
                  at: { x: b.x, y: b.y }, screen: p });
  }, [scene, flow, onGesture]);

  /** The right button draws: from a card a relationship, across the ground a grid. */
  const drew = useRef<
    { x: number; y: number; on: string | null; side?: Side; cell?: boolean } | null>(null);
  const [drawing, draw] = useState<
    { from: Point; to: Point; on: string | null } | null>(null);
  /** Set after a draw, so the context menu that follows is ignored. */
  const swallow = useRef(false);

  /** The node under a page point, and the room wall where that is the frame. */
  const over = useCallback((x: number, y: number): { on: string | null; side?: Side } => {
    const el = document.elementFromPoint(x, y);
    const rim = el instanceof Element ? el.closest(".mnd-rim") : null;
    if (rim) {
      const side = SIDES.find((s) => rim.classList.contains(`mnd-rim-${s}`));
      return { on: FRAME, ...(side ? { side } : {}) };
    }
    /** A line is somewhere a tie can end, at its middle. */
    const line = el instanceof Element ? el.closest(".react-flow__edge, .mnd-wire-name") : null;
    const run = line?.getAttribute("data-id") ?? line?.getAttribute("data-edge");
    if (run) return { on: run };
    const node = el instanceof Element ? el.closest(".react-flow__node") : null;
    const id = node?.getAttribute("data-id") ?? null;
    /** A relationship never ends on a holder. */
    if (id && scene.nodes.some((n) => n.id === id && (holds(n)))) {
      return { on: null };
    }
    return { on: id === FRAME ? null : id };
  }, [scene]);

  const pressed = useCallback((e: React.PointerEvent) => {
    swallow.current = false;
    if (e.button !== 2) return;
    /** A press that began on a cell is not a sweep. */
    const el = e.target instanceof Element ? e.target : null;
    drew.current = { x: e.clientX, y: e.clientY, ...over(e.clientX, e.clientY),
                     ...(el?.closest(".mnd-grid-cell") ? { cell: true } : {}) };
  }, [over]);

  const moved_to = useCallback((e: React.PointerEvent) => {
    const from = drew.current;
    if (!from) return;
    if (!drawing && Math.hypot(e.clientX - from.x, e.clientY - from.y) < NUDGE) return;
    draw({ from: at({ clientX: from.x, clientY: from.y }), to: at(e), on: from.on });
  }, [drawing, at]);

  const released = useCallback((e: React.PointerEvent) => {
    const from = drew.current;
    drew.current = null;
    const was = drawing;
    draw(null);
    if (!from || e.button !== 2 || !was) return;
    swallow.current = true;
    const to = over(e.clientX, e.clientY);
    /** An end on the room's wall is an end on the open layer. */
    const began = from.on === FRAME ? scene.layer : from.on;
    const landed = to.on === FRAME ? scene.layer : to.on;
    if (began && landed && landed !== began) {
      /** The wall let go on is the wall the line meets. */
      onRelate?.(began, landed, {
        ...(from.on === FRAME && from.side ? { fromSide: from.side } : {}),
        ...(to.on === FRAME && to.side ? { toSide: to.side } : {}),
      });
      return;
    }
    if (!from.on && !to.on && !from.cell) onSweep?.(spread(was.from, was.to));
  }, [drawing, over, onRelate, onSweep, at, scene.layer]);

  /** What travels with a dragged node: its seats, and a band's members. */
  const riders = useCallback((host: BoxNode): BoxNode[] => {
    const held = new Set<string>(host.type === "group"
      ? (host.data.carries ?? host.data.holds ?? []) : []);
    if (held.size) {
      for (const n of scene.nodes) if (n.data.on && held.has(n.data.on)) held.add(n.id);
    }
    return scene.nodes.filter((n) => n.data.on === host.id || held.has(n.id));
  }, [scene]);

  const landing_on = useCallback((id: string, at: Point) => {
    const dragged = scene.nodes.find((n) => n.id === id);
    const parent = new Map<string, string>();
    for (const n of scene.nodes) {
      if (n.type === "group" && n.data.holds) {
        for (const h of n.data.holds) parent.set(h, n.id);
      }
    }
    /** A group cannot be filed into itself or its descendants. */
    const nest_ok = (into: string) => {
      if (id === into) return false;
      if (dragged?.type !== "group") return true;
      let at: string | undefined = into;
      const seen = new Set<string>();
      while (at) {
        if (at === id) return false;
        if (seen.has(at)) break;
        seen.add(at);
        at = parent.get(at);
      }
      return true;
    };
    const under = (n: BoxNode) => {
      const o = box_of(n);
      return at.x >= o.x && at.x <= o.x + o.w && at.y >= o.y && at.y <= o.y + o.h;
    };
    const lands = scene.nodes.filter((n) =>
      n.id !== id && !n.data.on && n.selectable !== false && n.type !== "note" && under(n));
    /** A cell is offered to a block only. */
    const gridLand = dragged && holds(dragged) ? null
      : lands.find((n) => n.type === "grid") ?? null;
    const groupLand = lands.find((n) => n.type === "group" && nest_ok(n.id)) ?? null;
    const gridBox = gridLand ? box_of(gridLand) : null;
    const cell = gridLand && gridBox
      ? gridLand.data.grid?.find((c) => at.x >= gridBox.x + c.x && at.x <= gridBox.x + c.x + c.w
                                 && at.y >= gridBox.y + c.y && at.y <= gridBox.y + c.y + c.h)
      : undefined;
    const into = cell ? gridLand : groupLand;
    return { over: lands.find((n) => !holds(n)) ?? null, into,
             ...(cell ? { cell: { r: cell.r, c: cell.c } } : {}) };
  }, [scene]);

  /** A node let go: where it came to rest decides the adjustment. */
  const dropped = useCallback((node: Node, dragged: readonly Node[]) => {
    /** A port in the room's wall slides along it. */
    const port = frame?.ports.find((p) => p.id === node.id);
    if (port && frame) {
      /** Read from the port's middle, not its corner. */
      const seat = nearest_seat(frame, { x: node.position.x + PORT.w / 2,
                                         y: node.position.y + PORT.h / 2 });
      onAdjust?.({ kind: "wall-seat", on: node.id, side: seat.side, at: seat.at });
      again((n) => n + 1);
      return;
    }
    const drawn = scene.nodes.find((n) => n.id === node.id);
    if (!drawn) return;

    /** An interface is seated, never filed. */
    if (drawn.data.on) {
      onAdjust?.({ kind: "move", on: node.id, to: node.position,
                   over: null, into: null });
      again((n) => n + 1);
      return;
    }

    const b = box_of(drawn);

    /** A holder may be filed into another. */
    if (holds(drawn)) {
      const land = landing_on(node.id, { x: node.position.x + b.w / 2,
                                         y: node.position.y + b.h / 2 });
      onAdjust?.({ kind: "move", on: node.id, to: node.position,
                   over: null, into: land.into?.id ?? null,
                   ...(land.cell ? { cell: land.cell } : {}) });
      return;
    }

    /** A sweep dragged is every card of it put down. */
    const many = dragged.filter((d) => d.id !== node.id && d.type !== "seat");
    if (many.length) {
      const at = [{ id: node.id, to: node.position },
                  ...many.map((d) => ({ id: d.id, to: d.position }))];
      onAdjust?.({ kind: "place", at });
      return;
    }

    /** A card dropped on a card files inside it. */
    const land = landing_on(node.id, { x: node.position.x + b.w / 2,
                                       y: node.position.y + b.h / 2 });
    onAdjust?.({ kind: "move", on: node.id, to: node.position,
                 over: land.over?.id ?? null, into: land.into?.id ?? null,
                 ...(land.cell ? { cell: land.cell } : {}) });
  }, [scene, frame, landing_on, riders, onAdjust]);

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

  /** Applies React Flow's changes, carrying seats with their cards and reporting resizes. */
  const changed = useCallback((cs: NodeChange<BoxNode>[]) => {
    /** An interface travels with the card it is seated on. */
    const carried: NodeChange<BoxNode>[] = [];
    /** A node the library already moves carries itself. */
    const own = new Set(cs.filter((c) => c.type === "position").map((c) => c.id));
    for (const c of cs) {
      if (c.type !== "position" || !c.position) continue;
      const host = scene.nodes.find((n) => n.id === c.id);
      if (!host) continue;
      const was = box_of(host);
      const dx = c.position.x - was.x;
      const dy = c.position.y - was.y;
      if (!dx && !dy) continue;
      for (const n of riders(host)) {
        if (own.has(n.id)) continue;
        const b = box_of(n);
        carried.push({ id: n.id, type: "position", dragging: c.dragging,
                       position: { x: b.x + dx, y: b.y + dy } });
      }
    }
    moved(carried.length ? [...cs, ...carried] : cs);
    for (const c of cs) {
      if (c.type !== "dimensions" || c.resizing !== false || !c.dimensions) continue;
      const n = scene.nodes.find((x) => x.id === c.id);
      if (!n || n.type === "group") continue;
      onAdjust?.({ kind: "size", on: c.id, to: n.position,
                   w: Math.round(c.dimensions.width),
                   h: Math.round(c.dimensions.height) });
    }
  }, [moved, scene, riders, onAdjust]);

  /** Where the ends of the picked relationships sit. */
  const grips = useMemo((): Grip[] => {
    if (!picked.length) return [];
    const chosen = new Set(picked);
    const at = new Map(scene.nodes.map((n) => [n.id, box_of(n)]));
    /** The room is a border like a card's. */
    if (frame) at.set(FRAME, frame);
    /** Where the line meets the grown room's wall. */
    const met = new Map((frame?.seats ?? []).map((t) => [t.id, t]));
    const out: Grip[] = [];
    for (const p of scene.perches) {
      if (!chosen.has(p.edge)) continue;
      const box = at.get(p.on);
      if (!box) continue;
      const seat = p.on === FRAME ? met.get(perch_id(p.edge, p.end)) ?? p : p;
      out.push({ key: `${p.edge}-${p.end}`, edge: p.edge, end: p.end, on: p.on,
                 side: seat.side, at: seat.at, ...middle(box, seat) });
    }
    return out;
  }, [scene, picked, frame]);

  /** Where a hidden interface is, while its line or card is picked. */
  const berths = useMemo((): Point[] => {
    if (!picked.length) return [];
    const chosen = new Set(picked);
    const tied = new Set<string>();
    for (const e of scene.edges) {
      if (chosen.has(e.id)) { tied.add(e.source); tied.add(e.target); }
    }
    const out: Point[] = [];
    for (const n of scene.nodes) {
      if (!n.data.marks.includes("berth")) continue;
      if (!tied.has(n.id) && !(n.data.on && chosen.has(n.data.on))) continue;
      const b = box_of(n);
      out.push({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    }
    return out;
  }, [scene, picked]);

  /** What a dragged card would land in, lit while dragging. */
  const [landing, land] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const dragging = useCallback((node: Node) => {
    const drawn = scene.nodes.find((n) => n.id === node.id);
    if (!drawn) return;
    const b = box_of(drawn);
    /** The same question the drop asks, so what is lit is what will happen. */
    const land_on = landing_on(node.id, { x: node.position.x + b.w / 2,
                                          y: node.position.y + b.h / 2 });
    /** A group is never filed into a card. */
    if (drawn.type === "group") {
      land(land_on.into && land_on.into.type === "group" ? box_of(land_on.into) : null);
      return;
    }
    const on = land_on.over ?? land_on.into;
    land(on ? box_of(on) : null);
  }, [scene, landing_on]);

  /** The grip being dragged and where it has got to. */
  const [grabbed, grab] = useState<{ key: string; at: Point } | null>(null);

  /** A grip let go on another block relinks that end. */
  const anchored = useCallback((g: Grip, e: { clientX: number; clientY: number }) => {
    const to = at(e);
    /** The innermost block under the point. */
    const landed = [...scene.nodes].reverse().find((n) => {
      if (n.id === g.on || n.selectable === false
          || holds(n)) return false;
      const b = box_of(n);
      return to.x >= b.x && to.x <= b.x + b.w && to.y >= b.y && to.y <= b.y + b.h;
    });
    if (landed) { onAdjust?.({ kind: "wall", on: g.edge, end: g.end, to: landed.id }); return; }
  }, [scene, at, onAdjust]);

  /** The one card a toolbar would belong to. */
  const only = useMemo(() => {
    if (picked.length !== 1) return null;
    const n = scene.nodes.find((x) => x.id === picked[0]);
    /** A boundary and a grid have no inside to open. */
    return n && !n.data.on && n.selectable !== false
      && !holds(n) && n.type !== "note" ? n.id : null;
  }, [picked, scene]);

  return (
    <ReactFlow
      className={framed ? "mnd-flow" : "mnd-flow frameless"}
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onNodesChange={changed}
      onEdgesChange={rewired}
      onSelectionChange={chose}
      fitView
      fitViewOptions={fit}
      minZoom={MIN_ZOOM}
      maxZoom={4}
      onPointerDown={pressed}
      onPointerMove={moved_to}
      onPointerUp={released}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(DRAGGED);
        if (!id) return;
        e.preventDefault();
        const spot = at(e);
        const land = landing_on(id, spot);
        onDrop?.(id, spot, { over: land.over?.id ?? null, into: land.into?.id ?? null,
                             ...(land.cell ? { cell: land.cell } : {}) });
      }}
      proOptions={{ hideAttribution: true }}
      /** Depth is the notation's, not the selection's. */
      elevateNodesOnSelect={false}
      elevateEdgesOnSelect={false}
      /** Left works what is there, right draws; the middle button pans. */
      panOnDrag={[1]}
      selectionOnDrag
      /** Shift does not start the library's selection. */
      selectionKeyCode={null}
      selectionMode={SelectionMode.Full}
      multiSelectionKeyCode={["Meta", "Control"]}
      /** Under five pixels a drag is a click. */
      nodeDragThreshold={5}
      /** The shell owns the keys, not the focused node. */
      nodesFocusable={false}
      edgesFocusable={false}
      /** Deleting is the app's. */
      deleteKeyCode={null}
      zoomOnDoubleClick={false}
      /** Relationships are drawn with the right button, not the library's connections. */
      nodesConnectable={false}
      onNodeDrag={(_, node) => dragging(node)}
      /** After every drag the arrays go back to what the projection says. */
      onNodeDragStop={(_, node, dragged) => {
        land(null);
        dropped(node, dragged);
        again((n) => n + 1);
      }}
      onNodeClick={(e, n) => say(n.id, e, "left", 1)}
      onNodeDoubleClick={(e, n) => say(n.id, e, "left", 2)}
      onNodeContextMenu={(e, n) => { e.preventDefault(); say(n.id, e, "right", 1); }}
      /** A right-click on a swept selection is about the card under it. */
      onSelectionContextMenu={(e, ns) => {
        e.preventDefault();
        say(ns[0]?.id ?? null, e, "right", 1);
      }}
      onEdgeClick={(e, edge) => say(edge.id, e, "left", 1)}
      onEdgeContextMenu={(e, edge) => { e.preventDefault(); say(edge.id, e, "right", 1); }}
      onPaneClick={(e) => say(null, e as React.MouseEvent, "left", 1)}
      /** A relationship's name is outside every node and edge, so its right-click is caught here. */
      onContextMenu={(e: React.MouseEvent) => {
        const wire = (e.target as HTMLElement).closest<HTMLElement>(".mnd-wire-name");
        const on = wire?.dataset["edge"];
        if (!on) return;
        e.preventDefault();
        say(on, e, "right", 1);
      }}
      onPaneContextMenu={(e) => {
        e.preventDefault();
        say(null, e as React.MouseEvent, "right", 1);
      }}
      onDoubleClick={(e: React.MouseEvent) => {
        /** Two clicks outside the room leave the layer. */
        const el = e.target as HTMLElement;
        /** Two clicks on a run or a node mean nothing here. */
        if (el.closest<HTMLElement>(".mnd-wire-name")) return;
        if (el.closest(".react-flow__node")) return;
        const p = at(e);
        const inside = frame && p.x >= frame.x && p.y >= frame.y
          && p.x <= frame.x + frame.w && p.y <= frame.y + frame.h;
        if (inside) return;
        say(null, e, "left", 2);
      }}
    >
      {/* One strip, and everything the app says goes to it. */}
      {said ? <Panel position="top-center" className="strip">{said}</Panel> : null}
      {/* An open button on the one picked card. */}
      {chrome && only ? (
        <NodeToolbar nodeId={only} isVisible position={Position.Top} className="mnd-tools">
          <button type="button" title="open this layer" onClick={() => tell(only, 2)}>
            open
          </button>
        </NodeToolbar>
      ) : null}
      {/* Where the card being dragged would land. */}
      {landing ? (
        <ViewportPortal>
          <div className="mnd-landing" style={{
            position: "absolute", left: landing.x, top: landing.y,
            width: landing.w, height: landing.h, pointerEvents: "none" }} />
        </ViewportPortal>
      ) : null}
      {/* What the right button is drawing, while it is being drawn. */}
      {drawing ? (
        <ViewportPortal>
          <svg className="mnd-drawing"
               style={{ position: "absolute", overflow: "visible", left: 0, top: 0,
                        pointerEvents: "none" }}>
            {drawing.on ? (
              <line className="mnd-drawn" x1={drawing.from.x} y1={drawing.from.y}
                    x2={drawing.to.x} y2={drawing.to.y} />
            ) : <Sweeping at={spread(drawing.from, drawing.to)} />}
          </svg>
        </ViewportPortal>
      ) : null}
      {/* The ends of what is picked, and the berths near it. */}
      {grips.length || berths.length ? (
        <ViewportPortal>
          {berths.map((b, i) => (
            <span key={`berth-${i}`} className="mnd-berth"
                  style={{ transform: `translate(-50%, -50%) translate(${b.x}px, ${b.y}px)` }} />
          ))}
          {grips.map((g) => {
            const to = grabbed?.key === g.key ? grabbed.at : g;
            return (
              <span key={g.key}
                    className={["mnd-anchor", "nodrag", "nopan",
                                grabbed?.key === g.key ? "held" : ""].filter(Boolean).join(" ")}
                    style={{ transform: `translate(-50%, -50%) translate(${to.x}px, ${to.y}px)` }}
                    title="drag to move this end along the border · double click to make it an interface"
                    /** A click on a grip must not reach the pane and drop the selection. */
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      grab({ key: g.key, at: g });
                    }}
                    onPointerMove={(e) => {
                      if (grabbed?.key !== g.key) return;
                      grab({ key: g.key, at: at(e) });
                    }}
                    onPointerUp={(e) => {
                      if (grabbed?.key !== g.key) return;
                      grab(null);
                      anchored(g, e);
                    }}
                    /** The grip's menu offers promoting this end. */
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      /** An end on the room's wall belongs to the open layer. */
                      onGesture?.({ on: g.edge, kind: "anchor", button: "right", count: 1,
                                    at: at(e), screen: { x: e.clientX, y: e.clientY },
                                    given: { end: g.end, edge: g.edge,
                                             owner: g.on === FRAME ? scene.layer : g.on,
                                             side: g.side, at: g.at } });
                    }} />
            );
          })}
        </ViewportPortal>
      ) : null}
      {/* The heads every run draws from. */}
      <Heads />
      {chrome ? <Background variant={BackgroundVariant.Dots} gap={UNIT} size={1} /> : null}
      {/* The unit, ruled as squares from the layer's origin. */}
      {chrome && lattice ? (
        <Background id="cells" variant={BackgroundVariant.Lines}
                    gap={UNIT} offset={UNIT / 2}
                    lineWidth={1} className="mnd-lattice" />
      ) : null}
      {chrome ? <Controls showInteractive={false} fitViewOptions={fit} /> : null}
    </ReactFlow>
  );
}

/** Each drawing gets its own React Flow provider and camera. */
export function FlowView({ naming = null, onNamed, ...props }: FlowViewProps) {
  /** The layer's own name is typed on the frame. */
  const typing = useMemo(() => ({
    id: naming === props.scene.layer ? FRAME : naming,
    done: (label: string | null) => onNamed?.(label),
  }), [naming, props.scene.layer, onNamed]);
  /** The same for the lattice: what is picked, and how to pick. */
  const { cells, onPickCells } = props;
  const picking = useMemo(() => ({
    picked: cells ?? EMPTY_CELLS,
    pick: (next: readonly Spot[]) => onPickCells?.(next),
  }), [cells, onPickCells]);
  return (
    <ReactFlowProvider>
      <NamingContext.Provider value={typing}>
        <CellsContext.Provider value={picking}>
          <Canvas {...props} />
        </CellsContext.Provider>
      </NamingContext.Provider>
    </ReactFlowProvider>
  );
}

/** One empty list, so the context never sees a fresh array. */
const EMPTY_CELLS: readonly Spot[] = [];
