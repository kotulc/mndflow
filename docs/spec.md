# Spec

**What each part does, package by package.** Short statements of the target.

- **Why any of it is this way** → [design.md](design.md). **What each word means** →
  [definitions.md](definitions.md).
- **The action surface in full** → [actions.md](monorepo/core/actions.md). **Behaviour rules** →
  [behaviors.md](behaviors.md).
- **What is missing** → [tasks.md](tasks.md). **The queue** → [plan.md](plan.md).

mndflow is a client-only app for assembling systems out of simple descriptive blocks. **There is no
server**: a step log lives in the session, and the graph is folded from it.

**The packages, and the one law.** Dependencies run one way, and **only `model` may name a closed
set** — anything else enumerating sorts of things is doing the engine's job in the wrong place.

| | Is | Depends on |
|---|---|---|
| `model` | the graph, the log, the door, the file, the ports | — |
| `layout` | sizing, placement, routing | `model` |
| `actions` | the closed action set | `model`, `layout` |
| `views` | the six view modules, each projecting a layer to a **Scene** | `model`, `layout` |
| `translate` | one-way emitters | `model`, `views` |
| `defs` | the shipped packages. Data, no code | — |
| `render` | Scene → React | `model`, `views` |
| `shell` | explorer, tray, chrome, composition root | all of the above |
| `terminal` | the optional text surface | `model`, `actions` |
| `embed` | the optional scorer | — |

**Hosts** bind ports and nothing else: `web`, `vscode`, `cli`.


## model

### The graph

**Everything is a block; a relationship joins two of them. There is no third thing.**

- **A block is the one element.** Placed, drawn, carries fields, holds other blocks. Held in
  `graph.blocks`. There is **no closed set of element sorts** — what a block *is* comes from its
  definition.
- **A block carries** `label`, `type`, `parent`, `body`, `x`/`y`, `w`/`h` where it has a least size,
  `arrangement` for when it is the open layer, `groups` for its membership, `of` where it is a
  reference, and `fields`.
- **A block carries no presentation of its own.** Colour, shape and the rest belong to its
  definition, so two things looking alike is two things *being* alike.
- **`type` names a definition** — open, and the user's. Empty until somebody sets one.
- **`of` makes a block a reference.** It holds the path of what the block stands for; `isReference`
  is derived from its presence.
- **Ownership separates the two child links.** A block **owns** a part; a **reference** stands for
  something living elsewhere. The tree is `parent` and nothing else.
- **Contained is derived**: a child that is a graph root is contained, not owned. That is what a
  folder and the workspace do, and it stores nothing new.
- **A container is derived, never declared** — a block holding blocks draws as one. It is a way a
  block *looks*, and naming it a sort of thing would make an engine-level answer to something that
  changes the moment a child is added.
- **An interface is declared, not derived.** It is a block module, made deliberately, and `side` is
  only where it sits — which is what lets it carry an anchor-slot surface, so a lifeline occurrence
  and a proxy port are the same object.
- **An interface carries** `side`, `at` (0–1 along that edge), `num` and `flow` instead of `x`/`y`.
  It exists only where somebody made one — a relationship makes none.
- `flow` on an interface (in / out / both) is decorative and constrains nothing.

**Root** — the block that holds every other in a project, under the reserved id `root`.

- Carries the project's name as its `label`, plus its own arrangement, body and fields.
- `parent: null` means *in the root layer*; root is told from its children by its id.
- No frame: a frame is a block seen from inside, and root has no outside.

**Relationships** — held in `graph.edges`.

- Carry `type`, the **relation module**, `dir` (none / forward / back / both), `from`/`to`
  interfaces, and the walls and offsets an end was given by hand.
- **The relation module is `line` or `directed`, and that is the whole set.** It says what the ends
  *are*: a line's are plain seats the layer places; a directed one's take the sides the layer's
  reading direction gives them. The module says there is a direction, `dir` only refines which way.
- **Anything joining two blocks is a relationship.** One may draw as something other than a routed
  line — a leader to a note takes no seats — but that is a rule about drawing.
- **Two properties are derived**: a relationship reaching a **reference** draws dashed and held
  back, and one reaching a **note** draws as a faint leader. Neither is a second sort of thing.
- **Containment is not a relationship.** The tree is `parent`.
- **No relationship carries a route.** Where a line goes is derived from the layer, every draw.
- `from`/`to` are set only where an end landed on an interface somebody made.

**Fields** — a named, typed value on a block or a relationship.

- Carry `name`, `form`, `value` and `tags`. **No identity**: addressed by name on its holder.
- **Never structural**: never in the explorer, never changing what contains what.
- **Five value forms, and the set is closed:**

  | | Holds | Extra |
  |---|---|---|
  | `text` | free string, the default | — |
  | `number` | a quantity | `unit` |
  | `flag` | true or false | — |
  | `choice` | one of a list the definition names | `choices` |
  | `link` | another block or definition, by id | `many` |

- **A `link` points without drawing**, which is how a part property or a satisfied requirement is
  stated. **A reference is drawn; a link is not** — that is the whole difference.
- **Membership is neither.** A block names its `groups`, and a group's members are derived from
  that, so the two can never disagree. A group is never a parent.

### Definitions

**A definition is a reusable subtype, held in `graph.defs`. One id space, three groups** — blocks,
relations, views — which is how a file reads and how import dispatches, not three id spaces.

- Carries `id`, `name`, `body`, the fields its usages have, `size` where a usage needs particular
  room, `names` (what other vocabularies call it, keyed by vocabulary), and `components`.
- **Every reference to a definition is by id**, so renaming one orphans nothing.
- **Presentation lives on the definition, never on the usage.** No colour among its values — a
  definition picks a **slot** and an **emphasis** within the theme, never a hue.
- **A definition that names no type has no presentation to read**, so an untyped card keeps the
  theme's own border. Otherwise *no type yet* and *deliberately quiet* would look alike.
- **A definition names one parent** and the chain is real: fields union with the subtype's winning
  by name, components merge per key. One parent, so no diamonds. `isa` walks it.
- **Extension is subtyping, never overriding.** A package's definitions are never altered.
- **A rule naming a definition means it or anything below it.**
- **Nothing shadows.** Every reference is a path — `proj_a9f/def_pump`, an id alone meaning this
  project — so two packages naming a thing alike are two definitions. Ambiguity is answered by
  presentation, both shown with the package they came from, never by resolution.
- **A `type` naming no definition is minted into one**, under an id derived from its name, so this
  settles rather than churning on every fold.

**`components` is the one place the schema grows.** A new capability adds a key under it, never a
field beside one.

| | Holds |
|---|---|
| `block` | which **block module** — the engine code behind one sort of block. Open; a definition saying nothing gets `base` |
| `card` | `layout` (`name`, `type`, `fields`, `compartments`, `icon`, `shape`), `shape`, where the label sits, and `shows` — which fields draw and in what order |
| `style` | `slot` and `emphasis`, `weight` and `voice`, and a named style set over the portable `line` and `head` |
| `view` | which view definitions this offers, the first being the default, and the abstraction cap `N` |
| `constraints` | `required` |
| `rules` | `ends`, `holds`, `degree`, `match` |

- **A component owns its key and reads no other's.** They share one block and one log, so the key is
  what makes them separable in fact.
- **Each validates its own key at the door.** One absent from the build validates nothing, so its
  configuration is *unvalidated* rather than wrong — which is how an older build opens a newer
  package. What a component refuses is dropped, and only that key.
- **A module supplies drawing, placement and a configuration surface.** It never answers *what may
  contain what* — that is a `holds` rule, which is data. Without that line, block modules are
  element forms with a longer name.
- **Presets** name coherent sets of component choices. Components configure independently, which
  multiplies fast; a view names a tested combination rather than inviting recombination.
- **The engine always places a rectangle.** A shape changes what is drawn, never where anything
  attaches.

**Constraints and rules.** A constraint bounds a thing in itself; a rule governs how things
interact. Both are declared on a definition and hold over every usage.

- **One constraint and four rules**, each a lookup, a count or one fixed comparison. No operators,
  nothing to parse, and **no rule language**.
- **What the five cannot say is a module's `validate` hook** — code, local, one usage at a time. A
  whole-model walk is a translator's to make.
- **They advise while modelling and refuse only at translation.** A model is legitimately
  unfinished, so a violation is a note in the tray. A translator asks the same checks as it emits
  and declines to write a non-compliant file.

### Packages

- **A package is data; a module is code.** A package ships definitions and costs nobody anything.
- **A package maps names and presentation, never structure.** A notation needing structural change
  is a module instead — and then it is *one engine capability plus a package*, shipping together.
- **A project draws definitions from a list of packages, in import order** — `graph.vocabulary`.
- **A package resists editing.** A write against one refuses with the reason and offers **unlock**
  or **fork**. A fork takes a new project id, so anything pointing at the original stays pointed
  there. Locked is the workspace's word, not the file's: the same project is a package you are using
  or one you are writing, depending on which you are doing.

### The three tiers

| | Contains | Owns | Holds |
|---|---|---|---|
| **workspace** | projects, packages, folders | nothing | **the log**, the metadata, all display state |
| **folder** | anything — independent roots | nothing | nothing of its own |
| **project** | — | a graph of blocks | its own vocabulary and settings |

- **Containment and ownership are different questions.** A folder says where something sits and
  never deletes what it held; a project is an ownership boundary.
- **The workspace is a block** and needs no new schema to be one. Its children are project roots and
  folders; it draws as a block diagram whose dependencies are derived from who references whom.
- **Making a project is making a top-level block**, through the same door as anything else.
- **A project comes into being by being named** — required, unique among siblings, and the naming
  *is* its first step. The app opens with no project rather than one nobody asked for.

### The log

- **One log, at the workspace.** One document, one history, so **nothing routes** and no action can
  write to the wrong place.
- Every change is one step holding one or more mutations; the graph is folded from the applied ones
  in order.
- **Undo flips the last applied step and refolds**; redo re-applies. No mutation needs an inverse.
  Undo is workspace-wide, which is what a single document means.
- **Undo restores the graph, never the context.** Where you are looking is the user's.
- **One gesture is one step**, however many things it changed.
- **Successive placements of the same thing are one step** — nudging a card writes one `place`,
  replaced as the run goes on. A different action ends the run; an arrangement never joins one.
- **Capped at 1,000 steps.** Past 1,200 the oldest fold into a single **checkpoint** holding the
  whole graph. The graph is unchanged; what is lost is reach. A checkpoint is not something anybody
  did, so it cannot be undone. Compaction also runs on load.
- **Folding one project replays everything**; checkpoints exist for exactly this.

### Files

- **An export is the graph, not the log** — `{ schema, id, graph, meta }`, pretty-printed JSON. Its
  size follows the model rather than how long somebody worked.
- **A project export is a query** over the workspace log, filtered to steps naming that project.
- **Importing one is a checkpoint**, so there is no second format and no second reader.
- **Importing replaces the session and is saved from then on** — a file is a snapshot, the session is
  the working copy.
- **A project carries an `id`**, minted once and kept for life, so renaming breaks no reference.
- **Nothing still at its default is written** — a file the size of the choices in it.
- **The base is what cannot be ignored**; everything else is `meta`, free-form and safely ignorable.
  The test is whether dropping a field changes what the project *is*.
- **Major schema must match; a higher minor is readable.**
- **The content hash is computed, never stored.** **Exporting changes nothing**, so re-exporting an
  unchanged project is byte-identical — which is what the canonical layout is for.
- **Laid out for reading**: definitions first, then the block tree, then relationships. Blocks nest
  under their parents so `parent` is never written; siblings sort by id so a rename is one line;
  relationships sort by source then target.
- **Ids say what they point at** — `block_`, `edge_`, `def_`, `step_`, `proj_`. A name is never part
  of an id.
- **Display preferences stay out**, `meta` included: opening somebody's file must not rearrange your
  toggles. An exported project carries no opinion about how to draw it.

### The door

- **Every log comes in through one door**, from storage or a file, and is checked before it is
  folded. What can be repaired is repaired; what cannot is dropped rather than folded into a broken
  graph.
- **The user is told once** — `repaired 2, could not read 1` — and a clean log says nothing. **A
  normalisation that carried nothing is not a repair**: a false alarm is what teaches people to
  ignore the real ones.
- **A module the build does not know falls back to the base block, and says so.** Falling back
  silently is the one thing to avoid.

### Ports

**The entire host contract.** Declared here, bound by a host, implemented nowhere else.

| | Is |
|---|---|
| `storage` | where the log and the display state live between sessions |
| `files` | anything leaving or entering — export, import, a rendered drawing |
| `net` | fetching a package from outside the workspace |
| `score` | text similarity, for ranking. **Optional**: absent falls back to substring |

- **Nothing but the ports may assume where a project lives.**
- **When storage fills, the app says so and carries on** — `⚠ not being saved — export`. Only
  persistence has stopped. History for untouched projects is checkpointed first, being the cheapest
  thing to give up.


## layout

**Derived beats stored.** Anything workable out from the layer is worked out — seats, routes,
boundaries, roles, control nodes. Only choices are written down.

**A hand-laid thing is a hard constraint; a derived one is not.** What somebody placed or declared
is honoured; everything else is the layer's to arrange. A computed arrangement replaces where
things draw and never what was placed, so returning to `free` gives it back.

### The grid

- Positions are relative to the layer's centre origin, so a layer stays centred as it grows.
- **Everything with a place of its own lands on a 24-unit grid** — cards, notes, the frame, and
  whatever automatic layout puts down. The backdrop dots are that grid.
- **A card is placed by its middle**, so it sits squarely on a row and overhangs it evenly.
- Snapping follows the pointer during a drag, and runs again when a layer is drawn. The log keeps
  what the user did; the grid is how it is shown.
- **Cards are as small as their contents allow** — a block one grid row plus half a row of margin
  (168 × 36), a container three rows plus the same (168 × 84). Nothing is held for text that might
  arrive; a name too long is clipped.
- **Card sizes are whole seats**, which is what makes seats along an edge evenly spaced.
- **Seat count follows edge length.** Seats fall every 12 units, never on a corner — except an edge
  one row tall, which holds a single seat at its centre. Counting from the canvas rather than from
  each card's corner is what lines a container's port up with a block beside it.

### Arrangement

**One setting on the layer, with the model** — how a graph *reads*, not how it is displayed. It must
be model data, because **inference reads it** and an inference is permanent: were the reading
direction display state, the same model would infer differently depending on how somebody was
looking at it.

**Six values**, of which four carry a reading direction and two do not:

| | Does |
|---|---|
| `free` | hand placement is what draws; anything unplaced fills the room around it |
| `grid` | tiles outward from the middle, cells sized to their contents |
| `right` / `left` / `down` / `up` | ranks by relationships, reading that way |

- **Ranked**: nothing pointing at it comes first, each rank one step further along. Within a rank,
  things are ordered by where what they relate to sat in the rank before, swept forward then back,
  so a chain comes out on one row and every line along it is straight.
- **A reading direction decides which sides a `directed` relationship attaches to**, biases rank and
  placement, and routes the line along that bias. `free` and `grid` carry none, so a layer using
  either has no implied order and inference falls through to connectivity.
- **Nothing is discarded by arranging.** A block's placement is always kept; a computed arrangement
  replaces where things *draw*, never what somebody placed, so returning to `free` returns their
  layout. That is what makes arrangement safe to be a setting rather than an act.
- **It keeps walls a relationship was pinned to** — a wall is a constraint, not placement.

### Units and spacing

- **A unit is anything laid out as a whole** — a card, a boundary, or a note. Boundaries sharing a
  member are one unit.
- **A unit is rigid in shape, not in size**: members keep who sits beside whom, on which side, while
  the distances are layout's. Each axis is read independently, so a row stays a row.
- **Relationships draw units into clusters**, arranged as one region, the cluster's shape following
  its topology — a ring stays a ring, a series stays a series.
- **A unit is sized to its members plus the room its boundary needs**, so two boundaries are spaced
  apart rather than left touching.
- **Notes are layout units.** An arrangement seats each tied note under what it describes; one tied
  to nothing keeps its place.
- **Space is a signal** — what matters is the contrast, tight inside a unit and open between them:

  | Between | Distance |
  |---|---|
  | members inside one unit | half a cell |
  | two of those with a relationship between them | two cells |
  | one unit and the next | two cells |
  | one rank and the next | three cells |
  | a boundary and its members | half a cell |

### Routing

- **There is no manual routing.** Every line is worked out from the layer's arrangement, in one
  pass, every time it is drawn. Nothing about a line is stored.
- The pass picks each end's side and free seat, then a **min-bend orthogonal path** clearing the
  other cards. Stubs leave along the side normal only. Inside an open frame the path stays in the
  frame.
- **Every elbow is a right angle**, guaranteed on the way to being drawn.
- **One pass, so each line sees the seats taken before it.** No two ends share a seat; several
  relationships may still meet at one interface.
- **A `directed` relationship takes the sides the reading direction gives it** — out on the forward
  face, in on the one behind — and its path runs with that bias.
- **Lanes**: runs that would share a line spread half a cell apart, centred on where they would have
  gone. Only interior segments move; the ends stay on their seats.
- **Cheap first.** Seats try a plain orthogonal path; a visibility-graph skirt runs only when every
  seat pair needs one, and those skirts share one prepared graph.


## actions

**Everything that changes a project is a record on one registry**, read by every input surface.

- Each carries a **name**, a **sentence** saying what it does, the **scope** it applies to, typed
  **arguments**, and a **run** returning mutations.
- **The sentence is what gets matched**, so *lay it out* reaches `arrange`. Names are too short.
- **Arguments are typed** — text, block, choice, number, or a position. An input surface offers
  whatever it can fill, so eligibility is derived rather than declared.
- **A position can only come from a gesture.** An action needing one is reachable only that way; one
  where it is optional is reachable from anywhere, and the layer places what it was not given.
- **`when` decides whether an action is shown; `check` decides what happens when it runs.** Not the
  same test, and `check` cannot be answered until the arguments are filled.
- **An action returns mutations and may also ask** for a layer to be opened, a selection moved, or a
  line to be said. It changes nothing itself.
- **An action refuses in words**, and the refusal goes to the strip like everything else the app
  says.
- **One step per action**, whatever it took to do it.
- **The offered list is membership only** — everything whose scope matches and whose `when` says
  yes, with no ordering of its own. Menus draw it in a fixed order; the terminal ranks it. It lives
  beside the actions, so removing the terminal does not take the menus.
- **A required `choice` expands into one entry per option**, because a menu asks no questions. The
  action set does not widen — one action, offered several times with different arguments.
- **What does not apply is not shown.** Greying out is for a fixed row whose positions are worth
  learning; a list built from the selection has none to keep.
- **A module adds no action for anything it draws.** A module is a vocabulary, renderers, a layout
  law and a gesture map.

**Every action, adjustment and gesture is enumerated in [actions.md](monorepo/core/actions.md).**


## views

### The Scene

**A view module projects a layer and returns data, never elements.**

```
project(graph, layer, config) → Scene
```

```
Scene { boxes, routes, slots, hits, bounds }
```

- **`boxes`** — what is placed: id, rect, definition, label, marks.
- **`routes`** — where each line goes: ends, lane, points, relation module.
- **`slots`** — which chrome groups this projection offers.
- **`hits`** — a region and the gesture it answers to. **The gesture map belongs to the module**, so
  two modules may bind one action to different gestures and neither knows what a DOM node is.
- **A Scene imports nothing drawable**, which is what lets a notation be tested headlessly, an
  emitter reuse the projection, and a second host reuse both.

### What a module owns

**The projection surface is per module, never per definition** — every diagram has a frame because
diagrams project onto a plane, not because a definition asked for one.

| | Is |
|---|---|
| **the surround** | a frame and its walls, or nothing |
| **the viewport** | a camera, or a scrollbar. What *fit* means here |
| **the chrome** | which control groups it offers |
| **asking** | where a gesture puts a question, since one asks for a name before anything is made |
| **adjustments** | which of the four it accepts, and it may accept none |

- **A view module names actions; it never writes mutations.**
- **An unregistered `type` falls back to the engine's card.** A module declares what it draws
  *differently*, so a half-built one is usable.
- **A layout law may decline to place**, and then the layer arranges as usual — stored positions
  held, everything else filled around them.

### The six

**Closed.** `block`, `table`, `matrix`, `activity`, `sequence`, `state`. Each publishes a distinct
icon and a word for what it calls its elementary block.

| | Draws |
|---|---|
| `block` | the default: a frame, cards, boundaries, routed lines |
| `table` | rows and no frame; a column per field the layer's rows carry |
| `matrix` | two axis views, cells marked by the relationships between them |
| `activity` | actions and control nodes, order along the flow |
| `sequence` | a column per participant, order running down |
| `state` | states and transitions over the same layer |

- **Which view is showing is display state**, kept in the workspace and never in the log. The
  definition's `view` component supplies which modules are offered and the default.
- **There is no derived project kind**, so any project can be switched to any view it is offered.

### Views as blocks

- **A saved view is a block** whose definition names a view module, holding one reference per thing
  shown. It costs no concept.
- **Everything a view shows is a reference** — a card, a table row, a matrix axis label alike.
- **Things arrive by being put there**, and adding one touches nothing else.
- **A view holds views.** A matrix's two axes are child views, so a filter or a third dimension
  costs nothing new.
- **A reference resolves across open projects.** A reference into a closed project reads **closed**;
  a genuinely gone target reads **missing**. A missing target is kept, never tidied away, so undoing
  a deletion elsewhere brings it back.
- **What is done through a reference reaches home.** Renaming one renames the block. One rule: the
  change is written where the block lives.
- **A relationship across two projects is a reference plus an ordinary edge**, both in the project of
  the end making the claim, so no relationship spans two projects.
- **Depth** says how far a reference reaches — `self`, `children` or `all`. Drop a project root into
  a view with `children` and its blocks are the rows.
- **Nothing about how a view looks enters the project it reads.**

### Composition

**Inference makes blocks; composition arranges references.** Two different things, and separating
them is what makes view work tractable.

| | Makes | Runs | Is |
|---|---|---|---|
| `infer` | **new blocks** | once, when somebody asks | model, and permanent |
| composition | **nothing** — a grouping, spacing and ordering | every draw | presentation, recomputed |

**A view holds references drawn from many layers**, and something has to decide how they group,
space and order:

| View | Groups by | Orders by |
|---|---|---|
| `block` | source layer | the arrangement's reading direction |
| `table` | a chosen column | sort |
| `matrix` | axis membership — its two child views | within-axis order |
| `activity` / `state` / `sequence` | lane, from the reference | the four order tiers |

**It runs on one metric: proximity** — how far apart two referenced blocks are in the tree, which is
a path distance and deterministic. **Group** by nearest common ancestor, **order** by tree path,
**space** by distance where the view has room. A table and a matrix have rows, so they take the
grouping and the order and drop the spacing.

- **A proximity group is a derived group.** The `group` definition already draws a boundary round a
  set of references, so nothing needs storing for one to appear.
- **Proximity is the default and must be overridable.** A view whose point is a cross-cut — every
  requirement across five projects — wants grouping by type, and proximity would give it exactly the
  grouping it was built to escape. The alternative is a view definition option.
- **No view module declares what a block becomes.**

### Behavior

**An overlay on a structure, never a second model of it.** The engine has no behavior branch and
needs none — a behavior model is one package plus three view modules.

- **A behavior project holds references to the participants, never parts**, so a structure block
  never appears in a behavior tree.
- **`infer` is how one comes to exist**: a selection becomes one behavior block, **always a new
  top-level one**. One-way, one-time, deterministic over the selection; re-inferring makes a new
  block rather than disturbing one somebody has worked on.
- **It composes** — a selection of actions infers a `state` block the way structure infers an
  `activity`.
- **A container is an activity, a leaf is an action.** Derived, not stored.
- **Order is read down four tiers** — a `flow` subtype, then any directed relationship, then
  position along the layer's arrangement, then adjacency. **Inferred order draws dimmed**, so a
  guess never reads as a statement.
- **An action's label is derived and dimmed** — the module's verb and the participant's name, `do
  Pump`. Typing over it stores a real name.
- **Lanes come from the references**, one per participant, so they always exist. Past **N** actions
  the inference cuts higher in the tree; `N` is `view` configuration, default 5.
- **It states only what the structure stated.** Interfaces a flow implies are written to the
  participants; anything guessed from position writes nothing.
- **Participation is derived**, so a structure project opened alone reads clean.
- **Nothing is derived that somebody edits.** Control nodes, messages and lanes are counted and
  drawn; states are blocks, because people name and nest them.


## translate

- **One way out, and it never writes back.** A translator reads a project and emits source, a
  drawing or a standard's file. The action that ran it may record a `resource` block; the translator
  never touches the graph.
- **It asks the same checks as it emits** and declines to write a non-compliant file.
- **A name map needs no layout**; a drawing reuses a Scene rather than re-deriving one.
- **SysML is a translation layer, never a shape the model bends to.** Nothing in the map is a special
  case: a part property is a block with a parent, a value property is a typed field, a port is an
  interface, a constraint parameter is an interface so a binding is an ordinary relationship, a
  requirement is a block with two fields.
- **Two losses are accepted rather than solved**: a trace assertion keeps its claim as a typed group
  and loses the bracket notation, and lifeline order is presentation living in the view.


## defs

**Data only. No code.** Every definition is validated by the door in CI, and every module it names
must exist.

| | Ships |
|---|---|
| `base` | one definition per block module — `workspace`, `project`, `folder`, `structure`, `view`, `resource`, and `group` / `note` extending them. **Shipped and locked**, and known to the engine by id |
| `core` | the starting vocabularies — software, website, writing, research, product, freeform |
| `terms` | what each domain calls a block, a boundary, a relationship |
| `requirements` | requirement, plus five relationships |
| `flow` | control, object, transition |
| `parametrics` | constraint, with size and style |
| `behavior` | `action` and `state`, and the activity / sequence / state words |
| `sysml`, `uml`, `uaf` | formal `names` and mappings over the definitions above |

- **The engine may key off a base definition only for how a block draws and where it sits** — never
  for what it is, and never for what may contain what. Without that line the base package is element
  forms wearing a different hat.
- **The one exception is named**: `view` holds references only, and the engine enforces it. A view
  whose members could be owned is a folder.
- **A package must be useful with portable presentation alone.** It brings its data and renders on
  the simple typed fields, gaining its custom look only where the module and stylesheet it names are
  in the build. It degrades rather than breaks.


## render

**Scene → React, and nothing else.** It reads what a projection placed and knows nothing about the
graph.

### Cards

- **Block** — a rectangle with its name and type, centred. A name is always one line and ellipsizes.
- **Container** — the same, plus a treemap of its immediate children. Fixed packing, not measured;
  nine chips is the cap and the tenth reads `...`, which opens the container. Each chip's shade
  follows how closely its name relates to the container's. Nesting stops at the first layer.
- **Reference** — greyed, hatched and dashed, marked `↗`; the only dashed card. It shows the name of
  the block it stands for and has no inside: double-clicking goes to where that block lives.
  **One per layer per block**, and never for a block already in that layer.
- **An appearance is the reference's; the thing is the block's.** Where it sits and how it draws are
  its own; its name, body, fields, interfaces, children and type are the block's.

### Interfaces and anchors

- **A small square on the frame edge**, filled when a relationship attaches and open when none does
  — so a glance says which are wired and which only describe the shape.
- **A port and an anchor are different things.** A `directed` relationship's ends are typed, so they
  draw as interfaces. Every other end simply meets the card: an **anchor**, a place on the border
  and no more, existing only where a line actually lands.
- **An end draws through whichever handle exists** — the interface's, or the anchor minted with the
  relationship. One reader decides both.
- **Dragging an anchor slides it between free seats and around corners, without promoting it.** A
  moved anchor draws solid, to say the position is yours. Promotion is a separate act.
- **A line stops at the outer face** of the square it meets, so it meets an interface rather than
  running into it.
- **No two sit in the same seat.** A drop onto an occupied seat takes the next along.
- Hidden interfaces keep their seats, and show as a round handle while their line or card is
  selected.

### Relationships

- A plain line, undirected by default. Drawn by right-dragging from a card, an interface or a frame
  wall; released over empty space, the far block is made too.
- **What a right drag makes is picked before it** — plain, directed, then the types in scope — so
  the kind is settled by the gesture rather than corrected after it.
- **An interface draws on both sides of its block's boundary**: on the card from outside, on the
  frame from inside. Wiring in and wiring out are two relationships coupled by the one interface.
- **A relationship need not stay within a layer.** A cross-layer one is simply not drawn until a
  reference asks for it, and one drawn in two layers routes itself in each.
- **Moving a block drops its external wiring** — relationships to anything not travelling with it.
  Wiring inside it survives. Nothing is rewritten.
- Drawn curved or angular by a global setting.

### Boundaries and notes

- **A boundary is a view at layer scope** — a swimlane, a region, a package boundary, a trace
  assertion. Its members are references, so it owns nothing and is never a parent.
- **Its bounds are its members' plus half a cell**, so its size is a fact about what it holds.
- Dropping a card in the clear space inside joins; outside leaves; *on* a card is a move instead.
- **One member is allowed.** A boundary emptied entirely goes, having nothing to draw and no way to
  be reached.
- Boundaries overlap freely and their backgrounds compound. A bare one is a faint dashed line, which
  is a default rather than a rule.
- **A note is a block of text**, solid with a rule down its left side. Made by right-dragging the
  background; **what it says is asked for before it is made**. The swept rectangle is its least
  size, and the SE handle resizes it after.
- **A leader is picked and deleted like any other line.** It stays the faintest thing on the canvas
  until it is picked, and then it says so.

### The theme

- **A theme is a ramp, and it reaches the drawing.** **Slots × steps**: a step is a job (`fill`,
  `raised`, `line`, `edge`, `dim`, `ink`, plus `ground` and `divide`) and means the same job
  everywhere; a slot is a family.
- **Six pickable slots** — `primary`, `secondary`, `tertiary`, `quaternary`, `neutral`, `muted` —
  and **four reserved to the app**: `away`, `note`, `error`, `warn`.
- **Slots are theme-relative, never hues.** `primary` is one colour in one theme and another
  elsewhere. The reserved four keep their hue across themes, since *elsewhere* and *a note* mean one
  thing everywhere.
- **Steps are computed, not written.** A theme declares a lightness ladder and two numbers a slot;
  `oklch()` does the rest. A new theme is about twenty numbers.
- **`line` and `stroke` are two jobs**: a card's border sits against `fill`, while the frame, the
  walls and a route are drawn on the canvas ground.
- **The shell reads the same ramp**, so the header cannot drift from the canvas.
- **A structural stroke divides by the zoom.** The canvas publishes `--zoom`, and the frame, the
  walls and a card's border read it, so their apparent width is constant.

### Highlighting

- **One thing highlights at a time** — the innermost under the pointer, which is what a click would
  act on. Precedence, first match wins: a multi-block selection, a name or a note, an interface, a
  treemap chip, a card, the frame near its border, a relationship, then the clear space inside a
  boundary.
- **A boundary is transparent to the pointer until selected**, so the tightest one the pointer is
  inside is the one that lights.
- Selecting makes the highlight fixed and less subtle. **Nothing else highlights** — in particular,
  not what a recent action changed.


## shell

**Branding, navigation and the workspace. It owns nothing about a diagram.**

### The page

- One page: header, optional terminal, then explorer beside the stage.
- **The header names the project in context** — the one the selected explorer row belongs to.
- **On a narrow window the header yields**: the identity truncates, the tool cluster stays put, and
  the stage clips rather than letting chrome steal its room.
- **Controls are icons with tooltips**, each greying out when it has nothing to do, and all at one
  weight.
- **One export door each**: the header is workspace-scoped; a project's own export sits on its row
  in the tree, where project scope lives.
- **New workspace asks before discarding**, then clears the session and leaves a blank workspace.
- **It names the working session**, held quiet. When storage stops accepting the log the same
  control stops being quiet, because the answer to both is that button.
- **One icon cycles the looks**, wearing the one that is on, its tooltip naming the next.
- **A panel that cannot draw itself says so and stays out of the way** rather than taking the window
  with it. The log is unharmed, so closing it and carrying on is the way out.

### Explorer

**Structure and only structure**, nested to any depth.

- **The tree is blocks.** Boundaries, notes, fields and references are never listed — a reference is
  a second appearance of something already there.
- **Interfaces are behind a toggle**; shown, they sit level with child blocks, sorted after them.
- **Every open project is a root in the same tree**, filed into the folders the workspace keeps.
  **The project a selected row belongs to is the context** — positional, so there is no mode.
- **The open layer and the selection are two states with two looks.** *Open* is where the stage is
  pointed and draws as a wash; *selected* is what an action would act on and takes the accent. They
  stack, and selected reads first — otherwise *nothing is selected* is unsayable.
- **Multi-select** builds a selection across blocks, branches and projects.
- **Every row is draggable**, and the drag carries a cross-project reference. Dropping on a row files
  it there; **dropping in the clear space below makes the block a project**, since a project is a
  block nothing contains. Promoted, the block *is* the project.
- **Filing a project root is one step**: it moves into a folder, out to the workspace root, or back
  to the unplaced list. The project stays a project.
- **A move drops what does not travel** — group memberships, note ties, and relationships to
  anything staying behind. Children, interfaces and internal wiring arrive as they were, and the
  strip says how many lines were lost. A move is never confirmed first; undo is the answer.
- **Single click sets the scope** and opens the branch. **Double-click renames in place.**
  **Right-click opens the offered list** for the selection, in fixed order, built against the
  project the row lives in and bringing it into context.
- **The bar's `＋` follows the selection** — nothing selected names a project, a project makes a
  block inside it, a block makes one under it. The tooltip names which, so the meaning is never
  hidden, and **deselection is how you get back to naming a project**.
- **The bar's delete follows it too**: a project root asks first and is a workspace operation, not
  in the log at all; anything else is one undoable step.
- **Every role carries a mark** — leaf, container, interface, folder — and a container is a filled
  square where a leaf is outlined, because the fill is what says it holds something.
- **A project root's icon folds the project while the row click still switches to it**, so the two
  never collide. Projects are open by default.
- **Fold-all and expand-all are one control** reading *anything open at all*, project roots
  included.
- **Width is capped** at `min(280px, 36vw)`, and it collapses to a strip. Deep branches indent past
  the pane rather than wrapping; the tree scrolls horizontally and centres on the selection's depth.
- **Undo and redo read as words at the foot**, with one line naming the last action.
- **Folding is the user's alone**: walking into a layer never rearranges the tree.

### The tray

**A table of everything the open layer holds** — blocks, interfaces, relationships, boundaries and
notes together. It is the only place a relationship or an interface is found without hunting for it
on the drawing.

- **Two sizes, shut and open.** Putting a table on the stage is a different thing, and the toggle
  does that.
- **Nothing closes it but its own control** — a click on the canvas is how a row gets selected, so
  shutting on one hid the thing being inspected.
- Open, the stage shrinks and re-centres rather than being covered, and **the frame reshapes to the
  room it is left**. The tray's height does not change with what it lists, so filtering never moves a
  row from under the pointer.
- **The head is kind / name / what / type**, because every row answers it. Beyond that, a column is a
  field in scope, picked from the `columns` group — the **table's** state, never a definition's.
- **Hovering a row lights that thing on the stage**; the canvas's own hover wins where they
  disagree. **Clicking selects it.**
- **Constraint and rule notes advise here and never refuse.** Short notes sit in the *what* column;
  selecting a noted row says the full sentences once in the strip. Edits still go through.
- **Row buttons carry whatever that row can be told to do**, and *what it says* opens the row out —
  its body, its memberships and its fields.
- **Definitions are editable here** — fields, defaults and presentation, each form with its own
  control.
- **A row dragged out of the explorer lands here as a reference**, the same `refer` the stage takes.
- **A column reads through a reference**, as the name column does.

### The chrome column

- **Every control the thing on the stage has is in one column**, fixed to the page's right. **A real
  column, not an overlay**: the stage ends where it begins, so chrome never sits on the drawing.
- **A view module declares which groups it offers** and the column draws them in a fixed order. A
  matrix has no interfaces toggle because it declares none, never because one was greyed out.
- **`types` is the one group the page cannot build alone**, so a module declaring it also answers it.
  **Nothing picked is everything**, and a pick no longer on the layer reads as everything rather
  than as a filter hiding all of it.
- **The column scrolls, and no group ever collapses**, since that is hidden state.
- **An icon over one word, under a group label.** Every word the app owns is a single word; a
  relation type's is a definition's name, so it wraps rather than being clipped. **A control never
  repeats its group's label.**
- **A verb never lights** — `arrange` has no state to be in, which is the plainer signal.
- **Arranging needs geometry only the stage has, so the stage publishes it upward** and the column
  calls what it was handed. The shell never reaches into the stage.
- **A strip at the foot of the stage says what is selected and what it could be** — its name, then
  the types offered for it, capped, with *More…* expanding the same surface in place. Universal: a
  block, a boundary, a note, an interface and a relationship all answer it.

### Naming

- **A name is written the way it was typed** and shown the same way everywhere.
- **Unique among siblings** — where something sits is what makes it unique in the project. Only
  stored labels are compared: a fallback is a number nobody chose, and blank is not a name.
- **An unnamed block falls back to its role and its number** among siblings — `block 1`,
  `interface 2`. `num` is fixed at creation and takes the lowest not in use, so deleting one leaves
  a gap the next fills and renames nothing.
- **A note is exempt** — a note *is* its text, and nothing beside it competes.
- **A refused name says so in two places**: the field marks itself and reads *taken* as it is typed;
  on `Enter` the full reason goes to the strip, and the field holds open with the typing intact.
- **Every name is typed into the same field**, so the rule reaches all of them at once.
- **A name is edited where it is drawn.** `Enter` commits, `Esc` abandons.

### One channel

**Everything the app says goes to the strip at the top of the stage** — a refusal, a repair report,
a storage warning, a rule note. One place to look, dismissable, and silent when there is nothing to
say.


## terminal

**One collapsible strip. Not a chat, not a command palette.** The app is whole without it, and
nothing below it may import it.

- **Two functions, told apart by whether it is open.** Collapsed, it is the primary text entry point
  and asks nothing. Expanded, it is guidance: the question worth answering next, a gloss on what is
  in front of you, and a tutorial walked over a sample project.
- **It reads context and never changes it** — because it *ranks against* context, and a surface that
  moved context would shift the ground its own ranking stands on. The explorer and the pointer
  navigate.
- **It reaches actions and never writes a mutation of its own.**
- **Chips are the offered list.** Idle, they order by learned preference for the situation's shape;
  typed, they rank by similarity through the `score` port, with substring as the cold fallback and
  an exact prior entry pinned first.
- **Ranking is learned, and overruling it is the feedback.** Taking a chip that is not the highlight
  records; confirming the highlight writes nothing. Local only, never logged.
- **`Enter` confirms the highlight and arrows move it**, because a default that is invisible and
  changes under the user is the version of adaptive ranking worth avoiding.
- **Every capability it adds must exist without it.** If the only way to do something is to say it,
  it has stopped being optional.
- **Nothing it owns may be a general need.** Vocabulary and terms belong to a package.


## embed

- **Sentence similarity in the session**, behind the `score` port. Nothing is downloaded at run time.
- **Optional by construction.** Absent, ranking falls back to substring and the app is whole.
- **Assets are the reason it is its own package** — a host that cannot carry them binds no scorer
  rather than shipping a scorer it cannot use.


## hosts

| | Binds |
|---|---|
| `web` | session storage, download / picker, `fetch`, the scorer. **The primary product** |
| `vscode` | workspace state, editor dialogs, extension `fetch`, **no scorer** |
| `cli` | a file, `fs`, `fetch`, no scorer. Folds, validates, projects to text, emits |

**A second host is a shell over the same app, never a second implementation.** It binds ports and
composes packages; it adds no behaviour and no second copy of anything.


## tests

**Properties, never values.** Nothing asserts a coordinate, an id, a message or a count that tuning
would change — the suite pins what must stay true, not what happens to be true.

| Package | Proven by | Needs a browser |
|---|---|---|
| `model` | fold determinism, door repairs, containment, undo-by-refold, file round-trip | no |
| `layout` | no overlap, containment, route termination, stability under reorder | no |
| `actions` | `check` agrees with `run`; every action's `writes` is honest | no |
| `views` | Scene invariants per module, over text projections of shape rather than coordinates | no |
| `defs` | every shipped definition passes the door; every module it names exists | no |
| `translate` | emitted artifacts re-import to an equivalent graph | no |
| `render` | one conformance test: every Scene element draws, every hit binds | yes |
| `shell` | driven, not asserted | yes |

- **The dependency law is a test**: the workspace graph matches the table at the top of this file,
  and no package outside `model` declares a closed set.
- **A contract many modules keep is tested once over all of them.**
- **Driving the app is the acceptance test**, and a green suite closes nothing on its own.
