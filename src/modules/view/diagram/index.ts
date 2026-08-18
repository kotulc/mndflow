/** The block view module — today's canvas as the base diagram.
 *
 *  Two halves. The **projection surface** (frame, camera, chrome, asking) and
 *  the **configured half**: renderers that draw from card / style / view, the
 *  form→renderer map, and the gesture map with the adjustments it accepts.
 *  The canvas compositor hosts React Flow on top. */

export { DIAGRAM, CHROME, type Surface, type ChromeKind, type Surround, type Viewport } from "./surface";
export { framed, MARGIN, BAND, LEAST } from "./surround";
export { floorOf, restOf, extentOf, type Camera } from "./viewport";
export { Crumbs } from "./chrome";
export { Ask, type Act, type Prompt, type Said } from "./ask";
export { SelectionStrip, type SelectionStripProps } from "./strip";
export {
  candidatesFor, noteTypePick, rankedTypes, shapeOf, TYPE_CAP,
  type TypeCandidate,
} from "./typelist";
export {
  MAP, ADJUSTMENTS, takes, reaches,
  type GestureMap, type Adjustment, type Binding, type Hand, type Motion, type Target, type Reaches,
} from "./map";
export {
  OfferMenu, ORDER, can_fill, fill_args, offered_for, rank,
  type OfferTarget,
} from "./offer";
export { paint } from "./paint";
export { PAPER, lookNow, svgOf, type Look as SvgLook } from "./svg";
export {
  NOTE, DEPTH, stageOf, laidOf, nodesOf, edgesOf, placementKey, standInOf,
  type Laid, type Band, type Stage, type NodeReach,
} from "./compose";
export { NodeCard } from "./NodeCard";
export { Frame, type FrameData } from "./Frame";
export { GroupFrame, type GroupData } from "./GroupFrame";
export { Note, type NoteData } from "./Note";
export { Wire, type WireData } from "./Wire";
export {
  Name, Port, Berth, Perch, Anchor, fitTag, along, seat, FACING, SIDES,
  LIFTED, REFERRED,
  type Grazed, type CardData, type Seated, type PortProps,
} from "./pieces";

import { Frame } from "./Frame";
import { GroupFrame } from "./GroupFrame";
import { NodeCard } from "./NodeCard";
import { Note } from "./Note";
import { Wire } from "./Wire";

/** Form → renderer for the block module. The compositor registers these with
 *  React Flow; another view module would ship its own map. */
export const NODES = { card: NodeCard, region: GroupFrame, frame: Frame, note: Note };
export const EDGES = { wire: Wire };
