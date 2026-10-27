# Order

Reading order is the list in the file or the package. Several places replace that list with a sort of their own. Bands put regions that have lines first and move a loose block into the band its lines touch. Relations are sorted by id, so `r10` comes before `r2`. A library entry stated twice is dropped and appended, so it moves to the end. This removes those sorts. The list is the order the explorer, the tray, placement, and the maps read, core `models` included. Lands before groups and drag.

`Block.order` stays the graph's copy of a block's place in its parent's list. Collect assigns it, and a reorder changes it. It is not written as a key in a diagram file or a card source. `design.md` (*no places*) already says so. `schema.md` says the opposite and is corrected here.

## Steps

| # | Step | Where |
|---|---|---|
| 1 | **bands follow the list.** Delete the met-then-unmet split and the line-based part assignment. A region no line meets stays packed as one unit, in its list place | views `flow.ts` `banded` |
| 2 | **relations keep list place.** Set `order` when a relation is read. `edges_in` sorts by it | core `sources.ts`, `types.ts` `Relation`, `tree.ts` `edges_in` |
| 3 | **a restated library entry stays put** | core `sources.ts` `library` |
| 4 | **`order` in a source is a fault** | core `diagram.ts` `values_of`, the door |
| 5 | **docs.** `schema.md` drops the `order` key. design.md and definitions.md already say bands follow the list | core `schema.md` |

The tray is unchanged. Earlier and later already rewrite sibling `order`.


## Where a list already exists

| List | Read as |
|---|---|
| `blocks:` in a diagram file, and the blocks nested under one | `sources.ts` `lay`: each sibling's `order` is its place in that list. Already so |
| files in a package directory | path sort (`localeCompare`), which is why a number prefix orders siblings. Already so |
| `ports`, `rows`, `cols`, `attributes`, `values`, `tags`, `constraints` | the array on the block or the entry. Already so |
| a library array (`types`, `tags`, `interfaces`, `constraints`) | the order files are visited, then the list inside each file |
| `relations:` | the list in the file. Not kept: `edges_in` sorts by id, and `r10` sorts before `r2` |

A workspace file is the graph, not a source list. `Block.order` is stored on the block. `file.ts` `write` sorts the JSON keys by id; that is key order, not sibling order. `read` keeps `order`.


## The rule

One walk, `children()` in `tree.ts`, which sorts by `order` then id. Every reader of sibling order uses it — the explorer, bands, `models`, the maps. No second rank.

| | |
|---|---|
| **source** | collect mints `order` from the list. An `order` key in a diagram file or a card source is a fault, not a value. It is not added to `BLOCK_KEYS` |
| **reorder** | the tray's earlier and later already call `move` with `before`. `reorder` renumbers the siblings. That is the edit. It does not write a source file |
| **two reloads** | reading the workspace back keeps `order`. Collecting the source again follows the file list and replaces it. Sources are not written back (`design.md`, *collected, one way*) |
| **a library entry said again** | `sources.ts` `library` drops the entry and appends it, so a repeat moves to the end. Replace it at its index |
| **a relation** | minted `order` from its place in `relations:`, the same field as a block. `edges_in` sorts by that, then id |


## Bands

`flow.ts` `banded` rebuilds region order. Regions a line meets come first, the others come last, and only inside each of those groups does the list apply. A loose block is then moved into the band of whatever its lines touch.

Both go. Sibling order is the band order.

Walk `spec.root.kids`, which `spec_of` already builds from `children()`:

| In the list | Becomes |
|---|---|
| a region | the next band, in that place |
| a contiguous run of blocks in no region | a band of its own between the regions it sits between, with no heading |

A region no line meets is still packed as one unit. That is how it is shaped, not where it sits. A loose block is not pulled into a neighbor's band because a line reaches it.

Shop's regions are then Customer facing, Back office, Data, How it runs, which is `shop.yaml`. Data stays third whether or not a line meets it.


## Done when

Shop's bands follow `shop.yaml`, both canvas shapes, including a region no line meets. Earlier on a region moves its band. Export the workspace and read it back: the band stays. Collect the source again: the file list returns. A relation list and a library list keep the order they were written in, a repeated entry included.
