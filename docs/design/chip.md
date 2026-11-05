# Chip

**Draft, 2026-10-29: for agreement.** A chip is how a treemap draws an element: the map, a `treemap` diagram (2026-11-02: drawn as the map is) and every registry. It shows an association by place: an area gathering what belongs together, sized by how much it gathers, its members drawn inside as tiles. A leaf, gathering nothing, is still a chip and previews its own face. It is for finding and comparing, never for editing.


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
| 2 facts | the kind on its own line where it did not fit beside the name, then counts and tags (named where there is room, else dots). Gives way where the preview under it would lose its content (a diagram keeps its structure first) |
| 3 preview | its members as tiles, grouped as above, each showing what its own size holds — its mark, then its name. A definition used nowhere: its **profile**, what it declares. A leaf: its face |


## Form

- **sized by what it gathers**, as the square root of its count (2026-11-02), so sizes still rank but a large chip never starves a small one to a sliver. One narrower than its name and taller than wide is weighed up, within bounds; the map grows past a canvas where it holds more chips than would each keep about two names square
- **upright when narrow and tall**: turned -90°, name reading up, colour edge along the bottom
- **tiles are cards** and climb the same ladder: name, icon and their own colour edge, then a facts line and their rows or description as zoom gives them room. A tile that only repeats the chip's name is not named again
- **any depth**: a tile holding blocks nests them under its name, and they theirs, laid once down to a floor too small to show at the closest zoom. Each shows from its own size on screen, fading in as its mark reads; nothing is cut off at a fixed depth or zoom
- **legible or summarised**, on the map as inside a chip (2026-11-02): chips and boxes still too small to read after weighing fold into their box's last chip, *+n more*, which its hover card lists, and a traced path stops at; never one alone, never a box's heaviest. Inside a chip, a tile is never drawn below its mark. Tiles too small for it fold, smallest first (a place's box with all its uses), into one last tile along the body's foot, *+12 more*, which its hover card lists by place. One use alone never folds; where none shows, a definition shows its profile
- **structure, never drawing**: a chip previews a diagram's members in its layers, groups, bands and grid rows, never its lines or its laid-out positions
- **headers are named**: a grid's header strips — a sequence's participants across the top, a swimlane's lanes down the left — are small cards of their header blocks, named (upright down the left) where every row and column keeps room beside them; a named header's column is laid at least four letters wide. A quiet track runs behind each row of headers, the grid's whole width or height
- **a profile follows its text as drawn**: its rows and their rule sit right under the facts at every zoom, never where text held at its largest would end (2026-10-31)
- **a class's or an entity's tiles** say their rows, ruled as the card's table is, where they have room; where they do not, the class or entity texture stands in for them. Never both
- **names read or cut short**: a tile's name is held readable, shrinks toward its laid size to fit its tile, and shows cut short (*Canc…*) wherever four letters and a line fit; below that, its icon alone
- **read only**: no seats, no lines, no menu, no drag
- **hops traced over it** (2026-11-04, superseding a whole path traced, 2026-11-02): hovering or picking any block draws its hops across the map, one each way — what reaches it and what it reaches — each square, as a diagram's lines are: each leg **fans out of the side of its source facing its target** and into the target's side facing back, turning once in the gap between them; the ends on one side of a block spread evenly along it, and the legs leaving one side turn at different points across the gap, so none run as one at any zoom; **one leg a pair**, a hop back along it an arrow at its other end. Thin and quiet, under the chips (the dimmed ones let it through, so it never covers a word), an arrow at its end, what crosses it on hover; a box lighting with what it holds; the rest dims, keeping its colour. **Never numbered**: a walk says its step in words (design.md *Behaviours*). A pick holds it, the camera fitting the block and its far ends
- **gaps by rank, never scaled per chip** (2026-11-02): a **major part** — a part of a model, looked through folders and bands, holding parts of its own — is set apart by a wide gap (24) from its siblings, as is what holds major parts; **boxes** stand 12 apart, and as far inside a box of boxes, in every section alike; everywhere else, inside every chip included, one narrow gap (6). A box's title keeps a line clear above what it holds
- **one title for a box holding only a box**: the two merge, *mndflow › code*, so titles never stack with nothing between them
- **major parts read first**: a heavier rim (2 px) at half their colour, their colour accent on the left wider (4 px); what they hold is quieter — rims at half, box titles faint, previews faded until the pointer is on them. **Minor** is everything inside a major part, and everything else in a model holding no major part: a leaf part, a band of leaves (a one-package project's entry points); a minor chip's own words fade too. **Every chip keeps its colour and its left accent whole**


## Differs from a card

| | chip | card |
|---|---|---|
| drawn on | a treemap | a diagram |
| level 3 | its members, or a leaf's face | its own face |
| frame | flat, colour edge left | bordered, seated |
| relations | counted, never drawn | drawn as lines |
| edits | never | in every entered view |

