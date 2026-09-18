/** Fields, definitions, pinning, and giving looks back. */

import { BASE_PACKAGE, def_named, def_of, isa, base_of, ordered_by, package_named, package_of,
         plain_type, schema_of, shipped, stored_type } from "../defs";
import { DRAWN } from "../components";
import { shelf_of } from "../shelf";
import { VALUE_FORMS, type Components, type Definition, type FieldDef, type Graph, type Id,
         type Mutation, type ValueForm } from "../types";
import { new_id } from "../ids";
import { register } from "./registry";
import { borrowed, holds_values, id_of, ids_of, list, mint_def, rooted, text } from "./helpers";

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
      const holder = id_of(args, "holder");
      const had = ctx.graph.defs[holder]?.fields ?? ctx.graph.blocks[holder]?.fields ?? [];
      return to && to !== text(args, "name") && had.some((f) => f.name === to)
        ? `there is already a field called "${to}"` : null;
    },
    /** Only what was said changes; a renamed field keeps its place. */
    run: (ctx, args) => {
      const holder = id_of(args, "holder");
      const name = text(args, "name");
      const to = text(args, "to") || name;
      const d = ctx.graph.defs[holder];
      const b = ctx.graph.blocks[holder];
      const fields: readonly FieldDef[] = d?.fields ?? b?.fields ?? [];
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
      if (d) return { mutations: [{ op: "set_def", def: { ...d, fields: next } }] };
      if (to === name) return { mutations: [{ op: "set_field", id: holder, field }] };
      return { mutations: [{ op: "drop_field", id: holder, name },
                           { op: "set_field", id: holder, field },
                           { op: "order_fields", id: holder, names: next.map((f) => f.name) }] };
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
    check: (ctx, args) =>
      holds_values(ctx, args) ?? borrowed(ctx.graph, id_of(args, "holder")),
    run: (ctx, args) => {
      const holder = id_of(args, "holder");
      const name = text(args, "name");
      const before = text(args, "before");
      const d = ctx.graph.defs[holder];
      const names = (d?.fields ?? ctx.graph.blocks[holder]?.fields ?? [])
        .map((f) => f.name).filter((n) => n !== name);
      const at = before ? names.indexOf(before) : -1;
      names.splice(at < 0 ? names.length : at, 0, name);
      if (d) return { mutations: [{ op: "set_def", def: { ...d, fields: ordered_by(d.fields ?? [], names) } }] };
      return { mutations: [{ op: "order_fields", id: holder, names }] };
    },
  },
  {
    name: "unfield",
    about: "drops a named value from a block, or a field from a definition",
    on: ["layer", "block"],
    args: [{ name: "holder", form: "block", required: true },
           { name: "name", form: "text", required: true }],
    check: (ctx, args) =>
      holds_values(ctx, args) ?? borrowed(ctx.graph, id_of(args, "holder")),
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
    about: "names a new definition, or restates one of that name",
    on: ["layer"],
    /** `id` is optional: a caller that must know the new id before the step lands (the tray's
     *  draft) mints it. */
    args: [{ name: "name", form: "text", required: true },
           { name: "group", form: "choice", required: true, choices: ["block", "relation"] },
           { name: "extends", form: "text" },
           { name: "label", form: "text" },
           /** The folder a new one is filed in; absent is its group's top. */
           { name: "into", form: "text" }],
    check: (ctx, args) => {
      const name = text(args, "name");
      if (!name) return "a definition needs a name";
      const group = args["group"];
      if (group !== "block" && group !== "relation") return "say whether it defines a block or a relation";
      const held = def_named(ctx.graph, name, group);
      const why = held ? borrowed(ctx.graph, held.id) : null;
      if (why) return why;
      const said = text(args, "extends");
      const up = rooted(ctx, said, group);
      if (said && !up) return `there is no definition called "${said}"`;
      if (up && ctx.graph.defs[up]!.group !== group) return `"${said}" is not a ${group} definition`;
      if (held && up && isa(ctx.graph, up).some((d) => d.id === held.id)) {
        return `"${name}" cannot extend itself or anything below it`;
      }
      const into = text(args, "into");
      const folder = shelf_of(ctx.graph).some((s) => s.id === into && s.name !== undefined && s.group === group);
      return into && !folder ? `that is not a folder of ${group} definitions` : null;
    },
    /** Over what is there: only what was said changes. */
    run: (ctx, args) => {
      const name = text(args, "name");
      const group = args["group"] as "block" | "relation";
      const held = def_named(ctx.graph, name, group);
      const id = held?.id ?? (text(args, "id") || mint_def(group));
      const components = args["components"] as Components | undefined;
      const fields = args["fields"] as FieldDef[] | undefined;
      const said = args["extends"] === undefined ? held?.extends
                                                 : rooted(ctx, text(args, "extends"), group);
      const label = args["label"] === undefined ? held?.label : text(args, "label") || undefined;
      /** A new one said to go in a folder is filed there. */
      const into = held ? "" : text(args, "into");
      const filed: Mutation[] = into
        ? [{ op: "set_shelf", shelf: [...shelf_of(ctx.graph), { id, group, in: into }] }] : [];
      return { mutations: [{ op: "set_def", def: {
        ...held,
        id, name, group, label,
        extends: said ?? held?.default ?? (group === "relation" ? "line" : "block"),
        ...(group === "relation" && !held?.components?.["line"] ? { components: { ...held?.components, line: {} } } : {}),
        ...(components && Object.keys(components).length ? { components } : {}),
        ...(fields?.length ? { fields } : {}),
      } }, ...filed] };
    },
  },
  {
    name: "rename_def",
    about: "changes what a definition is called, and so what every usage naming it reads",
    on: ["layer"],
    /** The id stays, so everything naming it follows. */
    args: [{ name: "id", form: "text", required: true },
           { name: "name", form: "text", required: true }],
    check: (ctx, args) => {
      const d = ctx.graph.defs[id_of(args, "id")];
      if (!d) return "there is no such definition";
      const name = text(args, "name");
      if (!name) return "a definition needs a name";
      if (d.default) return `the ${d.default} default keeps its name`;
      const other = def_named(ctx.graph, name, d.group);
      if (other && other.id !== d.id) return `"${other.name}" already exists`;
      return borrowed(ctx.graph, d.id);
    },
    run: (ctx, args) => {
      const d = ctx.graph.defs[id_of(args, "id")]!;
      return { mutations: [{ op: "set_def", def: { ...d, name: text(args, "name") } }] };
    },
  },
);

/** The pinned list with one id added, or taken off. */
function pinning(graph: Graph, id: Id, on: boolean): Id[] {
  const held = graph.blocks[graph.root]?.pinned ?? [];
  return on ? [...held.filter((x) => x !== id), id] : held.filter((x) => x !== id);
}

/** Saving a look as a definition, pinning one, removing one. */
register(
  {
    name: "save_def",
    about: "saves how this looks as a definition anything else can name",
    on: ["block", "edge"],
    /** The element's looks and field schema travel; values stay. */
    args: [{ name: "id", form: "block", required: true },
           { name: "name", form: "text", required: true, asks: true }],
    /** A name already taken in the group is refused. */
    check: (ctx, args) => {
      const id = id_of(args, "id");
      if (!ctx.graph.blocks[id] && !ctx.graph.edges[id]) return "pick a block or a line to save";
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
      /** A saved run always draws as a line. */
      const taken: Components = edge ? { line: {} } : {};
      for (const [key, config] of Object.entries(it.looks ?? {})) taken[key] = { ...config };
      const fields = (ctx.graph.blocks[id]?.fields ?? [])
        .map((f): FieldDef => ({ name: f.name, form: f.form }));

      /** Extends what it followed, and the element moves onto it. */
      const over = def_of(ctx.graph, id);
      const label = edge ? ctx.graph.defs[over ?? ""]?.label : undefined;
      const def: Definition = {
        id: mint_def(edge ? "relation" : "block"), group: edge ? "relation" : "block", name,
        ...(label ? { label } : {}),
        extends: over,
        fields: fields.length ? fields : undefined,
        components: Object.keys(taken).length ? taken : undefined,
      };

      const out: Mutation[] = [{ op: "set_def", def },
                               edge ? { op: "update_edge", id, type: def.id }
                                    : { op: "update_block", id, type: def.id }];
      /** The element drops the looks that moved. */
      for (const [key, config] of Object.entries(taken)) {
        for (const prop of Object.keys(config)) {
          out.push({ op: "set_look", id, key, name: prop, value: null });
        }
      }
      return { mutations: out, effect: { say: `saved ${name}` } };
    },
  },
  /** Pinning offers a definition on the rail or in the pinned folder. */
  {
    name: "pin",
    about: "offers a definition on the rail or in the pinned folder, or takes it off",
    on: ["layer"],
    args: [{ name: "id", form: "text", required: true },
           { name: "on", form: "choice", choices: ["yes", "no"] }],
    /** Bases and defaults are never pinned. */
    check: (ctx, args) => {
      const id = id_of(args, "id");
      const d = ctx.graph.defs[id];
      if (!d) return `there is nothing called "${id}" to pin`;
      return shipped(d) || d.default ? `"${d.name}" is a base or a default, and is never pinned` : null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const d = ctx.graph.defs[id];
      const held = ctx.graph.blocks[ctx.graph.root]?.pinned ?? [];
      /** Absent toggles. */
      const said = args["on"] === undefined ? null : text(args, "on") === "yes";
      const want = said ?? !held.includes(id);
      const where = d?.group === "relation" ? "the rail" : "the pinned folder";
      return { mutations: [{ op: "set_pinned", ids: pinning(ctx.graph, id, want) }],
               effect: { say: `${d?.name ?? id} is ${want ? "in" : "out of"} ${where}` } };
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
      if (!ctx.graph.defs[id]) return `there is nothing called "${id}" to remove`;
      if (ctx.graph.defs[id]!.default) return "a default stays — reset its style instead";
      return borrowed(ctx.graph, id);
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const d = ctx.graph.defs[id];
      const out: Mutation[] = [];

      const usages = [...Object.values(ctx.graph.blocks), ...Object.values(ctx.graph.edges)];
      for (const it of usages) {
        if (it.type !== id) continue;
        /** A usage's own look wins. */
        for (const [key, config] of Object.entries(d?.components ?? {})) {
          for (const [prop, value] of Object.entries(config)) {
            if (it.looks?.[key]?.[prop] === undefined) {
              out.push({ op: "set_look", id: it.id, key, name: prop, value });
            }
          }
        }
        /** Only blocks take the schema back. */
        const held = ctx.graph.blocks[it.id];
        for (const f of held ? d?.fields ?? [] : []) {
          if (!(held!.fields ?? []).some((had) => had.name === f.name)) {
            out.push({ op: "set_field", id: it.id, field: { name: f.name, form: f.form } });
          }
        }
        /** The usage names what this extended, stored as plain where that is a base or default. */
        const edge = ctx.graph.edges[it.id];
        const type = stored_type(ctx.graph, d?.extends)
          ?? (edge ? null : plain_type(base_of(ctx.graph, it.id)));
        out.push(edge ? { op: "update_edge", id: it.id, type }
                      : { op: "update_block", id: it.id, type });
      }

      /** A subtype takes over what it inherited from here, its own word winning. */
      for (const sub of Object.values(ctx.graph.defs)) {
        if (sub.extends !== id) continue;
        const components: Components = { ...d?.components };
        for (const [key, config] of Object.entries(sub.components ?? {})) {
          components[key] = { ...components[key], ...config };
        }
        const own = new Set((sub.fields ?? []).map((f) => f.name));
        const fields = [...(d?.fields ?? []).filter((f) => !own.has(f.name)), ...(sub.fields ?? [])];
        out.push({ op: "set_def", def: { ...sub, extends: d?.extends,
          components: Object.keys(components).length ? components : undefined,
          fields: fields.length ? fields : undefined } });
      }

      /** Unpinned as it goes. */
      const ws = ctx.graph.blocks[ctx.graph.root];
      if ((ws?.pinned ?? []).includes(id)) {
        out.push({ op: "set_pinned", ids: ws!.pinned!.filter((x) => x !== id) });
      }

      out.push({ op: "drop_def", id });
      return { mutations: out, effect: { say: `removed ${d?.name ?? id}` } };
    },
  },
);

/** Gives every look back to what it inherits. */
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
    run: (ctx, args) => {
      const out: Mutation[] = [];
      for (const id of ids_of(ctx, args)) {
        const d = ctx.graph.defs[id];
        if (d) {
          /** A relation definition reset keeps drawing as a line. */
          const held: Components = { ...(d.components ?? {}) };
          for (const key of DRAWN) delete held[key];
          if (d.group === "relation") held["line"] = {};
          out.push({ op: "set_def", def: { ...d,
            components: Object.keys(held).length ? held : undefined } });
          continue;
        }
        out.push({ op: "drop_looks", id });
      }
      return { mutations: out };
    },
  },
);

register(
  {
    name: "package",
    about: "makes a named package, and files definitions into it",
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
      const pkg = { id: new_id("pkg"), name: text(args, "name").trim() };
      return { mutations: [
        { op: "set_package", pkg },
        ...named_defs(ctx.graph, args)
          .map((d): Mutation => ({ op: "set_def", def: { ...d, from: pkg.id } })),
      ] };
    },
  },
  {
    name: "remove_package",
    about: "drops a package and everything it brought",
    on: ["layer"],
    args: [{ name: "id", form: "text", required: true }],
    check: (ctx, args) => {
      const pkg = package_of(ctx.graph, text(args, "id"));
      if (!pkg) return `there is nothing called "${text(args, "id")}" to remove`;
      return pkg.id === BASE_PACKAGE ? "the shipped floor is not a package to remove" : null;
    },
    /** `check` is what refuses an id that names no package; the drop itself is always the one
     *  gesture, and folding one that is not there changes nothing. */
    run: (ctx, args) => ({ mutations: [
      { op: "drop_package", id: package_of(ctx.graph, text(args, "id"))?.id ?? text(args, "id") },
    ] }),
  },
);

/** The definitions an argument names, by id or by name, that a package may take. */
function named_defs(graph: Graph, args: { [k: string]: unknown }): Definition[] {
  return list(args["defs"])
    .map((n) => graph.defs[n] ?? def_named(graph, n))
    .filter((d): d is Definition => !!d && !shipped(d) && !d.default);
}
