# sequence

**Grid kind. Who talks to whom, in what order.** Agreed 2026-11-14.

## Purpose

| | |
|---|---|
| **answers** | who talks to whom, in what order, and what passes between them |
| **draws** | a grid read as time: participants across the head, each over its lifeline; each message a row, straight across from sender to receiver, an activation bar where it lands (design.md *Perspectives*, the sequence view) |
| **examples** | mndsite: edit and preview, browse by facet; the shop: Checkout saga |

## Utility

| | |
|---|---|
| **draw it** | several participants take turns, and who acts next is the point: a dev loop, a request through services, a reader's clicks through components |
| **skip it** | one participant doing steps in order: that is a flow |
| **vs flow** | a flow is one behaviour's steps with data on its edges; a sequence is turns between participants over time |
| **vs swimlane** | a swimlane is who does which step, in which phase, with steps as cards; a sequence is the messages between them, each its own row |
| **vs presentation** | a sequence seeds one, a stop per message, its numbers the order (model-plan.md 19) |

## Surface

| | |
|---|---|
| **base** | `sequence`, extending `block`, *is grid*, *is behaviour*: view `sequence` |
| **file** | its own file, a behaviour of its owner: `cols` are references to the participants (written once, as context.md agreed 2); messages in list order, each a row |
| **tool** | `mnd draw sequence <selection.json> <out>` (docs/tools/sequence.md) |

```yaml
# cli-and-setup/edit-and-preview.yaml
name: edit and preview
type: sequence
cols:
  - {name: Author, type: reference, of: overview.Author}
  - {name: watch, type: reference, of: mndsite.build.cli.watch}
  - {name: ingest, type: reference, of: mndsite.build.ingest}
  - {name: next dev, type: reference, of: overview.nextjs}
  - {name: file system, type: reference, of: overview.file-system}
  - {name: browser, type: reference, of: overview.browser}
relations:
  - message:
      - Author -> next dev: npm run dev
      - Author -> watch: npm run watch
      - Author -> file system: saves docs/page.md
      - file system -> watch: fs.watch page.md
      - watch -> ingest: node ingest.js docs/
      - ingest -> file system: writes pages · site-meta
      - file system -> next dev: pages changed
      - next dev -> browser: hot reload
      - browser -> Author: sees the page
```

## Layout

| Case | How it is drawn |
|---|---|
| **participant order** | actors first, then the owner's parts under its frame, then the outside; within each, by first message, so most messages run rightward and short |
| **the frame** | the owner's frame drawn over the head, spanning its parts: context's frame in a sequence (model-plan.md 14) |
| **a message** | a row, numbered, a dot at its origin and an arrow where it lands; named by what is said; the data it carries named by its definition (`pages · site-meta`), opening its card |
| **a repeat** | a fragment across its rows, named by its condition (`↻ each .md change`); never a line back up the time axis |
| **alternatives** | a fragment split by a dashed rule, each part headed by its guard in brackets (`[cache hit]`) |
| **long sequences** | past a default (12 messages), whoever draws cuts a sub sequence, a row marked ↳ entered by *into*, only where both sides keep the floor (README *Sub diagrams*) |
| **portrait** | the same: time runs down; participants past the canvas's width fold the outside into one column |

## Agreed 2026-11-14

| # | Decision |
|---|---|
| 1 | participant order: actors, then the owner's parts under its frame, then the outside; each by first message |
| 2 | the owner's frame drawn over the head, spanning its parts |
| 3 | a message may join two participants directly, its row its list place; a step block only where a step has its own name or note (general: a surface change) |
| 4 | repeats and alternatives are fragments across rows, named by condition or guard; guards in flow's brackets |
| 5 | long sequences cut into sub sequences past a default, under the sub diagram floor |
| 6 | a message has a dot at its origin and an arrow where it lands |
