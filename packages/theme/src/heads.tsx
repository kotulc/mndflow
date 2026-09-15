/** The heads a run may draw, as SVG markers. */

/** The shapes, in the order they read: solid, bare, hollow, diamond. */
export const HEAD_SHAPES: { name: string; d: string; open?: boolean }[] = [
  { name: "arrow", d: "M 0 0 L 10 5 L 0 10 z" },
  { name: "open", d: "M 0 0 L 10 5 L 0 10", open: true },
  { name: "hollow", d: "M 0 0 L 10 5 L 0 10 z", open: true },
  { name: "diamond", d: "M 0 5 L 5 0 L 10 5 L 5 10 z", open: true },
];

/** Where a head is referenced from. */
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
