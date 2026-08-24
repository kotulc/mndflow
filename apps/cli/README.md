# apps/cli

**The headless app, and the harness that makes *independent and testable* true.** It binds `storage` to a file and `files` to `fs`, and exercises core, layout and views exactly the way a real consumer would — with no React anywhere in the process.

```
npx tsx apps/cli/src/main.ts <verb> <source> [args]
```

| Verb | Does |
|---|---|
| `fold` | fold a log and print the block tree |
| `check` | run the door, print faults and repairs |
| `project` | project a layer and draw the Scene as text |
| `outline` | list what a projection holds — composition rather than placement |
| `run` | apply an action and print what it wrote |
| `export` | fold and write the file |

`<source>` is a fixture name or a path to a `.json` log. `--how` sets the arrangement, `--read` the reading of a behavior layer, and `--view` the module.

## Why it exists

**A passing suite proves the code agrees with itself. A CLI proves the packages compose** — that a log folds, an action writes, a layer projects, and a Scene is complete enough to draw from. It is what lets core, layout and views be built and driven **before any UI exists**.

**When a track can be driven from the CLI it is done being built in the dark.**

**A notation regression is a diff, not a screenshot.** Text projections of shape — not coordinates — are what the view modules are tested against.
