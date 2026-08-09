import { route, type Box } from "../src/geometry/route";

const a: Box = { x: 240, y: 240, w: 168, h: 36 };
const b: Box = { x: 720, y: 240, w: 168, h: 36 };

// A card hemmed in by its neighbours — what a dense layer looks like.
const around: Box[] = [
  { x: 216, y: 168, w: 216, h: 48 },   // above
  { x: 216, y: 300, w: 216, h: 48 },   // below
  { x: 144, y: 216, w: 48,  h: 96 },   // left
  { x: 432, y: 216, w: 48,  h: 96 },   // right
];

console.log("no obstacles          ", route(a, b, [])          ? "ok" : "NULL");
console.log("hemmed in             ", route(a, b, around)      ? "ok" : "NULL");
console.log("hemmed in, with frame ",
  route(a, b, around, { bounds: { x: 0, y: 0, w: 1200, h: 600 } }) ? "ok" : "NULL");

// Two cards overlapping, which a drag or a group move can produce.
const over: Box = { x: 250, y: 250, w: 168, h: 36 };
console.log("overlapping ends      ", route(a, over, [])       ? "ok" : "NULL");
