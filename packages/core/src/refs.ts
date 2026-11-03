/** Names in place of ids: what a word a person or a file writes stands for.
 *
 *  **One separator, `.`**, as Python's. A **path** `a.b.c` walks names down, from the package
 *  root its first step names, else from where it is read. A **definition** is named by its id; by
 *  a qualified name, `pkg.name` or `pkg.folder.name`, in that package (`base.folder` is the bare
 *  `folder`); or by its bare name, looked for in order — the packages a reader lists, its own
 *  first, then `base` — and nowhere else. A name found twice at the first step it is found in
 *  finds none: it is ambiguous, and qualifying it settles it. */

import { all_defs, def_at, domain_of, package_of, type Domain } from "./defs";
import { children } from "./tree";
import { BASE_PACKAGE, type Graph, type Id } from "./types";

/** What separates the steps of a path. */
export const STEP = ".";


/** Whether a word is a path of names, rather than one name. */
export function is_path(word: string): boolean {
  return word.includes(STEP);
}

/** A word's steps, each trimmed. */
export function steps_of(word: string): string[] {
  return word.split(STEP).map((s) => s.trim());
}

/** The package root a word's first step names, where more steps follow. */
export function package_named(graph: Graph, word: string): Id | undefined {
  const steps = steps_of(word);
  if (steps.length < 2) return undefined;
  return children(graph, null).find((r) => r.id === steps[0] || r.name === steps[0])?.id;
}

/** The block a path of names reaches: from the package root its first step names, where it
 *  names one and more steps follow, else from `from`'s children. */
export function path_to(graph: Graph, path: string, from: Id | null = null): Id | undefined {
  const steps = steps_of(path);
  const root = package_named(graph, path);
  let at: Id | null | undefined = root ?? from;
  for (const step of root ? steps.slice(1) : steps) {
    at = children(graph, at ?? null).find((b) => (b.name ?? "").trim() === step)?.id;
    if (!at) return undefined;
  }
  return at ?? undefined;
}

/** Every definition a word may name, at the first place it is found: a qualified name in its
 *  package, by path or by name; else a bare name in each package `within` lists, in order, then
 *  `base` — or, `within` unsaid, anywhere; else its id. More than one is ambiguous. `fits`
 *  narrows what may answer. */
export function def_hits(graph: Graph, word: string,
                         { within, fits = () => true }: Ref = {}): Id[] {
  const said = word.trim();
  const named = (pkg: Id | undefined, name: string) => all_defs(graph).filter((d) =>
    d.name === name && fits(d.id) && (pkg === undefined || package_of(graph, d.id) === pkg))
    .map((d) => d.id);

  /** Qualified: a path from the package's root, else a definition of that name in it. */
  const pkg = package_named(graph, said);
  if (pkg) {
    const at = path_to(graph, said);
    if (at && def_at(graph, at) && fits(at)) return [at];
    const hits = named(pkg, steps_of(said).slice(1).join(STEP));
    if (hits.length) return hits;
  }
  else if (!within) {
    const hits = named(undefined, said);
    if (hits.length) return hits;
  }
  else {
    for (const scope of [...new Set([...within, BASE_PACKAGE])]) {
      const hits = named(scope, said);
      if (hits.length) return hits;
    }
  }
  /** Last, an id: `base`'s are its bare names, so a name a listed package holds comes first. */
  return def_at(graph, said) && fits(said) ? [said] : [];
}

/** The one definition a word names, else nothing (`def_hits`). */
export function def_ref(graph: Graph, word: string, ref: Ref = {}): Id | undefined {
  const hits = def_hits(graph, word, ref);
  return hits.length === 1 ? hits[0] : undefined;
}

/** The named components — types, tags, interfaces, constraints — a word may name, as `def_hits`
 *  looks: its id, `pkg.name` (the package by its root's id or name), else in each package
 *  `within` lists, in order, then `base`. */
export function component_hits(graph: Graph, held: readonly { id: Id; name: string; pkg: Id }[],
                               word: string, within: readonly Id[]): Id[] {
  const said = word.trim();
  const id = held.find((c) => c.id === said);
  if (id) return [id.id];
  const pkg = package_named(graph, said);
  if (pkg) {
    const name = steps_of(said).slice(1).join(STEP);
    const hits = held.filter((c) => c.pkg === pkg && c.name === name);
    if (hits.length) return hits.map((c) => c.id);
  }
  for (const scope of [...new Set([...within, BASE_PACKAGE])]) {
    const hits = held.filter((c) => c.pkg === scope && c.name === said);
    if (hits.length) return hits.map((c) => c.id);
  }
  return [];
}

/** How a definition is looked for: in which packages, in order, and what may answer. */
export type Ref = { within?: readonly Id[]; fits?: (id: Id) => boolean };

/** What may answer a word for an element of this domain. */
export function fits_domain(graph: Graph, domain: Domain): (id: Id) => boolean {
  return (id) => !!def_at(graph, id) && domain_of(graph, id) === domain;
}
