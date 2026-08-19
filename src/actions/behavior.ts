/** The `infer` action — a selection becomes one behavior block, or a plain
 *  set of proxies over it (P.4). One registered action, offered twice via its
 *  `as` choice — R.5's "one action, offered N times" — so the closed action
 *  set does not widen for the set reading.
 *
 *  Built against behaviors.md for the behavior reading. Guess freely in the
 *  behavior; write home only what a tier-1 flow stated. Re-inferring always
 *  mints a new block. The page wire that feeds explorer `chosen` is not
 *  here — this module publishes the record and the inference. */

import {
  axisOf, blocksOf, childrenOf, isContainer, isPort, isa, nameOf, nextNum, portsOf,
} from "../graph/fold";
import {
  ROOT, defIdFor, edge as makeEdge, element as makeElement, newId, refAt, refTo,
  type Axis, type Definition, type Edge, type Element, type Graph, type Mutation,
  type Side,
} from "../graph/types";
import { register, type Action, type Args, type Context, type Effect, type HomeBatch } from "./index";

/** Default abstraction cap — view config may override via args.N (A.7c). */
const DEFAULT_N = 5;

const ACTION_TYPE = refTo("def_action", "pkg_behavior");
const STATE_TYPE = refTo("def_state", "pkg_behavior");

/** The two readings `infer` offers — the menu's expanded entries. */
const AS = ["behavior", "set"] as const;

type Hit = {
  project: string;
  id: string;
  graph: Graph;
  element: Element;
  /** Stable path for ordering across projects. */
  path: string;
};

function open_of(ctx: Context, args: Args): Record<string, Graph> {
  const raw = args.open;
  const from_args = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, Graph>
    : {};
  return { ...(ctx.open ?? {}), ...from_args };
}

function project_of(ctx: Context): string {
  return ctx.project ?? "";
}

function of_list(args: Args): string[] {
  const raw = args.of;
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(Boolean);
}

function graph_at(ctx: Context, open: Record<string, Graph>, project: string | undefined): Graph | undefined {
  if (!project || project === project_of(ctx)) return ctx.graph;
  return open[project];
}

function resolve_hit(ctx: Context, open: Record<string, Graph>, ref: string): Hit | null {
  const { project: half, id } = refAt(ref);
  const project = half ?? project_of(ctx);
  const graph = graph_at(ctx, open, half);
  if (!graph) return null;
  const element = graph.elements[id];
  if (!element || isPort(element)) return null;
  return { project, id, graph, element, path: refTo(id, project || undefined) };
}

/** Tree position under root — sibling index path, for deterministic order. */
function tree_path(graph: Graph, id: string): number[] {
  const trail: number[] = [];
  let cursor: string | null = id;
  while (cursor && cursor !== ROOT) {
    const node: Element | undefined = graph.elements[cursor];
    if (!node) break;
    const parent: string | null = node.parent;
    const sibs = childrenOf(graph, parent)
      .filter((n) => !isPort(n))
      .map((n) => n.id);
    trail.unshift(sibs.indexOf(cursor));
    cursor = parent;
  }
  return trail;
}

function hit_order(a: Hit, b: Hit): number {
  if (a.project !== b.project) return a.project < b.project ? -1 : 1;
  const pa = tree_path(a.graph, a.id);
  const pb = tree_path(b.graph, b.id);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? -1;
    const y = pb[i] ?? -1;
    if (x !== y) return x - y;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function def_named(graph: Graph, open: Record<string, Graph>, type: string): string {
  if (!type) return "";
  const { project, id } = refAt(type);
  const g = project ? open[project] ?? graph : graph;
  const held = g?.defs[id] ?? g?.defs[type] ?? graph.defs[type];
  if (held) return held.name;
  // Search open packages by bare id.
  for (const pack of Object.values(open)) {
    if (pack.defs[id]) return pack.defs[id].name;
  }
  return type;
}

function def_record(graph: Graph, open: Record<string, Graph>, type: string): Definition | undefined {
  if (!type) return undefined;
  const { project, id } = refAt(type);
  if (project) return open[project]?.defs[id];
  if (graph.defs[id] ?? graph.defs[type]) return graph.defs[id] ?? graph.defs[type];
  for (const pack of Object.values(open)) {
    if (pack.defs[id]) return pack.defs[id];
  }
  return undefined;
}

/** Whether this type `isa` flow — exact names, or `isa` / `extends` over open graphs. */
function isa_flow(graph: Graph, open: Record<string, Graph>, type: string): boolean {
  if (!type) return false;
  const name = def_named(graph, open, type).trim().toLowerCase();
  if (name === "control flow" || name === "object flow" || name === "flow") return true;

  const { id } = refAt(type);
  const bare = id || type;
  if (isa(graph, bare, "def_flow") || isa(graph, bare, "flow")) return true;

  const def = def_record(graph, open, type);
  if (!def) return false;
  // Walk extends across the graph that holds this def.
  const home = (() => {
    const { project } = refAt(type);
    if (project && open[project]) return open[project];
    if (graph.defs[def.id]) return graph;
    for (const pack of Object.values(open)) {
      if (pack.defs[def.id]) return pack;
    }
    return graph;
  })();
  let cursor: string | undefined = def.extends;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const parent = def_record(home, open, cursor) ?? home.defs[cursor];
    const pname = (parent?.name ?? cursor).toLowerCase();
    if (pname === "flow" || pname === "control flow" || pname === "object flow") return true;
    cursor = parent?.extends;
  }
  return false;
}

function is_directed(edge: Edge): boolean {
  return (edge.form ?? "line") === "directed" || edge.dir === "forward"
    || edge.dir === "back" || edge.dir === "both";
}

/** Ends in order along the edge's stated direction. */
function directed_ends(edge: Edge): [string, string] | null {
  if (!is_directed(edge)) return null;
  if (edge.dir === "back") return [edge.target, edge.source];
  return [edge.source, edge.target];
}

function is_action_typed(hit: Hit, open: Record<string, Graph>): boolean {
  const type = hit.element.type;
  if (!type) return false;
  // Path ref, bare id, or the id defineNamed mints from a path at the door.
  if (type === ACTION_TYPE || type === "def_action" || type.includes("def_action")) return true;
  if (type.endsWith("/def_action")) return true;
  const name = def_named(hit.graph, open, type).toLowerCase();
  return name === "action" || name.endsWith("/def_action") || name.includes("def_action");
}

function has_outcome(hit: Hit): boolean {
  return hit.element.fields.some((f) => f.name === "outcome" && f.value.trim() !== "");
}

function cap_n(args: Args): number {
  const n = args.N;
  if (typeof n === "number" && Number.isInteger(n) && n >= 1) return n;
  return DEFAULT_N;
}

/** Participants the selection becomes — leaves under the cap, else cut higher. */
function participants(hits: Hit[], n: number): Hit[] {
  if (!hits.length) return [];

  // One container → its block children when they fit under N.
  if (hits.length === 1 && isContainer(hits[0].graph, hits[0].id)) {
    const kids = blocksOf(hits[0].graph, hits[0].id).map((el) => ({
      project: hits[0].project,
      id: el.id,
      graph: hits[0].graph,
      element: el,
      path: refTo(el.id, hits[0].project || undefined),
    }));
    if (kids.length > 0 && kids.length <= n) return kids.sort(hit_order);
    return hits;
  }

  // Several hits: if every one is a leaf or we are already ≤ N, take them.
  if (hits.length <= n) return [...hits].sort(hit_order);

  // Over cap and flat: keep the first N by stable order (shallowest cut we can
  // do without a shared container). Connected-component aggregation waits a
  // richer read of the selection; determinism still holds.
  return [...hits].sort(hit_order).slice(0, n);
}

function flow_sides(axis: Axis): { from: Side; to: Side } {
  if (axis === "down") return { from: "bottom", to: "top" };
  return { from: "right", to: "left" };
}

/** Whether this owner already has an interface marked for that flow. */
function has_flow_port(graph: Graph, owner: string, flow: "in" | "out"): boolean {
  return portsOf(graph, owner).some((p) => p.flow === flow || p.flow === "both");
}

/** Tier-1 home writes: out on source, in on target, when missing. */
function home_for_flow(
  graph: Graph,
  edge: Edge,
  axis: Axis,
): Mutation[] {
  const ends = directed_ends(edge);
  if (!ends) return [];
  const [from, to] = ends;
  const sides = flow_sides(axis);
  const out: Mutation[] = [];

  if (graph.elements[from] && !has_flow_port(graph, from, "out")) {
    // Prefer a wall the edge already named.
    const side = edge.fromSide ?? sides.from;
    const port = makeElement("", {
      parent: from, side, at: 0.5, flow: "out",
      num: nextNum(graph, from, "block", true),
    });
    out.push({ op: "add_element", element: port });
  }

  if (graph.elements[to] && !has_flow_port(graph, to, "in")) {
    const side = edge.toSide ?? sides.to;
    const port = makeElement("", {
      parent: to, side, at: 0.5, flow: "in",
      num: nextNum(graph, to, "block", true),
    });
    out.push({ op: "add_element", element: port });
  }

  return out;
}

type OrderLink = {
  from: string;
  to: string;
  tier: 1 | 2 | 3 | 4;
  /** Tier-1 edge name, when the flow carries one. */
  name: string;
  /** Structure edge that stated a tier-1 flow — for writing home. */
  edge?: Edge;
  project?: string;
  graph?: Graph;
};

/** Order among participants: first tier that speaks wins, pairwise. */
function order_links(parts: Hit[], open: Record<string, Graph>): OrderLink[] {
  const ids = new Set(parts.map((h) => h.id));
  const links: OrderLink[] = [];
  const covered = new Set<string>();

  const pair_key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  // Tier 1 then 2 — directed relationships inside each project of the selection.
  for (const hit of parts) {
    for (const edge of Object.values(hit.graph.edges)) {
      if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
      if (edge.source === edge.target) continue;
      const ends = directed_ends(edge);
      if (!ends) continue;
      const [a, b] = ends;
      const a_hit = parts.find((h) => h.id === a && h.project === hit.project);
      const b_hit = parts.find((h) => h.id === b && h.project === hit.project);
      if (!a_hit || !b_hit) continue;
      const key = pair_key(a_hit.path, b_hit.path);
      if (covered.has(key)) continue;

      const tier1 = isa_flow(hit.graph, open, edge.type);
      if (tier1 || is_directed(edge)) {
        covered.add(key);
        links.push({
          from: a_hit.path,
          to: b_hit.path,
          tier: tier1 ? 1 : 2,
          name: tier1 ? def_named(hit.graph, open, edge.type) : "",
          ...(tier1 ? { edge, project: hit.project, graph: hit.graph } : {}),
        });
      }
    }
  }

  // Tier 3 — position along each layer's axis, within one project.
  const by_project = new Map<string, Hit[]>();
  for (const hit of parts) {
    const list = by_project.get(hit.project) ?? [];
    list.push(hit);
    by_project.set(hit.project, list);
  }
  for (const group of by_project.values()) {
    if (group.length < 2) continue;
    const axis = axisOf(group[0].graph, group[0].element.parent);
    const sorted = [...group].sort((a, b) => {
      const ax = a.element.x ?? 0;
      const ay = a.element.y ?? 0;
      const bx = b.element.x ?? 0;
      const by = b.element.y ?? 0;
      if (axis === "down") return ay !== by ? ay - by : ax - bx;
      // across, or none: left-to-right then top-to-bottom
      return ax !== bx ? ax - bx : ay - by;
    });
    for (let i = 0; i < sorted.length - 1; i++) {
      const key = pair_key(sorted[i].path, sorted[i + 1].path);
      if (covered.has(key)) continue;
      covered.add(key);
      links.push({
        from: sorted[i].path, to: sorted[i + 1].path, tier: 3, name: "",
      });
    }
  }

  // Cross-project: stable chain by project id then tree — only for parts still
  // isolated from any link.
  const linked = new Set<string>();
  for (const link of links) {
    linked.add(link.from);
    linked.add(link.to);
  }
  const lonely = parts.filter((h) => !linked.has(h.path)).sort(hit_order);
  for (let i = 0; i < lonely.length - 1; i++) {
    links.push({
      from: lonely[i].path, to: lonely[i + 1].path, tier: 3, name: "",
    });
  }

  return links;
}

function build_action_tree(
  parts: Hit[],
  links: OrderLink[],
  parent: string | null,
  type: string,
): { mutations: Mutation[]; root: string; action_of: Map<string, string> } {
  const mutations: Mutation[] = [];
  const action_of = new Map<string, string>();

  const root = makeElement("", {
    parent,
    type,
    num: 1,
  });
  mutations.push({ op: "add_element", element: root });

  // One selected leaf → the root itself is the action (childless).
  if (parts.length === 1 && !isContainer(parts[0].graph, parts[0].id)) {
    const stand = makeElement("", {
      form: "proxy",
      parent: root.id,
      of: refTo(parts[0].id, parts[0].project || undefined),
      num: 1,
    });
    mutations.push({ op: "add_element", element: stand });
    action_of.set(parts[0].path, root.id);
    return { mutations, root: root.id, action_of };
  }

  let num = 1;
  for (const hit of parts) {
    const action = makeElement("", {
      parent: root.id,
      type,
      num: num++,
    });
    mutations.push({ op: "add_element", element: action });
    const stand = makeElement("", {
      form: "proxy",
      parent: action.id,
      of: refTo(hit.id, hit.project || undefined),
      num: 1,
    });
    mutations.push({ op: "add_element", element: stand });
    action_of.set(hit.path, action.id);
  }

  for (const link of links) {
    const from = action_of.get(link.from);
    const to = action_of.get(link.to);
    if (!from || !to || from === to) continue;
    mutations.push({
      op: "link_elements",
      edge: makeEdge(from, to, { form: "directed", dir: "forward" }),
    });
  }

  return { mutations, root: root.id, action_of };
}

/** Activity → state: reading A (actions become states) or B (outcomes). */
function build_state_tree(
  parts: Hit[],
  links: OrderLink[],
  parent: string | null,
): { mutations: Mutation[]; root: string } {
  const reading_b = parts.some(has_outcome);
  const mutations: Mutation[] = [];
  const root = makeElement("", { parent, type: STATE_TYPE, num: 1 });
  mutations.push({ op: "add_element", element: root });

  if (!reading_b) {
    // A — each action becomes a state; order becomes a transition.
    const state_of = new Map<string, string>();
    let num = 1;
    for (const hit of parts) {
      const state = makeElement(nameOf(hit.graph, hit.element) || "", {
        parent: root.id,
        type: STATE_TYPE,
        num: num++,
      });
      mutations.push({ op: "add_element", element: state });
      const stand = makeElement("", {
        form: "proxy",
        parent: state.id,
        of: refTo(hit.id, hit.project || undefined),
        num: 1,
      });
      mutations.push({ op: "add_element", element: stand });
      state_of.set(hit.path, state.id);
    }
    for (const link of links) {
      const from = state_of.get(link.from);
      const to = state_of.get(link.to);
      if (!from || !to || from === to) continue;
      mutations.push({
        op: "link_elements",
        edge: makeEdge(from, to, { form: "directed", dir: "forward" }),
      });
    }
    return { mutations, root: root.id };
  }

  // B — each action is a transition; states are conditions between.
  const states: string[] = [];
  let num = 1;
  const first = makeElement("start", { parent: root.id, type: STATE_TYPE, num: num++ });
  mutations.push({ op: "add_element", element: first });
  states.push(first.id);

  const ordered = [...parts].sort(hit_order);
  for (const hit of ordered) {
    const label = nameOf(hit.graph, hit.element) || hit.id;
    const outcome = hit.element.fields.find((f) => f.name === "outcome")?.value.trim();
    const after = makeElement(outcome || `after ${label}`, {
      parent: root.id, type: STATE_TYPE, num: num++,
    });
    mutations.push({ op: "add_element", element: after });
    const prev = states[states.length - 1];
    mutations.push({
      op: "link_elements",
      edge: makeEdge(prev, after.id, {
        form: "directed", dir: "forward",
        type: ACTION_TYPE,
      }),
    });
    states.push(after.id);
  }
  return { mutations, root: root.id };
}

/** Set reading (P.4): a block holding a direct proxy of every hit — no tree,
 *  no inferred order, no kind mutation. A set's members are proxies and
 *  nothing else, which is what lets `role_of` derive the role rather than
 *  storing one (P.5). This is the general form `build_action_tree` and
 *  `build_state_tree` specialise with structure. */
function build_set(hits: Hit[], into: string, fresh: boolean): Effect {
  const root = makeElement("", { parent: null, num: 1 });
  const mutations: Mutation[] = [{ op: "add_element", element: root }];

  let num = 1;
  for (const hit of hits) {
    mutations.push({
      op: "add_element",
      element: makeElement("", {
        form: "proxy", parent: root.id, of: refTo(hit.id, hit.project || undefined), num: num++,
      }),
    });
  }

  return {
    mutations,
    into,
    ...(fresh ? { admit: true } : {}),
    say: "infer: set",
  };
}

function home_batches(links: OrderLink[]): HomeBatch[] {
  const by_project = new Map<string, { graph: Graph; mutations: Mutation[] }>();

  for (const link of links) {
    if (link.tier !== 1 || !link.edge || !link.graph || !link.project) continue;
    const held = by_project.get(link.project) ?? { graph: link.graph, mutations: [] };
    const axis = axisOf(held.graph, held.graph.elements[link.edge.source]?.parent ?? null);
    const extra = home_for_flow(held.graph, link.edge, axis);
    for (const m of extra) {
      if (m.op === "add_element") {
        held.graph = {
          ...held.graph,
          elements: { ...held.graph.elements, [m.element.id]: m.element },
        };
      }
      held.mutations.push(m);
    }
    by_project.set(link.project, held);
  }

  return [...by_project.entries()]
    .filter(([, { mutations }]) => mutations.length > 0)
    .map(([into, { mutations }]) => ({
      into,
      mutations,
      say: "home: interface",
    }));
}

/** The root's own kind (P.6's door) — activity or state, matching the tree
 *  just built. Only for a freshly minted project: an `into` the caller named
 *  may already be a project of some other kind, and re-inferring into it is
 *  not a licence to reclassify it. */
function kind_mutations(module: "activity" | "state"): Mutation[] {
  const def_id = defIdFor(module);
  return [
    { op: "set_def", id: def_id, name: module, components: { view: { module } } },
    { op: "update_element", id: ROOT, type: def_id },
  ];
}

/** `of` (selection refs) and `open` (cross-project graphs) stay off Arg —
 *  the page injects them; Arg has no list/record kind, and selection is not a
 *  prompt. `into` and `N` are what a tray or sentence can fill. */
const infer: Action = {
  name: "infer",
  label: "Infer",
  about: "turns a selection into one behavior block, or a saved set holding a proxy of each",
  scope: { on: "layer" },
  // Behavior and set are the entries — the choice's options are the menu's
  // two lines, both this one registered action (fill.ts's `entries`).
  expand: true,
  args: [
    { kind: "choice", name: "as", options: [...AS] },
    { kind: "text", name: "into", optional: true, prompt: "Behavior project" },
    { kind: "number", name: "N", optional: true },
  ],
  check: (ctx, args) => {
    const refs = of_list(args);
    if (!refs.length) return "Needs a selection.";
    const open = open_of(ctx, args);
    const hits = refs.map((r) => resolve_hit(ctx, open, r)).filter(Boolean) as Hit[];
    if (!hits.length) return "Nothing in the selection could be read.";
    return null;
  },
  run: (ctx, args): Effect => {
    const open = open_of(ctx, args);
    const refs = of_list(args);
    // Deterministic over the selection — sort refs, never click order.
    const hits = [...new Map(
      refs.map((r) => resolve_hit(ctx, open, r))
        .filter((h): h is Hit => h !== null)
        .map((h) => [h.path, h]),
    ).values()].sort(hit_order);

    const into_arg = typeof args.into === "string" && args.into.trim()
      ? args.into.trim()
      : "";
    const into = into_arg || newId("proj");

    // Set reading (P.4): every hit becomes a direct proxy, nothing else — the
    // participant-capping and ordering below are the behavior reading's own.
    if (args.as === "set") return build_set(hits, into, !into_arg);

    const n = cap_n(args);
    const parts = participants(hits, n);
    const links = order_links(parts, open);
    const compose = parts.length > 0 && parts.every((h) => is_action_typed(h, open));

    const built = compose
      ? build_state_tree(parts, links, null)
      : build_action_tree(parts, links, null, ACTION_TYPE);

    const home = home_batches(links);
    // Fresh mint only — see kind_mutations.
    const kind = into_arg ? [] : kind_mutations(compose ? "state" : "activity");

    return {
      mutations: [...built.mutations, ...kind],
      into,
      // A named destination is already open; a fresh mint needs the workspace
      // door too, or it writes a project nothing shows (P.3).
      ...(into_arg ? {} : { admit: true }),
      ...(home.length ? { home } : {}),
      say: compose ? "infer: state" : "infer: action",
    };
  },
};

register(infer);
