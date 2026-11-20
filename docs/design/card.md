# Card

A card is how a diagram draws a part: the element itself, carrying its own content, placed among its neighbours and joined by lines. It is the form you compose and edit with. On the tree view a part is a chip (chip.md), sharing the card's header.


## Where a card is drawn

| Where | As |
|---|---|
| a diagram | its face, seated, joined by lines |
| a chip's well | a quiet cell of the chip's treemap, named where it has room (chip.md) |
| the tray | its face, large then small |


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
| *what is it?* | the header: name, its meta line, its kind's icon |
| *what does it hold or say?* | its face: attributes table, fields and behaviours, body, picture |
| *what does it connect to?* | seats on its walls, and lines to other cards |
| *can I go in?* | a stacked edge, and its icon lit |


## Faces

| Face | Shows | Size |
|---|---|---|
| **small** | head: name, kind, icon, marks | the workspace's card size |
| **large** | name, then its face renderer: `table`, `class`, `document`, `picture`, `text` | fits its content, or the definition's `card.size`, capped by a preset |

- **unsaid, a card shows what it has**: large where it has more than a name, small where it does not. a kind's `diagram.cards` forces either
- the face sets the card's size, and so the layout
- **a large face is never shorter than a head and two rows**, so blank and full faces line up
- **a seat is one shape**: a square whose chevron points into the card for in and out of it for out. **A typed seat is filled with its type's colour, semi-transparent, and outlined in it; a base seat (`interface`) is hollow** (2026-11-14). Off the card, in a list, an in mark leads its name and an out mark follows it; never in a facts strip


## The header (agreed 2026-11-16, shared with chips one-to-one)

**Cards and chips share one header**; below it a card shows its face (table, body), a chip its well. Built 2026-11-16 (theme `header.tsx`).

| Part | Rule |
|---|---|
| **icon** | the kind's square icon (theme `icons.tsx` `role_*`), top right, as tall as the name and meta lines together, scaling with the name; lit where the card holds parts |
| **name** | one line, takes the width the icon leaves; **a small card grows in whole units to fit it**, up to twice a block's width, and cuts it short with … only past that (2026-11-17); a grid's cell and a shaped card keep the block's size |
| **meta line** | kind · ▶ presentations · counts · attributes · seats in/out · tags (the facts strip folds in here), flowing into the width left; an item that does not fit drops whole, last first; a definition's badge is a tag here; **never repeats the face**: attributes the table lists, or seats drawn on the walls, are left out (2026-11-16) |
| **always two lines** (2026-11-16) | name over meta on every card, even a small face; the head grows from ~20px to ~34px and the layout makes room |

**One look at every zoom** (2026-11-15): a card shows its name, meta, table and body at every zoom, its text never held larger than laid; zoom only fades its detail. No levels.


## Form, by group

| Group | Frame |
|---|---|
| parts: blocks, usages, references | solid, filled |
| diagrams | as a part, with a stacked edge |
| holders: folder, grid, group, region | heading. A folder is solid neutral, a group is dashed, a region is a band |
| marks: start, end, decision | the shape alone |
| annotations: note, label | note on the document face, label on text alone |
| definitions | an outline with no ground, and a filled **definition** badge in its colour by its name |

