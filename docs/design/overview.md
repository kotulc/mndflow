# Overview

**Draft, 2026-10-30: for agreement.** The overview is every element's first tray tab, lines included, with one layout for all. It explains why the picked thing matters in its context: the full answer the hover card only glances at. Nothing in it depends on the element's kind.


## Tray head

**The tray's head is the identity row**: chevron, colour edge (a line's swatch), name, kind, the role (a filled *definition* badge in its colour, or a quiet *use*), then the facts strip. It replaces the tray's old header and the overview's caption. Under 520 px the facts strip moves to its own line.


## Sections

| Section | Answers | Shows |
|---|---|---|
| **card** | *what does it say?* | its large face, as a diagram draws it, never shorter than a head and two rows, so a blank face lines up with a full one. A line's is the line drawn whole, its ends as a table |
| **picture** | *where does it live?* | under the card, filling the column: the map itself, scaled whole, it lit. *open* and *read* where it opens |
| **path** | *where is it?* | heads the answers column: its path, its own name last (`base › blocks › block`) |
| **why it matters** | *what is it for?* | its own description, then its definition, kind, behaviour and tags |
| **how it is used** | *what does it do here?* | its lines in and out, by port, each with its swatch; what refers to it. A definition's uses in words |
| **where it sits** | *in what order?* | its order in its room, with earlier and later |
| **text** | *what does it say?* | a diagram's or document's own text, last in the answers column |

**The picture is where it lives**, and **the map itself** (2026-11-02, superseding the compact tree of 2026-11-01): the same structure as the map, so the two read as one.

- **the map at the card's width, in the room under the card** (2026-11-02), never laid again: never taller than that room, so the tray is never scrolled to it — where the map is taller, the window is centred on what is lit; boxes faintly outlined, chips on a faint ground, a name only where it fits whole and no other box covers it; its *open* and *read* in its top corner
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
