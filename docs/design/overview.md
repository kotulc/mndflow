# Overview

**Built 2026-11-22 (reworked with the user).** The overview is every element's first tray tab — a block, a definition, a model, a diagram, a line, a package, the workspace — with **one layout for all**. **While a presentation plays, its answers column is the stop** (presentations.md *The player*); its card and picture stay. It explains why the picked thing matters in its context: the full answer the hover card only glances at.


## Tray head

**The tray's head is the identity row**: chevron, colour edge (a line's swatch), name, kind, the role (a filled *definition* badge in its colour, or a quiet *use*), then the facts strip. It replaces the tray's old header and the overview's caption. **One line in every tray** (2026-11-22): under 520 px the facts give way at the right rather than wrapping, so the tabs never move as the pick changes; narrow, every tab still fits its strip.


## Sections

**The lead column**: the card, then the picture. **The answers column, always in this order**; a section with nothing to say is left out.

| Section | Answers | Shows |
|---|---|---|
| **card** | *what does it say?* | its face as the canvas draws it; a large face taller than 200 px is drawn small (a definition's long attribute table). A line's is the line drawn whole. The workspace has none: its picture is its card |
| **picture** | *where does it live?* | under the card: the map itself, it lit. One column: 132 px high for every element; past one column, the room the card leaves |
| **path** | *where is it?* | heads the answers column: its path, its own name last (`base › blocks › block`); a line's, its ends |
| **description** | *what is it for?* | **first after the path, for every element** (the user, 2026-11-22): its own description, else its definition's read through, quieter; then its definition, kind, behaviour and tags as chips; what an empty block may become. A line's: its type and tags. The workspace's: its name, its description (what the system is, what it does, for whom) and tags, editable |
| **what it holds** | *what is it made of?* | its parts, in order, as chips |
| **how it is used** | *what does it do here?* | its lines in and out, by port, each with its swatch; the sides it is seen on; the way across (*read its uses*, *view the model*). A definition's uses, place by place, as a list. A line's two ends |
| **where it sits** | *in what order?* | its order in its room, with earlier and later (editor only) |
| **text** | *what does it say?* | the own text of what opens onto a view, or of a document, last |

**Sections never fold and are never ruled off** (the user, 2026-11-22, reversing the folds of the same day): they stand apart by space alone.

**The overview's rhythm** (the user, 2026-11-22: room before density): sections 22 px apart; 12 px from a name to its body; names 13 px semibold; reading text 13 px with open leading; list rows 28 px, one soft rule a row and none under the last; a section's *i* only under the pointer; past one column the answers keep a 720 px measure. **Every tab takes it** (the user, 2026-11-22): sections, lists, key rows and tables alike, the choices column standing off the card column by a rule.

**No buttons to open** (2026-11-22): opening is a double-click on the canvas or the explorer.

**The picture is where it lives**, and **the map itself** (2026-11-02, superseding the compact tree of 2026-11-01): the same structure as the map, so the two read as one.

- **the map at the card's width, in the room under the card** (2026-11-02), never laid again: never taller than that room, so the tray is never scrolled to it — where the map is taller, the window is centred on what is lit; boxes faintly outlined, chips on a faint ground, a name only where it fits whole and no other box covers it
- **subtle and compact**: a glance, quieter than the map — **one look on every mini map** (2026-11-04): the element a subtle accent outline, a box lit as a frame only; never a path, its legs or its numbers, which belong to the canvas
- **the element is lit**, never named: its card just above says what it is; a block the map does not draw lights the nearest one above it that it does; a line lights both its ends
- **a scope's card is its own region of the map**: the workspace's the whole map (models while any exist, else the library), in the room under it in place of a picture; a package's its own region, its picture the whole map with it lit
- **overview only**: the other tabs keep their filter rows under the card
- **lines are never drawn in it**: what joins an element is listed under *how it is used*
- **only its own answers**: nothing is borrowed from its definition
- **gaps are quiet filled rows, in the editor only**, never outlined: no description, an attribute its definition declares and it does not answer, a port with no line. mndmap hides them
- an empty plain block still offers the kinds it may become, under its picture


## Width

**Every tray tab reflows with the tray's width.**

| Tray width | Columns |
|---|---|
| under 560 px | one: card, picture, answers |
| 560 to 960 px | two: card and picture, then answers |
| over 960 px | two: card and picture, then answers |


## Shared with the other forms

- the head and the facts strip are the same as a chip's and a card's
- the card is the card's own renderer, never a copy
- the picture is the map itself, scaled whole, drawn plain
