---
name: Order service
type: architecture.outbox_service
owner: Commerce
technology: Java
source: samples/architecture/cards/order-service.md
---

Owns the order from the moment it is pending until it is fulfilled. A checkout writes the order and the event that announces it together, then asks payment and inventory to finish it.
