/** **trace** (docs/tools/trace.md): what files a run actually reads and writes. The command runs
 *  in the project with `trace-hook.cjs` preloaded into every Node process it starts; Node
 *  commands only. Its output goes to stderr, so the answer alone is on stdout. */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The project function doing a touch, as every fact anchors one. */
type Step = { file: string; symbol?: string };

/** One file touched: read or write, its path, the step, and for a write the input it came from
 *  where that can be told. */
export type Touch = { op: "read" | "write"; path: string; step: Step | null;
                      from?: { path: string; guess: true } };

/** The hook preloaded, as `NODE_OPTIONS` takes a path: forward slashes, quoted. */
const HOOK = fileURLToPath(new URL("./trace-hook.cjs", import.meta.url)).replace(/\\/g, "/");


/** **Each file a command touches**, in run order, each once per step. **A write is tied to the
 *  last read by the same step before it** (same run order), marked a guess. */
export function trace(root: string, run: string): Touch[] {
  if (!run.trim()) throw new Error("asks --run \"<command>\"");
  const dir = mkdtempSync(join(tmpdir(), "mnd-trace-"));
  const out = join(dir, "touches.jsonl");
  try {
    const done = spawnSync(run, { cwd: root, shell: true, stdio: ["ignore", 2, 2],
      env: { ...process.env, MND_TRACE: out, MND_TRACE_ROOT: root,
             NODE_OPTIONS: `${process.env["NODE_OPTIONS"] ?? ""} --require "${HOOK}"`.trim() } });
    if (done.error) throw done.error;
    if (done.status) console.error(`  the command exited ${done.status}; its touches so far`);
    const lines = existsSync(out) ? readFileSync(out, "utf8").split("\n").filter(Boolean) : [];
    return tied(once(lines.map((l) => JSON.parse(l) as Touch)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Touches kept once: the same op on the same path by the same step said first time only. */
function once(all: readonly Touch[]): Touch[] {
  const seen = new Set<string>();
  return all.filter((t) => {
    const key = JSON.stringify([t.op, t.path, t.step]);
    return !seen.has(key) && !!seen.add(key);
  });
}

/** Each write tied to the last read its step made before it. */
function tied(all: readonly Touch[]): Touch[] {
  const last = new Map<string, string>();
  return all.map((t) => {
    const by = JSON.stringify(t.step);
    if (t.op === "read") {
      last.set(by, t.path);
      return t;
    }
    const from = t.step ? last.get(by) : undefined;
    return from && from !== t.path ? { ...t, from: { path: from, guess: true } } : t;
  });
}
