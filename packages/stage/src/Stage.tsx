/** The working area, and the one thing that never yields.
 *
 *  It hosts one view at a time and turns a gesture into an action name. Like
 *  the explorer it is a pure function of its props: it holds nothing, and every
 *  gesture leaves as a name somebody else runs.
 *
 *  The left button works what is already there; the right button offers what
 *  can be made here. A relationship is the one thing made with the left button,
 *  because it is drawn between two cards that already exist and React Flow will
 *  only start a connection on that button. */

import { useEffect, useState } from "react";
import type { Act, Args, Spot } from "@mnd/core";

/** One named entry a menu draws: an action, optionally with an argument filled
 *  and a word of its own. **Repeated here rather than imported** — the stage
 *  does not know the explorer exists, and this is the shape they agree on. */
export type Entry = { name: string; label?: string; args?: Args };
import { FlowView, type Adjust, type Gesture } from "./Flow";
import { Icon } from "@mnd/theme";
import { box_of, clear_of, swept_cells, BLOCK, CELL, type Scene } from "@mnd/views";

export type { Adjust };

export type StageProps = {
  scene: Scene;
  picked: readonly string[];
  onAct: Act;
  onAdjust?: (adjust: Adjust) => void;
  onPick: (ids: string[]) => void;
  /** Which cells are picked. **Beside the ids, never among them** — a cell has
   *  no id, so it is named by the group it is in and where. */
  cells?: readonly Spot[];
  onPickCells?: (cells: readonly Spot[]) => void;
  /** A row dropped from the tree onto the drawing. */
  onDrop?: (id: string, at: { x: number; y: number }) => void;
  /** The offered-action list, where the host has one. **Given rather than
   *  built**: the canvas and the tree offer the same actions, so the same menu
   *  serves both and neither package owns it.
   *
   *  `at` is where on the page to open it and `spot` is where on the drawing it
   *  was opened — two answers because they are two questions, and an action
   *  that puts something somewhere needs the second. */
  menu?: (at: { x: number; y: number }, on: string | null, shut: () => void,
          spot: { x: number; y: number }, only: readonly (string | Entry)[] | undefined,
          /** What the gesture already knew, for actions that need more than an
           *  id. A right-click on a relationship's end knows which end and
           *  whose border — nothing downstream could work either out. */
          given?: Record<string, unknown>) => React.ReactNode;
  /** What the app is saying. One strip, over the drawing. */
  said?: string | null;
  onSaid?: () => void;
  /** Whether relationships are read with curves rather than right angles. */
  curved?: boolean;
  /** Whether the backdrop rules the canvas into cells. */
  lattice?: boolean;
  /** Which way a right drag draws a line. **The rail picked it and the stage
   *  passes it on** — what a new relationship is is the model's, so it goes
   *  through the action like everything else. */
  module?: string;
  /** A count that goes up when every line on this layer is asked to run
   *  straight. **The rail names the verb and the canvas has the geometry**, so
   *  what crosses is the app saying *again* and nothing about any line. */
  straighten?: number;
};

/** What has no inside to open. A boundary is its members' bounds and a note is
 *  a remark; neither is somewhere to go. */
const INERT = ["group", "note"];

export function Stage({ scene, picked, cells, onAct, onAdjust, onPick, onPickCells, onDrop,
                       menu, said, onSaid, curved, lattice, straighten, module }: StageProps) {
  /** The name being typed on the drawing, as the thing it names. **Held here
   *  because renaming is an action** — the canvas draws the field and says
   *  what was typed; what that means is settled in the one place every other
   *  gesture is. */
  const [naming, set_naming] = useState<string | null>(null);
  /** Nothing typed survives going somewhere else: the card it was open on is
   *  not on this layer. */
  useEffect(() => set_naming(null), [scene.layer]);
  const [at, set_at] = useState<
    { x: number; y: number; on: string | null; spot: { x: number; y: number };
      only?: readonly (string | Entry)[]; given?: Record<string, unknown> } | null>(null);
  /** The shell owns the global keys; a view module owns the rest.
   *
   *  **Shorter than it was.** Selection, the sweep and the multi-select
   *  modifier are the canvas's now; what is left is the handful that mean
   *  something to the *log* rather than to the drawing. */
  useEffect(() => {
    const on_key = (e: KeyboardEvent) => {
      /** **A field being typed in answers for itself.** A name is typed in
       *  place now, which is a span rather than an input — read as the canvas's
       *  own keys, Delete deleted the card being renamed. */
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === "INPUT" || el?.isContentEditable === true;
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
      /** **Escape closes the nearest thing.** An offered list is open in front
       *  of the drawing, so it goes first — clearing the selection under it is
       *  how a menu raised on four cards left one card grouped. */
      else if (e.key === "Escape") {
        if (at) { set_at(null); return; }
        onPick([]);
        onSaid?.();
      }
      /** **Enter goes in.** Descending had one way in and it was a double
       *  click, which is the same gesture as picking a card twice quickly —
       *  so the keyboard says it too, and so does the toolbar on the card. */
      /** A boundary has no inside, and neither has a note — so there is
       *  nothing for either to go into. */
      else if (e.key === "Enter" && one && !scene.edges.some((r) => r.id === one)
               && !INERT.includes(scene.nodes.find((n) => n.id === one)?.type ?? "")) {
        onAct("open", { id: one });
      }
      else if (e.key === "F2" && one) set_naming(one);
      /** **Everything picked, in one step.** Delete asked about one thing and
       *  did nothing to a sweep of four, which is the one gesture where doing
       *  nothing looks exactly like the app having missed the key. A
       *  relationship is a thing, so it goes the same way. */
      else if ((e.key === "Delete" || e.key === "Backspace") && picked.length) {
        onAct("delete", { ids: [...picked] });
      }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && picked.length) {
        e.preventDefault();
        onAct("group", { members: [...picked] });
      }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        onPick(scene.nodes.map((n) => n.id));
      }
      else return;
    };
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [scene, picked, at, onAct, onPick, onSaid]);

  /** **What the right button offers, per thing.** Agreed rather than derived:
   *  the registry says what an action can act on, which is a wider question
   *  than what belongs on a card's menu. Empty ground has no list — right there
   *  makes a block, which is one gesture doing one thing. */
  const OFFERS: Partial<Record<Gesture["kind"], readonly (string | Entry)[]>> = {
    name: ["rename", "delete"],
    /** **A note is a remark, not a block.** There is nothing inside it to open
     *  and no wall to set an interface into; what is left is what it says and
     *  whether it stays. */
    note: ["rename", "relate", "delete"],
    box: ["rename", "open", "interface", "relate", "note", "leave", "delete"],
    seat: ["rename", "open", "interface", "relate", "note", "delete"],
    /** **A group is not a block you can go into or wire up.** What it is for is
     *  saying these belong together, so what it offers is naming it, turning it
     *  and taking it away. */
    band: ["rename", "transpose", "chain", "delete"],
    /** **A cell is an address, not a thing**, so what it offers is what can be
     *  done to the lattice at that address and nothing about a block. Insert
     *  and remove are two entries each rather than one entry and a second
     *  panel: which way is the whole of what you meant. */
    cell: [
      "merge",
      { name: "insert", label: "insert row", args: { way: "row" } },
      { name: "insert", label: "insert column", args: { way: "col" } },
      { name: "remove", label: "remove row", args: { way: "row" } },
      { name: "remove", label: "remove column", args: { way: "col" } },
    ],
    route: ["rename", "note", "delete"],
    anchor: ["rename", "delete"],
  };

  /** **What several things offer is not what one thing offers.** Rename, open
   *  and relate each name a single thing; asked of four they have no answer, so
   *  a card's list against a sweep came out empty. What is left is what a
   *  handful of blocks can be told to do together. */
  const MANY: readonly (string | Entry)[] = ["group", "leave", "delete"];

  const gesture = (g: Gesture) => {
    /** **The lattice picks its own cells** — a cell is not a node, so the
     *  library has no gesture for one and the sweep is read where it is drawn.
     *  What is left here is letting them go when something else is picked. */
    if (g.button === "left" && g.kind === "cell") return;
    if (g.button === "left" && g.count === 1) onPickCells?.([]);
    if (g.button === "left") {
      if (g.count === 2) {
        /** Two clicks navigate: into a card, or back out of the layer. The one
         *  name drawn here is the frame's, and a name is renamed where it is
         *  read — so renaming a block is done from inside it. */
        if (g.on && g.kind === "title") set_naming(g.on);
        /** **A name is renamed where it is read**, and the room's name was the
         *  only one that ever was. Every other name — a card's, a boundary's,
         *  a chip's inside a container — answers the same two clicks, so there
         *  is one gesture to learn rather than one per surface. */
        else if (g.on && g.kind === "name") set_naming(g.on);
        /** **An interface is a block, so it opens like one.** It is seated
         *  rather than placed, which is a fact about where it is drawn and not
         *  about what it is — and opened from the inside it is the one layer
         *  that shows the wall it is set into. */
        /** **A card's border opens it too.** By the time a container holds
         *  anything its face is nearly all picture and name, and both of those
         *  are names now — so the one part of a card that is always just card
         *  is its border, and two clicks on a border never meant anything
         *  else. */
        /** **A reference is opened where it lives, not where it stands.** It
         *  holds nothing, so descending into one arrived in an empty layer
         *  named after the block it stands for — or called *missing*, once
         *  that block was gone. Two clicks on a stand-in mean *show me the
         *  real one*, which is `reveal`. */
        else if (g.on && (g.kind === "box" || g.kind === "seat" || g.kind === "brim")) {
          const stands = scene.nodes.find((n) => n.id === g.on)
            ?.data.marks.includes("reference");
          onAct(stands ? "reveal" : "open", { id: g.on });
        }
        /** **A note is its text.** It has no inside to descend into, so the two
         *  clicks that go into a card edit what this one says instead — the
         *  same gesture as every other name, on the one card that is nothing
         *  but a name. */
        else if (g.on && g.kind === "note") set_naming(g.on);
        /** **Two clicks on a line align it**, which is the same letting-go the
         *  rail does to a whole layer. Descending is what two clicks mean
         *  everywhere else and a relationship has no inside, so the gesture was
         *  free — and this is the one thing there is to do to a single line. */
        else if (g.on && g.kind === "route") {
          onAdjust?.({ kind: "free-ends", edges: [g.on] });
        }
        /** **The room's edge is the band you leave by.** A rim is drawn as part
         *  of the frame, so two clicks on one reached a node and stopped there
         *  — aiming at the edge of the layer to come back out did nothing at
         *  all, which is the one place you would aim. */
        else if (g.kind === "frame") onAct("open");
        else if (!g.on) onAct("open");
      }
      /** A single left click is a selection, and the canvas reports that on its
       *  own — through `onPick`, which is the one place it lands. */
      return;
    }
    /** The right button offers what can be done here. **A menu where the host
     *  gave one**, and the prompt it replaces where it did not — so the canvas
     *  works either way and neither answer is built in. */
    /** **Empty ground makes a block.** There is nothing there to offer actions
     *  about, and a menu whose only useful entry is *create* is a click in the
     *  way of the thing you came to do. */
    /** **A border is where an interface goes**, and there is nothing else it
     *  could mean — so the right button puts one there rather than offering a
     *  list of one. A card's border and the room's wall are the same border
     *  seen from the two sides of it, so they answer the same way. */
    if ((g.kind === "brim" || g.kind === "frame") && g.given && g.on) {
      /** **Only which wall.** Where along it is the action's to decide — an
       *  interface sits in the middle of the border it is set into, and one
       *  dropped wherever the pointer happened to be read as ragged. */
      /** **A card's wall is one short border and its middle is the only place
       *  on it that reads; the room's wall runs the height of the panel, so
       *  where along it is a real choice.** So a card's interface is centred
       *  and the layer's own goes where you pointed. */
      onAct("interface", { owner: g.on, side: g.given["side"],
                           ...(g.kind === "frame" ? { at: g.given["at"] } : {}) });
      return;
    }
    if (!g.on || g.kind === "empty") {
      const label = prompt("name it");
      if (label !== null) onAct("create", { label, spot: made_at(scene, g.at) });
      return;
    }
    /** **A right-click inside the picked cells is about them.** It is about
     *  the one cell only when that cell was not already picked — otherwise
     *  merging a swept range acted on whichever cell the pointer was over. */
    if (g.kind === "cell" && g.given) {
      const at = g.given as Spot;
      const among = cells?.some((c) => c.group === at.group && c.r === at.r && c.c === at.c);
      if (!among) onPickCells?.([at]);
    }
    if (menu) {
      const among = picked.length > 1 && g.on !== null && picked.includes(g.on);
      set_at({ ...g.screen, on: g.on, spot: made_at(scene, g.at),
               only: among ? MANY : OFFERS[g.kind],
               ...(g.given ? { given: g.given } : {}) });
    }
  };

  return (
    <section className="stage">
      <Crumbs trail={scene.trail} onAct={onAct} />
      <FlowView
        scene={scene}
        picked={picked}
        cells={cells}
        onPickCells={onPickCells}
        curved={curved}
        lattice={lattice}
        straighten={straighten}
        naming={naming}
        onNamed={(label) => {
          const id = naming;
          set_naming(null);
          if (id && label !== null) onAct("rename", { id, label });
        }}
        onGesture={gesture}
        onPick={onPick}
        onDrop={onDrop}
        onRelate={(from, to, walls) =>
          onAct("relate", { from, to, ...walls, ...(module ? { module } : {}) })}
        /** A right drag across empty ground draws a **group**, sized in cells.
         *
         *  **Sketch first, impose order after**: whatever loose cards the sweep
         *  covered are seated into the cell each overlaps, which is the fastest
         *  path there is from a sketch to a structure. */
        onSweep={(box) => onAct("group", swept(scene, box))}
        onAdjust={(adjust) => {
          /** Dropping one card on another is a **move**, which is sayable;
           *  dropping it anywhere else is a **place**, which is not. Landing in
           *  a boundary is neither — it is joining one, and the app settles
           *  that against what the block already belongs to. */
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

/** A right drag across empty ground, as the grid it draws.
 *
 *  **Sized in cells** — the sweep says how big a region, and how many rows and
 *  columns that is is a question about cell sizes. **And it captures**: every
 *  loose card the region covers is seated into the cell it overlaps most, and
 *  two landing in one resolve to the nearest free cell, so a sketch becomes a
 *  structure in one gesture. */
function swept(scene: Scene, box: { x: number; y: number; w: number; h: number }) {
  /** **The cells it covered, not the rectangle it drew.** The lattice is
   *  already on the canvas and a group is a region of it, so a sweep activates
   *  whole cells and the group lands exactly on the lines you swept over. */
  /** **A corner where you drew it, and a whole number of cells to cover it.**
   *  A grid is exactly its cells, so its corner is its first cell's. */
  const { x, y, rows, cols } = swept_cells(box);
  const from = { x, y };
  const taken = new Set<string>();
  const seats: { id: string; r: number; c: number }[] = [];

  const caught = scene.nodes
    .filter((n) => n.type !== "group" && !n.data.on && n.selectable !== false)
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

/** The cell nearest the one asked for that nobody has taken. **A cell holds one
 *  block**, so two cards over the same one cannot both have it. */
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

/** Where a card made here goes.
 *
 *  **Centred on the pointer and clear of what is already drawn.** A block is
 *  placed by its corner, so one made just clear of a neighbour still landed on
 *  top of it, and two made in the same place stacked exactly. A boundary is not
 *  something to avoid — a new card inside one is a card inside one. */
function made_at(scene: Scene, at: { x: number; y: number }) {
  const taken = scene.nodes.filter((n) => n.type !== "group" && !n.data.on).map(box_of);
  return clear_of(taken, { x: at.x - BLOCK.w / 2, y: at.y - BLOCK.h / 2 }, BLOCK);
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
