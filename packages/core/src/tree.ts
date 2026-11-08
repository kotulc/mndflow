/** Where blocks sit: layers, children, order, and the relations drawn among them. */

import { def_at, isa, module_of, setting_of } from "./defs";
import { behaviour_owner, behaviours_of, is_behaviour } from "./ends";
import { allocations_of, drawn_in, is_holder, layer_of, region_of } from "./holders";
import { PLACINGS, type Placing, type Block, type Definition, type Flow, type Graph, type Id,
         type Port, type Relation } from "./types";
import { kept } from "./memo";


/** Every block under this one, itself included: read off the children index, so a deep tree costs
 *  what it holds, not what the graph holds. */
export function subtree(graph: Graph, id: Id): Id[] {
  const by = held_by(graph);
  const out: Id[] = [id];
  for (let i = 0; i < out.length; i++) {
    for (const b of by.get(out[i]!) ?? []) out.push(b.id);
  }
  return out;
}

/** What a gesture is about: the one element picked, else the open layer. Picking several, or
 *  nothing, leaves the layer to answer — **one rule, so every view is about the same thing**. */
export function about_of(graph: Graph, layer: Id | null, picked: readonly Id[]): Id {
  const one = picked.length === 1 ? picked[0]! : null;
  return one && (graph.blocks[one] ?? graph.edges[one]) ? one : layer ?? graph.root;
}

/** What a listing frames: the block in context, else the open layer. **A block frames its own
 *  contents whether or not it holds anything**; a line holds nothing and the root is the layer
 *  itself, so both leave the layer to answer. */
export function frame_of(graph: Graph, layer: Id | null, about: Id): Id | null {
  return graph.blocks[about] && about !== graph.root ? about : layer;
}

/** What a block holds, in a stable order. Null holds the package roots. */
export function children(graph: Graph, layer: Id | null): Block[] {
  return [...(held_by(graph).get(layer) ?? [])];
}

/** Every block under its parent, in a stable order: indexed once per set of blocks, since a
 *  drawing asks what each block holds many times over. */
function held_by(graph: Graph): ReadonlyMap<Id | null, readonly Block[]> {
  return kept(graph, "children", () => index(graph));
}

function index(graph: Graph): Map<Id | null, Block[]> {
  const by = new Map<Id | null, Block[]>();
  for (const b of Object.values(graph.blocks)) {
    const at = by.get(b.parent) ?? [];
    at.push(b);
    by.set(b.parent, at);
  }
  for (const list of by.values()) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  }
  return by;
}

/** Whether a block under `parent`, other than those `except` names, already goes by `name`.
 *  Names are unique among siblings, so a name finds one block; an unnamed block never clashes. */
export function sibling_named(graph: Graph, parent: Id | null, name: string,
                              except: readonly Id[] = []): boolean {
  const want = name.trim();
  return !!want && children(graph, parent)
    .some((b) => !except.includes(b.id) && (b.name ?? "").trim() === want);
}

/** The chain from root down to this block, itself last. */
export function path(graph: Graph, id: Id): Block[] {
  const out: Block[] = [];
  let at: Id | null = id;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    const b: Block | undefined = graph.blocks[at];
    if (!b) break;
    out.unshift(b);
    at = b.parent;
  }
  return out;
}

/** A port as a block wears it, and the block holding it: its own, or a definition's down its
 *  chain, where an edit to it goes home. */
export type Worn = Port & { holder: Id };

/** Whether an id names an interface: a port as drawn, `block/port`, or a block laid in for one,
 *  whose kind runs the `interface` module. */
export function is_interface(graph: Graph, id: Id): boolean {
  if (port_at(graph, id)) return true;
  const b = graph.blocks[id];
  return !!b && !b.def && module_of(graph, id) === "interface";
}

/** A definition's ports: its own, then those its chain declares, nearest first. **Ports
 *  inherit**, as attributes do; parts never. Each keeps its id and holder. */
export function ports_of(graph: Graph, def: Id | undefined): Worn[] {
  return isa(graph, def).flatMap((d) => own_ports(graph, d.id));
}

/** The ports a block wears: a definition its chain's; a usage its own, then its definition's,
 *  read through. **Any block may have its own.** */
export function ports_on(graph: Graph, id: Id): Worn[] {
  const b = graph.blocks[id];
  if (!b) return [];
  return b.def ? ports_of(graph, b.id) : [...own_ports(graph, id), ...ports_of(graph, b.type)];
}

/** The ports a block holds itself. */
function own_ports(graph: Graph, id: Id): Worn[] {
  return (graph.blocks[id]?.ports ?? []).map((p) => ({ ...p, holder: id }));
}

/** The port an id as drawn names — `block/port` — and the block it is drawn on. */
export function port_at(graph: Graph, id: Id | undefined): (Worn & { on: Id }) | undefined {
  const at = id ? id.lastIndexOf(PART) : -1;
  if (!id || at < 0) return undefined;
  const on = id.slice(0, at);
  const port = ports_on(graph, on).find((p) => p.id === id.slice(at + PART.length));
  return port ? { ...port, on } : undefined;
}

/** Which way an interface carries: in, out, or both, which is what unsaid reads. */
export function flow_of(graph: Graph, id: Id): Flow {
  return port_at(graph, id)?.flow ?? "both";
}

/** Whether a block is a reference: a usage whose chain carries *is reference*, which runs the
 *  `reference` module. **Its kind decides it, never `of`.** */
export function is_reference(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  /** A plain block stores no type, so it is never one. */
  return !!b?.type && !b.def && module_of(graph, id) === "reference";
}

/** What a reference points at, as it stores it: `of`, read only where the block is one. */
export function of_ref(graph: Graph, id: Id): Id | undefined {
  return is_reference(graph, id) ? graph.blocks[id]!.of : undefined;
}

/** A block holding blocks draws as a container. */
export function is_container(graph: Graph, id: Id): boolean {
  return (held_by(graph).get(id) ?? []).some((b) => !is_interface(graph, b.id));
}

/** What a reference stands for, followed to the end. */
export function stands_for(graph: Graph, id: Id): Block | null {
  let b: Block | undefined = graph.blocks[id];
  const seen = new Set<Id>();
  for (let of = b && of_ref(graph, b.id); b && of && !seen.has(b.id);
       of = b && of_ref(graph, b.id)) {
    seen.add(b.id);
    b = graph.blocks[of];
  }
  return b ?? null;
}

/** What a card draws as: the block it previews — what a reference stands for, else itself — the
 *  definition a reference stands in for, and whether a reference names nothing there. */
export type Resolved = { card: Id; stands_in?: Definition; missing: boolean };

/** What a card draws as, a reference resolved: decided by *is reference*, never by `of`. */
export function resolved(graph: Graph, id: Id): Resolved {
  if (!is_reference(graph, id)) return { card: id, missing: false };
  const target = stands_for(graph, id);
  if (!target || target.id === id) return { card: id, missing: true };
  const def = def_at(graph, of_ref(graph, id));
  return { card: target.id, ...(def ? { stands_in: def } : {}), missing: false };
}

/** **One object**: the block an appearance is — a stand-in's target, followed to the end, else
 *  the block itself. Naming, describing and retyping act on it. */
export function object_of(graph: Graph, id: Id): Id {
  return of_ref(graph, id) ? stands_for(graph, id)?.id ?? id : id;
}

/** Every appearance of a block: the block itself and every stand-in for it, however deep. */
export function appearances_of(graph: Graph, id: Id): Id[] {
  const home = object_of(graph, id);
  if (!graph.blocks[home]) return [id];
  return [home, ...Object.values(graph.blocks)
    .filter((b) => b.id !== home && of_ref(graph, b.id) && object_of(graph, b.id) === home)
    .map((b) => b.id)];
}

/** **One highlight**: whether an appearance lights for the picks, made through the usage `route`.
 *  Every appearance of a picked block lights alike — itself, every stand-in — each by its route:
 *  one seen through a usage (`via`) lights only where the picks were made through that usage. */
export function lit(graph: Graph, picks: readonly Id[], route: Id | null, id: Id,
                    via?: Id): boolean {
  if (via && via !== route) return false;
  const home = object_of(graph, id);
  return picks.some((p) => object_of(graph, p) === home);
}

/** One hop: from a block to another, by the names said across it. */
export type Hop = { from: Id; to: Id; names: string[] };

/** **A block's one hop each way** (2026-11-04): what reaches it and what it reaches, a hop each
 *  way — the lines with one end in it (at any depth) and the other outside, ties and a
 *  behaviour's own messages aside, and every behaviour's steps into or out of it (`path_of`) —
 *  one hop a pair and way, its names gathered. Empty where nothing joins it. */
export function hops_of(graph: Graph, id: Id): Hop[] {
  if (!graph.blocks[id]) return [];
  const inside = new Set(subtree(graph, id));
  const out: Hop[] = [];
  for (const s of joins(graph)) {
    const [a, b] = [inside.has(s.from), inside.has(s.to)];
    if (a === b) continue;
    const [from, to] = [a ? id : s.from, b ? id : s.to];
    const had = out.find((h) => h.from === from && h.to === to);
    if (!had) out.push({ from, to, names: s.name ? [s.name] : [] });
    else if (s.name && !had.names.includes(s.name)) had.names.push(s.name);
  }
  return out;
}

/** **What a block reaches a hop each way on a layer**: the blocks drawn there at the far end of
 *  its hops, each lifted to the block drawn holding it, and the layer's lines between it and them.
 *  The block itself lights too. Empty where nothing joins it there. */
export function reached(graph: Graph, id: Id, layer: Id | null): { blocks: Id[]; lines: Id[] } {
  const drawn = new Set(drawn_in(graph, layer).map((b) => b.id));
  const lift = (at: Id | null): Id | null => {
    for (let x = at; x; x = graph.blocks[x]?.parent ?? null) if (drawn.has(x)) return x;
    return null;
  };
  const far = new Set(hops_of(graph, id).map((h) => lift(h.from === id ? h.to : h.from))
    .filter((x): x is Id => !!x && x !== id));
  if (!far.size) return { blocks: [], lines: [] };
  const lines = edges_in(graph, layer).filter((e) => {
    const [a, b] = [lift(owner_of(graph, e.from)), lift(owner_of(graph, e.to))];
    return (a === id && !!b && far.has(b)) || (b === id && !!a && far.has(a));
  }).map((e) => e.id);
  return { blocks: [id, ...far], lines };
}

/** Every join in the graph, worked out once until the graph is written (`kept`): its lines,
 *  owner to owner, but ties and those inside a behaviour; and every behaviour's path steps.
 *  **A line to a holder's own port is followed through it** (2026-11-06): a part joined to its
 *  holder's port joins what that port's lines reach outside the holder, and nothing where none
 *  do — what holds it is already drawn round it. */
function joins(graph: Graph): { from: Id; to: Id; name: string }[] {
  return kept(graph, "joins", () => {
    const ways = Object.values(graph.blocks).filter((b) => is_behaviour(graph, b.id));
    const in_way = new Set(ways.flatMap((w) => subtree(graph, w.id)));
    const owners = [...new Set(ways.map((w) => behaviour_owner(graph, w.id))
      .filter((x): x is Id => !!x))];
    const lines = Object.values(graph.edges).filter((e) => e.type !== "tie")
      .map((e) => ({ a: `${e.from}:${e.fromPort ?? ""}`, b: `${e.to}:${e.toPort ?? ""}`,
                     from: owner_of(graph, e.from), to: owner_of(graph, e.to),
                     name: e.name ?? "" }))
      .filter((e) => !in_way.has(e.from) && !in_way.has(e.to));
    /** Each line by its ends, an end being a block and its port. */
    const at_end = new Map<string, (typeof lines)[number][]>();
    for (const l of lines) for (const k of [l.a, l.b]) at_end.set(k, [...at_end.get(k) ?? [], l]);
    /** What a holder's port reaches outside `holder`, up through as many holders as it takes; a
     *  line back inside it is the one followed in, or another part's. */
    const beyond = (end: string, holder: Id): { at: Id; name: string }[] =>
      (at_end.get(end) ?? []).flatMap((l) => {
        const [far, at] = l.a === end ? [l.b, l.to] : [l.a, l.from];
        if (at === holder || within(graph, at, holder)) return [];
        return within(graph, holder, at) ? beyond(far, at) : [{ at, name: l.name }];
      });
    /** A part's line to its holder's port goes through; one to the holder's bare edge stays. */
    const through = lines.flatMap((l) => {
      const [end, holder] = within(graph, l.from, l.to) ? [l.b, l.to]
        : within(graph, l.to, l.from) ? [l.a, l.from] : [null, null];
      if (!end || !holder || end === `${holder}:`) return [l];
      return beyond(end, holder).map((x) => holder === l.to
        ? { from: l.from, to: x.at, name: x.name || l.name }
        : { from: x.at, to: l.to, name: x.name || l.name });
    });
    return [...through.map(({ from, to, name }) => ({ from, to, name })),
            ...owners.flatMap((o) => path_of(graph, o))];
  });
}

/** Whether `id` sits inside `holder`, at any depth (never itself). */
function within(graph: Graph, id: Id, holder: Id): boolean {
  for (let x = graph.blocks[id]?.parent; x; x = graph.blocks[x]?.parent) {
    if (x === holder) return true;
  }
  return false;
}

/** **A block's behaviours as a path, in order**: each message between two steps, ordered by the
 *  row its receiving step sits in, from what the sending step stands for to what the receiving one
 *  does — never what heads its row, inside the behaviour — named as the message is. A step to
 *  itself is none. Empty with no behaviour. */
export function path_of(graph: Graph, id: Id): { from: Id; to: Id; name: string }[] {
  return behaviours_of(graph, id).flatMap((w) => {
    const steps = new Set(subtree(graph, w.id));
    const row = (step: Id) => region_of(graph, step)?.r ?? 0;
    return Object.values(graph.edges)
      .filter((e) => steps.has(e.from) && steps.has(e.to))
      .sort((a, b) => row(a.to) - row(b.to))
      .flatMap((e) => {
        const outside = (step: Id) => stands(graph, step).filter((b) => !steps.has(b));
        return outside(e.from).flatMap((from) => outside(e.to)
          .filter((to) => to !== from).map((to) => ({ from, to, name: e.name ?? "" })));
      });
  });
}

/** **Whose path a block shows**: its own, where its behaviours make one, or, for a behaviour, its
 *  owner's. Null where neither travels anywhere. */
export function path_owner(graph: Graph, id: Id): Id | null {
  const owner = is_behaviour(graph, id) ? behaviour_owner(graph, id) : id;
  return owner && path_of(graph, owner).length ? owner : null;
}

/** What a behaviour's step stands for: a reference's object, or what heads its lifeline. */
function stands(graph: Graph, step: Id): Id[] {
  return [...(of_ref(graph, step) ? [object_of(graph, step)] : []),
          ...allocations_of(graph, step).filter((b) => !is_holder(graph, b.id)).map((b) => b.id)];
}

/** The usage a block drawn on `layer` is seen through: the layer, where the block is its
 *  definition's rather than held under it. */
export function seen_through(graph: Graph, layer: Id | null, id: Id): Id | undefined {
  if (!layer || !graph.blocks[id]) return undefined;
  return path(graph, id).some((b) => b.id === layer) ? undefined : layer;
}

/** What a block touches outside itself: the far end of every line with one end in it, and every
 *  stand-in for it or for what it holds. A selection lights these wherever they are drawn. */
export function touches_of(graph: Graph, id: Id): Id[] {
  const within = (x: Id) => {
    for (let b = graph.blocks[x]; b; b = b.parent ? graph.blocks[b.parent] : undefined) {
      if (b.id === id) return true;
    }
    return false;
  };
  const out = new Set<Id>();
  for (const e of Object.values(graph.edges)) {
    const a = within(e.from), b = within(e.to);
    if (a !== b) out.add(a ? e.to : e.from);
  }
  for (const b of Object.values(graph.blocks)) {
    const of = of_ref(graph, b.id);
    if (of && within(of) && !within(b.id)) out.add(b.id);
  }
  return [...out];
}

/** The definition a stand-in stands for, where it stands for one: it draws as that definition's
 *  usages do. */
export function stood_def(graph: Graph, id: Id): Definition | undefined {
  const of = of_ref(graph, id);
  const at = of ? graph.blocks[of] : undefined;
  return at?.def ? (at as Definition) : undefined;
}

/** The number a new sibling takes: one past the last. */
export function next_order(graph: Graph, parent: Id | null): number {
  return children(graph, parent).reduce((n, b) => Math.max(n, b.order ?? 0), 0) + 1;
}

/** The sibling orders that change when `moved` goes before `before`, or last. */
export function reorder(graph: Graph, parent: Id | null, moved: Id | readonly Id[],
                        before?: Id | null): { id: Id; order: number }[] {
  /** Several arrive as one run, in the order given. */
  const run = Array.isArray(moved) ? [...moved] : [moved as Id];
  const rest = children(graph, parent).filter((b) => !run.includes(b.id)).map((b) => b.id);
  const at = before ? rest.indexOf(before) : -1;
  const order = at < 0 ? [...rest, ...run] : [...rest.slice(0, at), ...run, ...rest.slice(at)];
  return order
    .map((id, i) => ({ id, order: i + 1 }))
    .filter(({ id, order }) => (graph.blocks[id]?.order ?? 0) !== order);
}

/** What separates a usage from a part of its definition it reads through: `usage/part`. */
const PART = "/";

/** The id a part of a usage's definition — a block, or an interface — is drawn under on it. */
export function part_id(usage: Id, part: Id): Id {
  return `${usage}${PART}${part}`;
}

/** An end as drawn, read back: the block, and the part of its definition or port it names, if
 *  any. */
export function part_end(graph: Graph, id: Id): { block: Id; part?: Id } {
  const at = id.indexOf(PART);
  if (graph.blocks[id] || at < 0) return { block: id };
  return { block: id.slice(0, at), part: id.slice(at + PART.length) };
}

/** The block an id as drawn stands for: a part a usage reads through goes home to its
 *  definition's block, so an edit to it lands where it is held. */
export function stored_of(graph: Graph, id: Id): Id {
  const { part } = part_end(graph, id);
  return part && graph.blocks[part] ? part : id;
}

/** The block an end is drawn on: an interface's owner, or itself. */
export function owner_of(graph: Graph, id: Id): Id {
  const { block, part } = part_end(graph, id);
  if (part) return block;
  const b = graph.blocks[id];
  return b && is_interface(graph, b.id) && b.parent ? b.parent : id;
}

/** Relations with both ends drawn in this layer, in list order, then by id. */
export function edges_in(graph: Graph, layer: Id | null): Relation[] {
  const here = new Set(drawn_in(graph, layer).map((b) => b.id));
  const drawn = (id: Id) => here.has(owner_of(graph, id)) || (!!layer && owner_of(graph, id) === layer);
  return Object.values(graph.edges)
    .filter((e) => drawn(e.from) && drawn(e.to))
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id));
}

/** The layer drawing a line: from its `from` end up, the nearest that draws both its ends. */
export function line_layer(graph: Graph, id: Id): Id | null {
  const e = graph.edges[id];
  if (!e) return null;
  const ends = [owner_of(graph, e.from), owner_of(graph, e.to)];
  for (let at: Id | null = ends[0]!; at; at = layer_of(graph, at)) {
    const here = new Set(drawn_in(graph, at).map((b) => b.id));
    if (ends.every((x) => x === at || here.has(x))) return at;
  }
  return null;
}

/** How a layer places what it holds: as its diagram kind says. `auto` is what nobody said, and
 *  an arrangement this build does not know draws as `auto` too. */
export function placing_of(graph: Graph, layer: Id | null): Placing {
  const said = layer ? setting_of(graph, layer, "diagram")["placing"] : undefined;
  return PLACINGS.includes(said as Placing) ? said as Placing : "auto";
}
