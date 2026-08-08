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
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";

import { blocksOf, isContainer, isLinked, isProxy, nameOf, portsOf } from "./core/fold";
import { NameField } from "./NameField";
import { affinity, CHIP_CAP, freeSeat, GRID, LEAF, pack, seatAt, sizeOf } from "./core/layout";
import type { Graph, Element, Side } from "./core/types";
import { useEmbeddings } from "./useEmbeddings";

/** Tag type scales between these; below the floor the name is withheld. */
const TAG = { min: 6, max: 9, line: 1.15, pad: 4, mono: 0.62 };

/** How many lines `text` needs at `cols` characters per line, wrapping only
 *  on spaces. Returns null when a single word is longer than a line. */
function wrapLines(text: string, cols: number): number | null {
  if (cols < 1) return null;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;

  let lines = 1;
  let used = 0;
  for (const word of words) {
    if (word.length > cols) return null;
    if (used === 0) {
      used = word.length;
    } else if (used + 1 + word.length <= cols) {
      used += 1 + word.length;
    } else {
      lines += 1;
      used = word.length;
    }
  }
  return lines;
}

/** Largest font that fits the cell. Prefers space-wrapping; if a word will not
 *  fit unbroken, falls back to one clipped line so the name still shows. */
function fitTag(w: number, h: number, text: string): { size: number; wrap: boolean } | null {
  const aw = w - TAG.pad;
  const ah = h - TAG.pad;
  if (ah < TAG.min * TAG.line || aw < TAG.min) return null;

  const top = Math.min(TAG.max, ah / TAG.line);
  for (let size = top; size >= TAG.min - 1e-6; size -= 0.25) {
    const cols = Math.floor(aw / (size * TAG.mono));
    const lines = wrapLines(text, cols);
    if (lines != null && lines * size * TAG.line <= ah + 1e-6) {
      return { size, wrap: true };
    }
  }

  let size = top;
  if (text.length) size = Math.min(size, aw / (text.length * TAG.mono));
  return { size: Math.max(size, TAG.min), wrap: false };
}
/** How far a pointer must travel before a press becomes a drag rather than a
 *  click that shook on the way down. */
const NUDGE = 4;

/** How a side maps onto React Flow's own positions. */
const SIDES: Record<Side, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/** A name edited where it is drawn, opened by right-clicking it.
 *
 *  One rule for every name on the canvas — a card's, a group boundary's, the
 *  layer's own frame — because a name should be changed the same way wherever
 *  it is written.
 *
 *  The right button means "make the thing this place is for", and what a name
 *  is for is being written. It collides with nothing: a name is the one place
 *  where making a node or an interface would be meaningless. It also replaced
 *  three rules and a timer — renaming used to be the second click on something
 *  already selected, and on a card that click had to wait a quarter of a second
 *  to see whether a double-click was coming to descend instead. */
export function Name({ text, className = "label", onRename, taken, onSay }: {
  text: string;
  className?: string;
  onRename: (label: string) => void;
  /** Whether a name is already spoken for beside this one. Left off where
   *  nothing competes for it — a note is its own text. */
  taken?: (name: string) => boolean;
  onSay?: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  /** Where the right button went down, so that a right *drag* setting off from
   *  a name is not also read as a request to write it. */
  const from = useRef<{ x: number; y: number } | null>(null);

  function done(value: string) {
    // An unnamed thing shows its role, so leaving that untouched is not a
    // rename to the word "block".
    if (value.trim() && value.trim() !== text) onRename(value.trim());
    setEditing(false);
  }

  if (editing) {
    // `guarded` because this one sits on the canvas: React Flow listens
    // natively on the node, so the events have to be held off there too.
    return (
      <NameField
        initial={text}
        className="rename"
        guarded
        taken={taken}
        onSay={onSay}
        onCommit={done}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <span
      className={className}
      title="right-click to rename"
      onPointerDown={(event) => {
        if (event.button === 2) from.current = { x: event.clientX, y: event.clientY };
      }}
      onContextMenu={(event) => {
        // The canvas is watching the right button too, and would otherwise make
        // an interface out of the border this name is set into.
        event.preventDefault();
        event.stopPropagation();

        const down = from.current;
        from.current = null;
        // Nothing happens until a drag pulls clear of the press, and nothing
        // happens after one either: a drag that began here meant to go
        // somewhere, not to open an editor back where it started.
        if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > NUDGE) return;

        setEditing(true);
      }}
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

/** Where a port sits along its host's edge, as the seated fraction. */
function along(at: number, extent: number, origin: number): number {
  return seatAt(at, extent, origin);
}

/** Edge length and near-end origin of a port's host in canvas units. */
function edgeOf(
  graph: Graph, port: Element, side: Side,
  host?: { x: number; y: number; w: number; h: number },
): { extent: number; origin: number } {
  const flat = side === "top" || side === "bottom";

  if (host) {
    return {
      extent: flat ? host.w : host.h,
      origin: flat ? host.x : host.y,
    };
  }

  const parent = port.parent ? graph.elements[port.parent] : null;
  if (!parent) {
    return { extent: flat ? LEAF.w : LEAF.h, origin: 0 };
  }

  const size = sizeOf(graph, parent);
  return { extent: flat ? size.w : size.h, origin: 0 };
}

/** Where an anchor sits on the frame, as CSS. */
export function seat(side: Side, at: number): React.CSSProperties {
  // Not rounded to whole percent. One percent of a card is a pixel or so, but
  // one percent of the layer's own frame is eight or more — enough that a
  // relationship dragged onto an interface landed beside it instead, leaving a
  // bend nobody asked for and nobody could drag out again.
  const along = `${(at * 100).toFixed(3)}%`;

  return side === "top" || side === "bottom" ? { left: along } : { top: along };
}

/** What the pointer is over, worked out by the canvas rather than by `:hover`.
 *
 *  One thing highlights at a time, and it is the thing an interaction would
 *  act on: the innermost wins, so a chip beats the container holding it and an
 *  interface beats the card it sits on. A card is one target, border included.
 *  `title` is a frame's or a boundary's name, which is set into that border and
 *  is not it: the right button renames there, and makes nothing. */
export type Grazed = {
  kind: "selection" | "port" | "cell" | "card" | "frame" | "group" | "title" | "edge";
  id: string;
} | null;

export type CardData = {
  node: Element;
  graph: Graph;
  dropping: boolean;
  picked: boolean;
  grazed: Grazed;
  /** Whether a name is already taken beside this card, and where to say so. */
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  onSay: (message: string) => void;
  /** What this module calls a plain one of these, for a card with no subtype
   *  of its own — "Module", "Character", and one day "Activity". Derived and
   *  never stored: a default written onto every element would say nothing, and
   *  would go stale the moment the domain changed. */
  unit: string;
  /** Interfaces drawn or hidden — a display preference, global to the app. */
  showPorts: boolean;
  /** Hidden interfaces whose seats still show as handles, because the
   *  relationship tied to them is selected. */
  litSeats: Set<string>;
  pickedPort: string | null;
  /** Seats this layer worked out for relationships with no interface of their
   *  own. Not nodes, and nowhere in the graph — geometry, recomputed. */
  seats: Seated[];
  /** Relationships selected right now, so their anchors show themselves. */
  litEdges: Set<string>;
  /** Mark something as the selection without changing which layer is open. */
  onPick: (id: string) => void;
  /** Enter something's own contents. Only a double-click reaches this. */
  onOpen: (id: string) => void;
  onSlidePort: (id: string, side: Side, at: number) => void;
  onRename: (id: string, label: string) => void;
  /** Turn one of those seats into an interface of its own. */
  onPromote: (edge: string, side: Side, at: number) => void;
};

/** One derived seat: which relationship put it there, and where it sits. */
export type Seated = { edge: string; side: Side; at: number; port: boolean };

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

/** Where a hidden interface's relationships still meet the edge.
 *
 *  Turning interfaces off is a display preference and changes nothing about
 *  the relationships: the anchor stays where the interface was, so lines meet
 *  the border in the same place whether or not the squares are drawn.
 *
 *  Normally it draws nothing at all. It shows a small round handle while the
 *  relationship attached to it, or the node it sits on, is selected — enough to
 *  see where a line is tied on without turning every square back on. */
export function Berth({ port, graph, shown, inward, host }: {
  port: Element;
  graph: Graph;
  shown: boolean;
  inward?: boolean;
  /** Host box in canvas units — seats are absolute on the canvas lattice. */
  host?: { x: number; y: number; w: number; h: number };
}) {
  const side = port.side ?? "right";
  const { extent, origin } = edgeOf(graph, port, side, host);
  const at = along(port.at ?? 0.5, extent, origin);

  return (
    <span className={`berth port-${side}`} style={seat(side, at)}>
      {shown && <span className="seat" />}
      <Anchor name={`port-${port.id}`} side={side} inward={inward} />
    </span>
  );
}

/** A seat the layer worked out for a relationship that has no interface of its
 *  own here — the common case, now that drawing a line makes no nodes.
 *
 *  **A port and an anchor are not the same thing.** A `flow` relationship's ends
 *  are typed — one is in, the other out — so they draw as interfaces, which is
 *  what they are. Every other relationship just meets the card: its end is an
 *  anchor, a place on the border and nothing more, and drawing a square there
 *  would claim a port the model does not have.
 *
 *  An anchor still shows itself when its relationship or its card is selected,
 *  the same way a hidden interface does, so a line's ends can always be found.
 *  Right-clicking either promotes it to a real interface, where it sits. */
export function Perch({ seated, side, at, port, lit, inward, onPromote }: {
  seated: string;
  side: Side;
  at: number;
  /** Draw it as an interface: a `flow` end, with interfaces turned on. */
  port: boolean;
  /** Its relationship or its card is selected, so an anchor shows its handle. */
  lit: boolean;
  inward?: boolean;
  onPromote: (edge: string, side: Side, at: number) => void;
}) {
  return (
    <span
      className={`berth port-${side} perch`}
      style={seat(side, at)}
      // On the press, not on the menu event: the canvas makes an interface from
      // its own `pointerdown`, so a `contextmenu` handler stops nothing — the
      // card had already been given a second port by the time it fired.
      onPointerDown={(event) => {
        if (event.button !== 2) return;
        event.preventDefault();
        event.stopPropagation();
        onPromote(seated, side, at);
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {port ? <span className="seat-mark" /> : lit && <span className="seat" />}
      <Anchor name={`auto-${side}`} side={side} inward={inward} />
    </span>
  );
}

export type PortProps = {
  port: Element;
  graph: Graph;
  picked: boolean;
  /** True when this is the one thing the pointer is over. */
  grazed: boolean;
  /** Set on the layer's own frame, whose contents face inward. */
  inward?: boolean;
  /** Host box in canvas units — seats are absolute on the canvas lattice. */
  host?: { x: number; y: number; w: number; h: number };
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
  onSlide: (id: string, side: Side, at: number) => void;
};

/** One interface on the frame edge. Click to select it, and drag it to slide
 *  it along the edge and around corners — one gesture, without selecting it
 *  first. A port is a small target the pointer reports precisely, so a drag on
 *  one can only have meant the port.
 *
 *  Sliding is all it does. An interface never steps off the border to become a
 *  child block, and no child block steps onto it — the two are different kinds
 *  of thing, and a drag that could silently turn one into the other made every
 *  ordinary move a hazard.
 *
 *  It draws filled when a relationship attaches to it and open when none does,
 *  so a glance at a card says which of its ports are wired and which are only
 *  describing its shape.
 *
 *  Shared by the cards and by the layer's own frame, which carries ports the
 *  same way — the only difference is whose edge they sit on. */
export function Port({ port, graph, picked, grazed, inward, host,
                       onPick, onOpen, onSlide }: PortProps) {
  const flow = useReactFlow();
  const [drag, setDrag] = useState<{ side: Side; at: number } | null>(null);
  /** Where the button went down, until the pointer has travelled far enough
   *  for this to be a slide rather than a click that shook. */
  const held = useRef<{ x: number; y: number } | null>(null);
  const side = drag?.side ?? port.side ?? "right";
  const { extent, origin } = edgeOf(graph, port, side, host);
  const at = along(drag?.at ?? port.at ?? 0.5, extent, origin);
  const deep = isContainer(graph, port.id);
  const wired = isLinked(graph, port.id);

  /** Nearest free seat on the host to a point, and which edge it is on. The
   *  point is clamped to the host first, so a drag that wanders off the card
   *  still leaves the port somewhere sensible on its border.
   *
   *  The host is measured on screen, so its length is divided by the zoom to
   *  get the canvas units seats are counted in. The fraction itself needs no
   *  such correction — it is a ratio, and the zoom cancels. The near corner is
   *  converted to canvas units so seats land on the absolute lattice. */
  function nearest(event: React.PointerEvent) {
    const el = (event.currentTarget as HTMLElement).closest(".card, .frame");
    const box = el?.getBoundingClientRect();
    if (!box) return { side, at };

    const x = Math.min(Math.max(event.clientX - box.left, 0), box.width);
    const y = Math.min(Math.max(event.clientY - box.top, 0), box.height);
    const gaps = { left: x, right: box.width - x, top: y, bottom: box.height - y };
    const closest = (Object.keys(gaps) as Side[])
      .reduce((best, name) => (gaps[name] < gaps[best] ? name : best), "left" as Side);
    const flat = closest === "top" || closest === "bottom";
    const frac = flat ? x / box.width : y / box.height;
    const zoom = flow.getZoom() || 1;
    const span = (flat ? box.width : box.height) / zoom;
    const corner = flow.screenToFlowPosition({ x: box.left, y: box.top });
    const start = flat ? corner.x : corner.y;

    return { side: closest, at: freeSeat(graph, port, closest, frac, span, start) };
  }

  return (
    <span
      // `nodrag` keeps React Flow's own drag off this: its listener is native
      // and on the card itself, so stopping the React event here would come
      // too late — the card would move instead of the port sliding along it.
      className={[
        "port", "nodrag", "nopan", `port-${side}`, picked ? "picked" : "",
        grazed ? "grazed" : "", wired ? "wired" : "", deep ? "deep" : "",
        port.flow ? `flow-${port.flow}` : "",
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
        held.current = { x: event.clientX, y: event.clientY };
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const from = held.current;
        if (!from) return;
        // Below the threshold it is still a click, which selects and no more.
        if (!drag && Math.hypot(event.clientX - from.x, event.clientY - from.y) < NUDGE) {
          return;
        }

        setDrag(nearest(event));
      }}
      onPointerUp={(event) => {
        if (!held.current) return;
        held.current = null;
        if (!drag) return;

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
  grazed: Grazed;
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
 *  Names wrap on spaces and shrink to fit; a single long word stays on one
 *  line and ellipsizes rather than vanishing.
 *
 *  Interfaces are never in here; they live on the frame. */
function Contents({ graph, id, grazed, onPick, onOpen }: ContentsProps) {
  const kids = blocksOf(graph, id);
  if (!kids.length) return <span className="hollow">empty</span>;

  // Ten or more: eight named chips and a final "…" in the bottom-right slot.
  const overflow = kids.length >= 10;
  const shown = kids.slice(0, overflow ? CHIP_CAP - 1 : CHIP_CAP);
  const rest = kids.length - shown.length;
  // Worked out in the band's own proportions and then expressed as
  // percentages of it, so the cells follow the card without measuring it. The
  // whole band, which is exactly how much taller a container is than a block —
  // the head takes the rest, which comes to a block's worth.
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
    // A definite height, not a share of the card's: cells placed absolutely
    // are no content at all, so nothing else would give the band a size. No
    // margin above it — the name is centred in the room it has, which leaves
    // the separation without spending height on it.
    <div className="treemap" style={{ height: band.h }}>
      {shown.map((kid, at) => {
        const seat = tiles[at];
        const label = nameOf(graph, kid);
        const fit = fitTag(seat.w - 2, seat.h - 2, label);

        return (
          <div
            key={kid.id}
            className={[
              "cell", "nodrag", isContainer(graph, kid.id) ? "group" : "object",
              grazed?.kind === "cell" && grazed.id === kid.id ? "grazed" : "",
            ].join(" ")}
            style={cellStyle(seat, `rgba(74, 222, 128, ${0.08 + affinity(graph, kid) * 0.5})`)}
            title={`${label} — drag onto the canvas to lift it out`}
            data-cell={kid.id}
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.setData(LIFTED, kid.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={(event) => (event.stopPropagation(), onPick(kid.id))}
            onDoubleClick={(event) => (event.stopPropagation(), onOpen(kid.id))}
          >
            {fit && (
              <span className={`tag${fit.wrap ? "" : " clip"}`} style={{ fontSize: fit.size }}>
                {label}
              </span>
            )}
          </div>
        );
      })}
      {overflow && (() => {
        const seat = tiles[CHIP_CAP - 1];
        const fit = fitTag(seat.w - 2, seat.h - 2, "...");

        return (
          <div
            className={`cell nodrag more ${grazed?.kind === "cell" && grazed.id === id
                                           ? "grazed" : ""}`}
            style={cellStyle(seat)}
            title={`${rest} more — open to see them`}
            data-cell={id}
            onClick={(event) => (event.stopPropagation(), onOpen(id))}
            onDoubleClick={(event) => (event.stopPropagation(), onOpen(id))}
          >
            {fit && (
              <span className={`tag${fit.wrap ? "" : " clip"}`} style={{ fontSize: fit.size }}>
                ...
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export const NodeCard = memo(({ data, selected, positionAbsoluteX = 0,
                                positionAbsoluteY = 0 }: NodeProps) => {
  const { node, graph, dropping, picked, grazed, showPorts, litSeats, pickedPort, unit } =
    data as unknown as CardData;
  const { onNameTaken, onSay } = data as unknown as CardData;
  const { onPick, onOpen, onSlidePort, onRename } = data as unknown as CardData;
  const { seats, litEdges, onPromote } = data as unknown as CardData;
  // Shading follows affinity, which is only known once vectors exist.
  useEmbeddings();

  const holds = isContainer(graph, node.id);
  const size = sizeOf(graph, node);
  const host = { x: positionAbsoluteX, y: positionAbsoluteY, w: size.w, h: size.h };
  const classes = ["card", holds ? "group" : "object",
                   isProxy(node) ? "reference" : "",
                   selected || picked ? "picked" : "",
                   selected ? "chosen" : "",
                   grazed?.kind === "card" && grazed.id === node.id ? "grazed" : "",
                   dropping ? "dropping" : ""].join(" ");

  return (
    <div className={classes}>
      {/* One anchor per side for relations with no interface of their own —
          derived from the relation itself, so nothing is stored and nothing is
          left behind when it goes. */}
      {(Object.keys(SIDES) as Side[]).map((side) => (
        <Anchor key={side} name={`auto-${side}`} side={side} />
      ))}

      {/* Hidden, an interface still leaves its seat behind, so the relations
          attached to it meet the border where it sits rather than sliding to
          the middle of a side — and the seat shows itself while this card or
          the relationship tied to it is selected. */}
      {portsOf(graph, node.id).map((port) => (showPorts ? (
        <Port
          key={port.id}
          port={port}
          graph={graph}
          host={host}
          picked={pickedPort === port.id}
          grazed={grazed?.kind === "port" && grazed.id === port.id}
          onPick={onPick}
          onOpen={onOpen}
          onSlide={onSlidePort}
        />
      ) : (
        <Berth
          key={port.id}
          port={port}
          graph={graph}
          host={host}
          shown={picked || selected || litSeats.has(port.id)}
        />
      )))}

      {/* And the seats this layer worked out for relationships with no
          interface of their own — most of them. */}
      {seats.map((s) => (
        <Perch
          key={s.edge}
          seated={s.edge}
          side={s.side}
          at={s.at}
          port={s.port}
          lit={litEdges.has(s.edge) || selected || picked}
          onPromote={onPromote}
        />
      ))}

      {/* Edited where it is written, once the card is selected — the second
          click of a rename. A double-click still descends. */}
      <div className={`card-head${
        grazed?.kind === "title" && grazed.id === node.id ? " grazed" : ""}`}>
        <Name
          text={nameOf(graph, node)}
          onRename={(label) => onRename(node.id, label)}
          taken={(name) => onNameTaken(node.parent ?? null, name, node.id)}
          onSay={onSay}
        />
        {/* A subtype where one was set, otherwise what this module calls a
            plain one. Container-ness can ride along here where it cannot ride
            on the name: a chip describes what a card is right now, while a
            name has to stay put when a child is added. */}
        <span className={`kind${node.type ? "" : " plain"}`}>
          {node.type || (isContainer(graph, node.id) ? `${unit} group` : unit)}
        </span>
      </div>

      {holds && (
        <Contents graph={graph} id={node.id} grazed={grazed} onPick={onPick} onOpen={onOpen} />
      )}
    </div>
  );
});
