# Presentations

**A presentation is an ordered, narrated way through a model, played like a slide deck: one drawing of the system, a camera that moves over it, and the words in the tray.** Agreed 2026-11-12 from the mndsite mockup (https://claude.ai/artifact/WFdvLDrRtW6tfWGevF6cx5). This file is the spec: the terms, the file format, exactly how a presentation plays, and how it is built. Decisions behind it are in model-plan.md.


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

**Controls**: steps play on their own at the presentation's pace, and a click never waits: *next* (▶, the right arrow, space) shows the next step at once, and once every step is shown it goes to the next stop; *previous* goes to the previous stop; the tray's pace setting changes the pace while playing, *on click* included; *replay* plays the stop again; the stop list in the tray jumps to any stop; clicking a part dives into it (it opens, the camera fits it, the tray says how to resume); *resume* or Escape goes back to the stop; *into* enters the sub presentation and comes back out after its last stop. Arrow keys move between stops.

**The tray** shows: the presentation's name and the stop's place in it, the stop's title, its summary, its steps numbered as they appear, the controls, and the stop list.


## Rules

- each stop makes one point; its steps follow a logical path through the system, never a list of relations
- a step lights what the model has, never an ad hoc line: a missing relation is added to the model first
- visuals first; text short and plain, one sentence a step
- a presentation is made through the CLI by a person or an agent; nothing records who made it


## Building it

| Piece | Where | Today |
|---|---|---|
| read and check `presentations:` in a model file | core, the door (`collect`) | not read; model files hold `blocks` and `relations` |
| a presentation's state: which presentation, stop, step, dive, and the stack of presentations entered | core session, kept by the host | the walk's stack (tray `Walk.tsx`) is the nearest |
| the camera's shot for a stop: fit `fit` | web `camera.ts` `shot_of`, a new case | one owner already; it fits hops when walked |
| boxes that open and close per stop | views `map.ts` | the map folds only for room |
| lighting a relation, drawn in order | stage, with the one highlight (`lit`) | `lit` exists; drawing in order and fading is new |
| labels placed clear of chips | stage | new |
| the tray's presentation section | tray, replacing `Walk.tsx` | the walk section is the nearest |
| the About band under the overview, its groups from `about:` | core reads `about:`; views and stage draw it | new |
| a stop entering a diagram (`show`) | web, as entering a chip; camera `into` | entering a chip flies in and cuts today |
| the pace and click-through | host timer, the tray's pace setting | new |
| the CLI: draft, check, list | cli, the `presentation` tool | new |


## Open

| Question | Notes |
|---|---|
| where the pace setting is kept | per viewer (the tray remembers it) or only in the file |
| how a shown diagram is left | at the next stop the camera flies back out to the overview, as leaving a chip does |

**Settled 2026-11-12**: steps play on a timer and a click shows the next one at once; the pace is configurable (`pace`, default 1.7 s, `0` for on click); a stop may open a diagram (`show`); About's groups are configurable (`about:`), holding any blocks, definitions, presentations or entries.
