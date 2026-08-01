/** One card on the canvas.
 *
 *  A container shows its child blocks as a grid of chips, and a chip that is
 *  itself a container shows its own contents in miniature — so nesting is
 *  visible at every level without opening anything. Each chip's fill follows
 *  how closely its name relates to the container's, which makes one that has
 *  drifted off topic look ragged rather than reading as tidy.
 *
 *  Interfaces sit on the frame edge instead, and never in the treemap. The two
 *  are independent: a block with ports is still a block. */

import { memo, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { blocksOf, isContainer, nameOf, portsOf } from "./core/fold";
import { affinity, tile } from "./core/layout";
import type { Graph, Node, Side } from "./core/types";
import { useEmbeddings } from "./useEmbeddings";

/** Below this a chip has no room for words, only its shade. */
const READABLE = 46;
/** How a side maps onto React Flow's own positions. */
const SIDES: Record<Side, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/** What a dragged chip carries, so the canvas knows what was let go of. */
export const LIFTED = "application/mndflow-node";

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
  onDemotePort: (id: string, x: number, y: number) => void;
};

/** The face opposite a side, for anchors that are looked at from the inside. */
const FACING: Record<Side, Side> = {
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
  /** Dragged clear of the border: it stops being an interface, and lands
   *  wherever on the canvas it was let go. */
  onDemote: (id: string, x: number, y: number) => void;
};

/** One interface on the frame edge. Click to select it; once selected it
 *  slides along the edge and around corners, the same way a group moves only
 *  once it has been picked.
 *
 *  Shared by the cards and by the layer's own frame, which carries ports the
 *  same way — the only difference is whose edge they sit on. */
export function Port({ port, graph, picked, inward, onPick, onOpen, onSlide,
                      onDemote }: PortProps) {
  const [drag, setDrag] = useState<{ side: Side; at: number } | null>(null);
  const held = useRef(false);
  const side = drag?.side ?? port.side ?? "right";
  const at = drag?.at ?? port.at ?? 0.5;
  const deep = isContainer(graph, port.id);

  /** How far from the border a drag has gone before the port stops belonging
   *  to the edge at all — outward off a card, or inward across a frame. */
  const OFF = 44;

  /** Nearest edge of the host to a point, how far along it, and whether the
   *  point has left the border behind. */
  function nearest(event: React.PointerEvent) {
    const host = (event.currentTarget as HTMLElement).closest(".card, .frame");
    const box = host?.getBoundingClientRect();
    if (!box) return { side, at, gone: false };

    const x = Math.min(Math.max(event.clientX - box.left, 0), box.width);
    const y = Math.min(Math.max(event.clientY - box.top, 0), box.height);
    const gaps = { left: x, right: box.width - x, top: y, bottom: box.height - y };
    const closest = (Object.keys(gaps) as Side[])
      .reduce((best, name) => (gaps[name] < gaps[best] ? name : best), "left" as Side);
    const along = closest === "top" || closest === "bottom" ? x / box.width : y / box.height;
    // Distance from the nearest border, whichever side of it the pointer is
    // on: dragged off a card, or dragged in across a frame, both mean the same
    // thing — this is no longer something sitting on an edge.
    const out = Math.max(box.left - event.clientX, event.clientX - box.right,
                         box.top - event.clientY, event.clientY - box.bottom);
    const away = out > 0 ? out : Math.min(x, box.width - x, y, box.height - y);

    return { side: closest, at: Math.min(Math.max(along, 0.04), 0.96), gone: away > OFF };
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

        // Pulled well clear of the border: it is an ordinary child block
        // again, and it lands where it was let go.
        if (landed.gone) return onDemote(port.id, event.clientX, event.clientY);

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
  size: number;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

/** The contents of a container, as a grid that recurses into sub-containers.
 *  Child blocks only — interfaces live on the frame, not in here. */
function Contents({ graph, id, size, onPick, onOpen }: ContentsProps) {
  const kids = blocksOf(graph, id);
  if (!kids.length) return <span className="hollow">empty</span>;

  const { cols } = tile(kids.length);

  return (
    <div className="treemap" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {kids.map((kid) => {
        const cell = size / cols;

        return (
          <div
            key={kid.id}
            className={`cell nodrag ${isContainer(graph, kid.id) ? "group" : "object"}`}
            title={`${nameOf(graph, kid)} — drag onto the canvas to lift it out`}
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.setData(LIFTED, kid.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={(event) => (event.stopPropagation(), onPick(kid.id))}
            onDoubleClick={(event) => (event.stopPropagation(), onOpen(kid.id))}
            // Fill carries the affinity score; the floor keeps a weak match
            // visible rather than invisible.
            style={{ background: `rgba(74, 222, 128, ${0.08 + affinity(graph, kid) * 0.5})` }}
          >
            {isContainer(graph, kid.id) ? (
              <Contents graph={graph} id={kid.id} size={cell} onPick={onPick} onOpen={onOpen} />
            ) : (
              cell >= READABLE && <span className="tag">{nameOf(graph, kid)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const NodeCard = memo(({ data, selected }: NodeProps) => {
  const { node, graph, changed, dropping, picked, showPorts, pickedPort } =
    data as unknown as CardData;
  const { onPick, onOpen, onSlidePort, onDemotePort } = data as unknown as CardData;
  // Shading follows affinity, which is only known once vectors exist.
  useEmbeddings();

  const holds = isContainer(graph, node.id);
  const classes = ["card", holds ? "group" : "object",
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
          onDemote={onDemotePort}
        />
      ))}

      {/* The name is not editable here: on the canvas a double-click goes
          into something, so renaming is Enter, or the explorer. */}
      <div className="card-head">
        <span className="label">{nameOf(graph, node)}</span>
        {node.type && <span className="kind">{node.type}</span>}
      </div>

      {holds && <Contents graph={graph} id={node.id} size={160} onPick={onPick} onOpen={onOpen} />}
    </div>
  );
});
