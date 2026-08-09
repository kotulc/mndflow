/** Keeping the step log across refreshes.
 *
 *  With no server, the tab *is* the process — a stray reload would otherwise
 *  be indistinguishable from losing the project. The log is the only thing
 *  saved, because everything else is folded from it.
 *
 *  Storage failures are never fatal to the session — but they are never
 *  silent either. A log that has outgrown the quota goes on working until the
 *  tab is closed and then loses everything since the failure, so `save` reports
 *  whether it worked and the shell says so. */

import { newId, type Step } from "./types";

const KEY = "mndflow.steps.v1";
const ID = "mndflow.project.v1";

/** Which project this browser is holding, minted once and kept for life.
 *
 *  Lives beside the log rather than in it: it is what a cross-project reference
 *  points at, so renaming a project — or its file — has to break nothing. Taken
 *  from an imported file where one names itself. */
export function projectId(): string {
  try {
    const held = localStorage.getItem(ID);
    if (held) return held;

    const fresh = newId("proj");
    localStorage.setItem(ID, fresh);

    return fresh;
  } catch {
    return newId("proj");
  }
}

/** Adopt the id an imported file carries, so a project keeps its identity
 *  across the round trip. */
export function adoptId(id: string): void {
  try {
    if (id) localStorage.setItem(ID, id);
  } catch {
    // Identity lost, nothing more.
  }
}

/** What storage holds, unchecked. The caller takes it through the door. */
export function load(): unknown {
  try {
    const raw = localStorage.getItem(KEY);

    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Whether the log reached storage. False means out of quota or blocked by the
 *  browser: the session carries on, and the only copy is now the tab. */
export function save(steps: Step[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(steps));

    return true;
  } catch {
    return false;
  }
}

/** Hand the project to the user as a file — the graph, laid out by `file`.
 *  The name follows the project's own, so the two cannot drift apart. */
export function download(text: string, title: string): void {
  const name = (title || "mndflow").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${name}.mndflow.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** The raw contents of a file, parsed and no more. Whether it is something this
 *  build can read is decided at the door — see `check.entering`. */
export function readFile(text: string): unknown {
  try {
    return JSON.parse(text);
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
