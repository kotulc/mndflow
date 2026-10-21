# Options Rail

**The palette and the quick editor, in one column fixed to the right.** It never chooses a view: the canvas is one world, read in world or reading view (design.md *Perspectives*). A real column and not an overlay: the stage ends where the rail begins, so chrome never sits on the drawing.

**Its bar says its name** — *options*, centred, the same height as the explorer's bar and the tray's, so the three read as one line across the page. It wore a hamburger until that mark went to the explorer, where it opens the filter (ST.21).

## One surface whose contents vary

**The projection declares which groups it offers; the shell knows how to build each.** A group absent is a control that is not there, rather than one greyed out.

The groups arrive as `slots` on the Scene. The rail draws them in a fixed order whatever order it was handed:

```
palette · workspace · make · relations
```

| | Is |
|---|---|
| **`palette`** | the notation the focus's family draws with, dragged or clicked in: a flow `start`, `decision`, `end`; a state machine `start`, `end`; every room `note`, `label`, `group`, `region` |
| **`workspace`** | the workspace's name and the open package's name and description, edited in place; the tray's workspace tab holds the rest |
| **`make`** | *new usage* and *new definition*: a `create` in the focus, typed by the definition picked where there is one |
| **`relations`** | which relation types a right drag and a `chain` draw: *straight*, *directed*, *tie*, and the relation definitions the open packages hold. A relation definition's own settings are applied in the tray |

**Not here**: views (there are none to choose), a room's layout (the tray's card tab, a setting of that room) and display — frame, guides, ports, the key, the context mode — which is one workspace-wide setting on the tray's workspace tab.

## What a control is

| | Is |
|---|---|
| **glyph** | one mark, over the word rather than beside it — the word only costs width when it sits alongside |
| **word** | one word, always. A long one wraps rather than setting the column's width |
| **tip** | the sentence, so nothing is hidden behind a picture |
| **`on`** | lights it. **A verb leaves it undefined**, since there is no state a verb puts anything in |

**One glyph per control, lit or not.** A setting draws the same mark whichever way it is set, and `on` is the only thing that says which. Toggles wore a struck-through second glyph until that made two marks to learn for one control, and left the lighting saying nothing the picture had not already said.

**A verb never lights**, and that is the plainer signal of the two: the rule that toolbars divide states from verbs is carried by the group's own label and by the fact that nothing in a verb group is ever on.

## What it refuses to do

- **It writes no mutation.** Every control names an action and the app runs it.
- **It holds no state.** What is on comes down as props, so the rail cannot disagree with the stage.
- **It never collapses a group.** Twenty-odd controls against the height of a window makes overflow ordinary, and a collapsed group is hidden state.
- **It never greys anything out.** What does not apply is not drawn — greying is for a fixed row whose positions are worth learning.

## Still open

- **Whether the rail should scroll per group or as a column.** It scrolls as a column today.
- **Nothing exposes a grid's own controls.** Its extent is a dragged corner and its header lines and labels are a cell's menu; whether the rail should say anything about the grid you have hold of is undecided.

## The rules it lives by

- **Nothing picked is everything.**
