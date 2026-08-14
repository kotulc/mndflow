# Spec

What each part of mndflow does, component by component — short statements of the current
target.

- **Why any of it is this way** → [design.md](design.md).
- **What is not built, and what is undecided** → [tasks.md](tasks.md).
- **(planned)** marks a line that is the target but not yet the behaviour.

mndflow is a client-only web app for assembling systems out of simple descriptive building
blocks. There is no server: a step log lives in the tab, and the graph is folded from it.


## Project model

The graph is **elements** and **relationships**, and nothing else. An element is placed and
drawn; a relationship joins two of them. Everything else describes one of the two.

**Elements** — held in `graph.elements`. "Node" is the same thing in the graph-theory register.

- **`form` is closed and the engine's; `type` is open and the user's.** One rule, and it holds for
  elements, relationships and fields alike.
- `form` says which of five it is: **block** (the base and the default), **note**, **group**,
  **proxy**, or **figure**. It decides what draws an element and which rules reach it.
- **`figure` is placed and drawn by a module, never by the engine** — never in the tree, never in
  the explorer, and what it *is* comes from its `type`. In the closed set; nothing makes one until a
  module does, and **(planned)** nothing in the core ever will: an activity's fork, decision,
  initial, final, merge and join are all **derived from counting relationships and guards**, so a
  module draws them and the graph stores none. What is left for a figure is ornament a package
  ships — a legacy symbol that means nothing to the engine.
- **(planned) A figure takes no interfaces**, which is what earns it a form: only a block and the
  things derived from it do. The action that makes one refuses on a figure, and says why. This is
  the first rule the engine enforces rather than advises.
- `type` names the element's **definition** — its reusable subtype. It subtypes **within** a form,
  never across one. **Empty until somebody sets one.**
- **A card's chip shows its subtype, or the module's word for a plain one** — `Module`,
  `Character`, and one day `Activity`. The fallback is derived, never stored, and is dimmed so
  it reads as a default rather than as a distinction. A container reads `Module group`.
- **The module's word is not a type.** It is what the module calls its elementary block, and
  nothing is written onto an element until a distinction is actually drawn.
- **Container and interface are derived, not declared**: a block holding child blocks draws as a
  container; a block on its parent's frame edge is an interface. Both are ways a block *looks*;
  neither is a separate form, and both are still called blocks.
- Interfaces do not count towards being a container.
- An element carries `label`, `type`, `parent`, `body`, `x`/`y`, `w`/`h` for a note's least size,
  `axis` for when it is the open layer, `groups` for its membership, and `fields`.
- **An element carries no presentation of its own.** Colour, shape and the rest are its
  definition's, so two things looking alike is two things being alike rather than a coincidence
  somebody has to maintain.
- An interface carries `side`, `at` (0–1 along that edge), `num`, and `flow` instead of `x`/`y`.
- **An interface is an element only where somebody made one** — a bare one, or a promoted seat.
  A relationship makes none: where its line meets a card is worked out by the layer.
- `flow` (in / out / both) is decorative and constrains nothing.

**Root** — the block that holds every other, under the reserved id `root`.

- Carries the project's name as its `label`, plus its own axis, body and fields.
- Carries the project's name, body and fields. Its **definitions** are the project speaking about
  itself too, but they are a collection rather than a property, so they sit beside `elements` and
  `edges` as `graph.defs` — out of the tree and out of the explorer just the same.
- `parent: null` means "in the root layer" everywhere it is written; root is told from its own
  children by its id, which is the one place any listing has to know about it.
- It has no frame, because a frame is a block seen from inside and root has no outside.

**Names** — unique among siblings; where something sits in the tree is what makes it unique in
the project.

- An unnamed element falls back to its form and its number among siblings of that form:
  `block 1`, `note 2`, `interface 1`.
- `num` is fixed at creation; a new element takes the lowest number not in use among those
  siblings, so deleting one leaves a gap the next fills and renames nothing.
- Container-ness is not in the name: it is derived, so a name tracking it would change the
  moment a child was added. The icon says it instead.
- A name already taken by a sibling is refused. The paths that make or change one, in full:

  | Where | |
  |---|---|
  | explorer — new row, and rename | checked |
  | canvas prompt — new block, and rename | checked |
  | a relationship grown into empty space | checked |
  | a card's own label, in place | checked |
  | the frame's title | checked |
  | a group's name | checked |
  | contents table — name cell | checked |
  | a note's text | **exempt** — a note *is* its text, and nothing beside it competes |

  Only stored labels are compared: a fallback is a number nobody chose, and blank is not a name.
- **A refused name says so in two places.** The field marks itself as the clashing name is typed
  and reads *taken* — one word, so it fits a pane as narrow as the explorer. On `Enter` the full
  reason appears in the strip at the top of the canvas, where there is room for it, and the field
  holds open with the typing intact. Correcting the name clears both.
- Every name on the canvas is typed into the same field, so the rule reaches all of them at once.

**Relationships** — a join between two elements, held in `graph.edges`.

- Carries `type`, `form`, `dir` (none / forward / back / both), `from`/`to` interfaces, and
  `fromSide`/`toSide` where an end was drawn through a named wall.
- `type` names the relationship's **definition** — what it *means*, plus the fields it declares
  and how it draws.
- **`form` is `line` (the default) or `directed`, and that is the whole set.** It says what the two
  ends *are*: a line's are plain seats the layer places, and a directed one's take the sides the
  layer's axis gives them. `dir` still says which way the arrows point.
- **Anything joining two elements is a relationship.** One may draw as something other than a
  routed line — a tie is a leader, taking no pointer and no seats — but that is a rule about
  drawing, not a second way to join things. One mechanism, one cascade when an end is deleted,
  one list to read them from.
- **Two more are derived, because nobody has to say them.** Being derived makes neither less the
  engine's business; it only means the engine works it out.

  | | Derived from | Draws |
  |---|---|---|
  | **reference** | an end is a **proxy** — it reaches something in another layer or project | violet and dashed, held back at reduced opacity so the form and the label read first; hover and selection bring it to full |
  | **tie** | an end is a **note** — a note relates to what it describes and to nothing else | a faint leader, no pointer and no seats |

- A reference keeps whichever form it was given and keeps its direction. Both routes to one draw
  alike — an end drawn straight onto a proxy, and an end substituted by the proxy standing in for it.
- What a proxy stands for is a property of the appearance, not a relationship: one thing appearing
  twice rather than two things joined.
- **A weaker mention drawn lighter is not a form** — that is presentation, so it is a definition
  subtyping `line`.
- **Containment is not a relationship.** The tree is `parent`, and being inside something is
  implied by it rather than stored as an edge.
- `from`/`to` are set only where an end landed on an interface somebody made. Absent is the
  normal case, and the layer works that end out.
- `fromSide`/`toSide` pin an end to one of the frame's four walls. The seat along it is still
  derived; `arrange` hands the wall back.
- **No relationship carries a route.** Where a line goes is derived from the layer it is drawn
  in, every time it is drawn.

**Fields** — a named, typed value on one element or relationship.

- A field carries `name`, `form`, `value` and `tags`.
- **`form` is one of five**, and the set is permanent:

  | form | Holds | Extra on the field |
  |---|---|---|
  | `text` | free string, the default | — |
  | `number` | a quantity | `unit` |
  | `flag` | true or false | — |
  | `choice` | one of a list the definition names | `choices` |
  | `ref` | another element, by id | `many` |

- **No identity of its own**: a field is addressed by its name on the thing carrying it, and
  setting the same name again rewrites it.
- Never structural: never in the explorer, never changing what contains what.
- **A `ref` field points at an element without drawing a line**, which is how a part property or a
  satisfied requirement is stated.
- **Membership is neither a field nor a relationship.** A block names the groups it belongs to in
  `groups`, and a group's member list is derived from that, so the two can never disagree. A group
  is never a parent.
- The test for which of the two something is: **drawn as a line between two things → a
  relationship; not a line → a field.** A tie is a line. Membership is not — a group draws a
  boundary round its members, never a spoke to each.

**Definitions** — the reusable subtypes a project has named, in `graph.defs`.

- **A definition declares; whatever names it uses.** It carries an `id`, a `name`, the `form` it
  subtypes, the fields its usages have — name, form, unit, default, and `choices` where it has one
  — and how they draw.
- **One record serves elements and relationships alike.** The `form` it subtypes decides what it
  applies to: `block`/`note`/`group`/`proxy`/`figure` for an element, `line`/`directed`
  for a relationship. A project's relation vocabulary is just the definitions of relationship form.
- **Every reference to a definition is by id**, so renaming one never orphans a typed interface, a
  flow's item, or a nested data structure.
- **Presentation lives on the definition, never on the usage** — colour and icon for an element,
  line style, arrowhead and colour for a relationship. It is therefore structurally absent from an
  export rather than filtered out of one.
- Four more optional fields, each unwritten at its default so no existing file changes by a byte:

  | | Is |
  |---|---|
  | `body: string` | what this kind of thing is, in a sentence — the way an element has one. What the tray shows, and what a typed word is matched against, which is why no definition needs a list of keywords beside it |
  | `size: { w, h }` | the room a usage needs, since the engine places before anything renders — a fork bar long and thin, a decision small and square. Absent means the ordinary card |
  | `names: Record<string, string>` | what other vocabularies call it, keyed by vocabulary — `{ sysml: "«requirement»" }`. `name` is what the user reads and types; these are what an export writes. A map rather than one field, so a core definition can answer to SysML *and* UML |
  | `components: Record<string, object>` | **how each open component behaves for usages of this**, keyed by component |

- **`components` is the one place the schema grows.** A new component adds a key under it, never a
  field beside it — which is what stops every capability costing a schema change, and what makes
  *unknown configuration is ignored, never fatal* implementable rather than aspirational.

  ```
  "components": {
    "card":        { "layout": "shape", "shape": "diamond" },
    "style":       { "set": "sysml" },
    "constraints": { "required": ["guard"] },
    "rules":       { "degree": { "in": [1, 1], "out": [2, null] } }
  }
  ```

  - **Each component validates its own key**, and one absent from the build validates nothing —
    so its configuration is *unvalidated* rather than *wrong*, which is how an older build opens a
    newer package. Problems are reported at the door as faults, like everything else read in.
  - **A module publishes its components and registers each validator with the door**, which is why
    the door needs to know nothing about what a card or a style means.
  - **What a component refuses is dropped, and only that key.** The definition arrives whole and the
    component falls back to what it does for every definition that never mentioned it. A key whose
    configuration is not a record goes the same way, claimed or not.
  - **A component reads its own key and no other's.** They share one element and one log, so this
    is what makes them separable in fact rather than only in file layout.
  - `size` stays outside it: `layout` reads it for every element on every pass, and reaching into
    component configuration from the engine would invert the dependency.

- **The components an open module publishes**, and what each key holds. **(planned)** — all but
  `card`, and `card` is declared and validated rather than drawn from:

  | | Holds |
  |---|---|
  | `card` | `layout` — one of `name`, `type`, `fields`, `compartments`, `icon`, `shape`; `shape` — one of `rect`, `round`, `diamond`, `ellipse`, `hex`; `label` — `inside`, `below` or `none`; and `shows`, which fields draw on it and in what order |
  | `style` | `set`, a style set by name, over the portable typed fields — colour, line, arrowhead — that render without one |
  | `constraints` | `required` |
  | `rules` | `ends`, `holds`, `degree`, `match` |
  | `view` | on a diagram's definition: which view module, and its arrangement |

  Each is defined in [definitions.md](definitions.md) under *Rules, constraints and components*.

  - **The plain card is the default written down** — `type` layout, `rect`, label inside, showing
    no fields — which is today's card said as one configuration among others. **(planned)** The
    canvas still draws it hard-wired; reading the configuration is the diagram's, and is what
    tests whether the boundary holds.
  - **A component owning a key owns the whole of it**, so a key `card` does not recognise is
    refused. That is the opposite of an unrecognised *component*, which is left alone: one is a
    misspelling this build can see, the other may be a newer build's.

  - **The engine always places a rectangle.** Every seat, route and interface reads the box, so a
    shape changes what is **drawn** and never where anything attaches. A line meeting the box near
    a diamond's corner appears to touch empty space; a renderer may draw its own port marks to
    soften that.
  - **Card layouts and style sets are open** — extended by a code change, additively. The forms,
    the ops and the actions are closed. Confusing the two is what turns an engine into a plugin
    host.

- **(planned) A constraint bounds a thing in itself; a rule governs how things interact.** Both are
  declared on a definition and hold over every usage of it, reaching that subtype's fields, its
  interfaces and the relationships at it. **A rule naming a definition reaches everything below
  it.**
- **(planned) They advise while modelling and refuse only at translation.** A violation is a note
  in the tray, never a refused change: a model is legitimately unfinished. A **translator** asks
  the same checks as it emits, and declines to write a non-compliant file.
- **(planned) What the five cannot say is a module's `validate` hook**, in code. There is no rule
  language, and local checks certify wiring rather than a whole model — whether every requirement
  is satisfied is a global walk, which is a translator's to make.
- A definition may **`extend`** one other, by reference — usually one a package ships. **One
  parent**, cycles stop, and a parent that is not loaded ends the chain with the subtype standing
  on its own declarations. `isa` walks it, which is how a rule reaches every subtype.
- **(planned)** Resolving one: fields union with the subtype's winning by name, and `components`
  merge per key, a key it does not mention inherited whole. Today a subtype's own declarations are
  read and the chain is walked only to answer *is it one of these*.
- **(planned) Extension is subtyping, never overriding.** A package's definitions are never
  altered; refining one means making a new definition that *is* it.
- **(planned) A rule naming a definition means it or anything below it.** Without that, an imported
  standard's rules would reach only its own definitions and nothing anybody models.
- **(planned)** A project draws definitions from a **list of packages, in the order imported**.
  **Nothing shadows**: every reference is a path, so two packages naming a thing alike are two
  different definitions and importing one can never change what an existing element means.
- **(planned) Two definitions loaded under one name are shown with their packages**, and import
  order decides which is offered first. Ambiguity in a picker is not shadowing — neither is
  hidden — and the answer to it is presentation, not resolution.
- **(planned) A package resists editing.** Changing one is refused with the reason, and the way
  through is deliberate: **unlock** it, or **fork** it and change the copy. A fork takes a new
  project id, so anything pointing at the original keeps pointing there rather than quietly
  following the copy.
- **(planned) Locked is the workspace's word, not the file's.** The same project is a package you
  are using or one you are writing depending on which you are doing, so nothing in it says.
- **A reference reaching another project is written as a path**, `proj_a9f/def_pump` — the
  project, a slash, then the id inside it. An id alone means this project, so every reference
  written so far still reads. One convention serves all three places one is held: a proxy's `of`,
  an element's `type`, and a `ref` field's value. Ids never contain a slash, so nothing is
  ambiguous, and a reader splits on the first one or does not have to split at all. `refTo` and
  `refAt` are the two ends of it. **(planned)** Nothing writes a path yet: that is the workspace,
  which is what makes another project reachable.
- **(planned)** A **package** is a set of definitions somebody ships — plain names, formal names,
  fields, presentation and mappings. It is data, adds no code, and **maps names and presentation
  but never structure**; a notation needing structural change is a module instead. See
  [design.md](design.md) under *Packages and modules*.
- **A definition subtypes within a form, never across one.** Nothing a user defines can change
  what a thing *is*.
- **A data structure is a definition**, not an element form: it declares fields, and a block typed
  by it is drawn only where somebody places one.
- Definitions are not elements: no id in `graph.elements`, no row in the explorer.
- A `ref` field may target an element or a definition — "typed by" and "points at" are one
  operation.
- **A `type` naming no definition is minted into one**, under an id derived from its name. That is
  how a relation typed onto the canvas becomes something declarable, and how a log written before
  definitions folds into one. Derived from the name rather than freshly minted, because this runs
  on every fold and a random id would never settle.

**History** — the step log is the source of truth.

- Every change is one step holding one or more mutations; the graph is folded from the applied
  ones in order.
- Undo flips the last applied step and refolds; redo re-applies. No mutation needs an inverse.
- **The log is capped at 1,000 steps.** Past 1,200 the oldest are folded into a single
  **checkpoint** step holding the whole graph, and dropped. The graph is unchanged by this; what
  is lost is reach — undo stops at the checkpoint and cannot go further back.
- A checkpoint is not something anybody did, so it cannot be undone. Undo reports itself spent
  when the checkpoint is all that is left.
- Compaction also runs on load, so an imported or long-idle log is capped before anything else
  touches it.
- One gesture is one step, however many things it changed.
- **Successive placements of the same thing are one step.** Nudging a card into place writes one
  `place`, replaced as the run goes on; a different action ends the run, and one undo takes the
  whole run back. Moving a different element starts a new step, as does a drag that also joined
  or left a group. An arrangement is its own step and never joins a run.

**Files**

- The log lives in the browser under one key. **Importing a file replaces the session and is saved
  from then on** — a file is a snapshot, the browser is the working copy.
- **An export is the graph, not the log.** `{ schema, id, graph, meta }`, pretty-printed
  JSON. Its size follows the model rather than how long somebody worked, and its diff shows the
  elements and relationships that changed rather than the actions that changed them.
- **Importing one is a checkpoint.** The file becomes a log holding a single `checkpoint` step, so
  there is no second format and no second reader.
- **The log never rides along.** Undo is a working-copy concern; history across machines is git's.
- **A project carries an `id`**, minted once and kept for life. It is what a cross-project
  reference points at, so renaming a project — or its file — breaks nothing.
- **The suggested filename follows the project's name**, so the two stop drifting apart.
- **Nothing still at its default is written.** No nulls, no empty lists, no colour every card
  already has — a file the size of the choices in it.
- **The base is what cannot be ignored**, and everything else is `meta`.

  | | Says |
  |---|---|
  | `schema` | which shape the file is — `"1.1"`. **Major must match; a higher minor is readable**, so a reader that knows 1.x opens a 1.3 file and skips what it does not recognise |
  | `id` | which project this is, for life. Cross-project references resolve against it |
  | `graph` | the content |
  | `meta` | free-form, unversioned, **safely ignorable**. Absent when empty |

  - **`module` moved from the base to `meta` in 1.1.** It named a classifier that no
    longer exists — what a project is is visible from what it holds — and what is left is a
    preference for which module to open it in, which a reader may ignore. Both directions still
    read: a 1.0 file carries it at the top and a 1.0 reader finding it absent falls back, so the
    move costs a minor rather than a break.

  - **The test for the base is whether dropping a field changes what the project *is*.** That is
    what stops `meta` becoming a bucket anything may be added to.
  - **`meta.steps` is every step ever taken** — a count of work, not a version, and it orders
    nothing across two copies that diverged. `checkpoint.at` holds the count before it and the
    rest is derived, so nothing tallies while you work.
  - **The content hash is computed, never stored.** A stored hash disagrees with its own graph the
    moment anyone hand-edits the file, and git already hashes the file better.
  - **Exporting changes nothing**, so re-exporting an unchanged project produces a byte-identical
    file. That property is what the canonical layout exists for.
  - **Nothing in `meta` affects how a file is read.** Only `schema` does.
- **Display preferences stay out**, `meta` included: opening somebody's file must not rearrange
  your own toggles. A deliberately saved view is a different feature, and not one of these fields.
- **A bare array has no envelope**, so its absence reads as legacy rather than as a version.
- **The file is laid out for reading**: definitions first, then the element tree, then
  relationships.
  - Elements **nest under their parents**, so `parent` is never written — position carries it —
    and a diff hunk lands beside the thing it describes.
  - Siblings sort by id, so a **rename is one line** rather than a record moving. Re-parenting does
    move a record, which is what a structural change should look like.
  - Relationships sort by source, then target, which clusters everything leaving a block and never
    moves, since neither key changes.
- **Ids say what they point at**: `block_`, `note_`, `group_`, `proxy_`, `figure_`, `edge_`,
  `def_`, `step_`, `proj_`. A name is never part of an id — it would go stale on a rename or force
  the id to be rewritten everywhere. Older `n_`/`e_`/`s_` ids stay valid; ids are opaque and
  nothing migrates.
- **Every log comes in through one door**, from storage or from a file, and is checked before it
  is folded. What can be repaired is repaired; what cannot is dropped rather than folded into a
  broken graph.
- **The user is told, once**: `repaired 2, could not read 1`, in the strip at the top of the
  canvas. Dismissable, and a clean log says nothing.
- **A panel that cannot draw itself says so and stays out of the way**, rather than taking the
  window with it. The log is unharmed, so closing the panel and carrying on is the way out.
- The log is kept in the browser. **If it stops fitting, the header says so** — `⚠ not being
  saved — export` — and the button exports. The session carries on; only persistence has stopped.
- Display preferences are outside the project: no history, no export.
- **(planned)** Storage is keyed, **one entry per project**, the workspace included — it is a
  project like any other.
  - **A key appears when a project is first changed, not when it is opened.** A checkpoint is not
    something anybody did, so an imported project nobody has touched is stored by nothing and
    costs nothing.
  - **When storage fills, the projects being worked in keep their logs and the rest are
    checkpointed** — history for the untouched, which is the cheapest thing to give up, and the
    strip says so. That is a different message from the one that means nothing is being saved at
    all.
  - **The workspace keeps its own list of what has been imported**, which is what an untouched
    project is remembered by when it has no key of its own.
  - Today storage holds exactly one, and the code assumes it.

**Tests** — one file per module, beside the module, so a module and its test move together. One
integration test in `tests/` for the whole lifecycle. `npm test` at the root.

- **Properties, never values.** Nothing asserts a coordinate, an id, a message or a count that
  tuning would change — the suite pins what must stay true, not what happens to be true.
- The terminal, the embedding modules and the `project` hook are deliberately uncovered; see
  [tasks.md](tasks.md) under *The suite* for why each.


## Action surface

*The registry is built — `actions/index.ts`, with scope, `check`, `sayable` and `writes`.* **(planned)
— every action in it.** All 52 are still closures on the `project` hook, and S1.2–S1.7 move them.

Everything that changes a project is a **record**, not a function somebody has to know about. One
registry, read by every input method: gestures, the contents tray, and later the terminal.

- Each record carries a **name**, a **label** the vocabulary may override, a **sentence saying what
  it does**, the **scope** it applies to, its **arguments**, and a **run** returning mutations.
- **The sentence is what gets matched**, so that "lay it out" reaches `arrange`. Names and labels
  are too short to score against.
- **Scope is the same question a gesture asks** — what is under the pointer, selected in the tray,
  or selected when somebody types. It names a form where that matters: `dissolve` applies to a
  group, `tie` to a note, `mark` to an interface.
- **Arguments are typed**: text, element, choice, number, or a canvas position. An input method
  offers whatever it can fill, so eligibility is derived rather than declared.
- **Eligibility is not order.** `describe` and `rename` take the same arguments; what separates them
  is that a sentence is prose and a short phrase is a name. Types decide what is offered, never in
  what order.
- **An action writing no mutations is navigation** — `open`, `up`, `reveal`. It writes no step, has
  nothing to undo, and a text interface never offers it.
- **A position can only come from a gesture.** An action needing one is reachable only that way;
  one where it is optional is reachable from anywhere, and the layer places what it was not given.
- **Running an action returns mutations, and may also ask** for a layer to be opened, a selection
  to be moved, or a line to be said. It changes nothing itself.
- **Undo restores the graph, never the context.** A delete that cleared the selection leaves it
  cleared when undone: where you are looking is the user's, not the log's.
- **`when` decides whether an action is shown; `check` decides what happens when it runs.** They
  are not the same test — `when` asks whether this is a thing here at all, `check` asks whether
  these particular arguments would work, and cannot be answered until they are filled.
- **What does not apply is not shown.** Greying out is for a fixed row of controls whose positions
  are worth learning, like the header's; a list built from the selection has no positions to keep,
  so an entry that cannot run is only noise.
- **An action refuses in words**, and the refusal goes to the strip like everything else the app
  says. A name already taken, a node moved inside itself, a second proxy for the same block.
- **One step per action**, whatever it took to do it — a card dropped in a group moved and joined,
  and undo takes back both.

**Two tiers.**

| | Is | Offered by |
|---|---|---|
| **action** | something somebody meant, and could say — create, rename, relate, group, note, refer, arrange | gestures, the tray, the terminal |
| **adjustment** | positional and unsayable — where a card rests, how big a note is, where an interface sits on its edge, which wall an end leaves by | gestures only. Never named or ranked |

- **A diagram declares which adjustments it accepts**, and may accept none — in which case the engine
  owns every position on it and a drag means something else.
- **Queries are not on the surface.** Whether a name is free, how many steps a project has, its
  hash and whether it is saving are readable state, not things to do.
- **Files are the page's, not a module's** — export, import, new, and later the workspace.

**A module adds no action for anything it draws.** Requirements, activity, parametrics, state
machines and sequence were each walked against the surface and not one needed an action to *render*
or to *edit* — a module is a vocabulary, renderers, a layout law and a gesture map.

**(planned) Behavior adds two, and they are the engine's rather than a module's**, because both
change a project wholesale and neither is about drawing: **`scope`**, which points a behavior
project at one or more structures and seeds it, and **`promote`**, which turns a derived state
machine into blocks. Both are sayable, both write mutations, and both are on the one registry like
everything else.

**Every action, adjustment and gesture is enumerated in [actions.md](actions.md).**


## Views

*(planned) — the whole section. Today there is one view, written into the canvas.*

**A view is a project holding diagrams.** Its own tree is folders and diagrams, so a view can be
organised by behaviour, by requirement, by function — whatever the work is about. It has its own
log and its own export, like any project, and it appears in the workspace as its own entry.

- **A diagram is a block whose definition names a view module.** A folder beside it is an ordinary
  block. Neither costs a concept. *Diagram* is what a layer looks like drawn on the canvas, so it
  names no module of its own.
- **Six view modules, three per kind of project**, and the kind is visible from what is being drawn
  rather than declared:

  | | Object structures | Behavior structures |
  |---|---|---|
  | default | **block** | **activity** |
  | others | **table**, **matrix** | **sequence**, **state** |

  - **A behavior is not offered a table or a matrix**, because what it holds is tied to the objects
    interacting and those already have both. Nothing structural stops one — a module reads a layer,
    and a behavior layer is a layer — so this is what is *offered*, and an allocation matrix of
    participants against actions is the obvious thing to reconsider it for.
- **Everything a diagram shows is a proxy**, whatever it looks like: a card, a table row, a label
  along a matrix axis. How one draws is its subtype's, so a table is the same objects as a diagram
  drawn differently rather than a second kind of thing.
- **Things arrive by being put there** — a block, a selection of them, or a whole project by its
  root, which is how a diagram comes to be about a project rather than a handful of its parts.
- **Adding something to a view creates a proxy in the view**, and touches nothing else. Dragging a
  block into a matrix does not write to that block's project.
- **A diagram's own variation is its contents and its fields**, never configuration: its definition
  configures every diagram of that subtype alike, so two matrices differ in what they hold and what
  their fields say.
- **Nothing about *how a view looks* enters the project it reads** — its contents, its arrangement
  and its fields are its own. **What is done through a proxy does reach home**, and always did: a
  proxy is a stand-in, so renaming one renames the block, and a behavior acting on one modifies the
  block it stands for. That is one rule, not an exception — the change is written where the element
  lives.
- **A relationship goes to the log of the project that owns its ends**, resolved through the
  proxies — so filling in a matrix cell is a real relationship in the real project, while a view's
  flows between its own elements stay in its own log.
- **A relationship across two projects is a proxy and an ordinary edge**, both in the project of the
  end making the claim. An edge's ends stay plain ids; only a proxy's target widens.
- **Undo reverts wherever the work landed**, not where the user was standing.
- **A view may hold proxies into as many projects as it likes.** Nothing limits it to one.
- **A project opened alone is read in isolation** — its own root, its own contents, and nothing
  about who imported it. A proxy is a one-way import, so the project it points at never needs to
  know. Cross-project relationships are read in the **workspace** view, where the workspace's root
  is the root, every project below it is a block, and the lines between them are the imports.

**How it draws** is the second half, and it is what a diagram's definition configures — six
components, and nothing else:

| | Is |
|---|---|
| **scope** | a **layer** — one element's contents — or a **set**, which is whatever it holds proxies of |
| **vocabulary** | what this notation calls a block, a group, a relationship, an interface — and which definitions it offers |
| **renderers** | how to draw, keyed by an element's or relationship's `type` |
| **layout law** | sizes, and either positions or nothing |
| **gesture map** | which gesture reaches which action, and where its arguments come from |
| **adjustments** | which of the four positional adjustments it accepts |

**What a view module provides** is the other half, and it is the module's rather than any
definition's — the **projection surface**. A layer is the current scope; a **layer view** is that
layer projected through the rules and packages in scope and rendered by one of the three modules.

| | Is |
|---|---|
| **the surround** | a frame and its walls, or nothing. The diagram draws a border with interfaces seated on it; a table has rows and no frame |
| **the viewport** | a camera, or a scrollbar. What "fit" and "go to this" mean here |
| **the chrome** | which controls a view offers — a breadcrumb, the arrangements, the axis, the toggles that only make sense in it |
| **asking** | where a gesture puts a question, since one asks for a name before anything is made |

- **Per module, never per definition.** Every diagram has a frame because diagrams project onto a
  plane, not because a definition asked for one. This is the line the components do not cross: they
  configure the things *in* a layer, and a component that reached the frame would give every table
  a border it cannot draw.
- **A diagram names actions; it never writes mutations.** That is what keeps one input method
  indistinguishable from another, and what lets two diagrams bind one action to different gestures.
- **An unregistered `type` falls back to the engine's card.** A diagram declares what it draws
  differently, not everything it draws — so a half-built one is usable.
- **A `figure` has no fallback**: the engine places it and never draws it, so a diagram that offers a
  figure type must render it. Its size comes from the definition.
- **A layout law may decline to place**, and then the layer arranges as it does today — stored
  positions held, everything else filled in around them.
- **A diagram that accepts no adjustments** is one where the engine owns every position. Sequence
  accepts one, `seat`, because the only thing worth dragging there is where an occurrence sits on
  its own lifeline.
- **There is no structure/behavior classifier.** A project that owns its objects is a structure, one
  that owns only diagrams is a view, one that owns some of each is a behavior — visible from what it
  holds, so nothing declares it.
- **Components are configured per definition and never per element**, so every diagram of a subtype
  behaves alike. Where two must differ they differ in contents and fields.
- **A component reads its own configuration and no other's.** They share one element and one log, so
  this is what makes them separable in fact and not only in file layout.

**Which view you have open is display state.** The view itself is not: it is a graph with a log,
and making one is an ordinary change.


## Shell

- One page: header, terminal rail, then explorer beside the working area.
- Header reads `mndflow [project]` — the project's own name, which is root's label.
- **(planned)** With several projects open, the header names the one **in context** — the project
  the selected explorer row belongs to — and the explorer lists them all in the tree they were
  filed into.
- **It names the working session** — `working session`, held quiet, with the snapshot explained
  on hover. When the browser stops accepting the log the same control becomes
  `⚠ not being saved — export` and stops being quiet, because the answer to both is that button.
- Controls are icons with tooltips: undo `↤`, redo `↦`, export `⤓`, import `⤒`, new `＋`.
  Each greys out when it has nothing to do.
- `new` asks before discarding, and import reports a file that is not a mndflow project — both
  in the strip, like everything else the app says.
- The readout toggle sits at the end of the same row.


## Terminal rail

*Frozen pending refinement — see tasks.md, stream Z.*

- A contextual prompt and a typed answer at the top of the page, with no frame of its own.
- Past exchanges rise and fade off the top edge; the live line stays at the foot.
- Reverted steps show struck through.
- Suggestion chips fill the other half of the row, tiled in the same treemap shape a container
  uses, with the likeliest reading marked as the default.
- A chip either answers the question or runs a graph operation directly — add, link, open.

**(planned) Two functions, told apart by whether it is open.** Reasoning in
[design.md](design.md) under *The terminal*.

- **Collapsed** — the app's primary text entry point. Typing ranks the actions available in the
  current context; it asks nothing.
- **Expanded** — guidance: the question worth answering next, nudges, documentation for what is in
  front of you, and a tutorial walking somebody through a diagram of a given kind over a sample
  project.
- **It reads context and never changes it.** No action it can reach opens a layer or moves the
  selection — the explorer and the pointer navigate.
- **Filtering the explorer is a mode, not an action.**
- `Enter` confirms the **highlighted** option; arrow keys move the highlight, and overruling the
  default is the feedback the ranking learns from.


## Object explorer

**Contents**

- Structure and only structure: nodes nested to any depth.
- Groups, notes and every field never appear.
- Interfaces are hidden behind a toggle; when shown they sit at the same level as child blocks,
  sorted after them, with their own icon and no branch of their own.
- Proxies are never listed — a proxy is a second appearance of something already there.
- Notes and groups are never listed either: the explorer is the tree, and the tree is blocks.
- A node whose only children are interfaces still reads as a block.
- **(planned)** Every open project is a root in the same tree, filed into the folders the workspace
  keeps. **The project a selected row belongs to is the context**, which is what decides where a
  change is written — positional, so there is no mode and nothing to switch.
- **(planned)** A **view** appears as a root like any other and lists what it holds proxies of. It
  is the one place a proxy *is* listed, because in a view there is nothing else to list.

**Navigation**

- Single click sets the scope: the canvas draws that node's view, and its branch opens — asking
  to look inside something shows what is inside it.
- Double-click or right-click renames in place — a row is all name, so it takes the same rule
  every name takes.
- Right-clicking the clear space below the rows makes a block **at the root**, wherever you are
  scoped: the rows are what layers look like here, so the space around all of them is the root's
  own background. The bar's ＋ button is the one that acts on the open layer.
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
- Dragging a row onto the canvas places a proxy for it in the open layer.
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
decides which sides a `directed` relationship attaches to, and **(planned)** how its line is drawn.
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
  - Nine chips is the default cap; at ten or more, eight are drawn and the last reads `...`, which
    opens the container.
  - Each chip's fill shade follows how closely its name relates to the container's.
  - A chip's name shrinks to fit and hides when even the floor will not fit; hover names it.
  - Nesting stops at the first layer: a child container is marked as one and no further.
  - A container is barely bigger than a block; the cells shrink instead of the card growing.
- **Proxy** — a stand-in for a block living in another layer, so that a relationship reaching
  it can be seen here. A visual shortcut; it changes nothing about the relationship.
  - **It is bound to its block by `of`, a field — never by a relationship.** A proxy is not two
    things joined, it is one thing appearing twice, which is a property of the appearance.
  - **An appearance is the proxy's; the thing is the block's.** Where it sits, how it draws and
    its colour are its own, because they are true only of this layer. Its name, body, fields,
    interfaces, children and type are the block's, because there is only one thing to have them.
  - **A relationship drawn to a proxy is stored here and reaches the block.** That is all
    "reference" means, and it is derived from where the ends live rather than given as a form.
  - Greyed, hatched and dashed, marked `↗`; the only dashed card on the canvas. The colour is on
    the lines, not the card: **a relationship reaching a reference draws violet and dashed**,
    label and arrowheads with it, so a line leaving the layer is told apart at a glance.
  - Shows the name of the block it stands for; renaming it renames that block.
  - Has no inside: double-clicking goes to where that block actually lives and selects it there.
  - Nothing nests into one, and it never becomes an interface.
  - Points at a real block, never at another proxy — the explorer is the only place one is
    dragged from and it does not list them.
  - **One per layer per block**, and never for a block already in that layer — a second
    appearance of the same thing says nothing the first did not.
  - Placed only by the user, never automatically. Deleting one removes the placeholder only;
    it goes on its own when its block or its reference is deleted.
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
- **A port and an anchor are different things.** A `directed` relationship's ends are typed — one
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

- A plain line, undirected by default. Direction and reversal come from its row in the contents
  tray.
- Joins two **nodes** and meets each at a seat. The ends are the nodes; the seat is only where
  the line lands.
- Drawn by right-click-dragging from anywhere on a node, an interface, or a frame wall. It
  creates no interfaces. An end that set off from or landed on one keeps it as its anchor; an end
  that named a wall keeps the wall.
- Released over empty canvas, the far node is created too.
- `Esc` cancels the gesture.
- Right-clicking a line names its type — a name is edited where it is drawn, and this is the
  last name on the canvas that took a different gesture.
- The form a right drag makes is picked in the canvas toolbar: plain, flow, or assoc.
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
- A `directed` relationship takes the sides the layer's axis gives it — out on the forward face, in
  on the one behind — so it runs with the layer rather than doubling back across it. On a `free`
  layer nothing is imposed.
- **Lanes**: runs that would share a line are spread half a cell apart, centred on where they
  would have gone, so parallel relationships stay distinct. Only the interior segments move;
  the ends stay on their seats.
- A card moving is what moves a line. There is no step, no history, and nothing to converge on.

### Groups

- **The generic organizational element** — a boundary round a set, meaning whatever its
  definition says. A swimlane, a region, a package boundary and a trace assertion are all groups.
  **(planned)** — only the bare group exists today.
- Drawn round the blocks that name it. Its members are derived from their membership, never
  stored on the group.
- The boundary is its members' bounds plus half a cell of margin, so it lands on the grid when
  its members do — its size is a fact about what it holds.
- Clicking the background selects it; dragging a selected boundary moves every member as one
  action.
- Dropping a card in the clear space inside joins; dropping it outside leaves. Dropping *on* a
  card is a move into that card instead.
- A node created inside a boundary joins that group, by the same reckoning as a drop there.
- Membership is decided against the boundary as it stood when the drag began — from the members
  standing still, or from all of them where none is. Dragging the boundary itself moves the group
  and changes no membership; layout moves one as a single unit — see Coordinates and layout.
- **One member is allowed**, and a group that falls to one stays a group. `Ctrl`/`Cmd` + `G`
  makes one; right-click still makes an interface on a single card. Removing a group is the
  user's to do — the one exception is a group emptied entirely, which has no bounds to draw and
  no way to be reached, so it goes.
- Boundaries overlap freely and their backgrounds compound.
- Its name is edited on the boundary itself.
- **A group draws as its definition says.** A bare group — one nobody typed — is a faint dashed
  line, which is the default rather than the rule. **(planned)**

### Notes

- A card of text placed in a layer, tied by faint dotted leaders to whatever it describes. The
  other way an element describes — amber by default, since green is structure and amber is
  description. A definition's colour wins where it sets one.
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
- Canvas toolbar top-right — **relationships**, all settings: interfaces on the canvas, the form
  a right drag draws, curves or angles, and past a divider which way the layer reads. Each shows
  what it is on.
- Canvas arrangements bottom-right, opposite the zoom controls — **four verbs**. Icons only, and
  none of them is ever lit: an arrangement is something you do, not something a layer is in.
- Zoom controls bottom-left, riding above the contents tray.
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
| a relationship | names its type | — |
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


## Contents tray

The bottom tray, and the only panel. **A table of everything the open layer holds** — blocks,
interfaces, relationships, groups and notes together. It is the only place a relationship or an
interface can be found without hunting for it on the drawing.

**Opening and closing**

- Shut until asked for: the `contents` tab in the middle of the tray bar opens it, and a click
  anywhere outside puts it away. The bar shows which layer is being listed.
- **Open, it takes a third of the canvas** and the drawing keeps the other two thirds — the drawing
  shrinks and re-centres rather than being covered. Its height does not change with what it
  lists, so filtering never moves a row out from under the pointer.
- **The frame reshapes to the room it is left**, rather than keeping its old proportions and
  letterboxing. How far it can grow is still bounded by the zoom ceiling, so a sparse layer keeps
  room around it instead of being magnified.
- It stays open while you work down it. Selecting rows is what it is for.

**Reading it**

- Filter chips narrow to one form, each showing how many there are; a form with none is disabled.
- Sortable by form or by name; clicking the column already sorted by turns it around.
- **Hovering a row lights that thing on the canvas**, and shows what it says and what it carries
  above the table. The canvas's own hover wins where the two disagree.
- **Clicking a row selects it on the canvas.**

**Changing things from a row**

- Double-click a name to rename; single-click a type to subtype. Fields open rather than sitting
  there, so a row stays clickable.
- Row buttons appear on hover and carry whatever that form can be told to do:

  | Row | Buttons |
  |---|---|
  | relationship | direction, turn it around, remove |
  | interface | marking, what it says, delete |
  | proxy | go to where it lives, what it says, delete |
  | block, group, note | what it says, delete |

- **What it says** opens the row out: its body, the groups it belongs to, and its fields,
  with a field for adding one.

## Readout drawer

- Slides in over the canvas from the right edge, toggled from the header.
- Three tabs, since only one is ever being read:
  - **relations** — the kinds this project uses, each with how many edges carry it. Add, rename
    (renaming every edge with it), or drop (leaving those edges unnamed).
  - **actions** — one line per step, newest first, reverted ones struck through.
  - **matching** — how each workflow scores against what is being typed.


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
