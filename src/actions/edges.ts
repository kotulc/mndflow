/** Interface and relationship actions.
 *
 *  Naming a seat on a frame, and joining two elements. What each does is in
 *  actions.md under *Interfaces* and *Relationships*. `interface` absorbs
 *  promotion; `relate` absorbs both the chip's link and the gesture's wire. */

import { childrenOf, isPort, nameOf, nextNum } from "../graph/fold";
import {
  defIdFor, edge as makeEdge, element as makeElement,
  type Dir, type EdgeForm, type Flow, type Mutation, type Side,
} from "../graph/types";
import { register, type Action, type Args, type Context, type Effect } from "./index";

const SIDES: Side[] = ["top", "right", "bottom", "left"];
const FLOWS = ["in", "out", "both", "none"] as const;
const DIRS: Dir[] = ["none", "forward", "back", "both"];
const FORMS: EdgeForm[] = ["line", "directed"];

function as_side(value: unknown): Side | undefined {
  return SIDES.includes(value as Side) ? (value as Side) : undefined;
}

function as_flow(value: unknown): Flow | null | undefined {
  if (value === null || value === "none") return null;
  if (value === "in" || value === "out" || value === "both") return value;

  return undefined;
}

function as_dir(value: unknown): Dir | undefined {
  return DIRS.includes(value as Dir) ? (value as Dir) : undefined;
}

function as_form(value: unknown): EdgeForm | undefined {
  return FORMS.includes(value as EdgeForm) ? (value as EdgeForm) : undefined;
}

function edge_id(ctx: Context, args: Args): string {
  if (typeof args.id === "string" && args.id) return args.id;
  if (ctx.picked?.kind === "edge") return ctx.picked.id;

  return "";
}

function node_id(ctx: Context, args: Args, key: string): string {
  if (typeof args[key] === "string" && args[key]) return args[key] as string;
  if (key === "id" && ctx.picked?.kind === "node") return ctx.picked.id;

  return "";
}

/** Ports and sides ride in the args bag for the gesture that has them; there
 *  is no Arg kind for a pair, and a sentence never supplies either. */
function ports_of(args: Args): { from?: string; to?: string } {
  const ports = args.ports;

  return ports && typeof ports === "object" ? ports as { from?: string; to?: string } : {};
}

function sides_of(args: Args): { from?: Side; to?: Side } {
  const sides = args.sides;

  return sides && typeof sides === "object" ? sides as { from?: Side; to?: Side } : {};
}

const iface: Action = {
  name: "interface",
  label: "Interface",
  about: "puts an interface on a frame edge, or pins a relationship's seat as one",
  scope: { on: "element" },
  args: [
    { kind: "element", name: "owner", optional: true },
    { kind: "choice", name: "side", options: [...SIDES], optional: true },
    { kind: "number", name: "at", optional: true },
    { kind: "text", name: "edge", optional: true },
    { kind: "choice", name: "end", options: ["from", "to"], optional: true },
  ],
  check: (ctx, args) => {
    const side = as_side(args.side);
    if (side == null || typeof args.at !== "number") {
      return "Needs a place on the border.";
    }
    const owner = typeof args.owner === "string" ? args.owner : null;
    if (owner && !ctx.graph.elements[owner]) return "Nothing to put an interface on.";
    const edge = typeof args.edge === "string" ? args.edge : "";
    const end = args.end === "from" || args.end === "to" ? args.end : "";
    if (edge && !end) return "Needs which end to pin.";
    if (end && !edge) return "Needs the relationship to pin.";
    if (edge && !ctx.graph.edges[edge]) return "Needs the relationship to pin.";

    return null;
  },
  run: (ctx, args): Effect => {
    const owner = (typeof args.owner === "string" ? args.owner : null) as string | null;
    const side = as_side(args.side)!;
    const at = args.at as number;
    const edge = typeof args.edge === "string" ? args.edge : "";
    const end = args.end === "from" || args.end === "to" ? args.end : null;

    // A bare interface, from right-clicking a frame edge. The one way to get
    // an interface without a relationship attached to it.
    const port = makeElement("", {
      parent: owner, side, at, num: nextNum(ctx.graph, owner, "block", true),
    });

    // Naming a relationship's seat is making an interface and telling that
    // end about it — the same action with two more arguments.
    const mutations: Mutation[] = edge && end
      ? [
          { op: "add_element", element: port },
          { op: "set_end", id: edge, end, port: port.id },
        ]
      : [{ op: "add_element", element: port }];

    return {
      mutations,
      say: edge && end ? "promote interface" : "new interface",
    };
  },
};

const mark: Action = {
  name: "mark",
  label: "Mark",
  about: "marks an interface as in, out, both, or clears the mark",
  scope: { on: "element", form: "interface" },
  args: [
    { kind: "element", name: "id", optional: true },
    { kind: "choice", name: "flow", options: [...FLOWS] },
  ],
  check: (ctx, args) => {
    const id = node_id(ctx, args, "id");
    if (!id || ctx.graph.elements[id]?.side == null) return "Needs an interface.";
    if (as_flow(args.flow) === undefined) return "Needs a mark.";

    return null;
  },
  run: (ctx, args): Effect => {
    const id = node_id(ctx, args, "id");
    const flow = as_flow(args.flow)!;

    return {
      mutations: [{ op: "mark_port", id, flow }],
      say: `mark: ${flow ?? "none"}`,
    };
  },
};

const relate: Action = {
  name: "relate",
  label: "Relate",
  about: "draws a relationship from one element to another",
  scope: { on: "layer" },
  args: [
    { kind: "element", name: "from" },
    { kind: "element", name: "to" },
    { kind: "choice", name: "form", options: [...FORMS], optional: true },
    // What kind of relationship this is, by name. Optional, because a drag
    // that says nothing still draws a plain line; supplied, it is what the
    // canvas's relation-types group picks before the drag (V.17a). A name
    // nothing declares becomes a definition — `defineNamed` is the bridge.
    { kind: "text", name: "type", optional: true },
  ],
  check: (ctx, args) => {
    const from = typeof args.from === "string" ? args.from : "";
    const to = typeof args.to === "string" ? args.to : "";
    if (!from || !to) return "Needs two ends.";
    if (from === to) return "A relationship needs two different ends.";
    if (!ctx.graph.elements[from] || !ctx.graph.elements[to]) {
      return "An end is not here.";
    }

    return null;
  },
  run: (ctx, args): Effect => {
    const from = args.from as string;
    const to = args.to as string;
    const named = String(args.type ?? "").trim();
    const ports = ports_of(args);
    const sides = sides_of(args);
    const mutations: Mutation[] = [];

    // A path (`pkg_x/def_y`) or a bare id already addresses a definition, so it
    // is used as it stands. Only a bare *name* nothing declares is minted —
    // `defineNamed`'s bridge — and minting one for an imported type would put
    // a local stub under a derived id in front of the package's own.
    const declared = ctx.graph.defs[named] || named.includes("/");
    const held = declared
      ? undefined
      : Object.values(ctx.graph.defs).find(
          (d) => d.name.trim().toLowerCase() === named.toLowerCase(),
        );
    const type = named ? (declared ? named : (held?.id ?? defIdFor(named))) : "";
    if (named && !declared && !held) {
      mutations.push({ op: "set_def", id: type, name: named, form: "line" });
    }
    // A named type carries its own form; the toolbar's setting is what an
    // untyped drag uses. `form` always arrives from the gesture, so leaving
    // this to `??` would never consult the type at all.
    const form = as_form(args.form) ?? "line";

    // It makes no interfaces. Where a line meets each card is worked out by
    // the layer it is drawn in. An end that landed on an interface somebody
    // made keeps it — that one is a choice, and choices are stored.
    mutations.push({
      op: "link_elements",
      edge: makeEdge(from, to, {
        form,
        type,
        from: ports.from, to: ports.to,
        fromSide: sides.from, toSide: sides.to,
      }),
    });

    return {
      mutations,
      say: `link: ${nameOf(ctx.graph, ctx.graph.elements[from]) || from}`,
    };
  },
};

const unlink: Action = {
  name: "unlink",
  label: "Unlink",
  about: "removes a relationship and any spare interfaces it left behind",
  scope: { on: "edge" },
  args: [{ kind: "text", name: "id", optional: true }],
  check: (ctx, args) => {
    const id = edge_id(ctx, args);
    return id && ctx.graph.edges[id] ? null : "Needs a relationship.";
  },
  run: (ctx, args): Effect => {
    const id = edge_id(ctx, args);
    const edge = ctx.graph.edges[id];

    // Delete a relationship, and the interfaces it put at its ends with it —
    // rewiring a diagram should leave no trail of empty squares behind.
    //
    // Two things are never collateral: an interface another relationship still
    // attaches to, and one with contents of its own. Those are left standing,
    // bare.
    const spare = (port: string | undefined): port is string =>
      Boolean(port) && isPort(ctx.graph.elements[port!]) &&
      !childrenOf(ctx.graph, port!).length &&
      !Object.values(ctx.graph.edges)
        .some((e) => e.id !== id && (e.from === port || e.to === port));

    const mutations: Mutation[] = [
      { op: "delete_edge", id },
      ...[edge?.from, edge?.to].filter(spare).map((port) => ({
        op: "delete_element" as const, id: port,
      })),
    ];

    // Undo restores the graph and never the context — clearing the selection
    // is asked for here, and not replayed.
    return {
      mutations,
      say: "unlink",
      focus: ctx.picked?.id === id ? null : undefined,
    };
  },
};

const flip: Action = {
  name: "flip",
  label: "Flip",
  about: "turns a relationship around",
  scope: { on: "edge" },
  args: [{ kind: "text", name: "id", optional: true }],
  check: (ctx, args) => {
    const id = edge_id(ctx, args);
    return id && ctx.graph.edges[id] ? null : "Needs a relationship.";
  },
  run: (ctx, args): Effect => {
    const id = edge_id(ctx, args);
    const type = ctx.graph.edges[id]?.type || "relation";

    return {
      mutations: [{ op: "flip_edge", id }],
      say: `flip: ${type}`,
    };
  },
};

const direct: Action = {
  name: "direct",
  label: "Direct",
  about: "sets which way a relationship's arrows point",
  scope: { on: "edge" },
  args: [
    { kind: "text", name: "id", optional: true },
    { kind: "choice", name: "dir", options: [...DIRS] },
  ],
  check: (ctx, args) => {
    const id = edge_id(ctx, args);
    if (!id || !ctx.graph.edges[id]) return "Needs a relationship.";
    if (as_dir(args.dir) == null) return "Needs a direction.";

    return null;
  },
  run: (ctx, args): Effect => {
    const id = edge_id(ctx, args);
    const dir = as_dir(args.dir)!;

    return {
      mutations: [{ op: "set_dir", id, dir }],
      say: `direction: ${dir}`,
    };
  },
};

const reform: Action = {
  name: "reform",
  label: "Reform",
  about: "sets whether a relationship is a plain line or a directed one",
  scope: { on: "edge" },
  args: [
    { kind: "text", name: "id", optional: true },
    { kind: "choice", name: "form", options: [...FORMS] },
  ],
  check: (ctx, args) => {
    const id = edge_id(ctx, args);
    if (!id || !ctx.graph.edges[id]) return "Needs a relationship.";
    if (as_form(args.form) == null) return "Needs a form.";

    return null;
  },
  run: (ctx, args): Effect => {
    const id = edge_id(ctx, args);
    const form = as_form(args.form)!;

    return {
      mutations: [{ op: "set_form", id, form }],
      say: `form: ${form}`,
    };
  },
};

register(iface, mark, relate, unlink, flip, direct, reform);
