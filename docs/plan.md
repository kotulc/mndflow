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
| **S1.1** | The action registry — types, scope, `check`, `sayable`, `writes` |
| **S3.1** | All **22** retired ops deleted, with the `Legacy` union and the door's entries. `fold.ts` 872 → 680 |
| **RF.1** | Relation forms reduced to `line` \| `directed`; `reference` and `tie` derived; `assoc` retired to a definition. Healed at the door, verified in a browser |
| **RF.2** | `Element.color` removed — nothing read it, and it was written back into every file forever |
| **G.8 · F.1 · CI** | Favicon; the filename already followed the project name; `tsc` and `vitest` on push |

## Wave 1 — the seams

**S1, S2, S3, S5 and A0 touch disjoint files and run in parallel** — S5 waits on S2.2 and A0
on nothing.

**S4 is the exception, and matters if two owners run at once.** Three files are wanted by rows that
are startable at the same moment, so take them in this order rather than together:

| File | Contended by | Order |
|---|---|---|
| `graph/fold.ts` | S3.2, S3.3, S4.3, SC.3 | S3.2 → S3.3 first; S4.3 and SC.3 build on the split |
| `graph/store.ts` | S4.1, S4.7, F.2 | S4.1 first — it splits graph storage from workspace storage, after which they are disjoint |
| `canvas/gestures.ts` | S2.7, G.5, G.7 | either of G.5 / G.7, then the other. Both are small |

### S3 — fold hygiene

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**S3.1**~~ | ~~Delete the retired ops~~ — **done**: all **22**, the `Legacy` union, the `Pending` plumbing and the door's entries. `fold.ts` 872 → 680 lines. Shape healing kept; the pre-checkpoint *log* format is gone | `graph/fold.ts`, `graph/check.ts`, `graph/types.ts` | — |
| **S3.2** | Split `apply()` by family — element, edge, group, field, definition | `graph/fold.ts` | S3.1 |
| **S3.3** | Build the index once per fold; `childrenOf`, `blocksOf`, `portsOf` stop scanning | `graph/fold.ts` | S3.2 |

### S1 — the action registry

Build against [actions.md](actions.md), not against `project.ts`.

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**S1.1**~~ | ~~Types, registry, dispatcher~~ — **done**, `actions/index.ts`. Scope decides what is shown, `check` what happens on commit, `sayable` falls out of the argument types, `writes` gates the step. 12 tests | `actions/index.ts` | — |
| **S1.2** | Port the 8 element actions and the 3 navigation ones | `actions/elements.ts` | S1.1 |
| **S1.3** | Port the 2 interface and 5 relationship actions | `actions/edges.ts` | S1.1 |
| **S1.4** | Port the 5 group-and-note and 4 field-and-definition actions | `actions/groups.ts`, `actions/fields.ts` | S1.1 |
| **S1.5** | Port the 4 layer actions and the 4 adjustments | `actions/layer.ts` | S1.1 |
| **S1.6** | Generate the `act.*` wrappers, move the 5 queries off the surface, delete the old closures | `project.ts` | S1.2–5 |
| **S1.7** | `check` on every action that can refuse, wired to the strip | `actions/*` | S1.6 |

### S2 — the component surface

The base diagram is hard-wired into `Canvas.tsx`. **The test this seam is measured against**: if the
default cannot be expressed as one configuration among others, the component boundaries are in the
wrong place.

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**S2.1**~~ | ~~Extract gesture handling out of `Canvas.tsx`~~ — **done**: `useGestures(reach, stage)`, 867 lines out of a 2041-line file. Hit testing, both buttons, the keyboard and the drag snap; it reaches actions and writes no mutation. Verified in a browser | `canvas/gestures.ts` | — |
| ~~**S2.2**~~ | ~~The component contract~~ — **done**: `publish` registers each component's validator with the door, which drops only a key its component refuses and reports the reason. An unclaimed key is unvalidated, never wrong. 6 tests | `modules/index.ts`, `graph/check.ts` | — |
| ~~**S2.3**~~ | ~~The **card** component~~ — **done**: the six layouts, five shapes, three label placements and `shows`, refused from data and closed to it. `PLAIN` is today's card written down as one configuration; `cardOf` resolves a usage. Published by `modules/base.ts` at startup, so the door refuses `card.shape: trapezium` in the component's own words. 13 tests. **Nothing draws from it yet** — that is S2.6 | `modules/card/`, `modules/base.ts`, `main.tsx` | — |
| **S2.4** | The **style** component — a style set by name over the portable typed fields. **Publish it in `modules/base.ts`**, or the door validates its key silently | `modules/style/`, `assets/styles/`, `modules/base.ts` | S2.2, A0.1 |
| **S2.5** | The **view** component and the view-module registry: `diagram`, `table`, `matrix`. **Publish it in `modules/base.ts`**, or the door validates its key silently. `modules/card/` is the pattern | `modules/view/`, `modules/base.ts` | S2.2 |
| **S2.6** `◆` | Move today's canvas in as the **base diagram**, configured rather than hard-wired. **Bigger than one sitting, and the verdict on the whole seam.** Already walked without moving code — five things resisted, all of them the layer *as a workspace*: the frame, the camera, derived presentation, the prompt loop, per-diagram display preferences. See tasks.md under S2. **Answer that before S2.4 and S2.5 build against the current six** | `modules/view/diagram/` | S2.5, S2.3 |
| **S2.7** | Wire the gesture map from actions.md's inventory; a diagram declares the adjustments it takes | `modules/view/diagram/`, `canvas/gestures.ts` | S2.6, S1.6 |

### S5 — constraints and rules

| | Does | Owns | Waits |
|---|---|---|---|
| **S5.1** | The **constraints** component — `required`. Publish it in `modules/base.ts` | `modules/constraints/`, `modules/base.ts` | S2.2 |
| **S5.2** | The **rules** component — `ends` (with port direction), `holds`, `degree`, `match`. Each reaches every subtype, via `isa`. Publish it in `modules/base.ts` | `modules/rules/`, `modules/base.ts` | S2.2, SC.2 |
| **S5.3** | Reporting: violations advise in the tray and the strip, and **never refuse** | `page/Contents.tsx` | S5.2 |
| **S5.4** | A module's `validate` hook — the escape hatch for what the five cannot say | `modules/index.ts` | S5.2 |
| **S5.5** | **`figure` takes no interfaces** — the `interface` action refuses on one, with the reason. The first rule the engine enforces rather than advises | `actions/elements.ts` | S1.7 |

### Schema

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**SC.2**~~ | ~~`extends` on a definition, and `isa` to walk the chain~~ — **done**: one parent, cycle-guarded, a missing parent ends the walk. 5 tests | `graph/types.ts`, `graph/fold.ts` | — |
| **SC.3** | Resolve a subtype: fields union, `components` merge per key, and the resolved view cached per fold | `graph/fold.ts` | SC.2, S3.3 |
| **SC.4** | Two definitions loaded under one name are offered with their packages beside them | `page/Contents.tsx` | A0.3 |

### A0 — assets

| | Does | Owns | Waits |
|---|---|---|---|
| **A0.1** `◆` | The `assets/` layout. **`src/modules/` already holds module code** (S2.2, S2.3), so `assets/modules/` may have nothing left to hold — decide whether `assets/` is data and stylesheets only, `packages/` and `styles/`. Blocks S2.4, A0.2, A0.3 | `assets/` | ⊘ |
| **A0.2** | `assets/packages/core` — the relation seeds now living in `workflows/*.yaml`, which have nothing to do with the terminal | `assets/packages/core/`, `workflows/` | A0.1, D.1 |
| **A0.3** | Loading a package: definitions in, by id, never shadowing | `workspace/` | A0.1, S4.4 |
| **A0.4** | Preset registration, so a diagram names a tested set rather than recombining freely | `modules/index.ts` | S2.5 |

### S4 — the workspace

| | Does | Owns | Waits |
|---|---|---|---|
| **S4.1** | Split project storage from workspace storage; key one entry per project | `graph/store.ts` | ⊘ |
| **S4.2** | `useProject(projectId)` — the page picks which project is in context | `project.ts` | S4.1 |
| **S4.3** | Widen the proxy target to `{ project, element }`; `tidy` tolerates a missing target instead of deleting the proxy | `graph/types.ts`, `graph/fold.ts` | W0.1 |
| **S4.4** | The workspace as a project — proxies of other projects' roots, folders as blocks, guard against proxying itself | `workspace/` | S4.2, S4.3 |
| **S4.5** | Explorer lists every open project; the selected row's project is the context | `page/App.tsx`, explorer | S4.4 |
| **S4.6** | Workspace export and import; a single project still exports alone, bundling what it depends on | `graph/file.ts`, `page/Files.tsx` | S4.4 |
| **S4.7** | Lazy keys: a project is stored on its first change, not on being opened. Under pressure the untouched are checkpointed and the strip says so | `graph/store.ts` | S4.1 |
| **S4.8** | Locked packages: refuse a change with the reason, and offer **unlock** or **fork**. A fork takes a new project id. Locked is workspace state, never in the file | `workspace/`, `actions/*` | S4.4, S1.7 |

### Schema

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**SC.1**~~ | ~~Land the schema change~~ — **done**: four `Definition` fields, `refTo`/`refAt` for cross-project paths, `module` in `meta`, schema `1.1`, and a file written either way still reads. 12 tests | `graph/types.ts`, `graph/file.ts` | — |


## Wave 1b — startable today, no seam needed

| | Does | Owns | Waits |
|---|---|---|---|
| **G.1** | Filter relationships by type on the canvas — a display preference. **Before any matrix** | `canvas/` | ⊘ |
| ~~**G.8**~~ | ~~A favicon~~ — **done**: the header's `▚` inline as an SVG data URI, so nothing is fetched | `index.html` | — |
| ~~**F.1**~~ | ~~Filename follows the project's name~~ — **already built**; `store.download` derives it from the title and the browser run exported `software-system.mndflow.json`. tasks.md was stale | — | — |
| **F.2** | File System Access: hold a live handle and say when the file changes underneath. Chromium only; the download path stays the fallback | `graph/store.ts`, `page/Files.tsx` | ⊘ |
| **H.1** | `samples/mndflow.json` — describes this app, exercises every feature in spec.md, loads without setup | `samples/` | ⊘ |
| **H.2** | Read a real export line by line and report what a reviewer would want | — | H.1 |
| **D.1** | Split `terms` out of the workflow YAML from the prompt sets | `terminal/workflows.ts`, `workflows/` | ⊘ |
| ~~**CI**~~ | ~~`tsc` and `vitest` on push~~ — **done**, `.github/workflows/check.yml`. LFS skipped: the model is needed to run the app, not to check it | `.github/` | — |


## Wave 2 — the streams

| | Does | Owns | Waits |
|---|---|---|---|
| **C.1** | Clusters: **ring and chain only**, each laid out by its own topology | `geometry/layout.ts` | S3.3 |
| **C.2** | Notes as layout units, ties drawn as fixed associations | `geometry/layout.ts` | C.1 |
| **C.3** | A flow biases **placement** as well as routing — not just the sides it attaches to. What in/out *mean* stays the package's | `geometry/layout.ts`, `geometry/route.ts` | ⊘ |
| **C.4** | Router cost — a window resize on 80 blocks blocks the main thread for 15s. **Measure first and say what the number is**; the cause is the router, not another split | `geometry/route.ts` | S3.3 |
| **C.5** | Rewrite the layout acceptance criterion around clusters, and measure it | `geometry/*.test.ts` | C.1 |
| **D.2** | `vocabulary` becomes the list of packages a project uses, in import order | `graph/types.ts`, `terminal/` | A0.3 |
| **E.1** | Editing definitions in the contents tray — fields, defaults, presentation | `page/Contents.tsx` | S1.6 |
| **E.2** | A control per field form — number with unit, choice with list, ref with picker | `page/Contents.tsx` | E.1 |
| **E.3** | Tags: shown and editable | `page/Contents.tsx` | E.2 |
| **G.2** | `relax` — hand a layer back to the engine. The op exists and nothing emits it | `actions/layer.ts`, `canvas/` | S1.5 |
| **G.3** | `size` — resize a note after it is made. Same, unwired | `actions/layer.ts`, `canvas/` | S1.5 |
| **G.4** | `dissolve` — ungroup a whole group | `actions/groups.ts` | S1.4 |
| **G.5** | `Ctrl`/`Cmd` + `A` | `canvas/gestures.ts` | S2.1 |
| **G.6** | Add a block to an existing group from the panel — `joinGroup` is wired to nothing | `page/Panel.tsx` | S1.4 |
| **G.7** | The selection box takes things it does not enclose. **Undiagnosed — find the cause and report it before fixing.** The leading suspect explains a box that fails to start, not one that over-selects | `canvas/gestures.ts` | S2.1 |
| **G.9** `◆` | The context menu, and a trigger for it — selecting an element lists its actions in the tray. **The trigger is not designed**: the right button is spent on direct creation, so the menu has no gesture left | `page/Contents.tsx`, `canvas/` | S1.6, S2.4 |
| **F.3** | Export a rendered SVG beside the source. Needs a renderer that is not React Flow | `modules/view/diagram/` | S2.6 |
| **A.1** | The **table** view module — proxies drawn as rows | `modules/view/table/` | S2.5, S4.4 |
| **A.2** | The **matrix** view module — two axes, relationships in the cells, no adjustments | `modules/view/matrix/` | A.1 |
| **A.3** | **requirements** package — `id` and `text`, five relationship definitions, `shows` on the card. The proof a package needs no code | `assets/packages/requirements/` | A0.2, S2.3 |
| **A.4** | **parametrics** package — a constraint definition with a size and a style | `assets/packages/parametrics/` | A.3 |
| **A.5** | **flow** package — `directed` subtypes and the words for them | `assets/packages/flow/` | A0.2 |
| **A.6** | *Engine capability*: a **shape drawn inside a card**, which is what activity's figures need | `modules/card/` | S2.3 |
| **A.7** | **activity** package — figures, guards as edge fields, partitions as blocks | `assets/packages/activity/` | A.6, S5.2 |
| **A.8** | **state machine** package — activity's shape, its own vocabulary | `assets/packages/state/` | A.7 |
| **A.9** | *Engine capability*: the **lifeline arrangement** — a column per participant, order down each | `modules/view/diagram/` | S2.6 |
| **A.10** | **sequence** package — occurrences as interfaces seated down a lifeline; accepts only `seat` | `assets/packages/sequence/` | A.9 |
| **A.11** | **UML, SysML v2 and UAF** packages — tables of definitions, `names`, and mappings | `assets/packages/` | A.7 |
| **A.12** | The **IBD layout law** — rank by connectivity rather than containment, ports shown | `modules/view/diagram/` | A.2 |


## Wave 3 — the terminal

Last, and the acceptance test for everything above. See tasks.md, stream Z.

| | Does | Owns | Waits |
|---|---|---|---|
| **Z.1** | Collapsed mode: rank the actions available in the current context against what is typed | `terminal/` | S1.7, everything in Wave 2 |
| **Z.2** | Arrow keys move the highlight; `Enter` confirms it; overruling it is the feedback | `terminal/` | Z.1 |
| **Z.3** | Two-tier learning — the literal entry remembered, the situation's shape weighted. Local, never logged | `terminal/` | Z.2 |
| **Z.4** | Expanded mode: the next question worth answering, and nudges | `terminal/` | Z.1 |
| **Z.5** | The tutorial, walked over a sample project | `terminal/`, `samples/` | Z.4, H.1 |
| **Z.6** `◆` | Surfacing documentation, keyed to context. **No home yet — needs designing**: where the text lives, and how it is keyed | `terminal/` | Z.4 |
| **Z.7** | The rename, once all of it is built | everywhere | Z.6 |


## Not in the queue

Recorded in [tasks.md](tasks.md) and deliberately unscheduled: translators and code generation,
local variation on a proxy for multi-user work, a live store, the cluster spacing tier, and the
README rewrite that waits for all of this to land.
