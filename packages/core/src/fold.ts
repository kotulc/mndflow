/** Mutation replay, and the derived readings of a graph.
 *
 *  The graph is thrown away and rebuilt rather than edited, so it can never
 *  drift from the log that produced it — and undo is a refold, so no mutation
 *  needs an inverse. */

import type { Settings } from "./components";
import { BLOCK_MODULES, OPEN_MODULES, empty_graph,
         type Arrangement, type Block, type BlockModule, type Cell,
         type Definition, type Graph, type Id, type Log, type Mutation, type Relation,
         type Span, type Step } from "./types";

/** Replay one mutation onto a graph, in place. The graph is always a fresh one
 *  owned by `fold`, so mutating it here is safe and cheap. */
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
      if (m.label !== undefined) b.label = m.label;
      if (m.type !== undefined) b.type = m.type;
      return;
    }
    case "delete_block": {
      for (const id of subtree(graph, m.id)) {
        delete graph.blocks[id];
        for (const [eid, e] of Object.entries(graph.edges)) {
          if (e.from === id || e.to === id) delete graph.edges[eid];
        }
      }
      /** **A gone group frees what it held.** The address was the group's, so
       *  it goes with it and the block stays where it is on the layer. */
      for (const b of Object.values(graph.blocks)) {
        if (b.group === m.id) { delete b.group; delete b.cell; }
      }
      return;
    }
    case "move_block": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** **A group is the layer's, the way an address is the group's.** Where a
       *  block sits and which group holds it are both facts about the layer it
       *  was in, so leaving one drops them — carried across, a block kept
       *  membership of a grid that is not here, and a grid places its members
       *  by address, so the drawing had nowhere to put it and drew nothing at
       *  all while the tree went on listing it.
       *
       *  **Staying put keeps them**: a move that only reorders siblings is not
       *  a move out of anywhere, and it has no business shifting a card. */
      if (b.parent !== m.parent) {
        delete b.x; delete b.y; delete b.group; delete b.cell;
      }
      b.parent = m.parent;
      return;
    }
    case "order_block": {
      const b = graph.blocks[m.id];
      if (b) b.num = m.num;
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
      /** **An address is the group's.** Leaving one drops it rather than
       *  carrying it into the next, where it would mean somewhere else. */
      if (m.group === null) { delete b.group; delete b.cell; return; }
      if (b.group !== m.group) delete b.cell;
      b.group = m.group;
      return;
    }
    case "seat_cell": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.cell === null) delete b.cell;
      else b.cell = { ...m.cell };
      return;
    }
    case "set_grid": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.rows !== undefined) b.rows = m.rows;
      if (m.cols !== undefined) b.cols = m.cols;
      if (m.headers !== undefined) b.headers = m.headers;
      return;
    }
    case "merge_cells": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** A merge replaces whatever it covers: two spans over one cell leaves
       *  *what is this cell's extent* without an answer. */
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
      if (e) e.type = m.type;
      return;
    }
    case "delete_edge":
      delete graph.edges[m.id];
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
      const along = m.end === "from" ? "fromAt" : "toAt";
      if (m.side === null) { delete e[key]; delete e[along]; return; }
      e[key] = m.side;
      if (m.at === undefined) delete e[along];
      else e[along] = m.at;
      return;
    }
    case "mark_port": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.flow === null) delete b.flow;
      else b.flow = m.flow;
      return;
    }
    case "set_field": {
      const holder = graph.blocks[m.id] ?? graph.edges[m.id];
      if (!holder) return;
      const rest = (holder.fields ?? []).filter((f) => f.name !== m.field.name);
      holder.fields = [...rest, { ...m.field }];
      return;
    }
    case "drop_field": {
      const holder = graph.blocks[m.id] ?? graph.edges[m.id];
      if (holder?.fields) holder.fields = holder.fields.filter((f) => f.name !== m.name);
      return;
    }
    case "set_def":
      graph.defs[m.def.id] = { ...m.def };
      return;
    case "drop_def":
      delete graph.defs[m.id];
      return;
    case "set_labelled": {
      const b = graph.blocks[m.id];
      /** **Only the answer that is not the default is kept.** Absent means
       *  drawn, so turning it back on writes nothing to carry. */
      if (b) { if (m.labelled) delete b.labelled; else b.labelled = false; }
      return;
    }
    case "set_locked": {
      const b = graph.blocks[m.id];
      if (b) { if (m.locked) b.locked = true; else delete b.locked; }
      return;
    }
    case "set_tags": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** **Trimmed, deduplicated and in the order they were given.** A tag is a
       *  word, so two spellings of one whitespace apart are one tag. */
      const kept = [...new Set(m.tags.map((t) => t.trim()).filter(Boolean))];
      if (kept.length) b.tags = kept; else delete b.tags;
      return;
    }
    case "set_look": {
      const b = graph.blocks[m.id];
      if (!b) return;
      const held = { ...(b.looks?.[m.key] ?? {}) };
      if (m.value === null || m.value === undefined) delete held[m.name];
      else held[m.name] = m.value;
      const looks = { ...(b.looks ?? {}) };
      if (Object.keys(held).length) looks[m.key] = held; else delete looks[m.key];
      if (Object.keys(looks).length) b.looks = looks; else delete b.looks;
      return;
    }
    case "set_arrangement": {
      const b = graph.blocks[m.layer];
      if (b) b.arrangement = m.arrangement;
      return;
    }
  }
}

/** Rebuild the graph from empty by replaying every applied step in order. */
export function fold(log: Log): Graph {
  const graph = empty_graph();
  for (const step of log) {
    if (step.status !== "applied") continue;
    for (const m of step.mutations) apply(graph, m);
  }
  return graph;
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

/** **A null layer is the root layer.** One reading, everywhere: nothing else
 *  has `parent: null`, so taking it literally would hand back the root as its
 *  own child. */
export function layer_id(graph: Graph, layer: Id | null): Id {
  return layer ?? graph.root;
}

/** The direct children of a layer, in a stable order.
 *
 *  By `num` then id. **The number is where it sits**: it is given at the end
 *  of the list when a block is made and rewritten when somebody puts one
 *  somewhere else, so this reads as the order they were made until you move
 *  one. The id is the tie-break that keeps it deterministic when two carry the
 *  same number. */
export function children(graph: Graph, layer: Id | null): Block[] {
  const here = layer_id(graph, layer);
  return Object.values(graph.blocks)
    .filter((b) => b.parent === here)
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id));
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

/** A block holding blocks draws as a container. Derived, never declared. */
export function is_container(graph: Graph, id: Id): boolean {
  return Object.values(graph.blocks).some((b) => b.parent === id && !is_interface(b));
}

/** A block no other block contains.
 *
 *  Read from position and stored nowhere. There is no project type — a
 *  top-level block is informally a *project*, the way a block with children is
 *  informally a container. */
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
  /** **A boundary needs no name.** It says *these belong together*, and the
   *  band round them already says it — a word nobody chose is a caption on
   *  every group saying nothing. Named where somebody names one. */
  return kind_word(graph, b);
}

/** What a block is called when nobody has called it anything: **its type**.
 *
 *  A subtype names itself, so a *Valve* nobody named reads `Valve`. The seven
 *  base definitions are the module in other words, so they defer to it — a
 *  plain block reads `Block` rather than `Structure`. A boundary reads nothing:
 *  the band round its members already says what it is. */
const WORD: Record<BlockModule, string> = {
  block: "Block", folder: "Folder", resource: "Resource",
  interface: "Interface", reference: "Reference", group: "", note: "Note",
};

export function kind_word(graph: Graph, b: Block): string {
  const def = b.type ? graph.defs[b.type] : undefined;
  if (def && !BLOCK_MODULES.includes(def.name as BlockModule)) {
    return def.name.charAt(0).toUpperCase() + def.name.slice(1);
  }
  return WORD[module_of(graph, b.id)];
}

/** The mark a block wears beside its type while nobody has named it, so two
 *  things both reading `Block` can still be told apart. Empty once somebody has
 *  named it, and empty for anything that carries no alias.
 *
 *  **Never the id.** A tail of the id would be stable and unique and would read
 *  as the random string it is; the alias is handed out in order, so the marks
 *  in a workspace run `A1`, `A2`, `A3`. */
export function alias_of(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  if (!b || b.alias === undefined || is_named(graph, id)) return "";
  if (module_of(graph, id) === "group") return "";
  return alias_name(b.alias);
}

/** How many serials share a letter before it turns over. */
const PER_LETTER = 9;

/** A serial as a mark: `A1` to `A9`, `B1` to `Z9`, then `AA1`. Short enough to
 *  read at a glance, and ordered by when the block was made. */
export function alias_name(n: number): string {
  const num = (n % PER_LETTER) + 1;
  let rank = Math.floor(n / PER_LETTER);
  let letters = "";
  do {
    letters = String.fromCharCode(65 + (rank % 26)) + letters;
    rank = Math.floor(rank / 26) - 1;
  } while (rank >= 0);
  return `${letters}${num}`;
}

/** The serial the next block takes: one past the highest handed out.
 *
 *  **A high-water mark, not a count.** Counting hands out a serial a living
 *  block already wears as soon as anything in the middle has been deleted. */
export function next_alias(graph: Graph): number {
  let most = -1;
  for (const b of Object.values(graph.blocks)) {
    if (typeof b.alias === "number" && b.alias > most) most = b.alias;
  }
  return most + 1;
}

/** Whether somebody named this block, as against the tag it wears until they
 *  do. **Asked so a surface can draw the difference** — a placeholder that
 *  reads as loudly as a name is a name nobody chose. */
export function is_named(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  if (!b) return false;
  const target = b.of ? stands_for(graph, id) : b;
  if (!target) return false;
  if (target.label?.trim()) return true;
  return module_of(graph, target.id) === "note" && !!target.body?.trim();
}

/** The name to show.
 *
 *  A reference reads its target and a gone target reads *missing*. **A note is
 *  its text**, so it reads its body — there is nothing else on it to name.
 *  **Blank is not a name**: an empty label falls back like an absent one. */
export function shown_name(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  if (!b) return "missing";
  if (b.of) {
    const target = stands_for(graph, id);
    if (!target || target.id === b.id) return "missing";
    return named(graph, target);
  }
  return named(graph, b);
}

function named(graph: Graph, b: Block): string {
  const label = b.label?.trim();
  if (label) return label;
  const body = b.body?.trim();
  if (body && module_of(graph, b.id) === "note") return body;
  return fallback(graph, b);
}

/** The number a new sibling takes: one past the last.
 *
 *  **Appended, never inserted.** The lowest free number filled the gap a
 *  deleted sibling left, which put the newest block in the middle of a list
 *  whose whole meaning is the order things were added. */
export function next_num(graph: Graph, parent: Id | null): number {
  return children(graph, parent).reduce((n, b) => Math.max(n, b.num ?? 0), 0) + 1;
}

/** The siblings of a layer, renumbered so `moved` sits in front of `before` —
 *  or last, where nothing is named. **Only what actually shifts**: a move
 *  inside a list is one step, and every sibling saying its number again would
 *  bury what happened.
 *
 *  The block being moved may be arriving from another layer, so it is taken
 *  out of the list before it is put back. */
export function reorder(graph: Graph, parent: Id | null, moved: Id | readonly Id[],
                        before?: Id | null): { id: Id; num: number }[] {
  /** **Several arrive as one run**, in the order they were handed over — put in
   *  one at a time each would land in front of the last, and a selection
   *  dropped somewhere would arrive backwards. */
  const run = Array.isArray(moved) ? [...moved] : [moved as Id];
  const rest = children(graph, parent).filter((b) => !run.includes(b.id)).map((b) => b.id);
  const at = before ? rest.indexOf(before) : -1;
  const order = at < 0 ? [...rest, ...run] : [...rest.slice(0, at), ...run, ...rest.slice(at)];
  return order
    .map((id, i) => ({ id, num: i + 1 }))
    .filter(({ id, num }) => (graph.blocks[id]?.num ?? 0) !== num);
}

/** What an end is **drawn on**. An interface is drawn on its owner, and
 *  everything else on itself — so promoting a relationship's seat to an
 *  interface moves where the line lands without moving which layer it is in. */
export function owner_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  return b && is_interface(b) && b.parent ? b.parent : id;
}

/** Relations with both ends drawn in this layer.
 *
 *  An end seated on a child counts as that child. **The layer itself counts
 *  too**, and so does an interface of its own: seen from within, the layer is
 *  the frame around you, and a relationship reaching it is drawn meeting that
 *  frame. Left out, a block wired to the layer's own interface had a
 *  relationship that existed in the model and was drawn in no layer at all. */
export function edges_in(graph: Graph, layer: Id | null): Relation[] {
  const here = new Set(children(graph, layer).map((b) => b.id));
  const room = layer_id(graph, layer);
  const drawn = (id: Id) => here.has(owner_of(graph, id)) || owner_of(graph, id) === room;
  return Object.values(graph.edges)
    .filter((e) => drawn(e.from) && drawn(e.to))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The layer's arrangement. `free` is what a layer says nothing about. */
export function arrangement_of(graph: Graph, layer: Id | null): Arrangement {
  return graph.blocks[layer_id(graph, layer)]?.arrangement ?? "free";
}

/** Whether a group states an extent. **A group with neither is a boundary** —
 *  today's band, which takes its bounds from what it holds. */
export function is_grid(b: Block | undefined): boolean {
  return !!b && b.rows !== undefined && b.cols !== undefined;
}

/** The group a block sits in, or null. */
export function grid_of(graph: Graph, id: Id): Block | null {
  const held = graph.blocks[id]?.group;
  return (held ? graph.blocks[held] : undefined) ?? null;
}

/** Where in that group it sits. **An address with no group is nothing**, so
 *  both have to be there for either to mean anything. */
export function cell_of(graph: Graph, id: Id): Cell | null {
  const b = graph.blocks[id];
  return b?.group && b.cell ? { ...b.cell } : null;
}

/** Everything a group holds, in the layer's stable order. */
export function members_of(graph: Graph, group: Id): Block[] {
  return Object.values(graph.blocks)
    .filter((b) => b.group === group)
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id));
}

/** The span covering this address, or null. */
export function merge_at(graph: Graph, group: Id, r: number, c: number): Span | null {
  return graph.blocks[group]?.merges?.find((s) => covers(s, r, c)) ?? null;
}

/** What sits at this address. **A merged region is one cell**, so every address
 *  under a span answers with the block seated at its corner. */
export function at_cell(graph: Graph, group: Id, r: number, c: number): Block | null {
  const span = merge_at(graph, group, r, c);
  const want = span ? { r: span.r, c: span.c } : { r, c };
  return members_of(graph, group)
    .find((b) => b.cell?.r === want.r && b.cell?.c === want.c) ?? null;
}

/** Whether a span covers this address. Exported working, used by the readers
 *  above and by whoever draws a grid. */
export function covers(s: Span, r: number, c: number): boolean {
  return r >= s.r && r < s.r + s.rows && c >= s.c && c < s.c + s.cols;
}

/** Whether a group heads its rows, its columns, or both. */
function heads(b: Block | undefined, which: "row" | "col"): boolean {
  return b?.headers === which || b?.headers === "both";
}

/** The headers a block is **allocated to**: the block in its row's header cell,
 *  the one in its column's, or both.
 *
 *  **Derived from position and stored nowhere.** A block leaving the grid loses
 *  its allocation, which is correct — the allocation *was* the position.
 *  Durable classification is a field somebody typed. */
export function allocations_of(graph: Graph, id: Id): Block[] {
  const grid = grid_of(graph, id);
  const cell = cell_of(graph, id);
  if (!grid || !cell) return [];
  const out: Block[] = [];
  if (heads(grid, "row") && cell.c > 0) {
    const head = at_cell(graph, grid.id, cell.r, 0);
    if (head && head.id !== id) out.push(head);
  }
  if (heads(grid, "col") && cell.r > 0) {
    const head = at_cell(graph, grid.id, 0, cell.c);
    if (head && head.id !== id) out.push(head);
  }
  return out;
}

/** Everything allocated to this header — the row it heads, the column it heads,
 *  or both where it sits in the corner of a grid headed either way. */
export function allocated_to(graph: Graph, id: Id): Block[] {
  const grid = grid_of(graph, id);
  const cell = cell_of(graph, id);
  if (!grid || !cell) return [];
  const out: Block[] = [];
  for (const b of members_of(graph, grid.id)) {
    if (b.id === id || !b.cell) continue;
    if (allocations_of(graph, b.id).some((h) => h.id === id)) out.push(b);
  }
  return out;
}


/** Every definition this block may use: filed under any ancestor, nearest first. */
export function defs_in_scope(graph: Graph, id: Id): Definition[] {
  const homes = path(graph, id).map((b) => b.id).reverse();
  const out: Definition[] = [];
  for (const home of homes) {
    for (const d of Object.values(graph.defs)) {
      if (d.home === home) out.push(d);
    }
  }
  return out;
}

/** Resolve a definition by name from a block's ancestors — nearest wins. */
export function resolve_def(graph: Graph, from: Id, name: string): Definition | null {
  return defs_in_scope(graph, from).find((d) => d.name === name) ?? null;
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

/** What one component reads for a usage of this definition: **the chain, laid
 *  down base first, one property at a time.**
 *
 *  A cascade, and the same one everywhere: the root says what a whole kind of
 *  thing is like, each refinement says only what it changes, and the nearest
 *  has the last word. **Per property, not per key** — restating `card` to set
 *  a shape used to throw away the layout the base had set, so a subtype could
 *  not change one thing without restating everything it had inherited.
 *
 *  Order is stated and never inferred, which is why one parent is enough and
 *  there is no diamond to resolve: what comes later wins, and the chain is a
 *  list. What comes back is what the door let through, so nothing downstream
 *  guards for a shape this build cannot read. */
export function config_of(graph: Graph, type: Id | undefined, key: string): Settings {
  const out: Settings = {};
  for (const d of isa(graph, type).reverse()) Object.assign(out, d.components?.[key]);
  return out;
}

/** Which block module interprets this block.
 *
 *  `of` and `side` win because they are what the block *is* doing, whatever it
 *  names; otherwise the nearest definition in the chain that says. */
export function module_of(graph: Graph, id: Id): BlockModule {
  const b = graph.blocks[id];
  if (!b) return "block";
  if (b.of) return "reference";
  if (b.side !== undefined) return "interface";
  return module_named(graph, b.type);
}

/** The kind a definition belongs to: **the nearest link in its chain that says
 *  what kind it is.**
 *
 *  A subtype that says nothing inherits its parent's kind, which is what makes
 *  a chain of refinements safe — a *Valve* refining a block is still a block.
 *  Declaring one is how the base kinds are stated at all, and `note` is the
 *  proof it must stay possible: it extends `resource` for the way it draws and
 *  says its own kind on top of that.
 *
 *  **What stops a block changing kind is the gesture, not the chain** — see
 *  `may_retype`, which is where the rule anybody can feel is written. */
export function module_named(graph: Graph, type: Id | undefined): BlockModule {
  const named = config_of(graph, type, "block")["module"];
  return typeof named === "string" && BLOCK_MODULES.includes(named as BlockModule)
    ? named as BlockModule : "block";
}

/** The definition a thing resolves through.
 *
 *  **There is no such thing as an untyped block.** `block` is the base kind and
 *  a block that names nothing *is* one — the field being absent is how a file
 *  stays small, not a second sort of thing. Read as two, an ordinary block drew
 *  on neutral with a name layout while a block that said `block` out loud drew
 *  on primary with a type layout: the same thing, two ways, two looks.
 *
 *  So what is absent resolves to the definition its kind is named by, and every
 *  reader asks this rather than the field. A relationship answers the same way
 *  from its module. */
export function def_of(graph: Graph, id: Id): Id | undefined {
  const b = graph.blocks[id];
  if (b) {
    if (b.type) return b.type;
    const base = module_of(graph, id);
    return graph.defs[base] ? base : undefined;
  }
  const e = graph.edges[id];
  if (!e) return undefined;
  return e.type ?? (graph.defs[e.module] ? e.module : undefined);
}

/** Whether this block may be told to name that definition.
 *
 *  **A block, a folder and a resource are one family**: they differ in what
 *  they are for, and a gesture changing one to another has nothing to invent.
 *  Every other kind stays its own — a group has members, an interface a wall,
 *  a reference a target and a note its text, and none of those can be conjured
 *  by a change of type. Within a kind, any subtype of it will do. */
export function may_retype(graph: Graph, id: Id, type: Id | undefined): boolean {
  const now = module_of(graph, id);
  const next = module_named(graph, type);
  if (now === next) return true;
  return OPEN_MODULES.includes(now) && OPEN_MODULES.includes(next);
}

/** What a block is, as the one word every surface draws a mark for.
 *
 *  **The module, plus the one thing a module cannot say.** A structure block
 *  that holds a layer of its own is a container, which is a fact about what it
 *  holds rather than about what it is — and it is the difference a reader needs
 *  most, because it says whether there is anywhere to go. Behavior, resource
 *  and view have no mark of their own: what they are is said by the definition
 *  they name, and a second word for it would be one too many.
 *
 *  Asked here so the tree, the canvas and every other surface answer alike. */
export type Role = "block" | "container" | "folder" | "reference"
                 | "interface" | "group" | "note";

const MARKED: readonly string[] = ["folder", "reference", "interface", "group", "note"];

export function role_of(graph: Graph, id: Id): Role {
  const module = module_of(graph, id);
  if (MARKED.includes(module)) return module as Role;
  return is_container(graph, id) ? "container" : "block";
}

/** One step, applied. */
export function step(id: Id, action: string, at: number, mutations: Mutation[]): Step {
  return { id, action, at, status: "applied", mutations };
}
