# Tray

**Draft, 2026-10-30: for agreement.** The tray presents everything about what is selected, focused and read first. Basic edits (a name, a description, a style, a setting) come second, on the card and settings tabs. Nothing is built here: parts and lines come from canvas gestures and agents. The overview's own rules are in overview.md.


## Head

**The tray's head is the identity row**: chevron, colour edge (a line's swatch), name, kind, then the **role**: a filled *definition* badge in its colour, or a quiet *use*. Then the facts strip. Under 520 px the facts strip takes its own line.


## Tabs

| Tab | For | Left | Right |
|---|---|---|---|
| **overview** | every element | card, then picture | why it matters, how it is used, where it lives |
| **components** | a part, or any element carrying members | its card | its members, a section each |
| **contents** | a diagram | as today | blocks by region, lines by type, notation. Its text moves to the overview |
| **usages** | a definition | its card, then its chip of uses | its uses by place, its subtypes. A record's uses are its records, as a table |
| **card**, **settings** | how it draws; a line's settings hold its keys and ends | as today, to be rethought | |

- **the left column stays put** as tabs change; only the right changes
- **a chip shows only where it is the list drawn**: a definition's uses, a diagram's contents. Never for context alone


| Context | Tabs |
|---|---|
| block | overview · card · components · contents |
| definition | overview · card · settings · components · usages |
| line | overview · settings · components |
| relation definition | overview · line · settings · components · usages |
| workspace, definitions folder, packages, registry, entry | its own tab, as a head and banded lists |

- **the tray informs; editing is not its purpose.** Basic edits stay on the card and settings tabs until those are rethought
- **the json chip stays** on every element, for now


## Sections

**Every section the element has is shown at once, and a section it lacks is absent.** No picker, no add rows, no gaps for what is missing.

- **a section's name** is set in the body's ink, semibold, with an **i** beside it whose tip says what the section is. It carries no count
- **every list opens on a band**: a label flush left, its count at the right, over a rule. Attributes band by where they are declared, ports by in and out, tags by family, behaviours as *own* or by where they come from, uses by place
- **one row, on shared columns**: mark, name, quiet kind, what it says at the right. A rule under every row. Columns line up across a section
- **hovering a row lights what it names on the card**: a face row, a seat, a behaviour, a tile in a chip
- **an element carrying nothing** shows its card at its least height, saying so, and one section on the right that says so in a sentence and where its members would come from


## Width

| Tray width | Columns |
|---|---|
| under 560 px | one: the left column, then the right |
| 560 to 960 px | two: left and right |
| over 960 px | two, the right's sections in two columns, a wide list across both |
