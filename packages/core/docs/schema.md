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
| **definitions may be authored as files** | one JSON file per definition, or a YAML diagram file, in a source folder collected into one package file (see *Card sources* and *Diagram files*). Read one way: the app writes package files only |
| **import is a checkpoint** | no second format, no second reader. Bringing a package in adds it beside the workspace, frozen; a clash of ids is refused |


## Session

**Display state, outside the log and never in a file.** The test: is it in the log? A host keeps its own beside it (mndmap: which documents are read).

```
Session {
  focus     Id                 // the room or region the camera is on
  entered   boolean            // a block entered from the map: its own view, alone
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
  body?         string            // what a block holds as text
  description?  string            // what it is for, in a line: shown on hover

  def?          { attributes?: Attribute[]; ends?: Ends }   // on a definition, and only there

  of?           Id                // what a reference stands for: read only where its kind is one
  library?      Library           // a package root: its named components
  records?      {[name]: string}[] // a collection's records: values, never blocks
  source?       string            // provenance: one uri

  cell?         {r, c}            // seated in its parent grid, in place of x/y
  grid?         Grid              // its lattice, where it is a grid

  x?, y?        number            // placement, when hand-laid
  w?, h?        number            // least size
  ports?        Port[]            // its boundary, in order: data, keyed by id
  order?        number            // among siblings, minted from the list it was read from
  groups?       Id[]              // the groups on its layer it is in: membership, apart from tags
  alias?        number            // handle serial, minted once

  counters?     Record<string, number>   // workspace root: handle counters per kind

  settings?     Components        // its own word, by component
  traits?       Id[]              // what the engine lets it do, in order; definitions only
  tags?         Id[]              // tags it carries, by id, to be found by
  constraints?  Id[]              // constraints it is held to, by id
  values?       Value[]           // a usage's answers, in order
}

Port {
  id            Id                // what a line's end names, with its block
  name?         string
  type?         Id                // its interface definition; absent: base `interface`
  description?  string
  flow?         "in" | "out" | "both"   // absent: both
  side?, at?                      // placed on its wall; absent: it places itself
  alias?        number
}
```

| Rule | |
|---|---|
| **`parent` is the only containment** | holders hold by it; a grid's member also carries `cell`. There is no membership field |
| **`def` is explicit** | a definition is a block carrying it. Holders, packages and usages never do |
| **one `type`** | extends on a definition, is-a on a usage. Absent: a plain block |
| **own values only** | `settings`, `traits`, `tags`, `values` store what this block says; the rest resolves on read |
| **lists replace, settings merge** | stating `traits`, `tags` or `constraints` replaces its chain's list whole; unsaid, it carries the nearest list stated. An empty list says none. `settings` merge per property, nearest first |


### Grid

```
Grid {
  rows, cols    number            // its extent, header lines included
  merges?       Span[]            // cells with an extent of their own
}
```


### Relation

```
Relation {
  id          Id
  from, to    Id                 // blocks, never a relationship
  fromPort?   Id                 // the port on from the run leaves: its own, or its definition's
  toPort?     Id                 // the port on to the run reaches
  ends?       Ends               // what its ends say over its definition's: multiplicity and role
  name?       string             // what it is called; absent draws its definition's name
  type?       Id                 // a relation definition; absent: line
  alias?      number
  tags?       Id[]               // as a block's: stated, they replace its definition's
  constraints? Id[]              // as a block's
  settings?   Components         // `line.dir` says which way it points
  values?     Value[]
}
```

| Rule | |
|---|---|
| **ends anywhere** | a relationship may join blocks on different layers and in different holders |
| **a definition and a usage never relate** | two definitions may (an association), two usages may; a tie joins anything |
| **ends are data** | `Ends { from?, to? }`, each `End { multiplicity?, role?, ownership?, navigable? }`; a relation definition says them in `def.ends`, a line only multiplicity and role |
| **no values, no structure** | what a connection says belongs to its ends |
| **no route** | where a line goes is derived every draw |


**A grid is allocation and nothing else**: its top row heads columns, its left column heads rows, and what sits in a cell is a block. There are no text labels and no records.


### Attribute and value

```
Attribute { name, type?, key?, default?, unit?, many?, optional?, note?, extra? } // key: primary | unique
Value     { name, value }
```

**A definition declares attributes; a usage answers them.** An attribute's `type` names a form, a type, or a block definition, which makes it a link; absent, it is text. `extra` keeps any other property as written. A value is typed by its attribute, never by itself, and is addressed by name on its holder. Neither has an identity of its own.

**How a value is edited is closed**: the forms `text`, `number`, `flag`, `choice`, `link`, named by their own word. **What a value is, is open**: a package's types.


### Components: library, ports and behaviours

```
Library    { types?, tags?, interfaces?, constraints? }      // on a package root
Entry      { id, name, description?, type?, settings? }      // every entry: extends, styled
Type       Entry & { form, choices?, unit?, format? }        // an enum or an alias
Tag        Entry
Interface  Entry                                             // what a port carries
Constraint Entry & { required?, match? }                     // what values must say
```

**Named components are data, never blocks**: a package's entries live on its root, carried by id, one name space with its definitions. An entry's `type` names another of its kind; extending nothing, it extends its kind's base definition (`attribute`, `tag`, `interface`, `constraint`), and **one resolver** reads settings down that chain as down a block definition's. **Ports are data on a block** (`ports`); a definition's are inherited down its chain as attributes are, and a view draws each on the wall of every block wearing it, as `block/port`, where a relationship meets it by `fromPort` or `toPort`. **Behaviours are blocks** under what holds them, their kind carrying *is behaviour*.


### Components

**`settings` is the one place the schema grows.** A new capability adds a key, never a field.

| Key | Configures |
|---|---|
| `block` | which block module; `behaviour`, granted by *is behaviour* |
| `card` | `label` (unsaid `inside`: the type word in the top corner), `align` (unsaid `left`), `label_align`, `icon`, `alias`, `height` (`uniform`, `free`), `name`, `face` (`table`, `class`, `document`, `picture`, `text`), `size` (`{w, h}` in units): which large face it draws with and how big it is. Unsaid, a card has no large face. `shape` (`box`, `round`, `diamond`, `dot`, `ring`): what it is drawn as — base's `decision` a diamond, `start` a dot, `end` a ring |
| `style` | a family, or a `hue` with its `intensity` and `vary`; `fill` and `opacity`; border and writing weight, face and contrast. Never a hex or a pixel count |
| `line` | how a run draws: `dir`, `from_arrow`, `to_arrow`, `name`, `alias`; `module` (`line`, `tie`): a tie runs straight and is never routed, granted by *is tie* |
| `layout` | `kind`: `layered` or `treemap`, packed where unsaid — every card is placed automatically; `line`; `cards`: `small` or `large`, the size what it holds draws at; `shape`: the `card.shape` what it holds draws as where its own says none (base's `state`: `round`); `view`: `package`, `internal`, `allocation`, `sequence`, `class` or `er`, the layer view the block opens on (a definition opens as its usages do). Unsaid kind, or a kind this build does not know, draws packed. A `view` this build does not know, or that the block cannot feed, opens on the one its kind's `base` definition names |
| `tie` | the relation type a block made from or dropped on another is linked to it by |
| `allows` | `ports`, `holds`, `heads`, `degree`, `ends`. Refused at the gesture; absent is a no. Usually granted whole by a trait |
| `holder` | `matrix`, `band`: how a block draws what it holds — in cells, as a band of its layer. Granted by *is grid* and *is region*; which holder a block is comes from here. A group holds nothing: its members carry its name as a tag |
| `records` | `of`: the block definition a collection's records answer |

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
| `set_body` · `set_description` · `set_attributes` · `set_source` | text, what it is for, a definition's attributes, provenance |
| `set_ends` · `set_library` · `set_records` · `set_ports` | a relation's or relation definition's ends, a package's named components, a collection's records, a block's ports; each written whole |
| `seat_cell` · `set_grid` | an address in the parent grid; a lattice, written whole |
| `link_blocks` · `update_edge` · `delete_edge` | make, rename or retype, remove a relationship |
| `flip_edge` · `set_end` | ends, and the port an end meets |
| `set_value` · `drop_value` · `order_values` | a usage's answers, by name |
| `set_tags` · `set_constraints` · `set_traits` | an element's tags or constraints; a definition's traits. A list, or null to give it back to the chain |
| `set_setting` · `drop_settings` | one property of one component — on a block, a line or a library entry; everything at once given back |


## The door

**Every log comes in through one door** and is checked before it is folded. What can be repaired is; what cannot is dropped. The user is told once; a clean log says nothing. **It never migrates.**

| | Rule |
|---|---|
| **tree** | `parent: null` only on package roots; no cycles |
| **frozen** | a mutation writing under a frozen package is dropped |
| **ends** | both ends name blocks, or the relationship is dropped; a port an end names that its block does not wear is let go |
| **references** | `of` names nothing: the reference reads missing and is kept |
| **cells** | a seated block sits inside its grid's extent, one to a cell; no merge crosses another or a header line; a lattice carries nothing but its extent and merges. A repair unseats, never deletes |
| **components** | each key validated by its own component; an unknown component is left alone |
| **modules** | a module the build does not know falls back to the base block, and says so |
| **names** | unique among siblings; a definition is named |
| **definitions** | a definition sits under a package root or a folder in the definitions tree, never in a structure or another definition; one elsewhere moves to its package root |


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
| **used by** | every attribute and usage typed by a definition |
| **links** | an attribute typed by a block definition, between two cards a layer draws |
| **faces** | which face a card draws with, its size, and the large face's markdown |
| **seats and routes** | the layer, every draw |
| **what refers to a block** | asked of the graph; never a back-reference |


## Card sources

**A card as markdown: frontmatter, then its body.** The graph is the truth; `card_text` writes a block or a definition as its source, and the `markdown` and `attach` actions read one back as ordinary changes. Frontmatter is YAML.

| Key | On a usage | On a definition |
|---|---|---|
| `name` | its name | its name |
| `type` | the definition it is, by name | what it extends, by name |
| `def` | — | present: it is a definition; its `attributes` |
| `tags` | its tags, by name | its tags, by name |
| `groups` | the groups on its layer it is in, by name. A group's own entry lists no `blocks` | — |
| `traits` | — | the traits it states, by name |
| `source` | where its content lives outside | — |
| `blocks`, `relations`, `packages` | the layer it holds, as a diagram file | the layer it holds, as a diagram file |
| `values` | its answers: a map of name to value, or a list of `{ name, value }` | its attributes' defaults, the same way |
| anything else | dropped | dropped |

- the body after the frontmatter is `body`, as written. Tables in it are content
- a type or tag name nothing loaded holds, or more than one package holds, makes a plain definition in the workspace, and is said
- frontmatter and a diagram file are one schema, read by one reader
- **a diagram file whose block is typed `model`** makes a model: a definition holding the layer it states
- **a source folder** is a package on disk, called what its `package.json` says (its `id`), else what the folder is called: `package.json` (the package's graph), a `.json` file per definition, `.yaml` diagram files, and `.md` usages, each directory a folder — but one named as a file beside it, which holds that file's block's parts. `collect` reads one as a package file; a definition said twice is refused; a type its usages name and nothing defines is made, its attributes the union of what they answer. `base` is one: `packages/defs/src/base/`, collected by `npm run base`, its ids kept bare
