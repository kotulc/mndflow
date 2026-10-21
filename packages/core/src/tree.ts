/** Where blocks sit: layers, children, order, and the relations drawn among them. */

import { isa, module_of, setting_of } from "./defs";
import { drawn_in } from "./holders";
import { LAYOUTS, type Block, type Definition, type Flow, type Graph, type Id, type Layout,
         type Port, type Relation } from "./types";
import { kept } from "./memo";


/** Every block under this one, itself included. */
export function subtree(graph: Graph, id: Id): Id[] {
  const out: Id[] = [id];
  for (let i = 0; i < out.length; i++) {
    const here = out[i]!;
    for (const b of Object.values(graph.blocks)) {
      if (b.parent === here) out.push(b.id);
    }
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

/** An end as drawn: the block, or the part of its definition it reads through. */
export function end_id(block: Id, part: Id | undefined): Id {
  return part ? part_id(block, part) : block;
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

/** Relations with both ends drawn in this layer. */
export function edges_in(graph: Graph, layer: Id | null): Relation[] {
  const here = new Set(drawn_in(graph, layer).map((b) => b.id));
  const drawn = (id: Id) => here.has(owner_of(graph, id)) || (!!layer && owner_of(graph, id) === layer);
  return Object.values(graph.edges)
    .filter((e) => drawn(e.from) && drawn(e.to))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** How a layer lays out: its own word, else its definition's. `auto` is what nobody said, and a
 *  kind this build does not know draws as `auto` too. */
export function layout_of(graph: Graph, layer: Id | null): Layout {
  const kind = layer ? setting_of(graph, layer, "layout")["kind"] : undefined;
  if (kind === undefined) return "auto";
  return LAYOUTS.includes(kind as Layout) ? kind as Layout : "auto";
}

/** Layouts worked out from what a layer holds, never by hand: a drag on one is refused, so the
 *  layout a diagram kind fixes is kept. */
const WORKED: readonly Layout[] = ["layered", "treemap"];

/** Whether a layer's layout refuses a card moved by hand. */
export function is_worked(graph: Graph, layer: Id | null): boolean {
  return WORKED.includes(layout_of(graph, layer));
}
