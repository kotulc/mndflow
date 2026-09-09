# Plan

**A vocabulary folder at the top of the explorer, one gesture that fills it, and one tray pattern everything is drawn in.** Customise a block, save that as a named type, optionally make it the default for its kind, and find it later beside the base kinds and the imported packages.

**Status: over-built, and this plan is mostly subtraction.** The engine work landed and is sound. The surfaces forked: a second row renderer beside the tree, a second describe panel beside the element panel, a second drag payload, a second way to drop a definition, and a reserved id namespace where a checkbox would have done. All of it comes out. What is left is smaller than what was there before the feature started.


## The one rule

**A definition and a block say the same thing, one layer apart.** `Block.looks` and `Definition.components` are the same type — the same keys, the same property names, the same closed sets. `look_of` reads the chain and then the block's own bag on top; `look` writes into whichever bag it is handed.

**Every division below exists because that rule was forgotten somewhere.** Where two things ask the same question, there is one surface, and the id says which holder it is about.

| Forked today | Unified to |
|---|---|
| `Vocabulary.tsx` beside the tree | rows in the tree, from `tree_of` |
| `Definition.tsx` beside `Element.tsx` | one panel, taking one id |
| `DRAGGED_DEF` beside `DRAGGED` | one payload — the receiver looks the id up |
| `undefine` beside `unpin` | one remover |
| `defs_in_scope` beside `vocabulary()` | one list |
| nine tabs inside a tab | nine rows in one table |


## The folder

**System-managed, virtual, first in the tree.** The vocabulary root wears a pin mark, holds one sub-folder per source, and sits above the workspace's own blocks with a separator under it.

| | |
|---|---|
| **what it holds** | `this workspace` first, then `base`, then each imported package — grouped by `Definition.from`, which is absent for the workspace's own |
| **what a row is** | an ordinary explorer row. Same renderer, same fold state, same guides, same marks, same drag |
| **why virtual** | nothing is in `graph.blocks`, so there is no seed change, no door migration, and nothing to rename, delete or drop into. A row that is not a block is simply offered no block actions |
| **dragging one out** | `create` with `type`. No new action, no new payload — the drop handler asks `graph.defs[id]` and knows |
| **selecting one** | describes it in the tray, in the same panel a block gets |

**`Row` gains one field**: `of: "block" | "def" | "pack"`. That is the whole cost in the explorer.


## The gesture

| | |
|---|---|
| **`pin`** | takes the block's `looks` and its field *schema*. **No arguments but the name** — one act, one undo, nothing to decide in a dialog |
| **what it makes** | a definition homed on the root, `from` absent, `extends` the block's current definition |
| **what happens to the block** | it names the new definition and drops its `looks`. Nothing about how it draws changes |
| **`unpin`** | dissolves the definition into every block naming it, re-points subtypes rooted there, then drops it. Lossless, and the only remover |

**Values are never pinned.** A field's schema travels; what one block happens to hold does not. That removes three arguments and a dialog.


## The default for a kind

**A checkbox on a definition, not a system.** Customise a block, pin it, tick *default for block* — and every plain block follows it. This is the want the `ws.<kind>` override was built for, at roughly a twentieth of the machinery.

| | |
|---|---|
| **what carries it** | `Definition.default?: BlockModule`. One optional field beside `from`. `set_def` already writes it and an export already carries it, so there is no mutation, no door work and no migration |
| **how it resolves** | `def_of` for a block naming nothing: `b.type ?? default_for(graph, module) ?? module`. One lookup, no namespace |
| **what may be one** | a definition whose own module *is* that kind, and whose `from` is absent. **A package cannot take over a project by being imported**, which was the only real safety question |
| **one at a time** | ticking a second clears the first, in the same act |
| **untick, or unpin** | the flag lives on the record, so dropping the definition takes the default with it and plain blocks fall back to base |
| **where the box is** | its own row in the definition panel, under *from*. Beside the `from` chip it was a toggle nobody found |

**The escape hatch falls out for free.** Typing one block to the pristine base while everything else follows the default is just naming the base definition — an ordinary row in the folder. Under `ws.<kind>` that case was unreachable.

**None of the old machinery comes back**: no reserved dotted ids, no `own_id`/`is_own_id`, no `adopt` action, no one-row-per-kind replacement in the folder, no picker special case. The default definition is an ordinary row that wears a mark.


## The tray

**One shell, one body pattern, every tab.** The contents tab already has it; it stops being the one place it exists and becomes the standard.

**The shell.** A tab-style navbar, with an optional control strip on the right for minimise and maximise. Below it, the body.

**The body, in order.** An optional filter chip rail · column labels · rows. **Every row is a label on the left and its content or controls on the right**, in a fixed gutter, with a subtle alternating background so a long list stays readable across.

| | |
|---|---|
| **what this replaces** | `Looks`' nine tabs — **which become the chip rail**, not nothing. Nine questions at once is too many to read, which is what the tabs were really solving; the fix is the filter rail the contents tab already has, because a chip narrows what is listed and does not take you somewhere else |
| **what it does to the merge** | the describe panel becomes a list of `{ label, content }` rows, so folding the definition panel into the element panel is choosing which rows apply rather than reconciling two layouts |
| **where it lives** | one small primitive in `tray` — `Body` and `Line` — used by contents, by the describe panel, and by anything later |

**Two columns, and the drawing is not a third.** What it *is* on the left. How it *draws* on the right: the rail, then the card, then the answers to whichever chip is lit — because the card is what every answer is read against, and it belongs beside the chip that chose them.

**The band is a wash, not a rung.** Banding with a step off the ramp is 5 points of lightness, which reads as a grid before it reads as rows. 3% of ink over whatever is behind it is ~2 points in all three themes, and always moves toward the writing.


## What is cut

| | Why |
|---|---|
| **`adopt`, `ws.<kind>`, `own_id`, `is_own_id`, `def_of`'s fallback** | a reserved id namespace and a resolution rule for what `Definition.default` says in one field |
| **`Vocabulary.tsx`** | 125 lines re-implementing rows the tree already draws |
| **`Definition.tsx`** | 243 lines asking the same questions as `Element.tsx`, in the same three columns |
| **`DRAGGED_DEF`** | duplicated across two packages that may not import each other, and mismatched with the canvas `dropEffect`, so the drop it exists for is refused by the browser |
| **`undefine`** | dropping a definition without dissolving it silently changes how every usage draws. One remover, and it is the lossless one |
| **`Looks`' tab strip** | navigation around rows that already exist |
| **rules *authoring*** | it can write three of five rule kinds, writes malformed values for the other two, and splits field names on spaces. **Read-only row until the whole set can be authored** |


## What stays

**The engine work is sound and none of it is the mess.**

| | |
|---|---|
| **the floor** | `fold(log, floor)` lays the shipped package down first. Base definitions cannot be overwritten because they are not in a log |
| **`Definition.from`** | groups the folder, refuses edits to somebody else's vocabulary, and gates what may be a default |
| **a block may carry rules** | `looks` was already a components bag; the widening is the change |
| **`rules_of` takes an id** | so a block's own word is the last layer, the way `look_of` already worked |
| **`constraints` folded into `rules`** | one concept, one key |
| **`write_subtree` through `def_of`** | a project export carries the definitions its blocks actually resolve through |
| **list rules replace** | the nearer statement is the whole answer |


## Order of work

| | | Proves | |
|---|---|---|---|
| **1** | cut `adopt` and the `ws.<kind>` machinery | the sample checks clean, and `def_of` is three lines again | **done** |
| **2** | one payload: the drop handler asks the graph which it was | a definition dragged onto the canvas is no longer refused by the browser | **done** |
| **3** | vocabulary rows in `tree_of`; delete `Vocabulary.tsx` | the folder is first, folds, drags out, and wears a pin | **done** |
| **4** | the tray shell and the `Body`/`Line` primitive | tabs left, icon controls right, expand, banded rows | **done** |
| **5** | `Looks`' tabs become the filter chip rail, over the card, over the rows | one rail, one drawing, the answers to one question | **done** |
| **6** | one panel: `Definition.tsx` folded into `Element.tsx`; the tray takes one id | picking a block and picking a definition open the same panel | **done** |
| **7** | `Definition.default` and the checkbox | pin a styled block, tick it, and every plain block follows | **done** |
| **8** | `pin` loses its three arguments; `undefine` is retired | `pin name=Pump` then `unpin`, byte-identical over nine kinds | **done** |
| **9** | rules read-only; the subtype picker reads the folder's list | no path writes a malformed rule, and one answer to *which definitions can I use* | **done** |
| **10** | `home` retired, with `defs_in_scope` and `resolve_def`; the door strips it from files already written | a definition is placed by `from` alone | **done** |
| **11** | the default box and unpin get their own rows in the panel | both reachable without a menu | **done** |

**One thing was found on the way.** `write` sorted records by id but left the keys *inside* one in whatever order the graph was built in, so a graph reached two ways — pinned and unpinned — wrote the same model as different bytes. Keys now go out in a stated order, identity first, which is what makes step 8 checkable rather than merely plausible.

## Settled

- **The card keeps its own column.** Three columns: what it is, how it draws, and the drawing. The first two are label-and-content tables; **the third is the rendered card and never a table** — it is the one thing on the panel that is a picture rather than an answer.
- **Column labels are optional, and neither describe column has them.** The left gutter is the label. Contents keeps its headers because it has real columns.
- **Tabs left, icon controls right.** Shut and maximise are two controls, not one with three states: the chevron opens and shuts, and **expand** takes the tray to full height.


## Known issues

- **`define`'s floor guard is unreachable, and name uniqueness is unchecked.** `def_id` always prefixes `def_`, and every shipped or imported id is bare or dotted, so `define name=block` files a *second* definition named `block`. `pin` refuses a taken name; `define` does not. The door is where the check belongs.
- **A definition row offers no menu.** Unpinning is a row in the panel; the tree's right-click is still block-only.
- **Nothing checks that a named package exists.** The door is where that belongs, beside the repairs it already runs.
- **An undefined `var()` takes its whole declaration with it.** `scripts/lint-css.mjs` catches a name defined nowhere in its package; it does not catch one defined under too narrow a selector. Not wired into `npm test`, deliberately.
- **`below` is drawn but never measured.** A name or type set below a card hangs into the gutter, and cards placed closer than one unit by hand will overlap it.
- **The sample workspace is the quick check.** `npm run start -w @mnd/cli -- check ../../samples/workspace.mndflow.json` says `clean`. Regenerate it whenever the schema moves.


## Deliberately not in this

| | |
|---|---|
| **rules authoring** | back when all five kinds can be written, and field names survive a space |
| **matching on re-pin** | two blocks that read alike are not thereby the same kind of thing |
| **relation definitions in the folder** | the same grouping admits them with no new mechanism. ST.15 |
| **a second style mechanism** | `look` over a selection already covers *make these look alike, now* |
