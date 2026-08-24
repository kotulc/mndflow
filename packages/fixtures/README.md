# @mnd/fixtures

**Sample data, for the two ways in.** A **log** is folded, which is what exercises the engine; a **file** is opened, which is what exercises the seam. The same samples feed the CLI, every suite and every dev harness.

| | |
|---|---|
| **Entry** | `src/index.ts` — `fixture(name)`, `FIXTURES`, `NAMES` for the logs; `graph_file(name)`, `GRAPHS`, `GRAPH_NAMES` for the files |
| **Depends on** | `core`, `defs` |
| **Proven by** | being used. Every suite that folds one proves it parses |

## Where it sits

```
cli · every suite · every dev harness
└─ fixtures   ◀
   └─ core · defs
```

## Running it

```sh
npm run start -w @mnd/cli -- fold related    # a log, folded: the block tree
npm run start -w @mnd/cli -- check orphaned  # a file, opened: what the door repaired
npm run typecheck -w @mnd/fixtures
```

**No suite of its own**, by design — a log is proven by every suite that folds it, and a file by the reader that opens it. Both are driveable from the CLI, which is what says they are done being built in the dark.

## The logs

| | Is |
|---|---|
| `flat` | one tree, three siblings, nothing else. The simplest thing that draws |
| `nested` | two trees, one nested two deep, one folder. Exercises the tree |
| `related` | a chain and a fan, with a note and a boundary. What routing is tested on |
| `interfaced` | two seated interfaces and a relationship running port to port. What `seat` and `wall` are proven on |
| `behaved` | a behavior layer shaped as `infer` writes one, with a branch so a control has something to count |

## The files

**Graphs this engine never wrote**, hand-written and mostly wrong on purpose — because the one thing the outside world can do is hand over a file, and a file the engine wrote proves only that it agrees with itself. They are **text**, since a file that does not parse is one of the things `open` has to answer for.

| | Is | `open` |
|---|---|---|
| `clean` | a root, a tree under it, one relation | reads |
| `orphaned` | a block whose parent is not in the file | repairs to the root |
| `dangling` | a relation with an end that is not there | drops the relation |
| `rootless` | no root block at all | repairs |
| `unmoored` | a definition filed under nothing, and one extending nothing | repairs both |
| `ahead` | a higher **minor** schema | reads |
| `future` | a higher **major** schema | drops the file |
| `garbage` | not JSON | drops the file |

**The property is that `validate` finds nothing after `open`** — not the wording of any one fault. A reader that repairs into a state still failing the door has not repaired anything.

## The rules

**Sample data is for proving things, never for shipping.** A test and a dev harness may reach a fixture; nothing under any package's `src/` may, and the dependency-law test enforces both halves.

**A sample of the engine is a log, never a graph.** Building one as a graph would skip the fold, the door and the step shape — which is most of what there is to get wrong. **A sample of the seam is the opposite**, and the two do not substitute for one another: a log proves the engine agrees with itself, a file proves it reads what it did not write.

**`num` is fixed at creation**, so a fixture counts per parent exactly as the `create` action does and the explorer reads the order it expects.
