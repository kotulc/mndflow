# CLI

**The headless app, and the harness that makes *independent and testable* true.** It binds `storage`
to a file and `files` to `fs`, and it exercises core, layout and views exactly the way a real
consumer would — with no React anywhere in the process.

```
mnd fold <file>                    fold a log and print the block tree
mnd run <action> [args]            apply an action, print what it wrote
mnd project <block> --view block   project a layer and print the Scene as text
mnd check <file>                   run the door, print faults and repairs
```

**Why it exists.** A passing suite proves the code agrees with itself. A CLI proves the packages
compose — that a log folds, an action writes, a layer projects, and a Scene is complete enough to
draw from. It is what lets core, layout and views be built and driven **before any UI exists**.

**A notation regression is a diff, not a screenshot.** Text projections of shape — not coordinates —
are what the view modules are tested against.
