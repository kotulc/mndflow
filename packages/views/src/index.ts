/** The projection: a layer as a plane of placed blocks. */

export * from "./derive";
export * from "./face";
export { class_def, fields_graph } from "./fields";
export { legend_of, type Legend, type Row } from "./legend";
export * from "./scene";
export * from "./size";
export * from "./arrange";
export * from "./seat";
export { drawn, middle_of, route, STUB } from "./route";
export * from "./svg";
export * from "./text";

export { project, type Config } from "./block";

export { BARE, PLAIN, face_attrs, look_key, look_of, wire_of, type Align,
         type Arrow, type Border, type Contrast, type Display, type Height,
         type Family, type Fill, type Font, type Look, type Part, type Weight, type Width,
         type Wire } from "./look";
export { linked_graph, LINK } from "./links";
export { survey_graph, FOREST } from "./survey";
export { profile_graph } from "./profile";
export { page_graph } from "./page";
export { sheet_graph, GRID_LAYER } from "./sheet";
export { read_through } from "./through";
