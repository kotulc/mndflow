/** How a behavior comes to exist, and what it writes back.
 *
 *  **Guess freely in the behavior. Never guess into the structure.** A wrong
 *  guess in a behavior costs an edit; a wrong guess written into a structure
 *  modifies the truth, invisibly. So the inference is deliberately loose, and
 *  only a fact the structure actually stated is written home.
 *
 *  The rules in full are behaviors.md. */

import { children, edges_in, isa, path, subtree } from "./fold";
import { new_id } from "./ids";
import { READS, type Graph, type Id, type Mutation, type Relation } from "./types";

/** Beyond this many actions the inference cuts higher in the tree. A view
 *  definition option rather than an engine constant; this is its default.
 *
 *  Named for what it caps: the log has a cap too, and one word for both would
 *  be the sort of collision the vocabulary rework was about. */
export const ABSTRACTION = 5;

/** Which tier the order was read from. Only tier 1 writes home. */
export type Tier = 1 | 2 | 3 | 4;

export type Inference = {
  mutations: Mutation[];
  /** The behavior block that was made. */
  block: Id;
  /** Which tier spoke, so a caller can say what it guessed from. */
  tier: Tier;
  /** The participants, in the order they were read. */
  order: Id[];
};

/** What the selection becomes. **Count is not the discriminator — shape is.** */
export function shape(graph: Graph, of: readonly Id[]): Id[] {
  const picked = of.filter((id) => graph.blocks[id]);
  if (picked.length === 0) return [];
  if (picked.length === 1) {
    const kids = children(graph, picked[0]!).map((b) => b.id);
    return kids.length ? kids : picked;
  }
  return picked;
}

/** Past the cap, cut higher: a container becomes one action and its children
 *  fold in as detail. Deterministic — the shallowest level whose count is ≤ N. */
export function capped(graph: Graph, ids: readonly Id[], n = ABSTRACTION): Id[] {
  if (ids.length <= n) return [...ids];
  const up = [...new Set(ids.map((id) => graph.blocks[id]?.parent ?? id))];
  if (up.length >= ids.length) return ids.slice(0, n);
  return capped(graph, up, n);
}

/** Order, read down four tiers. The first that speaks, wins. */
export function ordered(graph: Graph, ids: readonly Id[]): { order: Id[]; tier: Tier } {
  const here = new Set(ids);
  const layers = [...new Set(ids.map((id) => graph.blocks[id]?.parent ?? null))];
  const edges: Relation[] = layers.flatMap((l) => edges_in(graph, l))
    .filter((e) => here.has(e.from) && here.has(e.to));

  const flows = edges.filter((e) => e.module === "directed" && is_flow(graph, e));
  if (flows.length) return { order: chain(ids, flows), tier: 1 };

  const directed = edges.filter((e) => e.module === "directed");
  if (directed.length) return { order: chain(ids, directed), tier: 2 };

  const along = by_position(graph, ids);
  if (along) return { order: along, tier: 3 };

  return { order: chain(ids, edges), tier: 4 };
}

/** A `flow` subtype — the one tier that writes home, because it is the one the
 *  structure actually stated. */
function is_flow(graph: Graph, e: Relation): boolean {
  return isa(graph, e.type).some((d) => d.name === "flow");
}

/** Sort by how many of the others reach it, so a chain comes out in order.
 *  Stable, and the tree path is the tie-break — click order is not a property
 *  of the selection, so it can never be used. */
function chain(ids: readonly Id[], edges: readonly Relation[]): Id[] {
  const before = new Map<Id, number>(ids.map((id) => [id, 0]));
  let settled = false;
  for (let pass = 0; pass < ids.length && !settled; pass++) {
    settled = true;
    for (const e of edges) {
      const want = (before.get(e.from) ?? 0) + 1;
      if ((before.get(e.to) ?? 0) < want) { before.set(e.to, want); settled = false; }
    }
  }
  return [...ids].sort((a, b) =>
    (before.get(a) ?? 0) - (before.get(b) ?? 0) || a.localeCompare(b));
}

/** Position along a **directional** arrangement. `free` and `grid` carry no
 *  reading direction, so this tier does not fire under them.
 *
 *  Across layers, position is not comparable, so the tree path orders them —
 *  arbitrary, deterministic, workable. */
function by_position(graph: Graph, ids: readonly Id[]): Id[] | null {
  const layers = [...new Set(ids.map((id) => graph.blocks[id]?.parent ?? null))];
  const reads = layers.map((l) => READS[graph.blocks[l ?? graph.root]?.arrangement ?? "free"]);
  if (reads.some((r) => !r)) return null;

  /** The **holder's** trail, not the block's own. Ordering by the block's path
   *  would put siblings in id order and position would never get a look in —
   *  the trail is only there to settle blocks from layers that cannot be
   *  compared. */
  const trail = (id: Id) => {
    const holder = graph.blocks[id]?.parent;
    return holder ? path(graph, holder).map((b) => b.id).join("/") : "";
  };
  const along = (id: Id) => {
    const b = graph.blocks[id];
    const side = READS[graph.blocks[b?.parent ?? graph.root]?.arrangement ?? "free"];
    const x = b?.x ?? 0;
    const y = b?.y ?? 0;
    return side === "right" ? x : side === "left" ? -x : side === "bottom" ? y : -y;
  };
  return [...ids].sort((a, b) =>
    trail(a).localeCompare(trail(b)) || along(a) - along(b) || a.localeCompare(b));
}

/** Turn a selection into **one new top-level behavior block**.
 *
 *  One-way, one-time and deterministic. Nothing appends to an existing
 *  behavior, so an inference can never disturb one somebody has worked on. */
export function infer(graph: Graph, of: readonly Id[], n = ABSTRACTION): Inference | null {
  const picked = shape(graph, of);
  if (picked.length === 0) return null;

  const participants = capped(graph, picked, n);
  const { order, tier } = ordered(graph, participants);

  const root = new_id("block");
  const mutations: Mutation[] = [{ op: "add_block", block: {
    id: root, parent: graph.root, type: "behavior", num: 1,
    label: name_for(graph, order),
  } }];

  /** An action holds a **reference** to its participant, never a part — which
   *  is why the behavior tree stays its own and a structure block never
   *  appears in it. A lane falls out of the reference for free. */
  const made: Id[] = [];
  for (const [i, id] of order.entries()) {
    const action = new_id("block");
    const ref = new_id("block");
    mutations.push(
      { op: "add_block", block: { id: action, parent: root, type: "action", num: i + 1 } },
      { op: "add_block", block: { id: ref, parent: action, of: id, num: 1 } },
    );
    made.push(action);
  }

  /** The order, as directed relations between the actions. */
  for (let i = 1; i < made.length; i++) {
    mutations.push({ op: "link_blocks", edge: {
      id: new_id("edge"), from: made[i - 1]!, to: made[i]!, module: "directed",
    } });
  }

  /** **Only tier 1 writes home**, and only what the structure stated: a flow
   *  between two participants implies an interface at each end. Everything
   *  guessed from position, connectivity or a stable ordering writes nothing. */
  if (tier === 1) mutations.push(...writes_home(graph, order));

  return { mutations, block: root, tier, order };
}

function writes_home(graph: Graph, order: readonly Id[]): Mutation[] {
  const here = new Set(order);
  const layers = [...new Set(order.map((id) => graph.blocks[id]?.parent ?? null))];
  const out: Mutation[] = [];
  const seen = new Set<string>();
  for (const l of layers) {
    for (const e of edges_in(graph, l)) {
      if (!here.has(e.from) || !here.has(e.to) || !is_flow(graph, e)) continue;
      for (const [owner, side] of [[e.from, "right"], [e.to, "left"]] as const) {
        const key = `${owner}:${side}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ op: "add_block", block: {
          id: new_id("block"), parent: owner, side, at: 0.5,
          flow: side === "right" ? "out" : "in",
          num: children(graph, owner).length + out.length + 1,
        } });
      }
    }
  }
  return out;
}

/** A behavior is named for what it is over, so it is findable before anybody
 *  renames it. Derived once, at creation — not a fallback that follows. */
function name_for(graph: Graph, order: readonly Id[]): string {
  const first = order[0];
  const holder = first ? graph.blocks[first]?.parent : null;
  const over = holder ? graph.blocks[holder]?.label : undefined;
  return over ? `${over} behavior` : "behavior";
}

/** Which behaviors a block takes part in. **Derived, never stored** — a stored
 *  back-reference would duplicate a fact that already exists and leave an
 *  exported structure pointing at behaviors that did not travel with it. */
export function participates(graph: Graph, id: Id): Id[] {
  const out: Id[] = [];
  for (const top of children(graph, graph.root)) {
    if (top.type !== "behavior") continue;
    if (subtree(graph, top.id).some((x) => graph.blocks[x]?.of === id)) out.push(top.id);
  }
  return out;
}
