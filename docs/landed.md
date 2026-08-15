# Landed

Every plan row that landed whole, with the one line of what actually landed. Moved out of
[plan.md](plan.md) so that file is only what is left to do.

**This is a record, not a queue.** Nothing here is waiting on anything. A row that landed *short*
is not here — it stays in plan.md marked `◐`, because the rest of it is still work.

**Only the main agent writes this file, and only after reviewing the work.** No subagent moves a row
here. A subagent reports what it did; somebody then reads the diff and decides whether the row is
finished. A row nobody reviewed stays in plan.md however green the suite is — the value of this file
is that each line was stood behind, not self-reported.

- **What each part does now** → [spec.md](spec.md). **Why** → [design.md](design.md).
- **What is still missing** → [tasks.md](tasks.md).


## W0 — the specification gaps

| | Landed |
|---|---|
| **W0** | Undo restores the graph and never the context; storage is keyed per project and lazily, the untouched checkpointed under pressure; packages are a list in import order and never shadow, since references are by id; a package resists editing until unlocked or forked; a proxy owns its appearance and the block owns the thing |


## Schema

| | Landed |
|---|---|
| **SC.1** | Four `Definition` fields (`body`, `size`, `names`, `components`), `refTo`/`refAt` for cross-project paths, `module` demoted to `meta`, schema `1.1`. A 1.0 file still opens, keeps everything, and saves out current. 12 tests |
| **SC.2** | `extends` on a definition and `isa` to walk the chain — one parent, cycle-guarded, a missing parent ends the walk. 5 tests |
| **SC.3** | `resolved()` unions fields and merges `components` per key, cached per fold. *The four component resolvers still read the leaf alone — that is SC.6, still open* |
| **SC.4** | Type offers are package-disambiguated when two definitions share a name (proven) |


## S1 — the action registry

| | Landed |
|---|---|
| **S1.1** | Types, registry, dispatcher in `actions/index.ts`. Scope decides what is shown, `check` what happens on commit, `sayable` falls out of the argument types, `writes` gates the step. 12 tests |
| **S1.2** | `actions/elements.ts` — create/delete/rename/retype/describe/move/refer, and open/up/reveal |
| **S1.3** | `actions/edges.ts` — interface/mark/relate/unlink/flip/direct/reform |
| **S1.4** | `actions/groups.ts` + `actions/fields.ts` — the 5 group-and-note and 4 field-and-definition actions |
| **S1.5** | `actions/layer.ts` — axis/arrange/relax/vocabulary and the four adjustments place/size/seat/wall |
| **S1.6** | `act.*` wrappers generated from the registry; side-effect imports of `actions/*`; the 5 queries off `act`; aliases for old names; gestures work through the registry. 52 entries in `act` became 29 actions, 4 adjustments, 5 page actions and 5 queries |


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
| **S4.8** | Locked packages refuse a change with the reason; the strip offers unlock / fork. Seeded lock proven in a browser |


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


## A — views and packages

| | Landed |
|---|---|
| **A.2** | The **matrix** view module — two axes, relationships in the cells, no adjustments. App mounts it when `view.module` is `matrix` (suite) |
| **A.3** | **requirements** package — requirement block (`id` / `text`, card `shows`) and satisfy/verify/refine/derive/trace. Data only, and the proof a package needs no code |
| **A.4** | **parametrics** package — a constraint definition with a size and a style. Data only |
| **A.5** | **flow** package — control flow, object flow (`item` ref), transition (trigger/guard/effect). Data only; formal `names` wait A.11 |
| **A.6** | *Engine capability* — `shaped()` + `outline()` on card, a shape drawn inside a card. Nothing stored |


## G — canvas polish

| | Landed |
|---|---|
| **G.1** | Filter relationships by type — toolbar cycles types; filtered edges don't draw; seats cleared. *Persistence in localStorage parked* |
| **G.2** | `relax` — ◌ click wires `onRelax` |
| **G.3** | `size` — note SE resize emits `size` (proven) |
| **G.4** | `dissolve` registered and S1.6-ready (`delete_element` on the group; members stay). *No UI reaches it — that waits G.9* |
| **G.5** | `Ctrl`/`Cmd` + `A` selects all cards; Esc clears an RF multi-select via `changeNodes`; Fit and Group still work |
| **G.6** | Panel `+ group` joins the selection into an existing group (proven) |
| **G.8** | A favicon — the header's `▚` inline as an SVG data URI, so nothing is fetched |


## D, F, H and the build

| | Landed |
|---|---|
| **D.1** | `terms` split out of the workflow YAML into `workflows/terms/*.yaml`; `workflows.ts` merges them |
| **F.1** | Filename follows the project's name — **already built**; `store.download` derives it from the title. tasks.md was stale |
| **H.1** | `samples/mndflow.json` — describes this app, exercises the forms; import drew Graph/Canvas |
| **H.2** | `samples/REVIEW.md` — a line-by-line read of a real export. *Three parks came out of it, in tasks.md under H* |
| **CI** | `tsc` and `vitest` on push, `.github/workflows/check.yml`. LFS skipped: the model is needed to run the app, not to check it |
