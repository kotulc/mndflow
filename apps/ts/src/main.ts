/** `mnd-ts <project> [folder] [--tsconfig path] [--components n]`: a TypeScript or JavaScript
 *  project's structure reported; given a folder, also translated into a source folder, written
 *  fresh each time, that `mnd collect <folder> --workspace` reads into a workspace. */

import { existsSync, readFileSync, rmSync } from "node:fs";
import { parse } from "yaml";
import { join, resolve } from "node:path";
import { read_code, type Code } from "./read";
import { against, report, type Target } from "./report";
import { SETTINGS, structure_of, type Levels, type Shape } from "./structure";
import { files_of, write_all } from "./write";

const USAGE = "usage: mnd-ts <project> [folder] [--tsconfig path] [--components n]";


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

/** The source folder written; only a folder this translator wrote for the same project is
 *  cleared. */
function write_to(out: string, code: Code, shapes: Shape[], system: Levels): void {
  if (existsSync(out)) {
    const kept = join(out, "package.json");
    const id = existsSync(kept) ? (JSON.parse(readFileSync(kept, "utf8")) as { id?: string }).id
      : undefined;
    if (id !== code.name) {
      console.error(`  ${out} is not a translation of ${code.name}; not cleared`);
      process.exit(1);
    }
    rmSync(out, { recursive: true });
  }
  const files = files_of(code, shapes, system);
  write_all(out, files);
  const mods = code.packages.flatMap((p) => p.modules);
  console.error(`  ${code.packages.length} packages, ${mods.length} modules, ${files.size} files`);
}

main(process.argv.slice(2));
