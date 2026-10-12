/** Collects every catalogue package that has a source folder into public/packages. */

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const dir = "packages/defs/src/packages";
const names = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name).sort();

for (const name of names) {
  const child = spawnSync("npm", ["run", "start", "-s", "-w", "@mnd/cli", "--",
    "collect", `../../packages/defs/src/packages/${name}`, `../../public/packages/${name}.json`],
    { stdio: "inherit", shell: true });
  if (child.status) process.exit(child.status ?? 1);
}
