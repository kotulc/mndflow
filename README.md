# mndflow

**Rapid visual modeling for understanding complex systems.** Documents, code, hardware — any existing system, translated into blocks and explored from several perspectives: the block diagram of each layer, and the section slices the explorer cuts through the same tree. mndflow is the editor and the kit; **mndmap**, a separate repo, is the viewer built on it.

**Agent and data first.** Every element, package and workspace is JSON, and the CLI does headless what the app does. No server and no language model: one log lives in the browser, the graph is folded from it, and agents work through files and the CLI.

**Everything is a block.** What a block *is* comes from a **definition** in a package rather than a form the engine hardcodes, so the same graph reads as plain blocks to one person and as SysML to another. Nobody has to learn a notation to use it.

```
┌──────────────────────────────────────────────────────────────┐
│ mndflow  12 blocks · 34 steps      undo redo  ex im  ▤  ◐    │  header: identity, and
├──────────────────────────────────────────────────────────────┤  controls that reach a port
│ + Heat Exchanger_                            add blocks      │  terminal: four commands
├──────────────┬─────────────────────────────┬─────────────────┤
│ packages     │   ┌╌╌╌╌╌╌╌╌┐                │ Layout          │
│ definitions  │   ┆ Edge   ┆ ──▶ ( Billing )│   ○ free  ● auto│  stage: one layer, and a
│ ▾ workspace  │   ┆ ▪ ▪    ┆                │                 │  grid is a block on it
│   ▾ Ledger/  │   └╌╌╌╌╌╌╌╌┘                │ Shows           │
│    ├─ Auth   ├─────────────────────────────┤   ☑ label       │  options: the slots the
│    └─ Rate…  │ contents · this             │   ☐ fields      │  projection asked for
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

The embedding weights and the ONNX runtime are vendored under `public/` and stored in LFS — about 60MB of `.onnx` and `.wasm` that a normal clone fetches for you. The model is never downloaded at run time, so the app works offline and on first load; only package search reaches `public/packages`. A clone that came down without LFS still runs: ranking falls back to substring and the console says so, and `git lfs install && git lfs pull` fixes it.

### Using it

| Where | What you can do |
|---|---|
| **Header** | undo, redo, import, export, export as a package, a new workspace, the terminal, the theme — each reaches a **port**, never the graph |
| **Explorer** | a section chain — `packages`, `definitions` (a package's domain: its definitions in the folders and groups that organize them) and `structure` (the tree held, with its structure) — each listing what the section above holds, and the menu that hangs off the tree. **The explorer browses; the canvas is the target**: choosing a row selects it, opening one (Enter, double-click, →) moves the canvas. The canvas is either the **overview** — every package top-down, its definitions in their groups and folders, read down the page — or the **structure** of the definition opened |
| **Stage** | **the left button works what is there; the right button makes something new.** Within the right button a click makes what sits at a point and a drag makes what has extent. A click here selects and never navigates |
| **Options** | settings for the workspace or a new definition, then the groups the projection asks for — a layer's layout (`free`, `auto`, `outline`, `page`), what the drawing shows, and what a right drag draws |
| **Tray** | open from the start, on whatever is picked — and on the root, with its `workspace` tab, when nothing is. What the open layer holds, as rows; a block's element, fields and contents; the card size, key and lattice. A block with a schema offers its fields as a diagram |
| **Terminal** | four commands — `+` add, `:` filter, `*` search, `?` help. Help is the fallback, and every registered action is reachable there |

Work is kept in IndexedDB as you go; **export** writes the whole graph to a file that **import** reads back.

---

## The repo

**One repo, npm workspaces, one version, never published.** The package map and what each package may depend on live in the monorepo README under `packages/`; every package carries its own README and `docs/`. **The one law** — dependencies run one way, and only `core` names a closed set — is a test, `test/law.test.ts`. The loop and the seams are in `docs/spec.md`.

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

**`@mnd/kit` is the one thing that ships.** The headless stack as a single built package, plus `kit/react` and `kit/react.css` — the viewer, the explorer and a read-only tray, with the tray and display state the app itself runs on — packed, never published. `release/` carries the tarball and a manifest naming its version, commit and integrity, so a consumer can check what it is holding.

### Releasing the kit

**The manifest stamps `HEAD`, so commit before packing** — a dirty tree packs something the recorded commit does not describe.

**Re-pinning mndmap** to a tarball of the same version: `npm install ./vendor/mnd-kit-<version>.tgz` there, not a plain `npm install` — npm otherwise keeps its cached copy of that version.

1. `npm version minor -w @mnd/kit --no-git-tag-version` — or `patch` / `major`
2. Commit the bump, `package-lock.json` included
3. `npm run release:kit` — writes the tarball and `release/kit.json`
4. Commit `release/`
5. `npm run release:kit -- --check` — optional, confirms the tarball matches its manifest

---

## The documents

Under `docs/`, and they describe the **goal state** rather than what is built. They span both mndflow and mndmap:

| | |
|---|---|
| `design.md` | the vision, the driving concepts, and the model's rules. **Authoritative** |
| `definitions.md` | the vocabulary the others are written in |
| `spec.md` | what crosses packages: the seams, ports, kit, apps and tests |
| `stories.md` | what somebody is trying to do |
| `simplification-plan.md` | one rule, one home: where code lives and the leads to consolidate |

**What one package alone decides lives in that package's `docs/`**, never here.
