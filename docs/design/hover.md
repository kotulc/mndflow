# Hover card

**Draft, 2026-10-29: for agreement.** A hover card says everything about the thing under the pointer, briefly and in one place, without moving the selection. It is the ladder's top level, level 4, carried to wherever the pointer is.


## Purpose

| Question | How it answers |
|---|---|
| *what is this, exactly?* | path, name, kind, what it extends |
| *what is it for?* | its description |
| *what does it have?* | every fact, then its large face |
| *where is it used, or what does it hold?* | its uses by place, or its members |
| *what can I do?* | the footer names the gestures: click for the tray, double-click to enter |


## Rules

- **one component** for every chip, tile, box title, line tile and place box, and for diagram cards and lines. Never on explorer rows: the tray sits beside them. A tile with nothing of its own reads as the chip around it
- **after a moment** (about 350 ms), then **at once** while the pointer stays on the map
- **read only**, never takes the pointer, and is replaced by focus on keyboard navigation
- **capped length**: the face and the lists are cut at a preset. The tray holds the rest


## Differs from the overview

| | hover card | overview |
|---|---|---|
| when | passing over | picked |
| length | a glance | the full answer |
| picture | its face | what it connects to, or its registry |

