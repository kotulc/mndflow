# Terminal
**What it is.** An interactive, adaptive, context-aware, **collapsible** strip. It **reflects context and action as you use the app** — you act on the canvas, the terminal says what happened — so it is a **mirror** as much as an input. It can **focus and highlight parts of the workspace and the page**, which is what makes filtering visible and interactive help possible at all.

**Two views, and a mute.**

| | Shows |
|---|---|
| **expanded** | prompt / context history, plus a chip, plus the chip's description |
| **minimal** | the current context or completion, plus a chip |
| **both** | a toggle at the **far right** to a static cursor — **quiet mode** |

**Four commands, and the verbs are flexible.** A user reaches for their own word and it is matched.

| Command | Reached by |
|---|---|
| **add blocks** | `+` `b` `block` `new` `add` `insert` `create` |
| **filter workspace** | `:` `f` `find` `filter` `scope` `view` |
| **search packages** | `*` `s` `search` `import` `load` |
| **interactive help** | `?` `h` `help` `doc` `guide` `how` |

- **The verb lists are examples, not an enumeration.** Somebody will type a word nobody listed, and **substring matching cannot answer that** — so meaning-matching and a learned store of what this person actually reaches for are both kept, and pointed at the four commands.
- **Completions say what they matched and fill an example.** The matched command with its description, and arguments filled with an example rather than left blank — a prompt that shows its own shape needs no syntax to learn. **A name typed with separators reads as spaced words**: `heat_exchanger` → `Heat Exchanger`.
- **Results are a table, on the stage.** Package search, workspace filtering and workspace status present through the real table view — **not a second listing inside the terminal**. This is the first caller handing a table something that is not a layer's contents, and it needs the same seam a **view block** needs: do not invent a second.
- **Help is the fallback, and it carries the action surface.** Anything unmatched lands in interactive docs, tutorial and prompts. **Every registered action is reachable and runnable there**, so nothing becomes unreachable by text and the strip stays four commands wide. *This is what makes help load-bearing rather than a courtesy.*
- **It mirrors what you do.** A create, a relate and a descend each show; quiet mode silences all three. **This is what makes it worth keeping open.**
- **It can focus and highlight.** Filtering lights what matched; help points at the control it is describing. **One mechanism, two callers**, and it reuses the one lit-target look — never a third.

**A tutorial teaches whatever the app currently is**, which is why it waits for this and not the other way round.


## The four, in detail

**A completion says what it matched and fills an example**, so the prompt shows its own shape and there is no syntax to learn.

| Command | Asks for | Example | Reaches |
|---|---|---|---|
| **add** | name them | `Heat Exchanger` | `create`, in the open layer |
| **filter** | match what | `pump` | narrows the workspace and **lights what matched** |
| **search** | look for | `sysml` | a definition package, through the `net` port, brought in through the door |
| **help** | ask about | `how do I relate two blocks` | docs, a tutorial, and **every registered action** |

- **A sigil may be glued to its argument**: `+pump` and `+ pump` read alike, and so do `:`, `*` and `?`.
- **Help is the fallback and it is not a refusal.** Anything unmatched lands there rather than being rejected, which is what keeps every action reachable by text while the strip stays four wide.
- **A name typed with separators reads as spaced words**, so nobody has to reach for the shift key: `heat_exchanger` → `Heat Exchanger`.


## The rules that hold it in place

- **It reaches actions and never writes a mutation of its own.**
- **The strip stays four wide**, because help is the fallback and carries the whole action surface — so nothing becomes unreachable by text without a fifth thing appearing.
- **Chips are the offered list**, ranked through the `score` port with **substring as the cold fallback** — which is what is built, since `score` is unbound.
- **`Enter` confirms the highlight and arrows move it**, because a default that is invisible and changes under the user is the version of adaptive ranking worth avoiding.


## What is built

| | |
|---|---|
| **the strip**, collapsed and expanded, with the quiet-mode toggle at the far right | ✅ |
| **the four commands**, matched by verb or sigil, **help as the fallback** | ✅ |
| **completions that say what they matched and fill an example** | ✅ |
| **`heat_exchanger` → `Heat Exchanger`** | ✅ |
| **chips are the offered list**, and **help's argument filters every action there is** | ✅ |
| **`Enter` confirms the highlight, arrows move it, `Escape` abandons** | ✅ |
| **it mirrors what the app said** — one channel, the same strip the stage uses | ✅ |
| **`add` runs** `create` in the open layer | ✅ |

## Still not built

- **Meaning matching and the learned store.** Ranking is **substring**, which is the cold fallback: the `score` port is unbound, so a word nobody listed reaches help rather than the command it meant. **The verb lists are examples, not an enumeration**, and substring cannot answer that — this is the gap the port exists to close.
- **`filter` and `search` name themselves and do nothing.** Both need a caller that can put a table on the stage.
- **Results are a table, on the stage** — package search, workspace filtering and workspace status present through the real table view, **never a second listing inside the terminal**. This is the first caller handing a table something that is not a layer's contents, and it needs the same seam a **view block** needs: do not invent a second.
- **Focus and highlight.** Filtering should light what matched and help should point at the control it is describing — **one mechanism, two callers**, reusing the one lit-target look rather than a third.
- **Interactive help and the tutorial.** A tutorial teaches whatever the app currently is, which is why it waits for this and not the other way round.
- **Quiet mode silences the mirror.** The toggle collapses the strip today; it does not yet mute what it reflects.

## What holds it in place

**One collapsible strip. Not a chat, not a command palette.** The app is whole without it, and nothing below it may import it.

- **It reflects context and action as you use the app** — you act on the canvas, the terminal says what happened — so it is a mirror as much as an input.
- **It reads context and never changes it**, because it *ranks against* context and a surface that moved context would shift the ground its own ranking stands on.
- **It reaches actions and never writes a mutation of its own.**
- **Chips are the offered list**, ranked through the `score` port with substring as the cold fallback.
- **`Enter` confirms the highlight and arrows move it**, because a default that is invisible and changes under the user is the version of adaptive ranking worth avoiding.
- **Every capability it adds must exist without it.** If the only way to do something is to say it, it has stopped being optional.
