# Simplification plan

**Eliminate special cases; generalize the structure and the logic.** The next big effort, decided 2026-11-05: listing every block in the explorer exposed blocks that are not concepts and drawing rules that distort the concepts they draw. A block is a compound concept, an abstraction or a grouping (design.md); anything else that is a block today is a defect in the model, and any rule that draws one thing as another is a special case to remove or generalize. Delete this plan when the inventory below is settled.


## Principles

- **a block is a concept**: never a position, a label, a count, a fold or an anchor for something else
- **a view never writes the model**: what a view folds, numbers, merges or lays out is the view's, worked out when drawn
- **no self-reference**: nothing is drawn by a child pointing back at what holds it
- **one rule per behaviour**: a special case is either generalized into the rule or removed


## Settled

| Found | Was | Now |
|---|---|---|
| sequence step numbers | the translator wrote a block per row (`0`–`12`) to address its cells | rows by number; the grid draws the numbers (apps/ts `write.ts` `entry_files`) |
| salience folds | the translator wrote an `other` block standing for the least salient modules | every module written, the most salient first; the map folds by room into *+n more* (`component_files`) |
| a treemap naming a root | `Estate` sat inside Shop and drew Shop by `of`, so it drew itself | removed; a treemap diagram draws what it holds, and the models' map is the shop's treemap |
| the checkout saga's rows | blocks *Submit*, *Charge*, *Reserve*, *Confirm* only labelling time steps | rows by number |
| grid headers as blocks (row 1) | a row or column that only needed a name got a block | **labels are plain data on the grid**: typing labels a cell or header, a block in a labelled line or cell carries the label as a tag (derived), a header block only where it stands for a concept; rows numbered and columns lettered by default. The swimlane's phases and the environments' regions are labels now |
| typed-in labels as blocks (row 3) | typing into an empty cell made a `label` block | it labels the cell |
| box merge (rows 4, 7) | a box holding only a box drawn as one, *A › B*, on the map and in the explorer | every box its own, nested plainly; the explorer's package exemption gone with it |
| sequence steps (row 2) | a step block per call, only to anchor a message | **steps stay blocks**: a step is an occurrence, and messages are drawn between steps or their lifelines (2026-11-06) |
| a block drawn as its behaviour (row 5) | a block holding only behaviours drew as one chip showing its first | **a block draws as itself with what it holds inside it**; holding nothing, it is a plain block (2026-11-06) |
| notation flattened (row 8) | groups drawn as panels on the map, members listed at their level | **a group is layer-local and not a block**: it tags its members (`groups`) and is never an explorer row; the map draws its panel round its members, as **the map draws like any layer, or set of layers, flattened** (2026-11-06) |
| a reference drawn as its target (row 6) | a reference draws on the map with its target's name, contents, hover card and hops | **kept**: a reference is a stand-in for its target (2026-11-06) |
| diagram kind vs view (row 9) | `treemap` was both a block's type and a layout; a second view of a block was a child diagram of references | **one diagram kind per block**, deciding how its parts relate; a behaviour is a related block of its own. **`layout` is dropped**: the kind fixes the view and arrangement; `cards` and `shape` move to the kind's `card`/`style`; `page` retired; usages carry no settings. A treemap is a kind that draws containment, no lines. Overview's `layered` override removed (2026-11-06) |


## Inventory: to settle

| # | Special case | Where | Question |
|---|---|---|---|
| | none open; the sweep (*Approach* 1) may add rows | | |

## Built 2026-11-06

| Change | Where |
|---|---|
| **a line to a holder's own port is followed through it**: Shipping reaches Carrier, Payments Card processor, Customer Gateway; a hop never joins a block to what holds it, so no map leg leaves the wrong edge (was: Shipping → Shop cut through Shipping) | core `tree.ts` `joins`, `within`; views `trace.ts` `hop_trace`, `holders` |
| row 5: a block holding a behaviour is a box with it inside; `only_behaviour` gone, reading a block enters the block | views `tree.ts`; core `ends.ts`, `navigate.ts` `read_at` |
| row 9: `layout` replaced by a kind-only `diagram` setting (`view`, `placing`, `cards`, `shape`); usages set nothing; `page` placing, hand placement (`free`, `belongs_to`) and the stand-in's own view (`diagram_subject`) removed; overrides gone from Overview, the translator's top model and two elements samples | core `components.ts`, `tree.ts` `placing_of`, `navigate.ts`, `sources.ts`, `actions`; views `arrange.ts`, `block.ts`, `pack.ts`, `look.ts`, `size.ts`, `classes.ts`; defs `base/`; apps/ts `write.ts` |
| rows 2, 6, 8: no change needed; the code already matches | |
| sample: a duplicate `routes` line removed from the shop | `samples/example/overview/shop.yaml` |
| the explorer's wash only on an entered layer | explorer `Explorer.tsx` `in_view` |

## Approach

1. **Inventory first**: sweep the samples and the code for every block that is not a concept and every rule that draws one thing as another; extend the table above
2. **settle each with the user**, simplest general rule first; record it in design.md as decided
3. **build in one pass per rule**, deleting the special case's code, its docs and its tests together (code-homes.md names each home)
4. the samples (`samples/example`, `samples/elements`, both translations) are the check: regenerate, `check` clean, read in the app
