# Context Tray

**One context, three tabs.** The tray is about one thing at a time — the context — and its head names it: *workspace*, *block* or *relation*, then the name. The chevron leads the head; expand sits far right.

## The context

**The canvas decides it unless something else is held.**

| gesture | context |
|---|---|
| pick one thing on the canvas | that thing |
| pick nothing, several things, or click the ground | the open layer — the workspace at the root |
| a settings toggle on the rail | the workspace, or a blank block or relation definition |
| a definition row in the explorer or the definitions tab | that definition |
| a row of the tray's own contents or usages table | the context the table was listed under |

**A hold is given up by any canvas or explorer selection**, which is what puts the rail's toggle out. The explorer sets the layer; the canvas sets the context within it.

## Tabs

**The same three slots for every context**, and only the words change. A tab that cannot be answered is absent rather than empty.

| context | settings | declares | exists |
|---|---|---|---|
| workspace | name, id, what an export carries | packages | contents, every layer deep |
| block, or block definition | identity, style, body | fields | contents, one layer |
| relation, or relation definition | identity, style | **definitions** | **usages** |

## Relation definitions

**One kind of thing: a name, an optional label, and what it extends.** A line names one definition and draws through its chain.

| thing | is |
|---|---|
| **base line** | what every line naming nothing follows — `default` when the app files it; extends nothing, may be renamed and labelled, and is never removed |
| **definition** | a look and a name; extends another definition — the base where nothing else is said |
| **label** | what a line naming the definition draws, **exactly as typed** — a stereotype such as `<<relates>>`. Its own and never inherited, so extending a definition and labelling it differently is how one look carries several names |
| **a line's own style** | a working definition — named and kept with *save definition*, dropped by reset style |

- **Filed when first needed.** The base line stands in until the first edit to it, so a workspace nobody customised writes nothing.
- **The base is read off the workspace, never an id**: whatever plain lines follow.
- **Saving a working definition moves the line onto it** and keeps the label the line was drawing, so saving never changes the words on the line.
- **Reset style on a line** drops its working look and keeps the definition it names.
- **A name is unique within its group.** A block definition and a relation definition may share one; two of one group may not. A name already taken is said, never looked up.
- **Renaming keeps the id**, so every line naming a definition reads the new name and nothing is retyped.
- **Removing keeps how lines draw**: its looks go down into each line, and anything extending it extends what it extended. The tray stays on definitions, holding the base.
- **An old file is put into shape when opened**: a base type standing in for plain lines is dropped, the definition it extended becomes the base, and each old type is labelled with its name.

## Settings

**Two columns.** The left is what the thing *is* and holds every branch on which holder it was given; the right is how it is painted and is uniform over any holder. A block's body runs full width below both.

| holder | rows |
|---|---|
| workspace | name, id |
| block, or block definition | name, type, offer |
| relation definition, or a line's | name, label, extends, offer |

- **The drawing sits at the column's start**, with what kind it is and how many there are beside it. A line's preview draws its label, as the canvas does.
- **Pick one, or name a new one**: a block's type box says what Enter would do before it is done.
- **Reset style and save** sit at the far end of the tab strip, since they act on the whole tab.
- **Offer** puts a relation definition on the rail, so a right drag can draw one; for a block definition it makes every plain one of its kind follow it.
- **With a line in context**, name and label describe the definition it follows, and editing them changes every line naming it. A line with a working look is named in the name row as that working definition, and its label is read-only.
- **A body is a block's** — the workspace's included, as its description — never a relationship's or a definition's. Committed when the box is left.

## Drafts

**A blank definition is written before anything names it.** It is edited through the same actions as a real one — name, label, extends and looks — kept through clicking away, and saved with the tick beside *reset style* once it has a name nothing in its group holds. Saving is one step, and the tray then holds what was saved.

## Tables

**One table for contents, definitions, usages and packages.** They differ in rows and columns, which is data.

| part | behaviour |
|---|---|
| **chips** | narrow what is listed; each group is one question and narrows on its own |
| **a cell** | a value, or a control: a box committed when left (Enter leaves, Escape gives it back, a clash is said beside it) or a pick. Every control fills its cell |
| **remove** | offered on the picked row only, so it is never one stray click |
| **the last row** | adds one, where a table can |

- **Picking a row lights it and keeps the context.**
- **No table scrolls on its own**; the tray body scrolls under the tabs.
- **Everything is derived.** The tray reads the graph and stores nothing but tab, chips and drafts.

### Contents

- **Chips narrow by what a row is**; *types* is what the one thing picked resolves through, base first.
- **A column is a field in scope**, asked for by name, and its values are edited in the row.
- **A block is renamed in its row**; a line is named by its definition.
- **The picked row, when it is in another layer, offers a *view* chip**, which opens that layer and picks it there.

### Definitions

- **Every relation definition the workspace made**, the base first: name, label, extends, used. The shipped floor is left out; chips narrow to *labelled* and *packages*.
- **Name, label and extends are edited in the row**; a package's are not. The base extends nothing.
- **The last row adds one**: a name, a label and what it extends.
- **Picking a row holds it**, so settings describes it. **With lines selected on the canvas, the picked row offers *apply***, which points them at it. Picking alone never changes a drawing.

### Usages

- **Chips narrow three ways**: *here / workspace*, *line / tie*, and *any / the held definition* — lines following it or anything extending it.
- **Each row offers the definition a line follows**, the base first, and shows the label it draws.
- ***Retype all* points every line the chips leave listed at one definition**, in one step and one undo.

## Fields

- **A usage lists its whole schema**, answered or not, then values of its own.
- **A definition lists what it inherits**, read-only, then what it declares — name, form, unit, choices, default and order.
- **Text is committed when the box is left**, never per keystroke.

## Two sizes

**Shut it is a bar; open it takes a quarter of the stage**, whatever it holds, so a row stays where it was last seen. Expand takes the full height. Nothing closes it but its own bar.

## Still open

- **Rules** — see ST.17.
- **Adding a field from the bar**, which the legacy app had.
