---
name: Order service
type: architecture.service
owner: Commerce
technology: Java
source: samples/architecture/cards/order-service.md
---

Owns the order from the moment it is pending until it is fulfilled. It calls payment and inventory, writes the orders database, and publishes what happened.
