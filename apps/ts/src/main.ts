/** `mnd-ts <project> [folder] [--tsconfig path] [--components n]`: a TypeScript or JavaScript
 *  project's structure reported; given a folder, also translated into its library, which
 *  `mnd collect <folder> --workspace` reads into a workspace beside the models composed there. */

import { existsSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { parse } from "yaml";
import { dirname, join, resolve } from "node:path";
import { read_code, type Code } from "./read";
import { against, report, type Target } from "./report";
import { SETTINGS, structure_of, type Levels, type Shape } from "./structure";
import { files_of, write_all } from "./write";

const USAGE = "usage: mnd-ts <project> [folder] [--tsconfig path] [--components n]";

/** The list of files the last translation wrote, kept in the folder: only these are cleared. */
const WRITTEN = ".translated";


function main(argv: string[]): void {
  const flag = (name: string) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv.splice(at, 2)[1] : undefined;
  };
  const tsconfig = flag("--tsconfig");
  const budget = Number(flag("--components") ?? SETTINGS.budget);
  const [project, folder] = argv;
  if (!project || !(budget > 1)) {
    console.log(USAGE);
    process.exit(2);
  }
  const root = resolve(project);
  const code = read_code(root, tsconfig ? resolve(tsconfig) : undefined);
  const { shapes, system } = structure_of(code, { ...SETTINGS, budget, most: budget + 2 });
  console.log(report(code, shapes, system).join("\n"));
  /** A target kept beside the folder (`<folder>.target.yaml`) is checked against. */
  const target = folder ? `${resolve(folder)}.target.yaml` : "";
  if (target && existsSync(target)) {
    console.log(against(code, shapes, parse(readFileSync(target, "utf8")) as Target).join("\n"));
  }
  if (folder) write_to(resolve(folder), code, shapes, system);
}

/** The library written. **Only what the last translation wrote is cleared** (`WRITTEN`), so models
 *  composed in the same folder stay; a folder holding another project's translation is refused. */
function write_to(out: string, code: Code, shapes: Shape[], system: Levels): void {
  const kept = join(out, "package.json");
  const id = existsSync(kept) ? (JSON.parse(readFileSync(kept, "utf8")) as { id?: string }).id
    : undefined;
  if (id !== undefined && id !== code.name) {
    console.error(`  ${out} is not a translation of ${code.name}; not cleared`);
    process.exit(1);
  }
  const list = join(out, WRITTEN);
  if (existsSync(list)) {
    for (const path of readFileSync(list, "utf8").split(/\r?\n/).filter(Boolean)) {
      rmSync(join(out, path), { force: true });
      prune(dirname(join(out, path)), out);
    }
  }
  const files = files_of(code, shapes, system);
  write_all(out, files);
  writeFileSync(list, [...files.keys(), ""].join("\n"));
  const mods = code.packages.flatMap((p) => p.modules);
  console.error(`  ${code.packages.length} packages, ${mods.length} modules, ${files.size} files`);
}

/** Empty folders removed, from `dir` up to the root. */
function prune(dir: string, root: string): void {
  for (let at = dir; at.length > root.length && existsSync(at) && !readdirSync(at).length;
       at = dirname(at)) rmdirSync(at);
}

main(process.argv.slice(2));
