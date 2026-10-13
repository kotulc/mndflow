/** Writes samples/showcase/workspace.json: one layer per capability, each block explained.
 *
 *  Fixed ids, so a re-run is a readable diff. The door checks the file on the way out. Merges
 *  `diagrams` only. */

import { writeFileSync } from "node:fs";
import { builder } from "./builder.ts";

const U = 24;
const b = builder();
const PICTURE = "/showcase/picture.svg";

b.place({ id: "workspace", parent: null, name: "workspace" });
b.merge("public/packages/diagrams.json");

/* The definitions tree: one folder per topic with definitions of its own. */
b.folder("d_cards", "Cards", "workspace", "definitions");
b.folder("d_definitions", "Definitions", "workspace", "definitions");
b.folder("d_holders", "Holders", "workspace", "definitions");
b.folder("d_data", "Data", "workspace", "definitions");
b.folder("d_diagrams", "Diagrams", "workspace", "definitions");
b.folder("tags", "tags", "workspace", "definitions");

/* The structure tree: one folder per topic, holding its layers. */
b.folder("t_cards", "Cards");
b.folder("t_definitions", "Definitions");
b.folder("t_relations", "Relations");
b.folder("t_interfaces", "Interfaces");
b.folder("t_holders", "Holders");
b.folder("t_references", "References");
b.folder("t_data", "Data");
b.folder("t_diagrams", "Diagrams");

b.def("def_large", "Large layer", "block", { layout: { cards: "large" } },
      { body: "A layer whose cards draw their large face." }, "d_cards");
b.def("def_doc", "Document", "block", { card: { face: "document" } }, {}, "d_cards");
b.def("def_spec", "Spec", "block", { card: { face: "table" } }, {
  def: { attributes: [{ name: "tag", key: true }, { name: "rating", type: "number", unit: "kW" },
                      { name: "duty", note: "how it runs" }] } }, "d_cards");
b.def("def_media", "Picture", "block", { card: { face: "picture" } }, {}, "d_cards");
b.def("def_headless", "Headless", "block", { card: { face: "document", name: "hide" } }, {},
      "d_cards");
b.def("def_sized", "Sized", "block", { card: { face: "document", size: { w: 8, h: 3 } } }, {},
      "d_cards");

b.def("def_machine", "Machine", "block",
      { card: { face: "table" }, style: { family: "secondary" } }, {
        def: { attributes: [{ name: "power", type: "number", unit: "kW" }] } }, "d_definitions");
b.put("dm_power", "def_machine", "interface", { name: "power", type: "interface", flow: "in" });
b.def("tag_rotating", "rotating", "tag", undefined, {}, "tags");
b.def("def_pump", "Pump", "def_machine", { style: { hue: 200 } }, {
  body: "Moves liquid from its inlet to its outlet.", tags: ["tag_rotating"],
  def: { attributes: [{ name: "flow", type: "number", unit: "m3/h" }] } }, "d_definitions");
b.put("dp_inlet", "def_pump", "interface", { name: "inlet", type: "interface", flow: "in" });
b.put("dp_outlet", "def_pump", "interface", { name: "outlet", type: "interface", flow: "out" });
b.put("dp_seal", "def_pump", "interface", { name: "seal", type: "interface", flow: "both" });
b.def("def_bigpump", "Big pump", "def_pump", { style: { border_width: "thick" } }, {
  def: { attributes: [{ name: "stages", type: "number", default: "2" }] } }, "d_definitions");
b.def("rel_drives", "drives", "line", {
  line: { dir: "forward", to_arrow: "open" },
  allows: { ends: { from: ["def_machine"], to: ["def_pump"] } } }, {
  body: "A machine turning a pump's shaft.", tags: ["tag_rotating"],
  def: { attributes: [{ name: "ratio", type: "number" }] } }, "d_definitions");

b.def("def_table", "Table", "grid", undefined, {
  traits: ["has_parts", "has_ports", "has_values", "is_grid", "has_head"] }, "d_holders");

b.def("def_site", "Site", "block", { card: { face: "table" } }, {
  body: "A place that holds assets.",
  def: { attributes: [{ name: "name", key: true }, { name: "region" }] } }, "d_data");
b.def("def_state", "State", "choice", undefined, {
  body: "Whether an asset is running.",
  settings: { value: { choices: ["running", "stopped"] } } }, "d_data");
b.def("def_asset", "Asset", "block", { card: { face: "table" } }, {
  body: "A thing at a site, in a state.",
  def: { attributes: [{ name: "tag", key: true }, { name: "site", type: "def_site" },
                      { name: "state", type: "def_state" }] } }, "d_data");

b.def("def_unit", "Unit", "block", undefined, { body: "A thing a part extends." }, "d_diagrams");
b.def("def_part", "Part", "def_unit", undefined, {
  body: "A part of a unit.",
  def: { attributes: [{ name: "unit", type: "def_unit" }] } }, "d_diagrams");

/* ── About ── */
b.layer("about", "About", "workspace");
b.note("about", "The showcase is one layer per thing mndflow draws. Read the header note, then "
  + "the tied note on each block: it names the field or setting that makes the block look that "
  + "way. Overhead on the rail draws the section in focus. Opening a folder draws its folder "
  + "view; a definition, its definition view under the package and folders on its path. "
  + "Definitions and structure are two trees, each with folders of its own: definitions lists "
  + "the definitions, structure the layers. The workspace roots structure; a definition roots it once it holds blocks of its own. This "
  + "workspace merges the diagrams package.");
for (const [id, of, name, said] of [
  ["ref_cards", "t_cards", "Cards", "Block kinds, faces, styles and a markdown card."],
  ["ref_defs", "t_definitions", "Definitions", "A definition chain, and a relation definition."],
  ["ref_rels", "t_relations", "Relations", "Line direction, arrows, ties and routing."],
  ["ref_ports", "t_interfaces", "Interfaces", "Ports placed, and ports that place themselves."],
  ["ref_hold", "t_holders", "Holders", "A group that nests, and a grid with headers."],
  ["ref_refs", "t_references", "References", "A reference to a block, a definition, or nothing."],
  ["ref_data", "t_data", "Data",
   "Attributes typed by a definition, and the usages that answer them."],
  ["ref_diagrams", "t_diagrams", "Diagrams",
   "Class, swimlane and sequence, and one grid drawn two ways."],
] as const) {
  b.put(id, "about", "reference", { name, type: "reference", of });
  b.explain(id, said);
}

/* ── Cards ── */
b.layer("l_kinds", "Kinds", "t_cards");
b.note("l_kinds", "Every block kind on its small face. Open Folder: it holds Inside, and that is "
  + "not structure.");
b.put("c_block", "l_kinds", "block", { name: "Block" });
b.put("c_folder", "l_kinds", "folder", { name: "Folder", type: "folder" });
b.put("c_inside", "c_folder", "block", { name: "Inside" });
b.put("c_ref", "l_kinds", "reference", { type: "reference", of: "c_block" });
b.put("c_note", "l_kinds", "note", {
  name: "type is note: its text is the card, and its size was set by hand", type: "note",
  w: 8 * U, h: 2 * U });
b.explain("c_block", "type is block, the default kind.");
b.explain("c_folder", "type is folder: it holds Inside, and holds no structure.");
b.explain("c_ref", "type is reference, of Block: it stands in, and wears Ref.");

b.layer("l_faces", "Faces", "t_cards", "def_large");
b.note("l_faces", "A layer whose layout.cards is large draws large faces.");
const face = (id: string, more: Record<string, unknown>) => b.put(id, "l_faces", "block", more);
face("f_body", { name: "Body", type: "def_doc",
  body: "# A heading\n\nProse with **bold**, `code` and a [link](https://example.com).\n\n"
    + "- a point\n- another point\n\n| part | qty | note |\n|---|---|---|\n"
    + "| impeller | 1 | cast |\n| seal | 2 | spare |" });
face("f_spec", { name: "Spec", type: "def_spec", body: "Attributes, then the body.",
  values: [{ name: "tag", value: "P-101" }, { name: "rating", value: "15" },
           { name: "duty", value: "continuous" }] });
face("f_media", { name: "Picture", type: "def_media", source: PICTURE });
face("f_headless", { name: "Headless", type: "def_headless",
  body: "A card that is its markdown alone: no name over it." });
face("f_sized", { name: "Sized", type: "def_sized",
  body: "A size its definition gives: 8 by 3 units. What does not fit is cut off, however long "
    + "the text runs on and on." });
face("f_plain", { name: "Plain" });
b.explain("f_body", "card.face is document, and the body is markdown.");
b.explain("f_spec", "card.face is table: attributes, then the body.");
b.explain("f_media", "card.face is picture, and source is the file it draws.");
b.explain("f_headless", "card.name is hide: the name is not drawn.");
b.explain("f_sized", "card.size is 8 by 3: overflow is cut.");
b.explain("f_plain", "No card.face: the name is the whole card.");

b.layer("l_styles", "Styles", "t_cards");
b.note("l_styles", "Settings change a card's look, on a definition or on a single block.");
const style = (id: string, name: string, settings: Record<string, unknown>) =>
  b.put(id, "l_styles", "block", { name, settings });
style("st_primary", "style.family primary", { style: { family: "primary" } });
style("st_away", "style.family away", { style: { family: "away" } });
style("st_hue", "style.hue 200", { style: { hue: 200 } });
style("st_fill", "style.fill hatch", { style: { fill: "hatch" } });
style("st_width", "style.border_width thick", { style: { border_width: "thick" } });
style("st_border", "style.border_style dashed", { style: { border_style: "dashed" } });
style("st_opacity", "style.opacity 0.45", { style: { opacity: 0.45 } });
style("st_label", "card.label above", { card: { label: "above" } });
b.explain("st_primary", "style.family is primary.");
b.explain("st_away", "style.family is away, a second value of the same setting.");
b.explain("st_hue", "style.hue is 200.");
b.explain("st_fill", "style.fill is hatch.");
b.explain("st_width", "style.border_width is thick.");
b.explain("st_border", "style.border_style is dashed.");
b.explain("st_opacity", "style.opacity is 0.45.");
b.explain("st_label", "card.label is above.");

b.layer("l_markdown", "Markdown", "t_cards", "def_large");
b.note("l_markdown", "A card can be a markdown file: regenerating reads it again.");
b.card("c_markdown", "samples/showcase/cards/markdown.md", "l_markdown");
b.explain("c_markdown", "source is the markdown file: name, tags and one attribute come "
  + "from its frontmatter.");

/* ── Definitions ── */
b.layer("l_chain", "Chain", "t_definitions", "def_large");
b.note("l_chain", "A chain of definitions. Open a stand-in for its definition view.");
for (const d of ["def_machine", "def_pump", "def_bigpump"]) {
  b.put(`s_${d}`, "l_chain", "reference", { type: "reference", of: d });
}
b.put("d_m1", "l_chain", "block", { name: "Compressor", type: "def_machine",
                                    values: [{ name: "power", value: "30" }] });
b.put("d_p1", "l_chain", "block", { name: "Feed pump", type: "def_pump",
  values: [{ name: "power", value: "15" }, { name: "flow", value: "40" }] });
b.put("d_b1", "l_chain", "block", { name: "Main pump", type: "def_bigpump",
  values: [{ name: "power", value: "90" }, { name: "flow", value: "200" },
           { name: "stages", value: "3" }] });
b.explain("s_def_machine", "Machine adds power, and a port.");
b.explain("s_def_pump", "Pump adds flow, ports, the rotating tag and a hue.");
b.explain("s_def_bigpump", "Big pump adds stages, and a thick border.");
b.explain("d_m1", "A usage answering Machine's power.");
b.explain("d_p1", "A usage answering Pump, including what it inherits.");
b.explain("d_b1", "A usage answering Big pump, down the whole chain.");

b.layer("l_line_defs", "Line definitions", "t_definitions");
b.note("l_line_defs", "A relation definition says direction, arrows, allowed ends and attributes. "
  + "Select the line and open its definition from the tray.");
b.put("ld_machine", "l_line_defs", "block", { name: "Compressor", type: "def_machine" });
b.put("ld_pump", "l_line_defs", "block", { name: "Feed pump", type: "def_pump" });
b.link("d_drive", "ld_machine", "ld_pump", { type: "rel_drives",
                                             values: [{ name: "ratio", value: "3" }] });
b.explain("ld_machine", "A machine, one end drives allows.");
b.explain("ld_pump", "drives runs here from the compressor, ratio 3, pointing forward.");

/* ── Relations ── */
b.layer("l_lines", "Lines", "t_relations");
b.note("l_lines", "Every line setting: direction, a name, arrows, and a tie.");
const pair = (layer: string, id: string, name_a: string, name_b: string,
              more: Record<string, unknown>) => {
  b.put(`${id}_a`, layer, "block", { name: name_a });
  b.put(`${id}_b`, layer, "block", { name: name_b });
  b.link(id, `${id}_a`, `${id}_b`, more);
};
pair("l_lines", "r_fwd", "From", "Forward", { dir: "forward" });
pair("l_lines", "r_back", "From", "Back", { dir: "back" });
pair("l_lines", "r_both", "From", "Both", { dir: "both" });
pair("l_lines", "r_none", "From", "None", { dir: "none" });
pair("l_lines", "r_named", "Pump", "Tank", { dir: "forward", name: "feeds" });
pair("l_lines", "r_arrows", "Whole", "Part",
     { settings: { line: { from_arrow: "diamond", to_arrow: "open" } } });
b.put("r_tie_note", "l_lines", "note", { name: "A tie joins a note to what it is about",
                                         type: "note", w: 5 * U, h: 2 * U });
b.put("r_tie_to", "l_lines", "block", { name: "Tied" });
b.link("r_tie", "r_tie_note", "r_tie_to", { type: "tie" });
b.explain("r_fwd_b", "line.dir is forward.");
b.explain("r_back_b", "line.dir is back.");
b.explain("r_both_b", "line.dir is both.");
b.explain("r_none_b", "line.dir is none.");
b.explain("r_named_b", "The line's own name is feeds.");
b.explain("r_arrows_b", "line.from_arrow is diamond and line.to_arrow is open.");
b.explain("r_tie_to", "type is tie, whose is tie trait gives line.module tie: it runs straight, never routed.");

b.layer("l_routing", "Routing", "t_relations");
b.note("l_routing", "What the router must get right: a detour, one line both ways, a crossing, "
  + "a close pair, and a hub that fans out.");
b.put("r_det_a", "l_routing", "block", { name: "Left" });
b.put("r_det_x", "l_routing", "block", { name: "Blocker" });
b.put("r_det_b", "l_routing", "block", { name: "Right" });
b.link("r_detour", "r_det_a", "r_det_b", { dir: "forward" });
b.put("r_par_a", "l_routing", "block", { name: "Asks" });
b.put("r_par_b", "l_routing", "block", { name: "Answers" });
b.link("r_par", "r_par_a", "r_par_b", { dir: "both", name: "request / reply" });
b.put("r_x_a", "l_routing", "block", { name: "North" });
b.put("r_x_b", "l_routing", "block", { name: "East" });
b.put("r_x_c", "l_routing", "block", { name: "West" });
b.put("r_x_d", "l_routing", "block", { name: "South" });
b.link("r_cross_1", "r_x_a", "r_x_d", { dir: "forward" });
b.link("r_cross_2", "r_x_b", "r_x_c", { dir: "forward" });
b.put("r_gap_a", "l_routing", "block", { name: "Close" });
b.put("r_gap_b", "l_routing", "block", { name: "Closer" });
b.link("r_gap", "r_gap_a", "r_gap_b", { dir: "forward" });
b.put("r_hub", "l_routing", "block", { name: "Hub" });
for (const [n, name] of ["One", "Two", "Three"].entries()) {
  b.put(`r_spoke_${n}`, "l_routing", "block", { name });
  b.link(`r_fan_${n}`, "r_hub", `r_spoke_${n}`,
         { dir: "forward", name: `to ${name.toLowerCase()}` });
}
b.explain("r_det_b", "The line must go round the blocker.");
b.explain("r_par_b", "One line, both ways: request and reply share it.");
b.explain("r_x_d", "Two lines cross.");
b.explain("r_gap_b", "The pair sits close, and the line still clears them.");
b.explain("r_hub", "The hub's lines share a trunk and fan out.");

/* ── Interfaces ── */
b.layer("l_ports", "Ports", "t_interfaces");
b.note("l_ports", "Ports placed, and ports that place themselves.");
b.put("p_pump", "l_ports", "block", { name: "Pump" });
b.put("p_tank", "l_ports", "block", { name: "Tank" });
b.put("p_valve", "l_ports", "block", { name: "Valve" });
const port = (id: string, parent: string, side: string | undefined, flow?: string, at = 0.25) =>
  b.put(id, parent, "interface", { name: "", type: "interface", ...(side ? { side, at } : {}),
                                   ...(flow ? { flow } : {}) });
port("p_pump_in", "p_pump", "left", "in");
port("p_pump_out", "p_pump", "right", "out");
port("p_pump_top", "p_pump", "top", "both", 0.5);
port("p_pump_low", "p_pump", "bottom");
port("p_tank_in", "p_tank", undefined, "in");
port("p_valve_out", "p_valve", undefined, "out");
b.put("p_gauge", "l_ports", "block", { name: "Gauge" });
port("p_drain", "l_ports", undefined, "out");
b.link("p_read", "p_gauge", "l_ports", { dir: "forward", name: "reading" });
b.link("p_spill", "p_tank", "p_drain", { dir: "forward" });
b.link("p_tank_pump", "p_tank", "p_pump", { name: "level" });
b.link("p_flow", "p_pump_out", "p_tank_in", { dir: "forward", name: "water" });
b.link("p_feed", "p_valve_out", "p_pump_low", { dir: "forward" });
b.explain("p_pump", "Its ports are placed, each with a flow: in, out, both, or none.");
b.explain("p_tank", "Its port places itself.");
b.explain("p_valve", "Its port places itself, and a line holds it.");
b.explain("p_gauge", "Its line meets the room's wall.");
b.explain("p_drain", "The room's own port, placing itself.");

/* ── Holders ── */
b.layer("l_groups", "Groups", "t_holders");
b.note("l_groups", "A group gathers blocks where they sit, and nests.");
b.put("h_outer", "l_groups", "group", { name: "Plant", type: "group" });
b.put("h_inner", "h_outer", "group", { name: "Skid", type: "group" });
b.put("h_g1", "h_inner", "block", { name: "Motor" });
b.put("h_g2", "h_inner", "block", { name: "Gearbox" });
b.put("h_g3", "h_outer", "block", { name: "Panel" });
b.explain("h_outer", "type is group: it gathers the blocks where they sit.");
b.explain("h_inner", "A group inside a group.");

b.layer("l_grids", "Grids", "t_holders");
b.note("l_grids", "A grid seats blocks in cells. The header row and column head the lines, and "
  + "a merge spans cells. Enter on the grid shows its cells.");
b.put("h_grid", "l_grids", "grid", { name: "Duty roster", type: "def_table",
  grid: { rows: 4, cols: 4, merges: [{ r: 1, c: 1, rows: 2, cols: 1 }] } });
const cell = (id: string, r: number, c: number, name: string, body: string) =>
  b.put(id, "h_grid", "block", { name, body, cell: { r, c } });
["Mon", "Tue", "Wed"].forEach((d, i) => cell(`h_col_${i}`, 0, i + 1, d, "A column head."));
["Day", "Swing", "Night"].forEach((s, i) => cell(`h_row_${i}`, i + 1, 0, s, "A row head."));
cell("h_c1", 1, 1, "Ana", "A cell the merge covers.");
cell("h_c2", 1, 2, "Ben", "A cell beside the merge.");
cell("h_c3", 2, 3, "Cy", "A cell in the body.");
cell("h_c4", 3, 2, "Di", "A cell in the body.");
b.explain("h_grid", "type is Table, which has has_head. Enter shows the cells.");

/* ── References ── */
b.layer("l_refs", "Stand-ins", "t_references");
b.note("l_refs", "A reference stands for something drawn elsewhere.");
b.put("x_block", "l_refs", "reference", { type: "reference", of: "c_block" });
b.put("x_def", "l_refs", "reference", { type: "reference", of: "def_pump" });
b.put("x_gone", "l_refs", "reference", { name: "Gone", type: "reference", of: "nothing_here" });
b.explain("x_block", "of is a block on Kinds.");
b.explain("x_def", "of is the Pump definition.");
b.explain("x_gone", "of names nothing: the card is missing.");

/* ── Data ── */
b.layer("l_model", "Model", "t_data", "def_large");
b.note("l_model", "Attributes typed by a definition draw links between stand-ins.");
b.put("m_site", "l_model", "reference", { type: "reference", of: "def_site" });
b.put("m_asset", "l_model", "reference", { type: "reference", of: "def_asset" });
b.put("m_state", "l_model", "reference", { type: "reference", of: "def_state" });
b.explain("m_site", "A stand-in for Site.");
b.explain("m_asset", "Asset's site attribute is typed Site, so a link draws.");
b.explain("m_state", "State extends choice: running or stopped.");

b.layer("l_values", "Values", "t_data", "def_large");
b.note("l_values", "Usages answer attributes. A value naming another card draws a link.");
const vals = (o: Record<string, string>) =>
  Object.entries(o).map(([name, value]) => ({ name, value }));
b.put("u_north", "l_values", "block", { name: "North", type: "def_site",
  values: vals({ name: "North", region: "coast" }) });
b.put("u_p1", "l_values", "block", { name: "P-1", type: "def_asset",
  values: vals({ tag: "P-1", site: "North", state: "running" }) });
b.put("u_p2", "l_values", "block", { name: "P-2", type: "def_asset",
  values: vals({ tag: "P-2", site: "North", state: "stopped" }) });
b.explain("u_north", "A Site usage.");
b.explain("u_p1", "site names North, and state is running.");
b.explain("u_p2", "site names North, and state is stopped.");

/* ── Diagrams ── */
b.layer("l_class", "Class", "t_diagrams");
b.note("l_class", "Open Classes for the class view.");
b.put("d_class", "l_class", "block", { name: "Classes", type: "diagrams.class_diagram" });
b.put("d_class_unit", "d_class", "reference", { type: "reference", of: "def_unit" });
b.put("d_class_part", "d_class", "reference", { type: "reference", of: "def_part" });
b.explain("d_class", "layout.view is class: Part extends Unit, and a link is named unit.");

b.layer("l_swimlane", "Swimlane", "t_diagrams");
b.note("l_swimlane", "Open Lanes: columns are lanes, rows are phases.");
b.put("d_lanes", "l_swimlane", "grid", { name: "Lanes", type: "diagrams.swimlane",
  grid: { rows: 3, cols: 3 } });
b.put("d_lane_a", "d_lanes", "block", { name: "Left", body: "The first lane.",
                                     cell: { r: 0, c: 1 } });
b.put("d_lane_b", "d_lanes", "block", { name: "Right", body: "The second lane.",
                                     cell: { r: 0, c: 2 } });
b.put("d_lane_p1", "d_lanes", "block", { name: "One", body: "The first phase.",
                                      cell: { r: 1, c: 0 } });
b.put("d_lane_p2", "d_lanes", "block", { name: "Two", body: "The second phase.",
                                      cell: { r: 2, c: 0 } });
b.put("d_lane_s1", "d_lanes", "block", { name: "Do", body: "The step in the first lane.",
                                         cell: { r: 1, c: 1 } });
b.put("d_lane_s2", "d_lanes", "block", { name: "Done", body: "The step in the second lane.",
                                         cell: { r: 2, c: 2 } });
b.link("d_lane_flow", "d_lane_s1", "d_lane_s2", { name: "then" });
b.explain("d_lanes", "layout.view is swimlane. The steps say what they do in body.");

b.layer("l_sequence", "Sequence", "t_diagrams");
b.note("l_sequence", "Open Messages: lifelines, a self message, and a lifeline whose header "
  + "refers to nothing.");
b.put("d_seq", "l_sequence", "grid", { name: "Messages", type: "diagrams.sequence_diagram",
  grid: { rows: 2, cols: 3 } });
b.put("d_seq_self", "d_seq", "block", { name: "Self", body: "A participant that messages itself.",
                                        cell: { r: 0, c: 1 } });
b.put("d_seq_gone", "d_seq", "reference", { name: "Gone", type: "reference", of: "nothing_here",
  body: "A header that refers to nothing.", cell: { r: 0, c: 2 } });
b.put("d_seq_now", "d_seq", "block", { name: "Now", body: "The only phase.",
                                    cell: { r: 1, c: 0 } });
b.put("d_seq_loop", "d_seq", "block", { name: "Loop", body: "The step that messages itself.",
                                        cell: { r: 1, c: 1 } });
b.link("d_seq_again", "d_seq_loop", "d_seq_loop", { type: "diagrams.message", name: "again" });
b.explain("d_seq", "layout.view is sequence. The self message is typed message.");

b.layer("l_two_views", "Two views", "t_diagrams");
b.note("l_two_views", "One grid drawn two ways: the grid as a sequence, and a reference to it "
  + "with layout.view swimlane as lanes.");
b.put("d_two", "l_two_views", "grid", { name: "Handoff", type: "diagrams.sequence_diagram",
  grid: { rows: 3, cols: 3 } });
b.put("d_two_a", "d_two", "block", { name: "Left", body: "The first participant.",
                                     cell: { r: 0, c: 1 } });
b.put("d_two_b", "d_two", "block", { name: "Right", body: "The second participant.",
                                     cell: { r: 0, c: 2 } });
b.put("d_two_p", "d_two", "block", { name: "Pass", body: "The phase.", cell: { r: 1, c: 0 } });
b.put("d_two_s1", "d_two", "block", { name: "Send", body: "The first step.",
                                     cell: { r: 1, c: 1 } });
b.put("d_two_s2", "d_two", "block", { name: "Take", body: "The second step.",
                                     cell: { r: 1, c: 2 } });
b.link("d_two_msg", "d_two_s1", "d_two_s2", { type: "diagrams.message", name: "hand" });
b.put("ref_two", "l_two_views", "reference", { name: "Handoff, as lanes", type: "reference",
  of: "d_two", settings: { layout: { view: "swimlane" } } });
b.explain("d_two", "The grid's layout.view is sequence.");
b.explain("ref_two", "This reference states its own layout.view: swimlane.");

const g = b.graph();
writeFileSync("samples/showcase/workspace.json", b.emit());
console.log(`wrote ${Object.keys(g.blocks).length} blocks, `
            + `${Object.keys(g.edges).length} relations`);
