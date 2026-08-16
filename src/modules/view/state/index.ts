/** The state view module — a behavior layer drawn as states and transitions.
 *
 *  Projection surface (frame, camera), a gesture map that accepts `place`,
 *  and composition that reads Reading A or B, dims derived labels / inferred
 *  transitions, and offers `infer` when the layer holds no states. Registers
 *  itself so a later import replaces the stub A.7c left. */

export { STATE } from "./surface";
export {
  MAP, takes, reaches,
  type Adjustment, type Binding, type GestureMap, type Hand, type Motion,
  type Reaches, type Target,
} from "./map";
export {
  DIM, OFFER, MARKS, isState, guardOf, marksOf, readingOf, stageOf,
  type GroupView, type Mark, type MarkAt, type MarkKind, type Reading,
  type Stage, type StateView, type TransitionView,
} from "./stage";
export { State, type StateProps } from "./State";

import { register } from "../index";
import { STATE } from "./surface";

// Replace the stub: same name, now carrying a surface.
register({
  name: "state", kind: "behavior", word: "state", icon: "◯", creates: "state",
  surface: STATE,
});
