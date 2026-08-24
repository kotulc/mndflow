# @mnd/terminal

**One collapsible strip. Not a chat, and not a command palette.** It reflects context and action as you use the app — you act on the canvas, the terminal says what happened — so it is a mirror as much as an input.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `theme` |
| **Proven by** | its own dev server over a static offered list — driven, naming actions and mutating nothing |

```
npm run dev -w @mnd/terminal
```

## What is in here

| | Is |
|---|---|
| `Terminal.tsx` | the strip: the prompt, what was said, and the offered list as chips |
| `terminal.css` | the look, collapsed and expanded |

## The four commands

**The strip stays four wide**, because help is the fallback and carries the whole action surface — so nothing becomes unreachable by text without a fifth thing appearing.

| Command | Reached by | Asks for |
|---|---|---|
| **add** | `+` `b` `block` `new` `add` `insert` `create` | a name — `heat_exchanger` arrives as `Heat Exchanger` |
| **filter** | `:` `f` `find` `filter` `scope` `view` | what to match |
| **search** | `*` `s` `search` `import` `load` | a definition package |
| **help** | `?` `h` `help` `doc` `guide` `how` | anything at all. **Unmatched text lands here** |

**The verb lists are examples, not an enumeration.** Somebody will type a word nobody listed, and substring matching cannot answer that — meaning matching through the `score` port and a learned store of what this person reaches for are both meant to point at these same four. Until one is bound, the lists and the help fallback are what there is.

**In addition it mirrors what you do.** A create, a relate and a descend each show, which is what makes it worth keeping open.

## The rules that hold it in place

- **The app is whole without it.** Every capability it adds must exist without it — if the only way to do something is to say it, it has stopped being optional. **Nothing below it may import it.**
- **It reads context and never changes it**, because it ranks *against* context, and a surface that moved context would shift the ground its own ranking stands on.
- **It reaches actions and never writes a mutation of its own.**
- **Chips are the offered list**, ranked through the `score` port with **substring as the cold fallback** — which is what is built, since `score` is unbound.
- **`Enter` confirms the highlight and arrows move it**, because a default that is invisible and changes under the user is the version of adaptive ranking worth avoiding.

## Still not built

**`filter` and `search` name themselves and do nothing** — both need a caller that can put a table on the stage, and **results are a table on the stage, never a second listing inside the terminal**. Ranking is substring until the `score` port is bound. Focus-and-highlight, interactive help and the tutorial are all ahead.

## The detail

`docs/terminal.md`, which is the end state in full.
