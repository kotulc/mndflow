# Behaviors

How a behavior comes to exist, what it infers, and what it writes back. **A.7a landed** (`infer` +
writing home); **A.7b–A.9 landed** (activity / state / sequence views — dimmed derived labels and
inferred order; state empty-infer offer + Reading A/B; sequence columns, directed then axis).

> **`axis` is absorbed into `arrangement` by stream `B`** (2026-08-19). One layer setting, seven
> values — `free`, `right`, `left`, `down`, `up`, `radial`, `relax` — of which the four directional
> ones carry the reading direction. **Tier 1 and 2 do not change**; tier 3 reads position along a
> **directional arrangement**. **`radial` and `relax` carry no direction, so tier 3 does not fire
> under them** and the chain falls through to tier 4 — deliberately, because `relax` positions are
> not stable and *the same selection must infer the same way every time*.

- **Why any of it** → [design.md](design.md) under *Structure and behavior*.
- **What the surface does** → [spec.md](spec.md); the action → [actions.md](actions.md).
- **The words** → [definitions.md](definitions.md). **The queue** → [plan.md](plan.md).

This file holds the detail so the others stay short. If a rule here contradicts design.md,
design.md wins and this file is wrong.


## The one rule

> **Guess freely in the behavior. Never guess into the structure.**

A wrong guess in a behavior project is cheap: re-inferring makes a new block, and editing one is
ordinary editing. A wrong guess written into a *structure* is expensive and invisible — it modifies
someone else's project, which is the truth.

So the inference is deliberately loose, and **only a fact the structure actually stated is written
home.** Every contentious ruling below resolves against this one line.


## `infer`

One action. A selection becomes **one behavior block**.

| | |
|---|---|
| **takes** | any cross-section — blocks, branches, whole projects, across as many projects as it reaches |
| **into** | a named behavior project, or a new one where none is given |
| **gives** | one behavior block, holding **refs** to the participants |

- **One-way and one-time.** Nothing re-syncs afterwards.
- **Deterministic.** The same selection infers the same way every time — so nothing may depend on
  click order, only on the selection itself.
- **Re-inferring makes a new block** and never edits an existing one. Hand-adjusted work cannot be
  clobbered; keeping, comparing or deleting the old one is the user's.
- **It composes.** A selection of actions infers a **state** block the way a selection of structure
  infers an **action**.

*Named `infer` rather than `project`: **projection** already means a layer rendered through a view
module, and overloading it would collide with `projection surface`.*


## What the selection becomes

**The tree comes through.** A container infers to an activity holding actions; a leaf infers to an
action. Count is not the discriminator — shape is.

| Selected | Result |
|---|---|
| one leaf block | one **action** (a childless behavior block) |
| one container | an **activity**, its children the actions inside |
| several blocks | an **activity** holding one action each |

A container behavior block is called an *activity* and a leaf one an *action*; that is the SysML
mapping and not a stored distinction — the engine already tells a container from a leaf.


## Order — four tiers

Read in order. The first that speaks, wins.

| | Source | Writes home |
|---|---|---|
| **1** | a directed relationship that `isa` **flow** | **yes** — implies interfaces |
| **2** | **any** directed relationship, direction as given | no |
| **3** | position along a **directional arrangement** — not under `radial` or `relax` | no |
| **4** | undirected connectivity — adjacency only, never direction | no |

**Tier 2 is deliberate.** A plain `line` and a plain directed edge are the default gestures; most
users will never name a relationship or reach for a `flow` subtype. Requiring tier 1 would mean the
chain almost never fires, and *an inference that is wrong but workable beats one that never runs.*

**A misread edge is contained by the one rule.** A `satisfy` edge read as sequence puts one wrong
arrow in a behavior diagram — cheap to flip or delete — and writes **nothing** into the requirements
project, because only tier 1 writes.

**Across layers, order is a stable guess.** Positions in two projects are not comparable, so actions
from different layers are ordered by **project id, then tree position**: arbitrary, deterministic,
workable. Click order is not usable — it is not a property of the selection.

**Inferred order is drawn dimmed.** An inferred order the user cannot tell from a stated one is the
mistake stream Z already flags about adaptive ranking — the default is invisible and changes under
you. Same device as the derived subtype chip; no new concept.


## Lanes, groups and abstraction

**A lane is a ref.** The action came *from* a block and the behavior block already holds a ref to it,
so the performer is known by construction. Lanes fire every time, need no vocabulary and need no
field.

*Not from a `performs` relationship.* That was carried over from an earlier walk and is wrong for
inference: it is one specific definition among an unbounded set, so it would essentially never
exist. It survives only for **hand-drawn** actions, which is exactly where somebody would say who
does it.

*Not from connectivity, either.* Connected components have no reliable granularity — one hub with ten
spokes puts all eleven in one lane, which is as useless as one lane per action.

**A group stays a group.** A structure group infers to an ordinary `group` in the behavior, not to a
lane. Two different devices, no precedence rule, and `group` is already a form.

**The cap, and abstraction.** Beyond **N** actions the inference cuts higher in the tree: a container
becomes one action and its children fold in as detail, reachable by descending, since layers already
nest. Deterministic — *the shallowest level whose count is ≤ N*.

- **N is `view` component configuration**, not an engine constant, so a module chooses. **Default 5.**
- Connected components do the same job where the selection is flat and ungrouped.


## Naming

**A structure block is a noun and an action wants a verb**, and no reliable transformation turns an
arbitrary noun into one — *Heat Exchanger* has no verb form worth having. So nothing is transformed
and nothing is stored.

**An action's label is derived and dimmed**, exactly as an unnamed element falls back to `block 1`
and a plain card's chip falls back to the module's word:

```
<module's verb> <participant name>          e.g.   do Pump
```

- The **verb** comes from the module's vocabulary (`packages/behavior` ships it — A.10; the activity
  view reads it for derived labels, A.7b), so a SysML reading and a plain reading can differ without
  either being stored.
- The **name** is read through the ref, so renaming the block flows through.
- Where a **tier 1** relationship carries a name, that name is used instead — still derived, still
  dimmed.
- **Typing over it stores a real name** and the dimming goes. That is the only way an action gets one.


## Writing home

A behavior modifies the structure blocks it acts on, through the ref, in their own project. This is
the ownership rule and not an exception to it.

> **Only a fact that still stands once the behavior is deleted may be written.**

| | Lives on | Survives deletion |
|---|---|---|
| an **interface** an interaction needs, a **relationship** it implies, a **definition** it fills in | the structure block | **yes** |
| the **interaction** — order, guard, message | the behavior block | no |
| **participation** — who takes part in what | derived | n/a |

- **Automatic**, because the structure is the truth and there is nowhere else for the fact to go.
  The strip says so the first time and not after.
- **Only tier 1 writes.** Everything inferred from position, connectivity or stable ordering writes
  nothing, which is what makes loose guessing safe.
- **Participation is never stored.** Which behaviors a block takes part in is asked of the behavior
  projects in scope. A back-reference would duplicate a fact living in another log and leave a
  structure project opened alone pointing at behaviors that are not there.


## Activity → state

Two readings, chosen **once per inference**, never per action — mixing them produces a machine with
holes, where a transition-producing action and a state-producing action have no transition between
them.

| | Reading | When |
|---|---|---|
| **A** | each action becomes a **state**, each order a transition | **no action in the selection has an outcome** — the common case |
| **B** | each action becomes a **transition**; states are the conditions between | **any** action has an outcome; a missing one yields a placeholder state, *after X* |

**Nothing is pinned on a rare field.** `outcome` is an ordinary field nobody has to discover; A fires
when it is absent, which will usually be always. B switches on by itself when somebody fills one in.

**Under B, an outcome becomes a ref.** The value naming a resulting state is rewritten into a ref to
the state block the inference made, so the name lives in one place and the two notations cannot
disagree.


## Two worked examples

Kept because they are the record of *why* the rules are what they are.

### 1 — a container, three children, one flow chain

```
Coolant Loop  (container)
└─ Pump ──[control flow]──▶ Heat Exchanger ──[control flow]──▶ Reservoir
```

Select `Coolant Loop`.

| | |
|---|---|
| shape | one container → an **activity** with three actions |
| order | **tier 1** — a clean chain |
| labels | flows unnamed → `do Pump`, `do Heat Exchanger`, `do Reservoir`, dimmed |
| lanes | three, one per ref |
| cap | 3 ≤ 5, so no aggregation |
| control nodes | none — no branching, no guards |
| **writes home** | **4 interfaces** — out on Pump, in + out on Heat Exchanger, in on Reservoir |

**What it teaches.** The chain is correct and carries almost no new information — same three things,
same two arrows. **The interfaces are the whole value.** And it shows the ceiling: name those flows
*circulate* / *cool* / *store* and the activity reads as a process, so **the value of an inference
scales with how much the structure already says**, not with how many blocks it has.

### 2 — cross-project, position only, one group

```
Vehicle:  Cabin (group) { Driver@0, Display@200 }   arrangement: right
Cloud:    Telemetry@400
No relationships anywhere.
```

Select Driver, Display, Telemetry.

| | |
|---|---|
| shape | three leaves → an **activity** with three actions |
| order | **tier 3** within Vehicle; **stable guess** across to Cloud; all **dimmed** |
| lanes | three, from the refs |
| group | `Cabin` infers to an ordinary group |
| **writes home** | **nothing** — no tier 1 relationship stated anything |

**What it teaches.** This is the common case — nobody named anything — and it still produces a
workable three-step scaffold with lanes and a group. The empty write-home is correct, not a failure:
the structure said nothing, so it learned nothing.


## Still open

| | |
|---|---|
| **The thin result is the common case** | Most structures have unnamed or absent relationships, so an activity of dimmed actions with lanes and refs is what people usually get. It has to read as a starting point rather than as a failure — undesigned |
| **A nudge toward naming** | Naming relationships is the highest-leverage thing a user can do and nothing says so. Worth a strip line when every edge in a selection is unnamed. Not designed |
| **`N`'s default** | 5, chosen not measured — now on `view` (A.7c). Create / `infer` not wired to `creates` / `word` yet |
| **App refresh after foreign write** | `Effect.into` lands the step (S4.9); UI may not refresh |
| **The activity-final double ring** | The one SysML ornament that is not shape + size; wants a `style` that strokes twice — parked from A.7b |
| **RF framed host / activity gestures** | Activity mounts; RF framed host and gestures on the activity plane still open — parked from A.7b |
| **Swimlanes-from-`performs` docs drift** | design is lanes from the ref; wipe any leftover `performs` wording when next touching activity chrome — parked from A.7b |
