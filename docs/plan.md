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

**Pulled forward: `F.2` `◐`** — live FS Access bind+drift still unproven under automation
(download fallback proven). Close that gap, or leave the row parked.

**Clay-free gaps left:** that `F.2` short, **D.2** (now unblocked), **G.9a–c**, the `infer`
trigger, and **Wave Z** (parked). **`◆` rows need Clay before any code**: `G.9d` (the canvas right
button is already spent), `Z.6` (where documentation lives).


## Next

| | Does | Owns | Waits |
|---|---|---|---|
| **F.2** `◐` **— pulled forward** | File System Access: hold a live handle and say when the file changes underneath. Chromium only; the download path stays the fallback — **landed short (fallback proven)**: Chromium FS Access present; download fallback when the picker fails. **Left**: live bind + drift not proven under automation | `graph/store.ts`, `page/App.tsx`, `project.ts` | ⊘ |


## Wave 2 — leftovers

| | Does | Owns | Waits |
|---|---|---|---|
| **D.2** | `vocabulary` becomes the list of packages a project uses, in import order. **Unblocked — the terminal is no longer frozen**, so the A0.2 seeding bridge (`workflows.ts` → `Domain.relations`, still minting local `set_def` copies) is retired with it | `graph/types.ts`, `terminal/`, `workspace/` | A0.3 |
| **G.9a** | **The offered-action list, below the rail.** One ranked list of what the selection can do, consumed by the rail *and* the menu. **It may not live in `terminal/`** — the menu would then need the rail, and S6.3's acceptance test (delete `terminal/`, everything still runs) would break. Ranking over the action registry belongs beside the registry | `actions/offer.ts` | ⊘ |
| **G.9b** | **Right-click in the explorer** opens that list. The explorer's right button is unbound, so this half needs no gesture decision | `page/Files.tsx` | G.9a |
| **G.9c** | **Clicking anywhere in the rail** puts the caret in it — type to filter the same list, arrow keys move the highlight, `Enter` takes it. This is Z.1/Z.2's behaviour arriving early, and the rail is where it belongs | `terminal/` | G.9a |
| **G.9d** `◆` | **Right-click on the canvas** opens the same list. **Still needs Clay**: right-click is bound to five creation gestures today — `empty→create`, `card→interface`, `frame→interface`, `edge→retype`, `selection→group`. One has to move, or the menu needs a different gesture on the canvas. **G.9b and G.9c do not wait on this** | `canvas/`, `modules/view/diagram/` | G.9a |


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

**The IBD layout law** (was A.12) — **dropped**: the view inside a child block already *is* an
internal block diagram, so no separate law or view module is wanted. Kept as something to expand on
later only if connectivity-ranked placement proves worth having on its own.

Recorded in [tasks.md](tasks.md) and deliberately unscheduled: translators and code generation,
local variation on a proxy for multi-user work, the cluster spacing tier, and the README rewrite
that waits for all of this to land.

**A VS Code host** — design.md, *The browser is the product; another host is a shell*. The web app
stays primary; an editor-hosted version is a second host for the same app, for people who would
rather not use a browser. Not scheduled, and no row waits on it.

**Export destinations** — design.md, *Where a project lives, and where it can be sent*. Storage
stays browser-local and client-side; what import/export gains is somewhere to send a file: local
disk (that is F.2) and a cloud drive. No cloud home, no sync, no server. Not scheduled.
