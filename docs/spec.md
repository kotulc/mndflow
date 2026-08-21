# Spec

What each part of mndflow does, component by component — short statements of the current
target.

- **Why any of it is this way** → [design.md](design.md).
- **What is not built, and what is undecided** → [tasks.md](tasks.md).
- **(planned)** marks a line that is the target but not yet the behaviour.

> **This file is the present, and it speaks the pre-rework vocabulary.** On 2026-08-18 Clay settled
> the **simplified block model** — one block, no element forms, `proxy` → **reference**, `set` →
> **folder**, no `kind` — recorded in [definitions.md](definitions.md) and argued in
> [design.md](design.md) under *The simplified block model*. **The code has not moved yet**, so the
> lines below still say `set`, `kind` and `element form` where the code does, and that is correct
> for this file. **`B.1` landed on 2026-08-20**, so *proxy* is gone from the prose here and from
> `src/` — what remains is the schema token `form: "proxy"`, which is `B.6`/`B.17`'s to change. Where the two disagree, definitions.md is the target and this is what
> runs. The migration is story `ST.4` / stream `B` in [plan.md](plan.md). **Do not add a new use of
> a retired word here** — describe what landed, in the new words, as each row lands.

mndflow is a client-only web app for assembling systems out of simple descriptive building
blocks. There is no server: a step log lives in the tab, and the graph is folded from it.


## Project model

The graph is **elements** and **relationships**, and nothing else. An element is placed and
drawn; a relationship joins two of them. Everything else describes one of the two.

**Elements** — held in `graph.elements`. "Node" is the same thing in the graph-theory register.

- **`form` is closed and the engine's; `type` is open and the user's.** One rule, and it holds for
  elements, relationships and fields alike.
- `form` says which of four it is: **block** (the base and the default), **note**, **group**, or
  **reference**. It decides what draws an element and which rules reach it.
- **`figure` was a fifth form and is retired**: nothing in the core ever placed one.
  An activity's fork, decision, initial, final, merge and join are **derived from counting
  relationships and guards**, so a module draws them and the graph stores none; and the ornament a
  package ships is a **block whose definition carries a shape and a size** — `SHAPES` and the
  definition's `size` already say every one of them, a fork bar being a `rect` sized thin. A form
  is earned by telling the engine something about placement, and ornament told it nothing. The door
  heals a legacy `figure` to `block` so old files still open.
- **Which definitions take no interface is a `degree` constraint** the `rules` component carries,
  not a form and not a branch in the `interface` action.
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
  | explorer — new **project** (bar `＋` / empty-tree link) | checked — unique among open projects (`workspace.mayName`); exists once named (U.14 ◐) |
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
  layer's axis gives them. **The form says there is a direction; `dir` only refines which way** —
  a `directed` relationship left at `dir: "none"` reads source → target and draws an arrowhead
  (R.7, proven), which is how every one the toolbar draws is stored. Wanting no arrows is `reform`
  back to a plain line.
- **Anything joining two elements is a relationship.** One may draw as something other than a
  routed line — a tie is a leader, taking no seats and never routed by hand — but that is a rule
  about drawing, not a second way to join things. One mechanism, one cascade when an end is
  deleted, one list to read them from. **Drawing faint is not the same as being untouchable**: a
  tie takes the pointer like any other edge (V.16).
- **Two more are derived, because nobody has to say them.** Being derived makes neither less the
  engine's business; it only means the engine works it out.

  | | Derived from | Draws |
  |---|---|---|
  | **reference** | an end is a **reference** — it reaches something in another layer or project | violet and dashed, held back at reduced opacity so the form and the label read first; hover and selection bring it to full |
  | **tie** | an end is a **note** — a note relates to what it describes and to nothing else | a faint leader with no seats; it takes the pointer and can be picked and untied (V.16) |

- A reference keeps whichever form it was given and keeps its direction. Both routes to one draw
  alike — an end drawn straight onto a reference, and an end substituted by the reference standing in for it.
- What a reference stands for is a property of the appearance, not a relationship: one thing appearing
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
  | `link` | another element or definition, by id | `many` |

- **No identity of its own**: a field is addressed by its name on the thing carrying it, and
  setting the same name again rewrites it.
- Never structural: never in the explorer, never changing what contains what.
- **A `link` field points at an element without drawing a line**, which is how a part property or a
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
  applies to: `block`/`note`/`group`/`proxy` for an element, `line`/`directed`
  for a relationship. A project's relation vocabulary is just the definitions of relationship form.
- **Every reference to a definition is by id**, so renaming one never orphans a typed interface, a
  flow's item, or a nested data structure.
- **Presentation lives on the definition, never on the usage** — icon, line style and arrowhead,
  and the `style` component's dials. It is therefore structurally absent from an export rather than
  filtered out of one.
- **No colour among them** (Y.7, proven). `Definition.color` was the one free-form value in the
  surface and the only way a definition could look wrong; it is gone, and the door drops it off a
  definition the way it already dropped it off an element. **Dropped, not mapped** — a nearest-slot
  guess would be wrong more often than the default is, and the default is *a definition saying
  nothing*, which is exactly what a dropped colour leaves it saying.
- **A definition that names no type has no presentation to read**, so an untyped card keeps the
  theme's own border and an untyped route the engine's own line. Otherwise *no type yet* and
  *deliberately quiet* would look the same.
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

- **The components an open module publishes**, and what each key holds. **`card`**, **`constraints`**,
  **`style`**, **`view`** and **`rules`** are published and validated. The diagram projection surface
  draws from card and style (S2.6 / S2.6b); rules evaluate and advise in the tray (S5.3):

  | | Holds |
  |---|---|
  | `card` | `layout` — one of `name`, `type`, `fields`, `compartments`, `icon`, `shape`; `shape` — one of `rect`, `round`, `diamond`, `ellipse`, `hex`; `label` — `inside`, `below` or `none`; and `shows`, which fields draw on it and in what order |
  | `style` | `slot` and `emphasis` (the dials a definition picks within the theme's palette), `weight` and `voice`, plus `set` — a style set by name — over the portable typed fields `line` and `head`. Resolved with `styleOf` / `lookOf`; `ramp()` turns a slot and an emphasis into a theme variable |
  | `constraints` | `required` |
  | `rules` | `ends`, `holds`, `degree`, `match`. `among` walks `isa` so a named definition means it or anything below it |
  | `view` | on a diagram's definition: which view module, its arrangement, the module's **`word`** / **`creates`** (default definition for a created block), and the abstraction cap **`N`** (default 5). Six modules registered, each with a distinct **`icon`** glyph (U.9); the labelled view toggle draws those glyphs (U.8). The block diagram surface lives under `modules/view/diagram/`. Create / `infer` are not yet wired to `word` / `creates` |

  Each is defined in [definitions.md](definitions.md) under *Rules, constraints and components*.

  - **The plain card is the default written down** — `type` layout, `rect`, label inside, showing
    no fields — which is today's card said as one configuration among others. The diagram reads
    `PLAIN` and strokes shapes from `card` / `lookOf` (S2.6b). `shaped` and `outline` on the card
    module compute a shape inside the engine's box. Control nodes are counted and drawn by the
    activity module (A.7b).
  - **Style is drawn from** via `lookOf` on the diagram; **table** mounts when `view.module` is
    `table` — rows pick/open, reference open withheld (A.1, proven); **matrix** mounts when named
    (A.2, suite). Both are **Contents-modelled panel shells** (~⅓ stage; expand fills stage) with
    crumbs. **App wires `path` / `onUp`** (U.18, proven), so the crumb reads the trail the page
    already holds, and **the types filter is the rail's group** (Y.4, proven) rather than a cycle
    each stage draws. Expand still does not cover Contents (`W.1`). **Activity** mounts when `view.module` is `activity` — dimmed derived labels and
    inferred order (A.7b, proven); **state** and **sequence** mount the same way (A.8 / A.9,
    proven).
  - **A component owning a key owns the whole of it**, so a key `card` does not recognise is
    refused. That is the opposite of an unrecognised *component*, which is left alone: one is a
    misspelling this build can see, the other may be a newer build's.
  - **`block` is the sixth published component, and it names a block module** (B.2). A **block
    module** is engine code behind one sort of block — its configuration surface and its
    behaviour — and the set is **open**: a code change ships one more, additively. Eight are
    registered: `workspace`, `project`, `folder`, `base`, `view`, `resource`, `group`, `note`.
    Each owns its own `check`, and `block` delegates the module-specific keys to it; a definition
    saying nothing gets `base`. **The shipped `base` package** (`packages/base/definitions.yaml`)
    carries one definition per module, and every package or project subtype extends one of them.
    **Nothing keys off it yet** — later rows wire drawing, placement and import-time enforcement
    (`B.3`, `B.15`, `B.16`). It is loaded by the ordinary `packages/**` glob, so it is in the
    catalog and importable by name, and it reaches the type strip only where a project's
    `vocabulary` names it.
  - **Presets** — `ship` / `presets` / `preset` register a named set of component choices. The
    registry is empty of concrete presets until a package or build ships one.

  - **The engine always places a rectangle.** Every seat, route and interface reads the box, so a
    shape changes what is **drawn** and never where anything attaches. A line meeting the box near
    a diamond's corner appears to touch empty space; a renderer may draw its own port marks to
    soften that.
  - **Card layouts and style sets are open** — extended by a code change, additively. The forms,
    the ops and the actions are closed. Confusing the two is what turns an engine into a plugin
    host.

- **A constraint bounds a thing in itself; a rule governs how things interact.** Both are
  declared on a definition and hold over every usage of it, reaching that subtype's fields, its
  interfaces and the relationships at it. **A rule naming a definition reaches everything below
  it** (`among` via `isa`). The **constraints** component publishes `required` and resolves with
  `constraintsOf`; the **rules** component publishes `ends`, `holds`, `degree` and `match` and
  resolves with `rulesOf`. Value-missing evaluation and tray/strip reporting are live (S5.3).
- **They advise while modelling and refuse only at translation.** A violation is a note in the
  tray (and the strip on select), never a refused change: a model is legitimately unfinished. A
  **translator** asks the same checks as it emits, and declines to write a non-compliant file.
- **What the five cannot say is a module's `validate` hook**, in code. `publish` registers it;
  `findings(graph, id)` collects every published hook's words about one usage — advise only. There
  is no rule language, and local checks certify wiring rather than a whole model — whether every
  requirement is satisfied is a global walk, which is a translator's to make. No shipped module
  supplies a real hook yet; the Contents tray still surfaces constraint/rule notes only.
- A definition may **`extend`** one other, by reference — usually one a package ships. **One
  parent**, cycles stop, and a parent that is not loaded ends the chain with the subtype standing
  on its own declarations. `isa` walks it, which is how a rule reaches every subtype.
- **Resolving one**: `resolved()` unions fields with the subtype's winning by name, and merges
  `components` per key — a key it does not mention is inherited whole. The view is cached per
  fold. `cardOf`, `styleOf`, `rulesOf` and `constraintsOf` read that view, so a subtype draws
  and constrains from what it inherits.
- **Extension is subtyping, never overriding.** A package's definitions are never altered;
  refining one means making a new definition that *is* it.
- **A rule naming a definition means it or anything below it.** Without that, an imported
  standard's rules would reach only its own definitions and nothing anybody models.
- Shipped packages load as graphs under stable `pkg_*` ids. **Nothing shadows**: every reference
  is a path, so two packages naming a thing alike are two different definitions and importing one
  can never change what an existing element means. Definitions are addressed by path
  (`defOf` / `scoped`); nothing is copied into a consumer's `defs`.
- A project draws definitions from a **list of packages, in the order imported** —
  `graph.vocabulary` / `set_vocabulary` are that list (`string[]` of package ids). A legacy
  subject-matter stem heals through `asVocabulary` at the door and on fold. The old
  `Domain.relations` seeding bridge is gone; entry writes the healed list.
- **Two definitions loaded under one name are shown with their packages**, and import
  order decides which is offered first. Ambiguity in a picker is not shadowing — neither is
  hidden — and the answer to it is presentation, not resolution.
- **A package resists editing.** Changing one is refused with the reason, and the strip offers
  the way through: **unlock** it, or **fork** it and change the copy (S4.8, seeded lock proven).
  A fork takes a new project id, so anything pointing at the original keeps pointing there rather
  than quietly following the copy. Unlock and fork are workspace operations, not registry actions.
- **Locked is the workspace's word, not the file's.** The same project is a package you
  are using or one you are writing depending on which you are doing, so nothing in it says.
- **A reference reaching another project is written as a path**, `proj_a9f/def_pump` — the
  project, a slash, then the id inside it. An id alone means this project, so every reference
  written so far still reads. One convention serves all three places one is held: a reference's `of`,
  an element's `type`, and a `link` field's value. Ids never contain a slash, so nothing is
  ambiguous, and a reader splits on the first one or does not have to split at all. `refTo` and
  `refAt` are the two ends of it. The workspace admits another project (and a shipped package)
  under that path; a project's own `vocabulary` list chooses which packages it draws on, in
  import order.
- **A package** is a set of definitions somebody ships — plain names, formal names, fields,
  presentation and mappings. It is data, adds no code, and **maps names and presentation but never
  structure**; a notation needing structural change is a module instead. **Shipped**:
  `packages/requirements/` (requirement + five relationships), `packages/flow/` (control /
  object / transition), `packages/parametrics/` (constraint with size and style),
  `packages/behavior/` (`action` + `state`, and activity / sequence / state words with verb `do` —
  A.10; activity view reads the verb for derived labels, A.7b), and **`packages/sysml/`**,
  **`packages/uml/`**, **`packages/uaf/`** (tables of definitions, `names`, and mappings —
  ornaments as shape + size; catalog load proven, A.11). Formal `names` also sit on behavior /
  flow / requirements / parametrics (A.11). See [design.md](design.md) under *Packages and
  modules*.
- **A definition subtypes within a form, never across one.** Nothing a user defines can change
  what a thing *is*.
- **A data structure is a definition**, not an element form: it declares fields, and a block typed
  by it is drawn only where somebody places one.
- Definitions are not elements: no id in `graph.elements`, no row in the explorer.
- A `link` field may target an element or a definition — "typed by" and "points at" are one
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

- The log lives in the browser under a **key per project**. **Importing a file replaces the session
  and is saved from then on** — a file is a snapshot, the browser is the working copy.
- **An export is the graph, not the log.** `{ schema, id, graph, meta }`, pretty-printed
  JSON. Its size follows the model rather than how long somebody worked, and its diff shows the
  elements and relationships that changed rather than the actions that changed them.
- **Importing one is a checkpoint.** The file becomes a log holding a single `checkpoint` step, so
  there is no second format and no second reader.
- **The log never rides along.** Undo is a working-copy concern; history across machines is git's.
- **A project carries an `id`**, minted once and kept for life. It is what a cross-project
  reference points at, so renaming a project — or its file — breaks nothing.
- **The suggested filename follows the project's name**, so the two stop drifting apart.
- **On Chromium, export can bind a live file handle** via the File System Access API; when the
  picker is refused or unavailable, the ordinary download path is the fallback. A bound handle is
  held (`store.hold`) and probed for drift (`store.probe`); focus and visibility listeners
  re-attach when the document is replaced. The header's `data-where` is `session`, `drifted` or
  `unsaved`; when drifted it says the file changed and reopen takes the disk copy.
- **A rendered SVG of the open layer** can be produced by `svgOf` on the diagram module and
  downloaded beside the source export (F.3, proven).
- **Nothing still at its default is written.** No nulls, no empty lists, no colour every card
  already has — a file the size of the choices in it.
- **The base is what cannot be ignored**, and everything else is `meta`.

  | | Says |
  |---|---|
  | `schema` | which shape the file is — `"1.2"`. **Major must match; a higher minor is readable**, so a reader that knows 1.x opens a 1.3 file and skips what it does not recognise |
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
- **Ids say what they point at**: `block_`, `note_`, `group_`, `proxy_`, `edge_`,
  `def_`, `step_`, `proj_`. A name is never part of an id — it would go stale on a rename or force
  the id to be rewritten everywhere. Older `n_`/`e_`/`s_` ids stay valid; ids are opaque and
  nothing migrates.
- **Every log comes in through one door**, from storage or from a file, and is checked before it
  is folded. What can be repaired is repaired; what cannot is dropped rather than folded into a
  broken graph.
- **The user is told, once**: `repaired 2, could not read 1`, in the strip at the top of the
  canvas. Dismissable, and a clean log says nothing. **A normalisation that carried nothing is not
  a repair** — an empty domain stem was already no packages, so a pre-migration project without one
  opens silent (R.11, proven). A false alarm is what teaches people to ignore the real ones.
- **A panel that cannot draw itself says so and stays out of the way**, rather than taking the
  window with it. The log is unharmed, so closing the panel and carrying on is the way out.
- The log is kept in the browser. **If it stops fitting, the header says so** — `⚠ not being
  saved — export` — and the button exports. The session carries on; only persistence has stopped.
- Display preferences are outside the project: no history, no export.
- Storage is keyed, **one entry per project** — `mndflow.steps.<id>.v1`. A legacy
  `mndflow.steps.v1` migrates once into the session project's slot. Workspace state sits on its
  own key (`mndflow.workspace.v1`), apart from every graph. `useProject(projectId)` loads and saves
  that project's key; switching id clears the view; import adopts the file's project id. The
  explorer lists every open project as a root and click-switches context (S4.5).
  - **A key appears when a project is first changed, not when it is opened.** A checkpoint is not
    something anybody did, so an imported project nobody has touched is stored by nothing and
    costs nothing.
  - **When storage fills, the projects being worked in keep their logs and the rest are
    checkpointed** — history for the untouched, which is the cheapest thing to give up. The store
    exposes `watchPressure` / `pressureNote`; the strip shows that note when pressure rises.
  - **The workspace keeps its own list of what has been imported** (`Held.projects` on
    `mndflow.workspace.v1`), which is what an untouched project is remembered by when it has no
    key of its own.     `admit` places a reference of another project's root and appends that id; `folder`
    mints an ordinary block for filing; referencing the workspace itself is refused. **`begin`
    names a project into the workspace** — required, unique, then a log whose first step is that
    naming; never an untitled blank. **`App.newProject` goes through it** (U.18, proven). Explorer listing and context switch are live (S4.5).
    Workspace `⤓` and project `↧` export/import at schema `1.2` (S4.6).
  - **Clearing the session starts a new workspace** (U.13, proven): `store.clearSession()` drops
    every keyed project log, the workspace list, the session pointer and the live file handle;
    `clearWorkspace` leaves a blank `Held`. The designed opening is empty — no silently reminted
    project.

**Tests** — all in `tests/`, mirroring `src/`; a module's `index.ts` is tested by its folder's name.
A contract many modules keep is tested once over all of them (`tests/modules/conformance.test.ts`).
The lifecycle test covers two journeys: through the file format, and through storage. `npm test` at
the root.

- **Properties, never values.** Nothing asserts a coordinate, an id, a message or a count that
  tuning would change — the suite pins what must stay true, not what happens to be true.
- The terminal, the embedding modules and the `project` hook are deliberately uncovered; see
  [tasks.md](tasks.md) under *The suite* for why each.


## Action surface

*The registry is built — `actions/index.ts`, with scope, `check`, `sayable` and `writes`. Element,
edge, group, field, layer and adjustment actions are registered in `actions/*.ts` and **live
through `act.*` wrappers** generated from the registry (S1.6). Queries sit off `act`. Old closure
names remain as aliases. **`check` refusals reach the strip** via Ask + Canvas `onSay` (S1.7,
proven), including `NameField` taken-name marks.*

Everything that changes a project is a **record**, not a function somebody has to know about. One
registry, read by every input method: gestures, the contents tray, and later the terminal.

- Each record carries a **name**, a **label** the vocabulary may override, a **sentence saying what
  it does**, the **scope** it applies to, its **arguments**, and a **run** returning mutations.
- **The sentence is what gets matched**, so that "lay it out" reaches `arrange`. Names and labels
  are too short to score against.
- **Scope is the same question a gesture asks** — what is under the pointer, selected in the tray,
  or selected when somebody types. It names a form where that matters: `dissolve` applies to a
  group, `tie` to a note, `mark` to an interface. **`on` takes a list** where one action answers for
  more than one thing — `retype` for an element and a relationship alike (G.9e, proven). Widening a
  descriptor's own field is not widening the closed action set.
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
- **The offered-action list** is membership only — `offer(ctx)` in `actions/offer.ts` (G.9a):
  everything whose scope matches the current context and whose `when` says yes. It ranks over the
  registry and lives beside it, so the rail can be removed without taking the menu (S6.3). Order is
  never the list's: the explorer and canvas menus take a **fixed** order (G.9b / G.9d ◐, proven);
  the rail ranks chips by embedding similarity when typed (Z.1), and by learned preference for that
  context when idle (Z.3). **Explorer, rail and canvas draw from it.**
  Adjustments stay off the set through `when`; `check` is not consulted here, because it needs
  arguments nobody has filled.
- **A required `choice` expands into one entry per option** (R.5, proven). A menu asks no
  questions, so an action holding one was withheld everywhere; `expand` on the descriptor turns the
  options into the entries — `mark`, `direct` and `reform` carry it, `axis` and `arrange` do not
  (they have doors of their own). One rule, in `actions/fill.ts`'s `entries`, so the canvas menu and
  the explorer menu cannot disagree. **The action set does not widen**: one registered action,
  offered N times with different arguments. **`direct` and `reform` reach an edge this way** and
  had no home at all before it (R.6, proven).
- **What does not apply is not shown.** Greying out is for a fixed row of controls whose positions
  are worth learning, like the header's; a list built from the selection has no positions to keep,
  so an entry that cannot run is only noise.
- **An action refuses in words**, and the refusal goes to the strip like everything else the app
  says. A name already taken, a node moved inside itself, a second reference for the same block. A
  write against a locked package refuses with the reason and offers **unlock** or **fork** (S4.8).
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

**Behavior adds one, and it is the engine's rather than a module's**, because it changes a
project wholesale and is not about drawing: **`infer`**, which turns a selection of structure into
one behavior block — or a selection of actions into a state block, since it composes. Sayable, writes
mutations (and `Effect.home` for writing home), and on the one registry like everything else. It
absorbed the two the behaviour walk first proposed, `scope` and `promote`, both retired before they
were built. The page's `Chosen[]` reaches it through the explorer offer (G.9b); the suite walks
Chosen → offer → `run("infer")` → fold → activity draw (T.4, proven; browser skipped).

**Every action, adjustment and gesture is enumerated in [actions.md](actions.md).**


## Views

*The **block** diagram's projection surface lives under `modules/view/diagram/` — frame, crumbs,
prompts, compose, and a declared gesture map (S2.6 / S2.6b / S2.6c / S2.7). `Canvas.tsx` still
hosts. **Which module mounts** follows the sticky pick when it fits the project kind, else the
layer's `view.module` (U.8, proven). **Table** — rows pick/open; reference open withheld (A.1,
proven). **Matrix** when named (A.2, suite). **Both open as Contents-modelled panel shells**
(**filling the stage by default** since V.19 — the tab shrinks them back to ~⅓) and host **A.1's
crumbs**. **The types filter went to the rail** (Y.4, proven): each declares a `types` answer —
definition names on the table, relationship marks on the matrix — and neither draws a cycle of its
own.
**App wires `path` / `onUp`** (U.18, proven); the fallback — deriving trail and climb from the
graph — stays for a caller that omits them. Contents and Panel are untouched; expand does not yet
cover or replace Contents and `styles.css` has no `tray.full`, so a filled table still draws a
`contents` bar at its foot listing the same layer (`W.1` / `W.1a`). **Activity** — derived labels and inferred order draw dimmed
(A.7b, proven). **State** — empty infer offer; Reading A/B; DIM (A.8, proven). **Sequence** —
columns; directed then axis; DIM (A.9, proven). **Parked** on activity: RF framed host; gestures
on the activity plane; activity-final double ring. The rest of this section is still the target
for multi-view work.*

**A saved view is a block, and there is no kind of project for it.** A block whose definition
carries a `view` component, holding references of what it shows, filed in a folder — which is itself
an ordinary block. It can be organised by behaviour, by requirement, by function, wherever it is
filed, and it costs no concept: blocks nest, `view` is a published component, and external references
landed with S4.3.

- ***Diagram* means one thing**: what a layer looks like drawn on the canvas. It names no module,
  and it is not a second name for the block above.
- **Which view is showing is a display preference** — sticky per project in `mndflow.view.v1`,
  never in the log (U.8, proven). A labelled control beside the project root lists the three
  modules the project kind offers, each with its U.9 glyph. **Writes nothing.** The definition's
  `view.module` says how a layer **opens**; the toggle says what is shown **now**. App mounts from
  the sticky pick when it fits the kind; otherwise it mounts the layer's `view.module`.
- **Six view modules, three per kind of project**, and the kind is visible from what is being drawn
  rather than declared:

  | | Object structures | Behavior structures |
  |---|---|---|
  | default | **block** | **activity** |
  | others | **table**, **matrix** | **sequence**, **state** |

  - **Each module publishes a distinct `icon`** on `ViewModule` — block ▭, table ☰, matrix ⊞,
    activity ▸, sequence ⋮, state ◯ — sized and coloured by `.view-icon` (U.9). Re-registers keep
    the glyph. **The view toggle draws them** (U.8, proven). Definition / card `layout: icon` is
    stream E's, not this.
  - **A behavior is not offered a table or a matrix**, because what it holds is tied to the objects
    interacting and those already have both. Nothing structural stops one — a module reads a layer,
    and a behavior layer is a layer — so this is what is *offered*, and an allocation matrix of
    participants against actions is the obvious thing to reconsider it for.
- **Everything a diagram shows is a reference**, whatever it looks like: a card, a table row, a label
  along a matrix axis. How one draws is its subtype's, so a table is the same objects as a diagram
  drawn differently rather than a second kind of thing.
- **Things arrive by being put there** — a block, a selection of them, or a whole project by its
  root, which is how a diagram comes to be about a project rather than a handful of its parts.
- **Adding something to a view creates a reference in the view**, and touches nothing else. Dragging a
  block into a matrix does not write to that block's project.
- **`refer` takes a cross-project path**, not only a local id: a row dragged out of the explorer
  names the project it came from, and a reference into the project in context is stored bare, the
  way `of` already reads. A target in another project is not in this fold, so the path is the whole
  of what is checked — which is what lets a set be composed from more than one project.
  A reference to the **open layer itself** is refused — a layer cannot hold a stand-in for itself,
  and the action says so rather than each surface guarding it.
  **(planned)** A cross-project reference still draws as *missing*: nothing resolves another project's
  element for a label, and `workspace.resolve` is the resolver waiting to be handed down.
- **A diagram's own variation is its contents and its fields**, never configuration: its definition
  configures every diagram of that subtype alike, so two matrices differ in what they hold and what
  their fields say.
- **Nothing about *how a view looks* enters the project it reads** — its contents, its arrangement
  and its fields are its own. **What is done through a reference does reach home**, and always did: a
  reference is a stand-in, so renaming one renames the block, and a behavior acting on one modifies the
  block it stands for. That is one rule, not an exception — the change is written where the element
  lives.
- **A relationship goes to the log of the project that owns its ends**, resolved through the
  references — so filling in a matrix cell is a real relationship in the real project, while a view's
  flows between its own elements stay in its own log. **A write into a project that is not the one
  in context** goes through `Effect.into` / `writeInto` — the same door, an undoable step in the
  target's log (S4.9). **Parked**: App may not refresh after a foreign write.
- **A relationship across two projects is a reference and an ordinary edge**, both in the project of the
  end making the claim. An edge's ends stay plain ids; only a reference's target widens.
- **Undo reverts wherever the work landed**, not where the user was standing.
- **A view may hold references into as many projects as it likes.** Nothing limits it to one.
- **A project opened alone is read in isolation** — its own root, its own contents, and nothing
  about who imported it. A reference is a one-way import, so the project it points at never needs to
  know. Cross-project relationships are read in the **workspace** view, where the workspace's root
  is the root, every project below it is a block, and the lines between them are the imports.

**How it draws** is the second half, and it is what a diagram's definition configures — six
components, and nothing else:

| | Is |
|---|---|
| **scope** | a **layer** — one element's contents — or a **set**, which is whatever it holds references of |
| **vocabulary** | what this notation calls a block, a group, a relationship, an interface — and which definitions it offers |
| **renderers** | how to draw, keyed by an element's or relationship's `type` |
| **layout law** | sizes, and either positions or nothing |
| **gesture map** | which gesture reaches which action, and where its arguments come from |
| **adjustments** | which of the four positional adjustments it accepts |

**What a view module provides** is the other half, and it is the module's rather than any
definition's — the **projection surface**. A layer is the current scope; a **layer view** is that
layer projected through the rules and packages in scope and rendered by one of the six modules.

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
- **A definition drawn as ornament is a block with a `shape` and a `size`**, so it falls back to the
  engine's card like anything else rather than needing a module to render it.
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

### Behavior *(A.7a–A.9 landed)*

*The rules in full are [behaviors.md](behaviors.md); why they are those rules is [design.md](design.md)
under **Structure and behavior**. Only what the surface does is here. `infer` and writing-home via
`Effect.home` / `Effect.into` are live; **activity**, **state** and **sequence** modules mount —
derived labels and inferred order draw dimmed (DIM).*

- **A behavior is an overlay; the structure is the truth.** A behavior project holds **refs** to the
  participants, never parts, so an object block never appears in a behavior tree.
- **`infer` is how one comes to exist.** A selection — blocks, branches, whole projects, across as
  many as it reaches — becomes **one behavior block**, in a named behavior project or a new one.
  One-way, one-time and deterministic; **re-inferring makes a new block** and never edits an
  existing one. Reached from the explorer's offered list (G.9b, proven). **Parked**: a new behavior
  project from Infer is not admitted into `held.projects`, so it does not appear in the explorer.
- **It composes**: a selection of actions infers a `state` block the way structure infers an
  `action`.
- **A behavior block is a block**, and its definition is `action` or `state`. **A container is an
  activity, a leaf is an action** — the SysML mapping, not a stored distinction. Right-click makes
  whichever the **module in scope** declares (`view` carries `creates` / `word` and cap `N`,
  default 5); create / `infer` are not yet wired to those fields.
- **Order is read down four tiers** — a `flow` subtype, then any directed relationship, then
  position along the axis, then adjacency. **Inferred order draws dimmed** on activity, state and
  sequence (DIM in stage), as a derived chip does, so a guess never reads as a statement.
- **An action's label is derived and dimmed** — the module's verb and the participant's name, `do
  Pump`. Typing over it stores a real name; nothing transforms the noun. Proven on the activity
  view.
- **The state view** draws the same layer as states and transitions. Empty where nothing has been
  inferred, it **offers the inference**; Reading A or B per [behaviors.md](behaviors.md) (A.8,
  proven).
- **The sequence view** draws a column per participant, order running down each. **Explicit order
  from directed relations first**, implied from position along the axis as the fallback (A.9,
  proven).
- **Lanes come from the refs**, one per participant, so they always exist. A structure group infers
  to an ordinary group, not a lane. Past **N** actions the inference cuts higher in the tree (a
  tree slice, not connected-components) and a container becomes one action; `N` is `view`
  configuration, default **5**.
- **It writes home automatically, and only what the structure stated.** Interfaces a `flow` implies
  are written to the participants' own projects through the ref (`Effect.home` / `into`); anything
  guessed from position or adjacency writes nothing. The strip says so the first time and not after.
  **Parked**: App may not refresh after a foreign write.
- **Participation is derived**, asked of the behavior projects in scope. No back-reference is stored
  on a structure block, so a structure project opened alone reads clean.
- **Nothing is derived that somebody edits.** Control nodes, messages and lanes are counted and
  drawn; states are blocks, because people name and nest them.


## Shell

- One page: header, optional terminal rail (S6.3 — `import.meta.glob`; absent when `terminal/` is
  out), then explorer beside the working area.
- Header reads `mndflow [project]` — the project's own name, which is root's label.
- With several projects open, the header names the one **in context** — the project
  the selected explorer row belongs to — and the explorer lists them all in the tree they were
  filed into.
- **On a narrow window the header yields** (U.1): the identity truncates; the tool cluster stays
  put. The session / where control ellipsizes. The stage keeps `min-width: 0` and clips overflow,
  so chrome cannot steal its room.
- **The explorer bounds itself** (U.3, proven): width is `min(280px, 36vw)`; it collapses to a
  28px strip (◂/▸) with the tree hidden until reopened; the bar title ellipsizes.
- **A theme is a ramp, and it reaches the drawing** (Y.5 + Y.6, proven — reversing U.4). **Slots ×
  steps**: a step is a job (`fill`, `raised`, `line`, `edge`, `dim`, `ink`, plus `ground` and
  `divide` on the greys) and means the same job everywhere; a slot is a family. Six pickable —
  `primary`, `secondary`, `tertiary`, `quaternary`, `neutral`, `muted` — and four reserved to the
  app: `away`, `note`, `error`, `warn`. **Slots are theme-relative, never hues or lightnesses**:
  `primary` is green in retro and blue in modern. The reserved four keep their hue across themes,
  since *elsewhere* and *a note* mean one thing everywhere, and follow the ladder for lightness.
- **Steps are computed, not written.** A theme declares a lightness ladder and two numbers a slot;
  `oklch()` does the rest, and being perceptually uniform means one ladder holds its contrast in
  every hue. A new theme is about twenty numbers. Variables are `--s-<slot>-<step>`.
- **`line` and `stroke` are two jobs.** A border on a **card** sits against `fill`; the frame, the
  walls and a route are drawn on the **canvas ground**. One step served both until the whiteprint
  made the difference visible — a frame at `line` all but vanished on pale paper while the flow
  walls stayed, so the frame read as deleted.
- **The shell reads the same ramp** — `--bg`, `--surface`, `--border`, `--text`, `--muted` and
  `--accent` are names for steps, not values. One system: the header cannot drift from the canvas,
  which is how the diagram stayed green inside a blue shell for two waves.
- **The three looks are a family, not three palettes** (Y.6). **`retro`** is the greens the app was
  built in. **`modern` is a cyanotype** — blue *paper*, not a dark shell with blue accents, which is
  why it carries its own ladder with the ground well off the floor and chroma on its greys.
  **`light` is the whiteprint that became** — blue ink on pale paper, the ladder inverted, with
  `quaternary` as the red pencil an annotation is made in. `retro` is the default, and a session
  that saved the old name `current` reads as `retro`.
- **Beyond the frame is `--outside`**, a step off each theme's own ladder. It was a fixed near-black,
  which is right for a cyanotype and wrong on a whiteprint — a pale canvas sitting in a dark box.
- **One icon cycles the looks** (V.19), as the project's view toggle does — it wears the look that
  is on, and its tooltip names the next. The declared order *is* the cycle. Palettes are CSS variables selected by `data-theme` on the
  document; the choice sticks in `mndflow.theme.v1`. Shell overlays take chrome washes from the
  same variables. Root `styles/` (the `style` component) and the diagram's hard-coded colours are
  untouched — a theme never recolours a card, route or frame.
- **It names the working session** — `working session`, held quiet, with the snapshot explained
  on hover. When the browser stops accepting the log the same control becomes
  `⚠ not being saved — export` and stops being quiet, because the answer to both is that button.
- Controls are icons with tooltips: workspace export, workspace import. Each greys out when it has
  nothing to do. **Undo and redo left the header** (U.12). **All of them sit at one weight** — the
  two exports were on `--text` among `--muted` neighbours and read as louder than their company.
- **One export door each** (V.6, proven): the header is workspace-scoped and keeps workspace
  export and import; **the project's own export moved to its row in the tree**, where project
  scope lives. The two side-by-side header exports that read as a choice nobody could make are
  gone. *Exporting a project as a package is a different thing* and is still parked (D.2).
- **New workspace is a mark** (V.3, proven) — a discard glyph, never a refresh, which would read
  as *reload what is here*. **It keeps its confirm and nothing else**: the warning colour came off,
  since the confirm is what stands in front of it and a fixed hue that ignored the theme was doing
  the same job twice.
- **New workspace asks before discarding** (U.13), then clears the session and leaves a blank
  `Held`. Import reports a file that is not a mndflow project — both in the strip, like everything
  else the app says.
- **No readout drawer** (U.11, proven): the header toggle and the three tabs are gone. Relation
  kinds are edited in Contents; action history is future work — U.12 keeps only the last action,
  on one line at the explorer foot.


## Terminal rail

*Optional (S6.3). Collapsed offer wiring is G.9c; embedding rank is Z.1; overrule feedback is Z.2;
learned preference is Z.3; collapsed / expanded layout is U.5; caret at insertion is U.6; expanded
guidance is Z.4; tutorial is Z.5; context gloss is Z.6; user-facing label is Z.7; ranked doc hit
is Z.8. Reasoning in [design.md](design.md) under *The terminal*.*

- A contextual prompt and a typed answer at the top of the page, with no frame of its own.
- Past exchanges rise and fade off the top edge; the live line stays at the foot.
- Reverted steps show struck through.
- **Clicking the rail chrome focuses the caret** (G.9c) — click does not steal focus from the
  input (`preventDefault` on chrome that would).
- **Suggestion chips** are the offered-action list for the current context (`offer(ctx)`). When the
  line is **idle**, chips order by **shape-weighted preference** from `feedback.read()` (Z.3). When
  typed text is present and the embedding model is warm, chips **rank by embedding similarity**
  against what was typed (Z.1), with shape as tie-break and an **exact prior entry pinned first**;
  while the model is cold, a **substring** filter is the fallback. Chat warms embeddings on mount.
  A chip runs via `project.go` (`App` `Chat` `onAct={project.go}`).
- Arrow keys move the highlight; `Enter` takes the highlighted chip.
- **Overrule feedback** (Z.2) — taking a chip that is not the highlighted default (arrow then
  `Enter`, or click) records to local sticky storage `mndflow.rail.feedback.v1` with the
  situation's shape from `shape_of(ctx)`. Confirming the highlighted default writes nothing.
- **Learned preference** (Z.3) — two-tier: the literal entry remembered, the situation's shape
  weighted. Local sticky only; never logged.
- **Collapsed / expanded layout** (U.5) — defaults **collapsed**: one-line entry with inline chips.
  **Expanded** is a two-column guidance shell. ▾/▴ toggles between them; titles are **Expand Page
  Intelligence** / **Collapse Page Intelligence** (Z.7) — user-facing copy only; code and docs keep
  saying `rail`. Focus, arrows and Enter stay G.9c's; typed rank is Z.1's; feedback is Z.2's; idle /
  shape order is Z.3's; expanded guidance content is Z.4's.
- **Caret at the insertion point** (U.6) — while the line is empty, a block cursor overlays the
  input insertion point and the native caret is hidden; with text, the native caret.
- **Expanded guidance** (Z.4) — next question, hint and nudges from `guidance.ts`; the root tip
  counts via `blocksOf(null)`. When the question has choices, chips or typed `Enter` answer; when
  it has none, the rail shows ranked actions instead.
- **Context gloss** (Z.6) — expanded shows a short gloss for what is in front of you, from
  `samples/docs.json` (ten hand-authored terms keyed to [definitions.md](definitions.md)) via
  `doc_for(ctx)` / `shape_of`. Collapsed is unchanged. No generator.
- **One doc hit, ranked last** (Z.8) — when the line is typed, the chip list is offered actions
  plus at most one `docs.json` keyword hit, always last (ghost). Enter or click on that hit
  surfaces its gloss and runs no action. Idle and answer lists stay actions-only.
- **Tutorial** (Z.5) — expanded walks `samples/tutorial.json` via `walk_for(ctx)` on
  `proj_mndflow`; advances by pick / ancestors / open layer; an edge advances to the relationship
  step. Collapsed stays quiet; Z.4 / Z.6 / Z.7 unchanged.

**Two functions, told apart by whether it is open.**

- **Collapsed** — the app's primary text entry point. Typing **ranks** what is available against the
  typed text (Z.1 embedding), appending at most one documentation hit last (Z.8); idle order learns
  from overrule feedback (Z.3) and stays actions-only. It asks nothing.
- **Expanded** — guidance (Z.4): the question worth answering next, a hint, and nudges; plus a
  context gloss (Z.6) for what is in front of you; plus a tutorial (Z.5) walked over the sample
  project. Typed answer chips may append one doc ghost last (Z.8); idle/answer lists without typing
  stay actions-only.
- **It reads context and never changes it.** No action it can reach opens a layer or moves the
  selection — the explorer and the pointer navigate.
- **Filtering the explorer is a mode, not an action.**


## Object explorer

**Contents**

- Structure and only structure: nodes nested to any depth.
- Groups, notes and every field never appear.
- Interfaces are hidden behind a toggle; when shown they sit at the same level as child blocks,
  sorted after them, with their own icon and no branch of their own.
- References are never listed — a reference is a second appearance of something already there.
- **A reference reads its target's name across open projects** (C.7). `actual()` resolves inside one
  fold, so the canvas, the contents tray and the table read through `shownName` / `stoodFor`
  instead, which take every open project's graph and resolve a `proj/id` path in whichever one owns
  it. Proven on a card and in a table row, and across a reload. **The honest limit**: a reference
  into a project that is *not open* cannot resolve and reads `missing` — **and so does one whose
  target is genuinely gone**, which is a gap the story cannot close on (`C.7 ◐`).
- Notes and groups are never listed either: the explorer is the tree, and the tree is blocks.
- A node whose only children are interfaces still reads as a block.
- Every open project is a root in the same tree, filed into the folders the workspace
  keeps. **The project a selected row belongs to is the context**, which is what decides where a
  change is written — positional, so there is no mode and nothing to switch. Click switches.
- **The open layer and the selection are two states with two looks** (Y.8, proven). *Open* is where
  the canvas is pointed and draws as a wash; *selected* is what an action would act on and takes
  the accent and an inset bar. They stack, and selected reads first. They shared one look before,
  which made *nothing is selected* unsayable — and deselecting is a gesture the app leans on (V.14
  reaches a new project through it, W.3 the vocabulary).
- **Multi-select** — Shift / Meta click builds a `Chosen[]` across blocks, branches and projects
  (E.4, proven). **Parked**: Ctrl on Windows; no distinct multi-select CSS.
- **A block can leave a project, and can move between them** (P.1, proven). Every row is draggable
  and the drag carries a **cross-project ref**; a row in any open project takes a drop, and **the
  clear space below the rows takes one too** — dropping there makes the block a project, since a
  project is a block nothing contains. **Promoted, the block *is* the project**: it becomes the new
  root rather than landing inside a project of its own name.
- **A project root is filed, not moved** (N.1). Dragging one in the explorer writes **one** step in
  the workspace log: `workspace.file` mints the root's reference or moves the one already there —
  into a folder, beside folders at the workspace root, or back out to the unplaced list. The project
  stays a project and its own log is untouched; demotion into another project's log is `N.2`.
  **Known break**: a project dropped into a folder disappears from the tree until the folder is
  clicked, because the folder was empty when the drag began and nothing opens it after the drop.
  **And no folder can be made from the app** — `workspace.folder()` has no caller in `src/` (`N.8`).
- **A move across projects is two steps in two logs**, never one spanning both: the subtree is
  written into the destination through `writeInto` and deleted from the source through the door.
  Its definitions and the package list travel with it, so types still resolve. **Relationships with
  one end left behind are lost** — deliberate, nothing stands in for the block that left — and the
  strip says how many.
- **(planned)** A **set** appears as a root like any other and lists what it holds references of. It
  is the one place a reference *is* listed, because in a set there is nothing else to list. **Derived,
  never declared** — members are references, so it is a set. This is what a *saved view* is: a
  requirements table is a set of requirements, an allocation view the same set drawn as a matrix.
  **A folder is a set of projects**, so there is no folder concept and a set wears a folder mark
  (stream `P`).
- **(planned)** **Every node role carries a mark of its own.** Block, container and interface have
  theirs; a set has none, and a behavior's cannot be reached because nothing writes
  `components.view.module` — so a fresh project is structure for ever (`P.5`, `P.6`).

**Navigation**

- Single click sets the scope: the canvas draws that node's view, and its branch opens — asking
  to look inside something shows what is inside it.
- Double-click or the ✎ control renames in place — a row is all name, so it takes the same rule
  every name takes.
- **Right-click on a row** opens the offered-action list for the selection, in fixed order
  (`offer(ctx)` → `project.go`; G.9b, proven). That is `infer`'s trigger when blocks or projects
  are chosen. **The menu is built against the project the row lives in, and brings it into
  context** (R.10, proven) — the same switch a left-click makes. It read the project in context
  whatever was clicked before, so a menu on B's row wrote A's log with nothing saying so.
- Right-clicking the clear space below the rows (or an empty tree) makes a block **at the root**,
  wherever you are scoped: the rows are what layers look like here, so the space around all of
  them is the root's own background.
- **The bar's `＋` follows the selection** (V.14, proven) — the same *target decides* rule as the
  canvas right button (G.9d): **nothing selected** names a **project**; a **project** selected
  makes a block inside it; a **block** makes a block under it. The tooltip names which, so the
  meaning is never hidden. **This reverses U.14 deliberately**, and the door it closes is reopened
  by **deselection**: clicking blank tree space, or the project already picked, lets go. **The
  view does not follow**, so reaching a new project never costs your place. (G.9b's list offering
  *add a project* as well is only half-true — see tasks.md.)
- **The bar's delete follows it too**: a picked project root is a **workspace operation** and asks
  first (V.12, V.13, proven); anything else is the open layer, which is one undoable step.
  Deleting a project takes `workspace.forget` **and** the keyed log, or a reload brings it back;
  the session pointer goes with it, or the next load opens a ghost id. It is not in the log at
  all, so undo cannot reach it and the confirm is the only thing in front of it.
- **The project's own export sits on its root row** (V.6, proven), where project scope lives —
  behind the options button described below.
- A role icon precedes every name and doubles as the fold control where there is one — leaf,
  interface, container (U.2, drawn from the V.2 icon set). **A container is a filled square and a
  leaf an outlined one**: the fill is what says it holds something. It was a box with a rule across
  it, which read as the table view's mark.
- **Fold everything and expand everything are one control**, and it reads *anything open at all* —
  a branch or a project root. Reading only the branches meant a collapsed project kept forcing the
  fold branch, so the control could never open one again.
- **A project root's icon says its kind and folds the project** (V.9 + V.10, proven) — a structure
  and a behavior project draw differently; clicking the icon folds, while the **row click still
  switches project**, so the two never collide. Projects are open by default: one that hid its
  tree on sight would read as empty.
- **The view toggle is one icon that cycles** (U.8 → V.5 → V.19, proven) — it wears the view that
  is *on*, and clicking moves to the next the project kind offers. Sticky per project in
  `mndflow.view.v1`; writes nothing. **This reverses U.8's *not an icon that cycles* deliberately**:
  three buttons cost width a capped-width tree does not have, and the objection U.8 raised — that a
  cycling control hides which state it is in — does not apply when the icon *is* the state. The
  tooltip names both, current and next, so the step is never a guess.
- **A project row's tools sit right, and only on the selected project** (V.19, proven) — the view
  cycle and an **options** button, held to the right so names still line up down the left. They
  show when the project is in context *and* something is picked in it: context alone survives a
  deselect, and deselecting is the state whose whole point is that nothing is selected (V.14).
  Picking a block inside the project counts, so they stay reachable while working.
- **Options is where per-project actions collect.** Today it is the project export alone (V.6);
  the icon is a placeholder for a menu, so the tooltip still names what it does.
- Folding is the user's alone; walking into a layer on the canvas never rearranges the tree.
- One control in the bar opens every branch or closes every branch.

**Layout**

- Levels are shown by indentation and faint guide lines.
- **Width is capped** at `min(280px, 36vw)` so the stage keeps room at high zoom (U.3, proven).
- **Collapses to a 28px strip** (◂/▸); the tree is hidden until the strip is reopened (U.3,
  proven). The bar title ellipsizes when the pane is narrow.
- **Project roots are marked** (`className="project"`) and **siblings get 10px top margin**, so
  several open projects read as several rather than as one long tree (U.17, proven).
- **Undo and Redo read as words at the explorer foot**, with **one line naming the last executed
  action** (U.12, proven). The header's `↤` / `↦` pair is gone; keyboard shortcuts are unchanged.
  A collapsed explorer hides the foot with the tree — reaching them still never means opening a
  drawer first, only reopening the explorer.
- Deep branches indent past the sidebar rather than wrapping; the tree scrolls horizontally and
  centres on the depth of the selection, re-centring when the tree's shape changes.
- The horizontal scrollbar sits at the foot of the sidebar, not under the last row.

**Editing**

- Add, rename, delete, and drag rows between levels.
- Dragging a row onto the canvas places a reference for it in the open layer.
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
decides which sides a `directed` relationship attaches to, biases **rank and placement**, and
routes the line along that bias. Port `in`/`out` stay decorative and unread. Arranging never
changes the axis.

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
  own shape following its topology — a ring stays a ring, a series stays a series. Only exact
  rings and chains get those shapes; hub-and-spoke and everything else fall through to the layer
  arrangement.
- A unit is **rigid in shape, not in size**: members keep their relative arrangement — who sits
  beside whom, on which side — while the distances between them are layout's, so the spacing
  tiers reach inside a unit as well as between them.
- Each axis is read independently, so a row stays a row, a column stays a column and a diagonal
  stays a diagonal. Members that already overlap on an axis come out aligned on it.
- A group nobody has placed gets an internal arrangement of its own, laid out among its own
  members, and that becomes its shape.
- A unit is sized to its members plus the room its boundary needs, so two groups are spaced
  apart rather than left with their boundaries touching.
- **Notes are layout units.** A note takes up room like a card; ties are excluded from structural
  joins and drawn as fixed associations. An arrangement seats each tied note under what it
  describes, clear of the cards and boundaries. A note tied to nothing keeps its place.
- **Space is a signal.** What matters is the contrast — tight inside a unit, open between them,
  so a group reads as one object and the lines between units have room to spread:

  | Between | Distance |
  |---|---|
  | members inside one unit | half a cell |
  | two of those with a relationship between them | two cells — room for the line |
  | one unit and the next | two cells |
  | one rank and the next | three cells |
  | a boundary and its members | half a cell |
  | one cluster and another | wider **(planned)** |

**An arrangement writes down where everything landed.** Afterwards every card can be dragged
about like any other, and the drag sticks.

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
- **Reference** — a stand-in for a block living in another layer, so that a relationship reaching
  it can be seen here. A visual shortcut; it changes nothing about the relationship.
  - **It is bound to its block by `of`** — a path id for a same-project block, or
    `{ project, element }` when the target lives elsewhere — never by a relationship. A reference is
    not two things joined, it is one thing appearing twice, which is a property of the appearance.
  - **A missing target is kept, never deleted by tidy** — the card reads as a missing block so
    undoing a deletion elsewhere can bring the reference back.
  - **An appearance is the reference's; the thing is the block's.** Where it sits, how it draws and
    its colour are its own, because they are true only of this layer. Its name, body, fields,
    interfaces, children and type are the block's, because there is only one thing to have them.
  - **A relationship drawn to a reference is stored here and reaches the block.** That is all
    "reference" means, and it is derived from where the ends live rather than given as a form.
  - Greyed, hatched and dashed, marked `↗`; the only dashed card on the canvas. The colour is on
    the lines, not the card: **a relationship reaching a reference draws violet and dashed**,
    label and arrowheads with it, so a line leaving the layer is told apart at a glance.
  - Shows the name of the block it stands for; renaming it renames that block.
  - Has no inside: double-clicking goes to where that block actually lives and selects it there.
  - Nothing nests into one, and it never becomes an interface.
  - Points at a real block, never at another reference — the explorer is the only place one is
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
- **An anchor exists only where a relationship actually meets the block** (C.2). There is no
  always-four rule: a card with one line carries one anchor, and a card with none carries none.
- An anchor shows a small round handle while its relationship or its card is selected, the same
  way a hidden interface does, so a line's ends can always be found.
- **Dragging an anchor slides it between the free seats on that border, and around corners, without
  promoting it** (C.2). A moved anchor **draws solid**, to say the position is yours rather than the
  engine's; `fromAt` / `toAt` on the relationship hold it, and flipping the relation carries them
  with the ends. Promotion stays a separate act — an interface is a real element with a name and a
  type, and moving a line's end is not that.
- **Known break (C.11)**: a relationship made *now* draws no line until the page is reloaded. The
  anchors that carry its handles are minted by the same render that adds the edge, so React Flow
  has not measured them yet and drops it. Everything above is what a reloaded page does.
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
- **A frame wall lights on its own as a drop target** (C.5) — four rim spans track the pointer
  and the nearest one takes the accent, in the same lit-target look the explorer tree and the
  canvas already wear. One wall at a time; never a second treatment.
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
- **What a right drag makes is picked before it, in the canvas *relation* group** (V.17a, proven):
  plain, directed, then the types in scope capped at three — a **radio row**, word+glyph (U.15).
  Picking a type hands `relate` its `type` (V.17b), so the kind is settled by the gesture rather
  than corrected after it, and the type's own form is what draws.
- **Flow** draws heavier and takes its sides from the layer's axis; **assoc** draws thinner and
  fainter; **plain** says only that the two are related and takes whatever side suits the path.
- Drawn curved or angular by the *relation* draw radio (U.15), which is global to the app.

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
  on the one behind — and its path runs with that bias rather than doubling back. Rank and
  placement follow the same directed edges. On a `free` layer nothing is imposed. Port `in`/`out`
  stay decorative.
- **Lanes**: runs that would share a line are spread half a cell apart, centred on where they
  would have gone, so parallel relationships stay distinct. Only the interior segments move;
  the ends stay on their seats.
- **Cost.** Seats try a cheap orth path first; Dijkstra skirts run only when every seat pair needs
  one, and those skirts share one prepared visibility graph. An 80-box long-span harness that took
  ~15.5s before the two-phase pass now lands around ~72ms; a busy layer resize stays interactive.
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
- **The panel can join a selected block into an existing group** — `+ group` lists the groups on
  this layer it is not already in.
- Membership is decided against the boundary as it stood when the drag began — from the members
  standing still, or from all of them where none is. Dragging the boundary itself moves the group
  and changes no membership; layout moves one as a single unit — see Coordinates and layout.
- **One member is allowed**, and a group that falls to one stays a group. `Ctrl`/`Cmd` + `G`
  makes one; right-click on a card opens the offered list (`interface` is an entry, not immediate —
  G.9d ◐). Removing a group is the user's to do — the one exception is a group emptied entirely,
  which has no bounds to draw and no way to be reached, so it goes. **`dissolve` is registered**
  and deletes the group while leaving members put; the canvas menu offers it when a group is in
  scope (G.9d ◐). Groups are not listed in the explorer.
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
  **After it is made, the SE handle resizes it** (`size` / `size_element`).
- Right-clicking it rewrites it. The note *is* its text — there is nothing else on it to aim at.
- Ties to nothing, one thing or many. Right-drag from a node onto a note ties it; the same
  gesture over a node already tied unties it. The panel lists ties and removes them.
- **A leader is picked and deleted like any other line** (V.16, proven): it is keyed by the real
  edge, marked from the page's own selection, and never routed by hand. It stays the faintest
  thing on the canvas until it is picked, and then it says so. Right-dragging onto the note is
  still the other door to untying.
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
  full trail in its tooltip, plus `↑` for one layer up. On a short row the left half truncates with
  an ellipsis (U.1).
- **One icon vocabulary** (U.2, then V.2, proven): no mark means two things, and the marks are
  **curated inline SVG** rather than Unicode — which is also why the chrome no longer reads blurry.
  One module defines the set. Definition icons stay stream E's; module icons (U.9) sit on the view
  toggle. **The all-types mark is gone with the filter it belonged to** (V.15).
- **The relationship type filter is gone** (V.15, proven) — the control, the `shown` state, the
  kinds list, the predicate and the clipping — and every edge draws. Choosing what you are *about*
  to draw replaced filtering what already is (V.17a). A matrix over a busy vocabulary may want a
  filter of its own; that is a different surface and should arrive by decision (see plan.md, W).
- **Hover lights a relationship line** (V.4, proven).
- **Canvas options share one design language** (U.15, proven): **every control carries a word**,
  glyph as scan aid; radio rows for the picks, a two-state toggle for interfaces. Settings only —
  not the one-time arrange verbs.
- **Every control the thing on the stage has is in one column** (Y.1–Y.3, proven), fixed to the
  page's right. **A real column, not an overlay**: the stage ends where it begins, so chrome never
  sits on the drawing. **A view module declares which groups it offers** (`ViewModule.chrome`) and
  the column draws them in `CHROME_ORDER` — a matrix has no interfaces toggle because it declares
  none, never because one was greyed out.
- **`types` is the one group the page cannot build alone** (Y.4, proven), because a table filters by
  the definition names on its rows and a matrix by the relationship marks in its cells. So a module
  declaring it also answers it — `ViewModule.types` is an icon and a function from the layer to the
  kinds on it. **Nothing picked is everything**, and picking the lit one again is how you get back;
  a pick that is no longer on the layer reads as everything rather than as a filter hiding all of
  it, so navigation resets nothing. An empty group is dropped, so an untyped layer shows none.
- **`columns` is the table's own group** (P.8): every field name the layer's rows carry, and
  picking one gives that field a column of its own. A state, not a filter — the rows are the same
  either way, and it only widens what each one says.
- **The relation types group is the list-of-types rule's exception**: the same three the strip
  caps at, and no expansion. It is a setting for what the next drag draws rather than a list of
  things to act on, and the rest are on the strip.
- **The order is the overflow plan**: views, flow, arrange, interfaces, lines, columns, types,
  relations, project. **Relations is last** because it is the only group that grows with the
  vocabulary, so it is the one to push off the bottom. **The column scrolls** — twenty-odd controls against a window's height
  makes overflow ordinary — and no group ever collapses, since that is hidden state.
- **A structural stroke divides by the zoom.** Everything the flow draws sits inside a
  `scale(zoom)` transform, so a plain 1px border is a pixel *of layer*, not of screen — zoomed out
  it lands under a device pixel and the browser drops it, which is how the frame could look deleted
  at rest and reappear on zoom. The canvas publishes `--zoom`; the frame, the flow walls and a
  card's border read it, so their apparent width is constant.
- **The column's controls are chips**, carrying the same border and ground as the terminal's
  actions, and the one that is on takes the terminal's `likely` treatment — accent border, tinted
  ground, a bar down the leading edge. One app, not two toolbars that grew separately. **It shares
  the explorer's ground**, so both edges of the page are one surface with the stage between them.
- **An icon over one word, under a group label.** U.15's *every control carries a word* holds: the
  word only cost width when it sat beside the glyph. Every word the app owns is a single word; a
  relation type's is a **definition's name**, so it belongs to whoever wrote the vocabulary and
  wraps rather than being clipped. **The column is narrow and the words wrap to it**, rather than
  the longest label setting the width — sizing it to `interfaces` spent the space on one word and
  left every short one swimming. **A control never repeats its group's label**: the interfaces
  toggle reads `shown` / `hidden`, which says more and fits. **Every group is ruled off from the one above it**, never the first — a
  rule there would divide the column from nothing. The rule used to fall only between the settings
  and the verbs, which is how design.md's *toolbars divide by states against verbs* was drawn; with
  all groups ruled, that boundary is carried by the group's label and by the fact that **a verb
  never lights** — `arrange` has no state to be in, which in use is the plainer signal.
- **One verb could not simply move.** Arranging needs the laid-out geometry only the canvas has, so
  **the canvas publishes it upward** and the column calls what it was handed. The page never reaches
  into the canvas; dependencies still run one way.
- **A strip at the foot of the stage says what is selected and what it could be** (R.9): the
  selection's name, then the types the list-of-types rule offers for it — the top three by learned
  preference, vocabulary import order cold, a *More…* entry expanding the same surface in place,
  and the same list on right-click. **Universal**: a block, a group, a note, an interface and a
  relationship all answer it. Picking one runs `retype`, and overruling the top pick is what the
  ranking learns from.
- **The vocabulary the strip offers is handed down by the page** — packages this project imports,
  in order, then its own — because `actions/` reads `graph` and `geometry` and never the workspace.
  Both halves, relation kinds and element ones; either absent falls back to the project's own
  definitions. The ranking, the cap and the candidates live in `actions/typelist.ts`, one list for
  every surface that offers types.
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
| empty background, or an unselected boundary | draws a selection box, taking what it encloses. An edge is selected only when both ends are inside; one end alone is not enough |

Small precise targets — interfaces, notes — act at once. Large ones — a boundary, a multi-node
selection — must be selected first.

**Right button** — explorer (G.9b) and canvas (G.9d ◐) menus live; *the target decides*:

| On | Click makes | Drag makes |
|---|---|---|
| a card | the offered-action list for that card, fixed order (G.9d ◐) | a relationship, or a tie if let go on a note |
| the layer's frame edge | the offered-action list for the frame, fixed order (G.9d ◐) | a relationship from the frame |
| empty background | a node | a note |
| a name | the offered-action list — rename is an entry, not immediate (G.9d ◐) | — |
| a note | opens it for editing | — |
| an explorer row | the offered-action list for the selection, fixed order (G.9b) | — |
| the space below the explorer's rows | a node at the root (empty-tree create unchanged) | — |
| an interface | the offered-action list for that interface, fixed order (G.9d ◐) | a relationship from it |
| a seat a relationship put there | an interface of its own, where it sits | — |
| a relationship | the offered-action list for that edge, fixed order (G.9d ◐). **Gap**: `retype` waits Scope naming `edge` | — |
| a multi-node selection | the offered-action list for the selection, fixed order (G.9d ◐); `group` is an entry | — |

- A card has no border zone: the click position decides where on the border the interface
  lands, but anywhere on the card will do. The layer's own frame is the exception, since its
  interior is the background.
- Nothing appears until a right drag pulls clear of the press, so a right click that wanders by
  a pixel is still a right click. `Esc` cancels.

**Keyboard**

| Key | Action |
|---|---|
| `Delete` / `Backspace` | delete the selection |
| `Esc` | clear the selection, including a React Flow multi-select, back to the scope. **Parked**: Esc does not clear RF-selected edges after a marquee (G.7 follow-on) |
| `Enter` | rename the selection |
| `F` | fit the layer, or zoom to the selection if there is one |
| `Ctrl`/`Cmd` + `Z` | undo |
| `Ctrl`/`Cmd` + `Y`, `Ctrl`/`Cmd` + `Shift` + `Z` | redo |
| `Ctrl`/`Cmd` + `G` | group the selection |
| `Ctrl`/`Cmd` + `A` | select everything on this layer |
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

The bottom tray — still the Contents panel, and still the model that table and matrix copy (U.7).
**A table of everything the open layer holds** — blocks, interfaces, relationships, groups and notes
together. It is the only place a relationship or an interface can be found without hunting for it
on the drawing. Table and matrix views open as separate panel shells modelled on this one; they do
not delete or rewrite Contents.

**Opening and closing**

- **Three sizes, two doors.** Shut is the bar alone; **partial is a quarter of the stage**; full
  is what setting the project's view toggle to `table` means. *(**Superseded by `W.5`**, 2026-08-20:
  the tray has **two** sizes, shut and open. `full` was never a tray size — it is the toggle putting
  the **table module** on the stage, and the two are different things. This line is what runs.)* The `contents` tab shuts and opens
  it, the toggle fills it, and **nothing else closes it** — a click on the canvas is how a row gets
  selected, so shutting on one hid the thing being inspected. The bar shows which layer is listed.
- **The chosen size sticks across a reload**, kept beside the other display preferences and never
  in the log: it is how somebody is looking, not anything about the model.
- Open, the drawing keeps the rest of the stage — it shrinks and re-centres rather than being
  covered. The tray's height does not change with what it lists, so filtering never moves a row out
  from under the pointer.
- **The frame reshapes to the room it is left**, rather than keeping its old proportions and
  letterboxing. How far it can grow is still bounded by the zoom ceiling, so a sparse layer keeps
  room around it instead of being magnified.
- It stays open while you work down it. Selecting rows is what it is for.

**Reading it**

- Filter chips narrow to one form, each showing how many there are; a form with none is disabled.
- Sortable by form or by name; clicking the column already sorted by turns it around.
- **Hovering a row lights that thing on the canvas**, and shows what it says and what it carries
  above the table. The canvas's own hover wins where the two disagree.
- **Constraint and rule notes advise here and never refuse.** Short notes sit in the what column
  and the hover tip; selecting a noted row says the full sentences once in the strip. Edits still
  go through.
- **Clicking a row selects it on the canvas.**

**Changing things from a row**

- Double-click a name to rename; single-click a type to subtype — **type offers follow the
  project's `vocabulary` import order**, and are package-disambiguated when two definitions
  share a name (SC.4). Only imported packages are offered. Fields open rather than sitting
  there, so a row stays clickable.
- **Definitions are editable in the tray** — fields, defaults and presentation (E.1). A types chip
  reaches them, including **add / rename / drop of relationship (line) kinds** — the same path that
  used to live in the readout's Relations tab (U.11, proven). Each field form has its own control —
  number with unit, choice with its list, ref with a picker (E.2) — and tags add and drop on usage
  and definition fields (E.3).
- Row buttons appear on hover and carry whatever that form can be told to do:

  | Row | Buttons |
  |---|---|
  | relationship | direction, turn it around, remove |
  | interface | marking, what it says, delete |
  | reference | go to where it lives, what it says, delete |
  | block, group, note | what it says, delete |

- **What it says** opens the row out: its body, the groups it belongs to, and its fields,
  with a field for adding one.

**Columns, and what the table takes from elsewhere**

- The head is **kind / name / what / type** — the default set, because every row answers it.
- **Beyond it, a column is a field in scope**: the rail's `columns` group lists every field name the
  layer's rows carry, and picking one gives that field a column of its own. Which are shown is the
  **table's** state, never a definition's — one view saying what its columns are, not one type
  saying what its card shows. A row that does not carry the field reads as a dash.
- **A row dragged out of the explorer lands here as a reference** — the same `refer` the canvas
  takes, on the table at full size and on the matrix alike. One gesture, three surfaces, one
  action. The partial tray does not take it: at that size the table is scoped to what is in focus,
  and the reference would land in the layer instead.
- **A column reads through a reference**, as the name column does: a reference shows what the block it
  stands for says.

## Naming

- A name is written the way it was typed and shown the same way everywhere.
- Only the role words an unnamed thing falls back to are lower case: `block`, `container`,
  `interface 3`. Giving a name replaces the description entirely.
- **A name is edited where it is drawn.** On the canvas, right-click opens the offered list and
  rename is an entry (G.9d ◐) — not an immediate edit. `Enter` commits, `Esc` abandons, and
  clicking away commits when an edit is open.
- A name is its own target: it highlights on its own, and the border it is set into stays dark
  beneath it.
- `Enter` renames the selection, for a hand already on the keyboard.
- The explorer renames on double-click or ✎, as a file tree does. Right-click there opens the
  offered list (G.9b), not rename.
