# Design

**Why mndflow is the way it is** — the vision, the goals, and the reasoning behind the rules that
shape everything else. Not what each part does, and not what each word means.

- **What each part does** → [spec.md](spec.md). **What each word means** → [definitions.md](definitions.md).
- **What is missing and undecided** → [tasks.md](tasks.md). **The queue** → [plan.md](plan.md).

mndflow is for rapidly building and composing descriptive visual blocks into systems models. It is
a client-only web app. Visual scope is constantly constrained, so a reader is never shown more than
one layer's worth of anything.

**It stays general on purpose.** Hard rules are only the few that prevent an incoherent project — a
node cannot contain itself. Nothing is forbidden for being unusual, and where a choice could be
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

**SysML is a translation layer, never a shape the model bends to.** It is cumbersome, and a looser
tool that exports to it serves more people than one built in its image. That split is already paid
for: the engine's forms are closed and the `type` on each element is open, so a translator maps
stereotypes and changes no engine code.


## The simplified block model

**Settled 2026-08-18 (Clay).** The reasoning below supersedes every earlier account of forms,
proxies, sets and kinds. The vocabulary it produces is [definitions.md](definitions.md); the old
one is kept at [definitions-legacy.md](definitions-legacy.md) for comparison while the migration
runs, and **nothing may be built from it**.

**Why it was reopened.** *Everything is a block* was the goal from the first week, and the model
kept not being that. Four element forms hung off the block, `proxy` had quietly grown from *a
stand-in so a line can cross a boundary* into five unrelated jobs, `set` and `folder` were two
words for one thing, and the engine branched on a `structure` / `behavior` classifier the glossary
said flatly did not exist. The glossary reached 149 terms and three of the most-used ones meant
three things each. None of that was one bad decision — it was the accumulated cost of adding a word
whenever something new needed saying.

### Nothing earned a form

The old rule was honest: *a form is earned when the engine must know something about placement or
behaviour and cannot tell from a field.* Applied to the four forms it had, none of them passes.

| Form | The engine could tell from | So |
|---|---|---|
| `note` | it holds content and no children | a `resource` definition |
| `group` | it holds references and draws a boundary | a `view` definition, at layer scope |
| `proxy` | it stands for something else | a property of a block, not a sort of block |
| `block` | — | the only one left, so not a set at all |

**So there are no element forms.** A new sort of thing is a definition, and a definition is data.
That is the second goal stated plainly: *define every object and relation we expect to use through
data alone*, which a closed set of engine-side sorts can never allow.

### The base package, and the rule that stops it becoming forms again

The engine still needs a floor — something to draw and place a block that names no type. It gets it
as **a shipped, locked package of definitions the engine knows by id**: `structure`, `view`,
`resource`, and `folder` / `group` / `note` extending them. It is **open**, so shipping one more is
a code change made additively, not a closed set being widened.

**The engine may key off a base definition only for how a block draws and where it sits.** Never
for what it is, and never for what may contain what — containment is a `holds` rule, which is data.
Without that line the base package is element forms wearing a different hat, and it would grow back
into one within a wave.

The single exception is deliberate and named: **`view` holds references only, and the engine
enforces it.** A view whose members could be owned is a folder, and then the two words mean one
thing again.

### One word for one thing appearing somewhere it does not live

`proxy` was doing all of this: a cross-layer stand-in, a set membership token, the workspace filing
entry, a behavior participant, and a view member — plus `proxy port` in the SysML map, which is
unrelated. All five model cases are the same statement, so they get one word: **reference**.

**The relationship form `reference` goes with it.** It was only ever derived from *a proxy sits at
one end*, so it is an ordinary relationship that happens to reach a reference block. Drawing it
dashed is presentation.

The word was avoided originally because of that collision, and the collision was the symptom.

### Two child links, and ownership is what separates them

A block **owns** a child (a **part**) or **stands for** one living elsewhere (a **reference**). Not
distance — ownership. This is the one distinction every notation draws, it was already written down
as `part` / `ref` and marked *(planned)*, and it is what makes a folder and a view different
without either declaring anything: **a folder children are parts, a view children are references.**

`ref` as a *value form* is renamed **`link`** so the word means one thing. The test between them is
a sentence: **a reference is drawn, a link is not.**

### Behavior is not a classifier — and never was supposed to be

Checked against what a behavior model actually needs: ordering is a directed relationship or the
arrangement, participants are references, lanes are *group children by what they reference*, and actions
and states are definitions in `packages/behavior/`. Not one of them is behavioral machinery. **A
behavior model is one package plus three view modules**, which is what the glossary claimed all
along while the code branched on it anyway.

**And that closes the one-way door for free.** Which modules a layer may show now comes from its
definition `view` component rather than from a derived kind — so a project can never be trapped in
the sort of thing it started as, which is the trap `P.6` was invented to work around and which no
longer has anywhere to live.

### A view is a perspective, a folder is a container

**A view holds only references, a module, and that module settings.** It is composed by dragging
blocks in from anywhere in the workspace, and **pinning** a layer view is how one is made.

**A view holds views.** A matrix two axes are child views, each holding references — recursion
instead of an axis concept, so a filter, a nesting or a third dimension costs nothing new. A
reference carries a **depth** (`self` / `children` / `all`), which is how dragging a whole project
in gives you its blocks as rows and keeps them live as that project grows.

**A view block configuration is its content, not its presentation.** *Presentation lives on the
definition* still holds — it governs how the view block draws as a card. What it shows and how it
is arranged is the only content a view has, which is why it sits on the usage.

**A folder is a definition, not a derivation.** Mixed contents was never the signal — a folder of
five structure blocks is still a folder, and a set of references that all point at structure was
never a set. Both readings existed at once, which is how *set* and *folder* came to be two words
for one idea. Keeping `folder` and dropping `set` also frees a word colliding with *style set* and
*closed set*.

### The three tiers: workspace, project, folder

**Settled 2026-08-19 (Clay).** The model has a top, and it is not another project.

| | Contains | Owns | Holds |
|---|---|---|---|
| **workspace** | projects, packages, folders | nothing | the **log**, the metadata, the explorer settings |
| **folder** | anything — independent roots | nothing | nothing of its own |
| **project** | — | **a graph of blocks** | its own settings: canvas toggles, the sticky view per layer |

**Containment and ownership are different questions, and conflating them is what made *set* and
*folder* two words.** A folder is a filing structure: it says where something sits, and deleting it
must never delete what it held. A project is an ownership boundary: its blocks are parts, and
deleting the project deletes them. That is one line, drawn once, and every earlier attempt drew it
somewhere else each time.

**And it is derived, so nothing new is stored** (Clay, 2026-08-19). **Filing a block makes it a
root**; a root owns its own graph; so *contained* means *the child is a graph root* and *owned*
means everything else. This is the built rule that a block at the top level **is** a project,
applied one level down — dragging a loose block into a folder promotes it, dragging it into a
project files it. Chosen over a third stored link, which would have made every containment rule ask
three questions where two will do.

### A block module is code; a definition is data

**Every block names a block module, and may name a view module.** The block module supplies the
configuration surface and what the engine does with the block; the view module says how a layer of
it is drawn, defaulting to the block view.

This is the old *a package is data, a module is code* split applied one level down, and it is what
gives the engine back the dispatch it lost when forms collapsed — without giving it a closed set of
sorts. **A package may subtype any base definition freely and may never add a module.** So
*define every object and relation through data alone* stays true for vocabulary, and code is needed
only where genuinely new behaviour is.

**The rule is the same rule**: a module supplies drawing, placement and a configuration surface. It
never answers *what may contain what*, which is a `holds` rule and therefore data. Without that
line, block modules are element forms with a longer name.

### One log, at the workspace

**Settled 2026-08-19 (Clay): the workspace is one document, and it has one history.** Today every project holds
its own log and a change is routed to the log of whoever owns the element it names — `Effect.into`,
`writeInto`, the `home` batches, and a property test to hold them. With a single workspace log
**nothing routes**, because there is nowhere else to route to. `R.10` and the `onMove` defect are
both instances of a class that stops existing.

**What has to be accepted for it**, and none of it is a blocker on its own:

- **Undo is workspace-wide, and that is the intent.** One timeline over the page and everything on
  it. Undoing after switching projects reaches back into the other one, which is what a single
  document means and is the reason to want this rather than a cost of it.
- **A project export becomes a query**, filtering the workspace log for steps naming that project,
  rather than copying a log that already exists.
- **A fold for one project replays everything.** Checkpoints exist for exactly this and already
  carry the count of steps before them.

**Display state goes with it, to the same place.** The workspace holds the explorer fold, the
canvas toggles and which view each layer was last shown in — so reopening a workspace finds every
project as it was left, and **an exported project carries no opinion about how to draw it**. That is
the older rule (*a display preference is not project data*) finally given somewhere to live, rather
than being kept out of the log and then having nowhere to be.

### What a file carries: blocks, relations, views

**Definitions are grouped by what they describe** — a **block** definition, a **relation**
definition, a **view** definition — and that is the shape a project or a package file takes:

```
project { id, name, schema, defs { views, relations, blocks }, graph { root, … }, meta }
```

**One id space, three groups.** The grouping is how a file reads and how import-time validation
dispatches; it is **not** three id spaces, because *typed-by* and *points-at* must stay one
operation and a rename must orphan nothing. That was the one result the module walk produced that
has survived every revision since, and splitting the id space would give it up for a nicer-looking
file.

**A view definition is reusable, and a block definition names one.** It carries exactly one required
view module plus that module's options, so *how a layer is drawn* stops being copied into every
definition that wants it. A **view block** — a saved cross-section — is a block whose definition
names one of these. The two uses of the word are the same idea at two levels: *how to look*, and
*a looking that was kept*.

**`schema` is the module schema version.** Import is checked against it: a definition must match the
registered option surface of the module it names, and **a module the build does not know falls back
to the base block — and says so**. Falling back silently is the one thing to avoid, because a file
from a newer build would open looking subtly wrong with nothing to explain it; the door already
reports everything else it repairs as a fault, and this is no different.

### Arrangement is how a graph reads, not how it is displayed

**Clay's catch, 2026-08-19**, and it corrects the tier split: *flow and arrangement are not simply
display — they are how a graph reads.* So they sit on the **layer**, with the model, and not in the
workspace's display state.

The line that falls out is worth keeping, because it decides where every later setting goes:

| | Where | Because |
|---|---|---|
| explorer fold, canvas toggles, **which view module is showing** | workspace metadata | change nothing about what the model says |
| **arrangement** (direction included), stored placement | the layer | **inference reads them**, and an inference is permanent |

*This revises the earlier account, which put arrangement among the display preferences.* It also
retires **arrangement as a one-time action that only writes placement**: `relax` is continuous and
stores no positions at all, so arrangement is a **setting** with `free` as the case where placement
happens to be stored. The older rule was true of the four arrangements that existed when it was
written.

**One setting absorbed all three.** `axis`, `flow` and `arrangement` were three fields answering
overlapping questions, and `column` / `row` were only `down` / `right` with the direction left
unsaid. They collapse into **one arrangement with six values** — `free`, `grid`, `right`, `left`,
`down`, `up` — of which four carry a reading direction and two do not.

**Two values were dropped after reading what they actually did.** **`relax` is not a layout at all**
— it nulls `x`/`y`, handing the layer back to automatic placement, so it has no look of its own and
appears to do nothing unless something was hand-placed. **It is retired outright**, not moved: once
an arrangement is a *setting*, *hand it back to automatic* has nothing left to mean, because picking
a computed arrangement already does it and picking `free` already gives the placement back. *The
small named loss: nothing clears hand placement any more.* Accepted rather than kept, because a
door nobody can describe is worse than a door that is missing. **`radial`** is real but narrow — the busiest block takes the centre and the rest
ring outward, which reads only for a hub and its attendants and looks wrong everywhere else, with
unreachable blocks dumped into one final ring. Removed rather than fixed: a value that looks wrong
more often than right is a value that makes the tool look complicated, and it can return as a view
definition option if anybody wants it.

**Why this is model data and not a preference — it is forced, not chosen.** Inference reads
position along the reading direction (order tier 3), and behaviors.md requires that *the same
selection infers the same way every time*. If the reading direction were display state, the same
model would infer differently depending on how somebody was looking at it, and the result would be
a **permanent** block. So anything inference reads is model data. That single test decides this, and
will decide the next setting somebody proposes.

**The corollary:** `free` and `grid` carry no reading direction, so a layer using either has no
implied order and inference falls through to connectivity. One rule, and no tier that quietly
returns a different answer depending on how the layer was arranged.

**Nothing is discarded by arranging.** A block's `at` is always kept; a computed arrangement
replaces where things *draw*, never what somebody placed, so returning to `free` returns their
layout. That was already the rule — *retained placement: something an arrangement replaces rather
than honours, and which is yours again afterwards* — and it is what makes arrangement safe to be a
setting rather than an action.

**A `derived` relationship is a flag, not a module.** `line` and `directed` say how a relationship
draws and whether it carries direction; *derived* says nobody drew it and the engine computed it —
a different axis entirely, and one any relationship could sit on. So it is a property: not in the
log, recomputed on fold, not deletable. Chosen over a third relation module, which would have made
*how it draws* and *where it came from* one question.

**And an interface is declared, not derived.** It was *derived from having a `side`*; as a block
module it is made deliberately, and `side` becomes only where it sits. `promotion` already existed
as the explicit act of making one, and a declared interface is what can carry an anchor-slot surface
— which is what lets a lifeline occurrence and a proxy port be the same object.

### Inference makes blocks; composition arranges references

**Two different things were both called inference, and separating them is what makes the view work
tractable.**

| | Makes | Runs | Is |
|---|---|---|---|
| **`infer`** | **new blocks** — the block → activity → state chain | once, when somebody asks | model, and permanent |
| **composition** | **nothing** — a grouping, spacing and ordering of references | every draw | presentation, and recomputed |

**`infer` stays exactly as [behaviors.md](behaviors.md) describes it.** It is the path to behaviour
blocks and it is worth having; nothing about the block model changes it.

**Composition is the open area, and it is what a view block needs.** A view holds references to
blocks drawn from many layers, and something has to decide how they group, space and order — which
is a different answer per view module and no answer at all today:

| View | Groups by | Orders by |
|---|---|---|
| **block** | source layer | the arrangement's direction |
| **table** | a chosen column | sort |
| **matrix** | axis membership — its two child views | within-axis order |
| **activity / state / sequence** | lane, from the reference | the four order tiers |

**There is no per-module infer map.** That idea came from conflating the two, and it is withdrawn:
`ViewModule.word` and `.creates` stay, serving `create` and the behaviour chain, and no view module
declares what a block *becomes*.

**And composition runs on one metric: proximity.** How far apart two referenced blocks are in the
tree — same parent, same branch, same project, different project — is a path distance, computable
and deterministic. It answers all three questions at once, which is why three view modules need one
rule rather than three:

| | Reads proximity as |
|---|---|
| **group** | the **nearest common ancestor** of a set of references. No dial: the grouping falls out of what was dragged in |
| **order** | the **tree path**, lexicographically — which is what turns a pairwise metric into the linear order a list needs |
| **space** | distance, **where the view has room**. The block view does; a table and a matrix have rows, so they take the grouping and the order and drop the spacing |

**A proximity group is a derived group**, in the same sense a computed relationship is derived: the
`group` base definition already draws a boundary round a set of references, and nothing needs
storing for one to appear.

**The default has to be overridable, and that is the one thing this rule cannot decide.** A view
whose whole point is a cross-cut — every requirement across five projects — wants grouping by
*type*, not by project, and proximity would give it exactly the grouping it was built to escape. So
grouping by proximity is the **default**, and the alternative is a view definition option.

### What it costs, said plainly

The engine loses cheap dispatch on `form` and moves it to base definition plus card layout. Stream
`P` derivation rule — mixed children reads as a set, kind per layer — comes out entirely, and it
landed only days ago. `proxy` is named across `src/` and every doc. This is the largest revision the
project has taken, and it was taken deliberately: the alternative was a fifth form and a seventh job
for `proxy`.


## Five ideas

These carry most of the weight, and most of the rules below are one of them applied.

- **Derived beats stored.** Anything that can be worked out from the layer is worked out — seats,
  routes, boundaries, roles, control nodes, messages. Only choices are written down.
- **The model grows itself as it is described.** Describing behaviour over a structure is how that
  structure learns what it needs: the states a thing can be in, the interfaces it has to offer, the
  actions it performs. Somebody draws what happens and the definitions fill in behind them, so the
  work of modelling is spent saying things once rather than restating them in a second notation.
- **A hand-laid thing is a hard constraint; a derived one is not.** What somebody placed or declared
  is honoured; everything else is the layer's to arrange. This is the rule the whole layout model
  rests on, and the rule projection follows when it makes a new block rather than editing one.
- **The log is the truth.** The graph is folded from it, so undo needs no inverses.
- **An accident is the failure worth designing against.** Where a rule looks like it is protecting
  the user, check which it is doing: preventing a slip is worth a gesture's design, and preventing
  a choice is not. Most of the rules cut from this document were the second wearing the first's
  clothes.


## The engine and what configures it

Four tiers, and the boundary between the middle two is the one that matters: **what the engine must
know goes in data; what only a person needs to see is shipped beside it.**

| | Holds | Changed by | Lives in |
|---|---|---|---|
| **engine** | the forms, the tree, containment, membership, placement, routing, seats, the grid, the log and the fold, ids and references, the action surface | nobody. This is the closed part | `src/graph`, `src/geometry` |
| **definition** | name, other vocabularies' names, a body, fields, the room a usage needs, and the configuration of every open component | data, shipped in a package | `packages/` |
| **module** | renderers, layout laws, gesture maps, validation hooks, the projection surface | code, at build time | `src/modules/`, with stylesheets in `styles/` |
| **never** | a sixth element form, a new mutation op, a new adjustment | — anything the engine would have to *reason* about | — |

**Two sets, and telling them apart is the whole discipline.** Card layouts, style sets, rule kinds,
arrangements, routing strategies and view modules are **open** — extended by a code change, and
additively. The element forms, the relationship forms, the value forms, the mutation ops and the
action set are **closed**, and every argument in this document rests on their being so. If
"extensible" leaks into the second column the engine stops being general and becomes a plugin host.

**The engine never branches on user data.** It reads the closed forms and the derived facts and
nothing else — which is why a group earns a form for banding what it holds while a lighter stroke,
or a shape, does not earn one at all. Configuration changes what a thing looks like and what is
valid on it; it never changes how the engine places it.

**Per-subtype is configuration; per-instance is content.** A definition configures components for
every usage of it, and no element carries configuration of its own. Where two usages must differ,
they differ in what they **hold** and in their **fields**, both of which are ordinary content. That
is what keeps presentation from scattering across a project one element at a time.

**A component owns its configuration key and reads no other's.** They share one element and one log,
so separate code is not separate state, and this is the only thing that makes the isolation real
rather than nominal.

**Components ship as presets.** They configure independently, which multiplies quickly, and most
combinations are untested; a view names a coherent set rather than inviting recombination.

**Assets are build-time.** Somebody extending them edits the repo and rebuilds. That is real
extensibility and costs nothing; a runtime plugin loader means sandboxing untrusted code inside a
page holding the user's whole workspace, which is a different decision and not one to smuggle in.
It follows that **a package must be useful with portable presentation alone** — it brings its data
and renders on the simple typed fields, gaining its custom look only where the module and stylesheet
it names are in the build. It degrades rather than breaks.

**A subtype keeps the behaviour of the form it subtypes.** A decision is a block with a shape drawn
in it, a swimlane is a group with a segmented style, a lifeline is a column of actions — each
inherits placement wholesale and configures only what it looks like and what is valid on it. That is
what makes a package safe to install: it can change how a project reads and never how it behaves.


## The words

**Every term is defined in [definitions.md](definitions.md)**, which is the canonical vocabulary.
What belongs here is only the reasoning behind the shape of it.

**A project comes into being by being named**, and naming it is the first step
there is — nothing can be put in one before it has a name. The app therefore
opens with *no* project rather than with one nobody asked for: storage reads a
pointer and never invents one.

**Project names are unique**, which is the rule a layer already has, applied one
level up: projects are siblings in the workspace the way blocks are siblings in a
layer, and every file explorer works this way for the same reason. A name is
required and no two share one, enforced on the way in and on rename alike.

*This replaces a silently minted session project.* One was created on every load
so that there was always somewhere to draw; untitled, it drew as the bare word
`project`, nothing ever removed one, and a workspace accumulated a row per
abandoned session. The fallback label is gone with it — a blank name is now a bug
to see rather than a word to paper over.

**Nothing declares what a project is.** One holding only references is a view, one you are using
rather than writing is a package, one holding its own objects is a structure. It is visible from
what it has and from what you are doing with it, so there is no field to keep true — and a project is free to become something else by being
worked on. What its things *mean* comes from the packages it draws definitions from, not from a
class: one idea doing the work two would have done badly.

**Everything is a block or a relationship.** Those two are the fundamental units and there is no
third: a folder is a block, a diagram is a block, a note is a block, a swimlane is a block holding
references to blocks. What varies is what its definition configures and what it holds — **never
what sort of thing it fundamentally is**, because there is no longer a set of sorts to be one of.
That is the property the whole model is built to keep, because every rule that has to ask *"but
what if it is one of those instead"* is a rule that will be wrong about something later. *The
simplified block model* above is that property finally taken seriously.


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
a useless one — undo would walk back through a word one letter at a time. So a field commits once,
and successive placements of the same element replace one another. A run ends when a different
action begins, which is what makes it safe: the thing that closes a run is the same thing that would
have made the intermediate steps worth keeping.

**Compaction is the migration path, not merely a size limit.** Every schema change leaves a branch
in the fold that can never be deleted, because some log somewhere still contains that op. A
checkpoint is written in the *current* schema whatever the steps behind it were spelled in, so a
project sheds retired ops by being used — which is what makes deleting those branches a decision
somebody can safely take. What is spent is reach: undo cannot pass a checkpoint.

### A file is the graph

**A file is the graph; the log is a working copy.** The two have different jobs. A file exists to be
read, compared and kept, so it should be the size of the model rather than the size of the effort,
and its diff should say which elements changed rather than replaying the actions that changed them.
A log fails both: add a block, nudge it a dozen times, rename it twice and delete it, and fifteen
lines of diff describe a net change of nothing.

**Importing one is a checkpoint**, so this costs no new mechanism and there is no second format and
no second reader.

**The base of the envelope is whatever cannot be ignored; the rest is `meta`.** That one test is
what keeps an envelope from becoming a drawer. A reader that skips `schema` cannot know whether it
understands the file; one that skips `id` cannot resolve a reference. Everything else can be dropped
with no effect on what the project *is*.

**A count of work is not a version.** `meta.steps` orders nothing between two copies that diverged
and composes across no set of projects, so calling it a version would promise a guarantee the number
cannot make.

**The content hash is computed and never stored.** A derived value written down disagrees with what
it describes the moment anybody hand-edits the file, at which point it lies rather than merely being
stale — and git hashes the file already, better.

**A project file is a single-owner asset**, like a `.psd`. Two people editing one produces a
whole-file conflict with no merge path, and hand-merging model JSON is not reasonable work. The
answer to genuine multi-user editing is a live store, not a merge algorithm — a different product
decision, and not one this format should pretend to solve. What is given up is that history no
longer travels with the file, which is the right trade twice over: git is a better history than an
anonymous near-per-keystroke log, and undo is a thing you want *while working*, which is where the
log still is.

**An id says what it points at and never what it is called.** A name inside an id would go stale on
a rename, or force the id to be rewritten everywhere — which is the whole point of having one.

### Two things, and no more

A **block** is placed and drawn; a **relationship** joins two of them. Everything else describes
one of the two.

**Everything the project holds is a block, not only its structure.** A note, a group, a folder and
a reference are one record with one set of operations, because they were already being placed,
dragged, named and laid out alike — a second table for annotations meant a parallel mechanism for
each of those, and two cleanup paths where one would do. *The simplified block model* is this
argument taken to its end: they are not four sorts of one record, they are one record with
different definitions.

**Anything joining two elements is a relationship.** A form may draw as something other than a
routed line — a tie is a leader — but drawing is not identity. The alternative was a second way to
join things, with its own mutations, its own cascade and its own list, all shadowing what
relationships already do.

**The test for which of the two something is: drawn as a line between two things → a relationship;
not a line → a field.** A tie is a line, so it is one. A `ref` field is not, so it is not.

**Containment is the exception, and stays `parent`.** The tree is the one join every element has
exactly one of, so storing it as edges would mean guarding an invariant that a field enforces for
free.

**`form` is closed and the engine's; `type` is open and the user's.** One rule, and it holds for
elements, relationships and fields alike. A definition subtypes *within* a form rather than across
one, which is what keeps the closed set closed and stops every rule branching on user data.

**A form is earned when the engine must know something about placement or behaviour and cannot tell
from a field.** That is why a reference is not a form and a lighter stroke is not a form: one the
graph already knows, the other is presentation.

### Derived beats declared

The engine knowing something is different from somebody having to say it. **Container** and
**interface** are ways a block looks, derived from what it holds and whether it sits on a frame
edge. A relationship reaching a **reference** is derived from what sits at its ends. **Seats**,
**routes** and **lanes** are worked out from the layer every time it is drawn. **Control nodes and
messages** are counted from the relationships and their guards.

- **Naming any of them as a sort of thing would make an engine-level answer to something that
  changes the moment a child is added.** This is why forms went entirely.
- **A default is derived, never written.** A card falls back to its module's word where nothing has
  given it a type, exactly as an unnamed element falls back to `block 1`. Only a distinction
  somebody actually drew is written down.
- **Nothing about a line is stored, and there is no gesture for moving one.** Straightness is
  decided by the layer's arrangement, a convention is a rule stated once rather than dragged into
  every line, and clearing other lines is something no single edge can see — which is what lanes are
  for. What this buys is that a relationship the terminal added is drawn exactly as well as one
  somebody dragged.
- **Being cheap is a requirement.** A derived route runs on every render, so the router stays a
  router. A router nobody can predict is worse than a plain one even where its output is better,
  because the promise is that you never correct it — and you cannot trust what you cannot
  anticipate.

### A hard constraint, and what is merely retained

Two different things, easily confused:

- **A hard constraint is honoured *by* an arrangement and survives it.** Only two things are one: a
  hand-made interface's side and place along it, and a wall a right drag named for a relationship's
  end.
- **Retained placement is what an arrangement replaces.** A card's position is this. It constrains
  nothing: an arrangement overwrites it, writes the new one down, and hands it back.

So a card someone dragged is not a constraint. Only ports and walls are, because only they declare
something an arrangement has to respect while it runs.

**A wall is an intent, not a position.** Cards move, the frame resizes, and "this leaves by the
north wall" is still true and still drawable. It can become unhelpful; it never becomes incoherent.
A constraint fixes which side and where along it, never the distance — and two constraints can be
mutually unsatisfiable, in which case the sides are honoured and the route takes the consequence,
the same way a card dragged somewhere unhelpful stays there.

### One channel for everything the app says

**Every message goes to the strip at the top of the canvas**, carrying the text plus at most one
thing to do about it. A repaired log, a refused name, and the question before discarding a project
all arrive the same way.

- **No `alert` and no `confirm`.** They are two more places to look, cannot be styled, cannot be
  tested, and stop the page dead. A question is a message with one answer attached.
- **A refusal is said twice, at two lengths.** The field marks itself and reads *taken*, because a
  pane as narrow as the explorer can hold a word and not a sentence; the sentence goes to the strip,
  which has room.
- **One field for every name**, so a rule added to it reaches all of them at once.
- **A failed save is reported, never swallowed.** The session is unharmed until the tab closes, so
  the one thing that must not happen is the user not knowing.

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
  operation, which is how the tool once ended up able to create an interface and unable to undo it.
- **A click in the explorer navigates; a click on the canvas selects and never navigates.** So a
  glance never costs you your place, and descending is always a deliberate second gesture.
- **Toolbars divide by states against verbs**, which is why the two sit far apart. A control that
  does something and a control that is something look alike and behave differently.

### The shell yields; the stage does not

**Chrome gives way under pressure and the working area does not.** On a narrow window or at high
zoom the crumbs truncate, the option groups collapse and the explorer bounds itself — the canvas
keeps its room. The failure to avoid is the one the app has today: chrome that grows until it
collides with itself and takes the stage with it.

- **A theme is chrome; a style set is content.** `styles/` holds the `style` component's
  per-definition presentation and means what a *usage* looks like. A theme is what the *page* looks
  like. They are two unrelated things that happen to share a word, and merging them would put a
  user's colour preference where a definition's presentation lives.
- **The theme owns the palette; a definition chooses within it** (Y.5–Y.7, revising U.4). A theme
  was once held out of the canvas entirely, which left a blue shell around a green diagram and
  called it a look. **Layering them the other way — definition overrides theme — fixes nothing**,
  because a definition naming a colour is off-palette however the precedence runs. So they answer
  different questions instead: the theme is a **ramp of hue slots and fixed-function steps**, and a
  definition says *which slot, how intense* and never *what colour*. Neither overrides the other,
  and there is no combination that comes out wrong. The test is that the default theme looks the
  same before and after.
- **A definition tunes; it cannot break the system.** Everything it can set is a closed set or a
  step on a ramp — slot, intensity, border weight, text emphasis, what is shown. Nothing it can set
  is a colour, a pixel count or a font. **Selection, hover, focus, icons and the error roles are
  the theme's alone**: those are the app speaking about the model, and a definition able to restyle
  them could hide the app's own signals.
- **A control shows its state — by wearing it, or by showing the set.** A labelled row of three
  says what is available and what is current at once, and is right wherever there is room. Where
  there is not — a tree row capped at 36vw — **one icon that wears the current state and names the
  next in its tooltip says the same two things in a third of the width** (V.19). What is refused is
  the third form: a control that cycles while showing neither, which is what the original rule was
  written against.
- **A saved view is a block, not a kind of project.** A `view` usage holding **references** to
  what it shows, filed in a folder like anything else. No classifier was added, for the same reason
  *behavior* is not one. See *The simplified block model*.
- **Which view is showing is a display preference**, so it is sticky per project and never enters
  the log. The definition's `view.module` says how a layer *opens*; the toggle says what is on
  screen now. Same rule as `showPorts` and `angular`.
- **Every view module earns a distinct icon**, because a shrunken explorer is legible through
  glyphs or not at all. Definition icons are a separate want, and stream E already holds it.


## Where this is going

*Nothing in this section is built. It is here so that the refactors leading to it are made in the
right direction — see [tasks.md](tasks.md) for what is actually outstanding.*

### Three parts

| Part | Is |
|---|---|
| **page** | branding, navigation, and the workspace. Owns nothing about a diagram |
| **terminal** | an optional alternate way to give input. Minimises to one line |
| **module** | engine code, and what a diagram configures |

**The tree and the canvas are the base diagram.** Everything else wraps around them.

### The browser is the product; another host is a shell

**The web app is the primary interface and stays that way.** A desktop or editor-hosted version —
VS Code being the obvious fit, as a plugin rather than a fork — is for people who would rather not
work in a browser. It is a **second host for the same app**, never a second implementation.

This is recorded here rather than in the queue because it is not scheduled, and because it only
matters as a *constraint on the page*: the app already has an explorer, a working area and a rail,
which is the shape an editor already imposes, and that is what makes the fit cheap. Two things
follow, and they cost nothing to observe now.

- **Keep the page a shell over the graph.** `page/` already owns branding, navigation and the
  workspace and nothing about a diagram — the same split a host would need.
- **Nothing but `store.ts` and `file.ts` may assume where a project lives.** The persistence seam is
  the only place a host swaps one home for another, and S4.1 already put every key behind it.

**No decision waits on this.** If a UI change would be sound for the web app alone, it is sound.
It is worth mentioning only when a choice would *lock out* a host — a hard dependency on a browser
API from somewhere that is not the persistence seam.

### Where a project lives, and where it can be sent

**The browser is the home and stays the home.** A project lives in the tab, keyed per project, and
the app is completely client-side. Nothing here changes the log, the fold or undo.

**Import and export gain destinations, and that is the whole of it.** Today a file goes to a
download and comes back from a file picker. Local disk should be a first-class target — F.2's live
handle is that — and **a cloud drive should be another**. A drive is a place a *file* goes, chosen
by the user, one export at a time.

- **This is not a cloud home**, and there is no sync, no sessions and no server holding the project.
  Two machines are two copies, exactly as two downloads are today.
- **It is the persistence seam and nothing else.** The same bytes the download already writes.
- **The engine never reaches it.** `store.ts` and `file.ts` know about destinations; nothing else
  does.

**"No server" still holds**, and is meant literally for the app: the whole engine is in the tab. The
one possible exception is the rail (above), which is the optional input path and not the project.

### One graph, and a view is one too

**A view is a block of references**, and a view at the top level is a project like any other —
its own log, its own export. It costs no new concept: a diagram is a block whose definition names a
view module, a folder beside it is an ordinary block, and everything a view shows is a reference to
something living elsewhere.

**Things arrive by being put there**, and adding something to a view touches nothing else. A
relationship, though, goes to the log of the project that owns its ends — so filling in a matrix
cell is a real relationship in the real project, and undo reverts wherever the work landed rather
than where the user was standing.

**What is done through a reference reaches home.** Renaming a reference renames the block; a
behaviour acting on one modifies the block it stands for. One rule, no exception: the change is
written where the element lives.

### The block tree is the foundation

Every notation walked against the model — requirements, activity, parametrics, state machines,
sequence — asks for **no form the engine does not already have**. That is the strongest evidence the
closed sets are the right size: a set drawn too small would have shown it as a notation that could
not be said without widening it.

### The view is where a notation plugs in

**A notation is a vocabulary, a set of renderers, a layout law and a gesture map** — configuration
of components the engine already publishes. What differs between an activity diagram and a state
machine is what a node means and how it is drawn, and both belong to the diagram rather than to the
engine.

**The base diagram is the block tree as it stands**, and every other diagram is a re-configuration
of it. That is the claim worth testing early: if the default cannot be expressed as one
configuration among others, the component boundaries are in the wrong place.

**The layer is what is looked at; the layer view is the looking.** A layer is a cross-section of the
tree — the current scope, and nothing about presentation. A **layer view** is that layer projected
through the rules and packages in scope and handed to a view module to render. The same layer read
twice through different packages is two projections of one thing, which is what stops a diagram ever
being the place a fact is stored.

**So a view module owns the projection surface, and the components own what is in it.** A component
is configured **per definition** and says what a *thing* is like wherever it appears. A projection
surface is **per module** and says what it takes to show a layer at all: a frame or no frame, a
camera or a scrollbar, where the chrome sits, where a gesture asks for a name. Getting this the
wrong way round is the expensive mistake, because it is invisible at first — put the frame in a
component and every table definition inherits a border it cannot draw, and the engine ends up
branching on what kind of view is asking.

**A view declares which adjustments it accepts**, and may accept none. The fewer it accepts, the
more the engine owns, which is the direction a general modeller should be moving in.

### Structure and behavior

**Behavior is an overlay on a structure, not a second model of it.** A structure project is the
truth. A behavior project scopes to one or more structures and describes what happens *over* them —
activities, actions and states as its own blocks, bound to the structural blocks they act on. Two
projects, one truth, and the overlay never becomes a second place a fact lives.

**A usage leans on something else in one of three ways**, and the words are SysML v2's because the
distinction is the same one: a **part** the tree owns, a **ref** to something it does not own, an
**import** of an external definition. A behavior project holds refs — never parts — of the structure
it acts on, which is precisely why its tree stays its own and an object block never appears in it.

**Only behavior blocks are in the behavior tree.** A participant appears inside a behavior *layer*
as a ref, which is an appearance and not composition, so the two trees never interleave and neither
can drift into being a copy of the other.

**Order is read from the model, and only guessed at as a fallback.** A directed relation between two
blocks *is* the sequence, and it wins. Where none exists, position along the layer's own arrangement says
the same thing. So somebody who has laid ten blocks out in a row has already said what happens in
what order without drawing a single arrow — and that is the reason a directional arrangement was worth having as a
setting separate from an arrangement. The cheapest possible modelling gesture carries meaning, which
is what *rapid* has to mean if it means anything. The full chain is four tiers deep and lives in
[behaviors.md](behaviors.md).

**A behavior is inferred from a selection, once, and then it is the user's.** `infer` takes any
cross-section and gives one behavior block. It is one-way and deterministic, nothing re-syncs, and
**re-inferring makes a new block rather than editing one** — so hand-adjusted work can never be
clobbered by running it again. Opening with the structure's containment is the guess and not a rule
it keeps, because **a process worth modelling usually cuts across containers** and a tree pinned to
the structure's shape has nowhere to put one. The rules are in [behaviors.md](behaviors.md).

**Guess freely in the behavior; never guess into the structure.** This is the line the whole design
rests on. A wrong guess in a behavior costs an edit, so the inference can afford to be loose and
should be — *an inference that is wrong but workable beats one that never runs*, and most structures
will never have a named relationship for it to read. A wrong guess written into a **structure** is
another matter: it modifies the truth, in somebody else's project, invisibly.

> **A write to a structure block must be a fact about the structure that still stands once the
> behavior is deleted.** If deleting the behavior would leave it stale, it should have been derived.

| | Lives on | Survives deleting the behavior |
|---|---|---|
| an **interface** the interaction needs, a **relationship** it implies, a **definition** it fills in | the structure block | **yes** — true of the structure on its own |
| the **interaction**: order, guard, message | the behavior block | no |
| **participation** — who takes part in what | derived | n/a; it stops being true |

**So only what the structure stated is written home**, and everything guessed from position or
adjacency writes nothing. That is what makes loose inference safe rather than reckless. The write is
automatic, because the structure is the truth and there is nowhere else for the fact to go.

**Participation is derived, never stored.** A behavior holds refs to its participants, so *which
behaviors a block takes part in* is a question asked of the behavior projects in scope. A stored
back-reference would duplicate a fact that already lives in another log, write into a project for no
cause of its own, and leave a structure project opened alone carrying references to behaviors that
are not there.

**Nothing is derived that somebody edits.** A thing is derived when it is a **rendering of a count**
and nobody touches it — a fork, a message, a lane. It is **stored** when somebody names it, nests it,
or hangs behaviour on it — a state. That is the line *derived beats stored* draws, and states were
always the awkward case because they were the one derived thing people were expected to edit.

**Inference composes, and that is the whole chain.** A selection of actions gives a **state** block
exactly as a selection of structure gives an **activity** — structure, then activity, then state,
each harder to write from nothing than the one before. There is no separate promotion step and no
machine that exists before somebody asks for one.

**Activity, sequence and state are three projections of one behavior layer**, not three models. Each
is still its own **module**, because each projects differently enough to need code; what they are
not is separate copies of the facts. One behavior block encodes the interaction and three modules
read it three ways.

**A behavior block is a block, and only its definition differs.** `action` and `state` are shipped
definitions extending `structure`, never forms and never a classifier — doing against being is the
vocabulary, not the shape. A container is an *activity* and a leaf an *action*, which the engine
already tells apart, so nobody declares it. What a right-click makes follows from **the module in
scope**, so creating one stays the single fluid gesture that making any block already is.

**A control node is drawn, never stored.** Two outgoing orders with different guards is a decision,
two without is a fork, two arriving is a merge or join. Every one is a count, so the module draws
what it works out. Whether the bars and diamonds appear at all is the **package's** call — a SysML
reading draws them because a reader expects them — which is presentation, exactly where a package's
authority already ends.

**None of this needs a schema change**, which is the test that it belongs. An activity is a block,
its parent is the activity above it, a participant is a **reference**, the sequence is `dir` on
ordinary relationships, the implied order is position against the layer arrangement, and a partition is a
group. What is new is inference — code — and never a field.

### The action surface is the input seam

**Everything that changes a project is published as data** — a name, its arguments, and when it
applies — so that something never written against this app can still drive it. The surface is how
input methods talk to a project, not how modules plug into a page.

- **Two tiers, divided by whether a thing can be said.** An **action** names something somebody
  meant and is offered everywhere; an **adjustment** is positional and unsayable. Both write
  mutations and both undo; only actions are named, ranked and listed. The ambition is that
  adjustments stay rare — what the engine can decide, it should.
- **Arguments are typed, and eligibility falls out of them.** A position cannot come from a
  sentence, so nothing has to be marked as terminal-eligible and no second list can drift out of
  step with the first.
- **Eligibility is not ranking.** Describing a block and renaming it take the same arguments; what
  separates them is that a sentence is prose and a short phrase is a name. So types decide what may
  be offered and never in what order.
- **An action that writes no mutations is navigation.** One property carries all three consequences:
  no step, nothing to undo, and a text interface never offers it.
- **Scope is the same question a gesture asks** — under the pointer, selected in the tray, selected
  when somebody types are one question in three phrasings, so they are one field.
- **An action refuses in words**, and the refusal is what lets a ranked list put an inapplicable
  action last rather than hiding it.
- **A gesture layer names an action and never writes a mutation.** Interpreting input ends at naming
  what was meant. Otherwise a drag that knows a card's parent is changing emits the parenting
  mutation itself, and every rule about that change has two homes and drifts between them. Held to
  naming, the layer stays a thing a view can swap — and the pointer is answerable to the same
  refusals as a typed sentence, since both arrive at the same record.
- **The dependency runs one way only.** No module imports anything from the terminal, and no log
  records that a terminal exists.

### Packages and modules

**A package is data; a module is code.** A package is a set of definitions somebody ships — what
things are called plainly, what a standard calls them, the fields they carry, how they draw. It
costs nothing to add. A module is engine code, and an open one publishes the components a definition
configures. It costs an owner.

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
somebody can silently change in their own workspace has stopped being a standard. Refining SysML's
requirement means making a safety requirement that *is* one.

**A definition names one parent, and the chain is real.** Fields union with the subtype's winning by
name; components merge per key. One parent, so there are no diamonds and no merge order to argue
about. **A rule naming a definition means it or anything below it** — without that, an imported
standard's rules would reach only its own definitions and nothing anybody actually models.

**Shadowing is impossible; ambiguity is not.** Every reference is a path, so two packages naming a
thing alike are two different definitions and importing one can never change what an existing
element means. What two packages *can* do is offer two candidates called "requirement", and the
answer to that is presentation — both shown with the package they came from — not resolution.

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

### The workspace

**Several projects are open at once**, each with its own log and its own export, and the workspace
gathers them. A single project can still be opened, shared or imported alone.

**Everything is a block, and how it reads is derived from what it holds.** A project is a block
that nothing contains; a container is a block holding children; an interface is a block sitting on
a frame edge. Nothing declares any of these. Making a project is making a top-level block, so making
one is as ordinary as making anything else, and every caller — a drag out of the tree, the explorer
own control, `infer` — goes through the one door instead of each carrying its own.

*The **set**, derived from mixed children, was part of this reading and is gone.* A **folder** is an
ordinary definition and a **view** holds references; neither is guessed. See *The simplified block
model*.

**A saved view is a view block.** A requirements table is a view of requirements; an allocation
matrix is a view whose two axes are child views. The cross-section is chosen with the ordinary
multi-select or by dragging blocks in, each member is an ordinary **reference**, and which module
draws it is the definition `view` component.

*This replaces the earlier reading, that a saved view is a **set** and a set is derived from mixed
children.* Both halves came out with the block model: **set** is gone as a word, and **folder** is
an ordinary definition rather than a derivation. A view and a folder are told apart by what their
children are — references against parts — which needs nothing stored and nothing guessed. See *The
simplified block model*.

**A move across projects is two steps in two logs.** A project is a log, not only a place, so
nothing spans both — the rule `Effect.into` and the `home` batches already keep. Undoing in the
source brings the block back; it does not unmake the project.

**The workspace is itself a block, and needs no new schema to be one**: its children are project
roots and folders, contained rather than owned, and it draws as a block diagram whose dependencies
are derived from who references whom. *It was called a **project** here until 2026-08-19; it is now
the tier above one — it owns no graph of its own and holds the log for everything. See The three
tiers.*

**A change is recorded where its element lives.** Ownership routes it, and nothing branches or
merges. Every cross-project write goes through one door — an applied step appended to the target's
log, never a raw replace of it — so an action can get *which* project wrong but never leave a write
half-done. A relationship across two projects is a reference plus an ordinary edge, both in the
project of the end making the claim — so no relationship ever spans two logs.

**A reference tolerates a missing target and never records the absence**, so undoing a deletion in
one project brings it back in another. Only deletion is breaking, and only breaking changes
are reported.

### The terminal

**One goal: an interactive, context-aware text interface.** Not a chat and not a script — a way to
say what you want in the words you already have, with the engine doing the placing and aligning.

**Two functions, kept apart by whether it is open.** Collapsed, it is the app's primary text entry
point and asks nothing. Expanded, it is guidance: the next question worth answering, and a tutorial
walked over a sample project.

**It is not a command palette, and the difference is the point.** A palette is a searchable list of
commands, and it stops there. The rail is the app's **one text entry point over the whole
workspace**, and it does four things a palette does not:

| | |
|---|---|
| **natural language** | a sentence that makes or changes something, not the name of one action picked off a list |
| **it surfaces** | the documentation, packages and definitions bearing on what is in front of you |
| **it adapts** | to how *this* person words things, which is what a fixed command list can never do |

**It reads context and never changes it**, and the reason is not squeamishness — **it ranks against
context.** What the rail offers, and in what order, is derived from the layer you are in and what is
selected. A rail that moved context would be changing the ground its own ranking stands on, and the
option list would shift under the sentence being typed. The explorer and the pointer navigate; the
rail acts on where they put you.

**It reaches actions and never writes a mutation of its own** — the same rule the gesture map obeys.

**Ranking is learned, and overruling it is the feedback.** `Enter` confirms the highlighted option
and arrow keys move the highlight, because a default that is invisible and changes under the user is
the version of adaptive ranking worth avoiding.

**A host with its own palette does not replace it.** An editor host (below) has a command palette
and a console already, and neither is this — one is a fixed command list, the other a shell. The
rail is not duplicated by either, which is why a VS Code host costs it nothing.

**The rail is a separate thing, and the app is whole without it.** It is built to be **included or
not**, and that holds however much it grows.

**What ships is client-side, and the open question about where it runs is closed for now.** Z.8 is
scoped to ranked completion over the action surface plus **one** documentation hit, on the single
most relevant keyword and always ranked last. That is a lookup and a sort — it fits in a tab, so
nothing about the rail as built needs a server, and *"the app must work with it unavailable"* is no
longer a caveat this design carries. The **natural-language half above stays the aim** and is
deliberately not scheduled; if it is ever built, where it runs reopens with it.

> **Take `src/terminal/` out and everything still works.** Nothing below the rail may import it.

This is the strong form and it is deliberate. An optional part that half the app imports is not
optional — it is a dependency with a flag on it. Three things follow:

- **The rail depends inward, never outward.** It reads the graph and reaches actions, exactly as the
  gesture map does. It is one more input surface over the same registry, not a layer.
- **Nothing it owns may be a general need.** Vocabulary and terms are the live example: they live
  under `terminal/` today and the file tray reads them, which is what makes the rail load-bearing
  when it should be removable. They belong to a package, not to the rail.
- **Every capability it adds must exist without it.** If the only way to do something is to say it,
  the rail has stopped being optional.

*Not satisfied today* — see tasks.md, **S6**. `project.ts`, `page/App.tsx`, `page/Files.tsx` and
`page/Readout.tsx` all import `terminal/`, so the app does not currently build without it.

**It goes last, deliberately.** It ranks and completes whatever the surface offers, so building it
against a surface still moving means building it twice. It is also the one stream whose value
depends on the rest being mature, which makes it the acceptance test for all of them.

### The SysML target

The full concept-by-concept map is in [definitions.md](definitions.md). What matters here is that
**nothing in it is a special case**: a part property is a block with a parent, a value property is a
typed field, a port is an interface, a constraint parameter is an interface so a binding is an
ordinary relationship, a requirement is a block with two fields.

**Two losses are accepted rather than solved**: trace assertions keep their claim as a typed group
and lose the bracket notation, and lifeline left-to-right order is presentation that lives in the
view.
