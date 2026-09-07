# apps/cli

**The headless app, and the harness that makes *independent and testable* true.** It binds `storage` to a file and `files` to `fs`, and exercises core, views and defs exactly the way a real consumer would — with no React anywhere in the process.

## Where it sits

```
cli   ◀
└─ views · terminal · fixtures · defs
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
| `check` | run the door, print faults and repairs |
| `project` | project a layer and draw the Scene as text |
| `outline` | list what a projection holds — composition rather than placement |
| `review` | ask what the definitions wanted |
| `run` | apply an action and print what it wrote |
| `search` | fetch a definition package, through the door |
| `translate` | write the graph as SysML, and check it comes back |
| `export` | fold and write the file |

`<source>` is a fixture name, an exported file, or a raw log — **a log is harness input only**, since a file is a graph. `--how` sets the arrangement, `--layer` which layer, `--from` the catalogue `search` reads, and `--with` a vocabulary to bring in first. `--svg` draws instead of printing, and `--round` checks a translation comes back.

## Why it exists

**A passing suite proves the code agrees with itself. A CLI proves the packages compose** — that a log folds, an action writes, a layer projects, and a Scene is complete enough to draw from. It is what lets core, layout and views be built and driven **before any UI exists**.

**When a track can be driven from the CLI it is done being built in the dark.**

**A notation regression is a diff, not a screenshot.** Text projections of shape — not coordinates — are what the view modules are tested against.
