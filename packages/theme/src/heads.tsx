/** The heads a run may draw, as SVG markers.
 *
 *  **Beside the icons, for the same reason the role marks are.** It is drawing
 *  data: the stage draws a run on the canvas and the tray previews the same run
 *  beside the controls that set it, and a head that drew differently in the two
 *  would be worse than no preview. The one table, and both render it.
 *
 *  **One `<defs>` per surface, addressed by id.** A marker is referenced by id,
 *  so one set serves every line on a surface — and each surface takes a prefix
 *  of its own so two mounted at once do not share an id.
 *
 *  **`context-stroke` is what makes a head match its line.** A marker draws in
 *  its own context, so a head that named a colour would be the one part of a run
 *  that ignored the family it was painted with. */

/** The shapes, in the order they read: solid, bare, hollow, diamond. Every one
 *  is drawn in the same ten-by-ten box and anchored at the same point, so
 *  swapping one for another never moves where the line stops. */
export const HEAD_SHAPES: { name: string; d: string; open?: boolean }[] = [
  { name: "arrow", d: "M 0 0 L 10 5 L 0 10 z" },
  { name: "open", d: "M 0 0 L 10 5 L 0 10", open: true },
  { name: "hollow", d: "M 0 0 L 10 5 L 0 10 z", open: true },
  { name: "diamond", d: "M 0 5 L 5 0 L 10 5 L 5 10 z", open: true },
];

/** Where a head is referenced from. **Nothing for `none`**, so a plain run
 *  carries no marker attribute rather than one pointing at an empty shape. */
export function head_url(shape: string | undefined, id = "mnd"): string | undefined {
  return shape && shape !== "none" ? `url(#${id}-head-${shape})` : undefined;
}

export function Heads({ id = "mnd" }: { id?: string }) {
  return (
    <svg className="mnd-heads" aria-hidden="true">
      <defs>
        {HEAD_SHAPES.map((h) => (
          <marker key={h.name} id={`${id}-head-${h.name}`} viewBox="0 0 10 10"
                  refX="9" refY="5" markerWidth="6" markerHeight="6"
                  orient="auto-start-reverse">
            <path d={h.d} className={h.open ? "mnd-head open" : "mnd-head"} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
