/** The projection: a layer as a plane of placed blocks. */

export * from "./derive";
export * from "./face";
export { class_graph, DRAWN_BY } from "./classes";
export { legend_of, type Legend, type Row } from "./legend";
export * from "./scene";
export * from "./size";
export * from "./arrange";
export * from "./seat";
export { drawn, middle_of, route, STUB } from "./route";
export { sequence_scene } from "./sequence";
export { avoided_run, load_avoid, routes_of } from "./avoid";
export * from "./svg";
export * from "./text";

export { project, type Config } from "./block";

export { BARE, PLAIN, entry_look, face_attrs, look_key, look_of, tint_attrs, type Tint, wire_of, type Align,
         type Arrow, type Border, type Contrast, type Display, type Height,
         type Family, type Fill, type Font, type Look, type Part, type Weight, type Width,
         type Wire } from "./look";
export { survey_graph, FOREST } from "./survey";
export { page_graph } from "./page";
export { tiled, treemapped, weight_of, type Tile } from "./treemap";
export { sheet_graph, GRID_LAYER } from "./sheet";
export { entries_of, matrix_of, registry_scene, MOST, type Entry, type Line as MatrixLine, type Matrix,
         type User } from "./registry";
export { read_through, resolved, type Resolved } from "./through";
