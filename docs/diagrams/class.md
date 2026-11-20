# class

**Types kind. What data definitions there are: their fields and how they hold each other.** Agreed 2026-11-15.

## Purpose

| | |
|---|---|
| **answers** | what shape is this data, and which definitions does it hold or name |
| **draws** | one definition card each (the agreed face: head with the *definition* badge, then type · name · value rows; behaviours after, by signature), lines where a field holds another definition |
| **examples** | mndsite: Config (+7 sections), PageMeta (+3); the shop: *Model* (Customer, Order, Line, Product, Payment) |

## Utility

| | |
|---|---|
| **draw it** | a datum with sections, or records that hold each other; offered from the datum band of a dataflow and the part's About band |
| **skip it** | one definition with no field typed by another: its card says it |
| **vs entity** | class is the shape in code (fields, behaviours, what holds what); entity is how it is stored (columns, keys, crow's feet) |
| **vs dataflow** | a dataflow is the datum's life; class is its shape. The datum band's card is the same card |
| **vs mapping** | a mapping says how each field is filled; class says what the fields are |

## Surface

| | |
|---|---|
| **base** | `class`, extending `block`: view `class`; its blocks are references to definitions; lines are worked out from fields, never written |
| **file** | in the model, under the use that owns the data (a definition holds no diagrams): its blocks references to definitions by the kind, written bare. May share a file with the entity diagram of the same definitions, each named |
| **tool** | `mnd draw class <selection.json> <out>`, from `schema` (docs/tools/class.md) |

```yaml
# configuration/Config types.yaml (beside the Config dataflow; a class and an entity diagram may share a file)
type: class
blocks: [Config, Theme, Frontmatter, Versioning, Display, Edit, Facet, Group]
```

## Layout

| Case | How it is drawn |
|---|---|
| **a card** | the definition card face; a derived field's value says its source (`⟵ git tag`); a choice type draws no card, its field names it and hover lists its choices |
| **a field holding a definition** | a line from that field's row to the held card's head; a filled diamond at the owner's row, `*` at the far end where it holds many |
| **a field naming a definition** (by name or key) | no line: its type is a link in the definition's colour, its value says `by name`; hover lights the target card |
| **order** | owners first along the canvas's long side, each owner's held cards in field order beside it, so row lines never cross |
| **nested sections** | a section becomes its own definition at 3 fields or more, or when another definition names it; else a field typed `map` |
| **a form dropping fields** | its own definition (`site.config`), joined to its source by a dependency line named for what it drops (`all but paths`); no `without:`, as design.md allows no drops |

## Agreed 2026-11-15

| # | Decision |
|---|---|
| 1 | the card is the agreed definition card face; derived values name their source |
| 2 | lines only where a field holds a definition; a field naming one is a link, not a line |
| 3 | a line leaves the field's row, not the card's middle (general) |
| 4 | owners first along the canvas's long side (revises *owners above*) |
| 5 | a nested section is its own definition at 3 fields or when named elsewhere; else a field typed `map` |
| 6 | a form dropping fields is its own definition, a dependency line to its source named for what it drops |

The user's priority (2026-11-15): reproduce this picture reliably and generally, above all the hierarchical breakout and the lines from each row.
