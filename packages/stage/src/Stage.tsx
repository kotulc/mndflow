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
import type { Act } from "@mnd/core";
import { FlowView, type Adjust, type Gesture } from "./Flow";
import { Icon } from "@mnd/theme";
import type { Scene } from "@mnd/views";

export type { Adjust };

export type StageProps = {
  scene: Scene;
  picked: readonly string[];
  onAct: Act;
  onAdjust?: (adjust: Adjust) => void;
  onPick: (ids: string[]) => void;
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
          spot: { x: number; y: number }, only: readonly string[] | undefined,
          /** What the gesture already knew, for actions that need more than an
           *  id. A right-click on a relationship's end knows which end and
           *  whose border — nothing downstream could work either out. */
          given?: Record<string, unknown>) => React.ReactNode;
  /** What the app is saying. One strip, over the drawing. */
  said?: string | null;
  onSaid?: () => void;
  /** Whether relationships are read with curves rather than right angles. */
  curved?: boolean;
};

export function Stage({ scene, picked, onAct, onAdjust, onPick, onDrop, menu,
                       said, onSaid, curved }: StageProps) {
  const [at, set_at] = useState<
    { x: number; y: number; on: string | null; spot: { x: number; y: number };
      only?: readonly string[]; given?: Record<string, unknown> } | null>(null);
  /** The shell owns the global keys; a view module owns the rest.
   *
   *  **Shorter than it was.** Selection, the sweep and the multi-select
   *  modifier are the canvas's now; what is left is the handful that mean
   *  something to the *log* rather than to the drawing. */
  useEffect(() => {
    const on_key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.tagName === "INPUT";
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
      else if (e.key === "Enter" && one && !scene.edges.some((r) => r.id === one)) {
        onAct("open", { id: one });
      }
      else if (e.key === "F2" && one) {
        const label = prompt("rename");
        if (label !== null) onAct("rename", { id: one, label });
      }
      else if ((e.key === "Delete" || e.key === "Backspace") && one) {
        onAct(scene.edges.some((r) => r.id === one) ? "unlink" : "delete", { id: one });
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
  const OFFERS: Partial<Record<Gesture["kind"], readonly string[]>> = {
    box: ["rename", "open", "interface", "relate", "delete"],
    seat: ["rename", "open", "interface", "relate", "delete"],
    frame: ["interface", "relate"],
    route: ["rename", "delete"],
    anchor: ["promote", "rename", "delete"],
  };

  /** **What several things offer is not what one thing offers.** Rename, open
   *  and relate each name a single thing; asked of four they have no answer, so
   *  a card's list against a sweep came out empty. What is left is what a
   *  handful of blocks can be told to do together. */
  const MANY: readonly string[] = ["group", "leave", "delete"];

  const gesture = (g: Gesture) => {
    if (g.button === "left") {
      if (g.count === 2) {
        /** Two clicks navigate: into a card, or back out of the layer. The one
         *  name drawn here is the frame's, and a name is renamed where it is
         *  read — so renaming a block is done from inside it. */
        if (g.on && g.kind === "title") {
          const label = prompt("rename", scene.frame?.label);
          if (label !== null) onAct("rename", { id: g.on, label });
        }
        /** **An interface is a block, so it opens like one.** It is seated
         *  rather than placed, which is a fact about where it is drawn and not
         *  about what it is — and opened from the inside it is the one layer
         *  that shows the wall it is set into. */
        else if (g.on && (g.kind === "box" || g.kind === "seat")) onAct("open", { id: g.on });
        else if (!g.on) onAct("up");
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
    /** **A card's border is where an interface goes**, and there is nothing
     *  else it could mean — so the right button puts one there rather than
     *  offering a list of one. */
    if (g.kind === "brim" && g.given) { onAct("interface", { ...g.given }); return; }
    if (!g.on || g.kind === "empty") {
      const label = prompt("name it");
      if (label !== null) onAct("create", { label, spot: { x: g.at.x, y: g.at.y } });
      return;
    }
    if (menu) {
      const among = picked.length > 1 && g.on !== null && picked.includes(g.on);
      set_at({ ...g.screen, on: g.on, spot: g.at, only: among ? MANY : OFFERS[g.kind],
               ...(g.given ? { given: g.given } : {}) });
    }
  };

  return (
    <section className="stage">
      <Crumbs trail={scene.trail} onAct={onAct} />
      <FlowView
        scene={scene}
        picked={picked}
        curved={curved}
        onGesture={gesture}
        onPick={onPick}
        onDrop={onDrop}
        onRelate={(from, to) => onAct("relate", { from, to })}
        /** A right drag across empty ground. **A note is the one thing whose
         *  making asks for its text** — everything else is named after. */
        onNote={(spot) => {
          const text = prompt("note");
          if (text !== null) onAct("note", { text, spot });
        }}
        onAdjust={(adjust) => {
          /** Dropping one card on another is a **move**, which is sayable;
           *  dropping it anywhere else is a **place**, which is not. */
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
                                  onClick={() => onAct("up")}><Icon name="up" /></button> : null}
    </nav>
  );
}
