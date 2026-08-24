# Plan

**What is left to reach parity with the legacy app, and in what order.** The target is in spec.md and the reasoning is in design.md — this is only the queue. One row is one chunk of work.

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

**It held.** Everything below is written assuming it keeps holding, and a phase that needs to break it is a phase to redesign.


## What landed

**The block loop, end to end** — make a block, nest it, relate two, descend and come back, undo, reload, export and re-import. Then all six views, all three readings, every adjustment reachable by a gesture, and the outward seam.

| | Landed as |
|---|---|
| the engine | `core` — fold, door, file, ports, the closed action set: 28 actions and four adjustments |
| placement | `layout` — six arrangements, seats, routing |
| notation | `views` — three modules, six views, three readings, a Scene as text and as SVG |
| drawing | `render`, and five surface packages each with its own dev harness |
| the hosts | `apps/web`, `apps/cli` |
| the seam | `kit` — data in, data and artifacts out, packed and driven from outside the workspace |

**Every track was driveable from the CLI before any React existed.** That is the bar each phase below is held to.


## What is left

**Ordered by what unblocks what**, not by size. Each ends with something that runs.

| | Phase | Is | Comes from | Ends with |
|---|---|---|---|---|
| **P1** | **the module contract** | what a module publishes, and **each component validating its own key at the door**. Today `core` reads `components.card.word` and `components.block.module` directly, and nothing validates either — so a malformed key is *wrong* rather than *unvalidated*, and an older build cannot open a newer package | legacy `src/modules/` — 57 files, no counterpart here | a definition with an unknown component key opens, drops that key alone, and says so |
| **P2** | **the `score` port** | text similarity, declared and bound. **`net` and `score` are in the spec's port table and in neither `ports.ts` nor an app** — the terminal's ranking is the cold fallback because of it | legacy `src/embed/` — MiniLM over ONNX, ~60MB under `public/` | the terminal ranks by meaning; unbound, it still falls back to substring |
| **P3** | **the question loop** | the conversation that builds a graph by asking: router, turn, and the domain vocabularies. The strip today is four commands and a mirror; **this is the half of the legacy app with no counterpart at all** | legacy `src/terminal/` — 7 files — and `workflows/` — 8 YAML | answering a prompt writes blocks, and a domain is a YAML file with no control flow in it |
| **P4** | **`filter` and `search`** | both name themselves and do nothing. **Results are a table on the stage, never a second listing inside the terminal** — the first caller handing a table something that is not a layer's contents, and it needs the seam a view block needs rather than a second one | — | typing `:pump` narrows the workspace and lights what matched |
| **P5** | **the `net` port** | fetching a definition package from outside the workspace, brought in **through the door** like everything else | — | `search sysml` pulls a package and the door reports what it repaired |
| **P6** | **translate** | one-way emitters — SysML first, since it is a pure name map. **A standard is a translation layer, never a shape the model bends to** | — | a graph out as SysML, re-imported to an equivalent graph |
| **P7** | **the trimmings** | `animate` — the nesting-doll transition, unbuilt and descending redraws today · the tray's **definition and field editor** · a matrix's two axes as **child views** · focus-and-highlight for filter and help · interactive help and the tutorial · quiet mode muting the mirror rather than collapsing the strip | — | each driven in the browser |

**P1 and P2 are independent of everything.** P3 wants P2 for ranking but works without it. P4 wants P3's caller. P5 and P6 want nothing but the engine, and **P6 wants nothing this repo does not already ship** — `kit` was built for it.


## How a phase is judged done

- **Driven, never asserted green.** A passing suite proves the code agrees with itself. Every real defect this project has had came from driving the built app.
- **A CLI verb first, where one is possible.** When a track can be driven from the CLI it is done being built in the dark.
- **Contract tests, never integration tests.** A producer proves its output satisfies the invariants; a consumer proves it handles anything that does. Neither imports the other.
- **Design first, test second.** While a phase's shape is still moving, running the thing is the verification that counts.


## Open questions

- **Does `translate` need `views`, or only `core`?** SysML is a pure name map and needs no layout; a rendered site needs Scenes. One package keeps it simple; splitting it keeps the data translators trivially testable. **Decide at P6, not before.**
- **Where the question loop lives.** Inside `terminal`, or beside it as its own package that registers with it. The strip must stay optional either way — *every capability it adds must exist without it*.
- **Whether `net` and `score` are still four-port-worthy.** Both have been declared and unbound long enough to ask whether either is a package instead. **Ports stay four** is the rule they are held to.
