# tree

**Treemap kind. What holds what, and where the weight is: one tree view for the map, a model's overview and an entered folder.** Agreed 2026-11-15; containment only since 2026-11-16.

## Purpose

| | |
|---|---|
| **answers** | what is this system made of, which parts matter most, and what is around it |
| **draws** | the model's overview (presentations.md *The overview*): its parts by containment as a treemap, primary boxes open and the rest closed, each as large as what it holds, its actors and externals tiles of it like any part (the user, 2026-11-22); the About band below |
| **example** | mndsite's overview (review part 12 A; presentation mockup https://claude.ai/artifact/WFdvLDrRtW6tfWGevF6cx5) |

## Utility

| | |
|---|---|
| **draw it** | once per model: it is how a person meets the model, and where its presentations start (model-plan.md 9, 17, 18) |
| **vs context** | context is one level of parts with their lines and the world round them; the overview is the whole containment tree, weighted, **with no lines** (the user, 2026-11-22): what relates to what is context's and the other diagrams' |
| **vs the map** | the map is every model and the library; the overview is the map focused on one model (model-plan.md 18) |
| **the floor** | a model holds at least 3 parts; fewer, and it is a part of its parent's model (README *Sub diagrams*) |

## Surface

| | |
|---|---|
| **base** | the `model` kind's own view (it already places by treemap); no separate diagram kind |
| **file** | the model file: its parts (uses of library definitions), relations, `about:`, `presentations:` (presentations.md *The file*) |
| **tool** | `mnd draw overview <selection.json> <out>` (docs/tools/overview.md): units grouped into parts, which are primary, the presentations offered |

## Layout

| Case | How it is drawn |
|---|---|
| **the middle** | the model's containment as a treemap: each part as large as what it holds; a primary part, a sub model or a subtree is an open box, anything else a closed chip with its name |
| **below** | the About band past a dashed divider: plain notes, never lit or dimmed (model-plan.md 10) |
| **lines** | none (the user, 2026-11-22): a treemap is containment alone (chip.md *No lines between chips*); a presentation step naming a relation rings its two ends |
| **a diagram chip** | its kind's icon in a filled badge of its hue, in its head (2026-11-15) |
| **many parts** | a chip budget from the canvas area; boxes open from the top, wide before deep, while every chip stays legible; a flat list is grouped (by kind, then by name range); a closed box says its name and counts (2026-11-16, chip.md) |
| **opening** | a box's toggle (+ in a closed chip's foot, − before an open box's title) opens or closes it; a presentation stop's `open` sets it per stop; the model file's `open:` (unsaid: primary parts) is where it starts |

## One view, two roots

**One tree view, used everywhere a treemap is drawn** (model-plan.md 18, enforced 2026-11-15). A chip is a closed box of the same tree; opening it shows its inner treemap, so the map and an overview differ only by their root and a few adjustments. **A tree view draws containment only**, as the explorer lists it (2026-11-16): where something is used is the tray's usages table, never a treemap.

| Root | The middle | Around | Below | Written |
|---|---|---|---|---|
| **world** (the map) | packages and folders as boxes, models and definitions as chips | none: no single system | none | worked out, never written |
| **model** (the overview) | the model's containment, primary parts open, actors and externals among them | none | About band | the model file (`open:`, `about:`, `presentations:`) |

- **open and closed** focus attention the same way at every root: open what is primary or heavy, close the rest, a closed box says its name and counts
- **one layout in code** (built 2026-11-15): the model root is laid by the map's own layout (views `map.ts` `mapped`); a component registry (tags, types) — its entries, each picked and its usages read in the tray — and a definition chip's small preview still lay out with `treemap.ts` `tiled`
- **one tool**: `overview` writes the only root that is written, a model's tree; the world is worked out

## Agreed 2026-11-15

| # | Decision |
|---|---|
| 1 | merge: the tree kind is the model's overview; the stand-alone `treemap` kind is retired (only samples/elements used it) |
| 2 | the tool is `overview`, writing coherent, scalable model trees |
| 3 | layout: a weighted treemap of containment, About below; ~~context's zones around it, links in words, lines when lit~~ retired (the user, 2026-11-22) |
| 4 | many parts: ~~boxes close from the lightest up~~ superseded 2026-11-16 by the budget opened from the top, and grouping (scale-plan.md); a closed box says its name and counts |
| 5 | open boxes start from the model file's `open:` (unsaid, the primary parts); stops set their own |
| 6 | one tree view, ~~three roots (world, model, definition)~~ two roots (world, model) since 2026-11-16, with the adjustments above; a chip is a closed box; a definition's usages are the tray's table, never a tree view |
