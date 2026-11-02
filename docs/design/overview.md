# Overview

**Draft, 2026-10-30: for agreement.** The overview is every element's first tray tab, lines included, with one layout for all. It explains why the picked thing matters in its context: the full answer the hover card only glances at. Nothing in it depends on the element's kind.


## Tray head

**The tray's head is the identity row**: chevron, colour edge (a line's swatch), name, kind, the role (a filled *definition* badge in its colour, or a quiet *use*), then the facts strip. It replaces the tray's old header and the overview's caption. Under 520 px the facts strip moves to its own line.


## Sections

| Section | Answers | Shows |
|---|---|---|
| **card** | *what does it say?* | its large face, as a diagram draws it, never shorter than a head and two rows, so a blank face lines up with a full one. A line's is the line drawn whole, its ends as a table |
| **picture** | *where does it live?* | under the card, filling the column: a compact tree of the major block holding it, its room opened, it lit. *open* and *read* where it opens |
| **path** | *where is it?* | heads the answers column: its path, its own name last (`base › blocks › block`) |
| **why it matters** | *what is it for?* | its own description, then its definition, kind, behaviour and tags |
| **how it is used** | *what does it do here?* | its lines in and out, by port, each with its swatch; what refers to it. A definition's uses in words |
| **where it sits** | *in what order?* | its order in its room, with earlier and later |
| **text** | *what does it say?* | a diagram's or document's own text, last in the answers column |

**The picture is where it lives** (2026-11-01, mockup *where-map* K, its strip dropped): where the element sits, and what is round it.

- **the major block**: the library or models map's second level holding the element (a level of one box passed through), drawn as a **compact tree**, a nested treemap filling the panel, each box titled over what it holds, every box and chip outlined, never filled. Where the room is itself the major block, the top box above it
- **the room** — the box or chip the element sits in — is opened to its own blocks (a diagram chip's tiles) and ringed; **the element is lit** and named, inside its box where the name fits, else on a tag beside it
- **a top block** (a package, a top-level part) gets the whole map; **a line** lights both its ends, the panel opening the deepest box holding both; a block the map does not draw lights the nearest one above it that it does (a pattern's part, its pattern)
- **one shape everywhere**: re-laid to fill the column under the card, each block weighing the square root of its room on the map, so a sparse project and a busy one read alike; the path heading the answers names the levels above it
- **plain**: no icons, counts or faces; a name only where it fits whole
- **a scope's card is its map as one compact tree**: the workspace's the whole map (models while any exist, else the library), filling the column in place of a picture; a package's its own folders and definitions, its picture the whole map with it lit
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
- the picture is the map's own boxes and weights, re-laid as a compact tree to fill its column, drawn plain
