/** Navigation: what reading, opening, leaving and revealing do to the canvas, and what the
 *  explorer's sections hold for it. **One rule for every section and every host.**
 *
 *  A host cuts the workspace into sections (`sections.ts`); the canvas looks at one of them in
 *  one view. A layer view draws one block, and **its card's kind, and the section it is read
 *  from, say which** (`lens_of`); `map`, the only view chosen, draws the whole section as a
 *  treemap of chips, the pick its focus. */

import { NAMED_VIEWS } from "./components";
import { is_model, models, setting_of } from "./defs";
import { inline, is_folder, is_grid, is_region, layer_of } from "./holders";
import { registry_at, registry_id, registry_of } from "./library";
import { opens } from "./names";
import { at_cut, in_section, is_layer_view, on_side, type Lists, type Section, type ViewKind }
  from "./sections";
import { of_ref, path, stands_for } from "./tree";
import { type Graph, type Id } from "./types";
import { definition_uses } from "./uses";

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

/** mndflow's sections: **the library** — what you build with, and where it is used: every
 *  package's definitions with their parts — then **the models**, what you are building and the
 *  one place it is drawn. Each starts on its map. */
export const EDITOR: Tiers = {
  top: "forest",
  sections: [
    { id: "library", label: "library", cut: null, lists: "domain", views: ["map", "internal"] },
    { id: "models", label: "models", cut: null, lists: "structure", views: ["map", "internal"] },
  ],
};


/** A block's own `layout.view`, not what its chain says. A stand-in uses this to name a diagram
 *  over its target. */
function own_view(graph: Graph, id: Id): string | undefined {
  const view = graph.blocks[id]?.settings?.["layout"]?.["view"];
  return typeof view === "string" ? view : undefined;
}

/** Whether a block can feed a view it names. Allocation needs a grid; a class or
 *  entity diagram, and the inside, something to draw: a block that holds, or reads through, what
 *  it does not draw in place. */
function feeds(graph: Graph, id: Id, view: string): boolean {
  if (view === "allocation") return is_grid(graph, id);
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


/** The layer view a block opens on, read from the side `lists` — the models' where unsaid — or
 *  null where it opens on nothing: a package, a folder, a group or a region nothing — each is a
 *  box on its map or its parent's layer; a view it names and can feed; a grid, its allocation; a
 *  block with something to draw, from inside — **an empty block opens on nothing**. **In the
 *  library a definition opens its registry**, a model included, where it is used; **in the
 *  models a model opens its own drawing**, empty or not. A stand-in opens as what it stands
 *  for, unless it states its own diagram view and the target can feed that. */
export function lens_of(graph: Graph, id: Id, lists?: Lists): ViewKind | null {
  const b = graph.blocks[id];
  /** A registry, and an entry of one, open on the registry view: neither is ever a block. */
  if (!b) return registry_at(graph, id) || registry_of(graph, id) ? "registry" : null;
  if (b.parent === null) return null;
  if (b.def) {
    if (lists === "domain") return definition_uses(graph, id).length ? "registry" : null;
    return is_model(graph, id) ? diagram_of(graph, id) ?? "internal" : null;
  }
  /** The library enters definitions only: a part of one is read in the tray. */
  if (lists === "domain") return null;
  const target = of_ref(graph, id) ? stands_for(graph, id) : null;
  if (target && target.id !== id) {
    return own_diagram(graph, id) ?? lens_of(graph, target.id, lists);
  }
  const diagram = diagram_of(graph, id);
  if (diagram) return diagram;
  if (is_grid(graph, id)) return "allocation";
  if (inline(graph, id)) return null;
  return opens(graph, id) ? "internal" : null;
}

/** The side the section a view looks at lists, where it is said. */
function lists_at(tiers: Tiers, at: number | undefined): Lists | undefined {
  return at === undefined ? undefined : tiers.sections[at]?.lists;
}

/** A section's map, `pick` its focus. */
function map_at(at: number, pick: Id | null): View {
  return { at, kind: "map", layer: null, pick };
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

/** A block brought into sight in a section, as that section shows it: picked on its map; seen
 *  from inside, picked on the layer it draws on — or, the section's root, opened on its own view.
 *  What no layer draws, and anything in the library, is picked on the map. */
export function sight(graph: Graph, tiers: Tiers, views: Views, at: number, id: Id): View {
  const kind = view_of(tiers, views, at);
  const lists = lists_at(tiers, at);
  const { roots } = trace(graph, tiers, id);
  if (!is_layer_view(kind)) return { at, kind, layer: scope_of(roots, at), pick: id };
  if (lists === "domain") return map_at(at, id);
  const own = roots[at] === id ? lens_of(graph, id, lists) : null;
  if (own) return { at, kind: own, layer: id, pick: null };
  const up = layer_of(graph, id);
  const kind_up = up ? lens_of(graph, up, lists) : null;
  return up && kind_up ? { at, kind: kind_up, layer: up, pick: id } : map_at(at, id);
}

/** What opening a block does: **opening goes in**, on the view its card's kind calls for, read
 *  from the section it was opened from — `from`, else the section the canvas is already on, where
 *  that section lists it. A definition opened from the library opens its registry; a model opened
 *  from the models, its drawing. A stand-in opens what it stands for, where that opens. Anything
 *  that opens on nothing is picked where the canvas draws it, else brought into sight. */
export function open_at(graph: Graph, tiers: Tiers, views: Views, id: Id, from?: number,
                        now?: View | null): View | null {
  const origin = from !== undefined ? from : now?.at;
  const lists = lists_at(tiers, origin);
  const kind = lens_of(graph, id, lists);
  /** A registry opens on its entries, an entry and a definition on where they are used, in the
   *  library. */
  if (kind === "registry") {
    const at = tiers.sections.findIndex((s) => s.lists === "domain");
    return { at: Math.max(0, at), kind: "registry", layer: id, pick: null };
  }
  const b = graph.blocks[id];
  if (!b) return null;
  /** **A region is a camera stop**, and so is a folder drawn in place: the room holding it is
   *  opened, and the focus narrows to it. A folder no layer draws is focused on its map. */
  if (b.parent !== null && (is_region(graph, id) || is_folder(graph, id))) {
    const room = layer_of(graph, id);
    const opened = room ? open_at(graph, tiers, views, room, from, now) : null;
    if (opened && is_layer_view(opened.kind)) return { ...opened, layer: id, pick: null };
  }
  const target = of_ref(graph, id) ? stands_for(graph, id) : null;
  /** A stand-in that names its own diagram stays the layer: the drawing is the target's, and the
   *  trail names the reference. Anything else opens what it stands for, in the same section, where
   *  that opens there; else it is picked where it is. */
  if (target && target.id !== id && !own_diagram(graph, id)) {
    if (lens_of(graph, target.id, lists)) return open_at(graph, tiers, views, target.id, from, now);
    return reveal_at(graph, tiers, views, now ?? null, id);
  }
  const { roots, held } = trace(graph, tiers, id);
  const listed = origin !== undefined && held[origin] === id ? origin : held.lastIndexOf(id);
  if (listed < 0) return null;
  if (kind || roots[listed] === id) {
    return { at: listed, kind: kind ?? "internal", layer: id, pick: null };
  }
  return reveal_at(graph, tiers, views, now ?? null, id) ?? sight(graph, tiers, views, listed, id);
}

/** **What reading a subject does** — a double-click, Enter, the explorer's open, the tray's
 *  *read* — from the section `from`, else the canvas's. It enters what it is on, where that opens
 *  there. In the library nothing else is entered: a part of a definition, or one not used, is
 *  read in the tray. In the models anything else — a tile inside a chip (`inner`), a plain block,
 *  a region — enters the nearest block above it that opens, picked there. Null where nothing
 *  does: what was read stays picked on its map. */
export function read_at(graph: Graph, tiers: Tiers, views: Views, now: View | null, subject: Id,
                        options: { inner?: boolean; from?: number } = {}): View | null {
  const from = options.from ?? now?.at;
  const lists = lists_at(tiers, from);
  /** **A use read from a registry hands over to the models**, where it is drawn. */
  const models = tiers.sections.findIndex((s) => s.lists === "structure");
  if (lists === "domain" && models >= 0 && graph.blocks[subject]
      && !on_side(graph, subject, "domain")) {
    return read_at(graph, tiers, views, now, subject, { ...options, from: models });
  }
  const opened = (id: Id) => {
    const to = open_at(graph, tiers, views, id, from, now);
    return to && is_layer_view(to.kind) ? to : null;
  };
  if (!options.inner && lens_of(graph, subject, lists)) return opened(subject);
  if (lists === "domain" || !graph.blocks[subject]) return null;
  const up = path(graph, subject).map((b) => b.id).reverse().slice(1)
    .find((id) => !!lens_of(graph, id, lists));
  const to = up ? opened(up) : null;
  return to ? { ...to, pick: subject } : null;
}

/** What leaving does: from inside, the layer above, in the same section; from a layer nothing
 *  above opens on — a model, a definition's registry — the section's map, what was left picked.
 *  An entry leaves for its registry, a component registry for its package on the map; a
 *  section's root for the section above. **Never a back stack**: leaving goes up, not back. A map
 *  is left for nothing. */
export function leave_at(graph: Graph, tiers: Tiers, views: Views, view: View): View | null {
  const { at, kind, layer } = view;
  if (kind === "registry" && layer) {
    const of = registry_of(graph, layer);
    if (of) return { at, kind, layer: registry_id(of), pick: layer };
    const registry = registry_at(graph, layer);
    if (registry) return map_at(at, registry.pkg);
    if (graph.blocks[layer]) return map_at(at, layer);
  }
  if (!is_layer_view(kind) || !layer || !graph.blocks[layer]) return null;
  const { roots } = trace(graph, tiers, layer);
  if (roots[at] === layer) return at > 0 ? sight(graph, tiers, views, at - 1, layer) : null;
  const up = layer_of(graph, layer);
  const kind_up = up ? lens_of(graph, up, lists_at(tiers, at)) : null;
  return up && kind_up ? { at, kind: kind_up, layer: up, pick: layer } : map_at(at, layer);
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

/** Where the canvas starts: **the models' map**, the workspace's first model picked, else the
 *  first model loaded. A host with no models opens its workspace root as it lists it. */
export function home_at(graph: Graph, tiers: Tiers, views: Views): View | null {
  const at = tiers.sections.findIndex((s) => s.lists === "structure");
  const from = at < 0 ? tiers.sections.length - 1 : at;
  const first = first_model(graph);
  if (first) return map_at(from, first);
  return open_at(graph, tiers, views, graph.root, from)
    ?? reveal_at(graph, tiers, views, null, graph.root);
}

/** The model a session starts on: the workspace's first, else the first loaded. */
export function first_model(graph: Graph): Id | null {
  return (models(graph, graph.root)[0] ?? models(graph)[0])?.id ?? null;
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

/** A view of a layer where nothing says more: on its own view, in the section deepest listing it
 *  — a plain block from inside, empty or not. A package, or a definition that opens nothing
 *  there, is picked on that section's map. With none, the first section's map. */
export function view_on(graph: Graph, tiers: Tiers, _views: Views, layer: Id | null): View {
  const b = layer ? graph.blocks[layer] : undefined;
  if (layer && b) {
    const { held } = trace(graph, tiers, layer);
    const at = Math.max(0, held.lastIndexOf(layer));
    const lists = lists_at(tiers, at);
    const plain = b.parent !== null && !b.def && lists !== "domain" ? "internal" : null;
    const kind = lens_of(graph, layer, lists) ?? plain;
    return kind ? { at, kind, layer, pick: null } : map_at(at, layer);
  }
  return { at: 0, kind: "map", layer: tiers.top === "forest" ? null : graph.root, pick: null };
}
