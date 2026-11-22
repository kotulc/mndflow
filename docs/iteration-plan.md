# Iteration plan

**The primary plan (2026-11-19).** We improve the file format, CLI, tools and views by having a simpler subagent translate a real Python codebase: first its structure (the library), then its use (diagrams, models, presentations). Claude inspects each round, in the app as well as by `check`, and the findings become changes. Rounds repeat until the user and Claude are both satisfied. **Delete this plan when both accept the trial project as the showcase of the split** (design.md *Vision*: structure and use).

**State (2026-11-21, end of session):** rounds 1–5 done; the user reviewed round 5's Sonnet model (*not a bad start*). *Next* 1 committed (`3678807`); uncommitted since: package order, *Next* 2 (*Views pass*), the player (2b), the whole model's tour (2c), and the user's follow-ups the same day (*Decisions*: never losing your place, stops landing in place, marks by kind, references rethought). **Pick up**: the user reviews 2 and 2c on samples/trial/fresh, commits (*Handoff*), then 2d (diagram cleanup, treemap paths), 3a, 3b and round 6.


## Why

| Need | Because |
|---|---|
| **the split must hold in practice** | structure (library) and use (models) is the fundamental split; only a full translation shows where the format, tools and views blur it |
| **an agent is the main author** | the tools are agent-first; a less capable agent following only the docs shows where they are unclear, verbose or missing |
| **every diagram kind needs a real use** | the kinds were agreed on mockups and small samples; a real codebase tests whether each one communicates |
| **a second translator** | a Python translator tests whether the tools are general or shaped around TypeScript |


## The agent's job

| Said | |
|---|---|
| 2026-11-20 | extract facts with the tools, filter them to the purpose, generate the diagram with the tools; generation mostly automatic, general, laid out well — *a system-oriented, mermaid-like utility optimized for agents* to assemble a standard set of models and views of a codebase |
| **2026-11-21** | **the tools are as near foolproof as we can make them** for making a workspace and its config, library parts, models and diagrams. **The agent's only decisions are**: the scope (which parts of the system to model), which diagram fits where, and how to present the model, its sub-models and diagrams. Everything else — files, folders, names, ids, order, scale, layout, checking — is the tools' |
| always | rounds continue until the process is smooth, the tools refined and the product reliable; then Claude presents the results in order for review |


## User review (2026-11-21)

| # | Feedback | How we address it | Status |
|---|---|---|---|
| 1 | **package visibility**: the workspace JSON should say which packages show by default; `base` takes much room and attention; a UI toggle overrides the defaults the agent or CLI set | design.md *Definitions and packages* (decided): the workspace root says its shown packages (its own always, imports only where said, `base` hidden); `mnd init` writes the default; the explorer's package rows get a show/hide toggle, per viewer, never written to the file; both maps honour it; a hidden package still resolves names | built 2026-11-21: root `shown`, explorer eye per viewer, both maps; `init` default with 3a. Package order (user): root `package_order`, dragged in the explorer, default base · imports by name · own |
| 2 | **parts views that make no visual sense** (library › healthchecks › hc › accounts): related blocks outside the frame connect to nothing | a definition's view draws what is across only where a line crosses its frame; the `package.json` edges `define` writes must reach the frame's walls; a reliability pass over every view kind with a measured guard: `measure --views` counts *loose* (a block across the frame no line reaches) and fails on it | built 2026-11-21: `define` joins parts (ends by name path); across lifted to the part's siblings, lines from the inner part, in/uses by direction; `mnd measure` counts loose over library definitions too and fails on it |
| 3 | **order**: *Alert on failure* came before *Overview* | it is ours, not the agent's: collect reads files in path order and the treemap sorts siblings by weight. design.md (decided): order is explicit — a file's order prefix, else its list place, the overview first; the treemap never reorders by weight; `mnd model` writes the prefix | built 2026-11-21: collect orders by number, `overview.yaml` first; treemaps and wells keep given order; prefixes written by `mnd model` in 3a |
| 4 | **sub-model views need a frame** (models › healthchecks › Overview) to show internal and external blocks | design.md (decided): a model entered draws its frame as a context does — its parts inside, actors, externals and sibling models outside, joined to the walls by the lines that cross | built 2026-11-21: an entered model is its own box, actors and externals outside; sibling models across not yet drawn |
| 5 | **why are some blocks rounded?** chips should not be; actors may be | rounding was actors (and a state machine's states); **chips are never rounded**, an actor's card still is | built 2026-11-21 (stage `flow.css`; design.md, chip.md) |
| 6 | **the presentation is weak**, yet it is a new user's main entry; it must not be an afterthought | presentations.md (decided): the main entry. *Presentations first* below: a drafted full tour, a quality bar `check` enforces, a story guide, and its own task and score in every round | to build (*Next* 3) |
| 7 | **simplify the tools until near foolproof**; the agent decides scope, diagram choice, parts and presentation only | *Simplify the surface* below | to build (*Next* 3) |


## Simplify the surface

What the agent did by hand in round 5, and the tool that takes it over (to build in this order; each checked by the next round's command count and friction log).

| Agent does today | Becomes |
|---|---|
| package.json written by Claude, imports and folders guessed | **`mnd init <project> <folder>`**: the workspace file importing the translator's package, its shown packages, one overview model and its folder |
| a fact answer saved as JSON, pruned by script, then `define` | **`mnd define <folder> --unit hc --depth 2 [--keep …]`** asks the facts itself; the classes of the modules picked come with them |
| a fact answer saved as JSON, then `draw` | **`mnd draw <kind> <model> --from trace "<run>" \| imports --unit … \| classes --unit …`** asks the facts itself and writes into the model's folder, named and ordered |
| model files and folders written by hand; order by alphabet or weight | **`mnd model <name> [--under <model>]`**: the model file, its folder and its order prefix; sub-models listed in the parent's order |
| a highlight by hand-written definitions and retyped units | **`mnd style <definition or units…> --hue n`**: a definition extending the kind, the units retyped; `mnd look` shows it |
| state, swimlane, mapping and dataflow written as JSON from memory of the docs | **`mnd draw <kind> --example`** prints the kind's selection to fill; a later round asks whether any of them can come from facts (a model's choices for state, `entries` for swimlane lanes) |
| hand-written lines look as authoritative as fact-drawn ones | decided (the user, 2026-11-21): **every relation is treated the same however it was made**; a fact may give a line a name or a type by its role (*calls*, *imports*), nothing marks how it was made |

**One page an agent reads first**: docs/tools/workflow.md — the four decisions, then the commands in order, nothing else; tools README stays the reference.


## Presentations first

A presentation is a new user's main entry (presentations.md). Round 5's were a few stops of one sentence, stepping little through what the diagrams draw.

| Step | Does |
|---|---|
| **a full draft** | `mnd presentation draft <model>` composes a whole tour, not one stop: the overview first, then each sub-model in order, each diagram shown and stepped through its lines or messages in order, sentences drafted from descriptions and line names, `into` each sub-model's presentation; the agent rewrites the words and cuts (built in *Next* 2c) |
| **a story guide** | presentations.md gains *Writing one*: the arc (what the system is for → who uses it → its main use, step by step → what it keeps → where to go next), one idea per stop, every step a sentence about what is lit |
| **a quality bar** | `presentation check` warns below it: a stop without steps, a shown diagram whose lines are not stepped, a stop summary repeating its title, a model with sub-models but no `into`, a tour that never opens a diagram, a diagram no tour visits |
| **in every round** | the brief's presentation task is scored as a first-class result: played in the app by Claude, judged for what a new user learns |


## Views pass (2026-11-21, round 5's output)

| Kind | Found | Status |
|---|---|---|
| library definition (accounts, api) | across cards joined to nothing, one bus; six cards all *transport* | fixed: part-to-part edges, siblings across, in/uses split; shared runs 27 → 3 |
| context | actors and externals laid inside the frame (the file declared them again as plain blocks); the stage grew the frame round across lines | fixed: a context's world drawn across by kind; `check` says the bare repeat; the frame never grows for across lines |
| a model entered | no frame | fixed (*Next* 1) |
| state | a transition's name covers another (measured) | fixed: every name of a drawing placed together, each clear of the names before it (views `drawn.ts`); covers 8 → 4 over the trial and the example, the rest a name over a card where its legs leave no clear place |
| flow | one long row in a tall frame: text tiny | fixed: a row far from the canvas's shape wraps into rows between steps (state too, sharing flow's layout); `mnd measure` says each drawing's **fit** and flags below 60% |
| mapping | the writes column cuts its text | fixed: a record quoted whole (`"a -> b: info"`, as the agent wrote them) now splits its info off — it had landed in *writes*; columns as wide as their text, a longer one wraps; a heading repeating its one row dropped |
| sequence | names tiny where the participants run wide; some cards grow far past their cell (Alert sequence) | decided (the user, 2026-11-21): **columns stay the standard card width**; a name wraps within its card and is cut past it, the whole name read on hover or pick. Built: a grid's cell holds a standard card, a reference too (views `size.ts` `size_of`; a reference had taken its source's size) |
| swimlane, dataflow, class, entity | whole; dense | no change |

## Decisions (2026-11-21, later)

| Decision | Status |
|---|---|
| **every diagram respects the canvas's aspect**: a layout by shape (portrait or landscape) in every kind; a long flow wraps into rows rather than running one thin line | built 2026-11-21 for flow and state; a dataflow ranks by role and does not wrap; the sequence is open (*Views pass*) |
| **presentations are the central UX**: canvas player + caption, play/pause, auto-play through stops, ▶ on every chip enters and plays, tray pinned to the model on its overview | built 2026-11-21 (presentations.md *Played through*, *The player*) |
| **never lose your place in a presentation** (the user, 2026-11-21): the card a step lands on rings as the current block; the camera holds while the step is in view, else pans only as far as needed, inside the drawing (centring moved too much and lost the frame) | built 2026-11-21 (web `present.ts` `step_of`, `drawn_as`; `camera.ts` `follow`; stage `room.ts` `glide`) |
| **a stop's drawing lands in place** (the user, 2026-11-21: Check states offset on entering) | fixed: the chip is flown to where the entered drawing will stand, not to the stop's fit box; the camera holds while the next drawing is laid |
| **marks that say what a block is** (the user, 2026-11-21): actors a head and shoulders, code kinds their own | built: actor and external as roles; `card.icon` on defs `code` (function ƒ, class, module, interface, component, type, value, package, actor); a stand-in wears its target's mark. Raised: a use written `{name, of:}` without `type: reference` is no reference to core (`is_reference`), only the marks follow its `of` |
| **references rethought** (the user, 2026-11-21: over-used; sequence and matrix blocks showing as references unhelpful; the short syntax wins) | built: **`of:` alone** — naming a definition, a usage typed by it; any other block, a stand-in (`type: reference` never written; samples/elements updated); **a stand-in looks exactly as its target** (no `Ref`/`Pkg` stamp; its icon, look and data its target's). design.md, definitions.md, design/language.md updated. Open: whether class/entity blocks (references to definitions by kind default) and kind defaults generally need the same rethink |
| **expand the presentation concept** (walking a user through the model's dimensions and perspectives) | decided (the user, 2026-11-21): **one guided tour over the whole model**, through its sub-models and their diagrams; **the agent's tools draft it** (no fixed product tour assumed). Shape (the user, 2026-11-21): the top tour gives an overview of each sub-model and leads `into` its own tour (each also plays alone from its chip's ▶); a library stop is the agent's choice, never required or barred; the draft is saved to the model file, and `check` warns of a diagram no tour visits. Built 2026-11-21 (*Next* 2c) |

## Next

| # | Work | Done when |
|---|---|---|
| 1 ✓ | **view decisions of 2026-11-21** (built, `3678807`; package order added after): package visibility (file key, explorer toggle, maps honour it; the `init` default lands with 3a); explicit order (collect keeps order prefixes, the treemap keeps given order, overview first; `mnd model` writes prefixes in 3a); a model entered is framed | round 5's model opens with `base` hidden, Overview first, its sub-model views framed |
| 2 | **views that reliably make sense** (built 2026-11-21 but the sequence, which waits on the user; *Views pass*): the library definition view (accounts) draws across only what a line reaches, and `define`'s edges reach the walls; `measure --views` counts loose blocks; a pass over each kind on round 5's output (context, flow, dataflow, state, sequence, swimlane, mapping, class, entity, tree, a model's frame) fixing what does not read | `measure --views` clean on every view of round 5's output; Claude's look at each kind finds nothing loose, cut or crossing the frame |
| 2b ✓ | **the presentation player** (the user, 2026-11-21): canvas player + caption, play/pause, played through, ▶ on every chip, tray pinned on the overview | built (uncommitted); presentations.md *Played through*, *The player* |
| 2c ✓ | **one guided tour over the whole model** (built 2026-11-21, uncommitted: `mnd presentation draft <folder>`, presentations.md *Drafted*; `presentation check` warns of unvisited diagrams — round 5's tours skip four; a shown diagram fits whole with the player's room; a last stop leading `into` no longer re-enters on the way out. Played in the app on samples/trial/fresh) (shape agreed 2026-11-21, *Decisions*): `mnd presentation draft` writes, from the model's tree, a top tour (what it is → a stop per sub-model, overviewing it, `into` its tour → where next) and a tour per sub-model (its overview, then each diagram shown and stepped in order); the agent rewrites the words, cuts, and may add stops anywhere (the library included); saved to the model files; `check` warns of a diagram no tour visits. Also: a stop showing a diagram leaves the player's room | a new user can start at the map and be carried through healthchecks by ▶ alone; `check` clean on the drafted tours |
| 2d | **diagram cleanup** (the user, 2026-11-21: much to do from what they see): the example's line crossings (44, Shop, Gateway, the patterns) and the rest found by `measure` and by looking; **paths on the treemap made legible** (messy now) | `measure` near clean on every sample; the user finds the map's paths readable |
| 3a | **simplify the commands**: `init`, `define` and `draw` asking facts themselves, `model` (writes the order prefix), `style`, `draw --example`, docs/tools/workflow.md | a run through the workflow page by hand on healthchecks needs no JSON file and no hand-written YAML but the hand-drawn kinds and the words |
| 3b | **presentations first**: the full draft, its check (the quality bar), the story guide in presentations.md | round 5's model drafts a tour that passes the bar, played in the app by Claude |
| 4 | **round 6** on Haiku and Sonnet: the brief rewritten around the agent's four decisions (*The brief*), the workflow page first; counted: commands run, files written by hand, minutes | both finish with fewer commands than round 5, no scripts, presentations that pass the bar; Claude plays each presentation |
| 5 | **TypeScript follows the same model** (order 2b of 2026-11-19): its facts behind `define` and `draw`, fact names reconciled with Python's | after round 6 settles the surface |


## The loop

| Step | Who | Does |
|---|---|---|
| 1 | Claude | writes the round's brief (samples/trial/brief.md, `{MODEL}` replaced): the tasks, what changed, the docs to read |
| 2 | subagent | carries out the brief in samples/trial using only the CLI, the files and the docs; never reads mndflow's source; keeps a friction log beside its folder |
| 3 | Claude | inspects: `check`, `measure --views`, `look`, and **each diagram and presentation in the app** (*Handoff*: how); scores the tasks |
| 4 | Claude + user | findings become changes; the user agrees the bigger ones |
| 5 | Claude | builds, archives the round's output and logs, clears samples/trial, starts the next round |

| Rule | |
|---|---|
| **alternate models** | each brief runs on Haiku and on Sonnet in parallel; where both stumble the surface is at fault; where only Haiku does, the docs are too thin |
| **CLI and files** | the `mnd` commands and the files they write; MCP compared once the CLI settles |
| **the subagent reads only what a user would** | docs/tools, docs/diagrams, presentations.md, design.md, `mnd --help`; the samples as examples |
| **output** | samples/trial/<model>/, a source folder; its log at samples/trial/<model>-log.md; scratch at samples/trial/<model>-scratch/ (deleted after) |
| **no tests** | the round is the check; `check` and `measure` are the guards |


## The subject

**healthchecks** (Django, BSD-3; picked 2026-11-19), cloned beside this repo at `../healthchecks` with a `.venv` for `trace`, never vendored. Its uses: a ping (sequence, flow, mapping), an alert when a check goes down (sequence, swimlane, dataflow, flow), a check's status (state), its records (class, entity), the transport family (class), the system in its world (context).


## The translator

**Tools that list a system's components, parts and relations; the agent picks** (2026-11-19, every translator). Pointed at part of the code (`--unit`) at a level of detail (`--depth`, levels below the target); every fact names its source. Python's is apps/py (`mndpy`), run by cli `python.ts`: `units` (`ast`), `imports` (`grimp`; the standard library apart), `classes` (`ast`; Django fields and keys), `entries` (scripts, commands, routes), `calls` (static, unresolved counted), `trace` (a real run's calls by a profile hook, tests left out; a failed or empty run refused). One `code` package of kinds serves every language.


## The brief

From round 6 the tasks follow the agent's four decisions; the tools do the rest.

| # | Task | Decision it tests |
|---|---|---|
| 1 | **scope**: the parts of healthchecks worth modelling, at the grain that reads, made the library | scope |
| 2 | **highlight** one subset (the alert path) by its definitions' look; confirm with `look` | scope |
| 3 | **the diagrams**: for each use case, the kinds that answer it best — one of each kind across the project — each drawn from facts where the kind allows | which diagram fits |
| 4 | **the models**: one overview, decomposed by use case, in a deliberate order | how to present |
| 5 | **the presentations**: a full tour from the overview into each sub-model, stepping through its diagrams; passes the bar | how to present |
| 6 | **read it back**: answer two questions from the model alone (what happens when a check goes down; which components a ping touches, in order) | — |
| 7 | **change it**: rename and move a definition, re-translate a part finer; `check` says what drifted | — |
| 8 | **the friction log**: every command, error, guess and doc looked up; counted commands and hand-written files | — |


## Rounds

| Round | Haiku | Sonnet | Changed after it |
|---|---|---|---|
| 1 (2026-11-19) | all tasks, `check` clean | all tasks, `check` clean | `define` as containment; names everywhere; strict `check`; workspace `overrides`; `draw` validation |
| 2 (2026-11-20) | 6 of 8 | 6 of 8 | `draw` from facts at the library's scale; drift said; `define` additive |
| 3 | 8 of 8 | 7 of 8 | facts matched by source; library holds structure (user); sequence rows; tables held; field lines |
| 4 | 6 of 8 | 8 of 8, one overview decomposed into 6 models | root diagrams fixed; `define --keep`; folders as lift targets; names kept visible; swimlane one step per cell (user); crumbs follow the canvas |
| 5 | 8 of 8 | 8 of 8, **reviewed by the user** | self-calls; marks in a shown diagram; `trace` failures said; inline grafting; `look`; examples; two-line step names |

Highlight colours were never seen by an agent before `look`; presentations were never played but by Claude.


## What the rounds built

| Area | Now |
|---|---|
| **library** (`define`) | packages as folders, units as definition files with parts inline, classes under `types/<module path>/`, cross-definition relations as `package.json` edges; re-run adds new files, grafts new parts into edited ones at every depth, finds moved or renamed files and parts by `source`, places a finer pick under its holder, refuses one already inline; `--keep` units and classes |
| **diagrams** (`draw`) | from facts — sequence and flow from `calls`/`trace`, context from `imports` (outside packages named, not drawn), class and entity from `classes`, overview from `units` — or a selection; drawn into a source folder, every end lifts to the library's scale (matched by source unit, folders as a last resort), what is left out named; `--keep`; refuses unread keys, dotted names and two steps in a swimlane cell; checks what it wrote |
| **check** | made-up types, tags and `of:` in every file naming them; dangling `package.json` edges; overrides' looks; door messages name the cause and fix, *read past (the files are unchanged)*; one-line errors |
| **format** | names everywhere; workspace `overrides`; the library holds structure (a package kind's YAML is a library definition, never a model) |
| **presentations** | steps and marks resolve in a shown diagram, through a usage too; `into` a contained model; `draft` rolls back what fails |
| **views** | sequence rows per message, self-messages as loops; tables held with `+N more`; field lines on class and entity; names kept visible (chip floor, two-line step names); the state frame holds its routes; crumbs follow the canvas; chips never rounded; **2026-11-21**: packages shown by the workspace's `shown` and a viewer's eye, ordered by `package_order` (dragged); order explicit (prefixes, overview first, never by weight); an entered model framed; what is across at the part's own scale (lines from the inner part, siblings across, in/uses by direction); a context's actors and externals drawn across by kind |
| **presentations in the app** (2026-11-21) | a canvas player and caption; play/pause; played through stops, into and out; ▶ on chips and cards enters and plays; the tray pinned to the model on its overview, the stop opened in place; a calm camera leaving the player's room |
| **guards** (2026-11-21) | `measure` covers library definitions and fails on a loose block; `check` says a bare repeat of an actor or external; `define`'s package edges name parts by path, so they survive moves |
| **reading back** | `mnd look` lists blocks by resolved hue; example selections for every hand-drawn kind |


## Open

| Item | Leaning |
|---|---|
| ORM writes invisible to `trace`: *which records does an alert write* is unanswered | dropped from the brief for now (the user, 2026-11-21) |
| a diagram named like a definition shadows it, the message in ids | the message names both files and says to rename one |
| crowded state labels overlap; a wide sequence participant passes the grid's edge | in the views pass (*Next* 2) |
| a stop showing a diagram sits under the player | fixed 2026-11-21: a shown diagram is fitted whole, the player's room below |
| lines to what is across draw dimmed with the outside, their names faint | judge in the next look; may need the names at full strength |
| fact names differ by language | reconcile in *Next* 5 |
| which kinds are structure and which are use | structure: class, entity, tree, a definition's context; use: the rest; the rounds show |


## Relation to other plans

- scale-plan.md *Next* and model-plan.md orders 6–9 pause; their items are taken when a round finds them
- backlog.md *CLI* (the full pass over the file-based surface) is this plan's work


## Handoff

| What | Where |
|---|---|
| **committed** | rounds 1–5 `5c9e445`; *Next* 1 `3678807`. **Uncommitted**: package order; *Views pass* (cli `define.ts`, `measure.ts`; core `sources.ts`, `defs.ts`, `fold.ts`, `door.ts`, `types.ts`, `actions/definitions.ts`; views `across.ts`, `block.ts`, `layer.ts`, `measure.ts`; stage `Flow.tsx`); the player (web `present.ts`, `camera.ts`, `App.tsx`; stage `Player.tsx` new, `Stage.tsx`, `flow.css`; theme `header.tsx`, `icons.tsx`, `face.css`; tray `Overview.tsx`, `Presentation.tsx`, `tray.css`; explorer `Explorer.tsx`); docs. Last (2026-11-21, end): core `sources.ts` (`of:` alone), `names.ts` (`stamps_of`, `icon_named`, `standing`, roles), samples/elements (`1-blocks.yaml`, `elements.json`). Since (2026-11-21, later): views `flow.ts` (wrap), `size.ts` (a cell's card standard), `drawn.ts` new (names placed together), `measure.ts`, `records.ts`, `index.ts`; stage `Flow.tsx`, `Wire.tsx`, `nodes.tsx`, `flow.css`; core `diagram.ts` (quoted records); cli `measure.ts` (fit), `tools.ts` (`tour`), `main.ts` (`draft <folder>`, `unvisited`); web `camera.ts`, `present.ts` (follow the step), `App.tsx`; stage `room.ts` (`glide`, `landed`); core `names.ts` (`icon_named`, roles); theme `icons.tsx`, `chip.tsx`; views `look.ts`, `map.ts`, `scene.ts`; explorer `rows.ts`; defs `code` blocks, public/packages/code.json; docs. Typecheck clean, 303 tests pass, every sample checks clean. Suggested message: `Package order; views pass (part-level edges, across at sibling scale, context world, loose guard, flow wrap, names placed together, records columns, standard cell cards); presentation player, whole-model tour draft, step follow; marks by kind; of: alone, stand-ins look as their targets` |
| **the review copy of 2c** | samples/trial/fresh: round 5's files with only the drafted tours (`mnd presentation draft samples/trial/fresh`), collected to samples/trial/fresh.json; open with `workspace: /samples/trial/fresh.json`, ▶ on the Overview chip. Not in git |
| **the review candidate** | samples/trial/sonnet (round 5) and its collected samples/trial/sonnet.json; logs samples/trial/haiku-log.md, sonnet-log.md. Open it with `workspace: /samples/trial/sonnet.json` in mndflow.yaml, or `collect --workspace` and import. **Edited 2026-11-21** as an agent following the new messages would: `package.json`'s `define.*` edges regenerated part to part (`define` on `units`+`imports` of `hc` at depth 3, `--keep` its 22 leaf modules, the YAML it grafted discarded); `overview/context.yaml` drops its four repeated actors and externals; one step in `overview.yaml` names `Notification service` bare. samples/trial is not in git |
| **a round** | the brief at samples/trial/brief.md (`{MODEL}` for haiku or sonnet); seed each folder with a bare package.json importing `code` (until `mnd init`); launch both as background subagents |
| **looking in the app** | `npm run dev` (read the port from its log, colours stripped); Playwright on Edge (`chromium.launch({ channel: "msedge" })`), a script copied into the repo root to run (it resolves `playwright` there) and deleted after, routing `**/mndflow.yaml` to a body naming the trial's collected workspace; under Git Bash pass `/samples/…` with `MSYS_NO_PATHCONV=1` and screenshot paths as `C:/…` (a `/c/…` path lands under `C:\c\`). Ways in: an explorer row's double-click (only rows listed, so open the model's row first); a map chip by `.react-flow__node` with its name, `nth` where names repeat; a presentation by its chip's `[data-play]`, read back from `.mnd-player-where` and `.mnd-player-caption`. Read every screenshot. **Stop every dev server you start** (`taskkill` its node; stopping the shell leaves vite running) |
