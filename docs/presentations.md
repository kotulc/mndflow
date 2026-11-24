# Presentations

**A presentation is an ordered, narrated way through a model, played like a slide deck: one drawing of the system, a camera that moves over it, and the words in the tray.** Agreed 2026-11-12 from the mndsite mockup (https://claude.ai/artifact/WFdvLDrRtW6tfWGevF6cx5). This file is the spec: the terms, the file format, exactly how a presentation plays, and how it is built. Decisions behind it are in model-plan.md.


**A presentation is the main entry for a new user, never an afterthought** (the user, 2026-11-21). It is the first thing a person opening a model plays, so it must carry them from *what is this system* to *how does its most important use behave*, stop by stop, through the real diagrams. Round 5's presentations were thin: a few stops, a sentence each, little stepping through what the diagrams draw. How the tools help an agent write a good one is in iteration-plan.md *Presentations first*.


## Terms

| Term | Is |
|---|---|
| **model** | one coherent picture of a system: a tree of uses of library definitions, with relations |
| **overview** | the model drawn as one picture: the system with its parts, the outside around it, the model's information below. It is the map focused on one model |
| **presentation** | an ordered list of stops through one model, stored in the model file. Informally a "presentation path" |
| **stop** | one distinct point: what opens, where the camera looks, a one-line summary, and its steps |
| **step** | one thing shown in a stop, in order: a relation lit or a block marked, with one sentence |
| **dive** | leaving a stop to explore a part; *resume* returns to the same stop |
| **into** | entering a sub model's presentation from a stop, and coming back out |


## The overview

| Place | Holds | Drawn as |
|---|---|---|
| middle | the system: its parts, their parts, what connects them | boxes on a dotted stage |
| above | actors: who runs or uses it | actor chips |
| left | inputs | external chips |
| right | outputs and dependencies | external chips |
| below, past a dashed divider | **About**: groups of notes, by default presentations, entries and library | plain text notes, never boxes, never lit or dimmed |

- **one drawing**: every stop shows the same drawing; nothing is redrawn or overlaid. A part's own diagram is reached by zooming into it
- **boxes open and close**: a closed part shows its name; an open one shows its parts. Opening and closing is the only change of layout
- **detail comes forward near**: a small part may hold its own small drawing (translate page's five steps) that is readable only when the camera is close
- **About is the model's to set**: an `about:` list in the model file names its groups, each holding any blocks, definitions, presentations or entries by name. Without one, About shows presentations, entries and library

```yaml
about:
  - name: Presentations          # a built-in group: the model's presentations
  - name: Entries                # built-in: the ways in
  - name: Shared helpers         # any group, any references
    items: [semver, metadata.text]
  - name: Data
    items: [Config, PageMeta]    # definitions in the library
```


## The file

Presentations live in the model file under `presentations:`. Blocks are named as everywhere else (`ingest.translate`); a step lights a relation the model already has, written as in `relations:`, so its label is the relation's own name.

```yaml
presentations:
  - name: Build a site
    description: One build, from the command to dist/.
    pace: 1.7
    stops:
      - title: Overview
        at: mndsite
        open: [presentations, entries, library]
        summary: mndsite turns Markdown and one YAML file into a static site.
        steps:
          - text: Two parts. Build runs once in Node; site runs in the browser.
          - text: Generated files are the only link between them.
      - title: One file configures it
        at: configuration
        open: [configuration]
        summary: Only title is required.
        steps:
          - relation: mndsite.yaml -> configuration
            text: load_config reads mndsite.yaml and fills every unset key with a default.
          - relation: configuration -> ingest
            text: The build passes Config to ingest in memory.
      - title: Ingest copies the content
        at: ingest
        open: [ingest]
        into: Ingest content
        summary: The content folder is mirrored as is.
        steps:
          - relation: content folder -> ingest
            text: Ingest reads the content folder.
      - title: Each page is translated
        at: ingest.translate
        open: [ingest]
        show: ingest.translate     # opens its flow diagram; steps then refer to what it draws
        summary: One .md file becomes an .mdx page and a PageMeta record.
        steps:
          - mark: ingest.translate.read
            text: Read the file.
          - mark: ingest.translate.title
            text: Pick the title, from frontmatter or else the file name.
```

| Key | On | Required | Means |
|---|---|---|---|
| `name` | presentation | yes | its title, listed under About |
| `description` | presentation | no | one line |
| `pace` | presentation, stop | no | seconds between steps; default 1.7; `0` waits for each click. A stop's overrides its presentation's |
| `stops` | presentation | yes | in order; the first is usually the overview |
| `title` | stop | yes | the stop's one point, a short phrase |
| `at` | stop | yes | the block the stop is about: ringed, and the camera's centre |
| `open` | stop | no | boxes open at this stop; every other box is closed |
| `fit` | stop | no | blocks the camera must show; default `at` plus every block its steps touch |
| `show` | stop | no | a block whose diagram the stop opens (a flow, a sequence, a class); its steps then light and mark what that diagram draws |
| `summary` | stop | yes | one line under the title |
| `into` | stop | no | a sub model's presentation this stop leads into; the stop's `at` (or `show`) is that sub model's own block |
| `steps` | stop | no | in order |
| `relation` | step | one of | a relation of the model, `from -> to`, drawn on a diagram; on a treemap its two ends ringed; `from -> to: name` picks one of several lines between a pair by its name (a sequence calling twice) |
| `mark` | step | one of | a block ringed; inside a shown diagram, named through it (`Entities.Check`, `Context.api`) |
| `text` | step | yes | one sentence |

**Checked** when the model is read: every `at`, `open`, `fit`, `show` and `mark` names a block of the model; every `relation` is one the model has, or one the shown diagram draws; every stop has a title and a summary; `into` names a presentation of the used model; every `about` item names a block, a definition or a presentation.


## How a stop plays

| Order | What happens | Time |
|---|---|---|
| 1 | the stop's `open` boxes open and the rest close | 0.6 s, skipped when nothing changes |
| 2 | `at` is ringed; everything that is neither `at`, around it, inside it, nor a step's end is dimmed (not when `at` is the system itself) | with 1 |
| 3 | the camera moves to fit `fit` with a margin, never past 4× | 1.1 s, eased |
| 3b | with `show`: the camera flies into the block as far as its diagram will stand, then the diagram is entered (as entering a chip does today) | with 3 |
| 4 | each step in turn: its sentence appears in the tray and is current; on a diagram a relation draws from its start (1 s), a datum travelling it only on a dataflow, where lines carry data, earlier relations a soft accent; **on a treemap a relation rings its two ends**, no line drawn (the user, 2026-11-22); a mark rings its block | one step every `pace` (1.7 s) |

- **nothing else moves**: no layout change but opening and closing; no second drawing
- **the step now reads where lines overlap** (the user, 2026-11-22): on a diagram, lines no step has shown dim (a sequence's lifelines stay, being its frame), earlier steps' lines go a soft accent, and the step now is raised over every line and card on a halo of the ground, drawn in the accent (a datum travelling it on a dataflow alone); a treemap draws no line at all (the user, 2026-11-22): the step's words are the tray's, its ends ringed

**Played through, as a video is** (the user, 2026-11-21): steps build at the pace; once a stop's are all shown it holds (at least 2.5 s), then goes on — into the stop's sub presentation where it leads into one, else the next stop, and out again after a sub presentation's last — and pauses at the very end. Paused, or at the *on click* pace, nothing moves on its own.

**Started from any ▶** (2026-11-21): a chip's or card's header wears a ▶ (with a count where there are several); pressed on the map, it enters the chip and plays its first presentation; pressed in the tray, or on About's notes, it plays there. Starting switches the tray to its overview tab.

**Where you are is always in sight** (the user, 2026-11-21): the card a step's line lands on is ringed with it as the current block, and **the camera moves as little as it can** (the user, 2026-11-21: centring was too much movement and lost the frame): the stop's view holds while the step's cards are in it, else glides (slower than a pick's flight) only as far as brings them in, never past the drawing's edges; a card drawn across a frame counts as the block it stands for, so the stop's fit holds it too.

**The player** (the user, 2026-11-22; it had got lost among the overview's sections) is **a bar anchored at the tray's foot**, on every tab, never over the canvas, and **shown only where it has something to play**: while one plays, or where what the tray is about is in a presentation (core `featured`: a model's own; else a stop at it or showing it, or a step marking it or lighting a line it is an end of; a definition through its usages). **Idle**, it holds the regular controls and the presentation's name (a choice where the element is in several) with the stop it starts from: ▶ plays from the first stop showing the element. **Playing**, the bar holds the stop before (⏮, ←), play or pause (▶ / ❚❚, space), the next step then the next stop (⏭, →), stop (■, Escape), the stop's place and name, *into* and *out* where they apply, a dive's *resume*, and the pace; and **the overview's answers column is the stop**: the presentation's band, its stops as numbered pills (one goes to its stop), the stop's title and summary, and **every step of the stop**, the one shown lit, those to come faint, **the lit one always kept in view**, a third of the way down its column. The card and the map stay in the lead column, following the step. Starting one opens the tray. Clicking a part dives into it (it opens, the camera fits it); *resume* or Escape goes back. The camera fits calmly, never past 1.5×.

**The tray follows the presentation** (the user, 2026-11-22; was pinned to the model): while it plays, the tray is about the block the step just shown lands on or marks, else the diagram the stop shows, else the stop's block; a dive's part while diving (web `present.ts` `current_of`). The overview offers no *open* or *read* buttons: opening is a double-click.


## Drafted

**The whole model's tour, drafted from its files** (2026-11-21): `mnd presentation draft <package folder>`. Saved into the model files, the words to be rewritten and stops cut or added (the library included) by whoever drafts it.

| Tour | Stops |
|---|---|
| **each model's own**, named as the model | its treemap (`at` the first part an actor reaches), **each part marked** with its description (2026-11-22: a treemap draws no lines); then each diagram in its folder, shown and stepped through its lines in order — the context first where its file comes first |
| **the top tour**, in the first model (the overview) | its own stops, the first saying what the system is (the package's description, never the model's again); then one per other model, shown, leading `into` that model's first presentation, no line stepped |

- **additive**: a model's tour of that name is kept unless `--force`; any draft that adds faults is taken back, every file left as it was
- **`check` warns**, never failing (`presentation check <model or folder>`): of a diagram of the model no stop shows (a use of a library part is no diagram here), and of a stop stepping lines with no `show`, on a treemap that draws none (2026-11-22); and **below the quality bar** (2026-11-23, *Writing one*): a tour showing no diagram, a stop with no steps leading into no tour, a summary repeating its title, a step still in drafted words
- **`list` reads as played** (round 6): each stop's place, `at`, `show`, `into`, summary and every step's sentence with what it lights
- a step's sentence is drafted as `from → to: name.`


## Writing one

**The arc** of a top tour: what the system is for → who uses it → its main use, step by step → what it keeps → where to go next (`into` each model's tour). A model's own tour: what the model shows → each diagram, stepped in the order things happen.

| Do | Not |
|---|---|
| one point a stop; its title says it | a stop per diagram for its own sake |
| a summary that adds to the title | the title said again |
| each step a plain sentence about what is lit | the drafted `a → b: name.` left in |
| step lines in the order things happen | every line of a diagram, incidental calls too |
| show a diagram for lines; mark parts on a treemap | lines stepped on a treemap (it draws none) |
| end a stop with no steps only where it leads `into` a tour | an empty stop |

`presentation check` warns of each *Not* it can see.

## Rules

- each stop makes one point; its steps follow a logical path through the system, never a list of relations
- a step lights what the model has, never an ad hoc line: a missing relation is added to the model first
- visuals first; text short and plain, one sentence a step
- a presentation is made through the CLI by a person or an agent; nothing records who made it


## Building it

**Built 2026-11-15**, driven on the shop (*Tour the shop*, *Place an order* into *Take a payment*).

| Piece | Where |
|---|---|
| **the player** (2026-11-21, moved into the tray 2026-11-22): played through, pause, keys; ▶ on headers; the tray following the step | web `present.ts` (`usePresent`: `paused`, `toggle`, `HOLD`); tray `Presentation.tsx` (`Bar` at the tray's foot, `Steps` in the answers column, `bring` keeps the lit step in view), `Tray.tsx` (`foot`, shown only where there is something to play), `Overview.tsx` (`Shell` `playing`); theme `shell.tsx` `TrayFrame` `foot`; theme `header.tsx` (`data-play`); stage `Stage.tsx` `onPlay`; web `App.tsx` `play_from`; web `camera.ts` `fit_of` (1.5×) |
| read and check `presentations:`, `about:`, `open:` in a model file | core `diagram.ts` (`presentation_of`, `stop_of`, `about_of`), `sources.ts` `overview` (names read as blocks, a step's relation as a line the model or the shown diagram has; what names nothing is a note `check` prints) |
| a presentation's state: presentation, stop, steps shown, dive, the stack entered | core `present.ts` (`Play`, `play_next`, `play_prev`, `play_into`, `play_out`, `pace_of`) |
| the player: timer, keys, what a stop opens, rings, dims and lights, the camera's fit | web `present.ts` (`usePresent`, `showing_of`, `fit_of`); web `camera.ts` `fit_of` |
| the overview: the model root of the one tree view | views `map.ts` `layer_map`, `opened`; views `overview.ts` (`around`, `about_room`, `about_of`) |
| boxes that open and close per stop, and by hand | views `tree.ts` `layer_tree` (an open set); web `App.tsx` `open`; theme `chip.tsx` `Toggle`; stage `Stage.tsx` (`data-toggle`) |
| lighting a relation, drawn in order | on a diagram stage `Wire.tsx` (`NowContext`, drawn in; `Datum` on a dataflow), `Stage.tsx` (`stepping`, `PAST`); on a treemap its two ends ringed, web `present.ts` `showing_of` |
| the About band | views `overview.ts` `about_band`; stage `nodes.tsx` `AboutNode` (`data-play` plays, `data-about` picks) |
| a stop entering a diagram (`show`) | web `App.tsx`: the stop's drawing is read when it is not the one open |
| the CLI: list, draft, check | cli `tools.ts` (`presentations`, `draft`, `tour`), `main.ts` `presentation`, `unvisited` |


## Settled

| Question | Answer |
|---|---|
| where the pace setting is kept (2026-11-15) | the file says it; the reader's setting in the player is remembered per viewer and plays over it |
| where the player lives (the user, 2026-11-22) | a bar at the tray's foot, hidden where nothing is to play; playing, the stop takes the overview's answers column; never over the canvas (2026-11-21's canvas bar covered it), never a section among the answers (2026-11-22's got lost there) |
| what play does (the user, 2026-11-21) | plays through the stops, as a video; pause freezes; ⏮/⏭ still step |
| a chip's ▶ with several presentations (the user, 2026-11-21) | plays the first; the rest are in the tray's list |
| how a shown diagram is left (2026-11-15) | the next stop reads the overview again, as leaving a chip does |
| data moving along a step's line (2026-11-15) | yes: a step's relation draws from its start with its datum travelling along it, its label after |

**Settled 2026-11-12**: steps play on a timer and a click shows the next one at once; the pace is configurable (`pace`, default 1.7 s, `0` for on click); a stop may open a diagram (`show`); About's groups are configurable (`about:`), holding any blocks, definitions, presentations or entries.

**Decided (the user, 2026-11-21)**: one guided tour over the whole model, through its sub-models and their diagrams, drafted by the agent's tools (iteration-plan.md *Next* 2c): the top tour overviews each sub-model and leads `into` its own tour; what it stops at (the library included) is the agent's choice; the draft is saved to the model files and `check` warns of a diagram no tour visits. **Built 2026-11-21**: `mnd presentation draft <folder>` (*Drafted* below); a stop showing a diagram fits it whole with the player's room below. **Built 2026-11-23**: the quality bar and story guide (*Writing one*).
