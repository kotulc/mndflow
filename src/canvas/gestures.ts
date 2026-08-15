/** What the pointer and the keyboard mean on the canvas.
 *
 *  One place for every gesture: what is under the pointer, which button did
 *  what, and which action that reaches. It reads the layer the canvas has
 *  already worked out — where each card sits, what the frame is — and reaches
 *  the actions it was handed. It draws nothing, and nothing here knows what a
 *  card looks like.
 *
 *  The buttons divide the work. Left selects and moves: click to select, then
 *  drag what is selected, which is what makes a card, an interface and a group
 *  all movable by the same gesture. Right draws relationships, and a right
 *  click that never moves falls through to the default action for whatever is
 *  under it.
 *
 *  The diagram declares the map and which adjustments it accepts; this hook
 *  reads both. Bindings live in modules/view/diagram/map.ts — from the
 *  inventory in actions.md — so another view can bind one action differently. */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useReactFlow, type Node as FlowNode, type NodeChange, type Viewport,
} from "@xyflow/react";

import type { Picked } from "../actions";
import { groupsIn, isProxy, membersOf, refOf } from "../graph/fold";
import { around, cell, HUG, LEAF, middled, seatAt, sizeOf } from "../geometry/layout";
import type { Box } from "../geometry/route";
import type { EdgeForm, Element, End, Graph, Side } from "../graph/types";
import {
  type GestureMap, type Prompt, MAP, reaches, takes,
} from "../modules/view/diagram";
import { type Grazed, LIFTED, REFERRED } from "./card";

export type { Prompt };

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

/** A relationship being drawn, from the moment the right button goes down.
 *  `end` is where it started: an interface it began on, or a place on that
 *  node's border to make one at. */
export type Wire = {
  end: End;
  origin: { x: number; y: number };
  to: { x: number; y: number };
  live: boolean;
};

/** Where the right button went down, and whether it went down on nothing —
 *  which is the one place a right drag makes a note. */
type Press = { x: number; y: number; bare: boolean };

/** The rectangle a right drag on the background sweeps out, once it has pulled
 *  clear of the press. In screen coordinates, like the relationship being
 *  drawn, so it needs nothing from the viewport transform to stay under the
 *  cursor. */
export type Sweep = { from: { x: number; y: number }; to: { x: number; y: number } };

/** What a gesture reads, and what it can reach. Structurally a subset of the
 *  canvas's own props, so the canvas hands its own straight in.
 *
 *  Only actions are here. Nothing a gesture reaches writes a mutation itself,
 *  which is what keeps one input method indistinguishable from another. */
export type Reach = {
  graph: Graph;
  view: string | null;
  picked: Picked;
  /** What a right drag makes: the form picked in the toolbar. */
  form: EdgeForm;
  onPick: (next: Picked) => void;
  onOpen: (id: string | null) => void;
  onUp: () => void;
  onReveal: (id: string) => void;
  onNest: (id: string, parent: string) => void;
  onPromote: (id: string, parent: string | null) => void;
  onLift: (id: string, x: number, y: number) => void;
  onRefer: (target: string, x?: number, y?: number) => void;
  onWire: (a: End, b: End, form: EdgeForm) => void;
  onTie: (id: string, holder: string) => void;
  onAddPort: (parent: string | null, side: Side, at: number) => void;
  onGroup: (members: string[]) => void;
  onDelete: (id: string) => void;
  onUnlink: (id: string) => void;
  onDropAttr: (id: string) => void;
  onPlaceMany: (moved: { id: string; x: number; y: number }[], what?: string,
                membership?: { attr: string; holder: string; join: boolean }[]) => void;
  onPlaceNote: (id: string, x: number, y: number) => void;
};

/** The layer as the canvas worked it out, and the three things it lends back:
 *  somewhere to put a node change, somewhere to ask a question, and where the
 *  camera rests. */
export type Stage = {
  /** The nodes React Flow has, by reference: the canvas builds them from what
   *  the gestures highlight, so the two cannot both be passed forwards. Read
   *  when something happens, which is always after they are built. */
  nodes: { current: FlowNode[] };
  members: Element[];
  boxes: Record<string, Box>;
  frameBox: Box | null;
  bands: { attr: Element; box: Box }[];
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  setPrompt: (prompt: Prompt | null) => void;
  restViewport: () => Viewport | null;
};

/** Nearest edge of an element to a screen point, and the seat on it. The
 *  element is measured on screen, so its length is divided by the zoom to get
 *  the canvas units seats are counted in. `corner` is that element's top-left
 *  in canvas units, so seats land on the absolute lattice. */
function nearestEdge(
  box: DOMRect, x: number, y: number, zoom: number, corner: { x: number; y: number },
): { side: Side; at: number } {
  const gaps = {
    left: x - box.left, right: box.right - x, top: y - box.top, bottom: box.bottom - y,
  };
  const side = (Object.keys(gaps) as Side[])
    .reduce((best, name) => (gaps[name] < gaps[best] ? name : best), "left" as Side);
  const flat = side === "top" || side === "bottom";
  const frac = flat ? (x - box.left) / box.width : (y - box.top) / box.height;
  const extent = (flat ? box.width : box.height) / (zoom || 1);
  const origin = flat ? corner.x : corner.y;

  return { side, at: seatAt(frac, extent, origin) };
}

/** The active diagram's map. Defaults to the block module's — the only one
 *  that draws today. A later compositor passes another module's map in. */
export function useGestures(reach: Reach, stage: Stage, map: GestureMap = MAP) {
  const { graph, view, picked, form } = reach;
  const { onPick, onOpen, onUp, onReveal, onNest, onPromote, onLift, onRefer } = reach;
  const { onWire, onTie, onAddPort, onGroup, onDelete, onUnlink, onDropAttr } = reach;
  const { onPlaceMany, onPlaceNote } = reach;
  const { members, boxes, frameBox, bands, setPrompt, restViewport } = stage;
  const nodes = stage.nodes;
  const changeNodes = stage.onNodesChange;
  const flow = useReactFlow();
  const pickedNode = picked?.kind === "node" ? picked.id : null;

  const [wire, setWire] = useState<Wire | null>(null);
  const [sweep, setSweep] = useState<Sweep | null>(null);
  /** The card a dragged card is currently over — the one it would go inside. */
  const [dropping, setDropping] = useState<string | null>(null);
  const dropRef = useRef<string | null>(null);
  /** Group boundaries a dragged card would land inside, so they light up the
   *  way a container does. */
  const [joining, setJoining] = useState<string[]>([]);
  const joinRef = useRef("");
  /** The one element the pointer is over, and so the one that highlights.
   *  Resolved here rather than by `:hover`, which lights every ancestor of
   *  whatever is under the cursor. */
  const [hovered, setHovered] = useState<Grazed>(null);
  const grazeRef = useRef("");
  const heldRef = useRef<string | null>(null);
  /** Where a group's boundary sat when its drag began, and where each member
   *  sat — the drag moves them together by a snapped delta. */
  const groupRef = useRef<{
    id: string;
    x: number;
    y: number;
    members: Record<string, { x: number; y: number }>;
  } | null>(null);
  /** Where the right button went down, whatever it went down on. */
  const pressRef = useRef<Press | null>(null);

  /** The card, port, chip, relation or frame under a screen point, as ids. The
   *  frame is transparent to the pointer, so its edge is found by measuring
   *  instead: inside the layer's box but outside the contents it encloses. */
  const under = useCallback((x: number, y: number) => {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const nothing = { id: null, port: null, cell: null, title: false, box: null };

    // With several nodes selected the library lays its own rectangle over
    // them, which answers the hit test before any card does. Pointing at it is
    // pointing at the selection.
    if (element?.closest(".react-flow__nodesselection")) {
      return { ...nothing, kind: "selection" as const };
    }

    // A relation sits above the cards, so reaching one means it is what the
    // pointer is on — segment grabs win over the block or interface below.
    const line = element?.closest(".react-flow__edge") as HTMLElement | null;
    if (line) return { ...nothing, id: line.dataset.id ?? null, kind: "edge" as const };

    const port = element?.closest(".port") as HTMLElement | null;
    const cell = element?.closest(".cell") as HTMLElement | null;
    // A name is its own target wherever it is written — a card's as much as a
    // frame's — since the right button renames there and makes nothing. A note
    // is written all the way through: the whole of it is its name.
    const title = Boolean(
      element?.closest(".frame-name, .region-name, .card-head .label, .note"),
    );
    const host = element?.closest(".react-flow__node") as HTMLElement | null;
    const kind = host?.classList.contains("react-flow__node-card") ? "card"
               : host?.classList.contains("react-flow__node-frame") ? "frame"
               : host?.classList.contains("react-flow__node-region") ? "group"
               : host?.classList.contains("react-flow__node-note") ? "note"
               : null;

    if (host && kind) {
      return { id: host.dataset.id ?? null, kind, port: port?.dataset.port ?? null,
               cell: cell?.dataset.cell ?? null, title,
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
          ...nothing,
          id: view,
          kind: "frame" as const,
          box: new DOMRect(corner.x, corner.y, far.x - corner.x, far.y - corner.y),
        };
      }
    }

    return { ...nothing, kind: null };
  }, [view, frameBox, flow]);

  /** The one element in context under the pointer — what highlights, and what
   *  a right-click would act on.
   *
   *  Innermost wins: an interface over the card it sits on, a chip over the
   *  container holding it. A card is one target, border included: the whole of
   *  it takes the same action, so lighting its ring apart would be describing a
   *  distinction the tool no longer makes. */
  const grazedAt = useCallback((x: number, y: number): Grazed => {
    const hit = under(x, y);

    if (hit.kind === "selection") return { kind: "selection", id: "" };
    if (hit.kind === "edge") return hit.id ? { kind: "edge", id: hit.id } : null;
    if (hit.title && hit.id) return { kind: "title", id: hit.id };
    if (hit.port) return { kind: "port", id: hit.port };
    if (hit.cell) return { kind: "cell", id: hit.cell };

    if (hit.id && (hit.kind === "card" || hit.kind === "frame" || hit.kind === "group")) {
      return { kind: hit.kind, id: hit.id };
    }

    // Nothing under the pointer in the DOM may still sit inside a boundary —
    // kept as a fallback when an edge or the pane answers the hit test first.
    const at = flow.screenToFlowPosition({ x, y });
    const inside = bands
      .filter(({ box }) => at.x >= box.x && at.x <= box.x + box.w &&
                           at.y >= box.y && at.y <= box.y + box.h)
      .sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h);

    return inside.length ? { kind: "group", id: inside[0].attr.id } : null;
  }, [under, flow, bands]);

  /** What highlights under the pointer. Worked out rather than left to `:hover`,
   *  which lights every ancestor. Only set when the answer changes. */
  const graze = useCallback((x: number, y: number) => {
    const now = grazedAt(x, y);
    const key = now ? `${now.kind}:${now.id}` : "";
    if (key === grazeRef.current) return;
    grazeRef.current = key;
    setHovered(now);
  }, [grazedAt]);

  /** The card a dragged card would go inside, if any.
   *
   *  Its own middle decides, not the pointer — you aim with the card you can
   *  see. Anywhere on another card means inside it: a card's border is not a
   *  drop target, because a drop there used to turn the card into an interface
   *  and that made every ordinary move a hazard. Interfaces are made
   *  deliberately now, and only at the border of the layer you are in. */
  const landing = useCallback(
    (dragged: FlowNode) => {
      const size = sizeOf(graph, graph.elements[dragged.id]);
      const mid = { x: dragged.position.x + size.w / 2, y: dragged.position.y + size.h / 2 };

      for (const [id, box] of Object.entries(boxes)) {
        if (id === dragged.id) continue;
        // A reference holds nothing, so nothing lands in one.
        if (isProxy(graph.elements[id])) continue;

        const near = Math.max(box.x - mid.x, mid.x - (box.x + box.w),
                              box.y - mid.y, mid.y - (box.y + box.h));
        if (near <= EDGE) return id;
      }

      return null;
    },
    [graph, boxes],
  );

  /** Where a card has landed, in its own middle — what every drop test uses,
   *  because you aim with the card you can see rather than with the pointer. */
  const middleOf = useCallback((node: { id: string; position: { x: number; y: number } }) => {
    const size = sizeOf(graph, graph.elements[node.id]);

    return { x: node.position.x + size.w / 2, y: node.position.y + size.h / 2 };
  }, [graph]);

  /** The groups a card belongs to, having come to rest at `mid`.
   *
   *  Each boundary is measured from the members that are *staying put*. A
   *  member helps define the boundary it sits in, so measured against all of
   *  them a card could never be dragged far enough to leave — it would take
   *  the boundary with it. Against the ones standing still, joining and
   *  leaving are the same test read in opposite directions.
   *
   *  Where every member is on the move, the boundary is measured where it sat
   *  before the drag: `boxes` comes from the graph, which does not change until
   *  the drag commits. This is what lets a group's last member leave it — with
   *  one member there is never anybody standing still, so the old rule that
   *  such a group is "travelling" left it impossible to break up.
   *
   *  Dragging a group by its own boundary never reaches here: it commits its
   *  members' places directly and touches no membership. */
  const enclosing = useCallback(
    (mover: string, mid: { x: number; y: number }, moving: Set<string>) =>
      groupsIn(graph, view)
        .filter(({ here }) => {
          const staying = here.filter((id) => !moving.has(id));
          const gauge = staying.length ? staying : here;
          const box = around(gauge.map((id) => boxes[id]).filter(Boolean), HUG);

          return box && mid.x >= box.x && mid.x <= box.x + box.w &&
                        mid.y >= box.y && mid.y <= box.y + box.h;
        })
        .map(({ attr }) => attr.id),
    [graph, view, boxes],
  );

  /** What a right click does where a menu is not built yet: the default entry
   *  of the menu that will replace it. The map names the action; hit-testing
   *  names what is under the pointer. */
  const fallback = useCallback((x: number, y: number) => {
    const hit = under(x, y);
    const chosen = nodes.current.filter((n) => n.selected).map((n) => n.id);

    // On a selection of several: group them, which is the one thing a right
    // click on more than one node could reasonably mean. Only *on* it, though —
    // a right click elsewhere is about whatever is under the cursor, and a
    // selection left over from a moment ago should not swallow it.
    const onSelection = hit.kind === "selection" || (hit.id !== null && chosen.includes(hit.id));
    if (chosen.length > 1 && onSelection) {
      if (reaches("right", "click", "selection", map) === "group") return onGroup(chosen);

      return;
    }

    // A name opens its own editor on the right button — see `Name` — and an
    // interface is already one; both wait for the menu.
    if (hit.title && reaches("right", "click", "name", map) === "nothing") return;
    if (hit.port && reaches("right", "click", "interface", map) === "nothing") return;

    // A relationship's kind is a name, and a name is written where it is drawn.
    // The last name on the canvas that took a different gesture.
    if (hit.kind === "edge" && hit.id
        && reaches("right", "click", "edge", map) === "retype") {
      return setPrompt({ kind: "relation", id: hit.id });
    }

    // Anywhere on a card, and anywhere on the layer's own border, makes an
    // interface. Where the click landed decides which point of the border it
    // goes to; it is not a test the click has to pass.
    if ((hit.kind === "card" || hit.kind === "frame") && hit.id && hit.box
        && reaches("right", "click", hit.kind, map) === "interface") {
      const corner = flow.screenToFlowPosition({ x: hit.box.left, y: hit.box.top });
      const { side, at: along } = nearestEdge(hit.box, x, y, flow.getZoom(), corner);

      return onAddPort(hit.id, side, along);
    }

    // Empty background: a node in this layer, joining any boundary it lands in.
    if (reaches("right", "click", "empty", map) !== "create") return;

    const at = flow.screenToFlowPosition({ x, y });

    setPrompt({ kind: "node", x: at.x - LEAF.w / 2, y: at.y - LEAF.h / 2 });
  }, [under, nodes, flow, onGroup, onAddPort, setPrompt, map]);

  // Shortcuts the canvas owns. Inside a field the field's own editing wins,
  // and Esc abandons whatever is half-drawn — prompt or relationship alike.
  useEffect(() => {
    function press(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // The multi-selection lives on the nodes, not in `picked`. Clearing
        // only the pick left Ctrl+A's cards still selected.
        changeNodes(nodes.current.map((n) => ({
          type: "select" as const,
          id: n.id,
          selected: false,
        })));

        return (setWire(null), setSweep(null), setPrompt(null), onPick(null));
      }
      if ((event.target as HTMLElement).closest("input, textarea")) return;

      const chosen = nodes.current.filter((n) => n.selected).map((n) => n.id);

      if (event.key === "Enter" && pickedNode) {
        event.preventDefault();

        return setPrompt({ kind: "rename", id: pickedNode });
      }

      // One card is enough here, where a boundary round a single block can only
      // have been asked for. The right button keeps its own rule: on one card
      // it still makes an interface, since that is what a card is for.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();

        return chosen.length ? onGroup(chosen) : undefined;
      }

      // Everything the selection box can take on this layer — cards, not the
      // frame, notes or boundaries, which are not multi-selectable. Clearing
      // the single pick leaves the multi-selection as the only context, so Fit
      // and Group see the whole set.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        changeNodes(nodes.current.map((n) => ({
          type: "select" as const,
          id: n.id,
          selected: n.type === "card",
        })));

        return onPick(null);
      }

      // Show me this. Which *this* is already answered by what is selected, so
      // one key covers both fitting the layer and going to one thing in it.
      if (event.key.toLowerCase() === "f" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        const seen = pickedNode ? [pickedNode] : chosen;

        if (seen.length) {
          return flow.fitView({ nodes: seen.map((id) => ({ id })), duration: 320,
                                padding: 0.6, maxZoom: 1.6 });
        }

        const rest = restViewport();

        return rest ? flow.setViewport(rest, { duration: 320 })
                    : flow.fitView({ duration: 320, padding: 0.24, maxZoom: 1.3 });
      }

      // The library deletes what it has selected, which is cards and relations.
      // An interface, or a group boundary, is selected by us and not by it, so
      // it has to be removed here or Delete would appear to do nothing.
      if (event.key === "Delete" || event.key === "Backspace") {
        if (picked?.kind === "node") return (event.preventDefault(), onDropAttr(picked.id));
        if (picked?.kind === "edge") return (event.preventDefault(), onUnlink(picked.id));
        if (pickedNode && !nodes.current.some((n) => n.id === pickedNode && n.type === "card")) {
          event.preventDefault();

          return onDelete(pickedNode);
        }
      }
    }

    window.addEventListener("keydown", press);

    return () => window.removeEventListener("keydown", press);
  }, [nodes, changeNodes, pickedNode, picked, flow, restViewport, onGroup, onPick,
      onDropAttr, onUnlink, onDelete, setPrompt]);

  /** The wall a right drag named, where it named one.
   *
   *  Only the layer's own frame names one. A card has no border zone — a drag
   *  from anywhere on it means "from this card", and there is no wall in the
   *  gesture to record. The frame is the exception the spec already makes, since
   *  its interior is the background and so its border has to stay a zone: a drag
   *  there is necessarily *on a wall*, and which wall is what the user meant. */
  function wallAt(hit: { kind: string | null; port: string | null; box: DOMRect | null },
                  x: number, y: number): Side | undefined {
    if (!takes("wall", map)) return undefined;
    if (hit.kind !== "frame" || hit.port || !hit.box) return undefined;

    const corner = flow.screenToFlowPosition({ x: hit.box.left, y: hit.box.top });

    return nearestEdge(hit.box, x, y, flow.getZoom(), corner).side;
  }

  /** The right button, from press to release. Below the threshold it is a
   *  click and falls through to the default action; past it, a relationship
   *  is being drawn and an interface appears at the edge it started from. */
  function rightDown(event: React.PointerEvent) {
    if (event.button !== 2) return;

    const hit = under(event.clientX, event.clientY);
    // Recorded whatever is underneath, so that a right click over empty canvas
    // still reaches its default action even though there is nothing there to
    // draw a relationship from — and so a drag knows whether it set off from
    // nothing, which is the one place a drag makes a note.
    pressRef.current = { x: event.clientX, y: event.clientY, bare: hit.kind === null };

    // A name is set into a border but is not one, so nothing starts from it.
    if (hit.title) return;
    if (!hit.id || (hit.kind !== "card" && hit.kind !== "frame")) return;
    if (reaches("right", "drag", hit.kind, map) !== "relate") return;

    const origin = { x: event.clientX, y: event.clientY };

    setWire({
      // The interface it set off from, where it set off from one, and the wall
      // it set off through, where the gesture named one. Anywhere else on a card
      // is just the card: where the line leaves it is the layer's to work out.
      end: { node: hit.id, port: hit.port ?? undefined, side: wallAt(hit, origin.x, origin.y) },
      origin,
      to: origin,
      live: false,
    });
  }

  function rightMove(event: React.PointerEvent) {
    graze(event.clientX, event.clientY);

    const to = { x: event.clientX, y: event.clientY };

    if (wire) {
      const far = Math.hypot(to.x - wire.origin.x, to.y - wire.origin.y) > THRESHOLD;

      return setWire({ ...wire, to, live: wire.live || far });
    }

    // A right drag on the background: show the rectangle it is sweeping out, so
    // the gesture under way is visible while it is under way. Amber and dashed,
    // which is a note's own look and nothing like the selection box.
    const down = pressRef.current;
    if (!down?.bare) return;

    const far = Math.hypot(to.x - down.x, to.y - down.y) > THRESHOLD;

    setSweep(far ? { from: { x: down.x, y: down.y }, to } : null);
  }

  function rightUp(event: React.PointerEvent) {
    if (event.button !== 2) return;

    const down = pressRef.current;
    const held = wire;
    pressRef.current = null;
    setWire(null);
    setSweep(null);

    // Never past the threshold, or never on anything to draw from: a right
    // click, and a right click runs the default action for what is under it.
    if (!held?.live) {
      if (!down) return;

      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      if (moved <= THRESHOLD) return fallback(event.clientX, event.clientY);

      // Past it, having set off from nothing: a note. It lands in the top-left
      // corner of the rectangle swept out, whichever way the drag ran, and the
      // rest of the rectangle is the least room it gets — a minimum, so a long
      // description has space and a longer one still grows the card. What it
      // says is asked for before anything is made, the same as a node's name.
      if (down.bare && reaches("right", "drag", "empty", map) === "note") {
        const at = flow.screenToFlowPosition({ x: Math.min(down.x, event.clientX),
                                               y: Math.min(down.y, event.clientY) });
        const far = flow.screenToFlowPosition({ x: Math.max(down.x, event.clientX),
                                                y: Math.max(down.y, event.clientY) });

        setPrompt({ kind: "note", x: at.x, y: at.y,
                    w: Math.round(far.x - at.x), h: Math.round(far.y - at.y) });
      }

      return;
    }

    const hit = under(event.clientX, event.clientY);

    // Let go on a note: tie what the drag set off from to it, or untie it if it
    // was tied already. A note is not a node, so no relationship is drawn and no
    // interface is made — the line between them is a leader.
    if (hit.kind === "note" && hit.id
        && reaches("right", "drag", "note", map) === "tie") {
      return onTie(hit.id, held.end.node);
    }

    const landed = hit.kind === "card" || hit.kind === "frame" ? hit.id : null;

    // Released on something: the relationship, and nothing else. An interface
    // it landed on is kept as that end's anchor; otherwise the layer decides
    // where the line meets the card, and there is nothing to record.
    if (landed && landed !== held.end.node
        && reaches("right", "drag", hit.kind as "card" | "frame", map) === "relate") {
      return onWire(held.end, {
        node: landed,
        port: hit.port ?? undefined,
        side: wallAt(hit, event.clientX, event.clientY),
      }, form);
    }

    // Nothing under it: make the far end where it was let go, and attach.
    // Still `relate` — create + relate — so the same binding covers the sprout.
    if (reaches("right", "drag", "card", map) !== "relate"
        && reaches("right", "drag", "frame", map) !== "relate") {
      return;
    }

    const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setPrompt({
      kind: "sprout",
      x: at.x - LEAF.w / 2,
      y: at.y - LEAF.h / 2,
      end: held.end,
    });
  }

  // Snap while the pointer moves, so the lattice under a card (or under a
  // group's members) is the one it will settle on — free-dragging made every
  // half-cell look like a valid drop, then release jumped to a full step.
  // `middled` / `cell` are idempotent, so applying them to already-snapped
  // positions is a no-op.
  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    const here = new Set(members.map((n) => n.id));
    const start = groupRef.current;
    const extras: NodeChange<FlowNode>[] = [];

    const mapped = changes.map((change) => {
      if (change.type !== "position" || !change.position) return change;

      if (start && change.id === start.id) {
        const dx = cell(change.position.x - start.x);
        const dy = cell(change.position.y - start.y);
        for (const [id, home] of Object.entries(start.members)) {
          extras.push({
            type: "position",
            id,
            position: { x: home.x + dx, y: home.y + dy },
            dragging: change.dragging,
          });
        }

        return { ...change, position: { x: start.x + dx, y: start.y + dy } };
      }

      if (here.has(change.id) && graph.elements[change.id]) {
        // Members of a group being dragged are positioned from the group's
        // snapped delta above — leave them alone if a stray change arrives.
        if (start?.members[change.id]) return change;

        return {
          ...change,
          position: middled(change.position, sizeOf(graph, graph.elements[change.id])),
        };
      }

      if (graph.elements[change.id]?.form === "note") {
        return {
          ...change,
          position: { x: cell(change.position.x), y: cell(change.position.y) },
        };
      }

      return change;
    });

    changeNodes([...mapped, ...extras]);
  }, [changeNodes, members, graph]);

  /** Which nodes React Flow owns the position of right now: the card being
   *  dragged, or a group and every member travelling with it. The canvas keeps
   *  their positions rather than restating them from the graph, or hovering
   *  over a drop target would snap them back to where they started. */
  const moving = useCallback(() => {
    const group = groupRef.current;
    if (group) return new Set([group.id, ...Object.keys(group.members)]);

    return heldRef.current ? new Set([heldRef.current]) : null;
  }, []);

  function nodeDragStart(_: unknown, node: FlowNode) {
    if (node.type === "region") {
      // Dragging is how you take hold of it; picking follows so the
      // panel shows what is moving without a separate click first.
      onPick({ kind: "node", id: node.id });
      const holders = membersOf(graph, node.id).map((m) => m.id);
      groupRef.current = {
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        members: Object.fromEntries(
          holders
            .filter((id) => boxes[id])
            .map((id) => [id, { x: boxes[id].x, y: boxes[id].y }]),
        ),
      };

      return;
    }

    heldRef.current = node.id;
  }

  function nodeDrag(_: unknown, node: FlowNode, dragged: FlowNode[]) {
    if (node.type !== "card") return;

    // Only re-render when a target actually changes, not every pixel.
    const hit = landing(node);
    if (hit !== dropRef.current) {
      dropRef.current = hit;
      setDropping(hit);
    }

    // Dropping inside a card is a move into it, so no group is being
    // joined at the same time — the card lands in another layer.
    const afoot = new Set((dragged?.length ? dragged : [node]).map((n) => n.id));
    const inside = hit ? [] : enclosing(node.id, middleOf(node), afoot);
    const key = inside.join(",");
    if (key !== joinRef.current) {
      joinRef.current = key;
      setJoining(inside);
    }
  }

  function nodeDragStop(_: unknown, node: FlowNode, dragged: FlowNode[]) {
    // A group's boundary carries its members: whatever it travelled,
    // they travelled, in one action — delta already snapped to the grid.
    const start = groupRef.current;
    if (node.type === "region" && start && start.id === node.id) {
      groupRef.current = null;
      if (!takes("place", map)) return;

      const dx = node.position.x - start.x;
      const dy = node.position.y - start.y;
      const moved = Object.entries(start.members)
        .map(([id, home]) => ({ id, x: home.x + dx, y: home.y + dy }));

      return onPlaceMany(moved, `moved group of ${moved.length}`);
    }

    // A note has a place of its own, and takes nothing with it.
    if (node.type === "note") {
      heldRef.current = null;
      if (!takes("place", map)) return;

      return onPlaceNote(node.id, node.position.x, node.position.y);
    }

    // Worked out again from where the card actually came to rest. The
    // ref behind the hover indicator is a frame or two stale by now, and
    // the last inch of a drag is exactly where the answer changes.
    const into = node.type === "card" ? landing(node) : null;
    dropRef.current = null;
    heldRef.current = null;
    joinRef.current = "";
    setDropping(null);
    setJoining([]);

    // Dropped on another card: that card becomes its container.
    // `move`, not `place` — nesting changes parentage, not only position.
    if (into) return onNest(node.id, into);

    // Pushed past the edge of the frame, while inside a layer: it
    // belongs to whatever contains this layer. The card's own middle is
    // what counts, not the pointer — you aim with the card you can see.
    if (view && frameBox) {
      const { x, y } = middleOf(node);
      const out = x < frameBox.x || x > frameBox.x + frameBox.w ||
                  y < frameBox.y || y > frameBox.y + frameBox.h;
      if (out) return onPromote(node.id, graph.elements[view]?.parent ?? null);
    }

    if (!takes("place", map)) return;

    // A selection dragged together lands together.
    const cards = (dragged?.length ? dragged : [node]).filter((n) => n.type === "card");
    const moved = cards.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));

    // ...and joins or leaves whatever boundaries it landed in or out of.
    // A group takes members by drag the way a container does; what makes
    // it a group rather than a container is that nothing's parent moves.
    const here = groupsIn(graph, view);
    const afoot = new Set(cards.map((n) => n.id));
    const membership = cards.flatMap((card) => {
      const inside = new Set(enclosing(card.id, middleOf(card), afoot));

      return here
        .filter(({ attr, here }) => here.includes(card.id) !== inside.has(attr.id))
        .map(({ attr }) => ({ attr: attr.id, holder: card.id, join: inside.has(attr.id) }));
    });

    onPlaceMany(moved, "", membership);
  }

  function nodeClick(_: unknown, node: FlowNode) {
    if (node.type === "card") return onPick({ kind: "node", id: node.id });
    if (node.type === "region") return onPick({ kind: "node", id: node.id });
    // A placeholder is not a thing in itself: picking it picks whatever
    // it reaches, so the panel shows the node and not the stand-in.
    if (node.type === "ghost") {
      return onPick({ kind: "node", id: (node.data as { target: string }).target });
    }
    // The frame is the layer itself, and the layer is what an empty
    // selection already shows.
    if (node.type === "frame") return onPick(null);
  }

  function nodeDoubleClick(_: unknown, node: FlowNode) {
    if (node.type !== "card") return;

    // A proxy has no inside: going into one goes to where its block
    // actually lives, which is what the reference is for.
    const stands = refOf(graph, node.id);

    return stands ? onReveal(stands) : onOpen(node.id);
  }

  function paneClick(event: React.MouseEvent) {
    setPrompt(null);

    // Empty canvas, or a miss that still sits inside a boundary — the
    // same reckoning that decides what highlights under the pointer.
    const spot = grazedAt(event.clientX, event.clientY);

    onPick(spot?.kind === "group" ? { kind: "attr", id: spot.id } : null);
  }

  function doubleClick(event: React.MouseEvent) {
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
  }

  function dragOver(event: React.DragEvent) {
    const kinds = event.dataTransfer.types;
    if (!kinds.includes(LIFTED) && !kinds.includes(REFERRED)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = kinds.includes(LIFTED) ? "move" : "link";
  }

  function drop(event: React.DragEvent) {
    const lifted = event.dataTransfer.getData(LIFTED);
    const referred = event.dataTransfer.getData(REFERRED);
    if (!lifted && !referred) return;

    event.preventDefault();
    const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const x = at.x - LEAF.w / 2;
    const y = at.y - LEAF.h / 2;

    // A chip out of a treemap is the node itself, moving here. A row out
    // of the explorer is a mention of it, staying where it is.
    if (lifted) return onLift(lifted, x, y);
    if (referred !== view && !members.some((n) => n.id === referred)) {
      onRefer(referred, x, y);
    }
  }

  return {
    /** What a gesture is part-way through, which the canvas draws. */
    wire,
    sweep,
    dropping,
    joining,
    hovered,
    moving,
    /** Which boundaries a point falls inside — the prompt asks it too, since a
     *  node named in the clear space inside one joins it. */
    enclosing,
    /** What the surface takes. The right button is handled from press to
     *  release here rather than by the library, which has no notion of it. */
    surface: {
      onPointerDown: rightDown,
      onPointerMove: rightMove,
      onPointerUp: rightUp,
      onPointerLeave: () => (grazeRef.current = "", setHovered(null), setSweep(null)),
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    },
    /** What React Flow takes. */
    board: {
      onNodesChange,
      onNodeClick: nodeClick,
      onNodeDoubleClick: nodeDoubleClick,
      onEdgeClick: (_: unknown, edge: { id: string }) =>
        onPick({ kind: "edge", id: edge.id }),
      onNodeDragStart: nodeDragStart,
      onNodeDrag: nodeDrag,
      onNodeDragStop: nodeDragStop,
      onNodesDelete: (gone: FlowNode[]) =>
        gone.filter((node) => node.type === "card").forEach((node) => onDelete(node.id)),
      onEdgesDelete: (gone: { id: string }[]) => gone.forEach((edge) => onUnlink(edge.id)),
      onPaneClick: paneClick,
      onDoubleClick: doubleClick,
      onDragOver: dragOver,
      onDrop: drop,
      onPaneMouseMove: (event: React.MouseEvent) => graze(event.clientX, event.clientY),
      onNodeMouseMove: (event: React.MouseEvent) => graze(event.clientX, event.clientY),
      onNodeMouseLeave: (event: React.MouseEvent) => graze(event.clientX, event.clientY),
      onPaneMouseLeave: () => (grazeRef.current = "", setHovered(null)),
    },
  };
}
