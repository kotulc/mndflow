/** Fields, definitions, pinning, packages, and giving settings back. */

import { closes_cycle, def_at, def_named, def_of, domain_of, in_domain, is_base, name_taken,
         ordered_by, package_named, package_of, schema_of, type Domain } from "../defs";
import { next_order } from "../tree";
import { VALUE_FORMS, type Components, type Definition, type FieldDef, type Graph, type Id,
         type Mutation, type ValueForm } from "../types";
import { new_id } from "../ids";
import { register } from "./registry";
import { borrowed, holds_values, id_of, ids_of, list, mint_def, rooted, text } from "./helpers";

/** A new definition of the workspace's, where the user is: in the domain or holder named, else
 *  the workspace's domain. */
export function new_def(graph: Graph, said: Omit<Definition, "parent">, parent?: Id | null): Mutation {
  const at = parent && graph.blocks[parent] && in_domain(graph, parent) && !graph.blocks[parent]!.def
    && package_of(graph, parent) === graph.root ? parent : graph.root;
  return { op: "add_block", block: { ...said, parent: at, order: next_order(graph, at) } };
}

register(
  {
    name: "field",
    about: "sets a named value on a block, or adds a field to a definition",
    /** Blocks and definitions only; an edge holds no values. */
    on: ["layer", "block"],
    /** A block holds values; a definition declares fields. */
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true },
           { name: "value", form: "text" },
           { name: "form", form: "choice", choices: VALUE_FORMS },
           { name: "unit", form: "text" },
           { name: "choices", form: "text" },
           /** A new name for it, keeping its place and everything else it says. */
           { name: "to", form: "text" }],
    check: (ctx, args) => {
      if (!text(args, "name")) return "a field needs a name";
      const why = holds_values(ctx, args) ?? borrowed(ctx.graph, id_of(args, "holder"));
      if (why) return why;
      const to = text(args, "to");
      const had = held_fields(ctx.graph, id_of(args, "holder"));
      return to && to !== text(args, "name") && had.some((f) => f.name === to)
        ? `there is already a field called "${to}"` : null;
    },
    /** Only what was said changes; a renamed field keeps its place. */
    run: (ctx, args) => {
      const holder = id_of(args, "holder");
      const name = text(args, "name");
      const to = text(args, "to") || name;
      const d = def_at(ctx.graph, holder);
      const fields = held_fields(ctx.graph, holder);
      const had = fields.find((f) => f.name === name);
      const said = (key: string) => args[key] !== undefined;
      const form = String(args["form"] ?? had?.form
        ?? schema_of(ctx.graph, def_of(ctx.graph, holder)).find((f) => f.name === name)?.form
        ?? "text") as ValueForm;
      const field: FieldDef = {
        ...had, name: to, form: VALUE_FORMS.includes(form) ? form : "text",
        ...(said("value") ? { value: String(args["value"] ?? "") } : {}),
        ...(d && said("unit") ? { unit: text(args, "unit") || undefined } : {}),
        ...(d && said("choices")
          ? { choices: list(args["choices"]).length ? list(args["choices"]) : undefined } : {}),
      };
      const next = had ? fields.map((f) => (f.name === name ? field : f)) : [...fields, field];
      if (d) return { mutations: [{ op: "set_schema", id: holder, schema: next }] };
      if (to === name) return { mutations: [{ op: "set_value", id: holder, field }] };
      return { mutations: [{ op: "drop_value", id: holder, name },
                           { op: "set_value", id: holder, field },
                           { op: "order_values", id: holder, names: next.map((f) => f.name) }] };
    },
  },
  {
    name: "order_field",
    about: "moves a value or a declared field to before another",
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
        return { mutations: [{ op: "set_schema", id: holder, schema: ordered_by(fields, names) }] };
      }
      return { mutations: [{ op: "order_values", id: holder, names }] };
    },
  },
  {
    name: "unfield",
    about: "drops a named value from a block, or a field from a definition",
    on: ["layer", "block"],
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true }],
    check: (ctx, args) => holds_values(ctx, args) ?? borrowed(ctx.graph, id_of(args, "holder")),
    run: (ctx, args) => {
      const holder = id_of(args, "holder");
      const name = text(args, "name");
      if (!def_at(ctx.graph, holder)) return { mutations: [{ op: "drop_value", id: holder, name }] };
      return { mutations: [{ op: "set_schema", id: holder,
        schema: held_fields(ctx.graph, holder).filter((f) => f.name !== name) }] };
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
      const schema = args["schema"] as FieldDef[] | undefined;
      const type = args["extends"] === undefined ? held?.type ?? (domain === "relation" ? "line" : undefined)
        : rooted(ctx, text(args, "extends"), domain);
      if (!held) {
        const id = text(args, "id") || mint_def(domain);
        return { mutations: [new_def(ctx.graph, {
          id, name, ...(type && type !== "block" ? { type } : {}),
          ...(settings && Object.keys(settings).length ? { settings } : {}),
          def: schema?.length ? { schema } : {},
        }, args["parent"] ? id_of(args, "parent") : ctx.layer)] };
      }
      const out: Mutation[] = [];
      if (args["extends"] !== undefined) out.push({ op: "update_block", id: held.id, type: type ?? null });
      for (const [key, config] of Object.entries(settings ?? {})) {
        for (const [prop, value] of Object.entries(config)) {
          out.push({ op: "set_setting", id: held.id, key, name: prop, value });
        }
      }
      if (schema?.length) out.push({ op: "set_schema", id: held.id, schema });
      return { mutations: out };
    },
  },
);

/** The pinned list with one id added, or taken off. */
function pinning(graph: Graph, id: Id, on: boolean): Id[] {
  const held = graph.blocks[graph.root]?.pinned ?? [];
  return on ? [...held.filter((x) => x !== id), id] : held.filter((x) => x !== id);
}

/** Defining from an element, pinning one, removing one. */
register(
  {
    name: "define_from",
    about: "makes a definition of how this block or line is set, and makes it a usage of it",
    on: ["block", "edge"],
    /** The element's settings and field schema travel; values stay. */
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
      const schema = (ctx.graph.blocks[id]?.values ?? [])
        .map((f): FieldDef => ({ name: f.name, form: f.form }));

      /** Extends what it followed, and the element moves onto it. */
      const domain: Domain = edge ? "relation" : "block";
      const made = mint_def(domain);
      const over = def_of(ctx.graph, id);
      const out: Mutation[] = [
        new_def(ctx.graph, { id: made, name, ...(over && over !== "block" ? { type: over } : {}),
                             ...(Object.keys(settings).length ? { settings } : {}),
                             def: schema.length ? { schema } : {} }),
        edge ? { op: "update_edge", id, type: made } : { op: "update_block", id, type: made },
      ];
      /** The element gives back the settings that moved. */
      if (Object.keys(settings).length) out.push({ op: "drop_settings", id });
      return { mutations: out, effect: { say: `defined ${name}` } };
    },
  },
  /** Pinning offers a definition on the rail. */
  {
    name: "pin",
    about: "pins a definition so it is offered first, or takes it off",
    on: ["layer"],
    args: [{ name: "id", form: "text", required: true },
           { name: "on", form: "choice", choices: ["yes", "no"] }],
    /** Only a base is refused. */
    check: (ctx, args) => {
      const id = id_of(args, "id");
      const d = def_at(ctx.graph, id);
      if (!d) return `there is nothing called "${id}" to pin`;
      return is_base(id) ? `"${d.name}" is a base, and is never pinned` : null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const d = def_at(ctx.graph, id);
      const held = ctx.graph.blocks[ctx.graph.root]?.pinned ?? [];
      /** Absent toggles. */
      const said = args["on"] === undefined ? null : text(args, "on") === "yes";
      const want = said ?? !held.includes(id);
      return { mutations: [{ op: "set_pinned", ids: pinning(ctx.graph, id, want) }],
               effect: { say: `${d?.name ?? id} is ${want ? "pinned" : "unpinned"}` } };
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

register(
  {
    name: "package",
    about: "makes a named package, and moves definitions into it, frozen",
    on: ["layer"],
    args: [{ name: "name", form: "text", required: true, asks: true },
           /** Definitions to move into it, by id or by name. */
           { name: "defs", form: "text" }],
    /** A package is known by its name, so no two share one. */
    check: (ctx, args) => {
      const name = text(args, "name").trim();
      if (!name) return "a package needs a name";
      if (package_named(ctx.graph, name)) return `there is already a package called "${name}"`;
      for (const d of named_defs(ctx.graph, args)) {
        const why = borrowed(ctx.graph, d.id);
        if (why) return why;
      }
      return null;
    },
    run: (ctx, args) => {
      const id = new_id("pkg");
      return { mutations: [
        { op: "add_block", block: { id, parent: null, name: text(args, "name").trim() } },
        ...named_defs(ctx.graph, args).flatMap((d): Mutation[] => [
          { op: "move_block", id: d.id, parent: id },
        ]),
      ] };
    },
  },
);

/** The domain a definition is said to be in: the one named, else what it extends, else block. */
function domain_said(ctx: Parameters<typeof rooted>[0], args: { [k: string]: unknown }): Domain {
  const said = args["domain"];
  if (said === "block" || said === "relation") return said;
  const up = rooted(ctx, text(args, "extends"));
  return up ? domain_of(ctx.graph, up) : "block";
}

/** A holder's own fields: a definition's schema, or a block's values. */
function held_fields(graph: Graph, id: Id): FieldDef[] {
  const b = graph.blocks[id];
  return b?.def ? b.def.schema ?? [] : b?.values ?? [];
}

/** The workspace's definitions an argument names, by id or by name. */
function named_defs(graph: Graph, args: { [k: string]: unknown }): Definition[] {
  return list(args["defs"])
    .map((n) => def_at(graph, n) ?? def_named(graph, n))
    .filter((d): d is Definition => !!d && package_of(graph, d.id) === graph.root);
}
