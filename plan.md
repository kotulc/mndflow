# Plan

The queue. One row is one chunk of work — small enough to land in a sitting, with the files it
owns so two owners never collide.

- **Why any of it** → [design.md](design.md), and *The words* for the vocabulary used here.
- **What each part does** → [spec.md](spec.md). **The action surface** → [actions.md](actions.md).
- **What is missing and undecided** → [tasks.md](tasks.md).

`⊘` marks a chunk nothing blocks. Everything else names what it waits on.


## Wave 0 — close the specification gaps

Doc-only, an hour each, and every later wave reads them. Do these first or agents will invent
four different answers.

| | Does | Owns | Waits |
|---|---|---|---|
| ~~**W0.1**~~ | ~~Type the schema change~~ — **done**, in spec.md. Four new `Definition` fields (`body`, `size`, `shows`, `formal`), cross-project references as a **path** rather than new fields, `module` to `meta`, schema `1.1`. `vocabulary` deliberately left to D.2, which owns the terminal it would break | spec.md | — |

*Everything else Wave 0 held is answered and recorded in spec.md: undo restores the graph and never
the context; storage is keyed per project and lazily, the untouched checkpointed under pressure;
packages are a list in import order and never shadow, since every reference is by id; a package
resists editing until unlocked or forked; a proxy owns its appearance and the block owns the
thing.*


## Landed out of band

| | Does | |
|---|---|---|
| ~~**RF.1**~~ | Relation forms reduced to **`line` \| `directed`**; `reference` and `tie` derived; `assoc` retired to a definition. Healed at the door both ways, docs and 10 tests, verified in a browser | done |

| ~~**RF.2**~~ | `Element.color` removed — nothing read it, nothing set it, and it was written back into every file forever. Healed away at the door | done |

The base sets and the component model are now in [design.md](design.md); the working re-design is
merged and gone.


## Wave 1 — the seams

**S1, S2, S3 and S4 touch disjoint files and run in parallel.**

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

### S2 — the view registry

| | Does | Owns | Waits |
|---|---|---|---|
| **S2.1** | Extract gesture handling out of `Canvas.tsx` into its own module, behaviour unchanged | `canvas/gestures.ts` | ⊘ |
| **S2.2** | The view contract: scope, vocabulary, renderers, layout law, gesture map, adjustments | `views/index.ts` | S2.1 |
| **S2.3** | Move today's canvas in as the **block module**, registered rather than hard-wired | `views/block/` | S2.2 |
| **S2.4** | Wire the gesture map from actions.md's inventory; a view declares the adjustments it takes | `views/block/`, `canvas/gestures.ts` | S2.3, S1.6 |

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
| **C.4** | Router cost — a window resize on 80 blocks blocks the main thread for 15s | `geometry/route.ts` | S3.3 |
| **C.5** | Rewrite the layout acceptance criterion around clusters, and measure it | `geometry/*.test.ts` | C.1 |
| **D.2** | `vocabulary` becomes the list of packages a project uses | `graph/types.ts`, `terminal/` | SC.1 |
| **E.1** | Editing definitions in the contents tray — fields, defaults, presentation | `page/Contents.tsx` | S1.6 |
| **E.2** | A control per field form — number with unit, choice with list, ref with picker | `page/Contents.tsx` | E.1 |
| **E.3** | Tags: shown and editable | `page/Contents.tsx` | E.2 |
| **E.4** | **Requirements as a package** — `requirement` with `id`/`text`, five relationship definitions, `shows` on the card. The proof a package needs no code | `packages/` | SC.1, E.1 |
| **E.5** | **Parametrics as a package** — a constraint definition with `size` and a colour | `packages/` | E.4 |
| **E.6** | **UML, SysML v2 and UAF as packages** — the named starting targets. Each is a table of definitions and mappings, no code | `packages/` | E.5 |
| **G.2** | `relax` — hand a layer back to the engine. The op exists and nothing emits it | `actions/layer.ts`, `canvas/` | S1.5 |
| **G.3** | `size` — resize a note after it is made. Same, unwired | `actions/layer.ts`, `canvas/` | S1.5 |
| **G.4** | `dissolve` — ungroup a whole group | `actions/groups.ts` | S1.4 |
| **G.5** | `Ctrl`/`Cmd` + `A` | `canvas/gestures.ts` | S2.1 |
| **G.6** | Add a block to an existing group from the panel — `joinGroup` is wired to nothing | `page/Panel.tsx` | S1.4 |
| **G.7** | The selection box takes things it does not enclose. Undiagnosed | `canvas/gestures.ts` | S2.1 |
| **G.9** | The context menu, and a trigger for it — selecting an element lists its actions in the tray | `page/Contents.tsx`, `canvas/` | S1.6, S2.4 |
| **F.3** | Export a rendered SVG beside the source. Needs a renderer that is not React Flow | `views/block/` | S2.3 |
| **A.1** | The **matrix module** — a view over a set, cells are relationships, no adjustments | `views/matrix/` | S2.3, S4.4 |
| **A.2** | The **activity module** — figure renderers, `Definition.size` in use | `views/activity/` | S2.3, SC.1 |
| **A.3** | The **state machine module** — activity's shape, its own vocabulary | `views/state/` | A.2 |
| **A.4** | The **sequence module** — occurrences as interfaces seated down a lifeline; accepts only `seat` | `views/sequence/` | A.2 |
| **A.5** | The **IBD layout law** — rank by connectivity rather than containment, ports shown | `views/block/` | A.1 |


## Wave 3 — the terminal

Last, and the acceptance test for everything above. See tasks.md, stream Z.

| | Does | Owns | Waits |
|---|---|---|---|
| **Z.1** | Collapsed mode: rank the actions available in the current context against what is typed | `terminal/` | S1.7, everything in Wave 2 |
| **Z.2** | Arrow keys move the highlight; `Enter` confirms it; overruling it is the feedback | `terminal/` | Z.1 |
| **Z.3** | Two-tier learning — the literal entry remembered, the situation's shape weighted. Local, never logged | `terminal/` | Z.2 |
| **Z.4** | Expanded mode: the next question worth answering, and nudges | `terminal/` | Z.1 |
| **Z.5** | The tutorial, walked over a sample project | `terminal/`, `samples/` | Z.4, H.1 |
| **Z.6** | Surfacing documentation, keyed to context. **No home yet — needs designing** | `terminal/` | Z.4 |
| **Z.7** | The rename, once all of it is built | everywhere | Z.6 |


## Not in the queue

Recorded in [tasks.md](tasks.md) and deliberately unscheduled: translators and code generation,
local variation on a proxy for multi-user work, a live store, the cluster spacing tier, and the
README rewrite that waits for all of this to land.
