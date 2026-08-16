# Tasks

The difference between what [spec.md](spec.md) describes and what the code does, plus the
questions that have not been answered yet. Reasoning for any of it lives in
[design.md](design.md); the queue of work itself is [plan.md](plan.md).

Organised so that work can run in parallel. **Phase 0** cuts six seams; **Phase 1** is eight
streams, one owner each. A stream names the files it owns, so two owners never edit one file.


## Status

Built and stable: the validator, the one message strip, the schema and a property suite that grows
with the work — **no count is kept here**, because the last one pinned drifted for months and the
number never meant anything on its own. `src` is grouped by what a thing is for and dependencies run
one way — see [README.md](../README.md) for the map; every test lives in `tests/` mirroring it.

**Nothing is frozen any more.** The rail was unfrozen with S6; the **visual style** is unfrozen
now, and it is stream **U**'s subject. One boundary survives the lift: **U owns chrome, not the
diagram's visual language.** Header, explorer, themes and rail *layout* are U's; what a card, a
route or a frame looks like stays the engine's and is not U's to retune.

**The rail is detachable.** `project.ts` no longer imports the terminal — question loop registers
via `looping()` (S6.1). `packages/terms/` holds vocabulary; `Files.tsx` is free of the rail
(S6.2). **Page mount is optional** via `import.meta.glob` — Readout optional `Scores`; a build
without `terminal/` still runs (S6.3, proven). **Parked**: Matching tab empty when Scores absent.

**Three bugs found by driving the app, all fixed.**

1. **An imported project was never stored.** Import writes the whole graph as one checkpoint step;
   `pristine()` read a checkpoint-only log as "nothing somebody did", so the lazy-key gate (S4.7)
   dropped it and reported success. Every project came back empty after a reload. **Fixed** in
   `store.ts`: a checkpoint carrying a graph is not pristine — only an untouched root is.
2. **The explorer listed projects that did not exist.** `App` admitted `store.projectId()` into the
   workspace *at mount*, before the project held anything, and nothing ever removed one — so every
   session started and abandoned left an untitled row reading `project`, for ever. This contradicted
   S4.7's own rule. **Fixed**: a project joins the workspace when it first holds something, the same
   rule storage uses for a key, and `prune` forgets any listed project storage has no log for. A
   fresh session now lists **nothing**.
3. **A false *Nothing to open*.** `project.open` is a new closure every render, so the effect that
   applies a pending layer ran on every render and fired *before* `useProject` rebound — opening the
   id against the project being left. **Fixed**: the pending view now names its project and waits for
   the layer to actually be in the graph. *(The cross-project descend it was hiding is still broken —
   see* Open questions*.)*

**401 tests did not catch the first of them, and one of them asserted it was correct.** `store.test.ts` had a
fixture named *an import-shaped log* built on `EMPTY`, the single graph value for which the old
behaviour is right, under a test named *does not store an import that nobody has touched*. The
suite's own words describe the bug. Two structural reasons, both worth fixing before adding
anything:

- **The one integration test does not integrate.** `tests/lifecycle.test.ts` is described here as
  *work → save → open → work again*, but it never calls `saveProject` / `loadProject` and never
  touches `localStorage` — it round-trips `file.write` / `file.read`. The app's actual save path had
  **no end-to-end cover at all**; only `store.test.ts` and `workspace/index.test.ts` touch storage.
- **A mechanism was asserted where an outcome was meant.** *Properties, never values* held — nothing
  asserted a coordinate or a count — but the property that mattered, *what a project holds survives
  being saved and read back*, was never written down. What was written down was the gate's internal
  rule, proven with the fixture that made the rule look right.

**The browser found it in minutes.** That is the standing argument for the run skill being the
acceptance gate rather than a green suite — see CLAUDE.md, *Finishing a chunk*.

**Exercised in a browser**, and every seam is exercised there before it is called done — see
`.claude/skills/run/SKILL.md` for how. A fresh session, a pre-freeze log, the canvas gestures,
import and export all check out: the round trip is byte-identical and a pre-freeze log draws,
repairs and saves out current. What it turned up has been fixed.

**The schema is no longer frozen.** It is changed as the design requires, and a file still opens
through `check.ts` whatever it was written by.


## Open questions

*Kept at the front. Everything here blocks something in [plan.md](plan.md).*

*Recently closed: **a project is named into being.** Naming is the first step and nothing goes in
one before it; **project names are unique**, the layer rule one level up. Storage reads a pointer and
never mints — a fresh session has no project and says so. The `|| "project"` fallbacks are gone from
the explorer, the crumbs and the panel. This was already sanctioned as the `new` page action
(actions.md) and needed no gate.*

*Recently closed: **cross-project descend was never broken.** A single click on a row descends; a
double-click is the *rename* gesture. The earlier report drove a double-click, which fired two
navigations — and because the tree re-rendered between them, the second carried the id of whatever
row had moved under the pointer, clearing the queued intent and opening a block that was not in the
project. **Fixed anyway**, because a double-click landing somewhere arbitrary is a real misbehaviour
however it is reached: `navigate` now ignores a call while an intent is already queued. Verified all
four ways — single and double click across projects, and a same-project descend.*


- **Should an untouched project stay in the workspace?** A session opens an empty project, admits it
  to the workspace, and if the user then imports or switches, that empty one stays in the explorer
  forever as a row reading `project`. Every later import leaves another. It is not wrong — it *is* an
  empty project — but it reads as clutter and as a bug. Options: do not admit until first change
  (matching the lazy-key rule), or tidy an untouched empty project when it leaves context. **Also**:
  an untitled project falls back to the word `project`, which is indistinguishable from the workspace
  itself; the explorer gives no sign which row is which. Blocks nothing; wanted before the explorer
  is shown to anybody.


*Recently closed — **the last three rail unknowns**. **Z.6**: documentation lives in
`samples/docs.json`, keyed by the terms in [definitions.md](definitions.md) — hand-authored, and
**no generator**, which is the obvious unasked-for build step. **Z.7**: no code rename ever —
`rail` stays the word throughout the tree and the docs, and **"Page Intelligence"** is user-facing
copy only. **Z.8**: scoped down to **ranked actions plus at most one documentation hit**, on the
single most relevant keyword and **always ranked last**. That is a lookup and a sort, so **the rail
as scoped is wholly client-side** — the "may not be client-side" caveat and its "must work with it
unavailable" corollary are both retired. The **natural-language half is deferred, not dropped**: it
moves to* Out of scope *so nothing is built on it.*

*Recently closed — **the shell, and one word retired**. The **visual style is unfrozen** as stream
**U** (chrome only). A **saved view needs no new noun**: it is a block whose definition carries a
`view` component, holding proxies, filed in an ordinary folder — so the `view` **project** and the
workspace sense of **`diagram`** are both struck from definitions.md, leaving `diagram` with its one
meaning. **Which view is showing is a display preference** — sticky per project, never in the log,
and shown by a labelled control beside the project root rather than cycled by an icon. No sixth
page action; the closed set is untouched.*

*Recently closed — **the whole of G.9**. One set of offered actions, presented two ways: the menu
in **fixed** order, the rail ordered by **learned preference**. **The list lives in `actions/`**, not
in the rail, because the rail stays optional and a menu importing it would break S6.3. **`infer`'s
trigger is the menu** with the explorer as context. **On the canvas the target decides** — empty
space still creates, an existing card / frame / edge / selection opens the list, and right drags are
untouched.*

*Recently closed: **the terminal is unfrozen**; **A.12 is dropped** — a child block's inside already
is an internal block diagram.*

*Nothing here blocks a plan row, and **no `◆` gate is left** — Z.6 is answered above. A.7a's
design is settled — the whole of it is in [behaviors.md](behaviors.md); `infer` is built; activity /
state / sequence views draw derived labels (A.7b–A.9). What remains open inside behaviour is listed
there under* Still open*.

*Recently closed: **page mounts the rail or does not** (S6.3) — optional via `import.meta.glob`;
Readout optional Scores; build without `terminal/` passes; Chat + Scores proven. **Parked**:
Matching tab empty when Scores absent.*

*Recently closed: **`project.ts` free of the terminal** (S6.1) and **`terms` in `packages/terms/`**
(S6.2). Detach only; D.2 / A0.2 bridge still needs Clay.*

*Recently closed: **`infer`** (A.7a) — selection → one behavior block + `Effect.home`; writing into
a foreign project via `Effect.into` / `writeInto` (S4.9). **Parked**: page chosen → `infer`; App
refresh after foreign write. Cap is a tree slice, not connected-components.*

*Recently closed: **activity view** (A.7b) — mounts when `view.module===activity`; DIM in stage;
dimmed labels/order proven. Owns include `base.ts` + App mount. **Parked**: RF framed host;
gestures on activity plane; activity-final double ring; swimlanes-from-`performs` docs drift.*

*Recently closed: **state view** (A.8) — state module + App mount; empty infer offer; Reading A/B;
DIM proven. Owns include `base.ts` + App mount.*

*Recently closed: **sequence view** (A.9) — sequence module + App mount; columns; directed then
axis; DIM proven. Owns include `base.ts` + App mount.*

*Recently closed: **UML / SysML / UAF packages** (A.11) — `packages/sysml|uml|uaf` + ornaments as
shape/size; catalog load proven; formal `names` on behavior / flow / requirements / parametrics.*

*Recently closed: **explorer multi-select** (E.4) — Shift/Meta, `Chosen[]` in App. **Parked**: Ctrl
on Windows; no distinct CSS; infer wire.*

*Recently closed: **`figure` retired** (SC.5) — door heals to `block`; sample re-authored as shaped
block; interface-on-figure refusal removed. Forms are four.*

*Recently closed: Ask + Canvas `onSay` wires `check` refusals to the strip (S1.7); SVG download
beside source export (F.3); both-ends marquee selects edge (G.7); `view` carries `word` / `creates`
and cap `N` (A.7c — create/infer not wired yet).*

*Recently closed: **the rail is not a command palette.** It is the one text entry point over the
workspace — natural language that makes and changes things, surfaces documentation, packages and
definitions, and adapts to how one person words things. A palette is a fixed command list and a
console is a shell; neither is this, so an editor host duplicates none of it. **It still never
changes context** — it *ranks against* context, so moving it would shift the ground its own ranking
stands on. It reaches actions and writes no mutation of its own. *(**Superseded in part**: Z.8's
scope is now settled and small, and with it the "may not be client-side" caveat is gone — see the
Z.6 / Z.7 / Z.8 closure at the head of this list.)*

*Recently closed: **storage stays browser-local and wholly client-side.** No cloud home, no sync, no
server holding a project. What import/export gains is **destinations** — local disk (F.2) and a
cloud drive — one file at a time, chosen by the user. Nothing changes in undo, the log or the fold,
and "no server" holds literally for the app.*

*Recently closed — the whole of A.7's design, now [behaviors.md](behaviors.md). **`infer`**
replaces seeding and promotion: a selection becomes one behavior block, one-way and deterministic,
and re-inferring makes a new block rather than editing one. **Guess freely in the behavior, never
into the structure** is the line the design rests on — the ordering chain is four tiers deep and
fires almost always, and only what the structure **stated** is written home. **Derived state
machines are gone. Lanes come from the ref**, not from `performs`. `action` and `state` are
**definitions**, not forms. **A.7a built the action**; **A.7b–A.9 draw activity, state and
sequence.***

*Recently closed: **`figure` is retired** — nothing in the core ever placed one, behaviour was the
last candidate and places blocks, refs and groups instead. Ornament is a block with a `shape` and a
`size`, both of which the card already carries; the fork bar is a thin `rect`. The closed set of
element forms drops to **four**. S5.5's "takes no interfaces" survives as a `degree` constraint on a
definition (S5.2) rather than a branch in the action. SC.5 is the removal — **done**.*

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

Five files absorbed almost every planned feature, so almost every feature waited on another. Cutting
these is what turned three concurrent streams into eight. **S1, S2, S3, S5 and A0 touch disjoint
files and run in parallel** — S5 waits on S2's contract and A0 on nothing. **S4 is the exception**:
it reaches `fold.ts` and `store.ts`, which S3 and F also own. plan.md carries the order to take
them in.

**The seams are cut.** Three of the five came down; two grew instead, because the streams they
absorb landed after the split rather than before it.

| | Was | Now | Absorbed |
|---|---|---|---|
| `canvas/Canvas.tsx` | 1304 | **703** | gestures out (S2.1), projection surface and compose out (S2.6) |
| `project.ts` | 772 | **586** | the `act` literal became `actions/*` (S1.2–6); only state and dispatch left |
| `graph/types.ts` | 475 | 489 | every schema change — append-only, so tolerable as it is |
| `graph/fold.ts` | 714 | **935** | split by family (S3.2) and indexed (S3.3), then `extends` / `resolved` landed on top (SC.2, SC.3) |
| `geometry/layout.ts` | 915 | **1423** | clusters, notes-as-units and axis bias all landed here as planned (C.1–C.3) |

**Three files outgrew the table rather than the seam.** `layout.ts` (1423) took all of stream C by
design and no seam was ever cut for it; `page/Contents.tsx` (1444) is now the largest file in the
tree, having absorbed E.1–E.3, S5.3 and SC.4 without a row owning the split; and **`page/Files.tsx`
(600) is next in line** — six Wave U rows and G.9b all reach it, with no seam cut for it either.
None is a bug and none blocks anything — recorded so the next structural row is chosen with them in
view.

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
- **`check` refusals reach the strip** via Ask + Canvas `onSay` (S1.7, proven), including
  `NameField` taken-name marks.
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
  live under `modules/view/diagram/` (S2.6 / S2.6c / S2.7). `Canvas.tsx` still hosts. **Table**
  mounts when `view.module` is `table` — rows pick/open, proxy open withheld (A.1, proven).
  **Matrix** when named (A.2, suite). **Parked**: table chrome (crumbs / types) not hosted beside
  Table.   **Activity** when `view.module` is `activity` — dimmed labels/order (A.7b, proven).
  **State** when `state` — empty infer offer; Reading A/B; DIM (A.8, proven). **Sequence** when
  `sequence` — columns; directed then axis; DIM (A.9, proven). **Parked**: RF framed host;
  gestures on activity plane; activity-final double ring. Rules evaluate and advise in the tray (S5.3).
  The module `validate` / `findings` hook is live (S5.4); no shipped module supplies a real one yet,
  and Contents still surfaces constraint/rule notes only.
- **Preset registry** — `ship` / `presets` / `preset` in `modules/index.ts` (*done*, A0.4). No
  concrete presets shipped yet.
- **`resolved()` merges the subtype chain** — fields union, `components` per key, cached per fold
  (*done*, SC.3). **`cardOf` / `styleOf` / `rulesOf` / `constraintsOf` read that view** (*done*,
  SC.6, proven). **Parked**: Contents still advises only leaf constraints/rules on subtypes.
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
S5.3. **Parked**: on subtypes, Contents still advises only leaf constraints/rules (resolvers inherit;
the tray does not). **S5.5 is superseded**: `figure` is retired (SC.5), so "takes no interfaces"
becomes a `degree` constraint on a definition and the branch in `actions/edges.ts` comes out with
the form (SC.5, proven — heal → `block`; sample shaped block; interface-on-figure refusal removed).

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

**Parked from A0.3:** `fold` `isa` / `resolved` still read only local `graph.defs`, so a path-shaped
`extends` does not walk yet. *(The README dependency map is current again — `actions/`, `workspace/`
and `modules/`'s grown dependencies are all in it.)*

**The subtype chain reaches all five resolvers (SC.6).** `cardOf`, `styleOf`, `rulesOf`,
`constraintsOf` **and `viewOf`** read `resolved()`, so a subtype draws the parent's diamond and
inherits its view module. **`viewOf` was missed the first time** — the row said "the four
resolvers" and there are five; the conformance suite caught it. **Parked**: Contents still advises
only leaf constraints/rules on subtypes — not this row's owns.

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

### S6 — the rail comes out

**The rail is a separate thing and the app is whole without it** (design.md). *Take `src/terminal/`
out and everything still works* is the acceptance test — **S6.1–S6.3 landed**.

| Imports the rail | For | Status |
|---|---|---|
| `project.ts` | was `router`, `turn`, `workflows` + `pending` | **cut** (S6.1) — `looping()` registration |
| `page/Files.tsx` | was `Terms` | **cut** (S6.2) — `packages/terms/` |
| `page/App.tsx` | `Chat`, `Suggestion` | **optional** (S6.3) — `import.meta.glob` |
| `page/Readout.tsx` | `Scores` | **optional** (S6.3) |

- **An optional part that half the app imports is not optional.** Where the rail runs is undecided —
  currently fully local — and the design deliberately does not wait on that. What it does require is
  that including it is a choice. **S6.3 proves the page can omit it.**
- **`terms` moved to `packages/terms/`** (S6.2). **D.2 / A0.2** still need Clay — untouched by the
  detach.
- **Every capability the rail adds must exist without it.** If the only way to do something is to
  say it, the rail has stopped being optional. Worth checking against Z.8 when its scope is settled.
- **Parked**: Matching tab empty when Scores absent.

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
  that owns both ends. Ownership routes it, and nothing branches or merges. **The path is live
  (S4.9)**: `Effect.into` / `writeInto` / `home` — same door, undoable step in the target's log.
  **Parked**: App may not refresh after a foreign write; into()-style runner if needed.
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
  `mndflow.steps.v1` migrates once. Lazy keys, pressure API, and the strip note are *done*
  (S4.7): pristine makes no key; first change writes; `watchPressure` / `pressureNote`; strip
  shows the pressure note (suite/API + wire; quota hard to prove in-browser). Owns
  `graph/store.ts`, `project.ts`, `page/App.tsx`.
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
  import list is D.2 — **unblocked** now the terminal is no longer frozen.


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
| **U** The shell | `src/styles.css`, `page/App.tsx`, `page/Files.tsx` | G.9b / G.9c for the files it shares |
| **T** The suite | `tests/` | U for the page rows only |
| **Z** Terminal | `terminal/` | **everything above**, H especially |

**Startable today:** F.2 live bind+drift proof (`◐`); D.2 (**unblocked** — the terminal is no
longer frozen, and the A0.2 bridge is retired with that row); G.9a, then G.9b / G.9c / G.9d; the
`infer` trigger; and all of **U** except the two rows sharing files with G.9.

**No `◆` row is left.** G.9d is settled (the target decides) and Z.6 is answered
(`samples/docs.json`, keyed by definitions.md).

**The terminal is no longer parked, but it is still last.** It ranks and completes whatever the
surface offers, so building Z.1 against a surface Wave 2 is moving means building it twice. Z.2 and
Z.3 are self-contained and may go early. It stays the acceptance test for everything above.

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
| activity | a **view module**, plus a package of words (*done*, A.10). A behavior layer's default reading — **done** (A.7b) |
| state machine | a **view module** over the same layer — **done** (A.8) |
| sequence | a **view module** over the same layer — **done** (A.9). Messages are derived, not drawn |
| UML, SysML v2, UAF | packages — **done** (A.11): tables of definitions, names and mappings; ornaments as shape + size |

**Six view modules**: `block`, `table`, `matrix` for a structure and `activity`, `sequence`, `state`
for a behavior. Everything else is configuration or data. **Behaviour added one action** —
`infer`, the engine's — and it added no form and no mutation op. It also **removed** one: `figure`
went, because behaviour was the last candidate to place one and it places blocks, refs and groups.

- **`shaped` / `outline` on card** — *done* (A.6). Nothing stores a shape; the module computes one
  inside the engine's box. Diagram strokes from card / `lookOf` (S2.6b); activity counts and draws
  control nodes (A.7b). **This is also what retired `figure`**: shape plus the definition's `size`
  says every SysML ornament — a diamond for a decision, a thin `rect` for a fork bar, a small
  `ellipse` for an initial node. **The one gap is the activity-final double ring**, which wants a
  `style` that can stroke twice; nothing else needed a form — parked from A.7b.
- **requirements package** — *done* (A.3): `packages/requirements/` — requirement block (`id` /
  `text`, card `shows`) and five directed relationships. Data only.
- **parametrics package** — *done* (A.4): `packages/parametrics/` — constraint with size and style.
  Data only.
- **flow package** — *done* (A.5): `packages/flow/` — control flow, object flow (`item` ref),
  transition (trigger/guard/effect). Formal `names` landed with A.11.
- **behavior package** — *done* (A.10): `packages/behavior/` — `action` + `state` in
  `definitions.yaml`; words for activity / sequence / state with verb `do`. Activity view reads
  the verb for derived labels (A.7b). Formal `names` landed with A.11.
- **A.1** — table mounts when `view.module` is `table`; rows pick/open; proxy open withheld
  (*done*, proven). **Parked**: table chrome (crumbs / types) not hosted beside Table. **A.2** —
  matrix mounts when named (*done*, suite). **A.7a** — `infer` + `Effect.home` (*done*, suite 387).
  **Parked**: page chosen → `infer`. Cap is a tree slice, not connected-components. **A.7c** —
  `ViewModule` `word` / `creates` and `ViewConfig` `N` default 5 (*done*). **Parked**: create /
  `infer` not wired to `word` / `creates`. **A.7b** — activity mounts when `view.module` is
  `activity`; DIM in stage; dimmed labels/order proven. Owns include `base.ts` + App mount.
  **Parked**: RF framed host; gestures on activity plane; activity-final double ring;
  swimlanes-from-`performs` docs drift. **A.8** — state module + App mount; empty infer offer;
  Reading A/B; DIM proven. Owns include `base.ts` + App mount. **A.9** — sequence module + App
  mount; columns; directed then axis; DIM proven. Owns include `base.ts` + App mount. **A.11** —
  `packages/sysml|uml|uaf` + ornaments as shape/size; catalog load proven; formal `names` on
  behavior / flow / requirements / parametrics.
- **A behavior project owns its own tree.** It holds its actions and states, and **refs** to the
  participants; what it learns about a participant is written through the ref to the block, which is
  the ownership rule in S4 and not an exception to it.
- **The whole inference is [behaviors.md](behaviors.md)** — the four ordering tiers, lanes from the
  ref, the abstraction cap, derived labels, and what writes home. Two worked examples are kept there
  as the record of why. **What is still open is listed at the foot of that file.**
- **A behavior block's definition is `action` or `state`**, and a container one is an *activity*.
  **`view` carries `creates` / `word` and cap `N` (default 5)** (A.7c). Create / `infer` are not
  yet wired to those fields.
- **The IBD layout law is dropped** (was A.12). The view inside a child block already *is* an
  internal block diagram, so no separate law or module is wanted. On the not-in-queue list only, in
  case connectivity-ranked placement proves worth having on its own later.
- **A diagram binds gestures to actions**; the graph still holds all the state.
- **A lifeline is a column, and an occurrence on it is an action.** Which column follows from who
  the action refs (lanes from the ref — design; tasks once said `performs`, which is the docs drift
  parked under A.7b). **A message is derived**: an order relationship whose two ends are performed
  by different participants. Sequence needs an arrangement, not a layout law of its own, and needs
  nothing drawn that the activity did not already say.
- **A swimlane is derived from the ref** — the participant an action holds is the lane. Not a
  group, which cannot be empty, and not something anybody draws. *(tasks once said `performs` —
  correct that drift when next touching activity chrome; A.9 sequence columns follow the same
  ref rule.)*

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

- **`terms` live in `packages/terms/*.yaml`** — *done* (S6.2; was D.1 under `workflows/terms/`).
  Chips still read Module/Dependency until a vocabulary package supplies the words.
- **Take `domain` apart.** It became `graph.vocabulary` in the migration — a rename that decided
  nothing. It currently keys three concerns: a set of words, a set of starting relations, and a set
  of workflow prompts. **Relation seeds moved to `packages/core/`** (A0.2); the terminal still
  reads them through the seeding bridge until D.2 consumes A0.3's loader. **D.2 is unblocked** —
  the terminal is no longer frozen, so the bridge is retired as part of that row.
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
- **Icons.** A definition should be able to draw one as well as a boundary or a note. `layout: icon`
  renders a **glyph** today; no SVG and no set chosen. Retiring `figure` did not add to this — every
  ornament walked came out as a shape plus a size — but an actor still wants a real icon.
- **Multi-select in the explorer tree.** *Done* (E.4, proven): Shift/Meta builds `Chosen[]` across
  blocks, branches and projects. **Parked**: Ctrl on Windows; no distinct multi-select CSS; page
  chosen → `infer` not wired.
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
- **Rendered SVG beside the source** — *done* (F.3, proven): SVG download beside the JSON export.
  Owns include `modules/view/diagram/`, `graph/store.ts`, `page/App.tsx`, `project.ts`.
- **Reviewing a model change as JSON is poor.** Committing a rendered SVG beside the source makes a
  pull request readable — now available beside the source export.

### G — canvas polish

- **The context menu is designed** (G.9). **One set of offered actions** for the selection in its
  context, presented two ways. **The list is identical; only presentation differs** — the menu shows
  a **fixed** order, the rail orders by **learned preference for that context**. Ordering is the
  presenting surface's business and never the list's.
- **The list may not live in `terminal/`** (G.9a). The rail stays optional and S6.3's acceptance
  test is *delete `terminal/` and everything still runs* — a menu importing the rail would break it.
  So the list sits beside the action registry in `actions/`, and the rail is one consumer of it.
  **This is the load-bearing constraint**, not a tidiness point.
- **`infer`'s trigger is the menu** (G.9b). With the explorer as context and one or more blocks or
  projects selected, `infer` is one of the offered options. It needs no gesture of its own, and the
  built-but-unreachable A.7a action stops being unreachable.
- **The canvas right button is settled — the target decides** (G.9d). On **empty space** it still
  creates, unchanged. On **something that already exists** it opens the list for that thing. So the
  old rule holds where there is nothing to act on, and becomes *show me what this can do* where
  there is. `card→interface`, `frame→interface`, `edge→retype` and `selection→group` stop being
  immediate and become entries.
- **Right drags are untouched.** Card-to-card still draws a relationship and empty still makes a
  note. `gestures.ts` already separates a drag from a click by a distance threshold, so the menu
  costs no new concept — the click half of an existing split changes meaning, and the drag half
  does not.
- **`interface` loses its one-click path**, which is the real cost: it was a right-click on a card
  and becomes two steps. Worth watching once the menu is in — if it is the commonest thing done to
  a card, it may want to stay first in the fixed order.
- **The selection box.** *Done* (G.7, proven): both ends inside selects the edge; one end does not.
  Dead CSS: `.leg-grab` / `.leg-mark` still describe segment grab bands `Wire` no longer draws.
- **Esc after marquee.** Esc does not clear RF-selected edges after a marquee selection. Parked
  under gestures; not the selection-box row.
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

### U — the shell

The page does not survive a narrow window. **Breadcrumbs and the interface / relationship option
groups collide and overlap**; at high zoom or on a small screen **the explorer takes most of the
width**; and the **chrome icons are hard to tell apart**. Reasoning in design.md under *The shell
yields; the stage does not*.

- **Chrome yields, the stage does not.** Crumbs truncate, option groups collapse, the explorer
  bounds itself. What must never happen is chrome growing until it collides with itself.
- **A theme is not a style set.** `src/styles.css` is app chrome; root `styles/` is the `style`
  component's per-definition presentation (`sysml.ts`). Two meanings of one word, and they must not
  be merged — a user's colour preference does not belong where a definition's presentation lives.
  The current theme stays the default; **modern (blues)** and **light** join it.
- **The explorer must hold more than one project legibly**, which is what a bounded width costs and
  what per-view icons buy back. **Space between projects** is the cheapest half of it (U.17) — with
  several open, the tree currently reads as one long list rather than as several projects.
- **Adding a project opens the name prompt** (U.14). design.md: *a project comes into being by being
  named*, and storage never mints one. So the `＋` must not create a blank and file it — that is the
  silently-minted session project, removed as a bug, coming back through another door. The name is
  required and unique, checked on the way in.
- **A distinct icon per view module**, so a shrunken explorer stays readable. **Definition icons are
  a different want** and stream E already holds it (`layout: icon` renders a glyph; no SVG, no set
  chosen) — do not re-open it here.
- **The view toggle is a labelled control beside the project root**, not an icon that cycles.
  Cycling hides both what is available and what is current, and changes the canvas without saying
  why. Sticky **per project**, so descending a layer keeps it.
- **It writes nothing.** Which view is showing is a display preference — the same rule as
  `showPorts` and `angular`, and the reason is definitions.md's own test: *what belongs to a project
  is what is in the log*. The definition's `view.module` says how a layer **opens**; the toggle says
  what is on screen **now**. No sixth page action was added, so the closed set is untouched.
- **Table and matrix take Contents as their model** — both start partially open, as the panel does
  now, and expand to the full canvas. This is also where **A.1's parked table chrome** (crumbs /
  types, not hosted beside Table) finally lands.
- **Contents is not deleted.** It is the model. Definition and field editing (E.1–E.3), constraint
  and rule advice (S5.3) and type offers (SC.4) all stay where they are.
- **The rail's collapsed form is a minimal text entry with inline chips**, and its expanded form is
  laid out to match. **Click-to-focus is not this stream's** — G.9c owns it. What is U's is the
  **caret that does not sit where the text cursor is**, which is a rendering bug in the existing
  rail and shares `terminal/` with G.9c, so the two serialise.
- **Undo and redo read as words, at the foot of the explorer**, beside one line naming the last
  executed action. `Log.tsx` put them in the corner controls so that *reaching them never means
  opening anything first*; the foot of an always-visible explorer keeps that rule while giving them
  labels, so this moves the controls without overturning the reasoning.

**The readout comes out whole** (U.11) — the header toggle and all three tabs. What that touches
beyond the deletion:

- **`Relations.tsx` is today's only relation-vocabulary UI** — add, rename and drop a relation kind.
  It should be redundant: a relation kind **is a definition of relationship form**
  (definitions.md), Contents lists a `relationship` sort and edits `graph.defs` since E.1, and its
  `FORMS` list already carries `line` and `directed`. **The row must confirm that before deleting**,
  because if creating a relationship definition is not reachable from Contents, this removes a
  capability rather than a duplicate.
- **`Log.tsx` is orphaned by it.** The action history moves to future work below; U.12's
  last-action line keeps the one part of it worth glancing at.
- **`terminal/Scores.tsx` loses its only mount.** Leave the component — Z.1/Z.3 rank against
  exactly what it draws — but the page stops reaching into the rail for it, which **closes S6.3's
  parked** *"Matching tab empty when Scores absent"* by deleting the tab that was empty.

**The `＋` was doing three jobs** and one of them was backwards: new block
([Files.tsx:548](../src/page/Files.tsx#L548)), new relation kind (`Relations.tsx`, going with U.11), and
**discard-and-start-empty** ([App.tsx:511](../src/page/App.tsx#L511)) — which removed rather than added. U.11
retires the second. The other two split by **scope**, which is the rule worth stating:

- **The header is workspace-scoped; the explorer is project-scoped.** Adding a project is filing,
  and filing belongs to the tree that shows the filing. So the header keeps only *clear the session
  and start a new workspace* (U.13), and the explorer's `＋` gains *add a project* (U.14).
- **A new workspace is a bigger thing than a new project**, since it drops every open project at
  once. It **reads as a word rather than a glyph** — rare and destructive is exactly when a label
  beats an icon, and it is the same move U.12 makes for undo and redo. **It lands on a state the
  design already wants**: a fresh session has no project and says so, so clearing to nothing is the
  designed opening rather than a special empty case.
- **Adding a project is a workspace operation**, `admit` with a blank graph — the way unlock and
  fork are (S4.8), and not a registry action. No page action was added, so that enumerated set is
  untouched.
- **Blocks keep a one-click path.** The explorer `＋` follows the selection exactly as the canvas
  right button does (G.9d, *the target decides*): a project or nothing selected makes a **project**,
  a block selected makes a **block** under it. This is **not** the hidden state U.8 rejects — the
  selection is visible and the tooltip names what the button will do. **G.9b's right-click list
  offers both regardless**, so the gesture path never depends on guessing the selection right.

**The canvas options have three idioms and no rule** (U.15). `chrome.tsx`'s `Toggles` is eight
controls picking freely between them:

| | Reads | Is |
|---|---|---|
| interfaces | `□ interfaces` / `· interfaces` | glyph **and** word |
| what a right drag makes | `— plain` / `⇥ directed` | glyph **and** word |
| angles / curves | `⌐` / `~` | glyph **only** |
| relationship types | `⊂ name` / `· types` | glyph **and** word |
| axis | `·` `→` `↓` | glyph **only**, and a **radio row** where types and form are **one cycling button** |

- **Every control carries a word**, the glyph reduced to a scanning aid. It is the same move U.12
  and U.13 make, and the complaint that the marks are indistinguishable is only fatal while a mark
  is the *whole* label.
- **No mark may mean two things** (U.2). `·` currently means *interfaces off*, *all types* and *no
  axis*; `⊙` and `◌` are one circle for *radial* and *relax*; `▦ ▤ ▥` are three hatched squares for
  *grid*, *across* and *down*. This is the root of "the icons all look the same" and it is a
  vocabulary fault, not a drawing one — so U.2 is the foundation U.9 and U.15 both stand on.
- **Grouped by subject, vertically** — *interface*, *relation*, *flow*, *arrangement*. `angular`
  belongs with **relation** (it is how a line draws), `axis` with **flow** (it is which way the
  layer reads, and it biases rank, placement and routing).
- **The verbs leave the bar** (U.16) rather than becoming a fourth group. design.md says *toolbars
  divide by states against verbs, which is why the two sit far apart* — grouping the bar by subject
  would put a one-time verb beside a setting and quietly overturn that. Instead the arrangements go
  where G.9d already sends them: **the frame is the layer**, so right-clicking it offers what can be
  done to the layer. The bar is left holding states only, which is what makes one design language
  possible at all.

**Contended owns, declared.** `terminal/` with **G.9c** and Wave Z; `modules/view/diagram/chrome.tsx`
between **U.2**, **U.15** and **U.16**, serial in that order; `page/Relations.tsx` with stream **E**,
which U.11 deletes rather than edits, so take it when E is quiet.

**`page/Files.tsx` is this wave's contended file** — U.2, U.3, U.8, U.12, U.14 and U.17 all reach
it, and so does G.9b. That is the shape `Canvas.tsx` and `Contents.tsx` had before their seams were
cut, and **no row here cuts one**: the file is 600 lines and this wave will grow it. Recorded so the
next structural row is chosen knowing it, and so the order in plan.md is followed rather than
rediscovered. None of it is parallelisable.

### T — the suite

The gaps *What the review found* named, now rows. **T owns `tests/` alone**, so no test row ever
contends with an implementation row — which is the practical benefit of tests having moved out of
`src/`.

- **Five of seven action modules have no test** (T.1) — `edges`, `elements`, `fields`, `groups`,
  `layer`. Only `behavior.ts` and the registry are covered. The trigger was already written down
  under *Deliberately untested*: **once actions are pure `(graph, args) -> Effect` they are worth a
  suite**, and S1.6 landed that. Properties only — an action returns the mutations it claims,
  refuses through `check` rather than throwing, and writes nothing when it refuses.
- **The page layer has no tests at all**, and it is where every browser-found bug lived. It splits
  in two by whether Wave U is about to rewrite it. **`Contents.tsx` is startable now** (T.2): U.7
  models table and matrix *on* it but does not rewrite it, so a suite there survives the wave.
  **`App.tsx`, `Files.tsx` and `Panel.tsx` wait for U** (T.3), because U rewrites the header, the
  explorer and the chrome, and a suite written first would be thrown away with them. That is the
  project's own rule applied to itself: *do not write tests for a design that is still moving*.
- **44 behaviour-view tests prove less than their count suggests** (T.4). `activity`, `state` and
  `sequence` render what `infer` produces, over hand-built fixtures, and `infer` has no call site —
  so they cover the renderers and not the feature. G.9b gives it one; then a single test walks
  selection → `infer` → drawn, and the caveat retires.
- **The terminal stays deliberately uncovered** and gets no T row. Stream Z is about to change its
  shape, so a suite now would be rewritten by it — the same reasoning as T.3, and the reason no row
  exists rather than a row that waits.

### Z — terminal

*The acceptance test for everything above.* **Unfrozen since S6 and no longer parked — queued
behind Wave 2**, because Z.1's ranking still reads a surface Wave 2 is moving, and building it
first means building it twice. Z.2 and Z.3 are self-contained and startable ahead of it. What it is
for is settled — see design.md under *The terminal*. **Nothing in Z needs Clay any more**: Z.6 is
answered below.

- **It is not a command palette.** The one text entry point over the workspace: it ranks, completes
  and surfaces documentation, and adapts to a person's wording. An editor host's palette and console
  replace none of it.
- **It never changes context**, because it ranks against context — moving it would shift the
  option list under the sentence being typed. The explorer and the pointer navigate.
- **It is wholly client-side as scoped.** Z.8 is a lookup and a sort, so nothing in the rail as
  planned needs a server. The old "may not be client-side" caveat is retired with the
  natural-language half it belonged to.
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
- **Documentation lives in `samples/docs.json`**, keyed by the terms in
  [definitions.md](definitions.md) (Z.6). Hand-authored, and starting small — **no generator**,
  which is exactly the unasked-for build step somebody would otherwise add. This puts Z.6 in stream
  **H**'s owns, so the two serialise.
- **One doc hit, ranked last** (Z.8). The ranked list is actions plus at most a single documentation
  result, chosen on the most relevant keyword and always the final option — so it is available
  without ever displacing something actionable.
- **There is no rename** (Z.7). `rail` stays the word in the code and the docs; **"Page
  Intelligence"** is user-facing copy and nothing more. The row costs a string, not a refactor.


## Out of scope, recorded so nothing is built on it

- **Action history, displayed another way** — **future work, deliberately unscheduled.** U.11 deletes
  `Log.tsx` with the readout, and U.12 keeps only the last executed action, on one line at the foot
  of the explorer. Going back through the history was never offered even by `Log.tsx`, so nothing
  regresses; what a fuller history should look like, and where it should live, is undecided. The
  data is not at risk either way — the log **is** the project, so any future surface folds from what
  is already stored.
- **Natural language over the workspace** — a sentence that *makes or changes* something rather than
  naming one action. It stays the aim (design.md, *The terminal*) and is **deliberately not
  scheduled**: Z.8 is now ranked completion plus one documentation hit, which is a lookup and a sort.
  Recorded here because this is the one thing that would reopen *where the rail runs* — understanding
  a sentence may not fit in a tab, and the "must work with it unavailable" rule would come back with
  it. Nothing may be built assuming it is coming.
- **Merging two divergent logs.** A project file is a single-owner asset, like a `.psd`. Git's line
  merge or nothing; `check.ts` reports the wreckage of a bad merge rather than preventing it.
- **Local variation, for multi-user work.** Somewhere for a view to hold a change that never
  reaches the project it read — with an explicit promotion later. It cannot hang off a proxy: a
  proxy carries nothing but where it sits, so it would need a mechanism of its own. An enterprise
  and multi-user concern; for one user it is an extra step on the commonest path, so writes go
  straight home instead. An extension to add when there is somebody to add it for.
- **A live store for real multi-user work.** *(A cloud **drive** as an export destination is not
  this: it is a place one file is sent, with no sync and no server holding the project.)* Files plus git give one-owner-at-a-time, which is
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

**Every test lives in `tests/`, mirroring `src/`.** A module's `index.ts` is tested by its folder's
name — `src/modules/card/index.ts` → `tests/modules/card.test.ts`. They moved out of `src/` once the
structure stopped changing; before that, keeping a test beside its module was what made moving a
module cheap, and that is no longer the common operation.

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

### What the review found

**440 tests. The problem was never quality — it was shape.** Read end to end, the tests are
outcome-shaped and well named (*leaves no trace of a reverted step*, *keeps a proxy whose target is
gone*). They are why S3.1's 22 deletions and the S6 detach landed without drama. **Culling for its
own sake would cost more than it saves.** Three findings instead:

- **The page layer has no tests at all.** `App.tsx`, `Files.tsx`, `Panel.tsx` and `Contents.tsx` —
  about 3,600 lines, and `Contents.tsx` alone is the largest file in the tree — are covered by
  nothing. Every bug found by driving the browser lived here or in the seam below it. This is the
  gap, not the redundancy. **Now rows T.2 and T.3**, split by whether Wave U rewrites the file.
- **The storage journey is now covered** — `tests/lifecycle.test.ts` gained *work, reload, still
  there*. It goes through `saveProject` / `loadProject` rather than `file.write` / `file.read`, which
  is what the old "integration" test actually did. Reintroducing the import bug now fails **three**
  tests; before, it failed none.
- **The duplicated conformance tests are consolidated** — *done*. 46 near-identical tests came out
  of eleven module files and `tests/modules/conformance.test.ts` runs the contract over every
  published component and registered module instead. **It found a real bug on its first run**:
  `viewOf` still read the leaf definition, so SC.6 had wired four resolvers and there are **five**.
  A subtype inherited no view. That is the argument for the shape — the copied version could not
  have caught it, because `view`'s own file never had the test to copy.

**The rule changed to allow it.** *One test file per module, beside the module* is retired: tests
live in `tests/` mirroring `src/`, and a contract kept by many modules is tested once over all of
them. Keeping a test beside its module made moving a module cheap, and moving modules stopped being
the common operation.

**44 tests cover a feature nothing can reach.** `activity`, `state` and `sequence` render what
`infer` produces, and `infer` still has no call site — G.9b is its trigger and is unbuilt. They test
renderers over hand-built fixtures. Keep, but they prove less than their count suggests. **Now row
T.4**, which walks the whole path once the trigger exists.

**Deliberately untested:** the terminal — `router`, `turn`, `workflows` — whose shape stream Z is
about to change, so a suite now would be rewritten by it; `embed`, `match` and `suggest`, which
need a model *(and which Z.8's scope-down does not summon — it is a keyword lookup, not a model)*;
and `project`, whose actions are thin wrappers
over mutations `fold` already covers. Each is a judgement to revisit. **The last of these has been
revisited and is now T.1**: S1.6 made actions pure `(graph, args) -> Effect`, which is exactly the
condition that made them worth a suite, and five of the seven modules still have none. The terminal
stays uncovered on purpose and gets no row — stream Z changes its shape, so a suite would be
rewritten by it.
