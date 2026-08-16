/** The activity view module — a behavior layer's default projection.
 *
 *  Projection surface (frame, camera), a gesture map that accepts `place`,
 *  and composition that counts control nodes, lanes from refs, groups as
 *  groups, guards as edge fields, and dims derived labels / inferred order.
 *  Registers itself so a later import replaces the stub A.7c left. */

export { ACTIVITY } from "./surface";
export {
  MAP, takes, reaches,
  type Adjustment, type Binding, type GestureMap, type Hand, type Motion,
  type Reaches, type Target,
} from "./map";
export {
  DIM, VERB, CONTROLS, controlsOf, lanesOf, stageOf, guardOf,
  type ActionView, type ControlAt, type ControlKind, type ControlNode,
  type GroupView, type Lane, type OrderView, type Stage,
} from "./stage";
export { Activity, type ActivityProps } from "./Activity";

import { register } from "../index";
import { ACTIVITY } from "./surface";

// Replace the stub: same name, now carrying a surface.
register({
  name: "activity", kind: "behavior", word: "activity", icon: "▸", creates: "action",
  surface: ACTIVITY,
});
