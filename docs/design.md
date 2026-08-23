# Design

**Why mndflow is the way it is** — the vision, the goals, and the reasoning behind the rules that
shape everything else. Not what each part does, and not what each word means.

mndflow is for rapidly building and composing descriptive visual blocks into systems models. It is
a client-only app. Visual scope is constantly constrained, so a reader is never shown more than one
layer's worth of anything.

**It stays general on purpose.** Hard rules are only the few that prevent an incoherent project — a
block cannot contain itself. Nothing is forbidden for being unusual, and where a choice could be
enforced or left to the user, it is left to the user.


## The aim

**Rapid, general concept modelling.** Speed, simplicity and generality come first, and a special
case never overrides them.

**Nobody should have to learn a notation to use one.** A person describing a system says what the
parts are, what they are made of, what flows between them and what has to be true — and that is
already the whole base model. The specialised vocabulary and symbols of a standard are a layer
somebody chooses to put on top, not a toll on the way in: the same graph reads as plain blocks and
flows to one person and as a parametric diagram to another, because what changed is the names and
the drawing, never the structure. **A notation that cannot be reached this way is a notation this
tool does not do**, which is a better answer than bending the base model until it can.

**The cheapest possible modelling gesture carries meaning.** Somebody who laid ten blocks in a row
has already said what happens in what order, without drawing a single arrow. That is what *rapid*
has to mean if it means anything.


## Five ideas

These carry most of the weight, and most of the rules below are one of them applied.

- **Derived beats stored.** Anything that can be worked out from the layer is worked out — seats,
  routes, boundaries, roles, control nodes, messages. Only choices are written down.
- **The model grows itself as it is described.** Describing behaviour over a structure is how that
  structure learns what it needs: the states a thing can be in, the interfaces it has to offer, the
  actions it performs. Somebody draws what happens and the definitions fill in behind them, so the
  work of modelling is spent saying things once rather than restating them in a second notation.
- **The log is the truth.** The graph is folded from it, so undo needs no inverses.


## The one shape

### Everything is a block

**There are no element forms.** A note, a group, a folder and a reference were being placed,
dragged, named and laid out alike, so they are one record with different definitions rather than
four sorts of record. A new sort of thing is **a definition, and a definition is data** — which a
closed set of engine-side sorts can never allow.

**A form was only ever earned when the engine must know something about placement or behaviour and
cannot tell from a field.** Applied honestly, nothing passed: a note holds content and no children,
a group holds references and draws a boundary, a reference stands for something else. Each is a
property or a definition, and the one left over was not a set at all.

**The engine still needs a floor**, and it gets one as **a shipped, locked package of definitions
the engine knows by id** — `structure`, `view`, `resource`, and `folder` / `group` / `note`
extending them. It is **open**: shipping one more is an additive code change, not a closed set being
widened.

> **The engine may key off a base definition only for how a block draws and where it sits.** Never
> for what it is, and never for what may contain what — containment is a `holds` rule, which is
> data.

Without that line the base package is element forms wearing a different hat, and it grows back into
one within a wave. **The single exception is deliberate and named**: a `view` holds references only,
and the engine enforces it. A view whose members could be owned is a folder, and then the two words
mean one thing again.

### Two child links, and ownership is what separates them

A block **owns** a child (a **part**) or **stands for** one living elsewhere (a **reference**). Not
distance — ownership. This is the one distinction every notation draws, and it is what makes a
folder and a view different without either declaring anything: **a folder's children are parts, a
view's children are references.**

**One word for one thing appearing somewhere it does not live.** A cross-layer stand-in, a set
membership token, a workspace filing entry, a behavior participant and a view member are the same
statement, so they get one word: **reference**. The relationship form that went with it was only
ever derived from *a stand-in sits at one end*, so it is an ordinary relationship that happens to
reach a reference. Drawing it dashed is presentation.

**A reference is drawn; a link is not.** That sentence is the whole test between a reference block
and a `link` field.

### A view is a perspective, a folder is a container

**Containment and ownership are different questions, and conflating them is what makes two words for
one thing.** A folder is a filing structure: it says where something sits, and deleting it must
never delete what it held. A project is an ownership boundary: its blocks are parts, and deleting
the project deletes them.

**And it is derived, so nothing new is stored.** Filing a block makes it a root; a root owns its own
graph; so *contained* means *the child is a graph root* and *owned* means everything else. This is
the rule that *a block at the top level is a project*, applied one level down — dragging a loose
block into a folder promotes it, dragging it into a project files it. Chosen over a third stored
link, which would make every containment rule ask three questions where two will do.

### Behavior is not a classifier

Checked against what a behavior model actually needs: ordering is a directed relationship or the
arrangement, participants are references, lanes are *group children by what they reference*, and
actions and states are definitions in a shipped package. Not one of them is behavioral machinery.
**A behavior model is one package plus three view modules.**

**And that closes a one-way door for free.** Which modules a layer may show comes from its
definition's `view` component rather than from a derived kind — so a project can never be trapped in
the sort of thing it started as.

### The three tiers

**The model has a top, and it is not another project.**

| | Contains | Owns | Holds |
|---|---|---|---|
| **workspace** | projects, packages, folders | nothing | **the log**, the metadata, the display state |
| **folder** | anything — independent roots | nothing | nothing of its own |
| **project** | — | a graph of blocks | its own vocabulary and settings |

**The workspace is itself a block and needs no new schema to be one**: its children are project
roots and folders, contained rather than owned, and it draws as a block diagram whose dependencies
are derived from who references whom.

**Nothing declares what a project is.** One holding only references is a view, one you are using
rather than writing is a package, one holding its own objects is a structure. It is visible from
what it has and from what you are doing with it, so there is no field to keep true — and a project
is free to become something else by being worked on.

**A project comes into being by being named**, and naming it is the first step there is. The app
opens with *no* project rather than with one nobody asked for, and names are unique among siblings —
the rule a layer already has, applied one level up.

### Two things, and no more

A **block** is placed and drawn; a **relationship** joins two of them. Everything else describes one
of the two.

- **Anything joining two blocks is a relationship.** One may draw as something other than a routed
  line — a leader to a note takes no seats — but drawing is not identity. The alternative was a
  second way to join things, with its own mutations, its own cascade and its own list.
- **The test**: drawn as a line between two things → a relationship; not a line → a field.
- **Containment is the exception, and stays `parent`.** The tree is the one join every block has
  exactly one of, so storing it as edges would mean guarding an invariant a field enforces for free.
- **`derived` on a relationship is a flag, not a module.** `line` and `directed` say how it draws
  and whether it carries direction; *derived* says nobody drew it and the engine computed it — a
  different axis, and one any relationship could sit on. Not in the log, recomputed on fold, not
  deletable.
- **An interface is declared, not derived.** It is a block module, made deliberately, and `side` is
  only where it sits. A declared interface is what can carry an anchor-slot surface — which is what
  lets a lifeline occurrence and a proxy port be the same object.


## The engine and what configures it

**Four tiers, and the boundary between the middle two is the one that matters: what the engine must
know goes in data; what only a person needs to see is shipped beside it.**

| | Holds | Changed by |
|---|---|---|
| **engine** | the tree, containment, membership, placement, routing, seats, the grid, the log and the fold, ids and references, the action surface | nobody. This is the closed part |
| **definition** | name, other vocabularies' names, a body, fields, the room a usage needs, and the configuration of every open component | data, shipped in a package |
| **module** | renderers, layout laws, gesture maps, validation hooks, projection surfaces | code, at build time |
| **never** | a new mutation op, a new adjustment, a new sort of block the engine must reason about | — |

**Two sets, and telling them apart is the whole discipline.**

| Closed — never add one | Open — extend by a code change, additively |
|---|---|
| relation modules, value forms | base definitions, block modules |
| the mutation ops, the action set, the four adjustments | card layouts, style sets, arrangements |
| the six view modules | components, rule kinds, routing strategies |

**There is no closed set of element sorts.** That is the point: a new sort of thing is a definition,
and a definition is data. If *extensible* leaks into the closed column the engine stops being
general and becomes a plugin host.

**The engine never branches on user data.** It reads the closed forms and the derived facts and
nothing else. Configuration changes what a thing looks like and what is valid on it; it never
changes how the engine places it.

**Per-subtype is configuration; per-instance is content.** A definition configures components for
every usage of it, and no block carries configuration of its own. Where two usages must differ, they
differ in what they **hold** and in their **fields**, both of which are ordinary content. That is
what keeps presentation from scattering across a project one block at a time.

**A component owns its configuration key and reads no other's.** They share one block and one log,
so separate code is not separate state, and this is the only thing that makes the isolation real
rather than nominal.

**Components ship as presets.** They configure independently, which multiplies quickly, and most
combinations are untested; a view names a coherent set rather than inviting recombination.

### Packages and modules

**A package is data; a module is code.** A package ships definitions and costs nothing to add. A
module is engine code, and an open one publishes the components a definition configures. It costs an
owner.

**A package maps names and presentation, never structure.** The moment a mapping has to rearrange a
graph to export it, it has become a program, and a program living in data is a second engine nobody
agreed to build. Most of SysML turns out to be the first kind: requirements is a definition
declaring two fields plus five relationship types, and asks for no renderer, no layout law and no
gesture.

**But enabling a package is sometimes an engine change.** A sequence projection needs a column per
participant; an activity needs a shape drawn inside a card. Each is *one engine capability plus a
package*, and the two ship together. Saying so plainly is what stops "just write a package" being
promised and not delivered — a package can only ask for what some component already knows how to do.

**Extension is subtyping, and never overriding.** A package's own definitions are never altered: one
somebody can silently change in their own workspace has stopped being a standard. Refining a
requirement means making a safety requirement that *is* one.

**A definition names one parent, and the chain is real.** Fields union with the subtype's winning by
name; components merge per key. One parent, so no diamonds and no merge order to argue about. **A
rule naming a definition means it or anything below it** — without that, an imported standard's
rules would reach only its own definitions and nothing anybody actually models.

**Shadowing is impossible; ambiguity is not.** Every reference is a path, so two packages naming a
thing alike are two different definitions, and importing one can never change what an existing block
means. What two packages *can* do is offer two candidates called "requirement", and the answer is
presentation — both shown with the package they came from — not resolution.

**Assets are build-time.** Somebody extending them edits the repo and rebuilds. A runtime plugin
loader means sandboxing untrusted code inside a page holding the user's whole workspace, which is a
different decision and not one to smuggle in. It follows that **a package must be useful with
portable presentation alone** — it brings its data and renders on the simple typed fields, gaining
its custom look only where the module and stylesheet it names are in the build. It degrades rather
than breaks.

**A subtype keeps the behaviour of the form it subtypes.** A decision is a block with a shape drawn
in it, a swimlane is a group with a segmented style, a lifeline is a column of actions — each
inherits placement wholesale and configures only what it looks like and what is valid on it. That is
what makes a package safe to install: it can change how a project reads and never how it behaves.

### Constraints and rules

Two things, told apart by what they are about: a **constraint** bounds a thing in itself, and a
**rule** governs how things interact. Both are declared on a definition and hold over every usage.

**One constraint and four rules**, each a lookup, a count or a single fixed comparison. There is
nothing to parse and no operators, and **what the five cannot say is a `validate` hook** — code a
module supplies, written by somebody who has already accepted writing code. There is no rule
language, deliberately.

**They advise while modelling and refuse only at translation.** A model is legitimately unfinished,
so a violation is a note in the tray; a translator asks the same checks at the moment it emits and
declines to write a non-compliant file.


## The decisions everything rests on

### The log is the truth

Only one thing is stored: an ordered list of **steps**. The **fold** replays the applied ones into a
**graph**, which is thrown away and rebuilt rather than edited, so it can never drift from the
record that produced it.

```
    log  ──fold──▶  graph  ──derive──▶  what you see
  (stored)         (current            (seats, routes,
                    state)              boundaries, layout)
```

- **Undo needs no inverses.** Flip the last applied step to `reverted` and fold again. Nothing has
  to know how to un-delete a group, so no mutation can get its inverse subtly wrong — which is the
  usual way undo rots.
- **There is one code path.** The graph that comes back from an undo was built by the same fold that
  built the original, so no state arrives by a second, rarely-exercised route.
- **Derived data cannot go stale**, because it is never kept.
- **The history is honest.** It is not a log written alongside the work; it *is* the work.

That gives a sharp test for whether something belongs to a project: **is it in the log?** A block's
name is, so it exports and it undoes. Whether interfaces are shown is not, so it does neither.

**The log reads as actions, not as mechanics.** A step per keystroke would be a faithful record and
a useless one. So a field commits once, and successive placements of the same block replace one
another; a run ends when a different action begins, which is what makes it safe.

**Compaction is the migration path, not merely a size limit.** Every schema change leaves a branch
in the fold that can never be deleted, because some log somewhere still contains that op. A
checkpoint is written in the *current* schema whatever the steps behind it were spelled in, so a
project sheds retired ops by being used. What is spent is reach: undo cannot pass a checkpoint.

**One log, at the workspace.** The workspace is one document with one history, so **nothing routes**
and no action can pick the wrong log. Undo is workspace-wide, which is the intent rather than a cost
— one timeline over the page and everything on it. A project export becomes a query over that log,
and a fold for one project replays everything, which is exactly what checkpoints are for.

### A file is the graph

**A file is the graph; the log is a working copy.** The two have different jobs. A file exists to be
read, compared and kept, so it should be the size of the model rather than the size of the effort,
and its diff should say which blocks changed rather than replaying the actions that changed them.

**Importing one is a checkpoint**, so this costs no new mechanism and there is no second format and
no second reader.

**The base of the envelope is whatever cannot be ignored; the rest is `meta`.** That one test is
what keeps an envelope from becoming a drawer. A reader that skips `schema` cannot know whether it
understands the file; one that skips `id` cannot resolve a reference.

- **A count of work is not a version.** It orders nothing between two copies that diverged.
- **The content hash is computed and never stored.** A derived value written down disagrees with what
  it describes the moment anybody hand-edits the file, at which point it lies rather than merely
  being stale — and git hashes the file already, better.
- **An id says what it points at and never what it is called.** A name inside an id goes stale on a
  rename, or forces the id to be rewritten everywhere.

**A project file is a single-owner asset**, like a `.psd`. Two people editing one produces a
whole-file conflict with no merge path. The answer to genuine multi-user editing is a live store,
not a merge algorithm — a different product decision, and not one this format should pretend to
solve. What is given up is that history no longer travels with the file, which is the right trade
twice over: git is a better history than a near-per-keystroke log, and undo is a thing you want
*while working*, which is where the log still is.

### Derived beats declared

The engine knowing something is different from somebody having to say it. **Container** is a way a
block looks, derived from what it holds. A relationship reaching a **reference** is derived from what
sits at its ends. **Seats**, **routes** and **lanes** are worked out from the layer every time it is
drawn. **Control nodes and messages** are counted from the relationships and their guards.

- **Naming any of them as a sort of thing would make an engine-level answer to something that
  changes the moment a child is added.** This is why forms went entirely.
- **A default is derived, never written.** A card falls back to its module's word where nothing has
  given it a type, exactly as an unnamed block falls back to `block 1`. Only a distinction somebody
  actually drew is written down.
- **Nothing about a line is stored, and there is no gesture for moving one.** Straightness is decided
  by the layer's arrangement, a convention is a rule stated once rather than dragged into every
  line, and clearing other lines is something no single edge can see — which is what lanes are for.
  What this buys is that a relationship the terminal added is drawn exactly as well as one somebody
  dragged.
- **Being cheap is a requirement.** A derived route runs on every render, so the router stays a
  router. **A router nobody can predict is worse than a plain one even where its output is better**,
  because the promise is that you never correct it — and you cannot trust what you cannot
  anticipate.

**Nothing is derived that somebody edits.** A thing is derived when it is a **rendering of a count**
and nobody touches it — a fork, a message, a lane. It is **stored** when somebody names it, nests it,
or hangs behaviour on it — a state.

### A hard constraint, and what is merely retained

Two different things, easily confused:

- **A hard constraint is honoured *by* an arrangement and survives it.** Only two things are one: a
  hand-made interface's side and place along it, and a wall a right drag named for a relationship's
  end.
- **Retained placement is what an arrangement replaces.** A card's position is this. It constrains
  nothing: an arrangement replaces where things draw, and returning to `free` hands it back.

So a card someone dragged is not a constraint. Only ports and walls are, because only they declare
something an arrangement has to respect while it runs.

**A wall is an intent, not a position.** Cards move, the frame resizes, and "this leaves by the
north wall" is still true and still drawable. It can become unhelpful; it never becomes incoherent.
A constraint fixes which side and where along it, never the distance — and two constraints can be
mutually unsatisfiable, in which case the sides are honoured and the route takes the consequence.

### Arrangement is how a graph reads, not how it is displayed

**Flow and arrangement are not display — they are how a graph reads.** So they sit on the **layer**,
with the model, and never in the workspace's display state. That line decides where every later
setting goes:

| | Where | Because |
|---|---|---|
| explorer fold, canvas toggles, which view module is showing | workspace metadata | they change nothing about what the model says |
| **arrangement**, reading direction included, and stored placement | the layer | **inference reads them**, and an inference is permanent |

**Why it is model data and not a preference — it is forced, not chosen.** Inference reads position
along the reading direction, and the same selection must infer the same way every time. If the
reading direction were display state, the same model would infer differently depending on how
somebody was looking at it, and the result would be a **permanent** block. That single test decides
this, and will decide the next setting somebody proposes.

**One setting absorbed three.** Axis, flow and arrangement were three fields answering overlapping
questions. They collapse into **one arrangement with six values** — `free`, `grid`, `right`, `left`,
`down`, `up` — of which four carry a reading direction and two do not.

**Two values were dropped after reading what they actually did.**

- **`relax` is not a layout.** It nulls placement, handing the layer back to automatic. Once
  arrangement is a *setting*, *hand it back to automatic* has nothing left to mean: picking a
  computed arrangement already does it, and picking `free` already gives the placement back. *The
  named loss: nothing clears hand placement any more* — accepted, because a door nobody can describe
  is worse than a door that is missing.
- **`radial`** is real but narrow: it reads for a hub and its attendants and looks wrong everywhere
  else. **A value that looks wrong more often than right is a value that makes the tool look
  complicated.** It can return as a view definition option if anybody wants it.

**The corollary:** `free` and `grid` carry no reading direction, so a layer using either has no
implied order and inference falls through to connectivity. One rule, and no tier that quietly
returns a different answer depending on how the layer was arranged.

### Inference makes blocks; composition arranges references

**Two different things are easily both called inference, and separating them is what makes view work
tractable.**

| | Makes | Runs | Is |
|---|---|---|---|
| **`infer`** | **new blocks** — the block → activity → state chain | once, when somebody asks | model, and permanent |
| **composition** | **nothing** — a grouping, spacing and ordering of references | every draw | presentation, and recomputed |

**Composition is what a view block needs.** A view holds references drawn from many layers, and
something has to decide how they group, space and order — a different answer per view module:

| View | Groups by | Orders by |
|---|---|---|
| **block** | source layer | the arrangement's direction |
| **table** | a chosen column | sort |
| **matrix** | axis membership — its two child views | within-axis order |
| **activity / state / sequence** | lane, from the reference | the four order tiers |

**And composition runs on one metric: proximity** — how far apart two referenced blocks are in the
tree. Same parent, same branch, same project, different project is a path distance, computable and
deterministic, and it answers all three questions at once, which is why three modules need one rule
rather than three: **group** by nearest common ancestor, **order** by tree path, **space** by
distance where the view has room. A proximity group is a *derived* group — the `group` definition
already draws a boundary round a set of references, and nothing needs storing for one to appear.

**The default has to be overridable, and that is the one thing this rule cannot decide.** A view
whose whole point is a cross-cut — every requirement across five projects — wants grouping by
*type*, and proximity would give it exactly the grouping it was built to escape. So proximity is the
**default**, and the alternative is a view definition option.

**No view module declares what a block becomes.** That idea came from conflating the two.


## Structure and behavior

**Behavior is an overlay on a structure, not a second model of it.** A structure project is the
truth. A behavior project scopes to one or more structures and describes what happens *over* them,
bound to the structural blocks they act on. Two projects, one truth, and the overlay never becomes a
second place a fact lives.

**A behavior project holds references — never parts — of the structure it acts on**, which is
precisely why its tree stays its own and a structure block never appears in it. A participant
appears inside a behavior *layer* as a reference, which is an appearance and not composition, so the
two trees never interleave.

**Order is read from the model, and only guessed at as a fallback.** A directed relationship between
two blocks *is* the sequence, and it wins. Where none exists, position along the layer's arrangement
says the same thing.

**A behavior is inferred from a selection, once, and then it is the user's.** It is one-way and
deterministic, nothing re-syncs, and **re-inferring makes a new block rather than editing one** — so
hand-adjusted work can never be clobbered by running it again. Opening with the structure's
containment is the guess and not a rule it keeps, because **a process worth modelling usually cuts
across containers** and a tree pinned to the structure's shape has nowhere to put one.

**Guess freely in the behavior; never guess into the structure.** This is the line the whole design
rests on. A wrong guess in a behavior costs an edit, so the inference can afford to be loose and
should be — *an inference that is wrong but workable beats one that never runs*. A wrong guess
written into a **structure** is another matter: it modifies the truth, in somebody else's project,
invisibly.

> **A write to a structure block must be a fact about the structure that still stands once the
> behavior is deleted.** If deleting the behavior would leave it stale, it should have been derived.

| | Lives on | Survives deleting the behavior |
|---|---|---|
| an **interface** the interaction needs, a **relationship** it implies, a **definition** it fills in | the structure block | **yes** — true of the structure on its own |
| the **interaction**: order, guard, message | the behavior block | no |
| **participation** — who takes part in what | derived | n/a; it stops being true |

**So only what the structure stated is written home**, and everything guessed from position or
adjacency writes nothing. That is what makes loose inference safe rather than reckless.

**Participation is derived, never stored.** A stored back-reference would duplicate a fact that
already lives in another log and leave a structure project opened alone carrying references to
behaviors that are not there.

**Inference composes, and that is the whole chain.** A selection of actions gives a **state** block
exactly as a selection of structure gives an **activity** — structure, then activity, then state,
each harder to write from nothing than the one before. There is no separate promotion step and no
machine that exists before somebody asks for one.

**Activity, sequence and state are three projections of one behavior layer**, not three models. Each
is its own **module**, because each projects differently enough to need code; what they are not is
separate copies of the facts.

**A control node is drawn, never stored.** Two outgoing orders with different guards is a decision,
two without is a fork, two arriving is a merge or join. Every one is a count. Whether the bars and
diamonds appear at all is the **package's** call — presentation, exactly where a package's authority
already ends.

**None of this needs a schema change**, which is the test that it belongs.


## The surface

### The action surface is the input seam

**Everything that changes a project is published as data** — a name, its arguments, and when it
applies — so that something never written against this app can still drive it. The surface is how
input methods talk to a project, not how modules plug into a page.

- **Two tiers, divided by whether a thing can be said.** An **action** names something somebody
  meant and is offered everywhere; an **adjustment** is positional and unsayable. Both write
  mutations and both undo; only actions are named, ranked and listed. **The ambition is that
  adjustments stay rare** — what the engine can decide, it should.
- **Arguments are typed, and eligibility falls out of them.** A position cannot come from a sentence,
  so nothing has to be marked as terminal-eligible and no second list can drift out of step.
- **Eligibility is not ranking.** Describing a block and renaming it take the same arguments; what
  separates them is that a sentence is prose and a short phrase is a name.
- **An action that writes no mutations is navigation.** One property carries all three consequences:
  no step, nothing to undo, and a text interface never offers it.
- **Scope is the same question a gesture asks** — under the pointer, selected in the tray, selected
  when somebody types are one question in three phrasings, so they are one field.
- **An action refuses in words**, which is what lets a ranked list put an inapplicable action last
  rather than hiding it.
- **A gesture layer names an action and never writes a mutation.** Interpreting input ends at naming
  what was meant. Held to naming, the layer stays a thing a view can swap — and the pointer is
  answerable to the same refusals as a typed sentence, since both arrive at the same record.

**A module adds no action for anything it draws.** Every notation walked against the model —
requirements, activity, parametrics, state machines, sequence — asks for **no form the engine does
not already have**. That is the strongest evidence the closed sets are the right size: a set drawn
too small would have shown up as a notation that could not be said without widening it.

### Accidents, not choices

**The left button handles what already exists; the right button makes something new.** A division by
what the gesture *does* rather than by what it is over, which is what makes it sayable in one line.
Within the right button, a click makes the thing that sits at a point and a drag makes the thing
that has extent.

- **No part of a card is a separate target.** Aiming at a ring a few pixels wide for the commoner of
  two actions is worth nothing. The layer's frame is the one exception, unavoidably: its interior
  *is* the background, so its border must stay a zone.
- **A move is never confirmed first.** Undo is the answer to a move that went wrong, and a dialog in
  the way of every reorganisation costs more than it saves.
- **Select-then-drag is for large targets, not small ones.** A boundary is a wide transparent area a
  drag could begin in by accident; an interface is thin and precisely reported, so it acts at once.
- **An interface is made, not stumbled into.** A drag that silently converted a block into one would
  make every ordinary move a hazard — but the fix is preventing the accident, not forbidding the
  operation.
- **A click in the explorer navigates; a click on the stage selects and never navigates.** So a
  glance never costs you your place, and descending is always a deliberate second gesture.

### One channel for everything the app says

**Every message goes to one strip**, carrying the text plus at most one thing to do about it. A
repaired log, a refused name, and the question before discarding a project all arrive the same way.

- **No `alert` and no `confirm`.** They are two more places to look, cannot be styled, cannot be
  tested, and stop the page dead. **A question is a message with one answer attached.**
- **A refusal is said twice, at two lengths.** The field marks itself and reads *taken*, because a
  narrow pane holds a word and not a sentence; the sentence goes to the strip, which has room.
- **One field for every name**, so a rule added to it reaches all of them at once.
- **A failed save is reported, never swallowed.** The session is unharmed until it closes, so the one
  thing that must not happen is the user not knowing.

### The shell yields; the stage does not

**Chrome gives way under pressure and the working area does not.** On a narrow window or at high
zoom the crumbs truncate, the option groups scroll and the explorer bounds itself — the stage keeps
its room. The failure to avoid is chrome that grows until it collides with itself and takes the
stage with it.

- **A theme is chrome; a style set is content.** A theme is what the *page* looks like; a style set
  is what a *usage* looks like. Two unrelated things that happen to share a word.
- **The theme owns the palette; a definition chooses within it.** Layering them the other way —
  definition overrides theme — fixes nothing, because a definition naming a colour is off-palette
  however the precedence runs. So they answer different questions instead: the theme is a **ramp of
  hue slots and fixed-function steps**, and a definition says *which slot, how intense* and never
  *what colour*. Neither overrides the other, and there is no combination that comes out wrong.
- **A definition tunes; it cannot break the system.** Everything it can set is a closed set or a step
  on a ramp. **Selection, hover, focus, icons and the error roles are the theme's alone** — those are
  the app speaking about the model, and a definition able to restyle them could hide the app's own
  signals.
- **A control shows its state — by wearing it, or by showing the set.** A labelled row of three says
  what is available and what is current at once, and is right wherever there is room. Where there is
  not, one icon that wears the current state and names the next in its tooltip says the same two
  things in a third of the width. **What is refused is the third form**: a control that cycles while
  showing neither.


## The shape of the code

**Three parts, and the tree and the stage are the base diagram.** Everything else wraps around them.

| Part | Is |
|---|---|
| **shell** | branding, navigation, and the workspace. Owns nothing about a diagram |
| **terminal** | an optional alternate way to give input |
| **module** | engine code, and what a diagram configures |

### Packages, not components

**The unit of decoupling is a package, and it is not a React component.** Four reasons, and they are
specific to this project:

- **Most of it does not render.** The log, the fold, the door, containment, rules, placement,
  routing and the action set have no visual output. A component tree cannot hold them, so they end
  up in hooks and context — which is how a single state module ends up owning the whole app.
- **Components do not enforce direction.** The central rule is that dependencies run one way, and a
  component may import anything and still compile. A package boundary makes the wrong arrow a
  **build error** rather than a lint discovered afterwards.
- **The unit of extension is not a component.** A package ships data; a module publishes a **named
  component key** resolved at load, and a component owns its key and reads no other's. That is a
  registry keyed by name, not a parent–child tree — a card layout is not a child of a style set.
- **A projection must outlive the DOM.** Translators emit drawings, a second host renders
  differently, and a notation should be testable without a browser. If *what a layer looks like* is
  DOM, every one of those re-derives layout for itself.

**React is the adapter at the leaves, not the architecture.** It renders a scene it did not compute.

> **Only the model package may name a closed set.** Anything else enumerating sorts of things is
> doing the engine's job in the wrong place — which is the failure this whole model was rebuilt to
> end, stated as something a build can catch.

### The view is where a notation plugs in, and a Scene is what it hands back

**A notation is a vocabulary, a set of renderers, a layout law and a gesture map** — configuration of
components the engine already publishes. What differs between an activity diagram and a state
machine is what a block means and how it is drawn, and both belong to the diagram rather than to the
engine.

**The base diagram is the block tree as it stands**, and every other diagram is a re-configuration
of it. That is the claim worth testing early: if the default cannot be expressed as one
configuration among others, the component boundaries are in the wrong place.

**A view module projects a layer and returns data, never elements** — placed boxes, routes, chrome
slots and hit regions. One renderer turns a Scene into DOM, another into a drawing, another into
text. A notation becomes a pure function, an emitter reuses the projection instead of reimplementing
layout, and most of the product is provably correct before anything is drawn.

**The layer is what is looked at; the layer view is the looking.** A layer is a cross-section of the
tree — the current scope, and nothing about presentation. The same layer read twice through
different packages is two projections of one thing, which is what stops a diagram ever being the
place a fact is stored.

**So a view module owns the projection surface, and the components own what is in it.** A component
is configured **per definition** and says what a *thing* is like wherever it appears. A projection
surface is **per module** and says what it takes to show a layer at all: a frame or no frame, a
camera or a scrollbar, where the chrome sits, where a gesture asks for a name. **Getting this the
wrong way round is the expensive mistake**, because it is invisible at first — put the frame in a
component and every table definition inherits a border it cannot draw.

**A view declares which adjustments it accepts**, and may accept none. The fewer it accepts, the
more the engine owns, which is the direction a general modeller should be moving in.

**A view at the top level is a project like any other** — its own export, its own place in the
workspace. It costs no new concept: a diagram is a block whose definition names a view module, and
everything it shows is a reference to something living elsewhere.

### Ports, and a second host

**The browser is the product; another host is a shell.** A desktop or editor-hosted version — VS
Code being the obvious fit, as a plugin rather than a fork — is for people who would rather not work
in a browser. It is a **second host for the same app**, never a second implementation.

**Four ports are the entire host contract**: where the log lives, how a file leaves or arrives, how
something is fetched from outside, and how text is scored. Nothing else may assume where a project
lives.

- **The shell is a shell over the graph.** It owns branding, navigation and the workspace and
  nothing about a diagram — the same split a host would need anyway.
- **A capability that cannot be carried is a port left unbound**, not a feature reimplemented. A host
  with no room for an embedding model binds no scorer and falls back, and the app is whole.
- **A host with its own palette does not replace the terminal.** An editor has a command palette and
  a console already, and neither is this — one is a fixed command list, the other a shell.

### The terminal is optional, and the strong form is deliberate

**One goal: an interactive, context-aware text interface.** Not a chat and not a script — a way to
say what you want in the words you already have, with the engine doing the placing and aligning.

**It is not a command palette, and the difference is the point.** A palette is a searchable list of
commands and stops there. The terminal is the app's one text entry point over the whole workspace,
and it does three things a palette does not: takes **natural language**, **surfaces** the
documentation and definitions bearing on what is in front of you, and **adapts** to how this person
words things.

**It reads context and never changes it**, and the reason is not squeamishness — **it ranks against
context.** A surface that moved context would be changing the ground its own ranking stands on, and
the option list would shift under the sentence being typed.

**Ranking is learned, and overruling it is the feedback.** `Enter` confirms the highlighted option
and arrows move the highlight, because a default that is invisible and changes under the user is the
version of adaptive ranking worth avoiding.

> **Take the terminal out and everything still works.** Nothing below it may import it.

An optional part that half the app imports is not optional — it is a dependency with a flag on it.
Three things follow:

- **It depends inward, never outward.** It reads the graph and reaches actions, exactly as the
  gesture map does. One more input surface over the same registry, not a layer.
- **Nothing it owns may be a general need.** Vocabulary and terms belong to a package, not to the
  terminal.
- **Every capability it adds must exist without it.** If the only way to do something is to say it,
  it has stopped being optional.

**It goes last, deliberately.** It ranks and completes whatever the surface offers, so building it
against a surface still moving means building it twice. It is also the one part whose value depends
on the rest being mature, which makes it the acceptance test for all of them.


## Reaching outward

### Where a project lives, and where it can be sent

**The session is the home and stays the home.** A project lives where the host put it, and the app
is completely client-side. **"No server" is meant literally**: the whole engine is in the tab.

**Import and export gain destinations, and that is the whole of it.** Local disk should be a
first-class target, and a cloud drive another. A drive is a place a *file* goes, chosen by the user,
one export at a time.

- **This is not a cloud home**, and there is no sync, no sessions and no server holding the project.
  Two machines are two copies, exactly as two downloads are today.
- **It is the persistence port and nothing else.** The same bytes the download already writes.
- **The engine never reaches it.**

### A model becomes something else

**A translator reads a project and emits; it never writes back.** One way, and the action that ran it
may record a resource block — the translator never touches the graph.

**SysML is a translation layer, never a shape the model bends to.** It is cumbersome, and a looser
tool that exports to it serves more people than one built in its image. That split is already paid
for: the engine's sets are closed and the `type` on each block is open, so a translator maps
stereotypes and changes no engine code.

**Nothing in the map is a special case**: a part property is a block with a parent, a value property
is a typed field, a port is an interface, a constraint parameter is an interface so a binding is an
ordinary relationship, a requirement is a block with two fields.

**Two losses are accepted rather than solved**: a trace assertion keeps its claim as a typed group
and loses the bracket notation, and lifeline order is presentation living in the view.
