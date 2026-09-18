/** Tags and looks on an element or a definition. */

import { component, NUMBERS } from "../components";
import type { Graph, Mutation } from "../types";
import { register, type Args } from "./registry";
import { borrowed, ids_of, list, text } from "./helpers";

register(
  {
    name: "tag",
    about: "puts words on a block or a relationship to say what it is like",
    on: ["block", "edge", "selection"],
    /** The whole tag list, replaced in one step. */
    args: [{ name: "ids", form: "block", required: true },
           { name: "tags", form: "text", required: true }],
    check: (ctx, args) => (ids_of(ctx, args).length ? null : "nothing is selected"),
    run: (ctx, args) => ({ mutations: ids_of(ctx, args).map((id): Mutation => ({
      op: "set_tags", id, tags: list(args["tags"]),
    })) }),
  },
);

/** The component keys a look may set. */
const LOOKS: readonly string[] = ["card", "style", "line", "allows", "expects"];

/** Properties whose value is a list, split on commas. */
const LISTS: readonly string[] = ["allows.ports", "allows.holds", "allows.members",
                                  "expects.required", "expects.match"];

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
      for (const id of ids) {
        const why = borrowed(ctx.graph, id);
        if (why) return why;
      }
      return null;
    },
    run: (ctx, args) => {
      const key = String(args["key"]);
      const name = text(args, "name");
      const value = value_of(args);
      return { mutations: ids_of(ctx, args).map((id): Mutation => {
        const d = ctx.graph.defs[id];
        return d ? { op: "set_def", def: stated(d, key, name, value) }
                 : { op: "set_look", id, key, name, value };
      }) };
    },
  },
);

/** A look's value as the component holds it, or null to give it back. */
function value_of(args: Args): unknown {
  const said = args["value"];
  const key = String(args["key"]);
  const name = text(args, "name");
  if (said === undefined || said === null || said === "") return null;
  if (LISTS.includes(`${key}.${name}`)) {
    /** A capability answers with a flag as readily as with a list of definitions. */
    const word = String(said).trim();
    if (word === "true" || word === "false") return word === "true";
    return list(said);
  }
  return NUMBERS.includes(name) && Number.isFinite(Number(said))
    ? Number(said) : String(said);
}

/** A definition with one property of one component set, or given back. */
function stated(d: Graph["defs"][string], key: string, name: string,
                value: unknown): Graph["defs"][string] {
  const held = { ...(d.components?.[key] ?? {}) };
  if (value === null || value === undefined) delete held[name];
  else held[name] = value;
  const components = { ...(d.components ?? {}) };
  if (Object.keys(held).length) components[key] = held;
  else delete components[key];
  /** A relation definition always says it draws as a line. */
  if (d.group === "relation" && !components["line"]) components["line"] = {};
  return { ...d, components: Object.keys(components).length ? components : undefined };
}
