# Options Rail

**Every control the thing on the stage has, in one column fixed to the right.** A real column and not an overlay: the stage ends where the rail begins, so chrome never sits on the drawing.

## One surface whose contents vary

**A view module declares which groups it offers; the shell knows how to build each.** That is what keeps one set of controls rather than one per module — **a matrix has no interfaces toggle because it declares none**, never because one was greyed out.

The groups arrive as `slots` on the Scene. The rail draws them in a fixed order whatever order it was handed:

```
project · views · arrange · flow · interfaces · lines · columns · types · relations
```

**`relations` is last on purpose**: it is the only group that grows with the vocabulary, so it is the one to push off the bottom of a column that scrolls.

**`types` is the module's to fill.** A table filters by definition name and a matrix by relationship type, and only the module knows which — so a module declaring the slot also supplies the names.

## What a control is

| | Is |
|---|---|
| **glyph** | one mark, over the word rather than beside it — the word only costs width when it sits alongside |
| **word** | one word, always. A long one wraps rather than setting the column's width |
| **tip** | the sentence, so nothing is hidden behind a picture |
| **`on`** | lights it. **A verb leaves it undefined** — there is no arrangement a layer is currently *in* |

**A verb never lights**, and that is the plainer signal of the two: the rule that toolbars divide states from verbs is carried by the group's own label and by the fact that nothing in a verb group is ever on.

## What it refuses to do

- **It writes no mutation.** Every control names an action and the app runs it.
- **It holds no state.** What is on comes down as props, so the rail cannot disagree with the stage.
- **It never collapses a group.** Twenty-odd controls against the height of a window makes overflow ordinary, and a collapsed group is hidden state.
- **It never greys anything out.** What does not apply is not drawn — greying is for a fixed row whose positions are worth learning.

## Still open

- **`views` and `flow`** are in the draw order and nothing builds them yet.
- **Whether the rail should scroll per group or as a column.** It scrolls as a column today.

## The rules it lives by

**Every control the thing on the stage has is in one column, fixed to the right.** A real column, not an overlay: the stage ends where it begins, so chrome never sits on the drawing.

- **A view module declares which groups it offers** and the column draws them in a fixed order. A matrix has no interfaces toggle because it declares none, never because one was greyed out.
- **`types` is the one group the page cannot build alone**, so a module declaring it also answers it. **Nothing picked is everything.**
- **A verb never lights** — `arrange` has no state to be in, which is the plainer signal.
