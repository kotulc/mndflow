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

- **A section chain, always.** The host declares its sections; mndflow's are `packages`, `definitions` and `structure`.
- **Blocks, nested to any depth**, holders among them. Fields are never listed, and interfaces are part of the block they sit on.
- **A usage lists its definition's parts**, marked, before its own children.
- **The open layer and the selection are two states with two looks** — *open* is what the canvas draws, *selected* is what is browsed and what an action would act on. They stack, and selected reads first.
- **Every row wears its card's icon**, read from core's `role_of`, so a row and its card never disagree; one that holds blocks lights it. A package root wears the root mark, or the lock where frozen; a relation definition its run.

## What it refuses to do

- **It writes no mutation.** `＋` names `create`, a drag names `move` or `refer`, and the app runs them.
- **It never rearranges the tree.** Folding is the user's alone, and opening a layer changes nothing about what is folded.
- **Opening comes before selecting**, because opening clears the selection — the order is pinned by a test rather than left to the order of two calls.

## What it says, and how

A host means what it likes by an act, but the shape of each is fixed — a consumer outside this repo reads the same names and arguments the app does.

| Gesture | Act | Args |
|---|---|---|
| click a row | choose | `{ at, id }` — selects; the canvas stays |
| double-click a row, Enter, → | `open` | `{ id }` — a part opens its definition |
| F2 on a row, and type | `rename` | `{ id, name }` — `name`, never `label` |
| drag onto a row | `move` | `{ ids, parent }` |
| drag between two rows | `move` | `{ ids, parent, before? }` — `before` is the sibling to land above; absent, they land last |
| `＋` | `create` | `{ name, parent, type }` |
| the remove tool, on a block | `delete` | `{ id }` |

**A move names a sibling, never an index.** `before` is the id of the row the moved ones land above, and it is never one of the rows being moved; a host that seats by position resolves it itself.

## The bar's tools

**Every tool is drawn unless told otherwise**, so the app passes nothing. `tools` turns each off by name:

```tsx
tools={{ filter: false, block: false, folder: false, remove: false }}   // the fold stays
```

Each tool is its own switch — `filter`, `block`, `folder`, `remove`, `fold` — so a host keeps the ones that mean something to it. **`extra` is a host's own tools**, drawn after the filter and ahead of the bar's own — a translator's *add a document*, say:

```tsx
tools={{ block: false }}
extra={<button title="add a document" onClick={open}><Icon name="add_document" /></button>}
```

`menu` and `tools` are two questions. `menu={false}` drops the offered list on right-click and leaves the bar alone.

## The detail

`docs/explorer.md`.
