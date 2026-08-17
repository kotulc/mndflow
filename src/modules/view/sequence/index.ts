/** The sequence view module — a behavior layer as lifelines and messages.
 *
 *  Projection surface (frame, camera), a gesture map that accepts `seat`,
 *  and composition that builds a column per participant, orders occurrences
 *  from directed relations then axis position, and derives cross-column
 *  messages. Registers itself so a later import replaces the stub. */

export { SEQUENCE } from "./surface";
export {
  MAP, takes, reaches,
  type Adjustment, type Binding, type GestureMap, type Hand, type Motion,
  type Reaches, type Target,
} from "./map";
export {
  DIM, VERB, along, columnsOf, guardOf, ranked, stageOf,
  type Column, type Message, type Occurrence, type OrderView, type Stage,
} from "./stage";
export { Sequence, type SequenceProps } from "./Sequence";

import { register } from "../index";
import { SEQUENCE } from "./surface";

// Replace the stub: same name, now carrying a surface.
register({
  name: "sequence", kind: "behavior", word: "action", icon: "view_sequence", creates: "action",
  surface: SEQUENCE,
  // Columns are the layout, so an arrangement would fight it.
  chrome: ["flow"],
});
