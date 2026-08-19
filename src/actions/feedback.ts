/** Overruling the ranked default is the feedback a consumer of `rank.ts`
 *  learns from.
 *
 *  Arrow keys move the highlight and Enter confirms it (`terminal/Chat.tsx`).
 *  Taking anything other than the first-ranked chip is an overrule — recorded
 *  here, local, never in the log. `rank.ts` reads the store for two-tier
 *  learning. */

import type { Context } from "./index";

/** One overrule — enough for Z.3's two tiers without inventing the learner. */
export type Overrule = {
  /** Action taken instead of the ranked default. */
  chose: string;
  /** What ranking put first. */
  ranked: string;
  /** Typed text at the take — the literal entry tier. */
  entry: string;
  /** Situation shape — preference is weighted per shape, not per element. */
  shape: string;
};

const KEY = "mndflow.rail.feedback.v1";
/** Soft cap so an unused learner cannot grow the store without bound. */
const CAP = 200;

/** Abstract situation the preference keys on — form / kind, never an id. */
export function shape_of(ctx: Context): string {
  if (!ctx.picked) return ctx.view ? "layer" : "project";
  if (ctx.picked.kind === "edge") return "edge";
  if (ctx.picked.kind === "attr") return "attr";

  const node = ctx.graph.elements[ctx.picked.id];
  if (!node) return "element";
  if (node.side != null) return "interface";
  return node.form;
}

/** Append one overrule. Silent when storage refuses. */
export function note(hit: Overrule): void {
  try {
    const next = [...read(), hit].slice(-CAP);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Preference lost, nothing more.
  }
}

/** What has been overruled so far — ranking's input. */
export function read(): Overrule[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: Overrule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.chose !== "string") continue;
      if (typeof row.ranked !== "string") continue;
      if (typeof row.entry !== "string") continue;
      if (typeof row.shape !== "string") continue;
      out.push({
        chose: row.chose,
        ranked: row.ranked,
        entry: row.entry,
        shape: row.shape,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** How often each choice was taken when overruling, for one situation shape.
 *
 *  The one place the store is counted: the action ranking (`rank.ts`) and the
 *  type list (`typelist.ts`) both weight by shape, and two copies of this
 *  drifting apart is the whole reason it sits with the store it reads. */
export function weights(shape: string): Map<string, number> {
  const out = new Map<string, number>();

  for (const hit of read()) {
    if (hit.shape !== shape) continue;
    out.set(hit.chose, (out.get(hit.chose) ?? 0) + 1);
  }

  return out;
}
