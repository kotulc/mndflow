# Sample plan

**Turn the showcase into the product's visual specification: one coherent order-fulfillment
architecture, one compact visual lab, and several derived perspectives over the same graph.**
The workspace remains canonical JSON. A project YAML file initializes the default workspace and
app state; markdown files provide card content. Class, swimlane, sequence and lifelines are
derived readings, never new base kinds or stored diagram geometry.


## Outcome

The completed sample answers four questions:

1. **What does mndflow draw?** The visual lab enumerates cards, faces, marks, definitions,
   relations, routing, interfaces, holders, grids, references, markdown and failure states.
2. **What is it useful for?** The order-fulfillment story communicates one realistic system through
   context, service, domain, data and interaction diagrams.
3. **How do views relate?** Overhead, profile, internal, folder, grid and definition views, plus
   fields, class, swimlane and sequence perspectives, all read one graph.
4. **Can it be reproduced?** One generator writes the checked JSON file; one YAML bootstrap opens
   it consistently; markdown sources, tests and a walkthrough are checked in beside it.

The first milestone stops before new perspective renderers. It delivers the refactored story,
lab, YAML bootstrap, markdown sources and explicit coverage of every existing view. That baseline
is used to decide what the class, swimlane and sequence projections must add.


## Decisions

### One graph, two zones

- `main` holds two folders:
  - `story` — the order-fulfillment architecture and its scenarios.
  - `lab` — concentrated visual and routing cases.
- Opening either folder uses the existing folder view and makes the workspace's organization
  obvious on the canvas and in the explorer.
- Existing lab IDs are retained where possible (`l_cards`, `l_faces`, `l_defs`, `l_rel`,
  `l_ports`, `l_hold`, `l_refs`). Tests and docs may continue to name them.
- Architecture components exist once. Other layers use references to those canonical blocks;
  they do not create separate copies for each diagram.

### One source of model truth

- [`samples/workspace.showcase.json`](../samples/workspace.showcase.json) is the canonical sample
  workspace imported by the app and checked by the door.
- [`scripts/showcase.mjs`](../scripts/showcase.mjs) is replaced by a typed, modular generator.
- JSON remains the workspace/package interchange format and the only format exported after edits.
- YAML is bootstrap configuration, not a second graph format and not a round-trip target.
- Markdown is card content. Its YAML frontmatter is read through the existing card-source rules.

### View taxonomy

- **System views** remain core `ViewKind`s: `overhead`, `profile`.
- **Layer views** remain core `ViewKind`s selected by `lens_of`: `internal`, `folder`, `grid`,
  `definition`.
- **Derived perspectives** are session overlays on a layer:
  `contents`, `fields`, `class`, `swimlane`, `sequence`.
- Perspectives never change `open_at`, `leave_at`, `reveal_at`, section state or graph data.
- The existing `fields_graph` is a **schema and instances** perspective. It is not renamed into,
  or mistaken for, the new package/layer-wide class perspective.

### Diagram semantics

- **Class:** definitions, inheritance and typed attributes are truth; class boxes and association
  lines are derived.
- **Swimlane:** a grid is truth. Top headers allocate participant columns, left headers allocate
  phases/time rows, cells allocate steps, and relations state flow.
- **Sequence:** the same scenario grid is truth. Participant columns become lifelines; row order
  becomes time; relations between allocated steps become messages.
- **Lifelines:** projected guides/nodes only. No block, tag, position or relationship is stored
  merely to draw a lifeline.
- Do not add `class`, `lane`, `lifeline`, `message` or `sequence` as base kinds.


## Target files

### Existing files changed

- [`scripts/showcase.mjs`](../scripts/showcase.mjs) — becomes a compatibility entry that invokes
  the modular generator, or is retired after the root npm script replaces it.
- [`samples/workspace.showcase.json`](../samples/workspace.showcase.json) — regenerated output.
- [`apps/web/src/main.tsx`](../apps/web/src/main.tsx) — loads bootstrap before mounting.
- [`apps/web/src/App.tsx`](../apps/web/src/App.tsx) — accepts bootstrap defaults and perspective
  session state.
- [`apps/web/vite.config.ts`](../apps/web/vite.config.ts) — serves/emits the root bootstrap and
  configured workspace without duplicating checked-in JSON.
- [`packages/core/src/sections.ts`](../packages/core/src/sections.ts) — names the closed
  `PerspectiveKind` set when perspectives begin.
- [`packages/core/src/index.ts`](../packages/core/src/index.ts) — exports bootstrap and perspective
  types.
- [`packages/views/src/index.ts`](../packages/views/src/index.ts) — exports perspective projection
  functions.
- [`packages/kit/src/viewer.tsx`](../packages/kit/src/viewer.tsx) — generalizes the fields toggle to
  a perspective.
- [`packages/options/src/groups.ts`](../packages/options/src/groups.ts) — perspective controls.
- Stage and SVG renderer files are changed only for the sequence perspective.

### New source files

```text
mndflow.yaml

scripts/showcase/
  index.ts
  graph.ts
  content.ts
  workspace.ts
  story.ts
  scenarios.ts
  lab/
    index.ts
    cards.ts
    faces.ts
    definitions.ts
    relations.ts
    interfaces.ts
    holders.ts
    references.ts

samples/showcase/cards/
  story.md
  order-service.md
  payment-service.md
  idempotency.md
  payment-failure.md

packages/core/src/bootstrap.ts
packages/core/test/bootstrap.test.ts

packages/views/src/perspectives.ts
packages/views/src/class.ts
packages/views/src/swimlane.ts
packages/views/src/sequence.ts
packages/views/test/perspectives.test.ts

test/showcase.test.ts
```

Use `vite-node` for the typed generator so it can call core's card, file and validation functions
instead of reimplementing frontmatter or the door. Add a root script:

```json
{
  "scripts": {
    "showcase": "vite-node scripts/showcase/index.ts"
  }
}
```

Declare `vite-node` directly in root dev dependencies at the same version as Vitest; do not rely
on a transitive binary.


## Workspace structure

### Root and definition folders

Keep:

- `workspace` — package root and counters.
- `main` — scratch definition and root structure.
- `tags` — the folder the workspace files its tags in (`rotating` today); new tags land here.
- `w_faces`, `w_machines`, `w_holders`, `w_relations` — current lab vocabulary.

Add:

- `w_platform` — component/service/database/queue/external-system definitions.
- `w_domain` — editable subtypes of the frozen entity-relation definitions.
- `w_relations` — kept; add calls, publishes, reads, integrates and scenario-message definitions.
- `w_docs` — document and decision definitions used by markdown cards.
- `w_scenarios` — the scenario-grid definition.

Do not extract a `fulfillment-patterns` package in the first milestone. Keep definitions editable
while the sample exposes model changes. Once the story stabilizes, export `w_platform`,
`w_relations` and `w_scenarios` as a frozen package to prove **patterns compose**.

### Structure under `main`

```text
main
├─ story/                         folder
│  ├─ story_intro                explanatory large card
│  ├─ story_context              context layer
│  ├─ story_platform             canonical service architecture
│  ├─ story_domain               definition references / class scope
│  ├─ story_data                 mixed sample instances and value links
│  ├─ story_orders              Order-only instances for fields perspective
│  ├─ story_place_order          scenario layer holding a grid
│  └─ story_fulfill_order        scenario layer holding a grid
└─ lab/                           folder
   ├─ lab_intro
   ├─ l_cards
   ├─ l_faces
   ├─ l_defs
   ├─ l_rel
   ├─ l_ports
   ├─ l_hold
   └─ l_refs
```

Move the useful content of `l_model` and `l_rows` into `story_domain`, `story_data` and
`story_orders`. Keep temporary alias notes for one iteration if docs or manual scripts still name
the old layers; remove the aliases when all references are updated.

### Story vocabulary

Add these workspace definitions with fixed IDs:

- `def_component` — attributes `owner: text`, `technology: text`.
- `def_service` extends `def_component` — service style and `card.face: table`.
- `def_order_service` extends `def_service` — attributes and a reusable structure that demonstrates
  read-through.
- `def_database` extends `def_component` — attribute `engine: text`.
- `def_queue` extends `def_component`.
- `def_external` extends `def_component` — away/dashed look.
- `def_document` extends `block` — `card.face: document`, large-face documentation.
- `def_decision` extends `def_document` — note/decision look.
- `def_scenario` extends `grid` — lists every trait it keeps, `is_grid` and `has_head` among them,
  as the lab's `def_table` does.

`def_order_service` owns three fixed-ID parts so `svc_orders` proves one-step read-through:

- `part_order_api` — API.
- `part_order_workflow` — workflow.
- `part_order_repository` — repository adapter.

Add editable domain definitions under `w_domain`:

- `def_customer_record` extends `entity-relation.customer`.
- `def_order_record` extends `entity-relation.order`.
- `def_line_record` extends `entity-relation.line`.
- `def_product_record` extends `entity-relation.product`.
- `def_payment_record` extends the package's payment definition where one exists; otherwise extends
  `block` and declares the minimal payment attributes.

The workspace subtypes are deliberate: package definitions stay frozen, the sample demonstrates
composition by extension, and `schema_def` can offer the existing fields perspective because its
schema definition belongs to the editable workspace.

Relation definitions:

- `rel_calls` extends `line`, forward/open arrow.
- `rel_publishes` extends `line`, forward.
- `rel_reads` extends `line`, forward.
- `rel_integrates` extends `line`, forward.
- `rel_message` extends `line`, forward; used by scenario transitions.
- `rel_reply` extends `line`, back or a distinct visual setting.

Names describe semantics, not presentation. Direction remains `line.dir` through settings. **Scenario
message text is the relation's own `name`** (next-plan step 12: labels are gone); a message that
means something of its own is a relation definition.

### Canonical architecture blocks

`story_platform` owns the real architecture blocks:

- `svc_storefront` — Storefront, Service, technology React.
- `svc_gateway` — API gateway, Service.
- `svc_orders` — Order service, Order Service, owner Commerce.
- `svc_payments` — Payment service, Service, owner Payments.
- `svc_inventory` — Inventory service, Service, owner Fulfillment.
- `svc_warehouse` — Warehouse adapter, Service.
- `infra_events` — Order events, Queue.
- `db_orders` — Orders database, Database, engine PostgreSQL.
- `db_inventory` — Inventory database, Database, engine PostgreSQL.
- `ext_payment` — Payment provider, External system.
- `ext_warehouse` — Warehouse system, External system.

Architecture relations:

- Storefront → Gateway → Order service (`rel_calls`).
- Order service → Payment service and Inventory service (`rel_calls`).
- Payment service → Payment provider (`rel_integrates`).
- Inventory service → Warehouse adapter → Warehouse system (`rel_integrates`).
- Order service → Orders database (`rel_reads`).
- Inventory service → Inventory database (`rel_reads`).
- Order service and Inventory service → Order events (`rel_publishes`).

`story_context` contains an Online customer block and references to `story_platform`,
`svc_storefront`, `ext_payment` and `ext_warehouse`. The references, not cloned services, provide
the context diagram.

`story_domain` contains references to the editable workspace subtypes Customer record, Order
record, Line record, Product record and Payment record. The class perspective includes their
frozen ancestors when it draws inheritance.

`story_data` contains a mixed, linked data set:

- Ada Lovelace and Charles Babbage.
- Orders 1001 and 1002.
- Four line items.
- Widget, Gadget and Spare products.
- One payment record if the entity-relation vocabulary supports it; otherwise add a workspace
  Payment subtype with explicit attributes.

`story_orders` contains at least three usages of `def_order_record` and any references needed to
explain them. Put an Order usage first so `schema_def(story_orders)` deterministically offers the
existing fields diagram.


## Scenario graph convention

Both scenarios are ordinary grids. This convention is normative for the showcase and becomes the
input contract for swimlane and sequence projections.

### Grid orientation

- Row `0` is the participant header row.
- Column `0` is the phase/time header column.
- Participant headers are **reference blocks** pointing to canonical architecture blocks.
- Phase headers are plain blocks named for the stage: Submit, Validate, Reserve, Pay, Fulfill,
  Complete, or Failure.
- Body cells contain step blocks. Their names state what happens.
- A participant's lane is the column allocated by its top header.
- Time is the body row order from top to bottom.
- Relations between body steps state messages or flow.
- A merge states a step spanning phases; no separate duration field is added.

This orientation lets one grid support both derived readings:

- Swimlane: participant columns become lanes.
- Sequence: participant columns become vertical lifelines; rows become message time.

### Place-order grid

ID `scenario_place`, parent `story_place_order`, type `def_scenario`.

- Participants: Customer, Storefront, Gateway, Order service, Payment service, Inventory service.
- Phases: Submit, Create, Authorize, Reserve, Confirm, Failure.
- Steps:
  - Submit cart.
  - POST checkout.
  - Create pending order.
  - Authorize payment.
  - Reserve stock.
  - Confirm order.
  - Reject payment (failure branch).
- Relations join each transition with `rel_message` or `rel_reply`.
- Include one return/reply, one asynchronous publish and one failure branch.

### Fulfill-order grid

ID `scenario_fulfill`, parent `story_fulfill_order`, type `def_scenario`.

- Participants: Order service, Order events, Inventory service, Warehouse adapter, Warehouse.
- Phases: Ordered, Pick, Pack, Ship, Complete.
- Steps and relations form one readable path plus one delayed-stock branch.

### Ordinary-view requirement

Before any new perspective is implemented, opening each grid in its grid view must communicate the
same participants, phases, steps and flow. If it does not, fix the graph convention before writing
a specialized renderer.


## Markdown card sources

Use the existing [`read_card`](../packages/core/src/card.ts) and `attach`/`markdown` action rules;
the generator must not parse YAML frontmatter independently.

Suggested files:

- `story.md` — workspace walkthrough and links between the story layers.
- `order-service.md` — name/type/tags/values frontmatter plus service responsibility and API
  contract.
- `payment-service.md` — external dependency and failure behavior.
- `idempotency.md` — architecture decision, rationale and consequences.
- `payment-failure.md` — scenario explanation and recovery notes.

Each file uses YAML frontmatter only for keys already understood by card sources:

```markdown
---
name: Order service
type: Order Service
tags: [critical]
owner: Commerce
technology: TypeScript
source: samples/showcase/cards/order-service.md
---
# Responsibility

Own the order lifecycle and coordinate payment and inventory.

## Contract

- Accept a checkout request.
- Persist a pending order.
- Publish confirmed or rejected events.
```

Generator sequence:

1. Build definitions and fixed-ID usages.
2. Load card-source text.
3. Run the real `attach` or `markdown` action against each target block in an in-memory graph/log.
4. Fail generation on any refusal or unexpected newly minted definition.
5. Fold and write the canonical JSON with core `write` after the generator's canonical-writer
   migration in Phase B.

The checked JSON carries body text and source provenance. The markdown files remain editable input
for regeneration; app edits/export do not modify them.


## YAML bootstrap contract

Add root [`mndflow.yaml`](../mndflow.yaml):

```yaml
schema: mndflow/bootstrap-1

workspace:
  file: samples/workspace.showcase.json
  load: when-empty

catalogue: public/packages/index.json

app:
  theme: retro
  tray:
    open: true
  display:
    card: { w: 5, h: 2 }
    lattice: true
    legend: false
    corner: top
    interfaces: true
    frame: true
  start:
    section: structure
    view: overhead
    focus: story
```

### Semantics

- Paths are relative to `mndflow.yaml`.
- `load: when-empty` means an existing IndexedDB log wins. The default workspace seeds only a
  fresh browser session.
- Local user theme preference wins over the YAML theme; YAML supplies the default.
- URL/deep-link handoff will eventually win over YAML start state.
- Start state applies once after a default workspace load. It is never logged or exported.
- Reset creates the normal empty workspace; it does not silently re-import the showcase.
- Export and import remain JSON.
- The YAML file is never modified by the app.

### Core API

Add [`packages/core/src/bootstrap.ts`](../packages/core/src/bootstrap.ts):

```ts
export const BOOTSTRAP_SCHEMA = "mndflow/bootstrap-1";

export type Bootstrap = {
  schema: typeof BOOTSTRAP_SCHEMA;
  workspace?: { file: string; load?: "when-empty" };
  catalogue?: string;
  app?: {
    theme?: "retro" | "modern" | "light";
    tray?: { open?: boolean };
    display?: {
      card?: { w: number; h: number };
      lattice?: boolean;
      legend?: boolean;
      corner?: "top" | "bottom";
      interfaces?: boolean;
      frame?: boolean;
    };
    start?: {
      section?: "definitions" | "structure";
      view?: ViewKind;
      focus?: Id;
      perspective?: PerspectiveKind;
    };
  };
};

export type BootstrapFault = { path: string; what: string };

export function parse_bootstrap(text: string): {
  bootstrap: Bootstrap | null;
  faults: BootstrapFault[];
};
```

Parsing uses core's existing `yaml` dependency. Reject unknown major/schema identifiers, invalid
enums, missing workspace paths, non-positive card sizes and unknown keys. Parsing is pure and does
no I/O.

### Web host loading

Add `apps/web/src/bootstrap.ts` for host I/O:

1. Fetch `/mndflow.yaml`.
2. Parse with core.
3. Resolve configured paths relative to the repository bootstrap URL.
4. Read IndexedDB storage and libavoid as today.
5. If storage is empty and the config says `when-empty`, fetch the workspace JSON.
6. Mount `App` with `{ storage, bootstrap, workspaceText?, startupFaults }`.

`App`:

- Constructs the session with the configured catalogue.
- Loads `workspaceText` exactly once before applying start state.
- Seeds `useTray(bootstrap.app?.tray?.open ?? true)`.
- Seeds `useDisplay` by merging existing shell defaults with `bootstrap.app.display`.
- Seeds frame/interfaces state from config.
- Applies theme precedence: localStorage → bootstrap → `retro`.
- Resolves and applies the configured start view/focus once; invalid IDs become a stage message,
  not an exception.

Start-state application uses existing navigation rather than constructing a `View` in the app:

1. `s.go("reveal", { id: focus })` establishes the correct section/layer.
2. Verify the resulting section matches the optional configured section.
3. For `overhead` or `profile`, call `s.see(view, focus)`.
4. Set the requested derived perspective only after the real layer is open and eligible.

Run this sequence once while constructing the initial session, before registering `watch`. It must
not replay on React renders or after the user navigates.

### Vite asset bridge

The browser cannot fetch arbitrary repository paths. Add a small Vite plugin in
[`apps/web/vite.config.ts`](../apps/web/vite.config.ts):

- In dev, serve `/mndflow.yaml` from the repository root and
  `/samples/workspace.showcase.json` from the canonical sample.
- In build, emit those same two files as build assets.
- Watch both files so regeneration or config edits reload dev.
- Do not check in a second copy under `public/`.

The plugin performs file I/O only; parsing and validation remain core's.

### Bootstrap tests

Add core tests for:

- valid parse and defaults;
- bad schema;
- bad enum and dimensions;
- unknown key diagnostics;
- path-relative config values preserved for the host.

Add web tests for:

- existing storage wins over default workspace;
- empty storage loads the showcase checkpoint;
- bootstrap display defaults initialize the shell;
- invalid workspace/config still mounts and reports a startup message;
- reset returns to an empty workspace.


## Generator implementation

### Phase A: extract without changing output

Move current helpers into `scripts/showcase/graph.ts`:

- `serial(kind)`
- `order(parent)`
- `shelf(id, name, parent)`
- `def(id, name, type, settings, more, parent)`
- `put(id, parent, kind, more)`
- `layer(id, name, type, more)`
- `note(layer, text, width)`
- `link(id, from, to, options)`

Wrap state in a `ShowcaseBuilder` instead of module globals:

```ts
type ShowcaseBuilder = {
  graph: Graph;
  counters: Record<string, number>;
  order(parent: Id): number;
  shelf(...): Block;
  def(...): Definition;
  put(...): Block;
  layer(...): Block;
  note(...): Block;
  link(...): Relation;
};
```

Phase A is complete only when the regenerated JSON is byte-identical to the pre-refactor sample.
Retain the current insertion-order `JSON.stringify` emitter for this phase; changing module
boundaries and file ordering in one diff would hide mistakes.

### Phase B: module boundaries

- `workspace.ts` — root, `main`, definition folders, shared definitions.
- `story.ts` — story folder, context, platform, domain, data and order layers.
- `scenarios.ts` — scenario grids, headers, steps and relations.
- `lab/*` — direct ports of existing sections with IDs and content unchanged.
- `content.ts` — reads markdown and applies it through core actions.
- `index.ts` — composes modules, merges packages, validates and writes.

Merge the full package graph from `public/packages/entity-relation.json`, including relationships,
not only `graph.blocks`. Refuse block or edge ID collisions.

Phase B deliberately switches emission to core `write`. Accept the resulting one-time canonical
ordering diff only after the story/lab data is reviewed; from then on generation and ordinary
export use the same writer.

### Generation checks

Before writing:

1. Lay `FLOOR` under the generated graph.
2. Run door inspection/open semantics.
3. Run `review`.
4. Project every normal story/lab layer and require no Scene faults.
5. Canonically write the workspace.
6. Print block, relation, layer and perspective-eligible counts.

Generation exits non-zero on any fault, note that violates the sample's strict policy, collision,
card-source refusal or perspective prerequisite failure.


## Existing-view baseline

The first milestone must explicitly prove:

- **Internal:** open `story_platform`.
- **Folder:** open `story`, then `lab`.
- **Grid:** open `scenario_place` and `scenario_fulfill`.
- **Definition:** open `def_order_service` and `def_pump`.
- **Read-through:** open `svc_orders`; it shows the structure owned by `def_order_service`.
- **Overhead:** show the whole definitions/structure system with story and lab boxes.
- **Profile:** pick `svc_orders` and verify the hierarchy reads top to bottom.
- **Fields:** toggle the existing fields diagram on `story_orders`.

Add concise catalog cards/notes that say what to open, what view should appear, and what visual
fact proves success. `l_rel`'s note already says lines go round cards (step 12).


## Perspective framework

Implement the framework only after the existing-view baseline is accepted.

### Core types

In [`packages/core/src/sections.ts`](../packages/core/src/sections.ts):

```ts
export type PerspectiveKind =
  | "contents"
  | "fields"
  | "class"
  | "swimlane"
  | "sequence";

export const PERSPECTIVES: readonly PerspectiveKind[] = [
  "contents", "fields", "class", "swimlane", "sequence",
];
```

`ViewKind` is unchanged.

### Views API

Add:

```ts
export type Perspective = {
  kind: PerspectiveKind;
};

export type ProjectedPerspective = {
  scene: Scene;
  target: (id: Id) => Id | null;
};

export function perspectives_of(graph: Graph, layer: Id): PerspectiveKind[];

export function project_perspective(
  graph: Graph,
  layer: Id,
  perspective: Perspective,
  config?: Config,
): ProjectedPerspective;
```

Rules:

- `contents` delegates to `project`.
- `fields` wraps existing `fields_graph`.
- Ineligible perspectives are omitted by `perspectives_of`; callers do not render a blank view.
- Synthetic nodes are read-only and map through `target`.
- Scene `trail` and `layer` always refer to the real layer.
- Perspective switches never mutate graph settings or stored positions.

### Host state

`App.tsx` holds:

```ts
type ActivePerspective = {
  layer: Id;
  kind: PerspectiveKind;
} | null;
```

- Clear it when the real open layer changes.
- Normalize picks through the projection's `target` before sending them to the session/tray.
- Perspectives are available only on inside layer views, not overhead/profile/folder/definition
  unless a later design explicitly allows one.
- Crumbs continue to name real layers; show the perspective as a small canvas/chrome label, not a
  fake crumb.

Generalize kit `Viewer`:

```ts
perspective?: PerspectiveKind;
onPerspective?: (kind: PerspectiveKind) => void;
```

Replace `fields`/`onFields` after updating mndmap; no compatibility layer is required inside this
repo, but the kit release and mndmap pin must happen in the same tracked milestone.

Options receive `perspectives` and `perspective` in `Chrome`. Add a `perspective` group beneath
view controls; it emits host chrome intent and never a core mutation/action.


## Class perspective

### Eligibility and scope

Eligible when the open layer contains at least two references to definitions, or when its direct
children resolve to at least two definitions.

For `story_domain`, resolve each reference's `of` target. Deduplicate by definition ID.

### Temporary graph

Add `class_graph(graph, layer): Graph | null`:

- Create synthetic layer `@class`, `layout.kind: auto`, `layout.face: large`.
- Clone each real definition into `@class` with its real ID and large attribute table.
- Do not clone usages or values.
- Add synthetic inheritance edges:
  `@class:extends:<sub>:<super>`, source subtype, target supertype, hollow arrow, label `extends`.
- Add synthetic association edges for attributes typed by another included definition:
  `@class:attribute:<owner>:<attribute>`.
- Association labels include the attribute name and multiplicity derived from `many`/`optional`.
- Deduplicate associations by owner definition + attribute, not merely endpoint pair.
- Project `@class` through the ordinary internal projector.
- Mark synthetic edges unpickable; picks on class cards remain real definition IDs.

No graph schema, mutation, base kind or stored relation is added.

### Tests

- Inheritance edge direction and styling.
- Attribute associations and multiplicity.
- Frozen package definitions included.
- No usage values in class cards.
- Perspective switch leaves source graph byte-equivalent.
- Resulting Scene passes `faults`.


## Swimlane perspective

### Eligibility

Eligible only for a grid with:

- a top header block in at least two participant columns;
- at least one body step;
- at least one relation between body steps.

### Temporary graph

Add `swimlane_graph(graph, grid): Graph | null`:

- Synthetic root `@swimlane`, free layout.
- One synthetic group per participant column: `@lane:<header-id>`.
- Group label is the participant reference's shown name.
- Reparent real body-step blocks into their lane group, retaining real IDs.
- Place steps vertically by grid row; equal row indices align horizontally.
- Use fixed lane widths from the widest card in each lane and a shared row pitch.
- Draw phase names from left-header blocks as read-only note/label cards in a narrow leading lane.
- Preserve real relations between step blocks; ordinary projection handles seats/routing.
- Synthetic lane/phase nodes are unpickable or map to their real header block.
- Return `slots: ["display"]`; no layer/layout/relation editing while the perspective is active.

### Tests

- Column allocation chooses lanes.
- Row allocation preserves order/alignment.
- Moving a step to another cell changes lane without changing any other field.
- Cross-lane relations retain IDs and direction.
- Synthetic picks map to header blocks.
- Scene passes `faults`.


## Sequence perspective and lifelines

Sequence uses the same scenario grid; it requires a specialized Scene because time is vertical and
message lines must meet lifelines at their event row rather than route between card borders.

### Derived data

- Participant order: top-header column order.
- Participant identity: header reference target; fallback to the header block itself.
- Time order: body row index.
- Message source/target: relation endpoint steps → each step's allocated participant column.
- Message y: target step row, with stable offsets for multiple messages in one row.
- Message label: relation label/name when present, otherwise target step name.
- Self-message: relation whose allocated source/target participant is the same.
- Steps with no incoming cross-participant relation may draw as small annotations on their
  lifeline; they do not invent a message.

### Scene additions

Extend `BoxData`:

```ts
lifeline?: {
  participant: Id;
  headerHeight: number;
};
```

Extend `LineData`:

```ts
points?: readonly Point[];
message?: {
  row: number;
  kind: "call" | "reply" | "async";
};
```

Add node type `lifeline`:

- One node per participant, ID `@life:<header-id>`.
- Node spans header plus full sequence height.
- Node component draws the participant's small card at top and a vertical dashed stem below.
- Only the header accepts pointer events; picking maps to the canonical participant block.

`sequence_scene(graph, grid): Scene | null`:

- Places lifeline nodes at fixed column x positions.
- Creates real-relation edges between lifeline node IDs with explicit horizontal `points`.
- Uses a three-leg loop for self-messages.
- Reuses existing wire heads/look; bypasses libavoid and `route` when `data.points` is present.
- Keeps real relation IDs so edge selection/tray context is meaningful.
- Uses the real grid's trail and layer ID.
- Offers display controls only.

### Renderer changes

- `packages/stage/src/nodes.tsx`: add `LifelineNode` and include lifeline fields in memo comparison.
- `packages/stage/src/Wire.tsx`: prefer `data.points` before libavoid/fallback routing.
- Stage CSS: participant header, dashed stem, read-only cursor behavior.
- `packages/views/src/svg.ts`: render the same lifeline stem and explicit message path.
- `packages/views/src/text.ts`: add a simple ordered message outline for tests/debugging; it is not
  the visual acceptance renderer.
- `faults(scene)`: explicit points must be finite; sequence message paths must be horizontal except
  self loops; endpoints must name lifeline nodes.

### Deferred sequence notation

Do not implement activation bars, combined fragments, durations, concurrency or conditions in the
first pass. Add them only after the two realistic scenarios demonstrate that graph order, cells,
relations and markdown cannot communicate the needed fact.


## Tests and release gate

### Generator/sample tests

Add [`test/showcase.test.ts`](../test/showcase.test.ts):

- Build the showcase in memory and compare canonical output byte-for-byte with the checked file.
- Open with `FLOOR`; require no door faults.
- Run `review`; strict showcase policy requires no notes.
- Assert required fixed IDs/layers and embedded entity-relation package.
- Assert every scenario header/body block has a valid cell and every participant header is a
  reference.
- Assert every markdown source applies without minting an unexpected definition.
- Project every standard layer and require no Scene faults.

Do not execute the generator as a side effect of Vitest. Export a pure `build_showcase()` and
compare its string result.

### Perspective tests

- `fields`: existing schema/instances behavior, class card pick mapping and instance edges.
- `class`: definitions, inheritance, associations, multiplicity.
- `swimlane`: lane allocation, phase order, relation preservation.
- `sequence`: lifeline order, monotonically increasing message rows, explicit paths, self-message.
- `project_perspective`: eligibility, target mapping, graph immutability, real trail/layer.
- Stage: lifeline node and explicit wire path render.
- SVG: perspective output contains the same participants/messages as Stage.

Avoid coordinate snapshots for ordinary layouts. Sequence tests may assert row monotonicity and
horizontal paths because those coordinates are the perspective's semantics.

### Manual walkthrough

At a fixed browser viewport:

1. Clear IndexedDB and start the app; bootstrap opens the showcase at Story in overhead view.
2. Open Story and Lab folders; verify folder views.
3. Open Platform; verify internal architecture and routing.
4. Open Order service; verify read-through.
5. Open Order Service definition; verify definition view.
6. Select a platform block and switch to profile.
7. Open Place order grid; verify participant and phase allocation.
8. Toggle fields on Sample orders.
9. After each new perspective lands, toggle class, swimlane and sequence and compare with the
   ordinary internal/grid source.
10. Walk the lab layers and verify existing cards, faces, routing, interfaces, holders and broken
    reference cases.

Record visual issues in [`docs/next-plan.md`](next-plan.md); do not encode fixes as sample-only
coordinates unless the layer is deliberately testing `free`.

### Commands

```sh
npm run showcase
npm run start -s -w @mnd/cli -- check ../../samples/workspace.showcase.json
npm test
npm run typecheck
npm run lint:css
npm run dev
```


## Implementation order

### 0 — Stabilize the current model — **done**

- Landed as next-plan step 12 (`44e1979`): traits replace and are a definition's, tags index,
  styles are settings, named faces (`card.face`), **a line's name is its own `name`**, base as
  definition files.
- The showcase is regenerated and checks clean; tests, typecheck and CSS lint pass.

Done when the current showcase checks clean, tests/typecheck/CSS pass, and the relation label shape
used by the generator is decided.

### 1 — Modular generator, no content changes

- Convert the generator to typed modules.
- Keep output byte-identical.
- Add the pure generator drift test.

Done when `npm run showcase` produces no diff.

### 2 — Story and lab workspace

- Add Story/Lab folders.
- Move existing lab layers without changing their contents/IDs.
- Add architecture definitions, canonical platform, context, domain, data and scenario grids.
- Update layer notes to current routing/view language.
- Switch the generated file to core's canonical `write` and review the one-time ordering diff.

Done when existing views communicate the architecture and the lab retains current coverage.

### 3 — Markdown card sources

- Add the five markdown files.
- Apply them through real card actions during generation.
- Exercise source provenance and large markdown faces.

Done when changing markdown and regenerating changes only the intended JSON body/value/source lines.

### 4 — YAML bootstrap

- Add core parser/types/tests.
- Add Vite asset bridge and web loading precedence.
- Initialize app display/start state without entering graph/log/export.

Done when a fresh browser opens the showcase as configured, existing storage wins, reset is empty,
and export is JSON.

### 5 — Existing-view acceptance

- Add catalog instructions and automated projection checks.
- Expose the existing fields diagram in the web app through the generalized perspective plumbing.
- Drive overhead, profile, internal, folder, grid, definition, read-through and fields.

Done when every existing view has one focused story case and one recorded acceptance statement.

### 6 — Class perspective

- Implement `PerspectiveKind`, projection framework and `class_graph`.
- Add options/Viewer/web wiring and tests.

Done when `story_domain` draws inheritance, attributes and associations without stored diagram
edges.

### 7 — Swimlane perspective

- Implement `swimlane_graph` over scenario grids.
- Add eligibility, target mapping, controls and tests.

Done when moving a step's grid cell changes its lane and both ordinary grid and swimlane remain
consistent.

### 8 — Sequence and lifelines

- Implement `sequence_scene`, Scene extensions, Stage/SVG rendering and tests.
- Use both realistic scenarios, including reply, async and failure paths.

Done when lifelines/messages are fully derived, picks resolve to real graph elements, and Stage/SVG
agree.

### 9 — Documentation, kit and later agent integration

- Update [`docs/design.md`](design.md), [`docs/definitions.md`](definitions.md),
  [`docs/spec.md`](spec.md), package docs and the walkthrough.
- Export perspective APIs through kit and update/pin mndmap.
- Only after the sample contract stabilizes, add these perspectives and bootstrap defaults to
  [`docs/cli-plan.md`](cli-plan.md) and the agent interface.


## Guardrails

- No second canonical workspace format.
- No YAML synchronization after bootstrap.
- No perspective-specific graph fields, positions, routes or duplicate components.
- No new base kinds for notation.
- No class association or instance-of relationship stored solely for drawing.
- No lifeline blocks or sequence numbers in the graph.
- No sample-only behavior in the web app; every new rule belongs in core or views and is reusable
  by kit/CLI.
- No weakening of Scene as the plain-data seam.
- No coordinate snapshots for layouts still being refined.
- Keep the visual lab synthetic and the architecture story believable; do not mix routing torture
  nodes into the domain story.
