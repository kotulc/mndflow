# Model

The object graph: **two element kinds**, blocks and relationships, and every other noun a block. Packages, definitions, holders and usages differ by a marker, a position or a type. Shapes are in schema.md; terms in definitions.md.


## Packages, definitions, usages

| | Is | Holds |
|---|---|---|
| **package** | a root block (`parent: null`) | its domain: holders and trees |
| **definition** | a block carrying `def`, in a domain | its structure |
| **usage** | a block without `def` | its own children; shows its type's structure through |
| **holder** | a folder, group or grid | whatever its place allows: definitions in a domain, usages in a structure |

- **A definition is a named tree.** It is used and extended by `type`, whether or not anything does, and is never itself placed or linked as an instance.
- **A usage may be a tree too**, placed straight in a domain. The structure section opens on any tree.
- **Frozen**: any package but the workspace's is read only. A definition from one is subtyped, never edited.
- **Removing a definition or a package that something uses is refused.** Nothing is rewritten to make way.


## Block modules and kinds

**A module is engine code; a kind is a definition.** Three modules, each read from a stored field:

| Module | Read from |
|---|---|
| `block` | nothing else said |
| `reference` | `of` is set |
| `interface` | `side` is set |

The `base` package ships the kinds: `block`, `folder`, `group`, `grid`, `reference`, `interface`, `note`, `tag`, and the relation kinds `line` and `tie`. **The set is minimal and enumerates what is functionally distinct**; anything else is a subtype. **There is no untyped block**: a block naming nothing is a `block`.


## Holders

**A holder holds by `parent`, as everything does.** What separates the three is how they draw what they hold.

| Holder | Draws its contents | Nests |
|---|---|---|
| **folder** | hidden: you descend to see them | yes |
| **group** | inline, inside its rim | yes |
| **grid** | in cells, each compact | any block may sit in a cell, a grid included |

- **Deleting a holder deletes its subtree.**
- **A grid's member always has a cell.** One that loses its cell (a line removed, a merge, a smaller extent) moves to the nearest spare cell on its side, else leaves the grid.
- **Headers are lines.** `head.top` heads the columns, `head.left` the rows. A header cell holds any block, drawn compact.


## Reading through

- **Own values only.** A block stores what it says; the rest resolves on read.
- **Settings and traits walk the chain**: per link, its own settings, then its traits in order. Nearest wins.
- **Traits are inherited until stated.** A definition stating its own set replaces its chain's; resetting gives it back.
- **Structure does not walk.** A usage reads its type's own structure, one step; a subtype inherits no structure.
- **Parts keep their ids.** An edit to one goes home to the definition that owns it. A run may name a part at either end (`fromPart`, `toPart`), and a usage wears its definition's interfaces on its walls.


## Tags and traits

| | Carried in | Says |
|---|---|---|
| **tag** | `tags` | a word, with its meaning in `body` |
| **trait** | `traits` | a tag carrying settings: a capability, added or removed as one |

**The tie trait** links a block made from, or dropped on, another to it, on the same layer, by a relationship of the type it names. Made on its own, it links nothing. `note` carries it, with resizable and body content.


## Relationships

**A join between exactly two blocks**, on any layers. Its type is a relation definition: `line` when it names none, `tie` or any subtype when it does. `dir` says which way a line points. **Definitions are never linked**, except by a tie trait.


## Capabilities

**`allows` is refused at the gesture; `expects` is only ever advice.** Both merge along the chain per key, nearest first. A capability naming a definition means it or anything below it.


## Marks

| Corner | Says |
|---|---|
| **card icon**, top right | what sort of thing this is, or `card.icon`. Filled when the block holds parts |
| **system mark**, bottom right | what the card stands in for: `Ref`, `Def`, `Pkg`, `Ext`. Derived |
| **link mark** | a part seen through a usage: dimmed, with the link glyph, "from `D`" |


## Alias

A serial minted at creation and never rewritten, drawn as a short mark (`B7`, `G2`) beside the kind word a block reads as while nobody has named it.


## Source

**Provenance, not a link: one uri.** Nothing syncs to it; a within-part or a revision is the uri's own syntax.
