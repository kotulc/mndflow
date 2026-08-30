/** What a box looks like, as React Flow node types.
 *
 *  **These are the notation, which is why they are still ours.** Everything
 *  around them — the viewport, the hit testing, the drag, the edge paths — is
 *  the library's. A node here draws a rectangle, a name and its handles, reads
 *  its look off what the projection resolved, and knows nothing about the graph.
 *
 *  One component covers every box that is a rectangle, because they differ only
 *  in the look they carry and the ramp keys off it. A frame, a seat and a
 *  control are the three that are not. **Which one draws a node is the
 *  projection's to say** — it sets `type`, so nothing here re-derives it from
 *  marks and a new mark cannot silently pick the wrong component.
 *
 *  **Nothing here chooses a colour, a weight or a size.** A definition picked a
 *  slot and an emphasis; those arrive as attributes and the stylesheet is what
 *  turns them into steps on the ramp. */

import { memo, useEffect } from "react";
import { Handle, NodeResizer, Position, useUpdateNodeInternals,
         type NodeProps } from "@xyflow/react";
import type { Side } from "@mnd/core";
import { PLAIN, type BoxData, type BoxNode, type Cell, type Look } from "@mnd/views";

/** What this node would draw, as a value.
 *
 *  **A projection is a pure function re-run on every render of the app**, so
 *  every `data` object is new every time even when nothing about the card has
 *  changed. Left alone that makes memoising useless and every card on the layer
 *  re-renders whenever any one of them is picked, dragged or renamed. Comparing
 *  the handful of things a card actually draws is far cheaper than drawing it,
 *  and it is what keeps a click costing two renders instead of sixteen. */
function seen(p: NodeProps<BoxNode>): string {
  const d = p.data;
  const k = d.look;
  return [
    p.selected, p.dragging, p.width, p.height,
    d.label, d.def, d.on, d.marks.join(","),
    k && `${k.slot}${k.emphasis}${k.weight}${k.voice}${k.shape}${k.label}${k.kind ?? ""}`,
    d.cells?.map((c) => `${c.id}${c.kind}${c.tint}${c.rest ?? ""}`).join(","),
    d.fields?.map((f) => `${f.name}=${f.value}`).join(","),
    d.seats?.map((t) => `${t.id}${t.side}${t.at}`).join(","),
  ].join("|");
}

const same = (a: NodeProps<BoxNode>, b: NodeProps<BoxNode>) => seen(a) === seen(b);

/** Where a line may join. **Every side, always** — which side a route actually
 *  leaves by is the router's to decide, and a card that offered fewer would
 *  make the arrangement decide it instead. Hidden until a connection starts;
 *  React Flow shows them itself. */
const SIDES = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
] as const;

/** How a side names itself to the library. */
const WALL: Record<Side, Position> = {
  top: Position.Top, right: Position.Right,
  bottom: Position.Bottom, left: Position.Left,
};

/** The face opposite a side, for a wall looked at from the inside. */
const FACING: Record<Side, Side> = {
  top: "bottom", bottom: "top", left: "right", right: "left",
};

/** Where along a wall a seat sits, as the one CSS offset the library's own
 *  handle rule leaves free. */
function along(side: Side, at: number): React.CSSProperties {
  const fraction = `${(at * 100).toFixed(3)}%`;
  return side === "top" || side === "bottom" ? { left: fraction } : { top: fraction };
}

/** A card's border, as its own four targets.
 *
 *  **The border and the body are different things to point at**: the body is
 *  the block, and the border is a wall you put an interface on. One region for
 *  both made every right-click near an edge ambiguous, and the pointer is
 *  precise enough that it never had to be. */
function Brim() {
  return (
    <>
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <span key={side} className={`mnd-brim mnd-brim-${side}`} data-side={side} aria-hidden />
      ))}
    </>
  );
}

/** The seats a line meets on this box's border.
 *
 *  **One handle per end, placed rather than chosen.** Left to itself the
 *  library takes whichever handle comes first, which sends a line between two
 *  neighbours out of the top and back around; the projection already worked out
 *  which wall faces which and where along it two lines stay apart.
 *
 *  **Not a target for the pointer.** A perch is where a line already meets, not
 *  a place to start one — that is what the four joins are for — and it sits
 *  exactly where the grip for that end is drawn, so leaving it connectable put
 *  a handle on top of the anchor and swallowed every drag meant for it. */
function Seats({ seats, inward }: {
  seats: NonNullable<BoxData["seats"]>;
  /** Set on the frame, whose contents are on the inside — a line meeting its
   *  right wall has to set off leftwards or it loops out and comes back in. */
  inward?: boolean;
}) {
  const face = (side: Side) => WALL[inward ? FACING[side] : side];
  return (
    <>
      {seats.map((t) => (
        <Handle key={`s-${t.id}`} type="source" id={`s-${t.id}`}
                className={`mnd-perch mnd-perch-${t.side}`} isConnectable={false}
                position={face(t.side)} style={along(t.side, t.at)} />
      ))}
      {seats.map((t) => (
        <Handle key={`t-${t.id}`} type="target" id={`t-${t.id}`}
                className={`mnd-perch mnd-perch-${t.side}`} isConnectable={false}
                position={face(t.side)} style={along(t.side, t.at)} />
      ))}
    </>
  );
}

/** **A handle that moved has to be measured again.** The library caches where
 *  each of a node's handles sits; a seat that slid because two cards drifted
 *  apart is a handle in a new place, and without saying so the line keeps
 *  leaving the old one. */
function useSeats(id: string, seats: BoxData["seats"]) {
  const remeasure = useUpdateNodeInternals();
  const where = seats?.map((t) => `${t.id}${t.side}${t.at}`).join(",") ?? "";
  useEffect(() => { if (where) remeasure(id); }, [id, where, remeasure]);
}

function Joins() {
  return (
    <>
      {SIDES.map((s) => (
        <Handle key={`s-${s.id}`} type="source" id={`s-${s.id}`} position={s.position} />
      ))}
      {SIDES.map((s) => (
        <Handle key={`t-${s.id}`} type="target" id={`t-${s.id}`} position={s.position} />
      ))}
    </>
  );
}

/** What a definition said, as attributes the stylesheet reads. Spread onto the
 *  element, so a look is one object here and a table of selectors there. */
function dressed(look: Look) {
  return {
    "data-slot": look.slot,
    "data-emphasis": look.emphasis,
    "data-weight": look.weight,
    "data-voice": look.voice,
    "data-shape": look.shape,
    "data-layout": look.layout,
  };
}

/** A shape that is not a rectangle, stroked inside the box the engine placed.
 *
 *  **The engine always places a rectangle**, and every seat, route and
 *  interface reads it — so this changes what is *drawn* and never where
 *  anything attaches. A rounded or elliptical card is a border radius and needs
 *  none of this; a diamond and a hexagon are corners, and corners need a path.
 *
 *  Drawn with `preserveAspectRatio="none"` so one set of coordinates fits every
 *  card, and `non-scaling-stroke` so the line stays the weight the ramp asked
 *  for rather than being stretched with the box. */
const CORNERS: Record<string, string> = {
  diamond: "50,1 99,50 50,99 1,50",
  hex: "25,1 75,1 99,50 75,99 25,99 1,50",
};

function Outline({ shape }: { shape: string }) {
  const points = CORNERS[shape];
  if (!points) return null;
  return (
    <svg className="mnd-outline" viewBox="0 0 100 100" preserveAspectRatio="none"
         aria-hidden focusable="false">
      <polygon points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** What a container holds, as a picture inside its own card.
 *
 *  **Only the immediate children.** Nesting past one level is what descending
 *  is for, and a card the height of a few grid rows has room for a handful of
 *  cells before each of them says nothing.
 *
 *  A cell's shade comes from its name and its base from what it is, so a
 *  container of several distinct things looks like several distinct things —
 *  and one holding another container says so without being opened. */
function Holds({ cells }: { cells: readonly Cell[] }) {
  const cols = cells.length <= 2 ? cells.length : cells.length <= 6 ? 3 : 4;
  return (
    <div className="mnd-holds" style={{ "--cols": cols } as React.CSSProperties}>
      {cells.map((c) => (
        <span key={c.id} className={`mnd-cell ${c.kind} tint-${c.tint}`}
              title={c.rest ? `${c.label}, and ${c.rest} more` : c.label}>
          {c.rest ? `+${c.rest}` : c.label}
        </span>
      ))}
    </div>
  );
}

/** The ordinary card, and every mark that is still a rectangle: a container, a
 *  reference, a note, a lane, a cell.
 *
 *  Composed rather than styled: a head that carries the name and the subtype it
 *  names, then whatever the layout asks for beneath it — the children a
 *  container holds, or the fields a note shows. */
function CardNode({ id, data, selected }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  const look = data.look ?? PLAIN;
  const named = look.label !== "none";
  return (
    <div className={["mnd-card", ...data.marks, selected ? "picked" : ""]
            .filter(Boolean).join(" ")}
         {...dressed(look)} data-def={data.def} title={data.label}>
      <Outline shape={look.shape} />
      <Brim />
      {named ? (
        <div className="mnd-head">
          <span className="mnd-label">{data.label}</span>
          {/* A subtype where somebody set one. **Absent rather than a default
              word** — every card that nobody has told apart would otherwise
              carry the same chip, which is noise on all of them. */}
          {look.kind ? <span className="mnd-kind">{look.kind}</span> : null}
        </div>
      ) : null}
      {data.cells?.length ? <Holds cells={data.cells} /> : null}
      {data.fields?.length ? (
        <dl className="mnd-fields">
          {data.fields.map((f) => (
            <div key={f.name}>
              <dt>{f.name}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <Joins />
      {data.seats?.length ? <Seats seats={data.seats} /> : null}
    </div>
  );
}

/** A note: text, resized by hand.
 *
 *  **The one card whose size is yours to set.** A block already stores `w` and
 *  `h` and every other card is sized from what it holds, so a note is where
 *  those fields are worth having a grip on. The handles are the library's;
 *  where the corner came to rest arrives as an ordinary adjustment. */
function NoteNode({ id, data, selected }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  const look = data.look ?? PLAIN;
  return (
    <div className={["mnd-card", "note", ...data.marks, selected ? "picked" : ""]
            .filter(Boolean).join(" ")}
         {...dressed(look)} data-def={data.def}>
      <NodeResizer isVisible={selected} minWidth={96} minHeight={48}
                   lineClassName="mnd-edge" handleClassName="mnd-grip" />
      <span className="mnd-note-text">{data.label}</span>
      {data.fields?.length ? (
        <dl className="mnd-fields">
          {data.fields.map((f) => (
            <div key={f.name}><dt>{f.name}</dt><dd>{f.value}</dd></div>
          ))}
        </dl>
      ) : null}
      <Joins />
      {data.seats?.length ? <Seats seats={data.seats} /> : null}
    </div>
  );
}

/** A boundary: a band behind its members, naming itself along the top.
 *
 *  It is its members' bounds rather than a stored size, so there is nothing to
 *  resize and nothing to place — what it holds is what it is. */
function GroupNode({ id, data, selected }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  const look = data.look ?? PLAIN;
  return (
    <div className={["mnd-group", selected ? "picked" : ""].filter(Boolean).join(" ")}
         {...dressed(look)} title={data.label}>
      <span className="mnd-group-name">{data.label}</span>
      <Joins />
      {data.seats?.length ? <Seats seats={data.seats} /> : null}
    </div>
  );
}

/** A decision and a merge are the one pair of controls that is not a bar. The
 *  diamond is a rotated square, so the name inside it turns back. */
function ControlNode({ id, data, selected }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  return (
    <div className={["mnd-control", ...data.marks, selected ? "picked" : ""]
            .filter(Boolean).join(" ")}
         title={data.label}>
      <span className="mnd-diamond" />
      <span className="mnd-label">{data.label}</span>
      <Joins />
      {data.seats?.length ? <Seats seats={data.seats} /> : null}
    </div>
  );
}

/** An interface, seated on its owner's wall. It carries no name — the mark is
 *  the whole of it, and a hover says the rest. */
function SeatNode({ id, data, selected }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  return (
    <div className={["mnd-seat", ...data.marks, selected ? "picked" : ""]
            .filter(Boolean).join(" ")}
         title={data.label}>
      <Joins />
      {data.seats?.length ? <Seats seats={data.seats} /> : null}
    </div>
  );
}

/** The open layer seen from within: a border with the name set into it, the
 *  interfaces of the layer seated on it, and the band outside it dimmed.
 *
 *  Drawn as a node so it pans and zooms with everything else, but the border
 *  itself takes no gesture — descending is a double click on the band, and the
 *  name is the one part of it that answers a pointer.
 *
 *  **An interface opened from the inside straddles its parent's border**, and
 *  what says so is the parent's own wall, running through the dimmed band on
 *  either side and stopping where this frame begins: you are inside the port,
 *  looking out at the wall it is set into. It runs down for a port on a left or
 *  right wall and across for one on a top or bottom wall. */
export function Frame({ id, data }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  const upright = data.side === "left" || data.side === "right";
  return (
    <div className="mnd-frame" data-axis={data.look?.layout ?? "name"}>
      {data.seats?.length ? <Seats seats={data.seats} inward /> : null}
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <span key={side} className={`mnd-rim mnd-rim-${side}`} aria-hidden />
      ))}
      {data.side ? (
        <span className={`mnd-wall ${upright ? "upright" : "flat"}`} aria-hidden>
          <span className="before" />
          <span className="after" />
        </span>
      ) : null}
      <span className="mnd-frame-name">{data.label}</span>
    </div>
  );
}

/** Keyed by the name a projection asks for. Registered once, at module scope —
 *  a fresh object each render remounts every node on the canvas. */
/** Memoised on what each draws, never on identity — see `seen`. The frame is
 *  the one that is not: there is at most one of it, and it changes whenever the
 *  room does. */
export const Card = memo(CardNode, same);
export const Note = memo(NoteNode, same);
export const Group = memo(GroupNode, same);
export const Control = memo(ControlNode, same);
export const Seat = memo(SeatNode, same);

export const NODE_TYPES = {
  card: Card,
  note: Note,
  group: Group,
  control: Control,
  seat: Seat,
  frame: Frame,
} as const;
