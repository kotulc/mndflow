# The Monorepo

**The package map, and the one home of what each package may depend on.** One repo, npm workspaces, one version, never published. Boundaries exist to enforce direction and to let each package be proven on its own; they are not an API surface anyone has to keep. The seams, the kit's surface and what each package proves are in `docs/spec.md`.


## The one law

**Dependencies run one way, and only `core` may name a closed set.** Any other package enumerating sorts of things is doing the engine's job in the wrong place. Both halves are a test (`test/law.test.ts`): the workspace graph must match the tables below, and no package outside `core` may declare a closed set.


## The packages

| Core | Purpose | Depends on |
|---|---|---|
| core | the graph, the log, the door, the action set, navigation, the ports | — |
| views | sizing, placement, seats and routing, projecting a layer to a **Scene** — one way to draw | core |
| defs | the shipped definition packages. **Data, no code** | core |
| theme | the ramp as CSS custom properties, the icon set, and the shell's chrome | — |
| fixtures | sample **logs**, and sample **files** for the seam. Shared by the CLI, every suite and every dev harness | core, defs |

Headless — no React, no DOM, no `window`.

| Presentation | Purpose | Depends on |
|---|---|---|
| stage | the drawing, framed: a Scene mounted on **React Flow** and driven | core, views, theme |
| explorer | the section chain, and the menu that hangs off it | core, theme |
| tray | what the open layer holds, as rows — and the tray and display state every shell keeps | core, theme |
| options | the control groups a projection's slots ask for | core, theme |
| terminal | the strip: four commands, and help behind `?` | core, theme |

**One surface each, and never a `ui` package.** Each carries its own dev server, so a surface is runnable before the app hosting it exists.

| App | Purpose |
|---|---|
| web | Vite. The editor |
| cli | headless. Folds, checks, runs actions, projects to text. **The harness, and an agent's way in** |

Apps bind ports and nothing else.


## The one that ships

| | Purpose | Depends on |
|---|---|---|
| kit | the whole headless stack as **one built package**, plus `kit/react`, `kit/react.css`, `kit/shell` and `kit/shell.css`. Bundled, so nothing outside sees a workspace | core, defs, explorer, views, stage, theme, tray |

**Packed, never published** — `npm run release:kit` writes the tarball a host such as mndmap installs. It re-exports and adds nothing, so it cannot put a dependency anywhere the map does not already allow, and it declares its siblings as **build** dependencies because it carries them.
