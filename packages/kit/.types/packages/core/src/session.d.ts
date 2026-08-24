/** The one log, and the loop every input surface drives.
 *
 *  Hold the log, fold it, run an action, append what it wrote. Undo flips a
 *  status and refolds — no mutation needs an inverse, and the graph that comes
 *  back was built by the same fold that built the original. */
import { type Args } from "./actions";
import { type Ports } from "./ports";
import type { Graph, Id, Log, Mutation } from "./types";
export type Said = {
    text: string;
    at: number;
};
export type Session = {
    log: () => Log;
    graph: () => Graph;
    layer: () => Id | null;
    picked: () => Id[];
    said: () => Said | null;
    /** Run an action by name. Returns what it refused with, or null. */
    go: (name: string, args?: Args) => string | null;
    /** An adjustment: positional, unsayable, and undoable like anything else. */
    adjust: (name: string, mutations: Mutation[]) => void;
    look: (layer: Id | null) => void;
    pick: (ids: Id[]) => void;
    say: (text: string) => void;
    undo: () => boolean;
    redo: () => boolean;
    save: (name?: string) => Promise<void>;
    load: (text: string) => void;
    /** Called after every change. One subscriber is all a host needs. */
    watch: (fn: () => void) => void;
};
export type Seed = {
    /** The definitions a fresh workspace opens with.
     *
     *  The engine needs a floor — something to draw and place a block that names
     *  no type — but it may not reach for the package that supplies one: `defs`
     *  depends on core, so core cannot depend back. An app hands it in, the same
     *  way it hands in a port. */
    defs?: Mutation[];
};
export declare function session(ports?: Partial<Ports> & Seed): Session;
