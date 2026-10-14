# apps/cli

**The headless app, and the harness that makes *independent and testable* true.** It binds `storage` to a file and `files` to `fs`, and exercises core, views and defs exactly the way a real consumer would — with no React anywhere in the process.

## Where it sits

```
cli   ◀
└─ views · fixtures · defs
   └─ core
```

## Running it

```sh
npm run start -w @mnd/cli -- <verb> <source> [args]
npm run start -w @mnd/cli -- fold related    # the one to try first
```

| Verb | Does |
|---|---|
| `fold` | fold a log and print the block tree |
| `check` | run the door, print faults and repairs; a source folder is collected first |
| `project` | project a layer and draw the Scene as text; a layer naming a diagram (`layout.view`) is projected as that diagram |
| `outline` | list what a projection holds — composition rather than placement |
| `review` | ask what the definitions wanted |
| `run` | apply an action and print what it wrote |
| `search` | fetch a definition package, through the door |
| `translate` | write the graph as SysML, and check it comes back |
| `export` | fold and write the file |
| `collect` | a source folder — definition files, diagram files, markdown cards, and the packages they list — as one package file, or with `--workspace` as the workspace: `collect <folder> [out.json]` |

`<source>` is a fixture name, an exported file, a raw log, or a source folder — **a log is harness input only**, since a file is a graph. `--how` sets the layout, `--layer` which layer, `--from` the catalogue `search` reads, and `--with` a vocabulary to bring in first. `--svg` draws instead of printing, and `--round` checks a translation comes back. A value said as `k=@path` is that file's text: `run x.json attach id=pump text=@cards/pump.md`.

## Why it exists

**A passing suite proves the code agrees with itself. A CLI proves the packages compose** — that a log folds, an action writes, a layer projects, and a Scene is complete enough to draw from. It is what lets core, layout and views be built and driven **before any UI exists**.

**When a track can be driven from the CLI it is done being built in the dark.**

**A notation regression is a diff, not a screenshot.** Text projections of shape — not coordinates — are what the view modules are tested against.
