# flow

**Layer kind. A chain of steps, with data on its edges.** Agreed 2026-11-13.

## Purpose

| | |
|---|---|
| **answers** | how does this happen, step by step, and what passes between the steps |
| **draws** | the flow's frame (its ports are its signature: what it takes and gives), its steps inside in order along the axis, data labelled on every edge, what is across each port outside |
| **examples** | mndsite: build a site, release, ingest content, translate page |

## Utility

| | |
|---|---|
| **draw it** | a behaviour whose steps make a logical path (the mndsite review: a projection gets a mapping instead) |
| **skip it** | one or two steps: the frame's ports say it (mndsite part 2, `load_config`) |
| **vs context** | the same frame; context's inside is parts that stand, a flow's is steps in order |
| **vs sequence** | a sequence is messages between participants over time; a flow is one behaviour's steps with what passes between them |
| **vs dataflow** | a dataflow follows one datum across many parts; a flow follows one behaviour, whatever data it moves |
| **vs state** | a state machine is how one thing changes; its boxes are conditions, a flow's are actions |
| **vs presentation** | a presentation crosses diagrams with narration; a flow may seed one, a stop per step (model-plan.md 19) |

## Surface

| | |
|---|---|
| **base** | `flow`, extending `block`, *is behaviour*: view `internal`, layered along the axis |
| **file** | the flow's own file, a part of its owner (`ingest/translate page.yaml`): its `ports`, its steps in order (list order is step order), its lines with the data they carry. What is across is never written here (context.md, agreed 2) |
| **tool** | `mnd draw flow <selection.json> <out>` (docs/tools/flow.md) |

```yaml
# ingest/translate page.yaml
type: flow
ports:
  in: {page: md file, title key: text, meta: PageMeta}
  out: {mdx: mdx file, fields: page fields, record: PageMeta}
blocks: [read, frontmatter, title, body, write, links]
relations:
  - page -> read
  - read -> frontmatter: raw
  - frontmatter -> title: fm
  - title key -> title
  - title -> body: title
  - body -> write: body
  - write -> mdx
  - write -> links
  - links -> fields
  - meta -> record
```

## Layout

**Context's frame and zones, with the steps as its inside.** The axis runs along the canvas's long side; side traffic is perpendicular to it, at the step it belongs to.

| Zone | Holds | Landscape | Portrait |
|---|---|---|---|
| **start** | the main input, and the caller or trigger | left | above |
| **read on the way** | what a later step reads | above that step | left of it |
| **written on the way** | what a step writes, and what it calls both ways | below that step | right of it |
| **result** | what the flow returns or ends in | right | below |

| Grows | What happens |
|---|---|
| **separate chains** | `draw` warns: one story reads best; keep one chain, or join them where the story does (2026-11-21) |
| **a call tree** | where the main way passes fewer than half the steps, the flow branches more than it runs: it is ranked as a hierarchy, inputs first along the axis, not laned (2026-11-21) |
| **steps** | one row along the axis; **where one row would leave the drawing far from the canvas's shape, it wraps** (the user, 2026-11-21: every diagram respects the canvas's aspect): cut between steps into rows (columns where the axis runs down), each read the same way, as many as bring it nearest the shape; past a default length (7) whoever draws it cuts sub flows, each a step marked ↳ entered by *into*, only where both sides keep the floor (README *Sub diagrams*) |
| **reads and writes of one step** | one port per target on the wall nearest the step; the cards across sit in step order, so lines run straight and never cross |
| **targets of one port** | one card, its targets as name rows |
| **a step done once per item** | a short line back to itself, named by what it repeats over (`↻ each page`) |
| **a step done only sometimes** | its guard in brackets on the line into it (`[versioning.history]`) |
| **ways that part** | the `decision` mark (base's diamond); see *Branching* |
| **gaps** | context's fixed lane, between steps too, sized for the data label |

### Branching and hierarchy

| Case | How it is drawn |
|---|---|
| **a decision** | the diamond is a step on the axis; its first answer (list order) stays on the axis, each other answer takes a lane, below first, then above, alternating. A decision inside a lane orders its answers for fewest crossings |
| **a lane ends** | it rejoins at the first step both ways reach, or ends at the end mark or its own out-port on the result wall |
| **a fork** (lines out, no decision) | both ways happen: lanes as a decision's, no diamond |
| **a loop** | a line back, named by its condition (`↻ retry`), on the side of the step it leaves; where a lane's answers could take either order, the one with fewest crossings |
| **side traffic over a lane** | a lane step's leaves on its own side's wall; a main step's crosses the lane in the gap between steps |
| **nesting** | a sub flow (↳) is entered by *into*, never drawn inline, so every level is one row and its lanes; past two lanes a side (a default) whoever draws it cuts a sub flow |

**The shop's Payment retry under the rule**: unchanged as a file. *Approved?* yes on the axis to *Confirm order*; no in a lane to *Retries left?*, whose no goes on to *Cancel order* and yes to a lane below, *Wait and back off*, whose line back to *Charge card* runs clear of the lanes.

## Agreed 2026-11-13

| # | Decision |
|---|---|
| 1 | a flow is its own block, its ports its signature, drawn as context's frame: a context whose inside is ordered steps |
| 2 | side traffic crosses the axis at its step: reads above, writes and calls below (landscape) |
| 3 | long chains cut into sub flows past a default length; wrapping reversed 2026-11-21: a row far from the canvas's shape wraps into rows |
| 4 | ways that part: the `decision` diamond |
| 5 | a guard is its condition in brackets on the line (`[versioning.history]`), never a shape close to the diamond |
| 6 | a loop is a line back, named by its condition; a mark alone is too easy to miss (2026-11-13, reversing a repeat mark on the step) |
| 7 | branching as *Branching and hierarchy* |
