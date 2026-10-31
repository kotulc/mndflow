# Line

**Draft, 2026-10-29: for agreement.** A line is an association shown by connection: two parts joined in a diagram, one way, both or neither. It has no area, so it carries its information along its stroke and at its ends. Today it follows few of the rules cards do. This doc brings it into the same language.


## Purpose

| Question | How the line answers |
|---|---|
| *what joins what?* | a stroke between two cards' seats |
| *what kind of association?* | its stroke, in its relation type's colour and dash |
| *which way?* | its heads, from `line.dir` |
| *what is it called?* | its name, on its longest leg |
| *what does each end mean?* | its ends: multiplicity, role, ownership, navigable |
| *how many?* | several between one pair draw as one, counted |


## Identity

| Part | A card's | A line's |
|---|---|---|
| **name** | head, from the left | on its longest leg; upright where a leg is too short level |
| **kind** | after the name | its relation type, on hover and in the tray |
| **colour** | its edge | its stroke |
| **icon** | top-right | its relation type's **wire swatch**: a short stroke in the type's colour and dash, with its end marks. The same mark on the map, in rows, the tray and the hover card |


## Information by level

**The level is picked from the line's on-screen length and the zoom,** the same as a card's.

| Level | Shows |
|---|---|
| 0 mark | the stroke, in its colour and dash |
| 1 head | + its **anchors**: where it meets a card, in its type's colour (an owner's diamond, a head, else a short bar). They hide when too small to read, as seats do |
| 2 facts | + its name beside the stroke (above a level leg, right of an upright one), and a count after it where several are drawn as one (`has ×2`), never a thicker stroke |
| 3 preview | + its ends' words at the anchors: multiplicity and role, on views that draw ends |
| 4 full | hover card: relation type, from and to, ends, description, where else the pair is joined |


## Form

- **routed round cards**, square, fewest bends. Lines sharing an anchor share a trunk
- **drawn once**, at the level where it crosses
- **nothing sits on the stroke**: names and end words sit beside it, so the line always reads unbroken. While hovered or picked, a line thickens and shows its end words at any level
- **ties** are quieter: straight, no heads, no ends, above every card
- **coloured by its relation type**, always: the stroke is its identity
- **lit, not dimmed**: picking a card lights its lines and their far ends in the relation colour


## Off the diagram

| Form | A line shows as |
|---|---|
| chip | counted in its facts, never drawn |
| relation definition's chip | its lines as tiles, grouped by place |
| hover card | the full line, level 4 |
| tray | overview, settings (its swatch, then its keys and ends), components |
| row | not listed. A relation definition lists, wearing its wire swatch |

