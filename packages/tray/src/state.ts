/** What a shell holds for its tray and its drawing: session state, never logged, never filed.
 *
 *  Every host wants the same answers — the tray starts open, a library row points it, the
 *  workspace tab sets how the drawing looks — so they are kept here once rather than in each
 *  app. The host still owns what is picked and which layer is open. */

import { useState } from "react";
import type { Act, Id } from "@mnd/core";
import type { Hold } from "./Tray";
import type { Display } from "./Workspace";
import type { Shelf } from "./Definitions";

/** A library row, as the explorer names one: a narrowing of the definitions, or one of them. */
export type Pointed = ({ of: "defs" } & Shelf) | { of: "def"; id: Id };

/** How the drawing starts where the host says nothing: the lattice on, the key off. */
const DISPLAY: Omit<Display, "card" | "range"> = { legend: false, corner: "top", lattice: true };


/** The tray: whether it is open, which tab, and what it holds that the canvas did not give it. */
export function useTray(first = true) {
  const [open, set_open] = useState(first);
  const [tab, set_tab] = useState<string | undefined>(undefined);
  const [hold, set_hold] = useState<Hold | null>(null);

  /** A library row points the tray: a definition at its own tabs, a folder at its list. */
  const onSection = (at: Pointed) => {
    set_open(true);
    if (at.of === "def") { set_hold({ of: "id", id: at.id }); return; }
    set_hold(at);
    set_tab(at.only === "packages" ? "packages" : "definitions");
  };

  /** Which library row the explorer lights: whatever the tray holds, bar the root. */
  const section = (root: Id): Pointed | null =>
    hold?.of === "defs" ? hold
    : hold?.of === "id" && hold.id !== root ? { of: "def", id: hold.id } : null;

  return {
    open, onOpen: set_open, tab, onTab: set_tab, hold, onHold: set_hold,
    section, onSection,
    /** A selection made anywhere but the tray gives the context back to the canvas. */
    release: () => set_hold(null),
  };
}

/** How the drawing looks, and the workspace tab's answers to it. `start` is the host's card and
 *  the range it is held inside; everything else starts at the shell's own default. */
export function useDisplay(start: Pick<Display, "card" | "range"> & Partial<Display>) {
  const [display, set_display] = useState<Display>({ ...DISPLAY, ...start });
  const { range } = display;

  const onDisplay: Act = (name, args) => {
    if (name === "card") {
      const w = held(Number(args?.["w"]), range.min.w, range.max.w);
      const h = held(Number(args?.["h"]), range.min.h, range.max.h);
      set_display((was) => ({ ...was, card: { w, h } }));
    }
    if (name === "legends") set_display((was) => ({ ...was, legend: !!args?.["show"] }));
    if (name === "legend_corner") {
      set_display((was) => ({ ...was, corner: args?.["at"] === "bottom" ? "bottom" : "top" }));
    }
    if (name === "lattice") set_display((was) => ({ ...was, lattice: !!args?.["show"] }));
  };

  return { display, onDisplay };
}

/** A whole number held between two others; anything not a number is the low end. */
function held(n: number, low: number, high: number): number {
  return Number.isFinite(n) ? Math.min(high, Math.max(low, Math.round(n))) : low;
}
