# @mnd/options

**The options rail.** One column, fixed to the right of the stage, holding every control the thing on the stage has. A pure function of its props: it holds nothing and every control leaves as an action name somebody else runs.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `theme` |
| **Proven by** | its own dev server over static chrome — driven, emitting action names and mutating nothing |

## Where it sits

```
web
└─ options   ◀
   └─ core · theme
```

## Running it

```sh
npm run dev -w @mnd/options          # its harness, over static chrome
npm run typecheck -w @mnd/options
```

**No suite of its own yet.** The harness is the verification: drive it and read the action names it logs.

## What is in here

| | Is |
|---|---|
| `Options.tsx` | the column. Draws the groups it is handed, in a fixed order whatever order they arrive in |
| `groups.ts` | `groups_of` — the standard groups built from the slots a projection declared, plus the `Control` and `Group` shapes |
| `options.css` | the look: a 68px column, group labels in micro-caps, a glyph over one word |

## The rules it lives by

- **A view module declares which groups it offers**, and the shell knows how to build each. **A matrix has no interfaces toggle because it declares none**, never because one was greyed out.
- **`relations` is drawn last**, because it is the only group that grows with the vocabulary.
- **A verb never lights.** There is no arrangement a layer is currently *in*, so `on` is left undefined and nothing in a verb group is ever highlighted.
- **What does not apply is not drawn.** Greying out is for a fixed row whose positions are worth learning.

## The detail

`docs/options.md`.
