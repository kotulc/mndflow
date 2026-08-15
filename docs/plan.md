# Plan

The queue. One row is one chunk of work — small enough to land in a sitting, with the files it
owns so two owners never collide.

- **Why any of it** → [design.md](design.md), and *The words* for the vocabulary used here.
- **What each part does** → [spec.md](spec.md). **The action surface** → [actions.md](actions.md).
- **What is missing and undecided** → [tasks.md](tasks.md). **Behaviour** → [behaviors.md](behaviors.md).
- **What already landed** → [landed.md](landed.md). Nothing there is waiting on anything.

`⊘` marks a chunk nothing blocks. Everything else names what it waits on.
`◆` marks one that **needs a decision before any code** — take it to the user first.
`◐` marks one that **landed short of what the row says** — the note names the gap.

**A row is done when** the suite and `tsc` pass, the app has been driven in a browser
(`.claude/skills/run/SKILL.md`), spec.md and tasks.md say what is now true, and the row moves to
[landed.md](landed.md) with one line on what actually landed. See [CLAUDE.md](../CLAUDE.md).

**A row that landed short stays here as `◐`.** The rest of it is still work, so it does not move.


## What is startable now

**Pulled forward: `F.2`** — local disk is a first-class destination now that storage is confirmed
browser-local (design.md, *Where a project lives*), which makes the live handle the most
user-visible unfinished row in the queue.

Then `S6.1`, `SC.5`, `SC.6`, `S4.9`, `E.4`, `A.10`, `A.7c`, `A.12`, and the other three `◐`
follow-ons. Everything else waits on one of those. **`◆` rows need Clay before any code**:
`G.9`, `Z.6`.


## Wave 1 — the seams

The seams are cut; what is left of Wave 1 is listed below. `graph/fold.ts`, `graph/store.ts` and
`canvas/gestures.ts` are no longer contended — every row that wanted them has landed.

### Schema

| | Does | Owns | Waits |
|---|---|---|---|
| **SC.5** | **Retire the `figure` form.** Element forms drop to four. `check.ts` heals `figure` → `block` at the door so existing files still open; the `interface` refusal (S5.5) comes out with it and becomes a `degree` constraint. 22 occurrences across 13 files, plus the one figure in `samples/mndflow.json` — **re-author it as a block with a shape**, which is also the first real test of the claim | `graph/types.ts`, `graph/check.ts`, `actions/edges.ts`, `samples/` | ⊘ |
| **SC.6** | **Wire the four component resolvers to `resolved()`.** `cardOf`, `styleOf`, `rulesOf` and `constraintsOf` each read `graph.defs[type].components` — the leaf alone — so `extends` inherits **nothing** at the point of use and a subtype of a styled definition draws unstyled. SC.2 and SC.3 built the chain and nothing consumes it; `rules` walks `isa` only to *match* a rule, never to inherit its own configuration. Reads like a bug rather than a gap | `modules/card/`, `modules/style/`, `modules/rules/`, `modules/constraints/` | ⊘ |

### S1 — the action registry

| | Does | Owns | Waits |
|---|---|---|---|
| **S1.7** `◐` | `check` on every action that can refuse, wired to the strip — **landed short**: `NameField` taken-name marks the field and says so in the strip (proven). **Left**: canvas prompt clash still silent | `actions/*` | ⊘ |

### S6 — the rail comes out

**The rail must be includable or not** (design.md, *The rail is a separate thing*). It is not today:
four files outside `terminal/` import it, so the app does not build without it.

| | Does | Owns | Waits |
|---|---|---|---|
| **S6.1** | **Cut `project.ts` free of the terminal.** It imports `router`, `turn` and `workflows`, and holds the question loop's `pending` in project state — so the core seam every action flows through cannot be built without the rail. This is the "one known dependency violation", and **S1 did not fix it** as tasks.md claimed it would. The question loop belongs to the rail; `project.ts` should expose state and dispatch and know nothing about a question | `project.ts`, `terminal/` | ⊘ |
| **S6.2** | **Move `terms` out of `terminal/`.** `page/Files.tsx` imports `Terms` from `terminal/workflows`, so the file tray needs the rail to compile. Vocabulary is a general need and belongs to a package — this is the same knot as **D.2**, and doing it unblocks that row | `terminal/workflows.ts`, `page/Files.tsx`, `packages/` | S6.1, A0.3 |
| **S6.3** | **The page mounts the rail or does not.** `App.tsx` (`Chat`, `Suggestion`) and `Readout.tsx` (`Scores`) import it directly. One optional mount point, and a build with `terminal/` deleted still runs. **The acceptance test for the whole seam** | `page/App.tsx`, `page/Readout.tsx` | S6.2 |

### S4 — the workspace

| | Does | Owns | Waits |
|---|---|---|---|
| **S4.7** `◐` | Lazy keys, and under pressure the untouched are checkpointed **and the strip says so** — **landed short**: pristine makes no key; first change writes; pressure API on the store. **Left**: the strip is not subscribed to `watchPressure` | `graph/store.ts` | ⊘ |
| **S4.9** | **A write into a project that is not the one in context.** Today `App` holds exactly one `useProject(contextId)`; every other open project is read-only through `graphOf`, and the only way to touch another log is `store.saveProject(id, steps)` — raw, bypassing the fold, the door and that project's undo. behaviors.md's *writing home* needs a real path: an action names the project a mutation lands in, it goes through the same door, and it becomes an undoable step **in the target's log**. **Blocks A.7a**, and it is the last seam the workspace is missing | `project.ts`, `workspace/`, `actions/index.ts` | ⊘ |


## Next

| | Does | Owns | Waits |
|---|---|---|---|
| **F.2** `◐` **— pulled forward** | File System Access: hold a live handle and say when the file changes underneath. Chromium only; the download path stays the fallback — **landed short (fallback proven)**: Chromium FS Access present; download fallback when the picker fails. **Left**: live bind + drift not proven under automation | `graph/store.ts`, `page/App.tsx`, `project.ts` | ⊘ |


## Wave 2 — the streams

| | Does | Owns | Waits |
|---|---|---|---|
| **D.2** | `vocabulary` becomes the list of packages a project uses, in import order. **Blocked** on terminal freeze + owns (the A0.2 bridge needs Clay) | `graph/types.ts`, `terminal/` | A0.3 |
| **E.4** | **Multi-select in the explorer tree** — blocks, branches and whole projects, across several projects at once. The selection `infer` takes; the canvas multi-selects already and the tree does not | `page/App.tsx`, explorer | ⊘ |
| **G.7** `◐` | The selection box takes things it does not enclose — **landed short**: an edge with only one end enclosed is not selected; click / Ctrl+A / Esc still behave (proven). **Left**: both-ends-in-box edge policy | `canvas/Canvas.tsx` | ⊘ |
| **G.9** `◆` | The context menu, and a trigger for it — selecting an element lists its actions in the tray. **Needs Clay**: the trigger is not designed — the right button is spent on direct creation, so the menu has no gesture left | `page/Contents.tsx`, `canvas/` | ⊘ |
| **F.3** `◐` | Export a rendered SVG beside the source — **landed short**: `svgOf` renderer landed (suite). **Left**: the download / export wire beside the source | `modules/view/diagram/` | ⊘ |
| **A.1** `◐` | The **table** view module — proxies drawn as rows — **landed short (suite only)**: `modules/view/table/`; App mounts it when `view.module` is `table`. **Left**: a browser prove | `modules/view/table/` | ⊘ |
| **A.10** | **`packages/behavior`** — the `action` and `state` definitions, and each module's words: what it calls an action, a state, a message, and **the verb a derived label opens with** (`do Pump`). Data only. **Ahead of A.7**: a module cannot tell an activity from a state, or label one, until these exist | `packages/behavior/` | ⊘ |
| **A.7a** | The **`infer` action** — a selection becomes one behavior block, in a named behavior project or a new one. One-way, deterministic over the selection; **re-inferring makes a new block**. Four ordering tiers, lanes from the ref, the abstraction cap; **writes home only what the structure stated**. Build against [behaviors.md](behaviors.md) | `actions/behavior.ts` | A.10, E.4, **S4.9** |
| **A.7b** | The **activity** view module — a behavior layer's default projection. Control nodes counted and drawn, guards as edge fields, groups as groups and lanes from the refs. **Derived labels draw dimmed**, as does inferred order — *the dimming device does not exist yet; `--muted` and `opacity` are the nearest idiom* | `modules/view/activity/` | A.7a, A.7c |
| **A.7c** | `view` gains a **default definition for a created block** and the **abstraction cap `N`** (default 5), so the module in scope decides what right-click makes and when the inference cuts higher in the tree. Beside "the module's word"; `table` and `matrix` answer too | `modules/view/` | ⊘ |
| **A.8** | The **state** view module — the same behavior layer drawn as states and transitions. Draws empty where nothing has been inferred and **offers the inference**; `infer` over actions is what fills it. Reading A or B per [behaviors.md](behaviors.md) | `modules/view/state/` | A.7b |
| **A.9** | The **sequence** view module — a column per participant, order running down each. Explicit order from directed relations first, implied from position along the axis as the fallback | `modules/view/sequence/` | A.7b |
| **A.11** | **UML, SysML v2 and UAF** packages — tables of definitions, `names`, and mappings. Includes the ornament that used to be `figure`: a decision diamond, a fork bar as a thin `rect`, an initial node as a small filled `ellipse` — all shape + size on a definition | `packages/` | A.7b |
| **A.12** | The **IBD layout law** — rank by connectivity rather than containment, ports shown | `modules/view/diagram/` | ⊘ |


## Wave 3 — the rail

**Parked** — last, and the acceptance test for everything above. See tasks.md, stream Z, and
design.md under *The terminal*. Do not start while the graph model is still settling.

**The rail is not a command palette.** It is the app's single text entry point: natural language
over the workspace — making and changing things, and surfacing the documentation, packages and
definitions that bear on what is in front of you — and it adapts to how one person words things.
Ranked completion is the floor, not the ceiling. **It never changes context**: it ranks *against*
context, so the explorer and the pointer still navigate.

| | Does | Owns | Waits |
|---|---|---|---|
| **Z.1** | Collapsed mode: rank what is available in the current context against what is typed | `terminal/` | S1.7, everything in Wave 2 |
| **Z.2** | Arrow keys move the highlight; `Enter` confirms it; overruling it is the feedback | `terminal/` | Z.1 |
| **Z.3** | Two-tier learning — the literal entry remembered, the situation's shape weighted. Local, never logged | `terminal/` | Z.2 |
| **Z.4** | Expanded mode: the next question worth answering, and nudges | `terminal/` | Z.1 |
| **Z.5** | The tutorial, walked over a sample project | `terminal/`, `samples/` | Z.4, H.1 |
| **Z.6** `◆` | Surfacing documentation, packages and definitions, keyed to context. **Needs Clay**: where the text lives, and how it is keyed | `terminal/` | Z.4 |
| **Z.7** | The rename, once all of it is built | everywhere | Z.6 |
| **Z.8** | **Natural language over the workspace** — a sentence that makes or changes rather than naming one action. Never moves context. The scope of this row is not settled; it is the half that makes the rail more than completion, and **the one part that may not be client-side** — the app must work with it unavailable | `terminal/` | Z.1, Z.4 |


## Not in the queue

Recorded in [tasks.md](tasks.md) and deliberately unscheduled: translators and code generation,
local variation on a proxy for multi-user work, the cluster spacing tier, and the README rewrite
that waits for all of this to land.

**A VS Code host** — design.md, *The browser is the product; another host is a shell*. The web app
stays primary; an editor-hosted version is a second host for the same app, for people who would
rather not use a browser. Not scheduled, and no row waits on it.

**Export destinations** — design.md, *Where a project lives, and where it can be sent*. Storage
stays browser-local and client-side; what import/export gains is somewhere to send a file: local
disk (that is F.2) and a cloud drive. No cloud home, no sync, no server. Not scheduled.
