/** **The ladder, picked by room**: how far up mark → head → facts → preview a form goes, from its
 *  size on screen. Nobody chooses it, and the layout never moves for it. */

/** A level on the ladder: 0 mark, 1 head, 2 facts, 3 preview. Level 4, full, is the hover card's
 *  and the tray's. */
export type Level = 0 | 1 | 2 | 3;

/** What each level needs on screen, in pixels: a head is one 22px line at least 50 wide; facts
 *  one more line; a preview at least one 15px row more. A mark needs nothing past its square. */
const NEED: Record<Level, { w: number; h: number }> = {
  0: { w: 0, h: 0 },
  1: { w: 50, h: 22 },
  2: { w: 50, h: 44 },
  3: { w: 50, h: 59 },
};

/** **Hysteresis**: a level drops only this far below the size that added it, so zoom resting near
 *  a threshold never flickers. */
const HOLD = 0.85;

/** **The text band**: text scales with zoom only between these, and holds its size outside them
 *  (`flow.css` `--text-k`). A preview's rows are laid at the layout's size, so they read whole only
 *  where text is not held larger than they were laid for: at `low` and above. */
export const TEXT_BAND = { low: 0.85, high: 1.15 };

/** The level a form `w` by `h` pixels on screen shows at `zoom`, given the one it showed: the
 *  highest that fits whole, but never below `was` while it still fits within the hold. */
export function level_at(w: number, h: number, zoom = 1, was: Level | null = null): Level {
  const fits = (l: Level, k = 1) => w >= NEED[l].w * k && h >= NEED[l].h * k
    && (l < 3 || zoom >= TEXT_BAND.low * k);
  const up = ([3, 2, 1] as const).find((l) => fits(l)) ?? 0;
  return was !== null && was > up && fits(was, HOLD) ? was : up;
}

/** **A line's level, from its length on screen**: its stroke always; its anchors from `anchors`
 *  pixels; its name beside the stroke where the line is longer than the name by a margin; its
 *  ends' words from `ends`, inside the text band. Hover and pick show the words at any level. */
const LINE = { anchors: 24, name: 24, ends: 120 };

export function line_level(length: number, zoom: number, name_w: number): Level {
  const on = length * zoom;
  if (on >= LINE.ends && zoom >= TEXT_BAND.low) return 3;
  if (on >= Math.max(LINE.anchors, name_w + LINE.name)) return 2;
  return on >= LINE.anchors ? 1 : 0;
}
