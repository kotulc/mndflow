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

**Three ideas carry most of the weight:**

- **Derived beats stored.** Anything that can be worked out from the layer is worked out — seats,
  routes, boundaries, roles. Only choices are written down.
- **A hand-laid thing is a hard constraint; a derived one is not.** What somebody placed or
  declared is honoured; everything else is the layer's to arrange. This is the rule the whole
  layout model rests on.
- **The log is the truth.** The graph is folded from it, so undo needs no inverses.


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

- **Structural** — nodes, and only nodes. Structure is what the explorer shows: what contains
  what.
- **Non-structural** — attributes. They describe nodes, never appear in the explorer, and never
  change what contains what.
- **Annotations** — attributes that draw on the canvas. A **group** draws as a boundary round its
  holders; a **note** draws as a card of text pointing at them. Nothing is both.


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
- Both are ways a block *looks*, so both stay out of the element type. Naming them there would
  make a closed engine-level set answer to something that changes the moment a child is added.

**A user's subtypes go in `type` and never in `element`.** A template subtypes within an element
type rather than across one, which is what keeps the closed set closed and stops every rule
having to branch on user data.

**Anything joining two elements is a relationship.** A kind may draw as something other than a
routed line — a tie is a leader — but drawing is not identity. The alternative was a second way
to join things, with its own mutations, its own cascade and its own list, all shadowing what
relationships already do.

**A reference is derived, not a kind.** A relationship is one when a proxy sits at either end, so
drawing a line onto a proxy makes a reference without anybody choosing it — and it stays plain,
flow or assoc in its own right, because reaching another layer says nothing about what the
relationship *means*. Spending a kind on it would have made the two mutually exclusive, and would
have asked the user to declare something the graph already knows.

**What a proxy stands for is an attribute of the proxy.** One thing appearing twice is a property
of the appearance, not two things being joined — so it is not a relationship, and the references
are the ordinary relationships that *reach* the proxy.

The test for which of the two something is: **drawn as a line between two things → a
relationship; not a line → an attribute.** A tie is a line, so it is one. Membership is not, so
it is not.

**Containment is the exception, and stays `parent`.** The tree is the one join every element has
exactly one of, so storing it as edges would mean guarding an invariant that a field enforces for
free.

### Root

**The project is a block.** It holds every other, carries the project's name, axis, body and
attributes, and is otherwise ordinary. Before this it was not an element at all, which meant the
project's name and axis lived on the graph as one-off fields and the panel had a case for
"selection with nothing to carry an attribute".

**It has no frame, because a frame is a block seen from inside and root has no outside.** For the
same reason it has no interfaces: there is nothing beyond it for one to face.

`parent: null` still means "in the root layer" wherever it is written, and root is told from its
own children by its reserved id. One exclusion, in one accessor — the alternative reparented
every top-level element and rewrote every place that asks which layer is open.

**Interface is the one role that does not change.** A node is created as one or it is not. A
block never steps onto a border and an interface never steps off, because a drag that could
silently convert between them makes every ordinary move a hazard.

**A container draws a treemap of its immediate child blocks.**

- **The band is divided by a fixed pattern, not by measurement**, so a container of a given size
  always divides the same way. Cells come out square, wide and tall against each other, so the
  division reads as a shape rather than a row of equal boxes.
- **Nine chips is the cap.** Past that the cells are too small to tell apart, and a card is a
  summary rather than a list. The tenth slot reads `...` and opens the container, which is where
  the rest are anyway.
- **Fill shade carries relevance** — how closely a child's name relates to the container's — so
  one that has drifted off topic looks ragged. Size says nothing about it; the packing is fixed.
- **A name shrinks to fit and hides when even the floor will not fit.** A name in a sliver of a
  cell is not a name; the partition still reads without it, and hover names every cell.
- **Nesting stops at the first layer.** Following it further turns a deep container into a
  texture where nothing is legible.
- **A container is barely bigger than a block.** It does not swell with what it holds — the cells
  shrink instead. Cards that grow with their contents turn a busy layer into a wall of boxes and
  repeat what the treemap already says.
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
  anywhere: a card's, a boundary's, the layer's frame, a relationship's kind, and a row in the
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

**A kind says what the ends *are*; `dir` says which way it points.** Three kinds:

| Kind | Ends | Draws |
|---|---|---|
| `untyped` | wherever the path wants | plain |
| `flow` | in and out, on the sides the layer's axis gives | heavier |
| `assoc` | wherever the path wants | thinner, fainter |

The two stay separate because an arrowhead decorates the line while the kind decides where it
*attaches* — folded together, setting a direction would silently move both ends. A *parallel*
kind was dropped: once lanes exist, relationships arriving together are drawn together already,
and a kind describing what the renderer can see is a setting with nothing behind it.

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


### Attributes

A descriptive value on an element or relationship, carrying a name, value and tags. Attributes
are non-structural throughout.

**An attribute has no identity of its own.** It is addressed by its name on the thing carrying
it, and setting that name again rewrites it. Sharing used to be what made an attribute a
grouping, which gave every descriptive value an id, a holder list and a lifecycle in order to
serve the one case that needed them.

**Membership is an attribute, held on the member.** A block names the groups it is in, and a
group's member list is derived by asking who names it — so there is nothing to keep in step.
Membership is not a relationship, because a group draws a boundary round its members rather than
a line to each.

**Groups** are elements, drawn as a boundary.

- **A boundary is its members' bounds plus a small margin**, so it expands and contracts as they
  move. Its size is a fact about what it holds, never something set.
- Clicking its background selects it; dragging a selected boundary moves every member as one
  action.
- **Membership is a drag, the way a container's is** — a group should behave like the thing it
  looks like.
- **What decides is the card's own middle, against the boundary drawn from the members standing
  still.** Measured against all of them a card could never leave — it would take the boundary
  with it.
- **A whole group moved together stays together.** Nothing is standing still to measure against.
- **Dropping *on* a card is a move into that card**, not a join: that gesture is spoken for, and
  it is structural, so it wins.
- **A node made inside a boundary joins it**, by the same test a drop there passes.
- Boundaries overlap freely and their backgrounds compound, so the overlap is legible with no
  special handling.
- **No appearance of its own to set.** One faint dashed line for every group, so a canvas of them
  reads as one kind of thing rather than as a palette.

**A group of one is allowed; a group that falls to one is not.** Two different events, and only
one was asked for. Grouping a single block is a deliberate act with an obvious meaning. A group
*decaying* to one is what is left after dragging cards out, and a boundary hugging the last says
nothing that card does not. The collapse happens where the member leaves, because by the time the
fold sees the graph the two cases are identical.

The cost — a deliberate one-member group is not permanent — is accepted. Solving it means
recording *why* a group has the members it has, which is a fact about intent, wrong as often as
right, and nothing else in the model carries it.

**None of this makes a group structural.** No parent changes and the explorer never shows one.
What is inside a boundary is a fact about where things sit, not about what contains what.


### Notes

The other way an attribute draws: a card of text tied by dotted leaders to whatever it describes.
Where a boundary says *these belong together*, a note says something in words.

- **It is an attribute, not a node.** A note describes; it does not participate. As a node it
  would enter the explorer, take nesting, take interfaces, and turn its leaders into
  relationships — every one of which is wrong.
- **A place is the one thing it needs that no other attribute does.** A group is positioned by its
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
- **Amber throughout.** Green is structure and amber is attributes; a note is where that half of
  the palette gets used.
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
- As a layer crowds, the user clusters into **groups** (an attribute, no structural change) or
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


### Attribute panel

One panel below the canvas, with one state per selection. The **scope always exists** — the root
is a scope like any other — so its resting state is the scope's own attributes rather than an edge
case. Selecting on the canvas replaces that with the selection's.

A node's body text is edited here. There is no separate document pane.


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

- **Top-right — relationships.** Whether interfaces are drawn, what kind a right drag creates,
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
- **Right-clicking a relationship writes its name.** A kind does not exist until somebody writes
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

**The third is judged by proxy, never by routing.** The pipeline runs one way — relation kind,
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

Generation of common diagram types — activity, class, state, flow — for a given scope, and
translation of the project to SysML exports. Interfaces are why the second is coherent.

A deeply nested sample project ships alongside, describing this application's own components,
interfaces and data structures, and exercising every feature in the spec.
