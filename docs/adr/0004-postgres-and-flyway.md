# ADR 0004: PostgreSQL with Flyway-owned schema

- Status: accepted
- Date: 2026-10-06

## Context
The schema must be reproducible on every machine and in CI, and must evolve without data loss.

## Decision
PostgreSQL 16 is the only database, in development (docker-compose), in tests (Testcontainers) and in
production. Flyway migrations own the schema; Hibernate runs with `ddl-auto=validate`, and an applied
migration is never edited. Money is `NUMERIC(12,2)` mapped to `BigDecimal`.

## Consequences
- Integration tests run against the same engine as production, so SQL behaviour matches.
- Tests need Docker; they skip cleanly on a machine without it and always run in CI.
- PostgreSQL keeps the door open for `pgvector` semantic search without a new datastore.
