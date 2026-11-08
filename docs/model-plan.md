# Model plan

**Make a model mean something: an informative overview of a system, told as narrative paths from its entry points through its primary components, with the walk front and centre.** Taken up 2026-11-07, once simplify-plan.md and translate-plan.md closed; it takes over translate-plan.md's acceptance. **Delete this plan when the user accepts the shop and both translations (this repo, mndsite) as models.**


## Next session

**Design first, nothing built.** Settle *Questions* with the user, record each in design.md as decided, then build in one pass. Regenerate before looking (*Commands*).


## Goal

| | |
|---|---|
| **a model is** | an overview of one system: its primary parts, its entry points in reading order, and the paths that run from them |
| **the story** | the model's business: its narrative paths and the order its entries are read in belong to the model, not to a view |
| **the walk** | front and centre: how a person meets a model, never a mark to hunt for |
| **acceptance** | the shop, this repo and mndsite each read as such a model in the app; `mnd measure` as a check |


## Decided

| # | Decision | Since |
|---|---|---|
| 1 | **a model's diagram is its kind's**: a model never says its own `diagram`; the door drops one, the look action refuses it | 2026-11-07 |
| 2 | **the `model` kind places `layered`**, as the translator's `ts.package` does | 2026-11-07 |
| 3 | **a box groups, never behaves**: a behaviour in a region or folder belongs to the block whose layer the box is on | 2026-11-07 |
| 4 | **the story and the reading order of entries are the model's** | 2026-11-07 |
| 5 | **the walk is front and centre** in how a person interacts with a model | 2026-11-07 |


## Found 2026-11-07

| Finding | Notes |
|---|---|
| **few walks, hard to find** | a walk starts only from its owner, picked (▶). Shop has one (8 steps, its region's two behaviours); elements none; this repo 6 entry modules (4–12 steps); mndsite 7, six of them 1 step |
| **nothing points to a walk** | a model says nothing of the paths it holds; opening it offers none |
| **an entered sequence offers no walk** | its owner is not drawn inside it, so its own steps cannot be walked there |
| **a flow walks nothing** | Payments' *Payment retry*: its steps stand for nothing outside it, so its path is empty |
| **scrolled views never fit a walk** | class, entity and registry views scroll to their focus; no walk reaches one today |
| **a block with behaviours draws as a class card** | Shop in Overview now lists `Checkout saga()` and `Fulfilment()` as methods (views `look.ts` `faced`); kept, as Payments always did |
| **measures** | this repo's top layer 18 crossings landscape, 4 portrait; the shop's Shop layer 8; both as at `279534d` |


## Questions

| # | Question | Options, leaning first |
|---|---|---|
| 1 | **what a model's diagram shows** | a) its primary parts with entries first and its paths drawn, the treemap kept as the map · b) the map as today, its walks listed beside it |
| 2 | **where a walk starts** | a) entering a model offers its walks, entries in reading order, and walks the first · b) the ▶ on a block only, as today |
| 3 | **what a walk step is** | a) one hop lit, said in words, as today, with the model's own text where it has some · b) a view, a focus and text (design.md *Open*, walkthroughs) |
| 4 | **which paths a model tells** | a) each entry's path, then the behaviours of its primary parts · b) only paths written for it (an agent's walkthrough) |
| 5 | **a 1-step path** | a) folded into what calls it, never a walk of its own · b) kept |
| 6 | **a layered model's direction** | a) by the canvas's shape, as every layered layer is (ELK tries down and across) · b) always top down |
| 7 | **views over budget** | the translator splits `views` into 10 components where `most` is 9. a) let it stand: thresholds are defaults · b) tune the split |


## Carried from translate-plan.md

- **the user's direction** (2026-11-02): a deterministic structure found from the graph, not agentic band-aids; no hard rules about what a block is; thresholds are defaults with floors; balance depth against the big picture; diagrams are visual information, never lists of parts; agents refine and narrate on top
- **the walk's refinements** (the user, 2026-11-05): the user likes *walk its path* on sequences and has refinements in mind; take them up under *Questions* 2–3


## Commands

- **regenerate**: `npm run samples`; `npm run code` (this repo → `samples/code.json`); mndsite by hand: `cd apps/ts && npx vite-node src/main.ts ../../../mndsite ../../samples/mndsite`, then `npm run start -s -w @mnd/cli -- collect ../../samples/mndsite ../../samples/mndsite.json --workspace`; `check` each. `npm run base` after a base kind change, `npm run packages` after a `ts` kind change
- **measure**: `npm run start -s -w @mnd/cli -- measure ../../samples/<name>.json [layer]`; entered diagrams only, not the map
- **see it**: a Playwright script (Edge, `channel: "msedge"`) starting Vite from `apps/web/vite.config.ts`, routing `**/mndflow.yaml` to `workspace: /samples/<name>.json` (`tray: open`); pick or enter a node by id (`.react-flow__node[data-id="…"]`), never by text. In Git Bash set `MSYS_NO_PATHCONV=1`
