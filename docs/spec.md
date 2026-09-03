# Spec

**What crosses packages, and the rules every package obeys.** Short statements of the target. **What one package alone decides lives in that package's `docs/`** — this file does not repeat it. The reasoning is in design.md, which is authoritative; the vocabulary is in definitions.md.

mndflow is a client-only app for rapidly composing descriptive blocks into systems models. **There is no server**: one log lives in the session, and the graph is folded from it.

**The one law.** Dependencies run one way, and **only `core` may name a closed set** — anything else enumerating sorts of things is doing the engine's job in the wrong place. Both halves are a test, and the monorepo README owns the map they are tested against.

**Boundaries exist to enforce direction and to let each package be proven on its own.** They are not an API surface anyone has to keep; one version, never published, and a boundary that turns out wrong is moved in one commit.


## The packages, as workspaces

```
packages/
  core/        @mnd/core       graph, log, door, actions, ports
  layout/      @mnd/layout     placement, routing
  views/       @mnd/views      block · table · matrix, each -> Scene
  defs/        @mnd/defs       the definition packages. data, no code
  theme/       @mnd/theme      the ramp, css only
  fixtures/    @mnd/fixtures   sample logs, and sample files for the seam
  render/      @mnd/render     Scene -> React
  explorer/    @mnd/explorer   the tree
  stage/       @mnd/stage      the working area
  options/     @mnd/options    the control rail
  tray/        @mnd/tray       what the open layer holds
  terminal/    @mnd/terminal   the strip
  kit/         @mnd/kit        the seam, built and packed
apps/
  web/         @mnd/web        the product
  cli/         @mnd/cli        the harness
```

**One surface, one package, and never a `ui` package.** Five panels split five ways is what keeps
one of them from quietly doing another's work, and each carries its own dev server — which is what
makes a surface runnable before the app that hosts it exists. **`views` stays one package**: the
three modules share the projection machinery and none of them is separately runnable.

**This tree is the shape, not the arrows.** The monorepo README owns the dependency map, and the law
test keeps the workspace graph in step with it.


## Running one thing in isolation

**Every surface package carries its own `dev/index.html` and its own Vite root.** No central
harness, so no package depends on one, and a harness holds the state its component refuses to.

```
npm run dev   -w @mnd/explorer          # one surface, over a fixture
npm run dev   -w @mnd/stage             # and the same for options, tray, terminal
npm run dev   -w @mnd/web               # the assembled app

npm run start -w @mnd/cli -- fold related   # the harness, headless
npm run build -w @mnd/kit                   # the seam, then npm pack -w @mnd/kit

npx vitest run packages/core            # one suite, from the repo root
npx vitest run                          # all of them
```

**A suite runs from the root, never from the package.** `npm test -w @mnd/<name>` lands where there
is no vitest config: it passes for `core`, finds no files in half the others, and loses the DOM
environment in the rest. **The path is the filter**, and it is the one form that works everywhere.


## The claim it all rests on

```ts
project(graph: Graph, layer: Id | null, config?: Config): Scene
```

```
Scene {
  layer:  Id | null
  frame:  { x, y, w, h, label }      <- absent at the root, which has no outside
  boxes:  [{ id, x, y, w, h, label, def, on, link, marks }]
  routes: [{ id, from, to, points, module, dir, label }]
  slots:  ["arrange" | "interfaces" | "lines" | "columns" | "types" | "relations"]
  hits:   [{ on, region, kind }]
  bounds: { w, h }
  trail:  [{ id, label }]
}
```

**A view module returns data, never elements.** Plain data, importing nothing drawable. This is the single change the architecture is built on: a notation becomes a pure function, a translator reuses the projection instead of reimplementing it, and most of the product is provably correct before anything is drawn. **Only what draws needs a browser.**

**It held.** Every rule below assumes it keeps holding, and anything that needs to break it is something to redesign rather than to allow.


## The seams

**Three type surfaces, and they are the only things two packages ever agree about.** Everything else a package keeps to itself.

| Seam | Between | Is |
|---|---|---|
| **the graph** | every headless package | blocks, relations, definitions, fields. Named by `core`, which alone may close a set |
| **the Scene** | `views` → `render`, `cli`, `kit` | plain data, importing nothing drawable. **A producer proves its output is well-formed; a consumer proves it draws anything that is, and neither imports the other** |
| **the ports** | `core` → the apps | the entire host contract, declared in one place and bound in an app |

**An action name is the fourth thing, and it travels one way.** Every surface emits one and none runs one — the app does. **A gesture returns a name, the app runs it, it returns mutations, the app appends them.** That loop is the whole product, and if it turns out to be interesting a seam is in the wrong place.

## Ports

**Declared in core, bound by an app, implemented nowhere else.** The detail is core's `ports.md`; what crosses is the set and who answers it.

| | Is | `web` | `cli` |
|---|---|---|---|
| `storage` | where the log and the session live between runs | session storage | a file |
| `files` | anything leaving or entering — export, import, a rendered drawing | download / picker | `fs` |
| `net` | fetching something from outside the workspace | `fetch` | `fetch` |
| `score` | text similarity, for ranking | the scorer, lazily | absent |

- **Nothing but a port may assume where the workspace lives.**
- **An unbound port is a capability the app does without**, never a feature reimplemented. With no `score`, ranking falls back to substring and everything else still works.
- **A new capability is a port or it is a package**, never a direct reach for a browser API from somewhere that is not an app.
- **Ports stay four.** A fifth is a claim that a host has to answer something new, which is nearly always a package instead. **`storage` and `files` are declared and bound; `net` and `score` are neither.**


## The surfaces

**Branding, navigation and the workspace. They own nothing about a diagram.** Every component is a pure function of its props: it holds nothing, and every gesture leaves as an action name somebody else runs.

**One surface, one package, and never a `ui` package** — `explorer`, `stage`, `options`, `tray`, `terminal`. Five panels split five ways is what keeps one of them from quietly doing another's work, and **only two of them know what a Scene is**. Each carries its own dev harness, which is what makes a surface runnable before the app that hosts it exists.

**One page**: header, optional terminal, then explorer beside the stage, options to the right.

**One surface, one job.** What each draws and refuses is its own `docs/` — the explorer's tree, the stage's gestures, the options rail's groups, the tray's table, the terminal's four commands.


## Naming, and one channel

- **A name is written the way it was typed** and shown the same way everywhere. **Unique among siblings** — where something sits is what makes it unique.
- **An unnamed block falls back to its role and its number** — `block 1`, `interface 2`. **A note is exempt**: a note *is* its text.
- **A block that says nothing and stands for exactly one thing is named after what it stands for**, with its definition's verb in front, and **drawn dimmed** — a guess that cannot be told from a statement is the mistake worth designing against.
- **A name is edited where it is drawn.** `Enter` commits, `Esc` abandons.
- **Everything the app says goes to one strip** — a refusal, a repair report, a storage warning, a rule note. One place to look, dismissable, and silent when there is nothing to say.


## What a view holds

**A block is a block.** There is no structure/behaviour split and no tier walk — what a block *is* comes from its definition, and what it may hold is a rule a vocabulary states rather than one the engine imposes.

**One rule is the engine's**, and it is the only place a choice is taken away from the user:

> **A view holds references, never parts.**

- **Crossing it is a coercion, not a refusal.** Every gesture still succeeds; what arrives in a view is an appearance rather than a part, and it draws the way every reference draws.
- **A reference points at what it stands for, and nothing points back.** Upward is a derived query, never stored — a stored back-reference would leave an exported subtree pointing at things that did not travel with it.

**Every package obeys it and none of them enforces it**: the walk is core's, in `schema.md`, and the drop rules that fall out of it are in `actions.md`.


## What travels

**A file is state, never history.** The log is a workspace concern and never leaves; what crosses any boundary — a file, the seam, a translator — is a graph.

- **An export is the graph, not the log.** Self-describing, and readable without replaying anything against the engine that wrote it.
- **A log is not a file.** The reader takes envelopes only, so nothing can hand the engine a history it did not write itself.
- **Session state stays out**, `meta` included: opening somebody's file must not rearrange your toggles.

The envelope, the canonical layout and the door are core's `engine.md`.


## kit

**The one surface offered outside this repo, and it speaks in state.** The whole headless stack as one built package — `kit`, `kit/react`, `kit/react.css` — bundled so nothing outside sees a workspace. **Packed, never published.**

**The log, the steps, the mutations, the session and the action registry are internal.** A log is a history of intent replayed against one engine: reading one means matching this build's mutation semantics, its defaults and its action set, version for version. A graph is a statement of fact — validatable without executing anything, and stable across builds.

> **A signature naming `Log`, `Step` or `Mutation` is internal. Graph to graph, and graph to Scene, is the seam.**

| | Is |
|---|---|
| `base_graph` | a fresh workspace with the floor already in it |
| `open` | a file in, as a graph — validated at the door and repaired where it can be |
| `validate` | what a graph violates. **Mending it stays the engine's** |
| `write` · `write_subtree` | a graph out, in the canonical layout |
| `project` · `draw` · `draw_svg` | a layer as a Scene, as text, as a standalone drawing |
| `Viewer` | the same layer as an **interactive** artifact — walkable, and not editable |

**What is sealed, and there are no exceptions to look up:** the log, the steps, the mutations, the session, the action registry, and `layout`. A consumer places nothing, because projecting is what places and the Scene already carries the geometry.

- **A consumer says what a model *is*, never what changed.** Round-tripping is read a graph and write a graph, and diffing belongs to whoever cares. **This is the price of a mutation union that stays free to grow**, and it is the right one — a new sort of change costs nothing outside because nothing outside can name one.
- **The engine keeps its own reader.** `read` produces the log a session works in and is not offered; `open` is the same journey one step later.
- **The export list is written out.** `export *` from the engine is how the log leaks, so what ships is named one by one.
- **An embedded view is interactive and still an artifact.** `Viewer` holds a graph, projects the layer being looked at, and walks in and out of layers. The renderer underneath offers drag callbacks meaning move, seat, wall and relate; they are not re-exported, so **an edit is unreachable rather than merely unadvised**.
- **`kit` is the one package that adds code**, and it is one component. The rule it keeps is dependency direction, which a viewer built from packages `kit` already carries cannot break.


## apps

**An app binds ports and composes packages.** It adds no behaviour and no second copy of anything.

```
bind ports  ->  hold the log  ->  fold  ->  project  ->  render
                     ^                                      |
                     +-------------- action ----------------+
```

**Every gesture returns an action name, which the app runs, which returns mutations, which it appends.** That loop is the whole app, and **if it turns out to be interesting a seam is in the wrong place**.

| | Is |
|---|---|
| `web` | Vite. **The primary product** |
| `cli` | headless. Folds, checks, runs actions, projects a layer to text, exports |

**The CLI is the harness that makes the rest provable.** A passing suite proves the code agrees with itself; the CLI proves the packages compose — that a log folds, an action writes, a layer projects, and a Scene is complete enough to draw from, with no React anywhere in the process. **When a track can be driven from the CLI it is done being built in the dark.**


## tests

**Properties, never values.** Nothing asserts a coordinate, an id, a message or a count that tuning would change — the suite pins what must stay true, not what happens to be true.

**Two kinds of sample data, because there are two ways in.** A **log** fixture proves the engine agrees with itself — it folds what this build wrote, through the door this build owns. A **file** fixture is a graph this engine never wrote, hand-written and mostly wrong on purpose, and it is the only thing that proves the outward seam repairs rather than folds a broken graph. **After `open`, `validate` finds nothing left** — that is the property, not the wording of any fault.

**Contract tests, never integration tests.** A producer proves its output satisfies the invariants; a consumer proves it handles anything that satisfies them. **Neither imports the other.** When they meet in an app there is nothing left to discover.

**A component is a pure function of its props.** No component reaches for state, storage or a graph — the explorer takes a tree and emits an action name, the stage takes a Scene and emits one. **The app is the only stateful thing in the repo**, and this is the rule that makes an isolated dev server possible at all: a component with no way to fetch anything can always be handed a fixture.

**A dev harness holds the state the component refuses to.** It folds a fixture, hands the result down as props, and logs every action emitted. **Every surface package carries its own Vite root**, so no package depends on a central harness.

| Package | Proven by | Needs a browser |
|---|---|---|
| `core` | fold determinism, door repairs, undo-by-refold, file round-trip, byte-identical re-export | no |
| `layout` | no overlap, on the grid, stable under reorder, every elbow square, no two ends share a seat | no |
| `views` | Scene invariants per module, over text projections of **shape, not coordinates** | no |
| `defs` | every shipped definition passes the door; every module it names exists | no |
| `fixtures` | every log folds clean, and **every file the seam opens leaves nothing for `validate` to find** | no |
| `kit` | packed, then a graph, a file and a drawing built from outside the workspace | no |
| `render` | one conformance test: every Scene element draws, every hit binds, over **hand-written** Scenes | yes |
| `explorer` · `stage` · `options` · `tray` · `terminal` | driven, not asserted | yes |

- **The dependency law is a test**: the workspace graph matches the map the monorepo README owns, no package outside `core` declares a closed set, and nothing imports a deep path.
- **Design first, test second.** While a design is still moving, running the thing is the verification that counts.
- **Driving the app is the acceptance test**, and a green suite closes nothing on its own.
