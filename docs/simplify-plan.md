# Simplification plan

**Eliminate special cases; generalize the structure and the logic.** The next big effort, decided 2026-11-05: listing every block in the explorer exposed blocks that are not concepts and drawing rules that distort the concepts they draw. A block is a compound concept, an abstraction or a grouping (design.md); anything else that is a block today is a defect in the model, and any rule that draws one thing as another is a special case to remove or generalize. Delete this plan when the inventory below is settled.


## Principles

- **a block is a concept**: never a position, a label, a count, a fold or an anchor for something else
- **a view never writes the model**: what a view folds, numbers, merges or lays out is the view's, worked out when drawn
- **no self-reference**: nothing is drawn by a child pointing back at what holds it
- **one rule per behaviour**: a special case is either generalized into the rule or removed
- **no hand-placed references** in any diagram: a diagram draws what the model says, it does not restate it


## Settled 2026-11-05

| Found | Was | Now |
|---|---|---|
| sequence step numbers | the translator wrote a block per row (`0`–`12`) to address its cells | rows by number; the grid draws the numbers (apps/ts `write.ts` `entry_files`) |
| salience folds | the translator wrote an `other` block standing for the least salient modules | every module written, the most salient first; the map folds by room into *+n more* (`component_files`) |
| a treemap naming a root | `Estate` sat inside Shop and drew Shop by `of`, so it drew itself | removed; a treemap diagram draws what it holds, and the models' map is the shop's treemap |
| the checkout saga's rows | blocks *Submit*, *Charge*, *Reserve*, *Confirm* only labelling time steps | rows by number |
| grid headers as blocks (row 1) | a row or column that only needed a name got a block | **labels are plain data on the grid**: typing labels a cell or header, a block in a labelled line or cell carries the label as a tag (derived), a header block only where it stands for a concept; rows numbered and columns lettered by default. The swimlane's phases and the environments' regions are labels now |
| typed-in labels as blocks (row 3) | typing into an empty cell made a `label` block | it labels the cell |
| box merge (rows 4, 7) | a box holding only a box drawn as one, *A › B*, on the map and in the explorer | every box its own, nested plainly; the explorer's package exemption gone with it |


## Inventory: to settle

| # | Special case | Where | Question |
|---|---|---|---|
| 2 | **sequence steps are blocks**: a message runs between blocks in cells, so every call gets a block (`fixture()`, `start`) only to anchor it | core grid model, views `lifelines.ts`; apps/ts `entry_files` | messages between lifelines, ordered, with no step blocks · keep steps as occurrences |
| 5 | **a block drawn as its behaviour**: a block holding only behaviours is one chip showing its first | views `tree.ts` `shows_of`; core `only_behaviour` | draw the block, its behaviours inside it |
| 6 | **a reference drawn as its target**: chips, hover cards and hops read through a reference to what it stands for | views `tree.ts`, `about.ts`, `trace.ts` `standing` | follows the no-hand-placed-references principle: lifelines and lanes derived rather than placed |
| 8 | **notation flattened**: groups and regions list their members at their level, panels on the map | views `tree.ts` (groups as panels), explorer `rows.ts` `listed` | a group is a grouping concept: a block, or a tag on its members (`groups`) |
| 9 | **diagram kind vs view**: `treemap` is both a block's type and a layout; a block's alternative views are child diagrams of it | core `layout_of`, `diagram_kind`; design.md *Diagram kinds* | a view of a block chosen as a view, never a block |


## Approach

1. **Inventory first**: sweep the samples and the code for every block that is not a concept and every rule that draws one thing as another; extend the table above
2. **settle each with the user**, simplest general rule first; record it in design.md as decided
3. **build in one pass per rule**, deleting the special case's code, its docs and its tests together (code-homes.md names each home)
4. the samples (`samples/example`, `samples/elements`, both translations) are the check: regenerate, `check` clean, read in the app
