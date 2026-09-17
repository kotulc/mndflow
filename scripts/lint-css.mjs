/** Every custom property read, against every one in scope where it is read. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", "dist", ".types", ".vite", ".git"]);

/** Every stylesheet in the workspace, dev harnesses included. */
function sheets(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const at = path.join(dir, name);
    if (statSync(at).isDirectory()) sheets(at, found);
    else if (name.endsWith(".css")) found.push(at);
  }
  return found;
}

const defs = (css) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

/** A read with no fallback, and where it is. */
function reads(css, file) {
  const out = [];
  for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    if (m[2]) continue;
    out.push({ name: m[1], at: `${file}:${css.slice(0, m.index).split("\n").length}` });
  }
  return out;
}

/** Which package a stylesheet belongs to. */
const owner = (file) => {
  const parts = path.relative(root, file).split(path.sep);
  return parts[0] === "packages" || parts[0] === "apps" ? parts[1] : parts[0];
};

const files = sheets(root).map((file) => ({
  file, rel: path.relative(root, file).replace(/\\/g, "/"),
  css: readFileSync(file, "utf8"), pkg: owner(file),
}));

/** The theme declares on `:root`, so what it defines is in scope everywhere. */
const global = new Set();
for (const f of files) if (f.pkg === "theme") for (const n of defs(f.css)) global.add(n);

const scoped = new Map();
for (const f of files) {
  const held = scoped.get(f.pkg) ?? new Set();
  for (const n of defs(f.css)) held.add(n);
  scoped.set(f.pkg, held);
}

let counted = 0;
const missing = [];
const seen = new Set();
for (const f of files) {
  for (const { name, at } of reads(f.css, f.rel)) {
    counted++;
    if (global.has(name) || scoped.get(f.pkg)?.has(name)) continue;
    if (seen.has(`${f.pkg} ${name}`)) continue;
    seen.add(`${f.pkg} ${name}`);
    missing.push({ name, at });
  }
}

console.log(`${global.size} global, ${files.length} stylesheets, `
          + `${counted} reads without a fallback.`);
if (missing.length === 0) {
  console.log("Every read resolves in the package that makes it.");
  process.exit(0);
}
for (const { name, at } of missing) console.log(`  undefined: ${name}  ${at}`);
console.log(`\n${missing.length} would render as a dropped declaration.`);
process.exit(1);
