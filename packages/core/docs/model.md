# Model

The object graph: **two element kinds**, blocks and relationships, and every other noun a block. Packages, definitions, holders and usages differ by a marker, a position or a type. Shapes are in schema.md; terms in definitions.md.


## Packages, definitions, usages

| | Is | Holds |
|---|---|---|
| **package** | a root block (`parent: null`) | its domain: holders and trees |
| **definition** | a block carrying `def`, in a domain | its structure |
| **usage** | a block without `def` | its own children; shows its type's structure through |
| **holder** | a folder, region or grid | whatever its place allows: a folder in a domain holds definitions and structure alike; in a structure, usages |

- **A definition is a named tree.** It is used and extended by `type`, whether or not anything does, and is never itself placed or linked as an instance.
- **A usage may be a tree too**, placed straight in a domain, under a package root or a domain folder.
- **Definition side and structure**: a package root, a definition, or a folder reached from its package root through folders alone is on the definition side (`is_domain`); everything else is structure. The explorer's sections list by side.
- **A model is a definition extending base `model`** (`is_model`): what is built, drawn on directly in the models section, its parts the usages it holds. One model is never instanced; another model uses it as a part. `models` lists them, `model_of` names the one a block sits in. Its icon, the tree, is worn by nothing else.
- **A definition's uses** (`uses.ts` `definition_uses`) are the usages typed by it, references to it and lines typed by it, inside any model at any depth. Parts of a definition that is not a model are not counted on their own.
- **Frozen**: any package but the workspace's is read only. A definition from one is subtyped, never edited.
- **Removing a definition or a package that something uses is refused.** Nothing is rewritten to make way.


## Block modules and kinds

**A module is engine code; a kind is a definition.** Three modules, each named by a trait the kind carries (`block.module`):

| Module | Read from |
|---|---|
| `block` | nothing else said |
| `reference` | *is reference*: `of` names what it stands for |
| `interface` | *is port*: seated on its owner's wall |

The `base` package ships the kinds: `block`, `folder`, `group`, `grid`, `reference`, `note`, `label`, `region`, the relation kinds `line` and `tie`, and the component bases `attribute`, `constraint`, `interface` and `tag`. **The set is minimal and enumerates what is functionally distinct**; anything else is a subtype. **There is no untyped block**: a block naming nothing is a `block`.


## Holders

**A holder holds by `parent`, as everything does.** What separates them is how they draw what they hold. **A group holds nothing**: its members carry it in `groups` and stay where they are filed, so it is no holder.

| Holder | Draws its contents | Nests |
|---|---|---|
| **folder** | hidden: you descend to see them | yes |
| **region** | inline, as a band across its layer | no |
| **grid** | in cells, each compact | any block may sit in a cell, a grid included |

- **Deleting a holder deletes its subtree.** Deleting a group takes it off its members, who stay; a group whose last member goes, or leaves its layer, goes too.
- **A grid's member always has a cell.** One that loses its cell (a line removed, a merge, a smaller extent) moves to the nearest spare cell on its side, else leaves the grid.
- **Headers are lines.** The top row heads the columns, the left column the rows. A header cell holds any block, drawn compact; typing into an empty one makes a plain block of that name.
- **A grid is allocation only**: no text labels and no records. Records are usages, or a table in a card's body.


## Reading through

- **Own values only.** A block stores what it says; the rest resolves on read.
- **Settings and traits walk the chain**: per link, its own settings, then its traits in order. Nearest wins.
- **Traits are inherited until stated.** A definition stating its own set replaces its chain's; resetting gives it back.
- **Structure does not walk.** A usage reads its type's own structure, one step; a subtype inherits no structure.
- **Parts keep their ids.** An edit to one goes home to the definition that owns it. Ports are data on a block: a usage wears its own and its definition's on its walls as `block/port`, and a run meets one there by `fromPort` or `toPort`.


## Tags and traits

| | Carried in | Says |
|---|---|---|
| **tag** | `tags` | a word to find it by, with its meaning in `description`. Any element; a new one is filed in the workspace's library |
| **trait** | `traits` | an engine function: a capability, or what sort of thing it is. One of the engine's fixed table (`TRAITS`), named, never a definition; it confers the settings the table grants it. Definitions only |

**Both lists replace**: stated, a list holds every entry kept; unsaid, the nearest list down the chain is carried whole; empty says none. There are no drops. **A look is settings, never a tag.**

**The tie trait** (*has tie*) links a block made from, or dropped on, another to it, on the same layer, by a relationship of the type it names. Made on its own, it links nothing. `note` lists it.


## Relationships

**A join between exactly two blocks**, on any layers. Its type is a relation definition: `line` when it names none, `tie` or any subtype when it does. `line.dir`, a setting inherited down its chain, says which way a line points. **Its name is its own `name`**, as a block's; unnamed, it draws its definition's. A tie is one by `line.module: tie`, which its *is tie* trait grants. **A definition and a usage never relate**, except by a tie; two definitions may — an association — and two usages may. **Its ends are data** (`ends`, and its definition's `def.ends`): multiplicity, role, ownership, navigable; a line says multiplicity and role only (core `ends.ts`).


## Capabilities

**`allows` is refused at the gesture; a constraint is only ever advice.** `allows` merges along the chain per key, nearest first; constraints are a list carried as tags are, each read down what it extends. **Absent is a no**: a block may hold, seat or take only what a trait or a setting grants. A capability naming a definition means it or anything below it. A chain ends at a base: a definition extending nothing reads through `block`.


## Marks

| Corner | Says |
|---|---|
| **card icon**, top right | what sort of thing this is, or `card.icon`. Filled when the block holds parts |
| **system mark**, bottom right | what the card stands for, at most three stacked: a stand-in's word (`Ref`, `Def`, `Pkg`), `structure` on the workspace and on a definition that holds structure — never a folder, another package, or a block inside a structure — `data` where it carries attributes or values. A stand-in wears its target's. Derived |
| **link mark** | a part seen through a usage: dimmed, with the link glyph, "from `D`" |


## Alias

A serial minted at creation and never rewritten, drawn as a short mark (`B7`, `G2`) beside the kind word a block reads as while nobody has named it.


## Source

**Provenance, not a link: one uri.** Nothing syncs to it; a within-part or a revision is the uri's own syntax.
