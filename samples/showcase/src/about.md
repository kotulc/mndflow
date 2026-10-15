---
name: Shop
type: document
tags: critical
owner: Platform team
---

# An online shop, built from catalogue patterns

Each service in **Containers** is a usage of a pattern from the `architecture` package: API gateway, saga orchestrator, transactional outbox, layered architecture, circuit breaker and anti-corruption layer. Open one to see the pattern inside it.

| Folder | What it draws |
|---|---|
| System | context, containers, deployment |
| Data | the records, and orders that answer them |
| Flows | order states, placing and fulfilling an order, payment retry |
| Catalogue | service specs, runbooks and decisions |
