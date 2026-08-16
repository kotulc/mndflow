/** The storage seam: one key per project, workspace held apart.
 *
 *  Properties only — nothing asserts a particular id, key string, or payload
 *  shape that a later row is free to refine. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  adoptId, canBind, clearPressure, download, downloadSvg, isDrifted, load, loadProject,
  loadWorkspace, pickIn, pressureNote, projectId, readBound, release, save,
  saveProject, saveWorkspace, settleBound, watch, watchPressure, writeOut,
} from "./store";
import { EMPTY, element, step, type Step } from "./types";

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

/** A just-opened log: one checkpoint carrying nothing. */
const opened = (tag: string): Step[] => [
  step(tag, "checkpoint", [{ op: "checkpoint", graph: EMPTY, at: 0 }]),
];

/** An import: the same single-checkpoint shape, but the checkpoint holds the
 *  whole graph. Shape alone cannot tell this from `opened`, which is exactly
 *  what made losing it possible. */
const imported = (tag: string): Step[] => [
  step(tag, "checkpoint", [{
    op: "checkpoint",
    graph: { ...EMPTY, elements: { block_1: element("Pump", { form: "block" }) } },
    at: 0,
  }]),
];

/** A long log — enough history that collapsing it frees measurable space. */
function lengthy(tag: string, n: number): Step[] {
  return Array.from({ length: n }, (_, i) => step(`${tag}-${i}`, "test", []));
}

beforeEach(() => {
  clearPressure();
  release();
  Object.defineProperty(globalThis, "localStorage", {
    value: memory(), configurable: true, writable: true,
  });
});

afterEach(() => {
  clearPressure();
  release();
  vi.useRealTimers();
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

  it("does not store a project that was only opened", () => {
    expect(saveProject("proj_opened", opened("opened"))).toBe(true);
    expect(localStorage.getItem("mndflow.steps.proj_opened.v1")).toBeNull();
  });

  // The bug this replaces: an import is one checkpoint, the same shape a fresh
  // project opens with, so the lazy-key gate threw the whole imported graph
  // away and reported success. Nothing survived a reload.
  it("stores an import, whose one checkpoint carries the whole graph", () => {
    expect(saveProject("proj_import", imported("opened"))).toBe(true);
    expect(localStorage.getItem("mndflow.steps.proj_import.v1")).not.toBeNull();
  });

  it("reads back everything an import brought", () => {
    const log = imported("opened");
    saveProject("proj_round", log);
    expect(loadProject("proj_round")).toEqual(log);
  });

  it("stores the log once something somebody did is in it", () => {
    expect(saveProject("proj_work", sample("changed"))).toBe(true);
    expect(localStorage.getItem("mndflow.steps.proj_work.v1")).not.toBeNull();
  });

  it("keeps writing after a key already exists, even for a later pristine shape", () => {
    saveProject("proj_work", sample("changed"));
    const back = opened("back");
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

/** A stand-in File System Access handle — properties only, no real disk. */
function fakeHandle(name: string, body: string, modified = 1) {
  let text = body;
  let lastModified = modified;

  return {
    name,
    getFile: async () => ({
      lastModified,
      text: async () => text,
    }),
    createWritable: async () => ({
      write: async (data: string | Blob) => {
        text = typeof data === "string" ? data : await (data as Blob).text();
      },
      close: async () => { lastModified += 1; },
    }),
    /** Simulate an external edit — what the poll watches for. */
    bump: () => { lastModified += 1; },
    contents: () => text,
  };
}

type FakeHandle = ReturnType<typeof fakeHandle>;

function withPickers(save?: () => Promise<FakeHandle>, open?: () => Promise<FakeHandle[]>) {
  const w = globalThis as typeof globalThis & {
    showSaveFilePicker?: () => Promise<FakeHandle>;
    showOpenFilePicker?: () => Promise<FakeHandle[]>;
  };
  const prior = {
    save: w.showSaveFilePicker,
    open: w.showOpenFilePicker,
  };
  // canBind requires both; a stub fills whichever the test leaves out.
  const stub = fakeHandle("stub.mndflow.json", "{}");
  w.showSaveFilePicker = save ?? (async () => stub);
  w.showOpenFilePicker = open ?? (async () => [stub]);

  return () => {
    if (prior.save) w.showSaveFilePicker = prior.save;
    else delete w.showSaveFilePicker;
    if (prior.open) w.showOpenFilePicker = prior.open;
    else delete w.showOpenFilePicker;
  };
}

/** Strip both pickers — canBind must then be false. */
function withoutPickers() {
  const w = globalThis as typeof globalThis & {
    showSaveFilePicker?: unknown;
    showOpenFilePicker?: unknown;
  };
  const prior = {
    save: w.showSaveFilePicker,
    open: w.showOpenFilePicker,
  };
  delete w.showSaveFilePicker;
  delete w.showOpenFilePicker;

  return () => {
    if (prior.save !== undefined) w.showSaveFilePicker = prior.save as typeof w.showSaveFilePicker;
    else delete w.showSaveFilePicker;
    if (prior.open !== undefined) w.showOpenFilePicker = prior.open as typeof w.showOpenFilePicker;
    else delete w.showOpenFilePicker;
  };
}

describe("live bind and drift", () => {
  beforeEach(() => {
    // download and watchPage touch document; pickers hang on globalThis.
    Object.defineProperty(globalThis, "document", {
      value: {
        hidden: false,
        addEventListener() {},
        createElement: () => ({ href: "", download: "", click() {} }),
      },
      configurable: true,
      writable: true,
    });
    if (typeof URL.createObjectURL !== "function") {
      URL.createObjectURL = () => "blob:test";
      URL.revokeObjectURL = () => {};
    }
  });

  afterEach(() => {
    release();
    delete (globalThis as { document?: unknown }).document;
  });

  it("reports whether the Chromium pickers are present", () => {
    const stop = withoutPickers();
    expect(canBind()).toBe(false);
    stop();

    const restore = withPickers(
      async () => fakeHandle("a.mndflow.json", "{}"),
      async () => [fakeHandle("a.mndflow.json", "{}")],
    );
    expect(canBind()).toBe(true);
    restore();
  });

  it("binds on writeOut and clears drift after a successful write", async () => {
    const handle = fakeHandle("untitled.mndflow.json", "{}");
    const restore = withPickers(async () => handle);
    const heard: boolean[] = [];
    const stop = watch((next) => heard.push(next));

    await writeOut('{"ok":true}', "untitled");

    expect(handle.contents()).toBe('{"ok":true}');
    expect(isDrifted()).toBe(false);
    expect(heard.at(-1)).toBe(false);

    stop();
    restore();
  });

  it("notices when the bound file's lastModified moves underneath", async () => {
    vi.useFakeTimers();
    const handle = fakeHandle("untitled.mndflow.json", "{}");
    const restore = withPickers(async () => handle);
    const heard: boolean[] = [];
    const stop = watch((next) => heard.push(next));

    await writeOut("{}", "untitled");
    handle.bump();
    await vi.advanceTimersByTimeAsync(2000);

    expect(isDrifted()).toBe(true);
    expect(heard.at(-1)).toBe(true);

    stop();
    restore();
  });

  it("settleBound clears drift only after the shell accepts the disk copy", async () => {
    vi.useFakeTimers();
    const handle = fakeHandle("untitled.mndflow.json", '{"schema":"1.2"}');
    const restore = withPickers(async () => handle);
    await writeOut("{}", "untitled");
    handle.bump();
    await vi.advanceTimersByTimeAsync(2000);
    expect(isDrifted()).toBe(true);

    const text = await readBound();
    expect(text).toBeTruthy();
    expect(isDrifted()).toBe(true);

    await settleBound();
    expect(isDrifted()).toBe(false);

    restore();
  });

  it("release drops the handle and the drift warning", async () => {
    vi.useFakeTimers();
    const handle = fakeHandle("untitled.mndflow.json", "{}");
    const restore = withPickers(async () => handle);
    await writeOut("{}", "untitled");
    handle.bump();
    await vi.advanceTimersByTimeAsync(2000);
    expect(isDrifted()).toBe(true);

    release();
    expect(isDrifted()).toBe(false);

    restore();
  });

  it("does not overwrite a bound file when the export name is a different file", async () => {
    const project = fakeHandle("alpha.mndflow.json", "project");
    const workspace = fakeHandle("workspace.mndflow.json", "shell");
    let saves = 0;
    const restore = withPickers(async () => {
      saves += 1;
      return saves === 1 ? project : workspace;
    });

    await writeOut("project-body", "alpha");
    expect(project.contents()).toBe("project-body");

    await writeOut("workspace-body", "workspace");
    expect(project.contents()).toBe("project-body");
    expect(workspace.contents()).toBe("workspace-body");
    expect(saves).toBe(2);

    restore();
  });

  it("pickIn returns false when the user cancels, null when the API is absent", async () => {
    const absent = withoutPickers();
    expect(await pickIn()).toBeNull();
    absent();

    const restore = withPickers(
      async () => fakeHandle("a.mndflow.json", "{}"),
      async () => { throw new DOMException("cancelled", "AbortError"); },
    );
    expect(await pickIn()).toBe(false);
    restore();
  });

  it("download remains the fallback when no picker is offered", () => {
    // Property: download is callable without a live handle — the shell's way
    // out when Chromium is absent. Does not throw.
    expect(() => download("{}", "untitled")).not.toThrow();
  });

  it("downloadSvg offers a companion file without needing a live handle", () => {
    // Property: the SVG beside the source is always an anchor download — the
    // live handle stays the JSON. Callable, does not throw.
    expect(() => downloadSvg("<svg/>", "untitled")).not.toThrow();
  });

  it("writeOut reports whether the export landed", async () => {
    const stop = withoutPickers();
    expect(await writeOut("{}", "untitled")).toBe(true);
    stop();

    const restore = withPickers(async () => {
      throw new DOMException("cancelled", "AbortError");
    });
    expect(await writeOut("{}", "untitled")).toBe(false);
    restore();
  });
});
