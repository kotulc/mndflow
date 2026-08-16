/** Layer → activity stage. The module's composition half.
 *
 *  Actions are the layer's blocks; a lane is the ref each action holds; a
 *  group stays a group. Control nodes are counted from directed order and
 *  guards — never stored. Guards ride as edge fields. Derived labels and
 *  untyped order draw dimmed (`DIM`). */

import { shaped, type CardConfig, type Shape } from "../../card";
import {
  blocksOf, childrenOf, edgesIn, fieldsOf, groupsIn, isProxy, nameOf,
} from "../../../graph/fold";
import type { Edge, Element, Graph } from "../../../graph/types";

/** How derived labels and inferred order draw until a dimming device lands.
 *
 *  Same signal as a plain card's chip: muted colour and lowered opacity. Not a
 *  new concept — the nearest idiom in the stylesheet. */
export const DIM = {
  color: "var(--muted)",
  opacity: 0.55,
} as const;

/** Verb a derived label opens with — matches packages/behavior words. */
export const VERB = "do";

/** Control-node kinds SysML draws; every one is a count, never an element. */
export const CONTROLS = [
  "fork", "join", "decision", "merge", "initial", "final",
] as const;

export type ControlKind = (typeof CONTROLS)[number];

/** Where a counted node sits relative to the action that earned it. */
export type ControlAt = "before" | "after";

export type ControlNode = {
  kind: ControlKind;
  /** Action the count hangs off. */
  at: string;
  side: ControlAt;
  /** How it fills the engine's box — card.shaped, nothing stored. */
  card: CardConfig;
};

export type Lane = {
  /** Participant ref (`proxy.of`), stable across the layer. */
  ref: string;
  /** Display name read through the ref when the graph can resolve it. */
  name: string;
  /** Actions that hold this ref. */
  actions: string[];
};

export type ActionView = {
  id: string;
  node: Element;
  /** Lane key — the participant ref, or empty when none. */
  lane: string;
  /** What draws on the card. */
  label: string;
  /** True when the label is derived (`do Pump`) rather than typed. */
  derived: boolean;
};

export type OrderView = {
  edge: Edge;
  from: string;
  to: string;
  /** Guard field value, when the edge carries one. */
  guard: string;
  /** Untyped directed order — the infer chain — draws dimmed. */
  inferred: boolean;
};

export type GroupView = {
  id: string;
  node: Element;
  members: string[];
};

/** Everything the activity module needs to project one layer. */
export type Stage = {
  actions: ActionView[];
  lanes: Lane[];
  groups: GroupView[];
  orders: OrderView[];
  controls: ControlNode[];
  /** Host idiom for derived labels and inferred order. */
  dim: typeof DIM;
};

/** Shape each control kind asks the card module for. */
const SHAPE_OF: Record<ControlKind, Shape> = {
  decision: "diamond",
  merge: "diamond",
  fork: "rect",
  join: "rect",
  initial: "ellipse",
  final: "ellipse",
};

function is_directed(edge: Edge): boolean {
  return (edge.form ?? "line") === "directed"
    || edge.dir === "forward" || edge.dir === "back" || edge.dir === "both";
}

/** Ends in order along the edge's stated direction. */
function ends_of(edge: Edge): [string, string] | null {
  if (!is_directed(edge)) return null;
  if (edge.dir === "back") return [edge.target, edge.source];
  return [edge.source, edge.target];
}

/** Guard text on an edge field, or empty. */
export function guardOf(graph: Graph, edge: Edge): string {
  const held = fieldsOf(graph, edge.id).find((f) => f.name === "guard");
  return held?.value.trim() ?? "";
}

/** Participant ref under an action — the proxy child infer placed. */
function ref_under(graph: Graph, action: Element): { ref: string; name: string } | null {
  const stand = childrenOf(graph, action.id).find(isProxy);
  if (!stand?.of) return null;
  const shown = nameOf(graph, stand);
  const bare = stand.of.includes("/") ? stand.of.slice(stand.of.lastIndexOf("/") + 1) : stand.of;

  return { ref: stand.of, name: shown && shown !== "missing" ? shown : bare };
}

/** Label: typed name wins; otherwise the module's verb and the participant. */
function label_of(graph: Graph, action: Element): { label: string; derived: boolean } {
  const typed = action.label.trim();
  if (typed) return { label: typed, derived: false };

  const part = ref_under(graph, action);
  if (part) return { label: `${VERB} ${part.name}`, derived: true };

  return { label: nameOf(graph, action) || action.id, derived: true };
}

function card_for(kind: ControlKind): CardConfig {
  // Bars and marks sit under the shape — a diamond's middle is too narrow.
  return shaped(SHAPE_OF[kind], kind === "fork" || kind === "join" ? "none" : "below");
}

/** Count control nodes from directed order and guards at one layer. */
export function controlsOf(graph: Graph, layer: string | null): ControlNode[] {
  const actions = blocksOf(graph, layer).filter((n) => n.form === "block");
  const ids = new Set(actions.map((a) => a.id));
  const orders = edgesIn(graph, layer)
    .map((e) => ({ edge: e, ends: ends_of(e) }))
    .filter((row): row is { edge: Edge; ends: [string, string] } =>
      row.ends !== null && ids.has(row.ends[0]) && ids.has(row.ends[1]));

  const out = new Map<string, { edge: Edge; guard: string }[]>();
  const inn = new Map<string, { edge: Edge; guard: string }[]>();
  for (const id of ids) {
    out.set(id, []);
    inn.set(id, []);
  }
  for (const { edge, ends } of orders) {
    const guard = guardOf(graph, edge);
    out.get(ends[0])!.push({ edge, guard });
    inn.get(ends[1])!.push({ edge, guard });
  }

  const held: ControlNode[] = [];

  for (const action of actions) {
    const leaving = out.get(action.id) ?? [];
    const arriving = inn.get(action.id) ?? [];

    if (leaving.length >= 2) {
      // Different (or any) guards → decision; bare parallel outs → fork.
      const kind: ControlKind = leaving.some((o) => o.guard) ? "decision" : "fork";
      held.push({ kind, at: action.id, side: "after", card: card_for(kind) });
    }

    if (arriving.length >= 2) {
      const kind: ControlKind = arriving.some((o) => o.guard) ? "merge" : "join";
      held.push({ kind, at: action.id, side: "before", card: card_for(kind) });
    }

    if (arriving.length === 0 && leaving.length > 0) {
      held.push({ kind: "initial", at: action.id, side: "before", card: card_for("initial") });
    }
    if (leaving.length === 0 && arriving.length > 0) {
      held.push({ kind: "final", at: action.id, side: "after", card: card_for("final") });
    }
  }

  return held;
}

/** Lanes from the refs actions hold — one band per participant. */
export function lanesOf(graph: Graph, layer: string | null): Lane[] {
  const by = new Map<string, Lane>();

  for (const action of blocksOf(graph, layer).filter((n) => n.form === "block")) {
    const part = ref_under(graph, action);
    if (!part) continue;
    const lane = by.get(part.ref) ?? { ref: part.ref, name: part.name, actions: [] };
    lane.actions.push(action.id);
    if (!lane.name || lane.name === part.ref) lane.name = part.name;
    by.set(part.ref, lane);
  }

  return [...by.values()];
}

/** Full stage for one open layer. */
export function stageOf(graph: Graph, layer: string | null): Stage {
  const members = blocksOf(graph, layer).filter((n) => n.form === "block");
  const actions: ActionView[] = members.map((node) => {
    const part = ref_under(graph, node);
    const { label, derived } = label_of(graph, node);

    return {
      id: node.id,
      node,
      lane: part?.ref ?? "",
      label,
      derived,
    };
  });

  const ids = new Set(actions.map((a) => a.id));
  const orders: OrderView[] = [];
  for (const edge of edgesIn(graph, layer)) {
    const ends = ends_of(edge);
    if (!ends || !ids.has(ends[0]) || !ids.has(ends[1])) continue;
    orders.push({
      edge,
      from: ends[0],
      to: ends[1],
      guard: guardOf(graph, edge),
      // Infer writes bare directed edges; a typed flow is a statement.
      inferred: !edge.type,
    });
  }

  const groups: GroupView[] = groupsIn(graph, layer).map(({ attr, here }) => ({
    id: attr.id,
    node: attr,
    members: here,
  }));

  return {
    actions,
    lanes: lanesOf(graph, layer),
    groups,
    orders,
    controls: controlsOf(graph, layer),
    dim: DIM,
  };
}
