/** The layer, the project vocabulary, and the four positional adjustments.
 *
 *  An arrangement writes ordinary placement so a card can be dragged afterwards;
 *  an axis is a setting and says nothing about where cards go. Adjustments are
 *  gesture-only — never named, ranked or listed — so `when` keeps them off every
 *  offered set while `run` still answers a gesture that reaches them by name. */

import { register, type Action, type Args, type Context, type Effect } from "./index";
import { arranged } from "../geometry/layout";
import { blocksOf, membersOf } from "../graph/fold";
import { asVocabulary } from "../graph/types";
import type { Axis, Layout, Mutation, Side } from "../graph/types";

const AXES = ["none", "across", "down"] as const;
const SHAPES = ["grid", "radial", "across", "down"] as const;
const SIDES = ["top", "right", "bottom", "left"] as const;

type Moved = { id: string; x: number; y: number };
type Membership = { attr: string; holder: string; join: boolean };

/** Which layer an action names, or the open one when it names none. */
function which_layer(ctx: Context, args: Args): string | null {
  return "layer" in args ? (args.layer as string | null) : ctx.view;
}

/** Members going out of one group.
 *
 *  A group of one is still a group. Emptying it is the exception: a boundary is
 *  its members' bounds, so a group holding nobody has nothing to draw. */
function parting(ctx: Context, group: string, gone: string[]): Mutation[] {
  const held = membersOf(ctx.graph, group).map((m) => m.id);
  const out = held.filter((h) => gone.includes(h));
  if (!out.length) return [];

  if (held.length === out.length) return [{ op: "delete_element", id: group }];

  return out.map((id) => ({ op: "leave_group", id, group }));
}

function as_moved(value: unknown): Moved[] {
  return Array.isArray(value) ? value as Moved[] : [];
}

function as_membership(value: unknown): Membership[] {
  return Array.isArray(value) ? value as Membership[] : [];
}

const axis: Action = {
  name: "axis",
  label: "Axis",
  about: "which way the layer reads",
  scope: { on: "layer" },
  args: [
    { kind: "element", name: "layer", optional: true },
    { kind: "choice", name: "axis", options: [...AXES] },
  ],
  check: (_ctx, args) =>
    (AXES as readonly string[]).includes(String(args.axis ?? ""))
      ? null
      : "Needs a direction to read.",
  run: (ctx, args): Effect => {
    const next = args.axis as Axis;

    return {
      mutations: [{ op: "set_axis", layer: which_layer(ctx, args), axis: next }],
      say: `reads: ${next}`,
    };
  },
};

/** Write down where an arrangement put everything.
 *
 *  An arrangement is an action, not a mode. What it computes becomes ordinary
 *  placement. A gesture may hand precomputed `spots` and `notes`; a sentence
 *  that only names the shape has them worked out here. Tied notes following
 *  cards stay the canvas's until a gesture supplies them. */
const arrange: Action = {
  name: "arrange",
  label: "Arrange",
  about: "lay the layer out again",
  scope: { on: "layer" },
  args: [
    { kind: "element", name: "layer", optional: true },
    { kind: "choice", name: "shape", options: [...SHAPES] },
  ],
  check: (_ctx, args) => {
    // A gesture may hand precomputed spots and skip the shape; a sentence
    // that names neither has nothing to lay out.
    if (as_moved(args.spots).length) return null;
    if (typeof args.shape === "string" &&
        (SHAPES as readonly string[]).includes(args.shape)) return null;

    return "Needs a shape.";
  },
  run: (ctx, args): Effect => {
    const layer = which_layer(ctx, args);
    let spots = as_moved(args.spots);
    const notes = as_moved(args.notes);

    if (!spots.length && typeof args.shape === "string" &&
        (SHAPES as readonly string[]).includes(args.shape)) {
      const computed = arranged(ctx.graph, blocksOf(ctx.graph, layer), args.shape as Layout);
      spots = Object.entries(computed).map(([id, at]) => ({ id, x: at.x, y: at.y }));
    }

    if (!spots.length) return { mutations: [] };

    return {
      mutations: [
        ...spots.map(({ id, x, y }) => ({ op: "place_element" as const, id, x, y })),
        // A note's place is beside what it describes, so laying the layer out
        // again moves it with them when the gesture passed the follow-ons.
        ...notes.map(({ id, x, y }) => ({ op: "place_element" as const, id, x, y })),
      ],
      say: "arrange",
    };
  },
};

const relax: Action = {
  name: "relax",
  label: "Relax",
  about: "hand the layer back to automatic placement",
  scope: { on: "layer" },
  args: [{ kind: "element", name: "layer", optional: true }],
  run: (ctx, args): Effect => ({
    mutations: [{ op: "relax_layer", layer: which_layer(ctx, args) }],
    say: "relax",
  }),
};

const vocabulary: Action = {
  name: "vocabulary",
  label: "Vocabulary",
  about: "which packages this project draws definitions from",
  scope: { on: "project" },
  args: [{ kind: "text", name: "packages", prompt: "packages" }],
  check: (_ctx, args) =>
    asVocabulary(args.packages).length ? null : "Needs a vocabulary.",
  run: (_ctx, args): Effect => {
    const packages = asVocabulary(args.packages);

    return {
      mutations: [{ op: "set_vocabulary", vocabulary: packages }],
      say: `vocabulary: ${packages.join(", ")}`,
    };
  },
};

/** Where a drag came to rest: positions, and any group joined or left.
 *
 *  One step, because it was one gesture — a card dropped inside a boundary
 *  moved and joined, and undo should take back both. */
const place: Action = {
  name: "place",
  label: "Place",
  about: "where something came to rest",
  scope: { on: "element" },
  args: [{ kind: "spot", name: "at" }],
  when: () => false,
  run: (ctx, args): Effect => {
    const moved = as_moved(args.moved ?? (args.at ? [{
      id: String(args.id ?? ctx.picked?.id ?? ""),
      x: (args.at as { x: number; y: number }).x,
      y: (args.at as { x: number; y: number }).y,
    }] : []));
    const membership = as_membership(args.membership);
    if (!moved.length && !membership.length) return { mutations: [] };

    const what = typeof args.what === "string" ? args.what : "";
    const say = what || (membership.length
      ? `${membership[0].join ? "into" : "out of"} a group`
      : moved.length === 1
        ? `place: ${ctx.graph.elements[moved[0].id]?.label ?? moved[0].id}`
        : `place ${moved.length} together`);

    return {
      mutations: [
        ...moved.map(({ id, x, y }) => ({ op: "place_element" as const, id, x, y })),
        ...membership.filter((m) => m.join)
          .map(({ attr, holder }) => ({ op: "join_group" as const, id: holder, group: attr })),
        // Leaving is not simply joining in reverse: a group the drag would leave
        // holding nobody goes instead of shrinking.
        ...[...new Set(membership.filter((m) => !m.join).map((m) => m.attr))]
          .flatMap((id) => parting(
            ctx,
            id,
            membership.filter((m) => !m.join && m.attr === id).map((m) => m.holder),
          )),
      ],
      say,
    };
  },
};

const size: Action = {
  name: "size",
  label: "Size",
  about: "how big a note was asked to be",
  scope: { on: "element", form: "note" },
  args: [
    { kind: "element", name: "id", form: "note" },
    { kind: "number", name: "w" },
    { kind: "number", name: "h" },
  ],
  when: () => false,
  check: (ctx, args) => {
    const id = String(args.id ?? "");
    if (!id || ctx.graph.elements[id]?.form !== "note") return "Needs a note.";
    if (typeof args.w !== "number" || typeof args.h !== "number") {
      return "Needs a size.";
    }
    return null;
  },
  run: (_ctx, args): Effect => {
    const id = String(args.id);
    const w = Number(args.w);
    const h = Number(args.h);

    return {
      mutations: [{ op: "size_element", id, w, h }],
      say: "size",
    };
  },
};

/** Slide an interface along its parent's frame edge. It never comes off. */
const seat: Action = {
  name: "seat",
  label: "Seat",
  about: "where an interface sits on its edge",
  scope: { on: "element", form: "interface" },
  args: [
    { kind: "element", name: "id" },
    { kind: "choice", name: "side", options: [...SIDES] },
    { kind: "number", name: "at" },
  ],
  when: () => false,
  check: (ctx, args) => {
    const id = String(args.id ?? ctx.picked?.id ?? "");
    if (!id || ctx.graph.elements[id]?.side == null) return "Needs an interface.";
    if (!(SIDES as readonly string[]).includes(String(args.side ?? ""))) {
      return "Needs a place on the border.";
    }
    if (typeof args.at !== "number") return "Needs a place on the border.";
    return null;
  },
  run: (ctx, args): Effect => {
    const id = String(args.id ?? ctx.picked?.id ?? "");
    const side = args.side as Side;
    const at = Number(args.at);

    return {
      mutations: [{ op: "set_port", id, side, at }],
      say: `port: ${ctx.graph.elements[id]?.label ?? id}`,
    };
  },
};

/** Pin one end of a relationship to a wall, or hand it back to the layer. */
const wall: Action = {
  name: "wall",
  label: "Wall",
  about: "which wall a relationship leaves by",
  scope: { on: "edge" },
  args: [
    { kind: "text", name: "id" },
    { kind: "choice", name: "end", options: ["from", "to"] },
    { kind: "choice", name: "side", options: [...SIDES], optional: true },
  ],
  when: () => false,
  check: (ctx, args) => {
    const id = String(args.id ?? "");
    if (!id || !ctx.graph.edges[id]) return "Needs a relationship.";
    if (args.end !== "from" && args.end !== "to") return "Needs which end.";
    if (args.side != null &&
        !(SIDES as readonly string[]).includes(String(args.side))) {
      return "Needs a wall.";
    }
    return null;
  },
  run: (_ctx, args): Effect => {
    const id = String(args.id);
    const end = args.end as "from" | "to";
    const side = (args.side as Side | undefined) ?? null;

    return {
      mutations: [{ op: "set_side", id, end, side }],
      say: side ? `wall: ${side}` : "wall: auto",
    };
  },
};

register(axis, arrange, relax, vocabulary, place, size, seat, wall);
