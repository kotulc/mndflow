/** Scene → React, and nothing else.
 *
 *  It reads what a projection placed and knows nothing about the graph, the log
 *  or the actions. Binding a hit to an action name is the whole of its input
 *  job: it names what was meant and never writes a mutation. */
import type { Hit, Scene } from "@mnd/views";
import { type Drag, type Point } from "./drag";
/** What a gesture on a region meant. The consumer decides what to do with it. */
export type Gesture = {
    on: string | null;
    kind: Hit["kind"] | "empty";
    button: "left" | "right";
    count: 1 | 2;
    /** Where, in scene coordinates. A position can only come from a gesture. */
    at: Point;
};
export type SceneViewProps = {
    scene: Scene;
    picked?: readonly string[];
    onGesture?: (g: Gesture) => void;
    /** A right drag from one thing to another, or to empty space. */
    onDragTo?: (from: string, to: string | null, at: Point) => void;
    /** A left drag, finished. Positional and unsayable — an adjustment. */
    onDrag?: (drag: Drag) => void;
};
export declare function SceneView(props: SceneViewProps): import("react").JSX.Element;
type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};
type View = {
    x: number;
    y: number;
    w: number;
    h: number;
};
/** The inverse of what `xMidYMid meet` does. Exported so it can be proven on
 *  its own, at aspect ratios a stubbed box would never produce. */
export declare function at_scene(view: View, box: Rect, clientX: number, clientY: number): Point;
export {};
