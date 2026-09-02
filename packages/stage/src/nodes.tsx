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

/** What a row or a chip being dragged onto the drawing carries. **Named here**
 *  because a chip is drawn here, and the canvas that catches one only has to
 *  agree about the name. */
export const DRAGGED = "text/mnd-block";

import { BAND, FRAME, PLAIN,
         type BoxData, type BoxNode, type Cell, type Look } from "@mnd/views";
import type { Role } from "@mnd/core";
import { Icon, Name, useNaming, type IconName } from "@mnd/theme";

/** What a card wears in its corner: one mark per sort of block, the same set
 *  the tree draws down its left edge. **A container is solid** — the fill is
 *  what says it holds something, and an outline there would read as the plain
 *  block beside it. */
const ROLE: Record<Role, IconName> = {
  block: "role_leaf", container: "role_container", folder: "role_folder",
  reference: "role_reference", interface: "role_interface",
  group: "role_group", note: "role_note",
};

/** The mark itself. **Top right, on everything that has a corner**: a card says
 *  what it is without being read, which is the one thing a name cannot do —
 *  and it takes no pointer, because it is a label and not a control. */
function Wears({ role }: { role?: Role }) {
  if (!role) return null;
  return (
    <span className="mnd-role" data-role={role}>
      <Icon name={ROLE[role]} solid={role === "container"} size={11} />
    </span>
  );
}

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
    d.label, d.def, d.on, d.side, d.role, d.marks.join(","),
    k && `${k.slot}${k.emphasis}${k.weight}${k.voice}${k.shape}${k.label}${k.kind ?? ""}`,
    d.cells?.map((c) => `${c.id}${c.kind}${c.tint}${c.rest ?? ""}`).join(","),
    d.fields?.map((f) => `${f.name}=${f.value}`).join(","),
    d.seats?.map((t) => `${t.id}${t.side}${t.at}`).join(","),
  ].join("|");
}

const same = (a: NodeProps<BoxNode>, b: NodeProps<BoxNode>) => seen(a) === seen(b);

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

/** A card's border, as one target around the whole card.
 *
 *  **The border and the body are different things to point at**: the body is
 *  the block, and the border is where an interface goes. But a card has *one*
 *  border, not four — which wall an interface lands on is read off the pointer
 *  and never chosen by aiming at a region. Four separately-lit edges is the
 *  frame's idea, because a room's walls are four different places to stand. */
function Brim() {
  return (
    <span className="mnd-brim" aria-hidden>
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <span key={side} className={`mnd-brim-${side}`} />
      ))}
    </span>
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

/** The one place a line meets a seat: its middle.
 *
 *  **A card offers no anchors of its own.** It used to carry eight — four sides
 *  doubled — so that a line could pick one, and they showed on hover as a row
 *  of marks nobody had asked for. Where a line meets a card is a *perch*, worked
 *  out from where the two ended up; where it meets an interface is the
 *  interface, which is a mark small enough to be the answer by itself.
 *
 *  **A line leaves an interface by the wall the interface is set into.** The
 *  point is the same either way; what the face decides is the direction the run
 *  sets off in, and left at right-and-left every line on a top or bottom port
 *  set off sideways and ran along the card's own border before turning. A port
 *  in the room's wall is looked at from the inside, so its run sets off the
 *  other way. */
function Middle({ side, inward }: { side?: Side; inward?: boolean }) {
  const spot = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  const face = side ? WALL[inward ? FACING[side] : side] : Position.Right;
  return (
    <>
      <Handle type="source" id="s" className="mnd-perch" isConnectable={false}
              position={face} style={spot} />
      <Handle type="target" id="t" className="mnd-perch" isConnectable={false}
              position={face} style={spot} />
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
 *  **A treemap, not a row of chips.** Equal columns say every child is the same
 *  size and shape; a tiling says *this holds these several distinct things*,
 *  which is the one thing a container can say without being opened. Where each
 *  cell falls is the projection's — it arrives as fractions of the band, and
 *  the band is the room a container has over a block.
 *
 *  Only the immediate children: nesting past one level is what descending is
 *  for. A cell's shade comes from its name and its base from what it is. */
/** How tall this cell actually is, in the band's own units. */
const cell_h = (c: Cell) => c.h * BAND.h;

/** **A name only where there is room for one.** Nine children make cells a
 *  dozen pixels tall, and a name overflowing one says less than no name. */
const named = (c: Cell) => cell_h(c) >= 10;

const type_size = (c: Cell) => Math.min(9, Math.round(cell_h(c)) - 4);

function Holds({ cells }: { cells: readonly Cell[] }) {
  const naming = useNaming();
  return (
    <div className="mnd-holds" style={{ height: BAND.h }}>
      {cells.map((c) => (
        /** **A chip can be taken back out.** It stands for a block one layer
         *  down, and dragging it onto the ground is the only gesture that
         *  undoes dropping a card into a container — without it, filing
         *  something away was one-way and you had to go in after it.
         *
         *  `nodrag` because the card underneath would otherwise move instead,
         *  and the drag is the browser's own so it crosses to the canvas. */
        <span key={c.id} className={`mnd-cell ${c.kind} tint-${c.tint} nodrag`}
              data-cell={c.id}
              style={{ left: `calc(${c.x * 100}% + 1px)`,
                       top: `calc(${c.y * 100}% + 1px)`,
                       width: `calc(${c.w * 100}% - 2px)`,
                       height: `calc(${c.h * 100}% - 2px)` }}
              draggable={!c.rest && naming.id !== c.id}
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData(DRAGGED, c.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              title={c.rest ? `${c.label}, and ${c.rest} more` : c.label}>
          {named(c) ? (c.rest
            ? <span className="mnd-tag" style={{ fontSize: type_size(c) }}>+{c.rest}</span>
            : <Name id={c.id} className="mnd-tag" text={c.label}
                    style={{ fontSize: type_size(c) }} />
          ) : null}
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
          <Name id={id} className="mnd-label" text={data.label} />
          {/* A subtype where somebody set one. **Absent rather than a default
              word** — every card that nobody has told apart would otherwise
              carry the same chip, which is noise on all of them.
              **And never the word the mark already says**: a folder wearing
              the folder mark and the word *folder* says it twice. */}
          {look.kind && look.kind !== data.role
            ? <span className="mnd-kind">{look.kind}</span> : null}
          <Wears role={data.role} />
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
      {/* **No head to put it in.** A note is its text, so the mark hangs in
          the card's own corner rather than in a row of its own. */}
      <Wears role={data.role} />
      <Name id={id} className="mnd-note-text" text={data.label} />
      {data.fields?.length ? (
        <dl className="mnd-fields">
          {data.fields.map((f) => (
            <div key={f.name}><dt>{f.name}</dt><dd>{f.value}</dd></div>
          ))}
        </dl>
      ) : null}
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
  /** **A band with no name still has somewhere to type one.** Nothing is drawn
   *  for a name nobody set, so asking to name one had nowhere to put the
   *  field and did nothing at all. */
  const naming = useNaming();
  return (
    <div className={["mnd-group", selected ? "picked" : ""].filter(Boolean).join(" ")}
         {...dressed(look)} title={data.label}>
      {data.label || naming.id === id
        ? <Name id={id} className="mnd-group-name" text={data.label} /> : null}
      <Wears role={data.role} />
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
      <Name id={id} className="mnd-label" text={data.label} />
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
      <Middle side={data.side} inward={data.on === FRAME} />
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
      <Name id={id} className="mnd-frame-name" text={data.label} />
      {/* **You are inside a block, and it is still one.** The name sits in the
          border at one end; what it is sits in the border at the other. */}
      <Wears role={data.role} />
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
