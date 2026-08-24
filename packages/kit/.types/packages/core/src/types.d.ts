/** Every shared shape: the graph, the mutations, the steps.
 *
 *  Two element kinds and no third — a block and a relation. Definitions group
 *  three ways by what they describe, in one id space. See schema.md. */
export type Id = string;
export declare const ROOT = "ws";
/** Which edge of a frame something sits on. */
export type Side = "top" | "right" | "bottom" | "left";
/** An interface's decorative mark. Constrains nothing. */
export type Flow = "in" | "out" | "both";
/** One setting, six values. Four carry a reading direction. */
export type Arrangement = "free" | "grid" | "right" | "left" | "down" | "up";
export declare const ARRANGEMENTS: readonly Arrangement[];
/** The four directional values, and what each reads toward. */
export declare const READS: Partial<Record<Arrangement, Side>>;
/** Closed: two are picked, two are assigned from what sits at the ends. */
export type RelationModule = "line" | "directed" | "reference" | "tie";
export type Dir = "none" | "forward" | "back" | "both";
/** Closed, and permanent. */
export type ValueForm = "text" | "number" | "flag" | "choice" | "link";
export type Field = {
    name: string;
    form: ValueForm;
    value?: string;
    tags?: string[];
};
export type FieldDef = Field & {
    unit?: string;
    choices?: string[];
    many?: boolean;
};
/** The one element. What it *is* comes from its definition. */
export type Block = {
    id: Id;
    parent: Id | null;
    type?: Id;
    label?: string;
    body?: string;
    /** A reference: the block it stands for. */
    of?: Id;
    groups?: Id[];
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    /** Only meaningful when this block is the open layer. */
    arrangement?: Arrangement;
    side?: Side;
    at?: number;
    num?: number;
    flow?: Flow;
    fields?: Field[];
};
export type Relation = {
    id: Id;
    from: Id;
    to: Id;
    module: RelationModule;
    type?: Id;
    dir?: Dir;
    fromSide?: Side;
    toSide?: Side;
    fields?: Field[];
};
/** Which block module the engine dispatches on. Open — one more is additive. */
export type BlockModule = "folder" | "structure" | "behavior" | "reference" | "interface" | "resource" | "group" | "note" | "view";
export declare const BLOCK_MODULES: readonly BlockModule[];
/** How a layer may be presented. **Three, and closed**: `block` is any planar
 *  projection, and `table` and `matrix` are the two that are not a plane.
 *  Core names them; the code behind each lives in the views package. */
export type ViewModule = "block" | "table" | "matrix";
export declare const VIEW_MODULES: readonly ViewModule[];
/** Which reading of a behavior layer. A reading is how you look, never
 *  something inferred — it configures the block module rather than being one. */
export type Reading = "activity" | "sequence" | "state";
export declare const READINGS: readonly Reading[];
export type Components = Record<string, Record<string, unknown>>;
export type Definition = {
    id: Id;
    /** The block it is filed under. Ownership, lock and scope all derive from this. */
    home: Id;
    group: "block" | "relation" | "view";
    name: string;
    body?: string;
    extends?: Id;
    fields?: FieldDef[];
    size?: {
        w: number;
        h: number;
    };
    names?: Record<string, string>;
    components?: Components;
};
export type Graph = {
    root: Id;
    blocks: Record<Id, Block>;
    edges: Record<Id, Relation>;
    defs: Record<Id, Definition>;
};
export declare function empty_graph(): Graph;
/** The closed mutation set. A new sort of thing is a definition, not an op. */
export type Mutation = {
    op: "checkpoint";
    graph: Graph;
} | {
    op: "add_block";
    block: Block;
} | {
    op: "update_block";
    id: Id;
    label?: string;
    type?: Id;
} | {
    op: "delete_block";
    id: Id;
} | {
    op: "move_block";
    id: Id;
    parent: Id | null;
} | {
    op: "place_block";
    id: Id;
    x: number;
    y: number;
} | {
    op: "size_block";
    id: Id;
    w: number;
    h: number;
} | {
    op: "set_body";
    id: Id;
    body: string;
} | {
    op: "join_group";
    id: Id;
    group: Id;
} | {
    op: "leave_group";
    id: Id;
    group: Id;
} | {
    op: "link_blocks";
    edge: Relation;
} | {
    op: "update_edge";
    id: Id;
    type: Id;
} | {
    op: "delete_edge";
    id: Id;
} | {
    op: "set_dir";
    id: Id;
    dir: Dir;
} | {
    op: "set_form";
    id: Id;
    module: RelationModule;
} | {
    op: "flip_edge";
    id: Id;
} | {
    op: "set_end";
    id: Id;
    end: "from" | "to";
    port: Id;
} | {
    op: "set_port";
    id: Id;
    side: Side;
    at: number;
} | {
    op: "set_side";
    id: Id;
    end: "from" | "to";
    side: Side | null;
} | {
    op: "mark_port";
    id: Id;
    flow: Flow | null;
} | {
    op: "set_field";
    id: Id;
    field: Field;
} | {
    op: "drop_field";
    id: Id;
    name: string;
} | {
    op: "set_def";
    def: Definition;
} | {
    op: "drop_def";
    id: Id;
} | {
    op: "set_arrangement";
    layer: Id;
    arrangement: Arrangement;
};
export type MutationOp = Mutation["op"];
export type Step = {
    id: Id;
    /** The action that produced it. */
    action: string;
    /** Steps before this one. */
    at: number;
    status: "applied" | "reverted";
    mutations: Mutation[];
};
export type Log = Step[];
/** The envelope a file carries. */
export type File = {
    schema: string;
    id: Id;
    graph: Graph;
    meta?: Record<string, unknown>;
};
export declare const SCHEMA = "2.0";
