/** The storage seam: one key per project, workspace held apart.
 *
 *  Properties only — nothing asserts a particular id, key string, or payload
 *  shape that a later row is free to refine. */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  adoptId, clearPressure, load, loadProject, loadWorkspace, pressureNote,
  projectId, save, saveProject, saveWorkspace, watchPressure,
} from "./store";
import { EMPTY, step, type Step } from "./types";

/** An in-memory localStorage so the suite does not need a browser. */
function memory(limit?: number): Storage {
  const held = new Map<string, string>();
  const size = () => [...held.values()].reduce((n, v) => n + v.length, 0);

  return {
    get length() { return held.size; },
    clear() { held.clear(); },
    getItem(key: string) { return held.has(key) ? held.get(key)! : null; },
    setItem(key: string, value: string) {
      const next = String(value);
      const prior = held.get(key)?.length ?? 0;
      if (limit !== undefined && size() - prior + next.length > limit) {
        throw new DOMException("quota", "QuotaExceededError");
      }
      held.set(key, next);
    },
    removeItem(key: string) { held.delete(key); },
    key(index: number) { return [...held.keys()][index] ?? null; },
  };
}

const sample = (tag: string): Step[] => [step(tag, "test", [])];

/** An import-shaped log: one checkpoint, nothing somebody did. */
const imported = (tag: string): Step[] => [
  step(tag, "checkpoint", [{ op: "checkpoint", graph: EMPTY, at: 0 }]),
];

/** A long log — enough history that collapsing it frees measurable space. */
function lengthy(tag: string, n: number): Step[] {
  return Array.from({ length: n }, (_, i) => step(`${tag}-${i}`, "test", []));
}

beforeEach(() => {
  clearPressure();
  Object.defineProperty(globalThis, "localStorage", {
    value: memory(), configurable: true, writable: true,
  });
});

afterEach(() => {
  clearPressure();
  Object.defineProperty(globalThis, "localStorage", {
    value: undefined, configurable: true, writable: true,
  });
});

describe("one entry per project", () => {
  it("keeps two projects' logs apart", () => {
    const a = sample("a");
    const b = sample("b");
    saveProject("proj_a", a);
    saveProject("proj_b", b);

    expect(loadProject("proj_a")).toEqual(a);
    expect(loadProject("proj_b")).toEqual(b);
  });

  it("round-trips a log through its own key", () => {
    const log = sample("kept");

    expect(saveProject("proj_x", log)).toBe(true);
    expect(loadProject("proj_x")).toEqual(log);
  });

  it("treats a missing key as an empty log, never as another project's", () => {
    saveProject("proj_a", sample("a"));

    expect(loadProject("proj_missing")).toEqual([]);
  });
});

describe("workspace storage is not a project log", () => {
  it("writing the workspace leaves every project key untouched", () => {
    const log = sample("a");
    saveProject("proj_a", log);
    saveWorkspace({ projects: ["proj_a"] });

    expect(loadProject("proj_a")).toEqual(log);
    expect(loadWorkspace()).toEqual({ projects: ["proj_a"] });
  });

  it("writing a project leaves the workspace untouched", () => {
    saveWorkspace({ projects: ["proj_a"] });
    saveProject("proj_a", sample("a"));

    expect(loadWorkspace()).toEqual({ projects: ["proj_a"] });
  });

  it("reports absence when nothing has been filed", () => {
    expect(loadWorkspace()).toBeNull();
  });
});

describe("the session still has one project", () => {
  it("load and save use the held project id", () => {
    const id = projectId();
    const log = sample("session");

    expect(save(log)).toBe(true);
    expect(load()).toEqual(log);
    expect(loadProject(id)).toEqual(log);
  });

  it("adopting an id retargets the session without touching other keys", () => {
    const old = sample("old");
    const next = sample("new");
    saveProject("proj_old", old);
    adoptId("proj_new");
    save(next);

    expect(projectId()).toBe("proj_new");
    expect(loadProject("proj_old")).toEqual(old);
    expect(loadProject("proj_new")).toEqual(next);
  });
});

describe("the pre-keyed log", () => {
  it("moves into the session project's slot and is not read twice", () => {
    const legacy = sample("legacy");
    localStorage.setItem("mndflow.steps.v1", JSON.stringify(legacy));
    localStorage.setItem("mndflow.project.v1", "proj_kept");

    expect(load()).toEqual(legacy);
    expect(localStorage.getItem("mndflow.steps.v1")).toBeNull();
    expect(loadProject("proj_kept")).toEqual(legacy);
  });
});

describe("a key appears on the first change", () => {
  it("does not store an empty log", () => {
    expect(saveProject("proj_fresh", [])).toBe(true);
    expect(localStorage.getItem("mndflow.steps.proj_fresh.v1")).toBeNull();
    expect(loadProject("proj_fresh")).toEqual([]);
  });

  it("does not store an import that nobody has touched", () => {
    expect(saveProject("proj_import", imported("opened"))).toBe(true);
    expect(localStorage.getItem("mndflow.steps.proj_import.v1")).toBeNull();
  });

  it("stores the log once something somebody did is in it", () => {
    expect(saveProject("proj_work", sample("changed"))).toBe(true);
    expect(localStorage.getItem("mndflow.steps.proj_work.v1")).not.toBeNull();
  });

  it("keeps writing after a key already exists, even for a later pristine shape", () => {
    saveProject("proj_work", sample("changed"));
    const back = imported("back");
    expect(saveProject("proj_work", back)).toBe(true);
    expect(loadProject("proj_work")).toEqual(back);
  });
});

/** Quota just shy of holding both logs, so the second write must relieve. */
function underPressure(idle: Step[], active: Step[]) {
  const room = JSON.stringify(idle).length + JSON.stringify(active).length - 50;
  Object.defineProperty(globalThis, "localStorage", {
    value: memory(room), configurable: true, writable: true,
  });
}

describe("under pressure the untouched give up history", () => {
  it("checkpoints other projects so the one being worked in still saves", () => {
    const idle = lengthy("idle", 100);
    const active = lengthy("active", 30);
    underPressure(idle, active);

    expect(saveProject("proj_idle", idle)).toBe(true);
    const before = localStorage.getItem("mndflow.steps.proj_idle.v1")!.length;

    expect(saveProject("proj_active", active)).toBe(true);

    const after = localStorage.getItem("mndflow.steps.proj_idle.v1")!;
    expect(after.length).toBeLessThan(before);
    expect(loadProject("proj_active")).toEqual(active);

    const held = loadProject("proj_idle") as Step[];
    expect(held).toHaveLength(1);
    expect(held[0].mutations[0]?.op).toBe("checkpoint");
  });

  it("leaves a note distinct from a failed save", () => {
    const idle = lengthy("idle", 100);
    const active = lengthy("active", 30);
    underPressure(idle, active);

    const heard: (string | null)[] = [];
    const stop = watchPressure((next) => heard.push(next));

    saveProject("proj_idle", idle);
    expect(pressureNote()).toBeNull();

    expect(saveProject("proj_active", active)).toBe(true);
    expect(pressureNote()).not.toBeNull();
    expect(pressureNote()).not.toMatch(/not being saved/);
    expect(heard.at(-1)).toBe(pressureNote());

    clearPressure();
    expect(pressureNote()).toBeNull();
    stop();
  });

  it("does not checkpoint the project being saved", () => {
    const idle = lengthy("idle", 100);
    const active = lengthy("active", 30);
    underPressure(idle, active);

    saveProject("proj_idle", idle);
    expect(saveProject("proj_active", active)).toBe(true);
    expect(loadProject("proj_active")).toEqual(active);
  });
});
