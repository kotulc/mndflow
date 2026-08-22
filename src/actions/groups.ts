/** Groups and notes: membership boundaries, and the cards that annotate them.
 *
 *  Five actions. `group` absorbs joining — with `into` it adds to that group;
 *  without, it makes one. `dissolve` is the deliberate ask that parting never
 *  guesses at: a group of one is still a group until somebody says otherwise.
 *
 *  Loaded for its side effect: {@link register} publishes these at import.
 *  Callers reach them through `project.ts` (`act.dissolve`, `act.group` /
 *  `joinGroup`). The panel path into an existing group is G.6; offering
 *  `dissolve` from a menu or tray waits on G.9. */

import { isTie, membersOf, nextNum } from "../graph/fold";
import {
  defIdFor, definition, edge as makeEdge, element as makeElement, type Mutation, type Spot,
} from "../graph/types";
import { register, type Action, type Args, type Context, type Effect } from "./index";

const label_of = (ctx: Context, id: string) => ctx.graph.elements[id]?.label || id;

/** Mint the shipped `group`/`note` definition locally, if this graph does not
 *  already have it — same shape as `packages/base/definitions.yaml`, so an
 *  element typed here resolves identically whether or not the base package
 *  was ever imported. Precedent: `workspace.folder()`. */
function mint_def(ctx: Context, name: "group" | "note", body: string): Mutation[] {
  const id = defIdFor(name);
  if (ctx.graph.defs[id]) return [];

  return [{
    op: "set_def",
    ...definition(name, { id, form: "block", fields: [], body, components: { block: { module: name } } }),
  }];
}

/** Members going out of one group.
 *
 *  A group of one is still a group. Deleting one that fell to a single member
 *  meant reading intent — deliberate against decayed — off a graph in which
 *  the two are identical, and throwing away the user's work where the guess
 *  went the wrong way. Removing a group is a thing to be asked for — that is
 *  {@link dissolve}.
 *
 *  Emptying it is the exception, and is not a preference: a boundary is its
 *  members' bounds, so a group holding nobody has nothing to draw and no way
 *  to be reached again. */
function parting(ctx: Context, group: string, gone: string[]): Mutation[] {
  const held = membersOf(ctx.graph, group).map((m) => m.id);
  const out = held.filter((h) => gone.includes(h));
  if (!out.length) return [];

  if (held.length === out.length) return [{ op: "delete_element", id: group }];

  return out.map((id) => ({ op: "leave_group" as const, id, group }));
}

function as_members(args: Args): string[] {
  const raw = args.members;
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(Boolean);
}

function as_spot(args: Args): Spot | null {
  const spot = args.spot;
  if (!spot || typeof spot !== "object") return null;
  const { x, y } = spot as Spot;
  return typeof x === "number" && typeof y === "number" ? { x, y } : null;
}

function as_size(args: Args): { w: number; h: number } | null {
  const size = args.size;
  if (size && typeof size === "object") {
    const { w, h } = size as { w?: unknown; h?: unknown };
    if (typeof w === "number" && typeof h === "number") return { w, h };
  }
  const w = args.w;
  const h = args.h;
  return typeof w === "number" && typeof h === "number" ? { w, h } : null;
}

/** Turn a selection into a group, or join an existing one.
 *
 *  One member is allowed. A boundary round a single block is a way of marking
 *  it, and asking for that is unambiguous; it is only a group that *falls* to
 *  one that gets swept up — see {@link parting}. */
const group: Action = {
  name: "group",
  label: "Group",
  about: "draw a boundary round these, or add them to a group that is already there",
  scope: { on: "layer" },
  args: [
    { kind: "element", name: "into", form: "group", optional: true },
  ],
  check: (ctx, args) => {
    const members = as_members(args);
    if (!members.length) return "Needs somebody to group.";
    if (members.some((id) => !ctx.graph.elements[id])) return "A member is not here.";
    const into = args.into != null ? String(args.into) : "";
    if (into && ctx.graph.elements[into]?.form !== "group") {
      return "Can only join a group.";
    }
    return null;
  },
  run: (ctx, args): Effect => {
    const members = as_members(args);
    const into = args.into != null ? String(args.into) : "";

    if (into) {
      return {
        mutations: members.map((id) => ({ op: "join_group" as const, id, group: into })),
        say: `group: ${members.map((id) => label_of(ctx, id)).join(", ")}`,
      };
    }

    const box = makeElement("", {
      form: "group",
      type: defIdFor("group"),
      parent: ctx.view,
      num: nextNum(ctx.graph, ctx.view, "group"),
    });

    return {
      mutations: [
        ...mint_def(ctx, "group", "A boundary round a set of references — a swimlane, a region, a package boundary."),
        { op: "add_element", element: box },
        ...members.map((id) => ({ op: "join_group" as const, id, group: box.id })),
      ],
      say: `group: ${members.length} elements`,
    };
  },
};

/** Leave a group. Goes through {@link parting}, so emptying the group deletes it. */
const leave: Action = {
  name: "leave",
  label: "Leave group",
  about: "take this out of a group it belongs to",
  scope: { on: "element" },
  args: [
    { kind: "element", name: "id" },
    { kind: "element", name: "group", form: "group" },
  ],
  check: (ctx, args) => {
    const id = String(args.id ?? "");
    const group_id = String(args.group ?? "");
    if (!ctx.graph.elements[id]) return "Nothing to take out.";
    if (ctx.graph.elements[group_id]?.form !== "group") return "Not a group.";
    return null;
  },
  run: (ctx, args): Effect => {
    const id = String(args.id);
    const group_id = String(args.group);
    return {
      mutations: parting(ctx, group_id, [id]),
      say: `ungroup: ${label_of(ctx, id)}`,
    };
  },
};

/** Ungroup a whole group — the ask {@link parting} never makes on its own.
 *
 *  One `delete_element`: members keep their places (a group is never their
 *  parent), and fold's tidy drops the dead group id from their membership.
 *  `id` is optional so a tray or menu can run against the selection alone —
 *  the same pattern as unlink/flip. Clearing focus matches delete: the
 *  boundary is gone, so the selection must not keep pointing at it. */
const dissolve: Action = {
  name: "dissolve",
  label: "Dissolve",
  about: "take the boundary away and leave its members where they are",
  scope: { on: "element", form: "group" },
  args: [{ kind: "element", name: "id", form: "group", optional: true }],
  check: (ctx, args) => {
    const id = String(args.id ?? ctx.picked?.id ?? "");
    if (ctx.graph.elements[id]?.form !== "group") return "Not a group.";
    return null;
  },
  run: (ctx, args): Effect => {
    const id = String(args.id ?? ctx.picked?.id ?? "");
    return {
      mutations: [{ op: "delete_element", id }],
      focus: ctx.picked?.id === id ? null : undefined,
      say: `dissolve: ${label_of(ctx, id)}`,
    };
  },
};

/** A note: a card of text placed in this layer.
 *
 *  Text is required, the same as a node's name is: an empty note is not a
 *  thing somebody meant to make, it is litter. The swept rectangle is a
 *  minimum rather than a size, so a long description gets the room it was
 *  given and a longer one still grows the card. */
const note: Action = {
  name: "note",
  label: "Note",
  about: "put a note here saying what you typed",
  scope: { on: "layer" },
  args: [
    { kind: "text", name: "text", prompt: "what does it say?" },
    { kind: "spot", name: "spot", optional: true },
    { kind: "number", name: "w", optional: true },
    { kind: "number", name: "h", optional: true },
  ],
  check: (_ctx, args) => {
    const text = String(args.text ?? "").trim();
    return text ? null : "Needs something to say.";
  },
  run: (ctx, args): Effect => {
    const text = String(args.text).trim();
    const spot = as_spot(args);
    const size = as_size(args);

    return {
      mutations: [
        ...mint_def(ctx, "note", "Text carried as a resource and drawn as a card."),
        {
          op: "add_element",
          element: makeElement(text, {
            form: "note",
            type: defIdFor("note"),
            parent: ctx.view,
            x: spot?.x ?? null,
            y: spot?.y ?? null,
            w: size?.w ?? null,
            h: size?.h ?? null,
            num: nextNum(ctx.graph, ctx.view, "note"),
          }),
        },
      ],
      say: `note: ${text}`,
    };
  },
};

/** Tie a note to an object, or untie it — one gesture both ways, since
 *  dragging onto something already tied can only mean undoing it.
 *
 *  A tie is a relationship, so tying is drawing one and untying is deleting
 *  it — no second mechanism for joining two things. */
const tie: Action = {
  name: "tie",
  label: "Tie",
  about: "tie this note to what it describes, or untie it if it already is",
  scope: { on: "element", form: "note" },
  args: [
    { kind: "element", name: "note", form: "note" },
    { kind: "element", name: "holder" },
  ],
  check: (ctx, args) => {
    const note_id = String(args.note ?? "");
    const holder = String(args.holder ?? "");
    if (ctx.graph.elements[note_id]?.form !== "note") return "Not a note.";
    if (!ctx.graph.elements[holder]) return "Nothing to tie it to.";
    return null;
  },
  run: (ctx, args): Effect => {
    const note_id = String(args.note);
    const holder = String(args.holder);
    const tied = Object.values(ctx.graph.edges)
      .find((e) => e.source === note_id && e.target === holder && isTie(ctx.graph, e));

    return {
      mutations: [tied
        ? { op: "delete_edge" as const, id: tied.id }
        : { op: "link_elements" as const, edge: makeEdge(note_id, holder) }],
      say: tied ? `untie: ${label_of(ctx, holder)}` : `tie: ${label_of(ctx, holder)}`,
    };
  },
};

register(group, leave, dissolve, note, tie);
