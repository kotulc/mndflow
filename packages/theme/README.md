# @mnd/theme

**The ramp, as CSS custom properties. No code**, no build step, and nothing to import but the stylesheets.

| | |
|---|---|
| **Entry** | `ramp.css` and `base.css` |
| **Depends on** | nothing |
| **Proven by** | nothing to prove — it declares values. What reads them is proven in `render` |

```
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
```

## What is in here

| | Is |
|---|---|
| `ramp.css` | the slots and their steps, per theme |
| `base.css` | the page ground — background, text, and the element defaults every surface starts from |

## How the ramp works

**Slots × steps.** A **step** is a job — fill, line, edge, ink, dim, stroke — and means the same job in every slot. A **slot** is a family: some a definition may pick from, and four reserved to the app.

**The four reserved slots keep their hue across every theme**, because what they mean does not change with the palette:

| | Means |
|---|---|
| `away` | elsewhere — a reference, another tree |
| `note` | description rather than structure |
| `error` | something is wrong |
| `warn` | something needs attention |

- **A definition picks a slot and an emphasis, never a colour.** Two things looking alike is two things being alike.
- **Steps are computed from a few numbers rather than written out**, so a new theme is about twenty values and not a table of hexes.
- **The shell reads the same ramp as the canvas**, so the header cannot drift from the drawing.
- **Selection is the app speaking about your model**, so it takes the accent and no definition may claim it.
