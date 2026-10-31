# Overview

**Draft, 2026-10-30: for agreement.** The overview is every element's first tray tab, lines included, with one layout for all. It explains why the picked thing matters in its context: the full answer the hover card only glances at. Nothing in it depends on the element's kind.


## Tray head

**The tray's head is the identity row**: chevron, colour edge (a line's swatch), name, kind, the role (a filled *definition* badge in its colour, or a quiet *use*), then the facts strip. It replaces the tray's old header and the overview's caption. Under 520 px the facts strip moves to its own line.


## Sections

| Section | Answers | Shows |
|---|---|---|
| **card** | *what does it say?* | its large face, as a diagram draws it, never shorter than a head and two rows, so a blank face lines up with a full one. A line's is the line drawn whole, its ends as a table |
| **picture** | *what helps most to see it?* | the first source that has something, below. *open* and *read* where it opens |
| **why it matters** | *what is it for?* | its own description, then its definition, kind, behaviour and tags |
| **how it is used** | *what does it do here?* | its lines in and out, by port, each with its swatch. A definition's uses in words |
| **where it lives** | *where is it, and who refers to it?* | path, what refers to it, or a definition's uses |
| **where it sits** | *in what order?* | its order in its room, with earlier and later |

| Picture source | Shows |
|---|---|
| **1 · what it gathers** | its own chip: a diagram's members, a definition's uses (its structure while unused), a folder's definitions |
| **2 · its place** | the chip of the room it sits in, its own tile lit; a line lights both its ends. Everything sits somewhere, so the picture is never empty |

- **every picture is a chip**, never a scaled drawing: it follows the chip's ladder, so it is legible at any tray size
- **lines are never a picture**: what joins an element is listed under *how it is used*
- **only its own answers**: nothing is borrowed from its definition
- **gaps are quiet filled rows, in the editor only**, never outlined: no description, an attribute its definition declares and it does not answer, a port with no line. mndmap hides them
- an empty plain block still offers the kinds it may become, under its picture


## Width

**Every tray tab reflows with the tray's width.**

| Tray width | Columns |
|---|---|
| under 560 px | one: card, picture, answers |
| 560 to 960 px | two: card and picture, then answers |
| over 960 px | three: card, picture, answers |


## Shared with the other forms

- the head and the facts strip are the same as a chip's and a card's
- the card is the card's own renderer, never a copy
- the picture is the map's own chip
