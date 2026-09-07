/** Sizing and placement for the canvas.
 *
 *  Two jobs. `pack` lays out a container's child chips as tiled 1|2 groups.
 *  `place` lays out a whole layer around the centre, so the mass of blocks
 *  grows outward from the origin instead of trailing off one corner.
 *
 *  Relationships draw units into clusters. A cluster that is exactly a ring or
 *  a chain is laid out as that shape — ranking alone would flatten a ring into
 *  ranks and lose it. Anything else follows the layer's arrangement. Directed
 *  relationships still bias ranking (and the seats resting fill prefers);
 *  plain lines only pull neighbours level. Port in/out markings are not read
 *  here.
 *
 *  A note is a unit like a card. A tie is not a structural join for ranking or
 *  topology — it is a fixed association: the note sits under what it describes
 *  once the rest of the layer has landed. Untied notes arrange with everything
 *  else. That keeps a ring a ring when a note is pinned to one of its cards.
 *
 *  Both are pure geometry: nothing here knows about React Flow, and nothing
 *  here reaches the embedding model. How closely a child's name relates to its
 *  container decides a *shade*, so it belongs to whatever draws the chip. */

import { axisOf, isContainer, isTie, membersOf, notesIn, portsOf, tiesOf } from "../graph/fold";
import type { Axis, Graph, Layout, Element, Side, Spot } from "../graph/types";

/** The canvas grid. Everything with a place of its own lands on it, so that two
 *  things meant to line up line up exactly rather than nearly.
 *
 *  Applied here rather than only while dragging, so a layer laid out before
 *  there was a grid comes onto it by being drawn — the log keeps whatever the
 *  user actually did, and this is a fact about how it is shown. */
export const CELL = 24;

/** The nearest grid line. */
export const cell = (n: number) => Math.round(n / CELL) * CELL;

/** How far apart the seats an interface may sit in are, along its own edge.
 *
 *  Half a cell, on the canvas lattice — so a port on a container and a port on
 *  a block at the same absolute place are exactly level, rather than each being
 *  counted from its own corner (corners of differently-tall cards do not share
 *  a lattice). How many seats an edge holds still follows its length: a block
 *  is one grid row tall, so its sides have room for one seat at the centre; a
 *  container is taller and holds several. */
export const SEAT = CELL / 2;

/** A block is one grid row of content and half a row of margin round it; a
 *  container is three rows and the same margin. Nothing is held back for text
 *  that might arrive — a card that will not fit its name clips it.
 *
 *  Sizes are whole seats, which is all a size has to satisfy: it makes the
 *  seats along an edge evenly spaced, finishing the same distance from the far
 *  corner as they start from the near one. Whole *cells* would be a stronger
 *  rule than anything needs — a card's far edge landing on the lattice aligns
 *  it with nothing, since what a card is lined up against is another card, and
 *  two of the same height are level wherever they sit. */
export const LEAF = { w: 168, h: CELL + SEAT };
/** How much taller a container is than a block: the band its grid sits in.
 *  Exported because the treemap has to be worked out in the band's real shape
 *  — tiled in a square and then stretched, every cell comes out the wrong way
 *  round.
 *
 *  Two cells, and this is the size that genuinely is constrained: it is half of
 *  it that separates a block's middle from a container's, so at two cells they
 *  differ by one and grid steps can bring them level. At the old 52 they
 *  differed by 26 and no amount of grid-perfect placement would ever have
 *  squared a block against a container. */
export const GRID = CELL * 2;
/** Clear space kept between one unit and the next. Two cells: this is where
 *  the lines between them run, and where they are told apart. */
const GAP = CELL * 2;

/** Clear space inside one unit, between members that belong together.
 *
 *  Half of what sits between units, and the contrast is the point: tight inside
 *  and open between is what makes a group read as one object rather than as
 *  several near each other. */
const WITHIN = SEAT;

/** Clear space kept between one rank and the next. Wider than the gap across a
 *  rank, because this is the space the lines between them run in: two stubs
 *  meet in it, and a lane or two beside them. Not wider than that — air between
 *  ranks is what makes an arrangement read as scattered. */
const RANK = CELL * 3;

/** How far a group's boundary reaches past its members. Layout has to know it:
 *  a group is placed as one object, and the boundary is part of that object's
 *  size, so units packed to their members' bounds would have their boundaries
 *  touching. */
export const HUG = SEAT;

/** Columns and rows for `count` cells, kept as square as possible. */
export function tile(count: number): { cols: number; rows: number } {
  if (count < 1) return { cols: 0, rows: 0 };

  const cols = Math.ceil(Math.sqrt(count));

  return { cols, rows: Math.ceil(count / cols) };
}

export type Tile = { x: number; y: number; w: number; h: number };

/** How many child chips a container card will draw. Three 1|2 groups of three;
 *  at ten or more the last slot is "..." for the overflow. */
export const CHIP_CAP = 9;

/** One 1|2 unit inside a region: full, two horizontal rows, or large-left with
 *  two stacked on the right. Horizontal first for two so labels stay wide. */
function unit(count: number, box: { w: number; h: number }): Tile[] {
  const n = Math.min(Math.max(count, 0), 3);
  if (n < 1) return [];
  if (n === 1) return [{ x: 0, y: 0, w: box.w, h: box.h }];

  if (n === 2) {
    const top = box.h / 2;
    return [
      { x: 0, y: 0, w: box.w, h: top },
      { x: 0, y: top, w: box.w, h: box.h - top },
    ];
  }

  const left = box.w / 2;
  const top = box.h / 2;
  return [
    { x: 0, y: 0, w: left, h: box.h },
    { x: left, y: 0, w: box.w - left, h: top },
    { x: left, y: top, w: box.w - left, h: box.h - top },
  ];
}

/** Meta-regions: one full band, two columns, or left | top-right / bottom-right. */
function regions(groups: 1 | 2 | 3, box: { w: number; h: number }): Tile[] {
  if (groups === 1) return [{ x: 0, y: 0, w: box.w, h: box.h }];

  const left = box.w / 2;
  const right = box.w - left;
  if (groups === 2) {
    return [
      { x: 0, y: 0, w: left, h: box.h },
      { x: left, y: 0, w: right, h: box.h },
    ];
  }

  const top = box.h / 2;
  return [
    { x: 0, y: 0, w: left, h: box.h },
    { x: left, y: 0, w: right, h: top },
    { x: left, y: top, w: right, h: box.h - top },
  ];
}

/** Pack up to {@link CHIP_CAP} children into the band.
 *
 *  The unit is 1|2 (or two horizontal rows when there are only two). One group
 *  uses the full band (1–3). Two sit as columns (4–6). Three tile as
 *  left | top-right / bottom-right (7–9) — each region its own 1|2. */
export function pack(count: number, box: { w: number; h: number }): Tile[] {
  const n = Math.min(Math.max(count, 0), CHIP_CAP);
  if (n < 1) return [];

  const groups = (n <= 3 ? 1 : n <= 6 ? 2 : 3) as 1 | 2 | 3;
  const sizes = Array<number>(groups).fill(0);
  const base = Math.floor(n / groups);
  const extra = n % groups;
  for (let g = 0; g < groups; g += 1) sizes[g] = base + (g < extra ? 1 : 0);

  const seats = regions(groups, box);
  const out: Tile[] = [];
  for (let g = 0; g < groups; g += 1) {
    const local = unit(sizes[g], { w: seats[g].w, h: seats[g].h });
    for (const cell of local) {
      out.push({
        x: seats[g].x + cell.x,
        y: seats[g].y + cell.y,
        w: cell.w,
        h: cell.h,
      });
    }
  }

  return out;
}

/** How strongly a child belongs to its parent, 0–1. Drives the fill of its
 *  chip, so a container reads at a glance as coherent or ragged. */
/** Size of one node's card.
 *
 *  A container is barely bigger than a block: room for the grid under its
 *  name, and no more. It does not grow with what it holds — a card that swells
 *  with its contents makes a busy layer into a wall of large boxes, and says
 *  the same thing the grid inside it already says. The cells shrink instead,
 *  which is what keeps a full container reading as full. */
export function sizeOf(graph: Graph, node: Element): { w: number; h: number } {
  // A note's rectangle is its least size — the larger of what the drag asked
  // for and the ordinary leaf. Text still wins on the canvas; layout only
  // needs a box that nothing else is laid on top of.
  if (node.form === "note") {
    return {
      w: Math.max(LEAF.w, cell(node.w ?? 0)),
      h: Math.max(LEAF.h, cell(node.h ?? 0)),
    };
  }

  if (!isContainer(graph, node.id)) return { ...LEAF };

  return { w: LEAF.w, h: LEAF.h + GRID };
}

/** Put a card on the grid by its middle rather than by its corner.
 *
 *  A block is one row of content with a little padding round it, so it stands a
 *  cell and a half tall. Landing its corner on a line leaves it covering one
 *  row and half of the next: its top border sits on the grid and its bottom
 *  border sits between lines, which is an awkward place for the interfaces
 *  seated along it. Landing its middle on the middle of a row instead, it sits
 *  squarely on that row and overhangs evenly, and its two horizontal borders
 *  are the same distance from a line as each other.
 *
 *  Applied to both axes, and the axes come out differently because the sizes
 *  do: a card is a whole number of cells wide, so its sides still land on
 *  lines. */
export function middled(at: { x: number; y: number }, size: { w: number; h: number }) {
  // A row's middle is a line plus a seat, seats being half a cell.
  const on = (v: number, extent: number) => cell(v + extent / 2 - SEAT) + SEAT - extent / 2;

  return { x: on(at.x, size.w), y: on(at.y, size.h) };
}

/** Absolute canvas positions along an edge that are valid seats.
 *
 *  Counted on the canvas lattice (every {@link SEAT}), not as a run of offsets
 *  from the card's own corner — corners of a block and a container do not share
 *  a lattice, so corner-relative seats never lined a container port up with the
 *  grid or with a block beside it. An edge only one row tall still has a single
 *  seat at its centre. */
/** Absolute canvas marks an edge may seat an interface on. Exported so the
 *  router can pick seats the same way a drop does. */
export function seatMarks(origin: number, extent: number): number[] {
  const last = Math.max(1, Math.floor(extent / SEAT) - 1);
  if (last <= 2) return [origin + extent / 2];

  const lo = origin + SEAT;
  const hi = origin + extent - SEAT;
  const marks: number[] = [];
  let at = Math.ceil(lo / SEAT) * SEAT;
  for (; at <= hi + 1e-6; at += SEAT) marks.push(at);

  return marks;
}

/** The nearest seat to a place along an edge, as the 0–1 fraction that gets
 *  stored. A fraction is still what an interface carries — it has to be, or the
 *  port would not survive its frame being resized — but the fractions it can
 *  take are the ones that land on a seat of the canvas lattice.
 *
 *  `origin` is the edge's near end in canvas units (the card's left or top), so
 *  seats are absolute rather than card-local. */
export function seatAt(at: number, extent: number, origin = 0): number {
  const marks = seatMarks(origin, extent);
  if (!marks.length) return 0.5;

  const abs = origin + at * extent;
  let best = marks[0];
  for (const mark of marks) {
    if (Math.abs(mark - abs) < Math.abs(best - abs)) best = mark;
  }

  return (best - origin) / extent;
}

/** The nearest seat that no sibling is already sitting in, searched outward
 *  from the one asked for.
 *
 *  Seats make stacking possible for the first time: with a free fraction two
 *  interfaces never landed on exactly the same point, and now they would. The
 *  spec says interfaces do not stack, so a drop onto an occupied seat takes the
 *  next one along rather than being refused — a drag that has to be repeated to
 *  find a gap is worse than one that lands beside it. */
export function freeSeat(graph: Graph, port: Element, side: Side, at: number,
                         extent: number, origin = 0): number {
  const marks = seatMarks(origin, extent);
  if (!marks.length) return 0.5;
  if (marks.length === 1) return (marks[0] - origin) / extent;

  const abs = origin + at * extent;
  const key = (mark: number) => Math.round(mark / SEAT);
  const taken = new Set(
    portsOf(graph, port.parent)
      .filter((p) => p.id !== port.id && p.side === side && p.at != null)
      .map((p) => key(origin + seatAt(p.at!, extent, origin) * extent)),
  );

  const ordered = [...marks].sort((a, b) => Math.abs(a - abs) - Math.abs(b - abs));
  for (const mark of ordered) {
    if (!taken.has(key(mark))) return (mark - origin) / extent;
  }

  return (ordered[0] - origin) / extent;
}

/** Mark keys already taken on one side — ports and anchors somebody dragged. */
export function takenOn(
  graph: Graph, owner: string, side: Side, extent: number, origin: number,
  except?: { edge: string; end: "from" | "to" },
): Set<number> {
  const key = (mark: number) => Math.round(mark / SEAT);
  const taken = new Set<number>();

  for (const port of portsOf(graph, owner)) {
    if (port.side !== side || port.at == null) continue;
    taken.add(key(origin + seatAt(port.at, extent, origin) * extent));
  }

  for (const link of Object.values(graph.edges)) {
    for (const [end, node] of [["from", link.source], ["to", link.target]] as const) {
      if (node !== owner) continue;
      if (except?.edge === link.id && except.end === end) continue;
      const wall = end === "from" ? link.fromSide : link.toSide;
      const seat = end === "from" ? link.fromAt : link.toAt;
      if (wall !== side || seat == null) continue;
      taken.add(key(origin + seatAt(seat, extent, origin) * extent));
    }
  }

  return taken;
}

/** Nearest free lattice seat to a point, given what is already taken. */
export function freeAlong(
  at: number, extent: number, origin: number, taken: Set<number>,
): number {
  const marks = seatMarks(origin, extent);
  if (!marks.length) return 0.5;
  if (marks.length === 1) return (marks[0] - origin) / extent;

  const abs = origin + at * extent;
  const key = (mark: number) => Math.round(mark / SEAT);
  const ordered = [...marks].sort((a, b) => Math.abs(a - abs) - Math.abs(b - abs));

  for (const mark of ordered) {
    if (!taken.has(key(mark))) return (mark - origin) / extent;
  }

  return (ordered[0] - origin) / extent;
}

export type Box = { x: number; y: number; w: number; h: number };

/** Whether two boxes touch, counting the gap that has to stay between them. */
function collides(a: Box, b: Box): boolean {
  return a.x < b.x + b.w + GAP && a.x + a.w + GAP > b.x &&
         a.y < b.y + b.h + GAP && a.y + a.h + GAP > b.y;
}

/** Grid points in rings out from the origin — the order new blocks fill the
 *  canvas in, so a layer grows evenly in every direction rather than down and
 *  to the right. Bounded, since a layer is finite and a spiral is not. */
function* rings(step: { x: number; y: number }, rounds: number) {
  for (let ring = 0; ring <= rounds; ring += 1) {
    for (let cy = -ring; cy <= ring; cy += 1) {
      for (let cx = -ring; cx <= ring; cx += 1) {
        if (Math.max(Math.abs(cx), Math.abs(cy)) !== ring) continue;
        yield { x: cx * step.x, y: cy * step.y };
      }
    }
  }
}

/** Structural relationships with both ends among these nodes.
 *
 *  Ties are left out on purpose: a note's leader is a fixed association, not a
 *  join that ranks or clusters. Including one would turn a ring with a caption
 *  into something topology no longer recognises.
 *
 *  Neighbourhood and barycentre read the pair rather than `dir`: a plain
 *  relationship is undirected, and the way it was drawn is the only statement
 *  of direction most of them will ever carry. Ranking does not use these when
 *  any directed edge is present — see {@link flowsAmong}. */
function linksAmong(graph: Graph, ids: Set<string>): [string, string][] {
  return Object.values(graph.edges)
    .filter((e) => !isTie(graph, e)
      && ids.has(e.source) && ids.has(e.target) && e.source !== e.target)
    .map((e) => [e.source, e.target] as [string, string]);
}

/** Directed relationships among these nodes, source → target.
 *
 *  A directed edge is what biases placement: its source sits earlier along the
 *  arrangement than its target. Plain lines still pull neighbours level and
 *  keep related units near each other, but they do not invent a rank — that is
 *  what made drawing order masquerade as flow. Port in/out markings are not
 *  consulted; what those mean is the package's. */
function flowsAmong(graph: Graph, ids: Set<string>): [string, string][] {
  return Object.values(graph.edges)
    .filter((e) => (e.form ?? "line") === "directed"
      && ids.has(e.source) && ids.has(e.target) && e.source !== e.target)
    .map((e) => [e.source, e.target] as [string, string]);
}

/** Rank each id by the longest chain of relationships reaching it.
 *
 *  Depth-first with the ids on the current path marked, so a cycle stops at the
 *  edge that closes it instead of ranking forever. A layer that is one long
 *  cycle simply comes out in the order it was walked, which is as much as any
 *  arrangement can say about it. */
function ranks(ids: string[], links: [string, string][]): Map<string, number> {
  const after = new Map<string, string[]>();
  for (const [from, to] of links) after.set(from, [...(after.get(from) ?? []), to]);

  const rank = new Map<string, number>();
  const walking = new Set<string>();

  const depth = (id: string): number => {
    const known = rank.get(id);
    if (known !== undefined) return known;
    if (walking.has(id)) return 0;

    walking.add(id);
    let deepest = 0;
    for (const next of after.get(id) ?? []) deepest = Math.max(deepest, depth(next) + 1);
    walking.delete(id);
    rank.set(id, deepest);

    return deepest;
  };

  // Depth counts forward, so invert it: nothing pointing at it comes first.
  for (const id of ids) depth(id);
  const deepest = Math.max(0, ...rank.values());
  for (const [id, at] of rank) rank.set(id, deepest - at);

  return rank;
}

/** Which way hand-laid ports lean a unit across its rank.
 *
 *  A port somebody placed says which face its relationships leave by, and
 *  layout may not move it. The least it can do is put the unit where that face
 *  is useful — a port on the top edge pulls its owner toward the top of its
 *  rank, so its lines leave into open space rather than back across the layer.
 *
 *  Only the two sides *across* the axis lean anything. The two along it are the
 *  rank's own business, and rank comes from topology: a port fighting that
 *  would contradict the relationships the arrangement is drawn from. */
function leanOf(graph: Graph, units: Unit[], along: "across" | "down"): Map<string, number> {
  const low: Side = along === "across" ? "top" : "left";
  const high: Side = along === "across" ? "bottom" : "right";
  const lean = new Map<string, number>();

  for (const unit of units) {
    let tilt = 0;
    for (const id of unit.ids) {
      for (const port of portsOf(graph, id)) {
        if (port.side === low) tilt -= 1;
        if (port.side === high) tilt += 1;
      }
    }
    if (tilt) lean.set(unit.id, Math.sign(tilt));
  }

  return lean;
}

/** Order the members of each rank so related ones sit across from each other.
 *
 *  Each is pulled toward the average position of what it is joined to in the
 *  rank before, swept forward then back. Two passes is where this stops paying:
 *  it is a heuristic for fewer crossings, not a solution to them. */
function ordered(rows: string[][], links: [string, string][],
                 lean: Map<string, number> = new Map()): string[][] {
  const near = new Map<string, string[]>();
  for (const [from, to] of links) {
    near.set(from, [...(near.get(from) ?? []), to]);
    near.set(to, [...(near.get(to) ?? []), from]);
  }

  const rowsOut = rows.map((row) => [...row]);

  const sweep = (from: number, to: number, step: number) => {
    for (let at = from; at !== to; at += step) {
      const anchor = new Map(rowsOut[at - step].map((id, i) => [id, i]));
      const pull = new Map(rowsOut[at].map((id) => {
        const seen = (near.get(id) ?? [])
          .map((other) => anchor.get(other))
          .filter((i): i is number => i !== undefined);

        return [id, seen.length
          ? seen.reduce((sum, i) => sum + i, 0) / seen.length
          : Number.POSITIVE_INFINITY];
      }));

      // A hand-laid port leans its owner by about one place: enough to settle
      // which of two neighbours goes first, never enough to leapfrog the
      // barycentre that put the rank in order.
      const rank = (id: string) => (pull.get(id) ?? 0) + (lean.get(id) ?? 0);

      rowsOut[at].sort((a, b) => rank(a) - rank(b));
    }
  };

  if (rowsOut.length > 1) {
    sweep(1, rowsOut.length, 1);
    sweep(rowsOut.length - 2, -1, -1);
  }

  return rowsOut;
}

/** The box round a set of boxes, plus a margin. */
export function around(boxes: Box[], pad: number): Box | null {
  if (!boxes.length) return null;

  const x = Math.min(...boxes.map((b) => b.x)) - pad;
  const y = Math.min(...boxes.map((b) => b.y)) - pad;

  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) + pad - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) + pad - y,
  };
}

type Sized = { id: string; x: number; y: number; w: number; h: number };

/** Members gathered into tracks along one axis: everything overlapping shares a
 *  track, and tracks come out in the order they were in. The new coordinate for
 *  each track is the tracks before it, laid end to end at `gap`. */
function tracked(items: { id: string; start: number; extent: number }[],
                 gap: number, wide: number,
                 joined: (a: string, b: string) => boolean): Record<string, number> {
  const lanes: { end: number; size: number; ids: string[] }[] = [];

  for (const item of [...items].sort((a, b) => a.start - b.start)) {
    const lane = lanes[lanes.length - 1];

    if (lane && item.start < lane.end) {
      lane.end = Math.max(lane.end, item.start + item.extent);
      lane.size = Math.max(lane.size, item.extent);
      lane.ids.push(item.id);
    } else {
      lanes.push({ end: item.start + item.extent, size: item.extent, ids: [item.id] });
    }
  }

  const out: Record<string, number> = {};
  let cursor = 0;
  let prior: string[] | null = null;

  for (const lane of lanes) {
    // Neighbours with a relationship between them need room for it. Belonging
    // together is said by closeness; being wired together is said by a line,
    // and a line squeezed into nothing says neither.
    if (prior) {
      cursor += prior.some((a) => lane.ids.some((b) => joined(a, b))) ? wide : gap;
    }

    for (const id of lane.ids) out[id] = cursor;
    cursor += lane.size;
    prior = lane.ids;
  }

  return out;
}

/** Re-space a unit's members without rearranging them.
 *
 *  A unit is rigid in shape, not in size: who sits beside whom is kept, and the
 *  distances are layout's. Each axis is read independently into tracks, so a
 *  row stays a row, a column stays a column, and a diagonal stays a diagonal —
 *  only the space between tracks is replaced. Members that already overlap on
 *  an axis come out aligned on it, which reads as the tidying it is.
 *
 *  Two members with a relationship between them are given the wider gap, so the
 *  line has somewhere to be drawn. */
function respaced(items: Sized[], gap: number, wide: number,
                  joined: (a: string, b: string) => boolean): Record<string, Spot> {
  const across = tracked(items.map((i) => ({ id: i.id, start: i.x, extent: i.w })),
                         gap, wide, joined);
  const down = tracked(items.map((i) => ({ id: i.id, start: i.y, extent: i.h })),
                       gap, wide, joined);

  return Object.fromEntries(items.map((i) => [i.id, { x: across[i.id], y: down[i.id] }]));
}

/** One thing layout moves as a whole: a single card or note, or a set of cards
 *  a group holds together.
 *
 *  A group is a statement about where things sit, so layout has to honour it or
 *  it is not laying the layer out at all — members strewn across the ranks draw
 *  a boundary over everything between them, and two such boundaries overlap
 *  however carefully anything else is arranged. Inside a unit the members keep
 *  their offsets exactly; only the unit moves. */
type Unit = {
  id: string;
  ids: string[];
  /** Each member's offset from the unit's own corner. */
  offsets: Record<string, Spot>;
  w: number;
  h: number;
  /** Where the user left it, if they did. */
  at: Spot | null;
};

/** Which shared-group home each node belongs to.
 *
 *  Groups that share a member are one home: the shared node pins them
 *  together, so they cannot be placed apart however much anyone would like
 *  them to be. Their boundaries still overlap and compound, which is what
 *  overlapping groups are supposed to do; they simply travel as one. */
function homes(graph: Graph, nodes: Element[]): Map<string, string> {
  const home = new Map<string, string>();
  const find = (id: string): string => {
    const up = home.get(id);

    return up && up !== id ? find(up) : id;
  };

  for (const node of nodes) home.set(node.id, node.id);

  for (const group of Object.values(graph.elements)) {
    if (group.form !== "group") continue;
    const here = membersOf(graph, group.id).map((n) => n.id).filter((id) => home.has(id));
    for (const id of here.slice(1)) {
      const a = find(here[0]);
      const b = find(id);
      if (a !== b) home.set(b, a);
    }
  }

  return new Map(nodes.map((n) => [n.id, find(n.id)]));
}

/** The layer's units: every shared-group home as one, every other card on its own.
 *
 *  A unit the user has placed keeps its members' positions exactly. One nobody
 *  has placed gets an internal arrangement of its own — laid out among its own
 *  members only — and that becomes rigid. */
function unitsOf(graph: Graph, nodes: Element[], shape: Layout): Unit[] {
  const home = homes(graph, nodes);
  const held = new Map<string, Element[]>();
  for (const node of nodes) {
    const key = home.get(node.id)!;
    held.set(key, [...(held.get(key) ?? []), node]);
  }

  return [...held.entries()].map(([id, members]) => {
    const placed = members.filter((n) => n.x !== null && n.y !== null);
    // A group has to leave room for the boundary drawn round it.
    const pad = members.length > 1 ? HUG : 0;

    const spots = placed.length
      ? Object.fromEntries(placed.map((n) => [n.id, middled({ x: n.x!, y: n.y! },
                                                            sizeOf(graph, n))]))
      : inner(graph, members, shape);

    // Any member the user never placed, in a unit some of whose members they
    // did: tucked below the rest rather than left at the origin.
    let below = Math.max(...Object.values(spots).map((s) => s.y), 0);
    for (const node of members) {
      if (spots[node.id]) continue;
      below += LEAF.h + GAP;
      spots[node.id] = middled({ x: Object.values(spots)[0]?.x ?? 0, y: below },
                               sizeOf(graph, node));
    }

    // Where it sits now, before its members are re-spaced — that is what a
    // placed unit holds on to.
    const was = around(members.map((n) => ({ ...spots[n.id], ...sizeOf(graph, n) })), pad)!;

    const wired = new Set(
      linksAmong(graph, new Set(members.map((n) => n.id)))
        .flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]),
    );
    const tidy = respaced(
      members.map((n) => ({ id: n.id, ...spots[n.id], ...sizeOf(graph, n) })),
      WITHIN, GAP, (a, b) => wired.has(`${a}|${b}`),
    );
    const bounds = around(
      members.map((n) => ({ ...tidy[n.id], ...sizeOf(graph, n) })), pad,
    )!;

    return {
      id,
      ids: members.map((n) => n.id),
      offsets: Object.fromEntries(
        members.map((n) => [n.id, { x: tidy[n.id].x - bounds.x, y: tidy[n.id].y - bounds.y }]),
      ),
      w: bounds.w,
      h: bounds.h,
      at: placed.length ? { x: was.x, y: was.y } : null,
    };
  });
}

/** A unit's own internal arrangement, worked out among its members alone. */
function inner(graph: Graph, members: Element[], shape: Layout): Record<string, Spot> {
  if (members.length === 1) return { [members[0].id]: middled({ x: 0, y: 0 },
                                                              sizeOf(graph, members[0])) };

  const boxed = members.map((n) => ({ id: n.id, ...sizeOf(graph, n) }));
  const ids = new Set(members.map((n) => n.id));
  const links = linksAmong(graph, ids);

  return shape === "across" || shape === "down"
    ? rankedBoxes(boxed, links, shape, new Map(), WITHIN, flowsAmong(graph, ids))
    : gridded(boxed, WITHIN);
}

/** Boxes tiled in reading order, kept as square as the count allows and grown
 *  outward from the middle.
 *
 *  Columns and rows are sized from what is actually in them. One tall unit
 *  among cards would otherwise make every row as tall as itself, which is the
 *  spread a grid is supposed to avoid. */
function gridded(boxes: { id: string; w: number; h: number }[],
                 gap = GAP): Record<string, Spot> {
  const cols = Math.max(1, tile(boxes.length).cols);
  const rows = Math.max(1, Math.ceil(boxes.length / cols));
  const wide = Array<number>(cols).fill(0);
  const tall = Array<number>(rows).fill(0);

  boxes.forEach((box, at) => {
    wide[at % cols] = Math.max(wide[at % cols], box.w);
    tall[Math.floor(at / cols)] = Math.max(tall[Math.floor(at / cols)], box.h);
  });

  const runs = (sizes: number[]) => {
    const total = sizes.reduce((sum, size) => sum + size + gap, -gap);
    const out: number[] = [];
    let cursor = -total / 2;
    for (const size of sizes) {
      out.push(cursor);
      cursor += size + gap;
    }

    return out;
  };

  const xs = runs(wide);
  const ys = runs(tall);
  const spots: Record<string, Spot> = {};

  boxes.forEach((box, at) => {
    const col = at % cols;
    const row = Math.floor(at / cols);
    spots[box.id] = middled({
      x: xs[col] + (wide[col] - box.w) / 2,
      y: ys[row] + (tall[row] - box.h) / 2,
    }, box);
  });

  return spots;
}

/** Boxes in ranks along one axis, centred on the origin.
 *
 *  Rank decides the position along the axis, order within the rank decides the
 *  position across it. That is what puts two related things on one row: they
 *  are in neighbouring ranks and the ordering pass pulls them level, so the
 *  relationship between them is a straight line with nothing to work around.
 *
 *  When `flows` is non-empty, rank follows those directed edges only; `links`
 *  still order within a rank. Without a flow, every link ranks — a layer of
 *  plain lines has nothing else to read. */
function rankedBoxes(boxes: { id: string; w: number; h: number }[],
                     links: [string, string][], along: "across" | "down",
                     lean: Map<string, number> = new Map(),
                     gap = GAP,
                     flows: [string, string][] = []): Record<string, Spot> {
  const size = new Map(boxes.map((b) => [b.id, b]));
  const rank = ranks(boxes.map((b) => b.id), flows.length ? flows : links);
  const depth = Math.max(0, ...rank.values());

  const rows: string[][] = Array.from({ length: depth + 1 }, () => []);
  for (const box of boxes) rows[rank.get(box.id) ?? 0].push(box.id);

  const runs = along === "across" ? "x" : "y";
  const across: "x" | "y" = runs === "x" ? "y" : "x";
  const spots: Record<string, Spot> = {};

  const laid = ordered(rows, links, lean);
  const spans = laid.map((row) => Math.max(
    0, ...row.map((id) => (runs === "x" ? size.get(id)!.w : size.get(id)!.h)),
  ));
  const stride = spans.map((span) => span + (gap === GAP ? RANK : gap));

  let cursor = -stride.reduce((sum, s) => sum + s, 0) / 2;

  laid.forEach((row, at) => {
    const width = row.reduce(
      (sum, id) => sum + (across === "y" ? size.get(id)!.h : size.get(id)!.w) + gap, -gap,
    );
    let run = -width / 2;

    for (const id of row) {
      const box = size.get(id)!;
      const spot = {
        [runs]: cursor + (spans[at] - (runs === "x" ? box.w : box.h)) / 2,
        [across]: run,
      } as Spot;

      spots[id] = middled(spot, box);
      run += (across === "y" ? box.h : box.w) + gap;
    }

    cursor += stride[at];
  });

  return spots;
}

/** Units ordered so that whatever relates to what is already down comes next,
 *  which keeps related units near each other without a ranking pass. */
function neighbourly(units: Unit[], links: [string, string][]): Unit[] {
  const here = new Map(units.map((u) => [u.id, u]));
  const near = new Map<string, string[]>();

  for (const [from, to] of links) {
    near.set(from, [...(near.get(from) ?? []), to]);
    near.set(to, [...(near.get(to) ?? []), from]);
  }

  const queue = [...units].sort(
    (a, b) => (near.get(b.id)?.length ?? 0) - (near.get(a.id)?.length ?? 0),
  );
  const order: Unit[] = [];
  const seen = new Set<string>();

  for (const start of queue) {
    if (seen.has(start.id)) continue;

    const wave = [start];
    seen.add(start.id);

    while (wave.length) {
      const unit = wave.shift()!;
      order.push(unit);

      for (const id of near.get(unit.id) ?? []) {
        if (seen.has(id) || !here.has(id)) continue;
        seen.add(id);
        wave.push(here.get(id)!);
      }
    }
  }

  return order;
}

/** A hub and its spokes, growing outward from the middle.
 *
 *  The busiest unit takes the centre, whatever it joins rings around it, and
 *  what is left rings beyond that. For a layer that is one thing and its
 *  attendants — the shape ranks cannot show, because there is only one rank
 *  worth naming and everything else is equidistant from it. */
function radial(units: Unit[], links: [string, string][],
                gap: number): Record<string, Spot> {
  const near = new Map<string, Set<string>>();
  for (const [from, to] of links) {
    (near.get(from) ?? near.set(from, new Set()).get(from)!).add(to);
    (near.get(to) ?? near.set(to, new Set()).get(to)!).add(from);
  }

  const busiest = [...units].sort(
    (a, b) => (near.get(b.id)?.size ?? 0) - (near.get(a.id)?.size ?? 0),
  );
  const hub = busiest[0];
  const spots: Record<string, Spot> = {};
  if (!hub) return spots;

  spots[hub.id] = middled({ x: -hub.w / 2, y: -hub.h / 2 }, hub);

  const seen = new Set([hub.id]);
  let ring = [...(near.get(hub.id) ?? [])]
    .map((id) => units.find((u) => u.id === id))
    .filter((u): u is Unit => Boolean(u));
  let reach = Math.max(hub.w, hub.h) / 2;

  while (ring.length) {
    for (const unit of ring) seen.add(unit.id);

    // Wide enough that the ring's members sit clear of one another on it.
    const span = Math.max(...ring.map((u) => Math.max(u.w, u.h)));
    reach += span / 2 + gap;
    reach = Math.max(reach, (ring.length * (span + gap)) / (2 * Math.PI));

    ring.forEach((unit, at) => {
      const turn = (at / ring.length) * 2 * Math.PI - Math.PI / 2;
      spots[unit.id] = middled({
        x: Math.cos(turn) * reach - unit.w / 2,
        y: Math.sin(turn) * reach - unit.h / 2,
      }, unit);
    });

    reach += span / 2;
    const next = new Map<string, Unit>();
    for (const unit of ring) {
      for (const id of near.get(unit.id) ?? []) {
        if (seen.has(id) || next.has(id)) continue;
        const found = units.find((u) => u.id === id);
        if (found) next.set(id, found);
      }
    }

    // Anything the hub does not reach at all still has to go somewhere.
    if (!next.size) {
      for (const unit of units) {
        if (!seen.has(unit.id) && !next.has(unit.id)) next.set(unit.id, unit);
      }
    }

    ring = [...next.values()];
  }

  return spots;
}

/** Members spread out from their unit's corner. */
function spread(units: Unit[], corner: Record<string, Spot>): Record<string, Spot> {
  const spots: Record<string, Spot> = {};

  for (const unit of units) {
    const at = corner[unit.id] ?? { x: 0, y: 0 };
    for (const id of unit.ids) {
      spots[id] = { x: at.x + unit.offsets[id].x, y: at.y + unit.offsets[id].y };
    }
  }

  return spots;
}

/** Unit-to-unit relationships, for whichever pass needs them. */
function between(graph: Graph, nodes: Element[], units: Unit[]): [string, string][] {
  const inUnit = new Map<string, string>();
  for (const unit of units) for (const id of unit.ids) inUnit.set(id, unit.id);

  return [...new Set(
    linksAmong(graph, new Set(nodes.map((n) => n.id)))
      .map(([a, b]) => [inUnit.get(a)!, inUnit.get(b)!])
      .filter(([a, b]) => a !== b)
      .map(([a, b]) => `${a}|${b}`),
  )].map((k) => k.split("|") as [string, string]);
}

/** Directed unit-to-unit relationships — what ranks and resting fill follow. */
function betweenFlows(graph: Graph, nodes: Element[], units: Unit[]): [string, string][] {
  const inUnit = new Map<string, string>();
  for (const unit of units) for (const id of unit.ids) inUnit.set(id, unit.id);

  return [...new Set(
    flowsAmong(graph, new Set(nodes.map((n) => n.id)))
      .map(([a, b]) => [inUnit.get(a)!, inUnit.get(b)!])
      .filter(([a, b]) => a !== b)
      .map(([a, b]) => `${a}|${b}`),
  )].map((k) => k.split("|") as [string, string]);
}

/** Adjacency and degrees for an undirected view of these links.
 *
 *  Drawing order and a pair of opposing directed edges are the same join: one
 *  undirected edge, or a chord would never be told from a double-drawn line. */
function adjacent(ids: string[], links: [string, string][]) {
  const here = new Set(ids);
  const near = new Map(ids.map((id) => [id, [] as string[]]));
  const deg = new Map(ids.map((id) => [id, 0]));
  const seen = new Set<string>();
  let edges = 0;

  for (const [a, b] of links) {
    if (!here.has(a) || !here.has(b) || a === b) continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    near.get(a)!.push(b);
    near.get(b)!.push(a);
    deg.set(a, deg.get(a)! + 1);
    deg.set(b, deg.get(b)! + 1);
    edges += 1;
  }

  return { near, deg, edges };
}

/** Connected components of units joined by relationships — clusters.
 *
 *  Singletons count: an unrelated unit is a cluster of one, so the compose
 *  pass has one list to place rather than a special case for leftovers. */
function clustered(units: Unit[], links: [string, string][]): Unit[][] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const { near } = adjacent(units.map((u) => u.id), links);
  const seen = new Set<string>();
  const packs: Unit[][] = [];

  for (const unit of units) {
    if (seen.has(unit.id)) continue;

    const wave = [unit.id];
    const pack: Unit[] = [];
    seen.add(unit.id);

    while (wave.length) {
      const id = wave.pop()!;
      pack.push(byId.get(id)!);
      for (const other of near.get(id) ?? []) {
        if (seen.has(other)) continue;
        seen.add(other);
        wave.push(other);
      }
    }

    packs.push(pack);
  }

  return packs;
}

/** Exact ring or chain — nothing fuzzier.
 *
 *  A detector that calls five nodes a ring nobody would recognise is worse
 *  than no detector. A path is a chain; a single cycle is a ring; a chord, a
 *  branch or a hub is neither, and falls through to the layer's arrangement. */
function topologyOf(ids: string[], links: [string, string][]): "ring" | "chain" | null {
  const n = ids.length;
  if (n < 2) return null;

  const { deg, edges } = adjacent(ids, links);
  const degrees = [...deg.values()];

  if (edges === n - 1
      && degrees.every((d) => d <= 2)
      && degrees.filter((d) => d === 1).length === 2) {
    return "chain";
  }

  if (n >= 3 && edges === n && degrees.every((d) => d === 2)) return "ring";

  return null;
}

/** Walk a path from one end to the other, preferring flow's source end. */
function walkChain(ids: string[], links: [string, string][],
                   flows: [string, string][]): string[] {
  const { near, deg } = adjacent(ids, links);
  const ends = ids.filter((id) => deg.get(id) === 1);
  const outbound = new Set(flows.map(([from]) => from));
  const inbound = new Set(flows.map(([, to]) => to));

  // The end that only sends, or that sends at all, reads as the start.
  const start = ends.find((id) => outbound.has(id) && !inbound.has(id))
    ?? ends.find((id) => outbound.has(id))
    ?? ends[0]
    ?? ids[0];

  const order = [start];
  const seen = new Set([start]);
  let at = start;

  while (order.length < ids.length) {
    const next = (near.get(at) ?? []).find((id) => !seen.has(id));
    if (!next) break;
    order.push(next);
    seen.add(next);
    at = next;
  }

  return order;
}

/** Walk a cycle once, preferring a directed successor when the edge is one. */
function walkRing(ids: string[], links: [string, string][],
                  flows: [string, string][]): string[] {
  const { near } = adjacent(ids, links);
  const after = new Map<string, string[]>();
  for (const [from, to] of flows) after.set(from, [...(after.get(from) ?? []), to]);

  const start = ids.find((id) => (after.get(id) ?? []).length) ?? ids[0];
  const order = [start];
  const seen = new Set([start]);
  let at = start;

  while (order.length < ids.length) {
    const directed = (after.get(at) ?? []).find((id) => !seen.has(id)
      && (near.get(at) ?? []).includes(id));
    const next = directed ?? (near.get(at) ?? []).find((id) => !seen.has(id));
    if (!next) break;
    order.push(next);
    seen.add(next);
    at = next;
  }

  return order;
}

/** Units equally spaced on a circle, in cycle order — a ring that stays a ring. */
function ringed(units: Unit[], order: string[], gap: number): Record<string, Spot> {
  const byId = new Map(units.map((u) => [u.id, u]));
  const span = Math.max(...order.map((id) => Math.max(byId.get(id)!.w, byId.get(id)!.h)));
  const reach = Math.max(span / 2 + gap, (order.length * (span + gap)) / (2 * Math.PI));
  const spots: Record<string, Spot> = {};

  order.forEach((id, at) => {
    const unit = byId.get(id)!;
    const turn = (at / order.length) * 2 * Math.PI - Math.PI / 2;
    spots[id] = middled({
      x: Math.cos(turn) * reach - unit.w / 2,
      y: Math.sin(turn) * reach - unit.h / 2,
    }, unit);
  });

  return spots;
}

/** Units in series along one axis — a chain that stays a series. */
function chained(units: Unit[], order: string[], along: "across" | "down",
                 gap: number): Record<string, Spot> {
  const byId = new Map(units.map((u) => [u.id, u]));
  const runs = along === "across" ? "x" : "y";
  const across: "x" | "y" = runs === "x" ? "y" : "x";
  const extents = order.map((id) => runs === "x" ? byId.get(id)!.w : byId.get(id)!.h);
  const total = extents.reduce((sum, e) => sum + e + gap, -gap);
  let cursor = -total / 2;
  const spots: Record<string, Spot> = {};

  order.forEach((id, at) => {
    const unit = byId.get(id)!;
    const spot = {
      [runs]: cursor,
      [across]: -(runs === "x" ? unit.h : unit.w) / 2,
    } as Spot;
    spots[id] = middled(spot, unit);
    cursor += extents[at] + gap;
  });

  return spots;
}

/** One cluster's own corners, by its topology or the layer's arrangement. */
function shaped(units: Unit[], links: [string, string][], flows: [string, string][],
                shape: Layout, lean: Map<string, number>): Record<string, Spot> {
  const ids = units.map((u) => u.id);
  const kind = topologyOf(ids, links);
  const along = shape === "down" ? "down" : "across";

  if (kind === "ring") return ringed(units, walkRing(ids, links, flows), GAP);
  if (kind === "chain") return chained(units, walkChain(ids, links, flows), along, GAP);

  const boxes = units.map((u) => ({ id: u.id, w: u.w, h: u.h }));

  return shape === "grid" ? gridded(boxes)
    : shape === "radial" ? radial(units, links, GAP)
    : rankedBoxes(boxes, links, shape, lean, GAP, flows);
}

/** Shift a pack's local corners so its bounding box starts at the origin. */
function originOf(units: Unit[], local: Record<string, Spot>): {
  local: Record<string, Spot>; w: number; h: number;
} {
  const bounds = around(units.map((u) => ({ ...local[u.id], w: u.w, h: u.h })), 0)!;

  return {
    local: Object.fromEntries(units.map((u) => [u.id, {
      x: local[u.id].x - bounds.x,
      y: local[u.id].y - bounds.y,
    }])),
    w: bounds.w,
    h: bounds.h,
  };
}

/** Where a loose unit should prefer to sit, given directed edges to placed ones.
 *
 *  Downstream of a placed source, upstream of a placed target — along the
 *  layer's axis when it has one. Without an axis the ring order stands; the
 *  axis is what makes "with the flow" a place rather than only a side. */
function driftOf(id: string, flows: [string, string][],
                 corner: Record<string, Spot>, units: Unit[],
                 axis: Axis): Spot | null {
  if (axis === "none") return null;

  const size = new Map(units.map((u) => [u.id, u]));
  let x = 0;
  let y = 0;
  let n = 0;

  for (const [from, to] of flows) {
    if (to === id && corner[from]) {
      const u = size.get(from)!;
      x += corner[from].x + (axis === "across" ? u.w + GAP : 0);
      y += corner[from].y + (axis === "down" ? u.h + GAP : 0);
      n += 1;
    }
    if (from === id && corner[to]) {
      const u = size.get(id)!;
      x += corner[to].x - (axis === "across" ? u.w + GAP : 0);
      y += corner[to].y - (axis === "down" ? u.h + GAP : 0);
      n += 1;
    }
  }

  return n ? { x: x / n, y: y / n } : null;
}

/** First free ring-fill seat for a box, optionally biased toward a preferred spot. */
function seatIn(taken: Box[], box: { w: number; h: number },
                step: { x: number; y: number }, rounds: number,
                prefer: Spot | null): Spot {
  const candidates = [...rings(step, rounds)];
  if (prefer) {
    candidates.sort((a, b) =>
      Math.abs(a.x - prefer.x) + Math.abs(a.y - prefer.y)
      - (Math.abs(b.x - prefer.x) + Math.abs(b.y - prefer.y)));
  }

  for (const point of candidates) {
    const at = { ...middled({ x: point.x - box.w / 2, y: point.y - box.h / 2 }, box),
                 w: box.w, h: box.h };
    if (taken.some((other) => collides(at, other))) continue;

    return { x: at.x, y: at.y };
  }

  return { x: 0, y: 0 };
}

/** The layer's notes folded into the node list, so a call that only hands
 *  cards still places captions with them.
 *
 *  Notes already among `nodes` are left alone; the rest come from the same
 *  parent the cards share. An empty list stays empty — there is no layer to
 *  read notes from. */
function withNotes(graph: Graph, nodes: Element[]): Element[] {
  if (!nodes.length) return nodes;

  const seen = new Set(nodes.map((n) => n.id));
  const layer = nodes.find((n) => n.form !== "note")?.parent
    ?? nodes[0]?.parent
    ?? null;
  const extra = notesIn(graph, layer).filter((n) => !seen.has(n.id));

  return extra.length ? [...nodes, ...extra] : nodes;
}

/** Notes that have a tie to something else being laid out — seated by
 *  association after the structural pass, not ranked into it. */
function tetheredOf(graph: Graph, nodes: Element[]): Element[] {
  const here = new Set(nodes.map((n) => n.id));

  return nodes.filter((n) => n.form === "note"
    && tiesOf(graph, n.id).some((id) => here.has(id)));
}

/** Whether a box overlaps another, counting the hug a note keeps clear. */
function hugs(a: Box, b: Box): boolean {
  return a.x < b.x + b.w + HUG && a.x + a.w + HUG > b.x &&
         a.y < b.y + b.h + HUG && a.y + a.h + HUG > b.y;
}

/** Seat tied notes under what they describe — the fixed association.
 *
 *  Aligned to the left of the described set, just below it, then dropped a
 *  row at a time until clear of cards and group boundaries. Notes seated
 *  earlier in the pass join the obstacles. Callers only hand notes that have
 *  at least one tie among the laid spots. */
function associated(graph: Graph, notes: Element[],
                    spots: Record<string, Spot>,
                    nodes: Element[]): Record<string, Spot> {
  const boxOf = (id: string): Box | null => {
    const at = spots[id];
    const el = graph.elements[id];
    if (!at || !el) return null;

    return { ...at, ...sizeOf(graph, el) };
  };

  const taken: Box[] = [];
  for (const node of nodes) {
    if (notes.some((n) => n.id === node.id)) continue;
    const box = boxOf(node.id);
    if (box) taken.push(box);
  }

  for (const group of Object.values(graph.elements)) {
    if (group.form !== "group") continue;
    const here = membersOf(graph, group.id).map((n) => boxOf(n.id)).filter(Boolean) as Box[];
    const band = around(here, HUG);
    if (band) taken.push(band);
  }

  const out: Record<string, Spot> = {};

  for (const note of notes) {
    const held = tiesOf(graph, note.id).map(boxOf).filter(Boolean) as Box[];
    if (!held.length) continue;

    const round = around(held, 0)!;
    const size = sizeOf(graph, note);
    let at = { x: cell(round.x), y: cell(round.y + round.h + CELL) };

    for (let drop = 0; drop < 40; drop += 1) {
      if (!taken.some((other) => hugs({ ...at, ...size }, other))) break;
      at = { x: at.x, y: at.y + CELL };
    }

    out[note.id] = at;
    taken.push({ ...at, ...size });
  }

  return out;
}

/** Positions for one layer as it rests.
 *
 *  Everything somebody placed stays exactly where it is; anything unplaced
 *  fills the room around it. This is the *only* thing a render runs.
 *
 *  A fully-loose ring or chain is seated as one region with that shape, so
 *  resting fill does not scatter a topology the next arrangement would keep.
 *  Mixed and shapeless clusters still fill unit by unit.
 *
 *  Tied notes that nobody has placed follow what they describe — a fixed
 *  association, applied after the structural fill. Untied notes fill like any
 *  other unit. Notes the layer holds are included even when the caller only
 *  handed cards.
 *
 *  An arrangement is an action that writes positions, never a mode that keeps
 *  recomputing them — under a mode, a card dragged while one was set would be
 *  thrown away on the very next frame, which is no way to treat a drag. The
 *  axis is remembered for what it still decides: a flow's sides, which way an
 *  unplaced flow neighbour prefers to sit, and what the next arrangement will
 *  do. */
export function place(graph: Graph, nodes: Element[],
                      blocked: Box[] = []): Record<string, Spot> {
  const all = withNotes(graph, nodes);
  const looseTied = tetheredOf(graph, all).filter((n) => n.x === null || n.y === null);
  const held = new Set(looseTied.map((n) => n.id));
  const free = all.filter((n) => !held.has(n.id));

  const units = unitsOf(graph, free, "grid");
  const links = between(graph, free, units);
  const flows = betweenFlows(graph, free, units);
  const axis = axisOf(graph, free[0]?.parent ?? all[0]?.parent ?? null);
  const along = axis === "down" ? "down" : "across";
  const taken: Box[] = [...blocked];
  const corner: Record<string, Spot> = {};

  for (const unit of units) {
    if (!unit.at) continue;
    corner[unit.id] = unit.at;
    taken.push({ ...unit.at, w: unit.w, h: unit.h });
  }

  const step = { x: LEAF.w + GAP, y: LEAF.h + GAP };
  const rounds = units.length + taken.length + 2;

  // Fully-loose rings and chains land as one region before the unit-by-unit fill.
  for (const members of clustered(units, links)) {
    if (members.length < 2 || members.some((u) => u.at)) continue;

    const ids = members.map((u) => u.id);
    const among = new Set(ids);
    const localLinks = links.filter(([a, b]) => among.has(a) && among.has(b));
    const localFlows = flows.filter(([a, b]) => among.has(a) && among.has(b));
    const kind = topologyOf(ids, localLinks);
    if (kind !== "ring" && kind !== "chain") continue;

    const raw = kind === "ring"
      ? ringed(members, walkRing(ids, localLinks, localFlows), GAP)
      : chained(members, walkChain(ids, localLinks, localFlows), along, GAP);
    const { local, w, h } = originOf(members, raw);

    const prefer = members
      .map((u) => driftOf(u.id, flows, corner, units, axis))
      .reduce<{ x: number; y: number; n: number }>((sum, at) => {
        if (!at) return sum;

        return { x: sum.x + at.x, y: sum.y + at.y, n: sum.n + 1 };
      }, { x: 0, y: 0, n: 0 });
    const bias = prefer.n ? { x: prefer.x / prefer.n, y: prefer.y / prefer.n } : null;
    const at = seatIn(taken, { w, h }, step, rounds + members.length, bias);

    for (const unit of members) {
      corner[unit.id] = { x: at.x + local[unit.id].x, y: at.y + local[unit.id].y };
    }
    taken.push({ ...at, w, h });
  }

  const loose = units.filter((u) => !corner[u.id]);

  for (const unit of neighbourly(loose, links)) {
    const prefer = driftOf(unit.id, flows, corner, units, axis);
    const at = seatIn(taken, { w: unit.w, h: unit.h }, step, rounds, prefer);
    corner[unit.id] = at;
    taken.push({ ...at, w: unit.w, h: unit.h });
  }

  const spots = spread(units, corner);
  if (!looseTied.length) return spots;

  return { ...spots, ...associated(graph, looseTied, spots, all) };
}

/** Positions for the whole layer, arranged afresh — what picking an arrangement
 *  computes. The result is written down as ordinary placement, so it can be
 *  dragged about afterwards like anything else.
 *
 *  Each relationship-cluster is shaped on its own (ring, chain, or the layer's
 *  arrangement), then the clusters themselves are composed by that arrangement.
 *  Cluster-to-cluster spacing stays the ordinary gap; a wider tier is later.
 *
 *  Tied notes are seated under what they describe after the clusters land —
 *  fixed associations, not members of a ring or a rank. Untied notes arrange
 *  as units of their own. */
export function arranged(graph: Graph, nodes: Element[],
                         shape: Layout): Record<string, Spot> {
  const all = withNotes(graph, nodes);
  const tied = tetheredOf(graph, all);
  const held = new Set(tied.map((n) => n.id));
  const free = all.filter((n) => !held.has(n.id));

  const units = unitsOf(graph, free, shape);
  const links = between(graph, free, units);
  const flows = betweenFlows(graph, free, units);
  const lean = shape === "across" || shape === "down"
    ? leanOf(graph, units, shape)
    : new Map<string, number>();

  const packs = clustered(units, links).map((members, at) => {
    const ids = new Set(members.map((u) => u.id));
    const localLinks = links.filter(([a, b]) => ids.has(a) && ids.has(b));
    const localFlows = flows.filter(([a, b]) => ids.has(a) && ids.has(b));
    const packLean = new Map(
      [...lean].filter(([id]) => members.some((u) => u.id === id)),
    );
    const { local, w, h } = originOf(
      members, shaped(members, localLinks, localFlows, shape, packLean),
    );

    return { id: `cluster_${at}`, members, local, w, h };
  });

  const packBoxes = packs.map((p) => ({ id: p.id, w: p.w, h: p.h }));
  const packUnits: Unit[] = packs.map((p) => ({
    id: p.id, ids: [p.id], offsets: { [p.id]: { x: 0, y: 0 } },
    w: p.w, h: p.h, at: null,
  }));

  // Clusters are disjoint by construction — compose them with no inter-links.
  const packCorner = shape === "grid" ? gridded(packBoxes)
    : shape === "radial" ? radial(packUnits, [], GAP)
    : rankedBoxes(packBoxes, [], shape, new Map(), GAP, []);

  const corner: Record<string, Spot> = {};
  for (const pack of packs) {
    const at = packCorner[pack.id] ?? { x: 0, y: 0 };
    for (const unit of pack.members) {
      corner[unit.id] = {
        x: at.x + pack.local[unit.id].x,
        y: at.y + pack.local[unit.id].y,
      };
    }
  }

  const spots = spread(units, corner);
  if (!tied.length) return spots;

  return { ...spots, ...associated(graph, tied, spots, all) };
}

