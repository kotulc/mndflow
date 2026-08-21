/** Layer list composition: graph + geometry → React Flow nodes and edges.
 *
 *  The host mounts the lists and wires gestures; this module owns how a layer
 *  becomes those lists — stacking, note sizing, seats, routes, and paint. */

import type { CSSProperties } from "react";
import type { Edge, Node as FlowNode } from "@xyflow/react";

import type { Picked } from "../../../actions";
import {
  blocksOf, groupsIn, nameOf, notesIn, portsOf, reachesReference, referenceIn,
  isTie, tiesOf, typeName,
} from "../../../graph/fold";
import { around, CELL, cell, HUG, place, sizeOf } from "../../../geometry/layout";
import {
  attach, lanes, route as planRoute, runOf, type Box, type Seat,
} from "../../../geometry/route";
import {
  element, type Axis, type EdgeForm, type Element, type Graph, type Side, type Spot,
} from "../../../graph/types";
import { lookOf } from "../../style";
import { framed } from "./surround";
import { paint } from "./paint";
import { anchorOf, type Grazed, type Seated } from "./pieces";

/** A note's drawn size, used only to decide which of its sides a leader leaves
 *  by. Its real height is its text's; being a few pixels out picks the same
 *  side of four either way. */
export const NOTE = { w: 168, h: 40 };

/** Stacking among canvas pieces. Edges live in their own layer and sit above
 *  every node (see `.react-flow__edges` in styles); within the node layer,
 *  cards sit over group bands, notes sit over cards, and interfaces sit over
 *  their host via CSS. */
export const DEPTH = { frame: 0, group: 1, card: 2, note: 3, edge: 4 } as const;

/** Half an interface mark, in canvas units. A mark straddles the border it sits
 *  on, so a run ending on the border runs to the middle of its own square and
 *  pokes out inside it. Ending on the outer face instead, the line meets the
 *  interface rather than piercing it. */
const MARK = 5.5;

/** One relationship's geometry, worked out rather than stored: the whole run,
 *  ends included, and the edge of each card it leaves by. */
export type Laid = {
  points: Spot[];
  fromSide: Side;
  toSide: Side;
};

/** A group's boundary as drawn: the attribute and the box round its members. */
export type Band = { attr: Element; box: Box };

/** Where everything in a layer sits before it becomes React Flow lists. */
export type Stage = {
  members: Element[];
  notes: Element[];
  boxes: Record<string, Box>;
  noteBoxes: Box[];
  frameBox: Box | null;
  bands: Band[];
  /** Where an unplaced note rests after `relax` — below the cards. */
  noteRest: Spot;
};

/** Seats already in use on one card: the ports somebody made by hand, plus
 *  whatever this pass has derived so far. */
type Used = Record<string, Seat[]>;

/** Handlers the node list closes over — steadied by the host. */
export type NodeReach = {
  unit: string;
  axis: Axis;
  showPorts: boolean;
  picked: Picked;
  grazed: Grazed;
  dropping: string | null;
  joining: string[];
  litSeats: Set<string>;
  litEdges: Set<string>;
  onPick: (next: Picked) => void;
  onOpen: (id: string | null) => void;
  onSlidePort: (id: string, side: Side, at: number) => void;
  onSlideAnchor: (edge: string, end: "from" | "to", side: Side, at: number) => void;
  onRename: (id: string, label: string) => void;
  onNameAttr: (id: string, label: string) => void;
  onSize: (id: string, w: number, h: number) => void;
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  onSay: (message: string) => void;
  onPromotePort: (edge: string, end: "from" | "to", owner: string,
                  side: Side, at: number) => void;
};

/** Which edge of a box faces a point — the side a relationship with no
 *  interface of its own leaves from. */
function facing(from: Box, to: Box): Side {
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.h / 2 - (from.y + from.h / 2);

  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";

  return dy > 0 ? "bottom" : "top";
}

/** Which walls a flow relationship leaves and arrives by, given the layer's
 *  axis. Out on the forward face, in on the one behind — the convention the
 *  arrangement already reads by, so a flow line runs with the layer instead of
 *  doubling back across it. A free layer imposes nothing. */
function flowSides(axis: Axis): { from: Side; to: Side } | null {
  if (axis === "across") return { from: "right", to: "left" };
  if (axis === "down") return { from: "bottom", to: "top" };

  return null;
}

/** The seat somebody dragged an anchor to, when this end has no interface. */
function pinnedSeat(
  edge: { fromSide?: Side; toSide?: Side; fromAt?: number; toAt?: number },
  end: "from" | "to",
): Seat | undefined {
  const side = end === "from" ? edge.fromSide : edge.toSide;
  const at = end === "from" ? edge.fromAt : edge.toAt;
  if (side == null || at == null) return undefined;

  return { side, at };
}

/** Card boxes that a route must clear, excluding the two ends it attaches to. */
function obstaclesOf(boxes: Record<string, Box>, fromId: string, toId: string): Box[] {
  const skip = new Set([fromId, toId]);

  return Object.entries(boxes)
    .filter(([id]) => !skip.has(id))
    .map(([, box]) => box);
}

/** The seat a hand-made interface holds, when this end has one on this card.
 *
 *  A port belonging to the far node does not count where a reference is
 *  standing in for it: the reference is a different card, and the seat means
 *  nothing on it. */
function pinnedAt(graph: Graph, port: string | undefined, owner: string): Seat | undefined {
  const node = port ? graph.elements[port] : undefined;
  if (!node || node.parent !== owner) return undefined;

  return node.side != null && node.at != null ? { side: node.side, at: node.at } : undefined;
}

/** Seats a card starts the pass with: every interface on it that somebody
 *  placed. Everything else on that card is derived and claimed as it goes. */
function seatsOn(graph: Graph, owner: string): Seat[] {
  return portsOf(graph, owner)
    .filter((p) => p.side != null && p.at != null)
    .map((p) => ({ side: p.side!, at: p.at! }));
}

/** Where one relationship meets its two ends, and the corners between.
 *
 *  A hand-made interface pins its end; every other end is free, and the router
 *  picks a seat that faces the path and that nothing else has taken. */
function planEdge(
  graph: Graph,
  edge: { source: string; target: string; from?: string; to?: string; form?: EdgeForm;
          fromSide?: Side; toSide?: Side },
  boxes: Record<string, Box>,
  view: string | null,
  frameBox: Box | null,
  used: Used,
  axis: Axis = "none",
  solid: Box[] = [],
) {
  const fromBox = boxes[edge.source] ?? (edge.source === view ? frameBox : null);
  const toBox = boxes[edge.target] ?? (edge.target === view ? frameBox : null);
  if (!fromBox || !toBox) return null;

  // A flow's ends read as in and out, so they take the sides the layer's axis
  // gives them. Not on the frame, whose walls all face inward and whose sides
  // mean the opposite of a card's.
  const sides = edge.form === "directed" && edge.source !== view && edge.target !== view
    ? flowSides(axis)
    : null;

  // A wall somebody chose beats the one the axis would have given, the same way
  // a card the user placed beats where layout would have put it.
  const sideFrom = edge.fromSide ?? sides?.from;
  const sideTo = edge.toSide ?? sides?.to;

  return planRoute(
    fromBox,
    toBox,
    [...obstaclesOf(boxes, edge.source, edge.target), ...solid],
    {
      pinFrom: pinnedAt(graph, edge.from, edge.source) ?? pinnedSeat(edge, "from"),
      pinTo: pinnedAt(graph, edge.to, edge.target) ?? pinnedSeat(edge, "to"),
      sideFrom,
      sideTo,
      fromTaken: used[edge.source] ?? [],
      toTaken: used[edge.target] ?? [],
      // Inside an open layer, paths stay in the frame — never skirt outside.
      bounds: frameBox ?? undefined,
      inwardFrom: edge.source === view,
      inwardTo: edge.target === view,
    },
  );
}

/** Identity for the placement inputs, so a re-render only reflows when a
 *  position actually changed. */
export function placementKey(members: { id: string; x: number | null; y: number | null }[]) {
  return members.map((n) => `${n.id}:${n.x},${n.y}`).join("|");
}

/** Where everything in this layer sits, and how big it is — the one source
 *  the frame, the groups and the relation anchors all measure against. */
export function stageOf(graph: Graph, view: string | null, seen: { w: number; h: number }): Stage {
  const members = blocksOf(graph, view);
  const notes = notesIn(graph, view);

  /** A note occupies space like a card does, so nothing is laid on top of one
   *  and no line is drawn through one. It is not a node, so it is neither
   *  arranged nor connected — only avoided. Hand-placed notes only: after
   *  `relax` clears spots, resting notes are drawn below the cards and are
   *  not obstacles until somebody places them again. */
  const noteBoxes = notes
    .filter((attr) => attr.x != null && attr.y != null)
    .map((attr) => ({
      x: cell(attr.x!),
      y: cell(attr.y!),
      w: Math.max(NOTE.w, cell(attr.w ?? 0)),
      h: Math.max(NOTE.h, cell(attr.h ?? 0)),
    }));

  const spots = place(graph, members, noteBoxes);
  const boxes: Record<string, Box> = {};
  for (const node of members) {
    const at = spots[node.id] ?? { x: 0, y: 0 };
    const size = sizeOf(graph, node);
    boxes[node.id] = { x: at.x, y: at.y, w: size.w, h: size.h };
  }

  const frameBox = view && graph.elements[view]
    ? framed(Object.values(boxes), seen)
    : null;

  /** Each group's boundary: the box round its members, plus a small margin.
   *  Its own, never the user's — the boundary follows what is in it. */
  const bands = groupsIn(graph, view)
    .map(({ attr, here }) => ({
      attr,
      box: around(here.map((id) => boxes[id]).filter(Boolean), HUG)!,
    }))
    .filter((band) => band.box);

  /** Where an unplaced note rests after `relax` — below the cards, display
   *  only, until a drag writes a place. Same idea as `place` filling unplaced
   *  cards without writing them. */
  const hug = around(Object.values(boxes), CELL);
  const noteRest = hug
    ? { x: hug.x, y: hug.y + hug.h + CELL }
    : { x: 0, y: 0 };

  return { members, notes, boxes, noteBoxes, frameBox, bands, noteRest };
}

/** The node standing in for one that lives elsewhere, so a relationship
 *  reaching out of the layer is drawn against what is actually here. */
export function standInOf(graph: Graph, view: string | null, members: Element[], id: string) {
  if (id === view || members.some((n) => n.id === id)) return id;

  return referenceIn(graph, view, id)?.id ?? null;
}

/** Every relationship's geometry for this layer, worked out in one pass.
 *
 *  Seats are derived here and nowhere else. A port is a node only where
 *  somebody made one; everywhere else, where a line meets a card is a fact
 *  about this layer's arrangement rather than something stored, so it is
 *  worked out afresh whenever the arrangement changes and never written to
 *  the log. One pass, so each edge sees the seats the ones before it took and
 *  no two ends land in the same seat. */
export function laidOf(
  graph: Graph,
  stage: Stage,
  view: string | null,
  axis: Axis,
  showPorts: boolean,
  shows: (edge: { type: string }) => boolean,
): { runs: Record<string, Laid>; seats: Record<string, Seated[]> } {
  const { members, notes, boxes, frameBox, noteBoxes, noteRest } = stage;
  const used: Used = {};
  const runs: Record<string, Laid> = {};
  const seats: Record<string, Seated[]> = {};

  const claim = (owner: string, seat: Seat) => {
    used[owner] ??= seatsOn(graph, owner);
    used[owner].push(seat);
  };

  const standIn = (id: string) => standInOf(graph, view, members, id);

  for (const edge of Object.values(graph.edges)) {
    const source = standIn(edge.source);
    const target = standIn(edge.target);
    if (!source || !target || source === target) continue;
    // Hidden types claim no seats — otherwise a filter would leave orphan
    // handles where the line used to meet the card.
    if (!shows(edge)) continue;

    used[source] ??= seatsOn(graph, source);
    used[target] ??= seatsOn(graph, target);

    const ends = { ...edge, source, target };
    const planned = planEdge(graph, ends, boxes, view, frameBox, used, axis, noteBoxes);
    if (!planned) continue;

    // Only a flow end draws a square, so only a flow end has one to stop at.
    const drawsPort = showPorts && edge.form === "directed";

    const fromBox = boxes[source] ?? frameBox!;
    const toBox = boxes[target] ?? frameBox!;

    const points = runOf(
      attach(fromBox, planned.from.side, planned.from.at), planned.out,
      attach(toBox, planned.to.side, planned.to.at), planned.back,
      planned.corners,
    );

    if (drawsPort) {
      const last = points.length - 1;
      points[0] = { x: points[0].x + planned.out.x * MARK,
                    y: points[0].y + planned.out.y * MARK };
      points[last] = { x: points[last].x + planned.back.x * MARK,
                       y: points[last].y + planned.back.y * MARK };
    }

    runs[edge.id] = {
      points,
      fromSide: planned.from.side,
      toSide: planned.to.side,
    };

    for (const [owner, port, seat, end] of [
      [source, edge.from, planned.from, "from"],
      [target, edge.to, planned.to, "to"],
    ] as const) {
      // A hand-made interface is already on the card and already counted;
      // only a derived seat has to be claimed and drawn.
      if (pinnedAt(graph, port, owner)) continue;
      claim(owner, seat);
      const placed = end === "from" ? edge.fromAt != null : edge.toAt != null;
      (seats[owner] ??= []).push({
        edge: edge.id, end, side: seat.side, at: seat.at, port: drawsPort, placed,
      });
    }
  }

  // Ties meet a note on one side and a block on the other — no routed run,
  // but each end still needs the handle React Flow draws the leader through.
  for (const edge of Object.values(graph.edges)) {
    if (!isTie(graph, edge) || !shows(edge)) continue;

    const targetBox = boxes[edge.target];
    const note = graph.elements[edge.source];
    if (!note || note.form !== "note" || !targetBox) continue;

    const loose = notes.filter((n) => n.x == null || n.y == null).indexOf(note);
    const corner = noteCorner(note, noteRest, note.x == null || note.y == null ? loose : 0);
    const mine = {
      x: corner.x, y: corner.y,
      w: Math.max(NOTE.w, cell(note.w ?? 0)),
      h: Math.max(NOTE.h, cell(note.h ?? 0)),
    };

    (seats[note.id] ??= []).push({
      edge: edge.id, end: "from", side: facing(mine, targetBox), at: 0.5, port: false,
    });
    (seats[edge.target] ??= []).push({
      edge: edge.id, end: "to", side: facing(targetBox, mine), at: 0.5, port: false,
      show: false,
    });
  }

  // Runs sharing a line are spread apart last, once every one of them is
  // known — two relationships going the same way have to be told apart, and
  // no single edge can see that on its own.
  const spread = lanes(Object.fromEntries(
    Object.entries(runs).map(([id, run]) => [id, run.points]),
  ));
  for (const [id, points] of Object.entries(spread)) runs[id] = { ...runs[id], points };

  return { runs, seats };
}

/** A note's drawn corner: stored when placed, resting when cleared. */
function noteCorner(attr: { id: string; x: number | null; y: number | null },
                    noteRest: Spot, loose: number) {
  if (attr.x != null && attr.y != null) return { x: cell(attr.x), y: cell(attr.y) };

  return { x: cell(noteRest.x + loose * (NOTE.w + CELL)), y: cell(noteRest.y) };
}

/** React Flow nodes for one layer: frame, groups, cards, notes. */
export function nodesOf(
  graph: Graph,
  view: string | null,
  stage: Stage,
  laid: { seats: Record<string, Seated[]> },
  reach: NodeReach,
): FlowNode[] {
  const { members, notes, boxes, bands, frameBox, noteRest } = stage;
  const {
    unit, axis, showPorts, picked, grazed, dropping, joining,
    litSeats, litEdges, onPick, onOpen, onSlidePort, onSlideAnchor, onRename, onNameAttr,
    onSize, onNameTaken, onSay, onPromotePort,
  } = reach;
  const pickedNode = picked?.kind === "node" ? picked.id : null;

  const promoteSeat = (owner: string) =>
    (edgeId: string, side: Side, at: number) => {
      const edge = graph.edges[edgeId];
      if (!edge) return;
      const end = standInOf(graph, view, members, edge.source) === owner ? "from" : "to";

      onPromotePort(edgeId, end, owner, side, at);
    };

  const cards = members.map((node) => ({
    id: node.id,
    type: "card",
    position: { x: boxes[node.id].x, y: boxes[node.id].y },
    zIndex: DEPTH.card,
    // Stated, not measured. `sizeOf` is what every other piece of geometry
    // reads — the group boundaries, which side a relation leaves by, where a
    // port sits in canvas units — and a card left to size itself from its
    // text agreed with none of it. A port is placed as a percentage of the
    // card it is drawn in, so a card 150 wide while the arithmetic said 170
    // put every one of its interfaces somewhere the lines did not expect.
    width: boxes[node.id].w,
    height: boxes[node.id].h,
    style: { width: boxes[node.id].w, height: boxes[node.id].h },
    data: {
      node,
      graph,
      dropping: dropping === node.id,
      picked: node.id === pickedNode,
      grazed,
      unit,
      onNameTaken,
      onSay,
      showPorts,
      litSeats,
      pickedPort: pickedNode,
      seats: laid.seats[node.id] ?? [],
      litEdges,
      onPick: (id: string) => onPick({ kind: "node", id }),
      onOpen,
      onSlidePort,
      onSlideAnchor,
      onRename,
      onPromote: promoteSeat(node.id),
    },
  })) as FlowNode[];

  const groups = bands.map(({ attr, box }) => {
    const chosen = picked?.kind === "node" && picked.id === attr.id;

    return {
      id: attr.id,
      type: "region",
      position: { x: box.x, y: box.y },
      zIndex: DEPTH.group,
      // Stated rather than measured: a node stays invisible *and unclickable*
      // until React Flow has measured it, and a drag reads its baseline from
      // `measured` specifically, so both are given here.
      width: box.w,
      height: box.h,
      // The clear space inside takes the pointer so empty gaps drag the
      // group; cards sit above and keep their own. Stated inline because
      // React Flow's stylesheet claims `pointer-events: all` on every node
      // at the same specificity a rule of ours would have.
      style: { width: box.w, height: box.h, pointerEvents: "all" },
      draggable: true,
      selectable: false,
      data: {
        label: nameOf(graph, attr),
        picked: chosen,
        grazed: grazed?.kind === "group" && grazed.id === attr.id,
        titled: grazed?.kind === "title" && grazed.id === attr.id,
        dropping: joining.includes(attr.id),
        onPick: () => onPick({ kind: "node", id: attr.id }),
        onLabel: (label: string) => onNameAttr(attr.id, label),
        onNameTaken: (name: string) => onNameTaken(view, name, attr.id),
        onSay,
      },
    } as FlowNode;
  });

  // A note is small and precise, so it moves at once like a card rather than
  // wanting a click first the way a boundary does. Its size is the larger of
  // what its drag asked for and what its text needs — a minimum, never a
  // measurement, so the box and what it says can never disagree.
  let loose = 0;
  const written = notes.map((attr) => {
    const at = noteCorner(attr, noteRest, attr.x == null || attr.y == null ? loose++ : 0);

    return {
      id: attr.id,
      type: "note",
      // On the grid by being drawn, the same as a card — see `place`.
      position: at,
      zIndex: DEPTH.note,
      selectable: false,
      data: {
        text: nameOf(graph, attr),
        picked: picked?.kind === "node" && picked.id === attr.id,
        // A note *is* its text, so it lights as a name does — there is nothing
        // else on it to be over.
        grazed: grazed?.kind === "title" && grazed.id === attr.id,
        least: { w: Math.max(NOTE.w, cell(attr.w ?? 0)),
                 h: Math.max(NOTE.h, cell(attr.h ?? 0)) },
        onPick: () => onPick({ kind: "node", id: attr.id }),
        onLabel: (text: string) => onNameAttr(attr.id, text),
        onSize: (w: number, h: number) => onSize(attr.id, cell(w), cell(h)),
        seats: laid.seats[attr.id] ?? [],
        litEdges,
        onSlideAnchor,
      },
    };
  }) as FlowNode[];

  const frame: FlowNode[] = frameBox && view
    ? [{
        id: view,
        type: "frame",
        position: { x: frameBox.x, y: frameBox.y },
        zIndex: DEPTH.frame,
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
          onNameTaken,
          onSay,
          straddles: graph.elements[view]?.side ?? null,
          axis,
          unit,
          showPorts,
          litSeats,
          pickedPort: pickedNode,
          seats: laid.seats[view] ?? [],
          litEdges,
          onPick: (id: string) => onPick({ kind: "node", id }),
          onOpen,
          onSlidePort,
          onSlideAnchor,
          onRename,
          onPromote: promoteSeat(view),
          grazed,
        },
      } as FlowNode]
    : [];

  // Depth within the node layer: frame, then group boundaries, then cards,
  // then notes. Relations sit above all of these via the edges layer.
  return [...frame, ...groups, ...cards, ...written];
}

/** Edges as the graph describes them, before React Flow adds selection. */
export function edgesOf(
  graph: Graph,
  view: string | null,
  stage: Stage,
  laid: { runs: Record<string, Laid> },
  angular: boolean,
  picked: Picked,
  shows: (edge: { type: string }) => boolean,
): Edge[] {
  const { members, notes, boxes, noteRest } = stage;
  const standIn = (id: string) => standInOf(graph, view, members, id);

  /** A note's leaders: one faint line to each object it is tied to that is
   *  drawn in this layer. Drawn as decoration and never routed by hand, but a
   *  tie is a real edge in the graph — `isTie` is derived from its ends, the
   *  edge is stored, and untying deletes it — so it can be picked and removed
   *  like any other (V.16). Selectable is not the same as loud: the leader
   *  keeps its faint weight. */
  const tethers = notes.flatMap((attr, i) => {
    const at = noteCorner(attr, noteRest, attr.x == null || attr.y == null
      ? notes.slice(0, i).filter((n) => n.x == null || n.y == null).length
      : 0);
    const mine = { ...at, w: Math.max(NOTE.w, cell(attr.w ?? 0)),
                   h: Math.max(NOTE.h, cell(attr.h ?? 0)) };

    // Keyed by the **real** edge, not a synthetic `tie-note-target`: the hit
    // test reads an edge's id straight off the DOM, so a made-up one picks
    // nothing that exists and the tie could never be selected or untied.
    return Object.values(graph.edges)
      .filter((e) => e.source === attr.id && isTie(graph, e) && boxes[e.target])
      .map((edge) => ({
      id: edge.id,
      source: attr.id,
      target: edge.target,
      // Marked from the page's own pick, the way every other edge is — React
      // Flow's selection is not what this canvas reads.
      selected: picked?.kind === "edge" && picked.id === edge.id,
      type: "straight",
      zIndex: DEPTH.group,
      sourceHandle: `${anchorOf(edge.id)}-s`,
      targetHandle: `${anchorOf(edge.id)}-t`,
      selectable: true,
      focusable: true,
      deletable: true,
      className: "tether",
    } as Edge));
  });

  const drawn = Object.values(graph.edges)
    .map((edge) => {
      const source = standIn(edge.source);
      const target = standIn(edge.target);
      const run = laid.runs[edge.id];
      if (!source || !target || source === target || !run) return null;
      if (!shows(edge)) return null;

      // A reference: it reaches something living in another layer. Either an
      // end was substituted by a reference standing in for it, or an end simply
      // is a reference because the line was drawn straight onto one. Both are the
      // same fact about the relationship, so both draw alike.
      const away = source !== edge.source || target !== edge.target ||
        reachesReference(graph, edge);

      // **The form says there is a direction; `dir` only refines which way.**
      // A `directed` relationship left at `dir: "none"` — which is every one
      // the toolbar draws — reads source → target, and drew no arrowhead at
      // all, so direction was invisible on the canvas even where the graph
      // held it. `behavior.ts`'s `is_directed` has always read it this way.
      // Wanting no arrows is `reform` back to a plain line.
      const heads = edge.dir === "none" && (edge.form ?? "line") === "directed"
        ? "forward" : edge.dir;
      const forward = heads === "forward" || heads === "both";
      const back = heads === "back" || heads === "both";
      // Colour, dash and head from the style component; a reference still
      // overrides — derived from the ends, not configured on a definition.
      const look = lookOf(graph, element("", { type: edge.type }));
      const drawn = paint(look, away);
      const form = edge.form ?? "line";

      return {
        id: edge.id,
        source,
        target,
        label: typeName(graph, edge.type),
        type: "wire",
        zIndex: DEPTH.edge,
        // The whole run, ends included. React Flow's own handle positions are
        // a four-a-side approximation; the layer's plan is where the line
        // actually meets each card, so `Wire` draws from this and not from
        // the coordinates the library hands it.
        data: { run, angular },
        markerEnd: forward ? drawn.head("forward") : undefined,
        markerStart: back ? drawn.head("back") : undefined,
        // Bookkeeping only — the drawn endpoints come from `run`. Naming the
        // side the plan chose keeps the library's idea of the edge and ours
        // pointing the same way.
        sourceHandle: `${anchorOf(edge.id)}-s`,
        targetHandle: `${anchorOf(edge.id)}-t`,
        // Stated on the edge rather than left to the container's defaults,
        // so a relation is always clickable and always deletable.
        selectable: true,
        focusable: true,
        className: `form-${form}${away ? " reaching" : ""}`,
        selected: picked?.kind === "edge" && picked.id === edge.id,
        // The colour goes through a custom property rather than `stroke`
        // directly: an inline stroke outranks every selector, so a hover or a
        // selection could never repaint the line (V.4).
        style: { "--edge-stroke": drawn.stroke, strokeDasharray: drawn.dash } as CSSProperties,
      } as Edge;
    })
    .filter((e): e is Edge => e !== null);

  return [...drawn, ...tethers];
}
