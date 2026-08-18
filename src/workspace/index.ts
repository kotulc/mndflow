/** The workspace: open projects held as a project of their own.
 *
 *  The workspace is itself a project and needs no new schema to be one. Its
 *  elements are proxies of other projects' roots; folders are ordinary blocks.
 *  Filing is undoable because it is ordinary mutation, and it draws as a block
 *  diagram whose dependencies fall out of who holds proxies into whom.
 *
 *  The workspace key remembers which projects are open (and an untouched import
 *  that has no key of its own), and which of them are locked. Locked is this
 *  module's word, never the file's: unlock or fork to change a package.
 *
 *  A change is recorded where its element lives. {@link writeInto} is that
 *  path: mutations go through the door into the named project's log as one
 *  undoable step — writing home, a matrix cell, a rename through a proxy.
 *  Raw `saveProject` of a whole step list is not a substitute.
 *
 *  Shipped packages live under `packages/` and load here as graphs of
 *  definitions under a stable id. A consumer names them by path
 *  (`pkg_requirements/def_requirement`); nothing is copied into its own
 *  `defs`, so two packages offering the same name cannot shadow each other.
 *
 *  Nothing here draws the explorer, the tray, or an export bundle. */

import { entering, type Fault } from "../graph/check";
import { compact, descendsFrom as descends, fold, nextNum, titleOf } from "../graph/fold";
import { loadProject, loadWorkspace, saveProject, saveWorkspace } from "../graph/store";
import {
  EMPTY, ROOT, asTarget, asVocabulary, defIdFor, definition, element, field, newId,
  refAt, refTo, stemOf, step as makeStep,
  type Definition, type EdgeForm, type ElemForm, type Element, type Field,
  type Graph, type Mutation, type Spot, type Step,
} from "../graph/types";

export { stemOf };

/** What the workspace key holds, apart from every project's log. */
export type Held = {
  /** This workspace's project id — its graph is keyed like any other. */
  id: string;
  /** Projects currently open, in filing order. An untouched import lives here
   *  until it earns a key of its own. */
  projects: string[];
  /** Projects that refuse edits until unlocked or forked. Workspace word
   *  only — never written into a project's file. Absent reads as none. */
  locked?: string[];
};

/** Ways through a lock. The caller presents them; nothing here draws a UI. */
export type Way = "unlock" | "fork";

/** Locks on a Held — absent means none. */
function locks(held: Held): string[] {
  return held.locked ?? [];
}

/** A fresh workspace: its own id, and nothing opened yet. */
export function blank(): Held {
  return { id: newId("proj"), projects: [], locked: [] };
}

/** Repair an unknown payload into a Held, or null when it is not one.
 *
 *  A list without an id (what an early store test wrote) still reads: the id is
 *  minted once on the way in. Garbage is refused rather than half-read. */
export function read(raw: unknown): Held | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;

  const it = raw as Record<string, unknown>;
  if (it.projects !== undefined && !Array.isArray(it.projects)) return null;
  if (it.locked !== undefined && !Array.isArray(it.locked)) return null;

  const id = typeof it.id === "string" && it.id ? it.id : newId("proj");
  // Drop the workspace's own id if a corrupt payload listed it — the self
  // guard is also the storage boundary, not only admit.
  const projects = Array.isArray(it.projects)
    ? it.projects.filter((p): p is string => typeof p === "string" && p !== "" && p !== id)
    : [];
  const locked = Array.isArray(it.locked)
    ? it.locked.filter((p): p is string => typeof p === "string" && p !== "" && p !== id)
    : [];

  return { id, projects, locked };
}

/** What storage held, or a fresh blank when nothing has been filed. */
export function load(): Held {
  return read(loadWorkspace()) ?? blank();
}

/** Whether the workspace reached storage. Same failure rule as a project log. */
export function save(held: Held): boolean {
  return saveWorkspace(held);
}

/** Path a workspace proxy writes for another project's root. */
export function rootOf(projectId: string): string {
  return refTo(ROOT, projectId);
}

/** Whether a held path points at this workspace itself. */
export function isSelf(held: Held, of: string): boolean {
  return asTarget(of).project === held.id;
}

/** Whether this graph already holds a proxy of that project's root. */
export function holds(graph: Graph, projectId: string): boolean {
  const wanted = asTarget(rootOf(projectId));

  return Object.values(graph.elements).some((n) => {
    if (n.form !== "proxy" || !n.of) return false;
    const held = asTarget(n.of);

    return held.element === wanted.element && held.project === wanted.project;
  });
}

/** Why admitting this project would fail, in words, or null. */
export function mayAdmit(held: Held, graph: Graph, projectId: string): string | null {
  if (!projectId) return "Nothing to open.";
  // A workspace proxying itself is a cycle with no outside, and nothing useful
  // to open — refuse it rather than let the tree contain its own root.
  if (projectId === held.id) return "A workspace cannot hold itself.";
  if (held.projects.includes(projectId) || holds(graph, projectId)) {
    return "That project is already open.";
  }

  return null;
}

/** Admit a project into the workspace: remember it, and place a proxy of its
 *  root. Parent defaults to the workspace root layer; a folder (ordinary block)
 *  is how filing nests.
 *
 *  A shipped package (`pkg_…`) arrives locked — it resists editing until
 *  unlocked or forked. An ordinary project does not. */
export function admit(
  held: Held,
  graph: Graph,
  projectId: string,
  parent: string | null = null,
  spot?: Spot,
): { held: Held; mutations: Mutation[] } | { refuse: string } {
  const why = mayAdmit(held, graph, projectId);
  if (why) return { refuse: why };

  if (parent !== null) {
    const into = graph.elements[parent];
    if (!into || into.form !== "block") return { refuse: "Nowhere to file that." };
  }

  const of = rootOf(projectId);
  const stand = element("", {
    form: "proxy",
    parent,
    of,
    num: nextNum(graph, parent, "proxy"),
    ...(spot ? { x: spot.x, y: spot.y } : {}),
  });

  const lock = projectId.startsWith("pkg_") && !locks(held).includes(projectId);
  return {
    held: {
      ...held,
      projects: [...held.projects, projectId],
      locked: lock ? [...locks(held), projectId] : locks(held),
    },
    mutations: [{ op: "add_element", element: stand }],
  };
}

/** Whether this project currently resists editing. */
/** Every open project's name, by id — the root label each draws under. */
export function names(graphs: Record<string, Graph>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, graph] of Object.entries(graphs)) out[id] = titleOf(graph);

  return out;
}

/** Whether a project may be called this.
 *
 *  **Projects are siblings in the workspace**, so the rule a layer already has
 *  applies one level up: a name is required and no two share one. `except` is
 *  the project being renamed, which does not clash with itself. */
export function mayName(
  taken: Record<string, string>,
  want: string,
  except?: string,
): string | null {
  const name = want.trim();
  if (!name) return "A project needs a name.";

  for (const [id, held] of Object.entries(taken)) {
    if (id === except) continue;
    if (held.trim().toLowerCase() === name.toLowerCase()) {
      return `"${name}" is already a project. Project names are unique.`;
    }
  }

  return null;
}

/** The package a project with no domain of its own starts from — the
 *  relationship kinds a model is built out of, which `packages/core/freeform`
 *  says in its own first line. Without it a new project imports nothing, and
 *  the type picker offers nothing at all.
 *
 *  A `core/` file is its own package: the folder has no `definitions.yaml`, so
 *  each domain there is keyed by its file stem, not by `core`. */
const BASE = "freeform";

/** The log a newly named project starts from — naming it is its first step, and
 *  what makes it real enough to store and to list.
 *
 *  The naming carries the base import with it. `vocabulary` is the list of
 *  packages a project uses (D.2), and everything reading types reads that list
 *  — so a project that imports nothing offers nothing, which is a blank type
 *  picker on the first thing a new user meets. */
export function started(name: string): Step[] {
  return [makeStep(`new project: ${name.trim()}`, "rename", [
    { op: "update_element", id: ROOT, label: name.trim() },
    { op: "set_vocabulary", vocabulary: [packId(BASE)] },
  ])];
}

/** Name a project into the workspace — unlock and fork's sibling.
 *
 *  The project exists once named: required, unique, then a log whose first
 *  step is that naming. Never mints an untitled blank. The caller stores the
 *  steps and adopts the id; nothing here touches a project key. */
export function begin(
  held: Held,
  workspace: Graph,
  name: string,
  taken: Record<string, string>,
  parent: string | null = null,
  spot?: Spot,
): { held: Held; id: string; steps: Step[]; mutations: Mutation[] } | { refuse: string } {
  const why = mayName(taken, name);
  if (why) return { refuse: why };

  const id = newId("proj");
  const admitted = admit(held, workspace, id, parent, spot);
  if ("refuse" in admitted) return admitted;

  return {
    held: admitted.held,
    id,
    steps: started(name),
    mutations: admitted.mutations,
  };
}

/** Everything a block's subtree needs to stand up in another project's log.
 *
 *  **A project is a log, not only a place**, so a block cannot simply *move*
 *  between two: it is written into the destination and deleted from the source,
 *  as two steps in two logs. This half builds the writing; the deleting is the
 *  ordinary `delete` action, which already cascades to descendants and sheds
 *  what the block was joined to.
 *
 *  **What travels**: the block re-parented to `parent`, every descendant as it
 *  stood, every relationship with *both* ends inside the subtree, and the
 *  definitions those elements name — without the last, a promoted block would
 *  silently lose its types, which is the same kind of quiet loss the strip
 *  exists to prevent. Packages the source imported travel too, **added to what
 *  the destination already imports** rather than replacing them, so a type held
 *  in a package still resolves and the destination keeps its own.
 *
 *  **What does not**: a relationship with one end left behind. That is Clay's
 *  call — nothing stands in for the block it left — so {@link lost} counts them
 *  and the caller says so. */
export function extraction(
  from: Graph,
  id: string,
  parent: string | null = null,
  becomes: "root" | "child" = "child",
  into: Graph = EMPTY,
): { mutations: Mutation[]; lost: number } | { refuse: string } {
  const held = from.elements[id];
  if (!held || id === ROOT) return { refuse: "Nothing to take out." };

  const moving = Object.values(from.elements)
    .filter((node) => descends(from, node.id, id));
  const inside = new Set(moving.map((node) => node.id));

  // **Promoted, the block *is* the project** — Clay's rule that a project is a
  // block nothing contains. So it becomes the destination's root rather than
  // landing inside a project of the same name, and everything that pointed at
  // it points at root instead.
  const at = (node: string) => (becomes === "root" && node === id ? ROOT : node);

  const edges = Object.values(from.edges);
  const travelling = edges.filter((e) => inside.has(e.source) && inside.has(e.target));
  const lost = edges.filter(
    (e) => inside.has(e.source) !== inside.has(e.target),
  ).length;

  // Only the definitions this subtree actually names, so a promotion does not
  // drag a whole vocabulary along with it.
  const named = new Set<string>();
  for (const node of moving) if (node.type) named.add(node.type);
  for (const edge of travelling) if (edge.type) named.add(edge.type);

  const mutations: Mutation[] = [];

  // **The destination gains packages; it never has them replaced.** Writing the
  // source's list flat would wipe whatever the destination imported — silent
  // loss in a part of the project the drag never touched. Import order is kept:
  // what was there stays where it was, and anything new lands after it.
  const packages = [...into.vocabulary];
  for (const held of from.vocabulary) if (!packages.includes(held)) packages.push(held);
  if (packages.length > into.vocabulary.length) {
    mutations.push({ op: "set_vocabulary", vocabulary: packages });
  }

  for (const key of named) {
    const def = from.defs[key];
    if (!def) continue;
    mutations.push({ op: "set_def", ...def });
  }

  for (const node of moving) {
    if (becomes === "root" && node.id === id) {
      // The root already exists in the destination, so this amends it rather
      // than adding a second one.
      mutations.push({ op: "update_element", id: ROOT, label: node.label, type: node.type });
      if (node.body) mutations.push({ op: "set_body", id: ROOT, body: node.body });
      for (const held of node.fields) mutations.push({ op: "set_field", id: ROOT, ...held });
      continue;
    }

    mutations.push({
      op: "add_element",
      element: {
        ...node,
        parent: node.id === id
          ? parent
          : becomes === "root" && node.parent === id ? null : node.parent,
      },
    });
  }

  for (const edge of travelling) {
    mutations.push({
      op: "link_elements",
      edge: { ...edge, source: at(edge.source), target: at(edge.target) },
    });
  }

  return { mutations, lost };
}

/** Drop a project from the workspace: its proxy goes and its entry with it.
 *
 *  The inverse of {@link admit}. Used to clear an abandoned empty session —
 *  never to close a project holding work, which is the user's to do. */
export function forget(
  held: Held,
  graph: Graph,
  projectId: string,
): { held: Held; mutations: Mutation[] } {
  const of = rootOf(projectId);
  const mutations: Mutation[] = Object.values(graph.elements)
    .filter((it) => it.form === "proxy" && it.of === of)
    .map((it) => ({ op: "delete_element", id: it.id }) as Mutation);

  return {
    held: { ...held, projects: held.projects.filter((p) => p !== projectId) },
    mutations,
  };
}

export function isLocked(held: Held, projectId: string): boolean {
  return locks(held).includes(projectId);
}

/** Drop the lock so the project can be written in place.
 *
 *  Workspace state only — the project's file is unchanged by unlocking. */
export function unlock(held: Held, projectId: string): Held | { refuse: string } {
  if (!projectId) return { refuse: "Nothing to unlock." };
  if (!isLocked(held, projectId)) return { refuse: "That is not locked." };

  return { ...held, locked: locks(held).filter((id) => id !== projectId) };
}

/** Fork a locked (or open) project: a new id and a deep copy of its graph.
 *
 *  The original keeps its id and its lock, so anything pointing at it still
 *  points there. The copy is admitted unlocked — it is the one you write.
 *  The caller stores the copy under the new id; nothing here touches a
 *  project key. */
export function fork(
  held: Held,
  workspace: Graph,
  sourceId: string,
  source: Graph,
  parent: string | null = null,
  spot?: Spot,
): { held: Held; id: string; graph: Graph; mutations: Mutation[] } | { refuse: string } {
  if (!sourceId) return { refuse: "Nothing to fork." };
  if (!held.projects.includes(sourceId)) return { refuse: "That project is not open." };

  const id = newId("proj");
  const admitted = admit(held, workspace, id, parent, spot);
  if ("refuse" in admitted) return admitted;

  return {
    held: admitted.held,
    id,
    graph: structuredClone(source),
    mutations: admitted.mutations,
  };
}

/** A folder in the workspace is an ordinary block — nothing else.
 *
 *  Filing something into one is `admit` or `move` with that block as parent;
 *  the word "folder" is the workspace's reading of a block that holds others. */
export function folder(
  graph: Graph,
  label: string,
  parent: string | null = null,
  spot?: Spot,
): Mutation[] | { refuse: string } {
  if (parent !== null) {
    const into = graph.elements[parent];
    if (!into || into.form !== "block") return { refuse: "Nowhere to file that." };
  }

  const fresh = element(label, {
    parent,
    num: nextNum(graph, parent, "block"),
    ...(spot ? { x: spot.x, y: spot.y } : {}),
  });

  return [{ op: "add_element", element: fresh }];
}

/** Resolve a proxy target against the open projects' graphs.
 *
 *  A bare id reads from `here`. A path with a project half reads from that
 *  project's graph when it is open. Missing is tolerated — same rule as tidy —
 *  so undoing a deletion elsewhere brings the reference back. */
export function resolve(
  here: Graph,
  open: Record<string, Graph>,
  of: string,
): Element | undefined {
  const { project, element: id } = asTarget(of);
  if (!project) return here.elements[id];

  return open[project]?.elements[id];
}

/** Project ids this workspace graph currently holds as root proxies, in the
 *  order the proxies appear among the elements. */
export function named(graph: Graph): string[] {
  const ids: string[] = [];

  for (const node of Object.values(graph.elements)) {
    if (node.form !== "proxy" || !node.of) continue;
    const { project, element: id } = asTarget(node.of);
    if (project && id === ROOT && !ids.includes(project)) ids.push(project);
  }

  return ids;
}

// --- writing into another project's log -------------------------------------

/** What {@link opened} hands back: a log that has been through the door. */
export type Opened = {
  steps: Step[];
  graph: Graph;
  faults: Fault[];
};

/** Load one project's log through the door and fold it.
 *
 *  `prior` is what the caller already holds when storage has no key yet (an
 *  untouched import living only in the tab). Absent means read the keyed
 *  slot. Garbage at the door yields an empty applied log rather than a throw. */
export function opened(id: string, prior?: Step[]): Opened {
  const raw = prior ?? loadProject(id);
  const came = entering(raw);
  if (!came) return { steps: [], graph: fold([]), faults: [] };

  const steps = compact(came.steps);

  return { steps, graph: fold(steps), faults: came.faults };
}

/** Append mutations as one applied step in another project's log.
 *
 *  Through the door on the way in, compacted on the way out, saved under that
 *  project's key. The step is undoable when that project is in context —
 *  reverting it there unwinds the write, the same as any other step.
 *
 *  Locked refuses before anything is written; unlock and fork stay the page's.
 *  Empty mutations refuse rather than mint a no-op step. `prior` matches
 *  {@link opened}. */
export function writeInto(
  id: string,
  mutations: Mutation[],
  meta: { say: string; action: string },
  opts: { prior?: Step[]; locked?: boolean } = {},
): { steps: Step[]; graph: Graph } | { refuse: string; offer?: Way[] } {
  if (!id) return { refuse: "Nowhere to write." };
  if (!mutations.length) return { refuse: "Nothing to write." };
  if (opts.locked) {
    return { refuse: "This package is locked.", offer: ["unlock", "fork"] };
  }

  const { steps: prior } = opened(id, opts.prior);
  const next = compact([
    ...prior,
    makeStep(meta.say, meta.action, mutations),
  ]);

  saveProject(id, next);

  return { steps: next, graph: fold(next) };
}

// --- shipped packages -------------------------------------------------------

const FORMS = new Set<string>([
  "block", "note", "group", "proxy", "line", "directed",
]);

/** A shipped package: definitions under a stable project id.
 *
 *  It is a project whose content is `defs` — usable the moment it sits in the
 *  open-projects map beside ordinary graphs. Usages name its definitions by
 *  path; the package itself is never edited by loading it. */
export type Pack = {
  id: string;
  name: string;
  graph: Graph;
};

/** Stable project id for a shipped package name — `pkg_requirements`. */
export function packId(name: string): string {
  return `pkg_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

/** Package ids a domain or template stem draws on, in import order.
 *
 *  Today one core seed per stem (`packages/core/<stem>.yaml`). A later row may
 *  widen the list; callers already take an ordered array. The minting itself
 *  lives next to `asVocabulary` so the terminal never reaches here for it. */
export function packagesOf(stem: string): string[] {
  return asVocabulary(stem);
}

/** Package name from a path under `packages/`.
 *
 *  `…/requirements/definitions.yaml` → the folder; `…/core/software.yaml` →
 *  the stem. One convention so domain seeds and named packages share a loader. */
function nameOf(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  const file = parts[parts.length - 1] ?? "";
  const folder = parts[parts.length - 2] ?? "";
  if (file === "definitions.yaml") return folder;

  return file.replace(/\.ya?ml$/i, "");
}

function fieldsOf(raw: unknown): Field[] {
  if (!Array.isArray(raw)) return [];

  const out: Field[] = [];
  for (const row of raw) {
    const it = (row ?? {}) as Record<string, unknown>;
    const name = String(it.name ?? "").trim();
    if (!name) continue;

    out.push(field(name, {
      ...(typeof it.form === "string" ? { form: it.form as Field["form"] } : {}),
      ...(typeof it.unit === "string" ? { unit: it.unit } : {}),
      ...(it.value !== undefined ? { value: String(it.value) } : {}),
      ...(Array.isArray(it.choices) ? { choices: it.choices.map(String) } : {}),
      ...(typeof it.many === "boolean" ? { many: it.many } : {}),
      ...(Array.isArray(it.tags) ? { tags: it.tags.map(String) } : {}),
    }));
  }

  return out;
}

/** One YAML definition row → a Definition, or null when it has no name. */
function defOfRaw(raw: unknown): Definition | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const it = raw as Record<string, unknown>;
  const name = String(it.name ?? "").trim();
  if (!name) return null;

  const form = typeof it.form === "string" && FORMS.has(it.form)
    ? (it.form as ElemForm | EdgeForm)
    : "line";
  const id = typeof it.id === "string" && it.id.trim()
    ? it.id.trim()
    : defIdFor(name);

  const names = it.names && typeof it.names === "object" && !Array.isArray(it.names)
    ? Object.fromEntries(
        Object.entries(it.names as Record<string, unknown>)
          .filter(([, v]) => typeof v === "string")
          .map(([k, v]) => [k, String(v)]),
      )
    : undefined;
  const components = it.components && typeof it.components === "object"
    && !Array.isArray(it.components)
    ? it.components as Definition["components"]
    : undefined;
  const size = it.size && typeof it.size === "object" && !Array.isArray(it.size)
    ? it.size as Definition["size"]
    : undefined;

  return definition(name, {
    id,
    form,
    fields: fieldsOf(it.fields),
    ...(typeof it.body === "string" ? { body: it.body } : {}),
    ...(typeof it.icon === "string" ? { icon: it.icon } : {}),
    ...(it.line === "solid" || it.line === "dashed" || it.line === "dotted"
      ? { line: it.line } : {}),
    ...(it.head === "none" || it.head === "open" || it.head === "filled"
      || it.head === "hollow" ? { head: it.head } : {}),
    ...(size && typeof size.w === "number" && typeof size.h === "number"
      ? { size: { w: size.w, h: size.h } } : {}),
    ...(typeof it.extends === "string" && it.extends ? { extends: it.extends } : {}),
    ...(names && Object.keys(names).length ? { names } : {}),
    ...(components ? { components } : {}),
  });
}

/** Build a package from a name and a YAML payload (`{ definitions: […] }`).
 *
 *  Ids already present win; a missing id is derived from the name. A second
 *  row under the same id is dropped — never shadows the first. */
export function fromDefs(name: string, raw: unknown): Pack | null {
  const stem = name.trim();
  if (!stem) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const list = (raw as Record<string, unknown>).definitions;
  if (!Array.isArray(list)) return null;

  const defs: Record<string, Definition> = {};
  for (const row of list) {
    const held = defOfRaw(row);
    if (!held || defs[held.id]) continue;
    defs[held.id] = held;
  }

  return {
    id: packId(stem),
    name: stem,
    graph: { ...EMPTY, defs },
  };
}

/** Every YAML file under `packages/`, keyed for eager load. */
const packFiles = import.meta.glob("../../packages/**/*.yaml", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

/** Catalog, built once. Later files for the same package id merge in; a def id
 *  already held is left alone — never shadowed across files either. */
function buildCatalog(): Record<string, Pack> {
  const by: Record<string, Pack> = {};

  for (const [path, raw] of Object.entries(packFiles)) {
    const stem = nameOf(path);
    if (!stem || stem === "packages") continue;
    const next = fromDefs(stem, raw);
    if (!next) continue;

    const was = by[next.id];
    if (!was) {
      by[next.id] = next;
      continue;
    }

    const defs = { ...was.graph.defs };
    for (const [id, def] of Object.entries(next.graph.defs)) {
      if (!defs[id]) defs[id] = def;
    }
    by[next.id] = { ...was, graph: { ...was.graph, defs } };
  }

  return by;
}

const CATALOG = buildCatalog();

/** Every shipped package, keyed by stable id. */
export function packs(): Record<string, Pack> {
  return CATALOG;
}

/** One shipped package by id, or null when nothing ships under that id. */
export function pack(id: string): Pack | null {
  return CATALOG[id] ?? null;
}

/** Graphs for the named package ids that ship — ready to sit in `open`.
 *
 *  Unknown ids are skipped. Does not touch storage: a package is data, and an
 *  untouched import costs no key. */
export function gather(ids: string[]): Record<string, Graph> {
  const out: Record<string, Graph> = {};

  for (const id of ids) {
    const held = pack(id);
    if (held) out[id] = held.graph;
  }

  return out;
}

/** Look up a definition by path or bare id against this graph and the open ones.
 *
 *  A bare id reads from `here`. A path reads from that project's graph when it
 *  is open — which is how a package's definition is used without ever being
 *  copied into the consumer. Missing is undefined, same rule as {@link resolve}. */
export function defOf(
  here: Graph,
  open: Record<string, Graph>,
  ref: string,
): Definition | undefined {
  const { project, id } = refAt(ref);
  if (!project) return here.defs[id];

  return open[project]?.defs[id];
}

/** Definitions in import order, each addressed by path.
 *
 *  Two packages naming a thing alike yield two entries — ambiguity for a
 *  picker (SC.4), never one shadowing the other. Order is the caller's. */
export function scoped(
  order: string[],
  open: Record<string, Graph>,
): { path: string; pack: string; def: Definition }[] {
  const out: { path: string; pack: string; def: Definition }[] = [];

  for (const id of order) {
    const graph = open[id];
    if (!graph) continue;
    for (const def of Object.values(graph.defs)) {
      out.push({ path: refTo(def.id, id), pack: id, def });
    }
  }

  return out;
}
