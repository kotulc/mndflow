---
name: Charge once
type: decision
tags: critical
---

Checkout retries the same request. The order service treats a repeated checkout key as the order it already created, so a retry never charges twice.
