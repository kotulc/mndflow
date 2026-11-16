/** **What a line shows, from its laid length** (2026-11-15): decided from the drawing, never the
 *  zoom, so nothing on a line comes or goes as the camera moves; zoom only fades it (stage
 *  `flow.css` `--detail`). Hover and pick show the words on any line. */

/** Layout units a line needs: its anchors; its name, past the name's own width; its ends' words. */
const NEED = { anchors: 24, name: 24, ends: 120 };

/** What a line `length` long shows, its name `name_w` wide, both as laid. */
export type Shows = { anchors: boolean; name: boolean; ends: boolean };

export function line_shows(length: number, name_w: number): Shows {
  return { anchors: length >= NEED.anchors, name: length >= name_w + NEED.name,
           ends: length >= NEED.ends };
}
