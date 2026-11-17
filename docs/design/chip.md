# Chip

**Agreed 2026-11-16 (tree rework, mockup claude.ai/artifact/Wgi6FEJTDjSKQVSSsKLexp).** A chip is how the tree view draws an element: the map (world root) and a model's overview (model root); a tree view draws containment only, never usages (2026-11-16). It is a **card's header over a well**: what a card shows as its table, a chip shows as a treemap of what it holds. It is for finding, comparing and entering, never for editing.


## Layout of the tree

| Rule | Detail |
|---|---|
| **the treemap fills its space** | every box's cells fill it, sized by weight (square root of what each holds; never how often it is joined); a few chips or a hundred read as a whole. **The map is laid the canvas's size** (larger only when it holds many chips), so it reads whole at 100%; a model's middle is laid in what its zones and About leave, keeping at least 70% of the canvas each way |
| **seen whole** | the camera shows a tree view whole and never zooms to a pick; only a walk fits its step. A click only picks (on the map it also moves the crumbs), **in the explorer as on the canvas: what an entered treemap holds is picked there, never jumped out of** (2026-11-16); two enter. **Anything with a well enters**, in either section — a library folder, a definition holding parts (its drawing), a group; a leaf only picks |
| **a package's folder enters as its treemap** | entered from the map, in either section, a folder draws what it files as a tree view, **framed by its own box** (its name and counts) as the map frames a package; leaving (the crumbs' up) goes to the folder holding it, else the map; Escape goes to the map. Projected bare by a tool, a folder still draws its layer (2026-11-16) |
| **landscape-biased squarify** | cells are laid in a space half as wide, then stretched 2×, so cells come out wider than tall and every name reads across; works on landscape and portrait canvases alike |
| **a budget from the canvas** (agreed 2026-11-16, scale-plan.md) | a view draws as many chips as its room holds at a readable size (a header over the least well, with its air) and no more; a project of ten blocks or ten thousand reads as one screen. The map is never laid larger than the canvas |
| **opened from the top, wide before deep** | every view starts closed and opens one box at a time — a box opened by hand, the model file's `open:`, the world root's models, an overview's primary parts, then the heaviest by depth — keeping each only while the view stays within its budget and every chip stays legible; decided from the laid shape, never the zoom |
| **flat lists are grouped** | a box holding more than its share can draw groups its children into closed chips with counts: by their own path first (package › folder › place), then by kind, then by alphabetical range; entering a group goes one level deeper. Never *+n more* |
| **text is always horizontal** | no chip, tile or title is ever turned; a long name is cut short with … and its hover card says it whole |
| **the name grows with its cell** | about 11–20px, continuous, from the cell's laid size: large parts read from far out, small ones up close; no switch |
| **opening and closing is the only change of layout** | a click opens or closes a box; the world root opens each model one level; a model's `open:` sets its overview's start; focus resets on each visit |


## The header (shared with cards, one-to-one)

| Part | Rule |
|---|---|
| **always two lines** | name over meta, at every size; a cell too short for both is left closed by the budget, never squeezed to one line |
| **icon** | the kind's square icon from the app's set (theme `icons.tsx` `role_*`), top right, as tall as the name and meta lines together; scales with the name; a holder's icon lightly filled |
| **name** | one line, takes the width the icon leaves, cut short with … |
| **meta line** | kind · ▶ presentations · counts · attributes · seats in/out · tags, flowing into the width left; an item that does not fit drops whole, last first; a diagram's kind word in its hue; actors and externals omit the kind word (their outline says it) |


## Kinds of cell

A ladder of fill and border, strongest first.

| Cell | Fill and border | Well |
|---|---|---|
| **holds parts** | strongest fill, 1.5px border in its hue, 6px left accent | a plain recess; its parts as a treemap |
| **diagram** | middle fill, 1px border in its hue, 6px left accent | framed in its hue like a small canvas, a right-aligned **diagram** tab on the frame; its blocks as a treemap, never laid as the diagram draws them, never with lines |
| **leaf** | quiet fill, thin border, 6px left accent | none |
| **actor** | no fill, round outline in its hue | none |
| **external** | no fill, thin semi-transparent neutral border (never dashed), name muted | none |
| **closed folder or package** | neutral holder | a recess, like any holder |


## The well

- **every cell that holds anything** shows its children as a quiet treemap (the same landscape-biased squarify), laid by weight
- **a well shows what entering shows**: the same first level its entered view draws, groups included, never more cells than its room names
- **every child is named, its mark in its top right corner** as a header wears its icon (2026-11-16) — its role's icon, or a relation definition's swatch: **one mark per element**, the same on its explorer row, card, chip header and well cell — its name shrunk to fit beside it (10.5px down to 8px), cut short with … past four characters; parts holding parts a touch brighter, diagram parts outlined in their hue, actors rounded
- **never flooded** (2026-11-16): only the heaviest children that each show their icon and four characters at 8px, the rest one plain *+N more* cell (whole, picking the chip itself); a well with room for none is not drawn
- **neighbours stand apart**: cells step through four grades of their colour in the order they are laid, so two side by side never look alike even when they share a colour
- **one level only**: a child never shows its own children inside the well
- **no well under ~26px of room**: the cell shows its header alone


## Lines between chips

- **drawn only when a chip is selected or hovered** (agreed 2026-11-16); quiet otherwise
- **gathered to the level drawn**: every relation under a chip — its descendants' too — lifted to the chips the view draws; one line per pair, weighted by how many it carries (a few stroke steps, the count said on hover); none inside one chip; boxes and chips alike


## Rejected along the way (2026-11-16)

| Tried | Why not |
|---|---|
| rows of fixed-size chips by rank | lost the treemap's fill; a few chips no longer made visual sense |
| a sheet-behind edge for holders, a dot grid for diagrams | barely noticeable; the dot grid did not say *diagram* |
| a diagram glyph as watermark, framed corner panel or cropped mark | inconsistent across cell shapes, or no better than an icon |
| a stamp beside the name | no better than an icon; the framed well says *diagram* instead |
| a chip drawn like its diagram (silhouettes, structure-laid tiles, listed parts) | diagrams and presentations became hard to tell apart (2026-11-15) |
| legible or closed: the lightest open box below the top two levels closed until every chip held its name | could not close a flat list (1,429 uses of `block` drew 1,430 chips), relaid the map once per box closed; replaced by the budget opened from the top (2026-11-16) |
| focus by expanding: a pick gaining weight, the treemap relaid and animated | slow and glitchy; **a selection never moves a cell** — only opening and closing a box changes the layout (2026-11-16) |
