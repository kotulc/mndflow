/** The one law, as a test.
 *
 *  **Dependencies run one way, and only `core` may name a closed set.** Both
 *  halves are checked here rather than in a review: an arrow pointed the wrong
 *  way is a failure with the file and the arrow named, and a closed set
 *  declared outside the engine is caught where it is written.
 *
 *  This is the test the whole structure exists to make possible. Without it the
 *  boundaries are a convention, and a convention is what the old tree had. */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const PACKAGES = join(ROOT, "packages");

/** Who may import whom **in `src/`**. A package may import itself and these,
 *  and nothing else. Keep in step with the monorepo README — this file owns
 *  the list. */
const ALLOWED: Record<string, readonly string[]> = {
  core: [],
  defs: ["core"],
  fixtures: ["core", "defs"],
  layout: ["core"],
  views: ["core", "layout"],
  theme: [],
  render: ["core", "views", "theme"],
  explorer: ["core", "theme"],
  stage: ["core", "views", "render", "theme"],
  /** The seam, and the one package allowed to reach everything: it adds
   *  nothing and only re-exports, so it cannot put a dependency anywhere the
   *  map does not already allow. */
  kit: ["core", "defs", "explorer", "layout", "views", "render", "theme"],
  options: ["core", "theme"],
  tray: ["core", "theme"],
  terminal: ["core", "theme"],
};

/** Sample data is for proving things, never for shipping. A test and a dev
 *  harness may reach it; nothing under `src/` may. */
const FIXTURES = "fixtures";

type Arrow = { file: string; from: string; to: string; where: "src" | "test" | "dev" };

/** A package is a directory with a manifest. The repo also holds directories
 *  that are not workspaces, and they are none of this test's business. */
function packages(): string[] {
  return readdirSync(PACKAGES).filter((name) => {
    const dir = join(PACKAGES, name);
    return statSync(dir).isDirectory() && existsSync(join(dir, "package.json"));
  });
}

function sources(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sources(full));
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

function arrows(): Arrow[] {
  const found: Arrow[] = [];
  const re = /\bfrom\s+["']@mnd\/([a-z-]+)/g;
  for (const from of packages()) {
    for (const where of ["src", "test", "dev"] as const) {
      for (const file of sources(join(PACKAGES, from, where))) {
        for (const hit of readFileSync(file, "utf8").matchAll(re)) {
          const to = hit[1]!;
          if (to === from) continue;
          found.push({ file: relative(ROOT, file).replace(/\\/g, "/"), from, to, where });
        }
      }
    }
  }
  return found;
}

const say = (a: Arrow) => `${a.file}: ${a.from} → ${a.to}`;

describe("dependencies run one way", () => {
  it("has a rule for every package, and a package for every rule", () => {
    expect(packages().sort()).toEqual(Object.keys(ALLOWED).sort());
  });

  it("draws no arrow in src the map does not allow", () => {
    const wrong = arrows()
      .filter((a) => a.where === "src")
      .filter((a) => !ALLOWED[a.from]!.includes(a.to));
    expect(wrong.map(say)).toEqual([]);
  });

  it("keeps sample data out of everything that ships", () => {
    const leaked = arrows().filter((a) => a.where === "src" && a.to === FIXTURES);
    expect(leaked.map(say)).toEqual([]);
  });

  it("lets a test and a harness reach a fixture, which is what they are for", () => {
    const reached = arrows().filter((a) => a.to === FIXTURES);
    expect(reached.length).toBeGreaterThan(0);
    expect(reached.every((a) => a.where !== "src")).toBe(true);
  });

  /** **Declared, and not necessarily at run time.** A package that bundles its
   *  siblings into one artifact must not also ask a consumer to fetch them, so
   *  `kit` declares them as build dependencies. What this rule is for is an
   *  import nobody wrote down at all. */
  it("keeps every manifest in step with what its src imports", () => {
    const missing: string[] = [];
    for (const from of packages()) {
      const manifest = JSON.parse(readFileSync(join(PACKAGES, from, "package.json"), "utf8"));
      const declared = new Set([...Object.keys(manifest.dependencies ?? {}),
                                ...Object.keys(manifest.devDependencies ?? {})]);
      for (const a of arrows().filter((x) => x.from === from && x.where === "src")) {
        if (!declared.has(`@mnd/${a.to}`)) missing.push(`${from} imports ${a.to} undeclared`);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  it("has no cycle among the packages", () => {
    const out = new Map(packages().map((p) => [p, ALLOWED[p] ?? []]));
    const reaches = (from: string, to: string, seen = new Set<string>()): boolean => {
      if (seen.has(from)) return false;
      seen.add(from);
      for (const next of out.get(from) ?? []) {
        if (next === to || reaches(next, to, seen)) return true;
      }
      return false;
    };
    const cycles = packages().filter((p) => reaches(p, p));
    expect(cycles).toEqual([]);
  });
});

describe("only core may name a closed set", () => {
  /** A closed set is an exported array of **string literals** — the shape every
   *  enumeration of *sorts of things* takes. An array of objects is data and an
   *  array of identifiers is a registry; neither is the engine deciding what
   *  kinds of thing exist, which is the only thing this rule is about. */
  const CLOSED = /export const [A-Z][A-Z_]*\s*(?::[^=]+)?=\s*\[\s*"[^"]*"[^\]]*\]/g;

  it("finds none outside core", () => {
    const wrong: string[] = [];
    for (const from of packages()) {
      if (from === "core") continue;
      for (const file of sources(join(PACKAGES, from, "src"))) {
        for (const hit of readFileSync(file, "utf8").matchAll(CLOSED)) {
          wrong.push(`${relative(ROOT, file).replace(/\\/g, "/")}: ${hit[0]!.slice(0, 48)}…`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("and core does name them, so the rule is doing something", () => {
    const text = readFileSync(join(PACKAGES, "core/src/types.ts"), "utf8");
    expect(text.match(CLOSED)?.length ?? 0).toBeGreaterThan(0);
  });
});

describe("nothing reaches past an index", () => {
  it("imports a package by its name, never a deep path", () => {
    const deep = arrows().filter((a) => a.where === "src")
      .flatMap(() => [] as string[]);
    const found: string[] = [];
    for (const from of packages()) {
      for (const file of sources(join(PACKAGES, from, "src"))) {
        for (const hit of readFileSync(file, "utf8").matchAll(/from\s+["'](@mnd\/[^"']+)/g)) {
          if (hit[1]!.split("/").length > 2) {
            found.push(`${relative(ROOT, file).replace(/\\/g, "/")}: ${hit[1]}`);
          }
        }
      }
    }
    expect([...deep, ...found]).toEqual([]);
  });
});

describe("the apps bind ports and compose", () => {
  it("is where every port binding lives, and the only place", () => {
    const bindings: string[] = [];
    for (const from of packages()) {
      for (const file of sources(join(PACKAGES, from, "src"))) {
        const text = readFileSync(file, "utf8");
        if (/\blocalStorage\b|\bdocument\.createElement\("a"\)/.test(text)) {
          bindings.push(relative(ROOT, file).replace(/\\/g, "/"));
        }
      }
    }
    expect(bindings).toEqual([]);
    expect(existsSync(join(ROOT, "apps/web/src/ports.ts"))).toBe(true);
  });
});
