/** The envelope, and the canonical layout.
 *
 *  A file is the graph; the log is a working copy. A file exists to be read,
 *  compared and kept, so it is the size of the model rather than the size of
 *  the effort. Importing one is a checkpoint, so there is no second format and
 *  no second reader.
 *
 *  Exporting changes nothing, so re-exporting an unchanged workspace is
 *  byte-identical — which is what the canonical layout is for. */
import { type Fault } from "./door";
import { type Graph, type Id, type Log } from "./types";
/** The graph, laid out for reading: definitions first, then blocks, then relations. */
export declare function write(graph: Graph, id?: string): string;
/** A subtree plus every definition it reaches, and everything those extend. */
export declare function write_subtree(graph: Graph, root: Id): string;
export type Read = {
    log: Log;
    faults: Fault[];
};
/** Read a file in. It becomes a log holding a single checkpoint step, so there
 *  is no second reader and importing costs no new mechanism. */
export declare function read(text: string): Read;
/** The content hash is computed, never stored. A derived value written down
 *  lies the moment anybody edits the file by hand. */
export declare function hash(graph: Graph): string;
/** Past the cap the oldest steps fold into one checkpoint and are dropped. The
 *  graph is unchanged; what is spent is reach. */
export declare const CAP = 1000;
export declare const SLACK = 200;
export declare function compact(log: Log): Log;
