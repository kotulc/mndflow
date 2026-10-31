# Card

**Draft, 2026-10-29: for agreement.** A card is how a diagram draws a part: the element itself, carrying its own content, placed among its neighbours and joined by lines. It is the form you compose and edit with. On a treemap a part is a chip; only a chip's tiles are cards, at their smallest.


## Where a card is drawn

| Where | As | Levels |
|---|---|---|
| a diagram | its face, seated, joined by lines | 0–3 |
| a chip, as a member | a **tile**: name, icon, its colour edge | 0–2 |
| the tray | its face, large then small | 3 |


## Classes

**Three classes, worked out from what a card holds, never stored.** A card is a compound concept: what is simpler is a member of a card, never a card of its own.

| Class | A card that… | Its face | e.g. |
|---|---|---|---|
| **part** | holds no layer: the default | its members as a table: attributes, then behaviours by signature (a class card) or records | a service, a class, a record, a registry, a function |
| **diagram** | holds a layer | its chip | a system, a module, a detailed behaviour (flow, state, sequence) |
| **document** | has text and no members | its text | a README, a runbook |

- **definition is a role, not a class**: any class may be a definition, its template, or a use of one
- **members, never cards**: attributes (fields, variables, columns), value types (enums, aliases), ports (parameters in, return out), behaviours (methods, by signature on their owner's face; one with steps is also a diagram), tags and constraints
- **a part with behaviours draws as a class card**: its attributes, then its behaviours in the last section


## Purpose

| Question | How the card answers |
|---|---|
| *what is it?* | head: name, then kind (or its handle while unnamed), icon, marks |
| *what does it hold or say?* | its face: attributes table, fields and behaviours, body, picture |
| *what does it connect to?* | seats on its walls, and lines to other cards |
| *can I go in?* | a stacked edge, and its icon lit |


## Faces

| Face | Shows | Size |
|---|---|---|
| **small** | head: name, kind, icon, marks | the workspace's card size |
| **large** | name, then its face renderer: `table`, `class`, `document`, `picture`, `text` | fits its content, or the definition's `card.size`, capped by a preset |

- **unsaid, a card shows what it has**: large where it has more than a name, small where it does not. `layout.cards` forces either on a layer
- the face sets the card's size, and so the layout
- **a large face is never shorter than a head and two rows**, so blank and full faces line up
- **every face carries the facts strip** at level 2, as a chip does: one order, everywhere
- **seats hide when too small to read**; a line still meets the wall where its seat sits
- **a seat is one shape**: a square whose chevron points into the card for in and out of it for out. Off the card, an in mark leads its name and an out mark follows it


## Information by level

**Within its face, a card drops levels as it shrinks on screen,** by the ladder and the scale rules in language.md.

| Level | Small face | Large face |
|---|---|---|
| 0 mark | icon, colour | icon, colour, name kept larger as a label |
| 1 head | name, kind, icon | head row only |
| 2 facts | the kind on its own line where it did not fit beside the name, then the facts strip | head, then the facts strip |
| 3 preview | n/a | the full face |


## Form, by group

| Group | Frame |
|---|---|
| parts: blocks, usages, references | solid, filled |
| diagrams | as a part, with a stacked edge |
| holders: folder, grid, group, region | heading. A folder is solid neutral, a group is dashed, a region is a band |
| marks: start, end, decision | the shape alone |
| annotations: note, label | note on the document face, label on text alone |
| definitions | an outline with no ground, and a filled **definition** badge in its colour by its name |

