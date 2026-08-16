/** Layer → sequence stage. The module's composition half.
 *
 *  A column is the ref each action holds (a lifeline). Occurrences run down
 *  each column. Explicit order is a directed relation; when none speaks,
 *  position along the layer's axis is the fallback. A message is an order
 *  whose ends sit in different columns. Derived labels and implied order
 *  draw dimmed (`DIM`). */

import {
  axisOf, blocksOf, childrenOf, edgesIn, fieldsOf, isProxy, nameOf,
} from "../../../graph/fold";
import type { Axis, Edge, Element, Graph } from "../../../graph/types";

/** How derived labels and implied order draw until a dimming device lands.
 *
 *  Same signal as a plain card's chip: muted colour and lowered opacity. */
export const DIM = {
  color: "var(--muted)",
  opacity: 0.55,
} as const;

/** Verb a derived label opens with — matches packages/behavior words. */
export const VERB = "do";

export type Column = {
  /** Participant ref (`proxy.of`), stable across the layer. */
  ref: string;
  /** Display name read through the ref when the graph can resolve it. */
  name: string;
  /** Occurrences on this lifeline, in sequence order. */
  actions: string[];
};

export type Occurrence = {
  id: string;
  node: Element;
  /** Column key — the participant ref, or empty when none. */
  column: string;
  /** What draws on the occurrence. */
  label: string;
  /** True when the label is derived (`do Pump`) rather than typed. */
  derived: boolean;
  /** Index down the global sequence (time). */
  rank: number;
};

export type OrderView = {
  edge: Edge | null;
  from: string;
  to: string;
  /** Guard field value, when the edge carries one. */
  guard: string;
  /** Untyped directed edge — the infer chain — draws dimmed. */
  inferred: boolean;
  /** True when order came from axis position, not a directed edge. */
  implied: boolean;
};

export type Message = OrderView & {
  fromCol: string;
  toCol: string;
};

/** Everything the sequence module needs to project one layer. */
export type Stage = {
  occurrences: Occurrence[];
  columns: Column[];
  orders: OrderView[];
  messages: Message[];
  /** Host idiom for derived labels and implied / inferred order. */
  dim: typeof DIM;
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

/** Position along the layer's axis — the implied-order fallback. */
export function along(axis: Axis, node: Element): number {
  if (axis === "across") return node.x ?? 0;
  if (axis === "down") return node.y ?? 0;
  // No axis yet: read down the page, then across — stable, deterministic.
  return (node.y ?? 0) * 1e6 + (node.x ?? 0);
}

/** Total order: directed edges first, axis position breaks ties and fills gaps. */
export function ranked(
  actions: Element[],
  directed: { from: string; to: string }[],
  axis: Axis,
): string[] {
  const ids = actions.map((a) => a.id);
  const by = new Map(actions.map((a) => [a.id, a]));
  const succ = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of ids) {
    succ.set(id, []);
    indeg.set(id, 0);
  }
  for (const { from, to } of directed) {
    if (!indeg.has(from) || !indeg.has(to)) continue;
    succ.get(from)!.push(to);
    indeg.set(to, (indeg.get(to) ?? 0) + 1);
  }

  const ready = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  const pick = (pool: string[]) => {
    pool.sort((a, b) => along(axis, by.get(a)!) - along(axis, by.get(b)!)
      || a.localeCompare(b));
    return pool.shift()!;
  };

  const out: string[] = [];
  const seen = new Set<string>();
  while (ready.length > 0) {
    const next = pick(ready);
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    for (const to of succ.get(next) ?? []) {
      const left = (indeg.get(to) ?? 1) - 1;
      indeg.set(to, left);
      if (left === 0) ready.push(to);
    }
  }

  // Cycles (or stray nodes) fall through to axis order alone.
  const rest = ids.filter((id) => !seen.has(id));
  rest.sort((a, b) => along(axis, by.get(a)!) - along(axis, by.get(b)!)
    || a.localeCompare(b));
  return [...out, ...rest];
}

/** Columns from the refs actions hold — one lifeline per participant. */
export function columnsOf(graph: Graph, layer: string | null): Column[] {
  const by = new Map<string, Column>();

  for (const action of blocksOf(graph, layer).filter((n) => n.form === "block")) {
    const part = ref_under(graph, action);
    if (!part) continue;
    const col = by.get(part.ref) ?? { ref: part.ref, name: part.name, actions: [] };
    col.actions.push(action.id);
    if (!col.name || col.name === part.ref) col.name = part.name;
    by.set(part.ref, col);
  }

  return [...by.values()];
}

/** Full stage for one open layer. */
export function stageOf(graph: Graph, layer: string | null): Stage {
  const members = blocksOf(graph, layer).filter((n) => n.form === "block");
  const axis = axisOf(graph, layer);
  const col_of = new Map<string, string>();
  const draft: Omit<Occurrence, "rank">[] = members.map((node) => {
    const part = ref_under(graph, node);
    const { label, derived } = label_of(graph, node);
    if (part) col_of.set(node.id, part.ref);

    return {
      id: node.id,
      node,
      column: part?.ref ?? "",
      label,
      derived,
    };
  });

  const ids = new Set(draft.map((a) => a.id));
  const explicit: { edge: Edge; from: string; to: string; guard: string }[] = [];
  for (const edge of edgesIn(graph, layer)) {
    const ends = ends_of(edge);
    if (!ends || !ids.has(ends[0]) || !ids.has(ends[1])) continue;
    explicit.push({
      edge, from: ends[0], to: ends[1], guard: guardOf(graph, edge),
    });
  }

  const order = ranked(
    members,
    explicit.map((e) => ({ from: e.from, to: e.to })),
    axis,
  );
  const rank_of = new Map(order.map((id, i) => [id, i]));

  const occurrences: Occurrence[] = draft.map((row) => ({
    ...row,
    rank: rank_of.get(row.id) ?? 0,
  }));
  occurrences.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));

  const columns = columnsOf(graph, layer).map((col) => ({
    ...col,
    actions: [...col.actions].sort((a, b) =>
      (rank_of.get(a) ?? 0) - (rank_of.get(b) ?? 0) || a.localeCompare(b)),
  }));
  // Lifelines left-to-right by first occurrence, then ref — stable columns.
  columns.sort((a, b) => {
    const ra = a.actions.length ? (rank_of.get(a.actions[0]) ?? 0) : 0;
    const rb = b.actions.length ? (rank_of.get(b.actions[0]) ?? 0) : 0;
    return ra - rb || a.ref.localeCompare(b.ref);
  });

  const orders: OrderView[] = explicit.map((row) => ({
    edge: row.edge,
    from: row.from,
    to: row.to,
    guard: row.guard,
    // Infer writes bare directed edges; a typed flow is a statement.
    inferred: !row.edge.type,
    implied: false,
  }));

  // Axis fallback: consecutive ranks with no directed edge between them.
  const linked = new Set(explicit.map((e) => `${e.from}\0${e.to}`));
  for (let i = 0; i < order.length - 1; i++) {
    const from = order[i];
    const to = order[i + 1];
    if (linked.has(`${from}\0${to}`)) continue;
    orders.push({
      edge: null,
      from,
      to,
      guard: "",
      inferred: true,
      implied: true,
    });
  }

  const messages: Message[] = orders
    .filter((o) => {
      const a = col_of.get(o.from) ?? "";
      const b = col_of.get(o.to) ?? "";
      return a !== b && (a.length > 0 || b.length > 0);
    })
    .map((o) => ({
      ...o,
      fromCol: col_of.get(o.from) ?? "",
      toCol: col_of.get(o.to) ?? "",
    }));

  return {
    occurrences,
    columns,
    orders,
    messages,
    dim: DIM,
  };
}
