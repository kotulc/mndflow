# Spec

mndflow's primary purpose is to enable rapid construction and composition of descriptive
visual building blocks for systems modeling tasks.

The goal of mndflow's client-only web application is to support fluid and engaging assembly
of complex systems starting from simple descriptive "building block" type elements. Visual
scope is constantly constrained to prevent overwhelming the user with too much information.


## Concepts

### Vocabulary

Two words carry most of the weight and are used in exactly one sense throughout:

- **Container** — a node that has children. Nothing else makes a node a container; there is
  no container type to set.
- **Group** — a visual annotation drawn around sibling nodes. A group never changes what
  contains what.

The current code inverts this (`isGroup` means "has children", and the visual annotation is
typed `Region`). The spec is the target; the rename is expected work, not a discrepancy.


### Nodes

The primary object. A node has children, interfaces, relationships, annotations, and
attributes.

A node's **role** is derived from what it holds and where it sits, never declared: a node
with no children is a *block*, a node with children is a *container*, and a node attached to
a frame edge is an *interface*. Role determines only how the node draws; every node shares
the same operations, and a node changes role simply by gaining a child or being dragged onto
a frame edge.

**Blocks** — nodes without children appear as simple rectangular blocks. All nodes (blocks
included) can be nested, unnested, grouped, ungrouped, annotated, related, interfaced,
referenced, and given descriptive attributes.

**Containers** — nodes with children show an internal treemap grid of their contents. Each
child chip's fill follows how closely it relates to its parent. Labels appear wherever a cell
has room for them.


### Interfaces

An interface is a node attached to its parent's frame edge, and it is **the only place a
relationship can attach**. There are no other anchors: an edge always runs from one interface
to another. This is what makes the SysML export target (see Notes) coherent — SysML wants
typed blocks and ports, and an interface is the port.

By default an interface draws as a small open square centered on the frame edge, with an
optional label outside and above it.

**Where they come from.** One model, three ways in:

- Every node is created with a default input interface and a default output interface, so
  drawing a relationship never requires setup first.
- Dragging out from a frame edge creates a new interface there and starts a relationship from
  it in the same gesture.
- Dragging an existing node onto a frame edge promotes it to an interface; dragging it back
  off demotes it to an ordinary child.

Drawing a relationship never silently creates an interface — it uses a default one, or the
one the drag started from. This keeps a busy diagram from quietly filling the explorer tree
with anchor nodes.

**State an interface carries beyond an ordinary node:**

| Field | Meaning |
|---|---|
| `side` | which frame edge it sits on — top, right, bottom, or left |
| `at` | how far along that edge, 0–1, so it survives the frame resizing |
| `flow` | `in`, `out`, or `both` |

`side` and `at` replace the absolute x/y an ordinary node carries; an interface's position is
meaningless apart from its frame. Interfaces slide along their edge freely and may be dragged
around a corner onto an adjacent edge.

A relationship runs from an interface that is `out` or `both` to one that is `in` or `both`.
An `out`-only interface cannot be an edge target — attempting it is rejected during the drag
rather than after it, so the invalid target simply refuses to highlight.


### Relationships

An edge represents a relationship between two nodes. Relationships may be typed, annotated,
directed, undirected, and labeled.

Relationships are created by dragging from an interface, or from a node's frame edge — which
creates the interface as it goes. Dragging a link into empty space creates the far node and
attaches it.

**References.** A relationship whose far end lies outside the current scope is not a separate
kind of relationship; it is the same relationship, drawn differently. It renders anchored to a
semi-transparent placeholder node with a dashed boundary, labeled with what it actually
reaches.

> This reverses an earlier decision, which attached such a relationship to whichever visible
> ancestor contained the far end and labeled it `informs ↳ core`. The ancestor form kept the
> diagram literal but made two different relationships into the same visible line, and gave no
> hint where the other end lived. The dashed placeholder costs a little space and says plainly
> that something continues off this layer.


### Groups

When two or more nodes on the same canvas are grouped — by selecting them and choosing
**Group** from the right-click menu — they are visually linked by a semi-transparent
background surrounding all of them. A group may be named and typed and may carry its own
descriptive attributes.

A group is an organizing visual attribute shared by its members, **not** a structural
element. It never changes any node's parent, never appears in the object explorer, and never
affects navigation.

**Membership defines geometry, not the other way around.** The frame is derived from the
bounds of its members plus a margin, and it follows them as they move. Dragging a node into
or out of the frame's area does nothing to membership; membership changes only through an
explicit add-to-group or remove-from-group action.

The consequences of that choice:

- Dragging the group background moves every member together — one user action, one entry in
  the history, however many positions it changed.
- Resizing the frame by hand pins it: the frame stops tracking its members and keeps the size
  it was given. **Fit to contents** in its context menu unpins it.
- Deleting a member removes it from the group and the frame re-fits. Moving a member to
  another scope does the same, since a group only ever spans one canvas.
- A group with fewer than two remaining members is deleted, not left invisible.
- A node may belong to more than one group. Overlapping frames stack smallest-area on top, so
  the tighter grouping is always the one you can click.


### Annotations

A visual attribute linked to one or more nodes at a given scope. Annotations take the form of
a label, an icon, or a group, and move with the nodes they are attached to.


### Attributes

A descriptive value or property of a node or edge. Attributes are defined per node and may be
shared (groups and tags are attributes shared across their members). Attributes for the
current scope or the current selection appear in the attribute panel below the canvas.


## Display (UI)

### Viewer

The viewer is a single-page web app whose layout should feel like an intuitive, simplified
IDE: a central diagram canvas, and a file-explorer-like object explorer sidebar on the left
for navigating between hierarchically defined objects and their views. Terms are kept
deliberately generic so the tool can apply to many domains.


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
   moves it again or asks for an arrangement.
2. **Automatic layout fills the rest.** Unplaced nodes are laid out around the placed ones,
   starting at the center and working outward into whatever room is left.

The canvas expands — zooms out slightly — as blocks are added, always keeping a margin around
the edges for further placement, and refits whenever the layer gains or loses something.

As a layer gets crowded, the user can combine and cluster nodes into groups (visual, no
structural change) or into deeper containers (structural, a new nested layer).

Navigating depth-wise — double-clicking into a node, double-clicking outside the frame to come
back — gives the nesting-doll view of the system, and should transition fluidly between layers
rather than cutting.


#### Diagram Views

The canvas supports three view types, distinguished by the frame drawn around the layer the
user is inspecting.

**Root view.** The top level, with no parent frame. The root node is the project itself; its
children are the top-level nodes and its attributes are the project's.

**Node view.** The inside of a node: a frame carrying the node's name, with enough margin
around it to show the interfaces sitting on its edge. Double-clicking outside the frame
returns to the previous level.

A node with no children still has a node view — the frame, its interfaces, and empty space to
build in. Descending into a block is how you start giving it contents, so it must not be a
dead end.

**Interface view.** The inside of an interface. It looks like a node view, except the frame is
embedded in its parent's frame, sitting half inside and half outside it, with a vertical line
dividing the background margins to make that read.

> Worked example. `Gateway` is a container with an interface `HTTP` on its right edge.
> Descending into `HTTP` shows a frame straddling `Gateway`'s boundary: to the left of the
> divider, the parts of `HTTP` that face inward — `Router`, `AuthCheck` — and to the right,
> the parts that face the outside world — `TLS`, `RateLimit`. Relationships crossing the
> divider are exactly the ones that cross `Gateway`'s boundary through this interface, which
> is what makes the split worth drawing.


### Object Explorer

The object explorer supports seemingly infinite nesting and composition. It supports the
standard node operations — add, move, rename, delete — and dragging nodes between levels
adjusts the relationships defined in the project's meta graph automatically. Dragging nodes
between the explorer and the canvas is seamless in both directions.

Visually, the explorer delineates levels with indentation and subtle tree guide lines
connecting the contents of each branch. Each role gets its own icon — interface, block,
container — before the name, so a node's role is identifiable without opening it. The fold
arrow is separate from the role icon.

As the user navigates deeper, the explorer scrolls horizontally to keep the current level in
view; deep branches indent past the sidebar's width rather than being truncated or wrapped.


### Attribute Panel

A single panel below the canvas, populated from the current scope and selection. It has one
state per row:

| Canvas selection | Panel shows |
|---|---|
| a node | that node's attributes, its type, and its body text, all editable |
| an edge | that relationship's type, label, direction, and attributes |
| a group | the group's name, type, color, attributes, and its member count |
| nothing | the current scope's own attributes, plus tabs enumerating the scope's contents, relations, and annotations |

The scope always exists — the root is a scope like any other — so the "nothing selected" row
is the panel's resting state, not an edge case. Clearing the canvas selection with `Esc`, or
by clicking empty background, returns to it.

A node's body text is edited here, in the node row, alongside its attributes. There is no
separate document pane.


## Interaction (UX)

Common interaction patterns should let the user rapidly navigate and modify the project
structure. Contextual prompts should be optional and default to the most common option.

### Selection, scope, and context

**Scope** is the layer the canvas is drawing. **Context** is what is selected within it.
They change through different gestures, deliberately:

- **Single click in the explorer sets the scope.** The canvas draws that node's view. This is
  the explorer's whole job — it is a navigator, and every click in it is a navigation.
- **Single click on the canvas sets the context.** The scope does not change; the selected
  object is highlighted, the attribute panel follows it, and zooming centers on it. Selecting
  a thing shows it among its siblings, so a glance never costs you your place.

The asymmetry is intended. Going deeper on the canvas is the deliberate second gesture below.

### Navigation

Double-click any object on the canvas to descend into its view. Double-click outside the
current frame to return to the previous level.

### Editing

Dragging in the explorer supports rapid reorganization. Drag and drop between explorer and
canvas is supported in both directions, except where a node would contain itself. When a move
would break relationships or split a group, the user is asked to confirm, with the most common
answer as the default.

Dragging on the canvas depends on where the drag starts:

- **From a node's frame edge** — creates an interface there and draws a relationship from it.
- **From an interface** — draws a relationship from that interface.
- **From empty background** — draws a selection box. Anything it touches is selected, and
  dragging a selection moves all of it as one action.

The canvas pans with the middle button or the wheel, never with a left drag — a left drag is
always selection or a relationship.

Panning is bounded to the layer's contents plus room on every side to put something new, and
the bound grows with the layer.

### Context menu

Right-click opens the context menu, with its most common option marked as the default:

| Right-clicked | Options |
|---|---|
| empty canvas | **New object** *(default)*, Paste, Arrange |
| a node | New object, Label, Group *(when more than one is selected)*, Delete |
| a multi-node selection | **Group** *(default)*, Arrange, Delete |
| a group frame | Rename, Color, Fit to contents, Add selection, Ungroup |
| an edge | Rename, Reverse, Delete |
| the scope's own frame | **New interface** *(default)*, Rename, Attributes |

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
container's treemap children, a relationship edge, an annotation — highlights it subtly, to
communicate that an interaction is available there. Selecting the element makes the highlight
fixed and less subtle.

### Layouts

Every canvas view renders all its nodes, relationships, and annotations without overlap. New
nodes are added at the center and work outward, with the default zoom expanding to keep them
in frame. Layout prioritizes grouped and related nodes and honours user placement; everything
else fills the room that is left.

Automatic routing is its own milestone, separate from placement. It is done when, for a layer
of thirty nodes:

- no two node frames overlap;
- no relationship passes through a node frame it does not attach to;
- relationship crossings are reduced relative to straight point-to-point routing;
- and no relationship leaves its interface at an angle acute enough to be ambiguous about
  which interface it belongs to.

Until that lands, placement wraps into rows and relationships route directly.


## Open decisions

Deliberately unsettled, recorded here rather than buried in the prose above:

- **Explorer at depth.** The horizontal-scroll indented tree specified above is the smaller
  change. Miller columns — one pane per level, the current level always centered — handle deep
  nesting better but discard the at-a-glance view of the whole branch. Worth revisiting once
  real projects get deep enough to hurt.
- **Interface promotion and relationships.** Promoting a node with existing relationships to
  an interface is defined; demoting one whose interface carries relationships is not. Do the
  relationships follow it inward, or is the demotion refused?
- **Group attributes vs. node attributes.** A group with a name, a type, and attributes is
  very nearly a node. It stays separate because it must not appear in the explorer or affect
  containment — but if groups keep growing, making them nodes with a non-structural membership
  list is the cleaner end state.
- **Undirected relationships** are listed as supported but no gesture creates one, and the
  attribute panel is the only place direction can be changed.


## Notes

A deeply nested and broad example project should ship for testing and demonstration. The
sample describes this application — mndflow's own components, interfaces, and data structures
— and must exercise every feature above, so it cannot be authored until interfaces,
references, and groups exist. It lives at `samples/mndflow.json` in the project's own export
format, and loads from the viewer without setup.

The "Page Intelligence" contextual prompt and option terminal is included but will be refined
for a later use case.

The ultimate goal is to support generation of common diagram types — activity, class, state,
flow — for a given scope, and translation of the project to SysML exports.
