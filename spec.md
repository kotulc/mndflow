# Spec

What each part of mndflow does, component by component — short statements of the current
target.

- **Why any of it is this way** → [design.md](design.md).
- **What is not built, and what is undecided** → [tasks.md](tasks.md).
- **(planned)** marks a line that is the target but not yet the behaviour.

mndflow is a client-only web app for assembling systems out of simple descriptive building
blocks. There is no server: a step log lives in the tab, and the graph is folded from it.


## Project model

**Nodes** — the only structural object. Everything else describes them.

- A node's **role** is derived, never declared: on its parent's frame edge it is an
  **interface**; otherwise a **block**; a block holding child blocks is a **container**.
- Interface is the one role that never changes. Nothing turns a block into one or back.
- Interfaces do not count towards being a container.
- A node carries `label`, `type`, `parent`, `body`, `x`/`y`, an `axis` for when it is the open
  layer, and a `ref` when it is a reference.
- An interface carries `side`, `at` (0–1 along that edge), `num`, and `flow` instead of `x`/`y`.
- **An interface is a node only where somebody made one** — a bare one, or a promoted seat.
  A relationship makes none: where its line meets a card is worked out by the layer.
- `num` is fixed at creation; a new interface takes the lowest number its parent is not using,
  so deleting one leaves a gap the next fills and renames nothing.
- `flow` (in / out / both) is decorative and constrains nothing.

**Edges** — a relationship between two nodes.

- Carries `relation`, `kind`, `dir` (none / forward / back / both), `from`/`to` interfaces, and
  `fromSide`/`toSide` where an end was drawn through a named wall.
- `kind` is `untyped` (the default), `flow`, or `assoc`. It says what the two ends *are*;
  `dir` still says which way the arrows point.
- `from`/`to` are set only where an end landed on an interface somebody made. Absent is the
  normal case, and the layer works that end out.
- `fromSide`/`toSide` pin an end to one of the frame's four walls. The seat along it is still
  derived; `arrange` hands the wall back.
- **No relationship carries a route.** Where a line goes is derived from the layer it is drawn
  in, every time it is drawn.

**Attributes** — a name, value and tags, held by one object or shared by many.

- Sharing is what makes an attribute a grouping; `group` marks one drawn as a boundary.
- `note` marks one drawn as a card of text, and carries the layer and place it sits at.
- A boundary and a note are the two ways an attribute draws; nothing is both.
- Never structural: never in the explorer, never changing what contains what.

**History** — the step log is the source of truth.

- Every change is one step holding one or more mutations; the graph is folded from the applied
  ones in order.
- Undo flips the last applied step and refolds; redo re-applies. No mutation needs an inverse.
- One gesture is one step, however many things it changed.

**Files**

- Export writes the step log as JSON; import replaces the session with one.
- Display preferences are outside the project: no history, no export.


## Shell

- One page: header, terminal rail, then explorer beside the working area.
- Header carries the project name, the active domain, and undo / redo / export / import / new.
- `new` confirms before discarding; import rejects a file that is not a mndflow project.
- The readout toggle sits at the end of the same row.


## Terminal rail

*Frozen pending refinement — see tasks.md.*

- A contextual prompt and a typed answer at the top of the page, with no frame of its own.
- Past exchanges rise and fade off the top edge; the live line stays at the foot.
- Reverted steps show struck through.
- Suggestion chips fill the other half of the row, tiled in the same treemap shape a container
  uses, with the likeliest reading marked as the default.
- A chip either answers the question or runs a graph operation directly — add, link, open.


## Object explorer

**Contents**

- Structure and only structure: nodes nested to any depth.
- Groups, annotations and every other attribute never appear.
- Interfaces are hidden behind a toggle; when shown they sit at the same level as child blocks,
  sorted after them, with their own icon and no branch of their own.
- References are never listed — a reference is a second appearance of something already there.
- A node whose only children are interfaces still reads as a block.

**Navigation**

- Single click sets the scope: the canvas draws that node's view.
- Double-click or right-click renames in place — a row is all name, so it takes the same rule
  every name takes.
- Right-clicking the clear space below the rows makes a node in the open layer.
- A role icon precedes every name and doubles as the fold control where there is one.
- Folding is the user's alone; walking into a layer on the canvas never rearranges the tree.
- One control in the bar opens every branch or closes every branch.

**Layout**

- Levels are shown by indentation and faint guide lines.
- Deep branches indent past the sidebar rather than wrapping; the tree scrolls horizontally and
  centres on the depth of the selection, re-centring when the tree's shape changes.
- The horizontal scrollbar sits at the foot of the sidebar, not under the last row.

**Editing**

- Add, rename, delete, and drag rows between levels.
- Dragging a row onto the canvas places a reference to it in the open layer.
- A move to another layer drops what does not travel: the node's annotations — group
  memberships and note ties — and its relationships to anything staying behind. Its children,
  its interfaces and all the wiring inside it arrive exactly as they were.
- A move is never confirmed first; undo is the answer to a move that went wrong.


## Graph canvas

### Coordinates and layout

- Positions are stored relative to the canvas centre origin, so a layer stays centred as it
  grows in any direction.
- **Everything with a place of its own lands on a 24-unit grid** — cards, notes, the layer's own
  frame, and whatever automatic layout puts down. The backdrop dots are that grid.
- **A card is placed by its middle, not its corner**: its middle lands on the middle of a row, so
  it sits squarely on that row and overhangs it evenly. Being a whole number of cells wide, its
  sides still land on grid lines; being a cell and a half tall, its top and bottom borders sit
  the same small distance outside the row — which is where the interfaces on them sit.
- Snapping follows the pointer during a drag, so the lattice under a card is the one it settles
  on. The same snap runs when a layer is drawn, so a layer laid out before the grid existed comes
  onto it. The log keeps what the user did; the grid is how it is shown.
- Cards are as small as their contents allow: a block is **one grid row plus half a row of
  margin** (168 × 36), a container **three rows plus the same** (168 × 84). Nothing is held back
  for text that might arrive; a name too long for its card is clipped.
- Card sizes are whole **seats**. That is what makes the seats along an edge evenly spaced, and
  it is all a size has to satisfy.
- The container's band is two cells, so a block's middle and a container's middle are one cell
  apart and grid steps can bring them level. This is the size that is genuinely constrained.
- Seat count follows edge length. A block is one grid row tall, so its left and
  right edges hold **1 seat at the centre**. A container is taller, so its sides
  hold several (6); long edges hold 13. A small card offering few places to put
  an interface is the card being small, not the grid being coarse — an interface
  is 11 units wide and seats are 12 apart.
- A card is drawn at exactly the size the layout says it is; it never sizes itself to its text.
  A name too long for it is clipped.
- **A node the user has moved keeps its place until an arrangement is picked.** Picking one is
  the request to let go of it.
- `free` is the arrangement that honours placement and fills around it. The other three lay out
  the whole layer.
- A hand-made interface keeps its side and place along it whatever the arrangement does; so does
  a wall a right drag named. Layout may change the distance between two such ends, never the
  side.
- A hand-made port also **leans its unit across the rank**: one on the top edge pulls its owner
  toward the top, so its lines leave into open space. Only the two sides across the axis lean
  anything — rank itself comes from the relationships.
- The view refits when the layer gains or loses something, or when it is arranged afresh —
  never on selection.

**The layer's arrangement** — how it lays out what it holds. Four, each its own button, held
on the layer.

**Arrangements** — one-time actions, four of them. None is a mode, so none is ever "current".

| | Does |
|---|---|
| `grid` | tiles outward from the middle, cells sized to their contents |
| `radial` | the busiest unit at the centre, the rest ringed around it |
| `across` | ranks by relationships, left to right |
| `down` | ranks by relationships, top to bottom |

**Which way the layer reads** — `none`, `across` or `down`. A setting held on the layer. It
decides which sides a `flow` relationship attaches to, and **(planned)** how its line is drawn.
Arranging never changes it.

- Ranked: nothing pointing at it comes first, and each rank sits one step further along.
- Within a rank, things are ordered by where what they relate to sits in the rank before, swept
  forward then back, so related blocks come out level and crossings are fewer.
- A chain therefore comes out on **one row**, and every line along it is straight.
- Held on the layer's own node — a pipeline and a hierarchy can sit in one project. The root's
  is held on the project.

**What gets arranged is a unit, not a card.**

- A **unit** is anything laid out as a whole: a card, a group, or a note. Groups sharing a
  member are one unit — the shared card pins them together.
- Relationships draw units loosely into **clusters**, arranged as one region, with the cluster's
  own shape following its topology — a ring stays a ring, a series stays a series. **(planned)**
- A unit is **rigid in shape, not in size**: members keep their relative arrangement — who sits
  beside whom, on which side — while the distances between them are layout's, so the spacing
  tiers reach inside a unit as well as between them.
- Each axis is read independently, so a row stays a row, a column stays a column and a diagonal
  stays a diagonal. Members that already overlap on an axis come out aligned on it.
- A group nobody has placed gets an internal arrangement of its own, laid out among its own
  members, and that becomes its shape.
- A unit is sized to its members plus the room its boundary needs, so two groups are spaced
  apart rather than left with their boundaries touching.
- **Notes are avoided, not arranged.** A note takes up room like a card, so nothing is laid on
  top of one and no relationship is drawn through one — but an arrangement is never slid aside
  for one.
- **Space is a signal.** What matters is the contrast — tight inside a unit, open between them,
  so a group reads as one object and the lines between units have room to spread:

  | Between | Space |
  |---|---|
  | members inside one unit | half a cell |
  | two of those with a relationship between them | two cells — room for the line |
  | one unit and the next | two cells |
  | one rank and the next | three cells |
  | a boundary and its members | half a cell |
  | one cluster and another | wider **(planned)** |

**An arrangement writes down where everything landed.** Afterwards every card can be dragged
about like any other, and the drag sticks.

- It also moves each tied note to sit under what it describes, clear of the cards and boundaries.
  A note tied to nothing keeps its place.
- Walls a relationship was pinned to are kept — a wall is a hard constraint, not placement.
- It changes nothing else, and never the direction the layer reads.
- Between arrangements the layer rests: whatever is placed stays, and anything unplaced fills the
  room around it.

### Views

- **Root view** — the top level, no frame. The project is the root node.
- **Node view** — the inside of a node: a frame carrying its name, with margin for the
  interfaces on its edge. Everything outside the frame is dimmed.
- **Interface view** — the inside of an interface, marked by the parent's own border running
  through the dimmed margin and stopping where the frame begins, along the edge the port sits
  on.
- A layer with an axis draws its two **flow walls** as a doubled band just outside its own
  border — the sides a flow relationship enters and leaves by — so which way the layer reads is
  visible without reading a toolbar. The wall flows arrive at is brighter than the one they
  leave by, so the layer reads in the direction the wall fades. A `free` layer has neither.
- Interfaces sit on the frame's own line, inside the band. The band is outside the line, so
  nothing about where a port sits or where a line lands changes when a layer gains an axis.
- A node with no children still gets a full view; descending is how you start filling it.
- The frame carries its name set into its top-left border, a break in the line.
- The frame fills the panel; the band around it is the same on every side of every layer.
- A sparse layer still gets a full-size frame, shaped like the panel.
- Growth happens inside the frame: contents shrink within a constant working area.
- Layer changes animate the viewport; their contents cut. **(planned: nesting-doll transition)**

### Cards

- **Block** — a rectangle with its name and type, centred vertically in it.
- A card's name is **always one line**; too long for the card, it ellipsizes. A treemap cell
  wraps, being square; a card is a long bar and a wrapped name changes its shape.
- **Container** — the same, plus a treemap of its immediate child blocks.
  - Fixed 1|2 packing, not measured: one unit up to three children, two columns up to six,
    three tiles up to nine.
  - Nine chips is the cap; at ten or more, eight are drawn and the last reads `...`, which
    opens the container.
  - Each chip's fill shade follows how closely its name relates to the container's.
  - A chip's name shrinks to fit and hides when even the floor will not fit; hover names it.
  - Nesting stops at the first layer: a child container is marked as one and no further.
  - A container is barely bigger than a block; the cells shrink instead of the card growing.
- **Reference** — a stand-in for a node living in another layer, so that a relationship reaching
  it can be seen here. A visual shortcut; it changes nothing about the relationship.
  - Greyed, hatched and dashed, marked `↗`; the only dashed card on the canvas. The colour is on
    the lines, not the card: **a relationship reaching a reference draws violet and dashed**,
    label and arrowheads with it, so a line leaving the layer is told apart at a glance.
  - Shows the name of the node it stands for; renaming it renames that node.
  - Has no inside: double-clicking goes to where that node actually lives and selects it there.
  - Nothing nests into one, and it never becomes an interface.
  - Points at a real node, never at another reference — the explorer is the only place one is
    dragged from and it does not list them.
  - Placed only by the user, never automatically. Deleting one removes the placeholder only;
    it goes on its own when the node it stands for is deleted.
- Chips drag out of a treemap onto the canvas to lift that node into the open layer.

### Interfaces

- A small square on the frame edge, **filled when a relationship attaches and open when none
  does** — so a glance says which ports are wired and which only describe the shape.
- A divided square when it holds child blocks of its own; holding only interfaces gets no mark.
- Named beside it only on the layer's own frame; elsewhere on hover or selection.
- Unnamed, it reads `interface 1`, `interface 2` … per parent.
- **Made only by the user.** Right-clicking a card or a frame edge makes a bare one;
  right-clicking a seat a relationship put there promotes it to one where it sits. Drawing a
  relationship makes none.
- **A port and an anchor are different things.** A `flow` relationship's ends are typed — one
  in, one out — so they draw as interfaces. Every other relationship simply meets the card: its
  end is an **anchor**, a place on the border and no more, and draws nothing.
- An anchor shows a small round handle while its relationship or its card is selected, the same
  way a hidden interface does, so a line's ends can always be found.
- A line stops at the **outer face** of the square it meets, not at the border under it, so it
  meets an interface rather than running into it.
- Promotion is what an end is for when it needs a name, contents, or a place of its own that the
  arrangement will not move. Until then it is a seat and nothing else.
- Deleting a relationship deletes nothing: there is nothing at its ends to delete.
- **Sits in a seat**: seats fall on the canvas lattice (every 12 units), never on a corner —
  except an edge only one grid row tall, which holds a single seat at the centre. Counting from
  the canvas rather than from each card's corner is what lines a container port up with a block
  beside it. Stored as a fraction still, so a port survives its frame being resized; the
  fractions it can take are the ones that land on a seat.
- **No two sit in the same seat.** A drop onto an occupied one takes the next seat along.
- **The layer chooses seats** for relationship ends: a free lattice seat on a side that faces
  the path. Dragging an interface somebody made still slides it, and that placement is kept.
- **A right drag on the layer's frame names a wall**, and that end keeps it: the seat along it
  is still derived, but which of the four walls the line uses is the user's. It beats the side
  an axis would have given. `arrange` hands it back along with hand placement.
- Only the frame names a wall. A card has no border zone — a drag from anywhere on it means
  "from this card" — so there is no wall in the gesture to record.
- Click selects; drag slides it along its edge and around corners, with no first click to spend.
- Hiding them is a display preference: seats stay exactly where they were, and a seat shows as a
  round handle while its relationship or its card is selected.

### Relationships

- A plain line, undirected by default. Direction and reversal come from the attribute panel.
- Joins two **nodes** and meets each at a seat. The ends are the nodes; the seat is only where
  the line lands.
- Drawn by right-click-dragging from anywhere on a node, an interface, or a frame wall. It
  creates no interfaces. An end that set off from or landed on one keeps it as its anchor; an end
  that named a wall keeps the wall.
- Released over empty canvas, the far node is created too.
- `Esc` cancels the gesture.
- Right-clicking a line names its kind — a name is edited where it is drawn, and this is the
  last name on the canvas that took a different gesture.
- The kind a right drag makes is picked in the canvas toolbar: plain, flow, or assoc.
- **Flow** draws heavier and takes its sides from the layer's axis; **assoc** draws thinner and
  fainter; **plain** says only that the two are related and takes whatever side suits the path.
- Drawn curved or angular by the canvas toggle, which is global to the app.

**Where one is drawn**

- In any layer holding both its ends — directly, or through a reference standing in for one.
- An interface draws on both sides of its node's boundary: on the card from the layer outside,
  on the frame from inside. So wiring in to it and wiring out of it are two relationships, each
  with both ends in one layer, coupled by the one interface they share.
- A relationship need not go through an interface, nor stay within a layer. Anything may relate
  to anything; a cross-layer relationship is simply not drawn until a reference asks for it.
- Moving a node to another layer drops its **external** wiring — relationships to anything not
  travelling with it. Wiring inside it, including from its children to its own interfaces,
  survives. Nothing is rewritten, and no reference is placed to keep a dropped line visible.
- Drawn in two layers at once through a reference, it routes itself in each — the two arrange
  their nodes independently, and neither has anything stored to disagree about.

**Routing**

- **There is no manual routing.** Every line on a layer is worked out from that layer's
  arrangement, in one pass, every time it is drawn. Nothing about a line is stored.
- The pass picks each end's side and free lattice seat, then a min-bend orthogonal path that
  clears the other cards (with a small seat of clearance). Stubs leave along the side normal
  only — never into the attached card. Inside an open frame the whole path stays in the frame.
- **Every elbow is a right angle**, guaranteed on the way to being drawn rather than attempted.
- One pass, so each line sees the seats the ones before it took: **no two ends share a seat**,
  and several relationships may still meet at one interface.
- A `flow` relationship takes the sides the layer's axis gives it — out on the forward face, in
  on the one behind — so it runs with the layer rather than doubling back across it. On a `free`
  layer nothing is imposed.
- **Lanes**: runs that would share a line are spread half a cell apart, centred on where they
  would have gone, so parallel relationships stay distinct. Only the interior segments move;
  the ends stay on their seats.
- A card moving is what moves a line. There is no step, no history, and nothing to converge on.

### Groups

- Nodes sharing one attribute, drawn as a faint dashed boundary around them.
- The boundary is its members' bounds plus half a cell of margin, so it lands on the grid when
  its members do — its size is a fact about what it holds.
- Clicking the background selects it; dragging a selected boundary moves every member as one
  action.
- Dropping a card in the clear space inside joins; dropping it outside leaves. Dropping *on* a
  card is a move into that card instead.
- A node created inside a boundary joins that group, by the same reckoning as a drop there.
- A whole group moved together stays together, and layout moves one as a single unit — see
  Coordinates and layout.
- **One member is allowed**, made deliberately — a boundary is a way of marking a single block.
  `Ctrl`/`Cmd` + `G` makes one; right-click still makes an interface on a single card.
- **Falling** to one member removes the attribute instead of drawing it around one node. Made
  that way it stands; decayed to it, it goes.
- Boundaries overlap freely and their backgrounds compound.
- Its name is edited on the boundary itself.
- One appearance for every group; nothing to set.

### Notes

- A card of text placed in a layer, tied by faint dotted leaders to whatever it describes. The
  other way an attribute draws — amber throughout, since green is structure and amber is
  attributes.
- Solid, with a rule down its left side. Nothing else on the canvas carries one, and dashes are
  already spent on references and boundaries.
- Made by right-dragging the background. The rectangle is drawn as it is swept, in dashed amber
  — distinct from the green selection box the left button draws in the same place.
- **What it says is asked for before it is made**, the same as a node's name. Cancel and nothing
  is created.
- **The rectangle is its least size**: the note appears at the top-left corner and gets at least
  the room swept. It is as big as the larger of that and what it says, so text always wins.
- Right-clicking it rewrites it. The note *is* its text — there is nothing else on it to aim at.
- Ties to nothing, one thing or many. Right-drag from a node onto a note ties it; the same
  gesture over a node already tied unties it. The panel lists ties and removes them.
- A leader takes no pointer, cannot be selected and is never routed — it is not a relationship.
- Belongs to the layer it was drawn in, and moves within it by an ordinary drag.
- Survives losing every tie; goes only when deleted or when its layer does.

### Context and highlighting

- **One element highlights at a time** — the innermost thing under the pointer, which is what a
  click or right-click would act on.
- Precedence, first match wins:

  | Under the pointer | What lights |
  |---|---|
  | a multi-node selection | the selection |
  | a frame's or a boundary's name, or a note | that name — a note is one all through |
  | an interface | that interface |
  | a chip in a treemap | that chip |
  | a card | the card, border included — it is one target |
  | the layer's frame near its border | the frame |
  | a relationship | the line |
  | the clear space inside a boundary | the boundary |

- A group's boundary is transparent to the pointer until selected, so it is found by measuring;
  the tightest boundary the pointer is inside is the one that lights.
- Selecting makes the highlight fixed and less subtle.
- Nothing else highlights — in particular, not what a recent action changed.

### Controls

- Breadcrumbs top-left: the project and the last three layers, the middle elided to `…` with the
  full trail in its tooltip, plus `↑` for one layer up.
- Canvas toolbar top-right — **relationships**, all settings: interfaces on the canvas, the kind
  a right drag draws, curves or angles, and past a divider which way the layer reads. Each shows
  what it is on.
- Canvas arrangements bottom-right, opposite the zoom controls — **four verbs**. Icons only, and
  none of them is ever lit: an arrangement is something you do, not something a layer is in.
- Zoom controls bottom-left, riding above the attribute tray.
- Pan with the middle button, or by holding `Space` and dragging; zoom with the wheel. A plain
  left drag never pans.
- Panning is bounded to the layer's contents plus room on every side to put something new.
- Zoom will not go out past the frame plus its band, and re-centres when it arrives back there.

**The buttons divide by what they do, not by what they are over.** The left button handles
what already exists; the right button makes something new. Within the right button, a click
makes the thing that sits at a point and a drag makes the thing that has extent.

**Left drag**, by where it starts:

| From | Does |
|---|---|
| a card | moves it; onto another card nests it; in or out of a boundary joins or leaves |
| a note | moves it within its layer |
| an interface | slides it along its frame edge |
| a selected group's background | moves every member together |
| empty background, or an unselected boundary | draws a selection box, taking what it encloses |

Small precise targets — interfaces, notes — act at once. Large ones — a boundary, a multi-node
selection — must be selected first.

**Right button**, where the menu does not exist yet:

| On | Click makes | Drag makes |
|---|---|---|
| a card | an interface, at the nearest point of its border | a relationship, or a tie if let go on a note |
| the layer's frame edge | an interface on the frame | a relationship from the frame |
| empty background | a node | a note |
| a name | opens it for editing | — |
| a note | opens it for editing | — |
| an explorer row | opens it for renaming | — |
| the space below the explorer's rows | a node in the open layer | — |
| an interface | nothing — it is already one | a relationship from it |
| a seat a relationship put there | an interface of its own, where it sits | — |
| a relationship | names its kind | — |
| a multi-node selection | groups the selection | — |

- A card has no border zone: the click position decides where on the border the interface
  lands, but anywhere on the card will do. The layer's own frame is the exception, since its
  interior is the background.
- Nothing appears until a right drag pulls clear of the press, so a right click that wanders by
  a pixel is still a right click. `Esc` cancels.

**Keyboard**

| Key | Action |
|---|---|
| `Delete` / `Backspace` | delete the selection |
| `Esc` | clear the selection, back to the scope |
| `Enter` | rename the selection |
| `F` | fit the layer, or zoom to the selection if there is one |
| `Ctrl`/`Cmd` + `Z` | undo |
| `Ctrl`/`Cmd` + `Y`, `Ctrl`/`Cmd` + `Shift` + `Z` | redo |
| `Ctrl`/`Cmd` + `G` | group the selection |
| `Ctrl`/`Cmd` + `A` | select everything on this layer **(planned)** |
| `Shift` / `Cmd` + click | add to the selection |
| `Space` + drag | pan |
| double-click | descend on the canvas, rename in the explorer |

A relationship has no inside, so double-clicking one does nothing.

### Selection and scope

- **Explorer click sets the scope** — the layer the canvas draws. Every click there navigates.
- **Canvas click sets the context** — what is selected within the layer. It never navigates.
- Descending is always the deliberate second gesture: double-click into a card, double-click
  outside the frame to come back.


## Attribute panel

- A bar at the foot of the canvas, opening itself when the selection carries something to read.
- One state per selection:

  | Selected | Shows |
  |---|---|
  | nothing | the scope node — the layer you are inside — its body, type and attributes |
  | a block | its body, type, attributes, and the groups it belongs to |
  | an interface | the same, plus its flow marking |
  | a relationship | its kind, direction, reversal, and attributes |
  | a group boundary | that shared attribute: name, tags and members |
  | a note | its text, and what it is tied to |

- Body text is edited here; there is no separate document pane.
- Attributes are added and removed here; group membership is listed and can be removed.
- Adding to an existing group from the panel. **(planned)**
- Tags shown and edited. **(planned)**


## Readout drawer

- Slides in over the canvas from the right edge, toggled from the header.
- Three tabs, since only one is ever being read:
  - **relations** — the kinds this project uses, each with how many edges carry it. Add, rename
    (renaming every edge with it), or drop (leaving those edges unnamed).
  - **actions** — one line per step, newest first, reverted ones struck through.
  - **matching** — how each domain template scores against what is being typed.


## Naming

- A name is written the way it was typed and shown the same way everywhere.
- Only the role words an unnamed thing falls back to are lower case: `block`, `container`,
  `interface 3`. Giving a name replaces the description entirely.
- **A name is edited where it is drawn, by right-clicking it.** One rule for every name on the
  canvas — a card's, a boundary's, the layer's own frame. `Enter` commits, `Esc` abandons, and
  clicking away commits.
- A name is its own target: it highlights on its own, and the border it is set into stays dark
  beneath it.
- `Enter` renames the selection, for a hand already on the keyboard.
- The explorer renames on double-click, as a file tree does.
