# Sample plan

**Two sample workspaces and three diagram views, built in small tasks a simpler agent can finish and check alone.** The **showcase** stays the visual lab: every card, face, holder, relation and view, small and synthetic. A new **architecture** workspace tells one believable story — order fulfillment — through context, service, domain, data and scenario diagrams. **Class, swimlane and sequence** are layer views a card's kind opens on, like grid, never a toggle. Workshopped 2026-10-11, replacing the plan written before next-plan steps 11–12.


## Goal

| Question | Answered by |
|---|---|
| **What does mndflow draw?** | the showcase: one layer per thing it draws, each with a note saying what to look for |
| **What is it for?** | the architecture workspace: one system, many diagrams, every component stated once |
| **How do diagrams relate?** | class, swimlane and sequence cards drawing data the graph already holds — nothing stored for the drawing |
| **Do patterns compose?** | the story's vocabulary is a package collected from definition files, extended in the workspace |


## Decisions

| | Decided |
|---|---|
| **two workspaces** | `samples/workspace.showcase.json` (the lab) and `samples/workspace.architecture.json` (the story). Each written by its own generator, both checked by the door |
| **one view per card** | a card's kind decides its layer view (`lens_of`). Class, swimlane and sequence join internal, grid, folder and definition. The rail keeps only overhead and profile |
| **the view is a setting** | `layout.view` names a diagram view, a closed engine set like `card.face`: `class`, `swimlane`, `sequence`. Said by a definition, inherited, overridable on a block. Drawing-only, so a setting, not a trait (step 12) |
| **a view needs its input** | `sequence` and `swimlane` draw only a grid; `class` only a block that may hold (`has_parts`). A block that cannot feed the view it names, or names one this build does not know, opens on its capability view (grid or internal) |
| **diagram kinds in a package** | `diagrams`, collected from definition files: *class diagram*, *swimlane*, *sequence diagram*. Base stays minimal; renderers are general code in views |
| **story vocabulary in a package** | `architecture`, collected from definition files, revised by editing a file and collecting again. The workspace extends it where it needs structure (definition files hold no parts) |
| **story instances by generator** | a typed generator writes the architecture workspace with fixed ids, merging the packages it uses |
| **read only first** | the three new views project and never edit: `slots: ["display"]`, nothing dragged. The grid, explorer, tray and CLI edit what they draw. Canvas editing comes after the drawings are right |
| **scenarios are grids** | header row = participants (references to architecture blocks), header column = phases, body cells = steps, relations between steps = messages / flow. One grid feeds both swimlane and sequence |
| **SVG not grown** | per cli-plan, the stage is the one renderer: the sequence view changes Stage only, never views `svg.ts` |
| **YAML bootstrap last** | opening a fresh browser on a sample is the final phase |
| **a view on a stand-in** | a reference stating its own `layout.view` opens that view over its target, where the target feeds it. One dataset, many diagrams, nothing copied: a scenario grid draws as a sequence, and through a reference as a swimlane |
| **no fields toggle** | the kit Viewer's *contents / diagram* toggle goes once the class view lands: one view per card. A schema-and-instances drawing, if still wanted, is a class diagram card |
| **`layout.cards`** | `layout.face` (small / large) is renamed `layout.cards`, so *face* means only `card.face` |
| **lanes are columns** | a swimlane's participants are its columns; no orientation setting |


## Rules for implementers

| | |
|---|---|
| **one task at a time** | each task below is sized for one agent session. Do its *Steps*, run its *Verify*, stop at *Done when* |
| **no tests** | the design is moving: verify by running the generator, the door and the app. Write no test files unless the user asks |
| **no commits** | suggest a commit message; never commit, amend or rewrite history |
| **no legacy** | on a schema change, re-run every generator and re-collect every package; the door repairs no old shapes; no aliases or compatibility entries |
| **match the code** | snake_case functions, short names, a docstring per module and function, short comments per block, lines ≤ 100 columns. Read the neighbouring file first |
| **docs are the goal** | do not edit design.md, definitions.md or package docs unless the task says so |
| **search first** | reuse core and views functions named in each task before writing new ones |
| **report honestly** | if a Verify step fails, say so with the output; do not mark the task done |

**Verify commands used throughout**

| Do | Command |
|---|---|
| typecheck | `npm run typecheck` |
| tests still pass | `npm test` |
| CSS lint | `npm run lint:css` |
| check a file | `npm run start -s -w @mnd/cli -- check ../../samples/<file>.json` → prints `clean` |
| list a layer | `npm run start -s -w @mnd/cli -- outline ../../samples/<file>.json <layer-id>` |
| project a layer | `npm run start -s -w @mnd/cli -- project ../../samples/<file>.json <layer-id>` |
| drive the app | `npm run dev`; import the file through the header's *import a workspace* button; the `vitest` skill says how to drive it |


## Phases

| # | Phase | Done when |
|---|---|---|
| 1 | **generator groundwork** | the showcase is written by a typed generator sharing a builder; output reviewed through core `write` |
| 2 | **view by setting** | `layout.view` validates; `lens_of` reads it, on a stand-in too; the three new view kinds open, drawn as their capability view until their phase; `layout.face` is `layout.cards` |
| 3 | **packages from folders** | `diagrams` and `architecture` collected from definition files by one script, listed in the catalogue |
| 4 | **architecture workspace** | the story generator writes a clean workspace whose context, platform, domain, data and scenario layers read on existing views |
| 5 | **class view** | a class diagram card draws its definitions, extends lines and attribute links; the fields toggle is gone |
| 6 | **swimlane view** | a swimlane grid draws participants as lanes, phases as rows, steps and their relations |
| 7 | **sequence view** | a sequence grid draws lifelines and horizontal messages in time order |
| 8 | **lab refresh** | every showcase layer note matches what it draws; a diagrams layer shows each new view's small and edge cases |
| 9 | **opening on a sample** | a fresh browser opens a configured sample; then the YAML bootstrap |
| 10 | **docs and kit** | on the user's direction: docs brought up, kit released, mndmap re-pinned |


## 1 — Generator groundwork

### 1a · Typed showcase generator, byte-identical

| | |
|---|---|
| **Goal** | port `scripts/showcase.mjs` to TypeScript run by `vite-node`, its helpers in a shared builder, output unchanged |
| **Files** | new `scripts/lib/builder.ts`, `scripts/showcase.ts`; delete `scripts/showcase.mjs`; root `package.json` |

Steps:

1. Add `vite-node` to root `devDependencies` at the version Vitest already pulls in (`npm ls vite-node`: 2.1.9 today), so nothing relies on a transitive binary.
2. Add root script `"showcase": "vite-node scripts/showcase.ts"`.
3. Move `serial`, `order`, `shelf`, `def`, `put`, `layer`, `note`, `link` into `scripts/lib/builder.ts` as methods of a `Builder` made by `builder()`; state (`blocks`, `edges`, `counters`, `orders`) lives on it, not in module globals. Type with core's `Block`, `Relation`, `Graph`, `Id`.
4. `scripts/showcase.ts` builds the same layers in the same order through one `Builder`, then writes exactly as today (`JSON.stringify` of the same object, same key order).
5. Delete `scripts/showcase.mjs`; update next-plan's *Running it* row only if the user directs (docs rule) — otherwise mention it in the report.

Verify: `npm run showcase`, then `git diff --stat samples/` shows **no change**; `check` prints `clean`; typecheck passes.

Done when: the sample is byte-identical and the old script is gone.

### 1b · Packages merged whole, written by core `write`

| | |
|---|---|
| **Goal** | the generator merges a package file whole and emits through core's canonical writer |
| **Files** | `scripts/lib/builder.ts`, `scripts/showcase.ts` |

Steps:

1. Add `merge(file_path)` to the builder: reads a package file, adds **all** its blocks and edges, and throws on any id already present.
2. Replace the showcase's `entity-relation` merge (blocks only) with `merge`.
3. Emit with core `write(graph)` instead of `JSON.stringify`. Before writing, run core `read` on the text against `FLOOR` (from `@mnd/defs`) and throw on any fault.
4. Run once; review the diff: it must be **ordering only** (plus the package's edges, if any). Report anything else.

Verify: `npm run showcase`; `git diff samples/workspace.showcase.json` is reordering only; `check` clean; the app imports it and every lab layer opens as before.

Done when: the generator emits through `write` and the one-time ordering diff is reviewed by the user.


## 2 — View by setting

### 2a · `layout.view` and the new view kinds in core

| | |
|---|---|
| **Goal** | a block's chain may say `layout.view`; `lens_of` opens the named view where the block can feed it |
| **Files** | core `components.ts`, `sections.ts`, `navigate.ts`; `index.ts` exports |

Steps:

1. `components.ts` → `layout` component: accept `view` (a name; check like `kind`, "has to be a name"); add it to the `stray` list. Export `DIAGRAM_VIEWS = ["class", "swimlane", "sequence"] as const`.
2. `sections.ts`: add the three to `ViewKind` and `LAYER_VIEWS`, and to `INSIDE` (they open from inside a structure).
3. `navigate.ts`: add `diagram_of(graph, id): ViewKind | null` — `setting_of(graph, id, "layout")["view"]`, returned only if in `DIAGRAM_VIEWS` and fed: `sequence` / `swimlane` need `is_grid(graph, id)`; `class` needs the block to hold (`allows_of(...)` / `has_trait(..., "has_parts")` — read how `opens` decides room to hold and reuse it).
4. `lens_of`: for a stand-in, first ask whether the **reference itself** states `layout.view` (its own settings, not its chain's) and the target feeds that view — if so return it; otherwise follow the target as today. Then, after the stand-in line and before `is_grid`, return `diagram_of(graph, id)` when non-null.
5. Where a stand-in opens on its own view, `project` draws the **target's** content in that view while trail and crumbs name the reference's layer. Note in the report every reader of `lens_of` that assumes a stand-in's view is its target's (grep `lens_of`, `open_at`).
6. Grep every `ViewKind` switch (core `names.ts`, `session.ts`; options `groups.ts`; theme `icons.tsx`; tray `Tray.tsx`; views `block.ts`; web `App.tsx`; kit `index.ts`) and give the new kinds a case. Icons: `view_class`, `view_swimlane`, `view_sequence` in theme `icons.tsx`, drawn in the existing 24-unit path style.

Verify: typecheck; `npm test`; both samples `check` clean.

Done when: the kinds exist, nothing in the repo yet says `layout.view`, and behaviour is unchanged.

### 2b · New kinds drawn by their fallback

| | |
|---|---|
| **Goal** | opening a block whose view is class / swimlane / sequence draws something sensible before each renderer lands |
| **Files** | views `block.ts`, web `App.tsx` |

Steps:

1. In views `project`, a `look.kind` of `class` draws as `internal`; `swimlane` and `sequence` as the grid view. All three read only: `slots: ["display"]`, nodes `draggable: false`.
2. Crumbs name the view drawn (existing behaviour: check App's crumb label uses the kind).
3. Add a throwaway workspace block by hand in the app (or via `mnd run`) carrying `layout.view: sequence` on a grid; open it; confirm it opens, reads only, crumbs say *sequence*. Do not keep it in a sample yet.

Verify: typecheck; drive the app as above; report what you saw.

Done when: each new kind opens without error and edits are refused on it.

### 2c · Rename `layout.face` to `layout.cards`

| | |
|---|---|
| **Goal** | one meaning for *face*: `card.face`. Which size a layer draws its cards at is `layout.cards`, small or large |
| **Files** | core `components.ts` (the `layout` check and `stray` list; rename `FACES` if it names only small / large); views `size.ts`, `definition.ts`, `fields.ts`; `scripts/showcase.ts`; `public/packages/entity-relation.json`; base definition files saying it, then `npm run base` |

Steps: grep `layout.*face` and `"face"` across `packages/`, `apps/`, `scripts/`, `public/packages/`, `packages/defs/src/base/`; rename every layout use, leaving every `card.face` alone; re-collect `base`; re-run the showcase generator.

Verify: typecheck; `npm test`; both samples `check` clean; grep finds no `layout` saying `face`; the showcase's large-face layer still draws large.


## 3 — Packages from definition folders

### 3a · One script collects every catalogue package with a source folder

| | |
|---|---|
| **Goal** | `npm run packages` collects each folder under `packages/defs/src/packages/` into `public/packages/<name>.json` |
| **Files** | new `scripts/packages.mjs` (or a root script line per package), root `package.json`, `public/packages/index.json` |

Steps:

1. Read how `npm run base` calls `mnd collect`; do the same for each subfolder of `packages/defs/src/packages/`, writing `public/packages/<folder>.json`.
2. **Check cross-package types**: `architecture` will not extend `diagrams`, but a later package might. Collect runs over `base` only (`fold([], FLOOR)`); if a definition file names another catalogue package's id, confirm what `write` keeps. If it drops or faults, add `--with <pkg>` to `collect` as `translate` has it, and report.
3. Add `diagrams` and `architecture` entries to `public/packages/index.json` (`name`, `about`, `at`).

Verify: `npm run packages` prints no `refused` and no `made` lines; each output passes `check`.

### 3b · The `diagrams` package

Folder `packages/defs/src/packages/diagrams/`, one definition file each, the shape base's files use (`id`, `name`, `type`, `body`, `def`, `traits` where it keeps a different list, `settings`):

| File | Extends | Settings | Body says |
|---|---|---|---|
| `class_diagram.json` | `block` | `layout: { view: "class", cards: "large" }` | the definitions its references stand for, with what they extend and link to |
| `swimlane.json` | `grid` | `layout: { view: "swimlane" }` | each participant column a lane, each phase row a band, steps and their flow |
| `sequence_diagram.json` | `grid` | `layout: { view: "sequence" }` | each participant a lifeline, rows as time, relations between steps as messages |

Verify: `npm run packages`; import the package in the app (catalogue); each definition's definition view shows its `layout` table with `view`.

### 3c · The `architecture` package

Folder `packages/defs/src/packages/architecture/`, with `blocks/` and `relations/` subfolders (directories become folders):

| File | Extends | Says |
|---|---|---|
| `blocks/component.json` | `block` | attributes `owner: text`, `technology: text`; `card.face: table` |
| `blocks/service.json` | `component` | its own style family |
| `blocks/database.json` | `component` | attribute `engine: text`; its own style |
| `blocks/queue.json` | `component` | its own style |
| `blocks/external.json` | `component` | dashed border: outside the system |
| `blocks/document.json` | `block` | `card.face: document` |
| `blocks/decision.json` | `document` | note-like style: an architecture decision |
| `relations/calls.json` | `line` | `line.dir: forward` |
| `relations/publishes.json` | `line` | forward, dashed: asynchronous |
| `relations/reads.json` | `line` | forward |
| `relations/integrates.json` | `line` | forward |
| `relations/message.json` | `line` | forward: a scenario step's message |
| `relations/reply.json` | `line` | forward, dashed: a reply |

Ids inside files are bare (`component`); collection prefixes them (`architecture.component`). Each `body` says in one sentence what the kind means. Style values: copy names from existing base/showcase settings only.

Verify: `npm run packages`; `check` clean; in the app, `architecture` lists two folders and every definition opens on its definition view.

Done when: both packages are collected by one command and revised by editing a file and running it again.


## 4 — Architecture workspace

**One generator, `scripts/architecture.ts` (root script `"architecture"`), using the builder from 1a and `merge` from 1b; writes `samples/workspace.architecture.json`.** It merges `architecture`, `diagrams` and `entity-relation`. Every id below is fixed. Do 4a–4e in order, re-running and checking after each.

### 4a · Workspace and platform

| Id | Is |
|---|---|
| `workspace`, `main` | root and scratch definition, as `empty_graph` makes them, plus its `tags` folder |
| `w_defs` | folder of workspace definitions |
| `def_order_service` | extends `architecture.service`; owns parts `part_order_api`, `part_order_workflow`, `part_order_repository` (so a usage reads through one step) |
| `story` | folder under `main` holding every story layer |
| `story_intro` | a document usage: what the workspace shows and where to look |
| `story_platform` | layer (a block) holding the canonical architecture |

`story_platform` holds, each with `owner` / `technology` / `engine` values where it has them:

| Id | Name | Type |
|---|---|---|
| `svc_storefront` | Storefront | service (React) |
| `svc_gateway` | API gateway | service |
| `svc_orders` | Order service | `def_order_service` (owner Commerce) |
| `svc_payments` | Payment service | service (owner Payments) |
| `svc_inventory` | Inventory service | service (owner Fulfillment) |
| `svc_warehouse` | Warehouse adapter | service |
| `infra_events` | Order events | queue |
| `db_orders` | Orders database | database (PostgreSQL) |
| `db_inventory` | Inventory database | database (PostgreSQL) |
| `ext_payment` | Payment provider | external |
| `ext_warehouse` | Warehouse system | external |

Relations: Storefront → Gateway → Order service (*calls*); Order service → Payment service, Inventory service (*calls*); Payment service → Payment provider, Inventory service → Warehouse adapter → Warehouse system (*integrates*); Order service → Orders database, Inventory service → Inventory database (*reads*); Order service, Inventory service → Order events (*publishes*).

Verify: generate; `check` clean; `outline` `story_platform` lists 11 cards; in the app, Platform reads left to right after *arrange*; opening Order service shows its three parts.

### 4b · Context

`story_context`: an *Online customer* block, and **references** (not copies) to `svc_storefront`, `ext_payment`, `ext_warehouse` and to `story_platform` itself; relations customer → storefront reference, platform reference → the two externals.

Verify: `check` clean; Context draws five cards, the references marked `Ref`.

### 4c · Domain and data

| Id | Holds |
|---|---|
| `w_domain` (folder) | `def_customer_record`, `def_order_record`, `def_line_record`, `def_product_record` extending the `entity-relation` definitions; `def_payment_record` extending `block` with `amount: number`, `status: text`, `order: def_order_record` |
| `story_domain` | a **class diagram** usage (`diagrams.class_diagram`) holding references to the five record definitions |
| `story_data` | Ada Lovelace, Charles Babbage; orders 1001, 1002; four lines; Widget, Gadget, Spare; one payment — values naming each other so links draw |

Verify: `check` clean; `review` on `story_data` reports nothing; Domain opens (drawn as internal until phase 5) showing five definition stand-ins with link lines.

### 4d · Scenarios

Each scenario is a `diagrams.sequence_diagram` grid in its own layer. Header row: references to platform blocks (plus a plain *Customer* block where no platform block fits). Header column: plain phase blocks. Body: step blocks named for what happens. Relations between steps: *message* or *reply*, named where the step's name does not say it.

| Grid | Participants | Phases | Steps |
|---|---|---|---|
| `scenario_place` in `story_place_order` | Customer, Storefront, Gateway, Order service, Payment service, Inventory service | Submit, Create, Authorize, Reserve, Confirm, Failure | Submit cart; POST checkout; Create pending order; Authorize payment; Reserve stock; Confirm order; Reject payment — one reply, one publish, one failure branch |
| `scenario_fulfill` in `story_fulfill_order` | Order service, Order events, Inventory service, Warehouse adapter, Warehouse system | Ordered, Pick, Pack, Ship, Complete | one path through, plus a delayed-stock branch |

Verify: `check` clean; each grid, opened (as grid until phase 6/7), shows participants across the top, phases down the left, steps in cells and their lines. **If the grid view does not tell the story, fix the data now**, not the renderer later.

### 4e · Markdown cards

Files under `samples/architecture/cards/`: `story.md` (→ `story_intro`), `order-service.md` (→ `svc_orders`), `payment-service.md` (→ `svc_payments`), `idempotency.md` (a decision usage on `story_platform`), `payment-failure.md` (a document beside `scenario_place`).

Steps: read each with core `read_card`; set the block's `body` and `source`, and values from frontmatter keys outside `USAGE_KEYS` (as `collect` does). Frontmatter uses only `name`, `type`, `tags`, `source` and attribute names. Any tag a file names must already exist in the workspace's `tags` folder — the generator throws otherwise.

Verify: `check` clean; editing a markdown file and regenerating changes only that block's `body` / values in the diff; the cards draw their large faces in the app.

Done when (phase): the user has driven every story layer on existing views and the data reads.


## 5 — Class view

| | |
|---|---|
| **Goal** | a card whose view is `class` draws the definitions its references stand for as table cards, with *extends* lines and attribute links |
| **Files** | new views `class.ts`; views `block.ts` (replace the 2b fallback), `index.ts` |

Rules:

| | |
|---|---|
| **members** | the layer's children that are references to definitions (`is_reference` + `stood_def`), deduplicated by definition. Anything else on the layer is left out |
| **cards** | each member drawn with its **reference's id** (a pick selects the reference; the tray shows it and what it stands for), large face, `card.face: table` |
| **extends** | for each member, walk its chain to the **nearest member** ancestor; one line `class:extends:<ref>` from it to that ancestor's card: `line.dir: forward`, `to_arrow: "hollow"`, name *extends*, not selectable |
| **associations** | reuse views `links.ts` `linked_graph`, which already links stand-ins for definitions by attributes; add multiplicity to the name where the attribute says `many` (`*`) or `optional` (`0..1`) |
| **layout** | `auto`, through the existing grid; *arrange* not offered (read only) |
| **never** | usages, values, stored edges added to the source graph |

Steps: write `class_graph(graph, layer): Graph | null` in `class.ts` (pattern: views `fields.ts` builds a temporary graph the same way); in `project`, a `class` look projects `class_graph` as internal, read only, trail of the real layer.

Verify: typecheck; `npm test`; in the app, architecture → Domain draws five table cards, *extends* lines only where one member extends another, and links `order`, `customer`, `product` named; picking a card shows the reference in the tray; the source file is unchanged after (`git diff`).

Done when: Domain reads as a class diagram and nothing is stored for it.

### 5b · Retire the fields toggle

| | |
|---|---|
| **Goal** | no layer has a second view: the Viewer's *contents / diagram* toggle goes |
| **Files** | kit `viewer.tsx` (`fields`, `onFields`, the toggle buttons, the `fields_graph` / `class_def` use); web `App.tsx` (its fields state and handler); views `fields.ts` and its exports, once nothing imports them; cli-plan's *perspective* flags mention `fields` — report it, do not edit the doc |

Steps: grep `fields_graph`, `class_def`, `onFields`, `fields` in kit, web, cli and views; remove the toggle and its state; delete `fields.ts` if unused; keep any helper the class view reuses by moving it into `class.ts`.

Verify: typecheck; `npm test`; in the app, a data layer (showcase `l_rows`) draws its cards with no toggle at the bottom.


## 6 — Swimlane view

| | |
|---|---|
| **Goal** | a grid whose view is `swimlane` draws each participant column as a lane, phases as rows, steps in place and their relations routed as usual |
| **Files** | new views `swimlane.ts`; views `block.ts`, `index.ts`. Read holders `heading`, `lattice_of`, `at_cell` in core first |

Rules:

| | |
|---|---|
| **lanes** | one per header-row column `c ≥ 1`: a view-drawn **box** (solid rim, as overhead's boxes), id `@lane:<c>`, named the header block's shown name, not selectable |
| **header** | the header block's card at the top of its lane, its real id |
| **phases** | the header-column blocks, small cards in a narrow first column, each at its row, real ids |
| **steps** | each body block at its lane's centre, its row's y; a row is as tall as its tallest card plus `GAP`; a lane as wide as its widest card plus `PAD` each side |
| **merges** | a step spanning rows sits at its first row (spans drawn later, if wanted) |
| **relations** | the real edges between steps, unchanged: seats and libavoid route them |
| **read only** | positions computed every draw, never written |

Steps: `swimlane_graph(graph, grid): Graph | null` (null where fewer than two participant columns or no body step); `project` routes `swimlane` there.

Data: the story adds `story_place_lanes`, a layer holding a reference to `scenario_place` that states `layout.view: swimlane` (the stand-in rule from 2a). Opening the reference draws the place-order grid as lanes.

Verify: typecheck; in the app, the place-order swimlane shows six lanes, phases in order, every message line; moving a step to another cell in the grid view moves it to that lane in the swimlane.

Done when: grid and swimlane agree for both scenarios.


## 7 — Sequence view

| | |
|---|---|
| **Goal** | a grid whose view is `sequence` draws participants as lifelines and relations between steps as horizontal messages in row order |
| **Files** | new views `sequence.ts`; views `scene.ts` (`LineData.points`, `faults`), `avoid.ts`, `block.ts`, `index.ts`; stage `Wire.tsx`, stage CSS |

Rules:

| | |
|---|---|
| **lifelines** | per participant column: the header block's small card at top (real id), and a dashed stem from its bottom to the last row: a line between two synthetic zero-size nodes, not selectable |
| **time** | body row order, top to bottom: `y = top + r × pitch` |
| **steps** | each step a narrow activation bar on its lifeline at its row (real id, small, its name beside it) |
| **messages** | each real relation between two steps: from the source step's lifeline x to the target's, at the **target's row**; several in one row offset evenly within it. Arrows and dash from the relation's settings |
| **name** | the relation's own `name`, else the target step's name |
| **self message** | source and target on one lifeline: a three-leg loop to the right |
| **phases** | header-column blocks as small cards left of the first lifeline, at their rows |
| **not yet** | activation spans, fragments, durations, conditions — added only when the two scenarios show a need |

Steps:

1. views `scene.ts`: `LineData.points?: readonly { x: number; y: number }[]`; `faults` refuses a non-finite point.
2. stage `Wire.tsx`: where `data.points` is given, draw that polyline (with the existing heads and label placement) and skip routing; views `avoid.ts` `routes_of` skips such edges.
3. `sequence_scene(graph, grid): Scene | null` in `sequence.ts`, built directly as a Scene (time is geometry here), using `size_of` for card sizes. `project` routes `sequence` there; trail is the real grid's.

Verify: typecheck; `npm test`; `npm run lint:css`; in the app, place order shows six lifelines, messages strictly downward by row, the reply dashed, the failure branch last; picking a header or step selects the real block.

Done when: both scenarios read as sequence diagrams and every pick resolves to a real element.


## 8 — Lab refresh

| | |
|---|---|
| **Goal** | the showcase is the visual checklist for everything above |
| **Files** | `scripts/showcase.ts` (split into `scripts/showcase/` modules only if it passes ~400 lines) |

Steps:

1. Merge `diagrams` into the showcase. Add `l_diagrams`: a small class diagram (two references to lab definitions, one extending the other, one link), a 3×3 swimlane grid, and a 3×3 sequence grid with a self message, an empty lane and a header referring to nothing.
2. Re-read every layer's note against what it draws today (step 12: names on lines, faces named, lines round cards) and correct it. Each note says what to open, what should appear, what proves it right.
3. Retire layers the architecture workspace now covers better only if the user agrees; list candidates (`l_model`, `l_rows`) in the report.

Verify: `npm run showcase`; `check` clean; drive every lab layer and report anything that draws wrong.


## 9 — Opening on a sample

### 9a · A fresh browser opens a sample

The web app, finding its storage empty, imports a default workspace file (the showcase) instead of an empty one. Served through Vite, not copied into `public/`. Reset still makes an empty workspace; an existing log always wins.

### 9b · YAML bootstrap

Root `mndflow.yaml` names the default workspace, the catalogue, and app defaults (theme, tray, display, start view). Parsed by core with its `yaml` dependency; never written by the app; never a graph format. Scope it when 9a is in use — the old plan's contract is in git history (`44e1979`).


## 10 — Docs and kit (on direction)

| Doc | Gains |
|---|---|
| design.md *Perspectives* | three layer views, `layout.view`, a view needs its input, read only |
| definitions.md | *class*, *swimlane*, *sequence* views; *lifeline*, *message* as drawn things, never stored |
| core model / schema docs | `layout.view` |
| defs docs | catalogue packages collected from folders |
| cli-plan | the *perspective* flags lose `fields` |
| next-plan *Carried over* | kit changes: `ViewKind` gains three kinds; `DIAGRAM_VIEWS`; `layout.face` → `layout.cards`; `LineData.points`; the Viewer's `fields` / `onFields` and views `fields_graph` / `class_def` gone; a stand-in may state its own view |

Then `npm run release:kit` and re-pin mndmap.


## Guardrails

- no stored diagram geometry, lifelines, lanes, message numbers or class edges
- no new base kinds: diagram kinds are a package's definitions
- every component stated once; other diagrams refer to it
- no sample-only behaviour in the app: every rule lives in core or views, reusable by kit and CLI
- Scene stays plain data
- the lab stays synthetic; the story stays believable — no routing torture cases in the story
