/** Making, naming, typing, moving and removing blocks; navigating layers; laying one out. */

import { may_hold } from "../capabilities";
import { shown_name } from "../names";
import { block_base, base_of, closes_cycle, def_at, dependents, domain_of, in_domain,
         kind_free, may_retype, name_taken, package_of, plain_type, setting_of, stored_type,
         self_use } from "../defs";
import { GRID, inline, inside, is_grid, lattice_of, layer_of } from "../holders";
import { children, edges_in, is_interface, layout_of, next_order, reorder, stands_for,
         subtree } from "../tree";
import { leave_at, open_at, reveal_at, view_on, EDITOR, type Tiers, type View,
         type Views } from "../navigate";
import { new_id } from "../ids";
import { BASE_PACKAGE, LAYOUTS, type Graph, type Id, type Layout, type Mutation } from "../types";
import { register, type Context, type Result } from "./registry";
import { seat_all, seat_in, taken_in } from "./grid";
import { borrowed, cell_of_arg, here, handles, id_of, ids_of, make_block, may_wear, NEEDS, spot,
         text, tied, typed } from "./helpers";

/** The layer a block made under `parent` draws on: the parent, or what it is drawn inline in. */
function drawn_on(graph: Graph, parent: Id): Id | null {
  return inline(graph, parent) ? layer_of(graph, parent) : parent;
}

/** Why putting these blocks under `parent` would break the model, or null. */
function placing(graph: Graph, ids: readonly Id[], parent: Id): string | null {
  const to = graph.blocks[parent];
  if (!to) return "there is nowhere to put it";
  for (const id of ids) {
    const b = graph.blocks[id];
    if (!b) return "that block is not there";
    if (b.parent === null) return "a package cannot be moved";
    if (id === parent || subtree(graph, id).includes(parent)) {
      return "a block cannot be moved inside itself";
    }
    /** A definition sits in a domain, never in a structure. */
    if (b.def && !(to.parent === null || in_domain(graph, parent) && !to.def)) {
      return "a definition sits in a package, not in a structure";
    }
    /** A definition never uses itself, however deep the usage arrives. */
    for (const under of subtree(graph, id)) {
      const t = graph.blocks[under]?.type;
      if (!graph.blocks[under]?.def && self_use(graph, parent, t)) {
        return "a definition cannot use itself";
      }
    }
    if (!may_hold(graph, parent, b.type)) {
      return `"${shown_name(graph, parent)}" holds nothing of that sort`;
    }
  }
  return null;
}

/** Why removing this would leave something naming nothing: a definition used outside what goes
 *  with it — everything `gone` takes — or a package something depends on. */
function in_use(graph: Graph, id: Id, gone: ReadonlySet<Id>): string | null {
  const b = graph.blocks[id];
  if (!b) return null;
  if (b.parent === null) {
    if (id === BASE_PACKAGE) return "the base package is every workspace's";
    if (id === graph.root) return "the workspace is not removed";
    const needs = dependents(graph, id);
    return needs.length ? `${needs.map((p) => p.name ?? p.id).join(", ")} uses it` : null;
  }
  const defs = subtree(graph, id).filter((g) => graph.blocks[g]?.def);
  if (!defs.length) return null;
  const names = (x: { type?: Id; traits?: Id[]; tags?: string[]; of?: Id }) =>
    [x.type, x.of, ...(x.traits ?? []), ...(x.tags ?? [])];
  const users = [...Object.values(graph.blocks).filter((u) => !gone.has(u.id)),
                 ...Object.values(graph.edges).filter((e) => !gone.has(e.from) && !gone.has(e.to))]
    .filter((u) => names(u).some((n) => n && defs.includes(n)));
  if (!users.length) return null;
  return `${shown_name(graph, defs.find((d) => users.some((u) => names(u).includes(d)))!)} `
    + `is used by ${users.length === 1 ? "one element" : `${users.length} elements`}`;
}

register(
  {
    name: "create",
    about: "makes a new block in a layer, where you pointed, or before a block it holds; made "
      + "from a block, a tie links it",
    on: ["layer", "block"],
    args: [{ name: "name", form: "text", asks: true },
           { name: "parent", form: "block" },
           { name: "type", form: "text" }, { name: "spot", form: "spot" },
           { name: "from", form: "block" }, { name: "before", form: "block" },
           /** The cell it is made in, where the parent is a grid. */
           { name: "at", form: "text" }],
    check: (ctx, args) => {
      const type = args["type"] ? String(args["type"]) : "";
      const parent = (args["parent"] as Id) ?? here(ctx);
      if (type && !def_at(ctx.graph, type)) return `there is no definition called "${type}"`;
      if (type && NEEDS[block_base(ctx.graph, type)]) return NEEDS[block_base(ctx.graph, type)]!;
      if (type && domain_of(ctx.graph, type) === "relation") {
        return "lines must connect existing blocks — draw one from a block to another";
      }
      const why = borrowed(ctx.graph, parent);
      if (why) return why;
      if (self_use(ctx.graph, parent, type)) return "a definition cannot use itself";
      const from = args["from"] ? id_of(args, "from") : null;
      if (from && layer_of(ctx.graph, from) !== drawn_on(ctx.graph, parent)) {
        return "a tie joins blocks on one layer";
      }
      return may_hold(ctx.graph, parent, type)
        ? null : `"${shown_name(ctx.graph, parent)}" holds nothing of that sort`;
    },
    run: (ctx, args) => {
      const parent = (args["parent"] as Id) ?? here(ctx);
      const type = args["type"] ? String(args["type"]) : undefined;
      const made = make_block(ctx, text(args, "name"), parent, type);
      const at = spot(args);
      const id = (made[0] as { block: { id: Id } }).block.id;
      /** In a grid, it takes the cell pointed at, else the nearest free one. */
      const g = lattice_of(ctx.graph, parent);
      if (g) {
        made.push(...seat_in(parent, g, taken_in(ctx.graph, parent), [id],
                             cell_of_arg(args, "at")));
      }
      else if (at) made.push({ op: "place_block", id, x: at.x, y: at.y });
      /** Before a block it holds, the rest step along. */
      if (args["before"]) {
        for (const o of reorder(ctx.graph, parent, id, id_of(args, "before"))) {
          made.push({ op: "order_block", id: o.id, order: o.order });
        }
      }
      made.push(...tied(ctx, id, parent, type, args["from"] ? id_of(args, "from") : undefined));
      return { mutations: made };
    },
  },
  {
    name: "delete",
    about: "removes blocks with everything under them, or relationships",
    on: ["block", "edge", "selection"],
    args: [{ name: "ids", form: "block", required: true }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      const gone = new Set(ids.flatMap((id) => subtree(ctx.graph, id)));
      for (const id of ids) {
        const why = (ctx.graph.blocks[id]?.parent === null ? null : borrowed(ctx.graph, id))
          ?? in_use(ctx.graph, id, gone);
        if (why) return why;
      }
      return null;
    },
    run: (ctx, args) => {
      const ids = ids_of(ctx, args);
      return {
        mutations: ids.map((id): Mutation => (ctx.graph.edges[id]
          ? { op: "delete_edge", id } : { op: "delete_block", id })),
        effect: { focus: null },
      };
    },
  },
  {
    name: "rename",
    about: "changes what a block or a relationship is called",
    on: ["block", "edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "name", form: "text", asks: true }],
    /** A definition is found by its name, so it takes one nothing else in its package has. */
    check: (ctx, args) => {
      const id = id_of(args, "id");
      if (!ctx.graph.blocks[id] && !ctx.graph.edges[id]) return "that is not here any more";
      const why = borrowed(ctx.graph, id);
      if (why) return why;
      if (!def_at(ctx.graph, id)) return null;
      const name = text(args, "name");
      if (!name) return "a definition needs a name";
      return name_taken(ctx.graph, package_of(ctx.graph, id), name, id)
        ? `"${name}" already exists` : null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const name = text(args, "name");
      return { mutations: [ctx.graph.edges[id] ? { op: "update_edge", id, name }
                                               : { op: "update_block", id, name }] };
    },
  },
  {
    name: "retype",
    about: "sets which definition a block or relationship is, or a definition extends",
    on: ["block", "edge"],
    args: [{ name: "ids", form: "block", required: true },
           { name: "type", form: "text", required: true }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      const type = text(args, "type") || undefined;
      const d = def_at(ctx.graph, type);
      if (type && !d) return `there is no definition called "${type}"`;
      for (const id of ids) {
        if (ctx.graph.blocks[id]?.parent === null) return "a package has no type";
        const why = borrowed(ctx.graph, id);
        if (why) return why;
        if (ctx.graph.edges[id]) {
          if (type && domain_of(ctx.graph, type) !== "relation") {
            return `"${d!.name}" defines a block, not a relationship`;
          }
          continue;
        }
        const b = ctx.graph.blocks[id];
        if (!b) return "that block is not there";
        if (type && domain_of(ctx.graph, type) === "relation" && !b.def) {
          return `"${d!.name}" defines a relationship, not a block`;
        }
        if (b.def) {
          if (closes_cycle(ctx.graph, id, type)) return "a definition cannot extend itself";
          /** What it extends says its kind; it changes kind only while nothing it shaped. */
          if (type && domain_of(ctx.graph, type) !== domain_of(ctx.graph, id)
              && !kind_free(ctx.graph, id)) {
            return `"${d!.name}" is not a ${domain_of(ctx.graph, id)} definition, and this one is in use`;
          }
          /** Its usages are interfaces by its chain, so that too is fixed while it is used. */
          const port = (t: Id | undefined) => block_base(ctx.graph, t) === "interface";
          if (type && port(type) !== port(id) && !kind_free(ctx.graph, id)) {
            return `"${d!.name}" ${port(id) ? "defines" : "does not define"} an interface, and this one is in use`;
          }
          continue;
        }
        if (self_use(ctx.graph, b.parent, type)) return "a definition cannot use itself";
        if (type && !may_retype(ctx.graph, id, type)) {
          return `a ${base_of(ctx.graph, id)} cannot become a ${block_base(ctx.graph, type)}`;
        }
      }
      return null;
    },
    /** A structural base, or nothing, stores as plain. */
    run: (ctx, args) => {
      const said = text(args, "type");
      const type = stored_type(ctx.graph, said);
      const out = ids_of(ctx, args).map((id): Mutation => {
        if (ctx.graph.edges[id]) return { op: "update_edge", id, type: type ?? null };
        if (ctx.graph.blocks[id]?.def) return { op: "update_block", id, type: said || null };
        return { op: "update_block", id, type: type ?? plain_type(base_of(ctx.graph, id)) };
      });
      /** A block becoming a grid seats what it holds: a member always sits in a cell. */
      for (const id of ids_of(ctx, args)) {
        const b = ctx.graph.blocks[id];
        if (b && !b.def && said && setting_of(ctx.graph, said, "holder")["matrix"] === true) {
          out.push(...seat_all(ctx.graph, id, { ...GRID, ...b.grid }));
        }
      }
      return { mutations: out };
    },
  },
  {
    name: "describe",
    about: "writes what a block holds, or what a definition is for",
    on: ["block", "layer"],
    args: [{ name: "id", form: "block", required: true },
           { name: "body", form: "text", required: true }],
    check: (ctx, args) => borrowed(ctx.graph, id_of(args, "id")),
    run: (_ctx, args) => ({ mutations: [
      { op: "set_body", id: id_of(args, "id"), body: String(args["body"] ?? "") },
    ] }),
  },
  {
    name: "move",
    about: "puts blocks under a different parent, in the place you dropped them",
    on: ["block", "selection"],
    args: [{ name: "ids", form: "block", required: true },
           { name: "parent", form: "block", required: true },
           /** The sibling they go in front of; absent is last. */
           { name: "before", form: "block" }, { name: "spot", form: "spot" },
           /** The cell a block lands in, where the parent is a grid. */
           { name: "at", form: "text" }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      const parent = id_of(args, "parent");
      if (!ids.length) return "nothing is selected";
      const why = borrowed(ctx.graph, parent) ?? ids.map((id) => borrowed(ctx.graph, id))
        .find(Boolean) ?? placing(ctx.graph, ids, parent);
      if (why) return why;
      const g = lattice_of(ctx.graph, parent);
      if (g) {
        const cell = cell_of_arg(args, "at");
        if (cell && !inside(g, cell)) return "that cell is outside the grid";
      }
      return null;
    },
    run: (ctx, args) => {
      const ids = ids_of(ctx, args);
      const parent = id_of(args, "parent");
      const before = args["before"] ? id_of(args, "before") : null;
      const out: Mutation[] = ids
        .filter((id) => ctx.graph.blocks[id]!.parent !== parent)
        .map((id): Mutation => ({ op: "move_block", id, parent }));
      for (const at of reorder(ctx.graph, parent, ids, before)) {
        out.push({ op: "order_block", id: at.id, order: at.order });
      }
      /** Into a grid, each seats: where it was pointed, else the nearest free cell. */
      const g = lattice_of(ctx.graph, parent);
      if (g) {
        out.push(...seat_in(parent, g, taken_in(ctx.graph, parent, ids), ids,
                            cell_of_arg(args, "at")));
      }
      /** Only a single block is placed at a spot. */
      const at = ids.length === 1 && !g ? spot(args) : null;
      if (at) out.push({ op: "place_block", id: ids[0]!, x: at.x, y: at.y });
      return { mutations: out };
    },
  },
  {
    name: "refer",
    about: "places a stand-in for a block, a definition or a package",
    on: ["layer"],
    /** `parent` and `at` seat it in a grid's cell. */
    args: [{ name: "target", form: "block", required: true },
           { name: "type", form: "text" }, { name: "spot", form: "spot" },
           { name: "parent", form: "block" }, { name: "at", form: "text" }],
    check: (ctx, args) => {
      const target = id_of(args, "target");
      if (!ctx.graph.blocks[target]) return "that is not there to stand in for";
      const wrong = may_wear(ctx, args, "reference");
      if (wrong) return wrong;
      const parent = args["parent"] ? id_of(args, "parent") : here(ctx);
      const why = borrowed(ctx.graph, parent);
      if (why) return why;
      if (target === parent) return "a block cannot hold a stand-in for itself";
      const type = text(args, "type") || undefined;
      return !is_grid(ctx.graph, parent) || may_hold(ctx.graph, parent, type)
        ? null : `"${shown_name(ctx.graph, parent)}" takes nothing of that sort`;
    },
    run: (ctx, args) => {
      const id = new_id("block");
      const at = spot(args);
      const parent = args["parent"] ? id_of(args, "parent") : here(ctx);
      const g = lattice_of(ctx.graph, parent);
      const ref = handles(ctx, "reference");
      const out: Mutation[] = [{ op: "add_block", block: {
        id, parent, of: id_of(args, "target"), order: next_order(ctx.graph, parent),
        alias: ref.take(), ...typed(ctx, args),
      } }, ...ref.bump()];
      /** In a grid, it takes the cell pointed at, else the nearest free one. */
      if (g) {
        out.push(...seat_in(parent, g, taken_in(ctx.graph, parent), [id],
                            cell_of_arg(args, "at")));
      }
      else if (at) out.push({ op: "place_block", id, x: at.x, y: at.y });
      return { mutations: out };
    },
  },
);

register(
  {
    name: "source",
    about: "says what a block stands in for outside the workspace, or gives it back",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true },
           { name: "uri", form: "text", asks: true }],
    check: (ctx, args) => {
      const id = id_of(args, "id") || ctx.picked[0] || "";
      return ctx.graph.blocks[id] ? null : "point at a block first";
    },
    /** Provenance, never a link the app follows: nothing syncs to it, so it may go stale. */
    run: (ctx, args) => {
      const id = id_of(args, "id") || ctx.picked[0]!;
      const uri = text(args, "uri").trim();
      return { mutations: [{ op: "set_source", id, source: uri || null }] };
    },
  },
  {
    name: "open",
    about: "opens a block on the canvas on the view its kind calls for — a definition opened "
      + "again draws its structure — or leaves this layer",
    on: ["block"],
    /** `at`: the section it was opened from, where a definition's structure is listed. */
    args: [{ name: "id", form: "block" }, { name: "at", form: "number" }],
    check: (ctx, args) => {
      const want = id_of(args, "id");
      return !want || ctx.graph.blocks[want] ? null : "that is not here any more";
    },
    /** Opening and leaving are navigation's (`open_at`, `leave_at`). An interface left returns to
     *  the layer it was entered from. */
    run: (ctx, args) => {
      const { tiers, views, view } = seen(ctx);
      const want = id_of(args, "id");
      const from = typeof args["at"] === "number" ? args["at"] : undefined;
      if (want) return moved(open_at(ctx.graph, tiers, views, want, from, view));
      const here = ctx.layer ? ctx.graph.blocks[ctx.layer] : undefined;
      const owner = here?.parent ? ctx.graph.blocks[here.parent] : undefined;
      const outside = owner?.parent ?? null;
      if (here && is_interface(ctx.graph, here.id) && ctx.from !== undefined && ctx.from === outside) {
        return moved({ ...view, layer: outside, pick: ctx.layer });
      }
      return moved(leave_at(ctx.graph, tiers, views, view));
    },
  },
  {
    name: "reveal",
    about: "brings a block into sight where it is drawn, and selects it there",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true }],
    run: (ctx, args) => {
      const { tiers, views, view } = seen(ctx);
      const id = id_of(args, "id");
      /** Followed to the end, so a reference to a reference reveals what both stand for. */
      return moved(reveal_at(ctx.graph, tiers, views, view, stands_for(ctx.graph, id)?.id ?? id));
    },
  },
);

/** What the canvas draws, as the context says it or as the editor's sections read it. */
function seen(ctx: Context): { tiers: Tiers; views: Views; view: View } {
  const tiers = ctx.tiers ?? EDITOR;
  const views = ctx.views ?? {};
  return { tiers, views, view: ctx.view ?? view_on(ctx.graph, tiers, views, ctx.layer) };
}

/** Where navigation went, as an effect: nowhere where it went nowhere. */
function moved(to: View | null): Result {
  return { mutations: [], ...(to ? { effect: { view: to, focus: to.pick } } : {}) };
}

register(
  {
    name: "layout",
    about: "sets how the layer lays out, and tidies it into that shape",
    on: ["layer"],
    /** Sets the layout and writes the caller's positions, in one step. */
    args: [{ name: "kind", form: "choice", required: true, choices: LAYOUTS },
           { name: "at", form: "text" }],
    check: (ctx, args) => {
      if (!LAYOUTS.includes(String(args["kind"]) as Layout)) {
        return `there is no layout called "${args["kind"]}"`;
      }
      return borrowed(ctx.graph, (args["layer"] as Id) ?? here(ctx));
    },
    run: (ctx, args) => {
      const said = args["at"];
      const at = (Array.isArray(said) ? said : []) as { id: Id; x: number; y: number }[];
      return { mutations: [
        { op: "set_setting", id: (args["layer"] as Id) ?? here(ctx), key: "layout", name: "kind",
          value: String(args["kind"]) },
        ...at.filter((p) => ctx.graph.blocks[p.id])
             .map((p): Mutation => ({ op: "place_block", id: p.id, x: p.x, y: p.y })),
      ] };
    },
  },
  {
    name: "arrange",
    about: "orders what the layer holds so related blocks read next to each other",
    on: ["layer"],
    args: [{ name: "layer", form: "block" }],
    check: (ctx, args) => {
      const layer = (args["layer"] as Id) ?? here(ctx);
      if (layout_of(ctx.graph, layer) === "free") return "a free layer draws where things were put";
      return borrowed(ctx.graph, layer);
    },
    run: (ctx, args) => {
      const layer = (args["layer"] as Id) ?? here(ctx);
      return { mutations: related_order(ctx.graph, layer)
        .map(({ id, order }): Mutation => ({ op: "order_block", id, order })) };
    },
  },
);

/** The layer's blocks in an order that keeps related ones together: reading order, each followed
 *  by what it relates to — a tied note by its block — breadth first. */
function related_order(graph: Graph, layer: Id): { id: Id; order: number }[] {
  const units = children(graph, layer).filter((b) => !is_interface(graph, b.id));
  const ids = new Set(units.map((b) => b.id));
  /** The block on this layer an end sits in. */
  const top = (id: Id): Id | null => {
    for (let at: Id | null | undefined = id; at; at = graph.blocks[at]?.parent) {
      if (ids.has(at)) return at;
    }
    return null;
  };
  const mates = new Map<Id, Set<Id>>();
  for (const e of edges_in(graph, layer)) {
    const [a, b] = [top(e.from), top(e.to)];
    if (!a || !b || a === b) continue;
    mates.set(a, new Set([...(mates.get(a) ?? []), b]));
    mates.set(b, new Set([...(mates.get(b) ?? []), a]));
  }
  const rank = new Map(units.map((b, i) => [b.id, i]));
  const read = (x: Id, y: Id) => rank.get(x)! - rank.get(y)!;
  const out: Id[] = [];
  const seen = new Set<Id>();
  for (const start of units) {
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      queue.push(...[...(mates.get(id) ?? [])].sort(read).filter((m) => !seen.has(m)));
    }
  }
  return out.map((id, i) => ({ id, order: i + 1 }))
    .filter(({ id, order }) => graph.blocks[id]?.order !== order);
}
