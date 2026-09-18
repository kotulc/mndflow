/** Filing the workspace's own definitions: folders on the shelf, and what sits in them. */

import { new_id } from "../ids";
import { is_shelf, reshelved, shelf_of, shelvable, shelved_under } from "../shelf";
import type { Graph, Id } from "../types";
import { register } from "./registry";
import { id_of, list, text } from "./helpers";

/** The group an entry belongs to, where it is on the shelf. */
const group_of = (graph: Graph, id: Id) => shelf_of(graph).find((s) => s.id === id)?.group;

/** Why a folder cannot take things: it is not one, or not of their group. */
function into_why(graph: Graph, into: Id, group: string | undefined): string | null {
  if (!into) return null;
  if (!is_shelf(graph, into)) return "that is not a folder";
  return group_of(graph, into) === group ? null : "a folder holds one group of definitions";
}

register(
  {
    name: "add_shelf",
    about: "adds a folder to file definitions in",
    on: ["layer"],
    args: [{ name: "name", form: "text", required: true },
           { name: "group", form: "choice", required: true, choices: ["block", "relation"] },
           /** The folder it goes in; absent is its group's top. */
           { name: "into", form: "text" }],
    check: (ctx, args) => {
      if (!text(args, "name")) return "a folder needs a name";
      const group = text(args, "group");
      if (group !== "block" && group !== "relation") return "say whether it files blocks or relations";
      return into_why(ctx.graph, text(args, "into"), group);
    },
    /** `id` is optional, for a caller that must know the folder it made. */
    run: (ctx, args) => {
      const into = text(args, "into");
      const entry = { id: text(args, "id") || new_id("shelf"), name: text(args, "name"),
                      group: text(args, "group") as "block" | "relation",
                      ...(into ? { in: into } : {}) };
      return { mutations: [{ op: "set_shelf", shelf: [...shelf_of(ctx.graph), entry] }] };
    },
  },
  {
    name: "rename_shelf",
    about: "renames a definition folder",
    on: ["layer"],
    args: [{ name: "id", form: "text", required: true },
           { name: "name", form: "text", required: true }],
    check: (ctx, args) => (!is_shelf(ctx.graph, id_of(args, "id")) ? "that is not a folder"
      : text(args, "name") ? null : "a folder needs a name"),
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const name = text(args, "name");
      const shelf = shelf_of(ctx.graph).map((s) => (s.id === id ? { ...s, name } : s));
      return { mutations: [{ op: "set_shelf", shelf }] };
    },
  },
  {
    name: "drop_shelf",
    about: "removes a definition folder, keeping what it held where it was",
    on: ["layer"],
    args: [{ name: "id", form: "text", required: true }],
    check: (ctx, args) => (is_shelf(ctx.graph, id_of(args, "id")) ? null : "that is not a folder"),
    /** What it held takes its place, in its holder. */
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const shelf = shelf_of(ctx.graph);
      const gone = shelf.find((s) => s.id === id);
      const kept = shelf.filter((s) => s.id !== id).map((s) => {
        if (s.in !== id) return s;
        const { in: _was, ...rest } = s;
        return gone?.in ? { ...rest, in: gone.in } : rest;
      });
      return { mutations: [{ op: "set_shelf", shelf: kept }],
               effect: { say: `removed the ${gone?.name ?? ""} folder` } };
    },
  },
  {
    name: "shelve",
    about: "files definitions or folders into a folder, or reorders them",
    on: ["layer"],
    args: [{ name: "ids", form: "text", required: true },
           /** The folder they go in; absent is their group's top. */
           { name: "into", form: "text" },
           /** The entry they go in front of; absent is last. */
           { name: "before", form: "text" }],
    check: (ctx, args) => {
      const ids = list(args["ids"]);
      if (!ids.length) return "nothing to file";
      const group = group_of(ctx.graph, ids[0]!);
      const into = text(args, "into");
      for (const id of ids) {
        const d = ctx.graph.defs[id];
        if (d && !shelvable(d)) return `${d.name} is ${d.from ? "a package's" : "the system's"}, and stays where it is`;
        if (!d && !is_shelf(ctx.graph, id)) return "only definitions and their folders are filed";
        if (group_of(ctx.graph, id) !== group) return "blocks and relations are filed apart";
        if (into && shelved_under(ctx.graph, into, id)) return "a folder cannot go inside itself";
      }
      return into_why(ctx.graph, into, group);
    },
    run: (ctx, args) => {
      const into = text(args, "into") || undefined;
      const before = text(args, "before") || undefined;
      return { mutations: [{ op: "set_shelf",
                             shelf: reshelved(ctx.graph, list(args["ids"]), into, before) }] };
    },
  },
);
