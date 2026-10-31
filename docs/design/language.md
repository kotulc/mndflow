# Design language

**Draft, 2026-10-29: for agreement.** Every form that shows an element follows one language, and the forms differ only in how far they go and what they are for. The other files in this folder each describe one form: chip.md, box.md, card.md, line.md, diagram.md, hover.md, overview.md, tray.md, settings.md, row.md. Once they settle, they become the home for these rules, and design.md keeps only the vision.


## Principles

| # | Principle | Means |
|---|---|---|
| 1 | **one identity everywhere** | name, kind, icon and colour read the same in every form, at every size |
| 2 | **one ladder** | every form shows information in the same order and adds rows as it has room. It never squashes them |
| 3 | **room picks the level** | the on-screen size picks how far up the ladder a form goes. Nobody chooses it |
| 4 | **a form is a purpose** | each form answers one question. Its frame says which form it is before you read it |
| 5 | **nothing is lost** | what a form has no room for, the next form up says. Hover says everything, and the tray says more |


## Surfaces

**The surface picks the form: a treemap draws chips, a diagram draws cards.** Every element on a map or a registry is a chip, leaves included, so a treemap reads as one consistent field. Every part in an entered diagram is a card.

| Surface | Draws | Association shown by | Examples |
|---|---|---|---|
| **treemap**: the map, a registry | chips in boxes | **place**: members sit together in one area, sized by how many | a diagram's members, a definition's uses, a tag's carriers |
| **diagram**: an entered view | cards joined by lines | **connection**: two cards joined | relations, ties |

- a chip with nothing gathered (a leaf) previews its own face instead of tiles
- a tile inside a chip is a member: a small card (name, icon, its colour edge)


## Forms

| Form | Where | Answers | Levels | Frame |
|---|---|---|---|---|
| **chip** | treemap | *what is it, what does it gather, and how much?* | 0–3 | flat fill, colour edge on the left, no seats |
| **box** | map | *where does it live?* | title | outline, title top-left, no fill of its own |
| **card** | diagram; on the map only as a tile | *what is this part?* | 0–3 | full border, seats on its walls, stacked edge if it opens |
| **line** | diagram | *what joins these two parts, and which way?* | 0–3 | a stroke between seats |
| **hover card** | over any of the above | *everything about it, briefly* | 4 | floating, shadowed, read only |
| **overview** | tray, first tab | *why it matters, how it is used, where it lives* | 4 | tray panel: picture left, answers right |
| **settings** | tray, card and settings tabs | *how it draws* | face + keys | the face drawn large, one row per key |
| **row** | explorer | *where is it in the tree?* | 0–1 | colour edge, icon, name, system marks, count |


## Identity

| Part | Rule |
|---|---|
| **name** | first, from the left, at full width. Never hidden for an icon where it fits |
| **kind** | after the name, quieter, on chips and cards alike. Where name and kind do not fit one line, the kind moves to its own line under the name, before any facts. Never a word the name repeats. A handle stands in while the element is unnamed |
| **icon** | top-right, the kind's. The one thing every form keeps at its smallest |
| **colour** | a mark, by the colour rules below. A diagram wears its kind's hue, a block or a definition its own, a line its relation type's |
| **marks** | what it stands for (`Def`, `Ref`, `Pkg`), then data. Two at most, beside the icon |


## Colour

**Grounds stay neutral, and colour is a thin mark.** Each role owns one shape of mark, so one hue in two roles never reads alike.

| Role | Mark | On | Never |
|---|---|---|---|
| **what it is**: a definition, a diagram kind | an **edge**: a bar or a border | chip's left edge, card's border, tile's left edge, row's edge | a fill |
| **relation type** | a **stroke**, in its dash | lines, anchors, swatches | an edge or a fill |
| **tag** | a **solid dot** | facts strips, hover cards, the key | an edge |
| **picked, focused, lit** | the **accent**: an outline and a wash | whatever is picked or hovered | anyone's identity |
| **fault** | **warn**, in words or an outline | refusals, check results | identity |

- **a fill means one thing: role.** A use is filled with the neutral ground; a definition is an outline with none, and wears a filled **definition** badge in its colour, on its card and in the tray head. Never a dashed border. Colour never fills, but the accent's wash on what is picked and the definition badge
- **every identity hue has one lightness and chroma**: only the hue differs, so no kind, relation or tag shouts over another
- **the accent and warn hues are kept out of the identity wheel**: green always means picked, amber always a fault. The model kind gets a hue of its own


## The ladder

| Level | Name | Adds | Needs about |
|---|---|---|---|
| 0 | **mark** | icon and colour edge | 16 px square |
| 1 | **head** | name, kind | one 22 px line, 50 px wide |
| 2 | **facts** | the facts strip: counts, then seats, then tags as dots | one more 22 px line |
| 3 | **preview** | the first thing it has, in whole rows | rows × 15 px |
| 4 | **full** | path, what it extends, description, every fact, its face, where it is used or what it holds | hover card, tray |

- **a level shows whole or not at all.** A form that cannot fit the next level stays at the one below
- **the facts strip has one order**: what it counts (uses, places, subtypes, or blocks, lines, interfaces), attributes, seats in then out, tags
- **tags are solid dots** in their tag's colour, named beside the dot where there is room (`● critical`). The workspace's key says what each colour means
- each form says what its level 3 holds: a chip what it gathers, a card its face, a line its ends


## Scale

**Zoom reveals and never moves.** Layout is worked out once from the view. The level is then picked from the on-screen size, which is layout size × zoom. Zooming in adds rows inside shapes that stay put. Zooming out drops them back to the head, then to the mark.

**Content does update as zoom crosses a level, so the change must never read as a pop:**

| Rule | Prevents |
|---|---|
| **never empty**: the head draws wherever it fits, so a shape always says its name first | a blank card waiting for content |
| **rows add below, anchored to the top**: nothing already drawn moves when a level comes or goes | text jumping |
| **rows fade** in and out over 120 ms | pop-in |
| **hysteresis**: a level drops only about 15% below the size that added it | flicker while zoom rests near a threshold |
| **a flight picks its level at the end**: during a camera flight levels hold, and the destination's fade in as it lands | rows churning mid-flight |
| **text holds a readable size**: it scales with zoom only within a band (85% to 115%). Outside the band its size holds and rows come and go instead, as map labels do | unreadable text zoomed out, and nothing gained zoomed in |

- a card's **face** (small or large) still sets its size. Zoom only picks the level inside it
- off-screen and below-level content is never rendered, which also keeps a big map light

