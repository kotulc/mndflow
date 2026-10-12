/** Writes samples/workspace.showcase.json: one layer per capability, each with a note saying what
 *  it shows. Fixed ids, so a re-run after a schema change re-saves it as a readable diff; the door
 *  checks it (`mnd check`). The packages it draws from are merged whole. */

import { writeFileSync } from "node:fs";
import { builder } from "./lib/builder.ts";

const U = 24;
const b = builder();

/* ── The workspace: its scratch definition, the folder its tags are filed in, then folders
      saying what each holds ── */

b.place({ id: "workspace", parent: null, name: "workspace" });
b.def("main", "main", undefined);
b.shelf("tags", "tags");
b.shelf("w_faces", "faces");
b.shelf("w_machines", "machines");
b.shelf("w_holders", "holders");
b.shelf("w_relations", "relations");
b.def("def_large", "Large layer", "block", { layout: { cards: "large" } },
      { body: "A layer whose cards draw their large face." }, "w_faces");


/* ── Cards: every block kind on its small face, each in the look its definition states ── */

b.layer("l_cards", "Cards");
b.note("l_cards", "Every block kind on its small face, each in the look its own definition states. "
  + "Groups and grids are on Holders, ports on Interfaces.", 22);
b.put("c_block", "l_cards", "block", { name: "Block" });
b.put("c_folder", "l_cards", "folder", { name: "Folder", type: "folder" });
b.put("c_inside", "c_folder", "block", { name: "Inside" });
b.put("c_ref", "l_cards", "reference", { name: "", type: "reference", of: "c_block" });
b.put("c_note", "l_cards", "note", { name: "A note: text, resized by hand", type: "note",
                                     w: 6 * U, h: 2 * U });


/* ── Faces: what a large face shows, fitted or sized ── */

/** A picture the web app serves, from `public/`. */
const PICTURE = "/showcase/picture.svg";

b.layer("l_faces", "Faces", "def_large");
b.note("l_faces", "The large faces, on a layer that asks for them: a document, a table with its "
  + "body under it, a picture; then a document without its name, and one its definition sizes. "
  + "A plain block names no face, so its name is the whole card.", 27);
b.def("def_doc", "Document", "block", { card: { face: "document" } }, {}, "w_faces");
b.def("def_spec", "Spec", "block", { card: { face: "table" } }, {
  def: { attributes: [{ name: "tag", key: true }, { name: "rating", type: "number", unit: "kW" },
                      { name: "duty", note: "how it runs" }] } }, "w_faces");
b.def("def_media", "Picture", "block", { card: { face: "picture" } }, {}, "w_faces");
b.def("def_headless", "Headless", "block", { card: { face: "document", name: "hide" } }, {},
      "w_faces");
b.def("def_sized", "Sized", "block", { card: { face: "document", size: { w: 8, h: 3 } } }, {},
      "w_faces");
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
  body: "A size its definition gives: 8 by 3 units, whatever it says. What does not fit is cut "
    + "off at the card's edge, however long the text runs on and on." });
face("f_plain", { name: "Plain" });


/* ── Definitions: stand-ins, and settings down a chain ── */

b.layer("l_defs", "Definitions", "def_large");
b.note("l_defs", "A chain: Pump extends Machine, Big pump extends Pump. Machine draws in the "
  + "secondary family; Pump carries the rotating tag, filed in the workspace's tags folder. Each "
  + "stand-in draws the definition as its usages do, with everything it inherits; the usages below "
  + "answer it. Machine declares a power port that Pump and Big pump inherit. Open a stand-in for "
  + "its definition view: Big pump shows everything it is, what it reads from its chain dimmed. "
  + "Compressor drives Feed pump by a relation definition, drives: select the line and open its "
  + "definition from the tray, or find it under workspace › relations.", 27);
b.def("def_machine", "Machine", "block",
      { card: { face: "table" }, style: { family: "secondary" } }, {
        def: { attributes: [{ name: "power", type: "number", unit: "kW" }] } }, "w_machines");
b.put("dm_power", "def_machine", "interface", { name: "power", type: "interface", flow: "in" });
b.def("tag_rotating", "rotating", "tag", undefined, {}, "tags");
b.def("def_pump", "Pump", "def_machine", { style: { hue: 200 } }, {
  body: "Moves liquid from its inlet to its outlet, driven by a motor.", tags: ["tag_rotating"],
  def: { attributes: [{ name: "flow", type: "number", unit: "m3/h" }] } }, "w_machines");
b.put("dp_inlet", "def_pump", "interface", { name: "inlet", type: "interface", flow: "in" });
b.put("dp_outlet", "def_pump", "interface", { name: "outlet", type: "interface", flow: "out" });
b.put("dp_seal", "def_pump", "interface", { name: "seal", type: "interface", flow: "both" });
b.def("def_bigpump", "Big pump", "def_pump", { style: { border_width: "thick" } }, {
  def: { attributes: [{ name: "stages", type: "number", default: "2" }] } }, "w_machines");
b.def("def_unit", "Unit", "block", undefined, { body: "A thing a part extends." }, "w_machines");
b.def("def_part", "Part", "def_unit", undefined, {
  body: "A part of a unit.",
  def: { attributes: [{ name: "unit", type: "def_unit" }] },
}, "w_machines");
for (const d of ["def_machine", "def_pump", "def_bigpump"]) {
  b.put(`s_${d}`, "l_defs", "reference", { type: "reference", of: d });
}
b.put("d_m1", "l_defs", "block", { name: "Compressor", type: "def_machine",
                                   values: [{ name: "power", value: "30" }] });
b.put("d_p1", "l_defs", "block", { name: "Feed pump", type: "def_pump",
  values: [{ name: "power", value: "15" }, { name: "flow", value: "40" }] });
b.put("d_b1", "l_defs", "block", { name: "Main pump", type: "def_bigpump",
  values: [{ name: "power", value: "90" }, { name: "flow", value: "200" }] });
/** A relation definition: which way its lines point, what its ends may be, what they answer. */
b.def("rel_drives", "drives", "line", {
  line: { dir: "forward", to_arrow: "open" },
  allows: { ends: { from: ["def_machine"], to: ["def_pump"] } } }, {
  body: "A machine turning a pump's shaft.", tags: ["tag_rotating"],
  def: { attributes: [{ name: "ratio", type: "number" }] } }, "w_relations");
b.link("d_drive", "d_m1", "d_p1", { type: "rel_drives",
                                    values: [{ name: "ratio", value: "3" }] });


/* ── Relations: every kind and direction, then what routing has to get right ── */

b.layer("l_rel", "Relations");
b.note("l_rel", "Each direction, a name, arrows and a tie; then a run past a third block, a pair "
  + "related both ways as one line, two runs that cross, a pair close together, and a hub whose "
  + "lines share a trunk and fan out. Lines leave the middle of a face and go round cards; a tie "
  + "runs straight from card to card.", 27);
const pair = (id: string, name_a: string, name_b: string, more: Record<string, unknown>) => {
  b.put(`${id}_a`, "l_rel", "block", { name: name_a });
  b.put(`${id}_b`, "l_rel", "block", { name: name_b });
  b.link(id, `${id}_a`, `${id}_b`, more);
};
pair("r_fwd", "From", "Forward", { dir: "forward" });
pair("r_back", "From", "Back", { dir: "back" });
pair("r_both", "From", "Both", { dir: "both" });
pair("r_none", "From", "None", { dir: "none" });
pair("r_named", "Pump", "Tank", { dir: "forward", name: "feeds" });
pair("r_arrows", "Whole", "Part",
     { settings: { line: { from_arrow: "diamond", to_arrow: "open" } } });
b.put("r_tie_note", "l_rel", "note", { name: "A tie joins a note to what it is about", type: "note",
                                       w: 5 * U, h: 2 * U });
b.put("r_tie_to", "l_rel", "block", { name: "Tied" });
b.link("r_tie", "r_tie_note", "r_tie_to", { type: "tie" });
b.put("r_det_a", "l_rel", "block", { name: "Left" });
b.put("r_det_x", "l_rel", "block", { name: "Blocker" });
b.put("r_det_b", "l_rel", "block", { name: "Right" });
b.link("r_detour", "r_det_a", "r_det_b", { dir: "forward" });
b.put("r_par_a", "l_rel", "block", { name: "Asks" });
b.put("r_par_b", "l_rel", "block", { name: "Answers" });
b.link("r_par", "r_par_a", "r_par_b", { dir: "both", name: "request / reply" });
b.put("r_x_a", "l_rel", "block", { name: "North" });
b.put("r_x_b", "l_rel", "block", { name: "East" });
b.put("r_x_c", "l_rel", "block", { name: "West" });
b.put("r_x_d", "l_rel", "block", { name: "South" });
b.link("r_cross_1", "r_x_a", "r_x_d", { dir: "forward" });
b.link("r_cross_2", "r_x_b", "r_x_c", { dir: "forward" });
b.put("r_gap_a", "l_rel", "block", { name: "Close" });
b.put("r_gap_b", "l_rel", "block", { name: "Closer" });
b.link("r_gap", "r_gap_a", "r_gap_b", { dir: "forward" });
b.put("r_hub", "l_rel", "block", { name: "Hub" });
for (const [n, name] of ["One", "Two", "Three"].entries()) {
  b.put(`r_spoke_${n}`, "l_rel", "block", { name });
  b.link(`r_fan_${n}`, "r_hub", `r_spoke_${n}`,
         { dir: "forward", name: `to ${name.toLowerCase()}` });
}


/* ── Interfaces: ports on each side, and flow ── */

b.layer("l_ports", "Interfaces");
b.note("l_ports", "Ports placed on each side of Pump, flowing in, out, both or neither; Pump's "
  + "top port is placed in the middle of a face no line meets; Tank and Valve's ports place "
  + "themselves, in a face's middle unless a line's anchor holds it. Lines to the room meet its "
  + "wall straight across: Gauge's line to the room itself, and Drain, the room's own port, "
  + "placing itself.", 22);
b.put("p_pump", "l_ports", "block", { name: "Pump" });
b.put("p_tank", "l_ports", "block", { name: "Tank" });
b.put("p_valve", "l_ports", "block", { name: "Valve" });
/** A port: placed where a side is given, a quarter along unless said, else placing itself. */
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


/* ── Holders: groups inside groups, and a grid with headers and a merge ── */

b.layer("l_hold", "Holders");
b.note("l_hold", "A group gathers blocks where they sit, and nests. A grid seats blocks in cells: "
  + "its top row and left column head the lines; a merge spans cells. Its definition, Table, lists "
  + "every trait it keeps, has head among them. Select the grid and press Enter to see its cells.",
       27);
b.put("h_outer", "l_hold", "group", { name: "Plant", type: "group" });
b.put("h_inner", "h_outer", "group", { name: "Skid", type: "group" });
b.put("h_g1", "h_inner", "block", { name: "Motor" });
b.put("h_g2", "h_inner", "block", { name: "Gearbox" });
b.put("h_g3", "h_outer", "block", { name: "Panel" });
b.def("def_table", "Table", "grid", undefined, {
  traits: ["has_parts", "has_ports", "has_values", "is_grid", "has_head"] }, "w_holders");
b.put("h_grid", "l_hold", "grid", { name: "Duty roster", type: "def_table",
  grid: { rows: 4, cols: 4, merges: [{ r: 1, c: 1, rows: 2, cols: 1 }] } });
const cell = (id: string, r: number, c: number, name: string) =>
  b.put(id, "h_grid", "block", { name, cell: { r, c } });
["Mon", "Tue", "Wed"].forEach((d, i) => cell(`h_col_${i}`, 0, i + 1, d));
["Day", "Swing", "Night"].forEach((s, i) => cell(`h_row_${i}`, i + 1, 0, s));
cell("h_c1", 1, 1, "Ana");
cell("h_c2", 1, 2, "Ben");
cell("h_c3", 2, 3, "Cy");
cell("h_c4", 3, 2, "Di");


/* ── References: to a block, to a definition, to nothing ── */

b.layer("l_refs", "References");
b.note("l_refs", "A reference stands for something drawn elsewhere: a block on the cards layer, a "
  + "definition, or something since deleted.", 22);
b.put("x_block", "l_refs", "reference", { type: "reference", of: "c_block" });
b.put("x_def", "l_refs", "reference", { type: "reference", of: "def_pump" });
b.put("x_gone", "l_refs", "reference", { name: "Gone", type: "reference", of: "nothing_here" });


/* ── Data: the entity-relation package, as a model and as data ── */

b.layer("l_model", "Data model", "def_large");
b.note("l_model", "The entity-relation package's entities as stand-ins: each attribute typed by "
  + "another entity draws a link.", 22);
b.put("m_customer", "l_model", "reference",
      { type: "reference", of: "entity-relation.customer" });
b.put("m_order", "l_model", "reference", { type: "reference", of: "entity-relation.order" });
b.put("m_line", "l_model", "reference", { type: "reference", of: "entity-relation.line" });
b.put("m_product", "l_model", "reference", { type: "reference", of: "entity-relation.product" });
b.layer("l_rows", "Data rows", "def_large");
b.note("l_rows", "Usages answering the entities: a value naming another card on the layer draws "
  + "a link.", 22);
const vals = (o: Record<string, string>) =>
  Object.entries(o).map(([name, value]) => ({ name, value }));
const row = (id: string, name: string, type: string, values: Record<string, string>) =>
  b.put(id, "l_rows", "block", { name, type, values: vals(values) });
row("u_ada", "Ada Lovelace", "entity-relation.customer",
    { id: "1", name: "Ada Lovelace", email: "ada@example.com" });
row("u_1001", "Order 1001", "entity-relation.order",
    { number: "1001", customer: "Ada Lovelace", placed: "2026-10-01", status: "shipped",
      paid: "true" });
row("u_l1", "1001 · widgets", "entity-relation.line",
    { order: "Order 1001", product: "Widget", qty: "3" });
row("u_l2", "1001 · gadget", "entity-relation.line",
    { order: "Order 1001", product: "Gadget" });
row("u_widget", "Widget", "entity-relation.product",
    { sku: "W-1", name: "Widget", price: "4.50" });
row("u_gadget", "Gadget", "entity-relation.product",
    { sku: "G-2", name: "Gadget", price: "12.00" });


/* ── Diagrams: a class diagram, a swimlane and a sequence, each a card whose kind names the view ── */

b.layer("l_diagrams", "Diagrams");
b.note("l_diagrams", "Three diagrams. Open Classes: Part extends Unit, and a link named unit. "
  + "Open Lanes: two columns, a step in each, and a line between them. Open Messages: a self "
  + "message on Self, an empty lifeline whose header refers to nothing, and a phase named Now.", 22);
b.put("d_class", "l_diagrams", "block", { name: "Classes", type: "diagrams.class_diagram" });
b.put("d_class_unit", "d_class", "reference", { type: "reference", of: "def_unit" });
b.put("d_class_part", "d_class", "reference", { type: "reference", of: "def_part" });
b.put("d_lanes", "l_diagrams", "grid", { name: "Lanes", type: "diagrams.swimlane" });
b.put("d_lane_a", "d_lanes", "block", { name: "Left", cell: { r: 0, c: 1 } });
b.put("d_lane_b", "d_lanes", "block", { name: "Right", cell: { r: 0, c: 2 } });
b.put("d_lane_p1", "d_lanes", "block", { name: "One", cell: { r: 1, c: 0 } });
b.put("d_lane_p2", "d_lanes", "block", { name: "Two", cell: { r: 2, c: 0 } });
b.put("d_lane_s1", "d_lanes", "block", { name: "Do", cell: { r: 1, c: 1 } });
b.put("d_lane_s2", "d_lanes", "block", { name: "Done", cell: { r: 2, c: 2 } });
b.link("d_lane_flow", "d_lane_s1", "d_lane_s2", { name: "then" });
b.put("d_seq", "l_diagrams", "grid", { name: "Messages", type: "diagrams.sequence_diagram" });
b.put("d_seq_self", "d_seq", "block", { name: "Self", cell: { r: 0, c: 1 } });
b.put("d_seq_gone", "d_seq", "reference", { name: "Gone", type: "reference", of: "nothing_here",
                                            cell: { r: 0, c: 2 } });
b.put("d_seq_now", "d_seq", "block", { name: "Now", cell: { r: 1, c: 0 } });
b.put("d_seq_loop", "d_seq", "block", { name: "Loop", cell: { r: 1, c: 1 } });
b.link("d_seq_again", "d_seq_loop", "d_seq_loop", { name: "again" });


/* ── The file. Packages are merged whole. ── */

b.merge("public/packages/entity-relation.json");
b.merge("public/packages/diagrams.json");
const g = b.graph();
writeFileSync("samples/workspace.showcase.json", b.emit());
console.log(`wrote ${Object.keys(g.blocks).length} blocks, ${Object.keys(g.edges).length} relations`);
