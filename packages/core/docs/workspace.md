# Workspace

**The workspace is the root folder.** There is no workspace type and no project type — one graph, one log, and the tree is folders and blocks.

| | Contains | Holds |
|---|---|---|
| **workspace** | folders and top-level blocks | the log, the metadata, handle counters, pinned definitions, the definition shelf |
| **folder** | folders and top-level blocks | nothing of its own |
| **top-level block** | its own tree | a subtree of blocks |

- **It is a block**, with `parent: null` and a reserved id, and needs no new schema to be one.
- **A top-level block is informally a *project*** — the way *container* is a word for a block with children. Not a type, and not in the schema.
- **`is_top_block` reads it from position.** Nothing stores it.
- **Making one is making a block**, through the same door as anything else.
- **Every block carries an `id`**, minted once and kept for life, so renaming breaks no reference.
- **Names are unique among siblings**, which needs no special case for a top-level block.

## One log

**One document, one history**, so nothing routes and no action can write to the wrong place. Undo is workspace-wide, which is what a single document means.

## Definition resolution is by id

**A usage names a definition id, and resolution is global** — no import list, and no tree to climb. Two definitions may share a name; nothing shadows.

- **A plain element follows its kind's default.** Naming nothing, or naming a base, resolves through the workspace's default for that kind (`def_of`), and is stored as plain (`stored_type`).
- **Ids are minted.** A caller that must know a new definition's id before the step lands mints it and passes it in.
- **A name is looked up with its group** (`def_named`), since a block definition and a relation definition may share one.

## The shelf

**How the explorer files the workspace's own definitions is model data**, held on the root block and written to the log, so it exports and it undoes. One ordered list says which folders there are and what sits in each; blocks and relations are filed apart. **The system's definitions are not filed** — a base, a default and a package's read where they always do — and a definition nobody filed sits at its group's top, by name.

## Session state

**Held outside the log and never in a file** — the open layer, the selection, the explorer fold, the theme, and every toggle. Opening somebody else's workspace must not rearrange your toggles.

**The test: is it in the log?** A block's name is, so it exports and it undoes. Whether interfaces are shown is not, so it does neither.

**`arrangement` is the exception that proves the rule** — it looks like a display preference and is model data, because how a layer lays out is part of what the layer says. The test is *is it in the log?*: `arrangement` is, so it exports and it undoes.

## In and out

- **Any subtree exports**, and the workspace export is simply the root folder's. One path, and no type had to exist for it.
- **A subtree travels with its dependencies** — the definitions anything in it names, and their `extends` chains.
- **A reference out of the subtree is kept, not tidied away**, and reads *missing* where it lands. Same rule as a deleted target, so importing needs no second answer.
- **Importing is a checkpoint**, so there is no second format and no second reader.
- **Grafting brings a file into a layer** as one step, and the workspace wins.

## One gesture, one step

**`session.batch(fn)` merges everything `fn` runs into one step.** Inside it each action sees the one before it, and all of them undo as one. Every canvas adjustment runs in one.
