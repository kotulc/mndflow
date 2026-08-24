# Render

**Scene → React, and nothing else.** It reads what a projection placed and knows nothing about the graph, the log or the actions.

- **It is a package, not part of the web app.** A second host renders in a webview, which is a browser — so the renderer is shared and only the port bindings differ. Putting it inside `apps/web` would make the second host depend on the first.
- **It draws what a Scene says**: boxes, routes, marks and the hit regions a gesture lands on. Binding a hit to an action id is the whole of its input job.
- **It owns the look**: cards, the theme ramp, icons, and animate.
- **Proven by** one conformance test — every Scene element kind draws, and every hit binds.

## What it draws

- **A pointer maps through a letterbox.** The Scene is fitted to the element, so reading a click as if the element mapped straight onto it is right in exactly one case and wrong everywhere else.
- **A card is a rectangle with its name**, and what it looks like comes from its definition's slot and emphasis.
- **A reference is the only dashed card**, showing the name of the block it stands for and having no inside.
- **An interface is a small square on the edge it is seated on**, filled or open by its flow mark, carrying no label of its own.
- **A boundary is a faint dashed line** whose bounds are its members' — a default rather than a rule, and never a parent.
- **A note is its text.**
- **One thing highlights at a time** — the innermost under the pointer, which is what a click would act on. Selecting makes the highlight fixed. **Nothing else highlights**, in particular not what a recent action changed.

## The ramp reaches the drawing

**Slots × steps**: a step is a job and means the same job everywhere; a slot is a family. Six pickable slots and four reserved to the app — `away`, `note`, `error`, `warn`, which keep their hue across themes because *elsewhere* and *a note* mean one thing everywhere. **Steps are computed, not written**, so a new theme is about twenty numbers. **The shell reads the same ramp**, so the header cannot drift from the drawing.
