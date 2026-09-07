# Plan

**Pinned definitions: a vocabulary built by pointing.** What is settled, what each part costs, and the order to build it. The goal state is design.md and spec.md; this closes ST.13, and ST.15 — the relation half — is deliberately later.


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
| **`Definition.from?: string`** | `types.ts` | the package it came from; absent means this workspace made it. Groups the section, lets the door reconcile shipped definitions on load, makes *a package resists editing* checkable without a hardcoded id list, and tells an export what travels as a reference |
| **a block may carry rules** | `actions.ts` | `set_look`'s check allows `card` and `style` only. `looks` is already `Components` and `fold`'s `set_look` case is already generic, so widening the allowlist is the whole change |
| **`rules_of` takes an id** | `rules.ts` | so a block's own `looks.rules` is the last layer over the chain, the way `look.ts` already does for `card` and `style`. **Everything in a definition then has a usage counterpart** |
| **list-valued rules replace** | `rules.ts` | `holds` and `required` are lists, not values. The nearer statement wins, consistent with the rest of the cascade — and replace is strictly more expressive than union, since a block stating the whole list can narrow *or* widen |
| **`constraints` merges into `rules`** | `components.ts`, `rules.ts`, `door.ts` | `required` is the only thing in `constraints`, and two component keys for one concept is drift. Costs one component retired, two shipped package files edited, and one door repair — the same shape as the existing `structure` → `block` rename |
| **`def_of` fallback** | `fold.ts` | two id lookups, as above |
| **`write_subtree` collects through `def_of`** | `file.ts` | it collects from `b.type`, so a block naming nothing contributes `undefined` and the workspace's override is dropped from a project export. `def_of` is already *the definition a thing resolves through*. A whole-workspace export writes all of `graph.defs` and was never affected |
| **`pin` · `unpin` · the override action** | `actions.ts` | the three new entries on the surface |

**Nothing else moves.** No reserved block, no new block field, no schema version, no migration of existing blocks.


## Order of work

| | | Proves |
|---|---|---|
| **1** | `from` on `Definition`, and the door reconciling shipped definitions against it | `mnd check` over a workspace that grafted sysml |
| **2** | rules on a block: widen `set_look`, `rules_of` by id, `constraints` folded into `rules` with the door repair | `mnd review` reads a rule stated on one block |
| **3** | `def_of` fallback and the `ws.<kind>` override action | `mnd project` draws a workspace whose `ws.block` restyles every plain block |
| **4** | `write_subtree` through `def_of` | export a project, re-open it, plain blocks keep their look |
| **5** | `pin` and `unpin` | `mnd run <src> pin name=Pump`, then `unpin`, and the graph comes back the same |
| **6** | the vocabulary section in the explorer | driven: pin, see the row, drag it out, override a base kind, watch the row replace |
| **7** | the definition panel in the tray — fields and rules authored | **after the tray rework**, which is its own phase |

**Steps 1–5 are drivable from the CLI with no UI at all**, which is the point of having one.


## Known issues this will surface

- **`sysml.json` is stale.** Its definitions extend `structure` and `behavior` — base kinds the door repairs on the way in — and `sysml.ibd` carries `group: "view"`, which is not one of the two values `group` has. Nothing leans on it today; the vocabulary section is what will make it visible.
- **Nothing checks that a named package exists**, and nothing checks definition name uniqueness within a package. The door is where both belong, beside the repairs it already runs.
- **A definition retired in code lives on in every log already written.** The seed is laid down once, when storage is empty. `from` is what finally gives the door something to reconcile against.


## Deliberately not in this

| | |
|---|---|
| **matching on re-pin** | two blocks that read alike are not thereby the same kind of thing |
| **pinning values by default** | reading one usage's values as a schema is a guess |
| **relation definitions in the section** | a relationship is drawn between two ends and never dropped, so there is nothing to drag a row onto. ST.15 |
| **a second style mechanism** | a palette or a format painter would be a second vocabulary system beside definitions. `look` over a selection already covers the no-ceremony case |
