/**
 * Run vitest once with a hard wall clock. Agents used to leave orphan
 * `vitest` trees when Shell backgrounded a hung suite; exit 124 is timeout.
 *
 *   node scripts/test-ci.mjs              # full suite
 *   node scripts/test-ci.mjs tests/graph  # scoped
 *   VITEST_CI_TIMEOUT_MS=180000 node scripts/test-ci.mjs
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const timeout_ms = Number(process.env.VITEST_CI_TIMEOUT_MS ?? 120_000);
const extra = process.argv.slice(2);
const args = ["vitest", "run", ...extra];

const child = spawn("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: true,
  windowsHide: true,
});

let timed_out = false;
const timer = setTimeout(() => {
  timed_out = true;
  kill_tree(child.pid);
}, timeout_ms);

function kill_tree(pid) {
  if (pid == null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
}

child.on("exit", (code, signal) => {
  clearTimeout(timer);
  if (timed_out) {
    console.error(`\ntest:ci timed out after ${timeout_ms}ms`);
    process.exit(124);
  }
  process.exit(code ?? (signal ? 1 : 0));
});
