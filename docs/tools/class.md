# class

**Diagram tool.** What data definitions there are: their fields and references.

| | |
|---|---|
| **use case** | the library's view of data, the schemas ports carry (mndsite part 2: Config, Theme, Frontmatter, Facet, Group, Versioning, Display, Edit) |
| **takes** | definitions from `schema` |
| **writes** | a diagram file: each definition with its fields, derived fields marked, references as lines |
| **you decide** | how nested sections split into named definitions; which cross-checks read as references |
| **surface** | `mnd draw class <selection.json> <out>` |
| **open** | how a reference to a set of names (a group naming facets) is drawn |
