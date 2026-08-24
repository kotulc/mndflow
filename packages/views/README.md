# @mnd/views

**A layer, projected.** Three view modules, each turning a graph and a layer into a **Scene** — plain data, importing nothing drawable.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `layout` |
| **Proven by** | every Scene it emits is well-formed, over every layer of every fixture, and the invariants catch what they are for |

## Where it sits

```
web · cli
└─ render                            (the cli reaches views directly)
   └─ views   ◀
      └─ layout
         └─ core
```

## Running it

```sh
npx vitest run packages/views                 # its suite, from the repo root
npm run start -w @mnd/cli -- project related  # a Scene as text, which is the second renderer
```

## What is in here

| | Is |
|---|---|
| `scene.ts` | the seam: `Box`, `Route`, `Hit`, `Frame`, `Scene`, and `faults` — what every well-formed Scene satisfies |
| `block.ts` | any planar projection: a frame, cards, boundaries, seated interfaces, routed lines |
| `read.ts` | how a behavior layer is read — lanes, order, controls, and the three readings |
| `table.ts` | rows and no frame; a column per field the rows carry |
| `matrix.ts` | two axes, cells filled where a relationship runs |
| `derive.ts` | what every module derives the same way: a block's marks, and the trail |
| `adjust.ts` | what a positional drag is asking for — `reseat` and `rewall` |
| `text.ts` | a Scene as characters. The second renderer, and the one that makes a notation testable with no browser |

**`faults` is the contract.** This package proves everything it emits passes it; `render` proves it draws anything that does. Neither imports the other.

## The detail

`docs/views.md`, and one per module: `block.md`, `table.md`, `matrix.md`.
