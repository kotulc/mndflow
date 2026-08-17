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

**Wave V is next** — the shell's second pass, from driving the built app, and it carries no `◆`.
**`V.2` is the one to take first**, the icon vocabulary most of the wave draws on. `V.4` and `V.11`
depend on nothing and can go in parallel.

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

**`R.1`–`R.4` landed** (proven in a browser): the argument-filling layer is one module, a tie can no
longer be offered against itself, *Leave group* works, `Field` / `Drop field` / `Interface` appear
where they belong, and a new project comes into being importing a vocabulary it can pick types from.
**`R.9` and `V.12`–`V.15` came from playing with the built app.** Two are real gaps (no way to delete
a project; nothing confirms a delete), one is a removal (the type filter), and `V.14` reverses a
landed row (answered — deselecting is the door to a new project).

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
| **R.1** | **Fix `fill_args` / `can_fill`.** Three defects, one root. **(a)** `tie` fills `note` and `holder` with the same id, writing a **self-loop tie into the log** — `check` passes, so it commits. **(b)** `leave` gets `id === group`, so *Leave group* refuses "Not a group." on every element, including ones genuinely in one. **(c)** `can_fill` never inspects `text`, so `field` / `unfield` / `undefine` prompt for a raw `holder` or def id and always refuse. **The rule to restore**: distinct element arguments take distinct elements, and one focused id may fill at most one of them — **landed** (proven): `fill` / `fillable` in `src/actions/fill.ts`; an element argument takes an unclaimed candidate, and one carrying a `form` takes a candidate of that form; a required `group` argument reads the group the selection is *inside*, which is what `leave` means; `holder` is optional on `field` / `unfield` (`holder_of` already defaulted it) and `unfield`'s `name` gained a prompt. **Driven**: Tie is withheld on a lone note (was a self-loop); Leave group is offered on a grouped card and no longer refuses; Field / Drop field / Interface now appear where they belong. 12 property tests in `tests/actions/fill.test.ts` | `src/actions/fill.ts`, `modules/view/diagram/offer.tsx`, `page/Files.tsx`, `terminal/rank.ts`, `src/actions/fields.ts` | ⊘ |
| **R.2** | **One copy of `ORDER` / `rank` / `can_fill` / `fill_args`.** Triplicated across `offer.tsx`, `Files.tsx` and `rank.ts` and **already divergent** — the explorer and rail copies lack the `interface` side/at guard the diagram copy has, so *Interface* is offered everywhere and always refuses. Collapse to one home beside `offer()`, and retire the dead twin `offered()` on `actions/index.ts` — **landed** (proven): `src/actions/fill.ts` holds `ORDER`, `rank`, `fill` and `fillable`; all three surfaces call it and keep only what they alone know (the canvas a border place, the explorer a cross-project selection, the rail its draft) as a `seed`; `offered()` deleted and its one test moved to `offer`. **The `interface` guard is now one rule**, so the explorer stops offering an action it always refused | `src/actions/fill.ts`, `actions/index.ts`, `modules/view/diagram/offer.tsx`, `page/Files.tsx`, `terminal/rank.ts` | ⊘ |
| **R.3** | **A new project has an empty type picker.** `Contents.offerings` keys on `graph.vocabulary`, but `workspace.started` never sets it, so a project created from the explorer offers **no types at all** where it used to offer the whole shipped catalog. A regression from D.2, and the first thing a new user meets — **landed** (proven): `started()` carries `set_vocabulary` beside the naming, so a project comes into being importing `packages/core/freeform`, which its own first line says is *where a new project begins*. **The first fix was wrong and a test caught it**: `core/` has no `definitions.yaml`, so each file there is its own package keyed by stem — there is no `pkg_core`, and the vocabulary pointed at nothing. Driven: a new project logs `set_vocabulary: ["pkg_freeform"]` | `src/workspace/index.ts` | ⊘ |
| **R.4** | **Two smaller ones.** The menu's rename prompt passes `within` / `except` as null, so the inline clash check consults the **root layer instead of the element's siblings** — a name can collide and not be caught. And `scripts/test-ci.mjs` calls `process.kill(-pid)` without spawning `detached: true`: on POSIX that throws `ESRCH` and the fallback kills only the shell, **orphaning the vitest tree the script exists to reap** — **landed**: the prompt now derives its clash scope from the action, so a rename is checked against the element's own siblings and excludes the element itself, and a create against the layer it lands in; `test-ci.mjs` spawns `detached` off Windows so `process.kill(-pid)` reaches the group. **Not proven**: the orphan-reap path needs a hung suite on POSIX to exercise, and this is Windows | `page/Files.tsx`, `scripts/test-ci.mjs` | ⊘ |
| **R.5** | **A required choice expands into one entry per option.** Five actions carry one — `mark` (`flow`), `direct` (`dir`), `reform` (`form`), `axis` (`axis`), `arrange` (`shape`) — and a choice is a question no menu asks, so all five are withheld from every offered list while holding reserved `ORDER` slots. **Settled: the options become the entries.** Right-clicking a relationship lists the relation types and forms themselves, not an action that then asks which — no submenu, and no open text prompt. The list is tailored to the target because the options are. **This does not widen the closed action set**: one registered action, offered N times with different args, which is the wording U.16 already used before it was dropped. **The flag goes on the descriptor** (`expand`, beside `scope` and `about`) so it stays one rule rather than the per-surface special-casing R.2 just removed. `arrange` and `axis` leave it off — they have homes. **Watch**: an edge menu then lists every relation type in the project; cap or scope it if a large vocabulary makes it unreadable | `src/actions/`, `src/actions/fill.ts`, `modules/view/diagram/offer.tsx` | ⊘ |
| **R.6** | **`direct` and `reform` have no home at all** — the catalogue behind R.5 turned this up. The canvas relation group is `onForm`, a **draft** setting for what the *next* right-drag draws (a display preference, beside `showPorts` and `angular`); it never touches an existing edge. `project.direct` / `setDir` / `reform` exist and **nothing calls them**, so once a relationship is drawn its direction and form are fixed. R.5's expansion gives both a home on the edge menu; this row is the check that they then work end to end. **`axis`, `arrange` and `mark` are fine** — the bar, the `.shape` cluster and `onMarkPort` respectively | `src/actions/`, `modules/view/diagram/` | R.5 |
| **R.7** | **A directed relationship draws no arrowhead**, so direction is invisible on the canvas even where the graph holds it. Found while cataloguing homes for R.5 — `direct` being unreachable hid it. Arrowheads are the engine's visual language, not chrome, so this is **not Wave V's** | `modules/view/diagram/`, `src/styles.css` | ⊘ |
| **R.8** | **actions.md gains a description column.** The table lists name, scope, arguments, mutations and what each replaced, but never says what an action *does* — which is why `reform` had to be read out of the source to answer a question about it. **The text already exists**: `about` is required on all 29 descriptors and is written to be scored against. Copy it in and keep the descriptor the source | `actions.md` | ⊘ |
| **R.9** | **The strip at the foot of the stage becomes *what is selected, and what it could be*.** The selection's **name** plus **the types available to it**, capped to a readable number, picked in one click — and the same list on right-click. **It is not only for relationships and ports**: a block, a group and a note answer the same question, so the strip is universal rather than a relationship special case. This is what makes `R.5`'s expansion usable instead of a menu that grows with the vocabulary. **The slot is Contents' slot**, so it opens once `W.1` moves Contents into the table view | `modules/view/diagram/`, `canvas/Canvas.tsx`, `src/styles.css` | R.5, W.1 |
| **V.12** | **A project can be deleted.** There is no path to it at all today: the explorer's bar Delete calls `onDelete(view)`, which is the registry `delete` against the current *layer*, and a project root is not a node it can remove. **Deleting a project is a workspace operation** — `workspace.forget` already exists and does exactly this ("its proxy goes and its entry with it") and **nothing calls it**. The same shape as `begin` before U.14: the operation is built, the wire is not. **Do not add a page action** — the closed set is untouched | `page/Files.tsx`, `page/App.tsx`, `workspace/` | ⊘ |
| **V.13** | **Delete asks first.** Nothing confirms anything today — `project.remove` goes straight to the door, and App's *"everything that used to be an `alert` or a `confirm`"* moved refusals to the strip without leaving a confirm behind. Deleting a block is undoable and can stay quiet; **deleting a project is not the same size of thing** and wants the confirm U.13 kept for a new workspace | `page/App.tsx`, `page/Files.tsx` | V.12 |
| **V.14** | **The explorer `＋` follows the selection, and deselecting is how you reach a new project.** Nothing selected makes a **project**; a project selected makes a **block inside it**; a block selected makes a block under it. **This reverses U.14 as landed** — that row's rule sent a selected project to *project* — and the door it closes is reopened by **deselection**: clicking blank explorer space, or clicking the already-selected project, clears the selection. **The view does not follow the selection away** — the canvas keeps showing what it shows until a new block is picked, so deselecting to make a project never costs you your place. Both project and block creation stay central to the explorer; the header is for workspace options only | `page/Files.tsx` | ⊘ |
| **V.15** | **Drop the relationship type filter from the canvas options.** The *show all relationships* / per-type cycle goes. It landed as G.1 (toolbar cycles types, filtered edges do not draw, seats clear) and never earned its place in the bar. **Settled: the whole `types` row goes**, the per-type entries and the all-types entry together — removing only *all* would leave a filter that cannot be cleared. G.1's toolbar cycling retires with it | `modules/view/diagram/chrome.tsx`, `canvas/Canvas.tsx`, `src/styles.css` | ⊘ |
| **V.16** | **A tie can be selected.** Today it cannot, and that is deliberate — `compose.ts` builds a note's leaders with `selectable: false, focusable: false, deletable: false` under *decoration, not relationships — they take no pointer, cannot be selected*. **So this is a reversal, and a defensible one**: a tie is a real edge in the graph (`isTie` is derived from its ends, but the edge is stored, and untying deletes it), so picking one and deleting it is coherent. **It adds a second door rather than the only one** — right-dragging a node onto a note already toggles tie and untie. Keep leaders drawn faint; selectable is not the same as loud | `modules/view/diagram/compose.ts`, `src/styles.css` | ⊘ |
| **V.17** | **Both canvas control groups sit inline at the top right, labelled, and never touch the crumbs.** Today `Toggles` is one bar of three vertical groups (U.15). It becomes **two groups, inline, each carrying its group frame label**: *view* — the interfaces toggle and the angular / plain draw setting, which are both display settings — and *relation types*, separately. **Flow leaves for the bottom right** under `V.7`, and the type filter row is gone under `V.15`, so the top holds settings only. **Crumbs keep the left**: U.1 made `.arrange` wrap rather than overlap, and inline groups must not undo that — the crumbs truncate, the controls stay put | `modules/view/diagram/chrome.tsx`, `src/styles.css` | V.17a, V.7, V.15 |
| **V.17a** | **The *relation types* group picks what the next drag draws — settled.** In order: **plain line**, then **directed**, then **the relationship types in scope**. The first two are *untyped, in each of the two forms*; the rest are definitions, and **a definition already carries its own form**, so picking *depends on* draws whatever that type is defined as. No form × type matrix. The list comes from `graph.vocabulary` (D.2), so a fresh project shows line, directed and freeform's four. **It writes nothing** — it stays a page-held display preference beside `showPorts` and `angular`, exactly as `form` is today. **This is what the deleted filter should always have been**: choosing what you are about to draw, rather than filtering what already is | `modules/view/diagram/chrome.tsx`, `canvas/Canvas.tsx` | ⊘ |
| **V.17b** | **`relate` gains an optional `type`.** It takes `from`, `to` and an optional `form` **choice** and has no way to say *what kind* — so V.17a has nothing to hand it. Adding an argument to a descriptor is **not** widening the closed action set, the same reasoning `G.9e` uses for scope. **The alternative is worse**: `relate` then `retype` puts two steps in the log for one gesture and costs two presses to undo | `src/actions/edges.ts`, `actions.md` | V.17a |


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
U.14 left, both parked on the same words — *App not owned*. **U owns chrome, not the diagram's
visual language**, and that boundary still holds for Wave V.

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
| **V.1** | **The theme control becomes a compact three-position icon toggle**, in the manner of Nextra's: **Light**, **Modern** (the dark one, blues), **Retro** (green-on-black, in the *system* slot and **the default**). Today they read `current` / `modern` / `light` as a three-word group (U.4), so `current` → `retro` also migrates the sticky `mndflow.theme.v1` — an existing session must not land themeless. **Recorded honestly**: Retro occupies the system position but does **not** read `prefers-color-scheme`; it is a third look wearing that slot's icon. True OS-following would need a fourth state, and is not wanted | `page/App.tsx`, `src/styles.css` | V.2 |
| **V.2** | **One curated icon vocabulary for the whole app, replacing the Unicode marks entirely.** **A single module defines the set** — the app's default icon/SVG vocabulary and the design language that governs it (one grid size, one stroke weight, one visual idiom), and every surface draws from it rather than inlining a glyph of its own. Vendored **inline SVG**, not a package, since icons are markup and the tree's rule is *never add a dependency where a few lines will do*. **This is also why the chrome looks blurry**: a Unicode mark renders from whatever system font has it, unhinted at small sizes, with metrics that differ per platform and a baseline it sits off. SVG draws at exact pixel sizes with one stroke weight. **U.2's rule is what carries over, not its glyphs** — *no mark means two things* governs the new set exactly as it did the old. **Consequence to plan for**: U.9 published `icon` on `ViewModule` as a Unicode string and the conformance suite asserts non-empty and pairwise distinct, so the six view modules and that suite move with this row. **Not in scope**: per-definition icons (`layout: icon`) are stream E's, and become a *consumer* of this set later — do not reopen them here | `src/modules/icons/`, `src/styles.css`, `page/`, `modules/view/` | ⊘ |
| **V.3** | **`new workspace` becomes an icon**, replacing the word U.13 landed. **Not a refresh mark** — refresh reads as *reload what is here*, and this **discards every open project**; the two readings are opposite and the destructive one is the real one. A discard / trash glyph says what happens. **Keeps its confirm**, which is what makes any icon safe here | `page/App.tsx`, `src/styles.css` | V.2 |
| **V.4** | **Relationship lines highlight on hover.** They do not today, so a line cannot be told apart from its neighbours before clicking. Note the dead CSS already recorded in tasks.md — `.leg-grab` / `.leg-mark` describe grab bands `Wire` no longer draws — and either reclaim or delete it here rather than adding a third hover mechanism beside it | `modules/view/diagram/`, `src/styles.css` | ⊘ |
| **V.5** | **The view toggle goes icon-only** — block / table / matrix as U.9's glyphs with tooltips, no words. Reverses U.8's labelled control; U.9's six distinct icons are the reason it can work. **Tooltips are not optional here**: the icon is the only remaining signal of what the control does | `page/Files.tsx`, `src/styles.css` | V.2 |
| **V.6** | **One export door in the header, one in the explorer.** The header is workspace-scoped and the explorer project-scoped — U's own rule — so the header keeps **workspace export and workspace import** only, and the **per-project export moves to the explorer row**. Removes the two side-by-side header exports (`⤓` / `↧`, S4.6) that read as a choice nobody can make. **Settled as the move, not a new capability**: what lands in the explorer is today's `↧` — the project written as a project file. *Exporting a project **as a package** is a different thing and is not this row* — it is the **package authoring UI** already parked from D.2 | `page/App.tsx`, `page/Files.tsx`, `src/styles.css` | V.2 |
| **V.7** | **The flow options move to the canvas's bottom right**, as their own group **directly above the arrangements**, leaving the `.arrange` bar. The two groups sit adjacent but stay **visibly distinct** — flow is a *setting*, arrangements are *verbs*, and design.md keeps them apart on purpose. Distance used to carry that; here a group boundary has to | `modules/view/diagram/chrome.tsx`, `src/styles.css` | ⊘ |
| **V.9 + V.10** | **The project root icon does the work of both** — one span, so one row. **(V.9)** Draw it from the project's kind so a structure reads differently from a behavior: [Files.tsx:688](../src/page/Files.tsx#L688) *already computes* `kind = kindOf(viewOf(here, root).module)` and the icon ignores it, sitting hardcoded as `▣`. Kind stays **derived, never stored**. **(V.10)** Give it the fold behaviour the block rows have. **Why it does not work today**: `projectRoot` is a separate render path from `row`, and its icon at [Files.tsx:706](../src/page/Files.tsx#L706) is a plain `<span className="icon">` — no `fold` class, no `onClick`, no `onMouseDown`. The block row at [Files.tsx:644-657](../src/page/Files.tsx#L644-L657) has all three, the `onMouseDown` existing to stop the row's drag swallowing the click. Nothing conceptual blocks it; the handler was never written. **The row click still switches project** — the icon folds, so the two never collide | `page/Files.tsx`, `src/styles.css` | V.2 |
| **V.11** | **Space above the first project**, separating it from the explorer header. U.17 spaced projects from each other and left the top edge tight | `src/styles.css` | ⊘ |


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
