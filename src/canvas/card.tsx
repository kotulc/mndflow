/** Re-exports: pieces moved to the block view module (S2.6b).
 *
 *  Page and gestures still import from here so the canvas folder stays the
 *  thin host surface; the drawing lives under `modules/view/diagram`. */

export {
  Name, Port, Berth, Perch, Anchor, fitTag, along, seat, FACING, SIDES,
  LIFTED, REFERRED,
  type Grazed, type CardData, type Seated, type PortProps,
} from "../modules/view/diagram/pieces";
