/** The dependency map, as a test.
 *
 *  README.md used to carry this as prose, so an arrow pointed the wrong way
 *  shipped green. This file owns the list; README.md points here. Walk every
 *  import under `src/` against it, and name the file and the arrow it drew. */

import { describe, expect, it } from "vitest";

/** Allowed edges. A layer may import itself and these, and nothing else. */
export const ALLOWED: Record<string, readonly string[]> = {
  graph: [],
  embed: [],
  geometry: ["graph"],
  actions: ["graph", "geometry", "embed"],
  workspace: ["graph"],
  modules: ["graph", "geometry", "embed", "actions"],
  canvas: ["graph", "geometry", "actions", "modules", "embed"],
  page: ["graph", "canvas", "modules", "workspace", "terminal", "project", "actions"],
  // The terminal stands alone: it is optional at mount, so it may not reach
  // into `modules`. It draws its own glyphs. `project` is the registration
  // hook (`looping`), which is the inversion, not a dependency on the page.
  terminal: ["graph", "geometry", "embed", "actions", "project"],
  // `project.ts` reaching the workspace is deliberate, not an inversion: every
  // write is routed through the workspace door (`writeInto`), and `B.8` moves
  // the log there outright. No cycle — workspace imports `graph` and nothing else.
  project: ["graph", "actions", "embed", "workspace"],
};

const LAYERS = new Set(Object.keys(ALLOWED));

const sources = {
  ...import.meta.glob("../src/**/*.ts", { query: "?raw", import: "default", eager: true }),
  ...import.meta.glob("../src/**/*.tsx", { query: "?raw", import: "default", eager: true }),
} as Record<string, string>;

type Arrow = { file: string; from: string; to: string };

function src_of(path: string): string | null {
  const norm = path.replace(/\\/g, "/");
  const at = norm.lastIndexOf("/src/");
  if (at < 0) return null;
  return norm.slice(at + "/src/".length);
}

function unit_of(path: string): string | null {
  const rel = src_of(path);
  if (!rel) return null;
  const first = rel.split("/")[0] ?? "";
  if (first === "project.ts" || first === "project") return "project";
  const folder = first.replace(/\.(ts|tsx)$/, "");
  return LAYERS.has(folder) ? folder : null;
}

function aimed(file: string, spec: string): string {
  const dir = file.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
  const parts = dir.split("/");
  for (const bit of spec.split("/")) {
    if (bit === "." || bit === "") continue;
    if (bit === "..") parts.pop();
    else parts.push(bit);
  }
  return parts.join("/");
}

function arrows(): Arrow[] {
  const found = new Map<string, Arrow>();
  const import_re = /\b(?:from|import)\s+["'](\.[^"']+)["']/g;

  for (const [path, text] of Object.entries(sources)) {
    if (path.endsWith(".d.ts")) continue;
    const from = unit_of(path);
    if (!from) continue;
    for (const match of text.matchAll(import_re)) {
      const spec = match[1]!;
      const to = unit_of(aimed(path, spec));
      if (!to || to === from) continue;
      if (ALLOWED[from]!.includes(to)) continue;
      const file = src_of(path)!;
      const key = `${file}:${from}→${to}`;
      found.set(key, { file, from, to });
    }
  }
  return [...found.values()].sort((a, b) => a.file.localeCompare(b.file) || a.to.localeCompare(b.to));
}

describe("the dependency map", () => {
  it("lets no file point an arrow the table forbids", () => {
    if (Object.keys(sources).length === 0) throw new Error("walked no src files");
    const held = arrows();
    const named = held.map((a) => `${a.file}: ${a.from} → ${a.to}`);
    expect(named, named.join("\n")).toEqual([]);
  });
});
