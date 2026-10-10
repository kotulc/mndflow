# Simplification plan

**One rule, one home.** Successive refactors left the same decision made in several places — each app, each panel, and core — each copy with its own special cases, drifting apart. This plan says where things live, how to find what has no home, and the leads found so far. Spans mndflow (the kit and the editor) and mndmap (the viewer). What the model decides is design.md; this is about where code lives.


## The smell

| Sign | Looks like |
|---|---|
| **a rule restated per host** | mndflow's `App.tsx` and mndmap's `App.tsx` each deciding what a gesture does |
| **glue syncing two states both ways** | effects tracing the sections from the canvas and the canvas from the sections |
| **a special mode with its own handlers** | a second set of pick and act handlers, or a prop added for one case |
| **a heuristic standing in for a rule** | "the deepest row listing it" instead of "the row in the section the canvas shows" |
| **a magic id or kind leaking out of its owner** | base ids (`"folder"`, `"note"`) branched on in panels |
| **a role re-derived by hand** | `parent === null`, `.def`, `type === "folder"` where core has `tree_of`, `in_domain`, `organizes` |
| **the same table twice** | two `NEEDS` maps saying what a kind cannot be made from |

**The test:** if changing one behaviour means editing more than one package, or both apps, the rule has no single home.


## Where things live

| Concern | Home |
|---|---|
| roles by position (domain, tree, structure, holder) | core `defs.ts` (`tree_of`, `in_domain`, `owner_def`), `holders.ts` (`organizes`, `inline`, `layer_of`, `drawn_in`) |
| which holder a block is (group, grid) | core `holders.ts` `shape_of`, read off the `inline` and `matrix` traits; everything else asks `is_holder`, `is_group`, `is_grid` |
| what a block may do | traits in `base.json`; core `capabilities.ts` (`allows_of`, `may_hold`, `holds_any`), absent is a no |
| whether a card opens | core `names.ts` `opens` (the stamp and the open button) and `navigate.ts` `open_at` (where it goes) |
| navigation | core `navigate.ts` (`open_at`, `leave_at`, `reveal_at`, `held_at`) |
| what a section lists | explorer `chain.ts` (`editor_slices`, `useChain`; a `trees` section stands apart) and `rows.ts` (`tree_of`, `trees_of`) |
| whether a block holds structure | core `names.ts` (`holds_structure`; the structure mark in `stamps_of`). The mark is a definition's alone; the explorer's top rows and row marks ask them, so a row and its card agree (2026-10-09) |
| what a block reads as (its role, and so its icon) | core `names.ts` (`role_of`); theme `role_icon`. The explorer's rows and the stage's cards both ask it |
| rows, marks and highlights | explorer `rows.ts` (holder members at their holder's level, `end_of`, `parent_of`, the ties joining them), `Explorer.tsx` |
| what a layer draws, the system and layer views, layouts | views `block.ts` (`project`), `survey.ts`, `profile.ts`, `definition.ts`, `page.ts`, `arrange.ts` |
| gestures to actions | stage `moves.ts`, `Stage.tsx` |
| what a drop comes to (move, refer, retype, tie, create a usage, define a subtype) | core `drop.ts` (`drop_of`); the canvas and the explorer, in both apps, call it. Stage `moves.ts` only reads a card's resting place off the drawn scene |
| what a kind cannot be made from | core `actions/helpers.ts` `NEEDS`, asked by `create`'s check |
| panning to a revealed block | stage `room.ts` (`useCamera`, from `focus`); the web app sets it on a reveal |
| settings resolution | core `defs.ts` (`stated`, `setting_of`, `traits_of`) |
| what a card carries, its face and its size | views `derive.ts` (`carried`, `face_text`) and `size.ts` (`face_of`, `size_of`); drawn by theme `CardFace` on the canvas, in the tray and in mndmap alike. Three card renderers became one (2026-10-08) |
| markdown, rendered | theme `Markdown` and `Inline`; nothing else parses markdown to draw it |
| a card as markdown, and a folder of them | core `card.ts` (`card_text`, `read_card`), the `markdown` and `attach` actions, `collection.ts` (`collect`) |


## How to look

**Read both apps' `App.tsx` side by side first**: anything both decide is a rule without a home. Then search, and for each hit ask *does core or a kit package already answer this?*

| Hunt | Search |
|---|---|
| base kinds branched on outside core | `grep -rnE '"(folder\|note\|group\|grid\|reference\|interface\|tag\|tie\|line)"' --include=*.ts --include=*.tsx packages apps ../mndmap/src` (excluding core and defs) |
| roles derived by hand | `grep -rnE 'parent === null\|\.def\b' ...` outside core |
| the workspace standing in for "no layer" | `grep -rn '?? graph.root\|?? ctx.graph.root'` — each site should say which it means |
| per-host navigation or selection | `grep -n 'look(\|pick(\|onTrace\|onChoose' apps/web/src/App.tsx ../mndmap/src/ui/App.tsx` |
| tables kept twice | `grep -rn 'const NEEDS\|Record<string, string> = {'` |
| props added for one case | read each component's props for ones only one host passes |
| several "what kind is this" readers | `role_of` (core `names.ts`), `mark_of` (explorer `rows.ts`), `marks_of` (views `derive.ts`) |

**Survey counts (2026-10-04)** — base-kind strings outside core and defs: stage `Stage.tsx` 19, explorer `rows.ts` 16, stage `drag.ts` 10, tray `rows.ts` 9, views `scene.ts` 7, tray `Tray.tsx` 7. Hand-derived roles: stage `nodes.tsx` 5, explorer `rows.ts` 4, views `through.ts` 3. Some are drawing kinds (a node's type), not base ids — confirm before moving.


## Leads

| # | Lead | Suspicion | Likely home |
|---|---|---|---|
| 1 | **mndmap `edits.ts`** | a second action system: move, create, rename and delete re-implemented, with their own placement rules (`in_collection`, `filed`), beside core's actions | core's actions run on mndmap's held graph, or one shared placement check |
| 4 | **two kind readers left** | the explorer now asks `role_of` (a tag's row and card once wore different icons); views `marks_of` still decides what a card reads as on its own | `role_of`, with `marks_of` mapping its answer to classes |
| 5 | **`?? graph.root`** | the workspace root as a fallback for "no layer", from when `null` meant the workspace | each site says what it means: the overhead view, or the workspace's domain |
| 6 | **explorer `listed()` vs core roles** | the chain re-derives domain and structure membership | core's `in_domain` / `tree_of`, as `held_at` uses |
| 7 | **tray listings** | the tray's definition grouping and `rows.ts` may re-list what the explorer's chain lists | the chain's listings |
| 8 | **stage menus** | `Stage.tsx` offers per kind (box, band, seat, note) by base strings | the registry's scopes and `when` |
| 9 | **highlight rules** | `lights`, `holds` and the edge in `Explorer.tsx` each read the chain and the picks differently | one function from the canvas view and the chain |


## How to take one

| Step | |
|---|---|
| **confirm** | read every copy; list where they disagree — a disagreement is a bug one copy has |
| **pick the home** | the lowest package that can answer it without knowing a host: core for model rules, a kit package for presentation |
| **move, then delete** | one function in the home; each copy becomes a call; nothing kept for compatibility |
| **drive both apps** | a rule moved is unverified until both hosts have run it on the samples |
| **record** | add its home to *Where things live* and remove the lead |
