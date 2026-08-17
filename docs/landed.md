# Landed

Optional archive of plan rows that landed whole. Not a queue, and **not updated
during implement sittings** — annotate finished work in [plan.md](plan.md)
instead. Clay may tidy rows into this file later if he wants; agents never do.

**This is a record, not a queue.** Nothing here is waiting on anything. A row
that landed *short* stays in plan.md marked `◐`.

- **What each part does now** → [spec.md](spec.md). **Why** → [design.md](design.md).
- **What is still missing** → [tasks.md](tasks.md).
- **What to do next** → [plan.md](plan.md).


## W0 — the specification gaps

| | Landed |
|---|---|
| **W0** | Undo restores the graph and never the context; storage is keyed per project and lazily, the untouched checkpointed under pressure; packages are a list in import order and never shadow, since references are by id; a package resists editing until unlocked or forked; a proxy owns its appearance and the block owns the thing |


## Schema

| | Landed |
|---|---|
| **SC.1** | Four `Definition` fields (`body`, `size`, `names`, `components`), `refTo`/`refAt` for cross-project paths, `module` demoted to `meta`, schema `1.1`. A 1.0 file still opens, keeps everything, and saves out current. 12 tests |
| **SC.2** | `extends` on a definition and `isa` to walk the chain — one parent, cycle-guarded, a missing parent ends the walk. 5 tests |
| **SC.3** | `resolved()` unions fields and merges `components` per key, cached per fold |
| **SC.4** | Type offers are package-disambiguated when two definitions share a name (proven) |
| **SC.5** | Element forms are four; door heals `figure` → `block`; sample seam is a shaped block; interface-on-figure refusal removed (proven) |
| **SC.6** | All **five** resolvers — `cardOf` / `styleOf` / `rulesOf` / `constraintsOf` / `viewOf` — read `resolved()`; a subtype draws the parent's diamond and inherits its view. *`viewOf` was missed on the first pass and caught later by the conformance suite* |


## S1 — the action registry

| | Landed |
|---|---|
| **S1.1** | Types, registry, dispatcher in `actions/index.ts`. Scope decides what is shown, `check` what happens on commit, `sayable` falls out of the argument types, `writes` gates the step. 12 tests |
| **S1.2** | `actions/elements.ts` — create/delete/rename/retype/describe/move/refer, and open/up/reveal |
| **S1.3** | `actions/edges.ts` — interface/mark/relate/unlink/flip/direct/reform |
| **S1.4** | `actions/groups.ts` + `actions/fields.ts` — the 5 group-and-note and 4 field-and-definition actions |
| **S1.5** | `actions/layer.ts` — axis/arrange/relax/vocabulary and the four adjustments place/size/seat/wall |
| **S1.6** | `act.*` wrappers generated from the registry; side-effect imports of `actions/*`; the 5 queries off `act`; aliases for old names; gestures work through the registry. 52 entries in `act` became 29 actions, 4 adjustments, 5 page actions and 5 queries |
| **S1.7** | Canvas Ask create/rename clash Enter speaks on the strip via `onSay` and holds the field (proven) |


## S2 — the component surface

| | Landed |
|---|---|
| **S2.1** | `useGestures(reach, stage)` — 867 lines out of a 2041-line `Canvas.tsx`. Hit testing, both buttons, the keyboard and the drag snap; it reaches actions and writes no mutation. Verified in a browser |
| **S2.2** | The component contract: `publish` registers each component's validator with the door, which drops only a key its component refuses and reports the reason. An unclaimed key is unvalidated, never wrong. 6 tests |
| **S2.3** | The **card** component — six layouts, five shapes, three label placements and `shows`, refused from data and closed to it. `PLAIN` is today's card as one configuration; `cardOf` resolves a usage. 13 tests |
| **S2.4** | The **style** component — `{set}`, `styleOf` / `lookOf`, `styles/sysml.ts`, published in `modules/base.ts` |
| **S2.5** | The **view** component and the module registry — six modules registered (`block`, `table`, `matrix`, `activity`, `sequence`, `state`) |
| **S2.6 surface** | Frame, crumbs and prompts live under `modules/view/diagram/` (proven). `Canvas.tsx` still hosts |
| **S2.6b** | The diagram draws from the components — PLAIN configuration and shape stroke read from `card` / `lookOf` (proven) |
| **S2.6c** | `compose` extracted out of the diagram module (suite) |
| **S2.7** | Gesture map declared for the diagram; a diagram declares the adjustments it takes (suite) |


## S3 — fold hygiene

| | Landed |
|---|---|
| **S3.1** | All **22** retired ops deleted, with the `Legacy` union, the `Pending` plumbing and the door's entries. `fold.ts` 872 → 680. Shape healing kept; the pre-checkpoint *log* format is gone |
| **S3.2** | `apply()` dispatches to `applyElement` / `Edge` / `Group` / `Field` / `Def`; behaviour preserved |
| **S3.3** | Children indexed once per fold; `childrenOf` / `blocksOf` / `portsOf` use it |


## S4 — the workspace

| | Landed |
|---|---|
| **S4.1** | `loadProject`/`saveProject` one key per id; `loadWorkspace`/`saveWorkspace`; legacy `mndflow.steps.v1` migrates once |
| **S4.2** | `useProject(projectId)` — keyed load/save; switch clears the view; import adopts the file's id |
| **S4.3** | Proxy `of` widened to `{ project, element }`; `tidy` keeps a missing target as "missing block" rather than deleting the proxy |
| **S4.4** | The workspace as a project — `Held` + `admit` / `folder` / `resolve` / self-guard on `mndflow.workspace.v1` |
| **S4.5** | Explorer shows both roots; click switches context (proven) |
| **S4.6** | Workspace `⤓` and project `↧` export/import at schema `1.2` (proven) |
| **S4.7** | Pristine makes no key; first change writes; pressure strip via `watchPressure` (suite/API + wire) |
| **S4.8** | Locked packages refuse a change with the reason; the strip offers unlock / fork. Seeded lock proven in a browser |
| **S4.9** | `Effect.into` + `workspace.writeInto` + `home` — a write into another project's log through the door, undoable there |

## S6 — the rail comes out

| | Landed |
|---|---|
| **S6.1** | `project.ts` free of the terminal; question loop registers via `looping()` (detach only) |
| **S6.2** | Domain terms under `packages/terms/`; `Files.tsx` no longer imports the rail (detach only) |
| **S6.3** | Page mounts Chat/Scores via optional `import.meta.glob`; build without `terminal/` still runs; Chat + Scores proven |


## S5 — constraints and rules

| | Landed |
|---|---|
| **S5.1** | The **constraints** component — `required`, `constraintsOf`, published in `modules/base.ts` |
| **S5.2** | The **rules** component — `ends` / `holds` / `degree` / `match`, with `among` via `isa`; published in `modules/base.ts` |
| **S5.3** | Reporting — the five note in the tray (what + tip) and speak full sentences in the strip on select; edits never gated |
| **S5.4** | A module's `validate` hook — optional `Module.validate`, registered by `publish`; `findings(graph, id)` collects advise-only words. No module ships a real hook yet |
| **S5.5** | `figure` takes no interfaces — **superseded by SC.5**: the form is retired, so the refusal comes out of `actions/edges.ts` and becomes a `degree` constraint on a definition |


## A0 — packages and styles

| | Landed |
|---|---|
| **A0.1** | `packages/` and `styles/` at the root, with purpose READMEs only |
| **A0.2** | `packages/core/<domain>.yaml` holds the relation definitions; workflows YAML no longer carries them. *The seeding bridge (`workflows.ts` → `Domain.relations`) is still open and needs Clay* |
| **A0.3** | Shipped YAML under `packages/` loads as `Pack` graphs under stable `pkg_*` ids; defs addressed by path (`defOf` / `scoped`), never copied into a consumer's `defs` |
| **A0.4** | Preset registry — `ship` / `presets` / `preset` in `modules/index.ts`. No concrete presets shipped yet |


## The relationship forms

| | Landed |
|---|---|
| **RF.1** | Relation forms reduced to `line` \| `directed`; `reference` and `tie` derived; `assoc` retired to a definition. Healed at the door, verified in a browser |
| **RF.2** | `Element.color` removed — nothing read it, and it was written back into every file forever |


## C — geometry

| | Landed |
|---|---|
| **C.1** | Clusters, ring and chain only — exact ring → circle, chain → series; other shapes fall through to the layer arrangement; hand-laid sticks under free fill. Proven in browser |
| **C.2** | Notes as layout units via `withNotes`; ties excluded from structural joins; tied notes seat under holders |
| **C.3** | Directed edges bias rank, placement and routing. Port `in`/`out` unread; resting unplaced neighbour not driven |
| **C.4** | Router cost — measured ~15.5s before on an 80-box long-span harness, ~72ms after. Two-phase seats-first + shared visibility, Dijkstra only when every pair needs a skirt. Browser resize stayed interactive (~75–164ms) |
| **C.5** | Cluster layout property tests (suite) |


## E — definitions and fields

| | Landed |
|---|---|
| **E.1** | Types chip + editing definitions in the contents tray — fields, defaults, presentation (proven) |
| **E.2** | A control per field form — number with unit, choice with list, ref with picker, on usage and definition fields (proven) |
| **E.3** | Tags shown and editable — add/drop on usage and definition fields (proven) |
| **E.4** | Explorer Shift/Meta multi-select across projects; `Chosen[]` in App; Esc clears (proven) |


## A — views and packages

| | Landed |
|---|---|
| **A.1** | The **table** view module — mounts when `view.module` is `table`; rows pick/open; proxy open withheld (proven) |
| **A.2** | The **matrix** view module — two axes, relationships in the cells, no adjustments. App mounts it when `view.module` is `matrix` (suite) |
| **A.3** | **requirements** package — requirement block (`id` / `text`, card `shows`) and satisfy/verify/refine/derive/trace. Data only, and the proof a package needs no code |
| **A.4** | **parametrics** package — a constraint definition with a size and a style. Data only |
| **A.5** | **flow** package — control flow, object flow (`item` ref), transition (trigger/guard/effect). Data only; formal `names` landed with A.11 |
| **A.6** | *Engine capability* — `shaped()` + `outline()` on card, a shape drawn inside a card. Nothing stored |
| **A.10** | `packages/behavior` — `action` + `state` defs and words (`do`) for activity / sequence / state |
| **A.7c** | `ViewModule` `word` / `creates`; `ViewConfig` `N` default 5 |
| **A.7a** | `infer` + `Effect.home` — selection → one behavior block; tier-1 write-home via `home`/`writeInto` (suite) |
| **A.7b** | **activity** view — App mounts when `view.module===activity`; lanes from refs; DIM on derived labels/order (proven) |
| **A.8** | **state** view — App mount; empty infer offer; Reading A/B; DIM (proven) |
| **A.9** | **sequence** view — App mount; columns; directed then axis order; DIM (proven) |
| **A.11** | `packages/sysml`, `uml`, `uaf` + ornaments as shape/size; formal `names` on behavior/flow/requirements/parametrics; catalog load proven |


## G — canvas polish

| | Landed |
|---|---|
| **G.1** | Filter relationships by type — toolbar cycles types; filtered edges don't draw; seats cleared. *Persistence in localStorage parked* |
| **G.2** | `relax` — ◌ click wires `onRelax` |
| **G.3** | `size` — note SE resize emits `size` (proven) |
| **G.4** | `dissolve` registered and S1.6-ready (`delete_element` on the group; members stay). *No UI reaches it — that waits G.9* |
| **G.5** | `Ctrl`/`Cmd` + `A` selects all cards; Esc clears an RF multi-select via `changeNodes`; Fit and Group still work |
| **G.6** | Panel `+ group` joins the selection into an existing group (proven) |
| **G.7** | Marquee: both ends inside selects the edge; one end does not (proven) |
| **G.8** | A favicon — the header's `▚` inline as an SVG data URI, so nothing is fetched |


## G.9 — the offered-action list

One set of what the selection can do, presented two ways: the menu in **fixed** order, the rail by
learned preference. The list lives in `actions/`, never in `terminal/`, so S6.3 still holds.

| | Landed |
|---|---|
| **G.9a** | `offer(ctx)` in `actions/offer.ts` — membership for the current context (scope + `when`), no ordering of its own. Explorer, rail and canvas all draw from it |
| **G.9b** | Explorer row right-click opens the list in fixed order via `project.go`; rename stays double-click / ✎. **This is `infer`'s trigger**, so A.7a stopped being unreachable (proven) |
| **G.9c** | Click the rail chrome to focus the caret; chips from `offer(ctx)`, typed filter, arrows move the highlight, `Enter` takes it (proven) |
| **G.9d** | **The target decides**: empty canvas right-click still creates, an existing card / frame / edge / selection opens the list. Former immediates became entries; right *drags* untouched (proven). *Landed short — `retype` on an edge waits on Scope; that gap is now its own row, `G.9e`* |


## U — the shell

Wave U made the shell coherent: it yields under pressure, has one glyph vocabulary, and reads in
words where a control is rare or destructive. **U owns chrome, not the diagram's visual language.**

| | Landed |
|---|---|
| **U.1** | Header overflow — identity truncates, crumbs ellipsize, `.arrange` wraps instead of overlapping, stage keeps its room (proven) |
| **U.2** | One glyph vocabulary across header, explorer and canvas — **no mark means two things**. `·` axis-none only, `⊏` interfaces-off, `∗` all-types, arrangements `▦⊙⇄⇅`, relax `∿` (proven) |
| **U.3** | The explorer bounds itself — width `min(280px, 36vw)`, collapses to a 28px strip (proven) |
| **U.4** | Theme toggle — `current` / `modern` / `light`, CSS variable palettes on `data-theme`, sticky. Chrome only; root `styles/` untouched (proven) |
| **U.5** | Rail collapsed form — one-line entry with inline chips; expanded is a two-column shell (proven) |
| **U.6** | The rail caret sits at the insertion point; native caret hidden while empty (proven) |
| **U.7** | Table and matrix as Contents-modelled panel shells, with A.1's crumbs + types chrome (proven). *Landed short — App never wires `path`/`onUp` and there is no `tray.full`; that gap is now `U.18`* |
| **U.8** | The view toggle — a labelled control beside the project root, three modules per kind, sticky per project. **Writes nothing** (proven) |
| **U.9** | A distinct icon per view module — block ▭, table ☰, matrix ⊞, activity ▸, sequence ⋮, state ◯; property tests hold them non-empty and pairwise distinct |
| **U.11** | The readout removed whole — header toggle and `Readout` / `Relations` / `Log` deleted. Confirmed first that Contents already covers relation kinds (proven) |
| **U.12** | Undo and redo as **words** at the foot of the explorer, with the last executed action named on one line (proven) |
| **U.13** | The header clears the session and starts a new workspace — `clearSession` drops keyed logs, the workspace list, the session pointer and the live handle. Reads as a word, keeps its confirm (proven) |
| **U.14** | The explorer `＋` follows the selection — a project or nothing makes a project, a block makes a block under it; the tooltip names which. A project exists once it is named (proven). *Landed short — `App.newProject` never calls `workspace.begin`; that gap is now `U.18`* |
| **U.15** | The canvas options in one design language — vertical subject groups, every control word+glyph, radio rows (proven) |
| **U.17** | Projects told apart in the explorer — sibling roots spaced (proven) |

**U.16 was dropped, not built** — the arrangements were never in the bar to move out of. See
plan.md, *Not in the queue*.


## T — the suite

| | Landed |
|---|---|
| **T.1** | Property suites for the five uncovered action modules — `edges`, `elements`, `fields`, `groups`, `layer`. Claimed mutations on success; refusal through `check` without throwing and with nothing written |
| **T.2** | `page/Contents.tsx`'s first cover — Node SSR markup over empty layers, trays, filter chips, sort, advice and proxies. *Interaction still needs a DOM harness — that is `T.5`* |
| **T.4** | `infer` walked end to end through its real trigger — Chosen → offer → `run("infer")` → fold → activity draws |


## Z — the rail

Built as Z.1–Z.8. **`Z.9` trims the wave** to the ranking surface and a fixed expanded pane; what
survives is recorded there rather than here.

| | Landed |
|---|---|
| **Z.1** | Collapsed chips rank by embedding similarity when typed; idle keeps a fixed order; cold model falls back to substring. `suggest.ts` deleted |
| **Z.2** | Arrows move the highlight and `Enter` confirms; **overruling is the feedback**, recorded locally with the situation's shape. Confirming the default writes nothing |
| **Z.3** | Two-tier learning — idle chips order by shape-weighted preference, typed keeps the embedding lead with a shape tie-break. Local, never logged |
| **Z.4** | Expanded mode — next question, hint and nudges. *`Z.9` cuts this back to a fixed prompt set plus the selected action's description* |
| **Z.5** | The tutorial walked over a sample — `samples/tutorial.json` + `walk_for(ctx)`, advancing by pick / ancestors / open layer. *Wanted; re-walk after Wave V, since a tutorial teaches whatever the app currently is* |
| **Z.6** | Documentation keyed to context — `samples/docs.json`, ten terms keyed to definitions.md, hand-authored with no generator |
| **Z.7** | **No rename** — `rail` stays the word in the code and the docs; *Page Intelligence* is user-facing copy only |
| **Z.8** | One documentation hit in the ranked list, always last, never displacing something actionable |


## R — what the closing review found

Nine defects over the three-wave pass. The offered-action list's argument-filling
layer held most of them, and the fix was one module rather than three patches.

| | Landed |
|---|---|
| **R.1** | `fill` / `fillable` on two rules — an element argument takes an **unclaimed** candidate, and one carrying a `form` takes a candidate of that form. A tie can no longer be offered against itself (it wrote a self-loop the door accepted); *Leave group* works instead of refusing "Not a group."; `holder` went optional on `field` / `unfield` so both stop prompting for a raw id (proven) |
| **R.2** | One home for `ORDER` / `rank` / `fill` / `fillable` — `src/actions/fill.ts`. The three copies had already drifted, which is how one mistake became three bugs; each surface now keeps only what it alone knows, as a `seed`. Dead twin `offered()` deleted |
| **R.3** | A new project comes into being importing `packages/core/freeform`, so its type picker is not blank. **The first fix was wrong and a property test caught it** — `core/` has no `definitions.yaml`, so each file there is keyed by its own stem and `pkg_core` does not exist (proven) |
| **R.4** | A prompted rename is checked against the element's own siblings rather than the root layer; `test-ci.mjs` spawns `detached` off Windows so its kill reaches the process group |

**A second review of the sitting found five more, all fixed here**: the terminal
stole Left and Right from the caret; a prompt for something that is not a name
(a note's text, a package list) was clash-checked against the layer and silently
discarded; `vocabulary` read a typed `"sysml, uml"` as **one** bogus id and wiped
the project's imports; and `move` offered from a menu filled its parent from the
view, committing a step that moved a thing to where it already was.


## V — the shell, second pass

| | Landed |
|---|---|
| **V.2** | **One icon vocabulary** — `src/modules/icons/`, a 24-unit grid, 1.5 stroke, `currentColor`, and names that are **purposes rather than shapes** (`fold_all`, never `minus_box`), which is what stops two meanings sharing a drawing. Every surface draws from it and no Unicode mark is left in the chrome. `ViewModule.icon` is a name **into** the set, so U.9's conformance test holds unchanged. *It broke its own rule while being written — `plain` and `none` came out as one dash, in adjacent groups — so a property test now holds that no two names draw one path* (proven) |
| **V.4** | Relationship lines highlight on hover. **The rule was there all along and was being overridden**: `compose.ts` set `stroke` inline, which outranks every selector. The colour goes through an `--edge-stroke` property now, and the dead `.leg-grab` / `.leg-mark` rules came out with it (proven) |
| **V.11** | Room above the first project, so the tree clears the explorer bar (proven) |
| **V.15** | The relationship type filter is gone — the whole row, and with it the `shown` state, `kinds`, the `shows` predicate and `clipped`. Every edge draws. Landed with V.2, since `∗ types` was the last Unicode mark and converting a control about to be deleted is waste (proven) |
| **V.1** | **The theme toggle is three icon positions** — light, modern (dark), retro (green on black), in Nextra's order with retro **default**. Recorded plainly: retro sits in the slot a *system* toggle would hold but does **not** read `prefers-color-scheme`; following the OS would need a fourth state and three concrete looks was what was wanted. `current` → `retro` migrates, so a stored preference cannot land themeless (proven) |
| **V.3** | **`new workspace` is a mark** — a discard glyph, **not a refresh**, which reads as *reload what is here* and would be the opposite of dropping every project. It keeps its confirm and takes a warning colour, which is what U.13's word was carrying (proven) |
| **V.5** | **The view toggle is icon-only**, with U.9's marks and tooltips as the only remaining signal. It clipped `matrix` against the explorer's width cap before; it fits now (proven) |
| **V.9 + V.10** | **The project root icon says the kind and folds the project** — one span, because `kindOf` was already derived a line above it and ignored. A structure and a behavior project draw differently; clicking the icon folds; **the row click still switches project**, so the two never collide; `⊟`/`⊡` reaches roots too. Projects are open by default — the opposite polarity to a branch, since one that hid its tree on sight would read as empty (proven) |


## D, F, H and the build

| | Landed |
|---|---|
| **D.1** | `terms` split out of the workflow YAML into `workflows/terms/*.yaml`; `workflows.ts` merges them — **superseded home**: terms now live under `packages/terms/` (S6.2) |
| **D.2** | `vocabulary` is the list of packages a project imports, in order — `string[]`, a legacy stem healed at the door, and the A0.2 seeding bridge retired with it (proven) |
| **F.1** | Filename follows the project's name — **already built**; `store.download` derives it from the title. tasks.md was stale |
| **F.2** | File System Access — a live handle via `store.hold`, drift via `store.probe`, listeners re-attaching when the document is replaced; header `data-where` is `session` \| `drifted` \| `unsaved`. Download stays the fallback (proven) |
| **F.3** | Project export downloads an SVG of the open layer beside the JSON via `svgOf` (proven) |
| **H.1** | `samples/mndflow.json` — describes this app, exercises the forms; import drew Graph/Canvas |
| **H.2** | `samples/REVIEW.md` — a line-by-line read of a real export. *Three parks came out of it, in tasks.md under H* |
| **CI** | `tsc` and `vitest` on push, `.github/workflows/check.yml`. LFS skipped: the model is needed to run the app, not to check it |
