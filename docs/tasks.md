# Tasks

The difference between what [spec.md](spec.md) describes and what the code does, plus the
questions that have not been answered yet. Reasoning for any of it lives in
[design.md](design.md); the queue of work itself is [plan.md](plan.md).

Organised so that work can run in parallel. **Phase 0** cuts six seams; **Phase 1** is eight
streams, one owner each. A stream names the files it owns, so two owners never edit one file.


## Status

Built and stable: the validator, the one message strip, the schema and a 153-test suite.
`src` is grouped by what a thing is for and dependencies run one way — see
[README.md](../README.md) for the map.

**Frozen, pending refinement.** Left alone deliberately while the graph model settles: the
**terminal rail** (its role is the open question, not its implementation) and the **visual style**.

**One known dependency violation**, left visible: `project.ts` imports the terminal. Seam S1
is what fixes it.

**Exercised in a browser**, and every seam is exercised there before it is called done — see
`.claude/skills/run/SKILL.md` for how. A fresh session, a pre-freeze log, the canvas gestures,
import and export all check out: the round trip is byte-identical and a pre-freeze log draws,
repairs and saves out current. What it turned up has been fixed.

**The schema is no longer frozen.** It is changed as the design requires, and a file still opens
through `check.ts` whatever it was written by.


## Open questions

*Kept at the front. Everything here blocks something in [plan.md](plan.md).*

*Nothing is blocking.*

*Recently closed: extension is subtyping and never overriding, one parent, with rules reaching
every subtype; component configuration lives in one `components` bag keyed by component; undo
restores the graph and never the context; storage is keyed per project and
lazily, with the untouched checkpointed under pressure; packages are a list in import order and
never shadow, since references are by id; a package resists editing until unlocked or forked; a
proxy owns its appearance and the block owns the thing; a project opened alone is read in
isolation.*


## Phase 0: the seams

Five files absorb almost every planned feature, so almost every feature waits on another. Cutting
these is what turns three concurrent streams into eight. **S1, S2, S3, S4, S5 and A0 touch disjoint
files and run in parallel** — S5 waits on S2's contract and A0 on nothing.

| | Lines | Absorbs |
|---|---|---|
| `canvas/Canvas.tsx` | 1314 | every renderer. **The gestures are out** — `canvas/gestures.ts`, S2.1 |
| `project.ts` | 776 | one `act` literal — every feature adds an action to it |
| `graph/fold.ts` | 872 | one `apply()` switch — every new op |
| `geometry/layout.ts` | 915 | clusters, notes-as-units and axis bias all land here |
| `graph/types.ts` | 440 | every schema change — append-only, so tolerable as it is |

### S1 — the action registry

The shape is specced in [spec.md](spec.md) under *Action surface*, the reasoning in design.md under
*The action surface is the input seam*. `project.ts` splits into `actions/*.ts` grouped by subject
— elements, edges, groups, notes, fields, definitions, layout — and keeps only state and dispatch.

- **Gestures are not on the descriptor.** A view owns its gesture map and binds a gesture to an
  action name, so S1 and S2 stay disjoint and two views can bind one action differently.
- **Every action is enumerated in [actions.md](actions.md)** — name, scope, arguments, the
  mutations it writes, and which of today's closures it replaces. Build against that table, not
  against `project.ts`.
- **Collapse the duplicates as part of the extraction**, so nothing later is written against a
  surface that then changes. 52 entries in `act` become **29 actions**, 4 adjustments, 5 page
  actions and 5 queries that leave the surface entirely.
- **`check` is required wherever an action can refuse**, and the refusal reaches the strip. Today
  `nameFree(...) && commit(...)` returns false silently — a class of invisible no-op.
- **The `act.foo(...)` methods stay, generated from the registry**, so no call site in `page/` or
  `canvas/` changes beyond the collapsed pairs.

Unlocks E and the tray menu in G; prerequisite for the terminal.

### S2 — the component surface

An **open module publishes components**, and a definition configures them under its `components`
key — specced in [spec.md](spec.md) under *Project model*. `Canvas.tsx` splits three ways: gesture
handling — *done* — composition, and `modules/`.

- **Each component validates its own key and reads no other's**, registering its validator with the
  door so an unrecognised key is unvalidated rather than wrong — *done*, and `card` is the first
  published, refused at the door in its own words.
- **The plain card is the claim in miniature.** `PLAIN` says today's card as a configuration and
  nothing reads it yet; S2.6 is where the canvas draws from it, and where whatever will not go into
  a component is the answer about the boundaries.
- **The test this seam is measured against**: if the base diagram cannot be expressed as one
  configuration among others, the component boundaries are in the wrong place.
- **Every gesture the canvas binds today is inventoried in [actions.md](actions.md)**, which is
  what the first gesture map is written from.
- **The gestures are one hook, not yet a map.** `useGestures` takes what it may reach and what the
  layer worked out, and returns the handlers plus the state a half-finished gesture is in. Every
  binding is still written into it; S2.7 is what turns them into a declared map.

Unlocks A and S5, and the context menu in G.

### S5 — constraints and rules

Two components, and the first rules the engine applies rather than infers. `required` bounds a
thing in itself; `ends`, `holds`, `degree` and `match` govern how things interact. **They advise
while modelling and refuse only at translation**, and a rule the five cannot say is a module's
`validate` hook in code — never a language.

### A0 — assets

`assets/packages/` for data, `assets/modules/` for code, `assets/styles/` for stylesheets.
Build-time, so extending means editing the repo and rebuilding. **The base ships as a package**,
which is the test of whether the package idea is strong enough — and it is where the relation seeds
now living in `workflows/*.yaml` belong.

### S3 — fold hygiene

Touches only `fold.ts`, so it runs alongside S1 and S2.

- **Delete the retired ops** — *done*. All 22, not the 15 counted: seven were living in the current
  switch rather than the legacy one. `fold.ts` fell 872 → 680 lines, and `types.ts` lost the
  `Legacy` union. **`relax_layer` and `size_element` were not among them** — current ops that
  nothing emits yet, and G wires both.
- **Split `apply()` by family** — element, edge, group, field, definition — so two owners adding
  ops do not edit one switch.
- **Index once per fold.** `childrenOf`, `blocksOf` and `portsOf` are full scans called from inside
  loops, which makes `drawnIn` and the contents rows quadratic.

### S4 — the workspace

**Promoted out of the streams.** A view is a project of proxies, and it needs the projects it
points at to be open — so matrices, requirements views and every behavior model depend on this
existing. It is a seam, not a feature. Vocabulary in [design.md](design.md) under *The words*.

- Several projects loaded at once, each with its own log and its own export; a **workspace export
  gathers them** and is the everyday one. A single project can still be opened, shared or imported
  alone, without the views that lean on it.
- **A proxy's target widens to `{ project, element }`**, and a definition ref the same way. **An
  edge's ends stay plain ids** — widening those would reach `fold`, `layout`, `route` and the
  canvas, and nothing needs it.
- **A proxy tolerates a missing target and never records the absence** — `tidy` stops deleting
  orphans, so undoing a deletion in one project brings the reference back in another.
- **A change is recorded where its element lives.** Filling in a matrix cell writes to the project
  that owns both ends. Ownership routes it, and nothing branches or merges.
- **A relationship across two projects is a proxy plus an ordinary edge**, both in the project of
  the end making the claim. No relationship ever spans two logs.
- **The workspace is itself a project**, and needs no new schema to be one: its elements are
  proxies of other projects' **roots**, and folders are ordinary blocks. Filing is undoable, and it
  draws as a block diagram with dependencies derived from who holds proxies into whom.
- **Guard against a workspace proxying itself.**
- `useProject(projectId)` — parameterise the hook; the page picks which project is in context.
- Projects listed in the tree they were filed into; id, step count and hash in the row's tooltip.
  The selected row's project is the context.
- **Only deletion is breaking, and only breaking changes are reported.** Dead references
  accumulate; wants an explicit *clear missing references* action rather than a default.
- **An export of one graph bundles the external blocks it depends on**, so it stands alone.
  Nothing is bundled inside a workspace.
- **The workspace needs its own storage**, separate from every graph.
- **Shared definitions.** A house vocabulary is re-declared per project today and drifts. A
  definition ref widens the same way a proxy target does, so the shared vocabulary is one graph
  the others reference — which is what a **package** is.


## Phase 1: the streams

| | Owns | Waits on |
|---|---|---|
| **A** Views and packages | `modules/view/`, `assets/packages/` | S2, S4 |
| **C** Geometry | `geometry/` | S3 (perf only) |
| **D** Vocabulary | `terminal/workflows.ts`, `graph.vocabulary` | — |
| **E** Definitions and fields | `page/Contents.tsx`, `page/Relations.tsx` | S1 |
| **F** Durability and files | `graph/store.ts`, `page/Files.tsx` | S4 for the workspace export |
| **G** Canvas polish | `canvas/`, `page/Panel.tsx` | S2 for the menu only |
| **H** Sample project | `samples/` | — |
| **Z** Terminal | `terminal/` | **everything above**, H especially |

**Startable today, before any seam:** D, F, H, and G's relationship filter.

**The terminal goes last, deliberately.** It ranks and completes whatever the surface offers, so
building it against a surface still moving means building it twice. It is also the one stream whose
value depends on the rest being mature — which makes it the acceptance test for all of them.

**S4 and F both reach `store.ts`.** S4's first commit should split graph storage from workspace
storage, after which they are disjoint.

### A — views and packages

All five notations were walked against the engine and **none adds an action or a form.** Most turn
out not to need code at all — see design.md under *Packages and modules*.

| | Costs |
|---|---|
| requirements | a package. No code |
| parametrics | a package, once a constraint can draw from a size and a style |
| flow | a package of `directed` subtypes |
| activity | a package, **plus** one engine capability: a shape drawn inside a card |
| state machine | a package over activity's shape |
| sequence | a package, **plus** one engine capability: the lifeline arrangement |
| UML, SysML v2, UAF | packages — tables of definitions, names and mappings |

**Only `table` and `matrix` are new view modules.** Everything else is configuration, and the two
engine capabilities above are single components rather than folders of their own. That is the
whole claim the component model makes, and the first package is what tests it.

- **A project owns its own tree.** One using the behavior package owns its actions and holds
  proxies of the participants; it never writes into the project those participants live in except
  through the ownership rule in S4.
- **A diagram binds gestures to actions**; the graph still holds all the state.
- **A lifeline is a block's behavioral edge, and an occurrence on it is an interface** — so a
  message is a relationship between two interfaces, and order down a lifeline is `at` along an
  edge. Sequence needs an arrangement, not a layout law of its own.
- **A swimlane is a block whose children belong to it** — not a group, which cannot be empty.

### C — geometry

Internally serial — clusters, notes and axis bias all rewrite `place` — and parallel to everything
else.

- **Clusters, and shapes for them.** Relationships should draw units loosely together, each cluster
  laid out by its own topology. Layout ranks units individually today, which flattens a ring into
  ranks and loses it. **Start with ring and chain only**: a detector that lays five nodes out as a
  "ring" nobody sees is worse than no detector.
- **Notes as units** — laid out like any other object rather than avoided, ties drawn as fixed
  associations. Their position is patched up after the fact today.
- **The layer's axis should bias the route**, not merely pick the sides a `flow` attaches to — a
  flow on an `across` layer running left to right rather than doubling back. That is the whole
  reason the setting is worth having separately from an arrangement.
- **The cluster spacing tier**, which needs clusters.
- **Performance.** A window resize on a layer of 80 blocks blocks the main thread for **15
  seconds**: the frame derives from the panel, so any panel change re-routes every relationship.
  The tray toggle used to cost 9.6s and no longer reshapes anything (78ms). The fix is the router
  cost, not another split. Routing measured ~180ms for twenty cards before the per-layer plan;
  nothing has been measured since, and design.md's thirty-node target is unchecked.
- **The acceptance criterion is an aspiration.** Nothing measures overlap, crossings or lines
  through unattached blocks, and it predates clusters — so it says nothing about the property that
  now matters most, that a recognisable shape comes out looking like itself. Due a rewrite once the
  cluster model settles.
- **Two known limits, not bugs with known fixes.** The frame drifts off the grid on a window
  resize, since it derives from the panel's aspect ratio, taking its seated interfaces with it;
  fixing it means a frame that does not fit the panel, which is worse. And route corners are free —
  snapping them to 24 would throw them past the 2.5-unit straightness tolerance and bend every
  straight line.

### D — vocabulary

Split out of the terminal because a module needs it and the terminal does not gate it.

- **Take `domain` apart.** It became `graph.vocabulary` in the migration — a rename that decided
  nothing. It currently keys three concerns: a set of words, a set of starting relations, and a set
  of workflow prompts. Now that a project's relations are definitions, the starting-relations half
  is a definition set somebody could ship, which leaves the words and the prompts.
- **The words are what a module needs** — what this notation calls a block, a group, a
  relationship. Stream A cannot declare a module vocabulary until they are separable from the
  prompts.
- **The prompts belong to Z**, and so does the rename, so it happens once. `vocabulary` describes
  what remains; `template` is spoken for by definitions.
- **Keep `terms` and one opening hint per domain**; the rest of each YAML serves a question loop
  that only Z's expanded half still needs. Do not invest in the prompt sets.

### E — definitions and fields

- **Editing definitions.** The freeze gives a project definitions; nothing makes or edits one.
  Needs a place to declare a type's fields, defaults and presentation — probably the contents tray,
  which is already the table of what a project contains.
- **Fields are listed but barely editable.** Renaming goes through a drop-and-set pair, and a typed
  field wants a control per form — a number with a unit, a choice with its list, a ref with a
  target picker.
- **Tags.** Every field carries them; nothing shows or edits them.
- **Icons.** A definition should be able to draw one as well as a boundary or a note. Nothing draws
  an icon and no set has been chosen. Needs a renderer from S2.
- **Packages** — the two notations that turned out to be data rather than views. **Requirements
  first**: it needs nothing but definitions, so it is the honest test of whether they work.
  Parametrics follows once a constraint can draw from `size` and a colour.
- **Authoring a package** wants somewhere to put a plain name, a formal name and a mapping, which
  is the same place a definition's fields and presentation are edited.

### F — durability and files

- **The browser working copy is invisible to the file on disk.** Pull, forget to re-import, keep
  editing a stale session, export over somebody's work — nothing can notice. **The fix is the File
  System Access API**: hold a live handle and say so when the file changes underneath. One
  integration, and the whole class of problem goes.
- **Reviewing a model change as JSON is poor.** Committing a rendered SVG beside the source makes a
  pull request readable. Costs an export path and nothing structural.

### G — canvas polish

- **The context menu**, still the last thing to build. Every entry now performs its default action
  directly and correctly, so the menu covers for nothing wrong — only the alternatives are missing:
  direction and reversal for a relationship, ungroup, paste, delete throughout.
- **A menu trigger.** The right button is spent entirely on direct creation, so the menu has no
  gesture left. The intended answer is that selecting an element reveals its options in the
  contents tray — the table is the menu and no gesture is needed. Not designed yet.
- **The selection box takes things it does not enclose.** Not diagnosed. The leading suspect is the
  invisible grab band over relationship segments, but that would explain a box that fails to start,
  not one that over-selects, so the cause is open.
- **Filter relationships by type on the canvas** — show only `satisfy`. A display preference, no
  new concept, and the cheap read on how much of the clutter problem a different view would need to
  solve. **Do this before any matrix.**
- **`Ctrl`/`Cmd` + `A`** is in the keyboard table and is not implemented.
- **Three actions have no way in.** `relax_layer` and `size_element` are in the schema and in
  `fold` and nothing emits either — a layer cannot be handed back to automatic placement, and a
  note cannot be resized after it is made. `dissolve` has no op missing, only a path. All three are
  rows in [actions.md](actions.md) with nothing to replace.
- **`relax` first among them.** It is the thing somebody most wants to type after naming ten
  things — the engine takes the layer back — so it is worth having before Z rather than after.
- **Adding a block to an existing group from the panel.** `joinGroup` exists and is wired to
  nothing, so the only way into an existing group is the drag.
- **Fluid transitions between layers.** The viewport animates; the contents of the two layers cut,
  so the nesting-doll effect is not what is drawn.
- **Segments under a card** cannot be grabbed there — cards draw above the relationship layer. No
  decision taken on whether lines should sit above cards for the purpose.
- **Ties made from the note's side.** A note is its own name all the way through, so ties are drawn
  node-to-note only. Fine so far; if it reads backwards in use it needs some part that is not its
  text to start from.
- **Emptying a note leaves it reading `note`.** Clearing the text is ignored the way an empty
  rename is. Cheaper than a delete-on-empty rule; revisit if blank notes accumulate.

### H — sample project

- **`samples/mndflow.json` does not exist**, nor the directory. Both preconditions are now met —
  interfaces, references and groups are built, the export format is settled. It should describe
  this application, exercise every feature in spec.md, and load from the viewer without setup.
- **Z's tutorial is walked over a sample**, so this stream decides what a first project looks like
  as well as proving the format. Worth one sample per module eventually, not just this one.
- **Read a real export line by line.** The format round-trips but only two people have read one.
  Ask what a reviewer would want: whether the nesting reads at depth, whether relationship records
  want the names of their ends beside the ids, whether `meta` should carry anything else. **Whether
  a hand-authored file is pleasant to write is the real test**, and it is now unblocked.

### Z — terminal

*Last, and the acceptance test for everything above.* Frozen until then, so it is not touched by
any other stream. What it is for is settled — see design.md under *The terminal*; what remains is
building it.

- **Two functions, split by whether it is open.** Collapsed is the app's primary text entry point
  and asks nothing. Expanded is guidance: the next question worth answering, nudges, documentation
  for whatever is in front of you, and a tutorial over a sample project.
- **The guided half needs H.** A live onboarding tutorial walks somebody through a diagram of a
  given kind, which means there has to be one to walk through — so the sample project is a
  dependency, not a nicety.
- **Ranking**: eligibility from argument types, order from the shape of what was typed and a
  two-tier learned weight — the literal entry remembered, the situation's shape weighted. Local,
  and out of every log.
- **Arrow keys move the highlighted option.** Nothing moves it today, so `Enter` always takes the
  top suggestion — the version of adaptive ranking worth avoiding, since the default is then
  invisible and changes under the user. Overruling it is the feedback.
- **`router.ts` loses its centre.** Question selection, the operation set and the `RHYTHM` rule
  serve the expanded half only; the collapsed half asks nothing and ranks instead. What survives of
  `workflows/*.yaml` is `terms` — which D takes — and one opening hint per domain.
- **Documentation surfacing** has no home yet: where the text lives, and how it is keyed to
  context.
- **The rename**, once all of the above is built.


## Out of scope, recorded so nothing is built on it

- **Merging two divergent logs.** A project file is a single-owner asset, like a `.psd`. Git's line
  merge or nothing; `check.ts` reports the wreckage of a bad merge rather than preventing it.
- **Local variation, for multi-user work.** Somewhere for a view to hold a change that never
  reaches the project it read — with an explicit promotion later. It cannot hang off a proxy: a
  proxy carries nothing but where it sits, so it would need a mechanism of its own. An enterprise
  and multi-user concern; for one user it is an extra step on the commonest path, so writes go
  straight home instead. An extension to add when there is somebody to add it for.
- **A live store for real multi-user work.** Files plus git give one-owner-at-a-time, which is
  honest but is not collaboration. Genuine concurrent editing wants a shared store and presence,
  not a merge algorithm over exported JSON — a different product decision, recorded here so the
  file format is never bent toward pretending to solve it. Team management belongs with it.
- **The version does not compose.** Eight project files carry eight versions and there is no
  aggregate; the repo's version is the git commit. No release process should use the field.
- **Two SysML losses**, accepted rather than solved: trace assertions keep their claim as a typed
  group and lose the bracket notation, and lifeline left-to-right order is presentation that lives
  in the view.


## Schema notes still live

**Op names now**: `set_form`, `set_field`, `drop_field`, `set_def`, `drop_def`, `set_vocabulary`.
**All 22 retired ops are gone**, with the `Legacy` union and the door's entries. An op this build
does not know is now reported at the door and skipped by the fold rather than guessed at.

**Shapes still heal; the old log format does not.** `check.ts` reads `element` as `form`, `kind` as
`form` and `attrs` as text `fields`, inside a checkpoint's whole graph as well as a single
mutation — so a *file* from before still opens. A pre-checkpoint **log** does not, which is the
capability S3.1 deliberately dropped. `relation` as `type` heals only where a relationship is
linked, never inside a checkpoint; nothing was built to close that, since the format it served is
no longer supported.

**A cross-project reference is a path** — `proj_a9f/def_pump`, a bare id meaning here. One
convention for a proxy's `of`, an element's `type` and a `ref` field's value; `refTo` and `refAt`
in `types.ts`. An edge's ends stay plain ids and never cross.

**Nothing at its default is written to a file.** Not planned, and it is what makes the format
readable.


## The suite

**One test file per module, beside the module**, so moving a module moves its test. The one
integration test sits in `tests/`, belonging to no single module.

| | Holds it to |
|---|---|
| `types` | an id says what it points at; a factory leaves nothing undefined |
| `fold` | replay is pure; a reverted step leaves no trace; a mutation with nowhere to land is skipped; `tidy` removes only what cannot exist; a free-text type becomes a definition with a stable id |
| `check` | every old shape arrives as the current one; what cannot be read is dropped and counted; a component key nobody claims arrives untouched, and one its component refuses goes alone |
| `file` | a round trip loses nothing; the same graph writes the same bytes; the schema gate lets a minor through and stops a major |
| `layout` | placement repeats; nothing overlaps; a hand-laid position cannot be moved; a seat lands on the lattice |
| `route` | a line starts and ends on its cards, turns only at right angles, and goes around a block it does not attach to |
| `sync` | a node rebuild keeps React Flow's measurements, so an edge is never silently dropped |
| `lifecycle` | work → save → open → work again, and a pre-freeze log opening and saving out current |

**Nothing asserts a coordinate, an id, a message or a count that tuning would change.** The suite
is about properties, because the values are still moving.

**Deliberately untested:** the terminal — `router`, `turn`, `workflows` — frozen pending stream Z;
`embed`, `match` and `suggest`, which need a model; and `project`, whose actions are thin wrappers
over mutations `fold` already covers. Each is a judgement to revisit. **S1 changes the last of
these**: once actions are pure `(graph, args) -> Effect`, they are worth a suite.
