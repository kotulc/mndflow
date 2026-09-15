# Context Tray

**One context, several tabs.** The tray is about one thing at a time — the context — and its head names it plainly: *workspace*, *block Tank*, *relation feeds*, *block definition Pump*, *new block definition*. The head never says how the context was reached. The chevron leads the head; expand sits far right.

## The context

**Whatever was picked last is the context.**

| gesture | context |
|---|---|
| pick one thing on the canvas | that thing |
| pick a row in contents or usages | that thing — the table keeps its tab and its listing |
| pick nothing, several things, or click the ground | the open layer — the workspace at the root |
| a settings toggle on the rail | the workspace, or a blank block or relation definition |
| a definition row in the explorer | that definition |
| a definition row in the definitions tab, with nothing picked | that definition |
| a definition row in the definitions tab, with something picked | nothing changes — the row lights and offers *apply to …* |

**A hold — the workspace, a definition or a draft — is given up by any pick of an element**, on the canvas or in a table. The explorer sets the layer; the canvas and the tables set the context within it.

## Hover and pick

**They differ in what is shown, not in how loudly.**

| | card | run |
|---|---|---|
| **hover** — a table row under the pointer | an accent outline | an accent stroke |
| **pick** | an accent border and a raised fill | an accent stroke and its grips |

A hovered row never becomes the context.

## Tabs

**A tab that cannot be answered is absent rather than empty.**

| context | tabs |
|---|---|
| workspace | settings · fields · contents · definitions · usages · packages — every block tab, plus packages |
| block, or block definition | settings · fields · contents · definitions · usages |
| relation, or relation definition | settings · definitions · usages |

**Contents are an instance's.** With a definition in context, the fields tab declares that definition's schema instead of values.

**The workspace is a block.** It takes the same settings panel as any block, styled for wherever an export is used, with its schema beside the card.

## Definitions

**A definition is a name and what it extends**; a relation definition also carries a `label`. A block or a line names one definition and draws through its chain.

| thing | is |
|---|---|
| **base** | a shipped kind — `base/block`, `base/line` and the rest. Extends nothing, and is never written, pinned or removed |
| **default** | the one editable definition per kind that every plain element of that kind follows — shown as `default/<kind>`. Extends its base; never renamed, removed or pinned, and may be re-typed within its kind |
| **label** | what a line naming a relation definition draws, **exactly as typed** — a stereotype such as `<<relates>>`. Its own and never inherited |
| **working look** | what a block or a line says about its own drawing while it names no workspace definition — named and kept with *save definition*, dropped by *reset style* |

- **Styling edits the definition where there is one.** A block or a line naming a workspace definition styles that definition, so every usage follows. One naming a default, a base or a package's definition — or already carrying a working look — styles itself.
- **Saving a working look makes a definition and moves the element onto it.** A line keeps the label it was drawing. **Saving never pins.**
- **Pinned offers a definition; it never makes or removes one.** A pinned relation definition is on the rail — a line definition only, since the rail offers no *tie*; a pinned block definition is in the explorer's *pinned* folder. Unpinned definitions live here, in the tray.
- **Removing dissolves.** Its looks go down into each usage, anything extending it extends what it extended, and it is unpinned.
- **A name is unique within its group.** A block definition and a relation definition may share one. A name already taken is said, never looked up.
- **Renaming keeps the id**, so every usage reads the new name and nothing is retyped.
- **Filed when first needed.** A default is laid by the fold until its first edit files it, so a workspace nobody customised writes nothing.
- **Ids are minted**, never a slug of the name, so renaming touches nothing but the name.

## Settings

**Two columns.** The left is what the thing *is* and holds every branch on which holder it was given; the right is how it is painted and is uniform over any holder. A block's body runs full width below both.

| holder | identity rows |
|---|---|
| workspace | name, id |
| block | name, tags, definition *(while it has a working look)*, type |
| block definition | name, type |
| relation definition | name, label, extends |
| a line | name, tags, label, extends |

- **The drawing sits at the column's start**, with its kind and how many usages name this exact definition beside it.
- **Tags are chips**, on a block or a line, with a box to add another. Never inherited.
- **Type is a dropdown**: the default, then every definition of the block's own kind. A block never changes kind. **Extends is always shown**, read-only for a base.
- ***Pinned* sits beside the card.** Bases and defaults offer none.
- **Reset style and save definition** sit at the far end of the tab strip, since they act on the whole tab.
- **A body is a block's** — the workspace's included, as its description — never a relationship's or a definition's. Committed when the box is left.

### Style groups

| group | rows |
|---|---|
| name | font, weight, contrast, align, handle — and *shown*, for a run only |
| label | display, font, weight, contrast, align |
| head | from head, to head — a run only |
| colour | family, pattern, hue, intensity, opacity |
| border | width, contrast, style — *stroke* on a run |
| icon | the mark in the top corner |

**A card always writes its name.** Its bottom-right corner is reserved for a system mark — see ST.19.

## Drafts

**A blank definition is filed when it is named.** Its id is minted up front, it is edited through the same actions as a real one, and it is kept through clicking away. Until something is picked, its extends shows `base/<kind>`. *Save definition* is only for a working look.

## Tables

**One table for contents, definitions, usages and packages.** They differ in rows and columns, which is data.

| part | behaviour |
|---|---|
| **scope** | *layer* or *workspace*, one choice shared by contents and usages and kept across tabs. The layer by default |
| **chips** | narrow what is listed; each group is one question and narrows on its own |
| **columns** | the data columns share the width evenly |
| **a cell** | a value, or a control: a box committed when left (Enter leaves, Escape gives it back, a clash is said beside it) or a pick. Every control fills its cell |
| **actions** | a row's chips and its remove, right-aligned in one action column reserved at a fixed width, so nothing reflows when they appear. Remove is offered on the picked row only |
| **the last row** | adds one, where a table can |

- **Hovering a row lights its element on the canvas**; picking it makes it the context.
- **No table scrolls on its own**; the tray body scrolls under the tabs.
- **Everything is derived.** The tray reads the graph and stores nothing but tab, scope, chips and drafts.

### Contents

- **Layer scope lists one level**: a container in context lists its own contents, anything else the open layer. **Workspace scope lists everything**, each row saying where it sits.
- **Chips narrow by what a row is.**
- **A column is a field in scope**, asked for by name, and its values are edited in the row.
- **A block is renamed in its row**; a line is named by its definition.
- **The picked row, when it is in another layer, offers *view***, which opens that layer and picks it there.

### Definitions

- **Every definition of the context's group the workspace can name**, the defaults first: name, label *(relations)*, extends, used. The shipped floor is left out; chips narrow to *labelled* and *packages*.
- **Name, label and extends are edited in the row**; a package's are not, and a default's name is not.
- **The last row adds one.**
- **With something picked, the lit row offers *apply to …***, which points the picked elements at it. Picking alone never changes a drawing.

### Usages

- **The lines, or the blocks**, by the context's group. Chips narrow by scope, by *line / tie* for lines, and by *any / the definition in context*.
- **Each row offers the definitions it may follow** — for a block, only its own kind's — and a line's row shows the label it draws.
- ***Retype all* points every listed usage at one definition**, in one step and one undo.
- **The picked row, when it is in another layer, offers *view***.

## Fields

- **A usage lists its whole schema**, answered or not, then values of its own.
- **Text is committed when the box is left**, never per keystroke.

## Two sizes

**Shut it is a bar; open it takes a quarter of the stage**, whatever it holds, so a row stays where it was last seen. Expand takes the full height. Nothing closes it but its own bar.

## Still open

- **Rules** — see ST.17.
- **Adding a field from the bar**, which the legacy app had.
