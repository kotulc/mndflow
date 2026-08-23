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
