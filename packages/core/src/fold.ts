/** Mutation replay, and the derived readings of a graph. */

import { DRAWN, type Settings } from "./components";
import { default_id } from "./ids";
import { BLOCK_MODULES, RELATION_MODULES, empty_graph,
         type Arrangement, type Block, type BlockModule, type Cell,
         type Definition, type FieldDef, type Graph, type HeaderRole, type Id, type Log, type Mutation,
         type Relation, type RelationModule, type Span, type Step } from "./types";

/** A group whose last member just left is deleted, and so is a holder that empties. */
function emptied(graph: Graph, id: Id | undefined): void {
  const g = id ? graph.blocks[id] : undefined;
  if (!g || !is_group(graph, g.id) || members_of(graph, g.id).length) return;
  delete graph.blocks[g.id];
  for (const [eid, e] of Object.entries(graph.edges)) {
    if (e.from === g.id || e.to === g.id) drop_edge(graph, eid);
  }
  emptied(graph, g.group);
}

/** A relation gone, and every tie that ended on it with it. */
function drop_edge(graph: Graph, id: Id): void {
  if (!graph.edges[id]) return;
  delete graph.edges[id];
  for (const [eid, e] of Object.entries(graph.edges)) {
    if (e.from === id || e.to === id) drop_edge(graph, eid);
  }
}

/** Replay one mutation onto a graph, in place. */
function apply(graph: Graph, m: Mutation): void {
  switch (m.op) {
    case "checkpoint":
      graph.root = m.graph.root;
      graph.blocks = structuredClone(m.graph.blocks);
      graph.edges = structuredClone(m.graph.edges);
      graph.defs = structuredClone(m.graph.defs);
      return;
    case "add_block":
      graph.blocks[m.block.id] = { ...m.block };
      return;
    case "update_block": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.name !== undefined) b.name = m.name;
      if (m.type === null) delete b.type;
      else if (m.type !== undefined) b.type = m.type;
      return;
    }
    case "delete_block": {
      const holder = graph.blocks[m.id]?.group;
      for (const id of subtree(graph, m.id)) {
        delete graph.blocks[id];
        for (const [eid, e] of Object.entries(graph.edges)) {
          if (e.from === id || e.to === id) drop_edge(graph, eid);
        }
      }
      /** A deleted group frees its members. */
      for (const b of Object.values(graph.blocks)) {
        if (b.group === m.id) { delete b.group; delete b.cell; }
      }
      emptied(graph, holder);
      return;
    }
    case "move_block": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** Leaving a layer drops the block's place and group there. */
      const holder = b.group;
      if (b.parent !== m.parent) {
        delete b.x; delete b.y; delete b.group; delete b.cell;
      }
      b.parent = m.parent;
      if (holder !== b.group) emptied(graph, holder);
      return;
    }
    case "order_block": {
      const b = graph.blocks[m.id];
      if (b) b.order = m.order;
      return;
    }
    case "set_alias": {
      const held = graph.blocks[m.id] ?? graph.edges[m.id];
      if (held) held.alias = m.alias;
      return;
    }
    /** Counters live on the workspace and only ever rise. */
    case "set_counter": {
      const ws = graph.blocks[graph.root];
      if (ws) ws.counters = { ...(ws.counters ?? {}), [m.kind]: m.n };
      return;
    }
    case "set_pinned": {
      const ws = graph.blocks[graph.root];
      if (!ws) return;
      /** Deduplicated, in order, and dropped when empty. */
      const kept = [...new Set(m.ids.filter(Boolean))];
      if (kept.length) ws.pinned = kept; else delete ws.pinned;
      return;
    }
    case "place_block": {
      const b = graph.blocks[m.id];
      if (b) { b.x = m.x; b.y = m.y; }
      return;
    }
    case "size_block": {
      const b = graph.blocks[m.id];
      if (b) { b.w = m.w; b.h = m.h; }
      return;
    }
    case "set_body": {
      const b = graph.blocks[m.id];
      if (b) b.body = m.body;
      return;
    }
    case "set_group": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** An address is the group's, so leaving one drops it. */
      const was = b.group;
      if (m.group === null) { delete b.group; delete b.cell; delete b.header; }
      else {
        if (b.group !== m.group) { delete b.cell; delete b.header; }
        b.group = m.group;
      }
      if (was !== b.group) emptied(graph, was);
      return;
    }
    case "seat_cell": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.cell === null) { delete b.cell; delete b.header; }
      else { b.cell = { ...m.cell }; }
      return;
    }
    case "set_header": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.header) b.header = true;
      else delete b.header;
      return;
    }
    case "set_grid": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.rows === null) delete b.rows;
      else if (m.rows !== undefined) b.rows = m.rows;
      if (m.cols === null) delete b.cols;
      else if (m.cols !== undefined) b.cols = m.cols;
      if (m.rows === null && m.cols === null) delete b.merges;
      return;
    }
    case "merge_cells": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** A merge replaces any merge it overlaps. */
      b.merges = [...(b.merges ?? []).filter((s) => !overlaps(s, m.span)), { ...m.span }];
      return;
    }
    case "split_cells": {
      const b = graph.blocks[m.id];
      if (b?.merges) b.merges = b.merges.filter((s) => !covers(s, m.r, m.c));
      return;
    }
    case "link_blocks":
      graph.edges[m.edge.id] = { ...m.edge };
      return;
    case "update_edge": {
      const e = graph.edges[m.id];
      if (!e) return;
      /** Null clears the type. */
      if (m.type === null) delete e.type;
      else e.type = m.type;
      return;
    }
    case "delete_edge":
      drop_edge(graph, m.id);
      return;
    case "set_dir": {
      const e = graph.edges[m.id];
      if (e) e.dir = m.dir;
      return;
    }
    case "set_form": {
      const e = graph.edges[m.id];
      if (e) e.module = m.module;
      return;
    }
    case "flip_edge": {
      const e = graph.edges[m.id];
      if (!e) return;
      [e.from, e.to] = [e.to, e.from];
      [e.fromSide, e.toSide] = [e.toSide, e.fromSide];
      return;
    }
    case "set_end": {
      const e = graph.edges[m.id];
      if (e) e[m.end] = m.port;
      return;
    }
    case "set_port": {
      const b = graph.blocks[m.id];
      if (b) { b.side = m.side; b.at = m.at; }
      return;
    }
    case "set_side": {
      const e = graph.edges[m.id];
      if (!e) return;
      const key = m.end === "from" ? "fromSide" : "toSide";
      if (m.side === null) delete e[key];
      else e[key] = m.side;
      return;
    }
    case "mark_port": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.flow === null) delete b.flow;
      else b.flow = m.flow;
      return;
    }
    /** Set in place where the field exists, else appended. */
    case "set_field": {
      const b = graph.blocks[m.id];
      if (!b) return;
      const had = (b.fields ?? []).some((f) => f.name === m.field.name);
      b.fields = had
        ? b.fields!.map((f) => (f.name === m.field.name ? { ...m.field } : f))
        : [...(b.fields ?? []), { ...m.field }];
      return;
    }
    case "drop_field": {
      const b = graph.blocks[m.id];
      if (b?.fields) b.fields = b.fields.filter((f) => f.name !== m.name);
      return;
    }
    case "order_fields": {
      const b = graph.blocks[m.id];
      if (b?.fields) b.fields = ordered_by(b.fields, m.names);
      return;
    }
    case "set_def":
      graph.defs[m.def.id] = { ...m.def };
      return;
    case "drop_def":
      delete graph.defs[m.id];
      return;
    case "set_tags": {
      const b = graph.blocks[m.id] ?? graph.edges[m.id];
      if (!b) return;
      /** Trimmed, deduplicated and in the order they were given. */
      const kept = [...new Set(m.tags.map((t) => t.trim()).filter(Boolean))];
      if (kept.length) b.tags = kept; else delete b.tags;
      return;
    }
    /** Gives back the drawing looks of whichever holder the id names. */
    case "drop_looks": {
      const it = graph.blocks[m.id] ?? graph.edges[m.id];
      if (!it?.looks) return;
      const looks = { ...it.looks };
      for (const key of DRAWN) delete looks[key];
      if (Object.keys(looks).length) it.looks = looks; else delete it.looks;
      return;
    }
    case "set_look": {
      const it = graph.blocks[m.id] ?? graph.edges[m.id];
      if (!it) return;
      const held = { ...(it.looks?.[m.key] ?? {}) };
      if (m.value === null || m.value === undefined) delete held[m.name];
      else held[m.name] = m.value;
      const looks = { ...(it.looks ?? {}) };
      if (Object.keys(held).length) looks[m.key] = held; else delete looks[m.key];
      if (Object.keys(looks).length) it.looks = looks; else delete it.looks;
      return;
    }
    case "set_arrangement": {
      const b = graph.blocks[m.layer];
      if (b) b.arrangement = m.arrangement;
      return;
    }
  }
}

/** Rebuild the graph by replaying every applied step over the floor. */
export function fold(log: Log, floor: Graph["defs"] = {}): Graph {
  const graph = empty_graph();
  lay(graph, floor);
  for (const step of log) {
    if (step.status !== "applied") continue;
    for (const m of step.mutations) {
      apply(graph, m);
      /** A checkpoint replaces the floor too, so it is laid again. */
      if (m.op === "checkpoint") lay(graph, floor);
    }
  }
  lay_defaults(graph, floor);
  return graph;
}

/** The shipped package, over whatever is there. */
function lay(graph: Graph, floor: Graph["defs"]): void {
  for (const [id, def] of Object.entries(floor)) graph.defs[id] = def;
}

/** Lays an unfiled default for every base kind that has none. */
function lay_defaults(graph: Graph, floor: Graph["defs"]): void {
  for (const base of Object.values(floor)) {
    const kind = base_kind(base);
    if (!kind || default_for(graph, kind, base.group)) continue;
    const id = default_id(kind, base.group);
    graph.defs[id] = { id, group: base.group, name: kind, extends: base.id, default: kind };
  }
}

/** The kind a shipped base is the root of, or null. */
function base_kind(d: Definition): BlockModule | RelationModule | null {
  const said = d.components?.[d.group === "relation" ? "relation" : "block"]?.["module"];
  return said === d.id ? (said as BlockModule | RelationModule) : null;
}


/** Whether two spans cover any cell in common. */
export function overlaps(a: Span, b: Span): boolean {
  return a.r < b.r + b.rows && b.r < a.r + a.rows
      && a.c < b.c + b.cols && b.c < a.c + a.cols;
}


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

/** A null layer is the root layer. */
export function layer_id(graph: Graph, layer: Id | null): Id {
  return layer ?? graph.root;
}

/** The direct children of a layer, in a stable order. */
export function children(graph: Graph, layer: Id | null): Block[] {
  const here = layer_id(graph, layer);
  return Object.values(graph.blocks)
    .filter((b) => b.parent === here)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
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

export function is_interface(b: Block): boolean {
  return b.side !== undefined;
}

export function is_reference(b: Block): boolean {
  return b.of !== undefined;
}

/** A block holding blocks draws as a container. */
export function is_container(graph: Graph, id: Id): boolean {
  return Object.values(graph.blocks).some((b) => b.parent === id && !is_interface(b));
}

/** A block no other block contains. */
export function is_top_block(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b && b.parent === graph.root;
}

/** What a reference stands for, followed to the end. */
export function stands_for(graph: Graph, id: Id): Block | null {
  let b: Block | undefined = graph.blocks[id];
  const seen = new Set<Id>();
  while (b?.of && !seen.has(b.id)) {
    seen.add(b.id);
    b = graph.blocks[b.of];
  }
  return b ?? null;
}

function fallback(graph: Graph, b: Block): string {
  /** A boundary reads its kind word, which is blank. */
  return kind_word(graph, b);
}

/** The word each kind reads as when nothing is named; a boundary has none. */
const WORD: Record<BlockModule, string> = {
  block: "Block", folder: "Folder", resource: "Resource",
  interface: "Interface", reference: "Reference", group: "", grid: "", note: "Note",
};

export function kind_word(graph: Graph, b: Block): string {
  const def = b.type ? graph.defs[b.type] : undefined;
  if (def && !BLOCK_MODULES.includes(def.name as BlockModule)) {
    return def.name.charAt(0).toUpperCase() + def.name.slice(1);
  }
  return WORD[module_of(graph, b.id)];
}

/** Which letter each kind's handles run under. */
export const ALIAS_LETTER: Record<string, string> = {
  block: "B", folder: "F", resource: "E", interface: "I", reference: "R",
  group: "G", grid: "D", note: "N", relation: "L",
};

/** Which counter an element draws its handle from. */
export function alias_kind(graph: Graph, id: Id): string {
  return graph.edges[id] ? "relation" : module_of(graph, id);
}

/** An element's handle while it is unnamed, or always when asked. */
export function alias_of(graph: Graph, id: Id, always = false): string {
  const held = graph.blocks[id] ?? graph.edges[id];
  if (!held || held.alias === undefined) return "";
  /** A line counts as named by its type. */
  const named = graph.edges[id] ? !!graph.edges[id]!.type : is_named(graph, id);
  if (!always && named) return "";
  return alias_name(alias_kind(graph, id), held.alias);
}

/** A serial as a mark: `B1`, `I4`, `L12`. */
export function alias_name(kind: string, n: number): string {
  return `${ALIAS_LETTER[kind] ?? "B"}${n}`;
}

/** The serial the next element of this kind takes. */
export function next_alias(graph: Graph, kind: string): number {
  return (graph.blocks[graph.root]?.counters?.[kind] ?? 0) + 1;
}

/** Whether somebody named this block, as against the tag it wears until they do. */
export function is_named(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  if (!b) return false;
  const target = b.of ? stands_for(graph, id) : b;
  if (!target) return false;
  /** Only the name counts, never the body. */
  return !!target.name?.trim();
}

/** What a thing is called, and only that. */
export function shown_name(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  if (!b) return graph.edges[id] ? named_edge(graph, id) : "missing";
  if (b.of) {
    const target = stands_for(graph, id);
    if (!target || target.id === b.id) return "missing";
    return named(graph, target);
  }
  return named(graph, b);
}

function named(graph: Graph, b: Block): string {
  const name = b.name?.trim();
  return name || fallback(graph, b);
}

/** A relationship reads its label, or its module. */
function named_edge(graph: Graph, id: Id): string {
  return label_of(graph, id) || graph.edges[id]!.module;
}

/** What a line draws beside itself: the label of the definition it follows, or nothing. */
export function label_of(graph: Graph, id: Id): string {
  const d = graph.defs[id] ?? graph.defs[def_of(graph, id) ?? ""];
  return d?.label ?? "";
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

/** The block an end is drawn on: an interface's owner, or itself. */
export function owner_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  return b && is_interface(b) && b.parent ? b.parent : id;
}

/** Relations with both ends drawn in this layer. */
export function edges_in(graph: Graph, layer: Id | null): Relation[] {
  const here = new Set(children(graph, layer).map((b) => b.id));
  const room = layer_id(graph, layer);
  const drawn = (id: Id) => here.has(owner_of(graph, id)) || owner_of(graph, id) === room;
  const lines = Object.values(graph.edges).filter((e) => drawn(e.from) && drawn(e.to));
  /** Ties on those lines are drawn with them. */
  const shown = new Set(lines.map((e) => e.id));
  const ties = Object.values(graph.edges).filter((e) =>
    (shown.has(e.to) && drawn(e.from)) || (shown.has(e.from) && drawn(e.to)));
  return [...lines, ...ties].sort((a, b) => a.id.localeCompare(b.id));
}

/** Whether these ends make a tie between a note and a line. */
export function may_tie(graph: Graph, from: Id, to: Id): boolean {
  const line = (id: Id) => {
    const e = graph.edges[id];
    return !!e && !graph.edges[e.from] && !graph.edges[e.to];
  };
  const note = (id: Id) => !!graph.blocks[id] && module_of(graph, id) === "note";
  return (line(from) && note(to)) || (line(to) && note(from));
}

/** What a relation between these ends is: a tie where an end is a note or a line, a line otherwise. */
export function derived_module(graph: Graph, from: Id, to: Id): RelationModule {
  const noted = (id: Id) => !!graph.blocks[id] && module_of(graph, id) === "note";
  return may_tie(graph, from, to) || noted(from) || noted(to) ? "tie" : "line";
}

/** The layer's arrangement. `free` is what a layer says nothing about. */
export function arrangement_of(graph: Graph, layer: Id | null): Arrangement {
  return graph.blocks[layer_id(graph, layer)]?.arrangement ?? "free";
}

/** Whether a block is a grid — a region with an extent and cells to seat in. */
export function is_grid(graph: Graph, id: Id): boolean {
  return module_of(graph, id) === "grid";
}

/** Whether a block is a boundary — a dashed rim round its members. */
export function is_group(graph: Graph, id: Id): boolean {
  return module_of(graph, id) === "group";
}

/** Whether a block holds others, either way. */
export function is_holder(graph: Graph, id: Id): boolean {
  const m = module_of(graph, id);
  return m === "grid" || m === "group";
}

/** The group a block sits in, or null. */
export function grid_of(graph: Graph, id: Id): Block | null {
  const held = graph.blocks[id]?.group;
  return (held ? graph.blocks[held] : undefined) ?? null;
}

/** Where a block sits in its group, or null. */
export function cell_of(graph: Graph, id: Id): Cell | null {
  const b = graph.blocks[id];
  return b?.group && b.cell ? { ...b.cell } : null;
}

/** How many groups enclose a block — zero for one sitting on the layer. */
export function group_depth(graph: Graph, id: Id): number {
  let depth = 0;
  let at = graph.blocks[id]?.group;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    depth++;
    at = graph.blocks[at]?.group;
  }
  return depth;
}

/** Everything a group holds, in the layer's stable order. */
export function members_of(graph: Graph, group: Id): Block[] {
  return Object.values(graph.blocks)
    .filter((b) => b.group === group)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
}

/** Whether `holder` may contain `id` — not itself and not a cycle. */
export function can_hold(graph: Graph, holder: Id, id: Id,
                        held?: ReadonlyMap<Id, Id | undefined>): boolean {
  const g = graph.blocks[holder];
  if (!g || !is_holder(graph, holder)) return false;
  if (holder === id) return false;
  if (is_grid(graph, holder) && is_holder(graph, id)) return false;
  const map = held ?? new Map(Object.values(graph.blocks).map((b) => [b.id, b.group]));
  let at: Id | undefined = holder;
  const seen = new Set<Id>();
  while (at) {
    if (at === id) return false;
    if (seen.has(at)) break;
    seen.add(at);
    at = map.get(at);
  }
  return true;
}

/** The span covering this address, or null. */
export function merge_at(graph: Graph, group: Id, r: number, c: number): Span | null {
  return graph.blocks[group]?.merges?.find((s) => covers(s, r, c)) ?? null;
}

/** What sits at this address; a merge answers at every address it covers. */
export function at_cell(graph: Graph, group: Id, r: number, c: number): Block | null {
  const span = merge_at(graph, group, r, c);
  const want = span ? { r: span.r, c: span.c } : { r, c };
  return members_of(graph, group)
    .find((b) => b.cell?.r === want.r && b.cell?.c === want.c) ?? null;
}

/** Whether a span covers this address. */
export function covers(s: Span, r: number, c: number): boolean {
  return r >= s.r && r < s.r + s.rows && c >= s.c && c < s.c + s.cols;
}

/** Whether a block heads the line it sits in, and so fills its cell. */
export function is_header(b: Block): boolean {
  return !!b.header;
}

/** Which line a seated block's position puts it in charge of, whether or not it is a header. */
export function would_head(graph: Graph, id: Id): HeaderRole | null {
  const at = region_of(graph, id);
  if (!at) return null;
  if (at.r === 0) return at.c === 0 ? "both" : "col";
  return "row";
}

/** Which line this block heads, or null where it heads none. */
export function head_of(graph: Graph, id: Id): HeaderRole | null {
  return graph.blocks[id]?.header ? would_head(graph, id) : null;
}

/** Whether this block heads rows, or columns. */
export function heads(graph: Graph, id: Id, way: "row" | "col"): boolean {
  const role = head_of(graph, id);
  return role === way || role === "both";
}

/** The region a seated block occupies: the merge covering its address, or the one cell it sits in. */
export function region_of(graph: Graph, id: Id): Span | null {
  const b = graph.blocks[id];
  if (!b?.group || !b.cell) return null;
  return merge_at(graph, b.group, b.cell.r, b.cell.c) ?? { ...b.cell, rows: 1, cols: 1 };
}

/** Whether two runs along one axis share any line. */
function along(a: number, an: number, b: number, bn: number): boolean {
  return a < b + bn && b < a + an;
}

/** The headers a block is allocated to: the block heading its row, the one heading its column, or
 *  both. */
export function allocations_of(graph: Graph, id: Id): Block[] {
  const me = region_of(graph, id);
  const group = graph.blocks[id]?.group;
  if (!me || !group) return [];
  const out: Block[] = [];
  for (const h of members_of(graph, group)) {
    if (h.id === id || !h.header) continue;
    const at = region_of(graph, h.id);
    if (!at) continue;
    const row = heads(graph, h.id, "row")
             && along(me.r, me.rows, at.r, at.rows) && me.c >= at.c;
    /** Symmetric; column headers always sit in row 0. */
    const col = heads(graph, h.id, "col")
             && along(me.c, me.cols, at.c, at.cols) && me.r >= at.r;
    if (row || col) out.push(h);
  }
  return out;
}

/** Everything allocated to this header. */
export function allocated_to(graph: Graph, id: Id): Block[] {
  const group = graph.blocks[id]?.group;
  if (!group || !graph.blocks[id]?.header) return [];
  return members_of(graph, group)
    .filter((b) => b.id !== id && allocations_of(graph, b.id).some((h) => h.id === id));
}



/** A definition and the chain it extends, nearest first. */
export function isa(graph: Graph, type: Id | undefined): Definition[] {
  const out: Definition[] = [];
  let at = type;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    const d = graph.defs[at];
    if (!d) break;
    out.push(d);
    at = d.extends;
  }
  return out;
}

/** What one component reads for a usage of this definition: the chain, laid down base first, one
 *  property at a time. */
export function config_of(graph: Graph, type: Id | undefined, key: string): Settings {
  const out: Settings = {};
  for (const d of isa(graph, type).reverse()) Object.assign(out, d.components?.[key]);
  return out;
}

/** A field list put in the order these names give. */
export function ordered_by<T extends { name: string }>(fields: readonly T[],
                                                         names: readonly string[]): T[] {
  const named = names.map((n) => fields.find((f) => f.name === n)).filter((f): f is T => !!f);
  return [...named, ...fields.filter((f) => !names.includes(f.name))];
}

/** A definition's field schema down its chain, nearer fields replacing farther ones. */
export function schema_of(graph: Graph, type: Id | undefined): (FieldDef & { from: Id })[] {
  const out: (FieldDef & { from: Id })[] = [];
  for (const d of isa(graph, type).reverse()) {
    for (const f of d.fields ?? []) {
      const at = out.findIndex((x) => x.name === f.name);
      if (at < 0) out.push({ ...f, from: d.id });
      else out[at] = { ...f, from: d.id };
    }
  }
  return out;
}

/** Which block module interprets this block. */
export function module_of(graph: Graph, id: Id): BlockModule {
  const b = graph.blocks[id];
  if (!b) return "block";
  if (b.of) return "reference";
  if (b.side !== undefined) return "interface";
  return module_named(graph, b.type);
}

/** The kind a definition belongs to: the nearest link in its chain that says what kind it is. */
export function module_named(graph: Graph, type: Id | undefined): BlockModule {
  const named = config_of(graph, type, "block")["module"];
  if (typeof named === "string" && BLOCK_MODULES.includes(named as BlockModule)) {
    return named as BlockModule;
  }
  /** The type field can name the module directly. */
  if (type && BLOCK_MODULES.includes(type as BlockModule)) return type as BlockModule;
  return "block";
}

/** The definition a thing resolves through. */
export function def_of(graph: Graph, id: Id): Id | undefined {
  /** A shipped base resolves to its kind's default. */
  const named = (type: Id | undefined) =>
    type && !(graph.defs[type] && shipped(graph.defs[type]!)) ? type : undefined;
  const b = graph.blocks[id];
  if (b) {
    const kind = module_of(graph, id);
    return named(b.type) ?? default_for(graph, kind) ?? (graph.defs[kind] ? kind : undefined);
  }
  const e = graph.edges[id];
  if (!e) return undefined;
  return named(e.type) ?? default_for(graph, e.module, "relation")
    ?? (graph.defs[e.module] ? e.module : undefined);
}

/** What an element stores to name this definition. */
export function stored_type(graph: Graph, type: Id | undefined): Id | undefined {
  const d = type ? graph.defs[type] : undefined;
  if (!d || !(shipped(d) || d.default)) return type || undefined;
  if (d.group === "relation") return undefined;
  return plain_type(module_named(graph, type)) ?? undefined;
}

/** What a plain block of this kind stores as its type: nothing, or the kind. */
export function plain_type(kind: BlockModule): Id | null {
  return STRUCTURAL.includes(kind) ? null : kind;
}

/** Kinds an element's own shape says, so a plain one names nothing. */
const STRUCTURAL: readonly BlockModule[] = ["block", "reference", "interface"];

/** The workspace's default for a base kind: the one editable definition every plain element of that
 *  kind follows. */
export function default_for(graph: Graph, kind: BlockModule | RelationModule,
                            group: "block" | "relation" = "block"): Id | undefined {
  for (const d of Object.values(graph.defs)) {
    if (d.default === kind && !d.from && d.group === group) return d.id;
  }
  return undefined;
}

/** The relation definitions the base ships: one per relation module. */
export const BASE_RELATIONS: readonly string[] = ["line", "tie"];

/** What the shipped floor calls itself. */
export const BASE_PACKAGE = "base";

/** Whether this definition is one the app ships rather than one anybody wrote. */
export function shipped(d: Definition): boolean {
  return d.from === BASE_PACKAGE
    || (BLOCK_MODULES as readonly string[]).includes(d.id)
    || BASE_RELATIONS.includes(d.id);
}

/** Whether a definition is the workspace's to write out: not shipped, and not a default nobody has
 *  edited. */
export function touched(d: Definition): boolean {
  if (shipped(d)) return false;
  if (d.default === undefined) return true;
  return Object.keys(d).some((k) => !LAID.includes(k) && (d as Record<string, unknown>)[k] !== undefined);
}

/** The keys a default is laid with. */
const LAID = ["id", "group", "name", "extends", "default"];

/** One package's block definitions, as the vocabulary section lists them. */
export type Vocabulary = {
  /** The package these came from. Null is the workspace's own. */
  from: string | null;
  defs: Definition[];
};

/** The relation module a definition refines, down its chain. */
export function relation_named(graph: Graph, type: Id | undefined): RelationModule {
  const named = config_of(graph, type, "relation")["module"];
  return RELATION_MODULES.includes(named as RelationModule) ? named as RelationModule : "line";
}

/** Every relation definition except the shipped floor. */
export function relations(graph: Graph): Definition[] {
  return Object.values(graph.defs)
    .filter((d) => d.group === "relation" && !shipped(d))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A definition by what it is called. */
export function def_named(graph: Graph, name: string, group?: "block" | "relation"): Definition | undefined {
  const want = name.trim();
  if (!want) return undefined;
  /** The workspace's own first: one may share a name with a shipped kind. */
  const hits = Object.values(graph.defs)
    .filter((d) => d.name === want && (!group || d.group === group));
  return hits.find((d) => !d.from) ?? hits[0];
}

/** Pinned definitions of one group, in pin order. */
export function pinned_defs(graph: Graph, group: "block" | "relation"): Definition[] {
  const ws = graph.blocks[graph.root];
  return (ws?.pinned ?? [])
    .map((id) => graph.defs[id])
    .filter((d): d is Definition => !!d && d.group === group);
}

/** Block definitions grouped by package, the workspace's own first. */
export function vocabulary(graph: Graph): Vocabulary[] {
  const groups = new Map<string | null, Definition[]>();
  for (const d of Object.values(graph.defs)) {
    if (d.group !== "block") continue;
    const held = groups.get(d.from ?? null) ?? [];
    held.push(d);
    groups.set(d.from ?? null, held);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : a.localeCompare(b)))
    .map(([from, defs]) => ({ from,
                              defs: defs.sort((a, b) => a.name.localeCompare(b.name)) }));
}

/** Whether this block may be told to name that definition. */
export function may_retype(graph: Graph, id: Id, type: Id | undefined): boolean {
  return module_of(graph, id) === module_named(graph, type);
}

/** What a block is, as the one word every surface draws a mark for. */
export type Role = "block" | "container" | "folder" | "resource" | "reference"
                 | "interface" | "group" | "grid" | "note";

const MARKED: readonly string[] = ["folder", "resource", "reference", "interface", "group", "grid", "note"];

export function role_of(graph: Graph, id: Id): Role {
  const module = module_of(graph, id);
  if (MARKED.includes(module)) return module as Role;
  return is_container(graph, id) ? "container" : "block";
}

/** One step, applied. */
export function step(id: Id, action: string, at: number, mutations: Mutation[]): Step {
  return { id, action, at, status: "applied", mutations };
}
