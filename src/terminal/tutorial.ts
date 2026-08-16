/** Tutorial walk over the sample project, for the open rail.
 *
 *  The copy lives in `samples/tutorial.json` — hand-authored steps keyed to
 *  landmarks in `samples/mndflow.json`. Speaks only when that sample is the
 *  project in context; advances as selection and layer match each step. Never
 *  moves context — the explorer and the pointer navigate. */

import type { Context } from "../actions";
import { ROOT } from "../graph/types";

type Step = {
  at: string | null;
  say: string;
  next: string;
};

type Pack = {
  project: string;
  kind: string;
  steps: Step[];
};

/** Bundled at build time the same way docs.json is — no runtime fetch. */
const pack = import.meta.glob("../../samples/tutorial.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

function as_pack(value: unknown): Pack | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.project !== "string" || !raw.project.trim()) return null;
  if (!Array.isArray(raw.steps)) return null;

  const steps: Step[] = [];
  for (const row of raw.steps) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const it = row as Record<string, unknown>;
    if (typeof it.say !== "string" || !it.say.trim()) continue;
    if (it.at != null && typeof it.at !== "string") continue;
    const at = typeof it.at === "string" && it.at.trim() ? it.at.trim() : null;
    steps.push({
      at,
      say: it.say.trim(),
      next: typeof it.next === "string" ? it.next.trim() : "",
    });
  }
  if (!steps.length) return null;

  return {
    project: raw.project.trim(),
    kind: typeof raw.kind === "string" ? raw.kind.trim() : "",
    steps,
  };
}

const TUTORIAL = as_pack(Object.values(pack)[0]);

/** Landmarks most-specific first: pick, then ancestors, then open layer, then root. */
function landmarks(ctx: Context): Array<string | null> {
  const out: Array<string | null> = [];
  const seen = new Set<string | null>();

  function push(id: string | null) {
    if (seen.has(id)) return;
    seen.add(id);
    out.push(id);
  }

  if (ctx.picked?.kind === "node") {
    let at: string | null = ctx.picked.id;
    while (at && at !== ROOT) {
      push(at);
      at = ctx.graph.elements[at]?.parent ?? null;
    }
  } else if (ctx.picked?.kind === "edge") {
    push(ctx.picked.id);
    push("edge");
  }

  if (ctx.view && ctx.view !== ROOT) push(ctx.view);
  push(null);
  return out;
}

function lines(step: Step): string[] {
  return step.next ? [step.say, step.next] : [step.say];
}

/** Walk tips for what is underfoot in the sample, or empty when not that project. */
export function walk_for(ctx: Context): string[] {
  if (!TUTORIAL) return [];
  if (ctx.project !== TUTORIAL.project) return [];

  const by_at = new Map<string | null, Step>();
  for (const step of TUTORIAL.steps) {
    if (!by_at.has(step.at)) by_at.set(step.at, step);
  }

  for (const at of landmarks(ctx)) {
    const step = by_at.get(at);
    if (step) return lines(step);
  }
  return [];
}
