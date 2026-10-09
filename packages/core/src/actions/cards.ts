/** A card's markdown, read back into the graph: the `markdown` and `attach` actions.
 *
 *  Nothing here decides what a change means. A card source becomes the actions a person would
 *  have run — rename, retype, tag, trait, source, field, describe — each checked as it would be,
 *  against the graph the ones before it made. Permissive: a type or tag nothing holds, or that
 *  more than one package holds, is made in the workspace, and said. */

import { DEFINITION_KEYS, names_in, read_card, said_as, USAGE_KEYS, type Card } from "../card";
import { all_defs, def_at, domain_of, frozen } from "../defs";
import { replay } from "../fold";
import { new_id } from "../ids";
import { is_tag } from "../tags";
import type { Graph, Id, Mutation } from "../types";
import { action, register, type Args, type Context, type Result } from "./registry";
import { borrowed, id_of, text } from "./helpers";
import { new_def } from "./definitions";

/** One action a card source comes to, or a definition it makes. */
type Call = [name: string, args: Args] | Mutation;

register(
  {
    name: "markdown",
    about: "rewrites a block or a definition from its card source: frontmatter, then its body",
    on: ["block", "layer"],
    args: [{ name: "id", form: "block", required: true },
           { name: "text", form: "text", required: true }],
    check: (ctx, args) => refusal(once(ctx, args)),
    run: (ctx, args) => once(ctx, args) as Result,
  },
  {
    name: "attach",
    about: "copies a markdown file onto a block — its frontmatter and body — and says where it "
      + "came from; attached again, it refreshes",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true },
           { name: "text", form: "text", required: true },
           { name: "source", form: "text", asks: true }],
    check: (ctx, args) => refusal(once(ctx, args, true)),
    run: (ctx, args) => once(ctx, args, true) as Result,
  },
);


/** What `check` worked out, by the args it was given, so `run` reuses it over the same graph. */
const worked = new WeakMap<Args, { graph: Graph; said: Result | string }>();

/** What a card source comes to, worked out once per graph and args. */
function once(ctx: Context, args: Args, attached = false): Result | string {
  const hit = worked.get(args);
  if (hit?.graph === ctx.graph) return hit.said;
  const said = composed(ctx, args, attached);
  worked.set(args, { graph: ctx.graph, said });
  return said;
}

/** What a card source comes to: every change in one result, or why it cannot be read. */
function composed(ctx: Context, args: Args, attached = false): Result | string {
  const id = id_of(args, "id");
  const b = ctx.graph.blocks[id];
  if (!b) return "that is not here any more";
  if (b.parent === null && id !== ctx.graph.root) return "a package is not a card";
  const why = borrowed(ctx.graph, id);
  if (why) return why;
  let card: Card;
  try { card = read_card(String(args["text"] ?? "")); }
  catch (e) { return `the frontmatter is not YAML: ${e instanceof Error ? e.message : e}`; }
  if (attached && args["source"] !== undefined) card.front["source"] = text(args, "source");
  if (b.def && attached) return "a definition is JSON: attach a card source to a usage";
  /** A source edited whole says everything; a file attached says only what it says. */
  return run_all(ctx, b.def ? definition_calls(ctx.graph, id, card)
                            : usage_calls(ctx.graph, id, card, !attached));
}

/** The calls in order, each checked and run over what the ones before it wrote. */
function run_all(ctx: Context, plan: { calls: Call[]; made: string[]; after: Mutation[] }): Result | string {
  const out: Mutation[] = [];
  let graph = ctx.graph;
  for (const call of plan.calls) {
    let did: Mutation[] = [call as Mutation];
    if (Array.isArray(call)) {
      const [name, args] = call;
      const a = action(name)!;
      const here = { ...ctx, graph };
      const why = a.check?.(here, args);
      if (why) return why;
      did = a.run(here, args).mutations;
    }
    out.push(...did);
    graph = replay(graph, did);
  }
  out.push(...plan.after);
  return { mutations: out,
           ...(plan.made.length ? { effect: { say: `made ${plan.made.join(", ")}` } } : {}) };
}

/** A usage's card: its name, its type, its tags, its source, its answers and its body. Edited
 *  `whole`, a key left out is taken away; attached, it is left as it was. */
function usage_calls(graph: Graph, id: Id, { front, body }: Card, whole: boolean) {
  const b = graph.blocks[id]!;
  const calls: Call[] = [];
  const made: string[] = [];
  const says = (key: string) => whole || key in front;
  const name = said_as(front["name"]).trim();
  if (says("name") && name !== (b.name ?? "")) calls.push(["rename", { id, name }]);

  /** What it is: a definition by name, made where nothing — or more than one — holds it. */
  const type = said_as(front["type"]).trim();
  const was = def_at(graph, b.type)?.name ?? "";
  if (type && type !== was) {
    const hit = one_named(graph, type, (d) => domain_of(graph, d) === "block" && !is_tag(graph, d));
    const to = hit ?? new_id("def");
    if (!hit) {
      calls.push(new_def(graph, { id: to, name: type, def: {} }));
      made.push(type);
    }
    calls.push(["retype", { ids: [id], type: to }]);
  }
  else if (says("type") && !type && b.type && def_at(graph, b.type)) {
    calls.push(["retype", { ids: [id], type: "" }]);
  }

  if (says("tags")) calls.push(...tagged(graph, id, front["tags"]));
  const source = said_as(front["source"]).trim();
  if (says("source") && source !== (b.source ?? "")) calls.push(["source", { id, uri: source }]);

  /** Every other key answers the attribute of its name; an answer it no longer gives goes. */
  const said = Object.entries(front).filter(([k]) => !(USAGE_KEYS as readonly string[]).includes(k));
  const names = said.map(([k]) => k);
  for (const [n, v] of said) {
    const value = said_as(v);
    if (b.values?.find((x) => x.name === n)?.value !== value) {
      calls.push(["field", { holder: id, name: n, value }]);
    }
  }
  /** An answer named as a key the card says itself with is never written, so never taken. */
  for (const v of b.values ?? []) {
    if (whole && !names.includes(v.name) && !(USAGE_KEYS as readonly string[]).includes(v.name)) {
      calls.push(["unfield", { holder: id, name: v.name }]);
    }
  }
  if (body !== (b.body ?? "")) calls.push(["describe", { id, body }]);
  const after: Mutation[] = whole && names.length > 1 ? [{ op: "order_values", id, names }] : [];
  return { calls, made, after };
}

/** A definition's card: its name, what it extends, its tags and traits, its attributes'
 *  defaults and what it is for. Never its JSON. */
function definition_calls(graph: Graph, id: Id, { front, body }: Card) {
  const d = def_at(graph, id)!;
  const calls: Call[] = [];
  const made: string[] = [];
  const name = said_as(front["name"]).trim();
  if (name !== d.name) calls.push(["rename", { id, name }]);

  const up = said_as(front["extends"]).trim();
  const was = def_at(graph, d.type)?.name ?? "";
  if (up !== was) {
    const hit = up ? one_named(graph, up, (x) => x !== id) : "";
    const to = hit ?? new_id("def");
    if (hit === null) {
      calls.push(new_def(graph, { id: to, name: up, def: {},
                                  ...(domain_of(graph, id) === "relation" ? { type: "line" } : {}) }));
      made.push(up);
    }
    calls.push(["retype", { ids: [id], type: to }]);
  }

  calls.push(...tagged(graph, id, front["tags"]));
  /** Traits give settings, so a word naming none is refused rather than made. */
  const traits = front["traits"] === undefined ? null : names_in(front["traits"]);
  const own = d.traits?.map((t) => graph.blocks[t]?.name ?? t) ?? null;
  if (JSON.stringify(traits) !== JSON.stringify(own)) {
    calls.push(["trait", { ids: [id], traits }]);
  }

  /** Any other key is an attribute's default, declared where nothing declares it; a default the
   *  card no longer says is cleared. */
  for (const [n, v] of Object.entries(front)) {
    if ((DEFINITION_KEYS as readonly string[]).includes(n)) continue;
    const value = said_as(v);
    if (d.def.attributes?.find((a) => a.name === n)?.default !== value) {
      calls.push(["field", { holder: id, name: n, default: value }]);
    }
  }
  for (const a of d.def.attributes ?? []) {
    if (a.default !== undefined && !(a.name in front)
        && !(DEFINITION_KEYS as readonly string[]).includes(a.name)) {
      calls.push(["field", { holder: id, name: a.name, default: "" }]);
    }
  }
  if (body !== (d.body ?? "")) calls.push(["describe", { id, body }]);
  return { calls, made, after: [] };
}

/** The tag call a frontmatter list comes to, where it differs from what is carried. */
function tagged(graph: Graph, id: Id, said: unknown): Call[] {
  const want = names_in(said);
  const had = (graph.blocks[id]?.tags ?? []).map((t) => graph.blocks[t]?.name ?? t);
  return JSON.stringify(want) === JSON.stringify(had) ? [] : [["tag", { ids: [id], tags: want }]];
}

/** The one definition a name means: by id, the workspace's own, or the only one loaded of that
 *  name. Null where nothing — or more than one package — holds it. */
function one_named(graph: Graph, word: string, fits: (id: Id) => boolean): Id | null {
  if (def_at(graph, word) && fits(word)) return word;
  const hits = all_defs(graph).filter((d) => d.name === word && fits(d.id));
  const own = hits.find((d) => !frozen(graph, d.id));
  return own?.id ?? (hits.length === 1 ? hits[0]!.id : null);
}

/** A refusal, or nothing where the card reads. */
function refusal(said: Result | string): string | null {
  return typeof said === "string" ? said : null;
}
