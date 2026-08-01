# Spec

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
- **Non-structural** — attributes, including groups and annotations. These describe nodes and
  draw on the canvas, but never appear in the explorer and never change what contains what.

The current code inverts part of this (`isGroup` means "has children", and the visual
annotation is typed `Region`). The spec is the target; the rename is expected work, not a
discrepancy.


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
relationship attaches. This is what makes the SysML export target (see Notes) coherent —
SysML wants typed blocks and ports, and an interface is the port.

An interface draws as a small open square on the frame edge, with an optional label outside
and above it. An interface holding child blocks of its own draws instead as a divided square,
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
- **Right-clicking a frame edge creates a bare one**, with no relationship attached. This is
  the one way to get an interface on its own, and it is there because a node's shape is worth
  describing before its connections are.

A relationship made any other way — from a chip, or by a workflow — leaves both its
interfaces implied, because there was no gesture to take a position from.

**And where they go.** Deleting a relationship deletes the interfaces at both its ends, so
rewiring a diagram leaves no trail of empty squares behind it. Two things are never
collateral: an interface another relationship still attaches to stays, and an interface with
contents of its own is left standing, bare, rather than taking what is inside it with it.

**Selecting and moving.** An interface selects like anything else: click to highlight it, and
once selected it slides along its edge and around corners under a left drag. It stays on the
border however far the drag goes — sliding is the only thing the gesture does. Left-dragging
is never how a relationship is drawn either; that is the right button's job, here and at the
frame edge, so selecting a port and wiring one are never the same gesture.

**Naming.** An interface with no name of its own is called `interface 1`, `interface 2`, and
so on — its number among the interfaces of the node it sits on, in the order they were made.

Numbered rather than all sharing one word, because a relationship now puts an interface at
each of its ends and a node soon has several; five rows in the explorer all reading
"interface" name nothing. The count is per parent, since that is where the names are seen
together — two nodes each having an `interface 1` is no more a clash than two folders each
holding a `notes`.

The number is a position, not an identity: it is derived rather than stored, so deleting one
closes the gap and the ones after it shift down. Anything that wants a name that stays is
given one, and a name given replaces the number entirely.

**Visibility.** Interfaces render on the canvas by default, and can be toggled off for a
cleaner read of the structure alone. Nothing about the relationships changes when they are
hidden — the interfaces are still there, and the lines still meet the frame edge where they
would have been, which is the same place an implied one would sit. The object explorer is the
other way round: interfaces are hidden there by default, and a toggle reveals them.

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
| `flow` | optional, decorative: marks the interface as input, output, or both |

`side` and `at` replace the absolute x/y an ordinary node carries; an interface's position is
meaningless apart from its frame. They are set when it is created and changed only by sliding
it, and `side` is never cleared — an interface that came off its border would be a block, and
nothing turns one into the other.

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

**A name is edited where it is drawn.** One click opens the editor, but only on something that
is already selected: it is the second click of a rename, never the first, so a click meant only
to select still only selects. `Enter` commits, `Esc` abandons, and clicking away commits.

- **A card** — select it, then click its name. A double-click still descends into it, so the
  editor waits a moment to see whether a second click is coming.
- **A group boundary** — select it, then click its name.
- **The layer's own frame** — one click, no selecting first. This layer is where you already
  are, so there is no first click to spend.

The explorer renames on double-click, as a file tree does. Neither replaces the other: you
rename a thing where you are looking at it.


### Relationships

An edge represents a relationship between two nodes. Relationships may be typed, annotated,
labeled, and given a direction.

**Relationships are undirected by default** — a plain line, no arrowhead, asserting only that
the two ends are related. Direction is added deliberately, through the relationship's context
menu or the attribute panel: one way, the other way, or both.

Relationships are created by right-click-dragging, from an existing interface or from anywhere
on a node, and they end up with an interface at each end either way — see Interfaces above for
where each one lands. `Esc` cancels the whole gesture, interfaces included.

**References.** A relationship between two nodes in different layers is drawn in either of
them through a **reference**: a placeholder standing in for the far node, sitting in this layer
as an ordinary node.

A reference is a node. It sits inside the frame with everything else, it is selected, moved,
nested, related, given interfaces and given attributes exactly as any other node is. What
marks it out is only how it draws — grey and half there, so it reads as a mention of something
rather than the thing itself — and that a relationship reaching it is drawn dotted rather than
solid, since one of its ends is a mention.

**It has no name of its own.** It shows whatever the node it stands for is called, and renaming
it renames that node: there is one object being named, however many places it appears.

**It has no inside of its own.** Whatever is in the node it stands for is in the node it
stands for. Double-clicking a reference therefore goes to where that node actually lives and
marks it there, rather than opening an empty layer. Nothing nests into a reference, and a
reference never becomes an interface — a mention is not structure.

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

Some attributes also draw on the canvas, as **annotations**: a label, an icon, or a group
boundary. An annotation moves with whatever it is attached to.

**Groups** are the shared-attribute case drawn as a boundary. When two or more nodes on the
same canvas are grouped, they receive a shared attribute, and its annotation is a
semi-transparent background surrounding all of them. Like any attribute it can be named,
labeled, and tagged.

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
- A group holds two or more members. Deleting a member, or moving it to another scope, drops
  it from the group and the boundary re-fits; when that would leave a single member, the
  attribute is removed altogether rather than left drawn around one node.
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
- The attribute panel still lists membership and still adds and removes it. Dragging is the
  quick way, not the only way.

**None of this makes a group structural.** No node's parent changes, the object explorer still
never shows it, and what is inside the boundary is a fact about where things sit rather than
about what contains what. That is the whole difference between a group and a container, and it
survives them sharing a gesture.

**The boundary has no appearance of its own to set.** One faint dashed line, the same for every
group, so a canvas of them reads as one kind of thing rather than as a palette. It brightens
when selected, and again when a card is over it and would join. Colour, custom content and the
rest come later; until they do there is nothing in the panel to set, because there is nothing
to set.

**Its name is edited on the canvas**, on the boundary itself — see Naming below.


## Display (UI)

### Viewer

The viewer is a single-page web app whose layout should feel like an intuitive, simplified
IDE: a central diagram canvas, and a file-explorer-like object explorer sidebar on the left
for navigating between hierarchically defined objects and their views. Terms are kept
deliberately generic so the tool can apply to many domains.

The visual style and theme are **frozen as built** and marked for refinement — see Status.


### Graph Canvas

Scalability is the viewer's main priority. Just as the object explorer pans to and expands
the branch holding the current selection, the canvas stays centered on the mass of blocks,
annotations, and relationships for the current level of the project tree.

**Coordinates.** Node positions are stored relative to the canvas center origin, so a layer
stays centered as it grows in any direction rather than drifting off one corner. *(This is a
change: positions are currently stored from a top-left origin, so existing projects need
migrating.)*

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
supports the standard node operations — add, move, rename, delete — and dragging nodes between
levels adjusts the relationships defined in the project's meta graph automatically. Dragging
nodes between the explorer and the canvas is seamless in both directions.

Groups, annotations, and other attributes never appear here. Interfaces are child nodes and so
belong here, but are **hidden by default** — a toggle reveals them, listed at the same level
as the node's child blocks and sorted after them, told apart by their own icon. They get no
branch of their own: a wrapper around them would be a level of structure that does not exist.
A node whose only children are interfaces still shows as a block, not a container.

Visually, the explorer delineates levels with indentation and subtle tree guide lines
connecting the contents of each branch. Each role gets its own icon — interface, block,
container — before the name, so a node's role is identifiable without opening it. The fold
arrow is separate from the role icon.

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


### Page Intelligence

The contextual prompt and option terminal above the canvas is **frozen as built** and marked
for refinement — see Status.


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
- **From a selected interface** — slides it along its frame edge, and no further.
- **From a selected group's background** — moves every member of that group together.
- **From empty background, or from an unselected group's background** — draws a selection
  box, which takes the elements it fully contains. Dragging a selection moves all of it as one
  action.

Once a selection box has caught something, the box that stays around it **reaches a little
past what it holds** rather than hugging it exactly. Sized to the contents, its line lands on
the cards' own borders and reads as part of them instead of as something drawn around them.

Selection behaves the same way throughout: click to select, then drag what is selected. It is
what makes a group movable, an interface slidable, and a multi-node selection draggable as one
thing.

Right-dragging draws relationships, making an interface at each end as it goes. Nothing
appears until the drag pulls clear of the edge, and `Esc` cancels.

The canvas pans with the middle button or the wheel, never with a left drag.

Panning is bounded to the layer's contents plus room on every side to put something new, and
the bound grows with the layer.

### Context menu

Right-click acts on whatever is under the cursor. **For the first pass it performs the default
action directly, with no menu drawn** — the menu is the last thing built, and until it exists
these are the actions right-click takes:

| Right-clicked | Default action |
|---|---|
| empty canvas | new object |
| a node | new object inside it |
| a frame edge — the scope's own, or any block's | new interface |
| a multi-node selection | group the selection |
| a group boundary | rename the group |
| a relationship | rename the relationship |

Once the menu exists, each of these becomes its default entry and the alternatives sit beside
it — direction and reversal for a relationship, ungroup for a group, lay-out-again and paste
for the canvas, delete throughout.

### Keyboard

Shortcuts work in both the explorer and the canvas, acting on whichever has focus.

| Key | Action |
|---|---|
| `Delete` / `Backspace` | delete the selection |
| `Esc` | clear the selection, back to the scope |
| `Ctrl`/`Cmd` + `Z` | undo |
| `Ctrl`/`Cmd` + `Y`, `Ctrl`/`Cmd` + `Shift` + `Z` | redo |
| `Enter` | rename the selection |
| `Ctrl`/`Cmd` + `A` | select everything on this layer |
| `Ctrl`/`Cmd` + `G` | group the selection |
| double-click | descend on the canvas, rename in the explorer |

### Hovering

Hovering any context element — the scope frame, a block's contents, a block frame, a
container's treemap children, a relationship, an annotation — highlights it subtly, to
communicate that an interaction is available there. Selecting the element makes the highlight
fixed and less subtle.

A frame edge or border highlights on hover in its own right, since it becomes the context for
the interface gestures above: right-click there for a bare interface, right-drag for one with
a relationship attached.

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


## Status

**Frozen, pending refinement.** Built and working; left alone while the graph model settles,
and revisited deliberately rather than drifting:

- **Page Intelligence** — the contextual prompt and option terminal. Its role in the tool is
  the open question, not its implementation.
- **Visual style and theme** — colour, type, spacing, and the overall look.

**Built last.** The context menu. Until then, right-click performs the default action above.


## Notes

A deeply nested and broad example project should ship for testing and demonstration. The
sample describes this application — mndflow's own components, interfaces, and data structures
— and must exercise every feature above, so it cannot be authored until interfaces,
references, and groups exist. It lives at `samples/mndflow.json` in the project's own export
format, and loads from the viewer without setup.

The ultimate goal is to support generation of common diagram types — activity, class, state,
flow — for a given scope, and translation of the project to SysML exports.
