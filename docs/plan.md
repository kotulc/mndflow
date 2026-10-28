# Plan

**What is left to do, in order.** Built work is not kept here. The map's look and the model's rules are design.md; where a rule's code lives is code-homes.md. An item plan in `docs/plans/` opens with what is changing and why, then the steps.

One question is open (*Decide*). Deferred and future work lives in backlog.md, out of this plan. *Edges* is taken when a step passes near one.


## Where it stands

**The library and the models are built** (2026-10-26): two maps under one navigation, a model a definition of kind `model`, one highlight rule, lines revealed from their registry. **Order is built**: bands, relations and library lists follow the list; `order:` in a source is never a place. **Groups are tags**: a group holds nothing, its members say `groups:`; its panel is an ELK compound where membership is a tree in one container, else its members' bounds. **Drag reorders or files, never places**. **The rest of the plan is built** (2026-10-27): sequence participants are cards, type lists scoped by family, holder handles, model joins (*seen on*), answers under `values:`, short treemap tiles fall back to their small face, dead code and the leftover scale gone, the simplification leads taken (code-homes.md). Routing is left as it is.


## Placement

An entered layer is placed by ELK, one layer at a time. A folder is laid out on its own, inside out: `layered` where lines join what it holds (both directions tried), packed toward the canvas's shape where none do. A group is a panel: an ELK compound of its members where membership is a tree inside one container, else drawn round wherever they land. A layer with regions is banded in list order: each region a band, and a run of blocks in no region a band between them. Across (regions as columns) and down (as rows) are both tried; the one nearer the canvas's shape is kept. A region no line meets is packed as one unit, in its list place. Each band spans the layer across the flow, a unit from the next. Lines inside a container are ELK's; lines across the layer are routed live by libavoid. A line with points of its own (a sequence message, a lifeline) is drawn as given. A sequence's header row is a cell tall, each participant a card over its strip.

ELK is asynchronous: the last drawing stays, read only, until the next layer answers. It writes into its input, so tries that run side by side each keep their own copy of children and edges. Bands use `GREEDY` cycle breaking: `MODEL_ORDER` turns back every line pointing against file order, not only loops.


## Decide

| Question | |
|---|---|
| **usage settings** | design.md disagrees with itself: *styles are settings* lets a usage override its definition's `style` and `card`, and the colour and large-face samples do; the tray says a usage has no settings tab, since it cannot change them. The tab is gone. Either drop `settings` on a usage (and move those samples' looks onto definitions), or keep usage overrides and say so in the tray rule |


## Settled

| Rule | |
|---|---|
| **colour** | a package sets it. Off the canvas a definition is outlined. *Has values* stays off a folder and a group |
| **a region** | made from a menu. A diagram dropped into one does not draw open. The rail is deferred |
| **routing** | libavoid stays. A line may cross a later band. A line into a group does not reshape the group |
| **a reference** | `resolved` moves to core: the block it stands for, or that the name points at nothing |
| **a note** | its own block. A tie joins it to any number of blocks. `note:` in a file is shorthand for that |
| **a sequence** | a diagram. A table is a card face. Participants are cards, header strips behind them |
| **the map** | a treemap per section; the models' a forest of every loaded package's models. A package is a box of what it holds, never a page. A plain block keeps its icon. A chip keeps dagre; the entered view keeps ELK |
| **a definition** | in the library, with uses, enters its registry, a model or a relation definition included; unused, it enters nothing. A model is drawn in the models; other definitions' structure only through their usages and the tray |
| **lines** | crossings, line words and the sequence self-message stay as they are; a transition does not show its event, guard, or action |
| **a behaviour** | its own diagram; its card is not drawn on its owner's layer |
| **a swimlane** | the grid's header row and header column are the lane headers |
| **the tray** | traits stay on the card tab; a long chip list stays whole |
| **canvas gestures** | a drag does not place a card; it reorders along a band or a column |


## Edges

| Area | Edge |
|---|---|
| **cards** | marks on a dark table card are faint; a reference previewing a table ignores its own look's border; notes still draw through `NoteNode`, not only `CardFace` |
| **tray** | its tables light picks by id, not through core `lit`, so a part picked through one usage lights its row wherever it is listed; a line's preview never shows `line.dir`; a definition's resolved chain chip is gone; in a read-only tray *view definition* is disabled with everything else; the definitions table's *extends* shows a sibling definition (`example/Ledger`) for one that extends nothing |
| **overview** | the glance mounts a second React Flow, so node description ids repeat in the page; on the open layer with nothing picked it draws what the canvas already draws; a tag with no hue paints its share of the bar plain |
| **samples** | no definition with room parts is used twice, so *one highlight*'s case — a part picked under one usage lights nothing under another — has not been driven in the explorer |
| **camera** | a short port drag lands short |
| **React** | `flushSync was called from inside a lifecycle method`, once seen opening the profile and the package view from a layer; the package view is gone, recheck the profile |
| **packages** | a definition file holds no parts, so a pattern's parts live in its package's `package.json`; base's `decision` and `services`'s share a name, so `type: decision` resolves to whichever the lookup finds first |
| **paths** | a path names every region on the way (`Overview::Shop::Back office::Payments`), though layers look through them. |
| **diagram files** | a card drawn in by `source` keeps only its type, body, tags, settings, name and values; the web app's collect loads no `packages` a file lists |
| **annotations** | a label floats aside, so on a layer cut into regions it can land across a band's heading; a picked region draws a full outline rather than its band; an empty layer's words centre on the canvas rather than the room |
| **ports** | design.md gives a port its definition's settings, values and tags; ports hold name, type, flow, seat and description only |
| **map** | a count on a tight chip fragments (*service 6.*); the room sits under a one-line head |
| **double-click a grid** | lands on its name and renames it; Enter opens it |
| **follow-ups** | lineage and links as a package structure rather than a view; boxes for a definition's usages and the groups they belong to |
