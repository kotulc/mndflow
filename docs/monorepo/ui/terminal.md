# Terminal
**What it is.** An interactive, adaptive, context-aware, **collapsible** strip. It **reflects
context and action as you use the app** — you act on the canvas, the terminal says what happened —
so it is a **mirror** as much as an input. It can **focus and highlight parts of the workspace and
the page**, which is what makes filtering visible and interactive help possible at all.

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

- **The verb lists are examples, not an enumeration.** Somebody will type a word nobody listed, and
  **substring matching cannot answer that** — so meaning-matching and a learned store of what this
  person actually reaches for are both kept, and pointed at the four commands.
- **Completions say what they matched and fill an example.** The matched command with its
  description, and arguments filled with an example rather than left blank — a prompt that shows its
  own shape needs no syntax to learn. **A name typed with separators reads as spaced words**:
  `heat_exchanger` → `Heat Exchanger`.
- **Results are a table, on the stage.** Package search, workspace filtering and workspace status
  present through the real table view — **not a second listing inside the terminal**. This is the
  first caller handing a table something that is not a layer's contents, and it needs the same seam
  a **view block** needs: do not invent a second.
- **Help is the fallback, and it carries the action surface.** Anything unmatched lands in
  interactive docs, tutorial and prompts. **Every registered action is reachable and runnable
  there**, so nothing becomes unreachable by text and the strip stays four commands wide. *This is
  what makes help load-bearing rather than a courtesy.*
- **It mirrors what you do.** A create, a relate and a descend each show; quiet mode silences all
  three. **This is what makes it worth keeping open.**
- **It can focus and highlight.** Filtering lights what matched; help points at the control it is
  describing. **One mechanism, two callers**, and it reuses the one lit-target look — never a third.

**A tutorial teaches whatever the app currently is**, which is why it waits for this and not the
other way round.