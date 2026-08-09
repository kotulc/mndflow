# Tasks

The difference between what [spec.md](spec.md) describes and what the code does, plus the
questions that have not been answered yet. Reasoning for any of it lives in
[design.md](design.md).


## Status

**The schema freeze, the test suite and the source reorganisation are built.** `src` is now
grouped by what a thing is for, and dependencies run one way — see README.md for the map.

**Frozen, pending refinement.** Built and working; left alone while the graph model settles,
and revisited deliberately rather than drifting:

- **Terminal rail** — the contextual prompt and option chips. Its role in the tool is the open
  question, not its implementation.
- **Visual style and theme** — colour, type, spacing, and the overall look.

**Built last.** The context menu. Until then, right-click performs the default action in
spec.md's table.


## Agreed order of work

Four, in this order. A schema cannot be frozen before there is a way to check data against it,
and cannot be scoped before the modules it must serve are known.

1. **A validator at the door** — *built*. `graph/check.ts`: one entry for every log, repairing
   what it can and reporting what it cannot.
2. **Simplify how data is loaded, saved and shown** — *built*. Browser dialogs are gone and every
   message — a repaired log, a refused name, the question before discarding — goes to the one
   strip. The header names the project and says where the work is kept.
3. **Freeze the base schema** — *built*. All nine changes landed together; what differed from
   the plan is recorded in *The freeze* below.
4. **A test suite** — *built*. 95 tests in about half a second, over the fold, the door, the file
   format, the geometry and one whole-lifecycle pass. See *The suite* below for what it covers and
   what it deliberately does not.

**What settled step 3**, each recorded in its own section below or in design.md:

| | |
|---|---|
| the module walk | five element forms, four relationship forms, five value forms — the closed sets held against every SysML notation |
| two graphs, many views | `structure` and `behavior`; everything else is a vocabulary, a renderer and a layout law |
| one definition record | element and relationship types are the same thing, differing in the form they subtype |
| the file is the graph | not the log — bounded size, and a diff that names what changed |
| the envelope's base | whatever cannot be safely ignored; the rest is `meta` |
| working as a team | one owner per file, merging out of scope, and the gaps that follow from it |


## The freeze: migrated

All nine landed together, in one pass. The shape is in [spec.md](spec.md) and the reasoning in
[design.md](design.md); what is recorded here is where the code ended up differing from the plan.

| Deviation | Why |
|---|---|
| **Definitions are `graph.defs`, not a field on root** | A vocabulary is a collection, like elements and relationships, where a name is a property. The file also wants definitions as a section rather than nested inside root's record |
| **`domain` became `graph.vocabulary`, not a definition** | It keys the terminal's words and prompts — it is not a subtype, so it could not fold into one. Renamed to the agreed word and left where the terminal can reach it, pending that rework |
| **A `type` naming no definition is minted into one** | The bridge from free text. Its id is derived from the name, because minting runs on every fold and a random id would never settle |
| **Nothing at its default is written to a file** | Not planned, and it is what makes the format readable — no nulls, no empty lists, no colour every card already has |

**Op names now**: `set_form`, `set_field`, `drop_field`, `set_def`, `drop_def`, `set_vocabulary`.
**Still folded, never written**: `set_kind`, `set_attr`, `drop_attr`, `set_domain`,
`add_relation`, `rename_relation`, `drop_relation` — beside the fifteen already retired.

**A pre-freeze log still opens.** `check.ts` heals `element` to `form`, `kind` to `form`, and
`attrs` to text `fields`, inside a checkpoint's whole graph as well as in a single mutation, and
reports what it did in the strip.

**A cross-project target is `{ project, element }`**, both by id. Always live: to fix a version,
bundle. A `ref` field widens the same way, which is additive and can wait for the workspace.

**Merging two divergent logs is out of scope.** Git's line merge or nothing; `check.ts` reports
the wreckage of a bad one rather than preventing it.

**Not yet exercised in a browser.** The migration was verified by typecheck, build, and a headless
harness covering the fold, the round trip, byte-stability of a re-export, and a pre-freeze log.
Clicking through the canvas is the check still owed.


## The suite

**One test file per module, beside the module**, so moving a module moves its test. That paid for
itself immediately: the source reorganisation moved every file and not one test path needed
touching. The one integration test sits apart in `tests/`, since it belongs to no single module.

| | Holds it to |
|---|---|
| `types` | an id says what it points at; a factory leaves nothing undefined |
| `fold` | replay is a pure function of the log; a reverted step leaves no trace; a mutation with nowhere to land is skipped; `tidy` removes only what cannot exist; a free-text type becomes a definition with a stable id |
| `check` | every old shape still arrives as the current one, inside a checkpoint as well as a mutation; what cannot be read is dropped and counted |
| `file` | a round trip loses nothing; the same graph always writes the same bytes; nothing at its default is written; the schema gate lets a minor through and stops a major |
| `layout` | placement repeats; nothing overlaps; a hand-laid position cannot be moved by anything else on the layer; a seat lands on the lattice |
| `route` | a line starts and ends on its cards, turns only at right angles, and goes around a block it does not attach to |
| `lifecycle` | work → save → open → work again, and a pre-freeze log opening and saving out current |

**Nothing asserts a coordinate, an id, a message or a count that tuning would change.** The suite
is about properties, because the values are still moving.

**Deliberately untested:** the terminal — `router`, `turn`, `workflows` — which is frozen pending a
rework, so a suite over it would be rewritten with it; `embed`, `match` and `suggest`, which need a
model and would cost more than the suite is worth; and `project`, a React hook whose actions are
thin wrappers over the mutations `fold` already covers. Each is a judgement to revisit, not an
oversight.

**Two bugs it caught on the way in**, both invisible to the compiler: the step count double-counted
the checkpoint step, and a `set_field` mutation copied its own `op` and `id` into the field.


## To go through next

Two things parked deliberately, each wanting its own pass rather than a line in
a table.

**What `domain` actually meant, and what replaces it.** It became `graph.vocabulary` in the
migration — a rename that keeps the terminal working without deciding anything. What it *is* was
never settled: it currently keys a set of words, a set of starting relations, and a set of workflow
prompts, which are three concerns under one key. Now that a project's relations are definitions,
the "starting relations" half is arguably just a definition set somebody could ship — which would
leave only the prompts, and those belong to the terminal that is due to be reworked and renamed.
Worth taking apart before the terminal is touched, not after.

**What a file looks like now.** The format is built and round-trips, but only two people have read
one. Worth reading a real project's export line by line and asking what a reviewer would want:
whether the nesting reads at depth, whether relationship records want the names of their ends
beside the ids, whether `meta` should carry anything else, and whether a hand-authored file — the
sample project — is actually pleasant to write. That last is the real test, and it is now
unblocked.


## Working as a team: what it needs

Walked as a team would hit it — clone a repo of project files, import, work, export, commit.
**A project file is a single-owner asset**, like a `.psd`; merging is out of scope and recorded as
such in design.md. What is missing beyond that:

- **The browser working copy is invisible to the file on disk.** Pull, forget to re-import, keep
  editing a stale session, export over somebody's work — nothing can currently notice. **The
  intended fix is the File System Access API**: hold a live handle and say so when the file
  changes underneath. One integration, and the whole class of problem goes.
- **The suggested filename should follow the project's name**, so a file called
  `pump-assembly.json` cannot hold a project called `pumps`.
- **Shared definitions.** A house vocabulary — the relationship types, stereotypes and field
  declarations everybody uses — is re-declared per project today and drifts. A definition
  reference widens to `{ project, def }` exactly as a proxy target does, so the shared vocabulary
  is one project the others reference. Anticipated, not built, and not freeze-blocking.
- **Reviewing a model change as JSON is poor**, even nested and sorted. Committing a rendered SVG
  beside the source makes a pull request readable. Costs an export path and nothing structural.
- **The version does not compose.** Eight project files carry eight versions and there is no
  aggregate; the repo's version is the git commit. Documented so no release process is built on
  the field.


## The module walk: what is still open

What it **settled** is in [definitions.md](definitions.md) under *The SysML map* and *What the
module walk settled* — the closed sets held against every notation, which is what unblocks the
migration. What it left open:

- **How a module registers renderers** for its `type` values.
- **Whether `structure` and `behavior` are what `module` names**, or a layer above it. The base
  should eventually carry which graph a project is, with the preferred view dropping to `meta`.
- **Deliberately dropped, not open:** trace assertions as inline fragment notation — the claim
  survives as a typed group — and lifeline left-to-right order, which belongs to the view.

None of it blocks the migration, since `module` is an open string.


## Open questions

**What is left of `domain` needs a name.** The diagram-type meaning is settled: it is the
**module**, it lives in the envelope, and it never enters the log. What remains of the old
subject-matter concept — vocabulary and workflow prompts — is consumed only by the terminal, which
is itself due to be reworked and renamed, so the rename waits for that rather than happening
twice. `vocabulary` describes what remains; `template` is not available, being spoken for by
definitions.

**How much a `flow` relationship should be allowed to say.** A `flow` form now decides which
sides its two ends take, from the layer's axis. Whether it should also imply a direction — so
that setting the form sets `dir` — is open. Keeping them apart is the current answer and the
safer one, but it does mean a flow with no direction set draws no arrowhead, which reads oddly
for a thing whose whole claim is that something travels one way.

*Settled, not built: the freeze above — the envelope, `form`, `figure`, fields, definitions on
root, and the file format. See the table.*

*Settled and built: what happens to a moved node's annotations and relationships, reference
chains, what a note is made of, and — the big one — that a relationship's **route** is derived
from the layer and never stored. The one thing an end may keep is the **wall** a right drag on the
frame named for it, an intent rather than a position, so it never goes stale. Hand routing is
gone; a port is a node only where somebody promoted one; a layer's axis is both its flow
direction and its layout preference. See design.md under Relationships, Interfaces and Layouts.*


## Agreed, not built

The vision these serve is in [design.md](design.md) under *Where this is going*. Settled in
order: workspace over import, live references, bundling at export, `block` as the base module,
and actions as data returning mutations.

**The action surface, as data.** A module's actions are closures on `project` today, so nothing
can reason about them. Published as data — name, arguments, when each applies — they become the
seam the page hosts modules through and the terminal ranks against.

**This is the prerequisite for everything else here**, and the only item on this list that is
invisible from the outside. Neither the module system nor a reusable terminal is buildable until
it exists, so it goes first.

**Module-specific vocabularies.** A fixed engine, with each module defining what its own things
are — see *The module walk* above for what this now means in full.

- Only the **structure** graph writes the block tree. A behavior project keeps a tree of its own
  for its own organisation, and *additionally* references blocks in a structure project.
- **The criterion for the closed set:** a form belongs in the engine if the engine must reason
  about it beyond placing it — `block` (the tree), `proxy` (resolution and cleanup), `group`
  (bounds from members, membership cascade, layout unit), `note` (least size, ties, layout unit) —
  **or if the engine must know not to draw it**, which is `figure` alone.

**Workspace, references and bundling.**

- Several projects loaded at once, each listed separately, in the order added, labelled
  `<project> [block]` — name and module, and nothing more. **The id, step count and computed hash
  live in the row's tooltip**, so the list stays scannable and none of it competes with the name.
  The selected row's project is the context.
- **A cross-project reference is a widened `proxy`**, whose target becomes a `(project, element)`
  pair. No new concept. Projects never merge, so no ids collide and nothing is renumbered.
- **A proxy must tolerate a missing target and never record the absence** — it draws as missing
  and the reference survives, so undo in the other project restores it. Recording the cleanup
  would stop one module's undo reaching across. **This changes today's behaviour**: `tidy`
  currently deletes an orphaned proxy outright.
- Only deletion is breaking, and only breaking changes are reported.
- An export bundles the external blocks it depends on. Nothing is bundled inside a workspace.
- Dead references accumulate, since nothing removes them automatically. Wants an explicit
  "clear missing references" action rather than a default.
- The workspace itself needs its own storage, separate from every project.

- **Which way a layer reads should decide how a line is drawn.** It currently picks the sides a
  `flow` relationship attaches to and nothing more. It should also bias the route — a flow on an
  `across` layer running left to right rather than doubling back — which is the whole reason the
  setting is worth having separately from an arrangement.

- **Notes as units.** A note should be laid out like any other object rather than merely avoided,
  with its ties drawn as fixed associations in the style a reference's line uses. Its position is
  currently patched up after the fact by the arrangement.
- **The cluster spacing tier**, which needs clusters.



## Backlog

**A live store, for real multi-user work.** Files plus git give one-owner-at-a-time, which is
honest but is not collaboration. Genuine concurrent editing wants a shared store and presence, not
a merge algorithm over exported JSON — a different product decision, recorded here so that the
file format is never bent toward pretending to solve it. Team management — who owns what, who may
change it — belongs with it rather than in the file.


**Clusters, and shapes for them.** Relationships should draw units loosely together, each cluster
laid out by its own topology and the layer's arrangement placing the clusters relative to each
other. Layout ranks units individually today, which flattens a ring into ranks and loses it.

Deferred rather than dropped: it is the largest piece by a distance, and the machinery it needs —
units holding a relative arrangement rather than offsets — is being built first for other
reasons. Start with **ring and chain only**. A detector that fires on something ambiguous and
lays five nodes out as a "ring" nobody sees is worse than no detector; hub and tree can follow
once the machinery has proved itself.


**Editing definitions.** The freeze gives a project definitions; nothing yet makes or edits one.
Needs a place to declare a type's fields, defaults and presentation — probably the contents tray,
since it is already the table of what a project contains.

- **Fields are listed but barely editable.** The panel shows a name and a value and can drop one;
  renaming goes through a drop-and-set pair, and tags still have no UI. A typed field needs a
  control per form — a number with a unit, a choice with its list, a ref with a target picker.


- **Deleting the fold's legacy branches.** 15 retired ops, 150 lines — 23% of `fold.ts`, and the
  least-exercised code in the repo. Checkpointing means any project reaches the current schema by
  being opened and used, so dropping support for pre-checkpoint logs is now a safe decision
  rather than a lossy one. Worth taking after the next round of schema churn settles, not during
  it.


- **Graph accessors are full scans.** `childrenOf`, `blocksOf` and `portsOf` each walk every
  element, and they are called from inside loops — `drawnIn` and the contents rows are both
  quadratic because of it. Not felt yet at the sizes in use; it is the same shape as the routing
  cost that makes a window resize on a busy layer take fifteen seconds, and worth an index built
  once per fold rather than a scan per call.


## Not built yet

- **Arrow keys move the terminal's highlighted option.** `Enter` confirms whichever option is
  highlighted, and the user can move the highlight while still typing. Nothing moves it today,
  so `Enter` always takes the top suggestion — which is the version of adaptive ranking worth
  avoiding, since the default is then invisible and changes under the user.

- **The sample project.** `samples/mndflow.json` does not exist, and the directory does not
  either. Both preconditions are now met — interfaces, references and groups are built, and the
  export format is settled — and a graph-shaped export is the thing that makes the file writable
  by hand at all. It should describe this application —
  mndflow's own components, interfaces and data structures — exercise every feature in spec.md,
  and load from the viewer without setup.
- **`Ctrl`/`Cmd` + `A`** is in the keyboard table and is not implemented.
- **Icons.** A definition is supposed to be able to draw an icon on the canvas as well as a
  boundary or a note. Nothing draws an icon, and no icon set has been chosen.
- **Adding a block to an existing group from the panel.** The panel removes members and cannot
  add one. The action exists (`joinGroup`) but is not wired to anything, so the only way into
  an existing group is the drag.
- **Tags.** Every field carries them and nothing shows or edits them.
- **Ties made from the note's side.** A note is its own name all the way through, so a right
  drag cannot set off from one — ties are drawn node-to-note only. The same is now true of an
  explorer row. Fine so far; if either reads backwards in use, it needs some part that is not its
  text to start from, and that is exactly the tiny target the card's border zone was removed for.
- **Emptying a note leaves it reading `note`.** Creating one requires text, but clearing the text
  afterwards is ignored the way an empty rename is, so a note can still end up blank. Cheaper
  than a delete-on-empty rule; revisit if blank notes accumulate.
- **A note picking up what the drag enclosed.** The rectangle now sets the note's least size, and
  could *also* tie it to everything inside. Deliberately not done: that would make one gesture
  mean two things, and it already means two. Worth revisiting only if tying notes one at a time
  proves tedious.
- **The context menu**, still the last thing to build. Every entry above now performs its
  default action directly and correctly, so the menu is no longer covering for anything wrong —
  it is only the alternatives that are missing: direction and reversal for a relationship,
  ungroup for a group, paste for the canvas, delete throughout. Laying a layer out again is no
  longer among them — the arrangement buttons are that action.
- **A menu trigger.** With the right button spent entirely on direct creation, the context menu
  has no gesture left. The intended answer is that selecting an element reveals its options in
  the contents tray, which would mean the table is the menu and no gesture is needed at all.
  Not designed yet.


## Aspirations, not descriptions

**The layout acceptance criterion.** It says: for thirty nodes, no overlap, no relationship
through a block it does not attach to, crossings visibly fewer than straight routing. The
barycentre sweep aims at the last of those and nothing measures any of them. It also predates
clusters, so it says nothing about the property that now matters most — that a shape somebody
would recognise, a ring or a chain, comes out looking like itself. Due a rewrite once the
cluster model is settled.

**Fluid transitions between layers.** Stepping in and out animates the viewport, but the
contents of the two layers cut. The nesting-doll effect the canvas is meant to give is not what
is drawn.

**Relationships vanished when the contents tray opened** — *fixed*. The tray reshapes the frame,
and `route` treated staying inside it as a hard requirement: where a short frame left no way round
a card sitting between the two ends, the search returned nothing and the canvas dropped the line
outright. The frame is a rule about tidiness, so it is now given up rather than the relationship —
the search runs again unbounded before failing. A line clipping outside its frame is a much smaller
wrong than one that is missing. Covered by a test in `geometry/route.test.ts`.


**Segments under a card.** Cards are drawn above the relationship layer, so a segment passing
beneath one cannot be grabbed there. Reachable everywhere else; no decision taken on whether
lines should sit above cards for the purpose.

**The frame drifts off the grid when the window is resized.** `frameBox` is snapped, but it is
derived from the panel's aspect ratio, so a resize moves it — and the interfaces seated on it
with it. Cards are unaffected. Fixing it means a frame that does not fit the panel, which is
worse; it is recorded because it is the one place seats do not hold, not because it is a bug
with a known fix.

**Route corners are still free.** Every seat is on the lattice now, but the corners between them
are wherever the path found them, and lane offsets are half a cell from there. Snapping corners
to 24 would throw them past the 2.5-unit tolerance that decides whether a line counts as
straight, and every straight line would bend. Recorded as the one thing on the canvas not on the
grid, not as a bug with a known fix.

**Resizing the window on a busy layer freezes it.** Measured: a layer of 80 blocks and 79
relationships blocks the main thread for **15 seconds** in a single task on a window resize. The
frame's shape is derived from the panel, so any change to the panel re-derives the frame, which
re-routes every relationship in the layer.

Opening the contents tray used to do the same thing — 9.6 s at 80 blocks — because it shrinks the
drawing area. That is fixed: the frame's shape now comes from the whole canvas column and only
the *camera* answers to the visible half, so a tray toggle reshapes nothing (78 ms). A window
resize genuinely does change the column, so it still pays the full cost.

The fix is the router cost below, not another split. Until then, a resize is the one gesture that
can lock a busy layer.

**The router runs on every render, and is not cheap.** Deriving routes means re-planning every
line on the layer whenever the arrangement changes. Measured at roughly 180 ms for twenty cards
and twenty-five relationships before this work; the plan is now computed once per layer rather
than once per edge per render, which helps, but nothing has been measured since and the thirty
node target in design.md has not been checked.

**Nothing here has tests.** The routing and layout code is pure geometry with no UI in it —
`place`, `route`, `lanes` — which makes it the obvious place for a suite, and the interfaces
have now stopped moving. There is no test file in the repo at all.

**The selection box takes things it does not enclose.** Dragging a box across the canvas can
come back holding elements outside it, and the reported case involves dragging over
relationships. Not diagnosed. The leading suspect is the invisible grab band over every
relationship segment, which is wide and might be catching the drag — but that would explain a
box that fails to start, not one that over-selects, so the cause is still open.
