# Tray

**Draft, 2026-10-30: for agreement.** The tray presents everything about what is selected, focused and read first. Basic edits (a name, a description, a style, a setting) come second, on the card and settings tabs. Nothing is built here: parts and lines come from canvas gestures and agents. The overview's own rules are in overview.md.


## Head

**The tray's head is the identity row**: chevron, colour edge (a line's swatch), name, kind, then the **role**: a filled *definition* badge in its colour, or a quiet *use*. Then the facts strip. Under 520 px the facts strip takes its own line.


## Tabs

| Tab | For | Left | Right |
|---|---|---|---|
| **overview** | every element | card, then where it lives (overview.md) | its path, why it matters, how it is used |
| **components** | a part, or any element carrying members | its card, then its sections | its members, a section each |
| **contents** | what draws inside itself; a package; the workspace | its card, then its kinds (and *definitions* on a package or the workspace) | its holdings, one table; or its definitions. Its text is the overview's |
| **usages** | a definition | its card, then its place filters | its uses by place, its subtypes. A record's uses are its records, as a table |
| **card**, **settings** | how it draws; a line's card shows its ends | as today, to be rethought | |

- **the left column stays put** as tabs change; only the right changes
- **under the card**: the overview's where-it-lives map; on every other tab, that tab's filter rows


**One tab set for every element** (2026-10-31): overview · card · settings · components · usages · contents, always in this order. A tab that does not apply is drawn faint and inert, never hidden; it carries no tip (2026-10-31).

| Element | overview | card | settings | components | usages | contents |
|---|---|---|---|---|---|---|
| a use (a part, a diagram) | ● | ● | – | ● | – | ● where it draws inside |
| a definition | ● | ● | ● | ● | ● | ● where it draws inside |
| a line | ● | ● its ends | – | ● | – | – |
| a relation definition | ● | ● | ● | ● | ● | – |
| the workspace | ● | – | ● the display | ● what it draws on | – | ● everything, its definitions |
| a package | ● | – | – | ● its types, tags, interfaces, constraints | – | ● what it files, its definitions |
| a library entry (an interface, a tag, a type, a constraint) | – | ● | – | – | – | – |

- **components applies to everything**: empty, it says so in one sentence
- **a line's** old *line* tab is folded into *card*, which shows its ends
- **the workspace and a package are elements**, each scoped to what it holds; they draw no card. The library section and the models section both show the workspace; the library section opens on its contents, the *definitions* row chosen. A package row opens its package the same way; a registry opens its package on components, that kind chosen
- **the tray informs; editing is not its purpose.** Basic edits stay on the card and settings tabs until those are rethought
- **the json chip** (2026-10-31) stays at the tab bar's right end, faint where there is no record to read (a use). Contents' text moves to the overview's answers column, last, so contents is its table alone
- **card and settings keys** (2026-10-31) use the filter rows, the key's value at the right in place of a count; single-select, no *all* row. The chosen key's choices show on the right


## Sections

**Every section the element has is shown at once, and a section it lacks is absent.** No picker, no add rows, no gaps for what is missing.

- **a section's name** is set in the body's ink, semibold, with an **i** beside it whose tip says what the section is. It carries no count
- **every list opens on a band**: a label flush left, its count at the right, over a rule. Attributes band by where they are declared, ports by in and out, tags by family, behaviours as *own* or by where they come from, uses by place
- **one row, on shared columns**: mark, name, quiet kind, what it says at the right. A rule under every row. Columns line up across a section
- **hovering a row lights what it names on the card**: a face row, a seat, a behaviour
- **filters under the card** (2026-10-31): rows like the explorer's, local to the tab, single-select with an *all* row first. A filter is kept per tab while the element stays picked and resets to *all* when the element changes. Hovering a filter lights its members on the card and the canvas, as a list row does. Bands keep their counts beside the filters
- **one spacing for every tab** (2026-10-31): the same air round a tab, between its columns and between what stacks in one; **the card column is one width on every tab**, the card filling it, no caption over it
- **an element carrying nothing** shows its card at its least height, saying so, and one section on the right that says so in a sentence and where its members would come from


## Width

| Tray width | Columns |
|---|---|
| under 560 px | one: the card, its filter rows, then the list |
| 560 to 960 px | two: left and right |
| over 960 px | two, the right's sections in two columns, a wide list across both |
