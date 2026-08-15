/** What a view module must provide to show a layer at all.
 *
 *  Per module, never per definition. The components configure the things *in*
 *  a layer; this is the layer as a workspace. A diagram has a frame and a
 *  camera; a table scrolls and has neither — putting the frame in a component
 *  would give every table a border it cannot draw. */

/** Controls a diagram's chrome may offer. Open: grow by a code change. */
export const CHROME = [
  "crumbs", "interfaces", "form", "angular", "types", "axis", "arrange", "relax",
] as const;

export type ChromeKind = (typeof CHROME)[number];

/** How the module draws the layer's border — or declines to. */
export type Surround = "frame" | "none";

/** How the module scrolls or zooms the working area. */
export type Viewport = "camera" | "scroll";

/** The four concerns. Named here so another module can answer differently
 *  without inventing a seventh component. */
export type Surface = {
  surround: Surround;
  viewport: Viewport;
  chrome: readonly ChromeKind[];
  /** Whether a gesture may ask for a name before anything is made. */
  asks: boolean;
};

/** Today's canvas: a framed plane with a camera, the full chrome, and a place
 *  to ask. The base diagram, written down as one surface among others. */
export const DIAGRAM: Surface = {
  surround: "frame",
  viewport: "camera",
  chrome: CHROME,
  asks: true,
};
