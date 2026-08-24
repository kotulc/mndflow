# Workspace

**The workspace is the root folder.** There is no workspace type and no project type — one graph, one log, and the tree above the tiers is folders.

| | Contains | Holds |
|---|---|---|
| **workspace** | folders and tier roots | the log, the metadata, all session state |
| **folder** | folders and tier roots | nothing of its own |
| **tier root** | its own tree | a subtree of blocks |

- **It is a block**, with `parent: null` and a reserved id, and needs no new schema to be one.
- **A top-level block is informally a *project*** — a word for a tier root, the way *container* is a word for a block with children. Not a type, not a tier, and not in the schema.
- **`is_tier_root` reads it from position.** Nothing stores it.
- **Making one is making a block**, through the same door as anything else.
- **Every block carries an `id`**, minted once and kept for life, so renaming breaks no reference.
- **Names are unique among siblings**, which needs no special case for a top-level block.

## One log

**One document, one history**, so nothing routes and no action can write to the wrong place. Undo is workspace-wide, which is what a single document means.

## Definition resolution walks up the tree

**A block finds a definition by climbing its ancestors, nearest first** — rather than by following an import list. There is no order to maintain and nothing to keep in step with what exists, and a definition filed higher is in scope for everything below it without being declared anywhere.

**A `type` naming no definition is minted into one**, under an id derived from its name, so this settles rather than churning on every fold.

## Session state

**Held outside the log and never in a file** — the open layer, the selection, the explorer fold, which view each layer was last shown in, the theme, and every toggle. Opening somebody else's workspace must not rearrange your toggles.

**The test: is it in the log?** A block's name is, so it exports and it undoes. Whether interfaces are shown is not, so it does neither.

**`arrangement` is the exception that proves the rule** — it looks like a display preference and is model data, because inference reads the reading direction and an inference is permanent.

## In and out

- **Any subtree exports**, and the workspace export is simply the root folder's. One path, and no type had to exist for it.
- **A subtree travels with its dependencies** — the definitions anything in it names, and their `extends` chains.
- **A reference out of the subtree is kept, not tidied away**, and reads *missing* where it lands. Same rule as a deleted target, so importing needs no second answer.
- **Importing is a checkpoint**, so there is no second format and no second reader.
