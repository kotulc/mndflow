# Tasks

The difference between what [spec.md](spec.md) describes and what the code does, plus the
questions that have not been answered yet. Reasoning for any of it lives in
[design.md](design.md).


## Status

**Frozen, pending refinement.** Built and working; left alone while the graph model settles,
and revisited deliberately rather than drifting:

- **Terminal rail** — the contextual prompt and option chips. Its role in the tool is the open
  question, not its implementation.
- **Visual style and theme** — colour, type, spacing, and the overall look.

**Built last.** The context menu. Until then, right-click performs the default action in
spec.md's table.


## Open questions

**`domain` now names two different things.** It currently means the project's subject matter —
`software`, `writing`, `product` — which supplies vocabulary, starting relations and the
terminal's prompts. It is wanted for the **diagram type** instead: block, activity, flow.

- The UI has already moved. What a diagram calls its unit is a property of the diagram type, so
  the card chip, the type placeholder and the explorer's ＋ button all read `block` now, from one
  constant that becomes part of a module's declaration. `terms.node` no longer reaches the UI.
- What is left of the subject-matter concept is vocabulary and workflow prompts, both consumed
  only by the terminal — which is itself due to be reworked and renamed.
- So the rename waits for that rework rather than happening twice. **The word to avoid in the
  meantime is `domain`**, since it is about to change meaning.
- `template` is not available as the replacement: it is spoken for by reusable subtypes.
  `vocabulary` describes what actually remains of it.

**What the export format is.** The export *is* the step log, and a log records the making of a
thing rather than the thing. Anything wanting the graph instead — a SysML translation, a diagram
generator — needs a second format folded from it. This has to be settled before the sample
project below is worth authoring, because that file is the format's first real user.

**How much a `flow` relationship should be allowed to say.** A `flow` kind now decides which
sides its two ends take, from the layer's axis. Whether it should also imply a direction — so
that setting the kind sets `dir` — is open. Keeping them apart is the current answer and the
safer one, but it does mean a flow with no direction set draws no arrowhead, which reads oddly
for a thing whose whole claim is that something travels one way.

**What an attribute is made of.** The design says every attribute carries a name, a label and
tags. The code has `name`, `value` and `tags` — no label, and `value` is not mentioned in the
design at all. Two names for one field, or two fields, is the question; the answer decides what
the panel should show.

*Settled and built: what happens to a moved node's annotations and relationships, reference
chains, what a note is made of, and — the big one — that a relationship's **route** is derived
from the layer and never stored. The one thing an end may keep is the **wall** a right drag on
the frame named for it, which is an intent rather than a position and so never goes stale. Hand routing is gone; a port is a node only
where somebody promoted one; a layer's axis is both its flow direction and its layout
preference. See design.md under Relationships, Interfaces and Layouts.*


## Agreed, not built

The vision these serve is in [design.md](design.md) under *Where this is going*. Settled in
order: workspace over import, live references, bundling at export, `block` as the base module.

**The action surface, as data.** A module's actions are closures on `project` today, so nothing
can reason about them. Published as data — name, arguments, when each applies — they become the
seam the page hosts modules through and the terminal ranks against.

**This is the prerequisite for everything else here**, and the only item on this list that is
invisible from the outside. Neither the module system nor a reusable terminal is buildable until
it exists, so it goes first.

**Module-specific element subtypes.** A fixed engine, with each module defining what its own
elements are.

- Only the **block** diagram module writes the block tree. Every other module keeps a tree of its
  own for its own organisation, and *additionally* references blocks in a block project.
- **Settled: one new element type, `figure`** — placed and drawn, never in the tree or the
  explorer, with what it *is* coming from its `type` and its module drawing it. An activity's
  fork, decision, initial, final, merge and join are all figures.

  A value per notation was rejected: element types are written into logs, so each one is
  permanent the way a retired op is, and each would mean revisiting the 20 places that branch on
  `element`. One generic value serves every future module instead.
- **The criterion for the closed set:** an element type belongs in the engine only if the engine
  must reason about it beyond placing and drawing it. `block` (the tree), `proxy` (resolution and
  cleanup), `group` (bounds from members, membership cascade, layout unit), `note` (least size,
  ties, layout unit) — and `figure`, which the engine only places.
- A **swimlane is a group**, not a sixth type: a boundary round members, membership on the member.
  Its band shape and lane layout are the activity module's rendering.
- Still open: how a module registers renderers for its `type` values.

**Workspace, references and bundling.**

- Several projects loaded at once, each listed separately, in the order added, labelled
  `<project> [block]`. The selected row's project is the context.
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

**Clusters, and shapes for them.** Relationships should draw units loosely together, each cluster
laid out by its own topology and the layer's arrangement placing the clusters relative to each
other. Layout ranks units individually today, which flattens a ring into ranks and loses it.

Deferred rather than dropped: it is the largest piece by a distance, and the machinery it needs —
units holding a relative arrangement rather than offsets — is being built first for other
reasons. Start with **ring and chain only**. A detector that fires on something ambiguous and
lays five nodes out as a "ring" nobody sees is worse than no detector; hub and tree can follow
once the machinery has proved itself.


**Templates as subtypes.** Any element should be subtypable into a reusable template — a block
given a colour, an icon and some default attributes becomes a kind of block that can be made
again. The slot already exists: `type` is the per-element vocabulary word. What is missing is an
identity behind it, so a type is a thing that can be defined and reused rather than a free string.

**A template subtypes within an element type, never across it.** That is what keeps the two
apart: `element` stays closed and engine-level, deciding what draws a thing and what rules reach
it; `type` stays open and user-level, deciding how it looks and what it starts with. A template
that could change an element's type would collapse the distinction and make every rule
conditional on user data.


- **Attributes are listed but barely editable.** The panel shows a name and a value and can drop
  one; renaming an attribute goes through a drop-and-set pair, and tags still have no UI.


- **The project's metadata lives in two places.** Root is the project as a block and carries its
  name, body and attributes — but `domain` and `relations` still sit on `Graph`, beside
  `elements` and `edges`. Both are things the project says about itself, so root is their home:
  `domain` is a project-wide type and `relations` its vocabulary. Moving them costs a legacy fold
  for `set_domain` and the three relation ops.


- **Deleting the fold's legacy branches.** 15 retired ops, 150 lines — 23% of `fold.ts`, and the
  least-exercised code in the repo. Checkpointing means any project reaches the current schema by
  being opened and used, so dropping support for pre-checkpoint logs is now a safe decision
  rather than a lossy one. Worth taking after the next round of schema churn settles, not during
  it.


## Not built yet

- **Arrow keys move the terminal's highlighted option.** `Enter` confirms whichever option is
  highlighted, and the user can move the highlight while still typing. Nothing moves it today,
  so `Enter` always takes the top suggestion — which is the version of adaptive ranking worth
  avoiding, since the default is then invisible and changes under the user.

- **The sample project.** `samples/mndflow.json` does not exist, and the directory does not
  either. Its stated precondition — interfaces, references and groups — is now met, so it is
  unblocked and waiting on the export question above. It should describe this application —
  mndflow's own components, interfaces and data structures — exercise every feature in spec.md,
  and load from the viewer without setup.
- **`Ctrl`/`Cmd` + `A`** is in the keyboard table and is not implemented.
- **Icons.** An attribute is supposed to be able to draw an icon on the canvas as well as a
  boundary or a note. Nothing draws an icon, and no icon set has been chosen.
- **Adding a block to an existing group from the panel.** The panel removes members and cannot
  add one. The action exists (`joinGroup`) but is not wired to anything, so the only way into
  an existing group is the drag.
- **Tags.** Every attribute carries them and nothing shows or edits them.
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
- **A promoted seat cannot be un-promoted.** Right-clicking a seat makes it an interface; there
  is no gesture that gives it back. Deleting the interface is the nearest thing and takes the
  relationship's anchor with it.
- **The context menu**, still the last thing to build. Every entry above now performs its
  default action directly and correctly, so the menu is no longer covering for anything wrong —
  it is only the alternatives that are missing: direction and reversal for a relationship,
  ungroup for a group, paste for the canvas, delete throughout. Laying a layer out again is no
  longer among them — the arrangement buttons are that action.
- **A menu trigger.** With the right button spent entirely on direct creation, the context menu
  has no gesture left. The intended answer is that selecting an element reveals its options in
  the attribute panel, which would mean the panel is the menu and no gesture is needed at all.
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
