# Design

Why mndflow is the way it is: the reasoning behind each rule, stated as it currently stands.

- **What each part does, in short** → [spec.md](spec.md).
- **What is missing, and what is undecided** → [tasks.md](tasks.md).

mndflow is for rapidly building and composing descriptive visual blocks into systems models. It
is a client-only web app. Visual scope is constantly constrained, so a reader is never shown
more than one layer's worth of anything.

**It stays general on purpose.** Hard rules are only the few that prevent an incoherent project
— a node cannot contain itself. Nothing is forbidden for being unusual, and where a choice could
be enforced or left to the user, it is left to the user.

**Four ideas carry most of the weight:**

- **Derived beats stored.** Anything that can be worked out from the layer is worked out — seats,
  routes, boundaries, roles. Only choices are written down.
- **A hand-laid thing is a hard constraint; a derived one is not.** What somebody placed or
  declared is honoured; everything else is the layer's to arrange. This is the rule the whole
  layout model rests on.
- **The log is the truth.** The graph is folded from it, so undo needs no inverses.
- **An accident is the failure worth designing against.** Where a rule looks like it is protecting
  the user, check which it is doing: preventing a slip is worth a gesture's design, and preventing
  a choice is not. Most of the rules cut from this document were the second wearing the first's
  clothes.


## Foundations

### The project, the log, and the fold

Only one thing is stored: **the log**, an ordered list of steps. Everything else you can see is
worked out from it.

A **step** is one thing somebody did — make a block, drag a card, rename something — holding the
**mutations** that action made, and a status of `applied` or `reverted`. One gesture is one step,
however many mutations it took.

The **fold** is what turns that record into something to look at: start from an empty graph and
replay every applied step, in order. The result is the **graph** — the current state, the tree of
blocks with the relationships between them. It is thrown away and rebuilt rather than edited in
place, so it can never drift from the record that produced it.

```
    log  ──fold──▶  graph  ──derive──▶  what you see
  (stored)         (current            (seats, routes,
                    state)              boundaries, layout)
```

**So a project is what it looks like: its graph, its metadata, and the history that built them.**
The only thing worth being careful about is which of those is *kept*. The history is; the graph
and the metadata are folded from it every time. Nothing edits the graph directly and expects it
to last — a change is a step or it did not happen.

That gives a sharp test for whether something belongs to the project at all: **is it in the log?**
The name of a block is, so it exports and it undoes. Whether interfaces are currently shown is
not, so it does neither.

**Why store the record rather than the result:**

- **Undo needs no inverses.** Flip the last applied step to `reverted` and fold again. Nothing has
  to know how to un-rename a block or un-delete a group, so no mutation can get its inverse
  subtly wrong — which is the usual way undo rots.
- **There is only one code path.** The graph that comes back from an undo was built by the same
  fold that built the original, so there is no second, rarely-exercised route for state to arrive
  by.
- **Derived data cannot go stale**, because it is never kept. Seats, routes and boundaries are
  worked out from the graph on the way to the screen, and the graph is worked out from the log.
- **The history is honest.** It is not a log written alongside the work; it *is* the work.

**What it costs, and what follows from it:**

- Every change has to be expressible as a mutation. Anything that cannot be is not a change to
  the project, which is the rule that keeps display preferences out.


### The envelope, and what a file is

**A file is the graph; the log is a working copy.** The two have different jobs, and conflating
them cost both. The log exists so that undo needs no inverses, which is a within-session concern.
A file exists to be read, compared and kept — so it should be the size of the model rather than
the size of the effort, and its diff should say which elements and relationships changed rather
than replaying the actions that changed them. A log fails both: add a block, nudge it a dozen
times, rename it twice and delete it, and fifteen lines of diff describe a net change of nothing.

**Importing one is a checkpoint**, so this costs no new mechanism: a `checkpoint` mutation already
carries a whole graph, and a file simply becomes a log holding one. There is no second format, no
second reader, and no derived-graph format to keep in step with the log format — a question that
had been open until the export stopped being a log.

**A project file is a single-owner asset**, like a `.psd` or a Figma document. Two people editing
one produces a whole-file git conflict with no merge path, and hand-merging model JSON is not
reasonable work. This is a normal way for teams to operate, and saying so is better than letting
somebody discover it. The real answer to genuine multi-user editing is a live store rather than a
merge algorithm, which is a different product decision and not one this format should pretend to.

**What is given up is that history no longer travels with the file.** That is the honest cost, and
it is the right trade twice over. Git is a better history than the step log for anything shared —
named, commented, branchable — where a step log is anonymous and nearly per-keystroke. And undo is
a thing you want *while working*, which is where the log still is. The log does not ride along at all: it was
briefly going to, capped and optional, but that is an advanced team feature dressed as a
convenience, and one format is worth more than the round trip it would buy.

**The base of the envelope is whatever cannot be ignored; the rest is `meta`.** That one test is
what keeps an envelope from becoming a drawer. A reader that skips `schema` cannot know whether it
understands the file; one that skips `id` cannot resolve a reference into the project; one that
skips `module` has to guess what it is looking at and draws it wrong. Everything else — how many
steps went into it, and whatever a later feature wants to carry — can be dropped with no effect on
what the project *is*, so it goes in a free-form bucket that readers take what they recognise from.

**The module's original justification was wrong, and it survives on a better one.** It was in the
envelope because a reader had to know which fold to run before running one — but that was an
argument about exporting a *log*. A file is a graph now, installed as a checkpoint, and a
checkpoint folds without knowing anything. What keeps `module` in the base is the ignorability
test: it says what kind of thing this is. When the structure/behavior split becomes real, the base
carries which of the two graphs it is and the preferred view drops to `meta`, since a view is a
hint and a graph is not.

**`schema` rather than `format`, and `"1.0"` rather than `1`.** *Format* is ambiguous about what it
versions — JSON against YAML, as easily as one field shape against another. And a bare *version*
beside a step count invites the question "version of what?", which is exactly the confusion the
step count was renamed to avoid. Two parts buy a compatibility rule rather than a yes or no: major
must match, a higher minor is readable, so additive changes to the base cost a minor bump instead
of a break.

**No author and no timestamp.** Git records both, at a granularity that means something.

**A bare array still loads**, as a legacy log in the block module — it has no envelope at all, so
its absence is the signal rather than a version number standing in for one. That is what every
file written before the freeze is, and the door already repairs what it can rather than refusing
it.

**A count of work is not a version, and calling it one invited the misuse.** `meta.steps` is every
step ever taken. It orders nothing between two copies that diverged, composes across no set of
projects, and changes how nothing is read — so the word *version* was doing active harm, promising
a guarantee the number cannot make. It is a count, and it is named one.

**A two-part `<era>.<steps>` was tried and dropped** on the way there. It read like a version
number, but the era could only ever count compactions — an internal storage event — so it carried
nothing the total did not, in a form that merely looked meaningful. Worse, it stops comparing
between people the moment compaction is anything but automatic, since the same work done in
different sittings lands in different eras.

**Nothing tallies while you work.** A checkpoint records the count of steps before it, because
compaction discards what came earlier and leaves nothing to count from; the rest is derived at
load and export. A version maintained as you worked would be an action counter watching over the
user's shoulder, which is not what a version is for.

**The project id came back after a team walkthrough, having been dropped once.** On its own it
looked like a field no human could read, buying robustness against file moves that this app cannot
suffer. What changed the answer is that a *team* renames things: a project renamed by one person
silently breaks proxies in a project owned by another, and the file name and the project name
drift apart with nothing keeping them in step. An id makes both harmless, and the second problem
is separately worth fixing by having the suggested filename follow the project's name.

**Exporting changes nothing**, so re-exporting an unchanged project produces a byte-identical
file — which is the whole reason the layout is canonical.

**The content hash is computed and never stored.** Storing it would break the rule the whole
project rests on: it is derived, and a derived value written down disagrees with what it describes
the moment anybody hand-edits the file, at which point it lies rather than merely being stale. It
is also redundant twice over, since git hashes the file already and does it better. Computed on
load, shown on hover, absent from the file.

**The layout is part of the format.** Definitions first, then the element tree, then
relationships. Elements nest under their parents, which deletes the most-referenced id from the
file entirely — position carries `parent` — and puts a diff hunk beside the thing it describes.
Siblings sort by id rather than by name, so renaming is one line instead of a record moving; only
re-parenting moves a record, which is what a structural change should look like.

**An id says what it points at and never what it is called.** `block_`, `edge_`, `def_` cost
nothing and make every remaining reference legible. A name inside an id would go stale the moment
somebody renamed the thing, or force the id to be rewritten everywhere — which is the whole point
of having one.

### Saying where the work is

**The header names the project and says where it is kept.** Both were missing: the brackets held
the domain, which is a setting rather than an identity, and nothing anywhere said that the browser
holds the working copy — so the only way to find out was to ask.

**One control, two states.** It reads `in this browser` while that is true and becomes
`⚠ not being saved — export` when the browser stops accepting the log. The same button does the
same thing in both — a warning that appears from nowhere is a warning nobody has learned to read,
where one that has been sitting there naming the working copy is already understood.


### One channel for everything the app says

**Every message goes to the strip at the top of the canvas**, and the strip carries the text plus
**at most one thing to do about it**. A repaired log, a refused name, and the question before
discarding a project all arrive the same way.

- **No `alert` and no `confirm`.** They are two more places to look, cannot be styled, cannot be
  tested, and stop the page dead. Giving the strip an optional action was enough to retire both —
  a question is a message with one answer attached.
- **A refusal is said twice, at two lengths.** The field marks itself and reads *taken*, because a
  pane as narrow as the explorer can hold a word and not a sentence; the sentence goes to the
  strip, which has room. Neither place has to compromise.
- **One field for every name.** A card's label, the frame's title, a group's name, an explorer
  row, the contents table — all the same component, so a rule added to it reaches all of them.
  When the uniqueness check was first written it reached three of the seven places a name is
  typed, and the missing four were only found by enumerating them from the code rather than
  from memory.

- **A field renamed in the schema has to be healed where a log enters, not where it is read.**
  `relation` became `type` on a relationship, and logs written either side of that both exist —
  so `fold` normalises the two into one. The alternative was every reader asking whether the
  field it wants is there, and the first reader that forgot took the application down.
- **The log has to read as actions, not as mechanics.** A step per keystroke would be a faithful
  record and a useless one — undo would walk back through a word one letter at a time. So a
  field commits once, when editing ends, and the step is called `rename`.

  **Dragging takes the same rule.** Nudging a card into position is half a dozen drags and one
  decision, so successive placements of the same element replace one another rather than piling
  up. A run ends when a different action begins — which is what makes it safe: the thing that
  closes a run is the same thing that would have made the intermediate steps worth keeping.

  Only pure placement qualifies. A drag that also joined a group changed the graph's shape, an
  arrangement is a decision rather than an adjustment, and a reverted step has to stay put for
  redo to find — each ends a run instead of joining it.
- Folding runs on every change, so it stays cheap: a pass over the steps and nothing more
  clever. Anything expensive belongs on the derive side, where it can be memoised per layer.
  Measured at 0.3 ms for a 20,000-step log, so replay is not what limits history — storage is.
- **A failed save is reported, never swallowed.** The session is unharmed until the tab closes,
  at which point everything since the failure is gone, so the one thing that must not happen is
  the user not knowing. The warning is the export button, because exporting is the only thing
  that helps.

### Checkpoints

**History is capped at 1,000 steps.** Past 1,200 the oldest fold into a single **checkpoint**
step carrying the whole graph, which then replaces them.

The graph is untouched by this: folding the prefix and replaying the tail is the same replay in
the same order. What is spent is *reach* — undo cannot pass a checkpoint, and something reverted
long ago can no longer be redone. That is the trade, and a thousand actions is far past the point
where anyone is still unwinding by hand.

- **A checkpoint is not something somebody did**, so it cannot be undone; reverting one would
  discard everything it stands for. Undo reports itself spent when only a checkpoint remains.
- **Steps are counted whatever their status**, so a recent run of reverted steps survives
  compaction intact and redo still reaches all of it.
- **It runs on load as well as on commit**, so an imported log is capped before anything else
  sees it.

**It is also how the project sheds retired ops, which is the larger reason for it.** Every schema
change leaves behind a branch in the fold that can never be deleted, because some log somewhere
still contains that op — a cost that otherwise grows with every refactor, in the least-exercised
code in the repo. A checkpoint is written in the *current* schema whatever the steps behind it
were spelled in, so old ops are carried off the end as work continues and a project stops
containing them within a thousand actions.

That does not delete the fold's legacy branches on its own; it makes deleting them a decision
somebody can safely take, because any project reaches the current schema by being opened and
used. Compaction is the migration path, not merely a size limit.

**Why a snapshot rather than rewriting the old steps into current ops.** The snapshot is a fold
result: if the fold is right, it is right. Translating each retired op in place would need a
second thing to be correct, and it would be rewriting the one thing that is actually stored.


### Hard constraints, and what is merely retained

Two different things, easily confused:

- **A hard constraint is honoured *by* an arrangement and survives it.** Only two things are
  one: **a hand-made interface's side and place along it**, and **a wall a right drag named for
  a relationship's end**.
- **Retained placement is what an arrangement *replaces*.** A card's position is this. It
  constrains nothing: an arrangement overwrites it, writes the new one down, and hands it back —
  so the card is draggable again the moment the arrangement is done.

A card someone dragged is therefore not a constraint. Only ports and walls are, because only
they declare something an arrangement has to respect while it runs.

**An edge is not hand-laid, however it was made.** A relationship drawn by hand and one the
terminal added say the same thing about the graph, and the tool's whole aim is that they draw
equally well. What can be hand-laid is the *port* or the *wall* at its end — those carry a
position; the relationship itself does not.

**What a hard constraint fixes, and what it does not:**

- It fixes **which side** a line leaves by and **where along that side**. Layout may not move a
  port somebody placed.
- It does not fix **distance**. Layout is free to move the units further apart or closer
  together.
- Constraints can be mutually unsatisfiable — two cards joined port-to-port on the same face.
  The side is honoured regardless and the route takes the consequence, the same way a card
  dragged somewhere unhelpful stays there.


## Concepts

### Vocabulary

**`form` is closed and the engine's; `type` is open and the user's.** One rule, and it holds
everywhere: an element's form is one of five the engine reasons about, a relationship's form one
of four, a field's form one of five value types — and `type` beside it is whatever the user
called this one. The same two layers used to be `element` and `type` on an element but `kind` and
`type` on a relationship, so the rule could not be stated at all and *kind* meant three different
things depending on where it was read.

- **Structural** — blocks, and only blocks. Structure is what the explorer shows: what contains
  what.
- **Non-structural** — fields. They describe what carries them, never appear in the explorer, and
  never change what contains what.
- **Annotations** — elements that describe rather than structure. A **group** draws as a boundary
  round its members; a **note** draws as a card of text tied to them. Nothing is both.


### Elements and relationships

Two things, and no more. An **element** is placed and drawn; a **relationship** joins two of
them. Everything else describes one of the two.

**Everything the project holds is an element, not only its structure.** Blocks, notes, groups and
proxies are one record with one set of operations, because they were already being placed,
dragged, named and laid out alike — keeping annotations in a second table meant a parallel
mechanism for each of those, and two cleanup paths where one would do.

**A block is the base, and the default.** The other three are specializations of the same idea:
a discrete thing that sits somewhere and can be described.

**Container and interface are derived, never declared.**

- A block on its parent's frame edge is an **interface**; a block holding child blocks draws as a
  **container**.
- Interfaces do not count towards being a container — a block with ports and no child blocks is
  still a block.
- Both are ways a block *looks*, so both stay out of `form`. Naming them there would make a
  closed engine-level set answer to something that changes the moment a child is added.

**A user's subtypes go in `type` and never in `form`.** A definition subtypes within a form
rather than across one, which is what keeps the closed set closed and stops every rule having to
branch on user data.

**`figure` is the form that says "not mine to draw".** An activity's fork, decision, initial,
final, merge and join are all figures: placed and drawn by the module that understands them,
never in the tree and never in the explorer. A value per notation was rejected because forms are
written into logs and so are permanent, and each new one would mean revisiting every rule that
branches on form. One generic value serves every module that will ever exist.

**A default is derived, never written.** Every element used to be stamped with its module's word
for a block at creation, so a whole project carried `Character` on everything and discriminated
nothing — and would have gone stale the moment that word changed. A card falls back to it where
nothing has given it a type, exactly as an unnamed element falls back to `block 1` without a name
being stored. Only a distinction somebody actually drew is written down.

The fallback is dimmed, because it is the same word on every card that has not been told apart.
It can also say `Module group` where the name deliberately cannot say `container`: a chip
describes what a card is right now, while a name has to hold still when a child is added.

**Anything joining two elements is a relationship.** A form may draw as something other than a
routed line — a tie is a leader — but drawing is not identity. The alternative was a second way
to join things, with its own mutations, its own cascade and its own list, all shadowing what
relationships already do.

**A reference is derived, not a form.** A relationship is one when a proxy sits at either end, so
drawing a line onto a proxy makes a reference without anybody choosing it — and it stays plain,
flow or assoc in its own right, because reaching another layer says nothing about what the
relationship *means*. Spending a form on it would have made the two mutually exclusive, and would
have asked the user to declare something the graph already knows.

**What a proxy stands for is a property of the appearance**, not two things being joined — so it
is not a relationship, and the references are the ordinary relationships that *reach* the proxy.

The test for which of the two something is: **drawn as a line between two things → a
relationship; not a line → a field.** A tie is a line, so it is one. A `ref` field is not, so it
is not.

**Containment is the exception, and stays `parent`.** The tree is the one join every element has
exactly one of, so storing it as edges would mean guarding an invariant that a field enforces for
free.

### Root

**The project is a block.** It holds every other, carries the project's name, axis, body and
fields, and is otherwise ordinary. Before this it was not an element at all, which meant the
project's name and axis lived on the graph as one-off fields and the panel had a case for
"selection with nothing to carry a value".

**It has no frame, because a frame is a block seen from inside and root has no outside.** For the
same reason it has no interfaces: there is nothing beyond it for one to face.

`parent: null` still means "in the root layer" wherever it is written, and root is told from its
own children by its reserved id. One exclusion, in one accessor — the alternative reparented
every top-level element and rewrote every place that asks which layer is open.

**An interface is made, not stumbled into.** What the old rule got right is that a drag which
silently converted a block into an interface would make every ordinary move a hazard. What it got
wrong was forbidding the conversion outright rather than the accident — so the tool ended up with
a gesture that creates an interface and none that undoes it. The accident is what the design has
to prevent; the operation is the user's.

**A container draws a treemap of its immediate child blocks.**

- **The band is divided by a fixed pattern, not by measurement**, so a container of a given size
  always divides the same way. Cells come out square, wide and tall against each other, so the
  division reads as a shape rather than a row of equal boxes.
- **Nine chips is the default cap.** Past that the cells are too small to tell apart, and a card
  is a summary rather than a list. The tenth slot reads `...` and opens the container, which is
  where the rest are anyway. A default, since a definition may say otherwise.
- **Fill shade carries relevance** — how closely a child's name relates to the container's — so
  one that has drifted off topic looks ragged. Size says nothing about it; the packing is fixed.
- **A name shrinks to fit and hides when even the floor will not fit.** A name in a sliver of a
  cell is not a name; the partition still reads without it, and hover names every cell.
- **Nesting stops at the first layer.** Following it further turns a deep container into a
  texture where nothing is legible.
- **A container is barely bigger than a block, by default.** It does not swell with what it holds
  — the cells shrink instead. Cards that grow with their contents turn a busy layer into a wall of
  boxes and repeat what the treemap already says. A definition may decide otherwise for its own
  usages.
- **No dashed border.** The treemap is signal enough, and dashes are spent on references, where
  the mark means one thing only: this is not from here.


### Interfaces

An interface is a child node on its parent's frame edge, drawn as a small square. It is what
makes the SysML export target coherent: SysML wants typed blocks and ports, and an interface is
the port.

**A relationship's end is a seat, not a node.** Where a line meets a card is a fact about how the
layer is arranged — move a card and it changes — so it is worked out, never stored. The layer
computes every seat in one pass.

**An interface is a node only where somebody made one.** Two ways in, and no others:

- **Right-clicking a card or frame edge** makes a bare one, because a node's shape is worth
  describing before its connections are.
- **Right-clicking a seat promotes it**, where it sits.

Drawing a relationship makes none. Deleting one destroys none. That removes the whole question of
which interfaces are collateral, and it keeps `side` meaning exactly what it always meant — every
interface that is a node is one somebody placed.

**A port and an anchor are different things.**

- Only a `flow` relationship's ends draw as interfaces, because only those are *typed*: one in,
  one out, which is what a port is.
- Every other end is an **anchor** — a place on the border, drawing nothing. A square there would
  claim a port the model does not have, and a diagram where everything has one reads as a wiring
  harness while the mark means nothing.
- An anchor shows a handle when its relationship or its card is selected, so nothing becomes
  unfindable by being quiet.
- A line stops at the **outer face** of a square, not the border beneath it, so it meets an
  interface rather than piercing it.

**A wall can be chosen; a seat cannot.** A right drag on the layer's frame names one of its four
walls and that end keeps it.

- A wall is an intent, not a position. Cards move, the frame resizes, the layer is rearranged,
  and "this leaves by the north wall" is still true and still drawable. It can become unhelpful;
  it never becomes incoherent.
- So it takes the standing every user choice has: it beats the side an axis would give, and an
  arrangement hands it back along with hand placement.
- **Only the frame names a wall.** A card has no border zone, so a drag from anywhere on it means
  "from this card" and there is no wall in the gesture. The frame is the standing exception
  because its interior is the background, so its border must stay a zone. Wanting a particular
  face on a *card* is answered by right-clicking that point for an interface and wiring to it.

**Naming.** An unnamed interface is `interface 1`, `interface 2`, and so on.

- Numbered rather than all sharing one word: a node soon has several, and five rows reading
  "interface" name nothing.
- Per parent, since that is where names are seen together.
- **The number is fixed at creation.** A new one takes the lowest its parent is not using, so
  deleting `interface 2` leaves a gap that the next fills. Numbers are therefore not always
  consecutive — the alternative renames ports nobody touched, and a port's name is what a
  relationship, a diagram and a reader all refer to it by.
- Its name shows beside it only on the layer's own frame. A card's interfaces are marks on a
  shape seen from across the layer, and labelling every one buries the card.
- An interface holding child blocks draws as a divided square, so a port with internals reads
  differently without being opened. Holding only other interfaces earns no mark.

**Visibility is a display preference and never moves anything.** A hidden interface leaves its
seat behind, and lines still meet the border where the square sat — lines that swung to the
middle of a side as a toggle went off made a change of view look like a change to the diagram. A
seat shows as a small round handle while its relationship or its node is selected.

**Fields an interface carries beyond an ordinary node:**

| Field | Meaning |
|---|---|
| `side` | which frame edge it sits on |
| `at` | how far along, 0–1, so it survives the frame resizing |
| `num` | its number among its parent's, for the name it falls back to |
| `flow` | optional, decorative: input, output, or both |

`flow` constrains nothing. An end already reads as in or out from the relationship it belongs to
and which side of it this end is — a fact **per layer, not per port**, since what arrives as an
input from outside a node leaves as an output inside it. A marking stored on the port could only
ever agree with one of the two. It stays because a port may want to say what it is before
anything is wired to it.


### Naming

- **A name is written the way it was typed, and shown the same way everywhere.** Two views that
  disagree about a name read as two objects.
- The only names nobody typed are the role words an unnamed thing falls back to — `block`,
  `container`, `interface 3` — lower case because they are descriptions. Giving a name replaces
  the description entirely.
- **A name is edited where it is drawn, by right-clicking it.** One rule for every name
  anywhere: a card's, a boundary's, the layer's frame, a relationship's type, and a row in the
  explorer. The right button means *make the thing this place is for*, and what a name is for is
  being written — no exceptions left in either pane.
- **A name is its own target.** Drawn set into a border, it is not that border: it highlights
  alone and the border stays dark beneath it.
- The explorer renames on double-click, as a file tree does. You rename a thing where you are
  looking at it.


### Relationships

An edge is a relationship between two nodes. It may be typed, labelled, annotated and directed.

**A relationship joins two nodes and meets each at a seat.** The ends are *nodes*; the seat is
only where the line lands. That separation is what lets an interface be moved, hidden or renamed
without any of it meaning something different.

**An interface is the one thing drawn on both sides of a boundary.** It appears on its node's
card from the layer outside, and on the frame from within. So wiring in to it and wiring out of
it are two relationships, each with both ends in one layer, coupled by the one interface they
share. Neither side knows about the other, which is the point.

**A relationship need not go through an interface, nor stay in one layer.** Requiring it would be
modelling hardware, where a signal really does cross at a connector. Code does not work that way,
and this tool describes both. A cross-layer relationship is simply not drawn until a reference
asks for it.

**Undirected by default** — a plain line asserting only that two things are related. Direction is
added deliberately.

**A form says what the ends *are*; `dir` says which way it points.** Three forms:

| Form | Ends | Draws |
|---|---|---|
| `untyped` | wherever the path wants | plain |
| `flow` | in and out, on the sides the layer's axis gives | heavier |
| `assoc` | wherever the path wants | thinner, fainter |

The two stay separate because an arrowhead decorates the line while the form decides where it
*attaches* — folded together, setting a direction would silently move both ends. A *parallel*
form was dropped: once lanes exist, relationships arriving together are drawn together already,
and a form describing what the renderer can see is a setting with nothing behind it.

**Nothing about a line is stored, and there is no gesture for moving one.** Every relationship is
worked out from its layer's arrangement — sides, seats, corners, lanes — in one pass, every time.

Three things a hand-routing gesture would be for, and only the middle is routing:

- **Straightness is decided before the router runs.** Two cards that do not share a row cannot be
  joined by a straight line however the path is chosen, so the fix is the layer's arrangement.
- **A convention is a rule, stated once.** Dragging every line into obeying it states it once per
  line.
- **Clearing other lines is the real gap**, and one edge cannot see it. **Lanes** answer it: runs
  that would share a line spread half a cell apart, centred on where they would have gone. Only
  interior segments move, so the run stays square without anything else being touched.

What this buys is that a relationship the terminal adds with no gesture behind it is drawn
exactly as well as one somebody dragged.

- **Every elbow is a right angle** — a property the whole run is put through on its way to being
  drawn, not something the router attempts. A relationship never has a diagonal in it.
- **A route belongs to nobody, which is what makes references simple.** A relationship drawn in
  two layers has each work it out independently; there is nothing to be in conflict.
- **Being cheap is a requirement.** A derived route runs on every render, so the router stays a
  router: pick sides, pick seats, find a min-bend path, spread the lanes. A router nobody can
  predict is worse than a plain one even where its output is better, because the promise is that
  you never correct it — and you cannot trust what you cannot anticipate.

**References.** A relationship whose ends are in different layers is drawn through a placeholder
standing in for the far node.

- **It is a visual shortcut and nothing more.** The relationship was already there against both
  real nodes, whether or not anyone asked to see it.
- A reference is an ordinary node in every way but two: it draws greyed and hatched, and **a
  relationship reaching it draws violet and dashed** — a line whose reading depends on knowing it
  leaves the layer.
- **No name of its own.** It shows what it stands for; renaming it renames that node.
- **No inside of its own.** Double-clicking goes to where the node actually lives. Nothing nests
  into one, and it never becomes an interface — a mention is not structure.
- **It points at a real node, never another mention.** The one way to make one is dragging a row
  out of the explorer, and the explorer does not list references, so a chain cannot be built.
- **Nothing places one automatically.** A **diagram is not an enumeration**: the tool is for
  saying which relationships matter in a layer, not for showing every one that exists. A
  relationship is not lost by going undrawn.
- **Deleting one removes the placeholder only.**


### Fields and definitions

A **field** is a named, typed value on an element or relationship: a `form` — `text`, `number`,
`flag`, `choice` or `ref` — and what this one says for it. Fields are non-structural throughout.

**"Attribute" was one word doing four jobs**: a data value, a classification, a piece of
presentation, and membership. Only the first survives an export and the third must never reach
one, so the word was hiding the distinction that matters most about it.

**A type is a definition; a thing that names it is a usage.** A definition declares the fields
its usages carry — names, forms, units, defaults — along with how they draw. An element or a
relationship names its definition in `type` and holds only the values it gives. This is the split
SysML v2 is built on, `part def` against `part`, and it is what finally gives `type` an identity:
a subtype becomes something that can be defined and reused rather than a string repeated by hand.

**One definition record serves elements and relationships alike.** A definition declares which
form it subtypes, and that decides what it can be applied to — `block` or `figure` for an element,
`flow` or `assoc` for a relationship. There is no second mechanism, which is why a project's
relation vocabulary is simply the definitions whose form is a relationship form. A module ships a
notation by shipping definitions.

- **A definition has an id**, and every reference to it is by that id. A pin typed by `Signal`, a
  flow carrying `Signal`, a data structure holding another — all three break the moment a rename
  can orphan them, and a name is the one part of a definition a user is certain to change.
- **A definition carries presentation.** For an element, colour and icon; for a relationship, line
  style, arrowhead and colour. That is what lets a module draw its own notation without any engine
  change, and it is what keeps presentation structurally absent from an export rather than
  filtered out of one on the way.
- **A `ref` field targets an element or a definition**, since both have ids. Typed-by and
  points-at are the same operation once identity is uniform.
- **A `type` naming no definition is minted into one, deterministically.** Free text is what a
  relation typed onto the canvas is, and what every log written before definitions holds — so the
  fold turns it into a real definition rather than treating it as a second kind of type. The id
  comes from the name because this runs on every fold: a freshly minted one would differ each time
  and the graph would never settle.
- **Definitions sit beside elements and relationships, as a third bag.** They are the project
  speaking about itself, like its name — but a name is a property and a vocabulary is a
  collection, so root carries the one and `graph.defs` the other. That is also what the file wants:
  definitions are a section of it, not something nested inside the tree's first record.
- **A field has no identity of its own.** It is addressed by its name on the thing carrying it,
  and setting that name again rewrites it. Sharing used to be what made one a grouping,
  which gave every descriptive value an id, a holder list and a lifecycle to serve the one case
  that needed them.
- **A `ref` field points at something without drawing a line.** That is how a part property or a
  satisfied requirement is stated, and it is why the line test is a test about drawing.

**The value forms are enumerated, and permanent the way a retired op is.** `date` was left out
because a `text` field carries one and nothing reasons about it, and a general list because
`many` on a `ref` covers what it was wanted for. Both deferrals had to pass the same test: full
multiplicity ranges can widen `many` later without reinterpreting a value already written, which
is precisely what adding a form after the fact could not do.

**Membership is held on the member**, and is neither a field nor a relationship. A block names the
groups it is in and a group's member list is derived by asking who names it, so the two can never
disagree — and a group draws a boundary round its members rather than a line to each.

**Groups** are the generic organizational element: a boundary round a set, and whatever the
vocabulary says that set means. A swimlane, an interruptible region, a package boundary and a
trace assertion are all groups with different definitions — which is why nothing about a set
needs a form of its own, and why a relationship never needs more than two ends.

- **The engine's part is bounds, membership and layout**; everything else is the definition's. It
  computes the boundary from the members, cascades membership, and treats the group as one unit
  when laying out.
- **A boundary is its members' bounds plus a small margin**, so it expands and contracts as they
  move. Its size is a fact about what it holds, never something set.
- Clicking its background selects it; dragging a selected boundary moves every member as one
  action.
- **Membership is a drag, the way a container's is** — a group should behave like the thing it
  looks like.
- **What decides is the card's own middle, against the boundary drawn from the members standing
  still.** Measured against all of them a card could never leave — it would take the boundary
  with it.
- **A boundary is measured where it sat when the drag began.** The members standing still define
  it where there are any; where every member is moving, the positions the graph still holds do.
  The old rule — that a group with everybody on the move is *travelling*, and so keeps them — was
  a limitation wearing a rule’s clothes: a one-member group never has anybody standing still, so
  it could never be broken up.
- **Dragging the boundary is how a group travels.** That gesture commits its members’ places
  directly and touches no membership, so a group moved by its own boundary cannot dissolve.
  Dragging every member instead is dragging cards, and cards landing outside the boundary leave
  it.
- **Dropping *on* a card is a move into that card**, not a join: that gesture is spoken for, and
  it is structural, so it wins.
- **A node made inside a boundary joins it**, by the same test a drop there passes.
- Boundaries overlap freely and their backgrounds compound, so the overlap is legible with no
  special handling.
- **A group looks like what its definition says.** A bare group — one nobody has typed — draws as
  one faint dashed line, which is the default and not a law. The rule that every group must look
  identical was aimed at denying a per-boundary colour picker, and it overreached: it would have
  made a swimlane and a trace assertion indistinguishable, and both are groups. A look belongs to
  a vocabulary, not to fiddling with one boundary.

**A group of one is a group.** Auto-deleting one that fell to a single member meant reading
intent — deliberate against decayed — from a graph in which the two are identical, and destroying
the user's work when the guess went the wrong way. Removing a group is a thing to be asked for.
The boundary round one block says little, and saying little is not a reason to delete something
somebody made.

**None of this makes a group structural.** No parent changes and the explorer never shows one.
What is inside a boundary is a fact about where things sit, not about what contains what.


### Notes

The other way an element describes: a card of text tied by dotted leaders to whatever it is
about. Where a boundary says *these belong together*, a note says something in words.

- **It describes, it does not structure.** A note does not participate. As a block it would enter
  the explorer, take nesting, take interfaces, and turn its leaders into relationships — every
  one of which is wrong.
- **A place is the one thing it needs that no other describing element does.** A group is placed by its
  members; a note can be tied to nothing at all, so there is nothing else to place it by. It
  carries the layer it was drawn in, which also answers where it belongs.
- **The drag that makes one sets its least size.** The note appears at the rectangle's top-left
  and gets at least the room that was swept — which is what somebody sweeping a big box is
  asking for.
- **A note is as big as the larger of what it was given and what it says.** Text always wins, so
  the box and its contents cannot disagree.
- **What it says is asked for before anything is made**, the same as a node's name. An unnamed
  block is still a structural thing that exists for a reason; an empty note is litter. Cancel and
  nothing is created.

  So both halves of the gesture are used, and neither needs apologising for: **the drag says how
  big, the prompt says what.**
- **The rectangle is drawn while it is swept**, in amber and dashed. A right drag on the
  background is otherwise indistinguishable from an unfinished right click, and amber cannot be
  mistaken for the green selection box the left button draws in the same place.
- **The note is its text all the way through** — no head, no border zone, nothing else to aim at
  — so it takes the same rule every name takes: right-click to write it.
- **Ties are made from the node's side**, since a right drag cannot set off from something that
  is all name. The same gesture over a node already tied unties it.
- **A leader is not a relationship.** It takes no pointer, cannot be selected or routed, and is no
  edge in any export. Dotted and thin: fine dots read as *attached to* rather than *connected to*.
- **Amber by default.** Green is structure and amber is description; a note is where that half of
  the palette gets used. A definition's colour wins where it sets one — the palette is the answer
  for things nobody has told apart.
- **Solid, with a rule down its left side.** A reference is dashed and a boundary is dashed, so a
  third dashed rectangle differing only in hue is a distinction to be worked out rather than seen.
  Dashes are spent; the margin rule is the annotation convention off the page.

**In layout, a note is avoided but never arranged.** It takes up room like a card, so nothing is
laid on top of one and no line is routed through one — but it is not a node, so it is not ranked.
And **an arrangement is never slid aside for one**: a note is placed by what it describes, so
carrying the layer clear of a note carries it away from the note's own subject. Only a card
somebody placed justifies moving an arrangement.

**Laying a layer out again moves a note with what it describes**, to just under the bounds of its
holders — clear of the ranks, and where a reader looks for a caption. A note tied to nothing keeps
its place; there is nothing for it to follow.


## Display

### Viewer

A single-page app laid out like a simplified IDE: a central canvas, and a file-explorer-like
object explorer on the left. Terms are deliberately generic so the tool applies to many domains.

Visual style and theme are **frozen as built** — see [tasks.md](tasks.md).


### Graph canvas

Scalability is the main priority. The canvas stays centred on the mass of the current layer.

- **Positions are stored relative to the canvas centre**, so a layer stays centred as it grows in
  any direction rather than drifting off one corner.
- **Placement precedence:** user placement wins; automatic layout fills the rest.
- The canvas refits whenever the layer gains or loses something, or is arranged afresh — never on
  selection. Selecting is a glance, and a canvas that chases every click cannot be worked on.
- As a layer crowds, the user clusters into **groups** (describing, no structural change) or
  into deeper **containers** (structural, a new layer).


#### Views

Three view types, told apart by the frame drawn around the layer being inspected.

- **Root view** — the top level, no frame. The project is the root node.
- **Node view** — the inside of a node: a frame carrying its name, with margin for the interfaces
  on its edge.
- **Interface view** — the inside of an interface. Opening it fills the canvas with that square,
  so what you were looking at from across the layer now surrounds you.

**Inside the frame is the canvas**, left clear to the grid; everything outside is dimmed. The
frame is the boundary of the thing you are in seen from within, not a panel laid over the page —
so the lit area is where you can build and the dark area is the outside world.

- **The frame carries its name set into its own border**, a break in the line rather than a
  caption above or a heading inside.
- **The frame fills the panel**, and the band around it is the same on every side of every layer:
  stepping between two layers should not move the walls. The frame is therefore shaped like the
  panel and then placed, rather than scaled to fit — any other shape fits by one axis and
  letterboxes on the other.
- **A sparse layer still gets a full frame.** Without a floor on its size, a near-empty layer is a
  small box magnified to fill the screen: the same picture, twice the size, no more room to work.
- **Growth happens inside the frame.** A layer that gains a node grows its frame and the view
  refits, so contents shrink within a constant working area.
- A node with no children still gets a full view. Descending is how you start filling it, so it
  must not be a dead end.

**A layer with an axis marks the two walls its flows cross**, as a thin band just outside the
frame's own line.

- Which way a layer reads decides where every card lands and which side every flow attaches to,
  and it should not be legible only by reading a toolbar.
- **Outside the line, not a thicker line.** The frame's border box is where every interface is
  seated and every line lands, so thickening it would move all of that — and would leave ports on
  the band's outer face, with the wall reading as though it were behind them.
- **The frame's own line is one of the pair.** One thin band beside it is the whole mark.
- **The two are told apart by shade** — the wall flows arrive at is brighter than the one they
  leave by, so the layer reads in the direction the wall fades. Shade rather than hue or weight,
  because that border already brightens under the pointer and again as a gesture's target.

**An interface view is marked by the parent's own border**, drawn in the dimmed margin, running
up to the frame and away on the other side — the wall the port is set into, passing behind you.
Its direction follows the edge the port sits on.

> `Gateway` has an interface `HTTP` on its right edge. Descending into `HTTP` fills the canvas
> with `HTTP`'s frame, and a vertical line continues above and below it — `Gateway`'s right-hand
> border, seen from inside the port. Blocks left of that line face inward; those right of it face
> the outside world. Relationships crossing it are exactly the ones crossing `Gateway`'s boundary
> through this interface, which is what makes the view worth drawing.


### Object explorer

Structure and only structure: nodes nested to any depth, with the standard operations. Dragging
between explorer and canvas works both ways.

- **Interfaces are hidden by default**, revealed by a toggle, listed at the same level as child
  blocks and sorted after them. They get no branch of their own — a wrapper would be a level of
  structure that does not exist.
- **Each role has its own icon, and the icon is also the fold control.** The mark that says a node
  holds things is the thing you click to see them, so no second arrow takes up the indent.
- **A row is all name.** An icon that folds and a label, with nothing else to aim at — the same
  shape a note has. So it takes the same rule: right-click a row to rename it. Carving out a
  non-name strip of a row for a second gesture would be the few-pixel ring the card's border zone
  was deleted for.
- **The clear space below the rows is the root's background**, so the right button makes a block
  at the top level. The rows *are* the layers in this pane, so the space around all of them
  belongs to the thing that holds them all — not to whichever row happens to be scoped. Landing
  in the open layer read as a trap: the gesture points at one place and the result appears in
  another.
- **The bar's ＋ button is the one that acts on the open layer**, next to the button that renames
  it. Two creation gestures with two targets, each next to what it acts on.
- **Clicking a row opens its branch.** Asking to look inside something and being shown a shut
  row is the pane disagreeing with itself about what you just did.
- **Walking into a layer on the canvas leaves the tree as it was found.** A tree that rearranges
  itself under you is one you cannot keep your place in.

  The two are not in tension: folding answers to gestures *in the tree*. A click on a row is one,
  so it may open what it entered; a step taken on the canvas is not, so it changes nothing here.

### Refusing a name

**A refusal is explained where it happened.** A name field that clashes marks itself and says
*name already here*, rather than the gesture quietly doing nothing — silence reads as a broken
button, and the rule it is enforcing is invisible until it bites.

- **Warned while typing, not on `Enter`.** The clash is knowable on every keystroke, so waiting
  until the commit turns a fact into an ambush.
- **The field holds rather than closing.** A refused name is still the name somebody meant: the
  correction is one keystroke away and the caret is already there, where closing would throw the
  typing away and explain nothing.
- **One component for every name field**, so the rule reads the same in the explorer and on the
  canvas. Two copies would drift, and a rule explained two ways is two rules.
- **A note is exempt**, being its own text rather than a name among siblings.
- **Deep branches indent past the sidebar** and the tree scrolls horizontally, centring on the
  depth of the selection and re-centring whenever the tree's shape changes.
- The tree fills the panel, so its scrollbar sits at the foot of the sidebar. A bar that floats
  with the number of rows is hard to find and harder to aim at.

**Moving a node to another layer sheds what does not travel with it** — its group memberships,
and its **external wiring**, the relationships joining it to things staying behind.

- **What travels is kept whole**: children, the wiring among them, and the wiring from them to the
  node's own interfaces. That last is easy to get wrong — such a line *names the node as its far
  end*, but an interface draws on both sides, so it is internal wiring inside the very layer that
  is moving.
- **Nothing is created.** No reference is placed to keep a dropped line visible; a reference is
  the user's, always.
- **Interfaces are not shed.** A node keeps its shape and loses only its connections outward.
- **Dropping external wiring is a deliberate, provisional simplification.** Those relationships
  are not incoherent after the move, merely undrawn. They go because a project full of
  connections nobody can see is worse than one that lost what it stopped drawing.


### Breadcrumbs

The trail from the project to the open layer, each step a way back. It names the project and the
last three layers; anything between collapses to an ellipsis that names them all in its tooltip.
A trail spelled out in full stops being a trail and becomes a wall of names.


### Contents tray

One panel below the canvas, listing **everything the open layer holds**. It replaced a panel that
showed the selection on its own, which said the same thing in a second shape: a table of
everything already contains whatever is selected, so the two competed to describe one row.

**The table is how you reach what the drawing hides.** A relationship or an interface could only
be found by hunting for it on the canvas; here they are listed beside the blocks, filterable and
sortable. That is the whole reason for it.

- **Hovering a row lights the thing on the canvas, and clicking selects it there.** The table is
  a way *into* the drawing rather than a substitute for it, so every row points back.
- **What a row says is shown on hover; what it does is on the row.** Reading and changing are
  different needs — one wants to be effortless while scanning, the other wants to be deliberate.
  So the summary follows the pointer and the buttons wait for a click.
- **Buttons stay hidden until a row is under the pointer.** Five sets of icons down a table read
  as a control panel rather than a list.
- **Fields open rather than sitting there.** A column of live inputs cannot be clicked to select
  the row behind it, and a table whose every cell is a control is a form.
- **Body text and fields live in the row, opened out.** They were the one thing the old panel
  had that a table row does not, and dropping them would have made a block's specification
  unreachable — so the row expands rather than the panel splitting in two.

**The frame takes its shape from the room it is actually shown in**, so opening the tray reshapes
it into the strip that is left rather than letterboxing the old proportions into it. On a narrow
window that was the difference between a third of the available width and all of it.

**It shares the canvas rather than covering it.** Open, it takes half and the drawing takes the
other half, which re-fits into what is left. Overlaying hid whatever sat at the foot of a layer,
and worse, left the camera centring content into a panel taller than the part anybody could see —
inside a frame that put the frame and its dimming band across everything visible.

**Its height is fixed at a third, not sized to its contents.** A tray that grew to fit moved every
time a filter changed the row count, so the row being reached for was never where it was last
seen. A third is enough to read and leaves the drawing, which is what is being described, the larger share.

It is still shut until asked for. A click anywhere outside puts it away; the tab is one click
either way.


### Terminal rail

The contextual prompt and option chips are **frozen as built** — see [tasks.md](tasks.md).


## Interaction

### Scope and context

- **Scope** is the layer the canvas draws. **Context** is what is selected within it.
- **A click in the explorer sets the scope.** It is a navigator, and every click in it navigates.
- **A click on the canvas sets the context and never navigates.** Selecting a thing shows it among
  its siblings, so a glance never costs you your place.
- **Descending is always the deliberate second gesture**: double-click into a card, double-click
  outside the frame to come back.


### Editing

A move is never confirmed first. Undo is the answer to a move that went wrong, and a dialog in the
way of every reorganisation costs more than it saves.

**Left drag, by where it starts:**

| From | Does |
|---|---|
| a card | moves it; onto another card nests it; in or out of a boundary joins or leaves |
| a note | moves it within its layer |
| an interface | slides it along its frame edge |
| a selected group's background | moves every member together |
| empty background, or an unselected boundary | draws a selection box |

**Select-then-drag is for large targets, not small ones.** A boundary is a wide transparent area a
drag could begin in by accident, so it moves only once selected; so does a multi-node selection.
An interface is thin and precisely reported — a drag beginning on one could not have meant
anything else — so it acts at once.

A selection box that has caught something **reaches a little past what it holds**. Sized exactly to
its contents, its line lands on the cards' own borders and reads as part of them.

The canvas pans with the middle button, `Space` held, or the wheel — never a plain left drag,
which is spent on selecting and moving. Panning is bounded to the layer's contents plus room on
every side to put something new.


### The two toolbars

They divide by **what they are for**:

- **Top-right — relationships.** Whether interfaces are drawn, what form a right drag creates,
  square lines or curved ones, and which way the layer reads. Settings, every one, so each shows
  what it is currently on.
- **Bottom-right, opposite the zoom controls — arrangements.** Four verbs and nothing else. None
  of them lights up.

The division is **states against verbs**, which is also why the two are far apart on the screen.
A control that does something and a control that is something look alike and behave differently,
and putting them in one strip is what made the old arrangement toggle unreadable.


### The two buttons

**The left button handles what already exists. The right button makes something new.** A division
by what the gesture *does*, not by what it is over — which is what makes it sayable in one line.

Within the right button: **a click makes the thing that sits at a point, a drag makes the thing
that has extent.**

| | right click | right drag |
|---|---|---|
| **on a node** | an interface — a point on its border | a relationship — from it to somewhere |
| **on the background** | a node — a point in the layer | a note — something with extent to say |

- **No part of a card is a separate target.** Right-clicking anywhere on it makes an interface; the
  position decides which point of the border, but it is not a test the click has to pass. Aiming
  at a ring a few pixels wide for the commoner of two actions is worth nothing. Making a child
  node means stepping into the card and right-clicking its background, which is the same act
  described honestly.
- **The layer's frame is the one exception**, unavoidably: its interior *is* the background, so
  its border stays a zone. It is a large, plainly drawn target.
- **Right-clicking a relationship writes its name.** A type does not exist until somebody writes
  it, so this is a creation like the rest, and it leaves naming with no exceptions anywhere.
- **A right drag from a name does nothing at all** — not on the way, and not on release. A drag
  that began on a name meant to go somewhere; landing it back as a text cursor is the tool
  guessing.
- **Nothing stacks.** Right-clicking an interface makes no second one beneath it.

Once the context menu exists, each entry above becomes its default and the alternatives sit beside
it: direction and reversal for a relationship, ungroup for a group, paste for the canvas, delete
throughout.


### Keyboard

Shortcuts act on whichever of the explorer and canvas has focus. The table is in
[spec.md](spec.md); the choices worth defending:

- **`F` reads the context rather than taking an argument.** With nothing selected it fits the
  layer, with something selected it goes to that. "Show me this" is one intention, and which
  *this* is already answered by what is selected.
- **`Ctrl` adds to a selection and does nothing else.** It is not an alias for the right button:
  every right-button gesture is a click or a drag, so `Ctrl` + left-drag would mean two things at
  once, and a trackpad's two-finger tap is a real right click.
- **`Space` held turns a left drag into a pan.** The middle button alone is unreachable on a
  trackpad, which made panning wheel-only on the machines most likely to be used for this.


### Hovering

**One element highlights at a time, and it is the one in context** — whatever a click would act on
now. Right-click has no menu yet and acts directly, so what is lit is the only warning of what the
button is about to do.

**The innermost thing under the pointer wins**; the table is in [spec.md](spec.md).

- A card is never lit at the same time as an interface on it or a chip inside it, and a border is
  never lit with the name set into it. Lighting a thing and everything around it says nothing
  about which is about to be acted on.
- **A card lights as one thing, border and all**, since the border no longer takes a different
  action from the inside.
- **A group's boundary is found by measuring, not by the pointer.** It is transparent until
  selected, so a selection box drawn inside it reaches the canvas rather than sweeping the group
  in — which means nothing ever reports it as hovered. The tightest boundary the pointer is inside
  is what lights.
- **Nothing else highlights.** Marking what a recent action changed competes with the highlight
  that says where the pointer is, and leaves the diagram looking edited long after the edit.


## Geometry

### The grid

**Everything with a place of its own lands on a 24-unit grid**, and the backdrop dots are that
lattice rather than a decoration at a spacing that nearly matches.

- **Snapping happens when a layer is drawn**, not on commit. It costs nothing, heals old layouts
  by drawing them, and keeps the division the tool already has: the log records what the user did,
  and how it is shown is derived.
- **It is also the only thing that snaps.** A second snapper disagreeing by half a cell makes
  cards jump on release, and moves a group's boundary — carrying every member off the grid with
  it.
- **A card is placed by its middle, not its corner.** A block is a cell and a half tall, so
  landing its corner on a line leaves its top border on the grid and its bottom stranded between
  lines — an asymmetry felt exactly where interfaces sit. Landing its middle on the middle of a
  row, it sits squarely and overhangs evenly.

**Two size constraints do real work, and only two:**

- **The container band is a multiple of two cells**, so half of it — what separates a block's
  middle from a container's — is a whole cell and grid steps can square them.
- **Sizes are whole seats**, which is what makes the seats along an edge evenly spaced.

Within those, **a card is as small as its contents allow**. A card's far edge landing on the
lattice aligns it with nothing: what a card lines up against is another card, and two of the same
height are level wherever they sit. Slack held for text that might arrive is space paid for on
every card against a name most of them do not have.

**A card is drawn at exactly the size the layout says it is.** Group boundaries, the side a
relationship leaves by, and every seat's position are all computed from that size, so a card that
sizes itself from its text agrees with none of it. A name too long for its card is clipped — the
honest consequence of a card having a size at all. Nothing else clips: interfaces straddle the
border and the graze ring is drawn outside it.


#### Seats

**An interface sits in a seat: every 12 units along its edge, never on a corner.** Stored as a
0–1 fraction so a port survives its frame resizing, but only fractions landing on a seat.

- **Counted in units, not as a share of the edge.** A twelfth of the way down a block is 6 and a
  twelfth down a container is 10, so two ports meant to be level would not be. In units, the
  third seat is 36 down every card whatever its size.
- **No two sit in the same seat.** A drop onto an occupied one takes the next along — a drag that
  has to be repeated until it finds a gap is worse than one landing beside where it was aimed.
- **12 is the floor.** An interface mark is 11 units wide, so any finer and two adjacent seats
  overlap on screen while obeying the no-stacking rule in the data.
- **The layer's own frame is the one place this cannot fully hold.** `frameBox` is derived from
  the layer's contents and the panel's shape, so a window resize moves it. Accepted: the
  alternative is a frame that does not fit its panel, which is the worse fault.
- **Route corners are not snapped.** A corner counts as level with a port within 2.5 units, and
  quantising to 24 would throw it up to 12 off — past that tolerance, so every straight line
  would bend again.


### Layout

**Three jobs:**

1. **Spacing** — meaningful separation, applied between parts and within them alike.
2. **Orientation** — which way things face and sit relative to one another, honouring hand-laid
   ports and walls.
3. **Routability** — preferring arrangements that will route cleanly.

**The third is judged by proxy, never by routing.** The pipeline runs one way — relation form,
port side, placement, routing, lanes — and it is cheap and predictable *because* placement reads
topology and never geometry. Scoring a layout by running the router closes that loop. Crossings,
rank alignment, ports facing each other, clusters not straddling one another: all of these say
what routing would say, and none of them needs the router to have run.

**A layer's arrangement is one setting, held on the layer:**

**An arrangement is an action; which way a layer reads is a setting. They are separate
things.**

An arrangement is a verb: press it and the layer is laid out that way, once. What it works out
is committed as ordinary placement and it then gets out of the way — so a card can be dragged
afterwards like any other. Under a mode, layout would recompute every frame and throw that drag
away on the next one, and *a layout that disables manual placement is not a layout, it is a
cage*.

Because it is a verb it holds no state, which is exactly why it cannot also carry the layer's
direction. It has no lit "current" arrangement, because there is no arrangement a layer is
*in* — only one it was last put through.

| Arrangement | Does |
|---|---|
| `grid` | tiles outward from the middle |
| `radial` | the busiest unit at the centre, the rest ringed around it |
| `across` | ranks by relationships, left to right |
| `down` | ranks by relationships, top to bottom |

- **`radial` is the shape ranks cannot show.** A hub and its attendants has one rank worth naming
  and everything else equidistant from it, so ranking flattens the very thing that makes it
  legible.
- **`grid` serves a layer that is a collection rather than a system** — things that belong
  together and are not wired to each other, which clustering leaves lumpy and ranking has nothing
  to rank by. Row and column were left out: a row is a grid whose contents fit on one line.
- **Between arrangements the layer rests.** Whatever is placed stays; anything unplaced fills the
  room around it. That is all a render ever runs.

**Which way a layer reads is `none`, `across` or `down`.** It decides which sides a flow
relationship attaches to, and in time how its line is drawn — so it belongs with the other
relationship options rather than with the arrangements.

- **Per layer, not per app.** A pipeline and a hierarchy can sit in one project, and a choice
  about what a diagram *says* is not a display preference: it changes the drawing, enters the
  history, and exports.
- **`none` is the default.** The tool is general first, and most diagrams are not flows.
- **Arranging never changes it.** Laying a layer out as a grid is no reason for it to forget
  which way it reads — under one shared setting it did exactly that, because `grid` was a value
  of the same enum.

**Ranking reads the drag, not the direction.** Relationships are undirected by default, so `dir`
would rank nothing; the source-to-target pair is the only statement of direction most will ever
carry, and it is the way somebody drew it. Cycles stop at the edge that closes them.

**Within a rank, order is a barycentre sweep** — each thing pulled toward the average position of
what it is joined to in the rank before, forward then back. Two passes; it is a heuristic for
fewer crossings, not a solution. What it buys is that a chain comes out on one row, so every line
along it is straight and there is nothing left to want to drag.

**Empty space is a signal, not a margin.** The gap between two things says how related they are,
so spacing is a small set of tiers rather than one constant:

| Between | Space |
|---|---|
| members inside one unit | half a cell — they belong together |
| two of those with a relationship between them | two cells — the line has to fit |
| one unit and the next | two cells |
| one rank and the next | three cells |
| a boundary and its members | half a cell, enough to read as a ring round them |

A reader takes air for *unrelatedness*, so uniform spacing says everything is equally related —
the one thing the drawing should never say. What matters is the **contrast**: tight inside a unit
and open between them, so a group reads as one object at a glance.

**The open space is also where the relationships live.** Lines leave a card, spread, and are told
apart from each other in the gaps; pack things and the lines have nowhere to go but into a knot.
That is why the between-units tier is generous where the within-unit tier is mean — they are
paying for different things.

**Belonging together and being wired together are said differently, and want opposite things.**
Closeness says *these belong together*; a drawn line says *these connect*. So two members of one
group are tight — until there is a relationship between them, at which point they need room for
it. A run leaves each end by a stub, and two stubs are two cells: closer than that and the line
is not squeezed, it is invisible.

That is the one place the spacing rule inverts, and it inverts for a good reason. A gap has to
say something a reader can see, and a gap too small to hold the line says nothing at all.

**A unit is anything laid out as a whole**: a card, a group, or a note. Relationships then draw
units loosely together into **clusters** — a set joined by edges is arranged as one region, and
the layer's arrangement places the clusters. **(planned)**

That is what squares topology with the axis: a cluster's own shape comes from its topology — a
ring drawn as a ring, a chain as a line — while the arrangement decides where clusters sit
relative to each other. A ring has no reading direction, so an axis applied *inside* it means
nothing; applied to where it sits among other things it means everything.

**Rigid in shape, not in size.** What a unit or a cluster holds on to is its *relative
arrangement* — who sits beside whom, on which side. Distances are layout's to set. Each axis is
read on its own, so a row, a column and a diagonal all survive; what does not survive is one
arbitrary set of distances, and near-alignment is tidied into alignment.

The two halves depend on each other. Spacing is a signal at every scale, so the space inside a
cluster has to answer to the same tiers as the space between clusters; that is only possible if
internal distances are layout's. And a shape survives being re-spaced — a ring re-spaced is still
a ring — so nothing is lost by giving them up. Holding exact offsets would freeze one arbitrary
metric and make a hand-arranged group the one place on the canvas where spacing means nothing.

**A group is one unit, and a hard one.**

- A boundary is nothing but its members' bounds, so members strewn across the ranks draw a
  boundary over everything between them, and two groups strewn that way overlap however carefully
  anything else is arranged.
- Ranking cards individually has every reason to interleave them, because what pulls a card into
  place is what it is *joined* to, not what it *belongs* with.
- So a group is contracted to one object and the layer is arranged over those. **Inside a unit,
  members keep their offsets exactly**; only the unit moves.
- **Groups sharing a member are one unit.** The shared card pins them. Their boundaries still
  overlap and compound, which is what overlapping groups do — they simply travel together.
- **A unit is sized to its members plus the room its boundary needs**, or two groups end up with
  their boundaries a hair apart, reading as one.
- The cost is that a group's members no longer respond individually to relationships outside it,
  so those lines run longer. The right trade: a long line is read past, while a boundary drawn
  around the wrong things is read *wrong*, and overlapping boundaries are the one thing here that
  compounds into illegibility.

This does not make a group structural. Layout honouring a group is the opposite — a group *is* a
fact about where things sit, so layout that ignored it was not honouring the group at all.

**Good enough** is: for a layer of thirty nodes, no two blocks overlap, no relationship passes
through a block it does not attach to, and crossings are visibly fewer than straight
point-to-point routing would give.


## Where this is going

*Nothing in this section is built. It is here so that the refactors leading to it are made in
the right direction — see [tasks.md](tasks.md) for what is actually outstanding.*

**The aim is rapid, general concept modelling.** Speed, simplicity and generality come first, and
a special case never overrides them. SysML in particular is supported as a **translation layer**
over the general model, not as a shape the general model bends to: it is cumbersome, and a
looser tool that exports to it serves more people than one built in its image.

That split is already paid for. The engine's element set is closed and the `type` on each element
is open, so a translator maps stereotypes to SysML and changes no engine code.

**Nobody should have to learn a notation to use one.** A person describing a system says what the
parts are, what they are made of, what flows between them and what has to be true — and that is
already the whole base model. The specialised vocabulary and symbols of a standard are a layer
somebody chooses to put on top, not a toll on the way in: the same graph reads as plain blocks and
flows to one person and as a parametric diagram to another, because what changed is the names and
the drawing, never the structure. **A notation that cannot be reached this way is a notation this
tool does not do**, which is a better answer than bending the base model until it can.

### Three parts

| Part | Is |
|---|---|
| **page** | branding, navigation, and the workspace. Owns nothing about a diagram |
| **terminal** | an optional alternate way to give input. Minimises to one line |
| **module** | one graph and the views over it |

**The tree and the canvas are the module.** Everything else wraps around them.

### Two graphs, many views

**There are two fundamental graphs, not one module per notation.** A **structure** graph says what
things there are and how they are composed and connected; a **behavior** graph says what happens,
in what order, under what conditions. Reference is not a third — it is the proxy, which is
orthogonal and works across both.

Walking every SysML notation against the model is what settled this. Block definition, internal
block, package, parametrics and requirements are all the same shape: elements, containment, ports,
binary relationships, fields. Parametrics in particular looked like the hard case and is not one —
a constraint's parameters are interfaces, so a binding connector is an ordinary relationship whose
two ends are interfaces, which `from`/`to` already do. Requirements are elements with an `id` and
a `text` field. Neither needs anything the engine does not have.

**A view is a type vocabulary, a renderer, and a layout law** — nothing else, and it holds no state
of its own. That is the whole difference between an activity diagram and a state machine, which
share their shape and differ in what a node *means*: in an activity, being at a node is doing; in a
state machine, being at a node is being. Duals, not projections of one another, so a project picks
one vocabulary and stays in it.

**A sequence diagram is a behavior graph seen along its edges.** A lifeline is a block's behavioral
edge, an occurrence on it is an interface seated along that edge, a message is a relationship
between two occurrences, and `alt`, `par` and `loop` are the decision, fork and cycle already
there. One thing does not survive: trace assertions — `neg`, `assert`, `critical` — which are
claims about permitted traces rather than behavior, and are expressible as typed groups. Lifeline
left-to-right order is presentation and lives in the view.

**Views are editable, not generated.** People draw sequence diagrams *first*, before any behavior
exists, and a read-only view would make the fastest way to think in a notation unavailable — the
opposite of the goal. So a view publishes gestures and the action surface maps them to mutations;
the graph is still the only thing that holds state. This raises the bar on the action surface,
which now carries the gesture-to-mutation mapping and not merely a list of what a module can do.

### One anchor for every port

**An interface is the general anchor, and every port-like thing in SysML is one.** A proxy port is
an interface typed by an interface definition; a full port is an interface that holds children,
derived exactly the way container-ness is; a pin is an interface on an action typed by a data
definition; a parameter is an interface on a constraint. None of them needs a form, a field, or a
rule of its own.

**`flow` stays decorative at the engine level.** In, out and both are drawn and reasoned about by
nobody: an activity module reads an `in` interface as an input pin, a parametrics module ignores
direction entirely. Enforcing it would hard-code one module's semantics into the engine, which is
the same mistake as branching on user data.

**A data structure is a definition, not a form.** It declares fields with forms, units and
defaults, which is what a data structure *is* — so it costs no element form, never clutters the
tree, and is drawn only where somebody chooses to place a block typed by it. It maps to SysML's
value type: a structure with no identity, as against a block, which is a thing that exists.

### The SysML target

**SysML is a translation layer, and the translation is what proves the model is general enough.**
Every notation it defines was walked against the engine before the schema was frozen, and the
closed sets came through unchanged — five element forms, four relationship forms, five value
forms. The concept-by-concept map lives in [definitions.md](definitions.md) under *The SysML map*;
what belongs here is why the result is worth having.

**A notation costs a vocabulary and a renderer, never an engine change.** Requirements are blocks
with an `id` and a `text` field. Parametrics are constraint blocks whose parameters are interfaces,
so a binding is an ordinary relationship. Activities are blocks and figures joined by flows. State
machines are the same shape with a different sense of what a node means. None of them asked for a
form, a field, or a rule of its own — which is the whole argument for keeping the engine small and
pushing every distinction into definitions.

**The order the targets are worth building in** follows what each one proves:

| | Proves |
|---|---|
| **requirements** | that definitions carry a vocabulary — it needs nothing else, so it fails loudly if they do not work |
| **activity** | figures, and a module drawing what the engine only places |
| **parametrics** | interfaces as the one anchor, since a parameter is a port and a binding is a plain relationship |
| **state machine** | that two vocabularies can share one graph without either bending |
| **sequence** | projections, and editing a view that derives its own arrangement |

**Two things are accepted losses**, both recorded rather than solved: trace assertions keep their
claim as a typed group and lose the enclosing bracket notation, and lifeline order is presentation
that lives in the view.

### The workspace

**A workspace holds several projects, the way an editor holds several folders.** Each is listed
separately in the explorer, in the order it was added, and labelled `<project> [block]` for its
module.

- **Each project belongs to one module, and has its own log, its own export, and its own action
  surface.** No shared history: undo in an activity never reaches a block project.
- **Which project a selected row belongs to is the context**, and the context decides which
  module's actions apply. Positional rather than modal — no toggle, and no ambiguity to resolve.
- The workspace itself — which projects are loaded, and in what order — is a fourth kind of
  state, alongside project data, display preferences, and whatever the terminal has learned.
  None of the four is stored with any other.

### The block tree is the foundation

Other modules hang off it. An activity project has a tree of its own for its own organisation,
and *additionally* references blocks in a block project — so every module is the same shape, and
the block module is special only in being the one everything else points at.

- **A reference is a widened proxy, not a new idea.** A proxy already means "a second appearance
  of a block that lives elsewhere"; elsewhere becomes another *project* as well as another layer,
  and its target becomes a `(project, element)` pair. Nothing else about it changes.
- **Projects never merge, so ids never collide** and nothing is renumbered — which is what makes
  a workspace simpler than importing would have been.
- **References are live, and by id.** Renaming or re-parenting the block behind a proxy flows
  through for free and is not an event.
- **A proxy tolerates a missing target and never records the absence.** It draws as missing and
  the reference survives, so undoing the deletion in the other project brings it back. Logging
  the cleanup instead would make one module's undo unable to cross into another. This is a change
  from today, where `tidy` deletes an orphaned proxy outright.
- **Only deletion is breaking, and only breaking changes are reported.** A rename that raised a
  prompt would train the user to dismiss prompts.
- **Bundling happens at export, not while working.** An activity export carries the external
  blocks it depends on so it stands alone; in the workspace both projects are present and live,
  so there is nothing to bundle and no divergence to reconcile.

### The view is the module seam

**A module is a vocabulary, a set of renderers, a layout law and a gesture map.** Nothing else
varies, because nothing else needs to: every notation walked against the model — requirements,
activity, parametrics, state machines, sequence — asks for **no action and no form the engine does
not already have**. What differs between an activity diagram and a state machine is what a node
means and how it is drawn, and both of those are the view's.

That is the strongest evidence the closed sets are the right size. A set that had been drawn too
small would have shown it here, as a notation that could not be said without widening it.

**A view declares which adjustments it accepts**, and may accept none. A sequence view takes only
one: a column is a lifeline and the axis down it is time, so the sole thing worth dragging is where
an occurrence sits on its own lifeline — which is a seat, the same adjustment a port already has.
Nothing there has a free position. The fewer adjustments a view accepts, the more the engine owns,
which is the direction a general modeller should be moving in.

### The action surface is the input seam

**A module publishes its actions as data** — a name, its arguments, and when it applies — so that
something which was never written against this app can still drive it. That is what the terminal
is, and what a menu built from the selection is: the surface is how input methods talk to a
project, not how modules plug into a page.

**Two tiers, divided by whether a thing can be said.** An action names something somebody meant —
create, relate, group, describe — and is offered everywhere. An **adjustment** is positional and
unsayable: where a card came to rest, how big a note is, where along an edge an interface sits.
Both write mutations and both undo; only actions are named, ranked and listed. **A thing that
cannot be typed as a sentence is not an action**, and the ambition is that adjustments stay rare —
what the engine can decide, it should.

**Arguments are typed, and eligibility falls out of them.** A position cannot come from a
sentence, so an action needing one is reachable only by gesture; an action whose position is
optional is reachable from both, with the layer placing it. Nothing has to be marked as
terminal-eligible, which is what keeps a second list from drifting out of step with the first.

**Eligibility is not ranking.** Two actions can want exactly the same arguments and mean entirely
different things — describing a block and renaming it both take an element and some text. What
separates them is the shape of what was typed: a short noun phrase is a name, a sentence is prose.
So types decide what may be offered and never in what order, which is why ranking is a heuristic
over a learned weight rather than anything the surface declares.

**An action that writes no mutations is navigation.** Going into a layer, coming back out, and
revealing where a proxy's block really lives change what is being looked at and nothing about the
project. One property carries all three consequences: no step is written, there is nothing to
undo, and a text interface never offers it. Nothing has to be flagged.

**Scope is the same question a gesture asks.** What is under the pointer, what is selected in the
tray, and what is selected when somebody types are one question in three phrasings, so they are one
field. It names a form where the distinction matters — dissolving applies to a group, tying to a
note, marking to an interface — and then a single test serves every consumer.

**An action refuses in words.** A name already taken, a node moved inside itself, a proxy for
something already here — each is a sentence the strip can say, not a silent no-op. The same
sentence is what lets a ranked list put an inapplicable action last rather than hiding it.

**The dependency runs one way only.** An input method reads the surface; no module imports
anything from the terminal, and no log records that a terminal exists. The project cannot tell one
input method apart from another.

### The terminal

**One goal: an interactive, context-aware, text interface to the application.** Not a chat, not a
script — a way to say what you want in the words you already have, with the engine doing the
placing and aligning.

**Two functions, kept apart by whether it is open.**

| | Is |
|---|---|
| **collapsed** | the primary text entry point. You type; the rail ranks the actions available right here. It asks nothing |
| **expanded** | guidance. The question worth answering next, a nudge, the documentation for whatever is in front of you, and a live tutorial walking somebody through a diagram of a given kind over a sample project |

They are separated because they serve opposite people: somebody who knows what they want, and
somebody who does not. Mixed together, the first is interrupted and the second is abandoned. One
component, because it is one conversation and one place to look.

**Context is read and never changed.** What the terminal can offer follows from the open layer and
the selection — and navigating is the explorer's job and the pointer's, so no action a text
interface can reach ever opens a layer or moves the selection. Typing a list of names makes
siblings, because nothing selected the last one.

**Finding is a mode, not an action.** Filtering the explorer writes nothing and goes nowhere, so it
is neither. The terminal is one way to drive it; the explorer owns it.

**Words come from the model, not from a vocabulary somebody maintains.** Every label and body in a
project is already embedded, so a definition that says what it is in a sentence is already matched
by whatever words someone reaches for. A list of keywords beside it would be a second mechanism
doing the first one's job, and one that goes stale. Actions earn their own sentence for the same
reason: "lay it out" finds `arrange` through what it does, not through its name.

**Ranking is learned in two tiers**, both local and out of every log. What was typed exactly gets a
remembered default; the *shape* of the situation — an element selected, the words naming something
that already exists — gets a weight. Only the second transfers, because the literal words rarely
come back.

**`Enter` confirms the highlighted option** — highlighted, so that an adaptive default is always
visible and the arrow keys can overrule it before it fires. Overruling it is the feedback.

### Packages and modules

**A package is data; a module is code.** A package is a set of definitions somebody ships — what
things are called plainly, what they are called formally, the fields they carry, how they draw, and
what each maps to in a standard. It costs nothing to add and nobody has to write any. A module is a
view: renderers, a layout law, a gesture map, and the adjustments it accepts. It costs an owner.

**A package maps names and presentation, never structure.** That is the line between the two, and
it is what keeps a mapping a table. The moment a mapping has to rearrange a graph to export it, it
has become a program, and a program living in data is a second engine nobody agreed to build — so
a notation needing structural change is a module, and one needing only vocabulary is a package.

Most of SysML turns out to be the second kind. Requirements is a definition declaring an `id` and a
`text` plus five relationship types, and asks for no renderer, no layout law and no gesture — so it
is not a module at all, which is a sharper way of saying that it proves definitions carry a
vocabulary.

### Rules the notations settled

**A lifeline is a block's behavioral edge, the way its frame is its structural one.** An interface
is a place on a block's boundary where relationships attach — derived until somebody names it, and
seated along that boundary. An occurrence on a lifeline is that same place in time, and so it is
the same thing: an interface. A message is a relationship between two of them, which is the shape a
parametric binding already has. Nothing about a sequence diagram is new — the seats, the promotion
rule and the ordering along an edge all exist, and twenty occurrences stay out of the tree for the
same reason twenty ports do.

**A swimlane is a block whose children belong to it.** A group would have been the closer word, but
a group's bounds are its members' bounds, so an empty one has nothing to draw and no way to be
reached again. A block holds children, draws when empty, and is already the tree.

**Binding to a value promotes it to an interface.** A parametric binding connects a constraint's
parameter to a value property, and a value is a field, which deliberately has no identity for a
relationship to end on. Promotion is the rule that already governs a relationship's seat becoming
a node, and it is what SysML asks for anyway: a value takes part in wiring at the point somebody
says it does.

**Causality is a chain; local order is a seat.** Through a graph, order comes from flows: two steps
with nothing between them are genuinely unordered, and saying otherwise costs a flow somebody has
to draw, which is honest. Down a lifeline it is `at` along an edge, authored the way a port's
position is — because a lifeline *is* an edge, and an edge has always ordered what sits on it.
The two never disagree in storage, because they store different things: a message says which
occurrences are related, and the seat says where one sits on its own lifeline. That a message
should not run backwards in time is a check a view makes, not a second thing written down.

### Nomenclature

**The first word is the module, the second is the thing:** block tree, block diagram, activity
diagram, activity explorer. **`block` stays the name of the element itself, in every module** —
an activity diagram is built from blocks too, which is why the qualifier is load-bearing rather
than decorative, and why a project's row carries its module in brackets.
