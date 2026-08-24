# Matrix View

**Two axes, and the relationships between them.** A layer read as a grid: what here relates to what else here.

```
project(graph, layer, config) → Scene
```

## The axes

**A view holds views**, so a matrix's two axes are child views — which is what makes a filter or a third dimension cost nothing new.

**A layer that names none is read against itself**, which is the common case and what is built today. Both axes are the layer's children, in the order the layer holds them.

## The cells

**Nothing about a cell is stored.** A cell is filled where a relationship already runs between the two things its row and column name, so drawing one is reading the graph rather than keeping a second copy of it.

- **Undirected, both ways round.** A matrix cell says *related*, not *which way* — a directed relationship fills both its cells.
- **Ends resolve through the owner**, so a relationship seated on an interface fills the cell of the card that interface sits on.
- **A filled cell says the relationship's type** where it names one, and a mark where it does not.

## Column labels are turned

**A cell is as wide as a mark needs to be, and a name is not.** So the axis that has to fit sideways is read sideways: a column header carries the `turned` mark and the renderer rotates it. Row labels are ordinary.

## Hits

| Region | Answers as |
|---|---|
| an axis label | `box` — the block it names, because **everything a view shows is a reference**, an axis label alike |
| a cell | `field` — relating the two things it names is what a click on one is asking for |

## Chrome

**`types` and `relations`**, and no arrangement — a matrix has no placement to set.

**A matrix has no interfaces toggle because it declares none**, never because one was greyed out. That is the whole reason a module declares its slots rather than the shell guessing them.

## Still open

- **The two axes as child views.** Built today as the layer against itself; the design is two references the matrix holds, each a view of its own.
- **Filling a cell** should `relate` the two blocks it names. The hit is emitted and nothing consumes it yet.
- **Which relationship types count**, which is what the `types` slot is for.
