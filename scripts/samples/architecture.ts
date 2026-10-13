/** Writes samples/architecture/workspace.json: one order platform, each component stated once.
 *
 *  Containers holds the components. Every other diagram refers to them. Fixed ids, so a re-run is
 *  a readable diff. The door checks the file on the way out. */

import { writeFileSync } from "node:fs";
import { builder } from "./builder.ts";

const b = builder();

b.place({ id: "workspace", parent: null, name: "workspace" });
b.merge("public/packages/architecture.json");
b.merge("public/packages/diagrams.json");

/* The definitions tree: the records, and the workspace's tags. */
b.folder("d_domain", "Domain", "workspace", "definitions");
b.folder("tags", "tags", "workspace", "definitions");

/* The structure tree: the diagrams. */
b.folder("t_system", "System");
b.folder("t_domain", "Domain");
b.folder("t_scenarios", "Scenarios");
b.folder("t_decisions", "Decisions");
b.def("tag_decision", "decision", "tag", undefined, {}, "tags");

/* ── Records, each a block drawn as its table of attributes, except status, which is a choice ── */

const record = (id: string, name: string, body: string, attributes: Record<string, unknown>[]) =>
  b.def(id, name, "block", { card: { face: "table" } }, { body, def: { attributes } }, "d_domain");
record("rec_customer", "Customer", "Someone who places an order.", [
  { name: "id", type: "number", key: true }, { name: "name" }, { name: "email" } ]);
record("rec_product", "Product", "Something that can be ordered.", [
  { name: "sku", key: true }, { name: "name" }, { name: "price", type: "number", unit: "USD" } ]);
record("rec_line", "Line", "One product on an order, and how many.", [
  { name: "order", type: "rec_order" },
  { name: "product", type: "rec_product", optional: true },
  { name: "qty", type: "number" } ]);
record("rec_order", "Order", "A customer's request, and the lines on it.", [
  { name: "number", type: "number", key: true },
  { name: "customer", type: "rec_customer" },
  { name: "status", type: "rec_status" },
  { name: "lines", type: "rec_line", many: true } ]);
record("rec_payment", "Payment", "A charge taken against an order.", [
  { name: "amount", type: "number" }, { name: "status", type: "text" },
  { name: "order", type: "rec_order" } ]);
b.def("rec_status", "Order status", "choice",
      { value: { choices: ["open", "shipped", "closed"] } },
      { body: "Where an order is: open, shipped, or closed." }, "d_domain");

/* ── About ── */

b.layer("about", "About", "workspace");
b.note("about", "An order platform drawn with the architecture package. Read About, then System, "
  + "then Domain, then Scenarios, then Decisions. Open a folder for its folder view; open a "
  + "component to read the pattern it uses.");
b.card("about_card", "samples/architecture/cards/about.md", "about");
for (const [id, of, name, said] of [
  ["ref_about_system", "t_system", "System", "Context and the containers, each component once."],
  ["ref_about_domain", "t_domain", "Domain", "The records the services own, and a class diagram."],
  ["ref_about_scenarios", "t_scenarios", "Scenarios",
   "Place order as a sequence, fulfill as lanes."],
  ["ref_about_decisions", "t_decisions", "Decisions", "A decision, and the component it binds."],
] as const) {
  b.put(id, "about", "reference", { name, type: "reference", of });
  b.explain(id, said);
}
b.explain("about_card", "What the sample shows, and the order to read it in.");

/* ── Containers: each component once ── */

b.layer("containers", "Containers", "t_system");
const service = (id: string, name: string, type: string, owner: string, technology = "") =>
  b.put(id, "containers", "block", { name, type,
    values: [{ name: "owner", value: owner },
             ...(technology ? [{ name: "technology", value: technology }] : [])] });
service("svc_storefront", "Storefront", "architecture.service", "Commerce", "React");
service("svc_gateway", "API gateway", "architecture.service", "Commerce", "Envoy");
b.card("svc_orders", "samples/architecture/cards/order-service.md", "containers");
b.card("svc_payments", "samples/architecture/cards/payment-service.md", "containers");
service("svc_inventory", "Inventory service", "architecture.layered_service",
        "Fulfillment", "Java");
service("svc_warehouse", "Warehouse adapter", "architecture.adapter", "Fulfillment");
b.put("infra_events", "containers", "block",
      { name: "Order events", type: "architecture.queue" });
b.put("ext_payment", "containers", "block",
      { name: "Payment provider", type: "architecture.external" });
b.put("ext_warehouse", "containers", "block",
      { name: "Warehouse system", type: "architecture.external" });
b.explain("svc_storefront", "Takes the cart. A service, owned by Commerce.");
b.explain("svc_gateway", "Routes checkout. A service, owned by Commerce.");
b.explain("svc_orders", "An outbox service: the order and its event are written together.");
b.explain("svc_payments", "A layered service: it authorizes a charge and answers.");
b.explain("svc_inventory", "A layered service: it reserves stock for an order.");
b.explain("svc_warehouse", "An adapter: it reaches the warehouse without taking on its model.");
b.explain("infra_events", "A queue the order service publishes to.");
b.explain("ext_payment", "The provider outside the system.");
b.explain("ext_warehouse", "The warehouse outside the system.");

const call = (id: string, from: string, to: string, type = "architecture.calls", name?: string) =>
  b.link(id, from, to, { type, ...(name ? { name } : {}) });
call("rel_store_gateway", "svc_storefront", "svc_gateway");
call("rel_gateway_orders", "svc_gateway", "svc_orders");
call("rel_orders_payments", "svc_orders", "svc_payments");
call("rel_orders_inventory", "svc_orders", "svc_inventory");
call("rel_payments_provider", "svc_payments", "ext_payment", "architecture.integrates");
call("rel_inventory_adapter", "svc_inventory", "svc_warehouse");
call("rel_adapter_warehouse", "svc_warehouse", "ext_warehouse", "architecture.integrates");
call("rel_orders_events", "svc_orders", "infra_events", "architecture.publishes");
call("rel_events_inventory", "infra_events", "svc_inventory", "architecture.calls", "order placed");

/* ── Context: the person, and references to what Containers already stated ── */

b.layer("context", "Context", "t_system");
b.note("context", "The customer, and the platform seen from outside. Open Order platform for "
  + "the containers.");
b.put("actor_customer", "context", "block", { name: "Customer", type: "architecture.person" });
const ref = (id: string, parent: string, of: string, name?: string) =>
  b.put(id, parent, "reference", { type: "reference", of, ...(name ? { name } : {}) });
ref("ref_ctx_store", "context", "svc_storefront");
ref("ref_ctx_pay", "context", "ext_payment");
ref("ref_ctx_wh", "context", "ext_warehouse");
ref("ref_ctx_platform", "context", "containers", "Order platform");
call("rel_customer_store", "actor_customer", "ref_ctx_store");
call("rel_platform_pay", "ref_ctx_platform", "ref_ctx_pay", "architecture.integrates");
call("rel_platform_wh", "ref_ctx_platform", "ref_ctx_wh", "architecture.integrates");
b.explain("actor_customer", "Someone outside the system who places the order.");
b.explain("ref_ctx_platform", "The whole of Containers, seen from outside.");

/* ── Domain model ── */

b.layer("domain_model", "Model", "t_domain");
b.note("domain_model", "Open Domain classes for the class view. Status is a choice, so it is "
  + "not a table here.");
b.put("domain_classes", "domain_model", "block",
      { name: "Domain classes", type: "diagrams.class_diagram" });
for (const id of ["rec_customer", "rec_order", "rec_line", "rec_product", "rec_payment"]) {
  ref(`ref_${id}`, "domain_classes", id);
}
b.explain("domain_classes", "Each record is owned by one service: orders and lines by Order "
  + "service, payments by Payment service, products by Inventory service.");

/* ── Scenarios ── */

b.layer("place_order", "Place order", "t_scenarios");
b.note("place_order", "A customer checks out, and a declined charge is undone. Open the card.");
scenario("place_order_seq", "place_order", "Place order", "diagrams.sequence_diagram",
  ["Customer", "Storefront", "API gateway", "Order service", "Payment service",
   "Inventory service"],
  ["actor_customer", "svc_storefront", "svc_gateway", "svc_orders", "svc_payments",
   "svc_inventory"],
  ["Submit", "Create", "Authorize", "Reserve", "Confirm", "Failure"],
  [
    ["s_submit", "Submit cart", 1, 1, "The customer sends the cart."],
    ["s_post", "POST checkout", 1, 2, "The storefront posts the checkout."],
    ["s_route", "Route checkout", 2, 3, "The gateway routes the request to orders."],
    ["s_create", "Create pending order", 2, 4, "Order service records a pending order."],
    ["s_auth", "Authorize payment", 3, 5, "Payment service asks the provider to authorize."],
    ["s_reserve", "Reserve stock", 4, 6, "Inventory service reserves the stock."],
    ["s_confirm", "Confirm order", 5, 4, "Order service confirms, and the outbox relay publishes."],
    ["s_reject", "Reject payment", 6, 5, "Payment service declines the charge."],
    ["s_tell", "Tell the customer", 6, 2, "The storefront tells the customer."],
  ],
  [
    ["m_submit", "s_submit", "s_post", "diagrams.message", "checkout"],
    ["m_post", "s_post", "s_route", "diagrams.message", "checkout"],
    ["m_route", "s_route", "s_create", "diagrams.message", "create"],
    ["m_create", "s_create", "s_auth", "diagrams.message", "authorize"],
    ["m_auth", "s_auth", "s_reserve", "diagrams.message", "reserve"],
    ["m_reserve", "s_reserve", "s_confirm", "diagrams.message", "confirm"],
    ["m_publish", "s_confirm", "s_confirm", "architecture.publishes", "order placed"],
    ["m_reject", "s_reject", "s_tell", "diagrams.reply", "declined"],
  ]);
b.card("doc_payment_failure", "samples/architecture/cards/payment-failure.md", "place_order");
b.link("t_doc_payment_failure", "doc_payment_failure", "place_order_seq", { type: "tie" });
b.explain("place_order_seq", "An orchestrated saga: Order service drives each step and undoes "
  + "on failure.");

b.layer("fulfill_order", "Fulfill order", "t_scenarios");
b.note("fulfill_order", "A confirmed order is picked, packed and shipped. Open the card.");
scenario("fulfill_order_lanes", "fulfill_order", "Fulfill order", "diagrams.swimlane",
  ["Order service", "Order events", "Inventory service", "Warehouse adapter", "Warehouse system"],
  ["svc_orders", "infra_events", "svc_inventory", "svc_warehouse", "ext_warehouse"],
  ["Ordered", "Pick", "Pack", "Ship", "Complete", "Delay"],
  [
    ["f_placed", "Order placed", 1, 1, "Order service has a confirmed order."],
    ["f_event", "Publish placed", 1, 2, "The outbox relay publishes order placed."],
    ["f_pick", "Pick items", 2, 3, "Inventory service asks the warehouse to pick."],
    ["f_pack", "Pack shipment", 3, 4, "The adapter packs the shipment."],
    ["f_ship", "Ship", 4, 5, "The warehouse system ships it."],
    ["f_done", "Mark fulfilled", 5, 1, "Order service marks the order fulfilled."],
    ["f_hold", "Hold for stock", 6, 3, "Inventory holds the line when stock is short."],
  ],
  [
    ["f_pub", "f_placed", "f_event", "diagrams.message", "order placed"],
    ["f_to_pick", "f_event", "f_pick", "diagrams.message", "pick"],
    ["f_to_pack", "f_pick", "f_pack", "diagrams.message", "pack"],
    ["f_to_ship", "f_pack", "f_ship", "diagrams.message", "ship"],
    ["f_to_done", "f_ship", "f_done", "diagrams.message", "fulfilled"],
    ["f_delay", "f_pick", "f_hold", "diagrams.reply", "short"],
  ]);
b.explain("fulfill_order_lanes",
          "Publish / subscribe: each service reacts to the event before it.");

/* ── Decisions ── */

b.layer("decisions", "Recorded", "t_decisions");
b.note("decisions", "Decisions are documents beside the components they bind.");
b.card("dec_idempotency", "samples/architecture/cards/idempotency.md", "decisions");
ref("ref_dec_orders", "decisions", "svc_orders", "Order service");
b.link("rel_applies", "dec_idempotency", "ref_dec_orders", { type: "line", name: "applies to" });

const g = b.graph();
writeFileSync("samples/architecture/workspace.json", b.emit());
console.log(`wrote ${Object.keys(g.blocks).length} blocks, `
            + `${Object.keys(g.edges).length} relations`);


/** A scenario card under a layer: participants across, phases down, steps in the cells. */
function scenario(id: string, parent: string, name: string, type: string,
                  heads: readonly string[], of: readonly string[],
                  phases: readonly string[],
                  steps: readonly (readonly [string, string, number, number, string])[],
                  messages: readonly (readonly [string, string, string, string, string])[]): void {
  b.put(id, parent, "grid", { name, type,
    grid: { rows: phases.length + 1, cols: heads.length + 1 } });
  heads.forEach((label, i) => {
    const target = of[i];
    const hid = `${id}_h${i + 1}`;
    if (target) b.put(hid, id, "reference",
                      { name: label, type: "reference", of: target, cell: { r: 0, c: i + 1 } });
    else b.put(hid, id, "block", { name: label, type: "block", cell: { r: 0, c: i + 1 } });
  });
  phases.forEach((label, i) => {
    b.put(`${id}_p${i + 1}`, id, "block",
          { name: label, type: "block", cell: { r: i + 1, c: 0 } });
  });
  for (const [sid, label, r, c, body] of steps) {
    b.put(sid, id, "block", { name: label, type: "block", body, cell: { r, c } });
  }
  for (const [mid, from, to, rel, label] of messages) {
    b.link(mid, from, to, { type: rel, name: label });
  }
}
