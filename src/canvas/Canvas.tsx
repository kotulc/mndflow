/** Graph canvas: one layer of the object graph, editable throughout.
 *
 *  Positions are held by React Flow while a drag is in progress and committed
 *  to the log on release — otherwise a node would not move until it landed.
 *
 *  What the pointer and the keyboard *mean* is `gestures.ts`. Drawing — the
 *  projection surface, form→renderer map, paint, and layer list composition —
 *  is the block view module's (`modules/view/diagram`). This hosts React Flow
 *  and wires gestures on top of that module. */


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  SelectionMode,
  type Edge,
  type EdgeChange,
  type Node as FlowNode,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";


import type { Picked } from "../actions";
import type { Action, Arg, Args } from "../actions";
import {
  axisOf, blocksOf, groupsIn, notesIn, tiesOf,
} from "../graph/fold";
import { around, CELL, cell, HUG, arranged, sizeOf, type Box } from "../geometry/layout";
import { type Axis, type EdgeForm, type End, type Graph, type Layout, type Side, type Spot } from "../graph/types";
import {
  Ask, Crumbs, EDGES, NOTE, NODES, OfferMenu, SelectionStrip, edgesOf, extentOf,
  fill_args, floorOf, laidOf, nodesOf, offered_for, placementKey, restOf, stageOf,
  type OfferTarget, type Prompt,
} from "../modules/view/diagram";
import { useGestures } from "./gestures";
import { type Grazed } from "./card";
import { restated } from "./sync";


/** A handler that keeps one identity for the life of the canvas, calling
 *  whatever it was last given.
 *
 *  The project's actions are rebuilt on every render, so a handler put straight
 *  into a node's or an edge's data makes that data new every render too — which
 *  sets the flow's state, which renders again, and does not stop. */
function useSteady<A extends unknown[], R>(fn: (...args: A) => R) {
  const latest = useRef(fn);
  latest.current = fn;


  return useCallback((...args: A) => latest.current(...args), []);
}


type Props = {
  graph: Graph;
  view: string | null;
  picked: Picked;
  path: string[];
  showPorts: boolean;
  onShowPorts: (on: boolean) => void;
  angular: boolean;
  onAngular: (on: boolean) => void;
  /** Write down where an arrangement put everything. */
  onArrangeLayer: (spots: { id: string; x: number; y: number }[],
                   notes?: { id: string; x: number; y: number }[]) => void;
  /** Hand the layer back to automatic placement — clear retained spots. */
  onRelax: () => void;
  /** Which way this layer reads — a setting, not an arrangement. */
  onAxis: (axis: Axis) => void;
  onPick: (next: Picked) => void;
  /** Whether a name is already spoken for in a layer, so the prompt can say so. */
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  /** What this project calls a plain block — the fallback a card's chip shows
   *  when nothing has given it a subtype of its own. */
  unit: string;
  /** Something outside the canvas is pointing at, lit as though hovered. The
   *  canvas's own pointer wins where the two disagree. */
  hinted: Grazed;
  /** Whatever the app has to say, and what can be done about it.
   *
   *  One channel for all of it — a repaired log, a refused name, a locked
   *  package's unlock/fork, a question before something irreversible. The
   *  browser's own `alert` and `confirm` are two more places to look and
   *  cannot be styled or tested. */
  said: {
    text: string;
    act?: { label: string; run: () => void };
    acts?: { label: string; run: () => void }[];
  } | null;
  onHeard: () => void;
  /** Say something in full, in the strip. Handed to every name on the canvas. */
  onSay: (message: string) => void;
  onOpen: (id: string | null) => void;
  onUp: () => void;
  onNest: (id: string, parent: string) => void;
  onPromote: (id: string, parent: string | null) => void;
  /** A node in this layer, joining any group boundaries it was made inside. */
  onCreateAt: (label: string, x: number, y: number, groups: string[]) => void;
  onSprout: (a: End, label: string, x: number, y: number, form: EdgeForm) => void;
  /** What a drag makes: the form picked in the toolbar. */
  form: EdgeForm;
  onForm: (form: EdgeForm) => void;
  onRename: (id: string, label: string) => void;
  onLift: (id: string, x: number, y: number) => void;
  /** Draw a relationship, with an interface at each end. */
  onWire: (a: End, b: End, form: EdgeForm, type?: string) => void;
  /** Relationship kinds in scope, each with the path it is addressed by and
   *  the form it declares. Packages first, then the project's own. */
  kinds?: { name: string; path: string; form: string }[];
  /** Which of them the next right drag draws, or null for an untyped line. A
   *  display preference like `form` and `angular`, so the page holds it — the
   *  rail that picks it is page-level and cannot reach inside here (Y.1). */
  kind?: { path: string; form: string } | null;
  /** Where to publish the arrange verb. **Arranging needs the laid-out geometry
   *  only this component has**, so the rail cannot work it out — the canvas
   *  hands it up instead of the page reaching in, which is the same direction
   *  every other dependency here runs. */
  arranging?: { current: ((shape: Layout) => void) | null };
  onAddPort: (parent: string | null, side: Side, at: number) => void;
  /** Turn a derived seat into an interface of its own, where it sits. */
  onPromotePort: (edge: string, end: "from" | "to", owner: string,
                  side: Side, at: number) => void;
  onSlidePort: (id: string, side: Side, at: number) => void;
  onRelation: (id: string, relation: string) => void;
  /** Where a drag came to rest, and any group each thing joined or left by
   *  landing there — one gesture, so one action. */
  onPlaceMany: (moved: { id: string; x: number; y: number }[], what?: string,
                membership?: { attr: string; holder: string; join: boolean }[]) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
  onGroup: (members: string[]) => void;
  /** Write a group's or a note's text — one action, since both are one
   *  attribute's name drawn on the canvas. */
  onNameAttr: (id: string, label: string) => void;
  /** A note in this layer, at the point the gesture began. */
  onNote: (text: string, x: number, y: number, w: number, h: number) => void;
  onPlaceNote: (id: string, x: number, y: number) => void;
  /** How big a note was asked to be, after it is made. */
  onSize: (id: string, w: number, h: number) => void;
  /** Tie a note to an object, or untie it if it is already tied. */
  onTie: (id: string, holder: string) => void;
  onDropAttr: (id: string) => void;
  /** Place a stand-in here for a node that lives in another layer. */
  onRefer: (target: string, x?: number, y?: number) => void;
  /** Go to where a node actually lives, and mark it there. */
  onReveal: (id: string) => void;
  /** Run a registry action — the offered list reaches the door through here. */
  onAct: (name: string, args?: Args) => boolean;
};


function Flow(props: Props) {
  const { graph, view, picked, path, showPorts, onShowPorts, angular, onAngular, unit } = props;
  const { hinted, said, onHeard, onSay, onAct } = props;
  const { onArrangeLayer, onRelax, onAxis, onPick, onOpen, onUp } = props;
  const { onCreateAt, onSprout, onNameTaken } = props;
  const { form, onForm } = props;
  const axis = axisOf(graph, view);
  // Everything the cards, the frame and the lines are handed has to keep one
  // identity, or their data is rebuilt on every render — see `useSteady`.
  const onRename = useSteady(props.onRename);
  const onSlidePort = useSteady(props.onSlidePort);
  const onNameAttr = useSteady(props.onNameAttr);
  const onSize = useSteady(props.onSize);
  const onPromotePort = useSteady(props.onPromotePort);
  const { onUnlink, onRelation } = props;
  const flow = useReactFlow();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  /** Whether the name being typed is already spoken for in this layer. */
  const [clash, setClash] = useState(false);
  /** Offered-action menu at a pointer — membership from `offer`, order fixed. */
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    items: Action[];
    target: OfferTarget;
  } | null>(null);
  /** A required text argument the menu could not fill from the gesture. */
  const [offerAsk, setOfferAsk] = useState<{
    action: Action;
    args: Args;
    arg: Arg;
  } | null>(null);
  /** Which relationship type to draw. `null` is every type — a display
   *  preference held on the canvas, not in the project, so it records no
   *  history and never reaches an export. */
  const surface = useRef<HTMLDivElement>(null);
  /** The nodes as React Flow has them. Held by reference because the two ends
   *  of this cannot both be passed forwards: the gestures read what is
   *  selected, and what is built to be selected is drawn from what they
   *  highlight. Applying a change to them is steadied for the same reason —
   *  the handler is built below what wants it. */
  const flowNodes = useRef<FlowNode[]>([]);
  /** Node ids currently selected — updated in the change handler so a marquee's
   *  edge filter sees them in the same turn the library selects the cards. */
  const chosenNodes = useRef(new Set<string>());
  /** While boxing: select edges with both ends chosen, drop the rest. The
   *  library only emits edge changes when its own incident set mutates, so an
   *  edge rejected at one end never gets a second select when the other end
   *  enters — node changes have to drive the policy. Wired after edges exist. */
  const syncBoxedEdges = useRef(() => {});
  const changeNodes = useSteady((changes: NodeChange<FlowNode>[]) => {
    for (const change of changes) {
      if (change.type === "select") {
        if (change.selected) chosenNodes.current.add(change.id);
        else chosenNodes.current.delete(change.id);
      } else if (change.type === "remove") {
        chosenNodes.current.delete(change.id);
      }
    }


    onNodesChange(changes);
    if (boxing.current) syncBoxedEdges.current();
  });
  /** True while the left-drag selection box is active — see changeEdges. */
  const boxing = useRef(false);
  /** The part of the canvas actually visible — what is left once the tray has
   *  taken its half. Everything answers to this: the frame takes its shape from
   *  the room it is shown in, and the camera fits into the same room.
   *
   *  A frame that kept its old proportions letterboxed itself into the strip
   *  left over, which on a narrow window left it a third of the width it could
   *  have had. */
  const [seen, setSeen] = useState({ w: 1180, h: 660 });


  useEffect(() => {
    const stage = surface.current;
    if (!stage) return;


    const measure = (to: (size: { w: number; h: number }) => void) =>
      new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width && height) to({ w: width, h: height });
      });


    const onStage = measure(setSeen);
    onStage.observe(stage);


    return () => onStage.disconnect();
  }, []);


  const members = useMemo(() => blocksOf(graph, view), [graph, view]);
  const stage = useMemo(
    () => stageOf(graph, view, seen),
    // placementKey keeps the stage stable when only spots actually move
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, view, seen, placementKey(members)],
  );
  const { boxes, frameBox, bands } = stage;




  // Every relationship draws. The per-type filter came out with its control
  // (V.15): filtering what is already on the canvas earned less than picking
  // what the next drag makes, which is what the bar offers instead.
  const shows = useCallback(() => true, []);


  /** Relationships whose ends should show themselves: the selected one. An
   *  anchor draws nothing until it is worth finding. */
  const litEdges = useMemo(
    () => new Set(picked?.kind === "edge" ? [picked.id] : []),
    [picked],
  );


  const litSeats = useMemo(() => {
    const edge = picked?.kind === "edge" ? graph.edges[picked.id] : null;


    return new Set([edge?.from, edge?.to].filter(Boolean) as string[]);
  }, [graph, picked]);


  const kind = props.kind ?? null;

  const laid = useMemo(
    () => laidOf(graph, stage, view, axis, showPorts, shows),
    [graph, stage, view, axis, showPorts, shows],
  );


  /** The resting zoom: frame (or the free cards) plus the band of margin.
   *  Wheel zoom may go in from here, but not out past it. */
  const floorZoom = useMemo(
    () => floorOf(frameBox, Object.values(boxes), seen),
    [frameBox, boxes, seen],
  );


  /** Centered resting camera at the floor zoom — frame (or free cards) with
   *  even margin. Zoom-to-cursor leaves pan skewed when you hit the floor; this
   *  is what we snap back to. */
  const restViewport = useCallback(
    () => restOf(floorZoom, frameBox, Object.values(boxes), seen),
    [floorZoom, frameBox, boxes, seen],
  );


  /** Context the menu asks `offer` against — pick follows what was named. */
  function menu_ctx(target: OfferTarget): { graph: typeof graph; view: string | null; picked: Picked } {
    if (target.kind === "edge") {
      return { graph, view, picked: { kind: "edge", id: target.id } };
    }
    if (target.kind === "selection") {
      return { graph, view, picked: null };
    }
    if (target.kind === "interface" || target.kind === "group" || target.kind === "note") {
      return { graph, view, picked: { kind: "node", id: target.id } };
    }

    return { graph, view, picked: { kind: "node", id: target.id } };
  }


  /** Sort `offer` into the fixed order and open the menu at the pointer. */
  const show_offer = useSteady((x: number, y: number, target: OfferTarget) => {
    const ctx = menu_ctx(target);
    if (ctx.picked) onPick(ctx.picked);
    else if (target.kind === "selection") onPick(null);

    const items = offered_for(ctx, target);
    setOfferAsk(null);
    if (!items.length) {
      setMenu(null);
      return;
    }
    setMenu({ x, y, items, target });
  });


  // Esc dismisses the offer menu / text ask before the gesture abandon path.
  useEffect(() => {
    if (!menu && !offerAsk) return;

    function press(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setMenu(null);
      setOfferAsk(null);
    }

    window.addEventListener("keydown", press, true);
    return () => window.removeEventListener("keydown", press, true);
  }, [menu, offerAsk]);


  /** Run a menu pick — rename/retype on an edge use Ask; other text is prompted. */
  const take_offer = useSteady((action: Action, target: OfferTarget) => {
    setMenu(null);
    const ctx = menu_ctx(target);
    const args = fill_args(action, ctx, target);
    const focus = ctx.picked?.id ?? (target.kind !== "selection" ? target.id : undefined);

    if (action.name === "rename" && focus) {
      setPrompt({ kind: "rename", id: focus });
      return;
    }

    // `retype` reaches an edge now that Scope names both (G.9e); the relation
    // Ask stays its door, since asking for a type by name is what it does.
    if (action.name === "retype" && ctx.picked?.kind === "edge") {
      setPrompt({ kind: "relation", id: ctx.picked.id });
      return;
    }

    const missing = action.args.find(
      (arg) => !arg.optional && arg.kind === "text" && args[arg.name] == null,
    );
    if (missing) {
      setOfferAsk({ action, args, arg: missing });
      return;
    }
    onAct(action.name, args);
  });


  /** What the pointer and the keyboard mean here. It reads the layer as worked
   *  out above and reaches the actions the canvas was handed; the props go in
   *  whole, since every one it can reach is among them. */
  const gestures = useGestures({ ...props, kind: kind?.path ?? "",
                                 kindForm: kind?.form ?? "", onOffer: show_offer }, {
    nodes: flowNodes,
    members,
    boxes,
    frameBox,
    bands,
    onNodesChange: changeNodes,
    setPrompt,
    restViewport,
  });
  const { dropping, joining, wire, sweep, moving, enclosing } = gestures;
  /** What is lit: whatever the pointer is over, or failing that whatever the
   *  contents table is pointing at. The pointer wins, since it is the more
   *  immediate of the two. */
  const grazed = gestures.hovered ?? hinted;


  /** Lay this layer out the chosen way.
   *
   *  A one-time action: what it works out is committed as ordinary placement,
   *  so everything can be dragged afterwards. It touches nothing else — which
   *  way the layer reads is a separate setting, and arranging as a grid is no
   *  reason to forget it. */
  const onArrange = useCallback((shape: Layout) => {
    const spots = arranged(graph, members, shape);
    const laid = Object.entries(spots).map(([id, at]) => ({ id, x: at.x, y: at.y }));


    onArrangeLayer(laid, reNoted(spots));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reNoted is stable per graph
  }, [onArrangeLayer, graph, members, view]);

  // Publish it for the rail (Y.1). Assigned on every render rather than in an
  // effect: the rail reads it at click time, and an effect would leave one
  // paint's worth of stale geometry behind a button that lays out a layer.
  const arrangingRef = props.arranging;
  if (arrangingRef) arrangingRef.current = onArrange;


  /** Where each tied note should sit once this layer is laid out afresh.
   *
   *  Worked out here rather than in the fold, because it needs the arrangement
   *  the layer is about to take and only the canvas can run that. A note tied to
   *  nothing keeps its place: there is nothing for it to follow. */
  const reNoted = useCallback((spots: Record<string, Spot>) => {
    const boxOf = (id: string) => {
      const at = spots[id];


      return at && graph.elements[id] ? { ...at, ...sizeOf(graph, graph.elements[id]) } : null;
    };


    // Everything a note has to stay off: the cards, and the boundaries drawn
    // round them — a note laid over either is worse than one sitting further
    // down. Notes placed earlier in this pass join the list as they go.
    const taken = [
      ...members.map((n) => boxOf(n.id)),
      ...groupsIn(graph, view)
        .map(({ here }) => around(here.map(boxOf).filter(Boolean) as Box[], HUG)),
    ].filter(Boolean) as Box[];


    const clashes = (box: Box) => taken.some((other) =>
      box.x < other.x + other.w + HUG && box.x + box.w + HUG > other.x &&
      box.y < other.y + other.h + HUG && box.y + box.h + HUG > other.y);


    return notesIn(graph, view).flatMap((attr) => {
      const held = tiesOf(graph, attr.id).map(boxOf).filter(Boolean) as Box[];
      if (!held.length) return [];


      const round = around(held, 0)!;


      // Just under what it describes, aligned to its left — clear of the ranks,
      // and the one place a reader already looks for a caption. Then down a row
      // at a time until it is clear of everything else.
      let at = { x: cell(round.x), y: cell(round.y + round.h + CELL) };


      for (let drop = 0; drop < 40 && clashes({ ...at, ...NOTE }); drop += 1) {
        at = { x: at.x, y: at.y + CELL };
      }


      taken.push({ ...at, ...NOTE });


      return [{ id: attr.id, x: at.x, y: at.y }];
    });
  }, [graph, members, view]);


  const built = useMemo(
    () => nodesOf(graph, view, stage, laid, {
      unit, axis, showPorts, picked, grazed, dropping, joining,
      litSeats, litEdges, onPick, onOpen, onSlidePort, onRename, onNameAttr,
      onSize, onNameTaken, onSay, onPromotePort,
    }),
    [graph, view, stage, laid, unit, axis, showPorts, picked, grazed, dropping,
      joining, litSeats, litEdges, onPick, onOpen, onSlidePort, onRename,
      onNameAttr, onSize, onNameTaken, onSay, onPromotePort],
  );


  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(built);
  flowNodes.current = nodes;


  // React Flow owns positions during a drag; the graph owns them otherwise.
  // The card (or group and its members) being dragged keep the positions
  // React Flow is giving them, or hovering over a drop target would snap
  // them back to where they started.
  useEffect(() => {
    setNodes((current) => restated(current, built, moving()));
  }, [built, setNodes, moving]);


  const builtEdges: Edge[] = useMemo(
    () => edgesOf(graph, view, stage, laid, angular, picked, shows),
    [graph, view, stage, laid, angular, picked, shows],
  );


  // Edges need their own change handler for the same reason nodes do: without
  // one React Flow has nowhere to record a selection.
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(builtEdges);
  useEffect(() => setEdges(builtEdges), [builtEdges, setEdges]);


  // The library's marquee selects every edge incident to a boxed card, with no
  // test on the line. A relationship that leaves the box is not enclosed — while
  // the box is being drawn, keep only edges whose both ends are in it. Clicks
  // still select a single edge as before. Node changes also call syncBoxedEdges
  // so an edge rejected at one end can select once both ends are enclosed.
  const changeEdges = useCallback((changes: EdgeChange[]) => {
    if (!boxing.current) return onEdgesChange(changes);


    const chosen = chosenNodes.current;


    onEdgesChange(changes.map((change) => {
      if (change.type !== "select" || !change.selected) return change;
      const edge = flow.getEdge(change.id);
      if (!edge) return change;
      if (chosen.has(edge.source) && chosen.has(edge.target)) return change;


      return { ...change, selected: false };
    }));
  }, [flow, onEdgesChange]);


  syncBoxedEdges.current = () => {
    const chosen = chosenNodes.current;
    const next: EdgeChange[] = [];


    for (const edge of flow.getEdges()) {
      const both = chosen.has(edge.source) && chosen.has(edge.target);
      if (!!edge.selected === both) continue;
      next.push({ id: edge.id, type: "select", selected: both });
    }


    if (next.length) onEdgesChange(next);
  };


  // Nothing writes seats back. A card moving changes `boxes`, which changes the
  // plan, which redraws the lines — no step, no history, and nothing to
  // converge on over a second render.


  // Refit on a layer change, and when the layer gains or loses something.
  // Deliberately *not* keyed on the selection: selecting is a glance, and a
  // canvas that chases every click is impossible to work on.
  const population = members.map((n) => n.id).sort().join(",");


  useEffect(() => {
    const timer = setTimeout(() => {
      // At the top level there is no frame, so the contents are what is fitted.
      if (!view || !frameBox) {
        flow.fitView({ duration: 320, padding: 0.24, maxZoom: 1.3, minZoom: floorZoom });
        return;
      }


      // Inside a layer it is the frame that is placed, not the contents: the
      // frame is the working area, and the band around it is what you
      // double-click to leave by. Set directly rather than fitted, because a
      // fit spends its padding on one axis and lets the other take whatever is
      // left — the band has to be the same all the way round.
      const rest = restViewport();
      if (rest) flow.setViewport(rest, { duration: 320 });
    }, 40);


    return () => clearTimeout(timer);
    // restViewport is read for the value; population/frameBox/panel still gate
    // when a refit runs, so dragging cards does not chase the camera. The axis
    // is in there too: rearranging a layer moves everything at once, and a
    // camera left where it was is looking at a corner of the new arrangement.
  }, [flow, view, population, axis, seen.w, seen.h, frameBox]);


  // If the floor rises (panel shrinks, frame grows), pull the viewport up so
  // it never sits below what wheel zoom is allowed to reach.
  useEffect(() => {
    const now = flow.getViewport();
    if (now.zoom < floorZoom - 1e-4) {
      const rest = restViewport();
      if (rest) flow.setViewport(rest);
      else flow.setViewport({ ...now, zoom: floorZoom });
    }
  }, [flow, floorZoom, restViewport]);


  // Wheel zooms toward the cursor, so zooming into a corner then back out
  // lands at the floor with pan still skewed. When zoom *arrives* at the
  // floor from above, restore the resting center. Panning while already at
  // the floor is left alone.
  const zoomAboveFloor = useRef(false);
  const settlingRest = useRef(false);
  /** Publish the zoom so a line can hold its width through it.
   *
   *  Everything the flow draws lives inside a `scale(zoom)` transform, so a 1px
   *  border is 1px *of layer*, not of screen: at the resting zoom of a large
   *  layer it lands under a device pixel and the browser drops it — which is
   *  how the frame could look deleted zoomed out and reappear zoomed in. The
   *  strokes that describe structure divide by this instead. */
  const shownZoom = useRef(0);
  const showZoom = useCallback((zoom: number) => {
    const z = zoom || 1;
    if (Math.abs(z - shownZoom.current) < 1e-4) return;
    shownZoom.current = z;
    surface.current?.style.setProperty("--zoom", String(z));
  }, []);

  // The first paint and every camera fit land without a move event, so read it
  // back rather than waiting to be told.
  useEffect(() => {
    showZoom(flow.getViewport().zoom);
  });

  const onMove = useCallback(
    (_: unknown, vp: Viewport) => {
      showZoom(vp.zoom);
      if (settlingRest.current) return;
      const atFloor = vp.zoom <= floorZoom + 1e-3;
      if (!atFloor) {
        zoomAboveFloor.current = true;
        return;
      }
      if (!zoomAboveFloor.current) return;
      zoomAboveFloor.current = false;
      const rest = restViewport();
      if (!rest) return;
      if (Math.abs(vp.x - rest.x) < 0.5 && Math.abs(vp.y - rest.y) < 0.5) return;
      settlingRest.current = true;
      flow.setViewport(rest);
      requestAnimationFrame(() => {
        settlingRest.current = false;
      });
    },
    [flow, floorZoom, restViewport, showZoom],
  );


  /** How far the canvas may be panned: the layer, plus room on every side to
   *  put something new. It grows as the layer does. */
  const extent = useMemo(
    () => extentOf(frameBox, Object.values(boxes)),
    [boxes, frameBox],
  );


  return (
    <div className="stage" ref={surface} {...gestures.surface}>
      <Crumbs graph={graph} view={view} path={path} onOpen={onOpen} onUp={onUp} />

      {/* What is selected, and what it could be (R.9) — Contents' old slot,
          open now that W.1 moved Contents into the table view. */}
      <SelectionStrip graph={graph} picked={picked} kinds={props.kinds} onAct={onAct} />


      {/* The settings and the verbs left for the page's rail (Y.1). What stays
          here is what is *of* the drawing: the trail, and the stage itself. */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODES}
        edgeTypes={EDGES}
        onEdgesChange={changeEdges}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        minZoom={floorZoom}
        // Own stacking: relations above cards, cards above groups — the library
        // must not bump a selected card back over a line you are trying to grab.
        zIndexMode="manual"
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={false}
        // Double-click has its own meaning here — step in, or step back out —
        // so the library's own double-click-to-zoom would fight it.
        zoomOnDoubleClick={false}
        nodesDraggable
        // Deliberately *not* `snapToGrid`. The library snaps a node's corner to
        // a line, and a card is placed by its middle landing on the middle of a
        // row — two different lattices. The gestures' own `onNodesChange`
        // snaps while the drag moves, so what you see is what lands.
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
        onSelectionStart={() => { boxing.current = true; }}
        onSelectionEnd={() => {
          syncBoxedEdges.current();
          boxing.current = false;
        }}
        // Wheel zooms. Vertical pan is what the middle button and the track
        // are for; scrolling alone used to shove the layer instead of scaling.
        zoomOnScroll
        panOnScroll={false}
        onMove={onMove}
        // `Control` is deliberately not here: on a trackpad it is a real right
        // click, and every right-button gesture is one of ours.
        multiSelectionKeyCode={["Shift", "Meta"]}
        elementsSelectable
        edgesFocusable
        // Backspace alone is the library's default, which is why Delete
        // appeared to do nothing to a selected node or relation.
        deleteKeyCode={["Delete", "Backspace"]}
        translateExtent={extent}
        {...gestures.board}
      >
        {/* The backdrop *is* the lattice things land on, so it is the same
            spacing rather than a decoration that nearly matches it.


            `offset` is given a whole cell rather than left at its default of
            zero, which is not the no-op it reads as: the library computes the
            pattern's shift as `offset * zoom || 1 + gap / 2`, and zero is
            falsy, so a default offset silently displaces the dots by half a
            cell and a pixel. Cards were landing exactly on the grid and the
            grid was the thing drawn wrong. A whole cell is one full period of
            the pattern, so it shifts by exactly nothing. */}
        <Background gap={CELL} offset={CELL} size={1} />
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


      {/* The rectangle a right drag on the background is sweeping out. It says
          which gesture is under way and where the note will land; its size is
          not the note's, which is its text's. */}
      {sweep && (() => {
        const stageEl = surface.current?.getBoundingClientRect();


        return (
          <svg className="wiring">
            <rect
              className="sweep"
              x={Math.min(sweep.from.x, sweep.to.x) - (stageEl?.left ?? 0)}
              y={Math.min(sweep.from.y, sweep.to.y) - (stageEl?.top ?? 0)}
              width={Math.abs(sweep.to.x - sweep.from.x)}
              height={Math.abs(sweep.to.y - sweep.from.y)}
            />
          </svg>
        );
      })()}


      <Ask
        graph={graph}
        view={view}
        prompt={prompt}
        clash={clash}
        said={said}
        form={form}
        onHeard={onHeard}
        setPrompt={setPrompt}
        setClash={setClash}
        onNameTaken={onNameTaken}
        onSay={onSay}
        onRename={onRename}
        onRelation={onRelation}
        onUnlink={onUnlink}
        onSprout={onSprout}
        onNote={props.onNote}
        onCreateAt={onCreateAt}
        enclosing={enclosing}
      />


      {offerAsk && (
        <div className="floating">
          <span className="caret">&gt;</span>
          <input
            autoFocus
            placeholder={offerAsk.arg.kind === "text"
              ? (offerAsk.arg.prompt ?? offerAsk.arg.name)
              : offerAsk.arg.name}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOfferAsk(null);
                return;
              }
              if (event.key !== "Enter") return;
              const wanted = (event.target as HTMLInputElement).value.trim();
              if (!wanted) return;
              onAct(offerAsk.action.name, { ...offerAsk.args, [offerAsk.arg.name]: wanted });
              setOfferAsk(null);
            }}
          />
        </div>
      )}


      {menu && (
        <OfferMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onTake={(action) => take_offer(action, menu.target)}
          onDismiss={() => setMenu(null)}
        />
      )}
    </div>
  );
}


export function Canvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}

