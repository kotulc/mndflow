# Schema

The core data contract: what is valid data, and what the door checks on the way in.

**One workspace, one graph, one log.** Every block, relation and definition lives in a single graph folded from a single log. A **project** is not a thing in the schema — it is a top-level block under the workspace root, read from position and stored nowhere.

The schema splits three ways by **what changes it**:

| | Holds | Changed by | Exported |
|---|---|---|---|
| **workspace** | the envelope, the graph, and the session | export / import | the envelope and graph, never the session |
| **graph** | blocks, relations, definitions | never directly — folded from the log | derived, written only into a file |
| **action** | steps and mutations | every action | yes: the log *is* the history |

---

## Workspace Schema

```
Workspace {
  schema    "2.0"              // major must match; a higher minor is readable
  id        Id                 // this workspace, for life
  graph     Graph
  meta?     object             // free-form, unversioned, safely ignorable
}
```

**The base is whatever cannot be ignored; the rest is `meta`.** A reader that skips `schema` cannot know whether it understands the file; one that skips `id` cannot resolve a reference. Everything else can be dropped with no effect on what the workspace *is* — that test is what keeps an envelope from becoming a drawer.

**Nothing still at its default is written.** No nulls, no empty lists — a file the size of the choices in it. Exporting changes nothing, so re-exporting an unchanged workspace is byte-identical.

### Session

**Display state, held outside the log and never in a file.** Opening somebody's workspace must not rearrange your toggles.

```
Session {
  open      Id | null          // the layer being drawn
  selected  Id[]
  folded    Id[]               // explorer fold, and which projects are collapsed
  theme     string
  toggles   Record<string, boolean>  // interfaces shown, guides ruled, …
}
```

**The test for whether something belongs here: is it in the log?** A block's name is, so it exports and it undoes. Whether interfaces are shown is not, so it does neither.

**`arrangement` is not session state.** It is model data on the layer, because how a layer lays out is part of what the layer says — see *Block*. **It is the one exception**, and it earns the line by being in the log: it exports and it undoes.

### Files

**An export is the graph, not the log**, and a **project export is a subtree** plus the definitions that subtree reaches:

- The block, everything under it, and every relation with both ends inside.
- Every definition any of them names, **and every definition those extend**, walked to the end of each chain.
- Anything reaching outside becomes a **missing** reference, which is kept and never tidied away.

- **Only touched definitions are written**: never the shipped floor, never a default nobody edited.

**Importing is a checkpoint**, so there is no second format and no second reader. **Grafting** brings a file into a layer as one step, and **the workspace wins**: nothing it holds is replaced, its defaults stand for the file's, and incoming elements take its next handles.

**Laid out for reading**: definitions first, then blocks, then relations — **each flat, sorted by id**, with a block writing its `parent`. A rename is one line. Within a record, identity keys come first and the rest follow alphabetically.

---

## Graph Schema

```
Graph {
  root      Id                      // the workspace block; parent: null
  packages  Record<Id, Package>
  defs      Record<Id, Definition>
  blocks    Record<Id, Block>
  holders   Record<Id, Holder>
  edges     Record<Id, Relation>
}
```

**One id space across blocks, relations and definitions.** *Typed-by* and *points-at* must stay one operation, and a rename must orphan nothing. A definition's `group` — **`block` or `relation`** — is how a file reads and how import dispatches, **not a second id space**.

### Block

**Everything with content is a block.** Three element kinds exist — a block, a relation and a holder — and every other noun in the model is a block with a different type. **A holder is the one carve-out**: it owns nothing, appears in no tree and is pointed at by nothing, so it was paying a carve-out in every reader that walked the graph.

```
Block {
  id            Id
  parent        Id | null         // null only for root
  type?         Id                // the definition it names; absent = its kind's default
  name?         string
  body?         string

  of?           Id                // reference: what it stands for — a block, a definition
                                  // or a package
  source?       { uri, at?, rev? } // what it stands in for outside the workspace

  group?        Id                // the holder it sits in — a boundary or a grid
  cell?         {r, c}            // grid: its address, in place of x/y
  header?       boolean           // grid: it heads the line it sits in

  x?, y?        number            // placement, when hand-laid
  w?, h?        number            // least size, where it has one
  arrangement?  Arrangement       // when this block is the open layer

  side?         "top"|"right"|"bottom"|"left"    // interface: which edge
  at?           number            // interface: 0–1 along that edge
  order?        number            // position among siblings
  alias?        number            // handle serial, minted once and never rewritten
  flow?         "in"|"out"|"both" // interface: decorative, constrains nothing

  counters?     Record<string, number>   // workspace only: handle counters per kind
  pinned?       Id[]              // workspace only: pinned definitions, in order
  shelf?        Shelved[]         // workspace only: how the explorer files its own definitions

  looks?        Components        // what this block says about how it draws
  tags?         string[]
  fields?       Field[]
}
```

```
Shelved {
  id           Id                    // a definition, or a folder somebody made for them
  group        "block" | "relation"   // blocks and relations are filed apart
  in?          Id                    // the folder it sits in; absent = its group's top
  name?        string                // a folder's name. A definition's entry has none
}
```

**The shelf is one ordered list, and order is the list's.** An entry with a `name` is a folder; one without says where a definition sits. **Only the workspace's own definitions are filed** — a base, a default and a package's are the system's, and where they read is fixed. A definition nobody filed sits at its group's top, by name, so an untouched workspace writes no shelf at all.

**Block modules** — engine code behind one sort of block. **Three, and each is read from a stored field rather than from configuration**: `block` is the base, `reference` is `of` being set, `interface` is `side` being set. A **kind** is a definition, not a module — the `base` package carries seven, and everything a user or package defines **extends** one of them.

| | Holds | Is |
|---|---|---|
| `folder` | anything — independent roots, contained never owned | the organizational unit. **The workspace is the root folder; a project is a top-level block** |
| `block` | parts and references | the base kind, and the one every ordinary block is. What there is, how it is composed, and what it does |
| `reference` | nothing | a stand-in for a block living elsewhere. `of` is the whole of it |
| `interface` | anything | a block seated on an edge. The one anchor for every port-like thing — a proxy port, a full port, a pin, a constraint parameter |
| `group` | any block on its layer | a boundary round a set — a swimlane, a region, a package boundary. **A holder, not a block** |
| `grid` | any block, one to a cell | a region of the lattice with an extent. **A holder, not a block** |
| `note` | text | a remark about one block, drawn as a card of its text and tied to it |

**Seven kinds, in two families.** `block`, `folder` and `note` are **open** — they are the plain block module with different configuration, so `retype` swaps among them and among any of their subtypes. `reference` and `interface` are **derived**: each carries a stored field a change of type cannot invent, so one is made rather than retyped into, and subtyping such a kind means making one and customizing it. `group` and `grid` name **holder shapes**, and ship a look rather than a module.

**There is no untyped block.** A block naming no definition *is* a `block` — the field being absent is how a file stays small, never a second sort of thing, and every reader resolves it to the kind's own definition. `view` is reserved rather than shipped.

**`Arrangement`** — `free` · `grid`. **One setting, two values.** `free` is hand placement, rounded to the lattice; `grid` is auto-layout, which ignores stored positions and works a box out for every loose block from the relationships and the sizes. **The four directional values are gone** — they ranked by relationships and drew a picture of the graph rather than of the model. **Model data, not a preference**: how a layer lays out is part of what the layer says, so a diagram reopens the way it was left and travels in a file with the rest of it.

**Membership is not parenthood.** `parent` says which layer a block is in; `group` says which holder on that layer it sits in. Only the first is the tree, which is why deleting a group frees what it held rather than taking it along. **A group goes with its last member**, and is empty only when it was made empty.

**A header is a flag, and position says which line it heads** — row 0 heads its column, `{0,0}` heads both, anything else heads its row. Nothing stores the role, so a block dragged into row 0 becomes a column head and `transpose` needs no header code at all.

### Holder

```
Holder {
  id            Id
  parent        Id                // the layer it is drawn in
  name?         string
  of?           Id                // the block this region stands for
  group?        Id                // a holder may sit in another
  arrangement   "free" | "grid"
  rows?, cols?  number            // grid only: its extent
  merges?       Span[]            // grid only: cells with an extent of their own
  x?, y?        number            // grid only: its corner
  order?        number
  alias?        number
  looks?        Components
}
```

**A holder is not a block**, and that is the whole of why it is its own record: nothing points at one, no tree lists one, relations refuse them as ends, and deleting one loses an arrangement rather than any content. Every reader that walked the graph was already carving them out.

**One kind, two shapes.** `arrangement` says which: `free` derives its bounds from what it holds, `grid` owns a corner and an extent. **Membership is stored on the block**, so a holder's members are derived and the two can never disagree; a deleted block takes its seat with it.

**A holder carries no definition**, only a look — the one its shape ships in the `base` package. **A cell seats one card and a holder is not a card**, which is why grids do not nest and free holders do.

### Package

```
Package {
  id    Id
  name  string                    // unique within the workspace
}
```

**A package is addressable** so a block may stand in for one. **The shipped floor is one of them**: every workspace stands on `base`, and it lists beside the rest rather than hiding. **A file never carries it** — the floor ships with the app, not with the workspace.

### Relation

```
Relation {
  id          Id
  from, to    Id                        // blocks, never a relation
  type?       Id
  dir?        "none" | "forward" | "back" | "both"

  fromSide?, toSide?   Side             // a wall an end leaves by
  alias?      number                    // handle serial
  tags?       string[]
  looks?      Components
}
```

**Two relation bases, the set is closed, and neither is stored.** What a relation descends from is read from its ends (`edge_base`). **Both are definitions rather than modules** — there is no relation module left to pick, and `tie` earns its look from a definition like anything else:

| | Is |
|---|---|
| `line` | no note at either end. `dir` says which way its arrows point; `none` is a plain line |
| `tie` | a note at an end. A loose leader that takes no direction |

**A relation holds no fields.** What a connection says belongs to the blocks at its ends. **A layer has no reading direction of its own** — order is stated by a directed line, or by a cell address along the way a grid reads.

**No relation carries a route.** Where a line goes is derived from the layer every time it is drawn.

**Containment is not a relation.** The tree is `parent` — the one join every block has exactly one of, so storing it as edges would mean guarding an invariant a field enforces for free.

### Definition

```
Definition {
  id           Id                    // minted: def_… or rel_…, never a slug of the name
  from?        Id                    // the package it came from; absent = the workspace's
  default?     Id                    // the shipped base this stands in for
  group        "block" | "relation"
  name         string
  label?       string                // what a line naming this draws, as typed
  body?        string
  extends?     Id                    // one parent, and the chain is real
  fields?      FieldDef[]
  size?        { w, h }              // the room a usage needs
  names?       Record<string, string>   // { sysml: "«requirement»" }
  components?  Record<string, object>
}
```

**Two tiers, and the second has a special case.** A definition is either the **workspace's own** or a **package's** — `from` says which, and the shipped floor is a package like any other. The special case is a **word about** a package's definition: a workspace definition whose `default` names the one it overrides.

**Nothing from outside the workspace is ever written.** Editing a package's definition — the floor's included — does not change it: the edit lands on the workspace's word about it, minted on the spot if there is not one yet. **That word stands in front of what it speaks for in every chain that reaches it**, so changing what `block` or `«part»` means reaches everything below it, not only what named nothing.

**A package is a set of definitions, and may carry instances too.** Nothing about the floor makes it a different sort of package: it lists with the rest and is overridden the same way. What stays the package's is a definition's **name** and what it **extends** — its identity. What it *says* is yours.

**Resolution is global, by id.** No import list and no tree to climb. Two definitions sharing a *name* are two definitions; nothing shadows, because every usage names an id. **A name is looked up with its group.**

**Extension is subtyping, never overriding.** Fields union with the subtype's winning by name.

**Components cascade per property.** The chain is laid down base first and merged one property at a time, so a refinement says only what it changes and inherits the rest — setting a shape no longer throws away the layout it was given. One parent, so the order is a list rather than a graph: what comes later wins and there is no diamond to resolve. **The element has the last word**: a block's own `looks` is the final layer over whatever its chain said.

**A definition's kind is the nearest link that names one.** A subtype saying nothing is its parent's kind, which is what makes a chain of refinements safe. What stops a block changing kind is the gesture — `retype` refuses across families — never the chain.

**A chain is walked with the workspace's own word spliced in.** `isa` puts a definition's `default` override in front of the shipped base it overrides, wherever that base turns up — one rule, and it is why editing a base reaches everything below it.

**A rule naming a definition means it or anything below it.**

### Field

```
Field    { name, form, value?, tags? }
FieldDef { name, form, unit?, default?, choices?, many?, tags? }
```

**Five value forms, and the set is permanent:**

| | Holds | Extra |
|---|---|---|
| `text` | free string, the default | — |
| `number` | a quantity | `unit` |
| `flag` | true or false | — |
| `choice` | one of a list the definition names | `choices` |
| `link` | another block or definition, by id | `many` |

**No identity of its own**: a field is addressed by name on the thing carrying it, and setting the same name again rewrites it. **Never structural** — never in the explorer, never changing what contains what.

**A `link` points without drawing.** *A reference is drawn; a link is not* — that is the whole difference between the two.

### Components

**`components` is the one place the schema grows.** A new capability adds a key under it, never a field beside one.

| | Configures |
|---|---|
| `block` | which block module, and that module's own keys |
| `card` | `label`, `align`, `label_align`, `icon`, `alias`, `height` |
| `style` | slot and emphasis, weight and voice — never a colour, a pixel count or a font |
| `line` | how a run draws |
| `allows` | `ports`, `holds`, `members`, `degree`, `ends` — refused at the gesture |
| `expects` | `required`, `match` — advice, never a refusal |

- **A component owns its key and reads no other's.**
- **Each validates its own key at the door.** One absent from the build validates nothing, so its configuration is *unvalidated* rather than wrong — which is how an older build opens a newer package. What a component refuses is dropped, and only that key.

**No `shape`**: a definition picking a diamond drew as one on the canvas and as a rectangle in every export, which is a promise one renderer kept and the others could not.

**There is one way to draw**, so nothing here chooses between ways. A notation is a set of definitions naming block and relation modules and configuring them, never a module of its own and never a name the engine has to learn.

---

## Action Schema

```
Log  = Step[]

Step {
  id         Id
  action     string                  // the action that produced it
  at         number                  // steps before it
  status     "applied" | "reverted"
  mutations  Mutation[]
}
```

**The log is the truth.** The graph is folded from the applied steps in order, thrown away and rebuilt rather than edited, so it can never drift from the record that produced it. **Undo flips a status and refolds** — no mutation needs an inverse.

**One gesture is one step**, however many things it changed. Successive placements of the same block replace one another; a different action ends the run.

**Capped at 1,000 steps.** Past 1,200 the oldest fold into a single `checkpoint` holding the whole graph and are dropped. The graph is unchanged; what is spent is reach. A checkpoint is not something anybody did, so it cannot be undone.

### Mutation ops

**Closed.** A new sort of thing is a definition, which is data, and reaches the surface through the ops already here.

| | |
|---|---|
| `checkpoint` | the whole graph, written in the current schema |
| `add_block` · `update_block` · `delete_block` | make, retype or rename, remove |
| `move_block` · `place_block` · `size_block` · `order_block` | re-parent, position, least size, sibling order |
| `set_alias` · `set_counter` · `set_pinned` | handles, and the pinned list |
| `set_shelf` | the whole shelf, in order: the definition folders, and what sits in them |
| `set_body` | body text |
| `set_group` | which holder a block sits in, or none |
| `seat_cell` · `set_header` | a grid address, and whether the block heads its line |
| `set_holder` · `drop_holder` | a holder, made or replaced whole, and removed |
| `set_package` · `drop_package` | a package, and what it brought going with it |
| `set_source` | where a block's content came from |
| `link_blocks` · `update_edge` · `delete_edge` | make, retype, remove a relation |
| `set_dir` · `flip_edge` | direction, reversal |
| `set_end` · `set_port` · `set_side` · `mark_port` | ends, interface seating and marks |
| `set_field` · `drop_field` · `order_fields` | values on a block |
| `set_def` · `drop_def` | definitions |
| `set_arrangement` | how a layer lays out |
| `set_tags` · `set_look` · `drop_looks` | what one element says about itself |

**There are no migrations.** A retired op is one the door drops as unknown; a schema change re-saves the samples rather than adding a repair to the fold or the door.

---

## What the door enforces

**Every log comes in through one door**, from storage or a file, and is checked before it is folded. What can be repaired is repaired; what cannot is dropped rather than folded into a broken graph. The user is told once — `repaired 2, could not read 1` — and a clean log says nothing.

| | Rule |
|---|---|
| **tree** | exactly one root, `parent: null` only there. No cycles — a block cannot contain itself |
| **ends** | a relation's `from` and `to` both name blocks that exist, or it is dropped |
| **holders** | a cell holds one block; an address names a cell inside its grid; no merge crosses another. **Every repair frees the block rather than deleting it** |
| **references** | `of` names a block, or the reference reads **missing** and is kept |
| **definitions** | a write to a shipped definition is dropped; `extends` names something there; only readable components; a default only for its own kind, and one per kind; a workspace definition extending nothing is pointed at its base |
| **components** | each key validated by its own component; an unknown component is left alone, an unknown key within a claimed one is dropped |
| **modules** | a module the build does not know **falls back to the base block and says so**. Falling back silently is the one thing to avoid |
| **holders** | a holder drawn in a layer that is not there is dropped; a block seated in a holder that is not there is freed |
| **packages** | two packages sharing a name is repaired by renaming the later one — what it brought is still wanted |
| **names** | unique among siblings. Only stored labels compare — a fallback is a number nobody chose |

**A module's `validate` hook is what the rule kinds cannot say** — code, local, one usage at a time. It advises while modelling and refuses only at translation, because a model is legitimately unfinished.

---

## What the capabilities ask

**The door and the capabilities are two different questions, and only one of them is answered on the way in.** The door asks whether a graph can be *read* and repairs what it can. `allows` and `expects` ask whether a graph says what its definitions *asked for* — and nothing here is ever repaired, because an unfinished model is not a broken one.

```
validate(graph)          -> Fault[]    // can this be read? the door, and it mends
review(graph, scope?)    -> Note[]     // does it say what was asked? advice, and it never mends
```

**Scoped, because that is how it is asked.** The tray asks about the open layer and a translator asks about the subtree it is emitting; neither wants to hear about the rest of the workspace.

### Two keys, and the split is what says when each bites

**Each is a lookup, a count or one fixed comparison.** No operators, nothing to parse, and **no rule language**.

```
allows {
  ports?   false | true | Id[]                           // may seat interfaces
  holds?   false | true | Id[]                           // what it may own as children
  members? false | true | Id[]                           // what a holder may take
  degree?  { in?: {min?,max?}; out?: {min?,max?} }       // how many relations may meet it
  ends?    { from?: Id[]; to?: Id[]; fromFlow?; toFlow? } // who may sit at each end
}

expects {
  required? string[]                                     // field names a usage must fill
  match?    string[]                                     // fields that must agree across a relation
}
```

**Four settings, not a boolean**: absent inherits from the chain, `false`/`[]` is none, `true` is any, `[ids]` is those definitions or anything below them.

**Enforcement follows from the split** rather than being a policy anybody has to remember. `allows` is about structure, so a gesture that would break it is never offered. `expects` is about values, so a half-filled model is noted and never refused.

- **A capability naming a definition means it or anything below it.** Matching walks the `extends` chain, so one written once reaches every subtype.
- **Both merge along the chain, nearest first, per key.** A subtype restating one key leaves the others in force — the same cascade every component follows.
- **`degree` counts every relationship meeting a usage**, wherever it is drawn. It is about the thing, never about the layer somebody is looking at.
- **`allows.holds` is the only containment rule there is.** The engine owns none of its own any more; what may contain what is data, and is refused here.
- **A malformed capability is ignored, never thrown on**, the same way a component validates its own key and no other.

**`expects` advises while modelling and refuses only at translation.** A violation is a note in the tray; a translator asks the same checks as it emits, and that is where a note becomes a refusal. **`allows` never gets that far** — the gesture that would break it is not offered.

---

## What is derived, never stored

**Derived beats stored.** Anything workable out from the graph is worked out, so it can never go stale and nothing has to be kept true.

| | Derived from |
|---|---|
| **project** | a top-level block under the workspace root |
| **contained vs owned** | whether the child is a graph root |
| **container** | holding child blocks |
| **a group's members** | the blocks naming it in `group` |
| **a grid's cells** | its extent and its merges. An empty cell is an address nobody claimed |
| **which line a header heads** | where it sits — row 0 heads a column, the corner both, anything else its row |
| **allocation** | position. Every block along the lines a header covers, from where the header sits onward |
| **a relation's module** | whether a note sits at an end |
| **seats and routes** | the layer, every draw |
| **what refers to a block** | asked of the graph in scope; never a back-reference |
| **the content hash** | the graph. A stored hash lies the moment anyone edits the file by hand |

## The model, in rules

**Everything is a block; a relationship joins two of them.** One workspace, one graph, one log.

- **A block is the one element.** Placed, drawn, carries fields, holds other blocks. **There is no closed set of element sorts** — what a block *is* comes from its definition.
- **A block's presentation is its definition's first.** Two things looking alike is two things *being* alike; a block's own `looks` is the last word over its chain, and `save_def` turns it into a definition.
- **Ownership and containment are different questions.** A block **owns** a part; a **reference** stands for something living elsewhere. The tree is `parent` and nothing else.
- **A container is derived, never declared** — a block holding blocks draws as one, by **filling its own icon**. It is a way a block *looks*, and naming it a sort of thing would make an engine-level answer to something that changes the moment a child is added.
- **An interface is declared, not derived.** It is a block module, made deliberately, and carries `side`, `at` and `flow` instead of `x`/`y`. `flow` is decorative and constrains nothing.
- **A top-level block is nothing special in the schema.** It is a block whose parent is the workspace root, read from position and stored nowhere.
- **Root** is the block that holds every other, under a reserved id. `parent: null` means *in the root layer*. No frame: a frame is a block seen from inside, and root has no outside.
- **Anything joining two blocks is a relationship.** One may draw as something other than a routed line, but that is a rule about drawing. **Containment is not a relationship** — the tree is `parent`.
- **No relationship carries a route.** Where a line goes is derived from the layer, every draw.
- **A `link` points without drawing**, which is how a part property or a satisfied requirement is stated. **A reference is drawn; a link is not** — that is the whole difference.
- **Membership is neither.** A block names its `group`, and a holder's members are derived from that, so the two can never disagree. **A holder is never a parent** — `parent` says which layer you are in, `group` says what holds you within it.
- **Fields are never structural**: never in the explorer, never changing what contains what. **No identity** either — a field is addressed by name on its holder.

## What holds what

**A block is a block.** There is no structure/behaviour split and no tier walk. What a block *is* comes from its definition, and what it may hold is a rule a vocabulary states through `holds` — never one the engine imposes.

**The engine states no containment rule of its own.** The last one — *a view holds references, never parts* — had only the `view` module to attach to and went out with it. What is left is the few refusals that stop a graph being incoherent:

| | |
|---|---|
| a block cannot contain itself | the tree would not terminate |
| a holder cannot hold something that holds it | membership would not terminate |
| **a cell holds one block** | two sharing a cell leaves *what is allocated to this row* without an answer |

- **What a drop arrives as**, and there are only two answers:

  | Dropped in, from | Arrives as |
  |---|---|
  | elsewhere | a **reference** |
  | here | a **part** |

- **A reference points at what it stands for, and nothing points back.** Upward is a derived query, asked of the graph, because a stored back-reference would leave an exported subtree pointing at things that did not travel with it.
- **Nesting is one rule.** A cell seats one card and a holder is not a card, so a grid inside a swimlane is ordinary and a grid inside a grid is not.

**The seven base kinds read in three groups:**

| | Kinds | Role |
|---|---|---|
| **the block** | `block`, `folder` | owns a tree. What a usage of it *means* is its definition's |
| **holder shapes** | `group`, `grid` | hold blocks on one layer without owning them, as their own element kind |
| **accessories** | `reference`, `interface`, `note` | own no tree of parts |

**Everything else about containment is the user's**, and a vocabulary that wants more says so in `allows.holds`.

**Two capability keys** — `allows` refused at the gesture, `expects` asked by `review` — and neither by the door. See *What the capabilities ask*.
