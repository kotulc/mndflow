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

**Everything that has landed is in [landed.md](landed.md)** — waves U, T, Z and V whole, the R
review, and Y's rail and ramp. This file is what is left.

**Startable with nothing in the way:** `Y.6a` (the export's look override), `Y.10` (one panel edge,
one panel label), `W.1` (the tray at full size), `A.7d` (`infer`'s result reachable), `T.5` (the DOM
harness) then `T.3` (the page suite), `Z.9` (trim the rail), `S7` (the `Files.tsx` seam).

**`A.7d` needs its owns widened before it can start.** The row owns `src/actions/behavior.ts` and
`workspace/`, but the admission it describes — *admit the project, select it, let the context
change* — happens where `held` lives, which is `page/App.tsx`, and the hook to notice a foreign
write does not exist on `project.ts` yet. Either widen the owns to those two files or cut the hook
as its own chunk first; do not invent a dead API in `behavior.ts`.

**`Y.7` and `Y.9` landed and were driven** — the style surface is closed: four dials, no colour, no
pixel count, no font. **One name wants a word from Clay**: `components.style.label` (how loudly)
sits beside `components.card.label` (where it sits). Reasoning in tasks.md, *The style surface
closed*.

**One `◐` row is still work.** `U.18` left `tray.full`, and handed it to `W.1`, which owns the size
and the door that reaches it together.

**The three large structural rows are `S7`, `W.1` and `X.1`.** Everything in W waits on `W.1`;
everything in X waits on `X.1`, which waits on `Z.9`.

**`R.9` is what makes the edge menu good.** `R.5`'s expansion left sixteen flat entries on a
relationship — legible only because `ORDER` keeps each action's options together, and worse the
moment a vocabulary grows. `X.2` caps it; `R.9` gives it a home that is not a menu.

**Wave T runs alongside anything.** It owns `tests/` alone, so no T row contends with an
implementation row. `T.3`'s wait is over — wave V is complete, so the header, the explorer and the
chrome have stopped moving.

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


## Found by review — the last one left

The closing review's nine defects and the four rows that followed them are in
[landed.md](landed.md). **One is left**, and it is the only one that was never a defect: the strip
at the foot of the stage still says nothing about what the selection could be.

| | Does | Owns | Waits |
|---|---|---|---|
| **R.9** | **The strip at the foot of the stage becomes *what is selected, and what it could be*.** The selection's **name** plus **the types available to it**, capped to a readable number, picked in one click — and the same list on right-click. **It is not only for relationships and ports**: a block, a group and a note answer the same question, so the strip is universal rather than a relationship special case. This is what makes `R.5`'s expansion usable instead of a menu that grows with the vocabulary. **The slot is Contents' slot**, so it opens once `W.1` moves Contents into the table view | `modules/view/diagram/`, `canvas/Canvas.tsx`, `src/styles.css` | R.5, W.1 |


## Y — what is left of the rail and the ramp

**The rail and the ramp are built and archived.** What is left is the half of the wave that names
the *dials* — what a definition may say about how it looks — plus one panel-edge design.

**The relationship inverted rather than moving.** It was *the definition paints and the theme keeps
off*; it is now **the theme owns the palette and a definition chooses within it** — a hue slot and
an intensity, never a colour. The two are no longer layered with one winning: they answer different
questions, which is the only arrangement where a definition cannot look wrong. design.md's *a theme
is chrome; a style set is content* survives; *a definition's `style` wins over the theme* does not,
and `Y.7` is where it goes.

**This is the design-token model** — Radix Colors' fixed-function steps, Material 3's role-and-tone,
shadcn's semantic variables. Its guarantee is the one wanted here: contrast is a property of the
step, so *ink on fill is readable* holds in every hue and every theme without anybody checking.

**The exported SVG — settled.** A file has no page to read a variable from, so `svg.ts` must inline
concrete values. **The split is the same one the whole wave rests on**: the *slot* is the model's and
travels with the definition; the *resolution* is the viewer's preference, and baking a preference
into a file somebody else opens is what to avoid. So **the export offers the look as a choice**,
defaulting to the theme in use, rather than silently stamping it. Not a new capability — one control
on a door that already exists (`Y.6`).

| | Does | Owns | Waits |
|---|---|---|---|
| **Y.6** | **The ~30 hard-coded greens move onto the ramp.** `.card` body `#111a16`, `.card.grazed`, walls and ports `#3a5c4b`, the reference greys, plus `paint.ts`'s `PLAIN` / `AWAY` and `NodeCard.tsx`. Mechanical once `Y.5` exists; it is a separate row because it touches four files and the ramp has to be settled before anything can be moved onto it. **Landed short (proven)**: `styles.css`, `paint.ts` and `NodeCard.tsx` are on the ramp — card, walls, ports, references — and a card tracks the theme. **Three things came with it that the row did not name.** *(a)* 21 `rgba()` literals were the retro accent, note-amber and muted-grey wearing an alpha, invisible to a hex grep and unthemed; they are `color-mix` on a ramp name now. *(b)* React Flow ships its zoom controls dark-on-white — unnoticed while every theme was dark, a black block the moment the shell turned pale. *(c)* **The surround beyond the frame was a fixed near-black** (`rgba(6,10,8,.72)`), so a pale canvas sat in a dark box; it is `--outside`, taken from each theme's ladder. **`svg.ts` closed it (proven)**: `lookNow()` resolves the page's own ramp through a probe element — the *used* value, so a file carries `oklch(0.42 0.0855 150)` rather than the authored `calc()` another tool would have to do the arithmetic on — and `svgOf` inlines what it is handed. **It is not a second palette**: `styles.css` stays the only source, and a caller with no document still gets `PAPER`, a look that reads on paper. Driven: exporting in retro and again in light gives two files, neither holding a `var()`. **The *override* is `Y.6a`** — one control on the door, and the door is the rail's, which this row does not own | `src/styles.css`, `modules/view/diagram/paint.ts`, `modules/view/diagram/NodeCard.tsx`, `modules/view/diagram/svg.ts`, `page/App.tsx` | Y.5 |
| **Y.6a** | **The export offers the look as a *choice*.** `Y.6` made it follow the theme in use, which is the default the wave settled on; what is left is the override — somebody exporting for a white document wants the pale look whatever the screen is showing. **One control on a door that already exists**: the rail's `project` group, beside `export`, cycling *as shown* / retro / modern / light. **Not a new capability and not a stored preference per project** — it is the tool in hand, like `form` and `angular`, so it lives beside them on the page | `page/Rail.tsx`, `page/App.tsx` | Y.6 |
| **Y.10** | **One design for every panel edge, and one for every panel label.** **The edge**: explorer, terminal and tray each fold, and each does it differently today — `◂`/`▸` on the explorer, a chevron on the tray, its own control on the terminal. They become **one thick edge that lights on hover, carrying an arrow that says which way it folds**. The options column is **not** one of them: it is a fixed width and does not fold. **The label**: the canvas frame writes its name *on* its own border, straddling it with the ground showing through (`.frame-name`) — every panel takes that treatment, so a panel and a frame are visibly the same kind of thing. **Not a resize handle**: drag-to-size means a stored width per panel and a canvas refit on every drag, and that is a different row if it is wanted at all | `page/`, `src/styles.css` | ⊘ |


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
| **W.1** | **The tray expands to the full stage**, finishing U.7's `◐`. Contents is the table view at full size — same component, same listing, same filters and sort; the shipped `table` module's own listing is the duplicate and goes. `tray.full` in `styles.css`, and expand covers Contents rather than sitting beside it **`U.18` handed `tray.full` here**: nothing asks for a full tray today — no control, no state, no class — so the size and the door it is reached by are one piece of work, not a CSS rule somebody can add ahead of it | `modules/view/table/`, `page/Contents.tsx`, `page/App.tsx`, `page/Panel.tsx`, `src/styles.css` | ⊘ |
| **W.1a** | **The tray's three sizes, settled.** **Partial is 25% of the stage** by default — `.tray.open` is `33%` today, and the comment there argues for *a third* on grounds (a fixed height beats one that moves with the row count) that 25% keeps; only the number changes, so the drawing gets more of the stage. **Shut is a bar**, one click away on the tab, which already works. **Full is what the view toggle means**: setting a project to `table` makes the listing the stage, and the tray is that listing at full size rather than a second one under it. **This is the row that removes the duplicate V.19 left visible** — a table filling the stage with a `contents` bar still at its foot, both listing the same layer. Do not add a fourth size or a hidden mode: three, and the toggle and the tab are the only two doors. **Three defects belong to this row, all from driving it**: the size **does not stick** (every reload starts shut, so a working size has to be re-chosen); the partial tray **does not follow the selection** — it lists the layer whatever is picked, which is the whole of what `W.2` promises; and it **shuts on selection**, because `Panel` closes on any click outside itself, so picking the block you wanted to inspect is the gesture that hides its fields | `page/Contents.tsx`, `page/App.tsx`, `page/Panel.tsx`, `src/styles.css` | W.1 |
| **W.2** | **The two sizes take different inputs, and that is what keeps them honest.** **Full — the `table` view on the stage — shows the layer and everything in it, and the selection does not narrow it.** **Partial — the tray at the foot — is the same table scoped to what is in focus**: its name and available types at the head, its contents as rows. Nothing in focus and the partial tray shows the layer, so the two agree and *expand* is genuinely only a size. This is not the hidden state U.8 rejected — the sizes never disagree about one input, they read different ones. **Recommended for the one case that is not a row filter**: a group or a block with children narrows to rows of the same shape, but a note has text and a leaf block has fields, and Contents already carries an opened-row presentation for exactly that (`styles.css`, *A row opened out*) | `page/Contents.tsx`, `modules/view/table/` | W.1 |
| **W.3** | **Vocabulary editing needs no new door — deselecting is the door.** Definitions are not the contents of anything, but **the layer listing already holds the types chip** (E.1), and the layer listing is what the tray shows when nothing is in focus. So: click empty space, the tray un-focuses back to the whole layer, and the vocabulary is one chip away. **The tray sits at the foot in every view**, so this is reachable from a block diagram, a matrix or an activity alike — which is what keeps U.11's deletion of `Relations.tsx` honest. **The same gesture as `V.14`**: empty space deselects, on the canvas and in the explorer both, and it is what unlocks *new project* there and *edit the vocabulary* here | `page/Contents.tsx`, `canvas/Canvas.tsx` | W.2 |
| **W.4** | **Matrix draws a heatmap.** **Hue is the relationship kind and opacity is the count** — transparent at zero, grading up — so both dimensions read at once. **The hue comes from the definition's existing `style`** (`styleOf` / `lookOf`, `styles/sysml.ts`), never a new matrix palette, so the matrix and the diagram cannot disagree and there is no second colour vocabulary to keep. **A cell holding two kinds draws as bands**, one per kind, degrading to a solid cell in the common single-kind case; the strip lists them all on selection | `modules/view/matrix/`, `src/styles.css` | W.1 |

**Watch**: `V.15` takes the relationship type filter off the canvas bar, and a matrix over a busy
vocabulary may want one of its own. A different surface, so not a contradiction — but it should
arrive by decision rather than by the back door.


## Wave 2 — leftovers

| | Does | Owns | Waits |
|---|---|---|---|
| **A.7d** | **`infer`'s result is reachable.** Today it mints a behavior project that is never admitted to `held.projects`, so nothing in the explorer or the canvas shows it and the action's output is a dead end. It should **admit the project to the workspace under a default name, select it, and let the context change** — the layer moves, and the view module then draws it like any other project. **No proxy is placed in the source layer**: a proxy exists to carry a relationship across a boundary, and [behaviors.md](behaviors.md) rejects the back-reference outright — it "would duplicate a fact living in another log and leave a structure project opened alone pointing at behaviors that are not there". Refs point one way, from the behavior at the participants | `src/actions/behavior.ts`, `workspace/` | ⊘ |

## Wave U — what is left of it

**Wave U landed and is in [landed.md](landed.md).** One row survives it: the two `◐` gaps U.7 and
U.14 left, both parked on the same words — *App not owned*. **U's *chrome, not the diagram's visual
language* boundary held through V and is reversed by `Y.5`** — a theme now supplies the diagram's
defaults, while a definition's `style` still wins.

| | Does | Owns | Waits |
|---|---|---|---|
| **U.18 ◐** | **The two `◐` gaps Wave U left in `App.tsx`.** Both were parked on the same words — *App not owned* — and both are a wire rather than a design: **U.7**'s `path` / `onUp` are never passed to table and matrix (so both fall back to deriving the trail from the graph), `tray.full` is missing from `styles.css` (so expand does not cover Contents), and **U.14**'s `App.newProject` still does not call `workspace.begin`. One row because they are one file, and leaving them as two `◐`s means two rows that each wait for the same owner **Landed short (proven)**: `path` / `onUp` reach table and matrix — the crumb reads the trail App already holds instead of re-deriving it — and `newProject` goes through `workspace.begin`, which names, mints, writes the first step and admits in one call rather than App doing all four beside an unwired door. Driven: two projects made, a duplicate name refused, both surviving a reload. **The gap is `tray.full`**: nothing anywhere asks for a full tray — no control, no state, no class — so the rule would be dead CSS. It is `W.1`'s, which owns the size *and* the door it is reached by | `page/App.tsx` | ⊘ |


## Wave T — the suite

The gaps the test review named, as rows. **Owns `tests/` alone**, so no T row ever contends with an
implementation row. Detail in tasks.md, stream **T**.

**The largest gap is startable at last.** `App.tsx`, `Files.tsx` and `Panel.tsx` have no cover and
every browser-found bug lived there. `T.3` waited first on U and then on V for the same reason —
*do not write tests for a design that is still moving* — and **both waves are complete**, so the
header, the explorer and the chrome have stopped moving. `T.5` comes first: there is no DOM
harness to write them against.

| | Does | Owns | Waits |
|---|---|---|---|
| **T.3** | **`App.tsx`, `Files.tsx` and `Panel.tsx` get cover** — ~2,200 lines, no tests, and the place every browser-found bug lived. It waited on U and then on V, both now complete, so the design it would be written against has stopped moving. **Needs `T.5`** — there is nothing to render into | `tests/page/` | T.5 |
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

**No rows left.** Every V row and V.19 are in [landed.md](landed.md); the notes above are kept
because later waves reverse decisions they record.


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
