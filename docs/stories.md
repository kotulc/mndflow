# Stories

**A story is a goal somebody has.** It says what has to be *true for a person* before any of it counts. One story spans a lot of building.

**A story is finished only when it has been driven** — against the shipped samples, in both apps where both are touched. Work landing makes a story *closer*, never done, and a green suite never closes one.


## Understanding a system

### ST.22 — An existing system becomes a map

Point a translator at something that already exists — a folder of documents, a codebase, a hardware description — and **explore it as blocks**: its parts in layers, its sections sliced in the explorer, without modelling anything by hand. mndmap does this for markdown; code and hardware are next.

### ST.23 — Flows move

Open a layer and **see data and logic travel** along the relations that carry them, in their direction. A person understands what a system does by watching it, not by reading arrowheads.

### ST.24 — Going somewhere keeps your place

Opening, leaving and revealing **carry the eye** from one component to the related one rather than cutting to it, so a person always knows how they got where they are.

### ST.21 — Finding a thing beats knowing where it is

Type a few words into the explorer and **have what you are looking for come back ranked**, whatever it is and wherever it sits — a block three layers down, a definition a package brought, a note whose text you half remember.

**A filter, not a second tree.** It takes over the explorer's body while a term is in it and gives the tree straight back when it is cleared. Nothing is folded, revealed or selected by searching — finding is not going.

| | |
|---|---|
| **what it reads** | name, type and label, then body content. **Relevance is one order**, not four lists — a name match outranks a body match |
| **what a result is** | the element's icon and its name in bold, and under it the properties that matched, so a hit says *why* it is a hit |
| **what it spans** | blocks — holders among them — definitions and relations |

**Open:** whether relevance is scored or merely ordered; whether a result is picked, revealed or opened in the tray; and whether this is the terminal's `search`, which already fetches packages.

### ST.18 — A block holds the content it stands for

Open a block and **find the thing it stands for in its body**: a requirement's text, a script's code, a definition's data. A block stops being a box with a name on it and becomes somewhere work lives — travelling, exporting, undoing and searched like everything else it carries.

| | |
|---|---|
| **every block** | confining bodies to one kind forces a wrapper around everything worth documenting |
| **format is the definition's** | `Requirement` says markdown, `Script` says code. Not a new value form — `body` is a slot beside `fields` |
| **storage stays reversible** | the browser log stores each body once by hash; the graph and the file carry text, never a content id |

**Open:** whether a definition's data becomes editable in place; what a body's format is and who says so, the definition or the block.


## Agents and data

### ST.25 — An agent builds a map headless

An agent reads a system, writes the graph as JSON, checks it with the CLI and hands a person a file that opens in either app — **without a browser and without the app calling a model**.

### ST.5 — The workspace reaches outside itself

Pull a package or a file from a **public GitHub repo** and have it land as blocks you can use — **not as a file you then have to import by hand**.

### ST.6 — A model becomes something else

Translate a project out — **the site first**, then simulator, parametrics and code in an order nobody has set. **One way out, and it never writes back.**

### ST.7 — The terminal earns its place

One collapsible strip that says **where you are, what you just did, and what you could do next** — with **four commands**, flexible verbs, and **the whole action surface behind `?`**. Not a command palette and not a chat.


## Future stories

**Named so nothing is built against them by accident.**

| | What waits |
|---|---|
| **Allocation** | a grid's headers already derive what is allocated to each line. A story that *reads* allocation — a matrix, a trace, a report — gives it a consumer |
| **Behaviour** | a cell address is an order and a header is an allocation; nothing reads either as behaviour yet. Likely what drives ST.23 |
| **SysML round trip** | a `tie` goes out as `comment` and comes back as a `line`. Part of ST.6 |
| **A named package is checked** | reconciling what each package brought and what is in use against the catalogue |


## Loose ends

**Small, real, and with no story of their own.**

| | |
|---|---|
| **one tab pattern, half applied** | the `fields` tab is the pattern every editing tab should read as. **`Commit` is still private to `Fields.tsx`, and the add line is copied between `Fields.tsx` and `Packages.tsx`** |
| **the SVG export paints by kind** | `svg.ts` styles `.card.note` and `.route.tie` from a sheet it carries, where the canvas reads their definitions. The two disagree the moment a definition restyles a note |
| **a read-only listing still looks live** | without `onAct`, the definitions, packages and usages tabs draw their add and filter inputs and do nothing |
| **the class card sits under its usages** | the layout seats stand-ins after the blocks beside them. Putting the schema on top wants the layout to rank it first |
| **a long layer fits too small to read** | the camera fits the whole layer, so one tall column shrinks past reading. Fitting to width, or a floor on the zoom, would keep a card legible |
| **a diagram draws no instance lines** | nothing draws the *instance of* between a usage and its class card |
| **two rows lit for one diagram pick** | picking the class card holds its definition while the block the diagram was drawn for stays picked |


## Watch for

**Hazards, each paid for once already.**

| | |
|---|---|
| **key presence is not a type discriminator** | ask the graph which shape it is — which record holds the id, or what its definition says — never whether the object carries a field |
| **a holder is two things to most callers** | ask once whether a block draws its contents inline, never a pair of literal comparisons |
| **two names for one lattice** | `UNIT` is the measure and a `CELL` is a block plus its air. Nothing outside a grid is quantised to a cell |
| **two heads tables, on purpose** | `theme/heads.tsx` for React, `svg.ts` for the standalone export |
| **stop inventing words where a convention exists** | `allocation` proved it |
| **naming a base is naming nothing** | `stored_type` writes a structural base as plain. A maker that writes `type` directly skips it |
| **a name is not an id** | ask `def_named` within the package; ids are minted and never derived from a name |
| **the graph in hand is from before the act** | mint the id and pass it to the action rather than looking one up afterwards |
| **a batch folds between calls** | inside `session.batch` each action sees the one before it, and all of them undo as one |
| **a grid's member always sits in a cell** | anything that takes a cell away takes the block out of the grid with it — `put` in the grid actions says so once |
| **a control in a row stops the click** | every `Entry`, `Choice` and chip stops propagation, or the row is repicked under it |
| **a row pick keeps its listing** | `browse` holds the listing a row was picked from |
| **the draft is never listed** | tables read the graph without it |
| **the scope chip decides depth, nothing else** | only the *workspace* scope reads deep |
| **a door without `base` strips `type`** | anything checking a log or a file must pass the packages in use |
| **an app keeps its session across hot reload** | reload the page after a core change |
| **a table's widths ride on its cells** | the contents table is `table-layout: fixed`, so a column is as wide as its head cell says |
| **a style attribute has to reach the writing** | a look's attributes are read by descendant selectors, so a name floated outside the dressed element takes none of them |


## Out of scope

**Recorded so nothing is built on it.**

- **Search results as a view of their own.** Driven, and not useful: a second way of looking at blocks you can already see. Finding comes back as something the explorer does (ST.21).
- **Embedded bytes in a block** — an image or video carried inside the project. Inline means the log carries bytes, a durability and file-size decision nobody has taken.
- **Local variation for multi-user work.** For one user it is an extra step on the commonest path, so writes go straight home.
- **A live store for concurrent editing.** Files plus git give one owner at a time; collaboration wants a shared store and presence, and the file format is never bent toward pretending otherwise.
- **Two SysML losses**, accepted: trace assertions lose their bracket notation, and lifeline order is presentation living in the view.
- **Enhanced packages served from a private repo or a server.** That is a hosted component.
