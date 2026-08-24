/** What a positional drag on a Scene is asking for.
 *
 *  A drag ends as a name and a number, and this is the number. The Scene
 *  already says what a box is seated on and where a line's ends land, so the
 *  seat and the wall are questions about the Scene rather than about the graph
 *  — which is what lets a renderer ask them without reaching for either. */
import type { Side } from "@mnd/core";
import { type Seat, type Spot } from "@mnd/layout";
import type { Scene } from "./scene";
/** Where a slide would seat this interface: a side of the card it sits on, and
 *  how far along. Null where it is not seated on anything drawn. */
export declare function reseat(scene: Scene, id: string, at: Spot): Seat | null;
/** Which wall a relationship's end would leave by. **The card's wall**, so an
 *  end seated on an interface asks the card the interface sits on. */
export declare function rewall(scene: Scene, id: string, end: "from" | "to", at: Spot): Side | null;
