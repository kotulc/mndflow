# Context Tray

**One context, three tabs.** The tray is about one thing at a time — the context — and its head names it: *workspace*, *block* or *relation*, then the name. The chevron leads the head; expand sits far right.

## The context

**The canvas decides it unless something else is held.**

| gesture | context |
|---|---|
| pick one thing on the canvas | that thing |
| pick nothing, several things, or click the ground | the open layer — the workspace at the root |
| a settings toggle on the rail | the workspace, or a blank block or relation definition |
| a definition row in the explorer or the templates tab | that definition |
| a row of the tray's own contents table | the context the table was listed under |

**A hold is given up by any canvas or explorer selection**, which is what puts the rail's toggle out. The explorer sets the layer; the canvas sets the context within it.

## Tabs

**The same three slots for every context**, and only the words change. A tab that cannot be answered is absent rather than empty.

| context | settings | declares | exists |
|---|---|---|---|
| workspace | name, id, what an export carries | packages | contents, every layer deep |
| block, or block definition | identity, style, body | fields | contents, one layer |
| relation, or template | **template**: identity, style, the templates table | **types** | **usages**: this layer's lines, or every line for the workspace |

## Lines: templates and types

**A type always extends a template**, and a line names one type.

| thing | is |
|---|---|
| **base template** | what the base type draws through — `default` when the app files it; extends nothing, and editing it changes every line not given another template |
| **base type** (*none*) | what a line naming nothing follows; it extends the base template, can be pointed at another, and is never removed |
| **template** | a look; extends a template — the base one where nothing else is said — never a type |
| **type** | a name; extends a template, the base one by default |
| **a line's own style** | a working template — named and kept with *save template*, dropped by reset style |

- **Filed when first needed.** The base template and base type stand in until the first edit to either, so a workspace nobody customised writes nothing.
- **Reset style on a line** drops its working look, and a template it names directly. A type it names stays — a type is a different property.
- **Save template** keeps a draft or a line's working look under its name, in the table. A name already taken is said, never looked up.
- **The base is read off the workspace, never an id**: whatever type plain lines follow, and the template it extends. A workspace that said it another way — a template made the default for lines — is put back into shape when it is opened.
- **A type is renamed in its row**, and every line naming it reads the new name; the id stays, so nothing has to be retyped.
- **Types are added in the last row of the types tab** before any line names them; each row changes the template it extends and can be removed, and the lists only ever offer templates. Lines are retyped on the usages tab.
- **The tray body scrolls under the tabs**; no table scrolls on its own.

## Settings

**Two columns and a body.** The left is what the thing *is* and holds every branch on which holder it was given; the right is how it is painted and is uniform over any holder. A block's body runs full width below both.

| holder | rows |
|---|---|
| workspace | name, id |
| block, or block definition | name, type, offer |
| template, or a line's template | name, extends, offer |

- **The drawing sits at the column's start**, with what kind it is and how many there are beside it.
- **Pick one, or name a new one**: a block's type box says what Enter would do before it is done.
- **Reset style and save** sit at the far end of the tab strip, since they act on the whole tab.
- **A draft's name is never a lookup**: a name already taken is said, and saving waits.
- **Every column is a head, a band, then rows**, each of a stated height, so the rows of both columns start on one line.
- **A body is a block's** — the workspace's included, as its description — never a relationship's or a definition's. Committed when the box is left.

## Drafts

**A blank definition is written before anything names it.** It is edited through the same actions as a real one, kept through clicking away, and saved with the tick beside *reset style* once it has a name nothing else holds. Saving is one step.

## Fields

- **A usage lists its whole schema**, answered or not, then values of its own.
- **A definition lists what it inherits**, read-only, then what it declares — name, form, unit, choices, default and order.
- **Text is committed when the box is left**, never per keystroke.

## Contents

- **Filter chips narrow by what a row is**; *types* is what the one thing picked resolves through, base first.
- **A column is a field in scope**, asked for by name.
- **Picking a row lights it and keeps the context.** The picked row, when it is in another layer, offers a *view* chip, which opens that layer and picks it there.
- **Everything is derived.** The tray reads the graph and stores nothing but tab, filter and drafts.

## Two sizes

**Shut it is a bar; open it takes a quarter of the stage**, whatever it holds, so a row stays where it was last seen. Expand takes the full height. Nothing closes it but its own bar.

## Still open

- **Rules** — see ST.17.
- **Adding a field from the bar**, which the legacy app had.
