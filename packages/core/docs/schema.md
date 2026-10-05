# Schema

The core data contract: what is valid data, and what the door checks on the way in. The vocabulary is in definitions.md.

**One graph, one log, everything a block.** Packages, definitions, holders and structure are blocks in one graph folded from one log.

| | Holds | Changed by | Exported |
|---|---|---|---|
| **file** | the envelope and the graph | export / import | yes |
| **graph** | blocks and relationships | the log, never directly | inside a file |
| **log** | steps and mutations | every action | no: it is internal |
| **session** | what is open, picked, folded, read | the user | never |


## File

```
File {
  schema    "1.0"              // reset; not incremented until the model settles
  id        Id                 // this workspace or package, for life
  graph     Graph
  meta?     object             // free-form, unversioned, safely ignorable
}
```

| Rule | |
|---|---|
| **JSON, always** | a workspace, a package (`base` and `markdown` included) and every element are definable as JSON |
| **nothing at its default is written** | no nulls, no empty lists; re-exporting an unchanged graph is byte-identical |
| **laid out for reading** | blocks then relationships, each flat and sorted by id; identity keys first, the rest alphabetical |
| **a workspace file** | the workspace package and every package brought in beside it; `base` never travels. A file naming a definition it does not carry is refused |
| **a package is the smallest export** | a package root, everything under it, and its relationships. Nothing smaller is written as a file |
| **import is a checkpoint** | no second format, no second reader. Bringing a package in adds it beside the workspace, frozen; a clash of ids is refused |


## Session

**Display state, outside the log and never in a file.** The test: is it in the log? A host keeps its own beside it (mndmap: which documents are read).

```
Session {
  open      Id | null          // the tree layer the canvas draws; null is the overview
  selected  Route[]            // a block, or usage/part
  folded    Id[]
  theme     string
  toggles   Record<string, boolean>
}
```


## Graph

```
Graph {
  root      Id                      // the workspace package's root
  blocks    Record<Id, Block>
  edges     Record<Id, Relation>
}
```

**One id space across blocks and relationships.** `base` keeps bare ids (`block`, `line`); other packages namespace theirs (`md.heading`). Ids are minted, never derived from a name.


### Block

```
Block {
  id            Id
  parent        Id | null         // null only for a package root
  type?         Id                // a usage: what it is; a definition: what it extends
  name?         string            // required on a definition
  body?         string            // a block's text; a definition's description

  def?          { schema?: FieldDef[] }   // present on a definition, and only there

  of?           Id                // reference: what it stands for
  source?       string            // provenance: one uri

  cell?         {r, c}            // seated in its parent grid, in place of x/y
  grid?         Grid              // its lattice, where it is a grid

  x?, y?        number            // placement, when hand-laid
  w?, h?        number            // least size
  side?         Side              // interface: which wall
  at?           number            // interface: 0–1 along it
  flow?         "in"|"out"|"both" // interface: decorative
  order?        number            // among siblings
  alias?        number            // handle serial, minted once

  counters?     Record<string, number>   // workspace root: handle counters per kind

  settings?     Components        // its own word, by component
  traits?       Id[]              // capability tags, in order; definitions only
  tags?         Id[]              // tag definitions it carries
  values?       Field[]           // a usage's values
}
```

| Rule | |
|---|---|
| **`parent` is the only containment** | holders hold by it; a grid's member also carries `cell`. There is no membership field |
| **`def` is explicit** | a definition is a block carrying it. Holders, packages and usages never do |
| **one `type`** | extends on a definition, is-a on a usage. Absent: a plain block |
| **own values only** | `settings`, `traits`, `tags`, `values` store what this block says; the rest resolves on read |
| **traits replace, settings merge** | a block stating `traits` replaces its chain's set; `settings` merge per property, nearest first |


### Grid

```
Grid {
  rows, cols    number            // its extent; unsaid, two by two
  head?         {top?, left?}     // which outer lines head the rest
  merges?       Span[]            // cells with an extent of their own
  values?       string[][]        // a label per cell, by row then column
  schema?       Id                // the definition whose fields head its columns
  columns?      Id[]              // the definition each column allocates
  size?         {w, h}            // one cell's size in units
}
```


### Relation

```
Relation {
  id          Id
  from, to    Id                 // blocks, never a relationship
  fromPart?   Id                 // a part of from's definition the run leaves
  toPart?     Id                 // a part of to's definition the run reaches
  type?       Id                 // a relation definition; absent: line
  name?       string
  dir?        "none" | "forward" | "back" | "both"
  fromSide?, toSide?   Side
  alias?      number
  tags?       Id[]
  settings?   Components
}
```

| Rule | |
|---|---|
| **ends anywhere** | a relationship may join blocks on different layers and in different holders |
| **definitions are never linked** | except by a tie trait: a note tied to a definition |
| **no values, no structure** | what a connection says belongs to its ends |
| **no route** | where a line goes is derived every draw |


### Field

```
Field    { name, form, value?, tags?, key? }
FieldDef { name, form, value?, unit?, choices?, many?, tags?, key? }
```

**Five value forms, and the set is closed**: `text`, `number` (`unit`), `flag`, `choice` (`choices`), `link` (`many`). A field has no identity: it is addressed by name on its holder.


### Components

**`settings` is the one place the schema grows.** A new capability adds a key, never a field.

| Key | Configures |
|---|---|
| `block` | which block module |
| `card` | `label`, `align`, `label_align`, `icon`, `alias`, `height`, `fields`, `body`, `name`, `preview` |
| `style` | a family, or a `hue` with its `intensity` and `vary`; `fill` and `opacity`; border and writing weight, face and contrast. Never a hex or a pixel count |
| `line` | how a run draws |
| `layout` | `kind`: `free`, `auto`, `outline` or `page`; `across` and `line` for the computed ones. An unknown kind draws as `auto` |
| `tie` | the relation type a block made from or dropped on another is linked to it by |
| `allows` | `ports`, `holds`, `members`, `heads`, `degree`, `ends`. Refused at the gesture; absent is a no. Usually granted whole by a trait. Which holder a block is comes from its base, never from here |
| `expects` | `required`, `match`. Advice, never a refusal |

- **A component owns its key and validates it at the door.** One absent from the build is left unvalidated, not wrong.
- **A malformed setting is dropped**, that key only.


## Log

```
Log  = Step[]
Step { id, action, at, status: "applied" | "reverted", mutations: Mutation[] }
```

**The log is the truth**; the graph is folded from the applied steps. **Undo flips a status and refolds.** One gesture is one step. Capped: past the cap the oldest steps fold into one `checkpoint`.

### Mutation ops

**Closed.** A new sort of thing is a definition, which is data.

| Op | |
|---|---|
| `checkpoint` | the whole graph |
| `add_block` · `update_block` · `delete_block` | make; rename or retype; remove with its subtree |
| `move_block` · `place_block` · `size_block` · `order_block` | re-parent, position, least size, sibling order |
| `set_alias` · `set_counter` | handles |
| `set_body` · `set_schema` · `set_source` | text, a definition's fields, provenance |
| `seat_cell` · `set_grid` | an address in the parent grid; a lattice, written whole |
| `link_blocks` · `update_edge` · `delete_edge` | make, rename or retype, remove a relationship |
| `set_dir` · `flip_edge` · `set_end` · `set_port` · `set_side` · `mark_port` | direction, ends, interfaces |
| `set_value` · `drop_value` · `order_values` | a usage's values |
| `set_tags` · `set_traits` | the tags and traits an element carries; `traits: null` gives the set back to the chain |
| `set_setting` · `drop_settings` | one property of one component; everything at once given back |


## The door

**Every log comes in through one door** and is checked before it is folded. What can be repaired is; what cannot is dropped. The user is told once; a clean log says nothing. **It never migrates.**

| | Rule |
|---|---|
| **tree** | `parent: null` only on package roots; no cycles |
| **frozen** | a mutation writing under a frozen package is dropped |
| **ends** | both ends name blocks, and a named part is in the end's definition, or the relationship is dropped |
| **references** | `of` names nothing: the reference reads missing and is kept |
| **cells** | a seated block sits inside its grid's extent, one to a cell; no merge crosses another or a header line. A repair unseats, never deletes |
| **components** | each key validated by its own component; an unknown component is left alone |
| **modules** | a module the build does not know falls back to the base block, and says so |
| **names** | unique among siblings; a definition is named |


## What review reports

**`review` asks whether a graph says what was asked of it, and never mends.** The door asks whether it can be read.

| Kind | Reports |
|---|---|
| `holds` · `ports` · `degree` · `ends` | a capability broken by data that arrived another way |
| `required` · `match` | a value a usage was asked for |
| `nested` | a definition inside a definition |
| `self` | a definition holding a usage of itself |
| `cycle` | a `type` chain that closes on itself |

**A gesture refuses what review would report**, so only loaded data ever carries one.


## What is derived, never stored

| | Derived from |
|---|---|
| **role** | position: domain, tree, structure |
| **the layer a block draws on** | its nearest hiding ancestor |
| **what a usage shows** | its own children and its type's structure, one step |
| **a holder's members** | its children |
| **a definition's domain** | its base: block or relation |
| **allocation** | a cell's position and its headers |
| **seats and routes** | the layer, every draw |
| **what refers to a block** | asked of the graph; never a back-reference |
