# @mnd/stage

**The working area, and the one thing that never yields.** Chrome gives way under pressure — the crumbs truncate, the explorer bounds itself — and the stage keeps its room.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `views`, `render`, `theme` |
| **Proven by** | its own dev server over a fixture Scene — driven, emitting action names and mutating nothing |

## Where it sits

```
web
└─ stage   ◀
   └─ render · views · core · theme
```

## Running it

```sh
npm run dev -w @mnd/stage            # its harness, over a fixture Scene
npx vitest run packages/stage        # its suite, from the repo root
```

## What is in here

| | Is |
|---|---|
| `Stage.tsx` | hosts one view, owns the global keys, turns a gesture into an action name, and draws the crumbs and the strip |
| `stage.css` | the look |
| `dev/` | its own Vite root, and a harness holding the state the component refuses to |

## The gestures it names

**The left button works what is already there; the right button makes something new.** Within the right button, a click makes the thing that sits at a point and a drag makes the thing that has extent.

| | Reaches |
|---|---|
| left click | selection. **A click on the stage never navigates** |
| left double-click | `open`, or `up` outside the frame |
| left drag | decided at the press and never revised — `move`, `place`, `seat`, `wall`, or a sweep |
| right drag, card to card | `relate` |
| right click on empty | `create`, asking for the name first |

- **Dropping a card on another card is a `move`, which is sayable; dropping it anywhere else is a `place`, which is not.**
- **A drop lands on a box and never on the frame** — the frame spans the whole layer, so counting it would make every drop a re-parent into the layer it is already in.
- **Everything the app says goes to one strip** at the top: a refusal, a repair report, a storage warning. One place to look, and silent when there is nothing to say.

## The detail

`docs/stage.md`.
