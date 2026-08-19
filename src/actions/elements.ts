/** Element and navigation actions — create, delete, rename, retype, describe,
 *  move, refer, and the three that write nothing.
 *
 *  Built against actions.md. Closures still live in project.ts until S1.6
 *  swaps the call sites for registry lookups; this module only publishes the
 *  records. */

import {
  actual, descendsFrom, isProxy, isTie, membersOf, nameFree, nameOf, nextNum, proxyIn,
} from "../graph/fold";
import { ROOT, element as makeElement, refAt, type Mutation, type Spot } from "../graph/types";
import { register, type Action, type Args, type Context, type Effect } from "./index";

const label_of = (ctx: Context, id: string) =>
  nameOf(ctx.graph, ctx.graph.elements[id]) || id;

/** Members going out of one group.
 *
 *  A group of one is still a group. Deleting one that fell to a single member
 *  meant reading intent — deliberate against decayed — off a graph in which
 *  the two are identical, and throwing away the user's work where the guess
 *  went the wrong way. Removing a group is a thing to be asked for.
 *
 *  Emptying it is the exception, and is not a preference: a boundary is its
 *  members' bounds, so a group holding nobody has nothing to draw and no way
 *  to be reached again. */
const parting = (ctx: Context, group: string, gone: string[]): Mutation[] => {
  const held = membersOf(ctx.graph, group).map((m) => m.id);
  const out = held.filter((h) => gone.includes(h));
  if (!out.length) return [];

  if (held.length === out.length) return [{ op: "delete_element", id: group }];

  return out.map((id) => ({ op: "leave_group" as const, id, group }));
};

/** The same, across every annotation these objects are drawn in. Annotations
 *  are local to a layer, so leaving one drops them; a plain attribute
 *  describes the object itself and travels with it. */
const partings = (ctx: Context, gone: string[]): Mutation[] => [
  ...Object.values(ctx.graph.elements)
    .filter((e) => e.form === "group")
    .flatMap((g) => parting(ctx, g.id, gone)),
  // A tie is a relationship, so letting one go is deleting it.
  ...Object.values(ctx.graph.edges)
    .filter((e) => isTie(ctx.graph, e) && gone.includes(e.target))
    .map((e) => ({ op: "delete_edge" as const, id: e.id })),
];

/** What a node sheds by moving to another layer: its annotations, and
 *  the relationships joining it to whatever is staying behind.
 *
 *  Everything travelling with it is kept whole. Its children go too, and so
 *  does the wiring among them and from them to its own interfaces — an
 *  interface draws on both sides of its node, so a child wired to one is
 *  internal wiring, drawn inside the very layer that is moving. What breaks
 *  is only what had one end here and the other there. */
const shed = (ctx: Context, id: string, parent: string | null): Mutation[] => {
  if (!ctx.graph.elements[id] || ctx.graph.elements[id].parent === parent) return [];

  return [
    ...partings(ctx, [id]),
    ...Object.values(ctx.graph.edges)
      .filter((edge) => {
        const far = edge.source === id ? edge.target
                  : edge.target === id ? edge.source
                  : null;

        return far !== null && !descendsFrom(ctx.graph, far, id);
      })
      .map((edge) => ({ op: "delete_edge" as const, id: edge.id })),
  ];
};

const as_id = (args: Args, name: string, ctx?: Context): string | null => {
  const raw = args[name];
  if (typeof raw === "string" && raw) return raw;
  return ctx?.picked?.id ?? null;
};

const as_spot = (args: Args, name = "spot"): Spot | null => {
  const raw = args[name];
  if (!raw || typeof raw !== "object") return null;
  const { x, y } = raw as Spot;
  if (typeof x !== "number" || typeof y !== "number") return null;
  return { x, y };
};

const create: Action = {
  name: "create",
  label: "Create",
  about: "makes a new block in a layer, where you pointed if you did",
  scope: { on: "layer" },
  args: [
    { kind: "text", name: "label", prompt: "Name" },
    { kind: "element", name: "parent", optional: true },
    { kind: "spot", name: "spot", optional: true },
  ],
  check: (ctx, args) => {
    const label = String(args.label ?? "");
    const parent = args.parent !== undefined ? (args.parent as string | null) : ctx.view;
    if (!nameFree(ctx.graph, parent, label)) {
      return `"${label.trim()}" is already used here.`;
    }
    return null;
  },
  run: (ctx, args) => {
    const label = String(args.label ?? "");
    const parent = args.parent !== undefined ? (args.parent as string | null) : ctx.view;
    const spot = as_spot(args);
    const groups = Array.isArray(args.groups) ? args.groups as string[] : [];
    const fresh = makeElement(label, {
      parent,
      num: nextNum(ctx.graph, parent, "block"),
      ...(spot ? { x: spot.x, y: spot.y } : {}),
    });

    return {
      mutations: [
        { op: "add_element", element: fresh },
        ...groups.map((group) => ({ op: "join_group" as const, id: fresh.id, group })),
      ],
      say: `new: ${label}`,
    };
  },
};

const drop: Action = {
  name: "delete",
  label: "Delete",
  about: "removes an element and everything it holds",
  scope: { on: "element" },
  args: [{ kind: "element", name: "id" }],
  check: (ctx, args) => {
    const id = as_id(args, "id", ctx);
    if (!id || !ctx.graph.elements[id]) return "Nothing to delete.";
    if (id === ROOT) return "The project itself cannot be deleted.";
    return null;
  },
  run: (ctx, args) => {
    const id = as_id(args, "id", ctx)!;
    // Its contents go with it, so an annotation drawn round any of them loses
    // those members in the same step — and goes itself if that empties it.
    const gone = Object.keys(ctx.graph.elements).filter((n) => descendsFrom(ctx.graph, n, id));
    const effect: Effect = {
      mutations: [{ op: "delete_element", id }, ...partings(ctx, gone)],
      say: `delete: ${label_of(ctx, id)}`,
    };

    // Never leave the selection or the open layer pointing at something gone.
    if (ctx.picked?.id === id) effect.focus = null;
    if (ctx.view && descendsFrom(ctx.graph, ctx.view, id)) {
      effect.open = ctx.graph.elements[id]?.parent ?? null;
    }

    return effect;
  },
};

const rename: Action = {
  name: "rename",
  label: "Rename",
  about: "changes what an element is called",
  scope: { on: "element" },
  args: [
    { kind: "element", name: "id" },
    { kind: "text", name: "label", prompt: "Name" },
  ],
  check: (ctx, args) => {
    const id = as_id(args, "id", ctx);
    const label = String(args.label ?? "");
    if (!id) return "Nothing to rename.";
    if (!label.trim()) return "Needs a name.";

    // A reference has no name of its own, so renaming one renames the node it
    // stands in for — there is only ever one thing being named.
    const real = actual(ctx.graph, id)?.id ?? id;
    const parent = ctx.graph.elements[real]?.parent ?? null;
    // The project title is root's label; uniqueness among siblings does not
    // apply the same way — root is not listed with them.
    if (real !== ROOT && !nameFree(ctx.graph, parent, label, real)) {
      return `"${label.trim()}" is already used here.`;
    }
    return null;
  },
  run: (ctx, args) => {
    const id = as_id(args, "id", ctx)!;
    const label = String(args.label ?? "").trim();
    const real = actual(ctx.graph, id)?.id ?? id;

    return {
      mutations: [{ op: "update_element", id: real, label }],
      say: real === ROOT ? `rename project: ${label}` : `rename: ${label}`,
    };
  },
};

const retype: Action = {
  name: "retype",
  label: "Retype",
  about: "sets what kind of thing an element or a relationship is",
  // `run` has always taken either, and actions.md has always said both; only
  // the descriptor disagreed, which is what kept it off an edge's menu.
  scope: { on: ["element", "edge"] },
  args: [
    { kind: "element", name: "id" },
    { kind: "text", name: "type", prompt: "Type" },
  ],
  check: (ctx, args) => {
    const id = as_id(args, "id", ctx);
    if (!id) return "Nothing to retype.";
    if (!ctx.graph.elements[id] && !ctx.graph.edges[id]) return "Nothing to retype.";
    return null;
  },
  run: (ctx, args) => {
    const id = as_id(args, "id", ctx)!;
    const type = String(args.type ?? "").trim();

    if (ctx.graph.edges[id]) {
      return {
        mutations: [{ op: "update_edge", id, type }],
        say: `relation: ${type}`,
      };
    }

    return {
      mutations: [{ op: "update_element", id, type }],
      say: `type: ${type}`,
    };
  },
};

const describe: Action = {
  name: "describe",
  label: "Describe",
  about: "writes the body text of an element",
  scope: { on: "element" },
  args: [
    { kind: "element", name: "id" },
    { kind: "text", name: "body", prompt: "Body" },
  ],
  check: (ctx, args) => {
    const id = as_id(args, "id", ctx);
    if (!id || !ctx.graph.elements[id]) return "Nothing to describe.";
    return null;
  },
  run: (ctx, args) => {
    const id = as_id(args, "id", ctx)!;
    const body = String(args.body ?? "");

    return {
      mutations: [{ op: "set_body", id, body }],
      say: `edit: ${label_of(ctx, id)}`,
    };
  },
};

const move: Action = {
  name: "move",
  label: "Move",
  about: "puts an element under a different parent, and places it if told where",
  scope: { on: "element" },
  args: [
    { kind: "element", name: "id" },
    { kind: "element", name: "parent" },
    { kind: "spot", name: "spot", optional: true },
  ],
  check: (ctx, args) => {
    const id = as_id(args, "id", ctx);
    if (!id || !ctx.graph.elements[id]) return "Nothing to move.";
    if (!("parent" in args)) return "Needs a parent.";

    const parent = args.parent as string | null;
    if (parent === id || (parent && descendsFrom(ctx.graph, parent, id))) {
      return "Cannot move something into itself.";
    }
    // A reference holds nothing — whatever is inside the thing it points at is
    // inside the thing it points at.
    if (parent && isProxy(ctx.graph.elements[parent])) {
      return "A reference cannot hold anything.";
    }
    return null;
  },
  run: (ctx, args) => {
    const id = as_id(args, "id", ctx)!;
    const parent = args.parent as string | null;
    const spot = as_spot(args);
    const mutations: Mutation[] = [
      { op: "move_element", id, parent },
      ...shed(ctx, id, parent),
    ];
    if (spot) mutations.push({ op: "place_element", id, x: spot.x, y: spot.y });

    return {
      mutations,
      say: parent ? `into: ${label_of(ctx, parent)}` : `move: ${label_of(ctx, id)}`,
    };
  },
};

/** A dropped row's path in this project's terms — bare when it points here,
 *  which is what `of` stores for anything local. The explorer always names
 *  the project it dragged from, so without this a local drop reads as
 *  foreign and its proxy would never match the one already placed. */
const here_ref = (ctx: Context, ref: string): string => {
  const { project, id } = refAt(ref);

  return !project || project === ctx.project ? id : ref;
};

const refer: Action = {
  name: "refer",
  label: "Refer",
  about: "places a proxy of an element into this layer",
  scope: { on: "layer" },
  args: [
    { kind: "element", name: "target" },
    { kind: "spot", name: "spot", optional: true },
  ],
  check: (ctx, args) => {
    const raw = as_id(args, "target");
    if (!raw) return "Nothing to refer to.";

    const target = here_ref(ctx, raw);
    // A block in another project is not in this fold, so the path is the
    // whole of what can be checked — which is what makes a set of proxies
    // from several projects possible at all (P.7).
    const away = Boolean(refAt(target).project);
    if (!away && !ctx.graph.elements[target]) return "Nothing to refer to.";
    // A layer cannot hold a reference to itself. The surfaces used to guard
    // this by comparing the dropped id to the open layer, which stopped
    // working the moment the payload became a path — so it belongs here.
    if (target === ctx.view) return "That is this layer.";
    // One proxy per layer per block: a second appearance of the same thing
    // in the same layer says nothing the first did not. Nor is a proxy for
    // something already in this layer meaningful.
    if (!away && (ctx.graph.elements[target]?.parent ?? null) === ctx.view) {
      return "That already lives in this layer.";
    }
    if (proxyIn(ctx.graph, ctx.view, target)) {
      return "This layer already has a reference to that.";
    }
    return null;
  },
  run: (ctx, args) => {
    const target = here_ref(ctx, as_id(args, "target")!);
    const spot = as_spot(args);
    const stand = makeElement("", {
      form: "proxy", parent: ctx.view, of: target,
      num: nextNum(ctx.graph, ctx.view, "proxy"),
      ...(spot ? { x: spot.x, y: spot.y } : {}),
    });

    return {
      mutations: [{ op: "add_element", element: stand }],
      say: `reference: ${label_of(ctx, target)}`,
    };
  },
};

const open: Action = {
  name: "open",
  label: "Open",
  about: "opens an element as the layer being drawn",
  scope: { on: "element" },
  args: [{ kind: "element", name: "id" }],
  check: (ctx, args) => {
    const id = as_id(args, "id", ctx);
    if (!id || !ctx.graph.elements[id]) return "Nothing to open.";
    return null;
  },
  run: (ctx, args) => {
    const id = as_id(args, "id", ctx)!;
    return { mutations: [], open: id, focus: null };
  },
};

const up: Action = {
  name: "up",
  label: "Up",
  about: "leaves the open layer for the one containing it",
  scope: { on: "layer" },
  args: [],
  run: (ctx) => ({
    mutations: [],
    open: ctx.view ? (ctx.graph.elements[ctx.view]?.parent ?? null) : null,
    focus: null,
  }),
};

const reveal: Action = {
  name: "reveal",
  label: "Reveal",
  about: "opens the layer an element lives in and selects it there",
  scope: { on: "element" },
  args: [{ kind: "element", name: "id" }],
  check: (ctx, args) => {
    const id = as_id(args, "id", ctx);
    if (!id || !ctx.graph.elements[id]) return "Nothing to reveal.";
    return null;
  },
  run: (ctx, args) => {
    const id = as_id(args, "id", ctx)!;
    const node = ctx.graph.elements[id];

    return {
      mutations: [],
      open: node.parent,
      focus: { kind: "node", id },
    };
  },
};

register(create, drop, rename, retype, describe, move, refer, open, up, reveal);
