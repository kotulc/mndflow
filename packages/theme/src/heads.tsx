/** The heads a run may draw, as SVG markers. */

/** The shapes, in the order they read: solid, bare, hollow, diamond — then those only what an
 *  end means draws: a filled diamond (composition) and the crow's feet of an entity diagram. */
export const HEAD_SHAPES: { name: string; d: string; open?: boolean; crow?: boolean }[] = [
  { name: "arrow", d: "M 0 0 L 10 5 L 0 10 z" },
  { name: "open", d: "M 0 0 L 10 5 L 0 10", open: true },
  { name: "hollow", d: "M 0 0 L 10 5 L 0 10 z", open: true },
  { name: "diamond", d: "M 0 5 L 5 0 L 10 5 L 5 10 z", open: true },
  { name: "filled", d: "M 0 5 L 5 0 L 10 5 L 5 10 z" },
  { name: "one", crow: true, d: "M 6 0 L 6 10 M 0 5 L 10 5", open: true },
  { name: "many", crow: true, d: "M 0 5 L 10 0 M 0 5 L 10 10 M 0 5 L 10 5 M 2 0 L 2 10", open: true },
  { name: "zero_one", crow: true, d: "M 7 0 L 7 10 M 0 5 L 10 5 M 3 5 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0",
    open: true },
  { name: "zero_many", crow: true, d: "M 2 5 L 10 0 M 2 5 L 10 10 M 2 5 L 10 5 M 1 5 m -1 0 a 1.5 1.5 0 1 0 3 0 a 1.5 1.5 0 1 0 -3 0",
    open: true },
];

/** How big a head draws, in stroke widths: a crow's foot nearly twice an arrow, so how many
 *  reads at a glance; its stroke kept as fine as a line's. */
const SIZE = 6;
const CROW = 11;

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
                  refX="9" refY="5" markerWidth={h.crow ? CROW : SIZE}
                  markerHeight={h.crow ? CROW : SIZE} orient="auto-start-reverse">
            <path d={h.d} className={["mnd-head", h.open ? "open" : "", h.crow ? "crow" : ""]
              .filter(Boolean).join(" ")} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
