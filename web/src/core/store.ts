/** Keeping the step log across refreshes.
 *
 *  With no server, the tab *is* the process — a stray reload would otherwise
 *  be indistinguishable from losing the project. The log is the only thing
 *  saved, because everything else is folded from it.
 *
 *  Storage failures are never fatal: a full or blocked localStorage costs
 *  persistence, not the session. */

import type { Step } from "./types";

const KEY = "mndflow.steps.v1";

export function load(): Step[] {
  try {
    const raw = localStorage.getItem(KEY);
    const steps = raw ? JSON.parse(raw) : [];

    return Array.isArray(steps) ? (steps as Step[]) : [];
  } catch {
    return [];
  }
}

export function save(steps: Step[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(steps));
  } catch {
    // Out of quota or blocked by the browser; the session carries on regardless.
  }
}

/** Hand the whole history to the user as a file. Steps, not the graph — what
 *  is exported rebuilds the project including everything undone. */
export function exportSteps(steps: Step[], title: string): void {
  const name = (title || "mndflow").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const blob = new Blob([JSON.stringify(steps, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}.mndflow.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Read a previously exported history back. Rejects anything that is not a
 *  list of steps rather than half-loading it. */
export function importSteps(text: string): Step[] | null {
  try {
    const parsed = JSON.parse(text);
    const ok = Array.isArray(parsed) && parsed.every((s) => s && Array.isArray(s.mutations));

    return ok ? (parsed as Step[]) : null;
  } catch {
    return null;
  }
}

/** Display preferences. Global to the app rather than to a project: they
 *  change nothing in the graph, appear in no export, and record no history,
 *  so they have no business in the step log. */
function flag(key: string, fallback: boolean) {
  const name = `mndflow.${key}.v1`;
  const initial = (() => {
    try {
      const raw = localStorage.getItem(name);

      return raw === null ? fallback : raw === "true";
    } catch {
      return fallback;
    }
  })();

  return {
    initial,
    set(on: boolean) {
      try {
        localStorage.setItem(name, String(on));
      } catch {
        // Preference lost, nothing more.
      }
    },
  };
}

/** Right-angled relations instead of curves. */
export const angular = flag("angular", false);
/** Interfaces drawn on the canvas — on by default; off reads the structure
 *  alone, with relations still meeting the frame edge where a port would be. */
export const ports = flag("ports", true);
/** Interfaces listed in the object explorer — off by default, since the tree
 *  is for structure and a port per relation would bury it. */
export const treePorts = flag("tree-ports", false);
