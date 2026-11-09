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
| `read.ts` | ts-morph to data: packages, modules, imports weighted by the symbols read and resolved through barrels, calls; **declared entries** (`bin`, `scripts`, Dockerfile, an HTML module script, a framework's files); what each module answers: where it runs, the outside it touches, files read and written, config keys, tests, flows; scope (`src_of`, `in_scope`) |
| `structure.ts` | the stages below; `SETTINGS` |
| `report.ts` | the printed structure; against a target (`<folder>.target.yaml`) where one is kept |
| `write.ts` | the source folder: every unit a definition by package, one model per entry path, the vocabulary |
| `main.ts` | the command |

## Stages

**Deterministic stages over the dependency graph**, drawn from architecture-recovery work (Bunch's omnipresent modules, ACDC, Louvain). Every threshold is a default bounded by a floor and a ceiling.

| # | Stage | What it does |
|---|---|---|
| 1 | **graph** | module edges weighted by the symbols imported; an import of types only weighs nothing |
| 1b | **containers** | a package's modules by where they run (browser, node); components are found inside one, never across |
| 2 | **foundation and entry** | the modules most of a package imports set aside below, those importing most of it (with barrels and wiring) above; their lines implied, never drawn. The run kept is the one splitting the rest most cleanly, which may be none |
| 3 | **components** | Louvain on what remains, scored at resolution 1; of the splits within the ceiling, those whose components rank (fewest modules importing each other round) win, then one needing no further split, then the cleanest; one still over the ceiling splits again; modules joined to nothing grouped by folder |
| 4 | **levels** | the heavier direction ranks two components importing each other; a cycle left is one component holding its modules, a level down |
| 5 | **paths** | the system starts at its declared entries; where it declares none, at a package nothing uses, its top modules its entries; and their calls are walked across packages, wide before deep, never into a shared module |
| 6 | **salience** | PageRank over imports, scaled by length, orders a component's modules and, summed over a path's units, the models; every module is written |
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
| `steps`, `reach` | 12, 4 | a path's steps it aims under, a default never a cap on the model (2026-11-08), and how many calls deep it follows |

## What it writes

**The library is the system; a model is one path's story** (2026-11-08).

| File | Holds |
|---|---|
| `<pkg>/<container>/<n>-<unit>.yaml` | every unit a definition, filed by package (`parts` for a lone one) and container where a package has more than one, in reading order: entry modules (`ts.entry`), components by level (`ts.component`, its modules as parts, most salient first, and their lines; its own components under `<pkg>/<n>-<unit>/`), shared modules (`ts.shared`). A module's API is its parts: the functions and values another unit reads (`ts.function`, `ts.value`, each its `signature`); an API function calling three or more of the project's is a `flow` under it. A unit says `runs`, `entered`, `types` (shared types read), `reads` and `writes` (files), `config`, `touches`, `tests`, then `lines`; a module its header as `description`, a component its members' headers joined, most salient first |
| `package.json` | the package block, described by the manifest's `description`, else the README's lead paragraph |
| `outside/<actor>.yaml` | the system's edge (`ts.actor`): the file system, processes, network, terminal, environment, each command run, each framework hosting an entry |
| `<n>-<entry>.yaml` | a model per entry path of two steps or more, **named by how its entry is entered** (`npm run ingest`, `Docker → cli`, `nextra → theme-config`, `browser → main`; its unit's name where nothing declares it), its description its entry's header where it has one, its actors after its units, a line from each unit touching one; numbered by summed salience, the most first: uses of the units the path passes through in first-visit order, then the shared modules they import; a `dependency` line a step, in order, named by what is called |
| `types/<pkg>/<owner>/<Type>.yaml` | the vocabulary: a definition per shared type, fields as attributes |

Ids are minted from source paths and names, a component's from its anchor, so translating again keeps them. Every unit keeps `source`. A model reads its units by `<project>.<pkg>.<unit>`, so no folder is taken for the project.
