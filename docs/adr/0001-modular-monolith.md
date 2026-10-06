# ADR 0001: Modular monolith, not microservices

- Status: accepted
- Date: 2026-10-06

## Context
The MVP covers auth, catalog, cart, orders and payments. Splitting them into services would add
network calls, distributed transactions and deployment overhead before there is any scaling need.

## Decision
One Spring Boot application with one module per bounded context (`auth`, `catalog`, `cart`, `order`,
`payment`, `common`). Each module is split into `api`, `application`, `domain` and `infrastructure`,
and modules talk to each other only through `application` services.

## Consequences
- One deployable, one database, local transactions for order placement.
- Boundaries are explicit, so `order` can be extracted later behind the same service interface, with
  domain events moving onto a broker such as Kafka.
- Boundaries are enforced by convention and review today; Spring Modulith tests are the next step.
