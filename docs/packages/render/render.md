# Render

**Scene → React, and nothing else.** It reads what a projection placed and knows nothing about the
graph, the log or the actions.

- **It is a package, not part of the web app.** A second host renders in a webview, which is a
  browser — so the renderer is shared and only the port bindings differ. Putting it inside
  `apps/web` would make the second host depend on the first.
- **It draws what a Scene says**: boxes, routes, marks and the hit regions a gesture lands on.
  Binding a hit to an action id is the whole of its input job.
- **It owns the look**: cards, the theme ramp, icons, and [animate](animate.md).
- **Proven by** one conformance test — every Scene element kind draws, and every hit binds.
