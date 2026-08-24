# Spec

**What each part does, package by package.** Short statements of the target. The reasoning is in design.md, which is authoritative; the vocabulary is in definitions.md.

mndflow is a client-only app for rapidly composing descriptive blocks into systems models. **There is no server**: one log lives in the session, and the graph is folded from it.

**The one law.** Dependencies run one way, and **only `core` may name a closed set** — anything else enumerating sorts of things is doing the engine's job in the wrong place. Both halves are a test.

| Package | Is | Depends on |
|---|---|---|
| `core` | the graph, the log, the door, the file, the action set, the ports | — |
| `layout` | sizing, placement, arrangement, routing | `core` |
| `views` | the three view modules, each projecting a layer to a **Scene** | `core`, `layout` |
| `defs` | the shipped definition packages. **Data, no code** | — |
| `theme` | the ramp, as CSS custom properties. **No code** | — |
| `fixtures` | sample **logs**, and sample **files** for the seam, shared by the apps, every suite and every dev harness | `core`, `defs` |
| `render` | Scene → React | `core`, `views`, `theme` |
| `ui` | explorer, stage, options, tray, terminal | `render`, `core`, `theme` |

**Apps bind ports and nothing else**: `web` — Vite, the primary product — and `cli`, headless, which folds, checks and projects to text.

**Boundaries exist to enforce direction and to let each package be proven on its own.** They are not an API surface anyone has to keep; one version, never published, and a boundary that turns out wrong is moved in one commit.


## core

### The graph

**Everything is a block; a relationship joins two of them.** One workspace, one graph, one log.

- **A block is the one element.** Placed, drawn, carries fields, holds other blocks. **There is no closed set of element sorts** — what a block *is* comes from its definition.
- **A block carries** `label`, `type`, `parent`, `body`, `x`/`y`, `w`/`h` where it has a least size, `arrangement` for when it is the open layer, `groups` for its membership, `of` where it is a reference, and `fields`.
- **A block carries no presentation of its own.** Colour, shape and the rest belong to its definition, so two things looking alike is two things *being* alike.
- **`type` names a definition** — open, and the user's. Empty until somebody sets one.
- **`of` makes a block a reference**, holding what it stands for. Reference-ness is derived from its presence.
- **Ownership and containment are different questions.** A block **owns** a part; a **reference** stands for something living elsewhere. The tree is `parent` and nothing else.
- **A container is derived, never declared** — a block holding blocks draws as one. It is a way a block *looks*, and naming it a sort of thing would make an engine-level answer to something that changes the moment a child is added.
- **An interface is declared, not derived.** It is a block module, made deliberately, and carries `side`, `at` (0–1 along that edge), `num` and `flow` instead of `x`/`y`. `flow` is decorative and constrains nothing.
- **A top-level block is nothing special in the schema.** It is a block whose parent is the workspace root, read from position and stored nowhere.
- **Root** is the block that holds every other, under a reserved id. `parent: null` means *in the root layer*. No frame: a frame is a block seen from inside, and root has no outside.

**Relationships.**

- Carry `type`, the **relation module**, `dir` (none / forward / back / both), the ends, and the walls an end was given by hand.
- **Four relation modules, and the set is closed.** Two are picked and two follow from what sits at the ends:

  | | Is |
  |---|---|
  | `line` | plain; its ends are seats the layer places |
  | `directed` | its ends take the sides the layer's reading direction gives them. The module says there *is* a direction; `dir` only refines which way |
  | `reference` | an end reaches a reference — drawn dashed and held back |
  | `tie` | an end reaches a note — drawn as a faint leader |

- **Anything joining two blocks is a relationship.** One may draw as something other than a routed line, but that is a rule about drawing.
- **Containment is not a relationship.** The tree is `parent`.
- **No relationship carries a route.** Where a line goes is derived from the layer, every draw.

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

- **A `link` points without drawing**, which is how a part property or a satisfied requirement is stated. **A reference is drawn; a link is not** — that is the whole difference.
- **Membership is neither.** A block names its `groups`, and a group's members are derived from that, so the two can never disagree. A group is never a parent.

### Definitions

**A definition is a reusable subtype. One id space, three groups** — blocks, relations, views — which is how a file reads and how import dispatches, not three id spaces.

- Carries `id`, `home`, `name`, `body`, the fields its usages have, `size` where a usage needs particular room, `names` (what other vocabularies call it), and `components`.
- **Every reference to a definition is by id**, so renaming one orphans nothing.
- **Presentation lives on the definition, never on the usage.** No colour among its values — a definition picks a **slot** and an **emphasis** within the theme, never a hue.
- **A definition that names no type has no presentation to read**, so an untyped card keeps the theme's own border. Otherwise *no type yet* and *deliberately quiet* would look alike.
- **A definition names one parent** and the chain is real: fields union with the subtype's winning by name, components merge per key. One parent, so no diamonds.
- **Extension is subtyping, never overriding.** A package's definitions are never altered.
- **A rule naming a definition means it or anything below it.**
- **A `type` naming no definition is minted into one**, under an id derived from its name, so this settles rather than churning on every fold.

**`components` is the one place the schema grows.** A new capability adds a key under it, never a field beside one.

| | Holds |
|---|---|
| `block` | which **block module** — the engine code behind one sort of block. Open |
| `card` | `layout`, `shape`, where the label sits, and which fields draw in what order |
| `style` | `slot` and `emphasis`, `weight` and `voice` |
| `view` | which view definitions this offers, the first being the default, and the abstraction cap `N` |
| `constraints` | `required` |
| `rules` | `ends`, `degree`, `match`. **Not containment** — the tier law is the engine's |

- **A component owns its key and reads no other's.**
- **Each validates its own key at the door.** One absent from the build validates nothing, so its configuration is *unvalidated* rather than wrong — which is how an older build opens a newer package. What a component refuses is dropped, and only that key.
- **A module supplies drawing, placement and a configuration surface.** What may contain what is the tier law, and nothing below it is configurable.
- **The engine always places a rectangle.** A shape changes what is drawn, never where anything attaches.

### Tiers

**Three trees, and the layering is the engine's.** Views build on structure and behaviors; behaviors build on structure. This is the one place a choice is taken away from the user, and it is what keeps a subtree interpretable — a structure holding a view that looks at it is self-referential and means nothing.

> **A tree holds its own tier as parts. A lower tier appears only by reference.**

- **A tier is derived, never stored** — the nearest ancestor whose module is `structure`, `behavior` or `view`. Nothing new in the schema, and the same walk that answers *what tier is this* answers *what happens to this drop*.
- **Crossing a tier is a coercion, not a refusal.** Every gesture still succeeds — what arrives is an appearance rather than a part, and it draws the way every reference draws, so the difference is visible without being explained.
- **What a drop arrives as** is the tier's elementary unit, so a drag and an inference produce the same thing:

  | Dropped into | Arrives as |
  |---|---|
  | a **behavior** tree | an **action** holding a reference |
  | a **view** tree | a **reference** |
  | a **structure** tree, from elsewhere | a **reference** |

- **References point down the tiers only.** Upward is a derived query — which behaviors a block takes part in is asked of the graph, never stored, because a stored back-reference would leave an exported structure pointing at behaviors that did not travel with it.
- **Within a tier, nesting is ordinary.** A view holds views, so a matrix's two axes cost nothing new.

**The nine base modules read in three groups:**

| | Modules | Role |
|---|---|---|
| **tiers** | `structure`, `behavior`, `view` | own a tree; the layering is enforced |
| **filing** | `folder` | holds tier roots. **Above them only** — a folder never sits inside a tier, which is what keeps the tier walk unambiguous |
| **accessories** | `reference`, `interface`, `group`, `note`, `resource` | appear inside any tier and own no tree |

**Everything else about containment is the user's.** The tiers are the exception that makes the rest safe to leave open.

**One constraint and three rules** — `required`, and `ends`, `degree`, `match` — each a lookup, a count or one fixed comparison. No operators, nothing to parse, and **no rule language**. What they cannot say is a module's `validate` hook: code, local, one usage at a time.

**They advise while modelling and refuse only at translation.** A model is legitimately unfinished, so a violation is a note rather than a refusal.

### The workspace

**The workspace is the root folder.** There is no workspace type and no project type — one graph, one log, and the tree above the tiers is folders.

| | Contains | Holds |
|---|---|---|
| **workspace** | folders and tier roots | **the log**, the metadata, all session state |
| **folder** | folders and tier roots | nothing of its own |
| **tier root** | its own tree | a subtree of blocks |

- **A top-level block is informally a *project*** — a word for a tier root, the way *container* is a word for a block with children. Not a type, not a tier, and not in the schema.
- **Making one is making a block**, through the same door as anything else.
- **Every block carries an `id`**, minted once and kept for life, so renaming breaks no reference.
- **Names are unique among siblings**, which needs no special case for a top-level block.

**Session state is held outside the log and never in a file** — the open layer, the selection, the explorer fold, which view each layer was last shown in, the theme, and every toggle. **The test: is it in the log?** A block's name is, so it exports and it undoes. Whether interfaces are shown is not, so it does neither.

**`arrangement` is not session state.** It is model data on the layer, because inference reads the reading direction and an inference is permanent.

### The log

- **One log, at the workspace.** One document, one history, so **nothing routes** and no action can write to the wrong place.
- Every change is one step holding one or more mutations; the graph is folded from the applied ones in order.
- **Undo flips the last applied step and refolds**; redo re-applies. **No mutation needs an inverse.** Undo is workspace-wide, which is what a single document means.
- **Undo restores the graph, never the context.** Where you are looking is the user's.
- **One gesture is one step**, however many things it changed.
- **Successive placements of the same thing are one step** — nudging a card writes one `place`, replaced as the run goes on.
- **Capped.** Past the cap the oldest steps fold into a single **checkpoint** holding the whole graph. The graph is unchanged; what is lost is reach. A checkpoint is not something anybody did, so it cannot be undone.
- **The log is internal, and it is a workspace concern.** It exists so undo can be a refold, and it goes no further — no step and no mutation is ever offered outside. What leaves is state. See *kit*.

### Files

**A file is state, never history.** What travels is what the model *is* — self-describing, and readable without replaying anything against the engine that wrote it.

- **An export is the graph, not the log** — `{ schema, id, graph, meta }`, pretty-printed JSON. Its size follows the model rather than how long somebody worked.
- **Any subtree exports**, and the workspace export is simply the root folder's. One path, no special case, and no type had to exist for it.
- **A subtree travels with its dependencies** — the definitions anything in it names, and their `extends` chains. That closure is what makes it open somewhere else.
- **A reference out of the subtree is kept, not tidied away**, and reads *missing* where it lands. Same rule as a deleted target, so importing needs no second answer. A relationship with one end outside is dropped, exactly as moving a block drops what does not travel.
- **Importing one is a checkpoint**, so there is no second format and no second reader.
- **Importing replaces the session and is saved from then on** — a file is a snapshot, the session is the working copy.
- **The base is what cannot be ignored**; everything else is `meta`, free-form and safely ignorable. The test is whether dropping a field changes what the model *is*.
- **Nothing still at its default is written** — a file the size of the choices in it.
- **Major schema must match; a higher minor is readable.**
- **Exporting changes nothing**, so re-exporting an unchanged subtree is byte-identical — which is what the canonical layout is for.
- **Laid out for reading**: definitions first, then the block tree, then relationships. Blocks nest under their parents so `parent` is never written; siblings sort by id so a rename is one line.
- **Ids say what they point at** — `block_`, `edge_`, `def_`, `step_`. A name is never part of an id.
- **A log is not a file.** The reader takes envelopes only, so nothing can hand the engine a history it did not write itself.
- **Session state stays out**, `meta` included: opening somebody's file must not rearrange your toggles.

### The door

- **Every log comes in through one door**, from storage or a file, and is checked before it is folded. What can be repaired is repaired; what cannot is dropped rather than folded into a broken graph.
- **A repair is a step**, written like any other work — so it is visible, undoable, and never made twice.
- **The user is told once**, and a clean log says nothing. **A normalisation that carried nothing is not a repair**: a false alarm is what teaches people to ignore the real ones.
- **A module the build does not know falls back to the base block, and says so.** Falling back silently is the one thing to avoid.

### Ports

**The entire host contract.** Declared in core, bound by an app, implemented nowhere else.

| | Is | `web` | `cli` |
|---|---|---|---|
| `storage` | where the log and the session live between runs | session storage | a file |
| `files` | anything leaving or entering — export, import, a rendered drawing | download / picker | `fs` |
| `net` | fetching something from outside the workspace | `fetch` | `fetch` |
| `score` | text similarity, for ranking | the scorer, lazily | absent |

- **Nothing but a port may assume where the workspace lives.**
- **An unbound port is a capability the app does without**, never a feature reimplemented. With no `score`, ranking falls back to substring and everything else still works.
- **A port is an interface, not a service.** Core declares the shape and calls it; it never constructs one.
- **A new capability is a port or it is a package**, never a direct reach for a browser API from somewhere that is not an app.

### Actions

**Everything that changes the model is a record on one registry**, read by every input surface.

- Each carries a **name**, a **sentence** saying what it does, the **scope** it applies to, typed **arguments**, and a **run** returning mutations.
- **The sentence is what gets matched**, so *lay it out* reaches `arrange`. Names are too short.
- **Arguments are typed** — text, block, choice, number, or a position. An input surface offers whatever it can fill, so eligibility is derived rather than declared.
- **A position can only come from a gesture.** An action needing one is reachable only that way; one where it is optional is reachable from anywhere, and the layer places what it was not given.
- **`when` decides whether an action is shown; `check` decides what happens when it runs.** Not the same test, and `check` cannot be answered until the arguments are filled.
- **An action returns mutations and may also ask** for a layer to be opened, a selection moved, or a line to be said. It changes nothing itself.
- **An action refuses in words**, and the refusal goes to the strip like everything else the app says.
- **The offered list is membership only** — everything whose scope matches and whose `when` says yes, with no ordering of its own. Menus draw it in a fixed order; the terminal ranks it.
- **What does not apply is not shown.** Greying out is for a fixed row whose positions are worth learning.
- **A module adds no action for anything it draws.** A module is a vocabulary, renderers, a layout law and a gesture map.

**Adjustments are positional, unsayable and gesture-only** — never named, ranked or listed. They write mutations and they undo like anything else. **A view module declares which it accepts, and may accept none.**

**Every action, adjustment and gesture is enumerated in actions.md.**


## layout

**Derived beats stored.** Anything workable out from the layer is worked out — routes, boundaries, roles, control nodes. Only choices are written down.

**A hand-laid thing is a hard constraint; a derived one is not.** What somebody placed is honoured; everything else is the layer's to arrange. A computed arrangement replaces where things draw and never what was placed, so returning to `free` gives it back.

### The grid

- Positions are relative to the layer's centre origin, so a layer stays centred as it grows.
- **Everything with a place of its own lands on the grid** — cards, notes, the frame, and whatever automatic layout puts down. The backdrop dots are that grid.
- **Cards are as small as their contents allow.** Nothing is held for text that might arrive; **a name too long for its card is clipped**, with the whole of it on hover.
- **Seat count follows edge length**, and seats never fall on a corner.
- **Space is a signal** — what matters is the contrast, tight inside a unit and open between them.

### Arrangement

**One setting on the layer, with the model** — how a graph *reads*, not how it is displayed. It must be model data, because **inference reads it** and an inference is permanent.

**Six values**, of which four carry a reading direction and two do not:

| | Does |
|---|---|
| `free` | hand placement is what draws; anything unplaced fills the room around it |
| `grid` | tiles outward from the middle, cells sized to their contents |
| `right` / `left` / `down` / `up` | ranks by relationships, reading that way |

- **Ranked**: nothing pointing at it comes first, each rank one step further along. Within a rank, things are ordered by where what they relate to sat in the rank before, so a chain comes out on one row and every line along it is straight.
- **A ranking wants a DAG and a model may hold a cycle** — a coolant loop is one on purpose. An edge that would close one is set aside for the ranking and drawn like any other.
- **Nothing is discarded by arranging.** A block's placement is always kept, which is what makes arrangement safe to be a setting rather than an act.
- **It keeps walls a relationship was pinned to** — a wall is a constraint, not placement.

### Routing

- **There is no manual routing.** Every line is worked out from the layer's arrangement, in one pass, every time it is drawn. Nothing about a line is stored.
- The pass picks each end's side and free seat, then a **min-bend orthogonal path**. Stubs leave along the side normal only.
- **Every elbow is a right angle**, guaranteed on the way to being drawn.
- **One pass, so each line sees the seats taken before it.** No two ends share a seat; several relationships may still meet at one interface.
- **Runs that would share a line spread apart**, and only where a bend can move without bending a stub. A run with no middle is not spread — the seats it lands on were already spread apart.

### Seats and walls

- **An interface is seated on its owner's edge rather than laid out beside it**: a side and a fraction along it, so the seat survives the card moving, growing or being arranged some other way.
- **An end seated on an interface is drawn on the card the interface sits on** — for what a layer holds, for how a rank is worked out, and for which matrix cell is filled.
- **Sliding one along its edge is `seat`; taking a line's end to another wall is `wall`.** Both are adjustments.


## views

### The Scene

**A view module projects a layer and returns data, never elements.**

```
project(graph, layer, config) → Scene { boxes, routes, slots, hits, bounds }
```

| | Is |
|---|---|
| `boxes` | what is placed: id, rect, definition, label, marks, and what it is seated on |
| `routes` | where each line goes: ends, points, relation module, direction |
| `slots` | which chrome groups this projection offers |
| `hits` | a region and the gesture it answers to |
| `bounds` | what the layer takes up |

- **A Scene imports nothing drawable**, which is what lets a notation be tested headlessly, the CLI draw one as text, and a second host reuse both.
- **The gesture map belongs to the module**, so two modules may bind one action to different gestures and neither knows what a DOM node is.
- **What every well-formed Scene satisfies is a shared check.** A producer proves its output passes; a consumer proves it draws anything that does. **Neither imports the other.**

### What a module owns

**The projection surface is per module, never per definition** — every diagram has a frame because diagrams project onto a plane, not because a definition asked for one.

| | Is |
|---|---|
| **the surround** | a frame and its walls, or nothing |
| **the viewport** | a camera, or a scrollbar. What *fit* means here |
| **the chrome** | which control groups it offers |
| **asking** | where a gesture puts a question, since one asks for a name before anything is made |
| **adjustments** | which it accepts, and it may accept none |

- **A view module names actions; it never writes mutations.**
- **An unregistered `type` falls back to the engine's card.** A module declares what it draws *differently*, so a half-built one is usable.
- **A layout law may decline to place**, and then the layer arranges as usual.

### Three modules, six views

**Three view modules, and closed**: `block` is **any planar projection**, and `table` and `matrix` are the two that are not a plane.

| Module | Draws |
|---|---|
| `block` | a frame, cards, boundaries, routed lines |
| `table` | rows and no frame; a column per field the layer's rows carry |
| `matrix` | two axis views, cells marked by the relationships between them |

**A reading is how you look, never something inferred** — it configures the block module rather than being one. **One behavior layer, read three ways:**

| Reading | A block is | A lane is | Controls |
|---|---|---|---|
| `activity` | an action | a band across the flow | drawn |
| `sequence` | an occurrence on a lifeline | a **column**, with a lifeline down it | not drawn |
| `state` | a state | nothing — a machine is about one thing | drawn |

- **The lane is the same derivation in all three** — one per referenced participant. Only its shape changes, which is why one module carries all three.
- **The six offered views are view definitions**, three of them naming `block` with a reading. **Which one is showing is session state**, never in the log.
- **There is no derived kind of layer**, so any layer can be switched to any view it is offered.
- **A control is a rendering of a count** and answers no gesture. A branch keeps its own relationship id; only the stub into the control is derived.

### Views as blocks

- **A saved view is a block** whose definition names a view module, holding one reference per thing shown. It costs no concept.
- **Everything a view shows is a reference** — a card, a table row, a matrix axis label alike.
- **A view holds views.** A matrix's two axes are child views, so a filter or a third dimension costs nothing new.
- **A view is filed beside what it looks at**, never inside it — a view of a layer that lived in that layer would show itself.
- **A reference resolves anywhere in the workspace.** A gone target reads **missing**, and is kept rather than tidied away, so undoing a deletion elsewhere brings it back.
- **What is done through a reference reaches home.** Renaming one renames the block.
- **A relationship into another tree is a reference plus an ordinary edge**, both filed with the end making the claim.
- **Depth** says how far a reference reaches — `self`, `children` or `all`.
- **Nothing about how a view looks enters the tree it reads.**

### Composition

**Inference makes blocks; composition arranges references.** Two different things, and separating them is what makes view work tractable.

| | Makes | Runs | Is |
|---|---|---|---|
| `infer` | **new blocks** | once, when somebody asks | model, and permanent |
| composition | **nothing** — a grouping, spacing and ordering | every draw | presentation, recomputed |

**It runs on one metric: proximity** — how far apart two referenced blocks are in the tree, which is a path distance and deterministic. **Group** by nearest common ancestor, **order** by tree path, **space** by distance where the view has room. A table and a matrix have rows, so they take the grouping and the order and drop the spacing.

- **A proximity group is a derived group**, so nothing needs storing for one to appear.
- **Proximity is the default and must be overridable.** A view whose point is a cross-cut wants grouping by type, and proximity would give it exactly the grouping it was built to escape.

### Behavior

**An overlay on a structure, never a second model of it.** The engine has no behavior branch and needs none — a behavior model is one package plus one module read three ways.

**The one rule: guess freely in the behavior, never guess into the structure.** A wrong guess in a behavior costs an edit; a wrong guess written into a structure modifies the truth, invisibly.

- **A behavior block holds references to the participants, never parts**, so a structure block never appears in a behavior tree.
- **`infer` is how one comes to exist**: a selection becomes one behavior block, **always a new top-level one**. One-way, one-time, deterministic over the selection; re-inferring makes a new block rather than disturbing one somebody has worked on.
- **It composes** — a selection of actions infers a `state` block the way structure infers an `activity`.
- **A container is an activity, a leaf is an action.** Derived, not stored.
- **Order is read down four tiers** — a `flow` subtype, then any directed relationship, then position along the layer's arrangement, then adjacency. **Inferred order draws dimmed**, so a guess never reads as a statement.
- **An action's label is derived and dimmed** — the definition's verb and the participant's name, `do Pump`. Typing over it stores a real name and the dimming goes.
- **Lanes come from the references**, one per participant, so they always exist. Past **N** actions the inference cuts higher in the tree; `N` is view configuration.
- **Only the tier that writes home writes home.** Interfaces a flow implies are written to the participants; anything guessed from position writes nothing. **Only a fact that still stands once the behavior is deleted may be written.**
- **Participation is derived**, so a structure tree exported alone reads clean.
- **Nothing is derived that somebody edits.** Control nodes, messages and lanes are counted and drawn; states are blocks, because people name and nest them.


## defs

**Data only. No code.** Every definition is validated by the door in CI, and every module it names must exist.

| | Ships |
|---|---|
| `base` | one definition per block module — the three tiers, `folder`, and the five accessories — plus one view definition per offered view. **Shipped and locked, and the engine knows it by id** |
| `behavior` | `action` and `state`, extending the base behavior definition, plus the verb |
| `requirements` · `flow` · `parametrics` | the worked vocabularies |
| `sysml` · `uml` · `uaf` | formal `names` and mappings over the definitions above |

- **The engine may key off a base definition only for how a block draws, where it sits, and which tier it is** — never for anything a package could have said instead.
- **Core cannot reach the package that supplies its floor.** `defs` depends on core, so core may not depend back — an app hands the base definitions in, the same way it hands in a port.
- **A package is data; a module is code.** A package ships definitions and costs nobody anything. **A package maps names and presentation, never structure** — a notation needing structural change is a module instead, and then it is one engine capability plus a package, shipping together.
- **A package must be useful with portable presentation alone.** It degrades rather than breaks.
- **A package resists editing.** A write against one refuses with the reason and offers **unlock** or **fork**.
- **A standard is a translation layer, never a shape the model bends to.** A part property is a block with a parent, a value property is a typed field, a port is an interface, a requirement is a block with two fields. **A notation that cannot be reached this way is a notation this tool does not do.**


## render

**Scene → React, and nothing else.** It reads what a projection placed and knows nothing about the graph, the log or the actions. **Binding a hit to an action name is the whole of its input job.**

**It is a package, not part of the web app.** A second host renders in a webview, which is a browser — so the renderer is shared and only the port bindings differ.

- **A pointer maps through a letterbox.** The Scene is fitted to the element, so reading a click as if the element mapped straight onto it is right in exactly one case and wrong everywhere else.
- **Every element kind draws and every hit binds**, proven over hand-written Scenes no view module would produce.
- **A card is a rectangle with its name**, and what it looks like comes from its definition's slot and emphasis.
- **A reference is the only dashed card**, showing the name of the block it stands for and having no inside.
- **An interface is a small square on the edge it is seated on**, filled or open by its flow mark, carrying no label of its own.
- **A boundary is a faint dashed line** whose bounds are its members' — a default rather than a rule, and never a parent.
- **A note is its text.**
- **One thing highlights at a time** — the innermost under the pointer, which is what a click would act on. Selecting makes the highlight fixed. **Nothing else highlights**, in particular not what a recent action changed.

**The theme is a ramp, and it reaches the drawing.** **Slots × steps**: a step is a job and means the same job everywhere; a slot is a family. Six pickable slots and four reserved to the app — `away`, `note`, `error`, `warn`, which keep their hue across themes because *elsewhere* and *a note* mean one thing everywhere. **Steps are computed, not written**, so a new theme is about twenty numbers. **The shell reads the same ramp**, so the header cannot drift from the canvas.


## ui

**Branding, navigation and the workspace. It owns nothing about a diagram.** Every component is a pure function of its props: it holds nothing, and every gesture leaves as an action name somebody else runs.

**One page**: header, optional terminal, then explorer beside the stage, options to the right.

### Explorer

**Structure and only structure**, nested to any depth.

- **The tree is blocks.** Boundaries, notes, fields and references are never listed — a reference is a second appearance of something already there. **Interfaces are behind a toggle.**
- **Every top-level block is its own subtree**, filed into the folders the workspace keeps.
- **The open layer and the selection are two states with two looks.** *Open* is where the stage is pointed; *selected* is what an action would act on. They stack, and selected reads first.
- **Every role carries a mark** — leaf, container, interface, folder — and a container is filled where a leaf is outlined, because the fill is what says it holds something.
- **The bar's `＋` follows the selection**, and its tooltip names which, so the meaning is never hidden. **Add folder is a shortcut, not a second concept** — the same `create`, arriving with its type filled, and offered only where a folder can go.
- **Right-click opens the offered list** for the selection, in fixed order.
- **Every row is draggable**, and a drag crossing a tier lands as that tier's elementary unit rather than refusing. **Dropping in the clear space below makes the block top-level**, since a tier root is a block no other block contains.
- **A move drops what does not travel** — group memberships, note ties, and relationships to anything staying behind. A move is never confirmed first; undo is the answer.
- **Folding is the user's alone**: walking into a layer never rearranges the tree.

### Stage

**The working area, and the one thing that never yields.** Chrome gives way under pressure and the stage keeps its room.

- **The stage hosts one view at a time**, and none of the three is nested inside another.
- **The left button works what is already there; the right button makes something new.** Within the right button, a click makes the thing that sits at a point and a drag makes the thing that has extent.
- **A click in the explorer navigates; a click on the stage selects and never navigates.**
- **A left drag is decided at the press and never revised** — a gesture that changes its mind halfway is the aim-and-hope this design is written against.
- **Dropping a card on another card is a `move`, which is sayable; dropping it anywhere else is a `place`, which is not.**
- **A drop lands on a box and never on the frame** — the frame spans the whole layer, so counting it would make every drop a re-parent.
- **The stage publishes its geometry upward** so the options rail calls what it was handed. The shell never reaches into the stage.

### Options

**Every control the thing on the stage has is in one column, fixed to the right.** A real column, not an overlay: the stage ends where it begins, so chrome never sits on the drawing.

- **A view module declares which groups it offers** and the column draws them in a fixed order. A matrix has no interfaces toggle because it declares none, never because one was greyed out.
- **`types` is the one group the page cannot build alone**, so a module declaring it also answers it. **Nothing picked is everything.**
- **A verb never lights** — `arrange` has no state to be in, which is the plainer signal.

### Tray

**A table of everything the open layer holds** — blocks, interfaces, relationships, boundaries and notes together. It is the only place a relationship or an interface is found without hunting for it on the drawing.

- **Two sizes, shut and open.** Open, the stage shrinks and re-centres rather than being covered.
- **Nothing closes it but its own control** — a click on the canvas is how a row gets selected.
- **The head is kind / name / what / type**, because every row answers it. Beyond that, a column is a field in scope — the **table's** state, never a definition's.
- **Hovering a row lights that thing on the stage; clicking selects it.**
- **Definitions are editable here** — fields, defaults and presentation.

### Terminal

**One collapsible strip. Not a chat, not a command palette.** The app is whole without it, and nothing below it may import it.

- **It reflects context and action as you use the app** — you act on the canvas, the terminal says what happened — so it is a mirror as much as an input.
- **It reads context and never changes it**, because it *ranks against* context and a surface that moved context would shift the ground its own ranking stands on.
- **It reaches actions and never writes a mutation of its own.**
- **Chips are the offered list**, ranked through the `score` port with substring as the cold fallback.
- **`Enter` confirms the highlight and arrows move it**, because a default that is invisible and changes under the user is the version of adaptive ranking worth avoiding.
- **Every capability it adds must exist without it.** If the only way to do something is to say it, it has stopped being optional.

### Naming and one channel

- **A name is written the way it was typed** and shown the same way everywhere. **Unique among siblings** — where something sits is what makes it unique.
- **An unnamed block falls back to its role and its number** — `block 1`, `interface 2`. **A note is exempt**: a note *is* its text.
- **A block that says nothing and stands for exactly one thing is named after what it stands for**, with its definition's verb in front, and **drawn dimmed** — a guess that cannot be told from a statement is the mistake worth designing against.
- **A name is edited where it is drawn.** `Enter` commits, `Esc` abandons.
- **Everything the app says goes to one strip** — a refusal, a repair report, a storage warning, a rule note. One place to look, dismissable, and silent when there is nothing to say.


## apps

**An app binds ports and composes packages.** It adds no behaviour and no second copy of anything.

```
bind ports  ->  hold the log  ->  fold  ->  project  ->  render
                     ^                                      |
                     +-------------- action ----------------+
```

**Every gesture returns an action name, which the app runs, which returns mutations, which it appends.** That loop is the whole app, and **if it turns out to be interesting a seam is in the wrong place**.

| | Is |
|---|---|
| `web` | Vite. **The primary product** |
| `cli` | headless. Folds, checks, runs actions, projects a layer to text, exports |

**The CLI is the harness that makes the rest provable.** A passing suite proves the code agrees with itself; the CLI proves the packages compose — that a log folds, an action writes, a layer projects, and a Scene is complete enough to draw from, with no React anywhere in the process. **When a track can be driven from the CLI it is done being built in the dark.**


## kit

**The one surface offered outside this repo, and it speaks in state.** The whole headless stack as one built package — `kit`, `kit/react`, `kit/react.css` — bundled so nothing outside sees a workspace. **Packed, never published.**

**The log, the steps, the mutations, the session and the action registry are internal.** A log is a history of intent replayed against one engine: reading one means matching this build's mutation semantics, its defaults and its action set, version for version. A graph is a statement of fact — validatable without executing anything, and stable across builds.

> **A signature naming `Log`, `Step` or `Mutation` is internal. Graph to graph, and graph to Scene, is the seam.**

| | Is |
|---|---|
| `base_graph` | a fresh workspace with the floor already in it |
| `open` | a file in, as a graph — validated at the door and repaired where it can be |
| `validate` | what a graph violates. **Mending it stays the engine's** |
| `write` · `write_subtree` | a graph out, in the canonical layout |
| `project` · `draw` · `draw_svg` | a layer as a Scene, as text, as a standalone drawing |
| `Viewer` | the same layer as an **interactive** artifact — walkable, and not editable |

**What is sealed, and there are no exceptions to look up:** the log, the steps, the mutations, the session, the action registry, the inference, and `layout`. A consumer places nothing, because projecting is what places and the Scene already carries the geometry.

- **A consumer says what a model *is*, never what changed.** Round-tripping is read a graph and write a graph, and diffing belongs to whoever cares. **This is the price of a mutation union that stays free to grow**, and it is the right one — a new sort of change costs nothing outside because nothing outside can name one.
- **The engine keeps its own reader.** `read` produces the log a session works in and is not offered; `open` is the same journey one step later.
- **The export list is written out.** `export *` from the engine is how the log leaks, so what ships is named one by one.
- **An embedded view is interactive and still an artifact.** `Viewer` holds a graph, projects the layer being looked at, and walks in and out of layers. The renderer underneath offers drag callbacks meaning move, seat, wall and relate; they are not re-exported, so **an edit is unreachable rather than merely unadvised**.
- **`kit` is the one package that adds code**, and it is one component. The rule it keeps is dependency direction, which a viewer built from packages `kit` already carries cannot break.


## tests

**Properties, never values.** Nothing asserts a coordinate, an id, a message or a count that tuning would change — the suite pins what must stay true, not what happens to be true.

**Two kinds of sample data, because there are two ways in.** A **log** fixture proves the engine agrees with itself — it folds what this build wrote, through the door this build owns. A **file** fixture is a graph this engine never wrote, hand-written and mostly wrong on purpose, and it is the only thing that proves the outward seam repairs rather than folds a broken graph. **After `open`, `validate` finds nothing left** — that is the property, not the wording of any fault.

**Contract tests, never integration tests.** A producer proves its output satisfies the invariants; a consumer proves it handles anything that satisfies them. **Neither imports the other.** When they meet in an app there is nothing left to discover.

| Package | Proven by | Needs a browser |
|---|---|---|
| `core` | fold determinism, door repairs, undo-by-refold, file round-trip, byte-identical re-export | no |
| `layout` | no overlap, on the grid, stable under reorder, every elbow square, no two ends share a seat | no |
| `views` | Scene invariants per module, over text projections of **shape, not coordinates** | no |
| `defs` | every shipped definition passes the door; every module it names exists | no |
| `render` | one conformance test: every Scene element draws, every hit binds, over **hand-written** Scenes | yes |
| `ui` | driven, not asserted | yes |

- **The dependency law is a test**: the workspace graph matches the table at the top of this file, no package outside `core` declares a closed set, and nothing imports a deep path.
- **Design first, test second.** While a design is still moving, running the thing is the verification that counts.
- **Driving the app is the acceptance test**, and a green suite closes nothing on its own.
