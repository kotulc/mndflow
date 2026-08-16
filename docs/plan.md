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

**Clay-free gaps left:** that `F.2` short, **D.2** (now unblocked), **G.9a–d**, all of **Wave U**,
and **Wave Z** (unparked, queued behind Wave 2). `infer`'s trigger is G.9b and needs no row of its
own.

**Cheapest first in Wave U:** `U.17` (space between projects) and `U.2` (the glyph vocabulary) are
both `⊘` and unblock others — U.2 is what U.9 and U.15 stand on. Everything else in the wave either
waits on G.9 or queues behind `page/Files.tsx`.

**No `◆` row is left in the queue.** G.9d is settled — the target decides — and `Z.6` is answered:
documentation lives in `samples/docs.json`, keyed by the terms in
[definitions.md](definitions.md), hand-authored and with no generator.


## Next

| | Does | Owns | Waits |
|---|---|---|---|
| **F.2** `◐` **— pulled forward** | File System Access: hold a live handle and say when the file changes underneath. Chromium only; the download path stays the fallback — **landed short (fallback proven)**: Chromium FS Access present; download fallback when the picker fails. **Left**: live bind + drift not proven under automation | `graph/store.ts`, `page/App.tsx`, `project.ts` | ⊘ |


## Wave 2 — leftovers

| | Does | Owns | Waits |
|---|---|---|---|
| **D.2** | `vocabulary` becomes the list of packages a project uses, in import order. **Unblocked — the terminal is no longer frozen**, so the A0.2 seeding bridge (`workflows.ts` → `Domain.relations`, still minting local `set_def` copies) is retired with it | `graph/types.ts`, `terminal/`, `workspace/` | A0.3 |
| **G.9a** | **The offered-action list.** One set of what the selection can do in the current context — **the same list for the menu and the rail; only the presentation differs.** Order is the presenting surface's business, not the list's: the menu takes a **fixed** order, the rail orders by **learned preference for that context** (Z.3). **It may not live in `terminal/`** — the menu would then need the rail, and S6.3's acceptance test (delete `terminal/`, everything still runs) would break. It ranks over the action registry, so it belongs beside it | `actions/offer.ts` | ⊘ |
| **G.9b** | **Right-click in the explorer** opens that list, in fixed order. The explorer's right button is unbound, so this half needs no gesture decision. **This is `infer`'s trigger**: with the explorer as context and one or more blocks or projects selected, `infer` is one of the offered options — so it needs no gesture of its own, and A.7a stops being unreachable | `page/Files.tsx` | G.9a |
| **G.9c** | **Clicking anywhere in the rail** puts the caret in it — type to filter the same list, arrow keys move the highlight, `Enter` takes it, ordered by learned preference. This is Z.1/Z.2 arriving early. **The rail stays optional**: it consumes G.9a's list and owns none of it, so removing `terminal/` costs the menu nothing | `terminal/` | G.9a |
| **G.9d** | **Right-click on the canvas — settled: the target decides.** Right-click on **empty space keeps creating**, exactly as today; right-click on **something that already exists** (card, frame, edge, selection) opens the list for it. So *the right button makes something new* still holds where there is nothing, and becomes *show me what this can do* where there is something. `card→interface`, `frame→interface`, `edge→retype` and `selection→group` stop being immediate and become entries in the list. **Right *drags* are untouched** — card-to-card still draws a relationship, empty still makes a note — because `gestures.ts` already separates a drag from a click by distance | `canvas/gestures.ts`, `modules/view/diagram/` | G.9a |


## Wave U — the shell

The page does not survive a narrow window: crumbs and the option groups collide, the explorer eats
the width at high zoom, and the chrome icons are hard to tell apart. Reasoning in design.md under
*The shell yields; the stage does not*; the detail in tasks.md, stream **U**.

**U owns chrome, not the diagram's visual language.** A card, a route and a frame stay the
engine's. **U.11 reaches `page/Relations.tsx`, which is stream E's** — it deletes the file rather
than editing it, so take it when E is quiet.

**`page/Files.tsx` is the contended file of this wave** — six U rows and G.9b all reach it, the way
`Canvas.tsx` and `Contents.tsx` were contended before their seams. Nothing here cuts a seam for it;
it is 600 lines and this wave will grow it. **Take it in one order**: `G.9b → U.17 → U.3 → U.12 →
U.14 → U.2 → U.8`. Spacing first because it is free and stands alone, the right-click list before
anything that offers entries into it, and the `＋` after the layout is settled.

**Two rows reach storage, and storage is where the suite just failed.** U.13 clears the keyed
slots and U.14 creates a project; the import-never-stored bug lived in exactly that gate, and 401
tests asserted the wrong behaviour was right. Both rows want an **outcome** test — *what a project
holds survives being saved and read back* — in `tests/graph/store.test.ts` and
`tests/workspace.test.ts`, not another assertion about the gate's internal rule.

| | Does | Owns | Waits |
|---|---|---|---|
| **U.1** | **Header overflow.** Crumbs truncate and the interface / relationship option groups collapse instead of overlapping. The stage keeps its room | `page/App.tsx`, `src/styles.css` | ⊘ |
| **U.2** | **One glyph vocabulary for the whole app** — header, explorer and canvas, distinguishable at a glance. **The rule is that no mark means two things**: today `·` is *interfaces off*, *all types* and *no axis*; `▦ ▤ ▥` are three near-identical hatched squares; `⊙` and `◌` are the same circle for *radial* and *relax*. The foundation U.9 and U.15 both build on. Not definition icons, which are stream E's | `page/App.tsx`, `page/Files.tsx`, `modules/view/diagram/chrome.tsx`, `src/styles.css` | ⊘ |
| **U.3** | **The explorer bounds itself and holds several projects legibly** — a width cap, collapsible, readable at high zoom | `page/Files.tsx`, `src/styles.css` | G.9b |
| **U.4** | **Theme toggle** — the current theme stays default; **modern (blues)** and **light** join it. Chrome only: root `styles/` is the `style` component's per-definition presentation and is **not** touched | `src/styles.css`, `page/App.tsx` | ⊘ |
| **U.5** | **Rail collapsed form** — a minimal text entry with inline chip options, and an expanded layout to match. **Style and layout only**; click-to-focus is G.9c's | `terminal/`, `src/styles.css` | G.9c |
| **U.6** | **The rail caret sits where the text cursor is.** A rendering bug in the existing rail, not new behaviour | `terminal/`, `src/styles.css` | G.9c |
| **U.7** | **Table and matrix as panel surfaces modelled on Contents** — both open partially, as the panel does now, and expand to the full canvas. **A.1's parked table chrome** (crumbs / types) lands here. Contents itself is the model and is **not** deleted | `modules/view/table/`, `modules/view/matrix/` | ⊘ |
| **U.8** | **The view toggle** — a labelled control beside the project root, listing the three views the project kind offers. **Sticky per project**, so descending keeps it. **Writes nothing**: a display preference, like `showPorts`. The definition's `view.module` says how a layer *opens*; this says what is shown *now* | `page/Files.tsx`, `page/App.tsx` | U.3, U.9 |
| **U.9** | **A distinct icon per view module** — the six. Becomes U.8's glyph and is what makes a shrunken explorer readable | `modules/view/`, `src/styles.css` | ⊘ |
| **U.11** | **Remove the readout entirely** — the header's *"Show relations, actions and matching"* toggle ([App.tsx:520](../src/page/App.tsx#L520)) and all three tabs: `Readout.tsx`, `Relations.tsx`, `Log.tsx`. **Confirm before deleting**: `Relations.tsx` is today's only add / rename / drop for relation kinds, and Contents must already cover it as definition editing (E.1). Action history returns another way — future work, not this row | `page/App.tsx`, `page/Readout.tsx`, `page/Relations.tsx`, `page/Log.tsx`, `src/styles.css` | ⊘ |
| **U.12** | **Undo and redo read as text**, at the foot of the explorer, with **one line naming the last executed action**. They leave the header's `↤` / `↦` glyph pair. The foot of the explorer is always visible, so `Log.tsx`'s rule — *reaching them never means opening anything first* — still holds | `page/Files.tsx`, `page/App.tsx`, `src/styles.css` | U.11 |
| **U.13** | **The header clears the session and starts a new workspace.** Today's `＋` ([App.tsx:511](../src/page/App.tsx#L511)) is `project.reset` — one project, discarded, behind a confirm. It becomes **workspace-scoped**: drop every open project and the workspace with them. `workspace.blank()` already mints the empty `Held`, so the work is clearing the keyed project slots and the session pointer. Bigger and more destructive, so **it reads as a word rather than a glyph** — the same move U.12 makes for undo/redo, and the right one for a rare destructive control. Keeps its confirm | `page/App.tsx`, `graph/store.ts`, `src/styles.css` | ⊘ |
| **U.14** | **The explorer's `＋` adds a project to the workspace** — a workspace operation the way unlock and fork are (S4.8), not a registry action. **It opens the name prompt, and the project exists once it is named** — design.md, *a project comes into being by being named*. It must **not** mint an id and admit a blank: that is the silently-minted session project that was just removed as a bug, arriving by another door. The name is required and unique, enforced on the way in. **Blocks keep a one-click path**: the `＋` follows the selection the way the canvas right button does (G.9d, *the target decides*) — a project or nothing selected makes a **project**, a block selected makes a **block** under it. The tooltip names which, so the meaning is never hidden. Right-click in the explorer (G.9b) offers both regardless | `page/Files.tsx`, `workspace/` | G.9b |
| **U.15** | **The canvas options get one design language**, in **vertical groups** — *interface*, *relation*, *flow*, *arrangement*. Today `Toggles` mixes three idioms with no rule: three controls carry a glyph **and** a word (`□ interfaces`, `— plain`, `· types`), two carry a glyph **only** (`⌐`/`~`, the three axis marks), and states are drawn both as one cycling button **and** as a radio row. **Every control carries a word**, with the glyph as a scanning aid — the direction U.12 and U.13 already take. Depends on U.2 for marks that differ | `modules/view/diagram/chrome.tsx`, `src/styles.css` | U.2 |
| **U.16** | **Arrangements move to the frame's context list** — `grid` / `radial` / `across` / `down` / `relax` leave the bar. They are one-time **verbs** over the whole layer, and **the frame is the layer**, so G.9d's *the target decides* already routes them: right-click the frame, get the things you can do to it. This is what keeps design.md's *toolbars divide by states against verbs* true once the bar is grouped by subject — the verbs leave the bar rather than sitting in a fourth group | `modules/view/diagram/chrome.tsx`, `canvas/gestures.ts` | G.9d, U.15 |
| **U.17** | **Projects are told apart in the explorer** — space between them, so several open projects read as several rather than as one long tree. The cheapest half of what U.3 is for, and it stands alone | `page/Files.tsx`, `src/styles.css` | ⊘ |


## Wave 3 — the rail

**Unparked** — the rail was unfrozen with S6 and is detachable now. It is **queued behind Wave 2**
rather than parked: Z.1's ranking reads a surface Wave 2 is still moving, so building it first means
building it twice. **Z.2 and Z.3 are self-contained and may go early.** G.9c is Z.1/Z.2 arriving
ahead of schedule and does not replace them. See tasks.md, stream Z, and design.md under *The
terminal*.

**The rail is not a command palette.** It is the app's single text entry point over the workspace,
ranking and completing what the context offers and surfacing the documentation that bears on it,
adapting to how one person words things. **It never changes context**: it ranks *against* context,
so the explorer and the pointer still navigate. **As scoped it is wholly client-side.**

| | Does | Owns | Waits |
|---|---|---|---|
| **Z.1** | Collapsed mode: rank what is available in the current context against what is typed | `terminal/` | S1.7, everything in Wave 2 |
| **Z.2** | Arrow keys move the highlight; `Enter` confirms it; overruling it is the feedback | `terminal/` | Z.1 |
| **Z.3** | Two-tier learning — the literal entry remembered, the situation's shape weighted. Local, never logged | `terminal/` | Z.2 |
| **Z.4** | Expanded mode: the next question worth answering, and nudges | `terminal/` | Z.1 |
| **Z.5** | The tutorial, walked over a sample project | `terminal/`, `samples/` | Z.4, H.1 |
| **Z.6** | **Surfacing documentation, keyed to context — settled.** The text lives in `samples/docs.json`, keyed by the terms in [definitions.md](definitions.md). **Hand-authored, starting small, and no generator** — deriving the file from definitions.md is the unasked-for build step to avoid. Shares `samples/` with stream **H**, so the two serialise | `terminal/`, `samples/` | Z.4 |
| **Z.7** | **No rename.** `rail` stays the word in the code and throughout the docs; **"Page Intelligence"** is the user-facing label and nothing more. The row costs a string, not a refactor | `page/`, `terminal/` | Z.6 |
| **Z.8** | **One documentation hit in the ranked list, always last.** The list is the offered actions (G.9a) plus at most a single doc result, chosen on the most relevant keyword and never displacing something actionable. **A lookup and a sort, so wholly client-side** — the old "may not be client-side" caveat retires with the natural-language half, which is now recorded under *Out of scope* in tasks.md | `terminal/` | Z.1, Z.6 |


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
