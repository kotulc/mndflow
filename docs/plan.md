# Plan

The queue. One row is one chunk of work — small enough to land in a sitting, with the files it
owns so two owners never collide.

- **Why any of it** → [design.md](design.md), and *The words* for the vocabulary used here.
- **What each part does** → [spec.md](spec.md). **The action surface** → [actions.md](actions.md).
- **What is missing and undecided** → [tasks.md](tasks.md). **Behaviour** → [behaviors.md](behaviors.md).
- **What already landed** → annotated on the row in this file (and optionally
  [landed.md](landed.md) if Clay archives — never a queue for sittings).

`⊘` marks a chunk nothing blocks. Everything else names what it waits on.
`◆` marks one that **needs a decision before any code** — take it to the user first.
`◐` marks one that **landed short of what the row says** — the note names the gap.

**A row is done when** the suite and `tsc` pass, the app has been driven in a browser
(`.claude/skills/run/SKILL.md`), spec.md and tasks.md say what is now true, and the row is
annotated here with one line on what actually landed (or `◐` with the gap named). See
[CLAUDE.md](../CLAUDE.md). Do not move rows into `landed.md` during a sitting.

**A row that landed short stays here as `◐`.** The rest of it is still work.


## What is startable now

**Wave V is complete** — every row is in [landed.md](landed.md). The shell has one icon vocabulary,
two labelled settings groups at the top and the verbs at the bottom, a project that can be made and
deleted from the tree, and a relation type picked before the drag rather than corrected after it.

**Next**: **Wave Y** — the options rail, themes that reach the drawing, and the selection defect —
then `R.5`–`R.8` and `R.10` / `R.11`, then **Wave W** (the tray, the table, the heatmap) and
**Wave X** (the shared capped list). `S7`, `W.1` and `Y.1` are the three large structural rows.

**`Y.5` and `Y.8` are startable now and touch nothing the rail touches**, so they run alongside it.
**Y has two independent seams**: `Y.1` (the rail) and `Y.5` (the colour ramp). `Y.2`–`Y.4` wait on
the first, `Y.6` / `Y.7` on the second, and the two halves never contend for a file.

**`V.19` landed outside the queue** — Clay's UI pass over the finished wave, taken after driving it.
The view toggle and the theme toggle are each **one cycling icon**; the project row's tools sit
right and only on the selected project; per-project export wears an **options** mark, a placeholder
for a menu; the canvas settings **stack in labelled groups** top and bottom alike, `arrange`
included; `view_block` is a plain square; **table and matrix fill the stage** rather than opening a
third full. It reverses U.8 a third time and un-inlines V.17 — reasoning in tasks.md, stream V.
**It left one duplicate visible**, and `W.1a` is the row that closes it.

**Clay-free elsewhere:** `G.9e`, `A.7d`, `T.5`, `U.18`, `Z.9`, `S7`. **Wave U is complete** — U.16
dropped (*Not in the queue*), `U.18` collects the `◐` gaps U.7 and U.14 left in `App.tsx`.
**Wave Z is built but thin** — `Z.9` trims it to the ranking surface and a fixed expanded pane;
**Z.5, the tutorial, is wanted and deliberately last**, since a tutorial teaches whatever the app
currently is and Wave V is about to change it. **G.9d ◐** — `G.9e` closes it.

**Everything finished before this sitting is in [landed.md](landed.md)** — Waves U, T and Z, G.9a–d,
D.2 and F.2. What is annotated here landed in the sitting just gone and has not been archived yet.

**Wave T still runs alongside anything.** It owns `tests/` alone, so no T row contends with an
implementation row. `T.5` can fill any sitting; `T.3` waits on Wave V for the same reason it once
waited on U — V rewrites the header, the explorer and the chrome.

**`R.1`–`R.4` and `V.2` / `V.4` / `V.11` / `V.15` are in [landed.md](landed.md)** — the filling
layer, the icon vocabulary, hover on a relationship, and the type filter's removal. A review of that
work found five more, all fixed with it, and **two it did not fix**: `R.10` (the explorer menu writes
to the project in context, not the one clicked) and `R.11` (a spurious repair notice on a legacy
project).

**`R.9` and `V.12`–`V.14` came from playing with the built app.** Two are real gaps (no way to
delete a project; nothing confirms a delete), and `V.14` reverses a landed row (answered —
deselecting is the door to a new project).

**`R.5`–`R.8` came out of asking where each of those actions lives.** A required `choice` expands
into one entry per option (settled), `direct` and `reform` turn out to have **no home at all**, a
directed line draws no arrowhead, and actions.md never says what an action does.

**Wave `W` is where the tray, the table and the strip turn out to be one move** — Contents already
*is* the table view, stuck at one size. **No `◆` is left**: vocabulary editing needs no new door,
because deselecting returns the tray to the layer listing, where the types chip already lives.

**One gesture carries more than its weight.** *Click empty space to deselect* is what reaches a new
project in the explorer (`V.14`) and the vocabulary in the tray (`W.3`). Worth driving carefully —
"click nothing to enable something" is obvious to whoever built it and invisible to everyone else.


## The list-of-types rule

**Three surfaces list the relationship types in scope** — the edge context menu (`R.5`), the
selection strip (`R.9`) and the canvas *relation types* group (`V.17a`) — and all three grow with the
vocabulary. One rule covers them.

**Top three, ranked by use.** Not guessed: `Z.3` already computes shape-weighted learned preference
from what was picked when the default was overruled, which is exactly *the three most common here*.
**Cold start falls back to vocabulary import order** — packages in order, definitions within — which
is what Contents already does for type offerings (D.2), so nothing new is needed for a fresh project.

**Expand in place, and scroll if long.** A last *More…* entry re-renders the same surface with the
full list; a long list scrolls. **No submenus** — the rule `R.5` already set. Typing to narrow is the
right answer only if vocabularies get large, the rail already proves the interaction (G.9c), and it
is **additive** — it can arrive later without unpicking any of this.

**The relation types group is the exception**: three, and no expansion. It sits inline at the top of
the canvas beside the crumbs, and it is a setting rather than a list of things to act on.

**The strip alone also takes a typed name**, because a type nobody has declared yet is still a type —
`X.3`. **What the strip re-defines is the selected thing**, not its type: name, which type it is, and
field values. What fields a *type* carries stays behind deselect on the types chip (`W.3`), or the
duplication U.11 deleted `Relations.tsx` to remove is rebuilt in a new place.

| | Does | Owns | Waits |
|---|---|---|---|
| **X.1** | **The ranker leaves `terminal/`.** `rank.ts` and `feedback.ts` hold the learned preference the rule above depends on, and they sit in `src/terminal/` — which is **optional**, S6.3's acceptance test being that the folder can be deleted and everything still runs. **A menu that ranks by preference cannot depend on the rail**, exactly as the offered list could not (G.9a). Move the ordering and its local store beside `offer()`; the rail keeps consuming it and owns none of it. **Give `Z.3` its second consumer** — until now the learning ranked rail chips alone | `src/actions/`, `terminal/` | Z.9 |
| **X.2** | **One capped, expandable list, used by all three surfaces.** Top three by learned preference, import order cold; a *More…* entry expands in place; the expanded list scrolls past a height. The relation types group takes the top three and no expansion | `src/actions/`, `modules/view/diagram/`, `src/styles.css` | X.1, R.5, R.9 |
| **X.3** | **The strip takes a typed name as well as a pick.** Beside the capped list, a text field: type a name and the selection takes that type. **Nothing new is needed** — `fold.defineNamed` already mints a definition for a bare name under a derived id, and calls itself *the bridge from free text to a real definition*; the suite holds it as *a free-text type becomes a definition with a stable id*. So this is a surface for a built capability, feeding `retype`. **The catch**: a free-text mint derives its id from the name while a deliberate definition carries its own, so typing a name that already exists in scope would mint a **twin** — the duplicate-name case SC.4 needed package-disambiguation for. **Match first, mint only when nothing matches** | `modules/view/diagram/`, `page/Contents.tsx` | R.9 |


## Found by review — the menu is wrong, not just thin

The closing review of the three-wave pass found **nine defects, and the argument-filling layer under
the offered-action list (G.9d) holds most of them.** Two rules cause the damage: `fill_args` assigns
the **same focused element id to every unfilled `element` argument**, and `can_fill` inspects
`spot` / `choice` / `number` / `element` but **never `text`**. Between them, several menu entries are
inert and one commits a malformed edge.

**The three functions are copy-pasted into three modules and have already diverged** — which is how
one of these became three bugs instead of one. `R.1` fixes the logic; `R.2` removes the reason it
can happen again.

| | Does | Owns | Waits |
|---|---|---|---|
| **R.5** | **A required choice expands into one entry per option.** Five actions carry one — `mark` (`flow`), `direct` (`dir`), `reform` (`form`), `axis` (`axis`), `arrange` (`shape`) — and a choice is a question no menu asks, so all five are withheld from every offered list while holding reserved `ORDER` slots. **Settled: the options become the entries.** Right-clicking a relationship lists the relation types and forms themselves, not an action that then asks which — no submenu, and no open text prompt. The list is tailored to the target because the options are. **This does not widen the closed action set**: one registered action, offered N times with different args, which is the wording U.16 already used before it was dropped. **The flag goes on the descriptor** (`expand`, beside `scope` and `about`) so it stays one rule rather than the per-surface special-casing R.2 just removed. `arrange` and `axis` leave it off — they have homes. **Watch**: an edge menu then lists every relation type in the project; cap or scope it if a large vocabulary makes it unreadable | `src/actions/`, `src/actions/fill.ts`, `modules/view/diagram/offer.tsx` | ⊘ |
| **R.6** | **`direct` and `reform` have no home at all** — the catalogue behind R.5 turned this up. The canvas relation group is `onForm`, a **draft** setting for what the *next* right-drag draws (a display preference, beside `showPorts` and `angular`); it never touches an existing edge. `project.direct` / `setDir` / `reform` exist and **nothing calls them**, so once a relationship is drawn its direction and form are fixed. R.5's expansion gives both a home on the edge menu; this row is the check that they then work end to end. **`axis`, `arrange` and `mark` are fine** — the bar, the `.shape` cluster and `onMarkPort` respectively | `src/actions/`, `modules/view/diagram/` | R.5 |
| **R.7** | **A directed relationship draws no arrowhead**, so direction is invisible on the canvas even where the graph holds it. Found while cataloguing homes for R.5 — `direct` being unreachable hid it. Arrowheads are the engine's visual language, not chrome, so this is **not Wave V's** | `modules/view/diagram/`, `src/styles.css` | ⊘ |
| **R.8** | **actions.md gains a description column.** The table lists name, scope, arguments, mutations and what each replaced, but never says what an action *does* — which is why `reform` had to be read out of the source to answer a question about it. **The text already exists**: `about` is required on all 29 descriptors and is written to be scored against. Copy it in and keep the descriptor the source | `actions.md` | ⊘ |
| **R.10** | **The explorer menu writes to the wrong project.** `menu_ctx` always builds its context from the **project in context**, so right-clicking a row in project B while A is open offers actions that write A's log, with nothing saying so. The left-click path switches context first, which is why this only shows up through the menu. Found by review after `R.1` | `page/Files.tsx` | ⊘ |
| **R.11** | **A legacy project with no domain reports a repair it did not need.** `healVocabulary` counts `vocabulary: ""` as healed, but the normalisation carries no information — an empty string was already no packages — so every pre-migration project without a domain opens with a spurious trouble notice. Cosmetic, and exactly the kind of false alarm that teaches people to ignore the real ones | `graph/check.ts` | ⊘ |
| **R.9** | **The strip at the foot of the stage becomes *what is selected, and what it could be*.** The selection's **name** plus **the types available to it**, capped to a readable number, picked in one click — and the same list on right-click. **It is not only for relationships and ports**: a block, a group and a note answer the same question, so the strip is universal rather than a relationship special case. This is what makes `R.5`'s expansion usable instead of a menu that grows with the vocabulary. **The slot is Contents' slot**, so it opens once `W.1` moves Contents into the table view | `modules/view/diagram/`, `canvas/Canvas.tsx`, `src/styles.css` | R.5, W.1 |


## Y — one options rail, and themes that reach the drawing

**Three things, and the rail is the large one.** All four decisions under it were taken by Clay
after driving V.19; the reasoning is in tasks.md, stream **Y**.

**The rail is a seam, not a control.** Today `modules/view/diagram/chrome.tsx` owns `Toggles` and
`Arrangements`, and only the diagram has them — a table or a matrix draws its own `.arrange` shell
with a types cycle in it. A rail fixed to the right of *every* view cannot live in one module, and
copying it into six is the shape `R.2` exists to remove. **So the rail is page-level and a view
module declares what goes in it** — which keeps spec.md's *per module: a matrix has no interfaces
toggle* true, rather than greying out a control that means nothing there.

**`Y.5`–`Y.7` reverse U.4 and one line of CLAUDE.md**, knowingly: *a theme never recolours a card,
route or frame* is what made `modern` a blue shell around a green diagram.

**The relationship inverts rather than moving.** It was *the definition paints and the theme keeps
off*; it becomes **the theme owns the palette and a definition chooses within it** — a hue slot and
an intensity, never a colour. So the two are no longer layered with one winning: they answer
different questions, which is the only arrangement where a definition cannot look wrong. design.md's
*a theme is chrome; a style set is content* survives, but *a definition's `style` wins over the
theme* does not, and `Y.7` is where it goes.

**This is the design-token model** — Radix Colors' fixed-function steps, Material 3's role-and-tone,
shadcn's semantic variables. Its guarantee is the one wanted here: contrast is a property of the
step, so *ink on fill is readable* holds in every hue and every theme without anybody checking.

**Watch — the exported SVG.** `svg.ts` hard-codes its own greens, and a downloaded file has no page
to read a variable from. Whether an export follows the theme it was made in or always renders one
neutral way is a real question and is **not settled**; `Y.6` inlines whatever the theme resolves to
and the question is parked in tasks.md rather than answered by accident.

| | Does | Owns | Waits |
|---|---|---|---|
| **Y.1** | **Cut the rail seam.** A page-level rail fixed to the right of the stage, rendering the groups the **open view module declares** — so it is one surface whose contents vary, not six copies. `ViewModule` gains a way to say what it offers, beside `surface`; the diagram declares interfaces / draw / relation / flow / arrange and the four move across **unchanged**, words and all. `.arrange.options` and `.shape` go. **Not a rewrite** — same controls, same handlers, one owner. Adding a field to `ViewModule` is not widening a closed set; the module list is closed, a module's own fields are not | `page/`, `modules/view/index.ts`, `modules/view/diagram/chrome.tsx`, `src/styles.css` | ⊘ |
| **Y.2** | **The rail's own look: a slim column of icons under small group labels.** The group label is the only text; every icon keeps a tooltip. Groups sit **far enough apart to read as separate** — the thing two adjacent unlabelled icon columns get wrong. **The verb group is marked out from the settings**: design.md keeps *toolbars divide by states against verbs*, and a rail of identical groups is exactly what erases that, so `arrange` takes a rule and never lights up. **This reverses U.15's *every control carries a word*** — survivable only because U.9 and V.2 gave every control a distinct icon, which is the same ground V.5 stood on | `page/`, `src/styles.css` | Y.1 |
| **Y.3** | **The view toggle is the rail's first group, and export joins it — both leave the explorer.** The toggle becomes one icon per view again rather than V.19's cycle, since a column has the room a tree row did not. **This reverses V.6**, which moved export to the explorer on the grounds that the header is workspace-scoped and the explorer project-scoped; the rail is a third scope — *the thing on the stage* — and that is where both belong. The explorer row goes back to a name and its fold icon; `.row-tools` goes | `page/`, `page/Files.tsx`, `src/styles.css` | Y.1 |
| **Y.4** | **Every other view module declares its groups**, so the rail is genuinely fixed rather than diagram-only. Table and matrix hand over the types cycle they draw in their own `.arrange` shell today and stop drawing one; activity, sequence and state declare what little they have. **The duplicate this removes** is the per-module `.arrange` shell, not the controls | `modules/view/table/`, `modules/view/matrix/`, `modules/view/activity/`, `modules/view/sequence/`, `modules/view/state/` | Y.1 |
| **Y.5** | **The theme becomes a ramp, not a list of colours.** A **closed set of hue slots** and a **fixed set of steps**, where a step means the same *job* in every slot and every theme — step 2 is a fill, step 6 a border, step 11 ink on either. That is what makes contrast structural rather than checked by eye. The theme owns the mapping; nothing else names a colour. **Also fixes what is missing today**: `modern` and `light` redefine ten variables and never touch `--away`, `--note`, `--error` or `--warn`, so the violet, amber and red are retro's in every theme. **Reserved to the theme and never tunable**: selection, hover, focus, grazing, icons, container child chips, the error and warning roles. **Retro must look identical afterwards** — the acceptance test, because a theme pass that restyles the default look has changed the product | `src/styles.css`, `src/modules/style/` | ⊘ |
| **Y.6** | **The ~30 hard-coded greens move onto the ramp.** `.card` body `#111a16`, `.card.grazed`, walls and ports `#3a5c4b`, the reference greys, plus `paint.ts`'s `PLAIN` / `AWAY` and `NodeCard.tsx`. Mechanical once `Y.5` exists; it is a separate row because it touches four files and the ramp has to be settled before anything can be moved onto it. **`svg.ts` is included but its open question is not answered here** — it inlines whatever the theme resolves to, and *which* theme an export should carry stays parked | `src/styles.css`, `modules/view/diagram/paint.ts`, `modules/view/diagram/NodeCard.tsx`, `modules/view/diagram/svg.ts` | Y.5 |
| **Y.7** | **Definitions tune, they do not paint.** `Definition.color?: string` is the one free-form value in the style surface and the only way a definition can look wrong — `line`, `head`, `icon` and `size` are already closed sets or names into one. It is replaced by **a hue slot from the theme's closed set** plus **an intensity step**, so two types still read as different things while neither can be off-palette. **Slot, not intensity alone**: a model needs *requirement* ≠ *part* ≠ *constraint* at a glance, and one hue for everything would lose that. **The other tunables are closed too** — border weight and text emphasis are enumerations (`hairline\|thin\|thick`, `quiet\|normal\|loud`), never free numbers or font names, since a 6px border breaks a visual system as surely as magenta does. **Inclusion stays boolean** (is the type shown, is the icon shown) and is safe as it is. **Schema change with a migration**: `color` is stored, exported and in logs, and `samples/mndflow.json` carries six raw hexes — they map to the nearest slot, or to the default, and `check.ts` heals the old shape | `src/graph/types.ts`, `src/modules/style/`, `src/graph/check.ts`, `samples/`, `docs/definitions.md` | Y.5 |
| **Y.8** | **A deselected project stops looking selected.** `lit()` falls back to `scoped()` when nothing is chosen, and `.item.active` paints *the open layer* and *the selection* with one treatment — so after a deselect the project root still reads as picked, which is precisely the gesture V.14 made load-bearing. **Two meanings need two looks**: the open layer is where the canvas is pointed, the selection is what an action would act on. Give the open layer the quieter of the two | `page/Files.tsx`, `src/styles.css` | ⊘ |


## W — the tray shows what is in focus

**Contents already *is* the table view.** It is not a thing to move into `modules/view/table/`; it is
stuck at one size. U.7 said as much — *both open partially, as the panel does now, and expand to the
full canvas* — and landed `◐` on exactly that: **expand does not cover or replace Contents**.

**The rule that makes the rest fall out**: the tray shows the **contents of whatever is in focus**.
Nothing selected is the layer, and the layer's contents *are* the table. A block shows its fields, a
group its members, a note its text, a relationship its ends and what it could be. One surface, one
question, answered at whatever depth the pointer is at — which is why `R.9`'s type list stopped
looking like a relationship special case. **Partial and full are sizes of one tray**, and the `table`
entry on U.8's toggle means *open it full*.

**One thing does not fit the recursion.** Field *values* are an element's contents and belong in the
tray; **definitions** — what types exist, what fields a type carries, adding and dropping relation
kinds (E.1–E.3, SC.4) — are the **vocabulary**, and nothing is in focus when you edit them. That is
the split, and it is load-bearing: U.11 deleted `Relations.tsx` on the grounds that *Contents covers
relation kinds*, so a focus-driven tray must not take that capability down with it.

| | Does | Owns | Waits |
|---|---|---|---|
| **W.1** | **The tray expands to the full stage**, finishing U.7's `◐`. Contents is the table view at full size — same component, same listing, same filters and sort; the shipped `table` module's own listing is the duplicate and goes. `tray.full` in `styles.css`, and expand covers Contents rather than sitting beside it | `modules/view/table/`, `page/Contents.tsx`, `page/App.tsx`, `src/styles.css` | ⊘ |
| **W.1a** | **The tray's three sizes, settled.** **Partial is 25% of the stage** by default — `.tray.open` is `33%` today, and the comment there argues for *a third* on grounds (a fixed height beats one that moves with the row count) that 25% keeps; only the number changes, so the drawing gets more of the stage. **Shut is a bar**, one click away on the tab, which already works. **Full is what the view toggle means**: setting a project to `table` makes the listing the stage, and the tray is that listing at full size rather than a second one under it. **This is the row that removes the duplicate V.19 left visible** — a table filling the stage with a `contents` bar still at its foot, both listing the same layer. Do not add a fourth size or a hidden mode: three, and the toggle and the tab are the only two doors | `page/Contents.tsx`, `page/App.tsx`, `src/styles.css` | W.1 |
| **W.2** | **The two sizes take different inputs, and that is what keeps them honest.** **Full — the `table` view on the stage — shows the layer and everything in it, and the selection does not narrow it.** **Partial — the tray at the foot — is the same table scoped to what is in focus**: its name and available types at the head, its contents as rows. Nothing in focus and the partial tray shows the layer, so the two agree and *expand* is genuinely only a size. This is not the hidden state U.8 rejected — the sizes never disagree about one input, they read different ones. **Recommended for the one case that is not a row filter**: a group or a block with children narrows to rows of the same shape, but a note has text and a leaf block has fields, and Contents already carries an opened-row presentation for exactly that (`styles.css`, *A row opened out*) | `page/Contents.tsx`, `modules/view/table/` | W.1 |
| **W.3** | **Vocabulary editing needs no new door — deselecting is the door.** Definitions are not the contents of anything, but **the layer listing already holds the types chip** (E.1), and the layer listing is what the tray shows when nothing is in focus. So: click empty space, the tray un-focuses back to the whole layer, and the vocabulary is one chip away. **The tray sits at the foot in every view**, so this is reachable from a block diagram, a matrix or an activity alike — which is what keeps U.11's deletion of `Relations.tsx` honest. **The same gesture as `V.14`**: empty space deselects, on the canvas and in the explorer both, and it is what unlocks *new project* there and *edit the vocabulary* here | `page/Contents.tsx`, `canvas/Canvas.tsx` | W.2 |
| **W.4** | **Matrix draws a heatmap.** **Hue is the relationship kind and opacity is the count** — transparent at zero, grading up — so both dimensions read at once. **The hue comes from the definition's existing `style`** (`styleOf` / `lookOf`, `styles/sysml.ts`), never a new matrix palette, so the matrix and the diagram cannot disagree and there is no second colour vocabulary to keep. **A cell holding two kinds draws as bands**, one per kind, degrading to a solid cell in the common single-kind case; the strip lists them all on selection | `modules/view/matrix/`, `src/styles.css` | W.1 |

**Watch**: `V.15` takes the relationship type filter off the canvas bar, and a matrix over a busy
vocabulary may want one of its own. A different surface, so not a contradiction — but it should
arrive by decision rather than by the back door.


## Wave 2 — leftovers

| | Does | Owns | Waits |
|---|---|---|---|
| **G.9e** | **`retype` is scoped to `element\|edge`, closing G.9d's gap.** Not a design decision — a descriptor disagreeing with everything around it. [actions.md](actions.md) already scopes `retype` to `element\|edge` and `run` already accepts an edge id; only the descriptor says `element`, which is why `offer(ctx)` never lists it for an edge. Widening one `Scope` is **not** widening the action set — the set of actions is closed, a descriptor's own fields are not | `src/actions/`, `actions.md` | ⊘ |
| **A.7d** | **`infer`'s result is reachable.** Today it mints a behavior project that is never admitted to `held.projects`, so nothing in the explorer or the canvas shows it and the action's output is a dead end. It should **admit the project to the workspace under a default name, select it, and let the context change** — the layer moves, and the view module then draws it like any other project. **No proxy is placed in the source layer**: a proxy exists to carry a relationship across a boundary, and [behaviors.md](behaviors.md) rejects the back-reference outright — it "would duplicate a fact living in another log and leave a structure project opened alone pointing at behaviors that are not there". Refs point one way, from the behavior at the participants | `src/actions/behavior.ts`, `workspace/` | ⊘ |

## Wave U — what is left of it

**Wave U landed and is in [landed.md](landed.md).** One row survives it: the two `◐` gaps U.7 and
U.14 left, both parked on the same words — *App not owned*. **U's *chrome, not the diagram's visual
language* boundary held through V and is reversed by `Y.5`** — a theme now supplies the diagram's
defaults, while a definition's `style` still wins.

| | Does | Owns | Waits |
|---|---|---|---|
| **U.18** | **The two `◐` gaps Wave U left in `App.tsx`.** Both were parked on the same words — *App not owned* — and both are a wire rather than a design: **U.7**'s `path` / `onUp` are never passed to table and matrix (so both fall back to deriving the trail from the graph), `tray.full` is missing from `styles.css` (so expand does not cover Contents), and **U.14**'s `App.newProject` still does not call `workspace.begin`. One row because they are one file, and leaving them as two `◐`s means two rows that each wait for the same owner | `page/App.tsx`, `src/styles.css` | ⊘ |


## Wave T — the suite

The gaps the test review named, as rows. **Owns `tests/` alone**, so no T row ever contends with an
implementation row. Detail in tasks.md, stream **T**.

**The largest gap still sits under the wave about to rewrite it.** `App.tsx`, `Files.tsx` and
`Panel.tsx` have no cover and every browser-found bug lived there — but **Wave V** now rewrites the
header, the explorer and the chrome, so T.3's wait simply moves from U to V. Same reasoning, same
rule: *do not write tests for a design that is still moving*.

| | Does | Owns | Waits |
|---|---|---|---|
| **T.3** | **`App.tsx`, `Files.tsx` and `Panel.tsx` get cover** — ~2,200 lines, no tests, and the place every browser-found bug lived. **Waits on Wave U deliberately**: U rewrites the header, the explorer and the chrome, so a suite now would be rewritten with them | `tests/page/` | Wave V |
| **T.5** | **A DOM harness, so page interaction can be tested at all.** There is no jsdom, happy-dom or `@testing-library` in the tree, which is why T.2 stopped at SSR markup and left filter chips, column sort, row pick, hover lighting and strip `onSay` unproven. **`happy-dom` + `@testing-library/react`** — happy-dom because it is vitest-native and nothing here needs jsdom's deeper spec cover (no canvas, no navigation); testing-library because its queries are *role and text*, which is *properties, never values* applied to markup. **It proves itself on T.2's leftovers over `Contents.tsx`** — which Wave U did not rewrite — rather than waiting for T.3. Two dependencies, against *never add a dependency where a few lines will do*: a DOM harness is not a few lines | `tests/`, `package.json`, `vite.config.ts` | ⊘ |

## Wave 3 — the rail

**Z.1–Z.8 are built and archived in [landed.md](landed.md)** — but they were built against a spec
that changed while they were being built, so one row is left: `Z.9` trims the wave to the ranking
surface and a fixed expanded pane. **The tutorial (Z.5) is wanted and deliberately last**, behind
Wave V, because a tutorial teaches whatever the app currently is. See tasks.md, stream Z.

**The rail is not a command palette.** It is the app's single text entry point over the workspace,
ranking and completing what the context offers and surfacing the documentation that bears on it,
adapting to how one person words things. **It never changes context**: it ranks *against* context,
so the explorer and the pointer still navigate. **As scoped it is wholly client-side.**

| | Does | Owns | Waits |
|---|---|---|---|
| **Z.9** | **Trim Z to what is wanted, and stop there.** Z.1–Z.8 are annotated *landed (proven)* but are **thin against what they claim** — the wave is half-built, and the honest reading is below. It is trimmed rather than finished because **the UI refinements in Wave V come first**. **Keep and finish**: chip order from `rank.ts` (225 lines — embedding lead, learned preference, fixed `ORDER` fallback; this part is real), `feedback.ts` (74) behind it, and **the score on hover, which does not exist anywhere yet** — that is the whole of the ranking surface Clay asked for. **Cut back**: expanded mode becomes **a fixed placeholder prompt set** on the theme of *"What's next?"* plus **the selected action's description**, which takes `guidance.ts` (32 lines, two hardcoded strings) out and stands the expanded pane down off `router.ts` / `workflows.ts` / `turn.ts` — the question loop tasks.md already said would *lose its centre*. **Delete**: `Scores.tsx` (55 lines, unmounted since U.11 and now never remounted — the hover score replaces it). **Collapse `ORDER`**, now duplicated **four** ways — `rank.ts`, `page/Files.tsx`, diagram offer chrome, `terminal/` | `terminal/`, `page/App.tsx` | ⊘ |


## Wave V — the shell, second pass

Wave U made the shell *coherent*; V makes it **legible and compact**. The rows come from driving the
built app, which is the same source every real bug has had.

**`V.2` goes first and most of the wave waits on it.** One curated inline-SVG vocabulary replaces
the Unicode marks outright — which is also the answer to why the chrome looks blurry and indistinct.

**Two rows reverse a decision U landed on purpose**, and that is allowed — but the reason U gave
should be read before it is overturned, not after. **V.3** puts *new workspace* back on an icon,
against U.13's *rare and destructive is exactly when a label beats an icon*. **V.5** makes the view
toggle icon-only, against U.8's *a labelled control beside the project root — not an icon that
cycles*. Both are Clay's call, made deliberately: there is not enough room for the words, and U.9's
distinct per-module icons are what make V.5 survivable at all.

**One line to hold on to**: chrome may shrink to icons, but **an icon that fires a destructive or
irreversible action needs a word, a tooltip or a confirm** — V.3 keeps its confirm for that reason,
and V.5's tooltips stop being optional.

**`src/styles.css` is this wave's contended file, and it is already 2,156 lines.** Eight of the nine
V rows own it — the same shape `page/Files.tsx` had across Wave U, and `Canvas.tsx` and
`Contents.tsx` before their seams were cut. **Rows that own it cannot run in parallel**, so either
they serialise deliberately, or a seam is cut first. Recorded now rather than discovered at the
third collision; `S7` is the precedent for what cutting one costs.

**Flow does not apply an arrangement.** It was considered and refused: `actions/layer.ts` keeps
*an arrangement writes placement; an axis is a setting and says nothing about where cards go*, so
the two stay separate and only move next to each other (V.7).

| | Does | Owns | Waits |
|---|---|---|---|


## S7 — the last seam

`page/Files.tsx` is the third file to outgrow the table in [tasks.md](tasks.md) rather than a seam,
after `layout.ts` (1423) and `page/Contents.tsx` (1444). **Seven Wave U rows reached it** — G.9b,
U.17, U.3, U.12, U.14, U.2, U.8 — and **none cut a seam**; it simply grew as they landed. That is
exactly the shape `Canvas.tsx` and `Contents.tsx` had before theirs were cut.

**Now is the moment.** Wave U is done with the file and Wave Z is done entirely, so for the first
time nothing else owns it. The next thing to reach in should find a seam already cut.

| | Does | Owns | Waits |
|---|---|---|---|
| **S7** | **Cut the `page/Files.tsx` seam.** Take the split from what the file actually does rather than from line count: the tree and its rows, the naming prompt, the offer menu, and the foot (undo / redo / last action) are four jobs in one file. **Not a rewrite** — the same behaviour, moved, with the browser drive proving each half still works. Fold in the duplicated `ORDER` while here if it falls out naturally; do not go looking for it | `page/Files.tsx` | ⊘ |


## Not in the queue

**The IBD layout law** (was A.12) — **dropped**: the view inside a child block already *is* an
internal block diagram, so no separate law or view module is wanted. Kept as something to expand on
later only if connectivity-ranked placement proves worth having on its own.

**Moving the arrangements** (was U.16) — **dropped.** The row wanted the verbs out of the bar to
keep design.md's *toolbars divide by states against verbs* true. They were already out: `.shape` is a
floating cluster at the canvas's bottom right, not part of the `.arrange` bar, and U.15 gave it
words. **The interface stays the same whatever the layer or project** — no root affordance, no
second door.

*One reason first given for dropping it was wrong, and driving the app found it.* `arrange` is
`scope: { on: "layer" }`, so it was said the frame's right-click list already offered it. **It does
not**: `arrange` carries a required `choice` argument and no menu asks a choice, so it is withheld
everywhere — see `R.5`. The bar is the only way to reach it, which is what was wanted, but by
accident rather than by design.

Recorded in [tasks.md](tasks.md) and deliberately unscheduled: translators and code generation,
local variation on a proxy for multi-user work, the cluster spacing tier, and the README rewrite
that waits for all of this to land.

**A VS Code host** — design.md, *The browser is the product; another host is a shell*. The web app
stays primary; an editor-hosted version is a second host for the same app, for people who would
rather not use a browser. Not scheduled, and no row waits on it.

**Export destinations** — design.md, *Where a project lives, and where it can be sent*. Storage
stays browser-local and client-side; what import/export gains is somewhere to send a file: local
disk (that is F.2) and a cloud drive. No cloud home, no sync, no server. Not scheduled.
