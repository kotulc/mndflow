/** The projection: a layer as a plane of placed blocks. */

export * from "./about";
export * from "./facts";
export * from "./derive";
export * from "./face";
export { class_graph, DRAWN_BY } from "./classes";
export { legend_of, type Legend, type Row } from "./legend";
export * from "./scene";
export * from "./size";
export * from "./arrange";
export * from "./seat";
export { drawn, middle_of, name_box, route, NAMED, STUB, type NameBox } from "./route";
export { measure, type Measure } from "./measure";
export { avoided_run, load_avoid, routes_of } from "./avoid";
export { hop_trace, picked_trace, trace_of, type Leg, type Trace } from "./trace";
export * from "./svg";
export * from "./text";

export { project, type Config } from "./block";
export { place, set_elk, type Placement } from "./flow";
export { box_label, box_place, registry_map, usage_box, usage_groups, usage_layout,
         type LocatedUse, type Tile as MapTile } from "./library";
export { area_of, area_under, layer_map, library_map, map_focus, model_map, section_map, stop_area,
         towards, box_for, chip_for, chip_map, mini_map, type Mini,
         type WhereBox } from "./map";
export { laid_ahead, layer_scene } from "./layer";

export { BARE, PLAIN, entry_look, face_attrs, look_key, look_of, tint_attrs, type Tint, wire_of, wire_tint, type Align,
         type Arrow, type Border, type Contrast, type Height,
         type Family, type Font, type Look, type Part, type Weight, type Width,
         type Wire } from "./look";
export { page_graph } from "./page";
export { tiled, weight_of, type Tile } from "./treemap";
export { sheet_graph, GRID_LAYER } from "./sheet";
export { entries_of, matrix_of, registry_scene, MOST, type Entry, type Line as MatrixLine, type Matrix,
         type User } from "./registry";
export { read_through } from "./through";
export { level_at, line_level, TEXT_BAND, type Level } from "./level";
