/** The action registry: the closed surface every input method works against.
 *
 *  An action returns mutations; it never applies them. One seam serves the
 *  pointer, the keyboard and the terminal, so no input path can do something
 *  the others cannot.
 *
 *  An action writing no mutations is navigation: no step, nothing to undo, and
 *  a text interface never offers it. */

import { arrangement_of, at_cell, can_hold, children, covers, edges_in, head_of,
         is_grid, is_group, is_header, is_holder, is_interface, is_reference, layer_id,
         def_of, may_retype, members_of, module_of, module_named, next_num, next_alias,
         path, reorder } from "./fold";
import { NUMBERS } from "./components";
import { def_id, new_id } from "./ids";
import { ARRANGEMENTS, VALUE_FORMS,
         type Arrangement, type Block,
         type Cell, type Components, type Definition, type Dir, type FieldDef,
         type Flow, type Graph, type Id,
         type Mutation, type RelationModule, type Side, type Span, type ValueForm } from "./types";

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

/** What is under the pointer, or what is selected.
 *
 *  **A cell is a scope of its own.** It has no id — it is a group plus a row
 *  and a column — so it cannot ride in `picked` without pretending to be a
 *  block, which would leak into everything that looks one up. */
export type Scope = "layer" | "block" | "edge" | "interface" | "selection" | "cell";

export type Args = Record<string, unknown>;

/** How a surface reaches an action. Every panel takes one and none of them
 *  knows what happens next — which is the whole of what a surface may do to
 *  the model, so it is named once here rather than three identical times. */
export type Act = (name: string, args?: Args) => void;

/** Where the app should be looking afterwards. Never a mutation. */
export type Effect = { open?: Id | null; focus?: Id | null; say?: string };

export type Result = { mutations: Mutation[]; effect?: Effect };

/** One cell, named the only way a cell can be: the group it is in and where. */
export type Spot = { group: Id; r: number; c: number };

export type Context = {
  graph: Graph;
  /** The open layer. */
  layer: Id | null;
  /** What is picked within it. */
  picked: Id[];
  /** Which cells are picked, where any are. **Beside `picked`, never inside
   *  it** — a cell is an address rather than a thing. */
  cells?: readonly Spot[];
  /** The layer this one was opened from, where anybody knows. **Only the way
   *  out needs it**, and only for the one thing that is drawn in two layers at
   *  once — see `open`. */
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
    : s === "cell" ? !!ctx.cells?.length
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
  return !["open", "reveal"].includes(name);
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

/** A number somebody said, or null. **Absent is not zero** — a grid asked for
 *  no rows is a grid nobody said anything about. */
const num = (args: Args, key: string): number | null => {
  const said = args[key];
  if (typeof said === "number") return Number.isFinite(said) ? Math.round(said) : null;
  const read = Number(said);
  return said !== undefined && said !== "" && Number.isFinite(read) ? Math.round(read) : null;
};

/** An address somebody said, however they said it: `{r, c}` or `"r,c"`. */
const cell_of_arg = (args: Args, key: string): Cell | null => {
  const said = args[key];
  if (said && typeof said === "object") {
    const { r, c } = said as Cell;
    return typeof r === "number" && typeof c === "number" ? { r, c } : null;
  }
  const [r, c] = String(said ?? "").split(/[\s,]+/).map(Number);
  return Number.isFinite(r!) && Number.isFinite(c!) ? { r: r!, c: c! } : null;
};

/** Where each member of a captured sweep lands. Malformed entries are ignored
 *  rather than thrown on — a gesture may hand in what it worked out, and what
 *  it could not work out is simply absent. */
const seats = (args: Args): { id: Id; r: number; c: number }[] => {
  const said = args["seats"];
  if (!Array.isArray(said)) return [];
  return said
    .filter((s): s is { id: Id; r: number; c: number } =>
      !!s && typeof s === "object" && typeof (s as { id?: unknown }).id === "string"
      && typeof (s as { r?: unknown }).r === "number"
      && typeof (s as { c?: unknown }).c === "number")
    .map((s) => ({ id: s.id, r: s.r, c: s.c }));
};

/** The region an action was pointed at, as one rectangle.
 *
 *  **The picked cells, or the pair an argument names.** A drag picks a range
 *  and a typed line says two corners; both are the same rectangle, so both
 *  arrive here and nothing downstream knows which it was. */
function region(ctx: Context, args: Args): { group: Id; span: Span } | null {
  const picked = ctx.cells ?? [];
  const group = args["group"] ? id_of(args, "group") : picked[0]?.group;
  if (!group || !ctx.graph.blocks[group]) return null;
  const from = cell_of_arg(args, "at") ?? cell_of_arg(args, "into");
  const spots = args["at"] || args["into"]
    ? [from, cell_of_arg(args, "into")].filter((c): c is Cell => !!c)
    : picked.filter((p) => p.group === group).map((p) => ({ r: p.r, c: p.c }));
  if (!spots.length) return null;
  const r = Math.min(...spots.map((s) => s.r));
  const c = Math.min(...spots.map((s) => s.c));
  return { group, span: { r, c,
    rows: Math.max(...spots.map((s) => s.r)) - r + 1,
    cols: Math.max(...spots.map((s) => s.c)) - c + 1 } };
}

/** The one door making a block, so every caller places and numbers alike. */
function make_block(ctx: Context, label: string, parent: Id | null, type?: Id): Mutation[] {
  const id = new_id("block");
  return [{ op: "add_block", block: {
    id, parent, label: label || undefined, type,
    num: next_num(ctx.graph, parent), alias: next_alias(ctx.graph),
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
      if (!ctx.graph.blocks[id]) return "that block is not there";
      return text(args, "label") ? null : "a name is required";
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
        : [{ op: "set_def", def: { id: def, group: "relation", name: label } }];
      return { mutations: [...out, { op: "update_edge", id, type: def }] };
    },
  },
  {
    name: "retype",
    about: "sets which definition a block or a relationship names",
    on: ["block", "edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "type", form: "text", required: true }],
    /** **A subtype refines what a thing is like, never what it is.** A block, a
     *  folder and a resource are one family and swap freely; everything else
     *  stays its own kind, because a group, an interface, a reference and a
     *  note each carry something a change of type cannot invent. */
    check: (ctx, args) => {
      const id = id_of(args, "id");
      if (ctx.graph.edges[id]) return null;
      if (!ctx.graph.blocks[id]) return "that block is not there";
      const type = text(args, "type") || undefined;
      if (type && !ctx.graph.defs[type]) return `there is no definition called "${type}"`;
      return may_retype(ctx.graph, id, type)
        ? null
        : `a ${module_of(ctx.graph, id)} cannot become a ${module_named(ctx.graph, type)}`;
    },
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
    about: "puts blocks under a different parent, in the place you dropped them",
    on: ["block", "selection"],
    /** **One or several, in one step.** A selection dragged somewhere is one
     *  thing you did, so it is one entry in the log and one undo — moving them
     *  a block at a time left as many, and any one of them refused left the
     *  rest somewhere nobody asked for. `id` is still read, so a caller with
     *  one block says so. */
    args: [{ name: "ids", form: "block", required: true },
           { name: "parent", form: "block", required: true },
           /** Which sibling they go in front of. **Absent is last**, which is
            *  where anything arriving somewhere new belongs unless you said
            *  otherwise by dropping it between two things. */
           { name: "before", form: "block" }, { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      const parent = args["parent"] === null ? null : id_of(args, "parent");
      if (!ids.length) return "nothing is selected";
      for (const id of ids) {
        if (id === ctx.graph.root) return "the workspace cannot be moved";
        if (id === parent) return "a block cannot contain itself";
        if (parent && path(ctx.graph, parent).some((b) => b.id === id)) {
          return "a block cannot be moved inside itself";
        }
      }
      return null;
    },
    run: (ctx, args) => {
      const ids = ids_of(ctx, args);
      const parent = args["parent"] === null ? null : id_of(args, "parent");
      const before = args["before"] ? id_of(args, "before") : null;
      const out: Mutation[] = ids.map((id): Mutation => ({ op: "move_block", id, parent }));
      /** **Where they sit, not just what holds them.** A block keeps the number
       *  it was made with, which among its new siblings is somebody else's
       *  place in the queue — so arriving anywhere renumbers the list it
       *  arrives in. */
      for (const at of reorder(ctx.graph, parent, ids, before)) {
        out.push({ op: "order_block", id: at.id, num: at.num });
      }
      /** A spot is where one thing was let go of. Several were let go of in one
       *  place, and only the layer can say where each of them belongs. */
      const at = ids.length === 1 ? spot(args) : null;
      if (at) out.push({ op: "place_block", id: ids[0]!, x: at.x, y: at.y });
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
    about: "opens a block as the layer being drawn, or leaves this one when told no block",
    on: ["block"],
    args: [{ name: "id", form: "block" }],
    /** **A layer has to be there.** Nothing else checks what becomes the open
     *  layer, so an id naming a block that is gone — a stale menu, a step
     *  undone, a target that did not travel — made it the layer anyway, and
     *  what drew was a frame called *missing* with nothing inside it. */
    check: (ctx, args) => {
      const want = id_of(args, "id");
      return !want || ctx.graph.blocks[want] ? null : "that is not here any more";
    },
    /** **Absent `id` is the way out.** Opening and leaving differ only in where
     *  the layer comes from — one is named and one is derived — so a second
     *  action for the derived case was a second name for the same act.
     *
     *  **An interface is drawn in two layers at once**: seated on its owner's
     *  border, out in the layer that holds the owner, and set into the wall of
     *  that owner seen from the inside. Its parent is the owner, so leaving one
     *  always landed inside a card you may never have opened — going into a
     *  port on a card and coming straight back out put you somewhere else.
     *
     *  So the way out of an interface is the way in, where the way in is one of
     *  the two layers that draw it. Everything else leaves for what holds it,
     *  which is the same answer by a shorter road. */
    run: (ctx, args) => {
      const want = id_of(args, "id");
      if (want) return { mutations: [], effect: { open: want, focus: null } };
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
           /** **Three of the four.** A reference line is assigned from what
            *  sits at its ends, so it is nobody's to pick. */
           { name: "module", form: "choice", choices: ["line", "directed", "tie"] },
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
    about: "sets which way a relationship's arrows point, or takes them off",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "dir", form: "choice", required: true,
             choices: ["none", "forward", "back", "both"] }],
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
    /** **A plain line is `none`.** Whether a relationship is a line or directed
     *  and which way its arrows point were two settings saying one thing: a
     *  line is a directed relationship pointing nowhere. */
    run: (_ctx, args) => {
      const id = id_of(args, "id");
      const dir = String(args["dir"]) as Dir;
      return { mutations: [
        { op: "set_form", id, module: dir === "none" ? "line" : "directed" },
        { op: "set_dir", id, dir },
      ] };
    },
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

/** What a chain may draw. **Three of the four** — a reference line is assigned
 *  from what sits at its ends, so it is nobody's to pick. */
const CHAINED: readonly RelationModule[] = ["line", "directed", "tie"];

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
    about: "puts an interface on an edge of a block, and takes a relationship to it",
    on: ["block"],
    when: (ctx) => {
      const one = ctx.picked.length === 1 ? ctx.picked[0] : undefined;
      if (!one) return true;
      return !is_holder(ctx.graph, one) && module_of(ctx.graph, one) !== "note";
    },
    /** **Promotion is this action with two more arguments.** Naming the seat a
     *  relationship already meets *is* making an interface there and telling
     *  that end about it, so `edge` and `end` are the whole of the difference.
     *  Only a gesture on the end knows both, which is why nothing else fills
     *  them. */
    args: [{ name: "owner", form: "block", required: true },
           { name: "side", form: "choice", choices: SIDES },
           { name: "at", form: "number" },
           { name: "edge", form: "block" },
           { name: "end", form: "choice", choices: ["from", "to"] }],
    check: (ctx, args) => {
      const owner = id_of(args, "owner");
      const block = ctx.graph.blocks[owner];
      if (!block) return "needs a border to sit on";
      if (is_holder(ctx.graph, owner)) return "a boundary cannot have an interface";
      if (module_of(ctx.graph, owner) === "note") return "a note has no wall to set one into";
      const edge = text(args, "edge");
      if (edge && !ctx.graph.edges[edge]) return "needs a relationship";
      return null;
    },
    /** The wall the end was pinned to goes with the promotion — it is the
     *  interface's own wall now, and nothing about the line moves. */
    run: (ctx, args) => {
      const owner = id_of(args, "owner");
      const side = side_of(args, "side") ?? "right";
      const id = new_id("block");
      const edge = text(args, "edge");
      const end = args["end"] as "from" | "to" | undefined;
      const out: Mutation[] = [{ op: "add_block", block: {
        id, parent: owner, side,
        at: typeof args["at"] === "number" ? (args["at"] as number)
                                           : mid_of(ctx.graph, owner, side),
        num: next_num(ctx.graph, owner),
      } }];
      if (edge && end) {
        out.push({ op: "set_end", id: edge, end, port: id },
                 { op: "set_side", id: edge, end, side: null });
      }
      return { mutations: out, effect: { focus: id } };
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

/** **Merging boundaries is not nesting them.** Wrapping a selection draws one rim
 *  round everything in it — so a group in the selection yields its members, not
 *  another group inside a group. Dragging into `into` is the only way to nest. */
function merged_members(graph: Graph, members: Id[], into: Id | null)
    : { members: Id[]; dissolve: Id[] } {
  if (into) return { members, dissolve: [] };
  const out: Id[] = [];
  const dissolve: Id[] = [];
  for (const id of members) {
    if (is_group(graph, id)) {
      for (const m of members_of(graph, id)) out.push(m.id);
      dissolve.push(id);
    } else {
      out.push(id);
    }
  }
  return { members: out, dissolve };
}

register(
  {
    name: "group",
    about: "draws a boundary round what is selected, or a grid over a region",
    on: ["layer", "selection"],
    /** **One act with different arguments.** *Draw a grid here* and *draw a
     *  boundary round these* are different modules now — extent makes a grid. */
    args: [{ name: "members", form: "block" }, { name: "into", form: "block" },
           { name: "rows", form: "number" }, { name: "cols", form: "number" },
           /** Where each member lands, for a sweep that captured what it drew
            *  over. **One act and one undo** — drawing a grid over four loose
            *  cards is one thing you did. */
           { name: "seats", form: "text" },
           { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const said = args["into"] ? id_of(args, "into") : null;
      const picked = ((args["members"] as Id[]) ?? (said ? [] : ctx.picked))
        .filter((id) => ctx.graph.blocks[id] && id !== said);
      const { members } = merged_members(ctx.graph, picked, said);
      const extent = num(args, "rows") !== null || num(args, "cols") !== null;
      if (!members.length && !extent && !said) return "nothing is selected";
      if (said) {
        for (const id of picked) {
          if (!can_hold(ctx.graph, said, id)) return "that cannot go in there";
        }
      }
      return null;
    },
    run: (ctx, args) => {
      const said = args["into"] ? id_of(args, "into") : null;
      /** **Naming a group is not joining it.** With `into` given and nobody
       *  named, this is a setting on the group itself — and taking the
       *  selection as members put the group inside itself, because the group is
       *  what was picked. */
      const picked = ((args["members"] as Id[]) ?? (said ? [] : ctx.picked))
        .filter((id) => ctx.graph.blocks[id] && id !== said);
      const { members, dissolve } = merged_members(ctx.graph, picked, said);
      const into = said;
      const rows = num(args, "rows") === null ? null : Math.max(1, num(args, "rows")!);
      const cols = num(args, "cols") === null ? null : Math.max(1, num(args, "cols")!);
      const out: Mutation[] = [];
      let group = into;
      if (!group) {
        const extent = rows !== null || cols !== null;
        group = new_id("block");
        out.push({ op: "add_block", block: {
          id: group, parent: here(ctx), type: extent ? "grid" : "group",
          num: next_num(ctx.graph, here(ctx)),
          ...(!extent ? { labelled: false } : {}),
        } });
      }
      if (rows !== null || cols !== null) {
        out.push({ op: "set_grid", id: group,
                   ...(rows === null ? {} : { rows }),
                   ...(cols === null ? {} : { cols }) });
      }
      /** **A grid shrinking frees what falls outside it**, rather than leaving
       *  addresses nobody can point at. A layout gesture must not destroy model
       *  content, so the block stays on the layer and loses its cell. */
      const was = ctx.graph.blocks[group];
      if (was && (rows !== null || cols !== null)) {
        const height = rows ?? was.rows ?? 1;
        const width = cols ?? was.cols ?? 1;
        for (const b of members_of(ctx.graph, group)) {
          if (b.cell && (b.cell.r >= height || b.cell.c >= width)) {
            out.push({ op: "seat_cell", id: b.id, cell: null });
          }
        }
        for (const span of was.merges ?? []) {
          if (span.r + span.rows > height || span.c + span.cols > width) {
            out.push({ op: "split_cells", id: group, r: span.r, c: span.c });
          }
        }
      }
      /** **A grid owns its corner**, or an empty one would be nothing. A band
       *  is its members' bounds and also lives on the layer. */
      const at = spot(args);
      if (at) out.push({ op: "place_block", id: group, x: at.x, y: at.y });
      for (const id of members) out.push({ op: "set_group", id, group });
      for (const seat of seats(args)) {
        if (members.includes(seat.id)) {
          out.push({ op: "seat_cell", id: seat.id, cell: { r: seat.r, c: seat.c } });
        }
      }
      for (const id of dissolve) out.push({ op: "delete_block", id });
      return { mutations: out };
    },
  },
  {
    name: "leave",
    about: "takes a block out of the group it is in",
    on: ["block", "selection"],
    args: [{ name: "ids", form: "block", required: true }],
    run: (ctx, args) => ({ mutations: ids_of(ctx, args)
      .map((id): Mutation => ({ op: "set_group", id, group: null })) }),
  },
  {
    name: "note",
    about: "writes a note about a block or a relationship, tied to it",
    on: ["block", "edge"],
    /** **A note is always about something.** The note and the tie are made in
     *  one step, because a remark with nothing to point at is a caption on the
     *  wallpaper — and right-drag on empty ground draws a group now, so there
     *  is no gesture that could make a loose one. */
    args: [{ name: "about", form: "block", required: true },
           { name: "text", form: "text", required: true, asks: true },
           { name: "spot", form: "spot" },
           { name: "w", form: "number" }, { name: "h", form: "number" }],
    check: (ctx, args) => {
      if (!text(args, "text")) return "a note is its text";
      const about = id_of(args, "about") || ctx.picked[0] || "";
      return ctx.graph.blocks[about] || ctx.graph.edges[about]
        ? null : "a note is always about something";
    },
    /** **A note is the one card whose size is yours to set**, so the gesture
     *  that draws one may say how big. */
    run: (ctx, args) => {
      const id = new_id("block");
      const about = id_of(args, "about") || ctx.picked[0]!;
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
      /** **A tie, because one end is a note.** The module is assigned from what
       *  sits at the ends and never picked, so this says who it is about and
       *  the engine says what sort of line that is. */
      const to = ctx.graph.edges[about] ? null : about;
      if (to) {
        out.push({ op: "link_blocks", edge: { id: new_id("edge"), from: id, to,
                                              module: "tie" } });
      }
      return { mutations: out, effect: { focus: id } };
    },
  },
);

// ---------------------------------------------------------------- the grid

/** A row or column added or taken away, and everything after it moved.
 *
 *  **Displacement is never destructive**: a block in a row that goes loses its
 *  address and stays on the layer, because a layout gesture must not destroy
 *  model content. **A merge the line passes through stretches or shrinks
 *  rather than splitting** — the fiddliest arithmetic here, and the reason
 *  every span is taken away before any is put back: a shifted one may land on
 *  where another used to be. */
function shifted(graph: Graph, group: Id, way: "row" | "col", at: number,
                 by: 1 | -1): Mutation[] {
  const g = graph.blocks[group];
  if (!g || !is_grid(graph, group)) return [];
  const axis = way === "row" ? "r" : "c";
  const size = way === "row" ? "rows" : "cols";
  const out: Mutation[] = [];
  const put: Mutation[] = [];

  out.push({ op: "set_grid", id: group, [size]: Math.max(1, g[size]! + by) } as Mutation);

  /** Where everything ends up, worked out before anything is written — the line
   *  that goes leaves blocks with nowhere to be, and where they go depends on
   *  what the rest have taken. */
  const held = new Set<string>();
  const homeless: { id: Id; was: Cell }[] = [];
  const kept: Mutation[] = [];
  for (const b of members_of(graph, group)) {
    if (!b.cell) continue;
    const n = b.cell[axis];
    if (by < 0 && n === at) { homeless.push({ id: b.id, was: { ...b.cell } }); continue; }
    const cell = by > 0 ? (n >= at ? { ...b.cell, [axis]: n + by } : { ...b.cell })
                        : (n > at ? { ...b.cell, [axis]: n + by } : { ...b.cell });
    held.add(`${cell.r},${cell.c}`);
    if (cell.r !== b.cell.r || cell.c !== b.cell.c) {
      kept.push({ op: "seat_cell", id: b.id, cell });
    }
  }
  out.push(...kept);

  /** **A line taken away moves what it held, rather than dropping it.** Freed
   *  outright a block landed at the foot of the layer with its relationships
   *  still attached, which reads as a line coming adrift. It is only freed once
   *  there is genuinely nowhere in the grid left for it. */
  const shrunk = { ...g, [size]: Math.max(1, g[size]! + by) };
  for (const { id, was } of homeless) {
    const spare = free_cell(shrunk, held, { r: -1, c: -1, rows: 0, cols: 0 },
                            { r: Math.min(was.r, (shrunk.rows ?? 1) - 1),
                              c: Math.min(was.c, (shrunk.cols ?? 1) - 1) });
    if (spare) held.add(`${spare.r},${spare.c}`);
    out.push({ op: "seat_cell", id, cell: spare });
  }

  for (const span of g.merges ?? []) {
    const start = span[axis];
    const len = span[size];
    const through = start <= at && at < start + len;
    const after = by > 0 ? start >= at : start > at;
    if (!through && !after) continue;
    out.push({ op: "split_cells", id: group, r: span.r, c: span.c });
    const moved: Span = { ...span, [axis]: after ? start + by : start,
                                   [size]: through && !after ? len + by : len };
    if (moved[size] > 0) put.push({ op: "merge_cells", id: group, span: moved });
  }
  return [...out, ...put];
}

/** Every filled cell of a grid, in the order a page reads: left to right, row
 *  by row, and **on across the row below**.
 *
 *  **One run, not one per row.** A chain is a sequence over everything the grid
 *  holds, so where a row ends is where the next carries on. A merged region
 *  answers at every address it covers, so the same block is never handed back
 *  twice running. */
function reading(graph: Graph, group: Id): Id[] {
  const g = graph.blocks[group];
  if (!g || !is_grid(graph, group)) return [];
  const run: Id[] = [];
  for (let r = 0; r < (g.rows ?? 0); r++) {
    for (let c = 0; c < (g.cols ?? 0); c++) {
      const held = at_cell(graph, group, r, c);
      /** **A header says what a line *is***, not a step along it, so it is
       *  passed over wherever it sits. */
      if (held && !is_header(held) && run[run.length - 1] !== held.id) run.push(held.id);
    }
  }
  return run;
}

/** Every address in a grid nobody has claimed. **A merged region is one cell**,
 *  so it answers once, at its corner. */
function empty_cells(graph: Graph, group: Id): Cell[] {
  const g = graph.blocks[group];
  if (!g || !is_grid(graph, group)) return [];
  const out: Cell[] = [];
  for (let r = 0; r < (g.rows ?? 0); r++) {
    for (let c = 0; c < (g.cols ?? 0); c++) {
      const span = g.merges?.find((s) => covers(s, r, c));
      if (span && (span.r !== r || span.c !== c)) continue;
      if (!at_cell(graph, group, r, c)) out.push({ r, c });
    }
  }
  return out;
}

/** The free cell nearest the one asked for, outside a span and outside what is
 *  already spoken for. Null where the grid has no room left. */
function free_cell(g: Graph["blocks"][string], taken: ReadonlySet<string>,
                   span: Span, want: Cell): Cell | null {
  let best: Cell | null = null;
  let gap = Infinity;
  for (let r = 0; r < (g.rows ?? 0); r++) {
    for (let c = 0; c < (g.cols ?? 0); c++) {
      if (covers(span, r, c) || taken.has(`${r},${c}`)) continue;
      if (g.merges?.some((m) => covers(m, r, c) && (m.r !== r || m.c !== c))) continue;
      const off = Math.hypot(r - want.r, c - want.c);
      if (off < gap) { gap = off; best = { r, c }; }
    }
  }
  return best;
}

/** Which line the picked cell is in. **A row or a column goes where you
 *  pointed**, and where you pointed is a cell — which of its two numbers is
 *  meant is what `way` says. */
function pointed(ctx: Context, way: "row" | "col"): number | null {
  const at = ctx.cells?.[0];
  return at ? (way === "row" ? at.r : at.c) : null;
}

/** Which grid an action is about: the one named, the one the picked cells are
 *  in, the picked block where it is one, or the grid that block sits in.
 *
 *  **Four answers because a grid is pointed at four ways** — by its rim, by one
 *  of its cells, by a block seated in it, or by name from the text surface. A
 *  refusal because the pointer landed on the block rather than the cell under
 *  it is the app being pedantic about a distinction nobody made. */
function grid_named(ctx: Context, args: Args): Id | null {
  const held = ctx.picked[0] ? ctx.graph.blocks[ctx.picked[0]]?.group : undefined;
  for (const said of [args["group"] ? id_of(args, "group") : undefined,
                      ctx.cells?.[0]?.group, ctx.picked[0], held]) {
    if (said && is_grid(ctx.graph, said)) return said;
  }
  return null;
}

/** The seated block a header question is about, or null where the thing
 *  pointed at is not one. **Asked once**, so the check and the run cannot
 *  disagree about which block they mean. */
function headed(ctx: Context, args: Args): Block | null {
  const id = id_of(args, "id") || ctx.picked[0];
  const b = id ? ctx.graph.blocks[id] : undefined;
  if (!b?.cell || !b.group || !is_grid(ctx.graph, b.group)) return null;
  return b;
}

register(
  {
    name: "seat",
    about: "puts a block in a cell of a grid, or takes it out of one",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true },
           { name: "group", form: "block" },
           { name: "at", form: "text" }],
    check: (ctx, args) => {
      const id = id_of(args, "id");
      const group = args["group"] ? id_of(args, "group") : ctx.graph.blocks[id]?.group;
      const cell = cell_of_arg(args, "at");
      if (!cell) return null;
      const g = group ? ctx.graph.blocks[group] : undefined;
      if (!g || !is_grid(ctx.graph, g.id)) return "that is not a grid";
      /** **A cell holds a block, never another holder.** A grid or a band
       *  seated in one is sized by what it holds, so the cell it was given
       *  stops saying how big it is. */
      if (!can_hold(ctx.graph, g.id, id)) return "a cell cannot hold that";
      if (cell.r < 0 || cell.c < 0 || cell.r >= g.rows! || cell.c >= g.cols!) {
        return "that cell is outside the grid";
      }
      /** **A cell holds one block**, and that is what lets an allocation be
       *  derived at all: two sharing one leaves *what is allocated to this
       *  row* without an answer. */
      const held = at_cell(ctx.graph, g.id, cell.r, cell.c);
      return held && held.id !== id ? "that cell is taken" : null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const group = args["group"] ? id_of(args, "group") : ctx.graph.blocks[id]?.group;
      const out: Mutation[] = [];
      if (group && ctx.graph.blocks[id]?.group !== group) {
        out.push({ op: "set_group", id, group });
      }
      out.push({ op: "seat_cell", id, cell: cell_of_arg(args, "at") });
      return { mutations: out };
    },
  },
  {
    name: "header",
    about: "promotes a seated block to head the line it sits in",
    on: ["block"],
    /** **One flag, because position says which line.** Row 0 heads its column,
     *  the corner heads both, anything else heads its row — so promoting is a
     *  verb with nothing to choose, and demoting is the same verb cleared. */
    args: [{ name: "id", form: "block" },
           { name: "clear", form: "choice", choices: ["yes"] }],
    check: (ctx, args) => {
      const b = headed(ctx, args);
      if (!b) return "only a block in a grid can head a line";
      if (args["clear"] === "yes") return is_header(b) ? null : "it heads nothing already";
      return is_header(b) ? `it heads its ${head_of(ctx.graph, b.id)} already` : null;
    },
    run: (ctx, args) => {
      const b = headed(ctx, args);
      return b ? { mutations: [{ op: "set_header", id: b.id,
                                 header: args["clear"] !== "yes" }] }
               : { mutations: [] };
    },
  },
  {
    name: "insert",
    about: "adds a row or a column to a grid at an index",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" },
           { name: "way", form: "choice", required: true, choices: ["row", "col"] },
           { name: "at", form: "number" }],
    check: (ctx, args) => (grid_named(ctx, args) ? null : "point at a grid, or a cell of one"),
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const way = args["way"] === "col" ? "col" : "row";
      const g = ctx.graph.blocks[group]!;
      const last = way === "row" ? g.rows! : g.cols!;
      const at = Math.min(last, Math.max(0, num(args, "at") ?? pointed(ctx, way) ?? last));
      return { mutations: shifted(ctx.graph, group, way, at, 1) };
    },
  },
  {
    name: "remove",
    about: "takes a row or a column out of a grid, freeing whatever sat in it",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" },
           { name: "way", form: "choice", required: true, choices: ["row", "col"] },
           { name: "at", form: "number" }],
    check: (ctx, args) => {
      const group = grid_named(ctx, args);
      if (!group) return "point at a grid, or a cell of one";
      const g = ctx.graph.blocks[group]!;
      return (args["way"] === "col" ? g.cols! : g.rows!) > 1 ? null : "a grid keeps one line";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const way = args["way"] === "col" ? "col" : "row";
      const g = ctx.graph.blocks[group]!;
      const last = (way === "row" ? g.rows! : g.cols!) - 1;
      const at = Math.min(last, Math.max(0, num(args, "at") ?? pointed(ctx, way) ?? last));
      return { mutations: shifted(ctx.graph, group, way, at, -1) };
    },
  },
  {
    name: "merge",
    about: "spans the cells you picked, or splits the merged one you point at",
    on: ["cell"],
    args: [{ name: "group", form: "block" }, { name: "at", form: "text" },
           { name: "into", form: "text" }],
    check: (ctx, args) => {
      const said = region(ctx, args);
      if (!said) return "no cell is pointed at";
      const g = ctx.graph.blocks[said.group];
      if (!g || !is_grid(ctx.graph, said.group)) return "that is not a grid";
      const { r, c, rows, cols } = said.span;
      return r >= 0 && c >= 0 && r + rows <= g.rows! && c + cols <= g.cols!
        ? null : "that reaches past the grid";
    },
    /** **A merge sets a cell's extent**; a footprint says how many cells a
     *  block needs. Two mechanisms that do not collide — a merged region
     *  larger than what it holds is that block centred in a tall cell.
     *
     *  **What it covers moves, rather than being thrown out.** A merged region
     *  is one cell, so it holds one block: the first it covers takes the
     *  corner, and the rest go to the nearest free cell. Freed outright they
     *  landed at the foot of the layer with their relationships still attached,
     *  which read as a line coming adrift rather than as a block being moved. */
    run: (ctx, args) => {
      const { group, span } = region(ctx, args)!;
      if (span.rows === 1 && span.cols === 1) {
        return { mutations: [{ op: "split_cells", id: group, r: span.r, c: span.c }] };
      }
      const g = ctx.graph.blocks[group]!;
      const taken = new Set<string>();
      const moved = new Set<Id>();
      for (const b of members_of(ctx.graph, group)) {
        if (b.cell && !covers(span, b.cell.r, b.cell.c)) taken.add(`${b.cell.r},${b.cell.c}`);
      }
      const out: Mutation[] = [];
      for (const b of members_of(ctx.graph, group)) {
        if (!b.cell || !covers(span, b.cell.r, b.cell.c)) continue;
        if (moved.size === 0) {
          moved.add(b.id);
          if (b.cell.r !== span.r || b.cell.c !== span.c) {
            out.push({ op: "seat_cell", id: b.id, cell: { r: span.r, c: span.c } });
          }
          continue;
        }
        const spare = free_cell(g, taken, span, b.cell);
        if (spare) taken.add(`${spare.r},${spare.c}`);
        out.push({ op: "seat_cell", id: b.id, cell: spare });
      }
      return { mutations: [...out, { op: "merge_cells", id: group, span }] };
    },
  },
  {
    name: "transpose",
    about: "turns a grid on its side — rows become columns",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" }],
    check: (ctx, args) => (grid_named(ctx, args) ? null : "point at a grid, or a cell of one"),
    /** **Nothing in the model changes.** Relations are between blocks, so the
     *  lines re-route and what the grid says is said the other way up. */
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const g = ctx.graph.blocks[group]!;
      const out: Mutation[] = [{ op: "set_grid", id: group, rows: g.cols!, cols: g.rows! }];
      /** **A header turns over with its cell and costs nothing to do it.** What
       *  headed a row sat outside row 0 and now sits in it, so it heads the
       *  column that row became — which is what a header meaning its position
       *  buys, and it is why nothing here mentions one. */
      for (const b of members_of(ctx.graph, group)) {
        if (b.cell) out.push({ op: "seat_cell", id: b.id, cell: { r: b.cell.c, c: b.cell.r } });
      }
      for (const s of g.merges ?? []) out.push({ op: "split_cells", id: group, r: s.r, c: s.c });
      for (const s of g.merges ?? []) {
        out.push({ op: "merge_cells", id: group,
                   span: { r: s.c, c: s.r, rows: s.cols, cols: s.rows } });
      }
      return { mutations: out };
    },
  },
  {
    name: "chain",
    about: "links every filled cell of a grid, in the order it reads",
    on: ["block", "cell"],
    /** **The module the rail has picked**, so a chain draws the same sort of
     *  line a right drag would. A tie to a note and a reference line are still
     *  assigned from what sits at the ends. */
    args: [{ name: "group", form: "block" },
           { name: "module", form: "choice", choices: ["line", "directed", "tie"] }],
    check: (ctx, args) => {
      const group = grid_named(ctx, args);
      if (!group) return "point at a grid, or a cell of one";
      return reading(ctx.graph, group).length > 1
        ? null : "a chain needs two filled cells";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const said = text(args, "module");
      const picked = CHAINED.find((m) => m === said) ?? "directed";
      const drawn = new Set(edges_in(ctx.graph, ctx.layer).map((e) => `${e.from}|${e.to}`));
      const run = reading(ctx.graph, group);
      const out: Mutation[] = [];
      for (let n = 1; n < run.length; n++) {
        const from = run[n - 1]!;
        const to = run[n]!;
        if (drawn.has(`${from}|${to}`)) continue;
        drawn.add(`${from}|${to}`);
        out.push({ op: "link_blocks", edge: {
          id: new_id("edge"), from, to,
          module: derived_module(ctx.graph, from, to) ?? picked } });
      }
      return { mutations: out,
               ...(out.length ? {} : { effect: { say: "every neighbour is linked already" } }) };
    },
  },
  {
    name: "fill",
    about: "puts a new block in every empty cell of a grid",
    on: ["block", "cell"],
    /** **A batch of blocks nobody has named yet.** Each gets the alias it would
     *  have got one at a time, so a grid of eight is `A1`…`A8` and naming them
     *  is the only thing left to do. */
    args: [{ name: "group", form: "block" }],
    check: (ctx, args) => {
      const group = grid_named(ctx, args);
      if (!group) return "point at a grid, or a cell of one";
      return empty_cells(ctx.graph, group).length ? null : "every cell is taken";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const parent = ctx.graph.blocks[group]?.parent ?? null;
      /** **Counted forward here.** Both readers answer from the graph as it
       *  stands, and nothing is applied until the step lands — so asking twice
       *  would hand out one number twice. */
      let num = next_num(ctx.graph, parent);
      let alias = next_alias(ctx.graph);
      const out: Mutation[] = [];
      for (const cell of empty_cells(ctx.graph, group)) {
        const id = new_id("block");
        out.push({ op: "add_block", block: { id, parent, num: num++, alias: alias++ } });
        out.push({ op: "set_group", id, group });
        out.push({ op: "seat_cell", id, cell });
      }
      return { mutations: out };
    },
  },
);

// ---------------------------------------------------------------- fields and definitions

/** **A package resists editing.** A definition carrying a `from` is somebody
 *  else's vocabulary — the shipped floor's, or a package that was brought in —
 *  and the floor is re-laid under every fold, so a write to one has nowhere to
 *  live. Refused here and said out loud rather than stripped at the door, which
 *  is silent. A workspace wanting its own says so with a subtype. */
/** What `extends` names: **an id if one is there, else a name, else the id
 *  that name would mint.** A panel hands over an id and a person types a name,
 *  and slugging unconditionally turned `block` into `def_block` — a definition
 *  that is not there, which the door then blanked. */
function rooted(ctx: Context, said: string): Id | undefined {
  if (!said) return undefined;
  if (ctx.graph.defs[said]) return said;
  const by_name = Object.values(ctx.graph.defs).find((d) => d.name === said);
  return by_name?.id ?? def_id(said);
}

/** The definition an id means. **A definition names itself; a block names the
 *  one it resolves through**, so *make this the default* can be said by pointing
 *  at a customised block rather than by finding its type in a list first —
 *  which is how somebody arrives at wanting it. */
function named_def(ctx: Context, id: Id): Id | undefined {
  return ctx.graph.defs[id] ? id : def_of(ctx.graph, id);
}

function borrowed(graph: Graph, id: Id): string | null {
  const d = graph.defs[id];
  if (!d?.from) return null;
  return `"${d.name}" comes from ${d.from} — extend it with a subtype instead`;
}

register(
  {
    name: "field",
    about: "sets a named value on this, or adds a field to a definition so every usage carries one",
    on: ["layer", "block", "edge"],
    /** **One act, and the holder says which.** Setting a value on a usage and
     *  declaring a field on a definition are the same thing said about two
     *  sorts of holder — `form`, `unit` and `choices` describe a field and are
     *  read only when the holder is a definition. */
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true },
           { name: "value", form: "text" },
           { name: "form", form: "choice", choices: VALUE_FORMS },
           { name: "unit", form: "text" },
           { name: "choices", form: "text" }],
    check: (ctx, args) => (text(args, "name") ? null : "a field needs a name")
      ?? borrowed(ctx.graph, id_of(args, "holder")),
    /** **Fields union with the subtype's winning by name**, so declaring one
     *  that is already there rewrites it rather than doubling it. */
    run: (ctx, args) => {
      const holder = id_of(args, "holder");
      const name = text(args, "name");
      const d = ctx.graph.defs[holder];
      if (!d) {
        return { mutations: [{ op: "set_field", id: holder, field: {
          name, form: "text", value: String(args["value"] ?? ""),
        } }] };
      }
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
    name: "unfield",
    about: "drops a named value from this, or a field from a definition",
    on: ["layer", "block", "edge"],
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true }],
    check: (ctx, args) => borrowed(ctx.graph, id_of(args, "holder")),
    run: (ctx, args) => {
      const holder = id_of(args, "holder");
      const name = text(args, "name");
      const d = ctx.graph.defs[holder];
      if (!d) return { mutations: [{ op: "drop_field", id: holder, name }] };
      return { mutations: [{ op: "set_def", def: {
        ...d, fields: (d.fields ?? []).filter((f) => f.name !== name),
      } }] };
    },
  },
  {
    name: "define",
    about: "names a new definition, or renames one this layer already has",
    on: ["layer"],
    args: [{ name: "name", form: "text", required: true },
           { name: "group", form: "choice", choices: ["block", "relation"] },
           { name: "extends", form: "text" }],
    check: (ctx, args) => (text(args, "name") ? null : "a definition needs a name")
      ?? borrowed(ctx.graph, def_id(text(args, "name"))),
    /** **Over what is there, never instead of it.** The id is minted from the
     *  name, so saying the same name again is the same definition — and
     *  replacing the record wholesale threw away every component and field it
     *  had, which turned *point it at a different parent* into *start over*.
     *  Only what was said changes. */
    run: (ctx, args) => {
      const name = text(args, "name");
      const id = def_id(name);
      const held = ctx.graph.defs[id];
      return { mutations: [{ op: "set_def", def: {
        ...held,
        id, name,
        group: (args["group"] as "block" | "relation") ?? held?.group ?? "block",
        extends: args["extends"] === undefined ? held?.extends
                                               : rooted(ctx, text(args, "extends")),
      } }] };
    },
  },
  {
    name: "default",
    about: "makes this definition the one every plain block of its kind follows",
    on: ["layer", "block"],
    /** **A checkbox, not a system.** The want is *make every plain block read
     *  like this one*, and a definition already says how a thing reads — so it
     *  wears the base kind it stands in for and `def_of` asks one more
     *  question. There is no reserved id, no second vocabulary and nothing to
     *  put back when it is taken off.
     *
     *  **One at a time, and only its own kind.** A folder definition cannot be
     *  the default for blocks, and a package's cannot be a default at all —
     *  which is the whole of *a package must not take over a project*. */
    args: [{ name: "id", form: "text", required: true },
           { name: "on", form: "choice", choices: ["yes", "no"] }],
    check: (ctx, args) => {
      const id = named_def(ctx, id_of(args, "id"));
      const d = id ? ctx.graph.defs[id] : undefined;
      if (!d) return `there is nothing called "${id_of(args, "id")}" to make a default`;
      if (d.from) return `"${d.name}" comes from ${d.from} — only your own may be a default`;
      if (d.group !== "block") return "only a block definition may be a default";
      return null;
    },
    /** **Defensive about a definition that is not there.** `check` refuses one,
     *  but a run is reachable directly and there is nothing to say without it. */
    run: (ctx, args) => {
      const id = named_def(ctx, id_of(args, "id"));
      const d = id ? ctx.graph.defs[id] : undefined;
      if (!d || !id) return { mutations: [] };
      const off = args["on"] === "no" || args["on"] === false;
      const kind = module_named(ctx.graph, id);
      const out: Mutation[] = [];
      /** **Whatever held the kind gives it up first**, so the two never
       *  disagree and the swap is one step and one undo. */
      for (const held of Object.values(ctx.graph.defs)) {
        if (held.id !== id && held.default === kind) {
          out.push({ op: "set_def", def: { ...held, default: undefined } });
        }
      }
      out.push({ op: "set_def", def: { ...d, default: off ? undefined : kind } });
      return { mutations: out,
               effect: { say: off ? `${d.name} is no longer the default`
                                  : `plain ${kind}s follow ${d.name}` } };
    },
  },
);

/** **`undefine` was retired, and `unpin` is the one remover.** Dropping a
 *  definition without dissolving it left every block that named it drawing
 *  differently for no reason anybody asked for — two verbs for one act, where
 *  only one of them was lossless. */

/** **A vocabulary built by pointing.** Point at a block that already reads the
 *  way you want and make that a definition, rather than writing one first and
 *  applying it after.
 *
 *  **The pin is the moment somebody says *these are the same kind of thing*.**
 *  That is not derivable from the graph, which is why it is stored and why
 *  customising a block files nothing on its own. `look` over a selection
 *  already covers *make these look alike, now*; this is the other need. */
register(
  {
    name: "pin",
    about: "makes this block's look a definition anything else can name",
    on: ["block"],
    /** **Everything the block says, and a name. No other arguments.** Three
     *  toggles asked somebody to decide, at the moment of pointing at a thing,
     *  questions they had no way to answer yet — and every one of them had an
     *  obvious answer. What a block says about how it draws and what it asks is
     *  what makes it that kind of thing, so all of it travels. */
    args: [{ name: "id", form: "block", required: true },
           { name: "name", form: "text", required: true, asks: true }],
    /** **Duplicates are allowed when the names differ**, so nothing is matched
     *  or merged: two things reading alike today may diverge tomorrow. What is
     *  refused is a second definition wanting a name that is taken, said with
     *  the name rather than with the id it slugged to. */
    check: (ctx, args) => {
      const id = id_of(args, "id");
      if (!ctx.graph.blocks[id]) return "pick a block to pin";
      const name = text(args, "name");
      if (!name) return "a definition needs a name";
      const held = ctx.graph.defs[def_id(name)];
      return held ? `"${held.name}" is already taken` : null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const b = ctx.graph.blocks[id]!;
      const name = text(args, "name");
      const taken: Components = {};
      for (const [key, config] of Object.entries(b.looks ?? {})) taken[key] = { ...config };
      /** **The schema, never the values.** What a block happens to hold is that
       *  block's answer; reading it as the default for every future one is a
       *  guess, and the values stay where they were either way. */
      const fields = (b.fields ?? []).map((f): FieldDef => ({ name: f.name, form: f.form }));

      /** **`from` absent, because this workspace made it** — which is the whole
       *  of where a definition belongs. Every layer can reach it either way:
       *  resolution is by id and never by where a record sits. */
      const def: Definition = {
        id: def_id(name), group: "block", name,
        extends: def_of(ctx.graph, id),
        fields: fields.length ? fields : undefined,
        components: Object.keys(taken).length ? taken : undefined,
      };

      const out: Mutation[] = [{ op: "set_def", def },
                               { op: "update_block", id, type: def.id }];
      /** **The block drops what moved and keeps what did not.** Nothing about
       *  how it draws changes — it reads the same answers one layer further
       *  along the chain, which is what makes them reachable by anything else. */
      for (const [key, config] of Object.entries(taken)) {
        for (const prop of Object.keys(config)) {
          out.push({ op: "set_look", id, key, name: prop, value: null });
        }
      }
      return { mutations: out, effect: { say: `pinned ${name}` } };
    },
  },
  {
    name: "unpin",
    about: "dissolves a definition back into everything that named it, and drops it",
    on: ["layer"],
    /** **One act, and lossless.** What the definition said goes into each
     *  block's own `looks`, its field schema into each block's `fields` with no
     *  values, and only then is it dropped — so nothing about the drawing
     *  changes and nothing has to be put back by hand.
     *
     *  A `ws.<kind>` override is unpinned the same way: no block *names* it, so
     *  there is nothing to dissolve, and dropping it brings the base row back. */
    args: [{ name: "id", form: "text", required: true }],
    check: (ctx, args) => {
      const id = id_of(args, "id");
      if (!ctx.graph.defs[id]) return `there is nothing called "${id}" to unpin`;
      return borrowed(ctx.graph, id);
    },
    /** **Defensive about a definition that is not there.** `check` refuses one,
     *  but a run is reachable directly and the drop is the answer either way. */
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const d = ctx.graph.defs[id];
      const out: Mutation[] = [];

      for (const b of Object.values(ctx.graph.blocks)) {
        if (b.type !== id) continue;
        /** **The block's own word wins.** It was already the last layer over
         *  this definition, so a dissolve may not overwrite it. */
        for (const [key, config] of Object.entries(d?.components ?? {})) {
          for (const [prop, value] of Object.entries(config)) {
            if (b.looks?.[key]?.[prop] === undefined) {
              out.push({ op: "set_look", id: b.id, key, name: prop, value });
            }
          }
        }
        for (const f of d?.fields ?? []) {
          if (!(b.fields ?? []).some((held) => held.name === f.name)) {
            out.push({ op: "set_field", id: b.id, field: { name: f.name, form: f.form } });
          }
        }
        /** **Absent where absent means the same thing.** There is no such
         *  thing as an untyped block — one naming nothing *is* its base kind —
         *  so a block that was plain before it was pinned comes back plain
         *  rather than carrying the word `block`, and the file is the one it
         *  started as. Anything else names what this extended. */
        const bare = b.of ? "reference" : b.side !== undefined ? "interface" : "block";
        out.push({ op: "update_block", id: b.id,
                   type: d?.extends === undefined || d.extends === bare ? null : d.extends });
      }

      /** A subtype rooted here is re-pointed rather than left dangling for the
       *  door to blank. */
      for (const sub of Object.values(ctx.graph.defs)) {
        if (sub.extends === id) out.push({ op: "set_def", def: { ...sub, extends: d?.extends } });
      }

      out.push({ op: "drop_def", id });
      return { mutations: out, effect: { say: `unpinned ${d?.name ?? id}` } };
    },
  },
);

/** What one element says about how it is drawn.
 *
 *  **Model data, not a display preference.** How the rest of the layer draws is
 *  the shell's business, but what a particular card says about itself is part
 *  of what the layer says — so it travels in the file, it undoes, and reopening
 *  the workspace finds it the way it was left. */
register(
  {
    name: "label",
    about: "whether the drawing writes this block's name on it",
    on: ["block", "selection"],
    args: [{ name: "ids", form: "block", required: true },
           { name: "shown", form: "choice", choices: ["yes", "no"] }],
    check: (ctx, args) => (ids_of(ctx, args).length ? null : "nothing is selected"),
    run: (ctx, args) => {
      const ids = ids_of(ctx, args);
      /** Absent flips what is there, so one control is the whole of it. */
      const said = args["shown"] === undefined ? null : args["shown"] !== "no";
      return { mutations: ids.map((id): Mutation => ({
        op: "set_labelled", id,
        labelled: said ?? ctx.graph.blocks[id]?.labelled === false,
      })) };
    },
  },
);

/** Whether this element is fixed where it was put. One toggle, on the element
 *  rather than on the layer, and undoable like everything else.
 *
 *  **An interface is a block, so it locks like one** — and it is the case the
 *  lock is really for: a port stays on the wall it was put on instead of being
 *  slid by hand. A relationship end is locked by pinning it, which is
 *  `adjustments.wall` and not this. */
register(
  {
    name: "lock",
    about: "fixes this where it was put, so nothing works its place out again",
    on: ["block", "interface", "selection"],
    args: [{ name: "ids", form: "block", required: true },
           { name: "fixed", form: "choice", choices: ["yes", "no"] }],
    check: (ctx, args) => (ids_of(ctx, args).length ? null : "nothing is selected"),
    run: (ctx, args) => {
      const ids = ids_of(ctx, args);
      const said = args["fixed"] === undefined ? null : args["fixed"] !== "no";
      return { mutations: ids.map((id): Mutation => ({
        op: "set_locked", id, locked: said ?? !ctx.graph.blocks[id]?.locked,
      })) };
    },
  },
  {
    name: "tag",
    about: "puts words on a block to say what it is like",
    on: ["block", "selection"],
    /** **The whole list, every time.** Adding and taking away are the same act
     *  said two ways, and a list handed over whole is one step and one undo
     *  whichever it was. */
    args: [{ name: "ids", form: "block", required: true },
           { name: "tags", form: "text", required: true }],
    check: (ctx, args) => (ids_of(ctx, args).length ? null : "nothing is selected"),
    run: (ctx, args) => ({ mutations: ids_of(ctx, args).map((id): Mutation => ({
      op: "set_tags", id, tags: list(args["tags"]),
    })) }),
  },
);

/** How this one block draws, over whatever its definition said.
 *
 *  **Local, until it is pinned.** Customising a block changes that block and
 *  nothing else; turning the result into something other blocks can name is a
 *  separate act, which is what keeps a definition from drifting under the
 *  usages that already name it. */
/** The keys a look may set. **`rules` is here because a block may state one**:
 *  `looks` is already a components bag and the fold's `set_look` was always
 *  generic, so what a definition says about what must be true, one usage can
 *  say for itself. */
const LOOKS: readonly string[] = ["card", "style", "rules"];

/** The rule kinds whose value is several names rather than one word. Parsed as
 *  a list rather than stringified, which stored `"pump"` where a `["pump"]` was
 *  wanted and left the rule matching nothing.
 *
 *  **Split on commas and never on spaces.** A field is called *rated flow* as
 *  readily as *flow*, and splitting on whitespace turned one name into two that
 *  nothing could ever satisfy — so a rule stating the one field the sample
 *  ships reported two violations against a field that was answered. */
const LISTED: readonly string[] = ["required", "holds", "match"];

/** The rule kinds a look may not state. **Both are nested records** — `ends`
 *  has a `from` and a `to`, `degree` an `in` and an `out` — and a look says one
 *  property, so what it wrote was a scalar where a record was wanted: ignored
 *  by `rules_of`, then dropped by the door on the next save. Refused out loud
 *  rather than written and quietly lost. */
const NESTED: readonly string[] = ["ends", "degree"];

register(
  {
    name: "look",
    about: "sets how this draws, or what it asks — on a block, or on a definition",
    on: ["block", "selection"],
    /** **One act, and the holder says which**, exactly as `field` does. A block
     *  id writes the block's own last word; a definition id writes the
     *  definition, so every usage naming it follows. Still a list, so a
     *  selection is restyled in one step and one undo. */
    args: [{ name: "ids", form: "block", required: true },
           { name: "key", form: "choice", required: true, choices: LOOKS },
           { name: "name", form: "text", required: true },
           /** Absent gives the property back to the chain. */
           { name: "value", form: "text" }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      if (!LOOKS.includes(String(args["key"]))) {
        return `there is nothing called "${args["key"]}" to set`;
      }
      if (String(args["key"]) === "rules" && NESTED.includes(text(args, "name"))) {
        return `\`${text(args, "name")}\` is stated on a definition, not set here`;
      }
      for (const id of ids) {
        const why = borrowed(ctx.graph, id);
        if (why) return why;
      }
      return null;
    },
    run: (ctx, args) => {
      const said = args["value"];
      const key = String(args["key"]);
      const name = text(args, "name");
      /** **A range keeps its type.** Everything a look says is a word from a
       *  closed set except `hue` and `intensity`, and stringifying those left a
       *  card carrying `"200"` — which reads as neither a number nor a name, so
       *  the drawing quietly ignored it and the slider did nothing. */
      const value = said === undefined || said === null || said === "" ? null
        : key === "rules" && LISTED.includes(name) ? list(said)
        : NUMBERS.includes(name) && Number.isFinite(Number(said)) ? Number(said)
        : String(said);
      return { mutations: ids_of(ctx, args).map((id): Mutation => {
        const d = ctx.graph.defs[id];
        return d ? { op: "set_def", def: stated(d, key, name, value) }
                 : { op: "set_look", id, key, name, value };
      }) };
    },
  },
);

/** A definition with one property of one component set, or given back.
 *
 *  **The same shape the fold gives `set_look`**, so a block's last word and a
 *  definition's statement compose without translating: the last key out takes
 *  its component with it, and the last component takes `components` with it —
 *  nothing still at its default is written. */
function stated(d: Graph["defs"][string], key: string, name: string,
                value: unknown): Graph["defs"][string] {
  const held = { ...(d.components?.[key] ?? {}) };
  if (value === null || value === undefined) delete held[name];
  else held[name] = value;
  const components = { ...(d.components ?? {}) };
  if (Object.keys(held).length) components[key] = held;
  else delete components[key];
  return { ...d, components: Object.keys(components).length ? components : undefined };
}

// ---------------------------------------------------------------- the layer

register(
  {
    name: "arrange",
    about: "sets how the layer lays out, and tidies it into that shape",
    on: ["layer"],
    /** **The tidy comes in; it is not worked out here.** Where a block goes is
     *  layout, which depends on sizes and on a lattice, and neither is the
     *  engine's — so the caller hands over where everything went and this
     *  writes it. One step: setting the arrangement and moving everything into
     *  it is one thing you did, and one undo puts it all back. */
    args: [{ name: "arrangement", form: "choice", required: true, choices: ARRANGEMENTS },
           { name: "at", form: "text" }],
    check: (_ctx, args) =>
      ARRANGEMENTS.includes(String(args["arrangement"]) as Arrangement)
        ? null : `there is no arrangement called "${args["arrangement"]}"`,
    run: (ctx, args) => {
      /** **A list of places, or nothing.** It arrives from a caller with the
       *  geometry rather than from anything typed, so anything else is nobody
       *  saying where and the arrangement is set on its own. */
      const said = args["at"];
      const at = (Array.isArray(said) ? said : []) as { id: Id; x: number; y: number }[];
      return { mutations: [
        { op: "set_arrangement", layer: (args["layer"] as Id) ?? here(ctx),
          arrangement: String(args["arrangement"]) as Arrangement },
        ...at.filter((p) => ctx.graph.blocks[p.id])
             .map((p): Mutation => ({ op: "place_block", id: p.id, x: p.x, y: p.y })),
      ] };
    },
  },
);

/** A list somebody typed, however they separated it. */
/** Several names from one answer. **Commas separate, spaces do not** — a name
 *  with a space in it is one name, and the panel hands a list over whole so it
 *  never reaches the parsing at all. */
function list(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((v) => v.trim()).filter(Boolean);
  return String(raw ?? "").split(",").map((v) => v.trim()).filter(Boolean);
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
