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

**Nothing is frozen any more.** The rail was unfrozen with S6; the **visual style** was unfrozen as
stream **U**. Its boundary — *chrome never recolours a card, route or frame* — held through U and V
and is **reversed by `Y.5`–`Y.7`**: the theme becomes a ramp of hue slots and fixed-function steps,
and a definition picks **a slot and an intensity, never a colour**. Presentation still lives on the
definition — what narrows is what it may say. The default look must not change.

**The rail is detachable.** `project.ts` no longer imports the terminal — question loop registers
via `looping()` (S6.1). `packages/terms/` holds vocabulary; `Files.tsx` is free of the rail
(S6.2). **Page mount is optional** via `import.meta.glob` — Chat mounts when `terminal/` is
present; a build without it still runs (S6.3, proven). **U.11 landed**: readout gone, so Scores
has no page mount (component still unmounted — remount when ranking needs a surface). **Z.1 /
Z.2 / Z.3 landed**: collapsed chips rank by embedding when typed; idle by shape-weighted
preference; overrule feedback in sticky storage; Chat warms embeddings; `suggest.ts` gone.

**The suite can now see a broken canvas** (*done*, T.6, proven; browser skipped) —
`tests/canvas/layer.test.ts` mounts a layer. **`C.11` turned the remaining assertion green**: after
a link the relationship is in the DOM. One perch per arriving relationship already holds; a note
keeps its handles.

**`T.7` landed and passes**: `tests/structure.test.ts` walks every import under `src/` against one allowlist; README.md points at it. `C.9` inverted the arrows, and legal imports do not trip it.

**A batch was driven on 2026-08-20** (`B.2`, `B.7`, `N.1`, `C.2`, `C.4`, `C.5`, `C.7`). Four rows came through whole; `N.1` remains short and puts **defects 21–30** on the list below.
**`C.11` closed 21** (and `C.2`'s drawing remainder): a new relationship draws immediately; `T.6`
is green. `C.9` also closed the cross-project naming remainder and defect 24. Remaining repair is `C.10`, with `N.8` in [plan.md](plan.md).

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


## What the closing review found

Nine defects over the three-wave pass, queued as `R.1`–`R.5`. **The offered-action list's
argument-filling layer holds most of them**, and two rules cause the damage:

- **`fill_args` assigns the same focused element id to every unfilled `element` argument.** `tie`
  takes `note` and `holder`, so both become the focused card and the menu **writes a self-loop tie
  into the log** — `check` passes, so it commits. `leave` gets `id === group` and refuses "Not a
  group." on everything.
- **`can_fill` inspects `spot` / `choice` / `number` / `element` and never `text`.** So `field`,
  `unfield` and `undefine` prompt for a raw holder or definition id and always refuse.

**The three functions are copy-pasted into `offer.tsx`, `Files.tsx` and `rank.ts`, and have already
diverged** — the explorer and rail copies lack the `interface` guard the diagram copy has, so
*Interface* is offered everywhere and always refuses. That duplication is why one mistake became
three bugs, and it is `R.2`.

**One regression outside the menu**: `Contents.offerings` keys on `graph.vocabulary`, which
`workspace.started` never sets, so **a project created from the explorer has an empty type picker**
where it used to have the whole shipped catalog (`R.3`). It arrived with D.2 and is the first thing
a new user meets.

**Not defects, recorded so they are not mistaken for them**: `workspace.begin`, `packagesOf`,
`store.hold` and `store.probe` are exercised only by tests and have no production callers. `begin`
is wired now (U.18); the other three are reached through paths the suite covers.

**`R.1`–`R.4` landed and were driven.** The filling layer is one module, `src/actions/fill.ts`, on
two rules: an element argument takes a candidate **of its own**, and one carrying a `form` takes a
candidate of that form; text is the surface's business, and only an argument declaring a `prompt` is
askable. Each surface keeps a `seed` of what it alone knows. Two things worth keeping from doing it:

- **A green suite proved nothing here.** All 574 tests passed with every one of these bugs live,
  because none of them had a test. The browser found them and the browser confirmed the fixes.
- **The first fix for `R.3` was wrong and the new test caught it.** `started()` seeded
  `pkg_core`, and **there is no such package**: `packages/core/` has no `definitions.yaml`, so
  `nameOf` keys each file there by its own stem — `pkg_freeform`, `pkg_product`, and so on. The
  vocabulary pointed at nothing and `gather` silently skipped it, so the picker would still have
  been empty. Driving it could not see this, because the log looked right; the property test —
  *the vocabulary a new project starts with yields offerings* — is what failed.

### Stories, and why a landed row is not a finished goal

**Clay's process change.** A **story** is a goal somebody has — *reorganising is
easy* — and it spans several rows. Rows land the ordinary way; **a story is
closed only when Clay has driven it himself**, and no agent and no green suite
closes one. Recorded in plan.md (*Stories*) and in CLAUDE.md's *Finishing a
chunk*.

**The reason is this project's own history.** Every real defect came from
driving the built app, and **a row can land exactly as written while the thing
it was part of is still unusable**. `V.14`'s `＋` did name a project, correctly,
behind a gesture nobody could see: the rows were done and the story was not.
`P.1` repeated it — the move works, using it does not.

**What driving `P.1` turned up** (all `ST.1`, all rows now):

- **Nesting by drag reads as impossible.** It is **not** a logic gap — `move`
  accepts it and refuses only a move into itself or into a reference. The tree
  has one flat dashed outline where the canvas has grazing and a lit target, and
  **a folded branch never opens under the pointer**, so a nested target cannot
  be reached. `P.14`.
- **A cross-project drop looks like nothing happened**, because the source tree
  refolds on the next click rather than on the drop. `P.15`.
- **The strip should stop announcing a plain move** — a fluid gesture needs no
  receipt (Clay's call). **A relationship left behind is still said**, since
  that is the one part the gesture cannot show. `P.15`.
- **The panel should be titled *Workspace***: *explorer* names the pane,
  **workspace** names what is in it. And **its title is the workspace's own
  row** — which is the door `P.10` was looking for, found rather than invented.
  `P.13`.

### Is the language getting in the way? Measured, and yes

**Clay asked; it is checkable rather than a matter of taste.** definitions.md
holds **149 terms**, and three of the most-used mean three different things
each — `context`, `view` and `scope`. `U.2` set the rule *no mark means two
things* for icons and it was never applied to the words. `R.10` — the explorer
menu writing to the project in context rather than the one clicked — is what
that costs: two meanings of `context` sitting in one file.

**The words to reach for already exist.** definitions.md says a layer *is* the
current scope, and the code has called the selection `picked` all along. So
`view` → `layer`, `contextId` → `project`, and *context* → *selection*.
Measured cost: `view` 257 sites under `src/`, `contextId` 29 — which is why
`S8` is three rows and not one.

**The abstraction itself is not the problem.** *Everything is a block, and what
kind it is, is derived* is one idea, not many, and it survives the check: a
project, a container, an interface and a set are all blocks, and every one of
them is told apart by what it holds or where it sits. **The naming is what
drifted**, and it drifted in the places two subsystems met.

### The workspace was already the root

**Clay's reading turned out to be the built model with no door on it**, which
is the shape of every gap this stream has found:

- `Held.id` **is a project id**; the workspace's graph is keyed and folded from
  its own log exactly like any other (`graphOf(held.id)`).
- Its log already records `admit`, `forget` and `folder`.
- actions.md has said *"the workspace is a project … it has no actions of its
  own"* since S4.
- **What is missing**: it is never `contextId` and has no row of its own, so it
  can never be on the stage. `P.10`.

**Where the line between the two histories falls was already decided**, and it
is sharper than *cross-project actions*: **a change is recorded where its
element lives** (`workspace/`'s own first paragraph, through `Effect.into` /
`writeInto`). Admitting a project writes the workspace's log because the proxy
is the workspace's element; renaming a block writes that project's because the
block is its. **Import and export fall straight out** — a project export is one
log, a workspace export is the workspace's plus the logs it names (S4.6).
**That rule lives in a module comment**, which is where a rule goes to be
forgotten; `P.11` moves it into design.md and holds it with a property test.

**One inconsistency `P.1` introduced and nobody decided.** A promoted subtree
now **copies** the definitions it names, so its types survive. But a package is
**referenced** by path and deliberately never copied. That is two mechanisms for
one idea, arrived at by accident. `P.12` is Clay's call.

### Stream P — making a project, and saving a view

> **The model-B reading below is SUPERSEDED by the simplified block model** (Clay, 2026-08-18,
> later the same day) — see *Open questions* at the head of this file. A **set** derived from what
> its members are is gone; a **folder** is an ordinary definition and a **view** holds
> **references**. The rest of this stream — the doors, the drags, the two logs, the bugs — stands.
> Kept for the record of what was tried and why it did not hold.

**Clay played with the built app and could not make a project.** Four things
were expected; **none of them work**, checked against the code:

- `＋` names a project only after clicking empty tree space to deselect first.
- The empty tree area has **no drop target at all**.
- Drag is wired only *inside* the project in context, so no block can cross.
- `workspace.folder()` is built and **has no caller** — folders render, nothing
  makes one.

**plan.md predicted the first one exactly**: *click nothing to enable something
is obvious to whoever built it and invisible to everyone else*. That prediction
coming true on the first play is the evidence `V.14`'s gesture cannot be the
only door. It is not reversed — it gains a visible sibling.

**The rule Clay wants**: a project is a block that nothing contains. Making one
is making a top-level block; promoting one is moving a block to the top.

**Settled — nothing is left behind** when a block leaves. It takes its subtree;
relationships from its old siblings go with it the way `delete`'s partings
already do. Against a proxy standing in for it, which was the other option.
**The consequence is silent data loss on the lines**, so the strip has to name
what went.

**A move across projects is two steps in two logs.** A project is a log, not
only a place. That is already the rule everywhere (`Effect.into` / `writeInto`,
`home` batches: *never a single step spanning two logs*). Undo in the source
brings the block back; it does not remove the project that was made.

**`A.7d` was mis-framed and is retired into this stream.** It read as *`infer`
needs a hook to admit its project*. It is not: the explorer has no way to make a
project that does not begin with an invisible gesture, so `infer` was being
asked for a door the app does not have. Cut the door and `infer` needs nothing.

**The larger ask, and the design already named it.** What is wanted is a
requirements table, or an allocation view over a cross-section of several
projects, stored and organised freely. spec.md has carried the concept as
**(planned)** since W0 — *a **set** is whatever it holds proxies of*, and *a
view appears as a root like any other and lists what it holds proxies of*. So a
saved view is a **set**: a block whose members are proxies of things elsewhere.
`Chosen[]` picks the cross-section (E.4), `refer` places each proxy, and the
sticky view module decides whether it reads as a table or a matrix — all built.

**`infer` is the existing proof.** It already takes a cross-project selection
and mints a project holding proxies of the participants. It is the *behavior*
special case of the general move, which is why generalising it beats inventing a
second mechanism.

**How the kinds are told apart — derived, never declared.** `role_of` already
reads a node's role from what it holds and where it sits; *members are proxies*
is one more line of it. **And that answers the folder**: a folder is a set whose
proxies are project roots, which is what the workspace itself already is, since
`admit` files a project by placing a proxy of its root. So there is no folder
concept to add — the recommendation deletes one.

~~**Settled — model B, Clay's call.** A set is **derived**: a block whose members
are proxies. No stored field, no `components.set` key, and **no folder concept**
— filing is a set of projects. `workspace.folder()` stays dead. A set wears a
folder mark.~~ **Reversed the same day.** Mixedness was never the signal — a
folder of five structure blocks is still a folder — and *set* collided with
*style set* and *closed set*. **`folder` is an ordinary definition**, `set` is
retired, and a **view** is the thing that holds references.

**And a second rule from the same conversation**: *every node role carries a
mark of its own*. Block, container and interface have theirs. **Two do not**:

- **a set has no mark**, so it would read as a container — `P.5`.
- **a behavior cannot be reached at all.** Nothing anywhere writes
  `components.view.module`, and `offered(graph)` filters the view toggle to the
  modules of the project's own kind, where kind is read back off that same key.
  A fresh project's root has no definition, so it is `block`, so it is
  *structure*, so activity / sequence / state are never offered. **A one-way
  door with nothing that opens it** — the only behavior projects that can exist
  are `infer`'s, and those are unreachable. `P.6`.

V.2's property test already holds that no two icon names draw one path; the
missing half is that every *role* has one, which is what `P.5` adds to the icon
conformance test.

**Recorded, not scheduled**: a set holds proxies of *whole blocks*. *These three
fields of those five blocks* is a column selection — a different shape, and one
a requirements table may want. It should arrive by decision, not by the back
door.

**`P.1` landed and was driven.** Three things it turned up that the row did not
name:

- **The drag payload was a bare element id**, so even where a row was draggable
  it could not say which log the block was leaving. It is a cross-project ref
  now — which `refer` has always accepted and nothing ever handed it.
- **A promoted block was landing *inside* a project of its own name.** Clay's
  rule is that the block **is** the project, so it becomes the destination's
  root and everything pointing at it points at root instead.
- **Definitions have to travel.** Without them a promoted block loses its types
  silently — the same class of quiet loss the strip exists to prevent — so
  `extraction()` carries the definitions the subtree names and the package
  import list with it.

**Two bugs the closing review found, both fixed with tests.** *(a)*
`set_vocabulary` was written **flat**, so moving a block into an existing project
replaced that project's package list with the source's — silent loss in a part
of the project the drag never touched. It unions now, keeping import order.
*(b)* The two logs are written one after the other, so a source that turned out
to be **locked after the destination had already taken the subtree** left the
block in both projects; the lock is checked before either write.

**Recorded, not fixed**: a copied definition's `extends` can point at a parent no
moved element named, leaving it dangling. It degrades safely — SC.2's walk ends
at a missing parent — and `P.12` decides copy-versus-reference anyway.

**The refold defect became `P.15`**, not a park: Clay hit it, so it is a row
under story `ST.1`.

### The style surface closed

**`Y.7` and `Y.9` landed and were driven.** `Definition.color` is gone and
`components.style` carries four closed dials instead: `slot` (six hue families),
`emphasis` (`quiet|normal|strong`), `weight` (`hairline|thin|thick`) and `voice`
(`quiet|normal|loud`). Nothing a definition can set is a colour, a pixel count or
a font. Driven: setting all four on `Module` moved every usage's border from
`oklch(0.42 .0855 150)` at 1px to `oklch(0.8 .12 330)` at 2px with its name at
700, and the door refuses `slot: "magenta"` by name — *`style.slot` has to be one
of primary, secondary, tertiary, quaternary, neutral, muted*.

**One judgement the row did not settle.** *A definition that says nothing gets
`neutral` / `normal`* is true of a definition — but a usage with **no type at
all** has no definition to read, so it keeps the engine's own default (`--route`,
`--border`) rather than the neutral slot. Otherwise *no type yet* and
*deliberately quiet* draw the same, and the untyped canvas would lose its green.
`Look.typed` is the flag.

**The name collision is settled: `voice`.** `components.card.label` means *where
the label sits*; the style dial is `components.style.voice` — *how loudly the
name is set*. Clay's call, taken because one word meaning two things is what U.2
exists to stop, and `Contents.tsx` was already aliasing a constant to import
both.

### The offered list grew a rule

**`Y.4` closed its `◐`.** The rail builds the `types` group now, so table and matrix stopped
drawing an inline cycle each. **`types` is the one group the page cannot build from its own state**
— a table filters by the definition names on its rows, a matrix by the relationship marks in its
cells — so `ViewModule` gained a `types` answer beside `chrome`: an icon and a function from the
layer to the kinds on it. Declaring the group without answering it now fails the module conformance
contract, so the two cannot drift. **A pick that is no longer on the layer reads as *everything***,
which is why nothing has to be reset on navigation.

**`R.5`–`R.8` and `R.10` / `R.11` landed and were driven.** Five things, one theme: the menu was
thin because a rule was missing, not because entries had been forgotten.

- **A required `choice` expands into one entry per option** (`R.5`). `expand` on the descriptor,
  `entries()` in `actions/fill.ts`, and both menus call it — so the canvas and the explorer cannot
  drift the way the three copied fill functions did. `mark`, `direct` and `reform` carry it;
  `axis` and `arrange` deliberately do not, since the bar and the `.shape` cluster are their doors.
  **The action set does not widen**: one registered action, offered N times with different args.
- **`direct` and `reform` now have a home** (`R.6`) — the edge menu, proven end to end: *Directed*
  turns a plain line into a directed one and *Back* moves the arrowhead to the other end.
- **A directed relationship draws an arrowhead** (`R.7`). The form says there is a direction and
  `dir` only refines which way, which is how `behavior.ts` has always read it; the canvas required
  an explicit `dir` and so drew nothing for every edge the toolbar makes.
- **`Scope.on` takes a list** (`G.9e`), so `retype` is offered on an edge. Widening a descriptor's
  own field is not widening the closed action set.
- **The explorer menu writes where it was clicked** (`R.10`). It built its context from the project
  in context whatever the row, so a menu on B's row wrote A's log. It now builds from the row's own
  project and brings that project into context, which is what the left-click path always did.
- **An empty domain stem is not a repair** (`R.11`). Normalising `""` to `[]` carried nothing, so
  every pre-migration project without a domain opened with a trouble notice it did not earn.
- **actions.md gained a Does column** (`R.8`), copied from each descriptor's `about`. The
  descriptor stays the source.

**Watch, unresolved**: an edge menu now reads `Create Retype Refer Up Unlink Flip None Forward Back
Both Line Directed Note Define Relax Vocabulary` — sixteen flat entries with the four directions and
two forms unlabelled. It is legible because the options sit together in `ORDER`, but **`X.2`'s capped
list is what makes it good**, and a large vocabulary will make it worse before then.

### The tray, the table and the strip

**Contents already *is* the table view**, stuck at one size. Not a thing to move: U.7 already said
*both open partially, as the panel does now, and expand to the full canvas*, and landed `◐` on
exactly that — expand does not cover or replace Contents. The shipped `table` module's own listing is
the duplicate.

**The rule the rest falls out of: the tray shows the contents of whatever is in focus** — a block its
fields, a group its members, a note its text, a relationship its ends and what it could be. That is
why the capped type list stopped looking like a relationship special case: it is the *what could this
be* half of the same tray.

> **Superseded in shape by `W.5` / `W.6`** (Clay, 2026-08-20). *The tray and the table are the same
> thing* was a **placeholder**. The tray is a layer-and-selection inspector with **two** sizes and
> keeps the hover-to-canvas tie; **table and matrix are stage views, always full**, and own column
> choice and explorer drops instead. The reasoning below still explains why *focus* drives the tray;
> it no longer explains what the table is.

**The two sizes take different inputs.** **Full** — the `table` view on the stage — shows the layer
and everything in it, and **the selection does not narrow it**. **Partial** — the tray at the foot —
is that same table **scoped to what is in focus**. With nothing in focus the two agree, so *expand*
is only a size. Taking different inputs is what keeps this clear of the hidden state U.8 rejected:
the two never disagree about one input. A full stage given over to one note's text was the tell that
focus should not drive both.

**Matrix should be a heatmap** — the one thing a grid gives that a listing does not. **Hue is the
relationship kind, opacity is the count**: transparent at zero, grading up, so both dimensions read
at once without a mode switch. **The hue is the definition's existing `style`** (`styleOf` /
`lookOf`, `styles/sysml.ts`) — never a new matrix palette, so the matrix and the diagram cannot
disagree and there is no second colour vocabulary to keep in step. A cell holding two kinds draws as
**bands**, degrading to a solid cell in the common single-kind case.

**U.7 modelled table and matrix on Contents and deliberately did not delete it**, so this
duplication was known and accepted at the time; what changed is that the duplication turned out to
be the wrong way round.

### Listing the types in scope

**Three surfaces ask the same question** — the edge context menu, the selection strip and the canvas
*relation types* group — and each grows with the vocabulary. **One rule**: top three ranked by use,
a *More…* that expands in place, scrolling past a height, and no submenus. The relation types group
is the exception at three and no expansion, being a setting inline beside the crumbs rather than a
list of things to act on.

**The ranking already exists and is in the wrong place.** `Z.3` computes shape-weighted learned
preference in `terminal/rank.ts` and `terminal/feedback.ts` — measured *use*, which is what "the
three most common" should mean — but `terminal/` is **optional** (S6.3: delete it and the app still
runs). A menu ranking by preference therefore cannot live downstream of the rail, which is the same
argument that put `offer()` in `actions/` rather than `terminal/` (G.9a). Moving it also gives Z.3 a
second consumer; until now it ranked rail chips alone. **Cold start** falls back to vocabulary import
order, which Contents already uses for type offerings (D.2), so a fresh project needs no new rule.

**A typed name is a type.** The strip carries a text field beside the capped list: type a name and
the selection takes it. **Already built** — `fold.defineNamed` mints a definition for a bare name
under a derived id and describes itself as *the bridge from free text to a real definition*, and the
suite holds it. **Match before minting**: a free-text mint derives its id from the name while a
deliberate definition carries its own, so typing a name already in scope would produce a twin — the
duplicate-name case SC.4 needed disambiguation for.

**The strip re-defines the selected thing, never its type.** Name, which type it is, field values —
all instance-level. What fields a *type* carries and how it presents stays behind deselect on the
types chip (`W.3`). Splitting it the other way rebuilds, somewhere new, the duplication U.11 deleted
`Relations.tsx` to remove.

### Where each action lives

**A required `choice` is a question no menu asks**, so five actions were withheld from every offered
list while holding reserved `ORDER` slots — `mark` (`flow`), `direct` (`dir`), `reform` (`form`),
`axis` (`axis`), `arrange` (`shape`). Driving it: a card's menu offers *Relax* but never *Mark* or
*Arrange*. Asking where each of the five actually lives turned up more than the original defect.

| | Home | |
|---|---|---|
| `axis` | canvas bar, *flow* group | fine |
| `arrange` | `.shape` cluster, bottom right | fine |
| `mark` | Panel and Contents, `onMarkPort` — an interface's flow | fine |
| `direct` | — | **homeless** |
| `reform` | — | **homeless** |

**`direct` and `reform` have no home at all.** The canvas relation group is `onForm`, a **draft**
setting for what the *next* right-drag draws — a display preference beside `showPorts` and `angular`,
recorded as such under S2.6. It never touches an existing edge. `project.direct` / `setDir` /
`reform` exist and nothing calls them, so **once a relationship is drawn, its direction and its form
cannot be changed anywhere**.

**Settled — the options become the entries.** Right-clicking a relationship lists the relation types
and forms themselves rather than an action that then asks which. No submenu, and no open text prompt.
The list is tailored to the target because the options are. **It does not widen the closed action
set**: one registered action offered N times with different args, which is the wording U.16 used
before it was dropped. The flag goes on the **descriptor** (`expand`), keeping one rule instead of
the per-surface special-casing R.2 removed; `arrange` and `axis` leave it off because they have
homes. **Watch**: an edge menu then lists every relation type in the project.

**Two things fell out of the same question.** A **directed relationship draws no arrowhead**, so
direction is invisible even where the graph holds it — `direct` being unreachable is what hid it,
and arrowheads are the engine's visual language rather than chrome, so it is not Wave V's. And
**actions.md never says what an action does** — name, scope, arguments, mutations and what each
replaced, but no description, which is why `reform` had to be read out of the source. The text
already exists as `about`, required on all 29 descriptors.


## Open questions

*Kept at the front. Everything here blocks something in [plan.md](plan.md).*

### The simplified block model — settled, and what it left open

**Settled 2026-08-18 (Clay).** One block, no element forms; `proxy` → **reference**; `ref` the
value form → **`link`**; `set` → **folder**, an ordinary definition; **no `kind`** — behavior is one
package plus three view modules; `view` holds **references only** and the engine enforces it.
Vocabulary in [definitions.md](definitions.md), reasoning in [design.md](design.md) under *The
simplified block model*, queue shape in [plan.md](plan.md) under stream **B**.

**Closed by it, so nothing is owed:** the *kind signal* and *kind by fiat* repairs, `P.6`, `P.5`'s
mixed-children reading, and `S8.3`.

**Answered 2026-08-19 (Clay).** The six that were open:

| | Answer |
|---|---|
| **B-a** | **The engine keys off registered modules.** A **block module** is code behind one sort of block — its configuration surface and its engine behaviour. Every block names one; a **view module** is optional and defaults to the block view. Modules are what the engine leverages to interpret packages, projects and workspaces |
| **B-b** | **A view is regulated entirely by its module.** It holds nothing but references to workspace blocks. So the enforcement is the module's, not a second half of `holds` |
| **B-c** | **A resource is a workspace-relative path or link.** The workspace holds packages, projects, references to resources, and its own settings and log. **Embedding** images, video and data is a later story |
| **B-d** | **Migrate and translate old files** — rows, not a schema bump by fiat. See stream `B` in [plan.md](plan.md) |
| **B-e** | **The workspace contains without owning, exactly like a folder**, plus two things a folder has not: it is *the* top-level root, and it holds the log and metadata. **It gets its own module** |
| **B-f** | **A pattern package is a set of template blocks** to import, copy and customise, built on the base definitions. Not a vocabulary package and not in the `vocabulary` list. **A later story** |

**The shape those answers produce**, recorded so nothing drifts from it:

| | |
|---|---|
| **workspace** | the top-level root. **Contains** projects, packages and folders without owning them; holds the **log**, the metadata and the explorer settings — fold state, toggles, last view. Renders with the block view. Its own module |
| **project** | **owns** a graph of blocks. Contained, never owned. Carries canvas toggles and the **sticky view per layer** in its own settings. *Proposed: it no longer holds a log* |
| **folder** | contains anything without owning it — its children are independent roots. Renders with the block view. **The only place *mixed* means anything** |
| **every block** | names a **block module**, and optionally a **view module** |

**Answered 2026-08-19, second round — nothing in stream `B` is gated any more:**

| | Answer |
|---|---|
| **B-g** | **Contains is derived, and nothing new is stored.** **Filing a block makes it a root**, and a root owns its own graph — so *contained* means *the child is a graph root* and *owned* means everything else. Dragging a loose block into a folder promotes it; dragging it into a project files it. Chosen over a third stored link |
| **B-h** | **One log, at the workspace. Undo is workspace-wide, and that is the intent** — the workspace is the page and everything on it, so it has one history. `Effect.into`, `writeInto`, the `home` batches and `P.11`'s property test all come out, and so does the bug class `R.10` and defect **1** belong to |
| **B-i** | **The workspace graph is its filing tree and stops at project roots.** It contains; it owns no model blocks |
| **B-j** | **Display state lives in workspace metadata** — not the project's, and not the log. Explorer fold, canvas toggles, and which view each layer was last shown in. Reopening a workspace finds every project as it was left, and **an exported project carries no opinion about how it is drawn** |

**One detail this second round absorbed, worth naming because it moved:** *canvas toggles* were
recorded as project settings in the first round and are now workspace display state with everything
else. The rule that produced the move is worth keeping — **the project holds what it is, the
workspace holds how it was last seen** — because it is the one that gives *a display preference is
not project data* somewhere to live instead of only somewhere to be kept out of.

**The module sets and the file shape, 2026-08-19 (third round).**

**Settled**: definitions are grouped by what they describe — **blocks**, **relations**, **views** —
in **one id space**; a **view definition** carries exactly one required view module plus its
options and is named by block definitions; a definition naming no module gets the **base block**
defaults; `schema` is the **module schema version** and import is checked against the registered
option surface. **Arrangement and flow are layer settings, not display state** (Clay's catch — they
are how a graph reads).

| Module set | Members |
|---|---|
| **block** | base, view, interface, group, note, resource — and workspace, project, folder, package |
| **arrangement** | free, column, row, radial, relax |
| **flow** (under `relax`) | left, right, top, bottom |
| **relation** | line, directed, derived |
| **view** | block, table, matrix, activity, state, sequence |

**Inference**: each view module declares its own **infer map** — what a block infers into, in that
module. Multi-select inference is a **future story**.

**Answered 2026-08-19 (fourth round):**

| | Answer |
|---|---|
| **B-k** | **`derived` is a flag on a relationship, never a relation module.** The module set stays `line` / `directed`. A derived relationship is not in the log, is recomputed on every fold, and cannot be deleted |
| **B-l** | **`flow` absorbs `axis`.** One setting — `left`, `right`, `top`, `bottom`, or none — per layer, under **every** arrangement rather than only `relax`. It biases rank, placement and routing and is what **implied order** is read along, so `A.9`'s sequence and `A.7b`'s activity keep their fallback under the new name |
| **B-m** | **An interface is declared, not derived.** The `side` derivation is retired; `side` becomes only where it sits. `promotion` was already the explicit act of making one, and a declared interface is what carries the anchor-slot surface |
| **unknown module** | **Falls back to the base block *and reports a fault*.** Never silent — the door already reports everything it repairs |

| **B-n** | **Both, and they are two questions.** A **view definition is a view subtype** — it configures one required view module exactly as a block definition configures a block module, and what the options are is the module's to declare. A block definition names **one** for how its layer *opens*, and **a set of modules** it may be *switched* to (default block / table / matrix). Switching to a module with no view definition uses that module's defaults |

**Nothing in the block model is open.** What is left is detail, held per module.

### Inference and composition — two things, and only one is inference

**Clay is right that this was discussed.** `ViewModule` carries **`word`** and **`creates`** (the
default definition for a block it makes) and `ViewConfig` carries the abstraction cap **`N`**,
default 5 — all landed as **A.7c** and **never wired to `create` or `infer`** (parked, and still
listed under stream A). [behaviors.md](behaviors.md) is one module's map written out at length: the
shape discriminator, the four order tiers, lanes from the ref, the cap, derived naming from the
module's verb, and the A/B activity→state reading.

**But the per-module infer map is withdrawn** (Clay, 2026-08-19). Two different things were both
being called inference:

| | Makes | Runs | Is |
|---|---|---|---|
| **`infer`** | **new blocks** — the block to activity to state chain | once, when asked | model, permanent |
| **composition** | **nothing** — a grouping, spacing and ordering of references | every draw | presentation, recomputed |

**`infer` is unchanged** and behaviors.md still describes it. **Composition is the open area**: a view
holds references drawn from many layers and nothing decides how they group, space and order.

| View | Groups by | Orders by |
|---|---|---|
| **block** | source layer | the arrangement direction |
| **table** | a chosen column | sort |
| **matrix** | axis membership — its two child views | within-axis order |
| **activity / state / sequence** | lane, from the reference | the four order tiers |

`ViewModule.word` and `.creates` stay, serving `create` and the behaviour chain. **Multi-select
inference stays a future story.**

### The schema, settled 2026-08-19 (fifth round)

| | |
|---|---|
| **stored** | **only the workspace** — `{ schema, id, name, log, meta }`. Everything else folds from the log |
| **a block** | `id, name?, parent, type?, of?, fields?, at?, side?, slot?, arrange?`. **No `form`** — *reference* is derived from `of`, *container* from holding children, *contained-not-owned* from the child's definition extending `project` |
| **a relation** | `id, from, to, type?, fields?` plus a folded-only `derived?`. Its module (`line` / `directed`) comes from its definition |
| **definitions** | one id space, three groups — `blocks`, `relations`, `views`. A block definition carries `module?` (absent ⇒ base) and **`views`, an ordered list of view definition ids whose first entry is the default** |
| **a file** | `project { schema, id, name, defs, graph, meta? }` — a **checkpoint**, since a project export is a query over the workspace log rather than a copy of its own |

**One arrangement, six values, and it is model data.** `axis`, `flow` and `arrangement` collapse into
one — `free`, `grid`, `right`, `left`, `down`, `up`. **`relax` is not a layout** (it nulls x/y, so it
stays an action and is the counterpart to retained placement) and **`radial` is dropped** (narrow,
and wrong-looking outside a hub and its attendants). **The test that decided it, and
that decides the next one: anything inference reads is model data**, because an inference is
permanent and behaviors.md requires the same selection to infer the same way every time. `free` and
`grid` carry no direction, so order tier 3 does not fire under them.

**Nothing is discarded by arranging** — `at` is always kept, and returning to `free` returns the
layout. That is *retained placement*, which was already the rule.

**`relax` is retired outright** (Clay, 2026-08-19): the action, the `relax_layer` mutation op and
its `fill.ts` entry. Once arrangement is a setting, *hand it back to automatic* has nothing left to
mean — picking a computed arrangement already does it, and picking `free` already gives the
placement back. **The named loss: nothing clears hand placement any more.** Accepted rather than
kept; if it is wanted later it comes back as one action with a describable job, not as a value in
the arrangement set.

**Composition runs on proximity.** How far apart two referenced blocks sit in the tree — same
parent, same branch, same project, different project — **groups** by nearest common ancestor,
**orders** by tree path, and **spaces** by distance where the view has room. Block takes all three;
table and matrix take grouping and order and drop the spacing; a matrix applies it per axis. A
proximity group is a **derived group**. **The default must be overridable** — a cross-cut view
wants grouping by type, not by project, which is a view definition option.

**A project export loses its history, and that is correct.** The workspace export is the backup —
it carries the log; a project export is a **share**, and it carries a checkpoint. Two doors that
already differ (S4.6), now for a stated reason. Replaying a foreign log into your own would mean id
collisions and somebody else's history interleaved with yours, which nobody wants.

**Recorded as future stories, not scheduled:**

- **Generalised edges and anchors.** Port / interface / anchor lifted off the frame edge to a
  general **edge set** — a frame side, a lifeline, anything else that seats things. An **anchor slot
  definition** (`line`, `circle`, `diamond`, …) and a variable port shape (square against rectangle,
  open against filled). This is what makes a lifeline occurrence and a proxy port the same object.
- **Multi-select inference.** Inferring from a selection rather than one block.
- **A behavioural gamification package.** A goal to expand on later.
- **Explorer: show or hide empty blocks.** Basic blocks, interfaces and references are usually
  empty, so hiding them is what makes a large tree readable. **A project or package root is always
  shown, even when empty.** Display state, so workspace metadata.

### B.0 — the branch count, taken 2026-08-20

**The row asked for the size of stream `B`, measured rather than guessed.** Counts are from `src/`,
excluding `tests/`.

| What | Count | Where it concentrates |
|---|---|---|
| files touching `form` at all | **33** | every layer — `graph/`, `actions/`, `modules/view/*`, `page/`, `canvas/`, `geometry/` |
| `form ===` comparisons | **76** | of which **29 are element forms** and the rest are field and relation forms |
| element-form branches, by value | `block` 12, `note` 6, `group` 6, `proxy` 5 | `fold.ts`, `check.ts`, `compose.ts`, `Files.tsx`, `Contents.tsx` |
| mentions of `proxy` | **144**, across 26 files | `graph/fold.ts` **27**, `workspace/index.ts` **13**, `graph/types.ts` **13**, `page/Contents.tsx` **10** |
| `page/kind.ts` | **85 lines, 4 call sites** | `App.tsx` ×2, `Files.tsx` ×2 — plus `ViewKind` / `kindOf` / `createsFor` in `modules/view/index.ts` |
| files choosing a log | **9** | `actions/index.ts`, `actions/elements.ts`, `actions/behavior.ts`, `graph/file.ts`, `graph/store.ts`, `project.ts`, `workspace/index.ts`, `App.tsx`, `Files.tsx` |
| id minting | **one function** — `newId` at `graph/types.ts:388` | counter + 8 random chars, monotonic per session |

**What the numbers change:**

- **`B.1` (rename `proxy`) is the biggest row by site count and the safest by risk** — 144 mentions,
  no design decision in any of them. Doing it first is confirmed as correct.
- **`B.6` (forms collapse) is smaller than feared.** Only **29** comparisons are element forms; the
  other 47 are field forms and relation forms, which both survive. The row is *29 branches plus the
  record change*, not 182.
- **`B.3` (delete the kind derivation) is genuinely small** — 85 lines and 4 call sites, plus
  retiring `ViewKind` / `kindOf` / `createsFor` from `modules/view/index.ts`. It was described as
  closing six defects at once and that holds.
- **`B.19` (globally unique ids) is one function.** `newId` already appends 8 random characters and
  its own comment says a collision *silently fuses two elements into one* — so the change is to make
  the guarantee real and stop treating ids as project-scoped, not to invent a minting scheme.
- **`B.8` (one log) touches 9 files**, and `graph/fold.ts` carries the largest single concentration
  of `proxy` (27) as well — so `B.1` landing first genuinely does clear the way.

**Order confirmed by the count**: `B.1` → `B.19` → `B.2` → `B.3` / `B.4` → `B.5` → `B.6` → the rest.

### Stream C — from driving, 2026-08-20

Five small features, none depending on stream `B`. Rows are in [plan.md](plan.md).

**The one-anchor-per-side rule is retired** (Clay, 2026-08-20). `NodeCard.tsx:270`,
`Frame.tsx:92` and `Note.tsx:92` each render four anchors per card whether or not a line meets any
of them. **They read as clutter and they go**: an anchor is drawn where a relationship actually
meets the block, and nowhere else. `C.2`.

| | |
|---|---|
| **C.1** | a project's name carries its block count — `Coolant Loop (34)`. **Watch**: must not count references, or a view of forty things reads as a forty-block project |
| **C.2** | an anchor exists **where a line meets a block** (the always-four rule goes), and drags between seats **without promotion**, drawing **solid** once moved. Promotion stays the separate act of making a real interface |
| **C.6** | **hand-adjusting a block, an anchor or an interface sets the layer to `free`** — the arrangement follows the gesture. Under any non-free arrangement the engine owns all three. One rule replacing three, and what makes `C.2`'s solid anchor mean something |
| **C.3** | selecting on the canvas sets the explorer context and expands the branch — the mirror of `reveal`, and it should reuse it |
| **C.4** | `f` zooms to the selection and centres it |
| **C.5** | a frame edge lights as a drop target, each of the four walls independently, reusing `P.14`'s lit-target look |

### The action surface shrinks — `ST.11`, sized 2026-08-20

**Measured**: `src/actions/` is **2,873 lines**, `src/terminal/` is **741**, and the action set is
**33 actions** across seven registrations.

**Settled: a module names the actions its blocks offer, as an explicit list** (Clay). The staleness
fear does not apply — the set is closed and the block model **shrinks** it: `relax` and `axis` come
out at `B.11`, and the pin follows `P.4`'s *one registered action offered twice* rather than adding
a 34th.

| What loses its reason | Lines | Freed by |
|---|---|---|
| `Effect.into`, `writeInto`, `home` batches, `onAdmit` routing, `P.11`'s test | across 9 files | `B.8` |
| `relax`, `relax_layer`, `set_axis`, the `Axis` type | 4 files | `B.11` |
| ~~`rank.ts` + `feedback.ts`~~ — **stays, re-aimed** | **0** | **Corrected 2026-08-20 (Clay)**: `I.2`'s verb lists are **examples, not an enumeration**. Substring matching cannot reach a word nobody listed, so the embedding lead and the learned overrule store are both still needed — `I.8` points them at four commands and keeps them |
| `typelist.ts`, `TYPE_CAP` | 78 | `C-a` |
| `Chat.tsx`, `workflows.ts`, `tutorial.ts` | 563 | `I.1`–`I.7` |
| the explorer's second create button **and `P.2`'s *New project* control** | — | `N.5`, deleted by `N.7` |

**The rule, so this does not become a demolition derby**: *nothing is deleted for being old; a thing
goes when the row that removed its last consumer lands.* **A row that frees something and leaves it
standing has landed short.**

**`rank.ts` is not a deletion candidate.** The first sizing of this story assumed four commands
meant substring matching; Clay corrected it — the verb lists are examples, and an *intelligent*
terminal has to match a word nobody listed and learn the one this person reaches for. `I.8`
re-aims the ranker rather than removing it, and **`C-a` still decides `typelist.ts`**, which is a
separate consumer. `I.8` and `C.8` must agree or land together.

**So the honest total is smaller than the first pass claimed** — roughly **640 lines**, not 920, and
most of it is the old terminal rather than the ranker.

### Stream C — one question open

| | The question |
|---|---|
| **C-a** | **Which surfaces show *all* their types, and which still cap?** Clay's direction (2026-08-20) is to stop capping at three and instead **show all, ordered by similarity between what was keyed and the registered keys** — which closes tasks.md **17** (the group is capped but not ranked) and **18** (the edge menu is not a consumer). **It is obviously right for the terminal's four commands and obviously wrong for a vocabulary of fifty relation types**, so the rule needs its boundary: *all* below some size and *ranked and capped* above it, or *all* everywhere with a scroll. **And it decides the fate of the learned ranking**: does similarity **replace** `rank.ts`'s overrule-weighted preference on these lists, or sit in front of it as a first sort? `X.1` and `X.2` moved that machinery days ago and gave it its second consumer, so replacing it is a real reversal rather than a tidy-up. `C.8` is `◆` until this is answered |

### Streams I and O — answered 2026-08-20

*Renamed off `D`/`E`, which are already vocabulary and definitions-and-fields.*

| | Answer |
|---|---|
| **I-a** | **The rest of the action surface goes behind interactive help.** Four commands is a deliberate narrowing; `arrange`, `group`, `relate` and `infer` are reached by `?`, which knows every action and can run one. **This makes help load-bearing rather than a courtesy** — it is the action surface's only text route, so `I.7` cannot be trimmed later without making actions unreachable |
| **I-b** | **Results open on the stage**, through `W.6`'s real table view given a result set instead of a layer. No second listing inside the terminal |
| **O-a** | **A public GitHub repo, read over `fetch`.** No credentials, nothing stored, no sync — design.md's client-only rule holds as written. **Local-folder import was not taken** and is out of scope (File System Access API is Chromium-only and needs a gesture per session) |
| **O-b** | **The site first**, because it is closest to the existing SVG export and needs the least new machinery — so it teaches the `translator` seam rather than a target's own problems. Simulator, parametrics and code follow, unordered |

**Recorded, not scheduled, and it reopens a founding rule.** Clay wants eventually to supply
**enhanced packages as a value add from a private repo or a server**. design.md says *no server, no
cloud home, no sync* — so this is a **product decision that changes that rule**, not a row and not
something to design around. Written down so nothing is built assuming it is coming, and so nobody
relaxes the rule quietly to make room for it. If it is taken, the questions it opens are
credentials in a browser tab, who hosts, and what happens to a project whose package is behind a
paywall the reader does not have.


### Two things one log has not answered

| | The question |
|---|---|
| **B-o ✓** | **Settled: globally unique** (Clay, 2026-08-20). Rowed as `B.19`; `B.8` waits on it. **Ids must become globally unique, and nobody has said when.** An id is unique *within a project* today and a cross-project reference is a path — which worked because each project had its own log. **One log cannot hold two elements with the same id**, so either ids are minted globally unique or every mutation carries a project on every op. **Recommendation: globally unique**, which also kills the bare-versus-path ambiguity behind `P.7`'s refused drops and defect **2b**. Rowed as `B.19`, and `B.8` waits on it |
| **B-p ✓** | **Settled: the fold merges checkpointed definitions with the folded ones** (Clay, 2026-08-20). Rowed as `B.26`. **Where do an imported package's definitions live under one log?** A package arrives as a **checkpoint**, not as steps, so its definitions are not in the workspace log — which means the fold has to merge checkpointed graphs with the folded one. Checkpoints already do this, so it is probably nothing; it has not been checked, and *probably nothing* is how the last two schema surprises started |

**Settled and worth stating, because it removes a rule rather than adding one**: with one log,
*no relationship ever spans two logs* is moot, and so is every question about which log a
cross-project edge belongs to.

**Next, still undiscussed**: view composition per module beyond the proximity rule — what a table
does with a reference whose `depth` is `all`, and what a sequence does with participants from four
projects.


### Stream P — making a project, and saving a view

> **The model-B reading below is SUPERSEDED by the simplified block model** (Clay, 2026-08-18,
> later the same day) — see *Open questions* at the head of this file. A **set** derived from what
> its members are is gone; a **folder** is an ordinary definition and a **view** holds
> **references**. The rest of this stream — the doors, the drags, the two logs, the bugs — stands.
> Kept for the record of what was tried and why it did not hold.

**Clay played with the built app and could not make a project.** Four things
were expected; **none of them work**, checked against the code:

- `＋` names a project only after clicking empty tree space to deselect first.
- The empty tree area has **no drop target at all**.
- Drag is wired only *inside* the project in context, so no block can cross.
- `workspace.folder()` is built and **has no caller** — folders render, nothing
  makes one.

**plan.md predicted the first one exactly**: *click nothing to enable something
is obvious to whoever built it and invisible to everyone else*. That prediction
coming true on the first play is the evidence `V.14`'s gesture cannot be the
only door. It is not reversed — it gains a visible sibling.

**The rule Clay wants**: a project is a block that nothing contains. Making one
is making a top-level block; promoting one is moving a block to the top.

**Settled — nothing is left behind** when a block leaves. It takes its subtree;
relationships from its old siblings go with it the way `delete`'s partings
already do. Against a proxy standing in for it, which was the other option.
**The consequence is silent data loss on the lines**, so the strip has to name
what went.

**A move across projects is two steps in two logs.** A project is a log, not
only a place. That is already the rule everywhere (`Effect.into` / `writeInto`,
`home` batches: *never a single step spanning two logs*). Undo in the source
brings the block back; it does not remove the project that was made.

**`A.7d` was mis-framed and is retired into this stream.** It read as *`infer`
needs a hook to admit its project*. It is not: the explorer has no way to make a
project that does not begin with an invisible gesture, so `infer` was being
asked for a door the app does not have. Cut the door and `infer` needs nothing.

**The larger ask, and the design already named it.** What is wanted is a
requirements table, or an allocation view over a cross-section of several
projects, stored and organised freely. spec.md has carried the concept as
**(planned)** since W0 — *a **set** is whatever it holds proxies of*, and *a
view appears as a root like any other and lists what it holds proxies of*. So a
saved view is a **set**: a block whose members are proxies of things elsewhere.
`Chosen[]` picks the cross-section (E.4), `refer` places each proxy, and the
sticky view module decides whether it reads as a table or a matrix — all built.

**`infer` is the existing proof.** It already takes a cross-project selection
and mints a project holding proxies of the participants. It is the *behavior*
special case of the general move, which is why generalising it beats inventing a
second mechanism.

**How the kinds are told apart — derived, never declared.** `role_of` already
reads a node's role from what it holds and where it sits; *members are proxies*
is one more line of it. **And that answers the folder**: a folder is a set whose
proxies are project roots, which is what the workspace itself already is, since
`admit` files a project by placing a proxy of its root. So there is no folder
concept to add — the recommendation deletes one.

~~**Settled — model B, Clay's call.** A set is **derived**: a block whose members
are proxies. No stored field, no `components.set` key, and **no folder concept**
— filing is a set of projects. `workspace.folder()` stays dead. A set wears a
folder mark.~~ **Reversed the same day.** Mixedness was never the signal — a
folder of five structure blocks is still a folder — and *set* collided with
*style set* and *closed set*. **`folder` is an ordinary definition**, `set` is
retired, and a **view** is the thing that holds references.

**And a second rule from the same conversation**: *every node role carries a
mark of its own*. Block, container and interface have theirs. **Two do not**:

- **a set has no mark**, so it would read as a container — `P.5`.
- **a behavior cannot be reached at all.** Nothing anywhere writes
  `components.view.module`, and `offered(graph)` filters the view toggle to the
  modules of the project's own kind, where kind is read back off that same key.
  A fresh project's root has no definition, so it is `block`, so it is
  *structure*, so activity / sequence / state are never offered. **A one-way
  door with nothing that opens it** — the only behavior projects that can exist
  are `infer`'s, and those are unreachable. `P.6`.

V.2's property test already holds that no two icon names draw one path; the
missing half is that every *role* has one, which is what `P.5` adds to the icon
conformance test.

**Recorded, not scheduled**: a set holds proxies of *whole blocks*. *These three
fields of those five blocks* is a column selection — a different shape, and one
a requirements table may want. It should arrive by decision, not by the back
door.

**`P.1` landed and was driven.** Three things it turned up that the row did not
name:

- **The drag payload was a bare element id**, so even where a row was draggable
  it could not say which log the block was leaving. It is a cross-project ref
  now — which `refer` has always accepted and nothing ever handed it.
- **A promoted block was landing *inside* a project of its own name.** Clay's
  rule is that the block **is** the project, so it becomes the destination's
  root and everything pointing at it points at root instead.
- **Definitions have to travel.** Without them a promoted block loses its types
  silently — the same class of quiet loss the strip exists to prevent — so
  `extraction()` carries the definitions the subtree names and the package
  import list with it.

**Two bugs the closing review found, both fixed with tests.** *(a)*
`set_vocabulary` was written **flat**, so moving a block into an existing project
replaced that project's package list with the source's — silent loss in a part
of the project the drag never touched. It unions now, keeping import order.
*(b)* The two logs are written one after the other, so a source that turned out
to be **locked after the destination had already taken the subtree** left the
block in both projects; the lock is checked before either write.

**Recorded, not fixed**: a copied definition's `extends` can point at a parent no
moved element named, leaving it dangling. It degrades safely — SC.2's walk ends
at a missing parent — and `P.12` decides copy-versus-reference anyway.

**The refold defect became `P.15`**, not a park: Clay hit it, so it is a row
under story `ST.1`.

### The style surface closed

**`Y.7` and `Y.9` landed and were driven.** `Definition.color` is gone and
`components.style` carries four closed dials instead: `slot` (six hue families),
`emphasis` (`quiet|normal|strong`), `weight` (`hairline|thin|thick`) and `voice`
(`quiet|normal|loud`). Nothing a definition can set is a colour, a pixel count or
a font. Driven: setting all four on `Module` moved every usage's border from
`oklch(0.42 .0855 150)` at 1px to `oklch(0.8 .12 330)` at 2px with its name at
700, and the door refuses `slot: "magenta"` by name — *`style.slot` has to be one
of primary, secondary, tertiary, quaternary, neutral, muted*.

**One judgement the row did not settle.** *A definition that says nothing gets
`neutral` / `normal`* is true of a definition — but a usage with **no type at
all** has no definition to read, so it keeps the engine's own default (`--route`,
`--border`) rather than the neutral slot. Otherwise *no type yet* and
*deliberately quiet* draw the same, and the untyped canvas would lose its green.
`Look.typed` is the flag.

**The name collision is settled: `voice`.** `components.card.label` means *where
the label sits*; the style dial is `components.style.voice` — *how loudly the
name is set*. Clay's call, taken because one word meaning two things is what U.2
exists to stop, and `Contents.tsx` was already aliasing a constant to import
both.

### The offered list grew a rule

**`Y.4` closed its `◐`.** The rail builds the `types` group now, so table and matrix stopped
drawing an inline cycle each. **`types` is the one group the page cannot build from its own state**
— a table filters by the definition names on its rows, a matrix by the relationship marks in its
cells — so `ViewModule` gained a `types` answer beside `chrome`: an icon and a function from the
layer to the kinds on it. Declaring the group without answering it now fails the module conformance
contract, so the two cannot drift. **A pick that is no longer on the layer reads as *everything***,
which is why nothing has to be reset on navigation.

**`R.5`–`R.8` and `R.10` / `R.11` landed and were driven.** Five things, one theme: the menu was
thin because a rule was missing, not because entries had been forgotten.

- **A required `choice` expands into one entry per option** (`R.5`). `expand` on the descriptor,
  `entries()` in `actions/fill.ts`, and both menus call it — so the canvas and the explorer cannot
  drift the way the three copied fill functions did. `mark`, `direct` and `reform` carry it;
  `axis` and `arrange` deliberately do not, since the bar and the `.shape` cluster are their doors.
  **The action set does not widen**: one registered action, offered N times with different args.
- **`direct` and `reform` now have a home** (`R.6`) — the edge menu, proven end to end: *Directed*
  turns a plain line into a directed one and *Back* moves the arrowhead to the other end.
- **A directed relationship draws an arrowhead** (`R.7`). The form says there is a direction and
  `dir` only refines which way, which is how `behavior.ts` has always read it; the canvas required
  an explicit `dir` and so drew nothing for every edge the toolbar makes.
- **`Scope.on` takes a list** (`G.9e`), so `retype` is offered on an edge. Widening a descriptor's
  own field is not widening the closed action set.
- **The explorer menu writes where it was clicked** (`R.10`). It built its context from the project
  in context whatever the row, so a menu on B's row wrote A's log. It now builds from the row's own
  project and brings that project into context, which is what the left-click path always did.
- **An empty domain stem is not a repair** (`R.11`). Normalising `""` to `[]` carried nothing, so
  every pre-migration project without a domain opened with a trouble notice it did not earn.
- **actions.md gained a Does column** (`R.8`), copied from each descriptor's `about`. The
  descriptor stays the source.

**Watch, unresolved**: an edge menu now reads `Create Retype Refer Up Unlink Flip None Forward Back
Both Line Directed Note Define Relax Vocabulary` — sixteen flat entries with the four directions and
two forms unlabelled. It is legible because the options sit together in `ORDER`, but **`X.2`'s capped
list is what makes it good**, and a large vocabulary will make it worse before then.

### The tray, the table and the strip

**Contents already *is* the table view**, stuck at one size. Not a thing to move: U.7 already said
*both open partially, as the panel does now, and expand to the full canvas*, and landed `◐` on
exactly that — expand does not cover or replace Contents. The shipped `table` module's own listing is
the duplicate.

**The rule the rest falls out of: the tray shows the contents of whatever is in focus** — a block its
fields, a group its members, a note its text, a relationship its ends and what it could be. That is
why the capped type list stopped looking like a relationship special case: it is the *what could this
be* half of the same tray.

**The two sizes take different inputs.** **Full** — the `table` view on the stage — shows the layer
and everything in it, and **the selection does not narrow it**. **Partial** — the tray at the foot —
is that same table **scoped to what is in focus**. With nothing in focus the two agree, so *expand*
is only a size. Taking different inputs is what keeps this clear of the hidden state U.8 rejected:
the two never disagree about one input. A full stage given over to one note's text was the tell that
focus should not drive both.

**Matrix should be a heatmap** — the one thing a grid gives that a listing does not. **Hue is the
relationship kind, opacity is the count**: transparent at zero, grading up, so both dimensions read
at once without a mode switch. **The hue is the definition's existing `style`** (`styleOf` /
`lookOf`, `styles/sysml.ts`) — never a new matrix palette, so the matrix and the diagram cannot
disagree and there is no second colour vocabulary to keep in step. A cell holding two kinds draws as
**bands**, degrading to a solid cell in the common single-kind case.

**U.7 modelled table and matrix on Contents and deliberately did not delete it**, so this
duplication was known and accepted at the time; what changed is that the duplication turned out to
be the wrong way round.

### Listing the types in scope

**Three surfaces ask the same question** — the edge context menu, the selection strip and the canvas
*relation types* group — and each grows with the vocabulary. **One rule**: top three ranked by use,
a *More…* that expands in place, scrolling past a height, and no submenus. The relation types group
is the exception at three and no expansion, being a setting inline beside the crumbs rather than a
list of things to act on.

**The ranking already exists and is in the wrong place.** `Z.3` computes shape-weighted learned
preference in `terminal/rank.ts` and `terminal/feedback.ts` — measured *use*, which is what "the
three most common" should mean — but `terminal/` is **optional** (S6.3: delete it and the app still
runs). A menu ranking by preference therefore cannot live downstream of the rail, which is the same
argument that put `offer()` in `actions/` rather than `terminal/` (G.9a). Moving it also gives Z.3 a
second consumer; until now it ranked rail chips alone. **Cold start** falls back to vocabulary import
order, which Contents already uses for type offerings (D.2), so a fresh project needs no new rule.

**A typed name is a type.** The strip carries a text field beside the capped list: type a name and
the selection takes it. **Already built** — `fold.defineNamed` mints a definition for a bare name
under a derived id and describes itself as *the bridge from free text to a real definition*, and the
suite holds it. **Match before minting**: a free-text mint derives its id from the name while a
deliberate definition carries its own, so typing a name already in scope would produce a twin — the
duplicate-name case SC.4 needed disambiguation for.

**The strip re-defines the selected thing, never its type.** Name, which type it is, field values —
all instance-level. What fields a *type* carries and how it presents stays behind deselect on the
types chip (`W.3`). Splitting it the other way rebuilds, somewhere new, the duplication U.11 deleted
`Relations.tsx` to remove.

### Where each action lives

**A required `choice` is a question no menu asks**, so five actions were withheld from every offered
list while holding reserved `ORDER` slots — `mark` (`flow`), `direct` (`dir`), `reform` (`form`),
`axis` (`axis`), `arrange` (`shape`). Driving it: a card's menu offers *Relax* but never *Mark* or
*Arrange*. Asking where each of the five actually lives turned up more than the original defect.

| | Home | |
|---|---|---|
| `axis` | canvas bar, *flow* group | fine |
| `arrange` | `.shape` cluster, bottom right | fine |
| `mark` | Panel and Contents, `onMarkPort` — an interface's flow | fine |
| `direct` | — | **homeless** |
| `reform` | — | **homeless** |

**`direct` and `reform` have no home at all.** The canvas relation group is `onForm`, a **draft**
setting for what the *next* right-drag draws — a display preference beside `showPorts` and `angular`,
recorded as such under S2.6. It never touches an existing edge. `project.direct` / `setDir` /
`reform` exist and nothing calls them, so **once a relationship is drawn, its direction and its form
cannot be changed anywhere**.

**Settled — the options become the entries.** Right-clicking a relationship lists the relation types
and forms themselves rather than an action that then asks which. No submenu, and no open text prompt.
The list is tailored to the target because the options are. **It does not widen the closed action
set**: one registered action offered N times with different args, which is the wording U.16 used
before it was dropped. The flag goes on the **descriptor** (`expand`), keeping one rule instead of
the per-surface special-casing R.2 removed; `arrange` and `axis` leave it off because they have
homes. **Watch**: an edge menu then lists every relation type in the project.

**Two things fell out of the same question.** A **directed relationship draws no arrowhead**, so
direction is invisible even where the graph holds it — `direct` being unreachable is what hid it,
and arrowheads are the engine's visual language rather than chrome, so it is not Wave V's. And
**actions.md never says what an action does** — name, scope, arguments, mutations and what each
replaced, but no description, which is why `reform` had to be read out of the source. The text
already exists as `about`, required on all 29 descriptors.


## Open questions

*Kept at the front. Everything here blocks something in [plan.md](plan.md).*

### The simplified block model — settled, and what it left open

**Settled 2026-08-18 (Clay).** One block, no element forms; `proxy` → **reference**; `ref` the
value form → **`link`**; `set` → **folder**, an ordinary definition; **no `kind`** — behavior is one
package plus three view modules; `view` holds **references only** and the engine enforces it.
Vocabulary in [definitions.md](definitions.md), reasoning in [design.md](design.md) under *The
simplified block model*, queue shape in [plan.md](plan.md) under stream **B**.

**Closed by it, so nothing is owed:** the *kind signal* and *kind by fiat* repairs, `P.6`, `P.5`'s
mixed-children reading, and `S8.3`.

**Answered 2026-08-19 (Clay).** The six that were open:

| | Answer |
|---|---|
| **B-a** | **The engine keys off registered modules.** A **block module** is code behind one sort of block — its configuration surface and its engine behaviour. Every block names one; a **view module** is optional and defaults to the block view. Modules are what the engine leverages to interpret packages, projects and workspaces |
| **B-b** | **A view is regulated entirely by its module.** It holds nothing but references to workspace blocks. So the enforcement is the module's, not a second half of `holds` |
| **B-c** | **A resource is a workspace-relative path or link.** The workspace holds packages, projects, references to resources, and its own settings and log. **Embedding** images, video and data is a later story |
| **B-d** | **Migrate and translate old files** — rows, not a schema bump by fiat. See stream `B` in [plan.md](plan.md) |
| **B-e** | **The workspace contains without owning, exactly like a folder**, plus two things a folder has not: it is *the* top-level root, and it holds the log and metadata. **It gets its own module** |
| **B-f** | **A pattern package is a set of template blocks** to import, copy and customise, built on the base definitions. Not a vocabulary package and not in the `vocabulary` list. **A later story** |

**The shape those answers produce**, recorded so nothing drifts from it:

| | |
|---|---|
| **workspace** | the top-level root. **Contains** projects, packages and folders without owning them; holds the **log**, the metadata and the explorer settings — fold state, toggles, last view. Renders with the block view. Its own module |
| **project** | **owns** a graph of blocks. Contained, never owned. Carries canvas toggles and the **sticky view per layer** in its own settings. *Proposed: it no longer holds a log* |
| **folder** | contains anything without owning it — its children are independent roots. Renders with the block view. **The only place *mixed* means anything** |
| **every block** | names a **block module**, and optionally a **view module** |

**Still open, and each blocks a row in stream B:**

| | The question |
|---|---|
| **B-g** | **Is *contains* a third child link, or is it derived?** `part` was settled as *the tree owns it, deleting the whole deletes it* — and a folder now **contains parts it does not own**, which is a contradiction in terms as the words stand. Three readings, and one has to be picked before any of `B.5`/`B.6` can be written: **(a)** a third stored link `contains`; **(b)** it is **derived** — a child that is itself a graph root is contained, one that is not is owned, so nothing new is stored; **(c)** filing a block in a folder **makes it a root**, and then (b) covers every case. **(c) is the recommendation** — it needs no new link, and it agrees with the built rule that *a block at the top level is a project* |
| **B-h** | **The single log — feasible, and what does undo mean?** Moving the log from the project to the workspace **dissolves** `Effect.into`, `writeInto`, the `home` batches, `P.11`'s property test and the whole class of bug that `R.10` and defect **1** are instances of. That is a large, real win. Three consequences to accept: **undo becomes workspace-wide** (undoing after switching projects undoes work elsewhere — this is the question that decides it); **a project export becomes a query** over the log rather than a copy of one; and **a fold for one project replays everything**, which checkpoints already exist to absorb |
| **B-i** | **Does the workspace have a graph?** It is written *contains, does not own, has no graph* — but it renders with the block view, which needs elements to draw. Reading: **its graph is its filing tree** and it owns no model blocks. Confirm the wording or the model |
| **B-j** | **Where does a per-layer sticky view live?** Settled as *project metadata*. That is legal — `meta` is the safely-ignorable half of the envelope — but it reverses `U.8`, which put it in `localStorage` precisely so it was not project data. It now **travels with the file**, so two people opening one project see the same view. Intended, or should it stay local? |


### Stream P — making a project, and saving a view

> **The model-B reading below is SUPERSEDED by the simplified block model** (Clay, 2026-08-18,
> later the same day) — see *Open questions* at the head of this file. A **set** derived from what
> its members are is gone; a **folder** is an ordinary definition and a **view** holds
> **references**. The rest of this stream — the doors, the drags, the two logs, the bugs — stands.
> Kept for the record of what was tried and why it did not hold.

**Clay played with the built app and could not make a project.** Four things
were expected; **none of them work**, checked against the code:

- `＋` names a project only after clicking empty tree space to deselect first.
- The empty tree area has **no drop target at all**.
- Drag is wired only *inside* the project in context, so no block can cross.
- `workspace.folder()` is built and **has no caller** — folders render, nothing
  makes one.

**plan.md predicted the first one exactly**: *click nothing to enable something
is obvious to whoever built it and invisible to everyone else*. That prediction
coming true on the first play is the evidence `V.14`'s gesture cannot be the
only door. It is not reversed — it gains a visible sibling.

**The rule Clay wants**: a project is a block that nothing contains. Making one
is making a top-level block; promoting one is moving a block to the top.

**Settled — nothing is left behind** when a block leaves. It takes its subtree;
relationships from its old siblings go with it the way `delete`'s partings
already do. Against a proxy standing in for it, which was the other option.
**The consequence is silent data loss on the lines**, so the strip has to name
what went.

**A move across projects is two steps in two logs.** A project is a log, not
only a place. That is already the rule everywhere (`Effect.into` / `writeInto`,
`home` batches: *never a single step spanning two logs*). Undo in the source
brings the block back; it does not remove the project that was made.

**`A.7d` was mis-framed and is retired into this stream.** It read as *`infer`
needs a hook to admit its project*. It is not: the explorer has no way to make a
project that does not begin with an invisible gesture, so `infer` was being
asked for a door the app does not have. Cut the door and `infer` needs nothing.

**The larger ask, and the design already named it.** What is wanted is a
requirements table, or an allocation view over a cross-section of several
projects, stored and organised freely. spec.md has carried the concept as
**(planned)** since W0 — *a **set** is whatever it holds proxies of*, and *a
view appears as a root like any other and lists what it holds proxies of*. So a
saved view is a **set**: a block whose members are proxies of things elsewhere.
`Chosen[]` picks the cross-section (E.4), `refer` places each proxy, and the
sticky view module decides whether it reads as a table or a matrix — all built.

**`infer` is the existing proof.** It already takes a cross-project selection
and mints a project holding proxies of the participants. It is the *behavior*
special case of the general move, which is why generalising it beats inventing a
second mechanism.

**How the kinds are told apart — derived, never declared.** `role_of` already
reads a node's role from what it holds and where it sits; *members are proxies*
is one more line of it. **And that answers the folder**: a folder is a set whose
proxies are project roots, which is what the workspace itself already is, since
`admit` files a project by placing a proxy of its root. So there is no folder
concept to add — the recommendation deletes one.

~~**Settled — model B, Clay's call.** A set is **derived**: a block whose members
are proxies. No stored field, no `components.set` key, and **no folder concept**
— filing is a set of projects. `workspace.folder()` stays dead. A set wears a
folder mark.~~ **Reversed the same day.** Mixedness was never the signal — a
folder of five structure blocks is still a folder — and *set* collided with
*style set* and *closed set*. **`folder` is an ordinary definition**, `set` is
retired, and a **view** is the thing that holds references.

**And a second rule from the same conversation**: *every node role carries a
mark of its own*. Block, container and interface have theirs. **Two do not**:

- **a set has no mark**, so it would read as a container — `P.5`.
- **a behavior cannot be reached at all.** Nothing anywhere writes
  `components.view.module`, and `offered(graph)` filters the view toggle to the
  modules of the project's own kind, where kind is read back off that same key.
  A fresh project's root has no definition, so it is `block`, so it is
  *structure*, so activity / sequence / state are never offered. **A one-way
  door with nothing that opens it** — the only behavior projects that can exist
  are `infer`'s, and those are unreachable. `P.6`.

V.2's property test already holds that no two icon names draw one path; the
missing half is that every *role* has one, which is what `P.5` adds to the icon
conformance test.

**Recorded, not scheduled**: a set holds proxies of *whole blocks*. *These three
fields of those five blocks* is a column selection — a different shape, and one
a requirements table may want. It should arrive by decision, not by the back
door.

**`P.1` landed and was driven.** Three things it turned up that the row did not
name:

- **The drag payload was a bare element id**, so even where a row was draggable
  it could not say which log the block was leaving. It is a cross-project ref
  now — which `refer` has always accepted and nothing ever handed it.
- **A promoted block was landing *inside* a project of its own name.** Clay's
  rule is that the block **is** the project, so it becomes the destination's
  root and everything pointing at it points at root instead.
- **Definitions have to travel.** Without them a promoted block loses its types
  silently — the same class of quiet loss the strip exists to prevent — so
  `extraction()` carries the definitions the subtree names and the package
  import list with it.

**Two bugs the closing review found, both fixed with tests.** *(a)*
`set_vocabulary` was written **flat**, so moving a block into an existing project
replaced that project's package list with the source's — silent loss in a part
of the project the drag never touched. It unions now, keeping import order.
*(b)* The two logs are written one after the other, so a source that turned out
to be **locked after the destination had already taken the subtree** left the
block in both projects; the lock is checked before either write.

**Recorded, not fixed**: a copied definition's `extends` can point at a parent no
moved element named, leaving it dangling. It degrades safely — SC.2's walk ends
at a missing parent — and `P.12` decides copy-versus-reference anyway.

**The refold defect became `P.15`**, not a park: Clay hit it, so it is a row
under story `ST.1`.

### The style surface closed

**`Y.7` and `Y.9` landed and were driven.** `Definition.color` is gone and
`components.style` carries four closed dials instead: `slot` (six hue families),
`emphasis` (`quiet|normal|strong`), `weight` (`hairline|thin|thick`) and `voice`
(`quiet|normal|loud`). Nothing a definition can set is a colour, a pixel count or
a font. Driven: setting all four on `Module` moved every usage's border from
`oklch(0.42 .0855 150)` at 1px to `oklch(0.8 .12 330)` at 2px with its name at
700, and the door refuses `slot: "magenta"` by name — *`style.slot` has to be one
of primary, secondary, tertiary, quaternary, neutral, muted*.

**One judgement the row did not settle.** *A definition that says nothing gets
`neutral` / `normal`* is true of a definition — but a usage with **no type at
all** has no definition to read, so it keeps the engine's own default (`--route`,
`--border`) rather than the neutral slot. Otherwise *no type yet* and
*deliberately quiet* draw the same, and the untyped canvas would lose its green.
`Look.typed` is the flag.

**The name collision is settled: `voice`.** `components.card.label` means *where
the label sits*; the style dial is `components.style.voice` — *how loudly the
name is set*. Clay's call, taken because one word meaning two things is what U.2
exists to stop, and `Contents.tsx` was already aliasing a constant to import
both.

### The offered list grew a rule

**`Y.4` closed its `◐`.** The rail builds the `types` group now, so table and matrix stopped
drawing an inline cycle each. **`types` is the one group the page cannot build from its own state**
— a table filters by the definition names on its rows, a matrix by the relationship marks in its
cells — so `ViewModule` gained a `types` answer beside `chrome`: an icon and a function from the
layer to the kinds on it. Declaring the group without answering it now fails the module conformance
contract, so the two cannot drift. **A pick that is no longer on the layer reads as *everything***,
which is why nothing has to be reset on navigation.

**`R.5`–`R.8` and `R.10` / `R.11` landed and were driven.** Five things, one theme: the menu was
thin because a rule was missing, not because entries had been forgotten.

- **A required `choice` expands into one entry per option** (`R.5`). `expand` on the descriptor,
  `entries()` in `actions/fill.ts`, and both menus call it — so the canvas and the explorer cannot
  drift the way the three copied fill functions did. `mark`, `direct` and `reform` carry it;
  `axis` and `arrange` deliberately do not, since the bar and the `.shape` cluster are their doors.
  **The action set does not widen**: one registered action, offered N times with different args.
- **`direct` and `reform` now have a home** (`R.6`) — the edge menu, proven end to end: *Directed*
  turns a plain line into a directed one and *Back* moves the arrowhead to the other end.
- **A directed relationship draws an arrowhead** (`R.7`). The form says there is a direction and
  `dir` only refines which way, which is how `behavior.ts` has always read it; the canvas required
  an explicit `dir` and so drew nothing for every edge the toolbar makes.
- **`Scope.on` takes a list** (`G.9e`), so `retype` is offered on an edge. Widening a descriptor's
  own field is not widening the closed action set.
- **The explorer menu writes where it was clicked** (`R.10`). It built its context from the project
  in context whatever the row, so a menu on B's row wrote A's log. It now builds from the row's own
  project and brings that project into context, which is what the left-click path always did.
- **An empty domain stem is not a repair** (`R.11`). Normalising `""` to `[]` carried nothing, so
  every pre-migration project without a domain opened with a trouble notice it did not earn.
- **actions.md gained a Does column** (`R.8`), copied from each descriptor's `about`. The
  descriptor stays the source.

**Watch, unresolved**: an edge menu now reads `Create Retype Refer Up Unlink Flip None Forward Back
Both Line Directed Note Define Relax Vocabulary` — sixteen flat entries with the four directions and
two forms unlabelled. It is legible because the options sit together in `ORDER`, but **`X.2`'s capped
list is what makes it good**, and a large vocabulary will make it worse before then.

### The tray, the table and the strip

**Contents already *is* the table view**, stuck at one size. Not a thing to move: U.7 already said
*both open partially, as the panel does now, and expand to the full canvas*, and landed `◐` on
exactly that — expand does not cover or replace Contents. The shipped `table` module's own listing is
the duplicate.

**The rule the rest falls out of: the tray shows the contents of whatever is in focus** — a block its
fields, a group its members, a note its text, a relationship its ends and what it could be. That is
why the capped type list stopped looking like a relationship special case: it is the *what could this
be* half of the same tray.

**The two sizes take different inputs.** **Full** — the `table` view on the stage — shows the layer
and everything in it, and **the selection does not narrow it**. **Partial** — the tray at the foot —
is that same table **scoped to what is in focus**. With nothing in focus the two agree, so *expand*
is only a size. Taking different inputs is what keeps this clear of the hidden state U.8 rejected:
the two never disagree about one input. A full stage given over to one note's text was the tell that
focus should not drive both.

**Matrix should be a heatmap** — the one thing a grid gives that a listing does not. **Hue is the
relationship kind, opacity is the count**: transparent at zero, grading up, so both dimensions read
at once without a mode switch. **The hue is the definition's existing `style`** (`styleOf` /
`lookOf`, `styles/sysml.ts`) — never a new matrix palette, so the matrix and the diagram cannot
disagree and there is no second colour vocabulary to keep in step. A cell holding two kinds draws as
**bands**, degrading to a solid cell in the common single-kind case.

**U.7 modelled table and matrix on Contents and deliberately did not delete it**, so this
duplication was known and accepted at the time; what changed is that the duplication turned out to
be the wrong way round.

### Listing the types in scope

**Three surfaces ask the same question** — the edge context menu, the selection strip and the canvas
*relation types* group — and each grows with the vocabulary. **One rule**: top three ranked by use,
a *More…* that expands in place, scrolling past a height, and no submenus. The relation types group
is the exception at three and no expansion, being a setting inline beside the crumbs rather than a
list of things to act on.

**The ranking already exists and is in the wrong place.** `Z.3` computes shape-weighted learned
preference in `terminal/rank.ts` and `terminal/feedback.ts` — measured *use*, which is what "the
three most common" should mean — but `terminal/` is **optional** (S6.3: delete it and the app still
runs). A menu ranking by preference therefore cannot live downstream of the rail, which is the same
argument that put `offer()` in `actions/` rather than `terminal/` (G.9a). Moving it also gives Z.3 a
second consumer; until now it ranked rail chips alone. **Cold start** falls back to vocabulary import
order, which Contents already uses for type offerings (D.2), so a fresh project needs no new rule.

**A typed name is a type.** The strip carries a text field beside the capped list: type a name and
the selection takes it. **Already built** — `fold.defineNamed` mints a definition for a bare name
under a derived id and describes itself as *the bridge from free text to a real definition*, and the
suite holds it. **Match before minting**: a free-text mint derives its id from the name while a
deliberate definition carries its own, so typing a name already in scope would produce a twin — the
duplicate-name case SC.4 needed disambiguation for.

**The strip re-defines the selected thing, never its type.** Name, which type it is, field values —
all instance-level. What fields a *type* carries and how it presents stays behind deselect on the
types chip (`W.3`). Splitting it the other way rebuilds, somewhere new, the duplication U.11 deleted
`Relations.tsx` to remove.

### Where each action lives

**A required `choice` is a question no menu asks**, so five actions were withheld from every offered
list while holding reserved `ORDER` slots — `mark` (`flow`), `direct` (`dir`), `reform` (`form`),
`axis` (`axis`), `arrange` (`shape`). Driving it: a card's menu offers *Relax* but never *Mark* or
*Arrange*. Asking where each of the five actually lives turned up more than the original defect.

| | Home | |
|---|---|---|
| `axis` | canvas bar, *flow* group | fine |
| `arrange` | `.shape` cluster, bottom right | fine |
| `mark` | Panel and Contents, `onMarkPort` — an interface's flow | fine |
| `direct` | — | **homeless** |
| `reform` | — | **homeless** |

**`direct` and `reform` have no home at all.** The canvas relation group is `onForm`, a **draft**
setting for what the *next* right-drag draws — a display preference beside `showPorts` and `angular`,
recorded as such under S2.6. It never touches an existing edge. `project.direct` / `setDir` /
`reform` exist and nothing calls them, so **once a relationship is drawn, its direction and its form
cannot be changed anywhere**.

**Settled — the options become the entries.** Right-clicking a relationship lists the relation types
and forms themselves rather than an action that then asks which. No submenu, and no open text prompt.
The list is tailored to the target because the options are. **It does not widen the closed action
set**: one registered action offered N times with different args, which is the wording U.16 used
before it was dropped. The flag goes on the **descriptor** (`expand`), keeping one rule instead of
the per-surface special-casing R.2 removed; `arrange` and `axis` leave it off because they have
homes. **Watch**: an edge menu then lists every relation type in the project.

**Two things fell out of the same question.** A **directed relationship draws no arrowhead**, so
direction is invisible even where the graph holds it — `direct` being unreachable is what hid it,
and arrowheads are the engine's visual language rather than chrome, so it is not Wave V's. And
**actions.md never says what an action does** — name, scope, arguments, mutations and what each
replaced, but no description, which is why `reform` had to be read out of the source. The text
already exists as `about`, required on all 29 descriptors.


## Open questions

*Kept at the front. Everything here blocks something in [plan.md](plan.md).*

### The simplified block model — settled, and what it left open

**Settled 2026-08-18 (Clay).** One block, no element forms; `proxy` → **reference**; `ref` the
value form → **`link`**; `set` → **folder**, an ordinary definition; **no `kind`** — behavior is one
package plus three view modules; `view` holds **references only** and the engine enforces it.
Vocabulary in [definitions.md](definitions.md), reasoning in [design.md](design.md) under *The
simplified block model*, queue shape in [plan.md](plan.md) under stream **B**.

**Closed by it, so nothing is owed:** the *kind signal* and *kind by fiat* repairs, `P.6`, `P.5`'s
mixed-children reading, and `S8.3`.

**Left open, and each blocks a row in stream B:**

| | The question |
|---|---|
| **B-a** | **What does the engine actually key off?** The rule is *drawing and placement only, by base-definition id*. The list of places that currently branch on `form` has not been taken — `graph/`, `modules/view/diagram/`, `page/Files.tsx` at least. Until it is, the size of the migration is a guess |
| **B-b** | **Does `holds` reach far enough to enforce *`view` holds references only*?** `holds` names which definitions may be children; *what kind of child link* is a different axis. Either `holds` grows a second half or the engine checks this one case directly — and it is the one case it is allowed to |
| **B-c** | **Where does a `resource` keep its content?** Inline in the log, or a path to something outside it. Inline means the log carries bytes; a path means a broken link is possible. Embedded scripts / images / video are recorded under *Out of scope* and must not force this answer early |
| **B-d** | **What happens to existing files?** Schema `1.2` writes `form: "proxy"` and `form: "note"`. Healing at the door (the `asVocabulary` pattern) or a schema bump — the door already heals a legacy domain stem, so the precedent is there, but nobody has decided |
| **B-e** | **Does the workspace itself become a `folder`?** Its children are references to project roots, which is a *view* by the definition above, not a folder. Either the workspace is a view, or filing is references-inside-a-folder and `view` is not the only thing holding them |
| **B-f** | **What is a pattern package, concretely?** A locked project holding blocks rather than definitions, referenced or copied rather than listed in `vocabulary`. The suite of predefined design-pattern and behavior packages Clay wants is a story of its own and has no rows |

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


- **spec.md still describes relationship forms as `plain` / `flow` / `assoc`** in *Relationships*,
  while *Project model* says `form` is `line` or `directed` "and that is the whole set" — which is
  what `EdgeForm` and the chrome actually offer. **Pre-dates Wave V** and was found while recording
  V.17a, so it is nobody's row. Either the three-way wording is dead text to delete, or `assoc` was
  a wanted third form that never landed; the bullet under it describing how each of the three draws
  has to go the same way. **Clay's call which.**

- **Does an action's description live on the descriptor or in `docs.json`?** `Action.about` is
  **required on every action already** and is documented as *"What it does, in a sentence — long
  enough to be scored against"* — `arrange` carries `"lay the layer out again"`. So the docstrings
  the expanded rail wants exist, on all of them. Copying them into `docs.json` gives one sentence two
  homes and they will drift. **Recommendation**: expanded mode renders `about` straight off the
  descriptor, and `docs.json` stays what Z.6 built — terms, keyed to definitions.md. If actions do go
  in the file, it must be nested (`{ "terms": …, "actions": … }`), because **`group` is already both
  a term and an action** and a flat key silently overwrites one with the other. Blocks the `Z.9`
  trim, and only that.

- **What comes out of Wave Z?** The `◆` on `Z.9` — the rows landed against a superseded spec, so
  answering it means deleting working, proven code. Nothing is touched until it is answered.

*Recently closed: **vocabulary editing needs no new door** (`W.3`). Definitions are not the contents
of anything, but the **layer listing already carries the types chip** (E.1), and the layer listing is
what the tray shows when nothing is in focus. Deselect and it is one chip away. The tray sits at the
foot in every view, so this holds from a block diagram, a matrix or an activity alike — which keeps
U.11's deletion of `Relations.tsx` honest. **One gesture does both jobs**: click empty space to
deselect, on the canvas and in the explorer, reaching a new project there (`V.14`) and the vocabulary
here. Field values were never in question — they are an element's contents and stay in the tray.*

**One wart, accepted rather than papered over.** Under *the tray shows the contents of what is in
focus*, a layer's contents are its elements — **definitions are the project's vocabulary, not the
layer's contents**, so `types` sits in the chip row as *show the vocabulary instead* rather than as a
filter over what the layer holds. It is a small category slip, it costs nothing, and fixing it would
buy a second surface nobody asked for.

*Recently closed: **an untouched project stays in the workspace.** It is a reference — a snapshot
taken before the user modifies it — and **the workspace is the user's to manage**: adding and
removing projects and blocks is their business, not something the app tidies behind them. So no
admit-on-first-change rule and no sweeping an empty project when it leaves context. The separate
half — that an untitled project falls back to the word `project` and reads as the workspace itself
— is closed too, by the naming rule already landed: a project comes into being by being named, so
there is no untitled project left to be ambiguous.*


*Recently closed — **Z.8** (proven): typed lists append at most one `docs.json` keyword hit,
always last (ghost); Enter/click surfaces gloss, no action; idle/answer lists stay actions-only.
Wave Z complete (Z.1–Z.8).*

*Recently closed — **Z.5** (proven): `samples/tutorial.json` + `walk_for(ctx)` on `proj_mndflow`;
advances by pick / ancestors / open layer; edge → relationship step. Collapsed quiet; Z.4 / Z.6 /
Z.7 preserved. **Parked**: proxy tip advance is canvas-only.*

*Recently closed — **Z.7** (proven): ▾/▴ titles Expand / Collapse Page Intelligence; `rail`
identifiers unchanged. No rename.*

*Recently closed — **Z.6** (proven): `samples/docs.json` ten terms; expanded gloss via
`doc_for(ctx)` / `shape_of`; Collapsed unchanged. **Left out**: Z.8 ranked-list doc hit (now
landed above); Z.5 tutorial.*

*Recently closed — **the last three rail unknowns** (shape settled; Z.6 / Z.8 now also proven
above).
**Z.6**: documentation lives in `samples/docs.json`, keyed by the terms in
[definitions.md](definitions.md) — hand-authored, and **no generator**, which is the obvious
unasked-for build step. **Z.7**: no code rename ever — `rail` stays the word throughout the tree
and the docs, and **"Page Intelligence"** is user-facing copy only. **Z.8**: scoped down to
**ranked actions plus at most one documentation hit**, on the single most relevant keyword and
**always ranked last**. That is a lookup and a sort, so **the rail as scoped is wholly
client-side** — the "may not be client-side" caveat and its "must work with it unavailable"
corollary are both retired. The **natural-language half is deferred, not dropped**: it moves to*
Out of scope *so nothing is built on it.*

*Recently closed — **the shell, and one word retired**. The **visual style is unfrozen** as stream
**U** (chrome only). A **saved view needs no new noun**: it is a block whose definition carries a
`view` component, holding proxies, filed in an ordinary folder — so the `view` **project** and the
workspace sense of **`diagram`** are both struck from definitions.md, leaving `diagram` with its one
meaning. **Which view is showing is a display preference** — sticky per project, never in the log,
and shown by a labelled control beside the project root rather than cycled by an icon. No sixth
page action; the closed set is untouched.*

*Recently closed — **Z.3** (proven): idle chips order by shape-weighted preference from
`feedback.read()`; typed keeps embedding/substring lead with shape tie-break and exact prior
entry pinned first; local sticky only. Confirming the default still writes nothing.*

*Recently closed — **Z.2** (proven): overrule feedback records to `mndflow.rail.feedback.v1`
with `shape_of(ctx)`; arrows / `Enter` unchanged; confirming the highlighted default writes
nothing. **Left out**: Z.3 learning from that store (now landed).*

*Recently closed — **Z.1** (proven): collapsed rail chips rank via embedding similarity; idle
kept fixed `ORDER` until Z.3; cold-model substring fallback; Chat warms embeddings; `suggest.ts`
deleted. **Out of row / parked**: README dep map still omits `terminal → actions`; `ORDER`
duplicated across Files / diagram / terminal; `Scores.tsx` unmounted.*

*Recently closed — **G.9d** (◐, proven): empty canvas right-click creates; existing opens
`offer(ctx)` in fixed order via `App` `onAct={project.go}` into Canvas; former immediates
(`interface`, `group`) are list entries; Name/Perch not immediate; `fill_args` leaves optional
`into` unset from focused card (multi-select Group creates). **Gap**: edge→`retype` — Scope is
element-only. **Out of row**: Files.tsx / `terminal/rank.ts` still fill optional `into` from focus;
`ORDER` duplicated across Files / diagram / terminal.*

*Recently closed — **U.6** (proven): empty-line block cursor overlays the rail input insertion
point; native caret hidden while empty; with text, native caret; U.5 collapsed/expanded unchanged.*

*Recently closed — **G.9c** (proven): click rail chrome focuses caret; chips from `offer(ctx)`;
arrows / `Enter` via `onAct={project.go}`. Embedding rank is Z.1; overrule feedback is Z.2;
learned preference is Z.3.*

*Recently closed — **G.9b** (proven): explorer row right-click opens `offer(ctx)` in fixed order
via `project.go`; empty-tree create unchanged; rename on double-click / ✎; `infer` enactable from
the list. **Parked**: Infer's new behavior project is not admitted into `held.projects`, so it
does not appear in the explorer.*

*Recently closed — **the design of G.9**. One set of offered actions, presented two ways: the menu
in **fixed** order, the rail ordered by **learned preference**. **The list lives in `actions/`**, not
in the rail, because the rail stays optional and a menu importing it would break S6.3. **`infer`'s
trigger is the explorer menu** with the explorer as context. **On the canvas the target decides** —
empty space still creates, an existing card / frame / edge / selection opens the list, and right
drags are untouched.*

*Recently closed: **the terminal is unfrozen**; **A.12 is dropped** — a child block's inside already
is an internal block diagram.*

*Nothing here blocks a plan row, and **no `◆` gate is left** — Z.6 is answered above. A.7a's
design is settled — the whole of it is in [behaviors.md](behaviors.md); `infer` is built; activity /
state / sequence views draw derived labels (A.7b–A.9). What remains open inside behaviour is listed
there under* Still open*.

*Recently closed: **the readout is gone** (U.11, proven) — header toggle and `Readout` /
`Relations` / `Log` deleted; Contents types chip covers add/rename/drop of relation kinds (E.1
confirmed); theme and Chat `onAct` intact. **Left out**: action history UI; Scores remount;
project relation wrappers. **Parked from review**: `terminal/Scores.tsx` unmounted; `project`
`addRelation` / `renameRelation` / `dropRelation` wrappers unused.*

*Recently closed — **U.14** (◐, proven): explorer `＋` follows selection (project vs block);
tooltip names which; project exists once named; `workspace.begin` + outcome test. **Closed by U.18**:
`App.newProject` goes through `workspace.begin`. **Out of row**:
`NameField` layer-only refuse; G.9b project-entry half-true.*

*Recently closed: **page mounts the rail or does not** (S6.3) — optional via `import.meta.glob`;
build without `terminal/` passes; Chat proven. Matching tab retired with U.11 (Scores had no
mount once the readout went).*

*Recently closed: **`project.ts` free of the terminal** (S6.1) and **`terms` in `packages/terms/`**
(S6.2). Detach only; the A0.2 bridge waited on D.2.*

*Recently closed: **vocabulary as package import list** (D.2, proven) — `graph.vocabulary` /
`set_vocabulary` are `string[]`; `asVocabulary` heals a legacy stem; A0.2 `Domain.relations` bridge
retired; Contents offerings follow import order; Scores via `stemOf`. **Left out** (not this row):
Z prompt rework; Contents split; package authoring UI. **Parked from review**: `packagesOf` may
have no production callers; `store.ts` private `stemOf` name collision with graph's; unnamed
session key `mndflow.steps..v1`.*

*Recently closed: **`infer`** (A.7a) — selection → one behavior block + `Effect.home`; writing into
a foreign project via `Effect.into` / `writeInto` (S4.9). Explorer menu reaches it (G.9b, proven).
**Parked**: new behavior project from Infer not admitted into `held.projects` (not in explorer);
App refresh after foreign write. Cap is a tree slice, not connected-components.*

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
on Windows; no distinct CSS.*

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
(600) is next in line** — six Wave U rows reach it (G.9b landed), with no seam cut for it either.
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
  `retype` declares `element` and `run` still accepts an edge id. **G.9d gap**: offering `retype`
  on an edge waits on Scope naming both.
- **No Arg kind for a ports/sides pair.** `relate` carries them in the args bag for the gesture;
  a sentence never supplies either.
- **Gestures are not on the descriptor.** A view owns its gesture map and binds a gesture to an
  action name, so S1 and S2 stay disjoint and two views can bind one action differently.
- **Every action is enumerated in [actions.md](actions.md)** — name, scope, arguments, the
  mutations it writes, and which of today's closures it replaces. Build against that table, not
  against `project.ts`.
- **`fill_args` optional `into` from focus.** Diagram's canvas path no longer fills optional `into`
  from the focused card (G.9d — multi-select Group creates). **`page/Files.tsx` and
  `terminal/rank.ts` still do** — same refuse risk when an optional `into` is wrongly supplied.
- **Collapse the duplicates as part of the extraction**, so nothing later is written against a
  surface that then changes. 52 entries in `act` become **29 actions**, 4 adjustments, 5 page
  actions and 5 queries that leave the surface entirely. *Done with S1.6.*
- **`check` refusals reach the strip** via Ask + Canvas `onSay` (S1.7, proven), including
  `NameField` taken-name marks. **Finding (U.14)**: `NameField`'s own refuse sentence is
  layer-only — wrong for naming a project; explorer project prompt suppresses it and uses the
  project rule on commit. Needs a non-layer refuse path when App / NameField are next owned.
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
  **Matrix** when named (A.2, suite). Both are Contents-modelled panel shells with crumbs + types
  cycle (U.7 ◐). **Gap**: App does not wire `path`/`onUp`; no `tray.full`; expand does not
  cover/replace Contents. **Activity** when `view.module` is `activity` — dimmed labels/order
  (A.7b, proven). **State** when `state` — empty infer offer; Reading A/B; DIM (A.8, proven).
  **Sequence** when `sequence` — columns; directed then axis; DIM (A.9, proven). **Parked**: RF
  framed host; gestures on activity plane; activity-final double ring. Rules evaluate and advise in
  the tray (S5.3). The module `validate` / `findings` hook is live (S5.4); no shipped module
  supplies a real one yet, and Contents still surfaces constraint/rule notes only.
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
consumer's `defs`. **A0.2 terminal bridge is retired** (D.2, proven): `Domain.relations` and the
core YAML seeding path are gone; entry writes `asVocabulary(template)` and vocabulary is the
package import list. **Preset registry** is in (`ship` / `presets` / `preset`); no concrete
presets yet. Style sets live under `styles/` (`sysml` shipped); the block diagram draws from
style (S2.6b).

**Parked from A0.3:** `fold` `isa` / `resolved` still read only local `graph.defs`, so a path-shaped
`extends` does not walk yet. *(README dep map **lags**: it still omits `terminal → actions` —
Z.1's ranking reads the action surface through the rail. Update the map when next touching
README.)*

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
| `page/Readout.tsx` | was `Scores` | **gone** (U.11) — Scores unmounted; component left for Z |

- **An optional part that half the app imports is not optional.** Where the rail runs is undecided —
  currently fully local — and the design deliberately does not wait on that. What it does require is
  that including it is a choice. **S6.3 proves the page can omit it.**
- **`terms` moved to `packages/terms/`** (S6.2). **D.2 / A0.2 bridge retired** with vocabulary as
  the package import list.
- **Every capability the rail adds must exist without it.** If the only way to do something is to
  say it, the rail has stopped being optional. **Checked against Z.8**: the ranked doc ghost only
  surfaces a gloss (no action), so nothing actionable is rail-only.
- **Matching tab empty when Scores absent** — **closed** by U.11 (tab deleted with the readout).

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
  import list is `graph.vocabulary` (D.2, proven). Package authoring UI did not land with D.2.
- **`packagesOf` may have no production callers** — thin workspace bridge left after D.2; confirm
  before deleting.
- **`store.ts` private `stemOf` name** — collides in meaning with graph's `stemOf`; rename or
  document when next touching storage.
- **Unnamed session key `mndflow.steps..v1`** — odd empty-id key; park until a naming / session
  row owns it.


## Phase 1: the streams

| | Owns | Waits on |
|---|---|---|
| **A** Views and packages | `modules/view/`, `packages/` | S2, S4 |
| **C** Geometry | `geometry/` | S3 (perf only) |
| **D** Vocabulary | `terminal/workflows.ts`, `graph.vocabulary` | — |
| **E** Definitions and fields | `page/Contents.tsx` | S1 |
| **F** Durability and files | `graph/store.ts`, `page/Files.tsx` | S4 for the workspace export |
| **G** Canvas polish | `canvas/`, `page/Panel.tsx` | S2 for the menu only |
| **H** Sample project | `samples/` | — |
| **U** The shell | `src/styles.css`, `page/App.tsx`, `page/Files.tsx` | **done** — U.18 ◐ landed the wires; `tray.full` went to W.1 |
| **V** The shell, second pass | `src/modules/icons/`, `src/styles.css`, `page/`, `modules/view/` | **done** — every row landed and is in landed.md |
| **T** The suite | `tests/` | U for the page rows only |
| **Z** Terminal | `terminal/` | built but thin — Z.9 trims; Z.5 last |

**Startable today:** **P.1** (a block can leave a project), **T.5** (DOM harness), **S7** (the
`Files.tsx` seam). **A.7d moved into stream P** — it was never `infer`'s gap; see above. **`U.18` landed short**: U.7's `path` / `onUp` reach table and matrix and U.14's
`newProject` goes through `workspace.begin`, but `tray.full` went to `W.1` — nothing asks for a full
tray, so the rule would be dead CSS ahead of the door that reaches it. **Wave U is complete** — U.16 dropped, the
arrangements were never in the bar to move out of. **G.9a–G.9c landed, and G.9e closes G.9d ◐**:
`Scope.on` takes a list, `retype` is scoped `element|edge`, and the edge menu offers it (proven).
**F.2** and **D.2** are done (proven).

**Wave V is complete.** The shell has one icon vocabulary, two labelled settings groups at the top
and the verbs at the bottom, a project that can be made and deleted from the tree, and a relation
type picked before the drag rather than corrected after it. **`R.5`–`R.8` and `R.10` / `R.11` have
landed and were driven** — see *The offered list grew a rule* below. **Next is Wave W** (the tray,
the table, the heatmap) and **Wave X** (the shared capped list), with `Y.4`'s `types` group, `Y.6`'s
`svg.ts` remainder and `Y.7` still open in Y.

**The terminal is no longer parked — Wave Z is done.** It ranks and completes whatever the
surface offers. **Z.1–Z.8 landed** (embedding rank; overrule feedback; learned preference;
expanded guidance; tutorial walk; context gloss; Page Intelligence titles; ranked doc hit last).
It was the acceptance test for everything above.

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
  (*done*, proven). Chrome (crumbs / types) hosted beside Table/Matrix (*done* under U.7 ◐).
  **A.2** — matrix mounts when named (*done*, suite). **A.7a** — `infer` + `Effect.home` (*done*,
  suite 387). Explorer menu reaches it (G.9b, proven).
  **Parked**: new behavior project from Infer not admitted into `held.projects` (not in explorer).
  Cap is a tree slice, not connected-components. **A.7c** —
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
- **`vocabulary` is the package import list** — *done* (D.2, proven): `graph.vocabulary` /
  `set_vocabulary` are `string[]` of package ids in order; `asVocabulary` heals a legacy stem;
  fold/file/door round-trip; entry writes the healed list; A0.2 `Domain.relations` bridge retired;
  Contents offerings follow import order; Scores via `stemOf`. **Relation seeds** already live in
  `packages/core/` (A0.2). **Left out of D.2**: Z prompt rework; Contents split; package authoring
  UI.
- **The words are what a module needs** — what this notation calls a block, a group, a
  relationship. Still separable from the prompts; chips have not switched yet.
- **The prompts belong to Z** — still open. Keep `terms` and one opening hint per domain; the rest
  of each YAML serves a question loop that only Z's expanded half still needs. Do not invest in
  the prompt sets.

### E — definitions and fields

- **Editing definitions.** *Done* (E.1, proven): types chip + edit defs in the contents tray —
  fields, defaults and presentation. **Relation kinds too** (U.11, proven): add / rename / drop of
  relationship (line) definitions via the same chip — Contents was already the path; the readout's
  Relations tab was the duplicate.
- **Form-specific field controls.** *Done* (E.2, proven): number with unit, choice with its list,
  ref with a target picker — on usage and definition fields.
- **Tags.** *Done* (E.3, proven): add/drop on usage and definition fields.
- **Icons.** A definition should be able to draw one as well as a boundary or a note. `layout: icon`
  renders a **glyph** today; no SVG and no set chosen. Retiring `figure` did not add to this — every
  ornament walked came out as a shape plus a size — but an actor still wants a real icon.
- **Multi-select in the explorer tree.** *Done* (E.4, proven): Shift/Meta builds `Chosen[]` across
  blocks, branches and projects. **Parked**: Ctrl on Windows; no distinct multi-select CSS.
- **Packages** — the two notations that turned out to be data rather than views. **Requirements**
  (*done*, A.3), **flow** (*done*, A.5) and **parametrics** (*done*, A.4) ship as YAML under
  `packages/`.
- **Authoring a package** wants somewhere to put a plain name, a formal name and a mapping, which
  is the same place a definition's fields and presentation are edited.
- **Type offers are package-disambiguated** when two definitions share a name (*done*, SC.4).

### F — durability and files

- **File System Access** — *done* (F.2, proven): Chromium live bind via `store.hold`, drift via
  `store.probe`, focus/visibility re-attach on document replace; header `data-where` is
  `session` | `drifted` | `unsaved`; download when the picker fails. Owns `graph/store.ts`,
  `page/App.tsx`, `project.ts`.
- **Explorer says "No project yet" while a live block is open** — pre-existing; not F.2. Parked.
- **Rendered SVG beside the source** — *done* (F.3, proven): SVG download beside the JSON export.
  Owns include `modules/view/diagram/`, `graph/store.ts`, `page/App.tsx`, `project.ts`.
- **Reviewing a model change as JSON is poor.** Committing a rendered SVG beside the source makes a
  pull request readable — now available beside the source export.

### G — canvas polish

- **The context menu is designed** (G.9). **One set of offered actions** for the selection in its
  context, presented two ways. **The list is identical; only presentation differs** — the menu shows
  a **fixed** order, the rail orders by **learned preference for that context**. Ordering is the
  presenting surface's business and never the list's.
- **The offered-action list** (G.9a) — *done*, proven (actions suite; browser skipped).
  `actions/offer.ts` exports `offer(ctx)` — membership for the current context (scope + `when`), no
  ordering of its own. Lives beside the registry, not in `terminal/`, so S6.3 still holds. **Still**:
  `actions/index.ts` exports a twin `offered()` — retire or re-export once owns allow; suite
  coverage may move from `offered` → `offer` when callers cut over (T.1 landed the action-module
  suites; dedicated `offer` cover still waits on that cutover). Explorer (G.9b), rail (G.9c) and
  canvas (G.9d ◐) draw from it.
- **Explorer right-click menu** (G.9b) — *done*, proven. Row right-click opens `offer(ctx)` in fixed
  order via `App` `onAct={project.go}` (`go` exposed); empty-tree create unchanged; rename stays
  double-click / ✎; minimal `.offer` CSS. **`infer` is reachable** from the list. **Parked**: a new
  behavior project from Infer is not admitted into `held.projects`, so it does not appear in the
  explorer. **Half-true**: U.14's claim that the list offers *add a project* as well as a block —
  only the block path is solid; project entry via the menu is not fully there.
- **Rail offer surface** (G.9c) — *done*, proven. Click chrome focuses caret (`preventDefault`);
  chips from `offer(ctx)`; arrows move highlight; `Enter` takes via `App` `Chat`
  `onAct={project.go}`. Embedding rank is Z.1; overrule feedback is Z.2; learned preference is Z.3.
  Caret at insertion is U.6 (landed).
- **`ORDER` is duplicated** across `page/Files.tsx`, diagram offer chrome, and `terminal/` — same
  fixed sequence copied for menus / cold fallback. Collapse to one export when owns allow (likely
  beside `offer`). Still open after Z.3.
- **Canvas right-click menu** (G.9d) — ◐, proven. Empty space still creates; existing card / frame /
  edge / selection opens `offer(ctx)` in fixed order via `App` `onAct={project.go}` into Canvas.
  Former immediates (`card→interface`, `frame→interface`, `selection→group`) are list entries;
  Name/Perch not immediate. `fill_args` leaves optional `into` unset from focused card so
  multi-select Group creates. **Gap**: edge→`retype` — Scope is element-only (see S1). Right drags
  untouched. **`interface` loses its one-click path** — worth watching; may want to stay first in
  the fixed order.
- **The selection box.** *Done* (G.7, proven): both ends inside selects the edge; one end does not.
  Dead CSS: `.leg-grab` / `.leg-mark` still describe segment grab bands `Wire` no longer draws.
- **Esc after marquee.** Esc does not clear RF-selected edges after a marquee selection. Parked
  under gestures; not the selection-box row.
- **Filter relationships by type on the canvas** — *done* (G.1). Toolbar cycles types; filtered
  edges do not draw; seats clear. **Parked**: the filter is not persisted in localStorage.
- **`Ctrl`/`Cmd` + `A`** — *done* (G.5). Selects all cards; Esc clears an RF multi-select via
  `changeNodes`; Fit and Group still work with the selection.
- **`relax` and `size` are wired** — ∿ click (`onClick={() => onRelax()}`) and note SE resize
  (G.2 / G.3; U.2 retuned the relax mark). **`dissolve` is registered and offered from the canvas
  menu** when a group is in scope (G.9d ◐); groups are not listed in the explorer. Delete on a
  group row still goes through remove, not dissolve.
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
- **Z's tutorial is walked over a sample** — *done* (Z.5, proven): `walk_for` on `proj_mndflow`
  via `samples/tutorial.json`. This stream still decides what a first project looks like as well as
  proving the format. Worth one sample per module eventually, not just this one.

### U — the shell

**U.1 landed** (proven): header identity truncates (tools stay); session/where ellipsizes; crumbs
left half truncate; `.arrange` wraps instead of overlapping crumbs; stage `min-width: 0` / overflow
clipped. **U.17 landed** (proven): project roots spaced as siblings. **U.3 landed** (proven):
explorer width `min(280px, 36vw)`; collapses to a 28px strip (◂/▸); tree hidden until reopened; bar
title ellipsizes; U.17 spacing and G.9b `.offer` intact. **U.4 landed** (proven): header theme
group `current` / `modern` / `light` (`current` default); CSS variable palettes on `data-theme`;
sticky `mndflow.theme.v1`; chrome washes for shell overlays. **U.11 landed** (proven): readout
toggle and three tabs gone; Contents covers relation kinds; theme and Chat `onAct` intact.
**U.14 ◐** (proven): explorer `＋` follows selection (project vs block); tooltip names which;
project exists once named; `workspace.begin` + outcome test. **Closed by U.18**: `App.newProject` goes
through `workspace.begin`. **U.2 landed** (proven): one chrome glyph vocabulary —
no mark means two things; `·` axis-none only; `⊏` interfaces-off; `∗` all-types; arrangements
`▦⊙⇄⇅`; relax `∿`; explorer roles/bar. **Left out**: stream E icons; table/matrix still `·`
types (outside owns). Words/groups were U.15. **U.15 landed** (proven): vertical subject groups
*interface* / *relation* / *flow*; every control word+glyph; form / draw / types / axis as radio
rows; arrangements stay on `.shape` with words (U.16 dropped). **U.8 landed** (proven): labelled
view toggle beside project root; three modules per kind with U.9 glyphs; sticky per project in
`mndflow.view.v1`; writes nothing; App mounts from sticky pick when it fits, else layer
`view.module`. **Out of row**: a `.files-scoped` class may help a cramped root row;
behavior-kind modules were not driven in prove. Reasoning in design.md under *The shell yields;
the stage does not*.

- **Chrome yields, the stage does not** — *done* for header / crumbs / arrange / stage (U.1) and
  for the explorer bound (U.3). What must never happen is chrome growing until it collides with
  itself.
- **One glyph vocabulary** — *done* (U.2, proven): no mark means two things across header,
  explorer and diagram chrome. `·` is axis-none only; interfaces-off is `⊏`; all-types is `∗`;
  arrangements are `▦ ⊙ ⇄ ⇅`; relax is `∿`; explorer roles are ■ / □ / ◫. **Still open**:
  table/matrix types chrome still reads `· types` (outside U.2 owns — follow when next touching
  those chrome files); stream E definition icons. Module-icon placement on the view toggle is
  U.8 (landed). Words/groups are U.15 (landed).
- **A theme is not a style set** — *done* (U.4, proven): `src/styles.css` is app chrome; root
  `styles/` is the `style` component's per-definition presentation and stayed untouched. Header
  group `current` / `modern` / `light` (`current` default); CSS variables via `data-theme`; sticky
  `mndflow.theme.v1`; chrome washes for shell overlays. Diagram hardcodes and a `store.ts` theme
  flag were not added — chrome only.
- **The explorer must hold more than one project legibly**, which is what a bounded width costs and
  what per-view icons buy back. **Space between projects** — *done* (U.17, proven): project roots
  `className="project"`; sibling projects 10px top margin. **Width cap / collapse** — *done*
  (U.3, proven): `min(280px, 36vw)`; 28px strip (◂/▸); tree hidden until reopened; bar title
  ellipsizes.
- **Adding a project opens the name prompt** — *done* (U.14 ◐, proven): explorer `＋` follows
  selection; tooltip names project vs block; project exists once named; `workspace.begin` +
  outcome test. **Still open**: `App.newProject` should call `workspace.begin` (App not owned);
  `NameField`'s built-in refuse sentence is layer-only and wrong for project naming; G.9b's claim
  that the right-click list offers *add a project* as well as a block is only half-true.
- **A distinct icon per view module** — *done* (U.9): each of the six publishes a distinct `icon`
  on `ViewModule`; `.view-icon` styles it; property tests hold non-empty and pairwise distinct.
  **The labelled view toggle draws them** (U.8, proven). **Definition icons are a different
  want** and stream E already holds it (`layout: icon` renders a glyph; no SVG, no set chosen) —
  do not re-open it here.
- **The view toggle is a labelled control beside the project root** — *done* (U.8, proven): three
  modules per kind with U.9 glyphs; sticky per project in `mndflow.view.v1`; writes nothing; App
  mounts from sticky pick when it fits, else layer `view.module`. Not an icon that cycles.
  **Out of row**: a `.files-scoped` class may help a cramped root row; behavior-kind modules were
  not driven in prove.
- **It writes nothing.** Which view is showing is a display preference — the same rule as
  `showPorts` and `angular`, and the reason is definitions.md's own test: *what belongs to a project
  is what is in the log*. The definition's `view.module` says how a layer **opens**; the toggle says
  what is on screen **now**. No sixth page action was added, so the closed set is untouched.
  Sticky key is `mndflow.view.v1` (U.8, proven).
- **Table and matrix take Contents as their model** — *done* (U.7 ◐, proven): both open as panel
  shells (~⅓ stage; expand fills stage); A.1 chrome — crumbs + types cycle (definition names on
  table; relationship marks on matrix); optional `path`/`onUp` with trail/climb from the graph when
  omitted. **Still open**: App wiring of `path`/`onUp`; `tray.full` in `styles.css`; expand covering
  or replacing Contents; types cycle still reads `· types` while diagram chrome uses `∗` (U.2 left
  that outside owns).
- **Contents is not deleted.** It is the model and stayed untouched. Definition and field editing
  (E.1–E.3), constraint and rule advice (S5.3) and type offers (SC.4) all stay where they are.
- **The rail's collapsed form is a minimal text entry with inline chips**, and its expanded form is
  laid out to match — *done* (U.5, proven): defaults collapsed (one-line, inline chips); expanded
  is a two-column guidance shell; ▾/▴ toggles; G.9c focus / filter / Enter unchanged.
- **The rail caret sits where the text cursor is** — *done* (U.6, proven): empty-line block cursor
  overlays the input insertion point; native caret hidden while empty; with text, native caret;
  U.5 collapsed/expanded unchanged.
- **Undo and redo read as words, at the foot of the explorer**, beside one line naming the last
  executed action — *done* (U.12, proven): Undo / Redo as words; last-action line; header `↤` /
  `↦` gone; keyboard shortcuts unchanged; collapsed explorer hides the foot; U.13 new workspace
  and U.17 spacing intact. `Log.tsx`'s rule — *reaching them never means opening anything first*
  — holds as reopening the explorer, not opening a drawer.

**The readout came out whole** (U.11, proven) — the header toggle and all three tabs. Confirmed
before deleting:

- **`Relations.tsx` was redundant** — Contents types chip already add / rename / drop relation
  (line) kinds as relationship-form definitions (E.1). Capability kept; duplicate UI gone.
- **`Log.tsx` went with it.** Action history stays future work below; U.12's last-action line
  (landed) keeps the one part worth glancing at.
- **`terminal/Scores.tsx` lost its only mount.** Still unmounted after Z.1 (ranking does not need
  that surface). S6.3's parked *"Matching tab empty when Scores absent"* **closed** by deleting the
  tab. **Parked**: remount Scores somewhere if a matching readout is wanted again.
- **`project.addRelation` / `renameRelation` / `dropRelation` wrappers** — unused after Relations
  went; registry `define` / `undefine` aliases remain. **Parked**: drop or rewire when next
  touching `project.ts`.

**The `＋` was doing three jobs** and one of them was backwards: new block
([Files.tsx:548](../src/page/Files.tsx#L548)), new relation kind (`Relations.tsx`, **retired** with
U.11), and **discard-and-start-empty** ([App.tsx:511](../src/page/App.tsx#L511)) — which removed
rather than added. U.11 retired the second. The other two split by **scope**, which is the rule
worth stating:

- **The header is workspace-scoped; the explorer is project-scoped.** Adding a project is filing,
  and filing belongs to the tree that shows the filing. So the header keeps only *clear the session
  and start a new workspace* (**U.13, proven**), and the explorer's `＋` gains *add a project*
  (U.14 ◐).
- **A new workspace is a bigger thing than a new project**, since it drops every open project at
  once — *done* (U.13, proven): header *new workspace* word; confirm kept; `store.clearSession()`
  drops keyed logs, workspace list, session pointer and live handle; `clearWorkspace` → blank
  `Held`. It **reads as a word rather than a glyph** — rare and destructive is exactly when a
  label beats an icon, and it is the same move U.12 makes for undo and redo. **It lands on a
  state the design already wants**: a fresh session has no project and says so, so clearing to
  nothing is the designed opening rather than a special empty case. **Note**: live FS handle
  release was not exercised in the browser drive.
- **Adding a project is a workspace operation**, `begin` / `admit` with a naming-first log — the way
  unlock and fork are (S4.8), and not a registry action. No page action was added, so that
  enumerated set is untouched. **`App.newProject` goes through `begin`** (U.18, proven): it names,
  mints the id, writes the first step and admits in one call, instead of App keeping its own copy of
  the name check beside an unwired door.
- **Blocks keep a one-click path.** The explorer `＋` follows the selection exactly as the canvas
  right button does (G.9d, *the target decides*): a project or nothing selected makes a **project**,
  a block selected makes a **block** under it. This is **not** the hidden state U.8 rejects — the
  selection is visible and the tooltip names what the button will do. **G.9b's right-click list
  offering both is only half-true** — record, do not invent a second create door here.

**The canvas options share one design language** (U.15, proven). Vertical subject groups
*interface* / *relation* / *flow*; **every control carries a word**, glyph as scan aid. Form,
draw, types and axis are **radio rows**; interfaces stay a two-state toggle. **Arrangements sit on
`.shape`** with words beside the glyphs, and **stay there** — U.16 is dropped.

- **Every control carries a word** — *done* (U.15): same move U.12 / U.13 made for rare
  destructive controls, applied to the canvas options.
- **No mark may mean two things** — *done* (U.2, proven) for diagram / explorer / header chrome.
  `·` is axis-none only; interfaces-off is `⊏`; all-types is `∗`; radial `⊙` and relax `∿` no
  longer share a circle; arrangements are `▦ ⊙ ⇄ ⇅`. **Still open**: table/matrix types chrome
  still reads `· types` (outside U.2 owns).
- **Grouped by subject, vertically** — *done* (U.15) for *interface*, *relation*, *flow*.
  `angular` / draw with **relation**; `axis` with **flow**.
- **The verbs were never in the bar** — U.16 is **dropped**, and its premise was the error. design.md
  says *toolbars divide by states against verbs, which is why the two sit far apart*, and that is
  already satisfied: `.shape` is a floating cluster at the canvas's bottom right, not a group inside
  the `.arrange` bar. The bar already holds states only. **The interface stays the same whatever the
  layer or project**: arrange / relax are reachable at the bottom right everywhere, project root
  included. **Correction from driving the app**: it was also said that `arrange`, being layer-scoped,
  already appeared in the frame's right-click list. It does not — a required `choice` argument
  withholds it from every offered list. `R.5` gave that rule a way out (`expand`), and **`arrange`
  deliberately leaves it off**: the bar is its only door, which is the wanted outcome.

**Contended owns, declared.** `terminal/` Wave Z is complete (U.5 / U.6 / G.9c landed with it);
`modules/view/diagram/chrome.tsx` has **no queued owner** (U.2 and U.15 landed; U.16 dropped).
**`page/Relations.tsx` is gone** (U.11) — stream E no longer shares it.

**`page/Files.tsx` was this wave's contended file** — G.9b / U.17 / U.3 / U.12 / U.14 ◐ / U.2 /
**U.8** all reached it; **U.8** was the last Wave U owner. That was the shape `Canvas.tsx` and
`Contents.tsx` had before their seams were cut, and **no row cut one**: the file grew as those
rows landed. No remaining Wave U row owns it.

### V — the shell, second pass

**The wave is complete** (every row proven). The icon set lives in
`src/modules/icons/`: one 24-unit grid, one 1.5 stroke, `currentColor`, and **names that are
purposes rather than shapes** — `fold_all`, never `minus_box` — which is what stops two meanings
quietly sharing a drawing. `ViewModule.icon` is a **name into the set**, so U.9's conformance test
holds unchanged. The chrome carries no Unicode mark at all now.

**It broke its own rule while being written, which is worth keeping.** `plain` and `none` came out as
the same dash and `directed` and `across` as the same arrow — sitting in adjacent groups, which is
exactly the failure U.2 existed to end. Relationship forms took end bars, and **a property test now
holds that no two names draw one path**, so it cannot come back quietly.

**V.4 was an overridden rule, not a missing one.** `compose.ts` set `stroke` inline, and an inline
style outranks every selector, so the hover rule that had been in `styles.css` all along could never
apply. The colour goes through an `--edge-stroke` custom property now. The dead `.leg-grab` /
`.leg-mark` rules — grab bands `Wire` stopped drawing — came out with it.

**V.15 took the whole filter, not just the control**: the `shown` state, the `kinds` list, the
`shows` predicate and `clipped` are gone and every edge draws. It landed with V.2 because `∗ types`
was the last Unicode mark in the chrome, and converting a control about to be deleted is waste.

**The view toggle overflowing the explorer's width cap** — `matrix` clipped — is what **V.5**
(icon-only) fixed; it fits now.

**A review of the wave's last rows found six more, all fixed with them** and every one invisible to
the suite: a typed drag minting a local stub that shadowed the package's own definition; a named
type's declared form never applying, because `form` always arrives from the gesture; a deleted
project leaving the session pointer naming it, so the next load opened a ghost id and the first
edit wrote it back; the delete confirm capturing `held` at prompt time, so a project imported while
the prompt sat open was dropped by writing back a stale list; a picked tie looking identical to an
unpicked one, the rules having been copied from `.reaching`, whose base sets an opacity `.tether`
never had; and the vertical group separator still applying to the now-horizontal bar. **The pattern
worth keeping**: four of the six are *a value read at the wrong moment or from the wrong scope* —
a stale capture, a derived id, a fallback that could never fire.


U made the shell coherent; **V makes it legible and compact**, and every row came from driving the
built app. Detail is on the rows in [plan.md](plan.md); what belongs here is the five open decisions
and the two reversals.

**All five decisions are answered; V has no `◆` left:**

- **The icon vocabulary replaces the Unicode marks outright** (V.2). **One module defines the set** —
  the default icon/SVG vocabulary *and* the design language over it: one grid size, one stroke
  weight, one idiom, so the app has a single visual language rather than a drawer of glyphs. Every
  surface draws from that module and none inlines its own. Vendored inline SVG, no package, since
  icons are markup. **U.2's rule carries over, not its glyphs**:
  *no mark means two things* governs the new set exactly as it did the old. **This is also why the
  chrome reads blurry and indistinct** — a Unicode mark renders from whatever system font happens to
  carry it, unhinted at small sizes, with per-platform metrics and an unreliable baseline; an SVG
  draws at an exact size with one stroke weight. **It moves `ViewModule.icon`**, which U.9 published
  as a Unicode string with a conformance test asserting non-empty and pairwise distinct — the six
  modules and that suite travel with the row. **Per-definition icons stay stream E's** (`layout:
  icon`) and become a consumer of this set later; not V's to reopen.
- **The theme toggle is three positions** (V.1) — Light, Modern (dark), Retro (green-on-black),
  **Retro default**, in Nextra's shape. Recorded plainly: **Retro sits in the *system* slot but does
  not read `prefers-color-scheme`** — it is a third look wearing that icon. Genuine OS-following
  would need a fourth state and is not wanted.
- **The per-project export is today's `↧` moved, not a new capability** (V.6). A **project export**
  writes the whole model — elements, edges, groups, history — as a file that stands alone and
  imports back as a project. A **package** is the other thing entirely: definitions only, loaded by
  stable `pkg_*` id, never copied into a consumer's `defs`, listed in `graph.vocabulary`. Publishing
  a project *as* a package is the **package authoring UI already parked from D.2**, and stays there.
- **Flow does not apply an arrangement** (V.7, and V.8 dropped). Considered and refused, because it
  would turn a setting into a mutation: `actions/layer.ts` keeps *an arrangement writes ordinary
  placement … an axis is a setting and says nothing about where cards go*, and wiring the two would
  make an axis change write placement for every card into the log. The groups only move **next to
  each other**, staying visibly distinct — distance carried that separation before, and a group
  boundary has to carry it now.
- **The project root icon folds, and the row click still switches** (V.9 + V.10, one span so one
  row). **Why it does not work today**: `projectRoot` is a separate render path from `row`, and its
  icon is a plain `<span className="icon">▣</span>` — no `fold` class, no `onClick`, no
  `onMouseDown`. The block row has all three, the `onMouseDown` there to stop the row's drag
  swallowing the click. The handler was simply never written. The same span also answers **V.9**:
  `kind` is *already computed* one line above it from `kindOf(viewOf(here, root).module)` and the
  icon ignores it. Kind stays derived, never stored.

**Two reversals of landed decisions**, taken deliberately — there is not enough room for the words —
and recorded so the reasoning is read rather than rediscovered. **V.3** puts *new workspace* back on
an icon against U.13's *rare and destructive is exactly when a label beats an icon*; the glyph is
**not** a refresh mark, which reads as *reload* — the opposite of *discard every open project* — but
a discard one. **V.5** makes the view toggle icon-only against U.8's *a labelled control … not an
icon that cycles*, survivable only because U.9 gave the six modules distinct icons. Both keep what
makes them safe: V.3 its confirm, V.5 its tooltips, which stop being optional.

**The standing line**: chrome may shrink to icons, but an icon firing a destructive or irreversible
action needs a word, a tooltip or a confirm.

**A third reversal, V.19, came from driving the finished wave** — Clay's call, taken after seeing
it. **The view toggle became one cycling icon**, which is what U.8 refused outright and V.5 only
half-moved toward. The refusal was against *an icon that cycles* hiding which state it is in; that
does not hold when the icon **is** the state and the tooltip names the next one, and three buttons
genuinely do not fit a tree capped at `min(280px, 36vw)`. **The two top groups un-inlined** — V.17
put them side by side, and stacked they match flow and arrange exactly, which is the better rule:
one settings idiom on the canvas rather than a top one and a bottom one. **Arrange gained a label**
and both boxes now hug their words. **The per-project export wears an options mark** and is the
first entry of what will be a menu — recorded as a placeholder so it is not read as finished.

**Watch**: an options icon that fires an export directly is a small lie until the menu lands. It
keeps a tooltip naming what it actually does, which is the standing line above applied to a mark
that promises more than it delivers rather than less.

**V.19 also took the theme toggle down to one cycling icon** — the same reversal as the view
toggle, for the same reason, so the two now read alike. `view_block` became a plain square: it was
a wide short rectangle, which said *a card* rather than *the block view*, and a square is what the
other five icons contrast against. **Table and matrix now fill the stage**, since choosing them on
the view toggle is asking for the layer as a list and a third of the height with dead space above
it answers a different question; the tab still shrinks them back.

**What V.19 deliberately did not do**, and `W.1a` carries: a table filling the stage **still draws
the Contents bar at its foot**, both listing the same layer. Making the tray *be* the full-size
listing rather than a second one under it is W.1's job, and the sizing it settles — **partial 25%,
shut on the tab, full when the view toggle says `table`** — is W.1a. The 33% comment in
`styles.css` argues for a fixed height over one that tracks the row count; that argument survives
the change to 25% intact, so only the number moves.

**`src/styles.css` is V's contended file** — 2,156 lines, and **eight of nine V rows own it**. That
is the shape `page/Files.tsx` had through Wave U and `Canvas.tsx` / `Contents.tsx` had before their
seams were cut, and it is now the fourth file to reach that size without one. Rows owning it
**cannot run in parallel**: either V serialises on purpose, or a seam is cut first. Note the file is
also where `V.2`'s icon module *would* otherwise land — keeping the set in its own module is the one
thing in the wave that reduces the pressure rather than adding to it.

### Y — the options rail and the themes

*From driving V.19. Four decisions, all Clay's, all taken before any code. Rows in
[plan.md](plan.md).*

**The rail replaces three surfaces with one.** Today the canvas has settings top right and verbs
bottom right, the explorer row carries the view toggle and the export, and table and matrix each
draw an `.arrange` shell of their own. That is four places to look for *what can I do with what is
on the stage*. One slim column, fixed right, answers it once.

**It is page-level, and a view module says what goes in it.** The alternative — each module builds
its own rail — puts the view toggle and the export in six files and is the copy-paste shape `R.2`
was created to remove. The alternative to *that* — one fixed set everywhere — shows a matrix an
interfaces toggle that does nothing, and spec.md's *per module: a matrix has no interfaces toggle*
is the line that stops chrome meaning different things in different views. So: `ViewModule` gains a
declaration beside `surface`, and the rail renders what it is handed.

**The word goes under the icon, and U.15 survives.** The first draft of this row dropped the words
outright and was wrong: *every control carries a word* only cost width because the word sat
*beside* the glyph. Under it, the column stays slim and the rule holds. **One word each** — and
nothing the app owns needs renaming, since `grid`, `radial`, `across`, `down`, `relax`, `none`,
`plain`, `directed`, `curves`, `angles`, `interfaces` and the view names are already single. **The
one place a word cannot be chosen** is a relation type, whose label is a *definition's* name:
`depends on` belongs to whoever wrote the vocabulary. Those wrap; nothing else does.

**The order is the overflow plan.** Project views, flow, arrange, interfaces, lines, relations —
**relations last because it is the only group that grows with the vocabulary**, so it is the one to
push off the bottom rather than the one to squeeze. **The column scrolls**, with no collapsing and
no hidden state: roughly 20 rows against roughly 800px of usable height makes overflow the normal
case, not an edge, and hiding a group behind a mode is what U.8 rejected on the view toggle.

**The risk that remains is grouping, not legibility**: adjacent icon columns read as one long
column, which is why the labels and the spacing are in the row rather than polish afterwards.

**The verbs keep a boundary.** design.md's *toolbars divide by states against verbs* survived U.15,
U.16 and V.7 — the arrangements were never allowed to sit among the settings. A rail of identical
groups is exactly what would erase it, so `arrange` takes a rule of its own and still never lights
up: there is no arrangement a layer is *in*.

**A theme now reaches the drawing, and U.4 is reversed.** *A theme never recolours a card, route or
frame* is what made `modern` a blue shell around a green diagram and `light` a pale one around a
dark canvas.

**The first answer was wrong, and the second is the one built.** *Theme sets the default, a
definition's `style` overrides it* still lets a definition name `#ff00ff` and be off-palette in
every theme — it only moves who wins, not whether anything can look wrong. **The arrangement that
works is that they answer different questions**: the theme owns the palette, and a definition
chooses **a hue slot and an intensity within it**. Neither overrides the other, so there is no
combination that comes out wrong.

**This is the design-token model, and it is what modern frameworks converged on.** *Radix Colors* —
12-step scales where a step number has a fixed **job** (fill, border, ink) in every hue and both
modes, so contrast is structural. *Material 3* — a role plus a tone, never a literal. *Tailwind /
shadcn* — semantic name plus intensity, the theme swapping the mapping underneath. The shared rule
is that **components reference a role and a step, never a value**, and Radix's guarantee is exactly
the one wanted here: *ink on fill is readable* holds without anybody checking it per theme.

**The codebase is most of the way there already.** `line` (`solid|dashed|dotted`), `head`
(`none|open|filled|hollow`), `icon` (a name into the U.9 set) and `size` (geometry) are all closed
or token-like and none of them can be off-palette. **`Definition.color?: string` is the single
free-form value**, and the only way a definition can look wrong. That is `Y.7`.

**Two of the proposed tunables would still break it**, and are closed for the same reason: **border
weight** and **text styling**. A 6px border or an arbitrary font wrecks a visual system as surely as
a bad hue, so both become enumerations rather than free numbers and strings. **Inclusion** — is the
type shown, is the icon shown — is already safe, being boolean.

**Intensity alone is not enough, and this is the one correction to the shape.** If a definition can
only set intensity, every type on the canvas carries one hue and *requirement* / *part* /
*constraint* stop being tellable apart, which is most of what the styling is for. So a definition
picks **a slot from the theme's closed set** as well — the theme still decides what that slot
resolves to in retro, modern and light.

**Reserved to the theme, never tunable**: selection, hover, focus, grazing, icons, container child
chips, error and warning. These are the app speaking about your model rather than the model
speaking, and a definition that could restyle them could hide the app's own signals.

**`color` is dropped, not mapped** (Clay's call). It is stored, exported and sitting in logs, and
`samples/mndflow.json` carries six raw hexes — but a nearest-slot guess would be wrong more often
than the default, and **`check.ts` already does exactly this**: `healColour` drops an element's
colour with the note *a field nothing reads is written back out on every save forever*. Same
treatment, one function along. Breaking the schema is accepted — the design is still moving and the
theming matters more.

**The dials go under `components.style`, not beside it.** CLAUDE.md's rule is that a new capability
adds a key under `components` and never a field on the definition; `style.check` already refuses an
unknown key, so a closed enum is checked the day it lands. **`slot` and `emphasis` are `Y.7`**
(breaking, with the drop); **`weight` and label emphasis are `Y.9`** (additive, nothing healed).

**Layout and inclusion are already built and must not be rebuilt.** `components.card` ships
`layout`, `shape`, `label` and `shows` as closed sets behind an `oneOf` check — so *how is it laid
out, is the type shown, is the icon shown* is answered. Of the five tunables wanted, three exist.

**Slots are theme-relative, not hues.** A slot meaning *jade* in every theme would leave blocks
green in `modern`, which is the complaint that started this. `primary` is green in retro and blue
in modern; the theme guarantees its slots are distinguishable from each other, and a definition only
says which one it is.

**Six, and two names were refused.** `primary`, `secondary`, `tertiary`, `quaternary` are hue
families; `neutral` and `muted` are greys, `muted` being the faintly tinted second family (Material
ships the same pair as `neutral` / `neutral-variant`). **`dark` was proposed and refused**: it names
a lightness, and lightness belongs to the theme's ladder — in the light theme a `dark` slot either
draws a dark card in a pale theme or means something that is not dark, and a name that lies is worse
than an ugly ordinal. **`muted` survived on a condition** — it is a grey family and never an
intensity, because `emphasis` already owns intensity and two dials meaning one thing is exactly what
this system exists to prevent. Ordinals past *tertiary* are ugly and accepted: a name carrying no
domain meaning is what lets two packages use slot 4 for different things without either being wrong.

**The steps are computed rather than written.** Each theme declares a lightness ladder and a
hue/chroma per slot; the steps fall out in `oklch()`, which is perceptually uniform — so *ink reads
on fill* holds by arithmetic instead of being checked by eye in three themes. Roughly two numbers
per slot rather than six hex values, which is also what keeps the reserved roles from drifting.

**One system, not two: the chrome moves onto the ramp with the drawing.** `--bg`, `--surface`,
`--border`, `--text` and `--muted` become `neutral` steps and `--accent` becomes `primary`. Keeping
the shell on its own variables was the cheaper option and was refused, because **two colour systems
drifting apart is how the present mismatch happened** — the diagram never followed when `modern` and
`light` were added. This makes `Y.5` a shell row as well as a canvas one, so it wants the full
browser drive across all three themes; the shell is where every browser-found bug has lived.

**Retro comes out perceptually equivalent, not pixel-identical.** Pinning today's hexes would put
the default theme outside the system it defines, and leave the contrast guarantee holding for two
themes of three. Small shifts are accepted and judged by eye on the drive. **The rule that still
stands** is that nobody should be able to point at retro and say the product looks different — the
change is that the other two stop being a shell around a green diagram.

**Retro looking identical afterwards is the acceptance test** for the whole group, because a theme
pass that quietly restyles the default look has changed the product, not the chrome.

**Closed — an exported SVG offers its look as a choice.** A file has no page to read a variable
from, so `svg.ts` must inline concrete values. **The same split settles it as settles everything
else here**: the *slot* is the model's and travels with the definition; the *resolution* is a
viewing preference, and stamping a preference into a file somebody else opens is the thing to
avoid. So the export asks, defaulting to the theme in use. One control on an existing door, not a
new capability. Recorded because the wrong reading — *a theme is only a UI wrapper, so an export
needs none* — no longer holds after `Y.5`: the theme reaches the drawing now, which is exactly why
the export has to say which one it used.

**The selection defect is one look doing two jobs.** `lit()` returns the open layer when nothing is
chosen, and `.item.active` paints both the same, so a deselected project still reads as picked.
That is not cosmetic here: V.14 made *deselect* the door to a new project and W.3 makes it the door
to the vocabulary, so a tree that cannot show *nothing is selected* breaks both.

### T — the suite

The gaps *What the review found* named, now rows. **T owns `tests/` alone**, so no test row ever
contends with an implementation row — which is the practical benefit of tests having moved out of
`src/`.

- **The five action modules have a property suite** (*done*, T.1, proven; browser skipped) —
  `edges`, `elements`, `fields`, `groups`, `layer` under `tests/actions/` (79 new; actions slice
  102 with registry + behavior). Success returns the claimed mutation ops; refuse goes through
  `check` without throw and with no mutations; navigation writes nothing; writing actions report
  `writes(effect)`. Registry and `behavior`/`infer` were already covered; locked-project /
  sayable / offered registry properties were left out on purpose.
- **`Contents.tsx` has its first cover** (*done*, T.2, proven): Node SSR markup in
  `tests/page/contents.test.ts` (9) — empty layer, listing trays, filter chips, default sort,
  constraint/rule advice, proxies. Interactive filter / column sort / row pick / hover lighting and
  strip `onSay` on selection still need a DOM harness before they can be suite-proven; definition
  editor / field controls / SC.4 depth were left out of this cover on purpose.
  **`App.tsx`, `Files.tsx` and `Panel.tsx` still have none and wait for U** (T.3), because U rewrites
  the header, the explorer and the chrome, and a suite written first would be thrown away with them.
  That is the project's own rule applied to itself: *do not write tests for a design that is still
  moving*.
- **`infer` is walked end to end in the suite** (*done*, T.4, proven; browser skipped) —
  `tests/modules/view/infer.test.ts`: Chosen → offer includes infer → `run("infer")` → fold →
  activity `stageOf` draws (suite 574). The older behaviour-view fixtures still prove renderers
  over hand-built graphs; they keep, and no longer stand in for the trigger path.
- **The terminal stays deliberately uncovered** and gets no T row. Wave Z finished without adding
  one — same reasoning as T.3 while the shape was moving, and no cover row was scheduled after.

### Z — terminal

*The acceptance test for everything above.* **Unfrozen since S6 — Wave Z complete (Z.1–Z.8
proven).** What it is for is settled — see design.md under *The terminal*. **Nothing in Z
needs Clay any more.**

- **It is not a command palette.** The one text entry point over the workspace: it ranks, completes
  and surfaces documentation, and adapts to a person's wording. An editor host's palette and console
  replace none of it.
- **It never changes context**, because it ranks against context — moving it would shift the
  option list under the sentence being typed. The explorer and the pointer navigate.
- **It is wholly client-side as scoped.** Z.8 is a lookup and a sort, so nothing in the rail as
  planned needs a server. The old "may not be client-side" caveat is retired with the
  natural-language half it belonged to.
- **Two functions, split by whether it is open.** Collapsed is the app's primary text entry point
  and asks nothing. Expanded is guidance (Z.4, proven) plus a context gloss (Z.6, proven) plus a
  tutorial (Z.5, proven): the next question worth answering, a hint, and nudges — choice chips /
  typed Enter when there are choices, ranked actions when not; root tip uses `blocksOf(null)`;
  gloss from `doc_for(ctx)` / `shape_of`; walk from `samples/tutorial.json` via `walk_for(ctx)` on
  `proj_mndflow`.
- **Expanded guidance** — *done* (Z.4, proven): next question + hint + nudges (`guidance.ts`);
  root tip uses `blocksOf(null)`; choice chips / typed Enter answer; no-choice shows ranked
  actions. Collapsed Z.1 / Z.2 / Z.3 untouched.
- **Tutorial** — *done* (Z.5, proven): `samples/tutorial.json` + `walk_for(ctx)` on `proj_mndflow`;
  advances by pick / ancestors / open layer; edge → relationship step. Collapsed quiet; Z.4 / Z.6 /
  Z.7 preserved. **Parked**: proxy tip advance is canvas-only.
- **The guided half needed H** — sample dependency met (H.1); Z.5 walks it.
- **Ranking** — *done* for collapsed chips (Z.1 + Z.3, proven): typed text ranks by embedding
  similarity (substring when cold), with shape as tie-break and an exact prior entry pinned first;
  idle orders by shape-weighted preference from `feedback.read()`. Local sticky only; out of every
  log. Chat warms embeddings.
- **Arrow keys move the highlighted option** — *live via G.9c* over the ranked (or learned idle)
  list; unchanged by Z.2 / Z.3.
- **Overrule feedback** — *done* (Z.2, proven): taking a non-default chip (arrow+`Enter` or click)
  records to `mndflow.rail.feedback.v1` with `shape_of(ctx)`; confirming the highlighted default
  writes nothing. **Z.3 reads that store** for idle / shape preference.
- **`router.ts` loses its centre.** Question selection, the operation set and the `RHYTHM` rule
  serve the expanded half only; the collapsed half asks nothing and ranks instead. What survives of
  `workflows/*.yaml` is `terms` — which D takes — and one opening hint per domain.
- **Documentation** — *done* (Z.6, proven): `samples/docs.json` ten terms keyed to
  [definitions.md](definitions.md); expanded gloss via `doc_for(ctx)` / `shape_of`; Collapsed
  unchanged. Hand-authored — **no generator**. Shares `samples/` with stream **H**.
- **One doc hit, ranked last** — *done* (Z.8, proven): typed lists append at most one `docs.json`
  keyword hit, always last (ghost); Enter/click surfaces gloss, no action; idle/answer lists stay
  actions-only — so it is available without ever displacing something actionable.
- **There is no rename** — *done* (Z.7, proven): ▾/▴ titles are Expand / Collapse Page
  Intelligence; `rail` stays the word in the code and the docs. User-facing copy only — no
  identifier rename.


### The Z overshoot

**Z.1–Z.8 landed and are proven. They are also more than is wanted**, because the spec they were
built against was superseded while they were being built. This is the one place in the tree where
the next move is *deletion of working code*, so it is written down rather than left to be
rediscovered.

**What is wanted, stated plainly:**

- **Ranking shows in the chip order, and the score on hover.** That is the whole of the surface.
- **Expanded mode shows a fixed placeholder prompt set** on the theme of *"What's next?"* / *"What
  action would you like to take?"*, **plus the description of the selected action**. Nothing more.

**What is actually there, by line count** — the rows read *landed (proven)* and are thinner than
that sounds, which is why the honest verdict is **half-built**, not *overbuilt*:

| | Lines | Reading |
|---|---|---|
| `rank.ts` | 225 | **Real.** Embedding lead, learned preference, fixed `ORDER` fallback. Keep. |
| `feedback.ts` | 74 | **Real.** Overrule feedback, local. Keep — it is what the order learns from. |
| `docs.ts` + `docs.json` | 83 + 10 terms | Keep, pending the `docs.json` question above. |
| `tutorial.ts` + `tutorial.json` | 105 | **Wanted, and last.** See below. |
| `guidance.ts` | **32** | Two hardcoded strings. Not the guidance engine the row implies. |
| `Scores.tsx` | 55 | **Unmounted since U.11 and never remounted.** Delete — the hover score replaces it. |
| the hover score | **0** | **Does not exist.** The one part of what was asked for that was never built. |

**So the trim is smaller than "delete a wave".** Keep `rank.ts` and `feedback.ts` and *finish* them
with the score on hover; stand the expanded pane down to a fixed prompt set plus the selected
action's `about`, which takes `guidance.ts` out and unhooks the pane from `router.ts` /
`workflows.ts` / `turn.ts` — the question loop this file already said would *lose its centre*;
delete `Scores.tsx`; collapse `ORDER`, now duplicated **four** ways (`rank.ts`, `page/Files.tsx`,
diagram offer chrome, `terminal/`).

**The tutorial is wanted and is deliberately last.** A tutorial teaches whatever the app currently
is, and Wave V is about to change the header, the explorer, the theme control, the canvas options
and the export doors. Walking it before the shell settles means rewriting the walk with every V row.
Nothing else waits on it, which is what makes holding it free.

**The lesson is about sequencing, not about the code.** Wave Z was being implemented during the
conversation that changed its spec. Nothing was done wrong by anyone; a wave in flight is simply
not a wave open to redesign, and the queue should not have been answering both at once.


## Out of scope, recorded so nothing is built on it

- **Action history, displayed another way** — **future work, deliberately unscheduled.** U.11
  deleted `Log.tsx` with the readout; **U.12 landed** the last executed action on one line at the
  explorer foot. Going back through the history was never offered even by `Log.tsx`, so nothing
  regresses; what a fuller history should look like, and where it should live, is undecided. The
  data is not at risk either way — the log **is** the project, so any future surface folds from
  what is already stored.
- **Natural language over the workspace** — a sentence that *makes or changes* something rather than
  naming one action. It stays the aim (design.md, *The terminal*) and is **deliberately not
  scheduled**: Z.8 is now ranked completion plus one documentation hit, which is a lookup and a sort.
  Recorded here because this is the one thing that would reopen *where the rail runs* — understanding
  a sentence may not fit in a tab, and the "must work with it unavailable" rule would come back with
  it. Nothing may be built assuming it is coming.
- **Embedded content in a resource block** — a script, an image or a video carried *inside* the
  project rather than pointed at. **Future use case, recorded not scheduled** (Clay, 2026-08-18,
  during the vocabulary rework). A resource block holds content; whether that content is inline
  or a path is the open half, and inline means the log carries bytes, which is a durability and a
  file-size decision nobody has taken. Nothing may be built assuming it is coming.
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

**`npx vitest run` used to die on any machine with more than two cores — fixed.** The worker cap in
`vite.config.ts` (added so agent sittings stop leaving orphan vitest trees) named only the maximum,
and **vitest 2.1.9 defaults the minimum to the CPU count**, so the two conflicted and the run died
before collecting anything: *options.minThreads and options.maxThreads must not conflict*, reading
as a failure rather than a misconfiguration. `npm run test:ci` was unaffected — `scripts/test-ci.mjs`
passes `--maxWorkers=2` on the command line, and **the CLI flag sets both ends where the config field
does not**, which is why the gate and its stand-in disagreed. **Now `minWorkers: 1, maxWorkers: 2`,
both named**; the cap the config exists for is unchanged and `npx vitest run` passes 574 tests over
32 files. The lesson worth keeping: **a bounded pool must name both ends**, and a config field and
its CLI flag are not always the same thing.

### What the review found

**440 tests. The problem was never quality — it was shape.** Read end to end, the tests are
outcome-shaped and well named (*leaves no trace of a reverted step*, *keeps a proxy whose target is
gone*). They are why S3.1's 22 deletions and the S6 detach landed without drama. **Culling for its
own sake would cost more than it saves.** Three findings instead:

- **The page layer's cover gap is half closed.** `Contents.tsx` has a first property suite (*done*,
  T.2, proven) via Node SSR markup — not interaction. **`App.tsx`, `Files.tsx` and `Panel.tsx`
  still have none** (T.3, waits on Wave U). Every bug found by driving the browser lived here or in
  the seam below it. This remains the gap, not the redundancy.
- **Page interaction cover still needs a harness.** There is no jsdom, happy-dom or
  `@testing-library` in the tree. Filter chips, column sort, row pick, hover lighting and strip
  `onSay` on selection cannot be suite-proven until one lands; T.2 deliberately stopped at SSR
  markup for that reason.
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

**`infer` is suite-walked end to end** (*done*, T.4, proven; browser skipped) — Chosen → offer →
`run("infer")` → fold → activity draw. The older behaviour-view fixtures still prove renderers over
hand-built graphs; keep them.

**A mounted layer is a test** (*done*, T.6, proven; browser skipped) — `tests/canvas/layer.test.ts`
mounts a layer through `T.5`'s harness. **`C.11` turned the remaining assertion green**: after a
link the relationship is in the DOM. One perch per arriving relationship and none on a spare card
already hold; a note still has its handles after the cards are related.

**The dependency map is a test** (*done*, T.7, proven; browser skipped) — `tests/structure.test.ts`
walks every import under `src/` against one allowlist; README.md points at it. `C.9` inverted the arrows. Legal imports do not trip it.

**Deliberately untested:** the terminal — `router`, `turn`, `workflows`, `rank` — whose shape
stream Z is still changing, so a suite now would be rewritten by it; `embed` and `match`, which
need a model *(and which Z.8's scope-down does not summon — it is a keyword lookup, not a model)*;
and `project`, whose actions are thin wrappers
over mutations `fold` already covers. Each is a judgement to revisit. **The last of these was
revisited as T.1 and landed**: S1.6 made actions pure `(graph, args) -> Effect`; the five modules
now have property suites under `tests/actions/`. The terminal stays uncovered on purpose and gets
no row — stream Z changes its shape, so a suite would be rewritten by it.

## Found while working the queue (2026-08-17/18)

**Defects — not any row's work, none fixed.**

| | What | Where |
|---|---|---|
| **22** | **The context menu offers every layer-scoped action on every element.** `inScope` returns `true` for anything scoped `layer` or `project` **before looking at the selection**, so right-clicking a block offers `create`, `relax`, `arrange`, `up` and `reveal` — none of which mean anything to a block. **Not a bug in that line**: it answers *can this run here*, correctly. It is being asked *is this worth offering here*, which is a different question and belongs to the **block module**. Story `ST.10`, in plan.md under *Not in the queue*. **Do not fix it by adding `when` clauses** — that puts a note's opinion about its own menu inside `create` | `src/actions/index.ts`, `src/modules/` |

| | What | Where |
|---|---|---|
| **21** | **The tray's hover highlight does not reach relationship lines.** Hovering a row in Contents lights the matching card on the canvas; hovering a **relationship** row lights nothing. The tie is the tray's whole reason to sit beside a drawing, and an edge is exactly the thing hardest to find by eye — so it is the case that needed it most. `W.5` keeps the hover tie, so this is that row's to close or a fix of its own | `page/Contents.tsx`, `canvas/Canvas.tsx`, `modules/view/diagram/` |

| | What | Where |
|---|---|---|
| **20** | **The tray and a full table list the same layer twice.** `V.19` saw it, `W.1a` narrowed it, and `W.5`/`W.6` settle *what each is for* without settling *what the tray shows when the stage is already the layer*. **Clay's rule leaves one case open**: the tray lists the current layer when nothing is selected — but a full table on the stage is already that list. **Recommended**: in `table` and `matrix` the tray **starts shut** and opens on a selection, showing that element's details; the layer listing is the stage's job there. One line, and it removes the duplicate without a mode | `page/Panel.tsx`, `page/App.tsx` |

| | What | Where |
|---|---|---|
| **19** | **The canvas makes blocks when there is no project, into a malformed storage key.** Found driving `B.1`/`B.19` on 2026-08-20, and **confirmed pre-existing** by re-driving the same script against the pre-change tree. A fresh context has no project — the explorer correctly says *No project yet — name one to start* — but a right-click on the canvas still creates, and the work is written to **`mndflow.steps..v1`**, the keyed slot with an empty id (`mndflow.project.v1` is `null`). It round-trips a reload, so nothing is lost *yet*; but that slot is not any project's, no explorer row lists it, and `workspace.begin` — which is where naming and the uniqueness check live — was never reached. **Two doors disagree**: `V.14` and `P.2` made the explorer refuse to work without a project, and the canvas never learned. **Fix is one of**: the canvas refuses to create with no project and says so, or a right-click with no project runs the naming prompt first and creates into the project it makes. The second matches *making a project should be as ordinary as making a block* | `page/App.tsx`, `canvas/gestures.ts`, `src/graph/store.ts` |

> **`1b`, `1c`, `1d`, `1e`, `1f` and `1h` are all the kind derivation, and stream `B` removes it
> rather than repairing it.** Do not fix them individually — a fix keeps `page/kind.ts` alive, and
> the whole file goes. They are kept below because *what each one got wrong* is evidence for why
> the derivation could not work: it needed a package id, a view module key, a seeded child and a
> resolved reference to answer a question that turned out not to need asking.

| | What | Where |
|---|---|---|
| **1 — dissolved by `B.8`** | **`onMove` writes to the wrong project's log.** *(2026-08-20: **one log at the workspace removes this entirely** — there is no second log to write to, and no action can pick the wrong one. Do not fix it; it goes with `Effect.into` and `writeInto`. Until `B.8` lands it is still live, so **`B.8` should not be deferred behind cosmetic work**.)* `project.move` takes no project argument and always writes to the bound/context project. Every tree row is draggable regardless of context, and `drop()` routes a same-project drag to `onMove` — so dragging inside project A while B is in context records the move in **B's** log. Silent corruption, same class as `R.10`. `P.11`'s property test covers `writeInto` directly, not the page path, so it does not catch this. Needs a signature change through `onMove` → `act.move` / `home` | `page/Files.tsx`, `project.ts` |
| **2 — rowed as `B.27`** | **A minted project has no name and skips the uniqueness check.** *(2026-08-20: *set* is retired — this is any project minted by reaching `writeInto` + `onAdmit` directly. Still real, and now owned.)* **A minted `set` project has no name and skips the uniqueness check.** `build_set` makes its root with label `""`, and `titleOf` is the root's label — so the project draws blank. It reaches the workspace via `writeInto` + `onAdmit`, bypassing `workspace.begin`, which is where `mayName` refuses a duplicate | `actions/behavior.ts` |
| **1b** | **`layerKind` hardcodes one package id.** `src/page/kind.ts` derives behavior as `refAt(type).project === packId("behavior")`. Clay settled that *shipped packages may carry either kind of definition* — this cannot express that: a package holding both kinds is judged wholly by its id, and a behavior package under any other name reads as structure. The signal belongs on the **definition** (its form, or a key under `components`), not on the package name | `page/kind.ts` |
| **1c** | **`components.view.module` can still declare a kind by fiat.** `childKind`'s fallback for a packageless definition is `kindOf(viewOf(...).module)` — the exact key the settled rule says must never answer *what kind is this*. `P.6`'s dial is gone but its mechanism survives, so any definition carrying that key still sets its block's kind | `page/kind.ts` |
| **1d** | A new **behavior project silently contains one unnamed block** (`makeElement("", …)` in `App.newProject`). Derivation needs a child or the root reads structure, so something must be seeded — but an empty-labelled block in a fresh project is an invented behaviour the design did not ask for. Name it, or find another way to carry intent | `page/App.tsx` |
| **1e** | `layerKind` runs per explorer row via `role_of`, each call doing `blocksOf` plus proxy resolution — O(rows × children) every render. Fine now, worth watching on a large tree | `page/kind.ts`, `page/Files.tsx` |
| **1f** | An **unresolved proxy counts as structure**, so one dangling reference can silently flip a behavior layer to `set` | `page/kind.ts` |
| **1g** | `infer` types elements to `pkg_behavior/…` without adding that package to the destination's `vocabulary`, so those types may draw as raw paths. The new create buttons do add it | `actions/behavior.ts` |
| **1h** | `shellBranch`'s workspace folder rows still hardcode `role_container` regardless of contents | `page/Files.tsx` |
| **2b — mostly closed by `B.19`, finished by `C.7`** | *(2026-08-20: **globally unique ids remove the dangerous half.** A bare id can no longer resolve to a *different* element in the destination, because no two elements share one — so the silent corruption is gone. What is left is a reference that **dangles**, which is visible and tolerated by design; `C.7` then resolves it through `workspace.resolve` wherever the target is still open. **The open choice about re-qualifying on the way out is therefore no longer urgent** and may be dropped.)* **A moved subtree's local references silently re-point.** `extract` copies each element with `{...node}` and rewrites only `parent`; a proxy's `of` travels unchanged. `refTo(id)` with no project yields a **bare** id and `refAt` reads a bare ref as local — so a proxy pointing at a sibling in the source project re-resolves against the **destination** after the drop, dangling or hitting a different element with the same id. `lost` counts only edges, so nothing warns. This is exactly the population the explorer→canvas gesture creates. **Open (Clay):** re-qualify to the source project on the way out (`refTo(id, source)` — the reference survives, the destination gains a dependency), or drop it and count it like a left-behind relationship | `workspace/index.ts` |
| **3** | The `terms` prop chain is dead: `project.ts` → `App.tsx` → `Files.tsx` Props, never destructured or rendered. The explorer's word is `const UNIT = "block"`. Pre-existing. Either wire it or delete the chain and `terminal/terms.ts` with it | `page/`, `terminal/terms.ts` |
| **4** | `type Terms` is declared twice — `Files.tsx` duplicates `terminal/workflows.ts` | both |
| **5** | Dead CSS left by `Z.9`'s removed history block: `.past`, `.exchange`, `.exchange.reverted`, `.typed .noop` | `styles.css` |
| **6** | `feedback.ts`'s `CAP = 200` now serves two independent histories (action overrules and `retype:*`) with no per-namespace budget, so a burst of one evicts the other. The namespacing itself is airtight | `actions/feedback.ts` |
| **7** | ~~`typelist.ts` reimplements the private `shape_weights()` from `actions/rank.ts`~~ — **closed by `X.2`**: counting the overrule store is `feedback.weights`, which both readers now call | `actions/feedback.ts` |
| **8** | Matrix `map.ts` declares *left click on cell → selection* but no `onClick` is wired in `Matrix.tsx`, so "the strip lists them all on selection" cannot work | `modules/view/matrix/` |
| **9** | `project.ts`'s `looping()` / `LoopHook` / `LoopCore` / `LoopSurface` seam now has exactly one implementation (`terminal/terms.ts`) and no question/turn user. Keep as an extension point, or retire? | `project.ts` |
| **10** | `Files.tsx`'s internal `graph` fallback resolves wrong when `context === held.id` (unreachable today — no gesture adds a workspace-scoped ref to `chosen`) | `page/Files.tsx` |
| **11** | "Rename what is open" is a silent no-op while the workspace is the open context | `page/Files.tsx` |
| **12** | The rail never calls `entries()`, so no `expand` action (`mark`, `direct`, `reform`, now `infer`) can offer its second reading from the rail — only the explorer and canvas menus can | `actions/rank.ts` |
| **13** | `Y.6a` dropped `verbs: true` from the rail's `project` group as a side effect; the group now mixes a one-shot verb with four stateful picks. Nothing keyed off it | `page/Rail.tsx` |
| **14** | `table` is the only view module shipping no component, and `App.tsx` name-checks all six modules in one ternary chain. Legal, but record it so it does not read as an accident | `modules/view/table/`, `page/App.tsx` |
| ~~**15**~~ — **closed by `C.7` and `C.9`, 2026-08-20** | A cross-project reference reads its target's name on a card and in a table, across a reload; a closed project reads **`closed`**, distinct from a gone target's **`missing`** | `src/modules/named.ts`
| **16** | **`Y.6a` was reverted in `683676d` and left its comments behind.** `ExportLook`, `LOOK_ICON`, the three `RailOpts` fields and the four look controls are gone; the two doc comments that described them now sit orphaned above `TYPE_CAP` and at the foot of `RailOpts`, describing nothing. Either the row comes back or the comments go — a comment for absent code is worse than neither. (Supersedes **13**, whose `verbs: true` came back with the revert) | `page/Rail.tsx` |
| **17** | **The rail's relation types are capped at three but not *ranked* by use.** The list-of-types rule says top three by learned preference; the group takes the first three in vocabulary order. Nothing records a pick there as an overrule yet, so there is nothing to rank by — deciding what an overrule *is* for a "what the next drag draws" setting is the open half | `page/Rail.tsx`, `actions/typelist.ts` |
| **19** | **`childKind` never reaches its `extends` fallback.** It returns on the type ref's package alone, so `packages/uaf`'s `def_operational_activity extends pkg_behavior/def_action` — and sysml's mapped `action`/`activity` — both read as **structure**. In practice only the ref `behaviorType()` itself mints can produce a behavior layer, which is the same defect as **1b** seen from the other side | `page/kind.ts` |
| **20** | **The two create buttons disagree about a duplicate name.** `createBehavior` returns silently and `Files.create()` closes the field anyway; the structure button goes through the `create` action and says *"pump" is already used here*. Two adjacent buttons, one input, two behaviours | `page/App.tsx` |
| ~~**21**~~ — **closed by `C.11`, 2026-08-20** | A new relationship draws immediately; handles stated on the node from `laidOf`'s seat map. One perch per arriving line still holds | `modules/view/diagram/compose.ts` |
| **22** | **A project dropped into a folder vanishes from the explorer** until the folder is clicked, and again after every reload. The folder was empty when the drag began, so `holds` was false and the dropzone was handed no spring callback; nothing opens it after the drop. **Rowed as `N.1 ◐`** | `page/Files.tsx` |
| **23** | **`workspace.folder()` has no caller anywhere in `src/`** — exported and tested since the workspace landed, reachable only from the suite. No workspace folder can be made from the app. **Rowed as `N.8`** | `page/Files.tsx`, `workspace/index.ts` |
| ~~**24**~~ — **closed by `C.9`, 2026-08-20** | The resolver now lives below the dependency boundary: `modules/` no longer imports `canvas/`, and `canvas/` no longer imports `workspace/` | `src/modules/named.ts`, `src/canvas/named.ts`
| **25** | **The card renderer exists twice.** `canvas/NodeCard.tsx` is a 285-line copy of the module's 348-line one; `Canvas.tsx` overrides `NODES.card` with it, so the module's copy draws nothing while the suite still tests it. **Rowed as `C.10`** | `canvas/NodeCard.tsx` |
| **26** | `Anchor` is imported but unused in `modules/view/diagram/Frame.tsx` — the four static anchors it drew came out with `C.2` and the import stayed. `tsconfig` has no `noUnusedLocals`, so nothing says | `modules/view/diagram/Frame.tsx` |
| **27** | **The `seat` action's `scope` still says `{ on: "element", form: "interface" }`** while its `check` and `run` now also take an edge end (`C.2`). Harmless while `when: () => false` keeps it off every offered list — wrong the moment `I.7` puts the whole action surface behind `?` | `actions/layer.ts` |
| **28** | `set_side` can leave `fromAt` set with `fromSide` deleted, if ever called with `side: null` and a numeric `at`. Unreachable from the two callers there are; the branch reads as though it guards it and does not | `graph/fold.ts` |
| **29** | **`Files.tsx`'s `filed` overlay duplicates state the shell prop now delivers.** `N.1` added both the overlay and `refoldAt` in `App.tsx`'s `shellGraph` memo; with the memo re-reading, the overlay is a second source of truth for where a project is filed — which is the shape of bug **22** | `page/Files.tsx` |
| **30** | Dragging an anchor writes `say: "anchor"` and nothing appears in `.saying .what`. Every other adjustment answers back; this one is silent (`ST.8`: *the app always answers back*) | `actions/layer.ts` |
| **18** | **The edge context menu still does not use the capped type list.** `X.2`'s third surface: `offered_for` lists `Retype` once, which prompts, rather than the three ranked kinds `R.5` describes. The list is now in `actions/typelist.ts` where the menu can reach it | `modules/view/diagram/offer.tsx` |

**Decisions taken — Clay, 2026-08-18.**

- **A layer's kind is derived from its children, per layer** — all structure → structure, all behavior
  → behavior, **mixed → set**, empty → structure. A definition's kind comes from its package; shipped
  packages may carry either. `ViewKind` stays two members: a set is *viewed* as a structure and its
  setness is only the folder mark. **Set comes from mixedness, not proxies.** The vocabulary is never
  filtered by kind — that is what stops a sealed room. `P.6`'s toggle comes back out.
- **Two create buttons** — *new structure block* / *new behavior block*, each making a project of its
  kind at the top level. **Replaces `P.2`'s new-project button.**

- **`P.12` — settled: copy.** And the framing was wrong: these are **two gestures, not two mechanisms for one idea**. *Tree to tree* carries the branch and copies the definitions it names. *Explorer to canvas* makes a **proxy** — a reference from the canvas layer to that block, moving and copying nothing. A package stays referenced because it is immutable. The destination decides.
- **`P.14`'s "beside" — settled: it does not exist.** Every drop is *into* something. Onto a block → it becomes a child; onto a project root → a child of the root; onto empty space → a project, a member of the workspace set. All three are already wired, so the row needed no further code.
