# Behaviors

**How a behavior comes to exist, what it infers, and what it writes back.** The detail, so the other
documents stay short.

- **Why any of it** → design.md, *Structure and behavior*.
- **What each part does** → spec.md. **The surface** → actions.md.
  **The data contract** → schema.md.
- **The words** → definitions.md.

**If a rule here contradicts design.md, design.md wins and this file is wrong.**


## The one rule

> **Guess freely in the behavior. Never guess into the structure.**

A wrong guess in a behavior is cheap: re-inferring makes a new block, and editing one is ordinary
editing. A wrong guess written into a **structure** is expensive and invisible — it modifies the
truth, which somebody else may own.

So the inference is deliberately loose, and **only a fact the structure actually stated is written
home.** Every contentious ruling below resolves against this one line.


## The behavior module

**A behavior block names the `behavior` block module.** It earns one because everything below is
derivation that is only meaningful *inside a behavior layer* — there is nothing here a definition
could carry, and nothing the engine could work out from a block that is not one.

### What the module owns

| | Does |
|---|---|
| **order** | reads the four tiers over the layer and yields a sequence |
| **lanes** | one per referenced participant, derived from the references the layer already holds |
| **controls** | counts relationships and guards, and draws forks, decisions, merges and joins |
| **labels** | the derived `<verb> <participant>` fallback, dimmed |
| **writes** | the gate: **only tier 1 writes home**, and only what survives the behavior's deletion |

**Containment is not the module's — it is the engine's.** *A tree holds its own tier as parts; a lower tier appears only by reference* is a law above every module, so **only behavior blocks are in the behavior tree** needs nothing here to enforce it. A structure block dropped into a behavior layer is coerced to an action holding a reference rather than refused, which is the same thing this module already assumes about every participant it reads.

**The write gate is the module's**, and it is the one thing here that could not be data: it is what makes loose guessing safe, and a rule somebody could edit would give the guarantee away.

**Everything else is package data.** `action` and `state` are definitions extending the base
`behavior` definition; the verb is vocabulary; whether bars and diamonds are drawn at all is the
package's call, because that is presentation and presentation is where a package's authority already
ends.

### What a behavior block is

**A behavior is an overlay; the structure is the truth.** It holds **references** to the
participants — never parts — which is precisely why its tree stays its own and a structure block
never appears in it. A participant appearing inside a behavior layer is an *appearance*, not
composition.

**A container behavior block is an activity and a leaf one is an action.** That is the SysML mapping,
not a stored distinction — the engine already tells a container from a leaf.


## `infer`

One action. A selection becomes **one behavior block**.

| | |
|---|---|
| **takes** | any cross-section — blocks, branches, whole projects, across as much of the workspace as it reaches |
| **gives** | **one new top-level behavior block**, holding references to the participants |

- **Always a new top-level block.** Nothing appends to an existing behavior, so an inference can
  never disturb one somebody has already worked on. Filing it afterwards is ordinary reorganising.
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

**The tree comes through. Count is not the discriminator — shape is.**

| Selected | Result |
|---|---|
| one leaf block | one **action** — a childless behavior block |
| one container | an **activity**, its children the actions inside |
| several blocks | an **activity** holding one action each |


## Order — four tiers

**Read in order. The first that speaks, wins.**

| | Source | Writes home |
|---|---|---|
| **1** | a directed relationship that `isa` **flow** | **yes** — it implies interfaces |
| **2** | **any** directed relationship, direction as given | no |
| **3** | position along a **directional arrangement** | no |
| **4** | undirected connectivity — adjacency only, never direction | no |

**Tier 2 is deliberate.** A plain line and a plain directed relationship are the default gestures;
most people will never name a relationship or reach for a `flow` subtype. Requiring tier 1 would mean
the chain almost never fires, and *an inference that is wrong but workable beats one that never
runs*.

**Tier 3 does not always fire.** The arrangement carries the reading direction, and `free` and `grid`
carry none — under either, the chain falls through to tier 4.

**A misread relationship is contained by the one rule.** A `satisfy` edge read as sequence puts one
wrong arrow in a behavior diagram — cheap to flip or delete — and writes **nothing** into the
requirements it came from, because only tier 1 writes.

**Across layers, order is a stable guess.** Positions in two different layers are not comparable, so
actions drawn from different layers are ordered by **tree path** — arbitrary, deterministic, and
workable. Click order is not usable: it is not a property of the selection.

**Inferred order is drawn dimmed.** An inferred order somebody cannot tell from a stated one is the
mistake worth avoiding — a default that is invisible and changes under you. Same device as the
derived subtype chip; no new concept.


## Lanes, groups and abstraction

**A lane is a reference.** The action came *from* a block and the behavior block already holds a
reference to it, so the performer is known by construction. Lanes fire every time, need no vocabulary
and need no field.

*Not from a `performs` relationship.* That is one specific definition among an unbounded set, so it
would essentially never exist. It survives only for **hand-drawn** actions, which is exactly where
somebody would say who does it.

*Not from connectivity either.* Connected components have no reliable granularity — one hub with ten
spokes puts all eleven in one lane, which is as useless as one lane per action.

**A group stays a group.** A structure group infers to an ordinary group in the behavior, not to a
lane. Two different devices, no precedence rule, and a group is an ordinary definition, so it costs
nothing to carry across.

**The cap, and abstraction.** Beyond **N** actions the inference cuts higher in the tree: a container
becomes one action and its children fold in as detail, reachable by descending, since layers already
nest. Deterministic — *the shallowest level whose count is ≤ N*. **N is a view definition option**,
not an engine constant, so a reading chooses. Default **5**.


## Naming

**A structure block is a noun and an action wants a verb**, and no reliable transformation turns an
arbitrary noun into one — *Heat Exchanger* has no verb form worth having. So nothing is transformed
and nothing is stored.

**An action's label is derived and dimmed**, exactly as an unnamed block falls back to `block 1`:

```
<the reading's verb> <participant name>          e.g.   do Pump
```

- The **verb** comes from the vocabulary in scope, so a SysML reading and a plain reading can differ
  without either being stored.
- The **name** is read through the reference, so renaming the block flows through.
- Where a **tier 1** relationship carries a name, that name is used instead — still derived, still
  dimmed.
- **Typing over it stores a real name** and the dimming goes. That is the only way an action gets
  one.


## Writing home

A behavior modifies the structure blocks it acts on, through the reference. **This is the ownership
rule, not an exception to it** — the change is written where the block lives, which with one log is
simply where it is written.

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
- **Participation is never stored.** Which behaviors a block takes part in is asked of the graph. A
  stored back-reference would duplicate a fact that already exists and leave an exported structure
  pointing at behaviors that did not travel with it.


## The three readings

**One behavior layer, read three ways.** They are not three models and not three modules: `block` is
**any planar projection**, and a view definition names the reading.

```
view def "activity"  { module: block, reading: activity }
view def "sequence"  { module: block, reading: sequence }
view def "state"     { module: block, reading: state }
```

**What differs is what a block means and what a lane becomes.**

| Reading | A block is | A lane is | Order runs | Controls |
|---|---|---|---|---|
| **activity** | an action | a band across the flow | along the reading direction | drawn |
| **sequence** | an occurrence on a lifeline | a **column** | down | not drawn |
| **state** | a state | nothing — a machine is about one thing | along transitions | drawn |

- **The lane is the same derivation in all three** — one per referenced participant. Only its shape
  changes, which is why one module carries all three.
- **A sequence orders explicitly first.** Directed relationships give the order; position along the
  arrangement is the fallback, exactly as tier 3 says.
- **A state reading draws no lanes**, because a machine describes one thing changing rather than
  several things taking part.

### Activity → state

Two readings of a behavior, chosen **once per inference**, never per action — mixing them produces a
machine with holes, where a transition-producing action and a state-producing action have no
transition between them.

| | Reading | When |
|---|---|---|
| **A** | each action becomes a **state**, each order a transition | **no action in the selection has an outcome** — the common case |
| **B** | each action becomes a **transition**; states are the conditions between | **any** action has an outcome. A missing one yields a placeholder state, *after X* |

**Nothing is pinned on a rare field.** `outcome` is an ordinary field nobody has to discover; A fires
when it is absent, which will usually be always. B switches on by itself when somebody fills one in.

**Under B, an outcome becomes a reference.** The value naming a resulting state is rewritten into a
reference to the state block the inference made, so the name lives in one place and the two notations
cannot disagree.

**A state is stored, not derived.** Control nodes are a rendering of a count and nobody touches them;
a state is something people name, nest and hang behaviour on. That is the line *derived beats stored*
draws, and states were always the awkward case because they were the one derived thing people were
expected to edit.


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
| lanes | three, one per reference |
| cap | 3 ≤ 5, so no aggregation |
| controls | none — no branching, no guards |
| **writes home** | **four interfaces** — out on Pump, in and out on Heat Exchanger, in on Reservoir |

**What it teaches.** The chain is correct and carries almost no new information — same three things,
same two arrows. **The interfaces are the whole value.** And it shows the ceiling: name those flows
*circulate* / *cool* / *store* and the activity reads as a process, so **the value of an inference
scales with how much the structure already says**, not with how many blocks it has.

### 2 — across layers, position only, one group

```
Vehicle:  Cabin (group) { Driver@0, Display@200 }   arrangement: right
Cloud:    Telemetry@400
No relationships anywhere.
```

Select Driver, Display, Telemetry.

| | |
|---|---|
| shape | three leaves → an **activity** with three actions |
| order | **tier 3** within Vehicle; **tree path** across to Cloud; all **dimmed** |
| lanes | three, from the references |
| group | `Cabin` infers to an ordinary group |
| **writes home** | **nothing** — no tier 1 relationship stated anything |

**What it teaches.** This is the common case — nobody named anything — and it still produces a
workable three-step scaffold with lanes and a group. **The empty write-home is correct, not a
failure**: the structure said nothing, so it learned nothing.


## Still open

| Issue | Description |
|---|---|
| **The thin result is the common case** | Most structures have unnamed or absent relationships, so an activity of dimmed actions with lanes and references is what people usually get. **It has to read as a starting point rather than as a failure** — undesigned |
| **A nudge toward naming** | Naming relationships is the highest-leverage thing somebody can do, and nothing says so. Worth a line in the strip when every relationship in a selection is unnamed. Not designed |
| **`N`'s default** | 5, chosen and not measured |
| **What a sequence does with participants drawn from far apart** | Lanes are one per reference, but a column per participant across four unrelated subtrees may be unreadable. Whether the cap applies to columns as it does to actions is undecided |
| **Whether a sequence accepts an adjustment** | The only thing worth dragging on a lifeline is where an occurrence sits on it, which is `seat`. Every other position is the reading's |
| **The activity-final double ring** | The one SysML ornament that is not shape plus size; it wants a style that strokes twice |


## [Working] Structure and Behavior

**Behavior is an overlay on a structure, not a second model of it.** A structure sub-tree is the truth behaviors get built on. A behavior scopes to one or more structures and describes what happens *over* them, bound to the structural blocks they act on.

**A behavior tree holds references — never the structure it acts on**, which is precisely why its tree stays its own and a structure block never appears in it. A participant structure `block` appears inside a behavior *layer* as a reference, which is an appearance and not composition, so the two trees never interleave.

**Order is read from the model, and only guessed at as a fallback.** A directed relationship between two blocks *is* the sequence, and it wins. Where none exists, position along the layer's arrangement says the same thing.

**A behavior may be inferred from a selection, once, and then it is the user's.** It is one-way and deterministic, nothing re-syncs, and **re-inferring makes a new behavior block rather than editing one** — so hand-adjusted work can never be clobbered by running it again. Opening with the structure's containment is the guess and not a rule it keeps.

**Guess freely in the behavior; never guess into the structure.** This is the line the whole design rests on. A wrong guess in a behavior costs an edit, so the inference can afford to be loose and should be — *an inference that is wrong but workable beats one that never runs*. A wrong guess written into a **structure** is another matter: it modifies the truth invisibly.

> **A write to a structure block must be a fact about the structure that still stands once the
> behavior is deleted.** If deleting the behavior would leave it stale, it should have been derived.

| Block property | Lives on | Survives deleting the behavior |
|---|---|---|
| an **interface** the interaction needs, a **relationship** it implies, a **definition** it fills in | the structure block | **yes** — true of the structure on its own |
| the **interaction**: order, guard, message | the behavior block | no |
| **participation** — who takes part in what | the behavior block | no |

**So only what the structure stated is inferred**, and everything guessed from position or adjacency writes nothing. That is what makes loose inference safe rather than reckless.

**Participation is derived, never stored.** A stored back-reference would duplicate a fact the graph already holds, and leave a structure tree exported on its own carrying references to behaviors that did not travel with it.

**Inference composes, and that is the whole chain.** A selection of actions gives a **state** block exactly as a selection of structure gives an **activity** — structure, then activity, then state, each harder to write from nothing than the one before. There is no separate promotion step and no machine that exists before somebody asks for one.

**Activity, sequence and state are three readings of one behavior layer**, not three models and not three modules. `block` is any planar projection and a view definition names the reading, so what differs is what a block means and what a lane becomes — never the facts underneath.