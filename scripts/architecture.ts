/** Writes samples/workspace.architecture.json: one order-fulfillment story.
 *
 *  Each component is stated once. Context, domain and the scenarios refer to it. Fixed ids, so a
 *  re-run is a readable diff. The door checks the file on the way out. */

import { readFileSync, writeFileSync } from "node:fs";
import { names_in, read_card, USAGE_KEYS } from "@mnd/core";
import { builder, type Builder } from "./lib/builder.ts";

const b = builder();

b.place({ id: "workspace", parent: null, name: "workspace" });
b.def("main", "main", undefined);
b.shelf("tags", "tags");
b.shelf("w_defs", "definitions");
b.shelf("w_domain", "domain");
b.def("tag_decision", "decision", "tag", undefined, {}, "tags");

b.merge("public/packages/architecture.json");
b.merge("public/packages/diagrams.json");
b.merge("public/packages/entity-relation.json");

/* ── The story, and the definition the order service is a usage of ── */

b.put("story", "main", "folder", { name: "Story", type: "folder",
  settings: { layout: { kind: "auto", cards: "large" } } });
b.def("def_order_service", "Order service", "architecture.service", undefined, {
  body: "Records an order, then asks payment and inventory to complete it.",
}, "w_defs");
for (const [id, name] of [
  ["part_order_api", "Order API"],
  ["part_order_workflow", "Order workflow"],
  ["part_order_repository", "Order repository"],
] as const) {
  b.place({ id, parent: "def_order_service", name, type: "block",
            order: b.order("def_order_service") });
}

b.put("story_intro", "story", "block", { name: "The story" });
from_card(b, "story_intro", "samples/architecture/cards/story.md");

/* ── Platform: each component once ── */

b.put("story_platform", "story", "block", { name: "Platform" });
const service = (id: string, name: string, owner: string, technology = "") =>
  b.put(id, "story_platform", "block", { name, type: "architecture.service",
    values: [{ name: "owner", value: owner },
             ...(technology ? [{ name: "technology", value: technology }] : [])] });
service("svc_storefront", "Storefront", "Commerce", "React");
service("svc_gateway", "API gateway", "Commerce", "Envoy");
from_card(b, "svc_orders", "samples/architecture/cards/order-service.md", "story_platform");
b.tune("svc_orders", { type: "def_order_service" });
from_card(b, "svc_payments", "samples/architecture/cards/payment-service.md", "story_platform");
service("svc_inventory", "Inventory service", "Fulfillment", "Java");
service("svc_warehouse", "Warehouse adapter", "Fulfillment", "Java");
b.put("infra_events", "story_platform", "block", { name: "Order events", type: "architecture.queue" });
b.put("db_orders", "story_platform", "block", { name: "Orders", type: "architecture.database",
  values: [{ name: "engine", value: "PostgreSQL" }] });
b.put("db_inventory", "story_platform", "block", { name: "Inventory", type: "architecture.database",
  values: [{ name: "engine", value: "PostgreSQL" }] });
b.put("ext_payment", "story_platform", "block",
      { name: "Payment provider", type: "architecture.external" });
b.put("ext_warehouse", "story_platform", "block",
      { name: "Warehouse system", type: "architecture.external" });
from_card(b, "dec_idempotency", "samples/architecture/cards/idempotency.md", "story_platform");

const call = (id: string, from: string, to: string, type = "architecture.calls") =>
  b.link(id, from, to, { type });
call("rel_store_gateway", "svc_storefront", "svc_gateway");
call("rel_gateway_orders", "svc_gateway", "svc_orders");
call("rel_orders_payments", "svc_orders", "svc_payments");
call("rel_orders_inventory", "svc_orders", "svc_inventory");
call("rel_payments_provider", "svc_payments", "ext_payment", "architecture.integrates");
call("rel_inventory_adapter", "svc_inventory", "svc_warehouse");
call("rel_adapter_warehouse", "svc_warehouse", "ext_warehouse", "architecture.integrates");
call("rel_orders_db", "svc_orders", "db_orders", "architecture.reads");
call("rel_inventory_db", "svc_inventory", "db_inventory", "architecture.reads");
call("rel_orders_events", "svc_orders", "infra_events", "architecture.publishes");
call("rel_inventory_events", "svc_inventory", "infra_events", "architecture.publishes");

/* ── Context: the customer, and references to what the platform already stated ── */

b.put("story_context", "story", "block", { name: "Context" });
b.put("actor_customer", "story_context", "block", { name: "Online customer", type: "block" });
const ref = (id: string, parent: string, of: string, name?: string, settings?: Record<string, unknown>) =>
  b.put(id, parent, "reference", { type: "reference", of, ...(name ? { name } : {}),
                                   ...(settings ? { settings } : {}) });
ref("ref_ctx_store", "story_context", "svc_storefront");
ref("ref_ctx_pay", "story_context", "ext_payment");
ref("ref_ctx_wh", "story_context", "ext_warehouse");
ref("ref_ctx_platform", "story_context", "story_platform", "Platform");
call("rel_customer_store", "actor_customer", "ref_ctx_store");
call("rel_platform_pay", "ref_ctx_platform", "ref_ctx_pay", "architecture.integrates");
call("rel_platform_wh", "ref_ctx_platform", "ref_ctx_wh", "architecture.integrates");

/* ── Domain: record definitions, and a class diagram of them ── */

b.def("def_customer_record", "Customer", "entity-relation.customer",
      { card: { face: "table" } }, {}, "w_domain");
b.def("def_product_record", "Product", "entity-relation.product",
      { card: { face: "table" } }, {}, "w_domain");
b.def("def_order_record", "Order", "entity-relation.order", { card: { face: "table" } }, {
  def: { attributes: [
    { name: "customer", type: "def_customer_record" },
    { name: "lines", type: "def_line_record", many: true },
  ] } }, "w_domain");
b.def("def_line_record", "Line", "entity-relation.line", { card: { face: "table" } }, {
  def: { attributes: [
    { name: "order", type: "def_order_record" },
    { name: "product", type: "def_product_record", optional: true },
  ] } }, "w_domain");
b.def("def_payment_record", "Payment", "block", { card: { face: "table" } }, {
  def: { attributes: [
    { name: "amount", type: "number" },
    { name: "status", type: "text" },
    { name: "order", type: "def_order_record" },
  ] } }, "w_domain");

b.put("story_domain", "story", "block", { name: "Domain", type: "diagrams.class_diagram" });
for (const id of ["def_customer_record", "def_order_record", "def_line_record",
                  "def_product_record", "def_payment_record"]) {
  ref(`ref_${id}`, "story_domain", id);
}

/* ── Data: usages whose values name each other, so the links draw ── */

b.put("story_data", "story", "block", { name: "Data" });
const row = (id: string, name: string, type: string, values: Record<string, string>) =>
  b.put(id, "story_data", "block", { name, type,
    values: Object.entries(values).map(([k, value]) => ({ name: k, value })) });
row("data_ada", "Ada Lovelace", "def_customer_record",
    { id: "1", name: "Ada Lovelace", email: "ada@example.com" });
row("data_charles", "Charles Babbage", "def_customer_record",
    { id: "2", name: "Charles Babbage", email: "charles@example.com" });
row("data_1001", "Order 1001", "def_order_record",
    { number: "1001", customer: "Ada Lovelace", placed: "2026-10-01", status: "shipped",
      paid: "true", lines: "1001 · widgets" });
row("data_1002", "Order 1002", "def_order_record",
    { number: "1002", customer: "Charles Babbage", placed: "2026-10-02", status: "open",
      paid: "false", lines: "1002 · spare" });
row("data_l1", "1001 · widgets", "def_line_record",
    { order: "Order 1001", product: "Widget", qty: "3" });
row("data_l2", "1001 · gadget", "def_line_record",
    { order: "Order 1001", product: "Gadget", qty: "1" });
row("data_l3", "1002 · spare", "def_line_record",
    { order: "Order 1002", product: "Spare", qty: "2" });
row("data_l4", "1002 · open", "def_line_record", { order: "Order 1002", qty: "1" });
row("data_widget", "Widget", "def_product_record", { sku: "W-1", name: "Widget", price: "4.50" });
row("data_gadget", "Gadget", "def_product_record", { sku: "G-2", name: "Gadget", price: "12.00" });
row("data_spare", "Spare", "def_product_record", { sku: "S-3", name: "Spare", price: "2.00" });
row("data_pay", "Payment 1001", "def_payment_record",
    { amount: "42.00", status: "authorized", order: "Order 1001" });

/* ── Scenarios: one grid each, read as a sequence and, through a reference, as lanes ── */

b.put("story_place_order", "story", "block", { name: "Place order" });
scenario(b, "scenario_place", "story_place_order", "Place order",
  ["Customer", "Storefront", "API gateway", "Order service", "Payment service", "Inventory service"],
  ["", "svc_storefront", "svc_gateway", "svc_orders", "svc_payments", "svc_inventory"],
  ["Submit", "Create", "Authorize", "Reserve", "Confirm", "Failure"],
  [
    ["s_submit", "Submit cart", 1, 1],
    ["s_post", "POST checkout", 1, 2],
    ["s_route", "Route checkout", 2, 3],
    ["s_create", "Create pending order", 2, 4],
    ["s_auth", "Authorize payment", 3, 5],
    ["s_reserve", "Reserve stock", 4, 6],
    ["s_confirm", "Confirm order", 5, 4],
    ["s_reject", "Reject payment", 6, 5],
    ["s_tell", "Tell the customer", 6, 2],
  ],
  [
    ["m_submit", "s_submit", "s_post", "architecture.message", "checkout"],
    ["m_post", "s_post", "s_route", "architecture.message", "checkout"],
    ["m_route", "s_route", "s_create", "architecture.message", "create"],
    ["m_create", "s_create", "s_auth", "architecture.message", "authorize"],
    ["m_auth", "s_auth", "s_reserve", "architecture.message", "reserve"],
    ["m_reserve", "s_reserve", "s_confirm", "architecture.message", "confirm"],
    ["m_publish", "s_confirm", "s_confirm", "architecture.publishes", "order placed"],
    ["m_reject", "s_reject", "s_tell", "architecture.reply", "declined"],
  ]);
from_card(b, "doc_payment_failure", "samples/architecture/cards/payment-failure.md",
          "story_place_order");

b.put("story_fulfill_order", "story", "block", { name: "Fulfill order" });
scenario(b, "scenario_fulfill", "story_fulfill_order", "Fulfill order",
  ["Order service", "Order events", "Inventory service", "Warehouse adapter", "Warehouse system"],
  ["svc_orders", "infra_events", "svc_inventory", "svc_warehouse", "ext_warehouse"],
  ["Ordered", "Pick", "Pack", "Ship", "Complete", "Delay"],
  [
    ["f_placed", "Order placed", 1, 1],
    ["f_event", "Publish placed", 1, 2],
    ["f_pick", "Pick items", 2, 3],
    ["f_pack", "Pack shipment", 3, 4],
    ["f_ship", "Ship", 4, 5],
    ["f_done", "Mark fulfilled", 5, 1],
    ["f_hold", "Hold for stock", 6, 3],
  ],
  [
    ["f_pub", "f_placed", "f_event", "architecture.publishes", "order placed"],
    ["f_to_pick", "f_event", "f_pick", "architecture.message", "pick"],
    ["f_to_pack", "f_pick", "f_pack", "architecture.message", "pack"],
    ["f_to_ship", "f_pack", "f_ship", "architecture.message", "ship"],
    ["f_to_done", "f_ship", "f_done", "architecture.message", "fulfilled"],
    ["f_delay", "f_pick", "f_hold", "architecture.reply", "short"],
  ]);

b.put("story_place_lanes", "story", "block", { name: "Place order, as lanes" });
ref("ref_place_lanes", "story_place_lanes", "scenario_place", "Place order",
    { layout: { view: "swimlane" } });
b.put("story_fulfill_lanes", "story", "block", { name: "Fulfill order, as lanes" });
ref("ref_fulfill_lanes", "story_fulfill_lanes", "scenario_fulfill", "Fulfill order",
    { layout: { view: "swimlane" } });

const g = b.graph();
writeFileSync("samples/workspace.architecture.json", b.emit());
console.log(`wrote ${Object.keys(g.blocks).length} blocks, ${Object.keys(g.edges).length} relations`);


/** A markdown card, written onto a block. A tag it names must already be in the workspace. */
function from_card(build: Builder, id: string, file: string, parent?: string): void {
  const { front, body } = read_card(readFileSync(file, "utf8"));
  const tags = names_in(front["tags"]);
  for (const tag of tags) {
    if (!build.graph().blocks[tag]) throw new Error(`${file} names ${tag}, which is not a tag here`);
  }
  const values = Object.entries(front)
    .filter(([k]) => !(USAGE_KEYS as readonly string[]).includes(k))
    .map(([name, value]) => ({ name, value: String(value) }));
  const more = {
    name: String(front["name"] ?? id),
    ...(front["type"] ? { type: String(front["type"]) } : {}),
    ...(tags.length ? { tags } : {}),
    source: String(front["source"] ?? file),
    ...(values.length ? { values } : {}),
    ...(body ? { body } : {}),
  };
  if (parent) build.put(id, parent, "block", more);
  else build.tune(id, more);
}

/** A scenario grid: participants across the header, phases down it, steps in the cells, and the
 *  messages between the steps. References are to blocks already on the platform. */
function scenario(build: Builder, id: string, parent: string, name: string,
                  heads: readonly string[], of: readonly string[],
                  phases: readonly string[],
                  steps: readonly (readonly [string, string, number, number])[],
                  messages: readonly (readonly [string, string, string, string, string])[]): void {
  build.put(id, parent, "grid", { name, type: "diagrams.sequence_diagram",
    grid: { rows: phases.length + 1, cols: heads.length + 1 } });
  heads.forEach((label, i) => {
    const target = of[i];
    const hid = `${id}_h${i + 1}`;
    if (target) build.put(hid, id, "reference",
                           { type: "reference", of: target, cell: { r: 0, c: i + 1 } });
    else build.put(hid, id, "block", { name: label, type: "block", cell: { r: 0, c: i + 1 } });
  });
  phases.forEach((label, i) => {
    build.put(`${id}_p${i + 1}`, id, "block",
               { name: label, type: "block", cell: { r: i + 1, c: 0 } });
  });
  for (const [sid, label, r, c] of steps) {
    build.put(sid, id, "block", { name: label, type: "block", cell: { r, c } });
  }
  for (const [mid, from, to, type, label] of messages) {
    build.link(mid, from, to, { type, name: label });
  }
}
