/** The working area: turns canvas gestures into action names. */

import { useEffect, useRef, useState } from "react";
import type { Act, Args, Graph, Spot } from "@mnd/core";
import { dir_of } from "@mnd/core";

/** One named menu entry; the shape the explorer's menu agrees on. */
export type Entry = { name: string; label?: string; args?: Args };
import { FlowView, type Adjust, type Gesture, type Landing } from "./Flow";
import { Legend, type Corner } from "./Legend";
import { moves_of, type Move } from "./moves";
import { cell_key } from "./nodes";
import { Icon } from "@mnd/theme";
import { area_under, box_of, clear_of, holds, swept_cells, towards, BLOCK, CELL,
         type Scene } from "@mnd/views";
import { Crumbs } from "./Crumbs";
import { Hover } from "./Hover";

export type { Adjust, Landing, Move };

export type StageProps = {
  scene: Scene;
  graph: Graph;
  picked: readonly string[];
  onAct: Act;
  /** The writes one canvas adjustment comes to, for the host to run as one step. */
  onAdjust?: (moves: readonly Move[]) => void;
  onPick: (ids: string[]) => void;
  /** Which cells are picked, beside the ids. */
  cells?: readonly Spot[];
  onPickCells?: (cells: readonly Spot[]) => void;
  /** A row dropped from the tree onto the drawing — a block, or a definition out of the vocabulary. */
  onDrop?: (id: string, at: { x: number; y: number }, land: Landing) => void;
  /** The offered-action list, where the host has one. */
  menu?: (at: { x: number; y: number }, on: string | null, shut: () => void,
          spot: { x: number; y: number }, only: readonly (string | Entry)[] | undefined,
          /** What the gesture already knew, for actions that need more than an id. */
          given?: Record<string, unknown>) => React.ReactNode;
  /** What the crumbs start from: a host's section, drawn whole on a click. */
  head?: { label: string; onOpen: () => void } | null;
  /** What to say where the drawing has nothing in it: why, and what is there instead. */
  empty?: string | null;
  /** What the app is saying. One strip, over the drawing. */
  said?: string | null;
  onSaid?: () => void;
  /** Whether the backdrop rules the canvas into cells. */
  lattice?: boolean;
  /** Whether the open layer's frame is drawn. */
  frame?: boolean;
  /** Whether the key to what this layer draws sits in its corner, and which corner that is. */
  legend?: boolean;
  corner?: Corner;
  /** What a right drag draws: which module, which way it points, and which definition it names. */
  module?: string;
  dir?: string;
  type?: string;
  /** What another surface is pointing at, drawn in the hover look. */
  lit?: readonly string[];
  /** What the selection touches elsewhere: lit in the relation colour. */
  touched?: readonly string[];
  /** The drawing read down the page: fitted to its width, scrolled rather than zoomed, the camera
   *  following `focus`. */
  scroll?: boolean;
  focus?: string | null;
  /** The most a scrolled drawing magnifies. */
  most?: number | null;
  /** Whether the drawing is a layer entered from a map: Escape leaves it for the map. */
  entered?: boolean;
  /** Counted up by every open: a new count flies to the focus, the same one or not. */
  opened?: number;
  stop?: { x: number; y: number; w: number; h: number; scale?: number } | null;

  /** Whether the canvas has the keys. Undo and redo answer wherever the keys are. */
  keys?: boolean;
  /** **Whether the drawing may be edited**: a map or a registry may not, so no menu, key,
   *  rename, drop or line drawing edits through it. Picking and reading still work. */
  editable?: boolean;
};


/** What a card's menu lists besides the shared box actions: open only where it has a drawing of
 *  its own, a part made in it — the way into an empty block — and a label tied to it. */
function box_offers(id: string, opens: boolean): readonly (string | Entry)[] {
  return [{ name: "rename", label: "rename block" }, ...(opens ? ["open"] : []),
          { name: "create", label: "add a part", args: { parent: id } }, "interface", "note",
          { name: "create", label: "label", args: { type: "label", from: id } },
          { name: "delete", label: "delete block" }];
}

/** The arrow keys, as the way each walks between rooms. */
const WAYS: Record<string, "left" | "right" | "up" | "down"> = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
};

/** Adding a line to a grid: at the picked cell's line, else at its end. */

const LINES: readonly Entry[] = [
  { name: "insert", label: "insert row", args: { way: "row" } },
  { name: "insert", label: "insert column", args: { way: "col" } },
];

/** What a row or column offers from its header: a block made in that header, which is a cell
 *  too, then lines beside it and taking it away. */
function line_offers(given: Record<string, unknown>): Entry[] {
  const group = String(given["group"]);
  const i = Number(given["i"]);
  const row = given["way"] === "row";
  const way = row ? "row" : "col";
  const [before, after, noun] = row ? ["above", "below", "row"] : ["left", "right", "column"];
  const cell = typeof given["r"] === "number"
    ? [{ name: "create", label: "new block here",
         args: { parent: group, at: `${String(given["r"])},${String(given["c"])}` } }]
    : [];
  return [
    ...cell,
    { name: "insert", label: `insert ${noun} ${before}`, args: { group, way, at: i } },
    { name: "insert", label: `insert ${noun} ${after}`, args: { group, way, at: i + 1 } },
    { name: "remove", label: `remove ${noun}`, args: { group, way, at: i } },
  ];
}

/** What a run offers about its direction. */
function route_offers(id: string, graph: Graph): Entry[] {
  const dir = graph.edges[id] ? dir_of(graph, id) : "none";
  if (dir === "none") {
    return [{ name: "direct", label: "add direction", args: { dir: "forward" } }];
  }
  return [
    ...(dir === "both" ? [] : [{ name: "flip", label: "flip direction" }]),
    { name: "direct", label: "remove direction", args: { dir: "none" } },
  ];
}

/** The ends of a run that meet no interface yet, and so may be promoted. */
function bare_ends(id: string, graph: Graph): ("from" | "to")[] {
  const e = graph.edges[id];
  if (!e) return [];
  return (["from", "to"] as const).filter((end) => !(end === "from" ? e.fromPort : e.toPort));
}

/** Promoting what is bare: both ends, one, or nothing when both are interfaces already. */
function promote_offers(id: string, graph: Graph, here?: "from" | "to"): Entry[] {
  const bare = bare_ends(id, graph);
  const out: Entry[] = [];
  if (here && bare.includes(here)) {
    out.push({ name: "interface", label: "promote this end", args: { edge: id, end: here } });
  }
  if (bare.length === 2) {
    out.push({ name: "interface", label: "promote both ends", args: { edge: id, end: "both" } });
  } else if (bare.length === 1 && !here) {
    out.push({ name: "interface", label: "promote end", args: { edge: id, end: bare[0]! } });
  }
  return out;
}

/** A run's menu. */
function wire_offers(id: string, graph: Graph): readonly (string | Entry)[] {
  return [{ name: "rename", label: "rename relation" },
          ...route_offers(id, graph),
          ...promote_offers(id, graph),
          { name: "delete", label: "delete relation" }];
}

/** What the right button offers for this gesture — not everything the registry could act on. */
function list_for(g: Gesture, scene: Scene, graph: Graph,
                  offers: Partial<Record<Gesture["kind"], readonly (string | Entry)[]>>)
    : readonly (string | Entry)[] | undefined {
  if (g.kind === "brim" && g.on) {
    const n = scene.nodes.find((x) => x.id === g.on);
    /** Fill and lines are a grid's: a boundary has no cells. */
    /** A grid opens onto its lattice; a group or a region is drawn in place, so never opens. */
    if (holds(n)) {
      return n?.type === "grid" ? [...(offers.band ?? []), ...LINES]
        : offers.band?.filter((e) => !["fill", "open"].includes(typeof e === "string" ? e : e.name));
    }
    return box_offers(g.on, !!n?.data.opens);
  }
  if (g.kind === "box" && g.on) {
    return box_offers(g.on, !!scene.nodes.find((x) => x.id === g.on)?.data.opens);
  }
  /** A cell offers what can be done to the lattice there. */
  if (g.kind === "cell" && g.on) return offers.cell;
  if (g.kind === "line" && g.given) return line_offers(g.given);
  /** A run and its name are one subject. */
  if ((g.kind === "route" || g.kind === "name") && g.on && graph.edges[g.on]) {
    return wire_offers(g.on, graph);
  }
  /** A grip knows which end it is. */
  if (g.kind === "anchor" && g.on && graph.edges[g.on]) {
    return [...promote_offers(g.on, graph, g.given?.["end"] as "from" | "to"),
            { name: "rename", label: "rename relation" },
            { name: "delete", label: "delete relation" }];
  }
  return offers[g.kind];
}

export function Stage({ scene, graph, picked, cells, onAct, onAdjust, onPick, onPickCells, onDrop,
                       menu, said, onSaid, head, empty, lattice, frame, legend, corner, module,
                       dir, type, lit = [], touched = [], scroll = false, focus = null, most = null,
                       entered = false, stop = null, opened = 0,
                       keys = true, editable = true }: StageProps) {
  /** What a right drag or a chain draws, as the rail set it. */
  const drawing = { ...(module ? { module } : {}), dir: dir ?? "none",
                    ...(type ? { type } : {}) };
  /** The name being typed on the drawing, as the thing it names, with the cell when it is a
   *  cell's text: one state, so a rename never lands as a cell's text. */
  const [typing, set_typing] = useState<{ id: string; cell?: Spot } | null>(null);
  const naming = typing?.id ?? null;
  const set_naming = (id: string) => set_typing({ id });
  /** Nothing typed survives a layer change. */
  useEffect(() => set_typing(null), [scene.layer]);
  /** The stage itself, which a map's hover card watches. */
  const host = useRef<HTMLElement>(null);
  const [at, set_at] = useState<
    { x: number; y: number; on: string | null; spot: { x: number; y: number };
      only?: readonly (string | Entry)[]; given?: Record<string, unknown> } | null>(null);
  /** The global keys; a field being typed in answers for itself. */
  useEffect(() => {
    const on_key = (e: KeyboardEvent) => {
      /** A field being typed in answers for itself. */
      const el = e.target as HTMLElement | null;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(el?.tagName ?? "")
        || el?.isContentEditable === true;
      if (typing) return;
      const one = picked.length === 1 ? picked[0]! : null;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        onAct(e.shiftKey ? "redo" : "undo");
      }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        onAct("redo");
      }
      /** Everything else is the canvas's only while it has the keys. */
      else if (!keys) return;
      /** Escape closes the nearest thing. */
      else if (e.key === "Escape") {
        if (at) { set_at(null); return; }
        /** Entered, Esc leaves for the map, whatever is picked. */
        if (entered) { onAct("widen"); return; }
        onPick([]);
        onSaid?.();
      }
      /** On a map, Enter reads what is in focus. Elsewhere it reads the one picked card;
       *  navigation says where that goes. */
      else if (e.key === "Enter" && scene.areas) onAct("read");
      else if (e.key === "Enter" && one && !scene.edges.some((r) => r.id === one)) {
        onAct("read", { id: one });
      }
      /** Renaming, deleting and grouping edit: never a drawing that may not be edited. */
      else if (e.key === "F2" && one && editable) set_naming(one);
      /** On a map the arrows walk to the nearest area that way, as a click goes to it. */
      else if (e.key in WAYS && scene.areas && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const from = picked.find((id) => scene.areas!.some((a) => a.id === id))
          ?? scene.layer ?? "";
        const next = towards(scene.areas, from, WAYS[e.key]!);
        if (!next) return;
        e.preventDefault();
        onAct("open", { id: next.id });
        onPick([next.id]);
      }
      /** Everything picked, in one step. */
      else if ((e.key === "Delete" || e.key === "Backspace") && picked.length && editable) {
        onAct("delete", { ids: [...picked] });
      }
      /** Ctrl+G groups what is picked; with Shift, it makes a room of it. */
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && picked.length
               && editable) {
        e.preventDefault();
        onAct(e.shiftKey ? "room" : "group", { members: [...picked] });
      }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        onPick(scene.nodes.filter((n) => n.selectable !== false).map((n) => n.id));
      }
      else return;
    };
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [scene, picked, at, onAct, onPick, onSaid, entered, editable]);

  /** What the right button offers, per thing. */
  const OFFERS: Partial<Record<Gesture["kind"], readonly (string | Entry)[]>> = {
    name: [{ name: "rename", label: "rename block" },
           { name: "delete", label: "delete block" }],
    /** A note is a remark, not a block. */
    note: [{ name: "rename", label: "rename note" },
           { name: "delete", label: "delete note" }],
    /** An interface opens nothing and holds no interfaces; a placed one may place itself again. */
    seat: ["rename", { name: "port", label: "place itself", args: { free: "true" } }, "note",
           "delete"],
    /** A group and a grid write their name on the frame when told to. */
    band: [{ name: "rename", label: "rename group" }, "open", "note", "fill",
           { name: "chain", args: drawing }, { name: "room", label: "turn into room" },
           { name: "delete", label: "delete group" }],
    /** A cell offers what can be done to the lattice there. */
    cell: [
      { name: "label", label: "label cell" },
      "merge",
      ...LINES,
      { name: "remove", label: "remove row", args: { way: "row" } },
      { name: "remove", label: "remove column", args: { way: "col" } },
      { name: "fill", label: "fill grid" },
      { name: "chain", label: "chain grid", args: drawing },
      { name: "transpose", label: "transpose grid" },
    ],
    /** Replaced per run by `wire_offers`, and per grip by `promote_offers`. */
    route: ["rename", "delete"],
    /** The room's wall offers what a card's border does, and a region across the layer. */
    frame: ["rename", "open", "interface", "note",
            { name: "group", label: "new region", args: { type: "region", members: [] } },
            "delete"],
  };

  /** Types a cell's text in place, starting from what it says now. */
  const label_cell = (at: Spot) => set_typing({ id: cell_key(at), cell: at });

  /** What a selection of several offers. */
  const MANY: readonly (string | Entry)[] = ["group",
    { name: "group", label: "region", args: { type: "region" } },
    { name: "room", label: "make room" }, "delete"];

  const gesture = (g: Gesture) => {
    /** A tab picks its line itself; two clicks on a header write its text, as on any cell. */
    if (g.button === "left" && g.kind === "line") {
      const at = g.given as { group?: string; r?: number; c?: number } | undefined;
      if (g.count === 2 && at?.group && at.r !== undefined && at.c !== undefined) {
        label_cell({ group: at.group, r: at.r, c: at.c });
      }
      return;
    }
    /** Left clicks on cells are the lattice's own; two write the cell's text. */
    if (g.button === "left" && g.kind === "cell") {
      if (g.count === 2 && g.given) label_cell(g.given as Spot);
      return;
    }
    if (g.button === "left" && g.count === 1) onPickCells?.([]);
    /** **A map is read, never built on**: a click on a chip or a box goes to it; a click on a
     *  tile in a chip picks its block, to be read in the tray. Two read what was clicked — a tile
     *  as inside its chip — and navigation says where that goes (core's `read_at`). */
    if (scene.areas) {
      const tile = typeof g.given?.["tile"] === "string" ? g.given["tile"] as string : null;
      if (g.button === "left" && g.count === 1 && tile) {
        onPick([tile]);
        return;
      }
      const area = g.on && scene.areas.some((a) => a.id === g.on) ? g.on
        : area_under(scene.areas, g.at)?.id ?? null;
      const on = tile ?? area;
      if (g.button !== "left" || !on) return;
      if (g.count === 2) { onAct("read", { id: on, ...(tile ? { inner: true } : {}) }); return; }
      onAct("open", { id: on });
      onPick([on]);
      return;
    }
    if (g.button === "left") {
      if (g.count === 2) {
        /** Two clicks rename a name or a note, read a card, or leave. Reading a stand-in enters
         *  what it stands for, where that opens; **it never jumps** to where that is kept. */
        if (g.on && editable && (g.kind === "title" || g.kind === "name" || g.kind === "note")) {
          set_naming(g.on);
        }
        else if (g.on && (g.kind === "box" || g.kind === "brim")) onAct("read", { id: g.on });
        /** Two clicks on the frame or outside it leave for the layer above. */
        else if (g.kind === "frame" || !g.on) onAct("open");
      }
      /** A single left click is a selection, reported by the canvas. */
      return;
    }
    /** The right button makes and edits: never on a drawing that may not be edited. */
    if (!editable) return;
    /** Right-click on empty ground makes a block; elsewhere it opens the menu. */
    if (!g.on || g.kind === "empty") {
      const name = prompt("name it");
      if (name === null) return;
      onAct("create", { name, spot: made_at(scene, g.at) });
      return;
    }
    /** A right-click on a cell makes a block in it; inside the picked cells, it is about them. */
    if (g.kind === "cell" && g.given) {
      const at = g.given as Spot;
      const among = cells?.some((c) => c.group === at.group && c.r === at.r && c.c === at.c);
      if (!among) {
        const name = prompt("name it");
        if (name !== null) {
          onAct("create", { name, parent: at.group, at: `${at.r},${at.c}` });
        }
        return;
      }
    }
    if (menu) {
      const among = picked.length > 1 && g.on !== null && picked.includes(g.on);
      const only = among ? MANY : list_for(g, scene, graph, OFFERS);
      set_at({ ...g.screen, on: g.on, spot: made_at(scene, g.at),
               only,
               ...(g.given ? { given: g.given } : {}) });
    }
  };

  return (
    <section className="stage" ref={host}>
      <Crumbs trail={scene.trail} head={head ?? null} onAct={onAct} />
      {empty ? <p className="empty">{empty}</p> : null}
      {/* **A map lights only what is picked**: a chip, a box or a tile. A layer also lights what
          is hovered, other appearances and what the selection touches. */}
      {scene.areas ? <style>{tile_rules(picked)}</style> : null}
      {!scene.areas && lit.length ? <style>{lit_rules(lit)}</style> : null}
      {!scene.areas && touched.length
        ? <style>{lit_rules(touched, "var(--s-secondary-edge)")}</style> : null}
      <FlowView
        scene={scene}
        picked={picked}
        cells={cells}
        onPickCells={onPickCells}
        lattice={lattice}
        {...(frame === undefined ? {} : { frame })}
        scroll={scroll}
        focus={focus}
        most={most}

        opened={opened}
        stop={stop}
        naming={naming}
        onNamed={(label) => {
          const was = typing;
          set_typing(null);
          if (!was || label === null) return;
          const { id, cell } = was;
          if (cell) onAct("label", { group: cell.group, at: `${cell.r},${cell.c}`, text: label });
          else onAct("rename", { id, name: label });
        }}
        onGesture={gesture}
        onPick={onPick}
        {...(editable && onDrop ? { onDrop } : {})}
        onRelate={(from, to) => { if (editable) onAct("relate", { from, to, ...drawing }); }}
        /** A right drag across empty ground draws a grid, seating what it covered. */
        onSweep={(box) => { if (editable) onAct("group", swept(scene, box)); }}
        onAdjust={(adjust) => onAdjust?.(moves_of(graph, scene, adjust))}
        said={said ? (
          <>
            <span>{said}</span>
            <button onClick={onSaid} title="dismiss"><Icon name="remove" /></button>
          </>
        ) : null}
      />
      {legend ? <Legend scene={scene} {...(corner ? { at: corner } : {})} /> : null}
      {scene.areas ? <Hover graph={graph} library={scene.map === "library"} host={host} /> : null}
      {at && menu ? menu(at, at.on, () => set_at(null), at.spot, at.only, at.given) : null}
    </section>
  );
}

/** A sweep as the grid it draws: covered cards seat into the nearest free cell. */
function swept(scene: Scene, box: { x: number; y: number; w: number; h: number }) {
  /** A corner where it was drawn, and whole cells to cover it. */
  const { x, y, rows, cols } = swept_cells(box);
  const from = { x, y };
  const taken = new Set<string>();
  const seats: { id: string; r: number; c: number }[] = [];

  const caught = scene.nodes
    .filter((n) => !holds(n) && !n.data.on && n.selectable !== false)
    .map((n) => ({ id: n.id, b: box_of(n) }))
    .filter(({ b }) => b.x + b.w > from.x && b.x < from.x + cols * CELL.w
                    && b.y + b.h > from.y && b.y < from.y + rows * CELL.h);

  for (const { id, b } of caught) {
    const want = { r: Math.round((b.y + b.h / 2 - from.y) / CELL.h - 0.5),
                   c: Math.round((b.x + b.w / 2 - from.x) / CELL.w - 0.5) };
    const at = free_cell(taken, rows, cols, want);
    if (!at) continue;
    taken.add(`${at.r},${at.c}`);
    seats.push({ id, ...at });
  }
  return { rows, cols, spot: { x, y }, members: caught.map((n) => n.id), seats };
}

/** The cell nearest the one asked for that nobody has taken. */
function free_cell(taken: ReadonlySet<string>, rows: number, cols: number,
                   want: { r: number; c: number }) {
  const held = (r: number, c: number) =>
    r < 0 || c < 0 || r >= rows || c >= cols || taken.has(`${r},${c}`);
  let best: { r: number; c: number } | null = null;
  let gap = Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (held(r, c)) continue;
      const off = Math.hypot(r - want.r, c - want.c);
      if (off < gap) { gap = off; best = { r, c }; }
    }
  }
  return best;
}

/** Where a card made here goes. */
function made_at(scene: Scene, at: { x: number; y: number }) {
  const taken = scene.nodes.filter((n) => !holds(n) && !n.data.on).map(box_of);
  return clear_of(taken, { x: at.x - BLOCK.w / 2, y: at.y - BLOCK.h / 2 }, BLOCK);
}

/** A picked tile's look on a map, as a style rule, as `lit_rules`. */
function tile_rules(ids: readonly string[]): string {
  if (!ids.length) return "";
  const at = ids.map((id) => `.mnd-chip-tile[data-tile="${CSS.escape(id)}"]`).join(",");
  return `${at} { box-shadow: inset 0 0 0 calc(2px / var(--zoom, 1)) var(--accent);
                  background: color-mix(in oklch, var(--accent) 14%, var(--surface)); }`;
}

/** The hover look, as a style rule so lighting never rebuilds the arrays. */
export function lit_rules(ids: readonly string[], colour = "var(--accent)"): string {
  const at = (kind: string, inner: string) =>
    ids.map((id) => `.react-flow [data-testid="rf__${kind}-${CSS.escape(id)}"]${inner}`).join(",");
  /** Two pixels on screen at any zoom: a shadow, since a border or outline under a pixel is
   *  drawn at one before the zoom magnifies it. */
  return [`${at("node", "")} { box-shadow: 0 0 0 calc(2px / var(--zoom, 1)) ${colour}; }`,
          `${at("edge", " path")} { stroke: ${colour} !important; opacity: 1; }`].join("\n");
}
