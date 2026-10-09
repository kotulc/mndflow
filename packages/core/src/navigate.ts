/** Navigation: what opening, leaving and revealing do to the canvas, and what the explorer's
 *  sections hold for it. **One rule for every section and every host.**
 *
 *  A host cuts the workspace into sections (`sections.ts`); the canvas looks at one of them in
 *  one view. A layer view draws one block, and **the block says which** (`lenses_of`); `overhead`
 *  and `profile` draw the whole section — every root the section above lists — down to its cut,
 *  the pick brought into sight. */

import { holds_any } from "./capabilities";
import { attributes_of, def_of, frozen } from "./defs";
import { inline, is_grid, layer_of } from "./holders";
import { opens } from "./names";
import { at_cut, in_section, is_layer_view, type Section, type ViewKind } from "./sections";
import { is_interface, path, stood_def } from "./tree";
import { MAIN, type Graph, type Id } from "./types";

/** Where a host's sections start: the forest above every package, or the workspace's root. */
export type Top = "forest" | "workspace";

/** A host's sections, outermost first, and where the first one starts. */
export type Tiers = { top: Top; sections: readonly Section[] };

/** The views chosen per section, by its id; a section with none shows its first. */
export type Views = Readonly<Record<string, ViewKind>>;

/** What the canvas draws: the section it looks at, how, the layer — the block seen from inside,
 *  or the scope a whole section is drawn from — and what is picked on it. */
export type View = { at: number; kind: ViewKind; layer: Id | null; pick: Id | null };

/** What the sections hold for a view, outermost first, and which section is in focus. */
export type Held = { path: Id[]; at: number };

/** mndflow's sections: every package's domain, each a top row, and a tree's structure. */
export const EDITOR: Tiers = {
  top: "forest",
  sections: [
    { id: "definitions", label: "definitions", cut: "tree",
      views: ["overhead", "internal", "profile"] },
    { id: "structure", label: "structure", cut: null, views: ["internal", "overhead", "profile"] },
  ],
};


/** The layer views a block has something to draw in, the one it opens on first: a package, its
 *  definitions; a block with structure, from inside; one with attributes, as an entity; one that
 *  may hold and is editable, from inside, to be built; else what it extends and what uses it. */
export function lenses_of(graph: Graph, id: Id): ViewKind[] {
  const b = graph.blocks[id];
  if (!b) return [];
  if (b.parent === null) return ["definitions"];
  const built = is_interface(b) || is_grid(graph, id) || opens(graph, id);
  const room = holds_any(graph, id);
  const entity = attributes_of(graph, stood_def(graph, id)?.id ?? def_of(graph, id)).length > 0;
  const first: ViewKind = built ? "internal" : entity ? "entity"
    : room && !frozen(graph, id) ? "internal" : "lineage";
  const offered: ViewKind[] = [...(built || room ? ["internal" as const] : []),
                               ...(entity ? ["entity" as const] : []), "lineage"];
  return [first, ...offered.filter((k) => k !== first)];
}

/** The layer view a block opens on. */
export function lens_of(graph: Graph, id: Id): ViewKind {
  return lenses_of(graph, id)[0] ?? "internal";
}

/** The view a layer is drawn in as the place a block sits on it: a package's definitions, else
 *  from inside. */
function home_of(graph: Graph, layer: Id | null): ViewKind {
  return layer && graph.blocks[layer]?.parent === null ? "definitions" : "internal";
}


/** The way to a block through the sections: the root each section lists, and what each holds on
 *  the way — the block at its cut above this one, then this block wherever a section lists it. A
 *  block at a cut is held there and roots the next section. */
export function trace(graph: Graph, tiers: Tiers, id: Id): { roots: (Id | null)[]; held: Id[] } {
  const roots: (Id | null)[] = [tiers.top === "workspace" ? graph.root : null];
  const held: Id[] = [];
  if (!graph.blocks[id]) return { roots, held };
  const up = path(graph, id).map((b) => b.id);
  for (const [n, section] of tiers.sections.entries()) {
    const root = roots[n]!;
    if (!in_section(graph, id, root, section.cut)) {
      // Not listed here: held through the block at this section's cut above it, if any.
      const from = root === null ? 0 : up.indexOf(root) + 1;
      const anchor = from > 0 || root === null
        ? up.slice(from).find((a) => at_cut(graph, section.cut, a)) : undefined;
      if (!anchor) break;
      held.push(anchor);
      roots.push(anchor);
      continue;
    }
    held.push(id);
    if (id === root || !at_cut(graph, section.cut, id)) break;
    roots.push(id);
  }
  return { roots, held };
}

/** The view a section shows: the one chosen for it, else its first. */
export function view_of(tiers: Tiers, views: Views, at: number): ViewKind {
  const section = tiers.sections[at];
  const chosen = section ? views[section.id] : undefined;
  return chosen && section!.views.includes(chosen) ? chosen : section?.views[0] ?? "internal";
}

/** What a whole section is drawn from: the root of the section above, which lists its roots. */
export function scope_of(roots: readonly (Id | null)[], at: number): Id | null {
  return roots[Math.max(0, at - 1)] ?? null;
}

/** Whether a view draws a block: inside the layer it looks into, or within the whole section it
 *  surveys. */
export function draws(graph: Graph, tiers: Tiers, view: View, id: Id): boolean {
  if (!graph.blocks[id]) return false;
  if (is_layer_view(view.kind)) return layer_of(graph, id) === view.layer;
  return in_section(graph, id, view.layer, tiers.sections[view.at]?.cut ?? null);
}

/** A block brought into sight in a section, as that section shows it: picked on the whole
 *  section; seen from inside, picked on the layer it draws on — or, the section's root, opened on
 *  its own view. */
export function sight(graph: Graph, tiers: Tiers, views: Views, at: number, id: Id): View {
  const kind = view_of(tiers, views, at);
  const { roots } = trace(graph, tiers, id);
  if (!is_layer_view(kind)) return { at, kind, layer: scope_of(roots, at), pick: id };
  if (roots[at] === id) return { at, kind: lens_of(graph, id), layer: id, pick: null };
  const up = layer_of(graph, id);
  return { at, kind: home_of(graph, up), layer: up, pick: id };
}

/** A block drawn on a layer view of its own, in the section deepest listing it. */
export function lens_at(graph: Graph, tiers: Tiers, id: Id,
                        kind: ViewKind = lens_of(graph, id)): View | null {
  const at = trace(graph, tiers, id).held.lastIndexOf(id);
  return at < 0 ? null : { at, kind, layer: id, pick: null };
}

/** What opening a block does: **opening goes in**, whatever the section was shown as. A package
 *  opens on its definitions; a block at a cut, or one that opens onto a drawing or may hold — a
 *  folder among them, an interface — on its own view. Anything else is brought into sight. */
export function open_at(graph: Graph, tiers: Tiers, views: Views, id: Id): View | null {
  const b = graph.blocks[id];
  if (!b) return null;
  if (b.parent === null) return lens_at(graph, tiers, id, "definitions");
  const { roots, held } = trace(graph, tiers, id);
  const at = held.lastIndexOf(id);
  if (at < 0) return null;
  const holds = !inline(graph, id) && (is_interface(b) || opens(graph, id) || holds_any(graph, id));
  if (holds || roots[at] === id) return { at, kind: lens_of(graph, id), layer: id, pick: null };
  return sight(graph, tiers, views, at, id);
}

/** What leaving does: from inside, the layer above, until the section's root; from there, or from
 *  a whole section, the section above with the way back picked — the pick's root, else the scope.
 *  A package leaves for the first section whole. Nothing above the first. */
export function leave_at(graph: Graph, tiers: Tiers, views: Views, view: View): View | null {
  const { at, kind, layer, pick } = view;
  if (is_layer_view(kind) && layer && graph.blocks[layer]?.parent === null) {
    return { ...view_on(graph, tiers, views, null), pick: layer };
  }
  if (is_layer_view(kind) && layer && graph.blocks[layer]) {
    const { roots } = trace(graph, tiers, layer);
    const up = layer_of(graph, layer);
    if (roots[at] !== layer) return { at, kind: home_of(graph, up), layer: up, pick: layer };
    return at > 0 ? sight(graph, tiers, views, at - 1, layer) : null;
  }
  if (at === 0) return null;
  const back = pick ? trace(graph, tiers, pick).roots[at] ?? layer : layer;
  return back ? sight(graph, tiers, views, at - 1, back) : null;
}

/** Where a block is seen: where the canvas already draws it, else the section listing it as a
 *  member — a section's root is a member of the one above — picked there. */
export function reveal_at(graph: Graph, tiers: Tiers, views: Views, view: View | null,
                          id: Id): View | null {
  if (!graph.blocks[id]) return null;
  if (view && !is_layer_view(view.kind) && draws(graph, tiers, view, id)) return { ...view, pick: id };
  const { roots, held } = trace(graph, tiers, id);
  const members = held.flatMap((h, n) => (h === id && roots[n] !== id ? [n] : []));
  const at = members.length ? members[members.length - 1]! : held.lastIndexOf(id);
  return at < 0 ? null : sight(graph, tiers, views, at, id);
}

/** Where the canvas starts: `main`, else the workspace, brought into sight. */
export function home_at(graph: Graph, tiers: Tiers, views: Views): View | null {
  const id = graph.blocks[MAIN] ? MAIN : graph.root;
  return open_at(graph, tiers, views, id) ?? reveal_at(graph, tiers, views, null, id);
}

/** What the sections hold for a view: the way to the layer seen from inside, or to the pick on a
 *  whole section; null with nothing to follow. The section in focus is the deepest listing it, no
 *  deeper than the view's. */
export function held_at(graph: Graph, tiers: Tiers, view: View): Held | null {
  const target = is_layer_view(view.kind) ? view.layer ?? view.pick : view.pick;
  if (!target || !graph.blocks[target]) return null;
  const { held } = trace(graph, tiers, target);
  const deepest = held.lastIndexOf(target);
  const at = Math.min(view.at, deepest >= 0 ? deepest : held.length - 1);
  return at < 0 ? null : { path: held.slice(0, at + 1), at };
}

/** A view of a layer where nothing says more: on its own view, in the section deepest listing it.
 *  With none, the first section whole, never from inside: under a forest, every package's
 *  domain — the overhead. */
export function view_on(graph: Graph, tiers: Tiers, views: Views, layer: Id | null): View {
  if (layer && graph.blocks[layer]) {
    const at = Math.max(0, trace(graph, tiers, layer).held.lastIndexOf(layer));
    return { at, kind: lens_of(graph, layer), layer, pick: null };
  }
  const said = view_of(tiers, views, 0);
  const kind = !is_layer_view(said) ? said
    : tiers.sections[0]?.views.find((v) => !is_layer_view(v)) ?? "overhead";
  return { at: 0, kind, layer: tiers.top === "forest" ? null : graph.root, pick: null };
}
