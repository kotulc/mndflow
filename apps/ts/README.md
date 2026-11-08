# apps/ts

**Translates a TypeScript or JavaScript project into a source folder of the `ts` package's kinds, which `collect` reads into a workspace.** The rules it follows are design.md's *Translation*; this is how it does it. Moved out of this repo once the schema settles.

## Running it

```sh
npm run start -w @mnd/ts -- <project> [folder] [--tsconfig path] [--components n]
npm run code                  # this repo → samples/code, collected to samples/code.json
```

Without a folder it prints the structure and writes nothing. With one, the folder is written fresh; then `npm run start -s -w @mnd/cli -- collect <folder> <out>.json --workspace` and `check` it. `npm run packages` after any change to the `ts` kinds (`packages/defs/src/packages/ts`).

## Modules

| Module | Does |
|---|---|
| `read.ts` | ts-morph to data: packages, modules, imports weighted by the symbols read and resolved through barrels, calls, entries (barrels and wiring: configs and MDX pages that import the project's code); scope (`src_of`, `in_scope`) |
| `structure.ts` | the stages below; `SETTINGS` |
| `report.ts` | the printed structure |
| `write.ts` | the source folder: one model, packages, component files, entry paths, the vocabulary and its class diagrams |
| `main.ts` | the command |

## Stages

**Deterministic stages over the dependency graph**, drawn from architecture-recovery work (Bunch's omnipresent modules, ACDC, Louvain). Every threshold is a default bounded by a floor and a ceiling.

| # | Stage | What it does |
|---|---|---|
| 1 | **graph** | module edges weighted by the symbols imported; an import of types only weighs nothing |
| 2 | **foundation and entry** | the modules most of a package imports set aside below, those importing most of it (with barrels and wiring) above; their lines implied, never drawn. The run kept is the one splitting the rest most cleanly, which may be none |
| 3 | **components** | Louvain on what remains, scored at resolution 1; of the splits within the ceiling, those whose components rank (fewest modules importing each other round) win, then one needing no further split, then the cleanest; one still over the ceiling splits again; modules joined to nothing grouped by folder |
| 4 | **levels** | the heavier direction ranks two components importing each other; a cycle left is one component holding its modules, a level down |
| 5 | **paths** | a package nothing uses is where the system starts; its top modules are its entries, and their calls are walked across packages, wide before deep, never into a shared module |
| 6 | **salience** | PageRank over imports, scaled by length, orders a component's modules; every module is written |
| 7 | **vocabulary** | interfaces, classes and object types another module reads, owned by the block holding their module, at most `most` an owner by fan-in |
| 8 | **names** | a folder's name where a component is its whole folder; else tf-idf over its module names against its siblings'; else its anchor |
| 9 | **score** | modularity, budget fit and cycles, printed; they guide, never decide |

| Setting | Default | |
|---|---|---|
| `budget` | 7 | components a layer aims under; `--components` |
| `most` | 9 | the ceiling (`budget + 2`), also types an owner |
| `share` | 0.35 | the share of a package a foundation or entry takes at least |
| `depth` | 2 | how deep a package splits |
| `bonus` | 0.5 | added to an import's weight within one folder |
| `steps`, `reach` | 12, 4 | a path's most steps, and how many calls deep it follows |

## What it writes

| File | Holds |
|---|---|
| `<model>.yaml` | one model named by what was read (`src`, else `code`): its packages, entries first, and the dependencies between them |
| `<model>/<package>.yaml` | a `ts.package`: its entries (`ts.entry`), components by level, shared modules (`ts.shared`), in reading order, and the lines between them, each named by what crosses |
| `<package>/<component>.yaml` | a `ts.component`: its modules, most salient first, and their lines |
| `<entry>/<entry>-path.yaml` | an entry's `sequence`: what it calls, in the order it first calls it |
| `<owner>/<owner>-types.yaml`, `types/…` | the vocabulary: a definition per shared type, fields as attributes, a `class` diagram per owner |

Ids are minted from source paths and names, a component's from its anchor, so translating again keeps them. Every block keeps `source`.
