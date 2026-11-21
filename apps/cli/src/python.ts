/** **Python projects' facts**: `mnd fact` on a Python project runs apps/py (`mndpy`) in a
 *  Python with its packages (`MND_PYTHON`, else `python`), passing the flags through. */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Where mndpy lives in the repo. */
const MNDPY = resolve(dirname(fileURLToPath(import.meta.url)), "../../py");

/** The files that say a project is Python, where none says it is JavaScript. */
const MARKS = ["pyproject.toml", "setup.py", "manage.py", "requirements.txt"];

/** Whether a project is read by the Python translator. */
export function is_python(root: string): boolean {
  return !existsSync(join(root, "package.json")) && MARKS.some((m) => existsSync(join(root, m)));
}

/** One fact's JSON, as mndpy prints it; its refusal thrown with why. */
export function python_fact(name: string, root: string, rest: string[]): string {
  const args = rest.filter((a) => resolve(a) !== root);
  const run = spawnSync(process.env["MND_PYTHON"] ?? "python",
                        ["-m", "mndpy", "fact", name, root, ...args],
                        { cwd: MNDPY, encoding: "utf8", maxBuffer: 1 << 28 });
  if (run.error) throw new Error(`no Python to run mndpy: ${run.error.message}`);
  if (run.status) throw new Error(run.stderr.trim() || `mndpy failed (${run.status})`);
  return run.stdout;
}
