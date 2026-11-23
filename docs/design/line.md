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


## Information by length

**What a line shows is decided by its laid length, never the zoom** (2026-11-15, views `line.ts` `line_shows`): its anchors from a short line, its name where the line is longer than the name, its ends' words on a long one. Zoom only fades them.

| Laid length | Shows |
|---|---|
| any | the stroke, in its colour and dash |
| short | + its **anchors**: where it meets a card, in its type's colour (an owner's diamond, a head, else a short bar). They hide when too small to read, as seats do |
| longer than its name | + its name beside the stroke (above a level leg, right of an upright one), and a count after it where several are drawn as one (`has ×2`), never a thicker stroke |
| long | + its ends' words at the anchors: multiplicity and role, on views that draw ends |
| on hover | hover card: relation type, from and to, ends, description, where else the pair is joined |


## Form

- **routed round cards**, square, fewest crossings, then fewest bends (2026-11-21: a crossing costs a long way round)
- **in lanes** (the user, 2026-11-21): lines running side by side, from one anchor too, are nudged a seat apart, so each reads as its own
- **a crossing hops**: where a level leg crosses another line, it rises over it in a small half circle (views `route.ts` `HOP`), so a crossing never reads as a join
- **named where it is alone**: a name sits by a leg its line has to itself, clear of other lines, never on a shared trunk (2026-11-21)
- **drawn once**, at the level where it crosses
- **nothing sits on the stroke**: names and end words sit beside it, so the line always reads unbroken. While hovered or picked, a line thickens and shows its end words at any length
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

