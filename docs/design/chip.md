# Chip

**Draft, 2026-10-29: for agreement.** A chip is how a treemap draws an element: the map and every registry. It shows an association by place: an area gathering what belongs together, sized by how much it gathers, its members drawn inside as tiles. A leaf, gathering nothing, is still a chip and previews its own face. It is for finding and comparing, never for editing.


## What a chip gathers

| Chip for | Gathers | Grouped inside by |
|---|---|---|
| a diagram or a model | its members | its structure: layers, groups, bands, grid rows |
| a definition | its uses | place: the diagram that draws each, as a panel in that diagram's hue |
| a tag, a type, an interface definition | what carries it | the folders they sit in |
| a relation definition | its lines | place |
| a leaf | nothing | its face: attributes, records, body, else its description |


## Purpose

| Question | How the chip answers |
|---|---|
| *what is it?* | head: name, kind, icon, colour edge |
| *how much?* | its area, and the counts in its facts |
| *which ones, and where?* | its preview: the members as tiles |
| *what next?* | click to see it in the tray, double-click to enter, hover to see everything |


## Information by level

| Level | Shows |
|---|---|
| 0 mark | icon on its colour edge |
| 1 head | name, kind, icon |
| 2 facts | the kind on its own line where it did not fit beside the name, then counts, seats, tags (named where there is room, else dots). Gives way where the preview under it would lose its content (a diagram keeps its structure first) |
| 3 preview | its members as tiles, grouped as above, each showing what its own size holds — its mark, then its name. A definition used nowhere: its **profile**, what it declares. A leaf: its face |


## Form

- **sized by what it gathers**. Never narrower than a card when it is taller than it is wide
- **upright when narrow and tall**: turned -90°, name reading up, colour edge along the bottom
- **tiles are cards** and climb the same ladder: name, icon and their own colour edge, then a facts line and their rows or description as zoom gives them room. A tile that only repeats the chip's name is not named again
- **any depth**: a tile holding blocks nests them under its name, and they theirs, laid once down to a floor too small to show at the closest zoom. Each shows from its own size on screen, fading in as its mark reads; nothing is cut off at a fixed depth or zoom
- **legible or summarised**: a tile is never drawn below its head level. Tiles that do not fit whole fold into one last tile, *+12 more*, which its hover card lists
- **structure, never drawing**: a chip previews a diagram's members in its layers, groups, bands and grid rows, never its lines or its laid-out positions
- **headers are named**: a grid's header strips — a sequence's participants across the top, a swimlane's lanes down the left — are small cards of their header blocks, named (upright down the left) where every row and column keeps room beside them; a named header's column is laid at least four letters wide. A quiet track runs behind each row of headers, the grid's whole width or height
- **a class's or an entity's tiles** say their rows, ruled as the card's table is, where they have room; where they do not, the class or entity texture stands in for them. Never both
- **names read or cut short**: a tile's name is held readable, shrinks toward its laid size to fit its tile, and shows cut short (*Canc…*) wherever four letters and a line fit; below that, its icon alone
- **read only**: no seats, no lines, no menu, no drag
- **one gap** across the whole map and inside every chip: between chips, groups and tiles alike. Never scaled per chip


## Differs from a card

| | chip | card |
|---|---|---|
| drawn on | a treemap | a diagram |
| level 3 | its members, or a leaf's face | its own face |
| frame | flat, colour edge left | bordered, seated |
| relations | counted, never drawn | drawn as lines |
| edits | never | in every entered view |

