/** What a view module hands back.
 *
 *  Plain data, importing nothing drawable — so a notation is a pure function,
 *  a renderer turns one into DOM and another into text, and most of the product
 *  is provably correct before anything is drawn. */
import type { Dir, Id, RelationModule } from "@mnd/core";
/** What is placed. `def` is what a renderer keys its look off. */
export type Box = {
    id: Id;
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    /** The definition this usage names, if any. Never a colour or a shape. */
    def?: Id;
    /** What this is drawn **on**, where it is seated rather than placed. An
     *  interface sits on its owner's edge, so a slide is a question about that
     *  card and not about the layer. */
    on?: Id;
    /** Where the box points, if it points anywhere. Derived from a field, so a
     *  translator makes a box clickable by saying where it came from and never
     *  by reaching into a renderer. A renderer that cannot follow one ignores it. */
    link?: string;
    /** How it reads, derived: a container, a reference, a note, a boundary. */
    marks: readonly Mark[];
};
export type Mark = "container" | "reference" | "missing" | "note" | "group" | "interface" | "derived" | "in" | "out" | "lane" | "lifeline" | "control" | "fork" | "join" | "decision" | "merge" | "header" | "cell" | "filled" | "turned";
/** Where a line goes. Every elbow is a right angle. */
export type Route = {
    id: Id;
    from: Id;
    to: Id;
    points: readonly {
        x: number;
        y: number;
    }[];
    module: RelationModule;
    dir: Dir;
    label?: string;
};
/** Which control group this projection offers. The shell knows how to build
 *  each; a module declaring none simply has none. */
export type Slot = "arrange" | "interfaces" | "lines" | "columns" | "types" | "relations";
/** A region, and what a gesture there means. Binding one to an action id is the
 *  renderer's whole input job. */
export type Hit = {
    /** What is under the pointer. */
    on: Id;
    region: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    /** Which gesture map entry applies. */
    kind: "box" | "route" | "frame" | "field" | "seat";
};
/** The open layer seen from within: a border with the name set into it, and
 *  the band outside it. A layer with nothing in it still gets one, so
 *  descending into an empty block shows somewhere to put something rather than
 *  a blank page. */
export type Frame = {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
};
export type Scene = {
    /** The layer this is a projection of. */
    layer: Id | null;
    /** Absent only at the root, which has no outside to be seen from. */
    frame?: Frame;
    boxes: readonly Box[];
    routes: readonly Route[];
    slots: readonly Slot[];
    hits: readonly Hit[];
    bounds: {
        w: number;
        h: number;
    };
    /** The trail from the root down to the layer, for a breadcrumb. */
    trail: readonly {
        id: Id;
        label: string;
    }[];
};
export declare const EMPTY: Scene;
/** What every well-formed Scene satisfies, whoever produced it.
 *
 *  A producer proves its output passes; a consumer proves it draws anything
 *  that does. Neither imports the other. */
export declare function faults(scene: Scene): string[];
