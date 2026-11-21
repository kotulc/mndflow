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
| `into` | stop | no | a sub model's presentation this stop leads into |
| `steps` | stop | no | in order |
| `relation` | step | one of | a relation of the model, `from -> to`, drawn |
| `mark` | step | one of | a block ringed |
| `text` | step | yes | one sentence |

**Checked** when the model is read: every `at`, `open`, `fit`, `show` and `mark` names a block of the model; every `relation` is one the model has, or one the shown diagram draws; every stop has a title and a summary; `into` names a presentation of the used model; every `about` item names a block, a definition or a presentation.


## How a stop plays

| Order | What happens | Time |
|---|---|---|
| 1 | the stop's `open` boxes open and the rest close | 0.6 s, skipped when nothing changes |
| 2 | `at` is ringed; everything that is neither `at`, around it, inside it, nor a step's end is dimmed (not when `at` is the system itself) | with 1 |
| 3 | the camera moves to fit `fit` with a margin, never past 4× | 1.1 s, eased |
| 3b | with `show`: the camera flies into the block as far as its diagram will stand, then the diagram is entered (as entering a chip does today) | with 3 |
| 4 | each step in turn: its sentence appears in the tray and is current; a relation draws from its start (1 s), its arrowhead and label appear after; earlier relations fade to 40%; a mark rings its block | one step every `pace` (1.7 s) |

- **lines run under chips**: a relation line passes beneath every chip and ends at its target's edge; its label sits above everything
- **labels never cover**: a label goes at the point along its line nearest the middle where it covers no chip, heading or other label; plain text with a halo, no pill
- **nothing else moves**: no layout change but opening and closing; no second drawing

**Played through, as a video is** (the user, 2026-11-21): steps build at the pace; once a stop's are all shown it holds (at least 2.5 s), then goes on — into the stop's sub presentation where it leads into one, else the next stop, and out again after a sub presentation's last — and pauses at the very end. Paused, or at the *on click* pace, nothing moves on its own.

**Started from any ▶** (2026-11-21): a chip's or card's header wears a ▶ (with a count where there are several); pressed on the map, it enters the chip and plays its first presentation; pressed in the tray, or on About's notes, it plays there. Starting switches the tray to its overview tab.

**The player** sits over the canvas's foot, as a video's controls do: a caption — the stop's title, then the step just shown, else the stop's summary — over one row: the stop before (⏮, ←), play or pause (▶ / ❚❚, space), the next step then the next stop (⏭, →), stop (■, Escape), the presentation's name and the stop's place, *into* and *out* where they apply, a dive's *resume*, and the pace. Clicking a part dives into it (it opens, the camera fits it); *resume* or Escape goes back. The camera fits calmly — never past 1.5× — and leaves the player's room below.

**The tray** stays on the presentation's model while it plays, never following each stop's drawing, so nothing moves under the reader: its overview leads with the presentation's name and the stop's place, then the stop list, the stop playing opened in place on its summary and its steps as they appear, each read whole. A stop in the list goes to it.


## Drafted

**The whole model's tour, drafted from its files** (2026-11-21): `mnd presentation draft <package folder>`. Saved into the model files, the words to be rewritten and stops cut or added (the library included) by whoever drafts it.

| Tour | Stops |
|---|---|
| **each model's own**, named as the model | its overview (`at` the first part an actor reaches), every line in order; then each diagram in its folder, shown and stepped through its lines in order |
| **the top tour**, in the first model (the overview) | its own stops, then one per other model: shown, its first lines from its actors stepped, leading `into` that model's first presentation |

- **additive**: a model's tour of that name is kept unless `--force`; any draft that adds faults is taken back, every file left as it was
- **`check` warns** of a diagram no stop of any presentation in the package shows (`presentation check <model>`), never failing: the drafter decides what to skip
- a step's sentence is drafted as `from → to: name.`


## Rules

- each stop makes one point; its steps follow a logical path through the system, never a list of relations
- a step lights what the model has, never an ad hoc line: a missing relation is added to the model first
- visuals first; text short and plain, one sentence a step
- a presentation is made through the CLI by a person or an agent; nothing records who made it


## Building it

**Built 2026-11-15**, driven on the shop (*Tour the shop*, *Place an order* into *Take a payment*).

| Piece | Where |
|---|---|
| **the player** (2026-11-21): played through, pause, keys; the canvas player and caption; ▶ on headers; the tray pinned | web `present.ts` (`usePresent`: `paused`, `toggle`, `HOLD`); stage `Player.tsx`; theme `header.tsx` (`data-play`); stage `Stage.tsx` `onPlay`; web `App.tsx` `play_from`; tray `Presentation.tsx`, `Overview.tsx`; web `camera.ts` `fit_of` (1.5×, the player's room) |
| read and check `presentations:`, `about:`, `open:` in a model file | core `diagram.ts` (`presentation_of`, `stop_of`, `about_of`), `sources.ts` `overview` (names read as blocks, a step's relation as a line the model or the shown diagram has; what names nothing is a note `check` prints) |
| a presentation's state: presentation, stop, steps shown, dive, the stack entered | core `present.ts` (`Play`, `play_next`, `play_prev`, `play_into`, `play_out`, `pace_of`) |
| the player: timer, keys, what a stop opens, rings, dims and lights, the camera's fit | web `present.ts` (`usePresent`, `showing_of`, `fit_of`); web `camera.ts` `fit_of` |
| the overview: the model root of the one tree view | views `map.ts` `layer_map`, `opened`; views `overview.ts` (`zones_of`, `around`, `about_of`, `lines_of`) |
| boxes that open and close per stop, and by hand | views `tree.ts` `layer_tree` (an open set); web `App.tsx` `open`; theme `chip.tsx` `Toggle`; stage `Stage.tsx` (`data-toggle`) |
| lighting a relation, drawn in order, its datum travelling along it | stage `Traced.tsx` (`steps`: earlier faded, the last drawn, `Datum`, `Label`), `flow.css` *A presentation's steps* |
| the tray's presentation section | tray `Presentation.tsx` (replacing `Walk.tsx`), leading the overview |
| the About band | views `overview.ts` `about_band`; stage `nodes.tsx` `AboutNode` (`data-play` plays, `data-about` picks) |
| a stop entering a diagram (`show`) | web `App.tsx`: the stop's drawing is read when it is not the one open |
| the CLI: list, draft, check | cli `tools.ts` (`presentations`, `draft`, `tour`), `main.ts` `presentation`, `unvisited` |


## Settled

| Question | Answer |
|---|---|
| where the pace setting is kept (2026-11-15) | the file says it; the reader's setting in the player is remembered per viewer and plays over it |
| where the player lives (the user, 2026-11-21) | a bar and caption over the canvas's foot; the tray leads its overview with the stop list |
| what play does (the user, 2026-11-21) | plays through the stops, as a video; pause freezes; ⏮/⏭ still step |
| a chip's ▶ with several presentations (the user, 2026-11-21) | plays the first; the rest are in the tray's list |
| how a shown diagram is left (2026-11-15) | the next stop reads the overview again, as leaving a chip does |
| data moving along a step's line (2026-11-15) | yes: a step's relation draws from its start with its datum travelling along it, its label after |

**Settled 2026-11-12**: steps play on a timer and a click shows the next one at once; the pace is configurable (`pace`, default 1.7 s, `0` for on click); a stop may open a diagram (`show`); About's groups are configurable (`about:`), holding any blocks, definitions, presentations or entries.

**Decided (the user, 2026-11-21)**: one guided tour over the whole model, through its sub-models and their diagrams, drafted by the agent's tools (iteration-plan.md *Next* 2c): the top tour overviews each sub-model and leads `into` its own tour; what it stops at (the library included) is the agent's choice; the draft is saved to the model files and `check` warns of a diagram no tour visits. **Built 2026-11-21**: `mnd presentation draft <folder>` (*Drafted* below); a stop showing a diagram fits it whole with the player's room below. **Open**: the quality bar and story guide (iteration-plan.md *Presentations first*, 3b).
