# Design

Why mndflow is the way it is. Every rule here carries the reasoning that produced it, and the
alternative it was chosen over — so that changing one's mind means arguing with a recorded
position rather than guessing at one.

- **What each part does, in short** → [spec.md](spec.md).
- **What is missing, and what is undecided** → [tasks.md](tasks.md).

mndflow's primary purpose is to enable rapid construction and composition of descriptive
visual building blocks for systems modeling tasks.

The goal of mndflow's client-only web application is to support fluid and engaging assembly
of complex systems starting from simple descriptive "building block" type elements. Visual
scope is constantly constrained to prevent overwhelming the user with too much information.

The tool stays general on purpose. Hard rules are kept to the few that prevent an incoherent
project — a node cannot contain itself — and nothing else is forbidden merely because it is
unusual. Where a choice could be enforced or left to the user, it is left to the user.


## Concepts

### Vocabulary

Two distinctions carry most of the weight:

- **Structural** — nodes, and only nodes. Structure is what the object explorer shows: what
  contains what. A **container** is simply a node that has children; there is no container
  type to set.
- **Non-structural** — attributes. Some of them are **annotations**, meaning they draw on the
  canvas: a **group** is one drawn as a boundary round its holders, a **note** is one drawn as a
  card of text pointing at them. All of them describe nodes, and none of them appears in the
  explorer or changes what contains what.

The code follows this now: `isContainer` is the predicate, and the boundary is `GroupFrame`.
One leftover — the boundary's CSS class is still `.region`, from when the annotation was
called that.


### Nodes

The primary object, and the only structural one. A node has children, interfaces,
relationships, and attributes.

A node's **role** is derived from what it holds and where it sits, never declared:

- a node attached to its parent's frame edge is an **interface**;
- any other node is a **block**, and a block holding one or more child blocks is a
  **container**.

Interfaces do not count towards being a container. A block with interfaces and no child
blocks is still a block and draws as one. The two are independent — a node may freely have
both, and each draws without affecting the other.

Role determines only how the node draws, and every node shares the same operations. A block
becomes a container simply by gaining a child block, and stops being one by losing them —
that role is a running tally of what it holds.

**Interface is the one role that does not change.** A node is created as an interface or it
is not, and it stays whichever it was: a block never steps onto a border to become one, and
an interface never steps off to become a block. That is the exception to "role is derived",
and it is deliberate — an interface belongs to a border in a way a block does not, and a
drag that could silently convert between them made every ordinary move a hazard.

**Blocks** — simple rectangles. All nodes (blocks included) can be nested, unnested, grouped,
ungrouped, annotated, related, interfaced, referenced, and given descriptive attributes.

**Containers** — an internal treemap of their child blocks. Interfaces are never in it; they
sit on the frame edge, and a container draws both at once.

**The band is divided by a fixed pattern**, not by measurement. The unit is 1|2 — one large
cell on the left, two stacked on the right — or two wide rows when there are only two. One
such unit fills the band for up to three children; two sit as columns for up to six; three
tile as left | top-right / bottom-right for up to nine. Cells come out square, wide and tall
against each other, so the division reads as a shape rather than as a row of equal boxes, and
a container of the same size always divides the same way.

**Nine chips is the cap.** At ten or more, eight are drawn and the last slot reads `...` for
the rest; clicking it opens the container, which is where the rest of them are anyway. Past
that count the cells are too small to tell apart, and a card is a summary rather than a list.

**Relevance is carried by the fill.** Each cell's shade follows how closely that child's name
relates to the container's, so one that has drifted off topic looks ragged rather than reading
as tidy. Size says nothing about relevance — the packing is fixed, and the shade is where the
question is answered.

**A name shrinks to fit its cell, and hides when even the floor will not fit.** A name in a
sliver of a cell is not a name; the partition still reads without it, and every cell names
itself on hover.

**Nesting stops at the first layer.** A child that is itself a container is marked as one and
no further — no miniature of *its* children. Following it down turned a deep container into a
texture, where nothing is legible and the shape says nothing at all.

**A container is barely bigger than a block** — room for the treemap under its name, and no
more. It does not swell with what it holds: the cells shrink instead. A card that grows with
its contents turns a busy layer into a wall of large boxes, and says a second time what the
treemap inside it is already saying.

Nor does it need a dashed border. The treemap is signal enough, and the dashes are worth more
elsewhere: a **reference** is dashed, and with containers solid that mark now means one thing
only — this is not from here.


### Interfaces

An interface is a child node attached to its parent's frame edge, and it is where a
relationship attaches. This is what makes the SysML export target (see Where this is going) coherent —
SysML wants typed blocks and ports, and an interface is the port.

An interface draws as a small square on the frame edge, **filled when a relationship attaches
to it and open when none does**. Most are made by a relationship and are filled from the moment
they exist; an open one is either a port somebody described before wiring it, or one left
standing when the relationship that made it went. That is a difference worth a glance — a shape
being described, against a shape being connected — and it costs the port nothing to say it.

**Its name shows beside it only on the layer's own frame** — the one you have stepped inside. A card's interfaces are marks on
a shape you are looking *at* from across the layer, and labelling every one of them buries the
card; there the name comes on hover or selection. An interface holding child blocks of its own
draws instead as a divided square,
in the shape of Bootstrap Icons' `grid-1x2` or `columns-gap`, so a port with internals reads
differently from a plain one without opening it. An interface holding only other interfaces
gets no special mark — the divided square means child blocks specifically.

**A relationship has two interfaces, one at each end.** That is the rule the rest of this
follows from. Drawing a relationship makes them both, deleting it takes them both away, and a
relationship that has never been given either is still understood to have them — they are
simply implied at the sides of the two cards facing each other, rather than written down.

So there is never a question of whether an end has an interface. It has one. The only
questions are whether it has been *placed* anywhere in particular and whether it is currently
*drawn*, and neither of those changes what the relationship means.

**Where they come from.** A node starts with none. Nothing sits on a fresh block's edge until
there is a reason for it to be there, and a relationship is the usual reason.

- **Right-click-dragging draws a relationship, and makes an interface at each end.** The near
  one is placed where the drag started, on the border of the node it left. The far one is
  placed where the drag was let go: released over a border, the interface sits at that point
  on it; released anywhere else on a card, at the nearest point of the card's border.
  Released over an interface that already exists, that one is used and no new one is made.
  Nothing appears until the drag has pulled a small margin clear of the edge, so a right-click
  that wanders by a pixel is still a right-click.
- **Released over empty canvas**, the far node is created as well, and given its interface on
  the side facing back the way the drag came, so the line between them runs straight.
- **Right-clicking a node creates a bare one**, with no relationship attached, at the nearest
  point of its border to the click. This is the one way to get an interface on its own, and it
  is there because a node's shape is worth describing before its connections are. Right-clicking
  an interface that already exists makes nothing: there is one there.

A relationship made any other way — from a chip, or by a workflow — leaves both its
interfaces implied, because there was no gesture to take a position from.

**And where they go.** Deleting a relationship deletes the interfaces at both its ends, so
rewiring a diagram leaves no trail of empty squares behind it. Two things are never
collateral: an interface another relationship still attaches to stays, and an interface with
contents of its own is left standing, bare, rather than taking what is inside it with it.

**Selecting and moving.** An interface selects like anything else — click to highlight it —
and it **slides under a left drag whether or not it was selected first**, along its edge and
around corners. One gesture, no first click to spend: a port is a small target the pointer
reports precisely, so a drag that begins on one can only have meant the port. That is what
separates it from a group boundary, which is a large transparent area a drag could easily begin
in by accident, and so still has to be selected before it moves.

It stays on the border however far the drag goes — sliding is the only thing the gesture does.
Left-dragging is never how a relationship is drawn either; that is the right button's job, here
and at the frame edge, so moving a port and wiring one are never the same gesture.

**Naming.** An interface with no name of its own is called `interface 1`, `interface 2`, and
so on — its number among the interfaces of the node it sits on, in the order they were made.

Numbered rather than all sharing one word, because a relationship now puts an interface at
each of its ends and a node soon has several; five rows in the explorer all reading
"interface" name nothing. The count is per parent, since that is where the names are seen
together — two nodes each having an `interface 1` is no more a clash than two folders each
holding a `notes`.

**The number is fixed when the interface is made, and nothing renames it afterwards.** A new
one takes the lowest number its parent is not already using, so deleting `interface 2` leaves a
gap and the next interface made fills it.

Numbers on a node that has been rewired are therefore not always consecutive, which is the
lesser of the two costs. The alternative — numbering by position, so a deletion closes the gap
and everything after it shifts down — renames interfaces nobody touched, and a port's name is
what a relationship, a diagram and a reader all refer to it by. A name given replaces the
number entirely, and anything wanting a name that means something is given one.

**Visibility.** Interfaces render on the canvas by default, and can be toggled off for a
cleaner read of the structure alone. Nothing about the relationships changes when they are
hidden: **a hidden interface leaves its seat behind**, and the lines still meet the border at
exactly the point the square sat at. A display preference decides what is drawn, never where
anything is — and lines that swung to the middle of a side as the toggle went off, and back as
it went on, made a change of view look like a change to the diagram.

**A seat shows itself as a small round handle when its relationship or its node is selected.**
Hidden means quiet, not gone: having selected a line, you should be able to see where its two
ends are tied on without turning every square on the layer back on to find out. Selecting a
card shows the seats of all of its own. Nothing else draws them.

The object explorer is the other way round: interfaces are hidden there by default, and a
toggle reveals them.

Both toggles are global to the app, not per project and not per view. They are display
preferences: they change nothing in the project, appear in no export, and record no history.

**Export.** An interface a relationship implied — never placed anywhere in particular, and
never named, marked, given contents or given attributes — is not exported. The relationship
re-derives it on load, so writing it down would only repeat what the relationship already
says. Every other interface is exported like any other node, including every one a drawn
relationship placed: a position somebody chose is worth keeping.

**State an interface carries beyond an ordinary node:**

| Field | Meaning |
|---|---|
| `side` | which frame edge it sits on — top, right, bottom, or left |
| `at` | how far along that edge, 0–1, so it survives its parent's frame resizing |
| `num` | its number among its parent's interfaces, for the name it falls back to |
| `flow` | optional, decorative: marks the interface as input, output, or both |

`side` and `at` replace the absolute x/y an ordinary node carries; an interface's position is
meaningless apart from its frame. They are set when it is created and changed only by sliding
it, and `side` is never cleared — an interface that came off its border would be a block, and
nothing turns one into the other.

`num` is set once, at creation, and never changes — see Naming above. It is stored rather than
counted precisely so that it cannot be changed by something happening to another interface.

`flow` is **decorative only**. It changes how the interface draws and nothing else — any
interface may be either end of any relationship, whatever it is marked as. Default interfaces
carry no marking at all. Direction belongs to the relationship, not to what it attaches to,
and marking an interface is a note to the reader rather than a constraint on the model.


### Naming

**A name is written the way it was typed, and the same way everywhere.** The explorer, a card,
the layer's frame, the breadcrumb trail and the attribute panel all show one spelling and one
case. Nothing lower-cases or capitalises a name on its way to being drawn: two views of the
same object that disagree about its name read as two objects.

The only names not typed by anyone are the role words an unnamed thing falls back to —
`block`, `container`, `interface 3` — and those are lower case because they are descriptions
rather than names. Giving something a name replaces the description entirely.

**A name is edited where it is drawn, and right-clicking it is how.** One rule for every name
on the canvas — a card's, a group boundary's, the layer's own frame. `Enter` commits, `Esc`
abandons, and clicking away commits.

This replaced three rules and a timer. Renaming used to be the *second* click on something
already selected, so that a click meant only to select still only selected; a card's editor
then had to wait a quarter of a second to see whether a second click was coming, because a
double-click there descends instead. Three elements, three behaviours, and the most ordinary
edit in the tool felt like it had not registered.

The right button already means *make the thing this place is for*, and what a name is for is
being written. So the rename gesture is no longer an exception threaded between select and
descend — it is the same rule as everything else the button does, and it collides with nothing,
because a name is the one place on the canvas where creating a node or an interface would be
meaningless.

**A name is its own target.** It is drawn set into a border — the frame's, the boundary's — but
it is not that border: it highlights on its own and the border stays dark under it. A name is
where you rename, and nothing else happens there.

The explorer renames on double-click, as a file tree does. Neither replaces the other: you
rename a thing where you are looking at it.


### Relationships

An edge represents a relationship between two nodes. Relationships may be typed, annotated,
labeled, and given a direction.

**A relationship joins two nodes and anchors at an interface on each.** The two ends are
*nodes*; the interfaces are only where the line meets them. That separation is what lets an
interface be moved, hidden or renamed without any of it meaning something different.

**An interface is the one thing drawn on both sides of a boundary.** It belongs to a node, and
it appears on that node's card when you are looking at the layer the node sits in, and on the
frame when you have stepped inside the node. So a relationship reaching it from outside and one
reaching it from inside are two separate relationships, each with both ends in one layer, joined
by the one interface they share. Neither side knows about the other, which is the point:
external wiring and internal wiring are independent, and the interface is the coupling.

This falls out with no special handling. `Client → Gateway`, anchored at `Gateway`'s `HTTP`
interface, is drawn in the layer they share. `Router → Gateway`, anchored at the same `HTTP`,
is drawn inside `Gateway`, where `Router` is a child and `Gateway` is the frame. One interface,
two relationships, two layers, and nothing crossing between them.

**A relationship is not obliged to go through an interface, or to stay in one layer.** That
would be modelling hardware, where a signal really does have to cross a boundary at a connector.
Code does not work that way — one module refers to a name in another without anything at the
edge of either declaring it — and this tool has to describe both. So a relationship may join any
two nodes anywhere in the project, and an interface is where the line lands rather than a gate it
has to pass.

A relationship whose two ends are in different layers is simply not drawn until somebody asks for
it, which is what a reference is for.

**Relationships are undirected by default** — a plain line, no arrowhead, asserting only that
the two ends are related. Direction is added deliberately, through the relationship's context
menu or the attribute panel: one way, the other way, or both.

Relationships are created by right-click-dragging, from an existing interface or from anywhere
on a node, and they end up with an interface at each end either way — see Interfaces above for
where each one lands. `Esc` cancels the whole gesture, interfaces included.

**A line is routed by dragging its segments.** Drawn with right angles, a relationship is a run
of square segments between its two interfaces, and **every one of them is draggable**. Each
moves in the one direction that means anything — a vertical segment left and right, a
horizontal one up and down — and the corners either side follow, so the line stays square
throughout. Sliding a segment along its own length would change nothing, and is not offered.

**The segments at the two ends carry their interface with them.** The run leaving an interface
is square to the edge it sits on, so moving that run means moving the interface: it slides along
its frame edge exactly as a hand-dragged one does, and the same `set_port` records it. That is
the answer to what would otherwise be the awkward case — a line detaching from the port it is
tied to — and it is also what you want, since a line that will not go where it is wanted is
usually saying the port is in the wrong place.

**Where the interface cannot follow, a jog appears.** It stops at the end of its edge, and two
new segments carry the drag the rest of the way: out from the interface, across to where the
pointer asked, and on. The same happens at once for an end whose interface is only implied, or
whose frame is in another layer and stood in for by a reference — there is nothing there to
slide, so the line bends instead of the port moving.

Dragging the line, moving the port and adding the jog are all one action and one entry in the
history, because they were one gesture.

**Every elbow is a right angle, always.** That is not a thing the router tries for and mostly
achieves — it is a property the whole run is put through on its way to being drawn, whatever it
came from: the plain route, a route dragged into shape, or one saved before its cards and its
interfaces were moved about. Where two corners are off in both directions a corner goes between
them, and where a run would leave or arrive across its frame edge rather than along it, it
stands off the edge and turns. A relationship never has a diagonal in it.

**And a line straightens when it is nearly straight.** A segment dragged to within a few units
of level with one of the ends is taken to mean level with it, so straightening a line is a drag
in roughly the right place rather than a hunt for the exact pixel. A route left with nothing to
say — every corner in line with the rest — stops being a route at all, and the line goes back
to being drawn like any other.

**What can be dragged says so.** The segment under the pointer marks itself and carries the
resize cursor for the way it moves; selecting the line shows all of its segments faintly at
once, which is the answer to "what of this can I take hold of".

**A route belongs to the layer it was laid out in.** Almost every relationship is drawn in one
layer only, so almost every route has nowhere else to be — but a relationship reaching through
a reference can be drawn in two, and the two layers place their nodes independently, so one set
of corners cannot be right in both. Drawn anywhere but where it was dragged, a line routes
itself.

**A route is the user's, and only the user's.** Layout never touches one, and a relationship has
no route of its own until somebody drags a segment. Until then the canvas runs the line out from
each interface and across between them — a plain route, deliberately, because every segment of
it can be corrected in a second and a router that has to be clever is one nobody can predict.

**A line that has been routed stays angular whatever the curve/angles toggle says**, the same
precedence a node's own placement has over automatic layout. The toggle decides only how the
rest are drawn.

**A curved line is routed the same way as any other.** It has no segments of its own, so
hovering one shows the run it would take if it had them, and taking hold of a segment makes
that the route — the line becomes angular as it is dragged. Routing is a property of the
relationship and the toggle is a display preference, so waiting on the toggle would have made
the gesture unavailable on most of the canvas for no reason anybody could see.

**A saved route keeps following its interfaces.** The runs at its ends stay tied to them as
they slide and as their cards move, while the corners between them stay where they were put.
Moved to another edge of its frame, an interface leaves the other way entirely — and rather
than bend the corner it reaches, which would leave the line with an angle that is not square,
the route gains a corner to take the turn. What was drawn by hand is kept; only the way in and
out of it is worked out again.

**References.** A relationship between two nodes in different layers is drawn in either of
them through a **reference**: a placeholder standing in for the far node, sitting in this layer
as an ordinary node.

**It is a visual shortcut, and that is the whole of it.** Something living in a distant layer or
another branch relates to something here, and rather than making the reader hold two places in
their head at once, the far thing is drawn here as a mention. It changes nothing about the
relationship — the relationship was already there against both real nodes, whether or not
anybody had asked to see it.

A reference is a node. It sits inside the frame with everything else, it is selected, moved,
nested, related, given interfaces and given attributes exactly as any other node is. What
marks it out is only how it draws — greyed and hatched, so it reads as a mention of something
rather than the thing itself — and that **a relationship reaching it draws in its own colour**,
violet rather than green and dashed rather than solid, since one of its ends is a mention and
what it says about the graph is weaker than what a line between two present nodes says.

The colour is doing real work. A reference relationship used to be drawn in the same dark green
as every other line, dashed, at three-quarters opacity, which on this background was
indistinguishable from an ordinary one. A line that reaches out of the layer is the one kind of
line whose reading depends on knowing that it does.

**It has no name of its own.** It shows whatever the node it stands for is called, and renaming
it renames that node: there is one object being named, however many places it appears.

**It has no inside of its own.** Whatever is in the node it stands for is in the node it
stands for. Double-clicking a reference therefore goes to where that node actually lives and
marks it there, rather than opening an empty layer. Nothing nests into a reference, and a
reference never becomes an interface — a mention is not structure.

**And it points at a real node, never at another mention.** There is one way to make a
reference — dragging a row out of the object explorer — and the explorer does not list
references, so a chain of them cannot be built. The code used to follow up to eight hops and
give up, guarding a state nothing could produce.

**Where they come from.** Only from the user, and chiefly from one gesture: **dragging a row
out of the object explorer onto the canvas** places a reference to that node in the open
layer. Dragging a chip out of a container's treemap still *moves* that node — one gesture is a
mention of something, the other is the thing itself.

Once a reference is there, **right-click-dragging onto it** relates to the node it stands for,
like relating to anything else on the canvas.

**Nothing places one on its own.** A relationship whose far end has no reference in this layer
is simply not drawn here, and that is the point rather than a gap. **A diagram is not an
enumeration.** The tool is for saying which relationships matter in a given layer, not for
showing every one that happens to exist — a layer that placed a reference for everything
anything in it touches would answer a question nobody asked. A relationship is not lost by
going undrawn: it is still in the graph, still there against both its ends, and it appears the
moment someone decides the far node belongs on this canvas.

**Deleting one removes the placeholder only.** The node it stood for is untouched, and the
relationships that reached it are still there; they stop being drawn in this layer, and come
back if the reference does.

**The explorer never lists them.** The tree is structure, and a reference is a second
appearance of something already in it.


### Attributes

A descriptive value or property, attached to a node or a relationship. Every attribute can
carry a name, a label, and tags. An attribute may be held by one object or **shared** across
many — sharing is what makes an attribute a grouping.

Attributes are non-structural. They never appear in the object explorer and never change what
contains what. Every attribute of the current scope or the current selection appears in the
attribute panel below the canvas.

Some attributes also draw on the canvas, as **annotations**. There are two ways one draws, and
nothing is both: a **boundary** around its holders — a group — or a **note** pointing at them.

**Groups** are the shared-attribute case drawn as a boundary. When nodes on the same canvas are
grouped, they receive a shared attribute, and its annotation is a semi-transparent background
surrounding all of them. Like any attribute it can be named, labeled, and tagged.

A group is not a structural element and not an object in its own right — it is one attribute
that several nodes have in common. Group membership is listed among a node's attributes in
the attribute panel, and that is where a node is added to or removed from a group.

The boundary follows its members and nothing else:

- It is derived from the bounds of its members plus a small margin — the same margin logic the
  canvas frame uses — so it expands and contracts as they move. **There is no manual resize.**
- Clicking the boundary's background selects the group and highlights it. Dragging a selected
  group's background then moves every member together: one user action, one entry in the
  history, however many positions it changed.
- Selecting the group and selecting elements are separate gestures. A selection box drawn from
  inside a boundary is an ordinary selection box — it takes the elements it fully contains and
  never sweeps in the group itself.
- Deleting a member, or moving it to another scope, drops it from the group and the boundary
  re-fits; when that would leave a single member, the attribute is removed altogether rather
  than left drawn around one node.
- A node may hold any number of group attributes, so boundaries overlap freely. Overlapping
  backgrounds compound, so an area covered by several groups reads denser than one covered by
  a single group, and the overlap is legible without any special handling.

**Membership is a drag, the way a container's is.** Drop a card inside a boundary and it
joins; take it out and it leaves. A group should behave like the thing it looks like, and it
looks like something you can put things into.

- **What decides is the card's own middle**, against the boundary drawn from the members that
  are *standing still*. A member helps define the boundary it sits in, so measured against all
  of them a card could never be dragged far enough to leave — it would take the boundary with
  it. Against the ones that are not moving, joining and leaving are the same test read in
  opposite directions.
- **A whole group moved together stays together.** When every member is on the move there is
  nothing to measure against and nothing to measure: the group is travelling, not being left.
- **Dropping *on* a card is a move into that card**, not a join — that gesture is already
  spoken for, and it is structural, so it wins. Joining is what dropping in the clear space
  inside a boundary means. A tight group has little such space, which is the honest
  consequence of a boundary being nothing but its members.
- Landing in or out of a boundary is part of the same action as the move, so one undo takes
  back both.
- **A node made inside a boundary joins it**, by the same test a drop there passes. Right-click
  is how a node is made, and making one in the clear space inside a group plainly means it
  belongs there; leaving it out would draw a node sitting visibly inside a group it is not in.
- The attribute panel still lists membership and still adds and removes it. Dragging is the
  quick way, not the only way.

**None of this makes a group structural.** No node's parent changes, the object explorer still
never shows it, and what is inside the boundary is a fact about where things sit rather than
about what contains what. That is the whole difference between a group and a container, and it
survives them sharing a gesture.

**The boundary has no appearance of its own to set.** One faint dashed line, the same for every
group, so a canvas of them reads as one kind of thing rather than as a palette. It brightens
when the pointer is inside it, again when selected, and again when a card is over it and would
join. Colour, custom content and the
rest come later; until they do there is nothing in the panel to set, because there is nothing
to set.

**A group of one is allowed, and a group that falls to one is not.** These look contradictory
and are not: they are two different events, and only one of them was asked for.

Grouping a single block is a deliberate act with an obvious meaning — draw a ring round this
one, mark it, set it apart. Nothing else in the tool does that, and refusing it on the grounds
that a group is "for several things" was arithmetic standing in for judgement. So `Ctrl`/`Cmd` +
`G` groups whatever is selected, one card included.

A group *decaying* to one is not a request at all. It is what is left after dragging cards out
of a set, and a boundary hugging the last one says nothing that card does not already say. So it
goes, and the collapse happens **where the member leaves** — in the action that takes it out —
rather than in the fold. The fold cannot tell the two cases apart: by the time it sees the
graph, a group made around one block and a group worn down to one are the same three fields. It
keeps only the floor, sweeping up a group holding nobody.

The cost is that a deliberate one-member group is not permanent: give it a second member, take
that member away again, and it goes. This is accepted rather than solved. Solving it means
recording *why* the group has the members it has, and that is a fact about the user's intent —
the sort of thing that is wrong as often as it is right, and that nothing else in the model
carries. A cheap re-grouping is a better answer than an expensive memory.

**Its name is edited on the canvas**, on the boundary itself — see Naming above.

### Notes

A **note** is the other way an attribute draws: a small card of text sitting in a layer, tied by
faint dotted leaders to whatever it describes. Where a boundary says *these belong together*, a
note says something in words, about anything or about nothing in particular.

**It is an attribute, not a node.** A note describes; it does not participate. Making it a node
would put it in the object explorer, let things nest inside it, give it interfaces, and make the
lines out of it relationships — every one of which is wrong, and none of which would be worth
suppressing case by case. Attributes already have holders, already stay out of the explorer, and
already never change what contains what. A note is one with a place.

**A place is the one thing it needs that no other attribute does.** A group is positioned by its
members, so it stores nothing. A note can be tied to nothing at all — that is the point of being
able to draw one on empty canvas — so there is nothing else to place it by. It therefore carries
the layer it was drawn in as well as its coordinates, which also answers where it belongs: to
the layer it was drawn in, not to whatever it happens to overlap. It stays there when its ties
go, and goes when that layer does.

**The drag that makes one is a gesture, not a measurement.** Right-dragging the background makes
a note in the top-left corner of the rectangle swept out; the rest of the rectangle is
discarded. This looks wasteful and is deliberate. A note is sized by what it says, exactly as a
boundary is sized by its members, so **there is still no manual resize anywhere on the canvas** —
the rule survives the first object that could have broken it. Honouring the rectangle would have
introduced stored bounds, a resize gesture, handles to grab, and a second thing that can
disagree with its contents.

**The rectangle is drawn while it is being swept**, in amber and dashed. This replaces drawing
nothing at all, which was argued for on the grounds that a rectangle the tool will not honour is
a promise it does not intend to keep. That was the wrong thing to protect. The gesture needs to
be visible *as a gesture* — a right drag on the background is otherwise indistinguishable from a
right click that has not finished, with no way to tell it is under way or where it will land.
Colour is what keeps the promise honest: amber says a note is coming, and cannot be mistaken for
the green box the left button draws in the same place for a completely different purpose. The
note appearing at the rectangle's top-left is the other half — the box says where, even though
it does not say how big.

The drag is still the right gesture, because the right button's rule is that a click makes a
point-thing and a drag makes an extent-thing. A note has extent; a node does not. That the
extent is decided by the text rather than by the drag is a separate question from which button
made it.

**The note is its text, all the way through.** No head, no border zone, nothing else on it to
aim at — so it takes the same rule every name on the canvas takes: right-click to write it.
Unwritten it reads `note`, the way an unnamed block reads `block`.

That costs one gesture: a right drag cannot set off *from* a note, because the whole of it is a
name and names start nothing. So ties are made the other way — **right-drag from a node onto a
note**, which is the same "connect this to that" gesture that draws a relationship, ending
somewhere that is not a node. Over a node already tied, the same gesture unties: dragging onto
something already connected can only mean undoing it.

**A leader is not a relationship.** It takes no pointer, cannot be selected, cannot be routed by
hand, and appears in no export as an edge — it is a drawing of an attribute's holders, and the
holder list is where it actually lives. Dotted and thin, where a reference's line is dashed and
violet: both say *this is not ordinary wiring*, and they have to be told apart from each other
as well.

**Amber, throughout.** The palette already said green is structure and amber is attributes, and
had no amber in it. A note is nothing but an attribute someone wanted to see, so it is where
that half of the palette finally gets used.

**Solid, with a rule down its left side.** The note was drawn dashed to begin with, on the
grounds that it is drawn *on* the diagram rather than being part of it, which is what a group's
boundary says by being dashed. The reasoning was sound and the result was not: a reference card
is already dashed, a boundary is already dashed, and a third dashed rectangle differing only in
hue is a distinction that has to be worked out rather than seen. Dashes are spent.

So the shared quality is carried by colour instead — amber, which nothing else on the canvas
uses — and the shape says what kind of thing it is. The margin rule is the annotation convention
off the page, and no other object here has one, so a note is identifiable at any zoom and at a
glance. The leaders stay dotted, where nothing else is: fine dots read as *attached to* rather
than *connected to*, which is exactly the difference between a leader and a relationship.


## Display (UI)

### Viewer

The viewer is a single-page web app whose layout should feel like an intuitive, simplified
IDE: a central diagram canvas, and a file-explorer-like object explorer sidebar on the left
for navigating between hierarchically defined objects and their views. Terms are kept
deliberately generic so the tool can apply to many domains.

The visual style and theme are **frozen as built** and marked for refinement — see [tasks.md](tasks.md).


### Graph Canvas

Scalability is the viewer's main priority. Just as the object explorer pans to and expands
the branch holding the current selection, the canvas stays centered on the mass of blocks,
annotations, and relationships for the current level of the project tree.

**Coordinates.** Node positions are stored relative to the canvas center origin, so a layer
stays centered as it grows in any direction rather than drifting off one corner. Automatic
placement fills outward from that origin in rings.

**Placement precedence.** Two things decide where a node sits, in this order:

1. **User placement wins.** A node the user has positioned keeps that position until the user
   moves it again or asks for the layer to be laid out afresh.
2. **Automatic layout fills the rest.** Unplaced nodes are laid out around the placed ones,
   starting at the center and working outward into whatever room is left.

The canvas expands — zooms out slightly — as blocks are added, always keeping a margin around
the edges for further placement, and refits whenever the layer gains or loses something.

As a layer gets crowded, the user can cluster nodes into groups (an attribute, no structural
change) or into deeper containers (structural, a new nested layer).

Navigating depth-wise — double-clicking into a node, double-clicking outside the frame to come
back — gives the nesting-doll view of the system, and should transition fluidly between layers
rather than cutting.


#### Diagram Views

The canvas supports three view types, distinguished by the frame drawn around the layer the
user is inspecting.

**Root view.** The top level, with no parent frame. The root node is the project itself; its
children are the top-level nodes and its attributes are the project's.

**Node view.** The inside of a node: a frame carrying the node's name, with enough margin
inside it to show the interfaces sitting on its edge. Double-clicking outside the frame
returns to the previous level.

**Inside the frame is the canvas**, left clear to the grid — it is where the work happens.
Everything outside it is dimmed. The frame is the boundary of the thing you are in, seen from
within, not a panel laid over the page, so the lit area is the space you can build in and the
dark area is merely the outside world.

**The frame carries its name in its own border** — set into the line at the top left, a break
in it rather than a caption above or a heading inside. The other corner belongs to the canvas
toolbar.

**The frame fills the panel.** It is the working area, so it takes as much of the canvas as it
can, and what is left around it is a band — enough to double-click in to leave by, and enough
to show the parent's border when the layer is an interface. Nothing else is ever drawn out
there, and nothing drawn out there is allowed to decide how much room the layer gets.

**The band is the same on every side of every layer.** It does not vary with what the layer
holds or with the shape of the window: stepping between two layers should not move the walls.
That means the frame is shaped like the space it is shown in and then placed, rather than
scaled to fit — a frame of any other shape fits by one axis and letterboxes on the other,
which leaves one layer sitting in generous bands top and bottom while the next has almost
none.

A layer holding little still gets a full frame. Its working area has a floor that takes its
shape from the panel, so a tall window gets a tall frame and a wide one a wide frame; without
that floor a sparse layer was a small box magnified to fill the screen — the same picture with
everything twice the size and no more room to work in.

**Zoom and growth happen inside the frame.** A layer that gains a node grows its frame, and
the view refits so the frame still fills the panel — the contents get smaller within a
constant working area rather than the working area shrinking around them.

A node with no children still has a node view — the frame, its interfaces, and empty space to
build in. Descending into a block is how you start giving it contents, so it must not be a
dead end.

**Interface view.** The inside of an interface. An interface is a small square set into its
parent's edge; opening it fills the canvas with that square, so the thing you were looking at
from across the layer now surrounds you.

What marks it as an interface rather than an ordinary node is **the parent's own border**,
drawn in the dimmed margin outside the frame. It runs up to the frame from one direction and
away from it on the other, stopping where the frame begins — the wall the port is set into,
passing behind you. Nothing is drawn inside the frame; the interior is working canvas like any
other.

The border's direction follows the edge the interface sits on: a port on the parent's left or
right is set into a vertical wall, so the line runs up and down; a port on its top or bottom
is set into a horizontal one, so the line runs left and right.

> Worked example. `Gateway` is a container with an interface `HTTP` on its right edge.
> Descending into `HTTP` fills the canvas with `HTTP`'s own frame, and a vertical line
> continues above and below it — `Gateway`'s right-hand border, seen from inside the port set
> into it. The blocks left of that line's continuation face inward — `Router`, `AuthCheck` —
> and the ones right of it face the outside world — `TLS`, `RateLimit`. Relationships crossing
> the line are exactly the ones that cross `Gateway`'s boundary through this interface, which
> is what makes the view worth drawing.


### Object Explorer

The object explorer shows structure, and only structure: nodes, nested to any depth. It
supports the standard node operations — add, move, rename, delete. Dragging nodes between the
explorer and the canvas is seamless in both directions.

**Moving a node to another layer sheds what does not travel with it.** Its group memberships,
since a group is drawn from members sitting together in one layer and it is leaving that layer.
And its **external wiring** — the relationships joining it to things staying behind, which after
the move have one end here and one end there, and which nothing would draw.

**What travels is kept whole.** The node arrives with its insides exactly as they were: its
children, the wiring among them, and the wiring from them to its own interfaces. That last one
matters and is easy to get wrong. A relationship from a child to one of the node's interfaces
*names the node as its far end* — `Router → Gateway`, anchored at `HTTP` — so it looks from the
data like a relationship the node has. It is not: an interface draws on both sides of its node,
so that line is internal wiring, drawn inside the very layer that is moving, and it survives
untouched. Only relationships to things outside the node's own subtree are external.

Nothing is created either. No reference is placed to keep a dropped line visible; a reference is
the user's, always, and a tool that scattered them to preserve a picture would leave a mess
nobody asked for.

**Dropping the external wiring at all is the deliberate simplification here**, and a provisional
one. Those relationships are not incoherent after the move — they are ordinary cross-layer
relationships, and a reference would draw them again. They are dropped because a project full of
connections nobody can see is worse than a project that lost the ones it stopped drawing, while
the model is still moving. Keeping them undrawn instead is a one-line change.

**Interfaces are not shed.** They are the node's own children and go with it, so a node keeps
its shape and loses only its connections outward. Nothing tidies the bare ports afterwards: a
node's shape is worth describing before its connections are, and that holds whether the
connections were never made or have just gone.

Groups, annotations, and other attributes never appear here. Interfaces are child nodes and so
belong here, but are **hidden by default** — a toggle reveals them, listed at the same level
as the node's child blocks and sorted after them, told apart by their own icon. They get no
branch of their own: a wrapper around them would be a level of structure that does not exist.
A node whose only children are interfaces still shows as a block, not a container.

Visually, the explorer delineates levels with indentation and subtle tree guide lines
connecting the contents of each branch. Each role gets its own icon — interface, block,
container — before the name, so a node's role is identifiable without opening it. **That icon
is also the fold control** on a branch that has one: the mark that says a node holds things is
the thing you click to see them, so there is no second arrow taking up the indent.

**Folding is the user's, and only the user's.** A branch opens because someone opened it and
closes because someone closed it. Walking into a layer on the canvas leaves the tree exactly as
it was found — a tree that rearranges itself under you is one you cannot keep your place in,
and which branches are worth having open is not something the canvas knows. One control in the
tools opens every branch or closes every branch, whichever the tree is not already.

Deep branches indent past the sidebar's width rather than being truncated or wrapped, and the
explorer scrolls horizontally to follow. The scroll centres on the depth of whatever is
selected, so the selection's own level and the levels either side of it are all in view at
once. It re-centres whenever the tree's shape changes as well as when the selection does — a
branch opened by the same click that made it has not been laid out yet when the selection
lands.

The tree fills the panel, so its horizontal scrollbar sits at the foot of the sidebar rather
than under the last row. A bar that floats up and down with the number of rows is hard to find
and harder to aim at.


### Breadcrumbs

Above the canvas, the trail from the project down to the open layer, each step a way back to
it. It names the project and the last three layers; anything between is collapsed to an
ellipsis, which is itself a way back to the deepest layer it stands for and names them all in
its tooltip.

The cap is there because a trail spelled out in full stops being a trail and becomes a wall of
names — and it is the project and the layers nearest you that tell you where you are.


### Attribute Panel

A single panel below the canvas, populated from the current scope and selection. It has one
state per row:

| Canvas selection | Panel shows |
|---|---|
| nothing | the scope node itself — the frame you are inside — with its body text, type, and attributes |
| a child block | that block's body text, type, and attributes, including which groups it belongs to |
| an interface | the same, for the interface |
| a relationship | its type, label, direction, and attributes |
| a group boundary | that shared attribute: its name, label, tags, and its members |

Selecting a node in the explorer makes it the scope, and with nothing selected on the canvas
the panel shows that node's own attributes — so the explorer is a way to inspect a node as
well as to navigate into it. Selecting something on the canvas replaces that with the
selection's own attributes; `Esc`, or a click on empty background, returns to the scope.

The scope always exists — the root is a scope like any other — so the first row is the
panel's resting state, not an edge case.

A node's body text is edited here, alongside its attributes. There is no separate document
pane.


### Terminal rail

The contextual prompt and option chips above the canvas are **frozen as built** and marked
for refinement — see [tasks.md](tasks.md).


## Interaction (UX)

Common interaction patterns should let the user rapidly navigate and modify the project
structure. Contextual prompts should be optional and default to the most common option.

### Selection, scope, and context

**Scope** is the layer the canvas is drawing. **Context** is what is selected within it.
They change through different gestures, deliberately:

- **Single click in the explorer sets the scope.** The canvas draws that node's view. This is
  the explorer's whole job — it is a navigator, and every click in it is a navigation.
- **Single click on the canvas sets the context, and never navigates.** The scope does not
  change; the selected object is highlighted, the attribute panel follows it, and zooming
  centers on it. Selecting a thing shows it among its siblings, so a glance never costs you
  your place.

The asymmetry is intended. On the canvas, going deeper is always the deliberate second
gesture below.

### Navigation

Double-click any object on the canvas to descend into its view. Double-click outside the
current frame to return to the previous level. Nothing else on the canvas changes the scope.

### Editing

Dragging in the explorer supports rapid reorganization. Drag and drop between explorer and
canvas is supported in both directions, except where a node would contain itself. A move is
never confirmed first — undo is the answer to a move that went wrong, and a dialog in the way
of every reorganization costs more than it saves.

Left-dragging on the canvas depends on where the drag starts:

- **From a node** — moves the node. Dropped on another card it goes inside it, wherever on
  that card it landed; a card's border is not a drop target of its own. Dropped in the clear
  space inside a group's boundary it joins that group, and dropped outside one it was in, it
  leaves.
- **From an interface** — slides it along its frame edge, and no further. No selecting first.
- **From a segment of a relationship** — moves that segment across itself, and the interface
  with it where the segment is one of the two at the ends.
- **From a selected group's background** — moves every member of that group together.
- **From empty background, or from an unselected group's background** — draws a selection
  box, which takes the elements it fully contains. Dragging a selection moves all of it as one
  action.

Once a selection box has caught something, the box that stays around it **reaches a little
past what it holds** rather than hugging it exactly. Sized to the contents, its line lands on
the cards' own borders and reads as part of them instead of as something drawn around them.

**Select-then-drag is for large targets, not small ones.** A group's boundary is a wide
transparent area a drag could easily begin in by accident, so it moves only once it has been
selected, and the same goes for a multi-node selection. An interface and a relationship's
segments are thin, precisely reported things: a drag beginning on one could not have meant
anything else, so it acts at once. Asking for a click first bought nothing there and cost a
gesture every time.

The canvas pans with the middle button, with `Space` held, or with the wheel — never with a
plain left drag, which is spent on selecting and moving.

Panning is bounded to the layer's contents plus room on every side to put something new, and
the bound grows with the layer.

### The two buttons

**The left button handles what already exists. The right button makes something new.** That is
the whole division, and it is a division by *what the gesture does* rather than by what it
happens to be over — which is what makes it possible to say in one line.

Within the right button, one more distinction finishes it: **a click makes the thing that sits
at a point, and a drag makes the thing that has extent.**

| | right click | right drag |
|---|---|---|
| **on a node** | an interface — a point on its border | a relationship — from it to somewhere |
| **on the background** | a node — a point in the layer | a note — something with extent to say |

Four creations, one rule, no exceptions to remember. A relationship being drawn with the right
button used to be the odd gesture in the tool, justified only by the left button being busy;
under this reading it is not an exception at all but one cell of the table, and the reason it
uses a drag is the same reason a note does.

**A right drag that sets off from a name does nothing at all** — it does not draw, and on
release it does not open the editor either. Nothing appears until a drag pulls clear of the
press, and nothing should appear afterwards either: a drag that began on a name meant to go
somewhere, and landing it back where it started as a text cursor is the tool guessing.

**No part of a card is a separate target.** Right-clicking a card makes an interface wherever
on the card the click lands — the position decides which point of the border it goes to, but it
is not a test the click has to pass. This replaced a rule where a card's border made interfaces
and its interior made child nodes, which meant aiming at a ring a few pixels wide to get the
commoner of the two. Nothing is worth that. Making a child node instead means stepping into the
card and right-clicking its background, which is the same act described honestly: a node is
made in the layer you are looking at.

The layer's own frame is the one exception, and unavoidably so — its interior *is* the
background, so its border has to stay a zone. It is a large, plainly drawn target, which is
exactly what a card's ring was not.

**Nothing stacks.** Right-clicking an interface makes no second interface underneath the first,
and right-clicking a relationship makes nothing at all. Both used to fall through to a default
meant for something else, and both are now silent, waiting for the menu.

Once the menu exists, each entry above becomes its default and the alternatives sit beside it —
direction and reversal for a relationship, ungroup for a group, lay-out-again and paste for the
canvas, delete throughout.

### Keyboard

Shortcuts work in both the explorer and the canvas, acting on whichever has focus.

| Key | Action |
|---|---|
| `Delete` / `Backspace` | delete the selection |
| `Esc` | clear the selection, back to the scope |
| `Ctrl`/`Cmd` + `Z` | undo |
| `Ctrl`/`Cmd` + `Y`, `Ctrl`/`Cmd` + `Shift` + `Z` | redo |
| `Enter` | rename the selection |
| `F` | fit the layer, or zoom to the selection if there is one |
| `Ctrl`/`Cmd` + `A` | select everything on this layer |
| `Ctrl`/`Cmd` + `G` | group the selection |
| `Shift` / `Cmd` + click | add to the selection |
| `Space` + drag | pan |
| double-click | descend on the canvas, rename in the explorer |

**`F` reads the context rather than taking an argument.** With nothing selected it fits the
layer; with something selected it goes to that. One key for both, because "show me this" is one
intention and which *this* is already answered by what is selected — the same reckoning the
attribute panel and the right button both use.

**`Ctrl` adds to a selection and does nothing else.** It is not an alias for the right button.
Every right-button gesture here is a click or a drag, and `Ctrl` + left-drag would have had to
mean two things at once; a trackpad's two-finger tap is a real right click and needs no alias.

**`Space` held turns a left drag into a pan.** The middle button alone was unreachable on a
trackpad, which made panning a wheel-only gesture on the machines most likely to be used for
this.

### Hovering

**One element highlights at a time, and it is the one in context** — whatever a click or a
right-click would act on if it happened now. The highlight is subtle; selecting the same thing
makes it fixed and less subtle.

That is what it is for. Right-click has no menu yet and performs its default action directly,
so the only warning of what the button is about to do is what is lit beneath the cursor.

**The innermost thing under the pointer wins**, since that is the one the gesture reaches:

| Under the pointer | What lights |
|---|---|
| a multi-node selection | the selection |
| a frame's or a boundary's name | that name |
| an interface | that interface |
| a chip in a container's treemap | that chip |
| a card | the card, its border included |
| the layer's own frame, near its border | the frame |
| a relationship | the line |
| the clear space inside a group's boundary | the boundary |

A card is never lit at the same time as an interface sitting on it, or a chip inside it, and a
border is never lit at the same time as the name set into it. The pointer is over one thing;
lighting that thing and everything around it says nothing about which of them is about to be
acted on, which was the whole complaint.

**A card lights as one thing, border and all.** It used to light its ring separately, because
the ring took a different right-click action from the inside. Now that it does not, a second
highlight there would be describing a distinction the tool no longer makes.

**A group's boundary is found by position rather than by the pointer.** It is transparent to
the pointer until it has been selected, so that a selection box drawn from inside it reaches
the canvas rather than sweeping the group in — which means nothing ever reports it as hovered.
The canvas measures instead, and the tightest boundary the pointer is inside is what lights,
by the same reckoning that decides which group a click there selects. It brightens further for
a card dragged over it that would join.

**Nothing else on the canvas highlights.** An object a recent action created or changed
notably does not: what was touched a moment ago is the action log's business, and marking it
on the canvas both competed with the highlight that says where the pointer is and left the
diagram looking edited long after the edit.

### Layouts

Layout has one job: centre the mass of blocks in the view, with no overlap and as little
crossing as possible between relationships and blocks. There are no named arrangements to
choose between, and no ranking of nodes by their relationships — one layout, applied
everywhere.

New nodes are added at the centre and work outward, with the default zoom expanding to keep
them in frame. Layout keeps grouped and related nodes near each other and honours user
placement; everything else fills the room that is left.

It is good enough when, for a layer of thirty nodes, no two blocks overlap, no relationship
passes through a block it does not attach to, and relationship crossings are visibly fewer
than straight point-to-point routing would give.



## Where this is going

The ultimate goal is to support generation of common diagram types — activity, class, state,
flow — for a given scope, and translation of the project to SysML exports. Interfaces are why
the second is coherent: SysML wants typed blocks and ports, and an interface is the port.

A deeply nested and broad sample project ships alongside, describing this application's own
components, interfaces and data structures, and exercising every feature in the spec.
