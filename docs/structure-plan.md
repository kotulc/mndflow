# Structure plan

**The tree-root mark means one thing: this block roots a structure.** By default that is only the workspace. A definition roots one only after structure has been added to it, and it never starts with any. Folders organize a root; they are not roots. Workshopped 2026-10-12, after the mark landed on every definition-side block that held a child.


## Goal

| Question | Answered by |
|---|---|
| **What does the tree-root mark mean?** | this block roots a structure: both sections list it as that root, and structure blocks are parented under it |
| **When is it applied?** | the workspace root, always; a definition that holds structure; a stand-in for either. Never a folder, never a definition with none, never a block inside a structure |
| **What does a new definition hold?** | nothing. `define` makes the definition alone |
| **How does a definition gain structure?** | an explicit gesture, chosen in *Mechanisms*. The first block parented under it is what makes it a root |


## What is wrong today

`stamps_of` stamps `structure` wherever `holds_usages` is true: any definition-side block with a direct child that is not itself definition-side (interfaces apart). The icon is `role_root`. Rows and cards both read that stamp.

In the architecture workspace that paints the mark on:

| Block | Why it qualifies today | Should it |
|---|---|---|
| `workspace` | About sits directly under it | yes, and also when the root is empty |
| System, Domain, Scenarios, Decisions | folders whose children are structure | no. They organize the workspace's structure |
| `adapter`, `layered service`, `outbox service` | parts and notes are parented under the definition | yes, because those definitions hold structure |
| component, person, service, and any new definition | no structure children | no, and they already don't |

A folder and a definition wear the same mark as the workspace, so every on-ramp reads as another workspace. The section header also wears `role_root` (`usages` in explorer `rows.ts`); that one stays. It names the section, not a block.

`define` already creates no children (`def: {}` only). The bug is the mark and the lack of a way to aim the first child at a definition. The structure bar's `+` parents under the picked structure row, or the workspace. A definition with no structure is not listed there, so `+` cannot reach it. Opening a definition again (`open_at`, the `again` path) draws its structure view, including an empty one, but the structure section does not hold that definition, so the next block still lands on the workspace.


## Decisions

| | Decided |
|---|---|
| **the mark** | the `structure` stamp, icon `role_root`. Legend phrase: "roots a structure". Row tip: "roots structure" |
| **the workspace** | `id === graph.root` roots structure always, empty or not. It is the only block that does so with no children |
| **a definition** | roots structure when it has a child, interfaces apart, that is not on the definition side. Derived from `parent`. Nothing is stored on `def` |
| **a new definition** | no children, no mark, listed in definitions only |
| **a folder** | never wears the mark. It lists in structure when it is on the way to structure, as a folder |
| **another package root** | never wears the mark. It keeps its package or lock mark, and lists in structure as the path to a definition that roots structure |
| **inside a structure** | a usage, note, group or grid never wears the mark, however much it holds |
| **a stand-in** | wears the mark of the block it stands for, as the other stamps do |
| **ports are not structure** | a definition whose children are only interfaces does not root structure. Ports stay on the definition view |
| **authored structure stays** | a package definition that already has parts (the architecture patterns) roots structure and wears the mark. This plan does not empty them. "By default" means `define` and a new workspace, not a package an author filled |
| **frozen** | structure is not added to a definition in a frozen package. One that already has parts still wears the mark |
| **may hold** | the gesture is offered only where `may_hold` is true. A tag, a value, a note and a relation definition that holds nothing are refused |
| **removing structure** | deleting the children. The last such child takes the mark with it, and the definition leaves the structure list unless the canvas is still inside it |
| **one rule** | core says who roots structure. The explorer, the cards and the legend read it. No second test |


## How the two sections read

Definitions lists what it lists now: every package, then the definition side, a definition as a leaf. The mark is the only change there. The workspace row wears it. A definition row wears it once that definition roots structure. A folder row does not.

Structure lists a package as a top row only when that package holds structure, folded. Under it, the structure, and the definition-side blocks on the way to it. A new workspace holds one plain block, so the workspace lists. Two further changes:

| | |
|---|---|
| **a definition lists** | only when it roots structure. One with no structure children does not |
| **the open layer lists** | while the canvas is inside a definition, that definition lists in structure even with no children yet, so the first block has a row to land under. Leave without adding one, and the row goes. It wears no mark until a child exists |

Folders under the workspace (System, Domain, and the rest) still list, without the mark. The workspace row wears the mark at the top of that package.


## Mechanisms

Each one adds structure to a definition that has none, may hold, and is not frozen. Each ends the same way: a block whose `parent` is the definition, the definition wearing the mark, and both sections listing it. They differ in what the gesture creates and what the user sees first.

### A — Open the empty structure, then add

**The gesture creates nothing.** It opens the definition on its structure view and holds it in the structure section.

| | |
|---|---|
| **where** | the definitions bar, when the pick is such a definition; the same action on the row's menu |
| **control** | the tree-root icon. Tip: "add structure to {name}" |
| **what it does** | `open_at` from the structure section (the path that already draws `internal`), focus structure, hold the definition. The temporary row from *How the two sections read* appears, unmarked |
| **the canvas** | the definition's empty internal view, the same empty layer the workspace shows before its first block |
| **the first block** | the structure bar's `+`, or a drop into that row. `parent` is the definition. The mark appears with that block |
| **again later** | the control reads "open structure" once the definition already roots one. Enter, double-click or → from the structure row does the same |

Fits "derive, don't annotate": the file gains a block only when the user makes one. The empty moment is session state, the open layer, which the explorer already tracks.

### B — The gesture makes the first block

**The gesture creates one plain block** under the definition and opens the structure view with that block picked.

| | |
|---|---|
| **where** | the same bar button and row menu as A |
| **what it does** | `create` a block under the definition (the offered word, numbered clear of names taken, as a drafted block is), then open the definition's structure with the new block picked |
| **the canvas** | the definition's internal view, one card on it |
| **the explorer** | the definition row wears the mark immediately, in both sections, and structure lists it expanded to the new block |
| **no empty state** | there is no structure root with nothing under it, except the workspace |

The first block is the user's, not a default of `define`. It does put a block in the file before the user has named what they wanted, and they delete it to undo the decision.

### C — A stored opt-in

**The gesture writes a flag** and creates no block. The definition roots structure while the flag is set, empty or not, the way the workspace does.

| | |
|---|---|
| **stored** | `def.structure: true`, set by a new action, cleared by another |
| **the mark** | on from the gesture, before any child |
| **the explorer** | the definition lists in structure immediately, wearing the mark, with nothing under it |
| **the first block** | `+` under that row, as in A |
| **clearing it** | "remove structure" on the row, refused while any structure child remains. Deleting the last child does not clear it |

This is the only option that lets an empty definition stay a root across reload. It breaks two standing rules: role from position, and derive, don't annotate (`design.md`). The door, the schema note and every writer of `def` would learn the flag. Not recommended.


## Recommendation

**Build A.** It uses the open path and the structure bar's `+` that already exist, stores nothing, and leaves `define` as it is. B is the fallback if an empty structure view with no row-mark reads as unfinished. C is recorded so it is not rebuilt by accident.

The tasks below assume A. If M1 picks another, task 3 changes and the rest stand.


## Open decisions

| # | Question | Assumed until told otherwise |
|---|---|---|
| M1 | which mechanism | **A**, decided. The tree-root button sits in the explorer header |
| M2 | where else the gesture sits | the definitions bar and the row menu. Not a control on the definition view: that view is a drawing of the definition, and structure is the other view |
| M3 | a drop into a definition row | already parents under it when the drop is *in*. That counts as adding structure, and the mark follows. No extra gesture |


## Rules for implementers

| | |
|---|---|
| **one task at a time** | do its *Steps*, run its *Verify*, stop at *Done when* |
| **no commits** | suggest a commit message; never commit |
| **no schema change** | A and B add no field. A flag is C, and C is not the assumption |
| **match the code** | snake_case, a docstring per function, short comments per block, lines ≤ 100 columns. Read the neighbouring file first |
| **docs move with the rule** | this plan changes a rule the docs already state. Update the rows named in task 4 in the same task. Do not rewrite `sample-plan.md`; it records what was built on 2026-10-12 |
| **samples** | do not strip parts out of package definitions. Re-run a generator only if a task touches one |


## 1 — Who roots structure

| | |
|---|---|
| **Goal** | one function answers the mark, for a row, a card and the legend |
| **Files** | core `defs.ts`, `names.ts` |

Steps:

1. Add `roots_structure(graph, id): boolean` beside `holds_usages`. True for `graph.root`. True for a definition on the definition side that `holds_usages` already accepts. False for a folder, a package root that is not the workspace, and anything `holds_usages` rejects.
2. `stamps_of` pushes `structure` from `roots_structure` of the block it stamps (the stand-in's target, where it is one). Replace the `holds_usages` call there.
3. `MARK_MEANING.structure` becomes "roots a structure". Update the docstring on `stamps_of`: the mark is a structure root, never a folder and never a block inside a structure.
4. Leave `holds_usages` in place. The structure section still uses "structure anywhere below" (`below_structure` in `sections.ts`) to decide what lists. That is a different question from the mark.

Verify: `npm test` from the repo root. A test that asserts a folder or a non-workspace package wears `structure` is updated to the new rule. Add a case if none exists: the workspace root wears it with no children; a definition wears it only with a non-interface, non-domain child; a folder that holds such a child does not; a definition with only interfaces does not.

Done when: `stamps_of` and the new function agree, and no caller but `stamps_of` decides the mark.


## 2 — The structure list, including the open definition

| | |
|---|---|
| **Goal** | a definition with no structure stays out of the structure section, except while the canvas is inside it |
| **Files** | core `sections.ts`, `navigate.ts`; explorer `chain.ts`, `rows.ts` |

Steps:

1. Confirm `on_side` for `structure` already drops a definition with nothing below it. Do not start listing every definition.
2. While the canvas layer is a definition, the structure section lists that definition even when `on_side` would drop it. Pass the open layer into the chain (it already follows the canvas layer to unfold the way there) and let that one id through the side filter. A folder or a usage needs nothing new.
3. The temporary row wears no structure stamp. `held` on the row still comes from `stamps_of`, so it stays off until a child exists.
4. Choosing a definition in definitions still opens its row in structure once, and only where the row exists. A definition with no structure does not appear there until task 3 opens it.

Verify: typecheck; `npm test`. In the app, on the architecture workspace: structure lists `workspace` with the mark, and System, Domain, Scenarios, Decisions without it; `adapter` wears the mark and lists its parts; component does not list under structure. Reset to an empty workspace: both sections list `workspace`, only that row wears the mark, and the canvas opens on it empty.

Done when: the mark and the listing follow the tables above, and an empty definition is absent from structure.


## 3 — Adding structure

| | |
|---|---|
| **Goal** | the gesture in M1, assumed A |
| **Files** | explorer `Explorer.tsx`, `Menu.tsx`; core `navigate.ts` only if `open_at` will not open an empty definition from the structure section |

Steps, for A:

1. Offer the action when the definitions section is in focus, the pick is a definition, `may_hold` is true, the block is not frozen, and `roots_structure` is false. Icon `role_root`, tip "add structure to {name}". Hide it otherwise. When `roots_structure` is already true, the same control opens structure, tip "open structure".
2. Put the same action on the row menu, under the same conditions.
3. The action opens the definition with `open_at` as from the structure section, and moves focus to that section with the definition held. Task 2 then lists the row.
4. The structure bar's `+` parents under the held row when that row `may_hold`. That is today's `add` once the definition is the pick. Confirm a block created there has `parent` equal to the definition, and that `+` is not offered for a frozen definition.
5. After the first child, the stamp appears on the definition's row in both sections and on its card, without a further gesture.

For B, replace steps 3–4 with one `create` under the definition, then the same open. For C, stop and say so: it needs a field, a mutation and a door note this plan does not include.

Verify: in the app, reset, add a definition, and run the gesture. Before the first block the definition has no mark and the canvas is its empty structure. Add a block from the structure bar. The definition wears the mark in both sections, the block sits under it, and a usage of that definition lists the block as a part. Undo removes the block and the mark. A frozen definition, `base.block` included, offers no such action. A definition that already has parts offers "open structure" only.

Done when: a new definition gains structure only by this gesture or by a drop into its row, and the workspace is still the only root that starts with the mark.


## 4 — Docs

| | |
|---|---|
| **Goal** | the rule and the gesture are stated where the old mark rule is |
| **Files** | `docs/design.md` (the two-sections paragraph and the row-mark bullet), `docs/definitions.md` (the explorer paragraph), `packages/core/docs/model.md` (the definition-side bullet), `packages/explorer/docs/explorer.md` (the structure-mark bullet and the bar) |

Steps:

1. Replace "a definition-side block directly holding structure wears the mark" with the decision table: workspace always, a definition that holds structure, never a folder.
2. State that `define` creates no structure, and name the gesture from M1 in the explorer doc's bar section.
3. Leave `sample-plan.md` as the record of the 2026-10-12 build.

Verify: read the four files against the decision table. No other doc should still say a folder wears the structure mark.

Done when: those four agree with this plan.


## Out of scope

| | |
|---|---|
| **emptying the patterns** | `adapter` and the other pattern definitions keep their parts |
| **the section header's icon** | the structure header keeps `role_root` |
| **the workspace row's own icon** | it stays the folder mark (`root` → `role_folder`). The tree-root mark is the stamp beside the name, not a replacement |
| **mndmap** | its sections set no `lists`, so this filter does not apply |
| **notes, ties, sample layout** | untouched |
