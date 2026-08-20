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
`⚠` marks one **stream `B` changed the shape of** — the want stands, the mechanism named in the row
does not. Read the note before building it.

**A row is done when** the suite and `tsc` pass, the app has been driven in a browser
(`.claude/skills/run/SKILL.md`), spec.md and tasks.md say what is now true, and the row is
annotated here with one line on what actually landed (or `◐` with the gap named). See
[CLAUDE.md](../CLAUDE.md). Do not move rows into `landed.md` during a sitting.

**A row being done does not finish a *story*.** A story is a goal somebody has; it spans several
rows, and **only Clay closes it**, after driving it himself. See *Stories* below — rows land, the
story gets closer, and a green suite never closes one.

**A row that landed short stays here as `◐`.** The rest of it is still work.


## Stories

**A story is a goal somebody has, not a chunk of work.** Rows say what to build; a story says what
has to be *true for a person* before any of it counts. One story spans several rows and often
several waves.

**A story is finished only when Clay says it is.** Rows land the ordinary way — suite, `tsc`, the
browser drive, docs. **That makes the row done and the story only closer.** When every row under a
story has landed, it goes to Clay to be driven, and he closes it or sends it back with what is still
wrong. **Nobody else marks a story done**, and a green suite never does.

**Why**: every real defect this project has had came from driving the built app, not from the suite —
and a row can land exactly as written while the thing it was part of is still unusable. `V.14`'s
`＋` did name a project, correctly, behind a gesture nobody could see. The rows were done; the story
was not.

| | The goal | Rows | State |
|---|---|---|---|
| **ST.4** | **One block, and everything else is data.** Make a folder, a view, a note, a script and a behavior without the app ever asking which *sort* of thing you mean — because there are no sorts. Drag blocks from three projects into a view, pin it, and come back to it. **This is the primary story and everything else waits behind it** | `B.0` ✓ `B.1` ✓ → `B.26` | **two landed, `B.1` needs driving.** design.md *The simplified block model* and *The three tiers*; vocabulary in [definitions.md](definitions.md). Nothing gated — `B-g`…`B-j` answered 2026-08-19 |
| **ST.1** | **Reorganising is easy.** Move a block anywhere it could sensibly go — into another branch of the same project, into a different project, or out to the workspace — and see where it is going to land while dragging. Nothing announces itself afterwards, because the move was obvious as it happened | `P.1` ✓, `P.13` ✓, `P.14` ◐, `P.15` ✓ | **all rows landed — not closed.** Needs Clay to drive it, and `P.14` landed short of *beside* |
| **ST.2** | **A saved view is worth saving.** Pick a cross-section of several projects, keep it, name it, come back to it, and read it as a requirements table or an allocation matrix | `P.4` ✓, `P.5`, `P.7` ◐, `P.8` ✓, `P.9` | `P.7` and `P.8` landed — a set takes drops from three surfaces and a table chooses its columns. **`P.7` short**: a cross-project proxy has no label yet, which this story cannot close without |
| **ST.3** | **Nothing is unreachable.** Every kind of thing the app can hold can be made from the app: a project, a set, a behavior. None of them needs an invisible gesture or an import | `P.2` ✓, `P.3` ✓, `P.6` ✓, `P.10` ✓ | **all rows landed — not closed.** Needs Clay to drive it |


## B — the simplified block model

**Settled 2026-08-18 (Clay), and it supersedes stream `P`'s derivation rule.** The reasoning is
[design.md](design.md) under *The simplified block model*; the vocabulary is
[definitions.md](definitions.md); the pre-rework glossary is archived at
[definitions-legacy.md](definitions-legacy.md) and **nothing may be built from it**.

**In one table**, because every row in this stream is one line of it:

| Was | Is | Because |
|---|---|---|
| four element forms (`block` `note` `group` `proxy`) | **no forms** — one block | none of them passed the *a form is earned* test |
| a sort of thing is a form | a sort of thing is a **definition**, in a shipped locked `base` package | a definition is data, which was the second goal all along |
| `proxy` | **reference** | one word was doing five jobs, and a sixth in the SysML map |
| `ref`, the value form | **`link`** | it collided with the reference block. *A reference is drawn, a link is not* |
| the `reference` relationship form | an ordinary relationship reaching a reference | it was only ever derived from what sat at the end |
| `parent` vs a proxy's `of` | **`part`** vs **`reference`** | ownership, not distance. The one distinction every notation draws |
| `set`, derived from mixed children | **`folder`**, an ordinary definition | mixedness was never the signal, and *set* collided twice over |
| `kind` (`structure` / `behavior`), derived per layer | **nothing** — behavior is one package plus three view modules | the engine branched on something the glossary said did not exist |
| `layerKind` decides which modules are offered | the definition's **`view` component** does | it is what closes `P.6`'s one-way door instead of working around it |

**The base package**, and the rule that stops it becoming forms again:

| Definition | Holds |
|---|---|
| `structure` | parts, and references. The default |
| `view` | **references only — the engine enforces this**, and it is the one thing it enforces |
| `resource` | content, no children — a file, a script, a data file, an image, a note |
| `folder` / `group` / `note` | extend the three above |

> The engine may key off a base definition **only for how a block draws and where it sits**. Never
> for what it is, and never for what may contain what — that is a `holds` rule, which is data.

**A view holds views**, so a matrix's two axes are child views and a filter or a nesting costs
nothing new. **A reference carries a `depth`** (`self` / `children` / `all`), which is what makes
dragging a whole project into a view give you its blocks as rows, live. **A view block's
configuration is its content**, not its presentation — *presentation lives on the definition* still
governs how the view block itself draws.

**What this stream retires from the queue**, so nothing is built on it:

| | Why it goes |
|---|---|
| `P.5`'s mixed-children → `set` reading, and `role_set` | folder is a definition; mixedness signals nothing |
| the *kind signal* repair (`layerKind` hardcodes `packId("behavior")`) | there is no kind to signal |
| the *kind by fiat* repair (`childKind` reads `viewOf(...).module`) | the `view` component is the answer, not the workaround |
| `P.6` entirely (already `SUPERSEDED`) | the door it opened has nothing behind it |
| `S8.3` *the glossary is distilled* | **done** — 149 terms to 75, this sitting |

### The three tiers, settled 2026-08-19

| | Contains | Owns | Holds |
|---|---|---|---|
| **workspace** | projects, packages, folders — never owns them | nothing | **the log**, the metadata, and **all display state** (explorer fold, canvas toggles, last view per layer). Its graph stops at project roots |
| **folder** | anything; its children are independent roots | nothing | — |
| **project** | — | **a graph of blocks** | nothing about how it is shown |

**Contains is derived, not stored**: filing a block makes it a root, so *contained* means *the child
is a graph root* and *owned* means everything else. **One log, at the workspace**, so undo is
workspace-wide — the workspace is the page and everything on it.

**Every block names a block module** (code: its configuration surface and engine behaviour) and may
name a **view module** (defaults to the block view). A package subtypes base definitions freely and
may never add a module.

**A resource is a workspace-relative path or link.** Embedded images, video and data are a later
story. **A pattern package** — template blocks to copy and customise — is a later story too.

### Rows

**Order, not commitments.** `B.0` comes first because the size of everything after it is currently
a guess. **Nothing else is gated** — `B-g` through `B-j` were all answered on 2026-08-19.

**One migration, at the end.** `B.6` changes the element record, `B.8` changes where the log lives,
`B.19` changes how ids are minted, and `B.11`–`B.15` change what a definition carries. They are
migrated **once**, in `B.17`, rather than six times — which is why it is last and why none of them
may ship without it.

**Ids are stable; the order is the table.** Rows were added as the design settled, so the numbers do
not run in order. Read top to bottom and follow *Waits*.

**`B.19` is a prerequisite for `B.8`, not a nicety.** One log cannot hold two elements with the same
id, and ids are project-scoped today.

| | Does | Owns | Waits |
|---|---|---|---|
| **B.0 ✓** | **Count the branches — done 2026-08-20**, table in [tasks.md](tasks.md). **What it changed**: `B.6` is far smaller than feared (only **29** of 76 `form ===` comparisons are element forms; the rest are field and relation forms, which survive), `B.3` is 85 lines and 4 call sites, `B.19` is **one function** (`newId`, whose own comment already warns a collision *silently fuses two elements into one*), and `B.1` is confirmed biggest-by-count and safest-by-risk at **144** mentions across 26 files. `graph/fold.ts` carries 27 of them and is also the heart of `B.8`, so `B.1` first genuinely clears the way | `docs/tasks.md` | ✓ done |
| **B.1 ✓** | **`proxy` → `reference`, mechanical.** The rename only — `form: "proxy"` stays a form for now. Biggest site count, no design risk, and it stops every later row fighting two names **Landed (not driven)**: 182 occurrences across 33 files under `src/` and `tests/`, plus the prose in spec.md and actions.md. `isProxy` → `isReference`, `proxyIn` → `referenceIn`, `ProxyTarget` → `ReferenceTarget`, `withProxy` → `withReference`. **Every schema token was guarded and survives**: 61 `"proxy"` form values, `ElemForm`, and `add_element{proxy}` — those are `B.6`/`B.17`'s. **One collision the row did not predict**: `isProxy` renamed onto an existing `isReference(graph, edge)`, the predicate for *this relationship reaches a proxy*. The edge predicate became **`reachesReference`**, which is what it actually says; no behaviour changed. `tsc` clean, **37 files / 685 tests green**. **Needs a browser drive** — it touched `canvas/gestures.ts`, `page/` and four view modules | `src/`, `tests/` | B.0 |
| **B.2** | **Ship the `base` package and the block-module registry.** `workspace` / `project` / `folder` / `structure` / `view` / `resource` / `group` / `note` as definitions, each naming a module. Published in `modules/base.ts`, read by nothing yet | `packages/base/`, `src/modules/` | B.0 |
| **B.3** | **Delete the kind derivation.** `page/kind.ts` goes; which view modules a layer offers comes from the definition. Closes `P.6`'s one-way door and defects `1b`–`1h` at once | `page/kind.ts`, `page/App.tsx`, `page/Files.tsx` | B.2 |
| **B.4** | **`folder` becomes a definition**, `role_set` → `role_folder`, and the mixed-children reading comes out | `page/Files.tsx`, `src/modules/icons/` | B.2 |
| **B.5** | **`part` and `reference`, and contains is derived.** Two stored links; *contained* is *the child is a graph root*, so filing a block promotes it and nothing new is stored | `src/graph/`, `graph/check.ts` | B.2 |
| **B.6** | **Forms collapse.** `note` and `group` become base definitions; `form` leaves the element record. The largest row, and what `B.1`–`B.5` exist to make safe | `src/graph/types.ts`, the door | B.5 |
| **B.7** | **`ref` value form → `link`.** Small and independent; any time after `B.1` | `src/graph/`, `packages/` | B.1 |
| **B.8** | **One log, at the workspace.** Undo becomes workspace-wide, which is the intent. Dissolves `Effect.into`, `writeInto`, the `home` batches and `P.11`'s test; a project export becomes a query over the log and a per-project fold leans on checkpoints. **Sized only after `B.0`**, and **`B.19` must land first** — one log cannot hold two elements with the same id | `workspace/`, `src/graph/`, `project.ts` | B.0, B.19 |
| **B.9** | **Display state moves to workspace metadata** — explorer fold, canvas toggles, and which view each layer was last shown in. Reopening a workspace finds every project as it was left; an exported project carries no opinion about how it is drawn. **Reverses `U.8`'s `localStorage` on purpose** | `page/`, `workspace/` | B.8 |
| **B.11** | **One arrangement, six values, absorbing `axis` and `flow`.** `free` / `grid` / `right` / `left` / `down` / `up`; the four directional ones carry the reading direction. **Model data, in the log** — inference reads it, and an inference is permanent. **`radial` is dropped** (narrow, wrong-looking outside a hub and its attendants) and **`relax` is retired outright** — the action, the `relax_layer` mutation op and its `fill.ts` entry all go, since *hand it back to automatic* has nothing left to mean once arrangement is a setting. **Named loss**: nothing clears hand placement any more. **Watch**: `implied order` is read along it, so `A.9`'s sequence and `A.7b`'s activity must keep their fallback, and **tier 3 must stop firing under `free` and `grid`** | `src/graph/`, `actions/layer.ts`, `geometry/layout.ts` | B.0 |
| **B.12** | **Arrangement becomes a setting**, not a one-time action. **Reverses *an arrangement is never a mode*** — deliberately, because `relax` cannot be anything else. **`at` is never discarded**: a computed arrangement replaces where things draw, and returning to `free` returns the layout (*retained placement*, already the rule) | `actions/layer.ts`, `modules/layout/`, `page/Rail.tsx` | B.11 |
| **B.13** | **`derived` as a relationship flag.** Not in the log, recomputed on fold, not deletable. The relation module set stays `line` / `directed`. First consumer is the workspace's project-to-project dependencies, which are drawn today and stored nowhere | `src/graph/`, `workspace/` | B.5 |
| **B.14** | **An interface is declared, not derived.** Retire the `side` derivation; `side` becomes only where it sits. Reaches `promotion`, which was already the explicit act | `src/graph/`, `modules/view/diagram/` | B.6 |
| **B.15** | **View definitions become their own records** — a **view subtype**: one required view module plus its options, reusable rather than copied into every definition. A block definition carries **`views`, an ordered list of them, first entry the default** — one field, because which view opens is a presentation detail. The base package ships a trivial view definition per module so every entry is the same kind of thing | `src/graph/types.ts`, `src/modules/view/` | B.2 |
| **B.16** | **The module schema is enforced at import, and an unknown module reports a fault.** A definition must match the registered option surface of the module it names; a module the build does not know falls back to the base block **and says so**. Never silent — a file from a newer build must not open looking subtly wrong with nothing to explain it | the door, `graph/check.ts` | B.2, B.15 |
| **B.19** | **Ids become globally unique, before the log moves.** Today an id is unique *within a project* and a cross-project reference is a path (`proj_a9f/def_pump`), which worked because each project had its own log. **One log cannot carry two elements with the same id**, so a mutation would have to name a project on every op. Mint with enough entropy instead and a path becomes a readability aid rather than a resolution rule. **It also kills the bare-versus-path ambiguity** that produced `P.7`'s refused drops and defect **2b**, where a moved subtree's local references silently re-pointed at the destination | `src/graph/`, `workspace/`, the door | B.0 |
| **B.20** | **A `resource` block carries a workspace-relative path or link**, and the explorer and canvas draw one. A file, a script, a data file, an image, a note. **Embedded content is out of scope** — a path only, so the log never carries bytes | `packages/base/`, `src/modules/`, `page/Files.tsx` | B.2 |
| **B.21** | **A view holds views, and a reference carries `depth`.** A matrix's two axes are child views; `self` / `children` / `all` says how far each reference reaches, which is what makes dragging a whole project in give you its blocks as rows and keep them live. **`ST.4`'s payoff, and it needs `B.6` under it** | `src/modules/view/`, `src/graph/` | B.6, B.15 |
| **B.22** | **Pin a layer view as a view block.** A pin at the canvas's top right; the block holds references to what is on stage, names the view definition in force, and is filed like anything else. **The other half of `ST.4`'s payoff** — `P.4` made a set from the explorer, this makes one from what you are looking at | `canvas/`, `src/actions/`, `src/modules/view/` | B.21 |
| **B.23** | **Wire `create` and `infer` to `word` and `creates`.** Parked since **A.7c** — `ViewModule` carries both and nothing reads them, so a right-click in an activity makes a plain block rather than an action. Not a new capability; a wire that was never run | `src/actions/`, `src/modules/view/` | B.15 |
| **B.24** | **Filing a block promotes it.** The rule `B.5` derives *contained* from — dragging a loose block into a folder or onto the workspace retypes it to `project`, dragging it into a project files it as a part. **`P.14` already dissolved *beside*: every drop is *into* something**, so this is that rule finishing rather than a new gesture | `page/Files.tsx`, `src/actions/` | B.5 |
| **B.25** | **The explorer hides empty blocks.** Basic blocks, interfaces and references are usually empty, and hiding them is what makes a large tree readable. **A project or package root is always shown, even when empty.** Display state, so it lives in workspace metadata | `page/Files.tsx` | B.9 |
| **B.26** | **The fold merges checkpointed definitions with folded ones.** A package arrives as a checkpoint, not as steps, so its definitions are not in the workspace log — the fold has to read both. Checkpoints already carry a graph, so this is probably a merge and a lookup order, but *probably* is how the last two schema surprises started | `src/graph/fold.ts`, `workspace/` | B.8 |
| **B.18** | **View composition, on one metric: proximity.** How far apart two referenced blocks sit in the tree — same parent, same branch, same project, different project — **groups** by nearest common ancestor, **orders** by tree path, and **spaces** by distance where the view has room. Block takes all three; table and matrix take grouping and order and drop the spacing; matrix applies it per axis, each axis being a child view. A proximity group is a **derived group**, stored nowhere. **Nothing answers this today**, and it is what a view block full of distant references needs to be readable. Not `infer` — it makes no blocks and is recomputed every draw. **The default must be overridable**: a cross-cut view wants grouping by type, not by project | `src/modules/view/`, `geometry/layout.ts` | B.15 |
| **B.17** | **Migrate old files, once, covering every change in this stream.** Schema `1.2` writes `form: "proxy"` / `form: "note"` and a log per project. The door already heals a legacy domain stem, so heal there rather than bumping by fiat. **Nothing in this stream ships without it** — a build that cannot read yesterday's file is the one unrecoverable outcome in this stream | the door, `tests/` | every other B row |

**Still unscheduled**: generalised edges and anchor slots (port / interface lifted off the frame
edge), multi-select inference, pattern packages, a behavioural gamification
and a behavioural gamification package. Both are in [tasks.md](tasks.md) under the block model
questions. *The explorer's show/hide-empty-blocks filter became `B.25` and the resource path became
`B.20`, so neither is unscheduled any more.*

**No longer held back**: the **pin** and **a view holds views** are now `B.22` and `B.21`. They are
`ST.4`'s payoff rather than its plumbing, so they sit after `B.6` — but they are the two rows that
make the story worth having, and leaving them unwritten made the stream look like plumbing alone. **`S8.2`** (`view` → `layer`,
257 sites) goes **last** — *view* has gained a third meaning and renaming into a moving target is
what made the first estimate expensive.


## What is startable now

> **The queue below is pre-rework.** On 2026-08-18 Clay settled the simplified block model (stream
> **B**, story **`ST.4`**), which supersedes stream `P`'s derivation and renames vocabulary every
> row below touches. **Nothing here is cancelled and nothing here should start** until the `B`
> ordering is agreed — a row landing in the old words is a row that has to be landed twice. The two
> exceptions are `T.3` and `T.5`, which own `tests/` alone, and `Y.10`, which is panel edges and
> touches no vocabulary.

**A sitting on 2026-08-17/18 worked the queue top to bottom**, then a second pass reworked `P.6` on
Clay's settled derivation rule. **A third pass on 2026-08-18 landed five more rows — `W.1a`, `W.3`,
`P.7 ◐`, `P.8`, `X.2 ◐` — and drove every one of them in a browser**, which is the first time
anything in this wave has been. `tsc` is clean; the suite is **37 files / 685 tests**.

**What driving turned up**: `refer` had never accepted the cross-project ref `P.1` started handing
it, so *every* explorer drag onto a canvas has been refused since; and the tray shutting on any
outside click was quietly hiding three other rows' work.

**Still not driven**: everything the two earlier passes landed. That, and the rows below.

### Rows still to do — 9

| | Rows | Note |
|---|---|---|
| **Never started** | `X.3` | a typed name on the strip; `fold.defineNamed` already mints one, so this is a surface over a built capability |
| **Freed by what landed** | `P.9` | `P.7` landed, so its blocker is gone; `P.9` and `W.4` ✓ must not give two answers to *which kinds* — and it is a **design decision**, not a queued chunk: one axis group or two, and what an overrule means there |
| **Untouched** | `Y.10`, `T.3`, `S7` | `T.3` has its harness (`T.5` ✓); `S7` stays last so it splits a finished `Files.tsx` |
| **The rename pass, last** | `S8.1` → `S8.2` → `S8.3` | `S8.2` renames 257 sites and collides with every feature row. `S8.1` is smaller than its row says — `contextId` is in `App.tsx` alone, and `src/project.ts` does not contain it |
| **The two ◐ this pass left** | `P.7`, `X.2` | a cross-project proxy draws as *missing* (tasks.md **15**); the relation group is capped but not ranked, and the edge menu is still not a consumer (**17**, **18**) |

### Repairs owed on rows that landed — 3

| | What | Why it is owed |
|---|---|---|
| ~~**kind signal**~~ | ~~`layerKind` hardcodes `packId("behavior")`~~ | **dissolved by `ST.4`** — there is no kind to signal. It comes out with the derivation, not as a repair |
| ~~**kind by fiat**~~ | ~~`childKind` reads `kindOf(viewOf(...).module)`~~ | **dissolved by `ST.4`** — the `view` component answers *which modules apply*, which is the only question that was ever being asked |
| **seeded block** | a new behavior project holds one **unnamed** block | derivation needs a child, but an empty label is an invented behaviour |

~~**`R.9` element vocabulary**~~ — **closed by `X.2`**: `App.tsx`'s `kindsInScope` hands the strip
both halves of the vocabulary, packages included.

### Waiting on Clay — 1

**Bug 2, the matrix's partial tray.** `full` currently means two things — *no partial expansion* and
*Contents becomes the stage*. Table wants both; matrix wants only the first. **(a)** matrix suppresses
the tray entirely (loses field editing without leaving matrix view), or **(b)** matrix keeps the tab
but only shut-or-full. Not written either way.

### Bugs found on the way — 25, one fixed

All in [tasks.md](tasks.md) under *Found while working the queue*. **7** is closed (`X.2` folded the
duplicated weighting into `feedback.weights`); **15–18** are new from this pass, and **16** is worth
Clay's eye: `Y.6a`'s export-look controls were **reverted in `683676d`** and left their doc comments
behind, so the row reads as landed while the code is gone. **Three still matter most**: `onMove`
**writes to the wrong project's log** when a drag happens inside a project that is not in context —
silent corruption, the class `R.10` already cost once; a minted **`set` project has no name** and
skips the uniqueness check `workspace.begin` enforces; and a moved subtree's **local proxies silently
re-point** at the destination project. None is any row's work.

**Stories.** `ST.1` and `ST.3` have every row landed. **That does not close them** — both need Clay to
drive them, and `P.14` is settled rather than built out (*beside* does not exist).


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
| **X.1** | **The ranker leaves `terminal/`.** `rank.ts` and `feedback.ts` hold the learned preference the rule above depends on, and they sit in `src/terminal/` — which is **optional**, S6.3's acceptance test being that the folder can be deleted and everything still runs. **A menu that ranks by preference cannot depend on the rail**, exactly as the offered list could not (G.9a). Move the ordering and its local store beside `offer()`; the rail keeps consuming it and owns none of it. **Give `Z.3` its second consumer** — until now the learning ranked rail chips alone **Landed (not driven)**: `rank.ts` and `feedback.ts` moved to `src/actions/` with `git mv`; the rail imports them and owns none of it. Nothing in `actions/` imports `terminal/`. Picked up 10 property tests in a previously uncovered area. | `src/actions/`, `terminal/` | Z.9 |
| **X.2 ◐** | **One capped, expandable list, used by all three surfaces.** Top three by learned preference, import order cold; a *More…* entry expands in place; the expanded list scrolls past a height. The relation types group takes the top three and no expansion **Landed short (driven)**: `typelist.ts` moved to `src/actions/` by `git mv` - one list beside `offer()`, owned by no component - and its tests moved with it to `tests/actions/`. **`R.9`'s two gaps are closed**: the overrule store is counted in one place, `feedback.weights`, which `rank.ts` and the type list both call; and the page hands down **both halves** of the vocabulary (`kindsInScope` - packages in order, then the project's own), so a block, a group or a note is offered package stereotypes rather than the project's own alone. The rail's relation group takes the rule's three and reads the cap from the one place it is written. Driven: two types defined in the tray appeared as strip chips, and picking one retyped the card. **Two gaps: the group is capped but not *ranked* by use** (nothing records a pick there as an overrule yet), and **the edge menu is still not a consumer** - tasks.md **17** and **18**. | `src/actions/`, `modules/view/diagram/`, `src/styles.css` | X.1, R.5, R.9 |
| **X.3 ⚠** | **`B.15` changes what it mints**: definitions are grouped `blocks` / `relations` / `views`, so a typed name on a selection mints a **block or relation** definition and must land in the right group. The want and the duplicate-name catch are unchanged. **The strip takes a typed name as well as a pick.** Beside the capped list, a text field: type a name and the selection takes that type. **Nothing new is needed** — `fold.defineNamed` already mints a definition for a bare name under a derived id, and calls itself *the bridge from free text to a real definition*; the suite holds it as *a free-text type becomes a definition with a stable id*. So this is a surface for a built capability, feeding `retype`. **The catch**: a free-text mint derives its id from the name while a deliberate definition carries its own, so typing a name that already exists in scope would mint a **twin** — the duplicate-name case SC.4 needed package-disambiguation for. **Match first, mint only when nothing matches** | `modules/view/diagram/`, `page/Contents.tsx` | R.9 |


## Found by review — the last one left

The closing review's nine defects and the four rows that followed them are in
[landed.md](landed.md). **One is left**, and it is the only one that was never a defect: the strip
at the foot of the stage still says nothing about what the selection could be.

| | Does | Owns | Waits |
|---|---|---|---|
| **R.9** | **The strip at the foot of the stage becomes *what is selected, and what it could be*.** The selection's **name** plus **the types available to it**, capped to a readable number, picked in one click — and the same list on right-click. **It is not only for relationships and ports**: a block, a group and a note answer the same question, so the strip is universal rather than a relationship special case. This is what makes `R.5`'s expansion usable instead of a menu that grows with the vocabulary. **The slot is Contents' slot**, so it opens once `W.1` moves Contents into the table view **Landed short (not driven)**: A universal `SelectionStrip` - block, group, note, port and edge share one path - with the top three ranked, *More...* expanding in place, calling the closed `retype`. Found and wired `Canvas`'s `kinds` prop, which was declared but never read. **Two gaps: element candidates are project-local only** (`defsOf(graph, false)`), so package-imported stereotypes are missing for anything that is not an edge; and `typelist.ts` reimplements `rank.ts`'s private `shape_weights` because `actions/` was not in its owns. Both were X.2's to close — **and X.2 closed both**: the strip now takes the page's `kindsInScope` vocabulary (packages included) and the weighting lives once in `feedback.weights`. | `modules/view/diagram/`, `canvas/Canvas.tsx`, `src/styles.css` | R.5, W.1 |


## C — the canvas answers back

**Small features from driving the app, 2026-08-20.** None depends on stream `B`, and none of them
is a design question — they are things the canvas and the explorer do not say yet. Kept as their own
stream so they do not queue behind the block model.

**The one-anchor-per-side rule is retired** (Clay, 2026-08-20). `NodeCard.tsx:270`,
`Frame.tsx:92` and `Note.tsx:92` each draw **four anchors per card, always**, whether or not
anything meets them — invisible at rest and shown on selection. **They read as clutter and they go.**
**An anchor appears where a relationship actually meets the block**, and nowhere else.

| | Does | Owns | Waits |
|---|---|---|---|
| **C.1** | **A project's name carries its block count** — `Coolant Loop (34)`, so the weight of a folded project reads at a glance. Counted over the folded graph, derived, never stored. **Watch**: it must not count references as blocks, or a view of forty things reads as a forty-block project | `page/Files.tsx` | ⊘ |
| **C.2** | **An anchor exists where a line meets a block, and is draggable between seats without promotion.** Two halves. **(a)** The always-four rule goes: an anchor is drawn where a relationship actually arrives, so a card with one line has one. **(b)** Dragging it moves it between the seats available on that border; **a moved anchor draws solid**, to say its position is yours rather than the engine's. **Promotion stays a separate act** — an interface is a real element with a name and a type, and moving a line's end is not that | `modules/view/diagram/`, `src/actions/`, `src/geometry/` | ⊘ |
| **C.6** | **Hand-adjusting anything sets the layer to `free`.** Moving a block, an anchor or an interface by hand is a statement that the positions are yours, so the arrangement follows the gesture rather than being set separately — and under any **non-free** arrangement the engine owns **all three**: block positions, anchor seats and interface seats. One rule replacing three, and it is what makes `C.2`'s solid anchor legible: solid means *free, and placed by you*. **Watch**: `at` is still retained across the switch, so returning to `free` returns the whole layout — anchors included | `src/actions/`, `src/graph/`, `modules/view/diagram/` | C.2, B.11 |
| **C.3** | **Selecting on the canvas moves the explorer with you.** Picking a card sets the explorer's context and expands the branch to it, so the two panels never disagree about where you are. **`reveal` already does exactly this in the other direction** — explorer to canvas — so this is its mirror and should reuse it rather than growing a second path | `page/App.tsx`, `page/Files.tsx` | ⊘ |
| **C.4** | **`f` zooms to the selection and centres it.** One key, the standard one, over whatever is picked — a card, a group, an edge, several. **The camera already has fit** (the viewport is part of every projection surface); what is missing is a binding and a target | `canvas/`, `modules/view/diagram/` | ⊘ |
| **C.5** | **A frame edge highlights as a drop target, one side at a time.** The frame has four **walls** and they are already the one border zone a gesture can land on, but nothing lights when a drag is over one — so dropping an interface onto a wall is aim-and-hope. Each side lights independently, matching the canvas's existing lit-target treatment (`P.14`) rather than inventing a second look | `modules/view/diagram/`, `src/styles.css` | ⊘ |


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
| **Y.6a** | **The export offers the look as a *choice*.** `Y.6` made it follow the theme in use, which is the default the wave settled on; what is left is the override — somebody exporting for a white document wants the pale look whatever the screen is showing. **One control on a door that already exists**: the rail's `project` group, beside `export`, cycling *as shown* / retro / modern / light. **Not a new capability and not a stored preference per project** — it is the tool in hand, like `form` and `angular`, so it lives beside them on the page **Landed (not driven)**: Four look picks beside `export` in the rail's `project` group, matching the `form`/`angular` idiom; `lookFor()` resolves the chosen theme without disturbing the screen. No stored preference. Side effect to review: dropped `verbs: true` from the group. | `page/Rail.tsx`, `page/App.tsx` | Y.6 |
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
| **W.1** | **The tray expands to the full stage**, finishing U.7's `◐`. Contents is the table view at full size — same component, same listing, same filters and sort; the shipped `table` module's own listing is the duplicate and goes. `tray.full` in `styles.css`, and expand covers Contents rather than sitting beside it **`U.18` handed `tray.full` here**: nothing asks for a full tray today — no control, no state, no class — so the size and the door it is reached by are one piece of work, not a CSS rule somebody can add ahead of it **Landed (not driven)**: `Panel` takes `full`, forcing the tray open at `.tray.full` and rendering the real `Contents`; the module's duplicate `Table.tsx`/`Row.tsx` deleted, registration and contract intact. **This closes U.18's `tray.full`.** Repaired after review: the crumb and descend that lived in the deleted components were restored to `Contents` via `path`/`onOpen`/`onUp`, which is what U.18 had wired. | `modules/view/table/`, `page/Contents.tsx`, `page/App.tsx`, `page/Panel.tsx`, `src/styles.css` | ⊘ |
| **W.1a** | **The tray's three sizes, settled.** **Partial is 25% of the stage** by default — `.tray.open` is `33%` today, and the comment there argues for *a third* on grounds (a fixed height beats one that moves with the row count) that 25% keeps; only the number changes, so the drawing gets more of the stage. **Shut is a bar**, one click away on the tab, which already works. **Full is what the view toggle means**: setting a project to `table` makes the listing the stage, and the tray is that listing at full size rather than a second one under it. **This is the row that removes the duplicate V.19 left visible** — a table filling the stage with a `contents` bar still at its foot, both listing the same layer. Do not add a fourth size or a hidden mode: three, and the toggle and the tab are the only two doors. **Three defects belong to this row, all from driving it**: the size **does not stick** (every reload starts shut, so a working size has to be re-chosen); the partial tray **does not follow the selection** — it lists the layer whatever is picked, which is the whole of what `W.2` promises; and it **shuts on selection**, because `Panel` closes on any click outside itself, so picking the block you wanted to inspect is the gesture that hides its fields **Landed (driven)**: The three sizes settled - partial is 25%, full is the toggle's, shut is the bar - and the size **sticks over a reload** (`mndflow.tray.open.v1`, out of the log like every display preference). **The shut-on-any-outside-click is gone**, which is the whole of the third defect: picking a block on the canvas was the gesture that hid its fields. The second defect (*the partial tray does not follow the selection*) was already closed by `W.2` and needed nothing. Driven: the tab opens it at a quarter, a card pick leaves it open and scoped to that pick, an empty click un-focuses it back to the layer, and a reload comes back open. | `page/Contents.tsx`, `page/App.tsx`, `page/Panel.tsx`, `src/styles.css` | W.1 |
| **W.2** | **The two sizes take different inputs, and that is what keeps them honest.** **Full — the `table` view on the stage — shows the layer and everything in it, and the selection does not narrow it.** **Partial — the tray at the foot — is the same table scoped to what is in focus**: its name and available types at the head, its contents as rows. Nothing in focus and the partial tray shows the layer, so the two agree and *expand* is genuinely only a size. This is not the hidden state U.8 rejected — the sizes never disagree about one input, they read different ones. **Recommended for the one case that is not a row filter**: a group or a block with children narrows to rows of the same shape, but a note has text and a leaf block has fields, and Contents already carries an opened-row presentation for exactly that (`styles.css`, *A row opened out*) **Landed (not driven)**: Full reads the layer and the selection does not narrow it; partial reads what is in focus and falls back to the layer when nothing is. The two never disagree about one input - they read different ones. | `page/Contents.tsx`, `modules/view/table/` | W.1 |
| **W.3** | **Vocabulary editing needs no new door — deselecting is the door.** Definitions are not the contents of anything, but **the layer listing already holds the types chip** (E.1), and the layer listing is what the tray shows when nothing is in focus. So: click empty space, the tray un-focuses back to the whole layer, and the vocabulary is one chip away. **The tray sits at the foot in every view**, so this is reachable from a block diagram, a matrix or an activity alike — which is what keeps U.11's deletion of `Relations.tsx` honest. **The same gesture as `V.14`**: empty space deselects, on the canvas and in the explorer both, and it is what unlocks *new project* there and *edit the vocabulary* here **Landed (driven), and it needed no code of its own**: the door was already there - `paneClick` deselects on empty canvas and Contents un-focuses to the layer listing with the types chip on it - but the tray *shut* on that same click, so nobody ever reached it. `W.1a` removing that is what opened this. Driven: click empty canvas, the filter chips come back, `types` shows the project's definitions with `+ type` under them. | `page/Contents.tsx`, `canvas/Canvas.tsx` | W.2 |
| **W.4** | **Matrix draws a heatmap.** **Hue is the relationship kind and opacity is the count** — transparent at zero, grading up — so both dimensions read at once. **The hue comes from the definition's existing `style`** (`styleOf` / `lookOf`, `styles/sysml.ts`), never a new matrix palette, so the matrix and the diagram cannot disagree and there is no second colour vocabulary to keep. **A cell holding two kinds draws as bands**, one per kind, degrading to a solid cell in the common single-kind case; the strip lists them all on selection **Landed (not driven)**: Cells draw as bands - hue via the same `ramp(lookOf(...))` call the diagram uses, so the two cannot disagree; opacity `1 - 1/(count+1)`, asymptotic so one edge and a hundred are both legible. Nothing added to the style surface. `group()` is the named seam for P.9. | `modules/view/matrix/`, `src/styles.css` | W.1 |

**Watch**: `V.15` takes the relationship type filter off the canvas bar, and a matrix over a busy
vocabulary may want one of its own. A different surface, so not a contradiction — but it should
arrive by decision rather than by the back door.


## Wave 2 — leftovers

**`A.7d` is here for continuity only** — it is stream `P`'s now, and needs nothing of its own once
`P.1` and `P.2` land.

| | Does | Owns | Waits |
|---|---|---|---|
| **A.7d ◐** | **`infer`'s result is reachable — by the same path everything else uses.** Today it mints a behavior project that is never admitted to `held.projects`, so nothing shows it. **This is not `infer`'s problem**: the explorer cannot make a project by any route that does not start with an invisible deselect, so `infer` was being asked for a door the app does not have. It waits on `P.1`–`P.2` and then needs nothing of its own — it makes a block at the top level, and a block at the top level is a project. **No proxy is placed in the source layer**: a proxy exists to carry a relationship across a boundary, and [behaviors.md](behaviors.md) rejects the back-reference outright **Landed short (not driven)**: `infer`'s minted root now gets its kind (`components.view.module`), closing the gap P.6 found. **The gap: the row's premise that it 'needs nothing of its own' was wrong** - `enact` wrote the log but never called `workspace.admit`, so the project stayed invisible. Closed by P.3. | `src/actions/behavior.ts` | P.2 |


## P — everything is a block, and what kind it is, is derived

> **SUPERSEDED by `ST.4` / stream `B` (Clay, 2026-08-18, later the same day).** The derivation
> below — mixed children reads as a **set**, kind per layer — comes out entirely. A **folder** is an
> ordinary definition and a **view** holds references; neither is guessed from what a layer happens
> to contain. The landed rows below stay for the record and for what else they did; **the
> derivation rule is not to be built on or extended.**

**Settled 2026-08-18 (Clay): a layer's kind is derived from its children, per layer.**

| The layer's children | It reads as |
|---|---|
| all **structure** blocks | **structure** |
| all **behavior** blocks | **behavior** |
| **mixed** | **set** — a folder of stuff, so nothing constrains it |
| none | **structure** (the default) |

**Per layer, never per project** — behaviours nest inside structures, so a project's top layer can be
structure while a layer below it is an activity. **A definition's own kind comes from its package**;
a shipped package may carry either kind of definition.

**`ViewKind` stays two.** A set is *viewed* as a structure — block, table, matrix — and its setness
shows up only as the folder mark. Nothing declares `kind: "set"`.

**Set comes from mixedness, not from proxies.** Model B's *members are proxies* is superseded as the
derivation: a set of proxies that all point at structure blocks is a **structure** layer.

**The one rule that keeps it open: the vocabulary is never filtered by kind.** Types in scope are
types in scope. That is what makes a sealed room structurally impossible — and the sealed room is
what this replaces. `offered()` filtered the choosable views by the kind of the view already chosen
(`App.tsx`), so no view choice could ever cross from structure to behaviour and a fresh project was
trapped in structure forever. `P.6` answered that with a control that set the kind by fiat, which is
the wrong shape and comes back out.

**Two create buttons, differentiated** — *new structure block* and *new behavior block*. Since a
block at the top level **is** a project, each makes a project of its kind when nothing is selected.
**This replaces `P.2`'s separate *new project* button.**



**Clay's rule, from playing with the built app.** Making a project should be as ordinary as making a
block, because it *is* one: a project is a block that nothing contains. Promoting a block is moving
it to the top; filing one is moving it back in.

**Four things were expected and none of them work.** Checked against the code, not guessed:

| Expected | What is there |
|---|---|
| Make a project easily | `＋` does name one — but only after clicking empty tree space to deselect first |
| Drag a block to empty space → a project | the empty tree area has **no drop target at all** |
| Drag a block into another project | drag is wired only *inside* the project in context |
| A folder affordance | `workspace.folder()` is built and **has no caller**; folders render, nothing makes them |

**This file predicted it.** *"Click nothing to enable something is obvious to whoever built it and
invisible to everyone else."* Clay hit it on the first play, which is the evidence that the deselect
gesture cannot be the only door — `V.14` is not reversed, it is given a second, visible way in.

**A project is a log, not only a place**, so a move across projects is **two steps in two logs** —
one adding, one removing — never one step spanning both. That is already the rule (`Effect.into` /
`writeInto`, `home` batches). Undo in the source brings the block back; it does not remove the
project that was made.

**Settled — nothing is left behind.** A block that leaves takes its subtree and goes; relationships
from its old siblings go with it, exactly as `delete`'s partings already do. Clay's call, against a
proxy standing in for it. **So the strip must say what went** — a silent loss of lines is the one
thing this must not be, and `delete` already has the cascade to count.


### The real ask: a saved view over a cross-section

**What is wanted** is a requirements table, or an allocation view over a chosen cross-section of
several projects, stored and organised as the user likes. **The design already names it and marks it
planned** — two lines sitting there since W0:

> **scope** — a **layer**, one element's contents — or a **set**, which is whatever it holds
> proxies of. *(spec.md, what a diagram's definition configures)*

> **(planned)** A **view** appears as a root like any other and lists what it holds proxies of. It
> is the one place a proxy *is* listed, because in a view there is nothing else to list.

**So a saved view is a set: a block whose members are proxies of things elsewhere.** Nothing new is
invented; three built things meet.

| Already built | Does |
|---|---|
| `Chosen[]` cross-project multi-select (E.4) | picks the cross-section |
| `refer` | places a proxy of another project's element |
| sticky per-project view module (U.8) | decides whether it draws as a table or a matrix |

**`infer` is the proof it works.** It already takes a cross-project selection and makes a project
holding **proxies of the participants** — it is the *behavior* special case of exactly this move.
Generalising it is cheaper than inventing a second mechanism, and it is what makes `A.7d` stop being
a special case at all.

**How the kinds are told apart — derived, never declared.** This is the answer to *how do I
differentiate structure, behavior and a saved view*, and it needs no stored field. The explorer
already derives a node's role from what it holds and where it sits (`role_of`); this is one more
line of the same function.

| Reads as | Because | Marked by |
|---|---|---|
| **block** | it holds nothing | `role_leaf` (built) |
| **container** | it holds blocks of its own | `role_container` (built) |
| **interface** | it sits on a frame edge (`side != null`) | `role_interface` (built) |
| **set / view** | **its children are of mixed kinds** — a folder of stuff, so nothing constrains it | *new mark* (`P.5`) |
| **project** | it is at the top level and owns a log | `project` (built) |
| **behavior** | **its children are behavior blocks** — derived, never declared | derived per layer |

**And that answers the folder.** A folder is *a set whose proxies are project roots* — which is
literally what the workspace already is, since `admit` files a project by placing a proxy of its
root. **So there is no folder concept to add**: filing is a set of projects, and `workspace.folder()`
is a door that was never needed. This deletes a concept rather than adding one, which is why it is
the recommended reading of Clay's *keep everything as a block*.

**Settled — model B.** A **set is a block whose members are proxies**, derived like every other role.
No stored field, no new closed set, and **no folder concept**: filing is a set of projects, a
requirements table is a set of requirements, an allocation view is the same set drawn as a matrix.
Clay's call, taken over wiring up `workspace.folder()` (which stays dead) and over declaring a
`components.set` key. `infer` becomes one caller of the general move rather than the only one.

**A set is drawn with a folder mark**, because a set of projects and a folder read the same way and
under this model they *are* the same thing. Clay's call.

**Every node role carries a mark of its own** — Clay's rule, and the reason `P.5` exists. Block,
container and interface have theirs; **a set has none and a behavior's cannot be reached**. V.2's
property test already holds that no two icon names draw one path; the missing half is that every
role *has* one.



| | Does | Owns | Waits |
|---|---|---|---|
| **P.2** | **The explorer bar gains a visible way to make a project.** Today the only route is *deselect, then `＋`*, and the deselect is invisible — which is how Clay came to believe projects could not be made at all. One control that makes one outright, no gesture first. **One control, not two**: under model B a folder *is* a set of projects, so there is nothing else for a second icon to make **Landed (not driven)**: A dedicated *New project* button on the explorer bar reaching the same naming prompt with no deselect first; new `new_project` icon. The selection-following `+` is untouched. | `page/Files.tsx`, `src/modules/icons/` | ⊘ |
| **P.3** | **Nothing anywhere special-cases making a project.** With `P.1` and `P.2` landed, `infer` (`A.7d`), a dropped block and the bar's control all reach the same door, and the door is *a block at the top level*. This row is the check that they do — if any caller still needs its own path, the rule has not landed **Landed (not driven)**: `Effect` gained `admit?: boolean`, `enact` an `onAdmit` callback, `App` wires it to the existing `openIn`. Three paths to making a project became one; `infer`'s result is reachable. (`extract` had already been folded into `newProject` by P.1.) | `src/actions/`, `page/` | P.1, P.2 |
| **P.4** | **Save a cross-section as a set.** With a cross-project selection made, one action mints a block holding a proxy of each — the general form of what `infer` already does for behaviour, taking the same `of[]` argument. It opens like any project, and its view module decides whether it reads as a **requirements table** or an **allocation matrix**. **Prefer generalising `infer` to registering a second action**: the action set is closed, and *one registered action offered N times* is the wording `R.5` already established. If it will not generalise cleanly, that is a gate, not a licence to add one **Landed (not driven)**: `infer` generalised via `expand: true` and an `as` choice (`behavior` / `set`) - one registered action offered twice, so the action set never widened. The set mints a block of proxies and reaches P.3's single admit door. Also fixed `fill_args` silently dropping `action.chose` for `infer`. | `src/actions/`, `page/Files.tsx` | P.1 |
| **P.5** | **Landed (not driven)**: `role_of` gained the mixed-children -> `set` reading drawn with a folder mark, and the icon conformance test now walks a closed `ROLES` set so a role with no mark fails loudly rather than relying on a hardcoded list. Landed with the kind-derivation rework, not as its own sitting. **Every node role carries a mark of its own, and a set gets the folder.** `role_of` gains one line — **its children are of mixed kinds** (settled: mixedness, not proxies) — and the explorer draws that with a **folder** icon, since a set of projects and a folder are the same thing under model B. **The gap this closes is a rule, not one icon**: block, container and interface are marked and a set is not, so two different things read alike. **V.2's property test holds that no two names draw one path; the other half is that every role has one**, which is what to add to the icon conformance test | `page/Files.tsx`, `src/modules/icons/`, `tests/modules/icons.test.ts` | P.4 |
| **P.6** | **A project can be made a behavior — nothing can today.** Found while answering *I cannot create sets or behaviors*: **nothing anywhere writes `components.view.module`**, and `offered(graph)` filters the view toggle to the modules of the project's own kind, where kind is read back off that same key. A fresh project's root has no definition, so it is `block`, so it is *structure*, so activity / sequence / state are never offered — **a one-way door with nothing that opens it**. The only behavior projects that can exist are `infer`'s, and those are unreachable (`A.7d`). Give the root's kind a door: setting it is `define` on the root's own definition, which is built — what is missing is a control that reaches it **SUPERSEDED — comes back out (Clay, 2026-08-18).** The kind is derived from a layer's children, never toggled; see the settled rule above. What landed: A root-kind cycle control on the project row (structure -> activity -> sequence -> state) reusing a same-named definition where one exists, plus a `view` dial in the definition editor. Both write `components.view.module` through the built `define`; no closed set widened. | `page/Contents.tsx`, `page/Files.tsx` | ⊘ |


### Columns are the table's and the matrix's, not the set's

**What model B does not cover**: a set holds proxies of **whole blocks**. *These three fields of
those five blocks* is a **column** selection, and it is a different shape.

**Settled — it belongs to the view module, not to the set.** Clay's call. A set says *which things*;
the table and the matrix say *which of their properties to show*. Keeping them apart is what stops a
set from having to know it is going to be drawn as a table.

**And composing one is a drag.** Dragging a block from the tree onto the stage is how a set gets its
members, which makes that gesture load-bearing rather than a convenience. **It half exists**: the
block canvas already takes a `REFERRED` drop and turns it into a proxy through `refer` — but
**a row is `draggable` only when its project is the one in context**, and the payload is a **bare
element id** rather than a cross-project ref, so neither end of the cross-project case works. `refer`
itself already accepts `{ project, element }`; nothing hands it one.

| | Does | Owns | Waits |
|---|---|---|---|
| **P.7 ◐** | **A block dragged from the tree lands on whatever is on the stage.** Two halves, both real gaps. **The payload becomes a cross-project ref** (`refTo`) rather than a bare id, and every row is draggable rather than only the ones in context — without both, a set cannot be composed from more than one project, which is the whole point of it. **And table and matrix take the drop**, which they do not today: they have no drag handling at all, while the block canvas has had `onRefer` since G. One gesture, three surfaces, one action (`refer`) **Landed short (driven)**: table and matrix take the drop through one shared `takesRef` beside `REFERRED` - one gesture, three surfaces, one action. **`refer` had never actually accepted a cross-project path**: its check looked the target up in this fold, so every explorer drag has been refused since `P.1` made the payload a ref. It now reads a ref into the project in context as bare (what `of` stores) and takes a foreign one on its path alone. Driven: a row dropped on the table inside another layer becomes *stands for X*; two rows dropped on a matrix become its axes; a repeat drop is refused; a **cross-project** drop lands and survives a reload. **The gap: that foreign proxy draws as *missing*** - nothing resolves another project's element for a label. `workspace.resolve` is the resolver and handing it down is a row of its own (tasks.md **15**). Two defects the review then found and this row fixed: the canvas's *don't refer to the open layer* guard compared a **path** against bare ids, so it never fired once the payload became a ref (`refer` now refuses it itself — driven: dropping the open layer's own row says *That is this layer.* and makes nothing); and a column read a proxy's fields without the hop its name already takes (driven: a referenced block's `priority` reads `high` on the proxy row). Owns corrected: the table's listing is `page/Contents.tsx` since `W.1` deleted the module's own, the check is `actions/elements.ts`, and the guard is `canvas/gestures.ts`. | `page/Files.tsx`, `modules/view/table/`, `modules/view/matrix/`, `page/App.tsx` | P.1 |
| **P.8** | **A table's columns are chosen.** They are fixed at `form / name / type` today, which is the one thing a requirements table cannot live with. Columns are the **fields in scope** across the rows, picked from a list; `form / name / type` stay as the default set rather than as the only one. **`components.card.shows` is the precedent and not the mechanism** — that is one definition saying what its own card shows; this is one *view* saying what its columns are, so it is the table's state and not a definition's **Landed (driven)**: a `columns` group on the rail lists every field name the layer's rows carry (`table/columns.ts`'s `fieldsIn`), and picking one gives that field a column of its own. The **table's** state, held beside `shownType` - never a definition's; the head's four stay as the default set. Driven: adding a field to a block put it on the group, and toggling it added the column, with a dash where a row does not carry it. Owns corrected: `page/Contents.tsx` is the table's listing, and `ChromeGroup` - an open set - gained the key. | `modules/view/table/`, `page/Rail.tsx` | P.7 |
| **P.9 ⚠** | **Superseded in shape by `B.15` / `B.18`** — a matrix's axes are now **two child views**, and *which relation kinds count* is a view definition option rather than a control of its own. The want is unchanged; the mechanism is. Do not build it against the old shape. **A matrix's axes and kinds are chosen.** Rows against columns is one reading of a set; *these blocks against those requirements* is the one an allocation view needs. Which relationship kinds count is the same question the heatmap asks, so **`W.4` and this row are one design and should land together or in order** — do not let two different answers to *which kinds* appear. **`B.15` settles it**: *which kinds* is a view definition option, so both rows read it from there | `modules/view/matrix/`, `page/Rail.tsx` | P.7, W.4 |


### The workspace is the root, and it is already a project

**Checked, not assumed.** Clay's reading is not a new idea to encode — **it is the built model with
no door on it**, which is the shape of every gap this stream has found.

| Clay's reading | What is already true |
|---|---|
| The workspace is the true root | `Held.id` **is a project id**; its graph is keyed and folded from its own log like any other (`graphOf(held.id)`) |
| It keeps its own history | it already does — `admit`, `forget` and `folder` write steps into it |
| It works the same way as a project | actions.md already says so: *"**The workspace is a project**, so working in it uses these same actions… It has no actions of its own"* |
| I should be able to open it as a block diagram | **this is the gap.** It is never `contextId` and has no row of its own, so it can never be on the stage |

**Where the line between the two histories falls is already decided, and it is sharper than
*cross-project actions*.** The rule is `workspace/`'s own first paragraph: **a change is recorded
where its element lives**, through `Effect.into` / `writeInto`. Admitting a project writes the
workspace's log because *the proxy is the workspace's element*. Renaming a block writes that
project's log because *the block is its element*. A relationship reaching across writes the log of
whoever holds the **edge**. Nobody decides case by case, and no action needs to know it is a
cross-project one.

**And import / export falls straight out of it**, which is why the two doors already differ: a
project export is one log; a workspace export is the workspace's log plus the logs it names (S4.6).
Nothing to design — the rule was there first.

| | Does | Owns | Waits |
|---|---|---|---|
| **P.10** | **The workspace opens like anything else.** `P.13` found its door — the panel's own title — so this row is the half behind it: `contextId` may be `held.id`, and the stage draws the workspace's graph. It gets a row of its own at the top of the tree, it can be selected, and selecting it puts **its** graph on the stage — a block diagram of the projects it holds, with the proxies as cards and the imports as lines. **Nothing new is stored**: its log, its graph and its actions all exist; what is missing is that `contextId` can never be `held.id` and the tree draws its contents without ever drawing it. **Watch**: the explorer must not then draw the workspace twice, once as a root and once as the tree it already is **Landed (not driven)**: `contextId` may be `held.id`; the Workspace title navigates there and the stage folds the workspace's own log as an ordinary block diagram. The double-draw watch was already structurally impossible - `held.id` is never in `held.projects`. | `page/Files.tsx`, `page/App.tsx` | ⊘ |
| **P.11** | **The rule that draws the line gets written down and held.** *A change is recorded where its element lives* is implemented and is **in a module comment**, which is where a rule goes to be forgotten. It belongs in design.md, and it belongs in a property test — *every mutation lands in the log of the project holding the element it names* — which is the one assertion that would catch a future action writing to the wrong log, as `R.10` did **Landed (not driven)**: The write-path rule moved from a module comment into design.md, plus a property test over three open projects asserting every mutation lands only in the log of the project it names. | `docs/design.md`, `tests/workspace.test.ts` | ⊘ |
| **P.12** | **Settled: copy — and the two are not one mechanism, they are two gestures.** **Tree to tree** (explorer to explorer) carries the branch and **copies the definitions it names**, so its types survive the source being deleted. **Explorer to canvas** makes a **reference** — a proxy from the canvas layer to that block; nothing moves and nothing is copied. A package stays referenced because it is immutable. So the destination decides, and there was never an inconsistency to resolve. **Clay's call, taken** | `workspace/`, `src/graph/types.ts` | ✓ settled |


### Reorganising — what driving it turned up

**Clay drove `P.1` and it is not finished.** The move works; using it does not. Four things, and they
belong to story **`ST.1`**.

**The panel visualises the workspace, so it should say so.** *Explorer* names the panel; **Workspace**
names what is in it. The two can both be true — the panel stays the explorer in conversation — but
the word at the top of it is the thing being shown, and that is the workspace. **Its header is then
the workspace's own row**, which is the door `P.10` was looking for: select it and the workspace
draws on the stage as a block view of the projects it holds.

**The drag says nothing about where it will land.** The canvas has grazing, a `dropping` outline and
a lit target; the tree has one flat dashed outline (`.item.over`) that says *this row* and never
*into this branch* versus *beside it*. **And a folded branch never opens under the pointer**, so a
nested target cannot be reached at all — which is why nesting by drag reads as impossible. **It is
not a logic gap**: `move` accepts it, and refuses only a move into itself or into a reference. The
gap is that nothing tells you where you are.

**A cross-project drop looks like nothing happened.** The source tree keeps drawing the block until
something else forces a refold, so the move only appears once the target project is opened. Parked
against `T.3` when it was found; Clay has hit it, so it is a row.

**And the strip should stop announcing a plain move.** `P.1` says *Pump moved* after every one, which
is noise if the move was obvious as it happened — Clay's call. **The loss is not noise**: a
relationship left behind is still said, because that is the one thing the gesture does not show.

| | Does | Owns | Waits |
|---|---|---|---|
| **P.13** | **The panel is titled *Workspace*, and its title is the workspace's row.** The word at the top names what is shown rather than the panel showing it; *explorer* stays the name of the pane. **Selecting it puts the workspace on the stage** as a block view of the projects it holds — which is `P.10`'s door, found rather than invented. **Watch**: the header is a heading today and a row is a selectable thing, so it takes the selection treatment `Y.8` settled — the wash for open, the accent for selected — or it will be a title that mysteriously highlights **Landed (not driven)**: The files-bar title is the word *Workspace* and is a selectable row taking the Y.8 wash; `onOpenWorkspace`/`workspaceOpen` left optional, wired by P.10. | `page/Files.tsx`, `src/styles.css` | ⊘ |
| **P.14** | **A drag says where it will land, the way the canvas does.** Three things the tree lacks and the canvas has: the target **lights as a target** rather than wearing one flat outline; *into this branch* and *beside it* look different, since they are different drops; and **a folded branch opens when the pointer rests on it**, which is what makes a nested target reachable at all. **`move` already accepts nesting** — this is entirely feedback, so the acceptance is *drag a block into a folded branch three levels down without guessing* **Landed short (not driven)**: Lit drop targets matching the canvas, the clear-space *nowhere* target given a rule it never had, and a 500ms spring-open on a folded branch. **The *beside* question is dissolved, not deferred (Clay's call): every drop is *into* something.** A block takes the dragged block as a child, a project root takes it as a child of the root, and empty space makes it a project - a member of the workspace set. All three are already wired (`dropzone(.., node.id)`, `dropzone(.., null)`, `drop(null, null)`), so nothing was missing. | `page/Files.tsx`, `src/styles.css` | ⊘ |
| **P.15** | **A drop is visible immediately, and says nothing afterwards.** The source tree refolds on the drop rather than on the next click, so a block that moved looks moved. **And the strip stops announcing a plain move** (Clay's call — a fluid gesture needs no receipt), while still saying when a relationship was **left behind**, since that is the part the gesture cannot show **Landed (not driven)**: A `refoldAt` counter in the `graphs` memo makes a cross-project drop redraw the source tree instantly; a plain move no longer announces itself, while *N relationships left behind* still does, and a stale notice is cleared rather than left standing. | `page/Files.tsx`, `page/App.tsx` | P.1 |


## Wave U — what is left of it

**Wave U landed and is in [landed.md](landed.md).** One row survives it: the two `◐` gaps U.7 and
U.14 left, both parked on the same words — *App not owned*. **U's *chrome, not the diagram's visual
language* boundary held through V and is reversed by `Y.5`** — a theme now supplies the diagram's
defaults, while a definition's `style` still wins.

| | Does | Owns | Waits |
|---|---|---|---|
| **U.18** | **The two `◐` gaps Wave U left in `App.tsx`.** Both were parked on the same words — *App not owned* — and both are a wire rather than a design: **U.7**'s `path` / `onUp` are never passed to table and matrix (so both fall back to deriving the trail from the graph), `tray.full` is missing from `styles.css` (so expand does not cover Contents), and **U.14**'s `App.newProject` still does not call `workspace.begin`. One row because they are one file, and leaving them as two `◐`s means two rows that each wait for the same owner **Landed short (proven)**: `path` / `onUp` reach table and matrix — the crumb reads the trail App already holds instead of re-deriving it — and `newProject` goes through `workspace.begin`, which names, mints, writes the first step and admits in one call rather than App doing all four beside an unwired door. Driven: two projects made, a duplicate name refused, both surviving a reload. **The gap is `tray.full`**: nothing anywhere asks for a full tray — no control, no state, no class — so the rule would be dead CSS. It is `W.1`'s, which owns the size *and* the door it is reached by **Closed**: **`tray.full` closed by W.1**, which owns the size and the door together as this row asked. | `page/App.tsx` | ⊘ |


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
| **T.3 ⚠** | **`App.tsx`, `Files.tsx` and `Panel.tsx` get cover** — ~2,200 lines, no tests, and the place every browser-found bug lived. **The design has started moving again**: `B.3` deletes `page/kind.ts` and rewrites App and Files, `B.4` rewrites the explorer roles, `B.9` moves display state into App. *Do not write tests for a design that is still moving* applies exactly as it did through U and V — **this now waits on `B.9`**, not on `T.5` alone | `tests/page/` | T.5, B.9 |
| **T.5** | **A DOM harness, so page interaction can be tested at all.** There is no jsdom, happy-dom or `@testing-library` in the tree, which is why T.2 stopped at SSR markup and left filter chips, column sort, row pick, hover lighting and strip `onSay` unproven. **`happy-dom` + `@testing-library/react`** — happy-dom because it is vitest-native and nothing here needs jsdom's deeper spec cover (no canvas, no navigation); testing-library because its queries are *role and text*, which is *properties, never values* applied to markup. **It proves itself on T.2's leftovers over `Contents.tsx`** — which Wave U did not rewrite — rather than waiting for T.3. Two dependencies, against *never add a dependency where a few lines will do*: a DOM harness is not a few lines **Landed (not driven)**: happy-dom + @testing-library/react; `test.environment` set globally so T.3 gets the harness free. contents.test.ts 11 -> 21 tests, covering filter chips, column sort, row pick, hover lighting and strip `onSay`. | `tests/`, `package.json`, `vite.config.ts` | ⊘ |

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
| **Z.9** | **Trim Z to what is wanted, and stop there.** Z.1–Z.8 are annotated *landed (proven)* but are **thin against what they claim** — the wave is half-built, and the honest reading is below. It is trimmed rather than finished because **the UI refinements in Wave V come first**. **Keep and finish**: chip order from `rank.ts` (225 lines — embedding lead, learned preference, fixed `ORDER` fallback; this part is real), `feedback.ts` (74) behind it, and **the score on hover, which does not exist anywhere yet** — that is the whole of the ranking surface Clay asked for. **Cut back**: expanded mode becomes **a fixed placeholder prompt set** on the theme of *"What's next?"* plus **the selected action's description**, which takes `guidance.ts` (32 lines, two hardcoded strings) out and stands the expanded pane down off `router.ts` / `workflows.ts` / `turn.ts` — the question loop tasks.md already said would *lose its centre*. **Delete**: `Scores.tsx` (55 lines, unmounted since U.11 and now never remounted — the hover score replaces it). **Collapse `ORDER`**, now duplicated **four** ways — `rank.ts`, `page/Files.tsx`, diagram offer chrome, `terminal/` **Landed (not driven)**: Hover score on each chip; expanded pane is a fixed prompt plus the chip's own description. Deleted `guidance.ts`, `Scores.tsx`, `loop.ts`, `turn.ts`, `router.ts`. `rank.ts`'s ORDER duplicate collapsed onto `fill.ts` - the other two alleged duplicates were already shared. Repaired after review: `terms.ts` restores per-domain vocabulary through the seam, and App's stale loop comment fixed. | `terminal/`, `page/App.tsx` | ⊘ |


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
| **S7 ⚠** | **Run it after `B.4`, not before.** `B.3` and `B.4` both rewrite `Files.tsx` — the kind derivation out, the roles redrawn — so cutting the seam first means cutting it twice. **Cut the `page/Files.tsx` seam.** Take the split from what the file actually does rather than from line count: the tree and its rows, the naming prompt, the offer menu, and the foot (undo / redo / last action) are four jobs in one file. **Not a rewrite** — the same behaviour, moved, with the browser drive proving each half still works. Fold in the duplicated `ORDER` while here if it falls out naturally; do not go looking for it | `page/Files.tsx` | ⊘ |


## S8 — one word, one meaning

**Clay asked whether the language is getting in the way. It is, and it is measurable.**
[definitions.md](definitions.md) held **149 terms** when this was written, and three of the most-used ones meant three
different things each. This is the rule `U.2` set for icons — *no mark means two things* — never
applied to the words.

| Word | Means | And also | And also |
|---|---|---|---|
| **context** | `actions.Context` — where an action is being run | `contextId` — which project's log is written to | definitions.md: *what is selected within the layer* |
| **view** | `view: string \| null` — the open **layer's** id | a **view module** — one of the six | *layer view* — the projection of a layer |
| **scope** | definitions.md: *the layer being drawn* | `Scope` — where an action applies | *packages in scope* |

**None of these is a subtlety.** Reading `ctx.view` as *the module* rather than *the layer* is a
mistake anyone makes once, and `context` naming both *the project being written to* and *what is
selected* is exactly the confusion that produced `R.10`.

**The renames are mechanical and the words already exist.** definitions.md says a layer *is* the
current scope and the code already calls the selection `picked`:

| Now | Becomes | Why |
|---|---|---|
| `view: string \| null` | **`layer`** | it **is** the layer; the glossary already says so, and it frees *view* for the module |
| `contextId` | **`project`** / `openProject` | it is which project is open, and nothing else |
| definitions.md *context* | **`selection`** | the code has called it `picked` all along |

**Cost, measured**: `view` appears **257 times** under `src/`, `contextId` **29**. The first is big
enough to be its own row and to want the browser drive after it, which is why they are split.

| | Does | Owns | Waits |
|---|---|---|---|
| **S8.1** | **`contextId` → `project`, and definitions.md's *context* → *selection*.** 29 call sites and one glossary row. The small half, done first so the big one lands against settled words | `page/`, `src/project.ts`, `docs/definitions.md` | ⊘ |
| **S8.2 ⚠** | **`view` → `layer` wherever it means the open layer**, leaving *view* to the module alone. 257 sites, almost all mechanical, but `ViewModule` / `viewOf` / `views()` must **not** be caught in it — which is the whole reason the rename is worth doing. **Drive it after**: a wrong rename here silently opens the wrong layer, and no test covers the page. **Stream `B` moved the target again**: *view* now names **four** things — the open layer, a view module, a **view definition** and a **view block** — so this must run **after** `B.15`, not before, or it renames into a word that is still moving | `src/`, `docs/` | S8.1, B.15 |
| **S8.3 ✓** | **The glossary is distilled** — **done 2026-08-18, ahead of `S8.1`/`S8.2` rather than behind them**, because the rework changed what the renames would be renaming. 149 terms to 75; the old file is archived at `definitions-legacy.md` for comparison. **This changes `S8.2`**: `view` → `layer` is still right, but *view* now also names the `view` base definition and the view block, so the rename has three meanings to keep apart rather than two | `docs/definitions.md` | ✓ done |


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
