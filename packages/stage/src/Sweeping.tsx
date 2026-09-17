/** The grid a right drag is about to make, drawn as it is swept. */

import { swept_cells, CELL } from "@mnd/views";

export function Sweeping({ at }: { at: { x: number; y: number; w: number; h: number } }) {
  const { x, y, rows, cols } = swept_cells(at);
  const box = { x, y, w: cols * CELL.w, h: rows * CELL.h };
  const on = box;
  const lines: React.ReactNode[] = [];
  for (let n = 0; n <= rows; n++) {
    const y = on.y + n * CELL.h;
    lines.push(<line key={`r${n}`} className="mnd-drawn-rule"
                     x1={on.x} y1={y} x2={on.x + on.w} y2={y} />);
  }
  for (let n = 0; n <= cols; n++) {
    const x = on.x + n * CELL.w;
    lines.push(<line key={`c${n}`} className="mnd-drawn-rule"
                     x1={x} y1={on.y} x2={x} y2={on.y + on.h} />);
  }
  return (
    <>
      <rect className="mnd-drawn mnd-drawn-area"
            x={box.x} y={box.y} width={box.w} height={box.h} />
      {lines}
      <text className="mnd-drawn-count" x={box.x + box.w / 2} y={box.y + box.h + 16}
            textAnchor="middle">{rows} × {cols}</text>
    </>
  );
}
