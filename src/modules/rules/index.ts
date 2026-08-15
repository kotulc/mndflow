/** The rules component: checks governing how usages interact.
 *
 *  Four kinds — `ends`, `holds`, `degree`, `match` — each a lookup, a count
 *  or a single fixed comparison. A constraint bounds a thing in itself and
 *  lives under `constraints`; this module owns how things meet.
 *
 *  It reads its own key under a definition's `components` and no other's.
 *  Declared on a definition, holding over every usage. A rule naming a
 *  definition reaches every subtype of it, via `isa` — that is what makes an
 *  imported standard worth importing.
 *
 *  Advising in the tray and refusing at translation are the surface's; this
 *  module owns the shape and what it means to ask. */

import type { Component, Config } from "../index";
import { isa } from "../../graph/fold";
import type { Element, Flow, Graph } from "../../graph/types";

/** Port directions an `ends` rule may ask for. Same closed set as an
 *  interface's `flow`. */
const PORTS: readonly Flow[] = ["in", "out", "both"];

/** Which definitions may sit at each end of a relationship, and optionally
 *  which port direction each end's interface must carry. */
export type EndsRule = {
  from: string[];
  to: string[];
  /** Required flow on the interface at the from / to end. Absent means any. */
  fromPort?: Flow;
  toPort?: Flow;
};

/** How many relationships may meet a usage, as least and most. `null` is no
 *  limit on that side of the bound. */
export type Bound = [number | null, number | null];

export type DegreeRule = {
  in?: Bound;
  out?: Bound;
};

export type RulesConfig = {
  /** On a *relationship* definition: who may sit at each end. */
  ends: EndsRule;
  /** Which definitions this one may contain as children in the tree. */
  holds: string[];
  /** How many relationships may meet a usage, counted in and out. */
  degree: DegreeRule;
  /** Field names that must agree across a relationship's two ends. */
  match: string[];
};

/** What every definition that says nothing gets: no rule of any kind. */
export const NONE: RulesConfig = {
  ends: { from: [], to: [] },
  holds: [],
  degree: {},
  match: [],
};

/** A list of definition ids or field names, or the reason it is not. */
function names(label: string, value: unknown): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value) && value.every((n) => typeof n === "string")) return null;

  return `\`${label}\` has to be a list of names`;
}

/** One closed port direction, or the reason it is not. */
function port(label: string, value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value === "string" && (PORTS as readonly string[]).includes(value)) return null;

  return `\`${label}\` has to be one of ${PORTS.join(", ")}`;
}

/** A [least, most] bound, either side nullable, or the reason it is not. */
function bound(label: string, value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length !== 2) {
    return `\`${label}\` has to be a [least, most] pair`;
  }

  const [lo, hi] = value;
  const ok = (n: unknown) => n === null || (typeof n === "number" && Number.isFinite(n));
  if (!ok(lo) || !ok(hi)) {
    return `\`${label}\` bounds have to be numbers or null`;
  }
  if (typeof lo === "number" && typeof hi === "number" && lo > hi) {
    return `\`${label}\` least cannot exceed most`;
  }

  return null;
}

/** Why this configuration would not work, in words, or null.
 *
 *  An unknown key is refused rather than ignored. A component owning its key
 *  owns the whole of it — a misspelt `degee` is a mistake this build can see,
 *  unlike an unknown *component*, which may be a newer build's. */
function check(config: Config): string | null {
  if (config.ends !== undefined) {
    if (config.ends === null || typeof config.ends !== "object" || Array.isArray(config.ends)) {
      return "`rules.ends` has to name from and to";
    }
    const ends = config.ends as Record<string, unknown>;
    // from and to are the rule; ports are optional. Absent lists are not a
    // partial — they have to be written, empty if the end allows nobody.
    if (ends.from === undefined) return "`rules.ends.from` has to be a list of names";
    if (ends.to === undefined) return "`rules.ends.to` has to be a list of names";
    const wrong = names("rules.ends.from", ends.from)
      ?? names("rules.ends.to", ends.to)
      ?? port("rules.ends.fromPort", ends.fromPort)
      ?? port("rules.ends.toPort", ends.toPort);
    if (wrong) return wrong;

    const known = new Set(["from", "to", "fromPort", "toPort"]);
    const stray = Object.keys(ends).filter((key) => !known.has(key));
    if (stray.length) return `\`rules.ends\` knows nothing about \`${stray[0]}\``;
  }

  const holds = names("rules.holds", config.holds);
  if (holds) return holds;

  if (config.degree !== undefined) {
    if (config.degree === null || typeof config.degree !== "object" || Array.isArray(config.degree)) {
      return "`rules.degree` has to name in and out bounds";
    }
    const degree = config.degree as Record<string, unknown>;
    const wrong = bound("rules.degree.in", degree.in) ?? bound("rules.degree.out", degree.out);
    if (wrong) return wrong;

    const known = new Set(["in", "out"]);
    const stray = Object.keys(degree).filter((key) => !known.has(key));
    if (stray.length) return `\`rules.degree\` knows nothing about \`${stray[0]}\``;
  }

  const match = names("rules.match", config.match);
  if (match) return match;

  const stray = Object.keys(config).filter((key) => !(key in NONE));

  return stray.length ? `\`rules\` knows nothing about \`${stray[0]}\`` : null;
}

export const rules: Component = { name: "rules", check };

/** What this element's definition says about how its usages interact.
 *
 *  Per definition and never per element. A definition that extends another
 *  does not yet inherit its rules — SC.3 is what merges the chain, and until
 *  then a subtype stands on its own. Reach across the chain is `among`, which
 *  walks `isa` rather than copying the parent's configuration. */
export function rulesOf(graph: Graph, element: Element): RulesConfig {
  const config = graph.defs[element.type]?.components?.rules;
  if (!config) return NONE;

  const ends = config.ends as EndsRule | undefined;

  return {
    ...NONE,
    ...config,
    ends: ends ? { ...NONE.ends, ...ends } : NONE.ends,
    degree: config.degree
      ? { ...NONE.degree, ...(config.degree as DegreeRule) }
      : NONE.degree,
  } as RulesConfig;
}

/** Whether a definition is one of the named ones, or refines one of them.
 *
 *  What every allow-list on a rule means by "a definition": the name, and
 *  everything below it. Without that, an imported standard reaches only its
 *  own definitions and nothing anybody models. */
export function among(graph: Graph, def: string, named: string[]): boolean {
  return named.some((ancestor) => isa(graph, def, ancestor));
}