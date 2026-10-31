/** What a box looks like, as React Flow node types. */

import { createContext, memo, useContext, useEffect,
         useRef, useState, type CSSProperties } from "react";
import { Handle, NodeResizer, Position, useUpdateNodeInternals,
         type NodeProps } from "@xyflow/react";
import type { Side } from "@mnd/core";

/** What a row or a chip being dragged onto the drawing carries. */
export const DRAGGED = "text/mnd-block";

import { FRAME, PLAIN, face_attrs, look_key, tint_attrs,
         type BoxData, type BoxNode, type GridCell } from "@mnd/views";
import { CardFace, ChipFace, Facts, Icon, Name, Stamps, Wears, role_icon, useNaming } from "@mnd/theme";
import { useLevel, useTiny } from "./level";



/** What this node would draw, as a value. */
function seen(p: NodeProps<BoxNode>): string {
  const d = p.data;
  return [
    p.selected, p.dragging, p.width, p.height,
    d.label, d.alias ?? "", d.description ?? "", d.def, d.on, d.side, d.role,
    d.kind ?? "", (d.tiles ?? []).length, d.head ?? "", JSON.stringify(d.facts ?? null),
    JSON.stringify(d.preview ?? null), JSON.stringify(d.bar ?? null),
    (d.stamps ?? []).join(","),
    d.face ?? "", d.text ?? "", d.marks.join(","),
    /** Read off the look, so no property is forgotten. */
    look_key(d.look),
    d.grid?.map((c) => `${c.r},${c.c},${c.w},${c.h}${c.marks.join("")}`).join(","),
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

/** Where along a wall a seat sits. */
function along(side: Side, at: number): React.CSSProperties {
  const fraction = `${(at * 100).toFixed(3)}%`;
  return side === "top" || side === "bottom" ? { left: fraction } : { top: fraction };
}

/** A card's border, as one target around the whole card. */
function Brim() {
  return (
    <span className="mnd-brim" aria-hidden>
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <span key={side} className={`mnd-brim-${side}`} />
      ))}
    </span>
  );
}

/** The seats a line meets on this box's border. */
function Seats({ seats, inward }: {
  seats: NonNullable<BoxData["seats"]>;
  /** On the frame, so a line sets off inward. */
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

/** A handle that moved has to be measured again. */
function useSeats(id: string, seats: BoxData["seats"]) {
  const remeasure = useUpdateNodeInternals();
  const where = seats?.map((t) => `${t.id}${t.side}${t.at}`).join(",") ?? "";
  useEffect(() => { if (where) remeasure(id); }, [id, where, remeasure]);
}

/** The one place a line meets a seat: its middle. */
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

/** The ordinary card: the face every card draws with, and what the canvas lays over it — its
 *  border's targets, its grips where it keeps its own size, and the seats lines meet. Its name
 *  renames in place. */
function CardNode({ id, data, selected, width, height }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  const look = data.look ?? PLAIN;
  const level = useLevel(width ?? 0, height ?? 0);
  return (
    <CardFace label={data.label} {...(data.kind ? { kind: data.kind } : {})}
              {...(data.facts ? { facts: <Facts facts={data.facts} /> } : {})}
              {...(data.defines ? { defines: true } : {})} {...(data.role ? { role: data.role } : {})}
              {...(look.icon ? { icon: look.icon } : {})}
              holds={data.marks.includes("container")}
              {...(data.stamps ? { stamps: data.stamps } : {})}
              classes={[...data.marks, selected ? "picked" : ""]}
              dress={{ ...face_attrs(look), "data-def": data.def, "data-level": level }}
              {...(data.text !== undefined ? { text: data.text } : {})}
              {...(data.table ? { table: data.table } : {})}
              head={look.head !== false}
              {...(data.fit ? { fit: data.fit } : {})}
              {...(data.clamp ? { clamp: data.clamp } : {})}
              title={data.description ? `${data.label} — ${data.description}` : data.label}
              name={<Name id={id} className="mnd-label card-name" text={data.label} />}>
      {/* A card keeps the size its face says unless its definition asked for its own. */}
      {look.height === "free"
        ? <NodeResizer isVisible={selected} minWidth={96} minHeight={48}
                       lineClassName="mnd-edge" handleClassName="mnd-grip" /> : null}
      <Brim />
      {data.seats?.length ? <Seats seats={data.seats} /> : null}
    </CardFace>
  );
}

/** A note: text, resized by hand. */
function NoteNode({ id, data, selected }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  const look = data.look ?? PLAIN;
  return (
    <div className={["mnd-card", "card-face", "note", ...data.marks, selected ? "picked" : ""]
            .filter(Boolean).join(" ")}
         {...face_attrs(look)} data-def={data.def}>
      <NodeResizer isVisible={selected} minWidth={96} minHeight={48}
                   lineClassName="mnd-edge" handleClassName="mnd-grip" />
      {/* A note wears its icon above and whatever mark it earns below. */}
      <Wears role={data.role} icon={data.look?.icon}
             holds={data.marks.includes("container")} />
      <Stamps stamps={data.stamps} />
      <Name id={id} className="mnd-note-text card-name" text={data.label} />
      {data.seats?.length ? <Seats seats={data.seats} /> : null}
    </div>
  );
}

/** A cell: its group and address. */
export type Spot = { group: string; r: number; c: number };

/** Which cells are picked, and how to pick some. */
export type Picking = { picked: readonly Spot[]; pick: (cells: readonly Spot[]) => void };

export const CellsContext = createContext<Picking>({ picked: [], pick: () => {} });

/** What a cell's text is typed as: the name a cell answers to while it is being written. */
export function cell_key(at: Spot): string {
  return `${at.group}@${at.r},${at.c}`;
}

/** Whether a cell lies on a row or column, merged cells included. */
function on_line(c: GridCell, line: { way: "row" | "col"; at: number }): boolean {
  const [from, size] = line.way === "row" ? [c.y, c.h] : [c.x, c.w];
  return line.at >= from && line.at < from + size;
}

/** A row or column of an opened grid, as its header reads it: where the line runs. */
type Line = { way: "row" | "col"; at: number; size: number };

/** The line a header heads: where that line runs is where the header does. */
function headed_line(c: GridCell): Line | null {
  if (!c.line) return null;
  const row = c.line.way === "row";
  return { way: c.line.way, at: row ? c.y : c.x, size: row ? c.h : c.w };
}

/** The lattice a grid draws; opened, its headers are its rows' and columns' tabs. */
function Lattice({ id, cells, open }: { id: string; cells: readonly GridCell[]; open: boolean }) {
  const { picked, pick } = useContext(CellsContext);
  const naming = useNaming();
  /** The line a gutter tab is lighting. */
  const [lit, set_lit] = useState<Line | null>(null);
  const line_cells = (line: Line): Spot[] =>
    cells.filter((c) => on_line(c, line)).map((c) => ({ group: id, r: c.r, c: c.c }));
  const held = (c: GridCell) =>
    picked.some((p) => p.group === id && p.r === c.r && p.c === c.c);

  /** Where a sweep began; drag or shift picks a range. */
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
  /** What is already picked here. */
  const mine = picked.filter((p) => p.group === id);
  useEffect(() => {
    const done = () => { from.current = null; };
    window.addEventListener("pointerup", done);
    return () => window.removeEventListener("pointerup", done);
  }, []);

  /** A plain press is the grid's; a held one is a cell's. */
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
      /** An unmodified press is the grid's, and lets go of picked cells. */
      if (!modified(e)) { if (mine.length) pick([]); return; }
      e.stopPropagation();
      from.current = { r: one.r, c: one.c };
      /** Shift takes the rectangle, the modifier takes one more. */
      if (e.shiftKey && mine[0]) { pick(range(mine[0], one)); return; }
      const had = mine.some((p) => p.r === one.r && p.c === one.c);
      pick(had ? mine.filter((p) => !(p.r === one.r && p.c === one.c)) : [...mine, one]);
    };
    /** The modified press is swallowed on all three events the library reads. */
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
        /** `nopan` because a sweep across cells is not a drag of the canvas. */
        <span key={`${c.r},${c.c}`}
              className={["mnd-grid-cell", "nopan", ...c.marks,
                          held(c) ? "picked" : "", lit && on_line(c, lit) ? "lit" : ""]
                .filter(Boolean).join(" ")}
              data-at={`${c.r},${c.c}`}
              data-r={c.r}
              data-c={c.c}
              {...(c.line ? { "data-way": c.line.way, "data-i": c.line.i } : {})}
              style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
              onPointerEnter={(e) => {
                if (c.line && open) set_lit(headed_line(c));
                if (e.buttons === 1 && from.current) pick(range(from.current, c));
              }}
              onPointerLeave={c.line && open ? () => set_lit(null) : undefined}
              onClick={c.line && open ? () => pick(line_cells(headed_line(c)!)) : undefined}>
          {/* An empty cell is named in place: the name is the block it makes. */}
          {naming.id === cell_key({ group: id, r: c.r, c: c.c })
            ? <Name id={naming.id} className="mnd-grid-value" text="" clears /> : null}
          {c.index && open ? <span className="mnd-grid-index">{c.index}</span> : null}
        </span>
      ))}
    </span>
  );
}
/** A grid's own border, drawn on the box. */
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
  const room = data.marks.includes("room") ? "room" : "";
  const shell = ["mnd-group-shell", has_cells ? "gridded" : "", room].filter(Boolean).join(" ");
  const group = ["mnd-group", has_cells ? "gridded" : "", data.marks.includes("flat") ? "flat" : "",
                 data.marks.includes("region") ? "region" : "",
                 room, selected ? "picked" : ""].filter(Boolean).join(" ");
  return (
    <div className={shell} {...face_attrs(look)}>
      {/* The name and handle float above the frame together; `card.name: hide` leaves no name. */}
      <span className="mnd-group-title">
        {look.head === false
          ? null : <Name id={id} className="mnd-group-name card-name" text={data.label} />}
        {look.head !== false && data.alias
          ? <span className="mnd-group-alias">{data.alias}</span> : null}
      </span>
      <div className={group} title={data.label}>
        {has_cells ? null : <BandRim />}
        {has_cells ? <Lattice id={id} cells={data.grid!} open={!!room} /> : null}
        {has_cells ? <Edge /> : null}
        {has_cells ? (
          <NodeResizer isVisible={selected} minWidth={96} minHeight={48}
                       lineClassName="mnd-edge" handleClassName="mnd-grip" />
        ) : null}
        <Wears role={data.role} />
        {data.seats?.length ? <Seats seats={data.seats} /> : null}
      </div>
    </div>
  );
}

/** An interface, seated on its owner's wall. */
function SeatNode({ id, data, selected, width }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  const tiny = useTiny(width ?? 0);
  /** A seat that changes wall faces anew, so its handle is measured again. */
  const remeasure = useUpdateNodeInternals();
  useEffect(() => remeasure(id), [id, data.side, remeasure]);
  /** A port of an interface definition wears that definition's colour; a plain one stays plain. */
  const typed = !!data.look && !!data.def && data.def !== "interface";
  const tint = tint_attrs(typed ? data.look : undefined);
  return (
    <div className={["mnd-seat", typed ? "typed" : "", tiny ? "tiny" : "", ...data.marks,
                     selected ? "picked" : ""]
            .filter(Boolean).join(" ")}
         data-family={tint["data-family"]} style={tint.style as CSSProperties}
         data-side={data.side} {...(data.on === FRAME ? { "data-inward": "" } : {})}
         title={data.label}>
      <Middle side={data.side} inward={data.on === FRAME} />
      {data.seats?.length ? <Seats seats={data.seats} inward={data.on === FRAME} /> : null}
    </div>
  );
}

/** The open layer seen from within: its border, name and wall interfaces. */
export function Frame({ id, data }: NodeProps<BoxNode>) {
  useSeats(id, data.seats);
  const upright = data.side === "left" || data.side === "right";
  return (
    <div className="mnd-frame">
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
      <Wears role={data.role} holds={data.marks.includes("container")} />
      <Stamps stamps={data.stamps} />
    </div>
  );
}

/** A map's box: what holds chips, its walls and its title with its kind's icon — a group's, a
 *  panel with no walls. Its ground lets the pointer through, so a press there is on the box
 *  itself. */
function MapBox({ data, selected }: NodeProps<BoxNode>) {
  return (
    <div className={["mnd-box", data.marks.includes("group") ? "panel" : "",
                     selected ? "picked" : ""].filter(Boolean).join(" ")}>
      <span className="mnd-box-title">
        {data.role ? <Icon name={role_icon(data.role)} size={11} /> : null}
        <span className="mnd-box-name">{data.label}</span>
        {data.facts?.counts.length ? (
          <span className="mnd-box-counts">
            {data.facts.counts.map((f) => `${f.n} ${f.word}`).join(" · ")}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** A map's chip, **its card at map scale** (views `map.ts`): its name's line — the name, then
 *  quieter its kind — and its kind's icon in the top-right corner; its facts under it where it
 *  has room; then its body, the first thing it has — a diagram's tiles laid by its structure, a
 *  definition's uses in boxes of their places, else a preview of its attributes, records, body or
 *  description, a definition's places each with its uses, over a bar of its uses by place. A
 *  tile is a small card the same way: its name, its icon in the corner, edged in its own colour.
 *  Icons keep a least size on screen, never past what their tile has room for (`--cap`). A chip
 *  too narrow for its name shows its icon alone; a narrow, tall one reads upright. What it is in
 *  full is its hover card. */
function ChipNode({ data, selected, width, height }: NodeProps<BoxNode>) {
  const level = useLevel(width ?? 0, height ?? 0, false);
  const tint = data.look ? tint_attrs(data.look) : undefined;
  return <ChipFace data={{ ...data, ...(tint ? { tint } : {}) }} w={width ?? 0} h={height ?? 0}
                   level={level} picked={!!selected} />;
}


/** A registry's tile: an entry's name, how many times it is used and what it means, its ground as
 *  warm as its uses, its edge in the entry's own colour. What a small tile has no room for, its
 *  title says. */
function TileNode({ data, selected }: NodeProps<BoxNode>) {
  const n = data.count ?? 0;
  const uses = n ? `${n} ${n === 1 ? "use" : "uses"}` : "no uses";
  const tint = tint_attrs(data.look);
  return (
    <div className={["mnd-tile", n ? "" : "unused", (data.heat ?? 0) > 0.55 ? "hot" : "",
                     selected ? "picked" : ""].filter(Boolean).join(" ")}
         data-family={tint["data-family"]}
         style={{ ...tint.style, "--heat": data.heat ?? 0 } as CSSProperties}
         title={[data.label, uses, data.description].filter(Boolean).join(" · ")}>
      <span className="mnd-tile-name">{data.label}</span>
      <span className="mnd-tile-count">{uses}</span>
      {data.description ? <span className="mnd-tile-about">{data.description}</span> : null}
    </div>
  );
}

/** Memoised on what each draws; see `seen`. */
export const Card = memo(CardNode, same);
export const Note = memo(NoteNode, same);
export const Group = memo(GroupNode, same);
export const Grid = memo(GroupNode, same);
export const Seat = memo(SeatNode, same);
export const Tile = memo(TileNode);
export const Box = memo(MapBox, same);
export const Chip = memo(ChipNode, same);

export const NODE_TYPES = {
  card: Card,
  note: Note,
  group: Group,
  grid: Grid,
  seat: Seat,
  frame: memo(Frame, same),
  tile: Tile,
  box: Box,
  chip: Chip,
} as const;
