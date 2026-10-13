# Code homes

**One rule, one home.** Successive refactors left the same decision made in several places — each app, each panel, and core — each copy with its own special cases, drifting apart. This doc says where each rule lives and how to find one that has no home. Open leads are in next-plan.md. Spans mndflow (the kit and the editor) and mndmap (the viewer). What the model decides is design.md; this is about where code lives.


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
| which holder a block is (group, grid) | core `holders.ts` `shape_of`, read off the *is group* and *is grid* traits' `holder` settings; everything else asks `is_holder`, `is_group`, `is_grid` |
| what a block may do | traits in `base.json`; core `capabilities.ts` (`allows_of`, `may_hold`, `holds_any`), absent is a no |
| whether a card opens | core `names.ts` `opens` (the stamp and the open button) and `navigate.ts` `open_at` (where it goes) |
| navigation | core `navigate.ts` (`open_at`, `leave_at`, `reveal_at`, `held_at`) |
| what a section lists | explorer `chain.ts` (`editor_slices`, `useChain`; a `trees` section stands apart) and `rows.ts` (`tree_of`, `trees_of`) |
| whether a block roots a structure | core `defs.ts` (`roots_structure`, over `holds_usages`); the structure mark in `names.ts` `stamps_of`. The workspace always, a definition that holds structure, never a folder; the explorer's row marks, the cards and the tree-root button ask it, so a row and its card agree (2026-10-12) |
| what a block reads as (its role, and so its icon) | core `names.ts` (`role_of`); theme `role_icon`. The explorer's rows and the stage's cards both ask it |
| rows, marks and highlights | explorer `rows.ts` (holder members at their holder's level, `end_of`, `parent_of`, the ties joining them), `Explorer.tsx` |
| what a layer draws, the system and layer views, layouts | views `block.ts` (`project`), `survey.ts`, `profile.ts`, `definition.ts`, `page.ts`, `arrange.ts` |
| which diagram a block opens on, and what it draws | core `navigate.ts` (`diagram_of`; `diagram_subject` for a stand-in stating its own view; `lens_of` asks both, through `own_diagram`); views `class.ts`, `swimlane.ts`, `sequence.ts`. The stand-in rule was written twice in `lens_of` and `diagram_subject`; one now (2026-10-12) |
| gestures to actions | stage `moves.ts`, `Stage.tsx` |
| what a drop comes to (move, refer, retype, tie, create a usage, define a subtype) | core `drop.ts` (`drop_of`); the canvas and the explorer, in both apps, call it. Stage `moves.ts` only reads a card's resting place off the drawn scene |
| what a kind cannot be made from | core `actions/helpers.ts` `NEEDS`, asked by `create`'s check |
| panning to a revealed block | stage `room.ts` (`useCamera`, from `focus`); the web app sets it on a reveal |
| settings resolution | core `defs.ts` (`statements`, `stated`, `setting_of`, `said_of`). views `look.ts` and explorer `rows.ts` merged definition and element by hand, skipping a usage's traits; both ask `setting_of` (2026-10-10) |
| what an element carries | core `defs.ts` (`tags_stated`, `traits_stated`: the nearest list, and who states it; `has_trait`, `is_tie`). Drops, styles and labels went with step 12 (2026-10-10) |
| whether a block is a reference, and what it points at | core `tree.ts` (`is_reference` by its kind, `of_ref`, `stands_for`); `of` is read nowhere else. A reference stores `type: "reference"` (2026-10-10) |
| what a reference's card draws as | views `through.ts` `resolved` (what it previews, the definition it stands in for, missing); look, size, marks, face, links and the tray ask it. `previewed` and every reader's own `b.of` are gone (2026-10-10) |
| a definition's interfaces, its chain's included | core `tree.ts` `ports_of`; views `through.ts` lays them on usages, definition cards and rooms |
| how a table in a card looks | theme `face.css` `.mnd-face-table`: an attributes table and a markdown table alike. Two table styles became one (2026-10-10) |
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

## How to take one

| Step | |
|---|---|
| **confirm** | read every copy; list where they disagree — a disagreement is a bug one copy has |
| **pick the home** | the lowest package that can answer it without knowing a host: core for model rules, a kit package for presentation |
| **move, then delete** | one function in the home; each copy becomes a call; nothing kept for compatibility |
| **drive both apps** | a rule moved is unverified until both hosts have run it on the samples |
| **record** | add its home to *Where things live* and remove the lead from next-plan.md |
