# mndflow

**A client-only editor for rapidly composing descriptive blocks into systems models.** No server, no language model, nothing fetched at run time. One log lives in the session, the graph is folded from it, and everything runs in the browser.

**Everything is a block.** A note, a folder, an interface, a group and a grid are placed, dragged, named and laid out alike. What a block *is* comes from a **definition** in a shipped package rather than from a form the engine hardcodes — so the same graph reads as plain blocks and flows to one person and as SysML to another, because what changed is the names and the drawing, never the structure.

**Nobody should have to learn a notation to use one.** Somebody says what the parts are, what they are made of, what flows between them and what has to be true, and that is already the whole base model. A standard is a translation layer on top, not a toll on the way in.

```
┌──────────────────────────────────────────────────────────────┐
│ mndflow  12 blocks · 34 steps      undo redo  ex im  ▤  ◐    │  header: identity, and
├──────────────────────────────────────────────────────────────┤  controls that reach a port
│ + Heat Exchanger_                            add blocks      │  terminal: four commands
├──────────────┬─────────────────────────────┬─────────────────┤
│ Ledger/      │   ┌╌╌╌╌╌╌╌╌┐                │ Arrangement     │
│ ▾ Edge/      │   ┆ Edge   ┆ ──▶ ( Billing )│   ○ free  ● grid│  stage: one layer, and a
│   ├─ Auth    │   ┆ ▪ ▪    ┆                │                 │  grid is a block on it
│   └─ Rate…   │   └╌╌╌╌╌╌╌╌┘                │ Shows           │
│ · Billing    ├─────────────────────────────┤   ☑ label       │  options: the slots the
│              │ contents · this             │   ☐ fields      │  projection asked for
│  explorer    │  Auth   Module              │                 │
└──────────────┴─────────────────────────────┴─────────────────┘
                       tray: what the open layer holds
```

Ranking is a **similarity** problem, not a generation one: MiniLM runs locally over ONNX, so `Invoices` scores close to `Billing` despite sharing no letters. That is the whole of what substring cannot answer, and it is why nothing here calls a model.

---

## Getting started

**Prerequisites:** Node 18+, and [Git LFS](https://git-lfs.com), which ships with Git for Windows and most Git installs.

```sh
npm install
npm run dev        # http://localhost:5173
```

The embedding weights and the ONNX runtime are vendored under `public/` and stored in LFS — about 60MB of `.onnx` and `.wasm` that a normal clone fetches for you. Nothing is downloaded at run time, so the app works offline and on first load. A clone that came down without LFS still runs: ranking falls back to substring and the console says so, and `git lfs install && git lfs pull` fixes it.

### Using it

| Where | What you can do |
|---|---|
| **Header** | undo, redo, import, export, a new workspace, the terminal, the theme — each reaches a **port**, never the graph |
| **Explorer** | the tree, and the menu that hangs off it. **A click navigates** |
| **Stage** | **the left button works what is there; the right button makes something new.** Within the right button a click makes what sits at a point and a drag makes what has extent. A click here selects and never navigates |
| **Options** | the control groups the current projection asks for — arrangement, and what a card shows |
| **Tray** | what the open layer holds, as rows |
| **Terminal** | four commands — `+` add, `:` filter, `*` search, `?` help. Help is the fallback, and every registered action is reachable there |

Work is kept in `localStorage` as you go; **export** writes the whole graph to a file that **import** reads back.

---

## The repo

**One repo, npm workspaces, one version, never published.** Boundaries exist to enforce direction and to let each package be proven on its own — they are not an API surface anyone has to keep.

```
packages/
  core/       @mnd/core       graph, log, door, actions, ports
  views/      @mnd/views      sizes, placement, routing, projection -> Scene
  defs/       @mnd/defs       the definition packages. data, no code
  theme/      @mnd/theme      the ramp and the icons. css only
  fixtures/   @mnd/fixtures   sample logs, and sample files for the seam
  explorer/   @mnd/explorer   the tree
  stage/      @mnd/stage      the working area
  options/    @mnd/options    the control rail
  tray/       @mnd/tray       what the open layer holds
  terminal/   @mnd/terminal   the strip
  kit/        @mnd/kit        the seam, built and packed
apps/
  web/        @mnd/web        the product
  cli/        @mnd/cli        the harness
```

**One surface, one package, and never a `ui` package.** Five panels split five ways is what keeps one of them from quietly doing another's work. Each carries its own dev server, so a surface is runnable before the app hosting it exists.

The monorepo README under `packages/` owns the dependency map, and every package carries its own README and `docs/`.

### The one law

**Dependencies run one way, and only `core` may name a closed set.** Anything else enumerating sorts of things is doing the engine's job in the wrong place. Both halves are a test — `test/law.test.ts` — so an arrow pointed the wrong way fails with the file and the arrow named.

### The loop

```
bind ports  ->  hold the log  ->  fold  ->  project  ->  render
                     ^                                      |
                     +-------------- action ----------------+
```

**Every gesture returns an action name, which the app runs, which returns mutations, which it appends.** That loop is the whole app, and `apps/web` adds nothing to it: it binds the ports, holds the log, and passes derived data down. **If that app turns out to be interesting, a seam is in the wrong place.**

**The log is the source of truth.** A graph is only ever derived by folding applied mutations in order, so undo needs no inverse operations — it flips a status and the graph is rebuilt by the same code that built it.

---

## Development

```sh
npm run dev                          # the web app
npm test                             # every suite in the workspace
npm run typecheck                    # the whole tree, one pass
npm run build -w @mnd/web            # a production bundle
npm run release:kit                  # build, pack and stamp @mnd/kit
npm run dev -w @mnd/stage            # one surface alone — also explorer, options, tray, terminal
npm run start -w @mnd/cli -- fold related
```

**A passing suite proves the code agrees with itself; the CLI proves the packages compose** — that a log folds, an action writes, a layer projects, and a Scene is complete enough to draw from. It runs headless with no React in the process, which is what lets core and views be built and driven before any UI exists. A notation regression is a diff rather than a screenshot.

**`@mnd/kit` is the one thing that ships.** The headless stack as a single built package, plus `kit/react` and `kit/react.css` — packed, never published. `release/` carries the tarball and a manifest naming its version, commit and integrity, so a consumer can check what it is holding.

---

## The documents

Under `docs/`, and they describe the **goal state** rather than what is built:

| | |
|---|---|
| `design.md` | why mndflow is the way it is — the vision, the goals, and what each rule was chosen over. **Authoritative** |
| `spec.md` | what crosses packages, and the rules every package obeys. Short, scannable |
| `definitions.md` | the vocabulary the other two are written in |
| `stories.md` | what somebody is actually trying to do |
| `todo.md` | what is decided but not built, and what is still undesigned |

**What one package alone decides lives in that package's `docs/`**, never here.
