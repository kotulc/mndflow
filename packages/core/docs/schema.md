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

**Importing is a graft, and a checkpoint.** The subtree is appended to the target layer, so there is no second format and no second reader.

**Ids survive the round trip.** They are wide enough that an accidental collision is vanishingly unlikely, so a collision that does happen means the two really are the same thing — and the import **replaces** that subtree, behind a confirm in the strip. One question, one answer attached, like everything else the app says.

**Laid out for reading**: definitions first, then the block tree, then relations. Blocks nest under their parents so `parent` is never written; siblings sort by id, so a rename is one line and re-parenting moves a record — which is what a structural change should look like. Relations sort by `from`, then `to`.

---

## Graph Schema

```
Graph {
  root    Id                      // the workspace block; parent: null
  defs    Record<Id, Definition>
  blocks  Record<Id, Block>
  edges   Record<Id, Relation>
}
```

**One id space across blocks, relations and definitions.** *Typed-by* and *points-at* must stay one operation, and a rename must orphan nothing. A definition's `group` — **`block` or `relation`** — is how a file reads and how import dispatches, **not a second id space**.

### Block

**Everything is a block.** Two element kinds exist — a block and a relation — and every other noun in the model is a block with a different type.

```
Block {
  id            Id
  parent        Id | null         // null only for root
  type?         Id                // the definition it names; absent = base
  label?        string
  body?         string

  of?           Id                // reference: the block it stands for

  group?        Id                // the holder it sits in — a boundary or a grid
  cell?         {r, c}            // grid: its address, in place of x/y
  header?       boolean           // grid: it heads the line it sits in

  rows?, cols?  number            // grid only: its extent
  merges?       Span[]            // grid only: cells with an extent of their own

  x?, y?        number            // placement, when hand-laid. A grid owns its corner
  w?, h?        number            // least size, where it has one
  arrangement?  Arrangement       // when this block is the open layer

  side?         "top"|"right"|"bottom"|"left"    // interface: which edge
  at?           number            // interface: 0–1 along that edge
  num?          number            // position among siblings, renumbered on a move
  alias?        number            // minted once and never rewritten
  flow?         "in"|"out"|"both" // interface: decorative, constrains nothing

  fields?       Field[]
}
```

**Block modules** — engine code behind one sort of block, each with its own configuration surface and its own hooks. **Open**: a code change ships one more, additively. The `base` package carries one definition per module, and everything a user or package defines **extends** one of them.

| | Holds | Is |
|---|---|---|
| `folder` | anything — independent roots, contained never owned | the organizational unit. **The workspace is the root folder; a project is a top-level block** |
| `block` | parts and references | the base kind, and the one every ordinary block is. What there is, how it is composed, and what it does |
| `reference` | nothing | a stand-in for a block living elsewhere. `of` is the whole of it |
| `interface` | anything | a block seated on an edge. The one anchor for every port-like thing — a proxy port, a full port, a pin, a constraint parameter |
| `resource` | a workspace-relative path or link | a file, a script, a data file, an image |
| `group` | any block on its layer | a boundary round a set — a swimlane, a region, a package boundary. A dashed rim, sized from what it holds |
| `grid` | any block, one to a cell | a region of the lattice with an extent. It owns its corner, because an empty one would otherwise be nothing |
| `note` | text | a resource drawn as a card of text |

**Eight, in two families.** `block`, `folder` and `resource` are **open** — they differ in what they are for, so `retype` swaps a block among them and among any of their subtypes. `reference`, `interface`, `group`, `grid` and `note` are **derived**: each carries something a change of type cannot invent, so one is made rather than retyped into, and subtyping such a kind means making one and customizing it.

**A group and a grid are two modules, not one with a setting.** They differ in what a member's place *is* — a boundary reads its bounds off wherever its members ended up, a grid says where each member goes. What they share is that both **hold**: `group` names either, membership is flat, and either may hold the other so long as membership does not cycle.

**There is no untyped block.** A block naming no definition *is* a `block` — the field being absent is how a file stays small, never a second sort of thing, and every reader resolves it to the kind's own definition. `view` is reserved rather than shipped.

**`Arrangement`** — `free` · `grid`. **One setting, two values.** `free` is hand placement, rounded to the lattice; `grid` is auto-layout, which ignores stored positions and works a box out for every loose block from the relationships and the sizes. **The four directional values are gone** — they ranked by relationships and drew a picture of the graph rather than of the model. **Model data, not a preference**: how a layer lays out is part of what the layer says, so a diagram reopens the way it was left and travels in a file with the rest of it.

**Membership is not parenthood.** `parent` says which layer a block is in; `group` says which holder on that layer it sits in. Only the first is the tree, which is why deleting a group frees what it held rather than taking it along.

**A header is a flag, and position says which line it heads** — row 0 heads its column, `{0,0}` heads both, anything else heads its row. Nothing stores the role, so a block dragged into row 0 becomes a column head and `transpose` needs no header code at all.

### Relation

```
Relation {
  id          Id
  from, to    Id
  module      "line" | "directed" | "reference" | "tie"
  type?       Id
  dir?        "none" | "forward" | "back" | "both"

  fromPort?, toPort?   Id                    // where an end met an interface
  fromSide?, toSide?   Side                  // a wall a right drag named
  fromAt?,   toAt?     number                // an anchor slid by hand

  fields?     Field[]
}
```

**Four relation modules, and the set is closed.** Two are picked and two are implicit:

| | Picked | Is |
|---|---|---|
| `line` | yes, the default | an untyped association. Ends are plain seats the layer places |
| `directed` | yes | a flow or transition. Ends take the sides the layout gives them |
| `reference` | **no — implicit** | one end reaches a reference block. Drawn dashed and held back |
| `tie` | **no — implicit** | one end is a note. A loose association, drawn as a faint leader, taking no seats |

**`dir` refines; the module decides there is a direction at all.** A `directed` relation left at `none` reads source → target and draws an arrowhead. Wanting no arrows is `reform` back to a `line`. **A layer has no reading direction of its own** — order is stated by a directed relation, or by a cell address along the way a grid reads.

**No relation carries a route.** Where a line goes is derived from the layer every time it is drawn.

**Containment is not a relation.** The tree is `parent` — the one join every block has exactly one of, so storing it as edges would mean guarding an invariant a field enforces for free.

### Definition

```
Definition {
  id           Id
  home         Id                    // the block it is filed under
  group        "block" | "relation"
  name         string
  body?        string
  extends?     Id                    // one parent, and the chain is real
  fields?      FieldDef[]
  size?        { w, h }              // the room a usage needs
  names?       Record<string, string>   // { sysml: "«requirement»" }
  components?  Record<string, object>
}
```

**A definition is filed under a block, and that does four jobs at once.** `home` is the only stored part; everything else falls out of position:

| | Derived from `home` |
|---|---|
| **who owns it** | the top-level ancestor of `home` |
| **who may use it** | any block with `home` among its ancestors |
| **what an export carries** | the definitions its subtree reaches |
| **which of two wins** | the nearer ancestor |

**Resolution walks up the tree.** A block finds a definition by climbing its ancestors, nearest first, to the workspace. Definitions filed on the workspace are visible everywhere. **There is no import list** — position does the whole job, so there is no order to maintain and nothing to keep in step with what actually exists.

**Ambiguity is presentation, never resolution.** Two ancestors defining the same *name* are two different definitions; both are offered, each shown with where it came from. Nothing shadows, because every usage names an id.

**Extension is subtyping, never overriding.** Fields union with the subtype's winning by name.

**Components cascade per property.** The chain is laid down base first and merged one property at a time, so a refinement says only what it changes and inherits the rest — setting a shape no longer throws away the layout it was given. One parent, so the order is a list rather than a graph: what comes later wins and there is no diamond to resolve. **The element has the last word**: a block's own `looks` is the final layer over whatever its chain said.

**A definition's kind is the nearest link that names one.** A subtype saying nothing is its parent's kind, which is what makes a chain of refinements safe. What stops a block changing kind is the gesture — `retype` refuses across families — never the chain.

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
| `card` | layout, which mark it wears as an `icon`, where the label sits, and which fields it `shows` |
| `style` | slot and emphasis, weight and voice — never a colour, a pixel count or a font |
| `constraints` | `required` |
| `rules` | `ends`, `holds`, `degree`, `match` |

- **A component owns its key and reads no other's.**
- **Each validates its own key at the door.** One absent from the build validates nothing, so its configuration is *unvalidated* rather than wrong — which is how an older build opens a newer package. What a component refuses is dropped, and only that key.

**Card layouts** — `name` · `type` · `fields` · `compartments` · `icon`. **No `shape`**: a definition picking a diamond drew as one on the canvas and as a rectangle in every export, which is a promise one renderer kept and the others could not.

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
| `move_block` · `place_block` · `size_block` | re-parent, position, least size |
| `set_body` | body text |
| `set_group` | which holder a block sits in, or none |
| `seat_cell` · `set_header` | a grid address, and whether the block heads its line |
| `set_grid` · `merge_cells` · `split_cells` | a grid's extent, and cells with an extent of their own |
| `link_blocks` · `update_edge` · `delete_edge` | make, retype, remove a relation |
| `set_dir` · `set_form` · `flip_edge` | direction, module, reversal |
| `set_end` · `set_port` · `set_side` · `mark_port` | interface seating and marks |
| `set_field` · `drop_field` | values on a block or relation |
| `set_def` · `drop_def` | definitions |
| `set_arrangement` | how a layer lays out |
| `set_labelled` · `set_locked` · `set_tags` · `set_look` | what one block says about itself |

**Compaction is the migration path.** Every schema change leaves a branch in the fold that can never be deleted, because some log still contains that op. A checkpoint is written in the *current* schema whatever the steps behind it were spelled in, so a workspace sheds retired ops by being used.

---

## What the door enforces

**Every log comes in through one door**, from storage or a file, and is checked before it is folded. What can be repaired is repaired; what cannot is dropped rather than folded into a broken graph. The user is told once — `repaired 2, could not read 1` — and a clean log says nothing.

| | Rule |
|---|---|
| **tree** | exactly one root, `parent: null` only there. No cycles — a block cannot contain itself |
| **ends** | a relation's `from` and `to` both name blocks that exist |
| **holders** | a cell holds one block; an address names a cell inside its grid; no merge crosses another. **Every repair frees the block rather than deleting it** |
| **references** | `of` names a block, or the reference reads **missing** and is kept |
| **definitions** | `home` names a block; `extends` chains terminate; a `type` resolves from the usage's ancestors |
| **components** | each key validated by its own component; an unknown component is left alone, an unknown key within a claimed one is dropped |
| **modules** | a module the build does not know **falls back to the base block and says so**. Falling back silently is the one thing to avoid |
| **names** | unique among siblings. Only stored labels compare — a fallback is a number nobody chose |

**A module's `validate` hook is what the rule kinds cannot say** — code, local, one usage at a time. It advises while modelling and refuses only at translation, because a model is legitimately unfinished.

---

## What the rules ask

**The door and the rules are two different questions, and only one of them is answered on the way in.** The door asks whether a graph can be *read* and repairs what it can. The rules ask whether a graph says what its definitions *asked for* — and nothing here is ever repaired, because an unfinished model is not a broken one.

```
validate(graph)          -> Fault[]    // can this be read? the door, and it mends
review(graph, scope?)    -> Note[]     // does it say what was asked? advice, and it never mends
```

**Scoped, because that is how it is asked.** The tray asks about the open layer and a translator asks about the subtree it is emitting; neither wants to hear about the rest of the workspace.

### One constraint and four rules

**Each is a lookup, a count or one fixed comparison.** No operators, nothing to parse, and **no rule language**.

```
constraints { required: string[] }                       // field names a usage must fill

rules {
  ends    { from?: Id[]; to?: Id[]; fromFlow?; toFlow? } // who may sit at each end
  holds   Id[]                                           // what this may contain
  degree  { in?: {min?,max?}; out?: {min?,max?} }        // how many relations may meet it
  match   string[]                                       // fields that must agree across a relation
}
```

- **A rule naming a definition means it or anything below it.** Matching walks the `extends` chain, so a rule written once reaches every subtype.
- **Rules merge along the chain, nearest first, per kind.** A subtype restating one kind leaves the others in force — the same cascade every component follows.
- **`degree` counts every relationship meeting a usage**, wherever it is drawn. It is about the thing, never about the layer somebody is looking at.
- **`holds` is the only containment rule there is.** The engine owns none of its own any more; what may contain what is data, and is asked here.
- **A malformed rule is ignored, never thrown on**, the same way a component validates its own key and no other.

**They advise while modelling and refuse only at translation.** A violation is a note in the tray; a translator asks the same checks as it emits, and that is where a note becomes a refusal.

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
| **`reference` and `tie` relation modules** | what sits at the ends |
| **`derived` on a relation** | a flag, recomputed on fold, not in the log, not deletable |
| **seats and routes** | the layer, every draw |
| **what refers to a block** | asked of the graph in scope; never a back-reference |
| **which of two definitions wins** | the nearer ancestor |
| **the content hash** | the graph. A stored hash lies the moment anyone edits the file by hand |

## The model, in rules

**Everything is a block; a relationship joins two of them.** One workspace, one graph, one log.

- **A block is the one element.** Placed, drawn, carries fields, holds other blocks. **There is no closed set of element sorts** — what a block *is* comes from its definition.
- **A block carries no presentation of its own.** Colour, shape and the rest belong to its definition, so two things looking alike is two things *being* alike.
- **Ownership and containment are different questions.** A block **owns** a part; a **reference** stands for something living elsewhere. The tree is `parent` and nothing else.
- **A container is derived, never declared** — a block holding blocks draws as one. It is a way a block *looks*, and naming it a sort of thing would make an engine-level answer to something that changes the moment a child is added.
- **An interface is declared, not derived.** It is a block module, made deliberately, and carries `side`, `at`, `num` and `flow` instead of `x`/`y`. `flow` is decorative and constrains nothing.
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
- **Nesting is ordinary.** A holder holds holders, so a grid inside a swimlane costs nothing new.

**The eight base modules read in three groups:**

| | Modules | Role |
|---|---|---|
| **the block** | `block` | owns a tree. What a usage of it *means* is its definition's |
| **filing** | `folder` | holds top-level blocks, and anything else |
| **holders** | `group`, `grid` | hold blocks on one layer without owning them |
| **accessories** | `reference`, `interface`, `note`, `resource` | own no tree of parts |

**Everything else about containment is the user's**, and a vocabulary that wants more says so in `holds`.

**One constraint and four rules** — `required`, and `ends`, `holds`, `degree`, `match` — asked by `review` and never by the door. See *What the rules ask*.
