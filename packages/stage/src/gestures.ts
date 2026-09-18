/** What the canvas says a gesture meant, and the props it takes. */

import type { Id, Point, Side, Spot } from "@mnd/core";
import type { Scene } from "@mnd/views";

/** What a gesture on the canvas meant. */
export type Gesture = {
  on: string | null;
  kind: "box" | "band" | "cell" | "brim" | "seat" | "route" | "anchor" | "frame" | "title"
      | "name" | "note" | "empty";
  button: "left" | "right";
  count: 1 | 2;
  /** Where, in scene coordinates. A position can only come from a gesture. */
  at: Point;
  /** Where, on the screen, for a menu to open beside. */
  screen: Point;
  /** What this gesture knows beyond what it is on, as the arguments an action would need. */
  given?: Record<string, unknown>;
};

/** A positional change, which is unsayable and undoable like anything else. */
export type Adjust =
  /** A drop: `over` a card files inside it; `into` a holder joins it. */
  | { kind: "move"; on: string; to: Point; over: string | null; into: string | null;
      /** Which cell of `into` it came to rest in, where that is a grid. */
      cell?: { r: number; c: number } }
  /** Several cards put down at once. */
  | { kind: "place"; at: readonly { id: string; to: Point }[] }
  | { kind: "wall"; on: string; end: "from" | "to"; to: string }
  /** An interface set into the open layer's own wall, slid along it. */
  | { kind: "wall-seat"; on: string; side: Side; at: number }
  /** A corner dragged. */
  | { kind: "size"; on: string; w: number; h: number; to: Point };

/** What a drop came to rest on: a card, a holder, and a cell of a grid. */
export type Landing = { over: string | null; into: string | null;
                        /** The line under the pointer, where a drop landed on one. */
                        line?: string | null;
                        cell?: { r: number; c: number } };

export type FlowViewProps = {
  scene: Scene;
  picked?: readonly Id[];
  onGesture?: (g: Gesture) => void;
  /** A right drag from one card to another, with any room wall let go on. */
  onRelate?: (from: string, to: string,
              walls?: { fromSide?: Side; toSide?: Side }) => void;
  /** A right drag across empty ground: the region a grid will fill. */
  onSweep?: (box: { x: number; y: number; w: number; h: number }) => void;
  onAdjust?: (adjust: Adjust) => void;
  /** What is selected now. */
  onPick?: (ids: string[]) => void;
  /** Which cells are picked, beside the ids. */
  cells?: readonly Spot[];
  /** What the lattice picked. */
  onPickCells?: (cells: readonly Spot[]) => void;
  /** What the app is saying, shown over the drawing rather than beside it. */
  said?: React.ReactNode;
  /** Something dropped onto the drawing from outside, and what it landed on. */
  onDrop?: (id: string, at: Point, land: Landing) => void;
  /** Which name is being typed in place, and what was typed. */
  naming?: string | null;
  onNamed?: (label: string | null) => void;
  /** Chrome the host may turn off — a thumbnail wants none of it. */
  chrome?: boolean;
  /** Whether the backdrop rules the canvas into cells. */
  lattice?: boolean;
  /** Whether the open layer's border and name are drawn. */
  frame?: boolean;
};
