---
name: Charge once
type: architecture.decision
tags: tag_decision
source: samples/architecture/cards/idempotency.md
---

Checkout retries the same request. The order service treats a repeated checkout key as the order it already created, so a retry never charges twice.
