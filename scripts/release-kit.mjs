/**
 * Build `@mnd/kit`, pack it, and record what the tarball is.
 *
 *   node scripts/release-kit.mjs         # build, pack, stamp
 *   node scripts/release-kit.mjs --check # verify release/ matches the manifest
 *
 * A tarball has no registry behind it, so nothing else knows which commit a
 * consumer is holding. `release/kit.json` is that discipline: version, commit,
 * integrity and date, written beside the file and committed with it. A
 * consumer pins the version and can check the rest.
 *
 * Both the tarball and the manifest are committed. That is deliberate while
 * kit is unpublished — a clean checkout of a consumer installs without
 * building this repo, which is the whole reason the file exists.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "release");
const stamp = path.join(out, "kit.json");

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: root, encoding: "utf8", shell: true }).trim();

const manifest = JSON.parse(readFileSync(path.join(root, "packages/kit/package.json"), "utf8"));
const tarball = `mnd-kit-${manifest.version}.tgz`;

/** sha512, base64, `sha512-` prefixed — the same shape npm writes into a
 *  lockfile, so a consumer compares like with like. */
function integrity(file) {
  return "sha512-" + createHash("sha512").update(readFileSync(file)).digest("base64");
}

function head() {
  try {
    return { commit: run("git", ["rev-parse", "HEAD"]),
             branch: run("git", ["rev-parse", "--abbrev-ref", "HEAD"]),
             dirty: run("git", ["status", "--porcelain"]).length > 0 };
  } catch {
    return { commit: "unknown", branch: "unknown", dirty: false };
  }
}

if (process.argv.includes("--check")) {
  const said = JSON.parse(readFileSync(stamp, "utf8"));
  const found = integrity(path.join(out, said.tarball));
  if (found !== said.integrity) {
    console.error(`${said.tarball} does not match release/kit.json`);
    process.exit(1);
  }
  console.log(`${said.tarball} — ${said.version}, ${said.commit.slice(0, 7)}`);
  process.exit(0);
}

const at = head();
if (at.dirty) console.error("warning: the tree is dirty, so the commit below is not what was packed");

run("npm", ["run", "build", "-w", "@mnd/kit"]);
mkdirSync(out, { recursive: true });
/** Absolute: with `-w`, npm resolves a relative destination against the
 *  workspace rather than the root, and the tarball lands somewhere else. */
run("npm", ["pack", "-w", "@mnd/kit", "--pack-destination", JSON.stringify(out)]);

writeFileSync(stamp, JSON.stringify({
  tarball,
  version: manifest.version,
  commit: at.commit,
  branch: at.branch,
  packed: new Date().toISOString().slice(0, 10),
  integrity: integrity(path.join(out, tarball)),
}, null, 2) + "\n");

console.log(`release/${tarball} — ${manifest.version}, ${at.commit.slice(0, 7)}`);
