/** Layer → state stage. The module's composition half.
 *
 *  States are the layer's state-typed blocks; transitions are directed order
 *  between them. Reading A (actions became states) vs B (actions became
 *  transitions) is read from the graph shape once per machine — never mixed.
 *  Derived labels and untyped transitions draw dimmed (`DIM`). Empty layers
 *  offer `infer` rather than inventing a machine. */

import { shaped, type CardConfig, type Shape } from "../../card";
import {
  blocksOf, childrenOf, edgesIn, fieldsOf, groupsIn, isProxy, nameOf,
} from "../../../graph/fold";
import { refAt, type Edge, type Element, type Graph } from "../../../graph/types";

/** How derived labels and inferred transitions draw until a dimming device lands.
 *
 *  Same signal as activity / a plain card's chip: muted colour and lowered
 *  opacity. Not a new concept. */
export const DIM = {
  color: "var(--muted)",
  opacity: 0.55,
} as const;

/** What the empty stage says — infer over actions is what fills it. */
export const OFFER = "infer over actions";

/** Pseudostate kinds counted from the transition chain — never stored. */
export const MARKS = ["initial", "final"] as const;

export type MarkKind = (typeof MARKS)[number];

export type MarkAt = "before" | "after";

export type Mark = {
  kind: MarkKind;
  at: string;
  side: MarkAt;
  card: CardConfig;
};

/** How activity→state was read when this machine was inferred. */
export type Reading = "A" | "B";

export type StateView = {
  id: string;
  node: Element;
  /** What draws on the card. */
  label: string;
  /** True when the label is derived rather than typed. */
  derived: boolean;
  /** Participant ref under Reading A, when the state holds one. */
  ref: string;
};

export type TransitionView = {
  edge: Edge;
  from: string;
  to: string;
  /** Guard field value, when the edge carries one. */
  guard: string;
  /** What draws on the arrow — empty when there is only direction. */
  label: string;
  /** Untyped directed order — Reading A infer — draws dimmed. */
  inferred: boolean;
};

export type GroupView = {
  id: string;
  node: Element;
  members: string[];
};

/** Everything the state module needs to project one layer. */
export type Stage = {
  states: StateView[];
  transitions: TransitionView[];
  groups: GroupView[];
  marks: Mark[];
  /** A or B when the layer holds a machine; null when empty. */
  reading: Reading | null;
  /** Host idiom for derived labels and inferred transitions. */
  dim: typeof DIM;
  /** Copy shown when nothing has been inferred yet. */
  offer: typeof OFFER;
};

const SHAPE_OF: Record<MarkKind, Shape> = {
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

/** Whether this block is a state by definition — name or def_state id. */
export function isState(graph: Graph, node: Element): boolean {
  const type = node.type;
  if (!type) return false;
  if (type === "def_state" || type.includes("def_state") || type.endsWith("/def_state")) {
    return true;
  }
  const { id } = refAt(type);
  const bare = id || type;
  const def = graph.defs[bare] ?? graph.defs[type];
  const name = (def?.name ?? "").toLowerCase();
  return name === "state";
}

/** Whether an edge type marks a Reading-B transition (action-as-edge). */
function is_action_edge(graph: Graph, edge: Edge): boolean {
  const type = edge.type?.trim() ?? "";
  if (!type) return false;
  if (type === "def_action" || type.includes("def_action") || type.endsWith("/def_action")) {
    return true;
  }
  const { id } = refAt(type);
  const bare = id || type;
  const def = graph.defs[bare] ?? graph.defs[type];
  const name = (def?.name ?? "").toLowerCase();
  return name === "action";
}

/** Participant ref under a state — Reading A places a proxy child. */
function ref_under(graph: Graph, state: Element): { ref: string; name: string } | null {
  const stand = childrenOf(graph, state.id).find(isProxy);
  if (!stand?.of) return null;
  const shown = nameOf(graph, stand);
  const bare = stand.of.includes("/") ? stand.of.slice(stand.of.lastIndexOf("/") + 1) : stand.of;

  return { ref: stand.of, name: shown && shown !== "missing" ? shown : bare };
}

/** Label: typed name wins; otherwise the participant under Reading A. */
function label_of(graph: Graph, state: Element): { label: string; derived: boolean } {
  const typed = state.label.trim();
  if (typed) return { label: typed, derived: false };

  const part = ref_under(graph, state);
  if (part) return { label: part.name, derived: true };

  return { label: nameOf(graph, state) || state.id, derived: true };
}

function card_for(kind: MarkKind): CardConfig {
  return shaped(SHAPE_OF[kind], "below");
}

/** Count initial / final from the transition chain at one layer. */
export function marksOf(graph: Graph, layer: string | null): Mark[] {
  const states = blocksOf(graph, layer).filter((n) => n.form === "block" && isState(graph, n));
  const ids = new Set(states.map((s) => s.id));
  const orders = edgesIn(graph, layer)
    .map((e) => ({ edge: e, ends: ends_of(e) }))
    .filter((row): row is { edge: Edge; ends: [string, string] } =>
      row.ends !== null && ids.has(row.ends[0]) && ids.has(row.ends[1]));

  const out = new Map<string, number>();
  const inn = new Map<string, number>();
  for (const id of ids) {
    out.set(id, 0);
    inn.set(id, 0);
  }
  for (const { ends } of orders) {
    out.set(ends[0], (out.get(ends[0]) ?? 0) + 1);
    inn.set(ends[1], (inn.get(ends[1]) ?? 0) + 1);
  }

  const held: Mark[] = [];
  for (const state of states) {
    const leaving = out.get(state.id) ?? 0;
    const arriving = inn.get(state.id) ?? 0;
    if (arriving === 0 && leaving > 0) {
      held.push({ kind: "initial", at: state.id, side: "before", card: card_for("initial") });
    }
    if (leaving === 0 && arriving > 0) {
      held.push({ kind: "final", at: state.id, side: "after", card: card_for("final") });
    }
  }
  return held;
}

/** A when transitions are bare order; B when any is an action-typed edge. */
export function readingOf(graph: Graph, layer: string | null): Reading | null {
  const states = blocksOf(graph, layer).filter((n) => n.form === "block" && isState(graph, n));
  if (states.length === 0) return null;
  const ids = new Set(states.map((s) => s.id));
  for (const edge of edgesIn(graph, layer)) {
    const ends = ends_of(edge);
    if (!ends || !ids.has(ends[0]) || !ids.has(ends[1])) continue;
    if (is_action_edge(graph, edge)) return "B";
  }
  return "A";
}

/** Full stage for one open layer. */
export function stageOf(graph: Graph, layer: string | null): Stage {
  const members = blocksOf(graph, layer).filter((n) => n.form === "block" && isState(graph, n));
  const states: StateView[] = members.map((node) => {
    const part = ref_under(graph, node);
    const { label, derived } = label_of(graph, node);

    return {
      id: node.id,
      node,
      label,
      derived,
      ref: part?.ref ?? "",
    };
  });

  const ids = new Set(states.map((s) => s.id));
  const reading = readingOf(graph, layer);
  const transitions: TransitionView[] = [];
  for (const edge of edgesIn(graph, layer)) {
    const ends = ends_of(edge);
    if (!ends || !ids.has(ends[0]) || !ids.has(ends[1])) continue;
    const actionish = is_action_edge(graph, edge);
    const typed = edge.type?.trim() ?? "";
    transitions.push({
      edge,
      from: ends[0],
      to: ends[1],
      guard: guardOf(graph, edge),
      // Reading B: the edge *is* the action; name from the type when known.
      label: actionish
        ? ((graph.defs[refAt(typed).id]?.name
          ?? graph.defs[typed]?.name
          ?? "action"))
        : "",
      inferred: !typed,
    });
  }

  const groups: GroupView[] = groupsIn(graph, layer).map(({ attr, here }) => ({
    id: attr.id,
    node: attr,
    members: here,
  }));

  return {
    states,
    transitions,
    groups,
    marks: marksOf(graph, layer),
    reading,
    dim: DIM,
    offer: OFFER,
  };
}
