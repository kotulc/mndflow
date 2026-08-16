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

**Wave V is the priority** — the shell's second pass, from driving the built app. **No `◆` is left
in it**: all five were answered. **`V.2` is the one to take first** — the icon vocabulary most of
the wave draws on. `V.4` and `V.11` depend on nothing and can go in parallel.

**Clay-free elsewhere:** `G.9e`, `A.7d`, `T.5`, `U.18`, `Z.9`, `S7`. **Wave U is complete** — U.16
dropped (*Not in the queue*), `U.18` collects the `◐` gaps U.7 and U.14 left in `App.tsx`.
**Wave Z is built but thin** — `Z.9` trims it to the ranking surface and a fixed expanded pane;
**Z.5, the tutorial, is wanted and deliberately last**, since a tutorial teaches whatever the app
currently is and Wave V is about to change it. **G.9d ◐** — `G.9e` closes it.

**Cheapest first in Wave U:** `U.2` landed (glyph vocabulary). **U.15 landed** (canvas options
word+glyph; vertical interface / relation / flow; arrangements stay on `.shape`, which is where
they belong).
**U.17 landed** (space between projects). **U.3 landed** (explorer width cap / collapse).
**U.1 landed** (header / crumbs / arrange / stage overflow). **U.4 landed** (theme toggle;
chrome only). **U.9 landed** (module icons published). **U.8 landed** (labelled view toggle;
U.9 glyphs; sticky `mndflow.view.v1`). **U.7 ◐** (panel shells + A.1 chrome; expand does not
cover Contents). **U.11 landed** (readout gone; Contents covers relation kinds). **U.12 landed**
(undo/redo words at explorer foot; last-action line). **U.13 landed** (header *new workspace*;
`clearSession` / blank `Held`). **U.14 ◐** (explorer `＋` follows selection; `App.newProject`
still skips `workspace.begin`). **U.5 landed** (rail collapsed / expanded layout). **U.6 landed**
(rail caret at insertion point). **U.16 dropped** — the arrangements were never in the bar to move
out of. **No Wave U row owns `page/Files.tsx` any more**, which is what makes `S7` startable.

**Wave T runs alongside anything.** It owns `tests/` alone, so `T.1` contends with no
implementation row and can fill any sitting. **T.2 landed.** `T.3` waits on Wave U on purpose.

**G.9d** is settled — the target decides — and documentation is answered: `samples/docs.json`,
keyed by the terms in [definitions.md](definitions.md), hand-authored and with no generator.
**No `◆` is left anywhere in the queue.**


## Next

| | Does | Owns | Waits |
|---|---|---|---|
| **F.2** | File System Access: hold a live handle and say when the file changes underneath. Chromium only; the download path stays the fallback — **landed** (proven): live bind via `store.hold` (no picker required in tests); immediate drift via `store.probe`; focus/visibility listeners re-attach when the document is replaced; header `data-where` is `session` \| `drifted` \| `unsaved`; property tests for hold+probe and focus re-check after document swap | `graph/store.ts`, `page/App.tsx`, `project.ts` | ⊘ |


## Wave 2 — leftovers

| | Does | Owns | Waits |
|---|---|---|---|
| **D.2** | `vocabulary` becomes the list of packages a project uses, in import order. The A0.2 seeding bridge (`workflows.ts` → `Domain.relations`, minting local `set_def` copies) is retired with it — **landed** (proven): `Graph.vocabulary` / `set_vocabulary` are `string[]` of package ids in import order; `asVocabulary` heals a legacy stem; fold/file round-trip and door heal; `vocabulary` action and `project.vocabulary` match; entry writes `asVocabulary(template)`; `Domain.relations` + core YAML bridge gone; `stemOf` from graph; Contents offerings follow import order; Scores via `stemOf`. **Left out**: Z prompt rework; Contents split; package authoring UI | `graph/types.ts`, `graph/fold.ts`, `graph/file.ts`, `graph/check.ts`, `actions/layer.ts`, `project.ts`, `terminal/`, `workspace/`, `page/Contents.tsx`, `page/Readout.tsx` | A0.3 |
| **G.9a** | **The offered-action list.** One set of what the selection can do in the current context — **the same list for the menu and the rail; only the presentation differs.** Order is the presenting surface's business, not the list's: the menu takes a **fixed** order, the rail orders by **learned preference for that context** (Z.3). **It may not live in `terminal/`** — the menu would then need the rail, and S6.3's acceptance test (delete `terminal/`, everything still runs) would break. It ranks over the action registry, so it belongs beside it — **landed**: `offer(ctx)` in `actions/offer.ts` returns that membership set (scope + `when`); no ordering of its own. Explorer (G.9b), rail (G.9c) and canvas (G.9d ◐) draw from it; twin `offered()` still on `actions/index.ts`; dedicated `offer` suite waits on callers | `actions/offer.ts` | ⊘ |
| **G.9b** | **Right-click in the explorer** opens that list, in fixed order. The explorer's right button is unbound, so this half needs no gesture decision. **This is `infer`'s trigger**: with the explorer as context and one or more blocks or projects selected, `infer` is one of the offered options — so it needs no gesture of its own, and A.7a stops being unreachable — **landed** (proven): explorer row right-click opens `offer(ctx)` in fixed order via `App` `onAct={project.go}` (`go` exposed); empty-tree create unchanged; rename stays double-click / ✎; minimal `.offer` CSS; `infer` enactable (log write). Left out: rail (G.9c), canvas (G.9d); admitting a new behavior project into `held.projects` after Infer (parked — not visible in explorer) | `page/Files.tsx`, `page/App.tsx`, `project.ts`, `src/styles.css` | G.9a |
| **G.9c** | **Clicking anywhere in the rail** puts the caret in it — type to filter the same list, arrow keys move the highlight, `Enter` takes it, ordered by learned preference. This is Z.1/Z.2 arriving early. **The rail stays optional**: it consumes G.9a's list and owns none of it, so removing `terminal/` costs the menu nothing — **landed** (proven): click chrome focuses caret (`preventDefault`); chips from `offer(ctx)`; arrows move highlight; `Enter` takes via `onAct`; `App` `Chat` `onAct={project.go}`. Embedding rank is Z.1; overrule feedback is Z.2; learned preference is Z.3 | `terminal/`, `page/App.tsx` | G.9a, G.9b |
| **G.9d** | **Right-click on the canvas — settled: the target decides.** Right-click on **empty space keeps creating**, exactly as today; right-click on **something that already exists** (card, frame, edge, selection) opens the list for it. So *the right button makes something new* still holds where there is nothing, and becomes *show me what this can do* where there is something. `card→interface`, `frame→interface`, `edge→retype` and `selection→group` stop being immediate and become entries in the list. **Right *drags* are untouched** — card-to-card still draws a relationship, empty still makes a note — because `gestures.ts` already separates a drag from a click by distance — **◐ (proven)**: empty right-click creates; existing opens fixed-order `offer(ctx)` via `App` `onAct={project.go}` into Canvas; former immediates are list entries; Name/Perch not immediate; `fill_args` leaves optional `into` unset from focused card (multi-select Group creates). **Gap**: edge→retype — Scope is element-only | `canvas/gestures.ts`, `canvas/Canvas.tsx`, `modules/view/diagram/`, `page/App.tsx` | G.9a, G.9b |
| **G.9e** | **`retype` is scoped to `element\|edge`, closing G.9d's gap.** Not a design decision — a descriptor disagreeing with everything around it. [actions.md](actions.md) already scopes `retype` to `element\|edge` and `run` already accepts an edge id; only the descriptor says `element`, which is why `offer(ctx)` never lists it for an edge. Widening one `Scope` is **not** widening the action set — the set of actions is closed, a descriptor's own fields are not | `src/actions/`, `actions.md` | ⊘ |
| **A.7d** | **`infer`'s result is reachable.** Today it mints a behavior project that is never admitted to `held.projects`, so nothing in the explorer or the canvas shows it and the action's output is a dead end. It should **admit the project to the workspace under a default name, select it, and let the context change** — the layer moves, and the view module then draws it like any other project. **No proxy is placed in the source layer**: a proxy exists to carry a relationship across a boundary, and [behaviors.md](behaviors.md) rejects the back-reference outright — it "would duplicate a fact living in another log and leave a structure project opened alone pointing at behaviors that are not there". Refs point one way, from the behavior at the participants | `src/actions/behavior.ts`, `workspace/` | ⊘ |

## Wave U — the shell

**U.1** fixed header / crumbs / arrange / stage collision on a narrow window. **U.3** bounded the
explorer (width cap / collapse). **U.4** landed the theme toggle (chrome only). **U.2** landed
the glyph vocabulary (no mark means two things). **U.15** landed the canvas-options design
language (word+glyph; vertical *interface* / *relation* / *flow*). Reasoning in design.md under
*The shell yields; the stage does not*; the detail in tasks.md, stream **U**.

**U owns chrome, not the diagram's visual language.** A card, a route and a frame stay the
engine's. **U.11 deleted `page/Relations.tsx`** (stream E's file) rather than editing it —
relation kinds stay on Contents (E.1).

**`page/Files.tsx` was the contended file of this wave** — G.9b / U.17 / U.3 / U.12 / U.14 ◐ /
U.2 / **U.8** all reached it; **U.8** was the last Wave U owner. Nothing cut a seam for it; it
grew as those rows landed. **Order held**: `U.2 → U.8` (both landed).

**Two rows reach storage, and storage is where the suite just failed.** **U.13 landed** (clears
keyed slots, workspace list, session pointer, live handle → blank `Held`). U.14 creates a project;
the import-never-stored bug lived in exactly that gate, and 401 tests asserted the wrong behaviour
was right. Both rows want an **outcome** test — *what a project holds survives being saved and
read back* — in `tests/graph/store.test.ts` and `tests/workspace.test.ts`, not another assertion
about the gate's internal rule. U.14's `workspace.begin` outcome cover landed; wiring
`App.newProject` through `begin` did not (App not owned).

| | Does | Owns | Waits |
|---|---|---|---|
| **U.1** | **Header overflow.** Crumbs truncate and the interface / relationship option groups collapse instead of overlapping. The stage keeps its room — **landed** (proven): header identity truncates (tools stay put); session/where ellipsizes; crumbs left half truncate with ellipsis; `.arrange` right half wraps instead of overlapping crumbs; stage `min-width: 0` / overflow clipped | `page/App.tsx`, `src/styles.css` | ⊘ |
| **U.2** | **One glyph vocabulary for the whole app** — header, explorer and canvas, distinguishable at a glance. **The rule is that no mark means two things**: today `·` is *interfaces off*, *all types* and *no axis*; `▦ ▤ ▥` are three near-identical hatched squares; `⊙` and `◌` are the same circle for *radial* and *relax*. The foundation U.15 builds on. Not definition icons, which are stream E's — **landed** (proven): one chrome glyph vocabulary; `·` axis-none only; `⊏` interfaces-off; `∗` all-types; arrangements `▦⊙⇄⇅`; relax `∿`; explorer roles/bar. **Left out**: stream E icons; table/matrix still `·` types (outside owns). Words/groups were U.15 (landed). Module-icon placement was U.8 (landed) | `page/App.tsx`, `page/Files.tsx`, `modules/view/diagram/chrome.tsx`, `src/styles.css` | ⊘ |
| **U.3** | **The explorer bounds itself and holds several projects legibly** — a width cap, collapsible, readable at high zoom — **landed** (proven): width `min(280px, 36vw)`; collapses to a 28px strip (◂/▸) with the tree hidden until reopened; bar title ellipsizes; U.17 sibling spacing and G.9b `.offer` intact | `page/Files.tsx`, `src/styles.css` | G.9b |
| **U.4** | **Theme toggle** — the current theme stays default; **modern (blues)** and **light** join it. Chrome only: root `styles/` is the `style` component's per-definition presentation and is **not** touched — **landed** (proven): header theme group `current` / `modern` / `light` (`current` default); CSS variable palettes on `data-theme`; sticky `mndflow.theme.v1`; chrome washes for shell overlays. Root `styles/`, diagram hardcodes and a `store.ts` theme flag left untouched | `src/styles.css`, `page/App.tsx` | ⊘ |
| **U.5** | **Rail collapsed form** — a minimal text entry with inline chip options, and an expanded layout to match. **Style and layout only**; click-to-focus is G.9c's — **landed** (proven): defaults collapsed (one-line entry, inline chips); expanded is a two-column guidance shell; ▾/▴ toggles. G.9c focus / filter / Enter unchanged | `terminal/`, `src/styles.css` | G.9c |
| **U.6** | **The rail caret sits where the text cursor is.** A rendering bug in the existing rail, not new behaviour — **landed** (proven): empty-line block cursor overlays the input insertion point; native caret hidden while empty; with text, native caret; U.5 collapsed/expanded unchanged | `terminal/`, `src/styles.css` | G.9c |
| **U.7** | **Table and matrix as panel surfaces modelled on Contents** — both open partially, as the panel does now, and expand to the full canvas. **A.1's parked table chrome** (crumbs / types) lands here. Contents itself is the model and is **not** deleted — **◐ (proven)**: Contents-modelled panel shells (~⅓ stage; expand fills stage); A.1 chrome — crumbs + types cycle (definition names on table; relationship marks on matrix); optional `path`/`onUp` with trail/climb from the graph when the page omits them; Contents/Panel untouched. **Gap**: App does not wire `path`/`onUp`; no `tray.full` in `styles.css`; expand does not cover/replace Contents | `modules/view/table/`, `modules/view/matrix/` | ⊘ |
| **U.8** | **The view toggle** — a labelled control beside the project root, listing the three views the project kind offers. **Sticky per project**, so descending keeps it. **Writes nothing**: a display preference, like `showPorts`. The definition's `view.module` says how a layer *opens*; this says what is shown *now* — **landed** (proven): labelled toggle beside project root; three modules per kind with U.9 glyphs; sticky per project in `mndflow.view.v1`; writes nothing; App mounts from sticky pick when it fits, else layer `view.module` | `page/Files.tsx`, `page/App.tsx` | U.3, U.9 |
| **U.9** | **A distinct icon per view module** — the six. Becomes U.8's glyph and is what makes a shrunken explorer readable — **landed**: each of the six publishes a distinct `icon` on `ViewModule` (block ▭, table ☰, matrix ⊞, activity ▸, sequence ⋮, state ◯); re-registers keep it; `.view-icon` sizes/colours it; property tests require non-empty and pairwise distinct. U.8 draws them on the view toggle | `modules/view/`, `src/styles.css` | ⊘ |
| **U.11** | **Remove the readout entirely** — the header's *"Show relations, actions and matching"* toggle and all three tabs: `Readout.tsx`, `Relations.tsx`, `Log.tsx`. **Confirm before deleting**: Contents must already cover relation kinds as definition editing (E.1). Action history returns another way — future work, not this row — **landed** (proven): header toggle gone; three files deleted; readout CSS cleared; Contents types chip add/rename/drop of relation (line) kinds confirmed (E.1); theme and Chat `onAct` intact. **Left out**: action history UI; Scores remount; project relation wrappers | `page/App.tsx`, `page/Readout.tsx`, `page/Relations.tsx`, `page/Log.tsx`, `src/styles.css` | ⊘ |
| **U.12** | **Undo and redo read as text**, at the foot of the explorer, with **one line naming the last executed action**. They leave the header's `↤` / `↦` glyph pair. The foot of the explorer is always visible, so `Log.tsx`'s rule — *reaching them never means opening anything first* — still holds — **landed** (proven): Undo / Redo as words at explorer foot; last-action line; header `↤` / `↦` gone; keyboard shortcuts unchanged; collapsed explorer hides the foot; U.13 new workspace and U.17 spacing intact | `page/Files.tsx`, `page/App.tsx`, `src/styles.css` | U.11 |
| **U.13** | **The header clears the session and starts a new workspace.** Today's `＋` ([App.tsx:511](../src/page/App.tsx#L511)) is `project.reset` — one project, discarded, behind a confirm. It becomes **workspace-scoped**: drop every open project and the workspace with them. `workspace.blank()` already mints the empty `Held`, so the work is clearing the keyed project slots and the session pointer. Bigger and more destructive, so **it reads as a word rather than a glyph** — the same move U.12 makes for undo/redo, and the right one for a rare destructive control. Keeps its confirm — **landed** (proven): header *new workspace* word; confirm kept; `store.clearSession()` drops keyed logs, workspace list, session pointer and live handle; `clearWorkspace` → blank `Held`. **Note**: live FS handle release not exercised in the drive | `page/App.tsx`, `graph/store.ts`, `src/styles.css` | ⊘ |
| **U.14** | **The explorer's `＋` adds a project to the workspace** — a workspace operation the way unlock and fork are (S4.8), not a registry action. **It opens the name prompt, and the project exists once it is named** — design.md, *a project comes into being by being named*. It must **not** mint an id and admit a blank: that is the silently-minted session project that was just removed as a bug, arriving by another door. The name is required and unique, enforced on the way in. **Blocks keep a one-click path**: the `＋` follows the selection the way the canvas right button does (G.9d, *the target decides*) — a project or nothing selected makes a **project**, a block selected makes a **block** under it. The tooltip names which, so the meaning is never hidden. Right-click in the explorer (G.9b) offers both regardless — **◐ (proven)**: explorer `＋` follows selection (project vs block); tooltip names which; project exists once named; `workspace.begin` + outcome test. **Gap**: `App.newProject` still does not call `workspace.begin` (App not owned) | `page/Files.tsx`, `workspace/` | G.9b |
| **U.15** | **The canvas options get one design language**, in **vertical groups** — *interface*, *relation*, *flow*, *arrangement*. Today `Toggles` still mixes three idioms with no rule: three controls carry a glyph **and** a word (`□`/`⊏ interfaces`, `— plain`, `∗ types`), two carry a glyph **only** (`⌐`/`~`, the three axis marks), and states are drawn both as one cycling button **and** as a radio row. **Every control carries a word**, with the glyph as a scanning aid — the direction U.12 and U.13 already take. U.2 gave marks that differ — **landed** (proven): vertical subject groups *interface* / *relation* / *flow*; every control word+glyph; form / draw / types / axis as radio rows. **Left out**: arrangements stay on `.shape` with words (U.16 later dropped — they were never in the bar) | `modules/view/diagram/chrome.tsx`, `src/styles.css` | U.2 |
| **U.18** | **The two `◐` gaps Wave U left in `App.tsx`.** Both were parked on the same words — *App not owned* — and both are a wire rather than a design: **U.7**'s `path` / `onUp` are never passed to table and matrix (so both fall back to deriving the trail from the graph), `tray.full` is missing from `styles.css` (so expand does not cover Contents), and **U.14**'s `App.newProject` still does not call `workspace.begin`. One row because they are one file, and leaving them as two `◐`s means two rows that each wait for the same owner | `page/App.tsx`, `src/styles.css` | ⊘ |
| **U.17** | **Projects are told apart in the explorer** — space between them, so several open projects read as several rather than as one long tree. The cheapest half of what U.3 is for, and it stands alone — **landed** (proven): project roots `className="project"`; sibling projects 10px top margin | `page/Files.tsx`, `src/styles.css` | ⊘ |


## Wave T — the suite

The gaps the test review named, as rows. **Owns `tests/` alone**, so no T row ever contends with an
implementation row. Detail in tasks.md, stream **T**.

**The largest gap sits under the wave about to rewrite it.** `App.tsx`, `Files.tsx` and `Panel.tsx`
have no cover and every browser-found bug lived there — but Wave U rewrites all three, so testing
them first buys a suite that U throws away. That is the reasoning behind T.3's wait, and it is the
project's own rule: *do not write tests for a design that is still moving*.

| | Does | Owns | Waits |
|---|---|---|---|
| **T.1** | **The action modules get a suite.** Five of seven have none — `edges`, `elements`, `fields`, `groups`, `layer`; only `behavior.ts` and the registry are covered. tasks.md already recorded the trigger: **S1 made actions pure `(graph, args) -> Effect`**, which is what makes them worth testing, and S1.6 landed. Properties, not values: an action returns the mutations it claims, refuses through `check` rather than throwing, and writes nothing when it refuses — **landed** (proven; browser skipped): property suites under `tests/actions/` for those five (79 new; actions slice 102 with registry + behavior) — claimed mutation ops on success; refuse through `check` without throw and with no mutations; navigation writes nothing; writing actions report `writes(effect)`. **Left out**: registry and `behavior`/`infer` (already covered); locked-project / sayable / offered registry properties | `tests/actions/` | ⊘ |
| **T.2** | **`page/Contents.tsx` gets its first cover** — the largest file in the tree (1444 lines) with no test at all. **Startable now, unlike the rest of the page**: Wave U models table and matrix *on* it (U.7) but does not rewrite it, so a suite written here survives the wave — **landed** (proven): Node SSR markup in `tests/page/contents.test.ts` (9) — empty layer, listing trays, filter chips, default sort, constraint/rule advice, proxies. **Left**: interactive filter / column sort / row pick / hover lighting and strip `onSay` on selection need a DOM harness; definition editor / field controls / SC.4 depth not in this cover | `tests/page/` | ⊘ |
| **T.3** | **`App.tsx`, `Files.tsx` and `Panel.tsx` get cover** — ~2,200 lines, no tests, and the place every browser-found bug lived. **Waits on Wave U deliberately**: U rewrites the header, the explorer and the chrome, so a suite now would be rewritten with them | `tests/page/` | Wave U |
| **T.4** | **`infer` proved end to end, through its real trigger.** 44 tests render what `infer` produces over hand-built fixtures — they prove the renderers. G.9b gave the explorer call site (proven in browser); one suite walk selection → `infer` → drawn remains — **landed** (proven; browser skipped): property walk Chosen → offer includes infer → `run("infer")` → fold → activity `stageOf` draws; `tests/modules/view/infer.test.ts` (suite 574) | `tests/`, `tests/modules/view/` | G.9b, A.7a |
| **T.5** | **A DOM harness, so page interaction can be tested at all.** There is no jsdom, happy-dom or `@testing-library` in the tree, which is why T.2 stopped at SSR markup and left filter chips, column sort, row pick, hover lighting and strip `onSay` unproven. **`happy-dom` + `@testing-library/react`** — happy-dom because it is vitest-native and nothing here needs jsdom's deeper spec cover (no canvas, no navigation); testing-library because its queries are *role and text*, which is *properties, never values* applied to markup. **It proves itself on T.2's leftovers over `Contents.tsx`** — which Wave U did not rewrite — rather than waiting for T.3. Two dependencies, against *never add a dependency where a few lines will do*: a DOM harness is not a few lines | `tests/`, `package.json`, `vitest.config.ts` | ⊘ |

## Wave 3 — the rail

**Complete, and overshot.** The rail was unfrozen with S6 and is detachable now. G.9c brought
click-focus, arrows and `Enter` over `offer(ctx)`; **Z.1–Z.8 landed** (embedding rank; overrule
feedback; learned preference; expanded guidance; tutorial walk; context gloss; Page Intelligence
titles; ranked doc hit last). **They were built against a spec that changed while they were being
built** — `Z.9` trims it to the ranking surface and a fixed expanded pane, and **`Z.5`, the
tutorial, is wanted but deliberately last**, behind Wave V. See tasks.md, stream Z, and design.md
under *The terminal*.

**The rail is not a command palette.** It is the app's single text entry point over the workspace,
ranking and completing what the context offers and surfacing the documentation that bears on it,
adapting to how one person words things. **It never changes context**: it ranks *against* context,
so the explorer and the pointer still navigate. **As scoped it is wholly client-side.**

| | Does | Owns | Waits |
|---|---|---|---|
| **Z.1** | Collapsed mode: rank what is available in the current context against what is typed — **landed** (proven): collapsed chips rank via embedding similarity; idle keeps fixed `ORDER`; cold-model falls back to substring; Chat warms embeddings; `suggest.ts` deleted. **Left out**: Z.3 learned preference; Scores remount; collapsing duplicated `ORDER` | `terminal/` | S1.7, everything in Wave 2 |
| **Z.2** | Arrow keys move the highlight; `Enter` confirms it; overruling it is the feedback — **landed** (proven): arrows / `Enter` unchanged from G.9c; overruling (arrow+`Enter` or click off the default) records to `mndflow.rail.feedback.v1` with `shape_of(ctx)`; confirming the highlighted default writes nothing. **Left out**: Z.3 learning from that store | `terminal/` | Z.1 |
| **Z.3** | Two-tier learning — the literal entry remembered, the situation's shape weighted. Local, never logged — **landed** (proven): idle chips order by shape-weighted preference from `feedback.read()`; typed keeps embedding/substring lead with shape tie-break and exact prior entry pinned first; local sticky only. Confirming the default still writes nothing | `terminal/` | Z.2 |
| **Z.4** | Expanded mode: the next question worth answering, and nudges — **landed** (proven): expanded shows next question + hint + nudges (`guidance.ts`); root tip uses `blocksOf(null)`; choice chips / typed Enter answer; no-choice shows ranked actions. **Left out**: Z.5 tutorial; Z.6 docs. Collapsed Z.1 / Z.2 / Z.3 untouched | `terminal/` | Z.1 |
| **Z.5** | The tutorial, walked over a sample project — **wanted, and deliberately last.** `samples/tutorial.json` + `walk_for(ctx)` on `proj_mndflow` exist (105 lines) and advance by pick / ancestors / open layer, but **a tutorial teaches whatever the app currently is**, so walking it before the shell settles means rewriting the walk with every Wave V row. **Nothing else waits on it**, which is what makes it safe to hold. Take it up when Wave V and `Z.9` are both done | `terminal/`, `samples/` | Wave V, Z.9 |
| **Z.6** | Surfacing documentation, keyed to context — **landed** (proven): `samples/docs.json` ten terms keyed to [definitions.md](definitions.md); expanded gloss via `doc_for(ctx)` / `shape_of`. Hand-authored, no generator. **Left out at the time**: Collapsed unchanged; ranked-list doc hit (Z.8, now landed); Z.5 tutorial | `terminal/`, `samples/` | Z.4 |
| **Z.7** | **No rename.** `rail` stays the word in the code and throughout the docs; **"Page Intelligence"** is the user-facing label and nothing more. The row costs a string, not a refactor — **landed** (proven): ▾/▴ titles are Expand / Collapse Page Intelligence; identifiers stay `rail` | `page/`, `terminal/` | Z.6 |
| **Z.9** | **Trim Z to what is wanted, and stop there.** Z.1–Z.8 are annotated *landed (proven)* but are **thin against what they claim** — the wave is half-built, and the honest reading is below. It is trimmed rather than finished because **the UI refinements in Wave V come first**. **Keep and finish**: chip order from `rank.ts` (225 lines — embedding lead, learned preference, fixed `ORDER` fallback; this part is real), `feedback.ts` (74) behind it, and **the score on hover, which does not exist anywhere yet** — that is the whole of the ranking surface Clay asked for. **Cut back**: expanded mode becomes **a fixed placeholder prompt set** on the theme of *"What's next?"* plus **the selected action's description**, which takes `guidance.ts` (32 lines, two hardcoded strings) out and stands the expanded pane down off `router.ts` / `workflows.ts` / `turn.ts` — the question loop tasks.md already said would *lose its centre*. **Delete**: `Scores.tsx` (55 lines, unmounted since U.11 and now never remounted — the hover score replaces it). **Collapse `ORDER`**, now duplicated **four** ways — `rank.ts`, `page/Files.tsx`, diagram offer chrome, `terminal/` | `terminal/`, `page/App.tsx` | ⊘ |
| **Z.8** | **One documentation hit in the ranked list, always last.** The list is the offered actions (G.9a) plus at most a single doc result, chosen on the most relevant keyword and never displacing something actionable. **A lookup and a sort, so wholly client-side** — the old "may not be client-side" caveat retires with the natural-language half, which is now recorded under *Out of scope* in tasks.md — **landed** (proven): typed lists append at most one `docs.json` keyword hit, always last (ghost); Enter/click surfaces gloss, no action; idle/answer lists stay actions-only | `terminal/` | Z.1, Z.6 |


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

**Moving the arrangements** (was U.16) — **dropped, on a wrong premise.** The row wanted the verbs
out of the bar to keep design.md's *toolbars divide by states against verbs* true. They were already
out: `.shape` is a floating cluster at the canvas's bottom right, not part of the `.arrange` bar, and
U.15 gave it words. And `arrange` is `scope: { on: "layer" }`, which `inScope` matches in every
context, so the frame's right-click list already offers it. Nothing to move. **The interface stays
the same whatever the layer or project** — no root affordance, no second door, no `◆`.

Recorded in [tasks.md](tasks.md) and deliberately unscheduled: translators and code generation,
local variation on a proxy for multi-user work, the cluster spacing tier, and the README rewrite
that waits for all of this to land.

**A VS Code host** — design.md, *The browser is the product; another host is a shell*. The web app
stays primary; an editor-hosted version is a second host for the same app, for people who would
rather not use a browser. Not scheduled, and no row waits on it.

**Export destinations** — design.md, *Where a project lives, and where it can be sent*. Storage
stays browser-local and client-side; what import/export gains is somewhere to send a file: local
disk (that is F.2) and a cloud drive. No cloud home, no sync, no server. Not scheduled.
