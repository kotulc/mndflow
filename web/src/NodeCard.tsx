/** One card on the canvas.
 *
 *  A container shows its child blocks as a grid of chips — only the immediate
 *  children, so nesting past that stays for opening the container itself.
 *  Each chip's fill follows how closely its name relates to the container's,
 *  which makes one that has drifted off topic look ragged rather than reading
 *  as tidy.
 *
 *  Interfaces sit on the frame edge instead, and never in the treemap. The two
 *  are independent: a block with ports is still a block. */

import { memo, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { blocksOf, isContainer, isRef, nameOf, portsOf } from "./core/fold";
import { affinity, GRID, LEAF, squarify, tile } from "./core/layout";
import type { Graph, Node, Side } from "./core/types";
import { useEmbeddings } from "./useEmbeddings";

/** How many children a container can name. Past this the cells shrink and the
 *  words go: how much is in here and how it is divided read perfectly well
 *  without them, and the treemap is for that rather than for reading contents
 *  off. */
const NAMED = 2;
/** A cell this wide and tall has room for a name; smaller ones keep the
 *  shape of the split without a label that would only be a smear. */
const LABEL = { w: 36, h: 16 };
/** How a side maps onto React Flow's own positions. */
const SIDES: Record<Side, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/** What a dragged chip carries, so the canvas knows what was let go of. */
export const LIFTED = "application/mndflow-node";
/** What a row dragged out of the explorer carries. Dropping it on another
 *  layer's canvas places a reference there rather than moving the node. */
export const REFERRED = "application/mndflow-ref";

/** Where an anchor sits on the frame, as CSS. */
export function seat(side: Side, at: number): React.CSSProperties {
  const along = `${Math.round(at * 100)}%`;

  return side === "top" || side === "bottom" ? { left: along } : { top: along };
}

export type CardData = {
  node: Node;
  graph: Graph;
  changed: boolean;
  dropping: boolean;
  picked: boolean;
  /** Interfaces drawn or hidden — a display preference, global to the app. */
  showPorts: boolean;
  pickedPort: string | null;
  /** Mark something as the selection without changing which layer is open. */
  onPick: (id: string) => void;
  /** Enter something's own contents. Only a double-click reaches this. */
  onOpen: (id: string) => void;
  onSlidePort: (id: string, side: Side, at: number) => void;
};

/** The face opposite a side. Used for anchors looked at from the inside, and
 *  for seating the far end of a relationship so it faces back the way it came. */
export const FACING: Record<Side, Side> = {
  top: "bottom", bottom: "top", left: "right", right: "left",
};

/** A pair of handles under one name, so a relation can start or end here.
 *  React Flow looks an endpoint up by type as well as id, so both exist.
 *
 *  `inward` flips which way the curve leaves. On the layer's own frame the
 *  contents are *inside*, so a port on the right edge has to set off leftwards
 *  — left as it is, every relation to a child looped out around the frame and
 *  came back in. */
export function Anchor({ name, side, inward }: { name: string; side: Side; inward?: boolean }) {
  const style = { position: "absolute" as const, ...seat(side, 0.5), opacity: 0 };
  const face = SIDES[inward ? FACING[side] : side];

  return (
    <>
      <Handle type="target" id={`${name}-t`} position={face} isConnectable={false}
              style={style} />
      <Handle type="source" id={`${name}-s`} position={face} isConnectable={false}
              style={style} />
    </>
  );
}

export type PortProps = {
  port: Node;
  graph: Graph;
  picked: boolean;
  /** Set on the layer's own frame, whose contents face inward. */
  inward?: boolean;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
  onSlide: (id: string, side: Side, at: number) => void;
};

/** One interface on the frame edge. Click to select it; once selected it
 *  slides along the edge and around corners, the same way a group moves only
 *  once it has been picked.
 *
 *  Sliding is all it does. An interface never steps off the border to become a
 *  child block, and no child block steps onto it — the two are different kinds
 *  of thing, and a drag that could silently turn one into the other made every
 *  ordinary move a hazard.
 *
 *  Shared by the cards and by the layer's own frame, which carries ports the
 *  same way — the only difference is whose edge they sit on. */
export function Port({ port, graph, picked, inward, onPick, onOpen, onSlide }: PortProps) {
  const [drag, setDrag] = useState<{ side: Side; at: number } | null>(null);
  const held = useRef(false);
  const side = drag?.side ?? port.side ?? "right";
  const at = drag?.at ?? port.at ?? 0.5;
  const deep = isContainer(graph, port.id);

  /** Nearest edge of the host to a point, and how far along it. The point is
   *  clamped to the host first, so a drag that wanders off the card still
   *  leaves the port somewhere sensible on its border. */
  function nearest(event: React.PointerEvent) {
    const host = (event.currentTarget as HTMLElement).closest(".card, .frame");
    const box = host?.getBoundingClientRect();
    if (!box) return { side, at };

    const x = Math.min(Math.max(event.clientX - box.left, 0), box.width);
    const y = Math.min(Math.max(event.clientY - box.top, 0), box.height);
    const gaps = { left: x, right: box.width - x, top: y, bottom: box.height - y };
    const closest = (Object.keys(gaps) as Side[])
      .reduce((best, name) => (gaps[name] < gaps[best] ? name : best), "left" as Side);
    const along = closest === "top" || closest === "bottom" ? x / box.width : y / box.height;

    return { side: closest, at: Math.min(Math.max(along, 0.04), 0.96) };
  }

  return (
    <span
      // `nodrag` keeps React Flow's own drag off this: its listener is native
      // and on the card itself, so stopping the React event here would come
      // too late — the card would move instead of the port sliding along it.
      className={[
        "port", "nodrag", "nopan", `port-${side}`, picked ? "picked" : "",
        deep ? "deep" : "", port.flow ? `flow-${port.flow}` : "",
      ].join(" ")}
      style={seat(side, at)}
      title={nameOf(graph, port)}
      data-port={port.id}
      onPointerDown={(event) => {
        // The right button belongs to the canvas, which draws relationships
        // from here — swallowing it would make a port the one place a relation
        // could not start.
        if (event.button !== 0) return;

        event.stopPropagation();
        if (!picked) return;

        // Only a selected port slides, so a first click can select it without
        // also dragging it somewhere.
        held.current = true;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!held.current) return;
        const now = nearest(event);
        setDrag({ side: now.side, at: now.at });
      }}
      onPointerUp={(event) => {
        if (!held.current) return;
        held.current = false;
        const landed = nearest(event);
        setDrag(null);

        if (landed.side !== port.side || landed.at !== port.at) {
          onSlide(port.id, landed.side, landed.at);
        }
      }}
      onClick={(event) => (event.stopPropagation(), onPick(port.id))}
      onDoubleClick={(event) => (event.stopPropagation(), onOpen(port.id))}
    >
      <span className="mark" />
      {/* Named only on the layer's own frame. A card's ports are marks on a
          shape you are looking *at*, and labelling every one of them buries
          the card; the frame is the one you have stepped into. */}
      {inward && <span className="port-name">{nameOf(graph, port)}</span>}
      <Anchor name={`port-${port.id}`} side={side} inward={inward} />
    </span>
  );
}

type ContentsProps = {
  graph: Graph;
  id: string;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

/** How much of the container a child is worth: how closely it relates to it,
 *  over a floor so a weak match is still a cell you can see and grab. */
function weigh(graph: Graph, kid: Node): number {
  return 0.45 + affinity(graph, kid);
}

/** The contents of a container: one cell per immediate child block, sized by
 *  how strongly that child belongs to it.
 *
 *  Squares, wide cells and tall ones, because the areas differ — which is the
 *  point. A uniform grid says only how many children there are; this says
 *  which of them the container is mostly made of, and it is the same relevance
 *  the fill already shades by.
 *
 *  Nesting stops at that first layer. A child that is itself a container still
 *  reads as one — dashed edge, no miniature of *its* children — so the card
 *  stays a map of what this node holds, not a texture of everything below.
 *
 *  Names appear only in cells large enough to hold them. A dense split keeps
 *  the partition and drops the words; the title attribute still names each
 *  cell on hover.
 *
 *  Interfaces are never in here; they live on the frame. */
function Contents({ graph, id, onPick, onOpen }: ContentsProps) {
  const kids = blocksOf(graph, id);
  if (!kids.length) return <span className="hollow">empty</span>;

  // Worked out in the band's own proportions and then expressed as
  // percentages of it, so the cells follow the card without measuring it.
  const band = { w: LEAF.w, h: GRID };
  const tiles = squarify(kids.map((kid) => weigh(graph, kid)), band);

  return (
    // A definite height, not a share of the card's: the card is sized by its
    // content, and cells placed absolutely are no content at all — left to
    // divide up whatever was left over, the band came out flat.
    <div className="treemap" style={{ height: band.h }}>
      {kids.map((kid, at) => {
        const seat = tiles[at];
        // Only a container of one or two names its children, and only where
        // the cell has room — minus the 1px gap the layout leaves each side.
        const named = kids.length <= NAMED &&
                      seat.w - 2 >= LABEL.w && seat.h - 2 >= LABEL.h;
        // What this child holds, as a count rather than a listing: one blank
        // square each, and it stops there. Following it down turned a deep
        // container into a texture where nothing was legible.
        const inside = blocksOf(graph, kid.id).length;

        return (
          <div
            key={kid.id}
            className={`cell nodrag ${isContainer(graph, kid.id) ? "group" : "object"}`}
            style={{
              left: `calc(${(seat.x / band.w) * 100}% + 1px)`,
              top: `calc(${(seat.y / band.h) * 100}% + 1px)`,
              width: `calc(${(seat.w / band.w) * 100}% - 2px)`,
              height: `calc(${(seat.h / band.h) * 100}% - 2px)`,
              // Fill carries the affinity score; the floor keeps a weak match
              // visible rather than invisible.
              background: `rgba(74, 222, 128, ${0.08 + affinity(graph, kid) * 0.5})`,
            }}
            title={`${nameOf(graph, kid)} — drag onto the canvas to lift it out`}
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.setData(LIFTED, kid.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={(event) => (event.stopPropagation(), onPick(kid.id))}
            onDoubleClick={(event) => (event.stopPropagation(), onOpen(kid.id))}
          >
            {inside > 0 && (
              <div
                className="grain"
                aria-hidden
                style={{ gridTemplateColumns: `repeat(${tile(inside).cols}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: inside }, (_, at) => <i key={at} />)}
              </div>
            )}
            {named && <span className="tag">{nameOf(graph, kid)}</span>}
          </div>
        );
      })}
    </div>
  );
}

export const NodeCard = memo(({ data, selected }: NodeProps) => {
  const { node, graph, changed, dropping, picked, showPorts, pickedPort } =
    data as unknown as CardData;
  const { onPick, onOpen, onSlidePort } = data as unknown as CardData;
  // Shading follows affinity, which is only known once vectors exist.
  useEmbeddings();

  const holds = isContainer(graph, node.id);
  const classes = ["card", holds ? "group" : "object",
                   isRef(node) ? "reference" : "",
                   selected || picked ? "picked" : "",
                   selected ? "chosen" : "",
                   changed ? "changed" : "", dropping ? "dropping" : ""].join(" ");

  return (
    <div className={classes}>
      {/* One anchor per side for relations with no interface of their own —
          derived from the relation itself, so nothing is stored and nothing is
          left behind when it goes. */}
      {(Object.keys(SIDES) as Side[]).map((side) => (
        <Anchor key={side} name={`auto-${side}`} side={side} />
      ))}

      {showPorts && portsOf(graph, node.id).map((port) => (
        <Port
          key={port.id}
          port={port}
          graph={graph}
          picked={pickedPort === port.id}
          onPick={onPick}
          onOpen={onOpen}
          onSlide={onSlidePort}
        />
      ))}

      {/* The name is not editable here: on the canvas a double-click goes
          into something, so renaming is Enter, or the explorer. */}
      <div className="card-head">
        <span className="label">{nameOf(graph, node)}</span>
        {node.type && <span className="kind">{node.type}</span>}
      </div>

      {holds && <Contents graph={graph} id={node.id} onPick={onPick} onOpen={onOpen} />}
    </div>
  );
});
