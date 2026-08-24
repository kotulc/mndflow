# @mnd/explorer

**The workspace tree, and structure only.** A pure function of its props: it holds nothing, reads no storage, and every gesture leaves as an action name somebody else runs.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `theme` |
| **Proven by** | its own dev server over a fixture — driven, emitting action names and mutating nothing |

```
npm run dev  -w @mnd/explorer
npm test     -w @mnd/explorer
```

## What is in here

| | Is |
|---|---|
| `Explorer.tsx` | the tree, its header bar, and the drag |
| `Menu.tsx` | the offered list, on right-click |
| `explorer.css` | the look |
| `dev/` | its own Vite root, and a harness that folds a fixture and logs every action emitted |

## What it draws

- **Blocks, nested to any depth.** Boundaries, notes, fields and references are never listed — a reference is a second appearance of something already there. **Interfaces are behind a toggle.**
- **Every top-level block is its own subtree**, filed into the folders the workspace keeps.
- **The open layer and the selection are two states with two looks** — *open* is where the stage is pointed, *selected* is what an action would act on. They stack, and selected reads first.
- **Every role carries a mark**, and a container is filled where a leaf is outlined, because the fill is what says it holds something.

## What it refuses to do

- **It writes no mutation.** `＋` names `create`, a drag names `move` or `refer`, and the app runs them.
- **It never rearranges the tree.** Folding is the user's alone, and walking into a layer changes nothing about what is open.
- **Opening comes before selecting**, because opening clears the selection — the order is pinned by a test rather than left to the order of two calls.

## The detail

`docs/explorer.md`.
