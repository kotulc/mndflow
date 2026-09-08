/**
 * Every custom property read, against every one in scope where it is read.
 *
 *   node scripts/lint-css.mjs
 *
 * **An undefined `var()` does not fall back — it takes its whole declaration
 * with it.** `background: var(--gone)` is invalid at computed-value time, so
 * the property drops to its initial value and the card renders with no ground
 * at all. Nothing warns: not the typechecker, not the suite, not the build. It
 * shipped twice in one afternoon, once from a rename and once from a rewrite
 * that dropped two definitions while leaving four reads of them.
 *
 * A read carrying a fallback — `var(--x, …)` — is safe by construction and is
 * not counted. Which is also the fix for anything this finds: define it, or
 * give it a fallback that degrades to something drawable.
 *
 * **Scope is the package, not the workspace.** Pooling every stylesheet made
 * this useless: a name defined on `.preview-card` in the tray answered for a
 * read on `.mnd-card` in the stage, which the browser would never do — custom
 * properties inherit down the element tree, not across sibling sheets. So the
 * theme is the one global (it declares on `:root`) and every other package
 * answers for its own.
 *
 * This does not read selectors, so it cannot tell that a name is defined on the
 * wrong element *within* a package. It catches the whole name going missing,
 * which is the failure that has actually happened.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", "dist", ".types", ".vite", ".git"]);

/** Every stylesheet in the workspace, dev harnesses included — they are loaded
 *  on their own and a var missing there is missing for real. */
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

/** A read with no fallback, and where it is. The second group is the comma that
 *  opens one; absent, the read is the whole of what the browser has to go on. */
function reads(css, file) {
  const out = [];
  for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    if (m[2]) continue;
    out.push({ name: m[1], at: `${file}:${css.slice(0, m.index).split("\n").length}` });
  }
  return out;
}

/** Which package a stylesheet belongs to. The theme is everyone's. */
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
