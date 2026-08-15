# Plan

The queue. One row is one chunk of work — small enough to land in a sitting, with the files it
owns so two owners never collide.

- **Why any of it** → [design.md](design.md), and *The words* for the vocabulary used here.
- **What each part does** → [spec.md](spec.md). **The action surface** → [actions.md](actions.md).
- **What is missing and undecided** → [tasks.md](tasks.md).

`⊘` marks a chunk nothing blocks. Everything else names what it waits on.
`◆` marks one that **needs a decision before any code** — take it to the user first.

**A row is done when** the suite and `tsc` pass, the app has been driven in a browser
(`.claude/skills/run/SKILL.md`), spec.md and tasks.md say what is now true, and the row is struck
through with one line on what actually landed. See [CLAUDE.md](../CLAUDE.md).


## Done

| | |
|---|---|
| **W0** | The specification gaps. Undo restores the graph and never the context; storage is keyed per project and lazily, the untouched checkpointed under pressure; packages are a list in import order and never shadow, since references are by id; a package resists editing until unlocked or forked; a proxy owns its appearance and the block owns the thing |
| **SC.1** | Schema `1.1`: `body`, `size`, `names`, `components` on a definition; cross-project references as a **path**; `module` demoted to `meta`. A 1.0 file still opens, keeps everything, and saves out current |
| **SC.3** | `resolved()` — fields union, `components` merge per key, cached per fold. Resolvers still read the leaf alone |
| **S1.1** | The action registry — types, scope, `check`, `sayable`, `writes` |
| **S1.6** | `act.*` wrappers from the registry; side-effect imports; queries off `act`; aliases for old names; gestures through the registry |
| **S3.1** | All **22** retired ops deleted, with the `Legacy` union and the door's entries. `fold.ts` 872 → 680 |
| **S4.2 · S4.3 · S4.7 · S4.8** | `useProject(projectId)`; proxy `of` as `{ project, element }` with tidy keeping missing targets; lazy keys + pressure API (strip wire still open); locked packages refuse writes and offer unlock / fork (seeded lock proven) |
| **S5.2** | Rules component — `ends` / `holds` / `degree` / `match`; `among` via `isa`; published in `base` |
| **S4.5 · S4.6** | Explorer lists both roots and click-switches context; workspace `⤓` + project `↧` export/import at schema `1.2` |
| **A.1 · A.2** | Table and matrix view modules; App mounts them when `view.module` is `table` / `matrix` (suite) |
| **S2.6 surface · S2.6b · S2.6c · S2.7** | Diagram projection surface (frame/crumbs/prompts); PLAIN + shape stroke from `card`/`lookOf`; `compose` extracted; gesture map declared |
| **A0.4** | Preset registry (`ship` / `presets` / `preset`); no concrete presets yet |
| **RF.1** | Relation forms reduced to `line` \| `directed`; `reference` and `tie` derived; `assoc` retired to a definition. Healed at the door, verified in a browser |
| **RF.2** | `Element.color` removed — nothing read it, and it was written back into every file forever |
| **F.2** | Chromium FS Access present; download fallback when the picker fails. Live bind+drift not proven under automation |
| **F.3** *(partial)* | `svgOf` renderer landed; download / export wire beside the source still open |
| **H.2** | `samples/REVIEW.md` — line-by-line read of the sample export |
| **G.8 · F.1 · CI** | Favicon; the filename already followed the project name; `tsc` and `vitest` on push |

## Wave 1 — the seams

**S1, S2, S3, S5 and A0 touch disjoint files and run in parallel** — S5 waits on S2.2 and A0
on nothing.

**S4 is the exception, and matters if two owners run at once.** Three files are wanted by rows that
are startable at the same moment, so take them in this order rather than together:

| File | Contended by | Order |
|---|---|---|
| `graph/fold.ts` | S3.2, S3.3, S4.3, SC.3 | S3.2 → S3.3 first; S4.3 and SC.3 build on the split — S4.3 and SC.3 done |
| `graph/store.ts` | S4.1, S4.7, F.2 | S4.1 first — it splits graph storage from workspace storage, after which they are disjoint — all three done |
| `canvas/gestures.ts` | S2.7, G.5 | G.5 done; G.7 fix moved to `Canvas.tsx` |

### S3 — fold hygiene

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**S3.1**~~ | ~~Delete the retired ops~~ — **done**: all **22**, the `Legacy` union, the `Pending` plumbing and the door's entries. `fold.ts` 872 → 680 lines. Shape healing kept; the pre-checkpoint *log* format is gone | `graph/fold.ts`, `graph/check.ts`, `graph/types.ts` | — |
| ~~**S3.2**~~ | ~~Split `apply()` by family~~ — **done**: `apply()` dispatches to `applyElement` / `Edge` / `Group` / `Field` / `Def`; behaviour preserved | `graph/fold.ts` | S3.1 |
| ~~**S3.3**~~ | ~~Build the index once per fold~~ — **done**: children index once per fold; `childrenOf` / `blocksOf` / `portsOf` use it | `graph/fold.ts` | S3.2 |

### S1 — the action registry

Build against [actions.md](actions.md), not against `project.ts`.

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**S1.1**~~ | ~~Types, registry, dispatcher~~ — **done**, `actions/index.ts`. Scope decides what is shown, `check` what happens on commit, `sayable` falls out of the argument types, `writes` gates the step. 12 tests | `actions/index.ts` | — |
| ~~**S1.2**~~ | ~~Port the 8 element actions and the 3 navigation ones~~ — **done**: `actions/elements.ts` registers create/delete/rename/retype/describe/move/refer and open/up/reveal. **Not live in the UI** — side-effect import waits S1.6; `project.ts` still drives | `actions/elements.ts` | S1.1 |
| ~~**S1.3**~~ | ~~Port the 2 interface and 5 relationship actions~~ — **done**: `actions/edges.ts` registers interface/mark/relate/unlink/flip/direct/reform. **Not wired** until S1.6 | `actions/edges.ts` | S1.1 |
| ~~**S1.4**~~ | ~~Port the 5 group-and-note and 4 field-and-definition actions~~ — **done**: `actions/groups.ts` + `fields.ts`. dissolve/join still unwired in the UI (G.4/G.6). **Not wired** until S1.6 | `actions/groups.ts`, `actions/fields.ts` | S1.1 |
| ~~**S1.5**~~ | ~~Port the 4 layer actions and the 4 adjustments~~ — **done**: `actions/layer.ts` registers axis/arrange/relax/vocabulary and place/size/seat/wall. Canvas wire for relax/size is G.2/G.3. **Not wired** until S1.6 | `actions/layer.ts` | S1.1 |
| ~~**S1.6**~~ | ~~Generate the `act.*` wrappers, move the 5 queries off the surface, delete the old closures~~ — **done**: wrappers from the registry; side-effect imports of `actions/*`; queries off `act`; aliases for old names; gestures work through the registry | `project.ts` | S1.2–5 |
| ~~**S1.7**~~ | ~~`check` on every action that can refuse, wired to the strip~~ — **partial**: `NameField` taken-name marks the field and says so in the strip (proven). **Parked**: canvas prompt clash still silent | `actions/*` | S1.6 |

### S2 — the component surface

The base diagram is hard-wired into `Canvas.tsx`. **The test this seam is measured against**: if the
default cannot be expressed as one configuration among others, the component boundaries are in the
wrong place.

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**S2.1**~~ | ~~Extract gesture handling out of `Canvas.tsx`~~ — **done**: `useGestures(reach, stage)`, 867 lines out of a 2041-line file. Hit testing, both buttons, the keyboard and the drag snap; it reaches actions and writes no mutation. Verified in a browser | `canvas/gestures.ts` | — |
| ~~**S2.2**~~ | ~~The component contract~~ — **done**: `publish` registers each component's validator with the door, which drops only a key its component refuses and reports the reason. An unclaimed key is unvalidated, never wrong. 6 tests | `modules/index.ts`, `graph/check.ts` | — |
| ~~**S2.3**~~ | ~~The **card** component~~ — **done**: the six layouts, five shapes, three label placements and `shows`, refused from data and closed to it. `PLAIN` is today's card written down as one configuration; `cardOf` resolves a usage. Published by `modules/base.ts` at startup, so the door refuses `card.shape: trapezium` in the component's own words. 13 tests. Drawing from it is S2.6b | `modules/card/`, `modules/base.ts`, `main.tsx` | — |
| ~~**S2.4**~~ | ~~The **style** component~~ — **done**: `{set}`; `styleOf` / `lookOf`; `styles/sysml.ts`; published in `modules/base.ts`. Drawing from it is S2.6b | `modules/style/`, `styles/`, `modules/base.ts` | S2.2, A0.1 |
| ~~**S2.5**~~ | ~~The **view** component and the view-module registry~~ — **done**: six modules registered (`block`, `table`, `matrix`, `activity`, `sequence`, `state`); published in `modules/base.ts`. The block diagram surface is S2.6; other modules are A.7–A.9 | `modules/view/`, `modules/base.ts` | S2.2 |
| ~~**S2.6**~~ | ~~Move today's canvas in as the **`block` view module**~~ — **surface done**: frame, crumbs and prompts live under `modules/view/diagram/` (proven). Configured half and compose are the follow-ons below; `Canvas.tsx` still hosts | `modules/view/diagram/` | S2.5, S2.3 |
| ~~**S2.6b**~~ | ~~Draw from `card` / `lookOf`~~ — **done**: PLAIN configuration and shape stroke read from the components (proven) | `modules/view/diagram/` | S2.6 |
| ~~**S2.6c**~~ | ~~Extract composition~~ — **done**: `compose` out of the diagram module (suite) | `modules/view/diagram/` | S2.6 |
| ~~**S2.7**~~ | ~~Wire the gesture map from actions.md's inventory; a diagram declares the adjustments it takes~~ — **done**: gesture map declared for the diagram (suite) | `modules/view/diagram/`, `canvas/gestures.ts` | S2.6, S1.6 |

### S5 — constraints and rules

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**S5.1**~~ | ~~The **constraints** component — `required`~~ — **done**: `required`, `constraintsOf`, published in `modules/base.ts`. Rules, reporting and value-missing eval are later rows | `modules/constraints/`, `modules/base.ts` | S2.2 |
| ~~**S5.2**~~ | ~~The **rules** component — `ends` (with port direction), `holds`, `degree`, `match`. Each reaches every subtype, via `isa`. Publish it in `modules/base.ts`~~ — **done**: `ends` / `holds` / `degree` / `match`; `among` via `isa`; published in `modules/base.ts`. Reporting is S5.3 | `modules/rules/`, `modules/base.ts` | S2.2, SC.2 |
| ~~**S5.3**~~ | ~~Reporting: violations advise in the tray and the strip, and **never refuse**~~ — **done**: `required` / `ends` / `holds` / `degree` / `match` note in the tray (what + tip) and full sentences in the strip on select; edits never gated. Module `findings` not wired here — that is S5.4's hook, Contents still constraint/rule only | `page/Contents.tsx` | S5.2 |
| ~~**S5.4**~~ | ~~A module's `validate` hook — the escape hatch for what the five cannot say~~ — **done**: optional `Module.validate`; `publish` registers it; `findings(graph, id)` collects advise-only words. No module ships a real hook yet; Contents does not call `findings` | `modules/index.ts` | S5.2 |
| ~~**S5.5**~~ | ~~**`figure` takes no interfaces**~~ — **done**: `interface` refuses on a figure with the reason (`actions/edges.ts`). First rule the engine enforces rather than advises | `actions/edges.ts` | S1.7 |

### Schema

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**SC.2**~~ | ~~`extends` on a definition, and `isa` to walk the chain~~ — **done**: one parent, cycle-guarded, a missing parent ends the walk. 5 tests | `graph/types.ts`, `graph/fold.ts` | — |
| ~~**SC.3**~~ | ~~Resolve a subtype: fields union, `components` merge per key, and the resolved view cached per fold~~ — **done**: `resolved()` unions fields and merges `components` per key, cached per fold. Component resolvers (`cardOf` &c.) still read the leaf alone | `graph/fold.ts` | SC.2, S3.3 |
| ~~**SC.4**~~ | ~~Two definitions loaded under one name are offered with their packages beside them~~ — **done**: type offers are package-disambiguated (proven) | `page/Contents.tsx` | A0.3 |

### A0 — packages and styles

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**A0.1**~~ | ~~Two folders at the root~~ — **done**: `packages/` and `styles/` with purpose READMEs only. No package contents, no modules change. A0.3 still owns loading | `packages/`, `styles/` | ⊘ |
| ~~**A0.2**~~ | ~~`packages/core` — the relation seeds~~ — **done**: `packages/core/<domain>.yaml` holds the relation definitions; workflows YAML no longer has relations. **Parked**: seeding bridge (`workflows.ts` → `Domain.relations`) still open — needs Clay (terminal freeze) before D.2 can retire it | `packages/core/`, `workflows/` | A0.1, D.1 |
| ~~**A0.3**~~ | ~~Loading a package: definitions in, by id, never shadowing~~ — **done**: shipped YAML under `packages/` loads as `Pack` graphs under stable `pkg_*` ids; defs addressed by path (`defOf` / `scoped`), never copied into a consumer's `defs`. SC.4 tray, D.2 vocabulary list, and the terminal seeding bridge left alone | `workspace/` | A0.1, S4.4 |
| ~~**A0.4**~~ | ~~Preset registration, so a diagram names a tested set rather than recombining freely~~ — **done**: `ship` / `presets` / `preset` in `modules/index.ts`. No concrete presets shipped yet | `modules/index.ts` | S2.5 |

### S4 — the workspace

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**S4.1**~~ | ~~Split project storage from workspace storage; key one entry per project~~ — **done**: `loadProject`/`saveProject` one key per id; `loadWorkspace`/`saveWorkspace`; legacy `mndflow.steps.v1` migrates once. Session `load`/`save` still for `project.ts` until S4.2 | `graph/store.ts` | ⊘ |
| ~~**S4.2**~~ | ~~`useProject(projectId)` — the page picks which project is in context~~ — **done**: keyed load/save; switch clears the view; import adopts the file's id. App still feeds the session pointer until S4.5 | `project.ts` | S4.1 |
| ~~**S4.3**~~ | ~~Widen the proxy target to `{ project, element }`; `tidy` tolerates a missing target instead of deleting the proxy~~ — **done**: `of` as `{ project, element }`; tidy keeps a missing target as "missing block" | `graph/types.ts`, `graph/fold.ts` | W0.1 |
| ~~**S4.4**~~ | ~~The workspace as a project — proxies of other projects' roots, folders as blocks, guard against proxying itself~~ — **done**: `Held` + `admit` / `folder` / `resolve` / self-guard on `mndflow.workspace.v1`; suite only — explorer wire is S4.5 | `workspace/` | S4.2, S4.3 |
| ~~**S4.5**~~ | ~~Explorer lists every open project; the selected row's project is the context~~ — **done (rework)**: explorer shows both roots; click switches context (proven) | `page/App.tsx`, explorer | S4.4 |
| ~~**S4.6**~~ | ~~Workspace export and import; a single project still exports alone, bundling what it depends on~~ — **done**: workspace `⤓` and project `↧` export/import at schema `1.2` (proven) | `graph/file.ts`, `page/App.tsx`, `project.ts` | S4.4 |
| ~~**S4.7**~~ | ~~Lazy keys: a project is stored on its first change, not on being opened. Under pressure the untouched are checkpointed and the strip says so~~ — **done**: pristine makes no key; first change writes; pressure API on the store. Strip still not wired to `watchPressure` | `graph/store.ts` | S4.1 |
| ~~**S4.8**~~ | ~~Locked packages: refuse a change with the reason, and offer **unlock** or **fork**~~ — **done**: refuse with the reason; strip offers unlock / fork; seeded lock proven in a browser | `workspace/`, `project.ts` | S4.4, S1.7 |

### Schema

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**SC.1**~~ | ~~Land the schema change~~ — **done**: four `Definition` fields, `refTo`/`refAt` for cross-project paths, `module` in `meta`, schema `1.1`, and a file written either way still reads. 12 tests | `graph/types.ts`, `graph/file.ts` | — |


## Wave 1b — startable today, no seam needed

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**G.1**~~ | ~~Filter relationships by type on the canvas~~ — **done**: toolbar cycles relationship types; filtered edges don't draw; seats cleared. Persistence in localStorage parked | `canvas/Canvas.tsx` | ⊘ |
| ~~**G.8**~~ | ~~A favicon~~ — **done**: the header's `▚` inline as an SVG data URI, so nothing is fetched | `index.html` | — |
| ~~**F.1**~~ | ~~Filename follows the project's name~~ — **already built**; `store.download` derives it from the title and the browser run exported `software-system.mndflow.json`. tasks.md was stale | — | — |
| ~~**F.2**~~ | ~~File System Access: hold a live handle and say when the file changes underneath. Chromium only; the download path stays the fallback~~ — **done (fallback proven)**: Chromium FS Access present; download fallback when the picker fails. Live bind+drift not proven under automation. Owns `graph/store.ts`, `page/App.tsx`, `project.ts` | `graph/store.ts`, `page/App.tsx`, `project.ts` | ⊘ |
| ~~**H.1**~~ | ~~`samples/mndflow.json`~~ — **done**: describes this app, exercises the forms; import drew Graph/Canvas | `samples/` | ⊘ |
| ~~**H.2**~~ | ~~Read a real export line by line and report what a reviewer would want~~ — **done**: `samples/REVIEW.md` | — | H.1 |
| ~~**D.1**~~ | ~~Split `terms` out of the workflow YAML from the prompt sets~~ — **done**: terms in `workflows/terms/*.yaml`; `workflows.ts` merges. Chips still read Module/Dependency. Relation seeds moved in A0.2 | `terminal/workflows.ts`, `workflows/` | ⊘ |
| ~~**CI**~~ | ~~`tsc` and `vitest` on push~~ — **done**, `.github/workflows/check.yml`. LFS skipped: the model is needed to run the app, not to check it | `.github/` | — |


## Wave 2 — the streams

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**C.1**~~ | ~~Clusters: **ring and chain only**, each laid out by its own topology~~ — **done**: exact ring → circle, chain → series; hub-and-spoke and other shapes fall through to the layer arrangement; hand-laid sticks under free fill. Proven in browser | `geometry/layout.ts` | S3.3 |
| ~~**C.2**~~ | ~~Notes as layout units, ties drawn as fixed associations~~ — **done**: notes via `withNotes`; ties excluded from structural joins; tied notes seat under holders (proven earlier) | `geometry/layout.ts` | C.1 |
| ~~**C.3**~~ | ~~A flow biases **placement** as well as routing~~ — **done**: directed edges bias rank/placement and route along-bias. Port in/out unread. Resting unplaced neighbour not driven (no UI) | `geometry/layout.ts`, `geometry/route.ts` | ⊘ |
| ~~**C.4**~~ | ~~Router cost — a window resize on 80 blocks blocks the main thread for 15s. **Measure first and say what the number is**; the cause is the router, not another split~~ — **done**: measured ~15.5s before on an 80-box long-span harness; ~72ms after — two-phase seats-first + shared visibility, Dijkstra only when every pair needs a skirt. Browser resize on a busy layer stayed interactive (~75–164ms) | `geometry/route.ts` | S3.3 |
| ~~**C.5**~~ | ~~Rewrite the layout acceptance criterion around clusters, and measure it~~ — **done**: cluster layout property tests (suite) | `geometry/*.test.ts` | C.1 |
| **D.2** | `vocabulary` becomes the list of packages a project uses, in import order. **Blocked** on terminal freeze + owns (A0.2 bridge needs Clay) | `graph/types.ts`, `terminal/` | A0.3 |
| ~~**E.1**~~ | ~~Editing definitions in the contents tray — fields, defaults, presentation~~ — **done**: types chip + edit defs in the tray (proven) | `page/Contents.tsx` | S1.6 |
| ~~**E.2**~~ | ~~A control per field form — number with unit, choice with list, ref with picker~~ — **done**: number+unit, choice list, ref picker on usage and definition fields (proven) | `page/Contents.tsx` | E.1 |
| ~~**E.3**~~ | ~~Tags: shown and editable~~ — **done**: tags add/drop on usage and definition fields (proven) | `page/Contents.tsx` | E.2 |
| ~~**G.2**~~ | ~~`relax` — hand a layer back to the engine~~ — **done**: ◌ click wires `onRelax` (`onClick={() => onRelax()}`) | `actions/layer.ts`, `canvas/` | S1.5 |
| ~~**G.3**~~ | ~~`size` — resize a note after it is made~~ — **done**: note SE resize emits `size` (proven) | `actions/layer.ts`, `canvas/` | S1.5 |
| ~~**G.4**~~ | ~~`dissolve` — ungroup a whole group~~ — **done**: registered and S1.6-ready (`delete_element` on the group; members stay). **No UI reaches it** — offering from menu/tray waits G.9 | `actions/groups.ts` | S1.4 |
| ~~**G.5**~~ | ~~`Ctrl`/`Cmd` + `A`~~ — **done**: selects all cards; Esc clears RF multi-select via `changeNodes`; Fit/Group work | `canvas/gestures.ts` | S2.1 |
| ~~**G.6**~~ | ~~Add a block to an existing group from the panel — `joinGroup` is wired to nothing~~ — **done**: panel `+ group` select joins the selection into an existing group; proven in browser | `page/Panel.tsx` | S1.4 |
| ~~**G.7**~~ | ~~The selection box takes things it does not enclose~~ — **partial**: an edge with only one end enclosed is not selected; click / Ctrl+A / Esc still behave (proven). **Parked**: both-ends-in-box edge policy | `canvas/Canvas.tsx` | S2.1 |
| **G.9** `◆` | The context menu, and a trigger for it — selecting an element lists its actions in the tray. **Needs Clay**: the trigger is not designed — the right button is spent on direct creation, so the menu has no gesture left | `page/Contents.tsx`, `canvas/` | S1.6, S2.4 |
| ~~**F.3**~~ | ~~Export a rendered SVG beside the source~~ — **partial**: `svgOf` renderer landed (suite). **Parked**: download / export wire beside the source still open | `modules/view/diagram/` | S2.6 |
| ~~**A.1**~~ | ~~The **table** view module — proxies drawn as rows~~ — **done (suite)**: `modules/view/table/`; App mounts it when `view.module` is `table`. Browser full prove may still be open | `modules/view/table/` | S2.5, S4.4 |
| ~~**A.2**~~ | ~~The **matrix** view module — two axes, relationships in the cells, no adjustments~~ — **done (suite)**: `modules/view/matrix/`; App mounts it when `view.module` is `matrix` | `modules/view/matrix/` | A.1 |
| ~~**A.3**~~ | ~~**requirements** package — `id` and `text`, five relationship definitions, `shows` on the card. The proof a package needs no code~~ — **done**: `packages/requirements/definitions.yaml` — requirement block + satisfy/verify/refine/derive/trace; data only | `packages/requirements/` | A0.2, S2.3 |
| ~~**A.4**~~ | ~~**parametrics** package — a constraint definition with a size and a style~~ — **done**: data only under `packages/parametrics/` (suite) | `packages/parametrics/` | A.3 |
| ~~**A.5**~~ | ~~**flow** package — `directed` subtypes and the words for them~~ — **done**: `packages/flow/definitions.yaml` — control flow, object flow (`item` ref), transition (trigger/guard/effect); data only. Formal `names` wait A.11 | `packages/flow/` | A0.2 |
| ~~**A.6**~~ | ~~*Engine capability*: a **shape drawn inside a card**~~ — **done**: `shaped()` + `outline()` on card; nothing stored. Canvas stroke waits S2.6; counting waits A.7 | `modules/card/` | S2.3 |
| **A.7** `◆` | The **activity** view module — a behavior layer's default projection. Figures, guards as edge fields, partitions as blocks. Seeding makes one behavior block per container, holding refs to its children and the interactions implied between them; **sync is an action, never a binding**, so a process may cut across containers. **Needs Clay**: what an interaction writes on a participant — see tasks.md | `modules/view/activity/` | A.6, S5.2 |
| **A.8** | The **state** view module — the same behavior layer projected as states and transitions. Its own module because it projects differently; not its own model | `modules/view/state/` | A.7 |
| **A.9** | The **sequence** view module — a column per participant, order running down each. Explicit order from directed relations first, implied from position along the axis as the fallback | `modules/view/sequence/` | A.7 |
| **A.10** | **Vocabulary packages** for the three behavior projections — what each calls an action, a state, a message. Data only; the projecting is A.7–A.9 | `packages/behavior/` | A.9 |
| **A.11** | **UML, SysML v2 and UAF** packages — tables of definitions, `names`, and mappings | `packages/` | A.7 |
| **A.12** | The **IBD layout law** — rank by connectivity rather than containment, ports shown | `modules/view/diagram/` | A.2 |


## Wave 3 — the terminal

**Parked** — last, and the acceptance test for everything above. See tasks.md, stream Z. Do not start while the graph model is still settling; the rail stays frozen.

| | Does | Owns | Waits |
|---|---|---|---|
| **Z.1** | Collapsed mode: rank the actions available in the current context against what is typed | `terminal/` | S1.7, everything in Wave 2 |
| **Z.2** | Arrow keys move the highlight; `Enter` confirms it; overruling it is the feedback | `terminal/` | Z.1 |
| **Z.3** | Two-tier learning — the literal entry remembered, the situation's shape weighted. Local, never logged | `terminal/` | Z.2 |
| **Z.4** | Expanded mode: the next question worth answering, and nudges | `terminal/` | Z.1 |
| **Z.5** | The tutorial, walked over a sample project | `terminal/`, `samples/` | Z.4, H.1 |
| **Z.6** `◆` | Surfacing documentation, keyed to context. **Needs Clay**: where the text lives, and how it is keyed | `terminal/` | Z.4 |
| **Z.7** | The rename, once all of it is built | everywhere | Z.6 |


## Not in the queue

Recorded in [tasks.md](tasks.md) and deliberately unscheduled: translators and code generation,
local variation on a proxy for multi-user work, a live store, the cluster spacing tier, and the
README rewrite that waits for all of this to land.
