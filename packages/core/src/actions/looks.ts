/** Tags and looks on an element or a definition. */

import { component, NUMBERS } from "../components";
import { new_id } from "../ids";
import { is_trait, tag_named } from "../tags";
import type { Id, Mutation } from "../types";
import { register, type Args } from "./registry";
import { borrowed, ids_of, list, text } from "./helpers";
import { new_def } from "./definitions";

register(
  {
    name: "tag",
    about: "puts tags on an element or a definition to say what it is like — a new word makes a "
      + "tag of the workspace's",
    on: ["block", "edge", "layer", "selection"],
    /** The whole tag list, replaced in one step: tag ids or names, or new words. */
    args: [{ name: "ids", form: "block", required: true },
           { name: "tags", form: "text", required: true }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      return ids.map((id) => borrowed(ctx.graph, id)).find(Boolean) ?? null;
    },
    run: (ctx, args) => {
      const out: Mutation[] = [];
      const made = new Map<string, Id>();
      /** Each word as the tag it names, or a new one of the workspace's. */
      const tags = list(args["tags"]).map((word) => {
        const hit = tag_named(ctx.graph, word)?.id ?? made.get(word);
        if (hit) return hit;
        const id = new_id("def");
        made.set(word, id);
        out.push(new_def(ctx.graph, { id, name: word, type: "tag", def: {} }));
        return id;
      });
      out.push(...ids_of(ctx, args).map((id): Mutation => ({ op: "set_tags", id, tags })));
      return { mutations: out };
    },
  },
  {
    name: "trait",
    about: "sets the traits a definition carries — capability tags — or gives the set back to "
      + "what it extends",
    on: ["block", "layer", "selection"],
    /** The whole trait list, by id or name; absent gives the set back to the chain. */
    args: [{ name: "ids", form: "block", required: true }, { name: "traits", form: "text" }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      if (ids.some((id) => !ctx.graph.blocks[id]?.def)) return "traits are a definition's";
      const why = ids.map((id) => borrowed(ctx.graph, id)).find(Boolean);
      if (why) return why;
      const missing = list(args["traits"])
        .find((word) => !is_trait(ctx.graph, tag_named(ctx.graph, word)?.id));
      return missing ? `there is no trait called "${missing}"` : null;
    },
    run: (ctx, args) => {
      const said = args["traits"] === undefined || args["traits"] === null ? null
        : list(args["traits"]).map((word) => tag_named(ctx.graph, word)!.id);
      return { mutations: ids_of(ctx, args)
        .map((id): Mutation => ({ op: "set_traits", id, traits: said })) };
    },
  },
);

/** The component keys a look may set. */
const LOOKS: readonly string[] = ["card", "style", "line", "layout", "tie", "allows", "expects",
                                  "value"];

/** Properties whose value is a list, split on commas. */
const LISTS: readonly string[] = ["allows.ports", "allows.holds", "allows.heads",
                                  "expects.required", "expects.match", "value.choices",
                                  "card.shows"];

/** Capabilities that are nested records, stated only on a definition. */
const NESTED: readonly string[] = ["ends", "degree"];

register(
  {
    name: "look",
    about: "sets how this draws, or what it asks — on a block, a line or a definition",
    on: ["block", "edge", "selection"],
    /** A block or line id sets its own look; a definition id sets the definition. */
    args: [{ name: "ids", form: "block", required: true },
           { name: "key", form: "choice", required: true, choices: LOOKS },
           { name: "name", form: "text", required: true },
           /** Absent gives the property back to the chain. */
           { name: "value", form: "text" }],
    check: (ctx, args) => {
      const ids = ids_of(ctx, args);
      if (!ids.length) return "nothing is selected";
      const why = ids.map((id) => borrowed(ctx.graph, id)).find(Boolean);
      if (why) return why;
      if (!LOOKS.includes(String(args["key"]))) {
        return `there is nothing called "${args["key"]}" to set`;
      }
      if (String(args["key"]) === "allows" && NESTED.includes(text(args, "name"))) {
        return `\`${text(args, "name")}\` is stated on a definition, not set here`;
      }
      /** The component refuses what it cannot read. */
      const said = value_of(args);
      if (said !== null) {
        const why = component(String(args["key"]))?.check({ [text(args, "name")]: said });
        if (why) return why;
      }
      return null;
    },
    run: (ctx, args) => {
      const key = String(args["key"]);
      const name = text(args, "name");
      const value = value_of(args);
      return { mutations: ids_of(ctx, args)
        .map((id): Mutation => ({ op: "set_setting", id, key, name, value })) };
    },
  },
);

/** A look's value as the component holds it, or null to give it back. */
function value_of(args: Args): unknown {
  const said = args["value"];
  const key = String(args["key"]);
  const name = text(args, "name");
  if (said === undefined || said === null || said === "") return null;
  /** A size is said as a pair, `8x4` or `8,4`, or as one already. */
  if (`${key}.${name}` === "card.size" && typeof said !== "object") {
    const [w, h] = String(said).split(/[x,\s]+/).map(Number);
    return { w, h };
  }
  if (LISTS.includes(`${key}.${name}`)) {
    /** A capability answers with a flag as readily as with a list of definitions. */
    const word = String(said).trim();
    if (word === "true" || word === "false") return word === "true";
    return list(said);
  }
  return NUMBERS.includes(name) && Number.isFinite(Number(said))
    ? Number(said) : String(said);
}
