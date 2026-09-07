# Options Rail

**Every control the thing on the stage has, in one column fixed to the right.** A real column and not an overlay: the stage ends where the rail begins, so chrome never sits on the drawing.

## One surface whose contents vary

**The projection declares which groups it offers; the shell knows how to build each.** A group absent is a control that is not there, rather than one greyed out.

The groups arrive as `slots` on the Scene. The rail draws them in a fixed order whatever order it was handed:

```
layer · display · relations · element
```

| | Is |
|---|---|
| **`layer`** | how the layer places what it holds — `free` or `grid`. A setting, and the one group here that writes to the log |
| **`display`** | what the drawing shows rather than what it holds: the guides, whether interfaces draw. Nothing here enters the log |
| **`relations`** | which way a right drag draws a line, and the module a `chain` will use |
| **`element`** | what the one thing you have hold of can be told |

**`element` is not a slot.** A slot is what the projection can offer about the whole layer; this is about the one thing you have hold of, so it comes and goes with the selection and sits at the foot, below everything that is about what you are looking at. **Several picked is nothing picked here** — the rail says what *one* element is, and the answer for four of them is four answers.

**The element group leads with `define`**, which writes nothing: it opens the tray on the panel that already describes the thing. The rail keeps room for the two answers changed most — whether the name is written on it, and whether its place is fixed — and everything else it can be told is behind the cog.

**`relations` is last of the layer groups on purpose**: it is the only one that grows with the vocabulary, so it is the one to push off the bottom of a column that scrolls.

## What a control is

| | Is |
|---|---|
| **glyph** | one mark, over the word rather than beside it — the word only costs width when it sits alongside |
| **word** | one word, always. A long one wraps rather than setting the column's width |
| **tip** | the sentence, so nothing is hidden behind a picture |
| **`on`** | lights it. **A verb leaves it undefined**, since there is no state a verb puts anything in |

**A verb never lights**, and that is the plainer signal of the two: the rule that toolbars divide states from verbs is carried by the group's own label and by the fact that nothing in a verb group is ever on.

## What it refuses to do

- **It writes no mutation.** Every control names an action and the app runs it.
- **It holds no state.** What is on comes down as props, so the rail cannot disagree with the stage.
- **It never collapses a group.** Twenty-odd controls against the height of a window makes overflow ordinary, and a collapsed group is hidden state.
- **It never greys anything out.** What does not apply is not drawn — greying is for a fixed row whose positions are worth learning.

## Still open

- **Whether the rail should scroll per group or as a column.** It scrolls as a column today.
- **Nothing exposes a grid's own settings.** Its extent is a dragged corner and its headers are a card menu; whether the rail should say anything about the grid you have hold of is undecided.

## The rules it lives by

**Every control the thing on the stage has is in one column, fixed to the right.** A real column, not an overlay: the stage ends where it begins, so chrome never sits on the drawing.

- **The projection declares which groups it offers** and the column draws them in a fixed order. A group absent is a control that is not drawn, never one greyed out.
- **Nothing picked is everything.**
- **A verb never lights**, which is the plainer signal.
