# mndflow, built to its own design

**Context.** The docs already describe an architecture the code does not have. design.md settles
four tiers (*engine / definition / module / never*), three tiers (*workspace / project / folder*),
one log at the workspace, closed sets against open ones, and *a package is data, a module is code*.
`src/` is that design filtered through one React app: 693 lines of `project.ts` holding state for
everything, six view "surfaces" that only exist as JSX, and a dependency law enforced by a test
that reads import strings because nothing structural can enforce it.

This is what the project looks like built to the design instead of toward it — greenfield, with
today's repo as the reference implementation rather than the starting point.

---

## Why not React components

React is the wrong unit of decoupling here, for four reasons that are specific to this project.

| | |
|---|---|
| **Most of it does not render.** | The log, the fold, the door, containment, rules, ids, references, placement, routing, the action set — the whole closed engine — has no visual output. A component tree cannot hold it, so it ends up in hooks and context. `project.ts` is that outcome, and it is why the app cannot be driven without a browser |
| **Components do not enforce direction.** | design.md's central rule is that dependencies run one way. React is indifferent: `<Canvas>` may import from `page/` and everything still compiles. Today that law lives in `tests/structure.test.ts` parsing import strings — a lint, discovered after the fact. A workspace boundary makes the same arrow a **build error** |
| **The unit of extension is not a component.** | A package ships YAML. A module publishes a **named component key** resolved at load (`modules/index.ts`'s `publish()`), and *a component owns its key and reads no other's*. That is a registry keyed by name, not a parent–child tree — a card layout is not a child of a style set. React composition cannot express it, so the registry exists anyway, alongside the components |
| **A projection must outlive the DOM.** | `ST.6` translates a model out — site, simulator, parametrics, code — and `ST.5` reaches outside the workspace. If *what a layer looks like* is JSX, then every one of those re-derives layout for itself, and the six notations can only ever be tested through happy-dom |

**React is the adapter at the leaves, not the architecture.** It renders a scene it did not compute.

### The claim this rests on: a view module returns a Scene

```ts
project(graph: Graph, layer: Id, config: ViewConfig): Scene
```

```
Scene {
  boxes:  [{ id, x, y, w, h, def, label, marks }]
  routes: [{ id, from, to, lane, points, form }]
  slots:  [{ chrome: "arrange" | "types" | "columns" | … }]
  hits:   [{ id, region, gesture }]
  bounds: { w, h }
}
```

Plain data, no imports from anything drawable. Then:

| Renderer | Turns a Scene into | Serves |
|---|---|---|
| `render` | React DOM | the app |
| `render-svg` | one `.svg` | export, and `ST.6`'s site |
| `render-text` | ascii | the CLI, and every notation's tests |

This is the single change that makes the rest of the architecture possible: a notation becomes a
pure function, a translator reuses the projection instead of reimplementing it, and the whole
engine is provably correct before anything is drawn.

`geometry/layout.ts` and `geometry/route.ts` already work this way — they compute placements and
hand them to React. The end state is that *every* view module does, and nothing downstream of the
graph knows what a DOM node is.

---

## The architecture

**One law, and it replaces the structure test.** A package may name a **closed set** only if it is
`model`. Any other package enumerating sorts of things is doing the engine's job in the wrong
place — that is the failure mode `ST.4` exists to end, expressed as something a build can catch.

### Packages

**Core — headless. No React, no DOM, no `window`.**

| | Holds | Depends on |
|---|---|---|
| `model` | types, steps, the fold, the door, the file envelope, ids and references, containment, the one constraint and four rules, the **workspace document and its single log**, and the **port interfaces** | — |
| `layout` | sizing, tiling, placement, seats, routing, lanes | `model` |
| `actions` | the closed action set: scope, `check`, `writes`, `sayable` | `model`, `layout` |
| `views` | the six view modules, each `project() → Scene`, its gesture map and its chrome groups | `model`, `layout` |
| `translate` | one-way emitters: SysML, site, code. Never writes back | `model`, `views` |

**Data — no code at all.**

| | Holds | Depends on |
|---|---|---|
| `defs` | `base`, `behavior`, `sysml`, `uaf`, `uml`, `requirements`, `flow`, `parametrics`, `terms`, `core` — YAML plus a manifest. Validated by `model`'s door in CI | — |

**Presentation.**

| | Holds | Depends on |
|---|---|---|
| `render` | Scene → React. Card families, the theme ramp, icons, and the gesture binding that turns a `hit` into an action id | `model`, `views` |
| `shell` | explorer, tray, stage frame, options rail, workspace chrome, and the composition root that binds ports | all of the above |

**Optional — the app is whole without either.**

| | Holds | Depends on |
|---|---|---|
| `terminal` | the rail: router, turn, ranking. Registers itself; nothing imports it | `model`, `actions` |
| `embed` | MiniLM over ONNX behind the `score` port. ~60MB of assets, lazily fetched | — |

**Hosts.**

| | Is |
|---|---|
| `apps/web` | Vite. Binds browser ports. The primary product |
| `apps/vscode` | extension + webview. Binds four different ports. **Not a second implementation** |
| `apps/cli` | headless. Folds, validates, projects to text, emits translations. The test harness that is also a tool |

### Ports — the entire host contract

Declared in `model`, bound by a host, implemented nowhere else.

| Port | `web` | `vscode` | `cli` |
|---|---|---|---|
| `storage` | `localStorage` | workspace state | a file |
| `files` | download / File System Access | `showSaveDialog` | `fs` |
| `net` | `fetch` (package pull, `ST.5`) | extension `fetch` | `fetch` |
| `score` | `embed`, lazily | *absent* — trigram fallback | *absent* |

`score` being a port is what keeps 60MB of ONNX out of a VSIX, and what makes today's
trigram-vs-embeddings gap a binding choice rather than an unfinished feature.

### Repo

```
mndflow/
  packages/
    model/ layout/ actions/ views/ translate/
    defs/            # yaml only
    render/ shell/
    terminal/ embed/
  apps/
    web/ vscode/ cli/
  docs/              # design, spec, definitions, plan — unchanged in role
```

One repo, npm workspaces, one version, never published. Boundaries buy direction and headless
tests; they are not an API surface anyone has to keep.

---

## What each package is proven by

**Properties, never values** — the existing rule, kept.

| | Proven by | Needs a browser |
|---|---|---|
| `model` | fold determinism, door repairs, containment, undo-by-refold, file round-trip | no |
| `layout` | no overlap, containment, route termination, stability under reorder | no |
| `actions` | `check` agrees with `run`; every action's `writes` is honest | no |
| `views` | Scene invariants per module, over `render-text` snapshots of shape, not coordinates | no |
| `defs` | every shipped definition passes the door; every named module exists | no |
| `translate` | emitted artifacts re-import to an equivalent graph | no |
| `render` | one conformance test: every Scene element kind draws, every hit binds | yes |
| `shell` | driven, not asserted — the browser drive stays the acceptance test | yes |

**Only two of nine need a browser.** That is the return on the Scene boundary.

---

## Bootstrap order

Each stage ends with something that runs. Nothing is drawn until stage 6.

| | Stage | Ends with |
|---|---|---|
| **0** | repo skeleton: workspaces, project references, the closed-set law as one test | `tsc` green on nothing |
| **1** | `model` — types, steps, fold, door, file, ports. Port `graph/` from mndflow, minus the workspace routing (`Effect.into`, `writeInto`, `home`) — **one log makes it unnecessary** | `apps/cli` folds a log file and prints the tree |
| **2** | `defs` + door validation. `base` first: `structure`, `view`, `resource`, and `folder`/`group`/`note` under them | every shipped definition validated in CI |
| **3** | `layout` — port `geometry/` unchanged; it is already pure | cli prints placements |
| **4** | `views/block` → Scene, plus `render-text` | **the whole engine drivable headless** — make, nest, relate, project, read |
| **5** | `actions` — port the registry; the four adjustments and the closed set | cli can `make`, `relate`, `move`, `undo` |
| **6** | `render` + `apps/web`, minimal: one Scene on screen, gestures bound | **first browser drive** |
| **7** | `shell` — explorer, tray, options rail, workspace | the app as it exists today, on the new spine |
| **8** | `views/table`, `views/matrix`, then `activity`, `sequence`, `state` | each is one `project()` and a preset — `ST.2` falls out |
| **9** | `translate` — SysML first (a pure name map), then site via `render-svg` | `ST.6` |
| **10** | `embed`, then `terminal` behind its registration hook | `ST.7` |
| **11** | `apps/vscode` — webview plus four port bindings | second host, no second implementation |

**Stages 1–5 have no React and no browser**, and they are where most of the product lives. The
migration that stream `B` is currently doing in place (`B.17`, 257 sites) happens here as *writing
the new package in the settled vocabulary* — `definitions.md` is the only glossary that exists in
this tree, and `definitions-legacy.md` never gets ported.

### What carries over, and what does not

| Carries over nearly as-is | Rewritten |
|---|---|
| `graph/fold.ts`, `check.ts`, `file.ts`, `types.ts` | `project.ts` — dissolves into `shell` plus ports |
| `geometry/layout.ts`, `route.ts` | the six view surfaces — become `project() → Scene` |
| `actions/*` registry and its checks | `page/*` — rebuilt against Scene and the chrome slots |
| `packages/*.yaml`, the component contract in `modules/index.ts` | `store.ts` — splits into the `storage` port and its web binding |
| the theme ramp and the closed style sets | `terminal/*` — keeps its logic, loses its imports into the page |

---

## Verification

- **Per stage**: `npx tsc --noEmit` and `npm run test:ci` at the root, across all workspaces.
- **The law**: one test asserts (a) the workspace dependency graph matches the table above, and
  (b) no package outside `model` declares a closed set — a `Record` or `as const` tuple enumerating
  sorts of things.
- **Headless end-to-end, from stage 4**: `cli` replays a fixture log, projects each layer through
  each view module, and prints text. A notation regression is a diff, not a screenshot.
- **Browser, from stage 6**: the existing `run` skill drives the canvas — right-click to make,
  drag to relate, double-click to descend, reload to re-read the log.
- **Round-trip, from stage 9**: emit SysML, re-import, assert graph equivalence.

## Open questions

- **Does `translate` need `views`, or only `model`?** SysML is a pure name map and needs no layout;
  the site needs Scenes. Keeping the dependency means one package; splitting it keeps the data
  translators trivially testable. Decide at stage 9, not before.
- **Where the theme ramp lives.** It is data (slots and steps, per stream `Y`) but only `render`
  consumes it. `defs` is the honest home; `render` is the convenient one.
- **Whether `actions` needs `layout`.** Today it does, for placement on create. If Scene-time
  placement can absorb that, `actions` becomes a `model`-only package and the core flattens.
