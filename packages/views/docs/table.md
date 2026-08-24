# Table View

**Rows and no frame.** A layer read as a list — one row per thing it holds, and **a column per field the rows carry**.

```
project(graph, layer, config) → Scene
```

## The columns are what the rows say

**Nothing about a table is stored.** The columns are the union of the field names its rows carry, in the order they are first met, with `name` always first. Filling in a field on one block adds a column to every table that block appears in, and clearing the last one takes it away again.

**A table has rows**, so of the three composition jobs it takes the grouping and the order and drops the spacing.

## What it draws

| | Is | Marks |
|---|---|---|
| **the head** | one box per column | `header` |
| **a row** | the block itself, under the `name` column | whatever the block's marks are |
| **a cell** | one field of one row | `cell` |

**A row is the block**, so it carries the same marks it would as a card — a reference reads as a reference, a container as a container. That is what stops a table from being a second, quieter model.

## Hits

| Region | Answers as |
|---|---|
| a row | `box` — the block, so an action on it means what it means everywhere |
| a cell | `field` — **a table is where a value is edited**, so the cell has to be reachable on its own |
| a header | `field` — which is what a sort is asked for by |

## Chrome

**`columns` and `types`**, and nothing a plane offers. There is no arrangement to set and no interfaces to show.

**`types` is the module's to fill**: a table filters by definition name, and only the module knows which names are in play.

## Still open

- **Sort** is named in the chrome and not yet implemented.
- **Filters**, and the child scope or depth a table reads over — a table pointed at a folder should be able to show the blocks two levels down.
- **Editing a cell** writes `field`, which exists; the surface for it does not.
