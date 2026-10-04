/** Making, naming, typing, moving and removing blocks; navigating layers; laying one out. */

import { may_hold, may_take } from "../capabilities";
import { shown_name } from "../names";
import { block_base, base_of, closes_cycle, def_at, dependents, domain_of, in_domain,
         may_retype, name_taken, package_of, plain_type, stored_type, self_use, tree_of } from "../defs";
import { at_cell, covers, inline, inside, is_grid, lattice_of, layer_of } from "../holders";
import { children, is_interface, next_order, reorder, stands_for, subtree } from "../tree";
import { new_id } from "../ids";
import { BASE_PACKAGE, LAYOUTS, type Graph, type Id, type Layout, type Mutation } from "../types";
import { register } from "./registry";
import { cell_free, free_cell } from "./grid";
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

/** How many cells of a grid are free: its addresses, merges counted once, none seated. */
function free_count(graph: Graph, grid: Id): number {
  const g = lattice_of(graph, grid);
  if (!g) return 0;
  let n = 0;
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const span = g.merges?.find((s) => covers(s, r, c));
      if (span && (span.r !== r || span.c !== c)) continue;
      if (!at_cell(graph, grid, r, c)) n++;
    }
  }
  return n;
}

register(
  {
    name: "create",
    about: "makes a new block in a layer, where you pointed; made from a block, a tie links it",
    on: ["layer", "block"],
    args: [{ name: "name", form: "text", asks: true },
           { name: "parent", form: "block" },
           { name: "type", form: "text" }, { name: "spot", form: "spot" },
           { name: "from", form: "block" }],
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
      if (is_grid(ctx.graph, parent) && !free_count(ctx.graph, parent)) return "every cell is taken";
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
      const g = lattice_of(ctx.graph, parent);
      const taken = new Set(children(ctx.graph, parent).filter((b) => b.cell)
        .map((b) => `${b.cell!.r},${b.cell!.c}`));
      const cell = g ? free_cell(g, taken, null, { r: 0, c: 0 }, false) : null;
      if (cell) made.push({ op: "seat_cell", id, cell });
      else if (at) made.push({ op: "place_block", id, x: at.x, y: at.y });
      made.push(...tied(ctx, id, type, args["from"] ? id_of(args, "from") : undefined));
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
      const pinned = ctx.graph.blocks[ctx.graph.root]?.pinned ?? [];
      const gone = new Set(ids.flatMap((id) => subtree(ctx.graph, id)));
      const kept = pinned.filter((p) => !gone.has(p));
      return {
        mutations: [...ids.map((id): Mutation => (ctx.graph.edges[id]
          ? { op: "delete_edge", id } : { op: "delete_block", id })),
          ...(kept.length !== pinned.length ? [{ op: "set_pinned", ids: kept } as Mutation] : [])],
        effect: ids.includes(ctx.layer ?? "") ? { open: null, focus: null } : { focus: null },
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
          if (type && domain_of(ctx.graph, type) !== domain_of(ctx.graph, id)) {
            return `"${d!.name}" is not a ${domain_of(ctx.graph, id)} definition`;
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
      return { mutations: ids_of(ctx, args).map((id): Mutation => {
        if (ctx.graph.edges[id]) return { op: "update_edge", id, type: type ?? null };
        if (ctx.graph.blocks[id]?.def) return { op: "update_block", id, type: said || null };
        return { op: "update_block", id, type: type ?? plain_type(base_of(ctx.graph, id)) };
      }) };
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
        for (const id of ids) {
          if (!may_take(ctx.graph, parent, ctx.graph.blocks[id]!.type)) {
            return `"${shown_name(ctx.graph, parent)}" takes nothing of that sort`;
          }
        }
        const cell = cell_of_arg(args, "at");
        if (cell && !inside(g, cell)) return "that cell is outside the grid";
        /** A member of a grid always sits in a cell, so a full grid takes nothing more. */
        const arriving = ids.filter((id) => ctx.graph.blocks[id]!.parent !== parent).length;
        if (arriving > free_count(ctx.graph, parent)) return "every cell is taken";
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
        const taken = new Set(children(ctx.graph, parent).filter((b) => b.cell && !ids.includes(b.id))
          .map((b) => `${b.cell!.r},${b.cell!.c}`));
        const said = cell_of_arg(args, "at");
        for (const id of ids) {
          const want = said && inside(g, said) && !taken.has(`${said.r},${said.c}`) ? said
            : free_cell(g, taken, null, said ?? { r: 0, c: 0 }, false);
          if (!want) continue;
          taken.add(`${want.r},${want.c}`);
          out.push({ op: "seat_cell", id, cell: want });
        }
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
      if (is_grid(ctx.graph, parent)) {
        return cell_free(ctx, parent, cell_of_arg(args, "at"))
          ?? (may_take(ctx.graph, parent, text(args, "type") || undefined)
            ? null : `"${shown_name(ctx.graph, parent)}" takes nothing of that sort`);
      }
      return null;
    },
    run: (ctx, args) => {
      const id = new_id("block");
      const at = spot(args);
      const parent = args["parent"] ? id_of(args, "parent") : here(ctx);
      const cell = is_grid(ctx.graph, parent) ? cell_of_arg(args, "at") : null;
      const ref = handles(ctx, "reference");
      const out: Mutation[] = [{ op: "add_block", block: {
        id, parent, of: id_of(args, "target"), order: next_order(ctx.graph, parent),
        alias: ref.take(), ...typed(ctx, args), ...(cell ? { cell } : {}),
      } }, ...ref.bump()];
      if (at && !cell) out.push({ op: "place_block", id, x: at.x, y: at.y });
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
    about: "opens a block as the layer being drawn, the forest with none, or leaves this one",
    on: ["block"],
    args: [{ name: "id", form: "block" }],
    check: (ctx, args) => {
      const want = id_of(args, "id");
      return !want || ctx.graph.blocks[want] ? null : "that is not here any more";
    },
    /** No `id` leaves for the layer the open one is drawn on; an interface returns to the layer it
     *  was entered from, and a tree's top leaves for the overview. */
    run: (ctx, args) => {
      const want = id_of(args, "id");
      if (want) return { mutations: [], effect: { open: want, focus: null } };
      const here = ctx.layer ? ctx.graph.blocks[ctx.layer] : undefined;
      const owner = here?.parent ? ctx.graph.blocks[here.parent] : undefined;
      const outside = owner?.parent ?? null;
      const up = here && tree_of(ctx.graph, here.id) !== here.id ? layer_of(ctx.graph, here.id) : null;
      const back = here && is_interface(here) && ctx.from !== undefined
        && ctx.from === outside ? outside : up;
      return { mutations: [], effect: { open: back, focus: ctx.layer } };
    },
  },
  {
    name: "reveal",
    about: "opens the layer a block is drawn on and selects it there",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true }],
    run: (ctx, args) => {
      const id = id_of(args, "id");
      /** Followed to the end, so a reference to a reference reveals what both stand for. A tree,
       *  a holder or a package is seen in the overview. */
      const target = stands_for(ctx.graph, id)?.id ?? id;
      const open = in_domain(ctx.graph, target) || ctx.graph.blocks[target]?.parent === null
        ? null : layer_of(ctx.graph, target);
      return { mutations: [], effect: { open, focus: target } };
    },
  },
);

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
);
