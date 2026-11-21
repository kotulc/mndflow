# swimlane

**Grid kind. Who does what, in which phase.** Drawn by hand: no tool yet. Agreed 2026-11-14.

## Purpose

| | |
|---|---|
| **answers** | who does each step, in which phase, and what is handed from one to the next |
| **draws** | a grid: a lane per participant, a column per phase, each step a card in its cell, lines between steps carrying what is handed over |
| **example** | the shop: *Fulfilment* (samples/example/overview/shop/how-it-runs/2-fulfilment.yaml) |

## Utility

| | |
|---|---|
| **draw it** | work handed between owners across phases, where *who* owns each step is the point: an order through services, a release with approvals, an incident across teams |
| **skip it** | one owner: that is a flow. Strict turn-taking, message by message: that is a sequence |
| **vs flow** | a swimlane is a flow whose steps are allocated to who does them; the lanes add ownership, the phases coarse time |
| **vs sequence** | a sequence is every message in strict order between lifelines; a swimlane is steps as cards grouped by phase, time only as coarse as the phases |
| **the test** | would the reader ask "whose job is this step?" If not, draw a flow |

**Why mndsite had none**: it has no hand-offs. One process runs a build from start to end, and its participants (author, CI, Next) take turns, which a sequence shows (edit and preview). Its release is two CI jobs in one runner, a flow. A case would be a process across owners: services passing an order on, a CI pipeline with a human approval, a content workflow (writer, reviewer, publisher).

## Surface

| | |
|---|---|
| **base** | `swimlane`, extending `block`, *is grid*, *is behaviour*: view `allocation` |
| **file** | its own file, a behaviour of its owner: lanes as references by the kind (written once, found outward), phases in order, steps in their cells, lines between steps carrying what is handed over |
| **tool** | `mnd draw swimlane` (2026-11-15; docs/tools/swimlane.md), its case this repo's source folder handoff |

```yaml
# shop/how-it-runs/2-fulfilment.yaml
type: swimlane
lanes: [Orders, Inventory, Shipping]
phases: [Ordered, Pick, Ship]
blocks:
  - {name: Publish placed, cell: [Ordered, Orders]}
  - {name: Pick items, cell: [Pick, Inventory]}
  - {name: Book carrier, cell: [Ship, Shipping]}
  - {name: Mark shipped, cell: [Ship, Orders]}
relations:
  - Publish placed -> Pick items: order placed
  - Pick items -> Book carrier: picked
  - Book carrier -> Mark shipped: tracking number
```

## Layout

| Case | How it is drawn |
|---|---|
| **orientation** | phases run along the canvas's long side, as a flow's axis does; lanes across it. Landscape: lanes are rows, phases columns |
| **lane order** | as a sequence's participants: actors, then the owner's parts under its frame, then the outside; each by first step |
| **a cell holds one step** (the user, 2026-11-20) | a lane doing several things in one phase splits the phase finer, one step each; `draw` refuses two steps in a cell |
| **lines** | flow's: data named on the line, guards in brackets, a `decision` diamond in a cell, a loop a line back; routed in the grid's gutters |
| **an empty cell** | drawn empty: the grid is the meaning |
| **many lanes** | past a default (6), the outside folds into one lane, its participants as name rows |
| **the floor** | at least 3 steps (README *Sub diagrams*) |

## Agreed 2026-11-14

| # | Decision |
|---|---|
| 1 | phases run along the canvas's long side, lanes across; the view turns with the canvas |
| 2 | the file says `lanes` and `phases`, short forms of the grid's `cols` and `rows` (general: a surface change) |
| 3 | lane order as a sequence's participants |
| 4 | inside the lanes, flow's marks and line rules |
| 5 | no tool until a case appears |
