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

const SHAPE = "mndflow.angular.v1";

/** Whether relations are drawn with right angles. A view preference, kept out
 *  of the step log — how something is drawn is not a change to the project. */
export const angular = (() => {
  try {
    return localStorage.getItem(SHAPE) === "true";
  } catch {
    return false;
  }
})();

export function setAngular(on: boolean): void {
  try {
    localStorage.setItem(SHAPE, String(on));
  } catch {
    // Preference lost, nothing more.
  }
}
