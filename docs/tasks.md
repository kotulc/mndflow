# Tasks

The difference between what [spec.md](spec.md) describes and what the code does, plus the
questions that have not been answered yet. Reasoning for any of it lives in
[design.md](design.md); the queue of work itself is [plan.md](plan.md).

Organised so that work can run in parallel. **Phase 0** cuts six seams; **Phase 1** is eight
streams, one owner each. A stream names the files it owns, so two owners never edit one file.


## Status

Built and stable: the validator, the one message strip, the schema and a property suite (166 at
A0.1; grown since). `src` is grouped by what a thing is for and dependencies run one way — see
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

- **Does a `figure` ever get placed?** Every control node is derived, so nothing in the core creates
  one. It survives for ornament a package ships. **If A.7–A.9 land with nothing having placed one,
  reconsider the form** — it is one of the five, and S5.5 now refuses interfaces on it.

*Recently closed: states are derived from the activity until somebody **promotes** them, and
promotion replaces rather than copies — the value naming a resulting state becomes a ref to the
state block, so one object is pointed at from both sides and the two notations cannot disagree.
Structure, then activity, then state, each resting on the one before.*

*Recently closed: the shipped layout is two folders at the root, `packages/` for data and `styles/`
for stylesheets, with no wrapper — module code is `src/modules/`, where it already lives; and a
**layer view** is the projection of a layer through the rules and packages in scope, so what it
takes to show a layer at all belongs to the view module and not to any component.*

*Recently closed: extension is subtyping and never overriding, one parent, with rules reaching
every subtype; component configuration lives in one `components` bag keyed by component; undo
restores the graph and never the context; storage is keyed per project and
lazily, with the untouched checkpointed under pressure; packages are a list in import order and
never shadow, since references are by id; a package resists editing until unlocked or forked; a
proxy owns its appearance and the block owns the thing; a project opened alone is read in
isolation.*


## Phase 0: the seams

Five files absorb almost every planned feature, so almost every feature waits on another. Cutting
these is what turns three concurrent streams into eight. **S1, S2, S3, S5 and A0 touch disjoint
files and run in parallel** — S5 waits on S2's contract and A0 on nothing. **S4 is the exception**:
it reaches `fold.ts` and `store.ts`, which S3 and F also own. plan.md carries the order to take
them in.

| | Lines | Absorbs |
|---|---|---|
| `canvas/Canvas.tsx` | 1304 | every renderer. **The gestures are out** — `canvas/gestures.ts`, S2.1 |
| `project.ts` | 772 | one `act` literal — every feature adds an action to it |
| `graph/fold.ts` | 714 | one `apply()` switch — every new op. Was 872 before S3.1 |
| `geometry/layout.ts` | 915 | clusters, notes-as-units and axis bias all land here |
| `graph/types.ts` | 475 | every schema change — append-only, so tolerable as it is |

### S1 — the action registry

The shape is specced in [spec.md](spec.md) under *Action surface*, the reasoning in design.md under
*The action surface is the input seam*. `project.ts` splits into `actions/*.ts` grouped by subject
— elements, edges, groups, notes, fields, definitions, layout — and keeps only state and dispatch.

- **S1.2–S1.6 are live.** Descriptors live in `actions/*`; `project.ts` side-effect-imports them,
  generates `act.*` wrappers from the registry, keeps aliases for old names, and moves the five
  queries off `act`. Gestures reach actions through the registry.
- **Scope holds one `on`.** actions.md scopes `retype` (and fields) to `element|edge`; today
  `retype` declares `element` and `run` still accepts an edge id. Offering on an edge waits on
  Scope naming both.
- **No Arg kind for a ports/sides pair.** `relate` carries them in the args bag for the gesture;
  a sentence never supplies either.
- **Gestures are not on the descriptor.** A view owns its gesture map and binds a gesture to an
  action name, so S1 and S2 stay disjoint and two views can bind one action differently.
- **Every action is enumerated in [actions.md](actions.md)** — name, scope, arguments, the
  mutations it writes, and which of today's closures it replaces. Build against that table, not
  against `project.ts`.
- **Collapse the duplicates as part of the extraction**, so nothing later is written against a
  surface that then changes. 52 entries in `act` become **29 actions**, 4 adjustments, 5 page
  actions and 5 queries that leave the surface entirely. *Done with S1.6.*
- **`check` refusals reach the strip for taken names** via `NameField` (S1.7 partial, proven).
  **Parked**: canvas prompt clash still silent.
- **The `act.foo(...)` methods stay, generated from the registry**, so call sites keep working
  through aliases where old names remain.

Unlocks E and the tray menu in G; prerequisite for the terminal.

### S2 — the component surface

An **open module publishes components**, and a definition configures them under its `components`
key — specced in [spec.md](spec.md) under *Project model*. `Canvas.tsx` splits three ways: gesture
handling — *done* — composition, and `modules/`.

- **Each component validates its own key and reads no other's**, registering its validator with the
  door so an unrecognised key is unvalidated rather than wrong — *done*. **Published**: `card`,
  `constraints`, `style` (`styleOf` / `lookOf`, `styles/sysml.ts`), `view` (six-module registry),
  `rules` (`ends` / `holds` / `degree` / `match`, `among` via `isa`). **Block diagram draws from
  card / `lookOf`** (S2.6b); projection surface (frame/crumbs/prompts), compose and gesture map
  live under `modules/view/diagram/` (S2.6 / S2.6c / S2.7). `Canvas.tsx` still hosts. Table and
  matrix mount when `view.module` names them (A.1 / A.2, suite). Activity / sequence / state wait
  A.7–A.9. Rules evaluate and advise in the tray (S5.3). The module
  `validate` / `findings` hook is live (S5.4); no shipped module supplies a real one yet, and
  Contents still surfaces constraint/rule notes only.
- **Preset registry** — `ship` / `presets` / `preset` in `modules/index.ts` (*done*, A0.4). No
  concrete presets shipped yet.
- **`resolved()` merges the subtype chain** — fields union, `components` per key, cached per fold
  (*done*, SC.3). **Parked**: `cardOf`, `styleOf`, `rulesOf`, `constraintsOf` still read the leaf
  definition alone and ignore the chain.
- **The plain card is drawn from** — `PLAIN` and shape stroke read from the components (S2.6b).

**S2.6 walked in advance, without moving any code.** Every part of `Canvas.tsx` put against the six
components. Most of it goes somewhere; what does not is below, and it is one shape rather than five
unrelated leftovers. **Surface + configured half + compose + gesture map have since landed**
(S2.6 / S2.6b / S2.6c / S2.7); the walk below is the historical reasoning.

| Goes to | What |
|---|---|
| engine, unmoved | `place`, the group bands, `planEdge` + `lanes`, `reNoted`, proxy substitution |
| `card` | name and chip, the container's treemap — `PLAIN` already says it |
| `style` | the relationship's colour, dash and arrowhead; stacking |
| `view` | the form→renderer map, the layout law declining to place, all four adjustments, the gesture map, the layer as scope, the module's word for a block |

**What resisted — five things, and every one of them is the layer as a workspace rather than a
thing drawn in it:**

- **The frame is nobody's.** `frameBox` derives the layer's own border from the panel's shape, its
  contents, a floor and the grid, and seats interfaces on it. `card` composes a *usage* and the
  frame is not one; `view.scope` says *which* layer, not how it draws. A table and a matrix have no
  frame at all, so it cannot fall back to the engine either.
- **The camera is nobody's.** `floorZoom`, `restViewport`, `extent`, the refit effects and the
  zoom-floor snap-back — about 180 lines. A diagram has a viewport; a table scrolls.
- **Derived presentation has nowhere to hang.** A **reference** draws violet and dashed, a **tie**
  draws as a faint leader, a **proxy** card is grey and hatched. All three are derived from what the
  ends *are*, deliberately — so none has a definition to carry a `style`, which is configured per
  definition. Either `style` grows a notion of derived states, or these stay the engine's own.
- **The prompt loop.** A gesture asks for a name before anything is made — four floating inputs, the
  clash check, the strip. Every view module that can create needs it; it is not one of the six and
  it is not page chrome, since it sits over the stage.
- **Display preferences pass through.** `showPorts`, `angular` and which form the next right drag
  draws are held by the page and read by the canvas. They are per-diagram, not per-page — a matrix
  has no interfaces toggle — and with six view modules there is nobody to hold them.

**Answered.** They are not a seventh component: they are the **projection surface**, which is the
view module's and never a definition's — see design.md under *The view is where a notation plugs
in*. A layer is the current scope; a **layer view** is that layer projected through the rules and
packages in scope and rendered by one of the six modules. So the frame, the camera, the chrome
and where a gesture asks are the diagram module's answer to *how do you show a layer at all*, and a
table answers the same question with rows, no frame and a scrollbar.

Derived presentation is the one of the five that does not simply move: a reference, a tie and a
proxy card draw as they do because of what their ends **are**. That is the engine's own reading of
the graph, so it stays with the engine and is offered to the module as a fact, not configured on a
definition that does not exist.

**Also found**: `Canvas.tsx`'s Props is 50 entries. Most collapse into one dispatch with S1.6
(*done*); about a dozen are the genuine contract a swappable view module would implement, and
that dozen is worth naming while S2.6 is being decided.
- **The test this seam is measured against**: if the base diagram cannot be expressed as one
  configuration among others, the component boundaries are in the wrong place.
- **Every gesture the canvas binds today is inventoried in [actions.md](actions.md)**, which is
  what the first gesture map is written from.
- **The gestures are a declared map** (S2.7). `useGestures` still reaches handlers; the diagram
  declares which adjustments it takes.

Unlocks A and S5, and the context menu in G.

### S5 — constraints and rules

Two components, and the first rules the engine applies rather than infers. **`constraints` /
`required` is published** (`constraintsOf`, in `modules/base.ts`). **`rules` is published** —
`ends`, `holds`, `degree`, `match`, with `among` via `isa` (*done*, S5.2). **They advise while
modelling and refuse only at translation**: Contents evaluates and notes in the tray/strip (*done*,
S5.3); a module's `validate` hook and `findings` collect advise-only words (*done*, S5.4) — no
shipped hook yet, and Contents does not call `findings`. Value-missing evaluation is live with
S5.3. **`figure` takes no interfaces** — `interface` refuses with the reason (*done*, S5.5,
`actions/edges.ts`).

### A0 — packages and styles

**`packages/` and `styles/` exist at the root.** `packages/core/<domain>.yaml` holds the relation
definitions; workflows YAML no longer carries relations. **Package load by id is live** (A0.3):
shipped YAML loads under stable `pkg_*` ids; defs are addressed by path and never copied into a
consumer's `defs`. **Parked — A0.2 terminal bridge needs Clay**: `workflows.ts` still loads core
into `Domain.relations` (terminal still consumes that shape) — that path still mints local
`set_def` copies and remains the shadowing-shaped entry until vocabulary (D.2) consumes the
loader. Do **not** treat A0.2 as fully closed while that gate is open. **Preset registry** is in
(`ship` / `presets` / `preset`); no concrete presets yet. Style sets live under `styles/`
(`sysml` shipped); the block diagram draws from style (S2.6b).

**Parked from A0.3:** README dependency map still omits `src/workspace/` (depends on `graph`);
`fold` `isa` / `resolved` still read only local `graph.defs`, so a path-shaped `extends` does not
walk yet.

### S3 — fold hygiene

Touches only `fold.ts`, so it runs alongside S1 and S2.

- **Delete the retired ops** — *done*. All 22, not the 15 counted: seven were living in the current
  switch rather than the legacy one. `fold.ts` fell 872 → 680 lines, and `types.ts` lost the
  `Legacy` union. **`relax_layer` and `size_element` were not among them** — current ops that
  nothing emits yet, and G wires both.
- **Split `apply()` by family** — *done*. Dispatches to `applyElement` / `Edge` / `Group` /
  `Field` / `Def`; behaviour preserved.
- **Index once per fold** — *done*. Children indexed once; `childrenOf`, `blocksOf` and
  `portsOf` use it.

### S4 — the workspace

**Promoted out of the streams.** A view is a project of proxies, and it needs the projects it
points at to be open — so matrices, requirements views and every behavior model depend on this
existing. It is a seam, not a feature. Vocabulary in [design.md](design.md) under *The words*.

- Several projects loaded at once, each with its own log and its own export; a **workspace export
  gathers them** and is the everyday one. A single project can still be opened, shared or imported
  alone, without the views that lean on it.
- **A proxy's target widens to `{ project, element }`**, and a definition ref the same way — *done*
  (S4.3). **An edge's ends stay plain ids** — widening those would reach `fold`, `layout`, `route`
  and the canvas, and nothing needs it.
- **A proxy tolerates a missing target and never records the absence** — *done*: `tidy` keeps it
  as a missing block rather than deleting the proxy, so undoing a deletion in one project brings
  the reference back in another.
- **A change is recorded where its element lives.** Filling in a matrix cell writes to the project
  that owns both ends. Ownership routes it, and nothing branches or merges.
- **A relationship across two projects is a proxy plus an ordinary edge**, both in the project of
  the end making the claim. No relationship ever spans two logs.
- **The workspace is itself a project**, and needs no new schema to be one: its elements are
  proxies of other projects' **roots**, and folders are ordinary blocks. Filing is undoable, and it
  draws as a block diagram with dependencies derived from who holds proxies into whom. *Done* as
  the `workspace/` module (S4.4): `Held`, `admit`, `folder`, `resolve`, self-guard. Explorer wire
  is live (S4.5).
- **Guard against a workspace proxying itself.** *Done* (S4.4).
- `useProject(projectId)` — *done* (S4.2): keyed load/save; switch clears the view; import adopts
  the file's id. Explorer click-switches context (S4.5).
- Projects listed in the tree they were filed into; both roots shown; click switches context.
  *Done* (S4.5, proven).
- **Only deletion is breaking, and only breaking changes are reported.** Dead references
  accumulate; wants an explicit *clear missing references* action rather than a default.
- **An export of one graph bundles the external blocks it depends on**, so it stands alone.
  Workspace `⤓` and project `↧` export/import at schema `1.2` — *done* (S4.6, proven). Owns
  `graph/file.ts`, `page/App.tsx`, `project.ts`.
- **The workspace needs its own storage**, separate from every graph — *done as keys*:
  `loadProject`/`saveProject` one slot per id, `loadWorkspace`/`saveWorkspace`, legacy
  `mndflow.steps.v1` migrates once. Lazy keys and the pressure API are *done* (S4.7): pristine
  makes no key; first change writes; `watchPressure` / `pressureNote` on the store.
  **Parked**: the strip is not subscribed to `watchPressure` yet.
- **Locked packages** — refuse a write with the reason; the strip offers **unlock** or **fork**
  (*done*, S4.8, seeded lock proven). Unlock and fork are workspace operations, not registry
  actions.
- **`adoptId`** — import adopts the file's project id into the session pointer
  (`mndflow.project.v1`). Callers and docs should treat keyed slots as the source of truth.
- **The run skill and prove-row still name the legacy key** `mndflow.steps.v1` — update them when
  driving a keyed session.
- **Shared definitions.** A house vocabulary is re-declared per project today and drifts. A
  definition ref widens the same way a proxy target does, so the shared vocabulary is one graph
  the others reference — which is what a **package** is. Load-by-id is live (A0.3); a project's
  import list is D.2 — **blocked** on terminal freeze + owns (A0.2 bridge needs Clay).


## Phase 1: the streams

| | Owns | Waits on |
|---|---|---|
| **A** Views and packages | `modules/view/`, `packages/` | S2, S4 |
| **C** Geometry | `geometry/` | S3 (perf only) |
| **D** Vocabulary | `terminal/workflows.ts`, `graph.vocabulary` | — |
| **E** Definitions and fields | `page/Contents.tsx`, `page/Relations.tsx` | S1 |
| **F** Durability and files | `graph/store.ts`, `page/Files.tsx` | S4 for the workspace export |
| **G** Canvas polish | `canvas/`, `page/Panel.tsx` | S2 for the menu only |
| **H** Sample project | `samples/` | — |
| **Z** Terminal | `terminal/` | **everything above**, H especially |

**Startable today, before any seam:** G.7's both-ends enclosure park on `Canvas.tsx`; F.3 SVG
download wire beside the source; S1.7 canvas-prompt strip.

**The terminal goes last, deliberately — Wave Z is parked.** It ranks and completes whatever the
surface offers, so building it against a surface still moving means building it twice. It is also
the one stream whose value depends on the rest being mature — which makes it the acceptance test
for all of them. **◆** rows needing Clay before code: G.9 (menu trigger), A.7 (interaction write),
Z.6 (docs home).

**S4 and F both reached `store.ts`.** S4.1 / S4.7 / F.2 are done; they are disjoint from here.

### A — views and packages

All five notations were walked against the engine and **none adds a form.** The structural ones need
no code at all; the behavioural ones need a module each, because they project the same layer three
different ways — see design.md under *Structure and behavior*.

| | Costs |
|---|---|
| requirements | a package. No code — *done* (A.3) |
| parametrics | a package — *done* (A.4) |
| flow | a package of `directed` subtypes — *done* (A.5) |
| activity | a **view module**, plus a package of words. A behavior layer's default reading — **◆ A.7** |
| state machine | a **view module** over the same layer, and `promote` where somebody wants real state blocks |
| sequence | a **view module** over the same layer. Messages are derived, not drawn |
| UML, SysML v2, UAF | packages — tables of definitions, names and mappings |

**Six view modules**: `block`, `table`, `matrix` for a structure and `activity`, `sequence`, `state`
for a behavior. Everything else is configuration or data. **Behaviour is what added actions** —
`scope` and `promote`, both the engine's — and it added no form and no mutation op.

- **`shaped` / `outline` on card** — *done* (A.6). Nothing stores a shape; the module computes one
  inside the engine's box. Diagram strokes from card / `lookOf` (S2.6b); counting what to draw as a
  figure is A.7.
- **requirements package** — *done* (A.3): `packages/requirements/` — requirement block (`id` /
  `text`, card `shows`) and five directed relationships. Data only.
- **parametrics package** — *done* (A.4): `packages/parametrics/` — constraint with size and style.
  Data only.
- **flow package** — *done* (A.5): `packages/flow/` — control flow, object flow (`item` ref),
  transition (trigger/guard/effect). Formal `names` wait A.11.
- **A.1 / A.2** — table and matrix modules mount when `view.module` is `table` / `matrix`
  (*done*, suite). **A.7 stays ◆**.
- **A behavior project owns its own tree.** It holds its actions and states, and **refs** to the
  participants; what it learns about a participant is written through the ref to the block, which is
  the ownership rule in S4 and not an exception to it.
- **A diagram binds gestures to actions**; the graph still holds all the state.
- **A lifeline is a column, and an occurrence on it is an action.** Which column follows from who
  `performs` the action, and **a message is derived**: an order relationship whose two ends are
  performed by different participants. Sequence needs an arrangement, not a layout law of its own,
  and needs nothing drawn that the activity did not already say.
- **A swimlane is derived from `performs`** — the participants an action names are the lanes. Not a
  group, which cannot be empty, and not something anybody draws.

### C — geometry

Internally serial — clusters, notes and axis bias all rewrite `place` — and parallel to everything
else.

- **Clusters, and shapes for them.** *Done* for ring and chain only (C.1): exact rings and chains
  get topology shapes; hub-and-spoke and other shapes fall through to the layer arrangement;
  hand-laid sticks under free fill. Proven in browser. Approximate topologies stay null on purpose.
- **Notes as units** — *done* (C.2, proven earlier): notes via `withNotes`; ties excluded from
  structural joins; tied notes seat under holders.
- **Directed edges bias rank, placement and routing** — *done* (C.3). Port `in`/`out` stay unread.
  Resting layout does not yet drive an unplaced neighbour from a directed edge (no UI for that
  path).
- **The cluster spacing tier**, which needs clusters — still backlog; not a plan row.
- **Performance.** *Done* (C.4): measured ~15.5s before on an 80-box long-span harness; ~72ms after
  — two-phase seats-first + shared visibility. Browser resize on a busy layer stayed interactive.
  Cause was the router, not another split.
- **Layout acceptance around clusters** — *done* (C.5): cluster layout property tests (suite).
- **Two known limits, not bugs with known fixes.** The frame drifts off the grid on a window
  resize, since it derives from the panel's aspect ratio, taking its seated interfaces with it;
  fixing it means a frame that does not fit the panel, which is worse. And route corners are free —
  snapping them to 24 would throw them past the 2.5-unit straightness tolerance and bend every
  straight line.

### D — vocabulary

Split out of the terminal because a module needs it and the terminal does not gate it.

- **`terms` live in `workflows/terms/*.yaml`** — *done* (D.1); `workflows.ts` merges them. Chips
  still read Module/Dependency until a vocabulary package supplies the words.
- **Take `domain` apart.** It became `graph.vocabulary` in the migration — a rename that decided
  nothing. It currently keys three concerns: a set of words, a set of starting relations, and a set
  of workflow prompts. **Relation seeds moved to `packages/core/`** (A0.2); the terminal still
  reads them through the seeding bridge until D.2 consumes A0.3's loader. **D.2 is blocked** on
  terminal freeze + owns (A0.2 bridge needs Clay).
- **The words are what a module needs** — what this notation calls a block, a group, a
  relationship. Stream A cannot declare a module vocabulary until they are separable from the
  prompts.
- **The prompts belong to Z**, and so does the rename, so it happens once. `vocabulary` describes
  what remains; `template` is spoken for by definitions.
- **Keep `terms` and one opening hint per domain**; the rest of each YAML serves a question loop
  that only Z's expanded half still needs. Do not invest in the prompt sets.

### E — definitions and fields

- **Editing definitions.** *Done* (E.1, proven): types chip + edit defs in the contents tray —
  fields, defaults and presentation.
- **Form-specific field controls.** *Done* (E.2, proven): number with unit, choice with its list,
  ref with a target picker — on usage and definition fields.
- **Tags.** *Done* (E.3, proven): add/drop on usage and definition fields.
- **Icons.** A definition should be able to draw one as well as a boundary or a note. Nothing draws
  an icon and no set has been chosen. Needs a renderer from S2.
- **Packages** — the two notations that turned out to be data rather than views. **Requirements**
  (*done*, A.3), **flow** (*done*, A.5) and **parametrics** (*done*, A.4) ship as YAML under
  `packages/`.
- **Authoring a package** wants somewhere to put a plain name, a formal name and a mapping, which
  is the same place a definition's fields and presentation are edited.
- **Type offers are package-disambiguated** when two definitions share a name (*done*, SC.4).

### F — durability and files

- **File System Access** — *done as fallback* (F.2): Chromium path present; download when the
  picker fails. Live bind+drift is in code and shows in the header, but was not proven under
  automation. Owns `graph/store.ts`, `page/App.tsx`, `project.ts`.
- **Rendered SVG beside the source** — `svgOf` on the diagram module is landed (F.3 partial,
  suite). **Parked**: wiring that markup into a download beside the JSON export.
- **Reviewing a model change as JSON is poor.** Committing a rendered SVG beside the source makes a
  pull request readable. Costs an export path and nothing structural — download wire is the park
  above.

### G — canvas polish

- **The context menu**, still the last thing to build. Every entry now performs its default action
  directly and correctly, so the menu covers for nothing wrong — only the alternatives are missing:
  direction and reversal for a relationship, ungroup, paste, delete throughout. **◆ G.9** — needs
  Clay: the trigger is not designed.
- **A menu trigger.** The right button is spent entirely on direct creation, so the menu has no
  gesture left. The intended answer is that selecting an element reveals its options in the
  contents tray — the table is the menu and no gesture is needed. Not designed yet.
- **The selection box.** **Partial (G.7):** an edge with only one end enclosed is not selected;
  click / Ctrl+A / Esc still behave (proven). **Parked**: both-ends enclosure policy. Dead CSS:
  `.leg-grab` / `.leg-mark` still describe segment grab bands `Wire` no longer draws.
- **Filter relationships by type on the canvas** — *done* (G.1). Toolbar cycles types; filtered
  edges do not draw; seats clear. **Parked**: the filter is not persisted in localStorage.
- **`Ctrl`/`Cmd` + `A`** — *done* (G.5). Selects all cards; Esc clears an RF multi-select via
  `changeNodes`; Fit and Group still work with the selection.
- **`relax` and `size` are wired** — ◌ click (`onClick={() => onRelax()}`) and note SE resize
  (G.2 / G.3). **`dissolve` is registered and S1.6-ready** (G.4) but **unreachable from the UI**
  until G.9 designs a menu trigger. Delete on a group row still goes through remove, not dissolve.
- **Adding a block to an existing group from the panel** — *done* (G.6): panel `+ group` joins the
  selection into an existing group. Proven in browser.
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

- **`samples/mndflow.json` exists** — *done* (H.1). Describes this app, exercises the forms; import
  drew Graph/Canvas.
- **Line-by-line review** — *done* (H.2): `samples/REVIEW.md`. Nesting reads; closed sets present;
  meta needs no more fields. **Parked from the review**:
  - Rename the bad edge key `"undefined"` (loads and round-trips; violates id shape).
  - Root fields dump defaults the writer strips elsewhere (`file.write` / `fieldsOut` asymmetry).
  - Prefer meaningful `edge_*` keys in samples even though runtime treats keys as opaque.
- **Z's tutorial is walked over a sample**, so this stream decides what a first project looks like
  as well as proving the format. Worth one sample per module eventually, not just this one.

### Z — terminal

*Last, and the acceptance test for everything above.* **Parked** — frozen until then, so it is not
touched by any other stream. What it is for is settled — see design.md under *The terminal*; what
remains is building it. **◆ Z.6** needs Clay (where docs live / how keyed) before that row.

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
