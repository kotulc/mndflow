/** Names in place of ids: what a word a person or a file writes stands for.
 *
 *  A **path** `a::b::c` walks names down, from the package root its first step names, else from
 *  where it is read. A **definition** is named by its id, by `pkg.name` in that package
 *  (`base.folder` is the bare `folder`), or by its bare name in the packages a reader lists, then
 *  `base`. Names are unique among siblings, so a path finds one block; a bare name that more than
 *  one package holds finds none. */

import { all_defs, def_at, domain_of, package_of, type Domain } from "./defs";
import { children } from "./tree";
import { BASE_PACKAGE, type Graph, type Id } from "./types";

/** What separates the steps of a path. */
export const STEP = "::";


/** Whether a word is a path of names, rather than one name. */
export function is_path(word: string): boolean {
  return word.includes(STEP);
}

/** The block a path of names reaches: from the package root its first step names, where it
 *  names one and more steps follow, else from `from`'s children. */
export function path_to(graph: Graph, path: string, from: Id | null = null): Id | undefined {
  const steps = path.split(STEP).map((s) => s.trim());
  const root = steps.length > 1
    ? children(graph, null).find((r) => r.id === steps[0] || r.name === steps[0]) : undefined;
  let at: Id | null | undefined = root ? root.id : from;
  for (const step of root ? steps.slice(1) : steps) {
    at = children(graph, at ?? null).find((b) => (b.name ?? "").trim() === step)?.id;
    if (!at) return undefined;
  }
  return at ?? undefined;
}

/** The definition a word names: an id; `pkg.name`, in that package; or a bare name, in the
 *  packages `within` lists and `base`, else anywhere loaded. Only one may answer: a name more
 *  than one package holds names none. `fits` narrows what may answer. */
export function def_ref(graph: Graph, word: string,
                        { within, fits = () => true }: Ref = {}): Id | undefined {
  const said = word.trim();
  if (def_at(graph, said) && fits(said)) return said;
  const named = (pkg: Id | undefined, name: string) => all_defs(graph).filter((d) =>
    d.name === name && fits(d.id) && (pkg === undefined || package_of(graph, d.id) === pkg));

  /** `pkg.name`: the package by its root's id or name. */
  const dot = said.indexOf(".");
  if (dot > 0) {
    const head = said.slice(0, dot);
    const pkg = children(graph, null).find((r) => r.id === head || r.name === head)?.id;
    if (pkg) {
      const hits = named(pkg, said.slice(dot + 1));
      return hits.length === 1 ? hits[0]!.id : undefined;
    }
  }
  const scope = within?.length ? [...within, BASE_PACKAGE] : undefined;
  const hits = named(undefined, said)
    .filter((d) => !scope || scope.includes(package_of(graph, d.id)));
  return hits.length === 1 ? hits[0]!.id : undefined;
}

/** How a definition is looked for: in which packages, and what may answer. */
export type Ref = { within?: readonly Id[]; fits?: (id: Id) => boolean };

/** What may answer a word for an element of this domain. */
export function fits_domain(graph: Graph, domain: Domain): (id: Id) => boolean {
  return (id) => !!def_at(graph, id) && domain_of(graph, id) === domain;
}
