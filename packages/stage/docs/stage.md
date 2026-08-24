# Stage

**The working area, and the one thing that never yields.** Chrome gives way under pressure — the crumbs truncate, the option groups scroll, the explorer bounds itself — and the stage keeps its room.

**The stage hosts one view at a time.** Which view is showing is session state, never in the log.

| | Fills the stage with |
|---|---|
| **canvas** | the **block** view — a frame, cards, boundaries and routed lines |
| **table** | rows, and a column per field in scope |
| **matrix** | two axis views, cells marked by the relationships between them |

**The canvas is the block view's renderer, not the container.** Table and matrix fill the stage the same way it does; none of the three is nested inside another.

**The stage publishes its geometry upward.** Arranging needs the laid-out result only the stage has, so the options rail calls what it was handed. The shell never reaches into the stage — dependencies run one way.

**Everything the app says goes to one strip at the top of the stage**: a refusal, a repair report, a storage warning, a rule note. One place to look, and silent when there is nothing to say.

**In v1**: the canvas alone.
