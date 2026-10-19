/** Navigation: what opening, leaving and revealing do to the canvas, and what the explorer's
 *  sections hold for it. **One rule for every section and every host.**
 *
 *  A host cuts the workspace into sections (`sections.ts`); the canvas looks at one of them in
 *  one view. A layer view draws one block, and **its card's kind says which** (`lens_of`);
 *  `package`, the only view chosen, draws the whole section — every root the
 *  section above lists — down to its cut, the pick brought into sight. */

import { NAMED_VIEWS } from "./components";
import { setting_of } from "./defs";
import { inline, is_grid, layer_of } from "./holders";
import { registry_at, registry_id, registry_of } from "./library";
import { opens } from "./names";
import { at_cut, in_section, is_layer_view, on_side, type Section, type ViewKind }
  from "./sections";
import { of_ref, path, stands_for } from "./tree";
import { type Graph, type Id } from "./types";

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

/** mndflow's sections: **the library** — what you build with, every package's definitions with
 *  their parts — then **the model**, what you are building: usages only. */
export const EDITOR: Tiers = {
  top: "forest",
  sections: [
    { id: "library", label: "library", cut: null, lists: "domain",
      views: ["package", "internal"] },
    { id: "model", label: "model", cut: null, lists: "structure",
      views: ["internal", "package"] },
  ],
};


/** A block's own `layout.view`, not what its chain says. A stand-in uses this to name a diagram
 *  over its target. */
function own_view(graph: Graph, id: Id): string | undefined {
  const view = graph.blocks[id]?.settings?.["layout"]?.["view"];
  return typeof view === "string" ? view : undefined;
}

/** Whether a block can feed a view it names. Allocation and a sequence need a grid; a class or
 *  entity diagram, and the inside, something to draw: a block that holds, or reads through, what
 *  it does not draw in place. */
function feeds(graph: Graph, id: Id, view: string): boolean {
  if (view === "allocation" || view === "sequence") return is_grid(graph, id);
  if (view === "class" || view === "er") return opens(graph, id);
  if (view === "internal") {
    return !is_grid(graph, id) && opens(graph, id);
  }
  return false;
}

/** Whether a word is a view a block may name with `layout.view`. */
function is_named_view(view: unknown): view is ViewKind {
  return (NAMED_VIEWS as readonly unknown[]).includes(view);
}

/** The view a block's chain names, where the block can feed it. A name this build does not know,
 *  or a block that cannot feed the one it names, is null: the block opens on the view its kind
 *  gives. */
export function diagram_of(graph: Graph, id: Id): ViewKind | null {
  const said = setting_of(graph, id, "layout")["view"];
  return is_named_view(said) && feeds(graph, id, said) ? said : null;
}

/** The block a diagram draws. A stand-in that states its own `layout.view`, and whose target can
 *  feed it, draws the target. One dataset, many diagrams. */
export function diagram_subject(graph: Graph, id: Id): Id {
  const target = of_ref(graph, id) ? stands_for(graph, id) : null;
  const own = own_view(graph, id);
  if (target && target.id !== id && own && is_named_view(own)
      && feeds(graph, target.id, own)) return target.id;
  return id;
}

/** The diagram a stand-in states for its target, where the target can feed it. */
function own_diagram(graph: Graph, id: Id): ViewKind | null {
  return diagram_subject(graph, id) !== id ? own_view(graph, id) as ViewKind : null;
}


/** The layer view a block opens on, by its card's kind, or null where it opens on nothing: a
 *  package, its folder view; a folder, a group or a region nothing — each is a box on its
 *  parent's layer; a view it names and can feed; a grid, its allocation; a block with something
 *  to draw, from inside — **an empty block opens on nothing**. **A definition opens as its usages do**, on the view its chain
 *  names. A stand-in opens as what it stands for, unless it states its own diagram view and the
 *  target can feed that. */
export function lens_of(graph: Graph, id: Id): ViewKind | null {
  const b = graph.blocks[id];
  /** A registry, and an entry of one, open on the registry view: neither is ever a block. */
  if (!b) return registry_at(graph, id) || registry_of(graph, id) ? "registry" : null;
  if (b.parent === null) return "folder";
  const target = of_ref(graph, id) ? stands_for(graph, id) : null;
  if (target && target.id !== id) return own_diagram(graph, id) ?? lens_of(graph, target.id);
  const diagram = diagram_of(graph, id);
  if (diagram) return diagram;
  if (is_grid(graph, id)) return "allocation";
  if (inline(graph, id)) return null;
  return opens(graph, id) ? "internal" : null;
}

/** The view a block is drawn in: its own, else from inside. */
function kind_at(graph: Graph, id: Id | null): ViewKind {
  return (id ? lens_of(graph, id) : null) ?? "internal";
}


/** The way to a block through the sections: what each holds, and the root of the next. A block at
 *  a cut roots the next section. One that lists structure on its own records the block wherever
 *  it lists it, and a package is the only block that roots it — a folder or a definition on the
 *  way does not. */
export function trace(graph: Graph, tiers: Tiers, id: Id): { roots: (Id | null)[]; held: Id[] } {
  const roots: (Id | null)[] = [tiers.top === "workspace" ? graph.root : null];
  const held: Id[] = [];
  if (!graph.blocks[id]) return { roots, held };
  const up = path(graph, id).map((b) => b.id);
  for (const [n, section] of tiers.sections.entries()) {
    const root = section.lists === "structure" ? null : roots[n]!;
    const next = tiers.sections[n + 1];
    const stands = next?.lists === "structure";
    if (!in_section(graph, id, root, section.cut, section.lists)) {
      /** Not listed here: held through the block at this section's cut above it. Never this
       *  block, which the section has already declined. A later structure section still gets its
       *  own row, through the nearest ancestor it would list. */
      const from = roots[n] === null ? 0 : up.indexOf(roots[n]!) + 1;
      const anchor = from > 0 || roots[n] === null
        ? up.slice(from).find((a) => a !== id && at_cut(graph, section.cut, a)
            && on_side(graph, a, section.lists)) : undefined;
      if (anchor) {
        held.push(anchor);
        roots.push(anchor);
        continue;
      }
      if (!stands) break;
      const above = [...up].reverse().find((a) => a !== id
        && in_section(graph, a, root, section.cut, section.lists));
      if (!above) break;
      held.push(above);
      roots.push(null);
      continue;
    }
    held.push(id);
    const more = stands && graph.blocks[id]?.parent === null;
    if (stands && !more) {
      roots.push(null);
      continue;
    }
    if (!more && (id === root || !at_cut(graph, section.cut, id))) break;
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

/** Whether a view draws a block: inside the layer it looks into; on a system view, what the first
 *  section lists under its scope, and the top level of each block at its cut. */
export function draws(graph: Graph, tiers: Tiers, view: View, id: Id): boolean {
  if (!graph.blocks[id]) return false;
  if (is_layer_view(view.kind)) return layer_of(graph, id) === view.layer;
  const section = tiers.sections[view.at] ?? tiers.sections[0];
  const cut = section?.cut ?? null;
  const up = layer_of(graph, id);
  return in_section(graph, id, view.layer, cut, section?.lists)
    || (!!up && at_cut(graph, cut, up) && in_section(graph, up, view.layer, cut, section?.lists));
}

/** A block brought into sight in a section, as that section shows it: picked on the whole
 *  section; seen from inside, picked on the layer it draws on — or, the section's root, opened on
 *  its own view. */
export function sight(graph: Graph, tiers: Tiers, views: Views, at: number, id: Id): View {
  const kind = view_of(tiers, views, at);
  const { roots } = trace(graph, tiers, id);
  if (!is_layer_view(kind)) return { at, kind, layer: scope_of(roots, at), pick: id };
  if (roots[at] === id) return { at, kind: kind_at(graph, id), layer: id, pick: null };
  const up = layer_of(graph, id);
  return { at, kind: kind_at(graph, up), layer: up, pick: id };
}

/** What opening a block does: **opening goes in**, on the view its card's kind calls for, in the
 *  section it was opened from — `from`, else the section the canvas is already on, where that
 *  section lists it. A definition opens as its usages do. A folder draws what that section
 *  lists. A stand-in opens what it stands for. Anything that opens on nothing is picked where the
 *  canvas draws it, else brought into sight. */
export function open_at(graph: Graph, tiers: Tiers, views: Views, id: Id, from?: number,
                        now?: View | null): View | null {
  /** A registry opens on its entries, an entry on where it is used, in the library. */
  if (lens_of(graph, id) === "registry") {
    const at = tiers.sections.findIndex((s) => s.lists === "domain");
    return { at: Math.max(0, at), kind: "registry", layer: id, pick: null };
  }
  const b = graph.blocks[id];
  if (!b) return null;
  const target = of_ref(graph, id) ? stands_for(graph, id) : null;
  /** A stand-in that names its own diagram stays the layer: the drawing is the target's, and the
   *  trail names the reference. Anything else opens what it stands for, in the same section. */
  if (target && target.id !== id && !own_diagram(graph, id)) {
    return open_at(graph, tiers, views, target.id, from, now);
  }
  const { roots, held } = trace(graph, tiers, id);
  const origin = from !== undefined ? from : now?.at;
  const kind = lens_of(graph, id);
  const listed = origin !== undefined && held[origin] === id ? origin : held.lastIndexOf(id);
  if (listed < 0) return null;
  if (kind || roots[listed] === id) {
    return { at: listed, kind: kind ?? "internal", layer: id, pick: null };
  }
  return reveal_at(graph, tiers, views, now ?? null, id) ?? sight(graph, tiers, views, listed, id);
}

/** What leaving does: from inside, the layer above, in the same section. From the section's
 *  root, or from a whole section,
 *  the section above with the way back picked — the pick's root, else the scope. A package leaves
 *  for the first section whole. Nothing above the first. */
export function leave_at(graph: Graph, tiers: Tiers, views: Views, view: View): View | null {
  const { at, kind, layer, pick } = view;
  /** An entry leaves for its registry, the entry picked; a registry for the package view, its
   *  package picked. */
  if (kind === "registry" && layer) {
    const of = registry_of(graph, layer);
    if (of) return { at, kind, layer: registry_id(of), pick: layer };
    const registry = registry_at(graph, layer);
    if (registry) return { ...view_on(graph, tiers, views, null), pick: registry.pkg };
  }
  if (is_layer_view(kind) && layer && graph.blocks[layer]?.parent === null) {
    return { ...view_on(graph, tiers, views, null), pick: layer };
  }
  if (is_layer_view(kind) && layer && graph.blocks[layer]) {
    const { roots } = trace(graph, tiers, layer);
    const up = layer_of(graph, layer);
    if (roots[at] !== layer) return { at, kind: kind_at(graph, up), layer: up, pick: layer };
    /** A layer under the package root leaves for that root, drawn from structure. */
    if (up && graph.blocks[up]?.parent === null) {
      const from = tiers.sections.findIndex((s) => s.lists === "structure");
      const n = from < 0 ? Math.max(0, at - 1) : from;
      return { at: n, kind: lens_of(graph, up) ?? "folder", layer: up, pick: layer };
    }
    return at > 0 ? sight(graph, tiers, views, at - 1, layer) : null;
  }
  if (at === 0) return null;
  const back = pick ? trace(graph, tiers, pick).roots[at] ?? layer : layer;
  return back ? sight(graph, tiers, views, at - 1, back) : null;
}

/** Where a block is seen: where the canvas already draws it — the open layer or the whole section
 *  — else the section listing it as a member — a section's root is a member of the one above —
 *  picked there. */
export function reveal_at(graph: Graph, tiers: Tiers, views: Views, view: View | null,
                          id: Id): View | null {
  if (!graph.blocks[id]) return null;
  if (view && draws(graph, tiers, view, id)) return { ...view, pick: id };
  const { roots, held } = trace(graph, tiers, id);
  const members = held.flatMap((h, n) => (h === id && roots[n] !== id ? [n] : []));
  const at = members.length ? members[members.length - 1]! : held.lastIndexOf(id);
  return at < 0 ? null : sight(graph, tiers, views, at, id);
}

/** Where the canvas starts: the workspace root, drawn as opened from structure. */
export function home_at(graph: Graph, tiers: Tiers, views: Views): View | null {
  const at = tiers.sections.findIndex((s) => s.lists === "structure");
  const from = at < 0 ? tiers.sections.length - 1 : at;
  return open_at(graph, tiers, views, graph.root, from)
    ?? reveal_at(graph, tiers, views, null, graph.root);
}

/** What the sections hold for a view: the way to the layer seen from inside, or to the pick on a
 *  whole section; null with nothing to follow. The section in focus is the deepest listing it, no
 *  deeper than the view's. */
export function held_at(graph: Graph, tiers: Tiers, view: View): Held | null {
  /** A registry, or an entry of one, is held through its package. */
  const registry = view.kind === "registry"
    ? registry_at(graph, view.layer) ?? registry_of(graph, view.layer) : null;
  const target = registry ? registry.pkg
    : is_layer_view(view.kind) ? view.layer ?? view.pick : view.pick;
  if (!target || !graph.blocks[target]) return null;
  const { held } = trace(graph, tiers, target);
  const deepest = held.lastIndexOf(target);
  const at = Math.min(view.at, deepest >= 0 ? deepest : held.length - 1);
  return at < 0 ? null : { path: held.slice(0, at + 1), at };
}

/** A view of a layer where nothing says more: on its own view, in the section deepest listing it.
 *  With none, the first section whole, never from inside: under a forest, every package's
 *  domain — the package view. */
export function view_on(graph: Graph, tiers: Tiers, views: Views, layer: Id | null): View {
  if (layer && graph.blocks[layer]) {
    const { held } = trace(graph, tiers, layer);
    const at = Math.max(0, held.lastIndexOf(layer));
    return { at, kind: kind_at(graph, layer), layer, pick: null };
  }
  const said = view_of(tiers, views, 0);
  const kind = !is_layer_view(said) ? said
    : tiers.sections[0]?.views.find((v) => !is_layer_view(v)) ?? "package";
  return { at: 0, kind, layer: tiers.top === "forest" ? null : graph.root, pick: null };
}
