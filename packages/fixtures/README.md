# @mnd/fixtures

**Sample data, as logs rather than graphs.** Folding one is what exercises the engine, so the same files feed the CLI, every suite and every dev harness. **One set of sample data, three consumers.**

| | |
|---|---|
| **Entry** | `src/index.ts` — `fixture(name)`, `FIXTURES`, `NAMES` |
| **Depends on** | `core`, `defs` |
| **Proven by** | being used. Every suite that folds one proves it parses |

```
npx tsx apps/cli/src/main.ts fold related
```

## The logs

| | Is |
|---|---|
| `flat` | one tree, three siblings, nothing else. The simplest thing that draws |
| `nested` | two trees, one nested two deep, one folder. Exercises the tree |
| `related` | a chain and a fan, with a note and a boundary. What routing is tested on |
| `interfaced` | two seated interfaces and a relationship running port to port. What `seat` and `wall` are proven on |
| `behaved` | a behavior layer shaped as `infer` writes one, with a branch so a control has something to count |

## The rules

**Sample data is for proving things, never for shipping.** A test and a dev harness may reach a fixture; nothing under any package's `src/` may, and the dependency-law test enforces both halves.

**A fixture is a log, not a graph.** Building one as a graph would skip the fold, the door and the step shape — which is most of what there is to get wrong.

**`num` is fixed at creation**, so a fixture counts per parent exactly as the `create` action does and the explorer reads the order it expects.
