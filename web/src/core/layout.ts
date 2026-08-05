/** Sizing and placement for the canvas.
 *
 *  Two jobs. `pack` lays out a container's child chips as tiled 1|2 groups.
 *  `place` lays out a whole layer around the centre, so the mass of blocks
 *  grows outward from the origin instead of trailing off one corner.
 *
 *  A layer arranges itself the way its axis says: ranked along one direction,
 *  or filling outward from the middle when it has none. That is the only choice
 *  there is — there are no named arrangements beyond it.
 *
 *  Both are pure geometry; nothing here knows about React Flow. */

import { isContainer, portsOf } from "./fold";
import { similarity } from "./match";
import type { Axis, Graph, Node, Side, Spot } from "./types";

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
/** Clear space kept between auto-placed cards. One cell: at two, the air
 *  between compact cards was wider than the cards. */
const GAP = CELL;

/** Clear space kept between one rank and the next. Wider than the gap across a
 *  rank, because this is the space the lines between them run in: two stubs
 *  meet in it, and a lane or two beside them. Not wider than that — air between
 *  ranks is what makes an arrangement read as scattered. */
const RANK = GAP * 2;

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
export function affinity(graph: Graph, child: Node): number {
  const parent = child.parent ? graph.nodes[child.parent] : null;
  if (!parent) return 0;

  const own = similarity(child.label, parent.label);
  const bodied = parent.body ? similarity(child.label, parent.body) : 0;

  return Math.max(own, bodied);
}

/** Size of one node's card.
 *
 *  A container is barely bigger than a block: room for the grid under its
 *  name, and no more. It does not grow with what it holds — a card that swells
 *  with its contents makes a busy layer into a wall of large boxes, and says
 *  the same thing the grid inside it already says. The cells shrink instead,
 *  which is what keeps a full container reading as full. */
export function sizeOf(graph: Graph, node: Node): { w: number; h: number } {
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
export function freeSeat(graph: Graph, port: Node, side: Side, at: number,
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

/** Relationships with both ends among these nodes, as source → target pairs.
 *
 *  Ranking reads the pair rather than `dir`, because a relationship is
 *  undirected by default and the way it was drawn is the only statement of
 *  direction most of them will ever carry. */
function linksAmong(graph: Graph, ids: Set<string>): [string, string][] {
  return Object.values(graph.edges)
    .filter((e) => ids.has(e.source) && ids.has(e.target) && e.source !== e.target)
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

/** Order the members of each rank so related ones sit across from each other.
 *
 *  Each is pulled toward the average position of what it is joined to in the
 *  rank before, swept forward then back. Two passes is where this stops paying:
 *  it is a heuristic for fewer crossings, not a solution to them. */
function ordered(rows: string[][], links: [string, string][]): string[][] {
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

      rowsOut[at].sort((a, b) => (pull.get(a) ?? 0) - (pull.get(b) ?? 0));
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

/** One thing layout moves as a whole: a single card, or a set of cards a group
 *  holds together.
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

/** Which group cluster each node belongs to.
 *
 *  Groups that share a member are one cluster: the shared node pins them
 *  together, so they cannot be placed apart however much anyone would like
 *  them to be. Their boundaries still overlap and compound, which is what
 *  overlapping groups are supposed to do; they simply travel as one. */
function clusters(graph: Graph, nodes: Node[]): Map<string, string> {
  const home = new Map<string, string>();
  const find = (id: string): string => {
    const up = home.get(id);

    return up && up !== id ? find(up) : id;
  };

  for (const node of nodes) home.set(node.id, node.id);

  for (const attr of Object.values(graph.attrs)) {
    if (!attr.group) continue;
    const here = attr.holders.filter((id) => home.has(id));
    for (const id of here.slice(1)) {
      const a = find(here[0]);
      const b = find(id);
      if (a !== b) home.set(b, a);
    }
  }

  return new Map(nodes.map((n) => [n.id, find(n.id)]));
}

/** The layer's units: every group cluster as one, every other card on its own.
 *
 *  A unit the user has placed keeps its members' positions exactly. One nobody
 *  has placed gets an internal arrangement of its own — laid out among its own
 *  members only — and that becomes rigid. */
function unitsOf(graph: Graph, nodes: Node[], axis: Axis): Unit[] {
  const home = clusters(graph, nodes);
  const held = new Map<string, Node[]>();
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
      : inner(graph, members, axis);

    // Any member the user never placed, in a unit some of whose members they
    // did: tucked below the rest rather than left at the origin.
    let below = Math.max(...Object.values(spots).map((s) => s.y), 0);
    for (const node of members) {
      if (spots[node.id]) continue;
      below += LEAF.h + GAP;
      spots[node.id] = middled({ x: Object.values(spots)[0]?.x ?? 0, y: below },
                               sizeOf(graph, node));
    }

    const boxes = members.map((n) => ({ ...spots[n.id], ...sizeOf(graph, n) }));
    const bounds = around(boxes, pad)!;

    return {
      id,
      ids: members.map((n) => n.id),
      offsets: Object.fromEntries(
        members.map((n) => [n.id, { x: spots[n.id].x - bounds.x, y: spots[n.id].y - bounds.y }]),
      ),
      w: bounds.w,
      h: bounds.h,
      at: placed.length ? { x: bounds.x, y: bounds.y } : null,
    };
  });
}

/** A unit's own internal arrangement, worked out among its members alone. */
function inner(graph: Graph, members: Node[], axis: Axis): Record<string, Spot> {
  if (members.length === 1) return { [members[0].id]: middled({ x: 0, y: 0 },
                                                              sizeOf(graph, members[0])) };

  const boxed = members.map((n) => ({ id: n.id, ...sizeOf(graph, n) }));
  const ids = new Set(members.map((n) => n.id));

  return axis === "free" || axis === "grid"
    ? gridded(boxed)
    : rankedBoxes(boxed, linksAmong(graph, ids), axis);
}

/** Boxes tiled in reading order, kept as square as the count allows. */
function gridded(boxes: { id: string; w: number; h: number }[]): Record<string, Spot> {
  const { cols } = tile(boxes.length);
  const step = {
    x: Math.max(...boxes.map((b) => b.w)) + GAP,
    y: Math.max(...boxes.map((b) => b.h)) + GAP,
  };
  const rows = Math.ceil(boxes.length / Math.max(cols, 1));
  const spots: Record<string, Spot> = {};

  boxes.forEach((box, at) => {
    const col = at % cols;
    const row = Math.floor(at / cols);
    spots[box.id] = middled({
      x: (col - (cols - 1) / 2) * step.x - box.w / 2,
      y: (row - (rows - 1) / 2) * step.y - box.h / 2,
    }, box);
  });

  return spots;
}

/** Boxes in ranks along one axis, centred on the origin.
 *
 *  Rank decides the position along the axis, order within the rank decides the
 *  position across it. That is what puts two related things on one row: they
 *  are in neighbouring ranks and the ordering pass pulls them level, so the
 *  relationship between them is a straight line with nothing to work around. */
function rankedBoxes(boxes: { id: string; w: number; h: number }[],
                     links: [string, string][], axis: Axis): Record<string, Spot> {
  const size = new Map(boxes.map((b) => [b.id, b]));
  const rank = ranks(boxes.map((b) => b.id), links);
  const depth = Math.max(0, ...rank.values());

  const rows: string[][] = Array.from({ length: depth + 1 }, () => []);
  for (const box of boxes) rows[rank.get(box.id) ?? 0].push(box.id);

  const along = axis === "right" ? "x" : "y";
  const across: "x" | "y" = along === "x" ? "y" : "x";
  const spots: Record<string, Spot> = {};

  const laid = ordered(rows, links);
  const spans = laid.map((row) => Math.max(
    0, ...row.map((id) => (along === "x" ? size.get(id)!.w : size.get(id)!.h)),
  ));
  const stride = spans.map((span) => span + RANK);

  let cursor = -stride.reduce((sum, s) => sum + s, 0) / 2;

  laid.forEach((row, at) => {
    const width = row.reduce(
      (sum, id) => sum + (across === "y" ? size.get(id)!.h : size.get(id)!.w) + GAP, -GAP,
    );
    let run = -width / 2;

    for (const id of row) {
      const box = size.get(id)!;
      const spot = {
        [along]: cursor + (spans[at] - (along === "x" ? box.w : box.h)) / 2,
        [across]: run,
      } as Spot;

      spots[id] = middled(spot, box);
      run += (across === "y" ? box.h : box.w) + GAP;
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

/** Positions for one layer, centred on the origin.
 *
 *  Units the user has placed keep their positions; the rest are arranged around
 *  them the way the layer's axis says. `blocked` is space already spoken for by
 *  something that is not a card — a note — so nothing is laid on top of it. */
export function place(graph: Graph, nodes: Node[], axis: Axis = "free",
                      blocked: Box[] = []): Record<string, Spot> {
  // `blocked` is space a note holds. Cards fill around one, but an arrangement
  // is never slid aside for one: a note sits where what it describes sits, so
  // moving the whole layer to clear it only carries the layer away from it.
  const units = unitsOf(graph, nodes, axis);
  const inUnit = new Map<string, string>();
  for (const unit of units) for (const id of unit.ids) inUnit.set(id, unit.id);

  const links = [...new Set(
    linksAmong(graph, new Set(nodes.map((n) => n.id)))
      .map(([a, b]) => [inUnit.get(a)!, inUnit.get(b)!])
      .filter(([a, b]) => a !== b)
      .map(([a, b]) => `${a}|${b}`),
  )].map((k) => k.split("|") as [string, string]);

  const taken: Box[] = [...blocked];
  const fixed: Box[] = [];
  const corner: Record<string, Spot> = {};

  for (const unit of units) {
    if (!unit.at) continue;
    corner[unit.id] = unit.at;
    fixed.push({ ...unit.at, w: unit.w, h: unit.h });
    taken.push({ ...unit.at, w: unit.w, h: unit.h });
  }

  const loose = units.filter((u) => !u.at);

  if (loose.length && axis !== "free") {
    const boxes = loose.map((u) => ({ id: u.id, w: u.w, h: u.h }));
    const spots = axis === "grid"
      ? gridded(boxes)
      : rankedBoxes(boxes, links.filter(([a, b]) =>
          !corner[a] && !corner[b]), axis);

    // Slid clear of anything already down, as a block, so an arrangement set on
    // a layer somebody has hand-placed sits beside that work rather than in it.
    const shift = clearance(spots, loose, fixed, axis === "right" ? "y" : "x");
    for (const unit of loose) {
      corner[unit.id] = { x: spots[unit.id].x + shift.x, y: spots[unit.id].y + shift.y };
    }
  } else {
    const step = { x: LEAF.w + GAP, y: LEAF.h + GAP };
    const rounds = units.length + taken.length + 2;

    for (const unit of neighbourly(loose, links)) {
      for (const point of rings(step, rounds)) {
        const box = { ...middled({ x: point.x - unit.w / 2, y: point.y - unit.h / 2 },
                                 { w: unit.w, h: unit.h }), w: unit.w, h: unit.h };
        if (taken.some((other) => collides(box, other))) continue;

        corner[unit.id] = { x: box.x, y: box.y };
        taken.push(box);
        break;
      }

      corner[unit.id] ??= { x: 0, y: 0 };
    }
  }

  const spots: Record<string, Spot> = {};
  for (const unit of units) {
    const at = corner[unit.id] ?? { x: 0, y: 0 };
    for (const id of unit.ids) {
      spots[id] = { x: at.x + unit.offsets[id].x, y: at.y + unit.offsets[id].y };
    }
  }

  return spots;
}

/** How far a fresh arrangement has to move across itself to clear what is
 *  already on the layer. */
function clearance(spots: Record<string, Spot>, units: Unit[], taken: Box[],
                   across: "x" | "y"): Spot {
  const off = { x: 0, y: 0 };
  if (!taken.length) return off;

  const step = (across === "y" ? LEAF.h : LEAF.w) + GAP;

  for (let tries = 0; tries <= units.length + taken.length; tries += 1) {
    const shift = tries * step;
    const hits = units.some((unit) => {
      const box = { ...spots[unit.id], w: unit.w, h: unit.h };
      box[across] += shift;

      return taken.some((other) => collides(box, other));
    });

    if (!hits) return { ...off, [across]: shift };
  }

  return off;
}
