/** **Depth by density** (sets-plan.md, 2026-11-23): the library picked out of a `units` tree by
 *  opening it level by level, the largest branch first, while the drawing stays under a
 *  comfortable density. Nothing is dropped: a unit left closed keeps its contents as a count,
 *  and relations to them lift to it (`define`). The agent may name units to open first, or
 *  change the limits; never a level by hand. */

import { DENSE } from "./tools";


/** A unit as the `units` fact lists it. */
export type Unit = { unit?: string; name: string; kind?: string; lines?: number;
                     parts?: Unit[]; holds?: number; [k: string]: unknown };

/** **The comfortable density**: blocks in the whole library, and parts one opened unit shows.
 *  Defaults, changed by `--budget` and `--wide`. */
export const DENSITY = { budget: 48, wide: 12 };

/** The least parts worth opening a unit for (core `LEAST`: below it the unit says them). */
const LEAST = 3;

/** What the library opens to: limits and the units to open first. */
export type Dials = { budget?: number; wide?: number; focus?: string[] };


/** **The units tree opened by density**: top units always shown; then, largest first, each
 *  unit whose parts fit `wide` and the `budget` opened; one named in `focus` (or holding one)
 *  opened first and past `wide`. A unit left closed says how many parts it holds. */
export function opened(tops: Unit[], dials: Dials = {}): Unit[] {
  const budget = dials.budget ?? DENSITY.budget;
  const wide = dials.wide ?? DENSITY.wide;
  const focus = dials.focus ?? [];
  const aimed = (u: Unit) => focus.some((f) => key(u) === f || key(u).startsWith(`${f}.`)
    || f.startsWith(`${key(u)}.`));
  // One top unit holding parts is opened at once: its parts are the library's first level
  const shown = tops.length === 1 && (tops[0]!.parts?.length ?? 0) >= 1 ? [tops[0]!] : [];
  const open = new Set<Unit>(shown);
  let count = tops.length + shown.reduce((n, u) => n + (u.parts?.length ?? 0), 0);
  const closed = () => [...tops, ...[...open].flatMap((u) => u.parts ?? [])]
    .filter((u) => !open.has(u) && (u.parts?.length ?? 0) >= LEAST);
  for (;;) {
    // Aimed first, then the largest; one past `wide` or the budget stays closed
    const next = closed().filter((u) => aimed(u)
      || ((u.parts!.length <= wide) && count + u.parts!.length <= budget))
      .sort((a, z) => Number(aimed(z)) - Number(aimed(a)) || (z.lines ?? 0) - (a.lines ?? 0))[0];
    if (!next) break;
    open.add(next);
    count += next.parts!.length;
  }
  return tops.map((u) => pruned(u, open));
}

/** A unit as opened: its parts where open, else none and their count. */
function pruned(u: Unit, open: Set<Unit>): Unit {
  const { parts, ...rest } = u;
  if (!parts?.length) return rest;
  if (!open.has(u)) return { ...rest, holds: parts.length };
  return { ...rest, parts: parts.map((p) => pruned(p, open)) };
}

/** How many blocks an opened tree shows. */
export function shown_count(tops: Unit[]): number {
  return tops.reduce((n, u) => n + 1 + shown_count(u.parts ?? []), 0);
}

/** A unit's key: its dotted name, else its name. */
function key(u: Unit): string {
  return u.unit ?? u.name;
}

/** A relation between two units, as `imports` lists it: `n` how many imports make it. */
export type Link = { from: string; to: string; n?: number };

/** **Lines at a comfortable density** (2026-11-23: the density rule covers lines too): each
 *  relation lifted to the units opened, the same pair summed, then in each view (the nearest
 *  unit holding both ends) only the strongest kept, up to the drawing ceiling: `lines`, or
 *  `per` a part where that is more. */
export function thinned(links: Link[], tops: Unit[], ceiling = DENSE): Link[] {
  const keys = new Map<string, Unit>();
  const up = new Map<string, string>();
  const walk = (u: Unit, holder: string) => {
    keys.set(key(u), u);
    up.set(key(u), holder);
    for (const p of u.parts ?? []) walk(p, key(u));
  };
  for (const t of tops) walk(t, "");
  const lift = (name: string) => {
    for (let at = name; at; at = at.includes(".") ? at.slice(0, at.lastIndexOf(".")) : "") {
      if (keys.has(at)) return at;
    }
    return undefined;
  };
  const above = (u: string): string[] => (u ? [u, ...above(up.get(u) ?? "")] : []);
  const summed = new Map<string, Link>();
  for (const l of links) {
    const [a, b] = [lift(l.from), lift(l.to)];
    if (!a || !b || above(a).includes(b) || above(b).includes(a)) continue;
    const k = `${a}|${b}`;
    const had = summed.get(k);
    summed.set(k, { from: a, to: b, n: (had?.n ?? 0) + (l.n ?? 1) });
  }
  // Each view: the nearest unit holding both ends, its parts counted
  const view = (l: Link) => above(up.get(l.from) ?? "").find((u) => above(l.to).includes(u)) ?? "";
  const by = new Map<string, Link[]>();
  for (const l of summed.values()) by.set(view(l), [...(by.get(view(l)) ?? []), l]);
  return [...by].flatMap(([v, ls]) => {
    const parts = v ? keys.get(v)?.parts?.length ?? 0 : tops.length;
    const most = Math.max(ceiling.lines, Math.floor(parts * ceiling.per));
    return [...ls].sort((a, z) => (z.n ?? 0) - (a.n ?? 0)).slice(0, most);
  });
}
