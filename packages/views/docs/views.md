# Views

**A view is a perspective.** Blocks define structure and containment, relations describe usage and reference, and a view says how a set of them is looked at. A view module is the code behind one way of looking; a **view definition** names a module and configures it; a **view block** is an instance, holding one reference per thing it shows.

## Three modules, and closed

**`block` is any planar projection**, and `table` and `matrix` are the two that are not a plane. That is the whole reason there are three rather than six — a notation that lays things out on a surface is the block module with different configuration.

| Module | Word | Draws |
|---|---|---|
| `block` | block | a frame, cards, boundaries, seated interfaces, routed lines |
| `table` | row | rows and no frame; a column per field the rows carry |
| `matrix` | cell | two axes, cells filled where a relationship runs |

**Each publishes a distinct icon and a word for what it calls its elementary block**, so a chip fallback reads correctly without anything being stored.

## Six offered views

**A reading is how you look, never something inferred.** It configures the block module rather than being one, which is why three of the six offered views name the same module.

```
view def "activity"  { module: block, reading: activity }
view def "sequence"  { module: block, reading: sequence }
view def "state"     { module: block, reading: state }
```

- **Which view is showing is session state**, kept outside the log. Switching changes what you see and nothing about the model.
- **There is no derived kind of layer**, so any layer can be switched to any view it is offered.
- **The registry is what this build supplies**, keyed by the names core owns. Which modules exist is the model's business; which are built is this package's, so a half-built one is simply absent rather than broken.

## What a module owns

| | Is |
|---|---|
| **the surround** | a frame and its walls, or nothing |
| **the viewport** | a camera, or a scrollbar. What *fit* means here |
| **the chrome** | which control groups it offers, as `slots` |
| **asking** | where a gesture puts a question, since one asks for a name before anything is made |
| **adjustments** | which of the four it accepts, and it may accept none |

- **A view module names actions; it never writes a mutation.**
- **An unregistered `type` falls back to the engine's card.** A module declares what it draws *differently*, so nothing has to be complete to be usable.
- **A layout law may decline to place**, and then the layer arranges as usual.

## The Scene is the seam

```
project(graph, layer, config) → Scene { boxes, routes, slots, hits, bounds }
```

**Plain data, importing nothing drawable.** `render` turns a Scene into DOM and the CLI turns one into text, so a notation is a pure function and most of the product is provably correct before anything is drawn.

**`faults` is the contract.** Every module proves what it emits passes; every consumer proves it handles anything that does. **Neither imports the other**, so when they meet in an app there is nothing left to discover.

| Invariant | |
|---|---|
| no two boxes share an id | a hit could not name one of them |
| every route's ends name a drawn box | a line to nowhere is a bug in the producer |
| every bend is a right angle | the one thing a route may never do |
| every hit names something drawn, and has area | a gesture that resolves to nothing |
| a seated box is seated on something drawn | an interface without its card |
| every box is inside the frame | a card outside the layer it belongs to |

## Composition

**Inference makes blocks; composition arranges references.** Two different things, and separating them is what makes view work tractable.

| | Makes | Runs | Is |
|---|---|---|---|
| `infer` | **new blocks** | once, when somebody asks | model, and permanent |
| composition | **nothing** — a grouping, spacing and ordering | every draw | presentation, recomputed |

**One metric: proximity** — how far apart two referenced blocks sit in the tree, which is a path distance and deterministic. **Group** by nearest common ancestor, **order** by tree path, **space** by distance where the view has room. A table and a matrix have rows, so they take the grouping and the order and drop the spacing.

- **A proximity group is a derived group**, so nothing needs storing for one to appear.
- **Proximity is the default and must be overridable.** A view whose point is a cross-cut wants grouping by type, and proximity would give it exactly the grouping it was built to escape.

## Views as blocks

- **A saved view is a block** whose definition names a view module, holding one reference per thing shown. It costs no concept.
- **Everything a view shows is a reference** — a card, a table row, a matrix axis label alike.
- **A view holds views.** A matrix's two axes are child views, so a filter or a third dimension costs nothing new.
- **A view is filed beside what it looks at**, never inside it — a view of a layer that lived in that layer would show itself.
- **A reference resolves anywhere in the workspace.** A gone target reads **missing**, and is kept rather than tidied away, so undoing a deletion elsewhere brings it back.
- **What is done through a reference reaches home.** Renaming one renames the block.
- **A relationship into another tree is a reference plus an ordinary edge**, both filed with the end making the claim.
- **Depth** says how far a reference reaches — `self`, `children` or `all`.
- **Nothing about how a view looks enters the tree it reads.**
