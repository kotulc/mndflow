/** Writes samples/workspace.showcase.json: one layer per capability, each with a note saying what
 *  it shows. Fixed ids, so a re-run after a schema change re-saves it as a readable diff; the door
 *  checks it (`mnd check`). The `entity-relation` package is read from the catalogue and carried whole.
 *
 *  node scripts/showcase.mjs */

import { readFileSync, writeFileSync } from "node:fs";

const U = 24;

const blocks = {};
const edges = {};
const counters = {};
const orders = {};


/** The next serial for a kind, which is what an alias is. */
function serial(kind) {
  counters[kind] = (counters[kind] ?? 0) + 1;
  return counters[kind];
}

/** The next order under a parent. */
function order(parent) {
  orders[parent] = (orders[parent] ?? 0) + 1;
  return orders[parent];
}

/** A folder of the workspace's definitions, named for what it holds, under a parent. */
function shelf(id, name, parent = "workspace") {
  blocks[id] = { id, parent, name, type: "folder", order: order(parent) };
}

/** A workspace definition, in a folder. */
function def(id, name, type, settings, more = {}, parent = "workspace") {
  blocks[id] = { id, parent, name, type, def: {}, order: order(parent),
                 ...(settings ? { settings } : {}), ...more };
}

/** A usage of some kind under a parent. Nothing is placed: every layer lays itself out. */
function put(id, parent, kind, more = {}) {
  blocks[id] = { id, parent, alias: serial(kind), order: order(parent), ...more };
}

/** A layer: a block on the root canvas, of the given type, opening onto its own drawing. */
function layer(id, name, type = undefined, more = {}) {
  put(id, "main", "block", { name, ...(type ? { type } : {}), ...more });
}

/** The note heading a layer, saying what to look for. */
function note(layer_id, text, w = 15) {
  put(`${layer_id}_note`, layer_id, "note", { name: text, type: "note", w: w * U, h: 3 * U });
}

/** A relation. */
function link(id, from, to, more = {}) {
  edges[id] = { id, from, to, alias: serial("relation"), ...more };
}


/* ── The workspace: its scratch definition, then folders saying what each holds ── */

blocks.workspace = { id: "workspace", parent: null, name: "workspace" };
def("main", "main", undefined);
delete blocks.main.type;
shelf("w_looks", "looks");
shelf("w_faces", "faces");
shelf("w_machines", "machines");
shelf("w_holders", "holders");
def("def_large", "Large layer", "block", { layout: { face: "large" } },
    { body: "A layer whose cards draw their large face." }, "w_faces");


/* ── Cards: every block kind, and the looks: each a trait in the looks folder, and on a card ── */

layer("l_cards", "Cards");
note("l_cards", "Every block kind on its small face, then the looks: families, fills, label places and borders, each card varying one setting. Each look is a trait in the looks folder, for a definition to carry; here each card says it as its own.", 27);
put("c_block", "l_cards", "block", { name: "Block" });
put("c_folder", "l_cards", "folder", { name: "Folder", type: "folder" });
put("c_inside", "c_folder", "block", { name: "Inside" });
put("c_ref", "l_cards", "reference", { name: "", of: "c_block" });
put("c_note", "l_cards", "note", { name: "A note: text, resized by hand", type: "note",
                                           w: 6 * U, h: 2 * U });
const looks = [
  ["family", ["primary", "secondary", "neutral", "muted", "away", "note"], (v) => ({ style: { family: v } })],
  ["fill", ["solid", "hatch", "wash", "none"], (v) => ({ style: { fill: v } })],
  ["label", ["above", "inside", "below", "none"], (v) => ({ card: { label: v } })],
  ["border", ["dashed", "dotted", "double", "none"], (v) => ({ style: { border_style: v } })],
];
for (const [row, [key, values, settings]] of looks.entries()) {
  shelf(`w_looks_${key}`, key, "w_looks");
  for (const [col, v] of values.entries()) {
    def(`look_${key}_${v}`, `${key} ${v}`, "tag", settings(v), {}, `w_looks_${key}`);
    put(`c_${key}_${v}`, "l_cards", "block", { name: v, settings: settings(v) });
  }
}


/* ── Faces: what a large face shows, fitted or sized ── */

/** A picture the web app serves, from `public/`. */
const PICTURE = "/showcase/picture.svg";

layer("l_faces", "Faces", "def_large");
note("l_faces", "The large face, on a layer that asks for it. Each card fits what it shows unless its definition gives a size; a plain block shows nothing, so it is the small face.", 27);
def("def_doc", "Document", "block", { card: { shows: ["body"] } }, {}, "w_faces");
def("def_spec", "Spec", "block", { card: { shows: ["attributes", "body"] } }, {
  def: { attributes: [{ name: "tag", key: true }, { name: "rating", type: "number", unit: "kW" },
                      { name: "duty", note: "how it runs" }] } }, "w_faces");
def("def_media", "Picture", "block", undefined, { traits: ["container", "ports", "media"] },
    "w_faces");
def("def_headless", "Headless", "block", { card: { shows: ["body"], name: "hide" } }, {}, "w_faces");
def("def_sized", "Sized", "block", { card: { shows: ["body"], size: { w: 8, h: 3 } } }, {},
    "w_faces");
const face = (id, more) => put(id, "l_faces", "block", more);
face("f_body", { name: "Body", type: "def_doc",
  body: "# A heading\n\nProse with **bold**, `code` and a [link](https://example.com).\n\n- a point\n- another point" });
face("f_spec", { name: "Spec", type: "def_spec", body: "Attributes, then the body.",
  values: [{ name: "tag", value: "P-101" }, { name: "rating", value: "15" },
           { name: "duty", value: "continuous" }] });
face("f_media", { name: "Picture", type: "def_media", source: PICTURE });
face("f_headless", { name: "Headless", type: "def_headless",
  body: "A card that is its markdown alone: no name over it." });
face("f_sized", { name: "Sized", type: "def_sized",
  body: "A size its definition gives: 8 by 3 units, whatever it says. What does not fit is cut off at the card's edge, however long the text runs on and on." });
face("f_plain", { name: "Plain" });


/* ── Definitions: stand-ins, and settings down a chain ── */

layer("l_defs", "Definitions", "def_large");
note("l_defs", "A chain: Pump extends Machine, Big pump extends Pump. Machine carries the family secondary look as a trait. Each stand-in draws the definition as its usages do, with everything it inherits; the usages below answer it. Open a stand-in for its definition view: Pump shows what it extends, its ports, its tag, its traits and its description.", 27);
def("def_machine", "Machine", "block", { card: { shows: ["attributes"] } }, {
  traits: ["container", "ports", "look_family_secondary"],
  def: { attributes: [{ name: "power", type: "number", unit: "kW" }] } }, "w_machines");
def("tag_rotating", "rotating", "tag", undefined, {}, "w_machines");
def("def_pump", "Pump", "def_machine", { style: { hue: 200 } }, {
  body: "Moves liquid from its inlet to its outlet, driven by a motor.", tags: ["tag_rotating"],
  def: { attributes: [{ name: "flow", type: "number", unit: "m3/h" }] } }, "w_machines");
put("dp_inlet", "def_pump", "interface", { name: "inlet", type: "interface", flow: "in" });
put("dp_outlet", "def_pump", "interface", { name: "outlet", type: "interface", flow: "out" });
put("dp_seal", "def_pump", "interface", { name: "seal", type: "interface", flow: "both" });
def("def_bigpump", "Big pump", "def_pump", { style: { border_width: "thick" } }, {
  def: { attributes: [{ name: "stages", type: "number", default: "2" }] } }, "w_machines");
for (const [col, d] of ["def_machine", "def_pump", "def_bigpump"].entries()) {
  put(`s_${d}`, "l_defs", "reference", { of: d });
}
put("d_m1", "l_defs", "block", { name: "Compressor", type: "def_machine",
  values: [{ name: "power", value: "30" }] });
put("d_p1", "l_defs", "block", { name: "Feed pump", type: "def_pump",
  values: [{ name: "power", value: "15" }, { name: "flow", value: "40" }] });
put("d_b1", "l_defs", "block", { name: "Main pump", type: "def_bigpump",
  values: [{ name: "power", value: "90" }, { name: "flow", value: "200" }] });


/* ── Relations: every kind and direction, then what routing has to get right ── */

layer("l_rel", "Relations");
note("l_rel", "Each direction, a name, arrows and a tie; then a run past a third block, two runs between one pair (they overlap), two runs that cross, a pair close together, and a hub whose lines share a trunk and fan out. Lines leave the middle of a face, run straight or in one Z, and draw under cards; a tie joins nearest corners.", 27);
const pair = (id, name_a, name_b, more) => {
  put(`${id}_a`, "l_rel", "block", { name: name_a });
  put(`${id}_b`, "l_rel", "block", { name: name_b });
  link(id, `${id}_a`, `${id}_b`, more);
};
pair("r_fwd", "From", "Forward", { dir: "forward" });
pair("r_back", "From", "Back", { dir: "back" });
pair("r_both", "From", "Both", { dir: "both" });
pair("r_none", "From", "None", { dir: "none" });
pair("r_named", "Pump", "Tank", { dir: "forward", name: "feeds" });
pair("r_arrows", "Whole", "Part", { settings: { line: { from_arrow: "diamond", to_arrow: "open" } } });
put("r_tie_note", "l_rel", "note", { name: "A tie joins a note to what it is about", type: "note",
                                             w: 5 * U, h: 2 * U });
put("r_tie_to", "l_rel", "block", { name: "Tied" });
link("r_tie", "r_tie_note", "r_tie_to", { type: "tie" });
put("r_det_a", "l_rel", "block", { name: "Left" });
put("r_det_x", "l_rel", "block", { name: "Blocker" });
put("r_det_b", "l_rel", "block", { name: "Right" });
link("r_detour", "r_det_a", "r_det_b", { dir: "forward" });
put("r_par_a", "l_rel", "block", { name: "Asks" });
put("r_par_b", "l_rel", "block", { name: "Answers" });
link("r_par_1", "r_par_a", "r_par_b", { dir: "forward", name: "request" });
link("r_par_2", "r_par_b", "r_par_a", { dir: "forward", name: "reply" });
put("r_x_a", "l_rel", "block", { name: "North" });
put("r_x_b", "l_rel", "block", { name: "East" });
put("r_x_c", "l_rel", "block", { name: "West" });
put("r_x_d", "l_rel", "block", { name: "South" });
link("r_cross_1", "r_x_a", "r_x_d", { dir: "forward" });
link("r_cross_2", "r_x_b", "r_x_c", { dir: "forward" });
put("r_gap_a", "l_rel", "block", { name: "Close" });
put("r_gap_b", "l_rel", "block", { name: "Closer" });
link("r_gap", "r_gap_a", "r_gap_b", { dir: "forward" });
put("r_hub", "l_rel", "block", { name: "Hub" });
for (const [n, name] of ["One", "Two", "Three"].entries()) {
  put(`r_spoke_${n}`, "l_rel", "block", { name });
  link(`r_fan_${n}`, "r_hub", `r_spoke_${n}`, { dir: "forward", name: `to ${name.toLowerCase()}` });
}


/* ── Interfaces: ports on each side, and flow ── */

layer("l_ports", "Interfaces");
note("l_ports", "Ports placed on each side of Pump, flowing in, out, both or neither; Pump's top port is placed in the middle of a face no line meets; Tank and Valve's ports place themselves, in a face's middle unless a line's anchor holds it. Lines to the room meet its wall straight across: Gauge's line to the room itself, and Drain, the room's own port, placing itself.", 22);
put("p_pump", "l_ports", "block", { name: "Pump" });
put("p_tank", "l_ports", "block", { name: "Tank" });
put("p_valve", "l_ports", "block", { name: "Valve" });
/** A port: placed where a side is given, a quarter along unless said, else placing itself. */
const port = (id, parent, side, flow, at = 0.25) =>
  put(id, parent, "interface", { name: "", type: "interface", ...(side ? { side, at } : {}),
                                 ...(flow ? { flow } : {}) });
port("p_pump_in", "p_pump", "left", "in");
port("p_pump_out", "p_pump", "right", "out");
port("p_pump_top", "p_pump", "top", "both", 0.5);
port("p_pump_low", "p_pump", "bottom");
port("p_tank_in", "p_tank", undefined, "in");
port("p_valve_out", "p_valve", undefined, "out");
put("p_gauge", "l_ports", "block", { name: "Gauge" });
port("p_drain", "l_ports", undefined, "out");
link("p_read", "p_gauge", "l_ports", { dir: "forward", name: "reading" });
link("p_spill", "p_tank", "p_drain", { dir: "forward" });
link("p_tank_pump", "p_tank", "p_pump", { name: "level" });
link("p_flow", "p_pump_out", "p_tank_in", { dir: "forward", name: "water" });
link("p_feed", "p_valve_out", "p_pump_low", { dir: "forward" });


/* ── Holders: groups inside groups, and a grid with headers and a merge ── */

layer("l_hold", "Holders");
note("l_hold", "A group gathers blocks where they sit, and nests. A grid seats blocks in cells: its top row and left column head the lines; a merge spans cells. Select the grid and press Enter to see its cells.", 27);
put("h_outer", "l_hold", "group", { name: "Plant", type: "group" });
put("h_inner", "h_outer", "group", { name: "Skid", type: "group" });
put("h_g1", "h_inner", "block", { name: "Motor" });
put("h_g2", "h_inner", "block", { name: "Gearbox" });
put("h_g3", "h_outer", "block", { name: "Panel" });
def("def_table", "Table", "grid", undefined, { traits: ["container", "ports", "matrix", "headed"] },
    "w_holders");
put("h_grid", "l_hold", "grid", { name: "Duty roster", type: "def_table",
  grid: { rows: 4, cols: 4, merges: [{ r: 1, c: 1, rows: 2, cols: 1 }] } });
const cell = (id, r, c, name) => put(id, "h_grid", "block", { name, cell: { r, c } });
["Mon", "Tue", "Wed"].forEach((d, i) => cell(`h_col_${i}`, 0, i + 1, d));
["Day", "Swing", "Night"].forEach((s, i) => cell(`h_row_${i}`, i + 1, 0, s));
cell("h_c1", 1, 1, "Ana");
cell("h_c2", 1, 2, "Ben");
cell("h_c3", 2, 3, "Cy");
cell("h_c4", 3, 2, "Di");


/* ── References: to a block, to a definition, to nothing ── */

layer("l_refs", "References");
note("l_refs", "A reference stands for something drawn elsewhere: a block on the cards layer, a definition, or something since deleted.", 22);
put("x_block", "l_refs", "reference", { of: "c_block" });
put("x_def", "l_refs", "reference", { of: "def_pump" });
put("x_gone", "l_refs", "reference", { name: "Gone", of: "nothing_here" });


/* ── Data: the entity-relation package, as a model and as data ── */

layer("l_model", "Data model", "def_large");
note("l_model", "The entity-relation package's entities as stand-ins: each attribute typed by another entity draws a link.", 22);
put("m_customer", "l_model", "reference", { of: "entity-relation.customer" });
put("m_order", "l_model", "reference", { of: "entity-relation.order" });
put("m_line", "l_model", "reference", { of: "entity-relation.line" });
put("m_product", "l_model", "reference", { of: "entity-relation.product" });
layer("l_rows", "Data rows", "def_large");
note("l_rows", "Usages answering the entities: a value naming another card on the layer draws a link.", 22);
const vals = (o) => Object.entries(o).map(([name, value]) => ({ name, value }));
const row = (id, name, type, values) =>
  put(id, "l_rows", "block", { name, type, values: vals(values) });
row("u_ada", "Ada Lovelace", "entity-relation.customer", { id: "1", name: "Ada Lovelace", email: "ada@example.com" });
row("u_1001", "Order 1001", "entity-relation.order", { number: "1001", customer: "Ada Lovelace", placed: "2026-10-01",
                                          status: "shipped", paid: "true" });
row("u_l1", "1001 · widgets", "entity-relation.line", { order: "Order 1001", product: "Widget", qty: "3" });
row("u_l2", "1001 · gadget", "entity-relation.line", { order: "Order 1001", product: "Gadget" });
row("u_widget", "Widget", "entity-relation.product", { sku: "W-1", name: "Widget", price: "4.50" });
row("u_gadget", "Gadget", "entity-relation.product", { sku: "G-2", name: "Gadget", price: "12.00" });


/* ── The file ── */

const er = JSON.parse(readFileSync("public/packages/entity-relation.json", "utf8")).graph.blocks;
blocks.workspace.counters = counters;
const graph = { root: "workspace", blocks: { ...blocks, ...er }, edges };
writeFileSync("samples/workspace.showcase.json",
              JSON.stringify({ schema: "1.0", id: "workspace", graph }, null, 2) + "\n");
console.log(`wrote ${Object.keys(blocks).length} blocks, ${Object.keys(edges).length} relations`);
