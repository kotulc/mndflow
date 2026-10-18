/** Named components: the tags elements carry, the types attributes name and the interface
 *  definitions ports name, held as data in their package's library. Each extends another of its
 *  kind, and is styled as a block definition is. */

import { is_trait, name_taken } from "../defs";
import { new_id } from "../ids";
import { constraint_at, constraint_named, entry_at, interface_at, is_form, library_home,
         library_of, put_constraint, put_interface, put_tag, put_type, tag_at, tag_named, type_at,
         users_of } from "../library";
import { FORMS, type Constraint, type Form, type Graph, type Id, type Interface, type Library,
         type Mutation, type Tag, type Type } from "../types";
import { register } from "./registry";
import { borrowed, id_of, ids_of, list, text } from "./helpers";

register(
  {
    name: "tag",
    about: "sets the tags an element or a definition carries, replacing what it carried — a new "
      + "word makes a tag in the workspace's library; none gives the list back",
    on: ["block", "edge", "layer", "selection"],
    /** The whole list, replaced in one step: tag ids or names, or new words. Absent gives the
     *  element its definition's again. */
    args: [{ name: "ids", form: "block", required: true }, { name: "tags", form: "text" }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      const why = ids.map((id) => borrowed(ctx.graph, id)).find(Boolean);
      if (why) return why;
      const trait = list(args["tags"]).find((w) => is_trait(w));
      if (trait) return `"${trait}" is a trait: a definition lists it in its traits`;
      /** A new word makes a tag, which shares its package's one name space. */
      const taken = list(args["tags"]).find((w) => !tag_named(ctx.graph, w)
        && name_taken(ctx.graph, ctx.graph.root, w));
      return taken ? `"${taken}" already names something else in the workspace` : null;
    },
    run: (ctx, args) => {
      if (args["tags"] === undefined || args["tags"] === null) {
        return { mutations: ids_of(ctx, args).map((id): Mutation => ({ op: "set_tags", id, tags: null })) };
      }
      /** Each word as the tag it names, or a new one filed in the workspace's library. */
      const fresh: Tag[] = [];
      const tags = list(args["tags"]).map((word) => {
        const hit = tag_named(ctx.graph, word) ?? fresh.find((t) => t.name === word);
        if (hit) return hit.id;
        fresh.push({ id: new_id("tag"), name: word });
        return fresh[fresh.length - 1]!.id;
      });
      const lib = library_of(ctx.graph, ctx.graph.root);
      const made: Mutation[] = fresh.length ? [{ op: "set_library", id: ctx.graph.root,
        library: { ...lib, tags: [...lib.tags ?? [], ...fresh] } }] : [];
      return { mutations: [...made, ...ids_of(ctx, args)
        .map((id): Mutation => ({ op: "set_tags", id, tags }))] };
    },
  },
  {
    name: "define_tag",
    about: "makes a tag in the workspace's library, or renames or describes one there",
    on: ["layer"],
    args: [{ name: "name", form: "text", required: true },
           /** The tag changed; absent makes one. */
           { name: "id", form: "text" },
           { name: "description", form: "text" },
           /** Another tag it extends; an empty word gives it back to the base. */
           { name: "extends", form: "text" }],
    check: (ctx, args) => named_refusal(ctx.graph, id_of(args, "id"), text(args, "name"), tag_at)
      ?? extends_refusal(ctx.graph, id_of(args, "id"), args, "tags"),
    run: (ctx, args) => {
      const was = tag_at(ctx.graph, id_of(args, "id"));
      const tag: Tag = { ...kept(was), id: was?.id ?? new_id("tag"), name: text(args, "name"),
                         ...described(args, was?.description), ...extending(args, was?.type) };
      return { mutations: [put_tag(ctx.graph, was?.pkg ?? ctx.graph.root, tag)],
               effect: { focus: tag.id } };
    },
  },
  {
    name: "define_type",
    about: "makes a type in the workspace's library — an enum, a `choice` and its options, or an "
      + "alias of one form — or changes one there",
    on: ["layer"],
    args: [{ name: "name", form: "text", required: true },
           /** The type changed; absent makes one. */
           { name: "id", form: "text" },
           { name: "form", form: "choice", choices: FORMS },
           { name: "choices", form: "text" },
           { name: "unit", form: "text" },
           /** How its values are written: a pattern its form reads. */
           { name: "format", form: "text" },
           { name: "description", form: "text" },
           /** Another type it extends; an empty word gives it back to the base. */
           { name: "extends", form: "text" }],
    check: (ctx, args) => {
      const form = text(args, "form");
      if (form && !is_form(form)) return `there is no form called "${form}"`;
      return named_refusal(ctx.graph, id_of(args, "id"), text(args, "name"), type_at)
        ?? extends_refusal(ctx.graph, id_of(args, "id"), args, "types");
    },
    run: (ctx, args) => {
      const was = type_at(ctx.graph, id_of(args, "id"));
      const form = (text(args, "form") || was?.form || (args["choices"] ? "choice" : "text")) as Form;
      const choices = args["choices"] !== undefined ? list(args["choices"]) : was?.choices;
      const unit = args["unit"] !== undefined ? text(args, "unit") : was?.unit;
      const format = args["format"] !== undefined ? text(args, "format") : was?.format;
      const { choices: _c, unit: _u, format: _f, ...rest } = kept(was);
      const type: Type = { ...rest, id: was?.id ?? new_id("type"), name: text(args, "name"), form,
                           ...(form === "choice" && choices?.length ? { choices } : {}),
                           ...(unit ? { unit } : {}), ...(format ? { format } : {}),
                           ...described(args, was?.description), ...extending(args, was?.type) };
      return { mutations: [put_type(ctx.graph, was?.pkg ?? ctx.graph.root, type)],
               effect: { focus: type.id } };
    },
  },
  {
    name: "constrain",
    about: "sets the constraints an element or a definition is held to, replacing what it was "
      + "held to — each a constraint in a library, by name or id; none gives the list back",
    on: ["block", "edge", "selection"],
    args: [{ name: "ids", form: "block", required: true }, { name: "constraints", form: "text" }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      const why = ids.map((id) => borrowed(ctx.graph, id)).find(Boolean);
      if (why) return why;
      const unknown = list(args["constraints"]).find((w) => !constraint_named(ctx.graph, w));
      return unknown ? `there is no constraint called "${unknown}"` : null;
    },
    run: (ctx, args) => {
      const said = args["constraints"];
      const constraints = said === undefined || said === null ? null
        : list(said).map((w) => constraint_named(ctx.graph, w)!.id);
      return { mutations: ids_of(ctx, args)
        .map((id): Mutation => ({ op: "set_constraints", id, constraints })) };
    },
  },
  {
    name: "define_constraint",
    about: "makes a constraint in the workspace's library — the values an element must answer, and "
      + "on a line those its ends must agree on — or changes one there",
    on: ["layer"],
    args: [{ name: "name", form: "text", required: true },
           /** The constraint changed; absent makes one. */
           { name: "id", form: "text" },
           { name: "description", form: "text" },
           /** Values it must answer, split on commas. */
           { name: "required", form: "text" },
           /** On a line: values both ends must answer alike, split on commas. */
           { name: "match", form: "text" },
           /** Another constraint it extends; an empty word gives it back to the base. */
           { name: "extends", form: "text" }],
    check: (ctx, args) => named_refusal(ctx.graph, id_of(args, "id"), text(args, "name"),
                                        constraint_at)
      ?? extends_refusal(ctx.graph, id_of(args, "id"), args, "constraints"),
    run: (ctx, args) => {
      const was = constraint_at(ctx.graph, id_of(args, "id"));
      const said = (key: "required" | "match") => (args[key] !== undefined ? list(args[key])
        : was?.[key] ?? []);
      const { required: _r, match: _m, ...rest } = kept(was);
      const one: Constraint = { ...rest, id: was?.id ?? new_id("constraint"),
                                name: text(args, "name"), ...described(args, was?.description),
                                ...extending(args, was?.type),
                                ...(said("required").length ? { required: said("required") } : {}),
                                ...(said("match").length ? { match: said("match") } : {}) };
      return { mutations: [put_constraint(ctx.graph, was?.pkg ?? ctx.graph.root, one)],
               effect: { focus: one.id } };
    },
  },
  {
    name: "define_interface",
    about: "makes an interface definition in the workspace's library — what a port carries — or "
      + "renames, describes or extends one there",
    on: ["layer"],
    args: [{ name: "name", form: "text", required: true },
           /** The interface definition changed; absent makes one. */
           { name: "id", form: "text" },
           { name: "description", form: "text" },
           /** Another interface definition it extends; an empty word gives it back to the base. */
           { name: "extends", form: "text" }],
    check: (ctx, args) => named_refusal(ctx.graph, id_of(args, "id"), text(args, "name"),
                                        interface_at)
      ?? extends_refusal(ctx.graph, id_of(args, "id"), args, "interfaces"),
    run: (ctx, args) => {
      const was = interface_at(ctx.graph, id_of(args, "id"));
      const one: Interface = { ...kept(was), id: was?.id ?? new_id("interface"),
                               name: text(args, "name"), ...described(args, was?.description),
                               ...extending(args, was?.type) };
      return { mutations: [put_interface(ctx.graph, was?.pkg ?? ctx.graph.root, one)],
               effect: { focus: one.id } };
    },
  },
);

/** What an entry keeps through a change it does not name: everything but its package. */
function kept<T extends { pkg: Id }>(was: T | undefined): Omit<T, "pkg"> | Record<string, never> {
  if (!was) return {};
  const { pkg: _, ...rest } = was;
  return rest;
}

/** What an entry extends: the one said, by id, else what it extended; an empty word, the base. */
function extending(args: Record<string, unknown>, was: Id | undefined): { type?: Id } {
  if (args["extends"] === undefined) return was ? { type: was } : {};
  const said = String(args["extends"]).trim();
  return said ? { type: said } : {};
}

/** Why an entry may not extend what is said: nothing of its kind by that id, or itself. */
function extends_refusal(graph: Graph, id: Id, args: Record<string, unknown>,
                         kind: keyof Library): string | null {
  const said = args["extends"] === undefined ? "" : String(args["extends"]).trim();
  if (!said) return null;
  if (said === id) return "it cannot extend itself";
  return entry_at(graph, said)?.kind === kind ? null : `there is no such ${kind.slice(0, -1)}`;
}

/** Why a named component may not take this name, or be changed: one in a frozen package, or a
 *  name its package already holds. */
function named_refusal(graph: Graph, id: Id, name: string,
                       at: (graph: Graph, id: Id) => { pkg: Id } | undefined): string | null {
  if (!name) return "it needs a name";
  if (id && !at(graph, id)) return "that is not here any more";
  const pkg = id ? at(graph, id)!.pkg : graph.root;
  if (pkg !== graph.root) return "it comes from a package: the workspace's own are changed";
  return name_taken(graph, pkg, name, id || undefined) ? `"${name}" already exists` : null;
}

/** A description said, else the one it had. */
function described(args: Record<string, unknown>, was: string | undefined): { description?: string } {
  const said = args["description"] !== undefined ? String(args["description"]).trim() : was;
  return said ? { description: said } : {};
}

/** Why a named component may not go: a package's that came frozen, or one still carried or named. */
export function unnamed_refusal(graph: Graph, id: Id): string | null {
  const pkg = library_home(graph, id);
  if (!pkg) return "that is not here any more";
  if (pkg !== graph.root) return "it comes from a package: the workspace's own are removed";
  const users = users_of(graph, id).length;
  return users ? `it is used by ${users === 1 ? "one element" : `${users} elements`}` : null;
}
