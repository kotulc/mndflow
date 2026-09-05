/** What a box looks like, as React Flow node types.
 *
 *  **These are the notation, which is why they are still ours.** Everything
 *  around them — the viewport, the hit testing, the drag, the edge paths — is
 *  the library's. A node here draws a rectangle, a name and its handles, reads
 *  its look off what the projection resolved, and knows nothing about the graph.
 *
 *  One component covers every box that is a rectangle, because they differ only
 *  in the look they carry and the ramp keys off it. A frame and a seat are the
 *  two that are not. **Which one draws a node is the
 *  projection's to say** — it sets `type`, so nothing here re-derives it from
 *  marks and a new mark cannot silently pick the wrong component.
 *
 *  **Nothing here chooses a colour, a weight or a size.** A definition picked a
 *  slot and an emphasis; those arrive as attributes and the stylesheet is what
 *  turns them into steps on the ramp. */

import { createContext, memo, useContext, useEffect, useRef } from "react";
import { Handle, NodeResizer, Position, useUpdateNodeInternals,
         type NodeProps } from "@xyflow/react";
import type { Side } from "@mnd/core";

/** What a row or a chip being dragged onto the drawing carries. **Named here**
 *  because a chip is drawn here, and the canvas that catches one only has to
 *  agree about the name. */
export const DRAGGED = "text/mnd-block";

import { BAND, FRAME, PLAIN, look_key,
         type BoxData, type BoxNode, type Cell, type GridCell, type Look } from "@mnd/views";
import type { Role } from "@mnd/core";
import { Icon, Name, known, useNaming, type IconName } from "@mnd/theme";

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
function Wears({ role, icon }: { role?: Role; icon?: string }) {
  if (!role) return null;
  /** **A mark it was given, or the one its role would draw.** A name this set
   *  does not know falls back rather than drawing nothing, so a card from a
   *  package this build has never seen still says what sort of thing it is. */
  const mark = icon && known(icon) ? icon : ROLE[role];
  return (
    <span className="mnd-role" data-role={role}>
      <Icon name={mark} solid={!icon && (role === "container" || role === "reference")}
            size={11} />
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
  return [
    p.selected, p.dragging, p.width, p.height,
    d.label, d.alias ?? "", d.def, d.on, d.side, d.role, d.marks.join(","),
    /** Read off the look rather than listed, so a property added to it cannot
     *  be forgotten here and leave a card drawing what it used to. */
    look_key(d.look),
    d.cells?.map((c) => `${c.id}${c.kind}${c.tint}${c.rest ?? ""}`).join(","),
    d.grid?.map((c) => `${c.r},${c.c},${c.w},${c.h}${c.marks.join("")}`).join(","),
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
    "data-layout": look.layout,
  };
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
      <Brim />
      <Wears role={data.role} icon={data.look?.icon} />
      {/* **The other corner.** Its role is what it is and sits top right; this
          is what has been done to it, and sits bottom right so the two never
          argue over one place. */}
      {data.marks.includes("locked")
        ? <span className="mnd-locked" title="locked in place"><Icon name="locked" size={11} /></span>
        : null}
      {named ? (
        <div className="mnd-head">
          {/* **One name, in two elements.** It reads as `Block A1`, and the
              mark is its own element so that two clicks open the word alone and
              what you type replaces it rather than the mark. Wrapped, because
              the head sets its ends apart and the two of these are one end. */}
          <span className="mnd-named">
            <Name id={id} className="mnd-label" text={data.label} />
            {data.alias ? <span className="mnd-alias">{data.alias}</span> : null}
          </span>
          {/* A subtype where somebody set one. **Absent rather than a default
              word** — every card that nobody has told apart would otherwise
              carry the same chip, which is noise on all of them.
              **And never the word the mark already says**: a folder wearing
              the folder mark and the word *folder* says it twice. */}
          {look.kind && look.kind !== data.role
            ? <span className="mnd-kind">{look.kind}</span> : null}
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

/** One cell, named the only way a cell can be: the group and the address. */
export type Spot = { group: string; r: number; c: number };

/** Which cells are picked, and how to pick some.
 *
 *  **A context rather than node data.** A selection is the app's and a
 *  projection is a pure function of the graph — folding one into the other
 *  would send the whole layer round again on every click. And a cell is not a
 *  node, so the library has no gesture for one: the lattice reads its own
 *  pointer and says what it picked. */
export type Picking = { picked: readonly Spot[]; pick: (cells: readonly Spot[]) => void };

export const CellsContext = createContext<Picking>({ picked: [], pick: () => {} });

/** The lattice a grid draws.
 *
 *  **A cell answers a pointer of its own.** It has no id — it is this group
 *  plus a row and a column — so it says so in the DOM and the canvas reads the
 *  address back off it rather than inventing one. */
function Lattice({ id, cells }: { id: string; cells: readonly GridCell[] }) {
  const { picked, pick } = useContext(CellsContext);
  const held = (c: GridCell) =>
    picked.some((p) => p.group === id && p.r === c.r && p.c === c.c);

  /** Where a sweep began. **A drag picks a range**, which is the gesture every
   *  other list of things already uses — and shift does the same thing without
   *  the drag, from whatever is already picked. */
  const from = useRef<{ r: number; c: number } | null>(null);
  const range = (a: { r: number; c: number }, to: { r: number; c: number }): Spot[] => {
    const out: Spot[] = [];
    for (let r = Math.min(a.r, to.r); r <= Math.max(a.r, to.r); r++) {
      for (let c = Math.min(a.c, to.c); c <= Math.max(a.c, to.c); c++) {
        out.push({ group: id, r, c });
      }
    }
    return out;
  };
  /** What is already picked here, so shift knows where a range starts and the
   *  modifier knows what it is adding to. */
  const mine = picked.filter((p) => p.group === id);
  useEffect(() => {
    const done = () => { from.current = null; };
    window.addEventListener("pointerup", done);
    return () => window.removeEventListener("pointerup", done);
  }, []);

  /** **A plain press is the grid's; a held one is a cell's.**
   *
   *  Cells cover the whole of a grid, so a plain press has to reach it or a
   *  grid cannot be selected or dragged by the obvious gesture. Picking cells
   *  is what you do to merge or chain them — the rarer act, and the one that
   *  already wants a modifier to name more than one — so it takes the modifier
   *  and everything else falls through.
   *
   *  **Listened for natively, on the way up from the cell.** The library drives
   *  its own selection from a listener on the node, and a React handler cannot
   *  stop that: React delivers at the root, by which time the node has already
   *  seen it. So a held press is stopped here, on an element between the cell
   *  and the node — without which the library's own modifier-click toggled the
   *  grid out of the selection and took the cells with it. */
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const at_of = (e: Event) => {
      const cell = (e.target as HTMLElement | null)?.closest?.(".mnd-grid-cell");
      const said = cell?.getAttribute("data-at")?.split(",").map(Number);
      return said && said.length === 2 && said.every((n) => !Number.isNaN(n))
        ? { group: id, r: said[0]!, c: said[1]! } : null;
    };
    const modified = (e: MouseEvent) => e.shiftKey || e.ctrlKey || e.metaKey;

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const one = at_of(e);
      if (!one) return;
      /** Nothing held: the press is the grid's, to select and to drag by, and
       *  whatever cells were picked are let go of. */
      if (!modified(e)) { if (mine.length) pick([]); return; }
      e.stopPropagation();
      from.current = { r: one.r, c: one.c };
      /** Shift takes the rectangle, the modifier takes one more. */
      if (e.shiftKey && mine[0]) { pick(range(mine[0], one)); return; }
      const had = mine.some((p) => p.r === one.r && p.c === one.c);
      pick(had ? mine.filter((p) => !(p.r === one.r && p.c === one.c)) : [...mine, one]);
    };
    /** The same press, twice more. **The library reads all three**, and one of
     *  them getting through is the whole of the bug. */
    const swallow = (e: MouseEvent) => { if (modified(e) && at_of(e)) e.stopPropagation(); };

    el.addEventListener("pointerdown", down);
    el.addEventListener("mousedown", swallow);
    el.addEventListener("click", swallow);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("mousedown", swallow);
      el.removeEventListener("click", swallow);
    };
  });

  return (
    <span className="mnd-grid-cells" ref={box}>
      {cells.map((c) => (
        /** `nopan` because a sweep across cells is not a drag of the canvas.
         *  **Not `nodrag`**: that is exactly what has to reach the grid. */
        <span key={`${c.r},${c.c}`}
              className={["mnd-grid-cell", "nopan", ...c.marks,
                          held(c) ? "picked" : ""].filter(Boolean).join(" ")}
              data-at={`${c.r},${c.c}`}
              data-r={c.r}
              data-c={c.c}
              style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
              onPointerEnter={(e) => {
                if (e.buttons === 1 && from.current) pick(range(from.current, c));
              }} />
      ))}
    </span>
  );
}
/** A group: a grid of cells, or a band behind its members.
 *
 *  A boundary is its members' bounds rather than a stored size, so there is
 *  nothing to resize and nothing to place — what it holds is what it is. **A
 *  grid owns its corner**, because an empty one would otherwise be nothing. */
/** A grid's own border, drawn on the box.
 *
 *  **Visual only.** Cells cover the whole lattice and a plain press on any of
 *  them is already the grid's — to select it and to drag by — so separate edge
 *  strips would only read like the room frame's walls without offering anything
 *  a cell does not. */
function Edge() {
  return <span className="mnd-group-edge" aria-hidden />;
}

function BandRim() {
  return (
    <span className="mnd-brim" aria-hidden>
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <span key={side} className={`mnd-brim-${side}`} />
      ))}
    </span>
  );
}

function GroupNode({ id, data, selected }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  const look = data.look ?? PLAIN;
  const has_cells = !!data.grid?.length;
  const show_name = !data.marks.includes("unlabelled");
  const shell = ["mnd-group-shell", has_cells ? "gridded" : ""].filter(Boolean).join(" ");
  const group = ["mnd-group", has_cells ? "gridded" : "",
                 selected ? "picked" : ""].filter(Boolean).join(" ");
  return (
    <div className={shell}>
      {show_name ? <Name id={id} className="mnd-group-name" text={data.label} /> : null}
      <div className={group} {...dressed(look)} title={data.label}>
        {has_cells ? null : <BandRim />}
        {has_cells ? <Lattice id={id} cells={data.grid!} /> : null}
        {has_cells ? <Edge /> : null}
        {has_cells ? (
          <NodeResizer isVisible={selected} minWidth={96} minHeight={48}
                       lineClassName="mnd-edge" handleClassName="mnd-grip" />
        ) : null}
        <Wears role={data.role} icon={has_cells ? "role_table" : "role_group"} />
        {data.seats?.length ? <Seats seats={data.seats} /> : null}
      </div>
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
export const Grid = memo(GroupNode, same);
export const Seat = memo(SeatNode, same);

export const NODE_TYPES = {
  card: Card,
  note: Note,
  group: Group,
  grid: Grid,
  seat: Seat,
  frame: Frame,
} as const;
