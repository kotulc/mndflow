# @mnd/render

**Scene → React, and nothing else.** It reads what a projection placed and knows nothing about the graph, the log or the actions.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `views`, `theme` |
| **Proven by** | one conformance test — every Scene element kind draws and every hit binds, over **hand-written** Scenes no view module would produce |

## Where it sits

```
web · kit
└─ stage
   └─ render   ◀
      └─ views · theme
         └─ layout
            └─ core
```

## Running it

```sh
npx vitest run packages/render       # its suite, from the repo root — happy-dom, no real browser
npm run typecheck -w @mnd/render
```

## What is in here

| | Is |
|---|---|
| `Scene.tsx` | the one component. Draws a Scene, maps a pointer into it, and hands back what a gesture meant |
| `drag.ts` | what a left drag is — decided at the press and never revised: move, seat, wall or sweep |
| `scene.css` | the look, every value a step on the theme ramp and never a colour |

**It is a package, not part of the web app.** A second host renders in a webview, which is a browser — so the renderer is shared and only the port bindings differ.

**Binding a hit to an action name is the whole of its input job.** It names what was meant and never writes a mutation.

## The detail

`docs/render.md` and `docs/animate.md`.
