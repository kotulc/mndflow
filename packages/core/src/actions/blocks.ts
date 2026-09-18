/** Making, naming, typing and moving blocks; navigating layers; arranging one. */

import { def_named, def_of, edge_module, may_retype, module_named, module_of, plain_type, relation_named,
         stored_type } from "../defs";
import { children, is_interface, is_reference, next_order, path, reorder } from "../tree";
import { new_id } from "../ids";
import { ARRANGEMENTS, type Arrangement, type Definition, type Id, type Mutation } from "../types";
import { register } from "./registry";
import { handles, here, id_of, ids_of, make_block, may_wear, mint_def, NEEDS, own_def, spot, text,
         typed } from "./helpers";

register(
  {
    name: "create",
    about: "makes a new block in a layer, where you pointed if you did",
    on: ["layer"],
    args: [{ name: "name", form: "text", asks: true },
           { name: "parent", form: "block" },
           { name: "type", form: "text" }, { name: "spot", form: "spot" }],
    /** Refuses a definition a layer cannot make. */
    check: (ctx, args) => {
      const type = args["type"] ? String(args["type"]) : "";
      if (!type) return null;
      if (!ctx.graph.defs[type]) return `there is no definition called "${type}"`;
      return NEEDS[module_named(ctx.graph, type)] ?? null;
    },
    run: (ctx, args) => {
      const parent = (args["parent"] as Id) ?? here(ctx);
      const type = args["type"] ? String(args["type"]) : undefined;
      const made = make_block(ctx, text(args, "name"), parent, type);
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
           { name: "name", form: "text", asks: true }],
    /** A block may be unnamed; a line's new name must be free. */
    check: (ctx, args) => {
      const id = id_of(args, "id");
      if (ctx.graph.blocks[id]) return null;
      if (!ctx.graph.edges[id]) return "that is not here any more";
      const name = text(args, "name");
      const other = name ? def_named(ctx.graph, name, "relation") : undefined;
      return other ? `"${other.name}" already exists` : null;
    },
    /** A line is named by its definition: naming one files a new definition over what it follows,
     *  keeping a label of its own, and moves the line onto it. A definition is renamed in place. */
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const name = text(args, "name");
      if (!ctx.graph.edges[id]) return { mutations: [{ op: "update_block", id, name }] };
      if (!name) return { mutations: [{ op: "update_edge", id, type: null }] };
      const own = own_def(ctx.graph, id);
      /** A label that only repeated the old name follows the new one. */
      const label = !own || own.label === own.name ? name : own.label;
      const def: Definition = { id: mint_def("relation"), group: "relation", name, label,
                                components: { line: {} },
                                extends: def_of(ctx.graph, id) };
      return { mutations: [{ op: "set_def", def }, { op: "update_edge", id, type: def.id }] };
    },
  },
  {
    name: "retype",
    about: "sets which definition a block or a relationship names",
    on: ["block", "edge"],
    args: [{ name: "ids", form: "block", required: true },
           { name: "type", form: "text", required: true }],
    /** An element keeps its kind; a run takes only a relation definition of its module. */
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      const type = text(args, "type") || undefined;
      for (const id of ids) {
        const edge = ctx.graph.edges[id];
        if (edge) {
          if (!type) continue;
          const d = ctx.graph.defs[type];
          if (!d) return `there is no definition called "${type}"`;
          if (d.group !== "relation") return `"${d.name}" defines a block, not a relationship`;
          const module = edge_module(ctx.graph, id);
          if (relation_named(ctx.graph, type) !== module) {
            return `a ${module} cannot follow a ${relation_named(ctx.graph, type)} definition`;
          }
          continue;
        }
        if (!ctx.graph.blocks[id]) return "that block is not there";
        if (type && !ctx.graph.defs[type]) return `there is no definition called "${type}"`;
        if (type && ctx.graph.defs[type]!.group === "relation") {
          return `"${ctx.graph.defs[type]!.name}" defines a relationship, not a block`;
        }
        if (type && !may_retype(ctx.graph, id, type)) {
          return `a ${module_of(ctx.graph, id)} cannot become a ${module_named(ctx.graph, type)}`;
        }
      }
      return null;
    },
    /** A base, a default or nothing stores as plain. */
    run: (ctx, args) => {
      const type = stored_type(ctx.graph, text(args, "type"));
      return { mutations: ids_of(ctx, args).map((id): Mutation => (ctx.graph.edges[id]
        ? { op: "update_edge", id, type: type ?? null }
        : { op: "update_block", id, type: type ?? plain_type(module_of(ctx.graph, id)) })) };
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
    args: [{ name: "ids", form: "block", required: true },
           { name: "parent", form: "block", required: true },
           /** The sibling they go in front of; absent is last. */
           { name: "before", form: "block" }, { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      const parent = id_of(args, "parent");
      if (!ids.length) return "nothing is selected";
      if (!ctx.graph.blocks[parent]) return "there is nowhere to move it to";
      for (const id of ids) {
        if (!ctx.graph.blocks[id]) return "that block is not there";
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
      const parent = id_of(args, "parent");
      const before = args["before"] ? id_of(args, "before") : null;
      const out: Mutation[] = ids.map((id): Mutation => ({ op: "move_block", id, parent }));
      /** Arriving renumbers the siblings. */
      for (const at of reorder(ctx.graph, parent, ids, before)) {
        out.push({ op: "order_block", id: at.id, order: at.order });
      }
      /** Only a single block is placed at a spot. */
      const at = ids.length === 1 ? spot(args) : null;
      if (at) out.push({ op: "place_block", id: ids[0]!, x: at.x, y: at.y });
      return { mutations: out };
    },
  },
  {
    name: "refer",
    about: "places a reference of a block into this layer",
    on: ["layer"],
    args: [{ name: "target", form: "block", required: true },
           { name: "type", form: "text" }, { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const target = id_of(args, "target");
      if (!ctx.graph.blocks[target]) return "that block is not there";
      const wrong = may_wear(ctx, args, "reference");
      if (wrong) return wrong;
      if (target === ctx.layer) return "a layer cannot hold a stand-in for itself";
      const here = children(ctx.graph, ctx.layer);
      if (here.some((b) => b.id === target)) return "it is already in this layer";
      if (here.some((b) => b.of === target)) return "it is already referenced here";
      return null;
    },
    run: (ctx, args) => {
      const id = new_id("block");
      const at = spot(args);
      const ref = handles(ctx, "reference");
      const out: Mutation[] = [{ op: "add_block", block: {
        id, parent: here(ctx), of: id_of(args, "target"), order: next_order(ctx.graph, here(ctx)),
        alias: ref.take(), ...typed(ctx, args),
      } }, ...ref.bump()];
      if (at) out.push({ op: "place_block", id, x: at.x, y: at.y });
      return { mutations: out };
    },
  },
);

register(
  {
    name: "open",
    about: "opens a block as the layer being drawn, or leaves this one when told no block",
    on: ["block"],
    args: [{ name: "id", form: "block" }],
    /** The layer opened must exist. */
    check: (ctx, args) => {
      const want = id_of(args, "id");
      return !want || ctx.graph.blocks[want] ? null : "that is not here any more";
    },
    /** No `id` leaves the layer; an interface returns to the layer it was entered from. */
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

register(
  {
    name: "arrange",
    about: "sets how the layer lays out, and tidies it into that shape",
    on: ["layer"],
    /** Sets the arrangement and writes the caller's positions, in one step. */
    args: [{ name: "arrangement", form: "choice", required: true, choices: ARRANGEMENTS },
           { name: "at", form: "text" }],
    check: (_ctx, args) =>
      ARRANGEMENTS.includes(String(args["arrangement"]) as Arrangement)
        ? null : `there is no arrangement called "${args["arrangement"]}"`,
    run: (ctx, args) => {
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
