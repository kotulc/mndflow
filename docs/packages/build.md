# Building v1

**How the pieces are made separately and assembled.** The goal is that every package can be built,
run and proven **without any other package being finished** — so work never queues behind work, and
nothing cascades.

- **What v1 has to do** → [README.md](README.md), *v1 — the block loop*.

## The three rules that make isolation real

**1. Contracts first, then everything is parallel.** Three type surfaces — the **graph**, the
**Scene**, and the **ports** — are written before any implementation. They are small, they are the
only things two packages ever agree about, and once they exist every package can be built against a
type rather than against somebody else's progress.

**2. A component is a pure function of its props.** No component reaches for state, storage or a
graph. The explorer takes a tree and emits an action name; the stage takes a **Scene** and emits an
action name. **`apps/web` is the only stateful thing in the repo.** This is the rule that makes
isolated dev servers possible at all — a component with no way to fetch anything can always be
handed a fixture.

**3. Contract tests, never integration tests.** A producer proves its output satisfies the
invariants; a consumer proves it handles anything that satisfies them. **Neither imports the
other.** `views` proves every Scene it emits is well-formed; `render` proves it draws every
well-formed Scene, including hand-written ones no view module would produce. When they meet in
`apps/web` there is nothing left to discover.

## What is ported, and what is not

| Ported as-is | Written fresh |
|---|---|
| `styles/` — the theme ramp, as a CSS-only `theme` package | everything else |
| `public/` — the assets | |
| `samples/` — reshaped into fixture **logs** | |

**A fixture is a log, not a graph.** Folding it is what exercises the engine, so the same files feed
the CLI, every suite and every dev harness. **One set of sample data, three consumers.**

## The packages, as workspaces

```
packages/
  core/        @mnd/core       graph, log, door, actions, ports
  layout/      @mnd/layout     placement, routing
  views/       @mnd/views      block · table · matrix, each -> Scene
  defs/        @mnd/defs       yaml only
  theme/       @mnd/theme      css only          <- ported
  fixtures/    @mnd/fixtures   sample logs       <- ported
  render/      @mnd/render     Scene -> React
  explorer/    @mnd/explorer   its own dev server
  stage/       @mnd/stage      its own dev server
apps/
  web/         the product
  cli/         the harness
```

**Each UI surface is its own package**, because each needs its own dev server. **`views` stays one
package** — the three modules share the projection machinery and none of them is separately runnable.

## Running one thing in isolation

**Every UI package carries its own `dev/index.html` and its own Vite root.** No central harness, so
no package depends on one.

```
npm run dev -w @mnd/explorer     # only the explorer, over a fixture
npm run dev -w @mnd/stage        # only the stage, over a fixture Scene
npm run dev -w apps/web          # the assembled app
npm test  -w @mnd/core           # one suite
npm test                         # all of them
```

**A dev harness holds the state the component refuses to.** It folds a fixture, hands the result
down as props, logs every action the component emits, and offers a picker for which fixture is
loaded. **Roughly fifty lines per package**, and it is also the fastest way to see a component
misbehave.

## Stage 0 — the contracts

**One sitting, and nothing else starts until it lands.**

| | Is | Lives in |
|---|---|---|
| **graph types** | `Block`, `Relation`, `Definition`, `Field`, `Step`, `Mutation` | `core` |
| **Scene** | `boxes`, `routes`, `slots`, `hits`, `bounds` | `views` |
| **ports** | `storage`, `files` | `core` |
| **action descriptor** | name, scope, arguments, `check`, `run` | `core` |
| **fixtures** | three logs: one flat, one nested, one with relations | `fixtures` |

**Done when** `tsc` passes across every workspace with no implementation written, and the fixtures
parse. **Types and fixtures only** — a function body here is a decision taken too early.

## The five tracks

**After stage 0 these run in any order, or at once. None waits on another.**

| Track | Builds | Proven on its own by |
|---|---|---|
| **A · core** | fold, door, the closed action set, storage/files ports | fold a fixture and get the same graph twice; the door repairs a damaged log; every action's `check` agrees with its `run`; undo is a refold |
| **B · layout** | sizing, placement, seats, routing | no two cards overlap; every route terminates on a seat; reordering the input does not move the output |
| **C · views/block** | `project(graph, layer, config) → Scene` | Scene invariants over fixtures: every route's ends name a box, every hit names something drawn |
| **D · render** | Scene → React, cards, the ramp | draws **hand-written** Scenes, including ones no view module emits. Every element kind draws; every hit binds |
| **E · explorer** | the tree, its options, drag to re-file | its own dev server over a fixture; emits action names and mutates nothing |

**Track D can start on day one.** It consumes a type, not a package — which is the whole point of
writing the Scene down before anything produces one.

**`apps/cli` grows alongside A, B and C** rather than being a track. Each track's first milestone is
a CLI verb: `fold`, then `project`, then `run`. **When a track can be driven from the CLI it is
done being built in the dark.**

## Assembly

**`apps/web` should be boring, and if it is not, a seam is wrong.**

```
bind ports  ->  hold the log  ->  fold  ->  project  ->  render
                     ^                                      |
                     +-------------- action ----------------+
```

It binds `storage` and `files`, holds the one log, and passes derived data down. **Every gesture
returns an action name, which it runs, which returns mutations, which it appends.** That loop is the
whole app.

**Done when** the block loop runs end to end: make a block, nest it, relate two, descend and come
back, undo, reload, export and re-import.

## Keeping it decoupled

- **One entry per package.** Everything public is exported from `index.ts`; nothing imports a deep
  path. A reach into another package's internals is a build error, not a review comment.
- **The dependency law is a test.** The workspace graph must match [README.md](README.md)'s table,
  and no package outside `core` may declare a closed set.
- **One version, never published.** There is no semver, no changelog and no bump — a boundary that
  turns out wrong is moved in one commit.
- **Ports stay four.** A new capability is a port or it is a package; it is never a direct reach for
  a browser API from somewhere that is not an app.

---

## What v1 landed

**All five tracks, the CLI and the app — 200 tests, `tsc` clean, driven in Edge with no failures.**

| | Proven by | Browser |
|---|---|---|
| `core` | fold determinism, undo-by-refold, the door's repairs, file round-trip, byte-identical re-export, compaction | no |
| `layout` | no overlap · on the grid · stable under reorder · every elbow square · no two ends share a seat — over all six arrangements | no |
| `views` | every Scene well-formed over every layer of every fixture, and the invariants catch what they are for | no |
| `defs` | the base package arrives through the door like everything else | no |
| `render` | draws every element kind and binds every hit, over **hand-written** Scenes | yes |
| `explorer` · `stage` | driven on their own, emitting action names and mutating nothing | yes |
| the law | the arrow map, the manifests, no cycles, no closed set outside core, no deep imports, no port binding outside an app | no |

**The CLI grew with the tracks**: `fold`, `check`, `project`, `outline`, `run`, `export`. Every one
worked before any React existed.

### Two things the browser found that no unit test could

**A pointer maps through a letterbox.** The Scene is fitted with `xMidYMid meet`, so unless the
element happens to share the scene's aspect ratio the drawing is centred with a margin on one axis.
Reading a click as if the element mapped straight onto the viewBox is right in exactly one case and
wrong everywhere else — and the unit test had stubbed that one case. **A test whose fixture is the
only shape that works proves nothing.** The mapping is now `at_scene`, exported and tested at four
aspect ratios.

**A null layer is the root layer.** Every reader agreed except `children`, which took `null`
literally and handed back the root as its own child — so a stage pointed at the workspace drew the
workspace. The same confusion ran the other way in four actions: creating at the root layer wrote
`parent: null` and made a **second root**. One helper, `layer_id`, now says it once.

**And one of ordering**: the explorer picked a row and then opened it, but opening clears the
selection — so `＋` always created at the workspace, never under what was picked. It opens first
now, and a test pins the order rather than the two calls.

### The rest of v1, and what finishing it turned up

**All 28 actions are registered and reachable**, the four adjustments are wired, and an empty
layer draws a frame. **244 tests, `tsc` clean, 25 gestures driven in Edge with no failures.**

| | Landed as |
|---|---|
| **the frame** | a layer seen from inside, with its name set into its own border. **The root has none** — a frame is a block seen from outside, and the workspace has no outside |
| **adjustments** | a left drag is one of three things, decided at the press: move a card, sweep a selection, or slide a seat. Dropping on a card is a **move** (sayable); dropping anywhere else is a **place** (not) |
| **`pin`** | an ordinary view block, one reference per thing shown, filed *beside* what it looks at — a view of a layer that lived in that layer would show itself |
| **`infer`** | the four order tiers, the abstraction cap, references never parts, always a new top-level block. **Only tier 1 writes home** |
| **`vocabulary`** | which packages a layer draws on, as an ordinary field |
| **the offered list** | right-click in the explorer. Membership only, fixed order, and it asks for the one argument it cannot fill |

**Three more the browser found.**

**The frame's hit spans the whole layer**, so every card dropped anywhere read as *over the frame* —
and the stage turned that into a re-parent into the layer it was already in. A drop lands on a
**box** and never on the frame.

**`useRef(session(...))` opens a session on every render.** The ref keeps the first, but each of the
others still read storage and could write to it. Lazy now, and once.

**A repair was never kept.** The door mended a damaged log in memory and nothing persisted it, so
the same log was re-read as damaged and mended again on every load — the door telling the truth
about something it had already fixed. A repair is a step, so now it is written like any other.

### Two rules that fell out of finishing

**A block that says nothing and stands for exactly one thing is named after what it stands for**,
with its definition's verb in front — which is what gives an inferred action `do Pump` while storing
nothing. It is **drawn dimmed**, because a guess that cannot be told from a statement is the mistake
worth designing against. Typing over it stores a real name and the dimming goes.

**Core cannot reach the package that supplies its floor.** `defs` depends on core, so core may not
depend back — an app hands the base definitions in, the same way it hands in a port.

### The last three, and what they cost

**All six views, all three readings, and every adjustment reachable by a gesture — 309 tests,
`tsc` clean, driven in Edge with no failures.**

| | Landed as |
|---|---|
| **`seat`** | an interface is **seated** on its owner's wall, never laid out beside it: a side and a fraction, so the seat survives the card moving, growing or being arranged some other way. A left drag on one slides it |
| **`wall`** | the ends of a **picked** line become handles. Only a picked one — an end sits on a card's edge, so grabbing every line would make a card unmovable near its own walls |
| **the readings** | one derivation of lanes for all three. An activity draws them as **bands**, a sequence as **columns with lifelines**, a state as **nothing** — a machine is about one thing changing rather than several taking part |
| **controls** | from a count: fork and join, or decision and merge where a branch carries a guard. **A branch keeps its own relationship id** and only the stub into the control is derived. A sequence draws none |
| **`table`** | rows and no frame, and **a column per field the rows carry** — so filling in a field on one block adds a column to every table it appears in |
| **`matrix`** | two axes off one layer, cells filled where a relationship already runs. Column labels are **turned**, because a cell is as wide as a mark needs to be and a name is not |
| **the six** | `block`, `table`, `matrix`, `activity`, `sequence`, `state` — as **view definitions**, three of them the same module read differently. Which one is showing is display state and never enters the log |

**Two more fixtures, because a fixture is what proves any of it.** `interfaced` — two seated ports
and a relationship running port to port — and `behaved`, a behavior layer shaped as `infer` writes
one, with a branch in it so a control has something to count. **Five logs, still one set of sample
data feeding the CLI, every suite and every dev harness.**

**A relationship promoted to a seat still draws.** `owner_of` says what an end is drawn *on*, so an
end seated on an interface counts as the card it sits on — for what a layer holds, for how a rank is
worked out, and for which matrix cell is filled.

### Four things the work turned up

**A straight run cannot be spread.** Two lines between the same pair were pushed apart by moving
their interior points, and a run with only stubs has no interior point that is free — moving the one
at the end of a horizontal stub sideways bends it diagonally, which is the single thing a route may
never do. **Only the middle run moves now**, and a run with no middle is not spread, because the
seats it lands on were already spread apart before it was drawn. *Found by the Scene invariant, on a
layer that had never had two lines between one pair.*

**A wall does not reach as far as it looks.** The nearest seat was the nearest **wall**, measured
against each edge in turn — so on a card twice as wide as it is tall, the top wall reaches further
than the right one and every point outside read *top*. It measures how far out of the middle a point
falls, **in halves of the card**, and the axis that is further out picks the wall.

**Two actions nothing orders share a rank.** In one lane that draws them on top of each other, and
in a state reading every action is in the one lane. **No two actions in a lane share a step**: the
second is taken one step further along, and distinct lanes keep the rank they were given. *Found in
the browser — a unit test would have needed a fixture with an unordered pair, which is exactly the
fixture nobody writes.*

**A layer drew at a third of the size it could.** Bounds were twice the furthest **corner** plus that
box's own width, which counts the same box twice. Twice the furthest **edge** is what a layer centred
on the origin needs. It was invisible until a band reached past the cards inside it.

**And one the plan had already asked for**: a name too long for its card is **clipped**, with the
whole of it on hover. Nothing was clipping.

### Still not built

- **A matrix's two axes are child views.** A layer is read against itself, which is the common case
  and not the design — a filter or a third dimension is meant to cost nothing new.
- **`views/table.md` and `views/matrix.md` are stubs.** Both modules were built from *The six* and
  *Composition* in [spec.md](../spec.md); the notation documents do not exist yet.
- **The activity-final double ring**, and whether the abstraction cap applies to a sequence's
  columns as it does to its actions. Both were open before and are open still.
