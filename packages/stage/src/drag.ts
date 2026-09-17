/** Dragging nodes: what travels along, what is lit, and the adjustment a drop makes. */

import { useCallback, useState } from "react";
import type { Node, NodeChange } from "@xyflow/react";
import type { Point } from "@mnd/core";
import { box_of, holds, nearest_seat, PORT, type BoxNode, type Frame, type Scene } from "@mnd/views";
import type { Adjust } from "./gestures";

type Box = { x: number; y: number; w: number; h: number };


export function useDrag(scene: Scene, frame: Frame | null,
                        moved: (cs: NodeChange<BoxNode>[]) => void,
                        onAdjust: ((adjust: Adjust) => void) | undefined, again: () => void) {
  /** What a dragged card would land in, lit while dragging. */
  const [landing, land] = useState<Box | null>(null);

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

  /** The landing a node's middle comes to rest on. */
  const centred = useCallback((node: Node, b: Box) =>
    landing_on(node.id, { x: node.position.x + b.w / 2, y: node.position.y + b.h / 2 }),
    [landing_on]);

  const dragging = useCallback((node: Node) => {
    const drawn = scene.nodes.find((n) => n.id === node.id);
    if (!drawn) return;
    /** The same question the drop asks, so what is lit is what will happen. */
    const land_on = centred(node, box_of(drawn));
    /** A group is never filed into a card. */
    if (drawn.type === "group") {
      land(land_on.into && land_on.into.type === "group" ? box_of(land_on.into) : null);
      return;
    }
    const on = land_on.over ?? land_on.into;
    land(on ? box_of(on) : null);
  }, [scene, centred]);

  /** A node let go: where it came to rest decides the adjustment. */
  const dropped = useCallback((node: Node, dragged: readonly Node[]) => {
    land(null);
    /** A port in the room's wall slides along it. */
    const port = frame?.ports.find((p) => p.id === node.id);
    if (port && frame) {
      /** Read from the port's middle, not its corner. */
      const seat = nearest_seat(frame, { x: node.position.x + PORT.w / 2,
                                         y: node.position.y + PORT.h / 2 });
      onAdjust?.({ kind: "wall-seat", on: node.id, side: seat.side, at: seat.at });
      return;
    }
    const drawn = scene.nodes.find((n) => n.id === node.id);
    if (!drawn) return;

    /** An interface is seated, never filed. */
    if (drawn.data.on) {
      onAdjust?.({ kind: "move", on: node.id, to: node.position, over: null, into: null });
      return;
    }

    /** A holder may be filed into another. */
    if (holds(drawn)) {
      const rest = centred(node, box_of(drawn));
      onAdjust?.({ kind: "move", on: node.id, to: node.position,
                   over: null, into: rest.into?.id ?? null,
                   ...(rest.cell ? { cell: rest.cell } : {}) });
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
    const rest = centred(node, box_of(drawn));
    onAdjust?.({ kind: "move", on: node.id, to: node.position,
                 over: rest.over?.id ?? null, into: rest.into?.id ?? null,
                 ...(rest.cell ? { cell: rest.cell } : {}) });
  }, [scene, frame, centred, onAdjust]);

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

  /** After every drag the arrays go back to what the projection says. */
  const stopped = useCallback((node: Node, dragged: readonly Node[]) => {
    dropped(node, dragged);
    again();
  }, [dropped, again]);

  return { landing, landing_on, dragging, stopped, changed };
}
