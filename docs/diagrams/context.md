# context

**Layer kind. What a part is made of, its ports, and what is across them.** Merges `internal` (2026-11-13). Purpose, surface and placing agreed 2026-11-13; layout open below.

## Purpose

| | |
|---|---|
| **answers** | what is this part made of, and what does it meet |
| **draws** | the part's frame: its parts inside, its ports on the wall, what is across each port outside, data flows labelled by schema |
| **at the top** | the system's context: the system, its actors and externals (mndsite part 1, A) |
| **one level down** | a part's frame: its siblings and its parent's ports across its own ports |

## Utility

| | |
|---|---|
| **draw it** | the first diagram of any part with parts of its own or a way out; every flow of a part draws inside its frame (model-plan.md decision 14) |
| **skip it** | a part with no parts and one port: its chip says enough |
| **vs flow** | context is what stands: parts and the data that passes between them, in no order. A flow is steps in an order |
| **vs dataflow** | context shows every flow across the frame; a dataflow follows one datum through many parts |
| **vs tree** | a tree is containment only, weighted, no lines; context is one level, with its lines |

## Surface

| | |
|---|---|
| **base** | `context`, extending `block`: view `internal`, placed by context bands (*Layout*) |
| **the outside** | base kinds `actor` (starts or uses the system) and `external` (what it reads, writes or builds with), extending `block` |
| **file** | the part's own file: its `ports` (each typed by the schema it carries), its parts and lines. **What is across is never written here**: a model part's neighbours (siblings, a parent's ports, actors, externals) are written once, in the layer where they sit, and drawn across from the frame |
| **tool** | `mnd draw context <selection.json> <out>` (docs/tools/context.md) |

```yaml
# mndsite.yaml: the system's frame
name: mndsite
type: context
ports:
  - {name: content, flow: in, type: md tree}
  - {name: config, flow: in, type: Config}
  - {name: versions, flow: in, type: version tags}
  - {name: dist, flow: out, type: site}
blocks: [build, site]
relations:
  - content -> build
  - config -> build
  - versions -> build
  - build -> site: generated files
  - site -> dist
```

## Layout

**Placed by what each thing is; nothing chosen.** Three bands around the frame, reusing the banded layer (design.md *Perspectives*: a layer with regions is banded): the flow runs along the canvas's long side.

| Zone | Holds | Landscape | Portrait |
|---|---|---|---|
| **start** | actors, and externals joined only to actors (a registry CI pushes to) | band above | column left |
| **in** | what flows into an in-port: externals, a parent's in-ports, siblings sending | column left | band above |
| **frame** | the part, its inside laid by its own layout (layered where lines join, else packed) | middle | middle |
| **out** | what an out-port reaches | column right | band below |
| **uses** | what it builds with or calls both ways (a framework, a store read and written) | band below | column right |
| **outer ring** | an external joined only to another external (upstream, downstream) | beyond the one it joins, same zone | same |

**How it scales.**

| Grows | What happens |
|---|---|
| **parts inside** | the inside sizes the frame; the zones stretch along its walls |
| **externals on one port** | one card per port, its externals as name rows (`git · package.json`), so a side never holds more cards than its wall has ports |
| **ports on a side** | the wall lengthens: the frame's side is the longer of its inside and its zone |
| **actors** | one row as wide as the frame; beyond it, folded into one card of rows, *+n more* last |
| **a zone empty** | takes no space; the frame stays centred on what is there |
| **crossings** | none outside the frame: ports sit in the order of the cards across them; that order follows the parts inside each port feeds (barycentre), so crossings inside are fewest |
| **gaps** | fixed (feedback: consistent spacing), wide enough for a schema label on the line; a long label wraps, never widens a gap |

**In the engine**: the bands are the banded layer's; the middle band is ELK layered with the frame a compound node, ports `FIXED_SIDE` and `FIXED_ORDER`, the in zone first layer, the out zone last; start and uses ports on the frame's top and bottom walls (north and south ports).

**What decides a zone** (so the rule reconstructs a picture): an `actor` is start; an `external` joined only to actors is start, at its end; a dependency line (builds with, calls) is uses, as is a port with flow `both`; a line into an in-port is in, out of an out-port is out; a sibling or a parent's port by the flow of the port it meets.

**Picture B against the rule**: the outside lands as drawn; the inside is ELK layered along the flow axis, so theme presets sits left of configuration, not below it, and B's inside reads as one chain (theme → configuration → ingest → metadata).

**Picture A against the rule**: mndmap (upstream of the content folder) moves from above it to the outer ring left; *any host* (downstream of the output folder) to the outer ring right; GHCR (joined only to the CIs) stays in the start band, at its end.

## Agreed 2026-11-13

| # | Decision |
|---|---|
| 1 | the kind is `context`, merging `internal` |
| 2 | what is across is written once, in the layer where it sits, and drawn across from the frame (model parts, as definitions are for types) |
| 3 | `actor` and `external` are base kinds (general) |
| 4 | the outside is placed by what it is, generalized as *Layout* |
| 5 | gaps: one fixed lane per side, sized for a two-line schema label at the card's text size |
| 6 | an external read and written through two ports: one card in the uses band, two lines |
| 7 | an outer ring past one step folds into the card it joins, as a row (`content folder ← mndmap`) |
