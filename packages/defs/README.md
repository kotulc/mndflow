# @mnd/defs

**Data only. No code.** The definition packages the engine and the user draw on, validated by core's door.

| | |
|---|---|
| **Entry** | `src/index.ts` — `FLOOR`, `ALL`, `BASE`, `RELATIONS`, `PACKAGE`, `by_id`, and `base_graph()`, which hands the base package to anything without one as a graph |
| **Depends on** | `core`, for the `Definition` shape alone |
| **Proven by** | every shipped definition passes the door, and every module any of them names exists |

## Where it sits

```
web · cli · kit · fixtures
└─ defs   ◀
   └─ core
```

## Running it

```sh
npm run start -w @mnd/cli -- check flat   # the door, over a log the base package seeded
npm run typecheck -w @mnd/defs
```

**No suite of its own yet.** The door in `core` and `test/law.test.ts` at the root are what stand in.

## What it ships

| | Is |
|---|---|
| `FLOOR` | every block of the `base` package, read from `src/base.json` — **the package is JSON**, as every package is |
| `BASE` | the block kinds: `block`, `folder`, `group`, `grid`, `reference`, `interface`, `note`, `tag` |
| `RELATIONS` | the relation kinds `line` and `tie` |
| traits | `tied`, `resizable`, `body content` — tags carrying settings; `note` carries all three |
| `base_graph()` | a fresh workspace with the base package under it |

## The rules it lives by

- **The engine may key off a base definition only for how a block draws and where it sits** — never for anything a package could have said instead.
- **Core cannot depend back.** `defs` depends on core, so an app hands the base definitions into a session the same way it hands in a port.
- **A package is data; a module is code.** A package maps names and presentation, never structure — a notation needing structural change is a module, and then it is one engine capability plus a package, shipping together.
- **A package must be useful with portable presentation alone.** It degrades rather than breaks when the module it names is not in the build.

**In v1**: `base` alone. Nothing else is needed to make, nest and relate a block.

## The detail

`docs/defs.md`.
