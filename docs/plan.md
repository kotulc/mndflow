# Plan

**Pinned definitions: a vocabulary built by pointing.** What is settled, what each part costs, and the order to build it. The goal state is design.md and spec.md; this closes ST.13, and ST.15 — the relation half — is deliberately later.

**Status: the ground under it is built; the gesture is not.** Step 7 was taken first and grew — the tray's definition panel needed a style vocabulary a definition could actually say, and half of what a card looks like turned out to be hardcoded in a stylesheet where no subtype could reach it. That is now data, and the shipped package is a floor rather than a step, so changing it takes effect everywhere on the next load. Steps 1–6, which are pinning itself, are untouched.

**Start here.** Read *The shipped package is a floor* before changing anything about definitions — it is the rule that makes schema churn cheap, and it is easy to undo by accident. Then *Order of work*: step 3 is the one the rest lean on, and steps 1–5 are drivable from the CLI with no UI at all. `samples/workspace.mndflow.json` is the check: import it, or `npm run start -w @mnd/cli -- check samples/workspace.mndflow.json`.


## What it is

**Point at a block that already reads the way you want, and make that a definition.** A stereotype library built by pointing rather than by writing a definition first and applying it after. The workspace grows a **vocabulary section** listing every block definition it can reach — its own, each imported package's, and the base — and a definition is dragged out of it to make a block naming it.

**Two needs, and only the second is new.**

| | Mechanism | Status |
|---|---|---|
| "make these look alike, now" | `look` over a selection — one step, one undo, no definition | built |
| "make this a thing I can reach for later" | `pin` | this plan |

**The pin is the moment somebody says *these are the same kind of thing*.** That is not derivable from the graph, which is why it is stored and why customising a block does not file a definition on its own.


## The gesture

| | |
|---|---|
| **what it takes** | the block's `looks`, always. `fields`, `values` and `rules` are arguments, each **false** unless said, and offered only when the block has them |
| **what it makes** | a definition homed on the workspace root, `from` absent, `extends` the block's current definition |
| **what happens to the block** | it names the new definition and drops its `looks`. Nothing about how it draws changes |
| **naming** | required. `def_id` slugs the name into the id, so a second *Pump* collides — **refuse**, with the name that is taken |
| **re-pinning** | duplicates are allowed when the names differ. Two things that read alike today may diverge tomorrow, so nothing is matched or merged |
| **unpin** | **one act.** Dissolves the definition into every block naming it — `components` into each block's `looks`, field schema into each block's `fields` with no values — then drops it. Lossless, because a block can carry rules too |

**`values` pins the block's current field values as the definition's `default`.** That is the difference between pinning a schema and pinning a template, and it is opt-in for that reason.


## The section

**A rendering, not blocks.** Every row is `graph.defs` read through a filter — `group === "block"` — grouped by `from`. Nothing has an id of its own and nothing is realised until it is dragged out or set as an override.

| | |
|---|---|
| **why not a folder** | a reserved folder needs an id, a seed change, a door migration, and defences against rename, delete and drop. A rendering needs none of it and **works in every workspace already written** |
| **what a row looks like** | a block in the explorer, with a pin mark |
| **grouping** | the workspace's own at the top, each imported package a sub-branch, the base kinds included |
| **one row per base kind** | an override **replaces** the base row rather than sitting beside it. The base definition is never deleted — the override extends it — it is simply not listed twice. Unpinning brings the base row back |
| **selecting one** | describes it in the tray, a third branch beside blocks and relations. This is where fields and rules are authored |
| **dragging one out** | `create` with `type?`. No new action |

**The only thing given up by one-row-per-kind** is typing a single block to the pristine base while everything else uses the override. Still reachable by giving that block its own `looks`.


## Overriding a base kind

**Always explicit, and resolved by id.** A package must never take over a project by being imported — and `sysml.json` already ships a definition **named `block`**, so a name route was never safe.

```
def_of, when a block names no type:

  graph.defs["ws.block"]   ??   graph.defs["block"]
       the workspace's override      the engine default
```

| | |
|---|---|
| **the id** | `ws.<kind>`, reserved. Minted by the override action directly, **never through `def_id`**, which strips dots |
| **what it extends** | the base definition, or an imported package's — `ws.block extends sysml.block` is how a notation is adopted |
| **what it carries** | whatever the override says. An adoption carries nothing and only points |
| **why it is safe** | the fallback asks for an id and never for a name, so nothing imported can capture it. No precedence rule, nothing to reason about |
| **scope** | `block`, `folder`, `resource`, `reference`. Relations later — ST.15 |

**`ws.` rather than `base.`**, because the base package already ships `block` at a bare id and one word should not mean both the shipped package and the workspace's override of it.


## What changes in the engine

| Change | Where | Why |
|---|---|---|
| **`Definition.from?: string`** | `types.ts` | the package it came from; absent means this workspace made it. Groups the section, makes *a package resists editing* checkable without a hardcoded id list, and tells an export what travels as a reference. **Reconciling a shipped package on load was its fourth job and is already done** — the session re-applies what the app hands in, comparing rather than rewriting |
| **a block may carry rules** | `actions.ts` | `set_look`'s check allows `card` and `style` only. `looks` is already `Components` and `fold`'s `set_look` case is already generic, so widening the allowlist is the whole change |
| **`rules_of` takes an id** | `rules.ts` | so a block's own `looks.rules` is the last layer over the chain, the way `look.ts` already does for `card` and `style`. **Everything in a definition then has a usage counterpart** |
| **list-valued rules replace** | `rules.ts` | `holds` and `required` are lists, not values. The nearer statement wins, consistent with the rest of the cascade — and replace is strictly more expressive than union, since a block stating the whole list can narrow *or* widen |
| **`constraints` merges into `rules`** | `components.ts`, `rules.ts`, `door.ts` | `required` is the only thing in `constraints`, and two component keys for one concept is drift. Costs one component retired, two shipped package files edited, and one door repair — the same shape as the existing `structure` → `block` rename |
| **`def_of` fallback** | `fold.ts` | two id lookups, as above |
| **`write_subtree` collects through `def_of`** | `file.ts` | it collects from `b.type`, so a block naming nothing contributes `undefined` and the workspace's override is dropped from a project export. `def_of` is already *the definition a thing resolves through*. A whole-workspace export writes all of `graph.defs` and was never affected |
| **`pin` · `unpin` · the override action** | `actions.ts` | the three new entries on the surface |

**Nothing else moves.** No reserved block, no new block field, no schema version, no migration of existing blocks.


## The shipped package is a floor

**`base` is never in a log.** `fold(log, floor)` lays the shipped definitions down first and replays the log over them, so what the build ships is what every workspace draws in, the moment it opens. There is no copy to go stale and nothing to reconcile.

| | |
|---|---|
| **where it comes from** | `ports.defs`, which an app already passes. `core` may not import `defs`, so the floor is handed in the way a port is |
| **what the door does** | strips any `set_def` or `drop_def` for a shipped id out of a log on the way in. The bad state has nowhere to live rather than being repaired once it does |
| **checkpoints** | an imported file carries every definition it reached, the shipped ones included — so the floor is **re-laid after every checkpoint**. A file stays self-contained to read, and the receiving build always draws in its own vocabulary |
| **what a workspace does instead** | says its own `block` with a subtype extending the shipped one. A different id, and it passes untouched |

**This is what makes changing definitions cheap.** Edit `packages/defs/src/base.ts`, reload, done — no migration, no reconciliation step, no version. It is also why the door no longer carries vocabulary translations: they existed to repair drift that can no longer happen, and this is not a shipped product.

**Two ways to undo it by accident.** Putting the seed back into `seeded()`, or letting an action write a definition whose id the floor ships — see step 0 below, which is still open.


## Order of work

| | | Proves | |
|---|---|---|---|
| **0** | **lock the floor**: `field`, `unfield` and `define` refuse a definition whose id the floor ships, and say to subtype it instead | `mnd run <src> field holder=block name=x` is refused | **not started** |
| **1** | `from` on `Definition` | `mnd check` over a workspace that grafted sysml | **not started** |
| **2** | rules on a block: widen `set_look`, `rules_of` by id, `constraints` folded into `rules` | `mnd review` reads a rule stated on one block | **not started** |
| **3** | `def_of` fallback and the `ws.<kind>` override action | `mnd project` draws a workspace whose `ws.block` restyles every plain block | **not started** |
| **4** | `write_subtree` collects through `def_of` | export a project, re-open it, plain blocks keep their look | **not started** |
| **5** | `pin` and `unpin` | `mnd run <src> pin name=Pump`, then `unpin`, and the graph comes back the same | **not started** |
| **6** | the vocabulary section in the explorer | driven: pin, see the row, drag it out, override a base kind, watch the row replace | **not started** |
| **7** | the definition panel in the tray | driven | **built, less rules and fields authoring** |

**Steps 1–5 are drivable from the CLI with no UI at all**, which is the point of having one.

**Step 0 is new and small, and everything else assumes it.** The floor cannot be written by a log, but three actions will still happily `set_def` a shipped id if one is named — `field`, `unfield` and `define` all do `ctx.graph.defs[holder]` with no guard. No path in the tray reaches it today, since every one of them passes a *block* id, but a terminal or CLI call does. Refusing it is what keeps the floor a floor.

**Step 1 lost one of its four jobs.** `from` was to be what let the door reconcile a shipped package on load; the floor does that structurally, so `from` now earns its place on grouping the section, checking *a package resists editing*, and telling an export what travels as a reference. Still worth having, no longer the blocker.

**Step 3 is the keystone.** `pin` files a definition, the section renders it, and the override names it — all three want `def_of`'s fallback to exist first.


## What was built on the way

**Step 7 first, and it went deeper than a panel.** None of this was in the plan; all of it is what the panel turned out to need.

### The definition panel

| | |
|---|---|
| **three columns** | what it *is*, how it *draws*, and the card itself — one drawing, read against every tab, in its own column so it does not move |
| **the type row** | base kind and subtype on one line, `▪ block › Pump`. `base` and `chain` came out: both said `block` beside a row already saying it |
| **nine tabs, one question each** | color · fill · border · text · marked · icon · name · label · aligned. Each carries the left column's gutter, so both columns read as one panel |
| **rules and fields** | derived and read-only, each under its own head. Authoring them is what step 7 still owes |

### What a definition may now say

| | |
|---|---|
| **`style.hue` · `style.intensity`** | numbers, not a closed set. A slot was always a *(hue, chroma)* pair — the ramp computes every step from those two against the theme's lightness ladder, and freezing them into named families bought nothing the ladder was not already providing |
| **`style.opacity`** | a number. Three named sheers were three invented words for a quantity everybody names, and the value that mattered was a 6% wash no name would have suggested |
| **`style.line` · `style.ink`** | how far the border and the writing stand out: `faint · soft · strong · full`. **Four rungs, not a number** — the ladder is tuned per theme and the rungs are not evenly spaced on it, so a fraction would land somewhere nobody chose and land differently in each of the three |
| **`style.fill`** | `solid · hatch · wash · none`, drawn from the card's own steps |
| **`style.decor`** | `none · italic · underline · strike` |
| **`card.name` · `card.label`** | where the name sits, and where the **type** sits. One key did both, which is why putting a type on a card took the name off it |
| **`card.align`** | which end the writing reads from |

### What came out

| | |
|---|---|
| **`card.layout`** | five values, three packages, read by nothing. `card.shows` is what actually composes a card |
| **`style.emphasis`** | three fixed pairings of `line` and `ink`. Redundant once both are sayable — and the reason a reference could not be said at all, since it wants both at `strong`, a fourth pairing the shorthand had no word for |
| **`tertiary` · `quaternary`** | the same chroma as `secondary`, differing only in hue, at a chroma the fill step scales to 0.02 |
| **`away` · `note` as reserved** | now nameable families. While they were not, a reference and a note were drawn by a hardcoded rule and **neither could be subtyped** |
| **`.mnd-card.reference` · `.mnd-card.note`** | gone from the stylesheet. Both kinds are ordinary definitions now. `.mnd-card.missing` stays: that is the app speaking about a fault, not the model speaking |
| **`voice: quiet · normal · loud`** | now `light · normal · bold` — a third scale of loudness beside contrast and opacity, meaning none of the same things |

**Reproduced exactly**, checked against all three themes: the reference's border, ink, fill and hatch, and the note's border and fill. Its ink is the one difference — amber at the same lightness, where it had been blue-violet only by inheriting the slot it happened to name.


## Known issues

**Closed on the way.**

- ~~**A definition retired in code lives on in every log already written.**~~ **Fixed structurally** — see *The shipped package is a floor*. It was first patched by reconciling on open, comparing the stored package against the shipped one and appending what differed; the floor replaced that outright, and the patch and its key-order fragility are gone.
- ~~**`sysml.json` is stale.**~~ **Partly.** Both shipped packages carried `"shape": "rect"`, which was never a card key — so the door had been silently dropping their **entire card component**, `shows` and `icon` with it, since they were written. Removed. Their definitions still extend `structure` and `behavior`, which the door repairs on the way in, and `sysml.ibd` still carries `group: "view"`.

**Still open.**

- **Nothing checks that a named package exists**, and nothing checks definition name uniqueness within a package. The door is where both belong, beside the repairs it already runs.
- **An undefined `var()` takes its whole declaration with it**, rendering as no background rather than a default. It shipped twice in one afternoon. `scripts/lint-css.mjs` now catches a name read but defined nowhere in its package; it does not catch one defined under too narrow a selector, which needs selector parsing. **Not wired into `npm test`** — that is a decision, not an oversight.
- **The sample workspace is the quick check.** `samples/workspace.mndflow.json` carries one of every base kind, four subtypes covering hue, fill, opacity, contrast, decor and alignment, a reference, a note, a grid with a header and three relations. `npm run start -w @mnd/cli -- check samples/workspace.mndflow.json` says `clean`, and importing it in the app is the fastest way to see whether a style change drew what it meant to. **Regenerate it whenever the schema moves** — it is committed data, so a stale one is the very drift this phase was about.
- **`below` is drawn but never measured.** A name or a type set below a card hangs into the gutter the layout leaves between cards. Cards placed closer than one unit by hand will overlap it.

## Deliberately not in this

| | |
|---|---|
| **matching on re-pin** | two blocks that read alike are not thereby the same kind of thing |
| **pinning values by default** | reading one usage's values as a schema is a guess |
| **relation definitions in the section** | a relationship is drawn between two ends and never dropped, so there is nothing to drag a row onto. ST.15 |
| **a second style mechanism** | a palette or a format painter would be a second vocabulary system beside definitions. `look` over a selection already covers the no-ceremony case |
