# Workspace

**The workspace is the editable package.** Its root is `graph.root`; everything the user can edit sits under it. Other packages sit beside it in the same graph, frozen.

| | Is |
|---|---|
| **workspace root** | a package root with a reserved id. Holds the handle counters |
| **new workspace** | its root and one plain definition, `main`, opened by default. Groupings are the user's; samples show them |
| **what a package uses** | worked out from the types, traits and tags it names (`uses_of`), never stored |

- **Every block carries an `id`**, minted once and kept for life, so a rename breaks nothing.
- **Names are unique among siblings.**
- **A used package is never removed**; `base` and the workspace never are.


## One log

**One document, one history**, so nothing routes and no action writes to the wrong place. Undo is workspace-wide.

**`session.batch(fn)` merges everything `fn` runs into one step.** Inside it each action sees the one before it; all of it undoes as one.


## Resolution

- **By id, across the graph.** A usage names a definition id; nothing shadows.
- **By name, within a package.** One name space per package: tags, traits and definitions share it. The workspace's own answers first.
- **A plain block names nothing** and resolves to its base.


## Session state

**Outside the log, never in a file**: the open layer, the selection, the folds, the theme, and the toggles; a host may keep more of its own. Opening somebody's file must not rearrange yours. The test: is it in the log? A block's name and a layer's layout are, so they export and undo; whether interfaces show is not.


## In and out

- **Every package is a JSON file**, `base` and `markdown` included. A host keeps only the id constants its code reads.
- **A workspace export is whole**: the workspace package and every package brought in beside it; `base` never travels.
- **Export as package** writes the workspace as a package: its root and ids prefixed with the name given.
- **A package is the smallest export.** Nothing smaller is written as a file.
- **Importing is a checkpoint.** Bringing a package in adds it beside the workspace, frozen, through the door.
