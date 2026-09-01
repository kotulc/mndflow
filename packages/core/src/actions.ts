/** The action registry: the closed surface every input method works against.
 *
 *  An action returns mutations; it never applies them. One seam serves the
 *  pointer, the keyboard and the terminal, so no input path can do something
 *  the others cannot.
 *
 *  An action writing no mutations is navigation: no step, nothing to undo, and
 *  a text interface never offers it. */

import { arrangement_of, children, edges_in, is_interface, is_reference, layer_id, module_of,
         next_num, path, reorder } from "./fold";
import { name_taken } from "./door";
import { infer as run_infer, ABSTRACTION } from "./infer";
import { def_id, new_id } from "./ids";
import { ARRANGEMENTS, VALUE_FORMS, type Arrangement, type Dir, type FieldDef, type Flow,
         type Graph, type Id, type Mutation, type RelationModule, type Side,
         type ValueForm } from "./types";

/** What an input method can fill. A position can only come from a gesture. */
export type ArgForm = "text" | "block" | "choice" | "number" | "spot";

export type Arg = {
  name: string;
  form: ArgForm;
  required?: boolean;
  /** Worth asking for, even though the action works without it. **The name of
   *  a thing being made** is the case this exists for: an unnamed block gets
   *  one derived from what it is, which is a fallback rather than an answer, so
   *  a surface with somewhere to type should offer to take it. A surface with
   *  nowhere to type ignores this and the action still runs. */
  asks?: boolean;
  choices?: readonly string[];
};

/** What is under the pointer, or what is selected. */
export type Scope = "layer" | "block" | "edge" | "interface" | "selection";

export type Args = Record<string, unknown>;

/** How a surface reaches an action. Every panel takes one and none of them
 *  knows what happens next — which is the whole of what a surface may do to
 *  the model, so it is named once here rather than three identical times. */
export type Act = (name: string, args?: Args) => void;

/** Where the app should be looking afterwards. Never a mutation. */
export type Effect = { open?: Id | null; focus?: Id | null; say?: string };

export type Result = { mutations: Mutation[]; effect?: Effect };

export type Context = {
  graph: Graph;
  /** The open layer. */
  layer: Id | null;
  /** What is picked within it. */
  picked: Id[];
  /** The layer this one was opened from, where anybody knows. **Only the way
   *  out needs it**, and only for the one thing that is drawn in two layers at
   *  once — see `up`. */
  from?: Id | null;
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

const registry = new Map<string, Action>();

export function register(...actions: Action[]): void {
  for (const a of actions) registry.set(a.name, a);
}

export function all(): Action[] {
  return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function action(name: string): Action | null {
  return registry.get(name) ?? null;
}

/** Membership for the current context, and no ordering of its own. Menus draw
 *  it in a fixed order; the terminal ranks it. `check` is not consulted here,
 *  because it needs arguments nobody has filled. */
export function offer(ctx: Context): Action[] {
  return all().filter((a) => in_scope(a, ctx) && (a.when?.(ctx) ?? true));
}

function in_scope(a: Action, ctx: Context): boolean {
  const one = ctx.picked.length === 1 ? ctx.graph.blocks[ctx.picked[0]!] : undefined;
  const edge = ctx.picked.length === 1 ? ctx.graph.edges[ctx.picked[0]!] : undefined;
  return a.on.some((s) =>
    s === "layer" ? true
    : s === "block" ? !!one
    : s === "edge" ? !!edge
    : s === "interface" ? !!one && is_interface(one)
    : ctx.picked.length > 0);
}

/** Run an action by name. A refusal comes back as words, never as a throw. */
export function run(name: string, ctx: Context, args: Args = {}): Result | { refused: string } {
  const a = registry.get(name);
  if (!a) return { refused: `there is no action called "${name}"` };
  const why = a.check?.(ctx, args);
  if (why) return { refused: why };
  return a.run(ctx, args);
}

/** Whether an action writes anything. Navigation writes nothing. */
export function writes(name: string): boolean {
  return !["open", "up", "reveal"].includes(name);
}

// ---------------------------------------------------------------- helpers

/** The layer an action lands in. **A null layer is the root layer** — taking it
 *  literally would give the new block `parent: null` and make it a second root. */
const here = (ctx: Context): Id => layer_id(ctx.graph, ctx.layer);

const text = (args: Args, key: string): string => String(args[key] ?? "").trim();
const id_of = (args: Args, key: string): Id => String(args[key] ?? "");
/** The four walls, as a choice an input method can be offered. */
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

const side_of = (args: Args, key: string): Side | undefined =>
  SIDES.includes(args[key] as Side) ? (args[key] as Side) : undefined;

/** Every block or relationship an action was pointed at. **One or many is one
 *  question** — a gesture names one, a selection names several, and an action
 *  that removes things should not care which it was handed. */
const ids_of = (ctx: Context, args: Args): Id[] => {
  const said = args["ids"] ?? args["id"];
  const many = Array.isArray(said) ? said.map(String) : said ? [String(said)] : [];
  return (many.length ? many : ctx.picked).filter(Boolean);
};

const spot = (args: Args): { x: number; y: number } | null => {
  const s = args["spot"] as { x?: number; y?: number } | undefined;
  return s && typeof s.x === "number" && typeof s.y === "number" ? { x: s.x, y: s.y } : null;
};

/** The one door making a block, so every caller places and numbers alike. */
function make_block(ctx: Context, label: string, parent: Id | null, type?: Id): Mutation[] {
  const id = new_id("block");
  return [{ op: "add_block", block: {
    id, parent, label: label || undefined, type,
    num: next_num(ctx.graph, parent),
  } }];
}

// ---------------------------------------------------------------- blocks

register(
  {
    name: "create",
    about: "makes a new block in a layer, where you pointed if you did",
    on: ["layer"],
    args: [{ name: "label", form: "text", asks: true },
           { name: "parent", form: "block" },
           { name: "type", form: "text" }, { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const parent = (args["parent"] as Id) ?? here(ctx);
      const label = text(args, "label");
      return name_taken(ctx.graph, parent, label) ? `"${label}" is taken` : null;
    },
    run: (ctx, args) => {
      const parent = (args["parent"] as Id) ?? here(ctx);
      const type = args["type"] ? String(args["type"]) : undefined;
      const made = make_block(ctx, text(args, "label"), parent, type);
      const at = spot(args);
      const block = (made[0] as { block: { id: Id } }).block;
      if (at) made.push({ op: "place_block", id: block.id, x: at.x, y: at.y });
      return { mutations: made };
    },
  },
  {
    name: "delete",
    about: "removes blocks and everything they own, or relationships",
    on: ["block", "edge", "selection"],
    args: [{ name: "ids", form: "block", required: true }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      return ids.includes(ctx.graph.root) ? "the workspace cannot be deleted" : null;
    },
    /** **One word for getting rid of a thing.** A relationship is a thing, and
     *  offering *delete* on a block and *unlink* on a line made the same
     *  gesture read as two. `unlink` is still there to be typed.
     *
     *  **One or several, in one step.** Four cards swept up and deleted is one
     *  thing you did, so it is one entry in the log and one undo — deleting
     *  them a card at a time left four. */
    run: (ctx, args) => ({
      mutations: ids_of(ctx, args).map((id): Mutation => (ctx.graph.edges[id]
        ? { op: "delete_edge", id } : { op: "delete_block", id })),
      effect: { focus: null },
    }),
  },
  {
    name: "rename",
    about: "changes what a block or a relationship is called",
    on: ["block", "edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "label", form: "text", required: true }],
    check: (ctx, args) => {
      const id = id_of(args, "id");
      if (ctx.graph.edges[id]) return text(args, "label") ? null : "a name is required";
      const b = ctx.graph.blocks[id];
      if (!b) return "that block is not there";
      const label = text(args, "label");
      if (!label) return "a name is required";
      return name_taken(ctx.graph, b.parent, label, id) ? `"${label}" is taken` : null;
    },
    /** **A relationship is named by what it is**, so naming one is filing a
     *  relation definition under that name and pointing the line at it. A type
     *  set without one draws no label at all, which is the same as not having
     *  been named. */
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const label = text(args, "label");
      if (!ctx.graph.edges[id]) {
        return { mutations: [{ op: "update_block", id, label }] };
      }
      const def = def_id(label);
      const out: Mutation[] = ctx.graph.defs[def] ? []
        : [{ op: "set_def", def: { id: def, home: here(ctx), group: "relation", name: label } }];
      return { mutations: [...out, { op: "update_edge", id, type: def }] };
    },
  },
  {
    name: "retype",
    about: "sets which definition a block or a relationship names",
    on: ["block", "edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "type", form: "text", required: true }],
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const type = text(args, "type");
      if (ctx.graph.edges[id]) return { mutations: [{ op: "update_edge", id, type }] };
      return { mutations: [{ op: "update_block", id, type }] };
    },
  },
  {
    name: "describe",
    about: "writes the body text of a block",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true },
           { name: "body", form: "text", required: true }],
    run: (_ctx, args) => ({ mutations: [
      { op: "set_body", id: id_of(args, "id"), body: String(args["body"] ?? "") },
    ] }),
  },
  {
    name: "move",
    about: "puts a block under a different parent, in the place you dropped it",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true },
           { name: "parent", form: "block", required: true },
           /** Which sibling it goes in front of. **Absent is last**, which is
            *  where anything arriving somewhere new belongs unless you said
            *  otherwise by dropping it between two things. */
           { name: "before", form: "block" }, { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const id = id_of(args, "id");
      const parent = args["parent"] === null ? null : id_of(args, "parent");
      if (id === ctx.graph.root) return "the workspace cannot be moved";
      if (id === parent) return "a block cannot contain itself";
      if (parent && path(ctx.graph, parent).some((b) => b.id === id)) {
        return "a block cannot be moved inside itself";
      }
      const label = ctx.graph.blocks[id]?.label;
      return label && name_taken(ctx.graph, parent, label, id) ? `"${label}" is taken there` : null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const parent = args["parent"] === null ? null : id_of(args, "parent");
      const before = args["before"] ? id_of(args, "before") : null;
      const out: Mutation[] = [{ op: "move_block", id, parent }];
      /** **Where it sits, not just what holds it.** A block keeps the number it
       *  was made with, which among its new siblings is somebody else's place
       *  in the queue — so arriving anywhere renumbers the list it arrives in. */
      for (const at of reorder(ctx.graph, parent, id, before)) {
        out.push({ op: "order_block", id: at.id, num: at.num });
      }
      const at = spot(args);
      if (at) out.push({ op: "place_block", id, x: at.x, y: at.y });
      return { mutations: out };
    },
  },
  {
    name: "refer",
    about: "places a reference of a block into this layer",
    on: ["layer"],
    args: [{ name: "target", form: "block", required: true }, { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const target = id_of(args, "target");
      if (!ctx.graph.blocks[target]) return "that block is not there";
      if (target === ctx.layer) return "a layer cannot hold a stand-in for itself";
      const here = children(ctx.graph, ctx.layer);
      if (here.some((b) => b.id === target)) return "it is already in this layer";
      if (here.some((b) => b.of === target)) return "it is already referenced here";
      return null;
    },
    run: (ctx, args) => {
      const id = new_id("block");
      const at = spot(args);
      const out: Mutation[] = [{ op: "add_block", block: {
        id, parent: here(ctx), of: id_of(args, "target"), num: next_num(ctx.graph, here(ctx)),
      } }];
      if (at) out.push({ op: "place_block", id, x: at.x, y: at.y });
      return { mutations: out };
    },
  },
);

// ---------------------------------------------------------------- navigation

register(
  {
    name: "open",
    about: "opens a block as the layer being drawn",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true }],
    run: (_ctx, args) => ({ mutations: [], effect: { open: id_of(args, "id"), focus: null } }),
  },
  {
    name: "up",
    about: "leaves the open layer for the one containing it",
    on: ["layer"],
    args: [],
    when: (ctx) => ctx.layer !== null,
    /** **An interface is drawn in two layers at once**: seated on its owner's
     *  border, out in the layer that holds the owner, and set into the wall of
     *  that owner seen from the inside. Its parent is the owner, so leaving one
     *  always landed inside a card you may never have opened — going into a
     *  port on a card and coming straight back out put you somewhere else.
     *
     *  So the way out of an interface is the way in, where the way in is one of
     *  the two layers that draw it. Everything else leaves for what holds it,
     *  which is the same answer by a shorter road. */
    run: (ctx) => {
      const here = ctx.layer ? ctx.graph.blocks[ctx.layer] : undefined;
      const owner = here?.parent ? ctx.graph.blocks[here.parent] : undefined;
      const outside = owner?.parent ?? null;
      const back = here && is_interface(here) && ctx.from !== undefined
        && ctx.from === outside ? outside : here?.parent ?? null;
      return { mutations: [], effect: { open: back, focus: ctx.layer } };
    },
  },
  {
    name: "reveal",
    about: "opens the layer a block lives in and selects it there",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true }],
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const b = ctx.graph.blocks[id];
      const target = b && is_reference(b) ? (b.of ?? id) : id;
      const home = ctx.graph.blocks[target]?.parent ?? null;
      return { mutations: [], effect: { open: home, focus: target } };
    },
  },
);

// ---------------------------------------------------------------- relations

register(
  {
    name: "relate",
    about: "draws a relationship from one block to another",
    on: ["layer"],
    args: [{ name: "from", form: "block", required: true },
           { name: "to", form: "block", required: true },
           { name: "type", form: "text" },
           { name: "module", form: "choice", choices: ["line", "directed"] },
           { name: "fromSide", form: "choice", choices: SIDES },
           { name: "toSide", form: "choice", choices: SIDES }],
    check: (ctx, args) => {
      const from = id_of(args, "from");
      const to = id_of(args, "to");
      if (!ctx.graph.blocks[from] || !ctx.graph.blocks[to]) return "both ends have to be there";
      if (from === to) return "a block cannot relate to itself";
      return null;
    },
    run: (ctx, args) => {
      const from = id_of(args, "from");
      const to = id_of(args, "to");
      const picked = (args["module"] as RelationModule) ?? "line";
      const module = derived_module(ctx.graph, from, to) ?? picked;
      const type = text(args, "type");
      /** **A wall said by the gesture that drew it.** Where a line meets a
       *  border is worked out from two rectangles; the layer's own border is
       *  four places to stand, so an end aimed at one of them says which and
       *  the geometry stops guessing. */
      const out: Mutation[] = [{ op: "link_blocks", edge: {
        id: new_id("edge"), from, to, module, type: type ? def_id(type) : undefined,
        ...(side_of(args, "fromSide") ? { fromSide: side_of(args, "fromSide") } : {}),
        ...(side_of(args, "toSide") ? { toSide: side_of(args, "toSide") } : {}),
      } }];
      return { mutations: out };
    },
  },
  {
    name: "relink",
    about: "takes one end of a relationship to another block",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "end", form: "choice", required: true, choices: ["from", "to"] },
           { name: "to", form: "block", required: true }],
    check: (ctx, args) => {
      if (!ctx.graph.edges[id_of(args, "id")]) return "needs a relationship";
      if (!ctx.graph.blocks[id_of(args, "to")]) return "needs somewhere to land";
      return null;
    },
    /** **The wall the old end was pinned to goes with it.** A side was said
     *  about a border this end no longer meets, and keeping it would leave the
     *  line entering the new block from whichever way the old one faced.
     *
     *  **And what the line is, is asked again.** A tie and a reference are
     *  assigned from what sits at the ends, so an end dragged onto a note makes
     *  a tie of the line the same way drawing one there would. */
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const end = args["end"] as "from" | "to";
      const to = id_of(args, "to");
      const edge = ctx.graph.edges[id];
      const ends = end === "from" ? [to, edge?.to ?? ""] : [edge?.from ?? "", to];
      /** **And back again**: an end taken off a note leaves a tie whose reason
       *  has gone, and what is left of it is an ordinary line. */
      const was = edge?.module;
      const module = derived_module(ctx.graph, ends[0]!, ends[1]!)
        ?? (was === "tie" || was === "reference" ? "line" : null);
      return { mutations: [
        { op: "set_end", id, end, port: to },
        { op: "set_side", id, end, side: null },
        ...(module && module !== was ? [{ op: "set_form" as const, id, module }] : []),
      ] };
    },
  },
  {
    name: "promote",
    about: "turns where a relationship meets a border into an interface of its own",
    on: ["edge"],
    /** **`on` rather than `owner`.** A menu fills `owner` from whatever is
     *  picked, which here is the relationship — so the border this end meets
     *  has to be named by something that knows it, and only the gesture on the
     *  end does. Offered nowhere else for the same reason. */
    args: [{ name: "id", form: "block", required: true },
           { name: "end", form: "choice", required: true, choices: ["from", "to"] },
           { name: "on", form: "block", required: true },
           { name: "side", form: "choice", choices: ["top", "right", "bottom", "left"] },
           { name: "at", form: "number" }],
    check: (ctx, args) => {
      if (!ctx.graph.edges[id_of(args, "id")]) return "needs a relationship";
      if (!ctx.graph.blocks[id_of(args, "on")]) return "needs a border to sit on";
      return null;
    },
    /** The seat the end was already meeting becomes a block that owns it.
     *  Nothing about the line moves, and the wall it was pinned to goes with
     *  the promotion — it is the interface's own wall now. */
    run: (ctx, args) => {
      const edge = id_of(args, "id");
      const end = args["end"] as "from" | "to";
      const owner = id_of(args, "on");
      const id = new_id("block");
      return { mutations: [
        { op: "add_block", block: {
          id, parent: owner, side: (args["side"] as Side) ?? "right",
          at: typeof args["at"] === "number" ? (args["at"] as number) : 0.5,
          num: next_num(ctx.graph, owner),
        } },
        { op: "set_end", id: edge, end, port: id },
        { op: "set_side", id: edge, end, side: null },
      ], effect: { focus: id } };
    },
  },
  {
    name: "straighten",
    about: "takes the bend out of a relationship so it runs straight between its ends",
    on: ["edge"],
    /** **The geometry is the canvas's, and only the canvas has it.** Where two
     *  borders can meet without a jog is a fact about two rectangles, and a
     *  relationship carries neither — so the walls and the fractions are handed
     *  in, and the action is offered only where a straight run exists. */
    args: [{ name: "id", form: "block", required: true },
           { name: "fromSide", form: "choice", required: true, choices: SIDES },
           { name: "fromAt", form: "number", required: true },
           { name: "toSide", form: "choice", required: true, choices: SIDES },
           { name: "toAt", form: "number", required: true },
           /** The block that has to shift for a straight run to exist at all,
            *  and where it goes. Absent where the two already line up. */
           { name: "align", form: "block" },
           { name: "x", form: "number" }, { name: "y", form: "number" }],
    check: (ctx, args) => ctx.graph.edges[id_of(args, "id")]
      ? null : "needs a relationship",
    /** Both ends pinned, which is the only way to say *there* about a seat that
     *  is otherwise worked out. Unpinning them is dragging either end again. */
    run: (_ctx, args) => {
      const id = id_of(args, "id");
      const out: Mutation[] = [];
      if (args["align"] && typeof args["x"] === "number" && typeof args["y"] === "number") {
        out.push({ op: "place_block", id: id_of(args, "align"),
                   x: args["x"] as number, y: args["y"] as number });
      }
      out.push(
        { op: "set_side", id, end: "from", side: side_of(args, "fromSide") ?? "right",
          at: Number(args["fromAt"]) },
        { op: "set_side", id, end: "to", side: side_of(args, "toSide") ?? "left",
          at: Number(args["toAt"]) });
      return { mutations: out };
    },
  },
  {
    name: "unlink",
    about: "removes a relationship and any interfaces it leaves spare",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true }],
    run: (_ctx, args) => ({ mutations: [{ op: "delete_edge", id: id_of(args, "id") }],
                            effect: { focus: null } }),
  },
  {
    name: "flip",
    about: "turns a relationship around",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true }],
    run: (_ctx, args) => ({ mutations: [{ op: "flip_edge", id: id_of(args, "id") }] }),
  },
  {
    name: "direct",
    about: "sets which way a relationship's arrows point",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "dir", form: "choice", required: true,
             choices: ["none", "forward", "back", "both"] }],
    run: (_ctx, args) => ({ mutations: [
      { op: "set_dir", id: id_of(args, "id"), dir: String(args["dir"]) as Dir },
    ] }),
  },
  {
    name: "reform",
    about: "sets whether a relationship is a line or directed",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "module", form: "choice", required: true, choices: ["line", "directed"] }],
    /** **What the ends decide is not on offer.** A line to a note is a tie and
     *  a line to a reference is a reference — said in words rather than
     *  written and quietly undone by the next thing that touches an end. */
    check: (ctx, args) => {
      const edge = ctx.graph.edges[id_of(args, "id")];
      if (!edge) return "needs a relationship";
      const fixed = derived_module(ctx.graph, edge.from, edge.to);
      return fixed ? `a relationship to a ${fixed === "tie" ? "note" : "reference"} is a ${fixed}`
                   : null;
    },
    run: (_ctx, args) => ({ mutations: [
      { op: "set_form", id: id_of(args, "id"), module: String(args["module"]) as RelationModule },
    ] }),
  },
);

/** Where a new interface sits on the wall it is set into.
 *
 *  **The middle, unless the middle is taken.** An interface is a place on a
 *  border rather than a point somebody aimed at, so one is centred on its wall
 *  and a second steps aside to the nearest fraction still free — which keeps a
 *  wall with several on it balanced about its centre instead of ragged. */
function mid_of(graph: Graph, owner: Id, side: Side): number {
  const taken = new Set(children(graph, owner)
    .filter((b) => is_interface(b) && b.side === side).map((b) => b.at ?? 0.5));
  for (const at of SHARED) if (!taken.has(at)) return at;
  return 0.5;
}

/** Fractions along a wall, middle first and then outward in pairs. */
const SHARED: readonly number[] =
  [2, 3, 4, 5, 6].flatMap((d) => Array.from({ length: d - 1 }, (_, n) => (n + 1) / d));

/** `reference` and `tie` are assigned from what sits at the ends, never picked.
 *
 *  **A note is whatever says it is one.** The definition answers where there is
 *  one to ask; the type the block carries answers where the definitions have
 *  not been read in, which is every log that starts from nothing. */
const noted = (graph: Graph, id: Id): boolean =>
  graph.blocks[id]?.type === "note" || module_of(graph, id) === "note";

function derived_module(graph: Graph, from: Id, to: Id): RelationModule | null {
  const a = graph.blocks[from];
  const b = graph.blocks[to];
  if (!a || !b) return null;
  if (noted(graph, from) || noted(graph, to)) return "tie";
  if (is_reference(a) || is_reference(b)) return "reference";
  return null;
}

// ---------------------------------------------------------------- interfaces

register(
  {
    name: "interface",
    about: "puts an interface on an edge of a block",
    on: ["block"],
    args: [{ name: "owner", form: "block", required: true },
           { name: "side", form: "choice", choices: SIDES },
           { name: "at", form: "number" }],
    run: (ctx, args) => {
      const owner = id_of(args, "owner");
      const side = side_of(args, "side") ?? "right";
      const id = new_id("block");
      return { mutations: [{ op: "add_block", block: {
        id, parent: owner, side,
        at: typeof args["at"] === "number" ? (args["at"] as number)
                                           : mid_of(ctx.graph, owner, side),
        num: next_num(ctx.graph, owner),
      } }] };
    },
  },
  {
    name: "mark",
    about: "marks an interface in, out, both, or clears the mark",
    on: ["interface"],
    args: [{ name: "id", form: "block", required: true },
           { name: "flow", form: "choice", choices: ["in", "out", "both", "none"] }],
    run: (_ctx, args) => {
      const flow = String(args["flow"] ?? "none");
      return { mutations: [{ op: "mark_port", id: id_of(args, "id"),
                             flow: flow === "none" ? null : (flow as Flow) }] };
    },
  },
);

// ---------------------------------------------------------------- boundaries and notes

register(
  {
    name: "group",
    about: "draws a boundary round these, or adds them to a boundary already there",
    on: ["selection"],
    args: [{ name: "members", form: "block", required: true }, { name: "into", form: "block" }],
    check: (ctx, args) => {
      const members = (args["members"] as Id[]) ?? ctx.picked;
      return members.length ? null : "nothing is selected";
    },
    run: (ctx, args) => {
      const members = ((args["members"] as Id[]) ?? ctx.picked).filter((id) => ctx.graph.blocks[id]);
      const into = args["into"] ? id_of(args, "into") : null;
      const out: Mutation[] = [];
      let group = into;
      if (!group) {
        group = new_id("block");
        out.push({ op: "add_block", block: {
          id: group, parent: here(ctx), type: "group", num: next_num(ctx.graph, here(ctx)),
        } });
      }
      for (const id of members) out.push({ op: "join_group", id, group });
      return { mutations: out };
    },
  },
  {
    name: "leave",
    about: "takes this out of a boundary it belongs to",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true },
           { name: "group", form: "block", required: true }],
    run: (_ctx, args) => ({ mutations: [
      { op: "leave_group", id: id_of(args, "id"), group: id_of(args, "group") },
    ] }),
  },
  {
    name: "note",
    about: "puts a note here saying what you typed",
    on: ["layer"],
    args: [{ name: "text", form: "text", required: true }, { name: "spot", form: "spot" },
           { name: "w", form: "number" }, { name: "h", form: "number" }],
    check: (_ctx, args) => text(args, "text") ? null : "a note is its text",
    /** **A note is the one card whose size is yours to set**, so the gesture
     *  that draws one may say how big — a region swept out and then filled,
     *  rather than a default box you resize afterwards. */
    run: (ctx, args) => {
      const id = new_id("block");
      const out: Mutation[] = [
        { op: "add_block", block: {
          id, parent: here(ctx), type: "note", num: next_num(ctx.graph, here(ctx)) } },
        { op: "set_body", id, body: text(args, "text") },
      ];
      const at = spot(args);
      if (at) out.push({ op: "place_block", id, x: at.x, y: at.y });
      const w = args["w"], h = args["h"];
      if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
        out.push({ op: "size_block", id, w, h });
      }
      return { mutations: out };
    },
  },
);

// ---------------------------------------------------------------- fields and definitions

register(
  {
    name: "field",
    about: "sets a named value on this, or renames one it already carries",
    on: ["block", "edge"],
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true },
           { name: "value", form: "text" }],
    check: (_ctx, args) => text(args, "name") ? null : "a field needs a name",
    run: (_ctx, args) => ({ mutations: [{ op: "set_field", id: id_of(args, "holder"), field: {
      name: text(args, "name"), form: "text", value: String(args["value"] ?? ""),
    } }] }),
  },
  {
    name: "unfield",
    about: "drops a named value from this",
    on: ["block", "edge"],
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true }],
    run: (_ctx, args) => ({ mutations: [
      { op: "drop_field", id: id_of(args, "holder"), name: text(args, "name") },
    ] }),
  },
  {
    name: "define",
    about: "names a new definition, or renames one this layer already has",
    on: ["layer"],
    args: [{ name: "name", form: "text", required: true },
           { name: "group", form: "choice", choices: ["block", "relation", "view"] },
           { name: "extends", form: "text" }],
    check: (_ctx, args) => text(args, "name") ? null : "a definition needs a name",
    run: (ctx, args) => {
      const name = text(args, "name");
      return { mutations: [{ op: "set_def", def: {
        id: def_id(name), home: here(ctx),
        group: (args["group"] as "block" | "relation" | "view") ?? "block",
        name, extends: args["extends"] ? def_id(text(args, "extends")) : undefined,
      } }] };
    },
  },
  {
    name: "declare",
    about: "adds a named field to a definition, so every usage of it carries one",
    on: ["layer", "block", "edge"],
    args: [{ name: "def", form: "text", required: true },
           { name: "name", form: "text", required: true },
           { name: "form", form: "choice", choices: VALUE_FORMS },
           { name: "unit", form: "text" },
           { name: "choices", form: "text" }],
    check: (ctx, args) => {
      if (!ctx.graph.defs[id_of(args, "def")]) return "that definition is not there";
      return text(args, "name") ? null : "a field needs a name";
    },
    /** **Fields union with the subtype's winning by name**, so declaring one
     *  that is already there rewrites it rather than doubling it. */
    run: (ctx, args) => {
      const d = ctx.graph.defs[id_of(args, "def")];
      const name = text(args, "name");
      if (!d) return { mutations: [] };
      const form = String(args["form"] ?? "text") as ValueForm;
      const said: FieldDef = {
        name, form: VALUE_FORMS.includes(form) ? form : "text",
        unit: text(args, "unit") || undefined,
        choices: list(args["choices"]).length ? list(args["choices"]) : undefined,
      };
      const rest = (d.fields ?? []).filter((f) => f.name !== name);
      return { mutations: [{ op: "set_def", def: { ...d, fields: [...rest, said] } }] };
    },
  },
  {
    name: "undeclare",
    about: "drops a named field from a definition, leaving what carries one alone",
    on: ["layer", "block", "edge"],
    args: [{ name: "def", form: "text", required: true },
           { name: "name", form: "text", required: true }],
    check: (ctx, args) =>
      ctx.graph.defs[id_of(args, "def")] ? null : "that definition is not there",
    run: (ctx, args) => {
      const d = ctx.graph.defs[id_of(args, "def")];
      if (!d) return { mutations: [] };
      return { mutations: [{ op: "set_def", def: {
        ...d, fields: (d.fields ?? []).filter((f) => f.name !== text(args, "name")),
      } }] };
    },
  },
  {
    name: "undefine",
    about: "drops a definition, leaving anything that used it alone",
    on: ["layer"],
    args: [{ name: "id", form: "text", required: true }],
    run: (_ctx, args) => ({ mutations: [{ op: "drop_def", id: id_of(args, "id") }] }),
  },
);

// ---------------------------------------------------------------- the layer

register(
  {
    name: "arrange",
    about: "sets how the layer lays out and which way it reads",
    on: ["layer"],
    args: [{ name: "arrangement", form: "choice", required: true, choices: ARRANGEMENTS }],
    check: (_ctx, args) =>
      ARRANGEMENTS.includes(String(args["arrangement"]) as Arrangement)
        ? null : `there is no arrangement called "${args["arrangement"]}"`,
    run: (ctx, args) => ({ mutations: [{ op: "set_arrangement",
      layer: (args["layer"] as Id) ?? here(ctx),
      arrangement: String(args["arrangement"]) as Arrangement }] }),
  },
);

// ---------------------------------------------------------------- views

register(
  {
    name: "pin",
    about: "keeps the layer as it is being looked at, as a view you can come back to",
    on: ["layer"],
    args: [{ name: "name", form: "text", required: true }],
    check: (ctx, args) => {
      if (!text(args, "name")) return "a view needs a name";
      return children(ctx.graph, here(ctx)).length ? null : "there is nothing here to keep";
    },
    run: (ctx, args) => {
      /** A pinned layer is an **ordinary view block** — one reference per thing
       *  shown, so it exports and undoes like anything else. It is filed beside
       *  what it looks at rather than inside it: a view of a layer that lived in
       *  that layer would show itself. */
      const view = new_id("block");
      const holder = ctx.graph.blocks[here(ctx)]?.parent ?? ctx.graph.root;
      const out: Mutation[] = [{ op: "add_block", block: {
        id: view, parent: holder, type: "view", label: text(args, "name"),
        num: next_num(ctx.graph, holder),
      } }];
      for (const [i, b] of children(ctx.graph, here(ctx)).entries()) {
        out.push({ op: "add_block", block: {
          id: new_id("block"), parent: view, of: b.of ?? b.id, num: i + 1 } });
      }
      return { mutations: out, effect: { say: `kept as "${text(args, "name")}"` } };
    },
  },
);

// ---------------------------------------------------------------- behavior

register(
  {
    name: "infer",
    about: "turns a selection into one behavior block — activity, or state when the selection is actions",
    on: ["selection"],
    args: [{ name: "of", form: "block", required: true }, { name: "n", form: "number" }],
    check: (ctx, args) => {
      const of = ((args["of"] as Id[]) ?? ctx.picked).filter((id) => ctx.graph.blocks[id]);
      return of.length ? null : "nothing is selected";
    },
    run: (ctx, args) => {
      const of = ((args["of"] as Id[]) ?? ctx.picked).filter((id) => ctx.graph.blocks[id]);
      const n = typeof args["n"] === "number" ? (args["n"] as number) : ABSTRACTION;
      const got = run_infer(ctx.graph, of, n);
      if (!got) return { mutations: [] };
      const home = got.tier === 1 ? ", and wrote the interfaces it implies" : "";
      return { mutations: got.mutations,
               effect: { open: got.block, say: `read the order from tier ${got.tier}${home}` } };
    },
  },
);

// ---------------------------------------------------------------- the project

register(
  {
    name: "vocabulary",
    about: "sets which packages this project draws definitions from",
    on: ["layer"],
    args: [{ name: "packages", form: "text", required: true }],
    check: (ctx, args) => {
      const want = list(args["packages"]);
      const missing = want.filter((name) => !ctx.graph.blocks[name] && !ctx.graph.defs[name]);
      return missing.length ? `nothing here is called "${missing[0]}"` : null;
    },
    run: (ctx, args) => ({ mutations: [{ op: "set_field", id: here(ctx), field: {
      name: "vocabulary", form: "text", value: list(args["packages"]).join(" "),
    } }] }),
  },
);

/** A list somebody typed, however they separated it. */
function list(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw ?? "").split(/[\s,]+/).filter(Boolean);
}

/** Adjustments: positional, unsayable, gesture-only. Never named or ranked, so
 *  they are not on the registry — but they write mutations and they undo. */
export const adjustments = {
  place: (moved: { id: Id; x: number; y: number }[]): Mutation[] =>
    moved.map((m) => ({ op: "place_block", id: m.id, x: m.x, y: m.y })),
  size: (id: Id, w: number, h: number): Mutation[] => [{ op: "size_block", id, w, h }],
  seat: (id: Id, side: Side, at: number): Mutation[] => [{ op: "set_port", id, side, at }],
  wall: (id: Id, end: "from" | "to", side: Side | null, at?: number): Mutation[] =>
    [{ op: "set_side", id, end, side, ...(at === undefined ? {} : { at }) }],
};

/** Re-exported so a caller can read a layer without importing the fold too. */
export { arrangement_of, children, edges_in };
