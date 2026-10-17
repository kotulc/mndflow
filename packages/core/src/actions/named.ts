/** Named components: the tags elements carry and the types attributes and interfaces name, held
 *  as data in their package's library. */

import { is_trait, name_taken } from "../defs";
import { new_id } from "../ids";
import { is_form, library_home, library_of, put_tag, put_type, tag_at, tag_named, type_at,
         users_of } from "../library";
import { FORMS, type Form, type Graph, type Id, type Mutation, type Tag, type Type } from "../types";
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
           { name: "description", form: "text" }],
    check: (ctx, args) => named_refusal(ctx.graph, id_of(args, "id"), text(args, "name"), tag_at),
    run: (ctx, args) => {
      const was = tag_at(ctx.graph, id_of(args, "id"));
      const tag: Tag = { id: was?.id ?? new_id("tag"), name: text(args, "name"),
                         ...described(args, was?.description) };
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
           { name: "description", form: "text" }],
    check: (ctx, args) => {
      const form = text(args, "form");
      if (form && !is_form(form)) return `there is no form called "${form}"`;
      return named_refusal(ctx.graph, id_of(args, "id"), text(args, "name"), type_at);
    },
    run: (ctx, args) => {
      const was = type_at(ctx.graph, id_of(args, "id"));
      const form = (text(args, "form") || was?.form || (args["choices"] ? "choice" : "text")) as Form;
      const choices = args["choices"] !== undefined ? list(args["choices"]) : was?.choices;
      const unit = args["unit"] !== undefined ? text(args, "unit") : was?.unit;
      const type: Type = { id: was?.id ?? new_id("type"), name: text(args, "name"), form,
                           ...(form === "choice" && choices?.length ? { choices } : {}),
                           ...(unit ? { unit } : {}), ...described(args, was?.description) };
      return { mutations: [put_type(ctx.graph, was?.pkg ?? ctx.graph.root, type)],
               effect: { focus: type.id } };
    },
  },
);

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
