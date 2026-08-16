/** Fields and definitions: descriptive values, and the subtypes that declare them.
 *
 *  Four actions. `field` absorbs adding and updating — a rename is a drop and
 *  a set, since a field is addressed by its name and has no id. `define`
 *  absorbs minting and renaming a definition the same way.
 *
 *  Loaded for its side effect: {@link register} publishes these at import.
 *  S1.6 wires the import; until then the registry does not see them. */

import { fieldsOf } from "../graph/fold";
import {
  defIdFor, type ElemForm, type EdgeForm, type Field, type Mutation,
} from "../graph/types";
import { register, type Action, type Args, type Context, type Effect } from "./index";

const EDGE_FORMS = ["line", "directed"] as const;
const ELEM_FORMS = ["block", "note", "group", "proxy"] as const;
const DEF_FORMS = [...ELEM_FORMS, ...EDGE_FORMS];

function as_patch(args: Args): Partial<Field> {
  const patch = args.patch;
  if (!patch || typeof patch !== "object") return {};
  return patch as Partial<Field>;
}

function as_def_patch(args: Args): Partial<Extract<Mutation, { op: "set_def" }>> {
  const patch = args.patch;
  if (!patch || typeof patch !== "object") return {};
  const rest = { ...(patch as Record<string, unknown>) };
  delete rest.name;
  delete rest.form;
  delete rest.id;
  delete rest.op;
  return rest as Partial<Extract<Mutation, { op: "set_def" }>>;
}

function holder_of(ctx: Context, args: Args): string {
  const named = args.holder != null ? String(args.holder) : "";
  if (named) return named;
  return ctx.picked?.id ?? "";
}

/** Whether this id carries fields — an element or a relationship. */
function holds_fields(ctx: Context, id: string): boolean {
  return Boolean(ctx.graph.elements[id] || ctx.graph.edges[id]);
}

/** A descriptive value on one element or relationship, addressed by its name.
 *
 *  An attribute has no identity of its own — setting the same name again
 *  rewrites it. Everything but the name is a patch: what is not mentioned
 *  keeps what it had, so editing a value never restates the form. */
const field: Action = {
  name: "field",
  label: "Field",
  about: "set a named value on this, or rename one it already carries",
  // actions.md: element, edge. Scope holds one `on`; element is the common
  // case. Offering against a picked edge waits on Scope being able to say both.
  scope: { on: "element" },
  args: [
    { kind: "text", name: "holder", optional: true },
    { kind: "text", name: "name", prompt: "field name" },
  ],
  check: (ctx, args) => {
    const holder = holder_of(ctx, args);
    const name = String(args.name ?? "").trim();
    if (!holds_fields(ctx, holder)) return "Nothing to put a field on.";
    if (!name) return "Needs a name.";
    const patch = as_patch(args);
    const next = (patch.name ?? name).trim();
    if (!next) return "Needs a name.";
    return null;
  },
  run: (ctx, args): Effect => {
    const holder = holder_of(ctx, args);
    const name = String(args.name).trim();
    const patch = as_patch(args);
    const renamed = patch.name !== undefined && patch.name !== name;
    const held = fieldsOf(ctx.graph, holder).find((f) => f.name === name);
    const next = (patch.name ?? name).trim();

    return {
      mutations: [
        ...(renamed ? [{ op: "drop_field" as const, id: holder, name }] : []),
        { op: "set_field", id: holder, ...held, ...patch, name: next },
      ],
      say: `field: ${next}`,
    };
  },
};

/** Drop a field. The holder keeps every other. */
const unfield: Action = {
  name: "unfield",
  label: "Drop field",
  about: "drop a named value from this",
  scope: { on: "element" },
  args: [
    { kind: "text", name: "holder", optional: true },
    { kind: "text", name: "name", prompt: "which field?" },
  ],
  check: (ctx, args) => {
    const holder = holder_of(ctx, args);
    const name = String(args.name ?? "").trim();
    if (!holds_fields(ctx, holder)) return "Nothing to take a field from.";
    if (!name) return "Needs a name.";
    return null;
  },
  run: (ctx, args): Effect => {
    const holder = holder_of(ctx, args);
    const name = String(args.name).trim();
    return {
      mutations: [{ op: "drop_field", id: holder, name }],
      say: "dropped field",
    };
  },
};

/** Make or amend a definition. Usages point at its id, so a rename moves
 *  nothing else — which is the whole reason a definition has one. */
const define: Action = {
  name: "define",
  label: "Define",
  about: "name a new type, or rename one the project already has",
  scope: { on: "project" },
  args: [
    { kind: "text", name: "id", optional: true },
    { kind: "text", name: "name", prompt: "what is it called?" },
    { kind: "choice", name: "form", options: [...DEF_FORMS], optional: true },
  ],
  check: (ctx, args) => {
    const name = String(args.name ?? "").trim();
    if (!name) return "Needs a name.";
    const id = args.id != null && String(args.id) ? String(args.id) : "";
    if (id) {
      if (!ctx.graph.defs[id]) return "No definition by that id.";
      return null;
    }
    if (Object.values(ctx.graph.defs).some((d) => d.name === name)) {
      return "That name is taken.";
    }
    return null;
  },
  run: (_ctx, args): Effect => {
    const name = String(args.name).trim();
    const existing = args.id != null && String(args.id) ? String(args.id) : "";
    const creating = !existing;
    const id = creating ? defIdFor(name) : existing;
    const form = args.form != null
      ? String(args.form) as ElemForm | EdgeForm
      : creating ? "line" as const : undefined;
    const patch = as_def_patch(args);

    return {
      mutations: [{
        op: "set_def",
        id,
        name,
        ...(form ? { form } : {}),
        ...patch,
      }],
      say: creating ? `relation: ${name}` : `renamed to "${name}"`,
    };
  },
};

/** Drop a definition. Usages stay, pointing at nothing — deleting a label
 *  should not quietly delete the connections it described. */
const undefine: Action = {
  name: "undefine",
  label: "Drop definition",
  about: "drop a type from the project, leaving anything that used it alone",
  scope: { on: "project" },
  args: [{ kind: "text", name: "id" }],
  check: (ctx, args) => {
    const id = String(args.id ?? "").trim();
    if (!id) return "Needs a definition.";
    if (!ctx.graph.defs[id]) return "No definition by that id.";
    return null;
  },
  run: (ctx, args): Effect => {
    const id = String(args.id).trim();
    const name = ctx.graph.defs[id]?.name ?? id;
    return {
      mutations: [{ op: "drop_def", id }],
      say: `dropped "${name}"`,
    };
  },
};

register(field, unfield, define, undefine);
