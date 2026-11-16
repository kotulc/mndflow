/** Preloaded into a traced run by `mnd fact trace` (trace.ts): wraps `node:fs` (sync, callback and
 *  promises) so each file the run reads or writes inside the project is appended to `MND_TRACE`
 *  as one JSON line: `op`, `path` (from the project root) and `step`, the project function
 *  calling. Child processes inherit it through `NODE_OPTIONS`. Plain CommonJS, so `--require`
 *  loads it before any module, ESM included. */

"use strict";
const fs = require("node:fs");
const { syncBuiltinESMExports } = require("node:module");
const { isAbsolute, relative, resolve } = require("node:path");
const { fileURLToPath } = require("node:url");

const OUT = process.env.MND_TRACE;
const ROOT = process.env.MND_TRACE_ROOT;

/** Which arguments each function reads from and writes to, by name without `Sync`. */
const READS = { readFile: [0], readdir: [0], opendir: [0], createReadStream: [0], copyFile: [0],
                cp: [0] };
const WRITES = { writeFile: [0], appendFile: [0], createWriteStream: [0], mkdir: [0],
                 copyFile: [1], cp: [1], rename: [1] };

/** Folders never reported: installed packages, and hidden ones (git, caches). */
const SKIPPED = /(^|\/)(node_modules|\.[^/]+)(\/|$)/;

/** The original append, kept before anything is wrapped. */
const append = fs.appendFileSync;


/** A path argument from the project root, or null where it is outside it, skipped or no path. */
function inside(arg) {
  const path = typeof arg === "string" ? arg : arg instanceof URL ? fileURLToPath(arg) : null;
  if (!path) return null;
  const rel = relative(ROOT, resolve(path)).replace(/\\/g, "/");
  return rel && !rel.startsWith("..") && !isAbsolute(rel) && !SKIPPED.test(rel) ? rel : null;
}

/** Node loading a module: its reads are the program, not what it does. */
const LOADER = /node:internal\/modules\//;

/** The project function calling: the first frame in the project, past this hook; undefined
 *  where Node is loading a module. */
function step() {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 40;
  const stack = new Error().stack;
  Error.stackTraceLimit = limit;
  const lines = stack.split("\n").slice(1).filter((l) => !l.includes("trace-hook.cjs"));
  if (LOADER.test(lines[0] ?? "")) return undefined;
  for (const line of lines) {
    const hit = line.match(/at (?:(.+?) \()?(.+?):\d+:\d+\)?$/);
    if (!hit || hit[2].startsWith("node:")) continue;
    const file = inside(hit[2].startsWith("file:") ? new URL(hit[2]) : hit[2]);
    if (file && !file.endsWith("trace-hook.cjs")) {
      const symbol = hit[1]?.replace(/^(async |Object\.|new )/, "");
      return { file, ...(symbol && symbol !== "<anonymous>" ? { symbol } : {}) };
    }
  }
  return null;
}

/** One touch recorded, never throwing into the run. */
function record(op, arg) {
  const path = inside(arg);
  const by = path && step();
  if (!path || by === undefined) return;
  try { append(OUT, `${JSON.stringify({ op, path, step: by })}\n`); } catch { /* not ours */ }
}

/** Every variant of a function on an object wrapped to record its touches first. */
function wrap(target, names, op) {
  for (const [name, args] of Object.entries(names)) {
    for (const key of [name, `${name}Sync`]) {
      const original = target[key];
      if (typeof original !== "function") continue;
      target[key] = function traced(...given) {
        for (const i of args) record(op, given[i]);
        return original.apply(this, given);
      };
    }
  }
}

if (OUT && ROOT) {
  for (const target of [fs, fs.promises]) {
    wrap(target, READS, "read");
    wrap(target, WRITES, "write");
  }
  syncBuiltinESMExports();
}
