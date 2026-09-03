# Block View

**Any planar projection.** A layer is what is looked at; this is the looking. It reads the graph and hands back a Scene — it never writes a mutation and never touches the DOM.

```
project(graph, layer, config) → Scene
```

| Config | Is |
|---|---|
| `holds` | what to show, when it is not the layer's own contents |
| `interfaces` | whether seated interfaces draw. A display preference the shell hands down |

## What it draws

| | From | Notes |
|---|---|---|
| **the frame** | the layer itself | the layer seen from inside, its name set into its own border |
| **cards** | `laid(graph, layer)` | every child that is not an interface |
| **boundaries** | group membership | drawn behind what they hold, sized to their members |
| **seats** | `seated(graph, spots)` | interfaces, drawn over the card they sit on |
| **routes** | `edges_in(graph, layer)` | one line per relationship with both ends drawn here |

**The root has no frame.** A frame is a block seen from outside, and the workspace has no outside. Everywhere else it is what the layer holds plus a margin, and never smaller than the room a first block needs — so descending into an empty block shows somewhere to put something rather than a blank page.

## Marks

**How a block reads, derived.** Every one of these comes from what the block holds or from where it sits — none of them is a sort of thing, and none is stored.

| | Means |
|---|---|
| `container` | it holds blocks |
| `reference` | it stands for something living elsewhere |
| `missing` | what it stood for is gone. **Kept, never tidied away**, so undoing a deletion elsewhere brings it back |
| `group` | a boundary |
| `note` | it is its own text |
| `interface` | seated on an edge, with `in` and `out` for its flow mark |

## Hits

**A gesture lands on a hit, and a hit comes from the Scene.** What a gesture *means* belongs to the module that drew the thing; the renderer knows only how to dispatch.

- **The frame is the biggest hit and comes first**, so a smaller one always wins — the innermost thing under the pointer is what a click acts on.
- **A seated interface answers as a `seat`**, not a box, which is what makes a drag on one a slide rather than a move.
- **A route is picked by the box around it**, widened so a thin run is hittable.
- **Nothing derived answers a gesture.** A boundary is its members' bounds and a berth draws nothing at all — neither is something anybody made, so neither is picked.

## Interfaces and ends

- **An interface is seated, never laid out** — a side and a fraction along it, so the seat survives the card moving, growing or being arranged some other way.
- **An end seated on an interface leaves by that interface's side**, unless the relationship was walled somewhere else by hand.
- **Turning interfaces off hides the seats and never the lines.** An end lands on the card instead, so the relationship is still drawn.
