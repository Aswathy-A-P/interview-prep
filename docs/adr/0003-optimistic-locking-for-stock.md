# ADR 0003: Optimistic locking for stock reservation

- Status: accepted
- Date: 2026-10-06

## Context
Two customers can check out the last unit of a product at the same moment. Without control, both
read stock = 1, both decrement, and the product is oversold.

## Decision
`Product` carries a JPA `@Version` column. Order placement decrements stock inside one transaction; a
concurrent update makes the second commit fail with an optimistic-lock exception, which the API returns
as `409 Conflict` so the client can retry. Order placement also requires an `Idempotency-Key`, unique
per user, so a retried request returns the original order instead of reserving stock twice.

## Consequences
- No database row locks held while the request runs; good throughput when conflicts are rare.
- Under heavy contention on one product, clients see more `409`s; a conditional
  `UPDATE … SET stock = stock - ? WHERE stock >= ?` or a reservation queue would be the next step.
