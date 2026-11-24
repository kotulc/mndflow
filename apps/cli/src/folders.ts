/** **Source folders** on disk: their files read, collected as a package or the workspace with
 *  what they import, and the folder a file sits in. Shared by the commands and `set`. */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { collect, fold, wanted, type Collected, type Graph, type Leaf } from "@mnd/core";
import { FLOOR } from "@mnd/defs";

/** Where the packages catalogue lives, at the repo root. */
export const CATALOGUE = resolve(dirname(fileURLToPath(import.meta.url)),
                          "../../../public/packages/index.json");

/** Every file under a folder, by its path from it, skipping what is hidden. */
export function leaves(folder: string, at = folder): Leaf[] {
  return readdirSync(at).flatMap((name): Leaf[] => {
    if (name.startsWith(".") || name === "node_modules") return [];
    const full = join(at, name);
    if (statSync(full).isDirectory()) return leaves(folder, full);
    return [{ path: relative(folder, full).split(sep).join("/"), text: readFileSync(full, "utf8") }];
  });
}
/** A source folder collected, with every package it imports loaded first: a catalogue name from
 *  beside the catalogue, a path from the folder — itself a package file or a folder. */
export function gathered(folder: string, workspace: boolean, bare = false,
                  seen = new Set<string>()): Collected {
  /** A folder importing itself, or two importing each other, is read once. */
  seen.add(resolve(folder));
  const files = leaves(folder);
  let over = fold([], FLOOR);
  const notes: string[] = [];
  for (const want of wanted(files)) {
    const at = want.startsWith("./") ? resolve(folder, want)
      : join(dirname(CATALOGUE), `${want}.json`);
    if (seen.has(resolve(at))) continue;
    const text = !existsSync(at) ? undefined
      : statSync(at).isDirectory() ? gathered(at, false, false, seen).text
      : readFileSync(at, "utf8");
    if (text) over = joined(over, text);
    else notes.push(`${want}: no such package; its names become plain definitions`);
  }
  const got = collect(basename(resolve(folder)), files, over,
                      { bare, ...(workspace ? { root: over.root } : {}) });
  return { ...got, notes: [...notes, ...got.notes] };
}

/** A package file's blocks and relations beside what a graph holds; an id already there stays. */
function joined(graph: Graph, text: string): Graph {
  const file = JSON.parse(text) as { graph?: Partial<Graph> };
  return { ...graph, blocks: { ...file.graph?.blocks, ...graph.blocks },
           edges: { ...file.graph?.edges, ...graph.edges } };
}

/** Whether a file would sit in a source folder. */
export function in_source(file: string): boolean {
  try { package_root(resolve(file)); return true; } catch { return false; }
}

/** The source folder a file sits in: the nearest folder above it holding a `package.json`. */
export function package_root(file: string): string {
  for (let at = dirname(file); ; at = dirname(at)) {
    if (existsSync(join(at, "package.json"))) return at;
    if (dirname(at) === at) throw new Error(`${file} is in no source folder`);
  }
}
