# @mnd/explorer

**The workspace tree, and structure only.** A pure function of its props: it holds nothing, reads no storage, and every gesture leaves as an action name somebody else runs.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `theme` |
| **Proven by** | its own dev server over a fixture — driven, emitting action names and mutating nothing |

## Where it sits

```
web
└─ explorer   ◀
   └─ core · theme
```

## Running it

```sh
npm run dev -w @mnd/explorer         # its harness, over a fixture
npx vitest run packages/explorer     # its suite, from the repo root
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
- **Every role carries a mark**, and a container is filled where a leaf is outlined, because the fill is what says it holds something. **The root is the exception**: it wears a root mark, never filled, since it always holds everything.
- **Three sections, when the library is drawn:** `packages` — what was brought in; `definitions` — the workspace's own; `usages` — the one tree of blocks, under its root. The user's package is the last two.
- **Nothing picked on the root layer is the root picked.** Its row lights, because the workspace is what the tray is then about.

## What it refuses to do

- **It writes no mutation.** `＋` names `create`, a drag names `move` or `refer`, and the app runs them.
- **It never rearranges the tree.** Folding is the user's alone, and walking into a layer changes nothing about what is open.
- **Opening comes before selecting**, because opening clears the selection — the order is pinned by a test rather than left to the order of two calls.

## What it says, and how

A host means what it likes by an act, but the shape of each is fixed — a consumer outside this repo reads the same names and arguments the app does.

| Gesture | Act | Args |
|---|---|---|
| click a row | `reveal` | `{ id }` |
| double-click a name, and type | `rename` | `{ id, name }` — `name`, never `label` |
| drag onto a row | `move` | `{ ids, parent }` |
| drag between two rows | `move` | `{ ids, parent, before? }` — `before` is the sibling to land above; absent, they land last |
| `＋` | `create` | `{ name, parent, type }` |
| the remove tool, on a block | `delete` | `{ id }` |

**A move names a sibling, never an index.** `before` is the id of the row the moved ones land above, and it is never one of the rows being moved; a host that seats by position resolves it itself.

## The bar's tools

**Every tool is drawn unless told otherwise**, so the app passes nothing. `tools` turns each off by name:

```tsx
tools={{ filter: false, create: false, remove: false }}   // the fold stays
```

`menu` and `tools` are two questions. `menu={false}` drops the offered list on right-click and leaves the bar alone.

## The detail

`docs/explorer.md`.
