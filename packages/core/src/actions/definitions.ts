/** Fields, definitions, and giving settings back. */

import { closes_cycle, def_at, def_named, def_of, domain_of, in_domain, name_taken, ordered_by,
         package_of, type Domain } from "../defs";
import { next_order } from "../tree";
import { type Attribute, type Components, type Definition, type Graph, type Id,
         type Mutation } from "../types";
import { register } from "./registry";
import { borrowed, holds_values, id_of, ids_of, mint_def, rooted, text } from "./helpers";

/** A new definition of the workspace's, where the user is: in the domain or holder named, else
 *  the workspace's domain. */
export function new_def(graph: Graph, said: Omit<Definition, "parent">, parent?: Id | null): Mutation {
  const at = parent && graph.blocks[parent] && in_domain(graph, parent) && !graph.blocks[parent]!.def
    && package_of(graph, parent) === graph.root ? parent : graph.root;
  return { op: "add_block", block: { ...said, parent: at, order: next_order(graph, at) } };
}

/** What an attribute may say beside its name: words, and yeses. */
const SAID = ["unit", "default", "note"] as const;
const FLAGS = ["key", "many", "optional"] as const;

register(
  {
    name: "field",
    about: "answers an attribute on a block, or declares one on a definition",
    /** Blocks and definitions only; an edge holds no values. */
    on: ["layer", "block"],
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true },
           { name: "value", form: "text" },
           /** A value type or a block definition, by name or id; a new name makes a value type. */
           { name: "type", form: "text" },
           { name: "unit", form: "text" }, { name: "default", form: "text" },
           { name: "note", form: "text" },
           { name: "key", form: "choice", choices: ["true", "false"] },
           { name: "many", form: "choice", choices: ["true", "false"] },
           { name: "optional", form: "choice", choices: ["true", "false"] },
           /** A new name for it, keeping its place and everything else it says. */
           { name: "to", form: "text" }],
    check: (ctx, args) => {
      if (!text(args, "name")) return "an attribute needs a name";
      const why = holds_values(ctx, args) ?? borrowed(ctx.graph, id_of(args, "holder"));
      if (why) return why;
      const to = text(args, "to");
      const had = held_fields(ctx.graph, id_of(args, "holder"));
      return to && to !== text(args, "name") && had.some((f) => f.name === to)
        ? `there is already an attribute called "${to}"` : null;
    },
    /** Only what was said changes; a renamed attribute keeps its place. */
    run: (ctx, args) => {
      const holder = id_of(args, "holder");
      const name = text(args, "name");
      const to = text(args, "to") || name;
      if (!def_at(ctx.graph, holder)) return { mutations: answered(ctx.graph, holder, name, to, args) };
      const out: Mutation[] = [];
      const attributes = ctx.graph.blocks[holder]!.def!.attributes ?? [];
      const had = attributes.find((a) => a.name === name);
      const attribute: Attribute = { ...had, name: to };
      if (args["type"] !== undefined) {
        const typed = type_named(ctx, text(args, "type"), out);
        if (typed) attribute.type = typed;
        else delete attribute.type;
      }
      for (const key of SAID) {
        if (args[key] === undefined) continue;
        if (text(args, key)) attribute[key] = text(args, key);
        else delete attribute[key];
      }
      for (const key of FLAGS) {
        if (args[key] === undefined) continue;
        if (args[key] === true || args[key] === "true") attribute[key] = true;
        else delete attribute[key];
      }
      const next = had ? attributes.map((a) => (a.name === name ? attribute : a))
        : [...attributes, attribute];
      return { mutations: [...out, { op: "set_attributes", id: holder, attributes: next }] };
    },
  },
  {
    name: "order_field",
    about: "moves an answer or an attribute to before another",
    on: ["layer", "block"],
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true },
           /** Which it goes in front of. Absent is last. */
           { name: "before", form: "text" }],
    check: (ctx, args) => holds_values(ctx, args) ?? borrowed(ctx.graph, id_of(args, "holder")),
    run: (ctx, args) => {
      const holder = id_of(args, "holder");
      const name = text(args, "name");
      const before = text(args, "before");
      const fields = held_fields(ctx.graph, holder);
      const names = fields.map((f) => f.name).filter((n) => n !== name);
      const at = before ? names.indexOf(before) : -1;
      names.splice(at < 0 ? names.length : at, 0, name);
      if (def_at(ctx.graph, holder)) {
        return { mutations: [{ op: "set_attributes", id: holder,
                               attributes: ordered_by(fields as Attribute[], names) }] };
      }
      return { mutations: [{ op: "order_values", id: holder, names }] };
    },
  },
  {
    name: "unfield",
    about: "drops an answer from a block, or an attribute from a definition",
    on: ["layer", "block"],
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true }],
    check: (ctx, args) => holds_values(ctx, args) ?? borrowed(ctx.graph, id_of(args, "holder")),
    run: (ctx, args) => {
      const holder = id_of(args, "holder");
      const name = text(args, "name");
      if (!def_at(ctx.graph, holder)) return { mutations: [{ op: "drop_value", id: holder, name }] };
      return { mutations: [{ op: "set_attributes", id: holder,
        attributes: (held_fields(ctx.graph, holder) as Attribute[]).filter((f) => f.name !== name) }] };
    },
  },
  {
    name: "define",
    about: "makes a definition in a domain, where you are, or restates one of that name",
    on: ["layer"],
    /** `id` is optional: a caller that must know the new id before the step lands (the tray's
     *  draft) mints it. */
    args: [{ name: "name", form: "text", required: true },
           { name: "domain", form: "choice", choices: ["block", "relation"] },
           { name: "extends", form: "text" },
           { name: "parent", form: "block" }],
    check: (ctx, args) => {
      const name = text(args, "name");
      if (!name) return "a definition needs a name";
      const home = args["parent"] ? borrowed(ctx.graph, id_of(args, "parent")) : null;
      if (home) return home;
      const domain = domain_said(ctx, args);
      const held = def_named(ctx.graph, name, domain);
      const why = held ? borrowed(ctx.graph, held.id) : null;
      if (why) return why;
      if (!held && name_taken(ctx.graph, ctx.graph.root, name)) return `"${name}" already exists`;
      const said = text(args, "extends");
      const up = rooted(ctx, said, domain);
      if (said && !up) return `there is no definition called "${said}"`;
      if (up && domain_of(ctx.graph, up) !== domain) return `"${said}" is not a ${domain} definition`;
      return held && closes_cycle(ctx.graph, held.id, up)
        ? `"${name}" cannot extend itself or anything below it` : null;
    },
    /** Over what is there: only what was said changes. */
    run: (ctx, args) => {
      const name = text(args, "name");
      const domain = domain_said(ctx, args);
      const held = def_named(ctx.graph, name, domain);
      const settings = args["settings"] as Components | undefined;
      const attributes = args["attributes"] as Attribute[] | undefined;
      const type = args["extends"] === undefined ? held?.type ?? (domain === "relation" ? "line" : undefined)
        : rooted(ctx, text(args, "extends"), domain);
      if (!held) {
        const id = text(args, "id") || mint_def(domain);
        return { mutations: [new_def(ctx.graph, {
          id, name, ...(type && type !== "block" ? { type } : {}),
          ...(settings && Object.keys(settings).length ? { settings } : {}),
          def: attributes?.length ? { attributes } : {},
        }, args["parent"] ? id_of(args, "parent") : ctx.layer)] };
      }
      const out: Mutation[] = [];
      if (args["extends"] !== undefined) out.push({ op: "update_block", id: held.id, type: type ?? null });
      for (const [key, config] of Object.entries(settings ?? {})) {
        for (const [prop, value] of Object.entries(config)) {
          out.push({ op: "set_setting", id: held.id, key, name: prop, value });
        }
      }
      if (attributes?.length) out.push({ op: "set_attributes", id: held.id, attributes });
      return { mutations: out };
    },
  },
);

/** Defining from an element. */
register(
  {
    name: "define_from",
    about: "makes a definition of how this block or line is set, and makes it a usage of it",
    on: ["block", "edge"],
    /** The element's settings travel, and the names it answers become the attributes declared;
     *  its values stay. */
    args: [{ name: "id", form: "block", required: true },
           { name: "name", form: "text", required: true, asks: true }],
    /** A name already taken in the domain is refused. */
    check: (ctx, args) => {
      const id = id_of(args, "id");
      if (!ctx.graph.blocks[id] && !ctx.graph.edges[id]) return "pick a block or a line to define from";
      if (def_at(ctx.graph, id)) return "that is a definition already — extend it instead";
      const name = text(args, "name");
      if (!name) return "a definition needs a name";
      return name_taken(ctx.graph, ctx.graph.root, name) ? `"${name}" is already taken` : null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const edge = ctx.graph.edges[id];
      const it = ctx.graph.blocks[id] ?? edge!;
      const name = text(args, "name");
      const settings: Components = {};
      for (const [key, config] of Object.entries(it.settings ?? {})) settings[key] = { ...config };
      const attributes = (ctx.graph.blocks[id]?.values ?? [])
        .map((v): Attribute => ({ name: v.name }));

      /** Extends what it followed, and the element moves onto it. */
      const domain: Domain = edge ? "relation" : "block";
      const made = mint_def(domain);
      const over = def_of(ctx.graph, id);
      const out: Mutation[] = [
        new_def(ctx.graph, { id: made, name, ...(over && over !== "block" ? { type: over } : {}),
                             ...(Object.keys(settings).length ? { settings } : {}),
                             def: attributes.length ? { attributes } : {} }),
        edge ? { op: "update_edge", id, type: made } : { op: "update_block", id, type: made },
      ];
      /** The element gives back the settings that moved. */
      if (Object.keys(settings).length) out.push({ op: "drop_settings", id });
      return { mutations: out, effect: { say: `defined ${name}` } };
    },
  },
);

/** Gives every drawing setting back to what it inherits. */
register(
  {
    name: "none",
    about: "gives back every look this says for itself, to whatever it inherits",
    on: ["block", "edge", "selection"],
    args: [{ name: "ids", form: "block", required: true }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      for (const id of ids) {
        const why = borrowed(ctx.graph, id);
        if (why) return why;
      }
      return null;
    },
    run: (ctx, args) => ({ mutations: ids_of(ctx, args)
      .map((id): Mutation => ({ op: "drop_settings", id })) }),
  },
);

/** The domain a definition is said to be in: the one named, else what it extends, else block. */
function domain_said(ctx: Parameters<typeof rooted>[0], args: { [k: string]: unknown }): Domain {
  const said = args["domain"];
  if (said === "block" || said === "relation") return said;
  const up = rooted(ctx, text(args, "extends"));
  return up ? domain_of(ctx.graph, up) : "block";
}

/** A holder's own: a definition's attributes, or a block's answers. */
function held_fields(graph: Graph, id: Id): { name: string }[] {
  const b = graph.blocks[id];
  return b?.def ? b.def.attributes ?? [] : b?.values ?? [];
}

/** A block's answer, set in place, or renamed in place where it was renamed. */
function answered(graph: Graph, holder: Id, name: string, to: string,
                  args: Record<string, unknown>): Mutation[] {
  const values = graph.blocks[holder]?.values ?? [];
  const had = values.find((v) => v.name === name);
  const value = args["value"] !== undefined ? String(args["value"] ?? "") : had?.value ?? "";
  if (to === name) return [{ op: "set_value", id: holder, name, value }];
  const names = values.map((v) => (v.name === name ? to : v.name));
  return [{ op: "drop_value", id: holder, name },
          { op: "set_value", id: holder, name: to, value },
          { op: "order_values", id: holder, names: had ? names : [...names, to] }];
}

/** The type an attribute names: a definition by id or name. A name nothing holds makes a value
 *  type of the workspace's, extending text; empty is no type. */
function type_named(ctx: Parameters<typeof rooted>[0], said: string, out: Mutation[]): Id | null {
  if (!said) return null;
  const hit = rooted(ctx, said, "block");
  if (hit) return hit;
  const id = mint_def("block");
  out.push(new_def(ctx.graph, { id, name: said, type: "text", def: {} }));
  return id;
}
