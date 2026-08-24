/** The action registry: the closed surface every input method works against.
 *
 *  An action returns mutations; it never applies them. One seam serves the
 *  pointer, the keyboard and the terminal, so no input path can do something
 *  the others cannot.
 *
 *  An action writing no mutations is navigation: no step, nothing to undo, and
 *  a text interface never offers it. */
import { arrangement_of, children, edges_in } from "./fold";
import { type Graph, type Id, type Mutation, type Side } from "./types";
/** What an input method can fill. A position can only come from a gesture. */
export type ArgForm = "text" | "block" | "choice" | "number" | "spot";
export type Arg = {
    name: string;
    form: ArgForm;
    required?: boolean;
    choices?: readonly string[];
};
/** What is under the pointer, or what is selected. */
export type Scope = "layer" | "block" | "edge" | "interface" | "selection";
export type Args = Record<string, unknown>;
/** Where the app should be looking afterwards. Never a mutation. */
export type Effect = {
    open?: Id | null;
    focus?: Id | null;
    say?: string;
};
export type Result = {
    mutations: Mutation[];
    effect?: Effect;
};
export type Context = {
    graph: Graph;
    /** The open layer. */
    layer: Id | null;
    /** What is picked within it. */
    picked: Id[];
};
export type Action = {
    name: string;
    /** The sentence a typed word is scored against. Names are too short. */
    about: string;
    on: readonly Scope[];
    args: readonly Arg[];
    /** Whether this is a thing here at all. Absent is always. */
    when?: (ctx: Context) => boolean;
    /** Why these particular arguments would not work, in words, or null. */
    check?: (ctx: Context, args: Args) => string | null;
    run: (ctx: Context, args: Args) => Result;
};
export declare function register(...actions: Action[]): void;
export declare function all(): Action[];
export declare function action(name: string): Action | null;
/** Membership for the current context, and no ordering of its own. Menus draw
 *  it in a fixed order; the terminal ranks it. `check` is not consulted here,
 *  because it needs arguments nobody has filled. */
export declare function offer(ctx: Context): Action[];
/** Run an action by name. A refusal comes back as words, never as a throw. */
export declare function run(name: string, ctx: Context, args?: Args): Result | {
    refused: string;
};
/** Whether an action writes anything. Navigation writes nothing. */
export declare function writes(name: string): boolean;
/** Adjustments: positional, unsayable, gesture-only. Never named or ranked, so
 *  they are not on the registry — but they write mutations and they undo. */
export declare const adjustments: {
    place: (moved: {
        id: Id;
        x: number;
        y: number;
    }[]) => Mutation[];
    size: (id: Id, w: number, h: number) => Mutation[];
    seat: (id: Id, side: Side, at: number) => Mutation[];
    wall: (id: Id, end: "from" | "to", side: Side | null) => Mutation[];
};
/** Re-exported so a caller can read a layer without importing the fold too. */
export { arrangement_of, children, edges_in };
