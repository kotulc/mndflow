/** The workspace seam: a project of root-proxies and folders, never itself.
 *
 *  Properties only — nothing asserts a particular id, label, or count that a
 *  later row is free to refine. */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { compact, fold } from "../src/graph/fold";
import { saveProject } from "../src/graph/store";
import { EMPTY, ROOT, asTarget, element, refTo, step, type Mutation } from "../src/graph/types";
import {
  admit, begin, blank, defOf, folder, fork, fromDefs, gather, isLocked, isSelf, load,
  mayAdmit, mayName, named, names, opened, pack, packId, packagesOf, packs, read, resolve,
  rootOf, save, scoped, started, stemOf, unlock, writeInto,
} from "../src/workspace/index";

/** An in-memory localStorage so the suite does not need a browser. */
function memory(): Storage {
  const held = new Map<string, string>();

  return {
    get length() { return held.size; },
    clear() { held.clear(); },
    getItem(key: string) { return held.has(key) ? held.get(key)! : null; },
    setItem(key: string, value: string) { held.set(key, String(value)); },
    removeItem(key: string) { held.delete(key); },
    key(index: number) { return [...held.keys()][index] ?? null; },
  };
}

function applied(...mutations: Mutation[]) {
  return fold([step("t", "test", mutations)]);
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: memory(), configurable: true, writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: undefined, configurable: true, writable: true,
  });
});

describe("held shape", () => {
  it("mints an id and an empty project list when nothing has been filed", () => {
    const held = blank();

    expect(held.id).toMatch(/^proj_/);
    expect(held.projects).toEqual([]);
    expect(held.locked).toEqual([]);
  });

  it("reads a list without an id by minting one", () => {
    const held = read({ projects: ["proj_a", "proj_b"] });

    expect(held).not.toBeNull();
    expect(held!.id).toMatch(/^proj_/);
    expect(held!.projects).toEqual(["proj_a", "proj_b"]);
    expect(held!.locked).toEqual([]);
  });

  it("refuses garbage rather than half-reading it", () => {
    expect(read("nope")).toBeNull();
    expect(read([])).toBeNull();
    expect(read({ projects: "proj_a" })).toBeNull();
    expect(read({ locked: "pkg_x" })).toBeNull();
  });

  it("drops the workspace's own id from a listed projects payload", () => {
    const held = read({ id: "proj_ws", projects: ["proj_ws", "proj_other"] });

    expect(held).not.toBeNull();
    expect(held!.projects).toEqual(["proj_other"]);
    expect(held!.projects).not.toContain(held!.id);
  });

  it("round-trips locked through the workspace key, never a project file", () => {
    const held = blank();
    held.projects.push("proj_other");
    held.locked = [...(held.locked ?? []), "proj_other"];

    expect(save(held)).toBe(true);
    expect(load()).toEqual(held);
    expect(load().locked).toContain("proj_other");
  });
});

describe("admit", () => {
  it("places a proxy of the other project's root and remembers it", () => {
    const held = blank();
    const out = admit(held, EMPTY, "proj_other");

    expect("refuse" in out).toBe(false);
    if ("refuse" in out) return;

    expect(out.held.projects).toContain("proj_other");
    expect(out.held.projects).not.toContain(held.id);

    const graph = applied(...out.mutations);
    const stand = Object.values(graph.elements).find((n) => n.form === "proxy");

    expect(stand?.of).toBe(rootOf("proj_other"));
    expect(asTarget(stand!.of!).project).toBe("proj_other");
    expect(asTarget(stand!.of!).element).toBe(ROOT);
    expect(named(graph)).toContain("proj_other");
  });

  it("refuses a workspace proxying itself", () => {
    const held = blank();

    expect(mayAdmit(held, EMPTY, held.id)).not.toBeNull();
    expect(admit(held, EMPTY, held.id)).toEqual({
      refuse: mayAdmit(held, EMPTY, held.id),
    });
    expect(isSelf(held, rootOf(held.id))).toBe(true);
    expect(isSelf(held, rootOf("proj_other"))).toBe(false);
  });

  it("refuses admitting the same project twice", () => {
    const held = blank();
    const first = admit(held, EMPTY, "proj_other");
    if ("refuse" in first) throw new Error("first admit refused");

    const again = admit(first.held, applied(...first.mutations), "proj_other");
    expect("refuse" in again).toBe(true);
  });

  it("files under a folder block when one is named", () => {
    const held = blank();
    const made = folder(EMPTY, "Packs");
    if ("refuse" in made) throw new Error("folder refused");

    const withFolder = applied(...made);
    const pack = Object.values(withFolder.elements).find((n) => n.form === "block" && n.id !== ROOT)!;
    const out = admit(held, withFolder, "proj_other", pack.id);
    if ("refuse" in out) throw new Error("admit refused");

    const graph = fold([
      step("a", "test", made),
      step("b", "test", out.mutations),
    ]);
    const stand = Object.values(graph.elements).find((n) => n.form === "proxy")!;

    expect(stand.parent).toBe(pack.id);
  });
});

describe("folder", () => {
  it("is an ordinary block — nothing else", () => {
    const made = folder(EMPTY, "Views");
    if ("refuse" in made) throw new Error("folder refused");

    const graph = applied(...made);
    const node = Object.values(graph.elements).find((n) => n.label === "Views");

    expect(node?.form).toBe("block");
    expect(node?.of).toBeNull();
  });
});

describe("begin", () => {
  it("names a project into being and keeps what it holds across save and reopen", () => {
    const held = blank();
    const out = begin(held, EMPTY, "coolant loop", {});
    expect("refuse" in out).toBe(false);
    if ("refuse" in out) return;

    expect(out.id).toMatch(/^proj_/);
    expect(out.held.projects).toContain(out.id);
    expect(fold(out.steps).elements[ROOT].label).toBe("coolant loop");

    const block = element("Pump", { parent: null });
    const steps = compact([
      ...out.steps,
      step("added", "create", [{ op: "add_element", element: block }]),
    ]);
    expect(saveProject(out.id, steps)).toBe(true);
    expect(save(out.held)).toBe(true);

    const shell = applied(...out.mutations);
    expect(named(shell)).toContain(out.id);
    expect(load().projects).toContain(out.id);

    const again = opened(out.id);
    expect(again.graph.elements[ROOT].label).toBe("coolant loop");
    expect(again.graph.elements[block.id]?.label).toBe("Pump");
  });

  it("refuses a blank or taken name rather than minting a blank project", () => {
    const taken = names({ proj_a: fold(started("alpha")) });

    expect(begin(blank(), EMPTY, "   ", taken)).toEqual({
      refuse: mayName(taken, "   "),
    });
    expect(begin(blank(), EMPTY, "alpha", taken)).toEqual({
      refuse: mayName(taken, "alpha"),
    });
    expect("refuse" in begin(blank(), EMPTY, "beta", taken)).toBe(false);
  });
});

describe("resolve", () => {
  it("finds a foreign root in the open project's graph", () => {
    const other = {
      ...EMPTY,
      elements: {
        ...EMPTY.elements,
        [ROOT]: { ...EMPTY.elements[ROOT], label: "Pump system" },
      },
    };
    const of = refTo(ROOT, "proj_other");

    expect(resolve(EMPTY, { proj_other: other }, of)?.label).toBe("Pump system");
  });

  it("tolerates a missing target rather than inventing one", () => {
    expect(resolve(EMPTY, {}, refTo(ROOT, "proj_gone"))).toBeUndefined();
  });

  it("reads a bare id from the local graph", () => {
    const local = element("Pump", { parent: null });
    const here = applied({ op: "add_element", element: local });

    expect(resolve(here, {}, local.id)?.id).toBe(local.id);
  });
});

describe("writeInto", () => {
  it("lands an applied step in the named project's log through the door", () => {
    const block = element("Pump", { parent: null });
    const landed = writeInto(
      "proj_home",
      [{ op: "add_element", element: block }],
      { say: "home: interface", action: "interface" },
    );

    expect("refuse" in landed).toBe(false);
    if ("refuse" in landed) return;

    expect(landed.steps.some((s) => s.status === "applied" && s.action === "interface")).toBe(true);
    expect(landed.graph.elements[block.id]?.label).toBe("Pump");

    // Re-open through the door — storage holds a real undoable step, not a raw replace.
    const again = opened("proj_home");
    expect(again.graph.elements[block.id]?.label).toBe("Pump");
    expect(again.steps.filter((s) => s.status === "applied").length).toBeGreaterThan(0);
  });

  it("is undone by reverting that step in the target's log", () => {
    const block = element("Heat Exchanger", { parent: null });
    const landed = writeInto(
      "proj_undo",
      [{ op: "add_element", element: block }],
      { say: "home", action: "interface" },
    );
    if ("refuse" in landed) throw new Error("writeInto refused");

    const index = landed.steps.map((s) => s.status).lastIndexOf("applied");
    const reverted = landed.steps.map((s, i) =>
      i === index ? { ...s, status: "reverted" as const } : s,
    );

    expect(fold(reverted).elements[block.id]).toBeUndefined();
    expect(fold(landed.steps).elements[block.id]).toBeDefined();
  });

  it("refuses a locked target before writing", () => {
    const block = element("Pump", { parent: null });
    const refused = writeInto(
      "proj_locked",
      [{ op: "add_element", element: block }],
      { say: "home", action: "interface" },
      { locked: true },
    );

    expect(refused).toEqual({
      refuse: "This package is locked.",
      offer: ["unlock", "fork"],
    });
    expect(opened("proj_locked").steps).toEqual([]);
  });

  it("refuses empty mutations rather than minting a no-op step", () => {
    expect(writeInto("proj_empty", [], { say: "home", action: "interface" }))
      .toEqual({ refuse: "Nothing to write." });
  });

  it("accepts an in-memory prior when the slot has no key yet", () => {
    const seed = element("Seed", { parent: null });
    const prior = [step("opened", "checkpoint",
      [{ op: "checkpoint", graph: applied({ op: "add_element", element: seed }), at: 0 }])];
    const added = element("Port", { parent: null, side: "left", at: 0 });

    const landed = writeInto(
      "proj_stash",
      [{ op: "add_element", element: added }],
      { say: "home", action: "interface" },
      { prior },
    );
    if ("refuse" in landed) throw new Error("writeInto refused");

    expect(landed.graph.elements[seed.id]).toBeDefined();
    expect(landed.graph.elements[added.id]).toBeDefined();
  });
});

describe("packages", () => {
  it("mints a stable package id from the name", () => {
    expect(packId("Requirements")).toMatch(/^pkg_/);
    expect(packId("Requirements")).toBe(packId("requirements"));
  });

  it("maps a domain stem to its package import list", () => {
    const listed = packagesOf("software");

    expect(listed.length).toBeGreaterThan(0);
    expect(listed.every((id) => id.startsWith("pkg_"))).toBe(true);
    expect(listed).toEqual([packId("software")]);
    expect(packagesOf("")).toEqual([]);
    expect(stemOf(listed)).toBe("software");
    expect(stemOf([])).toBe("");
  });

  it("loads definitions by id and derives a missing one from the name", () => {
    const held = fromDefs("demo", {
      definitions: [
        { id: "def_explicit", name: "explicit", form: "block" },
        { name: "depends on", form: "line" },
      ],
    });

    expect(held).not.toBeNull();
    expect(held!.id).toBe(packId("demo"));
    expect(held!.graph.defs.def_explicit?.name).toBe("explicit");
    expect(held!.graph.defs.def_depends_on?.form).toBe("line");
  });

  it("refuses to shadow a definition id inside one package", () => {
    const held = fromDefs("demo", {
      definitions: [
        { id: "def_one", name: "first", form: "line" },
        { id: "def_one", name: "second", form: "line" },
      ],
    });

    expect(held!.graph.defs.def_one.name).toBe("first");
    expect(Object.keys(held!.graph.defs)).toHaveLength(1);
  });

  it("keeps two packages' like-named definitions as two paths", () => {
    const a = fromDefs("alpha", {
      definitions: [{ id: "def_requirement", name: "requirement", form: "block" }],
    })!;
    const b = fromDefs("beta", {
      definitions: [{ id: "def_requirement", name: "requirement", form: "block" }],
    })!;

    const open = { [a.id]: a.graph, [b.id]: b.graph };
    const listed = scoped([a.id, b.id], open);

    expect(listed.map((row) => row.path)).toEqual([
      refTo("def_requirement", a.id),
      refTo("def_requirement", b.id),
    ]);
    expect(listed[0]!.def).not.toBe(listed[1]!.def);
    expect(listed[0]!.pack).not.toBe(listed[1]!.pack);
  });

  it("reads a package definition by path without copying into the consumer", () => {
    const shipped = fromDefs("alpha", {
      definitions: [{ id: "def_requirement", name: "requirement", form: "block" }],
    })!;
    const open = { [shipped.id]: shipped.graph };
    const here = { ...EMPTY, defs: {} };
    const path = refTo("def_requirement", shipped.id);

    expect(defOf(here, open, path)?.name).toBe("requirement");
    expect(here.defs).toEqual({});
    expect(defOf(here, open, "def_requirement")).toBeUndefined();
  });

  it("admits a package id like any other project — S4.4 preserved", () => {
    const shipped = fromDefs("alpha", {
      definitions: [{ id: "def_x", name: "x", form: "line" }],
    })!;
    const held = blank();
    const out = admit(held, EMPTY, shipped.id);

    expect("refuse" in out).toBe(false);
    if ("refuse" in out) return;

    const graph = applied(...out.mutations);
    expect(named(graph)).toContain(shipped.id);
    expect(mayAdmit(out.held, graph, shipped.id)).not.toBeNull();
  });

  it("locks a shipped package on admit, and leaves an ordinary project open", () => {
    const shipped = fromDefs("alpha", {
      definitions: [{ id: "def_x", name: "x", form: "line" }],
    })!;
    const packIn = admit(blank(), EMPTY, shipped.id);
    if ("refuse" in packIn) throw new Error("pack admit refused");

    expect(isLocked(packIn.held, shipped.id)).toBe(true);

    const plain = admit(blank(), EMPTY, "proj_other");
    if ("refuse" in plain) throw new Error("plain admit refused");

    expect(isLocked(plain.held, "proj_other")).toBe(false);
  });

  it("unlock drops the lock so the same project can be written", () => {
    const shipped = fromDefs("alpha", {
      definitions: [{ id: "def_x", name: "x", form: "line" }],
    })!;
    const packIn = admit(blank(), EMPTY, shipped.id);
    if ("refuse" in packIn) throw new Error("pack admit refused");

    const opened = unlock(packIn.held, shipped.id);
    expect("refuse" in opened).toBe(false);
    if ("refuse" in opened) return;

    expect(isLocked(opened, shipped.id)).toBe(false);
    expect(opened.projects).toContain(shipped.id);
    expect(unlock(opened, shipped.id)).toEqual({ refuse: "That is not locked." });
  });

  it("fork mints a new id, keeps the original locked, and unlocks the copy", () => {
    const shipped = fromDefs("alpha", {
      definitions: [{ id: "def_x", name: "x", form: "line" }],
    })!;
    const packIn = admit(blank(), EMPTY, shipped.id);
    if ("refuse" in packIn) throw new Error("pack admit refused");
    const workspace = applied(...packIn.mutations);

    const out = fork(packIn.held, workspace, shipped.id, shipped.graph);
    expect("refuse" in out).toBe(false);
    if ("refuse" in out) return;

    expect(out.id).toMatch(/^proj_/);
    expect(out.id).not.toBe(shipped.id);
    expect(isLocked(out.held, shipped.id)).toBe(true);
    expect(isLocked(out.held, out.id)).toBe(false);
    expect(out.held.projects).toContain(shipped.id);
    expect(out.held.projects).toContain(out.id);
    expect(out.graph.defs.def_x?.name).toBe("x");
    // The copy is independent — mutating it must not touch the source.
    out.graph.defs.def_x = { ...out.graph.defs.def_x!, name: "changed" };
    expect(shipped.graph.defs.def_x?.name).toBe("x");
  });

  it("exposes shipped packages under pkg_ ids", () => {
    const all = packs();
    const ids = Object.keys(all);

    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id.startsWith("pkg_"))).toBe(true);
    expect(ids.every((id) => pack(id)?.id === id)).toBe(true);
  });

  it("reads both a folder package and a core domain seed", () => {
    // Convention: definitions.yaml → folder name; core/<stem>.yaml → stem.
    expect(pack(packId("requirements"))?.graph.defs.def_requirement?.form).toBe("block");
    expect(pack(packId("software"))?.graph.defs.def_depends_on?.form).toBe("line");
  });

  it("gather opens only the shipped ids that exist", () => {
    const id = Object.keys(packs())[0]!;
    const open = gather([id, "pkg_missing"]);

    expect(Object.keys(open)).toEqual([id]);
    expect(Object.keys(open[id]!.defs).length).toBeGreaterThan(0);
  });
});
