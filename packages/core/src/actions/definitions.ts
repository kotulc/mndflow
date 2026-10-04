/** Fields, definitions, pinning, packages, and giving settings back. */

import { base_of, def_at, def_named, def_of, dependents, domain_of, isa, is_base,
         ordered_by, package_named, package_of, plain_type, schema_of, stored_type,
         type Domain } from "../defs";
import { is_tag } from "../tags";
import { children, next_order, subtree } from "../tree";
import { BASE_PACKAGE, VALUE_FORMS, type Components, type Definition, type FieldDef, type Graph,
         type Id, type Mutation, type ValueForm } from "../types";
import { new_id } from "../ids";
import { register } from "./registry";
import { borrowed, holds_values, id_of, ids_of, list, mint_def, rooted, text } from "./helpers";

/** The group a new definition of the workspace's is filed in, by what it is. */
function filed(graph: Graph, domain: Domain, type: Id | undefined): Id | undefined {
  const slot = domain === "relation" ? "relations" : is_tag(graph, type) || type === "tag"
    ? "tags" : "blocks";
  const id = `${graph.root}.${slot}`;
  return graph.blocks[id] ? id : undefined;
}

/** A new definition of the workspace's, filed with its kind. */
export function new_def(graph: Graph, said: Omit<Definition, "parent">, domain: Domain): Mutation {
  const group = filed(graph, domain, said.type);
  return { op: "add_block", block: { ...said, parent: graph.root,
                                     order: next_order(graph, graph.root),
                                     ...(group ? { group } : {}) } };
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
    about: "names a new definition in the workspace, or restates one of that name",
    on: ["layer"],
    /** `id` is optional: a caller that must know the new id before the step lands (the tray's
     *  draft) mints it. */
    args: [{ name: "name", form: "text", required: true },
           { name: "domain", form: "choice", required: true, choices: ["block", "relation"] },
           { name: "extends", form: "text" }],
    check: (ctx, args) => {
      const name = text(args, "name");
      if (!name) return "a definition needs a name";
      const domain = args["domain"];
      if (domain !== "block" && domain !== "relation") {
        return "say whether it defines a block or a relation";
      }
      const held = def_named(ctx.graph, name, domain);
      const why = held ? borrowed(ctx.graph, held.id) : null;
      if (why) return why;
      const said = text(args, "extends");
      const up = rooted(ctx, said, domain);
      if (said && !up) return `there is no definition called "${said}"`;
      if (up && domain_of(ctx.graph, up) !== domain) return `"${said}" is not a ${domain} definition`;
      return held && up && isa(ctx.graph, up).some((d) => d.id === held.id)
        ? `"${name}" cannot extend itself or anything below it` : null;
    },
    /** Over what is there: only what was said changes. */
    run: (ctx, args) => {
      const name = text(args, "name");
      const domain = args["domain"] as Domain;
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
        }, domain)] };
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
      const held = def_named(ctx.graph, name, ctx.graph.edges[id] ? "relation" : "block");
      return held ? `"${held.name}" is already taken` : null;
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
                             def: schema.length ? { schema } : {} }, domain),
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
  {
    name: "remove_def",
    about: "dissolves a definition back into everything that named it, and drops it",
    on: ["layer"],
    /** Dissolves a definition into its usages, losslessly, then drops it. */
    args: [{ name: "id", form: "text", required: true }],
    check: (ctx, args) => {
      const id = id_of(args, "id");
      const d = def_at(ctx.graph, id);
      if (!d) return `there is nothing called "${id}" to remove`;
      const why = borrowed(ctx.graph, id);
      if (why) return why;
      if (children(ctx.graph, id).some((b) => b.def)) {
        return `"${d.name}" holds definitions — move them out first`;
      }
      return null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      /** `check` is what refuses an id that names nothing; the drop itself is always written. */
      const d = def_at(ctx.graph, id);
      const out: Mutation[] = [];

      const usages = [...Object.values(ctx.graph.blocks), ...Object.values(ctx.graph.edges)];
      for (const it of usages) {
        if (it.type !== id) continue;
        const sub = "def" in it && !!it.def;
        /** A usage's or a subtype's own word wins. */
        for (const [key, config] of Object.entries(d?.settings ?? {})) {
          for (const [prop, value] of Object.entries(config)) {
            if (it.settings?.[key]?.[prop] === undefined) {
              out.push({ op: "set_setting", id: it.id, key, name: prop, value });
            }
          }
        }
        const block = ctx.graph.blocks[it.id];
        if (sub && block?.def) {
          /** A subtype takes over the fields it inherited from here. */
          const own = new Set((block.def.schema ?? []).map((f) => f.name));
          const schema = [...(d?.def.schema ?? []).filter((f) => !own.has(f.name)),
                          ...(block.def.schema ?? [])];
          if (schema.length) out.push({ op: "set_schema", id: it.id, schema });
          out.push({ op: "update_block", id: it.id, type: d?.type ?? null });
          continue;
        }
        /** A usage takes the schema back as values. */
        for (const f of block ? d?.def.schema ?? [] : []) {
          if (!(block!.values ?? []).some((had) => had.name === f.name)) {
            out.push({ op: "set_value", id: it.id, field: { name: f.name, form: f.form } });
          }
        }
        const edge = ctx.graph.edges[it.id];
        const type = stored_type(ctx.graph, d?.type)
          ?? (edge ? null : plain_type(base_of(ctx.graph, it.id)));
        out.push(edge ? { op: "update_edge", id: it.id, type }
                      : { op: "update_block", id: it.id, type });
      }

      /** A tag comes off everything carrying it. */
      for (const it of usages) {
        if (it.tags?.includes(id)) {
          out.push({ op: "set_tags", id: it.id, tags: it.tags.filter((t) => t !== id) });
        }
      }

      /** Unpinned as it goes. */
      const ws = ctx.graph.blocks[ctx.graph.root];
      if ((ws?.pinned ?? []).includes(id)) {
        out.push({ op: "set_pinned", ids: ws!.pinned!.filter((x) => x !== id) });
      }

      /** What it is made of goes with it. */
      out.push({ op: "delete_block", id });
      return { mutations: out, effect: { say: `removed ${d?.name ?? id}` } };
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
  {
    name: "remove_package",
    about: "drops a package and everything it brought, where nothing still uses it",
    on: ["layer"],
    args: [{ name: "id", form: "text", required: true }],
    check: (ctx, args) => {
      const pkg = package_named(ctx.graph, text(args, "id"));
      if (!pkg) return `there is nothing called "${text(args, "id")}" to remove`;
      if (pkg.id === BASE_PACKAGE) return "the base package is every workspace's";
      if (pkg.id === ctx.graph.root) return "the workspace is not a package to remove";
      const needs = dependents(ctx.graph, pkg.id);
      if (needs.length) return `${needs.map((p) => p.name ?? p.id).join(", ")} depends on it`;
      const inside = new Set(subtree(ctx.graph, pkg.id));
      const users = Object.values(ctx.graph.blocks).filter((b) => !inside.has(b.id)
        && ((b.type && inside.has(b.type)) || b.tags?.some((t) => inside.has(t))));
      const lines = Object.values(ctx.graph.edges).filter((e) => e.type && inside.has(e.type));
      const n = users.length + lines.length;
      return n ? `${n} ${n === 1 ? "element uses" : "elements use"} it` : null;
    },
    /** `check` is what refuses an id that names no package; the drop itself is always written. */
    run: (ctx, args) => ({ mutations: [
      { op: "delete_block", id: package_named(ctx.graph, text(args, "id"))?.id ?? text(args, "id") },
    ] }),
  },
);

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
