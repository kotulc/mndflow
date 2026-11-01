# Overview

**Draft, 2026-10-30: for agreement.** The overview is every element's first tray tab, lines included, with one layout for all. It explains why the picked thing matters in its context: the full answer the hover card only glances at. Nothing in it depends on the element's kind.


## Tray head

**The tray's head is the identity row**: chevron, colour edge (a line's swatch), name, kind, the role (a filled *definition* badge in its colour, or a quiet *use*), then the facts strip. It replaces the tray's old header and the overview's caption. Under 520 px the facts strip moves to its own line.


## Sections

| Section | Answers | Shows |
|---|---|---|
| **card** | *what does it say?* | its large face, as a diagram draws it, never shorter than a head and two rows, so a blank face lines up with a full one. A line's is the line drawn whole, its ends as a table |
| **picture** | *where does it live?* | under the card: its whole model or package as quiet nested boxes, below. *open* and *read* where it opens |
| **path** | *where is it?* | heads the answers column: its path, its own name last (`base › blocks › block`) |
| **why it matters** | *what is it for?* | its own description, then its definition, kind, behaviour and tags |
| **how it is used** | *what does it do here?* | its lines in and out, by port, each with its swatch; what refers to it. A definition's uses in words |
| **where it sits** | *in what order?* | its order in its room, with earlier and later |
| **text** | *what does it say?* | a diagram's or document's own text, last in the answers column |

**The picture is where it lives** (2026-10-31): the whole model or package it sits in, laid as the map lays it, sized by how many blocks each box holds. It repeats no chip; it only says *where*.

- **quiet**: outlines only, no fills, no faces. Only the top level is named
- **three levels** of boxes are drawn; deeper ones only along the path to the element, which is drawn firmer
- **the element is lit** in the accent; a line has no box, so both its ends are lit
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
- the picture is the map's own layout, never a second treemap
