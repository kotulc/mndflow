# mapping

**What goes in, where it lands, and what to know about it.** New kind (2026-11-13). Revised 2026-11-14: a generic records table. Agreed 2026-11-14.

## Purpose

| | |
|---|---|
| **answers** | what does this part read, what does it write from it, and what to know about each (a rule, a description, a docstring) |
| **draws** | the generic records table: one row per mapping (reads → writes, info), rows grouped by where they read from |
| **examples** | mndsite: *content → generated* (ingest, part 4), *fields* (metadata, part 5), *right sidebar* (page contents, part 10) |

## Utility

| | |
|---|---|
| **draw it** | a part that is a projection: many outputs each made from some input by a rule, in no order that matters (the mndsite review: a projection gets a mapping, a path gets a flow) |
| **skip it** | fewer than 3 rows (README *Sub diagrams*): the part's chip says it |
| **vs flow** | a flow has an order; a mapping has none, each row stands alone |
| **vs dataflow** | a dataflow follows one datum across parts; a mapping is one part's inputs to its outputs, field by field or file by file |
| **vs class** | class is a definition's shape; a mapping says how each field of it is filled |

## Surface

| | |
|---|---|
| **base** | `mapping`, extending `block`, *has records*: each row a record (reads, writes, info), drawn by the generic records table, the one a collection's card shows (design.md: records are values, never blocks); mapping adds only the arrow from reads to writes |
| **file** | its own file beside the part that does the mapping; rows under `records`, each written as a relation (`reads -> writes: info`), quoted whole or not. `reads` and `writes` name fields by qualified name (`PageMeta.desc`, `Config.edit`), opening their definition where they resolve; paths stay text |
| **lives** | offered from the part that does it, in its About band |
| **tool** | `mnd draw mapping <selection.json> <out>`, from `trace` (files) or `data --of` (fields) (docs/tools/mapping.md) |

```yaml
# metadata/fields.yaml
type: mapping
records:
  - Frontmatter.date -> PageMeta.published: "first 10 characters; '' if none"
  - Frontmatter.description -> PageMeta.desc: the first key with a value
  - Config.release -> PageMeta.facets.version: fills a missing stamp when inherit
  - body -> PageMeta.excerpt: "first prose paragraph, ≤ 280"
  - translate page -> PageMeta.name · url · slug: passed through
```

## Layout

**One generic records table**: any block with *has records* draws it; a mapping is one use.

| Case | How it is drawn |
|---|---|
| **a row** | the app's table look (a rule under every row): reads → writes, then info: a rule, a description or a docstring |
| **colour** | each row's left accent is the colour of the definition its first column names, as seats and forms are coloured |
| **groups** | rows grouped by that source, each group opened by a heading with no accent, so the break between groups reads at a glance |
| **links** | a qualified name (`PageMeta.desc`) opens its definition's card; paths stay text |
| **many rows** | past a default (12), groups fold to their heading and a count, opened by a click; a row repeated per item is written once with *each* (`each folder`) |
| **columns** (2026-11-21) | each as wide as its longest text, within a floor and a ceiling; a longer text wraps in its cell, never cut. A group whose heading only repeats its one row's first cell wears none |
| **portrait** | a row wraps: reads → writes on one line, info under it |

## Agreed 2026-11-14

| # | Decision |
|---|---|
| 1 | one generic records table (any block with *has records*): accent by the definition the first column names, names link to their definitions; a mapping is that table with reads → writes and info. General |
| 2 | colour on rows only, by the definition read from; group headings carry none; no rule-kind word (info says it) |
| 3 | rows grouped by source; past 12 rows groups fold to a heading and count; a repeated row written once with *each* |
| 4 | reads and writes are qualified names opening their definition; paths stay text |
| 5 | offered from the doing part's About band |
