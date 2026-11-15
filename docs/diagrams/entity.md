# entity

**Types kind. How data is stored.** Drawn by hand: no tool yet. Agreed 2026-11-15.

## Purpose

| | |
|---|---|
| **answers** | what is stored, under which keys, and how stored rows point at each other |
| **draws** | one definition card each as a table (type · column · key), foreign keys as lines from the key row to the key it points at, crow's feet for many, a bar for one |
| **example** | the shop: *Schema* (samples/example/overview/shop/data/2-schema.yaml), the same records as *Model* |

## Utility

| | |
|---|---|
| **draw it** | data kept in a store with keys: a database, an ORM's models, migrations, a JSON store whose records name each other by id |
| **skip it** | data that lives in memory or in files read whole: class says it |
| **vs class** | class is the shape in code: nesting, what holds what, behaviours. Entity is the stored shape: flat rows, keys, and which side of a relation keeps the key. One set of definitions, two projections (design.md) |
| **the test** | does it matter which table keeps the key? If not, draw a class |

**Why mndsite had none**: it stores nothing with keys. Its data is a YAML file read whole (Config), Markdown files, and one generated JSON list (`site-meta.json`, a flat list of PageMeta read whole by the site). Nothing joins rows by key. A case would be any app with a database or an ORM; this repo's own workspace file (blocks and relations by id) may be one.

## Surface

| | |
|---|---|
| **base** | `entity`, extending `block`: view `er`; its blocks are references to definitions; keys and lines are worked out from fields, never written |
| **file** | its own file beside the class diagram of the same definitions: a reference per definition drawn |
| **tool** | none until a case appears; a later one would read an ORM's models or SQL through `schema` |

```yaml
# shop/data/2-schema.yaml
name: Schema
type: entity
blocks:
  - {type: reference, of: Customer}
  - {type: reference, of: Order}
  - {type: reference, of: Line}
  - {type: reference, of: Product}
  - {type: reference, of: Payment}
```

## Layout

**Class's layout, with both ends of a line on a row.**

| Case | How it is drawn |
|---|---|
| **a card** | the definition card face as a table: type · column · key (`PK`, `FK`, `PK · FK`, `null` for optional); no behaviours |
| **a foreign key** | a line from the key's row to the row of the key it points at; crow's feet at the many end, a bar at the one end |
| **a key worked out** | a field holding many (`Order.lines`) is stored on the held side: the held card gets the foreign key (`Line.order`), its row washed to say it is worked out, never written |
| **order** | what is pointed at first along the canvas's long side, as class's owners first; rows in field order, so lines do not cross |
| **a composite key** | each of its columns says `PK · FK` |
| **choice types** | a column typed by a choice draws no card, as in class |

## Agreed 2026-11-15

| # | Decision |
|---|---|
| 1 | the card is the definition card face as a table: type · column · key |
| 2 | lines row to row, from the foreign key to the key it points at; crow's feet for many, a bar for one |
| 3 | a field holding many puts its foreign key on the held side, its row washed as worked out |
| 4 | what is pointed at first along the long side |
| 5 | no tool yet; the tools pass finds a use case (README *Kinds drawn by hand*) |
