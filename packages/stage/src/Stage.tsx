/** The working area: turns canvas gestures into action names. */

import { useEffect, useState } from "react";
import type { Act, Args, Graph, Spot } from "@mnd/core";
import { is_grid, is_header } from "@mnd/core";

/** One named menu entry; the shape the explorer's menu agrees on. */
export type Entry = { name: string; label?: string; args?: Args };
import { FlowView, type Adjust, type Gesture, type Landing } from "./Flow";
import { Icon } from "@mnd/theme";
import { box_of, clear_of, holds, swept_cells, BLOCK, CELL, type Scene } from "@mnd/views";

export type { Adjust, Landing };

export type StageProps = {
  scene: Scene;
  graph: Graph;
  picked: readonly string[];
  onAct: Act;
  onAdjust?: (adjust: Adjust) => void;
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
  /** What the app is saying. One strip, over the drawing. */
  said?: string | null;
  onSaid?: () => void;
  /** Whether the backdrop rules the canvas into cells. */
  lattice?: boolean;
  /** Whether the open layer's frame is drawn. */
  frame?: boolean;
  /** What a right drag draws: which module, which way it points, and which pinned definition it
   *  names. */
  module?: string;
  dir?: string;
  type?: string;
  /** What another surface is pointing at, drawn in the hover look. */
  lit?: readonly string[];
};

/** What has no inside to open. */
const INERT = ["group", "grid", "note"];

/** What a seated block offers for heading a line. */
function header_offers(id: string, graph: Graph): Entry[] {
  const b = graph.blocks[id];
  if (!b?.cell || !b.group || !is_grid(graph, b.group)) return [];
  return is_header(b)
    ? [{ name: "header", label: "demote", args: { clear: "yes" } }]
    : [{ name: "header", label: "promote", args: {} }];
}

/** What a card's menu lists besides the shared box actions. */
function box_offers(id: string, graph: Graph): readonly (string | Entry)[] {
  const base: (string | Entry)[] = [
    { name: "rename", label: "rename block" },
    "open", "interface", "note", { name: "save_def", label: "save definition" }];
  return [...base, ...header_offers(id, graph),
          "leave", { name: "delete", label: "delete block" }];
}

/** What a run offers about its direction. */
function route_offers(id: string, graph: Graph): Entry[] {
  const dir = graph.edges[id]?.dir ?? "none";
  if (dir === "none") {
    return [{ name: "direct", label: "add direction", args: { dir: "forward" } }];
  }
  return [
    ...(dir === "both" ? [] : [{ name: "flip", label: "flip direction" }]),
    { name: "direct", label: "remove direction", args: { dir: "none" } },
  ];
}

/** A run's menu. */
function wire_offers(id: string, graph: Graph): readonly (string | Entry)[] {
  return [{ name: "rename", label: "rename relation" },
          ...route_offers(id, graph),
          /** The line names itself, so `interface` promotes its ends. */
          { name: "interface", label: "promote both ends",
            args: { edge: id, end: "both" } },
          "note", { name: "delete", label: "delete relation" }];
}

/** What the right button offers for this gesture — not everything the registry could act on. */
function list_for(g: Gesture, scene: Scene, graph: Graph,
                  offers: Partial<Record<Gesture["kind"], readonly (string | Entry)[]>>)
    : readonly (string | Entry)[] | undefined {
  if (g.kind === "brim" && g.on) {
    const n = scene.nodes.find((x) => x.id === g.on);
    /** Fill is a grid's: a boundary has no cells to fill. */
    if (holds(n)) {
      return n?.type === "grid" ? offers.band
        : offers.band?.filter((e) => (typeof e === "string" ? e : e.name) !== "fill");
    }
    return box_offers(g.on, graph);
  }
  if (g.kind === "box" && g.on) return box_offers(g.on, graph);
  /** A run and its name are one subject. */
  if ((g.kind === "route" || g.kind === "name") && g.on && graph.edges[g.on]) {
    return wire_offers(g.on, graph);
  }
  return offers[g.kind];
}

export function Stage({ scene, graph, picked, cells, onAct, onAdjust, onPick, onPickCells, onDrop,
                       menu, said, onSaid, lattice, frame, module, dir, type, lit = [] }: StageProps) {
  /** What a right drag or a chain draws, as the rail set it. */
  const drawing = { ...(module ? { module } : {}), dir: dir ?? "none",
                    ...(type ? { type } : {}) };
  /** The name being typed on the drawing, as the thing it names. */
  const [naming, set_naming] = useState<string | null>(null);
  /** Nothing typed survives a layer change. */
  useEffect(() => set_naming(null), [scene.layer]);
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
      /** Escape closes the nearest thing. */
      else if (e.key === "Escape") {
        if (at) { set_at(null); return; }
        onPick([]);
        onSaid?.();
      }
      /** Enter opens the one picked card, unless it has no inside. */
      else if (e.key === "Enter" && one && !scene.edges.some((r) => r.id === one)
               && !INERT.includes(scene.nodes.find((n) => n.id === one)?.type ?? "")) {
        onAct("open", { id: one });
      }
      else if (e.key === "F2" && one) set_naming(one);
      /** Everything picked, in one step. */
      else if ((e.key === "Delete" || e.key === "Backspace") && picked.length) {
        onAct("delete", { ids: [...picked] });
      }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && picked.length) {
        e.preventDefault();
        onAct("group", { members: [...picked] });
      }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        onPick(scene.nodes.filter((n) => n.selectable !== false).map((n) => n.id));
      }
      else return;
    };
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [scene, picked, at, onAct, onPick, onSaid]);

  /** What the right button offers, per thing. */
  const OFFERS: Partial<Record<Gesture["kind"], readonly (string | Entry)[]>> = {
    name: [{ name: "rename", label: "rename block" },
           { name: "delete", label: "delete block" }],
    /** A note is a remark, not a block. */
    note: [{ name: "rename", label: "rename note" }, { name: "save_def", label: "save definition" },
           { name: "delete", label: "delete note" }],
    box: ["rename", "open", "interface", "note", { name: "save_def", label: "save definition" }, "leave", "delete"],
    seat: ["rename", "open", "interface", "note", { name: "save_def", label: "save definition" }, "delete"],
    /** A group and a grid write their name on the frame when told to. */
    band: [{ name: "rename", label: "rename group" }, "fill",
           { name: "chain", args: drawing }, { name: "save_def", label: "save definition" },
           { name: "delete", label: "delete group" }],
    /** A cell offers what can be done to the lattice there. */
    cell: [
      "merge",
      { name: "insert", label: "insert row", args: { way: "row" } },
      { name: "insert", label: "insert column", args: { way: "col" } },
      { name: "remove", label: "remove row", args: { way: "row" } },
      { name: "remove", label: "remove column", args: { way: "col" } },
      { name: "fill", label: "fill grid" },
      { name: "chain", label: "chain grid", args: drawing },
      { name: "transpose", label: "transpose grid" },
    ],
    /** Replaced per run by `wire_offers`. */
    route: ["rename", "note", "delete"],
    /** A grip is the one place that knows both ends. */
    anchor: [{ name: "interface", label: "promote this end" },
             { name: "interface", label: "promote both ends", args: { end: "both" } },
             { name: "rename", label: "rename relation" },
             { name: "delete", label: "delete relation" }],
    /** The room's wall offers what a card's border does. */
    frame: ["rename", "open", "interface", "note", { name: "save_def", label: "save definition" }, "leave", "delete"],
  };

  /** What a selection of several offers. */
  const MANY: readonly (string | Entry)[] = ["group", "leave", "delete"];

  const gesture = (g: Gesture) => {
    /** Left clicks on cells are the lattice's own. */
    if (g.button === "left" && g.kind === "cell") return;
    if (g.button === "left" && g.count === 1) onPickCells?.([]);
    if (g.button === "left") {
      if (g.count === 2) {
        /** Two clicks rename a name or a note, open a card, reveal a reference, or leave. */
        if (g.on && g.kind === "title") set_naming(g.on);
        else if (g.on && g.kind === "name") set_naming(g.on);
        else if (g.on && (g.kind === "box" || g.kind === "seat" || g.kind === "brim")) {
          const stands = scene.nodes.find((n) => n.id === g.on)
            ?.data.marks.includes("reference");
          onAct(stands ? "reveal" : "open", { id: g.on });
        }
        else if (g.on && g.kind === "note") set_naming(g.on);
        else if (g.kind === "frame") onAct("open");
        else if (!g.on) onAct("open");
      }
      /** A single left click is a selection, reported by the canvas. */
      return;
    }
    /** Right-click on empty ground makes a block; elsewhere it opens the menu. */
    if (!g.on || g.kind === "empty") {
      const name = prompt("name it");
      if (name !== null) onAct("create", { name, spot: made_at(scene, g.at) });
      return;
    }
    /** A right-click inside the picked cells is about them. */
    if (g.kind === "cell" && g.given) {
      const at = g.given as Spot;
      const among = cells?.some((c) => c.group === at.group && c.r === at.r && c.c === at.c);
      if (!among) onPickCells?.([at]);
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
    <section className="stage">
      <Crumbs trail={scene.trail} onAct={onAct} />
      {lit.length ? <style>{lit_rules(lit)}</style> : null}
      <FlowView
        scene={scene}
        picked={picked}
        cells={cells}
        onPickCells={onPickCells}
        lattice={lattice}
        {...(frame === undefined ? {} : { frame })}
        naming={naming}
        onNamed={(label) => {
          const id = naming;
          set_naming(null);
          if (id && label !== null) onAct("rename", { id, name: label });
        }}
        onGesture={gesture}
        onPick={onPick}
        onDrop={onDrop}
        onRelate={(from, to, walls) => onAct("relate", { from, to, ...walls, ...drawing })}
        /** A right drag across empty ground draws a grid, seating what it covered. */
        onSweep={(box) => onAct("group", swept(scene, box))}
        onAdjust={(adjust) => {
          /** A card dropped on a card is a move; anything else goes to the app. */
          if (adjust.kind === "move" && adjust.over && adjust.over !== adjust.on) {
            onAct("move", { id: adjust.on, parent: adjust.over });
            return;
          }
          onAdjust?.(adjust);
        }}
        said={said ? (
          <>
            <span>{said}</span>
            <button onClick={onSaid} title="dismiss"><Icon name="remove" /></button>
          </>
        ) : null}
      />
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

/** The hover look, as a style rule so lighting never rebuilds the arrays. */
function lit_rules(ids: readonly string[]): string {
  const at = (kind: string, inner: string) =>
    ids.map((id) => `.react-flow [data-testid="rf__${kind}-${CSS.escape(id)}"]${inner}`).join(",");
  return [`${at("node", "")} { outline: 2px solid var(--accent); outline-offset: 2px; }`,
          `${at("edge", " path")} { stroke: var(--accent) !important; opacity: 1; }`].join("\n");
}

function Crumbs({ trail, onAct }: { trail: Scene["trail"]; onAct: Act }) {
  const shown = trail.length > 4 ? [trail[0]!, { id: "…", label: "…" }, ...trail.slice(-2)] : trail;
  return (
    <nav className="crumbs">
      {shown.map((t, i) => (
        <span key={t.id + i}>
          {i > 0 ? <b> / </b> : null}
          {t.id === "…"
            ? <span className="elided" title={trail.map((x) => x.label).join(" / ")}>…</span>
            : <button onClick={() => onAct("open", { id: t.id })}>{t.label}</button>}
        </span>
      ))}
      {trail.length > 1 ? <button className="up" title="up one layer"
                                  onClick={() => onAct("open")}><Icon name="up" /></button> : null}
    </nav>
  );
}
