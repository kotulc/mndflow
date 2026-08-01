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

import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { blocksOf, isContainer, isRef, nameOf, portsOf } from "./core/fold";
import { affinity, CHIP_CAP, GRID, LEAF, pack } from "./core/layout";
import type { Graph, Node, Side } from "./core/types";
import { useEmbeddings } from "./useEmbeddings";

/** Tag type scales between these; below the floor the name is withheld. */
const TAG = { min: 6, max: 9, line: 1.15, pad: 4, mono: 0.62 };

/** Largest font that fits the cell, or null when even the floor will not. */
function fitTag(w: number, h: number, text: string): number | null {
  const aw = w - TAG.pad;
  const ah = h - TAG.pad;
  if (ah < TAG.min * TAG.line || aw < TAG.min) return null;

  // Height first, then shrink for the full string; if it still will not fit at
  // the floor, keep the floor and let ellipsis clip — better than blank.
  let size = Math.min(TAG.max, ah / TAG.line);
  if (text.length) size = Math.min(size, aw / (text.length * TAG.mono));
  return size >= TAG.min ? size : TAG.min;
}
/** How a side maps onto React Flow's own positions. */
const SIDES: Record<Side, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/** How long a click on a name waits to see whether a second one follows. On a
 *  card a double-click descends into it, and the first of those two clicks
 *  looks exactly like a click meaning "rename". */
const DWELL = 260;

/** A name edited where it is drawn.
 *
 *  One click opens it, but only when what it belongs to is already selected —
 *  it is the second click of a rename, never the first, so a click meant only
 *  to select still only selects. The layer's own frame is always where you
 *  are, so its name takes the click straight away.
 *
 *  Shared by the card, the group boundary and the frame, because a name should
 *  be changed the same way wherever it is written. */
export function Name({ text, live, className = "label", onRename }: {
  text: string;
  /** Whether a click should open the editor rather than fall through. */
  live: boolean;
  className?: string;
  onRename: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Losing the selection abandons a rename that had not opened yet.
  useEffect(() => {
    if (!live) window.clearTimeout(timer.current);
  }, [live]);

  function done(value: string) {
    // An unnamed thing shows its role, so leaving that untouched is not a
    // rename to the word "block".
    if (value.trim() && value.trim() !== text) onRename(value.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        // `nodrag`/`nopan` because React Flow's own listeners are native and on
        // the node itself — stopping the React event here would come too late.
        className="rename nodrag nopan"
        autoFocus
        defaultValue={text}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onBlur={(event) => done(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") done(event.currentTarget.value);
          if (event.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      className={className}
      title={live ? "click again to rename" : undefined}
      onClick={(event) => {
        if (!live) return;
        event.stopPropagation();
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setEditing(true), DWELL);
      }}
      // Whatever the second click meant, it was not this.
      onDoubleClick={() => window.clearTimeout(timer.current)}
    >
      {text}
    </span>
  );
}

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
  onRename: (id: string, label: string) => void;
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

/** The contents of a container: one cell per immediate child block, up to
 *  {@link CHIP_CAP}.
 *
 *  The unit is 1|2 (large left, two horizontal on the right), or two wide rows
 *  when there are only two. One group fills the band; two sit as columns; three
 *  tile as left | top-right / bottom-right. At ten or more the bottom-right
 *  cell reads "..." for the rest — click still opens the container.
 *
 *  Names shrink to fit the cell down to a floor, then hide.
 *
 *  Interfaces are never in here; they live on the frame. */
function Contents({ graph, id, onPick, onOpen }: ContentsProps) {
  const kids = blocksOf(graph, id);
  if (!kids.length) return <span className="hollow">empty</span>;

  // Ten or more: eight named chips and a final "…" in the bottom-right slot.
  const overflow = kids.length >= 10;
  const shown = kids.slice(0, overflow ? CHIP_CAP - 1 : CHIP_CAP);
  const rest = kids.length - shown.length;
  // Worked out in the band's own proportions and then expressed as
  // percentages of it, so the cells follow the card without measuring it.
  const band = { w: LEAF.w, h: GRID };
  const tiles = pack(overflow ? CHIP_CAP : shown.length, band);

  function cellStyle(seat: { x: number; y: number; w: number; h: number }, fill?: string) {
    return {
      left: `calc(${(seat.x / band.w) * 100}% + 1px)`,
      top: `calc(${(seat.y / band.h) * 100}% + 1px)`,
      width: `calc(${(seat.w / band.w) * 100}% - 2px)`,
      height: `calc(${(seat.h / band.h) * 100}% - 2px)`,
      background: fill,
    };
  }

  return (
    // A definite height, not a share of the card's: the card is sized by its
    // content, and cells placed absolutely are no content at all.
    <div className="treemap" style={{ height: band.h }}>
      {shown.map((kid, at) => {
        const seat = tiles[at];
        const label = nameOf(graph, kid);
        const size = fitTag(seat.w - 2, seat.h - 2, label);

        return (
          <div
            key={kid.id}
            className={`cell nodrag ${isContainer(graph, kid.id) ? "group" : "object"}`}
            style={cellStyle(seat, `rgba(74, 222, 128, ${0.08 + affinity(graph, kid) * 0.5})`)}
            title={`${label} — drag onto the canvas to lift it out`}
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.setData(LIFTED, kid.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={(event) => (event.stopPropagation(), onPick(kid.id))}
            onDoubleClick={(event) => (event.stopPropagation(), onOpen(kid.id))}
          >
            {size != null && (
              <span className="tag" style={{ fontSize: size }}>
                {label}
              </span>
            )}
          </div>
        );
      })}
      {overflow && (() => {
        const seat = tiles[CHIP_CAP - 1];
        const size = fitTag(seat.w - 2, seat.h - 2, "...");

        return (
          <div
            className="cell nodrag more"
            style={cellStyle(seat)}
            title={`${rest} more — open to see them`}
            onClick={(event) => (event.stopPropagation(), onOpen(id))}
            onDoubleClick={(event) => (event.stopPropagation(), onOpen(id))}
          >
            {size != null && (
              <span className="tag" style={{ fontSize: size }}>
                ...
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export const NodeCard = memo(({ data, selected }: NodeProps) => {
  const { node, graph, changed, dropping, picked, showPorts, pickedPort } =
    data as unknown as CardData;
  const { onPick, onOpen, onSlidePort, onRename } = data as unknown as CardData;
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

      {/* Edited where it is written, once the card is selected — the second
          click of a rename. A double-click still descends. */}
      <div className="card-head">
        <Name
          text={nameOf(graph, node)}
          live={picked}
          onRename={(label) => onRename(node.id, label)}
        />
        {node.type && <span className="kind">{node.type}</span>}
      </div>

      {holds && <Contents graph={graph} id={node.id} onPick={onPick} onOpen={onOpen} />}
    </div>
  );
});
