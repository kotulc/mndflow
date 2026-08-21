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

**A row id in a story may point into [landed.md](landed.md).** Rows that landed whole were archived
on 2026-08-20; the story still names them, because what a story is made of does not change when the
work is filed.

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
| **ST.4** | **One block, and everything else is data.** Make a folder, a view, a note, a script and a behavior without the app ever asking which *sort* of thing you mean — because there are no sorts. Drag blocks from three projects into a view, pin it, and come back to it. **This is the primary story and everything else waits behind it** | `B.0` `B.1` `B.19` `B.2` `B.7` ✓ → `B.26` | **five landed and driven; 18 rows left.** design.md *The simplified block model* and *The three tiers*; vocabulary in [definitions.md](definitions.md). Nothing gated — `B-g`…`B-j` answered 2026-08-19 |
| **ST.5** | **The workspace reaches outside itself.** Pull a package or a resource from a **public GitHub repo** and have it land as blocks you can use — not as a file you then have to import by hand | `O.1`, `O.2` | **settled, not started.** Public fetch only; local-folder import deferred |
| **ST.6** | **A model becomes something else.** Translate a project out — **the site first**, then simulator, parametrics and code in an order nobody has set. One way out, and it never writes back | `O.3` | **settled, not started** |
| **ST.7** | **The terminal earns its place.** One collapsible strip that says where you are, what you just did, and what you could do next — with **four commands**, flexible verbs, and **the whole action surface behind `?`**. Not a command palette and not a chat | `I.1` → `I.7` | **settled, not started** |
| **ST.11** | **The action surface is as small as the app needs and no larger.** Three things that each carried machinery are gone or shrinking — the per-project log, the ranked offer list, and the capped type list — and what supported them should go with them rather than being left in place *just in case* | none yet — see *Not in the queue* | **future story, Clay 2026-08-20**, sized against the code below |
| **ST.10** | **A context menu offers what makes sense here, and nothing else.** Right-click a block and see the handful of things worth doing *to a block* — not every action that technically applies. What appears is the **block module's** to declare, because the module is what knows the block is for | none yet — see *Not in the queue* | **future story, Clay 2026-08-20.** Cause found, design not started. **Wants `I.7` under it first**: narrowing a menu is only honest once help is a text route to every action |
| **ST.8** | **Interaction is consistent, and the app always answers back.** Every part you can adjust by hand — a card, a frame edge, a block anchor, an interface — targets the same way, lights the same way, and moves smoothly. Nothing is aim-and-hope, and no two surfaces teach different gestures for the same act | `C.1` → `C.11` | **started out of turn, 2026-08-20 — four rows landed, two of them short.** `C.4` ✓ `C.5` ✓; `C.2` ◐ (a new relationship draws nothing until a reload) and `C.7` ◐ (a closed project still reads *missing*, and the inversion was skipped). Repairs are `C.9`–`C.11`. Consistency is still the goal; the individual features are how it is reached |
| **ST.9** | **Each surface has one job.** The tray inspects, the stage draws, the explorer files, the terminal says. No two of them show the same thing twice, and no one of them quietly does another's work | `W.5`, `W.6`, `A.7d` | **settled, not started.** `A.7d` belongs here: *`infer`'s result is reachable by the same path everything else uses* is this story stated for one action |
| **ST.1 ✗** | **Reorganising is easy.** Move a block anywhere it could sensibly go — into another branch of the same project, into a different project, or out to the workspace — and see where it is going to land while dragging | `P.1` ✓, `P.13` ✓, `P.14` ◐, `P.15` ✓, **`N.1` ◐, `N.2`, `N.3`, `N.8`** | **DRIVEN AND FAILED** (Clay, 2026-08-20). Every row landed and the story does not work: **a project root cannot be moved at all**, **a block promoted to the workspace cannot come back**, and **a cross-project move does not redraw until you click something else** — which is exactly what `P.15` claimed to fix. Reopened as stream `N`. **`N.1` landed short on 2026-08-20 and reproduced the symptom**: a project dropped into a folder vanishes from the tree until the folder is clicked. `N.8` was added because no folder can be made from the app at all |
| **ST.2** | **A saved view is worth saving.** Pick a cross-section of several projects, keep it, name it, come back to it, and read it as a requirements table or an allocation matrix | `P.4` ✓, `P.5`, `P.7` ◐, `P.8` ✓, `P.9`, `C.7` ◐ | `P.7` and `P.8` landed — a set takes drops from three surfaces and a table chooses its columns. **`P.7`'s gap is mostly closed**: `C.7` landed 2026-08-20 and a cross-project reference now reads its target's name on a card and in a table. What is left is the *closed project* case, which still reads a bare `missing` |
| **ST.3 ✗** | **Nothing is unreachable, and nothing is unreadable.** Every kind of thing the app can hold can be made from the app, **and told apart once it is there** | `P.2` ✓, `P.3` ✓, `P.6` ✓, `P.10` ✓, **`N.4`–`N.7`** | **DRIVEN AND FAILED** (Clay, 2026-08-20). **A behavior cannot be told from a structure** — no icon distinguishes them. **Right-clicking empty explorer space offers no choice of base type.** The story also grew: *reachable* is not enough if the result is unreadable. Reopened as stream `N` |


## B — the simplified block model

**Settled 2026-08-18 (Clay), and it supersedes stream `P`'s derivation rule.** The reasoning is
[design.md](design.md) under *The simplified block model*; the vocabulary is
[definitions.md](definitions.md); the pre-rework glossary is archived at
[definitions-legacy.md](definitions-legacy.md) and **nothing may be built from it**.

**In one table**, because every row in this stream is one line of it:

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
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

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
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

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
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

### Running this stream unattended

**Read this before picking a row.** It is written so a cold agent can work the stream without
asking, and the standing rules are the ones that have already cost a sitting each.

**The order is the table, not the numbers.** Ids were assigned as the design settled; `B.19` landed
third. Follow *Waits*.

**Three standing rules for every row here:**

1. **Never widen a closed set, and never re-introduce a set of element sorts.** A new sort of thing
   is a **definition** in the shipped `base` package. If a row seems to need a new `form` value,
   stop — that is the mistake this whole stream exists to remove.
2. **Schema tokens are `B.17`'s alone.** `form: "proxy"`, `form: "note"`, `ElemForm`,
   `add_element{…}` payload shapes. A row may rename code around them and may not change them, so a
   half-finished stream still opens yesterday's file.
3. **Definition ids are name-derived and project-scoped.** `defIdFor` builds them from the name on
   purpose (`X.3` depends on it). Only elements, relationships and steps are globally unique.

**Done when**, per row — beyond `tsc`, `npm run test:ci` and the browser drive that every row needs:

| | Proven by |
|---|---|
| ~~**B.2**~~ **landed — [landed.md](landed.md)** | `base` package published in `modules/base.ts`, one definition per block module, `conformance.test.ts` runs the component contract over each. Nothing reads it yet, and the app is unchanged on screen |
| **B.3** | `page/kind.ts` **deleted**; `ViewKind` / `kindOf` / `createsFor` gone from `modules/view/index.ts`. Drive: a fresh project can be switched to **activity** — the one-way door `P.6` worked around |
| **B.4** | `role_set` → `role_folder`; the mixed-children reading gone from `role_of`. Drive: a folder made from the explorer wears the folder mark and a container of unlike blocks does not |
| **B.5** | `part` / `reference` as the two links; *contained* derived from *the child is a graph root*. A property test: deleting a container never deletes a contained root |
| **B.6** | `form` off the element record; `note` and `group` are base definitions. **The largest row** — if it will not land in a sitting, split it by base definition and say so |
| ~~**B.7**~~ **landed — [landed.md](landed.md)** | `ref` value form → `link` everywhere including `packages/` |
| **B.8** | one log at the workspace; `Effect.into`, `writeInto` and the `home` batches gone, and `P.11`'s property test with them. Drive: undo after switching projects reaches back into the other one — **that is correct, not a bug** |
| **B.9** | display state in workspace metadata. Drive: set a view and a canvas toggle, reload, find them; export a project and confirm it carries no view opinion |
| **B.11** | one arrangement, six values. **Watch**: order tier 3 must stop firing under `free` and `grid` (behaviors.md), and `radial` and `relax` come out of `src/` entirely — action, `relax_layer` op, `fill.ts` entry |
| **B.12** | arrangement is a setting. Drive: arrange, return to `free`, get your layout back |
| **B.13** | `derived` as a relationship flag. Drive: the workspace's project-to-project dependencies draw and cannot be deleted |
| **B.14** | interface declared; the `side` derivation retired |
| **B.15** | view definitions as records; a block definition carries `views`, first entry the default |
| **B.16** | an unknown module falls back to base block **and reports a fault**. A test that seeds a file naming a module the build does not have |
| **B.18** | composition on proximity. Drive: a view holding blocks from three projects groups them and reads in a stable order |
| **B.20** | a resource block holds a path; explorer and canvas draw one. **No bytes in the log** |
| **B.21** | a view holds views; a reference carries `depth`. Drive: drag a project root in with `children` and get its blocks as rows |
| **B.22** | a pin on the canvas makes a view block that survives a reload |
| **B.23** | a right-click in an activity makes an **action**, not a plain block |
| **B.24** | dragging a loose block into a folder promotes it; into a project files it |
| **B.25** | empty blocks hide; a project root shows even when empty |
| **B.26** | an imported package's definitions resolve after a reload |
| **W.5** | tray has two sizes; nothing offers a third; a card pick scopes it and an empty click returns it to the layer |
| **W.6** | switching a layer to `table` fills the stage; columns and drops work there; the tray at its foot shows the **selection**, not the layer twice |
| **B.27** | no path makes a project without a name; a duplicate is refused wherever it comes from |
| **N.1 ◐** | a project drags into a folder, out again, and the tree redraws without a second click — **the redraw is the half that failed** |
| **N.2** | a project dragged into another becomes a block there, its definitions travel, and undo puts it back |
| **N.3** | a cross-project drop shows the block gone from the source and present in the destination **with no further input**, driven |
| **N.4** | an action and an activity are distinguishable from a block and a container at a glance |
| **N.5** | every published base definition is offered on empty explorer space |
| **N.6** | explorer offers the choice, canvas makes what suits the layer, neither grows a submenu |
| **N.7** | **one** create control remains and it makes a block; a project is still one gesture from empty space; nothing on the bar names a type |
| **I.8** | an **unlisted** synonym reaches the right command, a preferred verb rises over repeated use, and the same code ranks the four commands that ranked the action list |
| **B.17** | **last.** A file written by the pre-stream build opens and draws. Seed one into `localStorage` and read `.saying .what` — the `run` skill has the procedure |

**Defect 19 sits under this stream and belongs to nobody yet**: the canvas creates blocks with no
project, into `mndflow.steps..v1`. It is pre-existing and it will bite `B.8` hardest, since a null
project id under one log has nowhere to go. Whoever takes `B.8` should read it first.

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

**What `B.19` found, and every later row has to honour it: *definition* ids are not minted, they are
derived.** `fold.defineNamed` builds a definition's id **from its name** (`defIdFor`), deliberately —
it is the bridge that turns free text typed on the canvas into a real type, and `X.3` depends on it.
So two projects that both define *flow* produce the **same** definition id, and no amount of entropy
changes that. **The rule splits in two:**

| | Unique | Addressed |
|---|---|---|
| **elements, relationships, steps** | **globally**, by minting | a path says *where* it lives, not *which* it is |
| **definitions** | **within a project**, by name | a path is still the **resolution rule** — `proj_a9f/def_pump` |

This does not block `B.8`: definitions live under their project either way. It does mean the row
that said *a path becomes a readability aid* is true of elements and **false of definitions**, and
`B.15` / `B.17` must not assume otherwise.

| | Does | Owns | Waits |
|---|---|---|---|
| **B.3** | **Delete the kind derivation.** `page/kind.ts` goes; which view modules a layer offers comes from the definition. Closes `P.6`'s one-way door and defects `1b`–`1h` at once | `page/kind.ts`, `page/App.tsx`, `page/Files.tsx` | B.2 |
| **B.4** | **`folder` becomes a definition**, `role_set` → `role_folder`, and the mixed-children reading comes out | `page/Files.tsx`, `src/modules/icons/` | B.2 |
| **B.5** | **`part` and `reference`, and contains is derived.** Two stored links; *contained* is *the child is a graph root*, so filing a block promotes it and nothing new is stored | `src/graph/`, `graph/check.ts` | B.2 |
| **B.6** | **Forms collapse.** `note` and `group` become base definitions; `form` leaves the element record. The largest row, and what `B.1`–`B.5` exist to make safe | `src/graph/types.ts`, the door | B.5 |
| **B.8** | **One log, at the workspace.** Undo becomes workspace-wide, which is the intent. Dissolves `Effect.into`, `writeInto`, the `home` batches and `P.11`'s test; a project export becomes a query over the log and a per-project fold leans on checkpoints. **Sized only after `B.0`**, and **`B.19` must land first** — one log cannot hold two elements with the same id | `workspace/`, `src/graph/`, `project.ts` | B.0, B.19 |
| **B.9** | **Display state moves to workspace metadata** — explorer fold, canvas toggles, and which view each layer was last shown in. Reopening a workspace finds every project as it was left; an exported project carries no opinion about how it is drawn. **Reverses `U.8`'s `localStorage` on purpose** | `page/`, `workspace/` | B.8 |
| **B.11** | **One arrangement, six values, absorbing `axis` and `flow`.** `free` / `grid` / `right` / `left` / `down` / `up`; the four directional ones carry the reading direction. **Model data, in the log** — inference reads it, and an inference is permanent. **`radial` is dropped** (narrow, wrong-looking outside a hub and its attendants) and **`relax` is retired outright** — the action, the `relax_layer` mutation op and its `fill.ts` entry all go, since *hand it back to automatic* has nothing left to mean once arrangement is a setting. **Named loss**: nothing clears hand placement any more. **Watch**: `implied order` is read along it, so `A.9`'s sequence and `A.7b`'s activity must keep their fallback, and **tier 3 must stop firing under `free` and `grid`** | `src/graph/`, `actions/layer.ts`, `geometry/layout.ts` | B.0 |
| **B.12** | **Arrangement becomes a setting**, not a one-time action. **Reverses *an arrangement is never a mode*** — deliberately, because `relax` cannot be anything else. **`at` is never discarded**: a computed arrangement replaces where things draw, and returning to `free` returns the layout (*retained placement*, already the rule) | `actions/layer.ts`, `modules/layout/`, `page/Rail.tsx` | B.11 |
| **B.13** | **`derived` as a relationship flag.** Not in the log, recomputed on fold, not deletable. The relation module set stays `line` / `directed`. First consumer is the workspace's project-to-project dependencies, which are drawn today and stored nowhere | `src/graph/`, `workspace/` | B.5 |
| **B.14** | **An interface is declared, not derived.** Retire the `side` derivation; `side` becomes only where it sits. Reaches `promotion`, which was already the explicit act | `src/graph/`, `modules/view/diagram/` | B.6 |
| **B.15** | **View definitions become their own records** — a **view subtype**: one required view module plus its options, reusable rather than copied into every definition. A block definition carries **`views`, an ordered list of them, first entry the default** — one field, because which view opens is a presentation detail. The base package ships a trivial view definition per module so every entry is the same kind of thing | `src/graph/types.ts`, `src/modules/view/` | B.2 |
| **B.16** | **The module schema is enforced at import, and an unknown module reports a fault.** A definition must match the registered option surface of the module it names; a module the build does not know falls back to the base block **and says so**. Never silent — a file from a newer build must not open looking subtly wrong with nothing to explain it | the door, `graph/check.ts` | B.2, B.15 |
| **B.20** | **A `resource` block carries a workspace-relative path or link**, and the explorer and canvas draw one. A file, a script, a data file, an image, a note. **Embedded content is out of scope** — a path only, so the log never carries bytes | `packages/base/`, `src/modules/`, `page/Files.tsx` | B.2 |
| **B.21** | **A view holds views, and a reference carries `depth`.** A matrix's two axes are child views; `self` / `children` / `all` says how far each reference reaches, which is what makes dragging a whole project in give you its blocks as rows and keep them live. **`ST.4`'s payoff, and it needs `B.6` under it** | `src/modules/view/`, `src/graph/` | B.6, B.15 |
| **B.22** | **Pin a layer view as a view block.** A pin at the canvas's top right; the block holds references to what is on stage, names the view definition in force, and is filed like anything else. **The other half of `ST.4`'s payoff** — `P.4` made a set from the explorer, this makes one from what you are looking at | `canvas/`, `src/actions/`, `src/modules/view/` | B.21 |
| **B.23** | **Wire `create` and `infer` to `word` and `creates`.** Parked since **A.7c** — `ViewModule` carries both and nothing reads them, so a right-click in an activity makes a plain block rather than an action. Not a new capability; a wire that was never run | `src/actions/`, `src/modules/view/` | B.15 |
| **B.24** | **Filing a block promotes it.** The rule `B.5` derives *contained* from — dragging a loose block into a folder or onto the workspace retypes it to `project`, dragging it into a project files it as a part. **`P.14` already dissolved *beside*: every drop is *into* something**, so this is that rule finishing rather than a new gesture | `page/Files.tsx`, `src/actions/` | B.5 |
| **B.25** | **The explorer hides empty blocks.** Basic blocks, interfaces and references are usually empty, and hiding them is what makes a large tree readable. **A project or package root is always shown, even when empty.** Display state, so it lives in workspace metadata | `page/Files.tsx` | B.9 |
| **B.26** | **The fold merges checkpointed definitions with folded ones.** A package arrives as a checkpoint, not as steps, so its definitions are not in the workspace log — the fold has to read both. Checkpoints already carry a graph, so this is probably a merge and a lookup order, but *probably* is how the last two schema surprises started | `src/graph/fold.ts`, `workspace/` | B.8 |
| **B.27** | **Every minted project goes through `workspace.begin`.** tasks.md defect **2**: a project minted by `infer` (and by anything else reaching `writeInto` + `onAdmit` directly) gets a root labelled `""`, so it draws blank — and it **skips `mayName`**, the duplicate check `workspace.begin` exists to enforce. `P.3` made three paths into one *admit* door; this makes them one *naming* door too. **Done when**: no path can make a project without a name, a duplicate name is refused wherever it comes from, and `infer`'s result is named | `src/actions/behavior.ts`, `workspace/`, `page/App.tsx` | B.8 |
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

### The waves, in order

**Handed off cold, work them in this order.** Each leaves the app running and drivable, and each
names the story it serves. **Waves 1 and 3 are independent** — a second owner can take 3 while the
first works 1.

| | Rows | Story | Why here |
|---|---|---|---|
| **1** | `B.2` → `B.9` | `ST.4` | the model core. Everything later is written against it, and **`B.8` carries live defect 1** (a write to the wrong project's log), so it is not deferrable |
| **2** | `B.11` → `B.16`, `B.26`, `B.27`, `B.17` | `ST.4` | settings, definitions, the naming door — and **one migration last** |
| **3** | `N.1`, `N.3`, then `N.4` → `N.7` | `ST.1`, `ST.3` | **two failed stories.** `N.1` and `N.3` need nothing and are most of what Clay tried to do; `N.4`–`N.7` want `B.2`'s base package. **`N.2` is wave 6**, behind `B.8` |
| **4** | `I.1` → `I.5`, `I.7`, `I.8` | `ST.7`, `ST.11` | **the terminal, moved up from last.** Three reasons, in order of weight: it **deletes ~840 lines** every other stream currently works around; `I.2`'s narrowing is what frees `rank.ts`, which is what lets `C-a` be answered cleanly in wave 5; and **`I.7` is the safety net under `ST.10`** — narrowing context menus is only honest once help is a text route to every action. **`I.6` does not come with it**, since it needs `W.6` |
| **5** | `C.1` → `C.8`, defects 19–21 | `ST.8` | explorer and canvas consistency. `C-a` is answerable by now, and `C.8` lands beside `I.8` |
| **6** | `N.2`, `W.5`, `W.6`, then `I.6`, `B.18`, `B.20` → `B.25` | `ST.1`, `ST.9`, `ST.7`, `ST.4` | demotion once one log makes it cheap; the tray/table split; then the payoff — results on the stage, the pin, views holding views |
| **7** | `O.1` → `O.3` | `ST.5`, `ST.6` | reaching outside. Waits on `B.2` and `B.20` |

> **The order was not followed on 2026-08-20, and nobody asked for that** (Clay). A batch landed
> `B.2` and `B.7` from wave 1, `N.1` from wave 3, and **`C.2`, `C.4`, `C.5` and `C.7` from wave 5** —
> four rows jumped two waves. Two of the four landed short and one of them broke drawing a
> relationship, which is the cost the ordering exists to avoid: wave 5 is *explorer and canvas
> consistency*, and it was written to run **after** the model core stopped moving. **Wave 1 resumes
> at `B.3`.** The `C` repairs (`C.9`–`C.11`) are the exception — they are owed on work already in
> the tree, so they come before anything new in `C`.

**`ST.11` is not a wave.** Its deletions attach to the rows that free them, under one rule:
**nothing is deleted for being old; a thing goes when the row that removed its last consumer lands.**
`B.8` takes the write routing, `B.11` takes `relax` and `axis`, `I.8` takes the ranker, `I.1`–`I.7`
take the old terminal. A row that frees something and leaves it standing has landed short.

**Left out of the waves on purpose**: `S7` and `S8.1`/`S8.2` (renames and a seam — after wave 2, or
they collide with every row), `T.3` (waits on `B.9`; *do not test a design that is still moving*),
`P.9` and `X.3` (both `⚠`, superseded in mechanism by `B.15`), and `Y.10`.

**`ST.1` and `ST.3` were driven on 2026-08-20 and both failed** — see stream `N`. Every row under
them had landed. **Nothing under a story counts until Clay has driven the story**, and this is the
second time that has been proven rather than asserted. `ST.2` is still undriven and `P.7`'s gap
(`C.7`) is known to block it.

> **Stream `B` is the queue. Start there** — its *Running this stream unattended* block carries the
> order, the standing rules and a *done when* per row.
>
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

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
| ~~**kind signal**~~ | ~~`layerKind` hardcodes `packId("behavior")`~~ | **dissolved by `ST.4`** — there is no kind to signal. It comes out with the derivation, not as a repair |
| ~~**kind by fiat**~~ | ~~`childKind` reads `kindOf(viewOf(...).module)`~~ | **dissolved by `ST.4`** — the `view` component answers *which modules apply*, which is the only question that was ever being asked |
| **seeded block** | a new behavior project holds one **unnamed** block | derivation needs a child, but an empty label is an invented behaviour |

~~**`R.9` element vocabulary**~~ — **closed by `X.2`**: `App.tsx`'s `kindsInScope` hands the strip
both halves of the vocabulary, packages included.

### Waiting on Clay — none

~~**Bug 2, the matrix's partial tray.**~~ **Answered 2026-08-20, and the question dissolved rather
than picking (a) or (b).** Neither option was right because the premise was: *the tray and the table
are the same thing.* **They are not — that was a placeholder.** See stream `W` below: the tray is a
layer-and-selection inspector with **two** sizes, and table and matrix are **stage views that are
always full**, like the canvas.

### Bugs found on the way — 30, one fixed, one closed by a row

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


## I — the terminal overhaul

**Specified by Clay, 2026-08-20.** A major re-think of what the terminal is, and mostly a
**narrowing**: fewer things it can do, more it says. `Z.9` already trimmed the wave to a ranking
surface and a fixed prompt pane; this decides what the surface is *for*.

**What it is.** An interactive, adaptive, context-aware, **collapsible** strip. It **reflects
context and action as you use the app** — you act on the canvas, the terminal says what happened —
so it is a mirror as much as an input. It can **focus and highlight parts of the workspace and the
page**, which is what makes filtering visible and interactive help possible at all.

**Two views, and a mute.**

| | Shows |
|---|---|
| **expanded** | prompt / context history, plus a chip, plus the chip's description |
| **minimal** | the current context or completion, plus a chip |
| **both** | a toggle at the **far right** to a static cursor — **quiet mode** |

**Four commands, and the verbs are flexible** — a user reaches for their own word and it is matched,
which is the same *rank what was picked* machinery `rank.ts` already holds.

| Command | Reached by |
|---|---|
| **add blocks** | `+` `b` `block` `new` `add` `insert` `create` |
| **filter workspace** | `:` `f` `find` `filter` `scope` `view` |
| **search packages** | `*` `s` `search` `import` `load` |
| **interactive help** | `?` `h` `help` `doc` `guide` `how` |

**Completions show the matched command and its description**, and **fill with example arguments**.
A name typed with underscores or separators reads as spaced words.

**Results are a table.** Package search, workspace filtering and workspace status all present as a
**table view** rather than as terminal text — which is why this waits on `W.6`, where the table
becomes a real stage view rather than the tray.

**Help is the fallback.** Anything unmatched lands in interactive docs, tutorial and prompts, which
is where `Z.5`'s tutorial finally has somewhere to live.

**Where the rest of the action surface goes — settled 2026-08-20: behind interactive help.** The
rail offers every registered action today; four commands is a deliberate narrowing, and `arrange`,
`group`, `relate` and `infer` are reached by `?`. **Help knows every action and can run one**, so
nothing becomes unreachable by text and the strip stays four commands wide. *This is what makes help
load-bearing rather than a courtesy* — it is the whole action surface's text route, and `Z.5`'s
tutorial lives in the same place.

**Results open on the stage — settled**: package search, workspace filtering and workspace status
present through `W.6`'s real table view, not a second listing inside the terminal.

| | Does | Owns | Waits |
|---|---|---|---|
| **I.1** | **Two views and a mute.** **Minimal**: the current context or completion, plus a chip. **Expanded**: prompt and context history, plus the chip and its description. **Both carry a toggle at the far right to a static cursor — quiet mode.** Collapsible is the shape of the whole thing, so this row is the frame every other `I` row fills. **Done when**: both views draw, the toggle mutes, and the choice survives a reload as workspace display state (`B.9`) | `src/terminal/`, `src/styles.css` | B.9 |
| **I.2** | **Four commands, and the verb is the user's.** `add blocks` (`+` `b` `block` `new` `add` `insert` `create`), `filter workspace` (`:` `f` `find` `filter` `scope` `view`), `search packages` (`*` `s` `search` `import` `load`), `interactive help` (`?` `h` `help` `doc` `guide` `how`). **Flexible matching is `rank.ts`'s job, already built** — it ranks what was picked when a default was overruled, which is exactly *this person says `find` where I said `filter`*. **Done when**: every listed verb and character reaches its command, and a verb the user prefers rises | `src/actions/rank.ts`, `src/terminal/` | I.1 |
| **I.3** | **Completions say what they matched and fill an example.** The matched command with its description, and arguments filled with an example rather than left blank — a prompt that shows its own shape needs no syntax to learn. **A name typed with underscores or separators reads as spaced words** (`heat_exchanger` → `Heat Exchanger`). **Done when**: choosing a completion leaves a runnable line, and the separator rule is a property test | `src/terminal/` | I.2 |
| **I.4** | **The terminal mirrors what you do.** Act on the canvas and the terminal says the context and the action — so it is a mirror as much as an input, and quiet mode is what turns that off. **This is the row that makes it worth keeping open**; `U.12` already puts the last action at the explorer foot, and that surface is the one to move rather than duplicate. **Done when**: a create, a relate and a descend each show, and mute silences all three | `src/terminal/`, `page/App.tsx` | I.1 |
| **I.5** | **The terminal can focus and highlight the workspace and the page.** Filtering lights what matched; help points at the control it is describing. **One mechanism, two callers** — and it is the same lit-target treatment `P.14` and `C.5` use, never a third look. **Done when**: a filter lights matching blocks in the explorer and on the stage, and help can point at a named control | `src/terminal/`, `page/`, `src/styles.css` | I.1, C.5 |
| **I.6** | **Search, filter and status open on the stage as a table.** Not a listing inside the terminal — `W.6`'s table view, given a result set instead of a layer. **Watch**: this is the first caller that hands the table something that is not a layer's contents, so the seam it needs is the same one a **view block** needs (`B.21`) — do not invent a second | `src/terminal/`, `modules/view/table/` | W.6, B.21 |
| **I.8** | **The ranker is re-aimed, not removed.** `rank.ts` (186) and `feedback.ts` (92) rank **33 actions** today by embedding lead plus learned overrule preference. **They keep both mechanisms and point them at the four commands instead** — because **`I.2`'s verb lists are examples, not an enumeration** (Clay, 2026-08-20). Somebody will type a word nobody listed, and **substring matching cannot answer that**; an *intelligent* terminal has to match meaning, which is what the embedding lead is for, and has to learn the word this person actually reaches for, which is what the overrule store is for. **So this row shrinks the ranker's *subject* and keeps its *machinery*.** Its other consumer is `typelist.ts`, whose fate `C.8` decides — this row and `C.8` **must agree or land together**. **Done when**: an unlisted synonym still reaches the right command, a preferred verb rises over repeated use, and the four-command surface is ranked by the same code the action list was | `src/actions/rank.ts`, `src/actions/feedback.ts`, `src/terminal/` | I.2, C-a |
| **I.7** | **Interactive help is the fallback, and it carries the action surface.** Anything unmatched lands in docs, tutorial and prompts. **Every registered action is reachable and runnable here**, which is what `I.2`'s narrowing rests on. `Z.5`'s tutorial is this row's, at last — it waited because *a tutorial teaches whatever the app currently is*, and this is what it will be. **Done when**: `?` with no argument offers the tutorial, `? <action>` describes and can run it, and no registered action is unreachable. **`ST.10` depends on this row existing** — per-module context menus narrow what is offered on an element, and that is only honest once there is a text route to everything | `src/terminal/`, `docs/` | I.2 |


## O — reaching outside the workspace

**Two stories, sketched 2026-08-20**, and both are the same shape: something crosses the boundary
between this browser tab and the world.

**In — packages, scripts and resources** from a **GitHub repo or a local folder**. A resource is
already a workspace-relative path (`B.20`), so what is missing is the fetch and what it lands as.

**Out — translation** to a **site, a simulator, parametrics, or code**. `translator` and `artifact`
are already defined and deliberately one-way: a translator reads a project and emits, and never
writes back. The action that runs one may record a `resource` block pointing at what it made.

**Settled 2026-08-20 (Clay).** **In: a public GitHub repo, read over `fetch`** — no server, no
credentials, nothing stored, so design.md's client-only rule holds as written. **Out: the site
first**, because it is closest to what already exists (the SVG export) and needs the least new
machinery, so it teaches the `translator` seam rather than a target's own problems.

**Deferred deliberately**: **local folder** import (File System Access API — Chromium-only, and a
user gesture per session) was not taken and is not in scope. Simulator, parametrics and code follow
the site, in an order nobody has set.

> **Recorded, not scheduled, and it reopens a design decision**: Clay wants eventually to supply
> **enhanced packages as a value add from a private repo or a server**. That is a hosted component,
> and design.md currently says *no server, no cloud home, no sync* — so it is a **product decision
> that changes a founding rule**, not a row. It is written down here so nothing is built assuming it
> is coming, and so nobody quietly relaxes the rule to make room for it.

| | Does | Owns | Waits |
|---|---|---|---|
| **O.1** | **A package comes in from a public GitHub repo.** Given a repo path, read its raw files over `fetch` and admit what it holds as a **package** — locked, in the workspace, in the vocabulary list if it carries definitions. **No credentials, nothing stored, no sync**: it is an import that happens to reach the network, and a failed fetch is a fault at the door like everything else read in. **Watch**: rate limits and CORS are real and unglamorous — prove them before the row is called done. **Done when**: a named public repo's package loads, its definitions are offered, and it survives a reload | `src/graph/file.ts`, `workspace/`, `page/` | B.2 |
| **O.2** | **A resource comes in the same way.** `B.20` makes a resource block hold a workspace-relative path; this is where a path may point at a repo file. **No bytes in the log** — the path travels, the content does not | `packages/base/`, `workspace/` | B.20, O.1 |
| **O.3** | **The translator seam, proven by the site.** A translator reads a project and emits an **artifact**; it never writes back, and the action that runs one may record a `resource` block pointing at the output. **The site is the first target** — a static, readable rendering of a project. **The seam is the deliverable, the site is the proof** | `src/translate/` (new), `src/actions/` | O.1 |


## N — back to the drawing board

**Clay drove `ST.1` and `ST.3` on 2026-08-20 and both failed.** Every row under them had landed.
That is the whole argument for *a story is closed only by Clay, after he has driven it* — and it is
the second time this project has learned it.

**One sentence holds all of it:**

> **"Everything is a block" only works when the workspace treats them all equally.**

It does not. A project root is special-cased in three separate places, none of them a decision
anybody took — they are omissions that were never noticed because nobody tried.

### What driving found, checked against the code

| | What Clay saw | What is actually there |
|---|---|---|
| **a** | *I cannot move root / project blocks at all* | `projectRoot` in `page/Files.tsx` renders a row with a **`dropzone` but no `draggable` and no `onDragStart`** — it can receive and can never be picked up. Workspace folder rows in `shellBranch` are the same. **Not a rule, an omission** |
| **b** | *…and `extraction` would refuse anyway* | `workspace/index.ts:282` — `if (!held \|\| id === ROOT) return { refuse: "Nothing to take out." }` |
| **c** | *If I make them part of the workspace I cannot move them back* | **There is no demotion path at all.** `B.24` settled that *filing a block promotes it*; nothing anywhere says how a project becomes an ordinary block again. **A gap in the settled model, not a bug** |
| **d** | *A moved sub-block does not show as moved until I click something else* | `P.15` claims a `refoldAt` counter fixes exactly this and is annotated **landed (not driven)**. It does not work |
| **e** | *I cannot tell a behavior from a structure* | `ROLES` in `modules/icons/index.tsx` is `role_leaf`, `role_container`, `role_interface`, `role_set` — **there is no behavior role at all**, so `P.5`'s *every role carries a mark* held only over the structure half |
| **f** | *Right-click empty explorer space should offer every base type* | `Files.tsx:1066` opens the naming prompt with `setAdding({ parent: null })` — one thing, no choice |

### What this changes in the settled model

**Demotion is the real hole.** `B.5` derives *contained* from *the child is a graph root*, and `B.24`
makes filing promote a block. **Both are one-way.** Dragging a project into another project has to
mean *this stops being a root and becomes a part* — which is a **merge of two graphs under one log**,
and it is only cheap once `B.8` has landed. Until then it is expensive and fiddly; after it, it is
moving a subtree. **So `N.2` waits on `B.8` deliberately** rather than being forced early.

**And the context menu needs re-thinking, not extending** — Clay's words. Two surfaces, one rule:

| Right-click on | Offers |
|---|---|
| **empty explorer space** | **every base type** — the choice of what to make, because the workspace holds all of them equally |
| **empty canvas** | **no choice** — it makes the type appropriate to the layer you are in, because you have already said what you are working on by being there |

That is not two designs; it is one rule about **where the choice has already been made**.

**`N.6` is the *empty space* rule only.** What a right-click **on an element** should offer is a
separate and larger question — story `ST.10`, in *Not in the queue*. Do not widen `N.6` into it.

| | Does | Owns | Waits |
|---|---|---|---|
| **N.1 ◐** | **LANDED SHORT 2026-08-20 — and the story symptom reproduces.** The write is right: `workspace.file` mints or moves the root's reference, the explorer rows are draggable, and the workspace log records `filed: Alpha` → `move_element`. **The gap is the half the row was named for.** Dropping a project into a folder makes it **vanish from the tree** — it is inside, but the folder was empty when the drag started, so `holds` was false, no spring callback was handed to the dropzone, and nothing opens it after the drop. It comes back only when you **click the folder**, and disappears again on every reload. *The tree redraws without a second click* is the clause that failed, which is `ST.1`'s original complaint. **Also unreachable**: `workspace.folder()` has **no caller anywhere in `src/`**, so no folder can be made from the app at all — this row could only be driven by seeding one into `localStorage`. See `N.8`.  ~~**A project root is draggable, like anything else.**~~ Give `projectRoot` and the workspace folder rows the `draggable` / `onDragStart` that every other row has, and lift `extraction`'s `id === ROOT` refusal for the case where a root moves **to another place in the workspace** — into a folder, out of one, beside another project. **This is the cheap half and it is most of what Clay tried to do**; the expensive half is `N.2`. **Done when**: a project drags into a folder, out again, and the tree redraws without a second click | `page/Files.tsx`, `workspace/index.ts` | ⊘ |
| **N.8** | **A workspace folder can be made from the app.** `workspace.folder()` has existed, been exported and been tested since the workspace landed, and **nothing in `src/` has ever called it** — so the folders `N.1` files projects into cannot be brought into being by a person, and `N.1` could only be driven by seeding one into `localStorage`. This is the same shape of hole as `V.14`'s invisible `＋`: the capability is built, the way in is not. **Do not invent a second create surface** — it belongs on the gesture `N.5` is already re-thinking, as one more base type offered on empty explorer space. **Done when**: a folder is made from the explorer, named, holds a project dropped into it, and is still there after a reload | `page/Files.tsx`, `src/actions/` | N.5 |
| **N.2** | **A project can become an ordinary block again — demotion.** Dropping a project **into** another project means *stop being a root, become a part*, which is merging one graph into another. **Deliberately waits on `B.8`**: with one log it is moving a subtree and re-parenting it; with a log per project it is a merge, a re-mint and a cascade, which is how `P.12` came to exist. **Done when**: a project dragged into another becomes a block there, its definitions travel, and undo puts it back as a project | `workspace/index.ts`, `src/actions/` | B.8, B.24 |
| **N.3** | **A move redraws immediately — for real this time.** `P.15` is annotated landed and does not work; **start by finding out why** before writing anything, because the `refoldAt` counter is either not firing, not reaching the source tree, or being overwritten by a later memo. **Done when**: a cross-project drop shows the block gone from the source and present in the destination **with no further input**, driven in a browser | `page/Files.tsx`, `page/App.tsx` | ⊘ |
| **N.4** | **A behavior block is visibly a behavior block.** `ROLES` carries no behavior mark, so `P.5`'s *every role carries a mark* was only ever true of structure. Add them, on Clay's rule: **hollow for a leaf** (block, action, state), **filled for one with children** (container, activity, machine). **The icon conformance test walks a closed `ROLES` set**, so adding a role without a mark fails loudly — extend the set and the test comes free. **Done when**: an action and an activity are distinguishable from a block and a container at a glance, and no two roles draw one path | `src/modules/icons/`, `page/Files.tsx` | B.2 |
| **N.5** | **Right-clicking empty explorer space offers every base type.** Not the naming prompt for one thing — the choice of what to make: structure, behavior, folder, view, resource, note, group. **The workspace holds them all equally, so the menu that makes them must too.** **Done when**: every published base definition is offered, and picking one makes it where the click was | `page/Files.tsx`, `src/actions/` | B.2, N.6 |
| **N.7** | **One create button, and it makes a block.** The explorer bar carries **two** create controls today — `add()` and `addBehavior()`, the second added when a behavior could not be made any other way (`P.6`'s replacement). **`N.5` removes the reason for both**: every base type is offered on a right-click, so the bar does not need one control per type and never will. **The `+` becomes plain *block*** — the common case, one click, no menu — and everything else is a right-click away. **And `P.2`'s dedicated *New project* button goes with them** (Clay, 2026-08-20): it existed because *deselect, then `+`* was invisible, and **a project is implicit now** — a top-level block **is** one, and right-clicking empty space makes one. **This is a deletion row**: `addBehavior`, the `behavior?` flag on `adding`, the second create button and the *New project* control all go. **Done when**: **one** create control remains, it makes a block, a project is still one gesture from empty space, and nothing on the bar names a type | `page/Files.tsx`, `src/modules/icons/` | N.5 |
| **N.6** | **The context menu, re-thought.** Clay's rule: **the choice belongs where it has not already been made.** Empty explorer space offers every base type; **empty canvas offers none and makes what suits the layer** — being in an activity is already saying what you want. This is also where `B.23` (`create` wired to the module's `word` / `creates`) becomes visible, and where `R.5`'s *no submenus* rule has to hold against a list that now includes every base type. **Done when**: the two surfaces follow the one rule, and neither grows a submenu | `page/Files.tsx`, `canvas/gestures.ts`, `modules/view/*/map.ts` | B.23 |


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
| **X.2 ◐** | **One capped, expandable list, used by all three surfaces.** Top three by learned preference, import order cold; a *More…* entry expands in place; the expanded list scrolls past a height. The relation types group takes the top three and no expansion **Landed short (driven)**: `typelist.ts` moved to `src/actions/` by `git mv` - one list beside `offer()`, owned by no component - and its tests moved with it to `tests/actions/`. **`R.9`'s two gaps are closed**: the overrule store is counted in one place, `feedback.weights`, which `rank.ts` and the type list both call; and the page hands down **both halves** of the vocabulary (`kindsInScope` - packages in order, then the project's own), so a block, a group or a note is offered package stereotypes rather than the project's own alone. The rail's relation group takes the rule's three and reads the cap from the one place it is written. Driven: two types defined in the tray appeared as strip chips, and picking one retyped the card. **Two gaps: the group is capped but not *ranked* by use** (nothing records a pick there as an overrule yet), and **the edge menu is still not a consumer** - tasks.md **17** and **18**. | `src/actions/`, `modules/view/diagram/`, `src/styles.css` | X.1, R.5, R.9 |
| **X.3 ⚠** | **`B.15` changes what it mints**: definitions are grouped `blocks` / `relations` / `views`, so a typed name on a selection mints a **block or relation** definition and must land in the right group. The want and the duplicate-name catch are unchanged. **The strip takes a typed name as well as a pick.** Beside the capped list, a text field: type a name and the selection takes that type. **Nothing new is needed** — `fold.defineNamed` already mints a definition for a bare name under a derived id, and calls itself *the bridge from free text to a real definition*; the suite holds it as *a free-text type becomes a definition with a stable id*. So this is a surface for a built capability, feeding `retype`. **The catch**: a free-text mint derives its id from the name while a deliberate definition carries its own, so typing a name that already exists in scope would mint a **twin** — the duplicate-name case SC.4 needed package-disambiguation for. **Match first, mint only when nothing matches** | `modules/view/diagram/`, `page/Contents.tsx` | R.9 |


## Found by review — the last one left

The closing review's nine defects and the four rows that followed them are in
[landed.md](landed.md). **One is left**, and it is the only one that was never a defect: the strip
at the foot of the stage still says nothing about what the selection could be.

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*


## C — the explorer and the canvas answer back

**Story `ST.8`. From driving the app, 2026-08-20.** None of it depends on stream `B`, so it can run
beside the block model with a second owner.

**The goal is consistency, not the features.** Every part somebody can adjust by hand — a card, a
frame edge, a block anchor, an interface — should **target the same way, light the same way and move
the same way**, and say so while it is happening. The rows below are how that is reached; a row that
lands its feature while inventing a fifth way to show a drop target has missed the point.

**Two standing rules for this stream:**

1. **One lit-target look, everywhere.** `P.14` set it for the explorer tree and the canvas already
   had it. `C.5`'s frame edges, `C.2`'s anchors and `I.5`'s highlights all reuse it — **never a
   second treatment**.
2. **Hand-adjusting anything means the layer is `free`** (`C.6`). It is one rule covering blocks,
   anchors and interfaces, and it is what makes a solid anchor legible.

**The one-anchor-per-side rule is retired** (Clay, 2026-08-20). `NodeCard.tsx:270`,
`Frame.tsx:92` and `Note.tsx:92` each draw **four anchors per card, always**, whether or not
anything meets them — invisible at rest and shown on selection. **They read as clutter and they go.**
**An anchor appears where a relationship actually meets the block**, and nowhere else.

| | Does | Owns | Waits |
|---|---|---|---|
| **C.1** | **A project's name carries its block count, in the explorer** — `Coolant Loop (34)`, so the weight of a folded project reads at a glance. **The explorer's alone**; nothing on the canvas draws it. Counted over the folded graph, derived, never stored. **Watch**: it must not count references as blocks, or a view of forty things reads as a forty-block project. **Done when**: a project row shows its count, the count follows a create and a delete, and a folder of references does not inflate it | `page/Files.tsx` | ⊘ |
| **C.2 ◐** | **LANDED SHORT 2026-08-20 — and it broke drawing a relationship.** Both halves work once the page has loaded: driven, one anchor per arriving line (2 on the stage, not 8), dragging it moves it between seats, and a moved one draws solid. **The gap, and it is a regression**: a relationship made *now* draws **no line at all until the page is reloaded**. Handles used to be four static `auto-*` per card, so they existed before any edge referred to them; they are now minted per edge by the same render that adds the edge, and React Flow drops an edge whose handle was not in its store when the edge arrived. Confirmed against `HEAD`, which draws it immediately. **The remainder is `C.11`.**  ~~**An anchor exists where a line meets a block, and is draggable between seats without promotion.** Two halves. **(a)** The always-four rule goes: an anchor is drawn where a relationship actually arrives, so a card with one line has one. **(b)** Dragging it moves it between the seats available on that border; **a moved anchor draws solid**, to say its position is yours rather than the engine's. **Promotion stays a separate act** — an interface is a real element with a name and a type, and moving a line's end is not that~~ | `modules/view/diagram/`, `src/actions/`, `src/geometry/` | ⊘ |
| **C.7 ◐** | **LANDED SHORT 2026-08-20.** Driven: a block dragged from one project onto another's canvas draws a reference card reading **`Impeller`**, the table row reads **`stands for Impeller`**, and both survive a reload. **Two gaps.** (a) *The honest limit is not drawn honestly*: a reference into a **closed** project renders the same literal `missing` as one whose target is gone, so the row's *says so rather than looking broken* is unmet. (b) **The inversion the row asked for was not done** — `canvas/named.ts` imports `workspace` directly and the table module imports *upward* into `canvas/`. **The remainder is `C.9`.**  ~~**A reference shows what it stands for, across projects.**~~ Today `actual()` resolves inside **one** fold, so a reference to another project's block draws as *missing* on the card and in the table — which is what `P.7` landed short on (tasks.md **15**). **`workspace.resolve` is the resolver and the workspace already holds every open project's graph**; handing it down is a dependency inversion of the same shape as `graph/check.ts`'s `validating()`. **`B.19` makes this easier than it was**: an id is globally unique now, so the lookup needs no project half and a bare id cannot resolve to the wrong element. **The honest limit, and it must be drawn honestly**: a reference into a project that is *not open* still cannot resolve — it draws as missing because it genuinely is. **Done when**: a cross-project reference shows the target's name on a card and in a table row, survives a reload, and a reference to a closed project says so rather than looking broken. **This is what `ST.2` cannot close without** | `page/App.tsx`, `canvas/`, `page/Contents.tsx`, `modules/view/table/` | ⊘ |
| **C.11** | **A new relationship draws the moment it is made.** `C.2` traded four static `auto-*` handles per card for one pair minted per arriving edge — and a handle that does not exist until the edge exists is a handle React Flow has never measured, so the edge is dropped and nothing draws. A reload fixes it, which is why the suite and a screenshot both look fine. **Do not go back to four per side** — that is what `C.2` deleted. The fix is to make the handle available to React Flow **before or with** the edge that names it: seat the anchors from `laidOf`'s seat map on the node's own data (they are already computed there), or let the edge fall back to a side handle for the frame it takes to mount. **Done when**: right-drag card to card and the line is there, with no reload, driven — and `C.2`'s one-anchor-per-arriving-line rule still holds | `modules/view/diagram/pieces.tsx`, `modules/view/diagram/compose.ts` | ⊘ |
| **C.9** | **The cross-project resolver sits where the dependency map allows.** `C.7` works and reaches it the wrong way round: `canvas/named.ts` imports `workspace` (canvas may not), and `modules/view/table/{rows,columns}.ts` import **upward** into `canvas/` (modules may not — README.md's table). The row itself asked for *a dependency inversion of the same shape as `graph/check.ts`'s `validating()`* and that is the part that was skipped. **`shownName` / `stoodFor` are already pure over `(here, open, …)`**, so this is a move plus a registration, not a redesign — put them where `modules/` may legally reach and let `page/` keep handing `open` down. **Done when**: no file under `modules/` imports `canvas/`, no file under `canvas/` imports `workspace/`, the cross-project name still draws on a card and in a table, and `tests/canvas/named.test.ts` has moved with the code | `src/canvas/named.ts`, `modules/view/table/`, `src/graph/` or `src/modules/` | ⊘ |
| **C.10** | **One card, drawn once.** `C.7` left `src/canvas/NodeCard.tsx` (285 lines) as a near-copy of `modules/view/diagram/NodeCard.tsx` (348), differing only in `nameOf` → `shownName`, and `Canvas.tsx` overrides `NODES.card` with it — so **the module's own card no longer draws anything in the app while the suite still exercises it**. Two copies of one renderer, one live and one tested, is how they drift. **Clay, 2026-08-20: keep one, and move the tests to it.** The natural shape is the module's card taking the resolver rather than the name, which `C.9` is already moving. **Done when**: one card renderer exists, `Canvas.tsx` overrides nothing, the diagram tests cover the surviving one, and a cross-project reference still reads its target's name on the stage | `src/canvas/NodeCard.tsx`, `modules/view/diagram/NodeCard.tsx` | C.9 |
| **C.8 ◆** | **The relation type lists stop being a capped guess** — tasks.md **17** and **18**, the two gaps `X.2` left. **Clay's direction, 2026-08-20**: show them all, ordered by **similarity between what was keyed and the registered keys**, rather than capping at three and ranking by learned overrules. **This needs one answer before any code** — see `C-a` in [tasks.md](tasks.md): *show all* is obviously right for the terminal's four commands and obviously wrong for a vocabulary of fifty relation types, so which surfaces take *all* and which still cap. It also decides whether similarity **replaces** `rank.ts`'s learned preference on these lists or sits in front of it, and `X.1`/`X.2` moved that machinery days ago | `src/actions/`, `modules/view/diagram/` | ◆ C-a |
| **C.6** | **Hand-adjusting anything sets the layer to `free`.** Moving a block, an anchor or an interface by hand is a statement that the positions are yours, so the arrangement follows the gesture rather than being set separately — and under any **non-free** arrangement the engine owns **all three**: block positions, anchor seats and interface seats. One rule replacing three, and it is what makes `C.2`'s solid anchor legible: solid means *free, and placed by you*. **Watch**: `at` is still retained across the switch, so returning to `free` returns the whole layout — anchors included | `src/actions/`, `src/graph/`, `modules/view/diagram/` | C.2, B.11 |
| **C.3** | **Selecting on the canvas moves the explorer with you.** Picking a card sets the explorer's context and expands the branch to it, so the two panels never disagree about where you are. **`reveal` already does exactly this in the other direction** — explorer to canvas — so this is its mirror and should reuse it rather than growing a second path | `page/App.tsx`, `page/Files.tsx` | ⊘ |


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
| **Y.10** | **One design for every panel edge, and one for every panel label.** **The edge**: explorer, terminal and tray each fold, and each does it differently today — `◂`/`▸` on the explorer, a chevron on the tray, its own control on the terminal. They become **one thick edge that lights on hover, carrying an arrow that says which way it folds**. The options column is **not** one of them: it is a fixed width and does not fold. **The label**: the canvas frame writes its name *on* its own border, straddling it with the ground showing through (`.frame-name`) — every panel takes that treatment, so a panel and a frame are visibly the same kind of thing. **Not a resize handle**: drag-to-size means a stored width per panel and a canvas refit on every drag, and that is a different row if it is wanted at all | `page/`, `src/styles.css` | ⊘ |


## W — the tray shows what is in focus

> **Settled 2026-08-20 (Clay): the tray and the table are two different things, and their being one
> was a placeholder.** Everything under *Contents already is the table view* below was built on that
> placeholder and is superseded in shape by `W.5` and `W.6`. What landed still runs; what it means
> has changed.
>
> | | Is |
> |---|---|
> | **the tray** | a **layer-and-selection inspector** at the foot of every view. **Two sizes — shut and open.** Lists the current layer's elements, or the selected element's details. Keeps the hover-row-lights-the-canvas tie |
> | **table** and **matrix** | **stage view modules, always open full**, exactly like the canvas. They own **column choice** and **drops from the explorer**, and they need **no** hover-to-canvas tie because there is no canvas beside them |
>
> **So `full` stops being a tray size.** It was the toggle's all along: setting a layer to `table`
> puts the table on the stage. The tray's third size, and `U.18`'s `tray.full` that `W.1` closed,
> both come back out.

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
| **W.5** | **The tray stops being the table, and has two sizes.** **Shut** (the bar) and **open** (a quarter of the stage) — `full` comes out, and with it `U.18`'s `tray.full` that `W.1` closed. What it shows is one question answered at the depth the pointer is at: **nothing selected → the current layer's elements; something selected → that element's details** (a block's fields, a note's text, a relationship's ends). **The hover-row-lights-the-canvas tie stays** — it is the tray's whole reason to sit beside a drawing. **Done when**: the tab opens and shuts it, a card pick scopes it to that card, an empty click returns it to the layer, the size survives a reload, and **no control anywhere offers a third size** | `page/Contents.tsx`, `page/Panel.tsx`, `page/App.tsx`, `src/styles.css` | ⊘ |
| **W.6** | **Table and matrix are stage views, always full.** Like the canvas: the view toggle puts one on the stage and it fills it. **They own what the tray must not** — choosing columns (`P.8` landed it on the rail), taking drops from the explorer (`P.7` landed `takesRef`), and, for the matrix, its axes and kinds (`P.9`). **They need no hover-to-canvas tie**; there is no canvas beside them. **`W.1` deleted the module's own listing as a duplicate — it was not one**, and this row is where it comes back, as the stage rather than as a second copy of the tray. **Watch**: do not rebuild it by widening `Contents.tsx` again; that is the coupling this row exists to cut. **Done when**: switching a layer to `table` fills the stage, columns and drops work there, and the tray at its foot is showing the **selection**, not the same layer twice | `modules/view/table/`, `modules/view/matrix/`, `page/App.tsx` | W.5 |

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

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
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

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
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

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
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
| **P.2 ⚠** | **Comes back out at `N.7`** (Clay, 2026-08-20): a project is implicit — a top-level block **is** one, and `N.5` puts every base type on a right-click, so a control that names one type on the bar is the duplicate this row created. The *reason* it existed still stands and is what `N.5` answers. **The explorer bar gains a visible way to make a project.** Today the only route is *deselect, then `＋`*, and the deselect is invisible — which is how Clay came to believe projects could not be made at all. One control that makes one outright, no gesture first. **One control, not two**: under model B a folder *is* a set of projects, so there is nothing else for a second icon to make **Landed (not driven)**: A dedicated *New project* button on the explorer bar reaching the same naming prompt with no deselect first; new `new_project` icon. The selection-following `+` is untouched. | `page/Files.tsx`, `src/modules/icons/` | ⊘ |


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
| **P.9 ⚠** | **Superseded in shape by `B.15` / `B.18`** — a matrix's axes are now **two child views**, and *which relation kinds count* is a view definition option rather than a control of its own. The want is unchanged; the mechanism is. Do not build it against the old shape. **A matrix's axes and kinds are chosen.** Rows against columns is one reading of a set; *these blocks against those requirements* is the one an allocation view needs. Which relationship kinds count is the same question the heatmap asks, so **`W.4` and this row are one design and should land together or in order** — do not let two different answers to *which kinds* appear. **`B.15` settles it**: *which kinds* is a view definition option, so both rows read it from there | `modules/view/matrix/`, `page/Rail.tsx` | P.7, W.4 |


### The workspace is the root, and it is already a project

**Checked, not assumed.** Clay's reading is not a new idea to encode — **it is the built model with
no door on it**, which is the shape of every gap this stream has found.

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
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

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*


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
| **P.14** | **A drag says where it will land, the way the canvas does.** Three things the tree lacks and the canvas has: the target **lights as a target** rather than wearing one flat outline; *into this branch* and *beside it* look different, since they are different drops; and **a folded branch opens when the pointer rests on it**, which is what makes a nested target reachable at all. **`move` already accepts nesting** — this is entirely feedback, so the acceptance is *drag a block into a folded branch three levels down without guessing* **Landed short (not driven)**: Lit drop targets matching the canvas, the clear-space *nowhere* target given a rule it never had, and a 500ms spring-open on a folded branch. **The *beside* question is dissolved, not deferred (Clay's call): every drop is *into* something.** A block takes the dragged block as a child, a project root takes it as a child of the root, and empty space makes it a project - a member of the workspace set. All three are already wired (`dropzone(.., node.id)`, `dropzone(.., null)`, `drop(null, null)`), so nothing was missing. | `page/Files.tsx`, `src/styles.css` | ⊘ |
| **P.15 ✗** | **DOES NOT WORK — driven by Clay 2026-08-20.** A cross-project drop still does not redraw until something else is clicked, which is the whole of what this row claimed. Reopened as `N.3`; **start by finding out why the `refoldAt` counter does not fire** rather than writing a second mechanism beside it. **A drop is visible immediately, and says nothing afterwards.** The source tree refolds on the drop rather than on the next click, so a block that moved looks moved. **And the strip stops announcing a plain move** (Clay's call — a fluid gesture needs no receipt), while still saying when a relationship was **left behind**, since that is the part the gesture cannot show **Landed (not driven)**: A `refoldAt` counter in the `graphs` memo makes a cross-project drop redraw the source tree instantly; a plain move no longer announces itself, while *N relationships left behind* still does, and a stale notice is cleared rather than left standing. | `page/Files.tsx`, `page/App.tsx` | P.1 |


## Wave U — what is left of it

**Wave U landed and is in [landed.md](landed.md).** One row survives it: the two `◐` gaps U.7 and
U.14 left, both parked on the same words — *App not owned*. **U's *chrome, not the diagram's visual
language* boundary held through V and is reversed by `Y.5`** — a theme now supplies the diagram's
defaults, while a definition's `style` still wins.

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*


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

## Wave 3 — the rail

**Z.1–Z.8 are built and archived in [landed.md](landed.md)** — but they were built against a spec
that changed while they were being built, so one row is left: `Z.9` trims the wave to the ranking
surface and a fixed expanded pane. **The tutorial (Z.5) is wanted and deliberately last**, behind
Wave V, because a tutorial teaches whatever the app currently is. See tasks.md, stream Z.

**The rail is not a command palette.** It is the app's single text entry point over the workspace,
ranking and completing what the context offers and surfacing the documentation that bears on it,
adapting to how one person words things. **It never changes context**: it ranks *against* context,
so the explorer and the pointer still navigate. **As scoped it is wholly client-side.**

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*


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

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
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

**`ST.11` — the action surface shrinks.** *Future story, Clay 2026-08-20. Sized, not scheduled.*

**Measured, not guessed.** `src/actions/` is **2,873 lines**, `src/terminal/` is **741**, and the
action set is **33 actions** across seven registrations.

*Every row here is in [landed.md](landed.md) under *Archived 2026-08-20*.*
| `Effect.into`, `writeInto`, the `home` batches, `onAdmit` routing, `P.11`'s test | spread over 9 files | **`B.8`** — one log, so nothing routes and no action can pick the wrong one |
| the `relax` action, `relax_layer`, `set_axis`, the `Axis` type | across `actions/layer.ts`, `fold.ts`, `check.ts`, `types.ts` | **`B.11`** — one arrangement absorbs both |
| ~~`rank.ts` + `feedback.ts`~~ — **stays** | **0** | **Corrected 2026-08-20 (Clay).** `I.2`'s verb lists are **examples, not an enumeration**: somebody will type a word nobody listed, and substring matching cannot answer that. Meaning-matching (the embedding lead) and learned preference (the overrule store) are both what an *intelligent* terminal needs. `I.8` re-aims them at the four commands and **keeps the machinery** |
| `typelist.ts` (78) and `TYPE_CAP` | 78 | **`C-a`** — *show all, ordered by similarity* removes the cap, the *More…* expansion and the overrule counting behind them |
| `terminal/Chat.tsx` (302), `workflows.ts` (156), `tutorial.ts` (105) | 563 | **`I.1`–`I.7`** rewrite what the terminal is. `Z.9` already stood down the question loop; this finishes it |
| the explorer's second create button | — | `N.5` — see `N.7` |

**The rule for the story, so it does not become a demolition derby**: *nothing is deleted for being
old; a thing is deleted when the row that removed its last consumer lands.* Each entry above names
that row. **Do not delete `rank.ts` before `C-a` is answered** — if similarity sits *in front of*
learned preference rather than replacing it, the store stays and only the cap goes.

**`ST.10` — a context menu offers what makes sense here.** *Future story, Clay 2026-08-20. The
cause is found; the design is not started, and it should not be started inside `N.6`.*

**The cause, checked rather than guessed.** [`inScope`](../src/actions/index.ts) opens with:

```ts
if (where.includes("layer") || where.includes("project")) return true;
```

**Any action scoped to the layer or the project is offered unconditionally**, whatever is selected —
so right-clicking a block offers `create`, `relax`, `arrange` and the navigation actions `up` and
`reveal`, none of which mean anything *to a block*. The line is not a bug: it correctly answers
*can this run here*. It is being asked the wrong question.

**Two questions, two owners, and today one filter answers both:**

| Question | Owner | Exists |
|---|---|---|
| **can this run here** | `inScope` + the action's own `check` | yes, and it is right |
| **is this worth offering on *this* element** | the **block module** | **no** |

**The block module is the right owner** — under the simplified block model a module already declares
what its block *is* to the engine and its configuration surface, and *what is worth doing to one* is
the same kind of knowledge. An action cannot answer it: `create` does not know about every block
type, and never should.

**`when` stays, and is not the answer.** It is the action's own veto (*absent is always*), which is
the right shape for *this action never makes sense with nothing selected*. It is the wrong shape for
*a note's menu should be short* — that is the note's opinion, not the action's. **Two filters,
different owners, neither redundant.**

**Settled 2026-08-20 (Clay): explicit lists.** A module names the actions its blocks offer. The
fear was staleness, and it does not apply: **the action set is closed and has 33 members**, and the
block model **shrinks** it rather than growing it — `relax` and `axis` both come out at `B.11`, and
the pin follows `P.4`'s precedent of *one registered action offered twice* rather than adding a
34th. A list that never changes is not a maintenance burden; it is documentation.

**And the same measurement says the surface can shrink a long way** — see `ST.11` below.


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
