# Options Rail

**Every control the thing on the stage has, in one column fixed to the right.** A real column and not an overlay: the stage ends where the rail begins, so chrome never sits on the drawing.

## One surface whose contents vary

**The projection declares which groups it offers; the shell knows how to build each.** A group absent is a control that is not there, rather than one greyed out.

The groups arrive as `slots` on the Scene. The rail draws them in a fixed order whatever order it was handed:

```
elements · layer · display · relations
```

| | Is |
|---|---|
| **`layer`** | how the layer places what it holds — `free` or `grid`. A setting, and the one group here that writes to the log |
| **`display`** | what the drawing shows rather than what it holds: the frame, the guides, whether interfaces draw. Nothing here enters the log |
| **`relations`** | what a right drag and a `chain` draw: *straight*, *directed*, or a pinned line definition. **No *tie*** — a tie is what its ends make |
| **`elements`** | which element the tray holds: the *workspace*, a blank *block* or a blank *relation* definition. Writes nothing |

**`elements` is not a slot, and it leads.** A slot is what the projection can offer about the whole layer; this points the tray at an element — its element tab — and a toggle is lit for whichever the tray holds.

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
- **Nothing exposes a grid's own controls.** Its extent is a dragged corner and its headers are a card menu; whether the rail should say anything about the grid you have hold of is undecided.

## The rules it lives by

**Every control the thing on the stage has is in one column, fixed to the right.** A real column, not an overlay: the stage ends where it begins, so chrome never sits on the drawing.

- **The projection declares which groups it offers** and the column draws them in a fixed order. A group absent is a control that is not drawn, never one greyed out.
- **Nothing picked is everything.**
- **A verb never lights**, which is the plainer signal.
