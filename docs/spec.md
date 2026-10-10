# Spec

**What crosses packages, and the rules every package obeys.** Short statements of the target. What one package alone decides lives in that package's `docs/`; the model's rules and their reasons are in design.md, which is authoritative; the vocabulary is in definitions.md.

**There is no server**: one log lives in the session, and the graph is folded from it.

**The one law.** Dependencies run one way, and **only `core` may name a closed set** — anything else enumerating sorts of things is doing the engine's job in the wrong place. Both halves are a test. **The package map, and what each may depend on, live in the monorepo README under `packages/`** and nowhere else.

**Boundaries exist to enforce direction and to let each package be proven on its own.** They are not an API surface anyone has to keep: one version, never published, and a boundary that turns out wrong is moved in one commit.


## Running one thing in isolation

- **Every surface package carries its own `dev/index.html` and its own Vite root.** No central harness, so no package depends on one; a harness holds the state its component refuses to.
- **A suite runs from the root, never from the package.** `npm test -w @mnd/<name>` lands where there is no vitest config. **The path is the filter** (`npx vitest run packages/core`), the one form that works everywhere.


## The claim it all rests on

```ts
project(graph: Graph, layer: Id | null, config?: Config): Scene
```

```
Scene {
  layer:   Id | null
  frame:   { x, y, w, h, label, role, side, ports, seats }   <- absent at the root, which has no outside
  nodes:   [{ id, type, position, width, height, data }]     <- card, note, group, grid, seat
  edges:   [{ id, source, target, handles, label, data: { module, dir, wire } }]
  perches: [{ edge, end, on, side, at }]                     <- where an end meets a border
  slots:   ["layer" | "display" | "relations"]
  trail:   [{ id, label }]
}
```

**A projection returns data, never elements.** Plain data, importing nothing drawable: a notation becomes a pure function, a translator reuses the projection instead of reimplementing it, and most of the product is provably correct before anything is drawn. **Only what draws needs a browser.** Anything that needs to break this is something to redesign rather than to allow.

**Nodes and edges are in React Flow's own shape**, its types imported for shape and erased at build, so nothing headless resolves React. `stage` hands them straight to the canvas; the `cli` draws them as text and SVG with React Flow's own path functions. **Where a line runs is the projection's** (`views/avoid.ts` round cards by libavoid, `views/route.ts` where it is not loaded), so the canvas and the SVG export draw the same path; the stage routes from its nodes as they stand, so a drag routes as its drop will. libavoid is a wasm the app loads once at start (`load_avoid`). Hit testing, the viewport and the drag stay React Flow's.

**`views` is one package and there is one way to draw.** Sizes, placement and routing live with the projection because they are one answer, and none of them is separately runnable.


## The seams

**Three type surfaces, and they are the only things two packages ever agree about.** Everything else a package keeps to itself.

| Seam | Between | Is |
|---|---|---|
| **the graph** | every headless package | blocks, relations, definitions, fields. Named by `core`, which alone may close a set |
| **the Scene** | `views` → `stage`, `cli`, `kit` | plain data, importing nothing drawable. **A producer proves its output is well-formed; a consumer proves it draws anything that is, and neither imports the other** |
| **the ports** | `core` → the apps | the entire host contract, declared in one place and bound in an app |

**An action name is the fourth thing, and it travels one way.** Every surface emits one and none runs one — the app does. **A gesture returns a name, the app runs it, it returns mutations, the app appends them.**

**A canvas adjustment is the one gesture that comes to several writes.** The stage works out what a drag or a drop means and hands the list over; the app runs it inside `session.batch`, so **one gesture is one step** and undoes as one.


## Ports

**Declared in core, bound by an app, implemented nowhere else.** The detail is core's `ports.md`.

| | Is | `web` | `cli` |
|---|---|---|---|
| `storage` | where the log lives between runs | IndexedDB, each body stored once by hash; read before the app mounts | a file |
| `files` | anything leaving or entering — export, import, a rendered drawing | download / picker | `fs` |
| `net` | fetching something from outside the workspace | `fetch` | `fetch`, or a local path |

- **Nothing but a port may assume where the workspace lives.**
- **An unbound port is a capability the app does without**, never a feature reimplemented.
- **A new capability is a port or it is a package**, never a direct reach for a browser API from somewhere that is not an app.
- **Ports stay three**, each bound through the session.


## The surfaces

**Branding, navigation and the workspace. They own nothing about a diagram.** Every component is a pure function of its props: it holds nothing, and every gesture leaves as an action name somebody else runs.

**One surface, one package, and never a `ui` package** — `explorer`, `stage`, `options`, `tray`. Four panels split four ways keeps one from quietly doing another's work, and **only two of them know what a Scene is**. What each draws and refuses is its own `docs/`.

**One page**: header, then explorer beside the stage, options to the right, the tray below the stage.


## Naming, and one channel

- **A name is written the way it was typed** and shown the same way everywhere. **Unique among siblings** — where something sits is what makes it unique.
- **An unnamed element shows its handle** — `B1`, `I2`, `L3` — a serial minted once per kind and never rewritten. **A note is exempt**: a note *is* its text.
- **A block that says nothing and stands for exactly one thing is named after what it stands for**, with its definition's verb in front, and **drawn dimmed** — a guess that cannot be told from a statement is the mistake worth designing against.
- **A name is edited where it is drawn.** `Enter` commits, `Esc` abandons.
- **Everything the app says goes to one strip** — a refusal, a repair report, a storage warning. One place to look, dismissable, and silent when there is nothing to say.
- **A vocabulary's rules advise while modelling and refuse only at translation**: the walk is core's `schema.md`, the drop rules its `actions.md`.


## What travels

**A file is state, never history.** The log is a workspace concern and never leaves; what crosses any boundary — a file, the seam, a translator — is a graph.

- **An export is the graph, not the log.** Self-describing, and readable without replaying anything against the engine that wrote it.
- **A log is not a file.** The reader takes envelopes only, so nothing can hand the engine a history it did not write itself.
- **Session state stays out**, `meta` included: opening somebody's file must not rearrange your toggles.

The envelope, the canonical layout and the door are core's `engine.md`.


## kit

**The one surface offered outside this repo, and it speaks in state.** The whole headless stack as one built package — `kit`, `kit/react`, `kit/react.css`, `kit/shell`, `kit/shell.css` — bundled so nothing outside sees a workspace. **Packed, never published.**

> **A signature naming `Log`, `Step` or `Mutation` is internal. Graph to graph, and graph to Scene, is the seam.**

| | Is |
|---|---|
| `base_graph` | a fresh workspace with the floor already in it |
| reading | every derived answer about a graph — roles, layers, read-through, navigation, a relation's domain read off its type |
| `open` | a file in, as a graph — validated at the door and repaired where it can be |
| `validate` | what a graph violates. **Mending it stays the engine's** |
| `write` · `write_package` | a workspace, or the workspace as a package, out in the canonical layout |
| `project` · `draw` · `draw_svg` | a layer as a Scene, as text, as a standalone drawing |
| `Viewer` | the same layer as an **interactive** artifact — walkable, and not editable |
| `Explorer` | the section chain. **Emits intent, never change** |
| `Tray` · `useTray` · `useDisplay` | the context tray, and the state every shell keeps for it and for the drawing. **Read only without `onAct`** |

**Sealed, with no exceptions to look up:** the log, the steps, the mutations, the session, the action registry, and placement. A consumer places nothing, because projecting is what places and the Scene already carries the geometry.

- **A consumer says what a model *is*, never what changed.** Round-tripping is read a graph and write a graph, and diffing belongs to whoever cares. A new sort of change costs nothing outside because nothing outside can name one.
- **The export list is written out.** `export *` from the engine is how the log leaks, so what ships is named one by one.
- **An embedded view is interactive and still an artifact.** The renderer's drag callbacks are not re-exported, so **an edit is unreachable rather than merely unadvised**.
- **A shell's defaults are kept once.** The tray opens from the start, nothing picked on the root layer is the root picked, and the workspace tab sets how the drawing looks. `useTray` and `useDisplay` are what mndflow runs on too, so a host inherits those answers rather than restating them.
- **`kit` adds no rules.** It re-exports, plus the shell's chrome; dependency direction is all it keeps.


## apps

**An app binds ports and composes packages.** It adds no behaviour and no second copy of anything.

```
bind ports  ->  hold the log  ->  fold  ->  project  ->  render
                     ^                                      |
                     +-------------- action ----------------+
```

**The log is the source of truth.** A graph is only ever derived by folding applied mutations in order, so undo needs no inverse operations — it flips a status and the graph is rebuilt by the same code that built it.

| | Is |
|---|---|
| `web` | Vite. The editor |
| `cli` | headless. Folds, checks, runs actions, projects a layer to text, exports. **The harness, and an agent's way in** |
| mndmap | a separate repo: the viewer, a host of the kit as shipped |

**The CLI is the harness that makes the rest provable, and the surface an agent drives.** A passing suite proves the code agrees with itself; the CLI proves the packages compose — that a log folds, an action writes, a layer projects, and a Scene is complete enough to draw from, with no React in the process. **When a track can be driven from the CLI it is done being built in the dark.**


## tests

**Properties, never values.** Nothing asserts a coordinate, an id, a message or a count that tuning would change.

**Two kinds of sample data, because there are two ways in.** A **log** fixture proves the engine agrees with itself. A **file** fixture is a graph this engine never wrote, hand-written and mostly wrong on purpose — the only thing that proves the outward seam repairs rather than folds a broken graph. **After `open`, `validate` finds nothing left.**

**Contract tests, never integration tests.** A producer proves its output satisfies the invariants; a consumer proves it handles anything that satisfies them. **Neither imports the other.**

**The app is the only stateful thing in the repo.** No component reaches for state, storage or a graph, which is what makes an isolated dev server possible: a component with no way to fetch anything can always be handed a fixture.

| Package | Proven by | Needs a browser |
|---|---|---|
| `core` | fold determinism, door repairs, undo-by-refold, file round-trip, byte-identical re-export | no |
| `views` | no overlap, cells on the lattice and middles aligned along a row or column, stable under reorder, ends on a face share its anchor, a placed interface's seat is its own; Scene invariants over text projections of **shape, not coordinates** | no |
| `defs` | every shipped definition passes the door; every module it names exists | no |
| `fixtures` | every log folds clean, and every file the seam opens leaves nothing for `validate` to find | no |
| `kit` | packed, then a graph, a file and a drawing built from outside the workspace | no |
| `explorer` · `stage` · `options` · `tray` | driven, not asserted | yes |

- **The dependency law is a test**: the workspace graph matches the monorepo README's map, no package outside `core` declares a closed set, and nothing imports a deep path.
- **Design first, test second.** While a design is still moving, running the thing is the verification that counts.
- **Driving both apps against the shipped samples is the acceptance test**, and a green suite closes nothing on its own.
