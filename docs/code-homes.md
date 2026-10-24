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
| which holder a block is (group, grid) | core `holders.ts` `shape_of`, and `shape_named` for a definition (actions `groups.ts` `made_as`, `sources.ts` `extent`), read off the *is group* and *is grid* traits' `holder` settings; everything else asks `is_holder`, `is_group`, `is_grid` |
| what a block may do | traits in core `types.ts` `TRAITS` (read by `defs.ts` `trait_at`), a table since 2026-10-14; core `capabilities.ts` (`allows_of`, `may_hold`, `holds_any`), absent is a no |
| whether a card opens | core `names.ts` `opens`: only with something to draw. `lens_of` and `feeds` ask it, views `derive.ts` `marks_of` gives the `container` mark from it (the stacked edge, stage `flow.css`), and the card menu offers *open* by it (stage `Stage.tsx` `box_offers`); `navigate.ts` `open_at` says where it goes, a card that opens on nothing picked where it is drawn (2026-10-16) |
| a definition's card settings | they describe its usages: a definition is one plain card in its folder, so its `card.height` (views `size.ts` `free_height`) is not read for itself (2026-10-16) |
| the crumbs' path | views `derive.ts` `trail_of` (the explorer's path: package, folders, blocks, never notation); stage `Crumbs.tsx` draws it after the host's section (`head`) and folds it to fit (2026-10-16) |
| navigation | core `navigate.ts` (`open_at`, `leave_at`, `reveal_at`, `held_at`). `reveal_at` picks in place wherever the canvas already draws the block; following a stand-in to its target is the caller's (stage `Stage.tsx`, tray `onView`) (2026-10-16) |
| what a section lists | core `sections.ts` `on_side` (the library: the definition side and every part of a definition; the model: usages outside every definition), which the explorer's reveal asks too; a usage's parts read through list wherever it does (`branch_of`); explorer `chain.ts` (`editor_slices`, `useChain`) and `rows.ts` (`tree_of`; a package's types and tags as groups, `named_rows`) (2026-10-16) |
| whether a block roots a structure | core `defs.ts` (`roots_structure`, over `holds_usages`); the structure mark in `names.ts` `stamps_of`. The workspace always, a definition that holds structure, never a folder; the explorer's row marks, the cards and the tree-root button ask it, so a row and its card agree (2026-10-12) |
| what a block reads as (its role, and so its icon) | core `names.ts` (`role_of`, a diagram its kind first); theme `role_icon`, one `role_<kind>` icon per diagram kind. The explorer's rows and the stage's cards both ask it |
| rows, marks and highlights | explorer `rows.ts` (holder members at their holder's level, `end_of`, `parent_of`, the ties joining them), `Explorer.tsx` |
| where notes sit where ELK does not place them: the column, and aside cards beside what they are tied to | views `float.ts` (`noted`, `floated`, `beside`), called by a layer (`arrange.ts`) and a group (`bands.ts`) — the synchronous placement the kit's viewer and the CLI's `project` still use. In the world a note is placed by ELK beside what its tie meets (2026-10-21) |
| whether an element is a tie | core `defs.ts` `is_tie`, reading `line.module`, which *is tie* grants: no trait is matched by id (2026-10-12) |
| how a block sits among its neighbours | core `defs.ts` `arrange_of`, worked out and never said: a region in a column, a block with *has tie* (note, label) aside, else rows; `is_aside` asks it. `card.arrange` left the schema 2026-10-21 |
| `auto` runs and aside floating, where ELK does not place | views `float.ts`: `noted`, `runs`, `floated`, for a layer and a group alike — the synchronous fallback (2026-10-21) |
| what a layer draws, the system and layer views, layouts | views `block.ts` (`project`), `survey.ts` (the kit's whole-section view only), `profile.ts`, `page.ts`, `arrange.ts` (`laid`: placed ahead where the world gave places, else the synchronous fallback). The definition view (`definition.ts`, core `aspects.ts`) went 2026-10-16 |
| which diagram a block opens on, and what it draws | core `navigate.ts` (`diagram_of`; `diagram_subject` for a stand-in stating its own view; `lens_of` asks both, through `own_diagram`); views `classes.ts` (`class_graph`, class and entity diagrams), `sequence.ts`, and the grid's own view for `allocation`. The stand-in rule was written twice in `lens_of` and `diagram_subject`; one now (2026-10-12). The views a block may name are core `NAMED_VIEWS`, fed by `feeds` (2026-10-13) |
| gestures to actions | stage `moves.ts`, `Stage.tsx` |
| what a drop comes to (move, refer, retype, tie, create a usage, define a subtype) | core `drop.ts` (`drop_of`); the canvas and the explorer, in both apps, call it. Stage `moves.ts` only reads a card's resting place off the drawn scene |
| what a kind cannot be made from | core `actions/helpers.ts` `NEEDS`, asked by `create`'s check |
| the camera: fitting the focus, flights, panning to a revealed block | stage `room.ts`: `useFocus` (fits the focus or a `stop`, never above 100% of its own size unless the stop says; a change of drawing — map or entered view, `realm_of` — cuts instead of flying), `usePage` the kit's scrolled page only; `Flow.tsx` holds the map's camera to the map and its band (`translateExtent`) and fades a drawing in where the camera cut to it (`fresh`) (2026-10-23) |
| draw order | stage `arrays.ts` `DEPTH` and `nodes_of`: holders (a map's boxes, groups, grids) then lines, cards, a map's chips, seats, each two steps higher per holder it sits in (2026-10-23) |
| **navigation focuses; zoom only zooms** | stage `Stage.tsx` `gesture`: on a map a click on a chip or a box (its title, its ground) goes to it and picks it, two enter it (`read`); the arrow keys go to the nearest area that way (views `map.ts` `towards`); Esc in an entered view returns (`widen`). The explorer's choice of a block on the map goes to its area; its open enters (web `App.tsx` `choose`, `onOpen`); only `reveal` aims the camera at a block (2026-10-23) |
| every key an element says, and its choices | tray `pairs.ts` (`pairs_of`, and `settings_of` for how a definition draws); the card and settings tabs draw them through one `Element`. Identity rows, the traits panel and the source box became one (2026-10-14) |
| which region has the keys | theme `shell.tsx` `useZone`; the explorer's and the canvas's keys ask it through their `keys` props (2026-10-14) |
| settings resolution | core `defs.ts` (`statements`, `stated`, `setting_of`, `said_of`). views `look.ts` and explorer `rows.ts` merged definition and element by hand, skipping a usage's traits; both ask `setting_of` (2026-10-10) |
| what an element carries | core `defs.ts` (`tags_stated`, `traits_stated`: the nearest list, and who states it; `has_trait`). Drops, styles and labels went with step 12 (2026-10-10) |
| whether a block is a reference, and what it points at | core `tree.ts` (`is_reference` by its kind, `of_ref`, `stands_for`); `of` is read nowhere else. A reference stores `type: "reference"` (2026-10-10) |
| what a reference's card draws as | views `through.ts` `resolved` (what it previews, the definition it stands in for, missing); look, size, marks, face, links and the tray ask it. `previewed` and every reader's own `b.of` are gone (2026-10-10) |
| a block's ports: its own, and its definition chain's | data, `Block.ports` (2026-10-18): core `tree.ts` (`ports_of`, `ports_on`, `port_at` reads a drawn `block/port` back with its holder, `flow_of`, `is_interface`); views `through.ts` lays each in as a block to seat, under `block/port`, and meets `fromPort`/`toPort` there |
| an edit to a port | where it is held, core actions `helpers.ts` `port_edit` (its holder's ports written whole; a port gone takes its lines): actions `relations.ts` `port` (name, interface definition, flow, seat), `blocks.ts` `rename` and `delete`, and the seat adjustment (`actions/index.ts`) (2026-10-18) |
| library entries and the one resolver | core `library.ts` (`KINDS`, `entry_at`, `*_at`, `put_*`, `users_of`, `uses_by`, registries) and `defs.ts` `chain_by`/`links_of`: an entry's chain — what it extends, then its kind's base (types `KIND_BASE`) — read by `setting_of` as a definition's; fold's `set_setting` writes an entry where it is held; actions `named.ts` `define_*` (2026-10-18) |
| what a type says of an attribute | core `defs.ts` `unit_of`, `format_of` (down the type's chain); read by views `face.ts` `listed` and tray `Attributes.tsx` (2026-10-18) |
| constraints | entries (`Library.constraints`), carried by id (`Block.constraints`, `Relation.constraints`, `constraints_stated`); core `capabilities.ts` `expects_of` reads their rules for `review`; actions `named.ts` `constrain`, `define_constraint` (2026-10-18) |
| an entry's colour | views `look.ts` `entry_look` (the resolver's `style`), worn by stage `nodes.tsx` `Tile` (its left edge), tray `Carried.tsx` and `Attributes.tsx` `Typed` (2026-10-18) |
| what an element carries, in the tray | tray `Carried.tsx`, the components tab: attributes, ports, tags, constraints (2026-10-18) |
| what a relation's ends mean | core `ends.ts` `ends_of` (the definition chain's `def.ends`, then a line's multiplicity and role), `end_refusal`; set by actions `relations.ts` `end`; drawn by views `scene.ts` `heads`, `crossed`, `end_words` and stage `Wire.tsx` (2026-10-16) |
| a block's behaviours and their signatures | core `ends.ts` `is_behaviour` (*is behaviour*, `block.behaviour`), `behaviours_of`, `signature_of` (from its interfaces); drawn by views `face.ts` `class_table` (2026-10-16) |
| whether a run may join two ends | core actions `relations.ts` `mixed`: a definition and a usage never, but by a tie (2026-10-16) |
| how a card reads its role and category on the canvas | views `derive.ts` `marks_of` (`definition`, `relation`, `directed`); stage `flow.css` outlines a definition; theme `face.css` draws the `text` face and the relation swatch (2026-10-16) |
| named components: types and tags | core `library.ts` (`tag_at`, `type_at`, `typed_as`, `put_tag`, `put_type`, `drop_named`; `users_of`, blocks and lines alike, 2026-10-16), on a package root's `library`; actions `named.ts`. The `tags.ts` tags folder and the `value` base are gone (2026-10-16) |
| the tags an annotation gives | core `library.ts` `given_of`; taken away by actions `groups.ts` `unmember`; the tray groups them by source in `pairs.ts` `tags` (2026-10-16) |
| what draws as a box on its parent's layer | core `holders.ts` `is_box` (group, folder, region), `is_region`; `inline` holds every one, so none makes a layer (2026-10-16). Goal: a group holds nothing, its members by tag |
| registries: what one is, its entries and their uses | core `library.ts` (`Registry`, `registry_id`, `registry_at`, `registry_of`, `uses_by`, over `users_of`); views `registry.ts` (`entries_of` the list, `matrix_of` the tray's matrix, `registry_scene` the canvas's treemap, home folders) (2026-10-17) |
| opening a registry or an entry | core `navigate.ts`: `lens_of` gives `registry`, `open_at` opens it in the library, `leave_at` goes entry → registry → package view, `held_at` holds its package; actions `blocks.ts` `open` accepts them. Views `block.ts` `project` hands the `registry` view to `registry_scene`; stage `nodes.tsx` `Tile` draws an entry; the camera's descent flight (stage `room.ts`) zooms because a tile's id is its entry's (2026-10-17) |
| a block's diagram kind, and keeping it | core `defs.ts` `diagram_kind` (the nearest `DIAGRAMS` kind in the chain, else `internal` for a plain block holding parts) and `kind_fits` (a block holding parts stays in its family, `types.ts` `KIND_FAMILIES`), asked by `may_retype` and actions `blocks.ts` `retype`. No action sets a layout: the `layout` and `arrange` actions went 2026-10-21 |
| the library kinds, and building a library kind by kind | core `types.ts` `KINDS` beside `KIND_BASE`; `library.ts` `library_map`, the one builder, used by `fold.ts` `set_library`, `file.ts` `renamed`, `sources.ts` `library`, `drop_named`; `registry_at` reads its id pattern from `KINDS` (2026-10-18) |
| a mark wearing a colour alone | views `look.ts` `tint_attrs` (family and tint off `face_attrs`), for seats, tiles, tray chips, typed attributes and registry swatches (2026-10-18) |
| the `treemap` layout | views `treemap.ts` (`treemapped`, `tiled`, `weight_of`, on d3-hierarchy), dispatched first in `arrange.ts` `laid`; `registry.ts` lays its treemaps out with `tiled` too (2026-10-17) |
| a registry in the tray | tray `Registry.tsx` (matrix and list), held as `{ of: "registry" }` in `Tray.tsx`, or the open layer where it is a registry; explorer `rows.ts` gives a package's types and tags group its `registry`, and `Explorer.tsx` opens it (2026-10-17) |
| a key's line and its whole value | tray `Source.tsx` (one line a key, cut short), `Choices.tsx` (the whole value; long words typed there, `text.wrap`); `tray.css` lays the card tab out by the tray's width (container queries) (2026-10-17) |
| a chip's colour | tray `Choices.tsx` `paint`: a chip whose value is a definition wears its look's family or hue (2026-10-17) |
| whether a block is notation | core `defs.ts` `notation_of` (what a block or definition is, by the chain against `NOTATION`: annotations and marks) and `is_notation` (a usage only): the explorer lists no notation, the crumbs pass it; a notation definition, or a stand-in for one, draws as a plain faint card (views `look.ts` `shaped`, `stand_in`, `derive.ts` `marks_of`, all asking `notation_of`). `is_annotation` and the overview's own mark check became one (2026-10-19) |
| ids read through a map, on export and on collecting | core `file.ts` `renamed`, asked by `write_package` and `sources.ts` `defined`; the two copies became one (2026-10-16) |
| how a table in a card looks | theme `face.css` `.mnd-face-table`: an attributes table and a markdown table alike. Two table styles became one (2026-10-10) |
| what a card carries, its face and its size | views `derive.ts` (`carried`), `face.ts` (`face_text`, a collection's `records_text`) and `size.ts` (`face_of`, `size_of`); drawn by theme `CardFace` on the canvas, in the tray and in mndmap alike. Three card renderers became one (2026-10-08) |
| markdown, rendered | theme `Markdown` and `Inline`; nothing else parses markdown to draw it |
| a card as markdown, and a source folder of them | core `card.ts` (`card_text`, `read_card`), the `markdown` and `attach` actions, `sources.ts` (`collect`; was `collection.ts`, renamed 2026-10-16) |
| a diagram file or frontmatter spelled out: short forms into the long form | core `diagram.ts` (`long_form`); syntax only, no name read (2026-10-13) |
| what a name stands for: a path, `pkg.name`, a bare definition name | core `refs.ts` (`path_to`, `def_ref`); `sources.ts` reads every file's names through them (2026-10-13) |
| what a card wears in its top corner (its type, its handle) | views `face.ts` `handle_of`, its type word by `type_word` (also a group heading's and an above or below word), drawn by theme `CardFace` as `.mnd-alias`; the group defaults on base definitions (2026-10-19); never emitted on a header, dot, ring or diamond (`derive.ts` `carried`) |
| how a name or a sized body fits its card (name size and lines, body lines) | views `face.ts` `name_fit`, `body_lines`, applied once per scene by `derive.ts` `fit_names` from `project`; drawn by theme `CardFace` (`data-fit`, `.clamped`) |
| which face a card draws: what it has, or what the layer forces | views `size.ts` `face_of` (`shows_any`) (2026-10-19) |
| where a file's block lands: a folder, or the block a directory is named for | core `sources.ts` `collect` (`owners`, `owned`, `folder`); a name another file placed on this layer, `sources.ts` `on_layer` (2026-10-19) |
| where a definition may sit | core `defs.ts` `holds_defs`: a package root or a definitions-tree folder, never a structure or another definition; asked by `move`, `new_def` and the door, which moves a stray definition to its package root (2026-10-13) |
| names unique among siblings | core `tree.ts` `sibling_named`, asked by `create`, `rename` and `move` (2026-10-13) |
| a source folder with the packages its files list | cli `main.ts` `gathered`, over core `wanted` and `collect` (2026-10-13) |
| `layered`: a layer ranked by its relations | in an entered view views `flow.ts` (ELK `layered`); elsewhere views `layered.ts` on `@dagrejs/dagre`, until the kit's viewer and the CLI place by ELK (2026-10-21) |
| a line's word | core `names.ts` `label_of`: its own name only, read by views `block.ts` `line_edges` and tray `Drawing.tsx`; `shown_name` still names a nameless line by its definition where it must be named (a registry, a review note). Views `sequence.ts` alone falls back to the step a message reaches (2026-10-18) |
| what a card is drawn as | core `components.ts` `SHAPES` (`card.shape`, `layout.shape`); views `look.ts` `shaped` (its own, else the layer's cast, through boxes) and `card_shape` for sizing (`size.ts`: a dot or ring one unit); theme `face.css` draws each; stage `flow.css` lights a picked or outlined diamond (2026-10-18) |
| a second line between two cards | views `seat.ts` `seat_all` (`again`, `round_side`): card to card only, the faces a quarter turn from the pair's (2026-10-18) |
| whether a kind fixes its layout | core `defs.ts` `fixed_layout`, asked by the `layout` action (actions `blocks.ts`) and the web app, which hands the rail `fixed` (options `groups.ts` leaves the layer group out) (2026-10-18) |
| the question a diagram kind answers | core `types.ts` `DIAGRAM_QUESTIONS` beside `DIAGRAMS`; base's notation ids `NOTATION`, annotations and marks (2026-10-19) |
| the overview tab | tray `Overview.tsx` (why, how, where; counts by kind; promotion by `may_retype`); its picture is tray `Picture.tsx`: what a block or room connects to (`Ego`), a definition's registry and what a folder files (views `library.ts` `registry_map`, `filed_map`), a note's words. The host's thumbnail and stage `Thumb.tsx` left it 2026-10-21 |
| a sequence drawn | views `sequence.ts`: heads, activation bars (`activation` mark, stage `flow.css`), phases as `text` faces, messages across at their row (2026-10-18) |
| a crow's foot's size | theme `heads.tsx` `HEAD_SHAPES` (`crow`), `card.css` `.mnd-head.crow` (2026-10-18) |
| **the map, the model's and the library's** | views `map.ts`: `model_map` (the package, stopping at diagrams; a diagram holding diagrams a box beside its own chip), `library_map` (packages and folders, each definition a chip as large as its uses), one builder `mapped` laying both as a treemap; a chip's counts and inner treemap (`counted`, `inner`); `map_focus`, `area_of`, `area_under`, `towards`, `area_block`. Stage `nodes.tsx` `MapBox`, `ChipNode`; web `App.tsx` `enter`/`leave` (2026-10-23) |
| an entered view | views `layer.ts` `layer_scene` (one layer placed by `flow.ts`, projected by its kind, the side drawn only; `laid_ahead` says which kinds), asked by web `App.tsx` once per layer and edit, the last drawing kept while it is laid out again (2026-10-23) |
| placement | views `flow.ts` `place`: one layer's blocks by ELK, inside out — each group and folder on its own; `layered` where lines join its cards (both directions tried), `rectpacking` where none do (several aims tried), the result nearest the shape asked kept; file order is reading order. **A room with regions is banded** (`banded`): one layered run, each region an ELK partition in order, across and down both tried, lineless regions last and packed whole. Results kept by what they were worked out from. ELK runs in a worker the host sets (`set_elk`; web `main.tsx`), else on the thread. Handed to `project` through `arrange.ts` `placed_as`, which `laid` reads first (2026-10-23) |
| a map chip's inside | views `map.ts`: `tiled` (a box's splits toward its grid chips' shapes), `listed` (groups), `ranked` (a grid read from dagre), `gridded` (a grid's lattice), `ruled` (track sizes); `gridding.ts` `grid_from` (any placement read as rows and columns) (2026-10-23) |
| a region's place | its band's order: views `flow.ts` `banded` (lineless last, then file order; an explicit `order` to win); stage `groups.css` draws its name over a rule; tray `Overview.tsx` `Place` moves it earlier or later (2026-10-23) |
| drawing at a scale | stage `nodes.tsx` `scaled` (a node laid out at its own size and scaled into its box — only a library registry is; zoom never changes what a node draws), `Wire.tsx` (a run drawn in its own units under its scale); `routes.css` keeps perch handles a point, since React Flow measures a handle's size unscaled (2026-10-22) |
| one object: every appearance of a block | core `tree.ts` `object_of` (the block an appearance is), `appearances_of`; actions `blocks.ts` `rename`, `describe`, `write` and `retype` act on the object; names `shown_name` reads a stand-in as its target; the web app lights every appearance (`lit`) and hands the tray the object; tray `Overview.tsx` lists the other appearances (2026-10-20) |
| what a selection touches | core `tree.ts` `touches_of` (its lines' far ends, its stand-ins); web `App.tsx` `touched`, stage `Stage.tsx` `lit_rules` in `--s-secondary-edge`; nothing dims (2026-10-22) |
| making a room, turning notation into one | core actions `groups.ts` `room` (`turning`); offered by stage `Stage.tsx` (`band` menu, `MANY`, Ctrl+Shift+G) (2026-10-20) |
| how every room draws (frame, guides, ports, key, context) | tray `state.ts` `useDisplay`, set on `Workspace.tsx`'s display band; workspace-wide, no per-layer answer (2026-10-20) |
| the rail | options `groups.ts` `groups_of`: palette (the focus's family's notation, then every room's), layer, workspace, make, relations; the web app answers its `@` actions (2026-10-20) |
| filling toward the canvas's shape | views `size.ts` `SHAPE` (`set_aspect`, set by the host from the window), read by `flow.ts` and `map.ts`; where ELK does not place `grid.ts` `filled` and `wide_for`, `pack.ts` `pack_units`, `room_wide`, `bands.ts`, `layered.ts` (2026-10-21) |
| lookups read once per set of blocks | core `memo.ts` (`kept`, `forget`): `tree.ts` `children`, `defs.ts` `packages`, `library.ts` `held`. Whatever writes blocks in place forgets them: `fold.ts` `apply`, `sources.ts`, cli `sysml.ts`; views build new maps rather than write one already read (`through.ts`) (2026-10-20) |


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
