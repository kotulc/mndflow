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
| what a block may do | traits in core `types.ts` `TRAITS` (read by `defs.ts` `trait_at`), a table since 2026-10-14; core `capabilities.ts` (`allows_of`, `may_hold`, `holds_any`), absent is a no |
| whether a card opens | core `names.ts` `opens` (the stamp and the open button) and `navigate.ts` `open_at` (where it goes) |
| navigation | core `navigate.ts` (`open_at`, `leave_at`, `reveal_at`, `held_at`) |
| what a section lists | core `sections.ts` `on_side` (the library: the definition side and every part of a definition; the model: usages outside every definition); explorer `chain.ts` (`editor_slices`, `useChain`) and `rows.ts` (`tree_of`; a package's types and tags as groups, `named_rows`) (2026-10-16) |
| whether a block roots a structure | core `defs.ts` (`roots_structure`, over `holds_usages`); the structure mark in `names.ts` `stamps_of`. The workspace always, a definition that holds structure, never a folder; the explorer's row marks, the cards and the tree-root button ask it, so a row and its card agree (2026-10-12) |
| what a block reads as (its role, and so its icon) | core `names.ts` (`role_of`); theme `role_icon`. The explorer's rows and the stage's cards both ask it |
| rows, marks and highlights | explorer `rows.ts` (holder members at their holder's level, `end_of`, `parent_of`, the ties joining them), `Explorer.tsx` |
| where notes sit: the column, and aside cards beside what they are tied to | views `float.ts` (`noted`, `floated`, `beside`), called by a layer (`arrange.ts`) and a group (`bands.ts`) (2026-10-12) |
| whether an element is a tie | core `defs.ts` `is_tie`, reading `line.module`, which *is tie* grants: no trait is matched by id (2026-10-12) |
| how a block sits in its parent's `auto` layer | core `defs.ts` `arrange_of` (`card.arrange`); `is_aside` asks it (2026-10-13) |
| `auto` runs and aside floating | views `float.ts`: `noted`, `runs`, `floated`, for a layer and a group alike (2026-10-13) |
| what a layer draws, the system and layer views, layouts | views `block.ts` (`project`), `survey.ts`, `profile.ts`, `page.ts`, `arrange.ts`. The definition view (`definition.ts`, core `aspects.ts`) went 2026-10-16 |
| which diagram a block opens on, and what it draws | core `navigate.ts` (`diagram_of`; `diagram_subject` for a stand-in stating its own view; `lens_of` asks both, through `own_diagram`); views `classes.ts` (`class_graph`, class and entity diagrams), `sequence.ts`, and the grid's own view for `allocation`. The stand-in rule was written twice in `lens_of` and `diagram_subject`; one now (2026-10-12). The views a block may name are core `NAMED_VIEWS`, fed by `feeds` (2026-10-13) |
| gestures to actions | stage `moves.ts`, `Stage.tsx` |
| what a drop comes to (move, refer, retype, tie, create a usage, define a subtype) | core `drop.ts` (`drop_of`); the canvas and the explorer, in both apps, call it. Stage `moves.ts` only reads a card's resting place off the drawn scene |
| what a kind cannot be made from | core `actions/helpers.ts` `NEEDS`, asked by `create`'s check |
| panning to a revealed block | stage `room.ts` (`useCamera`, from `focus`); the web app sets it on a reveal |
| every key an element says, and its choices | tray `pairs.ts` (`pairs_of`, and `settings_of` for how a definition draws); the card and settings tabs draw them through one `Element`. Identity rows, the traits panel and the source box became one (2026-10-14) |
| which region has the keys | theme `shell.tsx` `useZone`; the explorer's and the canvas's keys ask it through their `keys` props (2026-10-14) |
| settings resolution | core `defs.ts` (`statements`, `stated`, `setting_of`, `said_of`). views `look.ts` and explorer `rows.ts` merged definition and element by hand, skipping a usage's traits; both ask `setting_of` (2026-10-10) |
| what an element carries | core `defs.ts` (`tags_stated`, `traits_stated`: the nearest list, and who states it; `has_trait`). Drops, styles and labels went with step 12 (2026-10-10) |
| whether a block is a reference, and what it points at | core `tree.ts` (`is_reference` by its kind, `of_ref`, `stands_for`); `of` is read nowhere else. A reference stores `type: "reference"` (2026-10-10) |
| what a reference's card draws as | views `through.ts` `resolved` (what it previews, the definition it stands in for, missing); look, size, marks, face, links and the tray ask it. `previewed` and every reader's own `b.of` are gone (2026-10-10) |
| a block's interfaces: its own, and a usage's definition chain's | core `tree.ts` (`is_interface` by its module, `ports_of`, `ports_on`; `part_end` reads a drawn `usage/part` back, `stored_of` takes it home); views `through.ts` draws a definition's on each usage as `usage/port`. Interfaces are blocks again, of an interface kind, as before 2026-10-16; the first pass's `def.ports` went (2026-10-16) |
| an edit to an interface | where it is held, `stored_of`: core actions `relations.ts` `port` (flow, seat) and every block action (rename, retype, delete); the seat adjustment asks `stored_of` too (2026-10-16) |
| what a relation's ends mean | core `ends.ts` `ends_of` (the definition chain's `def.ends`, then a line's multiplicity and role), `end_refusal`; set by actions `relations.ts` `end`; drawn by views `scene.ts` `heads`, `crossed`, `end_words` and stage `Wire.tsx` (2026-10-16) |
| a block's behaviours and their signatures | core `ends.ts` `is_behaviour` (*is behaviour*, `block.behaviour`), `behaviours_of`, `signature_of` (from its interfaces); drawn by views `face.ts` `class_table` (2026-10-16) |
| whether a run may join two ends | core actions `relations.ts` `mixed`: a definition and a usage never, but by a tie (2026-10-16) |
| how a card reads its role and category on the canvas | views `derive.ts` `marks_of` (`definition`, `relation`, `directed`); stage `flow.css` outlines a definition; theme `face.css` draws the `text` face and the relation swatch (2026-10-16) |
| named components: types and tags | core `library.ts` (`tag_at`, `type_at`, `typed_as`, `put_tag`, `put_type`, `drop_named`), on a package root's `library`; actions `named.ts`. The `tags.ts` tags folder and the `value` base are gone (2026-10-16) |
| the tags an annotation gives | core `library.ts` `given_of`; taken away by actions `groups.ts` `unmember`; the tray groups them by source in `pairs.ts` `tags` (2026-10-16) |
| what draws as a box on its parent's layer | core `holders.ts` `is_box` (group, folder, region), `is_region`; `inline` holds every one, so none makes a layer (2026-10-16) |
| whether a block is an annotation | core `defs.ts` `is_annotation`: the explorer lists none (2026-10-16) |
| ids read through a map, on export and on collecting | core `file.ts` `renamed`, asked by `write_package` and `sources.ts` `defined`; the two copies became one (2026-10-16) |
| how a table in a card looks | theme `face.css` `.mnd-face-table`: an attributes table and a markdown table alike. Two table styles became one (2026-10-10) |
| what a card carries, its face and its size | views `derive.ts` (`carried`), `face.ts` (`face_text`, a collection's `records_text`) and `size.ts` (`face_of`, `size_of`); drawn by theme `CardFace` on the canvas, in the tray and in mndmap alike. Three card renderers became one (2026-10-08) |
| markdown, rendered | theme `Markdown` and `Inline`; nothing else parses markdown to draw it |
| a card as markdown, and a source folder of them | core `card.ts` (`card_text`, `read_card`), the `markdown` and `attach` actions, `sources.ts` (`collect`; was `collection.ts`, renamed 2026-10-16) |
| a diagram file or frontmatter spelled out: short forms into the long form | core `diagram.ts` (`long_form`); syntax only, no name read (2026-10-13) |
| what a name stands for: a path, `pkg.name`, a bare definition name | core `refs.ts` (`path_to`, `def_ref`); `sources.ts` reads every file's names through them (2026-10-13) |
| where a definition may sit | core `defs.ts` `holds_defs`: a package root or a definitions-tree folder, never a structure or another definition; asked by `move`, `new_def` and the door, which moves a stray definition to its package root (2026-10-13) |
| names unique among siblings | core `tree.ts` `sibling_named`, asked by `create`, `rename` and `move` (2026-10-13) |
| a source folder with the packages its files list | cli `main.ts` `gathered`, over core `wanted` and `collect` (2026-10-13) |
| `layered`: a layer ranked by its relations | views `layered.ts`, on `@dagrejs/dagre` (2026-10-13) |


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
