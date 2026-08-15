/** The project as a file: the envelope, the canonical layout, and the hash.
 *
 *  **A file is the graph, not the log.** The log exists so undo needs no
 *  inverses, which is a within-session concern; a file exists to be read,
 *  compared and kept, so its size follows the model rather than how long
 *  somebody worked. Reading one back costs no second mechanism — it becomes a
 *  log holding a single `checkpoint`, which already carries a whole graph.
 *
 *  The layout is part of the format. Definitions first, then the element tree,
 *  then relationships; elements nest under their parents, which deletes the
 *  most-referenced id from the file entirely and puts a diff hunk beside the
 *  thing it describes. Siblings sort by id, so renaming is one line rather than
 *  a record moving.
 *
 *  **A bundle carries other projects** under `projects`, keyed by id, so a
 *  single-project export that names outsiders still stands alone. A workspace
 *  export uses the same shape: the workspace graph is primary, every open
 *  project sits beside it once — nothing is nested inside anything else. */

import {
  ROOT, edge as newEdge, element as newElement, field as newField, refAt,
  type Definition, type Edge, type Element, type Field, type Graph,
} from "./types";

/** What a record looks like before anybody says anything about it. Anything
 *  still equal to one of these is left out of the file: writing it says nothing
 *  a reader could not work out, and puts a line in every future diff. */
const PLAIN_ELEMENT = newElement("");
const PLAIN_EDGE = newEdge("", "");
const PLAIN_FIELD = newField("");

/** Fields as they are written and read back: the same default rule as
 *  everything else, applied one level down. */
function fieldsOut(held: Field[] | undefined): unknown[] | undefined {
  return held?.length ? held.map((f) => said(f, PLAIN_FIELD)) : undefined;
}

function fieldsIn(held: unknown): Field[] {
  return Array.isArray(held) ? held.map((f) => ({ ...newField(""), ...(f as object) })) : [];
}

/** Which shape a file is. **Major must match; a higher minor is readable**, so
 *  a reader that knows 1.x opens a 1.3 file and skips what it does not know.
 *  Additive changes to the base cost a minor bump rather than a break. */
export const SCHEMA = "1.2";

/** Which module a project would like to be opened in. A preference and nothing
 *  more — what a project *is* is visible from what it holds — so it lives in
 *  `meta`, where a reader that ignores it loses nothing. An open string, not an
 *  enumeration: naming a new module must never be a format bump. */
export const MODULE = "block";

/** One companion project as it sits beside the primary in a multi-project file. */
export type Packed = {
  graph: Graph;
  meta?: { steps?: number; module?: string };
};

/** The base is what cannot be safely ignored — drop any of it and the file
 *  cannot be read, resolved, or drawn correctly. Everything else is `meta`,
 *  which a reader takes what it recognises from.
 *
 *  `projects` is additive (1.2): absent on a lone project; present when the
 *  file carries others so it stands alone, or when it is a workspace export. */
export type Envelope = {
  schema: string;
  id: string;
  graph: Graph;
  meta?: { steps?: number; module?: string; workspace?: boolean };
  projects?: Record<string, Packed>;
};

/** Only what somebody actually decided: no nulls, no empties, and nothing still
 *  at its default. A file the size of the choices in it, and a diff holding the
 *  lines that changed rather than the scaffolding around them. */
function said<T extends object>(it: T, plain: Record<string, unknown> = {}): Partial<T> {
  const out: Record<string, unknown> = {};

  // Sorted, because canonical has to mean canonical: the same graph reached by
  // two different routes builds its keys in whatever order each route happened
  // to, and the file would differ without a byte of meaning changing.
  for (const [key, value] of Object.entries(it).sort(([a], [b]) => a.localeCompare(b))) {
    const spare = value === undefined || value === null || value === "" ||
                  (Array.isArray(value) && !value.length) ||
                  value === plain[key];
    if (!spare) out[key] = value;
  }

  return out as Partial<T>;
}

/** One element as it is written: everything it says, minus what position in the
 *  file already says, plus whatever sits inside it. */
function branch(graph: Graph, node: Element): Record<string, unknown> {
  const { id: _id, parent: _parent, ...rest } = node;
  const here = kids(graph, node.id);
  const out = said(rest, PLAIN_ELEMENT) as Record<string, unknown>;
  const held = fieldsOut(node.fields);

  if (held) out.fields = held;
  if (Object.keys(here).length) out.holds = here;

  return out;
}

/** A layer's elements, keyed by id and ordered by it — a stable order that a
 *  rename does not disturb, unlike ordering by name. */
function kids(graph: Graph, parent: string | null): Record<string, unknown> {
  const here = Object.values(graph.elements)
    .filter((n) => n.id !== ROOT && (n.parent && graph.elements[n.parent] ? n.parent : null) === parent)
    .sort((a, b) => a.id.localeCompare(b.id));

  return Object.fromEntries(here.map((n) => [n.id, branch(graph, n)]));
}

/** Relationships, sorted by the ends they join. Neither key changes, so a
 *  record never moves once written. */
function wires(graph: Graph): Record<string, unknown> {
  const all = Object.values(graph.edges).sort((a, b) =>
    a.source.localeCompare(b.source) || a.target.localeCompare(b.target) ||
    a.id.localeCompare(b.id));

  return Object.fromEntries(all.map(({ id, fields, ...rest }) => {
    const out = said(rest, PLAIN_EDGE) as Record<string, unknown>;
    const held = fieldsOut(fields);
    if (held) out.fields = held;

    return [id, out];
  }));
}

/** The graph as it sits in a file — nested tree, defaults stripped. */
function graphOut(graph: Graph): Record<string, unknown> {
  const root = graph.elements[ROOT];
  const { id: _id, parent: _parent, ...rest } = root ?? newElement("");

  return {
    ...(graph.vocabulary ? { vocabulary: graph.vocabulary } : {}),
    defs: Object.fromEntries(
      Object.entries(graph.defs)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([at, def]) => {
          const { fields, ...rest } = def as Definition;
          const out = said(rest) as Record<string, unknown>;
          const held = fieldsOut(fields);
          if (held) out.fields = held;

          return [at, out];
        }),
    ),
    root: { ...said(rest, PLAIN_ELEMENT), holds: kids(graph, null) },
    edges: wires(graph),
  };
}

/** Put the tree back flat, taking each element's `parent` from where it sat. */
function flatten(held: unknown, parent: string | null, into: Record<string, Element>): void {
  if (!held || typeof held !== "object") return;

  for (const [id, raw] of Object.entries(held as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;

    const { holds, ...rest } = raw as Record<string, unknown>;
    // Whatever the file left out was still at its default, which is what the
    // factory supplies — the two halves of one rule.
    into[id] = { ...newElement(""), ...rest, id, parent, fields: fieldsIn(rest.fields) } as Element;
    flatten(holds, id, into);
  }
}

/** Nested file graph → flat Graph. */
function graphIn(held: Record<string, unknown>): Graph {
  const root = (held.root ?? {}) as Record<string, unknown>;
  const { holds, ...rest } = root;
  const elements: Record<string, Element> = {
    [ROOT]: { ...newElement(""), ...rest, id: ROOT, parent: null,
              fields: fieldsIn(rest.fields) } as Element,
  };

  flatten(holds, null, elements);

  const edges = Object.fromEntries(
    Object.entries((held.edges ?? {}) as Record<string, unknown>)
      .map(([id, e]) => {
        const raw = e as Record<string, unknown>;
        const out = { ...newEdge("", ""), ...raw, id } as Edge;
        if (raw.fields) out.fields = fieldsIn(raw.fields);

        return [id, out];
      }),
  );

  return {
    defs: Object.fromEntries(
      Object.entries((held.defs ?? {}) as Record<string, unknown>)
        .map(([at, d]) => {
          const raw = d as Record<string, unknown>;

          return [at, { name: "", form: "line", ...raw, id: at,
                        fields: fieldsIn(raw.fields) } as Definition];
        }),
    ),
    elements,
    edges,
    vocabulary: typeof held.vocabulary === "string" ? held.vocabulary : "",
  };
}

/** Project ids this graph names outside itself — proxies and path-shaped refs.
 *
 *  Order is sorted, so bundling the same graph always asks for the same set.
 *  Callers decide which of those ids they can actually carry (shipped packages
 *  stay with the app; only open projects need a seat in the file). */
export function needs(graph: Graph): string[] {
  const found = new Set<string>();
  const take = (ref: string | null | undefined) => {
    if (!ref) return;
    const { project } = refAt(ref);
    if (project) found.add(project);
  };

  for (const node of Object.values(graph.elements)) {
    take(node.of);
    take(node.type);
  }
  for (const edge of Object.values(graph.edges)) take(edge.type);
  for (const def of Object.values(graph.defs)) take(def.extends);

  return [...found].sort((a, b) => a.localeCompare(b));
}

/** Companion projects as they are written: sorted keys, each graph laid out
 *  the same way as the primary. */
function projectsOut(
  others: Record<string, { graph: Graph; steps: number }>,
): Record<string, unknown> | undefined {
  const ids = Object.keys(others).sort((a, b) => a.localeCompare(b));
  if (!ids.length) return undefined;

  return Object.fromEntries(ids.map((id) => {
    const held = others[id];

    return [id, {
      meta: { steps: held.steps, module: MODULE },
      graph: graphOut(held.graph),
    }];
  }));
}

/** The project as text. Pretty-printed, so it is valid JSON *and* diffs by
 *  line — the two are not in tension. Writing it changes nothing, so
 *  re-exporting an unchanged project produces a byte-identical file.
 *
 *  `others` is what a lone project bundles so it stands alone. Absent or empty
 *  leaves the file looking like a single envelope. */
export function write(
  graph: Graph,
  id: string,
  steps: number,
  others: Record<string, { graph: Graph; steps: number }> = {},
): string {
  const projects = projectsOut(others);

  return `${JSON.stringify({
    schema: SCHEMA,
    id,
    meta: { steps, module: MODULE },
    graph: graphOut(graph),
    ...(projects ? { projects } : {}),
  }, null, 2)}\n`;
}

/** The workspace as text: its own graph primary, every open project beside it.
 *
 *  Nothing is bundled *into* another project — each sits once under `projects`.
 *  `meta.workspace` tells import to restore the filing list rather than admit
 *  the primary as one more ordinary project. */
export function writeWorkspace(
  workspace: { id: string; graph: Graph; steps: number },
  open: Record<string, { graph: Graph; steps: number }>,
): string {
  const projects = projectsOut(open);

  return `${JSON.stringify({
    schema: SCHEMA,
    id: workspace.id,
    meta: { steps: workspace.steps, module: MODULE, workspace: true },
    graph: graphOut(workspace.graph),
    ...(projects ? { projects } : {}),
  }, null, 2)}\n`;
}

/** Whether this build can read a file of that schema. */
export function readable(schema: unknown): boolean {
  return typeof schema === "string" &&
         schema.split(".")[0] === SCHEMA.split(".")[0];
}

/** One packed companion from the file, or null when it is not a graph. */
function packedIn(raw: unknown): Packed | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const it = raw as Record<string, unknown>;
  if (!it.graph || typeof it.graph !== "object" || Array.isArray(it.graph)) return null;

  const meta = (it.meta ?? {}) as NonNullable<Packed["meta"]>;

  return {
    meta: { ...meta, module: meta.module ?? MODULE },
    graph: graphIn(it.graph as Record<string, unknown>),
  };
}

/** A file, back into a graph. Null where it is not one this build can read;
 *  what is merely missing is filled from the defaults instead. */
export function read(raw: unknown): Envelope | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const it = raw as Record<string, unknown>;
  if (!readable(it.schema) || !it.graph || typeof it.graph !== "object") return null;

  const meta = (it.meta ?? {}) as NonNullable<Envelope["meta"]>;
  const projects: Record<string, Packed> = {};

  if (it.projects && typeof it.projects === "object" && !Array.isArray(it.projects)) {
    for (const [id, row] of Object.entries(it.projects as Record<string, unknown>)) {
      if (!id || id === it.id) continue;
      const held = packedIn(row);
      if (held) projects[id] = held;
    }
  }

  return {
    schema: it.schema as string,
    id: typeof it.id === "string" ? it.id : "",
    // Before 1.1 the module sat in the base. Read from either, since a reader
    // that finds it in neither is only missing a preference.
    meta: {
      ...meta,
      module: meta.module ?? (typeof it.module === "string" ? it.module : MODULE),
      ...(meta.workspace ? { workspace: true } : {}),
    },
    graph: graphIn(it.graph as Record<string, unknown>),
    ...(Object.keys(projects).length ? { projects } : {}),
  };
}

/** A short hash of the canonical text, for telling apart two copies with the
 *  same step count.
 *
 *  **Computed, never stored.** A written-down hash disagrees with its own graph
 *  the moment anybody hand-edits the file, at which point it lies rather than
 *  merely being stale — and git hashes the file already, better. FNV-1a: this
 *  is an identifier, not a signature. */
export function hash(text: string): string {
  let out = 0x811c9dc5;

  for (let at = 0; at < text.length; at += 1) {
    out ^= text.charCodeAt(at);
    out = Math.imul(out, 0x01000193);
  }

  return (out >>> 0).toString(36).padStart(6, "0").slice(0, 6);
}

/** Whether this envelope is a workspace export (filing list, not a lone bundle). */
export function isWorkspace(held: Envelope): boolean {
  return Boolean(held.meta?.workspace);
}
